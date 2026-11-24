import {
  Goal,
  PhonemeErrorItem,
  PronunciationCorrectionReport,
  RoleplayMessage,
  RoleplayReport,
} from '../types';
import { RoleplayScenario } from '../data/roleplayScenariosData';
import {
  AiEngineMode,
  getAiEngineMode,
  getAuthHeaders,
  getUserGeminiKey,
} from './apiClient';
import { safeJsonParse, sanitizeDeepObject, sanitizeSafeText } from './deviceStorageService';

// Trusted, hardcoded keyless worldwide public HTTPS AI endpoints (zero user-controlled URLs -> no SSRF)
const OVHCLOUD_CHAT_ENDPOINT = 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions';
const POLLINATIONS_ENDPOINT = 'https://text.pollinations.ai/';
const CLOUDFLARE_WORKERS_FREE_ENDPOINT = 'https://devtoolbox-api.devtoolbox-api.workers.dev/ai/generate';
const LLM7_CHAT_ENDPOINT = 'https://api.llm7.io/v1/chat/completions';

const OVHCLOUD_FREE_MODELS = [
  'DeepSeek-V4.1-Flash-1017',
  'Mistral-Small-3.2-24B-Instruct-2506',
  'Meta-Llama-3_3-70B-Instruct',
  'gpt-oss-20b',
  'gemma-4-26b-a4b',
];

const LLM7_FREE_MODELS = ['default', 'gpt-oss:20b', 'mistral-Nemo-Instruct-2407'];

let browserPollinationsCooldownUntil = 0;
let browserLlm7CooldownUntil = 0;
const browserOvhCooldownUntil = new Map<string, number>();

export type BrowserFreeProviderId =
  | 'ovhcloud_free'
  | 'pollinations'
  | 'cloudflare_free'
  | 'llm7_free'
  | 'chrome_builtin';

export interface FreeAiGenerationResult {
  text: string;
  providerName: string;
  providerId: BrowserFreeProviderId;
}

function combineSignals(timeoutMs: number, externalSignal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);

  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort(externalSignal.reason);
      return controller.signal;
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  controller.signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    },
    { once: true }
  );

  return controller.signal;
}

/**
 * Strip DeepSeek <think> blocks, markdown code fences, and extract valid JSON object/array safely.
 */
export function extractJsonFromAiText<T = any>(rawText: string): T | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Direct parse attempt
  try {
    const parsed = safeJsonParse<T>(cleaned);
    if (parsed && typeof parsed === 'object') {
      return sanitizeDeepObject(parsed);
    }
  } catch {}

  // Substring object/array scan
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;
  let openChar = '{';
  let closeChar = '}';

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
    openChar = '[';
    closeChar = ']';
  } else if (firstBrace !== -1) {
    start = firstBrace;
  }

  if (start === -1) return null;

  const lastClose = cleaned.lastIndexOf(closeChar);
  if (lastClose <= start) return null;

  const candidate = cleaned.slice(start, lastClose + 1);
  try {
    const parsed = safeJsonParse<T>(candidate);
    if (parsed && typeof parsed === 'object') {
      return sanitizeDeepObject(parsed);
    }
  } catch {}

  // Balance scan fallback if trailing prose had another bracket
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === openChar) {
      depth++;
    } else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        const slice = cleaned.slice(start, i + 1);
        try {
          const parsed = safeJsonParse<T>(slice);
          if (parsed && typeof parsed === 'object') {
            return sanitizeDeepObject(parsed);
          }
        } catch {}
        break;
      }
    }
  }

  return null;
}

/**
 * Unwraps array payloads even if an LLM wraps them in { items: [...] }, { words: [...] }, { goals: [...] }, etc.
 */
export function unwrapArrayFromAiPayload(payload: unknown, candidateKeys: string[]): any[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const key of candidateKeys) {
      if (Array.isArray(obj[key])) {
        return obj[key] as any[];
      }
    }
    for (const val of Object.values(obj)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        return val as any[];
      }
    }
  }
  return null;
}

