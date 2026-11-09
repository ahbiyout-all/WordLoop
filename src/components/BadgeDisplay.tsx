import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Sparkles,
  Flame,
  Headphones,
  BookOpen,
  Target,
  Mic,
  Zap,
  Crown,
  CheckCircle2,
  Lock,
  Star,
  Shield,
  Volume2,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { UserProfile, VocabItem, SentenceItem, Goal, DailyGoalHistory } from '../types';
import { confettiService } from '../services/confettiService';
import { triggerLevelUpBanner } from './ConfettiCanvas';
import { calculateStudentLevel } from '../services/studentGamificationService';
import { getDailyBestComboFromStorage } from './ComboStreakDisplay';

export interface AchievementBadgeItem {
  id: string;
  title: string;
  koreanTitle: string;
  category: 'pronunciation' | 'streak' | 'repeats' | 'vocab' | 'goals' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  icon: 'mic' | 'flame' | 'headphones' | 'book' | 'target' | 'zap' | 'crown' | 'family';
  badgeEmoji: string;
  description: string;
  unlockConditionText: string;
  currentProgress: number;
  targetProgress: number;
  unit: string;
  isUnlocked: boolean;
  progressPercent: number;
  unlockedAt?: string;
  perkTitle?: string;
}

interface BadgeDisplayProps {
  userProfile: UserProfile | null;
  vocabList?: VocabItem[];
  sentenceList?: SentenceItem[];
  goals?: Goal[];
  history?: DailyGoalHistory[];
  totalRepeatsCount?: number;
  onEquipBadgeTitle?: (title: string) => void;
  className?: string;
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  userProfile,
  vocabList = [],
  sentenceList = [],
  goals = [],
  history = [],
  totalRepeatsCount = 0,
  onEquipBadgeTitle,
  className = '',
}) => {
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadgeItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const levelInfo = useMemo(() => {
    return calculateStudentLevel({
      totalRepeatsCount,
      vocabList,
      goals,
      history,
      streakDays: userProfile?.streakDays || 1,
    });
  }, [totalRepeatsCount, vocabList, goals, history, userProfile]);

  const streakDays = userProfile?.streakDays || 1;
  const completedGoalsCount = goals.filter((g) => g.isCompleted).length;
  const hasParentPhotos = Boolean(userProfile?.momPhotoUrl && userProfile?.dadPhotoUrl);
  const isPronunciationMaster = Boolean(
    userProfile?.hasPronunciationMasterBadge || (userProfile?.pronunciationMasterScore || 0) >= 80
  );

  // Define badges with unique unlock conditions
  const badges: AchievementBadgeItem[] = useMemo(() => {
    const list: Omit<AchievementBadgeItem, 'progressPercent'>[] = [
      {
        id: 'badge-pron-master',
        title: 'Pronunciation Master',
        koreanTitle: '🎙️ 발음 마스터 배지',
        category: 'pronunciation',
        tier: 'gold',
        icon: 'mic',
        badgeEmoji: '🎙️',
        description: '원어민 표준 음성 파형과 80점 이상의 정밀 DTW 발음 일치도를 달성한 명예 배지입니다.',
        unlockConditionText: '발음 정밀 측정 80점 이상 달성',
        currentProgress: isPronunciationMaster ? 1 : 0,
        targetProgress: 1,
        unit: '회',
        isUnlocked: isPronunciationMaster,
        perkTitle: '발음 마스터 칭호 해금',
      },
      {
        id: 'badge-streak-7',
        title: 'Streak Champion',
        koreanTitle: '🔥 7일 연속 스트릭 챔피언',
        category: 'streak',
        tier: 'silver',
        icon: 'flame',
        badgeEmoji: '🔥',
        description: '하루도 빠짐없이 7일 연속으로 WordLoop 학습 루틴을 완벽하게 실행했습니다.',
        unlockConditionText: '연속 출석 7일 이상 달성',
        currentProgress: streakDays,
        targetProgress: 7,
        unit: '일',
        isUnlocked: streakDays >= 7,
        perkTitle: '불꽃 스파크 오라 해금',
      },
      {
        id: 'badge-repeats-100',
        title: '100 Repeats Looper',
        koreanTitle: '🎧 100회 무한 리스너',
        category: 'repeats',
        tier: 'bronze',
        icon: 'headphones',
        badgeEmoji: '🎧',
        description: '100회의 반복 청취로 장기 기억 저장소에 원어민 발음 사운드를 입각시켰습니다.',
        unlockConditionText: '총 100회 이상 반복 청취',
        currentProgress: totalRepeatsCount,
        targetProgress: 100,
        unit: '회',
        isUnlocked: totalRepeatsCount >= 100,
        perkTitle: '무한 루프 칭호 해금',
      },
      {
        id: 'badge-vocab-50',
        title: 'Vocab Collector',
        koreanTitle: '📚 50단어 어휘 수집가',
        category: 'vocab',
        tier: 'bronze',
        icon: 'book',
        badgeEmoji: '📚',
        description: '50개 이상의 영단어를 내 단어장에 등록하고 학습 궤도에 올렸습니다.',
        unlockConditionText: '단어장 50개 이상 보유',
        currentProgress: vocabList.length,
        targetProgress: 50,
        unit: '개',
        isUnlocked: vocabList.length >= 50,
        perkTitle: '어휘 수집가 배지',
      },
      {
        id: 'badge-goals-completed',
        title: 'Goal Finisher',
        koreanTitle: '🎯 일일 목표 달성왕',
        category: 'goals',
        tier: 'gold',
        icon: 'target',
        badgeEmoji: '🎯',
        description: '오늘의 자기계발 목표를 모두 달성하여 완벽한 하루를 만들어냈습니다.',
        unlockConditionText: '오늘의 목표 1개 이상 완수',
        currentProgress: completedGoalsCount,
        targetProgress: 1,
        unit: '개',
        isUnlocked: completedGoalsCount >= 1,
        perkTitle: '목표 완료 마스터',
      },
      {
        id: 'badge-family-connected',
        title: 'Family Supporter',
        koreanTitle: '👨‍👩‍👧 부모님 든든한 서포터',
        category: 'special',
        tier: 'silver',
        icon: 'family',
        badgeEmoji: '👨‍👩‍👧',
        description: '엄마·아빠 캐릭터 사진을 모두 등록하여 게임과 잔소리 팝업을 활성화했습니다.',
        unlockConditionText: '부모님 캐릭터 사진 등록',
        currentProgress: hasParentPhotos ? 2 : userProfile?.momPhotoUrl || userProfile?.dadPhotoUrl ? 1 : 0,
        targetProgress: 2,
        unit: '명',
        isUnlocked: hasParentPhotos,
        perkTitle: '가족 잔소리 패스 해금',
      },
      {
        id: 'badge-level-10',
        title: 'Teen Legend',
        koreanTitle: '👑 Lv.10 틴에이저 레전드',
        category: 'special',
        tier: 'diamond',
        icon: 'crown',
        badgeEmoji: '👑',
        description: '학생 경험치(EXP) 2,400점 돌파! 10레벨 상위 어휘 마스터에 등극했습니다.',
        unlockConditionText: '학생 레벨 10 이상 달성',
        currentProgress: levelInfo.level,
        targetProgress: 10,
        unit: 'Lv',
        isUnlocked: levelInfo.level >= 10,
        perkTitle: '전설의 왕관 에펙트',
      },
      {
        id: 'badge-combo-10',
        title: 'Combo King',
        koreanTitle: '⚡ 10연속 콤보 마스터',
        category: 'special',
        tier: 'gold',
        icon: 'zap',
        badgeEmoji: '⚡',
        description: '오답 없이 한 번에 10단어 이상 연속 정답을 기록하여 폭발적인 러닝 콤보를 달성했습니다.',
        unlockConditionText: '연속 정답 10 COMBO 달성',
        currentProgress: Math.min(10, getDailyBestComboFromStorage()),
        targetProgress: 10,
        unit: '콤보',
        isUnlocked: getDailyBestComboFromStorage() >= 10,
        perkTitle: '폭발 콤보 칭호 해금',
      },
    ];

    return list.map((b) => ({
      ...b,
      progressPercent: Math.min(100, Math.floor((b.currentProgress / b.targetProgress) * 100)),
    }));
  }, [
    isPronunciationMaster,
    streakDays,
    totalRepeatsCount,
    vocabList.length,
    completedGoalsCount,
    hasParentPhotos,
    levelInfo.level,
  ]);

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const filteredBadges = badges.filter((b) => {
    if (filter === 'unlocked') return b.isUnlocked;
    if (filter === 'locked') return !b.isUnlocked;
    return true;
  });

  const handleBadgeClick = (badge: AchievementBadgeItem) => {
    setSelectedBadge(badge);

    // Trigger visual particle effect & celebration banner if unlocked!
    if (badge.isUnlocked) {
      confettiService.fire({ particleCount: 45, spread: 70 });
      triggerLevelUpBanner({
        type: 'milestone',
        title: `${badge.koreanTitle}`,
        subtitle: badge.description,
        badgeEmoji: badge.badgeEmoji,
        unlockedTitle: badge.title,
        perkText: badge.perkTitle || badge.unlockConditionText,
        expGained: badge.targetProgress * 15,
      });
    }
  };

  const getTierColorClass = (tier: AchievementBadgeItem['tier'], isUnlocked: boolean) => {
    if (!isUnlocked) {
      return 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 opacity-60 grayscale';
    }
    switch (tier) {
      case 'diamond':
        return 'bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-indigo-500/15 border-cyan-400/50 dark:border-cyan-500/40 text-cyan-600 dark:text-cyan-300 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-500/20';
      case 'gold':
        return 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-orange-500/15 border-amber-400/50 dark:border-amber-500/40 text-amber-600 dark:text-amber-300 ring-2 ring-amber-400/30 shadow-md shadow-amber-500/20';
      case 'silver':
        return 'bg-gradient-to-br from-slate-200/50 via-slate-100 to-indigo-100/40 dark:from-slate-800/80 dark:via-slate-800 dark:to-indigo-950/40 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm';
      case 'bronze':
      default:
        return 'bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-rose-500/15 border-orange-400/50 dark:border-orange-500/40 text-orange-600 dark:text-orange-300 shadow-sm';
    }
  };

  const renderBadgeIcon = (icon: AchievementBadgeItem['icon']) => {
    switch (icon) {
      case 'mic':
        return <Mic className="w-6 h-6 stroke-[2.2]" />;
      case 'flame':
        return <Flame className="w-6 h-6 stroke-[2.2] fill-current" />;
      case 'headphones':
        return <Headphones className="w-6 h-6 stroke-[2.2]" />;
      case 'book':
        return <BookOpen className="w-6 h-6 stroke-[2.2]" />;
      case 'target':
        return <Target className="w-6 h-6 stroke-[2.2]" />;
      case 'zap':
        return <Zap className="w-6 h-6 stroke-[2.2] fill-current" />;
      case 'crown':
        return <Crown className="w-6 h-6 stroke-[2.2] fill-current" />;
      case 'family':
      default:
        return <UserCheck className="w-6 h-6 stroke-[2.2]" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Summary */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-amber-500/10 dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-amber-950/30 border border-violet-200/80 dark:border-violet-800/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-2xl shadow-md text-white shrink-0">
            🏆
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                명예 업적 배지 진열장
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                {unlockedCount} / {badges.length}개 해금
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              각 배지를 터치하면 고유 해금 조건 및 축하 파스텔 폭죽 연출이 발동합니다.
            </p>
          </div>
        </div>

        {/* Filter Segmented Control */}
        <div className="hidden sm:flex items-center gap-1 p-1 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            전체 ({badges.length})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              filter === 'unlocked'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            획득 ({unlockedCount})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              filter === 'locked'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            미획득 ({badges.length - unlockedCount})
          </button>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filteredBadges.map((badge) => {
          const cardStyle = getTierColorClass(badge.tier, badge.isUnlocked);
          const isSelected = selectedBadge?.id === badge.id;

          return (
            <div
              key={badge.id}
              onClick={() => handleBadgeClick(badge)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${cardStyle} ${
                isSelected ? 'scale-[1.03] ring-2 ring-amber-400' : 'hover:scale-[1.02]'
              }`}
            >
              {/* Badge Header: Emoji & Lock status */}
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm flex items-center justify-center text-xl shadow-xs shrink-0 group-hover:rotate-6 transition-transform">
                  {badge.badgeEmoji}
                </div>

                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    badge.isUnlocked
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {badge.isUnlocked ? '획득 완료' : '잠김'}
                </span>
              </div>

              {/* Badge Details */}
              <div className="mt-2.5 space-y-1">
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
                  {badge.koreanTitle}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  {badge.unlockConditionText}
                </p>
              </div>

              {/* Progress Bar Meter */}
              <div className="mt-2.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-500 dark:text-slate-400">
                    {badge.currentProgress} / {badge.targetProgress} {badge.unit}
                  </span>
                  <span className={badge.isUnlocked ? 'text-emerald-500' : 'text-slate-400'}>
                    {badge.progressPercent}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      badge.isUnlocked
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        : 'bg-slate-400/50'
                    }`}
                    style={{ width: `${badge.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
