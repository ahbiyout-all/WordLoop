import { UserProfile } from '../types';
import { DEFAULT_USER_PROFILE } from '../data/defaultProfile';
import { saveUserProfileToDevice, safeJsonParse, STORAGE_KEYS } from './deviceStorageService';

export interface UserBadge {
  id: string;
  name: string;
  title: string;
  category: 'pronunciation' | 'streak' | 'mastery' | 'special';
  description: string;
  requirementText: string;
  icon: string;
  tier: 'gold' | 'platinum' | 'diamond';
  unlockedAt?: string;
  score?: number;
}

export const PRONUNCIATION_MASTER_BADGE: UserBadge = {
  id: 'pronunciation_master',
  name: '발음 마스터',
  title: '발음 마스터 (Pronunciation Master)',
  category: 'pronunciation',
  description: 'PronunciationModal의 쉐도잉 퀴즈(Shadowing Quiz) 모드에서 90% 이상의 원어민급 발음 정확도를 달성하여 수여된 최고 명예 배지입니다.',
  requirementText: '쉐도잉 퀴즈 모드에서 정확도 90% 이상 달성',
  icon: '🎙️',
  tier: 'gold',
};

/**
 * Check if the user has already unlocked the Pronunciation Master badge
 */
export function getPronunciationMasterBadgeStatus(userProfile?: UserProfile | null): {
  isUnlocked: boolean;
  unlockedAt?: string;
  score?: number;
} {
  // Check from provided profile first
  if (userProfile) {
    const isUnlocked = Boolean(
      userProfile.hasPronunciationMasterBadge ||
      userProfile.badges?.includes('pronunciation_master')
    );
    if (isUnlocked) {
      return {
        isUnlocked: true,
        unlockedAt: userProfile.pronunciationMasterUnlockedAt,
        score: userProfile.pronunciationMasterScore,
      };
    }
  }

  // Fallback check from localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (raw) {
        const parsed: UserProfile = safeJsonParse(raw);
        if (parsed) {
          const isUnlocked = Boolean(
            parsed.hasPronunciationMasterBadge ||
            parsed.badges?.includes('pronunciation_master')
          );
          if (isUnlocked) {
            return {
              isUnlocked: true,
              unlockedAt: parsed.pronunciationMasterUnlockedAt,
              score: parsed.pronunciationMasterScore,
            };
          }
        }
      }
    } catch {}
  }

  return { isUnlocked: false };
}

/**
 * Unlock Pronunciation Master badge when shadowing quiz score reaches 90% or higher
 */
export function unlockPronunciationMasterBadge(score: number): {
  isNewUnlock: boolean;
  profile: UserProfile;
  badge: UserBadge;
} {
  const now = new Date().toISOString();
  let currentProfile: UserProfile = DEFAULT_USER_PROFILE;

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (raw) {
        const parsed = safeJsonParse<UserProfile>(raw);
        if (parsed && typeof parsed === 'object') {
          currentProfile = parsed;
        }
      }
    } catch {}
  }

  const alreadyHad = Boolean(
    currentProfile.hasPronunciationMasterBadge ||
    currentProfile.badges?.includes('pronunciation_master')
  );

  const existingBadges = currentProfile.badges || [];
  const updatedBadges = existingBadges.includes('pronunciation_master')
    ? existingBadges
    : [...existingBadges, 'pronunciation_master'];

  const updatedProfile: UserProfile = {
    ...currentProfile,
    hasPronunciationMasterBadge: true,
    pronunciationMasterUnlockedAt: currentProfile.pronunciationMasterUnlockedAt || now,
    pronunciationMasterScore: Math.max(score, currentProfile.pronunciationMasterScore || 0),
    badges: updatedBadges,
    lastSavedToDeviceAt: now,
  };

  // Persist updated profile to localStorage
  saveUserProfileToDevice(updatedProfile);

  const badgeWithDetails: UserBadge = {
    ...PRONUNCIATION_MASTER_BADGE,
    unlockedAt: updatedProfile.pronunciationMasterUnlockedAt,
    score: updatedProfile.pronunciationMasterScore,
  };

  // Dispatch global badge unlocked event for real-time reactivity in UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('wordloop_badge_unlocked', {
        detail: {
          badgeId: 'pronunciation_master',
          badge: badgeWithDetails,
          score,
          isNewUnlock: !alreadyHad,
          profile: updatedProfile,
        },
      })
    );
  }

  return {
    isNewUnlock: !alreadyHad,
    profile: updatedProfile,
    badge: badgeWithDetails,
  };
}
