/**
 * inactivityQuizService.ts
 * Tracks app session intervals and triggers local browser notifications and toasts
 * suggesting a quick 3-minute quiz whenever the user has been inactive for over 24 hours.
 */

const LAST_ACTIVE_STORAGE_KEY = 'wordloop_last_active_timestamp';
const LAST_PROMPT_STORAGE_KEY = 'wordloop_last_inactivity_prompt_timestamp';
export const INACTIVITY_THRESHOLD_HOURS = 24;
export const INACTIVITY_THRESHOLD_MS = INACTIVITY_THRESHOLD_HOURS * 60 * 60 * 1000;
const PROMPT_COOLDOWN_MS = 2 * 60 * 60 * 1000; // Do not nag more than once every 2 hours

export interface InactivityCheckResult {
  isOver24Hours: boolean;
  elapsedHours: number;
  lastActiveTimestamp: number | null;
  shouldPrompt: boolean;
}

/**
 * Checks whether the user hasn't opened or interacted with the app for over 24 hours.
 */
export function checkInactivityStatus(): InactivityCheckResult {
  if (typeof window === 'undefined') {
    return { isOver24Hours: false, elapsedHours: 0, lastActiveTimestamp: null, shouldPrompt: false };
  }

  try {
    const rawLastActive = localStorage.getItem(LAST_ACTIVE_STORAGE_KEY);
    if (!rawLastActive) {
      // First ever session: Initialize timestamp and do not prompt
      recordActivePing();
      return { isOver24Hours: false, elapsedHours: 0, lastActiveTimestamp: null, shouldPrompt: false };
    }

    const lastActive = parseInt(rawLastActive, 10);
    if (Number.isNaN(lastActive) || lastActive <= 0) {
      recordActivePing();
      return { isOver24Hours: false, elapsedHours: 0, lastActiveTimestamp: null, shouldPrompt: false };
    }

    const now = Date.now();
    const elapsedMs = now - lastActive;
    const elapsedHours = Math.round((elapsedMs / (1000 * 60 * 60)) * 10) / 10;
    const isOver24Hours = elapsedMs >= INACTIVITY_THRESHOLD_MS;

    // Check cooldown to avoid duplicate prompts during repeated reloads
    const rawLastPrompt = localStorage.getItem(LAST_PROMPT_STORAGE_KEY);
    const lastPrompt = rawLastPrompt ? parseInt(rawLastPrompt, 10) : 0;
    const isCooldownPassed = now - lastPrompt >= PROMPT_COOLDOWN_MS;

    const shouldPrompt = isOver24Hours && isCooldownPassed;

    return {
      isOver24Hours,
      elapsedHours,
      lastActiveTimestamp: lastActive,
      shouldPrompt,
    };
  } catch (e) {
    return { isOver24Hours: false, elapsedHours: 0, lastActiveTimestamp: null, shouldPrompt: false };
  }
}

/**
 * Updates the user's last active timestamp to current time.
 */
export function recordActivePing(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_ACTIVE_STORAGE_KEY, Date.now().toString());
  } catch (_) {}
}

/**
 * Records that the inactivity prompt or notification was shown.
 */
export function recordPromptShown(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_PROMPT_STORAGE_KEY, Date.now().toString());
  } catch (_) {}
}

/**
 * Triggers a browser native local notification if permission is granted.
 */
export function sendInactivityBrowserNotification(
  elapsedHours: number,
  onClickCallback?: () => void
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const hoursDisplay = Math.floor(elapsedHours) || 24;
    const notification = new Notification('🔥 WordLoop 24시간 만의 복귀 웰컴 알림', {
      body: `${hoursDisplay}시간 만에 돌아오셨네요! 망각 곡선을 이겨내는 3분 퀵 퀴즈로 가볍게 복습하고 스트릭을 지켜보세요 ⚡`,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'wordloop-24h-inactivity-quiz',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClickCallback?.();
    };

    return true;
  } catch (e) {
    console.warn('Failed to send inactivity notification:', e);
    return false;
  }
}

/**
 * Simulation helper for testing the 24-hour inactivity prompt immediately.
 * Sets the last active timestamp to `hoursAgo` (default 26 hours) and dispatches a check event.
 */
export function simulate24hInactivity(hoursAgo = 26): void {
  if (typeof window === 'undefined') return;
  try {
    const fakeTimestamp = Date.now() - hoursAgo * 60 * 60 * 1000;
    localStorage.setItem(LAST_ACTIVE_STORAGE_KEY, fakeTimestamp.toString());
    localStorage.removeItem(LAST_PROMPT_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent('wordloop_inactivity_check_requested', {
        detail: { elapsedHours: hoursAgo },
      })
    );
  } catch (_) {}
}

/**
 * Sets up global activity listeners to automatically keep the last active timestamp updated.
 */
export function setupInactivityActivityTracker(): () => void {
  if (typeof window === 'undefined') return () => {};

  let throttleTimer: any = null;
  const onActivity = () => {
    if (!throttleTimer) {
      recordActivePing();
      // Throttle pings to at most once per 60 seconds
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
      }, 60000);
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // User returned to tab
      window.dispatchEvent(new CustomEvent('wordloop_app_resumed'));
    } else {
      // User left tab or minimized
      recordActivePing();
    }
  };

  window.addEventListener('pointerdown', onActivity, { passive: true });
  window.addEventListener('keydown', onActivity, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('beforeunload', recordActivePing);

  // Expose test helper in development/preview window
  (window as any).simulate24hInactivity = simulate24hInactivity;
  (window as any).checkInactivityStatus = checkInactivityStatus;

  return () => {
    if (throttleTimer) clearTimeout(throttleTimer);
    window.removeEventListener('pointerdown', onActivity);
    window.removeEventListener('keydown', onActivity);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('beforeunload', recordActivePing);
  };
}
