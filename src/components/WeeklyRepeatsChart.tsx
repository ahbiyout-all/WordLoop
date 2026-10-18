import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
  Legend,
} from 'recharts';
import {
  Headphones,
  TrendingUp,
  TrendingDown,
  Calendar,
  Zap,
  Sparkles,
  Award,
  Layers,
  ArrowUpRight,
  Flame,
  CheckCircle2,
  Info,
  Trophy,
  Star,
  Crown,
  Target,
} from 'lucide-react';
import { DailyGoalHistory } from '../types';

interface WeeklyRepeatsChartProps {
  history: DailyGoalHistory[];
  totalRepeatsCount?: number;
}

type ChartViewMode = 'combo' | 'cumulative' | 'daily';

// Custom Marker Annotation SVG Pin Component for Recharts
const MilestoneMarkerPin = (props: any) => {
  const { cx, cy, stroke } = props;
  if (!cx || !cy) return null;

  return (
    <g className="cursor-pointer transition-all">
      {/* Outer animated ripple pulse */}
      <circle cx={cx} cy={cy} r={14} fill="#f59e0b" fillOpacity={0.25} className="animate-ping" />
      {/* Golden halo glow */}
      <circle cx={cx} cy={cy} r={9} fill="#f59e0b" stroke="#ffffff" strokeWidth={2.5} className="shadow-md" />
      {/* Inner star dot */}
      <circle cx={cx} cy={cy} r={3.5} fill="#ffffff" />

      {/* Floating Milestone Flag Annotation Label */}
      <g transform={`translate(${cx - 56}, ${cy - 38})`}>
        <rect
          width={112}
          height={24}
          rx={8}
          fill="#0f172a"
          stroke="#f59e0b"
          strokeWidth={1.5}
          className="shadow-2xl"
        />
        <text
          x={56}
          y={16}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize={10}
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          ⭐ 1000 Repeats!
        </text>
      </g>
    </g>
  );
};

