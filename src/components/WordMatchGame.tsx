import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Boxes,
  Sparkles,
  RotateCcw,
  Volume2,
  Trophy,
  CheckCircle2,
  Zap,
  Flame,
  Pause,
  Play,
  LogOut,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  PartyPopper,
  Clock,
  Award,
  Layers,
  Star,
  Settings2,
  Check,
  Brain,
  HelpCircle,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { VocabItem, QAMode } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning, getEnglishDefinition } from '../utils/meaningUtils';

interface WordMatchGameProps {
  words: VocabItem[];
  gradeName: string;
  onUpdateHighScore: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit?: () => void;
  qaMode?: QAMode;
  onChangeQAMode?: (mode: QAMode) => void;
}

export type CardMatchMode = 'level' | 'fixed-4' | 'fixed-6' | 'fixed-8' | 'fixed-10' | 'fixed-12' | 'fixed-16' | 'fixed-20';

export interface MemoryMatchCard {
  id: string;
  wordId: string;
  pairId: string;
  content: string;
  subContent?: string;
  type: 'word' | 'meaning';
  isFlipped: boolean;
  isMatched: boolean;
  isHinted?: boolean;
  colorTheme: string;
}

// Color palettes for matched card pairs
const CARD_THEMES = [
  'from-indigo-600 to-indigo-700 border-indigo-400 text-white shadow-indigo-500/30 ring-indigo-400',
  'from-emerald-600 to-emerald-700 border-emerald-400 text-white shadow-emerald-500/30 ring-emerald-400',
  'from-amber-600 to-amber-700 border-amber-400 text-white shadow-amber-500/30 ring-amber-400',
  'from-rose-600 to-rose-700 border-rose-400 text-white shadow-rose-500/30 ring-rose-400',
  'from-purple-600 to-purple-700 border-purple-400 text-white shadow-purple-500/30 ring-purple-400',
  'from-cyan-600 to-cyan-700 border-cyan-400 text-white shadow-cyan-500/30 ring-cyan-400',
  'from-sky-600 to-sky-700 border-sky-400 text-white shadow-sky-500/30 ring-sky-400',
  'from-pink-600 to-pink-700 border-pink-400 text-white shadow-pink-500/30 ring-pink-400',
  'from-teal-600 to-teal-700 border-teal-400 text-white shadow-teal-500/30 ring-teal-400',
  'from-orange-600 to-orange-700 border-orange-400 text-white shadow-orange-500/30 ring-orange-400',
];

// Helper: Get pair count from stage or mode
export const getPairCount = (mode: CardMatchMode, stage: number): number => {
  if (mode === 'fixed-4') return 2;   // 4 cards
  if (mode === 'fixed-6') return 3;   // 6 cards
  if (mode === 'fixed-8') return 4;   // 8 cards
  if (mode === 'fixed-10') return 5;  // 10 cards
  if (mode === 'fixed-12') return 6;  // 12 cards
  if (mode === 'fixed-16') return 8;  // 16 cards
  if (mode === 'fixed-20') return 10; // 20 cards

  // Level Progression Mode: Starts at 4 cards (2 pairs), increases by 1 pair (2 cards) each level!
  // Stage 1: 2 pairs (4 cards)
  // Stage 2: 3 pairs (6 cards)
  // Stage 3: 4 pairs (8 cards)
  // Stage 4: 5 pairs (10 cards)
  // Stage 5: 6 pairs (12 cards)
  // Stage 6: 7 pairs (14 cards)
  // Stage 7: 8 pairs (16 cards)
  // Stage 8: 9 pairs (18 cards)
  // Stage 9+: 10 pairs (20 cards)
  return Math.min(10, 1 + stage);
};

// Web Audio sound synthesizer for card interactions
const playCardSound = (type: 'flip' | 'match' | 'wrong' | 'stageClear' | 'hint' | 'shuffle') => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'flip') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'match') {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.22);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'hint') {
      const notes = [659.25, 880, 1174.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.05);
        osc.stop(ctx.currentTime + idx * 0.05 + 0.18);
      });
    } else if (type === 'shuffle') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'stageClear') {
      const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      fanfare.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
      });
    }
  } catch {
    // Ignore audio error
  }
};

