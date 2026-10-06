import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BookOpen,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Trophy,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Flame,
  Star,
  Layers,
  Zap,
  Award,
  SlidersHorizontal,
  ChevronRight,
  RefreshCw,
  Check,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Keyboard,
  Settings2,
} from 'lucide-react';
import { VocabItem, QAMode } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning, getEnglishDefinition } from '../utils/meaningUtils';

interface FlashcardRecallGameProps {
  words: VocabItem[];
  gradeName: string;
  qaMode?: QAMode;
  onChangeQAMode?: (mode: QAMode) => void;
  onUpdateHighScore: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit: () => void;
}

interface QuestionChoice {
  text: string;
  isCorrect: boolean;
  item: VocabItem;
}

interface RoundHistoryItem {
  item: VocabItem;
  userChoice: string;
  correctChoice: string;
  isCorrect: boolean;
  oldMastery: 0 | 1 | 2;
  newMastery: 0 | 1 | 2;
}

export const FlashcardRecallGame: React.FC<FlashcardRecallGameProps> = ({
  words,
  gradeName,
  qaMode = 'en_to_ko',
  onChangeQAMode,
  onUpdateHighScore,
  onChangeMastery,
  onQuit,
}) => {
  // Round Configuration
  const ROUND_SIZE = 15;
  const [roundPool, setRoundPool] = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  // Settings & Toggles
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [focusWeakOnly, setFocusWeakOnly] = useState(false);
  const [showSentenceHint, setShowSentenceHint] = useState(false);

  // Current Question State
  const [choices, setChoices] = useState<QuestionChoice[]>([]);
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [levelUpAnimation, setLevelUpAnimation] = useState<string | null>(null);

  // Round Statistics & History
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([]);
  const [promotionsTo1, setPromotionsTo1] = useState(0);
  const [promotionsTo2, setPromotionsTo2] = useState(0);

  // Auto-advance timer ref
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize or Restart Round
  const startNewRound = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    let candidateWords = [...words];
    if (focusWeakOnly) {
      const weak = candidateWords.filter((w) => (w.masteryLevel ?? 0) < 2);
      if (weak.length >= 4) {
        candidateWords = weak;
      }
    }

    // Shuffle and pick ROUND_SIZE
    const shuffled = [...candidateWords].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(ROUND_SIZE, shuffled.length));

    setRoundPool(selected);
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setIsGameOver(false);
    setSelectedChoiceIdx(null);
    setIsAnswerRevealed(false);
    setLevelUpAnimation(null);
    setShowSentenceHint(false);
    setRoundHistory([]);
    setPromotionsTo1(0);
    setPromotionsTo2(0);
  }, [words, focusWeakOnly]);

  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  // Current Card Item
  const currentItem = roundPool[currentIndex];

  // 2. Generate 4 Options for Current Word
  const generateChoices = useCallback(
    (targetItem: VocabItem) => {
      if (!targetItem) return [];

      const correctMeaning = getCleanKoreanMeaning(targetItem);

      // Collect distractor options from the word pool
      const otherWords = words.filter(
        (w) => w.id !== targetItem.id && getCleanKoreanMeaning(w) !== correctMeaning
      );
      const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random()).slice(0, 3);

      const allChoices: QuestionChoice[] = [
        {
          text: correctMeaning,
          isCorrect: true,
          item: targetItem,
        },
        ...shuffledOthers.map((w) => ({
          text: getCleanKoreanMeaning(w),
          isCorrect: false,
          item: w,
        })),
      ];

      // Shuffle 4 choices
      return allChoices.sort(() => 0.5 - Math.random());
    },
    [words]
  );

  // Setup choices and trigger TTS when currentItem changes
  useEffect(() => {
    if (currentItem && !isGameOver) {
      const newChoices = generateChoices(currentItem);
      setChoices(newChoices);
      setSelectedChoiceIdx(null);
      setIsAnswerRevealed(false);
      setLevelUpAnimation(null);
      setShowSentenceHint(false);

      if (autoPlayAudio) {
        // Small delay to allow render transition
        const timer = setTimeout(() => {
          speechService.playItem(currentItem.id, currentItem.word, undefined, 1);
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [currentItem, generateChoices, isGameOver, autoPlayAudio]);

  // 3. Handle Choice Selection
  const handleSelectChoice = useCallback(
    (choiceIdx: number) => {
      if (isAnswerRevealed || !currentItem) return;

      const selectedChoice = choices[choiceIdx];
      if (!selectedChoice) return;

      setSelectedChoiceIdx(choiceIdx);
      setIsAnswerRevealed(true);

      const isCorrect = selectedChoice.isCorrect;
      const currentMastery = currentItem.masteryLevel ?? 0;
      let nextMastery: 0 | 1 | 2 = currentMastery;

      if (isCorrect) {
        // Correct answer logic
        const newCombo = combo + 1;
        setCombo(newCombo);
        if (newCombo > maxCombo) setMaxCombo(newCombo);

        const comboBonus = Math.min(newCombo * 5, 50);
        const pts = 20 + comboBonus;
        setScore((prev) => {
          const next = prev + pts;
          onUpdateHighScore(next);
          return next;
        });

        // Mastery Promotion
        if (currentMastery === 0) {
          nextMastery = 1;
          setPromotionsTo1((p) => p + 1);
          setLevelUpAnimation('🎉 1단계(학습중) 승급!');
        } else if (currentMastery === 1) {
          nextMastery = 2;
          setPromotionsTo2((p) => p + 1);
          setLevelUpAnimation('🌟 2단계(완벽암기) 달성!');
        }

        if (onChangeMastery) {
          onChangeMastery(currentItem.id, nextMastery);
        }

        speechService.playItem(currentItem.id, currentItem.word, undefined, 1);
      } else {
        // Wrong answer logic: reset combo and retain/demote to 0
        setCombo(0);
        nextMastery = 0;
        if (onChangeMastery) {
          onChangeMastery(currentItem.id, 0);
        }
      }

      // Record to round history
      const correctChoiceText = choices.find((c) => c.isCorrect)?.text || '';
      setRoundHistory((prev) => [
        ...prev,
        {
          item: currentItem,
          userChoice: selectedChoice.text,
          correctChoice: correctChoiceText,
          isCorrect,
          oldMastery: currentMastery,
          newMastery: nextMastery,
        },
      ]);

      // Auto advance after short feedback window (1.4s)
      autoNextTimerRef.current = setTimeout(() => {
        handleNextCard();
      }, 1400);
    },
    [isAnswerRevealed, currentItem, choices, combo, maxCombo, onUpdateHighScore, onChangeMastery]
  );

  // 4. Advance to Next Card or Finish Round
  const handleNextCard = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    if (currentIndex + 1 < roundPool.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsGameOver(true);
    }
  }, [currentIndex, roundPool.length]);

  // Keyboard Shortcuts (1, 2, 3, 4, Space for audio)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;

      if (!isAnswerRevealed) {
        if (e.key === '1') handleSelectChoice(0);
        else if (e.key === '2') handleSelectChoice(1);
        else if (e.key === '3') handleSelectChoice(2);
        else if (e.key === '4') handleSelectChoice(3);
      } else {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNextCard();
        }
      }

      if (e.key === 's' || e.key === 'S') {
        if (currentItem) {
          speechService.playItem(currentItem.id, currentItem.word, undefined, 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver, isAnswerRevealed, handleSelectChoice, handleNextCard, currentItem]);

  // Calculate Accuracy
  const correctCount = roundHistory.filter((h) => h.isCorrect).length;
  const accuracyPct = roundHistory.length > 0 ? Math.round((correctCount / roundHistory.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-2 sm:p-4 space-y-3 select-none">
      
      {/* 1. Header Bar: Progress, Score & Combo */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onQuit}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            title="게임 목록으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Flashcard Recall
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {gradeName}
              </span>
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
              카드 {Math.min(currentIndex + 1, roundPool.length)} / {roundPool.length}
            </div>
          </div>
        </div>

        {/* Score & Multiplier */}
        <div className="flex items-center gap-2 sm:gap-3">
          {combo > 1 && (
            <div className="px-2 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs flex items-center gap-1 animate-bounce shadow-sm">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{combo}x 콤보!</span>
            </div>
          )}
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 block leading-tight">점수</span>
            <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono leading-tight">
              {score}점
            </span>
          </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden shrink-0">
        <div
          className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + (isAnswerRevealed ? 1 : 0)) / (roundPool.length || 1)) * 100}%` }}
        />
      </div>

      {/* 2. Main Game View or Results Summary */}
      {!isGameOver ? (
        <div className="flex-1 flex flex-col justify-between space-y-3 min-h-0">
          
          {/* FLASHCARD DISPLAY HERO */}
          {currentItem && (
            <div className="relative p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/90 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center text-center space-y-3 transition-all">
              
              {/* Top Badges: Category & Mastery Level */}
              <div className="w-full flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {currentItem.partOfSpeech || 'n.'} • {currentItem.categoryId === 'elementary' ? '초등' : currentItem.categoryId === 'middle' ? '중등' : '고등·수능'}
                </span>

                {/* Current Mastery Badge */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                      (currentItem.masteryLevel ?? 0) === 2
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : (currentItem.masteryLevel ?? 0) === 1
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {(currentItem.masteryLevel ?? 0) === 2 ? '2단계 완벽암기' : (currentItem.masteryLevel ?? 0) === 1 ? '1단계 학습중' : '0단계 미암기'}
                  </span>
                </div>
              </div>

              {/* Word Typography */}
              <div className="space-y-1 my-1">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {currentItem.word}
                </h2>
                {currentItem.ipa && (
                  <p className="text-xs sm:text-sm font-mono text-slate-400 dark:text-slate-500">
                    {currentItem.ipa}
                  </p>
                )}
              </div>

              {/* Action Buttons: Audio Pronunciation & Hint */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => speechService.playItem(currentItem.id, currentItem.word, undefined, 1)}
                  className="px-3.5 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>발음 듣기 (S)</span>
                </button>

                {currentItem.sentence && (
                  <button
                    onClick={() => setShowSentenceHint(!showSentenceHint)}
                    className="px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all"
                  >
                    <span>{showSentenceHint ? '예문 힌트 닫기' : '💡 예문 힌트'}</span>
                  </button>
                )}
              </div>

              {/* Optional Sentence Hint Accordion */}
              {showSentenceHint && currentItem.sentence && (
                <div className="w-full p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-left animate-in fade-in duration-150">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    "{currentItem.sentence}"
                  </p>
                  {currentItem.sentenceMeaning && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {currentItem.sentenceMeaning}
                    </p>
                  )}
                </div>
              )}

              {/* Level Up Banner Overlay Animation */}
              {levelUpAnimation && (
                <div className="absolute inset-x-4 top-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 animate-in zoom-in-95 duration-200">
                  <Sparkles className="w-4 h-4 fill-current animate-spin" />
                  <span>{levelUpAnimation}</span>
                </div>
              )}
            </div>
          )}

          {/* 4 MULTIPLE-CHOICE OPTIONS GRID */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
              <span>알맞은 한국어 뜻을 선택하세요</span>
              <span className="hidden sm:inline font-mono">숫자키 [1] ~ [4] 입력 지원</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {choices.map((choice, idx) => {
                const isSelected = selectedChoiceIdx === idx;
                const isCorrect = choice.isCorrect;

                let btnStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-sm';
                
                if (isAnswerRevealed) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500 shadow-md font-black';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500 shadow-md';
                  } else {
                    btnStyle = 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswerRevealed}
                    onClick={() => handleSelectChoice(idx)}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-left font-bold text-xs sm:text-sm transition-all flex items-center justify-between gap-2 active:scale-[0.98] ${btnStyle}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono text-xs text-slate-500 shrink-0 font-extrabold">
                        {idx + 1}
                      </span>
                      <span className="truncate">{choice.text}</span>
                    </div>

                    {isAnswerRevealed && (
                      <div className="shrink-0">
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-500" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                autoPlayAudio
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {autoPlayAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>자동 발음 재생 {autoPlayAudio ? 'ON' : 'OFF'}</span>
            </button>

            {isAnswerRevealed && (
              <button
                onClick={handleNextCard}
                className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <span>다음 카드</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      ) : (
        /* ROUND COMPLETION RESULTS SUMMARY */
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in zoom-in-95 duration-200 overflow-y-auto no-scrollbar">
          
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              플래시카드 라운드 완료! 🎉
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              총 {roundPool.length}장의 카드를 성공적으로 리콜 복습했습니다.
            </p>
          </div>

          {/* Score & Mastery Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
              <span className="text-[10px] font-bold text-slate-500 block">최종 점수</span>
              <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {score}점
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[10px] font-bold text-slate-500 block">정답률</span>
              <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {accuracyPct}%
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
              <span className="text-[10px] font-bold text-slate-500 block">최대 콤보</span>
              <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {maxCombo}x
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
              <span className="text-[10px] font-bold text-slate-500 block">암기 등급 승급</span>
              <span className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                +{promotionsTo1 + promotionsTo2}개
              </span>
            </div>
          </div>

          {/* Round Mastery Promotions Breakdown */}
          {(promotionsTo1 > 0 || promotionsTo2 > 0) && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>실시간 암기 레벨 승급 결과:</span>
              </div>
              <div className="flex items-center gap-2 font-black">
                {promotionsTo1 > 0 && <span className="text-amber-600 dark:text-amber-400">🟡 1단계 승급 {promotionsTo1}개</span>}
                {promotionsTo2 > 0 && <span className="text-emerald-600 dark:text-emerald-400">🟢 2단계 마스터 {promotionsTo2}개</span>}
              </div>
            </div>
          )}

          {/* Detailed Question Review List */}
          <div className="space-y-2 text-left">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>라운드 상세 복습 ({roundHistory.length}개)</span>
            </h4>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
              {roundHistory.map((item, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    item.isCorrect
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                      : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => speechService.playItem(item.item.id, item.item.word, undefined, 1)}
                      className="p-1 rounded-lg bg-white dark:bg-slate-800 hover:text-indigo-500"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="min-w-0">
                      <span className="font-black text-slate-900 dark:text-white mr-1.5">{item.item.word}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                        {item.correctChoice}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!item.isCorrect && (
                      <span className="text-[10px] text-rose-500 font-bold">오답: {item.userChoice}</span>
                    )}
                    {item.isCorrect ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                        정답 +20
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[10px] font-black">
                        오답 0
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={startNewRound}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>새로운 라운드 시작</span>
            </button>
            <button
              onClick={onQuit}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>게임 목록으로</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
