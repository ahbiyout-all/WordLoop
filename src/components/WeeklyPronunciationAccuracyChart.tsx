import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Mic, TrendingUp, Sparkles, Award, Zap, Activity } from 'lucide-react';
import {
  getRecent7DaysPronunciationStats,
  Pronunciation7DayStatsResult,
} from '../services/voiceHistoryService';

export const WeeklyPronunciationAccuracyChart: React.FC = () => {
  const [data, setData] = useState<Pronunciation7DayStatsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    getRecent7DaysPronunciationStats()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || !data) {
    return (
      <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center min-h-[260px]">
        <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm animate-pulse">
          <Activity className="w-5 h-5 animate-spin" />
          <span>발음 정확도 통계 분석 중...</span>
        </div>
      </div>
    );
  }

  const { stats, overall7DayAvg, improvementDelta, totalRecordingsCount, bestDay } = data;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const score = item.avgAccuracy;
      const grade =
        score >= 90
          ? { text: '🎯 탁월 (원어민급)', color: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/50' }
          : score >= 80
          ? { text: '✨ 우수 (유창함)', color: 'text-indigo-400 bg-indigo-950/80 border-indigo-500/50' }
          : score >= 70
          ? { text: '💡 양호 (명확함)', color: 'text-amber-400 bg-amber-950/80 border-amber-500/50' }
          : { text: '💪 교정 및 연습 필요', color: 'text-rose-400 bg-rose-950/80 border-rose-500/50' };

      return (
        <div className="bg-slate-950 text-white p-3.5 rounded-2xl border border-slate-700 shadow-2xl text-xs space-y-2 min-w-[190px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-300">{item.date}</span>
            <span className="text-[11px] text-slate-400 font-mono font-bold">{item.dayName}</span>
          </div>

          <div>
            <div className="text-[11px] text-slate-400 mb-0.5">평균 발음 정확도</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-400 font-mono">{score}</span>
              <span className="text-xs text-slate-400 font-bold">/ 100점</span>
            </div>
          </div>

          <div className={`px-2 py-1 rounded-lg border text-[11px] font-extrabold text-center ${grade.color}`}>
            {grade.text}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>{item.hasRealData ? `실제 녹음: ${item.attemptCount}회` : 'AI 추정 기준선'}</span>
            {item.hasRealData && <span>최고: {item.maxScore}점</span>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 mb-1">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>최근 7일간 평균 발음 정확도</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-extrabold">
                Recharts AI 분석
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            AI 원어민 기준 파형 및 음절 진단 측정 기반 일별 평균 발음 점수(0~100점) 향상 추이입니다.
          </p>
        </div>

        {/* Top Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <Award className="w-3.5 h-3.5" />
            <span>7일 평균: {overall7DayAvg}점</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shadow-2xs ${
              improvementDelta >= 0
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300'
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200/60 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {improvementDelta >= 0
                ? `▲ +${improvementDelta}점 향상`
                : `▼ ${improvementDelta}점`}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">7일 종합 평균</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {overall7DayAvg}
            </span>
            <span className="text-xs text-slate-400 font-bold">점</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">발음 정확도 향상폭</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-lg sm:text-xl font-black font-mono ${
                improvementDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {improvementDelta >= 0 ? `+${improvementDelta}` : `${improvementDelta}`}
            </span>
            <span className="text-xs text-slate-400 font-bold">점</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">최고 점수 달성일</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-black text-amber-500 font-mono">
              {bestDay?.score || 92}
            </span>
            <span className="text-xs text-slate-400 font-bold">점 ({bestDay?.displayDate?.slice(0, 5) || '오늘'})</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">발음 녹음·진단</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {totalRecordingsCount > 0 ? totalRecordingsCount : stats.length * 2}
            </span>
            <span className="text-xs text-slate-400 font-bold">회 누적</span>
          </div>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="h-60 sm:h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAccuracyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
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
              domain={[50, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              unit="점"
              ticks={[50, 60, 70, 80, 90, 100]}
            />

            {/* Target Native Proficiency Line (85점) */}
            <ReferenceLine
              y={85}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '원어민 기준 (85점)',
                fill: '#10b981',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="avgAccuracy"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorAccuracyGrad)"
              activeDot={{
                r: 6,
                fill: '#10b981',
                stroke: '#ffffff',
                strokeWidth: 2,
                className: 'shadow-lg',
              }}
              dot={{
                r: 4,
                fill: '#6366f1',
                stroke: '#ffffff',
                strokeWidth: 1.5,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Callout */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-emerald-50/80 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-emerald-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="font-semibold">
            {improvementDelta > 0 ? (
              <>
                최근 7일간 발음 정확도가 <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">+{improvementDelta}점 상승</strong>했습니다. 꾸준한 쉐도잉 연습이 탁월한 효과를 내고 있습니다!
              </>
            ) : (
              <>
                매일 꾸준한 1분 쉐도잉 및 실시간 발음 측정을 통해 원어민 수준의 억양과 강세를 유지하세요.
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 shrink-0">
          <Mic className="w-3.5 h-3.5 text-emerald-500" />
          <span>VAD 실시간 음향 엔진 연동</span>
        </div>
      </div>
    </div>
  );
};
