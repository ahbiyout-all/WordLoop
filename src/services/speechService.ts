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
    this.availableVoices = voices.filter(v => v.lang.startsWith('en'));
    if (this.availableVoices.length === 0) {
      this.availableVoices = voices;
    }

    // Set default voice if none set
    if (!this.settings.voiceURI && this.availableVoices.length > 0) {
      // Prefer Google US English, Samantha, or natural English voices
      const preferred = this.availableVoices.find(v => v.lang.includes('US') || v.lang.includes('GB')) || this.availableVoices[0];
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
   * Primary action when user taps a word or sentence card.
   * If another item was playing, it immediately stops and begins looping this new item.
   * If the SAME item is tapped, it toggles pause/play.
   * Option to pass koreanText (e.g., word meaning or sentence Korean translation)
   */
  public playItem(itemId: string, text: string, koreanText?: string, maxRepeatCount?: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('이 브라우저는 음성 합성(Speech Synthesis)을 지원하지 않습니다.');
      return;
    }

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

    window.speechSynthesis.cancel(); // Stop any pending speech

    const utterance = new SpeechSynthesisUtterance(this.activeText);
    utterance.rate = this.settings.speed;
    utterance.pitch = this.settings.pitch;
    utterance.lang = 'en-US';

    // Apply voice if selected
    if (this.settings.voiceURI) {
      const voice = this.availableVoices.find(v => v.voiceURI === this.settings.voiceURI);
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onend = () => {
      if (!this.isPlaying) return;

      // Check if readKorean is enabled and Korean text exists
      if (this.settings.readKorean && this.activeKoreanText && this.activeKoreanText.trim().length > 0) {
        // Small delay before reading Korean
        setTimeout(() => {
          if (this.isPlaying) {
            this.speakKorean(() => this.finishRepetitionCycle());
          }
        }, 200);
      } else {
        this.finishRepetitionCycle();
      }
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        this.isPlaying = false;
        this.notify();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  private speakKorean(onComplete: () => void) {
    if (!this.activeKoreanText || !this.isPlaying) {
      onComplete();
      return;
    }

    const korUtterance = new SpeechSynthesisUtterance(this.activeKoreanText);
    korUtterance.rate = this.settings.speed;
    korUtterance.pitch = this.settings.pitch;
    korUtterance.lang = 'ko-KR';

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const allVoices = window.speechSynthesis.getVoices();
      const korVoice = allVoices.find(v => v.lang.startsWith('ko'));
      if (korVoice) {
        korUtterance.voice = korVoice;
      }
    }

    korUtterance.onend = () => {
      onComplete();
    };

    korUtterance.onerror = (e) => {
      console.warn('Korean SpeechSynthesis error:', e);
      onComplete();
    };

    window.speechSynthesis.speak(korUtterance);
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
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
   * Uses asynchronous dispatch to prevent rapid cancellation locks in Chromium/WebKit engines.
   */
  public speakOnce(text: string, lang: string = 'en-US') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
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

        if (lang.startsWith('ko')) {
          const allVoices = window.speechSynthesis.getVoices();
          const korVoice = allVoices.find(v => v.lang.startsWith('ko'));
          if (korVoice) {
            utterance.voice = korVoice;
          }
        } else if (this.settings.voiceURI && lang.startsWith('en')) {
          const voice = this.availableVoices.find(v => v.voiceURI === this.settings.voiceURI);
          if (voice) {
            utterance.voice = voice;
          }
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis speak error:', err);
      }
    }, 25);
  }

  /**
   * Speak once with detailed lifecycle callbacks (onStart, onEnd) for synchronous waveform animation
   */
  public speakWithCallbacks(
    text: string,
    options?: {
      rate?: number;
      lang?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: () => void;
    }
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
      options?.onEnd?.();
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
        utterance.pitch = this.settings.pitch || 1.0;
        utterance.lang = options?.lang || 'en-US';

        if (options?.lang?.startsWith('ko')) {
          const allVoices = window.speechSynthesis.getVoices();
          const korVoice = allVoices.find(v => v.lang.startsWith('ko'));
          if (korVoice) {
            utterance.voice = korVoice;
          }
        } else if (this.settings.voiceURI) {
          const voice = this.availableVoices.find(v => v.voiceURI === this.settings.voiceURI);
          if (voice) {
            utterance.voice = voice;
          }
        }

        utterance.onstart = () => {
          options?.onStart?.();
        };

        utterance.onend = () => {
          options?.onEnd?.();
        };

        utterance.onerror = (e) => {
          console.warn('Speech synthesis with callbacks error:', e);
          options?.onError ? options.onError() : options?.onEnd?.();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('speakWithCallbacks error:', err);
        options?.onEnd?.();
      }
    }, 30);
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
