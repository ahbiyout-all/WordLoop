import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  MessageSquare,
  Gamepad2,
  Trophy,
  BarChart3,
  Search,
  Mic,
  Shuffle,
  Target,
  Flame,
  CheckCircle2,
  ArrowRight,
  LayoutGrid,
  List,
  Volume2,
  Calendar,
  Zap,
  Clock,
  Compass,
  ChevronRight,
} from 'lucide-react';
import { ActiveTab, UserProfile, VocabItem, SentenceItem, Goal } from '../types';
import { speechService } from '../services/speechService';
import { getUserGeminiKey } from '../services/apiClient';

interface MainLauncherDashboardProps {
  userProfile: UserProfile | null;
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  totalRepeatsCount: number;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenPronunciationModal: (text: string) => void;
  onOpenDailyQuest: () => void;
  onTriggerRandomLaunch: () => void;
  onOpenCurriculumModal: () => void;
  onSwitchToListMode: () => void;
  onOpenProfileModal?: () => void;
}

export const MainLauncherDashboard: React.FC<MainLauncherDashboardProps> = ({
  userProfile,
  vocabList,
  sentenceList,
  goals,
  totalRepeatsCount,
  onNavigateTab,
  onOpenPronunciationModal,
  onOpenDailyQuest,
  onTriggerRandomLaunch,
  onOpenCurriculumModal,
  onSwitchToListMode,
  onOpenProfileModal,
}) => {
  // Mastery stats calculation
  const masteredWords = vocabList.filter((v) => (v.masteryLevel || 0) >= 3).length;
  const bookmarkedWords = vocabList.filter((v) => v.isBookmarked).length;
  const completedGoals = goals.filter((g) => g.isCompleted).length;

  // Streak & Greeting
  const streak = userProfile?.streakDays || 1;
  const userName = userProfile?.name || '학습자';

  // Sample word of the day / quick test item
  const [featuredItem, setFeaturedItem] = useState<VocabItem | null>(null);
  const [hasUserApiKey, setHasUserApiKey] = useState<boolean>(() => Boolean(getUserGeminiKey().trim()));

  useEffect(() => {
    const syncKey = () => setHasUserApiKey(Boolean(getUserGeminiKey().trim()));
    window.addEventListener('wordloop_api_key_changed', syncKey);
    window.addEventListener('storage', syncKey);
    return () => {
      window.removeEventListener('wordloop_api_key_changed', syncKey);
      window.removeEventListener('storage', syncKey);
    };
  }, []);

  // Real-time Viewport Resolution Sensor for Dynamic Spacing Calibration
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 390,
    height: typeof window !== 'undefined' ? window.innerHeight : 844,
  });

  useEffect(() => {
    const updateViewport = () => {
      const w = window.visualViewport ? Math.round(window.visualViewport.width) : window.innerWidth;
      const h = window.visualViewport ? Math.round(window.visualViewport.height) : window.innerHeight;
      setViewportSize({ width: w, height: h });
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
    };
  }, []);

  // Compact vertical screen check (e.g., iPhone SE, landscape, or small Android < 740px height)
  const isCompactHeight = viewportSize.height < 740;

  useEffect(() => {
    if (vocabList.length > 0) {
      const randomIdx = Math.floor(Math.random() * vocabList.length);
      setFeaturedItem(vocabList[randomIdx]);
    }
  }, [vocabList]);

  const cards = [
    {
      id: 'roleplay',
      title: 'AI 원어민 롤플레잉',
      subtitle: '카페·공항·면접 등 실전 상황 음성 대화 & 실시간 첨삭',
      badge: hasUserApiKey ? '🔑 API 키 확인됨' : '🔑 API 키 필요',
      badgeColor: hasUserApiKey
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: '🗣️',
      gradient: 'from-emerald-900/60 via-teal-950/40 to-slate-900/90 border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20',
      glow: 'from-emerald-500/10 to-teal-500/10',
      actionText: '실전 롤플레잉 시작',
      onClick: () => onNavigateTab('roleplay'),
      stat: hasUserApiKey ? '실시간 Gemini AI 활성' : '사용자 API 키 확인 후 시작',
    },
    {
      id: 'vocab',
      title: '3,000 보카 루프',
      subtitle: '원어민 vs 내 발음 실시간 파형 비교 & 무한 반복 청취',
      badge: `${vocabList.length.toLocaleString()}개 단어 DB`,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: '📚',
      gradient: 'from-blue-900/60 via-indigo-950/40 to-slate-900/90 border-blue-500/40 hover:border-blue-400 hover:shadow-blue-500/20',
      glow: 'from-blue-500/10 to-indigo-500/10',
      actionText: '단어장 학습 & 파형 진단',
      onClick: () => onSwitchToListMode(),
      stat: `마스터 ${masteredWords}개 / 북마크 ${bookmarkedWords}개`,
    },
    {
      id: 'sentences',
      title: '센텐스 마스터 (문장장)',
      subtitle: '500+ 실전 패턴 회화 문장 & 통문장 스피킹 훈련',
      badge: `${sentenceList.length.toLocaleString()}개 실전 문장`,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: '💬',
      gradient: 'from-amber-900/60 via-orange-950/40 to-slate-900/90 border-amber-500/40 hover:border-amber-400 hover:shadow-amber-500/20',
      glow: 'from-amber-500/10 to-orange-500/10',
      actionText: '패턴 문장 학습하기',
      onClick: () => onNavigateTab('sentences'),
      stat: '기초·비즈니스·여행 패턴',
    },
    {
      id: 'game',
      title: '13종 아케이드 게임존',
      subtitle: '버블팝, 크로스워드, 리듬 단어, 스와이프 매치 등',
      badge: '13가지 챌린지',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: '🎮',
      gradient: 'from-purple-900/60 via-fuchsia-950/40 to-slate-900/90 border-purple-500/40 hover:border-purple-400 hover:shadow-purple-500/20',
      glow: 'from-purple-500/10 to-fuchsia-500/10',
      actionText: '게임 플레이하기',
      onClick: () => onNavigateTab('game'),
      stat: '두뇌 자극 어휘 게이미피케이션',
    },
    {
      id: 'ai-gen',
      title: 'AI 맞춤 생성기',
      subtitle: 'Gemini AI 기반 주제별·난이도별 단어장 & 예문 생성',
      badge: 'Gemini 3.7 AI',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: '🧠',
      gradient: 'from-rose-900/60 via-pink-950/40 to-slate-900/90 border-rose-500/40 hover:border-rose-400 hover:shadow-rose-500/20',
      glow: 'from-rose-500/10 to-pink-500/10',
      actionText: 'AI 단어장 생성',
      onClick: () => onNavigateTab('ai-gen'),
      stat: '오프라인 0초 고속 백업 지원',
    },
    {
      id: 'quiz',
      title: '실전 3-Way & 취약 복습 퀴즈',
      subtitle: '취약(0~1단계) 집중 복습 퀴즈 및 한→영, 영→한 실전 4지선다',
      badge: '🎯 취약 복습 퀴즈 탑재',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: '🎯',
      gradient: 'from-cyan-900/60 via-teal-950/40 to-slate-900/90 border-cyan-500/40 hover:border-cyan-400 hover:shadow-cyan-500/20',
      glow: 'from-cyan-500/10 to-teal-500/10',
      actionText: '퀴즈 도전하기',
      onClick: () => onNavigateTab('quiz'),
      stat: '0~1단계 취약 어휘 실시간 승급 훈련',
    },
    {
      id: 'dictionary',
      title: '글로벌 상용 사전',
      subtitle: '어원, 파생어, 유의어/반의어 및 상용 포털 즉시 검색',
      badge: '어휘 심화 탐색',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      icon: '🔍',
      gradient: 'from-teal-900/60 via-emerald-950/40 to-slate-900/90 border-teal-500/40 hover:border-teal-400 hover:shadow-teal-500/20',
      glow: 'from-teal-500/10 to-emerald-500/10',
      actionText: '사전 검색하기',
      onClick: () => onNavigateTab('dictionary'),
      stat: '예문 & 발음 듣기 지원',
    },
    {
      id: 'stats',
      title: '학습 통계 & 스트릭',
      subtitle: '누적 반복 횟수, 연속 출석 불꽃, 주간 성장 곡선 분석',
      badge: '성취 리포트',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
      icon: '📊',
      gradient: 'from-yellow-900/60 via-amber-950/40 to-slate-900/90 border-yellow-500/40 hover:border-yellow-400 hover:shadow-yellow-500/20',
      glow: 'from-yellow-500/10 to-amber-500/10',
      actionText: '대시보드 확인',
      onClick: () => onNavigateTab('stats'),
      stat: `누적 청취 ${totalRepeatsCount.toLocaleString()}회 달성`,
    },
  ];

  return (
    <div className="fluid-launcher-shell max-w-6xl mx-auto animate-in fade-in">
      {/* Top Hero Welcome Banner (Fluid Padding) */}
      <div
        className={`rounded-3xl ${
          isCompactHeight ? 'p-3.5 sm:p-5' : 'p-4 sm:p-6 lg:p-7'
        } bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white border border-emerald-500/30 shadow-2xl relative overflow-hidden shrink-0`}
      >
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-5">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {onOpenProfileModal && (
                <button
                  onClick={onOpenProfileModal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] sm:text-xs font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm"
                  title="클릭하여 내 프로필 및 데이터 백업 관리 열기"
                >
                  <span>{userProfile ? userProfile.avatar : '👤'}</span>
                  <span className="max-w-[140px] truncate">{userName}</span>
                  <span className="text-[10px] text-emerald-300 font-bold">· 프로필</span>
                </button>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] sm:text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
                <span>{streak}일 연속 학습 중</span>
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-full bg-white/10 text-slate-300 border border-white/15 text-[10px] font-mono"
                title="모바일/태블릿/PC 화면 해상도에 맞춰 상하좌우 간격이 실시간 자동 보정됩니다"
              >
                <span>📐 자동 간격 {viewportSize.width}×{viewportSize.height}</span>
              </span>
            </div>

            <h1
              onClick={onOpenProfileModal}
              className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white cursor-pointer group inline-flex items-center gap-1.5"
              title="클릭하여 프로필 관리 열기"
            >
              <span>안녕하세요,</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 group-hover:underline">
                {userName}
              </span>
              <span>님! 🚀</span>
            </h1>
            {!isCompactHeight && (
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed hidden sm:block">
                화면 해상도에 맞춰 상하좌우 여백과 카드 크기가 자동 조절됩니다. 원하시는 학습 모드를 터치하세요.
              </p>
            )}
          </div>

          {/* Quick Launch Action Pills */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenDailyQuest}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0" />
              <span>일일 3분 퀘스트</span>
            </button>

            <button
              onClick={onTriggerRandomLaunch}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
            >
              <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>랜덤 학습 1-Click</span>
            </button>
          </div>
        </div>

        {/* Featured Word of the Day Bar */}
        {featuredItem && (
          <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-emerald-300 font-black text-[10px] uppercase shrink-0">
                추천 단어
              </span>
              <div className="flex items-baseline gap-1.5 truncate">
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                  {featuredItem.word}
                </span>
                <span className="text-slate-400 font-mono text-[10px] hidden sm:inline">{featuredItem.ipa}</span>
                <span className="text-emerald-300 font-medium truncate">"{featuredItem.meaning}"</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                onClick={() => speechService.speakOnce(featuredItem.word)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-[11px]"
                title="발음 듣기"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">듣기</span>
              </button>
              <button
                onClick={() => onOpenPronunciationModal(featuredItem.word)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors flex items-center gap-1 text-[11px] font-bold"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>파형 진단</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Switch Mode Bar: Launcher Grid vs List View */}
      <div className="flex items-center justify-between px-3 py-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
            <LayoutGrid className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>스마트 런처 뷰</span>
          </span>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            (해상도 비례 상하좌우 자동 여백 맞춤 활성화됨)
          </span>
        </div>

        <button
          onClick={onSwitchToListMode}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all border border-slate-200 dark:border-slate-700 active:scale-95 shrink-0"
          title="기존 3,000 보카 리스트 뷰로 전환"
        >
          <List className="w-3.5 h-3.5 text-emerald-500" />
          <span>단어장 목록 뷰</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* 8 Large Hero Launcher Grid Cards (Mobile 2x4 / Desktop 4x2 Auto-Fit Fluid Grid) */}
      <div className="fluid-launcher-grid grid-cols-2 lg:grid-cols-4 auto-rows-fr">
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={card.onClick}
            className={`fluid-launcher-card group relative rounded-2xl sm:rounded-3xl bg-gradient-to-br ${card.gradient} text-white border shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden active:scale-[0.98]`}
          >
            {/* Ambient Background Glow Effect */}
            <div
              className={`absolute -right-8 -bottom-8 w-28 sm:w-36 h-28 sm:h-36 bg-gradient-to-br ${card.glow} rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none`}
            />

            <div className="space-y-2 sm:space-y-3 relative z-10">
              {/* Card Header: Big Icon & Badge */}
              <div className="flex items-start justify-between gap-1.5">
                <div
                  style={{ width: 'var(--fluid-icon-box)', height: 'var(--fluid-icon-box)' }}
                  className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-2xl sm:text-3xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shrink-0"
                >
                  {card.icon}
                </div>

                <span
                  className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border truncate max-w-[65%] ${card.badgeColor}`}
                >
                  {card.badge}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h3 className="text-sm sm:text-base lg:text-lg font-black text-white group-hover:text-emerald-300 transition-colors leading-snug line-clamp-1">
                  {card.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {card.subtitle}
                </p>
              </div>
            </div>

            {/* Bottom Stat & Action Arrow */}
            <div className="pt-2.5 mt-2.5 sm:pt-3.5 sm:mt-3.5 border-t border-white/10 flex items-center justify-between relative z-10 text-xs gap-1">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 truncate hidden sm:inline max-w-[130px]">
                {card.stat}
              </span>

              <div className="flex items-center gap-1 font-bold text-emerald-400 group-hover:translate-x-1 transition-transform ml-auto">
                <span className="text-[11px] sm:text-xs truncate">{card.actionText}</span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Floating Quick Utilities Strip */}
      <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg sm:text-xl shrink-0">
            🧭
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              3,000 DB 커리큘럼 탐색기
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              초급, 수능, 토익, 토플, 비즈니스 등 8대 테마 전체 탐색
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCurriculumModal}
          className="px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-black text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0 w-full sm:w-auto justify-center"
        >
          <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>커리큘럼 탐색기 열기</span>
        </button>
      </div>
    </div>
  );
};