function normalizeStringField(val: unknown, fallback: string = '', maxLen: number = 600): string {
  if (typeof val === 'string') {
    const clean = sanitizeSafeText(val, maxLen);
    return clean || fallback;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  return fallback;
}

function normalizeRoleplayTurnPayload(raw: any, safeUserMessage: string) {
  const aiEn = normalizeStringField(raw?.aiResponse?.en ?? raw?.aiResponse, 'Could you say that again?', 500);
  const aiKo = normalizeStringField(raw?.aiResponse?.ko, '다시 한 번 말씀해 주시겠어요?', 500);

  const rephrasedBetter = normalizeStringField(
    raw?.feedback?.rephrasedBetter,
    safeUserMessage,
    400
  );
  const grammarNotes = normalizeStringField(
    raw?.feedback?.grammarNotes,
    '자연스러운 문장 구성입니다.',
    400
  );
  const pronunciationTips = raw?.feedback?.pronunciationTips
    ? normalizeStringField(raw.feedback.pronunciationTips, '', 300)
    : undefined;

  const newCompletedMissionIds = Array.isArray(raw?.newCompletedMissionIds)
    ? raw.newCompletedMissionIds.filter((id: unknown) => typeof id === 'string').slice(0, 10)
    : [];

  const recommendedNextHints = Array.isArray(raw?.recommendedNextHints)
    ? raw.recommendedNextHints
        .slice(0, 2)
        .map((h: any) => ({
          en: normalizeStringField(h?.en, '', 200),
          ko: normalizeStringField(h?.ko, '', 200),
        }))
        .filter((h: { en: string; ko: string }) => h.en.length > 0)
    : [];

  return {
    aiResponse: { en: aiEn, ko: aiKo },
    feedback: {
      rephrasedBetter,
      grammarNotes,
      ...(pronunciationTips ? { pronunciationTips } : {}),
    },
    newCompletedMissionIds,
    recommendedNextHints,
  };
}

function normalizeRoleplayReportPayload(raw: any, scenario: RoleplayScenario, missionScoreCalc: number): RoleplayReport {
  const clampScore = (val: unknown, fallback: number) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.min(100, Math.round(num)));
  };

  const strengths = Array.isArray(raw?.strengths)
    ? raw.strengths.map((s: unknown) => normalizeStringField(s, '', 240)).filter(Boolean).slice(0, 5)
    : [];
  const improvements = Array.isArray(raw?.improvements)
    ? raw.improvements.map((s: unknown) => normalizeStringField(s, '', 240)).filter(Boolean).slice(0, 5)
    : [];
  const highlightPhrases = Array.isArray(raw?.highlightPhrases)
    ? raw.highlightPhrases
        .slice(0, 6)
        .map((p: any) => ({
          en: normalizeStringField(p?.en, '', 240),
          ko: normalizeStringField(p?.ko, '', 240),
          tip: normalizeStringField(p?.tip, '', 240),
        }))
        .filter((p: { en: string }) => p.en.length > 0)
    : [];

  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    overallScore: clampScore(raw?.overallScore, 82),
    fluencyScore: clampScore(raw?.fluencyScore, 80),
    accuracyScore: clampScore(raw?.accuracyScore, 80),
    vocabularyScore: clampScore(raw?.vocabularyScore, 84),
    missionScore: clampScore(raw?.missionScore, missionScoreCalc),
    feedbackSummary: normalizeStringField(raw?.feedbackSummary, '롤플레잉 평가가 완료되었습니다.', 600),
    strengths,
    improvements,
    highlightPhrases,
  };
}

async function callPollinationsBrowser(
  prompt: string,
  systemInstruction: string,
  signal?: AbortSignal
): Promise<FreeAiGenerationResult> {
  if (Date.now() < browserPollinationsCooldownUntil) {
    throw new Error('Pollinations cooldown active');
  }

  const res = await fetch(POLLINATIONS_ENDPOINT, {
    method: 'POST',
    signal: combineSignals(12000, signal),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      private: true,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok || text.includes('Free limit reached') || text.includes('FREE_LIMIT')) {
    if (res.status === 402 || res.status === 429 || text.includes('Free limit reached')) {
      browserPollinationsCooldownUntil = Date.now() + 46_000;
    }
    throw new Error(`Pollinations unavailable (${res.status})`);
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Pollinations returned empty response');
  }

  return {
    text: trimmed,
    providerName: 'Pollinations AI (GPT-OSS 20B · 무료)',
    providerId: 'pollinations',
  };
}

async function callCloudflareFreeBrowser(
  prompt: string,
  systemInstruction: string,
  signal?: AbortSignal
): Promise<FreeAiGenerationResult> {
  const combinedPrompt = systemInstruction
    ? `${systemInstruction}\n\n${prompt}`
    : prompt;

  const res = await fetch(CLOUDFLARE_WORKERS_FREE_ENDPOINT, {
    method: 'POST',
    signal: combineSignals(11000, signal),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: combinedPrompt }),
  });

  if (!res.ok) {
    throw new Error(`Cloudflare Workers AI HTTP ${res.status}`);
  }

  const data = await res.json();
  let rawOutput = '';
  if (typeof data?.response === 'string') {
    rawOutput = data.response;
  } else if (data?.response && typeof data.response === 'object') {
    rawOutput = JSON.stringify(data.response);
  } else if (typeof data?.result === 'string') {
    rawOutput = data.result;
  }

  const trimmed = rawOutput.trim();
  if (!trimmed) {
    throw new Error('Cloudflare Workers AI returned empty response');
  }

  return {
    text: trimmed,
    providerName: `Cloudflare Workers AI (${sanitizeSafeText(data?.model || 'Llama 3.2', 40)} · 무료)`,
    providerId: 'cloudflare_free',
  };
}

