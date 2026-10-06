import React, { useState, useRef, useEffect } from 'react';
import {
  Target,
  BookOpen,
  Sparkles,
  Trophy,
  BarChart3,
  RotateCcw,
  Volume2,
  Moon,
  Sun,
  Search,
  Key,
  Gamepad2,
  History,
  User,
  Flame,
  Smartphone,
  MessageSquare,
  LayoutGrid,
  Download,
  ChevronDown,
  Menu,
  X,
  SlidersHorizontal,
  ExternalLink,
  CheckCircle2,
  Settings,
  Cpu,
} from 'lucide-react';
import { ActiveTab, UserProfile } from '../types';
import { getUserGeminiKey } from '../services/apiClient';
import { UpdateCheckResult } from '../services/githubUpdateService';
import { RealtimeAudioSpeedWidget } from './RealtimeAudioSpeedWidget';

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
  onOpenProfileModal?: () => void;
  onTriggerRandomLaunch?: () => void;
  onOpenDailyQuest?: () => void;
  onOpenAddToHome?: () => void;
  homeViewMode?: 'launcher' | 'list';
  onGoToLauncher?: () => void;
  onSwitchToListMode?: () => void;
  onOpenAudioSettings?: () => void;
  onOpenNativeDllModal?: () => void;
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
}) => {
  const [hasCustomKey, setHasCustomKey] = useState<boolean>(() => Boolean(getUserGeminiKey()));
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Sync API Key state
  useEffect(() => {
    const syncKey = () => setHasCustomKey(Boolean(getUserGeminiKey()));
    window.addEventListener('wordloop_api_key_changed', syncKey);
    window.addEventListener('storage', syncKey);
    return () => {
      window.removeEventListener('wordloop_api_key_changed', syncKey);
      window.removeEventListener('storage', syncKey);
    };
  }, []);

  // Handle outside click to close popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setIsToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if current tab is one of the secondary "More" tabs
  const isMoreTabActive = ['dictionary', 'goals', 'ai-gen', 'stats'].includes(activeTab);

  // Get display name for active tab in "More"
  const getMoreActiveLabel = () => {
    switch (activeTab) {
      case 'dictionary':
        return '오픈사전';
      case 'goals':
        return '자기계발';
      case 'ai-gen':
        return 'AI 맞춤';
      case 'stats':
        return '학습통계';
      default:
        return '더보기';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-13 sm:h-14 md:h-15 flex items-center justify-between gap-1.5 sm:gap-2">
        
        {/* ========================================================= */}
        {/* 1. Left Brand / Logo Button */}
        {/* ========================================================= */}
        <button
          type="button"
          className="h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-slate-950 font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          onClick={() => {
            if (onGoToLauncher) {
              onGoToLauncher();
            } else {
              setActiveTab('vocab');
            }
          }}
          title="WordLoop 홈(대형 런처)으로 이동"
        >
          <span className="text-sm leading-none">🔤</span>
          <span className="text-xs sm:text-sm font-black tracking-tighter leading-none text-white drop-shadow-xs">
            WordLoop
          </span>
        </button>

        {/* ========================================================= */}
        {/* 2. Center Nav: Core Quick Chips + "More" Dropdown (Desktop/Tablet) */}
        {/* ========================================================= */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shrink-0">
          
          {/* Chip 1: Home (Launcher) */}
          <button
            onClick={() => {
              if (onGoToLauncher) {
                onGoToLauncher();
              } else {
                setActiveTab('vocab');
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'vocab' && homeViewMode === 'launcher'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="WordLoop 대형 아이콘 런처 홈"
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>홈</span>
          </button>

          {/* Chip 2: Vocab List */}
          <button
            onClick={() => {
              if (onSwitchToListMode) {
                onSwitchToListMode();
              } else {
                setActiveTab('vocab');
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              (activeTab === 'vocab' && homeViewMode === 'list') || activeTab === 'sentences'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="3,200+ 단어·문장 학습 목록"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>단어장</span>
          </button>

          {/* Chip 3: Quiz */}
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="8종 스마트 퀴즈 & 취약 어휘 맞춤 복습"
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span>퀴즈</span>
          </button>

          {/* Chip 4: Games */}
          <button
            onClick={() => setActiveTab('game')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'game'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="14종 단어·문장 게이미피케이션"
          >
            <Gamepad2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
            <span>게임</span>
          </button>

          {/* Chip 5: AI Roleplay */}
          <button
            onClick={() => setActiveTab('roleplay')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'roleplay'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 font-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="교육과정 연계 원어민 AI 대화형 롤플레잉"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-purple-500" />
            <span>AI 롤플레잉</span>
          </button>

          {/* "More" Dropdown Popover */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                isMoreTabActive
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-black shadow-sm border border-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
              title="오픈사전, AI맞춤, 자기계발, 학습통계 더보기 메뉴"
            >
              <span>{isMoreTabActive ? getMoreActiveLabel() : '더보기'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                  부가 학습 & 분석 도구
                </div>

                {/* 1. Open Dictionary */}
                <button
                  onClick={() => {
                    setActiveTab('dictionary');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    activeTab === 'dictionary'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-emerald-500" />
                    <span>오픈사전 검색</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">1·2·5</span>
                </button>

                {/* 2. AI Generator */}
                <button
                  onClick={() => {
                    setActiveTab('ai-gen');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    activeTab === 'ai-gen'
                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>AI 맞춤단어 생성</span>
                  </div>
                  <span className="text-[10px] text-purple-500 font-semibold">Gemini</span>
                </button>

                {/* 3. Goals */}
                <button
                  onClick={() => {
                    setActiveTab('goals');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    activeTab === 'goals'
                      ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-teal-500" />
                    <span>자기계발 목표 관리</span>
                  </div>
                  <span className="text-[10px] text-teal-500 font-semibold">루틴</span>
                </button>

                {/* 4. Stats */}
                <button
                  onClick={() => {
                    setActiveTab('stats');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    activeTab === 'stats'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span>학습 통계 & 발음 차트</span>
                  </div>
                  <span className="text-[10px] text-blue-500 font-semibold">리포트</span>
                </button>
              </div>
            )}
          </div>

        </nav>

        {/* ========================================================= */}
        {/* 3. Right Toolbar (Essential Quick Controls + Consolidated Tools Popover) */}
        {/* ========================================================= */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          
          {/* Active Loop Status Pill (Large screen only) */}
          {activeLoopText && (
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-pulse">
              <RotateCcw className="w-3 h-3 animate-spin" style={{ animationDuration: isLooping ? '3s' : '0s' }} />
              <span className="truncate max-w-[90px]">{activeLoopText}</span>
              <span className="text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded-full font-extrabold">
                {repeatCount}회
              </span>
            </div>
          )}

          {/* 1. Real-time Audio Speed Control Widget */}
          <RealtimeAudioSpeedWidget onOpenFullSettings={onOpenAudioSettings} />

          {/* 2. User Profile Button */}
          {onOpenProfileModal && (
            <button
              onClick={onOpenProfileModal}
              className={`w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl border text-xs font-bold flex items-center justify-center transition-all active:scale-95 shrink-0 relative cursor-pointer ${
                userProfile
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-xs'
                  : 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-md shadow-emerald-500/20'
              }`}
              title={userProfile ? `${userProfile.name}님 프로필 & 저장소` : '내 프로필 & 저장소 관리'}
            >
              <span className="text-sm leading-none">{userProfile ? userProfile.avatar : '👤'}</span>
              {userProfile && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900 absolute -top-0.5 -right-0.5" />
              )}
            </button>
          )}

          {/* 3. High-Priority Update Pulse Badge (Shown prominently only when update is ready) */}
          {onOpenGitHubUpdateModal && updateData?.isUpdateAvailable && (
            <button
              onClick={onOpenGitHubUpdateModal}
              className="h-8 md:h-8.5 px-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-indigo-600 to-purple-600 hover:from-rose-600 hover:to-indigo-700 text-white font-black text-[11px] flex items-center gap-1 shadow-md shadow-rose-500/25 animate-pulse shrink-0 active:scale-95 transition-all cursor-pointer"
              title={`새 버전 v${updateData.latestVersion} 배포됨! 클릭하여 업데이트`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">v{updateData.latestVersion}</span>
              <span className="sm:hidden">업데이트</span>
            </button>
          )}

          {/* 4. Consolidated Tools Popover Menu (⚙️ 도구 모음 드롭다운) */}
          <div className="relative" ref={toolsMenuRef}>
            <button
              onClick={() => setIsToolsMenuOpen((prev) => !prev)}
              className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center transition-colors shrink-0 relative cursor-pointer"
              title="추가 유틸리티 및 설정 도구 모음"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-600 dark:text-slate-400" />
              {(hasCustomKey || updateData?.isUpdateAvailable) && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 absolute top-1 right-1" />
              )}
            </button>

            {isToolsMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                  <span>유틸리티 도구 & 설정</span>
                  <Settings className="w-3 h-3 text-slate-400" />
                </div>

                {/* 1. Daily 3-Minute Quest */}
                {onOpenDailyQuest && (
                  <button
                    onClick={() => {
                      onOpenDailyQuest();
                      setIsToolsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span>매일 3분 퀘스트</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold">
                      루틴
                    </span>
                  </button>
                )}

                {/* 2. Random Mode Launch */}
                {onTriggerRandomLaunch && (
                  <button
                    onClick={() => {
                      onTriggerRandomLaunch();
                      setIsToolsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🎲</span>
                      <span>랜덤 모드 즉시 추첨</span>
                    </div>
                    <span className="text-[10px] text-slate-400">랜덤</span>
                  </button>
                )}

                {/* 3. BYOK Gemini API Key */}
                <button
                  onClick={() => {
                    onOpenApiKeyModal();
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Key className={`w-4 h-4 ${hasCustomKey ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span>개인 Gemini API Key</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    hasCustomKey
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {hasCustomKey ? '설정됨' : '기본'}
                  </span>
                </button>

                {/* 4. GitHub Releases & Update Center */}
                {onOpenGitHubUpdateModal && (
                  <button
                    onClick={() => {
                      onOpenGitHubUpdateModal();
                      setIsToolsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-indigo-500" />
                      <span>업데이트 & 설치파일</span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-500 font-bold">
                      {updateData?.latestVersion ? `v${updateData.latestVersion}` : 'Releases'}
                    </span>
                  </button>
                )}

                {/* 5. Patch Notes Modal */}
                {onOpenPatchNotesModal && (
                  <button
                    onClick={() => {
                      onOpenPatchNotesModal();
                      setIsToolsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-500" />
                      <span>패치노트 & 버전 기록</span>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-semibold">Docs</span>
                  </button>
                )}

                {/* 6. Pure Proprietary Native DLL Docs Modal */}
                {onOpenNativeDllModal && (
                  <button
                    onClick={() => {
                      onOpenNativeDllModal();
                      setIsToolsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-500" />
                      <span>순수 창작 DLL 기술 명세서</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                      x64
                    </span>
                  </button>
                )}

                {/* 6. Add to Home Screen (PWA Guide) */}
                {onOpenAddToHome && (
                  <button
                    onClick={() => {
                      onOpenAddToHome();
                      setIsToolsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-teal-500" />
                      <span>홈 화면에 추가 (PWA)</span>
                    </div>
                    <span className="text-[10px] text-teal-500 font-semibold">설치</span>
                  </button>
                )}

                {/* 7. Full Audio Settings */}
                {onOpenAudioSettings && (
                  <button
                    onClick={() => {
                      onOpenAudioSettings();
                      setIsToolsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-blue-500" />
                      <span>발음 및 오디오 상세 설정</span>
                    </div>
                    <span className="text-[10px] text-slate-400">옵션</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 5. Dark Mode Toggle Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title={darkMode ? "라이트 모드로 변경" : "다크 모드로 변경"}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          </button>

        </div>

      </div>

      {/* ========================================================= */}
      {/* 4. Mobile Navigation Bar (Clean 4-Chip + "All Menu" Pull-down) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-5 md:hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm px-1 py-1 gap-1 items-center text-[10.5px] font-bold">
        
        {/* Mobile Chip 1: Home */}
        <button
          onClick={() => {
            if (onGoToLauncher) {
              onGoToLauncher();
            } else {
              setActiveTab('vocab');
            }
          }}
          className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 min-w-0 cursor-pointer ${
            activeTab === 'vocab' && homeViewMode === 'launcher'
              ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-xs font-black'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="WordLoop 홈"
        >
          <LayoutGrid className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">홈</span>
        </button>

        {/* Mobile Chip 2: Vocab List */}
        <button
          onClick={() => {
            if (onSwitchToListMode) {
              onSwitchToListMode();
            } else {
              setActiveTab('vocab');
            }
          }}
          className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 min-w-0 cursor-pointer ${
            (activeTab === 'vocab' && homeViewMode === 'list') || activeTab === 'sentences'
              ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-xs font-black'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="단어장 학습 목록"
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">단어장</span>
        </button>

        {/* Mobile Chip 3: Quiz */}
        <button
          onClick={() => setActiveTab('quiz')}
          className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 min-w-0 cursor-pointer ${
            activeTab === 'quiz'
              ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-xs font-black'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="퀴즈 복습"
        >
          <Trophy className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">퀴즈</span>
        </button>

        {/* Mobile Chip 4: Games */}
        <button
          onClick={() => setActiveTab('game')}
          className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 min-w-0 cursor-pointer ${
            activeTab === 'game'
              ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 shadow-xs font-black'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="14종 단어·문장 게임"
        >
          <Gamepad2 className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">게임</span>
        </button>

        {/* Mobile Chip 5: "All Menu" Pull-down Toggle */}
        <button
          onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
          className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 min-w-0 cursor-pointer transition-colors ${
            isMobileDrawerOpen || isMoreTabActive || activeTab === 'roleplay'
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 shadow-xs font-black'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="전체 학습 및 부가 메뉴 열기"
        >
          {isMobileDrawerOpen ? (
            <X className="w-4 h-4 text-indigo-500 shrink-0" />
          ) : (
            <Menu className="w-4 h-4 text-indigo-500 shrink-0" />
          )}
          <span className="tracking-tighter truncate w-full text-center">전체 메뉴</span>
        </button>

      </div>

      {/* ========================================================= */}
      {/* 5. Mobile Pull-down Drawer / Sheet */}
      {/* ========================================================= */}
      {isMobileDrawerOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
          
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            전체 학습 & AI 도구 모음
          </div>

          <div className="grid grid-cols-2 gap-2">
            
            {/* AI Roleplay */}
            <button
              onClick={() => {
                setActiveTab('roleplay');
                setIsMobileDrawerOpen(false);
              }}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'roleplay'
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-black'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-purple-500 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">AI 롤플레잉</div>
                <div className="text-[10px] text-slate-400">원어민 실전 대화</div>
              </div>
            </button>

            {/* AI Generator */}
            <button
              onClick={() => {
                setActiveTab('ai-gen');
                setIsMobileDrawerOpen(false);
              }}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'ai-gen'
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-black'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">AI 맞춤단어</div>
                <div className="text-[10px] text-slate-400">맞춤 생성 & 학습</div>
              </div>
            </button>

            {/* Open Dictionary */}
            <button
              onClick={() => {
                setActiveTab('dictionary');
                setIsMobileDrawerOpen(false);
              }}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'dictionary'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Search className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">오픈사전</div>
                <div className="text-[10px] text-slate-400">1·2·5종 사전 검색</div>
              </div>
            </button>

            {/* Goals */}
            <button
              onClick={() => {
                setActiveTab('goals');
                setIsMobileDrawerOpen(false);
              }}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'goals'
                  ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-black'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Target className="w-4 h-4 text-teal-500 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">자기계발 목표</div>
                <div className="text-[10px] text-slate-400">루틴 & 스트릭 관리</div>
              </div>
            </button>

            {/* Stats */}
            <button
              onClick={() => {
                setActiveTab('stats');
                setIsMobileDrawerOpen(false);
              }}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-black'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">학습 통계</div>
                <div className="text-[10px] text-slate-400">발음 진단 & 리포트</div>
              </div>
            </button>

            {/* Daily Quest */}
            {onOpenDailyQuest && (
              <button
                onClick={() => {
                  onOpenDailyQuest();
                  setIsMobileDrawerOpen(false);
                }}
                className="p-2.5 rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/50 dark:bg-orange-950/30 text-left flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-orange-700 dark:text-orange-300 leading-tight">3분 퀘스트</div>
                  <div className="text-[10px] text-slate-400">매일 미션 & 알림</div>
                </div>
              </button>
            )}

            {/* Native DLL Docs */}
            {onOpenNativeDllModal && (
              <button
                onClick={() => {
                  onOpenNativeDllModal();
                  setIsMobileDrawerOpen(false);
                }}
                className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-left flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 leading-tight">순수 창작 DLL</div>
                  <div className="text-[10px] text-slate-400">동작 원리 명세서</div>
                </div>
              </button>
            )}

          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">
              WordLoop AI Suite
            </span>
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold"
            >
              닫기
            </button>
          </div>

        </div>
      )}

    </header>
  );
};
