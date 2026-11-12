import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Flame,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  CheckCircle2,
  Clock,
  Zap,
  Info,
  RotateCcw,
  Sprout,
  Play,
} from 'lucide-react';
import { Goal, DailyGoalHistory, UserProfile } from '../types';
import { StreakFire } from './StreakFire';
import { getLocalDateString } from '../utils/dateUtils';

export interface StreakCalendarHeatmapProps {
  goals: Goal[];
  history: DailyGoalHistory[];
  userProfile?: UserProfile | null;
  totalRepeatsCount?: number;
  onStartReviewQuiz?: () => void;
}

export interface CalendarDayItem {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  intensityLevel: 0 | 1 | 2 | 3 | 4;
  activityScore: number;
  vocabStudyCount: number;
  completedGoalsCount: number;
  totalGoalsCount: number;
  isStreakMaintained: boolean;
  isQuizPassed: boolean;
}

export const StreakCalendarHeatmap: React.FC<StreakCalendarHeatmapProps> = ({
  goals,
  history,
  userProfile,
  totalRepeatsCount = 0,
  onStartReviewQuiz,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => getLocalDateString(today), [today]);

  // Calendar year and month state (defaults to current year and month)
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<CalendarDayItem | null>(null);

  // Toggle for flame simulation mode on today's date for interactive testing
  const [simulatedFlameToday, setSimulatedFlameToday] = useState<boolean>(false);

  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

  // Fast map lookup for history
  const historyMap = useMemo(() => {
    const map = new Map<string, DailyGoalHistory>();
    (history || []).forEach((h) => {
      if (h && h.date) {
        map.set(h.date, h);
      }
    });
    return map;
  }, [history]);

  // Live today stats from goals
  const todayCompletedGoals = useMemo(
    () => goals.filter((g) => g.isCompleted).length,
    [goals]
  );
  const totalGoalsSet = goals.length || 4;

  // Month navigation handlers
  const handlePrevMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(null);
  };

  // Build calendar matrix for viewYear and viewMonth
  const { calendarDays, monthMetrics } = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0: Sun, 1: Mon, ...
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: CalendarDayItem[] = [];

    // Helper: calculate activity intensity, quiz achievement, and streak status
    const calculateDayData = (
      date: Date,
      isCurrentMonth: boolean
    ): CalendarDayItem => {
      const dateStr = getLocalDateString(date);
      const isToday = dateStr === todayStr;
      const isFuture = date > today && !isToday;

      let vocabStudyCount = 0;
      let completedGoalsCount = 0;
      let totalGoalsCount = totalGoalsSet;

      if (isToday) {
        completedGoalsCount = todayCompletedGoals;
        // Include today's live activity
        const histToday = historyMap.get(dateStr);
        vocabStudyCount = Math.max(histToday?.vocabStudyCount || 0, Math.floor(totalRepeatsCount % 20));
      } else {
        const histItem = historyMap.get(dateStr);
        if (histItem) {
          vocabStudyCount = histItem.vocabStudyCount || 0;
          completedGoalsCount = histItem.completedGoalsCount || 0;
          totalGoalsCount = histItem.totalGoalsCount || totalGoalsSet;
        }
      }

      // Activity Score weighted by goals + repeats
      const activityScore = isFuture
        ? 0
        : vocabStudyCount + completedGoalsCount * 4;

      // Intensity level for Grass Planting (0 ~ 4)
      let intensityLevel: 0 | 1 | 2 | 3 | 4 = 0;
      if (!isFuture && (activityScore > 0 || (isToday && simulatedFlameToday))) {
        if (activityScore >= 22 || completedGoalsCount >= 3) {
          intensityLevel = 4; // Master Golden Grass Bloom
        } else if (activityScore >= 14 || completedGoalsCount >= 2) {
          intensityLevel = 3; // Lush Forest
        } else if (activityScore >= 7 || completedGoalsCount >= 1) {
          intensityLevel = 2; // Meadow Grass
        } else {
          intensityLevel = 1; // Young Sprout
        }
      }

      // Streak is maintained when goals were completed or strong activity occurred on that day
      const isStreakMaintained =
        !isFuture && (completedGoalsCount >= 1 || vocabStudyCount >= 6 || (isToday && simulatedFlameToday));

      // Quiz & Goal Achievement Flag: triggers flame animation effect
      const isQuizPassed =
        !isFuture && (completedGoalsCount >= 1 || vocabStudyCount >= 5 || (isToday && simulatedFlameToday));

      return {
        dateStr,
        dayNumber: date.getDate(),
        isCurrentMonth,
        isToday,
        isFuture,
        intensityLevel,
        activityScore,
        vocabStudyCount,
        completedGoalsCount,
        totalGoalsCount,
        isStreakMaintained,
        isQuizPassed,
      };
    };

    // 1. Previous Month Leading Days (padding)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
      days.push(calculateDayData(prevDate, false));
    }

    // 2. Current Month Days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const currDate = new Date(viewYear, viewMonth, d);
      days.push(calculateDayData(currDate, true));
    }

    // 3. Next Month Trailing Days (fill row up to multiple of 7)
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let nextDay = 1; nextDay <= remainingDays; nextDay++) {
        const nextDate = new Date(viewYear, viewMonth + 1, nextDay);
        days.push(calculateDayData(nextDate, false));
      }
    }

    // Compute Month Summary Metrics for current month days only
    const currMonthDays = days.filter((d) => d.isCurrentMonth && !d.isFuture);
    const activeDaysCount = currMonthDays.filter((d) => d.intensityLevel > 0).length;
    const flameDaysCount = currMonthDays.filter((d) => d.isQuizPassed).length;
    const streakMaintainedCount = currMonthDays.filter((d) => d.isStreakMaintained).length;
    const totalMonthGoalsDone = currMonthDays.reduce((acc, d) => acc + d.completedGoalsCount, 0);

    // Calculate max streak sequence in current month
    let maxMonthStreak = 0;
    let tempStreak = 0;
    currMonthDays.forEach((d) => {
      if (d.isStreakMaintained) {
        tempStreak++;
        if (tempStreak > maxMonthStreak) maxMonthStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    });

    return {
      calendarDays: days,
      monthMetrics: {
        activeDaysCount,
        flameDaysCount,
        streakMaintainedCount,
        totalMonthGoalsDone,
        maxMonthStreak,
        daysInMonth: daysInCurrentMonth,
      },
    };
  }, [viewYear, viewMonth, todayStr, todayCompletedGoals, totalGoalsSet, historyMap, totalRepeatsCount, simulatedFlameToday]);

  // Current active streak from userProfile or fallback
  const currentStreak = userProfile?.streakDays || (todayCompletedGoals > 0 || simulatedFlameToday ? 1 : 0);

  // Active inspected day (defaults to selectedDay or today if in current view)
  const inspectedDay = selectedDay || calendarDays.find((d) => d.isToday) || calendarDays[0];

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 shrink-0">
            <Sprout className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>🌱 학습 잔디 심기 월간 히트맵 캘린더</span>
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500 fill-amber-500 animate-pulse" />
                퀴즈 달성 불꽃 이펙트
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              GitHub 스타일의 5단계 녹색 잔디 심기로 학습 연속성(Streak)을 시각화하며, 퀴즈 및 목표 달성 날짜엔 반짝이는 불꽃 애니메이션 이펙트가 점등됩니다.
            </p>
          </div>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 flex-wrap">
          {/* Flame Simulation Trigger Button */}
          <button
            type="button"
            onClick={() => setSimulatedFlameToday((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
              simulatedFlameToday
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-amber-500/30 ring-2 ring-amber-400'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
            }`}
            title="오늘 날짜에 퀴즈 달성 불꽃 애니메이션 시각효과 온/오프 테스트"
          >
            <Flame className={`w-3.5 h-3.5 fill-current ${simulatedFlameToday ? 'animate-bounce' : ''}`} />
            <span>{simulatedFlameToday ? '🔥 불꽃 연출 중' : '🔥 퀴즈 불꽃 테스트'}</span>
          </button>

          <button
            type="button"
            onClick={handleGoToToday}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="이번 달로 바로가기"
          >
            <RotateCcw className="w-3 h-3" />
            <span>오늘</span>
          </button>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="이전 달"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-black text-slate-900 dark:text-white min-w-[90px] text-center font-mono">
              {viewYear}년 {viewMonth + 1}월
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="다음 달"
              aria-label="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Grass Planting & Streak KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Metric 1: Grass Planting Active Days */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">
              🌱 이달 심은 학습 잔디
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {monthMetrics.activeDaysCount}
              </span>
              <span className="text-xs font-bold text-slate-500">
                / {monthMetrics.daysInMonth}일
              </span>
            </div>
          </div>
          <Sprout className="w-6 h-6 text-emerald-500 opacity-80 shrink-0" />
        </div>

        {/* Metric 2: Quiz & Goal Flame Achievement Days */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/15 border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">
              🔥 퀴즈·목표 불꽃 달성일
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {monthMetrics.flameDaysCount}
              </span>
              <span className="text-xs font-bold text-slate-500">일 점등</span>
            </div>
          </div>
          <Flame className="w-6 h-6 text-amber-500 fill-amber-500 animate-pulse shrink-0" />
        </div>

        {/* Metric 3: Current Global Streak */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block">
              🔥 현재 연속 스트릭
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {currentStreak}
              </span>
              <span className="text-xs font-bold text-slate-500">일 연속</span>
            </div>
          </div>
          {currentStreak > 0 && (
            <StreakFire streak={currentStreak} size="sm" showLabel={false} />
          )}
        </div>

        {/* Metric 4: Longest Grass Sequence in Month */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 block">
              🏆 이달 최장 잔디 스트릭
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-teal-600 dark:text-teal-400 font-mono">
                {monthMetrics.maxMonthStreak}
              </span>
              <span className="text-xs font-bold text-slate-500">일 최장</span>
            </div>
          </div>
          <Trophy className="w-6 h-6 text-teal-500 opacity-80 shrink-0" />
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="space-y-2">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
          {DAY_NAMES.map((name, idx) => (
            <div
              key={name}
              className={`text-xs font-black py-1 select-none ${
                idx === 0
                  ? 'text-rose-500'
                  : idx === 6
                  ? 'text-blue-500'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((day) => {
            const isSelected = inspectedDay?.dateStr === day.dateStr;

            // 5-Level Grass Intensity Palette
            const grassBg = {
              0: 'bg-slate-100/90 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700/80',
              1: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 shadow-2xs',
              2: 'bg-emerald-300 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 border border-emerald-400 dark:border-emerald-700 hover:bg-emerald-400 dark:hover:bg-emerald-700 shadow-xs',
              3: 'bg-emerald-500 dark:bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm font-semibold',
              4: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-400 dark:from-emerald-500 dark:via-teal-600 dark:to-amber-500 text-slate-950 font-black border border-amber-300 dark:border-amber-400 shadow-md hover:brightness-110',
            }[day.intensityLevel];

            // Flame Ring Animation effect on Quiz/Goal achievement date
            const flameEffectRing = day.isQuizPassed
              ? 'ring-2 ring-amber-400 dark:ring-amber-500 ring-offset-1 dark:ring-offset-slate-900 shadow-lg shadow-amber-500/30'
              : '';

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDay(day)}
                disabled={day.isFuture}
                className={`relative aspect-square rounded-xl p-1 sm:p-1.5 transition-all flex flex-col justify-between cursor-pointer select-none overflow-hidden ${
                  !day.isCurrentMonth ? 'opacity-30' : 'opacity-100'
                } ${day.isFuture ? 'opacity-25 cursor-not-allowed' : ''} ${
                  isSelected ? 'scale-105 z-10 ring-2 ring-indigo-500 shadow-xl' : ''
                } ${grassBg} ${flameEffectRing}`}
                title={`${day.dateStr}: ${
                  day.isQuizPassed ? '🔥 퀴즈 달성 불꽃 점등! ' : ''
                }학습 잔디 강도 Lv.${day.intensityLevel} (완료 목표 ${day.completedGoalsCount}개, 학습 ${day.vocabStudyCount}회)`}
              >
                {/* Flame Background Glow Aura on Quiz Passed Day */}
                {day.isQuizPassed && (
                  <span
                    className="absolute inset-0 bg-gradient-to-t from-amber-500/30 via-orange-500/15 to-transparent pointer-events-none animate-pulse"
                    aria-hidden="true"
                  />
                )}

                {/* Top Row: Day Number & Animated Flame Icon */}
                <div className="flex items-center justify-between w-full relative z-10">
                  <span
                    className={`text-[11px] sm:text-xs font-mono font-bold leading-none ${
                      day.isToday ? 'underline decoration-2 decoration-amber-400 font-black' : ''
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {/* Sparkling Animated Flame Icon when Quiz or Goals Achieved */}
                  {day.isQuizPassed ? (
                    <span className="relative flex items-center justify-center shrink-0">
                      <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400 animate-bounce drop-shadow-md" />
                      <Sparkles className="w-2.5 h-2.5 text-amber-200 absolute -top-1 -right-1 animate-ping opacity-75" />
                    </span>
                  ) : day.intensityLevel > 0 ? (
                    <span className="text-[10px] leading-none opacity-80" title="학습 잔디 심기 완료">
                      🌱
                    </span>
                  ) : null}
                </div>

                {/* Bottom Row: Today tag or Grass Level Badge */}
                <div className="w-full flex items-center justify-between mt-auto relative z-10">
                  {day.isToday && (
                    <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-400 text-slate-950 leading-tight">
                      오늘
                    </span>
                  )}
                  {day.intensityLevel > 0 && !day.isToday && (
                    <span className="text-[8px] font-mono opacity-90 ml-auto leading-tight font-bold">
                      Lv.{day.intensityLevel}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend & Inspected Day Details Bubble Card */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* 5-Level Grass Heatmap Legend */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-500 dark:text-slate-400 font-extrabold text-[11px] flex items-center gap-1">
            <Sprout className="w-3.5 h-3.5 text-emerald-500" />
            잔디 심기 단계:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Lv.0</span>
            <div className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" title="Lv.0 미학습 (빈 땅)" />
            <div className="w-3.5 h-3.5 rounded-md bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800" title="Lv.1 어린 새싹" />
            <div className="w-3.5 h-3.5 rounded-md bg-emerald-300 dark:bg-emerald-800 border border-emerald-400 dark:border-emerald-700" title="Lv.2 싱그런 잔디" />
            <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 dark:bg-emerald-600" title="Lv.3 짙은 숲속" />
            <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-emerald-500 to-amber-400 border border-amber-300 shadow-xs" title="Lv.4 황금꽃 마스터" />
            <span className="text-[10px] text-slate-400">Lv.4</span>
          </div>

          {/* Highlight Badge Indicator Legend */}
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="w-4 h-4 rounded-md bg-amber-500/20 border border-amber-400 flex items-center justify-center text-[9px] shadow-xs">
              <Flame className="w-3 h-3 text-amber-500 fill-amber-500 animate-pulse" />
            </div>
            <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
              퀴즈 달성 불꽃 점등
            </span>
          </div>
        </div>

        {/* Inspected Day Detail Bubble */}
        {inspectedDay && (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 font-mono font-black text-slate-900 dark:text-white text-xs">
                <span>📅 {inspectedDay.dateStr}</span>
                {inspectedDay.isToday && (
                  <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                    오늘
                  </span>
                )}
              </div>

              <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  목표 달성: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{inspectedDay.completedGoalsCount}개</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  어휘 활동: <strong className="text-slate-800 dark:text-slate-200 font-mono">{inspectedDay.vocabStudyCount}회</strong>
                </span>
                {inspectedDay.isQuizPassed ? (
                  <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-500 fill-amber-500 animate-bounce" />
                    <span>퀴즈·목표 달성 불꽃!</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">잔디 조용함</span>
                )}
              </div>
            </div>

            {/* If today & quiz action available */}
            {inspectedDay.isToday && onStartReviewQuiz && (
              <button
                type="button"
                onClick={onStartReviewQuiz}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Play className="w-3 h-3 fill-slate-950" />
                <span>오늘 복습 퀴즈 도전</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StreakCalendarHeatmap;
