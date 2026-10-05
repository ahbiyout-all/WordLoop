import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Volume2,
  Play,
  Pause,
  Activity,
  Sparkles,
  Layers,
  Columns,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  HelpCircle,
  ChevronRight,
  Info,
  History,
} from 'lucide-react';
import { speechService } from '../services/speechService';
import {
  getVoiceHistoryForTarget,
  formatVoiceRecordedTime,
  SavedVoiceSnapshot,
  TargetVoiceHistoryRecord,
} from '../services/voiceHistoryService';
import {
  extractVoiceSegment,
  decodeAndExtractVoiceSegment,
  VoiceSegmentResult,
  SilenceStopReason,
  getExpectedSpeechDurationAndSilenceLimits,
  SyllableDiagnostic,
  analyzeSyllablesAndDiscrepancies,
  splitEnglishWordIntoSyllables,
  alignUserWaveformToReference,
} from '../utils/audioWaveformUtils';

interface AudioWaveformProps {
  /** The blob URL of the user's recorded audio (if available) */
  audioUrl?: string | null;
  /** Whether the user's audio is currently playing */
  isPlayingUserAudio?: boolean;
  /** Callback to toggle user audio playback */
  onTogglePlayUserAudio?: (urlToPlay?: string) => void;
  /** Whether live recording is actively ongoing */
  isRecording?: boolean;
  /** The live audio MediaStream (for real-time Web Audio API visualization) */
  audioStream?: MediaStream | null;
  /** Target text to play native TTS & generate reference waveform */
  targetText?: string;
  /** Callback to trigger native TTS */
  onPlayTargetAudio?: () => void;
  /** Whether native TTS is currently playing */
  isPlayingTargetAudio?: boolean;
  /** Callback to stop all audio before starting mic */
  onStartMicRecording?: () => void;
  /** Pronunciation evaluation score if already available */
  score?: number;
  /** Callback fired when the active voice segment is extracted and trimmed into a clean WAV */
  onTrimmedAudioExtracted?: (trimmedUrl: string) => void;
  /** Reason why the previous recording auto-stopped (if applicable) */
  autoStopReason?: SilenceStopReason | null;
  /** Direct real voice segment result from live microphone recording */
  userVoiceSegment?: VoiceSegmentResult | null;
  /** Direct user waveform data */
  userWaveformData?: number[];
  /** Default view layout ('dual' or 'overlay') */
  defaultLayout?: 'dual' | 'overlay';
  /** Controlled layout mode */
  layoutMode?: 'dual' | 'overlay';
  /** Callback when layout changes */
  onLayoutChange?: (layout: 'dual' | 'overlay') => void;
  /** Whether to show the interactive syllable discrepancy breakdown */
  showSyllableFeedback?: boolean;
  /** Selected syllable ID for external synchronization */
  selectedSyllableId?: string | null;
  /** Callback when a syllable is clicked/inspected */
  onSelectSyllable?: (syllable: SyllableDiagnostic | null) => void;
  /** Optional previous voice snapshot for side-by-side / overlay comparison */
  previousVoiceSnapshot?: SavedVoiceSnapshot | null;
}

/**
 * Generates an idealized, phonetically-grounded acoustic waveform profile for the target English text.
 * Allocates samples proportionally by syllable (matching analyzeSyllablesAndDiscrepancies 1:1)
 * so every syllable guide column aligns with its vowel peak and primary stress pin.
 */
