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
  ShieldCheck,
  Calendar,
  Layers,
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
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(GITHUB_RELEASES_URL);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const isUpdate = updateData?.isUpdateAvailable;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[92dvh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-500/20 relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                    GitHub Releases 연동
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono">
                    {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5 truncate">
                  실시간 앱 업데이트 센터
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          
          {/* Version Status Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                현재 설치 버전
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                  v{updateData?.currentVersion || APP_VERSION}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold">
                  로컬 최신
                </span>
              </div>
            </div>

            <div className="text-center font-bold text-slate-400">➔</div>

            <div className="space-y-1 text-right">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                GitHub 릴리스 버전
              </span>
              <div className="flex items-center justify-end gap-2">
                <span className={`text-lg sm:text-xl font-black font-mono ${isUpdate ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                  v{updateData?.latestVersion || updateData?.currentVersion || APP_VERSION}
                </span>
                {isUpdate ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-bounce">
                    신규 배포!
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                    일치함
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Update Status Banner */}
          {isUpdate ? (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-900 dark:text-indigo-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-black text-sm text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>🎉 새로운 버전(v{updateData?.latestVersion})이 배포되었습니다!</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                새로운 학습 기능, 성능 향상, 보안 패치가 적용되었습니다. 사용 중인 기기에 맞는 설치파일을 아래에서 바로 다운로드하세요.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <span className="font-extrabold block">현재 최신 버전(v{updateData?.currentVersion})을 사용하고 있습니다.</span>
                <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  GitHub 리포지토리와 버전 정보가 완벽하게 동기화되어 있습니다.
                </span>
              </div>
            </div>
          )}

          {/* Platform Download Cards (PC, Android, iOS, Web) */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>기기별 설치파일 및 패키지</span>
              <span className="text-[10px] font-normal lowercase font-mono">assets direct download</span>
            </h3>

            {/* 1. PC Desktop (.exe) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-indigo-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                      PC 윈도우 데스크톱
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">
                      .EXE / Installer
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Windows 10/11 전용 Electron 네이티브 앱 (오프라인 지원)
                  </p>
                </div>
              </div>

              {updateData?.downloadUrlPC ? (
                <a
                  href={updateData.downloadUrlPC}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>다운로드</span>
                </a>
              ) : (
                <a
                  href={updateData?.htmlUrl || GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shrink-0"
                >
                  <span>릴리스 보기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* 2. Mobile Android (.apk) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                      안드로이드 스마트폰 / 태블릿
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                      .APK / Android
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Galaxy, LG, Pixel 등 안드로이드 기기 직접 설치용 APK 패키지
                  </p>
                </div>
              </div>

              {updateData?.downloadUrlApk ? (
                <a
                  href={updateData.downloadUrlApk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>APK 받기</span>
                </a>
              ) : (
                <a
                  href={updateData?.htmlUrl || GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shrink-0"
                >
                  <span>릴리스 보기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* 3. iPhone / iOS (PWA & Xcode/IPA Package) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-400 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900/10 dark:bg-white/10 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
                  <Apple className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                      아이폰(iOS) & 아이패드
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold">
                      PWA 웹앱 / IPA
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Safari '홈 화면에 추가' 1초 설치 (인증서 불필요 100% 전체화면)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {updateData?.downloadUrlIOS ? (
                  <a
                    href={updateData.downloadUrlIOS}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>패키지</span>
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      // Open Add to Home Modal
                      const btn = document.querySelector('[title*="홈 화면에 추가"]') as HTMLElement;
                      if (btn) btn.click();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                  >
                    <span>설치 안내</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4. Web Live Version */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    웹 브라우저 즉시 갱신
                  </span>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    설치 없이 웹 브라우저 캐시를 새로고침하여 최신 버전 반영
                  </p>
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>새로고침</span>
              </button>
            </div>
          </div>

          {/* Release Notes Preview */}
          {updateData?.releaseNotes && (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>최신 릴리스 패치 노트 내역</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(updateData.publishedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap no-scrollbar">
                {updateData.releaseNotes}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button
            onClick={() => onRefreshCheck()}
            disabled={isChecking}
            className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'GitHub 확인 중...' : '지금 릴리스 다시 확인'}</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={updateData?.htmlUrl || GITHUB_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>GitHub 릴리스 페이지 열기</span>
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
