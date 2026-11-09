import React from 'react';
import { Sparkles, Trophy, Flame, ChevronRight, Zap, Crown } from 'lucide-react';
import { StudentLevelInfo } from '../services/studentGamificationService';
import { triggerLevelUpBanner } from './ConfettiCanvas';

interface StudentLevelCardProps {
  levelInfo: StudentLevelInfo;
  onOpenBadges?: () => void;
  className?: string;
}

export const StudentLevelCard: React.FC<StudentLevelCardProps> = ({
  levelInfo,
  onOpenBadges,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    triggerLevelUpBanner({
      type: 'level_up',
      title: `Lv.${levelInfo.level} ${levelInfo.title}`,
      subtitle: `축하합니다! 누적 ${levelInfo.currentExp.toLocaleString()} EXP를 달성하여 학생 레벨이 상승했습니다!`,
      badgeEmoji: levelInfo.badgeEmoji,
      levelNumber: levelInfo.level,
      unlockedTitle: levelInfo.title,
      perkText: levelInfo.unlockedPerk,
      expGained: levelInfo.currentExp,
    });
    if (onOpenBadges) {
      onOpenBadges();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-amber-500/10 dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-amber-950/30 border border-violet-200/80 dark:border-violet-800/60 shadow-md backdrop-blur-sm transition-all hover:scale-[1.01] cursor-pointer group ${className}`}
    >
      {/* Background Decorative Pastel Blobs */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-pink-400/20 to-purple-400/20 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-gradient-to-tr from-amber-300/20 to-emerald-300/20 blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Level Icon & Title */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${levelInfo.themeColor} flex items-center justify-center text-3xl shadow-lg shadow-violet-500/25 shrink-0 transform group-hover:rotate-6 transition-transform`}
            >
              {levelInfo.badgeEmoji}
            </div>
            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black tracking-tight border border-white/20">
              Lv.{levelInfo.level}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                학생 칭호
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/50">
                {levelInfo.unlockedPerk}
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
              <span>{levelInfo.title}</span>
            </h4>
          </div>
        </div>

        {/* Right: EXP Bar & Progress */}
        <div className="w-full sm:w-64 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-400">
              EXP {levelInfo.currentExp.toLocaleString()} pt
            </span>
            <span className="text-violet-600 dark:text-violet-400">
              {levelInfo.progressPercent}%
            </span>
          </div>

          {/* Candy Vivid Pastel Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-200/80 dark:bg-slate-800 p-0.5 overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${levelInfo.themeColor} transition-all duration-700 shadow-sm`}
              style={{ width: `${Math.max(6, levelInfo.progressPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
            <span>다음 레벨까지</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {levelInfo.level >= 50
                ? '최고 레벨 도달!'
                : `${(levelInfo.expForNextLevel - levelInfo.currentExp).toLocaleString()} EXP 남음`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
