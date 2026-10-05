import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  Award,
  ChevronUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { speechService } from '../services/speechService';
import { PronunciationResult } from '../types';
import { AudioWaveform } from './AudioWaveform';
import { recordPronunciationDone } from '../services/habitQuestService';
import {
  getVoiceHistoryForTarget,
  saveVoiceRecordingForTarget,
  SavedVoiceSnapshot,
} from '../services/voiceHistoryService';
import {
  createLiveSilenceDetector,
  decodeAndExtractVoiceSegment,
  LiveSilenceDetector,
  SilenceStopReason,
  VoiceSegmentResult,
} from '../utils/audioWaveformUtils';

interface InlinePronunciationWaveformProps {
  targetText: string;
  onClose: () => void;
  onSuccessEvaluation?: () => void;
}

export const InlinePronunciationWaveform: React.FC<InlinePronunciationWaveformProps> = ({
  targetText,
  onClose,
  onSuccessEvaluation,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null);
  const [latestRecordedAudioUrl, setLatestRecordedAudioUrl] = useState<string | null>(null);
  const [trimmedAudioUrl, setTrimmedAudioUrl] = useState<string | null>(null);
  const [userVoiceSegment, setUserVoiceSegment] = useState<VoiceSegmentResult | null>(null);
  const [restoredWaveformData, setRestoredWaveformData] = useState<number[]>([]);
  const [previousVoiceSnapshot, setPreviousVoiceSnapshot] = useState<SavedVoiceSnapshot | null>(null);
  const [isPlayingLatestAudio, setIsPlayingLatestAudio] = useState(false);
  const [isPlayingTargetAudio, setIsPlayingTargetAudio] = useState(false);
  const [autoStopReason, setAutoStopReason] = useState<SilenceStopReason | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const silenceDetectorRef = useRef<LiveSilenceDetector | null>(null);

  const latestTranscriptRef = useRef<string>('');
  const latestScoreRef = useRef<number | undefined>(undefined);
  const latestAudioBlobRef = useRef<Blob | null>(null);
  const latestVoiceSegmentRef = useRef<VoiceSegmentResult | null>(null);

  // Restore last recorded voice for this targetText when mounted or targetText changes
  useEffect(() => {
    if (!targetText) return;
    let cancelled = false;
    setLatestRecordedAudioUrl(null);
    setTrimmedAudioUrl(null);
    setUserVoiceSegment(null);
    setRestoredWaveformData([]);
    setPreviousVoiceSnapshot(null);

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
          setTranscript((prev) => prev || rec.latest.transcript!);
        }
        if (rec.previous) {
          setPreviousVoiceSnapshot(rec.previous);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [targetText]);

  // Stop background audio whenever mounted or unmounted
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
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
      }
      if (silenceDetectorRef.current) {
        silenceDetectorRef.current.stop();
        silenceDetectorRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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

            recordPronunciationDone();

            if (evalResult.score >= 80 && onSuccessEvaluation) {
              onSuccessEvaluation();
            }
          }
        };

        reco.onerror = (event: any) => {
          console.warn('SpeechRecognition error in inline waveform:', event.error);
          stopListeningInternal();
        };

        reco.onend = () => {
          // If recognition ended and interim transcript was recorded but not finalized
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
  }, [targetText, onSuccessEvaluation]);

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
   * User clicks mic: immediately cut off any active sound and begin recording
   */
  const handleStartListening = async () => {
    speechService.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
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

    // Shift existing latest recording to previousVoiceSnapshot so user can compare right away
    getVoiceHistoryForTarget(targetText)
      .then((rec) => {
        if (rec?.latest) {
          setPreviousVoiceSnapshot(rec.latest);
        }
      })
      .catch(() => {});

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

            // If user spoke and paused, evaluate accumulated speech before shutting down
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

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-2.5 pt-2.5 border-t-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-2xl bg-indigo-50/40 dark:bg-slate-950/70 p-2.5 sm:p-4 space-y-2.5 transition-all duration-300 animate-in fade-in slide-in-from-top-2"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <h5 className="text-xs font-black text-indigo-950 dark:text-indigo-200 truncate">
            실시간 발음 파형 비교
          </h5>
          <span className="hidden xs:inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
            VAD 구간 추출
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-[11px] font-bold transition-all shrink-0"
          title="파형 패널 접기"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span>접기</span>
        </button>
      </div>

      {/* Action Controls Bar (Placed Above Waveform for Mobile Ergonomics) */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Native Audio Listen */}
          <button
            onClick={handleListenTargetOnce}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-sm active:scale-95 ${
              isPlayingTargetAudio
                ? 'bg-emerald-600 text-white animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isPlayingTargetAudio ? '재생 중...' : '원어민 듣기'}</span>
          </button>

          {/* User Voice Record Button */}
          {browserSupported && (
            <button
              onClick={isListening ? handleStopListening : handleStartListening}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-sm active:scale-95 ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>녹음 완료</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>발음 녹음하기</span>
                </>
              )}
            </button>
          )}

          {/* User Recorded Audio Playback */}
          {latestRecordedAudioUrl && (
            <button
              onClick={() => handleTogglePlayLatestAudio()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-sm"
            >
              {isPlayingLatestAudio ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-indigo-500" />
                  <span>정지</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-indigo-500" />
                  <span>내 목소리</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Evaluation Score Badge */}
        {result && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 shadow-sm">
            <Award className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-black text-slate-900 dark:text-white">
              일치도:
            </span>
            <span
              className={`text-xs font-black ${
                result.score >= 80 ? 'text-emerald-500' : 'text-amber-500'
              }`}
            >
              {result.score}점
            </span>
          </div>
        )}
      </div>

      {/* Realtime Waveform Display Canvas */}
      <div className="overflow-hidden rounded-2xl">
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
        />
      </div>

      {/* Recognition State Message */}
      {isListening && (
        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-[11px] font-bold flex items-center justify-between gap-1.5 animate-pulse">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span>🎙️ 마이크로 표적 문장을 발음하세요.</span>
          </div>
          <span className="text-[10px] font-mono opacity-80 shrink-0">
            발화 후 무음 시 자동 완료
          </span>
        </div>
      )}

      {/* Notice if auto-stopped due to initial silence without speech */}
      {autoStopReason === 'initial_silence' && !isListening && !result && (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span>음성이 감지되지 않아 녹음이 자동 종료되었습니다. 다시 마이크를 누르고 말씀해 보세요.</span>
        </div>
      )}

      {/* Transcript feedback */}
      {transcript && !isListening && (
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
          <span className="font-bold text-slate-400 dark:text-slate-500 mr-1.5">
            인식된 음성:
          </span>
          <span className="font-extrabold text-indigo-600 dark:text-indigo-300">
            "{transcript}"
          </span>
          {result?.feedback && (
            <p className="mt-1 text-slate-600 dark:text-slate-400 font-medium">
              💡 {result.feedback}
            </p>
          )}
        </div>
      )}

      {!browserSupported && (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>현재 브라우저는 실시간 음성 인식을 지원하지 않습니다. Chrome/Safari 환경을 권장합니다.</span>
        </div>
      )}
    </div>
  );
};
