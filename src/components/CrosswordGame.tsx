import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Grid,
  Lightbulb,
  Volume2,
  CheckCircle2,
  RotateCcw,
  Trophy,
  Sparkles,
  HelpCircle,
  Award,
  Check,
  Zap,
  ArrowRight,
  Pause,
  Play,
  LogOut,
  Trash2,
  Delete as BackspaceIcon,
  ArrowLeftRight,
  Keyboard,
  X,
  CornerDownRight,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { VocabItem, QAMode } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning, getEnglishDefinition, QA_MODES_CONFIG } from '../utils/meaningUtils';
import { QAModeSelector } from './QAModeSelector';

interface CrosswordGameProps {
  words: VocabItem[];
  gradeName: string;
  onUpdateHighScore: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit?: () => void;
  qaMode?: QAMode;
  onChangeQAMode?: (mode: QAMode) => void;
}

export interface CrosswordClue {
  id: string;
  number: number;
  word: string; // Uppercase
  meaning: string;
  englishDef: string;
  partOfSpeech: string;
  direction: 'across' | 'down';
  startRow: number;
  startCol: number;
  length: number;
  vocabId: string;
}

export interface GridCell {
  row: number;
  col: number;
  correctChar: string | null; // Uppercase or null if blocked
  number?: number; // Clue number at start of word
  acrossClueId?: string;
  downClueId?: string;
}

const GRID_SIZE = 9;

// 2-Set Hangul to English QWERTY mapping for seamless typing in Korean IME mode
const KOREAN_KEY_TO_ENGLISH: Record<string, string> = {
  'ㄱ': 'R', 'ㄲ': 'R', 'ㄴ': 'S', 'ㄷ': 'E', 'ㄸ': 'E', 'ㄹ': 'F',
  'ㅁ': 'A', 'ㅂ': 'Q', 'ㅃ': 'Q', 'ㅅ': 'T', 'ㅆ': 'T', 'ㅇ': 'D',
  'ㅈ': 'W', 'ㅉ': 'W', 'ㅊ': 'C', 'ㅋ': 'Z', 'ㅌ': 'X', 'ㅍ': 'V', 'ㅎ': 'G',
  'ㅏ': 'K', 'ㅐ': 'O', 'ㅑ': 'I', 'ㅓ': 'J', 'ㅔ': 'P', 'ㅕ': 'U',
  'ㅗ': 'H', 'ㅒ': 'O', 'ㅖ': 'P', 'ㅛ': 'Y', 'ㅜ': 'N', 'ㅠ': 'B',
  'ㅡ': 'M', 'ㅣ': 'L',
};

