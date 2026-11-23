import { Category, VocabItem, SentenceItem } from '../types';
import { OFFICIAL_CURRICULUM_3000_LIST } from './officialCurriculum3000';
import { ALL_DIVERSE_SENTENCES } from './diverseSentencesData';
import { getAllCurriculumSentenceList } from './curriculumVocab';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'elementary',
    name: '🏫 2026 초등 필수 (3~6학년)',
    iconName: 'BookOpen',
    description: '교육부 지정 초등학교 교과서 필수 800 단어 및 파닉스 기초 표현',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    id: 'middle',
    name: '🏫 2026 중학 필수 (1~3학년)',
    iconName: 'GraduationCap',
    description: '중학교 1~3학년 공통 교과서 핵심 빈출 1,200 어휘',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  {
    id: 'high_sat',
    name: '🏫 2026 고등·수능 (EBS)',
    iconName: 'Trophy',
    description: '고교 개정 교과서 및 2026 수능, EBS 수능특강/완성 핵심 어휘',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
];

/**
 * Preload full 3,000 Ministry of Education Official Vocabulary into default word bank
 */
export const DEFAULT_VOCAB: VocabItem[] = OFFICIAL_CURRICULUM_3000_LIST.map((item, idx) => ({
  id: `edu3000-v-${item.categoryId}-${idx + 1}`,
  word: item.word,
  ipa: item.ipa || '',
  meaning: item.meaning,
  partOfSpeech: item.partOfSpeech || 'n.',
  sentence: item.sentence || '',
  sentenceMeaning: item.sentenceMeaning || '',
  categoryId: item.categoryId,
  tip: item.tip || '',
  isLearned: false,
  masteryLevel: 0,
}));

/**
 * Preload diverse & curriculum-aligned authentic example sentences
 * Combines diverse sentences, curriculum bank sentences, and unique official examples
 */
function buildMasterSentenceList(): SentenceItem[] {
  const result: SentenceItem[] = [];
  const seenTexts = new Set<string>();

  // 1. Primary: High-quality diverse real-world & textbook sentence database
  for (const s of ALL_DIVERSE_SENTENCES) {
    const norm = s.text.trim().toLowerCase();
    if (!seenTexts.has(norm)) {
      seenTexts.add(norm);
      result.push(s);
    }
  }

  // 2. Secondary: Authentic curriculum & theme sentences (from textbook vocabs)
  const curriculumSentences = getAllCurriculumSentenceList();
  for (const s of curriculumSentences) {
    const norm = s.text.trim().toLowerCase();
    if (!seenTexts.has(norm)) {
      seenTexts.add(norm);
      result.push(s);
    }
  }

  // 3. Tertiary: Balanced sample of grade-appropriate sentences from official 3000 database
  // Capped per tier to keep wordloop_sentences lightweight inside the 5MB localStorage quota
  const tierCaps: Record<string, number> = { elementary: 70, middle: 70, high_sat: 70 };
  const tierCounts: Record<string, number> = { elementary: 0, middle: 0, high_sat: 0 };

  for (let idx = 0; idx < OFFICIAL_CURRICULUM_3000_LIST.length; idx++) {
    const item = OFFICIAL_CURRICULUM_3000_LIST[idx];
    const cat = item.categoryId || 'middle';
    if ((tierCounts[cat] ?? 0) >= (tierCaps[cat] ?? 70)) continue;
    if (!item.sentence || item.sentence.trim().length === 0) continue;
    if (item.sentence.includes('is an essential vocabulary item in the English curriculum')) continue;

    const norm = item.sentence.trim().toLowerCase();
    if (seenTexts.has(norm)) continue;

    seenTexts.add(norm);
    tierCounts[cat] = (tierCounts[cat] ?? 0) + 1;
    result.push({
      id: `edu3000-s-custom-${idx + 1}`,
      text: item.sentence,
      meaning: item.sentenceMeaning || item.meaning,
      context:
        cat === 'elementary'
          ? '초등 실생활 회화 예문'
          : cat === 'middle'
          ? '중학 교과·생활 예문'
          : '고등·수능 독해 예문',
      categoryId: cat,
      wordBreakdown: [
        {
          word: item.word,
          meaning: item.meaning,
        },
      ],
    });
  }

  return result;
}

export const DEFAULT_SENTENCES: SentenceItem[] = buildMasterSentenceList();


