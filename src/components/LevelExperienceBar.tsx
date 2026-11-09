import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Trophy, Zap, ChevronRight } from 'lucide-react';
import { StudentLevelInfo } from '../services/studentGamificationService';

export interface LevelExperienceBarProps {
  levelInfo: StudentLevelInfo;
  onClick?: () => void;
  variant?: 'compact' | 'full' | 'inline';
  className?: string;
}

/**
 * LevelExperienceBar Component
 * Renders an animated experience bar in the Navbar that tracks the student's progress
 * toward their next student level and title. Plays a glow/pulse animation whenever EXP increases.
 */
export const LevelExperienceBar: React.FC<LevelExperienceBarProps> = ({
  levelInfo,
  onClick,
  variant = 'compact',
  className = '',
}) => {
  const [isExpGainedPulse, setIsExpGainedPulse] = useState(false);
  const prevExpRef = useRef(levelInfo.currentExp);

  // Trigger pulse effect whenever EXP increases (milestone / goal completed)
  useEffect(() => {
    if (levelInfo.currentExp > prevExpRef.current) {
      setIsExpGainedPulse(true);
      const timer = setTimeout(() => setIsExpGainedPulse(false), 1400);
      prevExpRef.current = levelInfo.currentExp;
      return () => clearTimeout(timer);
    }
    prevExpRef.current = levelInfo.currentExp;
  }, [levelInfo.currentExp]);

  const isMaxLevel = levelInfo.level >= 50;
  const remExp = isMaxLevel ? 0 : Math.max(0, levelInfo.expForNextLevel - levelInfo.currentExp);
  const percent = Math.min(100, Math.max(4, levelInfo.progressPercent));

  // Variant 1: Compact (Header chip layout for Navbar toolbar)
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`Lv.${levelInfo.level} ${levelInfo.title} (${levelInfo.currentExp.toLocaleString()} EXP) - ${
          isMaxLevel ? '최고 레벨 도달! (MAX)' : `다음 칭호까지 ${remExp.toLocaleString()} EXP 남음`
        }`}
        className={`relative inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 text-xs transition-all select-none cursor-pointer group shrink-0 ${
          isExpGainedPulse
            ? 'ring-2 ring-amber-400 shadow-md shadow-amber-400/30 scale-105'
            : 'hover:scale-[1.02] active:scale-95'
        } ${className}`}
      >
        {/* Glow Aura when EXP increases */}
        {isExpGainedPulse && (
          <span className="absolute -inset-1 rounded-xl bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-500 opacity-60 blur-xs animate-pulse pointer-events-none" />
        )}

        {/* Level Emoji & Badge */}
        <div className="relative flex items-center justify-center shrink-0">
          <span className="text-sm leading-none transform group-hover:scale-110 transition-transform">
            {levelInfo.badgeEmoji}
          </span>
          <span className="absolute -bottom-1 -right-1 text-[8px] font-black px-1 py-0.1 rounded-full bg-slate-900 text-amber-300 border border-amber-400/50 leading-none">
            {levelInfo.level}
          </span>
        </div>

        {/* Title & Animated Mini Progress Bar */}
        <div className="flex flex-col gap-0.5 text-left min-w-[90px] max-w-[125px]">
          <div className="flex items-center justify-between text-[10px] leading-tight font-extrabold gap-1">
            <span className="truncate text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {levelInfo.title}
            </span>
            <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              {levelInfo.progressPercent}%
            </span>
          </div>

          {/* Animated Candy Bar */}
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden p-0.2 relative shadow-inner">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${levelInfo.themeColor} transition-all duration-700 ease-out shadow-xs`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0" />
      </button>
    );
  }

  // Variant 2: Inline (Subtle single-line badge for tight spaces)
  if (variant === 'inline') {
    return (
      <div
        onClick={onClick}
        title={`Lv.${levelInfo.level} ${levelInfo.title} (${levelInfo.progressPercent}%)`}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer ${className}`}
      >
        <span>{levelInfo.badgeEmoji}</span>
        <span>Lv.{levelInfo.level}</span>
        <div className="w-12 h-1.5 rounded-full bg-emerald-200 dark:bg-emerald-900 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${levelInfo.themeColor} transition-all duration-500`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  // Variant 3: Full (Detailed card format)
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2 cursor-pointer hover:border-emerald-500/40 transition-all ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{levelInfo.badgeEmoji}</span>
          <div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">
              Lv.{levelInfo.level} 학생 칭호
            </div>
            <div className="font-black text-slate-900 dark:text-slate-100">
              {levelInfo.title}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            {levelInfo.progressPercent}%
          </div>
          <div className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">
            {levelInfo.currentExp.toLocaleString()} / {levelInfo.expForNextLevel.toLocaleString()} EXP
          </div>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden p-0.5 shadow-inner">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${levelInfo.themeColor} transition-all duration-700`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
          <Sparkles className="w-3 h-3" />
          {levelInfo.unlockedPerk}
        </span>
        <span>{isMaxLevel ? '🏆 최고 레벨 도달! (MAX)' : `다음 레벨까지 ${remExp.toLocaleString()} EXP 남음`}</span>
      </div>
    </div>
  );
};

export default LevelExperienceBar;
