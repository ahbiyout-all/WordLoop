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

    // Keep localStorage bootstrap ultra-light (< 1KB): strip bulky base64/blob image strings from LS copy
    const bootstrapProfile: UserProfile = { ...updatedProfile };
    if (bootstrapProfile.momPhotoUrl && (bootstrapProfile.momPhotoUrl.startsWith('data:') || bootstrapProfile.momPhotoUrl.startsWith('blob:'))) {
      bootstrapProfile.momPhotoRef = 'idb:mom_photo';
      delete bootstrapProfile.momPhotoUrl;
    }
    if (bootstrapProfile.dadPhotoUrl && (bootstrapProfile.dadPhotoUrl.startsWith('data:') || bootstrapProfile.dadPhotoUrl.startsWith('blob:'))) {
      bootstrapProfile.dadPhotoRef = 'idb:dad_photo';
      delete bootstrapProfile.dadPhotoUrl;
    }

    const serialized = JSON.stringify(bootstrapProfile);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, serialized);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE_BACKUP);
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

const MAX_IMPORT_FILE_BYTES = 25 * 1024 * 1024; // 25MB max JSON/Gzip import size

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
    .replace(/\bon\w+\s*=/gi, '')
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
      const limit = value.startsWith('data:image/') ? 5_000_000 : 3000;
      clean[key] = sanitizeSafeText(value, limit);
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
  wordloop_emergency_exit_snapshot: '종료 직전 긴급 스냅샷',
  wordloop_emergency_snapshot: '구버전 긴급 스냅샷',
  wordloop_atomic_safety_ledger: '안전 저장 원장',
  wordloop_pre_import_rollback: '가져오기 직전 롤백 본',
  wordloop_ai_engine_mode: 'AI 엔진 모드',
};

export interface CompactVocabProgress {
  m?: 0 | 1 | 2; // masteryLevel
  l?: boolean; // isLearned
  b?: boolean; // isBookmarked
  r?: number; // repeatCount
  s?: VocabItem['srs']; // SM-2 srs
}

export interface CompactVocabStorageV2 {
  v: 2;
  defaultCount: number;
  progress: Record<string, CompactVocabProgress>;
  custom: VocabItem[];
}

export interface CompactSentenceProgress {
  m?: 0 | 1 | 2;
  l?: boolean;
  b?: boolean;
  r?: number;
}

export interface CompactSentenceStorageV2 {
  v: 2;
  defaultCount: number;
  progress: Record<string, CompactSentenceProgress>;
  custom: SentenceItem[];
}

const BUILT_IN_VOCAB_ID_PREFIXES = ['edu3000-v-', 'edu3000-', 'curr-', 'vocab-'];
const BUILT_IN_SENTENCE_ID_PREFIXES = [
  'elem-sent-',
  'mid-sent-',
  'prac-sent-',
  'sat-sent-',
  'curr-sentence-',
  'edu3000-s-',
  'sent-',
];

