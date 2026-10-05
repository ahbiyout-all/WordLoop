import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  Trophy,
  Flame,
  ArrowRight,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { SentenceItem } from '../../types';
import { speechService } from '../../services/speechService';

interface SentenceTrueFalseGameProps {
  sentences: SentenceItem[];
  gradeName: string;
  onUpdateHighScore?: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit?: () => void;
}

interface QuestionItem {
  sentence: SentenceItem;
  displaySentence: string;
  isCorrectMatch: boolean;
  questionType: 'correct_sentence' | 'wrong_word' | 'different_sentence';
  wrongWord?: string;
  originalWord?: string;
  errorReason?: string;
}

export const SentenceTrueFalseGame: React.FC<SentenceTrueFalseGameProps> = ({
  sentences,
  gradeName,
  onUpdateHighScore,
  onChangeMastery,
  onQuit,
}) => {
  const [shuffledSentences, setShuffledSentences] = useState<SentenceItem[]>(() => {
    const list = sentences.filter((s) => s.text && s.text.trim().length > 0);
    return [...list].sort(() => 0.5 - Math.random());
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const list = sentences.filter((s) => s.text && s.text.trim().length > 0);
    setShuffledSentences([...list].sort(() => 0.5 - Math.random()));
    setCurrentIndex(0);
  }, [sentences]);

  // Generate question deck with 50% true (correct), 50% false (intentional error)
  const currentQuestion: QuestionItem | null = useMemo(() => {
    const s = shuffledSentences[currentIndex];
    if (!s) return null;

    // Alternate or 50% random true/false
    const isTrue = Math.random() >= 0.5;

    if (isTrue || shuffledSentences.length <= 1) {
      return {
        sentence: s,
        displaySentence: s.text,
        isCorrectMatch: true,
        questionType: 'correct_sentence',
        errorReason: '이 문장은 한국어 해석과 문법 및 단어가 완벽히 일치하는 올바른 정상 문장(True)입니다.',
      };
    } else {
      // Create a clear erroneous sentence:
      // Split into word tokens
      const rawTokens = s.text.trim().split(/\s+/);
      const candidates = rawTokens
        .map((token, idx) => {
          const clean = token.replace(/[^a-zA-Z]/g, '');
          return { token, clean, idx };
        })
        .filter((item) => item.clean.length >= 3);

      const otherSentencePool = shuffledSentences.filter((other) => other.id !== s.id);
      const otherSentence =
        otherSentencePool[Math.floor(Math.random() * otherSentencePool.length)] || shuffledSentences[0];

      if (candidates.length > 0 && Math.random() > 0.3) {
        // Strategy A: Replace one keyword with a wrong word from another sentence
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const otherTokens = otherSentence.text
          .trim()
          .split(/\s+/)
          .map((t) => t.replace(/[^a-zA-Z]/g, ''))
          .filter((t) => t.length >= 3 && t.toLowerCase() !== target.clean.toLowerCase());

        const replacementWord =
          otherTokens.length > 0
            ? otherTokens[Math.floor(Math.random() * otherTokens.length)]
            : target.clean.toLowerCase() === 'good'
            ? 'bad'
            : 'wrong';

        // Preserve original casing and punctuation
        const isCapitalized = /^[A-Z]/.test(target.clean);
        const formattedReplacement = isCapitalized
          ? replacementWord.charAt(0).toUpperCase() + replacementWord.slice(1).toLowerCase()
          : replacementWord.toLowerCase();

        const punctuationMatch = target.token.match(/[^a-zA-Z]+$/);
        const suffix = punctuationMatch ? punctuationMatch[0] : '';
        const replacedToken = formattedReplacement + suffix;

        const alteredTokens = [...rawTokens];
        alteredTokens[target.idx] = replacedToken;
        const alteredSentence = alteredTokens.join(' ');

        return {
          sentence: s,
          displaySentence: alteredSentence,
          isCorrectMatch: false,
          questionType: 'wrong_word',
          originalWord: target.clean,
          wrongWord: formattedReplacement,
          errorReason: `원문 단어 '${target.clean}' 자리에 엉뚱한 단어 '${formattedReplacement}'가 들어가 의미가 왜곡되었습니다.`,
        };
      } else {
        // Strategy B: Show completely different sentence
        return {
          sentence: s,
          displaySentence: otherSentence.text,
          isCorrectMatch: false,
          questionType: 'different_sentence',
          errorReason: `제시된 영어 문장은 "${otherSentence.meaning}"을 뜻하는 다른 문장입니다.`,
        };
      }
    }
  }, [currentIndex, shuffledSentences]);

  const handleAnswer = (userChoice: boolean) => {
    if (showResult || !currentQuestion) return;
    setSelectedAnswer(userChoice);
    setShowResult(true);

    const isUserCorrect = userChoice === currentQuestion.isCorrectMatch;

    if (isUserCorrect) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      const points = 15 + nextCombo * 5;
      const nextScore = score + points;
      setScore(nextScore);
      if (onUpdateHighScore) onUpdateHighScore(nextScore);
      if (onChangeMastery) onChangeMastery(currentQuestion.sentence.id, 2);

      // Play original correct sentence audio
      speechService.speakOnce(currentQuestion.sentence.text);
    } else {
      setCombo(0);
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    if (currentIndex + 1 < shuffledSentences.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShuffledSentences((prev) => [...prev].sort(() => 0.5 - Math.random()));
      setCurrentIndex(0);
    }
  };

  const handlePlayAudio = () => {
    if (currentQuestion) {
      speechService.speakOnce(currentQuestion.sentence.text);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="p-8 text-center text-slate-500">
        학습 가능한 문장 데이터가 없습니다.
      </div>
    );
  }

  const isUserCorrect = selectedAnswer === currentQuestion.isCorrectMatch;

  return (
    <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto p-3 sm:p-4 space-y-3 select-none">
      {/* Top Header Stats */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-black text-xs">
            🕵️ 진위 판별 {currentIndex + 1} / {shuffledSentences.length}
          </span>
          <span className="text-xs font-bold text-slate-500">({gradeName})</span>
        </div>

        <div className="flex items-center gap-2">
          {combo > 1 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-black animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{combo} COMBO!</span>
            </div>
          )}
          <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>{score}점</span>
          </div>
        </div>
      </div>

      {/* Target Meaning & English Sentence Display Card */}
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-center">
        {/* Korean Prompt */}
        <div className="space-y-1">
          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 inline-block">
            한국어 해석
          </span>
          <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-relaxed">
            {currentQuestion.sentence.meaning}
          </h3>
        </div>

        {/* Divider */}
        <div className="w-full border-t border-slate-100 dark:border-slate-800" />

        {/* English Sentence Display */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 inline-block">
            제시된 영어 문장
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-relaxed">
            "{currentQuestion.displaySentence}"
          </h2>
        </div>
      </div>

      {/* Result Explanation Card when answered */}
      {showResult && (
        <div
          className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border text-left space-y-3.5 animate-in fade-in zoom-in-95 shadow-sm ${
            isUserCorrect
              ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-800 dark:text-slate-100'
              : 'bg-rose-500/10 border-rose-500/30 text-slate-800 dark:text-slate-100'
          }`}
        >
          {/* Status Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
            <div className="flex items-center gap-2 font-black text-sm sm:text-base">
              {isUserCorrect ? (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>🎉 정답입니다! 정확히 판별하셨습니다.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <XCircle className="w-5 h-5" />
                  <span>❌ 아쉽습니다! 판별이 빗나갔습니다.</span>
                </div>
              )}
            </div>

            {/* User Choice vs Actual Truth Badges */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                내 선택: {selectedAnswer ? '⭕ 일치' : '❌ 오류'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-lg font-black ${
                  currentQuestion.isCorrectMatch
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                }`}
              >
                실제 정답: {currentQuestion.isCorrectMatch ? '⭕ 일치 (True)' : '❌ 오류 (False)'}
              </span>
            </div>
          </div>

          {/* Diagnostic Details */}
          {currentQuestion.isCorrectMatch ? (
            /* CASE 1: The question was already a correct, genuine sentence */
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300/60 dark:border-emerald-700/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-black">
                  🟢 오류 없는 올바른 정상 문장
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                제시된 영어 문장은 한국어 해석과 단어·문법이 100% 일치하는{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">올바른 문장</strong>이었습니다.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                  "{currentQuestion.sentence.text}"
                </span>
                <button
                  onClick={handlePlayAudio}
                  className="p-1 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-300"
                  title="원어민 발음 듣기"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* CASE 2: The question had an intentional error/distractor */
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-300/60 dark:border-rose-700/60 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px] font-black">
                  🔴 오류가 포함된 틀린 문장
                </span>
              </div>

              {/* Side-by-side comparison between displayed error vs genuine sentence */}
              <div className="space-y-1.5 text-xs sm:text-sm font-mono">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2">
                  <span className="text-rose-600 font-bold shrink-0">❌ 제시된 오답 문장:</span>
                  <span className="text-rose-700 dark:text-rose-300 line-through font-bold break-all">
                    "{currentQuestion.displaySentence}"
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">⭕ 올바른 정답 문장:</span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-extrabold break-all">
                      "{currentQuestion.sentence.text}"
                    </span>
                  </div>
                  <button
                    onClick={handlePlayAudio}
                    className="p-1 rounded-full bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-emerald-600 dark:text-emerald-300 shrink-0"
                    title="원어민 발음 듣기"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Error Reason Explainer */}
              {currentQuestion.errorReason && (
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800">
                  💡 {currentQuestion.errorReason}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ⭕ True / ❌ False Action Buttons */}
      {!showResult ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => handleAnswer(true)}
            className="p-4 sm:p-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base sm:text-lg flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <span className="text-2xl sm:text-3xl">⭕</span>
            <span>일치 (True)</span>
            <span className="text-[11px] opacity-80 font-bold">올바른 영어 번역</span>
          </button>

          <button
            onClick={() => handleAnswer(false)}
            className="p-4 sm:p-5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-base sm:text-lg flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
          >
            <span className="text-2xl sm:text-3xl">❌</span>
            <span>불일치/오류 (False)</span>
            <span className="text-[11px] opacity-80 font-bold">틀린 단어/문법 오류</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleNext}
          className="w-full py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 animate-pulse"
        >
          <span>다음 문장 판별 도전</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
