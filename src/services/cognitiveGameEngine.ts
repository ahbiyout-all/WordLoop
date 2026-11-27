import { VocabItem, SentenceItem, VocabSrsState } from '../types';
import { SrsRating, calculateNextSrsState, resolveVocabSrsState } from './srsEngineService';
import { getCleanKoreanMeaning, getEnglishDefinition } from '../utils/meaningUtils';
import { getSharedAudioContext } from './speechService';

export type ZpdLevel = 1 | 2 | 3 | 4 | 5;
export type ConfidenceJudgment = 'sure' | 'unsure';
export type MetacognitiveQuadrant =
  | 'confident_correct'
  | 'illusion'
  | 'lucky_guess'
  | 'honest_miss';

export type FluencyTag = 'automatic' | 'fluent' | 'effortful' | 'lapse';

export interface ZpdDifficultyProfile {
  level: ZpdLevel;
  label: string;
  shortDesc: string;
  automaticityMs: number;
  timeBonusFactor: number;
  distractorMode: 'clear' | 'balanced' | 'confusable';
  extraSpellingNoise: number;
  rhythmSpeedMultiplier: number;
}

export interface CognitiveAttemptWindowEntry {
  ok: boolean;
  latencyMs: number;
  hints: number;
}

export interface WordLoopCognitiveStats {
  zpdLevel: ZpdLevel;
  avgLatencyMs: number;
  totalAttempts: number;
  correctAttempts: number;
  automaticAttempts: number;
  calibration: {
    confidentCorrect: number;
    illusionOfCompetence: number;
    luckyGuess: number;
    honestMiss: number;
  };
  remediationWordIds: string[];
  recentWindow: CognitiveAttemptWindowEntry[];
  updatedAt: string;
}

export interface FadedScaffoldingHints {
  tier1Title: string;
  tier1Body: string;
  tier1Sub?: string;
  tier2Title: string;
  tier2Body: string;
  tier2Sub?: string;
  tier3Title: string;
  tier3Body: string;
  tier3Sub?: string;
}

export interface CognitiveAttemptEvaluation {
  srsRating: SrsRating;
  nextSrs: VocabSrsState;
  nextMastery: 0 | 1 | 2;
  fluencyTag: FluencyTag;
  fluencyLabel: string;
  quadrant: MetacognitiveQuadrant;
  quadrantLabel: string;
  zpdBefore: ZpdLevel;
  zpdAfter: ZpdLevel;
  zpdChanged: 'up' | 'down' | 'same';
  updatedStats: WordLoopCognitiveStats;
}

const COGNITIVE_STORAGE_KEY = 'wordloop_cognitive_stats_v1';
export const COGNITIVE_UPDATED_EVENT = 'wordloop:cognitive-updated';

const ZPD_PROFILES: Record<ZpdLevel, ZpdDifficultyProfile> = {
  1: {
    level: 1,
    label: 'Lv.1 기초 안정',
    shortDesc: '명확한 보기 · 넉넉한 반응 시간',
    automaticityMs: 3600,
    timeBonusFactor: 1.25,
    distractorMode: 'clear',
    extraSpellingNoise: 0,
    rhythmSpeedMultiplier: 0.85,
  },
  2: {
    level: 2,
    label: 'Lv.2 유창 진입',
    shortDesc: '기본 변별 · 안정적 인출 속도',
    automaticityMs: 3000,
    timeBonusFactor: 1.1,
    distractorMode: 'clear',
    extraSpellingNoise: 0,
    rhythmSpeedMultiplier: 0.95,
  },
  3: {
    level: 3,
    label: 'Lv.3 표준 ZPD',
    shortDesc: '균형 잡힌 도전과 정밀 복습',
    automaticityMs: 2500,
    timeBonusFactor: 1.0,
    distractorMode: 'balanced',
    extraSpellingNoise: 1,
    rhythmSpeedMultiplier: 1.0,
  },
  4: {
    level: 4,
    label: 'Lv.4 심화 변별',
    shortDesc: '유사 철자·품사 혼동 보기 강화',
    automaticityMs: 2100,
    timeBonusFactor: 0.9,
    distractorMode: 'confusable',
    extraSpellingNoise: 1,
    rhythmSpeedMultiplier: 1.12,
  },
  5: {
    level: 5,
    label: 'Lv.5 자동화 마스터',
    shortDesc: '고난도 변별 · 1.8초 이내 즉각 인출',
    automaticityMs: 1800,
    timeBonusFactor: 0.82,
    distractorMode: 'confusable',
    extraSpellingNoise: 2,
    rhythmSpeedMultiplier: 1.25,
  },
};

