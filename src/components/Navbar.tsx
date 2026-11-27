import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  BookOpen,
  Compass,
  BarChart3,
  Gamepad2,
  Trophy,
  MessageSquare,
  Sparkles,
  Search,
  Target,
  HardDrive,
  Moon,
  Sun,
  SlidersHorizontal,
  Download,
  History,
  Key,
  Smartphone,
  Volume2,
  Cpu,
  Flame,
  Shuffle,
  X,
  ChevronDown,
  Heart,
} from 'lucide-react';
import { ActiveTab, UserProfile } from '../types';
import {
  AI_ENGINE_LABELS,
  AiEngineMode,
  getAiEngineMode,
  getUserGeminiKey,
} from '../services/apiClient';
import { UpdateCheckResult } from '../services/githubUpdateService';
import { RealtimeAudioSpeedWidget } from './RealtimeAudioSpeedWidget';
import { StudentLevelInfo } from '../services/studentGamificationService';
import { APP_VERSION } from '../constants/version';
import {
  PetCompanionState,
  PET_UPDATED_EVENT,
  getEvolutionStatus,
  loadPetState,
} from '../services/petCompanionService';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeLoopText: string | null;
  isLooping: boolean;
  repeatCount: number;
  darkMode: boolean;
  setDarkMode: (dm: boolean) => void;
  onOpenApiKeyModal: () => void;
  onOpenPatchNotesModal?: () => void;
  onOpenGitHubUpdateModal?: () => void;
  updateData?: UpdateCheckResult | null;
  userProfile?: UserProfile | null;
  levelInfo?: StudentLevelInfo;
  onOpenProfileModal?: () => void;
  onTriggerRandomLaunch?: () => void;
  onOpenDailyQuest?: () => void;
  onOpenAddToHome?: () => void;
  homeViewMode?: 'launcher' | 'list';
  onGoToLauncher?: () => void;
  onSwitchToListMode?: () => void;
  onOpenAudioSettings?: () => void;
  onOpenNativeDllModal?: () => void;
  onOpenRecordingHistory?: () => void;
  onOpenJsonBackup?: () => void;
  onOpenPetSanctuary?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeLoopText,
  isLooping,
  repeatCount,
  darkMode,
  setDarkMode,
  onOpenApiKeyModal,
  onOpenPatchNotesModal,
  onOpenGitHubUpdateModal,
  updateData,
  userProfile,
  onOpenProfileModal,
  onTriggerRandomLaunch,
  onOpenDailyQuest,
  onOpenAddToHome,
  homeViewMode = 'launcher',
  onGoToLauncher,
  onSwitchToListMode,
  onOpenAudioSettings,
  onOpenNativeDllModal,
  onOpenRecordingHistory,
  onOpenJsonBackup,
  onOpenPetSanctuary,
}) => {
  const [hasCustomKey, setHasCustomKey] = useState<boolean>(() => Boolean(getUserGeminiKey()));
  const [engineMode, setEngineMode] = useState<AiEngineMode>(() => getAiEngineMode());
  const [isExploreMenuOpen, setIsExploreMenuOpen] = useState<boolean>(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
  const [petState, setPetState] = useState<PetCompanionState>(() => loadPetState());

  const exploreMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPet = (e: Event) => {
      const detail = (e as CustomEvent<PetCompanionState>).detail;
      setPetState(detail || loadPetState());
    };
    window.addEventListener(PET_UPDATED_EVENT, syncPet);
    return () => window.removeEventListener(PET_UPDATED_EVENT, syncPet);
  }, []);

  const petReadyToEvolve = getEvolutionStatus(petState).isReadyToEvolve;

  useEffect(() => {
    const syncKey = () => {
      setHasCustomKey(Boolean(getUserGeminiKey()));
      setEngineMode(getAiEngineMode());
    };
    window.addEventListener('wordloop_api_key_changed', syncKey);
    window.addEventListener('storage', syncKey);
    return () => {
      window.removeEventListener('wordloop_api_key_changed', syncKey);
      window.removeEventListener('storage', syncKey);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (exploreMenuRef.current && !exploreMenuRef.current.contains(target)) {
        setIsExploreMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setIsToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isTodayActive = activeTab === 'vocab' && homeViewMode === 'launcher';
  const isVocabListActive = (activeTab === 'vocab' && homeViewMode === 'list') || activeTab === 'sentences';
  const isStatsActive = activeTab === 'stats';
  const isExploreTabActive = ['quiz', 'game', 'roleplay', 'ai-gen', 'dictionary', 'goals'].includes(activeTab);

  const exploreLabel = (() => {
    switch (activeTab) {
      case 'quiz':
        return '퀴즈';
      case 'game':
        return '아케이드 게임';
      case 'roleplay':
        return 'AI 롤플레잉';
      case 'ai-gen':
        return 'AI 단어생성';
      case 'dictionary':
        return '오픈사전';
      case 'goals':
        return '목표 루틴';
      default:
        return '탐색 · 게임';
    }
  })();

  const exploreDestinations: Array<{
    id: ActiveTab;
    label: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'quiz', label: '8종 실전 퀴즈', sub: '취약 복습 · 망각곡선', icon: Trophy },
    { id: 'game', label: '16종 인지 · 아케이드 게임', sub: '메타인지 결투 · 문맥추론', icon: Gamepad2 },
    { id: 'roleplay', label: 'AI 원어민 롤플레잉', sub: '상황별 실전 회화', icon: MessageSquare },
    { id: 'ai-gen', label: 'AI 맞춤 단어 생성', sub: '주제별 단어장 빌드', icon: Sparkles },
    { id: 'dictionary', label: '글로벌 상용 사전', sub: '어원 · 파생어 검색', icon: Search },
    { id: 'goals', label: '자기계발 목표 루틴', sub: '습관 추적 & 달성률', icon: Target },
  ];

  const handleGoToday = () => {
    if (onGoToLauncher) {
      onGoToLauncher();
    } else {
      setActiveTab('vocab');
    }
  };

  const handleGoList = () => {
    if (onSwitchToListMode) {
      onSwitchToListMode();
    } else {
      setActiveTab('vocab');
    }
  };

  return (
    <>
      {/* ========================================================= */}
      {/* 3-Zone Clean Sticky Top Bar (Desktop 56px / Mobile 52px)   */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 h-13 md:h-14 flex items-center justify-between gap-2">
          {/* ZONE 1: Left Brand + Version */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleGoToday}
              className="min-h-[44px] px-1 flex items-center gap-2 text-left cursor-pointer"
              title="WordLoop 오늘 학습 허브로 이동"
            >
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-display font-extrabold text-sm flex items-center justify-center">
                W
              </span>
              <span className="font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                WordLoop
              </span>
            </button>
            {onOpenPatchNotesModal && (
              <button
                type="button"
                onClick={onOpenPatchNotesModal}
                className="hidden sm:inline-flex items-center px-1.5 py-1 text-xs font-mono-tabular text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                title="패치노트 & 버전 기록 보기"
              >
                v{APP_VERSION}
              </button>
            )}
          </div>

          {/* ZONE 2: Center 4 Primary Destinations (Desktop/Tablet) */}
          <nav className="hidden md:flex items-center gap-1" aria-label="주 내비게이션">
            <button
              type="button"
              onClick={handleGoToday}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                isTodayActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>오늘 학습</span>
            </button>

            <button
              type="button"
              onClick={handleGoList}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                isVocabListActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>단어장</span>
            </button>

            {/* Explore Popover */}
            <div className="relative" ref={exploreMenuRef}>
              <button
                type="button"
                onClick={() => setIsExploreMenuOpen((prev) => !prev)}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isExploreTabActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{exploreLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExploreMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExploreMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-1.5 z-50">
                  {exploreDestinations.map((dest) => {
                    const Icon = dest.icon;
                    const active = activeTab === dest.id;
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(dest.id);
                          setIsExploreMenuOpen(false);
                        }}
                        className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                          active
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{dest.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{dest.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                isStatsActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>학습 통계</span>
            </button>
          </nav>

          {/* ZONE 3: Right Compact Utilities */}
          <div className="flex items-center gap-1 shrink-0">
            {activeLoopText && (
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs font-mono-tabular text-emerald-600 dark:text-emerald-400 mr-1">
                <span>{isLooping ? '▶' : '⏸'}</span>
                <span className="max-w-[90px] truncate">{activeLoopText}</span>
                <span>· {repeatCount}회</span>
              </span>
            )}

            <div className="hidden sm:block">
              <RealtimeAudioSpeedWidget onOpenFullSettings={onOpenAudioSettings} />
            </div>

            {onOpenPetSanctuary && (
              <button
                type="button"
                onClick={onOpenPetSanctuary}
                aria-label={`${petState.name} 키우기 방 열기`}
                title={`${petState.name} (Stage ${petState.stage}) · 키우기 방`}
                className="relative min-h-[40px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Heart className={`w-3.5 h-3.5 ${petReadyToEvolve ? 'text-amber-500' : 'text-rose-500'}`} />
                <span className="hidden sm:inline max-w-[68px] truncate">{petState.name}</span>
                {petReadyToEvolve && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5" />
                )}
              </button>
            )}

            {onOpenJsonBackup && (
              <button
                type="button"
                onClick={onOpenJsonBackup}
                aria-label="로컬 저장소 및 JSON 백업 관리"
                title="로컬 저장소 & JSON 백업"
                className="min-w-[40px] min-h-[40px] md:min-w-[40px] rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              title={darkMode ? '라이트 모드' : '다크 모드'}
              className="min-w-[40px] min-h-[40px] rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {onOpenProfileModal && (
              <button
                type="button"
                onClick={onOpenProfileModal}
                aria-label="내 프로필 열기"
                title={userProfile ? `${userProfile.name}님 프로필` : '내 프로필'}
                className="min-w-[40px] min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                <span>{userProfile?.avatar || '👤'}</span>
              </button>
            )}

            {/* Desktop Consolidated Settings Popover */}
            <div className="relative hidden md:block" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => setIsToolsMenuOpen((prev) => !prev)}
                aria-label="유틸리티 및 시스템 도구"
                title="유틸리티 & 설정"
                className="min-w-[40px] min-h-[40px] rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center relative cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {updateData?.isUpdateAvailable && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2" />
                )}
              </button>

              {isToolsMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-1.5 z-50 space-y-0.5">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400">학습 루틴 & 오디오</div>
                  {onOpenPetSanctuary && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenPetSanctuary();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Heart className="w-4 h-4 text-rose-500" />
                        <span>{petState.name} 키우기 방</span>
                      </span>
                      <span className="text-[11px] font-mono-tabular text-indigo-600 dark:text-indigo-400">
                        Lv.{petState.stage}
                      </span>
                    </button>
                  )}
                  {onOpenDailyQuest && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDailyQuest();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Flame className="w-4 h-4 text-amber-500" />
                      <span>매일 3분 퀘스트</span>
                    </button>
                  )}
                  {onTriggerRandomLaunch && (
                    <button
                      type="button"
                      onClick={() => {
                        onTriggerRandomLaunch();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Shuffle className="w-4 h-4 text-indigo-500" />
                      <span>랜덤 모드 1-Click</span>
                    </button>
                  )}
                  {onOpenAudioSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAudioSettings();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4 text-cyan-600" />
                      <span>음성 속도 · 발음 설정</span>
                    </button>
                  )}
                  {onOpenRecordingHistory && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenRecordingHistory();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <History className="w-4 h-4 text-slate-500" />
                      <span>발음 녹음 보관함</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">시스템 · 백업</div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenApiKeyModal();
                      setIsToolsMenuOpen(false);
                    }}
                    className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Key className="w-4 h-4 text-emerald-500" />
                      <span>무료 AI 엔진 · API 키</span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {hasCustomKey && engineMode === 'gemini_byok'
                        ? 'Gemini 키'
                        : AI_ENGINE_LABELS[engineMode].badge}
                    </span>
                  </button>
                  {onOpenGitHubUpdateModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenGitHubUpdateModal();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Download className="w-4 h-4 text-indigo-500" />
                        <span>업데이트 & APK 설치</span>
                      </span>
                      <span className="text-[11px] font-mono-tabular text-indigo-500">
                        {updateData?.isUpdateAvailable ? `v${updateData.latestVersion}` : `v${APP_VERSION}`}
                      </span>
                    </button>
                  )}
                  {onOpenPatchNotesModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenPatchNotesModal();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <History className="w-4 h-4 text-emerald-500" />
                      <span>패치노트 v{APP_VERSION}</span>
                    </button>
                  )}
                  {onOpenAddToHome && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAddToHome();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 text-slate-500" />
                      <span>홈 화면 추가 (PWA)</span>
                    </button>
                  )}
                  {onOpenNativeDllModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenNativeDllModal();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Cpu className="w-4 h-4 text-slate-500" />
                      <span>네이티브 DLL 기술 명세</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* Mobile Fixed Bottom 4-Tab Bar (Thumb Zone, 56px, <=15% cap)*/}
      {/* ========================================================= */}
      <nav
        aria-label="모바일 하단 내비게이션"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 pb-[env(safe-area-inset-bottom,0px)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 items-center"
      >
        <button
          type="button"
          onClick={() => {
            setIsMobileSheetOpen(false);
            handleGoToday();
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            isTodayActive && !isMobileSheetOpen
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10.5px] leading-none">오늘</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsMobileSheetOpen(false);
            handleGoList();
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            isVocabListActive && !isMobileSheetOpen
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10.5px] leading-none">단어장</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileSheetOpen((prev) => !prev)}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            isMobileSheetOpen || isExploreTabActive
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10.5px] leading-none">탐색</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsMobileSheetOpen(false);
            setActiveTab('stats');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            isStatsActive && !isMobileSheetOpen
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10.5px] leading-none">통계</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* Mobile Progressive Disclosure Bottom Sheet                */}
      {/* ========================================================= */}
      {isMobileSheetOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileSheetOpen(false);
          }}
        >
          <div className="w-full rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 max-h-[82dvh] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom,12px)]">
            <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto my-3 shrink-0" />
            <div className="px-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <span className="font-display text-base font-bold text-slate-900 dark:text-white">
                전체 학습 · 도구 탐색
              </span>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                aria-label="닫기"
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-5">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-2">학습 모드</div>
                <div className="grid grid-cols-2 gap-2">
                  {exploreDestinations.map((dest) => {
                    const Icon = dest.icon;
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(dest.id);
                          setIsMobileSheetOpen(false);
                        }}
                        className="min-h-[56px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 text-left flex items-center gap-2.5 cursor-pointer"
                      >
                        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{dest.label}</div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">{dest.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-2">루틴 · 백업 · 시스템</div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {onOpenPetSanctuary && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSheetOpen(false);
                        onOpenPetSanctuary();
                      }}
                      className="w-full min-h-[48px] px-4 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                    >
                      <span className="flex items-center gap-2.5">
                        <Heart className="w-4 h-4 text-rose-500" />
                        <span>{petState.name} 키우기 방</span>
                      </span>
                      <span className="font-mono-tabular text-[11px] text-indigo-600 dark:text-indigo-400">
                        Stage {petState.stage} · {petState.coins}코인
                      </span>
                    </button>
                  )}
                  {onOpenJsonBackup && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSheetOpen(false);
                        onOpenJsonBackup();
                      }}
                      className="w-full min-h-[48px] px-4 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                    >
                      <span className="flex items-center gap-2.5">
                        <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>로컬 저장소 & JSON 백업</span>
                      </span>
                    </button>
                  )}
                  {onOpenDailyQuest && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSheetOpen(false);
                        onOpenDailyQuest();
                      }}
                      className="w-full min-h-[48px] px-4 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                    >
                      <span className="flex items-center gap-2.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span>일일 3분 퀘스트</span>
                      </span>
                    </button>
                  )}
                  {onOpenAudioSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSheetOpen(false);
                        onOpenAudioSettings();
                      }}
                      className="w-full min-h-[48px] px-4 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                    >
                      <span className="flex items-center gap-2.5">
                        <Volume2 className="w-4 h-4 text-cyan-600" />
                        <span>음성 속도 · 발음 설정</span>
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileSheetOpen(false);
                      onOpenApiKeyModal();
                    }}
                    className="w-full min-h-[48px] px-4 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                  >
                    <span className="flex items-center gap-2.5">
                      <Key className="w-4 h-4 text-emerald-500" />
                      <span>무료 AI 엔진 · API 키</span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {hasCustomKey && engineMode === 'gemini_byok'
                        ? 'Gemini 키'
                        : AI_ENGINE_LABELS[engineMode].badge}
                    </span>
                  </button>
                  {onOpenGitHubUpdateModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSheetOpen(false);
                        onOpenGitHubUpdateModal();
                      }}
                      className="w-full min-h-[48px] px-4 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                    >
                      <span className="flex items-center gap-2.5">
                        <Download className="w-4 h-4 text-indigo-500" />
                        <span>업데이트 & APK 설치</span>
                      </span>
                      <span className="font-mono-tabular text-[11px] text-slate-400">v{APP_VERSION}</span>
                    </button>
                  )}
                  {onOpenPatchNotesModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSheetOpen(false);
                        onOpenPatchNotesModal();
                      }}
                      className="w-full min-h-[48px] px-4 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                    >
                      <span className="flex items-center gap-2.5">
                        <History className="w-4 h-4 text-emerald-500" />
                        <span>패치노트 보기</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
