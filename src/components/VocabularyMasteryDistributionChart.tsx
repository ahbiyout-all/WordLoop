import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  BookOpen,
  Zap,
  AlertCircle,
  Trophy,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  Award,
  Flame,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { VocabItem } from '../types';

interface VocabularyMasteryDistributionChartProps {
  vocabList?: VocabItem[];
  vocabCount?: number;
  onStartReviewQuiz?: () => void;
}

type ChartOrientation = 'vertical' | 'horizontal';

export const VocabularyMasteryDistributionChart: React.FC<VocabularyMasteryDistributionChartProps> = ({
  vocabList,
  vocabCount,
  onStartReviewQuiz,
}) => {
  const [orientation, setOrientation] = useState<ChartOrientation>('vertical');

  // 1. Calculate word counts for Mastery Levels 0, 1, 2
  const {
    totalWords,
    l0Count,
    l1Count,
    l2Count,
    l0Pct,
    l1Pct,
    l2Pct,
    fullyLearnedRatio,
    chartData,
    masteryStatusText,
  } = useMemo(() => {
    let l0 = 0;
    let l1 = 0;
    let l2 = 0;

    if (vocabList && vocabList.length > 0) {
      vocabList.forEach((item) => {
        const level = item.masteryLevel ?? (item.isLearned ? 2 : 0);
        if (level === 2) l2++;
        else if (level === 1) l1++;
        else l0++;
      });
    } else {
      // Fallback
      const total = vocabCount || 3210;
      l2 = Math.round(total * 0.28);
      l1 = Math.round(total * 0.32);
      l0 = total - l1 - l2;
    }

    const total = l0 + l1 + l2 || 1;
    const p0 = Math.round((l0 / total) * 100);
    const p1 = Math.round((l1 / total) * 100);
    const p2 = Math.round((l2 / total) * 100);

    const data = [
      {
        level: 0,
        levelKey: '0',
        name: 'Level 0 (미암기)',
        shortName: '0단계 미암기',
        stage: '미암기',
        count: l0,
        percentage: p0,
        color: '#f59e0b',
        gradientId: 'gradLevel0',
        fill: '#f59e0b',
        description: '기초 암기 및 1차 노출이 필요한 단어',
        actionTip: '플래시카드 및 4지선다 리콜로 1차 학습 시작',
      },
      {
        level: 1,
        levelKey: '1',
        name: 'Level 1 (학습중)',
        shortName: '1단계 학습중',
        stage: '학습중',
        count: l1,
        percentage: p1,
        color: '#6366f1',
        gradientId: 'gradLevel1',
        fill: '#6366f1',
        description: '반복 쉐도잉 및 복습 퀴즈 진행중 단어',
        actionTip: '맞춤 복습 퀴즈로 2단계 완벽 마스터로 승급',
      },
      {
        level: 2,
        levelKey: '2',
        name: 'Level 2 (완벽암기)',
        shortName: '2단계 완벽암기',
        stage: '완벽암기',
        count: l2,
        percentage: p2,
        color: '#10b981',
        gradientId: 'gradLevel2',
        fill: '#10b981',
        description: '장기 기억에 완벽 안착된 마스터 단어',
        actionTip: '정기적 망각 곡선 점검으로 기억 유지',
      },
    ];

    // Status evaluation
    let status = '초급 학습 도약 단계';
    if (p2 >= 70) {
      status = '🏆 그랜드 마스터 완성 단계 (상위 5%)';
    } else if (p2 >= 40) {
      status = '⭐ 중급 안정화 마스터 단계';
    } else if (p2 >= 20) {
      status = '🔥 집중 실천 성장 단계';
    }

    return {
      totalWords: total,
      l0Count: l0,
      l1Count: l1,
      l2Count: l2,
      l0Pct: p0,
      l1Pct: p1,
      l2Pct: p2,
      fullyLearnedRatio: p2,
      chartData: data,
      masteryStatusText: status,
    };
  }, [vocabList, vocabCount]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700/80 shadow-2xl text-xs space-y-2 min-w-[210px] text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span
              className="font-black px-2 py-0.5 rounded-full text-[10px]"
              style={{ backgroundColor: `${item.color}20`, color: item.color }}
            >
              {item.name}
            </span>
            <span className="text-slate-400 font-bold">
              전체의 {item.percentage}%
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-slate-400">보유 단어 수:</span>
            <span className="text-base font-extrabold text-white">
              {item.count.toLocaleString()}개
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-snug">
            {item.description}
          </p>

          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[10px] text-slate-400 flex items-start gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
            <span>{item.actionTip}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Vocabulary Mastery Distribution</span>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  어휘 암기 단계 분포
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              전체 보유 어휘({totalWords.toLocaleString()}단어) 중 마스터 레벨(0단계 미암기, 1단계 학습중, 2단계 완벽암기)의 분포와 완전 학습률을 시각화합니다.
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setOrientation('vertical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                orientation === 'vertical'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              수직 바 차트
            </button>
            <button
              type="button"
              onClick={() => setOrientation('horizontal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                orientation === 'horizontal'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              수평 바 차트
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Hero Bar: Fully Learned Ratio Gauge */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/50 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Library Fully Learned Ratio
              </span>
              <span className="text-xs text-indigo-300 font-semibold">
                {masteryStatusText}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white">
                {fullyLearnedRatio}%
              </span>
              <span className="text-xs text-slate-300 font-medium">
                완전 학습 완료 ({l2Count.toLocaleString()} / {totalWords.toLocaleString()}단어)
              </span>
            </div>
          </div>

          {onStartReviewQuiz && (
            <button
              type="button"
              onClick={onStartReviewQuiz}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto active:scale-95"
            >
              <Target className="w-4 h-4" />
              <span>미완성 단어({l0Count + l1Count}개) 복습하기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 100% Stacked Proportion Bar */}
        <div>
          <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
            <div
              className="bg-emerald-500 transition-all duration-500 relative group cursor-pointer"
              style={{ width: `${l2Pct}%` }}
              title={`2단계 완벽암기: ${l2Count}단어 (${l2Pct}%)`}
            />
            <div
              className="bg-indigo-500 transition-all duration-500 relative group cursor-pointer"
              style={{ width: `${l1Pct}%` }}
              title={`1단계 학습중: ${l1Count}단어 (${l1Pct}%)`}
            />
            <div
              className="bg-amber-500 transition-all duration-500 relative group cursor-pointer"
              style={{ width: `${l0Pct}%` }}
              title={`0단계 미암기: ${l0Count}단어 (${l0Pct}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>2단계 완벽암기: <strong className="text-emerald-400 font-bold">{l2Count.toLocaleString()}단어 ({l2Pct}%)</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              <span>1단계 학습중: <strong className="text-indigo-400 font-bold">{l1Count.toLocaleString()}단어 ({l1Pct}%)</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>0단계 미암기: <strong className="text-amber-400 font-bold">{l0Count.toLocaleString()}단어 ({l0Pct}%)</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recharts Bar Chart Container */}
      <div className="h-72 sm:h-80 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          {orientation === 'vertical' ? (
            <BarChart
              data={chartData}
              margin={{ top: 25, right: 20, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="gradLevel0" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="gradLevel1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="gradLevel2" x1="0" y1="0" x2="0" y2="1">
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
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
              <Bar
                dataKey="count"
                radius={[10, 10, 0, 0]}
                maxBarSize={64}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#${entry.gradientId})`}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 10, right: 30, left: 35, bottom: 5 }}
            >
              <defs>
                <linearGradient id="gradLevel0H" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#d97706" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="gradLevel1H" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="gradLevel2H" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
              <Bar
                dataKey="count"
                radius={[0, 10, 10, 0]}
                maxBarSize={36}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-h-${index}`}
                    fill={`url(#${entry.gradientId}H)`}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 4. 3 Level Highlight Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Level 0 Card */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Level 0 (미암기)
            </span>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {l0Pct}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {l0Count.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">단어</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            아직 학습을 시작하지 않았거나 오답 상태인 단어입니다. 플래시카드와 단어 리스트로 1차 노출을 권장합니다.
          </p>
        </div>

        {/* Level 1 Card */}
        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-500" />
              Level 1 (학습중)
            </span>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              {l1Pct}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {l1Count.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">단어</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            1회 이상 정답 또는 연습한 단어입니다. 음성 쉐도잉과 복습 퀴즈를 통해 Level 2로 승급시킬 수 있습니다.
          </p>
        </div>

        {/* Level 2 Card */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Level 2 (완벽암기)
            </span>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {l2Pct}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {l2Count.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">단어</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            반복 테스트와 퀴즈를 모두 통과하여 영구 기억에 안착된 단어입니다. 언제든지 즉시 회상할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};
