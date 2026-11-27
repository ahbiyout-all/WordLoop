import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  PetCostumeId,
  PetRoomId,
  PetSentimentIndicator,
  PetStage,
} from '../services/petCompanionService';

import stage1EggImg from '../assets/images/pet_stage1_egg_1795772976376.jpg';
import stage2BabyImg from '../assets/images/pet_stage2_baby_1795772976792.jpg';
import stage3ExplorerImg from '../assets/images/pet_stage3_explorer_1795772977233.jpg';
import stage4GuardianImg from '../assets/images/pet_stage4_guardian_1795772978162.jpg';
import stage5LegendImg from '../assets/images/pet_stage5_legend_1795772978509.jpg';

import roomSunlitDeskImg from '../assets/images/pet_room_sunlit_desk_1795772979078.jpg';
import roomStarlightLoftImg from '../assets/images/pet_room_starlight_loft_1795772979421.jpg';
import roomBotanicalGreenhouseImg from '../assets/images/pet_room_botanical_greenhouse_1795772979345.jpg';
import roomGrandLibraryImg from '../assets/images/pet_room_grand_library_1795772979279.jpg';

export const PET_STAGE_IMAGES: Record<PetStage, string> = {
  1: stage1EggImg,
  2: stage2BabyImg,
  3: stage3ExplorerImg,
  4: stage4GuardianImg,
  5: stage5LegendImg,
};

export const PET_ROOM_IMAGES: Record<PetRoomId, string> = {
  sunlit_desk: roomSunlitDeskImg,
  starlight_loft: roomStarlightLoftImg,
  botanical_greenhouse: roomBotanicalGreenhouseImg,
  grand_library: roomGrandLibraryImg,
};

const ROOM_FALLBACK_BG: Record<PetRoomId, string> = {
  sunlit_desk: 'from-amber-100 via-orange-50 to-sky-100 dark:from-amber-950/60 dark:via-slate-900 dark:to-slate-950',
  botanical_greenhouse: 'from-emerald-100 via-teal-50 to-lime-100 dark:from-emerald-950/60 dark:via-slate-900 dark:to-slate-950',
  starlight_loft: 'from-indigo-950 via-slate-900 to-violet-950',
  grand_library: 'from-amber-950 via-stone-900 to-slate-950',
};

const SENTIMENT_BUBBLE_STYLES: Record<PetSentimentIndicator['tone'], string> = {
  amber:
    'bg-white/95 dark:bg-slate-900/95 border-amber-300/90 dark:border-amber-600/80 text-amber-900 dark:text-amber-100',
  rose:
    'bg-white/95 dark:bg-slate-900/95 border-rose-300/90 dark:border-rose-600/80 text-rose-900 dark:text-rose-100',
  emerald:
    'bg-white/95 dark:bg-slate-900/95 border-emerald-300/90 dark:border-emerald-600/80 text-emerald-900 dark:text-emerald-100',
  indigo:
    'bg-white/95 dark:bg-slate-900/95 border-indigo-300/90 dark:border-indigo-600/80 text-indigo-900 dark:text-indigo-100',
  slate:
    'bg-white/95 dark:bg-slate-900/95 border-slate-200/95 dark:border-slate-700/90 text-slate-800 dark:text-slate-100',
};

interface CostumeOverlayProps {
  costume: PetCostumeId | null;
  stage: PetStage;
}

