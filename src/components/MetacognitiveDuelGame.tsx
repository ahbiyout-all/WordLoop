import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  XCircle,
  Volume2,
  Sparkles,
  RotateCcw,
  Zap,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Trophy,
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
  getZpdProfile,
  shuffleFisherYates,
  playCognitiveCueSound,
  ConfidenceJudgment,
  MetacognitiveQuadrant,
  ZpdLevel,
} from '../services/cognitiveGameEngine';
import { GameScaffoldingBar } from './GameScaffoldingBar';

interface MetacognitiveDuelGameProps {
  words: VocabItem[];
  gradeName: string;
  qaMode?: QAMode;
  onChangeQAMode?: (mode: QAMode) => void;
  onUpdateHighScore: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onUpdateVocabSrs?: (id: string, rating: SrsRating) => void;
  onQuit: () => void;
}

interface DuelChoice {
  text: string;
  isCorrect: boolean;
  item: VocabItem;
}

interface DuelHistoryRow {
  item: VocabItem;
  isCorrect: boolean;
  confidence: ConfidenceJudgment;
  quadrant: MetacognitiveQuadrant;
  latencyMs: number;
  srsRating: SrsRating;
}

type GameStage = 'PLAYING' | 'RE_RETRIEVAL' | 'ROUND_SUMMARY';

const ROUND_SIZE = 12;

