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
} from 'lucide-react';
import { Goal, DailyGoalHistory, UserProfile } from '../types';
import { StreakFire } from './StreakFire';
import { getLocalDateString } from '../utils/dateUtils';

interface StreakCalendarHeatmapProps {
  goals: Goal[];
  history: DailyGoalHistory[];
  userProfile?: UserProfile | null;
  totalRepeatsCount?: number;
}

interface CalendarDayItem {
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
}

export const StreakCalendarHeatmap: React.FC<StreakCalendarHeatmapProps> = ({
  goals,
  history,
  userProfile,
  totalRepeatsCount = 0,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => getLocalDateString(today), [today]);

  // Calendar year and month state (defaults to current year and month)
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<CalendarDayItem | null>(null);

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

    // Helper: calculate activity intensity and streak status
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

      // Intensity level (0 ~ 4)
      let intensityLevel: 0 | 1 | 2 | 3 | 4 = 0;
      if (!isFuture && activityScore > 0) {
        if (activityScore >= 22 || completedGoalsCount >= 3) {
          intensityLevel = 4; // Peak Master
        } else if (activityScore >= 14 || completedGoalsCount >= 2) {
          intensityLevel = 3; // High Focus
        } else if (activityScore >= 7 || completedGoalsCount >= 1) {
          intensityLevel = 2; // Moderate Activity
        } else {
          intensityLevel = 1; // Light Activity
        }
      }

      // Streak is maintained when goals were completed or strong activity occurred on that day
      const isStreakMaintained =
        !isFuture && (completedGoalsCount >= 1 || vocabStudyCount >= 6);

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
        streakMaintainedCount,
        totalMonthGoalsDone,
        maxMonthStreak,
        daysInMonth: daysInCurrentMonth,
      },
    };
  }, [viewYear, viewMonth, todayStr, todayCompletedGoals, totalGoalsSet, historyMap, totalRepeatsCount]);

  // Current active streak from userProfile or fallback
  const currentStreak = userProfile?.streakDays || (todayCompletedGoals > 0 ? 1 : 0);

  // Active inspected day (defaults to selectedDay or today if in current view)
  const inspectedDay = selectedDay || calendarDays.find((d) => d.isToday) || calendarDays[0];

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20 shrink-0">
            <CalendarIcon className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>스트릭 캘린더 (Streak Calendar) 히트맵</span>
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                스트릭 유지일 강조
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              일별 활동 강도를 5단계 녹색으로 시각화하고 목표 연속 스트릭이 유지된 날을 불꽃 링으로 집중 하이라이트합니다.
            </p>
          </div>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
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

      {/* Monthly Streak KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Metric 1: Current Streak */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">
              현재 연속 스트릭
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {currentStreak}
              </span>
              <span className="text-xs font-bold text-slate-500">일 연속</span>
            </div>
          </div>
          {currentStreak > 0 && (
            <StreakFire streak={currentStreak} size="sm" showLabel={false} />
          )}
        </div>

        {/* Metric 2: Month Streak Maintained Days */}
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">
            이달의 스트릭 유지일
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {monthMetrics.streakMaintainedCount}
            </span>
            <span className="text-xs font-bold text-slate-500">
              / {monthMetrics.daysInMonth}일
            </span>
          </div>
        </div>

        {/* Metric 3: Active Study Days */}
        <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30">
          <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 block">
            학습 활동 실천일
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-teal-600 dark:text-teal-400 font-mono">
              {monthMetrics.activeDaysCount}
            </span>
            <span className="text-xs font-bold text-slate-500">일 참여</span>
          </div>
        </div>

        {/* Metric 4: Longest Sequence in Month */}
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block">
            이달 최장 연속 기록
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {monthMetrics.maxMonthStreak}
            </span>
            <span className="text-xs font-bold text-slate-500">일 최장</span>
          </div>
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

            // Green Intensity Theme classes
            const intensityBg = {
              0: 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700/80',
              1: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/80 hover:bg-emerald-200 dark:hover:bg-emerald-900',
              2: 'bg-emerald-300 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 border border-emerald-400 dark:border-emerald-700 hover:bg-emerald-400 dark:hover:bg-emerald-700',
              3: 'bg-emerald-500 dark:bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-500 shadow-xs',
              4: 'bg-emerald-600 dark:bg-emerald-500 text-white border border-emerald-400 dark:border-emerald-300 font-black shadow-sm hover:brightness-110',
            }[day.intensityLevel];

            // Streak Highlight styling
            const streakRing = day.isStreakMaintained
              ? 'ring-2 ring-amber-400 dark:ring-amber-500 ring-offset-1 dark:ring-offset-slate-900 shadow-md shadow-amber-500/25'
              : '';

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDay(day)}
                disabled={day.isFuture}
                className={`relative aspect-square rounded-xl p-1 sm:p-1.5 transition-all flex flex-col justify-between cursor-pointer select-none ${
                  !day.isCurrentMonth ? 'opacity-30' : 'opacity-100'
                } ${day.isFuture ? 'opacity-25 cursor-not-allowed' : ''} ${
                  isSelected ? 'scale-105 z-10 ring-2 ring-indigo-500 shadow-lg' : ''
                } ${intensityBg} ${streakRing}`}
                title={`${day.dateStr}: ${
                  day.isStreakMaintained ? '🔥 스트릭 유지일! ' : ''
                }활동 강도 Lv.${day.intensityLevel} (완료 목표 ${day.completedGoalsCount}개, 학습 ${day.vocabStudyCount}회)`}
              >
                {/* Top Row: Day Number & Streak Flame Badge */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[11px] sm:text-xs font-mono font-bold leading-none ${
                      day.isToday ? 'underline decoration-2 decoration-amber-400' : ''
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {/* Flame Icon on Streak Maintained Day */}
                  {day.isStreakMaintained && (
                    <span className="text-[10px] sm:text-xs leading-none drop-shadow-xs animate-pulse">
                      🔥
                    </span>
                  )}
                </div>

                {/* Bottom Row: Today indicator or activity indicator */}
                <div className="w-full flex items-center justify-between mt-auto">
                  {day.isToday && (
                    <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-400 text-slate-950 leading-tight">
                      오늘
                    </span>
                  )}
                  {day.intensityLevel > 0 && !day.isToday && (
                    <span className="text-[8px] font-mono opacity-80 ml-auto leading-tight">
                      Lv.{day.intensityLevel}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend & Day Details Card */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* 5-Level Green Heatmap Legend */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-400 font-bold text-[11px]">활동 강도:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">없음</span>
            <div className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" title="Lv.0 없음" />
            <div className="w-3.5 h-3.5 rounded-md bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800" title="Lv.1 가벼운 학습" />
            <div className="w-3.5 h-3.5 rounded-md bg-emerald-300 dark:bg-emerald-800 border border-emerald-400 dark:border-emerald-700" title="Lv.2 보통 학습" />
            <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 dark:bg-emerald-600" title="Lv.3 집중 학습" />
            <div className="w-3.5 h-3.5 rounded-md bg-emerald-600 dark:bg-emerald-500 shadow-sm" title="Lv.4 마스터 몰입" />
            <span className="text-[10px] text-slate-400">매우 높음</span>
          </div>

          {/* Highlight Badge Indicator Legend */}
          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 ring-2 ring-amber-400 flex items-center justify-center text-[8px]">
              🔥
            </div>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
              연속 스트릭 유지일
            </span>
          </div>
        </div>

        {/* Inspected Day Detail Bubble */}
        {inspectedDay && (
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono font-black text-slate-900 dark:text-white">
              <span>📅 {inspectedDay.dateStr}</span>
              {inspectedDay.isToday && (
                <span className="text-[9px] bg-amber-400 text-slate-950 px-1 rounded font-sans">
                  오늘
                </span>
              )}
            </div>

            <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                목표 완료: <strong className="text-emerald-600 dark:text-emerald-400">{inspectedDay.completedGoalsCount}개</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                학습 활동: <strong className="text-slate-700 dark:text-slate-300">{inspectedDay.vocabStudyCount}회</strong>
              </span>
              {inspectedDay.isStreakMaintained ? (
                <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 flex items-center gap-0.5">
                  🔥 스트릭 유지
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">휴식</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreakCalendarHeatmap;