function isKnownBuiltInVocabId(id?: string): boolean {
  if (!id) return false;
  return BUILT_IN_VOCAB_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

function isKnownBuiltInSentenceId(id?: string): boolean {
  if (!id) return false;
  return BUILT_IN_SENTENCE_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

/**
 * Compacts vocabList by stripping static built-in curriculum fields that already ship in DEFAULT_VOCAB,
 * retaining 100% of user progress (masteryLevel, isLearned, isBookmarked, repeatCount, srs) & custom/edited items.
 */
export function serializeCompactVocab(
  vocabList: VocabItem[],
  defaultVocab?: VocabItem[]
): CompactVocabStorageV2 {
  const defaultMap = new Map<string, VocabItem>();
  if (defaultVocab) {
    for (const dv of defaultVocab) {
      defaultMap.set(dv.word.trim().toLowerCase(), dv);
    }
  }

  const progress: Record<string, CompactVocabProgress> = {};
  const custom: VocabItem[] = [];
  let builtInCount = 0;

  for (const item of vocabList) {
    if (!item?.word) continue;
    const key = item.word.trim().toLowerCase();
    const canonical = defaultMap.get(key);
    const matchesBuiltIn =
      !item.isCustom &&
      (canonical
        ? canonical.meaning === item.meaning &&
          canonical.sentence === item.sentence &&
          canonical.sentenceMeaning === item.sentenceMeaning
        : isKnownBuiltInVocabId(item.id));

    if (!matchesBuiltIn) {
      custom.push(item);
      continue;
    }

    builtInCount++;
    const hasProgress =
      (item.masteryLevel ?? 0) > 0 ||
      Boolean(item.isLearned) ||
      Boolean(item.isBookmarked) ||
      (item.repeatCount ?? 0) > 0 ||
      Boolean(item.srs);

    if (hasProgress) {
      const entry: CompactVocabProgress = {};
      if ((item.masteryLevel ?? 0) > 0) entry.m = item.masteryLevel;
      if (item.isLearned) entry.l = true;
      if (item.isBookmarked) entry.b = true;
      if ((item.repeatCount ?? 0) > 0) entry.r = item.repeatCount;
      if (item.srs) entry.s = item.srs;
      progress[key] = entry;
    }
  }

  return {
    v: 2,
    defaultCount: defaultVocab ? defaultVocab.length : builtInCount,
    progress,
    custom,
  };
}

/**
 * Hydrates full VocabItem[] from either compact v2 delta storage or legacy array storage.
 */
export function hydrateCompactVocab(rawSaved: string, defaultVocab: VocabItem[]): VocabItem[] {
  const parsed = safeJsonParse<any>(rawSaved);

  if (parsed && typeof parsed === 'object' && parsed.v === 2 && parsed.progress) {
    const progressMap = parsed.progress as Record<string, CompactVocabProgress>;
    const hydratedBuiltIns = defaultVocab.map((dv) => {
      const p = progressMap[dv.word.trim().toLowerCase()];
      if (!p) return dv;
      return {
        ...dv,
        masteryLevel: p.m ?? dv.masteryLevel ?? (p.l ? 2 : 0),
        isLearned: p.l ?? (p.m ? p.m >= 2 : dv.isLearned),
        isBookmarked: p.b ?? dv.isBookmarked,
        repeatCount: p.r ?? dv.repeatCount,
        srs: p.s ?? dv.srs,
      };
    });
    const customItems = Array.isArray(parsed.custom) ? (parsed.custom as VocabItem[]) : [];
    if (customItems.length === 0) return hydratedBuiltIns;

    // Deduplicate custom/edited overrides so modified built-ins replace rather than duplicate
    const customByKey = new Map<string, VocabItem>();
    const customExtra: VocabItem[] = [];
    const builtInKeySet = new Set(hydratedBuiltIns.map((v) => v.word.trim().toLowerCase()));

    for (const ci of customItems) {
      if (!ci?.word) continue;
      const normKey = ci.word.trim().toLowerCase();
      if (builtInKeySet.has(normKey)) {
        customByKey.set(normKey, ci);
      } else if (!customExtra.some((x) => x.word.trim().toLowerCase() === normKey)) {
        customExtra.push(ci);
      }
    }

    const mergedBuiltIns = hydratedBuiltIns.map((dv) => {
      const override = customByKey.get(dv.word.trim().toLowerCase());
      return override ? override : dv;
    });

    return [...customExtra, ...mergedBuiltIns];
  }

  if (Array.isArray(parsed)) {
    const defaultVocabMap = new Map<string, VocabItem>();
    defaultVocab.forEach((v) => defaultVocabMap.set(v.word.trim().toLowerCase(), v));

    const repaired: VocabItem[] = parsed.map((item: VocabItem) => {
      if (!item?.word) return item;
      const canonical = defaultVocabMap.get(item.word.trim().toLowerCase());
      const rawMeaning = item.meaning || '';
      const rawSentence = item.sentence || '';
      const rawSentenceMeaning = item.sentenceMeaning || '';

      const needsMeaningRepair =
        !/[\u3131-\u318E\uAC00-\uD7A3]/.test(rawMeaning) ||
        rawMeaning.includes('관련 어휘') ||
        rawMeaning.includes('파생 어휘') ||
        rawMeaning.toLowerCase() === item.word.toLowerCase() ||
        (/[a-zA-Z]/.test(rawMeaning) && !item.isCustom);

      const needsExampleRepair =
        !item.isCustom &&
        (rawSentence.includes('essential vocabulary item') ||
          rawSentence.includes('in formal English sentences') ||
          rawSentenceMeaning.includes('대한민국 교육부') ||
          rawSentenceMeaning.includes('수능 필수 어휘') ||
          rawSentenceMeaning.includes('교육부 핵심 예문') ||
          rawSentenceMeaning.includes('유용한 실용 예문') ||
          rawSentenceMeaning.includes('파생 어휘'));

      if ((needsMeaningRepair || needsExampleRepair) && canonical) {
        return {
          ...item,
          meaning: needsMeaningRepair ? canonical.meaning : item.meaning,
          sentence: canonical.sentence || item.sentence,
          sentenceMeaning: canonical.sentenceMeaning || item.sentenceMeaning,
          ipa: canonical.ipa || item.ipa,
        };
      }
      return item;
    });

    const existingWordSet = new Set(repaired.map((item) => (item?.word || '').toLowerCase()));
    const missingDefaults = defaultVocab.filter((item) => !existingWordSet.has(item.word.toLowerCase()));
    return missingDefaults.length > 0 ? [...repaired, ...missingDefaults] : repaired;
  }

  return defaultVocab;
}

/**
 * Compacts sentenceList by stripping static DEFAULT_SENTENCES payloads while preserving progress & custom sentences.
 */
export function serializeCompactSentences(
  sentenceList: SentenceItem[],
  defaultSentences?: SentenceItem[]
): CompactSentenceStorageV2 {
  const defaultMap = new Map<string, SentenceItem>();
  if (defaultSentences) {
    for (const ds of defaultSentences) {
      defaultMap.set(ds.text.trim().toLowerCase(), ds);
    }
  }

  const progress: Record<string, CompactSentenceProgress> = {};
  const custom: SentenceItem[] = [];
  let builtInCount = 0;

  for (const item of sentenceList) {
    if (!item?.text) continue;
    const key = item.text.trim().toLowerCase();
    const canonical = defaultMap.get(key);
    const matchesBuiltIn =
      !item.isCustom &&
      (canonical ? canonical.meaning === item.meaning : isKnownBuiltInSentenceId(item.id));

    if (!matchesBuiltIn) {
      custom.push(item);
      continue;
    }

    builtInCount++;
    const hasProgress =
      (item.masteryLevel ?? 0) > 0 ||
      Boolean(item.isLearned) ||
      Boolean(item.isBookmarked) ||
      (item.repeatCount ?? 0) > 0;

    if (hasProgress) {
      const entry: CompactSentenceProgress = {};
      if ((item.masteryLevel ?? 0) > 0) entry.m = item.masteryLevel;
      if (item.isLearned) entry.l = true;
      if (item.isBookmarked) entry.b = true;
      if ((item.repeatCount ?? 0) > 0) entry.r = item.repeatCount;
      progress[key] = entry;
    }
  }

  return {
    v: 2,
    defaultCount: defaultSentences ? defaultSentences.length : builtInCount,
    progress,
    custom,
  };
}

/**
 * Hydrates full SentenceItem[] from either compact v2 storage or legacy array storage.
 */
export function hydrateCompactSentences(rawSaved: string, defaultSentences: SentenceItem[]): SentenceItem[] {
  const parsed = safeJsonParse<any>(rawSaved);

  if (parsed && typeof parsed === 'object' && parsed.v === 2 && parsed.progress) {
    const progressMap = parsed.progress as Record<string, CompactSentenceProgress>;
    const hydratedBuiltIns = defaultSentences.map((ds) => {
      const p = progressMap[ds.text.trim().toLowerCase()];
      if (!p) return ds;
      return {
        ...ds,
        masteryLevel: p.m ?? ds.masteryLevel ?? (p.l ? 2 : 0),
        isLearned: p.l ?? (p.m ? p.m >= 2 : ds.isLearned),
        isBookmarked: p.b ?? ds.isBookmarked,
        repeatCount: p.r ?? ds.repeatCount,
      };
    });
    const customItems = Array.isArray(parsed.custom) ? (parsed.custom as SentenceItem[]) : [];
    if (customItems.length === 0) return hydratedBuiltIns;

    // Deduplicate custom/edited overrides against built-in sentences
    const customByKey = new Map<string, SentenceItem>();
    const customExtra: SentenceItem[] = [];
    const builtInKeySet = new Set(hydratedBuiltIns.map((s) => s.text.trim().toLowerCase()));

    for (const ci of customItems) {
      if (!ci?.text) continue;
      const normKey = ci.text.trim().toLowerCase();
      if (builtInKeySet.has(normKey)) {
        customByKey.set(normKey, ci);
      } else if (!customExtra.some((x) => x.text.trim().toLowerCase() === normKey)) {
        customExtra.push(ci);
      }
    }

    const mergedBuiltIns = hydratedBuiltIns.map((ds) => {
      const override = customByKey.get(ds.text.trim().toLowerCase());
      return override ? override : ds;
    });

    return [...customExtra, ...mergedBuiltIns];
  }

  if (Array.isArray(parsed)) {
    const cleanedParsed = parsed.filter(
      (item: SentenceItem) =>
        item?.text &&
        !item.text.includes('is an essential vocabulary item in the English curriculum') &&
        !item.text.includes('in formal English sentences') &&
        !item.text.includes('alongside') &&
        item.meaning &&
        !item.meaning.includes('대한민국 교육부') &&
        !item.meaning.includes('교육부 핵심 예문') &&
        !item.meaning.includes('유용한 실용 예문') &&
        !item.meaning.includes('파생 어휘') &&
        !item.meaning.includes('필수 어휘') &&
        /[\u3131-\u318E\uAC00-\uD7A3]/.test(item.meaning)
    );
    const existingTextSet = new Set(cleanedParsed.map((item: SentenceItem) => item.text.trim().toLowerCase()));
    const missingDefaults = defaultSentences.filter(
      (item) => !existingTextSet.has(item.text.trim().toLowerCase())
    );
    const combined = missingDefaults.length > 0 ? [...cleanedParsed, ...missingDefaults] : cleanedParsed;
    return combined.length > 0 ? combined : defaultSentences;
  }

  return defaultSentences;
}

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
        const parsedVocab = JSON.parse(rawVocab);
        if (Array.isArray(parsedVocab)) {
          itemCounts.vocabCount = parsedVocab.length;
        } else if (parsedVocab && parsedVocab.v === 2) {
          itemCounts.vocabCount =
            (Number(parsedVocab.defaultCount) || 0) +
            (Array.isArray(parsedVocab.custom) ? parsedVocab.custom.length : 0);
        }
      } catch {}
    }

    const rawSentences = localStorage.getItem(STORAGE_KEYS.SENTENCES);
    if (rawSentences) {
      try {
        const parsedSent = JSON.parse(rawSentences);
        if (Array.isArray(parsedSent)) {
          itemCounts.sentenceCount = parsedSent.length;
        } else if (parsedSent && parsedSent.v === 2) {
          itemCounts.sentenceCount =
            (Number(parsedSent.defaultCount) || 0) +
            (Array.isArray(parsedSent.custom) ? parsedSent.custom.length : 0);
        }
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
    storageType: '3계층 로컬 저장소 (IndexedDB · 로컬 폴더 · 빠른 캐시)',
  };
}

