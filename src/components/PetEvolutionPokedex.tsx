import React, { useEffect, useState } from 'react';
import {
  ArrowUpCircle,
  BookOpen,
  CheckCircle2,
  Compass,
  Lock,
  Shield,
  Sparkles,
} from 'lucide-react';
import {
  PetPokedexEntry,
  PetRoomId,
  PetStage,
} from '../services/petCompanionService';
import { PetCompanionVisual } from './PetCompanionVisual';

interface PetEvolutionPokedexProps {
  entries: PetPokedexEntry[];
  petName: string;
  currentExp: number;
  equippedRoom: PetRoomId;
  initialSelectedStage?: PetStage;
  onEvolveNow?: () => void;
  onNavigateToStudy?: () => void;
}

export const PetEvolutionPokedex: React.FC<PetEvolutionPokedexProps> = ({
  entries,
  petName,
  currentExp,
  equippedRoom,
  initialSelectedStage,
  onEvolveNow,
  onNavigateToStudy,
}) => {
  const defaultStage =
    initialSelectedStage ||
    entries.find((e) => e.isReadyToEvolveNow)?.stage ||
    entries.find((e) => !e.isUnlocked)?.stage ||
    entries.find((e) => e.isCurrent)?.stage ||
    1;

  const [selectedStage, setSelectedStage] = useState<PetStage>(defaultStage);

  useEffect(() => {
    if (initialSelectedStage) {
      setSelectedStage(initialSelectedStage);
    }
  }, [initialSelectedStage]);

  const unlockedCount = entries.filter((e) => e.isUnlocked).length;
  const completionPct = Math.round((unlockedCount / Math.max(1, entries.length)) * 100);
  const selectedEntry =
    entries.find((e) => e.stage === selectedStage) || entries[0];

  if (!selectedEntry) return null;

  return (
    <div data-testid="pet-evolution-pokedex" className="space-y-4">
      {/* Pokedex Overview Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Pet Evolution Pokedex · 5단계 진화 도감</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              각 단계를 선택해 해금된 {petName}의 모습과 미해금 진화를 여는 학습 마일스톤 힌트를 확인하세요.
            </p>
          </div>
          <div className="text-right font-mono-tabular tabular-nums">
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {unlockedCount} / {entries.length} 해금 ({completionPct}%)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              누적 {currentExp.toLocaleString()} EXP
            </div>
          </div>
        </div>

        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            role="progressbar"
            aria-label="진화 도감 해금률"
            aria-valuenow={completionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"
            style={{ width: `${completionPct}%` }}
          />
        </div>

        {/* 5-Stage Selector Strip */}
        <div className="grid grid-cols-5 gap-2 pt-1">
          {entries.map((entry) => {
            const isSelected = entry.stage === selectedEntry.stage;
            return (
              <button
                key={entry.stage}
                type="button"
                onClick={() => setSelectedStage(entry.stage)}
                aria-pressed={isSelected}
                aria-label={`${entry.entryNumber} ${entry.title} ${
                  entry.isUnlocked ? '해금됨' : '잠김'
                }`}
                className={`rounded-xl border p-2 flex flex-col items-center gap-1.5 text-center transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/35'
                    : entry.isUnlocked
                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="relative w-full">
                  <div className={entry.isUnlocked ? '' : 'grayscale opacity-55'}>
                    <PetCompanionVisual
                      stage={entry.stage}
                      roomId={equippedRoom}
                      costume={null}
                      petName={entry.title}
                      mode="thumbnail"
                    />
                  </div>
                  {!entry.isUnlocked && (
                    <div className="absolute inset-0 bg-slate-950/40 rounded-2xl flex items-center justify-center">
                      <Lock className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="w-full min-w-0">
                  <div className="text-[10px] font-mono-tabular font-semibold text-indigo-600 dark:text-indigo-400">
                    {entry.entryNumber}
                  </div>
                  <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                    {entry.title}
                  </div>
                  <div
                    className={`text-[10px] font-mono-tabular truncate ${
                      entry.isCurrent
                        ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                        : entry.isUnlocked
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : entry.isReadyToEvolveNow
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {entry.isCurrent
                      ? '현재 단계'
                      : entry.isUnlocked
                      ? '해금됨'
                      : entry.isReadyToEvolveNow
                      ? '진화 가능!'
                      : `${entry.minExp} EXP`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Detailed Inspector */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Artwork Preview */}
          <div className="relative w-28 sm:w-32 shrink-0 mx-auto sm:mx-0">
            <div className={selectedEntry.isUnlocked ? '' : 'grayscale opacity-65'}>
              <PetCompanionVisual
                stage={selectedEntry.stage}
                roomId={equippedRoom}
                costume={null}
                petName={selectedEntry.title}
                mode="thumbnail"
              />
            </div>
            {!selectedEntry.isUnlocked && (
              <div className="absolute inset-0 bg-slate-950/45 rounded-2xl flex flex-col items-center justify-center gap-1 text-white">
                <Lock className="w-5 h-5" />
                <span className="text-[10px] font-mono-tabular font-bold">
                  {selectedEntry.minExp} EXP
                </span>
              </div>
            )}
          </div>

          {/* Entry Profile & Lore */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {selectedEntry.entryNumber}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-slate-500 dark:text-slate-400">
                {selectedEntry.enTitle}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  selectedEntry.isUnlocked
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : selectedEntry.isReadyToEvolveNow
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {selectedEntry.isUnlocked ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedEntry.isCurrent ? '해금 완료 (현재 파트너)' : '해금 완료'}</span>
                  </>
                ) : selectedEntry.isReadyToEvolveNow ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>진화 조건 달성 · 승급 가능</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>미해금 · {selectedEntry.expRemaining.toLocaleString()} EXP 필요</span>
                  </>
                )}
              </span>
            </div>

            <h4 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
              {selectedEntry.title}
            </h4>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedEntry.pokedexLore}
            </p>

            {/* Passive Stats Strip (Zero-pill) */}
            <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono-tabular tabular-nums text-slate-700 dark:text-slate-200">
              <span>{selectedEntry.signatureTrait}</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                코인 +{selectedEntry.coinBonusPct}%
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                EXP +{selectedEntry.expBonusPct}%
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                보호막 {selectedEntry.maxShields}칸
              </span>
            </div>
          </div>
        </div>

        {/* EXP Requirement Progress */}
        {!selectedEntry.isUnlocked && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-tabular tabular-nums">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                해금 진행도 ({selectedEntry.milestoneSummary})
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {Math.min(currentExp, selectedEntry.minExp).toLocaleString()} /{' '}
                {selectedEntry.minExp.toLocaleString()} EXP ({selectedEntry.expProgressPct}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  selectedEntry.isReadyToEvolveNow ? 'bg-amber-500' : 'bg-indigo-600 dark:bg-indigo-400'
                }`}
                style={{ width: `${selectedEntry.expProgressPct}%` }}
              />
            </div>
            {!selectedEntry.isReadyToEvolveNow && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                남은 {selectedEntry.expRemaining.toLocaleString()} EXP — 단어 약{' '}
                <span className="font-mono-tabular font-bold text-slate-800 dark:text-slate-200">
                  {selectedEntry.estimatedWordsToUnlock}개
                </span>{' '}
                완벽 암기 또는 아래 학습 마일스톤 조합으로 도달할 수 있어요.
              </p>
            )}
          </div>
        )}

        {/* Specific Learning Milestone Hints */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h5 className="font-display text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                {selectedEntry.isUnlocked
                  ? '달성한 진화 학습 마일스톤'
                  : '미해금 진화 해금 마일스톤 힌트'}
              </span>
            </h5>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {selectedEntry.unlockHints.map((hint) => (
              <div
                key={hint.id}
                className="py-2.5 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className={`mt-0.5 shrink-0 ${
                      hint.isSatisfied
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {hint.isSatisfied ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {hint.activity}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {hint.targetHint}
                    </div>
                  </div>
                </div>
                <span className="font-mono-tabular tabular-nums text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                  {hint.expYield}
                </span>
              </div>
            ))}
          </div>

          {/* Action CTA inside Pokedex */}
          {selectedEntry.isReadyToEvolveNow && onEvolveNow && (
            <button
              type="button"
              onClick={onEvolveNow}
              className="w-full min-h-[48px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>
                지금 Stage {selectedEntry.stage} · {selectedEntry.title}(으)로 진화하기!
              </span>
            </button>
          )}

          {!selectedEntry.isUnlocked && !selectedEntry.isReadyToEvolveNow && onNavigateToStudy && (
            <button
              type="button"
              onClick={onNavigateToStudy}
              className="w-full min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>오늘 학습으로 이동해 EXP 모으기</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
