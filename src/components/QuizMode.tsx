import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Volume2,
  CheckCircle2,
  XCircle,
  Shuffle,
  Award,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Check,
  RefreshCw,
  ArrowDownAZ,
  SlidersHorizontal,
  Box,
  BrainCircuit,
  Timer,
  Mic,
  TrendingDown,
  Zap,
  Flame,
  Play,
  Pause,
  Eye,
  EyeOff,
  Activity,
  Layers,
  Trophy,
  Target,
  X,
  ArrowLeft
} from 'lucide-react';
import { VocabItem } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning } from '../utils/meaningUtils';
import { recordGameDone } from '../services/habitQuestService';

interface QuizModeProps {
  vocabList: VocabItem[];
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onSelectMode?: (mode: QuizModeType) => void;
  initialMode?: QuizModeType | null;
}

const ALL_ALPHABETS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export type SortOption = 'az' | 'mix' | 'random';
export type DeliveryOrderOption = 'sequential' | 'random';
export type QuizModeType =
  | 'flashcard'
  | 'quiz'
  | 'review_quiz'
  | 'leitner'
  | 'cloze'
  | 'speed'
  | 'speech_recall'
  | 'forgetting_curve'
  | 'wrong_notes';

const getFilteredVocabList = (list: VocabItem[], filter: 'all' | 0 | 1 | 2, currentMode?: QuizModeType) => {
  if (currentMode === 'review_quiz') {
    // Specifically target weak vocabulary: masteryLevel 0 (unlearned) or 1 (learning in-progress)
    return list.filter((item) => {
      const itemLevel = item.masteryLevel ?? (item.isLearned ? 2 : 0);
      return itemLevel === 0 || itemLevel === 1;
    });
  }

  const filtered = list.filter((item) => {
    const itemLevel = item.masteryLevel ?? (item.isLearned ? 2 : 0);
    return filter === 'all' || itemLevel === filter;
  });
  return filtered.length > 0 ? filtered : list;
};

const applyQuizStudyOptions = (
  list: VocabItem[],
  filter: 'all' | 0 | 1 | 2,
  deliveryOrder: DeliveryOrderOption,
  selectedLetters: string[],
  currentMode?: QuizModeType
) => {
  let filtered = getFilteredVocabList(list, filter, currentMode);

  if (selectedLetters.length > 0 && selectedLetters.length < 26) {
    const letterSet = new Set(selectedLetters.map((l) => l.toUpperCase()));
    const letterFiltered = filtered.filter((item) => {
      const firstChar = item.word.trim().charAt(0).toUpperCase();
      return letterSet.has(firstChar);
    });
    if (letterFiltered.length > 0) {
      filtered = letterFiltered;
    }
  }

  if (deliveryOrder === 'sequential') {
    return [...filtered].sort((a, b) =>
      a.word.localeCompare(b.word, 'en', { sensitivity: 'base' })
    );
  } else {
    return [...filtered].sort(() => 0.5 - Math.random());
  }
};