export function createDefaultCognitiveStats(): WordLoopCognitiveStats {
  return {
    zpdLevel: 2,
    avgLatencyMs: 2800,
    totalAttempts: 0,
    correctAttempts: 0,
    automaticAttempts: 0,
    calibration: {
      confidentCorrect: 0,
      illusionOfCompetence: 0,
      luckyGuess: 0,
      honestMiss: 0,
    },
    remediationWordIds: [],
    recentWindow: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadCognitiveStats(): WordLoopCognitiveStats {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createDefaultCognitiveStats();
    }
    const raw = window.localStorage.getItem(COGNITIVE_STORAGE_KEY);
    if (!raw) return createDefaultCognitiveStats();
    const parsed = JSON.parse(raw) as Partial<WordLoopCognitiveStats>;
    const defaults = createDefaultCognitiveStats();
    const zpdCandidate = Number(parsed.zpdLevel);
    const validZpd: ZpdLevel =
      zpdCandidate >= 1 && zpdCandidate <= 5 ? (zpdCandidate as ZpdLevel) : 2;
    return {
      zpdLevel: validZpd,
      avgLatencyMs:
        typeof parsed.avgLatencyMs === 'number' && Number.isFinite(parsed.avgLatencyMs)
          ? Math.max(400, Math.min(15000, Math.round(parsed.avgLatencyMs)))
          : defaults.avgLatencyMs,
      totalAttempts: Number(parsed.totalAttempts) || 0,
      correctAttempts: Number(parsed.correctAttempts) || 0,
      automaticAttempts: Number(parsed.automaticAttempts) || 0,
      calibration: {
        confidentCorrect: Number(parsed.calibration?.confidentCorrect) || 0,
        illusionOfCompetence: Number(parsed.calibration?.illusionOfCompetence) || 0,
        luckyGuess: Number(parsed.calibration?.luckyGuess) || 0,
        honestMiss: Number(parsed.calibration?.honestMiss) || 0,
      },
      remediationWordIds: Array.isArray(parsed.remediationWordIds)
        ? parsed.remediationWordIds.filter((id): id is string => typeof id === 'string').slice(0, 60)
        : [],
      recentWindow: Array.isArray(parsed.recentWindow)
        ? parsed.recentWindow
            .filter(
              (entry): entry is CognitiveAttemptWindowEntry =>
                Boolean(entry) &&
                typeof entry.ok === 'boolean' &&
                typeof entry.latencyMs === 'number'
            )
            .slice(-15)
        : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : defaults.updatedAt,
    };
  } catch {
    return createDefaultCognitiveStats();
  }
}

export function saveCognitiveStats(stats: WordLoopCognitiveStats): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(COGNITIVE_STORAGE_KEY, JSON.stringify(stats));
    window.dispatchEvent(new CustomEvent(COGNITIVE_UPDATED_EVENT, { detail: stats }));
  } catch {
    // Ignore storage quota / private mode failures gracefully
  }
}

export function getZpdProfile(level: ZpdLevel | number): ZpdDifficultyProfile {
  const clamped = Math.max(1, Math.min(5, Math.round(level || 2))) as ZpdLevel;
  return ZPD_PROFILES[clamped];
}

