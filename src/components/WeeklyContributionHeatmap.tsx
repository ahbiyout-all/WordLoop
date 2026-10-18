import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Sparkles,
  Flame,
  TrendingUp,
  CheckCircle2,
  Clock,
  Layers,
  Zap,
  Info,
  BarChart2,
} from 'lucide-react';
import { DailyGoalHistory, Goal } from '../types';

interface WeeklyContributionHeatmapProps {
  history: DailyGoalHistory[];
  goals?: Goal[];
}

interface DayCellData {
  dateStr: string;
  shortDate: string;
  dayOfWeek: number; // 0: 월, 1: 화, ..., 6: 일
  dayName: string;
  weekIndex: number;
  repeats: number;
  completedGoals: number;
  intensityLevel: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  isFuture: boolean;
}

export const WeeklyContributionHeatmap: React.FC<WeeklyContributionHeatmapProps> = ({
  history,
  goals = [],
}) => {
  const [activeCell, setActiveCell] = useState<DayCellData | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | null>(null);

  const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
  const FULL_DAY_LABELS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

  // Calculate intensity level: 0 (휴식) ~ 4 (마스터 몰입)
  const getIntensityLevel = (repeats: number, completedGoals: number): 0 | 1 | 2 | 3 | 4 => {
    if (repeats === 0 && completedGoals === 0) return 0;
    if (repeats >= 20 || completedGoals >= 3) return 4;
    if (repeats >= 12 || completedGoals >= 2) return 3;
    if (repeats >= 6 || completedGoals >= 1) return 2;
    return 1;
  };

  // Build the 4-week grid data (28 days: Monday to Sunday for 4 consecutive weeks)
  const { gridWeeks, dayOfWeekStats, bestDay, consistencyScore, weekdayVsWeekend } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Quick map for history lookup
    const historyMap = new Map<string, DailyGoalHistory>();
    (history || []).forEach((h) => {
      if (h && h.date) {
        historyMap.set(h.date, h);
      }
    });

    // Today's live completed goals
    const todayGoalsCompleted = goals.filter((g) => g.isCompleted).length;

    // Find the Monday of 3 weeks ago (to show 4 full weeks: 3 past weeks + current week)
    // In JavaScript getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    const currentDayOfWeekJs = today.getDay(); // 0..6
    // Convert to Monday=0, Tuesday=1 ... Sunday=6
    const currentDayOfWeekMondayIdx = (currentDayOfWeekJs + 6) % 7;

    // Start from Monday 3 weeks ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - currentDayOfWeekMondayIdx - 21);
    startDate.setHours(0, 0, 0, 0);

    const weeks: DayCellData[][] = [];
    const dayStats = DAY_LABELS.map((label, idx) => ({
      dayOfWeek: idx,
      label,
      fullName: FULL_DAY_LABELS[idx],
      totalRepeats: 0,
      totalCompletedDays: 0,
      totalDaysCount: 0,
      avgRepeats: 0,
      completionRate: 0,
      maxRepeats: 0,
    }));

    let weekdayRepeatsTotal = 0;
    let weekendRepeatsTotal = 0;
    let activeDaysCount = 0;

    for (let w = 0; w < 4; w++) {
      const currentWeekDays: DayCellData[] = [];

      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + w * 7 + d);
        const dateStr = cellDate.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        const isFuture = cellDate > today && !isToday;

        let repeats = 0;
        let completedGoals = 0;

        if (isToday) {
          const hist = historyMap.get(dateStr);
          repeats = hist ? hist.vocabStudyCount || 0 : 0;
          completedGoals = Math.max(hist ? hist.completedGoalsCount || 0 : 0, todayGoalsCompleted);
        } else if (!isFuture) {
          const hist = historyMap.get(dateStr);
          repeats = hist ? hist.vocabStudyCount || 0 : 0;
          completedGoals = hist ? hist.completedGoalsCount || 0 : 0;
        }

        const intensity = isFuture ? 0 : getIntensityLevel(repeats, completedGoals);

        // Aggregate statistics for non-future days
        if (!isFuture) {
          const stat = dayStats[d];
          stat.totalDaysCount += 1;
          stat.totalRepeats += repeats;
          if (repeats > stat.maxRepeats) stat.maxRepeats = repeats;
          if (repeats > 0 || completedGoals > 0) {
            stat.totalCompletedDays += 1;
            activeDaysCount += 1;
          }

          if (d < 5) {
            weekdayRepeatsTotal += repeats;
          } else {
            weekendRepeatsTotal += repeats;
          }
        }

        const shortDate = `${String(cellDate.getMonth() + 1).padStart(2, '0')}/${String(
          cellDate.getDate()
        ).padStart(2, '0')}`;

        currentWeekDays.push({
          dateStr,
          shortDate,
          dayOfWeek: d,
          dayName: DAY_LABELS[d],
          weekIndex: w,
          repeats,
          completedGoals,
          intensityLevel: intensity,
          isToday,
          isFuture,
        });
      }

      weeks.push(currentWeekDays);
    }

    // Calculate averages for each day of the week
    dayStats.forEach((s) => {
      s.avgRepeats = s.totalDaysCount > 0 ? Math.round((s.totalRepeats / s.totalDaysCount) * 10) / 10 : 0;
      s.completionRate =
        s.totalDaysCount > 0 ? Math.round((s.totalCompletedDays / s.totalDaysCount) * 100) : 0;
    });

    // Best day of week
    const best = dayStats.reduce((max, curr) => (curr.avgRepeats > max.avgRepeats ? curr : max), dayStats[0]);

    // Consistency score (out of 100) based on active days in the last 4 weeks (up to 28 days)
    const passedDaysCount = 28 - (6 - currentDayOfWeekMondayIdx);
    const score = passedDaysCount > 0 ? Math.min(100, Math.round((activeDaysCount / passedDaysCount) * 100)) : 80;

    const totalRepeatsCombined = weekdayRepeatsTotal + weekendRepeatsTotal;
    const weekdayPct =
      totalRepeatsCombined > 0 ? Math.round((weekdayRepeatsTotal / totalRepeatsCombined) * 100) : 75;
    const weekendPct = 100 - weekdayPct;

    return {
      gridWeeks: weeks,
      dayOfWeekStats: dayStats,
      bestDay: best,
      consistencyScore: score,
      weekdayVsWeekend: { weekdayPct, weekendPct, weekdayTotal: weekdayRepeatsTotal, weekendTotal: weekendRepeatsTotal },
    };
  }, [history, goals]);

  // Color classes for intensity levels
  const getCellColorClass = (level: 0 | 1 | 2 | 3 | 4, isToday: boolean, isFuture: boolean) => {
    if (isFuture) {
      return 'bg-slate-100/60 dark:bg-slate-800/30 border-dashed border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40';
    }
    if (isToday) {
      if (level === 0) {
        return 'bg-slate-100 dark:bg-slate-800 border-2 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20';
      }
      return 'bg-emerald-500 text-slate-950 font-bold border-2 border-emerald-400 shadow-md ring-2 ring-emerald-500/30';
    }

    switch (level) {
      case 4:
        return 'bg-emerald-500 dark:bg-emerald-400 text-slate-950 border-emerald-600 dark:border-emerald-300 shadow-sm';
      case 3:
        return 'bg-emerald-600 dark:bg-emerald-600/90 text-white border-emerald-700 dark:border-emerald-500';
      case 2:
        return 'bg-emerald-700/80 dark:bg-emerald-700/70 text-emerald-100 border-emerald-800 dark:border-emerald-700';
      case 1:
        return 'bg-emerald-900/40 dark:bg-emerald-900/50 text-emerald-300 border-emerald-900/60 dark:border-emerald-800/50';
      case 0:
      default:
        return 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-800/80 text-slate-400';
    }
  };

  const WEEK_HEADERS = ['3주 전', '2주 전', '지난 주', '이번 주'];

  return (
    <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Calendar className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>주간 학습 기여도 히트맵</span>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Weekly Contribution Heatmap
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            요일별 학습 몰입도(Study Intensity)와 최근 4주간의 실천 패턴을 단순 직관적 그리드로 시각화합니다.
          </p>
        </div>

        {/* Intensity Legend */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 self-start sm:self-auto shrink-0">
          <span className="text-[10px] mr-1">학습 강도:</span>
          <span className="w-2.5 h-2.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" title="0회 (휴식)" />
          <span className="w-2.5 h-2.5 rounded bg-emerald-900/40 dark:bg-emerald-900/50 border border-emerald-900/60" title="1~5회" />
          <span className="w-2.5 h-2.5 rounded bg-emerald-700/80 dark:bg-emerald-700/70 border border-emerald-800" title="6~11회" />
          <span className="w-2.5 h-2.5 rounded bg-emerald-600 dark:bg-emerald-600/90 border border-emerald-700" title="12~19회" />
          <span className="w-2.5 h-2.5 rounded bg-emerald-500 dark:bg-emerald-400 border border-emerald-600" title="20회+ (마스터)" />
          <span className="text-[10px] text-emerald-500 font-bold ml-1">높음</span>
        </div>
      </div>

      {/* Grid Canvas: 7 Day Rows x 4 Week Columns */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            최근 4주간 요일별 학습 기여도 매트릭스 (월~일)
          </span>
          <span className="text-[11px] text-slate-400">
            타일을 클릭하여 당일 상세 실천량을 확인하세요
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
          <div className="min-w-[340px]">
            {/* Week Column Headers */}
            <div className="grid grid-cols-5 gap-2 mb-2 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <div className="text-left pl-2">요일</div>
              {WEEK_HEADERS.map((header, idx) => (
                <div key={idx} className={idx === 3 ? 'text-emerald-500 font-extrabold' : ''}>
                  {header}
                </div>
              ))}
            </div>

            {/* 7 Rows for Monday through Sunday */}
            <div className="space-y-2">
              {DAY_LABELS.map((dayLabel, dayIdx) => {
                const isSelected = selectedDayFilter === dayIdx;
                const stat = dayOfWeekStats[dayIdx];

                return (
                  <div
                    key={dayIdx}
                    onClick={() => setSelectedDayFilter(isSelected ? null : dayIdx)}
                    className={`grid grid-cols-5 gap-2 items-center p-1.5 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/20 ring-1 ring-emerald-500/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Day Label Header with Average */}
                    <div className="flex items-center justify-between pr-2 text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            dayIdx >= 5 ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                        />
                        {dayLabel}요일
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {stat.avgRepeats}회
                      </span>
                    </div>

                    {/* 4 Week Tiles */}
                    {gridWeeks.map((week, weekIdx) => {
                      const cell = week[dayIdx];
                      const isCellActive = activeCell?.dateStr === cell.dateStr;

                      return (
                        <div
                          key={weekIdx}
                          onMouseEnter={() => !cell.isFuture && setActiveCell(cell)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!cell.isFuture) setActiveCell(cell);
                          }}
                          className={`h-9 rounded-xl border flex items-center justify-center text-xs font-semibold transition-all relative select-none ${getCellColorClass(
                            cell.intensityLevel,
                            cell.isToday,
                            cell.isFuture
                          )} ${
                            isCellActive
                              ? 'scale-105 z-10 shadow-lg ring-2 ring-emerald-400'
                              : 'hover:scale-[1.03]'
                          }`}
                        >
                          {cell.isFuture ? (
                            <span className="text-[10px]">–</span>
                          ) : cell.repeats > 0 ? (
                            <span className="text-[11px] font-bold">{cell.repeats}</span>
                          ) : cell.isToday ? (
                            <Clock className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                          ) : (
                            <span className="text-[10px] text-slate-400/80">0</span>
                          )}

                          {cell.isToday && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Cell Live Info Card */}
        {activeCell && (
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white border border-slate-700/80 shadow-md text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                {activeCell.dayName}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm">{activeCell.dateStr}</span>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    ({FULL_DAY_LABELS[activeCell.dayOfWeek]})
                  </span>
                  {activeCell.isToday && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-300">
                      오늘
                    </span>
                  )}
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-3">
                  <span>반복 학습: <strong className="text-white">{activeCell.repeats}회</strong></span>
                  <span>•</span>
                  <span>목표 완료: <strong className="text-emerald-400">{activeCell.completedGoals}개</strong></span>
                  <span>•</span>
                  <span>강도 레벨: <strong className="text-amber-400">{activeCell.intensityLevel}단계</strong></span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveCell(null)}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] self-end sm:self-auto"
            >
              닫기
            </button>
          </div>
        )}
      </div>

      {/* 7-Day Day-of-Week Intensity Bar Visualization */}
      <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
            요일별 평균 학습 강도 패턴 (Day-of-Week Average Intensity)
          </span>
          <span className="text-[11px] text-slate-400">
            주간 루틴 일관성 분석
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {dayOfWeekStats.map((stat, idx) => {
            const isHighest = stat.dayOfWeek === bestDay.dayOfWeek && bestDay.avgRepeats > 0;
            const heightPercent =
              bestDay.avgRepeats > 0 ? Math.min(100, Math.round((stat.avgRepeats / bestDay.avgRepeats) * 100)) : 10;

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col justify-between ${
                  isHighest
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {stat.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {idx >= 5 ? '주말' : '평일'}
                  </span>
                </div>

                {/* Vertical Bar Graph */}
                <div className="h-16 w-full flex items-end justify-center py-1">
                  <div className="w-full max-w-[20px] bg-slate-200 dark:bg-slate-700 rounded-t-lg h-full flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isHighest
                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                          : stat.avgRepeats >= 10
                          ? 'bg-indigo-500'
                          : 'bg-slate-400 dark:bg-slate-500'
                      }`}
                      style={{ height: `${Math.max(12, heightPercent)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    {stat.avgRepeats}회
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    달성률 {stat.completionRate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 Key Effort Pattern Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Best Day of Week */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              가장 몰입도 높은 요일 (Peak Day)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-emerald-500">
                {bestDay.fullName}
              </span>
              <span className="text-xs text-slate-500">
                (평균 {bestDay.avgRepeats}회)
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        {/* 2. Consistency Score */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              4주 주간 실천 일관성 (Consistency)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                {consistencyScore}%
              </span>
              <span className="text-xs text-emerald-500 font-bold">
                {consistencyScore >= 80 ? '매우 우수 🌟' : consistencyScore >= 60 ? '안정적 🌱' : '노력 필요 💪'}
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* 3. Weekday vs Weekend Ratio */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              평일 vs 주말 학습 비중
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                {weekdayVsWeekend.weekdayPct}% : {weekdayVsWeekend.weekendPct}%
              </span>
              <span className="text-[11px] text-slate-400">
                (평일 {weekdayVsWeekend.weekdayTotal}회 / 주말 {weekdayVsWeekend.weekendTotal}회)
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Effort Pattern Guidance Box */}
      <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900 dark:text-white">
            지속적인 습관 형성 패턴 분석
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
            {consistencyScore >= 75 ? (
              <>
                최근 4주 동안 <strong className="text-emerald-500 font-bold">{bestDay.fullName}</strong>에 가장 높은 학습 집중도를 보이며
                주간 일관성 점수 <strong className="text-slate-900 dark:text-white font-bold">{consistencyScore}%</strong>를 달성했습니다.
                평일과 주말 모두 빈칸(0회) 없는 균일한 녹색 히트맵을 유지하여 장기 기억 장치에 단어를 확실히 각인시키세요!
              </>
            ) : (
              <>
                학습 강도가 특정 요일에 집중되는 경향이 있습니다. 주중과 주말에 매일 최소 5회 이상의 음성 반복 청취를 실천하면
                전체 히트맵이 풍성해지고 습관 궤도가 더욱 견고해집니다.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
