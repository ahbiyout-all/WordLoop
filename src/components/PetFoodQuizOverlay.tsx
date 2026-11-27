import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cookie,
  Sparkles,
  Volume2,
  X,
  XCircle,
  ArrowRight,
  Utensils,
} from 'lucide-react';
import { VocabItem } from '../types';
import { DEFAULT_VOCAB } from '../data/defaultVocab';
import { getCleanKoreanMeaning } from '../utils/meaningUtils';
import { speechService } from '../services/speechService';

export interface PetFoodQuizResult {
  correctCount: number;
  totalCount: number;
  feedNow: boolean;
}

interface PetFoodQuizOverlayProps {
  isOpen: boolean;
  petName: string;
  petFullness: number;
  vocabList: VocabItem[];
  onClose: () => void;
  onFinishQuiz: (result: PetFoodQuizResult) => void;
}

interface QuizQuestion {
  item: VocabItem;
  correctMeaning: string;
  options: string[];
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildFoodQuizQuestions(vocabList: VocabItem[], count = 3): QuizQuestion[] {
  const seenWords = new Set<string>();
  const combined: VocabItem[] = [];

  for (const item of vocabList) {
    const key = (item.word || '').trim().toLowerCase();
    if (!key || seenWords.has(key)) continue;
    const meaning = getCleanKoreanMeaning(item);
    if (!meaning) continue;
    seenWords.add(key);
    combined.push(item);
  }

  if (combined.length < 16) {
    for (const item of DEFAULT_VOCAB) {
      const key = (item.word || '').trim().toLowerCase();
      if (!key || seenWords.has(key)) continue;
      const meaning = getCleanKoreanMeaning(item);
      if (!meaning) continue;
      seenWords.add(key);
      combined.push(item);
      if (combined.length >= 40) break;
    }
  }

  const priorityPool = combined.filter((v) => (v.masteryLevel ?? 0) < 2);
  const secondaryPool = combined.filter((v) => (v.masteryLevel ?? 0) >= 2);
  const orderedCandidates = [
    ...shuffleArray(priorityPool),
    ...shuffleArray(secondaryPool),
  ].slice(0, count);

  const allMeanings = Array.from(
    new Set(
      combined
        .map((v) => getCleanKoreanMeaning(v))
        .filter((m) => m.trim().length > 0)
    )
  );

  return orderedCandidates.map((item) => {
    const correctMeaning = getCleanKoreanMeaning(item);
    const distractors = shuffleArray(
      allMeanings.filter((m) => m !== correctMeaning)
    ).slice(0, 3);
    const options = shuffleArray([correctMeaning, ...distractors]);
    return {
      item,
      correctMeaning,
      options,
    };
  });
}

export const PetFoodQuizOverlay: React.FC<PetFoodQuizOverlayProps> = ({
  isOpen,
  petName,
  petFullness,
  vocabList,
  onClose,
  onFinishQuiz,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setQuestions(buildFoodQuizQuestions(vocabList, 3));
    setCurrentIndex(0);
    setSelectedOption(null);
    setCorrectCount(0);
    setIsCompleted(false);
  }, [isOpen, vocabList]);

  if (!isOpen || questions.length === 0) return null;

  const currentQ = questions[currentIndex];
  const totalCount = questions.length;
  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === currentQ?.correctMeaning;

  const isPerfect = correctCount >= totalCount;
  const snacksPreview = Math.max(1, correctCount + (isPerfect ? 1 : 0));
  const restorePreview = Math.min(100 - petFullness, 20 + correctCount * 8);

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    if (option === currentQ.correctMeaning) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= totalCount) {
      setIsCompleted(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
    }
  };

  return (
    <div
      className="absolute inset-0 z-40 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-food-quiz-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
      >
        <header className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Cookie className="w-4 h-4 text-amber-500 shrink-0" />
            <h3
              id="pet-food-quiz-title"
              className="font-display text-sm font-bold text-slate-900 dark:text-white truncate"
            >
              Earn Food · 빠른 단어 간식 퀴즈
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="먹이 퀴즈 닫기"
            className="min-w-[36px] min-h-[36px] rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {!isCompleted ? (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Progress Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono-tabular tabular-nums text-slate-500 dark:text-slate-400">
                <span>
                  문제 {currentIndex + 1} / {totalCount}
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  정답 {correctCount}개
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      ((currentIndex + (isAnswered ? 1 : 0)) / totalCount) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Word Prompt */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  알맞은 한국어 뜻을 선택하세요
                </div>
                <div className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight break-words">
                  {currentQ.item.word}
                </div>
                {(currentQ.item.ipa || currentQ.item.partOfSpeech) && (
                  <div className="mt-1 text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                    {[currentQ.item.ipa, currentQ.item.partOfSpeech]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => speechService.speakOnce(currentQ.item.word)}
                aria-label={`${currentQ.item.word} 발음 듣기`}
                className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Options */}
            <div className="space-y-2">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isRightOption = option === currentQ.correctMeaning;

                let btnStyle =
                  'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-slate-800';
                if (isAnswered) {
                  if (isRightOption) {
                    btnStyle =
                      'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200';
                  } else if (isSelected) {
                    btnStyle =
                      'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200';
                  } else {
                    btnStyle =
                      'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-70';
                  }
                }

                return (
                  <button
                    key={`${currentIndex}-${idx}`}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(option)}
                    className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 transition-colors ${
                      isAnswered ? 'cursor-default' : 'cursor-pointer'
                    } ${btnStyle}`}
                  >
                    <span className="leading-snug">{option}</span>
                    {isAnswered && isRightOption && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isRightOption && (
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instant Feedback & Next */}
            {isAnswered && (
              <div className="pt-1 space-y-3">
                <div
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    isCorrect
                      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
                      : 'border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {isCorrect
                    ? '정답이에요! 단어 간식이 쌓이고 있어요.'
                    : `아쉬워요! 정답은 "${currentQ.correctMeaning}" 입니다.`}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full min-h-[48px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>
                    {currentIndex + 1 >= totalCount ? '결과 및 먹이 받기' : '다음 문제'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
                {isPerfect ? '만점! 완벽한 단어 기억력!' : '단어 간식 퀴즈 완료!'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {totalCount}문제 중{' '}
                <span className="font-mono-tabular font-bold text-indigo-600 dark:text-indigo-400">
                  {correctCount}개
                </span>
                를 맞혀 {petName}의 먹이를 준비했어요.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 grid grid-cols-2 gap-3 text-left">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">획득 간식</div>
                <div className="text-sm font-mono-tabular font-bold text-amber-600 dark:text-amber-400">
                  +{snacksPreview}개 {isPerfect ? '(보너스 +1)' : ''}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">바로 먹일 시 Hunger</div>
                <div className="text-sm font-mono-tabular font-bold text-emerald-600 dark:text-emerald-400">
                  {petFullness}% → {Math.min(100, petFullness + Math.max(0, restorePreview))}%
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  onFinishQuiz({
                    correctCount,
                    totalCount,
                    feedNow: true,
                  })
                }
                className="w-full min-h-[48px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Utensils className="w-4 h-4" />
                <span>바로 먹여서 Hunger 채우기</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onFinishQuiz({
                    correctCount,
                    totalCount,
                    feedNow: false,
                  })
                }
                className="w-full min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                간식만 가방에 저장하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
