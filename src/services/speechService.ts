import { AudioSettings, PronunciationResult, WordMatch } from '../types';

export type SpeechStateListener = (state: {
  activeItemId: string | null;
  activeText: string | null;
  isPlaying: boolean;
  repeatCount: number;
  settings: AudioSettings;
}) => void;

const AUDIO_SETTINGS_STORAGE_KEY = 'wordloop_audio_settings';

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  speed: 0.9,       // Default comfortable speed for learners (0.9x)
  pitch: 1.0,
  voiceURI: null,
  repeatDelay: 1.5, // 1.5s delay between repetitions
  loopMode: true,   // Continuous repeat enabled
  maxRepeatCount: 0, // Default 0 = Infinite repetition (무한 반복)
  readKorean: true,  // Default enabled for Korean meaning reading
};

function loadStoredAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const saved = localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!saved) return { ...DEFAULT_AUDIO_SETTINGS };
    const parsed = JSON.parse(saved);
    return {
      speed: typeof parsed.speed === 'number' && parsed.speed >= 0.4 && parsed.speed <= 2.0 ? parsed.speed : DEFAULT_AUDIO_SETTINGS.speed,
      pitch: typeof parsed.pitch === 'number' && parsed.pitch >= 0.5 && parsed.pitch <= 1.5 ? parsed.pitch : DEFAULT_AUDIO_SETTINGS.pitch,
      voiceURI: typeof parsed.voiceURI === 'string' ? parsed.voiceURI : null,
      repeatDelay: typeof parsed.repeatDelay === 'number' && parsed.repeatDelay >= 0.2 ? parsed.repeatDelay : DEFAULT_AUDIO_SETTINGS.repeatDelay,
      loopMode: typeof parsed.loopMode === 'boolean' ? parsed.loopMode : DEFAULT_AUDIO_SETTINGS.loopMode,
      maxRepeatCount: typeof parsed.maxRepeatCount === 'number' && parsed.maxRepeatCount >= 0 ? parsed.maxRepeatCount : DEFAULT_AUDIO_SETTINGS.maxRepeatCount,
      readKorean: typeof parsed.readKorean === 'boolean' ? parsed.readKorean : DEFAULT_AUDIO_SETTINGS.readKorean,
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

function saveStoredAudioSettings(settings: AudioSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save audio settings to localStorage:', e);
  }
}

/**
 * Shared singleton AudioContext to prevent exceeding mobile hardware context limit (max 6 on Android/Samsung).
 */
let sharedAudioContext: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    try {
      sharedAudioContext = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Unlocks mobile browser audio restrictions (Samsung Internet, Android Chrome, Safari iOS)
 * upon the user's very first interaction on screen.
 */
let hasUnlockedMobileAudio = false;

export function initMobileAudioUnlock(): void {
  if (typeof window === 'undefined' || hasUnlockedMobileAudio) return;

  const unlock = () => {
    if (hasUnlockedMobileAudio) return;
    hasUnlockedMobileAudio = true;

    // 1. Unlock shared Web Audio context
    try {
      const ctx = getSharedAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}

    // 2. Unlock SpeechSynthesis on Samsung/Android
    if ('speechSynthesis' in window && window.speechSynthesis) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        // Emit a virtually silent 1ms dummy utterance to prime the mobile audio daemon
        const dummy = new SpeechSynthesisUtterance(' ');
        dummy.volume = 0.01;
        dummy.rate = 10;
        window.speechSynthesis.speak(dummy);
      } catch {}
    }

    // Remove event listeners after first user gesture
    ['pointerdown', 'touchstart', 'touchend', 'click'].forEach(evt => {
      window.removeEventListener(evt, unlock, { capture: true });
    });
  };

  ['pointerdown', 'touchstart', 'touchend', 'click'].forEach(evt => {
    window.addEventListener(evt, unlock, { capture: true, passive: true });
  });
}

/**
 * Triggers a silent audio context initialization and resumes speech synthesis
 * as soon as the user hovers over or touches a Pronunciation button.
 */
export function prepareAudioContext(): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if ('speechSynthesis' in window && window.speechSynthesis) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('audio-prepare', () => {
    prepareAudioContext();
  }, { capture: true, passive: true });
}

