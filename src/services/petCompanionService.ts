import { DailyGoalHistory, UserProfile, VocabItem } from '../types';
import { getLocalDateString } from '../utils/dateUtils';
import { getCleanKoreanMeaning } from '../utils/meaningUtils';
import {
  PetSoundEffectId,
  playPetSoundEffect,
  resolvePetTapSoundCue,
} from './petSoundEffects';

export { playPetSoundEffect, resolvePetTapSoundCue };
export type { PetSoundEffectId };

export type PetStage = 1 | 2 | 3 | 4 | 5;

export type PetRoomId =
  | 'sunlit_desk'
  | 'botanical_greenhouse'
  | 'starlight_loft'
  | 'grand_library';

export type PetCostumeId =
  | 'scholar_glasses'
  | 'cozy_scarf'
  | 'explorer_hat'
  | 'starlight_cape'
  | 'golden_laurel';

export type PetStudyActionType =
  | 'vocab_mastery'
  | 'vocab_learning'
  | 'focus_routine'
  | 'pronunciation'
  | 'daily_quest'
  | 'game_round'
  | 'audio_milestone';

export type PetMood = 'joyful' | 'curious' | 'focused' | 'hungry' | 'legendary';

export type PetSentimentType =
  | 'bored'
  | 'hungry'
  | 'ecstatic'
  | 'focused'
  | 'happy'
  | 'proud'
  | 'curious';

export interface PetSentimentIndicator {
  sentiment: PetSentimentType;
  emoji: string;
  shortLabel: string;
  detail: string;
  tone: 'amber' | 'rose' | 'emerald' | 'indigo' | 'slate';
}

export interface PetLastStudyAction {
  type: PetStudyActionType;
  at: string;
  score?: number;
}

export interface PetStudyBoostSession {
  startedAt: string;
  endsAt: string;
  durationSec: number;
}

export interface PetMoodHistoryEntry {
  score: number;
  sentiment: PetSentimentType;
  studyActions: number;
}

export interface PetMoodLogEntry {
  id: string;
  at: string;
  dateStr: string;
  sentiment: PetSentimentType;
  emoji: string;
  triggerTitle: string;
  detail: string;
  category: 'positive' | 'negative' | 'neutral';
  source: 'recorded' | 'history';
  count?: number;
}

export interface PetMoodTrendPoint {
  dateStr: string;
  dateLabel: string;
  dayName: string;
  moodScore: number;
  studyUnits: number;
  sentiment: PetSentimentType;
  emoji: string;
  label: string;
  isToday: boolean;
  isConsistent: boolean;
}

export interface PetMoodTrendSummary {
  days: PetMoodTrendPoint[];
  consistentDays: number;
  avgMoodScore: number;
  deltaScore: number;
  trendDirection: 'up' | 'steady' | 'down';
}

export interface PetEvolutionStageInfo {
  stage: PetStage;
  title: string;
  enTitle: string;
  minExp: number;
  coinBonusPct: number;
  expBonusPct: number;
  maxShields: number;
  description: string;
  signatureTrait: string;
  pokedexLore: string;
}

export interface PetPokedexMilestoneHint {
  id: string;
  activity: string;
  targetHint: string;
  expYield: string;
  isSatisfied?: boolean;
}

export interface PetPokedexEntry extends PetEvolutionStageInfo {
  entryNumber: string;
  isUnlocked: boolean;
  isCurrent: boolean;
  isReadyToEvolveNow: boolean;
  expProgressPct: number;
  expRemaining: number;
  estimatedWordsToUnlock: number;
  milestoneSummary: string;
  unlockHints: PetPokedexMilestoneHint[];
}

export interface PetRoomInfo {
  id: PetRoomId;
  name: string;
  enName: string;
  price: number;
  description: string;
  accentHex: string;
}

export interface PetCostumeInfo {
  id: PetCostumeId;
  name: string;
  enName: string;
  price: number;
  perkLabel: string;
  description: string;
}

export interface PetDailyLedger {
  date: string;
  vocabIds: string[];
  gameCount: number;
  pronCount: number;
  focusCount: number;
  questClaimed: boolean;
  lastGameRewardAtMs: number;
}

export interface PetCompanionState {
  version: 1;
  name: string;
  stage: PetStage;
  exp: number;
  coins: number;
  snacks: number;
  specialTreats: number;
  fullness: number; // 0 ~ 100
  bond: number; // 0 ~ 100
  streakShields: number; // 0 ~ 3
  unlockedRooms: PetRoomId[];
  equippedRoom: PetRoomId;
  unlockedCostumes: PetCostumeId[];
  equippedCostume: PetCostumeId | null;
  lastFedAt: string | null;
  lastPettedAt: string | null;
  lastDailySupplyDate: string | null;
  lastActiveStudyDate: string | null;
  lastShieldProtectedDate: string | null;
  totalFeedCount: number;
  totalPetCount: number;
  totalEvolutions: number;
  soundEnabled: boolean;
  dailyLedger: PetDailyLedger;
  lastStudyAction?: PetLastStudyAction | null;
  moodHistory?: Record<string, PetMoodHistoryEntry>;
  moodLogs?: PetMoodLogEntry[];
  studyBoost?: PetStudyBoostSession | null;
  pendingEvolutionOverlayStage?: PetStage | null;
  lastEvolutionCelebratedStage?: PetStage | null;
  lastHungerTickAt?: string | null;
  updatedAt: string;
}

export const STUDY_BOOST_DURATION_SEC = 300; // 5-minute deep focus
export const STUDY_BOOST_BASE_COINS = 50; // Doubled to 100 coins on completion
export const HUNGER_DECAY_INTERVAL_MS = 10 * 60 * 1000; // 1% hunger decrease every 10 minutes

export interface PetDialogueLine {
  en: string;
  ko: string;
  tag: string;
}

export interface PetRewardResult {
  awarded: boolean;
  coinsDelta: number;
  expDelta: number;
  snacksDelta: number;
  specialTreatsDelta: number;
  readyToEvolve: boolean;
  state: PetCompanionState;
  reason?: string;
}

export const PET_STORAGE_KEY = 'wordloop_pet_companion_v1';
export const PET_UPDATED_EVENT = 'wordloop:pet-updated';
export const STREAK_SHIELD_PRICE = 150;

export const PET_EVOLUTION_STAGES: PetEvolutionStageInfo[] = [
  {
    stage: 1,
    title: '신비한 알',
    enTitle: 'Mystic Study Egg',
    minExp: 0,
    coinBonusPct: 0,
    expBonusPct: 0,
    maxShields: 1,
    description: '단어를 학습하고 쓰다듬어 주면 곧 부화하는 반짝이는 알이에요.',
    signatureTrait: '부화 대기 · 기본 보호막 1칸',
    pokedexLore:
      '매일의 영어 암기 에너지를 조용히 흡수하는 신비로운 알입니다. 첫 단어를 외우고 간식을 나누면 금빛 균열이 피어오릅니다.',
  },
  {
    stage: 2,
    title: '아기 버디',
    enTitle: 'Sprout Buddy',
    minExp: 30,
    coinBonusPct: 5,
    expBonusPct: 5,
    maxShields: 2,
    description: '새싹 귀가 쫑긋한 아기 학습 펫! 모든 보상 코인과 EXP +5%.',
    signatureTrait: '새싹 집중 감각 · 보호막 슬롯 2칸 확장',
    pokedexLore:
      '단어장의 새싹이 돋아난 사랑스러운 동반자입니다. 발음을 따라 읽을 때마다 귀를 쫑긋이며 응원 코인을 더 모아줍니다.',
  },
  {
    stage: 3,
    title: '탐험가 견습생',
    enTitle: 'Word Explorer',
    minExp: 180,
    coinBonusPct: 10,
    expBonusPct: 10,
    maxShields: 2,
    description: '단어 수첩과 나침반을 들고 어휘 세계를 모험하는 견습생 (+10% 보너스).',
    signatureTrait: '어휘 나침반 · 보상 코인·EXP +10%',
    pokedexLore:
      '작은 영단어 수첩과 나침반을 메고 문맥과 발음의 숲을 누비는 견습생입니다. 게임과 3분 루틴의 보상을 든든히 키워줍니다.',
  },
  {
    stage: 4,
    title: '지식의 수호자',
    enTitle: 'Sage Guardian',
    minExp: 500,
    coinBonusPct: 15,
    expBonusPct: 15,
    maxShields: 3,
    description: '망각 곡선을 막아주는 지혜로운 수호자! 스트릭 보호막 최대 3칸 해금.',
    signatureTrait: '망각 방패 · 보호막 최대 3칸 완전 해금',
    pokedexLore:
      '망각 곡선의 파도로부터 학습자의 장기 기억과 연속 학습 스트릭을 수호하는 현자 파트너입니다.',
  },
  {
    stage: 5,
    title: '전설의 그랜드 마스코트',
    enTitle: 'Grand Scholar Legend',
    minExp: 1200,
    coinBonusPct: 25,
    expBonusPct: 20,
    maxShields: 3,
    description: '황금빛 지혜의 별을 두른 전설 파트너! 코인 +25% · EXP +20% 보너스.',
    signatureTrait: '지혜의 별 · 코인 +25% & EXP +20% 극대화',
    pokedexLore:
      '꾸준한 암기·원어민 발음·집중 루틴의 정점에 오른 전설적 동반자입니다. 모든 학습 활동에서 최고 등급의 보너스를 발휘합니다.',
  },
];

export const PET_ROOMS: PetRoomInfo[] = [
  {
    id: 'sunlit_desk',
    name: '햇살 공부방',
    enName: 'Sunlit Desk Room',
    price: 0,
    description: '따뜻한 아침 햇살과 원목 책상이 어우러진 기본 학습 공간',
    accentHex: '#f59e0b',
  },
  {
    id: 'botanical_greenhouse',
    name: '식물원 온실',
    enName: 'Botanical Greenhouse',
    price: 120,
    description: '푸른 식물과 유리창 너머 햇살이 감싸는 집중 치유 온실',
    accentHex: '#10b981',
  },
  {
    id: 'starlight_loft',
    name: '별빛 다락방',
    enName: 'Starlight Study Loft',
    price: 220,
    description: '천체 망원경과 밤하늘 은하수가 펼쳐지는 고요한 야간 다락방',
    accentHex: '#6366f1',
  },
  {
    id: 'grand_library',
    name: '그랜드 도서관',
    enName: 'Grand Library Hall',
    price: 380,
    description: '거대한 책장과 샹들리에가 빛나는 최고급 학자의 아카데미 서재',
    accentHex: '#d97706',
  },
];

export const PET_COSTUMES: PetCostumeInfo[] = [
  {
    id: 'scholar_glasses',
    name: '학자 금테 안경',
    enName: 'Scholar Glasses',
    price: 80,
    perkLabel: '지적 집중 분위기',
    description: '단어와 문장을 더 또렷하게 분석하는 지적인 안경 아이템',
  },
  {
    id: 'cozy_scarf',
    name: '포근한 니트 머플러',
    enName: 'Cozy Knit Scarf',
    price: 110,
    perkLabel: '친밀도 케어 감성',
    description: '쓰다듬을 때마다 기분이 포근해지는 따뜻한 줄무늬 스카프',
  },
  {
    id: 'explorer_hat',
    name: '모험가 페도라',
    enName: 'Explorer Hat',
    price: 160,
    perkLabel: '어휘 탐험 스타일',
    description: '새로운 커리큘럼과 16종 게임을 정복할 때 어울리는 모험가 모자',
  },
  {
    id: 'starlight_cape',
    name: '별빛 수호 망토',
    enName: 'Starlight Cape',
    price: 260,
    perkLabel: '야간 몰입 오라',
    description: '은은한 별빛 문양이 수놓아진 수호자 전용 망토',
  },
  {
    id: 'golden_laurel',
    name: '황금 월계관',
    enName: 'Golden Laurel Crown',
    price: 420,
    perkLabel: '마스터 명예 장식',
    description: '꾸준한 복습을 완수한 학습자의 펫에게 어울리는 황금 왕관',
  },
];

function createFreshDailyLedger(dateStr: string): PetDailyLedger {
  return {
    date: dateStr,
    vocabIds: [],
    gameCount: 0,
    pronCount: 0,
    focusCount: 0,
    questClaimed: false,
    lastGameRewardAtMs: 0,
  };
}

