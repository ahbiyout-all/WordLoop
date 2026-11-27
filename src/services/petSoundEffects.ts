import { getSharedAudioContext } from './speechService';

export type PetSoundEffectId =
  | 'happy'
  | 'hungry'
  | 'curious'
  | 'feed'
  | 'pet'
  | 'evolve'
  | 'coin'
  | 'shield';

interface ToneStep {
  freq: number;
  endFreq?: number;
  offsetSec: number;
  durSec: number;
  type: OscillatorType;
  gain: number;
}

const SOUND_RECIPES: Record<PetSoundEffectId, ToneStep[]> = {
  // Bright cheerful major-pentatonic chime for happy/motivated pet interactions
  happy: [
    { freq: 523.25, offsetSec: 0, durSec: 0.1, type: 'triangle', gain: 0.075 },
    { freq: 659.25, offsetSec: 0.065, durSec: 0.1, type: 'triangle', gain: 0.08 },
    { freq: 783.99, offsetSec: 0.13, durSec: 0.11, type: 'sine', gain: 0.085 },
    { freq: 1046.5, offsetSec: 0.195, durSec: 0.22, type: 'sine', gain: 0.075 },
  ],
  // Distinct low tummy-rumble + wistful downward chirp for hungry pet state
  hungry: [
    { freq: 392.0, endFreq: 293.66, offsetSec: 0, durSec: 0.16, type: 'triangle', gain: 0.075 },
    { freq: 261.63, endFreq: 196.0, offsetSec: 0.13, durSec: 0.2, type: 'triangle', gain: 0.07 },
    { freq: 118.0, endFreq: 86.0, offsetSec: 0.22, durSec: 0.28, type: 'sawtooth', gain: 0.045 },
  ],
  // Gentle inquisitive two-note lift
  curious: [
    { freq: 440.0, offsetSec: 0, durSec: 0.09, type: 'sine', gain: 0.065 },
    { freq: 587.33, endFreq: 659.25, offsetSec: 0.08, durSec: 0.16, type: 'triangle', gain: 0.07 },
  ],
  // Cozy warm pet pat chime
  pet: [
    { freq: 587.33, offsetSec: 0, durSec: 0.12, type: 'triangle', gain: 0.065 },
    { freq: 783.99, offsetSec: 0.08, durSec: 0.16, type: 'triangle', gain: 0.065 },
  ],
  // Happy snack-munch triad
  feed: [
    { freq: 523.25, offsetSec: 0, durSec: 0.1, type: 'sine', gain: 0.07 },
    { freq: 659.25, offsetSec: 0.07, durSec: 0.1, type: 'sine', gain: 0.07 },
    { freq: 783.99, offsetSec: 0.14, durSec: 0.18, type: 'sine', gain: 0.075 },
  ],
  // Crisp coin reward sparkle
  coin: [
    { freq: 987.77, offsetSec: 0, durSec: 0.08, type: 'sine', gain: 0.055 },
    { freq: 1318.51, offsetSec: 0.06, durSec: 0.14, type: 'sine', gain: 0.055 },
  ],
  // Resonant protective shield chord
  shield: [
    { freq: 440.0, offsetSec: 0, durSec: 0.14, type: 'triangle', gain: 0.07 },
    { freq: 659.25, offsetSec: 0.1, durSec: 0.22, type: 'triangle', gain: 0.07 },
  ],
  // Triumphant 5-note evolution fanfare
  evolve: [
    { freq: 523.25, offsetSec: 0, durSec: 0.22, type: 'triangle', gain: 0.08 },
    { freq: 659.25, offsetSec: 0.09, durSec: 0.22, type: 'triangle', gain: 0.08 },
    { freq: 783.99, offsetSec: 0.18, durSec: 0.22, type: 'triangle', gain: 0.08 },
    { freq: 1046.5, offsetSec: 0.27, durSec: 0.24, type: 'triangle', gain: 0.085 },
    { freq: 1318.51, offsetSec: 0.36, durSec: 0.3, type: 'triangle', gain: 0.085 },
  ],
};

/**
 * Resolve which primary tap cue should play based on the pet's hunger & sentiment state.
 */
export function resolvePetTapSoundCue(params: {
  fullness: number;
  sentiment?: string;
}): 'happy' | 'hungry' {
  if (params.sentiment === 'hungry' || params.fullness < 35) {
    return 'hungry';
  }
  return 'happy';
}

/**
 * Play a synthesized Web Audio sound effect from the Pet Sanctuary sound library.
 * Uses the shared AudioContext singleton to respect mobile hardware context limits.
 */
export function playPetSoundEffect(
  effect: PetSoundEffectId,
  options?: { soundEnabled?: boolean }
): boolean {
  if (typeof window === 'undefined') return false;
  if (options?.soundEnabled === false) return false;

  const recipe = SOUND_RECIPES[effect] || SOUND_RECIPES.pet;
  let ephemeralCtx: AudioContext | null = null;

  try {
    let ctx = getSharedAudioContext();
    if (!ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
      ephemeralCtx = ctx;
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const baseTime = ctx.currentTime;
    for (const step of recipe) {
      const start = baseTime + step.offsetSec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = step.type;
      osc.frequency.setValueAtTime(step.freq, start);
      if (step.endFreq && step.endFreq > 0) {
        osc.frequency.exponentialRampToValueAtTime(step.endFreq, start + step.durSec);
      }

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(step.gain, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + step.durSec);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + step.durSec + 0.025);
    }

    if (ephemeralCtx) {
      setTimeout(() => {
        try {
          void ephemeralCtx?.close();
        } catch {}
      }, 1200);
    }
    return true;
  } catch {
    return false;
  }
}
