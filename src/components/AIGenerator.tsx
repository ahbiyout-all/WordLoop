import React, { useState } from 'react';
import { Sparkles, Loader2, Plus, Check, BookOpen, Target, Lightbulb } from 'lucide-react';
import { VocabItem, Goal } from '../types';
import { getAuthHeaders } from '../services/apiClient';

interface AIGeneratorProps {
  onAddGeneratedItems: (items: VocabItem[]) => void;
  onAddRecommendedGoal: (goal: Omit<Goal, 'id' | 'currentCount' | 'isCompleted' | 'streak'>) => void;
}

export const AIGenerator: React.FC<AIGeneratorProps> = ({
  onAddGeneratedItems,
  onAddRecommendedGoal,
}) => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedItems, setGeneratedItems] = useState<VocabItem[]>([]);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  // Goal Recommendation state
  const [interestTopic, setInterestTopic] = useState('영어 회화 & 습관 형성');
  const [goalLoading, setGoalLoading] = useState(false);
  const [recommendedGoals, setRecommendedGoals] = useState<any[]>([]);
  const [addedGoalIdxs, setAddedGoalIdxs] = useState<Set<number>>(new Set());

  const handleGenerateVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    setLoading(true);
    setErrorMsg('');
    setGeneratedItems([]);
    setAddedIds(new Set());

    try {
      const res = await fetch('/api/ai/generate-vocab', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ topic, count, difficulty }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI Vocab 생성 실패');
      }

      // Map to VocabItem array
      const itemsWithId: VocabItem[] = (data.items || []).map((item: any, idx: number) => ({
        id: `ai-gen-${Date.now()}-${idx}`,
        word: item.word,
        ipa: item.ipa,
        meaning: item.meaning,
        partOfSpeech: item.partOfSpeech || 'n.',
        sentence: item.sentence,
        sentenceMeaning: item.sentenceMeaning,
        categoryId: 'elementary',
        isCustom: true,
        tip: item.tip,
      }));

      setGeneratedItems(itemsWithId);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Gemini AI 서비스 연결 실패. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSingleItem = (item: VocabItem, idx: number) => {
    onAddGeneratedItems([item]);
    setAddedIds((prev) => new Set(prev).add(idx));
  };

  const handleAddAllItems = () => {
    onAddGeneratedItems(generatedItems);
    setAddedIds(new Set(generatedItems.map((_, i) => i)));
  };

  const handleGenerateGoals = async () => {
    setGoalLoading(true);
    try {
      const res = await fetch('/api/ai/recommend-goals', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ interest: interestTopic }),
      });
      const data = await res.json();
      if (data.success) {
        setRecommendedGoals(data.goals || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGoalLoading(false);
    }
  };

  const handleAddGoal = (g: any, idx: number) => {
    onAddRecommendedGoal({
      title: g.title,
      category: 'english',
      targetCount: g.targetCount || 10,
      unit: g.unit || '개',
      iconName: 'Headphones',
      description: g.description,
      isAutoLinkedToEnglish: true,
    });
    setAddedGoalIdxs((prev) => new Set(prev).add(idx));
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-slate-900 text-white border border-purple-500/30 shadow-xl relative overflow-hidden">
        <div className="flex items-start gap-4 relative z-10">
          <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Gemini AI 맞춤 단어 & 문장 생성기
            </h2>
            <p className="text-xs text-purple-200 mt-1 max-w-xl">
              원하는 주제(예: "카페 주문", "공항 체크인", "IT 개발 회의", "영화 감상평")를 입력하면 AI가 실용적인 표현과 예문, IPA 발음기호를 즉시 생성해 드립니다.
            </p>
          </div>
        </div>
      </div>

      {/* Generator Form */}
      <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleGenerateVocab} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              관심 주제 또는 상황 키워드 *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="예: 소프트웨어 개발자 면접, 뉴욕 호텔 체크인, 테니스 레슨 표현"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>AI 생성하기</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Topics */}
          <div>
            <span className="text-xs font-semibold text-slate-400 mr-2">추천 예시:</span>
            <div className="inline-flex flex-wrap gap-1.5 mt-1">
              {['미국 스타벅스 주문', '해외 직구 고객센터 문의', '비즈니스 협상 메일', '헬스장 가슴운동 표현', '영미권 스몰토크'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTopic(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-600 transition-all"
                >
                  #{preset}
                </button>
              ))}
            </div>
          </div>
        </form>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Generated Vocab Results */}
      {generatedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <span>AI가 생성한 {generatedItems.length}개의 맞춤 표현</span>
            </h3>

            <button
              onClick={handleAddAllItems}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>전체 내 암기장에 추가하기</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedItems.map((item, idx) => {
              const isAdded = addedIds.has(idx);

              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {item.word}
                        </span>
                        {item.ipa && (
                          <span className="text-xs font-mono text-slate-400">{item.ipa}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {item.meaning}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAddSingleItem(item, idx)}
                      disabled={isAdded}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                        isAdded
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                      }`}
                    >
                      {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{isAdded ? '추가완료' : '암기장 추가'}</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      "{item.sentence}"
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.sentenceMeaning}
                    </p>
                  </div>

                  {item.tip && (
                    <p className="text-[11px] text-purple-600 dark:text-purple-400">
                      💡 {item.tip}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goal Recommendation Section */}
      <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              AI 습관 & 목표 추천
            </h3>
          </div>

          <button
            onClick={handleGenerateGoals}
            disabled={goalLoading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            {goalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
            <span>목표 추천 받기</span>
          </button>
        </div>

        {recommendedGoals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {recommendedGoals.map((g, idx) => {
              const isAdded = addedGoalIdxs.has(idx);

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      {g.title}
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      일일 {g.targetCount}{g.unit} • {g.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleAddGoal(g, idx)}
                    disabled={isAdded}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      isAdded
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md'
                    }`}
                  >
                    {isAdded ? '추가됨' : '목표로 등록'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
