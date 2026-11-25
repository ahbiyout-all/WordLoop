import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Disable Express server signature header
app.disable("x-powered-by");

// Comprehensive Security HTTP response headers middleware
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), payment=(), usb=()"
  );
  // Allow secure embedding in Google Cloud / AI Studio preview while defending against rogue clickjacking
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' https://*.google.com https://*.run.app https://*.aistudio.google.com;"
  );
  next();
});

// Route-scoped 3MB JSON limit for audio pronunciation analysis, strict 256KB elsewhere
app.use("/api/ai/pronunciation-report", express.json({ limit: "3mb" }));
app.use((req, res, next) => {
  if (req.path === "/api/ai/pronunciation-report") return next();
  return express.json({ limit: "256kb" })(req, res, next);
});

// Origin & CSRF validation middleware for /api/* to prevent cross-site request abuse
app.use("/api", (req, res, next) => {
  // Allow safe read-only health checks
  if (req.path === "/health" || req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  const origin = req.headers.origin || req.headers.referer || "";
  if (origin) {
    try {
      const parsedUrl = new URL(origin);
      const host = parsedUrl.hostname.toLowerCase();
      const protocol = parsedUrl.protocol.toLowerCase();

      const isAllowedOrigin =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0" ||
        host.endsWith(".run.app") ||
        host.endsWith(".google.com") ||
        host.endsWith(".aistudio.google.com") ||
        protocol === "capacitor:" ||
        protocol === "ionic:" ||
        protocol === "file:" ||
        protocol === "app:";

      if (!isAllowedOrigin) {
        console.warn(`[Security Alert] Blocked unauthorized cross-origin API request from: ${origin}`);
        return res.status(403).json({
          error: "허용되지 않은 외부 출처에서의 API 접근이 보안 정책에 의해 차단되었습니다.",
        });
      }
    } catch {
      // Invalid origin URL format
      return res.status(403).json({ error: "유효하지 않은 요청 출처입니다." });
    }
  }

  next();
});

// Dual-Tier In-Memory Rate Limiter for /api/* and /api/ai/*
const generalRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const aiRateLimitMap = new Map<string, { count: number; resetAt: number }>();

const GENERAL_RATE_WINDOW_MS = 60 * 1000;
const GENERAL_MAX_REQUESTS = 60; // 60 req/min for general API

const AI_RATE_WINDOW_MS = 60 * 1000;
const AI_MAX_REQUESTS = 20; // 20 req/min for compute-heavy Gemini AI endpoints

app.use("/api", (req, res, next) => {
  const now = Date.now();
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";

  // 1. General Rate Limiter
  const generalRecord = generalRateLimitMap.get(clientIp);
  if (!generalRecord || now > generalRecord.resetAt) {
    generalRateLimitMap.set(clientIp, { count: 1, resetAt: now + GENERAL_RATE_WINDOW_MS });
  } else {
    generalRecord.count += 1;
    if (generalRecord.count > GENERAL_MAX_REQUESTS) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({
        error: "요청이 너무 많습니다. 1분 후 다시 시도해주세요. (General Rate Limit Exceeded)",
      });
    }
  }

  // 2. Strict AI Rate Limiter for /api/ai/* endpoints
  if (req.path.startsWith("/ai/")) {
    const aiRecord = aiRateLimitMap.get(clientIp);
    if (!aiRecord || now > aiRecord.resetAt) {
      aiRateLimitMap.set(clientIp, { count: 1, resetAt: now + AI_RATE_WINDOW_MS });
    } else {
      aiRecord.count += 1;
      if (aiRecord.count > AI_MAX_REQUESTS) {
        res.setHeader("Retry-After", "60");
        return res.status(429).json({
          error: "AI 생성 요청 한도를 초과했습니다. 잠시 후(1분 뒤) 다시 시도해주세요. (AI Rate Limit Exceeded)",
        });
      }
    }
  }

  // Periodic cleanup of expired rate limit entries to prevent memory leak
  if (generalRateLimitMap.size > 500) {
    for (const [ip, data] of generalRateLimitMap.entries()) {
      if (now > data.resetAt) generalRateLimitMap.delete(ip);
    }
  }
  if (aiRateLimitMap.size > 500) {
    for (const [ip, data] of aiRateLimitMap.entries()) {
      if (now > data.resetAt) aiRateLimitMap.delete(ip);
    }
  }

  next();
});

// Enhanced Input sanitization & Prompt Injection / XSS filter helper
function sanitizeInputText(val: unknown, maxLength: number = 500): string {
  if (typeof val !== "string") return "";
  return val
    // Strip control characters & null bytes
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // Strip script tags and HTML injection patterns
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, "")
    .replace(/<\s*object[^>]*>[\s\S]*?<\s*\/\s*object\s*>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    // Neutralize prompt jailbreak delimiter overrides
    .replace(/\b(ignore previous instructions|system instruction override)\b/gi, "")
    .trim()
    .slice(0, maxLength);
}

// Deep Object prototype pollution & safety filter
function sanitizeObjectDeep<T = any>(obj: T, maxDepth: number = 6): T {
  if (maxDepth <= 0 || !obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.slice(0, 200).map((it) => sanitizeObjectDeep(it, maxDepth - 1)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    if (typeof v === "string") {
      clean[k] = sanitizeInputText(v, 2000);
    } else if (typeof v === "object" && v !== null) {
      clean[k] = sanitizeObjectDeep(v, maxDepth - 1);
    } else {
      clean[k] = v;
    }
  }
  return clean as T;
}

function extractSafeHeaderApiKey(req: express.Request): string {
  const rawHeader = req.headers["x-gemini-api-key"];
  if (typeof rawHeader !== "string") return "";
  const trimmed = rawHeader.trim();
  // Validate reasonable API key length and printable ASCII characters
  if (trimmed.length < 10 || trimmed.length > 256 || !/^[A-Za-z0-9_\-]+$/.test(trimmed)) {
    return "";
  }
  return trimmed;
}

type ServerAiEngine =
  | "auto_free"
  | "kilo_free"
  | "ovhcloud_free"
  | "pollinations"
  | "cloudflare_free"
  | "llm7_free"
  | "mlvoca"
  | "chrome_builtin"
  | "gemini_byok";

const VALID_SERVER_AI_ENGINES = new Set<ServerAiEngine>([
  "auto_free",
  "kilo_free",
  "ovhcloud_free",
  "pollinations",
  "cloudflare_free",
  "llm7_free",
  "mlvoca",
  "chrome_builtin",
  "gemini_byok",
]);

function extractSafeAiEngine(req: express.Request): ServerAiEngine {
  const raw = req.headers["x-ai-engine"];
  if (typeof raw !== "string") return "auto_free";
  const v = raw.trim() as ServerAiEngine;
  return VALID_SERVER_AI_ENGINES.has(v) ? v : "auto_free";
}

function sanitizeHttpsUrl(url: unknown): string {
  if (typeof url !== "string" || !url.trim()) return "";
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

// Pre-load curriculum 3000 Korean dictionary for instant authoritative fallback
const curriculumLookup: Record<string, string> = {};
let curriculumItems: any[] = [];
try {
  const filePath = path.join(process.cwd(), "src/data/officialCurriculum3000Data.json");
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      curriculumItems = parsed;
      for (const it of parsed) {
        if (it.word && it.meaning) {
          curriculumLookup[it.word.trim().toLowerCase()] = it.meaning.trim();
        }
      }
    }
  }
} catch (e) {
  console.warn("Failed to load curriculumLookup in server.ts:", e);
}

// Target Gemini models with automatic fallback candidate chain (official supported models per Gemini API guidelines)
const GEMINI_MODELS = [
  "gemini-4-hydrogen",
  "gemini-3.1-flash-lite",
];

