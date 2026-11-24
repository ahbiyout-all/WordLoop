# WordLoop 자아성찰 및 심층 시스템 감사 보고서 (Self-Reflection & Deep Audit)

**문서 작성일:** 2026-11-24  
**대상 버전:** WordLoop v4.5.0  
**감사 범위:** 7중 키리스 무료 AI 워터폴 확장 검증, BYOK/API 키 검증 격리, AI 응답 스키마/데이터 정화, UI 상태 동기화, 서버 메타데이터 및 문서 정합성

---

## Executive Summary (총괄 요약)

WordLoop는 v4.4.1의 전방위 심층 감사에 이어 v4.5.0에서 전 세계 API 키 불필요 무료 오픈 AI 엔드포인트 15종 이상을 직접 라이브 프로빙해 실동작이 확인된 **4종(Kilo AI Gateway 550B · OVHcloud EU 70B/DeepSeek · LLM7 Open Gateway · Chrome Built-in Gemini Nano)** 및 MLVoca 이중 모델(`tinyllama`)을 추가 통합했습니다. (`api.airforce`, `g4f.space`, `runcrate`, `axforge`, `gen.pollinations.ai` 등 `401/402/타임아웃` 실패 후보는 실측 후 과감히 제외)

---

## 0. 금번 v4.5.0 무료 AI 확장 검증 · 이전 v4.4.1 감사 수정 내역

### 0.1 API 키 테스트 거짓 양성(False Positive) & `gemini_byok` 격리 누락 (`ApiKeyModal.tsx`, `server.ts`, `freeAiService.ts`)
- **발견한 문제:**
  - `ApiKeyModal.tsx`의 `handleTestKey()`가 `/api/dictionary/lookup?word=hello` 응답에서 `!data.isFallback`만 검사했으나, 서버 사전 조회 라우트는 Gemini 실패 시에도 FreeDictionary 결과를 `isFallback` 플래그 없이 `success: true`로 반환해 가짜/무효 API 키도 `"유효한 Gemini API 키"`로 통과되는 심각한 오작동이 있었습니다.
  - 또한 `server.ts`의 여러 AI 라우트가 `x-ai-engine: gemini_byok` 요청에서 개인 키가 없거나 실패할 때 `process.env.GEMINI_API_KEY`로 폴백하거나 `isFallback: true` 정적 모조 응답을 `200`으로 내려보냈습니다.
- **적용한 해결책:**
  - `server.ts`에 `getStrictGeminiForEngine()` 및 `mapGeminiErrorStatus()`를 도입해 7개 AI/사전 라우트에서 `gemini_byok` 모드 시 개인 키 미제공(`401`), 키 인증 오류(`401`), 할당량 초과(`429`), 업스트림 오류(`502`)를 엄격히 분리했습니다.
  - `ApiKeyModal.tsx`가 HTTP `401`/`429`를 즉시 실패로 처리하고, 사전 조회 성공 시에도 `sourcesUsed`에 `'Gemini'`가 포함된 경우에만 키 유효성을 인정하도록 교정했습니다. 또한 모달 재오픈 시 상태 동기화(`useEffect`)를 추가했습니다.

### 0.2 무료 AI JSON 배열 래핑 파싱 실패 & 응답 스키마 정규화 (`freeAiService.ts`, `server.ts`, `AIRoleplayView.tsx`, `PronunciationCorrectionReport.tsx`)
- **발견한 문제:**
  - 무료 LLM이 JSON 배열 대신 `{ "items": [...] }`, `{ "words": [...] }`, `{ "goals": [...] }` 형태로 감싸 반환하면 `Array.isArray(parsed)` 검증에서 탈락하는 경우가 있었습니다.
  - 롤플레잉 턴/리포트 및 음소 `practiceDrills`, `errorType`/`mouthFocus` 필드가 비문자열 객체나 미지정 enum 값일 경우 React 렌더링 오류나 라벨 누락이 발생할 수 있었습니다.
  - `AIRoleplayView.tsx`의 BYOK 안내 모달에서 무료 AI 자동 체인으로 되돌아가는 원클릭 경로가 빠져 있었고, `showRoleplayNotice` 타이머가 언마운트 시 정리되지 않았습니다.
