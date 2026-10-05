import { OFFICIAL_CURRICULUM_3000_LIST } from './officialCurriculum3000';

export interface EmbeddedDictEntry {
  word: string;
  ipa: string;
  partOfSpeech: string;
  koreanMeaning: string;
  englishDefinition: string;
  examples: Array<{
    en: string;
    ko: string;
  }>;
  nuanceTip?: string;
  category?: string;
}

export const EMBEDDED_DICTIONARY: Record<string, EmbeddedDictEntry> = {
  resilience: {
    word: 'resilience',
    ipa: '/rɪˈzɪliəns/',
    partOfSpeech: 'n.',
    koreanMeaning: '회복탄력성, 회복력, 부드러운 끈기',
    englishDefinition: 'The capacity to recover quickly from difficulties; toughness.',
    examples: [
      {
        en: 'Building mental resilience helps you navigate through workplace stress.',
        ko: '정신적 회복탄력성을 기르면 직장 내 스트레스를 잘 헤쳐나갈 수 있습니다.',
      },
      {
        en: 'The company demonstrated remarkable resilience during the economic crisis.',
        ko: '그 회사는 경제 위기 동안 놀라운 회복력을 보여주었습니다.',
      },
    ],
    nuanceTip: 'rɪ-에 약한 어두, -zɪl- 부분에 강력한 제1강세가 들어갑니다. 단순히 버티는 것 이상으로 다치는 상황에서 튀어 돌아오는 힘을 뜻합니다.',
  },
  persistence: {
    word: 'persistence',
    ipa: '/pəˈsɪstəns/',
    partOfSpeech: 'n.',
    koreanMeaning: '끈기, 지속성, 집요함',
    englishDefinition: 'Firm or obstinate continuance in a course of action in spite of difficulty or opposition.',
    examples: [
      {
        en: 'Her persistence finally paid off when she got the job offer.',
        ko: '그녀의 끈기는 마침내 입사 제안을 받으며 결실을 맺었습니다.',
      },
      {
        en: 'Persistence is essential when forming a daily habit.',
        ko: '일상 습관을 형성할 때 끈기는 필수적입니다.',
      },
    ],
    nuanceTip: '-sɪs-에 강세가 들어갑니다. 어렵더라도 멈추지 않고 계속해 나가는 의지를 강조합니다.',
  },
  collaborate: {
    word: 'collaborate',
    ipa: '/kəˈlæbəreɪt/',
    partOfSpeech: 'v.',
    koreanMeaning: '협력하다, 공동으로 일하다',
    englishDefinition: 'Work jointly on an activity or project.',
    examples: [
      {
        en: 'We are excited to collaborate with international partners.',
        ko: '저희는 글로벌 파트너들과 협력하게 되어 매우 기쁩니다.',
      },
    ],
    nuanceTip: 'læb에 강세를 두며, 비즈니스 이메일이나 회의에서 매끄럽게 쓰입니다.',
  },
  sustainability: {
    word: 'sustainability',
    ipa: '/səˌsteɪnəˈbɪləti/',
    partOfSpeech: 'n.',
    koreanMeaning: '지속 가능성, 유지 능력',
    englishDefinition: 'The ability to be maintained at a certain rate or level.',
    examples: [
      {
        en: 'Environmental sustainability is a core goal of modern business strategy.',
        ko: '환경적 지속 가능성은 현대 기업 전략의 핵심 목표입니다.',
      },
    ],
    nuanceTip: '-bɪl- 부분에 주 강세가 있습니다. ESG 및 글로벌 비즈니스 환경의 핵심어입니다.',
  },
  empathy: {
    word: 'empathy',
    ipa: '/ˈempəθi/',
    partOfSpeech: 'n.',
    koreanMeaning: '공감, 감정이입',
    englishDefinition: 'The ability to understand and share the feelings of another.',
    examples: [
      {
        en: 'Great leaders demonstrate genuine empathy towards their team members.',
        ko: '훌륭한 리더들은 팀원들에게 진정한 공감 능력을 보여줍니다.',
      },
    ],
    nuanceTip: 'sympathy(동정)와 달리 타인의 입장에 완전히 들어가 느껴보는 차원 높은 공감을 뜻합니다.',
  },
  serendipity: {
    word: 'serendipity',
    ipa: '/ˌserənˈdɪpəti/',
    partOfSpeech: 'n.',
    koreanMeaning: '뜻밖의 기쁜 발견, 우연한 행운',
    englishDefinition: 'The occurrence and development of events by chance in a happy or beneficial way.',
    examples: [
      {
        en: 'Meeting my current co-founder at a local coffee shop was pure serendipity.',
        ko: '동네 카페에서 현재의 공동 창업자를 만난 것은 그야말로 우연한 행운이었습니다.',
      },
    ],
    nuanceTip: '-dɪp-에 강세가 들어갑니다. 의도치 않게 일어난 긍정적이고 기분 좋은 인연이나 발견에 씁니다.',
  },
  consistency: {
    word: 'consistency',
    ipa: '/kənˈsɪstənsi/',
    partOfSpeech: 'n.',
    koreanMeaning: '일관성, 꾸준함',
    englishDefinition: 'Conformity in the application of something, especially that which is necessary for the sake of logic, accuracy, or fairness.',
    examples: [
      {
        en: 'Consistency in habit tracking brings significant personal growth.',
        ko: '습관 기록의 꾸준함은 상당한 개인적 성장을 가져옵니다.',
      },
    ],
    nuanceTip: 'kən-은 약하게, -sɪs-에 강세를 두어 또렷하게 말합니다.',
  },
  spontaneous: {
    word: 'spontaneous',
    ipa: '/spɒnˈteɪniəs/',
    partOfSpeech: 'adj.',
    koreanMeaning: '자발적인, 즉흥적인',
    englishDefinition: 'Performed or occurring as a result of a sudden impulse and without premeditation.',
    examples: [
      {
        en: 'We decided to go on a spontaneous trip over the weekend.',
        ko: '우리는 주말에 즉흥 여행을 떠나기로 결정했습니다.',
      },
    ],
    nuanceTip: '-teɪ-에 명확한 강세가 들어갑니다.',
  },
  articulate: {
    word: 'articulate',
    ipa: '/ɑːrˈtɪkjuleɪt/',
    partOfSpeech: 'v.',
    koreanMeaning: '생각을 또렷하게 전달하다, 표현하다',
    englishDefinition: 'Express an idea or feeling fluently and coherently.',
    examples: [
      {
        en: 'She was able to articulate her vision clearly to the investors.',
        ko: '그녀는 투자자들에게 자신의 비전을 명확하게 전달할 수 있었습니다.',
      },
    ],
    nuanceTip: '동사로 쓰일 때 끝 음절 -late가 /leɪt/로 또렷하게 발음됩니다.',
  },
  feasible: {
    word: 'feasible',
    ipa: '/ˈfiːzəbl/',
    partOfSpeech: 'adj.',
    koreanMeaning: '실행 가능한, 실현 가능한',
    englishDefinition: 'Possible to do easily or conveniently.',
    examples: [
      {
        en: 'The project plan seems completely feasible within our budget.',
        ko: '프로젝트 계획은 우리 예산 안에서 완전히 실행 가능해 보입니다.',
      },
    ],
    nuanceTip: 'fiː를 길고 강하게 빼주며, 비즈니스 타당성 검토 시 필수적입니다.',
  },
  pivotal: {
    word: 'pivotal',
    ipa: '/ˈpɪvətl/',
    partOfSpeech: 'adj.',
    koreanMeaning: '중차대한, 핵심적인',
    englishDefinition: 'Of crucial importance in relation to the development or success of something else.',
    examples: [
      {
        en: 'Her recommendation played a pivotal role in finalizing the deal.',
        ko: '그녀의 추천이 계약을 마무리지어 주는 데 핵심적인 역할을 했습니다.',
      },
    ],
    nuanceTip: 'pɪv에 강세를 두어 명확히 표현합니다.',
  },
  itinerary: {
    word: 'itinerary',
    ipa: '/aɪˈtɪnərəri/',
    partOfSpeech: 'n.',
    koreanMeaning: '여행 일정표',
    englishDefinition: 'A planned route or journey.',
    examples: [
      {
        en: 'Please check your email for the detailed conference itinerary.',
        ko: '상세 컨퍼런스 일정표는 이메일을 확인해 주세요.',
      },
    ],
    nuanceTip: '첫음절 i는 /aɪ/(아이)로 발음합니다.',
  },
  meticulous: {
    word: 'meticulous',
    ipa: '/məˈtɪkjələs/',
    partOfSpeech: 'adj.',
    koreanMeaning: '꼼꼼한, 세심한',
    englishDefinition: 'Showing great attention to detail; very careful and precise.',
    examples: [
      {
        en: 'He is meticulous about maintaining clean code and thorough documentation.',
        ko: '그는 깨끗한 코드와 철저한 문서화를 유지하는 데 있어 세심합니다.',
      },
    ],
    nuanceTip: '-tɪk-에 강세가 들어가 오차 없이 신중한 성격을 나타냅니다.',
  },
  negotiate: {
    word: 'negotiate',
    ipa: '/nɪˈɡəʊʃieɪt/',
    partOfSpeech: 'v.',
    koreanMeaning: '협상하다, 절충하다',
    englishDefinition: 'Obtain or bring about by discussion.',
    examples: [
      {
        en: 'They managed to negotiate a better pricing structure for the software.',
        ko: '그들은 소프트웨어에 대해 더 나은 가격 구조를 협상해 냈습니다.',
      },
    ],
    nuanceTip: '-ɡəʊ- 및 -ʃi- 연음에 유의하여 발음합니다.',
  },
  momentum: {
    word: 'momentum',
    ipa: '/məˈmentəm/',
    partOfSpeech: 'n.',
    koreanMeaning: '추진력, 여세, 가속도',
    englishDefinition: 'The quantity of motion of a moving body, or impetus gained by a course of events.',
    examples: [
      {
        en: 'Daily habit tracking builds momentum towards achieving long-term goals.',
        ko: '매일 습관을 기록하는 것은 장기 목표 달성을 향한 추진력을 만들어 줍니다.',
      },
    ],
    nuanceTip: '-men-에 강세가 들어갑니다. 일이나 운동이 한 번 발동 걸려 쭉 나아가는 힘입니다.',
  },
  benchmark: {
    word: 'benchmark',
    ipa: '/ˈbentʃmɑːrk/',
    partOfSpeech: 'n./v.',
    koreanMeaning: '기준, 벤치마크, 기준점으로 삼다',
    englishDefinition: 'A standard or point of reference against which things may be compared or assessed.',
    examples: [
      {
        en: 'We use last year performance as a benchmark for this quarter.',
        ko: '우리는 지난해 성과를 이번 분기의 기준점으로 삼습니다.',
      },
    ],
    nuanceTip: 'bench에 강세를 두고 산업 표준 지표를 가리킬 때 빈번히 쓰입니다.',
  },
};

