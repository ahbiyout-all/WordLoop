import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PetMoodTrendPoint, PetMoodTrendSummary } from '../services/petCompanionService';

interface PetMoodTrendChartProps {
  trend: PetMoodTrendSummary;
  petName: string;
}

const MoodTrendTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const point: PetMoodTrendPoint = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl bg-slate-900/95 text-white border border-slate-700 px-3 py-2.5 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1">
        <span className="font-bold text-slate-200 font-mono-tabular">
          {point.dateLabel} ({point.dayName}) {point.isToday ? '· 오늘' : ''}
        </span>
        <span className="font-semibold text-amber-300">
          {point.emoji} {point.label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-400">기분 지수</span>
        <span className="font-mono-tabular font-bold text-indigo-300">
          {point.moodScore} / 100
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-400">일일 학습 기록</span>
        <span
          className={`font-mono-tabular font-semibold ${
            point.isConsistent ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          {point.isConsistent ? `${point.studyUnits}회 학습` : '휴식 (미학습)'}
        </span>
      </div>
    </div>
  );
};

export const PetMoodTrendChart: React.FC<PetMoodTrendChartProps> = ({ trend, petName }) => {
  const TrendIcon =
    trend.trendDirection === 'up'
      ? TrendingUp
      : trend.trendDirection === 'down'
      ? TrendingDown
      : Minus;

  const trendText =
    trend.trendDirection === 'up'
      ? `상승세 (+${trend.deltaScore})`
      : trend.trendDirection === 'down'
      ? `관심 필요 (${trend.deltaScore})`
      : '안정적 유지';

  const trendTextColor =
    trend.trendDirection === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trend.trendDirection === 'down'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-indigo-600 dark:text-indigo-400';

  return (
    <section
      aria-label={`${petName} 최근 7일 기분 추이 차트`}
      className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <TrendIcon className={`w-4 h-4 ${trendTextColor}`} />
            <span>Mood Trend · 최근 7일 기분 추이</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            매일의 단어·게임·발음 학습 일관성에 따른 {petName}의 감정 흐름
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-tabular tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
          <span>학습 {trend.consistentDays}/7일</span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
          <span>평균 {trend.avgMoodScore}점</span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
          <span className={`font-semibold ${trendTextColor}`}>{trendText}</span>
        </div>
      </div>

      <div className="w-full h-40 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={trend.days} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="petMoodTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.34} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(148, 163, 184, 0.22)"
            />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              dy={4}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[25, 60, 100]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine
              y={60}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeOpacity={0.45}
            />
            <Tooltip content={<MoodTrendTooltip />} />
            <Area
              type="monotone"
              dataKey="moodScore"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#petMoodTrendGrad)"
              dot={{ r: 3.5, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 5.5, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Aligned 7-Day Sentiment & Consistency Strip */}
      <div className="grid grid-cols-7 gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center">
        {trend.days.map((day) => (
          <div
            key={day.dateStr}
            title={`${day.dateLabel} (${day.dayName}): ${day.emoji} ${day.label} · ${day.moodScore}점`}
            className="flex flex-col items-center gap-0.5 py-1"
          >
            <span className="text-sm leading-none" aria-hidden="true">
              {day.emoji}
            </span>
            <span
              className={`text-[10px] font-mono-tabular tabular-nums ${
                day.isToday
                  ? 'font-bold text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {day.isToday ? '오늘' : day.dayName}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
