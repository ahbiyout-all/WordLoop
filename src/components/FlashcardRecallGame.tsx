import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Trophy,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Flame,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { VocabItem, QAMode } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning, getEnglishDefinition } from '../utils/meaningUtils';
import { SrsRating } from '../services/srsEngineService';
import {
  buildAdaptiveVocabQueue,
  selectZpdDistractors,
  recordCognitiveAttempt,
  loadCognitiveStats,
  shuffleFisherYates,
  playCognitiveCueSound,
  ZpdLevel,
} from '../services/cognitiveGameEngine';
import { GameScaffoldingBar } from './GameScaffoldingBar';

interface FlashcardRecallGameProps {
  words: VocabItem[];
  gradeName: string;
  qaMode?: QAMode;
  onChangeQAMode?: (mode: QAMode) => void;
  onUpdateHighScore: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onUpdateVocabSrs?: (id: string, rating: SrsRating) => void;
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
  latencyMs: number;
  srsRating: SrsRating;
}

export const FlashcardRecallGame: React.FC<FlashcardRecallGameProps> = ({
  words,
  gradeName,
  qaMode = 'en_to_ko',
  onUpdateHighScore,
  onChangeMastery,
  onUpdateVocabSrs,
  onQuit,
}) => {
  const ROUND_SIZE = 15;
  const [roundPool, setRoundPool] = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isReRetrievalMode, setIsReRetrievalMode] = useState(false);

  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [focusWeakOnly, setFocusWeakOnly] = useState(false);
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [zpdLevel, setZpdLevel] = useState<ZpdLevel>(() => loadCognitiveStats().zpdLevel);
  const [lastFluencyNote, setLastFluencyNote] = useState<string | null>(null);

  const [choices, setChoices] = useState<QuestionChoice[]>([]);
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [levelUpAnimation, setLevelUpAnimation] = useState<string | null>(null);

  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([]);
  const [promotionsTo1, setPromotionsTo1] = useState(0);
  const [promotionsTo2, setPromotionsTo2] = useState(0);

  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());
  const wordsRef = useRef(words);
  wordsRef.current = words;
  const zpdLevelRef = useRef(zpdLevel);
  zpdLevelRef.current = zpdLevel;

  const startNewRound = useCallback(
    (customSubset?: VocabItem[], reRetrieval: boolean = false) => {
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }

      const stats = loadCognitiveStats();
      setZpdLevel(stats.zpdLevel);

      const selected = customSubset
        ? shuffleFisherYates(customSubset)
        : buildAdaptiveVocabQueue(
            wordsRef.current,
            stats,
            ROUND_SIZE,
            focusWeakOnly ? 'weak_only' : 'adaptive'
          );

      setRoundPool(selected);
      setIsReRetrievalMode(reRetrieval);
      setCurrentIndex(0);
      if (!reRetrieval) {
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setRoundHistory([]);
        setPromotionsTo1(0);
        setPromotionsTo2(0);
      }
      setIsGameOver(false);
      setSelectedChoiceIdx(null);
      setIsAnswerRevealed(false);
      setLevelUpAnimation(null);
      setHintTier(0);
      setLastFluencyNote(null);
      questionStartTimeRef.current = Date.now();
    },
    [focusWeakOnly]
  );

  useEffect(() => {
    startNewRound();
  }, [startNewRound, gradeName]);

  const currentItem = roundPool[currentIndex];
  const currentItemId = currentItem?.id;

  const getAnswerText = useCallback(
    (item: VocabItem) => {
      if (qaMode === 'ko_to_en' || qaMode === 'en_def_to_en') {
        return item.word;
      }
      return getCleanKoreanMeaning(item);
    },
    [qaMode]
  );

  const generateChoices = useCallback(
    (targetItem: VocabItem, level: ZpdLevel) => {
      if (!targetItem) return [];
      const correctText = getAnswerText(targetItem);
      const distractors = selectZpdDistractors(
        targetItem,
        wordsRef.current,
        level,
        3,
        getAnswerText
      );

      const allChoices: QuestionChoice[] = [
        { text: correctText, isCorrect: true, item: targetItem },
        ...distractors.map((w) => ({
          text: getAnswerText(w),
          isCorrect: false,
          item: w,
        })),
      ];

      return shuffleFisherYates(allChoices);
    },
    [getAnswerText]
  );

  useEffect(() => {
    if (currentItem && !isGameOver) {
      setChoices(generateChoices(currentItem, zpdLevelRef.current));
      setSelectedChoiceIdx(null);
      setIsAnswerRevealed(false);
      setLevelUpAnimation(null);
      setHintTier(0);
      questionStartTimeRef.current = Date.now();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItemId, generateChoices, isGameOver, isReRetrievalMode]);

  useEffect(() => {
    if (currentItem && !isGameOver && autoPlayAudio) {
      const timer = setTimeout(() => {
        speechService.playItem(currentItem.id, currentItem.word, undefined, 1);
      }, 140);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItemId, isGameOver, autoPlayAudio]);

  const prevScoreRef = useRef(0);
  useEffect(() => {
    if (score > 0 && score !== prevScoreRef.current) {
      prevScoreRef.current = score;
      onUpdateHighScore(score);
    } else if (score === 0) {
      prevScoreRef.current = 0;
    }
  }, [score, onUpdateHighScore]);

  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
    };
  }, []);

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

  const handleSelectChoice = useCallback(
    (choiceIdx: number) => {
      if (isAnswerRevealed || !currentItem) return;

      const selectedChoice = choices[choiceIdx];
      if (!selectedChoice) return;

      const latencyMs = Date.now() - questionStartTimeRef.current;
      setSelectedChoiceIdx(choiceIdx);
      setIsAnswerRevealed(true);

      const isCorrect = selectedChoice.isCorrect;
      const currentMastery = currentItem.masteryLevel ?? 0;

      const evalResult = recordCognitiveAttempt({
        itemId: currentItem.id,
        isCorrect,
        latencyMs,
        hintTierUsed: hintTier,
        confidence: hintTier <= 1 ? 'sure' : 'unsure',
        srsState: currentItem.srs,
        fallbackMastery: currentMastery,
      });

      setZpdLevel(evalResult.zpdAfter);
      setLastFluencyNote(evalResult.fluencyLabel);

      if (onUpdateVocabSrs) {
        onUpdateVocabSrs(currentItem.id, evalResult.srsRating);
      } else if (onChangeMastery) {
        onChangeMastery(currentItem.id, evalResult.nextMastery);
      }

      if (isCorrect) {
        const newCombo = combo + 1;
        setCombo(newCombo);
        if (newCombo > maxCombo) setMaxCombo(newCombo);

        const comboBonus = Math.min(newCombo * 5, 50);
        const hintPenalty = hintTier * 4;
        const pts = Math.max(8, 20 + comboBonus - hintPenalty);
        setScore((prev) => prev + pts);

        if (currentMastery === 0 && evalResult.nextMastery >= 1) {
          setPromotionsTo1((p) => p + 1);
          setLevelUpAnimation('1단계(학습중) 승급!');
        } else if (currentMastery < 2 && evalResult.nextMastery === 2) {
          setPromotionsTo2((p) => p + 1);
          setLevelUpAnimation('2단계(완벽암기) 달성!');
        }

        playCognitiveCueSound(evalResult.zpdChanged === 'up' ? 'zpd_up' : 'correct');
        speechService.playItem(currentItem.id, currentItem.word, undefined, 1);
      } else {
        setCombo(0);
        playCognitiveCueSound('illusion');
      }

      const correctChoiceText = choices.find((c) => c.isCorrect)?.text || '';
      if (!isReRetrievalMode) {
        setRoundHistory((prev) => [
          ...prev,
          {
            item: currentItem,
            userChoice: selectedChoice.text,
            correctChoice: correctChoiceText,
            isCorrect,
            oldMastery: currentMastery,
            newMastery: evalResult.nextMastery,
            latencyMs,
            srsRating: evalResult.srsRating,
          },
        ]);
      }

      autoNextTimerRef.current = setTimeout(() => {
        handleNextCard();
      }, 1500);
    },
    [
      isAnswerRevealed,
      currentItem,
      choices,
      combo,
      maxCombo,
      hintTier,
      isReRetrievalMode,
      onUpdateVocabSrs,
      onChangeMastery,
      handleNextCard,
    ]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;

      if (!isAnswerRevealed) {
        if (e.key === '1') handleSelectChoice(0);
        else if (e.key === '2') handleSelectChoice(1);
        else if (e.key === '3') handleSelectChoice(2);
        else if (e.key === '4') handleSelectChoice(3);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNextCard();
      }

      if (e.key.toLowerCase() === 's' && currentItem) {
        speechService.playItem(currentItem.id, currentItem.word, undefined, 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver, isAnswerRevealed, handleSelectChoice, handleNextCard, currentItem]);

  const correctCount = roundHistory.filter((h) => h.isCorrect).length;
  const accuracyPct = roundHistory.length > 0 ? Math.round((correctCount / roundHistory.length) * 100) : 0;
  const missedWords = roundHistory.filter((h) => !h.isCorrect).map((h) => h.item);

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-2 sm:p-4 space-y-3 select-none">
      {/* Header Bar (Zero-pill inline metadata) */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onQuit}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
            title="게임 목록으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {isReRetrievalMode ? '오답 집중 재인출' : 'Flashcard Recall'} · {gradeName}
            </p>
            <p className="text-xs font-black font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              카드 {Math.min(currentIndex + 1, roundPool.length)} / {roundPool.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {combo > 1 && (
            <span className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-black font-mono tabular-nums text-xs flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{combo}x</span>
            </span>
          )}
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 block leading-tight">점수</span>
            <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums leading-tight">
              {score}점
            </span>
          </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
        <div
          className="bg-emerald-500 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + (isAnswerRevealed ? 1 : 0)) / (roundPool.length || 1)) * 100}%` }}
        />
      </div>

      {!isGameOver ? (
        <div className="flex-1 flex flex-col justify-between space-y-3 min-h-0">
          {currentItem && (
            <div className="relative p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>
                  {currentItem.partOfSpeech || 'n.'} ·{' '}
                  {currentItem.categoryId === 'elementary' ? '초등' : currentItem.categoryId === 'middle' ? '중등' : '고등·수능'}
                </span>
                <span className="font-bold">
                  {(currentItem.masteryLevel ?? 0) === 2
                    ? '2단계 완벽암기'
                    : (currentItem.masteryLevel ?? 0) === 1
                    ? '1단계 학습중'
                    : '0단계 미암기'}
                </span>
              </div>

              <div className="space-y-1 my-1">
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {qaMode === 'ko_to_en'
                    ? getCleanKoreanMeaning(currentItem)
                    : qaMode === 'en_def_to_en'
                    ? getEnglishDefinition(currentItem)
                    : currentItem.word}
                </h2>
                {qaMode === 'en_to_ko' && currentItem.ipa && (
                  <p className="text-xs sm:text-sm font-mono text-slate-400 dark:text-slate-500">
                    {currentItem.ipa}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => speechService.playItem(currentItem.id, currentItem.word, undefined, 1)}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>발음 듣기 (S)</span>
              </button>

              {levelUpAnimation && (
                <div className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{levelUpAnimation}</span>
                </div>
              )}
            </div>
          )}

          {/* Shared 3-Tier Faded Scaffolding & ZPD Status */}
          <GameScaffoldingBar
            item={currentItem}
            hintTier={hintTier}
            onAdvanceHint={() => setHintTier((t) => (t < 3 ? ((t + 1) as 0 | 1 | 2 | 3) : t))}
            zpdLevel={zpdLevel}
            lastFeedbackLabel={lastFluencyNote}
            disabled={isAnswerRevealed}
            hideAnswerInTier3={!isAnswerRevealed}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
              <span>알맞은 정답을 선택하세요</span>
              <span className="hidden sm:inline font-mono">숫자키 [1] ~ [4]</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {choices.map((choice, idx) => {
                const isSelected = selectedChoiceIdx === idx;
                const isCorrect = choice.isCorrect;

                let btnStyle =
                  'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-emerald-500';
                if (isAnswerRevealed) {
                  if (isCorrect) {
                    btnStyle =
                      'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-black';
                  } else if (isSelected && !isCorrect) {
                    btnStyle =
                      'bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-900 dark:text-rose-200';
                  } else {
                    btnStyle =
                      'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswerRevealed}
                    onClick={() => handleSelectChoice(idx)}
                    className={`min-h-[48px] p-3 rounded-xl border text-left font-bold text-xs sm:text-sm transition-all flex items-center justify-between gap-2 cursor-pointer ${btnStyle}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-slate-400 shrink-0">{idx + 1}.</span>
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

          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoPlayAudio(!autoPlayAudio)}
                className="min-h-[36px] px-3 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                {autoPlayAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>자동 발음 {autoPlayAudio ? 'ON' : 'OFF'}</span>
              </button>
              <button
                type="button"
                onClick={() => setFocusWeakOnly(!focusWeakOnly)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer ${
                  focusWeakOnly
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span>{focusWeakOnly ? '취약·복습 집중 ON' : '취약·복습 집중'}</span>
              </button>
            </div>

            {isAnswerRevealed && (
              <button
                type="button"
                onClick={handleNextCard}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black flex items-center gap-1.5 cursor-pointer"
              >
                <span>다음 카드</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 overflow-y-auto">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {isReRetrievalMode ? '오답 재인출 보강 완료!' : '플래시카드 라운드 완료!'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              정답률 {accuracyPct}% · 점수 {score}점 · 최대 콤보 {maxCombo}x · 승급 +{promotionsTo1 + promotionsTo2}개
            </p>
          </div>

          {/* Delayed Re-Retrieval Callout */}
          {missedWords.length > 0 && !isReRetrievalMode && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                틀린 단어 {missedWords.length}개를 지금 즉시 재인출하면 기억 정착률이 크게 올라갑니다.
              </p>
              <button
                type="button"
                onClick={() => startNewRound(missedWords, true)}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                틀린 단어 {missedWords.length}개 즉시 재인출
              </button>
            </div>
          )}

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>라운드 인출 결과 ({roundHistory.length}개)</span>
            </h4>
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
                    type="button"
                    onClick={() => speechService.playItem(item.item.id, item.item.word, undefined, 1)}
                    className="p-1 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white mr-1.5">{item.item.word}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                      {getCleanKoreanMeaning(item.item)}
                    </span>
                  </div>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                  {(item.latencyMs / 1000).toFixed(1)}s · SRS {item.srsRating.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => startNewRound()}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>새 라운드 시작</span>
            </button>
            <button
              type="button"
              onClick={onQuit}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
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
