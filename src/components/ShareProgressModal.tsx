import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Flame,
  Headphones,
  Sparkles,
  Layers,
  Activity,
  Award,
} from 'lucide-react';
import {
  ProgressShareData,
  generateProgressShareBlob,
  downloadBlobAsFile,
  shareProgressCard,
} from '../utils/progressShareImageUtils';

interface ShareProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProgressShareData;
}

export const ShareProgressModal: React.FC<ShareProgressModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Generate image whenever data changes or modal opens
  useEffect(() => {
    if (!isOpen) {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
        setImageUrl(null);
      }
      setImageBlob(null);
      return;
    }

    let isCancelled = false;
    setIsGenerating(true);

    generateProgressShareBlob(data)
      .then((blob) => {
        if (!isCancelled) {
          setImageBlob(blob);
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to generate progress image:', err);
        if (!isCancelled) setIsGenerating(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, data]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleNativeShare = async () => {
    setIsSharing(true);
    try {
      const res = await shareProgressCard(data);
      showToast(res.message);
    } catch (e: any) {
      showToast('공유 중 오류가 발생했습니다.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = () => {
    if (!imageBlob) return;
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `wordloop_progress_${data.currentStreak}streak_${dateTag}.png`;
    downloadBlobAsFile(imageBlob, filename);
    showToast('성과 카드 이미지가 다운로드되었습니다!');
  };

  const handleCopyClipboard = async () => {
    if (!imageBlob) return;
    try {
      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({
            'image/png': imageBlob,
          }),
        ]);
        setCopied(true);
        showToast('클립보드에 이미지가 복사되었습니다! 메신저나 SNS에 바로 붙여넣기(Ctrl+V)하세요.');
        setTimeout(() => setCopied(false), 2500);
      } else {
        handleDownload();
      }
    } catch (err) {
      handleDownload();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-progress-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="share-progress-modal-title"
                className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2"
              >
                <span>학습 성과 카드 공유 (Share Progress)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  HD 16:9 이미지
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                연속 실천 스트릭({data.currentStreak}일)과 총 반복 청취({data.totalRepeatsCount.toLocaleString()}회)가 담긴 요약 카드입니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Card Image Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex flex-col items-center">
          
          {/* Toast Notice */}
          {toastMessage && (
            <div className="w-full p-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Image Container */}
          <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-2xl relative flex items-center justify-center aspect-[16/9] group">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2.5 py-12">
                <Activity className="w-7 h-7 text-indigo-400 animate-spin" />
                <span className="text-xs font-bold text-slate-300">
                  고화질 성과 카드 렌더링 중...
                </span>
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt="WordLoop Progress Card"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-xs text-rose-400 font-bold py-12">
                이미지 생성에 실패했습니다.
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>연속 {data.currentStreak}일 달성</span>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center gap-1.5">
              <Headphones className="w-4 h-4 text-emerald-500" />
              <span>총 {data.totalRepeatsCount.toLocaleString()}회 청취</span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-500" />
              <span>목표 {data.completedGoalsCount}/{data.totalGoalsCount}개 완료</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            💡 모바일 메신저(카카오톡, 인스타그램, 메시지) 및 SNS에 공유할 수 있습니다.
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Native Web Share API */}
            <button
              onClick={handleNativeShare}
              disabled={isGenerating || isSharing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>{isSharing ? '공유 창 여는 중...' : 'SNS / 메신저로 공유'}</span>
            </button>

            {/* 2. Download File */}
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>이미지 저장 (PNG)</span>
            </button>

            {/* 3. Clipboard Copy */}
            <button
              onClick={handleCopyClipboard}
              disabled={isGenerating}
              className="p-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              title="클립보드에 이미지 복사"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
