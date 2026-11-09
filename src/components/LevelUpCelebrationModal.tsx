import React, { useEffect, useState } from 'react';
import {
  Trophy,
  Sparkles,
  Zap,
  Star,
  X,
  Share2,
  Award,
  Crown,
  Flame,
  CheckCircle2,
  GraduationCap,
  Volume2,
  VolumeX,
  Bell,
  Music,
} from 'lucide-react';
import { StudentLevelInfo, triggerHapticFeedback } from '../services/studentGamificationService';
import { confettiService } from '../services/confettiService';
import {
  soundEffectService,
  SOUND_PRESETS,
  LevelUpSoundPreset,
} from '../services/soundEffectService';

/**
 * Web Audio API synthesizer chime for authentic game level-up feel (100% offline, zero-asset)
 */
export function playLevelUpChime(preset?: LevelUpSoundPreset) {
  soundEffectService.play(preset);
}

export interface LevelUpCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelInfo: StudentLevelInfo;
  previousLevel?: number;
  onShareProgress?: () => void;
  onOpenTitlesModal?: () => void;
}

export const LevelUpCelebrationModal: React.FC<LevelUpCelebrationModalProps> = ({
  isOpen,
  onClose,
  levelInfo,
  previousLevel,
  onShareProgress,
  onOpenTitlesModal,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEffectService.isMuted());
  const [selectedPreset, setSelectedPreset] = useState<LevelUpSoundPreset>(() => soundEffectService.getSelectedPreset());
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  const soundTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSafeClose = () => {
    soundEffectService.stopAll();
    if (soundTimerRef.current) clearTimeout(soundTimerRef.current);
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    onClose();
  };

  const handlePlaySound = (preset?: LevelUpSoundPreset) => {
    if (soundTimerRef.current) {
      clearTimeout(soundTimerRef.current);
    }
    const targetPreset = preset || selectedPreset;
    soundEffectService.play(targetPreset);
    setIsPlayingSound(true);
    soundTimerRef.current = setTimeout(() => {
      setIsPlayingSound(false);
    }, 1400);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEffectService.setMuted(nextMuted);
    triggerHapticFeedback('light');
    if (!nextMuted) {
      handlePlaySound();
    }
  };

  const handleSelectPreset = (preset: LevelUpSoundPreset) => {
    setSelectedPreset(preset);
    soundEffectService.setSelectedPreset(preset);
    triggerHapticFeedback('light');
    if (!isMuted) {
      handlePlaySound(preset);
    }
  };

  // Keyboard accessibility: ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSafeClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Fire confetti cannons and play chime
      confettiService.fireSideCannons();
      confettiTimerRef.current = setTimeout(() => {
        confettiService.fireGoldenStars();
      }, 250);
      handlePlaySound();
      triggerHapticFeedback('success');
    }

    return () => {
      if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
      if (soundTimerRef.current) clearTimeout(soundTimerRef.current);
      soundEffectService.stopAll();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isMaxLevel = levelInfo.level >= 50;
  const fromLevel = previousLevel && previousLevel < levelInfo.level ? previousLevel : Math.max(1, levelInfo.level - 1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleSafeClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white border-2 border-amber-400/60 shadow-2xl shadow-amber-500/20 p-6 sm:p-8 overflow-hidden animate-levelup-pop">
        
        {/* Rotating Sunburst Rays Background */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-amber-500/15 via-rose-500/15 to-indigo-500/15 blur-3xl pointer-events-none animate-golden-ray" />

        {/* Floating Twinkling Stars */}
        <div className="absolute top-6 left-6 text-amber-300 animate-sparkle-twinkle pointer-events-none">
          <Star className="w-5 h-5 fill-current" />
        </div>
        <div className="absolute top-12 right-12 text-amber-300 animate-sparkle-twinkle delay-300 pointer-events-none">
          <Sparkles className="w-6 h-6 fill-current" />
        </div>
        <div className="absolute bottom-10 left-10 text-emerald-400 animate-sparkle-twinkle delay-500 pointer-events-none">
          <Sparkles className="w-4 h-4 fill-current" />
        </div>
        <div className="absolute bottom-16 right-8 text-amber-300 animate-sparkle-twinkle delay-700 pointer-events-none">
          <Star className="w-5 h-5 fill-current" />
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleSafeClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer z-20"
          title="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Central Celebratory Badge */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-4 pt-2">
          
          {/* Glowing Aura Ring & Emoji */}
          <div className="relative">
            {/* Outer Pulsing Glow */}
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-500 opacity-75 blur-md animate-pulse" />
            
            {/* Center Badge Circle */}
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 border-2 border-amber-300 flex items-center justify-center text-5xl shadow-2xl">
              <span>{levelInfo.badgeEmoji}</span>
              {isMaxLevel && (
                <Crown className="w-7 h-7 text-amber-300 fill-current absolute -top-3.5 -right-2 drop-shadow-md" />
              )}
            </div>

            {/* Level Pin */}
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider border-2 border-slate-900 shadow-lg">
              Lv.{levelInfo.level}
            </span>
          </div>

          {/* Headline & Title */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 flex items-center justify-center gap-1.5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              {isMaxLevel ? 'GRAND MASTER ACHIEVEMENT' : 'LEVEL UP CONGRATULATIONS'}
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            </span>

            <h2 id="levelup-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isMaxLevel ? '🏆 최고 레벨(MAX) 도달!' : '🎉 레벨업을 축하합니다!'}
            </h2>

            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              성실한 단어 학습과 음성 섀도잉 실천으로 새로운 학생 칭호에 도달했습니다!
            </p>
          </div>

          {/* Level Transition Pill Card */}
          <div className="w-full p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 backdrop-blur-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
              <span>이전 등급</span>
              <span>새로운 등급</span>
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700">
              <div className="text-left">
                <span className="text-[10px] font-mono text-slate-400 block">Lv.{fromLevel}</span>
                <span className="text-xs font-bold text-slate-300">이전 레벨</span>
              </div>

              <div className="flex items-center gap-1 text-amber-400 font-black text-sm">
                <span>➔</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono font-bold text-amber-400 block">
                  Lv.{levelInfo.level}
                </span>
                <span className="text-xs font-black text-white">{levelInfo.title}</span>
              </div>
            </div>

            {/* Unlocked Perk Banner */}
            <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center gap-2 text-left">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-amber-300 block uppercase">
                  신규 해금된 특권 (Unlocked Perk)
                </span>
                <p className="text-xs font-extrabold text-white truncate">
                  {levelInfo.unlockedPerk}
                </p>
              </div>
            </div>

            {/* EXP Boost Upgrade Pill */}
            <div className="p-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-between gap-2 text-left">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 fill-current text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-emerald-400 block uppercase">
                    영구 경험치 부스트 강화
                  </span>
                  <p className="text-xs font-black text-white">
                    {levelInfo.boostTitle || `+${levelInfo.expBoostPercent}% EXP 부스트`}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                상시 적용
              </span>
            </div>
            {/* Sound Effect Controls Panel */}
            <div className="w-full p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center text-xs">
                    <Music className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[11px] font-black text-slate-300">
                    축하 사운드 효과음
                  </span>
                  {/* Equalizer Wave Bars */}
                  <div className="flex items-end gap-0.5 h-3 px-1" title={isPlayingSound ? '재생 중' : '대기 중'}>
                    <span className={`w-0.5 rounded-full bg-amber-400 transition-all ${isPlayingSound ? 'animate-sound-bar-1 h-3' : 'h-1 opacity-40'}`} />
                    <span className={`w-0.5 rounded-full bg-amber-400 transition-all ${isPlayingSound ? 'animate-sound-bar-2 h-3' : 'h-1.5 opacity-40'}`} />
                    <span className={`w-0.5 rounded-full bg-amber-400 transition-all ${isPlayingSound ? 'animate-sound-bar-3 h-3' : 'h-2 opacity-40'}`} />
                    <span className={`w-0.5 rounded-full bg-amber-400 transition-all ${isPlayingSound ? 'animate-sound-bar-4 h-3' : 'h-1 opacity-40'}`} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePlaySound()}
                    disabled={isMuted}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                      isMuted
                        ? 'opacity-40 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-400'
                        : 'bg-amber-400/15 hover:bg-amber-400/25 border-amber-400/30 text-amber-300'
                    }`}
                    title="축하 벨소리 다시 듣기"
                  >
                    <Bell className="w-3 h-3" />
                    <span>다시 듣기</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isMuted
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                    title={isMuted ? '음소거 해제' : '사운드 음소거'}
                    aria-label={isMuted ? '음소거 해제' : '사운드 음소거'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Sound Presets */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {SOUND_PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`px-2 py-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-amber-400/20 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/20'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={preset.description}
                    >
                      <span className="text-sm leading-none mb-0.5">{preset.emoji}</span>
                      <span className="text-[10px] font-black leading-tight tracking-tight whitespace-nowrap">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="w-full pt-1 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSafeClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>멋져요! 학습 계속하기</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => {
                  confettiService.fireSideCannons();
                  confettiService.fireGoldenStars();
                  handlePlaySound();
                  triggerHapticFeedback('success');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>폭죽 다시 터뜨리기</span>
              </button>

              {onOpenTitlesModal && (
                <button
                  type="button"
                  onClick={() => {
                    handleSafeClose();
                    onOpenTitlesModal();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="50가지 칭호 도감 보기"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>50대 칭호</span>
                </button>
              )}

              {onShareProgress && (
                <button
                  type="button"
                  onClick={() => {
                    handleSafeClose();
                    onShareProgress();
                  }}
                  className="py-2.5 px-3.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="성과 카드 공유"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>공유</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
