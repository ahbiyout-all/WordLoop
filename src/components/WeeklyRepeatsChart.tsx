import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Headphones, TrendingUp, Calendar, Zap } from 'lucide-react';
import { DailyGoalHistory } from '../types';

interface WeeklyRepeatsChartProps {
  history: DailyGoalHistory[];
}

export const WeeklyRepeatsChart: React.FC<WeeklyRepeatsChartProps> = ({ history }) => {
  // Get last 7 days
  const last7Days = history.slice(-7);

  // Format data for Recharts
  const chartData = last7Days.map((item) => {
    const d = new Date(item.date);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = isNaN(d.getTime()) ? '' : dayNames[d.getDay()];
    const dateFormatted = item.date.slice(5).replace('-', '/'); // MM/DD

    return {
      date: item.date,
      displayDate: `${dateFormatted} (${dayName})`,
      shortDate: `${dateFormatted}`,
      dayName: `${dayName}요일`,
      count: item.vocabStudyCount || 0,
    };
  });

  const total7DaysCount = chartData.reduce((acc, curr) => acc + curr.count, 0);
  const avgCount = Math.round(total7DaysCount / (chartData.length || 1));
  const maxItem = chartData.reduce(
    (max, item) => (item.count > (max?.count || 0) ? item : max),
    chartData[0] || { count: 0, displayDate: '' }
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-300">{data.date} ({data.dayName})</p>
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
            <Headphones className="w-4 h-4" />
            <span>{data.count}회 반복 학습</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              주간 단어 반복 학습 추이
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            최근 7일간의 음성 및 단어 반복 학습량 시각화 그래프입니다.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>7일 합계: {total7DaysCount}회</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>일평균: {avgCount}회</span>
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
            <XAxis
              dataKey="displayDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              dy={5}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.06)' }} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={38}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.count === maxItem?.count && entry.count > 0 ? '#10b981' : '#6366f1'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      {maxItem && maxItem.count > 0 && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
          <span className="font-medium">
            🔥 이번 주 가장 열공한 날: <strong className="text-emerald-500 dark:text-emerald-400 font-bold">{maxItem.displayDate} ({maxItem.count}회)</strong>
          </span>
          <span className="text-[11px] text-slate-400">Recharts 학습 데이터 그래프</span>
        </div>
      )}
    </div>
  );
};
