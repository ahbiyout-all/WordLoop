# WordLoop - 1인 전용 온디바이스 영어 학습 & 발음 교정 플랫폼 (v4.8.0)

- **🌐 웹 애플리케이션 바로가기 (GitHub Pages):** [https://ahbiyout-all.github.io/WordLoop/](https://ahbiyout-all.github.io/WordLoop/)
- **📁 GitHub Repository:** [https://github.com/ahbiyout-all/WordLoop](https://github.com/ahbiyout-all/WordLoop)
- **📦 GitHub Releases:** [https://github.com/ahbiyout-all/WordLoop/releases](https://github.com/ahbiyout-all/WordLoop/releases)

## 📌 프로젝트 개요
**WordLoop**는 **TodayHub 3분 집중 루틴**, **학습 연동 5단계 진화 펫 키우기**, **SM-2 간격 반복(SRS) 알고리즘**, **학습과학 기반 16종 인지게임 엔진(JOL 캘리브레이션·ZPD 적응형·3단계 비계 힌트)**, **AI 음소(Phoneme) 단위 발음 교정 리포트**, **3계층 로컬 파일 시스템·IndexedDB 자동 동기화 엔진**, 그리고 **오프라인 오디오 루프**를 결합한 1인 전용 온디바이스 영단어·문장 학습 웹앱입니다.

---

## 🔥 핵심 기능 (v4.8.0 기준)
1. **TodayHub & 3단계 집중 루틴 (`TodayHub.tsx`, `FocusRoutinePlayer.tsx`)**
   - 초심자도 고민 없이 시작할 수 있는 단일 CTA(`오늘의 3분 루틴 시작`)와 오늘 복습 우선순위 5단어 제공
   - `듣고 뜻 확인 → 4지선다 회상 → 발음/SM-2 난이도 평가` 집중 학습 파이프라인 및 세션 큐 스냅샷 보호

2. **SM-2 간격 반복 & 3단계 숙련도 관리 (`srsEngineService.ts`)**
   - 🔴 `0단계 (미암기)` / 🟡 `1단계 (학습중)` / 🟢 `2단계 (완벽암기)` 호환
   - `Again / Hard / Good / Easy` 응답에 따른 복습 간격·난이도 지수(Ease Factor) 자동 계산

3. **전 학년 맞춤형 3,210개 어휘 & 실전 예문 (`officialCurriculum3000Data.json`)**
   - 초등·중학·고등/수능 등급별 실생활·독해형 고유 예문 및 한국어 번역 탑재
   - 상용구 템플릿을 보유한 기존 로컬 캐시의 무손실 자동 마이그레이션 지원

4. **AI 음소(Phoneme) 단위 발음 교정 리포트 (`PronunciationCorrectionReport.tsx`)**
   - 자소-음소 매핑 및 IPA 변화(`/θ/→/s/`, `/r/→/l/`, 어말 자음 탈락 등) 시각화
   - 구강 단면도 SVG 조음 가이드, 내 발음 구간 슬라이스 재청취, 최소대립쌍 비교 드릴 및 Gemini 멀티모달 오디오 정밀 진단

5. **3계층 로컬 파일 시스템 & IndexedDB 자동 백업 엔진 (`persistentStorageEngine.ts`, `deviceStorageService.ts`)**
   - 부모님 사진 등 대용량 이미지를 IndexedDB `media` 스토어로 분리해 `localStorage` 5MB 한계를 근본 해소하고 `< 100KB` 빠른 캐시만 유지
   - 웹 File System Access API · Electron 네이티브 IPC 기반 로컬 폴더 자동 저장(`wordloop-sync-latest.json.gz` + 7일 회전 스냅샷) 및 브라우저 캐시 초기화 시 자동 복구 지원
   - 무결성 체크섬 내장 Schema v3 `.json.gz` / v2 `.json` 내보내기, Diff 미리보기, 자동 롤백 기반 스마트 병합 지원

6. **학습과학 기반 16종 단어·문장 인지 게임 (`cognitiveGameEngine.ts`, `StudentWordGame.tsx`)**
   - SM-2 복습 우선순위 인터리빙 출제 및 게임 성적·반응속도 기반 SM-2 자동 스케줄링 연동
   - **메타인지 확신도 결투**(`확실함/헷갈림` JOL 4사분면 교정) · **문맥·어근 3단계 추론** 신규 게임 및 3단계 점진적 비계 힌트·라운드 후 지연 재인출 지원
   - 반응속도(`ms`)·정답률 윈도우에 따른 ZPD 5단계 자동 난이도 조절 및 의미·형태 혼동 보기 생성

7. **상업용 오픈 사전 & API 키 없는 7중 무료 AI 대화형 롤플레잉 (`freeAiService.ts`)**
   - 내장 사전 + FreeDictionaryAPI + Wiktionary + 무료 AI(OVHcloud 70B · Kilo 550B · Pollinations · Workers AI · LLM7 · MLVoca · 온디바이스 Gemini Nano) 결합 검색
   - API 키 없이 즉시 실행되는 원어민 AI 롤플레잉, 단어장 생성, 뉘앙스 해설, 음소 교정 리포트

8. **학습 연동 5단계 진화 펫 키우기 & 스트릭 보호막 (`petCompanionService.ts`, `PetSanctuaryModal.tsx`)**
   - 단어 암기·발음·루틴·게임 활동으로 코인/EXP/간식을 모아 5단계(알→아기 버디→탐험가→지식의 수호자→전설 마스코트)로 진화
   - 4종 테마 방 배경 & 5종 SVG 코스튬 장착, 맥락형 영어 한마디 TTS 상호작용 및 연속 학습 스트릭 보호막(최대 3칸) 지원

---

## 🛠 기술 스택
- **Frontend:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4 (`@custom-variant dark`), Lucide Icons, Recharts (지연 로딩)
- **Backend / Proxy Server:** Node.js, Express 4, `tsx`, `esbuild`
- **AI Integration:** Keyless 7-Layer Worldwide Free AI Waterfall (OVHcloud EU · Kilo Gateway · Pollinations · Cloudflare Workers AI · LLM7 · MLVoca · Chrome Built-in Gemini Nano) + 선택적 BYOK `@google/genai` (`gemini-4-hydrogen`, `gemini-3.1-flash-lite`)
- **Audio & Speech:** Web Speech API (TTS & SpeechRecognition), 싱글톤 `AudioContext`, `MediaRecorder` 오디오 분석
- **Persistence:** 3-Tier Local Persistence (`localStorage` Bootstrap Cache · IndexedDB `wordloop_state_db` Blobs/Gzip Snapshots · Local File System / Electron FS IPC · Schema v3 `.json.gz`)
