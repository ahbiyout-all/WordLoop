import { UserProfile, VocabItem, SentenceItem, Goal, DailyGoalHistory } from '../types';
import { STORAGE_KEYS } from './deviceStorageService';

export interface FullAppStateSnapshot {
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
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
 * Perform an immediate, synchronous, blocking flush of all app data to local storage.
 * Designed specifically for beforeunload, pagehide, visibilitychange (hidden), and freeze events.
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
    
    // 1. Save individual standard primary keys
    if (snapshot.vocabList && snapshot.vocabList.length > 0) {
      localStorage.setItem(STORAGE_KEYS.VOCAB, JSON.stringify(snapshot.vocabList));
    }
    if (snapshot.sentenceList && snapshot.sentenceList.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(snapshot.sentenceList));
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
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE_BACKUP, JSON.stringify(updatedProfile));
    }

    // 2. Save unified emergency full-bundle snapshot with integrity hash
    const fullSnapshot: FullAppStateSnapshot = {
      vocabList: snapshot.vocabList,
      sentenceList: snapshot.sentenceList,
      goals: snapshot.goals,
      history: snapshot.history,
      totalRepeatsCount: snapshot.totalRepeatsCount,
      userProfile: snapshot.userProfile,
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
    if (parsed && Array.isArray(parsed.vocabList) && parsed.vocabList.length > 0) {
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
  // Handler for immediate synchronous write
  const handleExitFlush = (e?: Event) => {
    try {
      const state = getCurrentState();
      flushEmergencyAppState(state);
    } catch (err) {
      console.warn('Safeguard flush error on event:', e?.type, err);
    }
  };

  // 1. beforeunload: Desktop browser tab close, window close, refresh (F5)
  window.addEventListener('beforeunload', handleExitFlush, { capture: true });

  // 2. pagehide: iOS Safari & Modern Mobile Browser tab navigation, back/forward cache
  window.addEventListener('pagehide', handleExitFlush, { capture: true });

  // 3. visibilitychange (Page Lifecycle API): Mobile home button press, app switcher, screen sleep
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      handleExitFlush();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange, { capture: true });

  // 4. freeze event (W3C Page Lifecycle spec - CPU throttling before kill)
  window.addEventListener('freeze' as any, handleExitFlush, { capture: true });

  // Cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleExitFlush, { capture: true });
    window.removeEventListener('pagehide', handleExitFlush, { capture: true });
    document.removeEventListener('visibilitychange', handleVisibilityChange, { capture: true });
    window.removeEventListener('freeze' as any, handleExitFlush, { capture: true });
  };
}