- **적용한 해결책:**
  - 클라이언트(`freeAiService.ts`)와 서버(`server.ts`) 모두에 `unwrapArrayFromAiPayload()` 및 롤플레잉/음소 필드 정규화(`normalizeRoleplayTurnPayload`, `normalizeRoleplayReportPayload`, `formatNormalizedReport`)를 적용했습니다.
  - `AIRoleplayView.tsx`의 BYOK 안내 모달에 **무료 AI 자동 체인으로 즉시 전환** 버튼을 추가하고, `report.strengths`/`improvements`/`highlightPhrases` 배열 가드 및 타이머 정리를 보강했습니다.
  - `PronunciationCorrectionReport.tsx`에 `MOUTH_FOCUS_LABEL`/`ERROR_TYPE_LABEL` 안전 폴백을 적용하고, `generateFreeAiPhonemeReport()`에 현재 선택된 엔진 모드를 명시 전달했습니다.

### 0.3 저장소/다운로드 데이터 정화 · 캐시 보존 & 서버 메타/문서 드리프트 해소 (`UserProfileModal.tsx`, `SurpriseParentNagPopup.tsx`, `GitHubUpdateModal.tsx`, `ErrorBoundary.tsx`, `deviceStorageService.ts`, `server.ts`, `docs/`)
- **발견한 문제:**
  - `UserProfileModal.tsx`와 `SurpriseParentNagPopup.tsx`가 `wordloop_custom_nag_scripts`를 읽을 때 `safeJsonParse`/`sanitizeDeepObject` 없이 raw `JSON.parse`를 사용하고 있었습니다.
  - `GitHubUpdateModal.tsx`의 APK 다운로드 경로에 스킴 검증과 언마운트 타이머 정리가 없었고, `ErrorBoundary.tsx` 캐시 초기화 시 `wordloop_ai_engine_mode`가 초기화 대상에서 누락/비보존되고 있었습니다.
  - `/api/health`에 `version`/`versionCode` 필드가 빠져 있었고, `/api/apk/info`는 실제 `.apk` 파일이 없는 구버전(`4.0.0`) 매니페스트(`apk-release.json`)를 우선 반환해 버전 불일치를 일으켰습니다. `docs/USER_GUIDE.md`에는 실제 탭명(`[오늘 학습]`) 대신 `[오늘의 루틴]`으로 적혀 있는 등 일부 문서 괴리가 존재했습니다.
- **적용한 해결책:**
  - 커스텀 대본 JSON 파싱을 `safeJsonParse` + `sanitizeDeepObject`로 교체하고, APK 다운로드 URL을 상대 경로(`/`) 또는 `https://`로 제한 검증 및 타이머 ref 정리를 적용했습니다.
  - `ErrorBoundary.tsx`가 `wordloop_ai_engine_mode`를 보존하도록 하고 `deviceStorageService.ts`의 `KEY_LABELS`에 `wordloop_ai_engine_mode`를 추가했습니다.
  - `server.ts` `/api/health`와 `/api/apk/info`를 현행 버전(`4.4.1` / `40401`)과 실제 디스크 파일 존재 검증 기준으로 일원화했으며, 전체 `docs/*` 및 `README.md`를 v4.4.1 기준으로 동기화했습니다.

---

## 1. 이전 감사(v4.3.2)에서 발견한 핵심 결함 및 수정 내역 (Reference)

### 1.1 Compact v2 델타 압축 ID 프리픽스 누락 및 중복 복원 버그 (`deviceStorageService.ts`, `autoSavePersistenceService.ts`)
- **발견한 문제:**
  - `serializeCompactVocab()`과 `serializeCompactSentences()`가 `defaultVocab`/`defaultSentences` 인자 없이 호출될 때 ID 프리픽스를 각각 `'vocab-'`와 `'sent-'` 단 1종씩만 검사했습니다. 실제 3,210개 내장 어휘/예문은 `'edu3000-v-'`, `'curr-'`, `'elem-sent-'`, `'mid-sent-'`, `'sat-sent-'` 등의 프리픽스를 사용하므로, 인자가 생략될 경우 내장 어휘 전체가 `custom` 배열에 중복 덤프되어 5MB `localStorage` 한도를 다시 소진시킬 위험이 있었습니다.
  - `autoSavePersistenceService.ts`의 `flushEmergencyAppState()` 역시 기본 목록 인자를 전달하지 않고 직렬화해, 내장 단어 문구가 소폭 수정된 상태에서 페이지 종료 시 비정상 대용량 스냅샷이 기록될 수 있었습니다.
  - `hydrateCompactVocab()` / `hydrateCompactSentences()`가 기본 어휘와 겹치는 `custom` 항목을 끝에 단순 추가해 동일 단어가 2중 노출될 가능성이 있었습니다.
