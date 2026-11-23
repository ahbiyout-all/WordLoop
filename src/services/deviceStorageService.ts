import { UserProfile, VocabItem, SentenceItem, Goal, DailyGoalHistory } from '../types';
import { DEFAULT_USER_PROFILE } from '../data/defaultProfile';
import { APP_VERSION } from '../constants/version';

export const STORAGE_KEYS = {
  USER_PROFILE: 'wordloop_user_profile',
  USER_PROFILE_BACKUP: 'wordloop_user_profile_backup',
  VOCAB: 'wordloop_vocab',
  SENTENCES: 'wordloop_sentences',
  GOALS: 'wordloop_goals',
  HISTORY: 'wordloop_history',
  TOTAL_REPEATS: 'wordloop_total_repeats',
  AUDIO_SETTINGS: 'wordloop_audio_settings',
  DAILY_QUEST: 'wordloop_daily_quest_v1',
  REMINDER_SETTINGS: 'wordloop_reminder_settings_v1',
  LAST_DEVICE_SYNC: 'wordloop_last_device_sync_time',
  LAST_JSON_EXPORT: 'wordloop_last_json_export_at',
  PRE_IMPORT_ROLLBACK: 'wordloop_pre_import_rollback',
};

export const BROWSER_STORAGE_QUOTA_BYTES = 5 * 1024 * 1024; // ~5MB typical browser localStorage cap

export interface StorageKeyBreakdown {
  key: string;
  label: string;
  bytes: number;
  formatted: string;
  percentOfQuota: number;
}

export interface DeviceStorageStats {
  totalEstimatedBytes: number;
  totalFormattedSize: string;
  quotaBytes: number;
  usagePercent: number;
  statusLevel: 'healthy' | 'warning' | 'critical';
  keyBreakdown: StorageKeyBreakdown[];
  itemCounts: {
    vocabCount: number;
    sentenceCount: number;
    goalsCount: number;
    historyDaysCount: number;
    totalRepeats: number;
  };
  hasProfile: boolean;
  profileName: string;
  lastSavedAt: string | null;
  lastExportedAt: string | null;
  shouldRemindBackup: boolean;
  savedToDeviceCount: number;
  storageType: string;
}

export interface WordLoopBackupPayload {
  userProfile?: UserProfile | null;
  vocabList?: VocabItem[];
  sentenceList?: SentenceItem[];
  goals?: Goal[];
  history?: DailyGoalHistory[];
  totalRepeatsCount?: number;
}

export interface VersionedBackupManifest {
  app: 'WordLoop';
  schemaVersion: 2;
  appVersion: string;
  exportedAt: string;
  checksum: string;
  statsSummary: {
    vocabCount: number;
    masteredCount: number;
    sentenceCount: number;
    goalsCount: number;
    historyDays: number;
    totalRepeatsCount: number;
  };
  payload: WordLoopBackupPayload;
}

export interface JsonBackupPreview {
  fileName: string;
  fileSizeBytes: number;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string | null;
  checksumStatus: 'verified' | 'legacy_no_checksum' | 'mismatch';
  backupProfileName: string;
  payload: WordLoopBackupPayload;
  diff: {
    addedVocabCount: number;
    upgradedVocabCount: number;
    addedSentenceCount: number;
    mergedHistoryDaysCount: number;
    backupGoalsCount: number;
    backupTotalRepeats: number;
  };
}

/**
 * Deterministic lightweight 64-bit FNV-1a hex checksum for JSON integrity verification
 */
export function computePayloadChecksum(payload: unknown): string {
  const str = JSON.stringify(payload) || '';
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= (ch + i) & 0xffff;
    h2 = Math.imul(h2, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Save user profile to device local storage with timestamp and backup copy
 */
export function saveUserProfileToDevice(profile: UserProfile): { success: boolean; profile: UserProfile; savedAt: string } {
  try {
    const savedAt = new Date().toISOString();
    const updatedProfile: UserProfile = {
      ...profile,
      lastSavedToDeviceAt: savedAt,
      savedToDeviceCount: (profile.savedToDeviceCount || 0) + 1,
      isLocked: true,
    };

    const serialized = JSON.stringify(updatedProfile);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, serialized);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE_BACKUP, serialized);
    localStorage.setItem(STORAGE_KEYS.LAST_DEVICE_SYNC, savedAt);

    window.dispatchEvent(
      new CustomEvent('wordloop_device_saved', {
        detail: {
          type: 'profile',
          profile: updatedProfile,
          savedAt,
        },
      })
    );

    return { success: true, profile: updatedProfile, savedAt };
  } catch (error) {
    console.error('Failed to save user profile to device storage:', error);
    return {
      success: false,
      profile,
      savedAt: new Date().toISOString(),
    };
  }
}

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5MB max JSON import size

