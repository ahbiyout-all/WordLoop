import React, { useState, useEffect } from 'react';
import { ExternalLink, X, Compass, Volume2 } from 'lucide-react';

export const InAppBrowserBanner: React.FC = () => {
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [browserType, setBrowserType] = useState<'kakaotalk' | 'other' | null>(null);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    const ua = navigator.userAgent || '';
    const isKakao = /KAKAOTALK/i.test(ua);
    const isOtherInApp = /FBAN|FBAV|Instagram|Line|NAVER/i.test(ua);

    if (isKakao) {
      setIsInAppBrowser(true);
      setBrowserType('kakaotalk');
      const dismissed = sessionStorage.getItem('wordloop_inapp_banner_dismissed') === 'true';
      setIsDismissed(dismissed);
    } else if (isOtherInApp) {
      setIsInAppBrowser(true);
      setBrowserType('other');
      const dismissed = sessionStorage.getItem('wordloop_inapp_banner_dismissed') === 'true';
      setIsDismissed(dismissed);
    }
  }, []);

  const handleOpenExternal = () => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (browserType === 'kakaotalk') {
      // KakaoTalk external browser open scheme
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
    } else if (isAndroid) {
      // Android Chrome intent scheme
      const cleanUrl = currentUrl.replace(/https?:\/\//i, '');
      window.location.href = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    } else {
      // Fallback: prompt copy URL or alert
      navigator.clipboard?.writeText(currentUrl);
      alert('주소가 복사되었습니다. Safari 또는 Chrome 브라우저 주소창에 붙여넣어 주세요.');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('wordloop_inapp_banner_dismissed', 'true');
    } catch {}
  };

  if (!isInAppBrowser || isDismissed) {
    return null;
  }

  return (
    <aside
      aria-label="인앱 브라우저 외부 실행 안내"
      className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-3.5 py-2.5 transition-all text-xs"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="font-bold">
              {browserType === 'kakaotalk' ? '카카오톡 인앱 브라우저 감지' : '인앱 브라우저 접속 안내'}
            </span>
            <span className="hidden sm:inline text-amber-700 dark:text-amber-300 ml-1.5">
              - 원활한 음성 합성 및 마이크 발음 평가를 위해 Chrome이나 기본 브라우저 사용을 권장합니다.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenExternal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-medium text-xs shadow-sm transition-all"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Chrome/기본 브라우저로 열기</span>
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="닫기"
            className="p-1 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
