import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  Shield,
  Coins,
  Gift,
  Check,
  Lock,
  Edit3,
  MessageCircle,
  Shirt,
  Home,
  ArrowUpCircle,
  Utensils,
  RefreshCw,
  Timer,
  Play,
  Square,
  Zap,
  Cookie,
  BookOpen,
} from 'lucide-react';
import { DailyGoalHistory, UserProfile, VocabItem } from '../types';
import { speechService } from '../services/speechService';
import { confettiService } from '../services/confettiService';
import { getLocalDateString } from '../utils/dateUtils';
import {
  PetCompanionState,
  PetCostumeId,
  PetRoomId,
  PetSpokenPhrase,
  PetStage,
  PET_COSTUMES,
  PET_EVOLUTION_STAGES,
  PET_ROOMS,
  PET_UPDATED_EVENT,
  STREAK_SHIELD_PRICE,
  acknowledgePendingEvolutionOverlay,
  buildPetEvolutionPokedex,
  buildPetMoodTrend7Days,
  buildRecentMoodLogs,
  buyStreakShield,
  cancelPetStudyBoost,
  claimDailyPetSupply,
  completePetStudyBoost,
  deriveSentimentFromConsistency,
  evolvePet,
  feedPet,
  generatePetDialogue,
  getEvolutionStatus,
  getPetMood,
  getPetSentimentIndicator,
  getStudyBoostStatus,
  loadPetState,
  petInteract,
  pickRandomLearnedSpeech,
  playPetSound,
  renamePet,
  resolvePetTapSoundCue,
  rewardQuickFoodQuiz,
  startPetStudyBoost,
  syncPetHungerOverTime,
  togglePetSound,
  unlockOrEquipRoom,
  unlockOrToggleCostume,
} from '../services/petCompanionService';
import { PET_ROOM_IMAGES, PetCompanionVisual } from './PetCompanionVisual';
import { PetMoodTrendChart } from './PetMoodTrendChart';
import { EvolutionOverlayPhase, PetEvolutionOverlay } from './PetEvolutionOverlay';
import { PetFoodQuizOverlay, PetFoodQuizResult } from './PetFoodQuizOverlay';
import { PetEvolutionPokedex } from './PetEvolutionPokedex';
import { PetRecentMoodLogs } from './PetRecentMoodLogs';

interface PetSanctuaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  vocabList: VocabItem[];
  history?: DailyGoalHistory[];
  dueCount: number;
  masteredCount: number;
  onNavigateToStudy?: () => void;
}

type SanctuaryTab = 'care' | 'pokedex' | 'decorate' | 'shield';