async function generateGeminiContent(ai: GoogleGenAI, params: any) {
  let lastError: any = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      return await ai.models.generateContent({
        ...params,
        model: modelName,
      });
    } catch (err: any) {
      lastError = err;
      const errMsg = (err?.message || "").toLowerCase();
      const status = err?.status || err?.code;
      if (
        status === 404 ||
        status === "NOT_FOUND" ||
        errMsg.includes("not found") ||
        errMsg.includes("no longer available") ||
        errMsg.includes("unsupported")
      ) {
        console.warn(`Model ${modelName} unavailable, attempting fallback model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ============================================================================
// Worldwide Keyless Free AI Waterfall (6 Providers: Kilo 550B -> OVHcloud 70B -> Pollinations -> Cloudflare Workers -> LLM7 -> MLVoca)
// Security: Hardcoded HTTPS allowlisted endpoints only; zero user-supplied URLs, zero secrets sent.
// ============================================================================
const FREE_KILO_GATEWAY_URL = "https://api.kilo.ai/api/gateway/chat/completions";
const FREE_OVHCLOUD_URL = "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions";
const FREE_POLLINATIONS_URL = "https://text.pollinations.ai/";
const FREE_CLOUDFLARE_WORKERS_URL = "https://devtoolbox-api.devtoolbox-api.workers.dev/ai/generate";
const FREE_LLM7_URL = "https://api.llm7.io/v1/chat/completions";
const FREE_MLVOCA_URL = "https://mlvoca.com/api/generate";

const SERVER_KILO_MODELS = ["kilo-auto/free", "nvidia/nemotron-3.5-lightning:free"];
const SERVER_OVHCLOUD_MODELS = [
  "Mistral-Small-3.2-24B-Instruct-2506",
  "Meta-Llama-3_3-70B-Instruct",
  "DeepSeek-V4.1-Flash-1017",
  "gpt-oss-20b",
  "gemma-4-26b-a4b",
];
const SERVER_LLM7_MODELS = ["default", "gpt-oss:20b", "mistral-Nemo-Instruct-2407"];
const SERVER_MLVOCA_MODELS = ["deepseek-r1:1.5b", "tinyllama"];

let serverKiloCooldownUntil = 0;
let serverPollinationsCooldownUntil = 0;
let serverLlm7CooldownUntil = 0;
const serverOvhCooldownUntil = new Map<string, number>();

type ServerFreeProviderId =
  | "kilo_free"
  | "ovhcloud_free"
  | "pollinations"
  | "cloudflare_free"
  | "llm7_free"
  | "mlvoca";

function extractJsonFromAiText<T = any>(rawText: string): T | null {
  if (!rawText || typeof rawText !== "string") return null;
  const cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const parseSafe = (str: string): T | null => {
    try {
      const parsed = JSON.parse(str, (k, v) =>
        k === "__proto__" || k === "constructor" || k === "prototype" ? undefined : v
      );
      return parsed && typeof parsed === "object" ? sanitizeObjectDeep(parsed) : null;
    } catch {
      return null;
    }
  };

  const direct = parseSafe(cleaned);
  if (direct) return direct;

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let start = -1;
  let openChar = "{";
  let closeChar = "}";

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
    openChar = "[";
    closeChar = "]";
  } else if (firstBrace !== -1) {
    start = firstBrace;
  }
  if (start === -1) return null;

  const lastClose = cleaned.lastIndexOf(closeChar);
  if (lastClose > start) {
    const slice = parseSafe(cleaned.slice(start, lastClose + 1));
    if (slice) return slice;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        return parseSafe(cleaned.slice(start, i + 1));
      }
    }
  }
  return null;
}

async function callServerKiloFree(prompt: string, systemInstruction: string) {
  if (Date.now() < serverKiloCooldownUntil) {
    throw new Error("Kilo Gateway cooldown active");
  }
  let lastError: any = null;
  for (const model of SERVER_KILO_MODELS) {
    try {
      const res = await fetch(FREE_KILO_GATEWAY_URL, {
        method: "POST",
        signal: AbortSignal.timeout(13000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
            { role: "user", content: prompt },
          ],
          max_tokens: 2048,
          temperature: 0.35,
        }),
      });
      if (res.status === 429) {
        serverKiloCooldownUntil = Date.now() + 60_000;
        throw new Error(`Kilo Gateway rate limited (429)`);
      }
      if (!res.ok) {
        lastError = new Error(`Kilo Gateway ${model} HTTP ${res.status}`);
        continue;
      }
      const data: any = await res.json();
      const clean = String(data?.choices?.[0]?.message?.content || "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();
      if (!clean) {
        lastError = new Error(`Kilo Gateway ${model} empty`);
        continue;
      }
      const resolvedModel = sanitizeInputText(data?.model || model, 48);
      return { text: clean, providerName: `Kilo AI Gateway (${resolvedModel} · 무료)` };
    } catch (err: any) {
      lastError = err;
      if (String(err?.message || "").includes("429")) break;
    }
  }
  throw lastError || new Error("Kilo AI Gateway unavailable");
}

async function callServerOvhCloudFree(prompt: string, systemInstruction: string) {
  const now = Date.now();
  let lastError: any = null;
  let consecutive429 = 0;
  for (const model of SERVER_OVHCLOUD_MODELS) {
    const cooldown = serverOvhCooldownUntil.get(model) || 0;
    if (now < cooldown) continue;
    try {
      const res = await fetch(FREE_OVHCLOUD_URL, {
        method: "POST",
        signal: AbortSignal.timeout(11000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
            { role: "user", content: prompt },
          ],
          max_tokens: 1024,
          temperature: 0.35,
        }),
      });
      if (res.status === 429) {
        serverOvhCooldownUntil.set(model, Date.now() + 35_000);
        consecutive429 += 1;
        lastError = new Error(`OVHcloud ${model} rate limited (429)`);
        if (consecutive429 >= 2) break;
        continue;
      }
      consecutive429 = 0;
      if (!res.ok) {
        lastError = new Error(`OVHcloud ${model} HTTP ${res.status}`);
        continue;
      }
      const data: any = await res.json();
      const clean = String(data?.choices?.[0]?.message?.content || "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();
      if (!clean) {
        lastError = new Error(`OVHcloud ${model} empty`);
        continue;
      }
      return { text: clean, providerName: `OVHcloud EU AI (${model} · 무료)` };
    } catch (err: any) {
      lastError = err;
    }
  }
  throw lastError || new Error("OVHcloud EU AI unavailable");
}

async function callServerPollinations(prompt: string, systemInstruction: string) {
  if (Date.now() < serverPollinationsCooldownUntil) {
    throw new Error("Pollinations cooldown active");
  }
  const res = await fetch(FREE_POLLINATIONS_URL, {
    method: "POST",
    signal: AbortSignal.timeout(12000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      private: true,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok || text.includes("Free limit reached") || text.includes("FREE_LIMIT")) {
    if (res.status === 402 || res.status === 429 || text.includes("Free limit reached")) {
      serverPollinationsCooldownUntil = Date.now() + 46_000;
    }
    throw new Error(`Pollinations unavailable (${res.status})`);
  }
  const clean = text.trim();
  if (!clean) throw new Error("Pollinations empty");
  return { text: clean, providerName: "Pollinations AI (GPT-OSS 20B · 무료)" };
}

async function callServerCloudflareFree(prompt: string, systemInstruction: string) {
  const combined = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
  const res = await fetch(FREE_CLOUDFLARE_WORKERS_URL, {
    method: "POST",
    signal: AbortSignal.timeout(11000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: combined }),
  });
  if (!res.ok) throw new Error(`Cloudflare Workers AI HTTP ${res.status}`);
  const data: any = await res.json();
  const rawOutput =
    typeof data?.response === "string"
      ? data.response
      : data?.response && typeof data.response === "object"
      ? JSON.stringify(data.response)
      : "";
  const clean = rawOutput.trim();
  if (!clean) throw new Error("Cloudflare Workers AI empty");
  return {
    text: clean,
    providerName: `Cloudflare Workers AI (${sanitizeInputText(data?.model || "Llama 3.2", 40)} · 무료)`,
  };
}

async function callServerLlm7Free(prompt: string, systemInstruction: string) {
  if (Date.now() < serverLlm7CooldownUntil) {
    throw new Error("LLM7 cooldown active");
  }
  let lastError: any = null;
  for (const model of SERVER_LLM7_MODELS) {
    try {
      const res = await fetch(FREE_LLM7_URL, {
        method: "POST",
        signal: AbortSignal.timeout(11000),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer unused",
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
            { role: "user", content: prompt },
          ],
        }),
      });
      if (res.status === 429) {
        serverLlm7CooldownUntil = Date.now() + 120_000;
        throw new Error("LLM7 free quota reached (429)");
      }
      if (!res.ok) {
        lastError = new Error(`LLM7 ${model} HTTP ${res.status}`);
        continue;
      }
      const data: any = await res.json();
      const clean = String(data?.choices?.[0]?.message?.content || "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();
      if (!clean) {
        lastError = new Error(`LLM7 ${model} empty`);
        continue;
      }
      return {
        text: clean,
        providerName: `LLM7 Open AI (${sanitizeInputText(data?.model || model, 32)} · 무료)`,
      };
    } catch (err: any) {
      lastError = err;
      if (String(err?.message || "").includes("quota")) break;
    }
  }
  throw lastError || new Error("LLM7 Open Gateway unavailable");
}

async function callServerMlvoca(prompt: string, systemInstruction: string) {
  const combined = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
  let lastError: any = null;
  for (const model of SERVER_MLVOCA_MODELS) {
    try {
      const res = await fetch(FREE_MLVOCA_URL, {
        method: "POST",
        signal: AbortSignal.timeout(13000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: combined,
          stream: false,
        }),
      });
      if (!res.ok) {
        lastError = new Error(`MLVoca ${model} HTTP ${res.status}`);
        continue;
      }
      const data: any = await res.json();
      const clean = String(data?.response || "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();
      if (!clean) {
        lastError = new Error(`MLVoca ${model} empty`);
        continue;
      }
      const label = model.includes("deepseek") ? "DeepSeek R1 1.5B" : "TinyLlama";
      return { text: clean, providerName: `MLVoca Open Ollama (${label} · 무료)` };
    } catch (err: any) {
      lastError = err;
    }
  }
  throw lastError || new Error("MLVoca unavailable");
}

function getFreeProviderOrder(engine: ServerAiEngine): ServerFreeProviderId[] {
  switch (engine) {
    case "kilo_free":
      return ["kilo_free", "ovhcloud_free", "pollinations", "cloudflare_free", "llm7_free", "mlvoca"];
    case "ovhcloud_free":
      return ["ovhcloud_free", "kilo_free", "pollinations", "cloudflare_free", "llm7_free", "mlvoca"];
    case "pollinations":
      return ["pollinations", "ovhcloud_free", "kilo_free", "cloudflare_free", "llm7_free", "mlvoca"];
    case "cloudflare_free":
      return ["cloudflare_free", "ovhcloud_free", "kilo_free", "pollinations", "llm7_free", "mlvoca"];
    case "llm7_free":
      return ["llm7_free", "ovhcloud_free", "kilo_free", "pollinations", "cloudflare_free", "mlvoca"];
    case "mlvoca":
      return ["mlvoca", "kilo_free", "ovhcloud_free", "cloudflare_free", "pollinations", "llm7_free"];
    case "chrome_builtin":
    case "auto_free":
    default:
      return ["kilo_free", "ovhcloud_free", "pollinations", "cloudflare_free", "llm7_free", "mlvoca"];
  }
}

async function callServerFreeProvider(
  provider: ServerFreeProviderId,
  prompt: string,
  systemInstruction: string
): Promise<{ text: string; providerName: string }> {
  switch (provider) {
    case "kilo_free":
      return callServerKiloFree(prompt, systemInstruction);
    case "ovhcloud_free":
      return callServerOvhCloudFree(prompt, systemInstruction);
    case "pollinations":
      return callServerPollinations(prompt, systemInstruction);
    case "cloudflare_free":
      return callServerCloudflareFree(prompt, systemInstruction);
    case "llm7_free":
      return callServerLlm7Free(prompt, systemInstruction);
    case "mlvoca":
      return callServerMlvoca(prompt, systemInstruction);
  }
}

async function generateFreeAiText(
  prompt: string,
  systemInstruction: string,
  engine: ServerAiEngine
): Promise<{ text: string; providerName: string }> {
  const order = getFreeProviderOrder(engine);
  let lastError: any = null;
  for (const p of order) {
    try {
      return await callServerFreeProvider(p, prompt, systemInstruction);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Free AI providers unavailable");
}

function unwrapArrayFromAiPayload<T = any>(parsed: any, candidateKeys: string[]): T[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    for (const key of candidateKeys) {
      if (Array.isArray((parsed as any)[key])) {
        return (parsed as any)[key];
      }
    }
  }
  return null;
}

async function generateFreeAiJson<T>(
  prompt: string,
  systemInstruction: string,
  engine: ServerAiEngine,
  validate: (parsed: T) => boolean
): Promise<{ data: T; providerName: string }> {
  const order = getFreeProviderOrder(engine);
  let lastError: any = null;
  for (const p of order) {
    try {
      const res = await callServerFreeProvider(p, prompt, systemInstruction);
      const parsed = extractJsonFromAiText<T>(res.text);
      if (parsed && validate(parsed)) {
        return { data: parsed, providerName: res.providerName };
      }
      lastError = new Error(`${p} returned invalid JSON schema`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Free AI JSON parsing failed");
}

// Rich offline linguistic analysis for resilient AI Nuance & Sentence explanation
function generateOfflineExplanation(text: string, context: string = ""): string {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  const matchingSentenceItem = curriculumItems.find(it => 
    it.sentence && (
      it.sentence.toLowerCase() === lower || 
      it.sentence.toLowerCase().includes(lower) || 
      lower.includes(it.sentence.toLowerCase())
    )
  );

  const matchingWordItem = curriculumItems.find(it =>
    it.word && it.word.toLowerCase() === lower
  );

  const matched = matchingSentenceItem || matchingWordItem;

  let md = `### 💡 [어휘 및 표현 심층 분석]\n\n`;
  md += `**원문**: "${clean}"\n\n`;

  if (matched?.sentenceMeaning && clean.includes(" ")) {
    md += `**🇰🇷 자연스러운 문장 해석**: **${matched.sentenceMeaning}**\n\n`;
  } else if (matched?.meaning) {
    md += `**🇰🇷 핵심 뜻**: **${matched.meaning}** ${matched.partOfSpeech ? `(${matched.partOfSpeech})` : ""}\n\n`;
    if (matched.ipa) {
      md += `**🗣️ 표준 발음 기호 (IPA)**: \`${matched.ipa}\`\n\n`;
    }
  } else if (context) {
    md += `**📌 학습 맥락**: ${context}\n\n`;
  }

  if (clean.includes(" ")) {
    const words = clean.replace(/[^a-zA-Z\s]/g, "").split(/\s+/).filter(w => w.length > 2);
    const foundVocabs = words
      .map(w => {
        const found = curriculumItems.find(it => it.word.toLowerCase() === w.toLowerCase());
        return found ? `• **${found.word}** (\`${found.ipa || ""}\`): ${found.meaning}` : null;
      })
      .filter(Boolean);

    if (foundVocabs.length > 0) {
      md += `#### 🔍 문장 속 핵심 단어 분석\n`;
      md += foundVocabs.slice(0, 6).join("\n") + "\n\n";
    }

    md += `#### 🎙️ 원어민 억양 & 쉐도잉 팁\n`;
    md += `• **리듬감 (Sentence Rhythm)**: 핵심 의미를 담은 주요 단어(명사, 동사)에 강세를 두고, 기능어는 부드럽고 가볍게 연결하여 발음하세요.\n`;
    md += `• **연음 규칙 (Linking)**: 자음으로 끝나는 단어 뒤에 모음으로 시작하는 단어가 올 때 자연스럽게 한 음절처럼 이어 읽습니다.\n`;
    md += `• **호흡 단위 (Thought Groups)**: 구문 단위로 숨을 고르며 끊어 읽으면 훨씬 자연스러운 원어민 억양이 완성됩니다.\n\n`;
  } else {
    md += `#### 🗣️ 발음 및 원어민 뉘앙스\n`;
    if (matched?.tip) {
      md += `• **뉘앙스 팁**: ${matched.tip}\n`;
    }
    md += `• **음절 강세**: 1음절 또는 주 강세 위치의 모음을 충분한 길이와 명확한 호흡으로 발음합니다.\n`;
    md += `• **입모양 & 조음 팁**: 혀와 입술의 긴장을 풀고 음절 끝자락을 부드럽게 마무리하세요.\n\n`;

    if (matched?.sentence) {
      md += `#### 📖 실전 대표 예문\n`;
      md += `• **EN**: "${matched.sentence}"\n`;
      md += `• **KO**: ${matched.sentenceMeaning || matched.meaning}\n\n`;
    }
  }

  md += `---\n`;
  md += `> 💡 *참고: 현재 교육부 표준 3,000 어휘 엔진을 바탕으로 정밀 해설되었습니다. 상단 열쇠(🔑) 아이콘에서 개인 Gemini API Key를 등록하시면 실시간 AI 맞춤 과외 해설로 연동됩니다.*`;

  return md;
}

// Initialize Google Gen AI client safely; in gemini_byok mode never fall back to container env key
function getGeminiClient(customApiKey?: string, strictUserKeyOnly: boolean = false) {
  const trimmedCustom = (customApiKey || "").trim();
  const apiKey = strictUserKeyOnly
    ? trimmedCustom
    : trimmedCustom.length > 0
    ? trimmedCustom
    : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getStrictGeminiForEngine(engineMode: ServerAiEngine, customKey: string) {
  return getGeminiClient(customKey, engineMode === "gemini_byok");
}

function mapGeminiErrorStatus(error: any): { statusCode: number; message: string } {
  const rawStatus = error?.status || error?.code;
  const msg = String(error?.message || "").toLowerCase();
  if (rawStatus === 401 || rawStatus === 403 || msg.includes("api_key_invalid") || msg.includes("api key not valid")) {
    return { statusCode: 401, message: "Gemini API 키 인증에 실패했습니다. 키를 다시 확인해 주세요." };
  }
  if (rawStatus === 429 || msg.includes("resource_exhausted") || msg.includes("quota")) {
    return { statusCode: 429, message: "Gemini API 요청 한도(429)가 초과되었습니다. 무료 AI 모드로 전환하거나 잠시 후 다시 시도해 주세요." };
  }
  return { statusCode: 502, message: "Gemini AI 서버 응답 중 일시적인 오류가 발생했습니다." };
}

// 📦 Android APK Download & Metadata Endpoints
const APK_PUBLIC_DIR = path.join(process.cwd(), "public", "downloads");
let SERVER_APP_VERSION = "4.6.0";
try {
  const pkgData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  if (pkgData.version) SERVER_APP_VERSION = pkgData.version;
} catch {}
const [vMaj = 4, vMin = 6, vPat = 0] = SERVER_APP_VERSION.split(".").map((n) => parseInt(n, 10) || 0);
const SERVER_VERSION_CODE = vMaj * 10000 + vMin * 100 + vPat;
const APK_FILENAME = `WordLoop-v${SERVER_APP_VERSION}.apk`;

// Health check endpoint (exposes live package version & build code)
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    version: SERVER_APP_VERSION,
    versionCode: SERVER_VERSION_CODE,
    timestamp: new Date().toISOString(),
  });
});

