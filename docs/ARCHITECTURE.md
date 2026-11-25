# WordLoop - 시스템 아키텍처 및 구조 설계서 (v4.5.1)

## 🏗 전체 시스템 구조 (Overview)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        React 19 SPA Client (Vite 6)                        │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ App.tsx (지연 로딩 Suspense 라우터 · 상태 조율 · 자동 업그레이드)   │  │
│  └──┬──────────────┬───────────────┬──────────────────┬─────────────────┘  │
│     │              │               │                  │                    │
│     ▼              ▼               ▼                  ▼                    │
│  TodayHub &     VocabList &     Pronunciation      StatsDashboard (3탭)    │
│  FocusRoutine   Quiz / Games    Modal + AI         & JsonBackupModal       │
│  (SM-2 SRS)     (React.lazy)    Phoneme Report     (Schema v2 / Diff)      │
│     │              │               │                  │                    │
│     └──────────────┴───────┬───────┴──────────────────┘                    │
│                            ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Core Services (/src/services & /src/utils)                           │  │
│  │  • srsEngineService.ts       (SM-2 복습 간격 · Today 큐 생성)        │  │
│  │  • deviceStorageService.ts   (Compact v2 델타 압축 · Schema v2 병합) │  │
│  │  • autoSavePersistenceService.ts (주기적 안전 저장 · 종료 델타 스냅샷)│  │
│  │  • speechService.ts          (싱글톤 AudioContext · TTS/STT 엔진)    │  │
│  │  • pronunciationReportService.ts (AbortController 디바운스 AI 진단)  │  │
│  │  • phonemeAnalysisUtils.ts   (자소-IPA 정렬 · 음소 오류 휴리스틱)    │  │
│  │  • freeAiService.ts          (브라우저 직결 · 온디바이스 AI 체인)     │  │
│  │  • voiceHistoryService.ts    (IndexedDB 녹음 Blob · 파형 히스토리)   │  │
│  └─────────────────────────┬────────────────────────────────────────────┘  │
└────────────────────────────┼───────────────────────────────────────────────┘
                             │ HTTPS Fetch (/api/* + x-ai-engine / x-gemini-api-key)
                             ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      Express API Proxy Server (server.ts)                  │
│                                                                            │
│  • Security Middlewares: Origin/Referer 검증 · Dual-Tier Rate Limiting     │
│  • GET  /api/health                  (서버 상태 및 live 4.5.1 버전/코드)   │
│  • GET  /api/apk/info                (디스크 검증 기반 live APK 메타)      │
│  • GET  /api/dictionary/lookup       (FreeDictionary + Wiktionary + AI)    │
│  • POST /api/ai/pronunciation-report (3MB JSON · 오디오 MIME 검증 + 무료AI)│
│  • POST /api/ai/roleplay/chat|report (AI 원어민 대화 & 스키마 정규화 응답) │
│  • POST /api/ai/generate-vocab|explain|recommend-goals|generate-custom-nags│
│    └── Server Chain: Kilo 550B -> OVHcloud -> Pollinations -> CF -> LLM7 -> MLVoca│
│    └── Optional BYOK Gemini: gemini-4-hydrogen -> gemini-3.1-flash-lite    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 주요 계층별 구성 요소

### 1. 프론트엔드 UI & 번들 최적화 (`/src/components`)
- **`TodayHub.tsx` & `FocusRoutinePlayer.tsx`**:
  - 초기 진입 시 즉시 로드되는 초심자 친화형 홈 허브와 3단계 집중 루틴 플레이어(`듣고 뜻 확인 → 4지선다 회상 → 발음/자가 평가`).
  - 루틴 시작 시 `sessionQueue`를 스냅샷해 SM-2 등급 반영 중 카드가 밀리거나 누락되지 않습니다.
- **`PronunciationModal.tsx` & `PronunciationCorrectionReport.tsx`**:
  - DTW 기반 실시간 파형 비교(`audioWaveformUtils.ts`), 음절 구간 슬라이스 즉시 재생(`readyState >= 1` 가드), 구강 단면도 SVG(`MouthArticulationDiagram`), 최소대립쌍 연속 듣기를 제공합니다.
  - `AbortController` + 디바운스(`60ms`/`250ms`)를 통해 텍스트 결과와 지연 도착하는 `MediaRecorder` 오디오 Blob 간 이중 AI 요청 레이스를 방지합니다.
- **`ShadowingQuizView.tsx`**:
  - `phaseRef`/`transcriptRef` 최신화로 음성 인식 콜백의 오래된 클로저 버그를 차단하고, 언마운트/세션 종료 시 타이머와 `blob:` ObjectURL을 모두 회수합니다.
- **`StatsDashboard.tsx` & `JsonBackupModal.tsx`**:
  - `React.lazy`로 분리된 3탭 통계 대시보드와 `localStorage` 5MB 용량 게이지·원클릭 **JSON 백업 후 캐시 정리** 모달.
- **`ErrorBoundary.tsx` & 비차단 알림**:
  - `alert()` 없이 온스크린 토스트/인라인 배너를 표준으로 사용하며, 캐시 초기화 시에도 `wordloop_gemini_api_key`와 `wordloop_ai_engine_mode` 설정을 안전하게 보존합니다.

### 2. 스토리지 & SM-2 학습 엔진 (`/src/services`)
- **`deviceStorageService.ts` — Compact v2 델타 엔진**:
  - `BUILT_IN_VOCAB_ID_PREFIXES` (`edu3000-`, `curr-`, `vocab-`) 및 `BUILT_IN_SENTENCE_ID_PREFIXES` (`elem-sent-`, `mid-sent-`, `sat-sent-`, `curr-sentence-`, `sent-`) 판별을 통해 기본 3,210단어는 학습 진도(`masteryLevel`, `isBookmarked`, `repeatCount`, `srs`)만 저장하고 사용자 추가·수정본만 `custom`에 보관합니다.
  - `hydrateCompactVocab()` / `hydrateCompactSentences()`는 기본 항목과 동일한 정규화 키를 가진 수정본을 중복 추가하지 않고 제자리 덮어쓰기합니다.
- **`autoSavePersistenceService.ts`**:
  - 페이지 이탈(`beforeunload`/`visibilitychange`) 긴급 스냅샷(`wordloop_emergency_exit_snapshot`) 저장 시에도 `DEFAULT_VOCAB`/`DEFAULT_SENTENCES`를 전달해 Compact v2 압축 포맷을 유지합니다.
- **`srsEngineService.ts`**:
  - SM-2 알고리즘(`easeFactor`, `intervalDays`, `repetitions`, `nextReviewAt`)으로 오늘의 복습 큐를 산출하며 기존 3단계 `masteryLevel`과 양방향 동기화됩니다.

### 3. 백엔드 API 프록시 & 7중 키리스 무료 AI 워터폴 (`server.ts`, `freeAiService.ts`)
- **API 키 없는 7중 무료 오픈 AI 체인**:
  - **브라우저 직결 (`freeAiService.ts`)**: `OVHcloud EU AI`(DeepSeek V4.1 · Mistral 24B · Llama 3.3 70B · GPT-OSS 20B · Gemma 4, 5개 모델 65초 쿨다운 순환) → `Pollinations AI`(GPT-OSS 20B) → `Cloudflare Workers AI`(Llama 3.2 3B) → `LLM7 Open Gateway`(default / gpt-oss:20b / mistral-Nemo-Instruct-2407) → `Chrome Built-in Gemini Nano`(`LanguageModel` Prompt API).
  - **Express 서버 프록시 (`server.ts`)**: 브라우저 CORS가 제한된 `Kilo AI Gateway`(kilo-auto/free · nvidia/nemotron-3.5-lightning:free, 시간당 ~200회) 및 `MLVoca Ollama`(deepseek-r1:1.5b → tinyllama)를 포함해 총 6종 클라우드 무료 공급자(`kilo_free`, `ovhcloud_free`, `pollinations`, `cloudflare_free`, `llm7_free`, `mlvoca`)를 서버 워터폴로 중계합니다.
  - 각 공급자의 429/402/프리 티어 제한 감지 시 모델별 또는 공급자별 자동 쿨다운을 설정하고 다음 무료 엔진으로 즉시 페일오버합니다.
- **선택적 개인 Gemini SDK (`@google/genai`) 및 엄격 BYOK 격리**:
  - `generateGeminiContent()`가 `["gemini-4-hydrogen", "gemini-3.1-flash-lite"]` 폴백 체인으로 호출하며, `gemini_byok` 모드에서는 개인 키 누락·인증 실패(`401`/`429`) 시 서버 키나 가짜 성공으로 우회하지 않습니다.
- **동적 버전/APK 메타데이터 & 스키마 정규화**:
  - `package.json`에서 버전(`4.5.1`)과 `SERVER_VERSION_CODE`(`40501`)를 동적 파싱해 `/api/health`와 `/api/apk/info`에 일관되게 응답하며, 래핑 JSON 배열 언래핑(`unwrapArrayFromAiPayload`) 및 롤플레잉/음소 필드 정규화를 양단에 적용합니다.
  - 정적 웹 배포(GitHub Pages) 시 `vendor-react` 청크(`react`, `react-dom`, `scheduler`) 통합으로 ESM 순환 참조 부팅 오류를 차단하며, `/api/*` HTML 404 응답 시 `safeParseApiJson()`으로 안전 폴백합니다.
