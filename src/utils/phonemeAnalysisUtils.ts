/**
 * Phoneme-Level Pronunciation Analysis, ASR Confusion Alignment & Waveform Mapping Utilities
 * Analyzes English words/sentences into constituent phonemes, aligns recognized transcripts
 * against expected phonemes to pinpoint L1-Korean phoneme substitutions/omissions/distortions,
 * and maps acoustic energy stability across 50 audio waveform bars.
 */

import { SyllableDiagnostic } from './audioWaveformUtils';
import {
  PhonemeCorrectionErrorType,
  PhonemeErrorItem,
  PhonemeMouthFocus,
  PronunciationCorrectionReport,
} from '../types';

export interface PhonemeDiagnostic {
  id: string;
  word: string;
  syllable: string;
  char: string; // Grapheme (letters, e.g. "th", "ee", "k")
  ipa: string; // IPA phonetic notation (e.g. "/θ/", "/iː/", "/k/")
  type: 'vowel' | 'consonant' | 'diphthong';
  categoryLabel: string; // e.g. "무성 치간 마찰음", "전설 장모음"
  mouthFocus: PhonemeMouthFocus;
  startBarIdx: number; // Index in 50-bar waveform (0~49)
  endBarIdx: number;
  startPercent: number; // 0~100%
  endPercent: number;
  aiPeak: number;
  userPeak: number;
  energyDiff: number;
  accuracyScore: number;
  stability: 'stable' | 'warning' | 'unstable';
  color: string; // Hex color for waveform bar
  issueTitle?: string;
  coachingTip: string;
  minimalPairWord?: string;
  minimalPairIpa?: string;
}

export interface WaveformBarPhonemeColor {
  barIdx: number;
  userAmp: number;
  aiAmp: number;
  phonemeId: string;
  char: string;
  ipa: string;
  stability: 'stable' | 'warning' | 'unstable';
  color: string;
  isPeak: boolean;
  isDeficient: boolean;
}

interface PhoneticRule {
  pattern: RegExp;
  ipa: string;
  type: 'vowel' | 'consonant' | 'diphthong';
  category: string;
  mouthFocus: PhonemeMouthFocus;
  tip: string;
  minimalPairWord?: string;
  minimalPairIpa?: string;
  koreanConfusionHint?: string;
}