/**
 * Sanitize plain string input: strip nulls, scripts, and unsafe tags
 */
export function sanitizeSafeText(val: unknown, maxLength: number = 500): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Safely parse JSON while stripping __proto__, constructor, and prototype keys to prevent Prototype Pollution
 */
export function safeJsonParse<T = any>(raw: string): T {
  return JSON.parse(raw, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return value;
  });
}

/**
 * Deeply sanitize an arbitrary object to prevent Prototype Pollution and XSS payloads
 */
export function sanitizeDeepObject<T = any>(obj: T, depth = 6): T {
  if (depth <= 0 || !obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.slice(0, 5000).map((item) => sanitizeDeepObject(item, depth - 1)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (typeof value === 'string') {
      clean[key] = sanitizeSafeText(value, 3000);
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeDeepObject(value, depth - 1);
    } else {
      clean[key] = value;
    }
  }
  return clean as T;
}

/**
 * Sanitize CSV cell string to prevent CSV Formula Injection (=, +, -, @, \t, \r)
 */
export function sanitizeCsvCell(val: unknown): string {
  const str = String(val ?? '').replace(/"/g, '""');
  const safeStr = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safeStr}"`;
}

/**
 * Load user profile from device local storage
 */
export function loadUserProfileFromDevice(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || localStorage.getItem(STORAGE_KEYS.USER_PROFILE_BACKUP);
    if (!raw) return null;
    const parsed = safeJsonParse<any>(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string' && parsed.name.trim()) {
      return sanitizeDeepObject(parsed) as UserProfile;
    }
    return null;
  } catch (e) {
    console.error('Failed to load user profile from device:', e);
    return null;
  }
}

const KEY_LABELS: Record<string, string> = {
  wordloop_vocab: '어휘 · SRS 학습 기록',
  wordloop_sentences: '예문 데이터베이스',
  wordloop_history: '일일 잔디 · 목표 기록',
  wordloop_goals: '자기계발 목표',
  wordloop_user_profile: '사용자 프로필 · 사진',
  wordloop_user_profile_backup: '프로필 백업 사본',
  wordloop_emergency_snapshot: '종료 직전 긴급 스냅샷',
  wordloop_pre_import_rollback: '가져오기 직전 롤백 본',
};

/**
 * Calculate total device storage consumption, per-key breakdown, and backup reminder status
 */