export const CostumeOverlaySvg: React.FC<CostumeOverlayProps> = ({ costume, stage }) => {
  if (!costume) return null;

  // Stage 1 Egg uses lower vertical positioning than upright hatched characters
  const hatTop = stage === 1 ? 'top-[8%]' : '-top-[10%]';
  const glassesTop = stage === 1 ? 'top-[40%]' : 'top-[32%]';
  const scarfBottom = stage === 1 ? 'bottom-[12%]' : 'bottom-[8%]';

  if (costume === 'scholar_glasses') {
    return (
      <svg
        viewBox="0 0 120 42"
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${glassesTop} w-[56%] drop-shadow-sm`}
      >
        <circle cx="34" cy="21" r="15" fill="rgba(255,255,255,0.12)" stroke="#d97706" strokeWidth="3.2" />
        <circle cx="86" cy="21" r="15" fill="rgba(255,255,255,0.12)" stroke="#d97706" strokeWidth="3.2" />
        <path d="M49 21 Q60 15 71 21" fill="none" stroke="#d97706" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M8 18 L19 20 M101 20 L112 18" stroke="#d97706" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (costume === 'cozy_scarf') {
    return (
      <svg
        viewBox="0 0 140 54"
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${scarfBottom} w-[68%] drop-shadow-md`}
      >
        <rect x="18" y="8" width="104" height="22" rx="11" fill="#e11d48" stroke="#9f1239" strokeWidth="2" />
        <path d="M35 8 V30 M62 8 V30 M89 8 V30" stroke="#fecdd3" strokeWidth="3.5" opacity="0.85" />
        <path d="M84 22 L106 48 L88 51 L70 28 Z" fill="#be123c" stroke="#9f1239" strokeWidth="2" />
      </svg>
    );
  }

  if (costume === 'explorer_hat') {
    return (
      <svg
        viewBox="0 0 140 66"
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${hatTop} w-[64%] drop-shadow-md`}
      >
        <ellipse cx="70" cy="48" rx="60" ry="12" fill="#92400e" stroke="#78350f" strokeWidth="2" />
        <path d="M32 45 L42 15 Q70 7 98 15 L108 45 Z" fill="#b45309" stroke="#78350f" strokeWidth="2" />
        <path d="M35 37 Q70 43 105 37 L107 43 Q70 49 33 43 Z" fill="#fbbf24" />
      </svg>
    );
  }

  if (costume === 'starlight_cape') {
    return (
      <svg
        viewBox="0 0 160 70"
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[2%] w-[86%] mx-auto drop-shadow-md"
      >
        <path
          d="M28 16 Q80 28 132 16 L148 64 Q80 54 12 64 Z"
          fill="rgba(79,70,229,0.82)"
          stroke="#c7d2fe"
          strokeWidth="2"
        />
        <circle cx="46" cy="42" r="3" fill="#fde68a" />
        <circle cx="114" cy="40" r="3.2" fill="#fde68a" />
        <circle cx="80" cy="48" r="2.5" fill="#e0e7ff" />
        <circle cx="80" cy="20" r="5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
      </svg>
    );
  }

  if (costume === 'golden_laurel') {
    return (
      <svg
        viewBox="0 0 140 58"
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${hatTop} w-[66%] drop-shadow-md`}
      >
        <path
          d="M26 44 Q18 22 44 10 M114 44 Q122 22 96 10"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <ellipse cx="26" cy="34" rx="6" ry="3.5" transform="rotate(-35 26 34)" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" />
        <ellipse cx="32" cy="22" rx="6" ry="3.5" transform="rotate(-20 32 22)" fill="#fcd34d" stroke="#b45309" strokeWidth="1.2" />
        <ellipse cx="44" cy="12" rx="6" ry="3.5" transform="rotate(-5 44 12)" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" />
        <ellipse cx="114" cy="34" rx="6" ry="3.5" transform="rotate(35 114 34)" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" />
        <ellipse cx="108" cy="22" rx="6" ry="3.5" transform="rotate(20 108 22)" fill="#fcd34d" stroke="#b45309" strokeWidth="1.2" />
        <ellipse cx="96" cy="12" rx="6" ry="3.5" transform="rotate(5 96 12)" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" />
        <polygon points="70,4 74,13 84,13 76,19 79,28 70,22 61,28 64,19 56,13 66,13" fill="#fde047" stroke="#b45309" strokeWidth="1.4" />
      </svg>
    );
  }

  return null;
};

interface PetCompanionVisualProps {
  stage: PetStage;
  roomId: PetRoomId;
  costume: PetCostumeId | null;
  petName: string;
  mode?: 'compact' | 'sanctuary' | 'thumbnail';
  isReadyToEvolve?: boolean;
  reactionBurst?: boolean;
  sentiment?: PetSentimentIndicator | null;
  isSentimentReacting?: boolean;
  sentimentBurstKey?: number;
  onTapPet?: () => void;
  onTapSentiment?: () => void;
  className?: string;
}

