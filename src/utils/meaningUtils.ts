import { VocabItem, QAMode } from '../types';
import { EMBEDDED_DICTIONARY } from '../data/embeddedDictionary';
import { COMMON_ENGLISH_DEFINITIONS } from '../data/englishDefinitions';
import officialCurriculumData from '../data/officialCurriculum3000Data.json';

// Authoritative index of all 3200+ curriculum words to guaranteed Korean meanings
const CURRICULUM_3000_LOOKUP: Record<string, string> = {};
if (Array.isArray(officialCurriculumData)) {
  for (const it of (officialCurriculumData as Array<{ word: string; meaning: string }>)) {
    if (it.word && it.meaning) {
      CURRICULUM_3000_LOOKUP[it.word.trim().toLowerCase()] = it.meaning.trim();
    }
  }
}

// Dictionary fallback map for high frequency curriculum words
const CURRICULUM_KOREAN_DICT: Record<string, string> = {
  destiny: "운명, 숙명",
  destroy: "파괴하다, 망치다",
  detail: "세부 사항, 상세히 설명하다",
  detect: "감지하다, 발견하다",
  develop: "발전시키다, 개발하다",
  device: "장치, 기기",
  devil: "악마, 마귀",
  devote: "바치다, 헌신하다",
  cable: "케이블, 전선",
  cage: "새장, 우리",
  cake: "케이크",
  calculate: "계산하다",
  calculator: "계산기",
  calendar: "달력, 일정표",
  call: "부르다, 전화하다",
  calm: "차분한, 침착한",
  camera: "카메라",
  camp: "캠프, 야영지",
  campaign: "캠페인, 운동",
  can: "~할 수 있다, 깡통",
  cancel: "취소하다",
  cancer: "암, 악성 종양",
  candidate: "후보자, 지원자",
  candy: "사탕",
  canvas: "캔버스, 화폭",
  cap: "모자, 뚜껑",
  capable: "~할 수 있는, 유능한",
  cape: "망토, 곶",
  capital: "수도, 자본, 대문자",
  captain: "선장, 주장",
  capture: "포획하다, 포착하다",
  car: "자동차",
  card: "카드, 명함",
  care: "돌봄, 걱정하다",
  career: "경력, 직업",
  carpet: "카펫, 양탄자",
  carrot: "당근",
  carry: "나르다, 운반하다",
  wear: "입다, 착용하다",
  weather: "날씨, 기상",
  weave: "짜다, 엮다",
  website: "웹사이트",
  wedding: "결혼식",
  weed: "잡초",
  week: "주, 일주일",
  weekend: "주말",
  weigh: "무게를 달다",
  weight: "무게, 체중",
  weird: "기이한, 기괴한",
  welcome: "환영하다, 환영하는",
  welfare: "복지, 후생",
  well: "잘, 우물",
  west: "서쪽",
  wet: "젖은",
  whale: "고래",
  what: "무엇",
  wheat: "밀",
  wheel: "바퀴",
  when: "언제",
  where: "어디에",
  whereas: "~인 반면에",
  whether: "~인지 아닌지",
  which: "어느 것",
  while: "~하는 동안",
  whip: "채찍질하다",
  whisper: "속삭이다",
  whistle: "휘파람을 불다",
  white: "하얀색의",
  who: "누구",
  whole: "전체의",
  why: "왜",
  wicked: "사악한",
  wide: "넓은",
  wife: "아내",
  wild: "야생의",
  will: "~할 것이다, 의지",
  win: "이기다",
  wind: "바람",
  window: "창문",
  wine: "와인",
  wing: "날개",
  winter: "겨울",
  wipe: "닦다",
  wire: "전선, 와이어",
  wise: "지혜로운",
  wish: "바라다, 소원",
  wit: "재치, 기지",
  with: "~와 함께",
  withdraw: "철회하다, 인출하다",
  within: "~ 이내에",
  without: "~ 없이",
  witness: "목격자, 증인",
  woman: "여성",
  wonder: "궁금해하다, 경이",
  wood: "나무, 목재",
  wool: "양모",
  word: "단어, 말",
  work: "일하다, 작품",
  world: "세계, 세상",
  worry: "걱정하다",
  worship: "예배하다, 숭배하다",
  worth: "가치가 있는",
  would: "~일 것이다",
  wound: "상처, 부상",
  wrap: "싸다, 포장하다",
  wreck: "난파선, 파괴하다",
  write: "쓰다, 작성하다",
  wrong: "틀린, 잘못된",
  year: "해, 년",
  yell: "소리치다",
  yellow: "노란색",
  yes: "네, 예",
  yesterday: "어제",
  yet: "아직",
  yield: "산출하다, 양보하다",
  you: "당신, 너",
  young: "젊은, 어린",
  zero: "0, 제로",
  zone: "구역, 지대",
  zoo: "동물원"
};