/**
 * Safely prune redundant temporary snapshots & compact legacy full-dictionary storage blobs,
 * without deleting active vocab progress, sentences, goals, history, or primary profile.
 */
export function cleanupRedundantStorageCache(liveData?: {
  vocabList?: VocabItem[];
  sentenceList?: SentenceItem[];
}): { freedBytes: number; removedKeys: string[]; compactedKeys: string[] } {
  const candidateKeys = [
    STORAGE_KEYS.PRE_IMPORT_ROLLBACK,
    'wordloop_emergency_exit_snapshot',
    'wordloop_emergency_snapshot',
    'wordloop_atomic_safety_ledger',
    STORAGE_KEYS.USER_PROFILE_BACKUP,
  ];
  let freedBytes = 0;
  const removedKeys: string[] = [];
  const compactedKeys: string[] = [];

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

  // Compact legacy uncompressed vocab array (~2.1MB -> ~5KB)
  try {
    const rawVocab = localStorage.getItem(STORAGE_KEYS.VOCAB);
    if (rawVocab) {
      const parsed = safeJsonParse<any>(rawVocab);
      if (Array.isArray(parsed)) {
        const beforeBytes = (STORAGE_KEYS.VOCAB.length + rawVocab.length) * 2;
        const compactObj = serializeCompactVocab(
          liveData?.vocabList && liveData.vocabList.length > 0 ? liveData.vocabList : parsed
        );
        const nextRaw = JSON.stringify(compactObj);
        const afterBytes = (STORAGE_KEYS.VOCAB.length + nextRaw.length) * 2;
        if (afterBytes < beforeBytes) {
          localStorage.setItem(STORAGE_KEYS.VOCAB, nextRaw);
          freedBytes += beforeBytes - afterBytes;
          compactedKeys.push(STORAGE_KEYS.VOCAB);
        }
      }
    }
  } catch {}

  // Compact legacy uncompressed sentences array
  try {
    const rawSent = localStorage.getItem(STORAGE_KEYS.SENTENCES);
    if (rawSent) {
      const parsed = safeJsonParse<any>(rawSent);
      if (Array.isArray(parsed)) {
        const beforeBytes = (STORAGE_KEYS.SENTENCES.length + rawSent.length) * 2;
        const compactObj = serializeCompactSentences(
          liveData?.sentenceList && liveData.sentenceList.length > 0 ? liveData.sentenceList : parsed
        );
        const nextRaw = JSON.stringify(compactObj);
        const afterBytes = (STORAGE_KEYS.SENTENCES.length + nextRaw.length) * 2;
        if (afterBytes < beforeBytes) {
          localStorage.setItem(STORAGE_KEYS.SENTENCES, nextRaw);
          freedBytes += beforeBytes - afterBytes;
          compactedKeys.push(STORAGE_KEYS.SENTENCES);
        }
      }
    }
  } catch {}

  if (typeof window !== 'undefined' && (removedKeys.length > 0 || compactedKeys.length > 0)) {
    window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
  }

  return { freedBytes, removedKeys, compactedKeys };
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
 * Export Schema v3 Gzip-compressed portable backup (.json.gz) including compact delta + optional media photos
 */
export async function exportCompressedBackupToFile(data: {
  userProfile: UserProfile | null;
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  mediaDataUrls?: { momPhotoDataUrl?: string; dadPhotoDataUrl?: string };
}): Promise<{
  manifest: VersionedBackupManifest;
  fileName: string;
  rawBytes: number;
  compressedBytes: number;
  wasCompressed: boolean;
}> {
  const manifest = buildVersionedJsonBackup(data);
  const v3Bundle = {
    ...manifest,
    schemaVersion: 3,
    payload: {
      ...manifest.payload,
      mediaDataUrls: data.mediaDataUrls,
    },
  };
  const jsonText = JSON.stringify(v3Bundle);
  const rawArr = new TextEncoder().encode(jsonText);

  let outBytes = rawArr;
  let wasCompressed = false;
  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(rawArr).catch(() => {});
      writer.close().catch(() => {});
      const reader = cs.readable.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          total += value.byteLength;
        }
      }
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.byteLength;
      }
      outBytes = merged;
      wasCompressed = true;
    } catch {}
  }

  const safeCopy = new Uint8Array(outBytes.byteLength);
  safeCopy.set(outBytes);
  const blob = new Blob([safeCopy], {
    type: wasCompressed ? 'application/gzip' : 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (data.userProfile?.name || 'user').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  const ext = wasCompressed ? 'json.gz' : 'json';
  const fileName = `wordloop-backup-v${APP_VERSION}-${safeName}-${new Date().toISOString().slice(0, 10)}.${ext}`;
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  try {
    localStorage.setItem(STORAGE_KEYS.LAST_JSON_EXPORT, manifest.exportedAt);
  } catch {}

  return {
    manifest,
    fileName,
    rawBytes: rawArr.byteLength,
    compressedBytes: outBytes.byteLength,
    wasCompressed,
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
 * Parse and validate raw bytes (.json or Gzip .json.gz across Schema v1/v2/v3), returning diff preview
 */
export async function parseAndPreviewBackupBytes(
  rawBytes: Uint8Array,
  fileName: string,
  currentState: {
    vocabList: VocabItem[];
    sentenceList: SentenceItem[];
    goals: Goal[];
    history: DailyGoalHistory[];
    totalRepeatsCount: number;
  }
): Promise<JsonBackupPreview> {
  if (rawBytes.byteLength > MAX_IMPORT_FILE_BYTES) {
    throw new Error('백업 파일 크기가 허용 한도(25MB)를 초과했습니다.');
  }

  let text = '';
  const isGzip = rawBytes.byteLength >= 2 && rawBytes[0] === 0x1f && rawBytes[1] === 0x8b;
  if (isGzip) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('현재 브라우저가 .json.gz 압축 백업 해제를 지원하지 않습니다.');
    }
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    const safeCopy = new Uint8Array(rawBytes.byteLength);
    safeCopy.set(rawBytes);
    writer.write(safeCopy).catch(() => {});
    writer.close().catch(() => {});
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
      }
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    text = new TextDecoder().decode(merged);
  } else {
    text = new TextDecoder().decode(rawBytes);
  }

  const rawParsed = safeJsonParse<any>(text);
  if (!rawParsed || typeof rawParsed !== 'object') {
    throw new Error('올바른 JSON 백업 파일이 아닙니다.');
  }

  let checksumStatus: 'verified' | 'legacy_no_checksum' | 'mismatch' = 'legacy_no_checksum';
  let rawPayload: any = rawParsed;
  let schemaVersion = 1;
  const appVersion = String(rawParsed.version || rawParsed.appVersion || 'legacy');
  const exportedAt = typeof rawParsed.exportedAt === 'string' ? rawParsed.exportedAt : null;

  if ((rawParsed.schemaVersion === 2 || rawParsed.schemaVersion === 3) && rawParsed.payload && typeof rawParsed.payload === 'object') {
    schemaVersion = rawParsed.schemaVersion;
    rawPayload = rawParsed.payload;
    if (typeof rawParsed.checksum === 'string') {
      if (rawParsed.schemaVersion === 3) {
        // v3 checksum covers payload before or with compact/media fields; allow either match
        const expectedExact = computePayloadChecksum(rawParsed.payload);
        const { mediaDataUrls: _m, ...withoutMedia } = rawParsed.payload;
        const expectedCore = computePayloadChecksum(withoutMedia);
        checksumStatus =
          expectedExact === rawParsed.checksum || expectedCore === rawParsed.checksum
            ? 'verified'
            : 'mismatch';
      } else {
        const expected = computePayloadChecksum(rawParsed.payload);
        checksumStatus = expected === rawParsed.checksum ? 'verified' : 'mismatch';
      }
    }
  }

  const sanitized = sanitizeDeepObject<any>(rawPayload);

  // Hydrate compactVocab / compactSentences when reading Schema v3 sync bundles
  let backupVocab: VocabItem[] = [];
  if (Array.isArray(sanitized.vocabList)) {
    backupVocab = sanitized.vocabList.slice(0, 5000);
  } else if (sanitized.compactVocab && sanitized.compactVocab.v === 2) {
    backupVocab = hydrateCompactVocab(
      JSON.stringify(sanitized.compactVocab),
      currentState.vocabList
    );
  }

  let backupSentences: SentenceItem[] = [];
  if (Array.isArray(sanitized.sentenceList)) {
    backupSentences = sanitized.sentenceList.slice(0, 5000);
  } else if (sanitized.compactSentences && sanitized.compactSentences.v === 2) {
    backupSentences = hydrateCompactSentences(
      JSON.stringify(sanitized.compactSentences),
      currentState.sentenceList
    );
  }

  const backupGoals = Array.isArray(sanitized.goals) ? sanitized.goals.slice(0, 200) : [];
  const backupHistory = Array.isArray(sanitized.history) ? sanitized.history.slice(0, 1000) : [];
  const backupRepeats =
    typeof sanitized.totalRepeatsCount === 'number' && Number.isFinite(sanitized.totalRepeatsCount)
      ? Math.max(0, Math.floor(sanitized.totalRepeatsCount))
      : 0;

  let backupProfile: UserProfile | null = sanitized.userProfile || null;
  if (backupProfile && sanitized.mediaDataUrls) {
    backupProfile = {
      ...backupProfile,
      momPhotoUrl:
        typeof rawPayload?.mediaDataUrls?.momPhotoDataUrl === 'string'
          ? rawPayload.mediaDataUrls.momPhotoDataUrl
          : backupProfile.momPhotoUrl,
      dadPhotoUrl:
        typeof rawPayload?.mediaDataUrls?.dadPhotoDataUrl === 'string'
          ? rawPayload.mediaDataUrls.dadPhotoDataUrl
          : backupProfile.dadPhotoUrl,
    };
  }

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
    fileName,
    fileSizeBytes: rawBytes.byteLength,
    schemaVersion,
    appVersion,
    exportedAt,
    checksumStatus,
    backupProfileName: backupProfile?.name || '미지정 프로필',
    payload: {
      userProfile: backupProfile,
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
 * Parse and validate a JSON or Gzipped JSON backup file (Schema v1/v2/v3), returning diff preview
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
    throw new Error('백업 파일 크기가 허용 한도(25MB)를 초과했습니다.');
  }
  const buf = await file.arrayBuffer();
  return parseAndPreviewBackupBytes(new Uint8Array(buf), file.name, currentState);
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
          momPhotoUrl: currentState.userProfile.momPhotoUrl || p.userProfile.momPhotoUrl,
          dadPhotoUrl: currentState.userProfile.dadPhotoUrl || p.userProfile.dadPhotoUrl,
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
