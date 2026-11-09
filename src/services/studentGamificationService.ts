/**
 * Student Gamification & Leveling Service
 * Computes Experience Points (EXP), Levels (1~50), Teen Titles, and Gamification Buffs.
 */

import { UserProfile, VocabItem, Goal, DailyGoalHistory } from '../types';

export interface StudentTitleDefinition {
  level: number;
  title: string;
  badgeEmoji: string;
  themeColor: string;
  expBoostPercent: number;
  boostTitle: string;
  tierName: string;
  perk: string;
  motto: string;
}

export interface StudentLevelInfo {
  level: number;
  title: string;
  badgeEmoji: string;
  themeColor: string;
  currentExp: number;
  minExpForCurrentLevel: number;
  expForNextLevel: number;
  progressPercent: number;
  unlockedPerk: string;
  expBoostPercent: number;
  boostMultiplier: number;
  boostTitle: string;
  tierName: string;
}

export interface StudentExpBreakdown {
  vocabExp: number;
  masteredWords: number;
  learningWords: number;
  repeatsExp: number;
  totalRepeats: number;
  goalExp: number;
  completedGoalsCount: number;
  streakExp: number;
  streakDays: number;
  totalExp: number;
}

// 50가지 학생용 틴에이저 칭호 및 경험치 부스트 정의
export const STUDENT_50_TITLES: StudentTitleDefinition[] = [
  // 1 ~ 10: 풋풋한 스타터 & 탐험가 (Starter)
  { level: 1, title: '초보 언어탐험가', badgeEmoji: '🌱', themeColor: 'from-emerald-400 to-teal-500', expBoostPercent: 2, boostTitle: '경험치 부스트 +2%', tierName: '스타터', perk: '학습 습관 형성 시작', motto: '첫 발을 내딛은 용기 있는 단어 모험의 시작' },
  { level: 2, title: '단어 수집 꿈나무', badgeEmoji: '🌿', themeColor: 'from-emerald-400 to-teal-500', expBoostPercent: 3, boostTitle: '경험치 부스트 +3%', tierName: '스타터', perk: '기초 어휘 수집가', motto: '호기심 가득한 눈으로 매일 새로운 단어를 찾는 중' },
  { level: 3, title: '호기심 많은 리스너', badgeEmoji: '🎧', themeColor: 'from-emerald-400 to-teal-500', expBoostPercent: 4, boostTitle: '경험치 부스트 +4%', tierName: '스타터', perk: '오디오 청취 1.04x', motto: '네이티브 원어민의 발음에 귀 기울이는 시간' },
  { level: 4, title: '첫걸음 단어 헌터', badgeEmoji: '🔍', themeColor: 'from-emerald-400 to-teal-500', expBoostPercent: 5, boostTitle: '경험치 부스트 +5%', tierName: '스타터', perk: '단어 탐색 보너스', motto: '일상 속 유용한 어휘들을 사냥하는 명사수' },
  { level: 5, title: '새싹 알파벳 모험가', badgeEmoji: '✨', themeColor: 'from-emerald-400 to-teal-500', expBoostPercent: 6, boostTitle: '경험치 부스트 +6%', tierName: '스타터', perk: '기본기 마스터 뱃지', motto: '기본기를 단단하게 다지며 성장하는 새싹' },
  { level: 6, title: '열정의 어휘 러너', badgeEmoji: '🏃‍♂️', themeColor: 'from-sky-400 to-indigo-500', expBoostPercent: 7, boostTitle: '경험치 부스트 +7%', tierName: '스타터', perk: '일일 질주 가속', motto: '지치지 않는 열정으로 매일 달리는 어휘 질주' },
  { level: 7, title: '매일 습관 루키', badgeEmoji: '⏱️', themeColor: 'from-sky-400 to-indigo-500', expBoostPercent: 8, boostTitle: '경험치 부스트 +8%', tierName: '스타터', perk: '스트릭 보너스 강화', motto: '7일 연속 실천의 첫 번째 습관 루프 완성' },
  { level: 8, title: '섀도잉 비기너 슈터', badgeEmoji: '🎯', themeColor: 'from-sky-400 to-indigo-500', expBoostPercent: 9, boostTitle: '경험치 부스트 +9%', tierName: '스타터', perk: '발음 연습 보너스', motto: '원어민 발음을 그림자처럼 따라잡는 연습생' },
  { level: 9, title: '리듬 타는 보컬러', badgeEmoji: '🎵', themeColor: 'from-sky-400 to-indigo-500', expBoostPercent: 10, boostTitle: '경험치 부스트 +10%', tierName: '스타터', perk: '억양 리듬 보너스', motto: '영어 억양과 인토네이션의 리듬을 체득 중' },
  { level: 10, title: '단어 마스터 라이징 스타', badgeEmoji: '⭐', themeColor: 'from-sky-400 to-indigo-500', expBoostPercent: 12, boostTitle: '경험치 부스트 +12%', tierName: '챌린저', perk: '라이징 스타 오라', motto: '주변을 밝히며 무서운 속도로 도약하는 라이징 스타' },

  // 11 ~ 20: 질주하는 틴에이저 챌린저 (Challenger)
  { level: 11, title: '스피드 단어 스나이퍼', badgeEmoji: '🎯', themeColor: 'from-sky-400 to-indigo-500', expBoostPercent: 13, boostTitle: '경험치 부스트 +13%', tierName: '챌린저', perk: '속독 속해 보너스', motto: '0.5초 만에 단어 뜻을 명중시키는 정확도' },
  { level: 12, title: '섀도잉 폭풍 낭독러', badgeEmoji: '🌪️', themeColor: 'from-sky-400 to-indigo-500', expBoostPercent: 14, boostTitle: '경험치 부스트 +14%', tierName: '챌린저', perk: '낭독 가속 부스트', motto: '망설임 없이 자신 있게 뿜어져 나오는 영어 보이스' },
  { level: 13, title: '빛나는 섀도잉 슈터', badgeEmoji: '⚡', themeColor: 'from-amber-400 to-orange-500', expBoostPercent: 15, boostTitle: '경험치 부스트 +15%', tierName: '챌린저', perk: '발음 챌린지 EXP +20%', motto: '발음 점수 90점을 돌파하는 완벽한 조준' },
  { level: 14, title: '귀가 트이는 리스닝 챔프', badgeEmoji: '👂', themeColor: 'from-amber-400 to-orange-500', expBoostPercent: 16, boostTitle: '경험치 부스트 +16%', tierName: '챌린저', perk: '연음 청취 특권', motto: '원어민의 빠른 연음까지 선명하게 들리는 청취력' },
  { level: 15, title: '단어 콤보 스트라이커', badgeEmoji: '⚽', themeColor: 'from-amber-400 to-orange-500', expBoostPercent: 17, boostTitle: '경험치 부스트 +17%', tierName: '챌린저', perk: '콤보 골든 이펙트', motto: '오답 없이 정답 골대를 흔드는 10연속 콤보의 주역' },
  { level: 16, title: '어휘력 급상승 유망주', badgeEmoji: '🚀', themeColor: 'from-amber-400 to-orange-500', expBoostPercent: 18, boostTitle: '경험치 부스트 +18%', tierName: '챌린저', perk: '수직 상승 부스터', motto: '한계를 넘어 수직 상승하는 어휘 로켓' },
  { level: 17, title: '자신감 만점 스피커', badgeEmoji: '🎙️', themeColor: 'from-amber-400 to-orange-500', expBoostPercent: 19, boostTitle: '경험치 부스트 +19%', tierName: '챌린저', perk: '스피킹 자신감 버프', motto: '실전에서도 당당하게 발화하는 스피킹 자신감' },
  { level: 18, title: '불꽃 연속 스트리커', badgeEmoji: '🔥', themeColor: 'from-amber-400 to-orange-500', expBoostPercent: 20, boostTitle: '경험치 부스트 +20%', tierName: '챌린저', perk: '플레임 스트릭 강화', motto: '작심삼일을 넘어 뜨겁게 타오르는 18일 연속 루프' },
  { level: 19, title: '단어 100단 마법사', badgeEmoji: '🪄', themeColor: 'from-amber-400 to-orange-500', expBoostPercent: 21, boostTitle: '경험치 부스트 +21%', tierName: '챌린저', perk: '어휘 연금술 마스터', motto: '수많은 어휘를 자유자재로 다루는 단어 연금술사' },
  { level: 20, title: '스피드 퀴즈 에이스', badgeEmoji: '🃏', themeColor: 'from-pink-400 to-rose-500', expBoostPercent: 22, boostTitle: '경험치 부스트 +22%', tierName: '챌린저', perk: '에이스 조커 보너스', motto: '어떤 퀴즈 유형도 거침없이 해결하는 팀의 에이스' },

  // 21 ~ 30: 독보적인 학업 엘리트 (Study Elite)
  { level: 21, title: '스피드 퀴즈 마스터', badgeEmoji: '🎯', themeColor: 'from-pink-400 to-rose-500', expBoostPercent: 23, boostTitle: '경험치 부스트 +23%', tierName: '엘리트', perk: '골든 스타 콘페티 해금', motto: '단어 암기 퀴즈의 전설적인 정답률 보유자' },
  { level: 22, title: '골든 딕테이션 마인드', badgeEmoji: '🧠', themeColor: 'from-pink-400 to-rose-500', expBoostPercent: 24, boostTitle: '경험치 부스트 +24%', tierName: '엘리트', perk: '시각화 기억 부스트', motto: '들은 단어를 머릿속에서 그대로 시각화하는 지성' },
  { level: 23, title: '섀도잉 프리스타일러', badgeEmoji: '🎤', themeColor: 'from-pink-400 to-rose-500', expBoostPercent: 25, boostTitle: '경험치 부스트 +25%', tierName: '엘리트', perk: '프리토킹 감각 해금', motto: '자연스럽게 영어를 구사하는 프리스타일 섀도잉' },
  { level: 24, title: '어휘 데이터 마이너', badgeEmoji: '💎', themeColor: 'from-pink-400 to-rose-500', expBoostPercent: 26, boostTitle: '경험치 부스트 +26%', tierName: '엘리트', perk: '고급 예문 채굴권', motto: '방대한 예문 속에서 핵심 표현을 채굴하는 마이너' },
  { level: 25, title: '영단어 정밀 타격왕', badgeEmoji: '🏹', themeColor: 'from-pink-400 to-rose-500', expBoostPercent: 27, boostTitle: '경험치 부스트 +27%', tierName: '엘리트', perk: '정밀 타격 크리티컬', motto: '단 한 번의 망설임 없이 핵심 어휘를 꿰뚫는 명사수' },
  { level: 26, title: '퍼펙트 발음 스페셜리스트', badgeEmoji: '💎', themeColor: 'from-violet-400 to-purple-600', expBoostPercent: 28, boostTitle: '경험치 부스트 +28%', tierName: '엘리트', perk: '원어민 주파수 공명', motto: '억양, 강세, 모음 길이를 완벽하게 구사하는 전문가' },
  { level: 27, title: '문맥을 꿰뚫는 분석가', badgeEmoji: '🔬', themeColor: 'from-violet-400 to-purple-600', expBoostPercent: 29, boostTitle: '경험치 부스트 +29%', tierName: '엘리트', perk: '뉘앙스 포착 혜안', motto: '단어 하나의 다의어와 뉘앙스까지 포착하는 혜안' },
  { level: 28, title: '무한 루프 열공러', badgeEmoji: '♾️', themeColor: 'from-violet-400 to-purple-600', expBoostPercent: 30, boostTitle: '경험치 부스트 +30%', tierName: '엘리트', perk: '무한 에너지 버프', motto: '반복 청취 오디오 플레이어를 멈추지 않는 지치지 않는 열정' },
  { level: 29, title: '어휘 암기 신동', badgeEmoji: '🔮', themeColor: 'from-violet-400 to-purple-600', expBoostPercent: 31, boostTitle: '경험치 부스트 +31%', tierName: '엘리트', perk: '장기 기억 각인술', motto: '망각 곡선을 거스르며 장기 기억으로 전환하는 기억의 달인' },
  { level: 30, title: '영어 정복 모험 대장', badgeEmoji: '🛡️', themeColor: 'from-violet-400 to-purple-600', expBoostPercent: 32, boostTitle: '경험치 부스트 +32%', tierName: '엘리트', perk: '모험 대장 지휘봉', motto: '중급을 넘어 상급으로 이끄는 모험대의 총대장' },

  // 31 ~ 40: 전설의 어휘 정복자 (Legendary Conqueror)
  { level: 31, title: '영어 정복 모험가', badgeEmoji: '🛡️', themeColor: 'from-violet-400 to-purple-600', expBoostPercent: 33, boostTitle: '경험치 부스트 +33%', tierName: '정복자', perk: '마스터 칭호 배지 장착', motto: '미지의 영어 세계를 두려움 없이 탐험하는 용사' },
  { level: 32, title: '단어의 바다 항해사', badgeEmoji: '🧭', themeColor: 'from-violet-400 to-purple-600', expBoostPercent: 34, boostTitle: '경험치 부스트 +34%', tierName: '정복자', perk: '대양 항해 나침반', motto: '광활한 영어 어휘의 대양을 유연하게 항해하는 캡틴' },
  { level: 33, title: '네이티브 발음 마에스트로', badgeEmoji: '🎼', themeColor: 'from-violet-400 to-purple-600', expBoostPercent: 35, boostTitle: '경험치 부스트 +35%', tierName: '정복자', perk: '음성 조율 마에스트로', motto: '음성 섀도잉을 음악처럼 아름답게 조율하는 거장' },
  { level: 34, title: '섀도잉 불사조', badgeEmoji: '🦅', themeColor: 'from-violet-400 to-purple-600', expBoostPercent: 36, boostTitle: '경험치 부스트 +36%', tierName: '정복자', perk: '불굴의 끈기 날개', motto: '어려운 장문 문장도 끝까지 포기하지 않는 끈기의 화신' },
  { level: 35, title: '어휘 보물 사냥꾼', badgeEmoji: '🗺️', themeColor: 'from-violet-400 to-purple-600', expBoostPercent: 37, boostTitle: '경험치 부스트 +37%', tierName: '정복자', perk: '숙어 보물 지도', motto: '고급 숙어와 콜로케이션을 모두 수집한 트레저 헌터' },
  { level: 36, title: '강철 멘탈 습관러', badgeEmoji: '🦾', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 38, boostTitle: '경험치 부스트 +38%', tierName: '정복자', perk: '강철 루프 멘탈', motto: '비가 오나 눈이 오나 학습을 거르지 않는 강철의 실천력' },
  { level: 37, title: '실전 회화 프리패서', badgeEmoji: '✈️', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 39, boostTitle: '경험치 부스트 +39%', tierName: '정복자', perk: '글로벌 소통 여권', motto: '외국인 앞에서도 유창하게 생각을 표현하는 프리패서' },
  { level: 38, title: '영단어 하이퍼 드라이버', badgeEmoji: '🏎️', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 40, boostTitle: '경험치 부스트 +40%', tierName: '정복자', perk: '광속 질주 엔진', motto: '최고 속도로 어휘 지식을 흡수하는 광속 질주자' },
  { level: 39, title: '단어의 성채 수호자', badgeEmoji: '🏰', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 41, boostTitle: '경험치 부스트 +41%', tierName: '정복자', perk: '난공불락 기억 성채', motto: '수천 개의 어휘를 굳건하게 지켜내는 난공불락의 성채' },
  { level: 40, title: '궁극의 섀도잉 사령관', badgeEmoji: '⚔️', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 42, boostTitle: '경험치 부스트 +42%', tierName: '정복자', perk: '절대 발음 사령관', motto: '모든 발음 챌린지를 정복한 절대적 지휘관' },

  // 41 ~ 50: 워드루프 그랜드 마스터 (Grand Master Mythic)
  { level: 41, title: '워드루프 그랜드 마스터', badgeEmoji: '👑', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 43, boostTitle: '경험치 부스트 +43%', tierName: '그랜드마스터', perk: '전설의 어휘 왕관', motto: '모든 학생이 동경하는 최고의 어휘 챔피언' },
  { level: 42, title: '불멸의 단어 현자', badgeEmoji: '📜', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 44, boostTitle: '경험치 부스트 +44%', tierName: '그랜드마스터', perk: '어원 통달 현자의 지혜', motto: '영단어의 어원과 원리까지 통달한 학문의 현자' },
  { level: 43, title: '절대음감 스피치 군주', badgeEmoji: '👑', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 45, boostTitle: '경험치 부스트 +45%', tierName: '그랜드마스터', perk: '원어민 주파수 왕권', motto: '원어민 수준의 청음력과 발음 정확도를 겸비한 군주' },
  { level: 44, title: '언어의 장벽 파괴자', badgeEmoji: '💥', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 46, boostTitle: '경험치 부스트 +46%', tierName: '그랜드마스터', perk: '이중언어 완전 자유', motto: '영어와 모국어의 경계를 자유자재로 넘나드는 브레이커' },
  { level: 45, title: '황금빛 스트릭 지존', badgeEmoji: '🌟', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 47, boostTitle: '경험치 부스트 +47%', tierName: '그랜드마스터', perk: '영원한 불꽃 아우라', motto: '경이로운 연속 학습 기록으로 전설이 된 지존' },
  { level: 46, title: '차원을 넘나드는 번역사', badgeEmoji: '🌌', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 48, boostTitle: '경험치 부스트 +48%', tierName: '그랜드마스터', perk: '동시통역 싱크로', motto: '고난도 문맥도 직관적으로 이해하고 번역하는 능력자' },
  { level: 47, title: '단어의 신좌 도전자', badgeEmoji: '⚡', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 49, boostTitle: '경험치 부스트 +49%', tierName: '그랜드마스터', perk: '신화의 번개 낙인', motto: '인간의 한계를 시험하며 신화의 영역에 도전하는 자' },
  { level: 48, title: '영단어 무한지성', badgeEmoji: '👁️', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 50, boostTitle: '경험치 부스트 +50%', tierName: '그랜드마스터', perk: '전지적 어휘 연상', motto: '방대한 어휘를 즉각적으로 연상해내는 무한의 지성' },
  { level: 49, title: '워드루프 전설의 수호신', badgeEmoji: '🪐', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 50, boostTitle: '경험치 부스트 +50%', tierName: '그랜드마스터', perk: '성좌의 가호', motto: '영어 학습의 모든 길을 인도하는 전설 속 수호신' },
  { level: 50, title: '신화의 워드루프 그랜드 마스터', badgeEmoji: '🏆', themeColor: 'from-yellow-300 via-amber-400 to-orange-500', expBoostPercent: 50, boostTitle: '경험치 부스트 +50% (MAX)', tierName: '그랜드마스터 MAX', perk: '전설의 영구 50% EXP 부스트 & 황금 월계관', motto: '워드루프 50단계 정점에 등극한 유일무이한 신화' },
];

