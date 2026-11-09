import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Download,
  Search,
  Activity,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  History,
  Mic,
  Clock,
  Layers,
  BarChart2,
  Sliders,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  getAllVoiceHistoryRecords,
  deleteVoiceHistoryRecord,
  clearAllVoiceHistoryRecords,
  formatVoiceRecordedTime,
  TargetVoiceHistoryRecord,
  SavedVoiceSnapshot,
} from '../services/voiceHistoryService';
import {
  audioEngine,
  WordLoopAudioDiagnosticResult,
  AudioEngineStatus,
} from '../services/audioEngine';
import { generateReferenceWaveform } from '../utils/audioWaveformUtils';
import { getCleanKoreanMeaning } from '../utils/meaningUtils';

interface RecordingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPronunciationPractice?: (text: string) => void;
  initialSelectedTarget?: string;
}

export const RecordingHistoryModal: React.FC<RecordingHistoryModalProps> = ({
  isOpen,
  onClose,
  onOpenPronunciationPractice,
  initialSelectedTarget,
}) => {
  const [records, setRecords] = useState<TargetVoiceHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'high' | 'low'>('all');
  const [sortMode, setSortMode] = useState<'newest' | 'score_desc' | 'score_asc'>('newest');

  // Playback state
  const [isPlayingUser, setIsPlayingUser] = useState<boolean>(false);
  const [isPlayingTarget, setIsPlayingTarget] = useState<boolean>(false);
  const [sequentialStep, setSequentialStep] = useState<'idle' | 'native' | 'pause' | 'user'>('idle');
  const [activeDiagnostic, setActiveDiagnostic] = useState<WordLoopAudioDiagnosticResult | null>(null);
  const [engineStatus, setEngineStatus] = useState<AudioEngineStatus | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Stop audio on unmount or close
  const cleanupAudio = useCallback(() => {
    audioEngine.stopAllAudio();
    setIsPlayingUser(false);
    setIsPlayingTarget(false);
    setSequentialStep('idle');
  }, []);

  // Fetch all recordings from storage
  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await getAllVoiceHistoryRecords();
      setRecords(all);

      if (all.length > 0) {
        if (initialSelectedTarget) {
          const match = all.find(
            (r) => r.targetText.toLowerCase() === initialSelectedTarget.toLowerCase()
          );
          setSelectedKey(match ? match.key : all[0].key);
        } else if (!selectedKey) {
          setSelectedKey(all[0].key);
        }
      } else {
        setSelectedKey(null);
      }
    } catch (e) {
      console.warn('Failed to load voice records:', e);
    } finally {
      setIsLoading(false);
    }
  }, [initialSelectedTarget, selectedKey]);

  useEffect(() => {
    if (isOpen) {
      cleanupAudio();
      setEngineStatus(audioEngine.getStatus());
      loadRecords();
    } else {
      cleanupAudio();
    }
  }, [isOpen, loadRecords, cleanupAudio]);

  // Find currently selected record
  const selectedRecord = useMemo(() => {
    if (!selectedKey || records.length === 0) return null;
    return records.find((r) => r.key === selectedKey) || records[0];
  }, [records, selectedKey]);

  // Compute AudioEngine DTW comparison for selected record
  useEffect(() => {
    if (!selectedRecord || !selectedRecord.latest) {
      setActiveDiagnostic(null);
      return;
    }
    let cancelled = false;
    audioEngine
      .compareSnapshotWithTarget(selectedRecord.targetText, selectedRecord.latest)
      .then((diag) => {
        if (!cancelled) {
          setActiveDiagnostic(diag);
        }
      })
      .catch(() => {
        if (!cancelled) setActiveDiagnostic(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRecord]);

  // Filtered & sorted records
  const filteredRecords = useMemo(() => {
    let list = [...records];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.targetText.toLowerCase().includes(q) ||
          (r.latest?.transcript && r.latest.transcript.toLowerCase().includes(q))
      );
    }

    if (filterMode === 'high') {
      list = list.filter((r) => (r.latest?.score || 0) >= 80);
    } else if (filterMode === 'low') {
      list = list.filter((r) => (r.latest?.score || 0) < 80);
    }

    if (sortMode === 'newest') {
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } else if (sortMode === 'score_desc') {
      list.sort((a, b) => (b.latest?.score || 0) - (a.latest?.score || 0));
    } else if (sortMode === 'score_asc') {
      list.sort((a, b) => (a.latest?.score || 0) - (b.latest?.score || 0));
    }

    return list;
  }, [records, searchQuery, filterMode, sortMode]);

  // Playback handlers
  const handlePlayUserAudio = () => {
    if (!selectedRecord?.latest) return;
    if (isPlayingUser || sequentialStep !== 'idle') {
      cleanupAudio();
      return;
    }
    cleanupAudio();
    setIsPlayingUser(true);
    audioEngine.playUserAudio(selectedRecord.latest, () => {
      setIsPlayingUser(false);
    });
  };

  const handlePlayTargetAudio = () => {
    if (!selectedRecord) return;
    if (isPlayingTarget || sequentialStep !== 'idle') {
      cleanupAudio();
      return;
    }
    cleanupAudio();
    setIsPlayingTarget(true);
    audioEngine.playTargetPhrase(selectedRecord.targetText, () => {
      setIsPlayingTarget(false);
    });
  };

  const handlePlaySequential = () => {
    if (!selectedRecord?.latest) return;
    if (sequentialStep !== 'idle') {
      cleanupAudio();
      return;
    }
    cleanupAudio();
    audioEngine.playSequentialComparison(
      selectedRecord.targetText,
      selectedRecord.latest,
      (step) => {
        setSequentialStep(step);
      }
    );
  };

  const handleDeleteRecord = async (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('이 발음 녹음 파일을 보관함에서 삭제하시겠습니까?')) return;
    setIsDeleting(key);
    cleanupAudio();
    try {
      await deleteVoiceHistoryRecord(key);
      const remaining = records.filter((r) => r.key !== key);
      setRecords(remaining);
      if (selectedKey === key) {
        setSelectedKey(remaining.length > 0 ? remaining[0].key : null);
      }
    } catch (err) {
      console.warn('Failed to delete record:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownloadWav = (record: TargetVoiceHistoryRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audioEngine.downloadRecordingWav(record);
  };

  // Base profile reference waveform for comparison display
  const baseProfile = useMemo(() => {
    if (!selectedRecord) return { samples: Array(50).fill(0.3), stressPoints: [] as number[], estimatedDurationSec: 1.2 };
    return generateReferenceWaveform(selectedRecord.targetText);
  }, [selectedRecord]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recording-history-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] sm:max-h-[88vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="recording-history-modal-title"
                  className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate"
                >
                  음성 녹음 보관함 & 오디오 엔진 비교
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Activity className="w-3 h-3 text-blue-500 animate-pulse" />
                  <span>{engineStatus?.engineName || 'AudioEngine DTW 가속'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                저장된 내 발음 PCM 파형을 원어민 기준 표적과 1:1 비교하고 교정 구간을 진단합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadRecords}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          
          {/* LEFT COLUMN: RECORDINGS LIST (5 cols on md) */}
          <div className="md:col-span-5 flex flex-col h-full overflow-hidden bg-slate-50/40 dark:bg-slate-950/20">
            
            {/* Search & Filter Bar */}
            <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="단어 또는 문장 검색..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center justify-between text-[11px] gap-1 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-colors ${
                      filterMode === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    전체 ({records.length})
                  </button>
                  <button
                    onClick={() => setFilterMode('high')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-colors ${
                      filterMode === 'high'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    우수 (80+)
                  </button>
                  <button
                    onClick={() => setFilterMode('low')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-colors ${
                      filterMode === 'low'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    보완 필요
                  </button>
                </div>

                <select
                  value={sortMode}
                  onChange={(e: any) => setSortMode(e.target.value)}
                  className="bg-transparent text-[11px] text-slate-500 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="newest">최신순</option>
                  <option value="score_desc">점수 높은순</option>
                  <option value="score_asc">점수 낮은순</option>
                </select>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Activity className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-xs font-semibold">녹음 데이터베이스 조회 중...</span>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mb-3 shadow-inner">
                    <Mic className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    {searchQuery ? '검색 결과가 없습니다' : '저장된 녹음 파일이 없습니다'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
                    단어장이나 섀도잉 연습에서 마이크를 누르고 발음하면 자동으로 오디오엔진에 기록됩니다.
                  </p>
                  {onOpenPronunciationPractice && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPronunciationPractice('Hello');
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md"
                    >
                      지금 발음 연습하러 가기
                    </button>
                  )}
                </div>
              ) : (
                filteredRecords.map((rec) => {
                  const isSelected = selectedKey === rec.key;
                  const score = rec.latest?.score;
                  const durationSec = rec.latest?.durationSec || 1.2;
                  const timeLabel = formatVoiceRecordedTime(rec.latest?.recordedAt);

                  return (
                    <div
                      key={rec.key}
                      onClick={() => {
                        cleanupAudio();
                        setSelectedKey(rec.key);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer relative text-left group ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800/90 border-indigo-500 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                          : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                            ⏰ {timeLabel}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {rec.targetText}
                          </h4>
                        </div>

                        {score !== undefined && (
                          <div
                            className={`px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${
                              score >= 90
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : score >= 80
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {score}점
                          </div>
                        )}
                      </div>

                      {/* Mini Waveform Preview */}
                      <div className="h-6 w-full flex items-end gap-[1.5px] px-1 py-0.5 bg-slate-100 dark:bg-slate-950/60 rounded-lg overflow-hidden">
                        {(rec.latest?.waveformSamples || Array(50).fill(0.2)).map((s, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 rounded-full transition-all ${
                              isSelected ? 'bg-indigo-500' : 'bg-slate-400 dark:bg-slate-600'
                            }`}
                            style={{ height: `${Math.max(15, Math.min(100, s * 100))}%` }}
                          />
                        ))}
                      </div>

                      {/* Footer Info */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{durationSec.toFixed(1)}초</span>
                          <span>•</span>
                          <span>PCM 16-bit</span>
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleDownloadWav(rec, e)}
                            className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="WAV 다운로드"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteRecord(rec.key, e)}
                            className="p-1 hover:text-rose-500"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* List Footer */}
            {records.length > 0 && (
              <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 bg-white/50 dark:bg-slate-900/50 shrink-0">
                <span>총 {records.length}개 녹음 보관 중</span>
                <button
                  onClick={async () => {
                    if (window.confirm('저장된 모든 녹음 파일을 초기화하시겠습니까?')) {
                      cleanupAudio();
                      await clearAllVoiceHistoryRecords();
                      setRecords([]);
                      setSelectedKey(null);
                    }
                  }}
                  className="text-rose-500 hover:text-rose-600 font-semibold"
                >
                  전체 비우기
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: PRONUNCIATION COMPARISON WORKSPACE (7 cols on md) */}
          <div className="md:col-span-7 flex flex-col h-full overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900">
            {selectedRecord && selectedRecord.latest ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                
                {/* Target Phrase Header */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-blue-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                        표적 원어민 문장 (Target Phrase)
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                        "{selectedRecord.targetText}"
                      </h3>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                        {getCleanKoreanMeaning({ word: selectedRecord.targetText }) || '실시간 발음 평가 대상'}
                      </p>
                    </div>

                    {/* AudioEngine Diagnostic Score Badge */}
                    <div className="text-right shrink-0">
                      <div className="inline-flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400">AudioEngine DTW 점수</span>
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 flex items-baseline gap-0.5">
                          <span>{activeDiagnostic?.overall_score ?? selectedRecord.latest.score ?? 85}</span>
                          <span className="text-xs text-slate-400 font-normal">/ 100</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STT Transcript if present */}
                  {selectedRecord.latest.transcript && (
                    <div className="mt-3 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>내 음성 인식 결과:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-bold truncate">
                        "{selectedRecord.latest.transcript}"
                      </strong>
                    </div>
                  )}
                </div>

                {/* DUAL COMPARATIVE WAVEFORMS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      <span>기준 원어민 파형 vs 내 녹음 음성 비교 (50구간 정규화)</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Sakoe-Chiba DTW 밴드 분석
                    </span>
                  </div>

                  {/* Top: Native Reference Waveform */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>1. 원어민 기준 엔벨로프 (Reference Model)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">음절 강세 포인트 포함</span>
                    </div>

                    <div className="h-10 w-full flex items-end gap-[2px] py-1 bg-white dark:bg-slate-900 rounded-xl px-2 border border-slate-200/50 dark:border-slate-800/50">
                      {baseProfile.samples.map((v, i) => {
                        const isStressPoint = baseProfile.stressPoints?.includes(i);
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-t-sm transition-all ${
                              isStressPoint ? 'bg-amber-500' : 'bg-blue-500 dark:bg-blue-400'
                            }`}
                            style={{ height: `${Math.max(12, v * 100)}%` }}
                            title={`Frame ${i + 1}: ${(v * 100).toFixed(0)}%`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom: User Recorded Waveform */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 relative">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                      <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                        <Mic className="w-3.5 h-3.5" />
                        <span>2. 내 녹음 PCM 엔벨로프 (User Recording)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        길이 {selectedRecord.latest.durationSec.toFixed(1)}초
                      </span>
                    </div>

                    <div className="h-10 w-full flex items-end gap-[2px] py-1 bg-white dark:bg-slate-900 rounded-xl px-2 border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden">
                      {(selectedRecord.latest.waveformSamples || Array(50).fill(0.2)).map((v, i) => {
                        const baseVal = baseProfile.samples[i] || 0.3;
                        const diff = Math.abs(baseVal - v);
                        const barColor =
                          diff <= 0.18
                            ? 'bg-emerald-500'
                            : diff <= 0.35
                            ? 'bg-amber-500'
                            : 'bg-rose-500';

                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-t-sm transition-all ${barColor}`}
                            style={{ height: `${Math.max(12, v * 100)}%` }}
                            title={`Sample ${i + 1}: ${(v * 100).toFixed(0)}% (편차: ${(diff * 100).toFixed(0)}%)`}
                          />
                        );
                      })}
                    </div>

                    {/* Color Legend */}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 px-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>일치 (Match)</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>경미한 편차</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>불일치 구간</span>
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono">
                        {selectedRecord.latest.recordedAt ? new Date(selectedRecord.latest.recordedAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AUDIO CONTROLS & A/B COMPARISON PLAYER */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span>원터치 오디오 비교 청취 (AudioEngine Controller)</span>
                    </span>

                    {sequentialStep !== 'idle' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white animate-pulse">
                        <Activity className="w-3 h-3 animate-spin" />
                        {sequentialStep === 'native' && '[1/2] 원어민 발음 재생 중...'}
                        {sequentialStep === 'pause' && '비교 전환 중 (0.35s)...'}
                        {sequentialStep === 'user' && '[2/2] 내 녹음 음성 재생 중...'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* 1. Sequential A/B Comparison Button */}
                    <button
                      onClick={handlePlaySequential}
                      className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                        sequentialStep !== 'idle'
                          ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {sequentialStep !== 'idle' ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>비교 재생 정지</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>A/B 연속 비교 청취</span>
                        </>
                      )}
                    </button>

                    {/* 2. Play Target Voice Only */}
                    <button
                      onClick={handlePlayTargetAudio}
                      className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border ${
                        isPlayingTarget
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <Volume2 className="w-4 h-4 text-blue-500" />
                      <span>{isPlayingTarget ? '원어민 재생 중' : '원어민 표적 발음'}</span>
                    </button>

                    {/* 3. Play User Voice Only */}
                    <button
                      onClick={handlePlayUserAudio}
                      className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border ${
                        isPlayingUser
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <Mic className="w-4 h-4 text-emerald-500" />
                      <span>{isPlayingUser ? '내 녹음 재생 중' : '내 녹음 음성 듣기'}</span>
                    </button>
                  </div>
                </div>

                {/* AUDIOENGINE DETAILED DIAGNOSTIC METRICS */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-indigo-500" />
                    <span>AudioEngine DSP 정밀 진단 리포트</span>
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center">
                      <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                        피치/억양 정확도
                      </span>
                      <p className="text-base font-black text-blue-600 dark:text-blue-400">
                        {activeDiagnostic?.pitch_accuracy ?? 88}%
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center">
                      <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                        음압/강세 유사도
                      </span>
                      <p className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        {activeDiagnostic?.energy_similarity ?? 84}%
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center">
                      <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                        식별 음절 수
                      </span>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {activeDiagnostic?.syllable_count ?? 2} 음절
                      </p>
                    </div>
                  </div>

                  {/* Fault Range Highlight Banner */}
                  {activeDiagnostic?.inaccurate_end_ms ? (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold block">
                          교정 추천 구간: {activeDiagnostic.inaccurate_start_ms}ms ~ {activeDiagnostic.inaccurate_end_ms}ms
                        </strong>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                          {activeDiagnostic.diagnostic_msg}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-[11px] font-semibold">
                        {activeDiagnostic?.diagnostic_msg || '원어민 발음 모델과 높은 일치도를 보입니다.'}
                      </span>
                    </div>
                  )}
                </div>

                {/* WORKSPACE ACTIONS */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    {onOpenPronunciationPractice && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenPronunciationPractice(selectedRecord.targetText);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/20"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>이 문장 다시 발음 연습하기</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDownloadWav(selectedRecord)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>WAV 다운로드</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteRecord(selectedRecord.key)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="이 녹음 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-slate-400">
                <Layers className="w-10 h-10 mb-2 opacity-50 text-indigo-500" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  좌측 목록에서 녹음 항목을 선택하세요
                </p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  선택한 녹음 파일의 음향 파형과 원어민 기준 엔벨로프의 DTW 1:1 비교 분석이 표시됩니다.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