export function getDeviceStorageStats(): DeviceStorageStats {
  let totalBytes = 0;
  let hasProfile = false;
  let profileName = '';
  let lastSavedAt: string | null = null;
  let lastExportedAt: string | null = null;
  let savedToDeviceCount = 0;
  const keyBreakdown: StorageKeyBreakdown[] = [];

  const itemCounts = {
    vocabCount: 0,
    sentenceCount: 0,
    goalsCount: 0,
    historyDaysCount: 0,
    totalRepeats: 0,
  };

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('wordloop_')) {
        const val = localStorage.getItem(key) || '';
        const bytes = (key.length + val.length) * 2;
        totalBytes += bytes;
        keyBreakdown.push({
          key,
          label: KEY_LABELS[key] || key.replace(/^wordloop_/, ''),
          bytes,
          formatted: formatByteSize(bytes),
          percentOfQuota: Math.min(100, Number(((bytes / BROWSER_STORAGE_QUOTA_BYTES) * 100).toFixed(1))),
        });
      }
    }

    keyBreakdown.sort((a, b) => b.bytes - a.bytes);

    const rawProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (rawProfile) {
      try {
        const p: UserProfile = JSON.parse(rawProfile);
        hasProfile = true;
        profileName = p.name || '';
        lastSavedAt = p.lastSavedToDeviceAt || localStorage.getItem(STORAGE_KEYS.LAST_DEVICE_SYNC) || null;
        savedToDeviceCount = p.savedToDeviceCount || 1;
      } catch {}
    }

    lastExportedAt = localStorage.getItem(STORAGE_KEYS.LAST_JSON_EXPORT);

    const rawVocab = localStorage.getItem(STORAGE_KEYS.VOCAB);
    if (rawVocab) {
      try {
        itemCounts.vocabCount = JSON.parse(rawVocab).length;
      } catch {}
    }

    const rawSentences = localStorage.getItem(STORAGE_KEYS.SENTENCES);
    if (rawSentences) {
      try {
        itemCounts.sentenceCount = JSON.parse(rawSentences).length;
      } catch {}
    }

    const rawGoals = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (rawGoals) {
      try {
        itemCounts.goalsCount = JSON.parse(rawGoals).length;
      } catch {}
    }

    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (rawHistory) {
      try {
        itemCounts.historyDaysCount = JSON.parse(rawHistory).length;
      } catch {}
    }

    const rawRepeats = localStorage.getItem(STORAGE_KEYS.TOTAL_REPEATS);
    if (rawRepeats) {
      itemCounts.totalRepeats = Number(rawRepeats) || 0;
    }
  } catch (e) {
    console.error('Error calculating storage stats:', e);
  }

  const usagePercent = Math.min(100, Number(((totalBytes / BROWSER_STORAGE_QUOTA_BYTES) * 100).toFixed(1)));
  const statusLevel: 'healthy' | 'warning' | 'critical' =
    usagePercent >= 85 ? 'critical' : usagePercent >= 65 ? 'warning' : 'healthy';

  let shouldRemindBackup = false;
  if (itemCounts.totalRepeats >= 20) {
    if (!lastExportedAt) {
      shouldRemindBackup = true;
    } else {
      const daysSinceExport = (Date.now() - new Date(lastExportedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceExport >= 7) {
        shouldRemindBackup = true;
      }
    }
  }

  return {
    totalEstimatedBytes: totalBytes,
    totalFormattedSize: formatByteSize(totalBytes),
    quotaBytes: BROWSER_STORAGE_QUOTA_BYTES,
    usagePercent,
    statusLevel,
    keyBreakdown,
    itemCounts,
    hasProfile,
    profileName,
    lastSavedAt,
    lastExportedAt,
    shouldRemindBackup,
    savedToDeviceCount,
    storageType: '브라우저 로컬 저장소 (On-Device LocalStorage)',
  };
}

/**
 * Safely prune redundant temporary snapshots & voice history logs when quota is high,
 * without deleting active vocab, sentences, goals, history, or primary profile.
 */
export function cleanupRedundantStorageCache(): { freedBytes: number; removedKeys: string[] } {
  const candidateKeys = [
    STORAGE_KEYS.PRE_IMPORT_ROLLBACK,
    'wordloop_emergency_snapshot',
    STORAGE_KEYS.USER_PROFILE_BACKUP,
  ];
  let freedBytes = 0;
  const removedKeys: string[] = [];

  for (const key of candidateKeys) {
    try {
      const val = localStorage.getItem(key);
      if (val) {
        freedBytes += (key.length + val.length) * 2;
        localStorage.removeItem(key);
        removedKeys.push(key);
      }
    } catch {}
  }

  return { freedBytes, removedKeys };
}

/**
 * Build Schema v2 versioned JSON backup manifest with deterministic integrity checksum
 */
export function buildVersionedJsonBackup(data: {
  userProfile: UserProfile | null;
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
}): VersionedBackupManifest {
  const payload: WordLoopBackupPayload = {
    userProfile: data.userProfile,
    vocabList: data.vocabList,
    sentenceList: data.sentenceList,
    goals: data.goals,
    history: data.history,
    totalRepeatsCount: data.totalRepeatsCount,
  };

  const masteredCount = data.vocabList.filter((v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) === 2).length;
  const exportedAt = new Date().toISOString();

  return {
    app: 'WordLoop',
    schemaVersion: 2,
    appVersion: APP_VERSION,
    exportedAt,
    checksum: computePayloadChecksum(payload),
    statsSummary: {
      vocabCount: data.vocabList.length,
      masteredCount,
      sentenceCount: data.sentenceList.length,
      goalsCount: data.goals.length,
      historyDays: data.history.length,
      totalRepeatsCount: data.totalRepeatsCount,
    },
    payload,
  };
}

/**
 * Export Schema v2 versioned JSON backup file and record last export timestamp
 */
