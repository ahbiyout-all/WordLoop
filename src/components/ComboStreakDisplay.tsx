import React, { useEffect, useState, useRef } from 'react';
import { Flame, Zap, Trophy, Sparkles, Award, Crown } from 'lucide-react';
import { confettiService } from '../services/confettiService';
import { getLocalDateString } from '../utils/dateUtils';

export interface ComboStreakDisplayProps {
  combo: number;
  maxCombo?: number;
  showMaxCombo?: boolean;
  dailyBestCombo?: number;
  showDailyBest?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  variant?: 'pill' | 'card' | 'inline' | 'floating';
  className?: string;
  onMilestoneReached?: (milestone: number) => void;
  onNewPersonalBest?: (newBest: number) => void;
}

/**
 * Helper to get the current local calendar date string (YYYY-MM-DD)
 */
export const getTodayDateKey = (): string => {
  return getLocalDateString();
};

/**
 * Retrieves the user's stored personal best combo for today from localStorage
 */
export const getDailyBestComboFromStorage = (dateKey: string = getTodayDateKey()): number => {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(`wordloop_daily_best_combo_${dateKey}`);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
};

/**
 * Saves the user's personal best combo for today to localStorage
 */
export const setDailyBestComboInStorage = (combo: number, dateKey: string = getTodayDateKey()): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`wordloop_daily_best_combo_${dateKey}`, combo.toString());
  } catch {}
};

/**
 * ComboStreakDisplay - Scaling Text & Visual Effects with Daily Personal Best Indicator
 * Calculates and renders the user's error-free practice streak in a single sitting,
 * featuring a scaling text size effect, dynamic fire emojis, milestone pop animations,
 * and a prominent visual indicator highlighting the user's 'personal best' combo for the current day.
 */
