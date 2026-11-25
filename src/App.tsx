import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { ActiveTab, VocabItem, SentenceItem, Goal, DailyGoalHistory, UserProfile } from './types';
import { DEFAULT_VOCAB, DEFAULT_SENTENCES } from './data/defaultVocab';
import { DEFAULT_GOALS, generateSampleHistory } from './data/defaultGoals';
import { speechService, initMobileAudioUnlock, playBreakStartChime, playBreakEndChime } from './services/speechService';
import { Navbar } from './components/Navbar';
import { MainLauncherDashboard } from './components/MainLauncherDashboard';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { InactivityQuizToast } from './components/InactivityQuizToast';
import { ConfettiCanvas } from './components/ConfettiCanvas';
import { LazyLoadingFallback } from './components/LazyLoadingFallback';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  checkInactivityStatus,
  recordPromptShown,
  sendInactivityBrowserNotification,
  setupInactivityActivityTracker,
} from './services/inactivityQuizService';
import type { SurpriseNagType } from './components/SurpriseParentNagPopup';
import { APP_VERSION } from './constants/version';
import { calculateStudentLevel } from './services/studentGamificationService';
import { getLocalDateString } from './utils/dateUtils';
import { GitHubUpdateService, UpdateCheckResult } from './services/githubUpdateService';
import { explainTextWithFreeAi } from './services/freeAiService';
import {
  saveUserProfileToDevice,
  loadUserProfileFromDevice,
  sanitizeCsvCell,
  exportVersionedAllDataToFile,
  parseAndPreviewJsonBackup,
  parseAndPreviewBackupBytes,
  applyBackupImport,
  serializeCompactVocab,
  hydrateCompactVocab,
  serializeCompactSentences,
  hydrateCompactSentences,
  safeJsonParse,
  sanitizeDeepObject,
} from './services/deviceStorageService';
import {
  migrateAndHydrateOnBoot,
  saveAppStateToIndexedDb,
  syncBundleToLocalFolder,
  getLocalSyncStatus,
  authorizeLocalSyncFolder,
  readLatestBundleFromLocalFolder,
  clearIndexedDbAppState,
  saveMediaAsset,
} from './services/persistentStorageEngine';
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
import {
  calculateNextSrsState,
  buildTodayRoutineQueue,
  SrsRating,
} from './services/srsEngineService';
import { Sparkles, X, Shuffle, ShieldCheck, Coffee, FolderSync } from 'lucide-react';
import { InAppBrowserBanner } from './components/InAppBrowserBanner';

