import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, StudyGradeLevel, VocabItem, SentenceItem, Goal, DailyGoalHistory } from '../types';
import { AVATAR_PRESETS, GRADE_LEVEL_OPTIONS, MOTTO_RECOMMENDATIONS, DEFAULT_USER_PROFILE } from '../data/defaultProfile';
import {
  User,
  Lock,
  Sparkles,
  CheckCircle2,
  Download,
  Upload,
  RotateCcw,
  X,
  Target,
  Trophy,
  BookOpen,
  Headphones,
  Save,
  ShieldCheck,
  Flame,
  GraduationCap,
  Calendar,
  AlertTriangle,
  Shuffle,
  HardDrive,
  Clock,
  Smartphone,
  Check,
  FileJson,
} from 'lucide-react';
import {
  StartupRandomConfig,
  RandomScope,
  getStartupRandomConfig,
  saveStartupRandomConfig
} from '../services/randomLaunchService';
import {
  getDeviceStorageStats,
  exportUserProfileToFile,
  importUserProfileFromFile,
  DeviceStorageStats,
  saveUserProfileToDevice,
} from '../services/deviceStorageService';

interface UserProfileModalProps {
  isOpen: boolean;
  isOnboarding?: boolean;
  userProfile: UserProfile | null;
  vocabList?: VocabItem[];
  sentenceList?: SentenceItem[];
  goals?: Goal[];
  history?: DailyGoalHistory[];
  totalRepeatsCount?: number;
  onSaveProfile: (profile: UserProfile) => void;
  onClose: () => void;
  onExportAllData?: () => void;
  onImportAllData?: (file: File) => void;
  onResetAllData?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  isOnboarding = false,
  userProfile,
  vocabList = [],
  sentenceList = [],
  goals = [],
  history = [],
  totalRepeatsCount = 0,
  onSaveProfile,
  onClose,
  onExportAllData,
  onImportAllData,
  onResetAllData,
}) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🎓');
  const [grade, setGrade] = useState<StudyGradeLevel>('high');
  const [dailyWordGoal, setDailyWordGoal] = useState<number>(20);
  const [motto, setMotto] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'device_storage' | 'backup'>('profile');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<DeviceStorageStats>(getDeviceStorageStats());
  
  const allDataFileInputRef = useRef<HTMLInputElement | null>(null);
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize form state from userProfile or default
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setAvatar(userProfile.avatar || '🎓');
      setGrade(userProfile.grade || 'high');
      setDailyWordGoal(userProfile.dailyWordGoal || 20);
      setMotto(userProfile.motto || '');
    } else {
      setName('');
      setAvatar('🎓');
      setGrade('high');
      setDailyWordGoal(20);
      setMotto(MOTTO_RECOMMENDATIONS[0]);
    }
    setStorageStats(getDeviceStorageStats());
  }, [userProfile, isOpen]);

  // Listen to device save events
  useEffect(() => {
    const handleDeviceSaved = () => {
      setStorageStats(getDeviceStorageStats());
    };
    window.addEventListener('wordloop_device_saved', handleDeviceSaved);
    return () => window.removeEventListener('wordloop_device_saved', handleDeviceSaved);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || '나의 학습자';
    const selectedGradeObj = GRADE_LEVEL_OPTIONS.find((g) => g.id === grade);

    const updatedProfile: UserProfile = {
      id: userProfile?.id || 'user-primary-owner',
      name: finalName,
      avatar,
      grade,
      gradeLabel: selectedGradeObj?.label || '고등/수능 (1,800단어)',
      dailyWordGoal,
      motto: motto.trim() || MOTTO_RECOMMENDATIONS[0],
      createdAt: userProfile?.createdAt || new Date().toISOString(),
      isLocked: true,
      lastSavedToDeviceAt: new Date().toISOString(),
      savedToDeviceCount: (userProfile?.savedToDeviceCount || 0) + 1,
    };

    onSaveProfile(updatedProfile);
    setSaveToast('사용자 정보가 장치에 안전하게 저장되었습니다!');
    setTimeout(() => {
      setSaveToast(null);
      onClose();
    }, 1200);
  };

  const handleProfileFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imported = await importUserProfileFromFile(file);
        onSaveProfile(imported);
        setName(imported.name);
        setAvatar(imported.avatar);
        setGrade(imported.grade);
        setDailyWordGoal(imported.dailyWordGoal);
        setMotto(imported.motto);
        setSaveToast('프로필 파일을 성공적으로 장치에 불러왔습니다!');
        setTimeout(() => setSaveToast(null), 2500);
      } catch (err: any) {
        alert(err.message || '프로필 파일 불러오기 실패');
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleAllDataFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportAllData) {
      onImportAllData(file);
    }
    if (e.target) e.target.value = '';
  };

  const formatKoreanDate = (isoString?: string | null) => {
    if (!isoString) return '아직 저장 이력 없음';
    try {
      const d = new Date(isoString);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    } catch {
      return isoString;
    }
  };

  const masteredWordsCount = vocabList.filter(
    (v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) === 2
  ).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl relative my-auto max-h-[94dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Save Toast Notification Banner */}
        {saveToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-600 text-white font-extrabold text-xs shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>{saveToast}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center text-2xl shadow-md shadow-emerald-500/20 shrink-0">
              {avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  {isOnboarding ? '나만의 전용 학습 프로필 등록' : '사용자 정보 & 장치 저장 관리'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <HardDrive className="w-2.5 h-2.5" />
                  장치 로컬 보관
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isOnboarding
                  ? 'WordLoop는 회원가입 없이 오직 본인 기기 1대에만 안전하게 저장됩니다.'
                  : '개인정보 외부 유출 없이 100% 본인 기기(로컬 스토리지)에 독립 저장됩니다.'}
              </p>
            </div>
          </div>

          {!isOnboarding && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab switch */}
        {!isOnboarding && (
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 mt-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>프로필 설정</span>
            </button>

            <button
              onClick={() => setActiveTab('device_storage')}
              className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'device_storage'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>장치 저장 상태</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>전체 백업/복원</span>
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="overflow-y-auto custom-scrollbar pr-1 mt-3 space-y-4 flex-1 min-h-0">
          
          {/* TAB 1: Profile Settings */}
          {activeTab === 'profile' && (
            <form id="profile-form" onSubmit={handleSubmit} className="space-y-4">
              
              {/* On-Device Storage Status Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="text-xs min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>장치 로컬 스토리지에 안전 저장됨</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-md">
                      {storageStats.totalFormattedSize}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    최근 장치 저장: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatKoreanDate(userProfile?.lastSavedToDeviceAt || storageStats.lastSavedAt)}</strong>
                  </p>
                </div>
              </div>

              {/* Stats Mini Bar (When editing existing profile) */}
              {!isOnboarding && userProfile && (
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">보유 단어</span>
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{vocabList.length}개</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">완벽 암기</span>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{masteredWordsCount}개</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">음성 반복 청취</span>
                    <p className="text-sm font-black text-amber-600 dark:text-amber-400">{totalRepeatsCount}회</p>
                  </div>
                </div>
              )}

              {/* 1. Name Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                  사용자 이름 / 닉네임 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 홍길동, WordMaster, 열공러"
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 2. Avatar Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                  프로필 아바타 선택
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.emoji}
                      type="button"
                      onClick={() => setAvatar(preset.emoji)}
                      className={`p-2 sm:p-2.5 rounded-2xl text-xl flex items-center justify-center transition-all border cursor-pointer ${
                        avatar === preset.emoji
                          ? 'bg-emerald-500/20 border-emerald-500 shadow-md scale-105'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                      title={preset.label}
                    >
                      {preset.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Grade Level Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                  주 학습 목표 단계
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GRADE_LEVEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setGrade(opt.id)}
                      className={`p-2.5 rounded-2xl text-left transition-all border flex items-start gap-2.5 cursor-pointer ${
                        grade === opt.id
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{opt.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold truncate">{opt.label}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Daily Word Goal */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    하루 목표 단어 수
                  </label>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {dailyWordGoal}개 / 일
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[10, 15, 20, 30, 50].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setDailyWordGoal(count)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                        dailyWordGoal === count
                          ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {count}개
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Motto / Resolution */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                  나의 학습 다짐 & 모토
                </label>
                <input
                  type="text"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  placeholder="예: 매일 꾸준히 20단어로 영단어 완전 정복!"
                  maxLength={50}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {MOTTO_RECOMMENDATIONS.slice(0, 3).map((rec, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMotto(rec)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors truncate max-w-full text-left cursor-pointer"
                    >
                      💡 {rec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Profile File Export/Import in Profile Tab */}
              {!isOnboarding && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (userProfile) {
                        exportUserProfileToFile({
                          ...userProfile,
                          name: name.trim() || userProfile.name,
                          avatar,
                          grade,
                          dailyWordGoal,
                          motto,
                        });
                      }
                    }}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>내 기기에 프로필 파일 저장 (.json)</span>
                  </button>

                  <input
                    type="file"
                    ref={profileFileInputRef}
                    onChange={handleProfileFileImport}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => profileFileInputRef.current?.click()}
                    className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>프로필 불러오기</span>
                  </button>
                </div>
              )}

            </form>
          )}

          {/* TAB 2: Device Storage Info & Health */}
          {activeTab === 'device_storage' && (
            <div className="space-y-4 py-1 animate-in fade-in duration-150">
              
              {/* Storage Overview Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-500/5 to-emerald-500/10 border border-indigo-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-indigo-500" />
                    <span>이 장치(기기) 로컬 저장소 상태</span>
                  </span>
                  <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-md font-mono">
                    {storageStats.totalFormattedSize} 사용 중
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-[10px] text-slate-400">저장된 사용자</span>
                    <p className="font-black text-slate-800 dark:text-slate-200 mt-0.5 truncate">{userProfile?.name || '나의 학습자'}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-[10px] text-slate-400">보유 단어/예문 DB</span>
                    <p className="font-black text-slate-800 dark:text-slate-200 mt-0.5">{vocabList.length}단어 / {sentenceList.length}문장</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400">장치 저장 횟수</span>
                    <p className="font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{userProfile?.savedToDeviceCount || 1}회 동기화</p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>마지막 장치 저장 일시: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatKoreanDate(userProfile?.lastSavedToDeviceAt || storageStats.lastSavedAt)}</strong></span>
                </div>
              </div>

              {/* On-Device Guarantee Points */}
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-slate-900 dark:text-white">갑작스런 앱/웹 종료 시 무손실 자동 보존 (Zero Data Loss)</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      브라우저 탭 닫기, 홈 버튼 이동, 화면 꺼짐, 배터리 방전 등 예기치 않은 종료 발생 시 <strong>beforeunload / pagehide / visibilitychange</strong> 생명주기 엔진이 단어/학습 진척도를 0.01초 내로 동기적 플러시 저장합니다.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-slate-900 dark:text-white">100% 완전한 온디바이스(On-Device) 로컬 보관</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      회원가입, 외부 클라우드 로그인 필요 없이 오직 사용자의 스마트폰/PC 로컬 스토리지에만 저장되어 개인정보가 완벽히 보호됩니다.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-slate-900 dark:text-white">오프라인에서도 중단 없는 학습</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      비행기 모드나 인터넷이 연결되지 않은 환경에서도 기기에 저장된 모든 단어장과 학습 기록을 열람할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Device Save Button */}
              <button
                type="button"
                onClick={() => {
                  if (userProfile) {
                    const res = saveUserProfileToDevice(userProfile);
                    onSaveProfile(res.profile);
                    setStorageStats(getDeviceStorageStats());
                    setSaveToast('장치 로컬 저장소에 최신 상태가 저장되었습니다!');
                    setTimeout(() => setSaveToast(null), 2500);
                  }
                }}
                className="w-full py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>지금 즉시 장치(기기)에 전체 상태 동기화 저장</span>
              </button>

            </div>
          )}

          {/* TAB 3: Backup & Restore View */}
          {activeTab === 'backup' && (
            <div className="space-y-4 py-1 animate-in fade-in duration-150">
              
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-xs sm:text-sm">
                  <Download className="w-4 h-4" />
                  <span>1인 전용 전체 데이터 백업 파일 다운로드 (JSON)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  등록한 단어장, 예문, 자기계발 목표, 일일 학습 이력, 프로필 설정을 안전한 단일 JSON 파일로 기기 다운로드 폴더에 저장합니다. 기기 변경 시 즉시 복원할 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={onExportAllData}
                  className="mt-3 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>내 학습 데이터 전체 백업 파일 다운로드</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-black text-xs sm:text-sm">
                  <Upload className="w-4 h-4" />
                  <span>백업 파일에서 데이터 복원</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  이전에 저장해 둔 WordLoop 백업 JSON 파일을 불러와 내 단어장과 학습 기록을 원상 복구합니다.
                </p>
                <input
                  type="file"
                  ref={allDataFileInputRef}
                  onChange={handleAllDataFileChange}
                  accept=".json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => allDataFileInputRef.current?.click()}
                  className="mt-3 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>JSON 백업 파일 선택 및 복원하기</span>
                </button>
              </div>

              {/* Data Reset Section */}
              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-black text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>학습 데이터 및 프로필 초기화</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  새로운 마음으로 처음부터 다시 시작하고 싶을 때 사용합니다. 초기화 시 기본 데이터로 재설정됩니다.
                </p>
                {showResetConfirm ? (
                  <div className="mt-3 p-3 rounded-xl bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700 space-y-2">
                    <p className="text-xs font-black text-rose-800 dark:text-rose-200">
                      정말 모든 학습 데이터와 프로필을 초기화하시겠습니까?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onResetAllData) onResetAllData();
                          setShowResetConfirm(false);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer"
                      >
                        네, 초기화합니다
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="mt-3 px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-black transition-colors cursor-pointer"
                  >
                    데이터 초기화 옵션 열기
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>장치 단독 샌드박스 보관 (100% On-Device)</span>
          </div>

          <div className="flex items-center gap-2">
            {!isOnboarding && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-extrabold transition-colors cursor-pointer"
              >
                닫기
              </button>
            )}
            <button
              type="submit"
              form="profile-form"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isOnboarding ? '프로필 등록 및 장치 저장' : '장치에 프로필 저장하기'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