async function callOvhCloudBrowser(
  prompt: string,
  systemInstruction: string,
  signal?: AbortSignal
): Promise<FreeAiGenerationResult> {
  const now = Date.now();
  let lastError: any = null;

  for (const model of OVHCLOUD_FREE_MODELS) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const cooldown = browserOvhCooldownUntil.get(model) || 0;
    if (now < cooldown) continue;

    try {
      const res = await fetch(OVHCLOUD_CHAT_ENDPOINT, {
        method: 'POST',
        signal: combineSignals(11000, signal),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: 1024,
          temperature: 0.35,
        }),
      });

      if (res.status === 429) {
        browserOvhCooldownUntil.set(model, Date.now() + 65_000);
        lastError = new Error(`OVHcloud ${model} rate limited (429)`);
        continue;
      }

      if (!res.ok) {
        lastError = new Error(`OVHcloud ${model} HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const rawContent = String(data?.choices?.[0]?.message?.content || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .trim();

      if (!rawContent) {
        lastError = new Error(`OVHcloud ${model} empty content`);
        continue;
      }

      return {
        text: rawContent,
        providerName: `OVHcloud EU AI (${model} · 무료)`,
        providerId: 'ovhcloud_free',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) throw err;
      lastError = err;
    }
  }

  throw lastError || new Error('OVHcloud 무료 티어 연결에 실패했습니다.');
}

async function callLlm7Browser(
  prompt: string,
  systemInstruction: string,
  signal?: AbortSignal
): Promise<FreeAiGenerationResult> {
  if (Date.now() < browserLlm7CooldownUntil) {
    throw new Error('LLM7 cooldown active');
  }

  let lastError: any = null;
  for (const model of LLM7_FREE_MODELS) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const res = await fetch(LLM7_CHAT_ENDPOINT, {
        method: 'POST',
        signal: combineSignals(11000, signal),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer unused',
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (res.status === 429) {
        browserLlm7CooldownUntil = Date.now() + 120_000;
        throw new Error('LLM7 free quota reached (429)');
      }

      if (!res.ok) {
        lastError = new Error(`LLM7 ${model} HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const rawContent = String(data?.choices?.[0]?.message?.content || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .trim();

      if (!rawContent) {
        lastError = new Error(`LLM7 ${model} empty content`);
        continue;
      }

      return {
        text: rawContent,
        providerName: `LLM7 Open AI (${sanitizeSafeText(data?.model || model, 32)} · 무료)`,
        providerId: 'llm7_free',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) throw err;
      lastError = err;
      if (String(err?.message || '').includes('quota')) break;
    }
  }

  throw lastError || new Error('LLM7 Open Gateway 연결에 실패했습니다.');
}

async function callChromeBuiltinAi(
  prompt: string,
  systemInstruction: string,
  signal?: AbortSignal
): Promise<FreeAiGenerationResult> {
  const g: any = typeof globalThis !== 'undefined' ? globalThis : {};
  const lmGlobal = g.LanguageModel || g.ai?.languageModel;

  if (!lmGlobal || typeof lmGlobal.create !== 'function') {
    throw new Error('현재 브라우저는 온디바이스 Gemini Nano(Prompt API)를 지원하지 않습니다.');
  }

  let session: any = null;
  try {
    if (typeof lmGlobal.availability === 'function') {
      const status = await lmGlobal.availability();
      if (status === 'unavailable') {
        throw new Error('기기에서 온디바이스 Gemini Nano 모델을 사용할 수 없습니다.');
      }
    }

    session = await lmGlobal.create({
      ...(systemInstruction ? { initialPrompts: [{ role: 'system', content: systemInstruction }] } : {}),
      signal,
    });
    const output = await session.prompt(prompt, { signal });
    const clean = String(output || '').trim();
    if (!clean) {
      throw new Error('온디바이스 AI가 빈 응답을 반환했습니다.');
    }

    return {
      text: clean,
      providerName: 'Chrome Built-in AI (Gemini Nano · 온디바이스 무료)',
      providerId: 'chrome_builtin',
    };
  } finally {
    try {
      session?.destroy?.();
    } catch {}
  }
}

function getBrowserProviderOrder(mode: AiEngineMode): BrowserFreeProviderId[] {
  switch (mode) {
    case 'ovhcloud_free':
      return ['ovhcloud_free', 'pollinations', 'cloudflare_free', 'llm7_free', 'chrome_builtin'];
    case 'pollinations':
      return ['pollinations', 'ovhcloud_free', 'cloudflare_free', 'llm7_free', 'chrome_builtin'];
    case 'cloudflare_free':
      return ['cloudflare_free', 'ovhcloud_free', 'pollinations', 'llm7_free', 'chrome_builtin'];
    case 'llm7_free':
      return ['llm7_free', 'ovhcloud_free', 'pollinations', 'cloudflare_free', 'chrome_builtin'];
    case 'chrome_builtin':
      return ['chrome_builtin'];
    default:
      return ['ovhcloud_free', 'pollinations', 'cloudflare_free', 'llm7_free', 'chrome_builtin'];
  }
}

async function callBrowserProviderById(
  provider: BrowserFreeProviderId,
  prompt: string,
  systemInstruction: string,
  signal?: AbortSignal
): Promise<FreeAiGenerationResult> {
  switch (provider) {
    case 'ovhcloud_free':
      return callOvhCloudBrowser(prompt, systemInstruction, signal);
    case 'pollinations':
      return callPollinationsBrowser(prompt, systemInstruction, signal);
    case 'cloudflare_free':
      return callCloudflareFreeBrowser(prompt, systemInstruction, signal);
    case 'llm7_free':
      return callLlm7Browser(prompt, systemInstruction, signal);
    case 'chrome_builtin':
      return callChromeBuiltinAi(prompt, systemInstruction, signal);
  }
}

/**
 * Browser-direct keyless AI call (uses user's own IP, works on Dev/CloudRun/GitHub Pages/APK).
 */
