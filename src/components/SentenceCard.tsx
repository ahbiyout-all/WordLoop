import React from 'react';
import { Volume2, RotateCcw, Bookmark, Mic, Sparkles, Activity } from 'lucide-react';
import { SentenceItem } from '../types';
import { speechService } from '../services/speechService';
import { formatEduVocabMeaning } from '../utils/meaningUtils';
import { InlinePronunciationWaveform } from './InlinePronunciationWaveform';

interface SentenceCardProps {
  item: SentenceItem;
  isCurrentlyLooping: boolean;
  isPlaying: boolean;
  repeatCount: number;
  hideMeaning?: boolean;
  showEduTag?: boolean;
  onToggleBookmark: (id: string) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onOpenPronunciationModal: (text: string) => void;
  onOpenAIExplain?: (text: string) => void;
  isWaveformExpanded?: boolean;
  onToggleWaveform?: () => void;
}

export const SentenceCard: React.FC<SentenceCardProps> = React.memo(({
  item,
  isCurrentlyLooping,
  isPlaying,
  repeatCount,
  hideMeaning = false,
  showEduTag = false,
  onToggleBookmark,
  onChangeMastery,
  onOpenPronunciationModal,
  onOpenAIExplain,
  isWaveformExpanded,
  onToggleWaveform,
}) => {
  const [showMeaning, setShowMeaning] = React.useState(!hideMeaning);
  const [localWaveformOpen, setLocalWaveformOpen] = React.useState(false);

  const isWaveformActive = isWaveformExpanded !== undefined ? isWaveformExpanded : localWaveformOpen;

  const handleToggleWaveform = () => {
    if (onToggleWaveform) {
      onToggleWaveform();
    } else {
      setLocalWaveformOpen((prev) => !prev);
    }
  };

  React.useEffect(() => {
    setShowMeaning(!hideMeaning);
  }, [hideMeaning]);

  const currentLevel = item.masteryLevel ?? (item.isLearned ? 2 : 0);

  const formattedMeaning = React.useMemo(
    () => formatEduVocabMeaning(item.meaning, showEduTag),
    [item.meaning, showEduTag]
  );

  const handleCardClick = () => {
    speechService.playItem(item.id, item.text, formattedMeaning);
  };

  return (
    <div
      id={`sentence-card-${item.id}`}
      onClick={handleCardClick}
      className={`group relative rounded-2xl p-5 cursor-pointer transition-all duration-300 border ${
        isCurrentlyLooping
          ? 'bg-slate-900/90 dark:bg-slate-900/90 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30 text-white'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md text-slate-800 dark:text-slate-100'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {item.context && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {item.context}
            </span>
          )}

          {/* Mastery Level Quick Selector */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-full border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onChangeMastery?.(item.id, 0)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                currentLevel === 0
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="미암기 (0단계)"
            >
              미암기
            </button>
            <button
              onClick={() => onChangeMastery?.(item.id, 1)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                currentLevel === 1
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="학습중 (1단계)"
            >
              학습중
            </button>
            <button
              onClick={() => onChangeMastery?.(item.id, 2)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                currentLevel === 2
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="완벽암기 (2단계)"
            >
              완벽암기
            </button>
          </div>

          {isCurrentlyLooping && (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
              <RotateCcw className="w-3 h-3 animate-spin" style={{ animationDuration: isPlaying ? '3s' : '0s' }} />
              {repeatCount}회 무한 반복 재생 중
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(item.id);
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            item.isBookmarked
              ? 'text-amber-500 hover:text-amber-600'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          title="북마크"
        >
          <Bookmark className={`w-4 h-4 ${item.isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Main Sentence Display */}
      <div className="mb-3">
        <h3 className="text-lg font-bold leading-relaxed group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
          "{item.text}"
        </h3>

        <div
          className="mt-2"
          onClick={(e) => {
            e.stopPropagation();
            if (hideMeaning) setShowMeaning(!showMeaning);
          }}
        >
          {showMeaning ? (
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {formattedMeaning}
            </p>
          ) : (
            <span className="inline-block text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
              👁️ 뜻 해석 보기 (클릭)
            </span>
          )}
        </div>
      </div>

      {/* Word Breakdown Chips */}
      {item.wordBreakdown && item.wordBreakdown.length > 0 && (
        <div className="my-3 pt-2 flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-800">
          {item.wordBreakdown.map((wb, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
            >
              <span className="font-semibold">{wb.word}:</span>
              <span className="text-slate-500 dark:text-slate-400">{wb.meaning}</span>
            </span>
          ))}
        </div>
      )}

      {/* 💡 안내 팁 섹션 */}
      <div className="mt-3 pt-2 text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
        <p className="leading-relaxed">
          🔊 문장을 탭하여 쉐도잉용 연속 반복 재생을 들으세요.
        </p>
      </div>

      {/* 🎤 발음 연습 & 🔮 AI 해설 전용 기능 칸 (팁 아래 신규 배치) */}
      <div className="mt-2.5 pt-2 flex items-center justify-between gap-2 border-t border-slate-100/70 dark:border-slate-800/60" onClick={(e) => e.stopPropagation()}>
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
          AI 실습 도구
        </span>

        <div className="flex items-center gap-2">
          {/* 실시간 파형 비교 인라인 토글 버튼 */}
          <button
            onClick={handleToggleWaveform}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isWaveformActive
                ? 'bg-indigo-600 text-white shadow-indigo-500/20 ring-2 ring-indigo-400'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/60 dark:border-indigo-800/50'
            }`}
            title="문장 쉐도잉 원어민 vs 내 발음 파형 비교 (카드 아래로 펼치기)"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isWaveformActive ? '파형 닫기 ⌃' : '파형 비교 ⌄'}</span>
          </button>

          {onOpenAIExplain && (
            <button
              onClick={() => onOpenAIExplain(item.text)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/80 border border-purple-200/60 dark:border-purple-800/50 text-xs font-bold transition-all shadow-sm"
              title="AI 문장 구조 및 뉘앙스 해설"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>AI 해설</span>
            </button>
          )}
        </div>
      </div>

      {/* AI 원어민 vs 내 발음 실시간 파형 비교 인라인 아코디언 패널 */}
      {isWaveformActive && (
        <InlinePronunciationWaveform
          targetText={item.text}
          onClose={() => {
            if (onToggleWaveform) {
              onToggleWaveform();
            } else {
              setLocalWaveformOpen(false);
            }
          }}
        />
      )}
    </div>
  );
});
