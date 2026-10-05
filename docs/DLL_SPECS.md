# WordLoop 모듈 및 네이티브 패키지 명세서 (DLL & Module Specs)

**문서 버전:** v3.12.0  
**프로젝트:** WordLoop AI Multi-Platform Suite  
**레포지토리:** https://github.com/AhBiYout/WordLoop

---

## 1. 🏗️ 아키텍처 및 모듈 계층 구조

WordLoop는 크로스 플랫폼 호환성과 독립적인 실행을 보장하기 위해 다음과 같은 5대 핵심 모듈 계층으로 분리 설계되었습니다:

```
[UI / Presentation Layer (React 19 + Tailwind CSS + Lucide)]
                        │
[Application State & Learning Engines (Vocab, Quiz, Roleplay, Games)]
                        │
[Audio Processing & Waveform Analysis (VAD, PCM, Web Audio API)]
                        │
[Cross-Platform Native Bridge / Wrapper]
  ├─ 💻 Electron Desktop Bridge (Windows x64 / macOS / Linux)
  ├─ 📱 Capacitor Mobile Bridge (Android Java/Kotlin + iOS Swift)
  └─ 🌐 Modern Browser Web Worker / PWA Layer
                        │
[Local Persistence Vault (IndexedDB + LocalStorage + JSON Export)]
```

---

## 2. 📦 핵심 모듈 및 컴포넌트 명세

### 2.1 💻 PC 데스크톱 네이티브 래퍼 (Electron Native Wrapper)
- **엔트리 포인트:** `electron/main.cjs`, `electron/preload.cjs`
- **실행 모드:** 단일 인스턴스 락(Single Instance Lock), 하드웨어 가속 최적화, 보안 샌드박스
- **빌드 도구:** `electron-builder` (`scripts/build-electron.js`)
- **패키징 산출물:**
  - 설치형 인스톨러: `WordLoop-v{version}-Windows-Setup.exe` (NSIS)
  - 무설치 포터블: `WordLoop-v{version}-Windows-Portable.exe`
- **주요 기능:**
  - 창 크기 자동 저장 및 복원
  - 로컬 오프라인 모드(인터넷 연결 없이도 3,000단어 및 13종 게임 100% 실행)
  - 마이크 권한 네이티브 요청 및 백그라운드 오디오 유지

### 2.2 📱 모바일 네이티브 브릿지 (Capacitor Android & iOS)
- **설정 파일:** `capacitor.config.json`
  - `appId`: `com.wordloop.app`
  - `appName`: `WordLoop`
- **안드로이드:**
  - 빌드 타겟: Android SDK 34 (Android 14+ 호환)
  - 빌드 스크립트: `scripts/sync-android.js`
  - 산출물: `WordLoop-v{version}.apk` (Debug/Release APK)
- **아이폰 / iOS:**
  - 빌드 타겟: iOS 15.0+ (Xcode 프로젝트 및 CocoaPods 브릿지)
  - 빌드 스크립트: `scripts/sync-ios.js`
  - 산출물: `WordLoop-iOS-Project-v{version}.zip` / PWA 전체화면 설치

### 2.3 🎙️ 실시간 음성 분석 및 파형 동기화 엔진 (`audioWaveformUtils.ts`)
- **주요 모듈:**
  - `Voice Activity Detection (Smart VAD)`: 단어/문장 길이에 따른 묵음 감지 및 녹음 자동 정지
  - `PCM Waveform Superimposition`: 원어민 오디오와 사용자 녹음 오디오 파형 정규화 및 1:1 오버레이
  - `Syllable Alignment Engine`: 음절 단위 진단 점수 및 발음 미흡 구간 추출

### 2.4 🎯 취약 어휘 타겟 복습 퀴즈 엔진 (`QuizMode.tsx`)
- **마스터 등급:**
  - `0단계`: 미암기 (초기 상태 또는 오답 단어)
  - `1단계`: 학습중 (1회 이상 정답 또는 학습 진행)
  - `2단계`: 완벽 암기 마스터
- **실시간 승급 파이프라인:**
  - 0단계 단어 정답 시 ➔ 1단계 승급
  - 1단계 단어 정답 시 ➔ 2단계 승급
  - 오답 시 ➔ 0단계 유지 및 상세 오답 리포트(단어, 발음기호, 뜻, 예문) 노출

### 2.5 🔄 GitHub Releases 실시간 자동 업데이트 엔진 (`githubUpdateService.ts`)
- **API 엔드포인트:** `https://api.github.com/repos/AhBiYout/WordLoop/releases/latest`
- **동작 방식:**
  - 앱 시작 시 백그라운드로 최신 릴리스 버전 조회
  - 현재 버전과 Semver 비교 (`compareVersions`)
  - 신규 버전 발견 시 상단 네비게이션 바 배지 및 모달(`GitHubUpdateModal.tsx`) 알림
  - PC(.exe), 안드로이드(.apk), iOS 패키지 직접 다운로드 링크 제공