export async function generateBrowserFreeAiText(
  prompt: string,
  systemInstruction: string,
  preferredEngine?: AiEngineMode,
  signal?: AbortSignal
): Promise<FreeAiGenerationResult> {
  const mode = preferredEngine || getAiEngineMode();
  if (mode === 'gemini_byok' || mode === 'mlvoca' || mode === 'kilo_free') {
    throw new Error('Selected engine runs via server proxy');
  }

  const order = getBrowserProviderOrder(mode);

  let lastError: any = null;
  for (const provider of order) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      return await callBrowserProviderById(provider, prompt, systemInstruction, signal);
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) throw err;
      lastError = err;
    }
  }

  throw lastError || new Error('브라우저 무료 AI 연결에 실패했습니다.');
}

async function generateBrowserFreeAiJson<T>(
  prompt: string,
  systemInstruction: string,
  validate: (parsed: T) => boolean,
  preferredEngine?: AiEngineMode,
  signal?: AbortSignal
): Promise<{ data: T; providerName: string }> {
  const mode = preferredEngine || getAiEngineMode();
  if (mode === 'gemini_byok' || mode === 'mlvoca' || mode === 'kilo_free') {
    throw new Error('Selected engine runs via server proxy');
  }

  const order = getBrowserProviderOrder(mode);

  let lastError: any = null;
  for (const provider of order) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const result = await callBrowserProviderById(provider, prompt, systemInstruction, signal);
      const parsed = extractJsonFromAiText<T>(result.text);
      if (parsed && validate(parsed)) {
        return { data: parsed, providerName: result.providerName };
      }
      lastError = new Error(`${provider} JSON schema validation failed`);
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) throw err;
      lastError = err;
    }
  }

  throw lastError || new Error('무료 AI JSON 응답 생성에 실패했습니다.');
}

function shouldPreferBrowserFreeAi(): boolean {
  const mode = getAiEngineMode();
  const hasGeminiKey = Boolean(getUserGeminiKey().trim());
  if (mode === 'gemini_byok' || mode === 'mlvoca' || mode === 'kilo_free') return false;
  if (
    mode === 'ovhcloud_free' ||
    mode === 'pollinations' ||
    mode === 'cloudflare_free' ||
    mode === 'llm7_free' ||
    mode === 'chrome_builtin'
  ) {
    return true;
  }
  // auto_free: if user registered a Gemini key, let server run Gemini first; otherwise use browser-direct free AI (per-user IP!)
  return !hasGeminiKey;
}

/**
 * Live ping test for free keyless AI engines (used in ApiKeyModal).
 */
export async function testFreeAiConnection(
  engine: AiEngineMode
): Promise<{ success: boolean; providerName: string; latencyMs: number; message: string }> {
  const started = Date.now();
  try {
    if (engine === 'gemini_byok') {
      const userKey = getUserGeminiKey().trim();
      if (!userKey) {
        return {
          success: false,
          providerName: 'Gemini 키 전용',
          latencyMs: 0,
          message: '개인 Gemini API 키가 등록되지 않았습니다. 아래 입력란에 키를 입력해 주세요.',
        };
      }
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'x-ai-engine': 'gemini_byok', 'x-gemini-api-key': userKey },
        body: JSON.stringify({ text: 'resilience', context: 'connection test' }),
      });
      const data = await res.json().catch(() => ({}));
      const latencyMs = Date.now() - started;
      if (res.ok && data?.success && !data?.isFallback) {
        return {
          success: true,
          providerName: data.aiProvider || 'Personal Gemini Key',
          latencyMs,
          message: `연결 성공! 개인 Gemini API 키가 정상 동작합니다 (${latencyMs}ms)`,
        };
      }
      return {
        success: false,
        providerName: 'Gemini 키 전용',
        latencyMs,
        message: data?.error || '개인 Gemini API 키 검증에 실패했습니다.',
      };
    }

    if (engine === 'kilo_free' || engine === 'mlvoca') {
      const label = engine === 'kilo_free' ? 'Kilo AI Gateway' : 'MLVoca Open Ollama';
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'x-ai-engine': engine },
        body: JSON.stringify({ text: 'resilience', context: 'connection test' }),
      });
      const data = await res.json();
      const latencyMs = Date.now() - started;
      if (res.ok && data?.success && !data?.isFallback) {
        return {
          success: true,
          providerName: data.aiProvider || label,
          latencyMs,
          message: `연결 성공! [${data.aiProvider || label}] 응답 확인 (${latencyMs}ms)`,
        };
      }
      throw new Error(data?.error || `${label} 서버 연결 응답을 받지 못했습니다.`);
    }

    if (engine === 'chrome_builtin') {
      const result = await callChromeBuiltinAi(
        'Reply strictly with "OK" and one short Korean greeting.',
        'You are a connection test responder. Keep your answer under 15 words.'
      );
      const latencyMs = Date.now() - started;
      return {
        success: true,
        providerName: result.providerName,
        latencyMs,
        message: `온디바이스 AI 연결 성공! [${result.providerName}] (${latencyMs}ms)`,
      };
    }

    const result = await generateBrowserFreeAiText(
      'Reply strictly with "OK" and one short Korean greeting.',
      'You are a connection test responder. Keep your answer under 15 words.',
      engine
    );
    const latencyMs = Date.now() - started;
    return {
      success: true,
      providerName: result.providerName,
      latencyMs,
      message: `API 키 없이 연결 성공! [${result.providerName}] (${latencyMs}ms)`,
    };
  } catch (err: any) {
    if (engine === 'chrome_builtin' || engine === 'gemini_byok') {
      return {
        success: false,
        providerName: engine,
        latencyMs: Date.now() - started,
        message: err?.message || '온디바이스 AI가 현재 브라우저에서 지원되지 않습니다.',
      };
    }

    // Try server proxy fallback
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'x-ai-engine': engine },
        body: JSON.stringify({ text: 'hello', context: 'free ai check' }),
      });
      const data = await res.json();
      const latencyMs = Date.now() - started;
      if (res.ok && data?.success && !data?.isFallback) {
        return {
          success: true,
          providerName: data.aiProvider || '무료 AI 프록시',
          latencyMs,
          message: `서버 경유 무료 AI 연결 성공! [${data.aiProvider || 'Free AI'}] (${latencyMs}ms)`,
        };
      }
    } catch {}

    return {
      success: false,
      providerName: engine,
      latencyMs: Date.now() - started,
      message: err?.message || '무료 AI 연결 테스트에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    };
  }
}

