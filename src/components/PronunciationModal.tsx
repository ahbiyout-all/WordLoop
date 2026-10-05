import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Mic, MicOff, Volume2, RotateCcw, CheckCircle2, AlertCircle, Award, History, Play, Pause, Trash2, Activity, Sparkles, Zap, BarChart3 } from 'lucide-react';
import { speechService } from '../services/speechService';
import { PronunciationResult } from '../types';
import { AudioWaveform } from './AudioWaveform';
import { recordPronunciationDone } from '../services/habitQuestService';
import {
  getVoiceHistoryForTarget,
  saveVoiceRecordingForTarget,
  formatVoiceRecordedTime,
  SavedVoiceSnapshot,
} from '../services/voiceHistoryService';
import {
  createLiveSilenceDetector,
  LiveSilenceDetector,
  SilenceStopReason,
  VoiceSegmentResult,
  SyllableDiagnostic,
  generateReferenceWaveform,
  alignUserWaveformToReference,
  analyzeSyllablesAndDiscrepancies,
  decodeAndExtractVoiceSegment,
} from '../utils/audioWaveformUtils';

export interface AudioSnippet {
  id: string;
  timestamp: string;
  targetText: string;
  transcript: string;
  score?: number;
  audioUrl: string;
}

interface PronunciationModalProps {
  isOpen: boolean;
  targetText: string;
  onClose: () => void;
  onSuccessEvaluation?: () => void; // Option to record goal achievement
}

