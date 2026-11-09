/**
 * WordLoop Level-Up Sound Effect Synthesizer Engine
 * Synthesizes cheerful, triumphant crystal bells, brass fanfares, and stardust magical sounds
 * using the Web Audio API singleton. 100% offline, zero-asset, zero-latency.
 */

import { getSharedAudioContext } from './speechService';

export type LevelUpSoundPreset = 'crystal_bell' | 'fanfare_brass' | 'stardust_magic';

export interface SoundPresetOption {
  id: LevelUpSoundPreset;
  name: string;
  emoji: string;
  description: string;
}

export const SOUND_PRESETS: SoundPresetOption[] = [
  {
    id: 'crystal_bell',
    name: '크리스탈 벨',
    emoji: '🔔',
    description: '맑고 영롱하게 울려 퍼지는 오름차순 축하 차임벨',
  },
  {
    id: 'fanfare_brass',
    name: '승리의 팡파레',
    emoji: '🎺',
    description: '웅장하고 당당한 브라스 화음과 승리의 팡파레',
  },
  {
    id: 'stardust_magic',
    name: '스타더스트 매직',
    emoji: '✨',
    description: '별빛이 쏟아지듯 쾌활하고 신비로운 캐스케이드 효과음',
  },
];

const STORAGE_KEY_MUTED = 'wordloop_level_up_sound_muted';
const STORAGE_KEY_PRESET = 'wordloop_level_up_sound_preset';

class LevelUpSoundService {
  private activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

