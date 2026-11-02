import React from 'react';

export interface StreakFireProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
  variant?: 'badge' | 'compact' | 'hero';
}

/**
 * StreakFire - Animated Fire Visual Component
 * Renders an animated, multi-layered flame with dynamic intensity levels
 * and the current streak count.
 */
export const StreakFire: React.FC<StreakFireProps> = ({
  streak,
  size = 'md',
  showLabel = true,
  className = '',
  onClick,
  variant = 'badge',
}) => {
  // Only render when user has a streak greater than 0
  if (streak <= 0) {
    return null;
  }

  // Determine flame intensity tier based on streak days
  const isSuperStreak = streak >= 30; // 30+ days: Legendary Inferno
  const isBlazing = streak >= 14;     // 14+ days: Blazing Fire
  const isHot = streak >= 7;          // 7+ days: Hot Streak

  // Size styling maps
  const sizeConfig = {
    sm: {
      container: 'px-2 py-0.5 text-[10px] gap-1',
      iconSize: 'w-3.5 h-3.5',
      countText: 'text-xs font-black',
      labelText: 'text-[9px] font-bold',
      sparks: 1,
    },
    md: {
      container: 'px-2.5 py-1 text-xs gap-1.5',
      iconSize: 'w-4 h-4',
      countText: 'text-sm font-black',
      labelText: 'text-[10px] font-bold',
      sparks: 2,
    },
    lg: {
      container: 'px-3.5 py-1.5 text-sm gap-2',
      iconSize: 'w-5 h-5',
      countText: 'text-base font-black',
      labelText: 'text-xs font-extrabold',
      sparks: 3,
    },
  }[size];

  // Visual color theme by tier
  const colorTheme = isSuperStreak
    ? {
        bg: 'bg-gradient-to-r from-amber-500/25 via-rose-500/25 to-purple-500/25 dark:from-amber-950/50 dark:via-rose-950/50 dark:to-purple-950/50',
        border: 'border-amber-400/60 dark:border-amber-500/50 shadow-amber-500/20',
        text: 'text-amber-300 dark:text-amber-200',
        glow: 'shadow-lg shadow-rose-500/25',
        badgeTitle: '🔥 전설의 30일+ 인페르노 스트릭',
      }
    : isBlazing
    ? {
        bg: 'bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-rose-500/20 dark:from-orange-950/50 dark:via-amber-950/50 dark:to-rose-950/50',
        border: 'border-orange-400/50 dark:border-orange-500/40 shadow-orange-500/20',
        text: 'text-orange-300 dark:text-orange-200',
        glow: 'shadow-md shadow-orange-500/20',
        badgeTitle: '🔥 활활 타오르는 14일+ 대화재 스트릭',
      }
    : isHot
    ? {
        bg: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-950/40 dark:to-orange-950/40',
        border: 'border-amber-400/40 dark:border-amber-500/30',
        text: 'text-amber-300 dark:text-amber-200',
        glow: 'shadow-sm shadow-amber-500/15',
        badgeTitle: '🔥 7일 연속 집중 활활 스트릭',
      }
    : {
        bg: 'bg-emerald-500/15 dark:bg-emerald-950/40',
        border: 'border-emerald-500/35 dark:border-emerald-500/30',
        text: 'text-emerald-300 dark:text-emerald-200',
        glow: '',
        badgeTitle: '🔥 연속 출석 학습 스트릭 진행 중',
      };

  const Content = (
    <>
      {/* Animated Multi-Layered SVG Flame */}
      <span className={`relative inline-flex items-center justify-center shrink-0 ${sizeConfig.iconSize}`}>
        {/* Ambient Flame Glow */}
        <span
          className={`absolute -inset-1 rounded-full opacity-70 blur-[4px] pointer-events-none transition-all ${
            isSuperStreak
              ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-500 animate-pulse'
              : isBlazing
              ? 'bg-gradient-to-tr from-orange-500 to-amber-300 animate-pulse'
              : 'bg-amber-400/60 animate-pulse'
          }`}
          style={{ animationDuration: isSuperStreak ? '1s' : '1.8s' }}
        />

        {/* Dynamic Multi-layered SVG Flame */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 w-full h-full drop-shadow-sm select-none"
          style={{
            animation: 'streakFlameFlicker 1.4s ease-in-out infinite alternate',
            transformOrigin: 'bottom center',
          }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="streakOuterFlame" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="streakInnerFlame" x1="12" y1="8" x2="12" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fef08a" />
              <stop offset="85%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {/* Outer Flame Silhouette */}
          <path
            d="M12 2C10.5 4.5 10 6.5 10 8.5C10 9.2 10.1 9.9 10.3 10.5C9.5 9.7 9 8.6 9 7.5C6.5 9.5 5 12.2 5 15C5 18.87 8.13 22 12 22C15.87 22 19 18.87 19 15C19 11.2 16.5 8 13.5 5.5C13.5 6.8 13.1 8 12.3 8.9C12.1 7.2 12.3 4.5 12 2Z"
            fill="url(#streakOuterFlame)"
          />

          {/* Hot Core Inner Flame */}
          <path
            d="M12 9C11.2 10.5 11 11.5 11 12.8C11 13.3 11.1 13.7 11.2 14.1C10.7 13.6 10.4 12.9 10.4 12.2C9 13.3 8 14.8 8 16.5C8 18.7 9.8 20.5 12 20.5C14.2 20.5 16 18.7 16 16.5C16 14.2 14.5 12.2 13 10.8C12.9 11.5 12.7 12.2 12.2 12.8C12.1 11.8 12.1 10.3 12 9Z"
            fill="url(#streakInnerFlame)"
            style={{
              animation: 'streakInnerCorePulse 0.9s ease-in-out infinite alternate',
              transformOrigin: 'bottom center',
            }}
          />

          {/* Spark Particles */}
          <circle cx="16" cy="6" r="0.8" fill="#fef08a" opacity="0.9" className="animate-ping" style={{ animationDuration: '1.6s' }} />
          {isHot && (
            <circle cx="8" cy="9" r="0.6" fill="#fbbf24" opacity="0.85" className="animate-ping" style={{ animationDuration: '2.1s' }} />
          )}
        </svg>
      </span>

      {/* Streak Count with Flame Accents */}
      <span className="inline-flex items-baseline gap-0.5">
        <span
          className={`${sizeConfig.countText} font-mono tracking-tight ${colorTheme.text} drop-shadow-xs`}
        >
          {streak.toLocaleString()}
        </span>
        {showLabel && (
          <span className={`${sizeConfig.labelText} text-slate-300 dark:text-slate-300`}>
            일 연속
          </span>
        )}
      </span>
    </>
  );

  const containerClasses = `inline-flex items-center rounded-full border transition-all select-none backdrop-blur-sm ${sizeConfig.container} ${colorTheme.bg} ${colorTheme.border} ${colorTheme.glow} ${
    onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
  } ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        title={`${streak}일 연속 학습 중! ${colorTheme.badgeTitle}`}
        aria-label={`${streak}일 연속 학습 스트릭 달성`}
        className={containerClasses}
      >
        {Content}
      </button>
    );
  }

  return (
    <div
      role="status"
      title={`${streak}일 연속 학습 중! ${colorTheme.badgeTitle}`}
      aria-label={`${streak}일 연속 학습 스트릭 달성`}
      className={containerClasses}
    >
      {Content}
    </div>
  );
};

export default StreakFire;
