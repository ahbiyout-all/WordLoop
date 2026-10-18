import React, { useState, useMemo } from 'react';
import {
  Award,
  Trophy,
  Flame,
  Headphones,
  BookOpen,
  Target,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  ChevronRight,
  Zap,
  Star,
  Crown,
  Shield,
  Layers,
  Info,
} from 'lucide-react';
import { Goal, DailyGoalHistory } from '../types';

interface MilestoneBadgeSystemProps {
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  vocabCount: number;
}

export type BadgeCategory = 'all' | 'streak' | 'repeats' | 'vocab' | 'goals';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend';

export interface MilestoneBadge {
  id: string;
  title: string;
  koreanTitle: string;
  category: 'streak' | 'repeats' | 'vocab' | 'goals';
  tier: BadgeTier;
  iconType: 'flame' | 'headphones' | 'book' | 'target' | 'crown' | 'star' | 'trophy' | 'zap';
  description: string;
  requirementText: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  isUnlocked: boolean;
  progressPercent: number;
}

export const MilestoneBadgeSystem: React.FC<MilestoneBadgeSystemProps> = ({
  goals,
  history,
  totalRepeatsCount,
  vocabCount,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory>('all');
  const [filterUnlockedOnly, setFilterUnlockedOnly] = useState<boolean>(false);
  const [activeBadge, setActiveBadge] = useState<MilestoneBadge | null>(null);

  // Compute metrics from history & goals
  const { badges, unlockedCount, totalCount, totalScore } = useMemo(() => {
    // 1. Calculate streak metrics
    const goalMaxStreaks = goals.map((g) => g.streak || 0);
    const maxGoalStreak = goalMaxStreaks.length > 0 ? Math.max(...goalMaxStreaks) : 0;

    // History consecutive streak
    let histStreak = 0;
    let maxHistStreak = 0;
    const sortedHistory = [...(history || [])].sort((a, b) => a.date.localeCompare(b.date));
    sortedHistory.forEach((h) => {
      if (h.completedGoalsCount > 0) {
        histStreak++;
        if (histStreak > maxHistStreak) maxHistStreak = histStreak;
      } else {
        histStreak = 0;
      }
    });

    const highestStreak = Math.max(maxGoalStreak, maxHistStreak, 1);

    // 2. Total completed goals from all history + today
    const totalGoalsCompletedInHistory = (history || []).reduce(
      (sum, h) => sum + (h.completedGoalsCount || 0),
      0
    );
    const todayCompletedCount = goals.filter((g) => g.isCompleted).length;
    const allTimeCompletedGoals = totalGoalsCompletedInHistory + todayCompletedCount;
    const isTodayPerfect = goals.length > 0 && goals.every((g) => g.isCompleted);

    // 3. Define the Milestone Badges
    const badgeDefinitions: Omit<
      MilestoneBadge,
      'currentValue' | 'isUnlocked' | 'progressPercent'
    >[] = [
      // --- Streak Masters Series ---
      {
        id: 'streak-3',
        title: '3 Day Habit Starter',
        koreanTitle: '3일 연속 실천 스타터',
        category: 'streak',
        tier: 'bronze',
        iconType: 'flame',
        description: '하루도 빠짐없이 3일 동안 연속으로 일일 목표를 달성했습니다.',
        requirementText: '연속 3일 목표 달성',
        targetValue: 3,
        unit: '일',
      },
      {
        id: 'streak-7',
        title: '7 Day Bronze Streak',
        koreanTitle: '7일 연속 브론즈 스트릭',
        category: 'streak',
        tier: 'bronze',
        iconType: 'flame',
        description: '1주일 내내 꾸준히 학습과 자기계발을 지속하여 루틴을 확립했습니다.',
        requirementText: '연속 7일 목표 달성',
        targetValue: 7,
        unit: '일',
      },
      {
        id: 'streak-10',
        title: '10 Day Streak Master',
        koreanTitle: '10일 연속 스트릭 마스터',
        category: 'streak',
        tier: 'silver',
        iconType: 'trophy',
        description: '10일간 쉼 없는 끈기로 연속 달성의 정점에 도달했습니다. 습관이 완전히 자리 잡고 있습니다.',
        requirementText: '연속 10일 목표 달성',
        targetValue: 10,
        unit: '일',
      },
      {
        id: 'streak-21',
        title: '21 Day Gold Habit Maker',
        koreanTitle: '21일 골드 습관화 각인',
        category: 'streak',
        tier: 'gold',
        iconType: 'crown',
        description: '뇌과학이 입증한 21일 습관 각인 주기를 완수하여 무의식적 실천 궤도에 진입했습니다.',
        requirementText: '연속 21일 목표 달성',
        targetValue: 21,
        unit: '일',
      },
      {
        id: 'streak-30',
        title: '30 Day Legend Streak',
        koreanTitle: '30일 연속 달성 플래티넘',
        category: 'streak',
        tier: 'platinum',
        iconType: 'crown',
        description: '한 달 동안 단 하루도 빠짐없이 목표를 달성한 상위 1% 전설의 실천자입니다.',
        requirementText: '연속 30일 목표 달성',
        targetValue: 30,
        unit: '일',
      },

      // --- Repeats Milestones Series ---
      {
        id: 'repeats-50',
        title: '50 Repeats Beginner',
        koreanTitle: '50회 반복 청취 입문',
        category: 'repeats',
        tier: 'bronze',
        iconType: 'headphones',
        description: '누적 50회의 원어민 음성 반복 청취를 달성하여 영어 귀를 트이기 시작했습니다.',
        requirementText: '총 50회 음성 반복 청취',
        targetValue: 50,
        unit: '회',
      },
      {
        id: 'repeats-200',
        title: '200 Repeats Enthusiast',
        koreanTitle: '200회 쉐도잉 러너',
        category: 'repeats',
        tier: 'silver',
        iconType: 'headphones',
        description: '200회의 집중 반복 쉐도잉으로 발음과 억양의 자연스러움을 획득했습니다.',
        requirementText: '총 200회 음성 반복 청취',
        targetValue: 200,
        unit: '회',
      },
      {
        id: 'repeats-500',
        title: '500 Repeats Dedicated Looper',
        koreanTitle: '500회 무한 루퍼',
        category: 'repeats',
        tier: 'gold',
        iconType: 'zap',
        description: '500회의 무한 루프 반복 학습으로 뇌 속에 단어 패턴을 확실히 각인시켰습니다.',
        requirementText: '총 500회 음성 반복 청취',
        targetValue: 500,
        unit: '회',
      },
      {
        id: 'repeats-1000',
        title: '1000 Repeats Milestone',
        koreanTitle: '1,000회 반복 청취 마일스톤',
        category: 'repeats',
        tier: 'platinum',
        iconType: 'star',
        description: '기념비적인 1,000회 반복 청취 마일스톤 돌파! 장기 기억 저장소에 원어민 사운드가 체화되었습니다.',
        requirementText: '총 1,000회 음성 반복 청취',
        targetValue: 1000,
        unit: '회',
      },
      {
        id: 'repeats-3000',
        title: '3000 Repeats Master',
        koreanTitle: '3,000회 전설의 리스너',
        category: 'repeats',
        tier: 'diamond',
        iconType: 'crown',
        description: '3,000회 이상의 극한 반복 쉐도잉을 달성한 마스터 오브 워드루프입니다.',
        requirementText: '총 3,000회 음성 반복 청취',
        targetValue: 3000,
        unit: '회',
      },

      // --- Vocabulary Explorer Series ---
      {
        id: 'vocab-50',
        title: '50 Words Explorer',
        koreanTitle: '50단어 어휘 탐험가',
        category: 'vocab',
        tier: 'bronze',
        iconType: 'book',
        description: '50개 이상의 필수 어휘를 학습 리스트에 등록하고 첫 발걸음을 뗐습니다.',
        requirementText: '어휘 50개 보유 및 학습',
        targetValue: 50,
        unit: '개',
      },
      {
        id: 'vocab-500',
        title: '500 Words Fluent Learner',
        koreanTitle: '500단어 어휘 빌더',
        category: 'vocab',
        tier: 'silver',
        iconType: 'book',
        description: '초·중등 핵심 기본 어휘 500개를 완벽히 확보하여 독해 기반을 구축했습니다.',
        requirementText: '어휘 500개 보유 및 학습',
        targetValue: 500,
        unit: '개',
      },
      {
        id: 'vocab-1000',
        title: '1000 Words Curriculum Achiever',
        koreanTitle: '1,000단어 교육과정 정복자',
        category: 'vocab',
        tier: 'gold',
        iconType: 'star',
        description: '교육부 지정 필수 3,210단어 중 1,000단어 마일스톤을 당당히 돌파했습니다.',
        requirementText: '어휘 1,000개 보유 및 학습',
        targetValue: 1000,
        unit: '개',
      },
      {
        id: 'vocab-3210',
        title: '3210 Grand Master',
        koreanTitle: '3,210단어 전 교육과정 마스터',
        category: 'vocab',
        tier: 'diamond',
        iconType: 'crown',
        description: '초·중·고·수능 전 교육과정 3,210단어 라이브러리를 완전 마스터했습니다.',
        requirementText: '어휘 3,210개 전체 보유',
        targetValue: 3210,
        unit: '개',
      },

      // --- Goals & Habit Series ---
      {
        id: 'goals-1',
        title: 'First Goal Achiever',
        koreanTitle: '첫 목표 달성자',
        category: 'goals',
        tier: 'bronze',
        iconType: 'target',
        description: '자신과의 약속인 일일 자기계발 목표를 처음으로 완수했습니다.',
        requirementText: '누적 목표 1개 완수',
        targetValue: 1,
        unit: '개',
      },
      {
        id: 'goals-10',
        title: '10 Goals Conquered',
        koreanTitle: '10개 목표 정복 챔피언',
        category: 'goals',
        tier: 'silver',
        iconType: 'target',
        description: '누적 10개의 일일 목표를 달성하여 성장의 발판을 굳건히 다졌습니다.',
        requirementText: '누적 목표 10개 완수',
        targetValue: 10,
        unit: '개',
      },
      {
        id: 'goals-50',
        title: '50 Goals Hero',
        koreanTitle: '50개 목표 완수 히어로',
        category: 'goals',
        tier: 'gold',
        iconType: 'trophy',
        description: '누적 50개의 목표를 정복하여 흔들리지 않는 습관 챔피언에 등극했습니다.',
        requirementText: '누적 목표 50개 완수',
        targetValue: 50,
        unit: '개',
      },
      {
        id: 'goals-perfect',
        title: 'Perfect Day All-Clear',
        koreanTitle: '퍼펙트 데이 올클리어',
        category: 'goals',
        tier: 'platinum',
        iconType: 'star',
        description: '오늘 설정된 모든 일일 목표를 100% 빈틈없이 완수했습니다.',
        requirementText: '오늘 등록된 모든 목표 100% 완수',
        targetValue: 1,
        unit: '회',
      },
    ];

    // Compute status for each badge
    const badgeList: MilestoneBadge[] = badgeDefinitions.map((def) => {
      let currentVal = 0;
      if (def.category === 'streak') {
        currentVal = highestStreak;
      } else if (def.category === 'repeats') {
        currentVal = totalRepeatsCount;
      } else if (def.category === 'vocab') {
        currentVal = vocabCount;
      } else if (def.category === 'goals') {
        if (def.id === 'goals-perfect') {
          currentVal = isTodayPerfect ? 1 : 0;
        } else {
          currentVal = allTimeCompletedGoals;
        }
      }

      const unlocked = currentVal >= def.targetValue;
      const progress =
        def.targetValue > 0
          ? Math.min(100, Math.round((currentVal / def.targetValue) * 100))
          : 0;

      return {
        ...def,
        currentValue: currentVal,
        isUnlocked: unlocked,
        progressPercent: progress,
      };
    });

    const unlocked = badgeList.filter((b) => b.isUnlocked).length;
    const score = unlocked * 100;

    return {
      badges: badgeList,
      unlockedCount: unlocked,
      totalCount: badgeList.length,
      totalScore: score,
    };
  }, [goals, history, totalRepeatsCount, vocabCount]);

  // Filtered badges based on user selection
  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      if (filterUnlockedOnly && !b.isUnlocked) return false;
      if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
      return true;
    });
  }, [badges, selectedCategory, filterUnlockedOnly]);

  // Tier color mapper
  const getTierBadgeStyle = (tier: BadgeTier, isUnlocked: boolean) => {
    if (!isUnlocked) {
      return {
        cardBg: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70',
        badgeColor: 'bg-slate-200 dark:bg-slate-700 text-slate-400',
        iconBg: 'bg-slate-200 dark:bg-slate-700 text-slate-400',
        textColor: 'text-slate-500 dark:text-slate-400',
        glow: '',
      };
    }

    switch (tier) {
      case 'diamond':
        return {
          cardBg: 'bg-gradient-to-br from-cyan-500/10 via-sky-500/10 to-blue-500/10 border-cyan-500/40 shadow-cyan-500/10',
          badgeColor: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/30',
          iconBg: 'bg-gradient-to-tr from-cyan-500 to-blue-500 text-white shadow-cyan-500/30',
          textColor: 'text-cyan-600 dark:text-cyan-300',
          glow: 'ring-1 ring-cyan-500/30 shadow-lg',
        };
      case 'platinum':
        return {
          cardBg: 'bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-500/40 shadow-indigo-500/10',
          badgeColor: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
          iconBg: 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-indigo-500/30',
          textColor: 'text-indigo-600 dark:text-indigo-300',
          glow: 'ring-1 ring-indigo-500/30 shadow-lg',
        };
      case 'gold':
        return {
          cardBg: 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-orange-500/10 border-amber-500/40 shadow-amber-500/10',
          badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30',
          iconBg: 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-amber-500/30',
          textColor: 'text-amber-600 dark:text-amber-300',
          glow: 'ring-1 ring-amber-500/30 shadow-lg',
        };
      case 'silver':
        return {
          cardBg: 'bg-gradient-to-br from-slate-200/50 via-slate-100 to-indigo-500/5 dark:from-slate-800/80 dark:to-indigo-950/20 border-slate-300 dark:border-slate-700 shadow-sm',
          badgeColor: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
          iconBg: 'bg-gradient-to-tr from-slate-500 to-slate-400 text-white shadow-slate-500/30',
          textColor: 'text-slate-700 dark:text-slate-200',
          glow: 'ring-1 ring-slate-400/30 shadow-md',
        };
      case 'bronze':
      default:
        return {
          cardBg: 'bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border-orange-500/30 shadow-sm',
          badgeColor: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
          iconBg: 'bg-gradient-to-tr from-orange-500 to-amber-600 text-white shadow-orange-500/30',
          textColor: 'text-orange-600 dark:text-orange-400',
          glow: 'ring-1 ring-orange-500/20 shadow-sm',
        };
    }
  };

  const renderBadgeIcon = (iconType: MilestoneBadge['iconType'], className = 'w-6 h-6') => {
    switch (iconType) {
      case 'flame':
        return <Flame className={`${className} fill-current`} />;
      case 'headphones':
        return <Headphones className={className} />;
      case 'book':
        return <BookOpen className={className} />;
      case 'target':
        return <Target className={className} />;
      case 'crown':
        return <Crown className={`${className} fill-current`} />;
      case 'star':
        return <Star className={`${className} fill-current`} />;
      case 'zap':
        return <Zap className={`${className} fill-current`} />;
      case 'trophy':
      default:
        return <Trophy className={`${className} fill-current`} />;
    }
  };

  const completionOverallPct = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Trophy className="w-5 h-5 fill-current" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Visual Milestone Badge System</span>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                마일스톤 업적 배지
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            '10 Day Streak Master', '1000 Repeats Milestone' 등 사용자의 누적 학습 성장에 따라 실시간 획득되는 시각적 업적 배지 시스템입니다.
          </p>
        </div>

        {/* Global Progress Pill */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          <div className="px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-right">
            <span className="text-[10px] text-slate-400 block">업적 배지 달성률</span>
            <div className="flex items-baseline gap-1.5 justify-end">
              <span className="text-base font-black text-amber-500">
                {unlockedCount}
              </span>
              <span className="text-xs font-bold text-slate-500">
                / {totalCount}개 ({completionOverallPct}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar & Filter Controls */}
      <div className="space-y-3">
        {/* Overall Completion Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              전체 마일스톤 진척도
            </span>
            <span className="text-xs font-black text-amber-500">
              {unlockedCount}개 획득 완료 ({completionOverallPct}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${completionOverallPct}%` }}
            />
          </div>
        </div>

        {/* Category Segmented Filters & Unlocked Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              전체 ({badges.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('streak')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                selectedCategory === 'streak'
                  ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 fill-current" />
              스트릭
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('repeats')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                selectedCategory === 'repeats'
                  ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Headphones className="w-3 h-3" />
              반복 청취
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('vocab')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                selectedCategory === 'vocab'
                  ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              어휘
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('goals')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                selectedCategory === 'goals'
                  ? 'bg-white dark:bg-slate-700 text-purple-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Target className="w-3 h-3" />
              목표
            </button>
          </div>

          {/* Toggle Unlocked Only */}
          <button
            type="button"
            onClick={() => setFilterUnlockedOnly(!filterUnlockedOnly)}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              filterUnlockedOnly
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>획득한 배지만 보기 ({unlockedCount})</span>
          </button>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredBadges.map((badge) => {
          const style = getTierBadgeStyle(badge.tier, badge.isUnlocked);
          const isSelected = activeBadge?.id === badge.id;

          return (
            <div
              key={badge.id}
              onClick={() => setActiveBadge(isSelected ? null : badge)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative select-none flex flex-col justify-between ${style.cardBg} ${style.glow} ${
                isSelected ? 'ring-2 ring-amber-400 scale-[1.02]' : 'hover:scale-[1.01]'
              }`}
            >
              {/* Card Top: Icon & Tier Tag */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${style.iconBg}`}
                >
                  {renderBadgeIcon(badge.iconType)}
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border inline-block ${style.badgeColor}`}
                  >
                    {badge.tier}
                  </span>
                  <div className="mt-1">
                    {badge.isUnlocked ? (
                      <span className="text-[10px] font-extrabold text-emerald-500 dark:text-emerald-400 flex items-center gap-0.5 justify-end">
                        <CheckCircle2 className="w-3 h-3" /> 획득 완료
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5 justify-end">
                        <Lock className="w-2.5 h-2.5" /> 잠김
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1 mb-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{badge.title}</span>
                </h4>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {badge.koreanTitle}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {badge.description}
                </p>
              </div>

              {/* Progress Bar & Current Value */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">
                    {badge.requirementText}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {badge.currentValue} / {badge.targetValue} {badge.unit} ({badge.progressPercent}%)
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      badge.isUnlocked
                        ? 'bg-emerald-500 shadow-sm'
                        : 'bg-amber-500/80'
                    }`}
                    style={{ width: `${badge.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Badge Active Spotlight Detail Card */}
      {activeBadge && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-700/80 shadow-xl text-xs space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  getTierBadgeStyle(activeBadge.tier, activeBadge.isUnlocked).iconBg
                }`}
              >
                {renderBadgeIcon(activeBadge.iconType, 'w-7 h-7')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base">{activeBadge.title}</span>
                  <span className="text-xs text-amber-400 font-bold">
                    ({activeBadge.koreanTitle})
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      getTierBadgeStyle(activeBadge.tier, activeBadge.isUnlocked).badgeColor
                    }`}
                  >
                    {activeBadge.tier}
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                  {activeBadge.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveBadge(null)}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] shrink-0"
            >
              닫기
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
            <div>
              <span className="text-slate-400">달성 요건: </span>
              <strong className="text-white">{activeBadge.requirementText}</strong>
            </div>
            <div>
              <span className="text-slate-400">현재 상태: </span>
              <strong className={activeBadge.isUnlocked ? 'text-emerald-400' : 'text-amber-400'}>
                {activeBadge.isUnlocked ? '🎉 배지 획득 완료!' : `진행 중 (${activeBadge.currentValue}/${activeBadge.targetValue} ${activeBadge.unit})`}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Motivation Footer */}
      <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900 dark:text-white">
            지속적인 학습이 새로운 마일스톤 배지를 잠금 해제합니다
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
            매일 연속 스트릭을 이어가고 음성 반복 청취를 실천할수록 더 높은 티어(Gold, Platinum, Diamond)의 업적 배지가 실시간으로 해금됩니다.
            1,000회 반복 청취와 10일 연속 달성 마스터 배지에 도전해보세요!
          </p>
        </div>
      </div>
    </div>
  );
};
