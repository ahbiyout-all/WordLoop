import React from 'react';
import { ActiveTab, UserProfile, VocabItem, SentenceItem, Goal, DailyGoalHistory } from '../types';
import { TodayHub } from './TodayHub';

interface MainLauncherDashboardProps {
  userProfile: UserProfile | null;
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  history?: DailyGoalHistory[];
  totalRepeatsCount: number;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenPronunciationModal: (text: string) => void;
  onOpenDailyQuest: () => void;
  onTriggerRandomLaunch: () => void;
  onOpenCurriculumModal: () => void;
  onSwitchToListMode: () => void;
  onOpenProfileModal?: () => void;
  onStartFocusRoutine?: () => void;
  onOpenJsonBackup?: () => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onOpenPetSanctuary?: () => void;
}

export const MainLauncherDashboard: React.FC<MainLauncherDashboardProps> = (props) => {
  return (
    <TodayHub
      {...props}
      onStartFocusRoutine={props.onStartFocusRoutine || props.onOpenDailyQuest}
    />
  );
};
