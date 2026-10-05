import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Eye,
  EyeOff,
  Bookmark,
  Filter,
  RotateCcw,
  X,
  Sparkles,
  Download,
  Upload,
  FileText,
  CheckCircle2,
  Settings,
  SlidersHorizontal,
  Check,
  BookOpen,
  GraduationCap,
  Shuffle,
  Volume2,
  Mic,
  Lightbulb,
  Zap,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Gauge,
  Clock,
  Music,
  Globe
} from 'lucide-react';
import { VocabItem, SentenceItem, Category, UserProfile, AudioSettings } from '../types';
import { DEFAULT_CATEGORIES } from '../data/defaultVocab';
import { VocabCard } from './VocabCard';
import { SentenceCard } from './SentenceCard';
import { CurriculumExplorerModal } from './CurriculumExplorerModal';
import { speechService } from '../services/speechService';
import { formatEduSentenceMeaning } from '../utils/meaningUtils';
import {
  StartupRandomConfig,
  RandomScope,
  getStartupRandomConfig,
  saveStartupRandomConfig,
} from '../services/randomLaunchService';

interface VocabListProps {
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  activeLoopItemId: string | null;
  isPlaying: boolean;
  repeatCount: number;
  userProfile?: UserProfile | null;
  onToggleBookmarkVocab: (id: string) => void;
  onToggleBookmarkSentence: (id: string) => void;
  onChangeMasteryVocab?: (id: string, level: 0 | 1 | 2) => void;
  onChangeMasterySentence?: (id: string, level: 0 | 1 | 2) => void;
  onExportData?: (format: 'json' | 'csv') => void;
  onImportData?: (file: File) => void;
  onAddCustomVocab: (item: Omit<VocabItem, 'id'>) => void;
  onAddBatchVocab?: (items: VocabItem[]) => void;
  onAddCustomSentence: (item: Omit<SentenceItem, 'id'>) => void;
  onOpenPronunciationModal: (text: string) => void;
  onOpenAIExplain?: (text: string) => void;
  initialSubTab?: 'words' | 'sentences';
  initialOpenCurriculum?: boolean;
  onTriggerRandomLaunch?: (scope?: RandomScope) => void;
  onSwitchToLauncherMode?: () => void;
}