export const PetSanctuaryModal: React.FC<PetSanctuaryModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  vocabList,
  history = [],
  dueCount,
  masteredCount,
  onNavigateToStudy,
}) => {
  const [petState, setPetState] = useState<PetCompanionState>(() => loadPetState());
  const [activeTab, setActiveTab] = useState<SanctuaryTab>('care');
  const [pokedexFocusStage, setPokedexFocusStage] = useState<PetStage | undefined>(undefined);
  const [showKorean, setShowKorean] = useState<boolean>(true);
  const [dialogueSeed, setDialogueSeed] = useState<number>(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [reactionBurst, setReactionBurst] = useState<boolean>(false);
  const [isSentimentReacting, setIsSentimentReacting] = useState<boolean>(false);
  const [sentimentBurstKey, setSentimentBurstKey] = useState<number>(0);
  const [boostNowMs, setBoostNowMs] = useState<number>(() => Date.now());
  const sentimentTimerRef = useRef<number | null>(null);
  const evolveAnimTimerRef = useRef<number | null>(null);
  const speakTimerRef = useRef<number | null>(null);
  const [tappedSpeech, setTappedSpeech] = useState<PetSpokenPhrase | null>(null);
  const [evolutionOverlay, setEvolutionOverlay] = useState<{
    isOpen: boolean;
    phase: EvolutionOverlayPhase;
    fromStage: PetStage;
    toStage: PetStage;
    bonusCoins: number;
  } | null>(null);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(petState.name);
  const [showFoodQuiz, setShowFoodQuiz] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (sentimentTimerRef.current !== null) {
        window.clearTimeout(sentimentTimerRef.current);
      }
      if (evolveAnimTimerRef.current !== null) {
        window.clearTimeout(evolveAnimTimerRef.current);
      }
      if (speakTimerRef.current !== null) {
        window.clearTimeout(speakTimerRef.current);
      }
    };
  }, []);

  const maybeOpenPendingEvolution = (state: PetCompanionState) => {
    const evo = getEvolutionStatus(state);
    if (
      state.pendingEvolutionOverlayStage &&
      evo.isReadyToEvolve &&
      evo.nextStage
    ) {
      setEvolutionOverlay((prev) => {
        if (prev?.isOpen) return prev;
        playPetSound('evolve');
        return {
          isOpen: true,
          phase: 'ready',
          fromStage: state.stage,
          toStage: evo.nextStage!.stage,
          bonusCoins: evo.nextStage!.stage * 40,
        };
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const now = Date.now();
    let latest = syncPetHungerOverTime(now);
    if (latest.studyBoost && getStudyBoostStatus(latest, now).isReadyToComplete) {
      const done = completePetStudyBoost(now);
      if (done.completed) {
        latest = done.state;
        try {
          confettiService.fireSideCannons();
          confettiService.fireGoldenStars();
        } catch {}
        setFeedbackMsg(done.message);
      }
    }
    setPetState(latest);
    setBoostNowMs(now);
    setNameInput(latest.name);
    maybeOpenPendingEvolution(latest);

    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<PetCompanionState>).detail;
      const next = detail || loadPetState();
      setPetState(next);
      maybeOpenPendingEvolution(next);
    };
    window.addEventListener(PET_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(PET_UPDATED_EVENT, onUpdated);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const hungerIntervalId = window.setInterval(() => {
      const synced = syncPetHungerOverTime(Date.now());
      setPetState((prev) => (prev.fullness !== synced.fullness ? synced : prev));
    }, 60_000);
    return () => window.clearInterval(hungerIntervalId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !petState.studyBoost) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setBoostNowMs(now);
      const status = getStudyBoostStatus(petState, now);
      if (status.isReadyToComplete) {
        const done = completePetStudyBoost(now);
        if (done.completed) {
          setPetState(done.state);
          setSentimentBurstKey((k) => k + 1);
          setIsSentimentReacting(true);
          window.setTimeout(() => setIsSentimentReacting(false), 720);
          try {
            confettiService.fireSideCannons();
            confettiService.fireGoldenStars();
          } catch {}
          setFeedbackMsg(done.message);
        }
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isOpen, petState]);

  const boostStatus = useMemo(
    () => getStudyBoostStatus(petState, boostNowMs),
    [petState, boostNowMs]
  );
  const evoStatus = useMemo(() => getEvolutionStatus(petState), [petState]);
  const pokedexEntries = useMemo(
    () =>
      buildPetEvolutionPokedex(petState, {
        masteredCount,
        streakDays: userProfile?.streakDays || 1,
      }),
    [petState, masteredCount, userProfile?.streakDays]
  );
  const moodInfo = useMemo(() => getPetMood(petState), [petState]);
  const moodTrend = useMemo(
    () =>
      buildPetMoodTrend7Days({
        state: petState,
        history,
        vocabList,
        dueCount,
        masteredCount,
        streakDays: userProfile?.streakDays || 1,
      }),
    [petState, history, vocabList, dueCount, masteredCount, userProfile?.streakDays]
  );
  const recentMoodLogs = useMemo(
    () =>
      buildRecentMoodLogs({
        state: petState,
        history,
        vocabList,
        dueCount,
        masteredCount,
        streakDays: userProfile?.streakDays || 1,
        nowMs: boostNowMs,
      }),
    [petState, history, vocabList, dueCount, masteredCount, userProfile?.streakDays, boostNowMs]
  );
  const sentiment = useMemo(() => {
    const live = getPetSentimentIndicator({
      state: petState,
      dueCount,
      masteredCount,
      streakDays: userProfile?.streakDays || 1,
      nowMs: boostNowMs,
    });
    return deriveSentimentFromConsistency(moodTrend, live);
  }, [petState, moodTrend, dueCount, masteredCount, userProfile?.streakDays, boostNowMs]);
  const todayStr = getLocalDateString();
  const canClaimDailySupply = petState.lastDailySupplyDate !== todayStr;

  const featuredWord = useMemo(() => {
    if (!vocabList.length) return null;
    const learningPool = vocabList.filter((v) => (v.masteryLevel ?? 0) < 2);
    const pool = learningPool.length > 0 ? learningPool : vocabList;
    return pool[(dialogueSeed + petState.totalPetCount) % pool.length] || pool[0];
  }, [vocabList, dialogueSeed, petState.totalPetCount]);

  const dialogue = useMemo(
    () =>
      generatePetDialogue({
        state: petState,
        dueCount,
        streakDays: userProfile?.streakDays || 1,
        masteredCount,
        featuredWord,
        seedOffset: dialogueSeed,
      }),
    [petState, dueCount, userProfile?.streakDays, masteredCount, featuredWord, dialogueSeed]
  );

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  const triggerReaction = () => {
    setReactionBurst(true);
    setTimeout(() => setReactionBurst(false), 260);
  };

  const triggerSentimentReaction = () => {
    setSentimentBurstKey((k) => k + 1);
    setIsSentimentReacting(true);
    if (sentimentTimerRef.current !== null) {
      window.clearTimeout(sentimentTimerRef.current);
    }
    sentimentTimerRef.current = window.setTimeout(() => {
      setIsSentimentReacting(false);
    }, 720);
  };

  const handleTapSentiment = () => {
    triggerReaction();
    triggerSentimentReaction();
    setDialogueSeed((s) => s + 1);
    if (sentiment.sentiment === 'ecstatic') {
      playPetSound('evolve');
    } else if (sentiment.sentiment === 'happy' || sentiment.sentiment === 'proud') {
      playPetSound('coin');
    } else if (sentiment.sentiment === 'bored' || sentiment.sentiment === 'hungry') {
      playPetSound('shield');
    } else {
      playPetSound('pet');
    }
    showToast(`${sentiment.emoji} ${sentiment.shortLabel} · ${sentiment.detail}`);
  };

  const handleStartStudyBoost = () => {
    const now = Date.now();
    const res = startPetStudyBoost(300, now);
    setPetState(res.state);
    setBoostNowMs(now);
    if (res.started) {
      triggerReaction();
      triggerSentimentReaction();
      setDialogueSeed((s) => s + 1);
    }
    showToast(res.message);
  };

  const handleCancelStudyBoost = () => {
    const next = cancelPetStudyBoost();
    setPetState(next);
    showToast('Study Boost 세션을 중단했어요. 언제든 다시 5분 집중을 시작할 수 있습니다.');
  };

  const handleTapPet = () => {
    const cue = resolvePetTapSoundCue({
      fullness: petState.fullness,
      sentiment: sentiment.sentiment,
    });
    const res = petInteract({ soundCue: cue });
    setPetState(res.state);
    setDialogueSeed((s) => s + 1);
    triggerReaction();
    triggerSentimentReaction();

    const spoken = pickRandomLearnedSpeech({
      vocabList,
      lastSpokenWord: tappedSpeech?.word,
    });
    setTappedSpeech(spoken);

    if (speakTimerRef.current !== null) {
      window.clearTimeout(speakTimerRef.current);
    }
    if (res.state.soundEnabled) {
      speakTimerRef.current = window.setTimeout(() => {
        speechService.speakOnce(spoken.englishText, 'en-US');
      }, 240);
    }

    const cueLabel = cue === 'hungry' ? '배고픈 소리' : '기쁜 소리';
    if (!res.cooldownActive) {
      showToast(
        `${cue === 'hungry' ? '🍪' : '🎵'} [${cueLabel}] "${spoken.englishText}" (${spoken.koreanHint}) · 친밀도 +${res.bondGain}, EXP +${res.expGain}`
      );
    } else {
      showToast(
        `${cue === 'hungry' ? '🍪' : '🗣️'} [${cueLabel}] "${spoken.englishText}" · ${spoken.koreanHint}`
      );
    }
  };

  const handleFeed = (kind: 'snack' | 'special') => {
    const res = feedPet(kind);
    setPetState(res.state);
    if (res.success) {
      triggerReaction();
      setDialogueSeed((s) => s + 1);
    }
    showToast(res.message);
  };

  const handleFinishFoodQuiz = (result: PetFoodQuizResult) => {
    const res = rewardQuickFoodQuiz(result);
    setPetState(res.state);
    setShowFoodQuiz(false);
    triggerReaction();
    triggerSentimentReaction();
    setDialogueSeed((s) => s + 1);
    showToast(res.message);
  };

  const handleEvolve = () => {
    const previousStage = petState.stage;
    const res = evolvePet();
    setPetState(res.state);
    if (res.evolved) {
      triggerReaction();
      triggerSentimentReaction();
      setEvolutionOverlay({
        isOpen: true,
        phase: 'evolving',
        fromStage: previousStage,
        toStage: res.newStage,
        bonusCoins: res.bonusCoins,
      });
      if (evolveAnimTimerRef.current !== null) {
        window.clearTimeout(evolveAnimTimerRef.current);
      }
      evolveAnimTimerRef.current = window.setTimeout(() => {
        setEvolutionOverlay((prev) =>
          prev ? { ...prev, phase: 'complete' } : null
        );
        try {
          confettiService.fireSideCannons();
          confettiService.fireGoldenStars();
        } catch {}
      }, 800);
      showToast(
        `축하합니다! ${res.state.name}이(가) [Stage ${res.newStage} · ${res.stageInfo.title}](으)로 진화하고 보너스 ${res.bonusCoins}코인을 얻었어요!`
      );
    }
  };

  const handleDismissEvolutionOverlay = () => {
    if (evolutionOverlay?.phase === 'ready') {
      const acked = acknowledgePendingEvolutionOverlay(evolutionOverlay.toStage);
      setPetState(acked);
    }
    setEvolutionOverlay(null);
  };

  const handleClaimSupply = () => {
    const res = claimDailyPetSupply();
    setPetState(res.state);
    if (res.claimed) triggerReaction();
    showToast(res.message);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = renamePet(nameInput);
    setPetState(updated);
    setNameInput(updated.name);
    setIsEditingName(false);
    showToast(`펫 이름을 '${updated.name}'(으)로 변경했어요.`);
  };

  const handleRoomAction = (roomId: PetRoomId) => {
    const res = unlockOrEquipRoom(roomId);
    setPetState(res.state);
    showToast(res.message);
  };

  const handleCostumeAction = (costumeId: PetCostumeId) => {
    const res = unlockOrToggleCostume(costumeId);
    setPetState(res.state);
    showToast(res.message);
  };

  const handleBuyShield = () => {
    const res = buyStreakShield();
    setPetState(res.state);
    showToast(res.message);
  };

  const currentRoom = PET_ROOMS.find((r) => r.id === petState.equippedRoom) || PET_ROOMS[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-sanctuary-title"
        className="relative w-full max-w-5xl max-h-[92dvh] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
      >
        <PetEvolutionOverlay
          isOpen={Boolean(evolutionOverlay?.isOpen)}
          phase={evolutionOverlay?.phase || 'ready'}
          petName={petState.name}
          fromStage={evolutionOverlay?.fromStage || petState.stage}
          toStage={evolutionOverlay?.toStage || petState.stage}
          costume={petState.equippedCostume}
          bonusCoins={evolutionOverlay?.bonusCoins || 0}
          onConfirmEvolve={handleEvolve}
          onDismiss={handleDismissEvolutionOverlay}
        />
        <PetFoodQuizOverlay
          isOpen={showFoodQuiz}
          petName={petState.name}
          petFullness={petState.fullness}
          vocabList={vocabList}
          onClose={() => setShowFoodQuiz(false)}
          onFinishQuiz={handleFinishFoodQuiz}
        />
        {/* Top Header */}
        <header className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={16}
                    autoFocus
                    aria-label="펫 이름 입력"
                    className="h-9 px-2.5 rounded-lg border border-indigo-400 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none w-32"
                  />
                  <button
                    type="submit"
                    className="min-h-[36px] px-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    저장
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h2
                    id="pet-sanctuary-title"
                    className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate"
                  >
                    {petState.name}의 학습 방
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(petState.name);
                      setIsEditingName(true);
                    }}
                    aria-label="펫 이름 수정"
                    className="min-w-[36px] min-h-[36px] rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-mono-tabular font-semibold text-indigo-600 dark:text-indigo-400">
                Stage {petState.stage}/5 {evoStatus.currentStage.title}
              </span>
            </div>

            {/* Zero-pill resource & status summary line */}
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-mono-tabular tabular-nums text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                <Coins className="w-3.5 h-3.5" />
                {petState.coins.toLocaleString()} 코인
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>EXP {petState.exp.toLocaleString()}</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>간식 {petState.snacks}개 · 영양식 {petState.specialTreats}개</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                보호막 {petState.streakShields}/{evoStatus.currentStage.maxShields}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setPetState(togglePetSound())}
              aria-label={petState.soundEnabled ? '펫 효과음 끄기' : '펫 효과음 켜기'}
              title={petState.soundEnabled ? '효과음 켜짐' : '효과음 꺼짐'}
              className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            >
              {petState.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="키우기 방 닫기"
              className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Feedback Banner */}
        {feedbackMsg && (
          <div
            role="status"
            aria-live="polite"
            className="mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-800 dark:text-indigo-200 flex items-center justify-between gap-2 shrink-0"
          >
            <span>{feedbackMsg}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              aria-label="알림 닫기"
              className="text-indigo-500 hover:text-indigo-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main 2-Column Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT: Sanctuary Stage, Bilingual Interaction & Quick Care */}
            <div className="lg:col-span-5 space-y-4">
              <PetCompanionVisual
                stage={petState.stage}
                roomId={petState.equippedRoom}
                costume={petState.equippedCostume}
                petName={petState.name}
                mode="sanctuary"
                isReadyToEvolve={evoStatus.isReadyToEvolve}
                reactionBurst={reactionBurst}
                sentiment={sentiment}
                isSentimentReacting={isSentimentReacting}
                sentimentBurstKey={sentimentBurstKey}
                onTapPet={handleTapPet}
                onTapSentiment={handleTapSentiment}
              />

              {/* Room + Mood Metadata Line */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span>
                  {currentRoom.name} · {moodInfo.label}
                </span>
                <span className="font-mono-tabular">터치해 소리·단어 말하기</span>
              </div>

              {/* Contextual Bilingual English Dialogue Box */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono-tabular font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {tappedSpeech
                      ? tappedSpeech.isFromLearnedList
                        ? '학습 단어 말하기'
                        : '영어 한마디'
                      : dialogue.tag}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKorean((v) => !v)}
                      className="min-h-[32px] px-2 rounded-lg text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 cursor-pointer"
                    >
                      {showKorean ? '해석 숨기기' : '한글 보기'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTappedSpeech(null);
                        setDialogueSeed((s) => s + 1);
                      }}
                      aria-label="다른 영어 한마디 보기"
                      className="min-h-[32px] min-w-[32px] rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 flex items-center justify-center cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        speechService.speakOnce(
                          tappedSpeech ? tappedSpeech.englishText : dialogue.en,
                          'en-US'
                        )
                      }
                      aria-label="영어 한마디 발음 듣기"
                      className="min-h-[32px] px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>듣기</span>
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                  “{tappedSpeech ? tappedSpeech.englishText : dialogue.en}”
                </p>
                {showKorean && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {tappedSpeech ? tappedSpeech.koreanHint : dialogue.ko}
                  </p>
                )}
              </div>

              {/* Evolution CTA (When EXP Threshold Reached) */}
              {evoStatus.isReadyToEvolve && evoStatus.nextStage && (
                <button
                  type="button"
                  onClick={handleEvolve}
                  className="w-full min-h-[52px] px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
                >
                  <ArrowUpCircle className="w-5 h-5" />
                  <span>
                    Stage {evoStatus.nextStage.stage} · {evoStatus.nextStage.title} 진화하기 (+
                    {evoStatus.nextStage.stage * 40} 코인)
                  </span>
                </button>
              )}

              {/* Hunger Meter + Earn Food Quick Quiz CTA */}
              <div
                data-testid="pet-hunger-card"
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Utensils
                      className={`w-4 h-4 ${
                        petState.fullness >= 70
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : petState.fullness >= 35
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    />
                    <span>Hunger · 포만감</span>
                  </div>
                  <span
                    className={`text-xs font-mono-tabular tabular-nums font-bold ${
                      petState.fullness >= 70
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : petState.fullness >= 35
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {petState.fullness}% ·{' '}
                    {petState.fullness >= 70 ? '배부름' : petState.fullness >= 35 ? '출출함' : '배고픔'}
                  </span>
                </div>

                <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    role="progressbar"
                    aria-label="Hunger 포만감"
                    aria-valuenow={petState.fullness}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className={`h-full rounded-full transition-all duration-300 ${
                      petState.fullness >= 70
                        ? 'bg-emerald-500'
                        : petState.fullness >= 35
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${petState.fullness}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    10분마다 1% 감소 · 보유 간식 {petState.snacks}개
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFoodQuiz(true)}
                    className="min-h-[40px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <Cookie className="w-3.5 h-3.5" />
                    <span>Earn Food</span>
                  </button>
                </div>
              </div>

              {/* Care Actions Grid (>= 44px touch targets) */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleTapPet}
                  className="min-h-[48px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>쓰다듬기</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFeed('snack')}
                  className="min-h-[48px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Utensils className="w-4 h-4 text-amber-500" />
                  <span>단어 간식 ({petState.snacks})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFeed('special')}
                  className="min-h-[48px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>특별 영양식 ({petState.specialTreats})</span>
                </button>

                <button
                  type="button"
                  onClick={handleClaimSupply}
                  disabled={!canClaimDailySupply}
                  className={`min-h-[48px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    canClaimDailySupply
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  <span>{canClaimDailySupply ? '오늘 보급 받기' : '보급 수령 완료'}</span>
                </button>
              </div>

              {/* Study Boost: 5-Minute Deep Focus Session (Focused State + Double Study Coins) */}
              <div
                data-testid="pet-study-boost-card"
                className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                  boostStatus.isActive
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/35'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/35'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>Study Boost · 5분 딥포커스</span>
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {boostStatus.isActive
                        ? `${petState.name}이(가) 초집중 상태예요! 완주 시 2배 스터디 코인 보상을 받습니다.`
                        : `5분 집중 세션을 시작하면 ${petState.name}이(가) 즉시 집중 모드가 되고 완료 시 스터디 코인 2배를 획득해요.`}
                    </p>
                  </div>
                  {boostStatus.isActive && (
                    <span className="font-mono-tabular tabular-nums text-base font-extrabold text-indigo-600 dark:text-indigo-300 shrink-0">
                      {String(Math.floor(boostStatus.remainingSec / 60)).padStart(2, '0')}:
                      {String(boostStatus.remainingSec % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>

                {boostStatus.isActive ? (
                  <div className="space-y-2.5">
                    <div className="h-2 rounded-full bg-indigo-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-500"
                        style={{ width: `${boostStatus.progressPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono-tabular text-indigo-700 dark:text-indigo-300">
                      <span>상태: 초집중 (Focused) · 코인 2배 적용 중</span>
                      <span>{boostStatus.progressPct}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {onNavigateToStudy && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateToStudy();
                          }}
                          className="flex-1 min-h-[44px] px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Timer className="w-4 h-4" />
                          <span>집중 학습하러 가기</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCancelStudyBoost}
                        className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>중단</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartStudyBoost}
                    className="w-full min-h-[48px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>5분 Study Boost 시작 (스터디 코인 2배)</span>
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT: 3 Management Tabs */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              {/* Tab Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <button
                  type="button"
                  onClick={() => setActiveTab('care')}
                  className={`min-h-[44px] px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    activeTab === 'care'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>돌보기 · 진화</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pokedex')}
                  className={`min-h-[44px] px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    activeTab === 'pokedex'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>진화 Pokedex</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('decorate')}
                  className={`min-h-[44px] px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    activeTab === 'decorate'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Shirt className="w-3.5 h-3.5 shrink-0" />
                  <span>방 · 코스튬</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('shield')}
                  className={`min-h-[44px] px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    activeTab === 'shield'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>보호막 · 버프</span>
                </button>
              </div>

              {/* TAB 1: CARE & 5-STAGE EVOLUTION */}
              {activeTab === 'care' && (
                <div className="space-y-4">
                  {/* Meters */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          다음 진화 EXP {evoStatus.nextStage ? `→ ${evoStatus.nextStage.title}` : '(최고 단계 달성)'}
                        </span>
                        <span className="font-mono-tabular tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold">
                          {evoStatus.nextStage
                            ? `${petState.exp} / ${evoStatus.nextStage.minExp} EXP (${evoStatus.progressPercent}%)`
                            : `${petState.exp} EXP · MAX`}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"
                          style={{ width: `${evoStatus.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-300">
                            Hunger · 포만감
                          </span>
                          <span
                            className={`font-mono-tabular font-semibold ${
                              petState.fullness >= 70
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : petState.fullness >= 35
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {petState.fullness}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              petState.fullness >= 70
                                ? 'bg-emerald-500'
                                : petState.fullness >= 35
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${petState.fullness}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-300">친밀도</span>
                          <span className="font-mono-tabular font-semibold text-rose-600 dark:text-rose-400">
                            {petState.bond}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-rose-500 transition-all duration-300"
                            style={{ width: `${petState.bond}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 7-Day Mood Trend Chart (Recharts) */}
                  <PetMoodTrendChart trend={moodTrend} petName={petState.name} />

                  {/* Recent Mood Logs (Past 7 Days Scrollable History Feed) */}
                  <PetRecentMoodLogs logs={recentMoodLogs} petName={petState.name} />

                  {/* 5-Stage Evolution Roadmap */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        Pet Evolution Pokedex ({petState.stage}/5 해금)
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setPokedexFocusStage(undefined);
                          setActiveTab('pokedex');
                        }}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        해금 힌트 · 도감 열기 →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                      {PET_EVOLUTION_STAGES.map((stageInfo) => {
                        const isReached = petState.stage >= stageInfo.stage;
                        const isCurrent = petState.stage === stageInfo.stage;
                        return (
                          <button
                            key={stageInfo.stage}
                            type="button"
                            onClick={() => {
                              setPokedexFocusStage(stageInfo.stage);
                              setActiveTab('pokedex');
                            }}
                            className={`rounded-xl border p-2.5 flex sm:flex-col items-center sm:items-stretch gap-2.5 text-left sm:text-center transition-colors cursor-pointer ${
                              isCurrent
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                                : isReached
                                ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                                : 'border-slate-200/70 dark:border-slate-800/70 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <div className="relative w-14 sm:w-full shrink-0">
                              <PetCompanionVisual
                                stage={stageInfo.stage}
                                roomId={petState.equippedRoom}
                                costume={null}
                                petName={stageInfo.title}
                                mode="thumbnail"
                              />
                              {!isReached && (
                                <div className="absolute inset-0 bg-slate-950/45 rounded-2xl flex items-center justify-center">
                                  <Lock className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 text-left sm:text-center">
                              <div className="text-[11px] font-mono-tabular text-indigo-600 dark:text-indigo-400 font-semibold">
                                STAGE {stageInfo.stage}
                              </div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {stageInfo.title}
                              </div>
                              <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                                {isReached ? '해금됨' : `${stageInfo.minExp} EXP`}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Study-to-Reward Guide */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        학습 활동 연동 보상표
                      </h3>
                      {onNavigateToStudy && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateToStudy();
                          }}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          학습하러 가기
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex justify-between">
                        <span>단어 완벽 암기</span>
                        <span className="font-mono-tabular font-semibold text-amber-600 dark:text-amber-400">
                          +22 코인 · +16 EXP · 간식 1
                        </span>
                      </div>
                      <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex justify-between">
                        <span>AI 원어민 발음 80점+</span>
                        <span className="font-mono-tabular font-semibold text-amber-600 dark:text-amber-400">
                          +25 코인 · +20 EXP · 간식 1
                        </span>
                      </div>
                      <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex justify-between">
                        <span>16종 게임 라운드 클리어</span>
                        <span className="font-mono-tabular font-semibold text-amber-600 dark:text-amber-400">
                          +18 코인 · +15 EXP · 간식 1
                        </span>
                      </div>
                      <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex justify-between">
                        <span>3분 루틴 / 일일 퀘스트</span>
                        <span className="font-mono-tabular font-semibold text-amber-600 dark:text-amber-400">
                          최대 +100 코인 · 영양식
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PET EVOLUTION POKEDEX */}
              {activeTab === 'pokedex' && (
                <PetEvolutionPokedex
                  entries={pokedexEntries}
                  petName={petState.name}
                  currentExp={petState.exp}
                  equippedRoom={petState.equippedRoom}
                  initialSelectedStage={pokedexFocusStage}
                  onEvolveNow={handleEvolve}
                  onNavigateToStudy={
                    onNavigateToStudy
                      ? () => {
                          onClose();
                          onNavigateToStudy();
                        }
                      : undefined
                  }
                />
              )}

              {/* TAB 3: ROOM BACKDROPS & COSTUMES */}
              {activeTab === 'decorate' && (
                <div className="space-y-5">
                  {/* Rooms Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Home className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>배경 방 꾸미기 ({petState.unlockedRooms.length}/{PET_ROOMS.length})</span>
                      </h3>
                      <span className="text-xs font-mono-tabular text-amber-600 dark:text-amber-400 font-semibold">
                        보유 {petState.coins.toLocaleString()} 코인
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PET_ROOMS.map((room) => {
                        const isUnlocked = petState.unlockedRooms.includes(room.id);
                        const isEquipped = petState.equippedRoom === room.id;
                        const canAfford = petState.coins >= room.price;
                        return (
                          <div
                            key={room.id}
                            className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-colors ${
                              isEquipped
                                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                            }`}
                          >
                            <div className="relative h-28 bg-slate-900 overflow-hidden">
                              <img
                                src={PET_ROOM_IMAGES[room.id]}
                                alt={room.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white">
                                <span className="text-xs font-bold">{room.name}</span>
                                <span className="text-[11px] font-mono-tabular font-semibold">
                                  {isEquipped ? '적용 중' : isUnlocked ? '보유함' : `${room.price} 코인`}
                                </span>
                              </div>
                            </div>
                            <div className="p-3 flex items-center justify-between gap-2">
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                                {room.description}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleRoomAction(room.id)}
                                disabled={!isUnlocked && !canAfford}
                                className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                                  isEquipped
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-default'
                                    : isUnlocked
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:opacity-90 cursor-pointer'
                                    : canAfford
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                {isEquipped ? '장착됨' : isUnlocked ? '적용' : '구매'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Costumes Section */}
                  <div className="space-y-2.5">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Shirt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>펫 코스튬 장식 ({petState.unlockedCostumes.length}/{PET_COSTUMES.length})</span>
                    </h3>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      {PET_COSTUMES.map((item) => {
                        const isUnlocked = petState.unlockedCostumes.includes(item.id);
                        const isEquipped = petState.equippedCostume === item.id;
                        const canAfford = petState.coins >= item.price;
                        return (
                          <div
                            key={item.id}
                            className="p-3.5 flex items-center justify-between gap-3 bg-white dark:bg-slate-900"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                  {item.name}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">·</span>
                                <span className="text-[11px] font-mono-tabular text-indigo-600 dark:text-indigo-400">
                                  {item.perkLabel}
                                </span>
                                {!isUnlocked && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-700">·</span>
                                    <span className="text-[11px] font-mono-tabular font-semibold text-amber-600 dark:text-amber-400">
                                      {item.price} 코인
                                    </span>
                                  </>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {item.description}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCostumeAction(item.id)}
                              disabled={!isUnlocked && !canAfford}
                              className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                                isEquipped
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-pointer'
                                  : isUnlocked
                                  ? 'border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
                                  : canAfford
                                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {isEquipped ? '착용 해제' : isUnlocked ? '착용하기' : `${item.price} 코인 구매`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: STREAK SHIELD & PASSIVE BUFFS */}
              {activeTab === 'shield' && (
                <div className="space-y-4">
                  {/* Streak Shield Recharge Card */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <span>연속 학습 스트릭 보호막</span>
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          바쁜 날 하루 이상 학습을 쉬더라도 보유한 보호막 1개를 자동 소모해 현재{' '}
                          <span className="font-mono-tabular font-bold text-amber-600 dark:text-amber-400">
                            {userProfile?.streakDays || 1}일 연속 학습 기록
                          </span>
                          이 끊어지지 않도록 지켜줍니다.
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {[1, 2, 3].map((slot) => {
                          const unlockedSlot = slot <= evoStatus.currentStage.maxShields;
                          const filled = slot <= petState.streakShields;
                          return (
                            <div
                              key={slot}
                              title={
                                !unlockedSlot
                                  ? '진화 시 해금되는 보호막 슬롯'
                                  : filled
                                  ? '충전된 스트릭 보호막'
                                  : '비어 있는 슬롯'
                              }
                              className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                                !unlockedSlot
                                  ? 'border-dashed border-slate-300 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                                  : filled
                                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                              }`}
                            >
                              {unlockedSlot ? <Shield className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                        <div>
                          현재 보유량:{' '}
                          <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                            {petState.streakShields} / {evoStatus.currentStage.maxShields}칸
                          </span>
                          {petState.lastShieldProtectedDate && (
                            <span> · 최근 발동 {petState.lastShieldProtectedDate}</span>
                          )}
                        </div>
                        <div>Stage 2에서 2칸, Stage 4에서 최대 3칸까지 확장됩니다.</div>
                      </div>

                      <button
                        type="button"
                        onClick={handleBuyShield}
                        disabled={
                          petState.streakShields >= evoStatus.currentStage.maxShields ||
                          petState.coins < STREAK_SHIELD_PRICE
                        }
                        className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                          petState.streakShields >= evoStatus.currentStage.maxShields
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-default'
                            : petState.coins >= STREAK_SHIELD_PRICE
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {petState.streakShields >= evoStatus.currentStage.maxShields
                          ? '최대치 충전 완료'
                          : `보호막 1개 충전 (${STREAK_SHIELD_PRICE} 코인)`}
                      </button>
                    </div>
                  </div>

                  {/* Active Evolution Passive Buffs */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      단계별 패시브 학습 버프
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {PET_EVOLUTION_STAGES.map((s) => {
                        const active = petState.stage >= s.stage;
                        return (
                          <div
                            key={s.stage}
                            className={`py-2.5 flex items-center justify-between gap-2 text-xs ${
                              active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                  active
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                }`}
                              >
                                {active ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              </span>
                              <span className="font-semibold truncate">
                                Stage {s.stage} · {s.title}
                              </span>
                            </div>
                            <span className="font-mono-tabular shrink-0">
                              코인 +{s.coinBonusPct}% · EXP +{s.expBonusPct}% · 보호막 {s.maxShields}칸
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
