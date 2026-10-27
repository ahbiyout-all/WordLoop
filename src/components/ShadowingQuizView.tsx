import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Volume2,
  Mic,
  MicOff,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Award,
  Play,
  Pause,
  ArrowRight,
  Flame,
  Zap,
  Target,
  Trophy,
  Clock,
  Shuffle,
  Bookmark,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { speechService } from '../services/speechService';
import {
  createLiveSilenceDetector,
  LiveSilenceDetector,
  generateReferenceWaveform,
  alignUserWaveformToReference,
  analyzeSyllablesAndDiscrepancies,
  decodeAndExtractVoiceSegment,
  VoiceSegmentResult,
  createWavBlob,
} from '../utils/audioWaveformUtils';
import {
  analyzeSentencePhonemesAndWaveform,
  PhonemeDiagnostic,
  WaveformBarPhonemeColor,
} from '../utils/phonemeAnalysisUtils';
import { recordPronunciationDone } from '../services/habitQuestService';

export interface ShadowingQuizViewProps {
  initialTargetText: string;
  onClose?: () => void;
  onSuccessEvaluation?: () => void;
  onSwitchToPracticeTab?: (text?: string) => void;
}

// Preset recommended sentences across difficulty levels for shadowing quiz
const QUIZ_PRESETS = [
  { level: '초급', text: 'I would like to have a cup of coffee.' },
  { level: '초급', text: 'Practice makes perfect every single day.' },
  { level: '중급', text: 'Clear pronunciation leads to confident communication.' },
  { level: '중급', text: 'Could you please explain that in more detail?' },
  { level: '고급', text: 'Extraordinary achievements require consistent perseverance.' },
  { level: '고급', text: 'Technology continuously transforms our everyday lifestyle.' },
];

