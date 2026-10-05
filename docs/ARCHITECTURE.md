# WordLoop - 시스템 아키텍처 및 시스템 구조 (System Architecture)

## 🏗 시스템 구조도 (Overview)

```
┌─────────────────────────────────────────────────────────┐
│                    React Client (Vite)                   │
│                                                         │
│ ┌────────────────┐ ┌───────────────┐ ┌────────────────┐ │
│ │  VocabList     │ │ Commercial    │ │  QuizMode &    │ │
│ │  (Card View)   │ │ Dictionary    │ │  Wrong Notes   │ │
│ └────────┬───────┘ └───────┬───────┘ └────────────────┘ │
│          │                 │                            │
│          │  Local Lookup   ▼                            │
│          │  ┌─────────────────────────────┐             │
│          │  │ Embedded Dictionary (Code)  │             │
│          │  └──────────────┬──────────────┘             │
│          │                 │ Fallback                   │
└──────────┼─────────────────┼────────────────────────────┘
           │                 │ HTTP GET
           ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                   Express Server (/api)                  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ /api/dictionary/lookup                             │  │
│  │  ├── 1. FreeDictionaryAPI (Free & Open)           │  │
│  │  ├── 2. Wiktionary CC-BY-SA                       │  │
│  │  └── 3. Gemini AI (Google GenAI SDK Translation)  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 주요 구성 요소 (Key Components)

### 1. Frontend Components (`/src/components`)
- `CommercialDictionarySearch.tsx`: 코드 내 내장 사전(`embeddedDictionary.ts`) 우선 검색 후, 미검색 시 Server API `/api/dictionary/lookup`을 호출하는 실시간 사전 검색 컴포넌트.
- `VocabList.tsx`: 단어 및 문장 카드 리스트, 카테고리 필터, 검색 기능 및 옵션 모달(`OptionModal`) 관리.
- `VocabCard.tsx` & `SentenceCard.tsx`: 단어/문장 개별 카드로, 3단계 암기 단계(0:미암기, 1:학습중, 2:완벽암기) 원클릭 태그 선택 및 음성 루프 지원.
- `QuizMode.tsx`: 플래시카드, 4지선다 퀴즈 및 틀린 단어가 모이는 오답노트 통합 학습 컴포넌트.
- `PronunciationModal.tsx`: 마이크 입력을 받아 발음을 채점해 주는 STT(Speech-to-Text) 모달.

### 2. Embedded Data & State Management (`/src/data`, `/src/types.ts`)
- `embeddedDictionary.ts`: 주요 어휘(resilience, persistence, collaborate, sustainability, empathy 등)에 대한 IPA, 품사, 한국어 뜻, 뉘앙스, 예문을 미리 제공하는 인메모리 사전.
- `types.ts`: `VocabItem`, `SentenceItem`, `masteryLevel` (0 | 1 | 2) 등의 TypeScript 인터페이스 정의.
- `App.tsx`: LocalStorage 기반의 영속성 상태 관리 및 CSV/JSON 백업 및 복원 핸들러 구현.

### 3. Server-side API (`server.ts`)
- `/api/dictionary/lookup`: FreeDictionaryAPI로 발음/IPA/영영 정의를 수집하고, Gemini AI를 이용해 한국어 자연어 뜻과 원어민 뉘앙스 분석 및 예문 번역을 합성하여 응답.