// Route-level & Modal-level Code Splitting (Reduces initial entry bundle dramatically)
const VocabList = React.lazy(() => import('./components/VocabList').then((m) => ({ default: m.VocabList })));
const GoalTracker = React.lazy(() => import('./components/GoalTracker').then((m) => ({ default: m.GoalTracker })));
const AIGenerator = React.lazy(() => import('./components/AIGenerator').then((m) => ({ default: m.AIGenerator })));
const AIRoleplayView = React.lazy(() => import('./components/AIRoleplayView').then((m) => ({ default: m.AIRoleplayView })));
const CommercialDictionarySearch = React.lazy(() =>
  import('./components/CommercialDictionarySearch').then((m) => ({ default: m.CommercialDictionarySearch }))
);
const QuizMode = React.lazy(() => import('./components/QuizMode').then((m) => ({ default: m.QuizMode })));
const StudentWordGame = React.lazy(() =>
  import('./components/StudentWordGame').then((m) => ({ default: m.StudentWordGame }))
);
const StatsDashboard = React.lazy(() =>
  import('./components/StatsDashboard').then((m) => ({ default: m.StatsDashboard }))
);
const CurriculumExplorerModal = React.lazy(() =>
  import('./components/CurriculumExplorerModal').then((m) => ({ default: m.CurriculumExplorerModal }))
);
const PronunciationModal = React.lazy(() =>
  import('./components/PronunciationModal').then((m) => ({ default: m.PronunciationModal }))
);
const ApiKeyModal = React.lazy(() => import('./components/ApiKeyModal').then((m) => ({ default: m.ApiKeyModal })));
const PatchNotesModal = React.lazy(() =>
  import('./components/PatchNotesModal').then((m) => ({ default: m.PatchNotesModal }))
);
const NativeDllDocsModal = React.lazy(() =>
  import('./components/NativeDllDocsModal').then((m) => ({ default: m.NativeDllDocsModal }))
);
const GitHubUpdateModal = React.lazy(() =>
  import('./components/GitHubUpdateModal').then((m) => ({ default: m.GitHubUpdateModal }))
);
const UserProfileModal = React.lazy(() =>
  import('./components/UserProfileModal').then((m) => ({ default: m.UserProfileModal }))
);
const DailyQuestModal = React.lazy(() =>
  import('./components/DailyQuestModal').then((m) => ({ default: m.DailyQuestModal }))
);
const AddToHomeScreenModal = React.lazy(() =>
  import('./components/AddToHomeScreenModal').then((m) => ({ default: m.AddToHomeScreenModal }))
);
const AudioSettingsModal = React.lazy(() =>
  import('./components/AudioSettingsModal').then((m) => ({ default: m.AudioSettingsModal }))
);
const RecordingHistoryModal = React.lazy(() =>
  import('./components/RecordingHistoryModal').then((m) => ({ default: m.RecordingHistoryModal }))
);
const SurpriseParentNagPopup = React.lazy(() =>
  import('./components/SurpriseParentNagPopup').then((m) => ({ default: m.SurpriseParentNagPopup }))
);
const FocusRoutinePlayer = React.lazy(() =>
  import('./components/FocusRoutinePlayer').then((m) => ({ default: m.FocusRoutinePlayer }))
);
const JsonBackupModal = React.lazy(() =>
  import('./components/JsonBackupModal').then((m) => ({ default: m.JsonBackupModal }))
);

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

  // Data State with Compact v2 LocalStorage Persistence & Auto-Repair
  const [vocabList, setVocabList] = useState<VocabItem[]>(() => {
    const saved = localStorage.getItem('wordloop_vocab');
    if (!saved) return DEFAULT_VOCAB;
    try {
      const result = hydrateCompactVocab(saved, DEFAULT_VOCAB);
      try {
        localStorage.setItem('wordloop_vocab', JSON.stringify(serializeCompactVocab(result, DEFAULT_VOCAB)));
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
      const result = hydrateCompactSentences(saved, DEFAULT_SENTENCES);
      try {
        localStorage.setItem(
          'wordloop_sentences',
          JSON.stringify(serializeCompactSentences(result, DEFAULT_SENTENCES))
        );
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
  const [showRecordingHistoryModal, setShowRecordingHistoryModal] = useState<boolean>(false);
  const [showFocusRoutine, setShowFocusRoutine] = useState<boolean>(false);
  const [showJsonBackupModal, setShowJsonBackupModal] = useState<boolean>(false);
  const [recordingHistoryInitialTarget, setRecordingHistoryInitialTarget] = useState<string | undefined>(undefined);
  const [surpriseNagState, setSurpriseNagState] = useState<{
    isOpen: boolean;
    type: SurpriseNagType;
  }>({
    isOpen: false,
    type: 'low_achievement',
  });
  const [pronunciationModalText, setPronunciationModalText] = useState<string | null>(null);
  const [inactivityPrompt, setInactivityPrompt] = useState<{ elapsedHours: number } | null>(null);

  const handleOpenRecordingHistory = useCallback((targetText?: string) => {
    setRecordingHistoryInitialTarget(targetText);
    setShowRecordingHistoryModal(true);
  }, []);

  const handleLaunch3MinQuiz = useCallback(() => {
    speechService.stop();
    setInitialQuizMode('review_quiz');
    setActiveTab('quiz');
    setInactivityPrompt(null);
  }, []);

  // 24-Hour Inactivity 3-Minute Quiz Notification & Activity Tracking
  useEffect(() => {
    const cleanupTracker = setupInactivityActivityTracker();

    const performCheck = () => {
      const status = checkInactivityStatus();
      if (status.shouldPrompt) {
        setInactivityPrompt({ elapsedHours: status.elapsedHours });
        recordPromptShown();
        sendInactivityBrowserNotification(status.elapsedHours, () => {
          handleLaunch3MinQuiz();
        });
      }
    };

    // Slight delay on mount to ensure smooth initial UI hydration
    const timer = setTimeout(() => {
      performCheck();
    }, 1200);

    // Listen for manual simulation or tab resume events
    const onCheckRequested = (e: any) => {
      const elapsedHours = e.detail?.elapsedHours || 25;
      setInactivityPrompt({ elapsedHours });
      sendInactivityBrowserNotification(elapsedHours, () => {
        handleLaunch3MinQuiz();
      });
    };

    const onAppResumed = () => {
      performCheck();
    };

    window.addEventListener('wordloop_inactivity_check_requested', onCheckRequested);
    window.addEventListener('wordloop_app_resumed', onAppResumed);

    return () => {
      clearTimeout(timer);
      cleanupTracker();
      window.removeEventListener('wordloop_inactivity_check_requested', onCheckRequested);
      window.removeEventListener('wordloop_app_resumed', onAppResumed);
    };
  }, [handleLaunch3MinQuiz]);

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

  // Crash Recovery, Migration & Folder Sync State
  const [recoveryToast, setRecoveryToast] = useState<string | null>(null);
  const [pendingFolderRecoveryName, setPendingFolderRecoveryName] = useState<string | null>(null);
  const [isRestoringFromFolder, setIsRestoringFromFolder] = useState<boolean>(false);
  const bootMigrationDoneRef = useRef<boolean>(false);
  const mediaOffloadInFlightRef = useRef<Set<string>>(new Set());

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
    // Reclaim any oversized legacy full-dictionary emergency snapshot from prior versions
    try {
      const legacySnap = localStorage.getItem('wordloop_emergency_exit_snapshot');
      if (legacySnap && legacySnap.length > 200_000) {
        flushEmergencyAppState(latestStateRef.current);
      }
      localStorage.removeItem('wordloop_emergency_snapshot');
    } catch {}

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

  // Automatic lossless boot migration from localStorage -> IndexedDB Blob/Gzip + auto-recovery
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await migrateAndHydrateOnBoot(latestStateRef.current);
        if (cancelled) return;

        if (
          (res.action === 'recovered_from_indexeddb' || res.action === 'recovered_from_folder') &&
          res.restoredState
        ) {
          const restored = res.restoredState;
          if (restored.userProfile) {
            setUserProfile(restored.userProfile);
            setShowProfileModal(false);
          }
          if (restored.vocabList?.length) setVocabList(restored.vocabList);
          if (restored.sentenceList?.length) setSentenceList(restored.sentenceList);
          if (restored.goals?.length) setGoals(restored.goals);
          if (restored.history?.length) setHistory(restored.history);
          if (typeof restored.totalRepeatsCount === 'number') {
            setTotalRepeatsCount(restored.totalRepeatsCount);
          }
          setRecoveryToast(
            res.action === 'recovered_from_folder'
              ? '연결된 로컬 동기화 폴더에서 학습 데이터와 사진을 자동 복원했습니다.'
              : '브라우저 캐시 초기화가 감지되어 IndexedDB 영구 저장소에서 학습 기록과 사진을 100% 자동 복원했습니다.'
          );
          setTimeout(() => setRecoveryToast(null), 6000);
        } else if (res.mediaUrls.momPhotoUrl || res.mediaUrls.dadPhotoUrl) {
          setUserProfile((prev) => {
            if (!prev) return prev;
            const nextMom = res.mediaUrls.momPhotoUrl || prev.momPhotoUrl;
            const nextDad = res.mediaUrls.dadPhotoUrl || prev.dadPhotoUrl;
            if (nextMom === prev.momPhotoUrl && nextDad === prev.dadPhotoUrl) return prev;
            return {
              ...prev,
              momPhotoUrl: nextMom,
              dadPhotoUrl: nextDad,
              momPhotoRef: res.mediaUrls.momPhotoUrl ? 'idb:mom_photo' : prev.momPhotoRef,
              dadPhotoRef: res.mediaUrls.dadPhotoUrl ? 'idb:dad_photo' : prev.dadPhotoRef,
            };
          });
        }

        if (res.pendingFolderRecovery?.requiresPermission) {
          setPendingFolderRecoveryName(res.pendingFolderRecovery.folderName);
        }

        bootMigrationDoneRef.current = true;
        window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
      } catch (err) {
        bootMigrationDoneRef.current = true;
        console.warn('Boot migration note:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Automatically offload any inline base64 parent photos into IndexedDB Blob storage
  useEffect(() => {
    if (!userProfile) return;
    const momRaw = userProfile.momPhotoUrl;
    const dadRaw = userProfile.dadPhotoUrl;
    const needsMom = Boolean(momRaw && momRaw.startsWith('data:'));
    const needsDad = Boolean(dadRaw && dadRaw.startsWith('data:'));
    if (!needsMom && !needsDad) return;

    const momSig = needsMom ? `mom:${momRaw!.length}:${momRaw!.slice(0, 48)}` : '';
    const dadSig = needsDad ? `dad:${dadRaw!.length}:${dadRaw!.slice(0, 48)}` : '';
    if ((needsMom && mediaOffloadInFlightRef.current.has(momSig)) && (!needsDad || mediaOffloadInFlightRef.current.has(dadSig))) {
      return;
    }

    if (needsMom) mediaOffloadInFlightRef.current.add(momSig);
    if (needsDad) mediaOffloadInFlightRef.current.add(dadSig);

    (async () => {
      try {
        const momSaved = needsMom ? await saveMediaAsset('mom_photo', momRaw!) : null;
        const dadSaved = needsDad ? await saveMediaAsset('dad_photo', dadRaw!) : null;
        if (momSaved || dadSaved) {
          setUserProfile((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              momPhotoUrl: momSaved ? momSaved.objectUrl : prev.momPhotoUrl,
              momPhotoRef: momSaved ? 'idb:mom_photo' : prev.momPhotoRef,
              dadPhotoUrl: dadSaved ? dadSaved.objectUrl : prev.dadPhotoUrl,
              dadPhotoRef: dadSaved ? 'idb:dad_photo' : prev.dadPhotoRef,
            };
          });
        }
      } catch (err) {
        console.warn('Media offload note:', err);
      }
    })();
  }, [userProfile]);

  // Debounced auto-save to IndexedDB (1.8s) and connected local sync folder (4s)
  useEffect(() => {
    const idbTimer = setTimeout(() => {
      if (!bootMigrationDoneRef.current) return;
      void saveAppStateToIndexedDb(latestStateRef.current).then(() => {
        window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
      });
    }, 1800);

    const fsTimer = setTimeout(() => {
      if (!bootMigrationDoneRef.current) return;
      void getLocalSyncStatus().then((status) => {
        if (status.isConnected && status.permissionState === 'granted') {
          void syncBundleToLocalFolder(latestStateRef.current).catch(() => {});
        }
      });
    }, 4000);

    return () => {
      clearTimeout(idbTimer);
      clearTimeout(fsTimer);
    };
  }, [vocabList, sentenceList, goals, history, totalRepeatsCount, userProfile]);

  // Instant continuous sync to local storage bootstrap copy
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
    try {
      localStorage.setItem(
        'wordloop_vocab',
        JSON.stringify(serializeCompactVocab(vocabList, DEFAULT_VOCAB))
      );
      window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
    } catch {}
  }, [vocabList]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'wordloop_sentences',
        JSON.stringify(serializeCompactSentences(sentenceList, DEFAULT_SENTENCES))
      );
      window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
    } catch {}
  }, [sentenceList]);

  useEffect(() => {
    try {
      localStorage.setItem('wordloop_goals', JSON.stringify(goals));
    } catch {}
  }, [goals]);

  useEffect(() => {
    try {
      localStorage.setItem('wordloop_history', JSON.stringify(history));
    } catch {}
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem('wordloop_total_repeats', totalRepeatsCount.toString());
    } catch {}
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
      const todayStr = getLocalDateString();
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

  // Mastery Level Handlers (Syncs SM-2 SRS metadata smoothly)
  const handleUpdateVocabMastery = useCallback((id: string, level: 0 | 1 | 2) => {
    setVocabList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const rating: SrsRating = level === 2 ? 'good' : level === 1 ? 'hard' : 'again';
        const { srs } = calculateNextSrsState(item.srs, rating, item.masteryLevel ?? 0);
        return { ...item, masteryLevel: level, isLearned: level === 2, srs };
      })
    );
  }, []);

  const handleUpdateVocabSrs = useCallback((id: string, rating: SrsRating) => {
    setVocabList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const fallback = item.masteryLevel ?? (item.isLearned ? 2 : 0);
        const { srs, masteryLevel } = calculateNextSrsState(item.srs, rating, fallback);
        return {
          ...item,
          srs,
          masteryLevel,
          isLearned: masteryLevel === 2,
          repeatCount: (item.repeatCount || 0) + 1,
        };
      })
    );
  }, []);

  const handleRoutineComplete = useCallback((reviewedCount: number) => {
    const todayStr = getLocalDateString();
    setTotalRepeatsCount((prev) => prev + reviewedCount);
    setHistory((prevHist) => {
      const idx = prevHist.findIndex((h) => h.date === todayStr);
      if (idx >= 0) {
        const next = [...prevHist];
        next[idx] = {
          ...next[idx],
          vocabStudyCount: (next[idx].vocabStudyCount || 0) + reviewedCount,
          completedGoalsCount: Math.max(1, next[idx].completedGoalsCount || 0),
          isStreakMaintained: true,
        };
        return next;
      }
      return [
        {
          date: todayStr,
          completedGoalsCount: 1,
          totalGoalsCount: goals.length || 4,
          vocabStudyCount: reviewedCount,
          isStreakMaintained: true,
        },
        ...prevHist,
      ];
    });
    setRecoveryToast(`오늘의 3분 루틴(${reviewedCount}개 단어)이 완료되어 잔디에 기록되었습니다.`);
    setTimeout(() => setRecoveryToast(null), 4000);
  }, [goals.length]);

  const handleUpdateSentenceMastery = useCallback((id: string, level: 0 | 1 | 2) => {
    setSentenceList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, masteryLevel: level, isLearned: level === 2 } : item
      )
    );
  }, []);

  // Export Entire 1-User Learning Data (Schema v2 JSON with Integrity Checksum)
  const handleExportAllData = useCallback(() => {
    exportVersionedAllDataToFile({
      userProfile,
      vocabList,
      sentenceList,
      goals,
      history,
      totalRepeatsCount,
    });
    setRecoveryToast(`v${APP_VERSION} 무결성 JSON 백업 파일이 저장되었습니다.`);
    setTimeout(() => setRecoveryToast(null), 3500);
  }, [userProfile, vocabList, sentenceList, goals, history, totalRepeatsCount]);

  // Apply Imported / Merged State cleanly & persist across all 3 storage tiers
  const handleApplyImportedState = useCallback(
    async (nextState: {
      userProfile: UserProfile | null;
      vocabList: VocabItem[];
      sentenceList: SentenceItem[];
      goals: Goal[];
      history: DailyGoalHistory[];
      totalRepeatsCount: number;
    }) => {
      let resolvedProfile = nextState.userProfile;
      if (resolvedProfile) {
        let momUrl = resolvedProfile.momPhotoUrl;
        let dadUrl = resolvedProfile.dadPhotoUrl;
        let momRef = resolvedProfile.momPhotoRef;
        let dadRef = resolvedProfile.dadPhotoRef;

        if (momUrl?.startsWith('data:')) {
          const saved = await saveMediaAsset('mom_photo', momUrl);
          if (saved) {
            momUrl = saved.objectUrl;
            momRef = 'idb:mom_photo';
          }
        }
        if (dadUrl?.startsWith('data:')) {
          const saved = await saveMediaAsset('dad_photo', dadUrl);
          if (saved) {
            dadUrl = saved.objectUrl;
            dadRef = 'idb:dad_photo';
          }
        }
        resolvedProfile = {
          ...resolvedProfile,
          momPhotoUrl: momUrl,
          dadPhotoUrl: dadUrl,
          momPhotoRef: momRef,
          dadPhotoRef: dadRef,
        };
        setUserProfile(resolvedProfile);
        setShowProfileModal(false);
      }

      if (nextState.vocabList) setVocabList(nextState.vocabList);
      if (nextState.sentenceList) setSentenceList(nextState.sentenceList);
      if (nextState.goals) setGoals(nextState.goals);
      if (nextState.history) setHistory(nextState.history);
      if (typeof nextState.totalRepeatsCount === 'number') setTotalRepeatsCount(nextState.totalRepeatsCount);

      const finalBundle = {
        userProfile: resolvedProfile,
        vocabList: nextState.vocabList,
        sentenceList: nextState.sentenceList,
        goals: nextState.goals,
        history: nextState.history,
        totalRepeatsCount: nextState.totalRepeatsCount,
      };
      await saveAppStateToIndexedDb({ ...finalBundle, forceSnapshot: true });
      try {
        const fsStatus = await getLocalSyncStatus();
        if (fsStatus.isConnected && fsStatus.permissionState === 'granted') {
          await syncBundleToLocalFolder(finalBundle, { ignoreDirtyCheck: true });
        }
      } catch {}

      window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
      setRecoveryToast('✅ 백업 데이터 적용 및 3계층 저장소 동기화가 안전하게 완료되었습니다!');
      setTimeout(() => setRecoveryToast(null), 4000);
    },
    []
  );

  // Import Entire 1-User Learning Data (.json / .json.gz) with Schema v1/v2/v3 support & smart merge
  const handleImportAllData = useCallback(
    async (file: File) => {
      try {
        const preview = await parseAndPreviewJsonBackup(file, {
          vocabList,
          sentenceList,
          goals,
          history,
          totalRepeatsCount,
        });
        const nextState = applyBackupImport(
          { userProfile, vocabList, sentenceList, goals, history, totalRepeatsCount },
          preview,
          'merge'
        );
        await handleApplyImportedState(nextState);
      } catch (e: any) {
        setRecoveryToast('백업 파일 복원 실패: ' + (e?.message || '올바른 JSON/압축 백업 파일인지 확인해주세요.'));
      }
    },
    [userProfile, vocabList, sentenceList, goals, history, totalRepeatsCount, handleApplyImportedState]
  );

  // 1-Click Folder Permission Recovery Handler
  const handleRecoverWithPendingFolder = useCallback(async () => {
    setIsRestoringFromFolder(true);
    try {
      const folderStatus = await authorizeLocalSyncFolder();
      if (folderStatus.permissionState !== 'granted') {
        setRecoveryToast('폴더 접근 권한이 허용되지 않았습니다.');
        return;
      }
      setPendingFolderRecoveryName(null);

      const hasProfileNow = Boolean(latestStateRef.current.userProfile?.name);
      const bundle = await readLatestBundleFromLocalFolder();
      if (bundle && !hasProfileNow) {
        const preview = await parseAndPreviewBackupBytes(bundle.bytes, bundle.fileName, {
          vocabList: latestStateRef.current.vocabList,
          sentenceList: latestStateRef.current.sentenceList,
          goals: latestStateRef.current.goals,
          history: latestStateRef.current.history,
          totalRepeatsCount: latestStateRef.current.totalRepeatsCount,
        });
        const nextState = applyBackupImport(latestStateRef.current, preview, 'overwrite');
        await handleApplyImportedState(nextState);
      } else {
        await syncBundleToLocalFolder(latestStateRef.current, { ignoreDirtyCheck: true });
        setRecoveryToast(`'${folderStatus.folderName}' 자동 동기화 폴더 연결이 복구되었습니다.`);
        setTimeout(() => setRecoveryToast(null), 4000);
      }
    } catch (e: any) {
      setRecoveryToast('폴더 동기화 복구 실패: ' + (e?.message || '폴더 상태를 확인해주세요.'));
    } finally {
      setIsRestoringFromFolder(false);
    }
  }, [handleApplyImportedState]);

  // Reset All Data (localStorage + IndexedDB + media cache)
  const handleResetAllData = useCallback(() => {
    localStorage.removeItem('wordloop_user_profile');
    localStorage.removeItem('wordloop_user_profile_backup');
    localStorage.removeItem('wordloop_vocab');
    localStorage.removeItem('wordloop_sentences');
    localStorage.removeItem('wordloop_goals');
    localStorage.removeItem('wordloop_history');
    localStorage.removeItem('wordloop_total_repeats');
    localStorage.removeItem('wordloop_emergency_exit_snapshot');
    localStorage.removeItem('wordloop_emergency_snapshot');
    localStorage.removeItem('wordloop_atomic_safety_ledger');
    localStorage.removeItem('wordloop_pre_import_rollback');
    localStorage.removeItem('wordloop_last_device_sync_time');
    void clearIndexedDbAppState();
    setPendingFolderRecoveryName(null);
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

  // Import Data (JSON / CSV) using Prototype-Pollution-safe parsing & non-blocking toast notifications
  const handleImportData = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      if (file.name.endsWith('.json')) {
        const rawParsed = safeJsonParse<any>(text);
        const rawPayload = rawParsed?.schemaVersion === 2 && rawParsed?.payload ? rawParsed.payload : rawParsed;
        const parsed = sanitizeDeepObject<any>(rawPayload);
        if (parsed?.userProfile) {
          setUserProfile(parsed.userProfile);
        }
        if (Array.isArray(parsed?.vocabList)) {
          setVocabList((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const newItems = parsed.vocabList.filter((i: VocabItem) => i?.id && !existingIds.has(i.id));
            return [...newItems, ...prev];
          });
        }
        if (Array.isArray(parsed?.sentenceList)) {
          setSentenceList((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const newItems = parsed.sentenceList.filter((i: SentenceItem) => i?.id && !existingIds.has(i.id));
            return [...newItems, ...prev];
          });
        }
        setRecoveryToast('JSON 데이터 복원이 안전하게 완료되었습니다!');
        setTimeout(() => setRecoveryToast(null), 3500);
      } else {
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          setRecoveryToast('가져올 데이터가 없는 빈 CSV 파일입니다.');
          setTimeout(() => setRecoveryToast(null), 3500);
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
          setRecoveryToast(`${importedVocabCount}개의 단어를 성공적으로 가져왔습니다!`);
        } else {
          setRecoveryToast('올바른 CSV 형식이 아닙니다.');
        }
        setTimeout(() => setRecoveryToast(null), 3500);
      }
    } catch (e: any) {
      setRecoveryToast('파일 가져오기 실패: ' + (e?.message || '파일 형식을 확인해주세요.'));
      setTimeout(() => setRecoveryToast(null), 4000);
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
      const data = await explainTextWithFreeAi({ text });
      const providerHeader = data.aiProvider ? `[엔진: ${data.aiProvider}]\n\n` : '';
      setAIExplanationContent(`${providerHeader}${data.explanation}`);
    } catch {
      setAIExplanationContent('AI 서비스 연결 실패. 잠시 후 다시 시도하세요.');
    } finally {
      setAIExplanationLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-24 md:pb-12">
      {/* In-App Browser (KakaoTalk/WebView) Guidance Banner */}
      <InAppBrowserBanner />

      {/* Header Navigation (3-Zone Top Bar + Mobile Thumb Bar) */}
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
        levelInfo={calculateStudentLevel({
          totalRepeatsCount,
          vocabList,
          goals,
          history,
          streakDays: userProfile?.streakDays ?? 1,
        })}
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
        onOpenRecordingHistory={() => handleOpenRecordingHistory()}
        onOpenJsonBackup={() => setShowJsonBackupModal(true)}
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
              className="p-1 rounded-lg text-emerald-300 hover:text-white transition-colors shrink-0 cursor-pointer"
              title="알림 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* 1-Click Local Folder Permission Recovery Banner */}
      {pendingFolderRecoveryName && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg pointer-events-auto"
        >
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 shadow-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <FolderSync className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  백업 폴더 권한 재확인 필요 · {pendingFolderRecoveryName}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                  브라우저 새로고침 후 폴더 자동 저장 및 복원을 재개하려면 아래 버튼을 눌러주세요.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                disabled={isRestoringFromFolder}
                onClick={handleRecoverWithPendingFolder}
                className="min-h-[36px] px-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
              >
                {isRestoringFromFolder ? '복구 중...' : '폴더 권한 허용'}
              </button>
              <button
                type="button"
                onClick={() => setPendingFolderRecoveryName(null)}
                aria-label="폴더 권한 알림 닫기"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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

      {/* 24-Hour Inactivity 3-Minute Quiz Suggestion Toast */}
      {inactivityPrompt && (
        <InactivityQuizToast
          elapsedHours={inactivityPrompt.elapsedHours}
          onStartQuiz={handleLaunch3MinQuiz}
          onClose={() => setInactivityPrompt(null)}
        />
      )}

      {/* Main Content Viewport (Fluid Top/Bottom/Left/Right Auto-Spacing) */}
      <main className={`max-w-6xl mx-auto fluid-viewport-main transition-all ${activeLoopItemId ? '!pb-28 sm:!pb-24' : ''}`}>
        
        {/* Main Landing: Minimalist Beginner Today Hub */}
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
            onStartFocusRoutine={() => setShowFocusRoutine(true)}
            onOpenJsonBackup={() => setShowJsonBackupModal(true)}
            onChangeMastery={handleUpdateVocabMastery}
          />
        )}

        <ErrorBoundary key={`${activeTab}-${homeViewMode}`}>
        <Suspense fallback={<LazyLoadingFallback />}>
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
              levelInfo={calculateStudentLevel({
                totalRepeatsCount,
                vocabList,
                goals,
                history,
                streakDays: userProfile?.streakDays ?? 1,
              })}
              onOpenProfileModal={() => setShowProfileModal(true)}
              onOpenRecordingHistory={() => handleOpenRecordingHistory()}
              onStartPronunciation={(word) => handleOpenPronunciationModal(word)}
              onChangeMastery={handleUpdateVocabMastery}
              onStartReviewQuiz={() => {
                speechService.stop();
                setInitialQuizMode('review_quiz');
                setActiveTab('quiz');
              }}
            />
          )}
        </Suspense>
        </ErrorBoundary>

      </main>

      {/* 5-Minute Healing Rest Countdown Floating Banner */}
      {breakCountdownSeconds !== null && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-24 right-4 z-40 max-w-xs w-[calc(100%-2rem)] sm:w-auto rounded-2xl bg-emerald-950/95 dark:bg-slate-900/95 text-white border border-emerald-500/40 shadow-xl backdrop-blur-md p-3.5 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-emerald-300">5분 휴식 타이머 가동 중</p>
              <p className="text-sm font-black font-mono-tabular tabular-nums text-white">
                {String(Math.floor(breakCountdownSeconds / 60)).padStart(2, '0')}:
                {String(breakCountdownSeconds % 60).padStart(2, '0')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBreakCountdownSeconds(null)}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-emerald-200 transition-colors cursor-pointer"
          >
            종료
          </button>
        </aside>
      )}

      {/* Persistent Sticky Audio Player Bar */}
      <AudioPlayerBar
        onOpenPronunciationModal={(text) => setPronunciationModalText(text)}
      />

      {/* Lazy Modals: Fetched only when opened */}
      <Suspense fallback={null}>
        {showFocusRoutine && (
          <FocusRoutinePlayer
            isOpen={showFocusRoutine}
            queue={buildTodayRoutineQueue(vocabList, 5, 3)}
            allVocab={vocabList}
            onClose={() => setShowFocusRoutine(false)}
            onUpdateVocabSrs={handleUpdateVocabSrs}
            onOpenPronunciation={handleOpenPronunciationModal}
            onRoutineComplete={(reviewedCount) => handleRoutineComplete(reviewedCount)}
          />
        )}

        {showJsonBackupModal && (
          <JsonBackupModal
            isOpen={showJsonBackupModal}
            onClose={() => setShowJsonBackupModal(false)}
            userProfile={userProfile}
            vocabList={vocabList}
            sentenceList={sentenceList}
            goals={goals}
            history={history}
            totalRepeatsCount={totalRepeatsCount}
            onApplyImportedState={handleApplyImportedState}
          />
        )}

        {showProfileModal && (
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
            }}
            onClose={() => setShowProfileModal(false)}
            onExportAllData={handleExportAllData}
            onImportAllData={handleImportAllData}
            onResetAllData={handleResetAllData}
            onOpenJsonBackup={() => setShowJsonBackupModal(true)}
          />
        )}

        {pronunciationModalText && (
          <PronunciationModal
            isOpen={Boolean(pronunciationModalText)}
            targetText={pronunciationModalText}
            userProfile={userProfile}
            onOpenProfileModal={() => {
              setPronunciationModalText(null);
              setShowProfileModal(true);
            }}
            onOpenRecordingHistory={() => handleOpenRecordingHistory(pronunciationModalText || undefined)}
            onClose={() => setPronunciationModalText(null)}
            onSuccessEvaluation={() => {
              const englishGoal = goals.find((g) => g.category === 'english');
              if (englishGoal) {
                handleIncrementGoal(englishGoal.id, 1);
              }
            }}
          />
        )}
      </Suspense>

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
                  ✨ 무료 AI가 원어민 뉘앙스와 발음 팁을 분석하고 있습니다...
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

      <Suspense fallback={null}>
        {showApiKeyModal && (
          <ApiKeyModal
            isOpen={showApiKeyModal}
            onClose={() => setShowApiKeyModal(false)}
          />
        )}

        {showPatchNotesModal && (
          <PatchNotesModal
            isOpen={showPatchNotesModal}
            onClose={() => setShowPatchNotesModal(false)}
            onOpenGitHubUpdateModal={() => {
              setShowPatchNotesModal(false);
              setShowGitHubUpdateModal(true);
            }}
          />
        )}

        {showNativeDllModal && (
          <NativeDllDocsModal
            isOpen={showNativeDllModal}
            onClose={() => setShowNativeDllModal(false)}
          />
        )}

        {showGitHubUpdateModal && (
          <GitHubUpdateModal
            isOpen={showGitHubUpdateModal}
            onClose={() => setShowGitHubUpdateModal(false)}
            updateData={updateData}
            onRefreshCheck={handleRefreshUpdateCheck}
            isChecking={isCheckingUpdate}
          />
        )}

        {showDailyQuestModal && (
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
        )}

        {showAddToHomeModal && (
          <AddToHomeScreenModal
            isOpen={showAddToHomeModal}
            onClose={() => setShowAddToHomeModal(false)}
          />
        )}

        {showAudioSettingsModal && (
          <AudioSettingsModal
            isOpen={showAudioSettingsModal}
            onClose={() => setShowAudioSettingsModal(false)}
          />
        )}

        {showRecordingHistoryModal && (
          <RecordingHistoryModal
            isOpen={showRecordingHistoryModal}
            onClose={() => setShowRecordingHistoryModal(false)}
            initialSelectedTarget={recordingHistoryInitialTarget}
            onOpenPronunciationPractice={(text) => {
              setShowRecordingHistoryModal(false);
              handleOpenPronunciationModal(text);
            }}
          />
        )}

        {showCurriculumModalFromApp && (
          <CurriculumExplorerModal
            isOpen={showCurriculumModalFromApp}
            onClose={() => setShowCurriculumModalFromApp(false)}
            onAddVocabItems={handleAddAIItems}
            existingVocabList={vocabList}
            showEduTag={true}
          />
        )}

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
      </Suspense>

      {/* Global Level-Up / Milestone Celebration Confetti & Banner Canvas Overlay */}
      <ConfettiCanvas />

    </div>
  );
}
