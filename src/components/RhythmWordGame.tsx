import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Music,
  Sparkles,
  RotateCcw,
  Volume2,
  Trophy,
  Flame,
  Zap,
  Play,
  Pause,
  LogOut,
  VolumeX,
  Radio
} from 'lucide-react';
import { VocabItem, QAMode } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning, getEnglishDefinition, QA_MODES_CONFIG } from '../utils/meaningUtils';
import { QAModeSelector } from './QAModeSelector';

interface RhythmWordGameProps {
  words: VocabItem[];
  gradeName: string;
  onUpdateHighScore: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit?: () => void;
  qaMode?: QAMode;
  onChangeQAMode?: (mode: QAMode) => void;
}

interface Note {
  id: string;
  lane: number; // 0, 1, 2, 3
  y: number; // percentage 0% ~ 100% (hit line is at ~82%)
  vocab: VocabItem;
  displayText: string; // word or meaning
  isCorrectOption: boolean; // if this note matches current target
  hitState?: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS' | null;
}

const LANES = [
  { id: 0, key: 'A', color: 'from-pink-500 to-rose-600', borderColor: 'border-pink-500', bg: 'bg-pink-500/20' },
  { id: 1, key: 'S', color: 'from-sky-500 to-blue-600', borderColor: 'border-sky-500', bg: 'bg-sky-500/20' },
  { id: 2, key: 'D', color: 'from-amber-400 to-yellow-500', borderColor: 'border-amber-400', bg: 'bg-amber-400/20' },
  { id: 3, key: 'F', color: 'from-emerald-400 to-teal-500', borderColor: 'border-emerald-500', bg: 'bg-emerald-500/20' },
];

const TARGET_HIT_Y = 82; // Hit zone percentage from top
const HIT_TOLERANCE = 12; // +/- range for a valid hit