class SpeechService {
  private activeItemId: string | null = null;
  private activeText: string | null = null;
  private activeKoreanText: string | null = null;
  private isPlaying: boolean = false;
  private repeatCount: number = 0;
  private activeCustomMaxRepeat: number | null = null;
  private loopTimer: NodeJS.Timeout | null = null;
  private listeners: Set<SpeechStateListener> = new Set();
  private availableVoices: SpeechSynthesisVoice[] = [];

  private settings: AudioSettings = loadStoredAudioSettings();

  private onItemRepeatCallback: ((itemId: string, text: string, count: number) => void) | null = null;
  private fallbackAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  public setOnItemRepeatCallback(cb: (itemId: string, text: string, count: number) => void) {
    this.onItemRepeatCallback = cb;
  }

  public loadVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const voices = window.speechSynthesis.getVoices();
    // Filter English voices predominantly
    this.availableVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('en'));
    if (this.availableVoices.length === 0) {
      this.availableVoices = voices;
    }

    // Set default voice if none set
    if (!this.settings.voiceURI && this.availableVoices.length > 0) {
      const preferred = this.availableVoices.find(v => v.lang.includes('US') || v.lang.includes('GB') || v.name.includes('Samsung')) || this.availableVoices[0];
      this.settings.voiceURI = preferred.voiceURI;
      saveStoredAudioSettings(this.settings);
    }

    return this.availableVoices;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0) {
      this.loadVoices();
    }
    return this.availableVoices;
  }

  /**
   * Resilient voice resolution: matches user's preferred voiceURI, but safely
   * falls back to the best available voice on the current mobile device (e.g. Samsung English).
   */
  public resolveVoice(lang: string): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    const normalizedLang = lang.toLowerCase().replace('_', '-');

    // 1. If user previously chose a voiceURI and it exists on this device
    if (this.settings.voiceURI) {
      const matched = voices.find(v => v.voiceURI === this.settings.voiceURI);
      if (matched) return matched;
    }

    // 2. Language-specific matching
    if (normalizedLang.startsWith('en')) {
      const enVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('en'));
      if (enVoices.length > 0) {
        const preferred = enVoices.find(v => 
          v.name.includes('Samsung') ||
          v.name.includes('Google') ||
          v.name.includes('Natural') ||
          v.lang.toLowerCase().includes('us') ||
          v.lang.toLowerCase().includes('gb')
        );
        return preferred || enVoices[0];
      }
    } else if (normalizedLang.startsWith('ko')) {
      const koVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('ko'));
      if (koVoices.length > 0) {
        const preferred = koVoices.find(v => v.name.includes('Samsung') || v.name.includes('Google'));
        return preferred || koVoices[0];
      }
    }

    return null;
  }

  public subscribe(listener: SpeechStateListener) {
    this.listeners.add(listener);
    this.notify();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = {
      activeItemId: this.activeItemId,
      activeText: this.activeText,
      isPlaying: this.isPlaying,
      repeatCount: this.repeatCount,
      settings: { ...this.settings },
    };
    this.listeners.forEach(fn => fn(currentState));
  }

  public updateSettings(newSettings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    saveStoredAudioSettings(this.settings);
    this.notify();
  }

  public setSpeed(speed: number) {
    const clampedSpeed = Math.max(0.4, Math.min(2.0, Math.round(speed * 100) / 100));
    this.updateSettings({ speed: clampedSpeed });
  }

  public cycleSpeed() {
    const SPEED_CYCLE = [0.5, 0.7, 0.8, 0.9, 1.0, 1.25, 1.5];
    const currentSpeed = this.settings.speed || 0.9;
    const currentIndex = SPEED_CYCLE.findIndex(s => Math.abs(s - currentSpeed) < 0.05);
    const nextIndex = currentIndex === -1 ? 3 : (currentIndex + 1) % SPEED_CYCLE.length;
    this.setSpeed(SPEED_CYCLE[nextIndex]);
    return SPEED_CYCLE[nextIndex];
  }

  /**
   * Audible tone indicator when network TTS is blocked on restricted mobile networks
   */
  public playFallbackBeep(freq = 580, duration = 0.12) {
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  /**
   * HTML5 Audio fallback for mobile browsers (Samsung Internet, Chrome Android, KakaoTalk)
   * configured without referrer to bypass carrier 403 blocks.
   */
  public playFallbackAudio(text: string, lang: 'en' | 'ko' = 'en', onComplete?: () => void) {
    try {
      if (this.fallbackAudio) {
        this.fallbackAudio.pause();
        this.fallbackAudio = null;
      }

      const cleanText = text.slice(0, 200).replace(/["'\r\n]/g, ' ').trim();
      if (!cleanText) {
        onComplete?.();
        return;
      }

      const encoded = encodeURIComponent(cleanText);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encoded}`;
      const audio = new Audio();
      audio.setAttribute('referrerpolicy', 'no-referrer');
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.volume = 1.0;
      audio.playbackRate = Math.min(1.5, Math.max(0.7, this.settings.speed || 1.0));
      audio.src = url;
      this.fallbackAudio = audio;

      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        this.fallbackAudio = null;
        onComplete?.();
      };

      audio.onended = done;
      audio.onerror = () => {
        console.warn('Fallback audio playback error; triggering fallback audio tone');
        this.playFallbackBeep(lang === 'ko' ? 440 : 660);
        done();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Fallback audio play catch:', err);
          this.playFallbackBeep(lang === 'ko' ? 440 : 660);
          done();
        });
      }
    } catch (e) {
      console.warn('Fallback audio exception:', e);
      onComplete?.();
    }
  }

  /**
   * Primary action when user taps a word or sentence card.
   */
  public playItem(itemId: string, text: string, koreanText?: string, maxRepeatCount?: number) {
    // If same item tapped
    if (this.activeItemId === itemId) {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.resume();
      }
      return;
    }

    // New item tapped -> Stop previous playback completely & clear timers
    this.stopInternal();

    // Set new active item
    this.activeItemId = itemId;
    this.activeText = text;
    this.activeKoreanText = koreanText || null;
    this.activeCustomMaxRepeat = maxRepeatCount !== undefined ? maxRepeatCount : null;
    this.isPlaying = true;
    this.repeatCount = 0;

    this.notify();
    this.speakCurrent();
  }

  private speakCurrent() {
    if (!this.activeText || !this.activeItemId || !this.isPlaying) return;

    // Check if SpeechSynthesis is supported by current browser/webview
    const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis;

    if (!hasSpeechSynthesis) {
      // Graceful fallback to HTML5 Audio TTS
      this.playFallbackAudio(this.activeText, 'en', () => {
        this.handleAfterEnglishSpoken();
      });
      return;
    }

    const executeSpeak = () => {
      if (!this.isPlaying || !this.activeText) return;

      // 1. Samsung Galaxy Unfreeze: if paused, forcefully resume
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}

      const utterance = new SpeechSynthesisUtterance(this.activeText);
      utterance.rate = this.settings.speed;
      utterance.pitch = this.settings.pitch;
      utterance.lang = 'en-US';

      // 2. Samsung Voice Resolution: ensure we do not set an invalid voiceURI
      const voice = this.resolveVoice('en-US');
      if (voice) {
        utterance.voice = voice;
      }

      // 3. Samsung TTS Watchdog Timer (850ms):
      // On Samsung Galaxy devices, if Samsung TTS stalls silently without firing onstart/onend,
      // the watchdog cancels the hung queue and triggers resilient HTML5 Audio playback.
      let hasStarted = false;
      let watchdog: NodeJS.Timeout | null = setTimeout(() => {
        if (!hasStarted && this.isPlaying) {
          console.warn('Samsung Galaxy TTS silent stall detected on English utterance. Switching to fallback audio stream...');
          try { window.speechSynthesis.cancel(); } catch {}
          this.playFallbackAudio(this.activeText!, 'en', () => {
            this.handleAfterEnglishSpoken();
          });
        }
      }, 850);

      utterance.onstart = () => {
        hasStarted = true;
        if (watchdog) {
          clearTimeout(watchdog);
          watchdog = null;
        }
      };

      utterance.onend = () => {
        if (watchdog) {
          clearTimeout(watchdog);
          watchdog = null;
        }
        this.handleAfterEnglishSpoken();
      };

      utterance.onerror = (e) => {
        if (watchdog) {
          clearTimeout(watchdog);
          watchdog = null;
        }
        console.warn('SpeechSynthesis error, attempting audio fallback:', e);
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          this.playFallbackAudio(this.activeText!, 'en', () => {
            this.handleAfterEnglishSpoken();
          });
        }
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        if (watchdog) clearTimeout(watchdog);
        this.playFallbackAudio(this.activeText, 'en', () => {
          this.handleAfterEnglishSpoken();
        });
      }
    };

    // Prevent Android cancel-vs-speak race condition:
    // If already speaking, cancel first then wait a 35ms micro-tick before calling speak()
    if (window.speechSynthesis.speaking) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      setTimeout(executeSpeak, 35);
    } else {
      executeSpeak();
    }
  }

  private handleAfterEnglishSpoken() {
    if (!this.isPlaying) return;

    if (this.settings.readKorean && this.activeKoreanText && this.activeKoreanText.trim().length > 0) {
      setTimeout(() => {
        if (this.isPlaying) {
          this.speakKorean(() => this.finishRepetitionCycle());
        }
      }, 200);
    } else {
      this.finishRepetitionCycle();
    }
  }

  private speakKorean(onComplete: () => void) {
    if (!this.activeKoreanText || !this.isPlaying) {
      onComplete();
      return;
    }

    const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis;

    if (!hasSpeechSynthesis) {
      this.playFallbackAudio(this.activeKoreanText, 'ko', onComplete);
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}

    const korUtterance = new SpeechSynthesisUtterance(this.activeKoreanText);
    korUtterance.rate = this.settings.speed;
    korUtterance.pitch = this.settings.pitch;
    korUtterance.lang = 'ko-KR';

    const korVoice = this.resolveVoice('ko-KR');
    if (korVoice) {
      korUtterance.voice = korVoice;
    }

    let hasStarted = false;
    let korWatchdog: NodeJS.Timeout | null = setTimeout(() => {
      if (!hasStarted && this.isPlaying) {
        console.warn('Samsung Galaxy TTS silent stall detected on Korean utterance. Switching to fallback audio stream...');
        try { window.speechSynthesis.cancel(); } catch {}
        this.playFallbackAudio(this.activeKoreanText!, 'ko', onComplete);
      }
    }, 850);

    korUtterance.onstart = () => {
      hasStarted = true;
      if (korWatchdog) {
        clearTimeout(korWatchdog);
        korWatchdog = null;
      }
    };

    korUtterance.onend = () => {
      if (korWatchdog) {
        clearTimeout(korWatchdog);
        korWatchdog = null;
      }
      onComplete();
    };

    korUtterance.onerror = (e) => {
      if (korWatchdog) {
        clearTimeout(korWatchdog);
        korWatchdog = null;
      }
      console.warn('Korean SpeechSynthesis error, falling back to audio:', e);
      this.playFallbackAudio(this.activeKoreanText!, 'ko', onComplete);
    };

    try {
      window.speechSynthesis.speak(korUtterance);
    } catch {
      if (korWatchdog) clearTimeout(korWatchdog);
      this.playFallbackAudio(this.activeKoreanText, 'ko', onComplete);
    }
  }

  private finishRepetitionCycle() {
    if (!this.isPlaying) return;

    this.repeatCount += 1;
    this.notify();

    if (this.onItemRepeatCallback && this.activeItemId && this.activeText) {
      this.onItemRepeatCallback(this.activeItemId, this.activeText, this.repeatCount);
    }

    // Check if max repeat count has been reached
    const effectiveMaxRepeat = this.activeCustomMaxRepeat !== null ? this.activeCustomMaxRepeat : this.settings.maxRepeatCount;
    const isMaxReached = effectiveMaxRepeat > 0 && this.repeatCount >= effectiveMaxRepeat;

    // If continuous loop mode is active and max count not reached, schedule repeat
    if (this.settings.loopMode && !isMaxReached && this.isPlaying && this.activeItemId) {
      const delayMs = Math.max(200, this.settings.repeatDelay * 1000);
      this.loopTimer = setTimeout(() => {
        if (this.isPlaying && this.activeItemId) {
          this.speakCurrent();
        }
      }, delayMs);
    } else {
      this.isPlaying = false;
      this.notify();
    }
  }

  public pause() {
    this.isPlaying = false;
    this.clearLoopTimer();
    if (this.fallbackAudio) {
      try {
        this.fallbackAudio.pause();
      } catch {}
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.notify();
  }

  public resume() {
    if (this.activeItemId && this.activeText) {
      this.isPlaying = true;
      this.notify();
      this.speakCurrent();
    }
  }

  public stop() {
    this.stopInternal();
    this.activeItemId = null;
    this.activeText = null;
    this.repeatCount = 0;
    this.notify();
  }

  private stopInternal() {
    this.isPlaying = false;
    this.activeCustomMaxRepeat = null;
    this.clearLoopTimer();
    if (this.fallbackAudio) {
      try {
        this.fallbackAudio.pause();
        this.fallbackAudio.currentTime = 0;
      } catch {}
      this.fallbackAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  private clearLoopTimer() {
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }

  public getActiveItemId() {
    return this.activeItemId;
  }

  public getIsPlaying() {
    return this.isPlaying;
  }

  public getRepeatCount() {
    return this.repeatCount;
  }

  public getSettings() {
    return this.settings;
  }

  /**
   * Speak a short snippet (e.g. single alphabet letter or word) once without continuous looping.
   * Features Android unfreeze, resilient voice fallback, and watchdog timeout recovery.
   */
  public speakOnce(text: string, lang: string = 'en-US') {
    if (typeof window === 'undefined' || !text) return;

    const hasSpeechSynthesis = 'speechSynthesis' in window && window.speechSynthesis;
    if (!hasSpeechSynthesis) {
      this.playFallbackAudio(text, lang.startsWith('ko') ? 'ko' : 'en');
      return;
    }

    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore cancellation error
    }

    setTimeout(() => {
      try {
        if (!window.speechSynthesis) return;
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.settings.speed || 1.0;
        utterance.pitch = this.settings.pitch || 1.0;
        utterance.lang = lang;

        const voice = this.resolveVoice(lang);
        if (voice) {
          utterance.voice = voice;
        }

        let hasStarted = false;
        const watchdog = setTimeout(() => {
          if (!hasStarted) {
            try { window.speechSynthesis.cancel(); } catch {}
            this.playFallbackAudio(text, lang.startsWith('ko') ? 'ko' : 'en');
          }
        }, 800);

        utterance.onstart = () => {
          hasStarted = true;
          clearTimeout(watchdog);
        };
        utterance.onend = () => {
          clearTimeout(watchdog);
        };
        utterance.onerror = (e) => {
          clearTimeout(watchdog);
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            this.playFallbackAudio(text, lang.startsWith('ko') ? 'ko' : 'en');
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis speak error:', err);
        this.playFallbackAudio(text, lang.startsWith('ko') ? 'ko' : 'en');
      }
    }, 25);
  }

  /**
   * Speak once with detailed lifecycle callbacks (onStart, onEnd) for synchronous waveform animation.
   * Includes Samsung unfreeze and watchdog timeout recovery.
   */
  public speakWithCallbacks(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      lang?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: () => void;
    }
  ) {
    if (typeof window === 'undefined' || !text) {
      options?.onEnd?.();
      return;
    }

    const hasSpeechSynthesis = 'speechSynthesis' in window && window.speechSynthesis;
    if (!hasSpeechSynthesis) {
      options?.onStart?.();
      this.playFallbackAudio(text, options?.lang?.startsWith('ko') ? 'ko' : 'en', () => {
        options?.onEnd?.();
      });
      return;
    }

    this.stopInternal();

    setTimeout(() => {
      try {
        if (!window.speechSynthesis) {
          options?.onEnd?.();
          return;
        }
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options?.rate || this.settings.speed || 1.0;
        utterance.pitch = options?.pitch || this.settings.pitch || 1.0;
        utterance.lang = options?.lang || 'en-US';

        const voice = this.resolveVoice(utterance.lang);
        if (voice) {
          utterance.voice = voice;
        }

        let hasStarted = false;
        let watchdog: NodeJS.Timeout | null = setTimeout(() => {
          if (!hasStarted) {
            console.warn('Samsung TTS silent stall in speakWithCallbacks. Switching to audio fallback.');
            try { window.speechSynthesis.cancel(); } catch {}
            options?.onStart?.();
            this.playFallbackAudio(text, options?.lang?.startsWith('ko') ? 'ko' : 'en', () => {
              options?.onEnd?.();
            });
          }
        }, 850);

        utterance.onstart = () => {
          hasStarted = true;
          if (watchdog) {
            clearTimeout(watchdog);
            watchdog = null;
          }
          options?.onStart?.();
        };

        utterance.onend = () => {
          if (watchdog) {
            clearTimeout(watchdog);
            watchdog = null;
          }
          options?.onEnd?.();
        };

        utterance.onerror = (e) => {
          if (watchdog) {
            clearTimeout(watchdog);
            watchdog = null;
          }
          console.warn('Speech synthesis with callbacks error:', e);
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            this.playFallbackAudio(text, options?.lang?.startsWith('ko') ? 'ko' : 'en', () => {
              options?.onEnd?.();
            });
          } else {
            options?.onError ? options.onError() : options?.onEnd?.();
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('speakWithCallbacks error:', err);
        options?.onEnd?.();
      }
    }, 30);
  }

  /**
   * Diagnostic test suite for Samsung Galaxy and mobile audio verification
   */
  public async testMobileAudio(): Promise<{ webAudio: boolean; tts: boolean; message: string }> {
    let webAudioOk = false;
    let ttsOk = false;

    // 1. Web Audio Test
    try {
      const ctx = getSharedAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        this.playFallbackBeep(660, 0.15);
        webAudioOk = true;
      }
    } catch {}

    // 2. TTS Test
    return new Promise((resolve) => {
      this.speakWithCallbacks('WordLoop audio test. Pronunciation is working properly.', {
        rate: 1.0,
        onStart: () => {
          ttsOk = true;
        },
        onEnd: () => {
          resolve({
            webAudio: webAudioOk,
            tts: ttsOk,
            message: webAudioOk || ttsOk ? '사운드가 정상 작동합니다!' : '미디어 볼륨을 확인해 주세요.',
          });
        },
        onError: () => {
          resolve({
            webAudio: webAudioOk,
            tts: false,
            message: 'TTS 오류 발생. 미디어 볼륨을 확인해 주세요.',
          });
        },
      });

      setTimeout(() => {
        resolve({
          webAudio: webAudioOk,
          tts: ttsOk,
          message: '테스트 완료',
        });
      }, 2500);
    });
  }

  // --- Pronunciation Speech Recognition Evaluation ---
  public evaluatePronunciation(targetText: string, recognizedText: string): PronunciationResult {
    const cleanTarget = targetText.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const cleanRecognized = recognizedText.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    const targetWords = cleanTarget.split(/\s+/).filter(Boolean);
    const recognizedWords = new Set(cleanRecognized.split(/\s+/).filter(Boolean));

    let matchedCount = 0;
    const wordMatches: WordMatch[] = targetWords.map(w => {
      const matched = recognizedWords.has(w);
      if (matched) matchedCount++;
      return { word: w, matched };
    });

    const score = targetWords.length > 0 
      ? Math.round((matchedCount / targetWords.length) * 100) 
      : 0;

    let feedback = '';
    if (score >= 90) {
      feedback = '🎉 훌륭합니다! 원어민에 가까운 매우 정확한 발음입니다.';
    } else if (score >= 70) {
      feedback = '👍 잘하셨습니다! 대부분의 단어가 명확하게 전달되었습니다.';
    } else if (score >= 50) {
      feedback = '🙂 양호합니다. 반복 들기를 통해 약한 단어를 더 또렷이 연습해 보세요.';
    } else {
      feedback = '💡 소리를 다시 여러 번 반복해서 듣고, 템포에 맞춰 천천히 정갈하게 따라해 보세요.';
    }

    return {
      targetText,
      recognizedText,
      score,
      wordMatches,
      feedback,
    };
  }
}

export const speechService = new SpeechService();
