import { ActiveTab } from '../types';
import { GameType } from '../components/StudentWordGame';

export type RandomScope = 'all' | 'games' | 'sentences' | 'quiz' | 'daily';

export interface StartupRandomConfig {
  enabled: boolean;
  scope: RandomScope;
  lastRunAt?: string;
  lastRunTitle?: string;
}

export interface RandomActivity {
  id: string;
  title: string;
  categoryName: string;
  scope: RandomScope;
  icon: string;
  badge: string;
  description: string;
  targetTab: ActiveTab;
  gameType?: GameType;
  gameCategory?: 'word' | 'sentence';
  quizMode?: 'flashcard' | 'quiz' | 'review_quiz' | 'leitner' | 'cloze' | 'speed' | 'speech_recall' | 'forgetting_curve' | 'wrong_notes';
  vocabAction?: 'lucky_sentence' | 'curriculum_explorer' | 'open_sentences';
  openCurriculum?: boolean;
}

export const RANDOM_ACTIVITIES_CATALOG: RandomActivity[] = [
  // 1. Sentence Games (5종)
  {
    id: 'game-sentence-scramble',
    title: '문장 어순 블록 조립 게임',
    categoryName: '문장 실전 게임',
    scope: 'sentences',
    icon: '🧩',
    badge: '문장 블록',
    description: '뒤섞인 영어 단어 블록을 올바른 어순으로 맞춰 문장을 완성합니다.',
    targetTab: 'game',
    gameCategory: 'sentence',
    gameType: 'sentence_scramble',
  },
  {
    id: 'game-sentence-listening',
    title: '리스닝 청취 빈칸 채우기 게임',
    categoryName: '문장 실전 게임',
    scope: 'sentences',
    icon: '🎧',
    badge: '원어민 청취',
    description: '원어민 발음을 듣고 문맥에 알맞은 핵심 단어를 빈칸에 채웁니다.',
    targetTab: 'game',
    gameCategory: 'sentence',
    gameType: 'sentence_listening',
  },
  {
    id: 'game-sentence-speed',
    title: '30초 스피드 문장 완성 챌린지',
    categoryName: '문장 실전 게임',
    scope: 'sentences',
    icon: '⚡',
    badge: '30초 타임어택',
    description: '제한 시간 내에 문맥과 번역에 알맞은 단어를 신속하게 선택합니다.',
    targetTab: 'game',
    gameCategory: 'sentence',
    gameType: 'sentence_speed',
  },
  {
    id: 'game-sentence-truefalse',
    title: '문장 오류 & 진위 판별 게임',
    categoryName: '문장 실전 게임',
    scope: 'sentences',
    icon: '🕵️',
    badge: '문법·의미 판별',
    description: '문장의 문법적 오류나 한국어 해석의 일치 여부를 판별합니다.',
    targetTab: 'game',
    gameCategory: 'sentence',
    gameType: 'sentence_truefalse',
  },
  {
    id: 'game-sentence-shadowing',
    title: 'AI 문장 실전 쉐도잉 챌린지',
    categoryName: '문장 실전 게임',
    scope: 'sentences',
    icon: '🎙️',
    badge: '음성 발음 평가',
    description: '500+ 실전 예문을 원어민 발음으로 듣고 마이크로 따라 말하며 발음 점수를 측정합니다.',
    targetTab: 'game',
    gameCategory: 'sentence',
    gameType: 'sentence_shadowing',
  },

  // 2. Word Games (9종)
  {
    id: 'game-word-flashcard-recall',
    title: '플래시카드 4지선다 리콜 챌린지',
    categoryName: '단어 실전 게임',
    scope: 'games',
    icon: '📇',
    badge: '4지선다 리콜',
    description: '제시된 영단어의 정확한 한국어 뜻을 4지선다에서 선택하며 암기 등급을 승급합니다.',
    targetTab: 'game',
    gameCategory: 'word',
    gameType: 'flashcard_recall',
  },
  {
    id: 'game-word-memory',
    title: '집중 기억 카드 플립 (Memory Match)',
    categoryName: '단어 실전 게임',
    scope: 'games',
    icon: '🧠',
    badge: '기억력 향상',
    description: '뒤집힌 카드 속 영어 단어와 한국어 뜻 짝을 기억해 맞춥니다.',
    targetTab: 'game',
    gameCategory: 'word',
    gameType: 'memory',
  },
  {
    id: 'game-word-spelling',
    title: '스피드 스펠링 타자 슈팅 (Spelling Rush)',
    categoryName: '단어 실전 게임',
    scope: 'games',
    icon: '✍️',
    badge: '철자 완성',
    description: '빈칸에 들어갈 알파벳 철자를 스피디하게 입력해 단어를 완성합니다.',
    targetTab: 'game',
    gameCategory: 'word',
    gameType: 'spelling',
  },
  {
    id: 'game-word-combat',
    title: '단어 몬스터 배틀 (Word Combat)',
    categoryName: '단어 실전 게임',
    scope: 'games',
    icon: '🥊',
    badge: '보스전 RPG',
    description: '단어 퀴즈를 연속으로 맞혀 몬스터에게 콤보 대미지를 입히는 배틀 게임입니다.',
    targetTab: 'game',
    gameCategory: 'word',
    gameType: 'speed',
  },
  {
    id: 'game-word-block',
    title: '단어 낙하 테트리스 (Word Drop)',
    categoryName: '단어 실전 게임',
    scope: 'games',
    icon: '🧱',
    badge: '낙하 아케이드',
    description: '위에서 떨어지는 블록이 바닥에 닿기 전에 올바른 뜻을 맞춥니다.',
    targetTab: 'game',
    gameCategory: 'word',
    gameType: 'block',
  },
  {
    id: 'game-word-swipe',
    title: '스와이프 단어 분류 (Swipe Match)',
    categoryName: '단어 실전 게임',
    scope: 'games',
    icon: '🃏',
    badge: '좌우 스와이프',
    description: '단어 카드를 좌우로 스와이프하여 올바른 의미 여부를 판별합니다.',
    targetTab: 'game',
    gameCategory: 'word',
    gameType: 'swipe',
  },
  {
    id: 'game-word-bubble',
    title: '버블 팝 단어 매칭 (Bubble Pop)',
    categoryName: '단어 실전 게임',
    scope: 'games',
    icon: '🫧',
    badge: '버블 터뜨리기',
    description: '화면에 둥둥 떠다니는 버블 중 정답 버블을 신속하게 터뜨립니다.',
    targetTab: 'game',
    gameCategory: 'word',
    gameType: 'bubble',
  },
  {
    id: 'game-word-rhythm',
    title: '리듬 단어 캐치 (Rhythm Catch)',
    categoryName: '단어 실전 게임',
    scope: 'games',
    icon: '🎯',
    badge: '리듬 타이밍',
    description: '비트에 맞춰 타이밍에 맞게 올바른 단어를 캐치합니다.',
    targetTab: 'game',
    gameCategory: 'word',
    gameType: 'rhythm',
  },

  // 3. Quiz & Flashcards (4종)
  {
    id: 'quiz-flashcard-3d',
    title: '스마트 3D 플래시카드 암기',
    categoryName: '퀴즈 & 자가진단',
    scope: 'quiz',
    icon: '🎴',
    badge: '3D 입체 플립',
    description: '카드를 3D로 뒤집으며 단어의 철자, 발음기호, 예문, 뜻을 반복 학습합니다.',
    targetTab: 'quiz',
    quizMode: 'flashcard',
  },
  {
    id: 'quiz-speed-4choice',
    title: '4지선다 실전 단어 퀴즈',
    categoryName: '퀴즈 & 자가진단',
    scope: 'quiz',
    icon: '🧩',
    badge: '4지선다 퀴즈',
    description: '4개의 보기 중 올바른 뜻을 골라 정답률과 순발력을 기릅니다.',
    targetTab: 'quiz',
    quizMode: 'quiz',
  },
  {
    id: 'quiz-review-weak-vocab',
    title: '취약 어휘(0~1단계) 집중 복습 퀴즈',
    categoryName: '퀴즈 & 자가진단',
    scope: 'quiz',
    icon: '🎯',
    badge: '취약 어휘 집중',
    description: '미암기(0단계) 및 학습중(1단계) 어휘만 추출하여 맞출 때마다 실시간 승급 훈련을 진행합니다.',
    targetTab: 'quiz',
    quizMode: 'review_quiz',
  },
  {
    id: 'quiz-leitner-box',
    title: '라이트너 5단계 반복 암기상자',
    categoryName: '퀴즈 & 자가진단',
    scope: 'quiz',
    icon: '🔁',
    badge: '체계적 암기상자',
    description: '아는 단어와 모르는 단어를 5개의 상자로 분류하여 장기기억으로 전환합니다.',
    targetTab: 'quiz',
    quizMode: 'leitner',
  },
  {
    id: 'quiz-forgetting-curve',
    title: '에빙하우스 망각곡선 스마트 복습',
    categoryName: '퀴즈 & 자가진단',
    scope: 'quiz',
    icon: '📉',
    badge: '과학적 주기 복습',
    description: '인간의 망각 주기에 맞춰 오늘 복습이 꼭 필요한 단어들을 선별해 복습합니다.',
    targetTab: 'quiz',
    quizMode: 'forgetting_curve',
  },

  // 4. Daily & Exploration Tools (3종)
  {
    id: 'tool-lucky-sentence-draw',
    title: '오늘의 행운 단어 & 500+ 실전 랜덤 예문 뽑기',
    categoryName: '일일 행운 탐색',
    scope: 'daily',
    icon: '🎲',
    badge: '행운의 예문',
    description: '500개 이상의 다채로운 예문 풀에서 무작위 예문을 뽑아 쉐도잉과 AI 해설을 확인합니다.',
    targetTab: 'vocab',
    vocabAction: 'lucky_sentence',
  },
  {
    id: 'tool-curriculum-3000',
    title: '교육부 공식 3,000 필수 어휘 DB 탐색기',
    categoryName: '일일 행운 탐색',
    scope: 'daily',
    icon: '🎓',
    badge: '공식 3천 어휘',
    description: '초등·중학·고등/수능 교육부 공식 권장 3,000 어휘 보물창고를 탐색합니다.',
    targetTab: 'vocab',
    vocabAction: 'curriculum_explorer',
  },
  {
    id: 'tool-ai-roleplay',
    title: '상황별 AI 원어민 롤플레잉 (AI Roleplay)',
    categoryName: 'AI 스마트 도구',
    scope: 'all',
    icon: '🗣️',
    badge: '실전 회화',
    description: '카페 주문, 공항 입국 심사, 영어 면접 등 실전 상황에서 AI 원어민과 음성 대화를 나누고 실시간 첨삭을 받습니다.',
    targetTab: 'roleplay',
  },
  {
    id: 'tool-ai-generator',
    title: 'AI 맞춤 단어장 & 실전 예문 생성기',
    categoryName: 'AI 스마트 도구',
    scope: 'all',
    icon: '🤖',
    badge: 'Gemini AI',
    description: '관심사, 전공, 수능 주제를 입력하면 AI가 맞춤형 단어와 풍부한 예문을 생성합니다.',
    targetTab: 'ai-gen',
  },
  {
    id: 'tool-goals-tracker',
    title: '1인 자기계발 & 일일 습관 목표 트래커',
    categoryName: '자기계발 & 통계',
    scope: 'all',
    icon: '🎯',
    badge: '습관 루틴',
    description: '매일의 학습 목표와 반복 청취 달성도를 확인하고 연속 스트릭을 기록합니다.',
    targetTab: 'goals',
  },
];

