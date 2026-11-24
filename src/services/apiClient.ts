export type AiEngineMode =
  | 'auto_free'
  | 'kilo_free'
  | 'ovhcloud_free'
  | 'pollinations'
  | 'cloudflare_free'
  | 'llm7_free'
  | 'mlvoca'
  | 'chrome_builtin'
  | 'gemini_byok';

const ENGINE_STORAGE_KEY = 'wordloop_ai_engine_mode';
const GEMINI_KEY_STORAGE_KEY = 'wordloop_gemini_api_key';

const VALID_AI_ENGINES = new Set<AiEngineMode>([
  'auto_free',
  'kilo_free',
  'ovhcloud_free',
  'pollinations',
  'cloudflare_free',
  'llm7_free',
  'mlvoca',
  'chrome_builtin',
  'gemini_byok',
]);

export function getAiEngineMode(): AiEngineMode {
  if (typeof window === 'undefined') return 'auto_free';
  try {
    const raw = (localStorage.getItem(ENGINE_STORAGE_KEY) || '').trim() as AiEngineMode;
    return VALID_AI_ENGINES.has(raw) ? raw : 'auto_free';
  } catch {
    return 'auto_free';
  }
}

export function setAiEngineMode(mode: AiEngineMode): void {
  if (typeof window === 'undefined') return;
  const safeMode: AiEngineMode = VALID_AI_ENGINES.has(mode) ? mode : 'auto_free';
  try {
    localStorage.setItem(ENGINE_STORAGE_KEY, safeMode);
  } catch {}
  window.dispatchEvent(new Event('wordloop_api_key_changed'));
}

export function getUserGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setUserGeminiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key.trim()) {
    localStorage.setItem(GEMINI_KEY_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(GEMINI_KEY_STORAGE_KEY);
  }
  window.dispatchEvent(new Event('wordloop_api_key_changed'));
}

export function getAuthHeaders(): Record<string, string> {
  const userKey = getUserGeminiKey().trim();
  const engineMode = getAiEngineMode();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-ai-engine': engineMode,
  };
  if (userKey) {
    headers['x-gemini-api-key'] = userKey;
  }
  return headers;
}

export const AI_ENGINE_LABELS: Record<AiEngineMode, { title: string; subtitle: string; badge: string }> = {
  auto_free: {
    title: '무료 AI 7중 자동 워터폴 (API 키 불필요)',
    subtitle: 'OVHcloud 70B/DeepSeek · Kilo 550B · Pollinations · Workers AI · LLM7 · MLVoca · 온디바이스 AI 자동 연결',
    badge: '무료 자동',
  },
  kilo_free: {
    title: 'Kilo AI Gateway (Nemotron 550B · 무료 프록시)',
    subtitle: '초대형 550B 무료 모델 자동 라우팅 · 시간당 200회 여유로운 한도 (서버 프록시)',
    badge: 'Kilo 550B',
  },
  ovhcloud_free: {
    title: 'OVHcloud EU AI (DeepSeek V4.1 · Llama 3.3 70B · Mistral 24B)',
    subtitle: '유럽 클라우드 무료 오픈 티어 · 다중 모델 자동 순환으로 빠른 JSON/한국어 응답 (브라우저 직결)',
    badge: 'OVH EU AI',
  },
  pollinations: {
    title: 'Pollinations AI (GPT-OSS 20B)',
    subtitle: '전 세계 무료 오픈 액세스 · 자연스러운 한국어/영어 (브라우저 직결 · 45초 간격 쿨다운)',
    badge: 'Pollinations',
  },
  cloudflare_free: {
    title: 'Cloudflare Workers AI (Llama 3.2 3B)',
    subtitle: 'API 키 없이 초고속 연속 응답 · 롤플레잉/단어 생성 최적화 (브라우저 직결)',
    badge: 'Workers AI',
  },
  llm7_free: {
    title: 'LLM7 Open Gateway (GPT-OSS · Mistral Nemo)',
    subtitle: 'IP별 무료 익명 할당량 제공 · OpenAI 호환 퍼블릭 게이트웨이 (브라우저 직결)',
    badge: 'LLM7 Open',
  },
  mlvoca: {
    title: 'MLVoca Open Ollama (DeepSeek R1 1.5B · TinyLlama)',
    subtitle: '오픈소스 Ollama 추론 서버 · DeepSeek R1/TinyLlama 자동 폴백 (서버 프록시)',
    badge: 'MLVoca R1',
  },
  chrome_builtin: {
    title: '브라우저 내장 온디바이스 AI (Chrome Gemini Nano)',
    subtitle: '네트워크·한도 없이 기기 내부에서 즉시 실행 (지원 Chrome/Edge 환경 전용 · 미지원 시 자동 폴백)',
    badge: '온디바이스',
  },
  gemini_byok: {
    title: '개인 Gemini API 키 전용 (BYOK)',
    subtitle: '직접 등록한 Google Gemini API 키로 오디오 청취·고급 분석 수행',
    badge: 'Gemini 키',
  },
};
