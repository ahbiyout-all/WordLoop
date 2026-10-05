import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  RotateCcw,
  Volume2,
  Trophy,
  Flame,
  Zap,
  CheckCircle2,
  HelpCircle,
  Play,
  Pause,
  LogOut
} from 'lucide-react';
import { VocabItem, QAMode } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning, getEnglishDefinition, QA_MODES_CONFIG } from '../utils/meaningUtils';
import { QAModeSelector } from './QAModeSelector';

interface BubblePopGameProps {
  words: VocabItem[];
  gradeName: string;
  onUpdateHighScore: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit?: () => void;
  qaMode?: QAMode;
  onChangeQAMode?: (mode: QAMode) => void;
}

interface Bubble {
  id: string;
  letter: string;
  x: number; // percentage 5% ~ 85%
  y: number; // percentage 10% ~ 80%
  speedX: number;
  speedY: number;
  color: string;
  size: number; // in pixels
  isTargetLetter: boolean;
  isPopping?: boolean;
  isBounced?: boolean;
}

const BUBBLE_COLORS = [
  'from-pink-400 to-rose-500 shadow-pink-500/30',
  'from-sky-400 to-blue-500 shadow-blue-500/30',
  'from-emerald-400 to-teal-500 shadow-teal-500/30',
  'from-purple-400 to-indigo-500 shadow-purple-500/30',
  'from-amber-400 to-orange-500 shadow-amber-500/30',
  'from-fuchsia-400 to-pink-600 shadow-fuchsia-500/30',
];

const TOTAL_WORDS_PER_ROUND = 8;