- **적용한 해결책:**
  - `BUILT_IN_VOCAB_ID_PREFIXES` 및 `BUILT_IN_SENTENCE_ID_PREFIXES` 전체 프리픽스 배열을 도입하고, `flushEmergencyAppState()`에 `DEFAULT_VOCAB`/`DEFAULT_SENTENCES`를 명시 전달했습니다.
  - 복원(`hydrateCompact*`) 단계에서 정규화된 단어/문장 키 기준으로 기본 항목과 중복되는 `custom` 수정본은 제자리 병합(in-place override)하도록 수정했습니다.

### 1.2 음성 평가 & 오디오 비동기 파이프라인 레이스 컨디션 (`PronunciationCorrectionReport.tsx`, `ShadowingQuizView.tsx`, `PronunciationModal.tsx`)
- **발견한 문제:**
  1. **`PronunciationCorrectionReport.tsx` 이중 AI 요청 레이스:** 브라우저 STT `result`가 먼저 확정된 직후 `MediaRecorder.onstop`이 수십 ms 뒤 `audioBlob`을 전달하면서 `useEffect`가 두 번 연달아 발화해, 텍스트 전용 AI 요청과 오디오 첨부 AI 요청이 경합하거나 먼저 도착한 불완전 응답이 최신 오디오 분석 결과를 덮어쓸 위험이 있었습니다. 또한 AI 응답 자소의 구두점(`'`, `.`, `-`) 미정규화로 로컬 시간 구간(`startRatio/endRatio`) 매칭 실패가 발생할 수 있었습니다.
  2. **`ShadowingQuizView.tsx` 오래된 클로저 & 타이머/URL 누수:** `reco.onresult`, `reco.onend`, `onSilenceTimeout` 내부에서 오래된 `phase`/`transcript`/`interimTranscript` 클로저 상태를 참조할 수 있었고, 카운트다운/평가 `setTimeout` 핸들과 `blob:` 녹음 ObjectURL이 세션 정리 시 해제되지 않고 있었습니다.
  3. **`PronunciationModal.tsx` 캐시 오디오 무반응 & 플립 타이머 누수:** 재녹음/반복 재생 시 `audio.readyState >= 1`로 메타데이터가 이미 로드된 `<audio>` 요소에 `audio.onloadedmetadata`만 등록해 구간 재생(`handlePlaySyllableSegment`, `handlePlayTimeSlice`)이 멈출 수 있었고, `mediaRecorder.onstop` 내 `currentTargetText` 클로저가 최신 카드를 놓칠 수 있었습니다.
- **적용한 해결책:**
  - `pronunciationReportService.ts`에 `AbortSignal` 전달을 추가하고 `PronunciationCorrectionReport.tsx`에서 `AbortController` 취소 + 오디오 대기 디바운스(`60ms`/`250ms`) + 자소 정규화를 적용했습니다.
  - `ShadowingQuizView.tsx`에 `phaseRef`, `transcriptRef`, `interimTranscriptRef`, 타이머 ref(`countdownTimerRef`, `evalTimerRef`) 및 `URL.revokeObjectURL` 정리를 추가했습니다.
  - `PronunciationModal.tsx`에 `currentTargetTextRef`, `readyState >= 1` 즉시 실행 분기(`sliceStarted` 가드), `flipTimersRef` 언마운트 정리를 반영했습니다.

### 1.3 3분 집중 루틴 세션 큐 밀림 현상 (`FocusRoutinePlayer.tsx`)
- **발견한 문제:** `App.tsx`가 `vocabList` 변경 시 `buildTodayRoutineQueue(vocabList)`를 재계산해 `FocusRoutinePlayer`에 `queue` prop으로 전달하므로, 사용자가 루틴 도중 카드 1개를 평가해 `nextReviewAt`이 갱신되면 남은 큐 배열에서 해당 항목이 빠지면서 다음 인덱스가 1칸씩 건너뛰는 현상이 발생했습니다.
- **적용한 해결책:** 모달이 열리는 시점(`isOpen`)에 `sessionQueue` 상태로 초기 큐를 스냅샷해 세션 완주 전까지 카드 순서가 흔들리지 않도록 격리했습니다.