export const QuizMode: React.FC<QuizModeProps> = ({ vocabList, onChangeMastery, onSelectMode, initialMode }) => {
  const [selectedQuizMode, setSelectedQuizMode] = useState<QuizModeType | null>(null);
  const [lastPlayedQuizMode, setLastPlayedQuizMode] = useState<QuizModeType | null>(null);
  const [mode, setMode] = useState<QuizModeType>('flashcard');

  // Auto open initial quiz mode if provided
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
      setSelectedQuizMode(initialMode);
      setLastPlayedQuizMode(initialMode);
    }
  }, [initialMode]);

  // When returning to the Quiz Mode Selection Catalog, scroll directly to the card of the mode just played
  useEffect(() => {
    if (selectedQuizMode === null && lastPlayedQuizMode) {
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          const cardEl = document.getElementById(`quiz-catalog-card-${lastPlayedQuizMode}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [selectedQuizMode, lastPlayedQuizMode]);
  const [masteryFilter, setMasteryFilter] = useState<'all' | 0 | 1 | 2>(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Alphabet (A-Z) & Question Delivery Mode Options (Universal for all Quiz/Study modes)
  const [deliveryOrder, setDeliveryOrder] = useState<DeliveryOrderOption>('sequential');
  const [selectedLetters, setSelectedLetters] = useState<string[]>(ALL_ALPHABETS);
  const [isOptionsPanelOpen, setIsOptionsPanelOpen] = useState<boolean>(false);

  // Wrong Answers Track (오답노트)
  const [wrongAnswers, setWrongAnswers] = useState<VocabItem[]>([]);

  // Multiple Choice Quiz state
  const [quizScore, setQuizScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Review Quiz (취약 어휘 0~1단계 집중 복습) state
  const [promotedCount, setPromotedCount] = useState<number>(0);
  const [lastPromotedWord, setLastPromotedWord] = useState<{
    word: string;
    prevLevel: number;
    newLevel: number;
  } | null>(null);

  // Weak vocabulary count tracking (Mastery Level 0 or 1)
  const weakVocabCount = vocabList.filter(
    (v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) <= 1
  ).length;
  const level0Count = vocabList.filter(
    (v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) === 0
  ).length;
  const level1Count = vocabList.filter(
    (v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) === 1
  ).length;

  // Stable session list for the active practice round
  const [sessionList, setSessionList] = useState<VocabItem[]>(() =>
    applyQuizStudyOptions(vocabList, 0, 'sequential', ALL_ALPHABETS)
  );

  // ==========================================
  // 1. LEITNER SYSTEM (라이트너 5단계 상자) STATE
  // ==========================================
  const [leitnerBoxes, setLeitnerBoxes] = useState<{ [id: string]: number }>(() => {
    const saved = localStorage.getItem('wordloop_leitner_boxes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    const initial: { [id: string]: number } = {};
    vocabList.forEach((v) => {
      const lvl = v.masteryLevel ?? (v.isLearned ? 2 : 0);
      initial[v.id] = lvl === 2 ? 5 : lvl === 1 ? 3 : 1;
    });
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('wordloop_leitner_boxes', JSON.stringify(leitnerBoxes));
  }, [leitnerBoxes]);

  // ==========================================
  // 2. CLOZE / AI CONTEXT QUIZ STATE
  // ==========================================
  const [showClozeHint, setShowClozeHint] = useState<boolean>(false);

  // ==========================================
  // 3. SPEED TIME ATTACK QUIZ STATE
  // ==========================================
  const [speedTimer, setSpeedTimer] = useState<number>(60);
  const [isSpeedActive, setIsSpeedActive] = useState<boolean>(false);
  const [speedScore, setSpeedScore] = useState<number>(0);
  const [speedCombo, setSpeedCombo] = useState<number>(0);
  const [speedMaxCombo, setSpeedMaxCombo] = useState<number>(0);
  const [speedHighScore, setSpeedHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('wordloop_speed_quiz_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const speedIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isSpeedActive) {
      speedIntervalRef.current = setInterval(() => {
        setSpeedTimer((prev) => {
          if (prev <= 1) {
            if (speedIntervalRef.current) clearInterval(speedIntervalRef.current);
            setIsSpeedActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (speedIntervalRef.current) clearInterval(speedIntervalRef.current);
    }
    return () => {
      if (speedIntervalRef.current) clearInterval(speedIntervalRef.current);
    };
  }, [isSpeedActive]);

  const startSpeedQuiz = () => {
    setSpeedTimer(60);
    setSpeedScore(0);
    setSpeedCombo(0);
    setSpeedMaxCombo(0);
    setIsSpeedActive(true);
    setCurrentIndex(0);
    const shuffled = [...vocabList].sort(() => 0.5 - Math.random());
    setSessionList(shuffled);
    if (shuffled.length > 0) {
      setOptions(getQuizOptions(shuffled[0], quizStructure));
      setClozeOptions(getClozeOptions(shuffled[0]));
      setSpeedPair(generateSpeedPair(shuffled[0], quizStructure));
    }
  };

  const updateSpeedHighScore = (score: number) => {
    if (score > speedHighScore) {
      localStorage.setItem('wordloop_speed_quiz_highscore', score.toString());
      setSpeedHighScore(score);
    }
  };

  // ==========================================
  // 4. SPEECH & RECALL MODE STATE
  // ==========================================
  const [isWordRevealed, setIsWordRevealed] = useState<boolean>(false);

  // ==========================================
  // Quiz Question-Answer Structure State
  // ==========================================
  const [quizStructure, setQuizStructure] = useState<'ko_en' | 'en_en' | 'en_ko'>('en_ko');

  // Generate 4 multiple choice options for quiz mode based on selected structure
  const getQuizOptions = (item: VocabItem, structure: 'ko_en' | 'en_en' | 'en_ko' = quizStructure) => {
    if (!item) return [];
    if (structure === 'en_ko') {
      const correctAnswer = getCleanKoreanMeaning(item);
      const otherMeanings = Array.from(
        new Set(
          vocabList
            .filter((v) => v.id !== item.id)
            .map((v) => getCleanKoreanMeaning(v))
            .filter((m) => m && m.trim() !== '' && m !== correctAnswer)
        )
      );
      const shuffledOthers = [...otherMeanings].sort(() => 0.5 - Math.random()).slice(0, 3);
      return Array.from(new Set([correctAnswer, ...shuffledOthers])).sort(() => 0.5 - Math.random());
    } else {
      const correctAnswer = item.word;
      const otherWords = Array.from(
        new Set(
          vocabList
            .filter((v) => v.id !== item.id && v.word.toLowerCase() !== item.word.toLowerCase())
            .map((v) => v.word)
            .filter(Boolean)
        )
      );
      const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random()).slice(0, 3);
      return Array.from(new Set([correctAnswer, ...shuffledOthers])).sort(() => 0.5 - Math.random());
    }
  };

  // Generate 4 options for cloze mode (contains correct VocabItem and 3 other VocabItems)
  const getClozeOptions = (item: VocabItem) => {
    if (!item) return [];
    const otherItems = vocabList.filter(
      (v) => v.word.toLowerCase() !== item.word.toLowerCase()
    );
    const shuffledOthers = [...otherItems].sort(() => 0.5 - Math.random()).slice(0, 3);
    const allOptions = [item, ...shuffledOthers].sort(() => 0.5 - Math.random());
    return allOptions;
  };

  // Generate a pair for Speed Time Attack (50% match, 50% mismatch)
  const generateSpeedPair = (item: VocabItem, structure: 'ko_en' | 'en_en' | 'en_ko' = quizStructure) => {
    if (!item) return { proposed: '', isMatch: true };
    const isMatch = Math.random() < 0.5;

    if (structure === 'en_ko') {
      const correctMeaning = getCleanKoreanMeaning(item);

      if (isMatch) {
        return { proposed: correctMeaning, isMatch: true };
      } else {
        const otherItems = vocabList.filter(
          (v) => v.id !== item.id && getCleanKoreanMeaning(v) !== correctMeaning
        );
        if (otherItems.length === 0) {
          return { proposed: correctMeaning, isMatch: true };
        }
        const randomWrong = otherItems[Math.floor(Math.random() * otherItems.length)];
        return { proposed: getCleanKoreanMeaning(randomWrong), isMatch: false };
      }
    } else {
      // 'ko_en' or 'en_en' -> Proposed text is an English word
      if (isMatch) {
        return { proposed: item.word, isMatch: true };
      } else {
        const otherItems = vocabList.filter(
          (v) => v.id !== item.id && v.word.toLowerCase() !== item.word.toLowerCase()
        );
        if (otherItems.length === 0) {
          return { proposed: item.word, isMatch: true };
        }
        const randomWrong = otherItems[Math.floor(Math.random() * otherItems.length)];
        return { proposed: randomWrong.word, isMatch: false };
      }
    }
  };

  const [options, setOptions] = useState<string[]>(() =>
    sessionList.length > 0 ? getQuizOptions(sessionList[0], 'en_ko') : []
  );

  const [clozeOptions, setClozeOptions] = useState<VocabItem[]>(() =>
    sessionList.length > 0 ? getClozeOptions(sessionList[0]) : []
  );

  const [speedPair, setSpeedPair] = useState<{ proposed: string; isMatch: boolean }>(() =>
    sessionList.length > 0 ? generateSpeedPair(sessionList[0], 'en_ko') : { proposed: '', isMatch: true }
  );

  const handleStructureChange = (newStructure: 'ko_en' | 'en_en' | 'en_ko') => {
    setQuizStructure(newStructure);
    setSelectedOption(null);
    setIsAnswered(false);
    const activeItem = sessionList[currentIndex];
    if (activeItem) {
      setOptions(getQuizOptions(activeItem, newStructure));
      setSpeedPair(generateSpeedPair(activeItem, newStructure));
    }
  };

  // Automatically keep options, cloze options, and speed pair in sync when structure, index or list changes
  useEffect(() => {
    const activeItem = sessionList[currentIndex];
    if (activeItem) {
      setOptions(getQuizOptions(activeItem, quizStructure));
      setClozeOptions(getClozeOptions(activeItem));
      setSpeedPair(generateSpeedPair(activeItem, quizStructure));
    }
  }, [currentIndex, sessionList, quizStructure]);

  const handleFilterChange = (newFilter: 'all' | 0 | 1 | 2) => {
    setMasteryFilter(newFilter);
    const newList = applyQuizStudyOptions(vocabList, newFilter, deliveryOrder, selectedLetters);
    setSessionList(newList);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswered(false);
    setKnownCount(0);
    setReviewCount(0);
    setIsWordRevealed(false);
    setShowClozeHint(false);
    if (newList.length > 0) {
      setOptions(getQuizOptions(newList[0]));
      setClozeOptions(getClozeOptions(newList[0]));
    }
  };

  useEffect(() => {
    return () => {
      speechService.stop();
    };
  }, []);

  const handleModeChange = (newMode: QuizModeType) => {
    speechService.stop();
    setMode(newMode);
    if (onSelectMode) {
      onSelectMode(newMode);
    }
    const newList = applyQuizStudyOptions(vocabList, masteryFilter, deliveryOrder, selectedLetters, newMode);
    setSessionList(newList);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsWordRevealed(false);
    setShowClozeHint(false);
    setQuizScore(0);
    setPromotedCount(0);
    setLastPromotedWord(null);
    if (newMode === 'speed') {
      setIsSpeedActive(false);
      setSpeedTimer(60);
    }
    if (newList.length > 0) {
      setOptions(getQuizOptions(newList[0], quizStructure));
      setClozeOptions(getClozeOptions(newList[0]));
    }
  };

  const handleRestartSession = () => {
    const newList = applyQuizStudyOptions(vocabList, masteryFilter, deliveryOrder, selectedLetters, mode);
    setSessionList(newList);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswered(false);
    setQuizScore(0);
    setPromotedCount(0);
    setLastPromotedWord(null);
    setKnownCount(0);
    setReviewCount(0);
    setIsWordRevealed(false);
    setShowClozeHint(false);
    if (newList.length > 0) {
      setOptions(getQuizOptions(newList[0], quizStructure));
      setClozeOptions(getClozeOptions(newList[0]));
    }
  };

  // Universal Delivery Order (순차 vs 랜덤) Handler
  const handleSetDeliveryOrder = (newOrder: DeliveryOrderOption) => {
    setDeliveryOrder(newOrder);
    const newList = applyQuizStudyOptions(vocabList, masteryFilter, newOrder, selectedLetters, mode);
    setSessionList(newList);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswered(false);
    if (newList.length > 0) {
      setOptions(getQuizOptions(newList[0], quizStructure));
      setClozeOptions(getClozeOptions(newList[0]));
    }
  };

  // Single Alphabet selection or All
  const handleSelectSingleLetter = (letter: string) => {
    speechService.speakOnce(letter);
    const targetLetters = letter === 'ALL' ? ALL_ALPHABETS : [letter.toUpperCase()];
    setSelectedLetters(targetLetters);
    const newList = applyQuizStudyOptions(vocabList, masteryFilter, deliveryOrder, targetLetters, mode);
    setSessionList(newList);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswered(false);
    if (newList.length > 0) {
      setOptions(getQuizOptions(newList[0], quizStructure));
      setClozeOptions(getClozeOptions(newList[0]));
    }
  };

  const handleToggleLetter = (letter: string) => {
    speechService.speakOnce(letter);
    let updated: string[];
    if (selectedLetters.includes(letter)) {
      if (selectedLetters.length === 1) return;
      updated = selectedLetters.filter((l) => l !== letter);
    } else {
      updated = [...selectedLetters, letter];
    }
    setSelectedLetters(updated);

    const newList = applyQuizStudyOptions(vocabList, masteryFilter, deliveryOrder, updated);
    setSessionList(newList);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswered(false);
    if (newList.length > 0) {
      setOptions(getQuizOptions(newList[0]));
      setClozeOptions(getClozeOptions(newList[0]));
    }
  };

  const handleSelectPreset = (preset: 'ALL' | 'A-E' | 'F-J' | 'K-O' | 'P-T' | 'U-Z') => {
    let rangeLetters: string[] = [];
    if (preset === 'ALL') {
      rangeLetters = [...ALL_ALPHABETS];
    } else if (preset === 'A-E') {
      rangeLetters = ['A', 'B', 'C', 'D', 'E'];
    } else if (preset === 'F-J') {
      rangeLetters = ['F', 'G', 'H', 'I', 'J'];
    } else if (preset === 'K-O') {
      rangeLetters = ['K', 'L', 'M', 'N', 'O'];
    } else if (preset === 'P-T') {
      rangeLetters = ['P', 'Q', 'R', 'S', 'T'];
    } else if (preset === 'U-Z') {
      rangeLetters = ['U', 'V', 'W', 'X', 'Y', 'Z'];
    }

    setSelectedLetters(rangeLetters);
    const newList = applyQuizStudyOptions(vocabList, masteryFilter, deliveryOrder, rangeLetters);
    setSessionList(newList);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswered(false);
    if (newList.length > 0) {
      setOptions(getQuizOptions(newList[0]));
      setClozeOptions(getClozeOptions(newList[0]));
    }
  };

  const handleReshuffleSession = () => {
    const newList = applyQuizStudyOptions(vocabList, masteryFilter, 'random', selectedLetters, mode);
    setSessionList(newList);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswered(false);
    if (newList.length > 0) {
      setOptions(getQuizOptions(newList[0], quizStructure));
      setClozeOptions(getClozeOptions(newList[0]));
    }
  };

  if (vocabList.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
        <p className="text-slate-500 font-medium text-sm">암기장에 단어가 존재하지 않습니다. 단어를 추가하거나 기본 목록을 이용해 주세요.</p>
      </div>
    );
  }

  const currentItem = sessionList[currentIndex];

  const handleNextItem = () => {
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsWordRevealed(false);
    setShowClozeHint(false);
    setLastPromotedWord(null);
    let nextIdx = currentIndex + 1;
    if (isSpeedActive && nextIdx >= sessionList.length && sessionList.length > 0) {
      const reshuffled = [...sessionList].sort(() => 0.5 - Math.random());
      setSessionList(reshuffled);
      nextIdx = 0;
    }
    setCurrentIndex(nextIdx);

    if (nextIdx < sessionList.length) {
      const nextItem = sessionList[nextIdx];
      if (nextItem) {
        setOptions(getQuizOptions(nextItem, quizStructure));
        setClozeOptions(getClozeOptions(nextItem));
        setSpeedPair(generateSpeedPair(nextItem, quizStructure));
      }
    }
  };

  const handlePlayAudio = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentItem) {
      if (mode === 'speech_recall') {
        speechService.speakOnce(currentItem.word, 'en-US');
      } else {
        speechService.playItem(currentItem.id, currentItem.word, currentItem.meaning, 1);
      }
    }
  };

  const handleKnownClick = () => {
    if (!currentItem) return;
    setKnownCount((prev) => prev + 1);
    if (onChangeMastery) {
      onChangeMastery(currentItem.id, 2);
    }
    handleNextItem();
  };

  const handleReviewClick = () => {
    if (!currentItem) return;
    setReviewCount((prev) => prev + 1);
    if (onChangeMastery) {
      onChangeMastery(currentItem.id, 0);
    }
    if (!wrongAnswers.some((w) => w.id === currentItem.id)) {
      setWrongAnswers((prev) => [...prev, currentItem]);
    }
    handleNextItem();
  };

  // Leitner box advance
  const handleLeitnerAnswer = (isCorrect: boolean) => {
    if (!currentItem) return;
    const currentBox = leitnerBoxes[currentItem.id] || 1;
    let newBox = currentBox;

    if (isCorrect) {
      newBox = Math.min(5, currentBox + 1);
      if (newBox >= 4 && onChangeMastery) {
        onChangeMastery(currentItem.id, 2);
      } else if (newBox >= 2 && onChangeMastery) {
        onChangeMastery(currentItem.id, 1);
      }
    } else {
      newBox = 1; // Drop back to Box 1 on error
      if (onChangeMastery) onChangeMastery(currentItem.id, 0);
      if (!wrongAnswers.some((w) => w.id === currentItem.id)) {
        setWrongAnswers((prev) => [...prev, currentItem]);
      }
    }

    setLeitnerBoxes((prev) => ({ ...prev, [currentItem.id]: newBox }));
    handleNextItem();
  };

  // Speed Quiz Choice Handler
  const handleSpeedChoice = (userChoice: boolean) => {
    if (!isSpeedActive || speedTimer <= 0 || !currentItem) return;

    const isCorrect = userChoice === speedPair.isMatch;

    if (isCorrect) {
      const newCombo = speedCombo + 1;
      const pts = 100 + newCombo * 20;
      const newScore = speedScore + pts;
      setSpeedScore(newScore);
      setSpeedCombo(newCombo);
      if (newCombo > speedMaxCombo) setSpeedMaxCombo(newCombo);
      updateSpeedHighScore(newScore);
      if (onChangeMastery) onChangeMastery(currentItem.id, 2);
    } else {
      setSpeedCombo(0);
      if (onChangeMastery) onChangeMastery(currentItem.id, 0);
      if (!wrongAnswers.some((w) => w.id === currentItem.id)) {
        setWrongAnswers((prev) => [...prev, currentItem]);
      }
    }

    handleNextItem();
  };

  const handleOptionSelect = (option: string) => {
    if (isAnswered || !currentItem) return;
    setSelectedOption(option);
    setIsAnswered(true);

    // Record game/quiz progress for daily 3-minute quest
    recordGameDone();

    const isCorrect = quizStructure === 'en_ko'
      ? option === getCleanKoreanMeaning(currentItem)
      : option.toLowerCase() === currentItem.word.toLowerCase();

    if (isCorrect) {
      setQuizScore((prev) => prev + 10);
      const currentLvl = currentItem.masteryLevel ?? (currentItem.isLearned ? 2 : 0);
      const nextLvl = (currentLvl < 2 ? currentLvl + 1 : 2) as 0 | 1 | 2;
      if (onChangeMastery) {
        onChangeMastery(currentItem.id, nextLvl);
      }
      if (mode === 'review_quiz') {
        setPromotedCount((prev) => prev + 1);
        setLastPromotedWord({
          word: currentItem.word,
          prevLevel: currentLvl,
          newLevel: nextLvl,
        });
      }
    } else {
      if (onChangeMastery) {
        onChangeMastery(currentItem.id, 0);
      }
      if (mode === 'review_quiz') {
        setLastPromotedWord(null);
      }
      if (!wrongAnswers.some((w) => w.id === currentItem.id)) {
        setWrongAnswers((prev) => [...prev, currentItem]);
      }
    }
  };

  // Cloze sentence helper
  const getClozeSentence = (item: VocabItem) => {
    if (!item) return { sentence: '', targetWord: '' };
    const rawSentence = item.sentence || `This is an example sentence featuring the word ${item.word}.`;
    
    // Create a regex that matches the base word with optional common suffixes
    const escapedWord = item.word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match word boundaries with optional suffixes (s, es, ed, ing, ly, d, r, st, est)
    const regex = new RegExp(`\\b${escapedWord}(s|ed|ing|ly|es|d|r|st|est)?\\b`, 'gi');
    let clozeText = rawSentence.replace(regex, ' [  ❓  ] ');

    // Secondary fallback: If the word is still found in the sentence (case-insensitive check),
    // replace any word containing it to ensure the target word never leaks in the clue
    if (clozeText.toLowerCase().includes(item.word.toLowerCase())) {
      const fallbackRegex = new RegExp(`${escapedWord}[a-zA-Z]*`, 'gi');
      clozeText = clozeText.replace(fallbackRegex, ' [  ❓  ] ');
    }
    
    return { sentence: clozeText, targetWord: item.word };
  };

  const handleOpenMode = (targetMode: QuizModeType) => {
    speechService.stop();
    setLastPlayedQuizMode(targetMode);
    setSelectedQuizMode(targetMode);
    handleModeChange(targetMode);
  };

  const handleCloseFullscreen = () => {
    speechService.stop();
    setLastPlayedQuizMode(mode);
    setSelectedQuizMode(null);
  };

  const quizModesCatalog = [
    {
      id: 'flashcard' as QuizModeType,
      title: '🎴 기본 플래시카드',
      badge: '자율 학습',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      desc: 'A~Z 정렬, 알파벳 믹스, 발음 청취 및 카드 뒤집기 자율 어휘 암기',
      icon: <BookOpen className="w-5 h-5 text-emerald-500" />,
    },
    {
      id: 'quiz' as QuizModeType,
      title: '🧩 4지선다 실전 퀴즈',
      badge: '실전 테스트',
      badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      desc: '4개 객관식 뜻 중 정답을 고르며 마스터 등급 상승',
      icon: <CheckCircle2 className="w-5 h-5 text-indigo-500" />,
    },
    {
      id: 'review_quiz' as QuizModeType,
      title: '🎯 취약 어휘 복습 퀴즈 (Review Quiz)',
      badge: `취약 ${weakVocabCount}단어 집중`,
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      desc: '마스터 등급 0~1단계(미암기·학습중) 취약 단어만 추출하여 맞출 때마다 실시간 승급 훈련',
      icon: <Target className="w-5 h-5 text-rose-500" />,
    },
    {
      id: 'leitner' as QuizModeType,
      title: '📦 라이트너 5단계 상자',
      badge: '과학적 복습',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      desc: '에빙하우스 주기 적용: 맞추면 상자 승급, 틀리면 1상자 복귀',
      icon: <Box className="w-5 h-5 text-amber-500" />,
    },
    {
      id: 'cloze' as QuizModeType,
      title: '🧠 AI 맥락 예문 빈칸',
      badge: '맥락 어휘',
      badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      desc: '실제 문장 맥락 속 가려진 빈칸 단어를 추론하며 실전 적응',
      icon: <BrainCircuit className="w-5 h-5 text-purple-500" />,
    },
    {
      id: 'speed' as QuizModeType,
      title: '⚡ 60초 스피드 타임어택',
      badge: '순발력 콤보',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      desc: '60초 동안 번개처럼 판단하여 콤보와 폭발적 점수를 달성',
      icon: <Timer className="w-5 h-5 text-rose-500" />,
    },
    {
      id: 'speech_recall' as QuizModeType,
      title: '🎙️ 발음 & 음성 회상',
      badge: '청취 회상',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      desc: '소리를 듣고 단어의 스펠링과 뜻을 머릿속으로 떠올리는 훈련',
      icon: <Mic className="w-5 h-5 text-blue-500" />,
    },
    {
      id: 'forgetting_curve' as QuizModeType,
      title: '📉 망각곡선 & 복습 분석',
      badge: '학습 분석',
      badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      desc: '망각 위험군 분석 및 망각 극복 맞춤 학습 세션',
      icon: <TrendingDown className="w-5 h-5 text-teal-500" />,
    },
    {
      id: 'wrong_notes' as QuizModeType,
      title: '📓 오답노트 모음집',
      badge: '약점 보완',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      desc: '틀린 단어들을 모아 집중 복습하고 마스터 등급으로 승급',
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
    },
  ];

  const activeModeItem = [
    { id: 'flashcard', title: '🎴 기본 플래시카드' },
    { id: 'quiz', title: '🧩 4지선다 실전 퀴즈' },
    { id: 'review_quiz', title: '🎯 취약 어휘 복습 퀴즈 (Review Quiz)' },
    { id: 'leitner', title: '📦 라이트너 5단계 상자' },
    { id: 'cloze', title: '🧠 AI 맥락 예문 빈칸' },
    { id: 'speed', title: '⚡ 60초 스피드 타임어택' },
    { id: 'speech_recall', title: '🎙️ 발음 & 음성 회상' },
    { id: 'forgetting_curve', title: '📉 망각곡선 분석' },
    { id: 'wrong_notes', title: '📓 오답노트 모음집' },
  ].find((m) => m.id === mode);

  return (
    <>
      {/* 1. Quiz Mode Selection Catalog (Kept mounted so scroll position and layout remain stable) */}
      <div className="space-y-3 max-w-5xl mx-auto py-1">
        {/* Compact Banner Header */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                스마트 어휘 센터
              </span>
              <span className="text-[11px] text-indigo-200 font-mono">총 {vocabList.length}개 단어 수록</span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight">🎯 원하는 학습 & 퀴즈 모드를 선택하세요</h2>
          </div>
          <p className="text-[11px] text-indigo-200/90 shrink-0">
            모드 선택 시 <strong className="text-amber-300 font-bold">100dvh 전체화면</strong>으로 자동 전환됩니다.
          </p>
        </div>

        {/* 8 Quiz Modes Catalog Grid (2x4 / 4x2 Responsive One-Screen Grid) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {quizModesCatalog.map((item) => {
            const isRecentlyPlayed = lastPlayedQuizMode === item.id;
            return (
              <div
                key={item.id}
                id={`quiz-catalog-card-${item.id}`}
                onClick={() => handleOpenMode(item.id)}
                className={`group p-3 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-2 hover:-translate-y-0.5 scroll-mt-24 ${
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
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${item.badgeBg}`}>
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
                    handleOpenMode(item.id);
                  }}
                  className={`w-full py-1.5 px-2.5 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 shadow-sm ${
                    isRecentlyPlayed
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{isRecentlyPlayed ? '다시 시작' : '학습 시작'}</span>
                  <Play className="w-3 h-3 fill-current" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Full-screen Modal View when a mode is active (Unified compact header + 100dvh layout) */}
      {selectedQuizMode !== null && (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 p-2 sm:p-3 md:p-4 overflow-hidden flex flex-col h-[100dvh] max-h-[100dvh] select-none animate-in fade-in zoom-in-95 duration-200">
      {/* Unified Compact Top Header Bar */}
      <header className="shrink-0 max-w-5xl w-full mx-auto pb-1.5 sm:pb-2 mb-1 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Back button & Active Mode Badge */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={handleCloseFullscreen}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-[11px] sm:text-xs flex items-center gap-1 transition-all border border-slate-300 dark:border-slate-700 shrink-0"
              title="퀴즈 목록으로 나가기"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>목록</span>
            </button>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-xs border border-indigo-500/20 truncate">
              <span>{activeModeItem?.title || '퀴즈 & 학습'}</span>
            </div>
          </div>

          {/* Center: Inline Compact Mastery Filter Chips */}
          {mode !== 'wrong_notes' && mode !== 'speed' && mode !== 'forgetting_curve' && mode !== 'review_quiz' && (
            <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] sm:text-[11px] overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => handleFilterChange('all')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  masteryFilter === 'all'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                전체({vocabList.length})
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange(0)}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  masteryFilter === 0
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                }`}
              >
                🔴 미암기({vocabList.filter((v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) === 0).length})
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange(1)}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  masteryFilter === 1
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                }`}
              >
                🟡 학습중({vocabList.filter((v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) === 1).length})
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange(2)}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  masteryFilter === 2
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                }`}
              >
                🟢 완벽({vocabList.filter((v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) === 2).length})
              </button>
            </div>
          )}

          {/* When in Review Quiz mode: Show specialized Weak Vocab Progress Indicator */}
          {mode === 'review_quiz' && (
            <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[10px] sm:text-[11px] overflow-x-auto no-scrollbar">
              <span className="font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                <span>취약 어휘(0~1단계) 집중 복습</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-extrabold text-[9px]">
                🔴 미암기 {level0Count}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-extrabold text-[9px]">
                🟡 학습중 {level1Count}
              </span>
              {promotedCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-extrabold text-[9px] animate-pulse">
                  🚀 승급 +{promotedCount}
                </span>
              )}
            </div>
          )}

          {/* Right: Progress & Score Badge */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs">
            {(mode === 'quiz' || mode === 'review_quiz') && (
              <span className="px-2 py-0.5 sm:py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-black">
                ⭐ {quizScore}점
              </span>
            )}
            <span className="px-2 py-0.5 sm:py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold font-mono text-[11px] sm:text-xs">
              {sessionList.length > 0 ? `${Math.min(currentIndex + 1, sessionList.length)} / ${sessionList.length}` : '0 / 0'}
            </span>
          </div>
        </div>
      </header>

      {/* Universal Alphabet Filter & Delivery Order Bar (A-Z 시작 알파벳 & 순차/랜덤 출제) */}
      <div className="shrink-0 max-w-5xl w-full mx-auto mb-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
          {/* Alphabet Preset / Single Letter Quick View */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 shrink-0 px-1 flex items-center gap-0.5">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>시작 알파벳:</span>
            </span>

            <button
              onClick={() => handleSelectSingleLetter('ALL')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all shrink-0 ${
                selectedLetters.length === 26
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              전체 A~Z
            </button>

            {/* Presets */}
            {(['A-E', 'F-J', 'K-O', 'P-T', 'U-Z'] as const).map((preset) => {
              const isPresetActive =
                selectedLetters.length === 5 &&
                ((preset === 'A-E' && selectedLetters[0] === 'A') ||
                  (preset === 'F-J' && selectedLetters[0] === 'F') ||
                  (preset === 'K-O' && selectedLetters[0] === 'K') ||
                  (preset === 'P-T' && selectedLetters[0] === 'P') ||
                  (preset === 'U-Z' && selectedLetters[0] === 'U'));
              return (
                <button
                  key={preset}
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                    isPresetActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {preset}
                </button>
              );
            })}

            {/* Toggle Full A-Z Bar Button */}
            <button
              onClick={() => setIsOptionsPanelOpen(!isOptionsPanelOpen)}
              className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-indigo-600 dark:text-indigo-400 shrink-0 flex items-center gap-0.5"
            >
              <span>A~Z 선택기</span>
              <SlidersHorizontal className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Sequential vs Random Delivery Order Switch */}
          <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleSetDeliveryOrder('sequential')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all flex items-center gap-1 ${
                deliveryOrder === 'sequential'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="A-Z 및 등록 순서대로 순차 출제"
            >
              <span>🔄 순차 출제</span>
            </button>
            <button
              onClick={() => handleSetDeliveryOrder('random')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all flex items-center gap-1 ${
                deliveryOrder === 'random'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="무작위 랜덤 출제"
            >
              <span>🎲 랜덤 출제</span>
            </button>
            {deliveryOrder === 'random' && (
              <button
                onClick={handleReshuffleSession}
                className="p-1 rounded-md text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950 transition-colors"
                title="문제 순서 다시 섞기"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Full A~Z Alphabet Grid */}
        {isOptionsPanelOpen && (
          <div className="p-2 mt-1 rounded-xl bg-white dark:bg-slate-900 border border-indigo-500/20 shadow-md animate-in fade-in zoom-in-95 duration-150 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span>🔤 개별 시작 알파벳 선택 (클릭 시 해당 글자로 시작하는 단어만 출제)</span>
              <button
                onClick={() => setIsOptionsPanelOpen(false)}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                닫기 ✕
              </button>
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-13 gap-1">
              {ALL_ALPHABETS.map((letter) => {
                const count = vocabList.filter(
                  (v) => v.word.trim().charAt(0).toUpperCase() === letter
                ).length;
                const isSelected = selectedLetters.length === 1 && selectedLetters[0] === letter;
                const isMultiSelected = selectedLetters.length > 1 && selectedLetters.length < 26 && selectedLetters.includes(letter);
                return (
                  <button
                    key={letter}
                    onClick={() => handleSelectSingleLetter(letter)}
                    className={`py-1 rounded-lg text-xs font-black transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400'
                        : isMultiSelected
                        ? 'bg-purple-500 text-white'
                        : count > 0
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950'
                        : 'bg-slate-50 dark:bg-slate-900/50 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                    }`}
                    disabled={count === 0}
                    title={`${letter}로 시작하는 단어 (${count}개)`}
                  >
                    <span>{letter}</span>
                    <span className="text-[8px] font-normal opacity-75">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Single-Screen Content View (Fills remaining height, no nested scrollbar) */}
      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col justify-center min-h-0 py-1 overflow-y-auto no-scrollbar">
      {/* ============================================================ */}
      {/* MODE 1: LEITNER SYSTEM (라이트너 5단계 상자) */}
      {/* ============================================================ */}
      {mode === 'leitner' && (
        <div className="space-y-3 max-w-2xl mx-auto w-full">
          {/* Compact Leitner Box Overview Bar */}
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Box className="w-3.5 h-3.5" />
                <span>라이트너 5단계 상자 분포도</span>
              </span>
              <span className="text-slate-500 text-[10px]">정답 시 승급 ⬆️ / 오답 시 1상자 복귀 ⬇️</span>
            </div>

            <div className="grid grid-cols-5 gap-1 text-center text-xs font-bold">
              {[1, 2, 3, 4, 5].map((boxNum) => {
                const count = Object.values(leitnerBoxes).filter((b) => b === boxNum).length;
                const labels = ['매일', '2일', '4일', '7일', '마스터'];
                const boxColors = [
                  'bg-rose-500 text-white',
                  'bg-orange-500 text-white',
                  'bg-amber-500 text-slate-950',
                  'bg-teal-500 text-white',
                  'bg-emerald-500 text-slate-950',
                ];

                return (
                  <div key={boxNum} className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 shadow-sm">
                    <span className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-black ${boxColors[boxNum - 1]}`}>
                      상자 {boxNum}
                    </span>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{count}개</p>
                    <p className="text-[9px] text-slate-400 font-normal">{labels[boxNum - 1]}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Leitner Card */}
          {currentIndex >= sessionList.length ? (
            <div className="p-6 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <Box className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">📦 라이트너 세션 완료!</h3>
                <p className="text-xs text-slate-500 mt-1">모든 단어가 복습 주기에 맞춰 업데이트되었습니다.</p>
              </div>
              <button
                onClick={handleRestartSession}
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>라이트너 상자 다시 연습</span>
              </button>
            </div>
          ) : currentItem ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 px-1">
                <span>단어 {currentIndex + 1} / {sessionList.length}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                  현재 위치: 상자 {leitnerBoxes[currentItem.id] || 1}
                </span>
              </div>

              {/* Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`min-h-[200px] sm:min-h-[240px] rounded-3xl p-6 cursor-pointer transition-all duration-300 border flex flex-col items-center justify-center text-center relative shadow-lg ${
                  isFlipped
                    ? 'bg-amber-950/90 text-white border-amber-500'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800'
                }`}
              >
                <button
                  onClick={handlePlayAudio}
                  className="p-2.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:scale-110 transition-transform mb-2"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                {!isFlipped ? (
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black mb-1">{currentItem.word}</h2>
                    <p className="text-xs font-mono text-slate-400 mb-2">{currentItem.ipa}</p>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      💡 탭하여 뜻 확인
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                    <h3 className="text-xl sm:text-2xl font-bold text-amber-300">{currentItem.meaning}</h3>
                    <p className="text-xs text-slate-200 italic max-w-md font-serif">"{currentItem.sentence}"</p>
                    <p className="text-[11px] text-slate-400">{currentItem.sentenceMeaning}</p>
                  </div>
                )}
              </div>

              {/* Answer Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleLeitnerAnswer(false)}
                  className="py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-xs border border-rose-500/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>헷갈림 (상자 1로 ⬇️)</span>
                </button>
                <button
                  onClick={() => handleLeitnerAnswer(true)}
                  className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>정확히 암기 (상자 {Math.min(5, (leitnerBoxes[currentItem.id] || 1) + 1)}로 ⬆️)</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 2: AI CONTEXT CLOZE (AI 맥락 예문 빈칸 채우기) */}
      {/* ============================================================ */}
      {mode === 'cloze' && (
        <div className="space-y-3 max-w-2xl mx-auto w-full">
          {currentIndex >= sessionList.length ? (
            <div className="p-6 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center mx-auto">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">🧠 맥락 예문 퀴즈 완료!</h3>
                <p className="text-xs text-slate-500 mt-1">예문 속에서 알맞은 단어를 찾는 연습을 완수했습니다.</p>
              </div>
              <button
                onClick={handleRestartSession}
                className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>빈칸 퀴즈 다시 풀기</span>
              </button>
            </div>
          ) : currentItem ? (
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
              {/* Cloze Sentence Box */}
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 text-center space-y-2">
                <span className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                  📝 문맥에 들어갈 알맞은 단어를 선택하세요
                </span>
                <p className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                  "{getClozeSentence(currentItem).sentence}"
                </p>

                {/* Optional Hint Toggle */}
                <div>
                  <button
                    onClick={() => setShowClozeHint(!showClozeHint)}
                    className="px-2.5 py-1 rounded-xl bg-purple-200/60 dark:bg-purple-900/50 hover:bg-purple-300 text-purple-800 dark:text-purple-300 font-bold text-[11px] transition-all inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{showClozeHint ? '힌트 가리기' : '💡 뜻 & 번역 힌트'}</span>
                  </button>

                  {showClozeHint && (
                    <div className="mt-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 animate-in fade-in duration-200">
                      <p className="font-bold text-purple-600 dark:text-purple-400">목표 뜻: {currentItem.meaning}</p>
                      <p className="italic text-slate-500">{currentItem.sentenceMeaning}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Word Options */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {clozeOptions.map((opt, idx) => {
                  const isCorrect = opt.id === currentItem.id;
                  const isSelected = selectedOption === opt.word;

                  let btnStyle = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100';
                  if (isAnswered) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-500 text-slate-950 font-black border-emerald-500 scale-102';
                    } else if (isSelected) {
                      btnStyle = 'bg-rose-500 text-white font-black border-rose-500';
                    }
                  }

                  return (
                    <button
                      key={opt.id || idx}
                      onClick={() => {
                        if (isAnswered) return;
                        setSelectedOption(opt.word);
                        setIsAnswered(true);
                        if (isCorrect) {
                          speechService.playItem(currentItem.id, currentItem.word, currentItem.meaning, 1);
                          if (onChangeMastery) onChangeMastery(currentItem.id, 2);
                        } else {
                          if (onChangeMastery) onChangeMastery(currentItem.id, 0);
                          if (!wrongAnswers.some((w) => w.id === currentItem.id)) {
                            setWrongAnswers((prev) => [...prev, currentItem]);
                          }
                        }
                      }}
                      disabled={isAnswered}
                      className={`p-3 rounded-xl border text-xs sm:text-sm font-extrabold transition-all text-center ${btnStyle}`}
                    >
                      {opt.word}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className="pt-1 flex justify-center">
                  <button
                    onClick={handleNextItem}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>다음 문제 ➔</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 3: 60-SECOND SPEED TIME ATTACK (60초 스피드 타임어택) */}
      {/* ============================================================ */}
      {mode === 'speed' && (
        <div className="space-y-5">
          {/* Header Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold block flex items-center justify-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                <span>남은 시간</span>
              </span>
              <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{speedTimer}초</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold block flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>현재 콤보</span>
              </span>
              <span className="text-2xl font-black text-amber-500">{speedCombo} COMBO</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold block flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>최고 기록</span>
              </span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-300">{speedHighScore}점</span>
            </div>
          </div>

          {!isSpeedActive && speedTimer === 60 ? (
            /* Start Banner */
            <div className="p-10 text-center rounded-3xl bg-gradient-to-br from-rose-600 via-pink-600 to-amber-500 text-white shadow-xl space-y-4">
              <div className="inline-flex p-3.5 rounded-2xl bg-white/20 text-white border border-white/30">
                <Zap className="w-8 h-8 fill-current" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black">⚡ 60초 스피드 타임어택 퀴즈</h3>
                <p className="text-xs text-rose-100 max-w-md mx-auto">
                  60초 동안 제시되는 단어의 뜻이 맞는지 번개처럼 빠르게 판단하세요! 콤보가 쌓일수록 점수가 폭발합니다.
                </p>
              </div>
              <button
                onClick={startSpeedQuiz}
                className="px-8 py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-black text-sm shadow-xl transition-all inline-flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>타임어택 도전자 스타트!</span>
              </button>
            </div>
          ) : !isSpeedActive && speedTimer === 0 ? (
            /* Time Over Result */
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">⏰ TIME OVER! 퀴즈 종료</h3>
                <p className="text-xs text-slate-500 mt-1">60초 동안 당신의 빠른 순발력과 완벽한 암기력을 증명하셨습니다!</p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-bold block">획득 점수</span>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-300">{speedScore}점</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-bold block">최대 콤보</span>
                  <span className="text-2xl font-black text-amber-500">{speedMaxCombo}회</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={startSpeedQuiz}
                  className="py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>다시 도전하기</span>
                </button>
                <button
                  onClick={handleCloseFullscreen}
                  className="py-3 px-6 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-extrabold text-xs shadow-sm transition-all inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>목록으로 돌아가기</span>
                </button>
              </div>
            </div>
          ) : currentItem ? (
            /* Active Speed Arena */
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
              {/* Question-Answer Structure Selector */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center shadow-inner max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => handleStructureChange('en_ko')}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-extrabold transition-all ${
                    quizStructure === 'en_ko'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  영어 단어 ➔ 한글 뜻
                </button>
                <button
                  type="button"
                  onClick={() => handleStructureChange('ko_en')}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-extrabold transition-all ${
                    quizStructure === 'ko_en'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  한글 뜻 ➔ 영어 단어
                </button>
                <button
                  type="button"
                  onClick={() => handleStructureChange('en_en')}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-extrabold transition-all ${
                    quizStructure === 'en_en'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  영어 예문 ➔ 영어 단어
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-widest block">
                  🔥 {speedScore}점 획득 중! ({speedCombo} 콤보)
                </span>

                {quizStructure === 'en_ko' && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 font-bold block">제시된 영단어</span>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white font-mono">{currentItem.word}</h2>
                    <div className="pt-3">
                      <span className="text-xs text-slate-400 font-bold block mb-1">아래 제시된 한국어 뜻이 일치하나요?</span>
                      <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 inline-block px-6">
                        "{speedPair.proposed}"
                      </p>
                    </div>
                  </div>
                )}

                {quizStructure === 'ko_en' && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 font-bold block">제시된 한국어 뜻</span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white px-4">{getCleanKoreanMeaning(currentItem)}</h2>
                    <div className="pt-3">
                      <span className="text-xs text-slate-400 font-bold block mb-1">아래 제시된 영어 단어가 일치하나요?</span>
                      <p className="text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 inline-block px-6">
                        "{speedPair.proposed}"
                      </p>
                    </div>
                  </div>
                )}

                {quizStructure === 'en_en' && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 font-bold block">제시된 영어 예문</span>
                    <h2 className="text-lg font-extrabold italic text-slate-800 dark:text-slate-100 px-2">
                      "{getClozeSentence(currentItem).sentence}"
                    </h2>
                    <div className="pt-3">
                      <span className="text-xs text-slate-400 font-bold block mb-1">빈칸 [ ❓ ]에 들어갈 영어 단어가 일치하나요?</span>
                      <p className="text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 inline-block px-6">
                        "{speedPair.proposed}"
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => handleSpeedChoice(true)}
                  className="py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>⭕ 일치함! (맞아요)</span>
                </button>
                <button
                  onClick={() => handleSpeedChoice(false)}
                  className="py-5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-base transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
                >
                  <XCircle className="w-6 h-6" />
                  <span>❌ 아님! (틀려요)</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 4: SPEECH & PRONUNCIATION RECALL (발음 & 음성 회상 학습) */}
      {/* ============================================================ */}
      {mode === 'speech_recall' && (
        <div className="space-y-5">
          {currentIndex >= sessionList.length ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto">
                <Mic className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">🎙️ 음성 청취 회상 완료!</h3>
                <p className="text-xs text-slate-500 mt-1">소리를 듣고 머릿속으로 파악하는 청취 암기 훈련을 마쳤습니다.</p>
              </div>
              <button
                onClick={handleRestartSession}
                className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>음성 회상 다시 학습</span>
              </button>
            </div>
          ) : currentItem ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>단어 {currentIndex + 1} / {sessionList.length}</span>
                <span className="text-blue-500 flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5" />
                  <span>청취 선행 암기</span>
                </span>
              </div>

              {/* Audio Play Button Hero */}
              <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-3">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                  🎧 발음을 듣고 단어의 스펠링과 뜻을 머릿속에 떠올려보세요!
                </p>

                <button
                  onClick={handlePlayAudio}
                  className="p-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl hover:scale-105 transition-transform inline-flex items-center justify-center"
                  title="현재 단어 발음 듣기"
                >
                  <Volume2 className="w-8 h-8" />
                </button>
              </div>

              {/* Reveal Canvas */}
              {!isWordRevealed ? (
                <div className="py-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-3 bg-slate-50 dark:bg-slate-800/50">
                  <EyeOff className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">단어가 가려져 있습니다. 발음을 충분히 들은 후 확인하세요.</p>
                  <button
                    onClick={() => setIsWordRevealed(true)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    <span>정답 단어 공개하기</span>
                  </button>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4 animate-in fade-in zoom-in-95 duration-200 text-center">
                  <div>
                    <h2 className="text-3xl font-black text-blue-300 tracking-wide">{currentItem.word}</h2>
                    {currentItem.ipa && <p className="text-xs font-mono text-slate-400 mt-1">{currentItem.ipa}</p>}
                    <p className="text-xl font-bold text-emerald-400 mt-2">{currentItem.meaning}</p>
                    {currentItem.sentence && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1 text-left">
                        <p className="text-xs text-slate-200 italic font-serif">"{currentItem.sentence}"</p>
                        {currentItem.sentenceMeaning && (
                          <p className="text-[11px] text-slate-400">💡 {currentItem.sentenceMeaning}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dedicated Replay Controls for Revealed Word */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => speechService.speakOnce(currentItem.word, 'en-US')}
                      className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                      title="단어 발음 다시 듣기"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>단어 다시 듣기</span>
                    </button>
                    {currentItem.sentence && (
                      <button
                        onClick={() => speechService.speakOnce(currentItem.sentence, 'en-US')}
                        className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                        title="예문 음성 듣기"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>예문 듣기</span>
                      </button>
                    )}
                    {currentItem.meaning && (
                      <button
                        onClick={() => speechService.speakOnce(currentItem.meaning, 'ko-KR')}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5 active:scale-95"
                        title="한글 뜻 음성 듣기"
                      >
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                        <span>한글 뜻 듣기</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Rating Choice */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    if (onChangeMastery) onChangeMastery(currentItem.id, 0);
                    handleNextItem();
                  }}
                  className="py-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition-all border border-rose-500/30 flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>듣고 회상하기 어려움 (미암기)</span>
                </button>
                <button
                  onClick={() => {
                    if (onChangeMastery) onChangeMastery(currentItem.id, 2);
                    handleNextItem();
                  }}
                  className="py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>완벽히 청취 기억함 (승급)</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 5: FORGETTING CURVE ANALYTICS (망각곡선 & 복습 스케줄러) */}
      {/* ============================================================ */}
      {mode === 'forgetting_curve' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-teal-500/10 border border-teal-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                <span>에빙하우스 망각 곡선 (Forgetting Curve) 분석 리포트</span>
              </h3>
              <span className="text-[11px] text-slate-500">실시간 망각 위험도 파악</span>
            </div>

            {/* Retention Distribution Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950/60 shadow-sm text-center">
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold block">🚨 망각 위험군 (&lt; 40%)</span>
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {vocabList.filter((v) => (v.masteryLevel ?? 0) === 0).length}개
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">24시간 내 복습 시급</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-950/60 shadow-sm text-center">
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold block">⚠️ 망각 주의군 (40~75%)</span>
                <span className="text-2xl font-black text-amber-500">
                  {vocabList.filter((v) => (v.masteryLevel ?? 0) === 1).length}개
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">3일 이내 재확인 필요</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 shadow-sm text-center">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">🟢 장기 기억 안착군 (&gt; 75%)</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-300">
                  {vocabList.filter((v) => (v.masteryLevel ?? 0) === 2).length}개
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">안정적 기억 유지</span>
              </div>
            </div>
          </div>

          {/* Targeted Action Buttons */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>망각 극복 맞춤 학습 세션 바로가기</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setMasteryFilter(0);
                  setMode('leitner');
                }}
                className="p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <Box className="w-4 h-4" />
                  <span>라이트너 상자 세션</span>
                </div>
                <p className="text-[11px] opacity-80">미암기 단어만 간격 반복으로 차근차근 승급</p>
              </button>

              <button
                onClick={() => {
                  setMode('speed');
                  startSpeedQuiz();
                }}
                className="p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <Timer className="w-4 h-4" />
                  <span>60초 타임어택 세션</span>
                </div>
                <p className="text-[11px] opacity-80">순발력 있게 판단하며 망각 인지 깨우기</p>
              </button>

              <button
                onClick={() => {
                  setMasteryFilter(0);
                  setMode('cloze');
                }}
                className="p-4 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <BrainCircuit className="w-4 h-4" />
                  <span>AI 예문 빈칸 세션</span>
                </div>
                <p className="text-[11px] opacity-80">문맥 속에 적용해보며 장기 기억 연결</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 6: WRONG NOTES (오답노트) */}
      {/* ============================================================ */}
      {mode === 'wrong_notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>오답노트 목록 ({wrongAnswers.length}개)</span>
            </h3>
            {wrongAnswers.length > 0 && (
              <button
                onClick={() => setWrongAnswers([])}
                className="text-xs text-slate-400 hover:text-rose-500"
              >
                오답노트 비우기
              </button>
            )}
          </div>

          {wrongAnswers.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">오답 노트가 비어있습니다!</p>
              <p className="text-slate-400 text-xs mt-1">플래시카드 또는 퀴즈에서 틀린 단어가 이곳에 자동으로 모입니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wrongAnswers.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950/50 shadow-sm flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{item.word}</h4>
                      <span className="text-xs font-mono text-slate-400">{item.ipa}</span>
                    </div>
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5">{item.meaning}</p>
                    <p className="text-[11px] text-slate-500 italic mt-1">"{item.sentence}"</p>
                  </div>

                  <button
                    onClick={() => {
                      if (onChangeMastery) onChangeMastery(item.id, 2);
                      setWrongAnswers((prev) => prev.filter((w) => w.id !== item.id));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all shrink-0 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>마스터 완료</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 7: DEFAULT FLASHCARD VIEW */}
      {/* ============================================================ */}
      {mode === 'flashcard' && (
        <div className="space-y-4">
          {currentIndex >= sessionList.length ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">🎴 플래시카드 학습 완료!</h3>
                <p className="text-xs text-slate-500 mt-1">선택한 {sessionList.length}개 단어 카드를 모두 확인했습니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">완벽암기</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-300">{knownCount}개</span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold block">복습 필요</span>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-300">{reviewCount}개</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={handleRestartSession}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>처음부터 다시 학습</span>
                </button>
                <button
                  onClick={() => handleFilterChange(0)}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold text-xs border border-rose-500/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>미암기 단어만 학습</span>
                </button>
              </div>
            </div>
          ) : currentItem ? (
            <>
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>단어 {currentIndex + 1} / {sessionList.length}</span>
                <div className="flex gap-3">
                  <span className="text-emerald-500">완벽암기 완료: {knownCount}</span>
                  <span className="text-rose-500">복습 지정: {reviewCount}</span>
                </div>
              </div>

              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`min-h-[280px] rounded-3xl p-8 cursor-pointer transition-all duration-500 border flex flex-col items-center justify-center text-center relative shadow-xl ${
                  isFlipped
                    ? 'bg-emerald-900/90 text-white border-emerald-500'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="absolute top-4 right-4 text-[11px] font-semibold text-slate-400">
                  💡 카드를 탭하여 뜻 {isFlipped ? '가리기' : '확인'}
                </span>

                <button
                  onClick={handlePlayAudio}
                  className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:scale-110 transition-transform mb-4"
                  title="음성 들어보기"
                >
                  <Volume2 className="w-6 h-6" />
                </button>

                {!isFlipped ? (
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight mb-2">{currentItem.word}</h2>
                    {currentItem.ipa && (
                      <p className="text-sm font-mono text-slate-400 mb-2">{currentItem.ipa}</p>
                    )}
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {currentItem.partOfSpeech}
                    </span>
                  </div>
                ) : (
                  <div className="animate-in fade-in zoom-in-95 duration-300">
                    <h3 className="text-2xl font-bold text-emerald-300 mb-2">{currentItem.meaning}</h3>
                    <p className="text-sm text-slate-200 max-w-md italic">"{currentItem.sentence}"</p>
                    <p className="text-xs text-slate-400 mt-1">{currentItem.sentenceMeaning}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReviewClick}
                  className="flex-1 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>복습 필요 (미암기 0단계로)</span>
                </button>

                <button
                  onClick={handleKnownClick}
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>완벽히 암기함 (2단계 승급)</span>
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 8: MULTIPLE CHOICE QUIZ */}
      {/* ============================================================ */}
      {mode === 'quiz' && (
        <div className="space-y-4">
          {currentIndex >= sessionList.length ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">🎉 퀴즈 라운드 완료!</h3>
                <p className="text-xs text-slate-500 mt-1">총 {sessionList.length}문제를 모두 풀었습니다.</p>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-center">
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold block">최종 획득 점수</span>
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-300">{quizScore}점</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={handleRestartSession}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>이 목록 다시 풀기</span>
                </button>
                <button
                  onClick={() => handleFilterChange(0)}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold text-xs border border-rose-500/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>미암기 단어 퀴즈 풀기</span>
                </button>
              </div>
            </div>
          ) : currentItem ? (
            <>
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>문제 {currentIndex + 1} / {sessionList.length}</span>
                <span className="text-indigo-500 text-sm">현재 점수: {quizScore}점</span>
              </div>

              {/* Question-Answer Structure Selector */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center shadow-inner">
                <button
                  type="button"
                  onClick={() => handleStructureChange('en_ko')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-extrabold transition-all ${
                    quizStructure === 'en_ko'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  영어 단어 ➔ 한글 뜻
                </button>
                <button
                  type="button"
                  onClick={() => handleStructureChange('ko_en')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-extrabold transition-all ${
                    quizStructure === 'ko_en'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  한글 뜻 ➔ 영어 단어
                </button>
                <button
                  type="button"
                  onClick={() => handleStructureChange('en_en')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-extrabold transition-all ${
                    quizStructure === 'en_en'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  영어 예문 ➔ 영어 단어
                </button>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
                <div>
                  {quizStructure === 'en_ko' && (
                    <>
                      <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">다음 영어 단어의 알맞은 한국어 뜻은?</span>
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1.5">{currentItem.word}</h3>
                      {currentItem.ipa && <p className="text-xs font-mono text-slate-400 mt-1">{currentItem.ipa}</p>}
                    </>
                  )}
                  {quizStructure === 'ko_en' && (
                    <>
                      <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">다음 뜻에 알맞은 영어 단어는?</span>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 px-4 leading-relaxed">{getCleanKoreanMeaning(currentItem)}</h3>
                      {currentItem.partOfSpeech && (
                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-bold uppercase">
                          {currentItem.partOfSpeech}
                        </span>
                      )}
                    </>
                  )}
                  {quizStructure === 'en_en' && (
                    <>
                      <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">다음 예문의 빈칸 [ ❓ ]에 들어갈 단어는?</span>
                      <h3 className="text-lg font-extrabold text-slate-800 dark:text-indigo-100 mt-3 px-2 leading-relaxed italic">
                        "{getClozeSentence(currentItem).sentence}"
                      </h3>
                      {currentItem.sentenceMeaning && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-4">
                          💡 해석: {currentItem.sentenceMeaning}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 text-left pt-2">
                  {options.map((option, idx) => {
                    const isCorrect = quizStructure === 'en_ko'
                      ? option === getCleanKoreanMeaning(currentItem)
                      : option.toLowerCase() === currentItem.word.toLowerCase();
                    const isSelected = selectedOption === option;

                    let btnStyle = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100';

                    if (isAnswered) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-500 text-slate-950 font-bold border-emerald-500';
                      } else if (isSelected) {
                        btnStyle = 'bg-rose-500 text-white font-bold border-rose-500';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(option)}
                        disabled={isAnswered}
                        className={`w-full p-3.5 rounded-2xl border text-xs font-medium transition-all ${btnStyle}`}
                      >
                        {idx + 1}. {option}
                      </button>
                    );
                  })}
                </div>

                {isAnswered && (
                  <div className="pt-2 flex justify-center gap-2">
                    <button
                      onClick={handleNextItem}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
                    >
                      다음 문제 풀기 ➔
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 9: REVIEW QUIZ (0 & 1 MASTERY LEVEL WEAK VOCABULARY QUIZ) */}
      {/* ============================================================ */}
      {mode === 'review_quiz' && (
        <div className="space-y-4">
          {sessionList.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">🎉 취약 어휘 0개 달성!</h3>
                <p className="text-xs text-slate-500 mt-1">현재 0단계(미암기) 또는 1단계(학습중)인 단어가 없습니다. 모든 단어를 완벽 암기(2단계)했습니다!</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center max-w-md mx-auto">
                <button
                  onClick={() => handleModeChange('quiz')}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>전체 단어 4지선다 퀴즈 풀기</span>
                </button>
                <button
                  onClick={() => handleModeChange('flashcard')}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>플래시카드로 둘러보기</span>
                </button>
              </div>
            </div>
          ) : currentIndex >= sessionList.length ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">🎯 취약 어휘 집중 복습 세션 완료!</h3>
                <p className="text-xs text-slate-500 mt-1">선택된 {sessionList.length}개의 취약(0~1단계) 단어 복습 퀴즈를 모두 풀었습니다.</p>
              </div>
              <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">획득 점수</span>
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-300">{quizScore}점</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">등급 승급</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-300">+{promotedCount}개</span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">남은 취약 어휘</span>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {vocabList.filter((v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) <= 1).length}개
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center max-w-md mx-auto">
                <button
                  onClick={handleRestartSession}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>남은 취약 어휘 계속 복습하기</span>
                </button>
                <button
                  onClick={handleCloseFullscreen}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>퀴즈 목록으로 나가기</span>
                </button>
              </div>
            </div>
          ) : currentItem ? (
            <>
              {/* Question Index & Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                  <span>취약 단어 {currentIndex + 1} / {sessionList.length}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${
                      (currentItem.masteryLevel ?? (currentItem.isLearned ? 2 : 0)) === 0
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {(currentItem.masteryLevel ?? (currentItem.isLearned ? 2 : 0)) === 0
                      ? '🔴 미암기 (0단계 - 복습 요망)'
                      : '🟡 학습중 (1단계 - 완벽 암기 도전)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>정답 시 승급 ⬆️</span>
                  </span>
                  <span className="text-rose-500 font-black text-sm">현재 점수: {quizScore}점</span>
                </div>
              </div>

              {/* Question-Answer Structure Selector */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center shadow-inner">
                <button
                  type="button"
                  onClick={() => handleStructureChange('en_ko')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-extrabold transition-all ${
                    quizStructure === 'en_ko'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  영어 단어 ➔ 한글 뜻
                </button>
                <button
                  type="button"
                  onClick={() => handleStructureChange('ko_en')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-extrabold transition-all ${
                    quizStructure === 'ko_en'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  한글 뜻 ➔ 영어 단어
                </button>
                <button
                  type="button"
                  onClick={() => handleStructureChange('en_en')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-extrabold transition-all ${
                    quizStructure === 'en_en'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  영어 예문 ➔ 영어 단어
                </button>
              </div>

              {/* Question Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-rose-500/20 dark:border-rose-500/20 shadow-xl text-center space-y-4">
                <div className="relative">
                  <button
                    onClick={handlePlayAudio}
                    className="absolute right-0 top-0 p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:scale-105 transition-transform"
                    title="발음 듣기"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>

                  {quizStructure === 'en_ko' && (
                    <>
                      <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                        다음 취약 단어의 올바른 한국어 뜻은?
                      </span>
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1.5">
                        {currentItem.word}
                      </h3>
                      {currentItem.ipa && (
                        <p className="text-xs font-mono text-slate-400 mt-1">{currentItem.ipa}</p>
                      )}
                    </>
                  )}

                  {quizStructure === 'ko_en' && (
                    <>
                      <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                        다음 뜻에 해당하는 취약 영어 단어는?
                      </span>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 px-4 leading-relaxed">
                        {getCleanKoreanMeaning(currentItem)}
                      </h3>
                      {currentItem.partOfSpeech && (
                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-bold uppercase">
                          {currentItem.partOfSpeech}
                        </span>
                      )}
                    </>
                  )}

                  {quizStructure === 'en_en' && (
                    <>
                      <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                        다음 예문의 빈칸 [ ❓ ]에 들어갈 단어는?
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-800 dark:text-rose-100 mt-3 px-2 leading-relaxed italic">
                        "{getClozeSentence(currentItem).sentence}"
                      </h3>
                      {currentItem.sentenceMeaning && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-4">
                          💡 해석: {currentItem.sentenceMeaning}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* 4 Choices Grid */}
                <div className="grid grid-cols-1 gap-2.5 text-left pt-2">
                  {options.map((option, idx) => {
                    const isCorrect =
                      quizStructure === 'en_ko'
                        ? option === getCleanKoreanMeaning(currentItem)
                        : option.toLowerCase() === currentItem.word.toLowerCase();
                    const isSelected = selectedOption === option;

                    let btnStyle =
                      'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100';

                    if (isAnswered) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-500 text-slate-950 font-bold border-emerald-500 shadow-md';
                      } else if (isSelected) {
                        btnStyle = 'bg-rose-500 text-white font-bold border-rose-500 shadow-md';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(option)}
                        disabled={isAnswered}
                        className={`w-full p-3.5 rounded-2xl border text-xs font-medium transition-all ${btnStyle}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{idx + 1}. {option}</span>
                          {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
                          {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Answer Feedback Banner */}
                {isAnswered && (
                  <div className="pt-2 space-y-2 animate-in fade-in duration-200">
                    {lastPromotedWord ? (
                      <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>
                          🎉 정답입니다! 마스터 등급 상승: [
                          {lastPromotedWord.prevLevel === 0
                            ? '🔴 미암기(0단계) ➔ 🟡 학습중(1단계)'
                            : '🟡 학습중(1단계) ➔ 🟢 완벽암기(2단계)'}
                          ]
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-left space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-extrabold">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>아쉽게 틀렸습니다! 정답: "{quizStructure === 'en_ko' ? getCleanKoreanMeaning(currentItem) : currentItem.word}"</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 text-[11px] space-y-0.5 pt-1 border-t border-rose-500/20">
                          <p><strong>단어:</strong> {currentItem.word} <span className="font-mono text-slate-400">({currentItem.ipa})</span></p>
                          <p><strong>뜻:</strong> {currentItem.meaning}</p>
                          {currentItem.sentence && (
                            <p className="italic text-slate-500">"{currentItem.sentence}" ({currentItem.sentenceMeaning})</p>
                          )}
                        </div>
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">💡 이 단어는 취약 어휘(0단계)로 유지되어 다시 출제됩니다.</span>
                          <button
                            onClick={handlePlayAudio}
                            className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[10px] flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>발음 듣기</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex justify-center">
                      <button
                        onClick={handleNextItem}
                        className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <span>다음 취약 단어 풀기 ➔</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
      </div>
    </div>
      )}
    </>
  );
};
