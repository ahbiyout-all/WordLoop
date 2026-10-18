/**
 * toneBgmSynthEngine.ts
 * WordLoop Emotional Adaptive Tone Polyphonic Sound & Real-Time Nag BGM Synthesis Engine
 * 
 * Works in tandem with WordLoopToneSynthEngine.dll on Windows Electron PC,
 * and provides a lossless Web Audio API procedural synthesis engine in Web & Mobile.
 */

import { NagTonePreset } from '../types';

export interface ToneSynthMeta {
  toneType: NagTonePreset;
  toneName: string;
  bpm: number;
  musicalKey: string;
  isNativeAccelerated?: boolean;
}

class ToneBgmSynthEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private activeTone: NagTonePreset = 'tsundere';
  private timerId: any = null;
  private activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private currentVolume: number = 0.28;
  private isMuted: boolean = false;

  private initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64; // Gives 32 frequency bins
        this.analyser.smoothingTimeConstant = 0.82;

        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.audioCtx.currentTime);

        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public getMeta(tone: NagTonePreset): ToneSynthMeta {
    switch (tone) {
      case 'tsundere':
        return {
          toneType: 'tsundere',
          toneName: '츤데레 (경쾌·만화풍 긴박)',
          bpm: 138,
          musicalKey: 'C Major',
        };
      case 'strict':
        return {
          toneType: 'strict',
          toneName: '엄격 (서스펜스·드라마틱 단조)',
          bpm: 116,
          musicalKey: 'D Minor',
        };
      case 'affectionate':
        return {
          toneType: 'affectionate',
          toneName: '다정 (따뜻한 로파이 오르골)',
          bpm: 84,
          musicalKey: 'F Major',
        };
    }
  }

  public startToneBGM(tone: NagTonePreset, volume = 0.28) {
    this.initAudio();
    this.stopToneBGM();

    this.activeTone = tone;
    this.currentVolume = volume;
    this.isPlaying = true;

    if (!this.audioCtx || !this.masterGain) return;

    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.audioCtx.currentTime);

    const meta = this.getMeta(tone);
    const beatSec = 60.0 / meta.bpm;
    let step = 0;

    const playBar = () => {
      if (!this.isPlaying || !this.audioCtx || !this.masterGain) return;

      const now = this.audioCtx.currentTime;

      if (tone === 'tsundere') {
        // ==========================================
        // 1. TSUNDERE: Bouncy Staccato Swing (138 BPM, C Major)
        // Bouncy staccato square bass + quirky comical arpeggiation
        // ==========================================
        const bassNotes = [130.81, 110.0, 146.83, 98.0]; // C3, A2, D3, G2
        const leadNotes = [523.25, 659.25, 783.99, 587.33, 880.0, 783.99, 659.25, 523.25]; // C5, E5, G5, D5, A5, G5, E5, C5

        // Snappy Bass
        const bassFreq = bassNotes[step % 4];
        this.scheduleTone(bassFreq, now, beatSec * 0.45, 'square', 0.22, 0.01, 0.08);

        // Quirky Arpeggio Lead
        const leadFreq = leadNotes[(step * 2) % leadNotes.length];
        this.scheduleTone(leadFreq, now + 0.02, beatSec * 0.35, 'triangle', 0.18, 0.02, 0.06);

        // Offbeat bounce
        const leadFreq2 = leadNotes[(step * 2 + 1) % leadNotes.length];
        this.scheduleTone(leadFreq2, now + beatSec * 0.5, beatSec * 0.3, 'sine', 0.14, 0.02, 0.05);

      } else if (tone === 'strict') {
        // ==========================================
        // 2. STRICT: Dramatic Suspense Minor (116 BPM, D Minor)
        // Low sawtooth sub-drone + heartbeat kick pulse + tense minor arpeggio
        // ==========================================
        const droneNotes = [73.42, 58.27, 49.0, 55.0]; // D2, Bb1, G1, A1
        const arpNotes = [293.66, 349.23, 440.0, 587.33, 554.37, 440.0, 349.23, 293.66]; // D4, F4, A4, D5, C#5, A4, F4, D4

        // Deep Drone Bass
        const droneFreq = droneNotes[step % 4];
        this.scheduleTone(droneFreq, now, beatSec * 0.95, 'sawtooth', 0.25, 0.05, 0.2);

        // Heartbeat Kick Pulse
        this.scheduleHeartbeat(now, beatSec * 0.25);

        // Tense Minor Arpeggio
        const arpFreq = arpNotes[(step * 2) % arpNotes.length];
        this.scheduleTone(arpFreq, now + 0.05, beatSec * 0.4, 'sawtooth', 0.16, 0.01, 0.08);

        const arpFreq2 = arpNotes[(step * 2 + 1) % arpNotes.length];
        this.scheduleTone(arpFreq2, now + beatSec * 0.5, beatSec * 0.4, 'triangle', 0.14, 0.01, 0.08);

      } else {
        // ==========================================
        // 3. AFFECTIONATE: Warm Lofi Celesta & Major 7th Pad (84 BPM, F Major)
        // Gentle healing chord pad + music box celesta bell
        // ==========================================
        const chordPads = [
          [174.61, 220.0, 261.63], // Fmaj
          [233.08, 293.66, 349.23], // Bbmaj
          [220.0, 261.63, 329.63],  // Am7
          [261.63, 329.63, 392.0],  // C7
        ];
        const bellNotes = [440.0, 523.25, 493.88, 392.0]; // A4, C5, B4, G4

        // Warm Pad
        const chord = chordPads[step % 4];
        chord.forEach((freq) => {
          this.scheduleTone(freq, now, beatSec * 0.98, 'sine', 0.07, 0.1, 0.3);
        });

        // Music Box Celesta Bell
        const bellFreq = bellNotes[step % 4];
        this.scheduleCelesta(bellFreq, now + 0.05, beatSec * 0.85);

        // Gentle Bass
        this.scheduleTone(chord[0] / 2, now, beatSec * 0.95, 'sine', 0.14, 0.05, 0.25);
      }

      step++;
    };

    // First beat immediately
    playBar();
    this.timerId = setInterval(playBar, beatSec * 1000);
  }

  private scheduleTone(
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    attack: number,
    decay: number
  ) {
    if (!this.audioCtx || !this.masterGain) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration + decay);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration + decay);

      this.activeNodes.push({ osc, gain });
      // Garbage collect after finish
      setTimeout(() => {
        this.activeNodes = this.activeNodes.filter((n) => n.osc !== osc);
      }, (duration + decay + 0.2) * 1000);
    } catch {
      // Audio node scheduling error guard
    }
  }

  private scheduleHeartbeat(startTime: number, duration: number) {
    if (!this.audioCtx || !this.masterGain) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, startTime);
      osc.frequency.exponentialRampToValueAtTime(42, startTime + duration);

      gain.gain.setValueAtTime(0.32, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {}
  }

  private scheduleCelesta(freq: number, startTime: number, duration: number) {
    if (!this.audioCtx || !this.masterGain) return;
    try {
      // Fundamental + High shimmer
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.0, startTime); // Shimmer overtone

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
    } catch {}
  }

  public getSpectrumBars(barCount = 28): number[] {
    if (!this.analyser || !this.isPlaying) {
      return Array(barCount).fill(12);
    }

    try {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);

      const bars: number[] = [];
      const step = Math.max(1, Math.floor(dataArray.length / barCount));

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step] || 0;
        // Normalize 0 ~ 255 into 12 ~ 100
        const height = Math.max(12, Math.min(100, Math.round((val / 255) * 88 + 12)));
        bars.push(height);
      }
      return bars;
    } catch {
      return Array(barCount).fill(12);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.currentVolume,
        this.audioCtx.currentTime
      );
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioCtx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.audioCtx.currentTime);
    }
  }

  public stopToneBGM() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.activeNodes.forEach((node) => {
      try {
        node.osc.stop();
        node.osc.disconnect();
      } catch {}
    });
    this.activeNodes = [];
  }

  public getActiveTone(): NagTonePreset {
    return this.activeTone;
  }

  public isBGMPlaying(): boolean {
    return this.isPlaying;
  }
}

export const toneBgmSynthEngine = new ToneBgmSynthEngine();