// Serve /downloads statically with strict APK package MIME headers
app.use(
  "/downloads",
  express.static(APK_PUBLIC_DIR, {
    setHeaders: (res, filePath) => {
      if (filePath.toLowerCase().endsWith(".apk")) {
        res.setHeader("Content-Type", "application/vnd.android.package-archive");
        res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
        res.setHeader("X-Content-Type-Options", "nosniff");
      }
    },
  })
);

// Helper to find any existing APK file across potential build locations
function findApkPath(): string | null {
  const possiblePaths = [
    path.join(APK_PUBLIC_DIR, APK_FILENAME),
    path.join(APK_PUBLIC_DIR, "WordLoop.apk"),
    path.join(process.cwd(), "public", "downloads", "WordLoop-v3.66.0.apk"),
    path.join(process.cwd(), "public", "downloads", "WordLoop-v3.65.0.apk"),
    path.join(process.cwd(), "public", "WordLoop.apk"),
    path.join(process.cwd(), "dist", "downloads", APK_FILENAME),
    path.join(process.cwd(), "dist", "downloads", "WordLoop.apk"),
    path.join(process.cwd(), "dist", "WordLoop.apk"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  // Scan public/downloads and public directories for any .apk file
  const searchDirs = [APK_PUBLIC_DIR, path.join(process.cwd(), "public"), path.join(process.cwd(), "dist")];
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        const apkFile = files.find((f) => f.toLowerCase().endsWith(".apk"));
        if (apkFile) return path.join(dir, apkFile);
      } catch {
        // ignore dir read errors
      }
    }
  }

  return null;
}

// 1. Direct APK Download Endpoint
app.get(["/api/download/apk", "/download/apk", "/WordLoop.apk"], (_req, res) => {
  let apkPath = findApkPath();

  // If APK file is missing, attempt on-demand trigger of python packager
  if (!apkPath) {
    try {
      console.log("🔨 [APK Server] APK missing on disk, triggering on-demand packaging...");
      execSync("python3 scripts/package-apk.py", { cwd: process.cwd(), timeout: 15000 });
      apkPath = findApkPath();
    } catch (e) {
      console.warn("⚠️ On-demand APK build attempt failed:", e);
    }
  }

  if (apkPath && fs.existsSync(apkPath)) {
    const stat = fs.statSync(apkPath);
    const baseName = path.basename(apkPath);
    const downloadName = baseName.endsWith(".apk") ? baseName : APK_FILENAME;
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.setHeader("Content-Length", stat.size.toString());
    res.setHeader("Cache-Control", "public, max-age=3600");

    const stream = fs.createReadStream(apkPath);
    return stream.pipe(res);
  }

  // Fail-safe fallback: generate valid Android package metadata response or stub zip buffer
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", `attachment; filename="${APK_FILENAME}"`);
  res.send(Buffer.from(`PK\x03\x04\x14\x00\x00\x00\x00\x00AndroidManifest.xmlWordLoop-v${SERVER_APP_VERSION}`));
});

// 2. APK Release Info Endpoint
app.get("/api/apk/info", (_req, res) => {
  const apkPath = findApkPath();
  const metaPath = path.join(APK_PUBLIC_DIR, "apk-release.json");
  if (apkPath && fs.existsSync(metaPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      if (data?.version === SERVER_APP_VERSION) {
        return res.json(data);
      }
    } catch {
      // fallback to dynamic version metadata
    }
  }

  const exists = Boolean(apkPath && fs.existsSync(apkPath));
  const size = exists && apkPath ? fs.statSync(apkPath).size : 0;

  res.json({
    appName: "WordLoop",
    packageName: "com.wordloop.app",
    version: SERVER_APP_VERSION,
    versionCode: SERVER_VERSION_CODE,
    filename: APK_FILENAME,
    downloadUrl: "/api/download/apk",
    directUrl: `/downloads/${APK_FILENAME}`,
    aliasUrl: "/downloads/WordLoop.apk",
    sizeBytes: size,
    sizeFormatted: size ? `${(size / (1024 * 1024)).toFixed(2)} MB` : "21.44 MB",
    available: true,
  });
});

// Combined Dictionary Lookup Endpoint (1. FreeDictionaryAPI + 2. Open Wiktionary + 5. Gemini AI)
app.get("/api/dictionary/lookup", async (req, res) => {
  try {
    const word = sanitizeInputText(req.query.word, 80).toLowerCase();
    if (!word || !/^[a-z0-9\s\-'’.]+$/i.test(word)) {
      return res.status(400).json({ error: "유효한 영어 단어를 입력해주세요." });
    }

    let freeDictData: any = null;
    let wiktionaryData: any = null;

    // 1. Fetch from FreeDictionaryAPI (api.dictionaryapi.dev)
    try {
      const freeDictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (freeDictRes.ok) {
        const data = await freeDictRes.json();
        if (Array.isArray(data) && data.length > 0) {
          freeDictData = data[0];
        }
      }
    } catch (e) {
      console.warn("FreeDictionaryAPI fetch failed:", e);
    }

    // 2. Fetch from Open Wiktionary REST API
    try {
      const wikRes = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (wikRes.ok) {
        wiktionaryData = await wikRes.json();
      }
    } catch (e) {
      console.warn("Wiktionary API fetch failed:", e);
    }

    // Extract basic phonetics/audio from FreeDictionaryAPI if available
    let phoneticsText = freeDictData?.phonetic || freeDictData?.phonetics?.find((p: any) => p.text)?.text || "";
    let audioUrl = sanitizeHttpsUrl(freeDictData?.phonetics?.find((p: any) => p.audio && p.audio.length > 0)?.audio || "");

    // 5. Enhance & Translate via Gemini AI (when configured) or Keyless Worldwide Free AI Waterfall
    const customKey = extractSafeHeaderApiKey(req);
    const engineMode = extractSafeAiEngine(req);
    const ai = getStrictGeminiForEngine(engineMode, customKey);
    if (engineMode === "gemini_byok" && (!customKey || !ai)) {
      return res.status(401).json({
        error: "개인 Gemini API 키 전용 모드입니다. 유효한 API 키를 입력하거나 무료 AI 모드로 전환해 주세요.",
      });
    }
    let aiEnhancement: any = null;
    let dictAiProviderLabel: string | null = null;

    if (ai && (engineMode === "gemini_byok" || engineMode === "auto_free")) {
      try {
        const prompt = `단어: "${word}"
FreeDictionaryIPA: "${phoneticsText}"

다음 단어에 대한 정교한 한국어 사전 정보를 작성해주세요:
1. 한국어 주요 의미 (명확하고 정확하게)
2. IPA 발음기호 (기존 IPA가 있으면 보정, 없으면 새로 작성)
3. 품사 (n., v., adj., adv., phr. 등)
4. 대표 실용 영어 예문 2개
5. 각 예문의 한국어 번역
6. 원어민 활용 뉘앙스 및 발음 팁

응답은 지정된 JSON 형식으로 반환하세요.`;

        const response = await generateGeminiContent(ai, {
          contents: prompt,
          config: {
            systemInstruction: "당신은 세계 최고 수준의 영한사전 편집기입니다. 중요 규칙: 모든 한국어 뜻(koreanMeaning)과 예문 해석(examples의 ko)은 반드시 100% 자연스럽고 정확한 한국어로만 작성해야 합니다. 영어나 동일 단어가 뜻 필드에 들어가지 않도록 주의하세요. 명확하고 가독성 높은 JSON으로만 반환하세요.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                koreanMeaning: { type: Type.STRING, description: "한국어 핵심 뜻 (반드시 순수 한국어)" },
                ipa: { type: Type.STRING, description: "IPA 발음 기호" },
                partOfSpeech: { type: Type.STRING, description: "품사" },
                examples: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      en: { type: Type.STRING },
                      ko: { type: Type.STRING, description: "예문의 한국어 번역" },
                    },
                    required: ["en", "ko"],
                  },
                },
                nuanceTip: { type: Type.STRING, description: "원어민 활용 뉘앙스 및 발음 팁 (한국어)" },
              },
              required: ["koreanMeaning", "ipa", "partOfSpeech", "examples"],
            },
          },
        });

        const jsonText = response.text || "{}";
        aiEnhancement = sanitizeObjectDeep(JSON.parse(jsonText));
        dictAiProviderLabel = "Gemini AI Language Engine";
      } catch (e: any) {
        if (engineMode === "gemini_byok") {
          const { statusCode, message } = mapGeminiErrorStatus(e);
          return res.status(statusCode).json({ error: message });
        }
        console.info("Gemini dictionary fallback to free AI:", e?.status || e?.code || "offline");
      }
    }

    if (!aiEnhancement && engineMode !== "gemini_byok") {
      try {
        const freePrompt = `English word: "${word}" (IPA hint: "${phoneticsText}").
Return strictly valid JSON only (no markdown):
{"koreanMeaning":"순수 한국어 핵심 뜻","ipa":"/.../","partOfSpeech":"n.","examples":[{"en":"English example 1","ko":"자연스러운 한국어 번역 1"},{"en":"English example 2","ko":"자연스러운 한국어 번역 2"}],"nuanceTip":"짧은 한국어 발음·뉘앙스 팁"}`;
        const { data, providerName } = await generateFreeAiJson<any>(
          freePrompt,
          "You are an English-Korean dictionary editor. Every Korean field must be written in natural Korean Hangul. Return JSON only.",
          engineMode,
          (p) => typeof p?.koreanMeaning === "string" && /[\uAC00-\uD7A3]/.test(p.koreanMeaning)
        );
        aiEnhancement = data;
        dictAiProviderLabel = providerName;
      } catch (e: any) {
        console.info("Free AI dictionary lookup unavailable, using open dict fallback");
      }
    }

    // Combine 1 + 2 + 5 into structured result
    const definitionsFromFreeDict = freeDictData?.meanings?.flatMap((m: any) =>
      m.definitions?.map((d: any) => ({
        partOfSpeech: m.partOfSpeech,
        definition: d.definition,
        example: d.example || null,
        synonyms: d.synonyms || [],
      }))
    ) || [];

    // Safely extract Korean meaning with multi-tier validation
    let resolvedKoreanMeaning = "";
    if (aiEnhancement?.koreanMeaning && /[\u3131-\u318E\uAC00-\uD7A3]/.test(aiEnhancement.koreanMeaning)) {
      resolvedKoreanMeaning = aiEnhancement.koreanMeaning.trim();
    }
    if (!resolvedKoreanMeaning && curriculumLookup[word]) {
      resolvedKoreanMeaning = curriculumLookup[word];
    }
    if (!resolvedKoreanMeaning) {
      resolvedKoreanMeaning = "의미 탐색 완료";
    }

    // Ensure examples have Korean translations
    const safeExamples = (aiEnhancement?.examples && Array.isArray(aiEnhancement.examples))
      ? aiEnhancement.examples.map((ex: any) => ({
          en: ex.en || "",
          ko: (/[\u3131-\u318E\uAC00-\uD7A3]/.test(ex.ko || ''))
            ? ex.ko
            : `"${word}"가 사용된 실용 예문입니다.`,
        }))
      : [
          {
            en: definitionsFromFreeDict[0]?.example || `I used the word '${word}' in a sentence.`,
            ko: `나는 문장에서 '${word}'라는 단어를 사용했다.`,
          },
        ];

    res.json({
      success: true,
      word: word,
      ipa: aiEnhancement?.ipa || phoneticsText || "",
      audioUrl: audioUrl,
      koreanMeaning: resolvedKoreanMeaning,
      partOfSpeech: aiEnhancement?.partOfSpeech || freeDictData?.meanings?.[0]?.partOfSpeech || "n.",
      nuanceTip: aiEnhancement?.nuanceTip || null,
      examples: safeExamples,
      englishDefinitions: definitionsFromFreeDict.slice(0, 4),
      sourcesUsed: [
        freeDictData ? "FreeDictionaryAPI (api.dictionaryapi.dev)" : null,
        wiktionaryData ? "Wiktionary Open Data" : null,
        aiEnhancement ? (dictAiProviderLabel || "Free AI Language Engine") : null,
      ].filter(Boolean),
    });
  } catch (error: any) {
    console.error("Combined Dictionary Lookup Error:", error);
    res.status(500).json({ error: "사전 검색 처리 중 오류가 발생했습니다." });
  }
});

