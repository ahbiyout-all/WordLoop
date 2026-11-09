import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkles, Trophy, Crown, Flame, Award, Star, X, Check, ArrowRight } from 'lucide-react';
import { triggerHapticFeedback } from '../services/studentGamificationService';

export interface MilestoneCelebrationData {
  id?: string;
  type: 'level_up' | 'milestone' | 'title_unlocked' | 'streak_milestone';
  title: string;
  subtitle: string;
  badgeEmoji?: string;
  levelNumber?: number;
  unlockedTitle?: string;
  perkText?: string;
  expGained?: number;
}

const VIVID_PASTEL_PALETTE = [
  '#FF7675', // Pastel Coral Red
  '#74B9FF', // Sky Pastel Blue
  '#55EFC4', // Mint Emerald Green
  '#FFEAA7', // Sunshine Yellow
  '#A29BFE', // Soft Lavender Purple
  '#FD79A8', // Bubblegum Pink
  '#81ECEC', // Cyan Aqua
  '#FAB1A0', // Warm Peach
  '#FF9FF3', // Vivid Neon Magenta
  '#FDCB6E', // Gold Amber
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: 'rect' | 'circle' | 'star' | 'ribbon';
  opacity: number;
  decay: number;
  wobble: number;
}

/**
 * Global helper function to trigger Level-Up / Milestone Confetti & Banner from anywhere in the app
 */
export function triggerLevelUpBanner(data: MilestoneCelebrationData) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('wordloop_trigger_levelup', { detail: data });
    window.dispatchEvent(event);
  }
}

interface ConfettiCanvasProps {
  activeData?: MilestoneCelebrationData | null;
  onClose?: () => void;
  autoFireOnInit?: boolean;
}

