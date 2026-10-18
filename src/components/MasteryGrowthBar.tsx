import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trophy,
  Sparkles,
  Award,
  CheckCircle2,
  TrendingUp,
  Target,
  Zap,
  ArrowRight,
  Flame,
  Star,
  RotateCcw,
} from 'lucide-react';
import { VocabItem } from '../types';

interface MasteryGrowthBarProps {
  vocabList?: VocabItem[];
  vocabCount?: number;
  onStartReviewQuiz?: () => void;
}

export interface MasteryMilestone {
  id: string;
  count: number;
  title: string;
  badge: string;
  tierName: string;
  color: string;
  rewardText: string;
}

export const MASTERY_MILESTONES: MasteryMilestone[] = [
  { id: 'm10', count: 10, title: '첫걸음 마스터', badge: '🌱 10단어', tierName: '스타터', color: '#10b981', rewardText: '첫 10단어 완벽 암기 돌파' },
  { id: 'm50', count: 50, title: '기초 어휘 마스터', badge: '🥉 50단어', tierName: '브론즈', color: '#f59e0b', rewardText: '초등 필수 50단어 완전 정복' },
  { id: 'm100', count: 100, title: '센추리 마스터', badge: '🥈 100단어', tierName: '실버', color: '#6366f1', rewardText: '핵심 회화 100단어 장기 기억 안착' },
  { id: 'm250', count: 250, title: '실전 어휘 러너', badge: '🥇 250단어', tierName: '골드', color: '#eab308', rewardText: '중학 필수 250단어 어휘력 확장' },
  { id: 'm500', count: 500, title: '어휘력 500 돌파', badge: '💎 500단어', tierName: '플래티넘', color: '#06b6d4', rewardText: '수능/내신 빈출 500단어 정복' },
  { id: 'm1000', count: 1000, title: '천단어 마일스톤', badge: '👑 1,000단어', tierName: '다이아', color: '#8b5cf6', rewardText: '원어민 일상 대화 80% 커버리지' },
  { id: 'm2000', count: 2000, title: '고급 어휘 마스터', badge: '🏆 2,000단어', tierName: '마스터', color: '#ec4899', rewardText: '토익/수능 1등급 어휘 구사' },
  { id: 'm3210', count: 3210, title: '그랜드 올클리어', badge: '⭐ 3,210단어', tierName: '레전드', color: '#f43f5e', rewardText: '교육부 필수 전 단어 완전 정복' },
];