export function calculateCalibrationSummary(stats: WordLoopCognitiveStats): {
  totalCalibrated: number;
  calibrationAccuracyPct: number;
  illusionRatePct: number;
  automaticityPct: number;
  overallAccuracyPct: number;
} {
  const { confidentCorrect, illusionOfCompetence, luckyGuess, honestMiss } = stats.calibration;
  const totalCalibrated = confidentCorrect + illusionOfCompetence + luckyGuess + honestMiss;
  const calibrationAccuracyPct =
    totalCalibrated > 0
      ? Math.round(((confidentCorrect + honestMiss) / totalCalibrated) * 100)
      : 0;
  const illusionRatePct =
    totalCalibrated > 0 ? Math.round((illusionOfCompetence / totalCalibrated) * 100) : 0;
  const automaticityPct =
    stats.totalAttempts > 0 ? Math.round((stats.automaticAttempts / stats.totalAttempts) * 100) : 0;
  const overallAccuracyPct =
    stats.totalAttempts > 0 ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100) : 0;

  return {
    totalCalibrated,
    calibrationAccuracyPct,
    illusionRatePct,
    automaticityPct,
    overallAccuracyPct,
  };
}

/**
 * Unbiased Fisher-Yates shuffle
 */
export function shuffleFisherYates<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Curate an interleaved ZPD + SM-2 SRS vocabulary queue.
 * Mixes priority remediation / due reviews / new / mastered maintenance so games become active retrieval engines.
 */
export function buildAdaptiveVocabQueue(
  words: VocabItem[],
  stats: WordLoopCognitiveStats = loadCognitiveStats(),
  maxCount?: number,
  focusMode: 'adaptive' | 'weak_only' = 'adaptive',
  nowMs: number = Date.now()
): VocabItem[] {
  if (!words || words.length === 0) return [];

  const targetCount = maxCount ? Math.min(words.length, maxCount) : words.length;
  const remediationSet = new Set(stats.remediationWordIds);

  const remediationBucket: VocabItem[] = [];
  const dueBucket: VocabItem[] = [];
  const newBucket: VocabItem[] = [];
  const masteredBucket: VocabItem[] = [];

  for (const item of words) {
    const level = item.masteryLevel ?? (item.isLearned ? 2 : 0);
    const hasLapse = (item.srs?.lapseCount || 0) > 0;
    const isRemediate = remediationSet.has(item.id) || hasLapse;

    if (isRemediate) {
      remediationBucket.push(item);
      continue;
    }

    if (item.srs) {
      const dueMs = new Date(item.srs.nextReviewAt).getTime();
      if (!isNaN(dueMs) && dueMs <= nowMs) {
        dueBucket.push(item);
      } else if (level === 2) {
        masteredBucket.push(item);
      } else {
        dueBucket.push(item);
      }
    } else if (level === 2) {
      masteredBucket.push(item);
    } else if (level === 1) {
      dueBucket.push(item);
    } else {
      newBucket.push(item);
    }
  }

  const rPool = shuffleFisherYates(remediationBucket);
  const dPool = shuffleFisherYates(dueBucket);
  const nPool = shuffleFisherYates(newBucket);
  const mPool = shuffleFisherYates(masteredBucket);

  const result: VocabItem[] = [];
  const usedIds = new Set<string>();

  const pushNext = (bucket: VocabItem[]): boolean => {
    while (bucket.length > 0) {
      const candidate = bucket.shift();
      if (candidate && !usedIds.has(candidate.id)) {
        usedIds.add(candidate.id);
        result.push(candidate);
        return true;
      }
    }
    return false;
  };

  // Interleaved pattern per 10-item block:
  // adaptive: ~30% remediation/lapsed, ~35% due, ~25% new, ~10% mastered
  // weak_only: remediation -> due -> new -> mastered fallback
  const pattern: Array<'R' | 'D' | 'N' | 'M'> =
    focusMode === 'weak_only'
      ? ['R', 'D', 'R', 'D', 'N', 'R', 'D', 'N']
      : ['R', 'D', 'N', 'R', 'D', 'M', 'D', 'N', 'R', 'D'];

  let step = 0;
  while (result.length < targetCount) {
    const slot = pattern[step % pattern.length];
    step += 1;
    let pushed = false;
    if (slot === 'R') pushed = pushNext(rPool);
    else if (slot === 'D') pushed = pushNext(dPool);
    else if (slot === 'N') pushed = pushNext(nPool);
    else pushed = pushNext(mPool);

    if (!pushed) {
      pushed =
        pushNext(rPool) ||
        pushNext(dPool) ||
        pushNext(nPool) ||
        pushNext(mPool);
    }
    if (!pushed) break;
  }

  return result;
}

