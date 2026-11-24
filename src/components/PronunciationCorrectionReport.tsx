import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import {
  PhonemeCorrectionErrorType,
  PhonemeErrorItem,
  PhonemeMouthFocus,
  PronunciationCorrectionReport as ReportData,
} from '../types';
import { speechService } from '../services/speechService';
import {
  AiPronunciationAuthError,
  requestAiPronunciationReport,
} from '../services/pronunciationReportService';

export interface PronunciationCorrectionReportProps {
  localReport: ReportData | null;
  targetText: string;
  recognizedText: string;
  audioBlob?: Blob | null;
  hasUserAudio?: boolean;
  onPlayTimeSlice?: (startPercent: number, endPercent: number, idKey: string) => void;
  playingSliceKey?: string | null;
  compact?: boolean;
}

const ERROR_TYPE_LABEL: Record<PhonemeCorrectionErrorType, string> = {
  accurate: '정확',
  substitution: '음소 치환',
  omission: '음소 탈락',
  distortion: '조음 왜곡',
  weak_stress: '강세 약화',
};

const MOUTH_FOCUS_LABEL: Record<PhonemeMouthFocus, string> = {
  interdental: '치간 (윗니·아랫니 사이) 마찰',
  alveolar: '치조 (윗니 뒤 잇몸) 접촉·마찰',
  lips_teeth: '순치 (윗니·아랫입술) 마찰',
  bilabial: '양순 (두 입술) 폐쇄·개방',
  velar: '연구개 (입천장 뒤) 파열·비음',
  retroflex_r: '권설 (혀끝 띄워 말기) /r/',
  vowel_open: '개방 모음 (턱 내림·입 크게)',
  vowel_spread: '전설 모음 (입꼬리 당김·혀 높임)',
  glottal: '성문 (목구멍 열린 기류)',
};

