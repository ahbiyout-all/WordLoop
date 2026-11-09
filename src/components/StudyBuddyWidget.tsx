import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Volume2,
  RefreshCw,
  Heart,
  Bot,
  Flame,
  CheckCircle2,
  VolumeX,
  Zap,
  Smile,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile, VocabItem } from '../types';
import { speechService } from '../services/speechService';

export type MascotId = 'hoot' | 'luffy' | 'teddy' | 'bot';

export interface MascotInfo {
  id: MascotId;
  name: string;
  avatarEmoji: string;
  personalityTag: string;
  badgeColor: string;
  gradientBg: string;
  messages: {
    beginner: string;    // 0% ~ 25% mastery
    intermediate: string;// 26% ~ 50%
    advanced: string;    // 51% ~ 75%
    master: string;      // 76% ~ 100%
  };
}

export const STUDY_BUDDY_MASCOTS: MascotInfo[] = [
  {
    id: 'hoot',
    name: '픽셀 올빼미 교수',
    avatarEmoji: '🦉',
    personalityTag: '지적이고 똑똑한 멘토',
    badgeColor: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    gradientBg: 'from-indigo-500/15 via-purple-500/10 to-violet-500/15 border-indigo-400/40',
    messages: {
      beginner: '학습의 첫 단계를 축하하네! 뇌 신경망이 새로운 영어 어휘 패턴을 각인하고 있어 🧠',
      intermediate: '훌륭하군! 벌써 전체 어휘의 상당수를 마스터했어. 꾸준한 루프 청취가 열쇠라네 🔑',
      advanced: '대단한 집념이야! 고난도 발음과 쉐도잉 패턴이 매우 자연스러워지고 있네 ⚡',
      master: '완벽에 도달했네! 자네는 이제 WordLoop가 인정하는 정통 어휘 마스터라네 👑',
    },
  },
  {
    id: 'luffy',
    name: '쾌속 여우 루피',
    avatarEmoji: '🦊',
    personalityTag: '에너지 폭발 스피드 친구',
    badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
    gradientBg: 'from-amber-500/15 via-orange-500/10 to-rose-500/15 border-amber-400/40',
    messages: {
      beginner: '안녕! 같이 달리자구! 단어 몇 개만 더 정복하면 연속 콤보 불꽃이 터질 거야! 🔥',
      intermediate: '속도가 장난 아닌데?! 콤보 연타 치면서 스피드 퀴즈까지 싹 쓸어버리자 🎯',
      advanced: '파워 업! 마스터리 2단계 어휘가 대폭 폭발했어! 이 기세로 멈추지 마 🚀',
      master: '우와아아! 미쳤다! 단어장을 완전히 씹어먹었잖아?! 너 진짜 최고야! 🏆',
    },
  },
  {
    id: 'teddy',
    name: '따스한 곰도리',
    avatarEmoji: '🐻',
    personalityTag: '포근하고 든든한 조력자',
    badgeColor: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    gradientBg: 'from-emerald-500/15 via-teal-500/10 to-amber-500/15 border-emerald-400/40',
    messages: {
      beginner: '오늘도 와줘서 고마워! 천천히 하나씩 익히다 보면 어느새 크게 성장할 거야 🧸',
      intermediate: '차근차근 잘 해내고 있어! 무리하지 말고 내 조용한 응원과 함께 가보자 💚',
      advanced: '와, 발음도 너무 정성스럽고 예쁘다! 네 노력이 정말 빛을 발하고 있어 ✨',
      master: '정말 자랑스러워! 힘들어도 끝까지 해낸 네가 참 멋지다, 다정하게 다독여줄게 🌸',
    },
  },
  {
    id: 'bot',
    name: '하이테크 봇 3000',
    avatarEmoji: '🤖',
    personalityTag: '데이터 분석 가이드',
    badgeColor: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    gradientBg: 'from-cyan-500/15 via-blue-500/10 to-indigo-500/15 border-cyan-400/40',
    messages: {
      beginner: '데이터 수집 개시. 1단계 암기 궤도 진입 중. 시스템 효율성 양호 📊',
      intermediate: '마스터리 레벨 상승 감지. 복습 알고리즘 가동으로 망각 곡선 극복 완료 ⚡',
      advanced: '고득점 파형 분석 완료. 발음 일치율 88% 돌파. 쉐도잉 엔진 최고조 가동 중 ⚙️',
      master: '모든 데이터 매칭 100% 가동. 전 단어 마스터리 완료. 인공지능 보조 목표 완수 👑',
    },
  },
];

interface StudyBuddyWidgetProps {
  userProfile: UserProfile | null;
  vocabList?: VocabItem[];
  onToggleEnabled?: (enabled: boolean) => void;
  onSelectMascot?: (mascotId: MascotId) => void;
  className?: string;
  compactMode?: boolean;
}

