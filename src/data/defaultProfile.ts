import { UserProfile, StudyGradeLevel } from '../types';

export const AVATAR_PRESETS = [
  { emoji: '🎓', label: '열공 학사모', color: 'from-blue-500 to-indigo-600' },
  { emoji: '🦁', label: '용맹한 사자', color: 'from-amber-500 to-orange-600' },
  { emoji: '⚡', label: '번개 스피더', color: 'from-yellow-400 to-amber-500' },
  { emoji: '🦉', label: '지혜로운 부엉이', color: 'from-emerald-500 to-teal-700' },
  { emoji: '🚀', label: '도약하는 로켓', color: 'from-purple-500 to-indigo-600' },
  { emoji: '🔥', label: '열정보이/걸', color: 'from-red-500 to-orange-500' },
  { emoji: '👑', label: '단어의 제왕', color: 'from-yellow-500 to-amber-600' },
  { emoji: '🌟', label: '빛나는 스타', color: 'from-teal-400 to-cyan-500' },
  { emoji: '🎯', label: '목표 타겟터', color: 'from-rose-500 to-red-600' },
  { emoji: '💡', label: '아이디어 뱅크', color: 'from-amber-400 to-yellow-600' },
  { emoji: '🍀', label: '행운의 네잎클로버', color: 'from-green-500 to-emerald-600' },
  { emoji: '💎', label: '다이아몬드 마스터', color: 'from-cyan-500 to-blue-600' },
];

export const GRADE_LEVEL_OPTIONS: { id: StudyGradeLevel; label: string; desc: string; icon: string }[] = [
  { id: 'elementary', label: '초등 기초 (800단어)', desc: '기초 파닉스 및 초등 필수 기본 어휘', icon: '🌱' },
  { id: 'middle', label: '중학 필수 (1,200단어)', desc: '내신 필수 및 중등 핵심 단어·구문', icon: '🌿' },
  { id: 'high', label: '고등/수능 (1,800단어)', desc: '수능 1등급 및 모의고사 빈출 어휘', icon: '🌳' },
  { id: 'toeic', label: '토익/성인 실무', desc: '비즈니스 회화, 토익·토플 시험 대비', icon: '💼' },
  { id: 'general', label: '자유 교양/원서', desc: '취미 회화, 미드 영어, 영미 원서 독해', icon: '✨' },
];

export const MOTTO_RECOMMENDATIONS = [
  '매일 꾸준히 20단어로 영단어 완전 정복!',
  '수능 영어 1등급 달성을 위해 매일 전진!',
  '출퇴근길 10분, 나를 바꾸는 영어 습관',
  '작은 습관이 모여 유창한 영어 실력이 된다',
  '토익 900점 돌파, 오늘 단어는 반드시 암기!',
  '외국인과 자유롭게 대화하는 그날까지 파이팅!',
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'user-primary-owner',
  name: '나의 학습자',
  avatar: '🎓',
  grade: 'high',
  gradeLabel: '고등/수능 (1,800단어)',
  dailyWordGoal: 20,
  motto: '매일 꾸준히 20단어로 영단어 완전 정복!',
  createdAt: new Date().toISOString(),
  isLocked: true,
};
