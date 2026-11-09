import React, { useState } from 'react';
import {
  Trophy,
  Sparkles,
  Zap,
  BookOpen,
  Headphones,
  Target,
  Flame,
  ChevronRight,
  ChevronDown,
  Info,
  ArrowUpRight,
  Shield,
  Award,
  Star,
  PartyPopper,
  GraduationCap,
} from 'lucide-react';
import { StudentLevelInfo, StudentExpBreakdown } from '../services/studentGamificationService';

export interface StudentLevelProgressBarProps {
  levelInfo: StudentLevelInfo;
  breakdown?: StudentExpBreakdown;
  onStartReviewQuiz?: () => void;
  onOpenQuickReview?: () => void;
  onOpenProfileModal?: () => void;
  onOpenTitlesModal?: () => void;
  onTriggerCelebration?: () => void;
  className?: string;
}

/**
 * StudentLevelProgressBar Component
 * Displays the student's current level (Lv.1 ~ Lv.50), teen title, and an intuitive,
 * highly animated progress bar indicating remaining EXP needed to unlock the next student level.
 */
export const StudentLevelProgressBar: React.FC<StudentLevelProgressBarProps> = ({
  levelInfo,
  breakdown,
  onStartReviewQuiz,
  onOpenQuickReview,
  onOpenProfileModal,
  onOpenTitlesModal,
  onTriggerCelebration,
  className = '',
}) => {
  const [showBreakdownDetails, setShowBreakdownDetails] = useState(false);

  const isMaxLevel = levelInfo.level >= 50;
  const isExpFull = levelInfo.progressPercent >= 100 || isMaxLevel;
  const remExp = isMaxLevel ? 0 : Math.max(0, levelInfo.expForNextLevel - levelInfo.currentExp);
  const currentLevelProgress = isMaxLevel
    ? levelInfo.currentExp - levelInfo.minExpForCurrentLevel
    : Math.max(0, levelInfo.currentExp - levelInfo.minExpForCurrentLevel);
  const expNeeded = isMaxLevel ? 1 : Math.max(1, levelInfo.expForNextLevel - levelInfo.minExpForCurrentLevel);
  const clampedPercent = Math.min(100, Math.max(isMaxLevel ? 100 : 3, levelInfo.progressPercent));

  return (
    <div
      className={`rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 text-white border ${
        isExpFull ? 'border-amber-400/60 shadow-amber-500/15' : 'border-slate-800'
      } shadow-xl relative overflow-hidden transition-all ${className}`}
    >
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/10 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Floating Sparkle Stars when EXP is full */}
      {isExpFull && (
        <>
          <div className="absolute top-3 right-16 text-amber-300 animate-sparkle-twinkle pointer-events-none">
            <Star className="w-4 h-4 fill-current" />
          </div>
          <div className="absolute bottom-4 left-1/3 text-amber-300 animate-sparkle-twinkle delay-500 pointer-events-none">
            <Sparkles className="w-4 h-4 fill-current" />
          </div>
        </>
      )}

      {/* Header Row: Level Badge, Title, Perk & EXP Summary */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        
        {/* Left: Avatar / Badge & Level Title */}
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700/80 border border-slate-700 flex items-center justify-center text-3xl shadow-lg shadow-black/40 relative overflow-hidden group">
              <span className="transform transition-transform group-hover:scale-110">
                {levelInfo.badgeEmoji}
              </span>
              {/* Subtle Animated Gold Ring for High Levels */}
              {levelInfo.level >= 20 && (
                <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-400/50 animate-pulse pointer-events-none" />
              )}
            </div>
            {/* Level Number Pin */}
            <span className="absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border border-amber-300 shadow-sm leading-none">
              Lv.{levelInfo.level}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Student Level {levelInfo.level}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {levelInfo.tierName ? `${levelInfo.tierName} 등급` : levelInfo.unlockedPerk}
              </span>
              {levelInfo.boostTitle && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-xs">
                  <Zap className="w-3 h-3 fill-current text-amber-400" />
                  {levelInfo.boostTitle}
                </span>
              )}
            </div>

            <h3 className="text-xl font-black text-white flex items-center gap-2 mt-0.5">
              <span>{levelInfo.title}</span>
              {isMaxLevel && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider shadow-sm">
                  MAX
                </span>
              )}
            </h3>

            <p className="text-xs text-slate-400 mt-0.5">
              단어 암기, 음성 반복 청취, 매일 목표를 달성하면 EXP가 쌓여 다음 칭호로 승급합니다.
            </p>
          </div>
        </div>

        {/* Right: EXP Numbers & Status Pill */}
        <div className="flex flex-col sm:items-end gap-1.5 shrink-0 self-start sm:self-auto">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-left sm:text-right backdrop-blur-sm">
            <span className="text-[10px] font-medium text-slate-400 block">
              현재 총 누적 경험치
            </span>
            <div className="flex items-baseline gap-1 sm:justify-end">
              <span className="text-lg font-black text-amber-300 font-mono">
                {levelInfo.currentExp.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-400">EXP</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`text-[11px] font-extrabold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                isMaxLevel
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isMaxLevel ? (
                <>
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>🏆 최고 레벨 도달! (MAX)</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                  <span>다음 레벨(Lv.{levelInfo.level + 1})까지 {remExp.toLocaleString()} EXP 필요</span>
                </>
              )}
            </span>
          </div>
        </div>

      </div>

      {/* Main Section: Intuitive Progress Bar */}
      <div className="relative z-10 my-5 space-y-2">
        {/* Progress Info Header Row */}
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>레벨 승급 진행률</span>
            </span>
            <span className="text-xs font-mono font-black text-amber-300 px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20">
              {levelInfo.progressPercent}%
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {isMaxLevel ? (
              <span className="text-amber-300 font-bold">그랜드 마스터 완성</span>
            ) : (
              <span>
                이번 구간 <strong className="text-white font-bold">{currentLevelProgress.toLocaleString()}</strong> / {expNeeded.toLocaleString()} EXP
              </span>
            )}
          </div>
        </div>

        {/* The Intuitive Large Progress Bar Container */}
        <div
          role="progressbar"
          aria-valuenow={levelInfo.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`현재 학생 레벨 Lv.${levelInfo.level} 진행률 ${levelInfo.progressPercent}%`}
          className="w-full h-6 sm:h-7 rounded-full bg-slate-950/80 p-1 border border-slate-700/80 relative shadow-inner overflow-hidden flex items-center"
        >
          {/* Milestone Step Ticks (25%, 50%, 75%) */}
          <div className="absolute inset-0 flex justify-between px-1 pointer-events-none z-10 opacity-30">
            <div className="w-px h-full bg-slate-600 ml-[25%]" />
            <div className="w-px h-full bg-slate-600 ml-[25%]" />
            <div className="w-px h-full bg-slate-600 ml-[25%]" />
          </div>

          {/* Animated Candy / Shimmer Progress Bar Fill */}
          <div
            className={`h-full rounded-full bg-gradient-to-r ${levelInfo.themeColor} relative transition-all duration-700 ease-out shadow-lg flex items-center justify-end overflow-hidden`}
            style={{ width: `${clampedPercent}%` }}
          >
            {/* Shimmer Light Reflection Sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-golden-shimmer pointer-events-none" />

            {/* Glowing Tip Indicator */}
            {clampedPercent > 6 && (
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md shadow-white/80 mr-1 shrink-0 animate-pulse" />
            )}
          </div>

          {/* Centered Overlay Percentage on Small Screens */}
          <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-black tracking-wide text-white drop-shadow-md pointer-events-none z-20">
            {levelInfo.progressPercent}% 달성
          </div>
        </div>

        {/* Milestone Boundary Markers (Bottom Labels) */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>Lv.{levelInfo.level} 기준 ({levelInfo.minExpForCurrentLevel.toLocaleString()} EXP)</span>
          </span>

          <span className="flex items-center gap-1 text-right">
            <span>
              {isMaxLevel
                ? '최종 마스터 (Lv.50 MAX)'
                : `Lv.${levelInfo.level + 1} 목표 (${levelInfo.expForNextLevel.toLocaleString()} EXP)`}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          </span>
        </div>

        {/* Celebratory Congratulatory Message Layer when EXP is 100% full or Max Level */}
        {isExpFull && (
          <aside
            aria-label="경험치 가득 참 축하 레이어"
            className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-indigo-500/20 border-2 border-amber-400/70 shadow-xl shadow-amber-500/20 backdrop-blur-md relative overflow-hidden animate-levelup-pop"
          >
            {/* Shimmering Gold Sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/10 to-transparent animate-golden-shimmer pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/30">
                    {isMaxLevel ? '👑' : '🎉'}
                  </div>
                  <span className="absolute -top-1 -right-1 text-amber-300 animate-sparkle-twinkle">
                    <Sparkles className="w-4 h-4 fill-current" />
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <PartyPopper className="w-3.5 h-3.5 text-amber-400" />
                      {isMaxLevel ? 'MAX LEVEL COMPLETED!' : 'EXP 100% FULL! LEVEL UP READY!'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-950 uppercase">
                      축하합니다!
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white mt-0.5">
                    {isMaxLevel
                      ? '🏆 워드루프 전설의 최고 레벨(Lv.50) 도달을 진심으로 축하합니다!'
                      : '🎉 경험치가 가득 찼습니다! 새로운 칭호와 레벨업 달성을 축하합니다!'}
                  </h4>
                  <p className="text-[11px] text-amber-100/90 mt-0.5">
                    {isMaxLevel
                      ? '모든 단어 마스터리와 최고의 스트릭을 완수한 그랜드 마스터의 영예입니다.'
                      : `성실한 노력의 결실로 Lv.${levelInfo.level} ${levelInfo.title} 단계에 성공적으로 올랐습니다.`}
                  </p>
                </div>
              </div>

              {onTriggerCelebration && (
                <button
                  type="button"
                  onClick={onTriggerCelebration}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto group"
                  title="팡파레 사운드와 축하 폭죽 세레머니 실행"
                >
                  <Sparkles className="w-4 h-4 text-slate-950 fill-current group-hover:rotate-12 transition-transform" />
                  <span>축하 세레머니 열기</span>
                </button>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* EXP Breakdown Toggle & Quick Actions */}
      <div className="relative z-10 pt-2 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Breakdown Toggle Button */}
          <button
            type="button"
            onClick={() => setShowBreakdownDetails((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer group"
          >
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>경험치(EXP) 획득원 상세 분석</span>
            {showBreakdownDetails ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform" />
            )}
          </button>

          {/* Quick Action Buttons to Gain EXP */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenQuickReview && (
              <button
                type="button"
                onClick={onOpenQuickReview}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="미암기 어휘 집중 복습으로 EXP 빠르게 획득"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                <span>Quick Review로 EXP 획득</span>
              </button>
            )}

            {onStartReviewQuiz && (
              <button
                type="button"
                onClick={onStartReviewQuiz}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="단어 퀴즈로 콤보 EXP 획득"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>복습 퀴즈 도전</span>
              </button>
            )}

            {onOpenProfileModal && (
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="학생 칭호 및 업적 배지 전체 확인"
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>업적 & 칭호 목록</span>
              </button>
            )}

            {onOpenTitlesModal && (
              <button
                type="button"
                onClick={onOpenTitlesModal}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="50가지 틴에이저 칭호 및 경험치 부스트 전체 목록 보기"
              >
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span>50대 칭호 도감</span>
              </button>
            )}

            {onTriggerCelebration && (
              <button
                type="button"
                onClick={onTriggerCelebration}
                className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="레벨업 축하 애니메이션과 팡파레 세레머니 실행"
              >
                <PartyPopper className="w-3.5 h-3.5 text-amber-400" />
                <span>축하 세레머니</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible EXP Source Breakdown Cards */}
        {showBreakdownDetails && breakdown && (
          <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-in fade-in duration-200">
            
            {/* 1. Vocab Mastery EXP */}
            <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold mb-1">
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">단어 마스터리</span>
              </div>
              <p className="text-base font-black text-white font-mono">
                +{breakdown.vocabExp.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">EXP</span>
              </p>
              <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                완전암기 {breakdown.masteredWords}단어 / 학습중 {breakdown.learningWords}단어
              </span>
            </div>

            {/* 2. Audio Repeats EXP */}
            <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold mb-1">
                <Headphones className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">음성 반복 청취</span>
              </div>
              <p className="text-base font-black text-white font-mono">
                +{breakdown.repeatsExp.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">EXP</span>
              </p>
              <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                총 {breakdown.totalRepeats.toLocaleString()}회 반복 (1회당 2 EXP)
              </span>
            </div>

            {/* 3. Goal Completion EXP */}
            <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold mb-1">
                <Target className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">일일 목표 달성</span>
              </div>
              <p className="text-base font-black text-white font-mono">
                +{breakdown.goalExp.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">EXP</span>
              </p>
              <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                완료 누적 {breakdown.completedGoalsCount}개 (1개당 50 EXP)
              </span>
            </div>

            {/* 4. Streak Days Bonus EXP */}
            <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
                <Flame className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">연속 학습 보너스</span>
              </div>
              <p className="text-base font-black text-white font-mono">
                +{breakdown.streakExp.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">EXP</span>
              </p>
              <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                {breakdown.streakDays}일차 연속 실천 보너스
              </span>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
