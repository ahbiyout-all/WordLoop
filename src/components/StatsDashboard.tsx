import React from 'react';
import { BarChart3, Flame, Headphones, Target, Trophy, Clock, CheckCircle2, User, Lock, Mic, Activity } from 'lucide-react';
import { Goal, DailyGoalHistory, UserProfile } from '../types';
import { WeeklyRepeatsChart } from './WeeklyRepeatsChart';
import { WeeklyPronunciationAccuracyChart } from './WeeklyPronunciationAccuracyChart';

interface StatsDashboardProps {
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  vocabCount: number;
  userProfile?: UserProfile | null;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  goals,
  history,
  totalRepeatsCount,
  vocabCount,
  userProfile,
}) => {
  const completedGoalsCount = goals.filter((g) => g.isCompleted).length;
  const totalGoals = goals.length;
  const maxStreak = goals.reduce((max, g) => Math.max(max, g.streak), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="rounded-3xl p-6 bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20 shrink-0">
            {userProfile?.avatar || '📊'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <span>{userProfile ? `${userProfile.name}님의 학습 성과 대시보드` : '학습 & 목표 성과 통계'}</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                1인 전용 락
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {userProfile?.motto || '연속 학습 일수, 반복 청취 누적 횟수, 발음 정확도 향상 및 자기계발 목표 달성 지표입니다.'}
            </p>
          </div>
        </div>

        {userProfile && (
          <div className="px-3.5 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-right shrink-0">
            <span className="text-[10px] text-slate-400">1일 목표 단어</span>
            <p className="text-sm font-extrabold text-emerald-400">{userProfile.dailyWordGoal}개 / 일</p>
          </div>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Headphones className="w-4 h-4" />
            <span className="text-xs font-semibold">총 음성 반복 청취</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalRepeatsCount}회
          </p>
          <span className="text-[10px] text-slate-400">무한 반복 청취 누적</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Flame className="w-4 h-4" />
            <span className="text-xs font-semibold">최고 연속 실천</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {maxStreak}일
          </p>
          <span className="text-[10px] text-slate-400">꾸준한 습관 형성</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-blue-500 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold">오늘 목표 달성률</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalGoals > 0 ? Math.round((completedGoalsCount / totalGoals) * 100) : 0}%
          </p>
          <span className="text-[10px] text-slate-400">{completedGoalsCount}개 / {totalGoals}개 완료</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-purple-500 mb-1">
            <Trophy className="w-4 h-4" />
            <span className="text-xs font-semibold">보유 단어 수</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {vocabCount}개
          </p>
          <span className="text-[10px] text-slate-400">필수 및 AI 맞춤 단어</span>
        </div>

      </div>

      {/* 1. Recent 7-Day Average Pronunciation Accuracy Chart (Recharts) */}
      <WeeklyPronunciationAccuracyChart />

      {/* 2. Weekly Repeats Bar Chart (Recharts) */}
      <WeeklyRepeatsChart history={history} />

      {/* History Log */}
      <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          최근 일별 습관 달성 일지
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {history.slice(0, 7).map((log, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">{log.date}</span>
                <span className="text-slate-400 ml-2">({log.vocabStudyCount}회 영어 공부)</span>
              </div>

              <span className={`font-semibold px-2.5 py-0.5 rounded-full ${
                log.completedGoalsCount >= 2
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                목표 {log.completedGoalsCount}개 완료
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
