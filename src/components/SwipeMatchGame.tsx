import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  Sparkles,
  RotateCcw,
  Volume2,
  Trophy,
  CheckCircle2,
  XCircle,
  Flame,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  HelpCircle,
  Pause,
  Play,
  LogOut
} from 'lucide-react';
import { VocabItem, QAMode } from '../types';
import { getCleanKoreanMeaning, getEnglishDefinition, QA_MODES_CONFIG } from '../utils/meaningUtils';
import { DEFAULT_VOCAB } from '../data/defaultVocab';
import { speechService } from '../services/speechService';
import { QAModeSelector } from './QAModeSelector';

interface SwipeMatchGameProps {
  words: VocabItem[];
  gradeName: string;
  onUpdateHighScore: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit?: () => void;
  qaMode?: QAMode;
  onChangeQAMode?: (mode: QAMode) => void;
}

interface SwipeCardItem {
  id: string;
  vocab: VocabItem;
  promptText: string;
  promptSubtext?: string;
  candidateText: string;
  candidateLabel: string;
  isCorrectMatch: boolean;
}

const TOTAL_CARDS_PER_ROUND = 12;

export const SwipeMatchGame: React.FC<SwipeMatchGameProps> = ({
  words,
  gradeName,
  onUpdateHighScore,
  onChangeMastery,
  onQuit,
  qaMode = 'ko_to_en',
  onChangeQAMode,
}) => {
  const [internalQAMode, setInternalQAMode] = useState<QAMode>(qaMode);
  const activeQAMode = qaMode || internalQAMode;

  const handleQAModeSelect = (newMode: QAMode) => {
    setInternalQAMode(newMode);
    if (onChangeQAMode) {
      onChangeQAMode(newMode);
    }
  };

  const [deck, setDeck] = useState<SwipeCardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Dragging state
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [swipeDirection, setSwipeDirection] = useState<'right' | 'left' | null>(null);

  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Generate new deck
  const initGame = useCallback(() => {
    const activeWords = words && words.length >= 2 ? words : DEFAULT_VOCAB;
    if (!activeWords || activeWords.length < 2) return;

    const shuffledVocab = [...activeWords].sort(() => Math.random() - 0.5);
    const selectedVocab = shuffledVocab.slice(0, TOTAL_CARDS_PER_ROUND);

    const generatedDeck: SwipeCardItem[] = selectedVocab.map((item, idx) => {
      const isCorrectMatch = Math.random() > 0.5;
      const realMeaning = getCleanKoreanMeaning(item);
      const realDef = getEnglishDefinition(item);

      let promptText = '';
      let promptSubtext = '';
      let candidateText = '';
      let candidateLabel = '';
      let finalIsCorrect = false;

      if (activeQAMode === 'ko_to_en') {
        promptText = `"${realMeaning}"`;
        promptSubtext = `[${item.partOfSpeech || '단어'}] 설명에 맞는 영어 단어인가요?`;
        if (isCorrectMatch) {
          candidateText = item.word;
        } else {
          const others = activeWords.filter((w) => w.word.toLowerCase() !== item.word.toLowerCase());
          candidateText = others.length > 0 ? others[Math.floor(Math.random() * others.length)].word : item.word;
        }
        candidateLabel = '제시된 영어 단어가 맞나요?';
        finalIsCorrect = candidateText.toLowerCase() === item.word.toLowerCase();
      } else if (activeQAMode === 'en_def_to_en') {
        promptText = `"${realDef}"`;
        promptSubtext = `[${item.partOfSpeech || 'n.'}] English Definition`;
        if (isCorrectMatch) {
          candidateText = item.word;
        } else {
          const others = activeWords.filter((w) => w.word.toLowerCase() !== item.word.toLowerCase());
          candidateText = others.length > 0 ? others[Math.floor(Math.random() * others.length)].word : item.word;
        }
        candidateLabel = '제시된 영어 단어가 맞나요?';
        finalIsCorrect = candidateText.toLowerCase() === item.word.toLowerCase();
      } else {
        // en_to_ko
        promptText = item.word;
        promptSubtext = item.ipa ? `[${item.ipa}]` : `[${item.partOfSpeech || '단어'}]`;
        if (isCorrectMatch) {
          candidateText = realMeaning;
        } else {
          const others = activeWords.filter(
            (w) => getCleanKoreanMeaning(w) !== realMeaning
          );
          candidateText = others.length > 0 ? getCleanKoreanMeaning(others[Math.floor(Math.random() * others.length)]) : realMeaning;
        }
        candidateLabel = '제시된 한국어 뜻이 맞나요?';
        finalIsCorrect = candidateText === realMeaning;
      }

      return {
        id: `swipe-${idx}-${Date.now()}`,
        vocab: {
          ...item,
          meaning: realMeaning,
        },
        promptText,
        promptSubtext,
        candidateText,
        candidateLabel,
        isCorrectMatch: finalIsCorrect,
      };
    });

    setDeck(generatedDeck);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setIsGameOver(false);
    setIsPaused(false);
    setDragOffset({ x: 0, y: 0 });
    setSwipeDirection(null);
  }, [words, activeQAMode]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const currentCard = deck[currentIndex];

  // Automatically play sound when new card appears
  useEffect(() => {
    if (currentCard && !isGameOver && !isPaused) {
      speechService.playItem(`swipe-card-${currentCard.vocab.id}`, currentCard.vocab.word, undefined, 1);
    }
  }, [currentIndex, currentCard, isGameOver, isPaused]);

  // Process Answer (right = true/match, left = false/mismatch)
  const handleAnswer = useCallback(
    (userGuessedMatch: boolean) => {
      if (!currentCard || isGameOver || isPaused) return;

      const isUserCorrect = userGuessedMatch === currentCard.isCorrectMatch;

      if (isUserCorrect) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        const points = 100 + (nextStreak - 1) * 20;
        setScore((prev) => prev + points);
        setCorrectCount((prev) => prev + 1);

        if (onChangeMastery) {
          onChangeMastery(currentCard.vocab.id, 2);
        }
      } else {
        setStreak(0);
      }

      // Animate out card
      const direction = userGuessedMatch ? 'right' : 'left';
      setSwipeDirection(direction);

      setTimeout(() => {
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);

        const nextIdx = currentIndex + 1;
        if (nextIdx >= deck.length) {
          setIsGameOver(true);
          onUpdateHighScore(score + (isUserCorrect ? 100 + streak * 20 : 0));
        } else {
          setCurrentIndex(nextIdx);
        }
      }, 250);
    },
    [currentCard, currentIndex, deck.length, isGameOver, isPaused, onChangeMastery, onUpdateHighScore, score, streak]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver || isPaused) return;
      if (e.key === 'ArrowRight') {
        handleAnswer(true); // O (Match)
      } else if (e.key === 'ArrowLeft') {
        handleAnswer(false); // X (Mismatch)
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAnswer, isGameOver, isPaused]);

  // Pointer / Drag event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isGameOver || isPaused) return;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isGameOver || isPaused) return;
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handlePointerUp = () => {
    if (!isDragging || isGameOver || isPaused) return;
    setIsDragging(false);

    const SWIPE_THRESHOLD = 90;
    if (dragOffset.x > SWIPE_THRESHOLD) {
      handleAnswer(true); // Swiped Right -> O Match
    } else if (dragOffset.x < -SWIPE_THRESHOLD) {
      handleAnswer(false); // Swiped Left -> X Mismatch
    } else {
      // Reset card position back to center
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Card transform styling
  const getCardStyle = () => {
    if (swipeDirection === 'right') {
      return {
        transform: 'translateX(120%) rotate(25deg)',
        opacity: 0,
        transition: 'all 0.25s ease-out',
      };
    }
    if (swipeDirection === 'left') {
      return {
        transform: 'translateX(-120%) rotate(-25deg)',
        opacity: 0,
        transition: 'all 0.25s ease-out',
      };
    }
    const rotateDeg = dragOffset.x * 0.08;
    return {
      transform: `translate(${dragOffset.x}px, ${dragOffset.y * 0.3}px) rotate(${rotateDeg}deg)`,
      transition: isDragging ? 'none' : 'all 0.2s ease-out',
    };
  };

  return (
    <div className="space-y-1.5 sm:space-y-3 max-w-md mx-auto flex-1 flex flex-col justify-start min-h-0">
      {/* Game Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400">
              <Layers className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🎴 스와이프 매칭</span>
                <span className="px-1.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 text-[9px] sm:text-[10px] font-extrabold">
                  {gradeName}
                </span>
              </h3>
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">
                👉(O), 👈(X) 스와이프!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:hidden">
            <div className="px-2 py-0.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-[10px] font-black flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              <span>{score}점</span>
            </div>
            {streak > 1 && (
              <div className="px-1.5 py-0.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[9px] font-black flex items-center gap-0.5 animate-bounce">
                <Flame className="w-3 h-3 fill-current" />
                <span>{streak}x</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-end">
          <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-black items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>{score}점</span>
          </div>

          {streak > 1 && (
            <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-black items-center gap-1 animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{streak} COMBO!</span>
            </div>
          )}

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
              isPaused
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" /> : <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />}
            <span>{isPaused ? '계속' : '일시정지'}</span>
          </button>

          <button
            onClick={initGame}
            className="px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] sm:text-xs transition-all flex items-center gap-1"
            title="다시 시작"
          >
            <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">다시</span>
          </button>

          <button
            onClick={() => {
              setIsGameOver(true);
              if (onQuit) onQuit();
            }}
            className="px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-[10px] sm:text-xs transition-all flex items-center gap-1"
            title="게임 종료"
          >
            <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>종료</span>
          </button>
        </div>
      </div>

      {/* Pause Modal Overlay */}
      {isPaused && !isGameOver && (
        <div className="p-8 rounded-3xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white shadow-2xl text-center space-y-5 animate-in fade-in duration-200">
          <div className="inline-flex p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Pause className="w-8 h-8 fill-current" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black">⏸️ 게임 일시 중지</h3>
            <p className="text-xs text-slate-300">잠시 학습을 멈추었습니다. 준비되시면 계속하세요.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsPaused(false)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>게임 계속하기</span>
            </button>
            <button
              onClick={initGame}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>처음부터 다시 시작</span>
            </button>
            <button
              onClick={() => {
                setIsGameOver(true);
                setIsPaused(false);
                if (onQuit) onQuit();
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-black text-xs transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>게임 종료하기</span>
            </button>
          </div>
        </div>
      )}

      {/* Victory / Game Over Screen */}
      {isGameOver && (
        <div className="p-8 rounded-3xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white shadow-xl animate-in zoom-in-95 duration-300 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-white/20 backdrop-blur-md">
            <Trophy className="w-12 h-12 text-yellow-300 animate-bounce" />
          </div>
          <h2 className="text-3xl font-black">🎉 스와이프 학습 완료!</h2>
          <p className="text-sm text-pink-100 font-medium">
            총 {deck.length}개 카드 중 {correctCount}개를 정확하게 맞추셨습니다!
          </p>
          <div className="text-4xl font-black text-yellow-300 drop-shadow-md">
            최종 점수: {score}점
          </div>
          <button
            onClick={initGame}
            className="mt-2 px-8 py-3.5 rounded-2xl bg-white text-slate-950 font-black text-sm hover:bg-slate-100 transition-all shadow-lg inline-flex items-center gap-2 active:scale-95"
          >
            <Sparkles className="w-5 h-5 text-pink-600" />
            <span>한 번 더 스와이프하기</span>
          </button>
        </div>
      )}

      {/* Main Swipe Stage */}
      {!isGameOver && !isPaused && currentCard && (
        <div className="flex flex-col items-center justify-center space-y-2 sm:space-y-4">
          {/* Top Progress bar */}
          <div className="w-full max-w-sm flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-bold px-1">
            <span>
              카드: <strong className="text-pink-600 dark:text-pink-400 font-black">{currentIndex + 1} / {deck.length}</strong>
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">
              💡 키보드 ← / → 가능
            </span>
          </div>

          {/* Swipeable Card Area */}
          <div className="relative w-full max-w-sm h-64 sm:h-80 flex items-center justify-center select-none touch-none">
            {/* Background next card ghost shadow */}
            {currentIndex + 1 < deck.length && (
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 scale-95 translate-y-2 opacity-60 pointer-events-none" />
            )}

            {/* Active Card */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={getCardStyle()}
              className={`absolute inset-0 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 bg-white dark:bg-slate-900 border-2 shadow-lg flex flex-col items-center justify-between cursor-grab active:cursor-grabbing transition-colors ${
                dragOffset.x > 50
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/40'
                  : dragOffset.x < -50
                  ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/40'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Overlay Badge during Drag */}
              {dragOffset.x > 40 && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shadow-md border border-emerald-400 animate-pulse flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>맞음 (MATCH)</span>
                </div>
              )}
              {dragOffset.x < -40 && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-rose-500 text-white font-black text-xs shadow-md border border-rose-400 animate-pulse flex items-center gap-1">
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                  <span>틀림 (MISMATCH)</span>
                </div>
              )}

              {/* Part of speech & Audio button */}
              <div className="w-full flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-bold text-[10px] sm:text-[11px]">
                  {currentCard.vocab.partOfSpeech || '단어'}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speechService.playItem(`swipe-word-${currentCard.vocab.id}`, currentCard.vocab.word, undefined, 1);
                  }}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-pink-100 text-pink-600 dark:text-pink-400 transition-all"
                  title="발음 듣기"
                >
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Word/Definition Prompt Display */}
              <div className="text-center space-y-0.5 my-auto px-1">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-wide">
                  {currentCard.promptText}
                </h2>
                {currentCard.promptSubtext && (
                  <p className="text-[11px] text-slate-400 font-mono">{currentCard.promptSubtext}</p>
                )}
              </div>

              {/* Proposed Candidate Box */}
              <div className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-0.5">
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium">{currentCard.candidateLabel}</p>
                <p className="text-base sm:text-lg font-extrabold text-indigo-600 dark:text-indigo-300">
                  "{currentCard.candidateText}"
                </p>
              </div>

              {/* Drag Hint Footer */}
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <span>👈 왼쪽(틀림)</span>
                <span className="mx-1">•</span>
                <span>오른쪽(맞음) 👉</span>
              </p>
            </div>
          </div>

          {/* Action Buttons for Mobile Tap Users */}
          <div className="flex items-center gap-2 sm:gap-4 w-full max-w-sm pt-1">
            <button
              onClick={() => handleAnswer(false)}
              className="flex-1 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>X (불일치)</span>
            </button>

            <button
              onClick={() => handleAnswer(true)}
              className="flex-1 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>O (일치)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