export function createDefaultPetState(todayStr: string = getLocalDateString()): PetCompanionState {
  return {
    version: 1,
    name: '루미',
    stage: 1,
    exp: 0,
    coins: 60,
    snacks: 3,
    specialTreats: 1,
    fullness: 78,
    bond: 24,
    streakShields: 1,
    unlockedRooms: ['sunlit_desk'],
    equippedRoom: 'sunlit_desk',
    unlockedCostumes: [],
    equippedCostume: null,
    lastFedAt: null,
    lastPettedAt: null,
    lastDailySupplyDate: null,
    lastActiveStudyDate: todayStr,
    lastShieldProtectedDate: null,
    totalFeedCount: 0,
    totalPetCount: 0,
    totalEvolutions: 0,
    soundEnabled: true,
    dailyLedger: createFreshDailyLedger(todayStr),
    lastStudyAction: null,
    moodHistory: {},
    moodLogs: [],
    studyBoost: null,
    pendingEvolutionOverlayStage: null,
    lastEvolutionCelebratedStage: null,
    lastHungerTickAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getStageInfo(stage: PetStage): PetEvolutionStageInfo {
  return PET_EVOLUTION_STAGES.find((s) => s.stage === stage) || PET_EVOLUTION_STAGES[0];
}

export function getNextStageInfo(stage: PetStage): PetEvolutionStageInfo | null {
  if (stage >= 5) return null;
  return PET_EVOLUTION_STAGES.find((s) => s.stage === ((stage + 1) as PetStage)) || null;
}

export function getEvolutionStatus(state: PetCompanionState): {
  currentStage: PetEvolutionStageInfo;
  nextStage: PetEvolutionStageInfo | null;
  isReadyToEvolve: boolean;
  progressPercent: number;
  expIntoStage: number;
  expRequiredForNext: number;
  expRemaining: number;
} {
  const currentStage = getStageInfo(state.stage);
  const nextStage = getNextStageInfo(state.stage);
  if (!nextStage) {
    return {
      currentStage,
      nextStage: null,
      isReadyToEvolve: false,
      progressPercent: 100,
      expIntoStage: state.exp - currentStage.minExp,
      expRequiredForNext: 0,
      expRemaining: 0,
    };
  }
  const span = Math.max(1, nextStage.minExp - currentStage.minExp);
  const expIntoStage = Math.max(0, state.exp - currentStage.minExp);
  const expRemaining = Math.max(0, nextStage.minExp - state.exp);
  const progressPercent = Math.min(100, Math.round((expIntoStage / span) * 100));
  return {
    currentStage,
    nextStage,
    isReadyToEvolve: state.exp >= nextStage.minExp,
    progressPercent,
    expIntoStage,
    expRequiredForNext: span,
    expRemaining,
  };
}

/**
 * Build the 5-stage Pet Evolution Pokedex entries with unlock state and concrete
 * WordLoop learning milestone hints for remaining evolutions.
 */
export function buildPetEvolutionPokedex(
  state: PetCompanionState,
  stats?: { masteredCount?: number; streakDays?: number }
): PetPokedexEntry[] {
  const masteredCount = stats?.masteredCount ?? 0;
  const streakDays = stats?.streakDays ?? 1;

  const hintsByStage: Record<
    PetStage,
    { summary: string; hints: PetPokedexMilestoneHint[] }
  > = {
    1: {
      summary: 'WordLoop 첫 학습 시작 시 기본 해금되는 시작 단계',
      hints: [
        {
          id: 's1_start',
          activity: '학습 펫 입양 완료',
          targetHint: '오늘 학습 허브에 진입하면 자동 해금됩니다',
          expYield: '0 EXP · 기본 지급',
          isSatisfied: true,
        },
      ],
    },
    2: {
      summary: '첫 단어 암기 마일스톤 또는 일일 케어로 부화',
      hints: [
        {
          id: 's2_vocab',
          activity: '단어 2개 완벽 암기하기',
          targetHint: `현재 암기 완료 ${masteredCount}단어 (암기 1개당 +16 EXP)`,
          expYield: '+32 EXP · 즉시 부화 조건 충족',
          isSatisfied: masteredCount >= 2 || state.exp >= 30,
        },
        {
          id: 's2_care',
          activity: '쓰다듬기 2회 + 단어 간식 2회 주기',
          targetHint: '홈 위젯이나 키우기 방에서 바로 케어하거나 Earn Food 퀴즈 풀기',
          expYield: '+34 EXP · 코인 보너스 +5% 개방',
          isSatisfied: state.totalFeedCount >= 2 && state.totalPetCount >= 2,
        },
        {
          id: 's2_routine',
          activity: '3분 집중 루틴 또는 Study Boost 1회 완주',
          targetHint: '짧은 집중 세션 1회만 끝내도 부화 경험치가 한 번에 쌓입니다',
          expYield: '+35 EXP · 코인 2배 찬스',
          isSatisfied: state.dailyLedger.focusCount >= 1 || state.exp >= 30,
        },
      ],
    },
    3: {
      summary: '발음·단어 암기·3분 루틴 조합으로 어휘 탐험가 각성',
      hints: [
        {
          id: 's3_vocab_pack',
          activity: '누적 단어 10개 완벽 암기 달성',
          targetHint: `현재 ${masteredCount}/10단어 마스터 · 단어장과 플래시카드에서 복습 완료`,
          expYield: '약 +160 EXP',
          isSatisfied: masteredCount >= 10 || state.exp >= 180,
        },
        {
          id: 's3_pron',
          activity: 'AI 원어민 발음 대결 80점+ 4회 이상 성공',
          targetHint: '단어·문장 발음 연습으로 원어민 억양 정복하기',
          expYield: '+20~21 EXP / 회',
          isSatisfied: state.dailyLedger.pronCount >= 4 || state.exp >= 180,
        },
        {
          id: 's3_quest',
          activity: '일일 3분 퀘스트 & Study Boost 병행',
          targetHint: '일일 퀘스트 완료 시 +80 EXP와 특별 영양식 2개(+64 EXP 상당) 획득',
          expYield: '+80~144 EXP',
          isSatisfied: state.dailyLedger.questClaimed && state.exp >= 180,
        },
      ],
    },
    4: {
      summary: '꾸준한 SM-2 복습·16종 인지게임·연속 스트릭으로 수호자 승급',
      hints: [
        {
          id: 's4_mastery',
          activity: '누적 25단어 이상 완벽 암기 & SM-2 복습',
          targetHint: `현재 ${masteredCount}/25단어 마스터 · 망각 직전 단어 인출 시 보상 지속 적립`,
          expYield: '약 +400 EXP',
          isSatisfied: masteredCount >= 25 || state.exp >= 500,
        },
        {
          id: 's4_games',
          activity: '16종 인지게임 라운드 12회 클리어',
          targetHint: '메타인지 결투·단어 짝맞추기·리듬 어택 등 3승마다 특별 영양식 추가',
          expYield: '+15 EXP / 라운드 + 영양식',
          isSatisfied: state.exp >= 500,
        },
        {
          id: 's4_streak',
          activity: '3일 이상 연속 학습 스트릭 유지 + 일일 퀘스트 3회',
          targetHint: `현재 ${streakDays}일 연속 학습 중 · 해금 시 스트릭 보호막 최대 3칸 확장`,
          expYield: '+240 EXP 이상 · 보호막 3칸 개방',
          isSatisfied: (streakDays >= 3 && state.exp >= 500) || state.stage >= 4,
        },
      ],
    },
    5: {
      summary: '어휘 마스터리·발음·집중 루틴의 정점, 전설 마스코트 최종 진화',
      hints: [
        {
          id: 's5_scholar',
          activity: '누적 50단어 이상 완벽 암기 달성',
          targetHint: `현재 ${masteredCount}/50단어 마스터 · Stage 4 패시브(+15% EXP)로 가속 가능`,
          expYield: '약 +800~920 EXP',
          isSatisfied: masteredCount >= 50 || state.exp >= 1200,
        },
        {
          id: 's5_boost',
          activity: '5분 Study Boost 및 3분 루틴·일일 퀘스트 주간 완주',
          targetHint: '5일간 일일 퀘스트·딥포커스·영양식을 꾸준히 조합하면 전설 도달',
          expYield: '+115~150 EXP / 일',
          isSatisfied: state.exp >= 1200,
        },
        {
          id: 's5_legend',
          activity: '1,200 EXP 돌파 후 진화 의식 완료',
          targetHint: '해금 시 모든 학습 활동 코인 +25% · EXP +20% 최종 영구 버프 적용',
          expYield: '보너스 +200 코인 · 전설 오라',
          isSatisfied: state.stage >= 5,
        },
      ],
    },
  };

  return PET_EVOLUTION_STAGES.map((stageInfo) => {
    const isUnlocked = state.stage >= stageInfo.stage;
    const isCurrent = state.stage === stageInfo.stage;
    const isReadyToEvolveNow =
      stageInfo.stage === state.stage + 1 && state.exp >= stageInfo.minExp;
    const expRemaining = Math.max(0, stageInfo.minExp - state.exp);
    const expProgressPct =
      stageInfo.minExp <= 0
        ? 100
        : Math.min(100, Math.round((state.exp / stageInfo.minExp) * 100));
    const estimatedWordsToUnlock =
      expRemaining === 0 ? 0 : Math.max(1, Math.ceil(expRemaining / 16));
    const cfg = hintsByStage[stageInfo.stage];

    return {
      ...stageInfo,
      entryNumber: `No. 0${stageInfo.stage}`,
      isUnlocked,
      isCurrent,
      isReadyToEvolveNow,
      expProgressPct,
      expRemaining,
      estimatedWordsToUnlock,
      milestoneSummary: cfg.summary,
      unlockHints: cfg.hints,
    };
  });
}

function applyDailyFullnessDecay(
  state: PetCompanionState,
  todayStr: string,
  nowMs: number = Date.now()
): PetCompanionState {
  const tickRef = state.lastHungerTickAt || state.lastFedAt || state.updatedAt;
  const tickMs = tickRef ? new Date(tickRef).getTime() : NaN;
  let nextFullness = state.fullness;
  let nextHungerTickAt = state.lastHungerTickAt || new Date(nowMs).toISOString();

  if (Number.isFinite(tickMs) && nowMs > tickMs) {
    const steps = Math.floor((nowMs - tickMs) / HUNGER_DECAY_INTERVAL_MS);
    if (steps > 0) {
      nextFullness = Math.max(0, state.fullness - steps);
      nextHungerTickAt = new Date(tickMs + steps * HUNGER_DECAY_INTERVAL_MS).toISOString();
    }
  } else if (state.dailyLedger.date !== todayStr) {
    let decay = 14;
    if (state.lastActiveStudyDate) {
      const gap = calculateCalendarDaysDiff(state.lastActiveStudyDate, todayStr);
      if (gap > 1) {
        decay = Math.min(48, gap * 14);
      }
    }
    nextFullness = Math.max(10, state.fullness - decay);
    nextHungerTickAt = new Date(nowMs).toISOString();
  }

  if (
    nextFullness === state.fullness &&
    nextHungerTickAt === state.lastHungerTickAt &&
    state.dailyLedger.date === todayStr
  ) {
    return state;
  }

  return {
    ...state,
    fullness: nextFullness,
    lastHungerTickAt: nextHungerTickAt,
    dailyLedger: state.dailyLedger.date === todayStr ? state.dailyLedger : createFreshDailyLedger(todayStr),
  };
}

export function sanitizePetState(raw: unknown): PetCompanionState {
  const todayStr = getLocalDateString();
  const base = createDefaultPetState(todayStr);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<PetCompanionState>;

  const validStages: PetStage[] = [1, 2, 3, 4, 5];
  const stage: PetStage = validStages.includes(r.stage as PetStage) ? (r.stage as PetStage) : 1;

  const validRoomIds = new Set<PetRoomId>(PET_ROOMS.map((rm) => rm.id));
  const unlockedRooms = Array.isArray(r.unlockedRooms)
    ? Array.from(new Set<PetRoomId>(['sunlit_desk', ...r.unlockedRooms.filter((id): id is PetRoomId => validRoomIds.has(id))]))
    : ['sunlit_desk' as PetRoomId];
  const equippedRoom: PetRoomId =
    r.equippedRoom && validRoomIds.has(r.equippedRoom) && unlockedRooms.includes(r.equippedRoom)
      ? r.equippedRoom
      : 'sunlit_desk';

  const validCostumeIds = new Set<PetCostumeId>(PET_COSTUMES.map((c) => c.id));
  const unlockedCostumes = Array.isArray(r.unlockedCostumes)
    ? Array.from(new Set<PetCostumeId>(r.unlockedCostumes.filter((id): id is PetCostumeId => validCostumeIds.has(id))))
    : [];
  const equippedCostume: PetCostumeId | null =
    r.equippedCostume && validCostumeIds.has(r.equippedCostume) && unlockedCostumes.includes(r.equippedCostume)
      ? r.equippedCostume
      : null;

  const ledgerRaw = r.dailyLedger;
  const dailyLedger: PetDailyLedger =
    ledgerRaw && typeof ledgerRaw === 'object' && typeof ledgerRaw.date === 'string'
      ? {
          date: ledgerRaw.date,
          vocabIds: Array.isArray(ledgerRaw.vocabIds) ? ledgerRaw.vocabIds.slice(0, 500).map(String) : [],
          gameCount: Math.max(0, Math.floor(Number(ledgerRaw.gameCount) || 0)),
          pronCount: Math.max(0, Math.floor(Number(ledgerRaw.pronCount) || 0)),
          focusCount: Math.max(0, Math.floor(Number(ledgerRaw.focusCount) || 0)),
          questClaimed: Boolean(ledgerRaw.questClaimed),
          lastGameRewardAtMs: Math.max(0, Number(ledgerRaw.lastGameRewardAtMs) || 0),
        }
      : createFreshDailyLedger(todayStr);

  const stageInfo = getStageInfo(stage);
  const clampedName =
    typeof r.name === 'string' && r.name.trim().length > 0 ? r.name.trim().slice(0, 16) : base.name;

  const merged: PetCompanionState = {
    version: 1,
    name: clampedName,
    stage,
    exp: Math.max(0, Math.floor(Number(r.exp) || 0)),
    coins: Math.max(0, Math.floor(Number(r.coins) ?? base.coins)),
    snacks: Math.max(0, Math.floor(Number(r.snacks) ?? base.snacks)),
    specialTreats: Math.max(0, Math.floor(Number(r.specialTreats) ?? base.specialTreats)),
    fullness: Math.min(100, Math.max(0, Math.round(Number(r.fullness) ?? base.fullness))),
    bond: Math.min(100, Math.max(0, Math.round(Number(r.bond) ?? base.bond))),
    streakShields: Math.min(stageInfo.maxShields, Math.max(0, Math.floor(Number(r.streakShields) ?? base.streakShields))),
    unlockedRooms,
    equippedRoom,
    unlockedCostumes,
    equippedCostume,
    lastFedAt: typeof r.lastFedAt === 'string' ? r.lastFedAt : null,
    lastPettedAt: typeof r.lastPettedAt === 'string' ? r.lastPettedAt : null,
    lastDailySupplyDate: typeof r.lastDailySupplyDate === 'string' ? r.lastDailySupplyDate : null,
    lastActiveStudyDate: typeof r.lastActiveStudyDate === 'string' ? r.lastActiveStudyDate : todayStr,
    lastShieldProtectedDate: typeof r.lastShieldProtectedDate === 'string' ? r.lastShieldProtectedDate : null,
    totalFeedCount: Math.max(0, Math.floor(Number(r.totalFeedCount) || 0)),
    totalPetCount: Math.max(0, Math.floor(Number(r.totalPetCount) || 0)),
    totalEvolutions: Math.max(0, Math.floor(Number(r.totalEvolutions) || 0)),
    soundEnabled: r.soundEnabled !== false,
    dailyLedger,
    lastStudyAction:
      r.lastStudyAction &&
      typeof r.lastStudyAction === 'object' &&
      typeof r.lastStudyAction.type === 'string' &&
      typeof r.lastStudyAction.at === 'string'
        ? {
            type: r.lastStudyAction.type,
            at: r.lastStudyAction.at,
            score:
              typeof r.lastStudyAction.score === 'number' && Number.isFinite(r.lastStudyAction.score)
                ? r.lastStudyAction.score
                : undefined,
          }
        : null,
    moodHistory: (() => {
      if (!r.moodHistory || typeof r.moodHistory !== 'object') return {};
      const entries = Object.entries(r.moodHistory)
        .filter(([dateKey, val]) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && val && typeof val === 'object')
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30);
      const out: Record<string, PetMoodHistoryEntry> = {};
      const validSentiments = new Set<PetSentimentType>([
        'bored',
        'hungry',
        'ecstatic',
        'focused',
        'happy',
        'proud',
        'curious',
      ]);
      for (const [dateKey, val] of entries) {
        const v = val as Partial<PetMoodHistoryEntry>;
        out[dateKey] = {
          score: Math.min(100, Math.max(0, Math.round(Number(v.score) || 50))),
          sentiment: validSentiments.has(v.sentiment as PetSentimentType) ? (v.sentiment as PetSentimentType) : 'curious',
          studyActions: Math.max(0, Math.floor(Number(v.studyActions) || 0)),
        };
      }
      return out;
    })(),
    moodLogs: (() => {
      if (!Array.isArray(r.moodLogs)) return [];
      const validSentiments = new Set<PetSentimentType>([
        'bored',
        'hungry',
        'ecstatic',
        'focused',
        'happy',
        'proud',
        'curious',
      ]);
      return r.moodLogs
        .filter(
          (item): item is PetMoodLogEntry =>
            Boolean(item) &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.at === 'string' &&
            typeof item.triggerTitle === 'string'
        )
        .slice(0, 60)
        .map((item) => ({
          id: String(item.id),
          at: String(item.at),
          dateStr:
            typeof item.dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.dateStr)
              ? item.dateStr
              : getLocalDateString(item.at),
          sentiment: validSentiments.has(item.sentiment) ? item.sentiment : 'curious',
          emoji: typeof item.emoji === 'string' && item.emoji ? item.emoji : '💭',
          triggerTitle: String(item.triggerTitle),
          detail: typeof item.detail === 'string' ? item.detail : '',
          category:
            item.category === 'positive' || item.category === 'negative'
              ? item.category
              : 'neutral',
          source: item.source === 'history' ? 'history' : 'recorded',
          count:
            typeof item.count === 'number' && Number.isFinite(item.count)
              ? Math.max(1, Math.floor(item.count))
              : undefined,
        }));
    })(),
    studyBoost:
      r.studyBoost &&
      typeof r.studyBoost === 'object' &&
      typeof r.studyBoost.startedAt === 'string' &&
      typeof r.studyBoost.endsAt === 'string' &&
      Number.isFinite(new Date(r.studyBoost.endsAt).getTime())
        ? {
            startedAt: r.studyBoost.startedAt,
            endsAt: r.studyBoost.endsAt,
            durationSec: Math.max(10, Math.floor(Number(r.studyBoost.durationSec) || STUDY_BOOST_DURATION_SEC)),
          }
        : null,
    pendingEvolutionOverlayStage: validStages.includes(r.pendingEvolutionOverlayStage as PetStage)
      ? (r.pendingEvolutionOverlayStage as PetStage)
      : null,
    lastEvolutionCelebratedStage: validStages.includes(r.lastEvolutionCelebratedStage as PetStage)
      ? (r.lastEvolutionCelebratedStage as PetStage)
      : null,
    lastHungerTickAt:
      typeof r.lastHungerTickAt === 'string' && Number.isFinite(new Date(r.lastHungerTickAt).getTime())
        ? r.lastHungerTickAt
        : typeof r.lastFedAt === 'string' && Number.isFinite(new Date(r.lastFedAt).getTime())
        ? r.lastFedAt
        : typeof r.updatedAt === 'string' && Number.isFinite(new Date(r.updatedAt).getTime())
        ? r.updatedAt
        : new Date().toISOString(),
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
  };

  return applyDailyFullnessDecay(merged, todayStr);
}