/**
 * Curate interleaved adaptive sentence queue (40% new/level 0 · 35% learning/level 1 · 25% mastered review)
 */
export function buildAdaptiveSentenceQueue(
  sentences: SentenceItem[],
  maxCount?: number
): SentenceItem[] {
  if (!sentences || sentences.length === 0) return [];
  const targetCount = maxCount ? Math.min(sentences.length, maxCount) : sentences.length;

  const newPool: SentenceItem[] = [];
  const learningPool: SentenceItem[] = [];
  const masteredPool: SentenceItem[] = [];

  for (const s of sentences) {
    const level = s.masteryLevel ?? (s.isLearned ? 2 : 0);
    if (level === 2) masteredPool.push(s);
    else if (level === 1) learningPool.push(s);
    else newPool.push(s);
  }

  const l0 = shuffleFisherYates(newPool);
  const l1 = shuffleFisherYates(learningPool);
  const l2 = shuffleFisherYates(masteredPool);

  const out: SentenceItem[] = [];
  const seen = new Set<string>();
  const pushOne = (arr: SentenceItem[]): boolean => {
    while (arr.length > 0) {
      const next = arr.shift();
      if (next && !seen.has(next.id)) {
        seen.add(next.id);
        out.push(next);
        return true;
      }
    }
    return false;
  };

  const pattern: Array<'0' | '1' | '2'> = ['0', '1', '0', '2', '1', '0', '1', '2'];
  let idx = 0;
  while (out.length < targetCount) {
    const slot = pattern[idx % pattern.length];
    idx += 1;
    const pushed =
      (slot === '0' && pushOne(l0)) ||
      (slot === '1' && pushOne(l1)) ||
      (slot === '2' && pushOne(l2)) ||
      pushOne(l0) ||
      pushOne(l1) ||
      pushOne(l2);
    if (!pushed) break;
  }

  return out;
}

/**
 * Select distractors adapted to learner ZPD level:
 * - Lv.1-2: Clearly distinct distractors (different length / POS / starting letter)
 * - Lv.3: Balanced mix
 * - Lv.4-5: Confusable distractors (same POS / similar prefix or length)
 */
export function selectZpdDistractors(
  target: VocabItem,
  pool: VocabItem[],
  zpdLevel: ZpdLevel,
  count: number,
  getValue: (item: VocabItem) => string
): VocabItem[] {
  const targetVal = getValue(target).trim().toLowerCase();
  const targetWord = (target.word || '').trim().toLowerCase();
  const targetPos = (target.partOfSpeech || '').trim().toLowerCase();

  const seenValues = new Set<string>([targetVal]);
  const candidates: Array<{ item: VocabItem; similarity: number }> = [];

  for (const item of pool) {
    if (item.id === target.id) continue;
    const val = getValue(item).trim();
    const normVal = val.toLowerCase();
    if (!normVal || seenValues.has(normVal)) continue;
    seenValues.add(normVal);

    const w = (item.word || '').trim().toLowerCase();
    let similarity = 0;
    if (targetPos && (item.partOfSpeech || '').trim().toLowerCase() === targetPos) {
      similarity += 3;
    }
    if (targetWord && w && targetWord[0] === w[0]) {
      similarity += 3;
    }
    if (targetWord && w && Math.abs(targetWord.length - w.length) <= 2) {
      similarity += 2;
    }
    if (
      targetWord.length >= 4 &&
      w.length >= 4 &&
      targetWord.slice(-2) === w.slice(-2)
    ) {
      similarity += 2;
    }

    candidates.push({ item, similarity });
  }

  const profile = getZpdProfile(zpdLevel);
  const jittered = candidates.map((entry) => ({
    ...entry,
    jitter: Math.random() * 1.4,
  }));

  if (profile.distractorMode === 'confusable') {
    jittered.sort((a, b) => b.similarity + b.jitter - (a.similarity + a.jitter));
  } else if (profile.distractorMode === 'clear') {
    jittered.sort((a, b) => a.similarity + a.jitter - (b.similarity + b.jitter));
  } else {
    // balanced: shuffle first then mild similarity bias
    const shuffled = shuffleFisherYates(jittered);
    return shuffled.slice(0, count).map((e) => e.item);
  }

  return jittered.slice(0, count).map((e) => e.item);
}

