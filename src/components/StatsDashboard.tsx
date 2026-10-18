import React from 'react';
import { BarChart3, Flame, Headphones, Target, Trophy, Clock, CheckCircle2, User, Lock, Mic, Activity, MessageSquare } from 'lucide-react';
import { Goal, DailyGoalHistory, UserProfile, VocabItem } from '../types';
import { DailyGoalStreakIndicator } from './DailyGoalStreakIndicator';
import { WeeklyRepeatsChart } from './WeeklyRepeatsChart';
import { WeeklyPronunciationAccuracyChart } from './WeeklyPronunciationAccuracyChart';
import { WeeklyContributionHeatmap } from './WeeklyContributionHeatmap';
import { MilestoneBadgeSystem } from './MilestoneBadgeSystem';
import { MasteryGrowthBar } from './MasteryGrowthBar';
import { PredictedMasteryTimeWidget } from './PredictedMasteryTimeWidget';
import { VocabularyMasteryDistributionChart } from './VocabularyMasteryDistributionChart';

interface StatsDashboardProps {
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  vocabCount: number;
  vocabList?: VocabItem[];
  userProfile?: UserProfile | null;
  onStartReviewQuiz?: () => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  goals,
  history,
  totalRepeatsCount,
  vocabCount,
  vocabList,
  userProfile,
  onStartReviewQuiz,
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

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
          {userProfile && (
            <div className="px-3.5 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-right">
              <span className="text-[10px] text-slate-400">1일 목표 단어</span>
              <p className="text-sm font-extrabold text-emerald-400">{userProfile.dailyWordGoal}개 / 일</p>
            </div>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* 1. Daily Goal Summary Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-indigo-500">
                <Target className="w-4 h-4" />
                <span className="text-xs font-semibold">Daily Goal Summary</span>
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {totalGoals > 0 ? Math.round((completedGoalsCount / totalGoals) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {completedGoalsCount}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {totalGoals}개
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-1">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{
                  width: `${totalGoals > 0 ? Math.min(100, Math.round((completedGoalsCount / totalGoals) * 100)) : 0}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block truncate">
              설정 {totalGoals}개 중 {completedGoalsCount}개 완료
            </span>
          </div>
        </div>

        {/* 2. 총 음성 반복 청취 */}
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

        {/* 3. 최고 연속 실천 */}
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

        {/* 4. 오늘 목표 달성률 */}
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

        {/* 5. 보유 단어 수 */}
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

      {/* Daily Goal Summary Detail Section */}
      <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Daily Goal Summary</span>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    일일 목표 요약
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                오늘 설정된 전체 목표 수(Total Goals Set)와 완료된 목표 수(Goals Completed Today)의 상세 진행 현황입니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right">
              <span className="text-[10px] text-slate-400 block">오늘 완료 현황</span>
              <span className="text-sm font-black text-indigo-500">
                {completedGoalsCount}개 / {totalGoals}개 달성
              </span>
            </div>
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              총 설정 목표 (Total Set)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {totalGoals}
              </span>
              <span className="text-xs font-semibold text-slate-500">개</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block mb-1">
              오늘 완료 목표 (Completed)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {completedGoalsCount}
              </span>
              <span className="text-xs font-semibold text-emerald-500">개</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block mb-1">
              진행 중인 목표 (Remaining)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {Math.max(0, totalGoals - completedGoalsCount)}
              </span>
              <span className="text-xs font-semibold text-amber-500">개</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40">
            <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 block mb-1">
              오늘의 목표 달성률
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {totalGoals > 0 ? Math.round((completedGoalsCount / totalGoals) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Goals Progress Pill List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              오늘의 개별 목표 진행 상황 ({completedGoalsCount}/{totalGoals}개 완료)
            </span>
            <span className="text-[11px] text-slate-400">
              {completedGoalsCount >= totalGoals && totalGoals > 0
                ? '🎉 오늘의 모든 목표를 완수했습니다!'
                : `${Math.max(0, totalGoals - completedGoalsCount)}개의 목표가 진행 중입니다.`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {goals.map((g) => {
              const pct = g.targetCount > 0 ? Math.min(100, Math.round((g.currentCount / g.targetCount) * 100)) : 0;
              return (
                <div
                  key={g.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    g.isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        g.isCompleted
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {g.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold truncate">{g.title}</p>
                      <span className="text-[10px] text-slate-400">
                        {g.currentCount} / {g.targetCount} {g.unit} ({pct}%)
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shrink-0 ${
                      g.isCompleted
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {g.isCompleted ? '달성 완료' : '진행 중'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Goal Completion Streak Indicator */}
      <DailyGoalStreakIndicator goals={goals} history={history} />

      {/* 1. Recent 7-Day Average Pronunciation Accuracy Chart (Recharts) */}
      <WeeklyPronunciationAccuracyChart />

      {/* 2. Weekly Total Repeats Trend Chart (Recharts) */}
      <WeeklyRepeatsChart history={history} totalRepeatsCount={totalRepeatsCount} />

      {/* 3. Weekly Contribution Heatmap (Day-of-Week Intensity Grid) */}
      <WeeklyContributionHeatmap history={history} goals={goals} />

      {/* 4. Visual Milestone Badge System */}
      <MilestoneBadgeSystem
        goals={goals}
        history={history}
        totalRepeatsCount={totalRepeatsCount}
        vocabCount={vocabCount}
      />

      {/* 5. Animated 'Mastery Growth' Bar with Subtle Scale-Up */}
      <MasteryGrowthBar
        vocabList={vocabList}
        vocabCount={vocabCount}
        onStartReviewQuiz={onStartReviewQuiz}
      />

      {/* 6. Vocabulary Mastery Distribution Bar Chart (Recharts) */}
      <VocabularyMasteryDistributionChart
        vocabList={vocabList}
        vocabCount={vocabCount}
        onStartReviewQuiz={onStartReviewQuiz}
      />

      {/* 7. Predicted Mastery Time Widget (취약 어휘 완전 정복 예상 시간 예측) */}
      <PredictedMasteryTimeWidget
        vocabList={vocabList}
        vocabCount={vocabCount}
        history={history}
        totalRepeatsCount={totalRepeatsCount}
        userProfile={userProfile}
        onStartReviewQuiz={onStartReviewQuiz}
      />

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