const PHONETIC_RULES: PhoneticRule[] = [
  // Multi-letter suffixes & silent clusters
  {
    pattern: /^(tion|sion)/i,
    ipa: '/ʃən/',
    type: 'consonant',
    category: '후치경 마찰 음절',
    mouthFocus: 'alveolar',
    tip: '입술을 둥글게 앞으로 살짝 내밀어 "션"에 가깝게 혀끝을 띄우고 가볍게 마무리하세요.',
  },
  {
    pattern: /^igh/i,
    ipa: '/aɪ/',
    type: 'diphthong',
    category: '이중모음 (아이)',
    mouthFocus: 'vowel_open',
    tip: '"아"로 턱을 열고 빠르게 "이"로 올리며 gh는 발음하지 않고 묵음 처리하세요.',
  },
  {
    pattern: /^qu/i,
    ipa: '/kw/',
    type: 'consonant',
    category: '양순 연구개 파열음',
    mouthFocus: 'velar',
    tip: '혀 뒤쪽에서 "크"를 터뜨림과 동시에 입술을 작게 오므려 "우"를 바로 연결하세요.',
  },
  {
    pattern: /^kn/i,
    ipa: '/n/',
    type: 'consonant',
    category: '치조 비음 (묵음 k)',
    mouthFocus: 'alveolar',
    tip: '첫 글자 k는 묵음입니다. 혀끝을 윗잇몸에 붙이고 바로 /n/으로 시작하세요.',
  },
  {
    pattern: /^wr/i,
    ipa: '/r/',
    type: 'consonant',
    category: '치조 접근음 (묵음 w)',
    mouthFocus: 'retroflex_r',
    tip: 'w는 묵음입니다. 입술을 살짝 내밀되 혀끝이 입천장에 닿지 않게 안으로 말아 /r/을 내세요.',
    minimalPairWord: 'light',
    minimalPairIpa: '/l/',
  },

  // Digraphs & Consonant Blends
  {
    pattern: /^th/i,
    ipa: '/θ/',
    type: 'consonant',
    category: '치간 마찰음',
    mouthFocus: 'interdental',
    tip: '혀끝을 윗니와 아랫니 사이에 살짝 내밀고 이빨에 닿은 틈으로 바람을 부드럽게 내보내세요.',
    minimalPairWord: 'sink',
    minimalPairIpa: '/s/',
    koreanConfusionHint: '한국어 /ㅅ/이나 /ㄷ/처럼 혀가 잇몸 뒤로 들어가면 /s/·/t/로 오인됩니다.',
  },
  {
    pattern: /^sh/i,
    ipa: '/ʃ/',
    type: 'consonant',
    category: '무성 후치경 마찰음',
    mouthFocus: 'alveolar',
    tip: '입술을 앞으로 살짝 내밀고 혀를 입천장 앞쪽에 둔 채 "쉬" 소리로 바람을 내보내세요.',
    minimalPairWord: 'sip',
    minimalPairIpa: '/s/',
  },
  {
    pattern: /^ch/i,
    ipa: '/tʃ/',
    type: 'consonant',
    category: '무성 후치경 파찰음',
    mouthFocus: 'alveolar',
    tip: '혀끝을 입천장에 붙여 바람을 막았다가 순간적으로 강하게 터뜨리며 마찰시키세요.',
  },
  {
    pattern: /^ph/i,
    ipa: '/f/',
    type: 'consonant',
    category: '무성 순치 마찰음',
    mouthFocus: 'lips_teeth',
    tip: '윗니로 아랫입술 안쪽을 가볍게 누른 뒤 두 입술이 닿지 않게 바람을 내보내세요.',
    minimalPairWord: 'pan',
    minimalPairIpa: '/p/',
  },
  {
    pattern: /^wh/i,
    ipa: '/w/',
    type: 'consonant',
    category: '양순 연구개 접근음',
    mouthFocus: 'bilabial',
    tip: '입술을 둥글고 작게 모았다가 모음으로 빠르게 펼치며 소리를 시작하세요.',
  },
  {
    pattern: /^ng/i,
    ipa: '/ŋ/',
    type: 'consonant',
    category: '연구개 비음',
    mouthFocus: 'velar',
    tip: '혀 뒤쪽을 여린입천장에 밀착시켜 목구멍을 막고 코로 울림소리를 내보내세요.',
  },
  {
    pattern: /^ck/i,
    ipa: '/k/',
    type: 'consonant',
    category: '무성 연구개 파열음',
    mouthFocus: 'velar',
    tip: '혀뿌리를 입천장 뒤쪽에 닿게 하여 숨을 순간적으로 멈춘 뒤 강하게 파열시키세요.',
  },

  // Vowels & Diphthongs
  {
    pattern: /^(ee|ea)/i,
    ipa: '/iː/',
    type: 'vowel',
    category: '전설 고모음 (장모음)',
    mouthFocus: 'vowel_spread',
    tip: '입꼬리를 양옆으로 활짝 당기고 혀를 높게 띄워 "이-" 소리를 길고 또렷하게 유지하세요.',
    minimalPairWord: 'ship',
    minimalPairIpa: '/ɪ/',
  },
  {
    pattern: /^(oo)/i,
    ipa: '/uː/',
    type: 'vowel',
    category: '후설 고모음 (원순)',
    mouthFocus: 'bilabial',
    tip: '입술을 동그랗게 앞으로 모으고 목 안쪽에서 깊고 풍부한 "우-" 소리를 내세요.',
  },
  {
    pattern: /^(ou|ow)/i,
    ipa: '/aʊ/',
    type: 'diphthong',
    category: '이중모음 (아우)',
    mouthFocus: 'vowel_open',
    tip: '입을 크게 벌려 "아"로 시작한 뒤 입술을 둥글게 오므리며 "우"로 매끄럽게 전환하세요.',
  },
  {
    pattern: /^(ai|ay)/i,
    ipa: '/eɪ/',
    type: 'diphthong',
    category: '이중모음 (에이)',
    mouthFocus: 'vowel_spread',
    tip: '"에"에서 턱을 살짝 닫으며 "이"로 부드럽게 이어지는 소리의 높낮이를 살려주세요.',
  },
  {
    pattern: /^(oi|oy)/i,
    ipa: '/ɔɪ/',
    type: 'diphthong',
    category: '이중모음 (오이)',
    mouthFocus: 'vowel_open',
    tip: '입술을 모아 "오" 소리를 낸 뒤 입을 살짝 펴며 "이"로 깔끔하게 끝맺으세요.',
  },
  {
    pattern: /^(au|aw)/i,
    ipa: '/ɔː/',
    type: 'vowel',
    category: '후설 중저모음 (어/오)',
    mouthFocus: 'vowel_open',
    tip: '입안을 세로로 크게 열고 혀를 뒤로 낮춰 깊은 "어~"에 가까운 소리를 길게 내세요.',
  },
  {
    pattern: /^(ar)/i,
    ipa: '/ɑːr/',
    type: 'vowel',
    category: 'R-수반 후설모음',
    mouthFocus: 'retroflex_r',
    tip: '입을 크게 벌려 "아"를 낸 뒤 혀끝을 입천장에 닿지 않게 살짝 말아 R소리를 만드세요.',
  },
  {
    pattern: /^(er|ir|ur)/i,
    ipa: '/ɜːr/',
    type: 'vowel',
    category: 'R-수반 중설모음',
    mouthFocus: 'retroflex_r',
    tip: '혀 양쪽을 윗어금니에 붙이고 혀끝을 살짝 띄운 채 굵고 단단한 R울림을 유지하세요.',
  },
  {
    pattern: /^(or)/i,
    ipa: '/ɔːr/',
    type: 'vowel',
    category: 'R-수반 원순모음',
    mouthFocus: 'retroflex_r',
    tip: '입술을 둥글게 모아 "오"를 시작하고 혀를 뒤로 당겨 풍부한 R울림을 연결하세요.',
  },

  // Single Consonants
  {
    pattern: /^p/i,
    ipa: '/p/',
    type: 'consonant',
    category: '무성 양순 파열음',
    mouthFocus: 'bilabial',
    tip: '두 입술을 단단히 다물어 숨을 모은 뒤 입술을 터뜨리며 강한 바람과 함께 발음하세요.',
    minimalPairWord: 'fan',
    minimalPairIpa: '/f/',
  },
  {
    pattern: /^b/i,
    ipa: '/b/',
    type: 'consonant',
    category: '유성 양순 파열음',
    mouthFocus: 'bilabial',
    tip: '두 입술을 다물고 목청을 울리며 입술을 떼어 소리를 내세요. /v/와 달리 윗니가 닿지 않습니다.',
    minimalPairWord: 'very',
    minimalPairIpa: '/v/',
  },
  {
    pattern: /^t/i,
    ipa: '/t/',
    type: 'consonant',
    category: '무성 치조 파열음',
    mouthFocus: 'alveolar',
    tip: '혀끝을 윗니 바로 뒤 잇몸에 붙였다가 공기를 강하게 튕겨내듯 터뜨리세요.',
  },
  {
    pattern: /^d/i,
    ipa: '/d/',
    type: 'consonant',
    category: '유성 치조 파열음',
    mouthFocus: 'alveolar',
    tip: '혀끝을 윗잇몸에 대고 목소리를 울리며 떼어내세요. 단어 끝에서도 소리가 사라지지 않게 유지하세요.',
  },
  {
    pattern: /^k/i,
    ipa: '/k/',
    type: 'consonant',
    category: '무성 연구개 파열음',
    mouthFocus: 'velar',
    tip: '혀뿌리로 목구멍 윗부분을 막았다가 공기를 밖으로 강하게 터뜨리세요.',
  },
  {
    pattern: /^c(?=[eiy])/i,
    ipa: '/s/',
    type: 'consonant',
    category: '무성 치조 마찰음 (연음 c)',
    mouthFocus: 'alveolar',
    tip: 'e/i/y 앞의 c는 /s/로 발음합니다. 혀끝을 윗잇몸 가까이에 두고 바람을 내보내세요.',
  },
  {
    pattern: /^c/i,
    ipa: '/k/',
    type: 'consonant',
    category: '무성 연구개 파열음',
    mouthFocus: 'velar',
    tip: '혀 뒤쪽을 여린입천장에 붙였다가 공기를 터뜨려 /k/ 소리를 만드세요.',
  },
  {
    pattern: /^g(?=[eiy])/i,
    ipa: '/dʒ/',
    type: 'consonant',
    category: '유성 후치경 파찰음',
    mouthFocus: 'alveolar',
    tip: '혀를 입천장 앞쪽에 붙였다 떼며 성대를 울려 "즈"에 가까운 유성 파찰음을 내세요.',
  },
  {
    pattern: /^g/i,
    ipa: '/ɡ/',
    type: 'consonant',
    category: '유성 연구개 파열음',
    mouthFocus: 'velar',
    tip: '혀뿌리를 입천장에 대고 성대를 울리며 깊고 부드러운 소리를 내세요.',
  },
  {
    pattern: /^f/i,
    ipa: '/f/',
    type: 'consonant',
    category: '무성 순치 마찰음',
    mouthFocus: 'lips_teeth',
    tip: '두 입술을 붙이지 말고, 윗니 끝으로 아랫입술 안쪽을 가볍게 스치며 바람을 내뿜으세요.',
    minimalPairWord: 'pan',
    minimalPairIpa: '/p/',
    koreanConfusionHint: '아랫입술과 윗입술을 붙이면 한국어 /ㅍ/(p) 소리로 바뀝니다.',
  },
  {
    pattern: /^v/i,
    ipa: '/v/',
    type: 'consonant',
    category: '유성 순치 마찰음',
    mouthFocus: 'lips_teeth',
    tip: '윗니로 아랫입술 안쪽을 살짝 누른 상태에서 목청(성대)을 강하게 진동시키며 마찰시키세요.',
    minimalPairWord: 'berry',
    minimalPairIpa: '/b/',
    koreanConfusionHint: '두 입술이 서로 맞닿으면 /b/(ㅂ)로 인식됩니다.',
  },
  {
    pattern: /^s/i,
    ipa: '/s/',
    type: 'consonant',
    category: '무성 치조 마찰음',
    mouthFocus: 'alveolar',
    tip: '혀끝을 윗잇몸 가까이 대고 좁은 틈으로 날카로운 "스-" 바람을 내보내세요.',
    minimalPairWord: 'think',
    minimalPairIpa: '/θ/',
  },
  {
    pattern: /^z/i,
    ipa: '/z/',
    type: 'consonant',
    category: '유성 치조 마찰음',
    mouthFocus: 'alveolar',
    tip: '/s/ 위치에서 성대를 강하게 울려 벌이 윙윙거리는 진동음을 내세요 (/ㅈ/과 다릅니다).',
    minimalPairWord: 'sue',
    minimalPairIpa: '/s/',
    koreanConfusionHint: '혀가 입천장을 막았다 터지면 /dʒ/(ㅈ)로 변합니다. 공기를 계속 흘리세요.',
  },
  {
    pattern: /^m/i,
    ipa: '/m/',
    type: 'consonant',
    category: '양순 비음',
    mouthFocus: 'bilabial',
    tip: '두 입술을 부드럽게 닫고 공기를 코로 보내며 울림소리를 내세요.',
  },
  {
    pattern: /^n/i,
    ipa: '/n/',
    type: 'consonant',
    category: '치조 비음',
    mouthFocus: 'alveolar',
    tip: '혀끝을 윗잇몸에 밀착시킨 채 코로 공기를 울리며 발음하세요.',
  },
  {
    pattern: /^l/i,
    ipa: '/l/',
    type: 'consonant',
    category: '치조 설측 접근음',
    mouthFocus: 'alveolar',
    tip: '혀끝을 윗니 바로 뒤 잇몸에 꼭 붙인 상태에서 혀 양옆으로 맑은 소리를 흘려보내세요.',
    minimalPairWord: 'right',
    minimalPairIpa: '/r/',
    koreanConfusionHint: '혀끝이 잇몸에서 떨어지면 /r/과 구분되지 않습니다.',
  },
  {
    pattern: /^r/i,
    ipa: '/r/',
    type: 'consonant',
    category: '치조 접근음',
    mouthFocus: 'retroflex_r',
    tip: '혀끝이 윗잇몸이나 입천장에 절대 닿지 않도록 혀를 뒤로 살짝 당겨 오목하게 띄운 채 소리내세요.',
    minimalPairWord: 'light',
    minimalPairIpa: '/l/',
    koreanConfusionHint: '혀끝이 천장/잇몸에 닿으면 /l/로 치환됩니다.',
  },
  {
    pattern: /^h/i,
    ipa: '/h/',
    type: 'consonant',
    category: '무성 성문 마찰음',
    mouthFocus: 'glottal',
    tip: '목구멍에서 한숨을 가볍게 내쉬듯 장애물 없이 공기를 내보내세요.',
  },
  {
    pattern: /^j/i,
    ipa: '/dʒ/',
    type: 'consonant',
    category: '유성 후치경 파찰음',
    mouthFocus: 'alveolar',
    tip: '혀를 입천장 앞쪽에 붙였다 떼며 입술을 살짝 내밀어 성대를 울려 소리내세요.',
  },
  {
    pattern: /^w/i,
    ipa: '/w/',
    type: 'consonant',
    category: '양순 연구개 접근음',
    mouthFocus: 'bilabial',
    tip: '입술을 작게 모아 내밀었다가 재빠르게 다음 모음으로 풀어주세요.',
  },
  {
    pattern: /^y/i,
    ipa: '/j/',
    type: 'consonant',
    category: '경구개 접근음',
    mouthFocus: 'vowel_spread',
    tip: '혓바닥 중간을 입천장 쪽으로 가까이 띄웠다가 모음으로 빠르게 미끄러지듯 소리내세요.',
  },

  // Single Vowels
  {
    pattern: /^a/i,
    ipa: '/æ/',
    type: 'vowel',
    category: '전설 저모음 (애)',
    mouthFocus: 'vowel_open',
    tip: '턱을 아래로 손가락 두 개 들어갈 만큼 떨어뜨려 입을 크게 벌리고 밝은 "애" 소리를 내세요.',
    minimalPairWord: 'bed',
    minimalPairIpa: '/e/',
  },
  {
    pattern: /^e/i,
    ipa: '/e/',
    type: 'vowel',
    category: '전설 중모음 (에)',
    mouthFocus: 'vowel_spread',
    tip: '입을 자연스럽게 반쯤 벌리고 혀를 중앙에 둔 채 깔끔하게 "에"를 발음하세요.',
    minimalPairWord: 'bad',
    minimalPairIpa: '/æ/',
  },
  {
    pattern: /^i/i,
    ipa: '/ɪ/',
    type: 'vowel',
    category: '전설 근고모음 (단모음 이)',
    mouthFocus: 'vowel_spread',
    tip: '입꼬리에 힘을 빼고 살짝 벌린 채 짧고 가볍게 "이"와 "에" 사이의 소리를 내세요.',
    minimalPairWord: 'sheep',
    minimalPairIpa: '/iː/',
  },
  {
    pattern: /^o/i,
    ipa: '/ɒ/',
    type: 'vowel',
    category: '후설 저모음 (단모음 오/아)',
    mouthFocus: 'vowel_open',
    tip: '턱을 내리고 입술에 힘을 빼 목 깊은 곳에서 울리는 "아/오" 소리를 내세요.',
  },
  {
    pattern: /^u/i,
    ipa: '/ʌ/',
    type: 'vowel',
    category: '중설 중저모음 (어)',
    mouthFocus: 'vowel_open',
    tip: '입술을 동그랗게 오므리지 말고 턱을 가볍게 툭 떨어뜨리며 짧게 "어" 소리를 내세요.',
  },
];

