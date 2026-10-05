import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  CheckCircle2,
  Circle,
  Bell,
  Clock,
  Smartphone,
  Trophy,
  ArrowRight,
  Volume2,
  Gamepad2,
  BookOpen,
  Mic,
  Award,
  Zap,
  Check,
  X,
  Share2,
  HelpCircle,
} from 'lucide-react';
import { VocabItem, ActiveTab } from '../types';
import {
  DailyQuestProgress,
  getDailyQuestProgress,
  saveDailyQuestProgress,
  isQuestAllCompleted,
  getReminderSettings,
  saveReminderSettings,
  ReminderSettings,
  requestNotificationPermission,
  sendDailyWordNotification,
  getTodayDateString,
} from '../services/habitQuestService';
import { speechService } from '../services/speechService';

interface DailyQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabList: VocabItem[];
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenPronunciation?: (text: string) => void;
  onStartPronunciation?: () => void;
  onStartGame?: () => void;
  onTriggerRandomLaunch?: () => void;
  onOpenAddToHomeGuide?: () => void;
}

export const DailyQuestModal: React.FC<DailyQuestModalProps> = ({
  isOpen,
  onClose,
  vocabList,
  onNavigateTab,
  onOpenPronunciation,
  onStartPronunciation,
  onStartGame,
  onTriggerRandomLaunch,
  onOpenAddToHomeGuide,
}) => {
  const [quest, setQuest] = useState<DailyQuestProgress>(getDailyQuestProgress());
  const [reminders, setReminders] = useState<ReminderSettings>(getReminderSettings());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'quest' | 'reminder' | 'pwa'>('quest');

  // Determine Today's Featured Word (Deterministic by date)
  const todayWord = React.useMemo(() => {
    if (!vocabList || vocabList.length === 0) return null;
    const todayStr = getTodayDateString();
    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) {
      hash = (hash << 5) - hash + todayStr.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % vocabList.length;
    return vocabList[index];
  }, [vocabList]);

  useEffect(() => {
    if (isOpen) {
      setQuest(getDailyQuestProgress());
      setReminders(getReminderSettings());
    }
  }, [isOpen]);

  // Listen to quest updates
  useEffect(() => {
    const handleQuestUpdate = (e: any) => {
      if (e.detail) {
        setQuest(e.detail);
      }
    };
    window.addEventListener('wordloop_quest_updated', handleQuestUpdate);
    return () => window.removeEventListener('wordloop_quest_updated', handleQuestUpdate);
  }, []);

  const isCompletedAll = isQuestAllCompleted(quest);

  const handleClaimReward = () => {
    if (!isCompletedAll) return;
    const updated = { ...quest, isClaimed: true };
    setQuest(updated);
    saveDailyQuestProgress(updated);
    setShowConfetti(true);
    setToastMsg('🎉 축하합니다! 오늘의 3분 퀘스트 마스터 배지를 획득했습니다!');
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setToastMsg('⚠️ 브라우저 알림 권한이 필요합니다. 브라우저 설정에서 알림을 허용해주세요.');
        setTimeout(() => setToastMsg(null), 4000);
        return;
      }
    }
    const updated = { ...reminders, enabled };
    setReminders(updated);
    saveReminderSettings(updated);
    setToastMsg(enabled ? '🔔 매일 학습 리마인더 알림이 활성화되었습니다!' : '🔕 리마인더 알림이 해제되었습니다.');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSelectPreset = (preset: 'morning' | 'lunch' | 'night') => {
    const times = {
      morning: '08:30',
      lunch: '12:30',
      night: '22:30',
    };
    const updated = { ...reminders, preset, time: times[preset] };
    setReminders(updated);
    saveReminderSettings(updated);
  };

  const handleTestNotification = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      setToastMsg('⚠️ 브라우저 알림 권한을 먼저 허용해주세요.');
      setTimeout(() => setToastMsg(null), 3500);
      return;
    }
    const w = todayWord?.word || 'Consistency';
    const m = todayWord?.meaning || '꾸준함, 일관성';
    sendDailyWordNotification(w, m);
    setToastMsg('✨ 테스트 푸시 알림을 전송했습니다. 화면 상단/알림 센터를 확인해보세요!');
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSpeak = (text: string) => {
    speechService.speakOnce(text);
  };

  const handleTriggerPronunciation = (word: string) => {
    onClose();
    if (typeof onOpenPronunciation === 'function') {
      onOpenPronunciation(word);
    } else if (typeof onStartPronunciation === 'function') {
      onStartPronunciation();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[88vh] relative overflow-hidden">
        
        {/* Toast alert */}
        {toastMsg && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 px-4 py-2 rounded-2xl text-xs font-black shadow-xl border border-slate-700 dark:border-emerald-400 flex items-center gap-2 animate-bounce max-w-[90%] text-center">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400 dark:text-slate-950" />
            <span className="truncate">{toastMsg}</span>
          </div>
        )}

        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-indigo-500/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <Flame className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  매일 3분 습관 형성 루프 (Habit Loop)
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                  Zero-Friction
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                시간 낼 필요 없이 매일 3분(단어 3개 + 발음 1회 + 퀴즈 1판)으로 습관 완성
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3대 탭 내비게이션 */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 mx-3 sm:mx-5 mt-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
          <button
            onClick={() => setActiveTab('quest')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'quest'
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>오늘의 3분 퀘스트</span>
            {isCompletedAll && !quest.isClaimed && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('reminder')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'reminder'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>스마트 푸시 알림</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'pwa'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>홈화면 앱 설치 & 위젯</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4">
          
          {/* TAB 1: 오늘의 3분 퀘스트 */}
          {activeTab === 'quest' && (
            <div className="space-y-3.5">
              
              {/* 오늘의 1단어 플래시 위젯 카드 */}
              {todayWord && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                        TODAY'S WORD
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {todayWord.ipa || ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-mono text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {todayWord.word}
                      </h4>
                      <button
                        onClick={() => handleSpeak(todayWord.word)}
                        className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                        title="발음 듣기"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      {todayWord.meaning}
                    </p>
                  </div>

                  <button
                    onClick={() => handleTriggerPronunciation(todayWord.word)}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer self-stretch sm:self-auto"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>발음 대결 도전</span>
                  </button>
                </div>
              )}

              {/* 퀘스트 진행도 바 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>오늘의 미션 완료율</span>
                  </div>
                  <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                    {(quest.wordsExploredCount >= 3 ? 1 : 0) +
                      (quest.pronunciationCompleted ? 1 : 0) +
                      (quest.gameCompleted ? 1 : 0)}
                    {' '}/ 3 완료
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
                    style={{
                      width: `${
                        (((quest.wordsExploredCount >= 3 ? 1 : 0) +
                          (quest.pronunciationCompleted ? 1 : 0) +
                          (quest.gameCompleted ? 1 : 0)) /
                          3) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* 3단계 미션 리스트 */}
              <div className="space-y-2">
                {/* 미션 1: 단어 3개 탐색 */}
                <div
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    quest.wordsExploredCount >= 3
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/40 text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          1. 오늘의 추천 단어 3개 탐색
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          ({Math.min(quest.wordsExploredCount, 3)}/3)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        단어 카드를 넘겨보거나 발음을 들어보세요
                      </p>
                    </div>
                  </div>

                  {quest.wordsExploredCount >= 3 ? (
                    <span className="p-1.5 rounded-full bg-emerald-500 text-slate-950 font-black shrink-0">
                      <Check className="w-4 h-4" />
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('vocab');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold shrink-0 flex items-center gap-1"
                    >
                      <span>보러가기</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 미션 2: 발음 대결 1회 */}
                <div
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    quest.pronunciationCompleted
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/40 text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          2. AI 원어민 발음 대결 1회 녹음
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        마이크로 발음을 녹음하고 정확도 점수를 확인하세요
                      </p>
                    </div>
                  </div>

                  {quest.pronunciationCompleted ? (
                    <span className="p-1.5 rounded-full bg-emerald-500 text-slate-950 font-black shrink-0">
                      <Check className="w-4 h-4" />
                    </span>
                  ) : (
                    <button
                      onClick={() => handleTriggerPronunciation(todayWord?.word || 'opportunity')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold shrink-0 flex items-center gap-1"
                    >
                      <span>도전하기</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 미션 3: 1분 미니게임 / 퀴즈 1판 */}
                <div
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    quest.gameCompleted
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/40 text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                      <Gamepad2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          3. 1분 스피드 게임 또는 퀴즈 1판 완료
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        타자 연습, 슈팅 매칭, 퀴즈 카드 중 1판 클리어
                      </p>
                    </div>
                  </div>

                  {quest.gameCompleted ? (
                    <span className="p-1.5 rounded-full bg-emerald-500 text-slate-950 font-black shrink-0">
                      <Check className="w-4 h-4" />
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('game');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold shrink-0 flex items-center gap-1"
                    >
                      <span>게임하기</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 3종 완료 보상 수령 배너 */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-emerald-500/15 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {quest.isClaimed ? '오늘의 마스터 배지 획득 완료!' : '올클리어 보상: 데일리 마스터 배지'}
                    </h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {quest.isClaimed ? '내일 자정에 새로운 퀘스트가 열립니다.' : '3개 미션을 모두 마치고 배지를 수령하세요.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClaimReward}
                  disabled={!isCompletedAll || quest.isClaimed}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    quest.isClaimed
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default'
                      : isCompletedAll
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md animate-bounce'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {quest.isClaimed ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>수령완료</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>보상 수령</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: 스마트 푸시 알림 설정 */}
          {activeTab === 'reminder' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        일일 1단어 학습 리마인더
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        설정한 시간에 오늘의 단어 퀴즈 푸시 알림을 발송합니다.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminders.enabled}
                      onChange={(e) => handleToggleReminder(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {reminders.enabled && (
                  <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      추천 시간대 빠른 선택
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleSelectPreset('morning')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          reminders.preset === 'morning'
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs'
                        }`}
                      >
                        <div className="text-[11px]">🌅 출근/등교길</div>
                        <div className="text-xs font-black mt-0.5">08:30</div>
                      </button>

                      <button
                        onClick={() => handleSelectPreset('lunch')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          reminders.preset === 'lunch'
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs'
                        }`}
                      >
                        <div className="text-[11px]">🍱 점심 휴식</div>
                        <div className="text-xs font-black mt-0.5">12:30</div>
                      </button>

                      <button
                        onClick={() => handleSelectPreset('night')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          reminders.preset === 'night'
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs'
                        }`}
                      >
                        <div className="text-[11px]">🌙 취침 전 3분</div>
                        <div className="text-xs font-black mt-0.5">22:30</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 테스트 발송 버튼 */}
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    지금 바로 알림이 어떻게 뜨는지 확인해보세요
                  </span>
                </div>
                <button
                  onClick={handleTestNotification}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  알림 테스트
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: 홈 화면 PWA 설치 안내 & 위젯 */}
          {activeTab === 'pwa' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      스마트폰 홈 화면에 바로가기 추가 (PWA)
                    </h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      브라우저 창을 켤 필요 없이 네이티브 앱처럼 0.1초 만에 실행하세요.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div className="font-black text-slate-900 dark:text-white flex items-center gap-1">
                    <span>📲 설치 방법 안내</span>
                  </div>
                  <ul className="space-y-1.5 pl-1 text-[11px]">
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-emerald-500">1.</span>
                      <span><strong>Safari (iPhone):</strong> 하단 공유 아이콘( <Share2 className="w-3 h-3 inline" /> ) 클릭 후 <strong>'홈 화면에 추가'</strong></span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-emerald-500">2.</span>
                      <span><strong>Chrome (Android/PC):</strong> 우측 상단 더보기 메뉴(⋮) 클릭 후 <strong>'앱 설치'</strong> 또는 <strong>'홈 화면에 추가'</strong></span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-emerald-500">3.</span>
                      <span>홈 화면 아이콘을 터치하면 전체 화면 단독 앱으로 즉시 실행됩니다.</span>
                    </li>
                  </ul>

                  {onOpenAddToHomeGuide && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          onClose();
                          onOpenAddToHomeGuide();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>iOS / Android 상세 시각적 설치 가이드 열기</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            매일 자정에 퀘스트가 초기화됩니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 font-extrabold text-xs transition-all shadow-sm cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>

      </div>
    </div>
  );
};