function detectMorphologyCue(word: string): string | null {
  const lower = word.toLowerCase().trim();
  const prefixes: Array<[string, string]> = [
    ['un', '접두사 un- (반대·부정)'],
    ['re', '접두사 re- (다시·뒤로)'],
    ['pre', '접두사 pre- (미리·앞)'],
    ['dis', '접두사 dis- (분리·부정)'],
    ['mis', '접두사 mis- (잘못된)'],
    ['inter', '접두사 inter- (서로·사이)'],
    ['trans', '접두사 trans- (건너·변화)'],
    ['sub', '접두사 sub- (아래·하위)'],
    ['over', '접두사 over- (초과·위)'],
    ['anti', '접두사 anti- (반대)'],
    ['auto', '접두사 auto- (스스로)'],
    ['tele', '접두사 tele- (멀리)'],
  ];
  for (const [pref, desc] of prefixes) {
    if (lower.startsWith(pref) && lower.length > pref.length + 2) {
      return desc;
    }
  }

  const suffixes: Array<[string, string]> = [
    ['tion', '접미사 -tion (행위·상태 명사)'],
    ['sion', '접미사 -sion (명사화)'],
    ['ment', '접미사 -ment (결과·상태 명사)'],
    ['ness', '접미사 -ness (성질 명사)'],
    ['able', '접미사 -able (~할 수 있는 형용사)'],
    ['ible', '접미사 -ible (~할 수 있는 형용사)'],
    ['less', '접미사 -less (~이 없는 형용사)'],
    ['ful', '접미사 -ful (~이 가득한 형용사)'],
    ['ous', '접미사 -ous (~의 성질 형용사)'],
    ['ize', '접미사 -ize (~화하다 동사)'],
    ['ly', '접미사 -ly (방식·정도 부사)'],
  ];
  for (const [suf, desc] of suffixes) {
    if (lower.endsWith(suf) && lower.length > suf.length + 2) {
      return desc;
    }
  }

  return null;
}

