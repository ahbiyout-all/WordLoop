import React from 'react';
import { Sparkles, ArrowRight, ArrowUpCircle, Coins, Shield, X, Check } from 'lucide-react';
import {
  PetCostumeId,
  PetEvolutionStageInfo,
  PetStage,
  getStageInfo,
} from '../services/petCompanionService';
import { CostumeOverlaySvg, PET_STAGE_IMAGES } from './PetCompanionVisual';

export type EvolutionOverlayPhase = 'ready' | 'evolving' | 'complete';

interface PetEvolutionOverlayProps {
  isOpen: boolean;
  phase: EvolutionOverlayPhase;
  petName: string;
  fromStage: PetStage;
  toStage: PetStage;
  costume: PetCostumeId | null;
  bonusCoins: number;
  onConfirmEvolve: () => void;
  onDismiss: () => void;
}

export const PetEvolutionOverlay: React.FC<PetEvolutionOverlayProps> = ({
  isOpen,
  phase,
  petName,
  fromStage,
  toStage,
  costume,
  bonusCoins,
  onConfirmEvolve,
  onDismiss,
}) => {
  if (!isOpen) return null;

  const fromInfo: PetEvolutionStageInfo = getStageInfo(fromStage);
  const toInfo: PetEvolutionStageInfo = getStageInfo(toStage);
  const displayStage: PetStage = phase === 'complete' ? toStage : fromStage;

  return (
    <div
      data-testid="pet-evolution-overlay"
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label={`${petName} 진화 축하 오버레이`}
      className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md"
    >
      {/* Rotating Golden Starburst Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center"
      >
        <div
          className={`w-[540px] h-[540px] rounded-full opacity-35 animate-golden-ray motion-reduce:animate-none ${
            phase === 'evolving' ? 'opacity-65 scale-110' : ''
          }`}
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg 18deg, rgba(251,191,36,0.45) 22deg 36deg, transparent 40deg 64deg, rgba(99,102,241,0.35) 68deg 82deg, transparent 86deg 120deg, rgba(251,191,36,0.45) 124deg 140deg, transparent 144deg 180deg, rgba(251,191,36,0.45) 184deg 202deg, transparent 206deg 240deg, rgba(99,102,241,0.35) 244deg 262deg, transparent 266deg 300deg, rgba(251,191,36,0.45) 304deg 322deg, transparent 326deg 360deg)',
          }}
        />
      </div>

      {/* Main Celebration Card */}
      <div className="relative w-full max-w-md rounded-3xl border border-amber-300/60 dark:border-amber-500/40 bg-white dark:bg-slate-900 shadow-2xl p-6 text-center space-y-5 animate-levelup-pop motion-reduce:animate-none">
        {phase !== 'evolving' && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="진화 축하 닫기"
            className="absolute top-3.5 right-3.5 min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Headline */}
        <div className="space-y-1">
          <div className="text-xs font-mono-tabular font-bold text-amber-600 dark:text-amber-400">
            {phase === 'ready'
              ? `STAGE ${toStage} EVOLUTION READY`
              : phase === 'evolving'
              ? 'EVOLVING...'
              : `STAGE ${toStage} UNLOCKED!`}
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {phase === 'ready'
              ? `${petName}이(가) 진화할 준비가 되었어요!`
              : phase === 'evolving'
              ? `${petName}의 빛나는 변신 중...`
              : `축하합니다! ${toInfo.title} 탄생!`}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {phase === 'ready'
              ? '마지막 학습 과제를 완수해 진화 에너지가 가득 찼습니다.'
              : phase === 'evolving'
              ? '학습으로 쌓은 지혜의 빛이 새로운 모습으로 깨어나고 있어요.'
              : toInfo.description}
          </p>
        </div>

        {/* Center Animated Portrait Stage */}
        <div className="relative py-2 flex items-center justify-center">
          <Sparkles
            aria-hidden="true"
            className="w-6 h-6 text-amber-400 absolute top-1 left-12 animate-sparkle-twinkle motion-reduce:animate-none"
          />
          <Sparkles
            aria-hidden="true"
            className="w-5 h-5 text-indigo-400 absolute bottom-2 right-12 animate-sparkle-twinkle motion-reduce:animate-none"
          />

          <div
            className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full transition-transform duration-500 motion-reduce:transition-none ${
              phase === 'evolving'
                ? 'scale-110 ring-8 ring-amber-400/75 animate-pet-react-sparkle'
                : phase === 'complete'
                ? 'scale-105 ring-4 ring-emerald-400/70'
                : 'ring-4 ring-amber-400/60'
            }`}
          >
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl bg-indigo-50 dark:bg-slate-800">
              <img
                src={PET_STAGE_IMAGES[displayStage]}
                alt={`${petName} Stage ${displayStage}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <CostumeOverlaySvg costume={costume} stage={displayStage} />
          </div>
        </div>

        {/* Stage Transition / Buff Summary */}
        {phase === 'ready' ? (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 rounded-2xl py-2.5 px-4">
            <span>Stage {fromStage} · {fromInfo.title}</span>
            <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              Stage {toStage} · {toInfo.title}
            </span>
          </div>
        ) : phase === 'complete' ? (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-center gap-3 font-mono-tabular font-bold text-amber-600 dark:text-amber-400">
              <span className="inline-flex items-center gap-1">
                <Coins className="w-4 h-4" />+{bonusCoins} 코인
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>간식 +2 · 영양식 +1</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 font-mono-tabular">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                코인 +{toInfo.coinBonusPct}% · EXP +{toInfo.expBonusPct}% · 보호막 최대 {toInfo.maxShields}칸 해금
              </span>
            </div>
          </div>
        ) : null}

        {/* Action Footer */}
        {phase === 'ready' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onConfirmEvolve}
              className="flex-1 min-h-[48px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
            >
              <ArrowUpCircle className="w-5 h-5" />
              <span>지금 진화시키기 (+{toStage * 40} 코인)</span>
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
            >
              나중에
            </button>
          </div>
        )}

        {phase === 'complete' && (
          <button
            type="button"
            onClick={onDismiss}
            className="w-full min-h-[48px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>멋져요! 계속 학습하기</span>
          </button>
        )}
      </div>
    </div>
  );
};
