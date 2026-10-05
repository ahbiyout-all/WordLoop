import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Share2,
  PlusSquare,
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Layers,
  Volume2,
  ShieldCheck,
  Maximize2,
  Download,
  Info,
  Apple,
} from 'lucide-react';

interface AddToHomeScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type OSType = 'ios' | 'android' | 'desktop';

export const AddToHomeScreenModal: React.FC<AddToHomeScreenModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeOS, setActiveOS] = useState<OSType>('ios');
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (Full-screen Web-App)
    const checkStandalone = () => {
      const isWindowStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (navigator as any).standalone === true;
      setIsStandalone(isWindowStandalone || isNavStandalone);
    };
    checkStandalone();

    // Auto-detect OS
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      setActiveOS('ios');
    } else if (/android/i.test(ua)) {
      setActiveOS('android');
    } else {
      setActiveOS('desktop');
    }

    // Capture Android/Desktop PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-teal-500/10 to-emerald-500/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  홈 화면에 추가 (전체화면 웹앱 설치)
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Full-Screen PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                브라우저 주소창 없이 100% 전체화면 네이티브 앱처럼 0.1초 만에 실행하세요
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Banner (If already in Standalone Mode) */}
        {isStandalone ? (
          <div className="mx-3 sm:mx-5 mt-3 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="font-black">현재 전체화면 웹앱(PWA) 모드로 실행 중입니다!</p>
              <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90">
                주소창 없는 100% 풀스크린 디스플레이 및 로컬 오디오 샌드박스가 완벽하게 활성화되어 있습니다.
              </p>
            </div>
          </div>
        ) : deferredPrompt ? (
          <div className="mx-3 sm:mx-5 mt-3 p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs min-w-0">
              <Zap className="w-4 h-4 text-indigo-500 shrink-0 animate-bounce" />
              <div>
                <p className="font-black">브라우저 자동 설치 지원 감지됨</p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400">클릭 한 번으로 즉시 홈 화면에 아이콘을 추가할 수 있습니다.</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>지금 즉시 설치</span>
            </button>
          </div>
        ) : null}

        {/* OS Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 mx-3 sm:mx-5 mt-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
          <button
            onClick={() => setActiveOS('ios')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeOS === 'ios'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>🍎 iOS (아이폰/아이패드)</span>
          </button>

          <button
            onClick={() => setActiveOS('android')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeOS === 'android'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>🤖 Android (갤럭시/크롬)</span>
          </button>

          <button
            onClick={() => setActiveOS('desktop')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeOS === 'desktop'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>💻 PC / Mac (데스크톱)</span>
          </button>
        </div>

        {/* Scrollable Step-by-Step Visual Guide Body */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4">
          
          {/* Standalone Full-screen Advantage Highlight Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
              <div className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">주소창 없는 전체화면</div>
              <div className="text-[10px] text-slate-400">100% 네이티브 뷰</div>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">0.1초 원터치 실행</div>
              <div className="text-[10px] text-slate-400">홈 화면 단독 아이콘</div>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">단어장 데이터 보존</div>
              <div className="text-[10px] text-slate-400">오프라인 캐시 보장</div>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Volume2 className="w-3.5 h-3.5" />
              </div>
              <div className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">음성/마이크 최적화</div>
              <div className="text-[10px] text-slate-400">끊김 없는 TTS·STT</div>
            </div>
          </div>

          {/* STEP-BY-STEP GUIDES */}

          {/* 1. iOS Safari Visual Guide */}
          {activeOS === 'ios' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Apple className="w-4 h-4 text-indigo-500" />
                  <span>iOS 사파리(Safari) 브라우저 추가 3단계</span>
                </span>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                  Safari 전용
                </span>
              </div>

              {/* Step Cards */}
              <div className="space-y-2.5">
                {/* Step 1 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>Safari 하단 툴바의</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-black text-[11px]">
                        <Share2 className="w-3.5 h-3.5 inline" /> 공유 버튼
                      </span>
                      <span>터치</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      사파리 브라우저 화면 맨 하단 중앙에 위치한 사각형에 위쪽 화살표가 있는 아이콘을 누릅니다.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>공유 시트 메뉴에서</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-black text-[11px]">
                        <PlusSquare className="w-3.5 h-3.5 inline" /> '홈 화면에 추가'
                      </span>
                      <span>선택</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      아래로 스크롤하여 더하기 모양의 <strong>[홈 화면에 추가]</strong> 항목을 탭합니다.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>우측 상단의</span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black text-[11px]">
                        추가 (Add)
                      </span>
                      <span>버튼 터치</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      아이폰 홈 화면에 <strong>WordLoop 앱 아이콘</strong>이 생성되며, 실행 시 <strong>주소창 없는 100% 전체화면</strong>으로 열립니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Note for In-App Browsers (Kakao/Instagram/Naver) */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <p className="font-extrabold">카카오톡/인스타그램/네이버 인앱 브라우저로 접속하셨나요?</p>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90">
                    인앱 브라우저는 홈 화면 추가를 제한하므로, 아래 주소 복사 후 <strong>Safari</strong> 브라우저에 붙여넣어 실행해주세요.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Android Chrome / Samsung Visual Guide */}
          {activeOS === 'android' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span>안드로이드(갤럭시/크롬/삼성인터넷) 2단계</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  Chrome / Samsung
                </span>
              </div>

              {/* Step Cards */}
              <div className="space-y-2.5">
                {/* Step 1 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>우측 상단 더보기</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-black text-[11px]">
                        메뉴 (⋮)
                      </span>
                      <span>또는 하단 삼선 메뉴 터치</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      크롬 브라우저 우측 상단 세 점 아이콘 또는 삼성인터넷 하단 햄버거 메뉴를 누릅니다.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>메뉴에서</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-black text-[11px]">
                        <Download className="w-3.5 h-3.5 inline" /> '앱 설치'
                      </span>
                      <span>또는</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-black text-[11px]">
                        <PlusSquare className="w-3.5 h-3.5 inline" /> '홈 화면에 추가'
                      </span>
                      <span>터치</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      확인을 누르면 플레이스토어 앱처럼 스마트폰 앱 서랍 및 홈 화면에 고해상도 앱 아이콘이 생성됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Desktop Chrome/Edge Visual Guide */}
          {activeOS === 'desktop' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-500" />
                  <span>PC / Mac 데스크톱 단독 앱 설치 2단계</span>
                </span>
                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md">
                  Chrome / Edge / Safari
                </span>
              </div>

              {/* Step Cards */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>브라우저 상단 주소창 우측의</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-black text-[11px]">
                        <Download className="w-3.5 h-3.5 inline" /> [앱 설치] 아이콘
                      </span>
                      <span>클릭</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Chrome 또는 Edge 브라우저 주소창 우측 모니터에 아래 화살표 모양 아이콘을 클릭합니다.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                      '설치' 확인 및 바탕화면 단독 창 실행
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      독립된 깔끔한 윈도우 창으로 실행되며 작업표시줄/Dock에 고정하여 편리하게 사용할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button
            onClick={handleCopyUrl}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">주소 복사됨!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>웹앱 주소 복사</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 font-extrabold text-xs transition-all shadow-sm cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>

      </div>
    </div>
  );
};