/**
 * Cleanly extract or translate Korean meaning from a VocabItem
 */
export function getCleanKoreanMeaning(
  item: VocabItem | { word: string; meaning?: string; sentenceMeaning?: string } | null | undefined
): string {
  if (!item) return '';

  const wordTrimmed = (item.word || '').trim();
  const wordLower = wordTrimmed.toLowerCase();

  // 1. Check Official Curriculum 3000 Guaranteed Korean Dictionary
  if (CURRICULUM_3000_LOOKUP[wordLower]) {
    return CURRICULUM_3000_LOOKUP[wordLower];
  }

  // 2. Check specialized Embedded Dictionary
  if (EMBEDDED_DICTIONARY[wordLower]?.koreanMeaning) {
    const dictMeaning = EMBEDDED_DICTIONARY[wordLower].koreanMeaning.trim();
    if (dictMeaning && !dictMeaning.toLowerCase().includes(wordLower)) {
      return dictMeaning;
    }
  }

  // 3. Check Curriculum High Frequency Korean Dict
  if (CURRICULUM_KOREAN_DICT[wordLower]) {
    return CURRICULUM_KOREAN_DICT[wordLower];
  }

  // 4. Process item.meaning
  const rawMeaning = item.meaning || '';
  const sanitized = rawMeaning
    .replace(/\(교육부 필수 어휘\)/gi, '')
    .replace(/\(교육부 파생 어휘\)/gi, '')
    .replace(/\(관련 어휘\)/gi, '')
    .replace(/\([a-zA-Z\s\-\/]+의\s*(?:관련|파생)\s*어휘\)/gi, '')
    .replace(/^[a-zA-Z\s\-]+(?=\s*\(|\s*$)/, '') // Strip leading English word if any
    .trim();

  // If sanitized meaning contains Korean characters and is not just the English word
  const hasKorean = /[\u3131-\u318E\uAC00-\uD7A3]/.test(sanitized);
  if (hasKorean && !sanitized.toLowerCase().includes(wordLower)) {
    return sanitized;
  }

  // 5. Try extracting from sentenceMeaning if available
  if (item.sentenceMeaning) {
    const quoteMatch = item.sentenceMeaning.match(/"([^"]+)"/);
    if (
      quoteMatch &&
      quoteMatch[1] &&
      /[\u3131-\u318E\uAC00-\uD7A3]/.test(quoteMatch[1]) &&
      !quoteMatch[1].toLowerCase().includes(wordLower)
    ) {
      return quoteMatch[1];
    }
  }

  // 6. Last line of defense: Check if word itself or cleaned version can be looked up
  if (CURRICULUM_3000_LOOKUP[wordLower]) {
    return CURRICULUM_3000_LOOKUP[wordLower];
  }

  // Fallback cleanly
  return sanitized || wordTrimmed;
}

/**
 * Format meaning text based on whether "(교육부 필수 어휘)" exposure is enabled (default: false / off)
 */