const MouthArticulationDiagram: React.FC<{
  focus: PhonemeMouthFocus;
  severity: PhonemeErrorItem['severity'];
}> = ({ focus, severity }) => {
  const accentColor =
    severity === 'critical' ? '#E11D48' : severity === 'moderate' ? '#D97706' : '#059669';

  // Dynamic tongue path in 160x120 sagittal oral-cavity view (facing left)
  const tonguePath = useMemo(() => {
    switch (focus) {
      case 'interdental':
        // Tongue tip extends subtly between upper and lower front teeth
        return 'M 30 67 Q 58 62 90 66 Q 124 72 140 94 L 140 108 L 56 108 Q 48 88 30 67 Z';
      case 'alveolar':
        // Tongue tip rises firmly to alveolar ridge just behind upper teeth
        return 'M 52 50 Q 75 56 102 64 Q 128 74 140 96 L 140 108 L 56 108 Q 52 76 52 50 Z';
      case 'retroflex_r':
        // Tongue body bunched back, tip curled slightly up without touching palate
        return 'M 64 56 Q 82 68 106 58 Q 128 66 140 94 L 140 108 L 60 108 Q 58 76 64 56 Z';
      case 'velar':
        // Tongue dorsum raises toward soft palate at the back
        return 'M 54 78 Q 84 68 112 44 Q 130 56 140 90 L 140 108 L 56 108 Z';
      case 'vowel_open':
        // Jaw lowered, tongue rests flat and low
        return 'M 50 86 Q 85 82 122 86 Q 134 92 140 102 L 140 108 L 52 108 Z';
      case 'vowel_spread':
        // High front tongue arch
        return 'M 48 64 Q 76 48 110 64 Q 130 76 140 96 L 140 108 L 52 108 Z';
      case 'lips_teeth':
      case 'bilabial':
      case 'glottal':
      default:
        // Neutral resting tongue
        return 'M 52 74 Q 82 66 116 74 Q 132 82 140 96 L 140 108 L 54 108 Z';
    }
  }, [focus]);

  const highlightCircle = useMemo(() => {
    switch (focus) {
      case 'interdental':
        return { cx: 36, cy: 66, r: 10 };
      case 'lips_teeth':
        return { cx: 34, cy: 64, r: 10 };
      case 'bilabial':
        return { cx: 27, cy: 66, r: 10 };
      case 'alveolar':
        return { cx: 52, cy: 48, r: 10 };
      case 'retroflex_r':
        return { cx: 70, cy: 56, r: 11 };
      case 'velar':
        return { cx: 112, cy: 44, r: 11 };
      case 'glottal':
        return { cx: 132, cy: 96, r: 10 };
      case 'vowel_open':
        return { cx: 76, cy: 84, r: 12 };
      case 'vowel_spread':
        return { cx: 76, cy: 54, r: 11 };
    }
  }, [focus]);

  const showAirflowArrow =
    focus === 'interdental' || focus === 'lips_teeth' || focus === 'alveolar' || focus === 'glottal';

  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-3">
      <svg
        viewBox="0 0 160 116"
        className="w-full max-w-[200px] h-auto"
        role="img"
        aria-label={`조음 위치 시각화: ${MOUTH_FOCUS_LABEL[focus] || MOUTH_FOCUS_LABEL.alveolar}`}
      >
        {/* Outer oral cavity backdrop */}
        <path
          d="M 22 44 Q 60 22 126 30 L 144 106 L 42 106 Q 34 86 24 72"
          fill="none"
          stroke="currentColor"
          className="text-slate-300 dark:text-slate-700"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Hard palate & alveolar ridge */}
        <path
          d="M 40 48 Q 52 44 64 38 Q 96 28 124 42"
          fill="none"
          stroke="currentColor"
          className="text-slate-400 dark:text-slate-500"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Upper Lip */}
        <path
          d={focus === 'bilabial' ? 'M 22 48 Q 32 56 36 62' : 'M 22 46 Q 30 52 36 55'}
          fill="none"
          stroke="currentColor"
          className="text-slate-600 dark:text-slate-300"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Lower Lip (touches upper teeth for lips_teeth /f,v/, meets upper lip for bilabial) */}
        <path
          d={
            focus === 'lips_teeth'
              ? 'M 24 72 Q 33 65 39 63'
              : focus === 'bilabial'
              ? 'M 22 72 Q 30 64 36 62'
              : focus === 'vowel_open'
              ? 'M 26 84 Q 34 84 42 82'
              : 'M 24 76 Q 32 76 40 74'
          }
          fill="none"
          stroke="currentColor"
          className="text-slate-600 dark:text-slate-300"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Upper front tooth */}
        <rect
          x="37"
          y="49"
          width="5"
          height="13"
          rx="1.5"
          className="fill-white dark:fill-slate-100 stroke-slate-400 dark:stroke-slate-500"
          strokeWidth="1.2"
        />

        {/* Lower front tooth */}
        <rect
          x="39"
          y={focus === 'vowel_open' ? 76 : 70}
          width="5"
          height="11"
          rx="1.5"
          className="fill-white dark:fill-slate-100 stroke-slate-400 dark:stroke-slate-500"
          strokeWidth="1.2"
        />

        {/* Dynamic Tongue */}
        <path
          d={tonguePath}
          fill={accentColor}
          fillOpacity="0.22"
          stroke={accentColor}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Target Articulation Focus Ring */}
        <circle
          cx={highlightCircle.cx}
          cy={highlightCircle.cy}
          r={highlightCircle.r}
          fill={accentColor}
          fillOpacity="0.14"
          stroke={accentColor}
          strokeWidth="1.6"
          strokeDasharray="3 2"
        />
        <circle cx={highlightCircle.cx} cy={highlightCircle.cy} r="2.8" fill={accentColor} />

        {/* Airflow indicator */}
        {showAirflowArrow && (
          <g stroke={accentColor} strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M 86 64 Q 56 60 12 63" strokeDasharray="3 2" />
            <path d="M 18 59 L 11 63 L 18 67" />
          </g>
        )}
      </svg>

      <span className="mt-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 text-center">
        {MOUTH_FOCUS_LABEL[focus] || MOUTH_FOCUS_LABEL.alveolar}
      </span>
    </div>
  );
};