export const WordMatchGame: React.FC<WordMatchGameProps> = ({
  words,
  gradeName,
  onUpdateHighScore,
  onChangeMastery,
  onQuit,
  qaMode = 'ko_to_en',
  onChangeQAMode,
}) => {
  // Game Configuration State
  const [matchMode, setMatchMode] = useState<CardMatchMode>('level');
  const [stage, setStage] = useState<number>(1);
  const [cards, setCards] = useState<MemoryMatchCard[]>([]);
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([]);
  const [matchedPairsCount, setMatchedPairsCount] = useState<number>(0);
  const [totalPairs, setTotalPairs] = useState<number>(2);

  // Stats State
  const [moves, setMoves] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [stageScore, setStageScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [hintsRemaining, setHintsRemaining] = useState<number>(3);
  const [isProcessingMatch, setIsProcessingMatch] = useState<boolean>(false);

  // Time & Lifecycle State
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isStageCleared, setIsStageCleared] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Audio & Animation states
  const [shakeCards, setShakeCards] = useState<boolean>(false);
  const wordsRef = useRef(words);
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  // Card Content generation helper based on QA Mode
  const getCardContentPair = useCallback((item: VocabItem) => {
    const wordContent = item.word;
    const subText = item.ipa ? `[${item.ipa}]` : (item.partOfSpeech ? `(${item.partOfSpeech})` : '');
    
    let meaningContent = '';
    if (qaMode === 'en_def_to_en') {
      meaningContent = getEnglishDefinition(item);
    } else {
      meaningContent = getCleanKoreanMeaning(item);
    }

    return {
      wordContent,
      subText,
      meaningContent,
    };
  }, [qaMode]);

  // Initialize a round / stage
  const initRound = useCallback((targetStage: number, targetMode: CardMatchMode, carryOverScore: number = 0) => {
    const currentWords = wordsRef.current && wordsRef.current.length > 0 ? wordsRef.current : [];
    if (currentWords.length === 0) return;

    const pairCount = getPairCount(targetMode, targetStage);
    setTotalPairs(pairCount);

    // Pick random unique words from pool
    const shuffledPool = [...currentWords].sort(() => Math.random() - 0.5);
    const selectedWords = shuffledPool.slice(0, Math.min(pairCount, shuffledPool.length));

    const newCards: MemoryMatchCard[] = [];
    selectedWords.forEach((wordItem, idx) => {
      const theme = CARD_THEMES[idx % CARD_THEMES.length];
      const { wordContent, subText, meaningContent } = getCardContentPair(wordItem);
      const pairId = `pair-${wordItem.id}-${Date.now()}-${idx}`;

      // 1. English Word Card
      newCards.push({
        id: `${pairId}-word`,
        wordId: wordItem.id,
        pairId,
        content: wordContent,
        subContent: subText,
        type: 'word',
        isFlipped: false,
        isMatched: false,
        isHinted: false,
        colorTheme: theme,
      });

      // 2. Meaning Card
      newCards.push({
        id: `${pairId}-meaning`,
        wordId: wordItem.id,
        pairId,
        content: meaningContent,
        subContent: wordItem.partOfSpeech ? `[${wordItem.partOfSpeech}]` : undefined,
        type: 'meaning',
        isFlipped: false,
        isMatched: false,
        isHinted: false,
        colorTheme: theme,
      });
    });

    // Shuffle cards uniformly
    const shuffledCards = newCards.sort(() => Math.random() - 0.5);

    setCards(shuffledCards);
    setFlippedCardIds([]);
    setMatchedPairsCount(0);
    setMoves(0);
    setStageScore(0);
    setScore(carryOverScore);
    setCombo(0);
    setMaxCombo(0);
    setElapsedSeconds(0);
    setIsProcessingMatch(false);
    setIsStageCleared(false);
    setIsPaused(false);
    setHintsRemaining(3);
    playCardSound('shuffle');
  }, [getCardContentPair]);

  // Initial round setup on mount
  useEffect(() => {
    initRound(1, matchMode, 0);
  }, []); // Run once on mount

  // Timer Effect
  useEffect(() => {
    if (isPaused || isStageCleared) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, isStageCleared]);

  // Handle Card Click
  const handleCardClick = (card: MemoryMatchCard) => {
    if (
      card.isFlipped ||
      card.isMatched ||
      isProcessingMatch ||
      isPaused ||
      isStageCleared ||
      flippedCardIds.length >= 2
    ) {
      return;
    }

    // Play pronunciation if word card
    if (card.type === 'word') {
      speechService.speakOnce(card.content);
    }
    playCardSound('flip');

    // Flip this card
    const updatedCards = cards.map((c) => (c.id === card.id ? { ...c, isFlipped: true, isHinted: false } : c));
    setCards(updatedCards);

    const nextFlippedIds = [...flippedCardIds, card.id];
    setFlippedCardIds(nextFlippedIds);

    // If 2 cards are flipped, check for match!
    if (nextFlippedIds.length === 2) {
      setIsProcessingMatch(true);
      setMoves((prev) => prev + 1);

      const firstCard = updatedCards.find((c) => c.id === nextFlippedIds[0])!;
      const secondCard = updatedCards.find((c) => c.id === nextFlippedIds[1])!;

      const isMatch = firstCard.wordId === secondCard.wordId && firstCard.type !== secondCard.type;

      if (isMatch) {
        // MATCH SUCCESS!
        const currentCombo = combo + 1;
        setCombo(currentCombo);
        setMaxCombo((prev) => Math.max(prev, currentCombo));

        const basePoints = 50;
        const comboBonus = (currentCombo - 1) * 20;
        const speedBonus = Math.max(0, 30 - Math.floor(elapsedSeconds / 2));
        const roundPoints = basePoints + comboBonus + speedBonus;
        const nextTotalScore = score + roundPoints;

        setScore(nextTotalScore);
        setStageScore((prev) => prev + roundPoints);

        // Speak word if 2nd clicked card was meaning card
        const wordCard = firstCard.type === 'word' ? firstCard : secondCard;
        if (secondCard.type !== 'word') {
          speechService.speakOnce(wordCard.content);
        }

        // Notify High Score outside of state updater
        if (onUpdateHighScore) {
          onUpdateHighScore(nextTotalScore);
        }

        // Notify Mastery
        if (onChangeMastery) {
          onChangeMastery(firstCard.wordId, 2);
        }

        setTimeout(() => {
          playCardSound('match');
          setCards((prev) =>
            prev.map((c) =>
              c.wordId === firstCard.wordId
                ? { ...c, isMatched: true, isFlipped: true, isHinted: false }
                : c
            )
          );
          setFlippedCardIds([]);
          setIsProcessingMatch(false);

          setMatchedPairsCount((prev) => {
            const nextCount = prev + 1;
            if (nextCount === totalPairs) {
              // STAGE CLEARED!
              setTimeout(() => {
                playCardSound('stageClear');
                setIsStageCleared(true);
              }, 400);
            }
            return nextCount;
          });
        }, 350);
      } else {
        // MISMATCH!
        setCombo(0);
        setShakeCards(true);
        setTimeout(() => setShakeCards(false), 500);

        setTimeout(() => {
          playCardSound('wrong');
          setCards((prev) =>
            prev.map((c) => (nextFlippedIds.includes(c.id) ? { ...c, isFlipped: false } : c))
          );
          setFlippedCardIds([]);
          setIsProcessingMatch(false);
        }, 1000);
      }
    }
  };

  // 💡 Hint feature: briefly highlights an unmatched pair
  const handleUseHint = () => {
    if (hintsRemaining <= 0 || isProcessingMatch || isStageCleared || isPaused) return;

    // Find unmatched cards
    const unmatchedCards = cards.filter((c) => !c.isMatched && !c.isFlipped);
    if (unmatchedCards.length < 2) return;

    // Group by wordId
    const pairMap = new Map<string, MemoryMatchCard[]>();
    unmatchedCards.forEach((c) => {
      const list = pairMap.get(c.wordId) || [];
      list.push(c);
      pairMap.set(c.wordId, list);
    });

    for (const [_, pairList] of pairMap.entries()) {
      if (pairList.length >= 2) {
        const [cardA, cardB] = pairList;
        setHintsRemaining((prev) => prev - 1);
        playCardSound('hint');

        // Flash both cards with hint highlight
        setCards((prev) =>
          prev.map((c) =>
            c.id === cardA.id || c.id === cardB.id
              ? { ...c, isHinted: true }
              : c
          )
        );

        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.isHinted ? { ...c, isHinted: false } : c))
          );
        }, 1800);

        break;
      }
    }
  };

  // 🔀 Shuffle remaining unmatched cards safely without destroying card contents
  const handleShuffleCards = () => {
    if (isProcessingMatch || isStageCleared || isPaused) return;

    setCards((currentCards) => {
      const unmatchedIndices: number[] = [];
      const unmatchedCards: MemoryMatchCard[] = [];

      currentCards.forEach((card, index) => {
        if (!card.isMatched && !card.isFlipped) {
          unmatchedIndices.push(index);
          unmatchedCards.push(card);
        }
      });

      if (unmatchedCards.length <= 1) return currentCards;

      // Fisher-Yates shuffle on the unmatched cards
      const shuffled = [...unmatchedCards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const nextCards = [...currentCards];
      unmatchedIndices.forEach((cardIndex, i) => {
        nextCards[cardIndex] = shuffled[i];
      });

      playCardSound('shuffle');
      return nextCards;
    });
  };

  // Next Stage / Replay handlers
  const handleNextStage = () => {
    const nextStage = stage + 1;
    setStage(nextStage);
    initRound(nextStage, matchMode, score);
  };

  const handleRestartStage = () => {
    initRound(stage, matchMode, score - stageScore);
  };

  const handleModeChange = (newMode: CardMatchMode) => {
    setMatchMode(newMode);
    if (newMode === 'level') {
      setStage(1);
      initRound(1, newMode, 0);
    } else {
      setStage(1);
      initRound(1, newMode, 0);
    }
    setShowConfigModal(false);
  };

  // Star Rating Calculation for Stage Clear
  const starsEarned = useMemo(() => {
    const perfectMoves = totalPairs + 2;
    if (moves <= perfectMoves) return 3;
    if (moves <= totalPairs * 2) return 2;
    return 1;
  }, [moves, totalPairs]);

  // Calculate dynamic grid column layout based on card count
  const cardCount = totalPairs * 2;
  const gridClasses = useMemo(() => {
    switch (cardCount) {
      case 4:
        return 'grid-cols-2 max-w-sm';
      case 6:
        return 'grid-cols-2 sm:grid-cols-3 max-w-md';
      case 8:
        return 'grid-cols-2 sm:grid-cols-4 max-w-xl';
      case 10:
        return 'grid-cols-2 sm:grid-cols-5 max-w-2xl';
      case 12:
        return 'grid-cols-3 sm:grid-cols-4 max-w-2xl';
      case 14:
        return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 max-w-3xl';
      case 16:
        return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-4 max-w-3xl';
      case 18:
      case 20:
        return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 max-w-4xl';
      default:
        return 'grid-cols-3 sm:grid-cols-4 max-w-2xl';
    }
  }, [cardCount]);

  // Dynamic card height / text scale
  const cardHeightClass = useMemo(() => {
    if (cardCount <= 4) return 'min-h-[110px] sm:min-h-[140px] text-base sm:text-xl p-3 sm:p-4';
    if (cardCount <= 6) return 'min-h-[90px] sm:min-h-[120px] text-sm sm:text-lg p-2.5 sm:p-3';
    if (cardCount <= 8) return 'min-h-[78px] sm:min-h-[105px] text-xs sm:text-base p-2 sm:p-2.5';
    if (cardCount <= 12) return 'min-h-[70px] sm:min-h-[90px] text-xs sm:text-sm p-1.5 sm:p-2';
    return 'min-h-[64px] sm:min-h-[78px] text-[11px] sm:text-xs p-1.5 sm:p-2';
  }, [cardCount]);

  return (
    <div className="space-y-1.5 sm:space-y-3 w-full max-w-4xl mx-auto flex-1 flex flex-col justify-start min-h-0 px-0 sm:px-2">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        {/* Left: Mode Badge & Quick Card Count Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Boxes className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {matchMode === 'level' ? `🌟 레벨 ${stage}` : `📌 고정 ${cardCount}장`}
                </span>
                <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {totalPairs}쌍 ({cardCount}카드)
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowConfigModal(true)}
            className="px-2 py-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] sm:text-xs flex items-center gap-1 transition-all border border-slate-200 dark:border-slate-700"
            title="카드 수 및 모드 변경"
          >
            <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
            <span>카드 수 설정</span>
          </button>
        </div>

        {/* Right Stats & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Combo Badge */}
          {combo > 1 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black animate-pulse shadow-sm">
              <Flame className="w-3 h-3 fill-current" />
              <span>{combo}연속 콤보!</span>
            </div>
          )}

          {/* Moves Count */}
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold block">시도</span>
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">{moves}회</span>
          </div>

          {/* Matched Progress */}
          <div className="text-right pl-1 border-l border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-emerald-500 font-bold block">맞춘 짝</span>
            <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
              {matchedPairsCount} / {totalPairs}
            </span>
          </div>

          {/* Total Score */}
          <div className="text-right pl-1 border-l border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-amber-500 font-bold block">점수</span>
            <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">{score}점</span>
          </div>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title={isPaused ? '게임 재개' : '일시정지'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Arena Area */}
      <div className="flex-1 min-h-0 bg-slate-900/90 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border-2 border-slate-800 shadow-inner flex flex-col justify-between items-center relative overflow-hidden">
        {/* Helper Top Bar inside Arena */}
        <div className="w-full flex items-center justify-between gap-2 px-1 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
            </span>
            <span className="text-[11px] text-slate-500">• {gradeName}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 💡 Hint Button */}
            <button
              onClick={handleUseHint}
              disabled={hintsRemaining <= 0 || isProcessingMatch || isPaused || isStageCleared}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all ${
                hintsRemaining > 0
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 active:scale-95'
                  : 'bg-slate-800 text-slate-600 border border-slate-800 cursor-not-allowed'
              }`}
              title="힌트: 짝이 맞는 카드 1쌍을 살짝 보여줍니다"
            >
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span>힌트 ({hintsRemaining})</span>
            </button>

            {/* 🔀 Shuffle Button */}
            <button
              onClick={handleShuffleCards}
              disabled={isProcessingMatch || isPaused || isStageCleared}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-extrabold flex items-center gap-1 transition-all border border-slate-700 active:scale-95"
              title="남은 카드들의 위치를 섞습니다"
            >
              <RefreshCw className="w-3 h-3 text-indigo-400" />
              <span>셔플</span>
            </button>

            {/* Restart Button */}
            <button
              onClick={handleRestartStage}
              className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="현재 판 다시 시작"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card Grid Container */}
        <div
          className={`w-full flex-1 min-h-0 overflow-y-auto px-1 py-1 flex items-center justify-center ${
            shakeCards ? 'animate-shake' : ''
          }`}
        >
          <div className={`w-full grid gap-2 sm:gap-2.5 mx-auto ${gridClasses} content-center justify-center my-auto`}>
            {cards.map((card) => {
              const isWord = card.type === 'word';
              const isFlippedOrMatched = card.isFlipped || card.isMatched;

              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`relative cursor-pointer select-none perspective-1000 transition-all duration-300 ${
                    card.isMatched
                      ? 'opacity-40 scale-95 pointer-events-none'
                      : card.isHinted
                      ? 'ring-4 ring-amber-400 animate-pulse scale-105 shadow-lg shadow-amber-500/50'
                      : 'hover:scale-[1.02] active:scale-95'
                  }`}
                >
                  <div
                    className={`w-full ${cardHeightClass} rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-md ${
                      isFlippedOrMatched
                        ? `bg-gradient-to-br ${card.colorTheme} shadow-lg ring-2`
                        : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {isFlippedOrMatched ? (
                      <div className="flex flex-col items-center justify-center h-full w-full py-0.5 min-w-0">
                        <span className="font-black leading-snug tracking-tight drop-shadow-sm px-1 text-center break-words break-keep max-w-full">
                          {card.content}
                        </span>
                        {card.subContent && cardCount <= 12 && (
                          <span className="text-[10px] sm:text-xs opacity-85 font-medium truncate max-w-full mt-0.5">
                            {card.subContent}
                          </span>
                        )}
                        <span className="text-[8px] sm:text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded-full bg-black/30 mt-1 shrink-0">
                          {isWord ? '🔤 WORD' : '📖 MEANING'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1 opacity-60">
                        <Brain className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-400 animate-pulse" />
                        <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-slate-400">
                          PAIR
                        </span>
                      </div>
                    )}

                    {/* Matched Checkmark Badge */}
                    {card.isMatched && (
                      <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Instructional Subtitle */}
        <div className="w-full text-center text-[11px] text-slate-500 font-semibold pt-1 shrink-0">
          💡 영어 단어 카드와 한글 뜻 카드를 터치하여 서로 짝을 맞춰보세요!
        </div>
      </div>

      {/* STAGE CLEAR VICTORY MODAL */}
      {isStageCleared && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header Icon & Stars */}
            <div className="space-y-2">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <PartyPopper className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                🎉 {matchMode === 'level' ? `레벨 ${stage} 클리어!` : `카드 짝맞추기 완료!`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {totalPairs}쌍 ({cardCount}장)의 모든 단어 카드를 멋지게 맞추셨습니다!
              </p>

              {/* Star Rating Display */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {[1, 2, 3].map((starIdx) => (
                  <Star
                    key={starIdx}
                    className={`w-7 h-7 transition-all ${
                      starIdx <= starsEarned
                        ? 'text-amber-400 fill-amber-400 scale-110 drop-shadow-md'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Score & Stats Summary Grid */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold block">클리어 시간</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                  {Math.floor(elapsedSeconds / 60)}분 {elapsedSeconds % 60}초
                </span>
              </div>
              <div className="text-center border-x border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">총 시도</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">{moves}회</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-amber-500 font-bold block">획득 점수</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">+{stageScore}점</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              {matchMode === 'level' ? (
                <button
                  onClick={handleNextStage}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>다음 레벨 {stage + 1} 도전 (카드 {getPairCount('level', stage + 1) * 2}장)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleRestartStage}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>새로운 단어로 다시 도전</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRestartStage}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
                >
                  현재 레벨 다시하기
                </button>
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold text-xs transition-all"
                >
                  카드 수 변경
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARD COUNT & MODE CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  🃏 카드 짝맞추기 모드 & 카드 수 설정
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Option 1: Level Progression Mode */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>🌟 1. 레벨별 단계 상승 모드 (추천)</span>
                {matchMode === 'level' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold">
                    현재 선택됨
                  </span>
                )}
              </label>
              <button
                onClick={() => handleModeChange('level')}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  matchMode === 'level'
                    ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-400/40 text-slate-900 dark:text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
                    <span>최초 4카드 (2쌍)로 시작하여 레벨마다 카드 수 증가</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    1단계(4장) ➔ 2단계(6장) ➔ 3단계(8장) ➔ 4단계(10장) ➔ 5단계(12장)... 차근차근 어휘 집중력을 길러줍니다.
                  </p>
                </div>
                {matchMode === 'level' && <Check className="w-5 h-5 text-emerald-500 shrink-0 ml-2" />}
              </button>
            </div>

            {/* Option 2: Fixed Card Count Mode */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>📌 2. 고정 카드 수 모드 (원하는 장수 선택)</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { mode: 'fixed-4' as CardMatchMode, label: '4카드 (2쌍)', desc: '2x2 그리드 · 입문/초급' },
                  { mode: 'fixed-6' as CardMatchMode, label: '6카드 (3쌍)', desc: '2x3 그리드 · 쉬움' },
                  { mode: 'fixed-8' as CardMatchMode, label: '8카드 (4쌍)', desc: '2x4 그리드 · 보통' },
                  { mode: 'fixed-10' as CardMatchMode, label: '10카드 (5쌍)', desc: '2x5 그리드 · 중급' },
                  { mode: 'fixed-12' as CardMatchMode, label: '12카드 (6쌍)', desc: '3x4 그리드 · 도전' },
                  { mode: 'fixed-16' as CardMatchMode, label: '16카드 (8쌍)', desc: '4x4 그리드 · 고급' },
                  { mode: 'fixed-20' as CardMatchMode, label: '20카드 (10쌍)', desc: '4x5 그리드 · 마스터' },
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => handleModeChange(item.mode)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      matchMode === item.mode
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <span className="font-extrabold text-xs block">{item.label}</span>
                      <span className={`text-[10px] block mt-0.5 ${matchMode === item.mode ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {item.desc}
                      </span>
                    </div>
                    {matchMode === item.mode && (
                      <div className="mt-2 self-end">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