export function maskTargetWordInSentence(sentence: string, word: string): string {
  if (!sentence || !word) return sentence || '';
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}(?:s|es|ed|ing|d)?\\b`, 'gi');
  const blank = '______';
  if (regex.test(sentence)) {
    return sentence.replace(regex, blank);
  }
  return sentence;
}

/**
 * Build 3-tier Faded Scaffolding hints for a vocabulary word
 */
export function buildFadedScaffoldingHints(item: VocabItem): FadedScaffoldingHints {
  const cleanWord = (item.word || '').trim();
  const lettersOnly = cleanWord.replace(/[^a-zA-Z]/g, '');
  const len = lettersOnly.length;

  const maskedSentence = item.sentence
    ? maskTargetWordInSentence(item.sentence, cleanWord)
    : '';

  const tier1Body = maskedSentence
    ? `"${maskedSentence}"`
    : `품사 단서: [${item.partOfSpeech || '어휘'}] 문맥에서 핵심 역할을 하는 단어입니다.`;
  const tier1Sub = item.sentenceMeaning
    ? `해석 흐름: ${item.sentenceMeaning}`
    : undefined;

  const skeleton =
    len <= 2
      ? `${cleanWord[0] || ''}${' _'.repeat(Math.max(0, len - 1))}`
      : `${cleanWord[0]} ${'_ '.repeat(Math.max(1, len - 2))}${cleanWord[cleanWord.length - 1]}`;
  const morph = detectMorphologyCue(cleanWord);
  const ipaCue = item.ipa ? ` · 발음 ${item.ipa}` : '';
  const tier2Body = `철자 골격: ${skeleton} (${len}글자 · ${item.partOfSpeech || 'n.'}${ipaCue})`;
  const tier2Sub = morph
    ? `형태소 힌트: ${morph}`
    : `발음 듣기 버튼으로 음절 리듬을 먼저 떠올려 보세요.`;

  const koMeaning = getCleanKoreanMeaning(item);
  const enDef = getEnglishDefinition(item);
  const tier3Body = `핵심 의미: ${koMeaning}`;
  const tier3Sub = item.tip
    ? `암기 팁: ${item.tip}`
    : enDef && enDef !== cleanWord
    ? `영영 풀이: ${enDef}`
    : item.sentence || undefined;

  return {
    tier1Title: '1단계 · 문맥 예문 단서',
    tier1Body,
    tier1Sub,
    tier2Title: '2단계 · 음운·철자 구조 단서',
    tier2Body,
    tier2Sub,
    tier3Title: '3단계 · 의미 대조 & 이중부호화',
    tier3Body,
    tier3Sub,
  };
}

/**
 * Evaluate a single retrieval attempt, update ZPD + calibration stats, and compute SM-2 rating
 */
export function recordCognitiveAttempt(params: {
  itemId: string;
  isCorrect: boolean;
  latencyMs: number;
  hintTierUsed?: 0 | 1 | 2 | 3;
  confidence?: ConfidenceJudgment;
  srsState?: VocabSrsState;
  fallbackMastery?: 0 | 1 | 2;
}): CognitiveAttemptEvaluation {
  const stats = loadCognitiveStats();
  const zpdBefore = stats.zpdLevel;
  const profile = getZpdProfile(zpdBefore);
  const hints = params.hintTierUsed ?? 0;
  const clampedLatency = Math.max(250, Math.min(20000, Math.round(params.latencyMs || 2500)));

  // Determine confidence quadrant
  const confidence: ConfidenceJudgment = params.confidence ?? (hints >= 2 ? 'unsure' : 'sure');
  let quadrant: MetacognitiveQuadrant;
  let quadrantLabel: string;
  if (params.isCorrect && confidence === 'sure') {
    quadrant = 'confident_correct';
    quadrantLabel = '정확한 확신';
    stats.calibration.confidentCorrect += 1;
  } else if (!params.isCorrect && confidence === 'sure') {
    quadrant = 'illusion';
    quadrantLabel = '아는 착각 교정 필요';
    stats.calibration.illusionOfCompetence += 1;
  } else if (params.isCorrect && confidence === 'unsure') {
    quadrant = 'lucky_guess';
    quadrantLabel = '불확실 정답 · 재확인';
    stats.calibration.luckyGuess += 1;
  } else {
    quadrant = 'honest_miss';
    quadrantLabel = '정직한 미숙지';
    stats.calibration.honestMiss += 1;
  }

  // Determine automaticity / fluency tag + SM-2 rating
  let fluencyTag: FluencyTag;
  let fluencyLabel: string;
  let srsRating: SrsRating;

  if (!params.isCorrect) {
    fluencyTag = 'lapse';
    fluencyLabel = quadrant === 'illusion' ? '아는 착각 · 즉시 재인출' : '오답 · 간격 재설정';
    srsRating = 'again';
  } else if (hints >= 2 || quadrant === 'lucky_guess' || clampedLatency > profile.automaticityMs * 2) {
    fluencyTag = 'effortful';
    fluencyLabel = quadrant === 'lucky_guess' ? '운 좋은 정답 · 단기 복습' : '숙고 인출 · 1일 후 확인';
    srsRating = 'hard';
  } else if (hints === 0 && clampedLatency <= profile.automaticityMs && confidence === 'sure') {
    fluencyTag = 'automatic';
    fluencyLabel = `자동화 (${(clampedLatency / 1000).toFixed(1)}s)`;
    srsRating = 'easy';
  } else {
    fluencyTag = 'fluent';
    fluencyLabel = `안정 인출 (${(clampedLatency / 1000).toFixed(1)}s)`;
    srsRating = 'good';
  }

  const resolvedBase =
    params.srsState ||
    resolveVocabSrsState({
      id: params.itemId,
      word: '',
      meaning: '',
      partOfSpeech: 'n.',
      sentence: '',
      sentenceMeaning: '',
      categoryId: 'elementary',
      masteryLevel: params.fallbackMastery ?? 0,
    });

  const { srs: nextSrs, masteryLevel: nextMastery } = calculateNextSrsState(
    resolvedBase,
    srsRating,
    params.fallbackMastery ?? 0
  );

  // Update EMA latency and rolling accuracy window
  stats.totalAttempts += 1;
  if (params.isCorrect) {
    stats.correctAttempts += 1;
  }
  if (fluencyTag === 'automatic') {
    stats.automaticAttempts += 1;
  }

  const alpha = stats.totalAttempts <= 5 ? 0.35 : 0.18;
  stats.avgLatencyMs = Math.round(stats.avgLatencyMs * (1 - alpha) + clampedLatency * alpha);

  // Update remediation priority queue
  const nextRemSet = new Set(stats.remediationWordIds);
  if (!params.isCorrect || quadrant === 'lucky_guess') {
    nextRemSet.delete(params.itemId);
    stats.remediationWordIds = [params.itemId, ...Array.from(nextRemSet)].slice(0, 60);
  } else if (fluencyTag === 'automatic' || (params.isCorrect && hints === 0)) {
    nextRemSet.delete(params.itemId);
    stats.remediationWordIds = Array.from(nextRemSet);
  }

  // Rolling ZPD automatic adaptation
  stats.recentWindow = [
    ...stats.recentWindow,
    { ok: params.isCorrect, latencyMs: clampedLatency, hints },
  ].slice(-12);

  let zpdAfter: ZpdLevel = zpdBefore;
  if (stats.recentWindow.length >= 6) {
    const recentSlice = stats.recentWindow.slice(-8);
    const acc = recentSlice.filter((r) => r.ok).length / recentSlice.length;
    const meanLat = recentSlice.reduce((sum, r) => sum + r.latencyMs, 0) / recentSlice.length;
    const meanHints = recentSlice.reduce((sum, r) => sum + r.hints, 0) / recentSlice.length;

    if (
      acc >= 0.85 &&
      meanLat <= profile.automaticityMs * 1.1 &&
      meanHints <= 0.35 &&
      zpdBefore < 5
    ) {
      zpdAfter = (zpdBefore + 1) as ZpdLevel;
      stats.recentWindow = []; // Reset window cleanly after level shift
    } else if (acc < 0.6 && zpdBefore > 1) {
      zpdAfter = (zpdBefore - 1) as ZpdLevel;
      stats.recentWindow = [];
    }
  }

  stats.zpdLevel = zpdAfter;
  stats.updatedAt = new Date().toISOString();
  saveCognitiveStats(stats);

  return {
    srsRating,
    nextSrs,
    nextMastery,
    fluencyTag,
    fluencyLabel,
    quadrant,
    quadrantLabel,
    zpdBefore,
    zpdAfter,
    zpdChanged: zpdAfter > zpdBefore ? 'up' : zpdAfter < zpdBefore ? 'down' : 'same',
    updatedStats: stats,
  };
}

/**
 * Gentle Web Audio cognitive cue sound (strictly respects audio failures / browser policies)
 */
export function playCognitiveCueSound(
  type: 'correct' | 'illusion' | 'hint' | 'zpd_up'
): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'illusion') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.linearRampToValueAtTime(165, now + 0.22);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (type === 'hint') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.22);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Silent fallback when Web Audio is restricted
  }
}
