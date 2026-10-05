export interface DailyQuestProgress {
  date: string; // YYYY-MM-DD
  wordsExploredCount: number; // Goal: 3 words
  pronunciationCompleted: boolean; // Goal: 1 pronunciation/voice duel
  gameCompleted: boolean; // Goal: 1 game or quiz completed
  isClaimed: boolean;
}

export interface ReminderSettings {
  enabled: boolean;
  time: string; // e.g. "08:30", "12:30", "22:30"
  lastTriggeredDate?: string;
  preset: 'morning' | 'lunch' | 'night' | 'custom';
}

const QUEST_STORAGE_KEY = 'wordloop_daily_quest';
const REMINDER_STORAGE_KEY = 'wordloop_reminder_settings';

export function getTodayDateString(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getDailyQuestProgress(): DailyQuestProgress {
  const todayStr = getTodayDateString();
  try {
    const saved = localStorage.getItem(QUEST_STORAGE_KEY);
    if (saved) {
      const parsed: DailyQuestProgress = JSON.parse(saved);
      if (parsed.date === todayStr) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  const initial: DailyQuestProgress = {
    date: todayStr,
    wordsExploredCount: 0,
    pronunciationCompleted: false,
    gameCompleted: false,
    isClaimed: false,
  };
  saveDailyQuestProgress(initial);
  return initial;
}

export function saveDailyQuestProgress(progress: DailyQuestProgress): void {
  try {
    localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent('wordloop_quest_updated', { detail: progress }));
  } catch {
    // ignore
  }
}

export function recordWordExplored(): void {
  const current = getDailyQuestProgress();
  if (current.wordsExploredCount < 3) {
    current.wordsExploredCount += 1;
    saveDailyQuestProgress(current);
  }
}

export function recordPronunciationDone(): void {
  const current = getDailyQuestProgress();
  if (!current.pronunciationCompleted) {
    current.pronunciationCompleted = true;
    saveDailyQuestProgress(current);
  }
}

export function recordGameDone(): void {
  const current = getDailyQuestProgress();
  if (!current.gameCompleted) {
    current.gameCompleted = true;
    saveDailyQuestProgress(current);
  }
}

export function isQuestAllCompleted(progress: DailyQuestProgress): boolean {
  return progress.wordsExploredCount >= 3 && progress.pronunciationCompleted && progress.gameCompleted;
}

export function getReminderSettings(): ReminderSettings {
  try {
    const saved = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // fallback
  }

  const defaultSettings: ReminderSettings = {
    enabled: false,
    time: '08:30',
    preset: 'morning',
  };
  return defaultSettings;
}

export function saveReminderSettings(settings: ReminderSettings): void {
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

// Request and trigger browser notifications
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function sendDailyWordNotification(word: string, meaning: string): boolean {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification('🔥 WordLoop 오늘의 1분 퀘스트 알림', {
      body: `오늘의 핵심 단어: [${word}] - ${meaning}\n지금 터치하고 3분 퀘스트를 완료해보세요!`,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'wordloop-daily-quest',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (e) {
    console.error('Notification error:', e);
    return false;
  }
}
