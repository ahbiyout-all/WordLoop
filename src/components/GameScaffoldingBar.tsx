import React from 'react';
import { Lightbulb, Volume2, ChevronRight, Brain } from 'lucide-react';
import { VocabItem } from '../types';
import {
  buildFadedScaffoldingHints,
  getZpdProfile,
  ZpdLevel,
  playCognitiveCueSound,
} from '../services/cognitiveGameEngine';
import { speechService } from '../services/speechService';

interface GameScaffoldingBarProps {
  item: VocabItem | undefined;
  hintTier: 0 | 1 | 2 | 3;
  onAdvanceHint: () => void;
  zpdLevel: ZpdLevel;
  lastFeedbackLabel?: string | null;
  disabled?: boolean;
  hideAnswerInTier3?: boolean;
}

export const GameScaffoldingBar: React.FC<GameScaffoldingBarProps> = ({
  item,
  hintTier,
  onAdvanceHint,
  zpdLevel,
  lastFeedbackLabel,
  disabled = false,
  hideAnswerInTier3 = false,
}) => {
  if (!item) return null;
  const hints = buildFadedScaffoldingHints(item);
  const zpdProfile = getZpdProfile(zpdLevel);

  const handleHintClick = () => {
    if (disabled || hintTier >= 3) return;
    playCognitiveCueSound('hint');
    onAdvanceHint();
  };

  return (
    <div className="space-y-2 w-full">
      {/* Compact ZPD Status & Scaffolding Trigger Row (Zero-pill inline metadata) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 text-xs">
        <div className="flex items-center gap-2 min-w-0 text-slate-600 dark:text-slate-300">
          <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {zpdProfile.label}
          </span>
          {lastFeedbackLabel && (
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 truncate">
              · {lastFeedbackLabel}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleHintClick}
          disabled={disabled || hintTier >= 3}
          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-45 text-amber-800 dark:text-amber-200 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 font-mono tabular-nums"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>
            {hintTier >= 3 ? '3/3 단계 힌트 완료' : `단계별 힌트 (${hintTier}/3)`}
          </span>
          {hintTier < 3 && <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Revealed Faded Scaffolding Tiers (Single-elevation flat panel) */}
      {hintTier >= 1 && (
        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/50 space-y-2 text-left animate-in fade-in duration-150">
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
              {hints.tier1Title}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              {hints.tier1Body}
            </p>
            {hints.tier1Sub && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {hints.tier1Sub}
              </p>
            )}
          </div>

          {hintTier >= 2 && (
            <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/40 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  {hints.tier2Title}
                </p>
                <button
                  type="button"
                  onClick={() => speechService.playItem(item.id, item.word, undefined, 1)}
                  className="px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>발음 단서</span>
                </button>
              </div>
              <p className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                {hints.tier2Body}
              </p>
              {hints.tier2Sub && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {hints.tier2Sub}
                </p>
              )}
            </div>
          )}

          {hintTier >= 3 && !hideAnswerInTier3 && (
            <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/40 space-y-0.5">
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                {hints.tier3Title}
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {hints.tier3Body}
              </p>
              {hints.tier3Sub && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {hints.tier3Sub}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
