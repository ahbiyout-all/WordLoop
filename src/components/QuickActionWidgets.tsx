import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Mic,
  Gamepad2,
  Flame,
  Shuffle,
  Sparkles,
  Award,
  ChevronRight,
  Zap,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import { ActiveTab, VocabItem } from '../types';
import {
  DailyQuestProgress,
  getDailyQuestProgress,
  isQuestAllCompleted,
  getTodayDateString,
} from '../services/habitQuestService';

interface QuickActionWidgetsProps {
  vocabList: VocabItem[];
  onNavigateTab: (tab: ActiveTab) => void;
  onStartPronunciation: (text: string) => void;
  onOpenDailyQuest: () => void;
  onTriggerRandomLaunch: () => void;
}

export const QuickActionWidgets: React.FC<QuickActionWidgetsProps> = ({
  vocabList,
  onNavigateTab,
  onStartPronunciation,
  onOpenDailyQuest,
  onTriggerRandomLaunch,
}) => {
  const [quest, setQuest] = useState<DailyQuestProgress>(getDailyQuestProgress());

  // Listen to quest updates
  useEffect(() => {
    const handleQuestUpdate = (e: any) => {
      if (e.detail) {
        setQuest(e.detail);
      }
    };
    window.addEventListener('wordloop_quest_updated', handleQuestUpdate);
    return () => window.removeEventListener('wordloop_quest_updated', handleQuestUpdate);
  }, []);

  const completedCount =
    (quest.wordsExploredCount >= 3 ? 1 : 0) +
    (quest.pronunciationCompleted ? 1 : 0) +
    (quest.gameCompleted ? 1 : 0);

  // Deterministic daily featured word
  const todayWord = React.useMemo(() => {
    if (!vocabList || vocabList.length === 0) return null;
    const todayStr = getTodayDateString();
    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) {
      hash = (hash << 5) - hash + todayStr.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % vocabList.length;
    return vocabList[index];
  }, [vocabList]);

  return (
    <div
      id="quick-action-widgets-container"
      className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 shrink-0 animate-in fade-in duration-200"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
        
        {/* WIDGET 1: Review Vocab (빠른 단어 복습) */}
        <button
          type="button"
          onClick={() => onNavigateTab('vocab')}
          className="group relative text-left p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors shrink-0">
              <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <span>{vocabList.length}단어</span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1">
              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                단어 복습
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              연속 음성 루프 & 3,000 DB
            </p>
          </div>
        </button>

        {/* WIDGET 2: Start Pronunciation (AI 원어민 발음 챌린지) */}
        <button
          type="button"
          onClick={() => {
            const targetWord = todayWord?.word || vocabList[0]?.word || 'Opportunity';
            onStartPronunciation(targetWord);
          }}
          className="group relative text-left p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
              <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <span>AI 파형</span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1">
              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                발음 섀도잉
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {todayWord ? `오늘: ${todayWord.word}` : '원어민 억양 즉시 비교'}
            </p>
          </div>
        </button>

        {/* WIDGET 3: 1-Min Mini Game (1분 스피드 게임) */}
        <button
          type="button"
          onClick={() => onNavigateTab('game')}
          className="group relative text-left p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-slate-950 transition-colors shrink-0">
              <Gamepad2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <span>14종 모드</span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1">
              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                1분 스피드 게임
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              타자·격추·매칭 도전
            </p>
          </div>
        </button>

        {/* WIDGET 4: Daily 3-Min Quest (오늘의 3분 퀘스트 진척도) */}
        <button
          type="button"
          onClick={onOpenDailyQuest}
          className="group relative text-left p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-emerald-500/10 hover:from-amber-500/20 hover:to-emerald-500/20 border border-orange-500/30 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-orange-500 text-slate-950 font-black shadow-sm shrink-0">
              <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white animate-pulse" />
            </div>
            <span className="text-[10px] font-black text-orange-700 dark:text-orange-300 bg-orange-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <span className="font-mono">{completedCount}/3</span>
              {completedCount === 3 ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              ) : null}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1">
              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                오늘의 3분 퀘스트
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            {/* Mini Progress bar */}
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${(completedCount / 3) * 100}%` }}
              />
            </div>
          </div>
        </button>

      </div>
    </div>
  );
};