/**
 * Returns the exact student title definition for a given level (1~50)
 */
export function getStudentTitleForLevel(level: number): StudentTitleDefinition {
  const clamped = Math.max(1, Math.min(50, Math.floor(level)));
  return STUDENT_50_TITLES[clamped - 1] || STUDENT_50_TITLES[0];
}

/**
 * Calculates EXP required to reach a specific level
 */
export function getExpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  // Scaled curve: Lv 2 = 120 EXP, Lv 10 = 2,400 EXP, Lv 30 = 15,000 EXP
  return Math.floor(60 * Math.pow(level, 1.6));
}

/**
 * Calculates current student level and EXP breakdown from learning stats
 */
export function calculateStudentLevel(params: {
  totalRepeatsCount: number;
  vocabList?: VocabItem[];
  goals?: Goal[];
  history?: DailyGoalHistory[];
  streakDays?: number;
}): StudentLevelInfo {
  const { totalRepeatsCount, vocabList = [], goals = [], history = [], streakDays = 1 } = params;

  // 1. Mastery Word EXP
  const masteredWords = vocabList.filter((v) => (v.masteryLevel || 0) >= 2).length;
  const learningWords = vocabList.filter((v) => (v.masteryLevel || 0) === 1).length;
  const vocabExp = masteredWords * 35 + learningWords * 15;

  // 2. Audio Repeats & Shadowing EXP (1 repeat = 2 EXP)
  const repeatsExp = totalRepeatsCount * 2;

  // 3. Goal Completion EXP
  const completedGoalsCount = goals.filter((g) => g.isCompleted).length;
  const historyGoalsCount = history.reduce((acc, h) => acc + (h.completedGoalsCount || 0), 0);
  const goalExp = (completedGoalsCount + historyGoalsCount) * 50;

  // 4. Streak Days Bonus EXP
  const streakExp = Math.min(streakDays * 80, 4000);

  // Total Accumulated EXP
  const totalExp = Math.max(0, vocabExp + repeatsExp + goalExp + streakExp);

  // Determine Level (1 ~ 50)
  let level = 1;
  while (level < 50 && totalExp >= getExpRequiredForLevel(level + 1)) {
    level++;
  }

  const minExp = getExpRequiredForLevel(level);
  const nextExp = level >= 50 ? minExp : getExpRequiredForLevel(level + 1);
  const expNeeded = Math.max(1, nextExp - minExp);
  const currentLevelProgress = Math.max(0, totalExp - minExp);
  const progressPercent = level >= 50 ? 100 : Math.min(100, Math.floor((currentLevelProgress / expNeeded) * 100));

  // Determine 50 Teen Student Title & EXP Boost
  const titleDef = getStudentTitleForLevel(level);

  return {
    level,
    title: titleDef.title,
    badgeEmoji: titleDef.badgeEmoji,
    themeColor: titleDef.themeColor,
    currentExp: totalExp,
    minExpForCurrentLevel: minExp,
    expForNextLevel: nextExp,
    progressPercent,
    unlockedPerk: `${titleDef.perk} (${titleDef.boostTitle})`,
    expBoostPercent: titleDef.expBoostPercent,
    boostMultiplier: 1 + titleDef.expBoostPercent / 100,
    boostTitle: titleDef.boostTitle,
    tierName: titleDef.tierName,
  };
}

