import React, { useState, useMemo, useEffect, Suspense } from 'react';
import {
  CheckCircle2,
  Clock,
  Share2,
  Zap,
  Volume2,
  Mic,
  Sprout,
  CalendarClock,
  BarChart3,
} from 'lucide-react';
import { Goal, DailyGoalHistory, UserProfile, VocabItem } from '../types';
import { StreakCalendarHeatmap } from './StreakCalendarHeatmap';
import { StudentLevelProgressBar } from './StudentLevelProgressBar';
import {
  StudentLevelInfo,
  calculateStudentLevel,
  calculateStudentExpBreakdown,
} from '../services/studentGamificationService';
import { getDailySrsSummary, formatNextReviewLabel } from '../services/srsEngineService';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning } from '../utils/meaningUtils';
import { LazyLoadingFallback } from './LazyLoadingFallback';

// Lazy-loaded heavy Recharts & secondary modals so StatsDashboard stays crisp & fast
const StreakGraph = React.lazy(() => import('./StreakGraph').then((m) => ({ default: m.StreakGraph })));
const WeeklyPronunciationAccuracyChart = React.lazy(() =>
  import('./WeeklyPronunciationAccuracyChart').then((m) => ({ default: m.WeeklyPronunciationAccuracyChart }))
);
const WeeklyRepeatsChart = React.lazy(() =>
  import('./WeeklyRepeatsChart').then((m) => ({ default: m.WeeklyRepeatsChart }))
);
const WeeklyContributionHeatmap = React.lazy(() =>
  import('./WeeklyContributionHeatmap').then((m) => ({ default: m.WeeklyContributionHeatmap }))
);
const VocabularyMasteryDistributionChart = React.lazy(() =>
  import('./VocabularyMasteryDistributionChart').then((m) => ({ default: m.VocabularyMasteryDistributionChart }))
);
const PronunciationLeaderboard = React.lazy(() =>
  import('./PronunciationLeaderboard').then((m) => ({ default: m.PronunciationLeaderboard }))
);
const MilestoneBadgeSystem = React.lazy(() =>
  import('./MilestoneBadgeSystem').then((m) => ({ default: m.MilestoneBadgeSystem }))
);
const PredictedMasteryTimeWidget = React.lazy(() =>
  import('./PredictedMasteryTimeWidget').then((m) => ({ default: m.PredictedMasteryTimeWidget }))
);
const MasteryGrowthBar = React.lazy(() =>
  import('./MasteryGrowthBar').then((m) => ({ default: m.MasteryGrowthBar }))
);
const ShareProgressModal = React.lazy(() =>
  import('./ShareProgressModal').then((m) => ({ default: m.ShareProgressModal }))
);
const QuickReviewModal = React.lazy(() =>
  import('./QuickReviewModal').then((m) => ({ default: m.QuickReviewModal }))
);
const LevelUpCelebrationModal = React.lazy(() =>
  import('./LevelUpCelebrationModal').then((m) => ({ default: m.LevelUpCelebrationModal }))
);
const StudentTitlesModal = React.lazy(() =>
  import('./StudentTitlesModal').then((m) => ({ default: m.StudentTitlesModal }))
);

interface StatsDashboardProps {
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  vocabCount: number;
  vocabList?: VocabItem[];
  userProfile?: UserProfile | null;
  levelInfo?: StudentLevelInfo;
  onOpenProfileModal?: () => void;
  onStartReviewQuiz?: () => void;
  onOpenRecordingHistory?: () => void;
  onStartPronunciation?: (word: string) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
}