/**
 * 1. Generate Vocab (Browser Free AI -> Server /api/ai/generate-vocab)
 */
export async function generateVocabWithFreeAi(params: {
  topic: string;
  count: number;
  difficulty: string;
}): Promise<{ items: any[]; aiProvider?: string; isFallback?: boolean }> {
  const { topic, count, difficulty } = params;
  const safeTopic = sanitizeSafeText(topic, 120);

  if (shouldPreferBrowserFreeAi()) {
    try {
      const prompt = `Topic: "${safeTopic}", Difficulty: "${difficulty}".
Generate ${count} practical English vocabulary expressions with natural Korean meanings and example sentences.
Output ONLY a raw JSON array of objects (no markdown) with keys:
[{"word":"...","ipa":"/.../","meaning":"순수 한국어 뜻","partOfSpeech":"n.","sentence":"English example sentence","sentenceMeaning":"자연스러운 한국어 번역","tip":"짧은 한국어 뉘앙스 팁"}]
Every "meaning" and "sentenceMeaning" MUST contain Korean Hangul.`;

      const { data, providerName } = await generateBrowserFreeAiJson<any>(
        prompt,
        'You are an English vocabulary teacher for Korean learners. Return strictly valid JSON array only. Meanings and translations must be written in natural Korean.',
        (payload) => {
          const arr = unwrapArrayFromAiPayload(payload, ['items', 'words', 'vocabulary', 'vocab', 'data']);
          return (
            Array.isArray(arr) &&
            arr.length > 0 &&
            arr.some((it) => typeof it?.word === 'string' && /[\uAC00-\uD7A3]/.test(String(it?.meaning || '')))
          );
        }
      );

      const unwrapped = unwrapArrayFromAiPayload(data, ['items', 'words', 'vocabulary', 'vocab', 'data']) || [];
      return { items: unwrapped.slice(0, count), aiProvider: providerName, isFallback: false };
    } catch {
      // Fallback to server proxy
    }
  }

  const res = await fetch('/api/ai/generate-vocab', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ topic: safeTopic, count, difficulty }),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'AI 단어 생성에 실패했습니다.');
  }
  return {
    items: data.items || [],
    aiProvider: data.aiProvider,
    isFallback: data.isFallback,
  };
}

/**
 * 2. Explain Expression / Word (Browser Free AI -> Server /api/ai/explain)
 */
export async function explainTextWithFreeAi(params: {
  text: string;
  context?: string;
}): Promise<{ explanation: string; aiProvider?: string; isFallback?: boolean }> {
  const safeText = sanitizeSafeText(params.text, 500);
  const safeContext = sanitizeSafeText(params.context || '', 300);

  if (shouldPreferBrowserFreeAi()) {
    try {
      const prompt = `영어 표현/문장: "${safeText}"
${safeContext ? `맥락: ${safeContext}` : ''}
한국인 영어 학습자를 위해 아래 4가지를 친절한 한국어 마크다운으로 알차고 간결하게 설명해주세요:
1. 발음 및 연음 포인트
2. 원어민 뉘앙스
3. 핵심 문법/어휘 포인트
4. 비슷한 대체 표현 2가지 (예문·한국어 뜻 포함)`;

      const result = await generateBrowserFreeAiText(
        prompt,
        '당신은 친절한 한국어 기반 영어 튜터입니다. 가독성 좋은 한국어 마크다운으로 답변하세요.'
      );
      if (/[\uAC00-\uD7A3]/.test(result.text)) {
        return { explanation: result.text, aiProvider: result.providerName, isFallback: false };
      }
    } catch {
      // Fallback to server proxy
    }
  }

  const res = await fetch('/api/ai/explain', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text: safeText, context: safeContext }),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || '해설 생성에 실패했습니다.');
  }
  return {
    explanation: data.explanation,
    aiProvider: data.aiProvider,
    isFallback: data.isFallback,
  };
}

/**
 * 3. Recommend Goals (Browser Free AI -> Server /api/ai/recommend-goals)
 */
