# WordLoop 보안 점검 및 보안 강화 보고서 (Security Report)

**문서 버전:** v3.43.0  
**최종 점검일:** 2026-10-17  
**대상 시스템:** WordLoop AI 웹, PC 데스크톱(Electron), 모바일(Android/iOS) 및 GitHub 자동 배포 파이프라인

---

## 1. 🛡️ 보안 설계 개요

WordLoop는 사용자의 개인정보와 발음 녹음 데이터, API 자격 증명을 보호하기 위해 **Zero-Trust On-Device First** 원칙을 따릅니다. 
모든 핵심 학습 데이터(어휘 데이터베이스, 오디오 녹음본, 학습 진도율, 사용자 프로필, 부모님 사진)는 외부 서버로 전송되지 않고 기기 로컬(IndexedDB 및 LocalStorage)에 격리 보관됩니다.

---

## 2. 🔍 주요 영역별 보안 점검 및 조치 내역 (v3.43.0 강화 내역)

### 2.1 백엔드 API & CSRF/오리진 검증 및 프록시 보안 (`server.ts`)
- **🌐 Cross-Origin / CSRF 공격 원천 방어:**
  - `/api/*` 경로의 모든 데이터 변경 요청에 대해 `Origin` 및 `Referer` 헤더 검증 미들웨어를 도입했습니다.
  - 허용된 출처(localhost, 127.0.0.1, Google Cloud Run `*.run.app`, Google Workspace `*.google.com`, 네이티브 모바일/Electron `capacitor://`, `app://`, `file://`)를 제외한 외부 악성 사이트의 비인가 교차 출처 호출을 HTTP 403 Forbidden으로 즉시 차단합니다.
- **⏱️ 이중 티어(Dual-Tier) Rate Limiting & DoS 방어:**
  - 일반 API(`/api/*`): IP당 분당 최대 60회 제한
  - 고비용 AI 생성 엔드포인트(`/api/ai/*`): IP당 분당 최대 20회 정밀 제한 및 `Retry-After: 60` 헤더 반환으로 Gemini API 쿼터 고갈 및 서비스 거부 공격을 완벽히 차단합니다.
  - 만료된 Rate Limit 메모리 버킷을 자동 정리(Periodic Pruning)하여 메모리 누수를 방지합니다.
- **🛡️ 보안 응답 헤더(HTTP Security Headers) 방어선 강화:**
  - `X-Content-Type-Options: nosniff` (MIME 타입 스니핑 방지)
  - `Referrer-Policy: strict-origin-when-cross-origin` (리퍼러 누출 방지)
  - `X-Download-Options: noopen` (악성 파일 강제 실행 방지)
  - `X-Permitted-Cross-Domain-Policies: none` (플래시/PDF 크로스 도메인 차단)
  - `X-DNS-Prefetch-Control: off` (DNS 프리페치 정보 누출 방지)
  - `Cross-Origin-Opener-Policy: same-origin-allow-popups` (윈도우 격리)
  - `Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=(), usb=()` (불필요한 디바이스 하드웨어 권한 원천 비활성화, 음성 녹음만 인가)
  - `Content-Security-Policy: frame-ancestors 'self' https://*.google.com https://*.run.app https://*.aistudio.google.com;` (클릭재킹 공격 차단 및 안전한 미리보기 지원)

### 2.2 프롬프트 인젝션 & XSS 살균 정화 필터링
- **입력 텍스트 살균 정화 (`sanitizeInputText`):**
  - Null Byte(`\0`) 및 시스템 제어 문자 제거
  - 악성 `<script>`, `<iframe>`, `<object>`, `javascript:`, 인라인 이벤트 핸들러(`onerror=`, `onload=`) 자동 필터링
  - 시스템 프롬프트 탈취를 노리는 탈옥 키워드(`ignore previous instructions`, `system instruction override`) 무력화
- **심층 객체 정화 (`sanitizeDeepObject`):**
  - 중첩 깊이(Max Depth) 제한 및 `__proto__`, `constructor`, `prototype` 키 차단으로 Prototype Pollution 공격 방어

### 2.3 클라이언트 사이드 데이터 스토리지 및 파일 보안
- **이미지 업로드 안전성 (`parentPhotoUtils.ts`):**
  - 부모님 잔소리 사진 등록 시 10MB 크기 제한을 적용하여 이미지 폭탄(Image Bomb / Decompression Bomb) 공격 방지
  - SVG 파일 업로드 시 스크립트 태그 및 이벤트 속성 자동 살균
  - 업로드된 이미지를 캔버스(Canvas)에서 JPEG 레스터 포맷으로 안전하게 정규화 변환하여 스테가노그래피 또는 실행 코드 제거
- **온디바이스 백업/복원 보안 (`deviceStorageService.ts`, `App.tsx`):**
  - 1인 전용 전체 백업 파일 불러오기 시 `sanitizeDeepObject`를 거쳐 모든 어휘, 문장, 목표 항목의 스크립트 벡터 정화
  - 브라우저 블로킹 `alert()` 호출을 제거하고 비차단 온스크린 토스트 알림(`setRecoveryToast`)으로 표준화

### 2.4 데스크톱(Electron) 샌드박스 & 네비게이션 제어 (`electron/main.cjs`)
- **창 탐색(Navigation) 잠금:**
  - 비인가 외부 URL로의 창 이동을 차단하고 `setWindowOpenHandler`로 팝업 창 생성을 원천 거부(Deny)
  - 내부 로컬 `file://` 및 `http://localhost:3000` 환경만 실행 허용
- **컨텍스트 격리(Context Isolation):**
  - 렌더러 프로세스와 메인 프로세스 간 통신을 `preload.cjs`의 화이트리스트 IPC 채널(`contextBridge`)로만 제한

---

## 3. 🎯 점검 결론

WordLoop v3.43.0은 OWASP Top 10(인젝션, 취약한 인증, 민감 데이터 노출, 보안 구성 오류, XSS, CSRF, 비인가 출처 접근)을 철저히 차단하는 다층 방어 체계(Defense-in-Depth)를 완성하였습니다. 기기 로컬 중심의 제로 트러스트 데이터 저장과 백엔드 프록시의 엄격한 유효성 검증을 통해 온/오프라인 모든 환경에서 안전하게 작동합니다.