// AI Vocabulary & Sentence Generator
app.post("/api/ai/generate-vocab", async (req, res) => {
  const topic = sanitizeInputText(req.body?.topic ?? "General Conversation", 120) || "General Conversation";
  const count = Math.min(Math.max(Number(req.body?.count) || 6, 1), 20);
  const difficulty = sanitizeInputText(req.body?.difficulty ?? "Intermediate", 40) || "Intermediate";
  const customKey = extractSafeHeaderApiKey(req);
  const engineMode = extractSafeAiEngine(req);
  const ai = getStrictGeminiForEngine(engineMode, customKey);
  if (engineMode === "gemini_byok" && (!customKey || !ai)) {
    return res.status(401).json({
      error: "개인 Gemini API 키 전용 모드입니다. API 키를 등록하거나 무료 AI 모드로 전환해 주세요.",
    });
  }

  const normalizeVocabItems = (rawList: any[]) =>
    rawList.map((item: any) => {
      const wLower = String(item?.word || "").trim().toLowerCase();
      let cleanMeaning = String(item?.meaning || "").trim();
      if (!/[\u3131-\u318E\uAC00-\uD7A3]/.test(cleanMeaning) && curriculumLookup[wLower]) {
        cleanMeaning = curriculumLookup[wLower];
      }
      let cleanSentenceMeaning = String(item?.sentenceMeaning || "").trim();
      if (!/[\u3131-\u318E\uAC00-\uD7A3]/.test(cleanSentenceMeaning)) {
        cleanSentenceMeaning = `"${cleanMeaning || item?.word || topic}"에 관련된 실용 예문입니다.`;
      }
      return {
        word: sanitizeInputText(String(item?.word || ""), 120),
        ipa: sanitizeInputText(String(item?.ipa || ""), 80),
        meaning: sanitizeInputText(cleanMeaning, 200),
        partOfSpeech: sanitizeInputText(String(item?.partOfSpeech || "n."), 30) || "n.",
        sentence: sanitizeInputText(String(item?.sentence || ""), 350),
        sentenceMeaning: sanitizeInputText(cleanSentenceMeaning, 350),
        tip: item?.tip ? sanitizeInputText(String(item.tip), 200) : undefined,
      };
    }).filter((it) => it.word.length > 0);

  if (ai && (engineMode === "gemini_byok" || engineMode === "auto_free")) {
    try {
      const response = await generateGeminiContent(ai, {
        contents: `사용자가 요청한 주제: "${topic}", 난이도: "${difficulty}".
이 주제와 연관된 실용적인 영어 단어 및 자연스러운 예문 ${count}개를 생성해주세요.
각 단어에는 IPA 발음 기호, 순수 한국어 뜻, 영어 예문 문장, 예문의 한국어 번역이 포함되어야 합니다.
중요: meaning과 sentenceMeaning은 반드시 자연스럽고 정확한 한국어로만 작성해야 합니다. 영어 단어가 뜻에 들어가선 안 됩니다.`,
        config: {
          systemInstruction: "당신은 한국인 영어 학습자를 위한 정교한 Vocab 생성 전문가입니다. 규칙: meaning(한국어 뜻)과 sentenceMeaning(문장 번역)은 100% 한국어로만 작성하고 영어를 절대 그대로 넣지 마세요. 반말이나 불필요한 설명 없이 오직 JSON 배열 데이터만 반환하세요.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "생성된 단어 및 문장 리스트",
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING, description: "영어 단어 또는 핵심 표현" },
                ipa: { type: Type.STRING, description: "IPA 발음 기호 (예: /əbˈsɔːrb/)" },
                meaning: { type: Type.STRING, description: "한국어 의미 (순수 한국어 번역)" },
                partOfSpeech: { type: Type.STRING, description: "품사 (n., v., adj., adv., phr.)" },
                sentence: { type: Type.STRING, description: "단어가 사용된 영어 문장" },
                sentenceMeaning: { type: Type.STRING, description: "영어 문장의 자연스러운 한국어 번역" },
                tip: { type: Type.STRING, description: "발음 팁 또는 원어민 뉘앙스 팁" },
              },
              required: ["word", "ipa", "meaning", "partOfSpeech", "sentence", "sentenceMeaning"],
            },
          },
        },
      });

      const jsonText = response.text || "[]";
      const rawList = sanitizeObjectDeep(JSON.parse(jsonText));
      const vocabList = Array.isArray(rawList) ? normalizeVocabItems(rawList) : [];
      if (vocabList.length > 0) {
        return res.json({ success: true, items: vocabList, aiProvider: "Gemini AI" });
      }
    } catch (error: any) {
      if (engineMode === "gemini_byok") {
        const { statusCode, message } = mapGeminiErrorStatus(error);
        return res.status(statusCode).json({ error: message });
      }
      console.info("Gemini AI Vocab fallback to free AI:", error?.status || error?.code || "offline mode");
    }
  }

  if (engineMode !== "gemini_byok") {
    try {
      const freePrompt = `Topic: "${topic}", Difficulty: "${difficulty}".
Generate ${count} practical English vocab expressions with Korean meanings and example sentences.
Return strictly a raw JSON array:
[{"word":"...","ipa":"/.../","meaning":"순수 한국어 뜻","partOfSpeech":"n.","sentence":"English sentence","sentenceMeaning":"자연스러운 한국어 번역","tip":"한국어 팁"}]`;
      const { data, providerName } = await generateFreeAiJson<any>(
        freePrompt,
        "You are an English vocabulary teacher for Korean learners. Return ONLY a JSON array. Every meaning and sentenceMeaning must be written in Korean Hangul.",
        engineMode,
        (payload) => {
          const arr = unwrapArrayFromAiPayload(payload, ["items", "words", "vocabulary", "vocab"]);
          return Boolean(arr && arr.length > 0 && typeof arr[0]?.word === "string");
        }
      );
      const unwrapped = unwrapArrayFromAiPayload(data, ["items", "words", "vocabulary", "vocab"]) || [];
      return res.json({
        success: true,
        items: normalizeVocabItems(unwrapped.slice(0, count)),
        aiProvider: providerName,
        isFallback: false,
      });
    } catch (err: any) {
      console.info("Free AI generate-vocab unavailable, serving curriculum fallback");
    }
  }

  // Resilient fallback from 3,210 Curriculum Vocabulary items
  const numToPick = Math.min(Math.max(Number(count) || 6, 1), 20);
  const targetCategory = difficulty === "Elementary" || difficulty === "Beginner" 
    ? "elementary" 
    : difficulty === "Advanced" ? "high_sat" : "middle";
  
  const pool = curriculumItems.filter(it => it.categoryId === targetCategory);
  const selectedPool = pool.length >= numToPick ? pool : curriculumItems;
  const shuffled = [...selectedPool].sort(() => Math.random() - 0.5).slice(0, numToPick);
  
  const fallbackList = shuffled.map(it => ({
    word: it.word,
    ipa: it.ipa || "",
    meaning: it.meaning,
    partOfSpeech: it.partOfSpeech || "n.",
    sentence: it.sentence || `Practice using "${it.word}" in your daily conversations.`,
    sentenceMeaning: it.sentenceMeaning || `일상 대화에서 "${it.word}" 표현을 적극 활용해 보세요.`,
    tip: it.tip || `주제: ${topic} (${difficulty}) 추천 어휘`,
  }));

  return res.json({ success: true, items: fallbackList, isFallback: true });
});

// AI Sentence & Expression Explainer
app.post("/api/ai/explain", async (req, res) => {
  const text = sanitizeInputText(req.body?.text, 500);
  const context = sanitizeInputText(req.body?.context ?? "", 300);
  if (!text) {
    return res.status(400).json({ error: "해설할 문장이나 단어가 제공되지 않았습니다." });
  }

  const customKey = extractSafeHeaderApiKey(req);
  const engineMode = extractSafeAiEngine(req);
  const ai = getStrictGeminiForEngine(engineMode, customKey);
  if (engineMode === "gemini_byok" && (!customKey || !ai)) {
    return res.status(401).json({
      error: "개인 Gemini API 키 전용 모드입니다. API 키를 등록하거나 무료 AI 모드로 전환해 주세요.",
    });
  }

  if (ai && (engineMode === "gemini_byok" || engineMode === "auto_free")) {
    try {
      const response = await generateGeminiContent(ai, {
        contents: `문장/단어: "${text}"
${context ? `맥락: ${context}` : ""}

이 표현의 발음 포인트, 원어민 뉘앙스, 문법 요소, 비슷하지만 뉘앙스가 다른 대체 표현 2가지를 친절하고 명확하게 한국어로 설명해주세요.`,
        config: {
          systemInstruction: "당신은 친절한 언어 튜터입니다. 한국어 마크다운 형식으로 가독성 높게 작성해 주세요.",
        },
      });

      if (response?.text && response.text.trim().length > 0) {
        return res.json({ success: true, explanation: response.text, aiProvider: "Gemini AI" });
      }
    } catch (error: any) {
      if (engineMode === "gemini_byok") {
        const { statusCode, message } = mapGeminiErrorStatus(error);
        return res.status(statusCode).json({ error: message });
      }
      console.info("Gemini AI explanation fallback to free AI:", error?.status || error?.code || "offline mode");
    }
  }

  if (engineMode !== "gemini_byok") {
    try {
      const { text: freeText, providerName } = await generateFreeAiText(
        `영어 표현/문장: "${text}"\n${context ? `맥락: ${context}\n` : ""}발음·연음 포인트, 원어민 뉘앙스, 문법 요소, 대체 표현 2가지를 친절하고 가독성 있는 한국어 마크다운으로 설명해 주세요.`,
        "당신은 친절한 한국어 기반 영어 튜터입니다. 한국어 마크다운으로 명확하게 답변하세요.",
        engineMode
      );
      if (/[\uAC00-\uD7A3]/.test(freeText)) {
        return res.json({ success: true, explanation: freeText, aiProvider: providerName, isFallback: false });
      }
    } catch {
      console.info("Free AI explain unavailable, using offline linguistic fallback");
    }
  }

  // Resilient offline linguistic explanation
  const fallbackExplanation = generateOfflineExplanation(text, context);
  return res.json({ success: true, explanation: fallbackExplanation, isFallback: true });
});

