import React, { useState, useMemo } from 'react';
import {
  Volume2,
  Mic,
  CheckCircle2,
  X,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { VocabItem } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning } from '../utils/meaningUtils';
import {
  SrsRating,
  previewSrsIntervalLabel,
  calculateNextSrsState,
} from '../services/srsEngineService';
import { recordWordExplored, recordGameDone } from '../services/habitQuestService';
import { confettiService } from '../services/confettiService';

interface FocusRoutinePlayerProps {
  isOpen: boolean;
  queue: VocabItem[];
  allVocab: VocabItem[];
  onClose: () => void;
  onUpdateVocabSrs: (id: string, rating: SrsRating) => void;
  onOpenPronunciation: (word: string) => void;
  onRoutineComplete?: (reviewedCount: number, correctCount: number) => void;
}

type RoutineStep = 'listen' | 'recall' | 'rate';

export const FocusRoutinePlayer: React.FC<FocusRoutinePlayerProps> = ({
  isOpen,
  queue,
  allVocab,
  onClose,
  onUpdateVocabSrs,
  onOpenPronunciation,
  onRoutineComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<RoutineStep>('listen');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentItem = queue[currentIndex];

  // Build 4 deterministic Korean meaning choices for Step 2 recall
  const quizOptions = useMemo(() => {
    if (!currentItem) return [];
    const targetMeaning = getCleanKoreanMeaning(currentItem);
    const distractors: string[] = [];
    const used = new Set<string>([targetMeaning]);

    const pool = allVocab.length > 4 ? allVocab : queue;
    const stepOffset = (currentIndex * 7 + 3) % Math.max(1, pool.length);

    for (let i = 0; i < pool.length && distractors.length < 3; i++) {
      const candidate = pool[(stepOffset + i * 13) % pool.length];
      if (!candidate || candidate.id === currentItem.id) continue;
      const m = getCleanKoreanMeaning(candidate);
      if (m && !used.has(m)) {
        used.add(m);
        distractors.push(m);
      }
    }

    const combined = [targetMeaning, ...distractors];
    // Deterministic shuffle based on word + index
    return combined.sort((a, b) => {
      const ha = (a.charCodeAt(0) + currentIndex) % 17;
      const hb = (b.charCodeAt(0) + currentIndex) % 17;
      return ha - hb;
    });
  }, [currentItem, allVocab, queue, currentIndex]);

  if (!isOpen) return null;

  const handleRestart = () => {
    setCurrentIndex(0);
    setStep('listen');
    setSelectedOption(null);
    setIsCorrect(null);
    setCorrectCount(0);
    setCompleted(false);
  };

  const handleSelectOption = (option: string) => {
    if (selectedOption !== null || !currentItem) return;
    const targetMeaning = getCleanKoreanMeaning(currentItem);
    const matched = option === targetMeaning;
    setSelectedOption(option);
    setIsCorrect(matched);
    if (matched) {
      setCorrectCount((c) => c + 1);
    }
    recordWordExplored();
  };

  const handleRateSrs = (rating: SrsRating) => {
    if (!currentItem) return;
    onUpdateVocabSrs(currentItem.id, rating);

    if (currentIndex + 1 >= queue.length) {
      recordGameDone();
      confettiService.fireSideCannons();
      setCompleted(true);
      if (onRoutineComplete) {
        onRoutineComplete(queue.length, correctCount);
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
      setStep('listen');
      setSelectedOption(null);
      setIsCorrect(null);
    }
  };

  const progressPct = queue.length > 0 ? Math.round(((currentIndex + (completed ? 1 : 0)) / queue.length) * 100) : 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="오늘의 3분 집중 루틴"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Top Focus Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
              오늘의 3분 집중 루틴
            </span>
            {!completed && queue.length > 0 && (
              <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                {currentIndex + 1} / {queue.length}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="루틴 닫기"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thin Linear Progress */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800 w-full">
          <div
            className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {queue.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                현재 학습할 단어가 없습니다.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold cursor-pointer"
              >
                돌아가기
              </button>
            </div>
          ) : completed ? (
            <div className="py-8 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  오늘의 3분 루틴 완료
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  총 <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">{queue.length}</span>개 단어 복습 완료 · 회상 정답{' '}
                  <span className="font-mono-tabular font-semibold text-emerald-600 dark:text-emerald-400">{correctCount}</span>개 · 잔디 불꽃 기록 반영됨
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="min-h-[44px] px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>한 번 더 복습</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>홈으로 돌아가기</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Step Indicator */}
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className={step === 'listen' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''}>
                  1. 듣기 · 의미
                </span>
                <span>·</span>
                <span className={step === 'recall' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''}>
                  2. 4지선다 회상
                </span>
                <span>·</span>
                <span className={step === 'rate' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''}>
                  3. 발음 · SRS 기록
                </span>
              </div>

              {/* Word Header */}
              <div className="text-center space-y-2 py-2">
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {currentItem.word}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                  {[currentItem.ipa, currentItem.partOfSpeech].filter(Boolean).join(' · ')}
                </p>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => speechService.speakOnce(currentItem.word)}
                    className="min-h-[44px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>영단어 듣기</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => speechService.speakOnce(getCleanKoreanMeaning(currentItem), 'ko-KR')}
                    className="min-h-[44px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>한국어 뜻 듣기</span>
                  </button>
                </div>
              </div>

              {/* Step 1: Listen & Example */}
              {step === 'listen' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      {getCleanKoreanMeaning(currentItem)}
                    </p>
                    {currentItem.sentence && (
                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1">
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                          {currentItem.sentence}
                        </p>
                        {currentItem.sentenceMeaning && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {currentItem.sentenceMeaning}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep('recall')}
                    className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>2단계: 기억 확인 퀴즈</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 2: 4-Choice Recall */}
              {step === 'recall' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center">
                    위 단어의 올바른 한국어 뜻을 선택하세요
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {quizOptions.map((opt) => {
                      const target = getCleanKoreanMeaning(currentItem);
                      const isThisTarget = opt === target;
                      const isSelected = selectedOption === opt;
                      let stateStyle =
                        'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 hover:border-indigo-500';
                      if (selectedOption !== null) {
                        if (isThisTarget) {
                          stateStyle =
                            'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';
                        } else if (isSelected) {
                          stateStyle =
                            'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300';
                        } else {
                          stateStyle = 'border-slate-200 dark:border-slate-800 opacity-50';
                        }
                      }

                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={selectedOption !== null}
                          onClick={() => handleSelectOption(opt)}
                          className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-left text-sm font-medium transition-colors cursor-pointer ${stateStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {selectedOption !== null && (
                    <div className="pt-2 space-y-2.5">
                      <p
                        className={`text-xs font-semibold text-center ${
                          isCorrect
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isCorrect ? '정답입니다! 발음 & 기억 간격을 기록하세요.' : `정답: ${getCleanKoreanMeaning(currentItem)}`}
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep('rate')}
                        className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>3단계: 발음 확인 & 복습 주기 설정</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Pronunciation + SM-2 Honest Self-Rating */}
              {step === 'rate' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        원어민 파형 발음 연습 (선택)
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {currentItem.word} 소리 내어 따라 읽어보기
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPronunciation(currentItem.word)}
                      className="min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-xs font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>발음 측정</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center">
                      이 단어의 기억 정도를 선택하면 다음 복습일이 자동 예약됩니다
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { id: 'again', label: '다시', tone: 'hover:border-rose-500 text-rose-600 dark:text-rose-400' },
                          { id: 'hard', label: '어려움', tone: 'hover:border-amber-500 text-amber-600 dark:text-amber-400' },
                          { id: 'good', label: '알겠음', tone: 'hover:border-indigo-500 text-indigo-600 dark:text-indigo-400' },
                          { id: 'easy', label: '완벽함', tone: 'hover:border-emerald-500 text-emerald-600 dark:text-emerald-400' },
                        ] as const
                      ).map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => handleRateSrs(btn.id)}
                          className={`min-h-[52px] p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex flex-col items-center justify-center transition-colors cursor-pointer ${btn.tone}`}
                        >
                          <span className="text-xs font-bold">{btn.label}</span>
                          <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 mt-0.5">
                            {previewSrsIntervalLabel(
                              currentItem.srs,
                              btn.id,
                              currentItem.masteryLevel ?? (currentItem.isLearned ? 2 : 0)
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
