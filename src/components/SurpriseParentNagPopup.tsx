import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Flame,
  Heart,
  Zap,
  Camera,
} from 'lucide-react';
import { speechService } from '../services/speechService';
import { UserProfile, NagTonePreset } from '../types';
import { DEFAULT_MOM_PHOTO, DEFAULT_DAD_PHOTO } from '../utils/parentPhotoUtils';
import { toneBgmSynthEngine } from '../utils/toneBgmSynthEngine';
import { Music, Music2 } from 'lucide-react';

export type SurpriseNagType = 'low_achievement' | 'high_achievement' | 'study_start' | 'study_complete' | 'study_delay' | 'continuous_study_break';

export interface SurpriseNagData {
  type: SurpriseNagType;
  character: 'mom' | 'dad' | 'both';
  speechText: string;
  theme: 'anger' | 'celebration' | 'healing';
}

interface SurpriseParentNagPopupProps {
  isOpen: boolean;
  type: SurpriseNagType;
  onClose: () => void;
  onStartStudy?: () => void;
  onStartBreak?: () => void;
  userProfile?: UserProfile | null;
  completedGoalsCount: number;
  totalGoalsCount: number;
  weakCount?: number;
  masteredCount?: number;
  todayStudiedCount?: number;
  streak?: number;
  forceCharacter?: 'mom' | 'dad' | 'both';
  onOpenPhotoSettings?: () => void;
}

