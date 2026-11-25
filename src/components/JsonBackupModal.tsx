import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  FolderSync,
  FolderOpen,
  Archive,
  Unlink,
} from 'lucide-react';
import { UserProfile, VocabItem, SentenceItem, Goal, DailyGoalHistory } from '../types';
import {
  DeviceStorageStats,
  JsonBackupPreview,
  getDeviceStorageStats,
  cleanupRedundantStorageCache,
  exportVersionedAllDataToFile,
  exportCompressedBackupToFile,
  parseAndPreviewJsonBackup,
  parseAndPreviewBackupBytes,
  applyBackupImport,
  formatByteSize,
} from '../services/deviceStorageService';
import {
  MultiTierStorageStats,
  getMultiTierStorageStats,
  connectLocalSyncFolder,
  authorizeLocalSyncFolder,
  disconnectLocalSyncFolder,
  syncBundleToLocalFolder,
  readLatestBundleFromLocalFolder,
  exportMediaDataUrls,
  saveAppStateToIndexedDb,
} from '../services/persistentStorageEngine';

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
  const [multiStats, setMultiStats] = useState<MultiTierStorageStats | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isExportingGzip, setIsExportingGzip] = useState<boolean>(false);
  const [preview, setPreview] = useState<JsonBackupPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshAllStats = useCallback(async () => {
    setStats(getDeviceStorageStats());
    try {
      const mStats = await getMultiTierStorageStats();
      setMultiStats(mStats);
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      void refreshAllStats();
      setPreview(null);
      setImportError(null);
    }
  }, [isOpen, refreshAllStats]);

  if (!isOpen) return null;

  const currentBundle = {
    userProfile,
    vocabList,
    sentenceList,
    goals,
    history,
    totalRepeatsCount,
  };

  const handleExportCompressed = async () => {
    setIsExportingGzip(true);
    setImportError(null);
    try {
      await saveAppStateToIndexedDb({ ...currentBundle, forceSnapshot: true });
      const mediaDataUrls = await exportMediaDataUrls(userProfile);
      const res = await exportCompressedBackupToFile({
        ...currentBundle,
        mediaDataUrls,
      });
      await refreshAllStats();
      window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
      const savedRatio =
        res.rawBytes > 0 ? Math.max(0, Math.round((1 - res.compressedBytes / res.rawBytes) * 100)) : 0;
      setStatusMessage(
        `${res.fileName} 저장 완료 — 원본 ${formatByteSize(res.rawBytes)} → ${formatByteSize(res.compressedBytes)}${res.wasCompressed ? ` (${savedRatio}% Gzip 압축)` : ''}`
      );
    } catch (err: any) {
      setImportError(err?.message || '압축 백업 생성 중 오류가 발생했습니다.');
    } finally {
      setIsExportingGzip(false);
    }
  };

  const handleExportPlainJson = () => {
    const manifest = exportVersionedAllDataToFile(currentBundle);
    void refreshAllStats();
    window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
    setStatusMessage(
      `v${manifest.appVersion} 호환 JSON 저장 완료 (${manifest.statsSummary.vocabCount.toLocaleString()}단어 · 체크섬 ${manifest.checksum.slice(0, 8)})`
    );
  };

  const handleCleanupCache = async () => {
    const { freedBytes, removedKeys, compactedKeys } = cleanupRedundantStorageCache({
      vocabList,
      sentenceList,
    });
    await saveAppStateToIndexedDb(currentBundle);
    await refreshAllStats();
    const nextStats = getDeviceStorageStats();
    window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
    if (removedKeys.length > 0 || compactedKeys.length > 0) {
      setStatusMessage(
        `빠른 캐시 · 중복 스냅샷 정리 완료: ${formatByteSize(freedBytes)} 확보 (현재 점유율 ${nextStats.usagePercent}%)`
      );
    } else {
      setStatusMessage(`정리할 중복 캐시가 없습니다 (현재 localStorage 점유율 ${nextStats.usagePercent}%).`);
    }
  };

  const handleBackupAndCleanup = async () => {
    await handleExportCompressed();
    const { freedBytes, removedKeys, compactedKeys } = cleanupRedundantStorageCache({
      vocabList,
      sentenceList,
    });
    await refreshAllStats();
    window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
    if (removedKeys.length > 0 || compactedKeys.length > 0) {
      setStatusMessage((prev) => `${prev ? prev + ' · ' : ''}캐시 ${formatByteSize(freedBytes)} 추가 정리 완료`);
    }
  };

  const handleConnectFolder = async () => {
    setImportError(null);
    setStatusMessage(null);
    setIsSyncing(true);
    try {
      const folderStatus = await connectLocalSyncFolder();
      if (folderStatus.isConnected && folderStatus.permissionState === 'granted') {
        const syncRes = await syncBundleToLocalFolder(currentBundle, { ignoreDirtyCheck: true });
        setStatusMessage(
          `동기화 폴더 '${syncRes.folderName}' 연결 및 첫 압축 백업 완료 (${formatByteSize(syncRes.bytesWritten)} · 일일 스냅샷 ${syncRes.snapshotCount}개)`
        );
      }
      await refreshAllStats();
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setImportError(err?.message || '동기화 폴더를 연결할 수 없습니다.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAuthorizeFolder = async () => {
    setImportError(null);
    setIsSyncing(true);
    try {
      const folderStatus = await authorizeLocalSyncFolder();
      if (folderStatus.permissionState === 'granted') {
        const syncRes = await syncBundleToLocalFolder(currentBundle, { ignoreDirtyCheck: true });
        setStatusMessage(`'${syncRes.folderName}' 폴더 접근 권한 복구 및 동기화 완료`);
      } else {
        setImportError('폴더 접근 권한이 허용되지 않았습니다.');
      }
      await refreshAllStats();
    } catch (err: any) {
      setImportError(err?.message || '폴더 권한 확인 중 오류가 발생했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    setImportError(null);
    setIsSyncing(true);
    try {
      await saveAppStateToIndexedDb({ ...currentBundle, forceSnapshot: true });
      const syncRes = await syncBundleToLocalFolder(currentBundle, {
        forceDailySnapshot: true,
        ignoreDirtyCheck: true,
      });
      await refreshAllStats();
      setStatusMessage(
        `'${syncRes.folderName}' 폴더에 최신 스냅샷 동기화 완료 (${formatByteSize(syncRes.bytesWritten)} · 보관 ${syncRes.snapshotCount}일치)`
      );
    } catch (err: any) {
      setImportError(err?.message || '폴더 동기화에 실패했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePreviewFromFolder = async () => {
    setImportError(null);
    setStatusMessage(null);
    setIsSyncing(true);
    try {
      const bundle = await readLatestBundleFromLocalFolder();
      if (!bundle) {
        setImportError('연결된 폴더에 아직 wordloop-sync-latest.json.gz 백업 파일이 없습니다.');
        return;
      }
      const parsedPreview = await parseAndPreviewBackupBytes(bundle.bytes, bundle.fileName, {
        vocabList,
        sentenceList,
        goals,
        history,
        totalRepeatsCount,
      });
      setPreview(parsedPreview);
      setStatusMessage(
        `'${bundle.folderName}' 폴더의 최신 스냅샷을 불러왔습니다. 아래에서 변경 내역을 확인 후 병합해 주세요.`
      );
    } catch (err: any) {
      setImportError(err?.message || '폴더 백업 파일을 읽을 수 없습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectFolder = async () => {
    setImportError(null);
    await disconnectLocalSyncFolder();
    await refreshAllStats();
    setStatusMessage('로컬 백업 폴더 연결이 해제되었습니다. IndexedDB 및 빠른 캐시 저장은 계속 유지됩니다.');
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
      setImportError(err?.message || '백업 파일을 분석할 수 없습니다.');
      setPreview(null);
    }
  };

  const handleConfirmImport = (mode: 'merge' | 'overwrite') => {
    if (!preview) return;
    const nextState = applyBackupImport(currentBundle, preview, mode);
    onApplyImportedState(nextState);
    setPreview(null);
    void refreshAllStats();
    window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
    setStatusMessage(
      mode === 'merge'
        ? '스마트 병합 완료: 기기 기존 기록과 백업 최신 진도가 손실 없이 결합되었습니다.'
        : '전체 복원 완료: 선택한 백업 스냅샷 상태로 복원되었습니다.'
    );
  };

  const barColor =
    stats.statusLevel === 'critical'
      ? 'bg-rose-500'
      : stats.statusLevel === 'warning'
      ? 'bg-amber-500'
      : 'bg-indigo-600 dark:bg-indigo-500';

  const folderStatus = multiStats?.folderStatus;
  const driverLabel =
    folderStatus?.driver === 'electron'
      ? 'Electron 데스크톱 자동 저장'
      : folderStatus?.driver === 'browser_fs_access'
      ? '로컬 폴더 직접 연동'
      : '압축 파일 휴대용 백업';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="3계층 로컬 저장소 및 백업 동기화 관리"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <HardDrive className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                3계층 로컬 저장소 & 자동 백업 동기화
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                IndexedDB 대용량 분리 저장 · Gzip 7일 회전 스냅샷 · 로컬 폴더 기기 간 동기화
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          {statusMessage && (
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {importError && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs font-medium text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

          {/* Section 1: 3-Tier Storage Telemetry */}
          <section className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                계층별 온디바이스 저장 현황
              </h3>
              <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                빠른 캐시 {stats.totalFormattedSize} / 5.0 MB ({stats.usagePercent}%)
              </span>
            </div>

            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className={`h-full transition-all ${barColor}`} style={{ width: `${stats.usagePercent}%` }} />
            </div>

            {/* Flat 3-column metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="p-3">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  IndexedDB 본문 · 이미지
                </span>
                <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {multiStats
                    ? formatByteSize(multiStats.primaryStateBytes + multiStats.mediaBytes)
                    : '계산 중'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  사진 {multiStats?.mediaCount ?? 0}개 Blob 분리 저장
                </span>
              </div>

              <div className="p-3">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  내부 압축 스냅샷
                </span>
                <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {multiStats ? `${multiStats.snapshotsCount} / 7일 보관` : '계산 중'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gzip {multiStats ? formatByteSize(multiStats.snapshotsBytes) : '-'}
                  {multiStats?.latestSnapshotDate ? ` · ${multiStats.latestSnapshotDate}` : ''}
                </span>
              </div>

              <div className="p-3">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  브라우저 영구 보존 권한
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {multiStats?.isPersistedGranted ? '활성 (자동 삭제 방지)' : '표준 보호 모드'}
                </span>
                <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                  가용 한도{' '}
                  {multiStats?.browserEstimatedQuotaBytes
                    ? formatByteSize(multiStats.browserEstimatedQuotaBytes)
                    : '동적 할당'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                마지막 파일 내보내기:{' '}
                <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200 font-semibold">
                  {stats.lastExportedAt ? new Date(stats.lastExportedAt).toLocaleString('ko-KR') : '기록 없음'}
                </strong>
              </span>
              <button
                type="button"
                onClick={handleCleanupCache}
                className="min-h-[38px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>중복 캐시 정리</span>
              </button>
            </div>
          </section>

          {/* Section 2: Local File System Folder Auto-Sync */}
          <section className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FolderSync className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>로컬 폴더 자동 저장 & 기기 간 동기화</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  OneDrive · iCloud Drive · Google Drive · Dropbox 데스크톱 폴더를 지정하면 변경 시 자동 압축(.json.gz) 저장됩니다.
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                {driverLabel}
              </span>
            </div>

            {/* Inline status metadata line (no static pills) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs border-y border-slate-100 dark:border-slate-800 py-2.5 text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                {folderStatus?.permissionState === 'granted' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : folderStatus?.permissionState === 'prompt' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                )}
                {folderStatus?.isConnected
                  ? folderStatus.folderPath || folderStatus.folderName || '연결된 폴더'
                  : '연결된 폴더 없음'}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>
                상태:{' '}
                <strong className="font-semibold text-slate-800 dark:text-slate-100">
                  {folderStatus?.permissionState === 'granted'
                    ? '자동 백업 활성'
                    : folderStatus?.permissionState === 'prompt'
                    ? '권한 재확인 필요'
                    : folderStatus?.permissionState === 'unsupported'
                    ? '모바일 파일 백업 모드'
                    : '미연결'}
                </strong>
              </span>
              {folderStatus?.lastSyncedAt && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="font-mono tabular-nums">
                    최근 {new Date(folderStatus.lastSyncedAt).toLocaleString('ko-KR')} ({formatByteSize(folderStatus.lastBytesWritten)})
                  </span>
                </>
              )}
              {folderStatus && folderStatus.snapshotCount > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="font-mono tabular-nums">일일 스냅샷 {folderStatus.snapshotCount}/7</span>
                </>
              )}
            </div>

            {!folderStatus?.isSupported ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                현재 모바일 또는 Safari 환경에서는 브라우저 보안 정책상 폴더 직접 쓰기가 제한됩니다. 아래 <strong>압축 백업 저장(.json.gz)</strong>을 눌러 기기의 파일/클라우드 드라이브 앱에 저장해 주세요.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {folderStatus?.permissionState === 'prompt' && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleAuthorizeFolder}
                    className="min-h-[44px] px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>폴더 권한 다시 허용</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleConnectFolder}
                  className="min-h-[44px] px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>{folderStatus?.isConnected ? '동기화 폴더 변경' : '백업 폴더 연결하기'}</span>
                </button>

                {folderStatus?.isConnected && folderStatus.permissionState === 'granted' && (
                  <>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleSyncNow}
                      className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-800 dark:text-slate-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>지금 폴더에 동기화</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handlePreviewFromFolder}
                      className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-800 dark:text-slate-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <GitMerge className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>폴더 최신본 병합</span>
                    </button>
                  </>
                )}

                {folderStatus?.isConnected && folderStatus.driver !== 'electron' && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleDisconnectFolder}
                    className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>연결 해제</span>
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Section 3: Portable Export & Import Preview */}
          <section className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                휴대용 압축 백업 내보내기 & 충돌 미리보기 복원
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                어휘 · SM-2 복습 주기 · 일일 잔디 · 목표 · 가족 사진까지 무결성 체크섬과 함께 단일 <code className="font-mono">.json.gz</code> 파일로 저장하거나 병합합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isExportingGzip}
                onClick={handleExportCompressed}
                className="w-full min-h-[44px] px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Archive className="w-4 h-4 shrink-0" />
                <span>{isExportingGzip ? '압축 중...' : '압축 백업 (.json.gz)'}</span>
              </button>

              <button
                type="button"
                onClick={handleBackupAndCleanup}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>백업 후 캐시 정리</span>
              </button>

              <button
                type="button"
                onClick={handleExportPlainJson}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>호환 JSON 저장</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.gz,.json.gz,application/json,application/gzip"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>백업 파일 선택하여 무결성 검증하기 (.json / .json.gz)</span>
            </button>

            {preview && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white truncate">{preview.fileName}</span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                    스키마 v{preview.schemaVersion} · {formatByteSize(preview.fileSizeBytes)} · {preview.backupProfileName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  {preview.checksumStatus === 'verified' ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
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

                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                  <div className="p-2.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">추가될 단어</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      +{preview.diff.addedVocabCount}개
                    </span>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">진도 갱신</span>
                    <span className="font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                      {preview.diff.upgradedVocabCount}개
                    </span>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">신규 일일 기록</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      +{preview.diff.mergedHistoryDaysCount}일
                    </span>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">백업 청취 누적</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      {preview.diff.backupTotalRepeats.toLocaleString()}회
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
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
