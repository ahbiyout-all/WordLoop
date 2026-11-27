import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import {
  Gamepad2,
  Trophy,
  Sparkles,
  Timer,
  Flame,
  Zap,
  RotateCcw,
  Volume2,
  Award,
  Star,
  Brain,
  CheckCircle2,
  HelpCircle,
  Play,
  ArrowRight,
  ShieldCheck,
  Boxes,
  Grid,
  Layers,
  Music,
  X,
  ArrowLeft,
  Settings,
  SlidersHorizontal,
  Check,
  Shuffle,
  RefreshCw,
  Puzzle,
  Headphones,
  ShieldAlert,
  Mic,
  MessageSquare,
  BookOpen,
  Camera,
  Compass,
  Activity
} from 'lucide-react';
import { VocabItem, SentenceItem, QAMode, UserProfile } from '../types';
import { OFFICIAL_CURRICULUM_3000_LIST } from '../data/officialCurriculum3000';
import { DEFAULT_SENTENCES } from '../data/defaultVocab';
import { speechService } from '../services/speechService';
import { recordGameDone } from '../services/habitQuestService';
import { confettiService } from '../services/confettiService';
import { ComboFeedbackOverlay } from './ComboFeedbackOverlay';
import { getCleanKoreanMeaning, getEnglishDefinition, QA_MODES_CONFIG } from '../utils/meaningUtils';
import { QAModeSelector } from './QAModeSelector';
import { LazyLoadingFallback } from './LazyLoadingFallback';
import { SrsRating, getDailySrsSummary } from '../services/srsEngineService';
import {
  buildAdaptiveVocabQueue,
  buildAdaptiveSentenceQueue,
  selectZpdDistractors,
  recordCognitiveAttempt,
  loadCognitiveStats,
  calculateCalibrationSummary,
  getZpdProfile,
  shuffleFisherYates,
  playCognitiveCueSound,
  maskTargetWordInSentence,
  COGNITIVE_UPDATED_EVENT,
  WordLoopCognitiveStats,
} from '../services/cognitiveGameEngine';
import { GameScaffoldingBar } from './GameScaffoldingBar';
import { rewardPetStudyAction } from '../services/petCompanionService';

const WordMatchGame = React.lazy(() => import('./WordMatchGame').then((m) => ({ default: m.WordMatchGame })));
const CrosswordGame = React.lazy(() => import('./CrosswordGame').then((m) => ({ default: m.CrosswordGame })));
const WordBlockGame = React.lazy(() => import('./WordBlockGame').then((m) => ({ default: m.WordBlockGame })));
const SwipeMatchGame = React.lazy(() => import('./SwipeMatchGame').then((m) => ({ default: m.SwipeMatchGame })));
const BubblePopGame = React.lazy(() => import('./BubblePopGame').then((m) => ({ default: m.BubblePopGame })));
const RhythmWordGame = React.lazy(() => import('./RhythmWordGame').then((m) => ({ default: m.RhythmWordGame })));
const SentenceScrambleGame = React.lazy(() => import('./SentenceGames/SentenceScrambleGame').then((m) => ({ default: m.SentenceScrambleGame })));
const SentenceListeningFillGame = React.lazy(() => import('./SentenceGames/SentenceListeningFillGame').then((m) => ({ default: m.SentenceListeningFillGame })));
const SentenceSpeedRushGame = React.lazy(() => import('./SentenceGames/SentenceSpeedRushGame').then((m) => ({ default: m.SentenceSpeedRushGame })));
const SentenceTrueFalseGame = React.lazy(() => import('./SentenceGames/SentenceTrueFalseGame').then((m) => ({ default: m.SentenceTrueFalseGame })));
const SentenceShadowingGame = React.lazy(() => import('./SentenceGames/SentenceShadowingGame').then((m) => ({ default: m.SentenceShadowingGame })));
const FlashcardRecallGame = React.lazy(() => import('./FlashcardRecallGame').then((m) => ({ default: m.FlashcardRecallGame })));
const MetacognitiveDuelGame = React.lazy(() => import('./MetacognitiveDuelGame').then((m) => ({ default: m.MetacognitiveDuelGame })));
const ScaffoldedContextGame = React.lazy(() => import('./ScaffoldedContextGame').then((m) => ({ default: m.ScaffoldedContextGame })));
import {
  DEFAULT_MOM_PHOTO,
  DEFAULT_DAD_PHOTO,
  processImageFileToDataUrl,
} from '../utils/parentPhotoUtils';

interface StudentWordGameProps {
  vocabList: VocabItem[];
  sentenceList?: SentenceItem[];
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onUpdateVocabSrs?: (id: string, rating: SrsRating) => void;
  onSelectGame?: (game: GameType) => void;
  initialGame?: GameType | null;
  userProfile?: UserProfile | null;
  onOpenProfileModal?: () => void;
  onSaveProfile?: (profile: UserProfile) => void;
}

type SchoolGrade = 'all' | 'elementary' | 'middle' | 'high_sat';
export type GameType =
  | 'metacognitive_duel'
  | 'context_decoder'
  | 'flashcard_recall'
  | 'memory'
  | 'spelling'
  | 'speed'
  | 'crossword'
  | 'block'
  | 'swipe'
  | 'bubble'
  | 'rhythm'
  | 'sentence_scramble'
  | 'sentence_listening'
  | 'sentence_speed'
  | 'sentence_truefalse'
  | 'sentence_shadowing';

// Module-level static official words map to guarantee object stability
const STATIC_OFFICIAL_WORDS_BY_GRADE: Record<SchoolGrade, VocabItem[]> = {
  all: OFFICIAL_CURRICULUM_3000_LIST.map((v, idx) => ({
    id: `game-offic-all-${idx}`,
    word: v.word,
    ipa: v.ipa || '',
    meaning: v.meaning,
    partOfSpeech: v.partOfSpeech || 'n.',
    sentence: v.sentence || '',
    sentenceMeaning: v.sentenceMeaning || '',
    categoryId: (v.categoryId || 'elementary') as SchoolGrade,
    masteryLevel: 0 as 0 | 1 | 2,
  })),
  elementary: OFFICIAL_CURRICULUM_3000_LIST
    .filter((v) => v.categoryId === 'elementary')
    .map((v, idx) => ({
      id: `game-offic-elementary-${idx}`,
      word: v.word,
      ipa: v.ipa || '',
      meaning: v.meaning,
      partOfSpeech: v.partOfSpeech || 'n.',
      sentence: v.sentence || '',
      sentenceMeaning: v.sentenceMeaning || '',
      categoryId: 'elementary' as SchoolGrade,
      masteryLevel: 0 as 0 | 1 | 2,
    })),
  middle: OFFICIAL_CURRICULUM_3000_LIST
    .filter((v) => v.categoryId === 'middle')
    .map((v, idx) => ({
      id: `game-offic-middle-${idx}`,
      word: v.word,
      ipa: v.ipa || '',
      meaning: v.meaning,
      partOfSpeech: v.partOfSpeech || 'n.',
      sentence: v.sentence || '',
      sentenceMeaning: v.sentenceMeaning || '',
      categoryId: 'middle' as SchoolGrade,
      masteryLevel: 0 as 0 | 1 | 2,
    })),
  high_sat: OFFICIAL_CURRICULUM_3000_LIST
    .filter((v) => v.categoryId === 'high_sat')
    .map((v, idx) => ({
      id: `game-offic-high_sat-${idx}`,
      word: v.word,
      ipa: v.ipa || '',
      meaning: v.meaning,
      partOfSpeech: v.partOfSpeech || 'n.',
      sentence: v.sentence || '',
      sentenceMeaning: v.sentenceMeaning || '',
      categoryId: 'high_sat' as SchoolGrade,
      masteryLevel: 0 as 0 | 1 | 2,
    })),
};

const STATIC_OFFICIAL_SENTENCES_BY_GRADE: Record<SchoolGrade, SentenceItem[]> = {
  all: DEFAULT_SENTENCES,
  elementary: DEFAULT_SENTENCES.filter((s) => s.categoryId === 'elementary'),
  middle: DEFAULT_SENTENCES.filter((s) => s.categoryId === 'middle'),
  high_sat: DEFAULT_SENTENCES.filter((s) => s.categoryId === 'high_sat'),
};

