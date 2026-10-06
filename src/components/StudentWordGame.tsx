import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  BookOpen
} from 'lucide-react';
import { VocabItem, SentenceItem, QAMode } from '../types';
import { OFFICIAL_CURRICULUM_3000_LIST } from '../data/officialCurriculum3000';
import { DEFAULT_SENTENCES } from '../data/defaultVocab';
import { speechService } from '../services/speechService';
import { recordGameDone } from '../services/habitQuestService';
import { getCleanKoreanMeaning, getEnglishDefinition, QA_MODES_CONFIG } from '../utils/meaningUtils';
import { QAModeSelector } from './QAModeSelector';
import { WordMatchGame } from './WordMatchGame';
import { CrosswordGame } from './CrosswordGame';
import { WordBlockGame } from './WordBlockGame';
import { SwipeMatchGame } from './SwipeMatchGame';
import { BubblePopGame } from './BubblePopGame';
import { RhythmWordGame } from './RhythmWordGame';
import { SentenceScrambleGame } from './SentenceGames/SentenceScrambleGame';
import { SentenceListeningFillGame } from './SentenceGames/SentenceListeningFillGame';
import { SentenceSpeedRushGame } from './SentenceGames/SentenceSpeedRushGame';
import { SentenceTrueFalseGame } from './SentenceGames/SentenceTrueFalseGame';
import { SentenceShadowingGame } from './SentenceGames/SentenceShadowingGame';
import { FlashcardRecallGame } from './FlashcardRecallGame';

interface StudentWordGameProps {
  vocabList: VocabItem[];
  sentenceList?: SentenceItem[];
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onSelectGame?: (game: GameType) => void;
  initialGame?: GameType | null;
}

type SchoolGrade = 'all' | 'elementary' | 'middle' | 'high_sat';
export type GameType =
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

