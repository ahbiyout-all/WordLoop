# WordLoop 프로젝트 작업 로그 (WorkLog)

**최종 작업 일시:** 2026-10-03  
**담당 개발자:** AI Engineering Agent  
**GitHub 리포지토리:** https://github.com/ahbiyout-all/WordLoop

---

## 📌 작업 내역 (Milestone: v3.11.0 GitHub 자동 배포 및 업데이트 시스템 구축)

### 1. 깃허브 자동 연동 및 다단 동적 버전 추출 파이프라인
- **버전 하드코딩 제거 (Single Source of Truth 구축):**
  - 1차: `package.json`에서 Node.js를 통해 `version` 자동 파싱
  - 2차: PowerShell을 통한 `package.json` JSON 변환 추출 (Node 미설치 대비)
  - 3차: `docs/PATCH_NOTES.md` 최상단 헤더 정규식 파싱 (`## 🚀 Version ([0-9]+\.[0-9]+\.[0-9]+)`)
- **자동화 스크립트 작성:**
  - Windows 배치 스크립트: `scripts/github-sync.bat`, `github-sync.bat`
  - Linux/macOS 쉘 스크립트: `scripts/github-sync.sh`, `github-sync.sh`
  - 자동 커밋 메시지 연동: `chore(release): WordLoop v%APP_VER% - automated sync & documentation`
  - 태그 자동 생성 및 푸시: `git tag -fa v%APP_VER%`, `git push -u origin main --follow-tags`

### 2. GitHub Releases 기반 실시간 자동 업데이트 시스템
- **업데이트 서비스 구축 (`src/services/githubUpdateService.ts`):**
  - `https://api.github.com/repos/ahbiyout-all/WordLoop/releases/latest` 실시간 조회
  - Semver 기반 버전 비교 및 로컬 캐싱(30분 주기)
  - PC(.exe), 안드로이드(.apk), iOS 패키지 다운로드 URL 자동 추출
- **업데이트 센터 UI 구축 (`src/components/GitHubUpdateModal.tsx`):**
  - 현재 버전 vs 최신 버전 대조 표시
  - 원클릭 기기별 설치파일(PC, APK, iOS, Web) 직접 다운로드
  - 최신 릴리스 패치노트 마크다운 프리뷰
  - 상단 `Navbar`에 신규 릴리스 알림 펄스 배지 연동

### 3. 멀티플랫폼 빌드 파이프라인 (PC, Android, iOS)
- **PC 데스크톱 (Windows .exe):**
  - Electron-Builder 기반 NSIS 인스톨러 및 포터블 실행파일 빌드 구성
  - `build-pc.bat` 동적 버전 연동 및 영어 콘솔 규격화
- **안드로이드 (Android .apk):**
  - Capacitor Android 모듈 동기화 및 Gradle 자동 빌드
  - `build-android.bat` 동적 버전 연동
- **아이폰 / iOS (PWA & Xcode Package):**
  - `scripts/sync-ios.js`, `build-ios.bat`, `build-ios.sh` 신설
  - Safari '홈 화면에 추가' 1초 무인증서 전체화면 PWA 가이드 완비
  - GitHub Actions `macos-latest` 워크플로를 통한 iOS 프로젝트 아카이브 패키징
- **GitHub Actions CI/CD (`.github/workflows/release.yml`):**
  - `v*` 태그 푸시 시 Web, Windows (.exe), Android (.apk), iOS (.zip) 4개 플랫폼 동시 빌드 후 GitHub Release 자동 생성 및 에셋 첨부

### 4. 불필요 파일 정리 및 .gitignore 무결성 강화
- 불필요한 `bun.lock` (81KB) 파일 즉시 영구 삭제 조치
- `.gitignore`에 의존성, 빌드 산출물, 캐시, OS 파일, 로그 및 환경변수 차단 규칙 전면 적용

### 5. 문서화 표준 충족
- `docs/SECURITY_REPORT.md` (보안 점검 보고서 신설)
- `docs/DLL_SPECS.md` (모듈 및 시스템 DLL/패키지 명세서 신설)
- `docs/LICENSE_KR.md` 및 `docs/LICENSE_EN.md` (다국어 라이선스 신설)
- `README.md` (설치, 빌드, GitHub 동기화, 업데이트 방법 전면 개정)