export const MetacognitiveDuelGame: React.FC<MetacognitiveDuelGameProps> = ({
  words,
  gradeName,
  qaMode = 'en_to_ko',
  onUpdateHighScore,
  onChangeMastery,
  onUpdateVocabSrs,
  onQuit,
}) => {
  const [stage, setStage] = useState<GameStage>('PLAYING');
  const [roundPool, setRoundPool] = useState<VocabItem[]>([]);
  const [reRetrievalPool, setReRetrievalPool] = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [confidence, setConfidence] = useState<ConfidenceJudgment>('sure');
  const [choices, setChoices] = useState<DuelChoice[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [zpdLevel, setZpdLevel] = useState<ZpdLevel>(() => loadCognitiveStats().zpdLevel);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    quadrant: MetacognitiveQuadrant;
    title: string;
    detail: string;
    latencyMs: number;
    srsRating: SrsRating;
  } | null>(null);
  const [history, setHistory] = useState<DuelHistoryRow[]>([]);

  const itemStartTimeRef = useRef<number>(Date.now());
  const prevScoreRef = useRef(0);
  const wordsRef = useRef(words);
  wordsRef.current = words;
  const zpdLevelRef = useRef(zpdLevel);
  zpdLevelRef.current = zpdLevel;

  const activePool = stage === 'RE_RETRIEVAL' ? reRetrievalPool : roundPool;
  const currentItem = activePool[currentIndex];
  const currentItemId = currentItem?.id;

  const getOptionLabel = useCallback(
    (item: VocabItem) => {
      if (qaMode === 'ko_to_en' || qaMode === 'en_def_to_en') {
        return item.word;
      }
      return getCleanKoreanMeaning(item);
    },
    [qaMode]
  );

  const buildChoicesForItem = useCallback(
    (item: VocabItem, level: ZpdLevel) => {
      const distractors = selectZpdDistractors(item, wordsRef.current, level, 3, getOptionLabel);
      const list: DuelChoice[] = [
        { text: getOptionLabel(item), isCorrect: true, item },
        ...distractors.map((d) => ({
          text: getOptionLabel(d),
          isCorrect: false,
          item: d,
        })),
      ];
      return shuffleFisherYates(list);
    },
    [getOptionLabel]
  );

  const startNewRound = useCallback(() => {
    const stats = loadCognitiveStats();
    const curated = buildAdaptiveVocabQueue(wordsRef.current, stats, ROUND_SIZE, 'adaptive');
    setRoundPool(curated);
    setReRetrievalPool([]);
    setStage('PLAYING');
    setCurrentIndex(0);
    setScore(0);
    prevScoreRef.current = 0;
    setConfidence('sure');
    setSelectedIdx(null);
    setIsRevealed(false);
    setHintTier(0);
    setFeedbackBanner(null);
    setHistory([]);
    setZpdLevel(stats.zpdLevel);
    itemStartTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    startNewRound();
  }, [startNewRound, gradeName]);

  useEffect(() => {
    if (!currentItem || stage === 'ROUND_SUMMARY') return;
    setChoices(buildChoicesForItem(currentItem, zpdLevelRef.current));
    setSelectedIdx(null);
    setIsRevealed(false);
    setHintTier(0);
    setFeedbackBanner(null);
    itemStartTimeRef.current = Date.now();
    if (qaMode === 'en_to_ko') {
      const t = setTimeout(() => {
        speechService.playItem(currentItem.id, currentItem.word, undefined, 1);
      }, 140);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItemId, stage, buildChoicesForItem, qaMode]);

  useEffect(() => {
    if (score > 0 && score !== prevScoreRef.current) {
      prevScoreRef.current = score;
      onUpdateHighScore(score);
    }
  }, [score, onUpdateHighScore]);

  const handleSelectChoice = useCallback(
    (idx: number) => {
      if (isRevealed || !currentItem || stage === 'ROUND_SUMMARY') return;
      const chosen = choices[idx];
      if (!chosen) return;

      const latencyMs = Date.now() - itemStartTimeRef.current;
      setSelectedIdx(idx);
      setIsRevealed(true);

      const evalResult = recordCognitiveAttempt({
        itemId: currentItem.id,
        isCorrect: chosen.isCorrect,
        latencyMs,
        hintTierUsed: hintTier,
        confidence,
        srsState: currentItem.srs,
        fallbackMastery: currentItem.masteryLevel ?? 0,
      });

      setZpdLevel(evalResult.zpdAfter);

      if (onUpdateVocabSrs) {
        onUpdateVocabSrs(currentItem.id, evalResult.srsRating);
      } else if (onChangeMastery) {
        onChangeMastery(currentItem.id, evalResult.nextMastery);
      }

      if (chosen.isCorrect) {
        const pts =
          evalResult.quadrant === 'confident_correct'
            ? Math.max(10, 30 - hintTier * 6)
            : Math.max(5, 15 - hintTier * 3);
        setScore((prev) => prev + pts);
        playCognitiveCueSound(evalResult.zpdChanged === 'up' ? 'zpd_up' : 'correct');
        speechService.playItem(currentItem.id, currentItem.word, undefined, 1);
      } else {
        playCognitiveCueSound('illusion');
      }

      const diagnosticCopy: Record<MetacognitiveQuadrant, { title: string; detail: string }> = {
        confident_correct: {
          title: '정확한 확신 · 장기 기억 강화',
          detail: `메타인지 예측이 적중했습니다 (${(latencyMs / 1000).toFixed(1)}s · SRS ${evalResult.srsRating.toUpperCase()})`,
        },
        illusion: {
          title: '⚠️ 아는 착각(Illusion of Competence) 탐지',
          detail: '확신했으나 오답입니다. 발음·예문과 함께 라운드 말미에 즉시 재인출합니다.',
        },
        lucky_guess: {
          title: '🎲 운 좋은 정답(Lucky Guess) 포착',
          detail: '불확실한 상태로 맞췄으므로 단기 복습 큐에 올려 다시 검증합니다.',
        },
        honest_miss: {
          title: '📌 정직한 미숙지 확인',
          detail: '모르는 부분을 정확히 인지했습니다. 재인출 훈련에서 다시 도전합니다.',
        },
      };

      setFeedbackBanner({
        quadrant: evalResult.quadrant,
        title: diagnosticCopy[evalResult.quadrant].title,
        detail: diagnosticCopy[evalResult.quadrant].detail,
        latencyMs,
        srsRating: evalResult.srsRating,
      });

      if (stage === 'PLAYING') {
        setHistory((prev) => [
          ...prev,
          {
            item: currentItem,
            isCorrect: chosen.isCorrect,
            confidence,
            quadrant: evalResult.quadrant,
            latencyMs,
            srsRating: evalResult.srsRating,
          },
        ]);
      }
    },
    [
      isRevealed,
      currentItem,
      stage,
      choices,
      hintTier,
      confidence,
      onUpdateVocabSrs,
      onChangeMastery,
    ]
  );

  const handleNext = useCallback(() => {
    if (currentIndex + 1 < activePool.length) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    if (stage === 'PLAYING') {
      const needReRetrieval = history
        .filter((h) => !h.isCorrect || h.quadrant === 'lucky_guess')
        .map((h) => h.item);
      if (needReRetrieval.length > 0) {
        setReRetrievalPool(needReRetrieval);
        setStage('RE_RETRIEVAL');
        setCurrentIndex(0);
        return;
      }
    }

    setStage('ROUND_SUMMARY');
  }, [currentIndex, activePool.length, stage, history]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (stage === 'ROUND_SUMMARY') return;
      if (!isRevealed) {
        if (e.key === '1') handleSelectChoice(0);
        else if (e.key === '2') handleSelectChoice(1);
        else if (e.key === '3') handleSelectChoice(2);
        else if (e.key === '4') handleSelectChoice(3);
        else if (e.key.toLowerCase() === 'q') setConfidence('sure');
        else if (e.key.toLowerCase() === 'e') setConfidence('unsure');
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
      if (e.key.toLowerCase() === 's' && currentItem) {
        speechService.playItem(currentItem.id, currentItem.word, undefined, 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stage, isRevealed, handleSelectChoice, handleNext, currentItem]);

  const zpdProfile = getZpdProfile(zpdLevel);
  const confidentCorrectCount = history.filter((h) => h.quadrant === 'confident_correct').length;
  const illusionCount = history.filter((h) => h.quadrant === 'illusion').length;
  const luckyCount = history.filter((h) => h.quadrant === 'lucky_guess').length;
  const honestMissCount = history.filter((h) => h.quadrant === 'honest_miss').length;
  const calibrationPct =
    history.length > 0
      ? Math.round(((confidentCorrectCount + honestMissCount) / history.length) * 100)
      : 0;
  const avgSec =
    history.length > 0
      ? (history.reduce((s, r) => s + r.latencyMs, 0) / history.length / 1000).toFixed(1)
      : '0.0';

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-2 sm:p-4 space-y-3 select-none">
      {/* Compact Header (Zero-pill inline metadata) */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onQuit}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="게임 목록으로"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">
              {stage === 'RE_RETRIEVAL' ? '오답·불확실 즉시 재인출 보강' : '메타인지 확신도 결투'} · {gradeName}
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
              {Math.min(currentIndex + 1, activePool.length)} / {activePool.length} · {zpdProfile.label}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">점수</span>
          <span className="text-base font-black font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
            {score}점
          </span>
        </div>
      </div>

      {stage !== 'ROUND_SUMMARY' && currentItem ? (
        <div className="flex-1 flex flex-col justify-between space-y-3 min-h-0">
          {/* Prompt Card */}
          <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{currentItem.partOfSpeech || '어휘'}</span>
              <button
                type="button"
                onClick={() => speechService.playItem(currentItem.id, currentItem.word, undefined, 1)}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>발음 (S)</span>
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {qaMode === 'ko_to_en'
                  ? getCleanKoreanMeaning(currentItem)
                  : qaMode === 'en_def_to_en'
                  ? getEnglishDefinition(currentItem)
                  : currentItem.word}
              </h2>
              {qaMode === 'en_to_ko' && currentItem.ipa && (
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{currentItem.ipa}</p>
              )}
            </div>

            {/* Confidence Toggle (JOL Rating before choice) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                정답을 고르기 전, 나의 확신도는? (Q / E)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isRevealed}
                  onClick={() => setConfidence('sure')}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    confidence === 'sure'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>확실히 안다 [Q]</span>
                </button>
                <button
                  type="button"
                  disabled={isRevealed}
                  onClick={() => setConfidence('unsure')}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    confidence === 'unsure'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>아리송·추측 [E]</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3-Tier Faded Scaffolding Bar */}
          <GameScaffoldingBar
            item={currentItem}
            hintTier={hintTier}
            onAdvanceHint={() => setHintTier((t) => (t < 3 ? ((t + 1) as 0 | 1 | 2 | 3) : t))}
            zpdLevel={zpdLevel}
            disabled={isRevealed}
            hideAnswerInTier3={!isRevealed}
          />

          {/* 4 Choices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {choices.map((choice, idx) => {
              const isSelected = selectedIdx === idx;
              let cls =
                'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-500';
              if (isRevealed) {
                if (choice.isCorrect) {
                  cls =
                    'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                } else if (isSelected) {
                  cls =
                    'bg-rose-50 dark:bg-rose-950/70 border-rose-500 text-rose-900 dark:text-rose-200';
                } else {
                  cls = 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-50';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isRevealed}
                  onClick={() => handleSelectChoice(idx)}
                  className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${cls}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-slate-400 shrink-0">{idx + 1}.</span>
                    <span className="truncate">{choice.text}</span>
                  </span>
                  {isRevealed && choice.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  {isRevealed && isSelected && !choice.isCorrect && (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Diagnostic Feedback + Next CTA */}
          {isRevealed && feedbackBanner && (
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p
                  className={`text-xs font-bold flex items-center gap-1.5 ${
                    feedbackBanner.quadrant === 'illusion'
                      ? 'text-rose-600 dark:text-rose-400'
                      : feedbackBanner.quadrant === 'lucky_guess'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {feedbackBanner.quadrant === 'illusion' && <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{feedbackBanner.title}</span>
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {currentItem.word} = {getCleanKoreanMeaning(currentItem)} · {feedbackBanner.detail}
                </p>
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer ml-auto"
              >
                <span>다음 문제</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Round Summary: Calibration Quadrants */
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              메타인지 캘리브레이션 완료
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
              메타인지 보정 정확도 {calibrationPct}% · 평균 인출 속도 {avgSec}s · 현재 {zpdProfile.label}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
              <p className="text-[11px] text-slate-600 dark:text-slate-400">확실함 + 정답 (완전 습득)</p>
              <p className="text-xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                {confidentCorrectCount}개
              </p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
              <p className="text-[11px] text-slate-600 dark:text-slate-400">확실함 + 오답 (아는 착각)</p>
              <p className="text-xl font-black font-mono tabular-nums text-rose-700 dark:text-rose-300">
                {illusionCount}개
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
              <p className="text-[11px] text-slate-600 dark:text-slate-400">아리송 + 정답 (운 좋은 정답)</p>
              <p className="text-xl font-black font-mono tabular-nums text-amber-700 dark:text-amber-300">
                {luckyCount}개
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] text-slate-600 dark:text-slate-400">아리송 + 오답 (정직한 인지)</p>
              <p className="text-xl font-black font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {honestMissCount}개
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={startNewRound}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>새 라운드 도전</span>
            </button>
            <button
              type="button"
              onClick={onQuit}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>게임 목록으로</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
