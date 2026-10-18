import React, { useMemo } from 'react';
import {
  Flame,
  Trophy,
  Target,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Award,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Goal, DailyGoalHistory } from '../types';

interface DailyGoalStreakIndicatorProps {
  goals: Goal[];
  history: DailyGoalHistory[];
}

interface StreakMilestone {
  days: number;
  title: string;
  badge: string;
  color: string;
  description: string;
}

const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, title: '3일 연속 스타터', badge: '🌱 스타터', color: 'text-emerald-500', description: '첫 3일 연속 목표 달성으로 좋은 출발!' },
  { days: 7, title: '7일 연속 브론즈 스트릭', badge: '🥉 브론즈', color: 'text-amber-500', description: '1주일 연속 실천으로 습관 루틴 형성' },
  { days: 14, title: '14일 연속 실버 스트릭', badge: '🥈 실버', color: 'text-indigo-400', description: '2주 연속 실천으로 흔들리지 않는 루틴' },
  { days: 21, title: '21일 골드 습관화 각인', badge: '🥇 골드', color: 'text-yellow-400', description: '뇌과학 21일 습관 형성 임계점 돌파' },
  { days: 30, title: '30일 플래티넘 마스터', badge: '💎 플래티넘', color: 'text-cyan-400', description: '1개월 완전 정복, 상위 1% 실천자' },
  { days: 60, title: '60일 다이아몬드 레전드', badge: '👑 레전드', color: 'text-purple-400', description: '완벽하게 라이프스타일로 체화된 단계' },
];

