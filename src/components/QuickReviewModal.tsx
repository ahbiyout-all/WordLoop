import React, { useState, useMemo } from 'react';
import {
  Zap,
  Volume2,
  CheckCircle2,
  RotateCcw,
  X,
  Sparkles,
  ArrowRight,
  Brain,
  Check,
  Mic,
  Flame,
  Shuffle,
  Trophy,
} from 'lucide-react';
import { VocabItem } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning } from '../utils/meaningUtils';
import { confettiService } from '../services/confettiService';

interface QuickReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabList: VocabItem[];
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onStartPronunciation?: (word: string) => void;
}

export const QuickReviewModal: React.FC<QuickReviewModalProps> = ({
  isOpen,
  onClose,
  vocabList,
  onChangeMastery,
  onStartPronunciation,
}) => {
  // Filter words that have a masteryLevel of 0 (unlearned)
  const unlearnedWords = useMemo(() => {
    return vocabList.filter((v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) === 0);
  }, [vocabList]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMeaningRevealed, setIsMeaningRevealed] = useState<boolean>(false);
  const [reviewedCount, setReviewedCount] = useState<number>(0);

  if (!isOpen) return null;

  const currentItem = unlearnedWords[currentIndex] || null;
  const isDeckComplete = unlearnedWords.length === 0 || currentIndex >= unlearnedWords.length;

  const handleNext = () => {
    setIsMeaningRevealed(false);
    if (currentIndex + 1 < unlearnedWords.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed the deck!
      confettiService.fireGoldenStars();
      setCurrentIndex(unlearnedWords.length);
    }
  };

  const handleMarkMastered = () => {
    if (!currentItem) return;
    if (onChangeMastery) {
      onChangeMastery(currentItem.id, 2);
    }
    setReviewedCount((prev) => prev + 1);
    confettiService.fire({ particleCount: 25, spread: 50 });
    handleNext();
  };

  const handleMarkLearning = () => {
    if (!currentItem) return;
    if (onChangeMastery) {
      onChangeMastery(currentItem.id, 1);
    }
    setReviewedCount((prev) => prev + 1);
    handleNext();
  };

  const handleResetSession = () => {
    setCurrentIndex(0);
    setIsMeaningRevealed(false);
    setReviewedCount(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-auto flex flex-col space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-amber-500/25 shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Quick Review 쾌속 복습
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  미암기 어휘 ({unlearnedWords.length}개)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                masteryLevel 0단계 취약 어휘만을 빠르게 집중 암기하는 세션입니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deck Completed / Zero State */}
        {isDeckComplete ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-white flex items-center justify-center text-4xl shadow-xl shadow-emerald-500/30 animate-bounce">
              🎉
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">
                축하합니다! 미암기 어휘 복습 완료!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                현재 등록된 미암기(0단계) 어휘를 모두 점검했습니다. {reviewedCount > 0 ? `이번 세션에서 ${reviewedCount}개 단어가 승급했습니다.` : ''}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={handleResetSession}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>처음부터 다시 복습</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
              >
                대시보드로 돌아가기
              </button>
            </div>
          </div>
        ) : (
          /* Active Rapid-Fire Flashcard Card */
          <div className="space-y-5">
            {/* Progress Bar & Index */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-amber-500">
                <Flame className="w-4 h-4 fill-current" />
                <span>미암기 단어 {currentIndex + 1} / {unlearnedWords.length}</span>
              </span>
              <span className="font-mono">{Math.round(((currentIndex + 1) / unlearnedWords.length) * 100)}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / unlearnedWords.length) * 100}%` }}
              />
            </div>

            {/* Flashcard Main Surface */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl space-y-4 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                    {currentItem.word}
                  </span>
                  <button
                    onClick={() => speechService.speakOnce(currentItem.word)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 transition-colors cursor-pointer"
                    title="원어민 표준 발음 듣기"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                {currentItem.ipa && (
                  <p className="text-xs text-slate-400 font-mono">{currentItem.ipa}</p>
                )}
              </div>

              {/* Revealable Meaning Area */}
              <div
                onClick={() => setIsMeaningRevealed(!isMeaningRevealed)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                  isMeaningRevealed
                    ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                {isMeaningRevealed ? (
                  <div className="space-y-1 animate-in fade-in duration-150">
                    <p className="text-base font-extrabold text-white">
                      "{getCleanKoreanMeaning(currentItem)}"
                    </p>
                    {currentItem.sentence && (
                      <p className="text-xs text-slate-300 italic font-mono mt-1">
                        "{currentItem.sentence}"
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>터치하여 뜻 및 예문 확인하기</span>
                  </p>
                )}
              </div>

              {/* Pronunciation Practice Launcher */}
              {onStartPronunciation && (
                <div className="pt-1 flex justify-center">
                  <button
                    onClick={() => {
                      onClose();
                      onStartPronunciation(currentItem.word);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>발음 파형 정밀 진단</span>
                  </button>
                </div>
              )}
            </div>

            {/* Rapid-Fire Mastery Decision Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleMarkLearning}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span>아직 번갈아 암기 중</span>
              </button>

              <button
                onClick={handleMarkMastered}
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/25"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950 fill-current" />
                <span>완벽 암기! (2단계 승급)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