export const ConfettiCanvas: React.FC<ConfettiCanvasProps> = ({
  activeData: externalData,
  onClose: externalOnClose,
}) => {
  const [celebrationData, setCelebrationData] = useState<MilestoneCelebrationData | null>(
    externalData || null
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Sync external props with internal state
  useEffect(() => {
    if (externalData) {
      setCelebrationData(externalData);
    }
  }, [externalData]);

  // Listen for global custom events
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvt = e as CustomEvent<MilestoneCelebrationData>;
      if (customEvt.detail) {
        setCelebrationData(customEvt.detail);
      }
    };

    window.addEventListener('wordloop_trigger_levelup', handleEvent);
    return () => {
      window.removeEventListener('wordloop_trigger_levelup', handleEvent);
    };
  }, []);

  // Spawn vivid pastel confetti particles
  const burstConfetti = useCallback((count = 90) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const shapes: ('rect' | 'circle' | 'star' | 'ribbon')[] = ['rect', 'circle', 'star', 'ribbon'];

    const newParticles: Particle[] = [];

    // Cannon 1: Left Burst
    for (let i = 0; i < count / 2; i++) {
      const angle = (Math.PI / 180) * (-45 + (Math.random() * 50 - 25));
      const speed = 7 + Math.random() * 11;
      const color = VIVID_PASTEL_PALETTE[Math.floor(Math.random() * VIVID_PASTEL_PALETTE.length)];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      newParticles.push({
        x: width * 0.15,
        y: height * 0.85,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: shape === 'star' ? 8 + Math.random() * 6 : 6 + Math.random() * 7,
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        shape,
        opacity: 1,
        decay: 0.006 + Math.random() * 0.006,
        wobble: Math.random() * 10,
      });
    }

    // Cannon 2: Right Burst
    for (let i = 0; i < count / 2; i++) {
      const angle = (Math.PI / 180) * (-135 + (Math.random() * 50 - 25));
      const speed = 7 + Math.random() * 11;
      const color = VIVID_PASTEL_PALETTE[Math.floor(Math.random() * VIVID_PASTEL_PALETTE.length)];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      newParticles.push({
        x: width * 0.85,
        y: height * 0.85,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: shape === 'star' ? 8 + Math.random() * 6 : 6 + Math.random() * 7,
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        shape,
        opacity: 1,
        decay: 0.006 + Math.random() * 0.006,
        wobble: Math.random() * 10,
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, []);

  // Canvas loop & animation
  useEffect(() => {
    if (!celebrationData) return;

    triggerHapticFeedback('success');

    // Resize canvas
    const updateSize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Burst initial confetti
    burstConfetti(110);
    const secondaryBurst = setTimeout(() => {
      burstConfetti(70);
    }, 450);

    const renderLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx + Math.sin(p.wobble) * 0.5;
        p.y += p.vy;
        p.vy += 0.24; // gravity
        p.vx *= 0.985;
        p.wobble += 0.08;
        p.rotation += p.rotationSpeed;
        p.opacity -= p.decay;

        if (p.opacity <= 0 || p.y > canvas.height + 60) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'ribbon') {
          ctx.fillRect(-p.size / 3, -p.size, p.size * 0.6, p.size * 2);
        } else if (p.shape === 'star') {
          let rot = (Math.PI / 2) * 3;
          let x = 0;
          let y = 0;
          const step = Math.PI / 5;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          for (let s = 0; s < 5; s++) {
            x = Math.cos(rot) * p.size;
            y = Math.sin(rot) * p.size;
            ctx.lineTo(x, y);
            rot += step;

            x = Math.cos(rot) * (p.size / 2);
            y = Math.sin(rot) * (p.size / 2);
            ctx.lineTo(x, y);
            rot += step;
          }
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      if (particles.length > 0) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
      } else {
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(secondaryBurst);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [celebrationData, burstConfetti]);

  const handleClose = () => {
    setCelebrationData(null);
    particlesRef.current = [];
    if (externalOnClose) externalOnClose();
  };

  if (!celebrationData) return null;

  const isLevelUp = celebrationData.type === 'level_up';
  const isTitle = celebrationData.type === 'title_unlocked';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      {/* Full-screen HTML5 Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Level-Up Overlay Banner Card */}
      <div className="relative z-20 w-full max-w-md rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white border-2 border-amber-400/60 shadow-2xl shadow-amber-500/20 text-center space-y-6 transform animate-in zoom-in-90 duration-300">
        {/* Glowing Aura Behind Card */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-tr from-amber-400/30 via-pink-500/30 to-violet-500/30 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Top Dismiss Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          title="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Animated Badge Icon Header */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600 flex items-center justify-center text-5xl sm:text-6xl shadow-xl shadow-amber-500/30 transform hover:scale-105 transition-transform ring-4 ring-white/20">
            {celebrationData.badgeEmoji || (isLevelUp ? '🚀' : '👑')}
          </div>
          <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black tracking-wider shadow-md uppercase border border-amber-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 fill-current" />
            <span>UNLOCKED</span>
          </div>
        </div>

        {/* Level-Up Title & Headline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest">
            {isLevelUp ? (
              <Crown className="w-3.5 h-3.5 fill-current" />
            ) : isTitle ? (
              <Award className="w-3.5 h-3.5" />
            ) : (
              <Trophy className="w-3.5 h-3.5" />
            )}
            <span>{isLevelUp ? 'LEVEL UP!' : 'NEW MILESTONE!'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-pink-300 tracking-tight">
            {celebrationData.title}
          </h2>

          <p className="text-sm text-slate-300 font-medium max-w-sm mx-auto leading-relaxed">
            {celebrationData.subtitle}
          </p>
        </div>

        {/* Student Title / Perk Card */}
        {(celebrationData.unlockedTitle || celebrationData.perkText) && (
          <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-1.5 text-left">
            {celebrationData.unlockedTitle && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">새로운 명예 칭호:</span>
                <span className="font-black text-amber-300 text-sm flex items-center gap-1">
                  <span>{celebrationData.unlockedTitle}</span>
                </span>
              </div>
            )}
            {celebrationData.perkText && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">달성 혜택:</span>
                <span className="font-bold text-emerald-300 text-xs">
                  {celebrationData.perkText}
                </span>
              </div>
            )}
            {celebrationData.expGained ? (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                <span className="text-slate-400">보너스 경험치:</span>
                <span className="font-black text-yellow-400">
                  +{celebrationData.expGained} EXP
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleClose}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>축하하기 & 보상 수령</span>
          </button>
        </div>
      </div>
    </div>
  );
};