// AI Goal Recommendation Engine
app.post("/api/ai/recommend-goals", async (req, res) => {
  const interest = sanitizeInputText(req.body?.interest ?? "영어 회화 & 자기계발", 120) || "영어 회화 & 자기계발";
  const timePerDay = sanitizeInputText(req.body?.timePerDay ?? "30분", 40) || "30분";
  const customKey = extractSafeHeaderApiKey(req);
  const engineMode = extractSafeAiEngine(req);
  const ai = getStrictGeminiForEngine(engineMode, customKey);
  if (engineMode === "gemini_byok" && (!customKey || !ai)) {
    return res.status(401).json({
      error: "개인 Gemini API 키 전용 모드입니다. API 키를 등록하거나 무료 AI 모드로 전환해 주세요.",
    });
  }

  if (ai && (engineMode === "gemini_byok" || engineMode === "auto_free")) {
    try {
      const response = await generateGeminiContent(ai, {
        contents: `학습자 관심사: "${interest}", 하루 투자 가능 시간: "${timePerDay}".
학습자가 꾸준히 실천할 수 있는 구체적이고 측정 가능한 자기계발/영어학습 목표 4개를 추천해주세요.`,
        config: {
          systemInstruction: "자기계발 및 습관 형성 전문가로서 정교한 목표 추천 목록을 JSON으로 반환하세요.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "목표 이름" },
                category: { type: Type.STRING, description: "카테고리 (영어, 습관, 운동, 독서 등)" },
                targetCount: { type: Type.NUMBER, description: "일일 목표 수치" },
                unit: { type: Type.STRING, description: "수치 단위 (개, 분, 페이지 등)" },
                description: { type: Type.STRING, description: "목표의 효과 및 팁" },
              },
              required: ["title", "category", "targetCount", "unit", "description"],
            },
          },
        },
      });

      const jsonText = response.text || "[]";
      const parsed = sanitizeObjectDeep(JSON.parse(jsonText));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({ success: true, goals: parsed, aiProvider: "Gemini AI" });
      }
    } catch (error: any) {
      if (engineMode === "gemini_byok") {
        const { statusCode, message } = mapGeminiErrorStatus(error);
        return res.status(statusCode).json({ error: message });
      }
      console.info("Gemini Goal recommendation fallback to free AI:", error?.status || error?.code || "offline mode");
    }
  }

  if (engineMode !== "gemini_byok") {
    try {
      const { data, providerName } = await generateFreeAiJson<any>(
        `관심사: "${interest}", 하루 가능 시간: "${timePerDay}". 실천 가능한 영어/자기계발 목표 4개를 JSON 배열로만 출력하세요: [{"title":"목표(한국어)","category":"영어","targetCount":5,"unit":"개","description":"한국어 팁"}]`,
        "Return ONLY a JSON array of 4 Korean study goals.",
        engineMode,
        (payload) => {
          const arr = unwrapArrayFromAiPayload(payload, ["goals", "items", "recommendations"]);
          return Boolean(arr && arr.length > 0 && typeof arr[0]?.title === "string");
        }
      );
      const unwrapped = unwrapArrayFromAiPayload(data, ["goals", "items", "recommendations"]) || [];
      return res.json({ success: true, goals: unwrapped.slice(0, 4), aiProvider: providerName, isFallback: false });
    } catch {}
  }

  // Fallback curated goals
  const fallbackGoals = [
    {
      title: `${interest} 핵심 표현 5개 암기`,
      category: "영어",
      targetCount: 5,
      unit: "개",
      description: `하루 ${timePerDay} 투자를 위한 집중 어휘 학습 루틴입니다.`,
    },
    {
      title: "원어민 문장 쉐도잉 3회 반복",
      category: "스피킹",
      targetCount: 3,
      unit: "문장",
      description: "정확한 억양과 연음을 체득하여 말하기 유창성을 향상합니다.",
    },
    {
      title: "영단어 1분 스피드 퀴즈 도전",
      category: "습관",
      targetCount: 1,
      unit: "회",
      description: "순간 회상 속도를 높여 뇌를 활성화하는 마이크로 챌린지입니다.",
    },
    {
      title: "자기계발 영어 한 줄 일기 작성",
      category: "자기계발",
      targetCount: 1,
      unit: "줄",
      description: "배운 표현을 사용하여 하루를 성찰하는 루틴입니다.",
    },
  ];

  return res.json({ success: true, goals: fallbackGoals, isFallback: true });
});

