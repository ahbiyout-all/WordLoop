import { VocabItem, VocabSrsState } from '../types';

export type SrsRating = 'again' | 'hard' | 'good' | 'easy';

export interface SrsDailySummary {
  dueReviewItems: VocabItem[];
  newLearningItems: VocabItem[];
  upcomingSoonItems: VocabItem[];
  masteredItems: VocabItem[];
  weakItems: VocabItem[];
  dueCount: number;
  newCount: number;
  learningCount: number;
  masteredCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Losslessly migrate or initialize SRS state for any VocabItem based on legacy masteryLevel
 */
export function resolveVocabSrsState(item: VocabItem, nowMs: number = Date.now()): VocabSrsState {
  if (item.srs && typeof item.srs.intervalDays === 'number' && typeof item.srs.nextReviewAt === 'string') {
    return item.srs;
  }

  const level = item.masteryLevel ?? (item.isLearned ? 2 : 0);
  if (level === 2) {
    return {
      intervalDays: 7,
      easeFactor: 2.5,
      repetitionCount: 2,
      nextReviewAt: new Date(nowMs + 7 * DAY_MS).toISOString(),
      lastRating: 'good',
      lapseCount: 0,
    };
  }
  if (level === 1) {
    return {
      intervalDays: 1,
      easeFactor: 2.35,
      repetitionCount: 1,
      nextReviewAt: new Date(nowMs).toISOString(), // Due today for reinforcement
      lastRating: 'hard',
      lapseCount: 0,
    };
  }

  return {
    intervalDays: 0,
    easeFactor: 2.5,
    repetitionCount: 0,
    nextReviewAt: new Date(nowMs).toISOString(),
    lapseCount: 0,
  };
}

/**
 * Lightweight SM-2 Spaced Repetition calculation returning both new SRS metadata and compatible masteryLevel (0 | 1 | 2)
 */
export function calculateNextSrsState(
  current: VocabSrsState | undefined,
  rating: SrsRating,
  fallbackMastery: 0 | 1 | 2 = 0,
  nowMs: number = Date.now()
): { srs: VocabSrsState; masteryLevel: 0 | 1 | 2 } {
  const base: VocabSrsState = current || {
    intervalDays: fallbackMastery === 2 ? 7 : fallbackMastery === 1 ? 1 : 0,
    easeFactor: 2.5,
    repetitionCount: fallbackMastery === 2 ? 2 : fallbackMastery === 1 ? 1 : 0,
    nextReviewAt: new Date(nowMs).toISOString(),
    lapseCount: 0,
  };

  let easeFactor = base.easeFactor || 2.5;
  let repetitionCount = base.repetitionCount || 0;
  let intervalDays = base.intervalDays || 0;
  let lapseCount = base.lapseCount || 0;

  if (rating === 'again') {
    repetitionCount = 0;
    intervalDays = 0;
    easeFactor = Math.max(1.3, Number((easeFactor - 0.2).toFixed(2)));
    lapseCount += 1;
  } else if (rating === 'hard') {
    repetitionCount = Math.max(1, repetitionCount);
    intervalDays = repetitionCount <= 1 ? 1 : Math.max(2, Math.round(intervalDays * 1.2));
    easeFactor = Math.max(1.3, Number((easeFactor - 0.14).toFixed(2)));
  } else if (rating === 'good') {
    repetitionCount += 1;
    if (repetitionCount === 1) {
      intervalDays = 1;
    } else if (repetitionCount === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.max(4, Math.round(intervalDays * easeFactor));
    }
  } else {
    // easy
    repetitionCount += 1;
    if (repetitionCount === 1) {
      intervalDays = 4;
    } else if (repetitionCount === 2) {
      intervalDays = 7;
    } else {
      intervalDays = Math.max(7, Math.round(intervalDays * easeFactor * 1.3));
    }
    easeFactor = Math.min(3.0, Number((easeFactor + 0.12).toFixed(2)));
  }

  const nextReviewAt = new Date(nowMs + intervalDays * DAY_MS).toISOString();
  const lastReviewedAt = new Date(nowMs).toISOString();

  let masteryLevel: 0 | 1 | 2 = 0;
  if (rating === 'again') {
    masteryLevel = 0;
  } else if (repetitionCount >= 2 && intervalDays >= 3 && rating !== 'hard') {
    masteryLevel = 2;
  } else {
    masteryLevel = 1;
  }

  return {
    srs: {
      intervalDays,
      easeFactor,
      repetitionCount,
      nextReviewAt,
      lastReviewedAt,
      lastRating: rating,
      lapseCount,
    },
    masteryLevel,
  };
}

/**
 * Preview interval text for the 4 SRS response buttons
 */
export function previewSrsIntervalLabel(
  current: VocabSrsState | undefined,
  rating: SrsRating,
  fallbackMastery: 0 | 1 | 2 = 0
): string {
  const { srs } = calculateNextSrsState(current, rating, fallbackMastery);
  if (srs.intervalDays <= 0) return '오늘 다시';
  if (srs.intervalDays === 1) return '1일 후';
  return `${srs.intervalDays}일 후`;
}

/**
 * Format next review timestamp into concise Korean UI copy
 */
export function formatNextReviewLabel(item: VocabItem, nowMs: number = Date.now()): string {
  const srs = resolveVocabSrsState(item, nowMs);
  const level = item.masteryLevel ?? (item.isLearned ? 2 : 0);
  if (level === 0 && !item.srs) return '미학습';

  const dueMs = new Date(srs.nextReviewAt).getTime();
  if (isNaN(dueMs) || dueMs <= nowMs) return '지금 복습';
  const diffDays = Math.ceil((dueMs - nowMs) / DAY_MS);
  if (diffDays <= 1) return '내일 복습';
  return `${diffDays}일 후`;
}

/**
 * Summarize SRS queues across the entire vocabulary list
 */
export function getDailySrsSummary(vocabList: VocabItem[], nowMs: number = Date.now()): SrsDailySummary {
  const dueReviewItems: VocabItem[] = [];
  const newLearningItems: VocabItem[] = [];
  const upcomingSoonItems: VocabItem[] = [];
  const masteredItems: VocabItem[] = [];
  const weakItems: VocabItem[] = [];

  for (const item of vocabList) {
    const level = item.masteryLevel ?? (item.isLearned ? 2 : 0);
    if (level < 2) {
      weakItems.push(item);
    }

    if (item.srs) {
      const dueMs = new Date(item.srs.nextReviewAt).getTime();
      if (!isNaN(dueMs) && dueMs <= nowMs) {
        dueReviewItems.push(item);
      } else if (level === 2 && item.srs.intervalDays >= 3) {
        masteredItems.push(item);
      } else {
        upcomingSoonItems.push(item);
      }
    } else {
      if (level === 2) {
        masteredItems.push(item);
      } else if (level === 1) {
        dueReviewItems.push(item);
      } else {
        newLearningItems.push(item);
      }
    }
  }

  // Sort due reviews by lapseCount desc, then oldest nextReviewAt
  dueReviewItems.sort((a, b) => {
    const lapseDiff = (b.srs?.lapseCount || 0) - (a.srs?.lapseCount || 0);
    if (lapseDiff !== 0) return lapseDiff;
    const aDue = a.srs ? new Date(a.srs.nextReviewAt).getTime() : 0;
    const bDue = b.srs ? new Date(b.srs.nextReviewAt).getTime() : 0;
    return aDue - bDue;
  });

  // Sort weak items prioritizing reviewed/lapsed items then learning items
  weakItems.sort((a, b) => {
    const aLapse = a.srs?.lapseCount || 0;
    const bLapse = b.srs?.lapseCount || 0;
    if (bLapse !== aLapse) return bLapse - aLapse;
    const aLevel = a.masteryLevel ?? 0;
    const bLevel = b.masteryLevel ?? 0;
    return bLevel - aLevel; // 1 (in-progress) before 0 (brand new)
  });

  return {
    dueReviewItems,
    newLearningItems,
    upcomingSoonItems,
    masteredItems,
    weakItems,
    dueCount: dueReviewItems.length,
    newCount: newLearningItems.length,
    learningCount: upcomingSoonItems.length + dueReviewItems.length,
    masteredCount: masteredItems.length,
  };
}

/**
 * Curate today's 3-minute beginner-friendly learning queue (due reviews + new words)
 */
export function buildTodayRoutineQueue(
  vocabList: VocabItem[],
  maxReview: number = 5,
  maxNew: number = 3,
  nowMs: number = Date.now()
): VocabItem[] {
  const summary = getDailySrsSummary(vocabList, nowMs);
  const selectedIds = new Set<string>();
  const queue: VocabItem[] = [];

  for (const item of summary.dueReviewItems) {
    if (queue.length >= maxReview) break;
    if (!selectedIds.has(item.id)) {
      selectedIds.add(item.id);
      queue.push(item);
    }
  }

  const targetTotal = Math.min(vocabList.length, maxReview + maxNew);
  for (const item of summary.newLearningItems) {
    if (queue.length >= targetTotal) break;
    if (!selectedIds.has(item.id)) {
      selectedIds.add(item.id);
      queue.push(item);
    }
  }

  // Fallback if user has mastered nearly everything: pick earliest upcoming or any items
  if (queue.length === 0 && vocabList.length > 0) {
    return vocabList.slice(0, Math.min(5, vocabList.length));
  }

  return queue;
}
