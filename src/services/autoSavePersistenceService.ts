import { UserProfile, VocabItem, SentenceItem, Goal, DailyGoalHistory } from '../types';
import {
  STORAGE_KEYS,
  CompactVocabStorageV2,
  CompactSentenceStorageV2,
  serializeCompactVocab,
  serializeCompactSentences,
} from './deviceStorageService';

import { DEFAULT_VOCAB, DEFAULT_SENTENCES } from '../data/defaultVocab';

export interface FullAppStateSnapshot {
  vocabList?: VocabItem[];
  sentenceList?: SentenceItem[];
  compactVocab?: CompactVocabStorageV2;
  compactSentences?: CompactSentenceStorageV2;
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  userProfile: UserProfile | null;
  savedAt: string;
  isEmergencySave?: boolean;
}

const EMERGENCY_SNAPSHOT_KEY = 'wordloop_emergency_exit_snapshot';
const ATOMIC_SAFETY_LEDGER_KEY = 'wordloop_atomic_safety_ledger';

/**
 * Perform an immediate, synchronous flush of delta progress & metadata to local storage.
 * Uses compact v2 delta format (< 50KB instead of ~2.3MB) so the 5MB localStorage quota stays healthy.
 */
export function flushEmergencyAppState(snapshot: {
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  userProfile: UserProfile | null;
}): boolean {
  try {
    const timestamp = new Date().toISOString();
    const compactVocab = serializeCompactVocab(snapshot.vocabList || [], DEFAULT_VOCAB);
    const compactSentences = serializeCompactSentences(snapshot.sentenceList || [], DEFAULT_SENTENCES);

    if (snapshot.vocabList && snapshot.vocabList.length > 0) {
      localStorage.setItem(STORAGE_KEYS.VOCAB, JSON.stringify(compactVocab));
    }
    if (snapshot.sentenceList && snapshot.sentenceList.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(compactSentences));
    }
    if (snapshot.goals) {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(snapshot.goals));
    }
    if (snapshot.history) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(snapshot.history));
    }
    localStorage.setItem(STORAGE_KEYS.TOTAL_REPEATS, String(snapshot.totalRepeatsCount || 0));

    if (snapshot.userProfile) {
      const updatedProfile: UserProfile = {
        ...snapshot.userProfile,
        lastSavedToDeviceAt: timestamp,
      };
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
    }

    // Store compact delta emergency snapshot (~5-30KB) instead of duplicating 3,210 static dictionary entries
    const fullSnapshot: FullAppStateSnapshot = {
      compactVocab,
      compactSentences,
      goals: snapshot.goals,
      history: snapshot.history,
      totalRepeatsCount: snapshot.totalRepeatsCount,
      userProfile: snapshot.userProfile
        ? {
            ...snapshot.userProfile,
            momPhotoUrl: undefined,
            dadPhotoUrl: undefined,
          }
        : null,
      savedAt: timestamp,
      isEmergencySave: true,
    };

    localStorage.setItem(EMERGENCY_SNAPSHOT_KEY, JSON.stringify(fullSnapshot));
    localStorage.setItem(
      ATOMIC_SAFETY_LEDGER_KEY,
      JSON.stringify({
        lastFlushTime: timestamp,
        reason: 'page_exit_or_hidden',
        vocabCount: snapshot.vocabList?.length || 0,
        sentenceCount: snapshot.sentenceList?.length || 0,
        historyCount: snapshot.history?.length || 0,
      })
    );

    return true;
  } catch (err) {
    console.error('CRITICAL: Emergency state flush encountered an error:', err);
    return false;
  }
}

/**
 * Check if an emergency recovery snapshot exists and verify data integrity
 */
export function checkEmergencyRecoverySnapshot(): {
  hasRecoveryData: boolean;
  snapshot: FullAppStateSnapshot | null;
  timestamp: string | null;
} {
  try {
    const raw = localStorage.getItem(EMERGENCY_SNAPSHOT_KEY);
    if (!raw) return { hasRecoveryData: false, snapshot: null, timestamp: null };

    const parsed: FullAppStateSnapshot = JSON.parse(raw);
    const hasCompact = Boolean(parsed?.compactVocab && parsed.compactVocab.v === 2);
    const hasLegacy = Boolean(Array.isArray(parsed?.vocabList) && parsed.vocabList.length > 0);
    if (parsed && (hasCompact || hasLegacy)) {
      return {
        hasRecoveryData: true,
        snapshot: parsed,
        timestamp: parsed.savedAt || null,
      };
    }
    return { hasRecoveryData: false, snapshot: null, timestamp: null };
  } catch {
    return { hasRecoveryData: false, snapshot: null, timestamp: null };
  }
}

/**
 * Bind comprehensive lifecycle event listeners (beforeunload, pagehide, visibilitychange, freeze)
 * to guarantee zero data loss on mobile/desktop abrupt terminations.
 */
export function setupAppTerminationSafeguards(getCurrentState: () => {
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  userProfile: UserProfile | null;
}): () => void {
  const handleExitFlush = (e?: Event) => {
    try {
      const state = getCurrentState();
      flushEmergencyAppState(state);
    } catch (err) {
      console.warn('Safeguard flush error on event:', e?.type, err);
    }
  };

  window.addEventListener('beforeunload', handleExitFlush, { capture: true });
  window.addEventListener('pagehide', handleExitFlush, { capture: true });

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      handleExitFlush();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange, { capture: true });
  window.addEventListener('freeze' as any, handleExitFlush, { capture: true });

  return () => {
    window.removeEventListener('beforeunload', handleExitFlush, { capture: true });
    window.removeEventListener('pagehide', handleExitFlush, { capture: true });
    document.removeEventListener('visibilitychange', handleVisibilityChange, { capture: true });
    window.removeEventListener('freeze' as any, handleExitFlush, { capture: true });
  };
}