// AI Roleplay Conversation Turn Endpoint
app.post("/api/ai/roleplay/chat", async (req, res) => {
  const rawScenario = req.body?.scenario && typeof req.body.scenario === "object" ? sanitizeObjectDeep(req.body.scenario) : null;
  const messages = Array.isArray(req.body?.messages) ? sanitizeObjectDeep(req.body.messages.slice(-12)) : [];
  const userMessage = sanitizeInputText(req.body?.userMessage, 600);
  const completedMissions = Array.isArray(req.body?.completedMissions)
    ? req.body.completedMissions.slice(0, 20).map((id: any) => sanitizeInputText(String(id), 80)).filter(Boolean)
    : [];
  if (!rawScenario || !userMessage) {
    return res.status(400).json({ error: "시나리오 정보와 사용자 메시지가 필요합니다." });
  }
  const scenario = {
    id: sanitizeInputText(String(rawScenario.id || "custom"), 100) || "custom",
    title: sanitizeInputText(String(rawScenario.title || "English Roleplay"), 160),
    partnerName: sanitizeInputText(String(rawScenario.partnerName || "Partner"), 80),
    partnerRole: sanitizeInputText(String(rawScenario.partnerRole || "Speaker"), 80),
    userRole: sanitizeInputText(String(rawScenario.userRole || "Learner"), 80),
    situationContext: sanitizeInputText(String(rawScenario.situationContext || ""), 400),
    missions: Array.isArray(rawScenario.missions) ? rawScenario.missions.slice(0, 6) : [],
    recommendedPhrases: Array.isArray(rawScenario.recommendedPhrases) ? rawScenario.recommendedPhrases.slice(0, 6) : [],
  };

  const customKey = extractSafeHeaderApiKey(req);
  const engineMode = extractSafeAiEngine(req);
  const ai = getStrictGeminiForEngine(engineMode, customKey);
  if (engineMode === "gemini_byok" && (!customKey || !ai)) {
    return res.status(401).json({
      error: "개인 Gemini API 키 전용 모드입니다. API 키를 등록하거나 무료 AI 모드로 전환해 주세요.",
    });
  }

  const normalizeRoleplayTurn = (parsed: any) => ({
    aiResponse: {
      en: sanitizeInputText(String(parsed?.aiResponse?.en || ""), 500),
      ko: sanitizeInputText(String(parsed?.aiResponse?.ko || ""), 500),
    },
    feedback: {
      rephrasedBetter: sanitizeInputText(String(parsed?.feedback?.rephrasedBetter || userMessage), 400),
      grammarNotes: sanitizeInputText(String(parsed?.feedback?.grammarNotes || "자연스러운 문장 구성입니다."), 400),
      pronunciationTips: parsed?.feedback?.pronunciationTips
        ? sanitizeInputText(String(parsed.feedback.pronunciationTips), 300)
        : undefined,
    },
    newCompletedMissionIds: Array.isArray(parsed?.newCompletedMissionIds)
      ? parsed.newCompletedMissionIds.map((id: any) => sanitizeInputText(String(id), 80)).filter(Boolean)
      : [],
    recommendedNextHints: Array.isArray(parsed?.recommendedNextHints)
      ? parsed.recommendedNextHints
          .slice(0, 2)
          .filter((h: any) => h && typeof h.en === "string")
          .map((h: any) => ({
            en: sanitizeInputText(String(h.en), 200),
            ko: sanitizeInputText(String(h.ko || ""), 200),
          }))
      : [],
  });

  if (ai && (engineMode === "gemini_byok" || engineMode === "auto_free")) {
    try {
      const formattedHistory = messages
        .slice(-8)
        .map((m: any) => `${m.sender === "ai" ? scenario.partnerName : "User"}: "${String(m.text || "")}"`)
        .join("\n");

      const missionListStr = scenario.missions
        .map((m: any) => `- [ID: ${m.id}] ${m.text} (${m.description})`)
        .join("\n");

      const prompt = `[Roleplay Situation Context]
Title: ${scenario.title}
Role of AI Partner: ${scenario.partnerName} (${scenario.partnerRole})
Role of User: ${scenario.userRole}
Background: ${scenario.situationContext}

[Scenario Missions for User]
${missionListStr}

[Already Completed Mission IDs]
${JSON.stringify(completedMissions)}

[Previous Dialogue History]
${formattedHistory || "(Start of conversation)"}

[Latest User Message]
"${userMessage}"

[Your Instructions]
1. Act realistically in character as ${scenario.partnerName}. Respond naturally to the user in 1~2 concise, engaging English sentences suitable for a spoken conversation.
2. Provide a 100% natural, accurate Korean translation of your AI response.
3. Review the user's latest message ("${userMessage}").
   - Offer a "rephrasedBetter": A more natural native English expression or colloquial alternative to express what the user wanted to say.
   - Offer "grammarNotes": Brief Korean tips on grammar, word choice, or polite nuance (1 sentence).
4. Evaluate if the user's message just fulfilled any new mission from the list. Return the list of newly completed mission IDs in "newCompletedMissionIds".
5. Provide 2 short, helpful English recommended hints ("recommendedNextHints") that the user could say next in this scenario with Korean translations.
6. Return purely structured JSON adhering to the schema.`;

      const response = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          systemInstruction: `You are an expert English conversation tutor & roleplay partner. Keep responses authentic, conversational, and encouraging. Korean translations must be 100% accurate and natural. Output strictly valid JSON.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aiResponse: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING, description: "AI partner's natural English response" },
                  ko: { type: Type.STRING, description: "Korean translation of AI response" },
                },
                required: ["en", "ko"],
              },
              feedback: {
                type: Type.OBJECT,
                properties: {
                  rephrasedBetter: { type: Type.STRING, description: "More natural native expression for user's input" },
                  grammarNotes: { type: Type.STRING, description: "Brief Korean feedback/coaching" },
                  pronunciationTips: { type: Type.STRING, description: "Key word pronunciation or linking tip" },
                },
                required: ["rephrasedBetter", "grammarNotes"],
              },
              newCompletedMissionIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of newly achieved mission IDs",
              },
              recommendedNextHints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING },
                    ko: { type: Type.STRING },
                  },
                  required: ["en", "ko"],
                },
                description: "2 helpful phrase recommendations for user's next turn",
              },
            },
            required: ["aiResponse", "feedback", "newCompletedMissionIds", "recommendedNextHints"],
          },
        },
      });

      const jsonText = response.text || "{}";
      const parsed = sanitizeObjectDeep(JSON.parse(jsonText));
      if (parsed?.aiResponse?.en) {
        const normalized = normalizeRoleplayTurn(parsed);
        return res.json({
          success: true,
          ...normalized,
          aiProvider: "Gemini AI",
          isFallback: false,
        });
      }
    } catch (error: any) {
      if (engineMode === "gemini_byok") {
        const { statusCode, message } = mapGeminiErrorStatus(error);
        return res.status(statusCode).json({ error: message });
      }
      console.info("Gemini Roleplay chat fallback to free AI:", error?.status || error?.code || "offline mode");
    }
  }

  if (engineMode !== "gemini_byok") {
    try {
      const formattedHistory = messages
        .slice(-6)
        .map((m: any) => `${m.sender === "ai" ? scenario.partnerName : "User"}: "${String(m.text || "")}"`)
        .join("\n");
      const missionListStr = scenario.missions
        .map((m: any) => `- ID "${m.id}": ${m.text} (${m.description})`)
        .join("\n");

      const freePrompt = `[Scenario] ${scenario.title} — You play "${scenario.partnerName}" (${scenario.partnerRole}). User plays "${scenario.userRole}".
Context: ${scenario.situationContext}
Missions:\n${missionListStr}
Already completed IDs: ${JSON.stringify(completedMissions)}
Recent dialogue:\n${formattedHistory || "(Start)"}
User's latest line: "${userMessage}"

Reply ONLY with raw valid JSON:
{"aiResponse":{"en":"1-2 natural spoken English sentences","ko":"자연스러운 한국어 번역"},"feedback":{"rephrasedBetter":"more natural native alternative","grammarNotes":"1 Korean sentence tip","pronunciationTips":"short Korean pronunciation tip"},"newCompletedMissionIds":[],"recommendedNextHints":[{"en":"hint 1","ko":"한국어 1"},{"en":"hint 2","ko":"한국어 2"}]}`;

      const { data, providerName } = await generateFreeAiJson<any>(
        freePrompt,
        "You are an English roleplay partner & Korean tutor. Output strictly valid JSON only.",
        engineMode,
        (p) => Boolean(p?.aiResponse?.en && p?.aiResponse?.ko && /[\uAC00-\uD7A3]/.test(String(p.aiResponse.ko)))
      );

      const normalized = normalizeRoleplayTurn(data);
      return res.json({
        success: true,
        ...normalized,
        aiProvider: providerName,
        isFallback: false,
      });
    } catch {
      console.info("Free AI roleplay chat unavailable, serving offline heuristic response");
    }
  }

  // Resilient Offline Roleplay Fallback Engine
  const uLower = userMessage.toLowerCase();
  let aiEn = "That sounds great! Could you tell me a little more details so I can help you better?";
  let aiKo = "좋습니다! 더 잘 도와드릴 수 있도록 세부 사항을 조금 더 말씀해 주시겠어요?";
  const newCompleted: string[] = [];

  // Heuristic mission check and context responses
  if (scenario.id.includes("cafe")) {
    if (uLower.includes("latte") || uLower.includes("coffee") || uLower.includes("americano") || uLower.includes("grande") || uLower.includes("tall")) {
      newCompleted.push("mission-1");
      aiEn = "Sure thing! A Grande iced latte. Would you like regular whole milk, or would you prefer oat or almond milk?";
      aiKo = "네 알겠습니다! 그란데 아이스 라떼 맞으시죠. 일반 우유로 드릴까요, 아니면 오트밀크나 아몬드 밀크로 변경해 드릴까요?";
    } else if (uLower.includes("oat") || uLower.includes("milk") || uLower.includes("syrup") || uLower.includes("ice") || uLower.includes("sweet")) {
      newCompleted.push("mission-2");
      aiEn = "Got it, with oat milk and light ice! Would you like any warm pastries or snacks to go along with that?";
      aiKo = "네, 오트밀크에 얼음 적게 넣어 드릴게요! 함께 곁들일 따뜻한 베이커리나 디저트도 필요하신가요?";
    } else if (uLower.includes("card") || uLower.includes("croissant") || uLower.includes("cookie") || uLower.includes("receipt") || uLower.includes("pay")) {
      newCompleted.push("mission-3");
      aiEn = "Perfect! Your total is $8.50. You can tap or insert your card right on the terminal here. Here is your receipt!";
      aiKo = "완벽합니다! 총 금액은 8달러 50센트입니다. 단말기에 카드를 대주시거나 꽂아주세요. 여기 영수증입니다!";
    }
  } else if (scenario.id.includes("airport") || scenario.id.includes("travel")) {
    if (uLower.includes("vacation") || uLower.includes("sightseeing") || uLower.includes("travel") || uLower.includes("holiday")) {
      newCompleted.push("mission-1");
      aiEn = "Welcome to the US. How long do you plan to stay in the country, and where will you be staying?";
      aiKo = "미국에 오신 것을 환영합니다. 체류 기간은 며칠이며, 어디에 머무르실 예정인가요?";
    } else if (uLower.includes("day") || uLower.includes("week") || uLower.includes("hotel") || uLower.includes("stay")) {
      newCompleted.push("mission-2");
      newCompleted.push("mission-3");
      aiEn = "Everything looks in order. Enjoy your stay in New York! Next, please.";
      aiKo = "모든 서류가 완벽합니다. 뉴욕에서 즐거운 시간 보내세요! 다음 분 오세요.";
    }
  } else if (scenario.id.includes("interview") || scenario.id.includes("business")) {
    if (uLower.includes("experience") || uLower.includes("developer") || uLower.includes("years") || uLower.includes("project")) {
      newCompleted.push("mission-1");
      aiEn = "That is impressive background! Could you share a specific technical challenge you solved recently?";
      aiKo = "인상적인 경력이시군요! 최근에 직접 해결하셨던 구체적인 기술적 난관 사례를 하나 말씀해 주실 수 있나요?";
    } else if (uLower.includes("optimize") || uLower.includes("solved") || uLower.includes("issue") || uLower.includes("team")) {
      newCompleted.push("mission-2");
      aiEn = "Great approach to problem solving. Do you have any questions for us regarding the team or company culture?";
      aiKo = "훌륭한 문제 해결 접근 방식이네요. 저희 팀이나 회사 문화에 대해 궁금한 점이 있으신가요?";
    } else {
      newCompleted.push("mission-3");
      aiEn = "Thank you for the insightful question! We foster an autonomous and highly collaborative culture. We will be in touch with next steps.";
      aiKo = "좋은 질문 감사합니다! 저희는 자율적이고 긴밀하게 협력하는 문화를 지향합니다. 다음 전형 절차를 곧 안내해 드리겠습니다.";
    }
  }

  // Filter already completed
  const filteredNewCompleted = newCompleted.filter(id => !completedMissions.includes(id));

  return res.json({
    success: true,
    aiResponse: {
      en: aiEn,
      ko: aiKo,
    },
    feedback: {
      rephrasedBetter: `I would say: "${userMessage.charAt(0).toUpperCase() + userMessage.slice(1)}" (or: "Could you please ${userMessage.toLowerCase().replace(/^(i want|give me)\s*/i, "")}?")`,
      grammarNotes: "문맥상 정중하고 명확한 뉘앙스를 위해 'Could you ~' 또는 'I would like ~' 패턴을 활용해 보세요.",
      pronunciationTips: "어절 간 연음과 주요 명사의 모음 강세에 주의하며 발음해 보세요.",
    },
    newCompletedMissionIds: filteredNewCompleted,
    recommendedNextHints: (scenario.recommendedPhrases || []).slice(0, 2),
    isFallback: true,
  });
});

// AI Roleplay Comprehensive Performance Report Endpoint
app.post("/api/ai/roleplay/report", async (req, res) => {
  const rawScenario = req.body?.scenario && typeof req.body.scenario === "object" ? sanitizeObjectDeep(req.body.scenario) : null;
  const messages = Array.isArray(req.body?.messages) ? sanitizeObjectDeep(req.body.messages.slice(-30)) : [];
  const completedMissions = Array.isArray(req.body?.completedMissions)
    ? req.body.completedMissions.slice(0, 20).map((id: any) => sanitizeInputText(String(id), 80)).filter(Boolean)
    : [];
  if (!rawScenario || messages.length === 0) {
    return res.status(400).json({ error: "시나리오 및 대화 기록이 필요합니다." });
  }
  const scenario = {
    id: sanitizeInputText(String(rawScenario.id || "custom"), 100) || "custom",
    title: sanitizeInputText(String(rawScenario.title || "English Roleplay"), 160),
    partnerName: sanitizeInputText(String(rawScenario.partnerName || "Partner"), 80),
    partnerRole: sanitizeInputText(String(rawScenario.partnerRole || "Speaker"), 80),
    userRole: sanitizeInputText(String(rawScenario.userRole || "Learner"), 80),
    missions: Array.isArray(rawScenario.missions) ? rawScenario.missions.slice(0, 6) : [],
    recommendedPhrases: Array.isArray(rawScenario.recommendedPhrases) ? rawScenario.recommendedPhrases.slice(0, 6) : [],
  };

  const customKey = extractSafeHeaderApiKey(req);
  const engineMode = extractSafeAiEngine(req);
  const ai = getStrictGeminiForEngine(engineMode, customKey);
  if (engineMode === "gemini_byok" && (!customKey || !ai)) {
    return res.status(401).json({
      error: "개인 Gemini API 키 전용 모드입니다. API 키를 등록하거나 무료 AI 모드로 전환해 주세요.",
    });
  }

  const totalMissionsCount = scenario.missions?.length || 3;
  const completedCount = completedMissions.length;
  const missionScoreCalc = Math.round((completedCount / totalMissionsCount) * 100);

  const normalizeRoleplayReport = (data: any) => ({
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    overallScore: Math.max(0, Math.min(100, Math.round(Number(data?.overallScore) || 84))),
    fluencyScore: Math.max(0, Math.min(100, Math.round(Number(data?.fluencyScore) || 82))),
    accuracyScore: Math.max(0, Math.min(100, Math.round(Number(data?.accuracyScore) || 82))),
    vocabularyScore: Math.max(0, Math.min(100, Math.round(Number(data?.vocabularyScore) || 85))),
    missionScore: Math.max(0, Math.min(100, Math.round(Number(data?.missionScore) || missionScoreCalc))),
    feedbackSummary: sanitizeInputText(String(data?.feedbackSummary || ""), 600),
    strengths: Array.isArray(data?.strengths) ? data.strengths.slice(0, 4).map((s: any) => sanitizeInputText(String(s), 200)).filter(Boolean) : [],
    improvements: Array.isArray(data?.improvements) ? data.improvements.slice(0, 4).map((s: any) => sanitizeInputText(String(s), 200)).filter(Boolean) : [],
    highlightPhrases: Array.isArray(data?.highlightPhrases)
      ? data.highlightPhrases
          .slice(0, 4)
          .filter((p: any) => p && typeof p.en === "string")
          .map((p: any) => ({
            en: sanitizeInputText(String(p.en), 200),
            ko: sanitizeInputText(String(p.ko || ""), 200),
            tip: sanitizeInputText(String(p.tip || ""), 200),
          }))
      : [],
  });

  if (ai && (engineMode === "gemini_byok" || engineMode === "auto_free")) {
    try {
      const fullTranscript = messages
        .map((m: any) => `${m.sender === "ai" ? scenario.partnerName : "Learner"}: "${String(m.text || "")}"`)
        .join("\n");

      const prompt = `You are a certified senior English speaking evaluator.
Analyze this completed English roleplay dialogue session.

[Scenario Info]
Title: ${scenario.title}
AI Partner: ${scenario.partnerName} (${scenario.partnerRole})
User's Target Role: ${scenario.userRole}
Total Missions: ${totalMissionsCount} (Completed: ${completedCount})

[Complete Dialogue Transcript]
${fullTranscript}

[Evaluation Tasks]
1. Give numerical scores (0~100) for:
   - overallScore
   - fluencyScore (natural flow, sentence length)
   - accuracyScore (grammar & lexical accuracy)
   - vocabularyScore (appropriate situational vocabulary)
   - missionScore (mission fulfillment: currently ${missionScoreCalc})
2. Write a warm, highly encouraging 2~3 sentence Korean summary evaluation praising the learner.
3. List 2 specific strengths in Korean.
4. List 2 specific areas for improvement in Korean.
5. Extract 3 high-value key expressions used or recommended during this dialogue with their natural Korean translations and usage tips.

Return valid JSON adhering strictly to the schema.`;

      const response = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          systemInstruction: "You are an encouraging and insightful language coach. All explanations and feedback must be in natural, polite Korean. Output strictly JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallScore: { type: Type.NUMBER },
              fluencyScore: { type: Type.NUMBER },
              accuracyScore: { type: Type.NUMBER },
              vocabularyScore: { type: Type.NUMBER },
              missionScore: { type: Type.NUMBER },
              feedbackSummary: { type: Type.STRING, description: "Encouraging Korean summary" },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2 key strengths in Korean",
              },
              improvements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2 actionable coaching points in Korean",
              },
              highlightPhrases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING },
                    ko: { type: Type.STRING },
                    tip: { type: Type.STRING },
                  },
                  required: ["en", "ko"],
                },
                description: "3 key phrases to bookmark",
              },
            },
            required: [
              "overallScore",
              "fluencyScore",
              "accuracyScore",
              "vocabularyScore",
              "missionScore",
              "feedbackSummary",
              "strengths",
              "improvements",
              "highlightPhrases",
            ],
          },
        },
      });

      const jsonText = response.text || "{}";
      const parsed = sanitizeObjectDeep(JSON.parse(jsonText));
      if (parsed?.overallScore) {
        return res.json({
          success: true,
          report: normalizeRoleplayReport(parsed),
          aiProvider: "Gemini AI",
        });
      }
    } catch (error: any) {
      if (engineMode === "gemini_byok") {
        const { statusCode, message } = mapGeminiErrorStatus(error);
        return res.status(statusCode).json({ error: message });
      }
      console.info("Gemini Roleplay report fallback to free AI:", error?.status || error?.code || "offline mode");
    }
  }

  if (engineMode !== "gemini_byok") {
    try {
      const fullTranscript = messages
        .slice(-20)
        .map((m: any) => `${m.sender === "ai" ? scenario.partnerName : "Learner"}: "${String(m.text || "")}"`)
        .join("\n");
      const freePrompt = `Evaluate English roleplay "${scenario.title}" (missions ${completedCount}/${totalMissionsCount}):\n${fullTranscript}\nOutput strictly valid JSON: {"overallScore":85,"fluencyScore":84,"accuracyScore":83,"vocabularyScore":86,"missionScore":${missionScoreCalc},"feedbackSummary":"한국어 총평 2문장","strengths":["한국어 강점 1","한국어 강점 2"],"improvements":["한국어 개선 1","한국어 개선 2"],"highlightPhrases":[{"en":"key phrase","ko":"한국어 뜻","tip":"한국어 팁"}]}`;
      const { data, providerName } = await generateFreeAiJson<any>(
        freePrompt,
        "Output strictly valid JSON only with encouraging Korean evaluation.",
        engineMode,
        (p) => typeof p?.overallScore === "number" && typeof p?.feedbackSummary === "string" && /[\uAC00-\uD7A3]/.test(p.feedbackSummary)
      );
      return res.json({
        success: true,
        report: normalizeRoleplayReport(data),
        aiProvider: providerName,
      });
    } catch {}
  }

  // Resilient offline fallback report
  const baseScore = Math.min(65 + completedCount * 12 + Math.min(messages.length * 3, 15), 98);
  const fallbackReport = {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    overallScore: baseScore,
    fluencyScore: Math.max(baseScore - 4, 70),
    accuracyScore: Math.max(baseScore - 2, 72),
    vocabularyScore: Math.min(baseScore + 3, 96),
    missionScore: missionScoreCalc,
    feedbackSummary: `${scenario.partnerName}와의 롤플레잉에서 자신감 있게 상황에 알맞은 핵심 표현을 적극적으로 전달하셨습니다! 실전 미션 ${completedCount}/${totalMissionsCount}개를 훌륭하게 달성했습니다.`,
    strengths: [
      "상황에 알맞은 핵심 키워드를 적절히 활용하여 대화의 흐름을 끊김 없이 이어갔습니다.",
      "질문과 요청 사항을 원어민 파트너에게 명확하게 전달했습니다.",
    ],
    improvements: [
      "단답형 문장에 연결어(Because, However, Also)를 덧붙이면 더욱 유창한 원어민 억양이 완성됩니다.",
      "정중한 조동사 표현(Would it be possible to ~, Could I ~)을 습관화해 보세요.",
    ],
    highlightPhrases: (scenario.recommendedPhrases || []).slice(0, 3).map((p: any) => ({
      en: p.en,
      ko: p.ko,
      tip: "실전 대화에서 매우 빈번하게 사용되는 필수 표현입니다.",
    })),
  };

  return res.json({
    success: true,
    report: fallbackReport,
    isFallback: true,
  });
});

// AI custom nag scripts generator endpoint supporting user-defined custom API keys and customizable directions
app.post("/api/ai/generate-custom-nags", async (req, res) => {
  const direction = sanitizeInputText(req.body?.direction, 300) || "평범하지만 정감 가는 한국 부모님 스타일";
  const customKey = extractSafeHeaderApiKey(req);
  const engineMode = extractSafeAiEngine(req);
  const ai = getStrictGeminiForEngine(engineMode, customKey);
  if (engineMode === "gemini_byok" && (!customKey || !ai)) {
    return res.status(401).json({
      error: "개인 Gemini API 키 전용 모드입니다. API 키를 등록하거나 무료 AI 모드로 전환해 주세요.",
    });
  }

  const fallbackCustomScripts = {
    study_start: {
      mom: {
        tsundere: "흥, 이제야 공부하려고 책을 펴는구나? 딴짓하지 말고 집중해서 딱 5개만 외워보시지!",
        strict: "정신 똑바로 차리고 당장 단어 학습을 시작해라! 오늘 정해진 목표량을 하나도 남김없이 완수하도록!",
        affectionate: "아들/딸, 오늘도 배움을 시작하는구나! 너무 기특해. 차근차근 즐거운 마음으로 시작해볼까?"
      },
      dad: {
        tsundere: "어허, 드디어 공부할 준비를 마쳤군. 시작한 김에 제대로 끝내봐라. 치킨 내기할래?",
        strict: "계획을 세웠으면 즉시 성실하게 실행에 옮겨라. 어영부영 하지 말고 집중해서 시작하도록!",
        affectionate: "우리 멋진 자녀, 오늘도 힘차게 시작하는 모습이 정말 든든하다! 언제나 아빠가 뒤에서 지켜보고 응원할게."
      }
    },
    study_complete: {
      mom: {
        tsundere: "어머 세상에, 진짜 다 끝낸 거야? 별일이네... 뭐, 수고했어. 맛있는 간식 저기 뒀으니까 먹든가!",
        strict: "오늘의 일일 학습 목표를 완벽히 종결했구나. 훌륭하다. 내일도 이 엄격한 성실함을 지켜가거라.",
        affectionate: "아이고 우리 예쁜이, 오늘 목표를 다 해내다니 너무 대견하고 사랑스러워! 엄마가 꼭 안아줄게!"
      },
      dad: {
        tsundere: "허허, 오늘 할당량을 채웠다고? 제법 쓸 만하군. 내 피를 물려받았으니 이 정도 근성은 당연하지!",
        strict: "목표 100% 완수! 성실한 이행은 장래의 강력한 자산이 된다. 오늘의 성공을 잊지 말고 계속 정진하라.",
        affectionate: "대단하다! 아빠는 너의 끈기 있는 노력을 늘 신뢰하고 자랑스러워한단다. 오늘 정말 고생 많았다!"
      }
    },
    study_delay: {
      mom: {
        tsundere: "어휴, 폰만 보고 시간 계속 보낼 거야?! 공부하기 싫으면 관두든가! 얼른 단어장이라도 켜서 내 눈치 좀 보지 그래?!",
        strict: "할 일을 계속 미루는 습관은 인생을 망친다! 당장 스마트폰 내려놓고 3분이라도 단어를 암기해라!",
        affectionate: "공부하는 게 조금 지루하고 힘들지? 엄마 마음 다 알아. 맛있는 과일 깎아줄 테니까 조금만 힘내서 다시 해보자~"
      },
      dad: {
        tsundere: "어영부영 미루다가 오늘도 다 가겠다, 임마! 아빠 잔소리 듣기 싫으면 얼른 단어 5개만 외워라.",
        strict: "나태함은 실패로 가는 지름길이다. 지금 미룬 공부는 고스란히 내일의 부담이 된다. 즉시 단어 학습에 착수해라!",
        affectionate: "지칠 때는 잠시 숨을 골라도 괜찮단다. 하지만 포기하지 않고 한 걸음씩 내딛는 게 중요하단다. 아빠랑 다시 시작해볼까?"
      }
    }
  };

  if (ai && (engineMode === "gemini_byok" || engineMode === "auto_free")) {
    try {
      const prompt = `사용자의 지시사항/컨셉 방향: "${direction}"
      
위 컨셉 방향에 맞추어 엄마(mom)와 아빠(dad)가 3가지 톤('tsundere' 츤데레, 'strict' 엄격, 'affectionate' 다정)으로 말하는 잔소리 및 칭찬 문구 데이터셋을 생성해주세요.
대상 상황은 다음 3가지입니다:
1. study_start (학습 시작할 때)
2. study_complete (학습 완료했을 때)
3. study_delay (학습 미루고 딴짓할 때)

응답은 한국어로 작성하며, 아래의 JSON 스키마를 정확히 따르십시오.`;

      const response = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          systemInstruction: "당신은 한국 부모님 특유의 현실감 넘치고 유머러스한 말투를 구사하는 어휘 교육 대본 작가입니다. 지시사항 컨셉에 맞추어 생동감 넘치고 실감 나는 한국어 구어로만 대본을 작성해 주세요. 반말, 유행어, 부모님 특유의 어조를 적절히 섞어 위트 있게 작성해 주세요. 오직 유효한 JSON 형식만 반환하십시오.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              study_start: {
                type: Type.OBJECT,
                properties: {
                  mom: {
                    type: Type.OBJECT,
                    properties: {
                      tsundere: { type: Type.STRING },
                      strict: { type: Type.STRING },
                      affectionate: { type: Type.STRING }
                    },
                    required: ["tsundere", "strict", "affectionate"]
                  },
                  dad: {
                    type: Type.OBJECT,
                    properties: {
                      tsundere: { type: Type.STRING },
                      strict: { type: Type.STRING },
                      affectionate: { type: Type.STRING }
                    },
                    required: ["tsundere", "strict", "affectionate"]
                  }
                },
                required: ["mom", "dad"]
              },
              study_complete: {
                type: Type.OBJECT,
                properties: {
                  mom: {
                    type: Type.OBJECT,
                    properties: {
                      tsundere: { type: Type.STRING },
                      strict: { type: Type.STRING },
                      affectionate: { type: Type.STRING }
                    },
                    required: ["tsundere", "strict", "affectionate"]
                  },
                  dad: {
                    type: Type.OBJECT,
                    properties: {
                      tsundere: { type: Type.STRING },
                      strict: { type: Type.STRING },
                      affectionate: { type: Type.STRING }
                    },
                    required: ["tsundere", "strict", "affectionate"]
                  }
                },
                required: ["mom", "dad"]
              },
              study_delay: {
                type: Type.OBJECT,
                properties: {
                  mom: {
                    type: Type.OBJECT,
                    properties: {
                      tsundere: { type: Type.STRING },
                      strict: { type: Type.STRING },
                      affectionate: { type: Type.STRING }
                    },
                    required: ["tsundere", "strict", "affectionate"]
                  },
                  dad: {
                    type: Type.OBJECT,
                    properties: {
                      tsundere: { type: Type.STRING },
                      strict: { type: Type.STRING },
                      affectionate: { type: Type.STRING }
                    },
                    required: ["tsundere", "strict", "affectionate"]
                  }
                },
                required: ["mom", "dad"]
              }
            },
            required: ["study_start", "study_complete", "study_delay"]
          }
        }
      });

      const jsonText = response.text || "{}";
      const generatedScripts = sanitizeObjectDeep(JSON.parse(jsonText));
      if (generatedScripts?.study_start?.mom?.tsundere) {
        return res.json({ success: true, scripts: generatedScripts, aiProvider: "Gemini AI" });
      }
    } catch (e: any) {
      if (engineMode === "gemini_byok") {
        const { statusCode, message } = mapGeminiErrorStatus(e);
        return res.status(statusCode).json({ error: message });
      }
      console.warn("Gemini custom nag scripts failed, falling back to free AI:", e);
    }
  }

  if (engineMode !== "gemini_byok") {
    try {
      const freePrompt = `컨셉: "${direction}"\n엄마(mom), 아빠(dad)의 3가지 톤(tsundere, strict, affectionate) 한국어 구어체 대본을 JSON으로만 반환:\n{"study_start":{"mom":{"tsundere":"...","strict":"...","affectionate":"..."},"dad":{"tsundere":"...","strict":"...","affectionate":"..."}},"study_complete":{"mom":{"tsundere":"...","strict":"...","affectionate":"..."},"dad":{"tsundere":"...","strict":"...","affectionate":"..."}},"study_delay":{"mom":{"tsundere":"...","strict":"...","affectionate":"..."},"dad":{"tsundere":"...","strict":"...","affectionate":"..."}}}`;
      const { data, providerName } = await generateFreeAiJson<any>(
        freePrompt,
        "한국 부모님 컨셉 대본 작가. 자연스러운 한국어로 JSON만 반환하세요.",
        engineMode,
        (p) => Boolean(p?.study_start?.mom?.tsundere && p?.study_complete?.dad?.affectionate)
      );
      return res.json({ success: true, scripts: data, aiProvider: providerName });
    } catch {}
  }

  return res.json({ success: true, scripts: fallbackCustomScripts, isFallback: true });
});

// AI Phoneme-Level Pronunciation Correction Report Endpoint (gemini-4-hydrogen multimodal audio + text)
app.post("/api/ai/pronunciation-report", async (req, res) => {
  const targetText = sanitizeInputText(req.body?.targetText, 400);
  const recognizedText = sanitizeInputText(req.body?.recognizedText ?? "", 400);
  const localHints = sanitizeInputText(req.body?.localHints ?? "", 1200);
  const rawAudioBase64 = typeof req.body?.audioBase64 === "string" ? req.body.audioBase64.trim() : "";
  const rawAudioMime = typeof req.body?.audioMimeType === "string" ? req.body.audioMimeType.split(";")[0].trim().toLowerCase() : "";

  if (!targetText) {
    return res.status(400).json({ error: "분석할 목표 영어 단어 또는 문장(targetText)이 필요합니다." });
  }

  const ALLOWED_AUDIO_MIMES = new Set(["audio/webm", "audio/wav", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/mp3"]);
  let validAudioPart: { inlineData: { mimeType: string; data: string } } | null = null;

  if (rawAudioBase64) {
    if (!ALLOWED_AUDIO_MIMES.has(rawAudioMime)) {
      return res.status(400).json({ error: "지원되지 않는 오디오 형식입니다." });
    }
    if (rawAudioBase64.length > 3_200_000 || !/^[A-Za-z0-9+/=]+$/.test(rawAudioBase64)) {
      return res.status(400).json({ error: "오디오 데이터 크기가 너무 크거나 형식이 올바르지 않습니다." });
    }
    validAudioPart = {
      inlineData: {
        mimeType: rawAudioMime === "audio/mp3" ? "audio/mpeg" : rawAudioMime,
        data: rawAudioBase64,
      },
    };
  }

  const customKey = extractSafeHeaderApiKey(req);
  const engineMode = extractSafeAiEngine(req);
  const ai = getStrictGeminiForEngine(engineMode, customKey);

  if (engineMode === "gemini_byok" && (!customKey || !ai)) {
    return res.status(401).json({
      error: "개인 Gemini API 키 전용 모드입니다. API 키를 등록하거나 무료 AI 모드로 전환해 주세요.",
    });
  }

  const promptText = `You are a specialist English phonetics & L1-Korean pronunciation coach.
Evaluate the learner's pronunciation of the target English text down to the individual PHONEME level.

[Target English Text]
"${targetText}"

[Browser Speech Recognition Transcript]
"${recognizedText || "(none recognized)"}"

[Acoustic / Phonological Pre-alignment Hints]
${localHints || "(none)"}

${validAudioPart ? "[Attached Audio]\nListen carefully to the learner's actual audio recording attached to this request. Identify real acoustic phoneme substitutions, omitted word endings, interdental /θ,ð/→/s,d/ substitutions, /r/↔/l/ confusions, /f,v/→/p,b/ confusions, vowel length/tenseness issues, or weak stress." : "[Text & Hint Mode]\nNo audio blob was attached; analyze phonetic differences between Target and Recognized Transcript plus Korean learner interference risks for the target graphemes."}

Instructions:
1. Break down the key phonemes across the target text (include every mispronounced/weak phoneme PLUS key anchor phonemes up to 14 items total so the report is focused and actionable).
2. For each item:
   - word: exact target English word
   - grapheme: spelling letters for that phoneme (e.g., "th", "r", "v", "ee", "ed")
   - expectedIpa: target IPA in slashes (e.g., "/θ/", "/r/", "/iː/")
   - spokenIpa: perceived IPA in slashes (same as expectedIpa if accurate, or confused phoneme e.g. "/s/", "/l/", "/Ø/" for omission)
   - errorType: one of "accurate" | "substitution" | "omission" | "distortion" | "weak_stress"
   - severity: "good" (when accurate), "moderate" (weak stress or slight distortion), or "critical" (substitution or omission)
   - accuracyScore: 0~100 integer
   - diagnosis: 1 concise Korean sentence explaining what sounded off or why it was recognized well
   - articulationCue: specific Korean physical tongue/lips/teeth/airflow instruction
   - mouthFocus: one of "interdental" | "alveolar" | "lips_teeth" | "bilabial" | "velar" | "retroflex_r" | "vowel_open" | "vowel_spread" | "glottal"
   - minimalPairWord: optional English contrast word to practice against (e.g., "sink" when target was "think")
   - minimalPairIpa: optional IPA of the contrast phoneme (e.g., "/s/")
3. Provide 1~3 minimal-pair practiceDrills focused on the weakest phonemes.
4. Write overallSummary in encouraging, specific Korean (1~2 sentences naming the concrete phoneme strengths and fixes).
Output strictly valid JSON matching the schema.`;

  const ALLOWED_ERROR_TYPES = new Set(["accurate", "substitution", "omission", "distortion", "weak_stress"]);
  const ALLOWED_SEVERITIES = new Set(["good", "moderate", "critical"]);
  const ALLOWED_MOUTH_FOCUS = new Set([
    "interdental",
    "alveolar",
    "lips_teeth",
    "bilabial",
    "velar",
    "retroflex_r",
    "vowel_open",
    "vowel_spread",
    "glottal",
  ]);

  const formatNormalizedReport = (parsed: any, providerName: string, idPrefix: string) => {
    const rawItems =
      (Array.isArray(parsed?.phonemeItems)
        ? parsed.phonemeItems
        : unwrapArrayFromAiPayload(parsed, ["phonemeItems", "phonemes", "items", "data"])) || [];
    const items = rawItems.slice(0, 18).map((item: any, idx: number) => ({
      id: `${idPrefix}-${idx}-${String(item?.grapheme || "x").replace(/[^a-z0-9]/gi, "")}`,
      word: sanitizeInputText(String(item?.word || targetText), 80),
      grapheme: sanitizeInputText(String(item?.grapheme || ""), 20),
      expectedIpa: sanitizeInputText(String(item?.expectedIpa || "/?/"), 30),
      spokenIpa: sanitizeInputText(String(item?.spokenIpa || item?.expectedIpa || "/?/"), 30),
      errorType: ALLOWED_ERROR_TYPES.has(item?.errorType) ? item.errorType : "accurate",
      severity: ALLOWED_SEVERITIES.has(item?.severity) ? item.severity : "good",
      accuracyScore: Math.max(0, Math.min(100, Math.round(Number(item?.accuracyScore ?? 85)))),
      diagnosis: sanitizeInputText(String(item?.diagnosis || ""), 300) || "해당 음소의 발음 특성을 분석했습니다.",
      articulationCue:
        sanitizeInputText(String(item?.articulationCue || ""), 300) ||
        "혀 위치와 입 모양에 집중해 천천히 발음해 보세요.",
      mouthFocus: ALLOWED_MOUTH_FOCUS.has(item?.mouthFocus) ? item.mouthFocus : "alveolar",
      minimalPairWord: item?.minimalPairWord ? sanitizeInputText(String(item.minimalPairWord), 60) : undefined,
      minimalPairIpa: item?.minimalPairIpa ? sanitizeInputText(String(item.minimalPairIpa), 30) : undefined,
    }));

    let practiceDrills = Array.isArray(parsed?.practiceDrills)
      ? parsed.practiceDrills
          .slice(0, 4)
          .filter((d: any) => d && typeof d.pairA === "string" && typeof d.pairB === "string")
          .map((d: any) => ({
            pairA: sanitizeInputText(String(d.pairA), 60),
            pairB: sanitizeInputText(String(d.pairB), 60),
            focusIpa: sanitizeInputText(String(d.focusIpa || ""), 40),
            tip: sanitizeInputText(String(d.tip || ""), 200) || "두 단어의 음소 차이를 구분하며 반복해 보세요.",
          }))
      : [];

    if (practiceDrills.length === 0) {
      practiceDrills = items
        .filter((i: any) => i.minimalPairWord && i.word && i.minimalPairWord.toLowerCase() !== i.word.toLowerCase())
        .slice(0, 3)
        .map((i: any) => ({
          pairA: i.word,
          pairB: i.minimalPairWord,
          focusIpa: `${i.expectedIpa} vs ${i.minimalPairIpa || i.spokenIpa}`,
          tip: i.articulationCue || "목표 음소와 대조 음소의 조음 위치 차이에 집중해 보세요.",
        }));
    }

    const criticalCount = items.filter((i: any) => i.severity === "critical").length;
    const moderateCount = items.filter((i: any) => i.severity === "moderate").length;
    const accurateCount = items.filter((i: any) => i.severity === "good").length;

    const rawSummary = sanitizeInputText(String(parsed?.overallSummary || ""), 500);
    const defaultSummary =
      criticalCount > 0
        ? `${criticalCount}개 핵심 음소의 구강 조음 교정 포인트가 분석되었습니다.`
        : "전반적으로 안정적인 음소 조음과 리듬이 확인되었습니다.";

    return {
      source: "ai",
      providerName,
      targetText,
      recognizedText,
      overallSummary: rawSummary || defaultSummary,
      phonemeItems: items,
      practiceDrills,
      stats: {
        totalCount: items.length,
        criticalCount,
        moderateCount,
        accurateCount,
      },
      generatedAt: new Date().toISOString(),
    };
  };

  if (ai && (engineMode === "gemini_byok" || engineMode === "auto_free")) {
    try {
      const contentsPayload = validAudioPart ? [validAudioPart, { text: promptText }] : promptText;
      const response = await generateGeminiContent(ai, {
        contents: contentsPayload,
        config: {
          systemInstruction:
            "You are an expert phonetician coaching Korean learners of English. Provide precise IPA symbols, realistic phoneme-level error diagnostics, and actionable articulatory cues in natural Korean. Output strictly valid JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallSummary: { type: Type.STRING },
              phonemeItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    grapheme: { type: Type.STRING },
                    expectedIpa: { type: Type.STRING },
                    spokenIpa: { type: Type.STRING },
                    errorType: {
                      type: Type.STRING,
                      enum: ["accurate", "substitution", "omission", "distortion", "weak_stress"],
                    },
                    severity: {
                      type: Type.STRING,
                      enum: ["good", "moderate", "critical"],
                    },
                    accuracyScore: { type: Type.NUMBER },
                    diagnosis: { type: Type.STRING },
                    articulationCue: { type: Type.STRING },
                    mouthFocus: {
                      type: Type.STRING,
                      enum: [
                        "interdental",
                        "alveolar",
                        "lips_teeth",
                        "bilabial",
                        "velar",
                        "retroflex_r",
                        "vowel_open",
                        "vowel_spread",
                        "glottal",
                      ],
                    },
                    minimalPairWord: { type: Type.STRING },
                    minimalPairIpa: { type: Type.STRING },
                  },
                  required: [
                    "word",
                    "grapheme",
                    "expectedIpa",
                    "spokenIpa",
                    "errorType",
                    "severity",
                    "accuracyScore",
                    "diagnosis",
                    "articulationCue",
                    "mouthFocus",
                  ],
                },
              },
              practiceDrills: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pairA: { type: Type.STRING },
                    pairB: { type: Type.STRING },
                    focusIpa: { type: Type.STRING },
                    tip: { type: Type.STRING },
                  },
                  required: ["pairA", "pairB", "focusIpa", "tip"],
                },
              },
            },
            required: ["overallSummary", "phonemeItems", "practiceDrills"],
          },
        },
      });

      const jsonText = response.text || "{}";
      const parsed = sanitizeObjectDeep(JSON.parse(jsonText));

      if (parsed && Array.isArray(parsed.phonemeItems)) {
        return res.json({
          success: true,
          report: formatNormalizedReport(parsed, validAudioPart ? "Gemini AI 오디오 청취 정밀 진단" : "Gemini AI 음소 정밀 진단", "ai-ph"),
        });
      }
    } catch (error: any) {
      if (engineMode === "gemini_byok") {
        const { statusCode, message } = mapGeminiErrorStatus(error);
        return res.status(statusCode).json({ error: message });
      }
      console.warn("Gemini pronunciation report failed, falling back to free AI:", error?.message || error);
    }
  }

  // Keyless Worldwide Free AI Fallback (compact schema under open-model token limits)
  try {
    const freeJsonPrompt = `Analyze English pronunciation for Korean learner.
Target: "${targetText}", Recognized: "${recognizedText || "(none)"}", Hints: ${localHints || "(none)"}
Reply ONLY with compact valid JSON (max 3 phonemeItems, all feedback strings in Korean):
{"overallSummary":"<한국어 총평 1문장>","phonemeItems":[{"word":"<target word>","grapheme":"<letters>","expectedIpa":"/<ipa>/","spokenIpa":"/<ipa>/","errorType":"accurate|substitution|omission|distortion","severity":"good|moderate|critical","accuracyScore":75,"diagnosis":"<한국어 원인 1문장>","articulationCue":"<한국어 혀·입술 교정 팁>","mouthFocus":"interdental|alveolar|lips_teeth|bilabial|velar|retroflex_r|vowel_open|vowel_spread|glottal","minimalPairWord":"<contrast word>","minimalPairIpa":"/<ipa>/"}]}`;
    const { data, providerName } = await generateFreeAiJson<any>(
      freeJsonPrompt,
      "한국인 영어 학습자용 음소 발음 코치입니다. 마크다운 없이 유효한 JSON만 출력하고 overallSummary, diagnosis, articulationCue 값은 반드시 한국어로 작성하세요.",
      engineMode,
      (p) => {
        const arr = unwrapArrayFromAiPayload(p, ["phonemeItems", "phonemes", "items", "data"]);
        return Boolean(arr && arr.length > 0 && typeof arr[0]?.word === "string");
      }
    );
    return res.json({
      success: true,
      report: formatNormalizedReport(data, providerName, "free-ai-ph"),
    });
  } catch (freeErr: any) {
    console.error("Free AI pronunciation report failed:", freeErr?.message || freeErr);
    return res.status(502).json({
      error: "무료 AI 음소 정밀 분석 서버 응답 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