export const RhythmWordGame: React.FC<RhythmWordGameProps> = ({
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
  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [lastJudgment, setLastJudgment] = useState<{ text: string; color: string; id: number } | null>(null);
  const [activeLanePress, setActiveLanePress] = useState<boolean[]>([false, false, false, false]);

  const animRef = useRef<number | null>(null);
  const lastSpawnTime = useRef<number>(0);

  const currentTarget = wordList[targetIndex];

  // Synthesize rhythmic Web Audio synth beat clicks
  const playBeatClick = useCallback((freq = 440, type: OscillatorType = 'sine', duration = 0.08) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio fallback
    }
  }, []);

  // Initialize Rhythm Session
  const initGame = useCallback(() => {
    if (words.length === 0) return;
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 15);
    setWordList(shuffled);
    setTargetIndex(0);
    setNotes([]);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setIsGameOver(false);
    setIsPaused(false);
    setIsGameStarted(true);
    setLastJudgment(null);
  }, [words]);

  // Target word audio output on change
  useEffect(() => {
    if (isGameStarted && currentTarget && !isGameOver) {
      speechService.playItem(`rhythm-target-${currentTarget.id}`, currentTarget.word, undefined, 1);
    }
  }, [currentTarget, isGameOver, isGameStarted]);

  // Spawn notes periodically
  const spawnNote = useCallback(() => {
    if (!currentTarget || words.length < 2) return;

    const lane = Math.floor(Math.random() * 4);
    const isCorrectOption = Math.random() < 0.45; // 45% chance correct note

    let displayText = '';

    if (activeQAMode === 'ko_to_en' || activeQAMode === 'en_def_to_en') {
      // Notes should contain English words
      if (isCorrectOption) {
        displayText = currentTarget.word;
      } else {
        const wrongCandidates = words.filter(
          (w) => w.word.toLowerCase() !== currentTarget.word.toLowerCase()
        );
        if (wrongCandidates.length > 0) {
          const randomWrong = wrongCandidates[Math.floor(Math.random() * wrongCandidates.length)];
          displayText = randomWrong.word;
        } else {
          displayText = currentTarget.word;
        }
      }
    } else {
      // en_to_ko: Notes should contain Korean meanings
      if (isCorrectOption) {
        displayText = getCleanKoreanMeaning(currentTarget);
      } else {
        const wrongCandidates = words.filter(
          (w) => getCleanKoreanMeaning(w) !== getCleanKoreanMeaning(currentTarget)
        );
        if (wrongCandidates.length > 0) {
          const randomWrong = wrongCandidates[Math.floor(Math.random() * wrongCandidates.length)];
          displayText = getCleanKoreanMeaning(randomWrong);
        } else {
          displayText = getCleanKoreanMeaning(currentTarget);
        }
      }
    }

    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random()}`,
      lane,
      y: -10, // Start above top
      vocab: currentTarget,
      displayText,
      isCorrectOption,
    };

    setNotes((prev) => [...prev, newNote]);
  }, [currentTarget, words, activeQAMode]);

  // Rhythm Game Main Animation Loop
  useEffect(() => {
    if (!isGameStarted || isGameOver || isPaused) return;

    const speed = 0.5; // Note fall speed % per frame

    const updateFrame = (time: number) => {
      // Spawn new note every ~1.2 seconds
      if (time - lastSpawnTime.current > 1200) {
        spawnNote();
        lastSpawnTime.current = time;
      }

      let hasMissed = false;
      setNotes((prevNotes) => {
        let missedCount = 0;
        const nextNotes: Note[] = [];

        for (const note of prevNotes) {
          const nextY = note.y + speed;

          // Check miss (fallen past bottom line without being hit)
          if (nextY > 95) {
            if (note.isCorrectOption && !note.hitState) {
              missedCount++;
            }
            continue; // Remove note
          }

          nextNotes.push({ ...note, y: nextY });
        }

        if (missedCount > 0) {
          hasMissed = true;
        }

        return nextNotes;
      });

      if (hasMissed) {
        setCombo(0);
        setLastJudgment({ text: 'MISS!', color: 'text-rose-500', id: Date.now() });
      }

      animRef.current = requestAnimationFrame(updateFrame);
    };

    animRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isGameOver, isGameStarted, isPaused, spawnNote]);

  // Process Lane Hit Action (A, S, D, F or Touch)
  const handleLaneHit = useCallback(
    (laneIndex: number) => {
      if (isGameOver || !isGameStarted || isPaused) return;

      // Visual touch feedback
      setActiveLanePress((prev) => {
        const updated = [...prev];
        updated[laneIndex] = true;
        return updated;
      });
      setTimeout(() => {
        setActiveLanePress((prev) => {
          const updated = [...prev];
          updated[laneIndex] = false;
          return updated;
        });
      }, 120);

      // Find lowest note in clicked lane that is within hit window
      const laneNotes = notes.filter((n) => n.lane === laneIndex && !n.hitState);
      if (laneNotes.length === 0) {
        // Empty lane hit penalty
        playBeatClick(180, 'sawtooth', 0.05);
        return;
      }

      // Closest note to hit line
      const targetNote = laneNotes.reduce((closest, curr) => {
        return Math.abs(curr.y - TARGET_HIT_Y) < Math.abs(closest.y - TARGET_HIT_Y) ? curr : closest;
      }, laneNotes[0]);

      const dist = Math.abs(targetNote.y - TARGET_HIT_Y);

      if (dist <= HIT_TOLERANCE) {
        // Within hit range!
        setNotes((prev) => prev.filter((n) => n.id !== targetNote.id));

        if (targetNote.isCorrectOption) {
          // Correct note hit!
          let points = 100;
          let judgmentText = 'GOOD!';
          let judgmentColor = 'text-amber-400';

          if (dist <= 4) {
            points = 250;
            judgmentText = 'PERFECT!!';
            judgmentColor = 'text-emerald-400 font-black scale-125';
            playBeatClick(880, 'sine', 0.12);
          } else if (dist <= 8) {
            points = 180;
            judgmentText = 'GREAT!';
            judgmentColor = 'text-sky-400 font-extrabold';
            playBeatClick(660, 'sine', 0.1);
          } else {
            playBeatClick(520, 'sine', 0.08);
          }

          const nextCombo = combo + 1;
          setCombo(nextCombo);
          if (nextCombo > maxCombo) setMaxCombo(nextCombo);

          const comboBonus = Math.floor(nextCombo * 15);
          const newScore = score + points + comboBonus;
          setScore(newScore);
          setLastJudgment({ text: `${judgmentText} +${points + comboBonus}`, color: judgmentColor, id: Date.now() });

          if (onChangeMastery && currentTarget) {
            onChangeMastery(currentTarget.id, 2);
          }

          // Move to next target word after 3 correct hits or combo milestones
          if (nextCombo % 3 === 0) {
            const nextIdx = targetIndex + 1;
            if (nextIdx >= wordList.length) {
              setIsGameOver(true);
              onUpdateHighScore(newScore);
            } else {
              setTargetIndex(nextIdx);
            }
          }
        } else {
          // Hit a wrong note!
          playBeatClick(150, 'sawtooth', 0.15);
          setCombo(0);
          setScore((prev) => Math.max(0, prev - 30));
          setLastJudgment({ text: 'WRONG NOTE!', color: 'text-rose-500', id: Date.now() });
        }
      } else {
        // Too early or too late
        playBeatClick(200, 'triangle', 0.05);
      }
    },
    [combo, currentTarget, isGameOver, isGameStarted, maxCombo, notes, onChangeMastery, onUpdateHighScore, playBeatClick, score, targetIndex, wordList.length]
  );

  // Keyboard controls listener (A, S, D, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyUpper = e.key.toUpperCase();
      const laneIdx = LANES.findIndex((l) => l.key === keyUpper);
      if (laneIdx !== -1) {
        handleLaneHit(laneIdx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLaneHit]);

  return (
    <div className="space-y-1.5 sm:space-y-3 max-w-4xl mx-auto flex-1 flex flex-col justify-start min-h-0">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Music className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🎵 리듬 노트</span>
                <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[9px] sm:text-[10px] font-extrabold">
                  {gradeName}
                </span>
              </h3>
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">
                판정선에서 알맞은 노트를 탭하세요!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:hidden">
            <div className="px-2 py-0.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-[10px] font-black flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              <span>{score}점</span>
            </div>
            {combo > 1 && (
              <div className="px-1.5 py-0.5 rounded-xl bg-purple-500 text-white font-black text-[9px] flex items-center gap-0.5 shadow-sm animate-bounce">
                <Flame className="w-3 h-3 fill-current text-yellow-300" />
                <span>{combo}x</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-end">
          <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-black items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>{score}점</span>
          </div>

          {combo > 1 && (
            <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-purple-500 text-white font-black text-xs items-center gap-1 shadow-md animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-current text-yellow-300" />
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
            <p className="text-xs text-slate-300">리듬 플레이를 잠시 멈추었습니다.</p>
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

      {/* Start or Game Over Screen */}
      {!isGameStarted ? (
        <div className="p-10 rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 text-white text-center space-y-4 shadow-xl">
          <div className="inline-flex p-4 rounded-3xl bg-white/20 backdrop-blur-md">
            <Music className="w-12 h-12 text-yellow-300 animate-bounce" />
          </div>
          <h2 className="text-3xl font-black">🎵 비트 타임어택 리듬 게임</h2>
          <p className="text-sm text-purple-100 max-w-md mx-auto">
            내려오는 리듬 노트 중 <strong>현재 목표 단어의 진짜 한국어 뜻</strong>이 판정선에 맞닿는 순간 해당 트랙을 탭하세요!
          </p>
          <button
            onClick={initGame}
            className="px-8 py-3.5 rounded-2xl bg-white text-purple-950 font-black text-sm hover:bg-slate-100 transition-all shadow-lg inline-flex items-center gap-2 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current text-purple-600" />
            <span>비트 연주 시작하기</span>
          </button>
        </div>
      ) : isGameOver ? (
        <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-300">
          <div className="inline-flex p-3 rounded-full bg-white/20 backdrop-blur-md">
            <Trophy className="w-12 h-12 text-yellow-300 animate-bounce" />
          </div>
          <h2 className="text-3xl font-black">🎶 리듬 스테이지 클리어!</h2>
          <p className="text-sm text-purple-100 font-medium">
            최대 {maxCombo}연속 콤보를 달성하셨습니다!
          </p>
          <div className="text-4xl font-black text-yellow-300 drop-shadow-md">
            최종 점수: {score}점
          </div>
          <button
            onClick={initGame}
            className="mt-2 px-8 py-3.5 rounded-2xl bg-white text-slate-950 font-black text-sm hover:bg-slate-100 transition-all shadow-lg inline-flex items-center gap-2 active:scale-95"
          >
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>다시 연주하기</span>
          </button>
        </div>
      ) : !isPaused ? (
        /* Active Rhythm Stage Arena */
        <div className="flex-1 flex flex-col justify-between space-y-1 sm:space-y-2.5 min-h-0">
          {/* Target Word Prompt Header */}
          <div className="bg-slate-900 p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-800 shadow-md text-center space-y-0.5 shrink-0">
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-slate-400">
              <span>목표 ({targetIndex + 1} / {wordList.length})</span>
              <button
                onClick={() => speechService.playItem(`rhythm-target-${currentTarget.id}`, currentTarget.word, undefined, 1)}
                className="px-2 py-0.5 rounded-xl bg-purple-950/80 text-purple-300 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 border border-purple-800/50"
              >
                <Volume2 className="w-3 h-3" />
                <span>듣기</span>
              </button>
            </div>

            {activeQAMode === 'ko_to_en' ? (
              <>
                <div className="text-base sm:text-2xl font-black text-yellow-400 tracking-wide leading-tight truncate">
                  "{getCleanKoreanMeaning(currentTarget)}"
                </div>
                <p className="text-[9px] sm:text-xs text-purple-300 font-mono truncate">
                  [{currentTarget?.partOfSpeech || '단어'}] 알맞은 영단어 노트를 판정선에서 탭!
                </p>
              </>
            ) : activeQAMode === 'en_def_to_en' ? (
              <>
                <div className="text-sm sm:text-xl font-black text-yellow-400 tracking-wide px-1 leading-tight truncate">
                  "{getEnglishDefinition(currentTarget)}"
                </div>
                <p className="text-[9px] sm:text-xs text-purple-300 font-mono truncate">
                  [{currentTarget?.partOfSpeech || 'n.'}] 알맞은 영단어 노트를 탭!
                </p>
              </>
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-black text-yellow-400 tracking-wide leading-tight truncate">
                  {currentTarget?.word}
                </div>
                <p className="text-[9px] sm:text-xs text-purple-300 font-mono truncate">
                  [{currentTarget?.ipa || currentTarget?.partOfSpeech || '단어'}] 알맞은 한국어 뜻 노트를 탭!
                </p>
              </>
            )}
          </div>

          {/* Rhythm Track Lane Highway Stage */}
          <div className="relative w-full flex-1 min-h-[180px] bg-slate-950 rounded-2xl sm:rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between select-none touch-none">
            {/* Background Neon Grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20 pointer-events-none" />

            {/* Judgment Text Effect Banner */}
            {lastJudgment && (
              <div
                key={lastJudgment.id}
                className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-lg sm:text-2xl font-black drop-shadow-md animate-bounce z-20 ${lastJudgment.color}`}
              >
                {lastJudgment.text}
              </div>
            )}

            {/* 4 Lanes Container */}
            <div className="relative w-full h-full grid grid-cols-4 divide-x divide-slate-800/80">
              {LANES.map((lane) => (
                <div
                  key={lane.id}
                  className={`relative w-full h-full transition-colors ${
                    activeLanePress[lane.id] ? lane.bg : ''
                  }`}
                >
                  {/* Key Label at top */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-[8px] sm:text-[10px] font-mono text-slate-400 font-bold">
                    [{lane.key}]
                  </div>
                </div>
              ))}

              {/* Falling Notes */}
              {notes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    left: `${note.lane * 25}%`,
                    top: `${note.y}%`,
                    width: '25%',
                  }}
                  className="absolute p-0.5 sm:p-1 transition-transform pointer-events-none z-10"
                >
                  <div
                    className={`w-full py-1 sm:py-2 px-1 rounded-lg sm:rounded-xl bg-gradient-to-r ${
                      LANES[note.lane].color
                    } text-white font-black text-[10px] sm:text-xs text-center shadow-md border border-white/40 backdrop-blur-md truncate`}
                  >
                    <span>{note.displayText}</span>
                  </div>
                </div>
              ))}

              {/* Hit Judgment Line (Horizontal Glow Bar) */}
              <div
                style={{ top: `${TARGET_HIT_Y}%` }}
                className="absolute inset-x-0 h-2 sm:h-2.5 -translate-y-1/2 bg-gradient-to-r from-purple-500 via-yellow-400 to-pink-500 opacity-90 shadow-[0_0_15px_rgba(234,179,8,0.8)] pointer-events-none z-10 flex items-center justify-between px-2"
              >
                <span className="text-[7px] sm:text-[9px] font-mono text-slate-950 font-black">HIT</span>
                <span className="text-[7px] sm:text-[9px] font-mono text-slate-950 font-black">HIT</span>
              </div>
            </div>

            {/* Bottom Touch Control Buttons (A, S, D, F) */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 border-t border-slate-800 z-20 shrink-0">
              {LANES.map((lane) => (
                <button
                  key={`btn-${lane.id}`}
                  onPointerDown={() => handleLaneHit(lane.id)}
                  className={`py-1.5 sm:py-3 rounded-lg sm:rounded-xl font-black text-[11px] sm:text-sm flex flex-col items-center justify-center transition-all active:scale-95 border ${
                    activeLanePress[lane.id]
                      ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-lg scale-95'
                      : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-[9px] sm:text-xs font-mono font-bold text-slate-400">[{lane.key}]</span>
                  <span className="text-[10px] sm:text-xs font-bold">트랙 {lane.id + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
