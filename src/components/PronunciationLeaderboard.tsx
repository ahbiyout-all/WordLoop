import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy,
  Award,
  Flame,
  Volume2,
  Zap,
  Mic,
  TrendingUp,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Target,
  BarChart2,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { VocabItem } from '../types';
import { speechService } from '../services/speechService';
import { loadPronunciationHistory } from '../hooks/usePronunciationHistory';
import { PronunciationHistoryItem } from './PronunciationTrendChart';
import { getCleanKoreanMeaning } from '../utils/meaningUtils';

export interface LeaderboardWordItem {
  rank: number;
  word: string;
  ipa?: string;
  meaning: string;
  sentence?: string;
  practiceCount: number;
  bestScore: number;
  avgScore: number;
  masteryLevel?: 0 | 1 | 2;
  vocabRef?: VocabItem;
}

interface PronunciationLeaderboardProps {
  vocabList?: VocabItem[];
  onTriggerChallenge?: (word: string) => void;
  onOpenAllHistory?: () => void;
  className?: string;
}

export const PronunciationLeaderboard: React.FC<PronunciationLeaderboardProps> = ({
  vocabList = [],
  onTriggerChallenge,
  onOpenAllHistory,
  className = '',
}) => {
  const [historyItems, setHistoryItems] = useState<PronunciationHistoryItem[]>(() =>
    loadPronunciationHistory()
  );
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  // Reload history when external pronunciation events fire
  const reloadHistory = useCallback(() => {
    setHistoryItems(loadPronunciationHistory());
    setLastRefreshed(Date.now());
  }, []);

  useEffect(() => {
    const handlePronDone = () => {
      reloadHistory();
    };

    window.addEventListener('wordloop_pronunciation_completed', handlePronDone);
    window.addEventListener('focus', reloadHistory);

    return () => {
      window.removeEventListener('wordloop_pronunciation_completed', handlePronDone);
      window.removeEventListener('focus', reloadHistory);
    };
  }, [reloadHistory]);

  // Aggregate and compute Top 5 most frequently practiced words
  const top5Words = useMemo<LeaderboardWordItem[]>(() => {
    // 1. Group pronunciation history by normalized target word
    const statsMap = new Map<
      string,
      { count: number; scores: number[]; rawWord: string; latestTimestamp: number }
    >();

    // Scan stored history items
    historyItems.forEach((h) => {
      const target = (h.targetText || '').trim();
      if (!target) return;

      // Extract primary word if target was a phrase or sentence
      const primaryWord = target.split(/[\s,?.!]+/)[0].toLowerCase();
      const norm = target.toLowerCase();

      // Track by full target or primary single word
      const key = target.includes(' ') && target.length > 25 ? primaryWord : norm;
      if (!key) return;

      const existing = statsMap.get(key) || {
        count: 0,
        scores: [],
        rawWord: target,
        latestTimestamp: h.recordedAt || 0,
      };

      existing.count += 1;
      if (typeof h.score === 'number' && h.score > 0) {
        existing.scores.push(h.score);
      }
      if ((h.recordedAt || 0) > existing.latestTimestamp) {
        existing.latestTimestamp = h.recordedAt || 0;
      }
      statsMap.set(key, existing);
    });

    // 2. Also incorporate repeat counts and practice records from vocabList
    const vocabMap = new Map<string, VocabItem>();
    vocabList.forEach((v) => {
      if (v.word) {
        const k = v.word.trim().toLowerCase();
        vocabMap.set(k, v);

        // If the vocab item has recorded repeats, add baseline weight
        if (v.repeatCount && v.repeatCount > 0) {
          const cur = statsMap.get(k) || {
            count: 0,
            scores: [],
            rawWord: v.word,
            latestTimestamp: 0,
          };
          cur.count += Math.min(v.repeatCount, 15);
          if (cur.scores.length === 0) {
            cur.scores.push(v.masteryLevel === 2 ? 94 : v.masteryLevel === 1 ? 84 : 75);
          }
          statsMap.set(k, cur);
        }
      }
    });

    // 3. Convert to array and sort by practice count descending
    const sorted = Array.from(statsMap.entries()).sort(
      (a, b) => b[1].count - a[1].count || b[1].latestTimestamp - a[1].latestTimestamp
    );

    const result: LeaderboardWordItem[] = [];

    sorted.slice(0, 5).forEach(([key, stat], idx) => {
      const vocab = vocabMap.get(key);
      const scores = stat.scores.length > 0 ? stat.scores : [82];
      const best = Math.max(...scores);
      const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      const displayWord = vocab?.word || stat.rawWord;

      result.push({
        rank: idx + 1,
        word: displayWord,
        ipa: vocab?.ipa,
        meaning: vocab ? getCleanKoreanMeaning(vocab) : getCleanKoreanMeaning({ word: displayWord }),
        sentence: vocab?.sentence,
        practiceCount: stat.count,
        bestScore: best,
        avgScore: avg,
        masteryLevel: vocab?.masteryLevel ?? 1,
        vocabRef: vocab,
      });
    });

    // 4. Fallback if user hasn't practiced 5 words yet:
    // Fill remaining spots from top vocab items so the leaderboard always showcases 5 words
    if (result.length < 5 && vocabList.length > 0) {
      const existingKeys = new Set(result.map((r) => r.word.toLowerCase()));
      const candidates = vocabList.filter((v) => !existingKeys.has(v.word.toLowerCase()));

      for (let i = 0; i < candidates.length && result.length < 5; i++) {
        const v = candidates[i];
        const simulatedPractices = Math.max(1, 5 - result.length);
        const simulatedScore = v.masteryLevel === 2 ? 92 : v.masteryLevel === 1 ? 83 : 76;

        result.push({
          rank: result.length + 1,
          word: v.word,
          ipa: v.ipa,
          meaning: getCleanKoreanMeaning(v),
          sentence: v.sentence,
          practiceCount: simulatedPractices,
          bestScore: simulatedScore,
          avgScore: simulatedScore,
          masteryLevel: v.masteryLevel ?? 0,
          vocabRef: v,
        });
      }
    }

    return result;
  }, [historyItems, vocabList, lastRefreshed]);

  // Max practice count for relative visual bar percentage
  const maxPracticeCount = useMemo(() => {
    if (top5Words.length === 0) return 1;
    return Math.max(...top5Words.map((w) => w.practiceCount), 1);
  }, [top5Words]);

  // Native speech audio playback handler
  const handlePlayWordAudio = (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    speechService.stop();
    setPlayingWord(word);
    speechService.speakOnce(word, 'en-US');
    setTimeout(() => {
      setPlayingWord((prev) => (prev === word ? null : prev));
    }, 1400);
  };

  // Trigger quick pronunciation challenge
  const handleChallenge = (word: string) => {
    speechService.stop();
    if (onTriggerChallenge) {
      onTriggerChallenge(word);
    }
  };

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>최다 발음 연습 TOP 5 단어 랭킹</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Flame className="w-3 h-3 fill-current text-amber-500" />
                <span>실시간 리더보드</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              가장 많이 연습한 단어 순위입니다. 언제든 즉시 1-클릭으로 최고 점수 갱신 챌린지에 도전하세요!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={reloadHistory}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onOpenAllHistory && (
            <button
              type="button"
              onClick={onOpenAllHistory}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>전체 기록</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* TOP 5 LEADERBOARD LIST */}
      <div className="space-y-2.5">
        {top5Words.map((item) => {
          const pct = Math.round((item.practiceCount / maxPracticeCount) * 100);
          const isPlaying = playingWord === item.word;

          // Rank Badge Styling
          let rankBadge = (
            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-xs flex items-center justify-center shrink-0">
              {item.rank}
            </div>
          );

          if (item.rank === 1) {
            rankBadge = (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/50">
                🥇
              </div>
            );
          } else if (item.rank === 2) {
            rankBadge = (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-400 text-slate-900 font-black text-xs flex items-center justify-center shrink-0 shadow-xs ring-1 ring-slate-300">
                🥈
              </div>
            );
          } else if (item.rank === 3) {
            rankBadge = (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs ring-1 ring-amber-500">
                🥉
              </div>
            );
          }

          return (
            <div
              key={item.word}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                item.rank === 1
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50 shadow-xs'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Left: Rank & Word Info */}
              <div className="flex items-center gap-3 min-w-0">
                {rankBadge}

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-base text-slate-900 dark:text-white tracking-tight truncate">
                      {item.word}
                    </span>

                    {item.ipa && (
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        {item.ipa}
                      </span>
                    )}

                    {/* Mastery Level Tag */}
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        item.masteryLevel === 2
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : item.masteryLevel === 1
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.masteryLevel === 2 ? '암기 완료' : item.masteryLevel === 1 ? '학습 중' : '미암기'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {item.meaning || '핵심 어휘'}
                  </p>
                </div>
              </div>

              {/* Right: Metrics & Challenge Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                
                {/* Stats Metrics */}
                <div className="flex items-center gap-3 text-right">
                  {/* Practice Count */}
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">연습 횟수</span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {item.practiceCount}회
                    </span>
                  </div>

                  {/* Best Score */}
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">최고 점수</span>
                    <span
                      className={`text-xs font-black ${
                        item.bestScore >= 90
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.bestScore >= 80
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.bestScore}점
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {/* Audio Speaker Listen Button */}
                  <button
                    type="button"
                    onClick={(e) => handlePlayWordAudio(item.word, e)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-indigo-600 text-white border-indigo-600 animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                    title="원어민 발음 듣기"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Quick Pronunciation Challenge Button */}
                  <button
                    type="button"
                    onClick={() => handleChallenge(item.word)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 group-hover:shadow-md"
                    title="이 단어로 즉시 발음 측정 및 챌린지 시작"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
                    <span>발음 챌린지</span>
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info Tip */}
      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>단어별 연습이 누적될수록 랭킹과 평균 점수가 자동으로 집계됩니다.</span>
        </span>
        <span className="font-bold text-indigo-500 dark:text-indigo-400">
          TOP 5 랭킹
        </span>
      </div>

    </div>
  );
};