export const MasteryGrowthBar: React.FC<MasteryGrowthBarProps> = ({
  vocabList,
  vocabCount,
  onStartReviewQuiz,
}) => {
  // 1. Calculate Mastered (Level 2) word count
  const { totalWords, masteredCount, masteryPercentage } = useMemo(() => {
    let l2 = 0;
    let total = vocabList && vocabList.length > 0 ? vocabList.length : vocabCount || 3210;

    if (vocabList && vocabList.length > 0) {
      vocabList.forEach((item) => {
        const level = item.masteryLevel ?? (item.isLearned ? 2 : 0);
        if (level === 2) l2++;
      });
    } else {
      l2 = Math.min(total, 920);
    }

    const pct = total > 0 ? Math.min(100, Math.round((l2 / total) * 100)) : 0;
    return {
      totalWords: total,
      masteredCount: l2,
      masteryPercentage: pct,
    };
  }, [vocabList, vocabCount]);

  // 2. Identify Current and Next Milestone
  const { currentMilestone, nextMilestone, wordsToNextMilestone, progressToNextMilestone } =
    useMemo(() => {
      let current: MasteryMilestone | null = null;
      let next: MasteryMilestone | null = null;

      for (let i = 0; i < MASTERY_MILESTONES.length; i++) {
        if (masteredCount >= MASTERY_MILESTONES[i].count) {
          current = MASTERY_MILESTONES[i];
        } else {
          next = MASTERY_MILESTONES[i];
          break;
        }
      }

      const prevCount = current ? current.count : 0;
      const targetCount = next ? next.count : totalWords;
      const range = targetCount - prevCount;
      const currentProgressInRange = masteredCount - prevCount;
      const progressPct =
        range > 0 ? Math.min(100, Math.round((currentProgressInRange / range) * 100)) : 100;

      const remaining = next ? Math.max(0, next.count - masteredCount) : 0;

      return {
        currentMilestone: current || MASTERY_MILESTONES[0],
        nextMilestone: next,
        wordsToNextMilestone: remaining,
        progressToNextMilestone: progressPct,
      };
    }, [masteredCount, totalWords]);

  // 3. Subtle Scale-Up Animation Trigger State
  const [isScalingUp, setIsScalingUp] = useState<boolean>(false);
  const [celebratedMilestone, setCelebratedMilestone] = useState<MasteryMilestone | null>(null);
  const animationTimeoutRef = useRef<any>(null);

  const triggerSubtleScaleUp = (milestoneToCelebrate?: MasteryMilestone) => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    setCelebratedMilestone(milestoneToCelebrate || currentMilestone);
    setIsScalingUp(true);

    animationTimeoutRef.current = setTimeout(() => {
      setIsScalingUp(false);
    }, 2400);
  };

  // 4. Milestone crossover detection
  useEffect(() => {
    const savedMilestoneId = localStorage.getItem('wordloop_last_mastery_milestone');
    if (currentMilestone && currentMilestone.id !== savedMilestoneId) {
      localStorage.setItem('wordloop_last_mastery_milestone', currentMilestone.id);
      // If user hit a new milestone (or on first milestone load with progress), trigger subtle scale-up
      if (masteredCount >= currentMilestone.count) {
        triggerSubtleScaleUp(currentMilestone);
      }
    }
  }, [currentMilestone, masteredCount]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`rounded-3xl p-6 bg-white dark:bg-slate-900 border transition-all duration-500 ease-out space-y-5 relative overflow-hidden ${
        isScalingUp
          ? 'scale-[1.02] border-emerald-500/80 dark:border-emerald-500/80 shadow-2xl ring-4 ring-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.04] to-transparent'
          : 'border-slate-200 dark:border-slate-800 shadow-sm'
      }`}
    >
      {/* Background celebration glow when scaling up */}
      {isScalingUp && (
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      )}

      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-500 shrink-0 ${
              isScalingUp
                ? 'scale-110 bg-gradient-to-tr from-amber-400 via-emerald-500 to-teal-400 shadow-emerald-500/40 rotate-6'
                : 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 shadow-emerald-500/20'
            }`}
          >
            {isScalingUp ? <Sparkles className="w-6 h-6 animate-spin" /> : <Trophy className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Mastery Growth</span>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  마스터 레벨 성장 바
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              완벽 암기(Level 2) 단어 누적치에 따라 마일스톤 단계가 자동으로 승급되며 축하 모션이 발생합니다.
            </p>
          </div>
        </div>

        {/* Milestone Celebration Trigger & Current Badge */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {/* Subtle scale-up celebration replay button */}
          <button
            type="button"
            onClick={() => triggerSubtleScaleUp(currentMilestone)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${
              isScalingUp
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500/40'
            }`}
            title="마일스톤 달성 축하 스케일업 애니메이션을 다시 확인합니다."
          >
            <Sparkles className={`w-3.5 h-3.5 ${isScalingUp ? 'text-slate-950 animate-bounce' : 'text-emerald-500'}`} />
            <span>{isScalingUp ? '마일스톤 달성 축하 중! ⭐' : '마일스톤 모션 테스트'}</span>
          </button>
        </div>
      </div>

      {/* 2. Current Mastery Stats Highlight Box */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              현재 완벽 암기 (Level 2)
            </span>
            <span
              className={`text-[11px] font-black px-2 py-0.5 rounded-full transition-transform duration-300 ${
                isScalingUp ? 'scale-110 bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {currentMilestone.badge} 달성 완료
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {masteredCount.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-slate-400">
              / {totalWords.toLocaleString()}단어 ({masteryPercentage}%)
            </span>
          </div>
        </div>

        {/* Next Milestone Goal Countdown */}
        {nextMilestone ? (
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 sm:text-right shrink-0">
            <span className="text-[10px] text-slate-400 block font-semibold">
              다음 마일스톤: <strong className="text-emerald-500">{nextMilestone.title} ({nextMilestone.badge})</strong>
            </span>
            <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 flex items-center sm:justify-end gap-1">
              <span>{wordsToNextMilestone}단어 추가 마스터 필요</span>
              <span className="text-[10px] font-bold text-indigo-500">({progressToNextMilestone}%)</span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-right shrink-0">
            <span className="text-xs font-black text-emerald-500 flex items-center gap-1 justify-end">
              <Trophy className="w-4 h-4" />
              전체 3,210단어 그랜드 올클리어!
            </span>
          </div>
        )}
      </div>

      {/* 3. The Animated 'Mastery Growth' Bar with Subtle Scale-Up */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>라이브러리 마스터 진척도</span>
          </span>
          <span className="font-black text-emerald-600 dark:text-emerald-400">
            {masteryPercentage}% 완전 정복
          </span>
        </div>

        {/* The Outer Animated Bar Container with subtle scale-up on milestone */}
        <div
          className={`relative w-full h-5 rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 shadow-inner transition-transform duration-500 ease-out ${
            isScalingUp ? 'scale-y-125 scale-x-[1.01] ring-2 ring-emerald-500/40' : ''
          }`}
        >
          {/* Animated Progress Fill */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-1000 ease-out relative overflow-hidden shadow-md"
            style={{ width: `${Math.max(2, masteryPercentage)}%` }}
          >
            {/* Animated Light Shimmer Stripe */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent w-full animate-shimmer" />
          </div>

          {/* Interactive Milestone Checkpoints along the Bar */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-2">
            {MASTERY_MILESTONES.slice(1, 7).map((m) => {
              const reached = masteredCount >= m.count;
              const positionPct = Math.round((m.count / totalWords) * 100);

              return (
                <div
                  key={m.id}
                  style={{ left: `${positionPct}%` }}
                  className="absolute -top-1 transform -translate-x-1/2 pointer-events-auto cursor-pointer group"
                  onClick={() => triggerSubtleScaleUp(m)}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-transform duration-300 group-hover:scale-125 ${
                      reached
                        ? 'bg-emerald-500 border-white dark:border-slate-900 shadow-sm ring-1 ring-emerald-400/50'
                        : 'bg-slate-300 dark:bg-slate-700 border-white dark:border-slate-800'
                    }`}
                  />
                  {/* Tooltip on pin hover */}
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap shadow-xl z-20 pointer-events-none border border-slate-700">
                    {m.badge} ({m.count}단어) {reached ? '✅' : '🔒'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestone Indicator Labels below the bar */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
          <span>0단어 (시작)</span>
          <span>50단어</span>
          <span>100단어</span>
          <span>250단어</span>
          <span>500단어</span>
          <span>1,000단어</span>
          <span>3,210단어 (전체)</span>
        </div>
      </div>

      {/* 4. Active Milestone Congratulatory Callout (Shows details when triggered) */}
      {isScalingUp && celebratedMilestone && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-indigo-500/15 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-xl animate-bounce">⭐</span>
            <div>
              <p className="font-black text-slate-900 dark:text-white">
                축하합니다! <strong className="text-emerald-500 font-extrabold">'{celebratedMilestone.title}'</strong> 마일스톤 달성!
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                {celebratedMilestone.rewardText} (Level 2 완벽 암기 {celebratedMilestone.count}단어 돌파)
              </p>
            </div>
          </div>
          {onStartReviewQuiz && (
            <button
              type="button"
              onClick={onStartReviewQuiz}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] transition-all flex items-center gap-1 shrink-0"
            >
              <span>계속 학습</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