export function formatEduVocabMeaning(
  meaning: string | undefined | null,
  showEduTag: boolean = false
): string {
  if (!meaning) return '';

  // If the meaning is purely an English word or has an English word with (관련 어휘), check dictionary
  const trimmed = meaning.trim();
  const lower = trimmed.toLowerCase();
  if (CURRICULUM_3000_LOOKUP[lower]) {
    return CURRICULUM_3000_LOOKUP[lower];
  }

  // Check if meaning is in format "word (root의 관련 어휘)"
  const relatedMatch = trimmed.match(/^([a-zA-Z\s\-]+)\s*(?:\([a-zA-Z\s\-\/]+의\s*(?:관련|파생)\s*어휘\))?$/i);
  if (relatedMatch && relatedMatch[1]) {
    const key = relatedMatch[1].trim().toLowerCase();
    if (CURRICULUM_3000_LOOKUP[key]) {
      return CURRICULUM_3000_LOOKUP[key];
    }
  }

  if (showEduTag) return meaning;
  return meaning
    .replace(/\(교육부 필수 어휘\)/gi, '')
    .replace(/\(교육부 파생 어휘\)/gi, '')
    .replace(/\(관련 어휘\)/gi, '')
    .replace(/\([a-zA-Z\s\-\/]+의\s*(?:관련|파생)\s*어휘\)/gi, '')
    .replace(/^[a-zA-Z\s\-]+(?=\s*\(|\s*$)/, '')
    .trim();
}

/**
 * Format sentence meaning text based on whether "(교육부 필수 어휘)" exposure is enabled (default: false / off)
 */
export function formatEduSentenceMeaning(
  sentenceMeaning: string | undefined | null,
  showEduTag: boolean = false
): string {
  if (!sentenceMeaning) return '';

  const trimmed = sentenceMeaning.trim();

  // If this is a legacy template like '"word"(은)는 "root"에서 확장된 교육부 지정 파생 어휘입니다.'
  const legacyMatch = trimmed.match(/["“]([a-zA-Z\s\-]+)["”](?:[\(\)은는]+)\s*["“]([a-zA-Z\s\-]+)["”]에서\s*확장된\s*교육부\s*지정\s*파생\s*어휘/i);
  if (legacyMatch && legacyMatch[1]) {
    const wordKey = legacyMatch[1].trim().toLowerCase();
    const koreanDef = CURRICULUM_3000_LOOKUP[wordKey];
    if (koreanDef) {
      return `"${koreanDef}"에 관련된 유용한 실용 예문입니다.`;
    }
  }

  // If this is a legacy template like '"word (교육부 필수 어휘)"(은)는 대한민국 교육부 개정 교과서 및 수능 필수 어휘입니다.'
  const essentialMatch = trimmed.match(/["“]([a-zA-Z\s\-]+)(?:\s*\(교육부\s*필수\s*어휘\))?["”](?:[\(\)은는]+)\s*대한민국\s*교육부/i);
  if (essentialMatch && essentialMatch[1]) {
    const wordKey = essentialMatch[1].trim().toLowerCase();
    const koreanDef = CURRICULUM_3000_LOOKUP[wordKey];
    if (koreanDef) {
      return `"${koreanDef}"에 관련된 교육부 핵심 예문입니다.`;
    }
  }

  if (showEduTag) return sentenceMeaning;
  return sentenceMeaning
    .replace(/\(교육부 필수 어휘\)/gi, '')
    .replace(/\(교육부 파생 어휘\)/gi, '')
    .replace(/\(관련 어휘\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Cleanly get or derive English Definition / Explanation (영영 풀이/설명영어)
 */
export function getEnglishDefinition(
  item: VocabItem | { word: string; meaning?: string; partOfSpeech?: string; sentence?: string; tip?: string } | null | undefined
): string {
  if (!item) return '';

  const wordTrimmed = (item.word || '').trim();
  const wordLower = wordTrimmed.toLowerCase();

  // 1. Check Embedded Dictionary
  if (EMBEDDED_DICTIONARY[wordLower]?.englishDefinition) {
    return EMBEDDED_DICTIONARY[wordLower].englishDefinition;
  }

  // 2. Check Common English Definitions
  if (COMMON_ENGLISH_DEFINITIONS[wordLower]) {
    return COMMON_ENGLISH_DEFINITIONS[wordLower];
  }

  // 3. Check item tip if in English
  if (item.tip && !/[\u3131-\u318E\uAC00-\uD7A3]/.test(item.tip) && item.tip.length > 10) {
    return item.tip;
  }

  // 4. Derive informative English explanation based on Part of Speech & Sentence or Meaning
  const pos = (item.partOfSpeech || '').toLowerCase();
  const koMeaning = getCleanKoreanMeaning(item as VocabItem);

  if (item.sentence && item.sentence.includes(wordTrimmed)) {
    // Return sentence as usage context clue
    return `Usage: "${item.sentence}" (Meaning: ${koMeaning})`;
  }

  if (pos.includes('v') || pos.includes('verb') || pos.includes('동사')) {
    return `To act, cause, or experience the state of [${koMeaning}].`;
  }
  if (pos.includes('adj') || pos.includes('형용사')) {
    return `Describing a quality, state, or property of [${koMeaning}].`;
  }
  if (pos.includes('adv') || pos.includes('부사')) {
    return `In a manner expressing or related to [${koMeaning}].`;
  }
  if (pos.includes('prep') || pos.includes('전치사')) {
    return `Expressing relation or position regarding [${koMeaning}].`;
  }

  return `A word or concept referring to [${koMeaning}].`;
}

export interface QAPairResult {
  promptText: string;        // Text shown as the question or clue
  promptSubText?: string;    // Subtitle / context (e.g. part of speech, IPA, sentence)
  targetAnswer: string;      // The correct answer string
  qaMode: QAMode;
  promptType: 'korean' | 'en_def' | 'english';
  answerType: 'korean' | 'english';
}

/**
 * Returns question prompt and correct answer based on the 3 Q&A modes
 * 1) 'ko_to_en'   : 설명한글 ➔ 정답: 영어
 * 2) 'en_def_to_en': 설명영어(영영풀이) ➔ 정답: 영어
 * 3) 'en_to_ko'   : 설명영어 ➔ 정답: 한글
 */
export function getQAPair(item: VocabItem, qaMode: QAMode): QAPairResult {
  const koreanMeaning = getCleanKoreanMeaning(item);
  const englishDef = getEnglishDefinition(item);
  const englishWord = item.word.trim();

  switch (qaMode) {
    case 'ko_to_en':
      return {
        promptText: koreanMeaning,
        promptSubText: item.partOfSpeech ? `[${item.partOfSpeech}]` : undefined,
        targetAnswer: englishWord,
        qaMode,
        promptType: 'korean',
        answerType: 'english',
      };

    case 'en_def_to_en':
      return {
        promptText: englishDef,
        promptSubText: item.partOfSpeech ? `[${item.partOfSpeech}] English Definition` : 'English Definition',
        targetAnswer: englishWord,
        qaMode,
        promptType: 'en_def',
        answerType: 'english',
      };

    case 'en_to_ko':
      return {
        promptText: englishWord,
        promptSubText: item.ipa ? `${item.ipa} · ${item.partOfSpeech || ''}` : (item.partOfSpeech ? `[${item.partOfSpeech}]` : undefined),
        targetAnswer: koreanMeaning,
        qaMode,
        promptType: 'english',
        answerType: 'korean',
      };
  }
}

export const QA_MODES_CONFIG: Record<
  QAMode,
  {
    id: QAMode;
    label: string;
    shortLabel: string;
    badge: string;
    questionTitle: string;
    answerTitle: string;
    description: string;
    color: string;
    activeBg: string;
    activeBorder: string;
  }
> = {
  ko_to_en: {
    id: 'ko_to_en',
    label: '한글 → 영어',
    shortLabel: '한글 → 영어',
    badge: '한 ➔ 영',
    questionTitle: '한글 뜻/설명',
    answerTitle: '영어 단어',
    description: '한국어 뜻을 보고 올바른 영어 단어를 맞춥니다.',
    color: 'text-emerald-700 dark:text-emerald-300',
    activeBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-500',
    activeBorder: 'border-emerald-500',
  },
  en_def_to_en: {
    id: 'en_def_to_en',
    label: '영영 정의 → 영어',
    shortLabel: '영영 정의 → 영어',
    badge: '영영 ➔ 영',
    questionTitle: '영영 풀이/정의',
    answerTitle: '영어 단어',
    description: '영어 정의(English Definition)를 읽고 영단어를 유추합니다.',
    color: 'text-purple-700 dark:text-purple-300',
    activeBg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-200 border-purple-500',
    activeBorder: 'border-purple-500',
  },
  en_to_ko: {
    id: 'en_to_ko',
    label: '영어 단어 → 한글',
    shortLabel: '영어 단어 → 한글',
    badge: '영 ➔ 한',
    questionTitle: '영어 단어/발음',
    answerTitle: '한글 뜻',
    description: '제시된 영단어를 보고 올바른 한국어 뜻을 고릅니다.',
    color: 'text-blue-700 dark:text-blue-300',
    activeBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-blue-500',
    activeBorder: 'border-blue-500',
  },
};