export const StudentWordGame: React.FC<StudentWordGameProps> = ({ vocabList, sentenceList = [], onChangeMastery, onSelectGame, initialGame }) => {
  const [selectedGrade, setSelectedGrade] = useState<SchoolGrade>('elementary');
  const [gameCategory, setGameCategory] = useState<'word' | 'sentence'>('word');
  const [activeGame, setActiveGame] = useState<GameType>('memory');
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [lastPlayedGame, setLastPlayedGame] = useState<GameType | null>(null);
  const [qaMode, setQaMode] = useState<QAMode>('ko_to_en');
  const [showGameOptionsModal, setShowGameOptionsModal] = useState<boolean>(false);

  // Auto open initial game if provided
  useEffect(() => {
    if (initialGame) {
      const isSentence = initialGame.startsWith('sentence_');
      setGameCategory(isSentence ? 'sentence' : 'word');
      setActiveGame(initialGame);
      setSelectedGame(initialGame);
      setLastPlayedGame(initialGame);
    }
  }, [initialGame]);

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
    setLastPlayedGame(game);
    setSelectedGame(game);
    handleGameChange(game);
  }, [handleGameChange]);

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

  // Unified word bank for selected grade (memoized to prevent infinite re-render loops in child games)
  const currentGradeWords = useMemo(() => {
    if (selectedGrade === 'all') {
      const officialAll = STATIC_OFFICIAL_WORDS_BY_GRADE['all'] || [];
      return vocabList.length > 0 ? [...vocabList, ...officialAll] : officialAll;
    }
    const filteredUser = vocabList.filter((v) => v.categoryId === selectedGrade);
    if (filteredUser.length >= 8) return filteredUser;

    const officialFiltered = STATIC_OFFICIAL_WORDS_BY_GRADE[selectedGrade] || [];
    return [...filteredUser, ...officialFiltered];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, userWordsGradeKey, vocabList]);

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
  }, [selectedGrade, sentenceList]);

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
    // Record game done for Daily 3-minute Quest
    recordGameDone();
    const saved = localStorage.getItem(getHighScoreKey(activeGame, selectedGrade));
    const currentMax = saved ? parseInt(saved, 10) : 0;
    if (score > currentMax) {
      localStorage.setItem(getHighScoreKey(activeGame, selectedGrade), score.toString());
      setHighScore(score);
    }
  }, [activeGame, selectedGrade, getHighScoreKey]);

  // ==========================================
  // GAME 2: SPELLING UNSCRAMBLE BUBBLE (알파벳 맞추기)
  // ==========================================
  const [spellingPool, setSpellingPool] = useState<VocabItem[]>([]);
  const [spellingIndex, setSpellingIndex] = useState(0);
  const [spellingScore, setSpellingScore] = useState(0);
  const [userLetters, setUserLetters] = useState<string[]>([]);
  const [availableBubbles, setAvailableBubbles] = useState<{ id: string; letter: string; isUsed: boolean }[]>([]);
  const [spellingResult, setSpellingResult] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showSpellingHint, setShowSpellingHint] = useState(false);

  const currentSpellingItem = useMemo(() => {
    if (spellingPool.length > 0) {
      return spellingPool[spellingIndex % spellingPool.length];
    }
    return currentGradeWords[spellingIndex % currentGradeWords.length];
  }, [spellingPool, spellingIndex, currentGradeWords]);

  const initSpellingRound = (item: VocabItem) => {
    if (!item) return;
    const cleanWord = item.word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const letters = cleanWord.split('');

    // Add 1 or 2 extra random letters for difficulty in Middle/High
    if (selectedGrade !== 'elementary' && letters.length <= 6) {
      const extraChars = 'abcdefghijklmnopqrstuvwxyz';
      letters.push(extraChars[Math.floor(Math.random() * extraChars.length)]);
    }

    const bubbles = letters
      .map((char, i) => ({
        id: `${char}-${i}-${Math.random()}`,
        letter: char,
        isUsed: false,
      }))
      .sort(() => 0.5 - Math.random());

    setAvailableBubbles(bubbles);
    setUserLetters([]);
    setSpellingResult('idle');
    setShowSpellingHint(false);
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

    if (userWord === targetWord) {
      setSpellingResult('correct');
      const addPts = showSpellingHint ? 10 : 20;
      setSpellingScore((prev) => {
        const nextScore = prev + addPts;
        updateHighScore(nextScore);
        return nextScore;
      });
      speechService.playItem(currentSpellingItem.id, currentSpellingItem.word, undefined, 1);

      if (onChangeMastery) {
        onChangeMastery(currentSpellingItem.id, 2);
      }
    } else {
      setSpellingResult('wrong');
      setTimeout(() => setSpellingResult('idle'), 1000);
    }
  };

  const nextSpellingRound = () => {
    let pool = spellingPool;
    let nextIdx = spellingIndex + 1;
    if (pool.length === 0 || nextIdx >= pool.length) {
      pool = [...currentGradeWords].sort(() => 0.5 - Math.random());
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
      pool = [...currentGradeWords].sort(() => 0.5 - Math.random());
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
  // GAME 3: SPEED TIME-ATTACK CHALLENGE (스피드 타임어택)
  // ==========================================
  const [speedPool, setSpeedPool] = useState<VocabItem[]>([]);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [speedScore, setSpeedScore] = useState(0);
  const [speedCombo, setSpeedCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [isSpeedPlaying, setIsSpeedPlaying] = useState(false);
  const [isSpeedGameOver, setIsSpeedGameOver] = useState(false);
  const [speedOptions, setSpeedOptions] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      const otherWords = Array.from(
        new Set(
          sourcePool
            .map((v) => v.word)
            .filter((w) => w && w.toLowerCase() !== correct.toLowerCase())
        )
      ).sort(() => 0.5 - Math.random()).slice(0, 3);
      return {
        prompt: `"${getCleanKoreanMeaning(target)}"`,
        subtext: '한국어 뜻에 맞는 올바른 영단어는?',
        options: [correct, ...otherWords].sort(() => 0.5 - Math.random()),
        correct,
      };
    } else if (qaMode === 'en_def_to_en') {
      const correct = target.word;
      const otherWords = Array.from(
        new Set(
          sourcePool
            .map((v) => v.word)
            .filter((w) => w && w.toLowerCase() !== correct.toLowerCase())
        )
      ).sort(() => 0.5 - Math.random()).slice(0, 3);
      return {
        prompt: `"${getEnglishDefinition(target)}"`,
        subtext: '영영 정의에 맞는 올바른 영단어는?',
        options: [correct, ...otherWords].sort(() => 0.5 - Math.random()),
        correct,
      };
    } else {
      // en_to_ko
      const correct = getCleanKoreanMeaning(target);
      const otherMeanings = Array.from(
        new Set(
          sourcePool
            .map((v) => getCleanKoreanMeaning(v))
            .filter((m) => m && m !== correct)
        )
      ).sort(() => 0.5 - Math.random()).slice(0, 3);
      return {
        prompt: target.word,
        subtext: target.ipa ? `[${target.ipa}] 뜻에 맞는 올바른 한국어는?` : '단어 뜻에 맞는 올바른 한국어는?',
        options: [correct, ...otherMeanings].sort(() => 0.5 - Math.random()),
        correct,
      };
    }
  }, [currentGradeWords, qaMode]);

  const startSpeedGame = () => {
    const shuffled = [...currentGradeWords].sort(() => 0.5 - Math.random());
    setSpeedPool(shuffled);
    setIsSpeedPlaying(true);
    setIsSpeedGameOver(false);
    setSpeedScore(0);
    setSpeedCombo(0);
    setTimeLeft(25);
    setSpeedIndex(0);

    const firstItem = shuffled[0] || currentGradeWords[0];
    if (firstItem) {
      const q = getSpeedTargetAndOptions(firstItem, shuffled);
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

    const currentQ = getSpeedTargetAndOptions(currentSpeedItem, speedPool);

    if (selectedChoice === currentQ.correct) {
      // Correct!
      const comboMultiplier = Math.min(speedCombo + 1, 5);
      const pts = 10 * comboMultiplier;
      const nextS = speedScore + pts;
      setSpeedScore(nextS);
      updateHighScore(nextS);
      setSpeedCombo((prev) => prev + 1);
      // Bonus time for streak
      if ((speedCombo + 1) % 3 === 0) {
        setTimeLeft((prev) => Math.min(prev + 3, 30));
      }

      if (onChangeMastery) {
        onChangeMastery(currentSpeedItem.id, 2);
      }
    } else {
      // Wrong
      setSpeedCombo(0);
      setTimeLeft((prev) => Math.max(prev - 2, 0));
    }

    let pool = speedPool;
    let nextIdx = speedIndex + 1;
    if (pool.length === 0 || nextIdx >= pool.length) {
      pool = [...currentGradeWords].sort(() => 0.5 - Math.random());
      setSpeedPool(pool);
      nextIdx = 0;
    }
    setSpeedIndex(nextIdx);
    const nextItem = pool[nextIdx];
    if (nextItem) {
      const nextQ = getSpeedTargetAndOptions(nextItem, pool);
      setSpeedOptions(nextQ.options);
    }
  };

  // Re-init current game whenever grade or game tab changes
  useEffect(() => {
    if (activeGame === 'spelling') {
      const shuffled = [...currentGradeWords].sort(() => 0.5 - Math.random());
      setSpellingPool(shuffled);
      setSpellingIndex(0);
      setSpellingScore(0);
      if (shuffled.length > 0) {
        initSpellingRound(shuffled[0]);
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
      id: 'flashcard_recall' as GameType,
      title: '📇 플래시카드 리콜',
      badge: '4지선다 리콜',
      desc: '제시된 영단어의 정확한 한국어 뜻을 4지선다에서 선택하며 암기 레벨 승급',
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
      desc: '흩어진 알파벳 블록을 조합하여 정확한 단어를 완성',
      icon: <Brain className="w-6 h-6 text-emerald-500" />,
    },
    {
      id: 'speed' as GameType,
      title: '⚡ 스피드 타임어택',
      badge: '순발력 25초',
      desc: '제한시간 동안 최대한 많은 정답을 맞추는 스피드 게임',
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
      desc: '단어와 뜻의 일치 여부를 좌우 스와이프로 빠르게 판단',
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
      desc: '신나는 비트 리듬에 맞춰 단어를 맞추는 리듬 게임',
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

  return (
    <>
      {/* 1. Game Selection Catalog (Kept mounted so scroll position and layout remain stable) */}
      <div className="space-y-3 max-w-5xl mx-auto py-1">
        {/* Banner & Grade Selector */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white shadow-md border border-indigo-500/20 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  학생 눈높이 어휘 & 문장 챌린지
                </span>
                <span className="text-[11px] text-indigo-200">클릭 시 100dvh 전체화면 실행</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">🎮 신나는 영단어·문장 게임 천국</h2>
            </div>

            {/* High Score Badge */}
            <div className="bg-white/10 px-2.5 py-1 rounded-xl border border-white/20 flex items-center gap-2 shrink-0">
              <Trophy className="w-4 h-4 text-amber-300" />
              <div className="text-right">
                <span className="text-[9px] text-indigo-200 block leading-tight">최고 기록</span>
                <span className="text-xs font-black text-amber-300 leading-tight">{highScore}점</span>
              </div>
            </div>
          </div>

          {/* Grade Selection Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1.5 border-t border-indigo-500/25">
            <button
              onClick={() => setSelectedGrade('all')}
              className={`py-1.5 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 ${
                selectedGrade === 'all'
                  ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-300 font-black'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <span>🌟 전체 통합 (3,210)</span>
            </button>
            <button
              onClick={() => setSelectedGrade('elementary')}
              className={`py-1.5 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 ${
                selectedGrade === 'elementary'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <span>🎒 초등 필수 (800)</span>
            </button>
            <button
              onClick={() => setSelectedGrade('middle')}
              className={`py-1.5 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 ${
                selectedGrade === 'middle'
                  ? 'bg-blue-500 text-white shadow-sm font-black'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <span>🏫 중학 필수 (1,200)</span>
            </button>
            <button
              onClick={() => setSelectedGrade('high_sat')}
              className={`py-1.5 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 ${
                selectedGrade === 'high_sat'
                  ? 'bg-purple-500 text-white shadow-sm font-black'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <span>🎓 고등·수능 (1,210)</span>
            </button>
          </div>
        </div>

        {/* Category Mode Switcher: 🔤 단어 게임 (9종) vs 💬 문장 게임 (5종) */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 shadow-inner">
          <button
            onClick={() => setGameCategory('word')}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              gameCategory === 'word'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-black/5 dark:ring-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🔤 단어 게임 (9종)</span>
          </button>
          <button
            onClick={() => setGameCategory('sentence')}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              gameCategory === 'sentence'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-md ring-1 ring-black/5 dark:ring-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>💬 문장 게임 (5종)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-purple-600 text-white">
              🎲 랜덤 출제
            </span>
          </button>
        </div>

        {/* Sentence Game Random Delivery Banner */}
        {gameCategory === 'sentence' && (
          <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-500/20 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>🎲 500+ 고품질 실전 예문이 무작위 랜덤으로 출제되어 풍부한 응용력을 기를 수 있습니다!</span>
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
                    <div className="flex items-center gap-1">
                      {isRecentlyPlayed && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-500 text-slate-950 shadow-xs">
                          방금 플레이
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {item.badge}
                      </span>
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

      {/* ==================================================== */}
      {/* GAME 0 UI: FLASHCARD RECALL (4지선다 리콜 & 암기 승급) */}
      {/* ==================================================== */}
      {activeGame === 'flashcard_recall' && (
        <FlashcardRecallGame
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
          onChangeMastery={onChangeMastery}
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
          onChangeMastery={onChangeMastery}
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
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                    품사: {currentSpellingItem.partOfSpeech}
                  </span>
                  <button
                    onClick={() => {
                      speechService.playItem(currentSpellingItem.id, currentSpellingItem.word, undefined, 1);
                    }}
                    className="p-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-all"
                    title="발음 듣기"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showSpellingHint && (
                  <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 animate-in fade-in">
                    💡 힌트 (첫글자): <strong className="text-xs font-mono uppercase">{currentSpellingItem.word[0]}</strong> ...
                  </p>
                )}
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

                      {/* Example sentence / Context Word (Enlarged) */}
                      {currentSpellingItem.sentence && (
                        <div className="p-3 sm:p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/70 text-center space-y-1">
                          <span className="text-[11px] sm:text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                            📖 예문 (Example Sentence)
                          </span>
                          <p className="text-base sm:text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 leading-snug">
                            {currentSpellingItem.sentence}
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
                  onClick={() => setShowSpellingHint(true)}
                  disabled={showSpellingHint}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>힌트</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {spellingResult === 'correct' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 정답! (+{showSpellingHint ? 10 : 20}점)
                      </span>
                      <button
                        onClick={nextSpellingRound}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1"
                      >
                        <span>다음</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={checkSpellingAnswer}
                      disabled={userLetters.length === 0}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-md transition-all"
                    >
                      정답 확인 ➔
                    </button>
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
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">⚡ 25초 스피드 타임어택</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  제한시간 동안 빠르게 정답을 고르세요! 3연속 정답 시 보너스 시간 +3초!
                </p>
              </div>

              <button
                onClick={startSpeedGame}
                className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs sm:text-sm shadow-md shadow-rose-500/20 transition-all inline-flex items-center gap-2 active:scale-95"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                <span>타임어택 시작하기</span>
              </button>
            </div>
          ) : isSpeedGameOver ? (
            <div className="p-5 sm:p-8 text-center rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 my-auto">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">⏰ 타임어택 종료!</h3>
              </div>

              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 max-w-xs mx-auto">
                <span className="text-xs text-slate-500 font-bold block">최종 스코어</span>
                <span className="text-3xl font-black text-rose-500">{speedScore}점</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={startSpeedGame}
                  className="px-5 py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition-all inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>한 번 더 도전</span>
                </button>
                <button
                  onClick={handleCloseGame}
                  className="px-5 py-2.5 rounded-xl sm:rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-black text-xs shadow-sm transition-all inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>게임 목록으로 돌아가기</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              {/* Timer Bar & Combo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black">
                  <div className="flex items-center gap-1 text-rose-500">
                    <Timer className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs sm:text-sm">남은 시간: {timeLeft}초</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {speedCombo > 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] sm:text-[11px] font-black animate-bounce flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {speedCombo}x COMBO!
                      </span>
                    )}
                    <span className="text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">점수: {speedScore}점</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full transition-all duration-1000"
                    style={{ width: `${(timeLeft / 25) * 100}%` }}
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
          onChangeMastery={onChangeMastery}
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
          onChangeMastery={onChangeMastery}
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
          onChangeMastery={onChangeMastery}
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
          onChangeMastery={onChangeMastery}
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
          onChangeMastery={onChangeMastery}
          onQuit={handleCloseGame}
        />
      )}

      {/* ==================================================== */}
      {/* GAME 9 UI: SENTENCE SCRAMBLE (문장 어순 블록 조립) */}
      {/* ==================================================== */}
      {activeGame === 'sentence_scramble' && (
        <SentenceScrambleGame
          sentences={currentGradeSentences}
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
          sentences={currentGradeSentences}
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
          sentences={currentGradeSentences}
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
          sentences={currentGradeSentences}
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
          sentences={currentGradeSentences}
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
                    const shuffled = [...currentGradeWords].sort(() => 0.5 - Math.random());
                    setSpellingPool(shuffled);
                    setSpellingIndex(0);
                    if (shuffled.length > 0) {
                      initSpellingRound(shuffled[0]);
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
    </>
  );
};
