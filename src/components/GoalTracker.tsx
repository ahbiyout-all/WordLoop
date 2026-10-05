import React, { useState } from 'react';
import { Target, CheckCircle2, Flame, Plus, Headphones, Mic, Dumbbell, BookOpen, Sparkles, Trophy, Calendar, Trash2 } from 'lucide-react';
import { Goal, DailyGoalHistory, GoalCategory } from '../types';

interface GoalTrackerProps {
  goals: Goal[];
  history: DailyGoalHistory[];
  onToggleGoalComplete: (id: string) => void;
  onIncrementGoal: (id: string, amount?: number) => void;
  onAddGoal: (goal: Omit<Goal, 'id' | 'currentCount' | 'isCompleted' | 'streak'>) => void;
  onDeleteGoal: (id: string) => void;
  onOpenAIGoalRecommend?: () => void;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({
  goals,
  history,
  onToggleGoalComplete,
  onIncrementGoal,
  onAddGoal,
  onDeleteGoal,
  onOpenAIGoalRecommend,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<GoalCategory>('english');
  const [newTarget, setNewTarget] = useState(10);
  const [newUnit, setNewUnit] = useState('개');
  const [newDescription, setNewDescription] = useState('');
  const [isAutoLinked, setIsAutoLinked] = useState(true);

  // Compute stats
  const completedTodayCount = goals.filter((g) => g.isCompleted).length;
  const totalGoals = goals.length;
  const overallPercentage = totalGoals > 0 ? Math.round((completedTodayCount / totalGoals) * 100) : 0;
  const maxStreak = goals.reduce((max, g) => Math.max(max, g.streak), 0);

  const getGoalIcon = (iconName: string, category: GoalCategory) => {
    switch (category) {
      case 'english':
        return <Headphones className="w-5 h-5 text-emerald-500" />;
      case 'exercise':
        return <Dumbbell className="w-5 h-5 text-blue-500" />;
      case 'reading':
        return <BookOpen className="w-5 h-5 text-amber-500" />;
      default:
        return <Target className="w-5 h-5 text-purple-500" />;
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    onAddGoal({
      title: newTitle,
      category: newCategory,
      targetCount: Number(newTarget),
      unit: newUnit,
      iconName: newCategory === 'english' ? 'Headphones' : newCategory === 'exercise' ? 'Dumbbell' : 'Target',
      description: newDescription || undefined,
      isAutoLinkedToEnglish: newCategory === 'english' ? isAutoLinked : false,
    });

    setNewTitle('');
    setNewDescription('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Motivation */}
      <div className="rounded-3xl p-6 bg-slate-900 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/20 via-emerald-500/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold mb-2">
              <Trophy className="w-3.5 h-3.5" />
              <span>오늘의 자기계발 달성률 {overallPercentage}%</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              나만의 목표 달성 및 습관 기록장
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-lg">
              꾸준한 기록이 큰 성장을 만듭니다. 영어 공부 목표는 앱 내 반복 청취 학습 시 자동으로 수치가 기록됩니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 px-4 py-3 rounded-2xl border border-slate-700 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 font-extrabold text-xl">
                <Flame className="w-5 h-5 fill-current" />
                <span>{maxStreak}일</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">최대 연속 달성</span>
            </div>

            {onOpenAIGoalRecommend && (
              <button
                onClick={onOpenAIGoalRecommend}
                className="px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI 맞춤 목표 추천</span>
              </button>
            )}
          </div>
        </div>

        {/* Daily Overall Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
            <span>오늘의 목표 완료 ({completedTodayCount} / {totalGoals})</span>
            <span className="text-emerald-400">{overallPercentage}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>진행 중인 목표 목록</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {totalGoals}개
          </span>
        </h3>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>새 목표 추가</span>
        </button>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const progressPercent = Math.min(100, Math.round((goal.currentCount / goal.targetCount) * 100));

          return (
            <div
              key={goal.id}
              className={`rounded-2xl p-5 border transition-all ${
                goal.isCompleted
                  ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                    {getGoalIcon(goal.iconName, goal.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {goal.title}
                      </h4>
                      {goal.isAutoLinkedToEnglish && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          ⚡ 영어 연동됨
                        </span>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {goal.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onDeleteGoal(goal.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                  title="목표 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar & Numerical Counter */}
              <div className="my-3">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    {goal.currentCount} / {goal.targetCount} {goal.unit}
                  </span>
                  <span className={goal.isCompleted ? 'text-emerald-500 font-bold' : 'text-slate-500'}>
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      goal.isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Action Footer: Quick Increment vs Complete */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>{goal.streak}일 연속 실천</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onIncrementGoal(goal.id, 1)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95"
                  >
                    +1 {goal.unit} 기록
                  </button>

                  <button
                    onClick={() => onToggleGoalComplete(goal.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                      goal.isCompleted
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{goal.isCompleted ? '달성 완료!' : '달성 체크'}</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Monthly Self-Improvement Consistency Calendar Heatmap Matrix */}
      <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h4 className="font-bold text-base text-slate-900 dark:text-white">
              최근 30일 자기계발 잔디 (실천 일지)
            </h4>
          </div>
          <span className="text-xs text-slate-400">꾸준한 실천 흔적</span>
        </div>

        <div className="grid grid-cols-10 gap-2">
          {history.map((h, idx) => {
            const intensity =
              h.completedGoalsCount >= 3
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : h.completedGoalsCount === 2
                ? 'bg-emerald-400/70 text-slate-900'
                : h.completedGoalsCount === 1
                ? 'bg-emerald-500/30 text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400';

            return (
              <div
                key={idx}
                className={`p-2 rounded-xl text-center flex flex-col items-center justify-center text-[10px] transition-all hover:scale-105 cursor-pointer ${intensity}`}
                title={`${h.date}: ${h.completedGoalsCount}개 목표 완료 / ${h.vocabStudyCount}회 영어 공부`}
              >
                <span className="opacity-75">{h.date.slice(8)}일</span>
                <span className="font-extrabold mt-0.5">{h.completedGoalsCount}개</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal to Add Custom Goal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              새로운 자기계발 목표 설정
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  목표 이름 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 영단어 10개 매일 듣기, 매일 30분 유산소"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    카테고리
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as GoalCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="english">영어 학습</option>
                    <option value="exercise">운동 & 건강</option>
                    <option value="reading">독서 & 공부</option>
                    <option value="habit">생활 습관</option>
                    <option value="custom">기타 목표</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    일일 수치 & 단위
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      required
                      min={1}
                      value={newTarget}
                      onChange={(e) => setNewTarget(Number(e.target.value))}
                      className="w-16 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      required
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      placeholder="개, 분, 쪽"
                      className="flex-1 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  설명 / 메모
                </label>
                <input
                  type="text"
                  placeholder="예: 매일 아침 출근길 10분 반복 청취하기"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {newCategory === 'english' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="auto-link-check"
                    checked={isAutoLinked}
                    onChange={(e) => setIsAutoLinked(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="auto-link-check" className="text-xs text-slate-700 dark:text-slate-300">
                    앱 내 단어/문장 청취 시 자동으로 수치 연동
                  </label>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md"
                >
                  목표 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