export const ShadowingQuizView: React.FC<ShadowingQuizViewProps> = ({
  initialTargetText,
  onClose,
  onSuccessEvaluation,
  onSwitchToPracticeTab,
}) => {
  const [quizText, setQuizText] = useState(initialTargetText || QUIZ_PRESETS[0].text);
  const [phase, setPhase] = useState<'idle' | 'listening_ai' | 'countdown' | 'recording_user' | 'evaluating' | 'result'>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [streakCombo, setStreakCombo] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState<boolean>(false);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [userWaveform, setUserWaveform] = useState<number[]>([]);
  const [selectedPhonemeId, setSelectedPhonemeId] = useState<string | null>(null);

  // References
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceDetectorRef = useRef<LiveSilenceDetector | null>(null);
  const speechStartTimeRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const activeAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const currentQuizTextRef = useRef<string>(quizText);
  currentQuizTextRef.current = quizText;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioSession();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const cleanupAudioSession = () => {
    speechService.stop();
    if (silenceDetectorRef.current) {
      silenceDetectorRef.current.stop();
      silenceDetectorRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      activeAudioPlayerRef.current = null;
    }
    setIsPlayingUserAudio(false);
  };

  // Web Audio sound effects (Chimes & Beeps)
  const playTone = (freq: number, type: OscillatorType, duration: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      setTimeout(() => ctx.close().catch(() => {}), (duration + 0.1) * 1000);
    } catch {}
  };

  const playSuccessFanfare = () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => playTone(f, 'sine', 0.28), idx * 110);
    });
  };

  // Generate Reference Waveform Profile
  const referenceProfile = useMemo(() => {
    return generateReferenceWaveform(quizText);
  }, [quizText]);

  // Compute Syllable & Phoneme Diagnostics
  const syllableDiagnostics = useMemo(() => {
    return analyzeSyllablesAndDiscrepancies(
      quizText,
      referenceProfile.samples,
      userWaveform.length > 0 ? userWaveform : new Array(50).fill(0.2),
      transcript || interimTranscript
    );
  }, [quizText, referenceProfile.samples, userWaveform, transcript, interimTranscript]);

  const phonemeAnalysis = useMemo(() => {
    return analyzeSentencePhonemesAndWaveform(
      quizText,
      syllableDiagnostics,
      userWaveform.length > 0 ? userWaveform : new Array(50).fill(0.2),
      referenceProfile.samples
    );
  }, [quizText, syllableDiagnostics, userWaveform, referenceProfile.samples]);

  // Active inspected phoneme in quiz result
  const activePhoneme = useMemo(() => {
    if (selectedPhonemeId) {
      const found = phonemeAnalysis.phonemes.find((p) => p.id === selectedPhonemeId);
      if (found) return found;
    }
    return (
      phonemeAnalysis.phonemes.find((p) => p.stability === 'unstable') ||
      phonemeAnalysis.phonemes.find((p) => p.stability === 'warning') ||
      phonemeAnalysis.phonemes[0] ||
      null
    );
  }, [selectedPhonemeId, phonemeAnalysis.phonemes]);

  // Start the 3-step Shadowing Quiz flow
  const handleStartQuizSession = () => {
    cleanupAudioSession();
    setTranscript('');
    setInterimTranscript('');
    setQuizScore(null);
    setUserWaveform([]);
    setUserAudioUrl(null);
    setSelectedPhonemeId(null);
    setLatencyMs(null);

    // Phase 1: Native Speaker Audio Playback
    setPhase('listening_ai');

    speechService.speakWithCallbacks(quizText, {
      rate: 0.9,
      lang: 'en-US',
      onEnd: () => {
        // Phase 2: Immediate Countdown (3..2..1)
        triggerCountdown();
      },
      onError: () => {
        triggerCountdown();
      },
    });
  };

  const triggerCountdown = () => {
    setPhase('countdown');
    let count = 3;
    setCountdownNum(count);
    playTone(660, 'sine', 0.12);

    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNum(count);
        playTone(660, 'sine', 0.12);
      } else {
        clearInterval(timer);
        playTone(990, 'sine', 0.25);
        startRecordingUserShadowing();
      }
    }, 700);
  };

  // Phase 3: Start live microphone recording & realtime STT
  const startRecordingUserShadowing = async () => {
    setPhase('recording_user');
    speechStartTimeRef.current = Date.now();

    // 1. Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.continuous = false;
        reco.interimResults = true;
        reco.lang = 'en-US';

        reco.onresult = (event: any) => {
          let liveText = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            liveText += event.results[i][0].transcript;
          }
          setInterimTranscript(liveText);

          // Calculate latency on first spoken token
          if (!latencyMs && liveText.trim().length > 0) {
            const reaction = Date.now() - speechStartTimeRef.current;
            setLatencyMs(reaction);
          }

          if (event.results[0].isFinal) {
            setTranscript(liveText);
            stopAndEvaluateQuiz(liveText);
          }
        };

        reco.onerror = () => {
          stopAndEvaluateQuiz();
        };

        reco.onend = () => {
          stopAndEvaluateQuiz();
        };

        try {
          reco.start();
          recognitionRef.current = reco;
        } catch {}
      }
    }

    // 2. Initialize MediaRecorder & Silence Detector
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        silenceDetectorRef.current = createLiveSilenceDetector({
          stream,
          targetText: currentQuizTextRef.current,
          onSilenceTimeout: () => {
            stopAndEvaluateQuiz();
          },
        });

        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
            const url = URL.createObjectURL(blob);
            setUserAudioUrl(url);

            decodeAndExtractVoiceSegment(blob, 50)
              .then((seg) => {
                if (seg && seg.normalizedWaveform.length > 0) {
                  setUserWaveform(seg.normalizedWaveform);
                }
              })
              .catch(() => {});
          }
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.warn('Microphone error in Shadowing Quiz:', err);
      }
    }
  };

  // Stop recording and compute phoneme accuracy & quiz score
  const stopAndEvaluateQuiz = (finalText?: string) => {
    if (phase !== 'recording_user') return;
    setPhase('evaluating');

    if (silenceDetectorRef.current) {
      const seg = silenceDetectorRef.current.stop();
      if (seg && seg.normalizedWaveform.length > 0) {
        setUserWaveform(seg.normalizedWaveform);
      }
      silenceDetectorRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    setTimeout(() => {
      const spoken = (finalText || transcript || interimTranscript || '').trim();
      setTranscript(spoken);

      // Evaluate pronunciation score
      const activeText = currentQuizTextRef.current;
      const evalResult = speechService.evaluatePronunciation(activeText, spoken);
      const computedScore = Math.max(25, evalResult.score);

      setQuizScore(computedScore);

      // Streak Combo Calculation
      if (computedScore >= 80) {
        setStreakCombo((prev) => prev + 1);
        playSuccessFanfare();
        recordPronunciationDone();
        if (onSuccessEvaluation) {
          onSuccessEvaluation();
        }
      } else {
        setStreakCombo(0);
        playTone(440, 'triangle', 0.35);
      }

      setPhase('result');
    }, 600);
  };

  // Toggle user audio playback
  const handleTogglePlayRecordedAudio = () => {
    if (!userAudioUrl) return;

    if (isPlayingUserAudio && activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      setIsPlayingUserAudio(false);
      return;
    }

    speechService.stop();
    const audio = new Audio(userAudioUrl);
    activeAudioPlayerRef.current = audio;
    setIsPlayingUserAudio(true);

    audio.onended = () => setIsPlayingUserAudio(false);
    audio.onerror = () => setIsPlayingUserAudio(false);
    audio.play().catch(() => setIsPlayingUserAudio(false));
  };

  // Shuffle to another quiz sentence
  const handleNextQuizSentence = () => {
    cleanupAudioSession();
    const remaining = QUIZ_PRESETS.filter((p) => p.text !== quizText);
    const nextItem = remaining[Math.floor(Math.random() * remaining.length)] || QUIZ_PRESETS[0];
    setQuizText(nextItem.text);
    setPhase('idle');
    setTranscript('');
    setInterimTranscript('');
    setQuizScore(null);
    setUserWaveform([]);
    setUserAudioUrl(null);
  };

  const getRankBadge = (score: number) => {
    if (score >= 90) return { rank: 'S', color: 'from-amber-400 to-amber-600', text: '🏆 S-Rank (원어민급 완벽 쉐도잉!)' };
    if (score >= 80) return { rank: 'A', color: 'from-emerald-400 to-emerald-600', text: '🌟 A-Rank (80점 돌파 성공!)' };
    if (score >= 70) return { rank: 'B', color: 'from-indigo-400 to-indigo-600', text: '⚡ B-Rank (일부 음소 집중 교정 필요)' };
    return { rank: 'C', color: 'from-rose-400 to-rose-600', text: '🎯 C-Rank (원어민 소리를 다시 듣고 재도전!)' };
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      
      {/* 1. Header Banner & Streak Info */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-indigo-500/10 to-emerald-500/15 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black shadow-sm shrink-0">
            <Sparkles className="w-5 h-5 fill-current" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                실시간 쉐도잉 퀴즈 (Shadowing Quiz)
              </h3>
              {streakCombo > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center gap-0.5 animate-bounce shadow-xs">
                  <Flame className="w-3 h-3 fill-current text-rose-600" />
                  <span>{streakCombo}연속 성공!</span>
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400">
              원어민 문장을 듣고 즉시 따라 말하면 AI가 음소(Phoneme) 단위 정확도를 실시간으로 점수화합니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNextQuizSentence}
          className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ml-auto"
        >
          <Shuffle className="w-3.5 h-3.5 text-amber-500" />
          <span>다른 퀴즈 문장</span>
        </button>
      </div>

      {/* 2. Main Interactive Quiz Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-center relative overflow-hidden">
        
        {/* Quiz Target Sentence */}
        <div className="space-y-1.5">
          <span className="text-[10px] sm:text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Target Shadowing Sentence
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-snug break-words px-2">
            "{quizText}"
          </h2>
        </div>

        {/* Phase-specific Display */}
        {phase === 'idle' && (
          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              <span className="font-bold block mb-1 text-slate-900 dark:text-white">
                💡 쉐도잉 퀴즈 룰 (Rule)
              </span>
              <span>1. [시작] 클릭 시 원어민이 문장을 들려줍니다.</span><br />
              <span>2. 3초 카운트다운 후 즉시 마이크에 대고 따라 말하세요!</span><br />
              <span>3. AI가 각 음소(자음/모음)의 조음 정확도를 실시간 분석해 랭크를 매깁니다.</span>
            </div>

            <button
              type="button"
              onClick={handleStartQuizSession}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer"
            >
              <Volume2 className="w-5 h-5 fill-current" />
              <span>🎧 쉐도잉 퀴즈 시작 (원어민 듣기)</span>
            </button>
          </div>
        )}

        {phase === 'listening_ai' && (
          <div className="py-6 space-y-3 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center animate-pulse">
              <Volume2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                원어민 발음 재생 중...
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                문장의 억양과 강세, 음소 소리를 귀담아들으세요! 곧 카운트다운이 시작됩니다.
              </p>
            </div>
          </div>
        )}

        {phase === 'countdown' && (
          <div className="py-6 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white font-mono font-black text-3xl mx-auto flex items-center justify-center shadow-lg animate-ping">
              {countdownNum}
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                준비하세요!
              </h4>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                카운트가 끝나면 즉시 같은 속도와 억양으로 따라 말하세요!
              </p>
            </div>
          </div>
        )}

        {phase === 'recording_user' && (
          <div className="py-4 space-y-3 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-rose-500 text-white mx-auto flex items-center justify-center animate-pulse shadow-lg ring-4 ring-rose-500/30">
              <Mic className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 animate-pulse">
                🎙️ 지금 즉시 따라 말하세요! (Shadowing)
              </h4>
              {interimTranscript && (
                <div className="mt-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold max-w-sm mx-auto">
                  "{interimTranscript}"
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => stopAndEvaluateQuiz()}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <MicOff className="w-4 h-4" />
              <span>발화 완료 (판정)</span>
            </button>
          </div>
        )}

        {phase === 'evaluating' && (
          <div className="py-8 space-y-3 animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              AI가 실시간 음소 단위 정확도 채점 중...
            </h4>
          </div>
        )}

        {/* Phase: Result Display */}
        {phase === 'result' && quizScore !== null && (
          <div className="space-y-4 text-left animate-in zoom-in-95 duration-200">
            
            {/* Score & Rank Hero Card */}
            {(() => {
              const rankInfo = getRankBadge(quizScore);
              return (
                <div className={`p-4 rounded-2xl bg-gradient-to-r ${rankInfo.color} text-slate-950 shadow-lg space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider block opacity-85">
                        Quiz Shadowing Result
                      </span>
                      <h3 className="text-lg sm:text-xl font-black">
                        {rankInfo.text}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl sm:text-4xl font-black font-mono">
                        {quizScore}
                      </span>
                      <span className="text-sm font-bold">점</span>
                    </div>
                  </div>

                  {/* Latency / Reaction Speed */}
                  {latencyMs && (
                    <div className="flex items-center gap-1.5 text-xs font-bold pt-1 border-t border-black/15">
                      <Clock className="w-3.5 h-3.5" />
                      <span>반응 속도: {(latencyMs / 1000).toFixed(2)}초</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 font-mono">
                        {latencyMs < 600 ? '원어민급 반응속도 ⚡' : '안정적 반응'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Recognized Speech Box */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs">
              <span className="text-slate-400 font-bold block mb-0.5">인식된 쉐도잉 발화:</span>
              <p className="font-mono font-black text-slate-900 dark:text-white text-sm">
                "{transcript || '음성 인식 실패'}"
              </p>
            </div>

            {/* Phoneme Accuracy Waveform with Dynamic Colors */}
            <div className="p-3.5 rounded-2xl bg-slate-950 text-white border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>실시간 음소(Phoneme) 웨이브폼 판정 맵</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  불안정 음소: <span className="text-rose-400 font-bold">{phonemeAnalysis.unstableCount}개</span>
                </span>
              </div>

              {/* 50-bar colored wave */}
              <div className="h-16 bg-slate-900 rounded-xl p-1.5 flex items-end justify-between gap-[2px]">
                {phonemeAnalysis.waveformBarColors.map((bar) => {
                  const heightPct = Math.max(15, Math.min(100, Math.round(bar.userAmp * 100)));
                  return (
                    <div
                      key={`quiz-bar-${bar.barIdx}`}
                      style={{ height: `${heightPct}%`, backgroundColor: bar.color }}
                      className="flex-1 rounded-t-xs transition-all"
                      title={`[${bar.char}] ${bar.ipa} (${bar.stability})`}
                    />
                  );
                })}
              </div>

              {/* Phoneme Cards Ribbon */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {phonemeAnalysis.phonemes.map((ph) => {
                  const isUnstable = ph.stability === 'unstable';
                  const isWarning = ph.stability === 'warning';
                  const isSelected = activePhoneme?.id === ph.id;

                  return (
                    <button
                      key={`quiz-ph-${ph.id}`}
                      type="button"
                      onClick={() => setSelectedPhonemeId(ph.id)}
                      className={`px-2 py-1 rounded-lg border flex flex-col items-center shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-white bg-slate-800'
                          : isUnstable
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/70'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/70'
                          : 'bg-slate-800/70 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      <span className="font-mono font-bold text-xs">{ph.char}</span>
                      <span className="text-[9px] font-mono opacity-80">{ph.ipa}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Phoneme Articulation Tip */}
              {activePhoneme && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activePhoneme.color }} />
                      <span>[{activePhoneme.char}] {activePhoneme.ipa} ({activePhoneme.categoryLabel})</span>
                    </span>
                    <span className="font-mono font-bold" style={{ color: activePhoneme.color }}>
                      정확도: {activePhoneme.accuracyScore}점
                    </span>
                  </div>
                  <p className="text-slate-300 text-[10px] leading-relaxed">
                    💡 조음 코칭: {activePhoneme.coachingTip}
                  </p>
                </div>
              )}
            </div>

            {/* Result Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleStartQuizSession}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>다시 쉐도잉 도전</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextQuizSentence}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>다음 퀴즈 문장</span>
                </button>

                {userAudioUrl && (
                  <button
                    type="button"
                    onClick={handleTogglePlayRecordedAudio}
                    className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition-all active:scale-95"
                  >
                    {isPlayingUserAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>내 녹음 듣기</span>
                  </button>
                )}
              </div>

              {onSwitchToPracticeTab && (
                <button
                  type="button"
                  onClick={() => onSwitchToPracticeTab(quizText)}
                  className="px-3 py-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-bold flex items-center gap-1 ml-auto"
                >
                  <span>정밀 발음 훈련실로 이동</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