export const SurpriseParentNagPopup: React.FC<SurpriseParentNagPopupProps> = ({
  isOpen,
  type,
  onClose,
  onStartStudy,
  onStartBreak,
  userProfile,
  completedGoalsCount,
  totalGoalsCount,
  weakCount = 15,
  masteredCount = 0,
  todayStudiedCount = 0,
  streak = 1,
  forceCharacter,
  onOpenPhotoSettings,
}) => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [activeSpeechIndex, setActiveSpeechIndex] = useState<number>(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<'mom' | 'dad'>('mom');
  const [currentTone, setCurrentTone] = useState<NagTonePreset>(
    type === 'continuous_study_break' ? 'affectionate' : (userProfile?.nagTone || 'tsundere')
  );
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sync with prop userProfile nagTone changes or continuous study break
  useEffect(() => {
    if (type === 'continuous_study_break') {
      setCurrentTone('affectionate');
    } else if (userProfile?.nagTone) {
      setCurrentTone(userProfile.nagTone);
    }
  }, [userProfile?.nagTone, type]);

  // BGM Mute State & Meta
  const [isBgmMuted, setIsBgmMuted] = useState<boolean>(() => toneBgmSynthEngine.getIsMuted());
  const [bgmMeta, setBgmMeta] = useState(() => toneBgmSynthEngine.getMeta(currentTone));

  // 60fps Real-Time Audio Waveform Frequency Spectrum State (Driven by Voice + BGM Spectrum)
  const [waveHeights, setWaveHeights] = useState<number[]>(() => Array(28).fill(15));
  const animFrameRef = useRef<number | null>(null);

  // Play Adaptive Tone BGM when popup opens or tone changes
  useEffect(() => {
    if (isOpen) {
      toneBgmSynthEngine.startToneBGM(currentTone);
      setBgmMeta(toneBgmSynthEngine.getMeta(currentTone));
    } else {
      toneBgmSynthEngine.stopToneBGM();
    }
    return () => {
      toneBgmSynthEngine.stopToneBGM();
    };
  }, [isOpen, currentTone]);

  // Real-time 60fps Audio Waveform Animation loop combining Tone BGM & Voice Speech
  useEffect(() => {
    if (isOpen) {
      let phase = 0;
      const animate = () => {
        phase += 0.18;
        const bgmBars = toneBgmSynthEngine.getSpectrumBars(28);

        const next = Array.from({ length: 28 }, (_, i) => {
          const bgmVal = bgmBars[i] || 12;
          if (isSpeaking) {
            const centerDist = Math.abs(i - 13.5) / 13.5;
            const bellCurve = Math.cos(centerDist * (Math.PI / 2.2));
            const wave = Math.sin(phase + i * 0.45) * 40;
            const noise = Math.random() * 40;
            const speechHeight = Math.max(12, Math.min(100, (wave + noise + 35) * bellCurve));
            // Blend Voice + Tone BGM
            return Math.round(Math.max(speechHeight, bgmVal * 0.75));
          } else {
            // Ambient rhythmic BGM visualization when voice pauses
            return Math.round(Math.max(12, bgmVal * 0.65));
          }
        });

        setWaveHeights(next);
        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      setWaveHeights(Array(28).fill(12));
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, isSpeaking]);

  // Comical Cartoon sound effects on entrance
  const playCartoonPopSound = (isHigh: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'continuous_study_break') {
        // Soft soothing gentle celesta chime for rest break
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (isHigh) {
        // High cheer fanfare
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        // Comical angry spring boing / descent
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.18);
        osc.frequency.linearRampToValueAtTime(380, now + 0.35);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {
      // Ignore audio context errors
    }
  };

  // Dynamic progress-infused voice text generator combining real-time user achievement stats & tone presets
  const userName = userProfile?.name || '학습자';
  const dailyGoal = userProfile?.dailyWordGoal || 20;
  const todayStudied = todayStudiedCount ?? 0;
  const mastered = masteredCount ?? 0;
  const weak = weakCount ?? 0;
  const completedGoals = completedGoalsCount ?? 0;
  const totalGoals = totalGoalsCount ?? 0;
  const streakDays = streak ?? 1;

  // Expanded Tone Preset Nag Dataset Source (Tsundere / Strict / Affectionate)
  const toneDataMap: Record<NagTonePreset, {
    momLow: string[];
    momHigh: string[];
    dadLow: string[];
    dadHigh: string[];
  }> = {
    tsundere: {
      momLow: [
        `어휴! ${userName}! 오늘 하루 목표가 ${dailyGoal}개인데, 오늘 벌써 ${todayStudied}개밖에 안 외운 거야?! 내가 안 볼 때 놀기만 하면 나중에 눈물 쏙 빠진다? 오늘은 조금 쉬어가는 날인가 본데, 얼른 단어장 열고 5개만 더 외워!`,
        `${userName}! 오늘 목표 ${totalGoals}개 중에 달랑 ${completedGoals}개 끝내고 핸드폰만 보고 있을 때야?! 오늘 벌써 ${todayStudied}개 공부했으면 10개 채우는 건 일도 아니잖아! 등짝 스매싱 맞기 전에 얼른 복습해!`,
        `너 취약 단어가 아직 ${weak}개나 수두룩하게 남아있어! 오늘 ${todayStudied}개 외우고 다 한 척할래? 옆집 순이는 벌써 수능 단어 다 뗐다더라! 당장 퀴즈 풀어!`,
        `${userName}! 너 무려 연속 ${streakDays}일 동안 잘 달려와놓고 오늘 손 놓고 있으면 어떡해! 냉장고 문 그만 열고 단어장이나 열어라!`,
        `공부는 엉덩이로 하는 거야! 오늘 설정한 하루 ${dailyGoal}개 채울 때까지 엉덩이 딱 붙이고 3분만 집중해!`,
      ],
      momHigh: [
        `어머 세상에! 우리 ${userName}! 오늘 벌써 ${todayStudied}개 단어를 싹 다 외웠구나! 별일이네! ...뭐, 잘했어. 오늘 저녁엔 네가 좋아하는 맛있는 간식 오다가 주웠으니까 먹든가!`,
        `우리 귀한 ${userName}! 오늘 목표 ${dailyGoal}개 올클리어 하고 ${todayStudied}개나 정복하다니! 오늘 등짝 스매싱은 특별히 완전 면제다! 맛있는 것 사줄 테니 착각하진 마!`,
        `어머머! ${userName}! 벌써 연속 ${streakDays}일째 단어장을 매일 열어서 공부하고 있잖아?! 내가 말 안 해도 알아서 하니까 조금 멋있긴 하네!`,
        `세상에! 취약 단어를 싹 정리해서 마스터 단어가 벌써 ${mastered}개나 되었네! 아주 최고야 최고!`,
      ],
      dadLow: [
        `인마! ${userName}! 아빠가 너만 할 땐 매일 ${dailyGoal}개씩 영어 사전을 통째로 씹어먹었어! 오늘 ${todayStudied}개 외우고 만족할 셈이냐?! 오늘은 조금 쉬어가는 날인가 본데, 당장 단어장 열어!`,
        `허허, ${userName}! 오늘 자기계발 목표 ${totalGoals}개 중에 ${completedGoals}개만 끝내다니... 끈기가 있어야 큰 사람이 되는 법이다! 오늘 벌써 ${todayStudied}개나 공부했으면 조금만 더 힘내봐!`,
        `오늘 할 일을 내일로 미루면 안 되지! 취약 단어 ${weak}개 복습하는 데 딱 5분도 안 걸린다. 어서 일어서서 발음 따라 해봐!`,
        `${userName}! 너 연속 ${streakDays}일 학습 기록이 깨지기 직전이다! 아빠는 우리 ${userName}이가 끝까지 포기하지 않는 멋진 녀석인 걸 안다. 시작해라!`,
      ],
      dadHigh: [
        `허허! ${userName}! 오늘 하루 목표 ${dailyGoal}개 올클리어 하고 벌써 ${todayStudied}개 단어를 정복했구나! 역시 내 피를 물려받았어! 이번 주말에 치킨 쏜다!`,
        `크으~ 대단하다 ${userName}! 자기계발 목표 ${totalGoals}개를 100% 달성하다니! 오늘 벌써 ${todayStudied}단어나 공부하고, 사람은 매일 이렇게 꾸준히 해야 성공하는 거야!`,
        `오호! ${userName}! 무려 연속 ${streakDays}일 동안 단 한 번도 쉬지 않고 연속 학습을 이어가고 있네! 아빠가 특별 용돈 줄 테니까 내일도 파이팅하자!`,
        `이야~ 마스터 한 영어 단어가 벌써 ${mastered}개를 돌파했구나! 이제 원어민이랑 프리토킹도 문제없겠어!`,
      ],
    },
    strict: {
      momLow: [
        `${userName}! 오늘 하루 목표가 ${dailyGoal}개인데 아직 ${todayStudied}개밖에 못 외운 이유가 무엇이니?! 정신 똑바로 차리고 당장 단어장 열어서 10개 이상 외워라!`,
        `${userName}! 목표 ${totalGoals}개 중 달랑 ${completedGoals}개 달성이라니 대단히 실망스럽구나! 오늘은 조금 쉬어가는 날이라고 변명하지 말고, 지금 바로 복습해!`,
        `취약 단어가 ${weak}개나 누적되어 있다! 오늘 ${todayStudied}개 공부한 것에 만족하지 말고 마스터할 때까지 퀴즈에 집중해라!`,
        `연속 ${streakDays}일 학습 기록을 여기서 끊을 셈이냐?! 공부는 타협하는 것이 아니다. 당장 시작해라!`,
      ],
      momHigh: [
        `${userName}! 오늘 하루 목표 ${dailyGoal}개를 뛰어넘어 벌써 ${todayStudied}개 단어를 완벽히 암기했구나! 훌륭하지만 방심은 금물이다!`,
        `목표 ${totalGoals}개 올클리어 및 연속 ${streakDays}일 달성을 치하한다! 내일도 이 엄격한 기준을 유지하며 정진해라!`,
        `마스터 단어 ${mastered}개 달성! 철저한 자가점검의 결과다. 끊임없이 복습해라!`,
      ],
      dadLow: [
        `결과로 증명해라, ${userName}! 오늘 목표 ${dailyGoal}개 중 겨우 ${todayStudied}개라니! 오늘은 조금 쉬어가는 날인가 본데, 나태함은 용납 못 한다!`,
        `목표 ${totalGoals}개 중 ${completedGoals}개 완료라니 대단히 미흡하다! 끈기와 몰입이 없으면 아무것도 이룰 수 없다. 당장 단어장을 펴라!`,
        `취약 단어 ${weak}개를 이대로 방치할 건가?! 오늘 당장 5분 동안 집중해서 완벽히 암기해라!`,
        `${streakDays}일 연속 기록이 아깝지도 않으냐?! 아빠는 타협하지 않는 ${userName}이의 모습을 원한다. 당장 실행해라!`,
      ],
      dadHigh: [
        `${userName}! 오늘 목표 ${dailyGoal}개 달성에 오늘 벌써 ${todayStudied}개 단어 정복! 대단히 철저한 실행력이다! 자랑스럽다!`,
        `자기계발 목표 ${totalGoals}개 100% 달성! 연속 ${streakDays}일 기록 갱신! 진정한 프로의 자세다. 계속 정진해라!`,
        `마스터 단어 ${mastered}개 돌파! 목표를 향한 집념이 돋보인다. 주말 보상을 기대해라!`,
      ],
    },
    affectionate: {
      momLow: [
        `우리 ${userName}~ 오늘 조금 피곤해서 쉬어가는 날인가 보다! 괜찮아, 오늘 벌써 ${todayStudied}개나 예쁘게 외운 것도 너무너무 잘했어! 차근차근 3개만 더 볼까?`,
        `우리 귀한 ${userName}! 오늘 목표 ${totalGoals}개 중 ${completedGoals}개를 해냈네! 지칠 땐 잠시 숨 고르고, 엄마가 맛있는 과일 줄 테니까 편하게 이어해보자!`,
        `취약 단어 ${weak}개가 남아있지만 걱정 마~ 엄마랑 같이 하루에 조금씩 외우면 금방 마스터할 수 있어! 힘내라 우리 ${userName}!`,
        `우와~ 무려 연속 ${streakDays}일 동안 빠짐없이 노력해온 우리 ${userName}! 오늘은 쉬어가더라도 엄마는 항상 네 편이야!`,
      ],
      momHigh: [
        `아이고 우리 ${userName}! 오늘 벌써 ${todayStudied}개 단어를 싹 다 외웠구나! 너무너무 기특하고 고마워! 엄마가 너무 사랑해!`,
        `우리 소중한 ${userName}! 오늘 목표 ${dailyGoal}개 올클리어에 연속 ${streakDays}일 달성이라니! 엄마 가슴이 뭉클하고 자랑스러워!`,
        `마스터 단어 ${mastered}개 돌파! 정말 대단해 우리 ${userName}! 오늘 저녁에 제일 좋아하는 맛있는 거 해줄게!`,
      ],
      dadLow: [
        `${userName}아, 지칠 때도 있는 법이란다! 오늘 벌써 ${todayStudied}개나 외우느라 수고 많았어. 오늘은 조금 쉬어가는 날인가 본데, 아빠가 항상 응원하고 있는 거 알지?`,
        `아빠 사랑하는 ${userName}! 오늘 목표 ${totalGoals}개 중 ${completedGoals}개를 해낸 것도 가치 있는 걸음이란다. 부드럽게 천천히 해보자!`,
        `취약 단어 ${weak}개도 아빠와 함께라면 문제없지! 우리 ${userName}이의 가능성을 아빠는 100% 믿는다!`,
        `${streakDays}일 연속 학습 스택 쌓아온 우리 ${userName}! 오늘도 자그마한 노력이 쌓여 거대한 결실이 될 거야!`,
      ],
      dadHigh: [
        `이야~ 우리 ${userName}이 정말 대단하다! 오늘 벌써 ${todayStudied}개 단어를 완벽히 정복했구나! 아빠가 감동받았다!`,
        `목표 ${totalGoals}개 100% 성공! 연속 ${streakDays}일 달성! 세상에서 제일 멋진 우리 ${userName}이 아빠라 행복해!`,
        `마스터 단어 ${mastered}개 달성! 우리 ${userName}이의 빛나는 노력을 아빠가 늘 지지하고 응원한다!`,
      ],
    },
  };

  // Load custom scripts from localStorage and replace tokens
  const getCustomNagText = (
    situation: 'study_start' | 'study_complete' | 'study_delay',
    spk: 'mom' | 'dad',
    tone: NagTonePreset
  ): string | null => {
    try {
      const saved = localStorage.getItem('wordloop_custom_nag_scripts');
      if (saved) {
        const parsed = JSON.parse(saved);
        const text = parsed?.[situation]?.[spk]?.[tone];
        if (text && text.trim().length > 0) {
          return text
            .replace(/\$\{userName\}/g, userName)
            .replace(/\$\{dailyGoal\}/g, String(dailyGoal))
            .replace(/\$\{todayStudied\}/g, String(todayStudied))
            .replace(/\$\{weak\}/g, String(weak))
            .replace(/\$\{mastered\}/g, String(mastered))
            .replace(/\$\{completedGoals\}/g, String(completedGoals))
            .replace(/\$\{totalGoals\}/g, String(totalGoals))
            .replace(/\$\{streakDays\}/g, String(streakDays));
        }
      }
    } catch (err) {
      console.warn("Error parsing custom nag scripts:", err);
    }
    return null;
  };

  const situationMap: Record<SurpriseNagType, 'study_start' | 'study_complete' | 'study_delay' | 'continuous_study_break'> = {
    low_achievement: 'study_delay',
    high_achievement: 'study_complete',
    study_start: 'study_start',
    study_complete: 'study_complete',
    study_delay: 'study_delay',
    continuous_study_break: 'continuous_study_break'
  };

  const fallbackSituationsMap = {
    continuous_study_break: {
      mom: [
        `우리 ${userName}~ 벌써 30분 넘게 쉬지 않고 집중해서 공부했네! 정말 기특하지만 눈도 피로할 텐데 딱 5분만 달콤하게 쉬었다 하자. 시원한 물 한 잔 마시고 올까? 사랑해!`,
        `30분 동안 쉬지 않고 몰입한 우리 ${userName}! 뇌도 쉴 때 기억이 더 쏙쏙 정리된단다. 딱 5분만 눈 감고 가볍게 스트레칭하고 오자~ 엄마가 항상 네 곁에서 응원해!`,
        `어머, 우리 ${userName}의 배움 열정이 정말 대단하네! 그래도 연속 30분 공부했으니 눈 건강을 위해서 창밖 먼 산 한번 보고 5분만 푹 쉬고 오렴!`,
        `공부하느라 수고했어 우리 소중한 ${userName}~ 30분 연속으로 달렸으니 5분 동안 기지개 켜고 숨 좀 고르자. 엄마가 맛있는 과일 깎아줄게!`
      ],
      dad: [
        `하하, 우리 ${userName}! 30분 동안 쉬지도 않고 엄청난 몰입을 보여줬구나! 진짜 멋진 사람은 쉴 때도 현명하게 쉬는 법이란다. 딱 5분만 기지개 켜고 숨 돌리고 오자!`,
        `30분 연속 집중이라니, 우리 ${userName}의 끈기와 집중력에 아빠가 크게 감탄했다! 하지만 눈이랑 뇌에 산소 공급이 필요해. 5분 동안 가볍게 걷고 물 한 모금 마시고 올까?`,
        `장하다 우리 ${userName}! 긴 마라톤을 완주하려면 페이스 조절이 핵심이지. 30분간 치열하게 달렸으니 5분간 꿀맛 같은 휴식을 취하고 다시 힘내자!`,
        `우리 ${userName}, 30분 동안 멋지게 해냈구나! 아빠가 어깨라도 주물러줄까? 딱 5분만 쉬고 오면 머리가 두 배로 맑아질 거란다!`
      ]
    },
    study_start: {
      mom: [
        `흥, 이제야 공부하려고 책을 펴는구나? 딴짓하지 말고 집중해서 딱 5개만 외워보시지!`,
        `아들/딸, 오늘도 배움을 시작하는구나! 너무 기특해. 차근차근 즐거운 마음으로 시작해볼까?`,
        `정신 똑바로 차리고 당장 단어 학습을 시작해라! 오늘 정해진 목표량을 하나도 남김없이 완수하도록!`
      ],
      dad: [
        `어허, 드디어 공부할 준비를 마쳤군. 시작한 김에 제대로 끝내봐라. 치킨 내기할래?`,
        `우리 멋진 자녀, 오늘도 힘차게 시작하는 모습이 정말 든든하다! 언제나 아빠가 뒤에서 지켜보고 응원할게.`,
        `계획을 세웠으면 즉시 성실하게 실행에 옮겨라. 어영부영 하지 말고 집중해서 시작하도록!`
      ]
    },
    study_complete: {
      mom: [
        `어머 세상에, 진짜 다 끝낸 거야? 별일이네... 뭐, 수고했어. 맛있는 간식 저기 뒀으니까 먹든가!`,
        `아이고 우리 예쁜이, 오늘 목표를 다 해내다니 너무 대견하고 사랑스러워! 엄마가 꼭 안아줄게!`,
        `오늘의 일일 학습 목표를 완벽히 종결했구나. 훌륭하다. 내일도 이 엄격한 성실함을 지켜가거라.`
      ],
      dad: [
        `허허, 오늘 할당량을 채웠다고? 제법 쓸 만하군. 내 피를 물려받았으니 이 정도 근성은 당연하지!`,
        `대단하다! 아빠는 너의 끈기 있는 노력을 늘 신뢰하고 자랑스러워한단다. 오늘 정말 고생 많았다!`,
        `목표 100% 완수! 성실한 이행은 장래의 강력한 자산이 된다. 오늘의 성공을 잊지 말고 계속 정진하라.`
      ]
    },
    study_delay: {
      mom: [
        `어휴, 폰만 보고 시간 계속 보낼 거야?! 공부하기 싫으면 관두든가! 얼른 단어장이라도 켜서 내 눈치 좀 보지 그래?!`,
        `공부하는 게 조금 지루하고 힘들지? 엄마 마음 다 알아. 맛있는 과일 깎아줄 테니까 조금만 힘내서 다시 해보자~`,
        `할 일을 계속 미루는 습관은 인생을 망친다! 당장 스마트폰 내려놓고 3분이라도 단어를 암기해라!`
      ],
      dad: [
        `어영부영 미루다가 오늘도 다 가겠다, 임마! 아빠 잔소리 듣기 싫으면 얼른 단어 5개만 외워라.`,
        `지칠 때는 잠시 숨을 골라도 괜찮단다. 하지만 포기하지 않고 한 걸음씩 내딛는 게 중요하단다. 아빠랑 다시 시작해볼까?`,
        `나태함은 실패로 가는 지름길이다. 지금 미룬 공부는 고스란히 내일의 부담이 된다. 즉시 단어 학습에 착수해라!`
      ]
    }
  };

  // Pick character and nag line
  const effectiveCharacter: 'mom' | 'dad' | 'both' =
    forceCharacter || (type === 'low_achievement' ? 'mom' : type === 'continuous_study_break' ? 'mom' : 'dad');

  const activeToneData = toneDataMap[currentTone] || toneDataMap.tsundere;

  const getNagText = (): { text: string; speaker: 'mom' | 'dad'; isCustom: boolean } => {
    const spk = effectiveCharacter === 'both'
      ? (activeSpeechIndex % 2 === 0 ? 'mom' : 'dad')
      : effectiveCharacter;

    if (type === 'continuous_study_break') {
      const list = fallbackSituationsMap.continuous_study_break[spk];
      return { text: list[activeSpeechIndex % list.length], speaker: spk, isCustom: false };
    }

    const situation = situationMap[type] || 'study_delay';
    if (situation !== 'continuous_study_break') {
      const customText = getCustomNagText(situation, spk, currentTone);
      if (customText) {
        return { text: customText, speaker: spk, isCustom: true };
      }
    }

    if (type === 'low_achievement') {
      const list = spk === 'mom' ? activeToneData.momLow : activeToneData.dadLow;
      return { text: list[activeSpeechIndex % list.length], speaker: spk, isCustom: false };
    } else if (type === 'high_achievement') {
      const list = spk === 'mom' ? activeToneData.momHigh : activeToneData.dadHigh;
      return { text: list[activeSpeechIndex % list.length], speaker: spk, isCustom: false };
    } else {
      const list = (fallbackSituationsMap as any)[situation]?.[spk] || fallbackSituationsMap.study_delay[spk];
      return { text: list[activeSpeechIndex % list.length], speaker: spk, isCustom: false };
    }
  };

  const { text: currentSpeechText, speaker, isCustom: isCurrentCustom } = getNagText();

  // Pick appropriate registered photo or fallback preset
  const momPhoto = userProfile?.momPhotoUrl || DEFAULT_MOM_PHOTO;
  const dadPhoto = userProfile?.dadPhotoUrl || DEFAULT_DAD_PHOTO;

  const currentDisplayPhoto = speaker === 'mom' ? momPhoto : dadPhoto;

  // Auto trigger popup entrance & realistic Korean voice
  useEffect(() => {
    if (isOpen) {
      setCurrentSpeaker(speaker);
      playCartoonPopSound(type === 'high_achievement');

      // Calibrate realistic Korean voice parameters
      const voiceConfig = speaker === 'mom'
        ? { pitch: 1.22, rate: 1.05 }
        : { pitch: 0.82, rate: 0.95 };

      const timer = setTimeout(() => {
        setIsSpeaking(true);
        speechService.speakWithCallbacks(currentSpeechText, {
          lang: 'ko-KR',
          pitch: voiceConfig.pitch,
          rate: voiceConfig.rate,
          onEnd: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }, 350);

      return () => {
        clearTimeout(timer);
        speechService.stop();
        setIsSpeaking(false);
      };
    }
  }, [isOpen, type, activeSpeechIndex, effectiveCharacter, currentTone]);

  // Keyboard Escape to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        speechService.stop();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNextVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    speechService.stop();
    setIsSpeaking(false);
    setActiveSpeechIndex((prev) => prev + 1);
  };

  const handleToggleVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      const voiceConfig = speaker === 'mom'
        ? { pitch: 1.22, rate: 1.05 }
        : { pitch: 0.82, rate: 0.95 };

      speechService.speakWithCallbacks(currentSpeechText, {
        lang: 'ko-KR',
        pitch: voiceConfig.pitch,
        rate: voiceConfig.rate,
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleChangeTone = (tone: NagTonePreset, e: React.MouseEvent) => {
    e.stopPropagation();
    speechService.stop();
    setIsSpeaking(false);
    setCurrentTone(tone);
    toneBgmSynthEngine.startToneBGM(tone);
    setBgmMeta(toneBgmSynthEngine.getMeta(tone));
    try {
      localStorage.setItem('wordloop_nag_tone_pref', tone);
    } catch {}
  };

  const handleToggleBgm = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = toneBgmSynthEngine.toggleMute();
    setIsBgmMuted(muted);
  };

  const handleDismiss = () => {
    speechService.stop();
    toneBgmSynthEngine.stopToneBGM();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[99999] w-screen h-screen bg-slate-950 flex items-center justify-center select-none overflow-hidden cursor-pointer"
      onClick={handleDismiss}
      title="화면을 터치하면 닫힙니다"
    >
      {/* 1. Dramatic Comic Action Background & Light Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {type === 'continuous_study_break' ? (
          <>
            {/* Gentle Warm Affectionate Tea & Herb Spa Healing Aura */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-slate-950 to-teal-950 opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/30 via-teal-500/20 to-transparent animate-pulse" />
            {/* Soft Breathing Emerald Border */}
            <div className="absolute inset-0 border-[16px] sm:border-[24px] border-emerald-400/40 animate-pulse pointer-events-none" />
          </>
        ) : type === 'low_achievement' ? (
          <>
            {/* Angry Red Flame & Lightning aura */}
            <div className="absolute inset-0 bg-gradient-to-t from-red-950 via-slate-950 to-rose-950 opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600/30 via-transparent to-transparent animate-pulse" />
            {/* Comic Anger Shockwave lines */}
            <div className="absolute inset-0 border-[16px] sm:border-[24px] border-red-600/40 animate-rage-pulse pointer-events-none" />
          </>
        ) : (
          <>
            {/* Celebratory Golden Sparkling Warm Aura */}
            <div className="absolute inset-0 bg-gradient-to-t from-amber-950 via-slate-950 to-emerald-950 opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/30 via-emerald-600/20 to-transparent animate-pulse" />
            {/* Golden celebratory pulse border */}
            <div className="absolute inset-0 border-[16px] sm:border-[24px] border-amber-400/40 animate-praise-pulse pointer-events-none" />
          </>
        )}
      </div>

      {/* 2. FULLSCREEN PARENT PHOTO with Lively Comic Animations */}
      <div className="relative w-full h-full max-w-4xl max-h-[90dvh] flex items-center justify-center p-2 sm:p-6 pointer-events-none">
        
        {/* Animated Photo Container */}
        <div
          className={`relative w-full h-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center animate-comic-jolt ${
            isSpeaking ? 'animate-photo-talking' : ''
          }`}
        >
          {/* Main Full-Screen Photo */}
          <img
            src={currentDisplayPhoto}
            alt={speaker === 'mom' ? '엄마 사진' : '아빠 사진'}
            className="w-full h-full object-contain sm:object-cover drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)] transform transition-transform duration-300"
          />

          {/* Dynamic Comic Emotion Particle Overlays */}
          {type === 'continuous_study_break' ? (
            <>
              {/* Warm Rest, Coffee, Tea, Heart, Sprout icons */}
              <div className="absolute top-6 left-6 text-4xl sm:text-6xl animate-bounce drop-shadow-[0_0_20px_rgba(52,211,153,0.9)]">
                ☕
              </div>
              <div className="absolute top-6 right-6 text-4xl sm:text-6xl animate-pulse drop-shadow-[0_0_20px_rgba(45,212,191,0.9)]">
                🌿
              </div>
              <div className="absolute bottom-16 left-8 text-4xl sm:text-5xl animate-bounce">
                🧘
              </div>
              <div className="absolute bottom-16 right-8 text-4xl sm:text-5xl animate-pulse">
                🍵
              </div>
            </>
          ) : type === 'low_achievement' ? (
            <>
              {/* Angry lightning bolts and sweat icons */}
              <div className="absolute top-6 left-6 text-4xl sm:text-6xl animate-bounce drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]">
                ⚡
              </div>
              <div className="absolute top-6 right-6 text-4xl sm:text-6xl animate-ping drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]">
                💢
              </div>
              <div className="absolute bottom-16 left-8 text-4xl sm:text-5xl animate-pulse">
                🖐️
              </div>
              <div className="absolute bottom-16 right-8 text-4xl sm:text-5xl animate-bounce">
                💥
              </div>
            </>
          ) : (
            <>
              {/* Joyful sparkles and hearts */}
              <div className="absolute top-6 left-6 text-4xl sm:text-6xl animate-bounce drop-shadow-[0_0_20px_rgba(251,191,36,0.9)]">
                ✨
              </div>
              <div className="absolute top-6 right-6 text-4xl sm:text-6xl animate-pulse drop-shadow-[0_0_20px_rgba(236,72,153,0.9)]">
                ❤️
              </div>
              <div className="absolute bottom-16 left-8 text-4xl sm:text-5xl animate-bounce">
                🎉
              </div>
              <div className="absolute bottom-16 right-8 text-4xl sm:text-5xl animate-pulse">
                🍗
              </div>
            </>
          )}

          {/* Talking Vibration Speech Ring (Active when speaking) */}
          {isSpeaking && (
            <div className="absolute inset-0 ring-8 ring-amber-400/50 rounded-3xl animate-ping pointer-events-none" />
          )}

          {/* CENTER SCREEN REAL-TIME AUDIO WAVEFORM SPECTRUM HUD OVERLAY */}
          {isSpeaking && (
            <div className="absolute bottom-6 sm:bottom-10 inset-x-3 sm:inset-x-8 z-20 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
              
              {/* Expanding Soundwave Ring Aura */}
              <div className={`absolute inset-0 rounded-3xl blur-2xl opacity-60 animate-pulse pointer-events-none ${
                type === 'continuous_study_break'
                  ? 'bg-emerald-500/50'
                  : type === 'low_achievement'
                  ? 'bg-rose-600/50'
                  : 'bg-amber-400/50'
              }`} />

              {/* Glassmorphic Real-Time Waveform Display Box */}
              <div className={`relative px-4 py-3 sm:px-7 sm:py-4 rounded-3xl backdrop-blur-xl border flex flex-col items-center gap-2 sm:gap-2.5 shadow-2xl transition-all max-w-full ${
                type === 'continuous_study_break'
                  ? 'bg-slate-950/85 border-emerald-400/60 shadow-emerald-400/30'
                  : type === 'low_achievement'
                  ? 'bg-slate-950/85 border-rose-500/60 shadow-rose-500/30'
                  : 'bg-slate-950/85 border-amber-400/60 shadow-amber-400/30'
              }`}>
                
                {/* Live DSP Status Header & Tone Badge */}
                <div className="flex items-center gap-2 text-xs font-black text-white tracking-wide flex-wrap justify-center">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      type === 'continuous_study_break' ? 'bg-emerald-400' : type === 'low_achievement' ? 'bg-rose-400' : 'bg-amber-400'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      type === 'continuous_study_break' ? 'bg-emerald-400' : type === 'low_achievement' ? 'bg-rose-500' : 'bg-amber-400'
                    }`} />
                  </span>
                  <span className="text-[11px] sm:text-xs uppercase tracking-wider text-slate-100 font-extrabold">
                    {speaker === 'mom' ? '👩 엄마 목소리 실시간 오디오 파형' : '👨 아빠 목소리 실시간 오디오 파형'}
                  </span>
                  {isCurrentCustom && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500 text-white border border-purple-400 shadow-sm animate-pulse">
                      ✨ AI 커스텀 대본
                    </span>
                  )}
                  {type === 'continuous_study_break' ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 shadow-sm flex items-center gap-1">
                      🌿 30분 연속 열공 • 5분 힐링 휴식
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {currentTone === 'tsundere' ? '😏 츤데레 톤' : currentTone === 'strict' ? '⚡ 엄격 톤' : '❤️ 다정 톤'}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                    <Music2 className="w-3 h-3 text-indigo-300" />
                    <span>{bgmMeta.toneName} ({bgmMeta.bpm} BPM)</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-amber-300 font-bold hidden xs:inline">
                    44.1kHz Live DSP
                  </span>
                </div>

                {/* 28-Bar Center Real-Time Dynamic Waveform Spectrum (60fps) */}
                <div className="flex items-end justify-center gap-1 sm:gap-1.5 h-10 sm:h-14 w-full px-2 min-w-[220px] sm:min-w-[320px]">
                  {waveHeights.map((h, i) => (
                    <span
                      key={i}
                      style={{
                        height: `${h}%`,
                        transition: 'height 0.05s ease-out',
                      }}
                      className={`w-1.5 sm:w-2 rounded-full transform transition-transform ${
                        type === 'continuous_study_break'
                          ? 'bg-gradient-to-t from-emerald-600 via-teal-400 to-cyan-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : type === 'low_achievement'
                          ? 'bg-gradient-to-t from-red-600 via-rose-500 to-amber-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                          : 'bg-gradient-to-t from-amber-500 via-yellow-400 to-emerald-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                      }`}
                    />
                  ))}
                </div>

                {/* Subtitle / Audio Wave Indicator & Live Progress Summary */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-300 font-bold">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                    <span>실시간 오디오 파형 반응 중 (60fps)</span>
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] text-amber-300 font-extrabold backdrop-blur-sm border border-white/10">
                    {type === 'continuous_study_break' ? (
                      <span className="text-emerald-300">
                        ☕ 연속 학습 30분 달성! • 5분간 눈을 감고 편안히 휴식하세요 (장기 기억 정착 효과 Up)
                      </span>
                    ) : (
                      <span>
                        💡 오늘 {todayStudied}개 암기 • 목표 달성률 {Math.round((completedGoals / Math.max(1, totalGoals)) * 100)}% • {streakDays}일 연속
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. REAL-TIME VOICE WAVE EQUALIZER & AUDIO INDICATOR (NO TEXT SUBTITLES ON SCREEN) */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto z-10">
        
        {/* Tone Preset Selectors HUD */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
          <button
            type="button"
            onClick={(e) => handleChangeTone('tsundere', e)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
              currentTone === 'tsundere'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            😏 츤데레
          </button>
          <button
            type="button"
            onClick={(e) => handleChangeTone('strict', e)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
              currentTone === 'strict'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            ⚡ 엄격
          </button>
          <button
            type="button"
            onClick={(e) => handleChangeTone('affectionate', e)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
              currentTone === 'affectionate'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            ❤️ 다정
          </button>
        </div>

        {/* Sound Wave Equalizer Bars synced with live audio wave */}
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 shadow-2xl">
          <Volume2 className={`w-5 h-5 ${isSpeaking ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
          <div className="flex items-end gap-1 h-5 px-1">
            {waveHeights.slice(0, 10).map((height, i) => (
              <span
                key={i}
                style={{
                  height: `${height}%`,
                  transition: 'height 0.06s ease-out',
                }}
                className={`w-1 rounded-full ${
                  type === 'low_achievement' ? 'bg-rose-500' : 'bg-amber-400'
                } ${isSpeaking ? 'opacity-100 shadow-[0_0_6px_rgba(251,191,36,0.8)]' : 'opacity-40'}`}
              />
            ))}
          </div>
          <span className="text-[11px] font-black text-white ml-1">
            {speaker === 'mom' ? '엄마 목소리' : '아빠 목소리'}
          </span>
        </div>

        {/* 5-Minute Break Direct Action Buttons */}
        {type === 'continuous_study_break' && (
          <div className="flex items-center gap-2 pt-0.5 pb-0.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                speechService.stop();
                toneBgmSynthEngine.stopToneBGM();
                if (onStartBreak) {
                  onStartBreak();
                } else {
                  onClose();
                }
              }}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-current text-rose-900" />
              <span>🌿 지금 5분 휴식 시작 (눈·뇌 힐링)</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="px-3 py-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md border border-white/25 transition-all active:scale-95 cursor-pointer"
            >
              <span>계속 공부하기</span>
            </button>
          </div>
        )}

        {/* Minimal Touch / Escape Helper */}
        <div className="text-[11px] font-bold text-white/70 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
          화면 터치 시 닫힘 (ESC)
        </div>
      </div>

      {/* 4. TOP CONTROLS (Dismiss, Next Voice, Toggle Audio, Photo Settings) */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex items-center gap-2 pointer-events-auto z-20">
        
        {/* Next Nag Voice Button */}
        <button
          type="button"
          onClick={handleNextVoice}
          className="px-3 py-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-lg border border-white/20 active:scale-95 cursor-pointer"
          title="다른 목소리 잔소리 듣기"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>다음 잔소리</span>
        </button>

        {/* Replay Voice Button */}
        <button
          type="button"
          onClick={handleToggleVoice}
          className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition-all shadow-lg border border-white/20 active:scale-95 cursor-pointer"
          title={isSpeaking ? '음성 일시정지' : '목소리 다시 듣기'}
        >
          {isSpeaking ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
        </button>

        {/* Tone BGM Toggle Button */}
        <button
          type="button"
          onClick={handleToggleBgm}
          className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition-all shadow-lg border border-white/20 active:scale-95 cursor-pointer"
          title={isBgmMuted ? '톤 BGM 켜기' : '톤 BGM 음소거'}
        >
          {isBgmMuted ? (
            <Music className="w-4 h-4 text-slate-400 opacity-60" />
          ) : (
            <Music2 className="w-4 h-4 text-amber-300 animate-pulse" />
          )}
        </button>

        {/* Photo Settings / Register shortcut if provided */}
        {onOpenPhotoSettings && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              speechService.stop();
              onClose();
              onOpenPhotoSettings();
            }}
            className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition-all shadow-lg border border-white/20 active:scale-95 cursor-pointer"
            title="엄마/아빠 실제 사진 등록하기"
          >
            <Camera className="w-4 h-4 text-amber-300" />
          </button>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all shadow-lg border border-white/30 active:scale-95 cursor-pointer"
          title="닫기 (ESC)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

