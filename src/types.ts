export interface VocabItem {
  id: string;
  word: string;
  ipa?: string;
  meaning: string;
  partOfSpeech: string;
  sentence: string;
  sentenceMeaning: string;
  categoryId: string;
  isCustom?: boolean;
  isLearned?: boolean;
  masteryLevel?: 0 | 1 | 2; // 0: 미암기, 1: 학습중, 2: 완벽암기
  isBookmarked?: boolean;
  tip?: string;
  repeatCount?: number;
}

export interface SentenceItem {
  id: string;
  text: string;
  meaning: string;
  context?: string;
  categoryId: string;
  isCustom?: boolean;
  isLearned?: boolean;
  masteryLevel?: 0 | 1 | 2; // 0: 미암기, 1: 학습중, 2: 완벽암기
  isBookmarked?: boolean;
  wordBreakdown?: { word: string; meaning: string }[];
  repeatCount?: number;
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
  description: string;
  color: string;
}

export type GoalCategory = 'english' | 'habit' | 'exercise' | 'reading' | 'custom';

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  targetCount: number;
  unit: string;
  currentCount: number;
  isCompleted: boolean;
  streak: number;
  lastCompletedDate?: string;
  iconName: string;
  description?: string;
  isAutoLinkedToEnglish?: boolean; // When true, practicing words/sentences in app auto increments this!
}

export interface DailyGoalHistory {
  date: string; // YYYY-MM-DD
  completedGoalsCount: number;
  totalGoalsCount: number;
  vocabStudyCount: number;
}

export interface AudioSettings {
  speed: number;       // Playback rate e.g., 0.5, 0.8, 1.0, 1.2
  pitch: number;       // Pitch 0.8 to 1.2
  voiceURI: string | null;
  repeatDelay: number; // Delay between loops in seconds (e.g. 1.0, 1.5, 2.0, 3.0)
  loopMode: boolean;   // Master continuous loop toggle
  maxRepeatCount: number; // Specified repeat count limit (0 = infinite/무한반복, 1, 2, 3, 5, 10)
  readKorean: boolean; // Option to read Korean meaning after English text
}

export interface WordMatch {
  word: string;
  matched: boolean;
}

export interface PronunciationResult {
  targetText: string;
  recognizedText: string;
  score: number;
  wordMatches: WordMatch[];
  feedback: string;
}

export type ActiveTab = 'vocab' | 'sentences' | 'goals' | 'ai-gen' | 'roleplay' | 'dictionary' | 'quiz' | 'game' | 'stats';

export interface RoleplayFeedback {
  rephrasedBetter?: string;
  grammarNotes?: string;
  pronunciationTips?: string;
}

export interface RoleplayMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  translationKo: string;
  timestamp: number;
  audioPlayed?: boolean;
  feedback?: RoleplayFeedback;
  completedMissionIds?: string[];
}

export interface RoleplayReport {
  scenarioId: string;
  scenarioTitle: string;
  overallScore: number;
  fluencyScore: number;
  accuracyScore: number;
  vocabularyScore: number;
  missionScore: number;
  feedbackSummary: string;
  strengths: string[];
  improvements: string[];
  highlightPhrases: Array<{ en: string; ko: string; tip?: string }>;
}

export type QAMode = 'ko_to_en' | 'en_def_to_en' | 'en_to_ko';

export type StudyGradeLevel = 'elementary' | 'middle' | 'high' | 'toeic' | 'general';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  grade: StudyGradeLevel;
  gradeLabel?: string;
  dailyWordGoal: number;
  motto: string;
  createdAt: string;
  isLocked: boolean; // 1인 전용 단일 사용자 잠금 플래그
  streakDays?: number; // 학습 연속 일수
  lastSavedToDeviceAt?: string; // 마지막 장치 저장 일시
  savedToDeviceCount?: number; // 장치 저장 횟수
}
