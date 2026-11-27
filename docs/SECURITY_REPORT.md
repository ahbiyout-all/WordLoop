# WordLoop 보안 점검 및 보안 강화 보고서 (Security Report)

**문서 버전:** v4.8.0  
**최종 점검일:** 2026-11-27  
**대상 시스템:** WordLoop Web SPA (Vite/React 19), Express API 프록시(`server.ts`), PC 데스크톱(Electron) 및 모바일 패키징

---

## 1. 🛡️ 보안 설계 원칙 (Zero-Trust On-Device First)

WordLoop는 사용자의 학습 기록, 녹음 오디오, 프로필 사진 및 Gemini API 키를 외부 중앙 DB에 보관하지 않고 **클라이언트 온디바이스 저장소(`localStorage` 및 IndexedDB)** 에 격리 보관합니다. 서버(`server.ts`)는 상태 비저장(Stateless) API 프록시 역할만 수행하며 사용자 개인정보나 API 키를 영구 저장하지 않습니다.

---

## 2. 🔍 영역별 보안 통제 및 v4.3.2 ~ v4.4.1 감사 조치 내역

### 2.1 백엔드 API 프록시 · Origin 검증 · Dual-Tier Rate Limiting (`server.ts`)
- **Cross-Origin / CSRF 방어:**
  - `/api/*` 경로 요청에 대해 `Origin` 및 `Referer` 헤더 허용 목록(localhost, 127.0.0.1, `*.run.app`, `*.google.com`, Electron/Capacitor 로컬 스킴)을 검증하여 비인가 외부 출처의 교차 호출을 HTTP 403으로 차단합니다.
- **이중 티어 Rate Limiting & DoS 방어:**
  - 일반 API(`/api/*`): IP당 분당 60회 제한
  - AI 생성 API(`/api/ai/*`): IP당 분당 20회 제한 및 만료 버킷 주기적 정리
- **HTTP 보안 응답 헤더:**
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Download-Options: noopen`, `X-Permitted-Cross-Domain-Policies: none`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=(), usb=()`, `Content-Security-Policy: frame-ancestors 'self' https://*.google.com https://*.run.app https://*.aistudio.google.com;`
- **오디오 업로드 멀티모달 엔드포인트 하드닝 (`/api/ai/pronunciation-report`):**
  - 해당 엔드포인트 전용 JSON 본문 상한을 `3mb`(기타 API는 `256kb`)로 엄격히 분리 제한했습니다.
  - 허용 오디오 MIME 화이트리스트(`audio/webm`, `audio/wav`, `audio/mp4`, `audio/ogg`, `audio/mpeg`, `audio/mp3`) 검증 및 Base64 문자열 길이(`<= 3,200,000`자) · 문자셋 정규식(`/^[A-Za-z0-9+/=]+$/`) 검증을 적용해 비정상 바이너리 인젝션을 차단합니다.
- **API 키 격리 · BYOK 엄격 검증 · 무료 AI 엔드포인트 화이트리스트 (v4.4.1 보강):**
  - 사용자 개인 API 키는 URL 쿼리가 아닌 `x-gemini-api-key` HTTP 헤더로만 수신(`extractSafeHeaderApiKey`)하고 로그에 남기지 않으며, 외부 제3자 무료 AI 엔드포인트 호출 시 절대 개인 Gemini 키를 포함하지 않습니다.
  - `gemini_byok` 모드 요청 시 개인 키가 없거나 유효하지 않으면 서버 환경변수 키나 모조 성공 응답으로 우회하지 않고 HTTP `401`/`429`/`502`를 반환합니다. `ApiKeyModal` 키 테스트 역시 `sourcesUsed` 내 `'Gemini'` 실제 사용 여부와 `401`/`429`를 엄격히 확인합니다.
  - 무료 오픈 AI 호출 대상 URL(`api.kilo.ai`, `oai.endpoints.kepler.ai.cloud.ovh.net`, `text.pollinations.ai`, `devtoolbox-api.devtoolbox-api.workers.dev`, `api.llm7.io`, `mlvoca.com`)은 코드 내 고정 HTTPS 상수 화이트리스트만 사용하며(사용자 입력 URL SSRF 원천 차단) `x-ai-engine` 헤더도 9종 허용 열거형 검증(`extractSafeAiEngine`)을 거칩니다.
  - 서버 Gemini 호출 시 공식 지원 모델(`gemini-4-hydrogen`, `gemini-3.1-flash-lite`)만 사용하며(모달 직접 테스트 포함), `429 RESOURCE_EXHAUSTED` 오류를 안전하게 처리합니다.

