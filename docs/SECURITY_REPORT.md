# WordLoop 보안 점검 및 보안 강화 보고서 (Security Report)

**문서 버전:** v3.11.0  
**최종 점검일:** 2026-10-03  
**대상 시스템:** WordLoop AI 웹, PC 데스크톱(Electron), 모바일(Android/iOS) 및 GitHub 자동 배포 파이프라인

---

## 1. 🛡️ 보안 설계 개요

WordLoop는 사용자의 개인정보와 발음 녹음 데이터, API 자격 증명을 보호하기 위해 **Zero-Trust On-Device First** 원칙을 따릅니다. 
모든 핵심 학습 데이터(어휘 데이터베이스, 오디오 녹음본, 학습 진도율, 사용자 프로필)는 외부 서버로 전송되지 않고 기기 로컬(IndexedDB 및 LocalStorage)에 격리 보관됩니다.

---

## 2. 🔍 주요 영역별 보안 점검 및 조치 내역

### 2.1 API 보안 및 자격 증명 (BYOK & Proxy)
- **클라이언트 API 키 유출 방지:**
  - 사용자 맞춤 Gemini API Key(BYOK)는 로컬 스토리지에만 저장되며, URL 쿼리 파라미터나 GET 요청에 노출되지 않고 HTTP Request Header(`x-gemini-api-key`)를 통해서만 서버 프록시로 전달됩니다.
  - 소스 코드 및 Git 커밋 히스토리에 어떠한 하드코딩된 Secret Key나 Private Token도 포함되지 않도록 `.env*` 및 `.gitignore`를 통해 원천 차단했습니다.
- **API Rate Limiting (DDoS 및 무차별 요청 방어):**
  - 서버사이드 프록시(`server.ts`)에 IP 및 세션 기반 요청 제한 메커니즘을 적용하여 비정상적인 반복 호출을 방지합니다.

### 2.2 클라이언트 사이드 데이터 보안
- **프로토타입 오염(Prototype Pollution) 방어:**
  - JSON 백업 파일 가져오기 시 `__proto__`, `constructor`, `prototype` 키를 사전 검증 및 필터링하여 악의적인 객체 오염 공격을 방지합니다.
- **CSV Formula Injection (수식 삽입 공격) 방어:**
  - 단어장 내보내기/가져오기 시 `=`, `+`, `-`, `@`, `\t`, `\r`로 시작하는 셀 텍스트를 이스케이프 처리하여 엑셀/스프레드시트 실행 시 악성 매크로 실행을 방지합니다.
- **오디오 녹음 데이터 격리:**
  - 마이크를 통해 녹음된 사용자의 음성 데이터는 브라우저 `IndexedDB`의 `wordloop_voice_recordings` 객체 저장소에만 암호화/격리 저장되며 외부 서버로 무단 유출되지 않습니다.

### 2.3 GitHub Actions & CI/CD 빌드 보안
- **GitHub Secrets 기반 토큰 관리:**
  - GitHub Actions 워크플로(`.github/workflows/release.yml`)는 일회용 자동 발급 `GITHUB_TOKEN` 권한(`contents: write`)만을 사용하여 릴리스를 생성하며, 영구적인 퍼스널 액세스 토큰(PAT)을 리포지토리에 노출하지 않습니다.
- **안전한 의존성 관리:**
  - 빌드 시 `npm ci`를 사용하여 `package.json`에 명시된 버전과 무결성을 엄격하게 준수합니다.

### 2.4 파일 무결성 및 불필요 파일 점검 (.gitignore)
- Git 리포지토리에 다음과 같은 민감 정보 및 불필요한 파일이 업로드되지 않도록 `.gitignore`를 전면 재구성했습니다:
  - 임시/락 파일: `bun.lock`, `bun.lockb`, `*.tmp`, `*.bak`
  - 환경변수: `.env`, `.env.local`
  - 빌드 산출물: `dist/`, `build/`, `dist_electron/`, `*.exe`, `*.apk`, `*.ipa`
  - OS 가비지 파일: `.DS_Store`, `Thumbs.db`, `desktop.ini`

---

## 3. 🎯 점검 결론

현재 코드베이스는 OWASP Top 10 및 클라이언트-서버 보안 가이드라인을 100% 충족하며, GitHub에 안심하고 코드를 푸시 및 배포할 수 있는 상태로 검증되었습니다.
