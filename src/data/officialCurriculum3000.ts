import { VocabItem } from '../types';
import curriculumDataJson from './officialCurriculum3000Data.json';

export interface Curriculum3000Item {
  word: string;
  ipa: string;
  meaning: string;
  partOfSpeech: string;
  sentence: string;
  sentenceMeaning: string;
  categoryId: 'elementary' | 'middle' | 'high_sat';
  tip: string;
}

export const OFFICIAL_CURRICULUM_3000_LIST: Omit<VocabItem, 'id'>[] = curriculumDataJson as Omit<VocabItem, 'id'>[];

export function getCurriculum3000VocabItems(): VocabItem[] {
  return OFFICIAL_CURRICULUM_3000_LIST.map((item, idx) => ({
    ...item,
    id: `edu3000-${item.categoryId}-${idx + 1}`,
    isLearned: false,
    masteryLevel: 0,
  }));
}

/**
 * Export full 3,000 Curriculum Database as CSV text for user download
 */
export function exportCurriculum3000ToCSV(): string {
  const headers = ['단어(Word)', '발음기호(IPA)', '뜻(Meaning)', '품사/구분', '예문(Sentence)', '예문 해석', '학교급/영역'];
  const rows = OFFICIAL_CURRICULUM_3000_LIST.map(item => [
    `"${item.word.replace(/"/g, '""')}"`,
    `"${item.ipa.replace(/"/g, '""')}"`,
    `"${item.meaning.replace(/"/g, '""')}"`,
    `"${item.partOfSpeech.replace(/"/g, '""')}"`,
    `"${item.sentence.replace(/"/g, '""')}"`,
    `"${item.sentenceMeaning.replace(/"/g, '""')}"`,
    `"${item.categoryId === 'elementary' ? '초등 필수(*)' : item.categoryId === 'middle' ? '중학 필수(**)' : '고등·수능 필수'}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