export function loadPetState(nowMs: number = Date.now()): PetCompanionState {
  if (typeof window === 'undefined') return createDefaultPetState();
  try {
    const raw = localStorage.getItem(PET_STORAGE_KEY);
    if (!raw) {
      const fresh = createDefaultPetState(getLocalDateString(new Date(nowMs)));
      localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw);
    const sanitized = sanitizePetState(parsed);
    const clean = applyDailyFullnessDecay(sanitized, getLocalDateString(new Date(nowMs)), nowMs);
    if (
      clean.dailyLedger.date !== parsed?.dailyLedger?.date ||
      clean.fullness !== parsed?.fullness ||
      clean.lastHungerTickAt !== parsed?.lastHungerTickAt
    ) {
      localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(clean));
    }
    return clean;
  } catch {
    return createDefaultPetState();
  }
}

export function syncPetHungerOverTime(nowMs: number = Date.now()): PetCompanionState {
  const current = loadPetState(nowMs);
  return current;
}

export function savePetState(state: PetCompanionState): PetCompanionState {
  const evo = getEvolutionStatus(state);
  let pendingStage = state.pendingEvolutionOverlayStage ?? null;
  if (
    evo.isReadyToEvolve &&
    evo.nextStage &&
    state.lastEvolutionCelebratedStage !== evo.nextStage.stage &&
    !pendingStage
  ) {
    pendingStage = evo.nextStage.stage;
  } else if (!evo.isReadyToEvolve) {
    pendingStage = null;
  }

  const next: PetCompanionState = {
    ...state,
    pendingEvolutionOverlayStage: pendingStage,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(PET_UPDATED_EVENT, { detail: next }));
    } catch {}
  }
  return next;
}

export function acknowledgePendingEvolutionOverlay(celebratedStage?: PetStage | null): PetCompanionState {
  const current = loadPetState();
  const targetStage =
    celebratedStage ??
    current.pendingEvolutionOverlayStage ??
    getEvolutionStatus(current).nextStage?.stage ??
    current.lastEvolutionCelebratedStage ??
    null;
  return savePetState({
    ...current,
    pendingEvolutionOverlayStage: null,
    lastEvolutionCelebratedStage: targetStage,
  });
}

export function exportPetStateForBackup(): PetCompanionState {
  return loadPetState();
}

export function restorePetStateFromBackup(rawPetState: unknown): PetCompanionState {
  const clean = sanitizePetState(rawPetState);
  return savePetState(clean);
}

export function resetPetState(): PetCompanionState {
  const fresh = createDefaultPetState();
  return savePetState(fresh);
}

export function getStudyBoostStatus(
  state: PetCompanionState,
  nowMs: number = Date.now()
): {
  isActive: boolean;
  isReadyToComplete: boolean;
  remainingSec: number;
  elapsedSec: number;
  progressPct: number;
  endsAtMs: number;
} {
  const boost = state.studyBoost;
  if (!boost) {
    return {
      isActive: false,
      isReadyToComplete: false,
      remainingSec: 0,
      elapsedSec: 0,
      progressPct: 0,
      endsAtMs: 0,
    };
  }
  const startMs = new Date(boost.startedAt).getTime();
  const endsAtMs = new Date(boost.endsAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endsAtMs)) {
    return {
      isActive: false,
      isReadyToComplete: false,
      remainingSec: 0,
      elapsedSec: 0,
      progressPct: 0,
      endsAtMs: 0,
    };
  }
  const totalSec = Math.max(1, boost.durationSec || STUDY_BOOST_DURATION_SEC);
  const remainingMs = Math.max(0, endsAtMs - nowMs);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const elapsedSec = Math.min(totalSec, Math.max(0, totalSec - remainingSec));
  const progressPct = Math.min(100, Math.round((elapsedSec / totalSec) * 100));
  return {
    isActive: remainingMs > 0,
    isReadyToComplete: remainingMs === 0,
    remainingSec,
    elapsedSec,
    progressPct,
    endsAtMs,
  };
}

export function getPetMood(state: PetCompanionState): { mood: PetMood; label: string; enLabel: string } {
  if (getStudyBoostStatus(state).isActive) {
    return {
      mood: 'focused',
      label: '5분 초집중 부스트 · 스터디 코인 2배 적용 중',
      enLabel: 'Deep Focus (2x Coins)',
    };
  }
  if (state.fullness < 35) {
    return { mood: 'hungry', label: '배고픔 · 간식이 필요해요', enLabel: 'Hungry' };
  }
  if (state.stage === 5) {
    return { mood: 'legendary', label: '찬란함 · 전설의 오라', enLabel: 'Radiant' };
  }
  if (state.bond >= 75 && state.fullness >= 70) {
    return { mood: 'joyful', label: '행복함 · 학습 의욕 최고', enLabel: 'Joyful' };
  }
  if (state.fullness >= 55) {
    return { mood: 'focused', label: '집중 중 · 복습 대기', enLabel: 'Focused' };
  }
  return { mood: 'curious', label: '호기심 · 새 단어 탐험', enLabel: 'Curious' };
}

/**
 * Derive a visual sentiment indicator (emoji + short thought-bubble label)
 * reflecting recent study performance and inactivity gaps.
 */
