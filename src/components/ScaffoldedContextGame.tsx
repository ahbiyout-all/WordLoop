import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Volume2,
  RotateCcw,
  Trophy,
  Compass,
} from 'lucide-react';
import { VocabItem } from '../types';
import { speechService } from '../services/speechService';
import { getCleanKoreanMeaning } from '../utils/meaningUtils';
import { SrsRating } from '../services/srsEngineService';
import {
  buildAdaptiveVocabQueue,
  maskTargetWordInSentence,
  selectZpdDistractors,
  recordCognitiveAttempt,
  loadCognitiveStats,
  getZpdProfile,
  shuffleFisherYates,
  playCognitiveCueSound,
  ZpdLevel,
} from '../services/cognitiveGameEngine';
import { GameScaffoldingBar } from './GameScaffoldingBar';

interface ScaffoldedContextGameProps {
  words: VocabItem[];
  gradeName: string;
  onUpdateHighScore: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onUpdateVocabSrs?: (id: string, rating: SrsRating) => void;
  onQuit: () => void;
}

interface ContextChoice {
  word: string;
  meaning: string;
  isCorrect: boolean;
  eliminated: boolean;
}

const ROUND_SIZE = 10;

export const ScaffoldedContextGame: React.FC<ScaffoldedContextGameProps> = ({
  words,
  gradeName,
  onUpdateHighScore,
  onChangeMastery,
  onUpdateVocabSrs,
  onQuit,
}) => {
  const [stage, setStage] = useState<'PLAYING' | 'RE_RETRIEVAL' | 'SUMMARY'>('PLAYING');
  const [pool, setPool] = useState<VocabItem[]>([]);
  const [rePool, setRePool] = useState<VocabItem[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [choices, setChoices] = useState<ContextChoice[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [zpdLevel, setZpdLevel] = useState<ZpdLevel>(() => loadCognitiveStats().zpdLevel);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [missedItems, setMissedItems] = useState<VocabItem[]>([]);
  const [correctTotal, setCorrectTotal] = useState(0);

  const startRef = useRef<number>(Date.now());
  const prevScoreRef = useRef(0);
  const wordsRef = useRef(words);
  wordsRef.current = words;
  const zpdLevelRef = useRef(zpdLevel);
  zpdLevelRef.current = zpdLevel;

  const activePool = stage === 'RE_RETRIEVAL' ? rePool : pool;
  const currentItem = activePool[index];
  const currentItemId = currentItem?.id;

  const startRound = useCallback(() => {
    const srcWords = wordsRef.current;
    const withSentences = srcWords.filter((w) => w.sentence && w.sentence.trim().length > 8);
    const source = withSentences.length >= 4 ? withSentences : srcWords;
    const stats = loadCognitiveStats();
    const curated = buildAdaptiveVocabQueue(source, stats, ROUND_SIZE, 'adaptive');
    setPool(curated);
    setRePool([]);
    setMissedItems([]);
    setStage('PLAYING');
    setIndex(0);
    setScore(0);
    prevScoreRef.current = 0;
    setCorrectTotal(0);
    setHintTier(0);
    setLastFeedback(null);
    setZpdLevel(stats.zpdLevel);
  }, []);

  useEffect(() => {
    startRound();
  }, [startRound, gradeName]);

  useEffect(() => {
    if (!currentItem || stage === 'SUMMARY') return;
    const distractors = selectZpdDistractors(
      currentItem,
      wordsRef.current,
      zpdLevelRef.current,
      3,
      (v) => v.word
    );
    const list: ContextChoice[] = shuffleFisherYates([
      {
        word: currentItem.word,
        meaning: getCleanKoreanMeaning(currentItem),
        isCorrect: true,
        eliminated: false,
      },
      ...distractors.map((d) => ({
        word: d.word,
        meaning: getCleanKoreanMeaning(d),
        isCorrect: false,
        eliminated: false,
      })),
    ]);
    setChoices(list);
    setSelectedIdx(null);
    setIsRevealed(false);
    setHintTier(0);
    startRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItemId, stage]);

  useEffect(() => {
    if (score > 0 && score !== prevScoreRef.current) {
      prevScoreRef.current = score;
      onUpdateHighScore(score);
    }
  }, [score, onUpdateHighScore]);

  // At Tier 3, eliminate up to 2 distractors as faded scaffolding assist
  const handleAdvanceHint = () => {
    setHintTier((prev) => {
      const next = prev < 3 ? ((prev + 1) as 0 | 1 | 2 | 3) : prev;
      if (next === 3) {
        setChoices((curr) => {
          let removed = 0;
          return curr.map((c) => {
            if (!c.isCorrect && removed < 2) {
              removed += 1;
              return { ...c, eliminated: true };
            }
            return c;
          });
        });
      }
      return next;
    });
  };

  const handleSelect = (idx: number) => {
    if (isRevealed || !currentItem || choices[idx]?.eliminated) return;
    const picked = choices[idx];
    const latencyMs = Date.now() - startRef.current;

    setSelectedIdx(idx);
    setIsRevealed(true);

    const evalResult = recordCognitiveAttempt({
      itemId: currentItem.id,
      isCorrect: picked.isCorrect,
      latencyMs,
      hintTierUsed: hintTier,
      confidence: hintTier <= 1 ? 'sure' : 'unsure',
      srsState: currentItem.srs,
      fallbackMastery: currentItem.masteryLevel ?? 0,
    });
    setZpdLevel(evalResult.zpdAfter);

    if (onUpdateVocabSrs) {
      onUpdateVocabSrs(currentItem.id, evalResult.srsRating);
    } else if (onChangeMastery) {
      onChangeMastery(currentItem.id, evalResult.nextMastery);
    }

    if (picked.isCorrect) {
      const pts = hintTier === 0 ? 40 : hintTier === 1 ? 30 : hintTier === 2 ? 22 : 15;
      setScore((prev) => prev + pts);
      if (stage === 'PLAYING') {
        setCorrectTotal((c) => c + 1);
      }
      setLastFeedback(`${evalResult.fluencyLabel} · +${pts}점`);
      playCognitiveCueSound(evalResult.zpdChanged === 'up' ? 'zpd_up' : 'correct');
      speechService.playItem(currentItem.id, currentItem.word, undefined, 1);
    } else {
      setLastFeedback(`정답: ${currentItem.word} (${getCleanKoreanMeaning(currentItem)})`);
      playCognitiveCueSound('illusion');
      if (stage === 'PLAYING') {
        setMissedItems((prev) =>
          prev.some((p) => p.id === currentItem.id) ? prev : [...prev, currentItem]
        );
      }
    }
  };

  const handleNext = () => {
    if (index + 1 < activePool.length) {
      setIndex((i) => i + 1);
      return;
    }
    if (stage === 'PLAYING' && missedItems.length > 0) {
      setRePool(missedItems);
      setStage('RE_RETRIEVAL');
      setIndex(0);
      return;
    }
    setStage('SUMMARY');
  };

  const zpdProfile = getZpdProfile(zpdLevel);
  const maskedPrompt = currentItem
    ? currentItem.sentence
      ? maskTargetWordInSentence(currentItem.sentence, currentItem.word)
      : `뜻 "${getCleanKoreanMeaning(currentItem)}"에 알맞은 단어를 문맥에 맞게 고르세요.`
    : '';

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-2 sm:p-4 space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onQuit}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-bold text-teal-600 dark:text-teal-400 truncate">
              {stage === 'RE_RETRIEVAL' ? '오답 문맥 재추론' : '문맥·어근 3단계 추론 디코더'} · {gradeName}
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
              {Math.min(index + 1, activePool.length)} / {activePool.length} · {zpdProfile.label}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">점수</span>
          <span className="text-base font-black font-mono tabular-nums text-teal-600 dark:text-teal-400">
            {score}점
          </span>
        </div>
      </div>

      {stage !== 'SUMMARY' && currentItem ? (
        <div className="flex-1 flex flex-col justify-between space-y-3 min-h-0">
          {/* Context Sentence Hero */}
          <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-semibold">
                <Compass className="w-3.5 h-3.5 text-teal-500" />
                <span>빈칸 문맥 추론 ({currentItem.partOfSpeech || '어휘'})</span>
              </span>
              {isRevealed && (
                <button
                  type="button"
                  onClick={() => speechService.playItem(currentItem.id, currentItem.word, undefined, 1)}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>단어 발음</span>
                </button>
              )}
            </div>

            <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
              {isRevealed && currentItem.sentence ? currentItem.sentence : maskedPrompt}
            </p>

            {currentItem.sentenceMeaning && (isRevealed || hintTier >= 1) && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {currentItem.sentenceMeaning}
              </p>
            )}
          </div>

          <GameScaffoldingBar
            item={currentItem}
            hintTier={hintTier}
            onAdvanceHint={handleAdvanceHint}
            zpdLevel={zpdLevel}
            lastFeedbackLabel={lastFeedback}
            disabled={isRevealed}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {choices.map((c, idx) => {
              const isPicked = selectedIdx === idx;
              let cls =
                'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-teal-500';
              if (c.eliminated && !isRevealed) {
                cls = 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 line-through opacity-40';
              } else if (isRevealed) {
                if (c.isCorrect) {
                  cls = 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                } else if (isPicked) {
                  cls = 'bg-rose-50 dark:bg-rose-950/70 border-rose-500 text-rose-900 dark:text-rose-200';
                } else {
                  cls = 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-50';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isRevealed || c.eliminated}
                  onClick={() => handleSelect(idx)}
                  className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${cls}`}
                >
                  <div className="min-w-0">
                    <span className="font-mono text-slate-400 mr-1.5">{idx + 1}.</span>
                    <span className="font-bold">{c.word}</span>
                    {isRevealed && (
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {c.meaning}
                      </span>
                    )}
                  </div>
                  {isRevealed && c.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  {isRevealed && isPicked && !c.isCorrect && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {isRevealed && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>다음 문제</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              문맥·어근 추론 완료
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
              정답 {correctTotal}/{pool.length} · 총점 {score}점 · {zpdProfile.label}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={startRound}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>다시 도전</span>
            </button>
            <button
              type="button"
              onClick={onQuit}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
            >
              게임 목록으로
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
