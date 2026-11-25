# 🔤 WordLoop (v4.5.1)

**WordLoop**는 초·중·고·수능 3,210개 필수 어휘(학년별 맞춤형 실전 예문 포함)와 **API 키 없는 전 세계 무료 오픈 AI 7중 워터폴 엔진(OVHcloud 70B · Kilo 550B · Pollinations · Cloudflare Workers AI · LLM7 · MLVoca · 온디바이스 Chrome Gemini Nano)**, **TodayHub 3분 집중 루틴**, **SM-2 간격 반복(SRS)**, **AI 음소(Phoneme) 단위 발음 교정 리포트 & 구강 조음 위치 시각화**, **Compact v2 델타 로컬 저장 엔진(<5% 용량 점유)**, **12종+ 단어·문장 게임**, 그리고 **원어민 AI 대화형 롤플레잉**을 하나로 통합한 1인 전용 온디바이스 영어 학습 플랫폼입니다.

- **🌐 웹 애플리케이션 바로가기 (GitHub Pages):** [https://ahbiyout-all.github.io/WordLoop/](https://ahbiyout-all.github.io/WordLoop/)
- **📁 GitHub Repository:** [https://github.com/ahbiyout-all/WordLoop](https://github.com/ahbiyout-all/WordLoop)
- **📦 GitHub Releases (기기별 설치파일 다운로드):** [https://github.com/ahbiyout-all/WordLoop/releases](https://github.com/ahbiyout-all/WordLoop/releases)

---

## ✨ 핵심 기능 (Core Features)

- **🧭 미니멀 `TodayHub` & `FocusRoutinePlayer` 3분 루틴 (v4.1.0+)**:
  - 복잡한 다중 위젯 대신 **'오늘의 3분 루틴 시작'** CTA와 5개 우선순위 단어 스트립 중심으로 진입 동선을 단순화했습니다.
  - `듣고 뜻 확인 → 4지선다 회상 → 발음/자가 평가(SM-2)` 3단계 루틴을 방해 없이 완주하며, 루틴 시작 시점의 큐 스냅샷을 유지해 진행 도중 카드가 건너뛰지 않습니다.
- **🧠 클라이언트 SM-2 간격 반복 엔진 (`srsEngineService.ts`)**:
  - 기존 `masteryLevel (0/1/2)`과 무손실 호환되는 SM-2 알고리즘(`Again / Hard / Good / Easy`)으로 오늘 복습이 필요한 단어와 다음 복습 일정을 자동 스케줄링합니다.
- **📚 전 학년 맞춤형 3,210개 커리큘럼 어휘 & 실전 예문 (v4.2.0+)**:
  - 상용구 안내 문구를 전면 제거하고 초등·중학·고등/수능 눈높이에 맞춘 3,210개 고유 영어 예문 및 한국어 번역을 탑재했습니다.
- **🎙️ AI 음소(Phoneme) 단위 발음 교정 리포트 & 구강 SVG 시각화 (v4.3.0+)**:
  - 단순 0~100점 숫자 대신 각 음소의 IPA 변화(`/θ/→/s/`, `/r/→/l/`, 어말 자음 탈락 등), 구강 단면도 SVG 조음 위치(혀/치아/입술), 내 녹음 구간 슬라이스 재생, 최소대립쌍(`think ↔ sink`) 비교 드릴을 제공합니다.
  - API 키 없이 무료 AI 음소 교정을 기본 지원하며, 개인 Gemini 키 등록 시 녹음 오디오 직접 청취 멀티모달 분석(`/api/ai/pronunciation-report`)까지 지원합니다.
- **🌐 API 키 없는 전 세계 무료 AI 7중 자동 워터폴 엔진 (v4.4.0 ~ v4.5.0)**:
  - 회원가입·API 키 없이 **OVHcloud EU AI (DeepSeek V4.1 · Llama 3.3 70B · Mistral 24B · GPT-OSS 20B · Gemma 4)**, **Kilo AI Gateway (최대 550B Nemotron Ultra · 서버 프록시)**, **Pollinations AI**, **Cloudflare Workers AI**, **LLM7 Open Gateway**, **MLVoca Ollama (DeepSeek R1 · TinyLlama)**, 그리고 **Chrome 내장 온디바이스 Gemini Nano**까지 총 7중 워터폴 체인이 자동 동작합니다.
  - AI 원어민 롤플레잉, AI 단어/목표 생성, AI 뉘앙스 해설, 오픈사전 한국어 분석, 발음 음소 교정 리포트, 부모님 맞춤 대본 생성을 모두 API 키 ZERO 상태로 바로 이용할 수 있습니다.
- **🗜️ Compact v2 델타 저장소 & Schema v2 JSON 스마트 병합 (v4.1.0 ~ v4.3.2)**:
  - 3,210개 내장 정적 데이터를 반복 저장하지 않고 학습 진도와 사용자 추가·수정 항목만 델타 압축 저장해 5MB `localStorage` 사용률을 **95.2% → 5% 미만**으로 절감합니다.
  - **JSON 백업 후 캐시 정리** 원클릭 도구, 내보내기 체크섬 무결성 검증, 자동 롤백 스냅샷 기반 스마트 병합(Smart Merge)을 지원합니다.
- **⚡ `React.lazy` 온디맨드 코드 분할 & 12종+ 게이미피케이션**:
  - 초기 진입 시 `TodayHub`와 오디오 루프만 즉시 로드하고, 3탭 `StatsDashboard`, 미니게임, 사전, AI 롤플레이 및 모달을 지연 로딩 청크로 분리했습니다.
- **🛡️ 온디바이스 프라이버시 & 풀스택 보안 표준 준수**:
  - 100% 기기 로컬 저장, 비차단 온스크린 토스트 표준화(`alert()` 제거), API Rate Limiting, Origin/Referer 검증, `safeJsonParse` 프로토타입 오염 방어 및 XSS 살균 처리를 적용했습니다.

---

## 🛠️ 개발 서버 로컬 실행 (Local Development)

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행 (Port 3000)
npm run dev

# 3. 타입 검사 (Strict Lint)
npm run lint

# 4. 웹 + 서버 프로덕션 빌드
npm run build
```

---

## 💻 기기별 빌드 및 GitHub 자동 배포 파이프라인

WordLoop는 `package.json`, `src/constants/version.ts`, `metadata.json`, `docs/PATCH_NOTES.md`, `src/data/patchNotesData.ts`를 단일 버전 기준(`4.5.1`)으로 동기화합니다.

- **Windows PC 데스크톱 앱 (`.exe`)**: `npm run build:pc` 또는 `build-pc.bat`
- **안드로이드 모바일 앱 (`.apk`)**: `npm run build:android` 또는 `build-android.bat`
- **아이폰 / iOS PWA & 패키지**: Safari **'홈 화면에 추가'** 즉시 설치 또는 `npm run build:web && npx cap sync ios`
- **GitHub 자동 동기화**: `github-sync.bat` (Windows) / `./github-sync.sh` (macOS/Linux)

---

## 📂 프로젝트 디렉토리 구조

```
WordLoop/
├── .github/workflows/          # GitHub Actions CI/CD (Web/PC/Android/iOS 자동 빌드)
├── docs/                       # 프로젝트 표준 문서
│   ├── README.md               # 프로젝트 핵심 기능 및 스택 요약
│   ├── ARCHITECTURE.md         # v4.5.1 클라이언트/서버/7중 무료 AI 아키텍처
│   ├── USER_GUIDE.md           # 오늘 학습 · 무료 AI · 발음 교정 · 저장소 관리 가이드
│   ├── SECURITY_REPORT.md      # 보안 점검 및 강화 보고서
│   ├── SELF_REFLECTION_AUDIT.md# 자아성찰 및 심층 감사 보고서
│   ├── PATCH_NOTES.md          # 버전별 패치 노트
│   └── WorkLog.md              # 마일스톤 작업 이력
├── electron/                   # PC 데스크톱 Electron 래퍼 (main.cjs, preload.cjs)
├── scripts/                    # 멀티플랫폼 빌드 및 GitHub 동기화 스크립트
├── src/
│   ├── components/             # TodayHub, FocusRoutinePlayer, PronunciationCorrectionReport, StatsDashboard 등
│   ├── constants/              # version.ts (Single Source of Truth)
│   ├── data/                   # 3,210개 교육과정 어휘, 시나리오, 패치노트 데이터
│   ├── services/               # freeAiService, deviceStorageService, srsEngineService, speechService 등
│   ├── utils/                  # phonemeAnalysisUtils, audioWaveformUtils, meaningUtils 등
│   └── App.tsx                 # 메인 라우트 및 전역 상태/영속성 조율
├── server.ts                   # Express 프록시 (/api/dictionary, /api/ai/*, 무료 AI 6중 체인 + Origin/Rate-Limit 보안)
└── package.json                # 의존성 및 버전 정보 (v4.5.1)
```

---

## 📄 라이선스 (License)

본 프로젝트는 MIT 라이선스에 따라 자유롭게 사용 및 배포할 수 있습니다. 자세한 내용은 [`docs/LICENSE_KR.md`](./docs/LICENSE_KR.md) 및 [`docs/LICENSE_EN.md`](./docs/LICENSE_EN.md)를 참고하세요.