export function parseKeyboardChar(e: KeyboardEvent | React.KeyboardEvent): string | null {
  // 1. Check e.code (e.g. 'KeyA' -> 'A') - layout independent
  if (e.code && e.code.startsWith('Key')) {
    const char = e.code.slice(3).toUpperCase();
    if (/^[A-Z]$/.test(char)) return char;
  }

  // 2. Check e.key
  const key = e.key;
  if (/^[a-zA-Z]$/.test(key)) {
    return key.toUpperCase();
  }

  // 3. Check Korean IME key
  if (KOREAN_KEY_TO_ENGLISH[key]) {
    return KOREAN_KEY_TO_ENGLISH[key];
  }

  return null;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export const CrosswordGame: React.FC<CrosswordGameProps> = ({
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

  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [clues, setClues] = useState<CrosswordClue[]>([]);
  const [userInputs, setUserInputs] = useState<string[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [selectedClueId, setSelectedClueId] = useState<string | null>(null);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState<boolean>(() => {
    const saved = localStorage.getItem('wordloop_crossword_show_keyboard');
    return saved === 'true'; // Default to false (접은 상태로 시작)
  });

  useEffect(() => {
    localStorage.setItem('wordloop_crossword_show_keyboard', String(showVirtualKeyboard));
  }, [showVirtualKeyboard]);

  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const keyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [checkResults, setCheckResults] = useState<boolean | null>(null);

  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Trigger visual ripple/highlight feedback on virtual keyboard
  const triggerKeyVisualFeedback = useCallback((keyName: string) => {
    setPressedKey(keyName.toUpperCase());
    if (keyTimerRef.current) {
      clearTimeout(keyTimerRef.current);
    }
    keyTimerRef.current = setTimeout(() => {
      setPressedKey(null);
    }, 220);
  }, []);

  // Helper to format clue based on active Q&A mode
  const getClueText = useCallback((clue: CrosswordClue, mode: QAMode) => {
    if (mode === 'ko_to_en') {
      return clue.meaning;
    }
    if (mode === 'en_def_to_en') {
      return clue.englishDef || clue.meaning;
    }
    // 'en_to_ko': English word + part of speech + Korean meaning hint
    return `${clue.word} [${clue.partOfSpeech}] (뜻: ${clue.meaning})`;
  }, []);

  // Generator function to build a crossword layout
  const generatePuzzle = useCallback(() => {
    setIsPaused(false);
    // Initialize 9x9 grid
    const newGrid: GridCell[][] = Array.from({ length: GRID_SIZE }, (_, r) =>
      Array.from({ length: GRID_SIZE }, (_, c) => ({
        row: r,
        col: c,
        correctChar: null,
      }))
    );

    // Filter valid words (length 3 to 8, alphabetic)
    const candidates = words
      .filter((w) => {
        const cleaned = w.word.trim().toUpperCase();
        return /^[A-Z]+$/.test(cleaned) && cleaned.length >= 3 && cleaned.length <= 8;
      })
      .map((w) => ({
        vocabId: w.id,
        word: w.word.trim().toUpperCase(),
        meaning: getCleanKoreanMeaning(w),
        englishDef: getEnglishDefinition(w),
        partOfSpeech: w.partOfSpeech || 'n.',
      }));

    // Shuffle candidates
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const placedClues: CrosswordClue[] = [];

    if (shuffled.length === 0) {
      setGrid(newGrid);
      setClues([]);
      setUserInputs(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('')));
      return;
    }

    // Attempt placement algorithm
    // 1. Place 1st word horizontally in middle row
    const word1 = shuffled[0];
    const row1 = 4;
    const col1 = Math.max(0, Math.floor((GRID_SIZE - word1.word.length) / 2));

    for (let i = 0; i < word1.word.length; i++) {
      newGrid[row1][col1 + i].correctChar = word1.word[i];
    }

    placedClues.push({
      id: `clue-1`,
      number: 1,
      word: word1.word,
      meaning: word1.meaning,
      englishDef: word1.englishDef,
      partOfSpeech: word1.partOfSpeech,
      direction: 'across',
      startRow: row1,
      startCol: col1,
      length: word1.word.length,
      vocabId: word1.vocabId,
    });

    // Try placing subsequent words by finding intersecting letters
    let nextClueNumber = 2;

    for (let k = 1; k < shuffled.length && placedClues.length < 8; k++) {
      const cand = shuffled[k];
      let placed = false;

      // Try intersecting with already placed words
      for (const existingClue of placedClues) {
        if (placed) break;

        const targetDir: 'across' | 'down' =
          existingClue.direction === 'across' ? 'down' : 'across';

        for (let eIdx = 0; eIdx < existingClue.word.length; eIdx++) {
          if (placed) break;
          const char = existingClue.word[eIdx];

          const eRow =
            existingClue.direction === 'across'
              ? existingClue.startRow
              : existingClue.startRow + eIdx;
          const eCol =
            existingClue.direction === 'across'
              ? existingClue.startCol + eIdx
              : existingClue.startCol;

          // Find matching letter index in cand.word
          for (let cIdx = 0; cIdx < cand.word.length; cIdx++) {
            if (cand.word[cIdx] === char) {
              // Calculate candidate start row & col
              const startR = targetDir === 'down' ? eRow - cIdx : eRow;
              const startC = targetDir === 'across' ? eCol - cIdx : eCol;

              // Check if fits inside boundaries
              if (
                startR >= 0 &&
                startC >= 0 &&
                (targetDir === 'across'
                  ? startC + cand.word.length <= GRID_SIZE
                  : startR + cand.word.length <= GRID_SIZE)
              ) {
                // Check validity (no conflicts with other cells)
                let valid = true;
                for (let i = 0; i < cand.word.length; i++) {
                  const currR = targetDir === 'across' ? startR : startR + i;
                  const currC = targetDir === 'across' ? startC + i : startC;

                  const existingChar = newGrid[currR][currC].correctChar;
                  if (existingChar !== null && existingChar !== cand.word[i]) {
                    valid = false;
                    break;
                  }

                  // Check adjacent parallel cells to avoid touching parallel words
                  if (existingChar === null) {
                    if (targetDir === 'across') {
                      if (
                        (currR > 0 && newGrid[currR - 1][currC].correctChar !== null) ||
                        (currR < GRID_SIZE - 1 && newGrid[currR + 1][currC].correctChar !== null)
                      ) {
                        valid = false;
                        break;
                      }
                    } else {
                      if (
                        (currC > 0 && newGrid[currR][currC - 1].correctChar !== null) ||
                        (currC < GRID_SIZE - 1 && newGrid[currR][currC + 1].correctChar !== null)
                      ) {
                        valid = false;
                        break;
                      }
                    }
                  }
                }

                if (valid) {
                  // Place word
                  for (let i = 0; i < cand.word.length; i++) {
                    const currR = targetDir === 'across' ? startR : startR + i;
                    const currC = targetDir === 'across' ? startC + i : startC;
                    newGrid[currR][currC].correctChar = cand.word[i];
                  }

                  placedClues.push({
                    id: `clue-${nextClueNumber}`,
                    number: nextClueNumber,
                    word: cand.word,
                    meaning: cand.meaning,
                    englishDef: cand.englishDef,
                    partOfSpeech: cand.partOfSpeech,
                    direction: targetDir,
                    startRow: startR,
                    startCol: startC,
                    length: cand.word.length,
                    vocabId: cand.vocabId,
                  });

                  nextClueNumber++;
                  placed = true;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Sort clues and assign cell numbers
    const startMap = new Map<string, { number: number; across?: string; down?: string }>();
    let cellNumCounter = 1;

    // Order clues by start position
    placedClues.sort((a, b) => {
      if (a.startRow !== b.startRow) return a.startRow - b.startRow;
      return a.startCol - b.startCol;
    });

    placedClues.forEach((clue) => {
      const key = `${clue.startRow}-${clue.startCol}`;
      if (!startMap.has(key)) {
        startMap.set(key, { number: cellNumCounter++ });
      }
      const entry = startMap.get(key)!;
      clue.number = entry.number;

      if (clue.direction === 'across') entry.across = clue.id;
      else entry.down = clue.id;
    });

    // Update grid numbers & clue links
    placedClues.forEach((clue) => {
      const startCell = newGrid[clue.startRow][clue.startCol];
      startCell.number = clue.number;

      for (let i = 0; i < clue.length; i++) {
        const r = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
        const c = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
        if (clue.direction === 'across') {
          newGrid[r][c].acrossClueId = clue.id;
        } else {
          newGrid[r][c].downClueId = clue.id;
        }
      }
    });

    setGrid(newGrid);
    setClues(placedClues);
    setUserInputs(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('')));

    // Set initial selection to first clue
    if (placedClues.length > 0) {
      const first = placedClues[0];
      setSelectedCell({ r: first.startRow, c: first.startCol });
      setDirection(first.direction);
      setSelectedClueId(first.id);
    } else {
      setSelectedCell(null);
      setSelectedClueId(null);
    }

    setHintsUsed(0);
    setIsCompleted(false);
    setScore(0);
    setCheckResults(null);
  }, [words]);

  useEffect(() => {
    generatePuzzle();
  }, [generatePuzzle]);

  // Handle cell selection
  const handleCellClick = (r: number, c: number) => {
    if (!grid[r][c].correctChar) return;

    if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
      // Toggle direction if cell has both or switch direction
      const cell = grid[r][c];
      if (cell.acrossClueId && cell.downClueId) {
        const newDir = direction === 'across' ? 'down' : 'across';
        setDirection(newDir);
        setSelectedClueId(newDir === 'across' ? cell.acrossClueId : cell.downClueId);
      }
    } else {
      setSelectedCell({ r, c });
      const cell = grid[r][c];
      if (cell.acrossClueId && direction === 'across') {
        setSelectedClueId(cell.acrossClueId);
      } else if (cell.downClueId && direction === 'down') {
        setSelectedClueId(cell.downClueId);
      } else {
        const availableDir = cell.acrossClueId ? 'across' : 'down';
        setDirection(availableDir);
        setSelectedClueId(availableDir === 'across' ? cell.acrossClueId : cell.downClueId);
      }
    }

    // Focus input
    const key = `${r}-${c}`;
    if (inputRefs.current[key]) {
      inputRefs.current[key]?.focus();
    }
  };

  // Select clue from list
  const handleClueClick = (clue: CrosswordClue) => {
    setSelectedCell({ r: clue.startRow, c: clue.startCol });
    setDirection(clue.direction);
    setSelectedClueId(clue.id);

    // Focus input
    const key = `${clue.startRow}-${clue.startCol}`;
    if (inputRefs.current[key]) {
      inputRefs.current[key]?.focus();
    }
  };

  // Toggle direction manually
  const handleToggleDirection = useCallback(() => {
    triggerKeyVisualFeedback('SPACE');
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const cell = grid[r][c];
    if (cell.acrossClueId && cell.downClueId) {
      const newDir = direction === 'across' ? 'down' : 'across';
      setDirection(newDir);
      setSelectedClueId(newDir === 'across' ? cell.acrossClueId : cell.downClueId);
    } else {
      const newDir = direction === 'across' ? 'down' : 'across';
      setDirection(newDir);
    }
  }, [direction, grid, selectedCell, triggerKeyVisualFeedback]);

  // Move to next cell in active direction
  const moveToNextCell = useCallback((r: number, c: number, dir: 'across' | 'down') => {
    let nextR = r;
    let nextC = c;

    if (dir === 'across') {
      nextC = c + 1;
      while (nextC < GRID_SIZE && !grid[nextR][nextC].correctChar) {
        nextC++;
      }
      if (nextC < GRID_SIZE && grid[nextR][nextC].correctChar) {
        setSelectedCell({ r: nextR, c: nextC });
        inputRefs.current[`${nextR}-${nextC}`]?.focus();
      }
    } else {
      nextR = r + 1;
      while (nextR < GRID_SIZE && !grid[nextR][nextC].correctChar) {
        nextR++;
      }
      if (nextR < GRID_SIZE && grid[nextR][nextC].correctChar) {
        setSelectedCell({ r: nextR, c: nextC });
        inputRefs.current[`${nextR}-${nextC}`]?.focus();
      }
    }
  }, [grid]);

  // Move to previous cell in active direction (optionally clearing target)
  const moveToPrevCell = useCallback((r: number, c: number, dir: 'across' | 'down', clearTarget = false) => {
    let prevR = r;
    let prevC = c;

    if (dir === 'across') {
      prevC = c - 1;
      while (prevC >= 0 && !grid[prevR][prevC].correctChar) {
        prevC--;
      }
      if (prevC >= 0 && grid[prevR][prevC].correctChar) {
        setSelectedCell({ r: prevR, c: prevC });
        if (clearTarget) {
          setUserInputs((prev) => {
            const next = prev.map((rowArr) => [...rowArr]);
            next[prevR][prevC] = '';
            return next;
          });
        }
        inputRefs.current[`${prevR}-${prevC}`]?.focus();
      }
    } else {
      prevR = r - 1;
      while (prevR >= 0 && !grid[prevR][prevC].correctChar) {
        prevR--;
      }
      if (prevR >= 0 && grid[prevR][prevC].correctChar) {
        setSelectedCell({ r: prevR, c: prevC });
        if (clearTarget) {
          setUserInputs((prev) => {
            const next = prev.map((rowArr) => [...rowArr]);
            next[prevR][prevC] = '';
            return next;
          });
        }
        inputRefs.current[`${prevR}-${prevC}`]?.focus();
      }
    }
  }, [grid]);

  // Type a single letter at current cell
  const handleLetterInput = useCallback(
    (char: string) => {
      if (!char || isCompleted || isPaused) return;

      let targetCell = selectedCell;
      if (!targetCell) {
        if (clues.length > 0) {
          targetCell = { r: clues[0].startRow, c: clues[0].startCol };
          setSelectedCell(targetCell);
          setSelectedClueId(clues[0].id);
          setDirection(clues[0].direction);
        } else {
          return;
        }
      }

      const { r, c } = targetCell;
      const uppercaseVal = char.toUpperCase();
      if (!/^[A-Z]$/.test(uppercaseVal)) return;

      triggerKeyVisualFeedback(uppercaseVal);

      setUserInputs((prev) => {
        const next = prev.map((rowArr) => [...rowArr]);
        next[r][c] = uppercaseVal;
        return next;
      });

      speechService.speakOnce(uppercaseVal);
      moveToNextCell(r, c, direction);
    },
    [clues, direction, isCompleted, isPaused, moveToNextCell, selectedCell, triggerKeyVisualFeedback]
  );

  // Backspace / delete logic
  const handleBackspace = useCallback(() => {
    if (isCompleted || isPaused) return;
    triggerKeyVisualFeedback('BACKSPACE');

    let targetCell = selectedCell;
    if (!targetCell) {
      if (clues.length > 0) {
        targetCell = { r: clues[0].startRow, c: clues[0].startCol };
        setSelectedCell(targetCell);
      } else {
        return;
      }
    }

    const { r, c } = targetCell;
    const currentVal = userInputs[r]?.[c];

    if (currentVal) {
      // If current cell has a letter, erase it and keep focus on this cell
      setUserInputs((prev) => {
        const next = prev.map((rowArr) => [...rowArr]);
        next[r][c] = '';
        return next;
      });
    } else {
      // If current cell is already empty, step back to previous cell and erase it
      moveToPrevCell(r, c, direction, true);
    }
  }, [clues, direction, isCompleted, isPaused, moveToPrevCell, selectedCell, triggerKeyVisualFeedback, userInputs]);

  // Clear entire selected word
  const handleClearActiveWord = useCallback(() => {
    const active = clues.find((c) => c.id === selectedClueId);
    if (!active) return;

    setUserInputs((prev) => {
      const next = prev.map((rowArr) => [...rowArr]);
      for (let i = 0; i < active.length; i++) {
        const r = active.direction === 'across' ? active.startRow : active.startRow + i;
        const c = active.direction === 'across' ? active.startCol + i : active.startCol;
        next[r][c] = '';
      }
      return next;
    });

    // Focus start of word
    setSelectedCell({ r: active.startRow, c: active.startCol });
    const key = `${active.startRow}-${active.startCol}`;
    inputRefs.current[key]?.focus();
  }, [clues, selectedClueId]);

  // Clear all grid inputs
  const handleClearAllInputs = useCallback(() => {
    setUserInputs(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('')));
    if (clues.length > 0) {
      setSelectedCell({ r: clues[0].startRow, c: clues[0].startCol });
      setSelectedClueId(clues[0].id);
      setDirection(clues[0].direction);
    }
  }, [clues]);

  // Handle hardware keyboard typing via direct input onChange
  const handleInputChange = (r: number, c: number, value: string) => {
    if (!value) {
      setUserInputs((prev) => {
        const next = prev.map((rowArr) => [...rowArr]);
        next[r][c] = '';
        return next;
      });
      return;
    }

    const lastChar = value.slice(-1);
    const converted = KOREAN_KEY_TO_ENGLISH[lastChar] || lastChar.toUpperCase();

    if (/^[A-Z]$/.test(converted)) {
      triggerKeyVisualFeedback(converted);
      setUserInputs((prev) => {
        const next = prev.map((rowArr) => [...rowArr]);
        next[r][c] = converted;
        return next;
      });
      speechService.speakOnce(converted);
      moveToNextCell(r, c, direction);
    }
  };

  const handleKeyDown = (r: number, c: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const letter = parseKeyboardChar(e);
    if (letter) {
      e.preventDefault();
      triggerKeyVisualFeedback(letter);
      setUserInputs((prev) => {
        const next = prev.map((rowArr) => [...rowArr]);
        next[r][c] = letter;
        return next;
      });
      speechService.speakOnce(letter);
      moveToNextCell(r, c, direction);
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
      return;
    }
    if (e.key === 'Delete') {
      e.preventDefault();
      triggerKeyVisualFeedback('BACKSPACE');
      setUserInputs((prev) => {
        const next = prev.map((rowArr) => [...rowArr]);
        next[r][c] = '';
        return next;
      });
      return;
    }
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      handleToggleDirection();
      return;
    }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = clues.findIndex((clue) => clue.id === selectedClueId);
      const nextIndex = (currentIndex + (e.shiftKey ? -1 + clues.length : 1)) % Math.max(1, clues.length);
      if (clues[nextIndex]) {
        handleClueClick(clues[nextIndex]);
      }
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (c < GRID_SIZE - 1 && grid[r]?.[c + 1]?.correctChar) {
        setSelectedCell({ r, c: c + 1 });
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (c > 0 && grid[r]?.[c - 1]?.correctChar) {
        setSelectedCell({ r, c: c - 1 });
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (r < GRID_SIZE - 1 && grid[r + 1]?.[c]?.correctChar) {
        setSelectedCell({ r: r + 1, c });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (r > 0 && grid[r - 1]?.[c]?.correctChar) {
        setSelectedCell({ r: r - 1, c });
      }
    }
  };

  // Global physical keyboard listener with capture to guarantee flawless typing anywhere in the game
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isCompleted) return;

      // Don't intercept if user is focused inside a visible textarea or non-crossword input
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && !target.classList.contains('crossword-cell-input') && !target.classList.contains('opacity-0')))
      ) {
        return;
      }

      // 1. Check for letter input (English or Korean IME)
      const letter = parseKeyboardChar(e);
      if (letter) {
        e.preventDefault();
        e.stopPropagation();
        triggerKeyVisualFeedback(letter);
        handleLetterInput(letter);
        return;
      }

      // 2. Backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        triggerKeyVisualFeedback('BACKSPACE');
        handleBackspace();
        return;
      }

      // 3. Delete
      if (e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        triggerKeyVisualFeedback('BACKSPACE');
        if (selectedCell) {
          const { r, c } = selectedCell;
          setUserInputs((prev) => {
            const next = prev.map((rowArr) => [...rowArr]);
            next[r][c] = '';
            return next;
          });
        }
        return;
      }

      // 4. Space -> toggle direction
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        triggerKeyVisualFeedback('SPACE');
        handleToggleDirection();
        return;
      }

      // 5. Tab or Enter -> next clue
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const currentIndex = clues.findIndex((c) => c.id === selectedClueId);
        const nextIndex = (currentIndex + (e.shiftKey ? -1 + clues.length : 1)) % Math.max(1, clues.length);
        if (clues[nextIndex]) {
          handleClueClick(clues[nextIndex]);
        }
        return;
      }

      // 6. Arrow navigation
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (selectedCell) {
          const { r, c } = selectedCell;
          if (c < GRID_SIZE - 1 && grid[r]?.[c + 1]?.correctChar) {
            setSelectedCell({ r, c: c + 1 });
          }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (selectedCell) {
          const { r, c } = selectedCell;
          if (c > 0 && grid[r]?.[c - 1]?.correctChar) {
            setSelectedCell({ r, c: c - 1 });
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedCell) {
          const { r, c } = selectedCell;
          if (r < GRID_SIZE - 1 && grid[r + 1]?.[c]?.correctChar) {
            setSelectedCell({ r: r + 1, c });
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedCell) {
          const { r, c } = selectedCell;
          if (r > 0 && grid[r - 1]?.[c]?.correctChar) {
            setSelectedCell({ r: r - 1, c });
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [isPaused, isCompleted, selectedCell, clues, selectedClueId, grid, handleLetterInput, handleBackspace, handleToggleDirection, triggerKeyVisualFeedback]);

  // Hint button: reveal current focused cell
  const handleUseHint = () => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const correctChar = grid[r][c].correctChar;
    if (!correctChar) return;

    if (userInputs[r][c] !== correctChar) {
      const nextInputs = userInputs.map((rowArr) => [...rowArr]);
      nextInputs[r][c] = correctChar;
      setUserInputs(nextInputs);
      setHintsUsed((prev) => prev + 1);
      speechService.speakOnce(correctChar);
      moveToNextCell(r, c, direction);
    }
  };

  // Check complete solution
  const handleCheckAnswers = () => {
    let allCorrect = true;
    let filledCount = 0;
    let totalCells = 0;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c].correctChar) {
          totalCells++;
          if (userInputs[r][c]) filledCount++;
          if (userInputs[r][c] !== grid[r][c].correctChar) {
            allCorrect = false;
          }
        }
      }
    }

    if (filledCount < totalCells) {
      setCheckResults(false);
      return;
    }

    if (allCorrect) {
      const baseScore = clues.length * 50;
      const finalScore = Math.max(100, baseScore - hintsUsed * 10);
      setScore(finalScore);
      setIsCompleted(true);
      setCheckResults(true);
      onUpdateHighScore(finalScore);

      if (onChangeMastery) {
        clues.forEach((c) => onChangeMastery(c.vocabId, 2));
      }
    } else {
      setCheckResults(false);
    }
  };

  // Check if a specific clue is fully correctly filled
  const isClueSolved = (clue: CrosswordClue) => {
    for (let i = 0; i < clue.length; i++) {
      const r = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
      const c = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
      if (userInputs[r]?.[c] !== clue.word[i]) {
        return false;
      }
    }
    return true;
  };

  // Across and Down Clues filter
  const acrossClues = clues.filter((c) => c.direction === 'across');
  const downClues = clues.filter((c) => c.direction === 'down');

  // Currently focused clue
  const activeClue = clues.find((c) => c.id === selectedClueId);
  const [mobileTab, setMobileTab] = useState<'board' | 'clues'>('board');

  return (
    <div className="space-y-1.5 sm:space-y-3 flex-1 flex flex-col justify-start">
      {/* Game Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center justify-between w-full sm:w-auto gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="p-1 sm:p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
              <Grid className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1">
                <span>🔠 크로스워드</span>
                <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[9px] sm:text-[10px] font-extrabold">
                  {gradeName}
                </span>
              </h3>
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">
                총 {clues.length}개 단어
              </p>
            </div>
          </div>

          {/* Mobile View Tab Switcher: Board vs Full Clues */}
          <div className="flex lg:hidden items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setMobileTab('board')}
              className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition-all ${
                mobileTab === 'board'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🧩 퍼즐
            </button>
            <button
              onClick={() => setMobileTab('clues')}
              className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition-all ${
                mobileTab === 'clues'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              📜 힌트({clues.length})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-end">
          <button
            onClick={handleUseHint}
            disabled={!selectedCell || isCompleted}
            className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-[10px] sm:text-xs shadow-sm transition-all flex items-center gap-1 shrink-0"
            title="현재 위치의 한 글자 정답 힌트 보기"
          >
            <Lightbulb className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>힌트 (-10점)</span>
          </button>

          <button
            onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
              showVirtualKeyboard
                ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={showVirtualKeyboard ? '가상 키패드 접기' : '가상 키패드 펼치기'}
          >
            <Keyboard className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{showVirtualKeyboard ? '키패드 접기' : '키패드 펼치기'}</span>
            {showVirtualKeyboard ? (
              <ChevronUp className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
              isPaused
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" /> : <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />}
            <span>{isPaused ? '계속' : '일시정지'}</span>
          </button>

          <button
            onClick={generatePuzzle}
            className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] sm:text-xs transition-all flex items-center gap-1 shrink-0"
            title="새 퍼즐 생성"
          >
            <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">새 퍼즐</span>
          </button>

          <button
            onClick={() => {
              setIsCompleted(true);
              if (onQuit) onQuit();
            }}
            className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-[10px] sm:text-xs transition-all flex items-center gap-1 shrink-0"
            title="게임 종료"
          >
            <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>종료</span>
          </button>
        </div>
      </div>

      {/* Pause Modal Overlay */}
      {isPaused && !isCompleted && (
        <div className="p-8 rounded-3xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white shadow-2xl text-center space-y-5 animate-in fade-in duration-200">
          <div className="inline-flex p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Pause className="w-8 h-8 fill-current" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black">⏸️ 게임 일시 중지</h3>
            <p className="text-xs text-slate-300">잠시 퍼즐 맞추기를 멈추었습니다.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsPaused(false)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>퍼즐 계속 풀기</span>
            </button>
            <button
              onClick={generatePuzzle}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>새 퍼즐 생성</span>
            </button>
            <button
              onClick={() => {
                setIsCompleted(true);
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

      {/* Completion Victory Alert */}
      {isCompleted && (
        <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white shadow-xl animate-in zoom-in-95 duration-300 text-center space-y-2 sm:space-y-3">
          <div className="inline-flex p-2.5 rounded-full bg-white/20 backdrop-blur-md mb-0.5">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-300 animate-bounce" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black">🎉 축하합니다! 퍼즐 완료!</h2>
          <p className="text-xs text-emerald-100 font-medium">
            모든 크로스워드 단어를 완벽하게 맞추셨습니다. (사용한 힌트: {hintsUsed}회)
          </p>
          <div className="text-2xl sm:text-3xl font-black text-yellow-300 drop-shadow-md">
            최종 점수: {score}점
          </div>
          <button
            onClick={generatePuzzle}
            className="mt-1 px-5 py-2.5 rounded-2xl bg-white text-slate-950 font-black text-xs hover:bg-slate-100 transition-all shadow-lg inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>새로운 퍼즐 도전하기</span>
          </button>
        </div>
      )}

      {/* Grid and Clues Main Section */}
      {!isPaused && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-6 items-start flex-1 min-h-0">
          {/* Left Column: Crossword Grid (7 cols on lg, or shown when mobileTab is 'board') */}
          <div
            className={`lg:col-span-7 bg-white dark:bg-slate-900 p-2 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center space-y-1.5 sm:space-y-3 ${
              mobileTab === 'board' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            
            {/* Active Clue Header & Interactive Word Editor Bar */}
            {activeClue ? (
              <div className="w-full p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-slate-50 dark:from-indigo-950/70 dark:via-purple-950/50 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800/80 shadow-sm space-y-1.5 sm:space-y-2">
                {/* Clue Header Line */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-black text-[10px] sm:text-xs shadow-sm flex items-center gap-1">
                      <span>{activeClue.direction === 'across' ? '가로' : '세로'} {activeClue.number}번</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      ({activeClue.length}글자)
                    </span>
                  </div>

                  {/* Word Quick Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => speechService.playItem(`crossword-active-${activeClue.id}`, activeClue.word, undefined, 1)}
                      className="p-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 transition-all border border-indigo-200/60 dark:border-indigo-800"
                      title="발음 듣기"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleToggleDirection}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] sm:text-xs transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                      title="가로/세로 방향 전환 (스페이스바)"
                    >
                      <ArrowLeftRight className="w-3 h-3 text-indigo-500" />
                      <span className="hidden sm:inline">방향</span>
                    </button>
                    <button
                      onClick={handleClearActiveWord}
                      className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-300 font-bold text-[10px] sm:text-xs transition-all border border-rose-200 dark:border-rose-800 flex items-center gap-1"
                      title="현재 단어의 모든 글자 지우기"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="hidden xs:inline">지우기</span>
                    </button>
                  </div>
                </div>

                {/* Clue Prompt */}
                <div className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white leading-tight">
                  힌트: {getClueText(activeClue, activeQAMode)}
                </div>

                {/* Word Letter-by-Letter Slots (Interactive Quick Edit) */}
                <div className="pt-1 border-t border-indigo-200/50 dark:border-indigo-800/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                      ✏️ 단어 철자 수정 바:
                    </span>
                    <button
                      onClick={handleBackspace}
                      className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center gap-1 transition-all"
                      title="한 글자 지우기 (Backspace)"
                    >
                      <BackspaceIcon className="w-3 h-3" />
                      <span>지우기</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                    {Array.from({ length: activeClue.length }).map((_, idx) => {
                      const r = activeClue.direction === 'across' ? activeClue.startRow : activeClue.startRow + idx;
                      const c = activeClue.direction === 'across' ? activeClue.startCol + idx : activeClue.startCol;
                      const isSlotSelected = selectedCell?.r === r && selectedCell?.c === c;
                      const currentVal = userInputs[r]?.[c]?.toUpperCase() || '';
                      const correctChar = grid[r]?.[c]?.correctChar;
                      const isFilled = Boolean(currentVal);
                      const isCorrect = isFilled && currentVal === correctChar;
                      const isWrong = isFilled && currentVal !== correctChar;

                      return (
                        <button
                          key={`active-slot-${idx}`}
                          onClick={() => {
                            setSelectedCell({ r, c });
                            inputRefs.current[`${r}-${c}`]?.focus();
                          }}
                          className={`relative w-7 h-9 sm:w-10 sm:h-11 rounded-lg sm:rounded-xl font-mono font-black text-sm sm:text-base flex items-center justify-center transition-all duration-150 active:scale-95 group ${
                            isSlotSelected
                              ? 'bg-purple-600 text-white ring-2 ring-purple-400/50 shadow-md scale-105 z-10'
                              : isCorrect
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500 shadow-sm'
                              : isWrong
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-2 border-rose-400'
                              : 'bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:border-purple-400'
                          }`}
                          title={`글자 #${idx + 1} 선택 (탭하여 수정)`}
                        >
                          <span>{currentVal || (isSlotSelected ? '?' : '_')}</span>

                          {/* Index number badge */}
                          <span className={`absolute top-0.5 left-0.5 text-[7px] font-bold ${
                            isSlotSelected ? 'text-purple-200' : 'text-slate-400'
                          }`}>
                            {idx + 1}
                          </span>

                          {/* Status icon badge */}
                          {isCorrect && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 text-white text-[7px] font-black flex items-center justify-center shadow">
                              ✓
                            </span>
                          )}
                          {isWrong && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 text-white text-[7px] font-black flex items-center justify-center shadow">
                              ✕
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center font-medium">
                보드의 칸이나 힌트를 클릭하면 문제가 활성화됩니다.
              </div>
            )}

            {/* Progress & Correct Cells Tracker */}
            {(() => {
              const totalPlayableCells = grid.reduce(
                (acc, row) => acc + row.filter((c) => c.correctChar !== null).length,
                0
              );
              const correctCells = grid.reduce(
                (acc, row, r) =>
                  acc +
                  row.filter(
                    (c, colIdx) =>
                      c.correctChar !== null &&
                      userInputs[r]?.[colIdx]?.toUpperCase() === c.correctChar
                  ).length,
                0
              );

              return (
                <div className="w-full flex items-center justify-between gap-1 px-1 text-[10px] sm:text-xs font-extrabold">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 dark:text-slate-400">🎯 퍼즐 일치:</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-black transition-all ${
                        correctCells === totalPlayableCells && totalPlayableCells > 0
                          ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-400/50'
                          : correctCells > 0
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {correctCells}/{totalPlayableCells} ({totalPlayableCells > 0 ? Math.round((correctCells / totalPlayableCells) * 100) : 0}%)
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[11px] font-medium text-slate-400 truncate">
                    💡 초록:✓ | 빨강:✕
                  </span>
                </div>
              );
            })()}

            {/* 9x9 Grid Board */}
            <div className="grid grid-cols-9 gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-inner">
              {grid.map((rowArr, rIdx) =>
                rowArr.map((cell, cIdx) => {
                  const isPlayable = cell.correctChar !== null;
                  const isSelected = selectedCell?.r === rIdx && selectedCell?.c === cIdx;
                  const key = `${rIdx}-${cIdx}`;

                  const userVal = userInputs[rIdx]?.[cIdx]?.toUpperCase() || '';
                  const isFilled = Boolean(userVal);
                  const isCorrect = isPlayable && isFilled && userVal === cell.correctChar;
                  const isWrong = isPlayable && isFilled && userVal !== cell.correctChar;

                  // Check if cell is part of active clue
                  let isClueHighlighted = false;
                  if (activeClue && isPlayable) {
                    if (activeClue.direction === 'across') {
                      isClueHighlighted =
                        rIdx === activeClue.startRow &&
                        cIdx >= activeClue.startCol &&
                        cIdx < activeClue.startCol + activeClue.length;
                    } else {
                      isClueHighlighted =
                        cIdx === activeClue.startCol &&
                        rIdx >= activeClue.startRow &&
                        rIdx < activeClue.startRow + activeClue.length;
                    }
                  }

                  if (!isPlayable) {
                    return (
                      <div
                        key={key}
                        className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-md sm:rounded-xl bg-slate-200/80 dark:bg-slate-900/80 border border-slate-300/40 dark:border-slate-800/40"
                      />
                    );
                  }

                  return (
                    <div
                      key={key}
                      onClick={() => handleCellClick(rIdx, cIdx)}
                      className={`relative w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-md sm:rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-purple-600 text-white ring-2 sm:ring-4 ring-purple-400/50 scale-105 z-10 font-black'
                          : isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-black shadow-sm'
                          : isWrong
                          ? 'bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-400 text-rose-600 dark:text-rose-400 font-black'
                          : isClueHighlighted
                          ? 'bg-purple-100 dark:bg-purple-950/80 border-2 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-200 font-extrabold'
                          : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-purple-400 font-extrabold'
                      }`}
                    >
                      {/* Clue Number Badge */}
                      {cell.number && (
                        <span
                          className={`absolute top-0.5 left-0.5 text-[7px] sm:text-[8px] font-bold leading-none ${
                            isSelected ? 'text-purple-200' : isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {cell.number}
                        </span>
                      )}

                      {/* Checkmark indicator badge for matched letters */}
                      {isCorrect && !isSelected && (
                        <span className="absolute top-0.5 right-0.5 text-[7px] font-black text-emerald-600 dark:text-emerald-400 leading-none">
                          ✓
                        </span>
                      )}

                      {/* Wrong indicator badge */}
                      {isWrong && !isSelected && (
                        <span className="absolute top-0.5 right-0.5 text-[7px] font-black text-rose-500 leading-none">
                          ✕
                        </span>
                      )}

                      {/* Hidden Real Input element */}
                      <input
                        ref={(el) => {
                          inputRefs.current[key] = el;
                        }}
                        type="text"
                        value={userInputs[rIdx]?.[cIdx] || ''}
                        onChange={(e) => handleInputChange(rIdx, cIdx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(rIdx, cIdx, e)}
                        className="crossword-cell-input absolute inset-0 w-full h-full opacity-0 cursor-pointer text-center"
                        disabled={isCompleted}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        autoCapitalize="characters"
                      />

                      {/* Display Character */}
                      <span className="text-xs sm:text-base font-mono font-black uppercase">
                        {userInputs[rIdx][cIdx]}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Collapsible On-Screen Virtual Keyboard (접이식 가상 키패드) */}
            {!isCompleted && (
              <div className="w-full rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200 shadow-sm">
                {/* Collapsible Header Accordion Bar */}
                <div
                  onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
                  className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 cursor-pointer select-none transition-colors"
                  title={showVirtualKeyboard ? '클릭하여 가상 키패드 접기' : '클릭하여 가상 키패드 펼치기'}
                >
                  <div className="flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      가상 키패드
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-black transition-colors ${
                        showVirtualKeyboard
                          ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {showVirtualKeyboard ? '펼침' : '접힘 (공간절약)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {showVirtualKeyboard && (
                      <div
                        className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={handleClearActiveWord}
                          className="text-rose-500 hover:underline flex items-center gap-0.5"
                          title="현재 선택된 단어 글자 지우기"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>단어 지우기</span>
                        </button>
                        <span>|</span>
                        <button
                          onClick={handleClearAllInputs}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-0.5"
                          title="전체 퍼즐 입력 초기화"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>초기화</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                      <span>{showVirtualKeyboard ? '접기' : '펼치기'}</span>
                      {showVirtualKeyboard ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Foldable Keyboard Body */}
                {showVirtualKeyboard && (
                  <div className="p-1.5 sm:p-2.5 pt-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150 border-t border-slate-200 dark:border-slate-700/60">
                    {/* Keyboard Rows */}
                    <div className="space-y-1">
                      {/* Row 1 */}
                      <div className="flex justify-center gap-0.5 sm:gap-1">
                        {KEYBOARD_ROWS[0].map((letter) => {
                          const isPressed = pressedKey === letter;
                          return (
                            <button
                              key={letter}
                              onClick={() => handleLetterInput(letter)}
                              className={`flex-1 max-w-[32px] sm:max-w-[40px] h-7 sm:h-9 rounded-lg font-mono font-black text-xs sm:text-base border shadow-sm transition-all duration-100 flex items-center justify-center select-none ${
                                isPressed
                                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-700 dark:border-indigo-400 ring-2 ring-indigo-400/80 scale-90 shadow-inner z-20'
                                  : 'bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 active:bg-indigo-500 active:text-white text-slate-800 dark:text-white border-slate-300 dark:border-slate-600 active:scale-95'
                              }`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>

                      {/* Row 2 */}
                      <div className="flex justify-center gap-0.5 sm:gap-1 px-1">
                        {KEYBOARD_ROWS[1].map((letter) => {
                          const isPressed = pressedKey === letter;
                          return (
                            <button
                              key={letter}
                              onClick={() => handleLetterInput(letter)}
                              className={`flex-1 max-w-[32px] sm:max-w-[40px] h-7 sm:h-9 rounded-lg font-mono font-black text-xs sm:text-base border shadow-sm transition-all duration-100 flex items-center justify-center select-none ${
                                isPressed
                                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-700 dark:border-indigo-400 ring-2 ring-indigo-400/80 scale-90 shadow-inner z-20'
                                  : 'bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 active:bg-indigo-500 active:text-white text-slate-800 dark:text-white border-slate-300 dark:border-slate-600 active:scale-95'
                              }`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>

                      {/* Row 3 (with Direction & Backspace) */}
                      <div className="flex justify-center gap-0.5 sm:gap-1">
                        {(() => {
                          const isSpacePressed = pressedKey === 'SPACE';
                          return (
                            <button
                              onClick={handleToggleDirection}
                              className={`px-1.5 h-7 sm:h-9 rounded-lg font-bold text-[10px] border shadow-sm transition-all duration-100 flex items-center justify-center gap-0.5 shrink-0 select-none ${
                                isSpacePressed
                                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-700 ring-2 ring-indigo-400/80 scale-90 z-20'
                                  : 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500 active:scale-95'
                              }`}
                              title="방향 전환 (스페이스바)"
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              <span className="hidden sm:inline">방향</span>
                            </button>
                          );
                        })()}

                        {KEYBOARD_ROWS[2].map((letter) => {
                          const isPressed = pressedKey === letter;
                          return (
                            <button
                              key={letter}
                              onClick={() => handleLetterInput(letter)}
                              className={`flex-1 max-w-[32px] sm:max-w-[40px] h-7 sm:h-9 rounded-lg font-mono font-black text-xs sm:text-base border shadow-sm transition-all duration-100 flex items-center justify-center select-none ${
                                isPressed
                                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-700 dark:border-indigo-400 ring-2 ring-indigo-400/80 scale-90 shadow-inner z-20'
                                  : 'bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 active:bg-indigo-500 active:text-white text-slate-800 dark:text-white border-slate-300 dark:border-slate-600 active:scale-95'
                              }`}
                            >
                              {letter}
                            </button>
                          );
                        })}

                        {(() => {
                          const isBackspacePressed = pressedKey === 'BACKSPACE';
                          return (
                            <button
                              onClick={handleBackspace}
                              className={`px-2 h-7 sm:h-9 rounded-lg font-bold text-[10px] border shadow-sm transition-all duration-100 flex items-center justify-center gap-0.5 shrink-0 select-none ${
                                isBackspacePressed
                                  ? 'bg-rose-600 dark:bg-rose-500 text-white border-rose-700 ring-2 ring-rose-400/80 scale-90 shadow-inner z-20'
                                  : 'bg-rose-100 dark:bg-rose-950/80 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 active:scale-95'
                              }`}
                              title="한 글자 지우기 (Backspace)"
                            >
                              <BackspaceIcon className="w-3 h-3" />
                              <span className="hidden sm:inline">지우기</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Controls & Submit button */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                💡 키보드 입력, 가상 키패드, 철자 수정 바를 통해 언제든 답을 자유롭게 수정할 수 있습니다.
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleCheckAnswers}
                  disabled={isCompleted}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>정답 확인하기</span>
                </button>
              </div>
            </div>

            {/* Error Result Toast */}
            {checkResults === false && (
              <div className="w-full p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs text-center font-bold animate-in fade-in">
                ❌ 틀린 부분이 있거나 아직 비어있는 칸이 있습니다. 붉은색(✕) 표시된 칸을 확인하고 수정해 보세요!
              </div>
            )}
          </div>

          {/* Right Column: Clues List (5 cols on lg, or shown when mobileTab is 'clues') */}
          <div
            className={`lg:col-span-5 space-y-4 ${
              mobileTab === 'clues' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Across Clues */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-black">
                  가로 힌트
                </span>
                <span>Across Clues ({acrossClues.length})</span>
              </h4>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {acrossClues.map((clue) => {
                  const isSolved = isClueSolved(clue);
                  const isSelected = selectedClueId === clue.id;

                  return (
                    <div
                      key={clue.id}
                      onClick={() => {
                        handleClueClick(clue);
                        setMobileTab('board');
                      }}
                      className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 text-purple-900 dark:text-purple-200 font-bold shadow-sm'
                          : isSolved
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-black flex items-center justify-center shrink-0">
                          {clue.number}
                        </span>
                        <div>
                          <span className="font-extrabold mr-1.5">{getClueText(clue, activeQAMode)}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({clue.length}자)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isSolved && (
                          <span className="p-1 rounded-full bg-emerald-500 text-slate-950">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speechService.playItem(`crossword-clue-${clue.id}`, clue.word, undefined, 1);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500"
                          title="음성 듣기"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Down Clues */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="px-2 py-0.5 rounded-lg bg-indigo-500 text-white text-[10px] font-black">
                  세로 힌트
                </span>
                <span>Down Clues ({downClues.length})</span>
              </h4>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {downClues.map((clue) => {
                  const isSolved = isClueSolved(clue);
                  const isSelected = selectedClueId === clue.id;

                  return (
                    <div
                      key={clue.id}
                      onClick={() => {
                        handleClueClick(clue);
                        setMobileTab('board');
                      }}
                      className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 text-purple-900 dark:text-purple-200 font-bold shadow-sm'
                          : isSolved
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-black flex items-center justify-center shrink-0">
                          {clue.number}
                        </span>
                        <div>
                          <span className="font-extrabold mr-1.5">{getClueText(clue, activeQAMode)}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({clue.length}자)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isSolved && (
                          <span className="p-1 rounded-full bg-emerald-500 text-slate-950">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speechService.playItem(`crossword-clue-${clue.id}`, clue.word, undefined, 1);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500"
                          title="음성 듣기"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