export const WeeklyRepeatsChart: React.FC<WeeklyRepeatsChartProps> = ({
  history,
  totalRepeatsCount,
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('combo');
  const [showMilestoneAnnotation, setShowMilestoneAnnotation] = useState<boolean>(true);

  // Overall all-time repeats
  const displayAllTimeTotal =
    typeof totalRepeatsCount === 'number' && totalRepeatsCount > 0 ? totalRepeatsCount : 1000;

  // Process and align the last 7 calendar days & calculate milestone 1000 coordinates
  const {
    chartData,
    total7DaysCount,
    avgCount,
    improvementRate,
    maxItem,
    minItem,
    milestone1000Point,
    hasReached1000,
    milestoneEffortCorrelation,
  } = useMemo(() => {
    const today = new Date();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    // Create indexed map from history
    const historyMap = new Map<string, number>();
    (history || []).forEach((h) => {
      if (h && h.date) {
        historyMap.set(h.date, Number(h.vocabStudyCount) || 0);
      }
    });

    // 7-day list
    const raw7Days: {
      date: string;
      displayDate: string;
      shortDate: string;
      dayName: string;
      isToday: boolean;
      dailyCount: number;
      cumulativeCount: number;
      allTimeCumulative: number;
      deltaPrev: number;
      isMilestone1000: boolean;
    }[] = [];

    // Calculate baseline before the 7-day window
    let tempSum = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = historyMap.has(dateStr) ? historyMap.get(dateStr)! : 0;
      tempSum += count;
    }

    const baselineAllTimeBefore7Days = Math.max(0, displayAllTimeTotal - tempSum);
    let runningCumulative = 0;
    let foundMilestonePoint: any = null;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayIdx = d.getDay();
      const dayName = dayNames[dayIdx];
      const dateFormatted = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

      const dailyCount = historyMap.has(dateStr) ? historyMap.get(dateStr)! : 0;
      runningCumulative += dailyCount;

      const prevRunning = raw7Days.length > 0 ? raw7Days[raw7Days.length - 1].dailyCount : dailyCount;
      const deltaPrev = raw7Days.length > 0 ? dailyCount - prevRunning : 0;

      const allTimeToDate = baselineAllTimeBefore7Days + runningCumulative;

      // Check if this day crosses or reached the 1000 repeats milestone
      const prevAllTime = raw7Days.length > 0
        ? raw7Days[raw7Days.length - 1].allTimeCumulative
        : baselineAllTimeBefore7Days;

      const isMilestone =
        (allTimeToDate >= 1000 && prevAllTime < 1000) ||
        (i === 0 && displayAllTimeTotal >= 1000 && !foundMilestonePoint);

      const dayObj = {
        date: dateStr,
        displayDate: `${dateFormatted} (${dayName})`,
        shortDate: dateFormatted,
        dayName: `${dayName}요일`,
        isToday: i === 0,
        dailyCount,
        cumulativeCount: runningCumulative,
        allTimeCumulative: allTimeToDate,
        deltaPrev,
        isMilestone1000: isMilestone,
      };

      if (isMilestone && !foundMilestonePoint) {
        foundMilestonePoint = dayObj;
      }

      raw7Days.push(dayObj);
    }

    // Fallback milestone point if already reached or in active range
    const reached1000 = displayAllTimeTotal >= 1000;
    const finalMilestonePoint =
      foundMilestonePoint || (reached1000 ? raw7Days[raw7Days.length - 1] : raw7Days[Math.min(3, raw7Days.length - 1)]);

    const total7Days = raw7Days.reduce((acc, curr) => acc + curr.dailyCount, 0);
    const avg = Math.round((total7Days / (raw7Days.length || 1)) * 10) / 10;

    // Improvement rate calculation comparing early 3-day baseline vs late 3-day performance
    const early3Baseline =
      (raw7Days[0]?.dailyCount + raw7Days[1]?.dailyCount + raw7Days[2]?.dailyCount) / 3;
    const late3Performance =
      (raw7Days[4]?.dailyCount + raw7Days[5]?.dailyCount + raw7Days[6]?.dailyCount) / 3;

    let impRate = 0;
    if (early3Baseline > 0) {
      impRate = Math.round(((late3Performance - early3Baseline) / early3Baseline) * 100);
    } else if (late3Performance > 0) {
      impRate = 100;
    }

    const max = raw7Days.reduce(
      (m, item) => (item.dailyCount > (m?.dailyCount || 0) ? item : m),
      raw7Days[0] || { dailyCount: 0, displayDate: '', shortDate: '' }
    );

    const min = raw7Days.reduce(
      (m, item) => (item.dailyCount < (m?.dailyCount || Infinity) ? item : m),
      raw7Days[0] || { dailyCount: 0, displayDate: '', shortDate: '' }
    );

    // Effort correlation statement
    const correlation = {
      milestoneDate: finalMilestonePoint ? finalMilestonePoint.displayDate : '오늘',
      neededRepeats: Math.max(0, 1000 - displayAllTimeTotal),
      reached: reached1000,
      avgDailyImpact: avg > 0 ? Math.ceil(1000 / (avg * 7)) : 4,
    };

    return {
      chartData: raw7Days,
      total7DaysCount: total7Days,
      avgCount: avg,
      improvementRate: impRate,
      maxItem: max,
      minItem: min,
      milestone1000Point: finalMilestonePoint,
      hasReached1000: reached1000,
      milestoneEffortCorrelation: correlation,
    };
  }, [history, displayAllTimeTotal]);

  // Custom Interactive Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const delta = data.deltaPrev;
      const isPositive = delta > 0;
      const isNegative = delta < 0;

      return (
        <div className="bg-slate-950 text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs space-y-2.5 min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-extrabold text-slate-200">
              {data.date} <span className="text-emerald-400 font-medium">({data.dayName})</span>
            </span>
            {data.isToday && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                오늘
              </span>
            )}
          </div>

          {/* 1000 Repeats Milestone Landmark Callout */}
          {data.isMilestone1000 && (
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/25 to-yellow-500/15 border border-amber-500/40 text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-amber-400">
                <Trophy className="w-4 h-4 fill-current shrink-0" />
                <span>⭐ '1000 Repeats Milestone' 달성 지점!</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">
                지속적인 일일 쉐도잉 노력이 누적되어 1,000회 업적 마일스톤에 도달한 핵심 전환점입니다.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                일일 반복 횟수:
              </span>
              <span className="font-extrabold text-sm text-emerald-400">
                {data.dailyCount}회
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                7일 누적 반복:
              </span>
              <span className="font-extrabold text-sm text-indigo-300">
                {data.cumulativeCount}회
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                전체 누적 추정치:
              </span>
              <span className="font-extrabold text-sm text-amber-400">
                {data.allTimeCumulative}회
              </span>
            </div>

            {data.date !== chartData[0]?.date && (
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-500">전일 대비 변화:</span>
                <span
                  className={`font-bold flex items-center gap-0.5 ${
                    isPositive
                      ? 'text-emerald-400'
                      : isNegative
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {isPositive && '▲ +'}
                  {isNegative && '▼ '}
                  {delta}회 {isPositive ? '향상' : isNegative ? '감소' : '동일'}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-all">
      {/* Header with Title and Mode Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>주간 총 반복 학습 향상도 추이</span>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Total Repeats Trend
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            최근 7일간의 총 반복 횟수 누적 성장 및 <strong className="text-amber-500">'1000 Repeats Milestone'</strong> 도달 마커를 시각화합니다.
          </p>
        </div>

        {/* View Controls & Milestone Toggle */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
          {/* Milestone 1000 Annotation Toggle */}
          <button
            type="button"
            onClick={() => setShowMilestoneAnnotation(!showMilestoneAnnotation)}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              showMilestoneAnnotation
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-sm ring-1 ring-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 fill-current text-amber-500" />
            <span>1,000 마일스톤 마커 {showMilestoneAnnotation ? 'ON' : 'OFF'}</span>
          </button>

          {/* View Mode Segmented Switch */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setViewMode('combo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'combo'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>종합 추세</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cumulative')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cumulative'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>누적 총 반복</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'daily'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>일일 반복량</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Key Highlight Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. 7-Day Total Repeats */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              7일간 총 반복 (Total)
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white flex items-baseline gap-1">
              {total7DaysCount}
              <span className="text-xs font-normal text-slate-500">회</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        {/* 2. Improvement Rate */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              7일간 향상도
            </span>
            <span
              className={`text-xl font-extrabold flex items-baseline gap-1 ${
                improvementRate >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500'
              }`}
            >
              {improvementRate > 0 ? `+${improvementRate}%` : `${improvementRate}%`}
              <span className="text-[11px] font-medium">
                {improvementRate > 0 ? '상승 ▲' : improvementRate < 0 ? '하락 ▼' : '유지'}
              </span>
            </span>
          </div>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              improvementRate >= 0
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-rose-500/10 text-rose-500'
            }`}
          >
            {improvementRate >= 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* 3. 1000 Repeats Milestone Achievement State */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block mb-0.5">
              1,000 Repeats 마일스톤
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-amber-500">
                {hasReached1000 ? '달성 완료 ⭐' : `${displayAllTimeTotal} / 1,000회`}
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 fill-current" />
          </div>
        </div>

        {/* 4. Peak Day */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              최고 학습일 (Peak)
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white flex items-baseline gap-1">
              {maxItem.dailyCount}
              <span className="text-xs font-normal text-slate-500">회 ({maxItem.shortDate})</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Recharts Visualization Canvas with Marker Annotations */}
      <div className="h-68 sm:h-76 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'cumulative' ? (
            /* 1. Cumulative Total Repeats Area Chart with Milestone Dot Marker */
            <AreaChart data={chartData} margin={{ top: 24, right: 20, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientCumulativeArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
              />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* 1000 Repeats Milestone Marker Pin on Cumulative Chart */}
              {showMilestoneAnnotation && milestone1000Point && (
                <ReferenceDot
                  x={milestone1000Point.displayDate}
                  y={milestone1000Point.cumulativeCount}
                  shape={<MilestoneMarkerPin />}
                />
              )}

              <Area
                type="monotone"
                dataKey="cumulativeCount"
                name="7일 누적 총 반복"
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#gradientCumulativeArea)"
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          ) : viewMode === 'daily' ? (
            /* 2. Daily Repeats Bar Chart with 1000th Repeat Day Marker */
            <BarChart data={chartData} margin={{ top: 24, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientDailyBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
              />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.06)' }} />
              <ReferenceLine
                y={avgCount}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `일평균 ${avgCount}회`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              {/* Marker on the day 1000 repeats was reached */}
              {showMilestoneAnnotation && milestone1000Point && (
                <ReferenceLine
                  x={milestone1000Point.displayDate}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    value: '⭐ 1,000 Repeats Milestone 달성일',
                    fill: '#f59e0b',
                    fontSize: 10,
                    fontWeight: 'bold',
                    position: 'top',
                  }}
                />
              )}

              <Bar dataKey="dailyCount" name="일일 반복 횟수" fill="url(#gradientDailyBar)" radius={[8, 8, 0, 0]} maxBarSize={38} />
            </BarChart>
          ) : (
            /* 3. Composed Chart with Marker Annotation at 1000 Repeats Milestone Point */
            <ComposedChart data={chartData} margin={{ top: 28, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientBarCombo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="gradientAreaCombo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
              />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                dy={6}
              />
              {/* Left Y Axis for Daily Repeats */}
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#10b981' }}
                allowDecimals={false}
              />
              {/* Right Y Axis for Cumulative Total Repeats */}
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#818cf8' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />

              <ReferenceLine
                yAxisId="left"
                y={avgCount}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{
                  value: `평균 ${avgCount}회`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />

              {/* Landmark 1000 Repeats Milestone Marker Pin on Cumulative Right Axis */}
              {showMilestoneAnnotation && milestone1000Point && (
                <ReferenceDot
                  yAxisId="right"
                  x={milestone1000Point.displayDate}
                  y={milestone1000Point.cumulativeCount}
                  shape={<MilestoneMarkerPin />}
                />
              )}

              <Bar
                yAxisId="left"
                dataKey="dailyCount"
                name="일일 반복 횟수 (회)"
                fill="url(#gradientBarCombo)"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeCount"
                name="누적 총 반복 횟수 (회)"
                stroke="#6366f1"
                strokeWidth={3}
                fill="url(#gradientAreaCombo)"
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="dailyCount"
                name="일일 추세선"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend & Milestone Guide */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-4 text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/80 inline-block"></span>
            <span>일일 반복 횟수 (Daily)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded bg-indigo-500 inline-block"></span>
            <span>누적 총 반복 곡선 (Cumulative)</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-500 font-bold">
            <Star className="w-3 h-3 fill-current text-amber-500 inline-block" />
            <span>'1000 Repeats' 마일스톤 마커</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>Recharts v3 반응형 마커 어노테이션</span>
        </div>
      </div>

      {/* Effort-Achievement Correlation Insight Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-500/30 flex items-start gap-3.5 text-xs text-slate-700 dark:text-slate-300">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
          <Trophy className="w-5 h-5 fill-current" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-extrabold text-sm text-slate-900 dark:text-white">
              노력과 업적의 상관관계 (Effort-Achievement Correlation)
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              1,000 Repeats 마일스톤 연동
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
            차트 위의 <strong className="text-amber-500 font-bold">'⭐ 1000 Repeats!' 마커 어노테이션</strong>은 매일 반복 청취 노력이 누적되어
            어느 시점에 마일스톤 업적으로 결실을 맺었는지를 명확히 보여줍니다.
            하루 평균 <strong className="text-slate-900 dark:text-white font-bold">{avgCount}회</strong>씩 지속하면 약{' '}
            <strong className="text-indigo-500 font-bold">{milestoneEffortCorrelation.avgDailyImpact}주</strong> 만에 새로운 1,000단위 마일스톤에 안정적으로 도달할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};
