import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  GitMerge,
  RefreshCw,
} from 'lucide-react';
import { UserProfile, VocabItem, SentenceItem, Goal, DailyGoalHistory } from '../types';
import {
  DeviceStorageStats,
  JsonBackupPreview,
  getDeviceStorageStats,
  cleanupRedundantStorageCache,
  exportVersionedAllDataToFile,
  parseAndPreviewJsonBackup,
  applyBackupImport,
  formatByteSize,
} from '../services/deviceStorageService';

interface JsonBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  onApplyImportedState: (nextState: {
    userProfile: UserProfile | null;
    vocabList: VocabItem[];
    sentenceList: SentenceItem[];
    goals: Goal[];
    history: DailyGoalHistory[];
    totalRepeatsCount: number;
  }) => void;
}

export const JsonBackupModal: React.FC<JsonBackupModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  vocabList,
  sentenceList,
  goals,
  history,
  totalRepeatsCount,
  onApplyImportedState,
}) => {
  const [stats, setStats] = useState<DeviceStorageStats>(() => getDeviceStorageStats());
  const [preview, setPreview] = useState<JsonBackupPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStats(getDeviceStorageStats());
      setPreview(null);
      setImportError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportV2 = () => {
    const manifest = exportVersionedAllDataToFile({
      userProfile,
      vocabList,
      sentenceList,
      goals,
      history,
      totalRepeatsCount,
    });
    setStats(getDeviceStorageStats());
    window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
    setStatusMessage(
      `v${manifest.appVersion} 무결성 JSON 백업 저장 완료 (${manifest.statsSummary.vocabCount}단어 · 체크섬 ${manifest.checksum.slice(0, 8)})`
    );
  };

  const handleCleanupCache = () => {
    const { freedBytes, removedKeys, compactedKeys } = cleanupRedundantStorageCache({
      vocabList,
      sentenceList,
    });
    const nextStats = getDeviceStorageStats();
    setStats(nextStats);
    window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
    if (removedKeys.length > 0 || compactedKeys.length > 0) {
      setStatusMessage(
        `캐시 · 중복 스냅샷 정리 완료: ${formatByteSize(freedBytes)} 확보 (현재 사용률 ${nextStats.usagePercent}%)`
      );
    } else {
      setStatusMessage(`정리할 불필요한 캐시가 없습니다 (현재 사용률 ${nextStats.usagePercent}%).`);
    }
  };

  const handleBackupAndCleanup = () => {
    const manifest = exportVersionedAllDataToFile({
      userProfile,
      vocabList,
      sentenceList,
      goals,
      history,
      totalRepeatsCount,
    });
    const { freedBytes, removedKeys, compactedKeys } = cleanupRedundantStorageCache({
      vocabList,
      sentenceList,
    });
    const nextStats = getDeviceStorageStats();
    setStats(nextStats);
    window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
    const freedText =
      removedKeys.length > 0 || compactedKeys.length > 0
        ? ` · ${formatByteSize(freedBytes)} 확보됨`
        : '';
    setStatusMessage(
      `JSON 백업(${manifest.statsSummary.vocabCount}단어) 후 캐시 정리 완료${freedText} (현재 사용률 ${nextStats.usagePercent}%)`
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;

    setImportError(null);
    setStatusMessage(null);
    try {
      const parsedPreview = await parseAndPreviewJsonBackup(file, {
        vocabList,
        sentenceList,
        goals,
        history,
        totalRepeatsCount,
      });
      setPreview(parsedPreview);
    } catch (err: any) {
      setImportError(err?.message || 'JSON 파일을 분석할 수 없습니다.');
      setPreview(null);
    }
  };

  const handleConfirmImport = (mode: 'merge' | 'overwrite') => {
    if (!preview) return;
    const nextState = applyBackupImport(
      {
        userProfile,
        vocabList,
        sentenceList,
        goals,
        history,
        totalRepeatsCount,
      },
      preview,
      mode
    );
    onApplyImportedState(nextState);
    setPreview(null);
    setStats(getDeviceStorageStats());
    window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
    setStatusMessage(
      mode === 'merge'
        ? '스마트 병합 완료: 기기 기존 기록과 백업 최신 진도가 안전하게 합쳐졌습니다.'
        : '전체 복원 완료: 선택한 JSON 백업 상태로 복원되었습니다.'
    );
  };

  const barColor =
    stats.statusLevel === 'critical'
      ? 'bg-rose-500'
      : stats.statusLevel === 'warning'
      ? 'bg-amber-500'
      : 'bg-indigo-600 dark:bg-indigo-500';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="로컬 저장소 및 JSON 백업 관리"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                로컬 저장소 관리 & JSON 동기화
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                100% 온디바이스 저장 · 무결성 검증 & 스마트 병합 백업
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
          {statusMessage && (
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {importError && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs font-medium text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* 1. Storage Quota Monitor */}
          <section className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                브라우저 localStorage 점유율 (5.0 MB 상한)
              </span>
              <span className="font-mono-tabular text-xs font-semibold text-slate-700 dark:text-slate-200">
                {stats.totalFormattedSize} ({stats.usagePercent}%)
              </span>
            </div>

            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className={`h-full transition-all ${barColor}`} style={{ width: `${stats.usagePercent}%` }} />
            </div>

            {stats.keyBreakdown.length > 0 && (
              <div className="divide-y divide-slate-200/70 dark:divide-slate-700/60 pt-1">
                {stats.keyBreakdown.slice(0, 4).map((item) => (
                  <div key={item.key} className="py-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 truncate pr-2">{item.label}</span>
                    <span className="font-mono-tabular text-slate-500 dark:text-slate-400 shrink-0">
                      {item.formatted}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                마지막 JSON 내보내기:{' '}
                <strong className="font-mono-tabular text-slate-700 dark:text-slate-200">
                  {stats.lastExportedAt ? new Date(stats.lastExportedAt).toLocaleString('ko-KR') : '기록 없음'}
                </strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCleanupCache}
                  className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>캐시 · 중복 스냅샷 정리</span>
                </button>
              </div>
            </div>
          </section>

          {/* 2. Export Section */}
          <section className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                스키마 v2 JSON 백업 내보내기
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                어휘 · SM-2 복습 주기 · 일일 잔디 기록 · 목표 · 프로필을 무결성 체크섬과 함께 단일 파일로 저장합니다.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleBackupAndCleanup}
                className="w-full min-h-[44px] px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>JSON 백업 후 캐시 정리</span>
              </button>
              <button
                type="button"
                onClick={handleExportV2}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>JSON만 다운로드 ({vocabList.length.toLocaleString()}단어)</span>
              </button>
            </div>
          </section>

          {/* 3. Import & Smart Merge Preview Section */}
          <section className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                JSON 백업 가져오기 & 충돌 미리보기
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                파일을 선택하면 바로 덮어쓰지 않고, 변경 내역을 먼저 검증한 뒤 스마트 병합 또는 전체 교체를 선택할 수 있습니다.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>JSON 백업 파일 선택하여 검증하기</span>
            </button>

            {preview && (
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white truncate">{preview.fileName}</span>
                  <span className="font-mono-tabular text-slate-600 dark:text-slate-300 shrink-0">
                    v{preview.schemaVersion} · {formatByteSize(preview.fileSizeBytes)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  {preview.checksumStatus === 'verified' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> 무결성 체크섬 검증 통과
                    </span>
                  ) : preview.checksumStatus === 'mismatch' ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold inline-flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> 주의: 체크섬 불일치 (외부 수정됨)
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      구버전(v1) 백업 호환 모드
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 block">추가될 단어</span>
                    <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                      +{preview.diff.addedVocabCount}개
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 block">진도 갱신</span>
                    <span className="font-mono-tabular font-bold text-indigo-600 dark:text-indigo-400">
                      {preview.diff.upgradedVocabCount}개
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 block">신규 일일 기록</span>
                    <span className="font-mono-tabular font-bold text-emerald-600 dark:text-emerald-400">
                      +{preview.diff.mergedHistoryDaysCount}일
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 block">백업 청취 누적</span>
                    <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                      {preview.diff.backupTotalRepeats.toLocaleString()}회
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleConfirmImport('merge')}
                    className="flex-1 min-h-[44px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <GitMerge className="w-4 h-4" />
                    <span>스마트 병합 적용 (권장)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmImport('overwrite')}
                    className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-rose-500 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>전체 덮어쓰기</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
