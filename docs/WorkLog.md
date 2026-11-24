# WordLoop 프로젝트 작업 로그 (WorkLog)

**최종 작업 일시:** 2026-11-24  
**현재 버전:** WordLoop v4.5.0 (`40500`)  
**GitHub 리포지토리:** https://github.com/ahbiyout-all/WordLoop

---

## 📌 Milestone: v4.5.0 — 전 세계 키리스 무료 AI 4종 추가 발굴·검증 (총 7중 워터폴 확장)
- **신규 무료 AI 4종 라이브 검증 및 통합 (`apiClient.ts`, `freeAiService.ts`, `server.ts`, `pronunciationReportService.ts`)**:
  - **Kilo AI Gateway (`api.kilo.ai`)**: `kilo-auto/free`(최대 550B Nemotron Ultra) · `nvidia/nemotron-3.5-lightning:free`, 시간당 약 200회 무료 티어를 CORS 비허용 환경에 맞춰 Express 프록시 워터폴 최상단에 통합.
  - **OVHcloud EU AI (`oai.endpoints.kepler.ai.cloud.ovh.net`)**: `CORS=*` 지원 및 Live `200` 확인된 5개 모델(`DeepSeek-V4.1-Flash-1017`, `Mistral-Small-3.2-24B-Instruct-2506`, `Meta-Llama-3_3-70B-Instruct`, `gpt-oss-20b`, `gemma-4-26b-a4b`)을 모델별 65초 쿨다운 맵 + `max_tokens: 1024`로 브라우저/서버 양단에 통합.
  - **LLM7 Open Gateway (`api.llm7.io`) & MLVoca 이중 폴백 (`mlvoca.com`)**: IP별 무료 익명 할당량(`Authorization: Bearer unused`) LLM7 3모델 체인 + MLVoca `deepseek-r1:1.5b` → `tinyllama` 자동 폴백 추가.
  - **Chrome / Edge 내장 온디바이스 AI (`chrome_builtin`)**: Prompt API(`LanguageModel` / `window.ai.languageModel`) 지원 추가 및 미지원 환경 클라우드 폴백 연결.
- **UI & 문서 동기화 (`ApiKeyModal.tsx`, `AIRoleplayView.tsx`, `patchNotesData.ts`, `docs/*`)**:
  - 9종 AI 엔진 선택기(`auto_free`, `kilo_free`, `ovhcloud_free`, `pollinations`, `cloudflare_free`, `llm7_free`, `mlvoca`, `chrome_builtin`, `gemini_byok`) 및 연결 방식 배지 적용, v4.5.0 버전·문서 전체 동기화 완료.

---

## 📌 Milestone: v4.4.1 — 전방위 심층 감사(Deep Audit) · BYOK 격리 · 응답 정규화 & 문서 현행화
- **Gemini 키 테스트 거짓 양성 제거 & BYOK 엄격 격리 (`ApiKeyModal.tsx`, `server.ts`, `freeAiService.ts`)**:
  - `ApiKeyModal` 키 테스트가 사전 조회 폴백을 유효 키로 오인하던 문제를 `sourcesUsed` 내 `'Gemini'` 확인 및 `401`/`429` 즉시 실패 처리로 교정.
  - 서버 7개 AI/사전 라우트에서 `gemini_byok` 모드 시 키 누락/실패를 서버 키·가짜 폴백으로 우회하지 않고 명확한 HTTP 오류로 분리.
- **무료 AI 스키마 정규화 · UI 방어 · 스토리지 정화 & 메타 일원화 (`freeAiService.ts`, `AIRoleplayView.tsx`, `PronunciationCorrectionReport.tsx`, `UserProfileModal.tsx`, `SurpriseParentNagPopup.tsx`, `GitHubUpdateModal.tsx`, `ErrorBoundary.tsx`, `server.ts`)**:
  - `{ items/words/goals: [...] }` 래핑 JSON 배열 언래핑 및 롤플레잉/음소 드릴/열거형 정규화 적용.
  - BYOK 안내 모달 1-클릭 무료 AI 전환 버튼 추가, 커스텀 대본 파싱 정화(`safeJsonParse`+`sanitizeDeepObject`), APK 다운로드 URL 검증 및 타이머 정리, `ErrorBoundary` AI 모드 보존, `/api/health`·`/api/apk/info` live `4.4.1` 응답 통일 및 전체 문서 동기화 완료.

---

## 📌 Milestone: v4.4.0 — 전 세계 API 키 없는 무료 오픈 AI 다중 워터폴 엔진 탑재
- **실시간 검증된 글로벌 키리스 무료 AI 3종 통합 (`freeAiService.ts`, `apiClient.ts`, `server.ts`)**:
  - Pollinations AI (`text.pollinations.ai`), Cloudflare Workers AI Gateway (`devtoolbox-api.workers.dev`), MLVoca Public Ollama (`mlvoca.com`) 실응답 검증 후 브라우저 직결(Per-User IP) + Express 프록시 2계층 워터폴 구현.
  - DeepSeek `<think>`·코드펜스 정화 및 프로토타입 오염 방지(`extractJsonFromAiText`) + 한국어 스키마 검증 적용.
- **전 UI 기능 키리스 무료 AI 해금 (`ApiKeyModal.tsx`, `Navbar.tsx`, `AIRoleplayView.tsx`, `AIGenerator.tsx`, `PronunciationCorrectionReport.tsx`, `UserProfileModal.tsx`, `CommercialDictionarySearch.tsx`, `App.tsx`)**:
  - 5종 엔진 선택기(`auto_free`, `pollinations`, `cloudflare_free`, `mlvoca`, `gemini_byok`) 및 실시간 지연시간 연결 테스터 구축, `AIRoleplayView` API 키 잠금 해제, 구형 `gemini-2.5-flash` 테스트 URL을 `gemini-3.1-flash-lite`로 교정.

