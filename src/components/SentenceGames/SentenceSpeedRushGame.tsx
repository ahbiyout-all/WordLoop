import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Timer,
  Flame,
  Trophy,
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Play,
  Award,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { SentenceItem } from '../../types';
import { speechService } from '../../services/speechService';

interface SentenceSpeedRushGameProps {
  sentences: SentenceItem[];
  gradeName: string;
  onUpdateHighScore?: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit?: () => void;
}

export const SentenceSpeedRushGame: React.FC<SentenceSpeedRushGameProps> = ({
  sentences,
  gradeName,
  onUpdateHighScore,
  onChangeMastery,
  onQuit,
}) => {
  const validSentences = useMemo(() => {
    return sentences.filter((s) => s.text && s.text.trim().length > 0);
  }, [sentences]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledPool, setShuffledPool] = useState<SentenceItem[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and start game
  const startGame = useCallback(() => {
    const pool = [...validSentences].sort(() => 0.5 - Math.random());
    setShuffledPool(pool);
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setWrongCount(0);
    setTimeLeft(30);
    setIsGameOver(false);
    setIsPlaying(true);
    setFeedback(null);
  }, [validSentences]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsPlaying(false);
            setIsGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const currentSentence = shuffledPool[currentIndex] || validSentences[0];

  // Generate 4 multiple choice options
  const options = useMemo(() => {
    if (!currentSentence) return [];
    const correct = currentSentence.text;
    const distractors = validSentences
      .filter((s) => s.id !== currentSentence.id)
      .map((s) => s.text)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    return [correct, ...distractors].sort(() => 0.5 - Math.random());
  }, [currentSentence, validSentences]);

  const handleSelectOption = (chosenText: string) => {
    if (!isPlaying || !currentSentence) return;

    if (chosenText === currentSentence.text) {
      // Correct
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((prev) => Math.max(prev, nextCombo));
      setCorrectCount((prev) => prev + 1);

      const multiplier = Math.min(nextCombo, 5);
      const points = 10 * multiplier;
      const nextScore = score + points;
      setScore(nextScore);
      if (onUpdateHighScore) onUpdateHighScore(nextScore);
      if (onChangeMastery) onChangeMastery(currentSentence.id, 2);

      // +3 seconds bonus every 3 combos
      if (nextCombo % 3 === 0) {
        setTimeLeft((prev) => Math.min(prev + 3, 40));
      }

      setFeedback('correct');
      speechService.speakOnce(currentSentence.text);
    } else {
      // Wrong
      setCombo(0);
      setWrongCount((prev) => prev + 1);
      setTimeLeft((prev) => Math.max(prev - 2, 0));
      setFeedback('wrong');
    }

    setTimeout(() => {
      setFeedback(null);
      if (currentIndex + 1 < shuffledPool.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Reshuffle pool
        setShuffledPool([...validSentences].sort(() => 0.5 - Math.random()));
        setCurrentIndex(0);
      }
    }, 200);
  };

  // Ready Screen before start
  if (!isPlaying && !isGameOver) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shadow-xl shadow-rose-500/10 animate-bounce">
          <Zap className="w-10 h-10 fill-current" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            ⚡ 30초 스피드 문장 완성 퀴즈
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            제시되는 한국어 뜻을 보고 가장 알맞은 영어 문장을 빠르게 고르세요!
            <br />
            <span className="text-rose-500 font-bold">연속 콤보 달성 시 보너스 시간(+3초) & 점수 증폭!</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full space-y-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <div className="flex justify-between">
            <span>대상 어휘군</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-black">{gradeName}</span>
          </div>
          <div className="flex justify-between">
            <span>기본 제한 시간</span>
            <span className="text-rose-500 font-black">30초</span>
          </div>
        </div>

        <button
          onClick={startGame}
          className="w-full py-4 px-6 rounded-2xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-rose-500/25 transition-all transform active:scale-95"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>스피드 게임 시작!</span>
        </button>
      </div>
    );
  }

  // Game Over Screen
  if (isGameOver) {
    const total = correctCount + wrongCount;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-lg mx-auto animate-in zoom-in-95">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-xl shadow-amber-500/10">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            🎉 타임 오버! 게임 종료
          </h2>
          <p className="text-xs text-slate-400 font-medium">놀라운 스피드로 많은 문장을 완성했습니다!</p>
        </div>

        {/* Results Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full space-y-3 shadow-md">
          <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-bold block">최종 획득 점수</span>
            <span className="text-3xl font-black text-amber-500">{score}점</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-400 block font-bold">정답 수</span>
              <span className="text-base font-black text-emerald-500">{correctCount}개</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-400 block font-bold">최대 콤보</span>
              <span className="text-base font-black text-orange-500">{maxCombo}연속</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-400 block font-bold">정답률</span>
              <span className="text-base font-black text-indigo-500">{accuracy}%</span>
            </div>
          </div>
        </div>

        <button
          onClick={startGame}
          className="w-full py-4 px-6 rounded-2xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-rose-500/25 transition-all transform active:scale-95"
        >
          <RotateCcw className="w-5 h-5" />
          <span>다시 도전하기</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto p-3 sm:p-4 space-y-3 select-none">
      {/* Top Header: Timer Bar & Score */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition-colors ${
                timeLeft <= 5
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>{timeLeft}초 남음</span>
            </div>
            {combo > 1 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-black animate-bounce">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{combo} COMBO!</span>
              </div>
            )}
          </div>

          <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>{score}점</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-rose-500 to-amber-500'
            }`}
            style={{ width: `${(timeLeft / 30) * 100}%` }}
          />
        </div>
      </div>

      {/* Target Question Card: Korean Sentence */}
      <div
        className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border text-center space-y-2 shadow-sm transition-all ${
          feedback === 'correct'
            ? 'bg-emerald-500/10 border-emerald-500/50'
            : feedback === 'wrong'
            ? 'bg-rose-500/10 border-rose-500/50'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 inline-block">
          한국어 해석에 맞는 영어 문장을 빠르게 고르세요
        </span>

        <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-relaxed max-w-xl mx-auto">
          {currentSentence.meaning}
        </h2>
      </div>

      {/* 4 English Sentence Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {options.map((opt, idx) => (
          <button
            key={`${opt}-${idx}`}
            onClick={() => handleSelectOption(opt)}
            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 text-slate-900 dark:text-slate-100 font-extrabold text-xs sm:text-sm text-left leading-snug transition-all transform active:scale-98 shadow-sm flex items-start gap-2"
          >
            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <span className="flex-1">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