export async function recommendGoalsWithFreeAi(params: {
  interest: string;
  timePerDay?: string;
}): Promise<{ goals: Partial<Goal>[]; aiProvider?: string; isFallback?: boolean }> {
  const safeInterest = sanitizeSafeText(params.interest, 120);
  const timePerDay = sanitizeSafeText(params.timePerDay || '30분', 40);

  if (shouldPreferBrowserFreeAi()) {
    try {
      const prompt = `관심사: "${safeInterest}", 하루 시간: "${timePerDay}".
실천 가능한 영어/자기계발 목표 4개를 JSON 배열로만 출력하세요:
[{"title":"목표 제목(한국어)","category":"영어","targetCount":5,"unit":"개","description":"짧은 한국어 팁"}]`;

      const { data, providerName } = await generateBrowserFreeAiJson<any>(
        prompt,
        'Return ONLY a valid JSON array of 4 measurable Korean study goals.',
        (payload) => {
          const arr = unwrapArrayFromAiPayload(payload, ['goals', 'recommendations', 'items', 'data']);
          return Array.isArray(arr) && arr.length > 0 && typeof arr[0]?.title === 'string';
        }
      );
      const unwrapped = unwrapArrayFromAiPayload(data, ['goals', 'recommendations', 'items', 'data']) || [];
      return { goals: unwrapped.slice(0, 4), aiProvider: providerName, isFallback: false };
    } catch {
      // Fallback to server proxy
    }
  }

  const res = await fetch('/api/ai/recommend-goals', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ interest: safeInterest, timePerDay }),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'AI 목표 추천에 실패했습니다.');
  }
  return {
    goals: data?.goals || [],
    aiProvider: data?.aiProvider,
    isFallback: data?.isFallback,
  };
}

/**
 * 4. Roleplay Conversation Turn (Browser Free AI -> Server /api/ai/roleplay/chat)
 */
export async function sendRoleplayTurnWithFreeAi(params: {
  scenario: RoleplayScenario;
  messages: RoleplayMessage[];
  userMessage: string;
  completedMissions: string[];
}): Promise<{
  aiResponse: { en: string; ko: string };
  feedback: { rephrasedBetter: string; grammarNotes: string; pronunciationTips?: string };
  newCompletedMissionIds: string[];
  recommendedNextHints: Array<{ en: string; ko: string }>;
  aiProvider?: string;
  isFallback?: boolean;
}> {
  const { scenario, messages, userMessage, completedMissions } = params;
  const safeUserMessage = sanitizeSafeText(userMessage, 600);

  if (shouldPreferBrowserFreeAi()) {
    try {
      const historyText = messages
        .slice(-6)
        .map((m) => `${m.sender === 'ai' ? scenario.partnerName : 'User'}: "${m.text}"`)
        .join('\n');

      const missionsText = (scenario.missions || [])
        .map((m) => `- ID "${m.id}": ${m.text} (${m.description})`)
        .join('\n');

      const prompt = `[Scenario] ${scenario.title} — You play "${scenario.partnerName}" (${scenario.partnerRole}). User plays "${scenario.userRole}".
Context: ${scenario.situationContext}
Missions:\n${missionsText}
Already completed IDs: ${JSON.stringify(completedMissions)}
Recent dialogue:\n${historyText}
User's latest line: "${safeUserMessage}"

Reply ONLY with raw valid JSON matching:
{
  "aiResponse": { "en": "1-2 natural spoken English sentences in character", "ko": "자연스러운 한국어 번역" },
  "feedback": { "rephrasedBetter": "more natural native English alternative", "grammarNotes": "1 concise Korean tip", "pronunciationTips": "short Korean pronunciation/linking tip" },
  "newCompletedMissionIds": ["mission-id-if-fulfilled"],
  "recommendedNextHints": [{ "en": "short user reply 1", "ko": "한국어 뜻" }, { "en": "short user reply 2", "ko": "한국어 뜻" }]
}`;

      const { data, providerName } = await generateBrowserFreeAiJson<any>(
        prompt,
        'You are a friendly native English roleplay partner & Korean tutor. Output strictly valid JSON only.',
        (parsed) =>
          Boolean(parsed?.aiResponse?.en) &&
          Boolean(parsed?.aiResponse?.ko) &&
          /[\uAC00-\uD7A3]/.test(String(parsed?.aiResponse?.ko || ''))
      );

      const normalized = normalizeRoleplayTurnPayload(data, safeUserMessage);
      return {
        ...normalized,
        aiProvider: providerName,
        isFallback: false,
      };
    } catch {
      // Fallback to server proxy
    }
  }

  const res = await fetch('/api/ai/roleplay/chat', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      scenario,
      messages,
      userMessage: safeUserMessage,
      completedMissions,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'AI 대화 응답 생성에 실패했습니다.');
  }
  const normalized = normalizeRoleplayTurnPayload(data, safeUserMessage);
  return {
    ...normalized,
    aiProvider: data.aiProvider,
    isFallback: data.isFallback,
  };
}

/**
 * 5. Roleplay Final Report (Browser Free AI -> Server /api/ai/roleplay/report)
 */