export function getPetSentimentIndicator(params: {
  state: PetCompanionState;
  dueCount: number;
  masteredCount: number;
  streakDays: number;
  nowMs?: number;
}): PetSentimentIndicator {
  const { state, dueCount, masteredCount, streakDays, nowMs = Date.now() } = params;
  const boostStatus = getStudyBoostStatus(state, nowMs);
  if (boostStatus.isActive) {
    return {
      sentiment: 'focused',
      emoji: '🎯',
      shortLabel: '초집중 모드!',
      detail: '5분 딥포커스 진행 중! 완주 시 스터디 코인 2배 보상을 획득해요.',
      tone: 'indigo',
    };
  }
  const todayStr = getLocalDateString();
  const daysSinceActive = state.lastActiveStudyDate
    ? calculateCalendarDaysDiff(state.lastActiveStudyDate, todayStr)
    : 0;

  const lastActionMs = state.lastStudyAction?.at ? new Date(state.lastStudyAction.at).getTime() : NaN;
  const hoursSinceStudyAction =
    Number.isFinite(lastActionMs) ? Math.max(0, (nowMs - lastActionMs) / (1000 * 60 * 60)) : null;

  const hasStudiedToday =
    state.dailyLedger.vocabIds.length > 0 ||
    state.dailyLedger.gameCount > 0 ||
    state.dailyLedger.pronCount > 0 ||
    state.dailyLedger.focusCount > 0 ||
    state.dailyLedger.questClaimed;

  // 1. Long inactivity -> bored
  if (
    daysSinceActive >= 2 ||
    (!hasStudiedToday && hoursSinceStudyAction !== null && hoursSinceStudyAction >= 16) ||
    (daysSinceActive >= 1 && !hasStudiedToday && state.fullness < 55)
  ) {
    const gapText =
      daysSinceActive >= 2
        ? `${daysSinceActive}일 동안 학습이 쉬어 심심해하고 있어요.`
        : '한동안 복습이 멈춰서 같이 공부하길 기다리고 있어요.';
    return {
      sentiment: 'bored',
      emoji: '🥱',
      shortLabel: '심심해...',
      detail: gapText,
      tone: 'slate',
    };
  }

  // 2. Low fullness -> hungry
  if (state.fullness < 35) {
    return {
      sentiment: 'hungry',
      emoji: '🍪',
      shortLabel: '배고파요',
      detail: `포만감이 ${state.fullness}%예요. 단어를 외워 간식을 선물해 주세요!`,
      tone: 'rose',
    };
  }

  // 3. Ready to evolve -> ecstatic
  if (getEvolutionStatus(state).isReadyToEvolve) {
    return {
      sentiment: 'ecstatic',
      emoji: '✨',
      shortLabel: '진화 준비!',
      detail: '학습 경험치가 가득 차서 다음 단계로 진화할 준비가 되었어요!',
      tone: 'amber',
    };
  }

  // 4. Recent high achievement / mastery -> happy
  if (hoursSinceStudyAction !== null && hoursSinceStudyAction <= 3 && state.lastStudyAction) {
    const act = state.lastStudyAction;
    if (act.type === 'vocab_mastery') {
      return {
        sentiment: 'happy',
        emoji: '🥳',
        shortLabel: '암기 최고!',
        detail: '방금 단어를 완벽 암기해서 기분이 날아갈 것 같아요!',
        tone: 'emerald',
      };
    }
    if (act.type === 'daily_quest') {
      return {
        sentiment: 'happy',
        emoji: '🏆',
        shortLabel: '퀘스트 완료!',
        detail: '오늘의 일일 학습 퀘스트를 달성해 무척 뿌듯해해요.',
        tone: 'amber',
      };
    }
    if (act.type === 'focus_routine') {
      return {
        sentiment: 'happy',
        emoji: '🌟',
        shortLabel: '루틴 완주!',
        detail: '3분 집중 루틴 완주 덕분에 학습 에너지가 넘쳐요!',
        tone: 'indigo',
      };
    }
    if (act.type === 'pronunciation') {
      return {
        sentiment: 'happy',
        emoji: '🎤',
        shortLabel: '발음 굿!',
        detail: '방금 통과한 멋진 영어 발음 실력에 감탄하고 있어요!',
        tone: 'emerald',
      };
    }
    if (act.type === 'game_round' && (act.score ?? 0) >= 80) {
      return {
        sentiment: 'happy',
        emoji: '🎮',
        shortLabel: '게임 대성공!',
        detail: `최근 게임에서 ${act.score}점을 기록해 무척 신나 있어요!`,
        tone: 'indigo',
      };
    }
  }

  if (hasStudiedToday && (state.dailyLedger.questClaimed || state.dailyLedger.vocabIds.length >= 3)) {
    return {
      sentiment: 'happy',
      emoji: '😄',
      shortLabel: '오늘 짱!',
      detail: `오늘 단어 ${state.dailyLedger.vocabIds.length}개를 학습해 기분이 아주 좋아요.`,
      tone: 'emerald',
    };
  }

  // 5. Active today or all reviews cleared -> proud/focused
  if (hasStudiedToday || (dueCount === 0 && masteredCount > 0)) {
    return {
      sentiment: 'proud',
      emoji: streakDays >= 3 ? '🔥' : '🤓',
      shortLabel: dueCount === 0 ? '복습 클리어!' : '열공 중!',
      detail:
        dueCount === 0
          ? '밀린 복습 단어를 모두 마쳐서 여유롭게 응원 중이에요.'
          : `${streakDays}일 연속 학습 리듬을 멋지게 이어가고 있어요!`,
      tone: 'indigo',
    };
  }

  // 6. Default curious state waiting to warm up
  return {
    sentiment: 'curious',
    emoji: dueCount > 0 ? '💭' : '🌱',
    shortLabel: dueCount > 0 ? '복습할까?' : '준비 완료!',
    detail:
      dueCount > 0
        ? `오늘 복습 대기 단어 ${dueCount}개가 기다리고 있어요.`
        : '새 단어나 인지게임으로 오늘 학습을 시작해볼까요?',
    tone: 'slate',
  };
}

const SENTIMENT_META: Record<PetSentimentType, { emoji: string; label: string; baseScore: number }> = {
  ecstatic: { emoji: '✨', label: '진화 준비', baseScore: 98 },
  happy: { emoji: '🥳', label: '기분 최고', baseScore: 90 },
  focused: { emoji: '🎯', label: '초집중 모드', baseScore: 86 },
  proud: { emoji: '🔥', label: '집중 열공', baseScore: 76 },
  curious: { emoji: '💭', label: '대기 중', baseScore: 54 },
  hungry: { emoji: '🍪', label: '배고픔', baseScore: 36 },
  bored: { emoji: '🥱', label: '심심함', baseScore: 24 },
};

/**
 * Build a 7-day Mood Trend series derived from daily study consistency
 * (DailyGoalHistory, Vocab SRS review dates, Pet dailyLedger & moodHistory).
 */
export function buildPetMoodTrend7Days(params: {
  state: PetCompanionState;
  history?: DailyGoalHistory[];
  vocabList?: VocabItem[];
  dueCount?: number;
  masteredCount?: number;
  streakDays?: number;
  nowMs?: number;
}): PetMoodTrendSummary {
  const {
    state,
    history = [],
    vocabList = [],
    dueCount = 0,
    masteredCount = 0,
    streakDays = 1,
    nowMs = Date.now(),
  } = params;

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const todayDate = new Date(nowMs);
  const todayStr = getLocalDateString(todayDate);

  const goalHistoryMap = new Map<string, DailyGoalHistory>();
  for (const h of history) {
    if (h && h.date) {
      goalHistoryMap.set(h.date, h);
    }
  }

  const srsReviewsByDate = new Map<string, number>();
  for (const v of vocabList) {
    const rev = v.srs?.lastReviewedAt;
    if (typeof rev === 'string' && rev.length >= 10) {
      const localDay = getLocalDateString(rev);
      srsReviewsByDate.set(localDay, (srsReviewsByDate.get(localDay) || 0) + 1);
    }
  }

  const todayLedgerUnits =
    state.dailyLedger.date === todayStr
      ? state.dailyLedger.vocabIds.length +
        state.dailyLedger.gameCount +
        state.dailyLedger.pronCount +
        state.dailyLedger.focusCount * 2 +
        (state.dailyLedger.questClaimed ? 4 : 0)
      : 0;

  const liveSentiment = getPetSentimentIndicator({
    state,
    dueCount,
    masteredCount,
    streakDays,
    nowMs,
  });

  const days: PetMoodTrendPoint[] = [];
  let consecutiveActive = 0;
  let consecutiveIdle = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - i);
    const dateStr = getLocalDateString(d);
    const isToday = dateStr === todayStr;
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
    const dayName = dayNames[d.getDay()];

    const hist = goalHistoryMap.get(dateStr);
    const srsUnits = srsReviewsByDate.get(dateStr) || 0;
    const histUnits = hist ? (hist.vocabStudyCount || 0) + (hist.completedGoalsCount || 0) * 4 : 0;
    const savedMood = state.moodHistory?.[dateStr];
    const studyUnits = Math.max(
      histUnits,
      srsUnits,
      savedMood?.studyActions || 0,
      isToday ? todayLedgerUnits : 0
    );
    const isConsistent = studyUnits > 0;

    if (isConsistent) {
      consecutiveActive += 1;
      consecutiveIdle = 0;
    } else {
      consecutiveIdle += 1;
      consecutiveActive = 0;
    }

    let sentiment: PetSentimentType;
    let moodScore: number;
    let emoji: string;
    let label: string;

    if (isToday) {
      sentiment = liveSentiment.sentiment;
      const meta = SENTIMENT_META[sentiment];
      emoji = liveSentiment.emoji;
      label = liveSentiment.shortLabel;
      const unitBoost = Math.min(8, studyUnits);
      const vitalityShift = Math.round((state.fullness - 60) * 0.12);
      moodScore = Math.min(100, Math.max(15, meta.baseScore + unitBoost + vitalityShift));
    } else if (isConsistent) {
      sentiment = studyUnits >= 6 || consecutiveActive >= 3 ? 'happy' : 'proud';
      const base = sentiment === 'happy' ? 84 : 72;
      moodScore = Math.min(97, base + Math.min(10, Math.floor(studyUnits / 2)) + Math.min(6, consecutiveActive * 2));
      if (savedMood) {
        moodScore = Math.round((moodScore + savedMood.score) / 2);
      }
      emoji = SENTIMENT_META[sentiment].emoji;
      label = SENTIMENT_META[sentiment].label;
    } else {
      // Inactive day: 1st idle day feels curious/waiting; 2+ consecutive idle days become bored
      sentiment = consecutiveIdle >= 2 ? 'bored' : 'curious';
      moodScore = consecutiveIdle >= 2 ? Math.max(18, 28 - (consecutiveIdle - 2) * 4) : 48;
      if (savedMood && savedMood.score < moodScore) {
        moodScore = savedMood.score;
      }
      emoji = SENTIMENT_META[sentiment].emoji;
      label = SENTIMENT_META[sentiment].label;
    }

    days.push({
      dateStr,
      dateLabel,
      dayName,
      moodScore,
      studyUnits,
      sentiment,
      emoji,
      label,
      isToday,
      isConsistent,
    });
  }

  const consistentDays = days.filter((d) => d.isConsistent).length;
  const avgMoodScore = Math.round(days.reduce((sum, d) => sum + d.moodScore, 0) / days.length);
  const earlierAvg = days.slice(0, 4).reduce((sum, d) => sum + d.moodScore, 0) / 4;
  const recentAvg = days.slice(4).reduce((sum, d) => sum + d.moodScore, 0) / 3;
  const deltaScore = Math.round(recentAvg - earlierAvg);
  const trendDirection: 'up' | 'steady' | 'down' =
    deltaScore >= 6 ? 'up' : deltaScore <= -6 ? 'down' : 'steady';

  return {
    days,
    consistentDays,
    avgMoodScore,
    deltaScore,
    trendDirection,
  };
}

/**
 * Reconcile the pet's real-time state with the 7-day consistency trend so visual
 * sentiment indicators and click reactions directly reflect weekly study habits.
 */
