import { useState, useEffect, useCallback } from 'react';
import { PronunciationHistoryItem } from '../components/PronunciationTrendChart';

export const PRONUNCIATION_HISTORY_STORAGE_KEY = 'wordloop_pronunciation_history';

export function loadPronunciationHistory(): PronunciationHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(PRONUNCIATION_HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function getPronunciationGoalFromStorage(): { currentCount: number; targetCount: number } {
  if (typeof window === 'undefined') return { currentCount: 0, targetCount: 3 };
  try {
    const saved = localStorage.getItem('wordloop_goals');
    if (saved) {
      const goals = JSON.parse(saved);
      const pronGoal = goals.find(
        (g: any) => g.isPronunciationGoal || g.iconName === 'Mic' || g.title?.includes('발음') || g.id === 'g-2'
      );
      if (pronGoal) {
        return { currentCount: pronGoal.currentCount || 0, targetCount: pronGoal.targetCount || 3 };
      }
    }
  } catch {}
  return { currentCount: 0, targetCount: 3 };
}

export function savePronunciationHistoryItem(
  item: Omit<PronunciationHistoryItem, 'id' | 'timestamp'>
): PronunciationHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = loadPronunciationHistory();
    const newItem: PronunciationHistoryItem = {
      id: `pron-hist-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      recordedAt: Date.now(),
      ...item,
    };
    const updated = [newItem, ...existing].slice(0, 50);
    localStorage.setItem(PRONUNCIATION_HISTORY_STORAGE_KEY, JSON.stringify(updated));

    // Dispatch custom event to auto-increment pronunciation goals in App.tsx
    window.dispatchEvent(new CustomEvent('wordloop_pronunciation_completed', { detail: item }));

    return updated;
  } catch (e) {
    console.warn('Failed to save pronunciation history:', e);
    return [];
  }
}

export function clearPronunciationHistory(): PronunciationHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    localStorage.removeItem(PRONUNCIATION_HISTORY_STORAGE_KEY);
    return [];
  } catch {
    return [];
  }
}

export function usePronunciationHistory() {
  const [history, setHistory] = useState<PronunciationHistoryItem[]>([]);
  const [goal, setGoal] = useState<{ currentCount: number; targetCount: number }>({ currentCount: 0, targetCount: 3 });

  const refreshHistory = useCallback(() => {
    setHistory(loadPronunciationHistory());
    setGoal(getPronunciationGoalFromStorage());
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const addHistoryItem = useCallback((item: Omit<PronunciationHistoryItem, 'id' | 'timestamp'>) => {
    const updated = savePronunciationHistoryItem(item);
    setHistory(updated);
    setGoal(getPronunciationGoalFromStorage());
    return updated;
  }, []);

  const clearHistory = useCallback(() => {
    clearPronunciationHistory();
    setHistory([]);
  }, []);

  return {
    history,
    goal,
    refreshHistory,
    addHistoryItem,
    clearHistory,
  };
}
