import React from 'react';
import { Target, BookOpen, Sparkles, Trophy, BarChart3, RotateCcw, Volume2, Moon, Sun, Search, Key, Gamepad2, History, User, Lock, Flame, Bell, Smartphone, MessageSquare, LayoutGrid, Download } from 'lucide-react';
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
}) => {
  const [hasCustomKey, setHasCustomKey] = React.useState<boolean>(() => Boolean(getUserGeminiKey()));

  React.useEffect(() => {
    const syncKey = () => setHasCustomKey(Boolean(getUserGeminiKey()));
    window.addEventListener('wordloop_api_key_changed', syncKey);
    window.addEventListener('storage', syncKey);
    return () => {
      window.removeEventListener('wordloop_api_key_changed', syncKey);
      window.removeEventListener('storage', syncKey);
    };
  }, []);
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-12 sm:h-14 md:h-15 lg:h-16 flex items-center justify-between gap-1 sm:gap-2 lg:gap-3">
        
        {/* Unified First Home Icon with App Name Inside */}
        <button
          type="button"
          className="h-8 md:h-9 px-2 md:px-3 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-slate-950 font-black flex flex-col md:flex-row items-center justify-center gap-0 md:gap-1.5 shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          onClick={() => {
            if (onGoToLauncher) {
              onGoToLauncher();
            } else {
              setActiveTab('vocab');
            }
          }}
          title="WordLoop 대형 런처 홈으로 이동"
        >
          <span className="text-xs md:text-sm leading-none">🔤</span>
          <span className="text-[8.5px] md:text-xs font-black tracking-tighter leading-none text-white drop-shadow-xs">
            WordLoop
          </span>
        </button>

        {/* Center Navigation Tabs (Tablet & Desktop Optimized) */}
        <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 md:p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
          <button
            onClick={() => {
              if (onGoToLauncher) {
                onGoToLauncher();
              } else {
                setActiveTab('vocab');
              }
            }}
            className={`px-2 py-1.5 lg:px-3 lg:py-1.5 rounded-xl text-[11px] lg:text-xs font-bold transition-all flex items-center gap-1 lg:gap-1.5 whitespace-nowrap ${
              activeTab === 'vocab' && homeViewMode === 'launcher'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="대형 아이콘 대시보드 런처 홈"
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>WordLoop 홈</span>
          </button>

          <button
            onClick={() => {
              if (onSwitchToListMode) {
                onSwitchToListMode();
              } else {
                setActiveTab('vocab');
              }
            }}
            className={`px-2 py-1.5 lg:px-3 lg:py-1.5 rounded-xl text-[11px] lg:text-xs font-bold transition-all flex items-center gap-1 lg:gap-1.5 whitespace-nowrap ${
              (activeTab === 'vocab' && homeViewMode === 'list') || activeTab === 'sentences'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>단어장 (목록)</span>
          </button>

          <button
            onClick={() => setActiveTab('dictionary')}
            className={`px-2 py-1.5 lg:px-3 lg:py-1.5 rounded-xl text-[11px] lg:text-xs font-bold transition-all flex items-center gap-1 lg:gap-1.5 whitespace-nowrap ${
              activeTab === 'dictionary'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            <span>오픈사전</span>
            <span className="hidden xl:inline text-[10px] text-slate-400 font-medium">(1·2·5)</span>
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className={`px-2 py-1.5 lg:px-3 lg:py-1.5 rounded-xl text-[11px] lg:text-xs font-bold transition-all flex items-center gap-1 lg:gap-1.5 whitespace-nowrap ${
              activeTab === 'goals'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span>자기계발</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-gen')}
            className={`px-2 py-1.5 lg:px-3 lg:py-1.5 rounded-xl text-[11px] lg:text-xs font-bold transition-all flex items-center gap-1 lg:gap-1.5 whitespace-nowrap ${
              activeTab === 'ai-gen'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-500" />
            <span>AI 맞춤</span>
          </button>

          <button
            onClick={() => setActiveTab('roleplay')}
            className={`px-2 py-1.5 lg:px-3 lg:py-1.5 rounded-xl text-[11px] lg:text-xs font-bold transition-all flex items-center gap-1 lg:gap-1.5 whitespace-nowrap ${
              activeTab === 'roleplay'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            <span>AI 롤플레잉</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-2 py-1.5 lg:px-3 lg:py-1.5 rounded-xl text-[11px] lg:text-xs font-bold transition-all flex items-center gap-1 lg:gap-1.5 whitespace-nowrap ${
              activeTab === 'quiz'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span>퀴즈</span>
            <span className="hidden xl:inline text-[10px] text-slate-400 font-medium">/카드</span>
          </button>

          <button
            onClick={() => setActiveTab('game')}
            className={`px-2 py-1.5 lg:px-3 lg:py-1.5 rounded-xl text-[11px] lg:text-xs font-bold transition-all flex items-center gap-1 lg:gap-1.5 whitespace-nowrap ${
              activeTab === 'game'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
            <span>단어게임</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-2 py-1.5 lg:px-3 lg:py-1.5 rounded-xl text-[11px] lg:text-xs font-bold transition-all flex items-center gap-1 lg:gap-1.5 whitespace-nowrap ${
              activeTab === 'stats'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span>통계</span>
          </button>
        </nav>

        {/* Right Status Pill & Tools (Uniform Fixed-Size Icon Buttons on Mobile/Tablet) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          
          {/* Active Loop Status Pill */}
          {activeLoopText && (
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-pulse">
              <RotateCcw className="w-3 h-3 animate-spin" style={{ animationDuration: isLooping ? '3s' : '0s' }} />
              <span className="truncate max-w-[100px]">{activeLoopText}</span>
              <span className="text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded-full font-extrabold">
                {repeatCount}회
              </span>
            </div>
          )}

          {/* Real-time Audio Speech Speed Widget (1-Click Speed Control & Dropdown) */}
          <RealtimeAudioSpeedWidget onOpenFullSettings={onOpenAudioSettings} />

          {/* Single User Profile Icon Button (Fixed Width - User Name moved to Hero Banner & Profile Modal) */}
          {onOpenProfileModal && (
            <button
              onClick={onOpenProfileModal}
              className={`w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl border text-xs font-bold flex items-center justify-center transition-all active:scale-95 shrink-0 relative ${
                userProfile
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm'
                  : 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-md shadow-emerald-500/20'
              }`}
              title={userProfile ? `${userProfile.name}님 프로필 & 로컬 저장소 관리` : '내 프로필 & 기기 로컬 저장소 관리'}
            >
              <span className="text-sm leading-none">{userProfile ? userProfile.avatar : '👤'}</span>
              {userProfile && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900 absolute -top-0.5 -right-0.5" />
              )}
            </button>
          )}

          {/* Daily 3-Minute Quest & Habit Loop Button */}
          {onOpenDailyQuest && (
            <button
              onClick={onOpenDailyQuest}
              className="w-8 h-8 md:w-auto md:h-8.5 md:px-2.5 rounded-xl bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-emerald-500/15 hover:from-orange-500/25 hover:to-emerald-500/25 text-orange-600 dark:text-orange-400 border border-orange-500/40 text-xs font-black flex items-center justify-center gap-1 transition-all active:scale-95 shrink-0 shadow-sm"
              title="매일 3분 퀘스트 & 스마트 푸시 알림"
            >
              <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse shrink-0" />
              <span className="hidden xl:inline">3분 퀘스트</span>
            </button>
          )}

          {/* Random Mode Quick Launch Button */}
          {onTriggerRandomLaunch && (
            <button
              onClick={onTriggerRandomLaunch}
              className="w-8 h-8 md:w-auto md:h-8.5 md:px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-black flex items-center justify-center gap-1 transition-all active:scale-95 shrink-0"
              title="앱 내 20+가지 기능 중 무작위 모드 즉시 추첨 실행"
            >
              <span className="text-xs leading-none">🎲</span>
              <span className="hidden xl:inline">랜덤</span>
            </button>
          )}

          {/* Add to Home Screen (PWA Full-screen Web App) Button */}
          {onOpenAddToHome && (
            <button
              onClick={onOpenAddToHome}
              className="w-8 h-8 md:w-auto md:h-8.5 md:px-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-black flex items-center justify-center gap-1 transition-all active:scale-95 shrink-0"
              title="홈 화면에 추가 (전체화면 웹앱 설치 가이드)"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="hidden 2xl:inline">앱 설치</span>
            </button>
          )}

          {/* BYOK API Key Button */}
          <button
            onClick={onOpenApiKeyModal}
            className={`w-8 h-8 md:w-auto md:h-8.5 md:px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 shrink-0 relative ${
              hasCustomKey
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="개인 Gemini API Key 설정 (BYOK)"
          >
            <Key className={`w-3.5 h-3.5 shrink-0 ${hasCustomKey ? 'text-amber-500' : 'text-slate-400'}`} />
            <span className="hidden 2xl:inline">{hasCustomKey ? '개인 Key' : 'API Key'}</span>
            {hasCustomKey && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping absolute -top-0.5 -right-0.5" />}
          </button>

          {/* GitHub Releases Auto-Update Button */}
          {onOpenGitHubUpdateModal && (
            updateData?.isUpdateAvailable ? (
              <button
                onClick={onOpenGitHubUpdateModal}
                className="h-8 md:h-8.5 px-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-indigo-600 to-purple-600 hover:from-rose-600 hover:to-indigo-700 text-white font-black text-[11px] flex items-center gap-1 shadow-md shadow-rose-500/25 animate-pulse shrink-0 active:scale-95 transition-all"
                title={`새 버전 v${updateData.latestVersion} 배포됨! 클릭하여 다운로드`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">v{updateData.latestVersion} 업데이트</span>
                <span className="sm:hidden">업데이트</span>
              </button>
            ) : (
              <button
                onClick={onOpenGitHubUpdateModal}
                className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0"
                title="GitHub Releases 실시간 업데이트 & 설치파일 다운로드"
              >
                <Download className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" />
              </button>
            )
          )}

          {/* Patch Notes Button */}
          {onOpenPatchNotesModal && (
            <button
              onClick={onOpenPatchNotesModal}
              className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0"
              title="패치노트 & 버전 기록"
            >
              <History className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
            </button>
          )}

          {/* Dark Mode Toggle Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0"
            title={darkMode ? "라이트 모드로 변경" : "다크 모드로 변경"}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          </button>

        </div>

      </div>

      {/* Mobile & Compact Navigation Bar (9-Column Auto-Fit Grid - Zero Scrollbar & Zero Clipping) */}
      <div className="grid grid-cols-9 md:hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm px-1 py-1 gap-0.5 items-center text-[9.5px] sm:text-[10px] font-bold">
        <button
          onClick={() => {
            if (onGoToLauncher) {
              onGoToLauncher();
            } else {
              setActiveTab('vocab');
            }
          }}
          className={`py-1 px-0.5 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-0 truncate ${
            activeTab === 'vocab' && homeViewMode === 'launcher'
              ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm font-black'
              : 'text-slate-500'
          }`}
          title="WordLoop 홈 (대형 런처)"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">WordLoop</span>
        </button>
        <button
          onClick={() => {
            if (onSwitchToListMode) {
              onSwitchToListMode();
            } else {
              setActiveTab('vocab');
            }
          }}
          className={`py-1 px-0.5 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-0 truncate ${
            (activeTab === 'vocab' && homeViewMode === 'list') || activeTab === 'sentences'
              ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">단어장</span>
        </button>
        <button
          onClick={() => setActiveTab('dictionary')}
          className={`py-1 px-0.5 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-0 truncate ${
            activeTab === 'dictionary'
              ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">오픈사전</span>
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`py-1 px-0.5 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-0 truncate ${
            activeTab === 'goals'
              ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">자기계발</span>
        </button>
        <button
          onClick={() => setActiveTab('ai-gen')}
          className={`py-1 px-0.5 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-0 truncate ${
            activeTab === 'ai-gen'
              ? 'text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-800 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">AI맞춤</span>
        </button>
        <button
          onClick={() => setActiveTab('roleplay')}
          className={`py-1 px-0.5 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-0 truncate ${
            activeTab === 'roleplay'
              ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">롤플레잉</span>
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`py-1 px-0.5 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-0 truncate ${
            activeTab === 'quiz'
              ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">퀴즈</span>
        </button>
        <button
          onClick={() => setActiveTab('game')}
          className={`py-1 px-0.5 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-0 truncate ${
            activeTab === 'game'
              ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">단어게임</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`py-1 px-0.5 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-0 truncate ${
            activeTab === 'stats'
              ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 shrink-0" />
          <span className="tracking-tighter truncate w-full text-center">통계</span>
        </button>
      </div>
    </header>
  );
};