export async function generateRoleplayReportWithFreeAi(params: {
  scenario: RoleplayScenario;
  messages: RoleplayMessage[];
  completedMissions: string[];
}): Promise<{ report: RoleplayReport; aiProvider?: string; isFallback?: boolean }> {
  const { scenario, messages, completedMissions } = params;
  const totalMissions = scenario.missions?.length || 3;
  const missionScoreCalc = Math.round((completedMissions.length / totalMissions) * 100);

  if (shouldPreferBrowserFreeAi()) {
    try {
      const transcript = messages
        .slice(-20)
        .map((m) => `${m.sender === 'ai' ? scenario.partnerName : 'Learner'}: "${m.text}"`)
        .join('\n');

      const prompt = `Evaluate this English roleplay ("${scenario.title}", missions completed ${completedMissions.length}/${totalMissions}):
${transcript}

Output strictly valid JSON:
{
  "overallScore": 85,
  "fluencyScore": 84,
  "accuracyScore": 83,
  "vocabularyScore": 86,
  "missionScore": ${missionScoreCalc},
  "feedbackSummary": "따뜻하고 구체적인 한국어 총평 2문장",
  "strengths": ["한국어 강점 1", "한국어 강점 2"],
  "improvements": ["한국어 개선 팁 1", "한국어 개선 팁 2"],
  "highlightPhrases": [{"en":"key phrase","ko":"한국어 뜻","tip":"한국어 팁"}]
}`;

      const { data, providerName } = await generateBrowserFreeAiJson<any>(
        prompt,
        'You are an encouraging Korean-speaking English speaking evaluator. Output strictly valid JSON only.',
        (parsed) =>
          typeof parsed?.overallScore === 'number' &&
          typeof parsed?.feedbackSummary === 'string' &&
          /[\uAC00-\uD7A3]/.test(parsed.feedbackSummary)
      );

      return {
        report: normalizeRoleplayReportPayload(data, scenario, missionScoreCalc),
        aiProvider: providerName,
        isFallback: false,
      };
    } catch {
      // Fallback to server proxy
    }
  }

  const res = await fetch('/api/ai/roleplay/report', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ scenario, messages, completedMissions }),
  });
  const data = await res.json();
  if (!res.ok || !data?.success || !data?.report) {
    throw new Error(data?.error || '롤플레잉 리포트 생성에 실패했습니다.');
  }
  return {
    report: normalizeRoleplayReportPayload(data.report, scenario, missionScoreCalc),
    aiProvider: data.aiProvider,
    isFallback: data.isFallback,
  };
}

/**
 * 6. Custom Parent Nag Scripts (Browser Free AI -> Server /api/ai/generate-custom-nags)
 */
export async function generateCustomNagsWithFreeAi(params: {
  direction: string;
  customGeminiKey?: string;
}): Promise<{ scripts: any; aiProvider?: string; isFallback?: boolean }> {
  const safeDirection = sanitizeSafeText(params.direction, 300);
  const customKey = (params.customGeminiKey || '').trim();
  const mode = getAiEngineMode();

  if (!customKey && mode !== 'gemini_byok' && mode !== 'mlvoca' && mode !== 'kilo_free') {
    try {
      const prompt = `컨셉: "${safeDirection}"
엄마(mom)와 아빠(dad)의 3가지 톤(tsundere, strict, affectionate) 한국어 구어체 대본을 3상황(study_start, study_complete, study_delay)에 대해 JSON으로만 생성하세요:
{"study_start":{"mom":{"tsundere":"...","strict":"...","affectionate":"..."},"dad":{"tsundere":"...","strict":"...","affectionate":"..."}},"study_complete":{"mom":{"tsundere":"...","strict":"...","affectionate":"..."},"dad":{"tsundere":"...","strict":"...","affectionate":"..."}},"study_delay":{"mom":{"tsundere":"...","strict":"...","affectionate":"..."},"dad":{"tsundere":"...","strict":"...","affectionate":"..."}}}`;

      const { data, providerName } = await generateBrowserFreeAiJson<any>(
        prompt,
        '한국 부모님 컨셉 대본 작가입니다. 모든 대사는 자연스러운 한국어로 작성하고 오직 JSON만 반환하세요.',
        (p) => Boolean(p?.study_start?.mom?.tsundere && p?.study_complete?.dad?.affectionate && p?.study_delay?.mom?.strict)
      );
      return { scripts: data, aiProvider: providerName, isFallback: false };
    } catch {
      // Fallback to server proxy
    }
  }

  const headers = { ...getAuthHeaders() };
  if (customKey) {
    headers['x-gemini-api-key'] = customKey;
  }

  const res = await fetch('/api/ai/generate-custom-nags', {
    method: 'POST',
    headers,
    body: JSON.stringify({ direction: safeDirection }),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'AI 대본 생성에 실패했습니다.');
  }
  return {
    scripts: data.scripts,
    aiProvider: data.aiProvider,
    isFallback: data.isFallback,
  };
}

/**
 * 7. Phoneme-Level Pronunciation Correction Report (Text + Acoustic Hints via Browser Free AI when no Gemini Key)
 */
