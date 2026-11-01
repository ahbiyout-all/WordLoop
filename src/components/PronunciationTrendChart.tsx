import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';

export interface PronunciationHistoryItem {
  id: string;
  timestamp: string;
  recordedAt?: number;
  targetText: string;
  transcript: string;
  score: number;
  feedback: string;
}

export interface DailyTrendPoint {
  dateKey: string;
  fullDate: string;
  dayName: string;
  avgScore: number;
  maxScore: number;
  count: number;
  hasData: boolean;
}

export function computeWeeklyPronunciationTrend(history: PronunciationHistoryItem[]): {
  dailyData: DailyTrendPoint[];
  weeklyAvg: number;
  weeklyMax: number;
  totalCount: number;
  deltaText: string;
  isPositiveDelta: boolean;
} {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dailyData: DailyTrendPoint[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    const dateNum = d.getDate();
    const dateKey = `${month + 1}/${dateNum}`;
    const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
    const dayName = dayNames[d.getDay()];

    const itemsOnDay = history.filter((item) => {
      let itemDate: Date;
      if (item.recordedAt) {
        itemDate = new Date(item.recordedAt);
      } else if (item.id) {
        const match = item.id.match(/pron-hist-(\d+)-/);
        if (match && match[1]) {
          itemDate = new Date(parseInt(match[1], 10));
        } else {
          itemDate = new Date();
        }
      } else {
        itemDate = new Date();
      }
      return (
        itemDate.getFullYear() === year &&
        itemDate.getMonth() === month &&
        itemDate.getDate() === dateNum
      );
    });

    if (itemsOnDay.length > 0) {
      const sum = itemsOnDay.reduce((acc, curr) => acc + curr.score, 0);
      const avgScore = Math.round(sum / itemsOnDay.length);
      const maxScore = Math.max(...itemsOnDay.map((item) => item.score));
      dailyData.push({
        dateKey,
        fullDate,
        dayName,
        avgScore,
        maxScore,
        count: itemsOnDay.length,
        hasData: true,
      });
    } else {
      dailyData.push({
        dateKey,
        fullDate,
        dayName,
        avgScore: 0,
        maxScore: 0,
        count: 0,
        hasData: false,
      });
    }
  }

  const daysWithData = dailyData.filter((d) => d.hasData);
  const totalCount = history.length;
  const weeklyAvg =
    daysWithData.length > 0
      ? Math.round(daysWithData.reduce((acc, d) => acc + d.avgScore, 0) / daysWithData.length)
      : 0;
  const weeklyMax = daysWithData.length > 0 ? Math.max(...daysWithData.map((d) => d.maxScore)) : 0;

  const recentDays = dailyData.slice(4);
  const earlierDays = dailyData.slice(1, 4);

  const recentAvg =
    recentDays.filter((d) => d.hasData).length > 0
      ? recentDays.filter((d) => d.hasData).reduce((a, b) => a + b.avgScore, 0) /
        recentDays.filter((d) => d.hasData).length
      : 0;
  const earlierAvg =
    earlierDays.filter((d) => d.hasData).length > 0
      ? earlierDays.filter((d) => d.hasData).reduce((a, b) => a + b.avgScore, 0) /
        earlierDays.filter((d) => d.hasData).length
      : 0;

  let deltaText = '연습 데이터 수집 중';
  let isPositiveDelta = true;

  if (recentAvg > 0 && earlierAvg > 0) {
    const diff = Math.round(recentAvg - earlierAvg);
    if (diff > 0) {
      deltaText = `+${diff}점 상승 🚀`;
      isPositiveDelta = true;
    } else if (diff < 0) {
      deltaText = `${diff}점 보완 필요`;
      isPositiveDelta = false;
    } else {
      deltaText = '점수 유지 중 🎯';
      isPositiveDelta = true;
    }
  } else if (weeklyAvg >= 80) {
    deltaText = '목표 달성 구간 🌟';
    isPositiveDelta = true;
  } else if (weeklyAvg > 0) {
    deltaText = '꾸준한 연습 진행 중 💪';
    isPositiveDelta = true;
  }

  return { dailyData, weeklyAvg, weeklyMax, totalCount, deltaText, isPositiveDelta };
}

const CustomTrendTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data: DailyTrendPoint = payload[0].payload;
    if (!data) return null;

    const getGradeInfo = (score: number, hasData: boolean) => {
      if (!hasData) return { label: '기록 없음', color: 'text-slate-400' };
      if (score >= 90) return { label: '🎯 탁월 (90점↑)', color: 'text-emerald-400 font-bold' };
      if (score >= 80) return { label: '✨ 우수 (80점↑)', color: 'text-indigo-400 font-bold' };
      if (score >= 60) return { label: '💡 양호 (60점↑)', color: 'text-amber-400 font-bold' };
      return { label: '💪 연습 필요 (60점 미만)', color: 'text-rose-400 font-bold' };
    };

    const grade = getGradeInfo(data.avgScore, data.hasData);

    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 backdrop-blur-md z-50">
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-800">
          <span className="font-extrabold text-slate-200">
            {data.dateKey} ({data.dayName}요일)
          </span>
          <span className={grade.color}>{grade.label}</span>
        </div>
        {data.hasData ? (
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">일일 평균 점수:</span>
              <span className="font-black text-indigo-400 text-sm">{data.avgScore}점</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">일일 최고 점수:</span>
              <span className="font-bold text-emerald-400">{data.maxScore}점</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">연습 횟수:</span>
              <span className="font-bold text-amber-300">{data.count}회</span>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-[11px] pt-1">해당 일자에는 발음 연습 기록이 없습니다.</p>
        )}
      </div>
    );
  }
  return null;
};

interface PronunciationWeeklyTrendChartProps {
  history: PronunciationHistoryItem[];
}

export const PronunciationWeeklyTrendChart: React.FC<PronunciationWeeklyTrendChartProps> = ({ history }) => {
  const trend = useMemo(() => computeWeeklyPronunciationTrend(history), [history]);

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
            <TrendingUp className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
              <span>최근 7일 발음 점수 추이 차트</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                Weekly Trend
              </span>
            </h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              최근 7일간의 발음 연습 성과와 평균 점수 변화를 시각화합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 text-center">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">7일 평균 점수</span>
          <span className={`text-base sm:text-lg font-black ${trend.weeklyAvg >= 80 ? 'text-indigo-600 dark:text-indigo-400' : trend.weeklyAvg >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {trend.weeklyAvg > 0 ? `${trend.weeklyAvg}점` : '-'}
          </span>
        </div>

        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 text-center">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">주간 최고 점수</span>
          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
            {trend.weeklyMax > 0 ? `${trend.weeklyMax}점` : '-'}
          </span>
        </div>

        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 text-center">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">총 연습 횟수</span>
          <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
            {trend.totalCount}회
          </span>
        </div>

        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 text-center">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">점수 변화 추세</span>
          <span className={`text-xs sm:text-sm font-extrabold block truncate mt-0.5 ${trend.isPositiveDelta ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {trend.deltaText}
          </span>
        </div>
      </div>

      <div className="w-full h-44 sm:h-48 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="pronunciationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="dateKey"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
              tickFormatter={(value, index) => `${value} (${trend.dailyData[index]?.dayName || ''})`}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 40, 60, 80, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
            />
            <Tooltip content={<CustomTrendTooltip />} />
            <ReferenceLine
              y={80}
              stroke="#10b981"
              strokeDasharray="4 4"
              label={{
                value: '목표 80점',
                position: 'insideTopRight',
                fill: '#10b981',
                fontSize: 10,
                fontWeight: 700,
              }}
            />
            <Area
              type="monotone"
              dataKey="avgScore"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#pronunciationGradient)"
              activeDot={{ r: 6, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
