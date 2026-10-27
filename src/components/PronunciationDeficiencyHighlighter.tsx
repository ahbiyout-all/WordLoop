import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Clock,
  Activity,
  ArrowRight,
  CheckCircle2,
  Target,
  Zap,
  Mic,
  ChevronDown,
  ChevronUp,
  Sliders,
  Layers,
  HelpCircle,
  Flame,
} from 'lucide-react';
import { speechService } from '../services/speechService';
import { SyllableDiagnostic } from '../utils/audioWaveformUtils';
import {
  analyzeSentencePhonemesAndWaveform,
  PhonemeDiagnostic,
  WaveformBarPhonemeColor,
} from '../utils/phonemeAnalysisUtils';

export interface PronunciationDeficiencyHighlighterProps {
  /** Overall pronunciation score (0~100) */
  score: number;
  /** Target reference text */
  targetText: string;
  /** Recognized user transcript */
  transcript: string;
  /** Syllable-level diagnostics */
  syllableDiagnostics: SyllableDiagnostic[];
  /** Word-level match results */
  wordMatches?: Array<{ word: string; matched: boolean }>;
  /** Recorded audio blob URL */
  userAudioUrl?: string | null;
  /** User 50-sample normalized waveform */
  userWaveformData?: number[];
  /** Reference 50-sample waveform */
  referenceWaveformData?: number[];
  /** Total active speech duration in seconds */
  totalDurationSec?: number;
  /** Currently playing syllable id (if any) */
  playingSyllableId?: string | null;
  /** Callback to play a specific syllable audio slice */
  onPlaySyllableSegment?: (syl: SyllableDiagnostic) => void;
  /** Callback to start recording */
  onStartMicRecording?: () => void;
  /** Callback to select a single word for micro-practice */
  onSelectPracticeWord?: (word: string) => void;
}