export function deriveSentimentFromConsistency(
  trend: PetMoodTrendSummary,
  liveSentiment: PetSentimentIndicator
): PetSentimentIndicator {
  if (
    liveSentiment.sentiment === 'focused' ||
    liveSentiment.sentiment === 'ecstatic' ||
    liveSentiment.sentiment === 'hungry'
  ) {
    return liveSentiment;
  }

  if (trend.consistentDays <= 1 && trend.avgMoodScore < 48) {
    return {
      sentiment: 'bored',
      emoji: '🥱',
      shortLabel: '심심해...',
      detail: `최근 7일 학습 일관성 ${trend.consistentDays}/7일(평균 ${trend.avgMoodScore}점)이라 공부가 고파요!`,
      tone: 'rose',
    };
  }

  if (trend.consistentDays >= 5 && trend.avgMoodScore >= 75) {
    return {
      sentiment: 'happy',
      emoji: liveSentiment.sentiment === 'happy' ? liveSentiment.emoji : '🥳',
      shortLabel: liveSentiment.sentiment === 'happy' ? liveSentiment.shortLabel : `주간 ${trend.consistentDays}일 열공!`,
      detail: `최근 7일 중 ${trend.consistentDays}일 학습 달성 (평균 기분 ${trend.avgMoodScore}점)으로 최고조예요!`,
      tone: 'emerald',
    };
  }

  if (trend.consistentDays >= 3 && liveSentiment.sentiment === 'curious') {
    return {
      sentiment: 'proud',
      emoji: '🔥',
      shortLabel: `주간 ${trend.consistentDays}일 꾸준함`,
      detail: `최근 7일 중 ${trend.consistentDays}일 학습을 이어가며 성장 중이에요 (평균 ${trend.avgMoodScore}점).`,
      tone: 'indigo',
    };
  }

  return {
    ...liveSentiment,
    detail: `${liveSentiment.detail} (7일 학습 ${trend.consistentDays}/7일 · 평균 ${trend.avgMoodScore}점)`,
  };
}

function appendMoodLog(
  existing: PetMoodLogEntry[] | undefined,
  params: {
    groupKey?: string;
    at: string;
    dateStr: string;
    sentiment: PetSentimentType;
    emoji: string;
    triggerTitle: string;
    buildGroupedTitle?: (nextCount: number) => { triggerTitle: string; detail: string };
    detail: string;
    category: 'positive' | 'negative' | 'neutral';
  }
): PetMoodLogEntry[] {
  const list = Array.isArray(existing) ? [...existing] : [];
  if (params.groupKey) {
    const groupId = `${params.groupKey}:${params.dateStr}`;
    const idx = list.findIndex((item) => item.id === groupId);
    if (idx !== -1) {
      const prev = list[idx];
      const nextCount = (prev.count || 1) + 1;
      const grouped = params.buildGroupedTitle
        ? params.buildGroupedTitle(nextCount)
        : { triggerTitle: params.triggerTitle, detail: params.detail };
      const updated: PetMoodLogEntry = {
        ...prev,
        at: params.at,
        sentiment: params.sentiment,
        emoji: params.emoji,
        triggerTitle: grouped.triggerTitle,
        detail: grouped.detail,
        category: params.category,
        count: nextCount,
      };
      list.splice(idx, 1);
      return [updated, ...list].slice(0, 60);
    }
    const created: PetMoodLogEntry = {
      id: groupId,
      at: params.at,
      dateStr: params.dateStr,
      sentiment: params.sentiment,
      emoji: params.emoji,
      triggerTitle: params.triggerTitle,
      detail: params.detail,
      category: params.category,
      source: 'recorded',
      count: 1,
    };
    return [created, ...list].slice(0, 60);
  }

  const created: PetMoodLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: params.at,
    dateStr: params.dateStr,
    sentiment: params.sentiment,
    emoji: params.emoji,
    triggerTitle: params.triggerTitle,
    detail: params.detail,
    category: params.category,
    source: 'recorded',
  };
  return [created, ...list].slice(0, 60);
}

/**
 * Aggregate the past 7 days of mood trigger events from both recorded pet logs
 * and historical study consistency (DailyGoalHistory, Vocab SRS reviews, inactive days).
 */
export function buildRecentMoodLogs(params: {
  state: PetCompanionState;
  history?: DailyGoalHistory[];
  vocabList?: VocabItem[];
  dueCount?: number;
  masteredCount?: number;
  streakDays?: number;
  nowMs?: number;
}): PetMoodLogEntry[] {
  const {
    state,
    history = [],
    vocabList = [],
    dueCount = 0,
    masteredCount = 0,
    streakDays = 1,
    nowMs = Date.now(),
  } = params;

  const todayDate = new Date(nowMs);
  const todayStr = getLocalDateString(todayDate);
  const cutoffDate = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate() - 6
  );
  const cutoffStr = getLocalDateString(cutoffDate);

  const recordedLogs = (state.moodLogs || []).filter(
    (log) => log.dateStr >= cutoffStr && log.dateStr <= todayStr
  );

  const recordedDates = new Set(recordedLogs.map((l) => l.dateStr));
  const trend = buildPetMoodTrend7Days({
    state,
    history,
    vocabList,
    dueCount,
    masteredCount,
    streakDays,
    nowMs,
  });

  const goalHistoryMap = new Map<string, DailyGoalHistory>();
  for (const h of history) {
    if (h?.date) goalHistoryMap.set(h.date, h);
  }

  const reviewsByDate = new Map<string, number>();
  for (const v of vocabList) {
    const rev = v.srs?.lastReviewedAt;
    if (typeof rev === 'string' && rev.length >= 10) {
      const day = getLocalDateString(rev);
      reviewsByDate.set(day, (reviewsByDate.get(day) || 0) + 1);
    }
  }

  const synthesized: PetMoodLogEntry[] = [];

  for (const dayPoint of trend.days) {
    const [y, m, d] = dayPoint.dateStr.split('-').map(Number);
    const noonIso = new Date(y, (m || 1) - 1, d || 1, 18, 0, 0).toISOString();
    const hist = goalHistoryMap.get(dayPoint.dateStr);
    const srsCount = reviewsByDate.get(dayPoint.dateStr) || 0;
    const vocabCount = Math.max(hist?.vocabStudyCount || 0, srsCount);

    if (dayPoint.isToday) {
      if (state.fullness < 35) {
        synthesized.push({
          id: `live_hungry_${todayStr}`,
          at: new Date(nowMs).toISOString(),
          dateStr: todayStr,
          sentiment: 'hungry',
          emoji: '🍪',
          triggerTitle: `Low Hunger (${state.fullness}%)`,
          detail: '포만감이 35% 아래로 떨어졌어요 · Earn Food 퀴즈 또는 간식이 필요해요.',
          category: 'negative',
          source: 'history',
        });
      }
      if (!recordedDates.has(todayStr) && !dayPoint.isConsistent) {
        synthesized.push({
          id: `live_waiting_${todayStr}`,
          at: new Date(nowMs - 1000).toISOString(),
          dateStr: todayStr,
          sentiment: 'curious',
          emoji: dueCount > 0 ? '💭' : '🌱',
          triggerTitle: dueCount > 0 ? `${dueCount} words due for review` : 'Waiting for first study session',
          detail:
            dueCount > 0
              ? `오늘 복습할 단어 ${dueCount}개가 기다리고 있어요.`
              : '오늘 첫 학습을 시작하면 기분이 바로 올라가요.',
          category: 'neutral',
          source: 'history',
        });
      }
      continue;
    }

    if (recordedDates.has(dayPoint.dateStr)) {
      continue;
    }

    if (dayPoint.isConsistent) {
      if (vocabCount > 0) {
        synthesized.push({
          id: `hist_vocab_${dayPoint.dateStr}`,
          at: noonIso,
          dateStr: dayPoint.dateStr,
          sentiment: dayPoint.sentiment,
          emoji: dayPoint.emoji,
          triggerTitle: vocabCount >= 5 ? `Mastered ${vocabCount} words` : `Studied ${vocabCount} words`,
          detail: `${dayPoint.dateLabel}(${dayPoint.dayName}) 어휘 ${vocabCount}개 학습 완료 · 기분 ${dayPoint.moodScore}점`,
          category: 'positive',
          source: 'history',
          count: vocabCount,
        });
      } else {
        const goalsCount = hist?.completedGoalsCount || Math.max(1, Math.round(dayPoint.studyUnits / 3));
        synthesized.push({
          id: `hist_goal_${dayPoint.dateStr}`,
          at: noonIso,
          dateStr: dayPoint.dateStr,
          sentiment: dayPoint.sentiment,
          emoji: dayPoint.emoji,
          triggerTitle: `Completed ${goalsCount} study ${goalsCount === 1 ? 'session' : 'sessions'}`,
          detail: `${dayPoint.dateLabel}(${dayPoint.dayName}) 학습 목표 달성으로 기분이 좋아졌어요 · ${dayPoint.moodScore}점`,
          category: 'positive',
          source: 'history',
        });
      }
    } else {
      synthesized.push({
        id: `hist_skip_${dayPoint.dateStr}`,
        at: noonIso,
        dateStr: dayPoint.dateStr,
        sentiment: 'bored',
        emoji: '🥱',
        triggerTitle: 'Skipped study session',
        detail: `${dayPoint.dateLabel}(${dayPoint.dayName}) 학습 기록이 비어 ${state.name}이(가) 심심해했어요.`,
        category: 'negative',
        source: 'history',
      });
    }
  }

  return [...recordedLogs, ...synthesized].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

export function playPetSound(kind: PetSoundEffectId): void {
  if (typeof window === 'undefined') return;
  const state = loadPetState();
  playPetSoundEffect(kind, { soundEnabled: state.soundEnabled });
}

/**
 * Award Coins, Pet EXP, and Snacks cleanly from real study activities with anti-spam deduplication
 */