### 2.2 입력 살균 & JSON 프로토타입 오염 방어 (`deviceStorageService.ts`, `App.tsx`, `server.ts`)
- **서버 입력 살균 (`sanitizeInputText`, `sanitizeDeepObject`):**
  - Null Byte(`\0`), 제어 문자, `<script>`/`<iframe>`/`javascript:`/인라인 이벤트 핸들러 및 프롬프트 탈옥 패턴을 정화하며 객체 중첩 깊이를 제한합니다.
- **클라이언트 JSON / Gzip 백업 복원 & 커스텀 대본 보호 (v4.4.1 ~ v4.6.0 강화):**
  - 백업 `.json`/`.json.gz` 파일 크기 상한을 `25MB` (`MAX_IMPORT_FILE_BYTES`)로 검증해 대용량 사진이 포함된 백업을 안전하게 수용하면서도 압축 폭탄(Decompression Bomb) 및 메모리 고갈 DoS를 방어합니다.
  - `App.tsx`의 `handleImportData`뿐만 아니라 `UserProfileModal.tsx`, `SurpriseParentNagPopup.tsx`, `persistentStorageEngine.ts`의 IndexedDB/폴더 복원 경로까지 모두 `safeJsonParse()` + `sanitizeDeepObject()` + 스키마/열거형 정규화 경로로 통일해 `__proto__`, `constructor`, `prototype` 키 주입을 차단했습니다.
  - Schema v2/v3 내보내기/가져오기 시 `computePayloadChecksum` 무결성 검사와 자동 사전 롤백 스냅샷(`wordloop_pre_import_rollback`)을 유지하며, `GitHubUpdateModal` APK 다운로드 경로는 `/` 또는 `https://` 스킴만 허용하도록 검증합니다.

### 2.3 이미지 업로드 · UI 알림 · 스토리지 초기화 안전성
- **이미지 파일 정규화 (`parentPhotoUtils.ts`):**
  - 최대 10MB 크기 제한, SVG 내 스크립트/이벤트 속성 살균, HTML5 Canvas를 통한 JPEG 래스터 재인코딩으로 악성 페이로드 삽입을 방지합니다.
- **블로킹 다이얼로그 전면 제거 (v4.3.2 완료):**
  - `App.tsx`, `UserProfileModal.tsx`, `AIRoleplayView.tsx`, `StudentWordGame.tsx`, `InAppBrowserBanner.tsx` 등에 남아 있던 모든 `alert()` 호출을 비차단 온스크린 토스트/인라인 배너로 교체했습니다.
- **완전 초기화 & 에러 복구 캐시 정리 정확성 (v4.4.1 보강):**
  - `ErrorBoundary` 캐시 초기화 및 `App.tsx` 전체 초기화가 긴급 스냅샷(`wordloop_emergency_exit_snapshot`), 롤백 스냅샷(`wordloop_pre_import_rollback`), 안전 원장(`wordloop_atomic_safety_ledger`)을 누락 없이 정리하며, `ErrorBoundary` 긴급 캐시 정리 시 사용자 Gemini API 키(`wordloop_gemini_api_key`)와 AI 엔진 선택 설정(`wordloop_ai_engine_mode`)은 의도적으로 보존합니다.

### 2.4 데스크톱 Electron 샌드박스 & 파일 시스템 격리 (`electron/main.cjs`, `electron/preload.cjs`)
- 외부 비인가 URL 창 탐색 차단, `setWindowOpenHandler` 팝업 거부, `contextBridge` 화이트리스트 IPC 채널(`preload.cjs`)만 허용합니다.
- v4.6.0에 추가된 `native:fs:*` 백업 핸들러는 사용자가 대화상자(`dialog.showOpenDialog`)로 명시 선택했거나 기본 지정된 `Documents/WordLoop-Backups` 디렉터리 내부로만 쓰기/읽기 경로를 엄격히 격리하며(`path.basename` + `resolveInside` 검증), `.tmp -> rename` 원자적 파일 쓰기를 수행해 임의 경로 탐색(Path Traversal)이나 부분 손상을 차단합니다.

---

## 3. 🎯 점검 결론 (v4.7.0)

WordLoop v4.7.0은 결정론적 온디바이스 학습과학 인지게임 엔진(`cognitiveGameEngine.ts`), 3계층 온디바이스 격리 저장 및 경로 격리된 로컬 파일 동기화, 고정 HTTPS 화이트리스트 기반 7중 키리스 무료 AI 워터폴(개인 키 미전송 보장), BYOK/키 테스트 엄격 격리, 3MB 오디오 페이로드 및 MIME 검증, 전 계층 `safeJsonParse` + `sanitizeDeepObject` 정화, 정적 호스트 비-JSON `/api/*` 응답 방어 및 ESM 청크 무결성을 준수합니다.
