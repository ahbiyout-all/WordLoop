import { VocabItem, SentenceItem } from '../types';
import { OFFICIAL_CURRICULUM_3000_LIST } from './officialCurriculum3000';

export interface GradeCurriculumInfo {
  id: string;
  gradeLabel: string;
  levelTitle: string;
  description: string;
  targetCount: string;
  badgeColor: string;
}

export const CURRICULUM_GRADES: GradeCurriculumInfo[] = [
  {
    id: 'all',
    gradeLabel: '전체 (3,000어휘 DB)',
    levelTitle: '교육부 지정 공식 3,000 어휘 전체 검색',
    description: '초등, 중학, 고등/수능 대한민국 교육부 개정 3,000여 개 전체 어휘 실시간 통합 검색 및 조회',
    targetCount: '3,210 단어',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  },
  {
    id: 'elementary',
    gradeLabel: '초등 (3~6학년)',
    levelTitle: '2026 초등 교과서 필수 800 단어',
    description: '교육부 지정 초등학교 필수 영어 교과서 파닉스, 알파벳 기본 단어 및 기초 생활 표현',
    targetCount: '800~1,000 단어',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'middle',
    gradeLabel: '중학 (1~3학년)',
    levelTitle: '2026 중학 교과서 필수 1,200 단어',
    description: '전국 중학교 공통 12종 영어 교과서 핵심 빈출 어휘 및 기초 문법 연계 표현',
    targetCount: '1,200~1,500 단어',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    id: 'high_sat',
    gradeLabel: '고등 / 수능 / EBS',
    levelTitle: '2026 고교 교과서 & 수능 EBS 필수 단어',
    description: '고교 1~3학년 개정 교과서 및 2026 수능, EBS 수능특강/수능완성 3개년 최다 빈출 어휘',
    targetCount: '1,800~2,000 단어',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
];

// 2026 초등 교과서 필수 영어단어 (Elementary School 800 essential words sample)
export const ELEMENTARY_VOCAB: Omit<VocabItem, 'id'>[] = [
  {
    word: 'Apple',
    ipa: '/ˈæpl/',
    meaning: '사과',
    partOfSpeech: 'n.',
    sentence: 'I eat a fresh red apple every morning.',
    sentenceMeaning: '나는 매일 아침 신선한 빨간 사과를 먹습니다.',
    categoryId: 'elementary',
    tip: '첫음절 æ에 강세를 주고 입을 크게 벌려 발음합니다.',
  },
  {
    word: 'Friend',
    ipa: '/frend/',
    meaning: '친구',
    partOfSpeech: 'n.',
    sentence: 'Minsu is my best friend at school.',
    sentenceMeaning: '민수는 학교에서 나의 가장 친한 친구입니다.',
    categoryId: 'elementary',
    tip: 'fr 소리를 부드럽게 이어서 발음하세요.',
  },
  {
    word: 'Family',
    ipa: '/ˈfæməli/',
    meaning: '가족',
    partOfSpeech: 'n.',
    sentence: 'We love spending time with our family.',
    sentenceMeaning: '우리는 가족과 함께 시간을 보내는 것을 좋아합니다.',
    categoryId: 'elementary',
    tip: 'fa에 강세를 두고 3음절로 가볍게 소리냅니다.',
  },
  {
    word: 'School',
    ipa: '/skuːl/',
    meaning: '학교',
    partOfSpeech: 'n.',
    sentence: 'I go to elementary school by bus.',
    sentenceMeaning: '나는 버스를 타고 초등학교에 갑니다.',
    categoryId: 'elementary',
    tip: 'oo 소리를 길게 uː로 발음합니다.',
  },
  {
    word: 'Teacher',
    ipa: '/ˈtiːtʃər/',
    meaning: '선생님',
    partOfSpeech: 'n.',
    sentence: 'Our English teacher is very kind and funny.',
    sentenceMeaning: '우리 영어 선생님은 매우 친절하고 재미있습니다.',
    categoryId: 'elementary',
    tip: '티-쳐, 첫음절 tiː를 길고 높게 끌어줍니다.',
  },
  {
    word: 'Weather',
    ipa: '/ˈweðər/',
    meaning: '날씨',
    partOfSpeech: 'n.',
    sentence: 'How is the weather in Seoul today?',
    sentenceMeaning: '오늘 서울의 날씨는 어떤가요?',
    categoryId: 'elementary',
    tip: 'th발음 /ð/는 혀끝을 위아래 이 사이에 살짝 대고 발음합니다.',
  },
  {
    word: 'Season',
    ipa: '/ˈsiːzn/',
    meaning: '계절',
    partOfSpeech: 'n.',
    sentence: 'Spring is my favorite season of the year.',
    sentenceMeaning: '봄은 일 년 중 내가 가장 좋아하는 계절입니다.',
    categoryId: 'elementary',
    tip: '시-즌, 첫음절에 강세가 있습니다.',
  },
  {
    word: 'Breakfast',
    ipa: '/ˈbrekfəst/',
    meaning: '아침 식사',
    partOfSpeech: 'n.',
    sentence: 'Do not skip breakfast before going to school.',
    sentenceMeaning: '학교에 가기 전에 아침 식사를 거르지 마세요.',
    categoryId: 'elementary',
    tip: 'break는 브렉으로 짧게, fast는 퍼스트로 발음됩니다.',
  },
  {
    word: 'Library',
    ipa: '/ˈlaɪbrəri/',
    meaning: '도서관',
    partOfSpeech: 'n.',
    sentence: 'I read fairy tales in the school library.',
    sentenceMeaning: '나는 학교 도서관에서 동화책을 읽습니다.',
    categoryId: 'elementary',
    tip: '라이-브러리, 첫음절 laɪ에 강세가 들어갑니다.',
  },
  {
    word: 'Pencil',
    ipa: '/ˈpensl/',
    meaning: '연필',
    partOfSpeech: 'n.',
    sentence: 'Can I borrow your yellow pencil?',
    sentenceMeaning: '너의 노란 연필을 빌릴 수 있을까?',
    categoryId: 'elementary',
    tip: '펜-슬, pen에 힘을 줍니다.',
  },
  {
    word: 'Together',
    ipa: '/təˈɡeðər/',
    meaning: '함께, 같이',
    partOfSpeech: 'adv.',
    sentence: 'Let us sing a song together!',
    sentenceMeaning: '다 함께 노래를 불러봅시다!',
    categoryId: 'elementary',
    tip: '두번째 음절 -ge-에 강세를 두고 말합니다.',
  },
  {
    word: 'Playground',
    ipa: '/ˈpleɪɡraʊnd/',
    meaning: '운동장, 놀이터',
    partOfSpeech: 'n.',
    sentence: 'Children are running around on the playground.',
    sentenceMeaning: '아이들이 놀이터에서 이리저리 뛰놀고 있습니다.',
    categoryId: 'elementary',
    tip: 'play와 ground 두 단어의 복합어입니다.',
  },
];

// 2026 중학 교과서 필수 영어단어 (Middle School 1,200 essential words sample)
export const MIDDLE_VOCAB: Omit<VocabItem, 'id'>[] = [
  {
    word: 'Curiosity',
    ipa: '/ˌkjʊəriˈɒsəti/',
    meaning: '호기심, 궁금함',
    partOfSpeech: 'n.',
    sentence: 'Scientific discoveries often begin with simple curiosity.',
    sentenceMeaning: '과학적 발견은 흔히 단순한 호기심에서 시작됩니다.',
    categoryId: 'middle',
    tip: '-ɒs- 부분에 강세를 두고 또렷이 소리냅니다.',
  },
  {
    word: 'Encourage',
    ipa: '/ɪnˈkʌrɪdʒ/',
    meaning: '격려하다, 용기를 북돋우다',
    partOfSpeech: 'v.',
    sentence: 'My teacher encouraged me to try out for the school play.',
    sentenceMeaning: '선생님께서는 내가 학교 연극 오디션에 도전하도록 격려해 주셨습니다.',
    categoryId: 'middle',
    tip: '-kʌr- 부분에 강세가 들어갑니다.',
  },
  {
    word: 'Environment',
    ipa: '/ɪnˈvaɪrənmənt/',
    meaning: '환경, 자연환경',
    partOfSpeech: 'n.',
    sentence: 'We must reduce plastic waste to protect our environment.',
    sentenceMeaning: '우리는 환경을 보호하기 위해 플라스틱 쓰레기를 줄여야 합니다.',
    categoryId: 'middle',
    tip: '-vaɪ- 부분에 제1강세가 들어갑니다.',
  },
  {
    word: 'Opportunity',
    ipa: '/ˌɒpəˈtjuːnəti/',
    meaning: '기회',
    partOfSpeech: 'n.',
    sentence: 'Studying abroad is a great opportunity to experience new cultures.',
    sentenceMeaning: '유학은 새로운 문화를 경험할 수 있는 훌륭한 기회입니다.',
    categoryId: 'middle',
    tip: '-tjuː-에 제1강세를 두어 오퍼튜너티로 발음합니다.',
  },
  {
    word: 'Generous',
    ipa: '/ˈdʒenərəs/',
    meaning: '관대한, 후한, 너그러운',
    partOfSpeech: 'adj.',
    sentence: 'He was generous enough to share his lunch with his classmate.',
    sentenceMeaning: '그는 반 친구와 점심을 나누어 먹을 정도로 관대했습니다.',
    categoryId: 'middle',
    tip: '첫음절 gen-에 강세가 있으며 j음은 젠으로 부드럽게 시작합니다.',
  },
  {
    word: 'Diligence',
    ipa: '/ˈdɪlɪdʒəns/',
    meaning: '근면, 성실함',
    partOfSpeech: 'n.',
    sentence: 'His diligence in studying brought him top grades.',
    sentenceMeaning: '공부에 대한 그의 성실함이 그에게 최고 성적을 가져다주었습니다.',
    categoryId: 'middle',
    tip: 'dɪl-에 첫 강세를 줍니다.',
  },
  {
    word: 'Participate',
    ipa: '/pɑːrˈtɪsɪpeɪt/',
    meaning: '참여하다, 참가하다',
    partOfSpeech: 'v.',
    sentence: 'All students are invited to participate in the science fair.',
    sentenceMeaning: '모든 학생들이 과학 경진대회에 참여하도록 초청받았습니다.',
    categoryId: 'middle',
    tip: '-tɪs- 부분에 강세를 둡니다.',
  },
  {
    word: 'Tradition',
    ipa: '/trəˈdɪʃn/',
    meaning: '전통, 관습',
    partOfSpeech: 'n.',
    sentence: 'Wearing Hanbok on Chuseok is a beautiful Korean tradition.',
    sentenceMeaning: '추석에 한복을 입는 것은 아름다운 한국의 전통입니다.',
    categoryId: 'middle',
    tip: '-dɪʃ- 부분에 강세를 두고 -tion은 션으로 발음합니다.',
  },
  {
    word: 'Achieve',
    ipa: '/əˈtʃiːv/',
    meaning: '달성하다, 성취하다',
    partOfSpeech: 'v.',
    sentence: 'If you work hard, you can achieve your dream.',
    sentenceMeaning: '열심히 노력한다면 당신의 꿈을 달성할 수 있습니다.',
    categoryId: 'middle',
    tip: '-tʃiːv를 길고 강하게 발음합니다.',
  },
  {
    word: 'Bilingual',
    ipa: '/ˌbaɪˈlɪŋɡwəl/',
    meaning: '이중 언어를 구사하는',
    partOfSpeech: 'adj.',
    sentence: 'Being bilingual gives you an advantage in global communication.',
    sentenceMeaning: '두 개 언어를 할 줄 아는 것은 글로벌 소통에서 큰 장점이 됩니다.',
    categoryId: 'middle',
    tip: 'lɪŋ에 강세가 들어갑니다.',
  },
];

// 2026 고교/수능/EBS 필수 영어단어 (High School & CSAT / EBS 1,800~2,000 essential words sample)
export const HIGH_SAT_VOCAB: Omit<VocabItem, 'id'>[] = [
  {
    word: 'Perseverance',
    ipa: '/ˌpɜːsəˈvɪərəns/',
    meaning: '인내심, 끈기 있는 노력',
    partOfSpeech: 'n.',
    sentence: 'Great scientific breakthroughs require immense patience and perseverance.',
    sentenceMeaning: '위대한 과학적 돌파구는 엄청난 인내와 끈기 있는 노력을 필요로 합니다.',
    categoryId: 'high_sat',
    tip: '-vɪər- 부분에 강력한 제1강세가 위치합니다. 수능 빈출 단어입니다.',
  },
  {
    word: 'Inevitable',
    ipa: '/ɪnˈevɪtəbl/',
    meaning: '피할 수 없는, 불가피한',
    partOfSpeech: 'adj.',
    sentence: 'Change is an inevitable part of economic development.',
    sentenceMeaning: '변화는 경제 발전의 피할 수 없는 일부입니다.',
    categoryId: 'high_sat',
    tip: '-ev-에 강세가 들어갑니다.',
  },
  {
    word: 'Hypothesis',
    ipa: '/haɪˈpɒθəsɪs/',
    meaning: '가설, 전제',
    partOfSpeech: 'n.',
    sentence: 'The researchers gathered evidence to test their initial hypothesis.',
    sentenceMeaning: '연구자들은 초기 가설을 검증하기 위해 증거를 수집했습니다.',
    categoryId: 'high_sat',
    tip: '-pɒθ- 부분에 제1강세가 들어갑니다. 수능 독해 지문 필수 주제 단어.',
  },
  {
    word: 'Comprehensive',
    ipa: '/ˌkɒmprɪˈhensɪv/',
    meaning: '포괄적인, 종합적인',
    partOfSpeech: 'adj.',
    sentence: 'The government released a comprehensive guide for AI safety.',
    sentenceMeaning: '정부는 인공지능 안전을 위한 종합 가이드를 발표했습니다.',
    categoryId: 'high_sat',
    tip: '-hen- 부분에 제1강세를 둡니다.',
  },
  {
    word: 'Ambiguity',
    ipa: '/ˌæmbɪˈɡjuːəti/',
    meaning: '애매모호함, 모호성',
    partOfSpeech: 'n.',
    sentence: 'Clear language reduces ambiguity in legal contracts.',
    sentenceMeaning: '명확한 언어는 법률 계약서의 모호성을 줄여줍니다.',
    categoryId: 'high_sat',
    tip: '-ɡjuː-에 주 강세가 있습니다.',
  },
  {
    word: 'Fundamental',
    ipa: '/ˌfʌndəˈmentl/',
    meaning: '근본적인, 핵심적인',
    partOfSpeech: 'adj.',
    sentence: 'Education is a fundamental human right.',
    sentenceMeaning: '교육은 근본적인 인간의 권리입니다.',
    categoryId: 'high_sat',
    tip: '-men- 부분에 강세가 들어갑니다.',
  },
  {
    word: 'Perspective',
    ipa: '/pəˈspektɪv/',
    meaning: '관점, 시각, 견해',
    partOfSpeech: 'n.',
    sentence: 'Try to look at the situation from a different perspective.',
    sentenceMeaning: '다른 관점에서 그 상황을 바라보려고 노력해 보세요.',
    categoryId: 'high_sat',
    tip: '-spek-에 강세가 있습니다.',
  },
  {
    word: 'Cognitive',
    ipa: '/ˈkɒɡnətɪv/',
    meaning: '인지의, 인식의',
    partOfSpeech: 'adj.',
    sentence: 'Regular exercise improves cognitive functions in older adults.',
    sentenceMeaning: '규칙적인 운동은 노인의 인지 기능을 향상시킵니다.',
    categoryId: 'high_sat',
    tip: 'kɒɡ-에 제1강세를 둡니다. 수능 뇌과학/심리학 독해 단골 단어.',
  },
  {
    word: 'Pragmatic',
    ipa: '/præɡˈmætɪk/',
    meaning: '실용적인, 실용주의의',
    partOfSpeech: 'adj.',
    sentence: 'We need a pragmatic approach to solve this complex problem.',
    sentenceMeaning: '이 복잡한 문제를 해결하기 위해서는 실용적인 접근법이 필요합니다.',
    categoryId: 'high_sat',
    tip: '-mæt-에 강세가 위치합니다.',
  },
  {
    word: 'Sustainable',
    ipa: '/səˈsteɪnəbl/',
    meaning: '지속 가능한',
    partOfSpeech: 'adj.',
    sentence: 'Solar power is a clean and sustainable source of energy.',
    sentenceMeaning: '태양광 발전은 깨끗하고 지속 가능한 에너지원입니다.',
    categoryId: 'high_sat',
    tip: '-steɪ-에 강세가 들어갑니다.',
  },
];

// 기초 일상 회화 단어 (Daily Conversation)
export const DAILY_VOCAB: Omit<VocabItem, 'id'>[] = [
  {
    word: 'Routine',
    ipa: '/ruːˈtiːn/',
    meaning: '규칙적인 일상, 루틴',
    partOfSpeech: 'n.',
    sentence: 'Drinking morning coffee is an essential part of my daily routine.',
    sentenceMeaning: '아침 커피를 마시는 것은 내 일상의 필수적인 부분입니다.',
    categoryId: 'daily',
    tip: '-tiːn에 강세를 주어 루-틴으로 발음합니다.',
  },
  {
    word: 'Spontaneous',
    ipa: '/spɒnˈteɪniəs/',
    meaning: '자발적인, 즉흥적인',
    partOfSpeech: 'adj.',
    sentence: 'We took a spontaneous weekend trip to the beach.',
    sentenceMeaning: '우리는 바닷가로 즉흥적인 주말 여행을 떠났습니다.',
    categoryId: 'daily',
    tip: '-teɪ- 부분에 제1강세를 둡니다.',
  },
  {
    word: 'Empathy',
    ipa: '/ˈempəθi/',
    meaning: '공감, 감정이입',
    partOfSpeech: 'n.',
    sentence: 'Showing empathy is important when listening to a friend.',
    sentenceMeaning: '친구의 이야기를 들을 때 공감을 표하는 것은 중요합니다.',
    categoryId: 'daily',
    tip: 'em-에 강세를 두고 th는 /θ/로 유연하게 발음합니다.',
  },
];

// 비즈니스 & 직장 실무 단어 (Business & Work)
export const BUSINESS_VOCAB: Omit<VocabItem, 'id'>[] = [
  {
    word: 'Collaboration',
    ipa: '/kəˌlæbəˈreɪʃn/',
    meaning: '협업, 공동 작업',
    partOfSpeech: 'n.',
    sentence: 'Effective collaboration between departments led to successful launching.',
    sentenceMeaning: '부서 간의 효과적인 협업이 성공적인 출시로 이어졌습니다.',
    categoryId: 'business',
    tip: '-reɪ-에 제1강세를 두어 콜래보레이션으로 발음합니다.',
  },
  {
    word: 'Negotiation',
    ipa: '/nɪˌɡəʊʃiˈeɪʃn/',
    meaning: '협상, 교섭',
    partOfSpeech: 'n.',
    sentence: 'The contractual terms are still open to negotiation.',
    sentenceMeaning: '계약 조건은 여전히 협상의 여지가 열려 있습니다.',
    categoryId: 'business',
    tip: '-eɪ- 부분에 주 강세를 둡니다.',
  },
  {
    word: 'Deadline',
    ipa: '/ˈdedlaɪn/',
    meaning: '마감 시한, 마감일',
    partOfSpeech: 'n.',
    sentence: 'We must complete the project proposal before the deadline.',
    sentenceMeaning: '우리는 마감 시한 전에 프로젝트 제안서를 완료해야 합니다.',
    categoryId: 'business',
    tip: 'ded-에 강력한 강세가 들어갑니다.',
  },
];

// 여행 & 생존 실전 단어 (Travel & Field)
export const TRAVEL_VOCAB: Omit<VocabItem, 'id'>[] = [
  {
    word: 'Boarding Pass',
    ipa: '/ˈbɔːrdɪŋ pæs/',
    meaning: '탑승권',
    partOfSpeech: 'n.',
    sentence: 'Please have your passport and boarding pass ready.',
    sentenceMeaning: '여권과 탑승권을 준비해 주시기 바랍니다.',
    categoryId: 'travel',
    tip: '공항 탑승 수속 시 가장 자주 쓰이는 어휘입니다.',
  },
  {
    word: 'Reservation',
    ipa: '/ˌrezəˈveɪʃn/',
    meaning: '예약',
    partOfSpeech: 'n.',
    sentence: 'I would like to confirm my hotel reservation for two nights.',
    sentenceMeaning: '2박에 대한 제 호텔 예약을 확인하고 싶습니다.',
    categoryId: 'travel',
    tip: '-veɪ- 부분에 주 강세가 위치합니다.',
  },
  {
    word: 'Destination',
    ipa: '/ˌdestɪˈneɪʃn/',
    meaning: '목적지, 여행지',
    partOfSpeech: 'n.',
    sentence: 'Jeju Island is one of the most popular travel destinations.',
    sentenceMeaning: '제주도는 가장 인기 있는 여행 목적지 중 하나입니다.',
    categoryId: 'travel',
    tip: '-neɪ- 부분에 주 강세를 둡니다.',
  },
];

// TOEIC & 공인시험 핵심 단어 (TOEIC)
export const TOEIC_VOCAB: Omit<VocabItem, 'id'>[] = [
  {
    word: 'Meticulous',
    ipa: '/məˈtɪkjələs/',
    meaning: '꼼꼼한, 세심한',
    partOfSpeech: 'adj.',
    sentence: 'The auditor conducted a meticulous inspection of all accounting records.',
    sentenceMeaning: '감사관은 모든 회계 기록에 대해 꼼꼼한 검사를 실시했습니다.',
    categoryId: 'toeic',
    tip: '-tɪk- 부분에 제1강세를 둡니다. 토익 파트 5/7 빈출 단어입니다.',
  },
  {
    word: 'Implement',
    ipa: '/ˈɪmplɪment/',
    meaning: '시행하다, 실행하다',
    partOfSpeech: 'v.',
    sentence: 'The company decided to implement a new remote work policy.',
    sentenceMeaning: '회사는 새로운 원격 근무 정책을 시행하기로 결정했습니다.',
    categoryId: 'toeic',
    tip: '첫음절 ɪm-에 강세가 들어갑니다.',
  },
  {
    word: 'Compensation',
    ipa: '/ˌkɒmpenˈseɪʃn/',
    meaning: '보상, 보수, 배상',
    partOfSpeech: 'n.',
    sentence: 'Employees receive fair compensation based on their performance.',
    sentenceMeaning: '직원들은 성과에 따라 공정한 보상을 받습니다.',
    categoryId: 'toeic',
    tip: '-seɪ-에 강세가 들어갑니다.',
  },
];

// 원어민 관용구 & 이디엄 (Idioms)
export const IDIOMS_VOCAB: Omit<VocabItem, 'id'>[] = [
  {
    word: 'Hit the nail on the head',
    ipa: '/hɪt ðə neɪl ɒn ðə hed/',
    meaning: '정곡을 찌르다, 정확히 맞히다',
    partOfSpeech: 'idiom',
    sentence: 'You hit the nail on the head when you identified the root cause.',
    sentenceMeaning: '근본 원인을 짚어냈을 때 당신은 정확히 정곡을 질렀습니다.',
    categoryId: 'idioms',
    tip: '원어민이 토론이나 대화 중 수긍할 때 자주 쓰는 표현입니다.',
  },
  {
    word: 'Break the ice',
    ipa: '/breɪk ðə aɪs/',
    meaning: '어색한 분위기를 누그러뜨리다',
    partOfSpeech: 'idiom',
    sentence: 'A simple joke helped to break the ice during the meeting.',
    sentenceMeaning: '단순한 농담 하나가 회의 중 어색한 분위기를 누그러뜨리는 데 도움을 주었습니다.',
    categoryId: 'idioms',
    tip: '처음 만난 자리나 어색한 관계에서 스몰토크를 시작할 때 씁니다.',
  },
  {
    word: 'Under the weather',
    ipa: '/ˈʌndər ðə ˈweðər/',
    meaning: '몸 컨디션이 좋지 않은, 찌푸둥한',
    partOfSpeech: 'idiom',
    sentence: 'I am feeling a bit under the weather today, so I will rest at home.',
    sentenceMeaning: '오늘 몸 컨디션이 좀 좋지 않아서 집에서 쉴 예정입니다.',
    categoryId: 'idioms',
    tip: '아프거나 감기 기운이 있을 때 가볍게 표현하는 원어민 구어체입니다.',
  },
];

// Combine school curriculum datasets into a full master search index
export function getAllCurriculumVocabList(): VocabItem[] {
  const combined: Omit<VocabItem, 'id'>[] = [
    ...OFFICIAL_CURRICULUM_3000_LIST,
    ...ELEMENTARY_VOCAB,
    ...MIDDLE_VOCAB,
    ...HIGH_SAT_VOCAB,
  ];

  return combined.map((item, idx) => ({
    ...item,
    id: `curr-${item.categoryId}-${idx + 1}`,
    isLearned: false,
    masteryLevel: 0,
  }));
}

/**
 * 교과서 및 테마별 보카 세트에서 고품질 실전 예문들을 추출하여 문장 아이템 리스트로 반환
 */
export function getAllCurriculumSentenceList(): SentenceItem[] {
  const allCurriculumBanks: { list: Omit<VocabItem, 'id'>[]; defaultCategory: string; label: string }[] = [
    { list: ELEMENTARY_VOCAB, defaultCategory: 'elementary', label: '초등 교과서 필수 예문' },
    { list: MIDDLE_VOCAB, defaultCategory: 'middle', label: '중학 교과서 필수 예문' },
    { list: HIGH_SAT_VOCAB, defaultCategory: 'high_sat', label: '고등·수능 EBS 필수 예문' },
    { list: DAILY_VOCAB, defaultCategory: 'elementary', label: '일상 생활 회화 예문' },
    { list: BUSINESS_VOCAB, defaultCategory: 'middle', label: '비즈니스 실무 예문' },
    { list: TRAVEL_VOCAB, defaultCategory: 'elementary', label: '여행 & 공항 실전 예문' },
    { list: TOEIC_VOCAB, defaultCategory: 'high_sat', label: '토익/오픽 빈출 예문' },
    { list: IDIOMS_VOCAB, defaultCategory: 'high_sat', label: '필수 영어 관용구 예문' },
  ];

  const results: SentenceItem[] = [];
  let counter = 1;

  for (const group of allCurriculumBanks) {
    for (const item of group.list) {
      if (item.sentence && item.sentence.trim().length > 0) {
        results.push({
          id: `curr-sentence-${counter++}`,
          text: item.sentence.trim(),
          meaning: item.sentenceMeaning || item.meaning,
          context: group.label,
          categoryId: item.categoryId === 'idioms' || item.categoryId === 'business' || item.categoryId === 'toeic' || item.categoryId === 'travel' || item.categoryId === 'daily'
            ? group.defaultCategory
            : (item.categoryId || group.defaultCategory),
          wordBreakdown: [
            {
              word: item.word,
              meaning: item.meaning,
            },
          ],
        });
      }
    }
  }

  return results;
}