export function rewardPetStudyAction(
  action: PetStudyActionType,
  meta?: { vocabId?: string; score?: number }
): PetRewardResult {
  const todayStr = getLocalDateString();
  const current = applyDailyFullnessDecay(loadPetState(), todayStr);
  const stageInfo = getStageInfo(current.stage);
  const ledger = { ...current.dailyLedger, vocabIds: [...current.dailyLedger.vocabIds] };
  const nowMs = Date.now();

  let baseCoins = 0;
  let baseExp = 0;
  let snacksDelta = 0;
  let specialTreatsDelta = 0;

  if (action === 'vocab_mastery') {
    const key = meta?.vocabId ? `m:${meta.vocabId}` : `m:anon:${Math.floor(nowMs / 10000)}`;
    if (ledger.vocabIds.includes(key)) {
      return {
        awarded: false,
        coinsDelta: 0,
        expDelta: 0,
        snacksDelta: 0,
        specialTreatsDelta: 0,
        readyToEvolve: getEvolutionStatus(current).isReadyToEvolve,
        state: current,
        reason: 'already_rewarded_today',
      };
    }
    ledger.vocabIds.push(key);
    baseCoins = 22;
    baseExp = 16;
    snacksDelta = 1;
  } else if (action === 'vocab_learning') {
    const key = meta?.vocabId ? `l:${meta.vocabId}` : `l:anon:${Math.floor(nowMs / 10000)}`;
    if (ledger.vocabIds.includes(key)) {
      return {
        awarded: false,
        coinsDelta: 0,
        expDelta: 0,
        snacksDelta: 0,
        specialTreatsDelta: 0,
        readyToEvolve: getEvolutionStatus(current).isReadyToEvolve,
        state: current,
        reason: 'already_rewarded_today',
      };
    }
    ledger.vocabIds.push(key);
    baseCoins = 10;
    baseExp = 8;
  } else if (action === 'pronunciation') {
    if (ledger.pronCount >= 10) {
      return {
        awarded: false,
        coinsDelta: 0,
        expDelta: 0,
        snacksDelta: 0,
        specialTreatsDelta: 0,
        readyToEvolve: getEvolutionStatus(current).isReadyToEvolve,
        state: current,
        reason: 'daily_cap_reached',
      };
    }
    ledger.pronCount += 1;
    baseCoins = 25;
    baseExp = 20;
    snacksDelta = 1;
  } else if (action === 'focus_routine') {
    if (ledger.focusCount >= 3) {
      return {
        awarded: false,
        coinsDelta: 0,
        expDelta: 0,
        snacksDelta: 0,
        specialTreatsDelta: 0,
        readyToEvolve: getEvolutionStatus(current).isReadyToEvolve,
        state: current,
        reason: 'daily_cap_reached',
      };
    }
    ledger.focusCount += 1;
    baseCoins = 45;
    baseExp = 35;
    snacksDelta = 2;
    specialTreatsDelta = 1;
  } else if (action === 'daily_quest') {
    if (ledger.questClaimed) {
      return {
        awarded: false,
        coinsDelta: 0,
        expDelta: 0,
        snacksDelta: 0,
        specialTreatsDelta: 0,
        readyToEvolve: getEvolutionStatus(current).isReadyToEvolve,
        state: current,
        reason: 'already_claimed_today',
      };
    }
    ledger.questClaimed = true;
    baseCoins = 100;
    baseExp = 80;
    snacksDelta = 3;
    specialTreatsDelta = 2;
  } else if (action === 'game_round') {
    if (ledger.gameCount >= 15 || nowMs - ledger.lastGameRewardAtMs < 12000) {
      return {
        awarded: false,
        coinsDelta: 0,
        expDelta: 0,
        snacksDelta: 0,
        specialTreatsDelta: 0,
        readyToEvolve: getEvolutionStatus(current).isReadyToEvolve,
        state: current,
        reason: 'cooldown_or_cap',
      };
    }
    ledger.gameCount += 1;
    ledger.lastGameRewardAtMs = nowMs;
    baseCoins = 18;
    baseExp = 15;
    snacksDelta = 1;
    if (ledger.gameCount % 3 === 0) {
      specialTreatsDelta = 1;
    }
  } else if (action === 'audio_milestone') {
    baseCoins = 15;
    baseExp = 10;
    snacksDelta = 1;
  }

  const boostMultiplier = getStudyBoostStatus(current, nowMs).isActive ? 2 : 1;
  const coinsDelta = Math.round(baseCoins * (1 + stageInfo.coinBonusPct / 100)) * boostMultiplier;
  const expDelta = Math.round(baseExp * (1 + stageInfo.expBonusPct / 100));

  const nextDraft: PetCompanionState = {
    ...current,
    coins: current.coins + coinsDelta,
    exp: current.exp + expDelta,
    snacks: current.snacks + snacksDelta,
    specialTreats: current.specialTreats + specialTreatsDelta,
    lastActiveStudyDate: todayStr,
    dailyLedger: ledger,
    lastStudyAction: {
      type: action,
      at: new Date(nowMs).toISOString(),
      score: typeof meta?.score === 'number' && Number.isFinite(meta.score) ? meta.score : undefined,
    },
  };

  const todaySentiment = getPetSentimentIndicator({
    state: nextDraft,
    dueCount: 0,
    masteredCount: ledger.vocabIds.length,
    streakDays: 1,
    nowMs,
  });
  const todayActionsCount =
    ledger.vocabIds.length +
    ledger.gameCount +
    ledger.pronCount +
    ledger.focusCount * 2 +
    (ledger.questClaimed ? 4 : 0);

  const nextMoodHistory: Record<string, PetMoodHistoryEntry> = {
    ...(current.moodHistory || {}),
    [todayStr]: {
      score: Math.min(100, SENTIMENT_META[todaySentiment.sentiment].baseScore + Math.min(8, todayActionsCount)),
      sentiment: todaySentiment.sentiment,
      studyActions: Math.max(1, todayActionsCount),
    },
  };

  const nowIso = new Date(nowMs).toISOString();
  const moodLogTriggerMap: Record<
    PetStudyActionType,
    {
      groupKey?: string;
      sentiment: PetSentimentType;
      emoji: string;
      triggerTitle: string;
      detail: string;
      buildGroupedTitle?: (n: number) => { triggerTitle: string; detail: string };
    }
  > = {
    vocab_mastery: {
      groupKey: 'vocab_mastery',
      sentiment: 'happy',
      emoji: '🥳',
      triggerTitle: 'Mastered 1 word',
      detail: `단어 1개 완벽 암기 완료 (+${expDelta} EXP · +${coinsDelta} 코인)`,
      buildGroupedTitle: (n) => ({
        triggerTitle: `Mastered ${n} words`,
        detail: `오늘 단어 ${n}개 완벽 암기로 최고조 기분 달성`,
      }),
    },
    vocab_learning: {
      groupKey: 'vocab_learning',
      sentiment: 'proud',
      emoji: '🤓',
      triggerTitle: 'Reviewed 1 word',
      detail: `어휘 학습 진행 (+${expDelta} EXP)`,
      buildGroupedTitle: (n) => ({
        triggerTitle: `Reviewed ${n} words`,
        detail: `오늘 어휘 ${n}개 복습 완료`,
      }),
    },
    pronunciation: {
      groupKey: 'pronunciation',
      sentiment: 'happy',
      emoji: '🎤',
      triggerTitle:
        typeof meta?.score === 'number'
          ? `Pronunciation score ${Math.round(meta.score)}%`
          : 'Completed pronunciation practice',
      detail: `원어민 발음 연습으로 자신감 상승 (+${expDelta} EXP)`,
      buildGroupedTitle: (n) => ({
        triggerTitle: `Passed ${n} pronunciation checks`,
        detail: `오늘 발음 연습 ${n}회 성공`,
      }),
    },
    focus_routine: {
      sentiment: 'happy',
      emoji: '🌟',
      triggerTitle: 'Completed 3-min Focus Routine',
      detail: `3분 집중 루틴 완주 (+${coinsDelta} 코인 · 영양식 +${specialTreatsDelta})`,
    },
    daily_quest: {
      sentiment: 'happy',
      emoji: '🏆',
      triggerTitle: 'Completed Daily Study Quest',
      detail: `오늘의 3분 퀘스트 보상 수령 (+${coinsDelta} 코인 · +${expDelta} EXP)`,
    },
    game_round: {
      groupKey: 'game_round',
      sentiment: 'happy',
      emoji: '🎮',
      triggerTitle: 'Cleared cognitive game round',
      detail: `인지게임 라운드 클리어 (+${coinsDelta} 코인 · 간식 +1)`,
      buildGroupedTitle: (n) => ({
        triggerTitle: `Cleared ${n} game rounds`,
        detail: `오늘 인지게임 ${n}라운드 클리어로 즐거워요`,
      }),
    },
    audio_milestone: {
      groupKey: 'audio_milestone',
      sentiment: 'proud',
      emoji: '🎧',
      triggerTitle: 'Audio listening milestone',
      detail: `영어 반복 듣기 목표 달성 (+${coinsDelta} 코인)`,
      buildGroupedTitle: (n) => ({
        triggerTitle: `${n} audio listening milestones`,
        detail: `반복 청취 ${n}회 마일스톤 달성`,
      }),
    },
  };
  const logCfg = moodLogTriggerMap[action];
  const nextMoodLogs = appendMoodLog(current.moodLogs, {
    groupKey: logCfg.groupKey,
    at: nowIso,
    dateStr: todayStr,
    sentiment: logCfg.sentiment,
    emoji: logCfg.emoji,
    triggerTitle: logCfg.triggerTitle,
    detail: logCfg.detail,
    buildGroupedTitle: logCfg.buildGroupedTitle,
    category: 'positive',
  });

  const nextState = savePetState({
    ...nextDraft,
    moodHistory: nextMoodHistory,
    moodLogs: nextMoodLogs,
  });

  return {
    awarded: true,
    coinsDelta,
    expDelta,
    snacksDelta,
    specialTreatsDelta,
    readyToEvolve: getEvolutionStatus(nextState).isReadyToEvolve,
    state: nextState,
  };
}

/**
 * Start a 5-minute deep focus Study Boost session directly from the Pet Sanctuary.
 * Immediately gives the pet a 'focused' state and doubles study coins upon completion.
 */
export function startPetStudyBoost(
  durationSec: number = STUDY_BOOST_DURATION_SEC,
  nowMs: number = Date.now()
): {
  started: boolean;
  state: PetCompanionState;
  message: string;
} {
  const todayStr = getLocalDateString(new Date(nowMs));
  const current = applyDailyFullnessDecay(loadPetState(), todayStr);
  const existing = getStudyBoostStatus(current, nowMs);
  if (existing.isActive) {
    return {
      started: false,
      state: current,
      message: `이미 5분 딥포커스 Study Boost가 진행 중입니다! (${existing.remainingSec}초 남음)`,
    };
  }

  const safeDur = Math.max(10, Math.floor(durationSec));
  const boost: PetStudyBoostSession = {
    startedAt: new Date(nowMs).toISOString(),
    endsAt: new Date(nowMs + safeDur * 1000).toISOString(),
    durationSec: safeDur,
  };

  const nowIso = new Date(nowMs).toISOString();
  const nextState = savePetState({
    ...current,
    studyBoost: boost,
    lastActiveStudyDate: todayStr,
    moodHistory: {
      ...(current.moodHistory || {}),
      [todayStr]: {
        score: Math.max(current.moodHistory?.[todayStr]?.score || 0, 86),
        sentiment: 'focused',
        studyActions: Math.max(1, current.moodHistory?.[todayStr]?.studyActions || 1),
      },
    },
    moodLogs: appendMoodLog(current.moodLogs, {
      at: nowIso,
      dateStr: todayStr,
      sentiment: 'focused',
      emoji: '🎯',
      triggerTitle: 'Started 5-min Study Boost',
      detail: '초집중 모드 돌입 · 완주 시 스터디 코인 2배 지급',
      category: 'positive',
    }),
  });

  playPetSound('shield');
  return {
    started: true,
    state: nextState,
    message: `${nextState.name}이(가) 5분 초집중 모드에 돌입했어요! 완료 시 스터디 코인 2배 보상을 받습니다.`,
  };
}

/**
 * Complete an active Study Boost session once its timer reaches 0 (idempotent).
 * Awards 2x study coins (100 base coins scaled by stage buff) + EXP & snacks.
 */
export function completePetStudyBoost(nowMs: number = Date.now()): {
  completed: boolean;
  coinsAwarded: number;
  expAwarded: number;
  readyToEvolve: boolean;
  state: PetCompanionState;
  message: string;
} {
  const todayStr = getLocalDateString(new Date(nowMs));
  const current = applyDailyFullnessDecay(loadPetState(), todayStr);
  if (!current.studyBoost) {
    return {
      completed: false,
      coinsAwarded: 0,
      expAwarded: 0,
      readyToEvolve: getEvolutionStatus(current).isReadyToEvolve,
      state: current,
      message: '진행 중인 Study Boost 세션이 없습니다.',
    };
  }

  const status = getStudyBoostStatus(current, nowMs);
  if (!status.isReadyToComplete) {
    return {
      completed: false,
      coinsAwarded: 0,
      expAwarded: 0,
      readyToEvolve: getEvolutionStatus(current).isReadyToEvolve,
      state: current,
      message: `아직 집중 시간이 ${status.remainingSec}초 남았습니다.`,
    };
  }

  const stageInfo = getStageInfo(current.stage);
  const coinsAwarded = Math.round(STUDY_BOOST_BASE_COINS * 2 * (1 + stageInfo.coinBonusPct / 100));
  const expAwarded = Math.round(35 * (1 + stageInfo.expBonusPct / 100));
  const ledger = { ...current.dailyLedger, focusCount: current.dailyLedger.focusCount + 1 };

  const nextMoodHistory: Record<string, PetMoodHistoryEntry> = {
    ...(current.moodHistory || {}),
    [todayStr]: {
      score: Math.min(100, Math.max(current.moodHistory?.[todayStr]?.score || 0, 94)),
      sentiment: 'happy',
      studyActions: Math.max(2, (current.moodHistory?.[todayStr]?.studyActions || 0) + 2),
    },
  };

  const nextState = savePetState({
    ...current,
    coins: current.coins + coinsAwarded,
    exp: current.exp + expAwarded,
    snacks: current.snacks + 2,
    specialTreats: current.specialTreats + 1,
    bond: Math.min(100, current.bond + 8),
    studyBoost: null,
    lastActiveStudyDate: todayStr,
    dailyLedger: ledger,
    lastStudyAction: {
      type: 'focus_routine',
      at: new Date(nowMs).toISOString(),
    },
    moodHistory: nextMoodHistory,
    moodLogs: appendMoodLog(current.moodLogs, {
      at: new Date(nowMs).toISOString(),
      dateStr: todayStr,
      sentiment: 'happy',
      emoji: '⚡',
      triggerTitle: 'Completed 5-min Study Boost (2x Coins)',
      detail: `딥포커스 완주로 +${coinsAwarded} 코인 · +${expAwarded} EXP 획득`,
      category: 'positive',
    }),
  });

  playPetSound('evolve');
  return {
    completed: true,
    coinsAwarded,
    expAwarded,
    readyToEvolve: getEvolutionStatus(nextState).isReadyToEvolve,
    state: nextState,
    message: `5분 딥포커스 완료! 2배 스터디 보너스로 +${coinsAwarded} 코인 · +${expAwarded} EXP · 특별 영양식 1개를 획득했어요!`,
  };
}

export function cancelPetStudyBoost(): PetCompanionState {
  const current = loadPetState();
  if (!current.studyBoost) return current;
  return savePetState({ ...current, studyBoost: null });
}