export const BubblePopGame: React.FC<BubblePopGameProps> = ({
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

  const [wordList, setWordList] = useState<VocabItem[]>([]);
  const [wordIndex, setWordIndex] = useState<number>(0);
  const [spelledLetters, setSpelledLetters] = useState<string[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [poppingEffects, setPoppingEffects] = useState<
    { id: string; x: number; y: number; letter: string; color: string }[]
  >([]);
  const [wrongEffects, setWrongEffects] = useState<
    { id: string; x: number; y: number; text: string }[]
  >([]);
  const [collisionSparks, setCollisionSparks] = useState<
    { id: string; x: number; y: number }[]
  >([]);

  const animRef = useRef<number | null>(null);

  const currentWordObj = wordList[wordIndex];
  const targetWord = currentWordObj ? currentWordObj.word.toUpperCase() : '';

  // Get prompt question text based on active QAMode
  const getPromptText = (item: VocabItem) => {
    if (activeQAMode === 'ko_to_en') {
      return getCleanKoreanMeaning(item);
    }
    if (activeQAMode === 'en_def_to_en') {
      return getEnglishDefinition(item);
    }
    return `${item.word} [${item.partOfSpeech || 'n.'}] (뜻: ${getCleanKoreanMeaning(item)})`;
  };

  // Initialize Game Round
  const initGame = useCallback(() => {
    if (words.length === 0) return;
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, TOTAL_WORDS_PER_ROUND);
    setWordList(shuffled);
    setWordIndex(0);
    setSpelledLetters([]);
    setScore(0);
    setStreak(0);
    setTimeLeft(60);
    setIsGameOver(false);
    setIsPaused(false);
    setIsGameStarted(true);
  }, [words]);

  // Auto-start game immediately on mount when words are available
  useEffect(() => {
    if (!isGameStarted && words.length > 0) {
      initGame();
    }
  }, [initGame, isGameStarted, words.length]);

  // Generate Bubbles for current word
  const spawnBubbles = useCallback(() => {
    if (!currentWordObj) return;

    const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 640;
    const targetLetters = currentWordObj.word.toUpperCase().split('');
    const maxTotalBubbles = isMobileScreen ? Math.max(9, targetLetters.length + 4) : Math.max(12, targetLetters.length + 5);
    const extraDistractors = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      .split('')
      .filter((l) => !targetLetters.includes(l))
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(4, maxTotalBubbles - targetLetters.length));

    const allLetters = [...targetLetters, ...extraDistractors].sort(() => Math.random() - 0.5);
    const cols = isMobileScreen ? 4 : 5;

    const generated: Bubble[] = allLetters.map((letter, idx) => {
      const color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
      // Guarantee a lively initial velocity vector in a random 360-degree direction
      const angle = (idx * (Math.PI * 2)) / allLetters.length + (Math.random() * 0.7 - 0.35);
      const initialSpeed = 0.28 + Math.random() * 0.16; // 0.28% ~ 0.44% per 16ms frame
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const spacingX = isMobileScreen ? 20 : 17;
      const spacingY = isMobileScreen ? 21 : 22;

      return {
        id: `bubble-${idx}-${Date.now()}-${Math.random()}`,
        letter,
        x: Math.max(6, Math.min(82, 8 + col * spacingX + (Math.random() * 5 - 2.5))),
        y: Math.max(10, Math.min(76, 12 + row * spacingY + (Math.random() * 5 - 2.5))),
        speedX: Math.cos(angle) * initialSpeed,
        speedY: Math.sin(angle) * initialSpeed,
        color,
        size: isMobileScreen ? 46 + Math.floor(Math.random() * 8) : 56 + Math.floor(Math.random() * 12),
        isTargetLetter: targetLetters.includes(letter),
      };
    });

    setBubbles(generated);
    setSpelledLetters([]);
  }, [currentWordObj]);

  useEffect(() => {
    if (isGameStarted && currentWordObj && !isGameOver) {
      spawnBubbles();
      // Speak target word
      speechService.playItem(`bubble-target-${currentWordObj.id}`, currentWordObj.word, undefined, 1);
    }
  }, [currentWordObj, isGameOver, isGameStarted, spawnBubbles]);

  // Timer countdown
  useEffect(() => {
    if (!isGameStarted || isGameOver || isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isGameOver, isGameStarted, isPaused]);

  // High score update on game over
  useEffect(() => {
    if (isGameOver) {
      onUpdateHighScore(score);
    }
  }, [isGameOver, onUpdateHighScore, score]);

  // Floating Bubble Physics loop with Bubble-to-Bubble Elastic Collision
  useEffect(() => {
    if (!isGameStarted || isGameOver || isPaused) return;

    let lastTime = performance.now();

    const updateBubblePositions = (now: number) => {
      const rawDt = (now - lastTime) / 16.667;
      lastTime = now;
      // Clamp dt factor between 0.5 and 2.5 to prevent jumps on tab switch while ensuring smooth motion
      const dt = Math.max(0.5, Math.min(2.5, Number.isFinite(rawDt) && rawDt > 0 ? rawDt : 1));

      setBubbles((prevBubbles) => {
        if (prevBubbles.length === 0) return prevBubbles;

        const minCruisingSpeed = 0.26;
        const maxCruisingSpeed = 0.42;

        // 1. Move bubbles and handle boundary wall elastic bounces
        const updated = prevBubbles.map((b) => {
          let nextSpeedX = b.speedX;
          let nextSpeedY = b.speedY;

          // Ensure bubble never stalls below minCruisingSpeed
          const currentSpeed = Math.hypot(nextSpeedX, nextSpeedY);
          if (currentSpeed < 0.01) {
            const randomAngle = Math.random() * Math.PI * 2;
            nextSpeedX = Math.cos(randomAngle) * minCruisingSpeed;
            nextSpeedY = Math.sin(randomAngle) * minCruisingSpeed;
          } else if (currentSpeed < minCruisingSpeed) {
            const boostFactor = minCruisingSpeed / currentSpeed;
            nextSpeedX *= boostFactor;
            nextSpeedY *= boostFactor;
          } else if (currentSpeed > maxCruisingSpeed) {
            // Smoothly damp high-speed wrong-click bounces back down to cruising speed
            const dampedSpeed = Math.max(maxCruisingSpeed, currentSpeed * 0.985);
            const factor = dampedSpeed / currentSpeed;
            nextSpeedX *= factor;
            nextSpeedY *= factor;
          }

          let nextX = b.x + nextSpeedX * dt;
          let nextY = b.y + nextSpeedY * dt;

          // Elastic bounce off boundary walls (3% to 83% on X, 6% to 78% on Y)
          if (nextX <= 3) {
            nextSpeedX = Math.abs(nextSpeedX);
            nextX = 3;
          } else if (nextX >= 83) {
            nextSpeedX = -Math.abs(nextSpeedX);
            nextX = 83;
          }

          if (nextY <= 6) {
            nextSpeedY = Math.abs(nextSpeedY);
            nextY = 6;
          } else if (nextY >= 78) {
            nextSpeedY = -Math.abs(nextSpeedY);
            nextY = 78;
          }

          return {
            ...b,
            x: nextX,
            y: nextY,
            speedX: nextSpeedX,
            speedY: nextSpeedY,
          };
        });

        // 2. Bubble-to-Bubble 2D Elastic Collision Physics (방울 간 2D 탄성 충돌)
        const count = updated.length;
        const newSparks: { id: string; x: number; y: number }[] = [];

        for (let i = 0; i < count; i++) {
          for (let j = i + 1; j < count; j++) {
            const b1 = updated[i];
            const b2 = updated[j];

            // Calculate distance between bubble centers in percentage coordinates
            // Adjusted for aspect ratio
            const dx = b2.x - b1.x;
            const dy = (b2.y - b1.y) * 1.25;
            const dist = Math.hypot(dx, dy);

            // Radius threshold based on bubble sizes (~7.5% - 8.5%)
            const collisionRadius = (b1.size + b2.size) / 15;

            if (dist < collisionRadius && dist > 0.001) {
              // Collision Normal unit vector
              const nx = dx / dist;
              const ny = (dy / dist) / 1.25;

              // Relative velocity vector along collision normal
              const dvx = b1.speedX - b2.speedX;
              const dvy = b1.speedY - b2.speedY;
              const velAlongNormal = dvx * nx + dvy * ny;

              // Only resolve if bubbles are moving toward each other
              if (velAlongNormal > 0) {
                // High elasticity (0.96) for bouncy rubbery bubble feel
                const elasticity = 0.96;
                const impulse = ((1 + elasticity) * velAlongNormal) / 2;

                b1.speedX -= impulse * nx;
                b1.speedY -= impulse * ny;
                b2.speedX += impulse * nx;
                b2.speedY += impulse * ny;

                // Ensure neither bubble drops below minCruisingSpeed after collision
                const s1 = Math.hypot(b1.speedX, b1.speedY);
                if (s1 > 0.001 && s1 < minCruisingSpeed) {
                  b1.speedX = (b1.speedX / s1) * minCruisingSpeed;
                  b1.speedY = (b1.speedY / s1) * minCruisingSpeed;
                }
                const s2 = Math.hypot(b2.speedX, b2.speedY);
                if (s2 > 0.001 && s2 < minCruisingSpeed) {
                  b2.speedX = (b2.speedX / s2) * minCruisingSpeed;
                  b2.speedY = (b2.speedY / s2) * minCruisingSpeed;
                }

                // Push-back separation to avoid overlapping / clumping
                const overlap = collisionRadius - dist;
                const sepX = (nx * overlap) * 0.52;
                const sepY = (ny * overlap) * 0.52;

                b1.x = Math.max(3, Math.min(83, b1.x - sepX));
                b1.y = Math.max(6, Math.min(78, b1.y - sepY));
                b2.x = Math.max(3, Math.min(83, b2.x + sepX));
                b2.y = Math.max(6, Math.min(78, b2.y + sepY));

                // If high-energy impact, trigger collision spark effect
                if (velAlongNormal > 0.55 && newSparks.length < 2) {
                  newSparks.push({
                    id: `spark-${Date.now()}-${Math.random()}`,
                    x: (b1.x + b2.x) / 2,
                    y: (b1.y + b2.y) / 2,
                  });
                }
              }
            }
          }
        }

        if (newSparks.length > 0) {
          setCollisionSparks((prev) => [...prev.slice(-3), ...newSparks]);
          setTimeout(() => {
            setCollisionSparks((prev) =>
              prev.filter((s) => !newSparks.some((ns) => ns.id === s.id))
            );
          }, 350);
        }

        return updated;
      });

      animRef.current = requestAnimationFrame(updateBubblePositions);
    };

    animRef.current = requestAnimationFrame(updateBubblePositions);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isGameOver, isGameStarted, isPaused]);

  // Handle Bubble Pop Click
  const handlePopBubble = (bubble: Bubble) => {
    if (isGameOver || isPaused || !currentWordObj) return;

    // Speak clicked alphabet letter
    speechService.speakOnce(bubble.letter);

    const neededIndex = spelledLetters.length;
    const neededLetter = targetWord[neededIndex];

    if (bubble.letter === neededLetter) {
      // ✅ Correct letter popped!
      const popId = `pop-${Date.now()}-${Math.random()}`;

      // Add popping visual particle effect
      setPoppingEffects((prev) => [
        ...prev,
        {
          id: popId,
          x: bubble.x,
          y: bubble.y,
          letter: bubble.letter,
          color: bubble.color,
        },
      ]);

      setTimeout(() => {
        setPoppingEffects((prev) => prev.filter((p) => p.id !== popId));
      }, 500);

      // Remove popped bubble from stage
      setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));

      const newSpelled = [...spelledLetters, bubble.letter];
      setSpelledLetters(newSpelled);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const letterPoints = 50 + nextStreak * 10;
      setScore((prev) => prev + letterPoints);

      // Check if full target word completed
      if (newSpelled.join('') === targetWord) {
        // Complete word bonus!
        const bonus = 200 + targetWord.length * 20;
        setScore((prev) => prev + bonus);

        if (onChangeMastery) {
          onChangeMastery(currentWordObj.id, 2);
        }

        // Play full word audio
        setTimeout(() => {
          speechService.playItem(`bubble-word-${currentWordObj.id}`, currentWordObj.word, undefined, 1);
        }, 200);

        // Advance to next word
        setTimeout(() => {
          if (wordIndex + 1 >= wordList.length) {
            setIsGameOver(true);
          } else {
            setWordIndex((prev) => prev + 1);
          }
        }, 800);
      }
    } else {
      // ❌ Wrong letter clicked!
      // Do NOT remove bubble. Instead, launch it with sudden high-speed impulse in a random 360-degree direction
      const randomAngle = Math.random() * 2 * Math.PI;
      const boostSpeed = 1.8 + Math.random() * 0.8; // High kinetic speed (1.8% ~ 2.6% per frame)
      const newSpeedX = Math.cos(randomAngle) * boostSpeed;
      const newSpeedY = Math.sin(randomAngle) * boostSpeed;

      const wrongId = `wrong-${Date.now()}-${Math.random()}`;
      setWrongEffects((prev) => [
        ...prev,
        {
          id: wrongId,
          x: bubble.x,
          y: bubble.y,
          text: '-10',
        },
      ]);

      setTimeout(() => {
        setWrongEffects((prev) => prev.filter((w) => w.id !== wrongId));
      }, 700);

      // Reset streak and deduct score
      setStreak(0);
      setScore((prev) => Math.max(0, prev - 10));

      // Apply sudden random trajectory bounce & visual highlight to this bubble
      setBubbles((prev) =>
        prev.map((b) =>
          b.id === bubble.id
            ? {
                ...b,
                speedX: newSpeedX,
                speedY: newSpeedY,
                isBounced: true,
              }
            : b
        )
      );

      // Reset bounce highlight border after 600ms
      setTimeout(() => {
        setBubbles((prev) =>
          prev.map((b) => (b.id === bubble.id ? { ...b, isBounced: false } : b))
        );
      }, 600);
    }
  };

  return (
    <div className="w-full space-y-1.5 sm:space-y-3 max-w-4xl mx-auto flex-1 flex flex-col justify-start min-h-0">
      {/* Game Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Sparkles className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🎈 방울 팡</span>
                <span className="px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[9px] sm:text-[10px] font-extrabold">
                  {gradeName}
                </span>
              </h3>
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">
                알파벳 순서대로 방울을 터뜨리세요!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:hidden">
            <div className="px-2 py-0.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-[10px] font-black flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              <span>{score}점</span>
            </div>
            <div className="px-2 py-0.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200/60 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 text-[10px] font-black flex items-center gap-1">
              <Zap className="w-3 h-3 text-sky-500 animate-pulse" />
              <span>{timeLeft}s</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-end">
          <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-black items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>{score}점</span>
          </div>

          <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200/60 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 text-xs font-black items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
            <span>{timeLeft}초</span>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
              isPaused
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" /> : <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />}
            <span>{isPaused ? '계속' : '일시중지'}</span>
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
            <p className="text-xs text-slate-300">잠시 방울 터뜨리기를 멈추었습니다.</p>
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

      {/* Start screen / Game Over Screen */}
      {!isGameStarted ? (
        <div className="p-10 rounded-3xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white text-center space-y-4 shadow-xl">
          <div className="inline-flex p-4 rounded-3xl bg-white/20 backdrop-blur-md">
            <Sparkles className="w-12 h-12 text-yellow-300 animate-spin" />
          </div>
          <h2 className="text-3xl font-black">🎈 알파벳 방울 터뜨리기</h2>
          <p className="text-sm text-sky-100 max-w-md mx-auto">
            화면에 둥둥 떠다니는 색색의 알파벳 방울 중, 목표 단어의 스펠링 순서에 맞춰 방울을 터뜨리세요!
          </p>
          <button
            onClick={initGame}
            className="px-8 py-3.5 rounded-2xl bg-white text-sky-950 font-black text-sm hover:bg-slate-100 transition-all shadow-lg inline-flex items-center gap-2 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current text-sky-600" />
            <span>게임 시작하기</span>
          </button>
        </div>
      ) : isGameOver ? (
        <div className="p-8 rounded-3xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-300">
          <div className="inline-flex p-3 rounded-full bg-white/20 backdrop-blur-md">
            <Trophy className="w-12 h-12 text-yellow-300 animate-bounce" />
          </div>
          <h2 className="text-3xl font-black">🎉 방울 팡 완성!</h2>
          <p className="text-sm text-sky-100 font-medium">
            제한시간 동안 알파벳 방울을 신나게 터뜨리셨습니다!
          </p>
          <div className="text-4xl font-black text-yellow-300 drop-shadow-md">
            최종 점수: {score}점
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={initGame}
              className="px-6 py-3 rounded-2xl bg-white text-slate-950 font-black text-sm hover:bg-slate-100 transition-all shadow-lg inline-flex items-center gap-2 active:scale-95"
            >
              <Sparkles className="w-5 h-5 text-sky-600" />
              <span>다시 터뜨리기</span>
            </button>
            {onQuit && (
              <button
                onClick={onQuit}
                className="px-6 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/30 font-black text-sm transition-all shadow-md inline-flex items-center gap-2 active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>게임 목록으로 돌아가기</span>
              </button>
            )}
          </div>
        </div>
      ) : !isPaused ? (
        /* Active Game Arena */
        <div className="w-full flex-1 flex flex-col justify-between space-y-1.5 sm:space-y-3 min-h-0">
          {/* Target Word & Spelling Slots Display */}
          <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-1 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                목표 ({wordIndex + 1} / {wordList.length}):
              </span>
              <button
                onClick={() => speechService.playItem(`bubble-target-${currentWordObj.id}`, currentWordObj.word, undefined, 1)}
                className="px-2 py-0.5 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 text-[10px] sm:text-[11px] font-bold flex items-center gap-1"
              >
                <Volume2 className="w-3 h-3" />
                <span>듣기</span>
              </button>
            </div>

            <div className="text-base sm:text-xl font-black text-indigo-600 dark:text-indigo-400 px-1 leading-tight truncate">
              "{getPromptText(currentWordObj)}"
            </div>

            {/* Letter Match Progress */}
            <div className="flex items-center justify-between gap-1 px-1 text-[10px] sm:text-[11px] font-extrabold">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400">🎯 일치:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-black transition-all ${
                    spelledLetters.length === targetWord.length
                      ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-400/50'
                      : spelledLetters.length > 0
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {spelledLetters.length} / {targetWord.length}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-400">
                {spelledLetters.length === 0
                  ? '알파벳 방울을 터뜨리세요'
                  : '✓ 일치'}
              </span>
            </div>

            {/* Letter Slots */}
            <div className="flex items-center justify-center gap-1 pt-0.5 flex-wrap">
              {targetWord.split('').map((letter, idx) => {
                const isFilled = idx < spelledLetters.length;
                const isCurrentNeeded = idx === spelledLetters.length;

                return (
                  <div
                    key={`slot-${idx}`}
                    className={`relative w-7 h-9 sm:w-10 sm:h-12 rounded-lg sm:rounded-xl font-mono text-sm sm:text-lg font-black flex items-center justify-center transition-all duration-200 ${
                      isFilled
                        ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-2 border-emerald-300 ring-2 ring-emerald-400/30 scale-105 shadow-md shadow-emerald-500/20'
                        : isCurrentNeeded
                        ? 'border-2 border-dashed border-sky-400 bg-sky-50 dark:bg-sky-950/50 text-sky-400 animate-pulse'
                        : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isFilled ? letter : isCurrentNeeded ? '?' : '_'}

                    {/* Checkmark Badge for matched letters */}
                    {isFilled && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 text-[8px] sm:text-[10px] font-black flex items-center justify-center shadow-md border border-emerald-400">
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Bubble Stage Canvas */}
          <div className="relative w-full flex-1 min-h-[220px] sm:min-h-[260px] bg-slate-900 rounded-2xl sm:rounded-3xl border-2 border-slate-800 overflow-hidden shadow-inner touch-none">
            {/* Subtle background ambient bubbles */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-950/30 via-slate-900 to-indigo-950/40 pointer-events-none" />

            {/* Active Floating Bubbles */}
            {bubbles.map((bubble) => (
              <button
                key={bubble.id}
                onClick={() => handlePopBubble(bubble)}
                style={{
                  left: `${bubble.x}%`,
                  top: `${bubble.y}%`,
                  width: `${bubble.size}px`,
                  height: `${bubble.size}px`,
                  willChange: 'left, top, transform',
                }}
                className={`absolute rounded-full bg-gradient-to-br ${bubble.color} text-white font-mono font-black text-base sm:text-xl flex items-center justify-center shadow-lg active:scale-90 hover:scale-110 transition-transform duration-150 border-2 ${
                  bubble.isBounced
                    ? 'border-rose-400 ring-4 ring-rose-500/80 shadow-2xl shadow-rose-500/60 scale-110'
                    : 'border-white/40'
                } backdrop-blur-sm cursor-pointer select-none`}
              >
                <span className="drop-shadow-md">{bubble.letter}</span>
              </button>
            ))}

            {/* Popping Effect Particles (Correct) */}
            {poppingEffects.map((pop) => (
              <div
                key={pop.id}
                style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-ping text-sky-300 font-extrabold text-xl sm:text-2xl z-20"
              >
                ✨
              </div>
            ))}

            {/* Wrong Click Bounce Warning Particles */}
            {wrongEffects.map((w) => (
              <div
                key={w.id}
                style={{ left: `${w.x}%`, top: `${w.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-bounce text-rose-400 font-black text-sm sm:text-base drop-shadow-md z-30 flex items-center gap-0.5"
              >
                <span>💥 {w.text}</span>
              </div>
            ))}

            {/* Bubble-to-Bubble High Energy Collision Sparks */}
            {collisionSparks.map((spark) => (
              <div
                key={spark.id}
                style={{ left: `${spark.x}%`, top: `${spark.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-ping text-amber-300 font-extrabold text-xs sm:text-sm z-20 opacity-90"
              >
                ⚡
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
