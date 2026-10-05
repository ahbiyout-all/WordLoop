export function getAuthHeaders(): Record<string, string> {
  const userKey = typeof window !== 'undefined' ? (localStorage.getItem('wordloop_gemini_api_key') || '') : '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userKey) {
    headers['x-gemini-api-key'] = userKey;
  }
  return headers;
}

export function getUserGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('wordloop_gemini_api_key') || '';
}

export function setUserGeminiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key.trim()) {
    localStorage.setItem('wordloop_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('wordloop_gemini_api_key');
  }
  window.dispatchEvent(new Event('wordloop_api_key_changed'));
}