export function feedPet(kind: 'snack' | 'special'): {
  success: boolean;
  message: string;
  expGain: number;
  fullnessGain: number;
  bondGain: number;
  readyToEvolve: boolean;
  state: PetCompanionState;
} {
  const current = loadPetState();
  if (kind === 'snack' && current.snacks <= 0) {
    return {
      success: false,
      message: '단어 간식이 부족합니다. 단어를 암기하거나 게임을 플레이해 간식을 모아보세요!',
      expGain: 0,
      fullnessGain: 0,
      bondGain: 0,
      readyToEvolve: getEvolutionStatus(current).isReadyToEvolve,
      state: current,
    };
  }
  if (kind === 'special' && current.specialTreats <= 0) {
    return {
      success: false,
      message: '특별 영양식이 없습니다. 3분 루틴·일일 퀘스트·게임 3연승으로 획득할 수 있어요!',
      expGain: 0,
      fullnessGain: 0,
      bondGain: 0,
      readyToEvolve: getEvolutionStatus(current).isReadyToEvolve,
      state: current,
    };
  }

  const fullnessGain = kind === 'special' ? 45 : 22;
  const bondGain = kind === 'special' ? 14 : 6;
  const expGain = kind === 'special' ? 32 : 12;

  const nowIso = new Date().toISOString();
  const nextFullness = Math.min(100, current.fullness + fullnessGain);
  const nextState = savePetState({
    ...current,
    snacks: kind === 'snack' ? current.snacks - 1 : current.snacks,
    specialTreats: kind === 'special' ? current.specialTreats - 1 : current.specialTreats,
    fullness: nextFullness,
    bond: Math.min(100, current.bond + bondGain),
    exp: current.exp + expGain,
    totalFeedCount: current.totalFeedCount + 1,
    lastFedAt: nowIso,
    lastHungerTickAt: nowIso,
    moodLogs: appendMoodLog(current.moodLogs, {
      at: nowIso,
      dateStr: getLocalDateString(),
      sentiment: 'happy',
      emoji: kind === 'special' ? '🍲' : '🍪',
      triggerTitle: kind === 'special' ? 'Fed Special Treat' : 'Fed Vocab Snack',
      detail: `Hunger ${nextFullness}% 회복 · 친밀도 +${bondGain} · EXP +${expGain}`,
      category: 'positive',
    }),
  });

  playPetSound('feed');
  const evo = getEvolutionStatus(nextState);

  return {
    success: true,
    message:
      kind === 'special'
        ? `${nextState.name}에게 특별 영양식을 먹여 EXP +${expGain}, 친밀도 +${bondGain} 상승했어요!`
        : `${nextState.name}에게 단어 간식을 주었어요! (EXP +${expGain}, 포만감 ${nextState.fullness}%)`,
    expGain,
    fullnessGain,
    bondGain,
    readyToEvolve: evo.isReadyToEvolve,
    state: nextState,
  };
}

/**
 * Reward snacks and restore Hunger after completing the quick "Earn Food" vocabulary quiz.
 */
export function rewardQuickFoodQuiz(params: {
  correctCount: number;
  totalCount: number;
  feedNow?: boolean;
}): {
  snacksEarned: number;
  coinsEarned: number;
  expEarned: number;
  hungerRestored: number;
  fedNow: boolean;
  state: PetCompanionState;
  message: string;
} {
  const { correctCount, totalCount, feedNow = true } = params;
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const todayStr = getLocalDateString(new Date(nowMs));
  const current = loadPetState(nowMs);
  const stageInfo = getStageInfo(current.stage);
  const boostMultiplier = getStudyBoostStatus(current, nowMs).isActive ? 2 : 1;

  const isPerfect = totalCount > 0 && correctCount >= totalCount;
  const snacksEarned = Math.max(1, correctCount + (isPerfect ? 1 : 0));
  const coinsEarned = Math.round(correctCount * 10 * (1 + stageInfo.coinBonusPct / 100)) * boostMultiplier;
  const expEarned = Math.round((8 + correctCount * 6) * (1 + stageInfo.expBonusPct / 100));

  let hungerRestored = 0;
  let nextFullness = current.fullness;
  let nextSnacks = current.snacks + snacksEarned;
  let nextFeedCount = current.totalFeedCount;
  let nextLastFedAt = current.lastFedAt;
  let nextHungerTickAt = current.lastHungerTickAt;

  if (feedNow && nextSnacks > 0) {
    const restoreAmount = 20 + correctCount * 8;
    nextFullness = Math.min(100, current.fullness + restoreAmount);
    hungerRestored = nextFullness - current.fullness;
    nextSnacks = Math.max(0, nextSnacks - 1);
    nextFeedCount += 1;
    nextLastFedAt = nowIso;
    nextHungerTickAt = nowIso;
  }

  const nextState = savePetState({
    ...current,
    coins: current.coins + coinsEarned,
    exp: current.exp + expEarned,
    snacks: nextSnacks,
    fullness: nextFullness,
    bond: Math.min(100, current.bond + (feedNow ? 6 : 3)),
    totalFeedCount: nextFeedCount,
    lastFedAt: nextLastFedAt,
    lastHungerTickAt: nextHungerTickAt,
    lastActiveStudyDate: todayStr,
    lastStudyAction:
      correctCount > 0
        ? {
            type: 'vocab_learning',
            at: nowIso,
            score: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100,
          }
        : current.lastStudyAction,
    moodLogs: appendMoodLog(current.moodLogs, {
      at: nowIso,
      dateStr: todayStr,
      sentiment: 'happy',
      emoji: '🍪',
      triggerTitle: `Earn Food Quiz (${correctCount}/${totalCount})`,
      detail: feedNow
        ? `간식 ${snacksEarned}개 획득 후 바로 먹여 Hunger ${nextFullness}% 회복`
        : `단어 퀴즈로 간식 +${snacksEarned}개 · +${coinsEarned} 코인 획득`,
      category: 'positive',
    }),
  });

  playPetSound(feedNow ? 'feed' : 'coin');
  return {
    snacksEarned,
    coinsEarned,
    expEarned,
    hungerRestored,
    fedNow: feedNow,
    state: nextState,
    message: feedNow
      ? `단어 퀴즈 완료! 간식 ${snacksEarned}개를 얻어 바로 먹였고 배고픔(Hunger)이 ${nextFullness}%로 회복되었어요!`
      : `단어 퀴즈 완료! 단어 간식 +${snacksEarned}개와 +${coinsEarned} 코인을 획득했어요!`,
  };
}

export function petInteract(options?: {
  soundCue?: PetSoundEffectId | null;
}): {
  expGain: number;
  bondGain: number;
  cooldownActive: boolean;
  readyToEvolve: boolean;
  state: PetCompanionState;
} {
  const current = loadPetState();
  const lastMs = current.lastPettedAt ? new Date(current.lastPettedAt).getTime() : 0;
  const nowMs = Date.now();
  const cooldownActive = nowMs - lastMs < 8000;

  const bondGain = cooldownActive ? 0 : 4;
  const expGain = cooldownActive ? 0 : 5;

  const nextState = savePetState({
    ...current,
    bond: Math.min(100, current.bond + bondGain),
    exp: current.exp + expGain,
    totalPetCount: current.totalPetCount + 1,
    lastPettedAt: cooldownActive ? current.lastPettedAt : new Date().toISOString(),
  });

  if (options?.soundCue !== null) {
    playPetSound(options?.soundCue ?? 'pet');
  }
  return {
    expGain,
    bondGain,
    cooldownActive,
    readyToEvolve: getEvolutionStatus(nextState).isReadyToEvolve,
    state: nextState,
  };
}

export function evolvePet(): {
  evolved: boolean;
  newStage: PetStage;
  stageInfo: PetEvolutionStageInfo;
  bonusCoins: number;
  state: PetCompanionState;
} {
  const current = loadPetState();
  const evo = getEvolutionStatus(current);
  if (!evo.nextStage || !evo.isReadyToEvolve) {
    return {
      evolved: false,
      newStage: current.stage,
      stageInfo: evo.currentStage,
      bonusCoins: 0,
      state: current,
    };
  }

  const nextStage = evo.nextStage.stage;
  const bonusCoins = nextStage * 40;
  const nowIso = new Date().toISOString();
  const nextState = savePetState({
    ...current,
    stage: nextStage,
    coins: current.coins + bonusCoins,
    snacks: current.snacks + 2,
    specialTreats: current.specialTreats + 1,
    bond: Math.min(100, current.bond + 15),
    fullness: 100,
    lastHungerTickAt: nowIso,
    totalEvolutions: current.totalEvolutions + 1,
    pendingEvolutionOverlayStage: null,
    lastEvolutionCelebratedStage: nextStage,
    moodLogs: appendMoodLog(current.moodLogs, {
      at: nowIso,
      dateStr: getLocalDateString(),
      sentiment: 'ecstatic',
      emoji: '✨',
      triggerTitle: `Evolved to Stage ${nextStage}: ${evo.nextStage.enTitle}`,
      detail: `${evo.nextStage.title} 단계 진화 완료 · 보너스 +${bonusCoins} 코인`,
      category: 'positive',
    }),
  });

  playPetSound('evolve');
  return {
    evolved: true,
    newStage: nextStage,
    stageInfo: evo.nextStage,
    bonusCoins,
    state: nextState,
  };
}

export function claimDailyPetSupply(): {
  claimed: boolean;
  state: PetCompanionState;
  message: string;
} {
  const todayStr = getLocalDateString();
  const current = loadPetState();
  if (current.lastDailySupplyDate === todayStr) {
    return {
      claimed: false,
      state: current,
      message: '오늘의 보살핌 보급품은 이미 수령했어요! 내일 다시 받을 수 있습니다.',
    };
  }

  const nowIso = new Date().toISOString();
  const nextState = savePetState({
    ...current,
    coins: current.coins + 35,
    snacks: current.snacks + 2,
    fullness: Math.min(100, current.fullness + 10),
    lastHungerTickAt: nowIso,
    lastDailySupplyDate: todayStr,
  });
  playPetSound('coin');
  return {
    claimed: true,
    state: nextState,
    message: '일일 케어 보급품(코인 +35 · 간식 +2)을 획득했어요!',
  };
}

export function renamePet(newName: string): PetCompanionState {
  const current = loadPetState();
  const clean = newName.trim().slice(0, 16);
  if (!clean) return current;
  return savePetState({ ...current, name: clean });
}

export function togglePetSound(): PetCompanionState {
  const current = loadPetState();
  return savePetState({ ...current, soundEnabled: !current.soundEnabled });
}

export function unlockOrEquipRoom(roomId: PetRoomId): {
  success: boolean;
  action: 'equipped' | 'unlocked_and_equipped' | 'insufficient_coins';
  state: PetCompanionState;
  message: string;
} {
  const current = loadPetState();
  const room = PET_ROOMS.find((r) => r.id === roomId);
  if (!room) {
    return { success: false, action: 'insufficient_coins', state: current, message: '방을 찾을 수 없습니다.' };
  }

  if (current.unlockedRooms.includes(roomId)) {
    const next = savePetState({ ...current, equippedRoom: roomId });
    playPetSound('pet');
    return {
      success: true,
      action: 'equipped',
      state: next,
      message: `${room.name} 배경을 적용했습니다.`,
    };
  }

  if (current.coins < room.price) {
    return {
      success: false,
      action: 'insufficient_coins',
      state: current,
      message: `코인이 ${room.price - current.coins}개 더 필요합니다.`,
    };
  }

  const next = savePetState({
    ...current,
    coins: current.coins - room.price,
    unlockedRooms: [...current.unlockedRooms, roomId],
    equippedRoom: roomId,
  });
  playPetSound('coin');
  return {
    success: true,
    action: 'unlocked_and_equipped',
    state: next,
    message: `${room.name}을(를) 해금하고 바로 꾸몄어요!`,
  };
}

export function unlockOrToggleCostume(costumeId: PetCostumeId): {
  success: boolean;
  action: 'equipped' | 'unequipped' | 'unlocked_and_equipped' | 'insufficient_coins';
  state: PetCompanionState;
  message: string;
} {
  const current = loadPetState();
  const item = PET_COSTUMES.find((c) => c.id === costumeId);
  if (!item) {
    return { success: false, action: 'insufficient_coins', state: current, message: '코스튬을 찾을 수 없습니다.' };
  }

  if (current.unlockedCostumes.includes(costumeId)) {
    const isEquipped = current.equippedCostume === costumeId;
    const next = savePetState({
      ...current,
      equippedCostume: isEquipped ? null : costumeId,
    });
    playPetSound('pet');
    return {
      success: true,
      action: isEquipped ? 'unequipped' : 'equipped',
      state: next,
      message: isEquipped ? `${item.name} 착용을 해제했습니다.` : `${item.name}을(를) 착용했어요!`,
    };
  }

  if (current.coins < item.price) {
    return {
      success: false,
      action: 'insufficient_coins',
      state: current,
      message: `코인이 ${item.price - current.coins}개 더 필요합니다.`,
    };
  }

  const next = savePetState({
    ...current,
    coins: current.coins - item.price,
    unlockedCostumes: [...current.unlockedCostumes, costumeId],
    equippedCostume: costumeId,
  });
  playPetSound('coin');
  return {
    success: true,
    action: 'unlocked_and_equipped',
    state: next,
    message: `${item.name}을(를) 구매하고 장착했어요!`,
  };
}

