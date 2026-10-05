import { Goal, DailyGoalHistory } from '../types';

export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'g-1',
    title: '매일 영어 단어 & 문장 반복 청취',
    category: 'english',
    targetCount: 10,
    unit: '개',
    currentCount: 0,
    isCompleted: false,
    streak: 3,
    iconName: 'Headphones',
    description: '단어나 문장을 탭하여 10개 이상 집중 반복 청취하기 (자동 연동됨)',
    isAutoLinkedToEnglish: true,
  },
  {
    id: 'g-2',
    title: '영문장 발음 쉐도잉 연습',
    category: 'english',
    targetCount: 3,
    unit: '회',
    currentCount: 0,
    isCompleted: false,
    streak: 2,
    iconName: 'Mic',
    description: '마이크 버튼을 눌러 정확도 80% 이상 발음 연습 달성하기',
    isAutoLinkedToEnglish: true,
  },
  {
    id: 'g-3',
    title: '하루 30분 건강 운동하기',
    category: 'exercise',
    targetCount: 30,
    unit: '분',
    currentCount: 0,
    isCompleted: false,
    streak: 5,
    iconName: 'Dumbbell',
    description: '산책, 헬스, 요가, 홈트레이닝 등 신체 활동 진행하기',
  },
  {
    id: 'g-4',
    title: '자기계발 독서 10페이지',
    category: 'reading',
    targetCount: 10,
    unit: '쪽',
    currentCount: 0,
    isCompleted: false,
    streak: 1,
    iconName: 'BookOpen',
    description: '매일 영감을 주는 서적 읽기',
  },
];

// Seed sample history for activity graph
export function generateSampleHistory(): DailyGoalHistory[] {
  const history: DailyGoalHistory[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Seed realistic streak pattern
    const completed = i === 0 ? 0 : Math.floor(Math.random() * 3) + 1;
    history.push({
      date: dateStr,
      completedGoalsCount: completed,
      totalGoalsCount: 4,
      vocabStudyCount: i === 0 ? 0 : Math.floor(Math.random() * 15) + 5,
    });
  }

  return history;
}