export const StudyBuddyWidget: React.FC<StudyBuddyWidgetProps> = ({
  userProfile,
  vocabList = [],
  onToggleEnabled,
  onSelectMascot,
  className = '',
  compactMode = false,
}) => {
  const isEnabled = userProfile?.studyBuddyEnabled ?? true;
  const currentMascotId = userProfile?.studyBuddyMascot || 'hoot';

  const [mascotId, setMascotId] = useState<MascotId>(currentMascotId);
  const [randomSeed, setRandomSeed] = useState<number>(0);

  const selectedMascot = useMemo(() => {
    return STUDY_BUDDY_MASCOTS.find((m) => m.id === mascotId) || STUDY_BUDDY_MASCOTS[0];
  }, [mascotId]);

  // Compute overall vocabulary mastery percentage
  const masteryStats = useMemo(() => {
    const total = vocabList.length;
    if (total === 0) return { pct: 0, level: 'beginner' as const };

    const masteredCount = vocabList.filter(
      (v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) === 2
    ).length;

    const pct = Math.round((masteredCount / total) * 100);

    let level: 'beginner' | 'intermediate' | 'advanced' | 'master' = 'beginner';
    if (pct >= 76) level = 'master';
    else if (pct >= 51) level = 'advanced';
    else if (pct >= 26) level = 'intermediate';

    return { pct, level, masteredCount, total };
  }, [vocabList]);

  // Get current encouraging message
  const encouragingMessage = useMemo(() => {
    return selectedMascot.messages[masteryStats.level];
  }, [selectedMascot, masteryStats.level, randomSeed]);

  const handleMascotSelect = (id: MascotId) => {
    setMascotId(id);
    if (onSelectMascot) {
      onSelectMascot(id);
    }
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (onToggleEnabled) {
      onToggleEnabled(checked);
    }
  };

  const handleSpeakMessage = () => {
    speechService.speakOnce(encouragingMessage, 'ko-KR');
  };

  if (compactMode) {
    if (!isEnabled) return null;
    return (
      <div className={`p-4 rounded-3xl bg-gradient-to-r ${selectedMascot.gradientBg} border shadow-md backdrop-blur-md flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-white/40 dark:bg-slate-900/40 flex items-center justify-center text-3xl shadow-xs shrink-0 animate-bounce">
            {selectedMascot.avatarEmoji}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {selectedMascot.name}
              </span>
              <span className={`px-2 py-0.2 rounded-full text-[9px] font-black border ${selectedMascot.badgeColor}`}>
                {selectedMascot.personalityTag}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate mt-0.5">
              "{encouragingMessage}"
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSpeakMessage}
          className="p-2.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 hover:bg-white text-violet-600 dark:text-violet-300 transition-colors shrink-0 cursor-pointer shadow-xs"
          title="응원 메시지 음성 듣기"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 ${className}`}>
      {/* Header & Toggle Switch */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 text-white flex items-center justify-center text-xl shadow-md shrink-0">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                AI 학업 동반자 마스코트 (Study Buddy)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              어휘 마스터리 진척도에 따라 메인 화면에 맞춤형 격려 메시지를 선사합니다.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={handleToggle}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      {isEnabled && (
        <div className="space-y-4">
          {/* Mascot Selection Grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              나만의 AI 마스코트 파트너 선택:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {STUDY_BUDDY_MASCOTS.map((m) => {
                const isSelected = m.id === mascotId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMascotSelect(m.id)}
                    className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-amber-500/15 border-violet-400 ring-2 ring-violet-400/40 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{m.avatarEmoji}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-500 fill-current" />}
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white">{m.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{m.personalityTag}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Message Card Preview */}
          <div className={`p-4 rounded-3xl bg-gradient-to-r ${selectedMascot.gradientBg} border shadow-md space-y-3 relative overflow-hidden`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-slate-900/50 flex items-center justify-center text-2xl shadow-xs shrink-0">
                  {selectedMascot.avatarEmoji}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {selectedMascot.name}의 오늘의 격려 메시지
                    </span>
                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-black border ${selectedMascot.badgeColor}`}>
                      마스터리 {masteryStats.pct}% 달성 중
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    전체 어휘 {masteryStats.total}개 중 {masteryStats.masteredCount}개 암기 완료
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSpeakMessage}
                className="p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 hover:bg-white text-violet-600 dark:text-violet-300 transition-colors shrink-0 cursor-pointer shadow-xs flex items-center gap-1 text-xs font-bold"
                title="음성 들려주기"
              >
                <Volume2 className="w-4 h-4" />
                <span>듣기</span>
              </button>
            </div>

            {/* Bubble Message */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-white/60 dark:border-slate-800 shadow-xs text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
              "{encouragingMessage}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