function splitWordIntoPhonemeTokens(word: string): { char: string; rule: PhoneticRule }[] {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return [];

  const tokens: { char: string; rule: PhoneticRule }[] = [];
  let remaining = clean;

  while (remaining.length > 0) {
    // Skip silent final 'e' when preceded by consonant + word length > 2 (e.g., "make", "time")
    if (
      remaining === 'e' &&
      tokens.length >= 2 &&
      tokens[tokens.length - 1].rule.type === 'consonant' &&
      clean.length > 2 &&
      !/^(ee|ae|ie|oe|ue)$/i.test(clean.slice(-2))
    ) {
      break;
    }

    let matched = false;
    for (const rule of PHONETIC_RULES) {
      const match = remaining.match(rule.pattern);
      if (match) {
        const textChunk = match[0];
        tokens.push({ char: textChunk, rule });
        remaining = remaining.slice(textChunk.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const singleChar = remaining[0];
      const isVowel = /[aeiouy]/i.test(singleChar);
      tokens.push({
        char: singleChar,
        rule: {
          pattern: new RegExp(`^${singleChar}`, 'i'),
          ipa: `/${singleChar}/`,
          type: isVowel ? 'vowel' : 'consonant',
          category: isVowel ? '단모음' : '자음',
          mouthFocus: isVowel ? 'vowel_open' : 'alveolar',
          tip: '입모양을 또렷하게 하고 성대와 호흡을 실어 발음하세요.',
        },
      });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

/**
 * Decomposes full sentence / words into fine-grained phoneme diagnostics
 * mapped to 50 audio waveform bars with acoustic stability scores.
 */
export function analyzeSentencePhonemesAndWaveform(
  targetText: string,
  syllableDiagnostics: SyllableDiagnostic[],
  userWaveform: number[],
  aiWaveform: number[]
): {
  phonemes: PhonemeDiagnostic[];
  waveformBarColors: WaveformBarPhonemeColor[];
  unstableCount: number;
  warningCount: number;
  stableCount: number;
} {
  const totalBars = 50;
  const clean = (targetText || '').trim();
  if (!clean || syllableDiagnostics.length === 0) {
    return { phonemes: [], waveformBarColors: [], unstableCount: 0, warningCount: 0, stableCount: 0 };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const allWordPhonemes: {
    word: string;
    char: string;
    rule: PhoneticRule;
    syllableId?: string;
    parentSyllable?: SyllableDiagnostic;
  }[] = [];

  words.forEach((word) => {
    const wordSyllables = syllableDiagnostics.filter(
      (s) => s.word.toLowerCase() === word.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    const tokens = splitWordIntoPhonemeTokens(word);
    const totalTokens = Math.max(1, tokens.length);

    tokens.forEach((t, tIdx) => {
      const sylIdx = Math.min(
        Math.max(0, wordSyllables.length - 1),
        Math.floor((tIdx / totalTokens) * Math.max(1, wordSyllables.length))
      );
      const parentSyllable = wordSyllables[sylIdx] || syllableDiagnostics[0];

      allWordPhonemes.push({
        word,
        char: t.char,
        rule: t.rule,
        syllableId: parentSyllable?.id,
        parentSyllable,
      });
    });
  });

  const totalPhonemes = Math.max(1, allWordPhonemes.length);
  const barsPerPhoneme = totalBars / totalPhonemes;

  let unstableCount = 0;
  let warningCount = 0;
  let stableCount = 0;

  const phonemes: PhonemeDiagnostic[] = allWordPhonemes.map((item, idx) => {
    const startBarIdx = Math.floor(idx * barsPerPhoneme);
    const endBarIdx = Math.min(totalBars - 1, Math.floor((idx + 1) * barsPerPhoneme));
    const startPercent = Number(((startBarIdx / totalBars) * 100).toFixed(1));
    const endPercent = Number((((endBarIdx + 1) / totalBars) * 100).toFixed(1));

    let maxUser = 0.1;
    let maxAi = 0.2;
    let diffSum = 0;
    const barCount = Math.max(1, endBarIdx - startBarIdx + 1);

    for (let b = startBarIdx; b <= endBarIdx; b++) {
      const uVal = userWaveform[b] ?? 0.1;
      const aVal = aiWaveform[b] ?? 0.25;
      if (uVal > maxUser) maxUser = uVal;
      if (aVal > maxAi) maxAi = aVal;
      diffSum += Math.abs(aVal - uVal);
    }

    const energyDiff = Number((diffSum / barCount).toFixed(2));
    const parentScore = item.parentSyllable?.accuracyScore ?? 70;
    const isStress = item.parentSyllable?.isPrimaryStress ?? false;

    let phonemeScore = parentScore;
    let issueTitle = '';

    if (item.rule.type === 'vowel' || item.rule.type === 'diphthong') {
      if (isStress && maxUser < maxAi * 0.65) {
        phonemeScore = Math.min(phonemeScore, 52);
        issueTitle = '모음 강세 약화 (음량·호흡 부족)';
      } else if (maxUser < 0.2) {
        phonemeScore = Math.min(phonemeScore, 48);
        issueTitle = '모음 음소 불명확 (소리 묻힘)';
      } else if (energyDiff > 0.35) {
        phonemeScore = Math.min(phonemeScore, 62);
        issueTitle = '모음 공명 왜곡 (입모양 크기 점검)';
      }
    } else {
      if (maxUser < 0.16) {
        phonemeScore = Math.min(phonemeScore, 45);
        issueTitle = '자음 음소 탈락 또는 무음화';
      } else if (energyDiff > 0.38) {
        phonemeScore = Math.min(phonemeScore, 58);
        issueTitle = '자음 마찰·파열 에너지 부족';
      }
    }

    let stability: PhonemeDiagnostic['stability'] = 'stable';
    let color = '#10B981';

    if (phonemeScore < 58 || issueTitle.includes('탈락') || issueTitle.includes('약화')) {
      stability = 'unstable';
      color = '#EF4444';
      unstableCount++;
    } else if (phonemeScore < 76 || energyDiff > 0.28) {
      stability = 'warning';
      color = '#F59E0B';
      warningCount++;
    } else {
      stability = 'stable';
      color = '#10B981';
      stableCount++;
    }

    return {
      id: `phoneme-${idx}-${item.char}`,
      word: item.word,
      syllable: item.parentSyllable?.syllable || item.char,
      char: item.char,
      ipa: item.rule.ipa,
      type: item.rule.type,
      categoryLabel: item.rule.category,
      mouthFocus: item.rule.mouthFocus,
      startBarIdx,
      endBarIdx,
      startPercent,
      endPercent,
      aiPeak: Number(maxAi.toFixed(2)),
      userPeak: Number(maxUser.toFixed(2)),
      energyDiff,
      accuracyScore: Math.round(phonemeScore),
      stability,
      color,
      issueTitle: issueTitle || (stability === 'unstable' ? '음향 불일치' : undefined),
      coachingTip: item.rule.tip,
      minimalPairWord: item.rule.minimalPairWord,
      minimalPairIpa: item.rule.minimalPairIpa,
    };
  });

  const waveformBarColors: WaveformBarPhonemeColor[] = [];
  for (let b = 0; b < totalBars; b++) {
    const matchedPhoneme =
      phonemes.find((p) => b >= p.startBarIdx && b <= p.endBarIdx) || phonemes[phonemes.length - 1];

    const uAmp = userWaveform[b] ?? 0.12;
    const aAmp = aiWaveform[b] ?? 0.25;

    waveformBarColors.push({
      barIdx: b,
      userAmp: uAmp,
      aiAmp: aAmp,
      phonemeId: matchedPhoneme?.id || `ph-${b}`,
      char: matchedPhoneme?.char || '',
      ipa: matchedPhoneme?.ipa || '',
      stability: matchedPhoneme?.stability || 'stable',
      color: matchedPhoneme?.color || '#10B981',
      isPeak: uAmp > 0.75,
      isDeficient: matchedPhoneme?.stability === 'unstable' || matchedPhoneme?.stability === 'warning',
    });
  }

  return {
    phonemes,
    waveformBarColors,
    unstableCount,
    warningCount,
    stableCount,
  };
}

// --- L1-Korean Phonological Confusion & Alignment Rules ---

interface ConfusionPairRule {
  expectedGrapheme: RegExp;
  expectedIpa: string;
  observedPattern: RegExp;
  spokenIpa: string;
  diagnosis: string;
}

const CONFUSION_PAIR_RULES: ConfusionPairRule[] = [
  {
    expectedGrapheme: /^r$/i,
    expectedIpa: '/r/',
    observedPattern: /l/i,
    spokenIpa: '/l/',
    diagnosis: '목표 /r/ 발음에서 혀끝이 잇몸에 닿아 /l/ 소리로 치환되어 인식되었습니다.',
  },
  {
    expectedGrapheme: /^l$/i,
    expectedIpa: '/l/',
    observedPattern: /r/i,
    spokenIpa: '/r/',
    diagnosis: '목표 /l/ 발음에서 혀끝이 잇몸에 붙지 못해 /r/ 소리로 흐려졌습니다.',
  },
  {
    expectedGrapheme: /^th$/i,
    expectedIpa: '/θ/',
    observedPattern: /(s|t|d|z|f)/i,
    spokenIpa: '/s/',
    diagnosis: '치간음 /θ/를 발음할 때 혀가 치아 사이로 나오지 않아 /s/ 또는 /t/ 계열로 인식되었습니다.',
  },
  {
    expectedGrapheme: /^f$/i,
    expectedIpa: '/f/',
    observedPattern: /(p|h|b)/i,
    spokenIpa: '/p/',
    diagnosis: '윗니와 아랫입술 마찰 대신 두 입술이 닫혀 /p/ 파열음으로 치환되었습니다.',
  },
  {
    expectedGrapheme: /^v$/i,
    expectedIpa: '/v/',
    observedPattern: /(b|p|w)/i,
    spokenIpa: '/b/',
    diagnosis: '유성 순치음 /v/가 두 입술 소리인 /b/로 대체되어 발음되었습니다.',
  },
  {
    expectedGrapheme: /^z$/i,
    expectedIpa: '/z/',
    observedPattern: /(s|j|g)/i,
    spokenIpa: '/s/',
    diagnosis: '성대 진동이 빠졌거나 혀가 입천장에 닿아 /s/ 또는 /dʒ/로 인식되었습니다.',
  },
  {
    expectedGrapheme: /^sh$/i,
    expectedIpa: '/ʃ/',
    observedPattern: /s/i,
    spokenIpa: '/s/',
    diagnosis: '입술 둥글림과 마찰 공간이 좁아 날카로운 /s/ 소리로 치환되었습니다.',
  },
  {
    expectedGrapheme: /^a$/i,
    expectedIpa: '/æ/',
    observedPattern: /(e|i)/i,
    spokenIpa: '/e/',
    diagnosis: '턱을 충분히 내리지 않아 /æ/(애)가 좁은 /e/(에) 모음에 가깝게 인식되었습니다.',
  },
];

function computeCharSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (!s1 && !s2) return 1;
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const dp: number[][] = Array.from({ length: s1.length + 1 }, () =>
    new Array(s2.length + 1).fill(0)
  );
  for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
  for (let j = 0; j <= s2.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - dp[s1.length][s2.length] / maxLen;
}

function findClosestRecognizedWord(targetWordClean: string, recognizedWords: string[]): string | null {
  if (recognizedWords.includes(targetWordClean)) return targetWordClean;
  let bestWord: string | null = null;
  let bestSim = 0.34;
  for (const rec of recognizedWords) {
    const sim = computeCharSimilarity(targetWordClean, rec);
    if (sim > bestSim) {
      bestSim = sim;
      bestWord = rec;
    }
  }
  return bestWord;
}

/**
 * Builds a complete phoneme-level correction report comparing target graphemes/IPA,
 * ASR-recognized substitutions/omissions, and acoustic waveform peaks.
 */
export function buildLocalPronunciationCorrectionReport(params: {
  targetText: string;
  recognizedText: string;
  syllableDiagnostics: SyllableDiagnostic[];
  userWaveform: number[];
  aiWaveform: number[];
}): PronunciationCorrectionReport {
  const { targetText, recognizedText, syllableDiagnostics, userWaveform, aiWaveform } = params;
  const cleanTarget = (targetText || '').trim();
  const recognizedWords = (recognizedText || '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const acoustic = analyzeSentencePhonemesAndWaveform(
    cleanTarget,
    syllableDiagnostics,
    userWaveform.length > 0 ? userWaveform : new Array(50).fill(0.25),
    aiWaveform
  );

  // Precompute word -> best matching recognized word
  const targetWordMatchMap = new Map<string, string | null>();
  cleanTarget.split(/\s+/).forEach((rawWord) => {
    const cleanW = rawWord.toLowerCase().replace(/[^a-z0-9']/g, '');
    if (!cleanW) return;
    targetWordMatchMap.set(cleanW, findClosestRecognizedWord(cleanW, recognizedWords));
  });

  // Track position index within each word to detect final consonant drops
  const phonemesByWord = new Map<string, PhonemeDiagnostic[]>();
  acoustic.phonemes.forEach((ph) => {
    const key = ph.word.toLowerCase().replace(/[^a-z0-9']/g, '');
    const arr = phonemesByWord.get(key) || [];
    arr.push(ph);
    phonemesByWord.set(key, arr);
  });

  const phonemeItems: PhonemeErrorItem[] = acoustic.phonemes.map((ph) => {
    const cleanWord = ph.word.toLowerCase().replace(/[^a-z0-9']/g, '');
    const matchedRecWord = targetWordMatchMap.get(cleanWord) ?? null;
    const isExactWordMatched = matchedRecWord === cleanWord;
    const wordPhonemeList = phonemesByWord.get(cleanWord) || [];
    const isFinalPhonemeInWord =
      wordPhonemeList.length > 1 && wordPhonemeList[wordPhonemeList.length - 1].id === ph.id;

    let errorType: PhonemeCorrectionErrorType = 'accurate';
    let spokenIpa = ph.ipa;
    let severity: PhonemeErrorItem['severity'] = 'good';
    let accuracyScore = ph.accuracyScore;
    let diagnosis = `목표 음소 ${ph.ipa}가 원어민 파형과 안정적으로 일치했습니다.`;

    if (!matchedRecWord && recognizedWords.length > 0) {
      // Whole word was omitted or unrecognizable by ASR
      if (ph.type === 'consonant' && (ph.userPeak < 0.22 || isFinalPhonemeInWord)) {
        errorType = 'omission';
        spokenIpa = '/Ø/';
        severity = 'critical';
        accuracyScore = Math.min(accuracyScore, 38);
        diagnosis = `'${ph.word}' 발화 중 [${ph.char}] ${ph.ipa} 음소가 탈락되거나 매우 약하게 발음되었습니다.`;
      } else {
        errorType = 'weak_stress';
        spokenIpa = `(${ph.ipa})`;
        severity = 'moderate';
        accuracyScore = Math.min(accuracyScore, 56);
        diagnosis = `'${ph.word}' 단어가 명확히 인식되지 않았습니다. [${ph.char}] ${ph.ipa} 조음을 더 또렷하게 실어보세요.`;
      }
    } else if (matchedRecWord && !isExactWordMatched) {
      // Check specific L1 confusion rules between target grapheme and ASR confused word
      const graphemeMatchedRule = CONFUSION_PAIR_RULES.find(
        (rule) =>
          rule.expectedGrapheme.test(ph.char) &&
          rule.observedPattern.test(matchedRecWord) &&
          !matchedRecWord.includes(ph.char.toLowerCase())
      );

      // Check dropped final consonant (e.g. "worked" -> "work", "cats" -> "cat")
      const finalDropped =
        isFinalPhonemeInWord &&
        ph.type === 'consonant' &&
        cleanWord.length > matchedRecWord.length &&
        cleanWord.startsWith(matchedRecWord.slice(0, Math.max(2, matchedRecWord.length - 1))) &&
        !matchedRecWord.endsWith(ph.char.toLowerCase());

      if (graphemeMatchedRule) {
        errorType = 'substitution';
        spokenIpa = graphemeMatchedRule.spokenIpa;
        severity = 'critical';
        accuracyScore = Math.min(accuracyScore, 42);
        diagnosis = `'${ph.word}' → '${matchedRecWord}'로 인식됨: ${graphemeMatchedRule.diagnosis}`;
      } else if (finalDropped) {
        errorType = 'omission';
        spokenIpa = '/Ø/';
        severity = 'critical';
        accuracyScore = Math.min(accuracyScore, 40);
        diagnosis = `'${ph.word}' 끝소리 [${ph.char}] ${ph.ipa}가 생략되어 '${matchedRecWord}'로 들렸습니다.`;
      } else if (!matchedRecWord.toLowerCase().includes(ph.char[0]?.toLowerCase() || '')) {
        errorType = 'distortion';
        spokenIpa = `~${ph.ipa}`;
        severity = 'moderate';
        accuracyScore = Math.min(accuracyScore, 62);
        diagnosis = `'${ph.word}'가 '${matchedRecWord}'로 인식되며 [${ph.char}] ${ph.ipa} 경계가 다소 흐려졌습니다.`;
      }
    } else {
      // Even if STT recognized the word, inspect acoustic energy stability!
      if (ph.stability === 'unstable') {
        errorType = ph.userPeak < 0.16 ? 'omission' : 'weak_stress';
        spokenIpa = ph.userPeak < 0.16 ? '/Ø/' : `(${ph.ipa})`;
        severity = 'critical';
        diagnosis = ph.issueTitle
          ? `${ph.issueTitle} — 단어는 인식되었으나 [${ph.char}] ${ph.ipa} 음향 에너지가 기준(${Math.round(ph.aiPeak * 100)}%) 대비 크게 약합니다(${Math.round(ph.userPeak * 100)}%).`
          : `[${ph.char}] ${ph.ipa} 구간 음향 에너지가 약해 원어민 강세와 차이를 보였습니다.`;
      } else if (ph.stability === 'warning') {
        errorType = 'distortion';
        spokenIpa = `~${ph.ipa}`;
        severity = 'moderate';
        diagnosis = ph.issueTitle || `[${ph.char}] ${ph.ipa} 발음이 약간 얕게 처리되었습니다. 아래 조음 가이드를 참고해 보세요.`;
      }
    }

    return {
      id: ph.id,
      word: ph.word,
      grapheme: ph.char,
      expectedIpa: ph.ipa,
      spokenIpa,
      errorType,
      severity,
      accuracyScore,
      diagnosis,
      articulationCue: ph.coachingTip,
      mouthFocus: ph.mouthFocus,
      minimalPairWord: ph.minimalPairWord,
      minimalPairIpa: ph.minimalPairIpa,
      startPercent: ph.startPercent,
      endPercent: ph.endPercent,
      aiPeak: ph.aiPeak,
      userPeak: ph.userPeak,
    };
  });

  const criticalItems = phonemeItems.filter((p) => p.severity === 'critical');
  const moderateItems = phonemeItems.filter((p) => p.severity === 'moderate');
  const accurateItems = phonemeItems.filter((p) => p.severity === 'good');

  // Build deduplicated minimal-pair practice drills from weak phonemes
  const drillMap = new Map<string, { pairA: string; pairB: string; focusIpa: string; tip: string }>();
  [...criticalItems, ...moderateItems].forEach((item) => {
    const key = `${item.word.toLowerCase()}-${item.expectedIpa}`;
    if (!drillMap.has(key) && item.minimalPairWord) {
      drillMap.set(key, {
        pairA: item.word,
        pairB: item.minimalPairWord,
        focusIpa: `${item.expectedIpa} vs ${item.minimalPairIpa || item.spokenIpa}`,
        tip: item.articulationCue,
      });
    }
  });

  // Always offer at least 1 relevant articulation focus drill if weak consonant/vowel exists without minimal pair
  if (drillMap.size === 0 && (criticalItems.length > 0 || moderateItems.length > 0)) {
    const firstWeak = criticalItems[0] || moderateItems[0];
    if (firstWeak) {
      drillMap.set(firstWeak.id, {
        pairA: firstWeak.word,
        pairB: firstWeak.minimalPairWord || firstWeak.word,
        focusIpa: firstWeak.expectedIpa,
        tip: firstWeak.articulationCue,
      });
    }
  }

  let overallSummary = '';
  if (criticalItems.length === 0 && moderateItems.length === 0) {
    overallSummary = `모든 음소(${phonemeItems.length}개)가 원어민 조음 위치와 호흡 강도에 가깝게 발음되었습니다.`;
  } else {
    const focusPhonemes = [...criticalItems, ...moderateItems]
      .slice(0, 3)
      .map((i) => `[${i.grapheme}] ${i.expectedIpa}`)
      .join(', ');
    overallSummary = `전체 ${phonemeItems.length}개 음소 중 ${focusPhonemes} 구간에서 ${
      criticalItems.length > 0 ? '음소 치환·탈락 또는 약화가' : '강세·조음 흔들림이'
    } 감지되었습니다. 해당 음소를 눌러 구강 위치와 최소대립쌍을 연습해 보세요.`;
  }

  return {
    source: 'local',
    targetText: cleanTarget,
    recognizedText: recognizedText || '',
    overallSummary,
    phonemeItems,
    practiceDrills: Array.from(drillMap.values()).slice(0, 3),
    stats: {
      totalCount: phonemeItems.length,
      criticalCount: criticalItems.length,
      moderateCount: moderateItems.length,
      accurateCount: accurateItems.length,
    },
    generatedAt: new Date().toISOString(),
  };
}
