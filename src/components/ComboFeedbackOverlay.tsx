import React, { useEffect, useState } from 'react';
import { Flame, Zap, Sparkles, Award } from 'lucide-react';

interface ComboFeedbackOverlayProps {
  combo: number;
  lastScoreGain?: number;
  label?: string;
}

export const ComboFeedbackOverlay: React.FC<ComboFeedbackOverlayProps> = ({
  combo,
  lastScoreGain,
  label = '연속 정답!',
}) => {
  const [visible, setVisible] = useState(false);
  const [animatePop, setAnimatePop] = useState(false);

  useEffect(() => {
    if (combo >= 2) {
      setVisible(true);
      setAnimatePop(true);
      const timer = setTimeout(() => {
        setAnimatePop(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [combo]);

  if (!visible || combo < 2) return null;

  // Visual intensity scale based on combo count
  const isSuper = combo >= 5;
  const isUltra = combo >= 10;

  return (
    <div className="pointer-events-none fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center">
      <div
        className={`px-4 py-2 rounded-2xl flex items-center gap-2.5 transition-all duration-300 transform shadow-xl ${
          animatePop ? 'scale-110 -translate-y-1' : 'scale-100 translate-y-0'
        } ${
          isUltra
            ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white ring-4 ring-amber-300/60 shadow-amber-500/30'
            : isSuper
            ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white ring-2 ring-orange-400/40 shadow-orange-500/30'
            : 'bg-white/95 dark:bg-slate-900/95 text-amber-500 dark:text-amber-400 border border-amber-300 dark:border-amber-600/40 backdrop-blur-md'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isUltra
              ? 'bg-white/20 text-yellow-200 animate-spin-slow'
              : isSuper
              ? 'bg-white/20 text-white animate-bounce'
              : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300'
          }`}
        >
          {isUltra ? (
            <Sparkles className="w-5 h-5 fill-current" />
          ) : isSuper ? (
            <Flame className="w-5 h-5 fill-current" />
          ) : (
            <Zap className="w-5 h-5 fill-current" />
          )}
        </div>

        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-wider uppercase">
              {combo} COMBO!
            </span>
            {isUltra && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-white text-purple-700">
                UNSTOPPABLE
              </span>
            )}
            {isSuper && !isUltra && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-white/30 text-white">
                FEVER
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs opacity-90 font-medium">
            <span>{label}</span>
            {lastScoreGain ? (
              <span className="font-extrabold text-yellow-300">
                (+{lastScoreGain}점)
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