export const PronunciationModal: React.FC<PronunciationModalProps> = ({
  isOpen,
  targetText,
  onClose,
  onSuccessEvaluation,
}) => {
  const [activeTab, setActiveTab] = useState<'practice' | 'recordings'>('practice');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null);
  const [latestRecordedAudioUrl, setLatestRecordedAudioUrl] = useState<string | null>(null);
  const [trimmedAudioUrl, setTrimmedAudioUrl] = useState<string | null>(null);
  const [userVoiceSegment, setUserVoiceSegment] = useState<VoiceSegmentResult | null>(null);
  const [isPlayingLatestAudio, setIsPlayingLatestAudio] = useState(false);
  const [isPlayingTargetAudio, setIsPlayingTargetAudio] = useState(false);
  const [autoStopReason, setAutoStopReason] = useState<SilenceStopReason | null>(null);

  // Recent 3 audio snippets state
  const [recentRecordings, setRecentRecordings] = useState<AudioSnippet[]>([]);
  const [playingSnippetId, setPlayingSnippetId] = useState<string | null>(null);
  const [selectedSyllableId, setSelectedSyllableId] = useState<string | null>(null);
  const [playingSyllableId, setPlayingSyllableId] = useState<string | null>(null);
  const [showOnlyInaccurate, setShowOnlyInaccurate] = useState<boolean>(false);
  const [restoredWaveformData, setRestoredWaveformData] = useState<number[]>([]);
  const [previousVoiceSnapshot, setPreviousVoiceSnapshot] = useState<SavedVoiceSnapshot | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const silenceDetectorRef = useRef<LiveSilenceDetector | null>(null);
  const syllableSegmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestTranscriptRef = useRef<string>('');
  const latestScoreRef = useRef<number | undefined>(undefined);
  const latestAudioBlobRef = useRef<Blob | null>(null);
  const latestVoiceSegmentRef = useRef<VoiceSegmentResult | null>(null);

  // Restore last recorded voice from IndexedDB whenever modal opens or targetText changes
  useEffect(() => {
    if (!isOpen || !targetText) return;
    let cancelled = false;
    setLatestRecordedAudioUrl(null);
    setTrimmedAudioUrl(null);
    setUserVoiceSegment(null);
    setRestoredWaveformData([]);
    setPreviousVoiceSnapshot(null);
    setTranscript('');
    setResult(null);
    setRecentRecordings([]);
    setShowOnlyInaccurate(false);

    getVoiceHistoryForTarget(targetText)
      .then((rec) => {
        if (cancelled || !rec || !rec.latest) return;
        if (rec.latest.audioUrl) {
          setLatestRecordedAudioUrl(rec.latest.audioUrl);
        }
        if (rec.latest.waveformSamples && rec.latest.waveformSamples.length > 0) {
          setRestoredWaveformData(rec.latest.waveformSamples);
        }
        if (rec.latest.transcript) {
          setTranscript(rec.latest.transcript);
        }
        if (rec.previous) {
          setPreviousVoiceSnapshot(rec.previous);
        }
        // Populate recentRecordings with saved latest & previous
        const list: AudioSnippet[] = [];
        if (rec.latest.audioUrl) {
          list.push({
            id: `saved-latest-${rec.updatedAt}`,
            timestamp: formatVoiceRecordedTime(rec.latest.recordedAt),
            targetText,
            transcript: rec.latest.transcript || '마지막 녹음 내 목소리',
            score: rec.latest.score,
            audioUrl: rec.latest.audioUrl,
          });
        }
        if (rec.previous?.audioUrl) {
          list.push({
            id: `saved-prev-${rec.updatedAt}`,
            timestamp: formatVoiceRecordedTime(rec.previous.recordedAt),
            targetText,
            transcript: rec.previous.transcript || '이전 녹음 내 목소리',
            score: rec.previous.score,
            audioUrl: rec.previous.audioUrl,
          });
        }
        if (list.length > 0) {
          setRecentRecordings(list);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, targetText]);

  // Compute reference waveform & syllable-level diagnostic report
  const referenceProfile = useMemo(() => generateReferenceWaveform(targetText), [targetText]);

  const alignedUserSamples = useMemo(() => {
    const sourceSamples =
      userVoiceSegment?.normalizedWaveform && userVoiceSegment.normalizedWaveform.length > 0
        ? userVoiceSegment.normalizedWaveform
        : restoredWaveformData;
    if (!sourceSamples || sourceSamples.length === 0) {
      return [];
    }
    return alignUserWaveformToReference(sourceSamples, referenceProfile.samples);
  }, [userVoiceSegment, restoredWaveformData, referenceProfile.samples]);

  const syllableDiagnostics = useMemo(() => {
    return analyzeSyllablesAndDiscrepancies(
      targetText,
      referenceProfile.samples,
      alignedUserSamples,
      transcript
    );
  }, [targetText, referenceProfile.samples, alignedUserSamples, transcript]);

  const hasEvaluatedReport = Boolean(
    result || alignedUserSamples.length > 0 || (transcript && !isListening)
  );

  // Determine whether a syllable is inaccurate and should be highlighted in red
  const isSyllableInaccurate = (syl: SyllableDiagnostic): boolean => {
    if (syl.accuracyScore <= 0) return false;
    return (
      syl.accuracyScore < 75 ||
      syl.status === 'unclear' ||
      syl.status === 'low_stress'
    );
  };

  const inaccurateSyllables = useMemo(
    () => syllableDiagnostics.filter((syl) => isSyllableInaccurate(syl)),
    [syllableDiagnostics]
  );

  // Group syllables by word in sentence order for visual word-by-word syllable breakdown
  const wordSyllableGroups = useMemo(() => {
    const groups: {
      word: string;
      wordIndex: number;
      syllables: SyllableDiagnostic[];
      avgWordScore: number;
      hasInaccurate: boolean;
    }[] = [];

    syllableDiagnostics.forEach((syl) => {
      const lastGroup = groups[groups.length - 1];
      // Start a new word group if word differs or if syllable index wraps
      if (!lastGroup || lastGroup.word !== syl.word) {
        groups.push({
          word: syl.word,
          wordIndex: groups.length,
          syllables: [syl],
          avgWordScore: syl.accuracyScore,
          hasInaccurate: isSyllableInaccurate(syl),
        });
      } else {
        lastGroup.syllables.push(syl);
        const scored = lastGroup.syllables.filter((s) => s.accuracyScore > 0);
        lastGroup.avgWordScore =
          scored.length > 0
            ? Math.round(scored.reduce((a, b) => a + b.accuracyScore, 0) / scored.length)
            : 0;
        lastGroup.hasInaccurate = lastGroup.syllables.some((s) => isSyllableInaccurate(s));
      }
    });

    return groups;
  }, [syllableDiagnostics]);

  const displayedSyllableDiagnostics = useMemo(() => {
    if (showOnlyInaccurate && inaccurateSyllables.length > 0) {
      return inaccurateSyllables;
    }
    return syllableDiagnostics;
  }, [showOnlyInaccurate, inaccurateSyllables, syllableDiagnostics]);

  const getSyllableTimeRangeLabel = (syl: SyllableDiagnostic): string => {
    const totalDur =
      userVoiceSegment?.activeDurationSec ||
      userVoiceSegment?.durationSec ||
      referenceProfile.estimatedDurationSec ||
      1.2;
    const startSec = Math.max(0, (syl.startPercent / 100) * totalDur);
    const endSec = Math.min(totalDur, Math.max(startSec + 0.18, (syl.endPercent / 100) * totalDur));
    return `${startSec.toFixed(2)}s~${endSec.toFixed(2)}s`;
  };

  const reportSummary = useMemo(() => {
    if (syllableDiagnostics.length === 0) {
      return { avgScore: 0, matchedCount: 0, inaccurateCount: 0, stressScore: 0 };
    }
    const scoredItems = syllableDiagnostics.filter((s) => s.accuracyScore > 0);
    if (scoredItems.length === 0) {
      return { avgScore: result?.score ?? 0, matchedCount: 0, inaccurateCount: 0, stressScore: 0 };
    }
    const totalScore = scoredItems.reduce((acc, item) => acc + item.accuracyScore, 0);
    const avgScore = Math.round(totalScore / scoredItems.length);
    const matchedCount = scoredItems.filter((item) => !isSyllableInaccurate(item)).length;
    const inaccurateCount = scoredItems.filter((item) => isSyllableInaccurate(item)).length;
    const stressItems = scoredItems.filter((item) => item.isPrimaryStress);
    const stressScore =
      stressItems.length > 0
        ? Math.round(stressItems.reduce((acc, item) => acc + item.accuracyScore, 0) / stressItems.length)
        : avgScore;

    return { avgScore, matchedCount, inaccurateCount, stressScore };
  }, [syllableDiagnostics, result]);

  // Fallback extraction if audioUrl exists without userVoiceSegment
  useEffect(() => {
    if (latestRecordedAudioUrl && !userVoiceSegment && !isListening) {
      let cancelled = false;
      decodeAndExtractVoiceSegment(latestRecordedAudioUrl, 50)
        .then((seg) => {
          if (!cancelled && seg && seg.normalizedWaveform.length > 0) {
            setUserVoiceSegment(seg);
            if (seg.detected && seg.trimmedAudioUrl && seg.durationSec >= 0.2) {
              setTrimmedAudioUrl((prev) => prev || seg.trimmedAudioUrl!);
            }
          }
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
  }, [latestRecordedAudioUrl, userVoiceSegment, isListening]);

  // Stop background audio whenever modal opens or closes
  useEffect(() => {
    speechService.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    return () => {
      speechService.stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (syllableSegmentTimerRef.current) {
        clearTimeout(syllableSegmentTimerRef.current);
        syllableSegmentTimerRef.current = null;
      }
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
      }
      if (silenceDetectorRef.current) {
        silenceDetectorRef.current.stop();
        silenceDetectorRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.continuous = false;
        reco.interimResults = true;
        reco.lang = 'en-US';

        reco.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
          latestTranscriptRef.current = currentTranscript;

          // Final result
          if (event.results[0].isFinal) {
            const evalResult = speechService.evaluatePronunciation(targetText, currentTranscript);
            setResult(evalResult);
            latestScoreRef.current = evalResult.score;
            stopListeningInternal();

            saveVoiceRecordingForTarget({
              targetText,
              audioBlob: latestAudioBlobRef.current,
              voiceSegment: latestVoiceSegmentRef.current,
              score: evalResult.score,
              transcript: currentTranscript,
            })
              .then((saved) => {
                if (saved?.previous) {
                  setPreviousVoiceSnapshot(saved.previous);
                }
              })
              .catch(() => {});

            // Record Daily Quest habit completion
            recordPronunciationDone();

            if (evalResult.score >= 80 && onSuccessEvaluation) {
              onSuccessEvaluation();
            }
          }
        };

        reco.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
          stopListeningInternal();
        };

        reco.onend = () => {
          // If recognition ended and interim transcript was captured but not yet scored
          if (latestTranscriptRef.current && !latestScoreRef.current) {
            const evalResult = speechService.evaluatePronunciation(targetText, latestTranscriptRef.current);
            setResult(evalResult);
            latestScoreRef.current = evalResult.score;
            saveVoiceRecordingForTarget({
              targetText,
              audioBlob: latestAudioBlobRef.current,
              voiceSegment: latestVoiceSegmentRef.current,
              score: evalResult.score,
              transcript: latestTranscriptRef.current,
            })
              .then((saved) => {
                if (saved?.previous) {
                  setPreviousVoiceSnapshot(saved.previous);
                }
              })
              .catch(() => {});
            recordPronunciationDone();

            if (evalResult.score >= 80 && onSuccessEvaluation) {
              onSuccessEvaluation();
            }
          }
          stopListeningInternal();
        };

        setRecognition(reco);
      } else {
        setBrowserSupported(false);
      }
    }
  }, [targetText]);

  if (!isOpen) return null;

  const stopListeningInternal = () => {
    setIsListening(false);
    if (silenceDetectorRef.current) {
      const segResult = silenceDetectorRef.current.stop();
      if (segResult && segResult.detected && segResult.durationSec >= 0.2) {
        setUserVoiceSegment(segResult);
        if (segResult.trimmedAudioUrl) {
          setTrimmedAudioUrl(segResult.trimmedAudioUrl);
          setLatestRecordedAudioUrl((prev) => prev || segResult.trimmedAudioUrl!);
        }
      }
      silenceDetectorRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }
  };

  /**
   * User clicks microphone: IMMEDIATELY stop all AI speech & existing audio, then begin recording
   */
  const handleStartListening = async () => {
    // 1. Immediately cancel all AI synthesis, previous recording session & active audio playback
    speechService.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (syllableSegmentTimerRef.current) {
      clearTimeout(syllableSegmentTimerRef.current);
      syllableSegmentTimerRef.current = null;
    }
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      activeAudioPlayerRef.current = null;
    }
    if (silenceDetectorRef.current) {
      silenceDetectorRef.current.stop();
      silenceDetectorRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    setPlayingSyllableId(null);
    setSelectedSyllableId(null);
    setIsPlayingLatestAudio(false);
    setIsPlayingTargetAudio(false);

    if (!recognition) return;
    setTranscript('');
    latestTranscriptRef.current = '';
    latestScoreRef.current = undefined;
    latestAudioBlobRef.current = null;
    latestVoiceSegmentRef.current = null;
    setResult(null);
    setAutoStopReason(null);
    setTrimmedAudioUrl(null);
    setUserVoiceSegment(null);
    setRestoredWaveformData([]);
    setLatestRecordedAudioUrl(null);
    setIsListening(true);

    // Move existing latest recording in history to previousVoiceSnapshot so user can compare right away
    getVoiceHistoryForTarget(targetText)
      .then((rec) => {
        if (rec?.latest) {
          setPreviousVoiceSnapshot(rec.latest);
        }
      })
      .catch(() => {});

    // Start MediaRecorder if supported
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setActiveMediaStream(stream);

        let capturedValidTrimmedWav = false;

        // Intelligently monitor audio stream for silence adapted to target length
        silenceDetectorRef.current = createLiveSilenceDetector({
          stream,
          targetText,
          onVoiceSegmentReady: (segResult) => {
            if (segResult && segResult.detected && segResult.durationSec >= 0.2) {
              capturedValidTrimmedWav = true;
              latestVoiceSegmentRef.current = segResult;
              setUserVoiceSegment(segResult);
              if (segResult.trimmedAudioUrl) {
                setTrimmedAudioUrl(segResult.trimmedAudioUrl);
                setLatestRecordedAudioUrl((prev) => prev || segResult.trimmedAudioUrl!);
              }
            }
          },
          onSilenceTimeout: (reason) => {
            setAutoStopReason(reason);

            // If user finished speaking and trailed off into silence, evaluate before stopping
            if (reason === 'trailing_silence' && latestTranscriptRef.current && !latestScoreRef.current) {
              const evalResult = speechService.evaluatePronunciation(targetText, latestTranscriptRef.current);
              setResult(evalResult);
              latestScoreRef.current = evalResult.score;
              recordPronunciationDone();

              if (evalResult.score >= 80 && onSuccessEvaluation) {
                onSuccessEvaluation();
              }
            }

            handleStopListening();
          },
        });

        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const mimeType = mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            latestAudioBlobRef.current = audioBlob;
            const audioUrl = URL.createObjectURL(audioBlob);
            // Always store the native MediaRecorder URL as the guaranteed playable source
            setLatestRecordedAudioUrl(audioUrl);

            if (capturedValidTrimmedWav) {
              saveVoiceRecordingForTarget({
                targetText,
                audioBlob,
                voiceSegment: latestVoiceSegmentRef.current,
                score: latestScoreRef.current,
                transcript: latestTranscriptRef.current || undefined,
              })
                .then((saved) => {
                  if (saved?.previous) {
                    setPreviousVoiceSnapshot(saved.previous);
                  }
                })
                .catch(() => {});
            }

            if (!capturedValidTrimmedWav) {
              decodeAndExtractVoiceSegment(audioBlob, 50)
                .then((decodedSeg) => {
                  if (decodedSeg) {
                    latestVoiceSegmentRef.current = decodedSeg;
                    setUserVoiceSegment(decodedSeg);
                    if (decodedSeg.detected && decodedSeg.trimmedAudioUrl && decodedSeg.durationSec >= 0.2) {
                      setTrimmedAudioUrl(decodedSeg.trimmedAudioUrl);
                    }
                  }
                  saveVoiceRecordingForTarget({
                    targetText,
                    audioBlob,
                    voiceSegment: decodedSeg,
                    score: latestScoreRef.current,
                    transcript: latestTranscriptRef.current || undefined,
                  })
                    .then((saved) => {
                      if (saved?.previous) {
                        setPreviousVoiceSnapshot(saved.previous);
                      }
                    })
                    .catch(() => {});
                })
                .catch(() => {});
            }

            const newSnippet: AudioSnippet = {
              id: `rec-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              targetText,
              transcript: latestTranscriptRef.current || '인식된 음성',
              score: latestScoreRef.current,
              audioUrl,
            };

            setRecentRecordings((prev) => [newSnippet, ...prev].slice(0, 3));
          }

          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
          setActiveMediaStream(null);
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
      } catch (err) {
        console.warn('Microphone MediaRecorder error:', err);
      }
    }

    try {
      try {
        recognition.stop();
      } catch (e) {}
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {}
      }, 30);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleStopListening = () => {
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        console.warn(e);
      }
    }
    stopListeningInternal();
  };

  const handleListenTargetOnce = () => {
    if (isListening) {
      handleStopListening();
    }
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      setIsPlayingLatestAudio(false);
    }

    if (isPlayingTargetAudio) {
      speechService.stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingTargetAudio(false);
      return;
    }

    speechService.speakWithCallbacks(targetText, {
      onStart: () => setIsPlayingTargetAudio(true),
      onEnd: () => setIsPlayingTargetAudio(false),
      onError: () => setIsPlayingTargetAudio(false),
    });
  };

  const handleTogglePlayLatestAudio = (urlToPlay?: string) => {
    const primaryUrl = urlToPlay || trimmedAudioUrl || latestRecordedAudioUrl;
    const fallbackUrl = latestRecordedAudioUrl || trimmedAudioUrl;
    if (!primaryUrl) return;

    if (syllableSegmentTimerRef.current) {
      clearTimeout(syllableSegmentTimerRef.current);
      syllableSegmentTimerRef.current = null;
    }
    setPlayingSyllableId(null);

    const isActuallyPlaying =
      isPlayingLatestAudio &&
      activeAudioPlayerRef.current &&
      !activeAudioPlayerRef.current.paused &&
      !activeAudioPlayerRef.current.ended;

    if (isActuallyPlaying) {
      activeAudioPlayerRef.current?.pause();
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.currentTime = 0;
      }
      setIsPlayingLatestAudio(false);
      return;
    }

    speechService.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTargetAudio(false);

    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      activeAudioPlayerRef.current = null;
    }

    const playWithUrl = (src: string, allowFallback: boolean) => {
      const audio = new Audio(src);
      activeAudioPlayerRef.current = audio;
      setIsPlayingLatestAudio(true);
      audio.onended = () => setIsPlayingLatestAudio(false);
      audio.onerror = () => {
        if (allowFallback && fallbackUrl && fallbackUrl !== src) {
          playWithUrl(fallbackUrl, false);
        } else {
          setIsPlayingLatestAudio(false);
        }
      };
      audio.play().catch(() => {
        if (allowFallback && fallbackUrl && fallbackUrl !== src) {
          playWithUrl(fallbackUrl, false);
        } else {
          setIsPlayingLatestAudio(false);
        }
      });
    };

    playWithUrl(primaryUrl, true);
  };

  /**
   * Plays the specific time slice of the user's recorded audio corresponding to a syllable
   */
  const handlePlaySyllableSegment = (syl: SyllableDiagnostic) => {
    setSelectedSyllableId(syl.id);
    const audioSrc = trimmedAudioUrl || latestRecordedAudioUrl;
    if (!audioSrc) return;

    if (syllableSegmentTimerRef.current) {
      clearTimeout(syllableSegmentTimerRef.current);
      syllableSegmentTimerRef.current = null;
    }

    if (playingSyllableId === syl.id) {
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
      }
      setPlayingSyllableId(null);
      setIsPlayingLatestAudio(false);
      return;
    }

    speechService.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTargetAudio(false);

    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
    }

    const audio = new Audio(audioSrc);
    activeAudioPlayerRef.current = audio;
    setPlayingSyllableId(syl.id);
    setIsPlayingLatestAudio(true);

    const startSlicePlayback = () => {
      const fallbackDur =
        userVoiceSegment?.activeDurationSec ||
        userVoiceSegment?.durationSec ||
        referenceProfile.estimatedDurationSec ||
        1.2;
      const totalDur =
        Number.isFinite(audio.duration) && audio.duration > 0.15 ? audio.duration : fallbackDur;

      const rawStartSec = (syl.startPercent / 100) * totalDur;
      const rawEndSec = (syl.endPercent / 100) * totalDur;
      const startSec = Math.max(0, rawStartSec - 0.05);
      const endSec = Math.min(totalDur, Math.max(startSec + 0.22, rawEndSec + 0.08));
      const sliceDurationMs = Math.max(240, Math.round((endSec - startSec) * 1000));

      try {
        audio.currentTime = startSec;
      } catch (e) {}

      audio
        .play()
        .then(() => {
          syllableSegmentTimerRef.current = setTimeout(() => {
            audio.pause();
            setPlayingSyllableId(null);
            setIsPlayingLatestAudio(false);
            syllableSegmentTimerRef.current = null;
          }, sliceDurationMs);
        })
        .catch(() => {
          setPlayingSyllableId(null);
          setIsPlayingLatestAudio(false);
        });
    };

    audio.onloadedmetadata = startSlicePlayback;
    audio.onended = () => {
      if (syllableSegmentTimerRef.current) {
        clearTimeout(syllableSegmentTimerRef.current);
        syllableSegmentTimerRef.current = null;
      }
      setPlayingSyllableId(null);
      setIsPlayingLatestAudio(false);
    };
    audio.onerror = () => {
      setPlayingSyllableId(null);
      setIsPlayingLatestAudio(false);
    };
  };

  const handlePlaySnippet = (snippet: AudioSnippet) => {
    if (playingSnippetId === snippet.id && activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      setPlayingSnippetId(null);
      return;
    }

    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
    }

    const audio = new Audio(snippet.audioUrl);
    activeAudioPlayerRef.current = audio;
    setPlayingSnippetId(snippet.id);

    audio.onended = () => {
      setPlayingSnippetId(null);
    };

    audio.onerror = () => {
      setPlayingSnippetId(null);
    };

    audio.play().catch(() => setPlayingSnippetId(null));
  };

  const handleDeleteSnippet = (id: string) => {
    if (playingSnippetId === id && activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      setPlayingSnippetId(null);
    }
    setRecentRecordings((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92dvh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Sticky Top Header & Tab Switcher */}
        <div className="shrink-0 px-4 pt-3.5 sm:px-6 sm:pt-5 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 sm:p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                  발음 실시간 측정 & 쉐도잉
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  원어민 발음을 듣고 마이크로 직접 따라 말해보세요.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mt-1">
            <button
              onClick={() => setActiveTab('practice')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'practice'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>실시간 발음 측정</span>
            </button>
            <button
              onClick={() => setActiveTab('recordings')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'recordings'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>최근 녹음 ({recentRecordings.length}/3)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Main Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 sm:px-6 sm:py-4 space-y-3">
          {activeTab === 'practice' ? (
            <>
              {/* Target Text & Unified Primary Controls Card (Always at Top on Mobile) */}
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-center space-y-2.5">
                <div className="space-y-1">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 block">
                    연습 대상 표적 문장 / 단어
                  </span>
                  <p className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-snug break-words">
                    "{targetText}"
                  </p>
                </div>

                {/* Primary One-Touch Control Buttons (Listen + Mic Record + My Voice) */}
                {!browserSupported ? (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>이 브라우저는 음성 인식을 지원하지 않습니다. Chrome/Safari를 권장합니다.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                    <button
                      onClick={handleListenTargetOnce}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-extrabold text-xs shadow-sm transition-all active:scale-95 ${
                        isPlayingTargetAudio
                          ? 'bg-emerald-600 text-white animate-pulse'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }`}
                    >
                      <Volume2 className="w-4 h-4 shrink-0" />
                      <span>{isPlayingTargetAudio ? '원어민 재생 중...' : '원어민 발음 듣기'}</span>
                    </button>

                    <button
                      onClick={isListening ? handleStopListening : handleStartListening}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/30'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4 shrink-0" />
                          <span>녹음 완료 (판정)</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 shrink-0" />
                          <span>마이크 켜고 발음하기</span>
                        </>
                      )}
                    </button>

                    {latestRecordedAudioUrl && !isListening && (
                      <button
                        onClick={() => handleTogglePlayLatestAudio()}
                        className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl font-bold text-xs transition-all shadow-xs active:scale-95 ${
                          isPlayingLatestAudio
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {isPlayingLatestAudio ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>내 목소리 정지</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current text-indigo-500" />
                            <span>내 녹음 듣기</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Live Recording Status / Transcript Banner */}
                {isListening && (
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px] font-bold flex items-center justify-center gap-2 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <span>🎙️ 지금 발음하세요 (말씀 후 무음 시 자동 채점)</span>
                  </div>
                )}

                {autoStopReason === 'initial_silence' && !isListening && !result && (
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>음성이 감지되지 않아 자동 종료되었습니다. 다시 마이크를 눌러 말씀해 보세요.</span>
                  </div>
                )}

                {transcript && (
                  <div className="p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs">
                    <span className="text-[11px] text-indigo-500 font-bold mr-1.5">인식된 발음:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">"{transcript}"</span>
                  </div>
                )}
              </div>

              {/* Evaluation Results Card (Shown Immediately Above Waveform When Evaluated) */}
              {result && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 animate-in slide-in-from-top-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        발음 일치도 점수
                      </span>
                    </div>
                    <span className={`text-base sm:text-lg font-black ${result.score >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {result.score}점
                    </span>
                  </div>

                  {/* Score Bar */}
                  <div className="w-full h-1.5 sm:h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        result.score >= 80 ? 'bg-emerald-500' : result.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>

                  {/* Word-by-word Breakdown */}
                  <div className="flex flex-wrap gap-1">
                    {result.wordMatches.map((wm, idx) => (
                      <span
                        key={idx}
                        className={`text-[11px] px-2 py-0.5 rounded-lg font-mono font-bold border ${
                          wm.matched
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 line-through'
                        }`}
                      >
                        {wm.word}
                      </span>
                    ))}
                  </div>

                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium leading-snug">
                    {result.feedback}
                  </p>
                </div>
              )}

              {/* Realtime & Recorded Audio Waveform Visualizer */}
              <AudioWaveform
                audioUrl={latestRecordedAudioUrl}
                userVoiceSegment={userVoiceSegment}
                userWaveformData={restoredWaveformData}
                previousVoiceSnapshot={previousVoiceSnapshot}
                isPlayingUserAudio={isPlayingLatestAudio}
                onTogglePlayUserAudio={handleTogglePlayLatestAudio}
                isRecording={isListening}
                audioStream={activeMediaStream}
                targetText={targetText}
                onPlayTargetAudio={handleListenTargetOnce}
                isPlayingTargetAudio={isPlayingTargetAudio}
                onStartMicRecording={handleStartListening}
                score={result?.score}
                onTrimmedAudioExtracted={(url) => setTrimmedAudioUrl(url)}
                autoStopReason={autoStopReason}
                defaultLayout="overlay"
                showSyllableFeedback={true}
                selectedSyllableId={selectedSyllableId}
                onSelectSyllable={(syl) => setSelectedSyllableId(syl ? syl.id : null)}
              />

              {/* 상세 진단 리포트 (Detailed Syllable-by-Syllable Diagnostic Report + Red Inaccurate Highlight + Instant Segment Replay) */}
              {syllableDiagnostics.length > 0 && (
                <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/85 border border-indigo-200/80 dark:border-indigo-800/60 space-y-3.5 shadow-sm">
                  {/* Report Header + Full Audio Segment Replay Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-700/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="p-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <BarChart3 className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            음절별 상세 진단 리포트
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 font-extrabold">
                            {wordSyllableGroups.length}단어 · {syllableDiagnostics.length}음절 분석
                          </span>
                          {hasEvaluatedReport && reportSummary.avgScore > 0 && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                reportSummary.avgScore >= 80
                                  ? 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300'
                                  : reportSummary.avgScore >= 60
                                  ? 'bg-amber-100 dark:bg-amber-900/70 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-900/70 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              평균 {reportSummary.avgScore}점
                            </span>
                          )}
                          {hasEvaluatedReport && reportSummary.inaccurateCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-black animate-pulse">
                              교정 필요 {reportSummary.inaccurateCount}음절
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                          부정확한 음절은 <span className="text-rose-600 dark:text-rose-400 font-bold">붉은색</span>으로 강조되며, 해당 오디오 구간만 즉시 재청취할 수 있습니다.
                        </p>
                      </div>
                    </div>

                    {/* Replay Pronounced Audio Segment Button (Always paired in Report Header) */}
                    <button
                      onClick={() => handleTogglePlayLatestAudio()}
                      disabled={!(trimmedAudioUrl || latestRecordedAudioUrl) || isListening}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs active:scale-95 shrink-0 ${
                        !(trimmedAudioUrl || latestRecordedAudioUrl) || isListening
                          ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                          : isPlayingLatestAudio && !playingSyllableId
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                      title="무음이 제거된 내 발음 오디오 구간 전체를 다시 듣습니다"
                    >
                      {isPlayingLatestAudio && !playingSyllableId ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>전체 구간 정지</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>전체 발음 다시 듣기</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Summary Metrics Row (4 KPIs including Red Inaccurate Syllable Count) */}
                  {hasEvaluatedReport && reportSummary.avgScore > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/70 text-center">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                          음절 평균 정확도
                        </span>
                        <span
                          className={`text-sm sm:text-base font-black ${
                            reportSummary.avgScore >= 80
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : reportSummary.avgScore >= 60
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {reportSummary.avgScore}점
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-emerald-200/80 dark:border-emerald-800/50 text-center">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                          정확 발음 음절
                        </span>
                        <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                          {reportSummary.matchedCount} / {syllableDiagnostics.length}
                        </span>
                      </div>

                      <div
                        className={`p-2 rounded-xl border text-center ${
                          reportSummary.inaccurateCount > 0
                            ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700'
                            : 'bg-white dark:bg-slate-900/80 border-slate-200/70 dark:border-slate-700/70'
                        }`}
                      >
                        <span
                          className={`text-[10px] font-bold block ${
                            reportSummary.inaccurateCount > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          부정확 음절(붉은색)
                        </span>
                        <span
                          className={`text-sm sm:text-base font-black ${
                            reportSummary.inaccurateCount > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {reportSummary.inaccurateCount}개
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/70 text-center">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                          강세(Stress) 정확도
                        </span>
                        <span className="text-sm sm:text-base font-black text-purple-600 dark:text-purple-400">
                          {reportSummary.stressScore}점
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center justify-between gap-2">
                      <span>🎙️ 마이크를 켜고 발음하면 단어·음절별 정확도 시각화와 부정확 구간(붉은색) 즉시 재청취가 활성화됩니다.</span>
                    </div>
                  )}

                  {/* 1. VISUAL WORD & SYLLABLE ACCURACY BREAKDOWN MAP (단어·문장의 음절별 정확도 시각화 맵) */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>단어·음절별 시각적 정확도 맵 (음절 터치 시 해당 구간 즉시 재청취)</span>
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          정확(75점↑)
                        </span>
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          부정확·교정 필요(붉은색)
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-stretch gap-2">
                      {wordSyllableGroups.map((group) => (
                        <div
                          key={`word-group-${group.wordIndex}-${group.word}`}
                          className={`p-2 rounded-xl border flex flex-col gap-1.5 transition-all ${
                            group.hasInaccurate
                              ? 'bg-rose-50/60 dark:bg-rose-950/25 border-rose-300 dark:border-rose-700/80'
                              : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/70'
                          }`}
                        >
                          {/* Word Header with Native Listen */}
                          <div className="flex items-center justify-between gap-2 px-1">
                            <span
                              className={`text-[11px] font-black tracking-tight ${
                                group.hasInaccurate
                                  ? 'text-rose-700 dark:text-rose-300'
                                  : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {group.word}
                            </span>
                            <button
                              type="button"
                              onClick={() => speechService.speakOnce(group.word)}
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                              title={`'${group.word}' 원어민 발음 듣기`}
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>원어민</span>
                            </button>
                          </div>

                          {/* Segmented Syllables inside Word */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {group.syllables.map((syl, sIdx) => {
                              const isInaccurate = isSyllableInaccurate(syl);
                              const hasScore = syl.accuracyScore > 0;
                              const isPlayingThisSyl = playingSyllableId === syl.id;
                              const isSelected = selectedSyllableId === syl.id;
                              const hasAudio = Boolean(trimmedAudioUrl || latestRecordedAudioUrl);

                              return (
                                <React.Fragment key={syl.id}>
                                  {sIdx > 0 && (
                                    <span className="text-slate-300 dark:text-slate-600 font-mono text-xs select-none">
                                      ·
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSyllableId(syl.id);
                                      if (hasAudio && !isListening) {
                                        handlePlaySyllableSegment(syl);
                                      }
                                    }}
                                    className={`group relative px-2.5 py-1.5 rounded-lg border text-left transition-all active:scale-95 flex flex-col gap-1 min-w-[68px] ${
                                      isInaccurate
                                        ? 'bg-rose-500/15 dark:bg-rose-950/80 border-rose-500 dark:border-rose-500 text-rose-700 dark:text-rose-200 ring-2 ring-rose-500/25 shadow-xs'
                                        : hasScore
                                        ? 'bg-emerald-500/10 dark:bg-emerald-950/50 border-emerald-400/70 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    } ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
                                    title={
                                      hasAudio
                                        ? `'${syl.syllable}' 발음 구간(${getSyllableTimeRangeLabel(syl)}) 즉시 재청취`
                                        : `'${syl.syllable}' 음절 선택`
                                    }
                                  >
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span
                                        className={`font-mono font-black text-xs sm:text-sm ${
                                          isInaccurate
                                            ? 'text-rose-600 dark:text-rose-300 underline decoration-rose-500 decoration-wavy underline-offset-2'
                                            : ''
                                        }`}
                                      >
                                        {syl.syllable}
                                      </span>
                                      {syl.isPrimaryStress && (
                                        <span className="text-[9px] text-purple-500 font-bold" title="제1강세">
                                          ⚡
                                        </span>
                                      )}
                                      {hasAudio && (
                                        <span
                                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                            isPlayingThisSyl
                                              ? 'bg-rose-600 text-white animate-pulse'
                                              : isInaccurate
                                              ? 'bg-rose-600 text-white group-hover:bg-rose-500'
                                              : 'bg-indigo-600/90 text-white group-hover:bg-indigo-500'
                                          }`}
                                        >
                                          {isPlayingThisSyl ? (
                                            <Pause className="w-2.5 h-2.5" />
                                          ) : (
                                            <Play className="w-2.5 h-2.5 fill-current" />
                                          )}
                                        </span>
                                      )}
                                    </div>

                                    {/* Mini Visual Accuracy Bar + Score */}
                                    <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-500 ${
                                          !hasScore
                                            ? 'bg-slate-400'
                                            : isInaccurate
                                            ? 'bg-rose-500'
                                            : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${hasScore ? syl.accuracyScore : 0}%` }}
                                      />
                                    </div>

                                    <div className="flex items-center justify-between gap-1 text-[9px] font-mono">
                                      <span
                                        className={`font-black ${
                                          !hasScore
                                            ? 'text-slate-400'
                                            : isInaccurate
                                            ? 'text-rose-600 dark:text-rose-300'
                                            : 'text-emerald-600 dark:text-emerald-400'
                                        }`}
                                      >
                                        {hasScore ? `${syl.accuracyScore}점` : '대기'}
                                      </span>
                                      {hasAudio && (
                                        <span className="text-slate-400 dark:text-slate-500">
                                          {isPlayingThisSyl ? '재생중' : '재청취'}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. RED CALLOUT BANNER FOR INACCURATE SYLLABLES (발음 부정확 음절 붉은색 집중 강조 & 즉시 재청취 바) */}
                  {hasEvaluatedReport && inaccurateSyllables.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-500/10 dark:bg-rose-950/50 border-2 border-rose-500/70 dark:border-rose-500/60 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span className="text-xs font-black text-rose-700 dark:text-rose-200">
                            발음이 부정확한 음절 ({inaccurateSyllables.length}개) — 해당 구간만 즉시 재청취하며 교정하세요
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowOnlyInaccurate((prev) => !prev)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all ${
                            showOnlyInaccurate
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-700 hover:bg-rose-50'
                          }`}
                        >
                          {showOnlyInaccurate ? '전체 음절 리포트 보기' : `부정확 음절(${inaccurateSyllables.length}개)만 필터링`}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {inaccurateSyllables.map((syl) => {
                          const isPlayingThisSyl = playingSyllableId === syl.id;
                          const hasAudio = Boolean(trimmedAudioUrl || latestRecordedAudioUrl);
                          return (
                            <button
                              key={`inaccurate-quick-${syl.id}`}
                              type="button"
                              disabled={!hasAudio || isListening}
                              onClick={() => handlePlaySyllableSegment(syl)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 border ${
                                !hasAudio || isListening
                                  ? 'bg-rose-100/60 dark:bg-rose-950/40 text-rose-400 border-rose-300/50 cursor-not-allowed'
                                  : isPlayingThisSyl
                                  ? 'bg-rose-700 text-white border-rose-400 animate-pulse ring-2 ring-rose-400'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-sm'
                              }`}
                              title={`부정확 음절 [${syl.syllable}] 녹음 구간(${getSyllableTimeRangeLabel(syl)}) 즉시 재청취`}
                            >
                              {isPlayingThisSyl ? (
                                <Pause className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                              )}
                              <span className="font-mono">[{syl.syllable}]</span>
                              <span className="px-1.5 py-0.2 rounded bg-black/25 text-[10px] font-mono">
                                {syl.accuracyScore}점
                              </span>
                              <span className="text-[10px] opacity-95 underline">
                                {isPlayingThisSyl ? '구간 정지' : `구간 재청취 (${getSyllableTimeRangeLabel(syl)})`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Syllable-by-Syllable Detailed Diagnostic Cards */}
                  <div className="space-y-2">
                    {displayedSyllableDiagnostics.map((syl, idx) => {
                      const isSelected = selectedSyllableId === syl.id;
                      const isPlayingThisSyl = playingSyllableId === syl.id;
                      const hasAudio = Boolean(trimmedAudioUrl || latestRecordedAudioUrl);
                      const hasScore = syl.accuracyScore > 0;
                      const isInaccurate = isSyllableInaccurate(syl);

                      const scoreColorClass = !hasScore
                        ? 'text-slate-400 dark:text-slate-500'
                        : isInaccurate
                        ? 'text-rose-600 dark:text-rose-400'
                        : syl.accuracyScore >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400';

                      const barColorClass = !hasScore
                        ? 'bg-slate-300 dark:bg-slate-700'
                        : isInaccurate
                        ? 'bg-rose-500'
                        : syl.accuracyScore >= 80
                        ? 'bg-emerald-500'
                        : 'bg-amber-500';

                      return (
                        <div
                          key={syl.id}
                          onClick={() => setSelectedSyllableId(syl.id)}
                          className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                            isInaccurate
                              ? isSelected
                                ? 'bg-rose-100/90 dark:bg-rose-950/75 border-rose-500 dark:border-rose-400 ring-2 ring-rose-500/50 shadow-sm'
                                : 'bg-rose-50/85 dark:bg-rose-950/45 border-rose-400 dark:border-rose-600/80 hover:border-rose-500'
                              : isSelected
                              ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-500 ring-1 ring-indigo-400/50'
                              : 'bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-700'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Left: Syllable Index, Text (Red when inaccurate), Parent Word, Stress & Status Badge */}
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isInaccurate
                                    ? 'bg-rose-200/80 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                #{syl.index + 1}
                              </span>
                              <span
                                className={`text-sm sm:text-base font-black font-mono ${
                                  isInaccurate
                                    ? 'text-rose-600 dark:text-rose-300 underline decoration-rose-500 decoration-wavy underline-offset-2'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                [{syl.syllable}]
                              </span>
                              {syllableDiagnostics.length > 1 && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                                  ({syl.word})
                                </span>
                              )}
                              {syl.isPrimaryStress && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold">
                                  <Zap className="w-2.5 h-2.5 fill-current" />
                                  <span>제1강세</span>
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                                  !hasScore
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    : isInaccurate
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : syl.status === 'matched'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                                }`}
                              >
                                {isInaccurate ? `🚨 ${syl.statusLabel}` : syl.statusLabel}
                              </span>
                            </div>

                            {/* Right: Syllable Accuracy Score + Instant Segment Replay & Native Listen Buttons */}
                            <div className="flex items-center gap-1.5 ml-auto">
                              <div className="text-right mr-1">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mr-1">
                                  정확도
                                </span>
                                <span className={`text-sm sm:text-base font-black font-mono ${scoreColorClass}`}>
                                  {hasScore ? `${syl.accuracyScore}점` : '측정 전'}
                                </span>
                              </div>

                              {/* Replay This Syllable's Pronounced Audio Segment Immediately */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlaySyllableSegment(syl);
                                }}
                                disabled={!hasAudio || isListening}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all active:scale-95 ${
                                  !hasAudio || isListening
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                    : isPlayingThisSyl
                                    ? 'bg-rose-700 text-white animate-pulse ring-2 ring-rose-400 shadow-xs'
                                    : isInaccurate
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-500/30 shadow-xs'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                                }`}
                                title={`'${syl.syllable}' 발음 오디오 구간(${getSyllableTimeRangeLabel(syl)}) 즉시 재청취`}
                              >
                                {isPlayingThisSyl ? (
                                  <>
                                    <Pause className="w-3 h-3" />
                                    <span>구간 정지</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>해당 구간 재청취</span>
                                  </>
                                )}
                              </button>

                              {/* Native Pronunciation for the Word */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speechService.speakOnce(syl.word);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition-all active:scale-95"
                                title={`'${syl.word}' 원어민 발음 듣기`}
                              >
                                <Volume2 className="w-3 h-3" />
                                <span className="hidden xs:inline">원어민</span>
                              </button>
                            </div>
                          </div>

                          {/* Accuracy Progress Bar & Acoustic Energy + Time Window Comparison */}
                          <div className="mt-2 space-y-1">
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${barColorClass}`}
                                style={{ width: `${hasScore ? syl.accuracyScore : 0}%` }}
                              />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                              <span
                                className={`leading-snug font-medium ${
                                  isInaccurate
                                    ? 'text-rose-700 dark:text-rose-200 font-bold'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {syl.feedback}
                              </span>
                              <span className="font-mono shrink-0 text-[10px] bg-white/80 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                                구간 {getSyllableTimeRangeLabel(syl)} · 원어민 {Math.round(syl.aiPeak * 100)}% / 내 성량{' '}
                                {alignedUserSamples.length > 0 ? `${Math.round(syl.userPeak * 100)}%` : '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Recent Recordings Tab View */
            <div className="space-y-3 min-h-[220px] flex flex-col justify-between">
              {recentRecordings.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mb-2.5">
                    <History className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    저장된 최근 녹음이 없습니다
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-xs">
                    '실시간 발음 측정' 탭에서 마이크 버튼을 누르고 연습하면 최근 3개의 음성 녹음이 자동 저장됩니다.
                  </p>
                  <button
                    onClick={() => setActiveTab('practice')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md"
                  >
                    지금 발음 연습하기
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex justify-between items-center">
                    <span>최근 연습한 3개의 음성을 다시 들으며 비교할 수 있습니다.</span>
                    <span className="text-[11px] font-bold text-indigo-500">{recentRecordings.length} / 3</span>
                  </p>

                  {recentRecordings.map((snippet) => (
                    <div
                      key={snippet.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-2 relative transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                            ⏰ {snippet.timestamp}
                          </span>
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                            "{snippet.targetText}"
                          </p>
                        </div>

                        {snippet.score !== undefined && (
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${
                            snippet.score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {snippet.score}점
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl font-medium border border-slate-200/40 dark:border-slate-800/40">
                        🎙️ 인식: "{snippet.transcript}"
                      </p>

                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1.5">
                          {/* Play My Voice */}
                          <button
                            onClick={() => handlePlaySnippet(snippet)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm ${
                              playingSnippetId === snippet.id
                                ? 'bg-rose-500 text-white animate-pulse'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            {playingSnippetId === snippet.id ? (
                              <>
                                <Pause className="w-3.5 h-3.5" />
                                <span>정지</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>내 녹음</span>
                              </>
                            )}
                          </button>

                          {/* Listen Target English Voice */}
                          <button
                            onClick={() => speechService.playItem(`snippet-target-${snippet.id}`, snippet.targetText)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all"
                            title="원어민 표적 음성과 비교 청취"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>원어민 비교</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteSnippet(snippet.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                          title="녹음 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Bottom Footer */}
        <div className="shrink-0 px-4 py-2.5 sm:px-6 sm:py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between gap-2">
          {activeTab === 'practice' && browserSupported ? (
            <button
              onClick={isListening ? handleStopListening : handleStartListening}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isListening ? '녹음 중지' : '다시 녹음 측정'}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all ml-auto"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};

