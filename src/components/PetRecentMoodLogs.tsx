import React, { useMemo, useState } from 'react';
import { History, ArrowUpRight, AlertTriangle, Clock } from 'lucide-react';
import { PetMoodLogEntry } from '../services/petCompanionService';
import { getLocalDateString } from '../utils/dateUtils';

interface PetRecentMoodLogsProps {
  logs: PetMoodLogEntry[];
  petName: string;
}

type LogFilter = 'all' | 'positive' | 'negative';

function formatLogTimestamp(iso: string, dateStr: string, todayStr: string): string {
  const dt = new Date(iso);
  if (dateStr === todayStr && Number.isFinite(dt.getTime())) {
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `오늘 ${hh}:${mm}`;
  }
  const [, m, d] = dateStr.split('-').map(Number);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayLabel = Number.isFinite(dt.getTime()) ? dayNames[dt.getDay()] : '';
  return `${m}/${d}${dayLabel ? ` (${dayLabel})` : ''}`;
}

export const PetRecentMoodLogs: React.FC<PetRecentMoodLogsProps> = ({ logs, petName }) => {
  const [filter, setFilter] = useState<LogFilter>('all');
  const todayStr = getLocalDateString();

  const positiveCount = useMemo(
    () => logs.filter((l) => l.category === 'positive').length,
    [logs]
  );
  const negativeCount = useMemo(
    () => logs.filter((l) => l.category === 'negative').length,
    [logs]
  );

  const visibleLogs = useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter((l) => l.category === filter);
  }, [logs, filter]);

  return (
    <section
      data-testid="pet-recent-mood-logs"
      aria-label={`${petName} 최근 7일 감정 로그`}
      className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Recent Mood Logs · 최근 7일 감정 트리거</span>
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-mono-tabular tabular-nums text-slate-500 dark:text-slate-400">
            <span>총 {logs.length}건</span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              긍정 {positiveCount}
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              주의 {negativeCount}
            </span>
          </div>
        </div>

        {/* Interactive Filter Segmented Control */}
        <div
          role="group"
          aria-label="감정 로그 필터"
          className="flex items-center gap-1 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0 self-start sm:self-auto"
        >
          {(
            [
              { id: 'all', label: '전체' },
              { id: 'positive', label: '상승' },
              { id: 'negative', label: '주의' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                filter === item.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable History Feed */}
      {visibleLogs.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          선택한 조건에 해당하는 최근 7일 감정 로그가 없습니다.
        </div>
      ) : (
        <ul
          aria-label="감정 트리거 이력 목록"
          className="max-h-60 overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800"
        >
          {visibleLogs.map((log) => {
            const isPositive = log.category === 'positive';
            const isNegative = log.category === 'negative';
            const StatusIcon = isPositive
              ? ArrowUpRight
              : isNegative
              ? AlertTriangle
              : Clock;
            const statusText = isPositive ? '긍정' : isNegative ? '주의' : '대기';
            const statusClass = isPositive
              ? 'text-emerald-600 dark:text-emerald-400'
              : isNegative
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-500 dark:text-slate-400';

            return (
              <li
                key={log.id}
                className="py-2.5 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className="text-base leading-none mt-0.5 shrink-0 select-none"
                    aria-hidden="true"
                  >
                    {log.emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {log.triggerTitle}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${statusClass}`}
                      >
                        <StatusIcon className="w-3 h-3 shrink-0" />
                        <span>{statusText}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {log.detail}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-mono-tabular tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 pt-0.5">
                  {formatLogTimestamp(log.at, log.dateStr, todayStr)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