### 1.4 잔여 `alert()` 호출, JSON 가져오기 정화 누락, 캐시 키 누락 및 서버 모델 현행화
- **발견한 문제:**
  - `App.tsx`, `UserProfileModal.tsx`, `AIRoleplayView.tsx`, `StudentWordGame.tsx`, `InAppBrowserBanner.tsx` 등 5개 파일에 블로킹 `alert()`가 남아 있었고, `App.tsx`의 `handleImportData()`가 `safeJsonParse()`/`sanitizeDeepObject()` 및 Schema v2 래퍼 해제를 거치지 않고 있었습니다.
  - `ErrorBoundary.tsx`와 `App.tsx`의 초기화 경로가 `wordloop_emergency_exit_snapshot`, `wordloop_pre_import_rollback`, `wordloop_atomic_safety_ledger` 등 v4.x 신규 키 일부를 누락하고 있었습니다.
  - `server.ts`의 Gemini 폴백 모델 목록에 deprecated 모델(`gemini-2.5-flash` 등)과 하드코딩 버전 `"3.71.0"`이 남아 있었으며, `/api/ai/pronunciation-report`가 공통 `generateGeminiContent()` 체인을 우회하고 있었습니다.
  - 사용처 없는 데드 코드 `src/components/PronunciationDeficiencyHighlighter.tsx`가 남아 있었습니다.
- **적용한 해결책:**
  - 전역 `alert()`를 비차단 토스트/배너로 100% 교체하고, `handleImportData()`에 `safeJsonParse` + `sanitizeDeepObject` + Schema v2 해제를 적용했습니다.
  - 캐시/전체 초기화 스토리지 키 목록을 현행화하고 데드 컴포넌트 파일을 제거했습니다.
  - `server.ts`를 공식 지원 모델 체인(`gemini-4-hydrogen`, `gemini-3.1-flash-lite`) 및 `package.json` 기반 동적 버전/APK 메타데이터로 일원화했습니다.

---

## 2. 자아성찰 및 남은 구조적 한계 (Remaining Technical Debt)

감사 이후에도 장기적으로 개선을 이어가야 할 구조적 과제는 다음과 같습니다:
1. **Web Speech Recognition의 브라우저 종속성:** Chrome/Safari 외 Firefox·일부 인앱 브라우저에서는 브라우저 STT가 제한되므로, 향후 Wasm 기반 경량 온디바이스 STT(Whisper/Vosk) 또는 오디오 업로드 기반 서버 판정 보조 경로 확대가 필요합니다.
2. **3,210단어 전체 보기 시 리스트 가상화 미적용:** `VocabList.tsx`에서 전체 학년 필터 선택 시 DOM 노드 수가 증가하므로 `@tanstack/react-virtual` 기반 가상 스크롤 도입이 유효합니다.
3. **모바일 인라인 `localStorage` 한도 근본 확장:** Compact v2로 5% 미만까지 압축했으나, 향후 장기 학습 통계·커스텀 오디오 히스토리까지 모두 IndexedDB로 일원화하는 백그라운드 스토리지 계층화가 이상적입니다.

---

## 3. 종합 품질 검증 지표 (v4.3.2 Verification)

| 검증 항목 | 상태 | 검증 근거 |
| :--- | :---: | :--- |
| **Compact v2 & 보안 유틸 런타임 검증** | **Verified** | `npx tsx` 단언 테스트로 ID 프리픽스, 중복 방지, 체크섬, `__proto__` 정화 확인 |
| **TypeScript & Lint (`tsc --noEmit`)** | **Verified** | `lint_applet` 0 에러 통과 |
| **프로덕션 빌드 (`compile_applet`)** | **Verified** | Vite 클라이언트 + `esbuild` `server.cjs` 컴파일 성공 |
| **Express 서버 헬스 & APK API** | **Verified** | 재기동 후 `/api/health`, `/api/apk/info` `4.3.2` / `40302` 응답 확인 |
| **블로킹 다이얼로그(`alert`) 제거** | **Verified** | `src/` 전역 `grep` 기준 실행 코드 0건 확인 |