const CONFIG_STORAGE_KEY = 'wordloop_startup_random_config';

export const DEFAULT_STARTUP_CONFIG: StartupRandomConfig = {
  enabled: false,
  scope: 'all',
};

export const getStartupRandomConfig = (): StartupRandomConfig => {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!saved) return DEFAULT_STARTUP_CONFIG;
    const parsed = JSON.parse(saved);
    return {
      enabled: Boolean(parsed.enabled),
      scope: parsed.scope || 'all',
      lastRunAt: parsed.lastRunAt,
      lastRunTitle: parsed.lastRunTitle,
    };
  } catch {
    return DEFAULT_STARTUP_CONFIG;
  }
};

export const saveStartupRandomConfig = (config: StartupRandomConfig) => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {}
};

/**
 * Filter and pick a random activity from catalog based on selected scope
 */
export const pickRandomActivity = (
  scope: RandomScope = 'all',
  excludeId?: string
): RandomActivity => {
  let pool = RANDOM_ACTIVITIES_CATALOG;

  if (scope === 'games') {
    pool = RANDOM_ACTIVITIES_CATALOG.filter(
      (a) => a.scope === 'games' || a.scope === 'sentences'
    );
  } else if (scope === 'sentences') {
    pool = RANDOM_ACTIVITIES_CATALOG.filter((a) => a.scope === 'sentences');
  } else if (scope === 'quiz') {
    pool = RANDOM_ACTIVITIES_CATALOG.filter((a) => a.scope === 'quiz');
  } else if (scope === 'daily') {
    pool = RANDOM_ACTIVITIES_CATALOG.filter((a) => a.scope === 'daily');
  }

  if (pool.length === 0) pool = RANDOM_ACTIVITIES_CATALOG;

  const candidates = excludeId ? pool.filter((a) => a.id !== excludeId) : pool;
  const finalPool = candidates.length > 0 ? candidates : pool;

  const randomIndex = Math.floor(Math.random() * finalPool.length);
  return finalPool[randomIndex] || RANDOM_ACTIVITIES_CATALOG[0];
};
