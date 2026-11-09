import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Flame,
  Zap,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface InactivityQuizToastProps {
  elapsedHours: number;
  onStartQuiz: () => void;
  onClose: () => void;
}

export const InactivityQuizToast: React.FC<InactivityQuizToastProps> = ({
  elapsedHours,
  onStartQuiz,
  onClose,
}) => {
  const [progressPct, setProgressPct] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const totalSeconds = 20; // 20-second gentle auto-dismiss
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isPaused) return;

    const interval = 100; // update every 100ms
    const step = (interval / (totalSeconds * 1000)) * 100;

    timerRef.current = setInterval(() => {
      setProgressPct((prev) => {
        if (prev <= step) {
          clearInterval(timerRef.current);
          onClose();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, onClose]);

  const displayHours = Math.floor(elapsedHours) || 24;

  return (
    <aside
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="fixed top-16 md:top-20 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg animate-in fade-in slide-in-from-top-6 duration-300 pointer-events-auto select-none"
    >
      <div className="relative rounded-3xl bg-slate-950/95 dark:bg-slate-900/95 text-white border-2 border-amber-500/60 shadow-2xl backdrop-blur-xl p-4 sm:p-5 overflow-hidden flex flex-col gap-3.5">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-r from-amber-500/30 via-orange-500/25 to-indigo-500/30 blur-2xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-slate-950 flex items-center justify-center font-black text-xl shrink-0 shadow-lg shadow-amber-500/30 animate-pulse">
              <BrainCircuit className="w-6 h-6 text-slate-950" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs">
                  <Flame className="w-3 h-3 fill-current" />
                  <span>24시간+ 만의 반가운 복귀</span>
                </span>
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>약 {displayHours}시간 경과</span>
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-black text-white mt-1 tracking-tight">
                3분 퀵 퀴즈로 가볍게 두뇌 워밍업할까요?
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="알림 닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description Body */}
        <p className="text-xs text-slate-300 leading-relaxed relative z-10">
          에빙하우스 망각 곡선에 따르면 <strong className="text-amber-400 font-bold">24시간</strong>이 지나면 어휘 기억의 70%가 손실됩니다. 단 3분의 스피드 퀴즈로 기억을 인출하고 연속 학습 스트릭을 안전하게 지켜보세요!
        </p>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between gap-2.5 pt-1 relative z-10 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>부담 없는 3분 숏폼 복습</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-center"
            >
              나중에 하기
            </button>

            <button
              type="button"
              onClick={onStartQuiz}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all cursor-pointer group active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>3분 퀵 퀴즈 시작</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Auto-Dismiss Progress Bar */}
        <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden mt-0.5">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 transition-all duration-100 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>

      </div>
    </aside>
  );
};