---

## 📌 Milestone: v4.3.2 — 자아성찰 심층 감사(Deep Audit) · 버그 수정 & 문서 전면 현행화
- **스토리지 Compact v2 정확성 및 중복 차단 (`deviceStorageService.ts`, `autoSavePersistenceService.ts`)**:
  - `edu3000-*`, `curr-*`, `elem-sent-*`, `mid-sent-*`, `sat-sent-*` ID 프리픽스 인식을 추가해 기본 목록 인자 누락 시에도 3,210단어 전체 덤프를 방지했습니다.
  - 긴급 스냅샷(`flushEmergencyAppState`)에 기본 커리큘럼 인자를 전달하고 복원 시 정규화 키 기준 제자리 덮어쓰기 병합을 적용했습니다.
- **음성·오디오 비동기 레이스 컨디션 및 메모리 누수 해소 (`PronunciationCorrectionReport.tsx`, `ShadowingQuizView.tsx`, `PronunciationModal.tsx`)**:
  - `AbortController` + 디바운스로 초기 텍스트 인식과 지연 도착 `audioBlob` 간 이중 AI 요청 경합을 차단했습니다.
  - `ShadowingQuizView`의 `phaseRef`/`transcriptRef` 최신화 및 타이머·ObjectURL 정리, `PronunciationModal`의 `readyState >= 1` 즉시 구간 재생 분기 및 플립 타이머 정리를 완료했습니다.
- **Focus Routine 세션 큐 보호 · 전역 `alert()` 제거 · 서버 모델 현행화**:
  - `FocusRoutinePlayer` 세션 스냅샷 적용, 앱 내 모든 잔여 `alert()` 호출 비차단 토스트화, `handleImportData`의 `safeJsonParse`+`sanitizeDeepObject` 적용, 미사용 `PronunciationDeficiencyHighlighter.tsx` 삭제.
  - `server.ts` 지원 모델 라인업(`gemini-4-hydrogen`, `gemini-3.1-flash-lite`) 및 동적 버전/APK 메타 추출 정비, `README.md`·`docs/*`·`metadata.json`·`index.html` v4.3.2 전면 동기화.

---

## 📌 Milestone: v4.3.0 ~ v4.3.1 — AI 음소 발음 교정 리포트 & 5MB 저장소 95.2% 포화 해결
- **AI 음소(Phoneme) 단위 발음 교정 리포트 (`v4.3.0`)**:
  - `phonemeAnalysisUtils.ts`, `PronunciationCorrectionReport.tsx`, `pronunciationReportService.ts`, `/api/ai/pronunciation-report` 구축.
  - 구강 단면도 SVG 조음 위치 시각화, 내 발음 음소 구간 슬라이스 재생, 최소대립쌍 비교 연습 지원.
- **Compact v2 델타 압축 & 원클릭 JSON 백업 후 캐시 정리 (`v4.3.1`)**:
  - `localStorage` 점유율을 95.2%에서 5% 미만으로 경량화하고, `JsonBackupModal` 원클릭 백업+정리 및 실시간 게이지 갱신 구현.

---

## 📌 Milestone: v4.1.0 ~ v4.2.0 — 초심자 미니멀 `TodayHub` · SM-2 SRS · 3,210개 학년별 예문 교체
- **React.lazy 코드 분할 & Tailwind v4 토큰 · `TodayHub` / `FocusRoutinePlayer` / `srsEngineService.ts` 구축 (`v4.1.0`)**.
- **기존 상용구 예문 3,021건 전면 삭제 및 초등·중학·고등/수능 학년별 실사용 예문·번역 교체 (`v4.2.0`)**.

---

## 📌 이전 작업 내역 (Milestone: v3.58.0 엄마·아빠 잔소리 영어/한글 이중 지원 & 음성 자막 HUD)
- **원어민 영어 잔소리 대본 탑재**: 츤데레, 엄격, 다정 톤 및 30분 휴식 등 모든 상황에 원어민 영어(`toneDataMapEn`, `fallbackSituationsMapEn`) 대본 추가
- **3단 언어 모드 지원**: `[🇰🇷 한글]`, `[🇺🇸 English]`, `[🌐 한+영 듀얼]` 팝업 상단 및 HUD 하단 토글 제공
- **한+영 듀얼 순차 재생**: 영어(`en-US`) 발화 후 한국어(`ko-KR`) 연속 재생으로 청취 및 의미 연계 극대화
- **실시간 이중 자막 & 발화 중 네온 하이라이트**: 현재 발화 중인 언어에 맞춰 동적 링 및 엠버 하이라이트 제공

---

## 📌 이전 작업 내역 (Milestone: v3.11.0 GitHub 자동 배포 및 업데이트 시스템 구축)

### 1. 깃허브 자동 연동 및 다단 동적 버전 추출 파이프라인
- **버전 하드코딩 제거 (Single Source of Truth 구축):** `package.json`, `src/constants/version.ts`, `docs/PATCH_NOTES.md` 연동.
- **자동화 스크립트 작성:** `scripts/github-sync.bat`, `scripts/github-sync.sh`, GitHub Actions CI/CD (`.github/workflows/release.yml`).

### 2. GitHub Releases 기반 실시간 자동 업데이트 시스템
- `src/services/githubUpdateService.ts`, `src/components/GitHubUpdateModal.tsx` 구축.

### 3. 문서화 표준 구축
- `docs/SECURITY_REPORT.md`, `docs/DLL_SPECS.md`, `docs/LICENSE_KR.md`, `docs/LICENSE_EN.md`, `docs/SELF_REFLECTION_AUDIT.md` 신설 및 유지보수.
