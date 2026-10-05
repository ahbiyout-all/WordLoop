import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ArrowDown,
  Layers,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  PartyPopper,
  Clock,
  Award
} from 'lucide-react';
import { VocabItem, QAMode } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning, getEnglishDefinition } from '../utils/meaningUtils';

interface WordBlockGameProps {
  words: VocabItem[];
  gradeName: string;
  onUpdateHighScore: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit?: () => void;
  qaMode?: QAMode;
  onChangeQAMode?: (mode: QAMode) => void;
}

export interface GridBlock {
  id: string;
  letter: string;
  colorClass: string;
  isPopping?: boolean;
  isNewSpawn?: boolean;
  row: number;
  col: number;
}

const BLOCK_COLOR_PALETTES = [
  'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400 text-white shadow-indigo-500/30',
  'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-emerald-500/30',
  'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400 text-white shadow-amber-500/30',
  'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400 text-white shadow-rose-500/30',
  'bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-400 text-white shadow-cyan-500/30',
  'bg-gradient-to-br from-purple-500 to-purple-600 border-purple-400 text-white shadow-purple-500/30',
  'bg-gradient-to-br from-sky-500 to-sky-600 border-sky-400 text-white shadow-sky-500/30',
  'bg-gradient-to-br from-pink-500 to-pink-600 border-pink-400 text-white shadow-pink-500/30',
];

// Helper: Calculate stage refill time in seconds
// Stage 1: 14s (allows All Clear!), Stage 2: 12s, Stage 3: 10s, Stage 4: 8s, Stage 5+: 6s
const getStageRefillInterval = (stageNum: number): number => {
  return Math.max(6, 16 - stageNum * 2);
};

// Helper: Calculate dynamic font size for blocks based on grid dimensions
const getBlockFontSizeClass = (gridSize: number): string => {
  switch (gridSize) {
    case 4:
      return 'text-2xl sm:text-3xl md:text-4xl';
    case 5:
      return 'text-xl sm:text-2xl md:text-3xl';
    case 6:
      return 'text-lg sm:text-xl md:text-2xl';
    case 7:
      return 'text-base sm:text-lg md:text-xl';
    default:
      return 'text-sm sm:text-base md:text-lg';
  }
};

// Web Audio sound synthesizer
const playSoundEffect = (type: 'pop' | 'match' | 'stageClear' | 'allClear' | 'wrong' | 'spawn') => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'match') {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.2);
      });
    } else if (type === 'allClear') {
      // Grand All Clear fanfare!
      const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
      fanfare.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.09);
        osc.stop(ctx.currentTime + idx * 0.09 + 0.4);
      });
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
    } else if (type === 'spawn') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // Ignore audio context restrictions
  }
};