export const StudentWordGame: React.FC<StudentWordGameProps> = ({
  vocabList,
  sentenceList = [],
  onChangeMastery,
  onUpdateVocabSrs,
  onSelectGame,
  initialGame,
  userProfile,
  onOpenProfileModal,
  onSaveProfile,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<SchoolGrade>('elementary');
  const [gameCategory, setGameCategory] = useState<'word' | 'sentence'>('word');
  const [activeGame, setActiveGame] = useState<GameType>('memory');
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [lastPlayedGame, setLastPlayedGame] = useState<GameType | null>(null);
  const [qaMode, setQaMode] = useState<QAMode>('ko_to_en');
  const [showGameOptionsModal, setShowGameOptionsModal] = useState<boolean>(false);
  const [focusSrsPriority, setFocusSrsPriority] = useState<boolean>(true);
  const [cognitiveStats, setCognitiveStats] = useState<WordLoopCognitiveStats>(() =>
    loadCognitiveStats()
  );

  useEffect(() => {
    const syncStats = () => setCognitiveStats(loadCognitiveStats());
    window.addEventListener(COGNITIVE_UPDATED_EVENT, syncStats);
    return () => window.removeEventListener(COGNITIVE_UPDATED_EVENT, syncStats);
  }, []);

  // Mandatory Mom & Dad photo registration check
  const hasParentPhotos = Boolean(userProfile?.momPhotoUrl && userProfile?.dadPhotoUrl);
  const [showPhotoReqModal, setShowPhotoReqModal] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handleAutoRegisterPresetParents = () => {
    if (!onSaveProfile) {
      if (onOpenProfileModal) onOpenProfileModal();
      return;
    }
    const base: UserProfile = userProfile || {
      id: 'user-primary-owner',
      name: '나의 학습자',
      avatar: '🎓',
      grade: 'high',
      dailyWordGoal: 20,
      motto: '매일 조금씩 꾸준히!',
      createdAt: new Date().toISOString(),
      isLocked: true,
    };
    const updated: UserProfile = {
      ...base,
      momPhotoUrl: base.momPhotoUrl || DEFAULT_MOM_PHOTO,
      dadPhotoUrl: base.dadPhotoUrl || DEFAULT_DAD_PHOTO,
      lastSavedToDeviceAt: new Date().toISOString(),
      savedToDeviceCount: (base.savedToDeviceCount || 0) + 1,
    };
    onSaveProfile(updated);
    setShowPhotoReqModal(false);
    if (selectedGame) {
      handleGameChange(selectedGame);
    }
  };

  const handleModalMomPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSaveProfile) {
      try {
        const dataUrl = await processImageFileToDataUrl(file, 480, 0.82);
        const base: UserProfile = userProfile || {
          id: 'user-primary-owner',
          name: '나의 학습자',
          avatar: '🎓',
          grade: 'high',
          dailyWordGoal: 20,
          motto: '매일 조금씩 꾸준히!',
          createdAt: new Date().toISOString(),
          isLocked: true,
        };
        const updated: UserProfile = {
          ...base,
          momPhotoUrl: dataUrl,
          lastSavedToDeviceAt: new Date().toISOString(),
          savedToDeviceCount: (base.savedToDeviceCount || 0) + 1,
        };
        onSaveProfile(updated);
        setPhotoError(null);
      } catch (err: any) {
        setPhotoError(err?.message || '사진 업로드 실패');
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleModalDadPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSaveProfile) {
      try {
        const dataUrl = await processImageFileToDataUrl(file, 480, 0.82);
        const base: UserProfile = userProfile || {
          id: 'user-primary-owner',
          name: '나의 학습자',
          avatar: '🎓',
          grade: 'high',
          dailyWordGoal: 20,
          motto: '매일 조금씩 꾸준히!',
          createdAt: new Date().toISOString(),
          isLocked: true,
        };
        const updated: UserProfile = {
          ...base,
          dadPhotoUrl: dataUrl,
          lastSavedToDeviceAt: new Date().toISOString(),
          savedToDeviceCount: (base.savedToDeviceCount || 0) + 1,
        };
        onSaveProfile(updated);
        setPhotoError(null);
      } catch (err: any) {
        setPhotoError(err?.message || '사진 업로드 실패');
      }
    }
    if (e.target) e.target.value = '';
  };

  // Auto open initial game if provided
  useEffect(() => {
    if (initialGame) {
      if (!hasParentPhotos) {
        setShowPhotoReqModal(true);
        setSelectedGame(null);
        return;
      }
      const isSentence = initialGame.startsWith('sentence_');
      setGameCategory(isSentence ? 'sentence' : 'word');
      setActiveGame(initialGame);
      setSelectedGame(initialGame);
      setLastPlayedGame(initialGame);
    }
  }, [initialGame, hasParentPhotos]);

  const handleGameChange = useCallback((game: GameType) => {
    speechService.stop();
    const isSentence = game.startsWith('sentence_');
    setGameCategory(isSentence ? 'sentence' : 'word');
    setActiveGame(game);
    setLastPlayedGame(game);
    if (onSelectGame) {
      onSelectGame(game);
    }
  }, [onSelectGame]);

  const handleOpenGame = useCallback((game: GameType) => {
    speechService.stop();
    if (!hasParentPhotos) {
      setShowPhotoReqModal(true);
      return;
    }
    setLastPlayedGame(game);
    setSelectedGame(game);
    handleGameChange(game);
  }, [handleGameChange, hasParentPhotos]);

  const handleCloseGame = useCallback(() => {
    speechService.stop();
    const targetGame = activeGame;
    const isSentence = targetGame.startsWith('sentence_');
    setGameCategory(isSentence ? 'sentence' : 'word');
    setLastPlayedGame(targetGame);
    setSelectedGame(null);
  }, [activeGame]);

  // When returning to the Game Selection Catalog, scroll directly to the card of the game just played
  useEffect(() => {
    if (selectedGame === null && lastPlayedGame) {
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          const cardEl = document.getElementById(`game-catalog-card-${lastPlayedGame}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [selectedGame, lastPlayedGame, gameCategory]);

  useEffect(() => {
    return () => {
      speechService.stop();
    };
  }, []);

  // Compute a stable key for user vocabList word IDs for selectedGrade
  const userWordsGradeKey = useMemo(() => {
    if (selectedGrade === 'all') {
      return vocabList.map((v) => v.id).join(',');
    }
    return vocabList
      .filter((v) => v.categoryId === selectedGrade)
      .map((v) => v.id)
      .join(',');
  }, [vocabList, selectedGrade]);

  // Deduplicated word bank for selected grade preserving user SRS IDs
  const currentGradeWords = useMemo(() => {
    const dedupByWord = (primary: VocabItem[], fallback: VocabItem[]) => {
      const map = new Map<string, VocabItem>();
      for (const item of primary) {
        if (item.word) map.set(item.word.toLowerCase(), item);
      }
      for (const item of fallback) {
        if (item.word && !map.has(item.word.toLowerCase())) {
          map.set(item.word.toLowerCase(), item);
        }
      }
      return Array.from(map.values());
    };

    if (selectedGrade === 'all') {
      const officialAll = STATIC_OFFICIAL_WORDS_BY_GRADE['all'] || [];
      return vocabList.length > 0 ? dedupByWord(vocabList, officialAll) : officialAll;
    }
    const filteredUser = vocabList.filter((v) => v.categoryId === selectedGrade);
    if (filteredUser.length >= 8) return filteredUser;

    const officialFiltered = STATIC_OFFICIAL_WORDS_BY_GRADE[selectedGrade] || [];
    return dedupByWord(filteredUser, officialFiltered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, userWordsGradeKey]);

  const srsSummary = useMemo(() => getDailySrsSummary(vocabList), [vocabList]);

  const adaptiveGradeWords = useMemo(() => {
    return buildAdaptiveVocabQueue(
      currentGradeWords,
      cognitiveStats,
      currentGradeWords.length,
      focusSrsPriority ? 'weak_only' : 'adaptive'
    );
  }, [currentGradeWords, cognitiveStats, focusSrsPriority]);

  const userSentencesGradeKey = useMemo(() => {
    if (selectedGrade === 'all') {
      return sentenceList.map((s) => s.id).join(',');
    }
    return sentenceList
      .filter((s) => s.categoryId === selectedGrade)
      .map((s) => s.id)
      .join(',');
  }, [sentenceList, selectedGrade]);

  // Unified sentence bank for selected grade
  const currentGradeSentences = useMemo(() => {
    const officialFiltered = STATIC_OFFICIAL_SENTENCES_BY_GRADE[selectedGrade] || STATIC_OFFICIAL_SENTENCES_BY_GRADE['all'] || [];
    const userFiltered = selectedGrade === 'all'
      ? sentenceList
      : sentenceList.filter((s) => s.categoryId === selectedGrade);

    // Merge and deduplicate by clean text
    const map = new Map<string, SentenceItem>();
    for (const item of [...userFiltered, ...officialFiltered]) {
      if (item && item.text && item.text.trim().length >= 3) {
        const key = item.text.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, item);
        }
      }
    }
    const merged = Array.from(map.values());
    return merged.length > 0 ? merged : officialFiltered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, userSentencesGradeKey]);

  const adaptiveGradeSentences = useMemo(
    () => buildAdaptiveSentenceQueue(currentGradeSentences),
    [currentGradeSentences]
  );

  // Shared cognitive telemetry + SM-2 SRS bridge for all word games
  const handleSharedGameMastery = useCallback(
    (id: string, level: 0 | 1 | 2) => {
      const target =
        vocabList.find((v) => v.id === id) ||
        currentGradeWords.find((v) => v.id === id);
      const isCorrect = level >= 1;
      const evalResult = recordCognitiveAttempt({
        itemId: id,
        isCorrect,
        latencyMs: cognitiveStats.avgLatencyMs || 2400,
        hintTierUsed: level === 1 ? 2 : 0,
        confidence: level >= 1 ? 'sure' : 'unsure',
        srsState: target?.srs,
        fallbackMastery: target?.masteryLevel ?? 0,
      });
      if (onUpdateVocabSrs && target && vocabList.some((v) => v.id === id)) {
        onUpdateVocabSrs(id, evalResult.srsRating);
      } else if (onChangeMastery) {
        onChangeMastery(id, level);
      }
    },
    [vocabList, currentGradeWords, cognitiveStats.avgLatencyMs, onUpdateVocabSrs, onChangeMastery]
  );

  // High Scores in LocalStorage
  const getHighScoreKey = useCallback((game: GameType, grade: SchoolGrade) => `wordloop_game_score_${game}_${grade}`, []);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem(getHighScoreKey('memory', 'elementary'));
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    const saved = localStorage.getItem(getHighScoreKey(activeGame, selectedGrade));
    setHighScore(saved ? parseInt(saved, 10) : 0);
  }, [activeGame, selectedGrade, getHighScoreKey]);

  const updateHighScore = useCallback((score: number) => {
    // Record game done for Daily 3-minute Quest & Pet Companion study rewards (cooldown-guarded)
    recordGameDone();
    rewardPetStudyAction('game_round', { score });
    const saved = localStorage.getItem(getHighScoreKey(activeGame, selectedGrade));
    const currentMax = saved ? parseInt(saved, 10) : 0;
    if (score > currentMax) {
      localStorage.setItem(getHighScoreKey(activeGame, selectedGrade), score.toString());
      setHighScore(score);
    }
  }, [activeGame, selectedGrade, getHighScoreKey]);

  // ==========================================
  // GAME 2: SPELLING UNSCRAMBLE BUBBLE (ZPD + 3-Tier Scaffolding)
  // ==========================================
  const [spellingPool, setSpellingPool] = useState<VocabItem[]>([]);
  const [spellingIndex, setSpellingIndex] = useState(0);
  const [spellingScore, setSpellingScore] = useState(0);
  const [userLetters, setUserLetters] = useState<string[]>([]);
  const [availableBubbles, setAvailableBubbles] = useState<{ id: string; letter: string; isUsed: boolean }[]>([]);
  const [spellingResult, setSpellingResult] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [spellingHintTier, setSpellingHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [spellingFluencyNote, setSpellingFluencyNote] = useState<string | null>(null);
  const spellingStartRef = useRef<number>(Date.now());

  const currentSpellingItem = useMemo(() => {
    if (spellingPool.length > 0) {
      return spellingPool[spellingIndex % spellingPool.length];
    }
    return adaptiveGradeWords[spellingIndex % (adaptiveGradeWords.length || 1)];
  }, [spellingPool, spellingIndex, adaptiveGradeWords]);

  const initSpellingRound = (item: VocabItem) => {
    if (!item) return;
    const cleanWord = item.word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const letters = cleanWord.split('');

    const zpd = getZpdProfile(cognitiveStats.zpdLevel);
    const extraChars = 'abcdefghijklmnopqrstuvwxyz';
    const noiseCount =
      selectedGrade === 'elementary'
        ? Math.min(1, zpd.extraSpellingNoise)
        : zpd.extraSpellingNoise;
    for (let k = 0; k < noiseCount && letters.length < 10; k++) {
      letters.push(extraChars[Math.floor(Math.random() * extraChars.length)]);
    }

    const bubbles = shuffleFisherYates(
      letters.map((char, i) => ({
        id: `${char}-${i}-${Math.random()}`,
        letter: char,
        isUsed: false,
      }))
    );

    setAvailableBubbles(bubbles);
    setUserLetters([]);
    setSpellingResult('idle');
    setSpellingHintTier(0);
    setSpellingFluencyNote(null);
    spellingStartRef.current = Date.now();
  };

  const handleBubbleClick = (bubbleId: string, letter: string) => {
    if (spellingResult === 'correct') return;

    speechService.speakOnce(letter);

    setAvailableBubbles((prev) =>
      prev.map((b) => (b.id === bubbleId ? { ...b, isUsed: true } : b))
    );
    setUserLetters((prev) => [...prev, letter]);
  };

  const handleRemoveLetter = (indexToRemove: number) => {
    if (spellingResult === 'correct') return;
    const removedLetter = userLetters[indexToRemove];

    if (removedLetter) {
      speechService.speakOnce(removedLetter);
    }

    setUserLetters((prev) => prev.filter((_, idx) => idx !== indexToRemove));

    // Restore first matching used bubble
    setAvailableBubbles((prev) => {
      let restored = false;
      return prev.map((b) => {
        if (!restored && b.isUsed && b.letter === removedLetter) {
          restored = true;
          return { ...b, isUsed: false };
        }
        return b;
      });
    });
  };

  const checkSpellingAnswer = () => {
    if (!currentSpellingItem) return;
    const targetWord = currentSpellingItem.word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const userWord = userLetters.join('').toLowerCase();
    const latencyMs = Date.now() - spellingStartRef.current;

    if (userWord === targetWord) {
      setSpellingResult('correct');
      const evalRes = recordCognitiveAttempt({
        itemId: currentSpellingItem.id,
        isCorrect: true,
        latencyMs,
        hintTierUsed: spellingHintTier,
        confidence: spellingHintTier <= 1 ? 'sure' : 'unsure',
        srsState: currentSpellingItem.srs,
        fallbackMastery: currentSpellingItem.masteryLevel ?? 0,
      });
      setSpellingFluencyNote(`${evalRes.fluencyLabel} · SRS ${evalRes.srsRating.toUpperCase()}`);
      playCognitiveCueSound(evalRes.zpdChanged === 'up' ? 'zpd_up' : 'correct');

      const addPts = Math.max(8, 25 - spellingHintTier * 5);
      setSpellingScore((prev) => {
        const nextScore = prev + addPts;
        updateHighScore(nextScore);
        return nextScore;
      });
      speechService.playItem(currentSpellingItem.id, currentSpellingItem.word, undefined, 1);

      if (onUpdateVocabSrs && vocabList.some((v) => v.id === currentSpellingItem.id)) {
        onUpdateVocabSrs(currentSpellingItem.id, evalRes.srsRating);
      } else if (onChangeMastery) {
        onChangeMastery(currentSpellingItem.id, evalRes.nextMastery);
      }
    } else {
      setSpellingResult('wrong');
      playCognitiveCueSound('illusion');
      recordCognitiveAttempt({
        itemId: currentSpellingItem.id,
        isCorrect: false,
        latencyMs,
        hintTierUsed: spellingHintTier,
        confidence: 'sure',
        srsState: currentSpellingItem.srs,
        fallbackMastery: currentSpellingItem.masteryLevel ?? 0,
      });
      if (onUpdateVocabSrs && vocabList.some((v) => v.id === currentSpellingItem.id)) {
        onUpdateVocabSrs(currentSpellingItem.id, 'again');
      }
      setTimeout(() => setSpellingResult('idle'), 900);
    }
  };

  const nextSpellingRound = () => {
    let pool = spellingPool;
    let nextIdx = spellingIndex + 1;
    if (pool.length === 0 || nextIdx >= pool.length) {
      pool = buildAdaptiveVocabQueue(
        currentGradeWords,
        loadCognitiveStats(),
        currentGradeWords.length,
        focusSrsPriority ? 'weak_only' : 'adaptive'
      );
      setSpellingPool(pool);
      nextIdx = 0;
    }
    setSpellingIndex(nextIdx);
    const nextItem = pool[nextIdx];
    if (nextItem) {
      initSpellingRound(nextItem);
    }
  };

  const shuffleToNewRandomWord = () => {
    let pool = spellingPool;
    if (pool.length <= 1) {
      pool = buildAdaptiveVocabQueue(
        currentGradeWords,
        loadCognitiveStats(),
        currentGradeWords.length,
        focusSrsPriority ? 'weak_only' : 'adaptive'
      );
      setSpellingPool(pool);
    }
    const nextIdx = (spellingIndex + 1) % (pool.length || 1);
    setSpellingIndex(nextIdx);
    const nextItem = pool[nextIdx] || currentGradeWords[0];
    if (nextItem) {
      initSpellingRound(nextItem);
    }
  };

  // ==========================================
  // GAME 3: SPEED TIME-ATTACK CHALLENGE (ZPD Latency + Distractors)
  // ==========================================
  const [speedPool, setSpeedPool] = useState<VocabItem[]>([]);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [speedScore, setSpeedScore] = useState(0);
  const [speedCombo, setSpeedCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [isSpeedPlaying, setIsSpeedPlaying] = useState(false);
  const [isSpeedGameOver, setIsSpeedGameOver] = useState(false);
  const [speedOptions, setSpeedOptions] = useState<string[]>([]);
  const [speedMissedItems, setSpeedMissedItems] = useState<VocabItem[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speedQuestionStartRef = useRef<number>(Date.now());

  const currentSpeedItem = useMemo(() => {
    if (speedPool.length > 0) {
      return speedPool[speedIndex % speedPool.length];
    }
    return currentGradeWords[speedIndex % (currentGradeWords.length || 1)];
  }, [speedPool, speedIndex, currentGradeWords]);

  const getSpeedTargetAndOptions = useCallback((target: VocabItem, poolWords?: VocabItem[]) => {
    if (!target) return { prompt: '', subtext: '', options: [] as string[], correct: '' };
    const sourcePool = poolWords && poolWords.length >= 4 ? poolWords : currentGradeWords;
    if (qaMode === 'ko_to_en') {
      const correct = target.word;
      const distractors = selectZpdDistractors(
        target,
        sourcePool,
        cognitiveStats.zpdLevel,
        3,
        (v) => v.word
      );
      return {
        prompt: `"${getCleanKoreanMeaning(target)}"`,
        subtext: '한국어 뜻에 맞는 올바른 영단어는?',
        options: shuffleFisherYates([correct, ...distractors.map((d) => d.word)]),
        correct,
      };
    } else if (qaMode === 'en_def_to_en') {
      const correct = target.word;
      const distractors = selectZpdDistractors(
        target,
        sourcePool,
        cognitiveStats.zpdLevel,
        3,
        (v) => v.word
      );
      return {
        prompt: `"${getEnglishDefinition(target)}"`,
        subtext: '영영 정의에 맞는 올바른 영단어는?',
        options: shuffleFisherYates([correct, ...distractors.map((d) => d.word)]),
        correct,
      };
    } else {
      const correct = getCleanKoreanMeaning(target);
      const distractors = selectZpdDistractors(
        target,
        sourcePool,
        cognitiveStats.zpdLevel,
        3,
        (v) => getCleanKoreanMeaning(v)
      );
      return {
        prompt: target.word,
        subtext: target.ipa ? `[${target.ipa}] 뜻에 맞는 올바른 한국어는?` : '단어 뜻에 맞는 올바른 한국어는?',
        options: shuffleFisherYates([correct, ...distractors.map((d) => getCleanKoreanMeaning(d))]),
        correct,
      };
    }
  }, [currentGradeWords, qaMode, cognitiveStats.zpdLevel]);

  const startSpeedGame = (customSubset?: VocabItem[]) => {
    const zpd = getZpdProfile(loadCognitiveStats().zpdLevel);
    const curated = customSubset && customSubset.length >= 4
      ? shuffleFisherYates(customSubset)
      : buildAdaptiveVocabQueue(
          currentGradeWords,
          loadCognitiveStats(),
          currentGradeWords.length,
          focusSrsPriority ? 'weak_only' : 'adaptive'
        );
    setSpeedPool(curated);
    setSpeedMissedItems([]);
    setIsSpeedPlaying(true);
    setIsSpeedGameOver(false);
    setSpeedScore(0);
    setSpeedCombo(0);
    setTimeLeft(Math.round(25 * zpd.timeBonusFactor));
    setSpeedIndex(0);
    speedQuestionStartRef.current = Date.now();

    const firstItem = curated[0] || currentGradeWords[0];
    if (firstItem) {
      const q = getSpeedTargetAndOptions(firstItem, currentGradeWords);
      setSpeedOptions(q.options);
    }
  };

  useEffect(() => {
    if (isSpeedPlaying) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsSpeedPlaying(false);
            setIsSpeedGameOver(true);
            if (speedScore > 50) {
              confettiService.fireSideCannons();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSpeedPlaying]);

  const handleSpeedAnswer = (selectedChoice: string) => {
    if (!isSpeedPlaying || !currentSpeedItem) return;

    const latencyMs = Date.now() - speedQuestionStartRef.current;
    const currentQ = getSpeedTargetAndOptions(currentSpeedItem, currentGradeWords);
    const isCorrect = selectedChoice === currentQ.correct;

    const evalRes = recordCognitiveAttempt({
      itemId: currentSpeedItem.id,
      isCorrect,
      latencyMs,
      hintTierUsed: 0,
      confidence: 'sure',
      srsState: currentSpeedItem.srs,
      fallbackMastery: currentSpeedItem.masteryLevel ?? 0,
    });

    if (onUpdateVocabSrs && vocabList.some((v) => v.id === currentSpeedItem.id)) {
      onUpdateVocabSrs(currentSpeedItem.id, evalRes.srsRating);
    } else if (onChangeMastery) {
      onChangeMastery(currentSpeedItem.id, isCorrect ? evalRes.nextMastery : 0);
    }

    if (isCorrect) {
      const comboMultiplier = Math.min(speedCombo + 1, 5);
      const pts = 10 * comboMultiplier;
      const nextS = speedScore + pts;
      const nextCombo = speedCombo + 1;
      setSpeedScore(nextS);
      updateHighScore(nextS);
      setSpeedCombo(nextCombo);

      if (nextCombo === 3 || nextCombo === 5 || nextCombo % 5 === 0) {
        confettiService.fire({ particleCount: 35, spread: 60 });
      }
      if (nextCombo % 3 === 0) {
        setTimeLeft((prev) => Math.min(prev + 3, 30));
      }
    } else {
      setSpeedCombo(0);
      setTimeLeft((prev) => Math.max(prev - 2, 0));
      setSpeedMissedItems((prev) =>
        prev.some((p) => p.id === currentSpeedItem.id) ? prev : [...prev, currentSpeedItem]
      );
    }

    let pool = speedPool;
    let nextIdx = speedIndex + 1;
    if (pool.length === 0 || nextIdx >= pool.length) {
      pool = buildAdaptiveVocabQueue(
        currentGradeWords,
        loadCognitiveStats(),
        currentGradeWords.length,
        focusSrsPriority ? 'weak_only' : 'adaptive'
      );
      setSpeedPool(pool);
      nextIdx = 0;
    }
    setSpeedIndex(nextIdx);
    speedQuestionStartRef.current = Date.now();
    const nextItem = pool[nextIdx];
    if (nextItem) {
      const nextQ = getSpeedTargetAndOptions(nextItem, currentGradeWords);
      setSpeedOptions(nextQ.options);
    }
  };

  // Re-init current game whenever grade or game tab changes
  useEffect(() => {
    if (activeGame === 'spelling') {
      const curated = buildAdaptiveVocabQueue(
        currentGradeWords,
        loadCognitiveStats(),
        currentGradeWords.length,
        focusSrsPriority ? 'weak_only' : 'adaptive'
      );
      setSpellingPool(curated);
      setSpellingIndex(0);
      setSpellingScore(0);
      if (curated.length > 0) {
        initSpellingRound(curated[0]);
      }
    } else if (activeGame === 'speed') {
      setIsSpeedPlaying(false);
      setIsSpeedGameOver(false);
      setSpeedScore(0);
      setTimeLeft(25);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGame, selectedGrade]);

  const wordGamesCatalog = [
    {
      id: 'metacognitive_duel' as GameType,
      title: '🧠 메타인지 확신도 결투',
      badge: 'JOL 캘리브레이션',
      desc: '확신도 체크로 아는 착각과 운 좋은 정답을 잡아내는 인지과학 게임',
      icon: <Activity className="w-6 h-6 text-indigo-500" />,
    },
    {
      id: 'context_decoder' as GameType,
      title: '🧬 문맥·어근 3단계 추론',
      badge: '단계적 비계 추론',
      desc: '문맥 예문과 음운·형태소 단서를 단계별로 열며 단어를 추론',
      icon: <Compass className="w-6 h-6 text-teal-500" />,
    },
    {
      id: 'flashcard_recall' as GameType,
      title: '📇 플래시카드 리콜',
      badge: '4지선다 리콜',
      desc: 'SM-2 복습 우선순위에 맞춘 4지선다 인출 연습 및 암기 승급',
      icon: <BookOpen className="w-6 h-6 text-emerald-500" />,
    },
    {
      id: 'memory' as GameType,
      title: '🃏 단어 짝맞추기',
      badge: '메모리 카드',
      desc: '영어 단어와 한국어 뜻 카드를 뒤집어 짝을 맞추는 게임',
      icon: <Boxes className="w-6 h-6 text-indigo-500" />,
    },
    {
      id: 'spelling' as GameType,
      title: '✏️ 스펠링 완성 퀴즈',
      badge: '스펠링 빌더',
      desc: '3단계 비계 힌트와 함께 알파벳 블록을 조합해 단어 완성',
      icon: <Brain className="w-6 h-6 text-emerald-500" />,
    },
    {
      id: 'speed' as GameType,
      title: '⚡ 스피드 타임어택',
      badge: '순발력 25초',
      desc: 'ZPD 적응형 보기와 함께 반응속도 자동화를 기르는 타임어택',
      icon: <Timer className="w-6 h-6 text-rose-500" />,
    },
    {
      id: 'crossword' as GameType,
      title: '🧩 영단어 크로스워드',
      badge: '낱말 맞추기',
      desc: '가로 세로 힌트를 보고 영어 단어로 퍼즐을 완성',
      icon: <Grid className="w-6 h-6 text-purple-500" />,
    },
    {
      id: 'block' as GameType,
      title: '🧱 알파벳 블록 팡',
      badge: '퍼즐 크래시',
      desc: '블록 격자 속 알파벳 조각을 맞춰 단어를 터뜨리는 게임',
      icon: <Layers className="w-6 h-6 text-amber-500" />,
    },
    {
      id: 'swipe' as GameType,
      title: '👆 단어 스와이프 매칭',
      badge: '좌우 스와이프',
      desc: '유사 혼동 보기를 좌우 스와이프로 빠르게 판별',
      icon: <Flame className="w-6 h-6 text-orange-500" />,
    },
    {
      id: 'bubble' as GameType,
      title: '🫧 방울 터뜨리기',
      badge: '버블 팝',
      desc: '화면을 떠다니는 알파벳 버블을 순서대로 터뜨려 단어 완성',
      icon: <Sparkles className="w-6 h-6 text-teal-500" />,
    },
    {
      id: 'rhythm' as GameType,
      title: '🎵 비트 타임어택',
      badge: '리듬 액션',
      desc: 'ZPD 비트 속도에 맞춰 내려오는 단어를 맞히는 리듬 게임',
      icon: <Music className="w-6 h-6 text-pink-500" />,
    },
  ];

  const sentenceGamesCatalog = [
    {
      id: 'sentence_scramble' as GameType,
      title: '🧩 문장 어순 블록 조립',
      badge: '어순 빌더',
      desc: '어순에 맞게 단어 블록을 조립하여 정확한 영어 문장 완성',
      icon: <Puzzle className="w-6 h-6 text-indigo-500" />,
    },
    {
      id: 'sentence_listening' as GameType,
      title: '🎧 리스닝 청취 빈칸 채우기',
      badge: '청취 빈칸',
      desc: '원어민 소리를 듣고 문장 속 핵심 빈칸에 알맞은 단어 선택',
      icon: <Headphones className="w-6 h-6 text-teal-500" />,
    },
    {
      id: 'sentence_speed' as GameType,
      title: '⚡ 스피드 문장 완성 퀴즈',
      badge: '30초 타임어택',
      desc: '제시된 한글 해석에 맞는 영어 문장을 신속하게 고르는 스피드 퀴즈',
      icon: <Zap className="w-6 h-6 text-rose-500" />,
    },
    {
      id: 'sentence_truefalse' as GameType,
      title: '🕵️‍♂️ 문장 오류 & 진위 판별',
      badge: 'O/X 진위 판별',
      desc: '문장의 문법/어휘 오류 및 한국어 뜻 일치 여부를 O/X로 판별',
      icon: <ShieldAlert className="w-6 h-6 text-orange-500" />,
    },
    {
      id: 'sentence_shadowing' as GameType,
      title: '🎙️ 쉐도잉 발음 판정 챌린지',
      badge: 'AI 발음 판정',
      desc: '소리를 듣고 마이크로 직접 따라 말하며 실시간 단어별 별점 획득',
      icon: <Mic className="w-6 h-6 text-purple-500" />,
    },
  ];

  const allGamesCatalog = [...wordGamesCatalog, ...sentenceGamesCatalog];
  const activeCatalog = gameCategory === 'word' ? wordGamesCatalog : sentenceGamesCatalog;
  const activeGameItem = allGamesCatalog.find((g) => g.id === activeGame);
  const zpdProfile = getZpdProfile(cognitiveStats.zpdLevel);
  const calibrationSummary = calculateCalibrationSummary(cognitiveStats);

  return (
    <>
      {/* 1. Game Selection Catalog (Kept mounted so scroll position and layout remain stable) */}
      <div className="space-y-3 max-w-5xl mx-auto py-1">
        {/* Banner & Grade Selector */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white shadow-md border border-indigo-500/20 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] text-indigo-200 font-semibold">
                인출 연습 · 간격 반복 · ZPD 적응형 엔진
              </p>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">🎮 영단어·문장 인지 학습 게임</h2>
            </div>

            {/* High Score Display */}
            <div className="bg-white/10 px-2.5 py-1 rounded-xl border border-white/20 flex items-center gap-2 shrink-0">
              <Trophy className="w-4 h-4 text-amber-300" />
              <div className="text-right">
                <span className="text-[9px] text-indigo-200 block leading-tight">최고 기록</span>
                <span className="text-xs font-black font-mono tabular-nums text-amber-300 leading-tight">{highScore}점</span>
              </div>
            </div>
          </div>

          {/* Grade Selection Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1.5 border-t border-indigo-500/25">
            <button
              onClick={() => setSelectedGrade('all')}
              className={`min-h-[36px] py-1.5 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                selectedGrade === 'all'
                  ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-300 font-black'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <span>🌟 전체 통합 (3,210)</span>
            </button>
            <button
              onClick={() => setSelectedGrade('elementary')}
              className={`min-h-[36px] py-1.5 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                selectedGrade === 'elementary'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <span>🎒 초등 필수 (800)</span>
            </button>
            <button
              onClick={() => setSelectedGrade('middle')}
              className={`min-h-[36px] py-1.5 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                selectedGrade === 'middle'
                  ? 'bg-blue-500 text-white shadow-sm font-black'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <span>🏫 중학 필수 (1,200)</span>
            </button>
            <button
              onClick={() => setSelectedGrade('high_sat')}
              className={`min-h-[36px] py-1.5 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                selectedGrade === 'high_sat'
                  ? 'bg-purple-500 text-white shadow-sm font-black'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <span>🎓 고등·수능 (1,210)</span>
            </button>
          </div>
        </div>

        {/* Cognitive Readiness & ZPD Telemetry Strip (Zero-pill inline metadata) */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-700 dark:text-slate-300 font-mono tabular-nums">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {zpdProfile.label}
            </span>
            <span>·</span>
            <span>복습 대기 {srsSummary.dueCount}개</span>
            <span>·</span>
            <span>평균 인출 {(cognitiveStats.avgLatencyMs / 1000).toFixed(1)}s</span>
            {calibrationSummary.totalCalibrated > 0 && (
              <>
                <span>·</span>
                <span>메타인지 보정 {calibrationSummary.calibrationAccuracyPct}%</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFocusSrsPriority((v) => !v)}
            className={`min-h-[36px] px-3 py-1 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
              focusSrsPriority
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {focusSrsPriority ? 'SRS 복습·취약 우선 출제 ON' : '일반 균형 출제'}
          </button>
        </div>

        {/* Category Mode Switcher: 단어 게임 (11종) vs 문장 게임 (5종) */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 shadow-inner">
          <button
            onClick={() => setGameCategory('word')}
            className={`min-h-[42px] flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              gameCategory === 'word'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-black/5 dark:ring-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🔤 단어 게임 (11종)</span>
          </button>
          <button
            onClick={() => setGameCategory('sentence')}
            className={`min-h-[42px] flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              gameCategory === 'sentence'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-md ring-1 ring-black/5 dark:ring-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>💬 문장 게임 (5종)</span>
          </button>
        </div>

        {/* Sentence Game Delivery Banner */}
        {gameCategory === 'sentence' && (
          <div className="px-3.5 py-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>미암기·학습중·완벽암기 예문이 인지 인터리빙 비율로 출제됩니다.</span>
            </div>
          </div>
        )}

        {/* Games Catalog Grid */}
        <div className={`grid gap-2.5 ${gameCategory === 'word' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
          {activeCatalog.map((item) => {
            const isRecentlyPlayed = lastPlayedGame === item.id;
            return (
              <div
                key={item.id}
                id={`game-catalog-card-${item.id}`}
                onClick={() => handleOpenGame(item.id)}
                className={`group p-3 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 hover:-translate-y-0.5 scroll-mt-24 ${
                  isRecentlyPlayed
                    ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/35 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:scale-105 transition-transform">
                      {item.icon}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-right truncate">
                      {!hasParentPhotos && <span className="text-rose-500 mr-1">사진 필요 ·</span>}
                      {isRecentlyPlayed && <span className="text-emerald-600 dark:text-emerald-400 mr-1">최근 ·</span>}
                      <span>{item.badge}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {item.title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenGame(item.id);
                  }}
                  className={`w-full py-1.5 px-2.5 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 shadow-sm ${
                    isRecentlyPlayed
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{isRecentlyPlayed ? '다시 플레이' : '게임 시작'}</span>
                  <Play className="w-3 h-3 fill-current" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Full-screen Modal View when a game is active */}
      {selectedGame !== null && (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 p-1 sm:p-3 md:p-4 overflow-hidden flex flex-col h-[100dvh] max-h-[100dvh] select-none animate-in fade-in zoom-in-95 duration-200">
      {/* Sleek, Compact Top Header Bar for Fullscreen Game */}
      <div className="flex items-center justify-between pb-1 sm:pb-2 mb-1 sm:mb-2 border-b border-slate-200 dark:border-slate-800 shrink-0 gap-1.5 sm:gap-2 max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <button
            onClick={handleCloseGame}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-[11px] sm:text-xs flex items-center gap-1 transition-all border border-slate-300 dark:border-slate-700 shrink-0"
            title="게임 목록으로 돌아가기"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="sm:hidden">게임 목록</span>
            <span className="hidden sm:inline">게임 목록으로 돌아가기</span>
          </button>

          {/* Active Game Title & Current Grade & QA Mode Badges */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-w-0 shadow-sm">
            <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              {activeGameItem?.title || '영단어 게임'}
            </span>
            <button
              onClick={() => setShowGameOptionsModal(true)}
              className="text-[10px] sm:text-[11px] font-extrabold px-1.5 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0 transition-colors"
              title="학습 대상 학년 변경"
            >
              {selectedGrade === 'all'
                ? '🌟 전체'
                : selectedGrade === 'elementary'
                ? '🎒 초등'
                : selectedGrade === 'middle'
                ? '🏫 중학'
                : '🎓 고등'}
            </button>
            <button
              onClick={() => setShowGameOptionsModal(true)}
              className="text-[10px] sm:text-[11px] font-extrabold px-1.5 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0 transition-colors hidden xs:inline-flex items-center gap-1"
              title="문제 출제 방식 변경"
            >
              <span>{QA_MODES_CONFIG[qaMode]?.shortLabel || '한글 → 영어'}</span>
            </button>
          </div>
        </div>

        {/* Right Actions: Grade / Options Trigger & High Score */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-black">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>최고 {highScore}점</span>
          </div>

          <button
            onClick={() => setShowGameOptionsModal(true)}
            className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-[11px] sm:text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95 shrink-0"
            title="학습 대상 필터 및 게임 옵션 변경"
          >
            <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>옵션/필터</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 max-w-4xl w-full mx-auto flex flex-col justify-start overflow-y-auto">
      <Suspense fallback={<LazyLoadingFallback label="미니게임을 불러오는 중입니다..." />}>

      {/* ==================================================== */}
      {/* NEW COGNITIVE GAME A: METACOGNITIVE CONFIDENCE DUEL  */}
      {/* ==================================================== */}
      {activeGame === 'metacognitive_duel' && (
        <MetacognitiveDuelGame
          key={selectedGrade}
          words={currentGradeWords}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          qaMode={qaMode}
          onChangeQAMode={setQaMode}
          onUpdateHighScore={updateHighScore}
          onChangeMastery={handleSharedGameMastery}
          onUpdateVocabSrs={onUpdateVocabSrs}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* NEW COGNITIVE GAME B: SCAFFOLDED CONTEXT DECODER     */}
      {/* ==================================================== */}
      {activeGame === 'context_decoder' && (
        <ScaffoldedContextGame
          key={selectedGrade}
          words={currentGradeWords}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          onUpdateHighScore={updateHighScore}
          onChangeMastery={handleSharedGameMastery}
          onUpdateVocabSrs={onUpdateVocabSrs}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 0 UI: FLASHCARD RECALL (4지선다 리콜 & 암기 승급) */}
      {/* ==================================================== */}
      {activeGame === 'flashcard_recall' && (
        <FlashcardRecallGame
          key={selectedGrade}
          words={currentGradeWords}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          qaMode={qaMode}
          onChangeQAMode={setQaMode}
          onUpdateHighScore={updateHighScore}
          onChangeMastery={handleSharedGameMastery}
          onUpdateVocabSrs={onUpdateVocabSrs}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 1 UI: MEMORY CARD MATCHING (단어 짝맞추기) */}
      {/* ==================================================== */}
      {activeGame === 'memory' && (
        <WordMatchGame
          key={selectedGrade}
          words={currentGradeWords}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          qaMode={qaMode}
          onChangeQAMode={setQaMode}
          onUpdateHighScore={updateHighScore}
          onChangeMastery={handleSharedGameMastery}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 2 UI: SPELLING UNSCRAMBLE BUBBLE */}
      {/* ==================================================== */}
      {activeGame === 'spelling' && (
        <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 sm:space-y-4 flex-1 flex flex-col justify-between">
          {currentSpellingItem ? (
            <>
              {/* Header Info & Progress */}
              <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-slate-500 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] sm:text-xs">단어 {spellingIndex + 1}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">점수: {spellingScore}점</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={shuffleToNewRandomWord}
                    className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] sm:text-[11px] flex items-center gap-1 transition-all border border-slate-200 dark:border-slate-700"
                    title="다른 랜덤 단어 불러오기"
                  >
                    <Shuffle className="w-3 h-3 text-indigo-500" />
                    <span>랜덤 단어</span>
                  </button>
                  <button
                    onClick={() => setShowGameOptionsModal(true)}
                    className="text-[10px] sm:text-[11px] font-bold text-indigo-500 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>{QA_MODES_CONFIG[qaMode]?.shortLabel}</span>
                  </button>
                </div>
              </div>

              {/* Target Meaning & Hint */}
              <div className="text-center space-y-1 py-1">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">
                  {qaMode === 'en_def_to_en'
                    ? '영영 풀이에 맞는 영단어를 완성하세요'
                    : '한국어 뜻에 맞는 영단어를 완성하세요'}
                </span>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white max-w-xl mx-auto leading-snug">
                  {qaMode === 'en_def_to_en'
                    ? getEnglishDefinition(currentSpellingItem)
                    : getCleanKoreanMeaning(currentSpellingItem)}
                </h3>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                    품사 {currentSpellingItem.partOfSpeech}
                  </span>
                  <button
                    onClick={() => {
                      speechService.playItem(currentSpellingItem.id, currentSpellingItem.word, undefined, 1);
                    }}
                    className="p-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-all cursor-pointer"
                    title="발음 듣기"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-w-xl mx-auto pt-1">
                  <GameScaffoldingBar
                    item={currentSpellingItem}
                    hintTier={spellingHintTier}
                    onAdvanceHint={() =>
                      setSpellingHintTier((t) => (t < 3 ? ((t + 1) as 0 | 1 | 2 | 3) : t))
                    }
                    zpdLevel={cognitiveStats.zpdLevel}
                    lastFeedbackLabel={spellingFluencyNote}
                    disabled={spellingResult === 'correct'}
                    hideAnswerInTier3={spellingResult !== 'correct'}
                  />
                </div>
              </div>

              {/* Target Word & Spelling Slots */}
              {(() => {
                const cleanTarget = (currentSpellingItem?.word || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
                const targetLen = cleanTarget.length;
                const correctCount = userLetters.filter((c, idx) => idx < targetLen && c.toLowerCase() === cleanTarget[idx]).length;
                const isAllFilled = userLetters.length === targetLen;
                const isAllCorrect = correctCount === targetLen;

                return (
                  <div className="space-y-3 sm:space-y-4 my-auto">
                    {/* User Assembled Word Slots */}
                    <div className="min-h-[76px] sm:min-h-[96px] p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-center gap-2 sm:gap-3.5">
                      {Array.from({ length: Math.max(targetLen, userLetters.length) }).map((_, idx) => {
                        const userChar = userLetters[idx];
                        const targetChar = cleanTarget[idx];
                        const isFilled = Boolean(userChar);
                        const isCorrect = isFilled && targetChar && userChar.toLowerCase() === targetChar;
                        const isWrong = isFilled && (!targetChar || userChar.toLowerCase() !== targetChar);
                        const isNextEmpty = !isFilled && idx === userLetters.length;

                        if (isFilled) {
                          return (
                            <button
                              key={idx}
                              onClick={() => handleRemoveLetter(idx)}
                              className={`relative w-12 h-16 sm:w-16 sm:h-20 rounded-2xl font-black text-2xl sm:text-3xl font-mono uppercase shadow-md transition-all flex items-center justify-center active:scale-95 group ${
                                isCorrect
                                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-2 border-emerald-300 ring-2 ring-emerald-400/30 scale-102 shadow-emerald-500/20'
                                  : isWrong
                                  ? 'bg-gradient-to-b from-rose-500 to-rose-600 text-white border-2 border-rose-300 ring-2 ring-rose-400/30 scale-100 hover:bg-rose-600 shadow-rose-500/20'
                                  : 'bg-indigo-600 text-white hover:bg-rose-500'
                              }`}
                              title={isCorrect ? '정답 위치! (탭하여 취소)' : '틀린 글자 (탭하여 취소)'}
                            >
                              <span>{userChar}</span>

                              {/* Corner match badge */}
                              {isCorrect ? (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 text-[10px] font-black flex items-center justify-center shadow-md border border-emerald-400">
                                  ✓
                                </span>
                              ) : isWrong ? (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 text-[10px] font-black flex items-center justify-center shadow-md border border-rose-400">
                                  ✕
                                </span>
                              ) : null}
                            </button>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className={`w-12 h-16 sm:w-16 sm:h-20 rounded-2xl flex items-center justify-center font-mono text-xl sm:text-2xl font-bold transition-all ${
                              isNextEmpty
                                ? 'border-2 border-dashed border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-400 animate-pulse'
                                : 'border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/40 dark:bg-slate-800/30 text-slate-300 dark:text-slate-600'
                            }`}
                          >
                            {isNextEmpty ? '?' : '_'}
                          </div>
                        );
                      })}
                    </div>

                    {/* Available Bubbles / Candidate Letters (Enlarged for readability) */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 p-3 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                        {availableBubbles.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => !b.isUsed && handleBubbleClick(b.id, b.letter)}
                            disabled={b.isUsed || spellingResult === 'correct'}
                            className={`w-13 h-13 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-2xl font-black text-2xl sm:text-3xl md:text-4xl transition-all flex items-center justify-center font-mono uppercase shadow-md ${
                              b.isUsed
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-transparent scale-90 opacity-40 cursor-default shadow-none'
                                : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 active:scale-95 shadow-indigo-500/10 ring-1 ring-slate-900/5'
                            }`}
                          >
                            {b.letter}
                          </button>
                        ))}
                      </div>

                      {/* Example sentence / Context Word (Masked until solved) */}
                      {currentSpellingItem.sentence && (
                        <div className="p-3 sm:p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/70 text-center space-y-1">
                          <span className="text-[11px] sm:text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                            📖 문맥 예문
                          </span>
                          <p className="text-base sm:text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 leading-snug">
                            {spellingResult === 'correct'
                              ? currentSpellingItem.sentence
                              : maskTargetWordInSentence(currentSpellingItem.sentence, currentSpellingItem.word)}
                          </p>
                          {currentSpellingItem.sentenceMeaning && (
                            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                              {currentSpellingItem.sentenceMeaning}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Action buttons & Feedback */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (spellingHintTier < 3) {
                      playCognitiveCueSound('hint');
                      setSpellingHintTier((t) => (t < 3 ? ((t + 1) as 0 | 1 | 2 | 3) : t));
                    }
                  }}
                  disabled={spellingHintTier >= 3 || spellingResult === 'correct'}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-45 transition-all flex items-center gap-1 font-mono tabular-nums cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{spellingHintTier >= 3 ? '힌트 최대' : `비계 힌트 (${spellingHintTier}/3)`}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {spellingResult === 'correct' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono tabular-nums">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 정답 (+{Math.max(8, 25 - spellingHintTier * 5)}점)
                      </span>
                      <button
                        onClick={nextSpellingRound}
                        className="min-h-[38px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>다음</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {spellingResult === 'wrong' && (
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          철자를 다시 확인해 보세요
                        </span>
                      )}
                      <button
                        onClick={checkSpellingAnswer}
                        disabled={userLetters.length === 0}
                        className="min-h-[38px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
                      >
                        정답 확인 ➔
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center">선택된 단어가 없습니다.</p>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* GAME 3 UI: SPEED TIME-ATTACK CHALLENGE */}
      {/* ==================================================== */}
      {activeGame === 'speed' && (
        <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 sm:space-y-4 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-rose-500" />
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">스피드 타임어택</span>
            </div>
            <button
              onClick={() => setShowGameOptionsModal(true)}
              className="text-[10px] sm:text-[11px] font-bold text-rose-500 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <span>{QA_MODES_CONFIG[qaMode]?.shortLabel}</span>
            </button>
          </div>

          {!isSpeedPlaying && !isSpeedGameOver ? (
            <div className="text-center py-6 space-y-3 my-auto">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  ⚡ ZPD 스피드 타임어택 ({Math.round(25 * zpdProfile.timeBonusFactor)}초)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  {zpdProfile.label} 난이도에 맞춘 혼동 보기로 반응속도를 훈련합니다. 3연속 정답 시 +3초 보너스!
                </p>
              </div>

              <button
                onClick={() => startSpeedGame()}
                className="min-h-[44px] px-6 py-2.5 sm:px-8 sm:py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs sm:text-sm shadow-md shadow-rose-500/20 transition-all inline-flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                <span>타임어택 시작하기</span>
              </button>
            </div>
          ) : isSpeedGameOver ? (
            <div className="p-5 sm:p-8 text-center rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4 my-auto">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">⏰ 타임어택 종료</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                  {zpdProfile.label} · 평균 인출 {(cognitiveStats.avgLatencyMs / 1000).toFixed(1)}s
                </p>
              </div>

              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 max-w-xs mx-auto">
                <span className="text-xs text-slate-500 font-bold block">최종 스코어</span>
                <span className="text-3xl font-black font-mono tabular-nums text-rose-500">{speedScore}점</span>
              </div>

              {speedMissedItems.length > 0 && (
                <div className="max-w-md mx-auto p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-left space-y-2">
                  <p className="text-xs font-extrabold text-rose-700 dark:text-rose-300 font-mono tabular-nums">
                    오답 {speedMissedItems.length}개 지연 재인출 대기
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {speedMissedItems.slice(0, 6).map((item) => (
                      <span
                        key={item.id}
                        className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800"
                      >
                        {item.word} ({getCleanKoreanMeaning(item)})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                {speedMissedItems.length > 0 && (
                  <button
                    onClick={() => {
                      const remediationSet =
                        speedMissedItems.length >= 4
                          ? speedMissedItems
                          : [
                              ...speedMissedItems,
                              ...adaptiveGradeWords.filter(
                                (w) => !speedMissedItems.some((m) => m.id === w.id)
                              ),
                            ].slice(0, Math.min(8, Math.max(4, currentGradeWords.length)));
                      startSpeedGame(remediationSet);
                    }}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl sm:rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Brain className="w-4 h-4" />
                    <span>오답 {speedMissedItems.length}개 집중 재인출</span>
                  </button>
                )}
                <button
                  onClick={() => startSpeedGame()}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>한 번 더 도전</span>
                </button>
                <button
                  onClick={handleCloseGame}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl sm:rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-black text-xs shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>게임 목록</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              {/* Timer Bar & Combo */}
              <ComboFeedbackOverlay combo={speedCombo} label="스피드 정답!" />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black font-mono tabular-nums">
                  <div className="flex items-center gap-1.5 text-rose-500">
                    <Timer className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs sm:text-sm">남은 시간 {timeLeft}초</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">· {zpdProfile.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {speedCombo > 1 && (
                      <span className="text-amber-600 dark:text-amber-400 text-[11px] font-black flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        {speedCombo}x COMBO
                      </span>
                    )}
                    <span className="text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">점수 {speedScore}점</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, (timeLeft / Math.max(15, Math.round(25 * zpdProfile.timeBonusFactor))) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Word Question Box */}
              {currentSpeedItem && (
                <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-1 my-auto">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">
                    {getSpeedTargetAndOptions(currentSpeedItem).subtext}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono leading-snug">
                    {getSpeedTargetAndOptions(currentSpeedItem).prompt}
                  </h3>
                  {qaMode === 'en_to_ko' && currentSpeedItem.ipa && (
                    <p className="text-[11px] text-slate-400 font-mono">{currentSpeedItem.ipa}</p>
                  )}
                </div>
              )}

              {/* 4 Choices Options */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {speedOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSpeedAnswer(opt)}
                    className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 font-bold text-xs text-left transition-all active:scale-95 shadow-sm truncate"
                  >
                    <span className="text-indigo-500 mr-1">{idx + 1}.</span> {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* GAME 4 UI: ENGLISH CROSSWORD PUZZLE */}
      {/* ==================================================== */}
      {activeGame === 'crossword' && (
        <CrosswordGame
          words={currentGradeWords}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          qaMode={qaMode}
          onChangeQAMode={setQaMode}
          onUpdateHighScore={updateHighScore}
          onChangeMastery={handleSharedGameMastery}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 5 UI: WORD BLOCK BLAST */}
      {/* ==================================================== */}
      {activeGame === 'block' && (
        <WordBlockGame
          key={selectedGrade}
          words={currentGradeWords}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          qaMode={qaMode}
          onChangeQAMode={setQaMode}
          onUpdateHighScore={updateHighScore}
          onChangeMastery={handleSharedGameMastery}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 6 UI: FLASHCARD SWIPE MATCH */}
      {/* ==================================================== */}
      {activeGame === 'swipe' && (
        <SwipeMatchGame
          words={currentGradeWords}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          qaMode={qaMode}
          onChangeQAMode={setQaMode}
          onUpdateHighScore={updateHighScore}
          onChangeMastery={handleSharedGameMastery}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 7 UI: ALPHABET BUBBLE POP */}
      {/* ==================================================== */}
      {activeGame === 'bubble' && (
        <BubblePopGame
          words={currentGradeWords}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          qaMode={qaMode}
          onChangeQAMode={setQaMode}
          onUpdateHighScore={updateHighScore}
          onChangeMastery={handleSharedGameMastery}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 8 UI: RHYTHM WORD POP */}
      {/* ==================================================== */}
      {activeGame === 'rhythm' && (
        <RhythmWordGame
          words={currentGradeWords}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          qaMode={qaMode}
          onChangeQAMode={setQaMode}
          onUpdateHighScore={updateHighScore}
          onChangeMastery={handleSharedGameMastery}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 9 UI: SENTENCE SCRAMBLE (문장 어순 블록 조립) */}
      {/* ==================================================== */}
      {activeGame === 'sentence_scramble' && (
        <SentenceScrambleGame
          sentences={adaptiveGradeSentences}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          onUpdateHighScore={updateHighScore}
          onChangeMastery={onChangeMastery}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 10 UI: SENTENCE LISTENING FILL (청취 빈칸 채우기) */}
      {/* ==================================================== */}
      {activeGame === 'sentence_listening' && (
        <SentenceListeningFillGame
          sentences={adaptiveGradeSentences}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          onUpdateHighScore={updateHighScore}
          onChangeMastery={onChangeMastery}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 11 UI: SENTENCE SPEED RUSH (스피드 문장 완성) */}
      {/* ==================================================== */}
      {activeGame === 'sentence_speed' && (
        <SentenceSpeedRushGame
          sentences={adaptiveGradeSentences}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          onUpdateHighScore={updateHighScore}
          onChangeMastery={onChangeMastery}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 12 UI: SENTENCE TRUE/FALSE (문장 오류 & 진위 판별) */}
      {/* ==================================================== */}
      {activeGame === 'sentence_truefalse' && (
        <SentenceTrueFalseGame
          sentences={adaptiveGradeSentences}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          onUpdateHighScore={updateHighScore}
          onChangeMastery={onChangeMastery}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 13 UI: SENTENCE SHADOWING (쉐도잉 발음 판정) */}
      {/* ==================================================== */}
      {activeGame === 'sentence_shadowing' && (
        <SentenceShadowingGame
          sentences={adaptiveGradeSentences}
          gradeName={
            selectedGrade === 'all'
              ? '전체 통합'
              : selectedGrade === 'elementary'
              ? '초등 필수'
              : selectedGrade === 'middle'
              ? '중등 필수'
              : '고등·수능'
          }
          onUpdateHighScore={updateHighScore}
          onChangeMastery={onChangeMastery}
          onQuit={handleCloseGame}
        />
      )}
      </Suspense>
      </div>

      {/* ==================================================== */}
      {/* GAME OPTIONS & LEARNING TARGET MODAL */}
      {/* ==================================================== */}
      {showGameOptionsModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    게임 설정 & 학습 대상
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    원하는 학년 및 문제 출제 모드를 선택하세요.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGameOptionsModal(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 1: Grade / Learning Target Selection */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>🎓 학습 대상 (어휘 범위)</span>
                <span className="text-[10px] text-slate-400 font-normal">교육부 교육과정 3,210단어</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 1. All Grade */}
                <button
                  onClick={() => setSelectedGrade('all')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedGrade === 'all'
                      ? 'bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-amber-400'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <span>🌟 전체 통합 모드</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      초·중·고 전체 3,210단어
                    </p>
                  </div>
                  {selectedGrade === 'all' && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                </button>

                {/* 2. Elementary Grade */}
                <button
                  onClick={() => setSelectedGrade('elementary')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedGrade === 'elementary'
                      ? 'bg-emerald-500/10 border-emerald-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-emerald-400'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <span>🎒 초등 필수</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      기초 어휘 800단어
                    </p>
                  </div>
                  {selectedGrade === 'elementary' && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                </button>

                {/* 3. Middle Grade */}
                <button
                  onClick={() => setSelectedGrade('middle')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedGrade === 'middle'
                      ? 'bg-blue-500/10 border-blue-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-blue-400'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <span>🏫 중학 필수</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      핵심 어휘 1,200단어
                    </p>
                  </div>
                  {selectedGrade === 'middle' && <Check className="w-4 h-4 text-blue-500 shrink-0" />}
                </button>

                {/* 4. High SAT Grade */}
                <button
                  onClick={() => setSelectedGrade('high_sat')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedGrade === 'high_sat'
                      ? 'bg-purple-500/10 border-purple-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-purple-400'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <span>🎓 고등·수능</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      심화 어휘 1,210단어
                    </p>
                  </div>
                  {selectedGrade === 'high_sat' && <Check className="w-4 h-4 text-purple-500 shrink-0" />}
                </button>
              </div>
            </div>

            {/* Section 2: Q&A Mode */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>📖 문제 출제 모드 (Q&A Mode)</span>
                </span>
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold">
                  {QA_MODES_CONFIG[qaMode]?.label} 선택됨
                </span>
              </label>

              <div className="space-y-2">
                {/* 1. ko_to_en */}
                <button
                  onClick={() => setQaMode('ko_to_en')}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start justify-between ${
                    qaMode === 'ko_to_en'
                      ? 'bg-emerald-500/10 border-emerald-500 text-slate-900 dark:text-white ring-1 ring-emerald-400 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 font-black text-xs">
                      <span>🇰🇷 한글 → 🔤 영어</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold">
                        기본 추천
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      한국어 뜻/설명을 보고 해당하는 영어 단어를 맞추거나 완성합니다.
                    </p>
                  </div>
                  {qaMode === 'ko_to_en' && <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                </button>

                {/* 2. en_def_to_en */}
                <button
                  onClick={() => setQaMode('en_def_to_en')}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start justify-between ${
                    qaMode === 'en_def_to_en'
                      ? 'bg-purple-500/10 border-purple-500 text-slate-900 dark:text-white ring-1 ring-purple-400 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 font-black text-xs">
                      <span>💡 영영 정의 → 🔤 영어</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-extrabold">
                        심화 학습
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      영문 정의(English Definition)와 예문을 읽고 해당하는 영어 단어를 유추합니다.
                    </p>
                  </div>
                  {qaMode === 'en_def_to_en' && <Check className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />}
                </button>

                {/* 3. en_to_ko */}
                <button
                  onClick={() => setQaMode('en_to_ko')}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start justify-between ${
                    qaMode === 'en_to_ko'
                      ? 'bg-blue-500/10 border-blue-500 text-slate-900 dark:text-white ring-1 ring-blue-400 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 font-black text-xs">
                      <span>🔤 영어 단어 → 🇰🇷 한글</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold">
                        어휘 확인
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      제시된 영어 단어 및 발음을 확인하고 올바른 한국어 뜻을 선택합니다.
                    </p>
                  </div>
                  {qaMode === 'en_to_ko' && <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                </button>
              </div>
            </div>

            {/* Section 3: Switch Active Game */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>🎮 게임 바로 전환</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {allGamesCatalog.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => {
                      handleGameChange(game.id);
                      setShowGameOptionsModal(false);
                    }}
                    className={`p-2 rounded-xl border text-xs font-bold text-center transition-all flex flex-col items-center gap-1 ${
                      activeGame === game.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[11px] truncate max-w-full">{game.title.replace(/^[^\s]+\s*/, '')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowGameOptionsModal(false);
                  if (activeGame === 'spelling') {
                    const curated = buildAdaptiveVocabQueue(
                      currentGradeWords,
                      loadCognitiveStats(),
                      currentGradeWords.length,
                      focusSrsPriority ? 'weak_only' : 'adaptive'
                    );
                    setSpellingPool(curated);
                    setSpellingIndex(0);
                    if (curated.length > 0) {
                      initSpellingRound(curated[0]);
                    }
                  }
                  if (activeGame === 'speed') startSpeedGame();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>선택한 설정 적용하기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      )}

      {/* MANDATORY MOM & DAD PHOTO REGISTRATION REQUIREMENT OVERLAY MODAL */}
      {(!hasParentPhotos && selectedGame !== null) || showPhotoReqModal ? (
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-3xl bg-slate-900 border-2 border-rose-500/50 shadow-2xl text-center space-y-5 relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 via-amber-500 to-indigo-500 text-3xl flex items-center justify-center mx-auto shadow-lg shadow-rose-500/30 animate-bounce">
              📸
            </div>
            
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black">
                <span>⚠️ 게임 시작 필수 조건</span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                엄마 & 아빠 사진 등록 필수!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                WordLoop 학습 게임을 시작하려면 먼저 <strong className="text-rose-400">엄마 사진과 아빠 사진을 모두 등록</strong>하셔야 합니다.<br/>
                게임 플레이 중 학습 성취도에 따라 엄마/아빠가 화면에 전면 가득 등장하여 생생하게 응원 및 잔소리를 해줍니다!
              </p>
            </div>

            {/* Photo Registration Status Box */}
            <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs font-bold">
              {/* Mom Status & Direct Upload */}
              <div className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 ${
                userProfile?.momPhotoUrl
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span>👩 엄마:</span>
                  <span>{userProfile?.momPhotoUrl ? '✅ 등록됨' : '❌ 미등록'}</span>
                </div>
                {userProfile?.momPhotoUrl ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-400/50 shadow-xs">
                    <img src={userProfile.momPhotoUrl} alt="엄마" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div>
                    <input
                      id="modal-direct-mom-photo"
                      type="file"
                      onChange={handleModalMomPhotoUpload}
                      accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.heic,.heif"
                      className="sr-only"
                    />
                    <label
                      htmlFor="modal-direct-mom-photo"
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Camera className="w-3 h-3" />
                      <span>사진 선택</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Dad Status & Direct Upload */}
              <div className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 ${
                userProfile?.dadPhotoUrl
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span>👨 아빠:</span>
                  <span>{userProfile?.dadPhotoUrl ? '✅ 등록됨' : '❌ 미등록'}</span>
                </div>
                {userProfile?.dadPhotoUrl ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-400/50 shadow-xs">
                    <img src={userProfile.dadPhotoUrl} alt="아빠" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div>
                    <input
                      id="modal-direct-dad-photo"
                      type="file"
                      onChange={handleModalDadPhotoUpload}
                      accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.heic,.heif"
                      className="sr-only"
                    />
                    <label
                      htmlFor="modal-direct-dad-photo"
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Camera className="w-3 h-3" />
                      <span>사진 선택</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {photoError && (
              <div className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold">
                ⚠️ {photoError}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              {/* Ready to play button if both photos registered */}
              {hasParentPhotos ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowPhotoReqModal(false);
                    if (selectedGame) {
                      handleGameChange(selectedGame);
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>등록 완료! 지금 바로 게임 시작</span>
                </button>
              ) : (
                /* Instant 1-click Preset Registration */
                <button
                  type="button"
                  onClick={handleAutoRegisterPresetParents}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>⚡ 추천 부모님 캐릭터로 1초 등록하고 게임 시작</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowPhotoReqModal(false);
                  setSelectedGame(null);
                  if (onOpenProfileModal) {
                    onOpenProfileModal();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-rose-400" />
                <span>프로필 설정에서 내 앨범 사진 직접 올리기</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPhotoReqModal(false);
                  setSelectedGame(null);
                }}
                className="w-full py-2 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 font-bold text-xs transition-colors cursor-pointer"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