export function buyStreakShield(): {
  success: boolean;
  state: PetCompanionState;
  message: string;
} {
  const current = loadPetState();
  const stageInfo = getStageInfo(current.stage);
  if (current.streakShields >= stageInfo.maxShields) {
    return {
      success: false,
      state: current,
      message: `현재 진화 단계에서는 보호막을 최대 ${stageInfo.maxShields}개까지 보유할 수 있습니다.`,
    };
  }
  if (current.coins < STREAK_SHIELD_PRICE) {
    return {
      success: false,
      state: current,
      message: `스트릭 보호막을 구매하려면 코인이 ${STREAK_SHIELD_PRICE - current.coins}개 더 필요해요.`,
    };
  }

  const next = savePetState({
    ...current,
    coins: current.coins - STREAK_SHIELD_PRICE,
    streakShields: current.streakShields + 1,
  });
  playPetSound('shield');
  return {
    success: true,
    state: next,
    message: `스트릭 보호막이 충전되었습니다! (${next.streakShields}/${stageInfo.maxShields}칸)`,
  };
}

export function calculateCalendarDaysDiff(fromDateStr: string, toDateStr: string): number {
  const [fy, fm, fd] = fromDateStr.split('-').map(Number);
  const [ty, tm, td] = toDateStr.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Evaluate continuous streak on boot and auto-consume a Pet Streak Shield if a day was missed.
 */
export function evaluateStreakWithPetShield(
  profile: UserProfile | null,
  todayStr: string = getLocalDateString()
): {
  outcome: 'no_change' | 'incremented' | 'shield_used' | 'streak_reset';
  nextStreakDays: number;
  remainingShields: number;
  previousStreak: number;
  state: PetCompanionState;
} {
  const current = loadPetState();
  const prevStreak = Math.max(1, profile?.streakDays ?? 1);

  if (!current.lastActiveStudyDate) {
    const initialized = savePetState({ ...current, lastActiveStudyDate: todayStr });
    return {
      outcome: 'no_change',
      nextStreakDays: prevStreak,
      remainingShields: initialized.streakShields,
      previousStreak: prevStreak,
      state: initialized,
    };
  }

  const diffDays = calculateCalendarDaysDiff(current.lastActiveStudyDate, todayStr);
  if (diffDays <= 0) {
    return {
      outcome: 'no_change',
      nextStreakDays: prevStreak,
      remainingShields: current.streakShields,
      previousStreak: prevStreak,
      state: current,
    };
  }

  if (diffDays === 1) {
    const nextStreak = prevStreak + 1;
    const updated = savePetState({ ...current, lastActiveStudyDate: todayStr });
    return {
      outcome: 'incremented',
      nextStreakDays: nextStreak,
      remainingShields: updated.streakShields,
      previousStreak: prevStreak,
      state: updated,
    };
  }

  // Missed at least 1 calendar day (diffDays >= 2)
  if (current.streakShields > 0 && prevStreak > 1) {
    const updated = savePetState({
      ...current,
      streakShields: current.streakShields - 1,
      lastShieldProtectedDate: todayStr,
      lastActiveStudyDate: todayStr,
      moodLogs: appendMoodLog(current.moodLogs, {
        at: new Date().toISOString(),
        dateStr: todayStr,
        sentiment: 'proud',
        emoji: '🛡️',
        triggerTitle: 'Streak Shield saved your streak',
        detail: `${diffDays - 1}일 학습 공백을 보호막으로 방어해 ${prevStreak}일 스트릭 유지`,
        category: 'positive',
      }),
    });
    playPetSound('shield');
    return {
      outcome: 'shield_used',
      nextStreakDays: prevStreak,
      remainingShields: updated.streakShields,
      previousStreak: prevStreak,
      state: updated,
    };
  }

  const updated = savePetState({
    ...current,
    lastActiveStudyDate: todayStr,
    moodLogs:
      prevStreak > 1
        ? appendMoodLog(current.moodLogs, {
            at: new Date().toISOString(),
            dateStr: todayStr,
            sentiment: 'bored',
            emoji: '🥱',
            triggerTitle: 'Skipped study session',
            detail: `${diffDays - 1}일 공백으로 연속 학습 스트릭이 초기화되었어요.`,
            category: 'negative',
          })
        : current.moodLogs,
  });
  return {
    outcome: prevStreak > 1 ? 'streak_reset' : 'no_change',
    nextStreakDays: 1,
    remainingShields: updated.streakShields,
    previousStreak: prevStreak,
    state: updated,
  };
}

export function generatePetDialogue(params: {
  state: PetCompanionState;
  dueCount: number;
  streakDays: number;
  masteredCount: number;
  featuredWord?: VocabItem | null;
  seedOffset?: number;
}): PetDialogueLine {
  const { state, dueCount, streakDays, masteredCount, featuredWord, seedOffset = 0 } = params;
  const hour = new Date().getHours();
  const candidates: PetDialogueLine[] = [];

  if (state.fullness < 35) {
    candidates.push(
      {
        en: "My tummy is rumbling! Shall we memorize one word so I can grab a snack?",
        ko: '꼬르륵~ 배가 고파요! 단어 1개만 암기해서 간식을 챙겨줄래요?',
        tag: '간식 요청',
      },
      {
        en: 'Feed my mind with English, and feed me a treat too!',
        ko: '영단어로 머리도 채우고, 나에게도 간식 하나 나눠주세요!',
        tag: '돌봄 필요',
      }
    );
  }

  if (getEvolutionStatus(state).isReadyToEvolve) {
    candidates.push({
      en: "Whoa! I'm glowing with study energy! Open the Sanctuary to help me evolve!",
      ko: '와아! 학습 에너지가 가득 찼어요! 키우기 방에서 진화 버튼을 눌러주세요!',
      tag: '진화 준비 완료',
    });
  }

  if (dueCount > 0) {
    candidates.push(
      {
        en: `We have ${dueCount} review words waiting before they fade. Let's beat the forgetting curve!`,
        ko: `망각 곡선이 오기 전에 오늘 복습할 단어 ${dueCount}개를 함께 해치워요!`,
        tag: 'SRS 복습 응원',
      },
      {
        en: 'Just a 3-minute focus sprint today keeps your memory crystal clear!',
        ko: '오늘 3분 집중 루틴만 끝내도 기억이 아주 선명하게 유지돼요!',
        tag: '3분 루틴',
      }
    );
  }

  if (featuredWord) {
    const cleanMeaning = getCleanKoreanMeaning(featuredWord);
    candidates.push({
      en: `Word of the moment: "${featuredWord.word}" means "${cleanMeaning}". Say it out loud with me!`,
      ko: `오늘의 한 마디 단어: "${featuredWord.word}"는 "${cleanMeaning}" 뜻이에요. 같이 소리 내어 읽어볼까요?`,
      tag: '단어 한마디',
    });
  }

  if (streakDays >= 3) {
    candidates.push({
      en: `${streakDays} days in a row! Your consistency makes me grow stronger every single day.`,
      ko: `무려 ${streakDays}일 연속 학습 중! 꾸준함 덕분에 저도 매일 쑥쑥 자라고 있어요.`,
      tag: '스트릭 응원',
    });
  }

  if (hour >= 5 && hour < 11) {
    candidates.push({
      en: 'Good morning! A quick warm-up with 5 English words sets a brilliant tone for today.',
      ko: '좋은 아침이에요! 단어 5개 가볍게 워밍업하면 오늘 하루가 훨씬 상쾌해져요.',
      tag: '아침 인사',
    });
  } else if (hour >= 21 || hour < 5) {
    candidates.push({
      en: 'Reviewing words right before sleep boosts long-term retention while you dream!',
      ko: '자기 전 가벼운 복습은 수면 중 장기 기억 정착을 크게 도와준대요!',
      tag: '취침 전 팁',
    });
  }

  if (state.stage === 1) {
    candidates.push({
      en: 'Tap me gently or memorize 2 words so I can crack open this shiny shell!',
      ko: '저를 쓰다듬거나 단어 2개를 외우면 알에서 곧 태어날 수 있어요!',
      tag: '부화 대기',
    });
  } else if (masteredCount >= 20) {
    candidates.push({
      en: `You have already mastered ${masteredCount} words! You are building real fluency.`,
      ko: `벌써 ${masteredCount}단어나 완벽 암기했어요! 진짜 영어 실력이 쌓이고 있네요.`,
      tag: '성취 칭찬',
    });
  }

  candidates.push(
    {
      en: 'Small steps every day turn into giant leaps in English.',
      ko: '매일의 작은 한 걸음이 모여 거대한 영어 실력이 됩니다.',
      tag: '오늘의 응원',
    },
    {
      en: "Don't worry about mistakes—every wrong guess teaches your brain what to remember next!",
      ko: '실수해도 괜찮아요! 틀린 기억을 다시 꺼낼 때 뇌는 더 강하게 배운답니다.',
      tag: '인지과학 팁',
    }
  );

  const idx = Math.abs(seedOffset + state.totalPetCount + state.totalFeedCount) % candidates.length;
  return candidates[idx];
}

export interface PetSpokenPhrase {
  englishText: string;
  koreanHint: string;
  word: string;
  isFromLearnedList: boolean;
  isSentence: boolean;
}

/**
 * Pick a short, randomly selected English word or phrase from the user's learned
 * vocabulary list for the pet to speak aloud when tapped.
 */
export function pickRandomLearnedSpeech(params: {
  vocabList: VocabItem[];
  lastSpokenWord?: string | null;
}): PetSpokenPhrase {
  const { vocabList, lastSpokenWord } = params;
  const learnedPool = vocabList.filter(
    (v) =>
      v &&
      typeof v.word === 'string' &&
      v.word.trim().length > 0 &&
      (Boolean(v.isLearned) ||
        (v.masteryLevel ?? 0) >= 1 ||
        (v.srs?.repetitionCount ?? 0) >= 1 ||
        Boolean(v.srs?.lastReviewedAt))
  );

  const isFromLearnedList = learnedPool.length > 0;
  const basePool = isFromLearnedList
    ? learnedPool
    : vocabList.filter((v) => v && typeof v.word === 'string' && v.word.trim().length > 0);

  if (basePool.length === 0) {
    const fallbackPhrases: PetSpokenPhrase[] = [
      {
        englishText: 'Keep going!',
        koreanHint: '계속 나아가요!',
        word: 'Keep going!',
        isFromLearnedList: false,
        isSentence: true,
      },
      {
        englishText: 'Small steps matter.',
        koreanHint: '작은 발걸음이 중요해요.',
        word: 'Small steps matter.',
        isFromLearnedList: false,
        isSentence: true,
      },
      {
        englishText: 'You got this!',
        koreanHint: '넌 해낼 수 있어!',
        word: 'You got this!',
        isFromLearnedList: false,
        isSentence: true,
      },
    ];
    const filteredFallback = lastSpokenWord
      ? fallbackPhrases.filter((f) => f.word !== lastSpokenWord)
      : fallbackPhrases;
    const pool = filteredFallback.length > 0 ? filteredFallback : fallbackPhrases;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const dedupedPool =
    lastSpokenWord && basePool.length > 1
      ? basePool.filter((v) => v.word.trim().toLowerCase() !== lastSpokenWord.trim().toLowerCase())
      : basePool;
  const candidatePool = dedupedPool.length > 0 ? dedupedPool : basePool;
  const chosen = candidatePool[Math.floor(Math.random() * candidatePool.length)];
  const cleanWord = chosen.word.trim();
  const cleanMeaning = getCleanKoreanMeaning(chosen);

  const trimmedSentence =
    typeof chosen.sentence === 'string' ? chosen.sentence.trim() : '';
  const canSpeakSentence =
    trimmedSentence.length > 0 &&
    trimmedSentence.length <= 72 &&
    Math.random() < 0.45;

  if (canSpeakSentence) {
    return {
      englishText: trimmedSentence,
      koreanHint: chosen.sentenceMeaning?.trim() || `${cleanWord} · ${cleanMeaning}`,
      word: cleanWord,
      isFromLearnedList,
      isSentence: true,
    };
  }

  return {
    englishText: cleanWord,
    koreanHint: cleanMeaning,
    word: cleanWord,
    isFromLearnedList,
    isSentence: false,
  };
}