  public isMuted(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
    } catch {
      return false;
    }
  }

  public setMuted(muted: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
    } catch {}
    if (muted) {
      this.stopAll();
    }
  }

  public getSelectedPreset(): LevelUpSoundPreset {
    if (typeof window === 'undefined') return 'crystal_bell';
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PRESET) as LevelUpSoundPreset | null;
      if (stored && (stored === 'crystal_bell' || stored === 'fanfare_brass' || stored === 'stardust_magic')) {
        return stored;
      }
    } catch {}
    return 'crystal_bell';
  }

  public setSelectedPreset(preset: LevelUpSoundPreset): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_PRESET, preset);
    } catch {}
  }

  /**
   * Registers an active oscillator and gain node pair with auto-cleanup onended
   */
  private registerNode(osc: OscillatorNode, gain: GainNode): void {
    const record = { osc, gain };
    this.activeNodes.push(record);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
      this.activeNodes = this.activeNodes.filter((n) => n !== record);
    };
  }

  /**
   * Safely stops and disconnects all currently active sound nodes without clicks or exceptions
   */
  public stopAll(): void {
    const ctx = getSharedAudioContext();
    const now = ctx ? ctx.currentTime : 0;

    this.activeNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        setTimeout(() => {
          try {
            osc.stop();
            osc.disconnect();
            gain.disconnect();
          } catch {}
        }, 50);
      } catch {}
    });
    this.activeNodes = [];
  }

  /**
   * Main entry to play level up celebratory sound
   */
  public play(presetOverride?: LevelUpSoundPreset): void {
    if (this.isMuted()) return;
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const preset = presetOverride || this.getSelectedPreset();
    this.stopAll();

    switch (preset) {
      case 'crystal_bell':
        this.playCrystalBellFanfare(ctx);
        break;
      case 'fanfare_brass':
        this.playTriumphantBrass(ctx);
        break;
      case 'stardust_magic':
        this.playStardustMagic(ctx);
        break;
      default:
        this.playCrystalBellFanfare(ctx);
        break;
    }
  }

  /**
   * Helper to create a master output bus with anti-clipping headroom
   */
  private createMasterBus(ctx: AudioContext): GainNode {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.75, ctx.currentTime);
    master.connect(ctx.destination);
    return master;
  }

  /**
   * Preset 1: Crystal Celesta / Glockenspiel Bell Chime
   * Cheerful, bright, ascending arpeggio with glistening bell overtones
   */
  private playCrystalBellFanfare(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const masterBus = this.createMasterBus(ctx);
    // Ascending melody: C5, E5, G5, B5, C6, E6, culminating in a grand bell chord (G6 + C7)
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.45, gain: 0.22 }, // C5
      { freq: 659.25, time: 0.09, dur: 0.45, gain: 0.24 }, // E5
      { freq: 783.99, time: 0.18, dur: 0.50, gain: 0.26 }, // G5
      { freq: 987.77, time: 0.27, dur: 0.55, gain: 0.28 }, // B5
      { freq: 1046.50, time: 0.36, dur: 0.65, gain: 0.30 }, // C6
      { freq: 1318.51, time: 0.45, dur: 0.75, gain: 0.32 }, // E6
      // Grand double bell shimmer chord
      { freq: 1567.98, time: 0.55, dur: 1.20, gain: 0.30 }, // G6
      { freq: 2093.00, time: 0.55, dur: 1.40, gain: 0.25 }, // C7
    ];

    notes.forEach(({ freq, time, dur, gain: baseGain }) => {
      const startTime = now + time;

      // 1. Fundamental chime oscillator (sine wave)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Bell envelope: sharp strike, quick initial drop, long singing decay
      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(baseGain, startTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(baseGain * 0.45, startTime + 0.12);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gainNode);
      gainNode.connect(masterBus);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);

      this.registerNode(osc, gainNode);

      // 2. Harmonic bell overtone (tuned to 2.76x for authentic metallic glockenspiel ring)
      const overtoneFreq = freq * 2.76;
      if (overtoneFreq < 16000) {
        const overtoneOsc = ctx.createOscillator();
        const overtoneGain = ctx.createGain();
        overtoneOsc.type = 'sine';
        overtoneOsc.frequency.setValueAtTime(overtoneFreq, startTime);

        overtoneGain.gain.setValueAtTime(0.001, startTime);
        overtoneGain.gain.exponentialRampToValueAtTime(baseGain * 0.28, startTime + 0.01);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur * 0.45);

        overtoneOsc.connect(overtoneGain);
        overtoneGain.connect(masterBus);
        overtoneOsc.start(startTime);
        overtoneOsc.stop(startTime + dur * 0.5);

        this.registerNode(overtoneOsc, overtoneGain);
      }
    });
  }

  /**
   * Preset 2: Triumphant Brass Fanfare & Regal Bells
   * Confident, bold brass chords with high victory chime
   */
  private playTriumphantBrass(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const masterBus = this.createMasterBus(ctx);

    // Brass motif notes: G4 (staccato), G4 (staccato), C5, E5, grand G5 chord
    const brassMotif = [
      { freq: 392.00, time: 0.00, dur: 0.12, gain: 0.22 }, // G4
      { freq: 392.00, time: 0.14, dur: 0.12, gain: 0.24 }, // G4
      { freq: 523.25, time: 0.28, dur: 0.22, gain: 0.28 }, // C5
      { freq: 659.25, time: 0.50, dur: 0.22, gain: 0.30 }, // E5
      // Final triumphant chord (C4 + G4 + C5 + G5)
      { freq: 261.63, time: 0.72, dur: 1.10, gain: 0.25 }, // C4
      { freq: 392.00, time: 0.72, dur: 1.10, gain: 0.25 }, // G4
      { freq: 523.25, time: 0.72, dur: 1.20, gain: 0.30 }, // C5
      { freq: 783.99, time: 0.72, dur: 1.30, gain: 0.32 }, // G5
    ];

    brassMotif.forEach(({ freq, time, dur, gain: baseGain }) => {
      const startTime = now + time;

      // Filtered warm triangle wave for royal brass body
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3.5, startTime);
      filter.Q.setValueAtTime(1.5, startTime);

      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(baseGain, startTime + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(baseGain * 0.7, startTime + dur * 0.5);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(masterBus);

      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);

      this.registerNode(osc, gainNode);
    });

    // Layer sparkling bell on top of the final chord
    const bells = [
      { freq: 1046.50, time: 0.72, dur: 1.10 }, // C6
      { freq: 1567.98, time: 0.75, dur: 1.30 }, // G6
    ];

    bells.forEach(({ freq, time, dur }) => {
      const startTime = now + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gain);
      gain.connect(masterBus);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);

      this.registerNode(osc, gain);
    });
  }

  /**
   * Preset 3: Stardust Magic Sound Cascade
   * Sparkling, fast cascading pentatonic crystal bells with shimmering ring
   */
  private playStardustMagic(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const masterBus = this.createMasterBus(ctx);

    // Rapid cascade: C6, D6, E6, G6, A6, C7, D7, E7, G7, C8
    const cascade = [
      1046.50, 1174.66, 1318.51, 1567.98, 1760.00,
      2093.00, 2349.32, 2637.02, 3135.96, 4186.01,
    ];

    cascade.forEach((freq, idx) => {
      const startTime = now + idx * 0.045;
      const dur = 0.35 + idx * 0.08;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.16 + (idx / cascade.length) * 0.10, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gain);
      gain.connect(masterBus);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.03);

      this.registerNode(osc, gain);
    });

    // Sustained ethereal shimmer chord at end
    const shimmerNotes = [1046.50, 1567.98, 2093.00];
    const shimmerStart = now + cascade.length * 0.045;

    shimmerNotes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, shimmerStart);

      gain.gain.setValueAtTime(0.001, shimmerStart);
      gain.gain.exponentialRampToValueAtTime(0.20, shimmerStart + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, shimmerStart + 1.2);

      osc.connect(gain);
      gain.connect(masterBus);
      osc.start(shimmerStart);
      osc.stop(shimmerStart + 1.25);

      this.registerNode(osc, gain);
    });
  }
}

export const soundEffectService = new LevelUpSoundService();
