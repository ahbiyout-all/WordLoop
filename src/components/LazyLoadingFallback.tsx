import React from 'react';

interface LazyLoadingFallbackProps {
  label?: string;
  compact?: boolean;
}

export const LazyLoadingFallback: React.FC<LazyLoadingFallbackProps> = ({
  label = '학습 모듈을 불러오는 중입니다...',
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse space-y-3">
        <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-28 w-full bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-36 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
        </div>
      </div>
      <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
    </div>
  );
};