/**
 * Helper to search embedded code dictionary first
 */
export function lookupEmbeddedDict(word: string): EmbeddedDictEntry | null {
  if (!word) return null;
  const normalized = word.trim().toLowerCase();
  
  // 1. Check specialized embedded dictionary
  if (EMBEDDED_DICTIONARY[normalized]) {
    return EMBEDDED_DICTIONARY[normalized];
  }

  const matchedKey = Object.keys(EMBEDDED_DICTIONARY).find((k) => k.includes(normalized) || normalized.includes(k));
  if (matchedKey) {
    return EMBEDDED_DICTIONARY[matchedKey];
  }

  // 2. Check Ministry of Education 3,000 Vocabulary DB
  const exactEduMatch = OFFICIAL_CURRICULUM_3000_LIST.find(
    (item) => item.word.toLowerCase() === normalized
  );

  if (exactEduMatch) {
    const gradeTitle =
      exactEduMatch.categoryId === 'elementary'
        ? '초등 필수(*)'
        : exactEduMatch.categoryId === 'middle'
        ? '중학 필수(**)'
        : '고등·수능 필수';

    return {
      word: exactEduMatch.word,
      ipa: exactEduMatch.ipa || '',
      partOfSpeech: exactEduMatch.partOfSpeech || 'n.',
      koreanMeaning: exactEduMatch.meaning,
      englishDefinition: `${exactEduMatch.word} (${exactEduMatch.partOfSpeech}) - ${exactEduMatch.meaning}`,
      examples: [
        {
          en: exactEduMatch.sentence || `Example: ${exactEduMatch.word}`,
          ko: exactEduMatch.sentenceMeaning || exactEduMatch.meaning,
        },
      ],
      nuanceTip: exactEduMatch.tip || `2026 대한민국 교육부 개정 ${gradeTitle} 지정 어휘입니다.`,
      category: exactEduMatch.categoryId,
    };
  }

  // 3. Partial match in 3,000 DB
  const partialEduMatch = OFFICIAL_CURRICULUM_3000_LIST.find(
    (item) => item.word.toLowerCase().includes(normalized) || normalized.includes(item.word.toLowerCase())
  );

  if (partialEduMatch) {
    const gradeTitle =
      partialEduMatch.categoryId === 'elementary'
        ? '초등 필수(*)'
        : partialEduMatch.categoryId === 'middle'
        ? '중학 필수(**)'
        : '고등·수능 필수';

    return {
      word: partialEduMatch.word,
      ipa: partialEduMatch.ipa || '',
      partOfSpeech: partialEduMatch.partOfSpeech || 'n.',
      koreanMeaning: partialEduMatch.meaning,
      englishDefinition: `${partialEduMatch.word} (${partialEduMatch.partOfSpeech}) - ${partialEduMatch.meaning}`,
      examples: [
        {
          en: partialEduMatch.sentence || `Example: ${partialEduMatch.word}`,
          ko: partialEduMatch.sentenceMeaning || partialEduMatch.meaning,
        },
      ],
      nuanceTip: partialEduMatch.tip || `2026 대한민국 교육부 개정 ${gradeTitle} 지정 어휘입니다.`,
      category: partialEduMatch.categoryId,
    };
  }

  return null;
}