export const PetCompanionVisual: React.FC<PetCompanionVisualProps> = ({
  stage,
  roomId,
  costume,
  petName,
  mode = 'compact',
  isReadyToEvolve = false,
  reactionBurst = false,
  sentiment = null,
  isSentimentReacting = false,
  sentimentBurstKey = 0,
  onTapPet,
  onTapSentiment,
  className = '',
}) => {
  const [roomError, setRoomError] = useState(false);
  const [petError, setPetError] = useState(false);

  if (mode === 'thumbnail') {
    return (
      <div
        className={`relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 ${className}`}
      >
        {!petError ? (
          <img
            src={PET_STAGE_IMAGES[stage]}
            alt={`${petName} 단계 ${stage}`}
            referrerPolicy="no-referrer"
            onError={() => setPetError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-amber-500/20 text-xs font-bold text-slate-600 dark:text-slate-300">
            Stage {stage}
          </div>
        )}
      </div>
    );
  }

  if (mode === 'compact') {
    return (
      <button
        type="button"
        onClick={onTapPet}
        aria-label={`${petName} 쓰다듬기`}
        className={`group relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border shrink-0 cursor-pointer transition-transform duration-200 motion-reduce:transition-none ${
          isReadyToEvolve
            ? 'border-amber-400 ring-2 ring-amber-400/40'
            : 'border-slate-200 dark:border-slate-700'
        } ${reactionBurst ? 'scale-105' : 'hover:scale-[1.02] active:scale-95'} ${className}`}
      >
        {!roomError ? (
          <img
            src={PET_ROOM_IMAGES[roomId]}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            onError={() => setRoomError(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${ROOM_FALLBACK_BG[roomId]}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-white/10" />
        <div className="relative z-10 w-full h-full p-2 flex items-center justify-center">
          <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/70 dark:border-slate-800/80 shadow-md bg-white/80 dark:bg-slate-900/80">
            {!petError ? (
              <img
                src={PET_STAGE_IMAGES[stage]}
                alt={`${petName} 학습 펫`}
                referrerPolicy="no-referrer"
                onError={() => setPetError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-indigo-600">
                {petName}
              </div>
            )}
            <CostumeOverlaySvg costume={costume} stage={stage} />
          </div>
        </div>
      </button>
    );
  }

  // Sanctuary mode: expansive room backdrop + centered interactive companion portrait
  return (
    <div
      className={`relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 ${className}`}
    >
      {!roomError ? (
        <img
          src={PET_ROOM_IMAGES[roomId]}
          alt="펫 키우기 방 배경"
          referrerPolicy="no-referrer"
          onError={() => setRoomError(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${ROOM_FALLBACK_BG[roomId]}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/15 to-slate-950/20" />

      <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={onTapPet}
            aria-label={`${petName} 쓰다듬고 응원 듣기`}
            className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full cursor-pointer transition-transform duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400 ${
              isSentimentReacting && (sentiment?.sentiment === 'bored' || sentiment?.sentiment === 'hungry')
                ? 'scale-100 ring-4 ring-rose-500/70'
                : isSentimentReacting && sentiment?.sentiment === 'ecstatic'
                ? 'scale-105 ring-4 ring-amber-400/80'
                : isSentimentReacting && sentiment?.sentiment === 'focused'
                ? 'scale-105 ring-4 ring-indigo-500/80'
                : isSentimentReacting && (sentiment?.sentiment === 'happy' || sentiment?.sentiment === 'proud')
                ? '-translate-y-2 scale-105'
                : sentiment?.sentiment === 'focused'
                ? 'ring-4 ring-indigo-500/60 shadow-indigo-500/25'
                : reactionBurst
                ? 'scale-105'
                : 'hover:scale-[1.03] active:scale-95'
            }`}
          >
            {isReadyToEvolve && (
              <span
                aria-hidden="true"
                className="absolute -inset-2 rounded-full border-2 border-amber-300/80 animate-pulse motion-reduce:animate-none"
              />
            )}
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white/90 dark:border-slate-900/90 shadow-2xl bg-white dark:bg-slate-900">
              {!petError ? (
                <img
                  src={PET_STAGE_IMAGES[stage]}
                  alt={`${petName} (Stage ${stage})`}
                  referrerPolicy="no-referrer"
                  onError={() => setPetError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-950 text-sm font-bold text-indigo-700 dark:text-indigo-200">
                  {petName}
                </div>
              )}
            </div>
            <CostumeOverlaySvg costume={costume} stage={stage} />
          </button>

          {sentiment && (() => {
            const isAlertSentiment = sentiment.sentiment === 'bored' || sentiment.sentiment === 'hungry';
            const isSparkleSentiment = sentiment.sentiment === 'ecstatic';
            const isFocusedSentiment = sentiment.sentiment === 'focused';
            const isJumpSentiment = sentiment.sentiment === 'happy' || sentiment.sentiment === 'proud';

            const reactionAnimClass = isSentimentReacting
              ? isAlertSentiment
                ? 'animate-pet-react-red-alert'
                : isSparkleSentiment
                ? 'animate-pet-react-sparkle'
                : isJumpSentiment
                ? 'animate-pet-react-jump'
                : 'animate-pet-react-hop'
              : '';

            const bubbleColorClass =
              isSentimentReacting && isAlertSentiment
                ? 'bg-rose-600 dark:bg-rose-600 border-rose-400 text-white ring-4 ring-rose-500/40'
                : isSentimentReacting && isSparkleSentiment
                ? 'bg-amber-50 dark:bg-amber-950/95 border-amber-400 text-amber-900 dark:text-amber-100 ring-4 ring-amber-400/45'
                : isSentimentReacting && isFocusedSentiment
                ? 'bg-indigo-600 dark:bg-indigo-600 border-indigo-400 text-white ring-4 ring-indigo-400/45'
                : isSentimentReacting && isJumpSentiment
                ? 'bg-emerald-50 dark:bg-emerald-950/95 border-emerald-400 text-emerald-900 dark:text-emerald-100 ring-4 ring-emerald-400/40'
                : SENTIMENT_BUBBLE_STYLES[sentiment.tone];

            const activeEmoji =
              isSentimentReacting && sentiment.sentiment === 'bored'
                ? '💢'
                : isSentimentReacting && sentiment.sentiment === 'hungry'
                ? '🍽️'
                : sentiment.emoji;

            const burstGlyph = isAlertSentiment
              ? '❗'
              : isFocusedSentiment
              ? '🎯'
              : sentiment.sentiment === 'proud'
              ? '🔥'
              : sentiment.sentiment === 'happy'
              ? '🎉'
              : sentiment.sentiment === 'curious'
              ? '💡'
              : '✨';

            return (
              <div
                data-testid="pet-sentiment-indicator"
                data-sentiment={sentiment.sentiment}
                data-reacting={isSentimentReacting ? 'true' : 'false'}
                className="absolute left-[72%] sm:left-[78%] -top-2 sm:-top-1 z-20 flex flex-col items-start"
              >
                {isSentimentReacting && (
                  <span
                    key={`burst-${sentimentBurstKey}`}
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-4 right-1 flex items-center gap-1 text-sm font-bold animate-pet-burst-float"
                  >
                    {isSparkleSentiment ? (
                      <Sparkles className="w-4 h-4 text-amber-400 drop-shadow" />
                    ) : (
                      <span>{burstGlyph}</span>
                    )}
                  </span>
                )}
                <button
                  key={`bubble-${sentimentBurstKey}`}
                  type="button"
                  onClick={onTapSentiment}
                  title={sentiment.detail}
                  aria-label={`${petName} 학습 감정 상태: ${sentiment.shortLabel} (${sentiment.detail})`}
                  className={`flex items-center gap-1.5 rounded-2xl border px-2.5 py-1.5 shadow-lg backdrop-blur-xs transition-colors duration-200 motion-reduce:transition-none hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer max-w-[126px] sm:max-w-[184px] whitespace-nowrap ${bubbleColorClass} ${reactionAnimClass}`}
                >
                  <span className="text-base sm:text-lg leading-none shrink-0" aria-hidden="true">
                    {activeEmoji}
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold truncate">
                    {sentiment.shortLabel}
                  </span>
                </button>
                <span
                  aria-hidden="true"
                  className={`ml-2 mt-1 w-2.5 h-2.5 rounded-full border shadow-xs transition-colors ${
                    isSentimentReacting && isAlertSentiment
                      ? 'bg-rose-500 border-rose-300'
                      : 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700'
                  }`}
                />
                <span
                  aria-hidden="true"
                  className={`ml-0.5 mt-0.5 w-1.5 h-1.5 rounded-full border shadow-xs transition-colors ${
                    isSentimentReacting && isAlertSentiment
                      ? 'bg-rose-500 border-rose-300'
                      : 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700'
                  }`}
                />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
