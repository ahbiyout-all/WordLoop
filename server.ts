import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Disable Express server signature header
app.disable("x-powered-by");

// Security HTTP response headers middleware
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  next();
});

// Strict JSON body payload limit (256KB) to prevent payload DoS
app.use(express.json({ limit: "256kb" }));

// Lightweight in-memory rate limiter for /api/* endpoints (max 60 req/min per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;

app.use("/api", (req, res, next) => {
  const now = Date.now();
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  const record = rateLimitMap.get(clientIp);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    record.count += 1;
    if (record.count > RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({
        error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      });
    }
  }

  // Periodic cleanup of expired rate limit entries
  if (rateLimitMap.size > 500) {
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now > data.resetAt) rateLimitMap.delete(ip);
    }
  }

  next();
});

// Input sanitization & validation helpers
function sanitizeInputText(val: unknown, maxLength: number = 500): string {
  if (typeof val !== "string") return "";
  return val.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLength);
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

// Target Gemini models with automatic fallback candidate chain (official supported models)
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
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

// Initialize Google Gen AI client lazy/safely with optional custom API Key (BYOK)
function getGeminiClient(customApiKey?: string) {
  const apiKey = (customApiKey && customApiKey.trim().length > 0) ? customApiKey.trim() : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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

    // 5. Enhance & Translate via Gemini AI (Header-only BYOK for security)
    const customKey = extractSafeHeaderApiKey(req);
    const ai = getGeminiClient(customKey);
    let aiEnhancement: any = null;

    if (ai) {
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
        aiEnhancement = JSON.parse(jsonText);
      } catch (e: any) {
        console.info("Gemini dictionary offline fallback served:", e?.status || e?.code || "offline mode");
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
        aiEnhancement ? "Gemini AI Language Engine" : null,
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
  const ai = getGeminiClient(customKey);

  if (ai) {
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
      const rawList = JSON.parse(jsonText);
      // Sanitize generated list to guarantee Korean meanings
      const vocabList = Array.isArray(rawList)
        ? rawList.map((item: any) => {
            const wLower = (item.word || '').trim().toLowerCase();
            let cleanMeaning = item.meaning || '';
            if (!/[\u3131-\u318E\uAC00-\uD7A3]/.test(cleanMeaning) && curriculumLookup[wLower]) {
              cleanMeaning = curriculumLookup[wLower];
            }
            let cleanSentenceMeaning = item.sentenceMeaning || '';
            if (!/[\u3131-\u318E\uAC00-\uD7A3]/.test(cleanSentenceMeaning)) {
              cleanSentenceMeaning = `"${cleanMeaning || item.word}"에 관련된 실용 예문입니다.`;
            }
            return {
              ...item,
              meaning: cleanMeaning,
              sentenceMeaning: cleanSentenceMeaning,
            };
          })
        : [];

      if (vocabList.length > 0) {
        return res.json({ success: true, items: vocabList });
      }
    } catch (error: any) {
      console.info("Gemini AI Vocab offline fallback served:", error?.status || error?.code || "offline mode");
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
  const ai = getGeminiClient(customKey);

  if (ai) {
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
        return res.json({ success: true, explanation: response.text });
      }
    } catch (error: any) {
      console.info("Gemini AI explanation offline fallback served:", error?.status || error?.code || "offline mode");
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
  const ai = getGeminiClient(customKey);

  if (ai) {
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
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({ success: true, goals: parsed });
      }
    } catch (error: any) {
      console.info("Gemini Goal recommendation offline fallback served:", error?.status || error?.code || "offline mode");
    }
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
  const scenario = req.body?.scenario && typeof req.body.scenario === "object" ? req.body.scenario : null;
  const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-12) : [];
  const userMessage = sanitizeInputText(req.body?.userMessage, 600);
  const completedMissions = Array.isArray(req.body?.completedMissions) ? req.body.completedMissions.slice(0, 20) : [];
  if (!scenario || !userMessage) {
    return res.status(400).json({ error: "시나리오 정보와 사용자 메시지가 필요합니다." });
  }

  const customKey = extractSafeHeaderApiKey(req);
  const ai = getGeminiClient(customKey);

  if (ai) {
    try {
      // Build conversation dialogue context
      const formattedHistory = messages
        .slice(-8)
        .map((m: any) => `${m.sender === "ai" ? scenario.partnerName : "User"}: "${m.text}"`)
        .join("\n");

      const missionListStr = (scenario.missions || [])
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
      const parsed = JSON.parse(jsonText);
      if (parsed?.aiResponse?.en) {
        return res.json({
          success: true,
          aiResponse: parsed.aiResponse,
          feedback: parsed.feedback,
          newCompletedMissionIds: parsed.newCompletedMissionIds || [],
          recommendedNextHints: parsed.recommendedNextHints || [],
          isFallback: false,
        });
      }
    } catch (error: any) {
      console.info("Gemini Roleplay chat offline fallback served:", error?.status || error?.code || "offline mode");
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
  const scenario = req.body?.scenario && typeof req.body.scenario === "object" ? req.body.scenario : null;
  const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-30) : [];
  const completedMissions = Array.isArray(req.body?.completedMissions) ? req.body.completedMissions.slice(0, 20) : [];
  if (!scenario || messages.length === 0) {
    return res.status(400).json({ error: "시나리오 및 대화 기록이 필요합니다." });
  }

  const customKey = extractSafeHeaderApiKey(req);
  const ai = getGeminiClient(customKey);

  const totalMissionsCount = scenario.missions?.length || 3;
  const completedCount = completedMissions.length;
  const missionScoreCalc = Math.round((completedCount / totalMissionsCount) * 100);

  if (ai) {
    try {
      const fullTranscript = messages
        .map((m: any) => `${m.sender === "ai" ? scenario.partnerName : "Learner"}: "${m.text}"`)
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
      const parsed = JSON.parse(jsonText);
      if (parsed?.overallScore) {
        return res.json({
          success: true,
          report: {
            scenarioId: scenario.id,
            scenarioTitle: scenario.title,
            overallScore: parsed.overallScore,
            fluencyScore: parsed.fluencyScore,
            accuracyScore: parsed.accuracyScore,
            vocabularyScore: parsed.vocabularyScore,
            missionScore: parsed.missionScore || missionScoreCalc,
            feedbackSummary: parsed.feedbackSummary,
            strengths: parsed.strengths || [],
            improvements: parsed.improvements || [],
            highlightPhrases: parsed.highlightPhrases || [],
          },
        });
      }
    } catch (error: any) {
      console.info("Gemini Roleplay report offline fallback served:", error?.status || error?.code || "offline mode");
    }
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
