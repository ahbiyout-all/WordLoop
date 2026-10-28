import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveTab, VocabItem, SentenceItem, Goal, DailyGoalHistory, UserProfile } from './types';
import { DEFAULT_VOCAB, DEFAULT_SENTENCES } from './data/defaultVocab';
import { DEFAULT_GOALS, generateSampleHistory } from './data/defaultGoals';
import { speechService, initMobileAudioUnlock, playBreakStartChime, playBreakEndChime } from './services/speechService';
import { Navbar } from './components/Navbar';
import { VocabList } from './components/VocabList';
import { GoalTracker } from './components/GoalTracker';
import { AIGenerator } from './components/AIGenerator';
import { AIRoleplayView } from './components/AIRoleplayView';
import { MainLauncherDashboard } from './components/MainLauncherDashboard';
import { CurriculumExplorerModal } from './components/CurriculumExplorerModal';
import { QuizMode } from './components/QuizMode';
import { StudentWordGame } from './components/StudentWordGame';
import { StatsDashboard } from './components/StatsDashboard';
import { CommercialDictionarySearch } from './components/CommercialDictionarySearch';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { PronunciationModal } from './components/PronunciationModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PatchNotesModal } from './components/PatchNotesModal';
import { NativeDllDocsModal } from './components/NativeDllDocsModal';
import { GitHubUpdateModal } from './components/GitHubUpdateModal';
import { UserProfileModal } from './components/UserProfileModal';
import { DailyQuestModal } from './components/DailyQuestModal';
import { AddToHomeScreenModal } from './components/AddToHomeScreenModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { QuickActionWidgets } from './components/QuickActionWidgets';
import { SurpriseParentNagPopup, SurpriseNagType } from './components/SurpriseParentNagPopup';
import { APP_VERSION } from './data/patchNotesData';
import { GitHubUpdateService, UpdateCheckResult } from './services/githubUpdateService';
import { getAuthHeaders } from './services/apiClient';
import {
  saveUserProfileToDevice,
  loadUserProfileFromDevice,
  safeJsonParse,
  sanitizeCsvCell,
  sanitizeDeepObject,
} from './services/deviceStorageService';
import {
  setupAppTerminationSafeguards,
  checkEmergencyRecoverySnapshot,
  flushEmergencyAppState,
} from './services/autoSavePersistenceService';
import {
  getStartupRandomConfig,
  pickRandomActivity,
  RandomActivity,
  RandomScope,
} from './services/randomLaunchService';
import { Sparkles, X, Maximize2, Minimize2, Smartphone, Shuffle, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { InAppBrowserBanner } from './components/InAppBrowserBanner';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('vocab');
  const [isMobileFullscreen, setIsMobileFullscreen] = useState<boolean>(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState<boolean>(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Sub-state targets for auto-launching random modes
  const [initialGame, setInitialGame] = useState<any>(null);
  const [initialQuizMode, setInitialQuizMode] = useState<any>(null);
  const [initialVocabSubTab, setInitialVocabSubTab] = useState<'words' | 'sentences'>('words');
  const [initialOpenCurriculum, setInitialOpenCurriculum] = useState<boolean>(false);
  const [showCurriculumModalFromApp, setShowCurriculumModalFromApp] = useState<boolean>(false);
  const [homeViewMode, setHomeViewMode] = useState<'launcher' | 'list'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('wordloop_home_view') : null;
    return saved === 'list' ? 'list' : 'launcher';
  });

  const handleSetHomeViewMode = useCallback((mode: 'launcher' | 'list') => {
    setHomeViewMode(mode);
    try {
      localStorage.setItem('wordloop_home_view', mode);
    } catch {}
  }, []);

  // Random Startup Toast & Notification State
  const [randomLaunchToast, setRandomLaunchToast] = useState<{
    activity: RandomActivity;
    isStartup: boolean;
  } | null>(null);

  const executeRandomActivity = useCallback((activity: RandomActivity, isStartup: boolean = false) => {
    // Stop any playing speech before switching
    speechService.stop();

    // 1. Set navigation tab
    setActiveTab(activity.targetTab);

    // 2. Set sub-mode targets
    if (activity.targetTab === 'game' && activity.gameType) {
      setInitialGame(activity.gameType);
    } else {
      setInitialGame(null);
    }

    if (activity.targetTab === 'quiz' && activity.quizMode) {
      setInitialQuizMode(activity.quizMode);
    } else {
      setInitialQuizMode(null);
    }

    if (activity.targetTab === 'sentences') {
      setInitialVocabSubTab('sentences');
      setActiveTab('vocab');
      setHomeViewMode('list');
    } else if (activity.targetTab === 'vocab') {
      setInitialVocabSubTab('words');
      setHomeViewMode('list');
    }

    if (activity.openCurriculum) {
      setInitialOpenCurriculum(true);
    } else {
      setInitialOpenCurriculum(false);
    }

    // 3. Show notification toast to user
    setRandomLaunchToast({ activity, isStartup });

    // Auto dismiss toast after 6 seconds
    setTimeout(() => {
      setRandomLaunchToast((prev) => (prev?.activity.id === activity.id ? null : prev));
    }, 6000);
  }, []);

  const handleTriggerRandomLaunch = useCallback((scope?: RandomScope) => {
    const activity = pickRandomActivity(scope || 'all');
    executeRandomActivity(activity, false);
  }, [executeRandomActivity]);

  // Startup Random Trigger (Only on initial mount)
  useEffect(() => {
    const config = getStartupRandomConfig();
    if (config.enabled) {
      const selected = pickRandomActivity(config.scope);
      // Small timeout to allow DOM & state to initialize smoothly
      const timer = setTimeout(() => {
        executeRandomActivity(selected, true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [executeRandomActivity]);

  useEffect(() => {
    if ((activeTab === 'quiz' || activeTab === 'game') && window.innerWidth < 768) {
      setIsMobileFullscreen(true);
    }
  }, [activeTab]);

  const handleSubSelection = () => {
    setIsMobileFullscreen(true);
    if (gameContainerRef.current) {
      gameContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsNativeFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsNativeFullscreen(false);
    }
  };
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Single User Profile (1인 전용 락 모드 & 온디바이스 로컬 저장)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    return loadUserProfileFromDevice();
  });

  const [showProfileModal, setShowProfileModal] = useState<boolean>(() => {
    const saved = loadUserProfileFromDevice();
    return !saved; // If no profile saved, show onboarding on first launch
  });

  // Data State with LocalStorage Persistence & Smart Default Merging (with auto-repair for Korean meanings)
  const [vocabList, setVocabList] = useState<VocabItem[]>(() => {
    const defaultVocabMap = new Map<string, VocabItem>();
    DEFAULT_VOCAB.forEach((v) => defaultVocabMap.set(v.word.toLowerCase(), v));

    const saved = localStorage.getItem('wordloop_vocab');
    if (!saved) return DEFAULT_VOCAB;
    try {
      const parsed: VocabItem[] = JSON.parse(saved);
      // Auto-repair any items where meaning contains English or legacy templates
      const repaired: VocabItem[] = parsed.map((item) => {
        const canonical = defaultVocabMap.get(item.word.toLowerCase());
        const rawMeaning = item.meaning || '';
        const needsRepair =
          !/[\u3131-\u318E\uAC00-\uD7A3]/.test(rawMeaning) ||
          rawMeaning.includes('관련 어휘') ||
          rawMeaning.includes('파생 어휘') ||
          rawMeaning.toLowerCase() === item.word.toLowerCase() ||
          (/[a-zA-Z]/.test(rawMeaning) && !item.isCustom);

        if (needsRepair && canonical) {
          return {
            ...item,
            meaning: canonical.meaning,
            sentence: canonical.sentence || item.sentence,
            sentenceMeaning: canonical.sentenceMeaning || item.sentenceMeaning,
            ipa: canonical.ipa || item.ipa,
          };
        }
        return item;
      });

      const existingWordSet = new Set(repaired.map((item) => item.word.toLowerCase()));
      const missingDefaults = DEFAULT_VOCAB.filter((item) => !existingWordSet.has(item.word.toLowerCase()));
      const result = missingDefaults.length > 0 ? [...repaired, ...missingDefaults] : repaired;
      try {
        localStorage.setItem('wordloop_vocab', JSON.stringify(result));
      } catch {}
      return result;
    } catch {
      return DEFAULT_VOCAB;
    }
  });

  const [sentenceList, setSentenceList] = useState<SentenceItem[]>(() => {
    const saved = localStorage.getItem('wordloop_sentences');
    if (!saved) return DEFAULT_SENTENCES;
    try {
      const parsed: SentenceItem[] = JSON.parse(saved);
      // Clean out any legacy generic template or corrupted non-Korean sentences
      const cleanedParsed = parsed.filter(
        (item) =>
          item.text &&
          !item.text.includes('is an essential vocabulary item in the English curriculum') &&
          !item.text.includes('in formal English sentences') &&
          !item.text.includes('alongside') &&
          item.meaning &&
          !item.meaning.includes('파생 어휘') &&
          !item.meaning.includes('필수 어휘') &&
          /[\u3131-\u318E\uAC00-\uD7A3]/.test(item.meaning)
      );
      const existingTextSet = new Set(cleanedParsed.map((item) => item.text.trim().toLowerCase()));
      const missingDefaults = DEFAULT_SENTENCES.filter((item) => !existingTextSet.has(item.text.trim().toLowerCase()));
      const combined = missingDefaults.length > 0 ? [...cleanedParsed, ...missingDefaults] : cleanedParsed;
      const result = combined.length > 0 ? combined : DEFAULT_SENTENCES;
      try {
        localStorage.setItem('wordloop_sentences', JSON.stringify(result));
      } catch {}
      return result;
    } catch {
      return DEFAULT_SENTENCES;
    }
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem('wordloop_goals');
      return saved ? JSON.parse(saved) : DEFAULT_GOALS;
    } catch {
      return DEFAULT_GOALS;
    }
  });

  const [history, setHistory] = useState<DailyGoalHistory[]>(() => {
    try {
      const saved = localStorage.getItem('wordloop_history');
      return saved ? JSON.parse(saved) : generateSampleHistory();
    } catch {
      return generateSampleHistory();
    }
  });

  const [totalRepeatsCount, setTotalRepeatsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wordloop_total_repeats');
      const num = Number(saved);
      return !isNaN(num) && num >= 0 ? num : 48;
    } catch {
      return 48;
    }
  });

  // Audio Loop Player State
  const [activeLoopItemId, setActiveLoopItemId] = useState<string | null>(null);
  const [activeLoopText, setActiveLoopText] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [repeatCount, setRepeatCount] = useState<number>(0);

  // Modals
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [showPatchNotesModal, setShowPatchNotesModal] = useState<boolean>(false);
  const [showNativeDllModal, setShowNativeDllModal] = useState<boolean>(false);
  const [showGitHubUpdateModal, setShowGitHubUpdateModal] = useState<boolean>(false);
  const [showAudioSettingsModal, setShowAudioSettingsModal] = useState<boolean>(false);
  const [updateData, setUpdateData] = useState<UpdateCheckResult | null>(() => GitHubUpdateService.getCachedResult());
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [showDailyQuestModal, setShowDailyQuestModal] = useState<boolean>(false);
  const [showAddToHomeModal, setShowAddToHomeModal] = useState<boolean>(false);
  const [surpriseNagState, setSurpriseNagState] = useState<{
    isOpen: boolean;
    type: SurpriseNagType;
  }>({
    isOpen: false,
    type: 'low_achievement',
  });
  const [pronunciationModalText, setPronunciationModalText] = useState<string | null>(null);

  // Continuous Study Time Tracker (Auto-triggers 5-min break gentle parent nag popup after 30 minutes)
  const [continuousStudySeconds, setContinuousStudySeconds] = useState<number>(0);
  const [breakCountdownSeconds, setBreakCountdownSeconds] = useState<number | null>(null);

  // 1-second interval loop for continuous study & 5-minute break countdown
  useEffect(() => {
    const timer = setInterval(() => {
      // If currently enjoying 5-min break
      if (breakCountdownSeconds !== null) {
        if (breakCountdownSeconds <= 1) {
          setBreakCountdownSeconds(null);
          playBreakEndChime();
          setRecoveryToast('☕ 5분간의 달콤한 휴식이 완료되었습니다! 머리가 맑아졌으니 다시 산뜻하게 시작해볼까요? 😊');
        } else {
          setBreakCountdownSeconds((prev) => (prev !== null ? prev - 1 : null));
        }
        return;
      }

      // If document is visible and app is actively being used
      if (typeof document !== 'undefined' && !document.hidden) {
        setContinuousStudySeconds((prev) => {
          const next = prev + 1;
          // When continuous study reaches 30 minutes (1800 seconds)
          if (next >= 1800) {
            setSurpriseNagState({ isOpen: true, type: 'continuous_study_break' });
            return 0; // Reset after triggering
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [breakCountdownSeconds]);

  // Global surprise nag event listener
  useEffect(() => {
    const handleNagEvent = (e: any) => {
      const type = (e.detail?.type || 'low_achievement') as SurpriseNagType;
      setSurpriseNagState({ isOpen: true, type });
    };
    window.addEventListener('wordloop_trigger_surprise_nag', handleNagEvent);
    return () => window.removeEventListener('wordloop_trigger_surprise_nag', handleNagEvent);
  }, []);
  const [aiExplanationText, setAIExplanationText] = useState<string | null>(null);
  const [aiExplanationContent, setAIExplanationContent] = useState<string | null>(null);
  const [aiExplanationLoading, setAIExplanationLoading] = useState<boolean>(false);

  // Background GitHub Releases Auto-Update Check on App Startup
  useEffect(() => {
    // Unlocks mobile & Samsung Galaxy audio engine upon user's first touch gesture
    initMobileAudioUnlock();

    GitHubUpdateService.checkForUpdates().then((res) => {
      setUpdateData(res);
      // Automatically launch update notification popup modal when new version is detected
      if (res && res.isUpdateAvailable) {
        const timer = setTimeout(() => {
          setShowGitHubUpdateModal(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const handleRefreshUpdateCheck = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await GitHubUpdateService.checkForUpdates(true);
      setUpdateData(res);
      if (res && res.isUpdateAvailable) {
        setShowGitHubUpdateModal(true);
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Crash Recovery & Termination Safety Toast Banner
  const [recoveryToast, setRecoveryToast] = useState<string | null>(null);

  // Apply dark mode class to html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Keep latest state in ref for synchronous exit flushing
  const latestStateRef = useRef({
    vocabList,
    sentenceList,
    goals,
    history,
    totalRepeatsCount,
    userProfile,
  });

  useEffect(() => {
    latestStateRef.current = {
      vocabList,
      sentenceList,
      goals,
      history,
      totalRepeatsCount,
      userProfile,
    };
  }, [vocabList, sentenceList, goals, history, totalRepeatsCount, userProfile]);

  // 100% Zero-Data-Loss Termination Safeguards (beforeunload, pagehide, visibilitychange, freeze)
  useEffect(() => {
    const unbindSafeguards = setupAppTerminationSafeguards(() => latestStateRef.current);
    
    // Check if recovery snapshot exists on fresh boot
    const recovery = checkEmergencyRecoverySnapshot();
    if (recovery.hasRecoveryData && recovery.timestamp) {
      const timeDiffMs = Date.now() - new Date(recovery.timestamp).getTime();
      // If previous exit occurred within last 24h, confirm data safety
      if (timeDiffMs > 0 && timeDiffMs < 86400000) {
        setRecoveryToast(`이전 세션의 모든 학습 데이터가 손실 없이 100% 안전하게 복원되었습니다.`);
        const timer = setTimeout(() => setRecoveryToast(null), 5000);
        return () => {
          clearTimeout(timer);
          unbindSafeguards();
        };
      }
    }

    return () => unbindSafeguards();
  }, []);

  // Instant continuous sync to local storage
  useEffect(() => {
    if (userProfile) {
      saveUserProfileToDevice(userProfile);
    }
  }, [userProfile]);

  // Sync real-time badge unlock events
  useEffect(() => {
    const handleBadgeUnlocked = (e: any) => {
      if (e.detail?.profile) {
        setUserProfile(e.detail.profile);
      }
    };
    window.addEventListener('wordloop_badge_unlocked', handleBadgeUnlocked);
    return () => window.removeEventListener('wordloop_badge_unlocked', handleBadgeUnlocked);
  }, []);

  useEffect(() => {
    localStorage.setItem('wordloop_vocab', JSON.stringify(vocabList));
    // Atomic flush to emergency snapshot
    flushEmergencyAppState(latestStateRef.current);
  }, [vocabList]);

  useEffect(() => {
    localStorage.setItem('wordloop_sentences', JSON.stringify(sentenceList));
    flushEmergencyAppState(latestStateRef.current);
  }, [sentenceList]);

  useEffect(() => {
    localStorage.setItem('wordloop_goals', JSON.stringify(goals));
    flushEmergencyAppState(latestStateRef.current);
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('wordloop_history', JSON.stringify(history));
    flushEmergencyAppState(latestStateRef.current);
  }, [history]);

  useEffect(() => {
    localStorage.setItem('wordloop_total_repeats', totalRepeatsCount.toString());
  }, [totalRepeatsCount]);

  // Subscribe to speechService updates & auto-link repeat playback to English goals!
  useEffect(() => {
    const unsubscribe = speechService.subscribe((state) => {
      setActiveLoopItemId(state.activeItemId);
      setActiveLoopText(state.activeText);
      setIsPlaying(state.isPlaying);
      setRepeatCount(state.repeatCount);
    });

    // Handle repeat count callback
    speechService.setOnItemRepeatCallback((itemId, text, count) => {
      setTotalRepeatsCount((prev) => prev + 1);

      // Increment today's repeat count in history for real-time chart reflection
      const todayStr = new Date().toISOString().split('T')[0];
      setHistory((prevHist) => {
        const existingIdx = prevHist.findIndex((h) => h.date === todayStr);
        if (existingIdx >= 0) {
          const updated = [...prevHist];
          updated[existingIdx] = {
            ...updated[existingIdx],
            vocabStudyCount: (updated[existingIdx].vocabStudyCount || 0) + 1,
          };
          return updated;
        } else {
          return [
            ...prevHist,
            {
              date: todayStr,
              completedGoalsCount: 0,
              totalGoalsCount: 4,
              vocabStudyCount: 1,
            },
          ];
        }
      });

      // Auto increment linked English goals
      setGoals((prevGoals) =>
        prevGoals.map((g) => {
          if (g.isAutoLinkedToEnglish) {
            const newCount = g.currentCount + 1;
            const isCompleted = newCount >= g.targetCount;
            return {
              ...g,
              currentCount: newCount,
              isCompleted: g.isCompleted || isCompleted,
              streak: isCompleted && !g.isCompleted ? g.streak + 1 : g.streak,
            };
          }
          return g;
        })
      );
    });

    return () => unsubscribe();
  }, []);

  // Handlers for Vocab & Sentence Bookmarks
  const handleToggleBookmarkVocab = useCallback((id: string) => {
    setVocabList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item))
    );
  }, []);

  const handleToggleBookmarkSentence = useCallback((id: string) => {
    setSentenceList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item))
    );
  }, []);

  // Mastery Level Handlers
  const handleUpdateVocabMastery = useCallback((id: string, level: 0 | 1 | 2) => {
    setVocabList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, masteryLevel: level, isLearned: level === 2 } : item
      )
    );
  }, []);

  const handleUpdateSentenceMastery = useCallback((id: string, level: 0 | 1 | 2) => {
    setSentenceList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, masteryLevel: level, isLearned: level === 2 } : item
      )
    );
  }, []);

  // Export Entire 1-User Learning Data (JSON)
  const handleExportAllData = useCallback(() => {
    const exportObject = {
      app: 'WordLoop',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      userProfile,
      vocabList,
      sentenceList,
      goals,
      history,
      totalRepeatsCount,
    };
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordloop_single_user_backup_${userProfile?.name || 'user'}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [userProfile, vocabList, sentenceList, goals, history, totalRepeatsCount]);

  // Import Entire 1-User Learning Data (JSON) with size limit, deep sanitization & Prototype Pollution protection
  const handleImportAllData = useCallback(async (file: File) => {
    try {
      if (file.size > 5 * 1024 * 1024) {
        setRecoveryToast('백업 파일 복원 실패: 파일 크기가 허용 한도(5MB)를 초과했습니다.');
        return;
      }
      const text = await file.text();
      const rawParsed = safeJsonParse<any>(text);
      if (!rawParsed || typeof rawParsed !== 'object') {
        throw new Error('유효하지 않은 백업 데이터 형식입니다.');
      }
      const parsed = sanitizeDeepObject(rawParsed);

      if (parsed.userProfile && typeof parsed.userProfile === 'object' && typeof parsed.userProfile.name === 'string') {
        setUserProfile(parsed.userProfile);
      }
      if (Array.isArray(parsed.vocabList)) {
        setVocabList(parsed.vocabList.slice(0, 5000));
      }
      if (Array.isArray(parsed.sentenceList)) {
        setSentenceList(parsed.sentenceList.slice(0, 5000));
      }
      if (Array.isArray(parsed.goals)) {
        setGoals(parsed.goals.slice(0, 200));
      }
      if (Array.isArray(parsed.history)) {
        setHistory(parsed.history.slice(0, 1000));
      }
      if (typeof parsed.totalRepeatsCount === 'number' && Number.isFinite(parsed.totalRepeatsCount) && parsed.totalRepeatsCount >= 0) {
        setTotalRepeatsCount(Math.floor(parsed.totalRepeatsCount));
      }
      setRecoveryToast('✅ 1인 전용 데이터 전체 복원이 안전하게 완료되었습니다!');
    } catch (e: any) {
      setRecoveryToast('백업 파일 복원 실패: ' + (e?.message || '올바른 JSON 파일인지 확인해주세요.'));
    }
  }, []);

  // Reset All Data
  const handleResetAllData = useCallback(() => {
    localStorage.removeItem('wordloop_user_profile');
    localStorage.removeItem('wordloop_vocab');
    localStorage.removeItem('wordloop_sentences');
    localStorage.removeItem('wordloop_goals');
    localStorage.removeItem('wordloop_history');
    localStorage.removeItem('wordloop_total_repeats');
    setUserProfile(null);
    setVocabList(DEFAULT_VOCAB);
    setSentenceList(DEFAULT_SENTENCES);
    setGoals(DEFAULT_GOALS);
    setHistory(generateSampleHistory());
    setTotalRepeatsCount(0);
    setShowProfileModal(true);
  }, []);

  // Export Data (JSON / CSV)
  const handleExportData = useCallback((format: 'json' | 'csv') => {
    if (format === 'json') {
      handleExportAllData();
    } else {
      // CSV format with CSV Formula Injection protection
      let csvContent = 'type,word_or_text,ipa_or_context,meaning,partOfSpeech,sentence,sentenceMeaning,masteryLevel\n';
      vocabList.forEach((v) => {
        const line = [
          'vocab',
          sanitizeCsvCell(v.word),
          sanitizeCsvCell(v.ipa),
          sanitizeCsvCell(v.meaning),
          sanitizeCsvCell(v.partOfSpeech),
          sanitizeCsvCell(v.sentence),
          sanitizeCsvCell(v.sentenceMeaning),
          v.masteryLevel ?? (v.isLearned ? 2 : 0),
        ].join(',');
        csvContent += line + '\n';
      });

      sentenceList.forEach((s) => {
        const line = [
          'sentence',
          sanitizeCsvCell(s.text),
          sanitizeCsvCell(s.context),
          sanitizeCsvCell(s.meaning),
          '""',
          '""',
          '""',
          s.masteryLevel ?? (s.isLearned ? 2 : 0),
        ].join(',');
        csvContent += line + '\n';
      });

      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wordloop_vocab_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [vocabList, sentenceList, goals, handleExportAllData]);

  // Import Data (JSON / CSV)
  const handleImportData = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (parsed.userProfile) {
          setUserProfile(parsed.userProfile);
        }
        if (Array.isArray(parsed.vocabList)) {
          setVocabList((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const newItems = parsed.vocabList.filter((i: VocabItem) => !existingIds.has(i.id));
            return [...newItems, ...prev];
          });
        }
        if (Array.isArray(parsed.sentenceList)) {
          setSentenceList((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const newItems = parsed.sentenceList.filter((i: SentenceItem) => !existingIds.has(i.id));
            return [...newItems, ...prev];
          });
        }
        alert('JSON 데이터 복원이 완료되었습니다!');
      } else {
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          alert('가져올 데이터가 없는 빈 CSV 파일입니다.');
          return;
        }

        let importedVocabCount = 0;
        const newVocabItems: VocabItem[] = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
          if (row.length >= 4) {
            const [type, wordOrText, ipaOrContext, meaning, pos, sentence, sentenceMeaning, level] = row;
            if (type === 'vocab' || (!type && wordOrText)) {
              newVocabItems.push({
                id: `import-${Date.now()}-${i}`,
                word: wordOrText,
                ipa: ipaOrContext || '',
                meaning: meaning || '',
                partOfSpeech: pos || 'n.',
                sentence: sentence || `${wordOrText} is very useful.`,
                sentenceMeaning: sentenceMeaning || `${meaning}은 유용합니다.`,
                categoryId: 'elementary',
                masteryLevel: Number(level) === 1 ? 1 : Number(level) === 2 ? 2 : 0,
                isCustom: true,
              });
              importedVocabCount++;
            }
          }
        }

        if (newVocabItems.length > 0) {
          setVocabList((prev) => [...newVocabItems, ...prev]);
          alert(`${importedVocabCount}개의 단어를 성공적으로 가져왔습니다!`);
        } else {
          alert('올바른 CSV 형식이 아닙니다.');
        }
      }
    } catch (e: any) {
      alert('파일 가져오기 실패: ' + (e?.message || '파일 형식을 확인해주세요.'));
    }
  }, []);

  // Add Custom Items
  const handleAddCustomVocab = useCallback((newItem: Omit<VocabItem, 'id'>) => {
    const itemWithId: VocabItem = {
      ...newItem,
      id: `custom-v-${Date.now()}`,
    };
    setVocabList((prev) => [itemWithId, ...prev]);
  }, []);

  const handleAddCustomSentence = useCallback((newItem: Omit<SentenceItem, 'id'>) => {
    const itemWithId: SentenceItem = {
      ...newItem,
      id: `custom-s-${Date.now()}`,
    };
    setSentenceList((prev) => [itemWithId, ...prev]);
  }, []);

  // Add AI Generated Items
  const handleAddAIItems = useCallback((items: VocabItem[]) => {
    setVocabList((prev) => [...items, ...prev]);
    setActiveTab('vocab');
  }, []);

  // Goal Handlers
  const handleToggleGoalComplete = (id: string) => {
    setGoals((prev) => {
      const updated = prev.map((g) => {
        if (g.id === id) {
          const nextCompleted = !g.isCompleted;
          return {
            ...g,
            isCompleted: nextCompleted,
            currentCount: nextCompleted ? g.targetCount : 0,
            streak: nextCompleted ? g.streak + 1 : Math.max(0, g.streak - 1),
          };
        }
        return g;
      });
      const allDone = updated.length > 0 && updated.every((g) => g.isCompleted);
      const wasAllDone = prev.length > 0 && prev.every((g) => g.isCompleted);
      if (allDone && !wasAllDone) {
        setTimeout(() => {
          setSurpriseNagState({ isOpen: true, type: 'high_achievement' });
        }, 300);
      }
      return updated;
    });
  };

  const handleIncrementGoal = (id: string, amount: number = 1) => {
    setGoals((prev) => {
      const updated = prev.map((g) => {
        if (g.id === id) {
          const nextCount = g.currentCount + amount;
          const isCompleted = nextCount >= g.targetCount;
          return {
            ...g,
            currentCount: nextCount,
            isCompleted: g.isCompleted || isCompleted,
            streak: isCompleted && !g.isCompleted ? g.streak + 1 : g.streak,
          };
        }
        return g;
      });
      const allDone = updated.length > 0 && updated.every((g) => g.isCompleted);
      const wasAllDone = prev.length > 0 && prev.every((g) => g.isCompleted);
      if (allDone && !wasAllDone) {
        setTimeout(() => {
          setSurpriseNagState({ isOpen: true, type: 'high_achievement' });
        }, 300);
      }
      return updated;
    });
  };

  const handleUpdateGoalTarget = useCallback((id: string, newTarget: number) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const target = Math.max(1, newTarget);
          const isCompleted = g.currentCount >= target;
          return {
            ...g,
            targetCount: target,
            isCompleted,
            streak: isCompleted && !g.isCompleted ? g.streak + 1 : g.streak,
          };
        }
        return g;
      })
    );
  }, []);

  // Listen to Pronunciation practice events to update daily goals in real time
  useEffect(() => {
    const handlePronunciationCompleted = () => {
      setGoals((prev) => {
        let foundPronGoal = false;
        const updated = prev.map((g) => {
          if (g.isPronunciationGoal || g.iconName === 'Mic' || g.title.includes('발음') || g.id === 'g-2') {
            foundPronGoal = true;
            const nextCount = g.currentCount + 1;
            const isCompleted = nextCount >= g.targetCount;
            return {
              ...g,
              currentCount: nextCount,
              isCompleted: g.isCompleted || isCompleted,
              streak: isCompleted && !g.isCompleted ? g.streak + 1 : g.streak,
            };
          }
          return g;
        });

        if (!foundPronGoal) {
          updated.push({
            id: 'g-2',
            title: '영문장 발음 쉐도잉 연습',
            category: 'english',
            targetCount: 3,
            unit: '회',
            currentCount: 1,
            isCompleted: false,
            streak: 1,
            iconName: 'Mic',
            description: '마이크 버튼을 눌러 정확도 80% 이상 발음 연습 달성하기',
            isAutoLinkedToEnglish: true,
            isPronunciationGoal: true,
          });
        }
        return updated;
      });
    };

    const handleUpdateTargetEvent = (e: any) => {
      const targetCount = Number(e.detail?.targetCount);
      if (!isNaN(targetCount) && targetCount > 0) {
        setGoals((prev) =>
          prev.map((g) => {
            if (g.isPronunciationGoal || g.iconName === 'Mic' || g.title.includes('발음') || g.id === 'g-2') {
              const isCompleted = g.currentCount >= targetCount;
              return {
                ...g,
                targetCount,
                isCompleted,
                streak: isCompleted && !g.isCompleted ? g.streak + 1 : g.streak,
              };
            }
            return g;
          })
        );
      }
    };

    window.addEventListener('wordloop_pronunciation_completed', handlePronunciationCompleted);
    window.addEventListener('wordloop_update_pronunciation_goal_target', handleUpdateTargetEvent);
    return () => {
      window.removeEventListener('wordloop_pronunciation_completed', handlePronunciationCompleted);
      window.removeEventListener('wordloop_update_pronunciation_goal_target', handleUpdateTargetEvent);
    };
  }, []);

  const handleAddGoal = (goalData: Omit<Goal, 'id' | 'currentCount' | 'isCompleted' | 'streak'>) => {
    const newGoal: Goal = {
      ...goalData,
      id: `g-${Date.now()}`,
      currentCount: 0,
      isCompleted: false,
      streak: 0,
    };
    setGoals((prev) => [...prev, newGoal]);
  };

  const handleDeleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleOpenPronunciationModal = useCallback((text: string) => {
    setPronunciationModalText(text);
  }, []);

  // AI Explanation Modal Handler
  const handleOpenAIExplain = useCallback(async (text: string) => {
    setAIExplanationText(text);
    setAIExplanationContent(null);
    setAIExplanationLoading(true);

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success) {
        setAIExplanationContent(data.explanation);
      } else {
        setAIExplanationContent(data.error || '해설을 불러오지 못했습니다.');
      }
    } catch (e: any) {
      setAIExplanationContent('AI 서비스 연결 실패. 잠시 후 다시 시도하세요.');
    } finally {
      setAIExplanationLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-28">
      {/* In-App Browser (KakaoTalk/WebView) Guidance Banner */}
      <InAppBrowserBanner />

      {/* Header Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeLoopText={activeLoopText}
        isLooping={isPlaying}
        repeatCount={repeatCount}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
        onOpenPatchNotesModal={() => setShowPatchNotesModal(true)}
        onOpenNativeDllModal={() => setShowNativeDllModal(true)}
        onOpenGitHubUpdateModal={() => setShowGitHubUpdateModal(true)}
        updateData={updateData}
        userProfile={userProfile}
        onOpenProfileModal={() => setShowProfileModal(true)}
        onTriggerRandomLaunch={() => handleTriggerRandomLaunch()}
        onOpenDailyQuest={() => setShowDailyQuestModal(true)}
        onOpenAddToHome={() => setShowAddToHomeModal(true)}
        homeViewMode={homeViewMode}
        onGoToLauncher={() => {
          setActiveTab('vocab');
          handleSetHomeViewMode('launcher');
        }}
        onSwitchToListMode={() => {
          setActiveTab('vocab');
          handleSetHomeViewMode('list');
        }}
        onOpenAudioSettings={() => setShowAudioSettingsModal(true)}
      />

      {/* Crash Recovery Notification Toast */}
      {recoveryToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-16 md:top-18 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div className="p-3.5 rounded-2xl bg-emerald-950/95 dark:bg-slate-900/95 text-white border border-emerald-500/50 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="truncate">
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                  데이터 100% 무손실 보존
                </span>
                <p className="text-xs font-bold text-emerald-100 truncate mt-0.5">
                  {recoveryToast}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRecoveryToast(null)}
              className="p-1 rounded-lg text-emerald-300 hover:text-white transition-colors shrink-0"
              title="알림 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Floating Random Launch Notification Toast */}
      {randomLaunchToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-16 md:top-18 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div className="p-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white border border-amber-500/40 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black text-lg shrink-0 shadow-md">
                {randomLaunchToast.activity.icon || '🎲'}
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                    {randomLaunchToast.isStartup ? '🚀 시작 시 랜덤 실행' : '🎲 랜덤 추첨 실행'}
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold">
                    {randomLaunchToast.activity.badge}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-100 truncate mt-0.5">
                  {randomLaunchToast.activity.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleTriggerRandomLaunch()}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-amber-300 transition-colors flex items-center gap-1"
                title="다시 다른 모드 추첨하기"
              >
                <Shuffle className="w-3 h-3" />
                <span className="hidden sm:inline">다시 추첨</span>
              </button>
              <button
                type="button"
                onClick={() => setRandomLaunchToast(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="알림 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Screen Quick-Action Widgets (Shown in list mode and other functional tabs) */}
      {!(activeTab === 'vocab' && homeViewMode === 'launcher') && (
        <QuickActionWidgets
          vocabList={vocabList}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'vocab') handleSetHomeViewMode('list');
          }}
          onStartPronunciation={(text) => handleOpenPronunciationModal(text)}
          onOpenDailyQuest={() => setShowDailyQuestModal(true)}
          onTriggerRandomLaunch={() => handleTriggerRandomLaunch()}
        />
      )}

      {/* Main Content Viewport (Fluid Top/Bottom/Left/Right Auto-Spacing) */}
      <main className={`max-w-6xl mx-auto fluid-viewport-main transition-all ${activeLoopItemId ? '!pb-28 sm:!pb-24' : ''}`}>
        
        {/* Main Landing: Launcher Dashboard (Large Icon Hub) */}
        {activeTab === 'vocab' && homeViewMode === 'launcher' && (
          <MainLauncherDashboard
            userProfile={userProfile}
            vocabList={vocabList}
            sentenceList={sentenceList}
            goals={goals}
            history={history}
            totalRepeatsCount={totalRepeatsCount}
            onNavigateTab={(tab) => {
              if (tab === 'sentences') {
                setInitialVocabSubTab('sentences');
                setActiveTab('vocab');
                handleSetHomeViewMode('list');
              } else {
                setActiveTab(tab);
              }
            }}
            onOpenPronunciationModal={(text) => handleOpenPronunciationModal(text)}
            onOpenDailyQuest={() => setShowDailyQuestModal(true)}
            onTriggerRandomLaunch={() => handleTriggerRandomLaunch()}
            onOpenCurriculumModal={() => setShowCurriculumModalFromApp(true)}
            onSwitchToListMode={() => handleSetHomeViewMode('list')}
            onOpenProfileModal={() => setShowProfileModal(true)}
          />
        )}

        {/* Traditional 3,000 Vocab & 500 Sentence List Mode */}
        {activeTab === 'vocab' && homeViewMode === 'list' && (
          <VocabList
            vocabList={vocabList}
            sentenceList={sentenceList}
            activeLoopItemId={activeLoopItemId}
            isPlaying={isPlaying}
            repeatCount={repeatCount}
            userProfile={userProfile}
            onToggleBookmarkVocab={handleToggleBookmarkVocab}
            onToggleBookmarkSentence={handleToggleBookmarkSentence}
            onChangeMasteryVocab={handleUpdateVocabMastery}
            onChangeMasterySentence={handleUpdateSentenceMastery}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onAddCustomVocab={handleAddCustomVocab}
            onAddBatchVocab={handleAddAIItems}
            onAddCustomSentence={handleAddCustomSentence}
            onOpenPronunciationModal={handleOpenPronunciationModal}
            onOpenAIExplain={handleOpenAIExplain}
            initialSubTab={initialVocabSubTab}
            initialOpenCurriculum={initialOpenCurriculum}
            onTriggerRandomLaunch={handleTriggerRandomLaunch}
            onSwitchToLauncherMode={() => handleSetHomeViewMode('launcher')}
          />
        )}

        {activeTab === 'goals' && (
          <GoalTracker
            goals={goals}
            history={history}
            onToggleGoalComplete={handleToggleGoalComplete}
            onIncrementGoal={handleIncrementGoal}
            onUpdateGoalTarget={handleUpdateGoalTarget}
            onAddGoal={handleAddGoal}
            onDeleteGoal={handleDeleteGoal}
            onOpenAIGoalRecommend={() => setActiveTab('ai-gen')}
            onOpenPronunciationPractice={() => handleOpenPronunciationModal('Hello, nice to meet you!')}
          />
        )}

        {activeTab === 'ai-gen' && (
          <AIGenerator
            onAddGeneratedItems={handleAddAIItems}
            onAddRecommendedGoal={handleAddGoal}
          />
        )}

        {activeTab === 'roleplay' && (
          <AIRoleplayView
            onAddBookmarkVocab={handleAddAIItems}
            onAddBookmarkSentence={(sentences) => {
              setSentenceList((prev) => [...sentences, ...prev]);
            }}
            onIncrementGoal={() => handleIncrementGoal('1')}
            onOpenApiKeyModal={() => setShowApiKeyModal(true)}
          />
        )}

        {activeTab === 'dictionary' && (
          <CommercialDictionarySearch
            onAddVocab={handleAddCustomVocab}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizMode
            vocabList={vocabList}
            onChangeMastery={handleUpdateVocabMastery}
            onSelectMode={handleSubSelection}
            initialMode={initialQuizMode}
          />
        )}

        {activeTab === 'game' && (
          <StudentWordGame
            vocabList={vocabList}
            sentenceList={sentenceList}
            onChangeMastery={handleUpdateVocabMastery}
            onSelectGame={handleSubSelection}
            initialGame={initialGame}
            userProfile={userProfile}
            onOpenProfileModal={() => setShowProfileModal(true)}
            onSaveProfile={(updatedProfile) => {
              setUserProfile(updatedProfile);
              saveUserProfileToDevice(updatedProfile);
            }}
          />
        )}

        {activeTab === 'stats' && (
          <StatsDashboard
            goals={goals}
            history={history}
            totalRepeatsCount={totalRepeatsCount}
            vocabCount={vocabList.length}
            vocabList={vocabList}
            userProfile={userProfile}
            onStartReviewQuiz={() => {
              speechService.stop();
              setInitialQuizMode('review_quiz');
              setActiveTab('quiz');
            }}
          />
        )}

      </main>

      {/* Persistent Sticky Audio Player Bar */}
      <AudioPlayerBar
        onOpenPronunciationModal={(text) => setPronunciationModalText(text)}
      />

      {/* 1-User Profile & Onboarding Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        isOnboarding={!userProfile}
        userProfile={userProfile}
        vocabList={vocabList}
        sentenceList={sentenceList}
        goals={goals}
        history={history}
        totalRepeatsCount={totalRepeatsCount}
        onSaveProfile={(updatedProfile) => {
          setUserProfile(updatedProfile);
          setShowProfileModal(false);
        }}
        onClose={() => setShowProfileModal(false)}
        onExportAllData={handleExportAllData}
        onImportAllData={handleImportAllData}
        onResetAllData={handleResetAllData}
      />

      {/* Pronunciation Shadowing Practice Modal */}
      {pronunciationModalText && (
        <PronunciationModal
          isOpen={Boolean(pronunciationModalText)}
          targetText={pronunciationModalText}
          userProfile={userProfile}
          onOpenProfileModal={() => {
            setPronunciationModalText(null);
            setShowProfileModal(true);
          }}
          onClose={() => setPronunciationModalText(null)}
          onSuccessEvaluation={() => {
            // Increment linked English goal
            const englishGoal = goals.find((g) => g.category === 'english');
            if (englishGoal) {
              handleIncrementGoal(englishGoal.id, 1);
            }
          }}
        />
      )}

      {/* AI Nuance Explanation Modal */}
      {aiExplanationText && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  AI 뉘앙스 & 발음 팁
                </h3>
              </div>
              <button
                onClick={() => setAIExplanationText(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-sm font-extrabold text-purple-600 dark:text-purple-400 mb-3">
                "{aiExplanationText}"
              </p>

              {aiExplanationLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  ✨ Gemini AI가 원어민 뉘앙스와 발음 팁을 분석하고 있습니다...
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert text-xs leading-relaxed space-y-2 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {aiExplanationContent}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setAIExplanationText(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BYOK API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />

      {/* Patch Notes Modal */}
      <PatchNotesModal
        isOpen={showPatchNotesModal}
        onClose={() => setShowPatchNotesModal(false)}
        onOpenGitHubUpdateModal={() => {
          setShowPatchNotesModal(false);
          setShowGitHubUpdateModal(true);
        }}
      />

      {/* Pure Proprietary Native DLL Technical Architecture Modal */}
      <NativeDllDocsModal
        isOpen={showNativeDllModal}
        onClose={() => setShowNativeDllModal(false)}
      />

      {/* GitHub Releases Real-Time Auto-Update Modal */}
      <GitHubUpdateModal
        isOpen={showGitHubUpdateModal}
        onClose={() => setShowGitHubUpdateModal(false)}
        updateData={updateData}
        onRefreshCheck={handleRefreshUpdateCheck}
        isChecking={isCheckingUpdate}
      />

      {/* Daily 3-Minute Quest & Habit Loop Modal */}
      <DailyQuestModal
        isOpen={showDailyQuestModal}
        onClose={() => setShowDailyQuestModal(false)}
        vocabList={vocabList}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setShowDailyQuestModal(false);
        }}
        onOpenPronunciation={(text) => {
          setShowDailyQuestModal(false);
          handleOpenPronunciationModal(text);
        }}
        onStartPronunciation={() => {
          setShowDailyQuestModal(false);
          const sample = vocabList[Math.floor(Math.random() * vocabList.length)] || DEFAULT_VOCAB[0];
          if (sample) {
            setPronunciationModalText(sample.word);
          }
        }}
        onStartGame={() => {
          setShowDailyQuestModal(false);
          setActiveTab('game');
        }}
        onTriggerRandomLaunch={() => {
          setShowDailyQuestModal(false);
          handleTriggerRandomLaunch();
        }}
        onOpenAddToHomeGuide={() => {
          setShowDailyQuestModal(false);
          setShowAddToHomeModal(true);
        }}
      />

      {/* Add To Home Screen Visual Step-by-Step Guide Modal */}
      <AddToHomeScreenModal
        isOpen={showAddToHomeModal}
        onClose={() => setShowAddToHomeModal(false)}
      />

      {/* Global Pronunciation & Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={showAudioSettingsModal}
        onClose={() => setShowAudioSettingsModal(false)}
      />

      {/* Curriculum Explorer Modal from App Launchpad */}
      {showCurriculumModalFromApp && (
        <CurriculumExplorerModal
          isOpen={showCurriculumModalFromApp}
          onClose={() => setShowCurriculumModalFromApp(false)}
          onAddVocabItems={handleAddAIItems}
          existingVocabList={vocabList}
          showEduTag={true}
        />
      )}

      {/* Active 5-Minute Healing Rest Floating Banner */}
      {breakCountdownSeconds !== null && (
        <aside
          role="status"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto select-none"
        >
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/95 via-teal-950/95 to-slate-900/95 text-white border border-emerald-400/50 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md animate-pulse">
                ☕
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                    5분 힐링 휴식 중
                  </span>
                  <span className="text-xs font-mono font-black text-amber-300">
                    {Math.floor(breakCountdownSeconds / 60)}분 {String(breakCountdownSeconds % 60).padStart(2, '0')}초 남음
                  </span>
                </div>
                <p className="text-[11px] font-bold text-emerald-100 truncate mt-0.5">
                  먼 산이나 창밖을 보며 눈을 쉬어주세요 (장기 기억 정착 Up)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setBreakCountdownSeconds(null);
                playBreakEndChime();
                setRecoveryToast('휴식을 마치고 다시 활기차게 학습을 재개합니다!');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md"
            >
              학습 재개
            </button>
          </div>
        </aside>
      )}

      {/* Global Screen-Center Surprise Pop-out Nag Modal (Low vs High Achievement vs 30-Min Continuous Study Break) */}
      {surpriseNagState.isOpen && (
        <SurpriseParentNagPopup
          isOpen={surpriseNagState.isOpen}
          type={surpriseNagState.type}
          onClose={() => setSurpriseNagState((prev) => ({ ...prev, isOpen: false }))}
          onStartBreak={() => {
            setSurpriseNagState((prev) => ({ ...prev, isOpen: false }));
            setBreakCountdownSeconds(300);
            setContinuousStudySeconds(0);
            playBreakStartChime();
          }}
          onOpenPhotoSettings={() => setShowProfileModal(true)}
          onStartStudy={() => {
            setSurpriseNagState((prev) => ({ ...prev, isOpen: false }));
            setInitialVocabSubTab('words');
            setActiveTab('vocab');
            setHomeViewMode('list');
          }}
          userProfile={userProfile}
          completedGoalsCount={goals.filter((g) => g.isCompleted).length}
          totalGoalsCount={goals.length}
          weakCount={vocabList.filter((v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) < 2).length}
          masteredCount={vocabList.filter((v) => (v.masteryLevel || 0) >= 2).length}
          todayStudiedCount={vocabList.filter((v) => v.isLearned || (v.masteryLevel || 0) > 0).length}
          streak={userProfile?.streakDays || 1}
        />
      )}

    </div>
  );
}