export const DailyGoalStreakIndicator: React.FC<DailyGoalStreakIndicatorProps> = ({
  goals,
  history,
}) => {
  const {
    currentStreak,
    longestStreak,
    isTodayCompleted,
    todayCompletedCount,
    totalGoalsCount,
    last7DaysTimeline,
    nextMilestone,
    milestoneProgress,
    streakTier,
  } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    // Today's goal status
    const completedToday = goals.filter((g) => g.isCompleted).length;
    const totalGoals = goals.length;
    const isTodayDone = completedToday > 0;

    // History map for quick lookup
    const historyMap = new Map<string, DailyGoalHistory>();
    (history || []).forEach((h) => {
      if (h && h.date) {
        historyMap.set(h.date, h);
      }
    });

    // 1. Calculate Current Consecutive Streak
    let streakCount = 0;
    let checkDate = new Date(today);

    // If today is completed, start streak from today
    if (isTodayDone) {
      streakCount = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If today is not completed yet, check if yesterday was completed to keep the active streak alive
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = checkDate.toISOString().split('T')[0];
      const yHist = historyMap.get(yesterdayStr);
      if (yHist && yHist.completedGoalsCount > 0) {
        streakCount = 0; // Will be incremented in the loop below
      } else {
        // Yesterday was also not completed
        streakCount = 0;
      }
    }

    // Traverse backwards day-by-day
    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      const histItem = historyMap.get(dStr);

      if (histItem && histItem.completedGoalsCount > 0) {
        streakCount++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // 2. Calculate Longest Streak from All History & Goals
    let maxHistoricalStreak = 0;
    let tempStreak = 0;

    // Sort history chronologically
    const sortedHistory = [...(history || [])].sort((a, b) => a.date.localeCompare(b.date));

    sortedHistory.forEach((h) => {
      if (h.completedGoalsCount > 0) {
        tempStreak++;
        if (tempStreak > maxHistoricalStreak) {
          maxHistoricalStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    });

    // Individual goal max streaks
    const goalMaxStreaks = goals.map((g) => g.streak || 0);
    const overallLongest = Math.max(
      maxHistoricalStreak,
      streakCount,
      ...goalMaxStreaks,
      1
    );

    // 3. Build Recent 7 Days Timeline
    const timeline = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];
      const shortDate = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      const isTodayItem = i === 0;

      let completedCount = 0;
      if (isTodayItem) {
        completedCount = completedToday;
      } else {
        const hist = historyMap.get(dateStr);
        completedCount = hist ? hist.completedGoalsCount : 0;
      }

      const isAchieved = completedCount > 0;

      timeline.push({
        date: dateStr,
        shortDate,
        dayName,
        isToday: isTodayItem,
        isAchieved,
        completedCount,
      });
    }

    // 4. Determine Milestone & Progress
    const nextMs =
      STREAK_MILESTONES.find((m) => m.days > streakCount) ||
      STREAK_MILESTONES[STREAK_MILESTONES.length - 1];

    const prevMsDays =
      STREAK_MILESTONES.slice()
        .reverse()
        .find((m) => m.days <= streakCount)?.days || 0;

    const progressSpan = nextMs.days - prevMsDays;
    const progressDone = Math.max(0, streakCount - prevMsDays);
    const progressPct =
      progressSpan > 0 ? Math.min(100, Math.round((progressDone / progressSpan) * 100)) : 100;

    // Current Tier
    const tier =
      streakCount >= 60
        ? { title: '👑 레전드 스트릭 (Legend)', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' }
        : streakCount >= 30
        ? { title: '💎 플래티넘 마스터 (Platinum)', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' }
        : streakCount >= 21
        ? { title: '🥇 골드 습관화 (Gold)', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' }
        : streakCount >= 14
        ? { title: '🥈 실버 스트릭 (Silver)', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' }
        : streakCount >= 7
        ? { title: '🥉 브론즈 7일 스트릭 (Bronze)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
        : streakCount >= 3
        ? { title: '🌱 스타터 모멘텀 (Starter)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
        : { title: '🔥 스트릭 도전 중 (Challenge)', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };

    return {
      currentStreak: streakCount,
      longestStreak: Math.max(overallLongest, streakCount),
      isTodayCompleted: isTodayDone,
      todayCompletedCount: completedToday,
      totalGoalsCount: totalGoals,
      last7DaysTimeline: timeline,
      nextMilestone: nextMs,
      milestoneProgress: progressPct,
      streakTier: tier,
    };
  }, [goals, history]);

  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-rose-950/30 border border-amber-500/30 dark:border-amber-500/40 shadow-lg relative overflow-hidden transition-all">
      {/* Background Decorative Flame Glow */}
      <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-amber-500/15 via-orange-500/5 to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Top Header: Badge, Title, and Longest Streak */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 dark:border-amber-500/30 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-500 dark:text-amber-400">
                <Flame className="w-5 h-5 fill-current animate-pulse" />
              </span>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daily Goal Completion Streak</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                  일일 목표 연속 달성
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              하루도 빠짐없이 일일 학습 및 자기계발 목표를 연속으로 달성한 일수를 정밀 집계합니다.
            </p>
          </div>

          {/* Current Tier Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1.5 shadow-sm ${streakTier.color}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{streakTier.title}</span>
            </span>
          </div>
        </div>

        {/* Main Indicator: Large Fire Display & Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* 1. Main Current Streak Box */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/30 shadow-sm flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30 shrink-0">
              <Flame className="w-9 h-9 fill-current animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                현재 연속 달성 스트릭
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentStreak}
                </span>
                <span className="text-sm font-bold text-amber-500">일 연속 달성!</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isTodayCompleted ? (
                  <span className="text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> 오늘 목표 달성 완료 (기록 연장 중)
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> 오늘 목표 완료 시 스트릭이 이어집니다
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* 2. Longest Record vs Today Completion */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                역대 최고 연속 기록 (Best)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {longestStreak}
                </span>
                <span className="text-xs font-bold text-slate-500">일 연속</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {currentStreak >= longestStreak && currentStreak > 0
                  ? '🏆 현재 최고 기록 갱신 중!'
                  : `최고 기록까지 앞으로 ${longestStreak - currentStreak}일`}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
          </div>

          {/* 3. Next Milestone Tracker */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                다음 목표: {nextMilestone.badge}
              </span>
              <span className="font-extrabold text-amber-500">
                {nextMilestone.days}일 ({milestoneProgress}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {nextMilestone.description}
            </p>
          </div>
        </div>

        {/* 7-Day Streak Timeline Tracker (최근 7일 연속성 시각화) */}
        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-amber-500/20 dark:border-amber-500/30">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              최근 7일 일별 목표 달성 스트릭 타임라인
            </span>
            <span className="text-[11px] text-slate-500">
              오늘 목표 완료: <strong className="text-amber-500">{todayCompletedCount}</strong> / {totalGoalsCount}개
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {last7DaysTimeline.map((item, idx) => (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  item.isToday
                    ? item.isAchieved
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-300 shadow-sm ring-1 ring-amber-500/30'
                      : 'bg-amber-500/5 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : item.isAchieved
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-[10px] font-bold block mb-1">
                  {item.dayName}
                  {item.isToday && <span className="text-amber-500 font-extrabold ml-0.5">•</span>}
                </span>

                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1">
                  {item.isAchieved ? (
                    <Flame className="w-5 h-5 fill-current text-amber-500 animate-pulse" />
                  ) : item.isToday ? (
                    <Clock className="w-4 h-4 text-amber-400" />
                  ) : (
                    <span className="text-xs text-slate-400">–</span>
                  )}
                </div>

                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                  {item.shortDate}
                </span>

                <span
                  className={`text-[9px] font-bold mt-0.5 ${
                    item.isAchieved ? 'text-amber-500' : 'text-slate-400'
                  }`}
                >
                  {item.isAchieved ? `${item.completedCount}개 완수` : item.isToday ? '진행 중' : '미완수'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Motivational Streak Feedback Notice */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {currentStreak >= 7 ? (
                <>
                  놀라운 끈기입니다! <strong className="text-amber-500 font-extrabold">{currentStreak}일</strong> 동안 매일 빠짐없이
                  자기계발과 영어 학습을 완수하고 계십니다.
                </>
              ) : currentStreak >= 3 ? (
                <>
                  좋은 흐름을 타고 있습니다! <strong className="text-amber-500 font-extrabold">{currentStreak}일 연속 달성</strong> 중이며,
                  7일 브론즈 스트릭까지 <strong className="text-indigo-400">{7 - currentStreak}일</strong> 남았습니다.
                </>
              ) : (
                <>
                  매일 1개 이상의 학습 목표를 완료하면 연속 스트릭이 누적됩니다. 오늘 목표를 달성하고 불꽃을 이어가세요!
                </>
              )}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-amber-500/90 font-bold shrink-0">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Keep the Streak Burning</span>
          </div>
        </div>
      </div>
    </div>
  );
};