type DashboardTab = 'summary' | 'srs' | 'charts';

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  goals,
  history,
  totalRepeatsCount,
  vocabCount,
  vocabList = [],
  userProfile,
  levelInfo,
  onOpenProfileModal,
  onStartReviewQuiz,
  onOpenRecordingHistory,
  onStartPronunciation,
  onChangeMastery,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<DashboardTab>('summary');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showQuickReviewModal, setShowQuickReviewModal] = useState<boolean>(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState<boolean>(false);
  const [showTitlesModal, setShowTitlesModal] = useState<boolean>(false);
  const [previousLevel, setPreviousLevel] = useState<number | undefined>(undefined);

  const activeLevelInfo = useMemo(
    () =>
      levelInfo ||
      calculateStudentLevel({
        totalRepeatsCount,
        vocabList,
        goals,
        history,
        streakDays: userProfile?.streakDays ?? 1,
      }),
    [levelInfo, totalRepeatsCount, vocabList, goals, history, userProfile?.streakDays]
  );

  const expBreakdown = useMemo(
    () =>
      calculateStudentExpBreakdown({
        totalRepeatsCount,
        vocabList,
        goals,
        history,
        streakDays: userProfile?.streakDays ?? 1,
      }),
    [totalRepeatsCount, vocabList, goals, history, userProfile?.streakDays]
  );

  const srsSummary = useMemo(() => getDailySrsSummary(vocabList), [vocabList]);

  const completedGoalsCount = goals.filter((g) => g.isCompleted).length;
  const totalGoals = goals.length;
  const maxStreak = goals.reduce((max, g) => Math.max(max, g.streak), 0);
  const goalRate = totalGoals > 0 ? Math.round((completedGoalsCount / totalGoals) * 100) : 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedLevelStr = localStorage.getItem('wordloop_seen_student_level');
    const currentLevel = activeLevelInfo.level;
    if (storedLevelStr) {
      const storedLevel = parseInt(storedLevelStr, 10);
      if (!isNaN(storedLevel) && currentLevel > storedLevel) {
        setPreviousLevel(storedLevel);
        setShowLevelUpModal(true);
      }
    } else {
      localStorage.setItem('wordloop_seen_student_level', String(currentLevel));
    }
  }, [activeLevelInfo.level]);

  const handleCloseLevelUpModal = () => {
    setShowLevelUpModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wordloop_seen_student_level', String(activeLevelInfo.level));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* 1. Clean Single-Elevation Header */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{userProfile?.avatar || '📊'}</span>
            <span>{userProfile ? `${userProfile.name}님의 학습 분석` : '학습 성과 대시보드'}</span>
            <span>·</span>
            <span className="font-mono-tabular">1일 목표 {userProfile?.dailyWordGoal || 10}단어</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">
            학습 현황 및 성장 리포트
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {userProfile?.motto || '연속 출석 잔디, SRS 간격 복습 큐, 발음 정확도 추이를 한눈에 확인하세요.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setShowQuickReviewModal(true)}
            className="min-h-[44px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span>빠른 복습 ({srsSummary.weakItems.length}개)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>성과 공유</span>
          </button>
        </div>
      </section>

      {/* 2. Flat 4-KPI Row (Zero Pill Clutter, Tabular Numbers) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">오늘 목표 달성</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tabular text-2xl font-extrabold text-slate-900 dark:text-white">
              {goalRate}%
            </span>
            <span className="font-mono-tabular text-xs text-slate-400">
              {completedGoalsCount}/{totalGoals}개
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">SRS 복습 · 암기</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tabular text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {srsSummary.masteredCount.toLocaleString()}
            </span>
            <span className="font-mono-tabular text-xs text-slate-400">
              / {vocabCount.toLocaleString()} · 대기 {srsSummary.dueCount}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">누적 음성 반복</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tabular text-2xl font-extrabold text-slate-900 dark:text-white">
              {totalRepeatsCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">회</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">최고 연속 실천</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tabular text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {Math.max(maxStreak, userProfile?.streakDays || 1)}
            </span>
            <span className="text-xs text-slate-400">일 연속</span>
          </div>
        </div>
      </section>

      {/* 3. Consolidated 3-Tab Switcher */}
      <div
        role="tablist"
        aria-label="대시보드 세부 영역"
        className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'summary'}
          onClick={() => setActiveSubTab('summary')}
          className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'summary'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sprout className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="truncate">요약 · 잔디 달력</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'srs'}
          onClick={() => setActiveSubTab('srs')}
          className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'srs'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CalendarClock className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="truncate">SRS 복습 · 취약 어휘</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'charts'}
          onClick={() => setActiveSubTab('charts')}
          className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'charts'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-cyan-600 shrink-0" />
          <span className="truncate">발음 · 상세 차트</span>
        </button>
      </div>

      {/* TAB 1: 요약 & 잔디 달력 */}
      {activeSubTab === 'summary' && (
        <div className="space-y-6">
          <StudentLevelProgressBar
            levelInfo={activeLevelInfo}
            breakdown={expBreakdown}
            onStartReviewQuiz={onStartReviewQuiz}
            onOpenQuickReview={() => setShowQuickReviewModal(true)}
            onOpenProfileModal={onOpenProfileModal}
            onOpenTitlesModal={() => setShowTitlesModal(true)}
            onTriggerCelebration={() => setShowLevelUpModal(true)}
          />

          {/* Monthly Grass Planting Calendar with Quiz Flame Effects */}
          <StreakCalendarHeatmap
            goals={goals}
            history={history}
            userProfile={userProfile}
            totalRepeatsCount={totalRepeatsCount}
            onStartReviewQuiz={onStartReviewQuiz}
          />

          {/* Two-Column Hairline Lists on Desktop: Today's Goals & Recent 7-Day Log */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  오늘의 목표 진행 현황
                </h2>
                <span className="font-mono-tabular text-xs text-slate-500">
                  {completedGoalsCount}/{totalGoals} 완료
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {goals.map((g) => {
                  const pct = g.targetCount > 0 ? Math.min(100, Math.round((g.currentCount / g.targetCount) * 100)) : 0;
                  return (
                    <div key={g.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {g.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {g.title}
                          </p>
                          <p className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                            {g.currentCount}/{g.targetCount} {g.unit} · {pct}%
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-semibold shrink-0 ${
                          g.isCompleted
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {g.isCompleted ? '완료' : '진행중'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                최근 7일 학습 일지
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.slice(0, 7).map((log, idx) => (
                  <div key={`${log.date}-${idx}`} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-100">
                        {log.date}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                        {log.vocabStudyCount}회 청취
                      </span>
                    </div>
                    <span
                      className={`font-mono-tabular font-semibold ${
                        log.completedGoalsCount >= 2
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      목표 {log.completedGoalsCount}개 완료
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: SRS 복습 · 취약 어휘 */}
      {activeSubTab === 'srs' && (
        <div className="space-y-6">
          {/* SRS Stage Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <span className="text-xs text-slate-500">지금 복습 도래</span>
              <p className="font-mono-tabular text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {srsSummary.dueCount}개
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <span className="text-xs text-slate-500">복습 예정 (단기)</span>
              <p className="font-mono-tabular text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {srsSummary.upcomingSoonItems.length}개
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <span className="text-xs text-slate-500">장기 기억 정착</span>
              <p className="font-mono-tabular text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {srsSummary.masteredCount}개
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <span className="text-xs text-slate-500">신규 미학습</span>
              <p className="font-mono-tabular text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {srsSummary.newCount}개
              </p>
            </div>
          </div>

          {/* Priority Due / Weak Words List */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  우선 복습 추천 어휘 (상위 12개)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  망각 시점이 지났거나 오답 기록(lapse)이 많은 단어를 먼저 복습하세요.
                </p>
              </div>
              {onStartReviewQuiz && (
                <button
                  type="button"
                  onClick={onStartReviewQuiz}
                  className="min-h-[40px] px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  취약 어휘 퀴즈
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(srsSummary.dueReviewItems.length > 0 ? srsSummary.dueReviewItems : srsSummary.weakItems)
                .slice(0, 12)
                .map((item) => {
                  const mastery = item.masteryLevel ?? (item.isLearned ? 2 : 0);
                  return (
                    <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                            {item.word}
                          </span>
                          <span className="font-mono-tabular text-[11px] text-slate-400">
                            {formatNextReviewLabel(item)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {getCleanKoreanMeaning(item)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => speechService.speakOnce(item.word)}
                          aria-label={`${item.word} 듣기`}
                          className="min-w-[40px] min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        {onStartPronunciation && (
                          <button
                            type="button"
                            onClick={() => onStartPronunciation(item.word)}
                            aria-label={`${item.word} 발음 연습`}
                            className="min-w-[40px] min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 cursor-pointer"
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                        )}
                        {onChangeMastery && (
                          <button
                            type="button"
                            onClick={() => onChangeMastery(item.id, mastery === 2 ? 0 : 2)}
                            className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            {mastery === 2 ? '완료됨' : '암기 체크'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          <Suspense fallback={<LazyLoadingFallback compact />}>
            <MasteryGrowthBar
              vocabList={vocabList}
              vocabCount={vocabCount}
              onStartReviewQuiz={onStartReviewQuiz}
            />
            <PredictedMasteryTimeWidget
              vocabList={vocabList}
              vocabCount={vocabCount}
              history={history}
              totalRepeatsCount={totalRepeatsCount}
              userProfile={userProfile}
              onStartReviewQuiz={onStartReviewQuiz}
            />
          </Suspense>
        </div>
      )}

      {/* TAB 3: 발음 · 상세 차트 (Lazy-Loaded Recharts) */}
      {activeSubTab === 'charts' && (
        <Suspense fallback={<LazyLoadingFallback label="상세 분석 차트를 불러오는 중입니다..." />}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StreakGraph
                history={history}
                totalRepeatsCount={totalRepeatsCount}
                goals={goals}
                userProfile={userProfile}
              />
              <WeeklyPronunciationAccuracyChart onOpenRecordingHistory={onOpenRecordingHistory} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WeeklyRepeatsChart history={history} totalRepeatsCount={totalRepeatsCount} />
              <VocabularyMasteryDistributionChart
                vocabList={vocabList}
                vocabCount={vocabCount}
                onStartReviewQuiz={onStartReviewQuiz}
              />
            </div>

            <PronunciationLeaderboard
              vocabList={vocabList}
              onTriggerChallenge={onStartPronunciation}
              onOpenAllHistory={onOpenRecordingHistory}
            />

            <WeeklyContributionHeatmap history={history} goals={goals} />

            <MilestoneBadgeSystem
              goals={goals}
              history={history}
              totalRepeatsCount={totalRepeatsCount}
              vocabCount={vocabCount}
              userProfile={userProfile}
            />
          </div>
        </Suspense>
      )}

      {/* Lazy Modals */}
      {showShareModal && (
        <Suspense fallback={null}>
          <ShareProgressModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            data={{
              userName: userProfile?.name || 'WordLoop 학습자',
              userAvatar: userProfile?.avatar || '🔥',
              userMotto: userProfile?.motto,
              currentStreak: maxStreak,
              longestStreak: maxStreak,
              totalRepeatsCount,
              completedGoalsCount,
              totalGoalsCount: totalGoals,
              vocabCount,
            }}
          />
        </Suspense>
      )}

      {showQuickReviewModal && (
        <Suspense fallback={null}>
          <QuickReviewModal
            isOpen={showQuickReviewModal}
            onClose={() => setShowQuickReviewModal(false)}
            vocabList={vocabList}
            onChangeMastery={onChangeMastery}
            onStartPronunciation={onStartPronunciation}
          />
        </Suspense>
      )}

      {showLevelUpModal && (
        <Suspense fallback={null}>
          <LevelUpCelebrationModal
            isOpen={showLevelUpModal}
            onClose={handleCloseLevelUpModal}
            levelInfo={activeLevelInfo}
            previousLevel={previousLevel}
            onShareProgress={() => setShowShareModal(true)}
            onOpenTitlesModal={() => setShowTitlesModal(true)}
          />
        </Suspense>
      )}

      {showTitlesModal && (
        <Suspense fallback={null}>
          <StudentTitlesModal
            isOpen={showTitlesModal}
            onClose={() => setShowTitlesModal(false)}
            currentLevelInfo={activeLevelInfo}
          />
        </Suspense>
      )}
    </div>
  );
};
