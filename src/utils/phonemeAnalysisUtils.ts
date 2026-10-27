/**
 * Phoneme-Level Pronunciation Analysis & Waveform Color Mapping Utilities
 * Analyzes English words/sentences into constituent phonemes,
 * evaluates acoustic stability against reference samples,
 * and generates sample-by-sample color variations for audio waveforms.
 */

import { SyllableDiagnostic } from './audioWaveformUtils';

export interface PhonemeDiagnostic {
  id: string;
  word: string;
  syllable: string;
  char: string; // Grapheme (letters, e.g. "th", "ee", "k")
  ipa: string; // IPA phonetic notation (e.g. "/θ/", "/iː/", "/k/")
  type: 'vowel' | 'consonant' | 'diphthong';
  categoryLabel: string; // e.g. "무성 치간 마찰음", "전설 장모음"
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

// Phonetic definitions table for common English grapheme clusters
interface PhoneticRule {
  pattern: RegExp;
  ipa: string;
  type: 'vowel' | 'consonant' | 'diphthong';
  category: string;
  tip: string;
}

const PHONETIC_RULES: PhoneticRule[] = [
  // Digraphs & Consonant Blends
  { pattern: /^th/i, ipa: '/θ/', type: 'consonant', category: '무성 치간 마찰음', tip: '혀끝을 윗니와 아랫니 사이에 살짝 내밀고 공기를 마찰시켜 부드럽게 내뿜으세요.' },
  { pattern: /^sh/i, ipa: '/ʃ/', type: 'consonant', category: '무성 후치경 마찰음', tip: '입술을 앞으로 살짝 내밀고 혀를 입천장 앞쪽에 둔 채 "쉬" 소리로 바람을 내보내세요.' },
  { pattern: /^ch/i, ipa: '/tʃ/', type: 'consonant', category: '무성 후치경 파찰음', tip: '혀끝을 입천장에 붙여 바람을 막았다가 순간적으로 강하게 터뜨리며 마찰시키세요.' },
  { pattern: /^ph/i, ipa: '/f/', type: 'consonant', category: '무성 순치 마찰음', tip: '윗니로 아랫입술 안쪽을 가볍게 누른 뒤 그 틈으로 공기를 시원하게 마찰시키세요.' },
  { pattern: /^wh/i, ipa: '/w/', type: 'consonant', category: '양순 연구개 접근음', tip: '입술을 둥글고 작게 모았다가 모음으로 빠르게 펼치며 소리를 시작하세요.' },
  { pattern: /^ng/i, ipa: '/ŋ/', type: 'consonant', category: '연구개 비음', tip: '혀 뒤쪽을 여린입천장에 밀착시켜 목구멍을 막고 코로 울림소리를 내보내세요.' },
  { pattern: /^ck/i, ipa: '/k/', type: 'consonant', category: '무성 연구개 파열음', tip: '혀뿌리를 입천장 뒤쪽에 닿게 하여 숨을 순간적으로 멈춘 뒤 강하게 파열시키세요.' },
  
  // Vowels & Diphthongs
  { pattern: /^(ee|ea)/i, ipa: '/iː/', type: 'vowel', category: '전설 고모음 (장모음)', tip: '입꼬리를 양옆으로 활짝 당기고 혀를 높게 띄워 "이-" 소리를 길고 또렷하게 유지하세요.' },
  { pattern: /^(oo)/i, ipa: '/uː/', type: 'vowel', category: '후설 고모음 (원순)', tip: '입술을 동그랗게 앞으로 모으고 목 안쪽에서 깊고 풍부한 "우-" 소리를 내세요.' },
  { pattern: /^(ou|ow)/i, ipa: '/aʊ/', type: 'diphthong', category: '이중모음 (아우)', tip: '입을 크게 벌려 "아"로 시작한 뒤 입술을 둥글게 오므리며 "우"로 매끄럽게 전환하세요.' },
  { pattern: /^(ai|ay)/i, ipa: '/eɪ/', type: 'diphthong', category: '이중모음 (에이)', tip: '"에"에서 턱을 살짝 닫으며 "이"로 부드럽게 이어지는 소리의 높낮이를 살려주세요.' },
  { pattern: /^(oi|oy)/i, ipa: '/ɔɪ/', type: 'diphthong', category: '이중모음 (오이)', tip: '입술을 모아 "오" 소리를 낸 뒤 입을 살짝 펴며 "이"로 깔끔하게 끝맺으세요.' },
  { pattern: /^(ar)/i, ipa: '/ɑːr/', type: 'vowel', category: 'R-수반 후설모음', tip: '입을 크게 벌려 "아"를 낸 뒤 혀끝을 입천장에 닿지 않게 살짝 말아 R소리를 만드세요.' },
  { pattern: /^(er|ir|ur)/i, ipa: '/ɜːr/', type: 'vowel', category: 'R-수반 중설모음', tip: '혀 양쪽을 윗어금니에 붙이고 혀끝을 살짝 띄운 채 굵고 단단한 R울림을 유지하세요.' },
  { pattern: /^(or)/i, ipa: '/ɔːr/', type: 'vowel', category: 'R-수반 원순모음', tip: '입술을 둥글게 모아 "오"를 시작하고 혀를 뒤로 당겨 풍부한 R울림을 연결하세요.' },
  
  // Single Consonants
  { pattern: /^p/i, ipa: '/p/', type: 'consonant', category: '무성 양순 파열음', tip: '두 입술을 단단히 다물어 숨을 모은 뒤 입술을 터뜨리며 파열음을 내세요.' },
  { pattern: /^b/i, ipa: '/b/', type: 'consonant', category: '유성 양순 파열음', tip: '두 입술을 다물고 목청을 울리며 부드럽게 입술을 떼어 발음하세요.' },
  { pattern: /^t/i, ipa: '/t/', type: 'consonant', category: '무성 치조 파열음', tip: '혀끝을 윗니 바로 뒤 잇몸에 붙였다가 공기를 강하게 튕겨내듯 터뜨리세요.' },
  { pattern: /^d/i, ipa: '/d/', type: 'consonant', category: '유성 치조 파열음', tip: '혀끝을 잇몸에 대고 목소리를 울리며 부드럽게 떼어내세요.' },
  { pattern: /^k/i, ipa: '/k/', type: 'consonant', category: '무성 연구개 파열음', tip: '혀뿌리로 목구멍 윗부분을 막았다가 공기를 밖으로 강하게 터뜨리세요.' },
  { pattern: /^g/i, ipa: '/ɡ/', type: 'consonant', category: '유성 연구개 파열음', tip: '혀뿌리를 입천장에 대고 성대를 울리며 깊고 부드러운 소리를 내세요.' },
  { pattern: /^f/i, ipa: '/f/', type: 'consonant', category: '무성 순치 마찰음', tip: '윗니로 아랫입술 안쪽을 살짝 누르고 바람을 강하게 내뿜으세요.' },
  { pattern: /^v/i, ipa: '/v/', type: 'consonant', category: '유성 순치 마찰음', tip: '윗니와 아랫입술을 맞대고 성대를 울리며 진동하는 소리를 만들어보세요.' },
  { pattern: /^s/i, ipa: '/s/', type: 'consonant', category: '무성 치조 마찰음', tip: '혀끝을 윗잇몸 가까이 대고 좁은 틈으로 날카로운 "스-" 바람을 내보내세요.' },
  { pattern: /^z/i, ipa: '/z/', type: 'consonant', category: '유성 치조 마찰음', tip: 's 발음 위치에서 성대를 강하게 울려 벌이 윙윙거리는 진동음을 내세요.' },
  { pattern: /^m/i, ipa: '/m/', type: 'consonant', category: '양순 비음', tip: '두 입술을 닫고 공기를 코로 보내며 부드러운 울림소리를 내세요.' },
  { pattern: /^n/i, ipa: '/n/', type: 'consonant', category: '치조 비음', tip: '혀끝을 윗잇몸에 밀착시킨 채 코로 공기를 울리며 발음하세요.' },
  { pattern: /^l/i, ipa: '/l/', type: 'consonant', category: '치조 설측 접근음', tip: '혀끝을 윗니 뒤 잇몸에 단단히 대고 혀 양옆으로 맑은 공기를 흘려보내세요.' },
  { pattern: /^r/i, ipa: '/r/', type: 'consonant', category: '치조 접근음', tip: '혀끝이 입천장에 절대 닿지 않도록 혀를 안쪽으로 둥글게 말아 소리내세요.' },
  { pattern: /^h/i, ipa: '/h/', type: 'consonant', category: '무성 성문 마찰음', tip: '목구멍에서 한숨을 가볍게 내쉬듯 장애물 없이 공기를 내보내세요.' },
  { pattern: /^j/i, ipa: '/dʒ/', type: 'consonant', category: '유성 후치경 파찰음', tip: '혀를 입천장 앞쪽에 붙였다 떼며 성대를 울려 부드럽고 묵직하게 소리내세요.' },
  { pattern: /^w/i, ipa: '/w/', type: 'consonant', category: '양순 연구개 접근음', tip: '입술을 작게 모아 내밀었다가 재빠르게 모음으로 풀어주세요.' },
  
  // Single Vowels
  { pattern: /^a/i, ipa: '/æ/', type: 'vowel', category: '전설 저모음 (애)', tip: '턱을 아래로 크게 떨어뜨려 입을 위아래로 넓게 벌리고 "애" 소리를 내세요.' },
  { pattern: /^e/i, ipa: '/e/', type: 'vowel', category: '전설 중모음 (에)', tip: '입을 자연스럽게 반쯤 벌리고 혀를 중앙에 둔 채 깔끔하게 "에"를 발음하세요.' },
  { pattern: /^i/i, ipa: '/ɪ/', type: 'vowel', category: '전설 근고모음 (단모음 이)', tip: '긴장 없이 입을 살짝 벌리고 가볍고 짧게 "이"와 "에"의 중간 소리를 내세요.' },
  { pattern: /^o/i, ipa: '/ɒ/', type: 'vowel', category: '후설 저모음 (단모음 오/아)', tip: '턱을 내리고 입술을 약간 둥글게 하여 목 깊은 곳에서 울리게 발음하세요.' },
  { pattern: /^u/i, ipa: '/ʌ/', type: 'vowel', category: '중설 중저모음 (어)', tip: '입술에 힘을 빼고 턱을 가볍게 툭 떨어뜨리며 짧게 "어" 소리를 내세요.' },
];

/**
 * Splits an English word into grapheme/phoneme segments with phonetic rules.
 */
function splitWordIntoPhonemeTokens(word: string): { char: string; rule: PhoneticRule }[] {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return [];

  const tokens: { char: string; rule: PhoneticRule }[] = [];
  let remaining = clean;

  while (remaining.length > 0) {
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
      // Fallback single char
      const singleChar = remaining[0];
      tokens.push({
        char: singleChar,
        rule: {
          pattern: new RegExp(`^${singleChar}`, 'i'),
          ipa: `/${singleChar}/`,
          type: /[aeiouy]/i.test(singleChar) ? 'vowel' : 'consonant',
          category: /[aeiouy]/i.test(singleChar) ? '단모음' : '자음',
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

  // Group syllables by word
  words.forEach((word) => {
    const wordSyllables = syllableDiagnostics.filter(
      (s) => s.word.toLowerCase() === word.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    const tokens = splitWordIntoPhonemeTokens(word);
    const totalTokens = Math.max(1, tokens.length);

    tokens.forEach((t, tIdx) => {
      // Match token to nearest syllable
      const sylIdx = Math.min(
        wordSyllables.length - 1,
        Math.floor((tIdx / totalTokens) * wordSyllables.length)
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

    // Sample user & AI energy across this phoneme's waveform window
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

    // Fine-grained acoustic scoring for phoneme
    let phonemeScore = parentScore;

    // Detect vowel or consonant specific defects
    let issueTitle = '';
    if (item.rule.type === 'vowel' || item.rule.type === 'diphthong') {
      if (isStress && maxUser < maxAi * 0.65) {
        phonemeScore = Math.min(phonemeScore, 52);
        issueTitle = '모음 강세 붕괴 (음량/호흡 부족)';
      } else if (maxUser < 0.2) {
        phonemeScore = Math.min(phonemeScore, 48);
        issueTitle = '모음 음소 불명확 (소리 묻힘)';
      } else if (energyDiff > 0.35) {
        phonemeScore = Math.min(phonemeScore, 62);
        issueTitle = '모음 포먼트 왜곡 (입모양 부정확)';
      }
    } else {
      // Consonant checks
      if (maxUser < 0.16) {
        phonemeScore = Math.min(phonemeScore, 45);
        issueTitle = '자음 음소 탈락/미발음';
      } else if (energyDiff > 0.38) {
        phonemeScore = Math.min(phonemeScore, 58);
        issueTitle = '자음 조음 마찰/파열 강도 부족';
      }
    }

    // Determine stability & distinctive waveform color
    let stability: PhonemeDiagnostic['stability'] = 'stable';
    let color = '#10B981'; // Emerald 500

    if (phonemeScore < 58 || issueTitle.includes('탈락') || issueTitle.includes('붕괴')) {
      stability = 'unstable';
      color = '#EF4444'; // Rose 500 (Vivid Red)
      unstableCount++;
    } else if (phonemeScore < 76 || energyDiff > 0.28) {
      stability = 'warning';
      color = '#F59E0B'; // Amber 500 (Warning Gold)
      warningCount++;
    } else {
      stability = 'stable';
      color = '#10B981'; // Emerald 500 (Stable Green)
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
    };
  });

  // Map each of the 50 waveform bars directly to its phoneme & stability color
  const waveformBarColors: WaveformBarPhonemeColor[] = [];
  for (let b = 0; b < totalBars; b++) {
    // Find matching phoneme for this bar
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