export const ComboStreakDisplay: React.FC<ComboStreakDisplayProps> = ({
  combo,
  maxCombo = 0,
  showMaxCombo = true,
  dailyBestCombo,
  showDailyBest = true,
  size = 'md',
  variant = 'pill',
  className = '',
  onMilestoneReached,
  onNewPersonalBest,
}) => {
  const [isBumped, setIsBumped] = useState(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [currentDailyBest, setCurrentDailyBest] = useState<number>(() => {
    if (typeof dailyBestCombo === 'number') return dailyBestCombo;
    return getDailyBestComboFromStorage();
  });

  const prevComboRef = useRef(combo);
  const initialBestRef = useRef(currentDailyBest);

  // Sync external dailyBestCombo prop if supplied
  useEffect(() => {
    if (typeof dailyBestCombo === 'number' && dailyBestCombo > currentDailyBest) {
      setCurrentDailyBest(dailyBestCombo);
    }
  }, [dailyBestCombo, currentDailyBest]);

  // Track combo increments, check for new Personal Best for today, and trigger animations
  useEffect(() => {
    if (combo > prevComboRef.current) {
      setIsBumped(true);
      const bumpTimer = setTimeout(() => setIsBumped(false), 450);

      // Check if this is a new Personal Best for today
      if (combo > currentDailyBest) {
        const prevBest = currentDailyBest;
        setCurrentDailyBest(combo);
        setDailyBestComboInStorage(combo);
        setIsNewPersonalBest(true);

        if (onNewPersonalBest) {
          onNewPersonalBest(combo);
        }

        // Trigger celebratory confetti if breaking a previous record of at least 3
        if (prevBest >= 3) {
          confettiService.fire({ particleCount: 35, spread: 60 });
        }
      }

      // Trigger milestone celebration confetti on 5, 10, 15, 20 combo
      if (combo === 5 || combo === 10 || combo === 15 || combo % 10 === 0) {
        confettiService.fire({ particleCount: 30 + combo * 2, spread: 60 });
        if (onMilestoneReached) {
          onMilestoneReached(combo);
        }
      }

      prevComboRef.current = combo;
      return () => clearTimeout(bumpTimer);
    } else if (combo === 0) {
      setIsNewPersonalBest(false);
    }

    prevComboRef.current = combo;
  }, [combo, currentDailyBest, onMilestoneReached, onNewPersonalBest]);

  // Dynamic visual styling and text scaling by combo count
  const getComboStyles = (count: number) => {
    if (count >= 20) {
      return {
        textSize: 'text-2xl sm:text-3xl md:text-4xl font-black',
        gradientText: 'bg-gradient-to-r from-amber-300 via-rose-400 to-purple-400 text-transparent bg-clip-text drop-shadow-md',
        badgeBg: 'bg-gradient-to-r from-amber-500/25 via-rose-500/30 to-purple-500/25 border-amber-400/60 dark:border-amber-500/50 shadow-lg shadow-amber-500/20',
        title: '⚡ 20+ 전설의 신의 콤보!',
        fireIcon: <Zap className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />,
        accentColor: 'text-amber-400',
        emoji: '⚡🔥👑',
      };
    }
    if (count >= 10) {
      return {
        textSize: 'text-xl sm:text-2xl md:text-3xl font-black',
        gradientText: 'bg-gradient-to-r from-amber-400 to-rose-500 text-transparent bg-clip-text drop-shadow-xs',
        badgeBg: 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border-amber-400/50 dark:border-amber-500/40 shadow-md shadow-orange-500/15',
        title: '🔥 10+ 폭발적 콤보!',
        fireIcon: <Flame className="w-5 h-5 text-rose-500 animate-pulse shrink-0" />,
        accentColor: 'text-rose-400',
        emoji: '🔥⚡',
      };
    }
    if (count >= 5) {
      return {
        textSize: 'text-lg sm:text-xl md:text-2xl font-black',
        gradientText: 'bg-gradient-to-r from-orange-400 to-amber-500 text-transparent bg-clip-text',
        badgeBg: 'bg-gradient-to-r from-orange-500/15 to-amber-500/15 border-orange-400/40 dark:border-orange-500/30 shadow-xs shadow-orange-500/10',
        title: '🔥 5+ 연속 정답 콤보!',
        fireIcon: <Flame className="w-4 h-4 text-orange-500 shrink-0" />,
        accentColor: 'text-orange-400',
        emoji: '🔥',
      };
    }
    if (count >= 3) {
      return {
        textSize: 'text-base sm:text-lg md:text-xl font-extrabold',
        gradientText: 'text-amber-500 dark:text-amber-400',
        badgeBg: 'bg-amber-500/10 border-amber-400/30 dark:border-amber-500/20',
        title: '✨ 3연속 정답!',
        fireIcon: <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />,
        accentColor: 'text-amber-400',
        emoji: '✨',
      };
    }
    if (count >= 1) {
      return {
        textSize: 'text-xs sm:text-sm md:text-base font-bold',
        gradientText: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-500/10 border-emerald-400/30 dark:border-emerald-500/20',
        title: '연속 정답 달성 중',
        fireIcon: <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
        accentColor: 'text-emerald-400',
        emoji: '🌱',
      };
    }
    return {
      textSize: 'text-xs font-semibold',
      gradientText: 'text-slate-400 dark:text-slate-500',
      badgeBg: 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80',
      title: '연속 정답 도전!',
      fireIcon: null,
      accentColor: 'text-slate-400',
      emoji: '',
    };
  };

  const currentStyles = getComboStyles(combo);
  const isPersonalBestAchieved = currentDailyBest >= 2 && combo >= currentDailyBest;

  // When combo is 0 in pill mode:
  // If user has a personal best for today, render a sleek motivation target badge
  if (combo <= 0 && variant === 'pill') {
    if (showDailyBest && currentDailyBest >= 2) {
      return (
        <div
          role="status"
          aria-label={`오늘 개인 최고 연속 정답 기록: ${currentDailyBest} 콤보`}
          title={`오늘 개인 최고 연속 정답 기록: ${currentDailyBest} COMBO! 다시 연속 정답에 도전해 보세요.`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all select-none backdrop-blur-sm ${className}`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">오늘 최고</span>
          <span className="font-mono font-black text-amber-600 dark:text-amber-400">{currentDailyBest} COMBO</span>
        </div>
      );
    }
    return null;
  }

  // Variant 1: Pill Badge (Compact header pill with Personal Best highlight)
  if (variant === 'pill') {
    return (
      <div
        role="status"
        aria-label={`현재 연속 정답 ${combo} 콤보${isPersonalBestAchieved ? ', 오늘 개인 최고 기록!' : ''}`}
        title={`현재 연속 정답: ${combo} COMBO ${currentStyles.title}${currentDailyBest > 0 ? ` (오늘 개인 최고: ${currentDailyBest} COMBO)` : ''}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-sm transition-all duration-300 select-none ${
          currentStyles.badgeBg
        } ${isBumped ? 'scale-125 ring-2 ring-amber-400 shadow-lg' : 'scale-100'} ${className}`}
      >
        {currentStyles.fireIcon}
        <div className="flex items-baseline gap-1">
          <span className={`${currentStyles.textSize} ${currentStyles.gradientText} font-mono tracking-tight leading-none transition-all duration-300`}>
            {combo}
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            COMBO
          </span>
        </div>

        {/* Visual Indicator: Personal Best Highlight for Today */}
        {showDailyBest && isPersonalBestAchieved && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-xs border border-amber-300/80 animate-pb-pop animate-golden-shimmer"
            title="오늘의 개인 최고 연속 정답 기록 경신!"
          >
            <Crown className="w-2.5 h-2.5 fill-current" />
            <span>오늘 최고!</span>
          </span>
        )}

        {/* Visual Indicator: Target to beat when combo < today's best */}
        {showDailyBest && !isPersonalBestAchieved && currentDailyBest > combo && currentDailyBest >= 3 && (
          <span
            className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30"
            title={`오늘의 개인 최고: ${currentDailyBest} COMBO (목표까지 ${currentDailyBest - combo}개 남음)`}
          >
            <Trophy className="w-2.5 h-2.5 text-amber-500 shrink-0" />
            <span>오늘 최고 {currentDailyBest}</span>
          </span>
        )}

        {combo >= 5 && !isPersonalBestAchieved && (
          <span className="text-xs select-none">{currentStyles.emoji}</span>
        )}
      </div>
    );
  }

  // Variant 2: Card / Widget (Full statistics box for Quiz results & Speed mode with PB highlight)
  if (variant === 'card') {
    return (
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 space-y-2 text-center ${
          currentStyles.badgeBg
        } ${isBumped ? 'scale-105 ring-2 ring-amber-400 shadow-xl' : 'scale-100'} ${className}`}
      >
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
          {currentStyles.fireIcon}
          <span>{currentStyles.title}</span>
        </div>

        <div className="flex items-center justify-center gap-2 py-0.5">
          <span
            className={`${currentStyles.textSize} ${currentStyles.gradientText} font-mono font-black tracking-tight transition-all duration-300 transform ${
              isBumped ? 'scale-125' : 'scale-100'
            }`}
          >
            {combo}
          </span>
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
            COMBO
          </span>
        </div>

        {/* Personal Best Visual Indicator Banner */}
        {showDailyBest && currentDailyBest > 0 && (
          <div
            className={`p-2 rounded-xl flex items-center justify-between gap-2 text-xs font-bold transition-all ${
              isPersonalBestAchieved
                ? 'bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border border-amber-400/60 text-amber-800 dark:text-amber-200 shadow-sm animate-pulse'
                : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {isPersonalBestAchieved ? (
                <Crown className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
              ) : (
                <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <span>오늘의 개인 최고 (Daily PB)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                {currentDailyBest} COMBO
              </span>
              {isPersonalBestAchieved && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950">
                  NEW!
                </span>
              )}
            </div>
          </div>
        )}

        {showMaxCombo && maxCombo > 0 && (
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>이번 세션 최고 기록:</span>
            <span className="font-bold text-indigo-500 font-mono">{maxCombo} COMBO</span>
          </div>
        )}
      </div>
    );
  }

  // Variant 3: Floating Overlay (Big banner pop during speed quiz or quiz sessions)
  if (variant === 'floating') {
    return (
      <div
        className={`fixed top-16 right-4 z-40 pointer-events-none transition-all duration-300 ${
          isBumped ? 'scale-110 opacity-100' : 'scale-100 opacity-90'
        } ${className}`}
      >
        <div
          className={`px-4 py-2 rounded-2xl border shadow-xl backdrop-blur-md flex items-center gap-2.5 ${currentStyles.badgeBg}`}
        >
          {currentStyles.fireIcon}
          <div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-200">
              <span>학습 연속 콤보</span>
              {isPersonalBestAchieved && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-black bg-amber-400 text-slate-950">
                  👑 오늘 최고!
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`${currentStyles.textSize} ${currentStyles.gradientText} font-mono font-black`}>
                {combo}
              </span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">COMBO</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Variant 4: Inline (Minimal single-line badge with PB highlight)
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${className}`}>
      {currentStyles.fireIcon}
      <span className={`${currentStyles.textSize} ${currentStyles.gradientText} font-mono`}>
        {combo}
      </span>
      <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold">COMBO</span>
      {showDailyBest && currentDailyBest > 0 && (
        <span
          className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full border ${
            isPersonalBestAchieved
              ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400/50'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
          }`}
          title={`오늘 개인 최고: ${currentDailyBest} COMBO`}
        >
          {isPersonalBestAchieved ? <Crown className="w-2.5 h-2.5 text-amber-500" /> : <Trophy className="w-2.5 h-2.5 text-amber-500" />}
          <span>PB {currentDailyBest}</span>
        </span>
      )}
    </div>
  );
};

export default ComboStreakDisplay;