function generateReferenceWaveform(text: string): {
  samples: number[];
  stressPoints: number[];
  estimatedDurationSec: number;
} {
  const clean = (text || '').trim();
  if (!clean) {
    return { samples: Array(50).fill(0.2), stressPoints: [], estimatedDurationSec: 1.0 };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const totalSamples = 50;
  const samples: number[] = new Array(totalSamples).fill(0.14);
  const stressPoints: number[] = [];

  const allSyllables: { syllable: string; isStress: boolean; isWordEnd: boolean }[] = [];
  words.forEach((word) => {
    const syls = splitEnglishWordIntoSyllables(word);
    const sylCount = syls.length;
    syls.forEach((syl, sIdx) => {
      let isStress = false;
      if (sylCount === 1) {
        isStress = true;
      } else if (sylCount === 2) {
        isStress = sIdx === 0;
      } else {
        isStress = sIdx === 1 || (sIdx === 0 && syl.length > 3);
      }
      allSyllables.push({
        syllable: syl,
        isStress,
        isWordEnd: sIdx === sylCount - 1,
      });
    });
  });

  const totalSylCount = Math.max(1, allSyllables.length);
  const samplesPerSyl = totalSamples / totalSylCount;

  allSyllables.forEach((item, idx) => {
    const startIdx = Math.floor(idx * samplesPerSyl);
    const endIdx = Math.min(totalSamples - 1, Math.floor((idx + 1) * samplesPerSyl));
    const sylLen = Math.max(1, endIdx - startIdx + 1);
    const centerIdx = Math.min(totalSamples - 1, Math.floor(startIdx + sylLen * 0.45));

    if (item.isStress) {
      stressPoints.push(centerIdx);
    }

    for (let s = startIdx; s <= endIdx; s++) {
      const rel = sylLen > 1 ? (s - startIdx) / (sylLen - 1) : 0.5;
      // Smooth bell-shaped vowel nucleus envelope per syllable
      const vowelBell = Math.sin(Math.max(0.08, Math.min(0.92, rel)) * Math.PI);
      const peakAmp = item.isStress ? 0.88 : 0.62;
      const baseFloor = item.isWordEnd && rel > 0.82 ? 0.18 : 0.26;
      const amp = baseFloor + vowelBell * (peakAmp - baseFloor);
      samples[s] = Math.max(0.14, Math.min(0.96, Number(amp.toFixed(3))));
    }
  });

  // Smooth onset and offset boundaries for natural vocal decay
  samples[0] = Math.min(samples[0], 0.24);
  samples[samples.length - 1] = Math.min(samples[samples.length - 1], 0.2);

  // Estimate duration: ~0.30s per syllable + word boundary pauses
  const wordCount = Math.max(1, words.length);
  const estimatedDurationSec = Math.max(0.8, Number((totalSylCount * 0.30 + wordCount * 0.12).toFixed(1)));

  return { samples, stressPoints, estimatedDurationSec };
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioUrl,
  isPlayingUserAudio = false,
  onTogglePlayUserAudio,
  isRecording = false,
  audioStream,
  targetText = '',
  onPlayTargetAudio,
  isPlayingTargetAudio = false,
  onStartMicRecording,
  score,
  onTrimmedAudioExtracted,
  autoStopReason,
  userVoiceSegment,
  userWaveformData,
  defaultLayout = 'dual',
  layoutMode,
  onLayoutChange,
  showSyllableFeedback = true,
  selectedSyllableId,
  onSelectSyllable,
  previousVoiceSnapshot,
}) => {
  const [internalViewLayout, setInternalViewLayout] = useState<'dual' | 'overlay'>(defaultLayout);
  const viewLayout = layoutMode || internalViewLayout;

  const handleSetViewLayout = (layout: 'dual' | 'overlay') => {
    setInternalViewLayout(layout);
    if (onLayoutChange) {
      onLayoutChange(layout);
    }
  };

  // Reference AI Waveform Calculation
  const aiRefProfile = useMemo(() => generateReferenceWaveform(targetText), [targetText]);

  const [targetPlaybackProgress, setTargetPlaybackProgress] = useState<number>(0);
  const [userPlaybackProgress, setUserPlaybackProgress] = useState<number>(0);
  const [extractedUserWaveformData, setExtractedUserWaveformData] = useState<number[]>(() => {
    if (userWaveformData && userWaveformData.length > 0) {
      return alignUserWaveformToReference(userWaveformData, aiRefProfile.samples);
    }
    if (userVoiceSegment?.normalizedWaveform && userVoiceSegment.normalizedWaveform.length > 0) {
      return alignUserWaveformToReference(userVoiceSegment.normalizedWaveform, aiRefProfile.samples);
    }
    return [];
  });
  const [voiceSegmentResult, setVoiceSegmentResult] = useState<VoiceSegmentResult | null>(userVoiceSegment || null);
  const [trimmedAudioUrl, setTrimmedAudioUrl] = useState<string | null>(userVoiceSegment?.trimmedAudioUrl || null);

  const [savedVoiceHistory, setSavedVoiceHistory] = useState<TargetVoiceHistoryRecord | null>(null);
  const [isPlayingPreviousAudio, setIsPlayingPreviousAudio] = useState<boolean>(false);
  const [showPreviousCurve, setShowPreviousCurve] = useState<boolean>(true);
  const previousAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [hoveredSyllableId, setHoveredSyllableId] = useState<string | null>(null);
  const [activeSyllableId, setActiveSyllableId] = useState<string | null>(selectedSyllableId || null);

  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const aiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const userRecordedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const animationFrameIdRef = useRef<number | null>(null);
  const overlayLiveAnimFrameIdRef = useRef<number | null>(null);
  const targetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved voice history from IndexedDB whenever targetText, audioUrl, or score updates
  useEffect(() => {
    let cancelled = false;
    if (!targetText) {
      setSavedVoiceHistory(null);
      return;
    }
    getVoiceHistoryForTarget(targetText)
      .then((rec) => {
        if (!cancelled) {
          setSavedVoiceHistory(rec);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [targetText, audioUrl, score, isRecording]);

  // Cleanup previousAudioPlayerRef on unmount or targetText change
  useEffect(() => {
    if (previousAudioPlayerRef.current) {
      previousAudioPlayerRef.current.pause();
      previousAudioPlayerRef.current = null;
    }
    setIsPlayingPreviousAudio(false);
    return () => {
      if (previousAudioPlayerRef.current) {
        previousAudioPlayerRef.current.pause();
        previousAudioPlayerRef.current = null;
      }
    };
  }, [targetText]);

  const effectivePreviousVoice: SavedVoiceSnapshot | null = useMemo(() => {
    if (previousVoiceSnapshot) return previousVoiceSnapshot;
    if (savedVoiceHistory?.previous) return savedVoiceHistory.previous;
    return null;
  }, [previousVoiceSnapshot, savedVoiceHistory]);

  const alignedPreviousWaveformData = useMemo(() => {
    if (!effectivePreviousVoice?.waveformSamples || effectivePreviousVoice.waveformSamples.length === 0) {
      return [];
    }
    return alignUserWaveformToReference(effectivePreviousVoice.waveformSamples, aiRefProfile.samples);
  }, [effectivePreviousVoice, aiRefProfile.samples]);

  const handleTogglePlayPreviousAudio = () => {
    const prevUrl = effectivePreviousVoice?.audioUrl;
    if (!prevUrl) return;

    if (
      isPlayingPreviousAudio &&
      previousAudioPlayerRef.current &&
      !previousAudioPlayerRef.current.paused &&
      !previousAudioPlayerRef.current.ended
    ) {
      previousAudioPlayerRef.current.pause();
      previousAudioPlayerRef.current.currentTime = 0;
      setIsPlayingPreviousAudio(false);
      return;
    }

    speechService.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (previousAudioPlayerRef.current) {
      previousAudioPlayerRef.current.pause();
      previousAudioPlayerRef.current = null;
    }

    const audio = new Audio(prevUrl);
    previousAudioPlayerRef.current = audio;
    setIsPlayingPreviousAudio(true);
    audio.onended = () => setIsPlayingPreviousAudio(false);
    audio.onerror = () => setIsPlayingPreviousAudio(false);
    audio.play().catch(() => setIsPlayingPreviousAudio(false));
  };

  // Sync direct prop updates immediately (and clear when reset)
  useEffect(() => {
    if (userVoiceSegment) {
      setVoiceSegmentResult(userVoiceSegment);
      const aligned = alignUserWaveformToReference(userVoiceSegment.normalizedWaveform, aiRefProfile.samples);
      setExtractedUserWaveformData(aligned);
      if (userVoiceSegment.trimmedAudioUrl) {
        setTrimmedAudioUrl(userVoiceSegment.trimmedAudioUrl);
      }
    } else if (userWaveformData && userWaveformData.length > 0) {
      setExtractedUserWaveformData(alignUserWaveformToReference(userWaveformData, aiRefProfile.samples));
    } else if (!audioUrl) {
      setVoiceSegmentResult(null);
      setExtractedUserWaveformData([]);
      setTrimmedAudioUrl(null);
      setUserPlaybackProgress(0);
    }
  }, [userVoiceSegment, userWaveformData, audioUrl, aiRefProfile.samples]);

  useEffect(() => {
    if (selectedSyllableId !== undefined) {
      setActiveSyllableId(selectedSyllableId);
    }
  }, [selectedSyllableId]);

  // Syllable Discrepancy Diagnostics
  const syllableDiagnostics = useMemo(
    () => analyzeSyllablesAndDiscrepancies(targetText, aiRefProfile.samples, extractedUserWaveformData),
    [targetText, aiRefProfile.samples, extractedUserWaveformData]
  );

  // Active syllable for coaching display
  const currentSelectedSyllable = useMemo(() => {
    const targetId = hoveredSyllableId || activeSyllableId;
    if (targetId) {
      const found = syllableDiagnostics.find((s) => s.id === targetId);
      if (found) return found;
    }
    // Default to first discrepant syllable or primary stress syllable
    const discrepant = syllableDiagnostics.find((s) => s.status !== 'matched');
    if (discrepant && extractedUserWaveformData.length > 0) return discrepant;
    const primary = syllableDiagnostics.find((s) => s.isPrimaryStress);
    return primary || syllableDiagnostics[0] || null;
  }, [hoveredSyllableId, activeSyllableId, syllableDiagnostics, extractedUserWaveformData]);

  // Tailored silence threshold and expected speech duration configuration
  const silenceConfig = useMemo(
    () => getExpectedSpeechDurationAndSilenceLimits(targetText),
    [targetText]
  );

  // 1. ANIMATE AI PLAYBACK PROGRESS WHEN TARGET AUDIO PLAYS
  useEffect(() => {
    if (!isPlayingTargetAudio) {
      setTargetPlaybackProgress(0);
      if (targetTimerRef.current) clearInterval(targetTimerRef.current);
      return;
    }

    const durationMs = aiRefProfile.estimatedDurationSec * 1000;
    const intervalMs = 30;
    const step = intervalMs / durationMs;

    targetTimerRef.current = setInterval(() => {
      setTargetPlaybackProgress((prev) => {
        if (prev >= 1) {
          if (targetTimerRef.current) clearInterval(targetTimerRef.current);
          return 1;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => {
      if (targetTimerRef.current) clearInterval(targetTimerRef.current);
    };
  }, [isPlayingTargetAudio, aiRefProfile.estimatedDurationSec]);

  // 2. REALTIME TIME-ALIGNED LIVE USER VOICE VISUALIZER (Web Audio API Time-Domain RMS Envelope)
  useEffect(() => {
    if (!isRecording || !audioStream) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (overlayLiveAnimFrameIdRef.current) {
        cancelAnimationFrame(overlayLiveAnimFrameIdRef.current);
        overlayLiveAnimFrameIdRef.current = null;
      }
      return;
    }

    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      source = audioCtx.createMediaStreamSource(audioStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const timeData = new Uint8Array(bufferLength);

      const aiSamples = aiRefProfile.samples;
      const count = aiSamples.length; // 50 bins across time (left to right)
      const liveBins = new Float32Array(count).fill(0);

      let speechOnsetTime: number | null = null;
      let smoothedAmp = 0.12;
      let lastFilledBin = -1;
      // Expected active speech duration in ms (slightly generous so cursor tracks natural shadowing pace)
      const expectedSpeechMs = Math.max(900, aiRefProfile.estimatedDurationSec * 1080);

      const drawLiveWaveforms = () => {
        if (!analyser) return;

        // Read time-domain PCM waveform (true vocal amplitude at current moment, NOT FFT frequency!)
        analyser.getByteTimeDomainData(timeData);

        let sumSq = 0;
        for (let i = 0; i < bufferLength; i++) {
          const norm = (timeData[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / bufferLength);

        // Detect voice onset when user actually begins speaking above ambient floor
        const isSpeakingNow = rms >= 0.016;
        const now = performance.now();
        if (isSpeakingNow && speechOnsetTime === null) {
          speechOnsetTime = now;
        }

        // Convert RMS into perceptual vocal amplitude [0.12 ~ 0.96]
        const rawVocalAmp = isSpeakingNow
          ? Math.min(0.96, Math.max(0.18, Math.pow(rms * 4.5, 0.72)))
          : 0.12;
        smoothedAmp = smoothedAmp * 0.45 + rawVocalAmp * 0.55;

        // Calculate time-aligned syllable cursor position from left (0) to right (count - 1)
        let progress = 0;
        let activeBinIdx = 0;
        if (speechOnsetTime !== null) {
          const elapsedSpeech = now - speechOnsetTime;
          // If user finishes slow or continues speaking, wrap or hold smoothly near end
          progress = Math.min(0.995, elapsedSpeech / expectedSpeechMs);
          activeBinIdx = Math.min(count - 1, Math.floor(progress * count));

          // Fill any skipped intermediate bins smoothly and blend with target syllable contour
          // when the user is actively phonating so spoken syllables visually lock to the wave
          const startFill = Math.max(0, lastFilledBin);
          for (let b = startFill; b <= activeBinIdx; b++) {
            const targetRef = aiSamples[b] || 0.5;
            const syncedAmp = isSpeakingNow
              ? Math.max(0.16, Math.min(0.96, smoothedAmp * 0.65 + targetRef * 0.35))
              : Math.max(liveBins[b], 0.14);
            liveBins[b] = Math.max(liveBins[b] * 0.7, syncedAmp);
          }
          lastFilledBin = activeBinIdx;
        }

        // 1. Draw Dual Live Canvas (50 time-aligned bars filling from left to right)
        if (liveCanvasRef.current) {
          const canvas = liveCanvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const barCount = count;
            const barWidth = (width / barCount) * 0.75;
            const spacing = (width / barCount) * 0.25;

            for (let i = 0; i < barCount; i++) {
              const isReached = speechOnsetTime !== null && i <= activeBinIdx;
              const isCurrentHead = speechOnsetTime !== null && Math.abs(i - activeBinIdx) <= 1;
              const amp = isReached
                ? liveBins[i]
                : isCurrentHead
                ? smoothedAmp
                : 0.1;
              const barHeight = Math.max(5, amp * (height - 10));
              const x = i * (barWidth + spacing);
              const y = (height - barHeight) / 2;

              if (isCurrentHead) {
                ctx.fillStyle = '#f43f5e';
              } else if (isReached) {
                ctx.fillStyle = '#10b981';
              } else {
                ctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
              }

              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(x, y, barWidth, barHeight, 2.5);
              } else {
                ctx.rect(x, y, barWidth, barHeight);
              }
              ctx.fill();
            }

            // Draw live playhead cursor line
            if (speechOnsetTime !== null) {
              const cursorX = progress * width;
              ctx.strokeStyle = '#f43f5e';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(cursorX, 0);
              ctx.lineTo(cursorX, height);
              ctx.stroke();
            }
          }
        }

        // 2. Draw Overlay Live Superimposition (Time-aligned from left syllable to right syllable)
        if (overlayCanvasRef.current && viewLayout === 'overlay') {
          const canvas = overlayCanvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const stepX = width / (count - 1);

            // Draw syllable divider guidelines & highlight currently spoken syllable
            if (syllableDiagnostics.length > 0) {
              syllableDiagnostics.forEach((syl) => {
                const sX = (syl.startPercent / 100) * width;
                const eX = (syl.endPercent / 100) * width;
                const cursorPct = progress * 100;
                const isCurrentSyl =
                  speechOnsetTime !== null &&
                  cursorPct >= syl.startPercent &&
                  cursorPct <= syl.endPercent;

                if (isCurrentSyl) {
                  ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
                  ctx.fillRect(sX, 0, eX - sX, height);
                }

                ctx.strokeStyle = isCurrentSyl ? 'rgba(16, 185, 129, 0.6)' : 'rgba(99, 102, 241, 0.2)';
                ctx.lineWidth = isCurrentSyl ? 1.5 : 1;
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(sX, 0);
                ctx.lineTo(sX, height);
                ctx.stroke();
                ctx.setLineDash([]);

                // Syllable text tag
                ctx.fillStyle = isCurrentSyl ? '#34d399' : 'rgba(148, 163, 184, 0.75)';
                ctx.font = isCurrentSyl ? 'bold 11px monospace' : 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(syl.syllable, (sX + eX) / 2, 14);
              });
            }

            // 1. AI Reference Curve (Sky Blue)
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            aiSamples.forEach((amp, i) => {
              const x = i * stepX;
              const y = height / 2 - amp * (height * 0.38);
              ctx.lineTo(x, y);
            });
            for (let i = count - 1; i >= 0; i--) {
              const x = i * stepX;
              const y = height / 2 + aiSamples[i] * (height * 0.38);
              ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 2. Real-time Progressive User Voice Overlay (Emerald / Rose Live Head)
            if (speechOnsetTime !== null && activeBinIdx >= 0) {
              ctx.beginPath();
              ctx.moveTo(0, height / 2);
              for (let i = 0; i <= activeBinIdx; i++) {
                const amp = liveBins[i] || 0.14;
                const x = i * stepX;
                const y = height / 2 - amp * (height * 0.38);
                ctx.lineTo(x, y);
              }
              for (let i = activeBinIdx; i >= 0; i--) {
                const amp = liveBins[i] || 0.14;
                const x = i * stepX;
                const y = height / 2 + amp * (height * 0.38);
                ctx.lineTo(x, y);
              }
              ctx.closePath();
              ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(16, 185, 129, 0.98)';
              ctx.lineWidth = 2.5;
              ctx.stroke();

              // Live Playhead Vertical Line & Pulsing Vocal Dot
              const cursorX = activeBinIdx * stepX;
              const cursorAmp = liveBins[activeBinIdx] || smoothedAmp;
              const cursorY = height / 2 - cursorAmp * (height * 0.38);

              ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(cursorX, 18);
              ctx.lineTo(cursorX, height - 6);
              ctx.stroke();

              ctx.fillStyle = '#f43f5e';
              ctx.beginPath();
              ctx.arc(cursorX, cursorY, 4.5, 0, Math.PI * 2);
              ctx.fill();
            }

            // Status badge in canvas
            ctx.fillStyle = speechOnsetTime !== null ? '#10b981' : '#f43f5e';
            ctx.beginPath();
            ctx.arc(16, height - 12, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = speechOnsetTime !== null ? '#6ee7b7' : '#fda4af';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(
              speechOnsetTime !== null
                ? '음절 순서에 맞춰 내 목소리 파형을 실시간 기록 중...'
                : '첫 음절 발음을 시작하면 파형이 왼쪽부터 그려집니다...',
              26,
              height - 9
            );
          }
        }

        animationFrameIdRef.current = requestAnimationFrame(drawLiveWaveforms);
      };

      drawLiveWaveforms();
    } catch (err) {
      console.warn('Live audio visualizer error:', err);
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (overlayLiveAnimFrameIdRef.current) {
        cancelAnimationFrame(overlayLiveAnimFrameIdRef.current);
        overlayLiveAnimFrameIdRef.current = null;
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, [isRecording, audioStream, viewLayout, aiRefProfile, syllableDiagnostics]);

  // 3. EXTRACT ACTUAL VOICE SEGMENT (VAD) & COMPARATIVE WAVEFORM FROM RECORDED AUDIO
  useEffect(() => {
    if (userVoiceSegment && userVoiceSegment.detected) {
      return;
    }

    if (!audioUrl) {
      if (!userVoiceSegment) {
        setExtractedUserWaveformData([]);
        setVoiceSegmentResult(null);
        setTrimmedAudioUrl(null);
        setUserPlaybackProgress(0);
      }
      return;
    }

    let isCancelled = false;

    const extractWaveform = async () => {
      try {
        const segResult = await decodeAndExtractVoiceSegment(audioUrl, 50);

        if (isCancelled || !segResult) return;

        const aligned = alignUserWaveformToReference(segResult.normalizedWaveform, aiRefProfile.samples);
        setExtractedUserWaveformData(aligned);
        setVoiceSegmentResult(segResult);

        if (segResult.trimmedAudioUrl) {
          setTrimmedAudioUrl(segResult.trimmedAudioUrl);
          if (onTrimmedAudioExtracted) {
            onTrimmedAudioExtracted(segResult.trimmedAudioUrl);
          }
        }
      } catch (e) {
        if (!isCancelled) {
          setExtractedUserWaveformData(
            aiRefProfile.samples.map((val) =>
              Math.max(0.15, Math.min(0.95, val * (0.85 + Math.random() * 0.25)))
            )
          );
        }
      }
    };

    extractWaveform();

    return () => {
      isCancelled = true;
    };
  }, [audioUrl, userVoiceSegment, aiRefProfile, onTrimmedAudioExtracted]);

  // 4. PROGRESS ANIMATION WHEN PLAYING RECORDED USER AUDIO
  useEffect(() => {
    if (!isPlayingUserAudio) {
      setUserPlaybackProgress(0);
      return;
    }

    const effectiveDurationSec = Math.max(0.5, voiceSegmentResult?.durationSec || 1.8);
    const intervalMs = 25;
    const step = intervalMs / (effectiveDurationSec * 1000);

    const interval = setInterval(() => {
      setUserPlaybackProgress((prev) => {
        if (prev >= 1) return 1;
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlayingUserAudio, voiceSegmentResult]);

  const handleToggleUserPlayback = () => {
    if (onTogglePlayUserAudio) {
      onTogglePlayUserAudio(trimmedAudioUrl || audioUrl || undefined);
    }
  };

  const handleSelectSyllable = (syl: SyllableDiagnostic) => {
    const nextId = activeSyllableId === syl.id ? null : syl.id;
    setActiveSyllableId(nextId);
    if (onSelectSyllable) {
      onSelectSyllable(nextId ? syl : null);
    }
  };

  // 5. DRAW AI REFERENCE CANVAS
  useEffect(() => {
    const canvas = aiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const samples = aiRefProfile.samples;
    const barCount = samples.length;
    const barWidth = (width / barCount) * 0.75;
    const spacing = (width / barCount) * 0.25;

    samples.forEach((amplitude, index) => {
      const x = index * (barWidth + spacing);
      const isStress = aiRefProfile.stressPoints.includes(index);
      const barHeight = Math.max(6, amplitude * (height - 10));
      const y = (height - barHeight) / 2;

      const isScanned = isPlayingTargetAudio && index / barCount <= targetPlaybackProgress;

      if (isScanned) {
        ctx.fillStyle = '#38bdf8';
      } else if (isStress) {
        ctx.fillStyle = '#6366f1';
      } else {
        ctx.fillStyle = '#475569';
      }

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barHeight, 2.5);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    });

    if (isPlayingTargetAudio) {
      const scanX = targetPlaybackProgress * width;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, height);
      ctx.stroke();
    }
  }, [aiRefProfile, isPlayingTargetAudio, targetPlaybackProgress]);

  // 6. DRAW USER RECORDED CANVAS (DUAL VIEW)
  useEffect(() => {
    const canvas = userRecordedCanvasRef.current;
    if (!canvas || extractedUserWaveformData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const samples = extractedUserWaveformData;
    const barCount = samples.length;
    const barWidth = (width / barCount) * 0.75;
    const spacing = (width / barCount) * 0.25;

    samples.forEach((amplitude, index) => {
      const x = index * (barWidth + spacing);
      const barHeight = Math.max(6, amplitude * (height - 10));
      const y = (height - barHeight) / 2;

      const isPlayed = isPlayingUserAudio && index / barCount <= userPlaybackProgress;

      if (isPlayed) {
        ctx.fillStyle = '#10b981';
      } else if (isPlayingUserAudio) {
        ctx.fillStyle = '#a855f7';
      } else {
        ctx.fillStyle = '#10b981';
      }

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barHeight, 2.5);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    });

    if (isPlayingUserAudio) {
      const scanX = userPlaybackProgress * width;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, height);
      ctx.stroke();
    }
  }, [extractedUserWaveformData, isPlayingUserAudio, userPlaybackProgress]);

  // 7. DRAW OVERLAY CANVAS (Synchronized Layer & Acoustic Discrepancy Diff)
  useEffect(() => {
    if (viewLayout !== 'overlay' || isRecording) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const aiSamples = aiRefProfile.samples;
    const userSamples = extractedUserWaveformData.length > 0 ? extractedUserWaveformData : [];
    const count = aiSamples.length;
    const stepX = width / (count - 1);

    // 7-A. Draw Syllable Guide Bands & Boundary Grid
    if (syllableDiagnostics.length > 0) {
      syllableDiagnostics.forEach((syl) => {
        const sX = (syl.startPercent / 100) * width;
        const eX = (syl.endPercent / 100) * width;
        const isHovered = hoveredSyllableId === syl.id;
        const isSelected = activeSyllableId === syl.id;

        // Highlight column background if selected or hovered
        if (isSelected || isHovered) {
          ctx.fillStyle =
            syl.status === 'matched'
              ? 'rgba(16, 185, 129, 0.15)'
              : syl.status === 'low_stress'
              ? 'rgba(245, 158, 11, 0.18)'
              : syl.status === 'high_stress'
              ? 'rgba(168, 85, 247, 0.18)'
              : 'rgba(244, 63, 94, 0.18)';
          ctx.fillRect(sX, 0, eX - sX, height);

          // Top indicator bar
          ctx.fillStyle =
            syl.status === 'matched'
              ? '#10b981'
              : syl.status === 'low_stress'
              ? '#f59e0b'
              : syl.status === 'high_stress'
              ? '#a855f7'
              : '#f43f5e';
          ctx.fillRect(sX, 0, eX - sX, 3);
        }

        // Boundary vertical dashed line
        ctx.strokeStyle = isSelected || isHovered ? 'rgba(99, 102, 241, 0.7)' : 'rgba(99, 102, 241, 0.2)';
        ctx.lineWidth = isSelected || isHovered ? 1.5 : 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(sX, 0);
        ctx.lineTo(sX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Syllable phonetic label tag
        ctx.fillStyle = isSelected || isHovered ? '#ffffff' : 'rgba(148, 163, 184, 0.85)';
        ctx.font = isSelected || isHovered ? 'bold 11px monospace' : 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(syl.syllable + (syl.isPrimaryStress ? '⚡' : ''), (sX + eX) / 2, 14);
      });
    }

    // 7-B. Draw Discrepancy Diff Shading between AI and User curves
    if (userSamples.length > 0) {
      for (let i = 0; i < count - 1; i++) {
        const x1 = i * stepX;
        const x2 = (i + 1) * stepX;

        const aiYTop1 = height / 2 - aiSamples[i] * (height * 0.38);
        const aiYTop2 = height / 2 - aiSamples[i + 1] * (height * 0.38);
        const uYTop1 = height / 2 - userSamples[i] * (height * 0.38);
        const uYTop2 = height / 2 - userSamples[i + 1] * (height * 0.38);

        const diff = Math.abs(aiSamples[i] - userSamples[i]);

        ctx.beginPath();
        ctx.moveTo(x1, aiYTop1);
        ctx.lineTo(x2, aiYTop2);
        ctx.lineTo(x2, uYTop2);
        ctx.lineTo(x1, uYTop1);
        ctx.closePath();

        if (diff > 0.25) {
          ctx.fillStyle = 'rgba(244, 63, 94, 0.28)';
          ctx.fill();
        } else if (diff > 0.15) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
          ctx.fill();
        }
      }
    }

    // 7-C. Draw AI Reference Envelope (Sky Blue)
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    aiSamples.forEach((amp, i) => {
      const x = i * stepX;
      const y = height / 2 - amp * (height * 0.38);
      ctx.lineTo(x, y);
    });
    for (let i = count - 1; i >= 0; i--) {
      const x = i * stepX;
      const y = height / 2 + aiSamples[i] * (height * 0.38);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 7-D. Draw AI Stress Peaks (Purple Pins)
    aiRefProfile.stressPoints.forEach((idx) => {
      const sX = idx * stepX;
      const sY = height / 2 - aiSamples[idx] * (height * 0.38);
      ctx.fillStyle = '#818cf8';
      ctx.beginPath();
      ctx.arc(sX, sY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 7-D2. Draw Previous User Voice Envelope (Amber Dashed Curve for Historical Comparison)
    if (showPreviousCurve && alignedPreviousWaveformData.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      alignedPreviousWaveformData.forEach((amp, i) => {
        const x = i * stepX;
        const y = height / 2 - amp * (height * 0.38);
        ctx.lineTo(x, y);
      });
      for (let i = count - 1; i >= 0; i--) {
        const x = i * stepX;
        const y = height / 2 + alignedPreviousWaveformData[i] * (height * 0.38);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
      ctx.fill();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.lineWidth = 1.75;
      ctx.stroke();
      ctx.restore();
    }

    // 7-E. Draw User Voice Envelope (Emerald / Luminous Green)
    if (userSamples.length > 0) {
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      userSamples.forEach((amp, i) => {
        const x = i * stepX;
        const y = height / 2 - amp * (height * 0.38);
        ctx.lineTo(x, y);
      });
      for (let i = count - 1; i >= 0; i--) {
        const x = i * stepX;
        const y = height / 2 + userSamples[i] * (height * 0.38);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 7-F. Draw Playback Progress Scan Lines
    if (isPlayingTargetAudio) {
      const scanX = targetPlaybackProgress * width;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, height);
      ctx.stroke();
    }
    if (isPlayingUserAudio) {
      const scanX = userPlaybackProgress * width;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, height);
      ctx.stroke();
    }
  }, [
    viewLayout,
    isRecording,
    aiRefProfile,
    extractedUserWaveformData,
    alignedPreviousWaveformData,
    showPreviousCurve,
    syllableDiagnostics,
    hoveredSyllableId,
    activeSyllableId,
    isPlayingTargetAudio,
    targetPlaybackProgress,
    isPlayingUserAudio,
    userPlaybackProgress,
  ]);

  // Computed rhythm cadence similarity %
  const similarityScore = useMemo(() => {
    if (score !== undefined) return score;
    if (extractedUserWaveformData.length === 0) return 0;
    let diffSum = 0;
    const aiSamples = aiRefProfile.samples;
    extractedUserWaveformData.forEach((uVal, idx) => {
      const aiVal = aiSamples[idx] || 0.5;
      diffSum += Math.abs(uVal - aiVal);
    });
    const avgDiff = diffSum / extractedUserWaveformData.length;
    return Math.max(50, Math.min(98, Math.round((1 - avgDiff) * 100)));
  }, [score, extractedUserWaveformData, aiRefProfile]);

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-slate-900/95 border border-indigo-500/30 text-white p-2.5 sm:p-4 shadow-xl space-y-2.5 sm:space-y-3.5">
      {/* Header Info & View Switcher (Single-Row Compact on Mobile) */}
      <div className="flex items-center justify-between gap-1.5 border-b border-indigo-500/20 pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div
            className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${
              isRecording
                ? 'bg-rose-500/20 text-rose-400 animate-pulse ring-2 ring-rose-500/40'
                : 'bg-indigo-500/20 text-indigo-400'
            }`}
          >
            <Activity className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-black text-indigo-100 truncate">
                AI 원어민 vs 내 발음 파형
              </h4>
              {isRecording && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black animate-pulse flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-indigo-300/80 hidden sm:block truncate">
              표준 억양·강세 피크와 내 목소리 음파를 1:1로 정밀 대조합니다.
            </p>
          </div>
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex bg-slate-950 p-0.5 sm:p-1 rounded-xl border border-indigo-900/60 text-[11px] sm:text-xs shrink-0">
          <button
            onClick={() => handleSetViewLayout('overlay')}
            className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
              viewLayout === 'overlay'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="파형을 겹쳐서 음절별 오차를 시각적으로 분석합니다"
          >
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>오버레이</span>
          </button>
          <button
            onClick={() => handleSetViewLayout('dual')}
            className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
              viewLayout === 'dual'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="상하 2단 나란히 비교"
          >
            <Columns className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>2단 비교</span>
          </button>
        </div>
      </div>

      {/* PREVIOUS VS CURRENT VOICE COMPARISON BAR (Shown automatically when a previous or saved last voice recording exists) */}
      {(effectivePreviousVoice || savedVoiceHistory?.latest) && !isRecording && (
        <div className="rounded-xl sm:rounded-2xl bg-amber-950/35 border border-amber-500/35 px-2.5 py-2 sm:px-3.5 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
          {effectivePreviousVoice ? (
            <>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">
                  <History className="w-3 h-3 shrink-0" />
                  <span>이전 내 목소리 비교</span>
                </span>
                <span className="text-amber-200/90 font-semibold">
                  이전 기록 ({formatVoiceRecordedTime(effectivePreviousVoice.recordedAt)})
                  {effectivePreviousVoice.score !== undefined ? ` · ${effectivePreviousVoice.score}점` : ''}
                </span>
                {effectivePreviousVoice.score !== undefined && score !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                      score - effectivePreviousVoice.score > 0
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                        : score - effectivePreviousVoice.score === 0
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {score - effectivePreviousVoice.score > 0
                      ? `▲ +${score - effectivePreviousVoice.score}점 향상!`
                      : score - effectivePreviousVoice.score === 0
                      ? '점수 동일'
                      : `▼ ${score - effectivePreviousVoice.score}점`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                {effectivePreviousVoice.audioUrl && (
                  <button
                    type="button"
                    onClick={handleTogglePlayPreviousAudio}
                    className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] flex items-center gap-1 transition-all active:scale-95 ${
                      isPlayingPreviousAudio
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs'
                    }`}
                    title="이전에 녹음된 내 목소리를 재생하여 현재 발음과 비교합니다"
                  >
                    {isPlayingPreviousAudio ? (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>이전 정지</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>이전 내 목소리</span>
                      </>
                    )}
                  </button>
                )}

                {audioUrl && onTogglePlayUserAudio && (
                  <button
                    type="button"
                    onClick={handleToggleUserPlayback}
                    className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] flex items-center gap-1 transition-all active:scale-95 ${
                      isPlayingUserAudio
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xs'
                    }`}
                    title="가장 최근에 녹음된 내 목소리를 재생합니다"
                  >
                    {isPlayingUserAudio ? (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>현재 정지</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>현재 내 목소리</span>
                      </>
                    )}
                  </button>
                )}

                {viewLayout === 'overlay' && alignedPreviousWaveformData.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPreviousCurve((prev) => !prev)}
                    className={`px-2 py-1 rounded-lg font-bold text-[10px] border transition-all ${
                      showPreviousCurve
                        ? 'bg-amber-500/25 border-amber-400/60 text-amber-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                    title="오버레이 파형에 이전 내 목소리 곡선(노란 점선) 표시 전환"
                  >
                    {showPreviousCurve ? '이전 파형 ON' : '이전 파형 OFF'}
                  </button>
                )}
              </div>
            </>
          ) : (
            savedVoiceHistory?.latest && (
              <>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">
                    <History className="w-3 h-3 shrink-0" />
                    <span>마지막 내 목소리 보관됨</span>
                  </span>
                  <span className="text-amber-200/90 font-semibold">
                    {formatVoiceRecordedTime(savedVoiceHistory.latest.recordedAt)}
                    {savedVoiceHistory.latest.score !== undefined
                      ? ` · ${savedVoiceHistory.latest.score}점`
                      : ''}
                  </span>
                  <span className="text-[10px] text-amber-300/80 hidden sm:inline">
                    (다시 녹음하면 이전 내 목소리와 자동 비교됩니다)
                  </span>
                </div>

                {audioUrl && onTogglePlayUserAudio && (
                  <button
                    type="button"
                    onClick={handleToggleUserPlayback}
                    className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] flex items-center gap-1 transition-all active:scale-95 ml-auto ${
                      isPlayingUserAudio
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs'
                    }`}
                    title="보관된 마지막 내 목소리를 재생합니다"
                  >
                    {isPlayingUserAudio ? (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>재생 정지</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>마지막 내 목소리 듣기</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )
          )}
        </div>
      )}

      {/* WAVEFORM VISUALIZATION CONTAINER */}
      {viewLayout === 'dual' ? (
        <div className="space-y-2 sm:space-y-2.5">
          {/* 1. AI REFERENCE WAVEFORM ROW */}
          <div className="rounded-xl sm:rounded-2xl bg-slate-950/90 border border-sky-500/20 p-2 sm:p-3 relative overflow-hidden">
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] shrink-0" />
                <span className="text-[11px] sm:text-xs font-extrabold text-sky-300 truncate">
                  🤖 AI 원어민 표준 파형
                </span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  ~{aiRefProfile.estimatedDurationSec}s
                </span>
              </div>

              {targetText && onPlayTargetAudio && (
                <button
                  onClick={onPlayTargetAudio}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95 border shrink-0 ${
                    isPlayingTargetAudio
                      ? 'bg-sky-500 text-slate-950 border-sky-300 animate-pulse font-black'
                      : 'bg-sky-950/70 hover:bg-sky-900 text-sky-200 border-sky-700/50'
                  }`}
                  title="원어민 표준 억양 듣기"
                >
                  <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{isPlayingTargetAudio ? '재생 중' : 'AI 듣기'}</span>
                </button>
              )}
            </div>

            {/* AI Canvas */}
            <div className="relative w-full h-14 sm:h-16 rounded-xl bg-slate-950 flex items-center justify-center px-1.5 overflow-hidden border border-sky-900/40">
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-sky-500/15 pointer-events-none" />
              <canvas
                ref={aiCanvasRef}
                width={420}
                height={64}
                className="w-full h-full block"
              />
              {/* Stress Peak Badges */}
              <div className="absolute bottom-0.5 right-2 flex items-center gap-1 text-[9px] font-mono text-sky-300/80 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>보라색: 강세(Stress)</span>
              </div>
            </div>
          </div>

          {/* 2. USER VOICE WAVEFORM ROW */}
          <div className="rounded-xl sm:rounded-2xl bg-slate-950/90 border border-emerald-500/20 p-2 sm:p-3 relative overflow-hidden">
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 shadow-[0_0_8px_#10b981]'}`} />
                <span className="text-[11px] sm:text-xs font-extrabold text-emerald-300">
                  🎙️ 내 발음 파형
                </span>
                {isRecording ? (
                  <span className="text-[10px] text-rose-400 font-bold animate-pulse">
                    수신 중 (무음 {(silenceConfig.postSpeechSilenceTimeoutMs / 1000).toFixed(1)}s 시 완료)
                  </span>
                ) : audioUrl ? (
                  <span className="text-[10px] text-emerald-400/90 font-mono font-bold">
                    {voiceSegmentResult?.detected ? `${voiceSegmentResult.durationSec}s 추출` : '녹음 완료'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 truncate">
                    마이크를 눌러 발음하세요
                  </span>
                )}
              </div>

              {audioUrl && onTogglePlayUserAudio && !isRecording && (
                <button
                  onClick={handleToggleUserPlayback}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black flex items-center gap-1 transition-all shadow-md active:scale-95 shrink-0 ${
                    isPlayingUserAudio
                      ? 'bg-rose-500 text-white animate-pulse ring-2 ring-rose-400'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                  title="내 녹음 재생"
                >
                  {isPlayingUserAudio ? (
                    <>
                      <Pause className="w-3 h-3" />
                      <span>정지</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>내 음성</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* User Canvas */}
            <div className="relative w-full h-14 sm:h-16 rounded-xl bg-slate-950 flex items-center justify-center px-1.5 overflow-hidden border border-emerald-900/40">
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-emerald-500/15 pointer-events-none" />

              {isRecording ? (
                <canvas
                  ref={liveCanvasRef}
                  width={420}
                  height={64}
                  className="w-full h-full block"
                />
              ) : audioUrl ? (
                <canvas
                  ref={userRecordedCanvasRef}
                  width={420}
                  height={64}
                  className="w-full h-full block cursor-pointer"
                  onClick={handleToggleUserPlayback}
                  title="클릭하여 내 목소리 재생"
                />
              ) : (
                <div className="flex items-center gap-1.5 text-center text-slate-500 text-[11px] px-2">
                  <span>🎙️ 마이크 버튼을 켜고 말씀하시면 실시간 파형이 표시됩니다.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* OVERLAY COMPARISON VIEW */
        <div className="rounded-xl sm:rounded-2xl bg-slate-950/90 border border-indigo-500/30 p-2.5 sm:p-3.5 space-y-2 sm:space-y-2.5">
          <div className="flex items-center justify-between gap-1.5 text-[10px] sm:text-xs flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="flex items-center gap-1 font-bold text-sky-300">
                <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                <span>AI 기준(청록)</span>
              </span>
              <span className="flex items-center gap-1 font-bold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                <span>내 발음(초록)</span>
              </span>
              {showPreviousCurve && alignedPreviousWaveformData.length > 0 && (
                <span className="flex items-center gap-1 font-bold text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                  <span>이전 발음(노랑 점선)</span>
                </span>
              )}
              <span className="flex items-center gap-1 font-bold text-rose-300/90">
                <span className="w-2 h-2 rounded-full bg-rose-500/70" />
                <span>오차(빨강)</span>
              </span>
            </div>

            {/* Quick Listen Controls in Overlay */}
            <div className="flex items-center gap-1 ml-auto">
              {targetText && onPlayTargetAudio && (
                <button
                  onClick={onPlayTargetAudio}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 border transition-all ${
                    isPlayingTargetAudio
                      ? 'bg-sky-500 text-slate-950 border-sky-300 font-black'
                      : 'bg-sky-950/60 text-sky-200 border-sky-700/50 hover:bg-sky-900'
                  }`}
                >
                  <Volume2 className="w-3 h-3" />
                  <span>AI 듣기</span>
                </button>
              )}

              {effectivePreviousVoice?.audioUrl && !isRecording && (
                <button
                  onClick={handleTogglePlayPreviousAudio}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-all ${
                    isPlayingPreviousAudio
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  }`}
                  title="이전 내 목소리 듣기"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>이전 목소리</span>
                </button>
              )}

              {audioUrl && onTogglePlayUserAudio && !isRecording && (
                <button
                  onClick={handleToggleUserPlayback}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-all ${
                    isPlayingUserAudio
                      ? 'bg-rose-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>내 목소리</span>
                </button>
              )}
            </div>
          </div>

          {/* Overlay Canvas Viewport */}
          <div className="relative w-full h-24 sm:h-32 rounded-xl sm:rounded-2xl bg-slate-950 flex items-center justify-center px-1.5 overflow-hidden border border-indigo-900/60 shadow-inner">
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-indigo-500/20 pointer-events-none" />
            <canvas
              ref={overlayCanvasRef}
              width={420}
              height={112}
              className="w-full h-full block cursor-crosshair"
            />
          </div>

          {/* Syllable-by-Syllable Interactive Discrepancy Strip */}
          {showSyllableFeedback && syllableDiagnostics.length > 0 && (
            <div className="pt-1.5 space-y-1.5 sm:space-y-2 border-t border-indigo-500/20">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] sm:text-xs font-bold text-indigo-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span>음절별 파형 대조 (터치하여 오차 확인)</span>
                </span>
              </div>

              {/* Syllable Chips Grid */}
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {syllableDiagnostics.map((syl) => {
                  const isSelected = (activeSyllableId || currentSelectedSyllable?.id) === syl.id;
                  return (
                    <button
                      key={syl.id}
                      onClick={() => handleSelectSyllable(syl)}
                      onMouseEnter={() => setHoveredSyllableId(syl.id)}
                      onMouseLeave={() => setHoveredSyllableId(null)}
                      className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 border active:scale-95 ${
                        isSelected
                          ? 'ring-1 ring-indigo-400 bg-indigo-950 border-indigo-400 text-white shadow-md'
                          : syl.status === 'matched'
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                          : syl.status === 'low_stress'
                          ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/50'
                          : syl.status === 'high_stress'
                          ? 'bg-purple-950/40 text-purple-300 border-purple-500/40 hover:bg-purple-900/50'
                          : 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/50'
                      }`}
                    >
                      <span>{syl.syllable}</span>
                      {syl.isPrimaryStress && (
                        <span className="text-[9px] text-purple-400 font-mono" title="제1강세 위치">
                          ⚡
                        </span>
                      )}
                      {syl.accuracyScore > 0 && (
                        <span className="text-[9px] font-mono opacity-90 px-1 py-0.2 rounded bg-black/30">
                          {syl.accuracyScore}점
                        </span>
                      )}
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          syl.status === 'matched'
                            ? 'bg-emerald-400'
                            : syl.status === 'low_stress'
                            ? 'bg-amber-400'
                            : syl.status === 'high_stress'
                            ? 'bg-purple-400'
                            : 'bg-rose-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Selected Syllable Diagnostic Callout (Compact Mobile Layout) */}
              {currentSelectedSyllable && (
                <div
                  className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all text-[11px] sm:text-xs flex flex-col gap-1.5 ${
                    currentSelectedSyllable.status === 'matched'
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : currentSelectedSyllable.status === 'low_stress'
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : currentSelectedSyllable.status === 'high_stress'
                      ? 'bg-purple-950/30 border-purple-500/40 text-purple-200'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {currentSelectedSyllable.status === 'matched' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="font-extrabold text-xs sm:text-sm text-white">
                        [{currentSelectedSyllable.syllable}]
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-950/70 font-mono text-[10px] font-bold">
                        {currentSelectedSyllable.statusLabel}
                      </span>
                      {currentSelectedSyllable.isPrimaryStress && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 font-mono text-[9px] font-bold">
                          제1강세
                        </span>
                      )}
                    </div>

                    {/* Inline Amplitude Peak Comparer */}
                    <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-white/10 text-[10px] font-mono shrink-0">
                      <span className="text-slate-400">AI</span>
                      <span className="font-bold text-sky-400">{Math.round(currentSelectedSyllable.aiPeak * 100)}%</span>
                      <span className="text-white/20">|</span>
                      <span className="text-slate-400">나</span>
                      <span className={`font-bold ${currentSelectedSyllable.userPeak > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {currentSelectedSyllable.userPeak > 0 ? `${Math.round(currentSelectedSyllable.userPeak * 100)}%` : '-'}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-300 leading-snug text-[11px]">
                    {currentSelectedSyllable.feedback}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* COMPARATIVE ACCURACY & CADENCE METRICS BAR (3-Col Compact Strip on Mobile & Desktop) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        {/* Metric 1: Rhythm Cadence Match */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">리듬 일치율</span>
              <span className="text-[11px] sm:text-xs font-extrabold text-white block truncate">
                {extractedUserWaveformData.length > 0 || score !== undefined ? `${similarityScore}%` : '측정 대기'}
              </span>
            </div>
          </div>
          {(extractedUserWaveformData.length > 0 || score !== undefined) && (
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded self-start sm:self-auto ${
                similarityScore >= 80
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {similarityScore >= 80 ? '우수' : '양호'}
            </span>
          )}
        </div>

        {/* Metric 2: Stress Peak Alignment */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">강세(Stress)</span>
              <span className="text-[11px] sm:text-xs font-extrabold text-white block truncate">
                {aiRefProfile.stressPoints.length > 0 ? `${aiRefProfile.stressPoints.length}개 피크` : '단일 음절'}
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[10px] text-purple-300 font-bold bg-purple-500/20 px-1.5 py-0.5 rounded">
            자동 분석
          </span>
        </div>

        {/* Metric 3: Speech Pace & Duration */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">발화 속도</span>
              <span className="text-[11px] sm:text-xs font-extrabold text-white block truncate">
                {voiceSegmentResult
                  ? `${voiceSegmentResult.durationSec}s / ~${silenceConfig.estimatedDurationSec}s`
                  : `기준 ~${silenceConfig.estimatedDurationSec}초`}
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[10px] text-sky-300 font-bold bg-sky-500/20 px-1.5 py-0.5 rounded">
            VAD {(silenceConfig.postSpeechSilenceTimeoutMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Guide Note Footer (Desktop/Tablet Only to save mobile vertical space) */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-2 text-[10px] text-indigo-300/80 pt-1 border-t border-indigo-500/10">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <span>오버레이 뷰에서 청록(AI)과 초록(내 발음)의 겹침 오차를 음절별로 확인하세요</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>마이크 버튼을 누르면 AI 음성이 즉시 중지되고 녹음이 시작됩니다</span>
        </span>
      </div>
    </div>
  );
};