export const PronunciationDeficiencyHighlighter: React.FC<PronunciationDeficiencyHighlighterProps> = ({
  score,
  targetText,
  transcript,
  syllableDiagnostics,
  wordMatches = [],
  userAudioUrl,
  userWaveformData = [],
  referenceWaveformData = [],
  totalDurationSec = 1.5,
  playingSyllableId,
  onPlaySyllableSegment,
  onStartMicRecording,
  onSelectPracticeWord,
}) => {
  // Active selected syllable & phoneme for deep-dive inspection
  const [selectedSylId, setSelectedSylId] = useState<string | null>(null);
  const [selectedPhonemeId, setSelectedPhonemeId] = useState<string | null>(null);
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);
  const [isPlayingNativeWord, setIsPlayingNativeWord] = useState<string | null>(null);
  const [isLoopingShadowing, setIsLoopingShadowing] = useState<boolean>(false);
  const [showAllCards, setShowAllCards] = useState<boolean>(false);
  const [phonemeFilter, setPhonemeFilter] = useState<'all' | 'unstableOnly'>('all');

  // Compute 50 fallback sample waves if empty
  const effectiveUserWave = useMemo(() => {
    if (userWaveformData && userWaveformData.length > 0) return userWaveformData;
    return new Array(50).fill(0.18);
  }, [userWaveformData]);

  const effectiveAiWave = useMemo(() => {
    if (referenceWaveformData && referenceWaveformData.length > 0) return referenceWaveformData;
    return new Array(50).fill(0.35);
  }, [referenceWaveformData]);

  // Run phoneme-level acoustic stability decomposition and 50-bar color mapping
  const phonemeAnalysis = useMemo(() => {
    return analyzeSentencePhonemesAndWaveform(
      targetText,
      syllableDiagnostics,
      effectiveUserWave,
      effectiveAiWave
    );
  }, [targetText, syllableDiagnostics, effectiveUserWave, effectiveAiWave]);

  // Filter only deficient syllables (score < 75 or unclear / low_stress / distorted)
  const deficientSyllables = useMemo(() => {
    return syllableDiagnostics.filter((syl) => {
      if (syl.accuracyScore <= 0) return true;
      return syl.accuracyScore < 75 || syl.status === 'unclear' || syl.status === 'low_stress';
    });
  }, [syllableDiagnostics]);

  // Active inspected phoneme
  const activeInspectedPhoneme = useMemo(() => {
    if (selectedPhonemeId) {
      const found = phonemeAnalysis.phonemes.find((p) => p.id === selectedPhonemeId);
      if (found) return found;
    }
    // Default to first unstable or warning phoneme
    return (
      phonemeAnalysis.phonemes.find((p) => p.stability === 'unstable') ||
      phonemeAnalysis.phonemes.find((p) => p.stability === 'warning') ||
      phonemeAnalysis.phonemes[0] ||
      null
    );
  }, [selectedPhonemeId, phonemeAnalysis.phonemes]);

  // Filtered phonemes list
  const displayedPhonemes = useMemo(() => {
    if (phonemeFilter === 'unstableOnly') {
      return phonemeAnalysis.phonemes.filter(
        (p) => p.stability === 'unstable' || p.stability === 'warning'
      );
    }
    return phonemeAnalysis.phonemes;
  }, [phonemeAnalysis.phonemes, phonemeFilter]);

  // If score is 80 or above, this deficiency highlighter component is not triggered
  if (score >= 80) {
    return null;
  }

  const gapTo80 = Math.max(1, 80 - score);
  const duration = Math.max(0.6, totalDurationSec);

  // Play native word pronunciation
  const handlePlayNativeWord = (word: string) => {
    setIsPlayingNativeWord(word);
    speechService.speakOnce(word, 'en-US', 0.9);
    setTimeout(() => {
      setIsPlayingNativeWord(null);
    }, 1200);
  };

  // Shadowing loop for all deficient syllables sequentially
  const handleSequentialShadowing = async () => {
    if (deficientSyllables.length === 0) return;
    setIsLoopingShadowing(true);

    const wordsToPlay = Array.from(new Set(deficientSyllables.map((s) => s.word)));
    for (const w of wordsToPlay) {
      if (!isLoopingShadowing && wordsToPlay.indexOf(w) > 0) break;
      setIsPlayingNativeWord(w);
      speechService.speakOnce(w, 'en-US', 0.85);
      await new Promise((resolve) => setTimeout(resolve, 1400));
    }

    setIsPlayingNativeWord(null);
    setIsLoopingShadowing(false);
  };

  const getDeficiencyAdvice = (syl: SyllableDiagnostic): { label: string; tips: string; action: string } => {
    if (syl.status === 'low_stress' || (syl.isPrimaryStress && syl.userPeak < syl.aiPeak * 0.7)) {
      return {
        label: '강세(Stress) 부족',
        tips: '원어민 발음 대비 피치(음높이)와 볼륨이 낮습니다. 배에 힘을 주고 모음을 더 길고 강하게 소리내세요.',
        action: '강세 강조 연습',
      };
    }
    if (syl.status === 'unclear' || syl.avgDiff > 0.3) {
      return {
        label: '조음(Articulation) 모호',
        tips: '발음 파형이 원어민 음향 기준과 일치하지 않습니다. 입술 모양과 혀끝 위치를 명확히 고정해 발음하세요.',
        action: '조음 위치 교정',
      };
    }
    if (syl.accuracyScore < 50) {
      return {
        label: '음소 탈락 또는 왜곡',
        tips: '단어 끝 자음이나 복모음이 충분히 소리나지 않았습니다. 속도를 조금 늦추고 또박또박 발음해보세요.',
        action: '천천히 발음하기',
      };
    }
    return {
      label: '발음 일치도 미흡',
      tips: '원어민 소리와 내 녹음 구간을 1:1로 비교 청취하며 미세한 억양 차이를 맞춰보세요.',
      action: '구간 반복 청취',
    };
  };

  // Trigger audio playback for parent syllable of a phoneme
  const handlePlayPhonemeParentSyllable = (phoneme: PhonemeDiagnostic) => {
    const parent = syllableDiagnostics.find((s) => s.syllable === phoneme.syllable || s.word === phoneme.word);
    if (parent && onPlaySyllableSegment) {
      onPlaySyllableSegment(parent);
    }
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-indigo-500/10 dark:from-rose-950/40 dark:via-slate-900 dark:to-indigo-950/40 border-2 border-rose-500/40 dark:border-rose-500/50 p-3.5 sm:p-5 space-y-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
      
      {/* 1. Header & Score Gap Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-rose-200/60 dark:border-rose-800/60">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="p-2 rounded-2xl bg-rose-500 text-white shrink-0 shadow-md animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-black text-rose-950 dark:text-rose-100 flex items-center gap-1.5">
                <span>80% 미만 집중 교정 구간 분석</span>
              </h4>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                {score}점 ({gapTo80}점 부족)
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-rose-800 dark:text-rose-300/90 mt-0.5">
              원어민 발음 대비 불안정한 <span className="font-bold underline text-rose-600 dark:text-rose-400">{phonemeAnalysis.unstableCount}개 음소(Phoneme)</span>와 <span className="font-bold underline text-amber-600 dark:text-amber-400">{phonemeAnalysis.warningCount}개 주의 음소</span>의 웨이브폼 색상 변화를 확인하세요.
            </p>
          </div>
        </div>

        {/* Quick Action Button: Sequential Weak Segment Shadowing */}
        <button
          type="button"
          onClick={handleSequentialShadowing}
          className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer ${
            isLoopingShadowing
              ? 'bg-rose-600 text-white ring-2 ring-rose-400 animate-pulse'
              : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-50'
          }`}
          title="부족한 구간의 원어민 단어 발음을 순서대로 연속 청취합니다"
        >
          {isLoopingShadowing ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>부족 구간 연속 재생 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>부족 구간 집중 쉐도잉</span>
            </>
          )}
        </button>
      </div>

      {/* 2. DEDICATED PHONEME-LEVEL AUDIO WAVEFORM COLOR MAP (음소별 웨이브폼 색상 정밀 시각화) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 text-white border border-rose-500/50 shadow-inner space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-500/30 text-indigo-300">
              <Activity className="w-4 h-4" />
            </span>
            <div>
              <h5 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <span>음소(Phoneme)별 오디오 웨이브폼 색상 맵</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/50">
                  불안정 {phonemeAnalysis.unstableCount}개 · 주의 {phonemeAnalysis.warningCount}개
                </span>
              </h5>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                웨이브폼 바의 색상은 해당 음소의 발음 안정도를 나타냅니다. 바 또는 음소를 클릭해 세부 조음 팁을 확인하세요.
              </p>
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-2.5 text-[10px] font-bold">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
              <span>안정(🟢)</span>
            </span>
            <span className="inline-flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
              <span>주의/약함(🟡)</span>
            </span>
            <span className="inline-flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-1 ring-rose-400" />
              <span>불안정/왜곡(🔴)</span>
            </span>
          </div>
        </div>

        {/* 50-Bar Dynamic Waveform Display with Specific Phoneme Color Variations */}
        <div className="relative w-full h-24 sm:h-28 bg-slate-900 rounded-xl p-2 border border-slate-800 flex items-end justify-between gap-[2px] overflow-hidden group">
          {/* Reference Outline Guide Behind Bars */}
          <div className="absolute inset-x-2 bottom-2 top-2 pointer-events-none flex items-end justify-between gap-[2px] opacity-25">
            {phonemeAnalysis.waveformBarColors.map((bar) => {
              const heightPct = Math.max(12, Math.min(100, Math.round(bar.aiAmp * 100)));
              return (
                <div
                  key={`ai-ghost-bar-${bar.barIdx}`}
                  style={{ height: `${heightPct}%` }}
                  className="flex-1 bg-indigo-400/50 rounded-t-sm"
                />
              );
            })}
          </div>

          {/* User Waveform Bars Colored by Phoneme Stability */}
          {phonemeAnalysis.waveformBarColors.map((bar) => {
            const heightPct = Math.max(14, Math.min(100, Math.round(bar.userAmp * 100)));
            const isHovered = hoveredBarIdx === bar.barIdx;
            const isSelected = activeInspectedPhoneme && activeInspectedPhoneme.id === bar.phonemeId;
            const isUnstable = bar.stability === 'unstable';
            const isWarning = bar.stability === 'warning';

            return (
              <button
                key={`colored-bar-${bar.barIdx}`}
                type="button"
                onMouseEnter={() => setHoveredBarIdx(bar.barIdx)}
                onMouseLeave={() => setHoveredBarIdx(null)}
                onClick={() => {
                  setSelectedPhonemeId(bar.phonemeId);
                  const matchedPh = phonemeAnalysis.phonemes.find((p) => p.id === bar.phonemeId);
                  if (matchedPh) {
                    handlePlayPhonemeParentSyllable(matchedPh);
                  }
                }}
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: bar.color,
                }}
                className={`flex-1 rounded-t-sm transition-all relative cursor-pointer select-none ${
                  isSelected
                    ? 'ring-2 ring-white scale-y-105 z-20 shadow-md brightness-125'
                    : isHovered
                    ? 'brightness-125 scale-y-105 z-10'
                    : isUnstable
                    ? 'shadow-xs shadow-rose-500/50 animate-pulse'
                    : ''
                }`}
                title={`바 #${bar.barIdx + 1} | 음소: [${bar.char}] ${bar.ipa} | 진폭: ${Math.round(bar.userAmp * 100)}% | 상태: ${bar.stability}`}
              >
                {/* Flashing Top Dot for Unstable / Peak Bars */}
                {isUnstable && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-xs animate-ping" />
                )}
                {isSelected && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-md" />
                )}
              </button>
            );
          })}
        </div>

        {/* Phoneme Ribbon Strip Aligned Below Waveform */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="font-mono">음소 시퀀스 (IPA 표기 및 조음 상태)</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPhonemeFilter('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  phonemeFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                전체 음소 ({phonemeAnalysis.phonemes.length})
              </button>
              <button
                type="button"
                onClick={() => setPhonemeFilter('unstableOnly')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  phonemeFilter === 'unstableOnly'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                불안정 음소만 ({phonemeAnalysis.unstableCount + phonemeAnalysis.warningCount})
              </button>
            </div>
          </div>

          {/* Interactive Horizontal Phonemes Track */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {displayedPhonemes.map((ph) => {
              const isSelected = activeInspectedPhoneme?.id === ph.id;
              const isUnstable = ph.stability === 'unstable';
              const isWarning = ph.stability === 'warning';

              return (
                <button
                  key={`ribbon-ph-${ph.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedPhonemeId(ph.id);
                    handlePlayPhonemeParentSyllable(ph);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'ring-2 ring-white scale-105 shadow-md bg-slate-800 border-white'
                      : isUnstable
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/80 hover:bg-rose-500/30'
                      : isWarning
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/70 hover:bg-amber-500/30'
                      : 'bg-slate-800/80 text-emerald-300 border-emerald-500/50 hover:bg-slate-700'
                  }`}
                  title={`[${ph.char}] ${ph.ipa} (${ph.accuracyScore}점)`}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-black text-xs">{ph.char}</span>
                    <span className="text-[10px] opacity-75 font-mono">{ph.ipa}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1 rounded-sm mt-0.5 leading-none ${
                      isUnstable
                        ? 'bg-rose-500 text-white'
                        : isWarning
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {ph.accuracyScore}점
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Deep-Dive Phoneme Articulation Card (Active Selected Phoneme) */}
        {activeInspectedPhoneme && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 text-xs space-y-2 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-xl font-mono font-black text-sm flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: activeInspectedPhoneme.color }}
                >
                  {activeInspectedPhoneme.char}
                </span>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-sm font-black text-white">
                      [{activeInspectedPhoneme.char}] {activeInspectedPhoneme.ipa}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                      {activeInspectedPhoneme.categoryLabel}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.2 rounded-full ${
                        activeInspectedPhoneme.stability === 'unstable'
                          ? 'bg-rose-500 text-white'
                          : activeInspectedPhoneme.stability === 'warning'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {activeInspectedPhoneme.stability === 'unstable'
                        ? '🚨 발음 불안정'
                        : activeInspectedPhoneme.stability === 'warning'
                        ? '⚠️ 주의 구간'
                        : '🟢 안정'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    단어: <span className="text-white font-bold">"{activeInspectedPhoneme.word}"</span> · 웨이브폼 바 #{activeInspectedPhoneme.startBarIdx + 1}~#{activeInspectedPhoneme.endBarIdx + 1} ({activeInspectedPhoneme.startPercent}%~{activeInspectedPhoneme.endPercent}%)
                  </span>
                </div>
              </div>

              {/* Play Audio Controls for Inspected Phoneme */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handlePlayNativeWord(activeInspectedPhoneme.word)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>원어민 단어</span>
                </button>

                {userAudioUrl && (
                  <button
                    type="button"
                    onClick={() => handlePlayPhonemeParentSyllable(activeInspectedPhoneme)}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>내 음소 구간 재생</span>
                  </button>
                )}
              </div>
            </div>

            {/* Phoneme Coaching Advice & Detected Defect */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-rose-400 font-bold block mb-0.5">
                  🔍 진단된 음향 결함:
                </span>
                <span className="text-slate-200">
                  {activeInspectedPhoneme.issueTitle || '원어민 표준 음향 포먼트 및 에너지 격차 발생'}
                </span>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>원어민 피크: {Math.round(activeInspectedPhoneme.aiPeak * 100)}%</span>
                  <span>내 피크: {Math.round(activeInspectedPhoneme.userPeak * 100)}%</span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-amber-400 font-bold block mb-0.5">
                  💡 맞춤 조음(입모양/혀 위치) 코칭:
                </span>
                <span className="text-slate-300 leading-snug">
                  {activeInspectedPhoneme.coachingTip}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Visual Audio Timeline Ruler & Deficient Interval Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 px-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-500" />
            <span>발화 타임라인 (0.00s ~ {duration.toFixed(2)}s)</span>
          </span>
          <span className="text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>붉은색 음절 = 교정 필요 (터치 시 해당 구간 즉시 청취)</span>
          </span>
        </div>

        {/* Visual Timeline Track */}
        <div className="relative w-full h-11 sm:h-12 bg-slate-900/90 dark:bg-slate-950 rounded-2xl p-1 border border-rose-500/40 shadow-inner flex items-center overflow-hidden">
          {/* Background Timeline Grid Lines */}
          <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20 px-2">
            {[0, 25, 50, 75, 100].map((tick) => (
              <div key={tick} className="h-full border-r border-slate-400 flex flex-col justify-between py-1">
                <span className="text-[8px] font-mono text-slate-300">{((tick / 100) * duration).toFixed(1)}s</span>
              </div>
            ))}
          </div>

          {/* Interactive Syllable & Segment Blocks */}
          <div className="relative w-full h-full flex items-center z-10">
            {syllableDiagnostics.map((syl) => {
              const widthPct = Math.max(7, Math.min(100, syl.endPercent - syl.startPercent));
              const isDeficient = syl.accuracyScore < 75 || syl.status === 'unclear' || syl.status === 'low_stress';
              const isSelected = selectedSylId === syl.id;
              const isPlaying = playingSyllableId === syl.id;

              return (
                <div
                  key={`timeline-syl-${syl.id}`}
                  style={{
                    left: `${syl.startPercent}%`,
                    width: `${widthPct}%`,
                  }}
                  className="absolute top-0.5 bottom-0.5 px-0.5 transition-all"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSylId(syl.id);
                      if (onPlaySyllableSegment && userAudioUrl) {
                        onPlaySyllableSegment(syl);
                      }
                    }}
                    className={`w-full h-full rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none group relative ${
                      isDeficient
                        ? 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-md ring-2 ring-rose-400/80 animate-pulse'
                        : 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 border border-emerald-500/40'
                    } ${isSelected ? 'ring-4 ring-amber-400 scale-[1.03] z-20 shadow-lg' : ''} ${
                      isPlaying ? 'ring-4 ring-white animate-bounce' : ''
                    }`}
                    title={`[${syl.syllable}] (${syl.accuracyScore}점) - ${((syl.startPercent / 100) * duration).toFixed(2)}s~${((syl.endPercent / 100) * duration).toFixed(2)}s`}
                  >
                    <span className="font-mono font-black text-[10px] sm:text-xs truncate max-w-full px-0.5 leading-none">
                      {syl.syllable}
                    </span>
                    <span className="text-[8px] font-mono font-bold opacity-90 mt-0.5 leading-none">
                      {syl.accuracyScore > 0 ? `${syl.accuracyScore}점` : '미흡'}
                    </span>

                    {/* Deficient Pulse Indicator Pin */}
                    {isDeficient && (
                      <span className="absolute -top-1 right-0.5 w-2 h-2 rounded-full bg-amber-300 border border-slate-950 animate-ping" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend / Status Helper */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500" />
              <span>양호 (75점 이상)</span>
            </span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
              <span className="w-2.5 h-2.5 rounded bg-rose-500 ring-1 ring-rose-400" />
              <span>부족 구간 (집중 교정 대상)</span>
            </span>
          </div>

          <span className="text-[10px] text-slate-400">
            음절 블록을 클릭하면 해당 오디오 구간만 즉시 청취됩니다.
          </span>
        </div>
      </div>

      {/* 5. Detailed Deficiency Cards List */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <h5 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Target className="w-4 h-4 text-rose-500" />
            <span>부족 구간별 원인 분석 & 맞춤 교정 가이드 ({deficientSyllables.length}개)</span>
          </h5>

          {deficientSyllables.length > 2 && (
            <button
              type="button"
              onClick={() => setShowAllCards((prev) => !prev)}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>{showAllCards ? '접기' : `전체 보기 (${deficientSyllables.length}개)`}</span>
              {showAllCards ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {(showAllCards ? deficientSyllables : deficientSyllables.slice(0, 3)).map((syl) => {
            const isPlayingThis = playingSyllableId === syl.id;
            const isNativePlaying = isPlayingNativeWord === syl.word;
            const advice = getDeficiencyAdvice(syl);
            const startSec = Math.max(0, (syl.startPercent / 100) * duration);
            const endSec = Math.min(duration, Math.max(startSec + 0.15, (syl.endPercent / 100) * duration));

            // Acoustic energy discrepancy percentage
            const energyGapPct = Math.round(Math.abs(syl.aiPeak - syl.userPeak) * 100);

            return (
              <div
                key={`deficiency-card-${syl.id}`}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
                  selectedSylId === syl.id
                    ? 'bg-rose-500/15 dark:bg-rose-950/70 border-rose-500 ring-2 ring-rose-500/40 shadow-md'
                    : 'bg-white dark:bg-slate-900/90 border-rose-200 dark:border-rose-900/50 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  
                  {/* Left: Syllable Info & Time Range */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-rose-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {syl.syllable}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                          단어: <span className="text-indigo-600 dark:text-indigo-400">"{syl.word}"</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200 font-extrabold">
                          정확도: {syl.accuracyScore}점
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                          <Sliders className="w-2.5 h-2.5" />
                          <span>{advice.label}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-mono">
                          구간: {startSec.toFixed(2)}s ~ {endSec.toFixed(2)}s ({((endSec - startSec) * 1000).toFixed(0)}ms)
                        </span>
                        {syl.isPrimaryStress && (
                          <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-0.5">
                            <Zap className="w-3 h-3 fill-current" />
                            <span>제1강세 음절</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Audio Control Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
                    {/* Native Word Audio */}
                    <button
                      type="button"
                      onClick={() => handlePlayNativeWord(syl.word)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 border ${
                        isNativePlaying
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs animate-pulse'
                          : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                      }`}
                      title={`원어민의 '${syl.word}' 정확한 발음 듣기`}
                    >
                      <Volume2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{isNativePlaying ? '원어민 재생중' : '원어민 소리'}</span>
                    </button>

                    {/* User Syllable Slice Audio */}
                    <button
                      type="button"
                      disabled={!userAudioUrl}
                      onClick={() => {
                        setSelectedSylId(syl.id);
                        if (onPlaySyllableSegment) {
                          onPlaySyllableSegment(syl);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all active:scale-95 shadow-xs border ${
                        !userAudioUrl
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300'
                          : isPlayingThis
                          ? 'bg-rose-600 text-white border-rose-500 animate-pulse ring-2 ring-rose-400'
                          : 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
                      }`}
                      title={`내 녹음 중 '${syl.syllable}' 발음 구간만 다시 듣기`}
                    >
                      {isPlayingThis ? (
                        <>
                          <Pause className="w-3 h-3 shrink-0" />
                          <span>정지</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current shrink-0" />
                          <span>내 발음 구간</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Acoustic Energy Bar Comparison & Coaching Advice */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    {/* Native vs User Acoustic Energy Bar */}
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-600 dark:text-slate-300">음향 파형 에너지 대조</span>
                        <span className="text-rose-600 dark:text-rose-400 font-mono">격차: {energyGapPct}%</span>
                      </div>
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">원어민</span>
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.round(syl.aiPeak * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-500 w-6 text-right">
                            {Math.round(syl.aiPeak * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-10 text-rose-600 dark:text-rose-400 font-bold shrink-0">내 발음</span>
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${Math.round(syl.userPeak * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-500 w-6 text-right">
                            {Math.round(syl.userPeak * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Specific Actionable Coaching Advice */}
                    <div className="p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>교정 가이드 ({advice.action})</span>
                        </span>
                        <p className="text-[11px] text-amber-900 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                          {advice.tips}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Bottom Retry Advice Banner */}
      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
          <span className="text-[11px] font-medium">
            원어민 소리와 음소별 웨이브폼 색상을 참고하여, 붉은색 불안정 음소를 또렷하게 다시 발음해 보세요!
          </span>
        </div>

        {onStartMicRecording && (
          <button
            type="button"
            onClick={onStartMicRecording}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ml-auto cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 shrink-0" />
            <span>부족 구간 신경 써서 다시 녹음</span>
          </button>
        )}
      </div>

    </div>
  );
};
