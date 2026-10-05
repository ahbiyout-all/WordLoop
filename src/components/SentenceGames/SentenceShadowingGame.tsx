import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Volume2,
  Mic,
  MicOff,
  Sparkles,
  Trophy,
  Star,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  HelpCircle,
  Volume1,
  Award,
  Play,
  Pause,
  Eye,
  Layers,
  Activity,
  Info,
  Check,
  X,
  Radio,
} from 'lucide-react';
import { SentenceItem, PronunciationResult, WordMatch } from '../../types';
import { speechService } from '../../services/speechService';
import { AudioWaveform } from '../AudioWaveform';
import {
  getVoiceHistoryForTarget,
  saveVoiceRecordingForTarget,
  SavedVoiceSnapshot,
} from '../../services/voiceHistoryService';
import {
  createLiveSilenceDetector,
  decodeAndExtractVoiceSegment,
  LiveSilenceDetector,
  SilenceStopReason,
  VoiceSegmentResult,
} from '../../utils/audioWaveformUtils';

interface SentenceShadowingGameProps {
  sentences: SentenceItem[];
  gradeName: string;
  onUpdateHighScore?: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit?: () => void;
}

interface SpokenWordToken {
  word: string;
  isMatched: boolean;
  targetIndex?: number;
}

export const SentenceShadowingGame: React.FC<SentenceShadowingGameProps> = ({
  sentences,
  gradeName,
  onUpdateHighScore,
  onChangeMastery,
  onQuit,
}) => {
  const [shuffledSentences, setShuffledSentences] = useState<SentenceItem[]>(() => {
    const list = sentences.filter((s) => s.text && s.text.trim().length > 0);
    return [...list].sort(() => 0.5 - Math.random());
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [liveInterimText, setLiveInterimText] = useState('');
  const [recognizedText, setRecognizedText] = useState('');
  const [evaluation, setEvaluation] = useState<PronunciationResult | null>(null);
  const [fallbackInput, setFallbackInput] = useState('');
  const [micSupported, setMicSupported] = useState(true);

  useEffect(() => {
    const list = sentences.filter((s) => s.text && s.text.trim().length > 0);
    setShuffledSentences([...list].sort(() => 0.5 - Math.random()));
    setCurrentIndex(0);
  }, [sentences]);

  // Audio Recording (User's actual voice playback & waveform)
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null);
  const [isPlayingTargetAudio, setIsPlayingTargetAudio] = useState(false);
  const [autoStopReason, setAutoStopReason] = useState<SilenceStopReason | null>(null);
  const [trimmedAudioUrl, setTrimmedAudioUrl] = useState<string | null>(null);
  const [userVoiceSegment, setUserVoiceSegment] = useState<VoiceSegmentResult | null>(null);
  const [restoredWaveformData, setRestoredWaveformData] = useState<number[]>([]);
  const [previousVoiceSnapshot, setPreviousVoiceSnapshot] = useState<SavedVoiceSnapshot | null>(null);

  const userAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceDetectorRef = useRef<LiveSilenceDetector | null>(null);
  const latestAudioBlobRef = useRef<Blob | null>(null);
  const latestVoiceSegmentRef = useRef<VoiceSegmentResult | null>(null);
  const latestScoreValueRef = useRef<number | undefined>(undefined);

  // Detailed visual view mode
  const [showPhonicsTips, setShowPhonicsTips] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');

  const recognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');

  const currentSentence = shuffledSentences[currentIndex] || shuffledSentences[0];

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicSupported(false);
    }
  }, []);

  // Cleanup audio player and silence detector on unmount ONLY (never on userAudioUrl state change!)
  useEffect(() => {
    return () => {
      if (userAudioPlayerRef.current) {
        userAudioPlayerRef.current.pause();
        userAudioPlayerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (silenceDetectorRef.current) {
        silenceDetectorRef.current.stop();
        silenceDetectorRef.current = null;
      }
    };
  }, []);

  // Reset state when sentence changes & restore last saved voice recording from IndexedDB
  useEffect(() => {
    setLiveInterimText('');
    setRecognizedText('');
    setEvaluation(null);
    setFallbackInput('');
    setIsRecording(false);
    latestTranscriptRef.current = '';
    latestAudioBlobRef.current = null;
    latestVoiceSegmentRef.current = null;
    latestScoreValueRef.current = undefined;
    setAutoStopReason(null);
    setTrimmedAudioUrl(null);
    setUserVoiceSegment(null);
    setRestoredWaveformData([]);
    setPreviousVoiceSnapshot(null);

    if (silenceDetectorRef.current) {
      silenceDetectorRef.current.stop();
      silenceDetectorRef.current = null;
    }

    if (userAudioPlayerRef.current) {
      userAudioPlayerRef.current.pause();
      setIsPlayingUserAudio(false);
    }
    setUserAudioUrl(null);

    let cancelled = false;
    if (currentSentence) {
      speechService.speakOnce(currentSentence.text);

      getVoiceHistoryForTarget(currentSentence.text)
        .then((rec) => {
          if (cancelled || !rec || !rec.latest) return;
          if (rec.latest.audioUrl) {
            setUserAudioUrl(rec.latest.audioUrl);
          }
          if (rec.latest.waveformSamples && rec.latest.waveformSamples.length > 0) {
            setRestoredWaveformData(rec.latest.waveformSamples);
          }
          if (rec.previous) {
            setPreviousVoiceSnapshot(rec.previous);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [currentIndex, currentSentence]);

  // Start recording with speech recognition + MediaRecorder
  const startRecording = async () => {
    // 1. Immediately stop any AI speech, previous recording session, and playing user audio
    speechService.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (userAudioPlayerRef.current) {
      userAudioPlayerRef.current.pause();
      userAudioPlayerRef.current = null;
    }
    if (silenceDetectorRef.current) {
      silenceDetectorRef.current.stop();
      silenceDetectorRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
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

    setIsPlayingUserAudio(false);
    setIsPlayingTargetAudio(false);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicSupported(false);
      return;
    }

    // Reset previous audio & transcript
    setLiveInterimText('');
    setRecognizedText('');
    setEvaluation(null);
    setAutoStopReason(null);
    setTrimmedAudioUrl(null);
    setUserVoiceSegment(null);
    setRestoredWaveformData([]);
    setUserAudioUrl(null);
    latestTranscriptRef.current = '';
    latestAudioBlobRef.current = null;
    latestVoiceSegmentRef.current = null;
    latestScoreValueRef.current = undefined;

    // Move existing latest recording in history to previousVoiceSnapshot so user can compare right away
    if (currentSentence) {
      getVoiceHistoryForTarget(currentSentence.text)
        .then((rec) => {
          if (rec?.latest) {
            setPreviousVoiceSnapshot(rec.latest);
          }
        })
        .catch(() => {});
    }

    // Try starting MediaRecorder for audio playback & waveform
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setActiveMediaStream(stream);

        let capturedValidTrimmedWav = false;

        // Intelligently monitor audio stream for silence adapted to sentence length
        silenceDetectorRef.current = createLiveSilenceDetector({
          stream,
          targetText: currentSentence.text,
          onVoiceSegmentReady: (segResult) => {
            if (segResult && segResult.detected && segResult.durationSec >= 0.2) {
              capturedValidTrimmedWav = true;
              latestVoiceSegmentRef.current = segResult;
              setUserVoiceSegment(segResult);
              if (segResult.trimmedAudioUrl) {
                setTrimmedAudioUrl(segResult.trimmedAudioUrl);
                setUserAudioUrl((prev) => prev || segResult.trimmedAudioUrl!);
              }
            }
          },
          onSilenceTimeout: (reason) => {
            setAutoStopReason(reason);

            if (reason === 'trailing_silence' && latestTranscriptRef.current && !evaluation) {
              setRecognizedText(latestTranscriptRef.current);
              evaluateSpeech(latestTranscriptRef.current);
            }

            stopRecording();
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
            const rawUrl = URL.createObjectURL(audioBlob);
            // Always store the native MediaRecorder URL in userAudioUrl as a rock-solid playback source
            setUserAudioUrl(rawUrl);

            // If live PCM captured a segment, persist right away
            if (capturedValidTrimmedWav && currentSentence) {
              saveVoiceRecordingForTarget({
                targetText: currentSentence.text,
                audioBlob,
                voiceSegment: latestVoiceSegmentRef.current,
                score: latestScoreValueRef.current,
                transcript: latestTranscriptRef.current || undefined,
              })
                .then((saved) => {
                  if (saved?.previous) {
                    setPreviousVoiceSnapshot(saved.previous);
                  }
                })
                .catch(() => {});
            }

            // If live PCM didn't capture a valid voice segment, decode the recorded Blob cleanly
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
                  if (currentSentence) {
                    saveVoiceRecordingForTarget({
                      targetText: currentSentence.text,
                      audioBlob,
                      voiceSegment: decodedSeg,
                      score: latestScoreValueRef.current,
                      transcript: latestTranscriptRef.current || undefined,
                    })
                      .then((saved) => {
                        if (saved?.previous) {
                          setPreviousVoiceSnapshot(saved.previous);
                        }
                      })
                      .catch(() => {});
                  }
                })
                .catch(() => {});
            }
          }
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
          setActiveMediaStream(null);
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
      } catch (mediaErr) {
        console.warn('Microphone MediaRecorder error:', mediaErr);
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        const combined = (finalTranscript || currentInterim || '').trim();
        if (combined) {
          setLiveInterimText(combined);
          latestTranscriptRef.current = combined;
        }

        if (event.results[0] && event.results[0].isFinal) {
          const transcript = event.results[0][0].transcript;
          setRecognizedText(transcript);
          evaluateSpeech(transcript);
          stopRecording();
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (latestTranscriptRef.current) {
          setRecognizedText(latestTranscriptRef.current);
          evaluateSpeech(latestTranscriptRef.current);
        }
        stopRecording();
      };

      recognition.onend = () => {
        if (latestTranscriptRef.current && !evaluation) {
          setRecognizedText(latestTranscriptRef.current);
          evaluateSpeech(latestTranscriptRef.current);
        }
        stopRecording();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start recognition:', err);
      stopRecording();
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (silenceDetectorRef.current) {
      const segResult = silenceDetectorRef.current.stop();
      if (segResult && segResult.detected && segResult.durationSec >= 0.2) {
        setUserVoiceSegment(segResult);
        if (segResult.trimmedAudioUrl) {
          setTrimmedAudioUrl(segResult.trimmedAudioUrl);
          setUserAudioUrl((prev) => prev || segResult.trimmedAudioUrl!);
        }
      }
      silenceDetectorRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  };

  const evaluateSpeech = (text: string) => {
    if (!currentSentence || !text.trim()) return;
    const result = speechService.evaluatePronunciation(currentSentence.text, text);
    setEvaluation(result);
    latestScoreValueRef.current = result.score;

    saveVoiceRecordingForTarget({
      targetText: currentSentence.text,
      audioBlob: latestAudioBlobRef.current,
      voiceSegment: latestVoiceSegmentRef.current,
      score: result.score,
      transcript: text.trim(),
    })
      .then((saved) => {
        if (saved?.previous) {
          setPreviousVoiceSnapshot(saved.previous);
        }
      })
      .catch(() => {});

    if (result.score >= 60) {
      const points = result.score >= 90 ? 30 : result.score >= 75 ? 20 : 10;
      const nextScore = score + points;
      setScore(nextScore);
      if (onUpdateHighScore) onUpdateHighScore(nextScore);
      if (onChangeMastery) onChangeMastery(currentSentence.id, 2);
    }
  };

  // Fallback submit for typing practice
  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackInput.trim() || !currentSentence) return;
    setRecognizedText(fallbackInput);
    evaluateSpeech(fallbackInput);
  };

  const handlePlayAudio = (speed: number = 0.9) => {
    if (currentSentence) {
      if (isRecording) {
        stopRecording();
      }
      setIsPlayingTargetAudio(true);
      speechService.speakWithCallbacks(currentSentence.text, {
        rate: speed,
        onStart: () => setIsPlayingTargetAudio(true),
        onEnd: () => setIsPlayingTargetAudio(false),
        onError: () => setIsPlayingTargetAudio(false),
      });
    }
  };

  const handlePlaySingleWord = (word: string) => {
    const clean = word.replace(/[^a-zA-Z]/g, '');
    if (clean) {
      speechService.speakOnce(clean);
    }
  };

  // Play user's recorded audio (prioritize silence-trimmed WAV so playback matches waveform 1:1, with automatic fallback to raw MediaRecorder URL)
  const handleTogglePlayUserAudio = (urlToPlay?: string) => {
    const primaryUrl = urlToPlay || trimmedAudioUrl || userAudioUrl;
    const fallbackUrl = userAudioUrl || trimmedAudioUrl;
    if (!primaryUrl) return;

    const isActuallyPlaying =
      isPlayingUserAudio &&
      userAudioPlayerRef.current &&
      !userAudioPlayerRef.current.paused &&
      !userAudioPlayerRef.current.ended;

    if (isActuallyPlaying) {
      userAudioPlayerRef.current?.pause();
      if (userAudioPlayerRef.current) {
        userAudioPlayerRef.current.currentTime = 0;
      }
      setIsPlayingUserAudio(false);
      return;
    }

    speechService.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTargetAudio(false);

    if (userAudioPlayerRef.current) {
      userAudioPlayerRef.current.pause();
      userAudioPlayerRef.current = null;
    }

    const playWithUrl = (src: string, allowFallback: boolean) => {
      const audio = new Audio(src);
      userAudioPlayerRef.current = audio;
      audio.onended = () => {
        setIsPlayingUserAudio(false);
      };
      audio.onerror = () => {
        if (allowFallback && fallbackUrl && fallbackUrl !== src) {
          playWithUrl(fallbackUrl, false);
        } else {
          setIsPlayingUserAudio(false);
        }
      };
      setIsPlayingUserAudio(true);
      audio.play().catch(() => {
        if (allowFallback && fallbackUrl && fallbackUrl !== src) {
          playWithUrl(fallbackUrl, false);
        } else {
          setIsPlayingUserAudio(false);
        }
      });
    };

    playWithUrl(primaryUrl, true);
  };

  const handleNext = () => {
    setLiveInterimText('');
    setRecognizedText('');
    setEvaluation(null);
    setFallbackInput('');
    setTrimmedAudioUrl(null);
    setUserVoiceSegment(null);
    if (userAudioUrl) {
      URL.revokeObjectURL(userAudioUrl);
      setUserAudioUrl(null);
    }
    if (currentIndex + 1 < shuffledSentences.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShuffledSentences((prev) => [...prev].sort(() => 0.5 - Math.random()));
      setCurrentIndex(0);
    }
  };

  // Process user spoken words for visual comparison
  const userSpokenTokens: SpokenWordToken[] = useMemo(() => {
    if (!recognizedText || !currentSentence) return [];

    const cleanTargetWords = currentSentence.text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    const spokenWords = recognizedText.split(/\s+/).filter(Boolean);

    return spokenWords.map((spoken) => {
      const cleanSpoken = spoken.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchIndex = cleanTargetWords.indexOf(cleanSpoken);
      return {
        word: spoken,
        isMatched: matchIndex !== -1,
        targetIndex: matchIndex !== -1 ? matchIndex : undefined,
      };
    });
  }, [recognizedText, currentSentence]);

  // Generate phonics / pronunciation guidance
  const phonicsTips = useMemo(() => {
    if (!currentSentence) return [];
    const text = currentSentence.text.toLowerCase();
    const tips: { topic: string; tip: string; example: string }[] = [];

    if (text.includes('th')) {
      tips.push({
        topic: 'TH [θ / ð] 발음',
        tip: '혀끝을 윗니와 아랫니 사이에 살짝 내밀고 바람을 부드럽게 통과시킵니다.',
        example: 'the, think, that, with',
      });
    }
    if (text.includes('r') || text.includes('l')) {
      tips.push({
        topic: 'R [r] vs L [l] 구별',
        tip: 'R은 혀가 입천장에 닿지 않고 둥글게 말고, L은 혀끝을 윗니 뒤 잇몸에 단단히 댑니다.',
        example: 'really, learn, play, world',
      });
    }
    if (text.includes('v') || text.includes('f')) {
      tips.push({
        topic: 'V [v] / F [f] 마찰음',
        tip: '윗니로 아랫입술을 가볍게 누르며 바람(성대 울림)을 냅니다.',
        example: 'very, have, for, first',
      });
    }
    if (text.includes('tion') || text.includes('sion')) {
      tips.push({
        topic: '-tion [ʃn] 접미사',
        tip: '입술을 둥글게 모으고 쉬- 소리를 내며 바로 n으로 연결합니다.',
        example: 'question, action, decision',
      });
    }

    tips.push({
      topic: '연음 & 억양 (Intonation & Linking)',
      tip: '자음으로 끝나는 단어 뒤에 모음으로 시작하는 단어가 오면 부드럽게 이어서 발음하세요.',
      example: 'read a book → [리-더-북]',
    });

    return tips;
  }, [currentSentence]);

  if (!currentSentence) {
    return (
      <div className="p-8 text-center text-slate-500">
        학습 가능한 문장 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto p-1.5 sm:p-4 space-y-2.5 sm:space-y-3 select-none pb-4">
      {/* Top Header Stats (Single-Line Mobile Friendly) */}
      <div className="flex items-center justify-between gap-1.5 px-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="px-2 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-black text-[11px] sm:text-xs truncate">
            🎙️ 쉐도잉 {currentIndex + 1}/{shuffledSentences.length}
          </span>
          <span className="text-[11px] font-bold text-slate-500 hidden xs:inline truncate">
            ({gradeName})
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowPhonicsTips((prev) => !prev)}
            className={`px-2 py-1 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all ${
              showPhonicsTips
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>발음 팁</span>
          </button>

          <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-[11px] sm:text-xs flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>{score}점</span>
          </div>
        </div>
      </div>

      {/* Target Sentence & Primary Action Controls Card (Unified Top Hub for Mobile) */}
      <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>원어민 음성을 듣고 따라 말하세요</span>
          </span>

          <button
            onClick={handleNext}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] inline-flex items-center gap-1 transition-all active:scale-95 shrink-0"
            title="다음 문장으로 이동"
          >
            <span>다음 문장</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* English Sentence Display */}
        <h2 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-snug sm:leading-relaxed break-words">
          {currentSentence.text}
        </h2>

        {/* Korean Meaning */}
        <p className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400">
          {currentSentence.meaning}
        </p>

        {/* Unified Audio Listen + Mic Recording Bar */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-1">
          <button
            onClick={() => handlePlayAudio(0.9)}
            className="px-2.5 py-2 sm:px-3 sm:py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-extrabold text-xs flex items-center gap-1 border border-indigo-200 dark:border-indigo-800 transition-all active:scale-95 shadow-xs"
          >
            <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>원어민 (1.0x)</span>
          </button>
          <button
            onClick={() => handlePlayAudio(0.75)}
            className="px-2.5 py-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
          >
            <Volume1 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>천천히 (0.75x)</span>
          </button>

          {/* Primary Mic Record / Stop Button right in the top card */}
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/30 animate-pulse ring-4 ring-rose-500/20 active:scale-95 transition-all"
            >
              <MicOff className="w-4 h-4 shrink-0" />
              <span>녹음 완료 & 판정</span>
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 active:scale-95 transition-all"
            >
              <Mic className="w-4 h-4 shrink-0" />
              <span>마이크 발음하기</span>
            </button>
          )}

          {userAudioUrl && !isRecording && (
            <button
              onClick={() => handleTogglePlayUserAudio()}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all shadow-xs active:scale-95 ${
                isPlayingUserAudio
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isPlayingUserAudio ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>정지</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>내 목소리</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Live Recording Status & Interim Transcript */}
        {isRecording && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-1 animate-pulse">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span>🎙️ 지금 영어로 말씀하세요 (발음 후 멈추면 자동 채점)</span>
            </div>
            {liveInterimText && (
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
                "{liveInterimText}"
              </p>
            )}
          </div>
        )}

        {/* Auto-stop Notice if initial silence */}
        {autoStopReason === 'initial_silence' && !isRecording && !evaluation && (
          <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>음성이 감지되지 않아 자동 종료되었습니다. 다시 마이크를 눌러 말씀해 보세요.</span>
          </div>
        )}

        {!micSupported && (
          <p className="text-[11px] text-amber-500 font-bold">
            ⚠️ 현재 브라우저에서 마이크 API가 제한되어 하단 텍스트 입력으로 연습할 수 있습니다.
          </p>
        )}
      </div>

      {/* Phonics & Pronunciation Tips Accordion */}
      {showPhonicsTips && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              이 문장의 발음 & 연음 핵심 가이드
            </span>
            <button
              onClick={() => setShowPhonicsTips(false)}
              className="p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {phonicsTips.map((tip, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-800/40 text-left space-y-0.5 shadow-xs"
              >
                <div className="text-[11px] font-black text-amber-800 dark:text-amber-300">
                  {tip.topic}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                  {tip.tip}
                </div>
                <div className="text-[10px] text-indigo-500 font-mono pt-0.5">
                  예: {tip.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* VISUAL PRONUNCIATION COMPARISON (Shown Immediately When Evaluated) */}
      {/* ==================================================== */}
      {evaluation && (
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in zoom-in-95 shadow-sm text-left">
          {/* Top Score Banner */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      evaluation.score >= star * 30
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span
                className={`text-sm sm:text-lg font-black ${
                  evaluation.score >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : evaluation.score >= 60
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }`}
              >
                {evaluation.score}점 ({evaluation.score >= 80 ? '탁월함' : evaluation.score >= 60 ? '양호' : '연습 필요'})
              </span>
            </div>

            {/* View Switcher: Visual Badges vs. Comparison Table */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('visual')}
                className={`px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'visual'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>비주얼 뷰</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>대조표</span>
              </button>
            </div>
          </div>

          {/* Score Progress Bar */}
          <div className="w-full h-1.5 sm:h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                evaluation.score >= 80
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                  : evaluation.score >= 60
                  ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                  : 'bg-gradient-to-r from-rose-400 to-rose-600'
              }`}
              style={{ width: `${Math.max(5, evaluation.score)}%` }}
            />
          </div>

          {/* 1. VISUAL MODE: Side-by-Side Word Badges */}
          {viewMode === 'visual' ? (
            <div className="space-y-2.5">
              {/* 1-A: Target Sentence Word-by-Word Matching Chips */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span>🎯 원문 단어별 판정 (터치 시 발음)</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">
                    일치: {evaluation.wordMatches.filter((w) => w.matched).length}/{evaluation.wordMatches.length}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {evaluation.wordMatches.map((wm, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePlaySingleWord(wm.word)}
                      title={`클릭하여 '${wm.word}' 표준 발음 듣기`}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all flex items-center gap-1 active:scale-95 group ${
                        wm.matched
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/20 ring-1 ring-rose-500/20'
                      }`}
                    >
                      <span>{wm.word}</span>
                      {wm.matched ? (
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Volume2 className="w-3 h-3 text-rose-500 group-hover:scale-110" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1-B: User Spoken Speech Transcript */}
              <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5 text-purple-500" />
                    <span>🗣️ 내가 말한 발음</span>
                  </span>
                  {userAudioUrl && (
                    <button
                      onClick={() => handleTogglePlayUserAudio()}
                      className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>내 녹음 재생</span>
                    </button>
                  )}
                </div>

                {userSpokenTokens.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1">
                    {userSpokenTokens.map((token, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold border ${
                          token.isMatched
                            ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {token.word}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    인식된 음성 텍스트가 없습니다.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* 2. TABLE MODE: Side-by-Side Detailed Alignment Table */
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-2.5">#</th>
                    <th className="py-2 px-2.5">원문 단어</th>
                    <th className="py-2 px-2.5">판정</th>
                    <th className="py-2 px-2.5 text-right">발음</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {evaluation.wordMatches.map((wm, idx) => (
                    <tr
                      key={idx}
                      className={
                        wm.matched
                          ? 'bg-emerald-50/30 dark:bg-emerald-950/20'
                          : 'bg-rose-50/30 dark:bg-rose-950/20'
                      }
                    >
                      <td className="py-1.5 px-2.5 font-mono text-slate-400">#{idx + 1}</td>
                      <td className="py-1.5 px-2.5 font-bold text-slate-900 dark:text-white font-mono">
                        {wm.word}
                      </td>
                      <td className="py-1.5 px-2.5">
                        {wm.matched ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            일치
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            불일치
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-right">
                        <button
                          onClick={() => handlePlaySingleWord(wm.word)}
                          className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] inline-flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>듣기</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Diagnostic Feedback */}
          <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/70 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 leading-relaxed">
              {evaluation.feedback}
            </p>
          </div>
        </div>
      )}

      {/* AUDIO WAVEFORM VISUALIZER (실시간 & 녹음 음파 시각화) */}
      <AudioWaveform
        audioUrl={userAudioUrl}
        userVoiceSegment={userVoiceSegment}
        userWaveformData={restoredWaveformData}
        previousVoiceSnapshot={previousVoiceSnapshot}
        isPlayingUserAudio={isPlayingUserAudio}
        onTogglePlayUserAudio={handleTogglePlayUserAudio}
        isRecording={isRecording}
        audioStream={activeMediaStream}
        targetText={currentSentence.text}
        onPlayTargetAudio={() => handlePlayAudio(0.9)}
        isPlayingTargetAudio={isPlayingTargetAudio}
        onStartMicRecording={startRecording}
        score={evaluation?.score}
        onTrimmedAudioExtracted={(url) => setTrimmedAudioUrl(url)}
        autoStopReason={autoStopReason}
        defaultLayout="overlay"
      />

      {/* Typing Fallback Input (Compact Bar) */}
      <form onSubmit={handleFallbackSubmit} className="flex gap-1.5 w-full">
        <input
          type="text"
          placeholder="마이크 대신 영어 문장을 직접 타이핑하여 테스트..."
          value={fallbackInput}
          onChange={(e) => setFallbackInput(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm shrink-0"
        >
          입력 판정
        </button>
      </form>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button
          onClick={() => {
            setLiveInterimText('');
            setRecognizedText('');
            setEvaluation(null);
            setTrimmedAudioUrl(null);
            setUserVoiceSegment(null);
            if (userAudioUrl) {
              URL.revokeObjectURL(userAudioUrl);
              setUserAudioUrl(null);
            }
            handlePlayAudio(0.9);
          }}
          className="px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>다시 연습</span>
        </button>

        <button
          onClick={handleNext}
          className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all active:scale-95"
        >
          <span>다음 문장 쉐도잉</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
