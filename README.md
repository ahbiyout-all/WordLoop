# 🔤 WordLoop (v3.18.0)

**WordLoop**는 초·중·고·수능 및 비즈니스 영어 어휘(교육부 필수 3,210단어)와 500+ 실전 예문, 5대 순수 창작 고속 네이티브 DLL(AudioEngine, FastDB, SRSNeuralEngine, MorphEngine, TrayHook), 14종 인터랙티브 단어·문장 게임(신규 플래시카드 리콜 포함), 취약 어휘(0~1단계) 맞춤 복습 퀴즈, 8종 스마트 퀴즈 모드, 실시간 음성 파형 발음 측정, 그리고 초·중·고 교육과정 연계 원어민 AI 대화형 롤플레잉을 결합한 올인원 영어 학습 & 자기계발 플랫폼입니다.

- **🌐 웹 애플리케이션 바로가기 (GitHub Pages):** [https://ahbiyout-all.github.io/WordLoop/](https://ahbiyout-all.github.io/WordLoop/)
- **📁 GitHub Repository:** [https://github.com/ahbiyout-all/WordLoop](https://github.com/ahbiyout-all/WordLoop)
- **📦 GitHub Releases (기기별 설치파일 다운로드):** [https://github.com/ahbiyout-all/WordLoop/releases](https://github.com/ahbiyout-all/WordLoop/releases)

---

## ✨ 핵심 기능 (Core Features)

- **🎯 취약 어휘 맞춤 집중 복습 퀴즈 (Review Quiz - v3.11.0)**:
  - 마스터 레벨 0단계(미암기) 및 1단계(학습중) 단어만을 정밀 타겟팅하여 정답 시 실시간 등급 승급(0➔1➔2단계 마스터)
  - 오답 시 단어·발음기호·뜻·예문 피드백 카드 제공 및 0단계 유지로 약점 집중 훈련
- **🔄 GitHub Releases 실시간 자동 업데이트 시스템**:
  - 앱 시작 시 최신 릴리스 자동 확인, 네비게이션 알림 배지 및 원클릭 기기별 설치파일(PC, Android APK, iOS, Web) 직접 다운로드
- **🎒 초·중·고 교육과정 연계 실전 원어민 AI 롤플레잉**:
  - 초등 필수 800어휘, 중학 1,200어휘, 고등/수능 2,000어휘 연계 30여 개 실전 대화 시나리오 탑재
- **🎙️ 실시간 음성 파형(Audio Waveform) 비교 & 발음 측정**:
  - 원어민 발음 파형과 내 발음 파형 1:1 오버레이 비교, 음절별 정확도 진단 및 부정확 구간 즉시 재청취
- **🎮 14종 게이미피케이션 (단어 9종 + 문장 5종)**:
  - 플래시카드 4지선다 리콜, 단어 짝맞추기, 크로스워드, 스와이프 매칭, 버블팝, 25초 스피드, 문장 어순 블록 조립, 청취 빈칸 채우기 등
- **💾 100% 온디바이스 로컬 저장 & 95%+ 오프라인 작동**:
  - 외부 서버 없이 기기 내 로컬 스토리지 & IndexedDB 자동 저장 및 JSON 백업/복원
- **🛡️ 풀스택 보안 표준 준수**:
  - API Rate Limiting, 헤더 전용 API 키 검증(`x-gemini-api-key`), JSON 프로토타입 오염 방어, CSV 수식 인젝션 방지

---

## 🚀 깃허브(GitHub) 자동 업로드 & 배포 파이프라인

WordLoop는 **다단 동적 버전 추출 메커니즘(Single Source of Truth)**을 통해 버전을 단일 소스로 관리하며, 스크립트 실행 한 번으로 깃허브 푸시, 태그 생성, 릴리스 빌드가 자동으로 이루어집니다.

### 📌 깃허브 원클릭 자동 동기화 스크립트 실행
- **Windows (권장)**:
  ```cmd
  github-sync.bat
  # 또는
  call scripts\github-sync.bat
  ```
- **macOS / Linux**:
  ```bash
  chmod +x scripts/github-sync.sh
  ./github-sync.sh
  ```

> 💡 **버전 자동 연동 메커니즘**:
> 1. `package.json`의 `"version"` 값 자동 추출 (1차 기준)
> 2. `docs/PATCH_NOTES.md` 최상단 헤더 정규식 파싱 (2차 Fallback)
> 3. Git 커밋 메시지(`chore(release): WordLoop vX.Y.Z`), 릴리스 태그(`vX.Y.Z`), 콘솔 타이틀이 완전히 자동으로 연동되어 GitHub로 푸시됩니다.
> 4. GitHub Actions가 자동으로 트리거되어 PC (.exe), Android (.apk), iOS 패키지, Web 번들을 빌드하고 GitHub Releases에 자동 등록합니다.

---

## 💻 기기별 빌드 및 설치 안내 (PC, Android, iOS)

### 1. 💻 Windows PC 데스크톱 앱 (.exe)
```cmd
build-pc.bat
# 또는
npm run build:pc
```
- 산출물: `dist_electron/WordLoop-v3.11.0-Windows-Setup.exe` (인스톨러) 및 Portable 실행파일

### 2. 📱 안드로이드 모바일 앱 (.apk)
```cmd
build-android.bat
# 또는
npm run build:android
```
- 콘솔 직접 빌드: `cd android && gradlew.bat assembleDebug`
- 산출물: `android/app/build/outputs/apk/debug/app-debug.apk`

### 3. 🍎 아이폰(iOS) & 아이패드
```cmd
build-ios.bat
# 또는 (macOS 환경)
npm run build:web && npx cap sync ios && npx cap open ios
```
- **아이폰 간편 1초 설치 (인증서 불필요)**:
  - Safari 브라우저에서 WordLoop 접속 후 공유 아이콘 ➔ **'홈 화면에 추가(Add to Home Screen)'**를 누르면 App Store 앱과 완전히 동일한 전체화면 Standalone 웹앱으로 동작합니다.

---

## 🛠️ 개발 서버 로컬 실행 (Local Development)

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행 (Port 3000)
npm run dev

# 3. 린트 및 타입 검사
npm run lint

# 4. 웹 프로덕션 빌드
npm run build
```

---

## 📂 프로젝트 디렉토리 구조

```
WordLoop/
├── .github/workflows/         # GitHub Actions CI/CD (멀티플랫폼 자동 빌드 & 릴리스)
│   └── release.yml
├── docs/                      # 프로젝트 표준 문서
│   ├── PATCH_NOTES.md         # 버전별 패치 내역 (Single Source of Truth)
│   ├── SECURITY_REPORT.md     # 보안 점검 보고서
│   ├── DLL_SPECS.md           # 모듈 및 네이티브 패키지 명세서
│   ├── LICENSE_KR.md          # 다국어 라이선스 (한국어)
│   ├── LICENSE_EN.md          # 다국어 라이선스 (English)
│   ├── WorkLog.md             # 개발 및 배포 작업 로그
│   └── ARCHITECTURE.md        # 아키텍처 상세 설계서
├── electron/                  # PC 데스크톱 네이티브 래퍼
│   ├── main.cjs
│   └── preload.cjs
├── scripts/                   # 빌드 및 깃허브 자동화 스크립트
│   ├── github-sync.bat        # Windows 깃허브 자동 동기화 & 릴리스
│   ├── github-sync.sh         # Bash 깃허브 자동 동기화 & 릴리스
│   ├── build-electron.js      # PC 패키징 스크립트
│   ├── sync-android.js        # 안드로이드 동기화 스크립트
│   ├── sync-ios.js            # iOS 동기화 스크립트
│   └── build-web.js           # Vite 웹 번들러
├── src/                       # 애플리케이션 소스 코드
│   ├── components/            # UI 컴포넌트 (QuizMode, GitHubUpdateModal 등)
│   ├── services/              # 코어 서비스 (githubUpdateService, speech 등)
│   ├── data/                  # 3,210개 교육과정 어휘, 롤플레잉 시나리오 데이터
│   ├── types.ts               # 공통 타입 정의
│   └── App.tsx                # 메인 애플리케이션 진입점
├── github-sync.bat            # 깃허브 원클릭 푸시 배치파일
├── build-pc.bat               # PC 앱 원클릭 빌드 배치파일
├── build-android.bat          # 안드로이드 앱 원클릭 빌드 배치파일
├── build-ios.bat              # iOS 앱 원클릭 빌드 배치파일
├── capacitor.config.json      # 모바일 앱 메타데이터 설정
├── package.json               # 프로젝트 의존성 및 버전 정보 (v3.11.0)
└── .gitignore                 # 깃허브 클린 업로드 필터 규칙
```

---

## 📄 라이선스 (License)

본 프로젝트는 MIT 라이선스에 따라 자유롭게 사용 및 배포할 수 있습니다. 자세한 내용은 [`docs/LICENSE_KR.md`](./docs/LICENSE_KR.md) 및 [`docs/LICENSE_EN.md`](./docs/LICENSE_EN.md)를 참고하세요.