export const PronunciationCorrectionReport: React.FC<PronunciationCorrectionReportProps> = ({
  localReport,
  targetText,
  recognizedText,
  audioBlob,
  hasUserAudio = false,
  onPlayTimeSlice,
  playingSliceKey,
  compact = false,
}) => {
  const [aiReport, setAiReport] = useState<ReportData | null>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'success' | 'no_key' | 'error'>('idle');
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);
  const [filterWeakOnly, setFilterWeakOnly] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastAutoSignatureRef = useRef<string>('');
  const pairTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (pairTimerRef.current) clearTimeout(pairTimerRef.current);
      if (autoDebounceTimerRef.current) clearTimeout(autoDebounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Reset AI report when target/recognized transcript changes
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (autoDebounceTimerRef.current) {
      clearTimeout(autoDebounceTimerRef.current);
      autoDebounceTimerRef.current = null;
    }
    setAiReport(null);
    setAiStatus('idle');
    setAiErrorMsg(null);
    setSelectedId(null);
    setFilterWeakOnly(false);
    lastAutoSignatureRef.current = '';
  }, [targetText, recognizedText]);

  const runAiPhonemeAnalysis = async (isManualTrigger: boolean) => {
    if (!targetText.trim()) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAiStatus('loading');
    setAiErrorMsg(null);
    try {
      const report = await requestAiPronunciationReport({
        targetText,
        recognizedText,
        audioBlob,
        localReport,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      // Merge timing & waveform peaks from local acoustic alignment by matching word + grapheme
      const localItems = localReport?.phonemeItems || [];
      const enrichedItems: PhonemeErrorItem[] = report.phonemeItems.map((aiItem, idx) => {
        const cleanWord = aiItem.word.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanGrapheme = aiItem.grapheme.toLowerCase().replace(/[^a-z]/g, '');
        const matchedLocal =
          localItems.find(
            (l) =>
              l.word.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanWord &&
              l.grapheme.toLowerCase().replace(/[^a-z]/g, '') === cleanGrapheme
          ) ||
          localItems.find((l) => l.word.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanWord) ||
          localItems[idx];

        return {
          ...aiItem,
          startPercent: matchedLocal?.startPercent,
          endPercent: matchedLocal?.endPercent,
          aiPeak: matchedLocal?.aiPeak,
          userPeak: matchedLocal?.userPeak,
        };
      });

      setAiReport({
        ...report,
        phonemeItems: enrichedItems,
      });
      setAiStatus('success');
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      if (err instanceof AiPronunciationAuthError) {
        setAiStatus('no_key');
        if (isManualTrigger) {
          setAiErrorMsg(err.message);
        }
      } else {
        setAiStatus('error');
        setAiErrorMsg(err?.message || 'AI 음소 정밀 분석 중 오류가 발생했습니다.');
      }
    }
  };

  // Automatically attempt AI multimodal phoneme upgrade once per new evaluation (debounced 250ms so audioBlob settles cleanly)
  useEffect(() => {
    if (!localReport || !targetText.trim()) return;
    const signature = `${targetText}::${recognizedText}::${audioBlob ? audioBlob.size : 0}`;
    if (lastAutoSignatureRef.current === signature) return;

    if (autoDebounceTimerRef.current) {
      clearTimeout(autoDebounceTimerRef.current);
    }
    const delayMs = audioBlob ? 60 : 250;
    autoDebounceTimerRef.current = setTimeout(() => {
      lastAutoSignatureRef.current = signature;
      runAiPhonemeAnalysis(false);
    }, delayMs);

    return () => {
      if (autoDebounceTimerRef.current) {
        clearTimeout(autoDebounceTimerRef.current);
        autoDebounceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localReport, targetText, recognizedText, audioBlob]);

  const activeReport = aiReport || localReport;

  const groupedWords = useMemo(() => {
    if (!activeReport) return [];
    const groups: Array<{ word: string; items: PhonemeErrorItem[]; hasIssue: boolean }> = [];
    activeReport.phonemeItems.forEach((item) => {
      const normalized = item.word.trim();
      if (filterWeakOnly && item.severity === 'good') return;
      const last = groups[groups.length - 1];
      if (!last || last.word.toLowerCase() !== normalized.toLowerCase()) {
        groups.push({
          word: normalized,
          items: [item],
          hasIssue: item.severity !== 'good',
        });
      } else {
        last.items.push(item);
        if (item.severity !== 'good') last.hasIssue = true;
      }
    });
    return groups;
  }, [activeReport, filterWeakOnly]);

  const selectedPhoneme = useMemo(() => {
    if (!activeReport || activeReport.phonemeItems.length === 0) return null;
    if (selectedId) {
      const found = activeReport.phonemeItems.find((p) => p.id === selectedId);
      if (found) return found;
    }
    return (
      activeReport.phonemeItems.find((p) => p.severity === 'critical') ||
      activeReport.phonemeItems.find((p) => p.severity === 'moderate') ||
      activeReport.phonemeItems[0]
    );
  }, [activeReport, selectedId]);

  const handlePlayMinimalPair = (wordA: string, wordB: string) => {
    if (pairTimerRef.current) clearTimeout(pairTimerRef.current);
    speechService.stop();
    speechService.speakWithCallbacks(wordA, {
      rate: 0.8,
      lang: 'en-US',
      onEnd: () => {
        if (wordB && wordB.toLowerCase() !== wordA.toLowerCase()) {
          pairTimerRef.current = setTimeout(() => {
            speechService.speakOnce(wordB, 'en-US', 0.8);
          }, 420);
        }
      },
    });
  };

  if (!activeReport || activeReport.phonemeItems.length === 0) return null;

  const issueCount = activeReport.stats.criticalCount + activeReport.stats.moderateCount;

  return (
    <section
      aria-label="음소 단위 발음 교정 리포트"
      className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${
        compact ? 'p-3.5 space-y-3' : 'p-4 sm:p-5 space-y-4'
      } shadow-xs`}
    >
      {/* 1. Header & Phoneme Summary Metrics */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              발음 교정 리포트
            </h4>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              {activeReport.source === 'ai'
                ? activeReport.providerName ||
                  (audioBlob
                    ? 'Gemini AI 오디오 청취 정밀 진단'
                    : '무료 AI 음소 정밀 진단')
                : '음향·음소 정렬 리포트'}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {activeReport.overallSummary}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[11px] font-semibold tabular-nums">
            <span className="text-rose-600 dark:text-rose-400">
              오류·치환 {activeReport.stats.criticalCount}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-amber-600 dark:text-amber-400">
              약화·주의 {activeReport.stats.moderateCount}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              정확 {activeReport.stats.accurateCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {issueCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterWeakOnly((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                filterWeakOnly
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {filterWeakOnly ? '전체 음소 보기' : `교정 필요만 (${issueCount})`}
            </button>
          )}

          <button
            type="button"
            onClick={() => runAiPhonemeAnalysis(true)}
            disabled={aiStatus === 'loading'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-[11px] font-bold transition-colors cursor-pointer"
          >
            {aiStatus === 'loading' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI 분석 중</span>
              </>
            ) : (
              <>
                {aiReport ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{aiReport ? 'AI 재분석' : 'AI 음소 정밀 분석'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Explicit Error or Missing-Key Info Notice */}
      {aiStatus === 'no_key' && !aiErrorMsg && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
          <span>
            현재 개인 Gemini 키 전용 모드입니다. 상단 [무료 AI 엔진 · API 키] 설정에서 &apos;무료 AI 자동 체인&apos;을 선택하면 API 키 없이도 AI 음소 정밀 분석을 이용할 수 있습니다.
          </span>
        </div>
      )}

      {aiErrorMsg && (
        <div
          role="alert"
          className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{aiErrorMsg}</span>
          </span>
          <button
            type="button"
            onClick={() => setAiErrorMsg(null)}
            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50"
            aria-label="오류 안내 닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Word-Grouped Interactive Phoneme Track */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="font-bold text-slate-700 dark:text-slate-200">
            음소별 발음 판정 맵 (음소를 누르면 혀·입술 교정 위치를 표시합니다)
          </span>
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium">
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-3 h-3" /> 치환·누락
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" /> 약화·주의
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> 정확
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {groupedWords.map((group, gIdx) => (
            <div
              key={`${group.word}-${gIdx}`}
              className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 p-2 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 px-0.5">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {group.word}
                </span>
                <button
                  type="button"
                  onClick={() => speechService.speakOnce(group.word, 'en-US', 0.85)}
                  className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  title={`${group.word} 원어민 발음 듣기`}
                >
                  <Volume2 className="w-3 h-3" />
                  <span>듣기</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => {
                  const isSelected = selectedPhoneme?.id === item.id;
                  const hasSubstitution =
                    item.spokenIpa &&
                    item.expectedIpa &&
                    item.spokenIpa !== item.expectedIpa &&
                    item.severity !== 'good';

                  const toneClasses =
                    item.severity === 'critical'
                      ? isSelected
                        ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-500/30'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700 hover:border-rose-500'
                      : item.severity === 'moderate'
                      ? isSelected
                        ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-500/30'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:border-amber-500'
                      : isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/30'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-500';

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`min-h-[44px] min-w-[56px] px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${toneClasses}`}
                    >
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <span className="font-mono font-black text-xs">{item.grapheme}</span>
                        {item.severity === 'critical' ? (
                          <AlertCircle className="w-3 h-3 shrink-0" />
                        ) : item.severity === 'moderate' ? (
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 shrink-0 opacity-75" />
                        )}
                      </div>
                      <div className="font-mono text-[10px] leading-tight mt-0.5 tabular-nums flex items-center gap-0.5">
                        {hasSubstitution ? (
                          <>
                            <span className="font-bold">{item.expectedIpa}</span>
                            <ArrowRight className="w-2.5 h-2.5 shrink-0" />
                            <span className="font-bold underline">{item.spokenIpa}</span>
                          </>
                        ) : (
                          <span>{item.expectedIpa}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Two-Zone Articulation Inspection Stage */}
      {selectedPhoneme && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Left Zone: Mouth / Articulation SVG Canvas */}
          <div className="md:col-span-4">
            <MouthArticulationDiagram
              focus={selectedPhoneme.mouthFocus}
              severity={selectedPhoneme.severity}
            />
          </div>

          {/* Right Zone: Phoneme Diagnosis & Drill Controls */}
          <div className="md:col-span-8 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                    {selectedPhoneme.word} · [{selectedPhoneme.grapheme}]
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    목표 {selectedPhoneme.expectedIpa}
                    {selectedPhoneme.spokenIpa &&
                    selectedPhoneme.spokenIpa !== selectedPhoneme.expectedIpa
                      ? ` → 인식 ${selectedPhoneme.spokenIpa}`
                      : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold tabular-nums">
                  <span
                    className={
                      selectedPhoneme.severity === 'critical'
                        ? 'text-rose-600 dark:text-rose-400'
                        : selectedPhoneme.severity === 'moderate'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    {ERROR_TYPE_LABEL[selectedPhoneme.errorType] || '조음 점검'} · {selectedPhoneme.accuracyScore}점
                  </span>
                </div>
              </div>

              {/* Acoustic Energy Comparison if waveform data present */}
              {typeof selectedPhoneme.userPeak === 'number' &&
                typeof selectedPhoneme.aiPeak === 'number' && (
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>성량 에너지 비교</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                      <div
                        className="h-full bg-indigo-400/50 absolute inset-y-0 left-0"
                        style={{ width: `${Math.min(100, Math.round(selectedPhoneme.aiPeak * 100))}%` }}
                      />
                      <div
                        className={`h-full relative ${
                          selectedPhoneme.severity === 'critical'
                            ? 'bg-rose-500'
                            : selectedPhoneme.severity === 'moderate'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round(selectedPhoneme.userPeak * 100))}%`,
                        }}
                      />
                    </div>
                    <span>
                      내 소리 {Math.round(selectedPhoneme.userPeak * 100)}% / 기준{' '}
                      {Math.round(selectedPhoneme.aiPeak * 100)}%
                    </span>
                  </div>
                )}

              <div className="space-y-1.5 text-xs">
                <p className="text-slate-800 dark:text-slate-100 font-semibold leading-relaxed">
                  {selectedPhoneme.diagnosis}
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1">
                    조음 교정법:
                  </span>
                  {selectedPhoneme.articulationCue}
                </p>
              </div>
            </div>

            {/* Audio Comparison & Minimal-Pair Action Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => speechService.speakOnce(selectedPhoneme.word, 'en-US', 0.8)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>원어민 단어 듣기</span>
              </button>

              {hasUserAudio &&
                onPlayTimeSlice &&
                typeof selectedPhoneme.startPercent === 'number' &&
                typeof selectedPhoneme.endPercent === 'number' && (
                  <button
                    type="button"
                    onClick={() =>
                      onPlayTimeSlice(
                        selectedPhoneme.startPercent!,
                        selectedPhoneme.endPercent!,
                        selectedPhoneme.id
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      playingSliceKey === selectedPhoneme.id
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {playingSliceKey === selectedPhoneme.id ? '구간 재생 중' : '내 발음 구간 듣기'}
                    </span>
                  </button>
                )}

              {selectedPhoneme.minimalPairWord &&
                selectedPhoneme.minimalPairWord.toLowerCase() !==
                  selectedPhoneme.word.toLowerCase() && (
                  <button
                    type="button"
                    onClick={() =>
                      handlePlayMinimalPair(selectedPhoneme.word, selectedPhoneme.minimalPairWord!)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>
                      대립쌍 비교: {selectedPhoneme.word} ↔ {selectedPhoneme.minimalPairWord}
                    </span>
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Minimal-Pair Contrast Drills Footer */}
      {activeReport.practiceDrills.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
            맞춤 음소 교정 최소대립쌍 연습
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeReport.practiceDrills.map((drill, idx) => (
              <div
                key={`drill-${idx}-${drill.pairA}`}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
                    <span>{drill.pairA}</span>
                    <span className="text-slate-400">↔</span>
                    <span>{drill.pairB}</span>
                    <span className="font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                      {drill.focusIpa}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {drill.tip}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlayMinimalPair(drill.pairA, drill.pairB)}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold shrink-0 cursor-pointer inline-flex items-center gap-1"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>비교 듣기</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
