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
import { APP_VERSION } from '../data/patchNotesData';

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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
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
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5 truncate">
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
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>업데이트 및 설치파일 다운로드</span>
              </span>
              <span className="text-[10px] font-mono lowercase">Installers & Actions</span>
            </div>

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
                    {isUpdate ? `🚀 v${latestVer} 최신 버전으로 업데이트` : `📦 WordLoop Releases 다운로드 센터 열기`}
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

              {/* Android APK */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block truncate">
                      Android (.apk)
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      모바일 직접 설치 패키지
                    </span>
                  </div>
                </div>
                {updateData?.downloadUrlApk ? (
                  <a
                    href={updateData.downloadUrlApk}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shrink-0"
                  >
                    <Download className="w-3 h-3" />
                    <span>APK</span>
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
                  onClick={() => {
                    onClose();
                    const btn = document.querySelector('[title*="홈 화면에 추가"]') as HTMLElement;
                    if (btn) btn.click();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shrink-0"
                >
                  <span>가이드</span>
                </button>
              </div>

              {/* Web Refresh */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Globe className="w-4 h-4 text-teal-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block truncate">
                      Web 브라우저
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      온라인 캐시 즉시 갱신
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>새로고침</span>
                </button>
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