export async function generateFreeAiPhonemeReport(params: {
  targetText: string;
  recognizedText: string;
  localReport?: PronunciationCorrectionReport | null;
  signal?: AbortSignal;
}): Promise<PronunciationCorrectionReport> {
  const { targetText, recognizedText, localReport, signal } = params;
  const localHints = localReport
    ? localReport.phonemeItems
        .slice(0, 14)
        .map((p) => `${p.word}[${p.grapheme}] ${p.expectedIpa}->${p.spokenIpa} (${p.errorType}, score:${p.accuracyScore})`)
        .join('; ')
    : '';

  const prompt = `Analyze English pronunciation for Korean learner.
Target: "${targetText}", Recognized: "${recognizedText || '(none)'}", Hints: ${localHints || '(none)'}
Reply ONLY with compact valid JSON (max 3 phonemeItems, all feedback in Korean):
{"overallSummary":"<한국어 총평 1문장>","phonemeItems":[{"word":"<target word>","grapheme":"<letters>","expectedIpa":"/<ipa>/","spokenIpa":"/<ipa>/","errorType":"accurate|substitution|omission|distortion","severity":"good|moderate|critical","accuracyScore":75,"diagnosis":"<한국어 원인 1문장>","articulationCue":"<한국어 혀·입술 교정 팁>","mouthFocus":"interdental|alveolar|lips_teeth|bilabial|velar|retroflex_r|vowel_open|vowel_spread|glottal","minimalPairWord":"<contrast word>","minimalPairIpa":"/<ipa>/"}]}`;

  const { data, providerName } = await generateBrowserFreeAiJson<any>(
    prompt,
    '한국인 영어 학습자용 음소 발음 코치입니다. 마크다운 없이 유효한 JSON만 출력하고 overallSummary, diagnosis, articulationCue 값은 반드시 한국어로 작성하세요.',
    (parsed) => {
      const arr = unwrapArrayFromAiPayload(parsed, ['phonemeItems', 'phonemes', 'items', 'data']);
      return Boolean(arr && arr.length > 0 && typeof arr[0]?.word === 'string');
    },
    getAiEngineMode(),
    signal
  );

  const rawItems = unwrapArrayFromAiPayload(data, ['phonemeItems', 'phonemes', 'items', 'data']) || [];
  const items: PhonemeErrorItem[] = rawItems.slice(0, 14).map((item: any, idx: number) => ({
    id: `free-ai-ph-${idx}-${String(item.word || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    word: normalizeStringField(item.word, targetText, 80),
    grapheme: normalizeStringField(item.grapheme, '', 40),
    expectedIpa: normalizeStringField(item.expectedIpa, '/?/', 40),
    spokenIpa: normalizeStringField(item.spokenIpa || item.expectedIpa, '/?/', 40),
    errorType: ['accurate', 'substitution', 'omission', 'distortion', 'weak_stress'].includes(item.errorType)
      ? item.errorType
      : 'accurate',
    severity: ['good', 'moderate', 'critical'].includes(item.severity) ? item.severity : 'good',
    accuracyScore: Math.max(0, Math.min(100, Math.round(Number(item.accuracyScore) || 75))),
    diagnosis: normalizeStringField(item.diagnosis, '해당 음소의 발음 특성을 분석했습니다.', 260),
    articulationCue: normalizeStringField(item.articulationCue, '혀 위치와 입 모양에 집중해 천천히 발음해 보세요.', 260),
    mouthFocus: [
      'interdental',
      'alveolar',
      'lips_teeth',
      'bilabial',
      'velar',
      'retroflex_r',
      'vowel_open',
      'vowel_spread',
      'glottal',
    ].includes(item.mouthFocus)
      ? item.mouthFocus
      : 'alveolar',
    minimalPairWord: item.minimalPairWord ? normalizeStringField(item.minimalPairWord, '', 60) : undefined,
    minimalPairIpa: item.minimalPairIpa ? normalizeStringField(item.minimalPairIpa, '', 40) : undefined,
  }));

  let normalizedDrills = Array.isArray(data.practiceDrills)
    ? data.practiceDrills
        .slice(0, 3)
        .map((d: any) => ({
          pairA: normalizeStringField(d?.pairA, targetText, 60),
          pairB: normalizeStringField(d?.pairB, '', 60),
          focusIpa: normalizeStringField(d?.focusIpa, '', 40),
          tip: normalizeStringField(d?.tip, '유사 음소 차이에 주의하며 천천히 발음해 보세요.', 200),
        }))
        .filter((d: { pairA: string; pairB: string }) => d.pairA.length > 0 && d.pairB.length > 0)
    : [];

  if (normalizedDrills.length === 0) {
    normalizedDrills = items
      .filter((i) => i.minimalPairWord && i.word && i.minimalPairWord.toLowerCase() !== i.word.toLowerCase())
      .slice(0, 3)
      .map((i) => ({
        pairA: i.word,
        pairB: i.minimalPairWord!,
        focusIpa: `${i.expectedIpa} vs ${i.minimalPairIpa || i.spokenIpa}`,
        tip: i.articulationCue || '목표 음소와 대조 음소의 조음 위치 차이에 집중해 보세요.',
      }));
  }

  const criticalCount = items.filter((p) => p.severity === 'critical').length;
  const moderateCount = items.filter((p) => p.severity === 'moderate').length;
  const accurateCount = items.filter((p) => p.severity === 'good').length;

  return {
    source: 'ai',
    providerName,
    targetText,
    recognizedText: recognizedText || '',
    overallSummary: normalizeStringField(data.overallSummary, '무료 AI 음소 발음 분석이 완료되었습니다.', 500),
    phonemeItems: items,
    practiceDrills: normalizedDrills,
    stats: {
      totalCount: items.length,
      criticalCount,
      moderateCount,
      accurateCount,
    },
    generatedAt: new Date().toISOString(),
  };
}
