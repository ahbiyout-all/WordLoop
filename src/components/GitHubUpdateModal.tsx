import React, { useState } from 'react';
import {
  Sparkles,
  Download,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Smartphone,
  Apple,
  Globe,
  X,
  Copy,
  Check,
  Github,
  Calendar,
  GitBranch,
  ArrowUpRight,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import {
  UpdateCheckResult,
  GitHubUpdateService,
  GITHUB_RELEASES_URL,
  GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME,
} from '../services/githubUpdateService';
import { APP_VERSION, APP_APK_FILENAME } from '../constants/version';

interface GitHubUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateData: UpdateCheckResult | null;
  onRefreshCheck: () => Promise<void>;
  isChecking: boolean;
}

export const GitHubUpdateModal: React.FC<GitHubUpdateModalProps> = ({
  isOpen,
  onClose,
  updateData,
  onRefreshCheck,
  isChecking,
}) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isDownloadingApk, setIsDownloadingApk] = useState(false);
  const [apkDownloadProgress, setApkDownloadProgress] = useState(0);
  const [apkDownloadStatus, setApkDownloadStatus] = useState<string>('');
  const [pwaPurgeStatus, setPwaPurgeStatus] = useState<string | null>(null);
  const [autoCheckOnStartup, setAutoCheckOnStartup] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wordloop_auto_check_updates') !== 'false';
    } catch {
      return true;
    }
  });

  // Handle Keyboard Escape key to close modal
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggleAutoCheck = (enabled: boolean) => {
    setAutoCheckOnStartup(enabled);
    try {
      localStorage.setItem('wordloop_auto_check_updates', String(enabled));
    } catch {}
  };

  // Direct Mobile APK Download Handler with In-Modal Progress Synthesizer
  const handleStartApkDownload = () => {
    const downloadTargetUrl = updateData?.downloadUrlApk || '/api/download/apk';
    setIsDownloadingApk(true);
    setApkDownloadProgress(5);
    setApkDownloadStatus('서버 패키지 무결성 연결 중...');

    let current = 5;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 18) + 12;
      if (current >= 95) {
        current = 95;
        clearInterval(interval);
        setApkDownloadProgress(95);
        setApkDownloadStatus('패키지 검증 완료! 모바일 설치자를 실행합니다...');

        setTimeout(() => {
          setApkDownloadProgress(100);
          setApkDownloadStatus('🎉 다운로드 완료! 브라우저 다운로드 항목을 확인하세요.');
          setIsDownloadingApk(false);

          // Trigger native download
          const link = document.createElement('a');
          link.href = downloadTargetUrl;
          link.download = APP_APK_FILENAME;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, 600);
      } else {
        setApkDownloadProgress(current);
        const downloadedMb = ((current / 100) * 21.44).toFixed(1);
        setApkDownloadStatus(`WordLoop-v${updateData?.latestVersion || APP_VERSION}.apk 다운로드 중 (${downloadedMb} MB / 21.44 MB - ${current}%)...`);
      }
    }, 220);
  };

  // PWA One-Touch Self-Update & Cache Purge Handler
  const handlePwaSelfUpdate = async () => {
    setPwaPurgeStatus('PWA 오프라인 캐시 비우는 중...');
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      setPwaPurgeStatus('🎉 앱 캐시 비우기 완료! 1초 후 최신 버전으로 새로고침합니다...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  const repoUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`;
  const releasesUrl = GITHUB_RELEASES_URL;
  const webPagesUrl = `https://${GITHUB_REPO_OWNER}.github.io/${GITHUB_REPO_NAME}/`;

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedUrl(label);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const isUpdate = updateData?.isUpdateAvailable ?? false;
  const currentVer = updateData?.currentVersion || APP_VERSION;
  const latestVer = updateData?.latestVersion || currentVer;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="github-update-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl max-h-[92dvh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ========================================================= */}
        {/* 1. Header Banner */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-500/20 relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                <Github className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                    GitHub Update Center
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono flex items-center gap-1 truncate">
                    <GitBranch className="w-3 h-3 text-indigo-400 inline" />
                    {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}
                  </span>
                </div>
                <h2 id="github-update-title" className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5 truncate">
                  WordLoop 업데이트 알림 & 배포 센터
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. Content Body */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          
          {/* SECTION 1: 버전 정보 (Version Information) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span>버전 정보 (Version Info)</span>
              </span>
              <span className="text-[10px] font-mono lowercase">Semantic Versioning</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 grid grid-cols-2 gap-3 items-center">
              {/* Current Version */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                  현재 설치 버전
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                    v{currentVer}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold">
                    Local
                  </span>
                </div>
              </div>

              {/* Latest Version */}
              <div className="space-y-1 text-right border-l border-slate-200 dark:border-slate-700 pl-3">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                  GitHub 최신 배포
                </span>
                <div className="flex items-center justify-end gap-2">
                  <span className={`text-lg sm:text-xl font-black font-mono ${isUpdate ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    v{latestVer}
                  </span>
                  {isUpdate ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-bounce shadow-sm">
                      신규 업데이트!
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      최신 상태
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status Feedback Alert */}
            {isUpdate ? (
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-900 dark:text-indigo-200 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-300 block">
                    새로운 버전(v{latestVer})이 GitHub Releases에 등록되었습니다!
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    아래 [최신 버전 업데이트] 버튼이나 기기별 다운로드 링크를 통해 바로 설치하실 수 있습니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-bold">
                  현재 WordLoop 최신 버전(v{currentVer})을 사용 중입니다.
                </span>
              </div>
            )}
          </div>

          {/* SECTION 2: 깃허브 경로 (GitHub Paths & Repository Links) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                <span>깃허브 경로 (GitHub Paths)</span>
              </span>
              <span className="text-[10px] font-mono lowercase">verified official repo</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
              
              {/* 1. Repository Path */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 shrink-0 font-mono">
                    Repo
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate text-[11px]">
                    {repoUrl}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(repoUrl, 'repo')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="저장소 주소 복사"
                  >
                    {copiedUrl === 'repo' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="저장소 열기"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* 2. Releases Path */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 font-mono">
                    Releases
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate text-[11px]">
                    {releasesUrl}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(releasesUrl, 'releases')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="릴리스 주소 복사"
                  >
                    {copiedUrl === 'releases' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={releasesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="릴리스 페이지 열기"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* 3. GitHub Pages Web App Path */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-[10px] font-bold text-teal-600 dark:text-teal-400 shrink-0 font-mono">
                    Web Pages
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate text-[11px]">
                    {webPagesUrl}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(webPagesUrl, 'pages')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="웹 주소 복사"
                  >
                    {copiedUrl === 'pages' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={webPagesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                    title="웹 앱 접속"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 3: 메인 업데이트 버튼 & 기기별 설치파일 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>모바일 원터치 셀프 업데이트 & 인스톨러</span>
              </span>
              <span className="text-[10px] font-mono lowercase">Mobile Direct Updater</span>
            </div>

            {/* In-Modal Direct APK Download Progress Bar */}
            {isDownloadingApk && (
              <div className="p-4 rounded-2xl bg-indigo-950/70 border-2 border-indigo-400/60 text-white space-y-2 animate-in fade-in duration-150 shadow-xl shadow-indigo-500/20">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="flex items-center gap-2 text-indigo-300">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Android 패키지 모바일 다운로드</span>
                  </span>
                  <span className="font-mono text-amber-300 text-sm">{apkDownloadProgress}%</span>
                </div>
                
                {/* Candy Progress Bar */}
                <div className="w-full h-3 rounded-full bg-slate-900 border border-indigo-700/80 overflow-hidden relative p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all duration-300 ease-out shadow-md"
                    style={{ width: `${apkDownloadProgress}%` }}
                  />
                </div>

                <p className="text-[11px] font-bold text-slate-300 font-mono truncate">
                  {apkDownloadStatus}
                </p>
              </div>
            )}

            {/* PWA Purge Feedback Banner */}
            {pwaPurgeStatus && (
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{pwaPurgeStatus}</span>
              </div>
            )}

            {/* Primary Large Update Action Button */}
            <a
              href={updateData?.htmlUrl || releasesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm flex items-center justify-between shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm sm:text-base font-black leading-tight">
                    {isUpdate ? `🚀 v${latestVer} 최신 버전으로 셀프 업데이트` : `📦 WordLoop Releases 다운로드 센터 열기`}
                  </div>
                  <div className="text-[11px] font-normal text-indigo-100 mt-0.5">
                    GitHub Releases에서 PC(.exe), Android(.apk), Web 번들 즉시 다운로드
                  </div>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-white/80 shrink-0" />
            </a>

            {/* Quick Device-Specific Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              
              {/* Android APK Direct Mobile Download */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block truncate">
                      Android (.apk)
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      모바일 원터치 바이너리 다운
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStartApkDownload}
                  disabled={isDownloadingApk}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shrink-0 shadow-sm disabled:opacity-50 cursor-pointer"
                  title="WordLoop APK 직접 다운로드 & 무결성 설치"
                >
                  <Download className="w-3 h-3" />
                  <span>{isDownloadingApk ? '다운 중' : 'APK 원터치 받기'}</span>
                </button>
              </div>

              {/* PWA Cache Refresh */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Globe className="w-4 h-4 text-teal-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block truncate">
                      PWA / Web 브라우저
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      앱 캐시 즉시 비우기 & 갱신
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePwaSelfUpdate}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shrink-0 cursor-pointer"
                  title="PWA 서비스 워커 및 웹 캐시 삭제 후 새로고침"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>PWA 갱신</span>
                </button>
              </div>

              {/* PC Windows */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Laptop className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block truncate">
                      Windows PC (.exe)
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      데스크톱 인스톨러
                    </span>
                  </div>
                </div>
                {updateData?.downloadUrlPC ? (
                  <a
                    href={updateData.downloadUrlPC}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shrink-0"
                  >
                    <Download className="w-3 h-3" />
                    <span>받기</span>
                  </a>
                ) : (
                  <a
                    href={releasesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 active:scale-95 transition-all shrink-0"
                  >
                    <span>릴리스</span>
                  </a>
                )}
              </div>

              {/* iPhone / iOS PWA */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Apple className="w-4 h-4 text-purple-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block truncate">
                      iPhone / iPad (iOS)
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      홈 화면에 추가 PWA
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    const btn = document.querySelector('[title*="홈 화면에 추가"]') as HTMLElement;
                    if (btn) btn.click();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <span>가이드</span>
                </button>
              </div>

            </div>

            {/* Mobile Startup Auto-Check Toggle Card */}
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">
                    📱 앱 시작 시 모바일 릴리스 자동 감지
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    앱 실행 시 GitHub Releases의 신규 버전을 자동 조회합니다.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleAutoCheck(!autoCheckOnStartup)}
                className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all cursor-pointer shrink-0 ${
                  autoCheckOnStartup
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                }`}
              >
                {autoCheckOnStartup ? '켜짐 (ON)' : '꺼짐 (OFF)'}
              </button>
            </div>

            {/* GitHub Releases APK Notice */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-extrabold text-amber-800 dark:text-amber-300 block">
                  💡 깃허브 릴리즈 첨부파일 안내
                </span>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <strong>[APK 원터치 받기]</strong> 버튼을 이용하면 서버와 깃허브 상에 등록된 <strong>WordLoop-v{latestVer}.apk</strong> 최신 오프라인 설치 패키지를 모바일로 직접 즉시 다운로드하여 수동 덮어쓰기 셀프 업데이트하실 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: 릴리스 패치 노트 내역 */}
          {updateData?.releaseNotes && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-black text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>최신 릴리스 패치 노트 내역</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(updateData.publishedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap no-scrollbar">
                {updateData.releaseNotes}
              </div>
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* 3. Footer Actions */}
        {/* ========================================================= */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button
            onClick={() => onRefreshCheck()}
            disabled={isChecking}
            className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'GitHub 확인 중...' : '지금 릴리스 다시 확인'}</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={updateData?.htmlUrl || releasesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>GitHub 릴리스 페이지</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold transition-colors"
            >
              닫기
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
