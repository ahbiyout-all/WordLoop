import React, { useMemo, useState, useEffect } from 'react';
import {
  Play,
  BookOpen,
  Volume2,
  Mic,
  Gamepad2,
  MessageSquare,
  Sparkles,
  Search,
  Target,
  BarChart3,
  Compass,
  HardDrive,
  Shuffle,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ActiveTab, UserProfile, VocabItem, SentenceItem, Goal, DailyGoalHistory } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning } from '../utils/meaningUtils';
import { calculateStudentLevel } from '../services/studentGamificationService';
import { getDailySrsSummary, buildTodayRoutineQueue, formatNextReviewLabel } from '../services/srsEngineService';
import { getDeviceStorageStats } from '../services/deviceStorageService';

interface TodayHubProps {
  userProfile: UserProfile | null;
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  history?: DailyGoalHistory[];
  totalRepeatsCount: number;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenPronunciationModal: (text: string) => void;
  onOpenDailyQuest: () => void;
  onTriggerRandomLaunch: () => void;
  onOpenCurriculumModal: () => void;
  onSwitchToListMode: () => void;
  onOpenProfileModal?: () => void;
  onStartFocusRoutine: () => void;
  onOpenJsonBackup?: () => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
}

export const TodayHub: React.FC<TodayHubProps> = ({
  userProfile,
  vocabList,
  sentenceList,
  goals,
  history = [],
  totalRepeatsCount,
  onNavigateTab,
  onOpenPronunciationModal,
  onOpenDailyQuest,
  onTriggerRandomLaunch,
  onOpenCurriculumModal,
  onSwitchToListMode,
  onOpenProfileModal,
  onStartFocusRoutine,
  onOpenJsonBackup,
  onChangeMastery,
}) => {
  const userName = userProfile?.name || '학습자';
  const streak = userProfile?.streakDays || 1;
  const dailyWordGoal = userProfile?.dailyWordGoal || 10;

  const srsSummary = useMemo(() => getDailySrsSummary(vocabList), [vocabList]);
  const todayQueue = useMemo(() => buildTodayRoutineQueue(vocabList, 5, 3), [vocabList]);

  const levelInfo = useMemo(
    () =>
      calculateStudentLevel({
        totalRepeatsCount,
        vocabList,
        goals,
        history,
        streakDays: streak,
      }),
    [totalRepeatsCount, vocabList, goals, history, streak]
  );

  const completedGoalsCount = goals.filter((g) => g.isCompleted).length;
  const [storageVersion, setStorageVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setStorageVersion((v) => v + 1);
    window.addEventListener('wordloop_storage_updated', refresh);
    window.addEventListener('wordloop_device_saved', refresh);
    return () => {
      window.removeEventListener('wordloop_storage_updated', refresh);
      window.removeEventListener('wordloop_device_saved', refresh);
    };
  }, []);
  const storageStats = useMemo(
    () => getDeviceStorageStats(),
    [vocabList.length, totalRepeatsCount, storageVersion]
  );

  const exploreItems = [
    {
      id: 'list',
      title: '단어 · 예문장',
      desc: `${vocabList.length.toLocaleString()}개 어휘 · ${sentenceList.length.toLocaleString()}문장`,
      icon: BookOpen,
      onClick: onSwitchToListMode,
    },
    {
      id: 'quiz',
      title: '8종 실전 퀴즈',
      desc: '취약 복습 · 망각곡선 · 오답노트',
      icon: CheckCircle2,
      onClick: () => onNavigateTab('quiz'),
    },
    {
      id: 'game',
      title: '14종 아케이드 게임',
      desc: '플래시카드 · 버블팝 · 크로스워드',
      icon: Gamepad2,
      onClick: () => onNavigateTab('game'),
    },
    {
      id: 'roleplay',
      title: 'AI 원어민 롤플레잉',
      desc: '실전 회화 & 문법 피드백',
      icon: MessageSquare,
      onClick: () => onNavigateTab('roleplay'),
    },
    {
      id: 'ai-gen',
      title: 'AI 맞춤 단어 생성',
      desc: '관심 주제 기반 예문 자동 생성',
      icon: Sparkles,
      onClick: () => onNavigateTab('ai-gen'),
    },
    {
      id: 'dictionary',
      title: '글로벌 상용 사전',
      desc: '어원 · 파생어 · 포털 통합 검색',
      icon: Search,
      onClick: () => onNavigateTab('dictionary'),
    },
    {
      id: 'goals',
      title: '자기계발 목표 루틴',
      desc: `${completedGoalsCount}/${goals.length}개 목표 진행 중`,
      icon: Target,
      onClick: () => onNavigateTab('goals'),
    },
    {
      id: 'stats',
      title: '학습 통계 & 잔디 달력',
      desc: `누적 청취 ${totalRepeatsCount.toLocaleString()}회`,
      icon: BarChart3,
      onClick: () => onNavigateTab('stats'),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Backup or Storage Quota Gentle Reminder (Only when needed) */}
      {(storageStats.statusLevel !== 'healthy' || storageStats.shouldRemindBackup) && onOpenJsonBackup && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {storageStats.statusLevel !== 'healthy'
                ? `로컬 저장소 사용량이 ${storageStats.usagePercent}%에 도달했습니다. JSON 백업 후 캐시를 정리해 보세요.`
                : '최근 7일 이상 JSON 백업 기록이 없습니다. 기기 변경에 대비해 학습 기록을 저장해 두세요.'}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenJsonBackup}
            className="min-h-[36px] px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            백업 · 저장소 열기
          </button>
        </div>
      )}

      {/* 1. Hero Today Routine Card (Calm Single-Elevation) */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="space-y-2">
            {/* Unboxed Clean Metadata Strip */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="text-slate-900 dark:text-white font-semibold hover:underline cursor-pointer"
              >
                {userProfile?.avatar || '🎓'} {userName}
              </button>
              <span>·</span>
              <span className="font-mono-tabular">Lv.{levelInfo.level} {levelInfo.title}</span>
              <span>·</span>
              <span className="font-mono-tabular text-amber-600 dark:text-amber-400 font-semibold">
                {streak}일 연속 학습
              </span>
              <span>·</span>
              <span className="font-mono-tabular">일일 목표 {dailyWordGoal}단어</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              오늘 복습할 단어{' '}
              <span className="font-mono-tabular text-indigo-600 dark:text-indigo-400">
                {srsSummary.dueCount}
              </span>
              개, 새 단어{' '}
              <span className="font-mono-tabular text-cyan-600 dark:text-cyan-400">
                {Math.min(dailyWordGoal, srsSummary.newCount)}
              </span>
              개가 준비되었습니다.
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              듣기, 4지선다 회상, 발음 체크까지 한 번에 끝내는 3분 집중 루틴으로 오늘의 학습 잔디를 채워보세요.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={onStartFocusRoutine}
              className="min-h-[48px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>오늘의 3분 루틴 시작</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSwitchToListMode}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                단어장 열기
              </button>
              <button
                type="button"
                onClick={onTriggerRandomLaunch}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>랜덤 시작</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3-Step Routine Guide Strip (Hairline Divided) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onStartFocusRoutine}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-left transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-mono-tabular text-indigo-600 dark:text-indigo-400 font-semibold">
              STEP 01
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              SRS 복습 큐 확인
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono-tabular">
              {todayQueue.length}개 우선 단어 추출됨
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenDailyQuest}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-left transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-mono-tabular text-cyan-600 dark:text-cyan-400 font-semibold">
              STEP 02
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              일일 3분 퀘스트
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              단어 · 발음 · 미니퀴즈 미션
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('stats')}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-left transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-mono-tabular text-emerald-600 dark:text-emerald-400 font-semibold">
              STEP 03
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              학습 잔디 & 불꽃 확인
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono-tabular">
              완료 암기 {srsSummary.masteredCount.toLocaleString()} / {vocabList.length.toLocaleString()}개
            </div>
          </button>
        </div>
      </section>

      {/* 2. Today's Priority Vocabulary Queue */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              오늘 먼저 볼 단어 ({todayQueue.length}개)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              복습 시점이 도래한 어휘와 미학습 핵심 단어를 우선 정렬했습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToListMode}
            className="min-h-[44px] px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>전체 보기</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {todayQueue.slice(0, 5).map((item) => {
            const mastery = item.masteryLevel ?? (item.isLearned ? 2 : 0);
            return (
              <div
                key={item.id}
                className="px-5 py-3 flex items-center justify-between gap-3 min-h-[60px]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display font-bold text-base text-slate-900 dark:text-white">
                      {item.word}
                    </span>
                    {item.ipa && (
                      <span className="text-xs font-mono-tabular text-slate-400">{item.ipa}</span>
                    )}
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                      {formatNextReviewLabel(item)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate mt-0.5">
                    {getCleanKoreanMeaning(item)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => speechService.speakOnce(item.word)}
                    aria-label={`${item.word} 발음 듣기`}
                    className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenPronunciationModal(item.word)}
                    aria-label={`${item.word} 발음 측정`}
                    className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 flex items-center justify-center cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  {onChangeMastery && (
                    <button
                      type="button"
                      onClick={() => onChangeMastery(item.id, mastery === 2 ? 0 : 2)}
                      aria-label={`${item.word} 암기 완료 전환`}
                      className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                        mastery === 2
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {mastery === 2 ? '완료' : '암기'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Progressive Disclosure: Explore All Modes & Tools */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-slate-700 dark:text-slate-300">
            학습 확장 · 도구 탐색
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={onOpenCurriculumModal}
              className="min-h-[36px] inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>3,000 커리큘럼 탐색기</span>
            </button>
            {onOpenJsonBackup && (
              <button
                type="button"
                onClick={onOpenJsonBackup}
                className="min-h-[36px] inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>백업 ({storageStats.usagePercent}%)</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {exploreItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="min-h-[84px] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500 text-left transition-colors flex flex-col justify-between gap-2 cursor-pointer"
              >
                <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
