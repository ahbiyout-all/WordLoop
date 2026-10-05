import { UserProfile, VocabItem, SentenceItem, Goal, DailyGoalHistory } from '../types';
import { DEFAULT_USER_PROFILE } from '../data/defaultProfile';

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
};

export interface DeviceStorageStats {
  totalEstimatedBytes: number;
  totalFormattedSize: string;
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
  savedToDeviceCount: number;
  storageType: string;
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
    // Redundant snapshot for safety
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE_BACKUP, serialized);
    localStorage.setItem(STORAGE_KEYS.LAST_DEVICE_SYNC, savedAt);

    // Notify window components
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
      return parsed as UserProfile;
    }
    return null;
  } catch (e) {
    console.error('Failed to load user profile from device:', e);
    return null;
  }
}

/**
 * Calculate total device storage consumption and metrics
 */
export function getDeviceStorageStats(): DeviceStorageStats {
  let totalBytes = 0;
  let hasProfile = false;
  let profileName = '';
  let lastSavedAt: string | null = null;
  let savedToDeviceCount = 0;

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
        totalBytes += (key.length + val.length) * 2; // UTF-16 approx 2 bytes per char
      }
    }

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

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return {
    totalEstimatedBytes: totalBytes,
    totalFormattedSize: formatSize(totalBytes),
    itemCounts,
    hasProfile,
    profileName,
    lastSavedAt,
    savedToDeviceCount,
    storageType: '브라우저 로컬 저장소 (On-Device LocalStorage & PWA Cache)',
  };
}

/**
 * Export ONLY User Profile to a dedicated downloadable .json file on device
 */
export function exportUserProfileToFile(profile: UserProfile) {
  const dataToExport = {
    app: 'WordLoop',
    exportType: 'user_profile',
    version: '2.9.8',
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
          } else if (typeof parsed.name === 'string' && parsed.grade) {
            rawProfile = parsed;
          }
        }

        if (rawProfile && rawProfile.name.trim()) {
          const validGrades = ['elementary', 'middle', 'high_sat', 'business'];
          const sanitizedProfile: UserProfile = {
            ...DEFAULT_USER_PROFILE,
            name: String(rawProfile.name).trim().slice(0, 40),
            avatar: String(rawProfile.avatar || '🎓').slice(0, 8),
            grade: validGrades.includes(rawProfile.grade) ? rawProfile.grade : 'elementary',
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