export function exportVersionedAllDataToFile(data: {
  userProfile: UserProfile | null;
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
}): VersionedBackupManifest {
  const manifest = buildVersionedJsonBackup(data);
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (data.userProfile?.name || 'user').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  a.href = url;
  a.download = `wordloop-backup-v${APP_VERSION}-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  try {
    localStorage.setItem(STORAGE_KEYS.LAST_JSON_EXPORT, manifest.exportedAt);
  } catch {}

  return manifest;
}

/**
 * Parse and validate a JSON backup file (Schema v1 legacy or Schema v2 with checksum), returning diff preview
 */
export async function parseAndPreviewJsonBackup(
  file: File,
  currentState: {
    vocabList: VocabItem[];
    sentenceList: SentenceItem[];
    goals: Goal[];
    history: DailyGoalHistory[];
    totalRepeatsCount: number;
  }
): Promise<JsonBackupPreview> {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error('백업 파일 크기가 허용 한도(5MB)를 초과했습니다.');
  }

  const text = await file.text();
  const rawParsed = safeJsonParse<any>(text);
  if (!rawParsed || typeof rawParsed !== 'object') {
    throw new Error('올바른 JSON 백업 파일이 아닙니다.');
  }

  let checksumStatus: 'verified' | 'legacy_no_checksum' | 'mismatch' = 'legacy_no_checksum';
  let rawPayload: any = rawParsed;
  let schemaVersion = 1;
  let appVersion = String(rawParsed.version || rawParsed.appVersion || 'legacy');
  const exportedAt = typeof rawParsed.exportedAt === 'string' ? rawParsed.exportedAt : null;

  if (rawParsed.schemaVersion === 2 && rawParsed.payload && typeof rawParsed.payload === 'object') {
    schemaVersion = 2;
    rawPayload = rawParsed.payload;
    if (typeof rawParsed.checksum === 'string') {
      const expected = computePayloadChecksum(rawParsed.payload);
      checksumStatus = expected === rawParsed.checksum ? 'verified' : 'mismatch';
    }
  }

  const sanitized = sanitizeDeepObject<WordLoopBackupPayload>(rawPayload);
  const backupVocab = Array.isArray(sanitized.vocabList) ? sanitized.vocabList.slice(0, 5000) : [];
  const backupSentences = Array.isArray(sanitized.sentenceList) ? sanitized.sentenceList.slice(0, 5000) : [];
  const backupGoals = Array.isArray(sanitized.goals) ? sanitized.goals.slice(0, 200) : [];
  const backupHistory = Array.isArray(sanitized.history) ? sanitized.history.slice(0, 1000) : [];
  const backupRepeats =
    typeof sanitized.totalRepeatsCount === 'number' && Number.isFinite(sanitized.totalRepeatsCount)
      ? Math.max(0, Math.floor(sanitized.totalRepeatsCount))
      : 0;

  // Compute diff preview against current device state
  const currentVocabMap = new Map<string, VocabItem>();
  currentState.vocabList.forEach((v) => currentVocabMap.set(v.word.trim().toLowerCase(), v));

  let addedVocabCount = 0;
  let upgradedVocabCount = 0;
  for (const bv of backupVocab) {
    if (!bv?.word) continue;
    const key = bv.word.trim().toLowerCase();
    const existing = currentVocabMap.get(key);
    if (!existing) {
      addedVocabCount++;
    } else {
      const bMastery = bv.masteryLevel ?? (bv.isLearned ? 2 : 0);
      const cMastery = existing.masteryLevel ?? (existing.isLearned ? 2 : 0);
      const bReviewMs = bv.srs?.lastReviewedAt ? new Date(bv.srs.lastReviewedAt).getTime() : 0;
      const cReviewMs = existing.srs?.lastReviewedAt ? new Date(existing.srs.lastReviewedAt).getTime() : 0;
      if (bMastery > cMastery || bReviewMs > cReviewMs) {
        upgradedVocabCount++;
      }
    }
  }

  const currentSentenceSet = new Set(currentState.sentenceList.map((s) => s.text.trim().toLowerCase()));
  const addedSentenceCount = backupSentences.filter((s) => s?.text && !currentSentenceSet.has(s.text.trim().toLowerCase())).length;

  const currentHistoryDates = new Set(currentState.history.map((h) => h.date));
  const mergedHistoryDaysCount = backupHistory.filter((h) => h?.date && !currentHistoryDates.has(h.date)).length;

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    schemaVersion,
    appVersion,
    exportedAt,
    checksumStatus,
    backupProfileName: sanitized.userProfile?.name || '미지정 프로필',
    payload: {
      userProfile: sanitized.userProfile || null,
      vocabList: backupVocab,
      sentenceList: backupSentences,
      goals: backupGoals,
      history: backupHistory,
      totalRepeatsCount: backupRepeats,
    },
    diff: {
      addedVocabCount,
      upgradedVocabCount,
      addedSentenceCount,
      mergedHistoryDaysCount,
      backupGoalsCount: backupGoals.length,
      backupTotalRepeats: backupRepeats,
    },
  };
}

/**
 * Create pre-import rollback snapshot and apply smart merge or overwrite backup
 */
export function applyBackupImport(
  currentState: {
    userProfile: UserProfile | null;
    vocabList: VocabItem[];
    sentenceList: SentenceItem[];
    goals: Goal[];
    history: DailyGoalHistory[];
    totalRepeatsCount: number;
  },
  preview: JsonBackupPreview,
  mode: 'merge' | 'overwrite'
): {
  userProfile: UserProfile | null;
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
} {
  // Save rollback snapshot first (best-effort within quota)
  try {
    const rollback = {
      savedAt: new Date().toISOString(),
      userProfile: currentState.userProfile,
      goals: currentState.goals,
      history: currentState.history,
      totalRepeatsCount: currentState.totalRepeatsCount,
      vocabProgressOnly: currentState.vocabList.map((v) => ({
        id: v.id,
        masteryLevel: v.masteryLevel,
        isBookmarked: v.isBookmarked,
        srs: v.srs,
      })),
    };
    localStorage.setItem(STORAGE_KEYS.PRE_IMPORT_ROLLBACK, JSON.stringify(rollback));
  } catch {}

  const p = preview.payload;

  if (mode === 'overwrite') {
    return {
      userProfile: p.userProfile && p.userProfile.name ? p.userProfile : currentState.userProfile,
      vocabList: p.vocabList && p.vocabList.length > 0 ? p.vocabList : currentState.vocabList,
      sentenceList: p.sentenceList && p.sentenceList.length > 0 ? p.sentenceList : currentState.sentenceList,
      goals: p.goals && p.goals.length > 0 ? p.goals : currentState.goals,
      history: p.history && p.history.length > 0 ? p.history : currentState.history,
      totalRepeatsCount:
        typeof p.totalRepeatsCount === 'number' ? p.totalRepeatsCount : currentState.totalRepeatsCount,
    };
  }

  // SMART MERGE MODE: union by normalized word/text and keep freshest/highest progress
  const vocabMap = new Map<string, VocabItem>();
  for (const cv of currentState.vocabList) {
    vocabMap.set(cv.word.trim().toLowerCase(), cv);
  }
  for (const bv of p.vocabList || []) {
    if (!bv?.word) continue;
    const key = bv.word.trim().toLowerCase();
    const existing = vocabMap.get(key);
    if (!existing) {
      vocabMap.set(key, bv);
    } else {
      const bReviewMs = bv.srs?.lastReviewedAt ? new Date(bv.srs.lastReviewedAt).getTime() : 0;
      const eReviewMs = existing.srs?.lastReviewedAt ? new Date(existing.srs.lastReviewedAt).getTime() : 0;
      const bMastery = bv.masteryLevel ?? (bv.isLearned ? 2 : 0);
      const eMastery = existing.masteryLevel ?? (existing.isLearned ? 2 : 0);
      const preferBackupSrs = bReviewMs > eReviewMs || (bReviewMs === eReviewMs && bMastery > eMastery);

      vocabMap.set(key, {
        ...existing,
        masteryLevel: Math.max(eMastery, bMastery) as 0 | 1 | 2,
        isLearned: Math.max(eMastery, bMastery) >= 2,
        isBookmarked: Boolean(existing.isBookmarked || bv.isBookmarked),
        repeatCount: Math.max(existing.repeatCount || 0, bv.repeatCount || 0),
        srs: preferBackupSrs ? bv.srs || existing.srs : existing.srs || bv.srs,
      });
    }
  }

  const sentenceMap = new Map<string, SentenceItem>();
  for (const cs of currentState.sentenceList) {
    sentenceMap.set(cs.text.trim().toLowerCase(), cs);
  }
  for (const bs of p.sentenceList || []) {
    if (!bs?.text) continue;
    const key = bs.text.trim().toLowerCase();
    const existing = sentenceMap.get(key);
    if (!existing) {
      sentenceMap.set(key, bs);
    } else {
      const bMastery = bs.masteryLevel ?? (bs.isLearned ? 2 : 0);
      const eMastery = existing.masteryLevel ?? (existing.isLearned ? 2 : 0);
      sentenceMap.set(key, {
        ...existing,
        masteryLevel: Math.max(eMastery, bMastery) as 0 | 1 | 2,
        isLearned: Math.max(eMastery, bMastery) >= 2,
        isBookmarked: Boolean(existing.isBookmarked || bs.isBookmarked),
      });
    }
  }

  const historyMap = new Map<string, DailyGoalHistory>();
  for (const ch of currentState.history) {
    if (ch?.date) historyMap.set(ch.date, ch);
  }
  for (const bh of p.history || []) {
    if (!bh?.date) continue;
    const existing = historyMap.get(bh.date);
    if (!existing) {
      historyMap.set(bh.date, bh);
    } else {
      historyMap.set(bh.date, {
        date: bh.date,
        completedGoalsCount: Math.max(existing.completedGoalsCount || 0, bh.completedGoalsCount || 0),
        totalGoalsCount: Math.max(existing.totalGoalsCount || 0, bh.totalGoalsCount || 0),
        vocabStudyCount: Math.max(existing.vocabStudyCount || 0, bh.vocabStudyCount || 0),
        totalRepeatsCount: Math.max(existing.totalRepeatsCount || 0, bh.totalRepeatsCount || 0),
        isStreakMaintained: Boolean(existing.isStreakMaintained || bh.isStreakMaintained),
      });
    }
  }

  const mergedHistory = Array.from(historyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  const mergedProfile: UserProfile | null =
    currentState.userProfile && p.userProfile
      ? {
          ...currentState.userProfile,
          streakDays: Math.max(currentState.userProfile.streakDays || 1, p.userProfile.streakDays || 1),
          hasPronunciationMasterBadge: Boolean(
            currentState.userProfile.hasPronunciationMasterBadge || p.userProfile.hasPronunciationMasterBadge
          ),
        }
      : currentState.userProfile || p.userProfile || null;

  return {
    userProfile: mergedProfile,
    vocabList: Array.from(vocabMap.values()),
    sentenceList: Array.from(sentenceMap.values()),
    goals: currentState.goals.length > 0 ? currentState.goals : p.goals || [],
    history: mergedHistory,
    totalRepeatsCount: Math.max(currentState.totalRepeatsCount, p.totalRepeatsCount || 0),
  };
}

/**
 * Export ONLY User Profile to a dedicated downloadable .json file on device
 */
export function exportUserProfileToFile(profile: UserProfile) {
  const dataToExport = {
    app: 'WordLoop',
    exportType: 'user_profile',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
  };

  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (profile.name || 'user').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  a.href = url;
  a.download = `wordloop-profile-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read and import User Profile from a device file (.json)
 */
export async function importUserProfileFromFile(file: File): Promise<UserProfile> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      reject(new Error('프로필 파일 크기가 허용 한도(5MB)를 초과했습니다.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = safeJsonParse<any>(text);

        let rawProfile: any = null;
        if (parsed && typeof parsed === 'object') {
          if (parsed.profile && typeof parsed.profile === 'object' && typeof parsed.profile.name === 'string') {
            rawProfile = parsed.profile;
          } else if (parsed.payload?.userProfile && typeof parsed.payload.userProfile.name === 'string') {
            rawProfile = parsed.payload.userProfile;
          } else if (typeof parsed.name === 'string' && parsed.grade) {
            rawProfile = parsed;
          }
        }

        if (rawProfile && rawProfile.name.trim()) {
          const validGrades = ['elementary', 'middle', 'high', 'toeic', 'general'];
          const sanitizedProfile: UserProfile = {
            ...DEFAULT_USER_PROFILE,
            name: String(rawProfile.name).trim().slice(0, 40),
            avatar: String(rawProfile.avatar || '🎓').slice(0, 8),
            grade: validGrades.includes(rawProfile.grade) ? rawProfile.grade : 'high',
            dailyWordGoal: Math.min(Math.max(Number(rawProfile.dailyWordGoal) || 10, 1), 200),
            motto: String(rawProfile.motto || '').trim().slice(0, 120),
            createdAt: typeof rawProfile.createdAt === 'string' ? rawProfile.createdAt : new Date().toISOString(),
          };
          saveUserProfileToDevice(sanitizedProfile);
          resolve(sanitizedProfile);
        } else {
          reject(new Error('올바른 WordLoop 프로필 파일 형식이 아닙니다.'));
        }
      } catch (err) {
        reject(new Error('파일을 읽고 해석하는 중 오류가 발생했습니다.'));
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file);
  });
}