export const WordBlockGame: React.FC<WordBlockGameProps> = ({
  words,
  gradeName,
  onUpdateHighScore,
  onChangeMastery,
  onQuit,
  qaMode = 'ko_to_en',
}) => {
  const activeQAMode = qaMode;

  // Stage & Grid Configuration
  // Stage 1: 4x4, Stage 2: 5x5, Stage 3: 6x6, Stage 4: 7x7, Stage 5: 8x8
  const [stage, setStage] = useState<number>(1);
  const gridSize = Math.min(8, 3 + stage); // Starts at 4, increases by 1 each stage
  const targetScoreForStage = stage * 300; // Target score threshold to clear stage

  // Game Play State
  const [score, setScore] = useState<number>(0);
  const [stageScore, setStageScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [clearedWordsCount, setClearedWordsCount] = useState<number>(0);

  // Target word list & current target word
  const [targetWords, setTargetWords] = useState<VocabItem[]>([]);
  const [targetWordIdx, setTargetWordIdx] = useState<number>(0);
  const [spelledLetters, setSpelledLetters] = useState<string[]>([]);

  // 2D Grid of Blocks: (GridBlock | null)[][] of dimensions [gridSize][gridSize]
  const [grid, setGrid] = useState<(GridBlock | null)[][]>([]);

  // Guaranteed Word Rearrange Count (Starts at 5, +1 on stage clear/level-up)
  const [rearrangeCount, setRearrangeCount] = useState<number>(5);

  // Refill Countdown Timer State
  const refillInterval = getStageRefillInterval(stage);
  const [refillCountdown, setRefillCountdown] = useState<number>(refillInterval);

  // UI States
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isStageCleared, setIsStageCleared] = useState<boolean>(false);
  const [wasAllClear, setWasAllClear] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [shakeGrid, setShakeGrid] = useState<boolean>(false);
  const [highlightLetter, setHighlightLetter] = useState<string | null>(null);

  const currentTarget = targetWords[targetWordIdx] || null;
  const currentTargetWord = currentTarget ? currentTarget.word.trim().toUpperCase() : '';
  const currentNeededChar = currentTargetWord[spelledLetters.length] || '';

  // Calculate total remaining blocks on board
  const totalRemainingBlocks = grid.reduce(
    (total, row) => total + row.filter((cell) => cell !== null && !cell.isPopping).length,
    0
  );
  const maxBoardBlocks = gridSize * gridSize;
  const hasEmptySpaces = totalRemainingBlocks < maxBoardBlocks;

  // Prompt clue text
  const getPromptText = (item: VocabItem) => {
    if (activeQAMode === 'ko_to_en') {
      return getCleanKoreanMeaning(item);
    }
    if (activeQAMode === 'en_def_to_en') {
      return getEnglishDefinition(item);
    }
    return `${item.word} [${item.partOfSpeech || 'n.'}] (뜻: ${getCleanKoreanMeaning(item)})`;
  };

  const wordsRef = useRef(words);
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  // Generate weighted letter
  const generateWeightedLetter = useCallback((targetWord: string): string => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const targetLetters = targetWord ? targetWord.split('') : [];

    // 55% chance to pick a letter from current target word if available
    if (targetLetters.length > 0 && Math.random() < 0.55) {
      return targetLetters[Math.floor(Math.random() * targetLetters.length)];
    }

    const vowels = 'AEIOU';
    if (Math.random() < 0.4) {
      return vowels[Math.floor(Math.random() * vowels.length)];
    }

    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }, []);

  // Initialize a new Stage
  const initStage = useCallback((stageNum: number, currentOverallScore: number = 0) => {
    const currentWords = wordsRef.current && wordsRef.current.length > 0 ? wordsRef.current : [];
    const size = Math.min(8, 3 + stageNum);

    const validWords = currentWords
      .filter((w) => {
        const clean = w.word.trim().toUpperCase();
        return /^[A-Z]+$/.test(clean) && clean.length >= 3 && clean.length <= 8;
      })
      .sort(() => Math.random() - 0.5);

    const selectedWords = validWords.length > 0 ? validWords : currentWords;
    setTargetWords(selectedWords);
    setTargetWordIdx(0);
    setSpelledLetters([]);
    setStage(stageNum);
    setStageScore(0);
    setCombo(0);
    setIsStageCleared(false);
    setWasAllClear(false);
    setIsGameOver(false);
    setIsPaused(false);

    const interval = getStageRefillInterval(stageNum);
    setRefillCountdown(interval);

    // If starting fresh from Stage 1, reset rearrange charges to 5
    if (stageNum === 1) {
      setRearrangeCount(5);
    }

    const firstWord = selectedWords[0]?.word.trim().toUpperCase() || 'STAR';

    // Build initial full grid [size x size]
    const initialGrid: (GridBlock | null)[][] = [];
    let colorIdx = 0;

    for (let r = 0; r < size; r++) {
      const row: (GridBlock | null)[] = [];
      for (let c = 0; c < size; c++) {
        const letter = generateWeightedLetter(firstWord);
        row.push({
          id: `b-${stageNum}-${r}-${c}-${Date.now()}-${Math.random()}`,
          letter,
          colorClass: BLOCK_COLOR_PALETTES[colorIdx % BLOCK_COLOR_PALETTES.length],
          row: r,
          col: c,
          isNewSpawn: false,
          isPopping: false,
        });
        colorIdx++;
      }
      initialGrid.push(row);
    }

    setGrid(initialGrid);
  }, [generateWeightedLetter]);

  // Initial stage setup on mount ONLY
  useEffect(() => {
    initStage(1, 0);
  }, [initStage]);

  // Check if grid has zero blocks left (All Clear)
  const isGridEmpty = (currentGrid: (GridBlock | null)[][]): boolean => {
    return currentGrid.every((row) =>
      row.every((cell) => cell === null || cell.isPopping)
    );
  };

  // Apply Gravity ONLY: Drops existing blocks down to bottom; leaves top spaces as NULL!
  const applyGravityOnly = useCallback((
    currentGrid: (GridBlock | null)[][]
  ): (GridBlock | null)[][] => {
    const size = currentGrid.length;
    const newGrid: (GridBlock | null)[][] = Array.from({ length: size }, () =>
      Array(size).fill(null)
    );

    for (let c = 0; c < size; c++) {
      const columnBlocks: GridBlock[] = [];
      for (let r = 0; r < size; r++) {
        const cell = currentGrid[r][c];
        if (cell && !cell.isPopping) {
          columnBlocks.push(cell);
        }
      }

      let placeRow = size - 1;
      for (let i = columnBlocks.length - 1; i >= 0; i--) {
        const block = columnBlocks[i];
        newGrid[placeRow][c] = {
          ...block,
          row: placeRow,
          col: c,
          isNewSpawn: false,
          isPopping: false,
        };
        placeRow--;
      }
      // Upper rows in newGrid remain NULL (empty spaces ready for delayed refill or All Clear!)
    }

    return newGrid;
  }, []);

  // Spawn 1 Single Block from Top into Next Available Empty Space in Slow Motion
  const spawnRefillBlocks = useCallback(() => {
    if (isPaused || isStageCleared || isGameOver) return;

    setGrid((prevGrid) => {
      const size = prevGrid.length;

      // Find all columns that have empty slots, and pick the lowest empty row in each column
      const candidateLandingSlots: { r: number; c: number }[] = [];
      for (let c = 0; c < size; c++) {
        for (let r = size - 1; r >= 0; r--) {
          if (prevGrid[r][c] === null) {
            candidateLandingSlots.push({ r, c });
            break; // Lowest empty slot in column c is the landing spot for gravity
          }
        }
      }

      if (candidateLandingSlots.length === 0) return prevGrid;

      // Pick a column landing slot (randomized among columns that need blocks)
      const targetSlot =
        candidateLandingSlots[Math.floor(Math.random() * candidateLandingSlots.length)];
      const { r: targetR, c: targetC } = targetSlot;

      const targetWordStr = currentTarget ? currentTarget.word.trim().toUpperCase() : 'STAR';

      // 1. Guaranteed Letter Check: Inspect all non-popping existing blocks on the board
      const existingLetterCounts = new Map<string, number>();
      prevGrid.forEach((rowArr) => {
        rowArr.forEach((cell) => {
          if (cell && !cell.isPopping) {
            const char = cell.letter.toUpperCase();
            existingLetterCounts.set(char, (existingLetterCounts.get(char) || 0) + 1);
          }
        });
      });

      // Find required remaining letters of current target word that are missing on the board
      const remainingTargetChars = targetWordStr.slice(spelledLetters.length).split('');
      const missingLetters: string[] = [];
      const tempCounts = new Map(existingLetterCounts);

      for (const char of remainingTargetChars) {
        const count = tempCounts.get(char) || 0;
        if (count > 0) {
          tempCounts.set(char, count - 1);
        } else {
          missingLetters.push(char);
        }
      }

      let newLetter: string;
      if (missingLetters.length > 0) {
        newLetter = missingLetters[0]; // Guaranteed spawn for missing required letter!
      } else {
        newLetter = generateWeightedLetter(targetWordStr);
      }

      const colorIdx = Math.floor(Math.random() * BLOCK_COLOR_PALETTES.length);
      const newBlock: GridBlock = {
        id: `drop-${targetR}-${targetC}-${Date.now()}-${Math.random()}`,
        letter: newLetter,
        colorClass: BLOCK_COLOR_PALETTES[colorIdx % BLOCK_COLOR_PALETTES.length],
        row: targetR,
        col: targetC,
        isNewSpawn: true,
        isPopping: false,
      };

      const newGrid = prevGrid.map((rowArr, r) =>
        rowArr.map((cell, c) => {
          if (r === targetR && c === targetC) {
            return newBlock;
          }
          // Reset older newSpawn flags so only the currently falling block animates
          if (cell && cell.isNewSpawn) {
            return { ...cell, isNewSpawn: false };
          }
          return cell;
        })
      );

      playSoundEffect('spawn');
      return newGrid;
    });

    // Reset countdown for the next drop
    setRefillCountdown(refillInterval);
  }, [isPaused, isStageCleared, isGameOver, currentTarget, spelledLetters, generateWeightedLetter, refillInterval]);

  // Refill Timer Effect: Ticks countdown when there are empty spaces
  useEffect(() => {
    if (isPaused || isStageCleared || isGameOver || !hasEmptySpaces) {
      if (!hasEmptySpaces) {
        setRefillCountdown(refillInterval);
      }
      return;
    }

    const timer = setInterval(() => {
      setRefillCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isStageCleared, isGameOver, hasEmptySpaces, refillInterval]);

  // When countdown hits 0, trigger exactly 1 block drop and reset timer
  useEffect(() => {
    if (refillCountdown === 0 && hasEmptySpaces && !isPaused && !isStageCleared && !isGameOver) {
      spawnRefillBlocks();
    }
  }, [refillCountdown, hasEmptySpaces, isPaused, isStageCleared, isGameOver, spawnRefillBlocks]);

  // Stage Clear Handler
  const handleStageClear = (finalScore: number, allClear: boolean = false) => {
    if (allClear) {
      playSoundEffect('allClear');
      setWasAllClear(true);
    } else {
      playSoundEffect('stageClear');
      setWasAllClear(false);
    }
    setIsStageCleared(true);
    onUpdateHighScore(finalScore);
  };

  // Handle Block Click / Tap
  const handleBlockClick = (r: number, c: number) => {
    if (isPaused || isStageCleared || isGameOver || !currentTarget) return;

    const clickedBlock = grid[r]?.[c];
    if (!clickedBlock || clickedBlock.isPopping) return;

    const clickedLetter = clickedBlock.letter;

    // Speak clicked letter
    speechService.speakOnce(clickedLetter);

    // Check if clicked letter matches the current needed letter of target word
    if (clickedLetter === currentNeededChar) {
      // Correct letter matched!
      playSoundEffect('pop');

      const nextSpelled = [...spelledLetters, clickedLetter];
      setSpelledLetters(nextSpelled);

      // Mark this block as popping
      const gridWithPopping = grid.map((rowArr, rowIdx) =>
        rowArr.map((cell, colIdx) => {
          if (rowIdx === r && colIdx === c && cell) {
            return { ...cell, isPopping: true };
          }
          return cell;
        })
      );
      setGrid(gridWithPopping);

      // Check if full target word is completed
      if (nextSpelled.length === currentTargetWord.length) {
        // Complete word matched!
        playSoundEffect('match');
        const nextCombo = combo + 1;
        setCombo(nextCombo);

        const earnedPoints = 100 + currentTargetWord.length * 20 + (nextCombo - 1) * 30;
        const newScore = score + earnedPoints;
        const newStageScore = stageScore + earnedPoints;
        setScore(newScore);
        setStageScore(newStageScore);
        setClearedWordsCount((prev) => prev + 1);

        // Delayed pronunciation of full word
        setTimeout(() => {
          speechService.playItem(`block-word-${currentTarget.id}`, currentTarget.word, undefined, 1);
        }, 250);

        if (onChangeMastery) {
          onChangeMastery(currentTarget.id, 2);
        }

        // Apply GRAVITY ONLY after brief pop animation
        setTimeout(() => {
          const nextWordIdx = (targetWordIdx + 1) % targetWords.length;
          const gravityGrid = applyGravityOnly(gridWithPopping);
          setGrid(gravityGrid);
          setSpelledLetters([]);
          setTargetWordIdx(nextWordIdx);

          // 1. Check ALL CLEAR condition (No blocks remaining on entire board!)
          if (isGridEmpty(gravityGrid)) {
            const allClearBonus = 500;
            const finalScore = newScore + allClearBonus;
            setScore(finalScore);
            handleStageClear(finalScore, true);
            return;
          }

          // 2. Check Target Score Reached condition
          if (newStageScore >= targetScoreForStage) {
            handleStageClear(newScore, false);
          }
        }, 300);
      } else {
        // Partial letter matched -> Apply gravity only
        setTimeout(() => {
          const gravityGrid = applyGravityOnly(gridWithPopping);
          setGrid(gravityGrid);

          // Check if board became empty
          if (isGridEmpty(gravityGrid)) {
            const allClearBonus = 500;
            const finalScore = score + allClearBonus;
            setScore(finalScore);
            handleStageClear(finalScore, true);
          }
        }, 200);
      }
    } else {
      // Incorrect letter clicked -> shake feedback & combo reset
      playSoundEffect('wrong');
      setShakeGrid(true);
      setCombo(0);
      setTimeout(() => setShakeGrid(false), 450);
    }
  };

  // Next Stage Proceed (Level Up adds +1 Rearrange Charge)
  const handleNextStage = () => {
    const nextStageNum = stage + 1;
    setRearrangeCount((prev) => prev + 1);
    initStage(nextStageNum, score);
  };

  // 2. 단어의 모든 알파벳이 반드시 100% 포함된 새 블록 그리드로 재배치
  const handleGuaranteedRearrange = () => {
    if (rearrangeCount <= 0 || isGameOver || isPaused || !currentTarget) return;

    setRearrangeCount((prev) => Math.max(0, prev - 1));
    playSoundEffect('spawn');
    setSpelledLetters([]); // Reset current spelled progress for fresh word assembly

    const size = gridSize;
    const totalCells = size * size;
    const targetWordStr = currentTarget.word.trim().toUpperCase();
    const targetChars = targetWordStr.split('');

    // Prepare letter pool with ALL target word characters guaranteed
    const pool: string[] = [...targetChars];
    while (pool.length < totalCells) {
      pool.push(generateWeightedLetter(targetWordStr));
    }

    // Shuffle positions
    const shuffledPool = pool.sort(() => Math.random() - 0.5);

    let pIdx = 0;
    let colorIdx = Math.floor(Math.random() * BLOCK_COLOR_PALETTES.length);
    const newGrid: (GridBlock | null)[][] = [];

    for (let r = 0; r < size; r++) {
      const row: (GridBlock | null)[] = [];
      for (let c = 0; c < size; c++) {
        row.push({
          id: `rearrange-${stage}-${r}-${c}-${Date.now()}-${Math.random()}`,
          letter: shuffledPool[pIdx++],
          colorClass: BLOCK_COLOR_PALETTES[colorIdx % BLOCK_COLOR_PALETTES.length],
          row: r,
          col: c,
          isNewSpawn: true,
          isPopping: false,
        });
        colorIdx++;
      }
      newGrid.push(row);
    }

    setGrid(newGrid);
    setRefillCountdown(refillInterval);
  };

  // Hint button: highlight next needed letter on board
  const handleHint = () => {
    if (!currentNeededChar || isGameOver || isPaused) return;

    setHighlightLetter(currentNeededChar);
    setTimeout(() => setHighlightLetter(null), 2000);
    setScore((prev) => Math.max(0, prev - 10));
  };

  // Manual Shuffle board
  const handleShuffleBoard = () => {
    if (isGameOver || isPaused || !currentTarget) return;

    setGrid((prev) => {
      const size = prev.length;
      const allBlocks: GridBlock[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cell = prev[r][c];
          if (cell && !cell.isPopping) allBlocks.push(cell);
        }
      }

      const shuffled = [...allBlocks].sort(() => Math.random() - 0.5);
      let sIdx = 0;

      const newGrid: (GridBlock | null)[][] = Array.from({ length: size }, () =>
        Array(size).fill(null)
      );

      // Place shuffled blocks from bottom up
      for (let c = 0; c < size; c++) {
        for (let r = size - 1; r >= 0; r--) {
          if (sIdx < shuffled.length) {
            newGrid[r][c] = {
              ...shuffled[sIdx],
              row: r,
              col: c,
              isNewSpawn: true,
            };
            sIdx++;
          }
        }
      }
      return newGrid;
    });
    setScore((prev) => Math.max(0, prev - 15));
  };

  return (
    <div className="space-y-1.5 sm:space-y-3 w-full max-w-xl mx-auto flex-1 flex flex-col justify-start min-h-0 px-0 sm:px-2">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Boxes className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🧱 블록 팡</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[9px] sm:text-[10px] font-extrabold">
                  Stage {stage} ({gridSize}×{gridSize})
                </span>
              </h3>
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">
                블록을 터뜨려 모두 지우면 올 클리어(All Clear)!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:hidden">
            <div className="px-2 py-0.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-[10px] font-black flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              <span>{score}점</span>
            </div>
            {combo > 1 && (
              <div className="px-1.5 py-0.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[9px] font-black flex items-center gap-0.5 animate-bounce">
                <Flame className="w-3 h-3 fill-current" />
                <span>{combo}x</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-end">
          <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-black items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>{score}점</span>
          </div>

          {combo > 1 && (
            <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-black items-center gap-1 animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{combo} COMBO!</span>
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
            onClick={() => initStage(1, 0)}
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

      {/* Stage Goal & Spawning Refill Timer Bar */}
      <div className="grid grid-cols-2 gap-1.5 shrink-0">
        {/* Stage Score Progress */}
        <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1 truncate">
              <Zap className="w-3 h-3 text-amber-500 fill-current shrink-0" />
              <span>목표 점수:</span>
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
              {Math.min(targetScoreForStage, stageScore)}/{targetScoreForStage}
            </span>
          </div>
          <div className="w-full h-1.5 sm:h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (stageScore / targetScoreForStage) * 100)}%` }}
            />
          </div>
        </div>

        {/* Dynamic Spawning Refill Countdown Gauge */}
        <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1 truncate">
              <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
              <span>공중 낙하 리필:</span>
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">
              {hasEmptySpaces ? `${refillCountdown}초` : '가득참'}
            </span>
          </div>
          <div className="w-full h-1.5 sm:h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${
                refillCountdown <= 3
                  ? 'bg-rose-500 animate-pulse'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              }`}
              style={{
                width: hasEmptySpaces
                  ? `${Math.max(0, (refillCountdown / refillInterval) * 100)}%`
                  : '100%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Stage Clear Victory Modal */}
      {isStageCleared && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-300">
          <div className="inline-flex p-3 rounded-full bg-white/20 backdrop-blur-md">
            <PartyPopper className="w-10 h-10 text-yellow-300 animate-bounce" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-2xl sm:text-3xl font-black">
                🎉 STAGE {stage} CLEAR!
              </h2>
            </div>
            {wasAllClear ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400 text-slate-950 font-black text-xs shadow-lg animate-pulse">
                <Award className="w-4 h-4 fill-current text-amber-900" />
                <span>🌟 ALL CLEAR! 보드 완벽 제거 (+500점)</span>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-emerald-100 font-medium">
                목표 점수 달성! 다음 단계로 레벨업합니다.
              </p>
            )}
          </div>

          <div className="p-3 bg-black/20 rounded-2xl border border-white/20 flex items-center justify-around text-xs sm:text-sm font-bold">
            <div>
              <span className="text-white/70 block text-[10px]">현재 총점</span>
              <span className="text-yellow-300 text-base sm:text-lg font-black">{score}점</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <span className="text-white/70 block text-[10px]">보너스 보상</span>
              <span className="text-emerald-300 text-xs sm:text-sm font-black flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-current text-yellow-300" />
                <span>재배치 +1회 충전</span>
              </span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <span className="text-white/70 block text-[10px]">다음 그리드</span>
              <span className="text-white text-base sm:text-lg font-black">{gridSize + 1} × {gridSize + 1}</span>
            </div>
          </div>

          <button
            onClick={handleNextStage}
            className="w-full py-3.5 rounded-2xl bg-white text-slate-950 font-black text-sm hover:bg-slate-100 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>다음 단계 ({stage + 1}단계 {gridSize + 1}×{gridSize + 1}) 진행하기</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Game Area */}
      {!isStageCleared && !isGameOver && !isPaused && currentTarget && (
        <div className="flex-1 flex flex-col justify-between space-y-1.5 sm:space-y-2.5 min-h-0">
          {/* Target Word Clue & Spelling Slots */}
          <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-1 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                목표 ({targetWordIdx + 1} / {targetWords.length}):
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                  남은 블록: {totalRemainingBlocks}/{maxBoardBlocks}
                </span>
                <button
                  onClick={() => speechService.playItem(`block-word-${currentTarget.id}`, currentTarget.word, undefined, 1)}
                  className="px-2 py-0.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-[11px] font-bold flex items-center gap-1"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>듣기</span>
                </button>
              </div>
            </div>

            <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 px-1 leading-tight truncate">
              "{getPromptText(currentTarget)}"
            </div>

            {/* Letter Slots - Auto-fills width dynamically for mobile */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 pt-0.5 w-full max-w-full">
              {currentTargetWord.split('').map((letter, idx) => {
                const isFilled = idx < spelledLetters.length;
                const isNext = idx === spelledLetters.length;

                return (
                  <div
                    key={`slot-${idx}`}
                    className={`min-w-[28px] max-w-[46px] flex-1 aspect-[4/5] sm:min-w-[38px] sm:max-w-[54px] rounded-xl sm:rounded-2xl font-mono text-base sm:text-2xl font-black flex items-center justify-center transition-all duration-200 ${
                      isFilled
                        ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-2 border-emerald-300 ring-2 ring-emerald-400/30 scale-105 shadow-md shadow-emerald-500/20'
                        : isNext
                        ? 'border-2 border-dashed border-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-400 animate-pulse'
                        : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isFilled ? spelledLetters[idx] : isNext ? '?' : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gravity Block Grid Canvas Arena - Full Width Mobile Optimized */}
          <div
            className={`relative w-full flex-1 max-h-[460px] bg-slate-900/90 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center touch-none transition-transform duration-100 ${
              shakeGrid ? 'animate-shake' : ''
            }`}
          >
            {/* Ambient Background Gravity Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-slate-900 to-emerald-950/30 rounded-2xl sm:rounded-3xl pointer-events-none" />

            {/* Grid Container */}
            <div
              className="w-full max-w-[390px] sm:max-w-[440px] aspect-square grid gap-1.5 sm:gap-2.5"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
              }}
            >
              {grid.map((rowArr, r) =>
                rowArr.map((block, c) => {
                  if (!block) {
                    return (
                      <div
                        key={`empty-${r}-${c}`}
                        className="w-full h-full rounded-xl sm:rounded-2xl border border-dashed border-slate-800/60 bg-slate-950/20 flex items-center justify-center"
                      >
                        {r === 0 && (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-700/50 animate-bounce" />
                        )}
                      </div>
                    );
                  }

                  const isHintTarget = highlightLetter === block.letter;

                  return (
                    <button
                      key={block.id}
                      onClick={() => handleBlockClick(r, c)}
                      className={`relative w-full h-full rounded-xl sm:rounded-2xl font-mono font-black ${getBlockFontSizeClass(
                        gridSize
                      )} flex items-center justify-center border-2 transition-all duration-200 select-none active:scale-90 shadow-md ${
                        block.colorClass
                      } ${
                        block.isPopping
                          ? 'scale-125 opacity-0 rotate-12 transition-all duration-300'
                          : block.isNewSpawn
                          ? 'animate-drop-slow'
                          : 'hover:brightness-110'
                      } ${
                        isHintTarget
                          ? 'ring-4 ring-yellow-400 ring-offset-2 animate-bounce'
                          : ''
                      }`}
                    >
                      <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] select-none leading-none tracking-tight">
                        {block.letter}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Action Tools Bar */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 shrink-0 py-0.5">
            {/* Guaranteed Word Rearrange Button */}
            <button
              onClick={handleGuaranteedRearrange}
              disabled={rearrangeCount <= 0}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 border ${
                rearrangeCount > 0
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110 border-emerald-400/80 shadow-sm shadow-emerald-500/20 active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50'
              }`}
              title={`단어의 모든 알파벳이 모두 포함된 새 블록으로 재배치 (남은 횟수: ${rearrangeCount}회, 레벨업 시 +1)`}
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-current shrink-0" />
              <span>재배치</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                rearrangeCount > 0 ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
              }`}>
                {rearrangeCount}
              </span>
            </button>

            <button
              onClick={handleHint}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 border border-amber-200/60 active:scale-95"
              title="다음 글자 힌트 보기 (-10점)"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>힌트</span>
            </button>

            <button
              onClick={handleShuffleBoard}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700/60 active:scale-95"
              title="블록 위치 섞기 (-15점)"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>섞기</span>
            </button>

            {hasEmptySpaces && (
              <button
                onClick={spawnRefillBlocks}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 border border-indigo-200/60 animate-pulse active:scale-95"
                title="빈 공간에 블록 즉시 공중 낙하"
              >
                <ArrowDown className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>즉시 리필</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
