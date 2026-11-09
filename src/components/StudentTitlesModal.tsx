import React, { useState } from 'react';
import {
  Trophy,
  Sparkles,
  Zap,
  Star,
  Lock,
  CheckCircle2,
  X,
  Search,
  Filter,
  Award,
  Crown,
  Flame,
  ArrowRight,
} from 'lucide-react';
import {
  StudentLevelInfo,
  STUDENT_50_TITLES,
  StudentTitleDefinition,
  getExpRequiredForLevel,
} from '../services/studentGamificationService';

export interface StudentTitlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevelInfo: StudentLevelInfo;
}

type TierFilter = 'ALL' | '스타터' | '챌린저' | '엘리트' | '정복자' | '그랜드마스터';

export const StudentTitlesModal: React.FC<StudentTitlesModalProps> = ({
  isOpen,
  onClose,
  currentLevelInfo,
}) => {
  const [selectedTier, setSelectedTier] = useState<TierFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Keyboard accessibility: ESC key to close
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTitles = STUDENT_50_TITLES.filter((item) => {
    const matchesTier =
      selectedTier === 'ALL' || item.tierName.includes(selectedTier);
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.motto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.level).includes(searchQuery);
    return matchesTier && matchesSearch;
  });

  const unlockedCount = Math.min(50, currentLevelInfo.level);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titles-catalogue-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-slate-900 text-white border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-levelup-pop">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center text-lg">
                🎓
              </span>
              <h2 id="titles-catalogue-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
                50가지 틴에이저 칭호 도감 & 경험치 부스트
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              레벨 1부터 50까지 레벨업할 때마다 부여되는 고유 학생 칭호와 영구 경험치(EXP) 부스트 목록입니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Title & Boost Hero Status Banner */}
        <div className="p-4 sm:p-5 bg-slate-950/60 border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* 1. Current Title */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center text-2xl font-black shrink-0 shadow-md">
              {currentLevelInfo.badgeEmoji}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                현재 획득 칭호 (Lv.{currentLevelInfo.level})
              </span>
              <p className="text-sm font-black text-white truncate">
                {currentLevelInfo.title}
              </p>
            </div>
          </div>

          {/* 2. Active EXP Boost */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase block">
                현재 경험치 부스트 적용
              </span>
              <p className="text-sm font-black text-emerald-300">
                +{currentLevelInfo.expBoostPercent}% 영구 보너스
              </p>
            </div>
          </div>

          {/* 3. Unlocked Progress */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase block">
                도감 달성률 ({unlockedCount}/50)
              </span>
              <p className="text-sm font-black text-indigo-300 font-mono">
                {Math.round((unlockedCount / 50) * 100)}% 완수 ({unlockedCount}개 해금)
              </p>
            </div>
          </div>

        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tier Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {(
              [
                { id: 'ALL', label: '전체 (50)' },
                { id: '스타터', label: '🌱 스타터 (1~10)' },
                { id: '챌린저', label: '🚀 챌린저 (11~20)' },
                { id: '엘리트', label: '💎 엘리트 (21~30)' },
                { id: '정복자', label: '⚔️ 정복자 (31~40)' },
                { id: '그랜드마스터', label: '👑 그랜드마스터 (41~50)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTier(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTier === tab.id
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="칭호 또는 레벨 검색..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-400 transition-colors"
            />
          </div>
        </div>

        {/* Scrollable Titles Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredTitles.map((item) => {
            const isUnlocked = item.level <= currentLevelInfo.level;
            const isCurrent = item.level === currentLevelInfo.level;
            const isNext = item.level === currentLevelInfo.level + 1;
            const requiredExp = getExpRequiredForLevel(item.level);

            return (
              <div
                key={item.level}
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-gradient-to-r from-amber-500/20 via-slate-800/90 to-slate-800/90 border-2 border-amber-400 shadow-lg shadow-amber-500/15'
                    : isUnlocked
                    ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    : isNext
                    ? 'bg-indigo-950/30 border-2 border-indigo-400/50 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 opacity-60'
                }`}
              >
                <div>
                  {/* Top Row: Level Pin, Emoji & Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xl shrink-0">
                        {item.badgeEmoji}
                      </span>
                      <div>
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                          Level {item.level} • {item.tierName}
                        </span>
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-slate-950 uppercase">
                              장착 중
                            </span>
                          )}
                        </h4>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {isUnlocked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          해금
                        </span>
                      ) : isNext ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 animate-pulse">
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          다음 목표
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-500" />
                          잠김
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Motto Quote */}
                  <p className="text-xs text-slate-300 italic mb-3">
                    "{item.motto}"
                  </p>
                </div>

                {/* Bottom Row: EXP Boost & Required EXP */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/30 font-black text-[11px] flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current text-amber-400" />
                      +{item.expBoostPercent}% EXP 부스트
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    {isUnlocked
                      ? '보너스 항시 활성화'
                      : `필요 경험치 ${requiredExp.toLocaleString()} EXP`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Dismiss Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">
            💡 단어 퀴즈, 음성 섀도잉, 일일 목표를 달성할 때마다 레벨업되어 더 강력한 경험치 부스트가 누적됩니다.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