export const VocabList: React.FC<VocabListProps> = React.memo(({
  vocabList,
  sentenceList,
  activeLoopItemId,
  isPlaying,
  repeatCount,
  userProfile,
  onToggleBookmarkVocab,
  onToggleBookmarkSentence,
  onChangeMasteryVocab,
  onChangeMasterySentence,
  onExportData,
  onImportData,
  onAddCustomVocab,
  onAddBatchVocab,
  onAddCustomSentence,
  onOpenPronunciationModal,
  onOpenAIExplain,
  initialSubTab,
  initialOpenCurriculum,
  onTriggerRandomLaunch,
  onSwitchToLauncherMode,
}) => {
  const [subTab, setSubTab] = useState<'words' | 'sentences'>(initialSubTab || 'words');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [masteryFilter, setMasteryFilter] = useState<'all' | 0 | 1 | 2>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hideMeanings, setHideMeanings] = useState<boolean>(false);
  const [onlyBookmarks, setOnlyBookmarks] = useState<boolean>(false);
  const [showEduTag, setShowEduTag] = useState<boolean>(() => {
    return localStorage.getItem('wordloop_show_edu_tag') === 'true'; // Default: false (기본은 off)
  });
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showOptionModal, setShowOptionModal] = useState<boolean>(false);
  const [showCurriculumModal, setShowCurriculumModal] = useState<boolean>(Boolean(initialOpenCurriculum));
  // Active Inline Waveform Comparison Card ID (단어 or 문장 카드 인라인 파형 펼침 관리)
  const [expandedWaveformCardId, setExpandedWaveformCardId] = useState<string | null>(null);

  // Startup Random Launch Settings State
  const [startupRandomConfig, setStartupRandomConfig] = useState<StartupRandomConfig>(() =>
    getStartupRandomConfig()
  );

  const handleUpdateStartupConfig = (updates: Partial<StartupRandomConfig>) => {
    const updated = { ...startupRandomConfig, ...updates };
    setStartupRandomConfig(updated);
    saveStartupRandomConfig(updated);
  };

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (initialOpenCurriculum) {
      setShowCurriculumModal(true);
    }
  }, [initialOpenCurriculum]);

  const handleToggleShowEduTag = (val: boolean) => {
    setShowEduTag(val);
    localStorage.setItem('wordloop_show_edu_tag', String(val));
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // New Custom Word Form State
  const [newWord, setNewWord] = useState('');
  const [newIpa, setNewIpa] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newPos, setNewPos] = useState('n.');
  const [newSentence, setNewSentence] = useState('');
  const [newSentenceMeaning, setNewSentenceMeaning] = useState('');
  const [newCategory, setNewCategory] = useState('elementary');

  // Progressive rendering / Chunking limit for 3000+ items
  const [displayLimit, setDisplayLimit] = useState<number>(40);

  // Reset limit whenever filter conditions change to keep tab switching & search instant
  useEffect(() => {
    setDisplayLimit(40);
  }, [subTab, selectedCategory, masteryFilter, searchQuery, onlyBookmarks]);

  // Starting Alphabet (A-Z) & Sequential/Random Delivery Order State
  const [selectedAlphabet, setSelectedAlphabet] = useState<string>('ALL');
  const [isAlphabetFilterOpen, setIsAlphabetFilterOpen] = useState<boolean>(false);
  const [optionModalTab, setOptionModalTab] = useState<'display' | 'audio' | 'startup' | 'backup'>('display');
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(speechService.getSettings());
  const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTestingSpeech, setIsTestingSpeech] = useState<boolean>(false);

  useEffect(() => {
    const unsub = speechService.subscribe((state) => {
      setAudioSettings(state.settings);
    });
    setSpeechVoices(speechService.getVoices());
    return () => unsub();
  }, []);

  const handleSpeedChange = (speed: number) => {
    speechService.setSpeed(speed);
  };

  const handlePitchChange = (pitch: number) => {
    speechService.updateSettings({ pitch });
  };

  const handleDelayChange = (repeatDelay: number) => {
    speechService.updateSettings({ repeatDelay });
  };

  const handleMaxRepeatChange = (maxRepeatCount: number) => {
    speechService.updateSettings({ maxRepeatCount });
  };

  const handleReadKoreanToggle = (readKorean: boolean) => {
    speechService.updateSettings({ readKorean });
  };

  const handleVoiceChange = (voiceURI: string) => {
    speechService.updateSettings({ voiceURI });
  };

  const handleTestPlay = () => {
    setIsTestingSpeech(true);
    speechService.speakWithCallbacks('WordLoop. Continuous learning makes mastery.', {
      rate: audioSettings.speed,
      onEnd: () => {
        if (audioSettings.readKorean) {
          speechService.speakWithCallbacks('단어 연속 학습으로 완전 정복!', {
            rate: audioSettings.speed,
            lang: 'ko-KR',
            onEnd: () => setIsTestingSpeech(false),
            onError: () => setIsTestingSpeech(false),
          });
        } else {
          setIsTestingSpeech(false);
        }
      },
      onError: () => setIsTestingSpeech(false),
    });
  };

  const [wordSortMode, setWordSortMode] = useState<'sequential' | 'random'>('sequential');
  const [wordRandomSeed, setWordRandomSeed] = useState<number>(0);
  const [sentenceSortMode, setSentenceSortMode] = useState<'sequential' | 'random'>('sequential');
  const [sentenceRandomSeed, setSentenceRandomSeed] = useState<number>(0);
  const [featuredRandomSentence, setFeaturedRandomSentence] = useState<SentenceItem | null>(null);

  // Filter logic for words memoized for high performance with alphabet and sort mode support
  const filteredVocab = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = vocabList.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesBookmark = !onlyBookmarks || item.isBookmarked;
      const itemLevel = item.masteryLevel ?? (item.isLearned ? 2 : 0);
      const matchesMastery = masteryFilter === 'all' || itemLevel === masteryFilter;
      
      const firstChar = item.word.trim().charAt(0).toUpperCase();
      const matchesAlphabet = selectedAlphabet === 'ALL' || firstChar === selectedAlphabet;

      const matchesSearch =
        !q ||
        item.word.toLowerCase().includes(q) ||
        item.meaning.includes(q) ||
        item.sentence.toLowerCase().includes(q);
      return matchesCategory && matchesBookmark && matchesMastery && matchesAlphabet && matchesSearch;
    });

    if (wordSortMode === 'sequential') {
      return [...list].sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }));
    } else {
      return [...list].sort(() => 0.5 - Math.random());
    }
  }, [vocabList, selectedCategory, onlyBookmarks, masteryFilter, selectedAlphabet, searchQuery, wordSortMode, wordRandomSeed]);

  // Filter logic for sentences memoized for high performance with alphabet and sort mode support
  const filteredSentences = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = sentenceList.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesBookmark = !onlyBookmarks || item.isBookmarked;
      const itemLevel = item.masteryLevel ?? (item.isLearned ? 2 : 0);
      const matchesMastery = masteryFilter === 'all' || itemLevel === masteryFilter;

      const firstChar = item.text.trim().charAt(0).toUpperCase();
      const matchesAlphabet = selectedAlphabet === 'ALL' || firstChar === selectedAlphabet;

      const matchesSearch =
        !q ||
        item.text.toLowerCase().includes(q) ||
        item.meaning.includes(q);
      return matchesCategory && matchesBookmark && matchesMastery && matchesAlphabet && matchesSearch;
    });

    if (sentenceSortMode === 'sequential') {
      return [...list].sort((a, b) => a.text.localeCompare(b.text, 'en', { sensitivity: 'base' }));
    } else {
      return [...list].sort(() => 0.5 - Math.random());
    }
  }, [sentenceList, selectedCategory, onlyBookmarks, masteryFilter, selectedAlphabet, searchQuery, sentenceSortMode, sentenceRandomSeed]);

  // Initialize and pick featured random sentence
  useEffect(() => {
    if (sentenceList.length > 0 && !featuredRandomSentence) {
      const initialPool = filteredSentences.length > 0 ? filteredSentences : sentenceList;
      const idx = Math.floor(Math.random() * initialPool.length);
      setFeaturedRandomSentence(initialPool[idx] || sentenceList[0]);
    }
  }, [sentenceList, filteredSentences, featuredRandomSentence]);

  const handlePickNewRandomSentence = () => {
    const pool = filteredSentences.length > 0 ? filteredSentences : sentenceList;
    if (pool.length === 0) return;
    const currentId = featuredRandomSentence?.id;
    const candidates = pool.filter((s) => s.id !== currentId);
    const chosen = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : pool[0];
    setFeaturedRandomSentence(chosen);
  };

  const handleAlphabetClick = (letter: string) => {
    speechService.speakOnce(letter);
    setSelectedAlphabet(letter);
  };

  const handleReshuffleCurrentTab = () => {
    if (subTab === 'words') {
      setWordRandomSeed((prev) => prev + 1);
    } else {
      setSentenceRandomSeed((prev) => prev + 1);
    }
  };

  // Sliced arrays for current display limit
  const visibleVocab = useMemo(() => filteredVocab.slice(0, displayLimit), [filteredVocab, displayLimit]);
  const visibleSentences = useMemo(() => filteredSentences.slice(0, displayLimit), [filteredSentences, displayLimit]);

  const observerRef = useRef<HTMLDivElement | null>(null);

  // Infinite scroll listener for fast smooth loading
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayLimit((prev) => prev + 50);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [subTab, filteredVocab.length, filteredSentences.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportData) {
      onImportData(file);
      e.target.value = '';
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord || !newMeaning) return;

    if (subTab === 'words') {
      onAddCustomVocab({
        word: newWord,
        ipa: newIpa || undefined,
        meaning: newMeaning,
        partOfSpeech: newPos,
        sentence: newSentence || `${newWord} is very useful in everyday life.`,
        sentenceMeaning: newSentenceMeaning || `${newMeaning}은(는) 일상생활에서 매우 유용합니다.`,
        categoryId: newCategory,
        isCustom: true,
      });
    } else {
      onAddCustomSentence({
        text: newWord,
        meaning: newMeaning,
        context: '사용자 직접 추가',
        categoryId: newCategory,
        isCustom: true,
      });
    }

    // Reset
    setNewWord('');
    setNewIpa('');
    setNewMeaning('');
    setNewSentence('');
    setNewSentenceMeaning('');
    setShowAddModal(false);
  };

  return (
    <div className="space-[#121212] space-y-6">
      
      {/* Top Banner Explaining User Profile & Continuous Loop Feature */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center shrink-0 shadow-md text-xl">
            {userProfile?.avatar || '🎧'}
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{userProfile ? `${userProfile.name}님의 1인 전용 단어장` : '무한 반복 청취 학습 모드'}</span>
              {userProfile ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/30">
                  {userProfile.gradeLabel || '1인 전용'}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold">CORE</span>
              )}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {userProfile?.motto ? `"${userProfile.motto}" (탭 시 무한 반복 음성 재생)` : '원하는 단어나 문장을 탭하면 다른 카드를 탭하기 전까지 동일한 음성이 계속해서 자동 반복 재생됩니다.'}
            </p>
          </div>
        </div>
      </div>

      {/* Sub Tab Switcher & Action Tools */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Sub Tabs: Words vs Sentences */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              onClick={() => setSubTab('words')}
              className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                subTab === 'words'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              🔤 단어 암기장 ({vocabList.length})
            </button>
            <button
              onClick={() => setSubTab('sentences')}
              className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                subTab === 'sentences'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              💬 문장 쉐도잉장 ({sentenceList.length})
            </button>
          </div>

          {onSwitchToLauncherMode && (
            <button
              onClick={onSwitchToLauncherMode}
              className="px-3 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="대형 아이콘 런처 메인 화면으로 돌아가기"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" />
              <span>대형 런처 홈</span>
            </button>
          )}
        </div>

        {/* Right Tools: Options Popup & Add Button */}
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2">
          
          {/* Hidden File Input for Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,.csv"
            className="hidden"
          />

          {/* 2026 초중고 교과서 필수 단어장 보물창고 버튼 */}
          <button
            onClick={() => setShowCurriculumModal(true)}
            className="px-2 py-2.5 sm:px-3.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer text-center"
            title="교육부 공식 3,000 어휘 DB 검색 & 초·중·고 교과서 필수 단어 탐색"
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
            <span className="hidden sm:inline">교육부 공식 3,000 어휘 DB</span>
            <span className="sm:hidden whitespace-nowrap">3,000 DB</span>
          </button>

          {/* Combined Option Modal Trigger Button */}
          <button
            onClick={() => setShowOptionModal(true)}
            className="px-2 py-2.5 sm:px-3.5 sm:py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer text-center relative"
            title="학습 옵션, 암기 필터, 백업 및 복원"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
            <span className="hidden sm:inline">학습 옵션 & 도구</span>
            <span className="sm:hidden whitespace-nowrap">학습 옵션</span>
            {(hideMeanings || onlyBookmarks || showEduTag || masteryFilter !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          {/* Add Custom Word/Sentence Modal Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-2 py-2.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer text-center"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">나만의 {subTab === 'words' ? '단어' : '문장'} 추가</span>
            <span className="sm:hidden whitespace-nowrap">직접 추가</span>
          </button>

        </div>
      </div>

      {/* Category Filter Chips & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={subTab === 'words' ? '단어, 뜻, 문장 검색...' : '문장 또는 뜻 검색...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              전체 주제
            </button>

            {DEFAULT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

      {/* Starting Alphabet A~Z & Sequential/Random Problem Delivery Bar (Collapsible / 접이식) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
        {/* Compact Header Bar */}
        <div className="p-2.5 flex flex-wrap items-center justify-between gap-2">
          {/* Left: Collapsible Toggle & Active Indicator */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAlphabetFilterOpen((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group cursor-pointer"
              title={isAlphabetFilterOpen ? '시작 알파벳 필터 접기' : '시작 알파벳 필터 펼치기'}
            >
              <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>🔤 시작 알파벳 (A-Z)</span>
              <span className="p-0.5 text-slate-400 group-hover:text-indigo-500 transition-colors">
                {isAlphabetFilterOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </span>
            </button>

            {/* Active Alphabet Badge */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsAlphabetFilterOpen((prev) => !prev)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  selectedAlphabet === 'ALL'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    : 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                }`}
                title={isAlphabetFilterOpen ? '클릭하여 필터 접기' : '클릭하여 알파벳 선택하기'}
              >
                <span>{selectedAlphabet === 'ALL' ? '전체 A~Z' : `${selectedAlphabet} 로 시작`}</span>
                <span className="text-[10px] opacity-85">
                  ({subTab === 'words' ? filteredVocab.length : filteredSentences.length})
                </span>
              </button>

              {selectedAlphabet !== 'ALL' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAlphabetClick('ALL');
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                  title="알파벳 필터 해제 (전체 보기)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Sequential vs Random Delivery Order Switch & Toggle Button */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  if (subTab === 'words') setWordSortMode('sequential');
                  else setSentenceSortMode('sequential');
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  (subTab === 'words' ? wordSortMode : sentenceSortMode) === 'sequential'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="A-Z 및 등록 순서대로 순차 출력"
              >
                <span>🔄 순차 방식</span>
              </button>
              <button
                onClick={() => {
                  if (subTab === 'words') setWordSortMode('random');
                  else setSentenceSortMode('random');
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  (subTab === 'words' ? wordSortMode : sentenceSortMode) === 'random'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="무작위 랜덤 섞기"
              >
                <span>🎲 랜덤 방식</span>
              </button>
              {(subTab === 'words' ? wordSortMode : sentenceSortMode) === 'random' && (
                <button
                  onClick={handleReshuffleCurrentTab}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950 transition-colors flex items-center gap-1"
                  title="무작위로 다시 섞기"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">다시 섞기</span>
                </button>
              )}
            </div>

            {/* Quick Expand / Collapse Pill */}
            <button
              onClick={() => setIsAlphabetFilterOpen((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                isAlphabetFilterOpen
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={isAlphabetFilterOpen ? '필터 목록 닫기' : 'A-Z 필터 목록 펼치기'}
            >
              <span>{isAlphabetFilterOpen ? '접기' : 'A~Z 선택'}</span>
              {isAlphabetFilterOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible A~Z Chips Drawer */}
        {isAlphabetFilterOpen && (
          <div className="px-2.5 pb-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => handleAlphabetClick('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all shrink-0 ${
                  selectedAlphabet === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                전체(ALL)
              </button>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => {
                const isSelected = selectedAlphabet === letter;
                const count = subTab === 'words'
                  ? vocabList.filter((v) => v.word.trim().charAt(0).toUpperCase() === letter).length
                  : sentenceList.filter((s) => s.text.trim().charAt(0).toUpperCase() === letter).length;

                return (
                  <button
                    key={letter}
                    onClick={() => handleAlphabetClick(letter)}
                    disabled={count === 0}
                    className={`min-w-[28px] py-1 px-1.5 rounded-lg text-xs font-black transition-all shrink-0 flex items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400'
                        : count > 0
                        ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-slate-200 dark:border-slate-700'
                        : 'bg-slate-100/50 dark:bg-slate-900/30 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40 border border-transparent'
                    }`}
                    title={`${letter}로 시작 (${count}개)`}
                  >
                    <span>{letter}</span>
                    {count > 0 && <span className="text-[8px] opacity-75 font-normal">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Grid List of Cards */}
      {subTab === 'words' ? (
        filteredVocab.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 mx-auto flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                '{selectedCategory === 'all' ? '전체 주제' : DEFAULT_CATEGORIES.find((c) => c.id === selectedCategory)?.name}' 카테고리에 조건에 맞는 단어가 없습니다.
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {searchQuery || onlyBookmarks || masteryFilter !== 'all'
                  ? '적용 중인 필터(검색어/북마크/암기 상태)를 해제하거나 교과서 어휘 보물창고에서 단어를 바로 가져오세요.'
                  : '교과서 보물창고 버튼을 눌러 2026 초·중·고 필수 단어를 단어장에 바로 추가해보세요.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowCurriculumModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <BookOpen className="w-4 h-4 text-amber-300" />
                2026 교과서 어휘 보물창고 열기
              </button>
              {(selectedCategory !== 'all' || searchQuery || onlyBookmarks || masteryFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                    setOnlyBookmarks(false);
                    setMasteryFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all"
                >
                  모든 필터 초기화
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                직접 단어 추가
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleVocab.map((item) => (
                <VocabCard
                  key={item.id}
                  item={item}
                  isCurrentlyLooping={activeLoopItemId === item.id}
                  isPlaying={isPlaying}
                  repeatCount={repeatCount}
                  hideMeaning={hideMeanings}
                  showEduTag={showEduTag}
                  onToggleBookmark={onToggleBookmarkVocab}
                  onChangeMastery={onChangeMasteryVocab}
                  onOpenPronunciationModal={onOpenPronunciationModal}
                  onOpenAIExplain={onOpenAIExplain}
                  isWaveformExpanded={expandedWaveformCardId === item.id}
                  onToggleWaveform={() =>
                    setExpandedWaveformCardId((prev) => (prev === item.id ? null : item.id))
                  }
                />
              ))}
            </div>

            {/* Progressive Load More Controls for Words */}
            {visibleVocab.length < filteredVocab.length && (
              <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
                <div className="text-slate-600 dark:text-slate-400 font-medium">
                  ⚡ 초고속 화면 표시 중: <strong className="text-emerald-500 font-bold">{visibleVocab.length}개</strong> / 전체 <strong className="text-slate-900 dark:text-white font-bold">{filteredVocab.length}개</strong> 단어 (스크롤 시 자동 로드)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 50)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-sm transition-all"
                  >
                    +50개 더 보기
                  </button>
                  <button
                    onClick={() => setDisplayLimit(filteredVocab.length)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all"
                  >
                    전체 펼치기 ({filteredVocab.length})
                  </button>
                </div>
              </div>
            )}
            <div ref={observerRef} className="h-4 w-full" />
          </>
        )
      ) : (
        filteredSentences.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 mx-auto flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                '{selectedCategory === 'all' ? '전체 주제' : DEFAULT_CATEGORIES.find((c) => c.id === selectedCategory)?.name}' 카테고리에 조건에 맞는 문장이 없습니다.
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                필터를 초기화하거나 아래 버튼을 클릭하여 회화 및 쉐도잉용 문장을 새로 등록해보세요.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {(selectedCategory !== 'all' || searchQuery || onlyBookmarks || masteryFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                    setOnlyBookmarks(false);
                    setMasteryFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all"
                >
                  모든 필터 초기화
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                직접 문장 추가
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 🎲 오늘의 실전 랜덤 예문 추천 카드 */}
            {featuredRandomSentence && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-indigo-500/5 to-teal-500/10 border-2 border-amber-500/30 dark:border-amber-500/40 shadow-lg relative overflow-hidden transition-all">
                {/* Top Bar of Lucky Card */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm">
                      <Shuffle className="w-3.5 h-3.5" />
                      🎲 실전 랜덤 예문 추천
                    </span>
                    {featuredRandomSentence.context && (
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        {featuredRandomSentence.context}
                      </span>
                    )}
                  </div>

                  {/* Draw new random sentence button */}
                  <button
                    onClick={handlePickNewRandomSentence}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                    title="500+ 예문 풀에서 다른 랜덤 예문을 새로 뽑습니다"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>다른 랜덤 예문 뽑기</span>
                  </button>
                </div>

                {/* English Sentence */}
                <div className="mb-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-relaxed">
                    "{featuredRandomSentence.text}"
                  </h3>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatEduSentenceMeaning(featuredRandomSentence.meaning, showEduTag)}
                  </p>
                </div>

                {/* Word Breakdown if available */}
                {featuredRandomSentence.wordBreakdown && featuredRandomSentence.wordBreakdown.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap my-3 pt-2 border-t border-amber-500/20">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      핵심 단어:
                    </span>
                    {featuredRandomSentence.wordBreakdown.map((wb, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        <strong>{wb.word}</strong>: {wb.meaning}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Action Bar for the Lucky Sentence */}
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  <button
                    onClick={() => speechService.speakOnce(featuredRandomSentence.text)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all hover:opacity-90 active:scale-95"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>원어민 음성 듣기</span>
                  </button>

                  <button
                    onClick={() => speechService.playItem(featuredRandomSentence.id, featuredRandomSentence.text, featuredRandomSentence.meaning)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                      activeLoopItemId === featuredRandomSentence.id
                        ? 'bg-emerald-500 text-slate-950 animate-pulse'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>무한 반복 청취</span>
                  </button>

                  <button
                    onClick={() => onOpenPronunciationModal(featuredRandomSentence.text)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>발음 쉐도잉 테스트</span>
                  </button>

                  {onOpenAIExplain && (
                    <button
                      onClick={() => onOpenAIExplain(featuredRandomSentence.text)}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>AI 문맥 상세 해설</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {visibleSentences.map((item) => (
                <SentenceCard
                  key={item.id}
                  item={item}
                  isCurrentlyLooping={activeLoopItemId === item.id}
                  isPlaying={isPlaying}
                  repeatCount={repeatCount}
                  hideMeaning={hideMeanings}
                  showEduTag={showEduTag}
                  onToggleBookmark={onToggleBookmarkSentence}
                  onChangeMastery={onChangeMasterySentence}
                  onOpenPronunciationModal={onOpenPronunciationModal}
                  onOpenAIExplain={onOpenAIExplain}
                  isWaveformExpanded={expandedWaveformCardId === item.id}
                  onToggleWaveform={() =>
                    setExpandedWaveformCardId((prev) => (prev === item.id ? null : item.id))
                  }
                />
              ))}
            </div>

            {/* Progressive Load More Controls for Sentences */}
            {visibleSentences.length < filteredSentences.length && (
              <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
                <div className="text-slate-600 dark:text-slate-400 font-medium">
                  ⚡ 초고속 화면 표시 중: <strong className="text-emerald-500 font-bold">{visibleSentences.length}개</strong> / 전체 <strong className="text-slate-900 dark:text-white font-bold">{filteredSentences.length}개</strong> 문장 (스크롤 시 자동 로드)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 50)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-sm transition-all"
                  >
                    +50개 더 보기
                  </button>
                  <button
                    onClick={() => setDisplayLimit(filteredSentences.length)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all"
                  >
                    전체 펼치기 ({filteredSentences.length})
                  </button>
                </div>
              </div>
            )}
            <div ref={observerRef} className="h-4 w-full" />
          </>
        )
      )}

      {/* Add Custom Word/Sentence Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                나만의 {subTab === 'words' ? '영어 단어' : '영어 문장'} 직접 추가
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {subTab === 'words' ? '영어 단어 / 표현' : '영어 문장'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={subTab === 'words' ? '예: Perseverance' : '예: Make each day your masterpiece.'}
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {subTab === 'words' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      IPA 발음기호
                    </label>
                    <input
                      type="text"
                      placeholder="/pɜːrsəˈvɪrəns/"
                      value={newIpa}
                      onChange={(e) => setNewIpa(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      품사
                    </label>
                    <select
                      value={newPos}
                      onChange={(e) => setNewPos(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="n.">n. (명사)</option>
                      <option value="v.">v. (동사)</option>
                      <option value="adj.">adj. (형용사)</option>
                      <option value="adv.">adv. (부사)</option>
                      <option value="phr.">phr. (구/관용구)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  한국어 뜻 / 번역 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 인내, 끈기"
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {subTab === 'words' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      영어 예문 (선택)
                    </label>
                    <input
                      type="text"
                      placeholder="예: Success requires hard work and perseverance."
                      value={newSentence}
                      onChange={(e) => setNewSentence(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      예문 한국어 번역
                    </label>
                    <input
                      type="text"
                      placeholder="예: 성공에는 열심히 일함과 끈기가 필요합니다."
                      value={newSentenceMeaning}
                      onChange={(e) => setNewSentenceMeaning(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  카테고리
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  추가하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Options & Tools Settings Modal */}
      {showOptionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 w-full max-w-lg shadow-2xl space-y-3 sm:space-y-4 animate-in fade-in zoom-in duration-150 max-h-[88dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 sm:pb-3 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                  <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-base text-slate-900 dark:text-white">학습 옵션 & 도구 설정</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">화면 표시, 암기 필터, 자동 실행 및 백업 관리</p>
                </div>
              </div>
              <button
                onClick={() => setShowOptionModal(false)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Segmented Top Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
              <button
                type="button"
                onClick={() => setOptionModalTab('display')}
                className={`py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                  optionModalTab === 'display'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">화면·필터</span>
                {(hideMeanings || onlyBookmarks || showEduTag || masteryFilter !== 'all') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setOptionModalTab('audio')}
                className={`py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                  optionModalTab === 'audio'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                <span className="whitespace-nowrap">발음·속도</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                  {audioSettings.speed}x
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOptionModalTab('startup')}
                className={`py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                  optionModalTab === 'startup'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">자동 실행</span>
                {startupRandomConfig.enabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setOptionModalTab('backup')}
                className={`py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                  optionModalTab === 'backup'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">백업·복원</span>
              </button>
            </div>

            {/* Scrollable Tab Content Container */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-3 space-y-3.5 sm:space-y-4">
              
              {/* TAB 1: 화면 & 암기 필터 설정 */}
              {optionModalTab === 'display' && (
                <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-150">
                  
                  {/* Subsection A: Screen & Active Recall Toggles */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] sm:text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
                      <span>자가 암기 및 표시 옵션</span>
                    </h4>

                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                      {/* Active Recall Hide Meaning */}
                      <button
                        type="button"
                        onClick={() => setHideMeanings(!hideMeanings)}
                        className={`p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          hideMeanings
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          {hideMeanings ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />}
                          <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                            hideMeanings ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {hideMeanings ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <span className="text-[11px] sm:text-xs font-extrabold truncate">뜻 가리기</span>
                        <span className="text-[9px] sm:text-[10px] opacity-75 mt-0.5 truncate">자가 테스트</span>
                      </button>

                      {/* (교육부 필수 어휘) 노출 설정 */}
                      <button
                        id="toggle-edu-tag-option-btn"
                        type="button"
                        onClick={() => handleToggleShowEduTag(!showEduTag)}
                        className={`p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          showEduTag
                            ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <GraduationCap className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showEduTag ? 'text-indigo-500' : 'text-slate-400'}`} />
                          <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                            showEduTag ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {showEduTag ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <span className="text-[11px] sm:text-xs font-extrabold truncate">교육부 태그</span>
                        <span className="text-[9px] sm:text-[10px] opacity-75 mt-0.5 truncate">필수 표시</span>
                      </button>

                      {/* Bookmark Filter */}
                      <button
                        type="button"
                        onClick={() => setOnlyBookmarks(!onlyBookmarks)}
                        className={`p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          onlyBookmarks
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${onlyBookmarks ? 'fill-current text-amber-500' : 'text-slate-400'}`} />
                          <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                            onlyBookmarks ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {onlyBookmarks ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <span className="text-[11px] sm:text-xs font-extrabold truncate">북마크 전용</span>
                        <span className="text-[9px] sm:text-[10px] opacity-75 mt-0.5 truncate">보관함만</span>
                      </button>
                    </div>
                  </div>

                  {/* Subsection B: Mastery Level Filter */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] sm:text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        암기 단계별 카드 필터
                      </h4>
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {subTab === 'words' ? filteredVocab.length : filteredSentences.length}개 표시 중
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setMasteryFilter('all')}
                        className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                          masteryFilter === 'all'
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <span>전체 보기</span>
                        {masteryFilter === 'all' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setMasteryFilter(0)}
                        className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                          masteryFilter === 0
                            ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100/50'
                        }`}
                      >
                        <span>🔴 0단계 (미암기)</span>
                        {masteryFilter === 0 && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setMasteryFilter(1)}
                        className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                          masteryFilter === 1
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                            : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100/50'
                        }`}
                      >
                        <span>🟡 1단계 (학습중)</span>
                        {masteryFilter === 1 && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setMasteryFilter(2)}
                        className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                          masteryFilter === 2
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm'
                            : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/50'
                        }`}
                      >
                        <span>🟢 2단계 (완벽암기)</span>
                        {masteryFilter === 2 && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: 기본 발음 속도 및 음성 옵션 설정 */}
              {optionModalTab === 'audio' && (
                <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-150">
                  
                  {/* Speed Master Card */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/5 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Gauge className="w-4 h-4 text-emerald-500" />
                          <span>기본 발음 속도 (Default Speed)</span>
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          단어·문장 학습, 퀴즈, 게임 전반에 일괄 적용되는 기본 재생 속도입니다.
                        </p>
                      </div>
                      <span className="text-xs font-black font-mono px-2 py-1 rounded-xl bg-emerald-500 text-slate-950 shadow-sm">
                        {audioSettings.speed.toFixed(2)}x
                      </span>
                    </div>

                    {/* Speed Slider & Steppers */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSpeedChange(Math.max(0.5, Math.round((audioSettings.speed - 0.05) * 100) / 100))}
                          className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center active:scale-95 transition-all shadow-xs cursor-pointer"
                          title="0.05x 감속"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.05"
                          value={audioSettings.speed}
                          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                          className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSpeedChange(Math.min(1.5, Math.round((audioSettings.speed + 0.05) * 100) / 100))}
                          className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center active:scale-95 transition-all shadow-xs cursor-pointer"
                          title="0.05x 가속"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                        <span>0.5x (초심자)</span>
                        <span>0.9x (기본추천)</span>
                        <span>1.0x (표준)</span>
                        <span>1.5x (배속)</span>
                      </div>
                    </div>

                    {/* Speed Presets */}
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 pt-1">
                      {[0.5, 0.7, 0.8, 0.9, 1.0, 1.25, 1.5].map((s) => {
                        const isSelected = Math.abs(audioSettings.speed - s) < 0.03;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleSpeedChange(s)}
                            className={`py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all border text-center cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50'
                            }`}
                          >
                            {s}x
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sound Test Button */}
                  <button
                    type="button"
                    onClick={handleTestPlay}
                    disabled={isTestingSpeech}
                    className={`w-full py-2.5 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm cursor-pointer ${
                      isTestingSpeech
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 animate-pulse'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      {isTestingSpeech ? '🔊 현재 속도로 발음 테스트 중...' : '▶ 설정된 속도로 예시 발음 즉시 들어보기'}
                    </span>
                  </button>

                  {/* Options Grid: Korean Meaning TTS & Pitch */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Read Korean Meaning */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                          <span>한글 뜻 자동 읽기</span>
                        </span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          audioSettings.readKorean ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {audioSettings.readKorean ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => handleReadKoreanToggle(true)}
                          className={`py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                            audioSettings.readKorean
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          한글 함께
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReadKoreanToggle(false)}
                          className={`py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                            !audioSettings.readKorean
                              ? 'bg-slate-700 text-white border-slate-600 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          영어만
                        </button>
                      </div>
                    </div>

                    {/* Pitch (Tone) */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Music className="w-3.5 h-3.5 text-indigo-500" />
                          <span>음성 높낮이 (Pitch)</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {audioSettings.pitch}x
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { value: 0.85, label: '차분하게' },
                          { value: 1.0, label: '기본' },
                          { value: 1.15, label: '경쾌하게' },
                        ].map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => handlePitchChange(p.value)}
                            className={`py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                              Math.abs(audioSettings.pitch - p.value) < 0.05
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Delay & Repeat Limits */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Repeat Delay */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>반복 재생 간격: {audioSettings.repeatDelay}초</span>
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {[0.5, 1.0, 1.5, 2.0].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => handleDelayChange(d)}
                            className={`py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                              audioSettings.repeatDelay === d
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {d}초
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Max Repeat Count */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                        <span>반복 횟수: {audioSettings.maxRepeatCount === 0 ? '무한 (∞)' : `${audioSettings.maxRepeatCount}회`}</span>
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { value: 1, label: '1회' },
                          { value: 3, label: '3회' },
                          { value: 5, label: '5회' },
                          { value: 0, label: '무한' },
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => handleMaxRepeatChange(item.value)}
                            className={`py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                              audioSettings.maxRepeatCount === item.value
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Voice Engine selection */}
                  {speechVoices.length > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-indigo-500" />
                        <span>영어 음성 엔진 (Voice Engine / Accent)</span>
                      </label>
                      <select
                        value={audioSettings.voiceURI || ''}
                        onChange={(e) => handleVoiceChange(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {speechVoices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Note */}
                  <div className="p-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      💡 상단 네비게이션 바의 <strong>[🔊 {audioSettings.speed}x]</strong> 버튼을 누르면 언제든지 학습 중 실시간으로 속도를 즉각 변경할 수 있습니다.
                    </p>
                  </div>

                </div>
              )}

              {/* TAB 3: 시작 시 랜덤 모드 자동 실행 */}
              {optionModalTab === 'startup' && (
                <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-150">
                  
                  {/* Hero Switch Card */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
                        <span>앱 시작 시 랜덤 모드 자동 실행</span>
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400">
                        접속 시마다 다른 학습·게임 모드가 무작위로 자동 실행됩니다.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateStartupConfig({ enabled: !startupRandomConfig.enabled })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        startupRandomConfig.enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={startupRandomConfig.enabled}
                      title="앱 시작 시 랜덤 모드 자동 실행 켜기/끄기"
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          startupRandomConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Scope Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] sm:text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                      🎯 랜덤 추첨 실행 범위 선택:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      {[
                        { id: 'all', label: '🎲 전체 모드 랜덤', desc: '모든 게임, 퀴즈, DB 탐색 (20종)' },
                        { id: 'games', label: '🎮 단어·문장 게임', desc: '타자, 슈팅, 매칭, 행맨 등 (13종)' },
                        { id: 'sentences', label: '💬 문장 전용 게임', desc: '문장 어순, 빈칸, 스피드 퀴즈 (5종)' },
                        { id: 'quiz', label: '🎴 퀴즈 & 플래시카드', desc: '4지선다, 플래시카드, 철자 (4종)' },
                        { id: 'daily', label: '🔮 일일 행운 & DB', desc: '오늘의 단어, 3,000 DB 탐색' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleUpdateStartupConfig({ scope: opt.id as RandomScope })}
                          className={`p-2.5 sm:p-3 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                            startupRandomConfig.scope === opt.id
                              ? 'bg-amber-500/10 text-slate-900 dark:text-white border-amber-500 ring-1 ring-amber-400 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] sm:text-xs font-extrabold">{opt.label}</span>
                            {startupRandomConfig.scope === opt.id && (
                              <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Instant Test Launch Button */}
                  {onTriggerRandomLaunch && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionModal(false);
                        onTriggerRandomLaunch(startupRandomConfig.enabled ? startupRandomConfig.scope : 'all');
                      }}
                      className="w-full py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-white shrink-0" />
                      <span>🎲 지금 바로 무작위 모드 1회 즉시 실행하기</span>
                    </button>
                  )}

                </div>
              )}

              {/* TAB 3: 데이터 백업 및 복원 */}
              {optionModalTab === 'backup' && (
                <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-150">
                  
                  <div className="space-y-0.5">
                    <h4 className="text-[11px] sm:text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      내 단어장 백업 및 파일 가져오기
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      작성한 단어, 문장, 암기 상태를 안전하게 파일로 보관하고 복원할 수 있습니다.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={() => { onExportData?.('csv'); setShowOptionModal(false); }}
                      className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:text-emerald-600 text-left transition-all group cursor-pointer flex flex-col justify-between"
                    >
                      <div className="p-1.5 sm:p-2 w-fit rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-1.5 sm:mb-2 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] sm:text-xs font-extrabold block truncate">CSV 백업</span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 block truncate">스프레드시트용</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { onExportData?.('json'); setShowOptionModal(false); }}
                      className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:text-indigo-600 text-left transition-all group cursor-pointer flex flex-col justify-between"
                    >
                      <div className="p-1.5 sm:p-2 w-fit rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-1.5 sm:mb-2 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] sm:text-xs font-extrabold block truncate">JSON 백업</span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 block truncate">완전 보관용</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { fileInputRef.current?.click(); setShowOptionModal(false); }}
                      className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:text-amber-600 text-left transition-all group cursor-pointer flex flex-col justify-between"
                    >
                      <div className="p-1.5 sm:p-2 w-fit rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-1.5 sm:mb-2 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                        <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] sm:text-xs font-extrabold block truncate">백업 복원</span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 block truncate">파일 불러오기</span>
                      </div>
                    </button>
                  </div>

                  {/* Persistence Note */}
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      💡 단어와 문장은 브라우저 로컬 저장소에 상시 자동 저장되며, CSV나 JSON 파일로 백업해두시면 다른 기기에서도 언제든 손쉽게 복원하여 학습을 이어갈 수 있습니다.
                    </p>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowOptionModal(false)}
                className="w-full py-2.5 sm:py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-98 cursor-pointer"
              >
                설정 완료
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2026 초중고 교과서 필수 어휘 탐색기 모달 */}
      <CurriculumExplorerModal
        isOpen={showCurriculumModal}
        onClose={() => setShowCurriculumModal(false)}
        onAddVocabItems={(newItems) => {
          if (onAddBatchVocab) {
            onAddBatchVocab(newItems);
          } else {
            newItems.forEach((item) => onAddCustomVocab(item));
          }
        }}
        existingVocabList={vocabList}
        showEduTag={showEduTag}
      />

    </div>
  );
});
