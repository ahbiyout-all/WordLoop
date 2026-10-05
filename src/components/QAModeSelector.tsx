import React from 'react';
import { Languages, BookOpen, Sparkles, HelpCircle } from 'lucide-react';
import { QAMode } from '../types';
import { QA_MODES_CONFIG } from '../utils/meaningUtils';

interface QAModeSelectorProps {
  currentMode: QAMode;
  onChangeMode: (mode: QAMode) => void;
  compact?: boolean;
  className?: string;
  showHelp?: boolean;
}

export const QAModeSelector: React.FC<QAModeSelectorProps> = ({
  currentMode,
  onChangeMode,
  compact = false,
  className = '',
  showHelp = true,
}) => {
  const modes: QAMode[] = ['ko_to_en', 'en_def_to_en', 'en_to_ko'];

  const getIcon = (mode: QAMode) => {
    switch (mode) {
      case 'ko_to_en':
        return <Languages className="w-4 h-4" />;
      case 'en_def_to_en':
        return <BookOpen className="w-4 h-4" />;
      case 'en_to_ko':
        return <Sparkles className="w-4 h-4" />;
    }
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}>
        {modes.map((modeKey) => {
          const config = QA_MODES_CONFIG[modeKey];
          const isSelected = currentMode === modeKey;
          return (
            <button
              key={modeKey}
              onClick={() => onChangeMode(modeKey)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isSelected
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-600'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={config.description}
            >
              {getIcon(modeKey)}
              <span>{config.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5 text-indigo-500" />
          <span>질문-답변 유형 (Q&A 구조)</span>
        </label>
        {showHelp && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {QA_MODES_CONFIG[currentMode].description}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {modes.map((modeKey) => {
          const config = QA_MODES_CONFIG[modeKey];
          const isSelected = currentMode === modeKey;
          return (
            <button
              key={modeKey}
              type="button"
              onClick={() => onChangeMode(modeKey)}
              className={`flex flex-col items-start text-left p-2.5 rounded-xl border-2 transition-all ${
                isSelected
                  ? `${config.activeBg} ${config.activeBorder} shadow-sm ring-1 ring-offset-1 ring-indigo-500/30`
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="inline-flex items-center gap-1.5 font-bold text-xs">
                  {getIcon(modeKey)}
                  {config.label}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {config.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {config.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
