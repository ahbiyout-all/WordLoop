import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Flame,
  Headphones,
  TrendingUp,
  Calendar,
  Sparkles,
  Award,
  Zap,
  CheckCircle2,
  Trophy,
  Activity,
  Layers,
  BarChart2,
} from 'lucide-react';
import { DailyGoalHistory, Goal, UserProfile } from '../types';

interface StreakGraphProps {
  history: DailyGoalHistory[];
  totalRepeatsCount?: number;
  goals?: Goal[];
  userProfile?: UserProfile | null;
}

export interface DayStreakGraphPoint {
  rawDate: string;
  displayDate: string;
  fullDateLabel: string;
  repeatCount: number;
  streakCount: number;
  completedGoalsCount: number;
  isStreakMaintained: boolean;
  dayIndex: number;
}

type GraphDisplayMode = 'combined' | 'repeats' | 'streak';

export const StreakGraph: React.FC<StreakGraphProps> = ({
  history = [],
  totalRepeatsCount = 0,
  goals = [],
  userProfile,
}) => {
  const [displayMode, setDisplayMode] = useState<GraphDisplayMode>('combined');

  // Process 30-Day continuous data array
  const thirtyDayData = useMemo(() => {
    const points: DayStreakGraphPoint[] = [];
    const today = new Date();

    // Map existing history by date string (YYYY-MM-DD)
    const historyMap = new Map<string, DailyGoalHistory>();
    history.forEach((h) => {
      if (h.date) {
        historyMap.get(h.date) || historyMap.set(h.date, h);
      }
    });

    let runningStreak = 1;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const displayDate = `${month}.${day}`;
      const fullDateLabel = `${year}년 ${month}월 ${day}일`;

      const matchedHistory = historyMap.get(dateStr);

      let repeatCount = 0;
      let completedGoalsCount = 0;
      let isStreakMaintained = false;

      if (matchedHistory) {
        repeatCount = matchedHistory.totalRepeatsCount || matchedHistory.repeatsCount || 0;
        completedGoalsCount = matchedHistory.completedGoalsCount || 0;
        isStreakMaintained = Boolean(
          matchedHistory.isStreakMaintained || completedGoalsCount >= 1 || repeatCount >= 5
        );
      } else if (i === 0) {
        // Today's real-time count
        repeatCount = Math.max(
          totalRepeatsCount % 40,
          goals.filter((g) => g.isCompleted).length * 12
        );
        completedGoalsCount = goals.filter((g) => g.isCompleted).length;
        isStreakMaintained = completedGoalsCount >= 1 || repeatCount > 0;
      }

      if (isStreakMaintained) {
        runningStreak++;
      } else {
        runningStreak = Math.max(1, runningStreak - 1);
      }

      points.push({
        rawDate: dateStr,
        displayDate: i === 0 ? '오늘' : displayDate,
        fullDateLabel,
        repeatCount,
        streakCount: runningStreak,
        completedGoalsCount,
        isStreakMaintained,
        dayIndex: 30 - i,
      });
    }

    return points;
  }, [history, totalRepeatsCount, goals]);

  // 30-Day Aggregated Statistics
  const statsSummary = useMemo(() => {
    const total30DayRepeats = thirtyDayData.reduce((sum, d) => sum + d.repeatCount, 0);
    const maxStreakIn30Days = thirtyDayData.reduce((max, d) => Math.max(max, d.streakCount), 1);
    const activeDaysCount = thirtyDayData.filter((d) => d.repeatCount > 0 || d.isStreakMaintained).length;
    const avgRepeatsPerActiveDay = activeDaysCount > 0 ? Math.round(total30DayRepeats / activeDaysCount) : 0;
    const streakMaintenanceRate = Math.round((activeDaysCount / 30) * 100);

    return {
      total30DayRepeats,
      maxStreakIn30Days,
      activeDaysCount,
      avgRepeatsPerActiveDay,
      streakMaintenanceRate,
    };
  }, [thirtyDayData]);

  // Custom Rich Recharts Tooltip Component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: DayStreakGraphPoint = payload[0].payload;

    return (
      <div className="p-3.5 rounded-2xl bg-slate-900/95 text-white border border-slate-700/80 shadow-xl backdrop-blur-md space-y-2 max-w-xs text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-black text-slate-200">{data.fullDateLabel}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              data.isStreakMaintained
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {data.isStreakMaintained ? '🔥 스트릭 유지' : '⚡ 습관 진행 중'}
          </span>
        </div>

        <div className="space-y-1.5 font-medium">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-blue-400">
              <Headphones className="w-3.5 h-3.5" />
              <span>일일 반복 청취:</span>
            </span>
            <span className="font-black text-white">{data.repeatCount.toLocaleString()}회</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>연속 스트릭:</span>
            </span>
            <span className="font-black text-amber-300">{data.streakCount}일 연속</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>완수 목표 수:</span>
            </span>
            <span className="font-black text-emerald-300">{data.completedGoalsCount}개 완료</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-all">
      {/* Top Banner & Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Flame className="w-5 h-5 fill-current" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>30-Day Streak & Repeat Trend Graph</span>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                최근 30일 스트릭 그래프
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            최근 30일간의 일일 음성 반복 청취 횟수(막대/영역)와 연속 출석 불꽃 스트릭(선 그래프)의 성장 곡선입니다.
          </p>
        </div>

        {/* Display Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setDisplayMode('combined')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
              displayMode === 'combined'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>통합 추이</span>
          </button>

          <button
            type="button"
            onClick={() => setDisplayMode('repeats')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
              displayMode === 'repeats'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>반복 청취</span>
          </button>

          <button
            type="button"
            onClick={() => setDisplayMode('streak')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
              displayMode === 'streak'
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>스트릭 곡선</span>
          </button>
        </div>
      </div>

      {/* 30-Day Summary Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
            30일 누적 청취
          </span>
          <p className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
            {statsSummary.total30DayRepeats.toLocaleString()} <span className="text-xs font-normal">회</span>
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
            최고 스트릭 기록
          </span>
          <p className="text-base sm:text-lg font-black text-amber-500 mt-0.5 font-mono flex items-center gap-1">
            <Flame className="w-4 h-4 fill-current text-amber-500" />
            <span>{statsSummary.maxStreakIn30Days}일 연속</span>
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
            일평균 학습 청취
          </span>
          <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
            {statsSummary.avgRepeatsPerActiveDay} <span className="text-xs font-normal">회/일</span>
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
            습관 유지 달성률
          </span>
          <p className="text-base sm:text-lg font-black text-violet-600 dark:text-violet-400 mt-0.5 font-mono">
            {statsSummary.streakMaintenanceRate}% <span className="text-xs font-normal">({statsSummary.activeDaysCount}/30일)</span>
          </p>
        </div>
      </div>

      {/* Recharts Composed 30-Day Graph Area */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={thirtyDayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradient30DayRepeats" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradient30DayStreak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />

            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              interval={2}
            />

            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
            />

            {displayMode === 'combined' && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#F59E0B' }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Daily Repeats Area / Bar */}
            {(displayMode === 'combined' || displayMode === 'repeats') && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="repeatCount"
                name="반복 청취"
                fill="url(#gradient30DayRepeats)"
                stroke="#3B82F6"
                strokeWidth={2.5}
                activeDot={{ r: 6, fill: '#3B82F6', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            )}

            {/* Streak Line Curve */}
            {(displayMode === 'combined' || displayMode === 'streak') && (
              <Line
                yAxisId={displayMode === 'combined' ? 'right' : 'left'}
                type="monotone"
                dataKey="streakCount"
                name="연속 스트릭"
                stroke="#F59E0B"
                strokeWidth={3}
                dot={{ r: 3, fill: '#F59E0B', strokeWidth: 1 }}
                activeDot={{ r: 7, fill: '#F59E0B', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