/**
 * Calculates itemized breakdown of student EXP sources for transparent dashboard presentation
 */
export function calculateStudentExpBreakdown(params: {
  totalRepeatsCount: number;
  vocabList?: VocabItem[];
  goals?: Goal[];
  history?: DailyGoalHistory[];
  streakDays?: number;
}): StudentExpBreakdown {
  const { totalRepeatsCount, vocabList = [], goals = [], history = [], streakDays = 1 } = params;

  const masteredWords = vocabList.filter((v) => (v.masteryLevel || 0) >= 2).length;
  const learningWords = vocabList.filter((v) => (v.masteryLevel || 0) === 1).length;
  const vocabExp = masteredWords * 35 + learningWords * 15;

  const repeatsExp = totalRepeatsCount * 2;

  const completedGoalsCount = goals.filter((g) => g.isCompleted).length;
  const historyGoalsCount = history.reduce((acc, h) => acc + (h.completedGoalsCount || 0), 0);
  const totalCompletedGoals = completedGoalsCount + historyGoalsCount;
  const goalExp = totalCompletedGoals * 50;

  const streakExp = Math.min(streakDays * 80, 4000);
  const totalExp = Math.max(0, vocabExp + repeatsExp + goalExp + streakExp);

  return {
    vocabExp,
    masteredWords,
    learningWords,
    repeatsExp,
    totalRepeats: totalRepeatsCount,
    goalExp,
    completedGoalsCount: totalCompletedGoals,
    streakExp,
    streakDays,
    totalExp,
  };
}

/**
 * Triggers sound/haptic for student gamification events
 */
export function triggerHapticFeedback(pattern: 'light' | 'medium' | 'success') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (pattern === 'light') navigator.vibrate(20);
      else if (pattern === 'medium') navigator.vibrate(40);
      else if (pattern === 'success') navigator.vibrate([30, 40, 60]);
    } catch {}
  }
}
