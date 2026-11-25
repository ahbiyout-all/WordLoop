# WordLoop - 1인 전용 온디바이스 영어 학습 & 발음 교정 플랫폼 (v4.5.1)

- **🌐 웹 애플리케이션 바로가기 (GitHub Pages):** [https://ahbiyout-all.github.io/WordLoop/](https://ahbiyout-all.github.io/WordLoop/)
- **📁 GitHub Repository:** [https://github.com/ahbiyout-all/WordLoop](https://github.com/ahbiyout-all/WordLoop)
- **📦 GitHub Releases:** [https://github.com/ahbiyout-all/WordLoop/releases](https://github.com/ahbiyout-all/WordLoop/releases)

## 📌 프로젝트 개요
**WordLoop**는 **TodayHub 3분 집중 루틴**, **SM-2 간격 반복(SRS) 알고리즘**, **AI 음소(Phoneme) 단위 발음 교정 리포트**, **Compact v2 델타 로컬 저장 엔진**, 그리고 **오프라인 오디오 루프**를 결합한 1인 전용 온디바이스 영단어·문장 학습 웹앱입니다.

---

## 🔥 핵심 기능 (v4.5.1 기준)
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

5. **Compact v2 델타 로컬 저장소 & Schema v2 JSON 스마트 병합 (`deviceStorageService.ts`)**
   - 5MB `localStorage` 한도 내 점유율을 5% 미만으로 유지하는 델타 직렬화 및 중복 스냅샷 정리
   - 무결성 체크섬 내장 Schema v2 JSON 내보내기, 차이 사전 미리보기(Diff Preview), 자동 롤백 기반 스마트 병합 지원

6. **상업용 오픈 사전 & API 키 없는 7중 무료 AI 대화형 롤플레잉 (`freeAiService.ts`)**
   - 내장 사전 + FreeDictionaryAPI + Wiktionary + 무료 AI(OVHcloud 70B · Kilo 550B · Pollinations · Workers AI · LLM7 · MLVoca · 온디바이스 Gemini Nano) 결합 검색
   - API 키 없이 즉시 실행되는 원어민 AI 롤플레잉, 단어장 생성, 뉘앙스 해설, 음소 교정 리포트

---

## 🛠 기술 스택
- **Frontend:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4 (`@custom-variant dark`), Lucide Icons, Recharts (지연 로딩)
- **Backend / Proxy Server:** Node.js, Express 4, `tsx`, `esbuild`
- **AI Integration:** Keyless 7-Layer Worldwide Free AI Waterfall (OVHcloud EU · Kilo Gateway · Pollinations · Cloudflare Workers AI · LLM7 · MLVoca · Chrome Built-in Gemini Nano) + 선택적 BYOK `@google/genai` (`gemini-4-hydrogen`, `gemini-3.1-flash-lite`)
- **Audio & Speech:** Web Speech API (TTS & SpeechRecognition), 싱글톤 `AudioContext`, `MediaRecorder` 오디오 분석
- **Persistence:** `localStorage` (Compact v2 Delta + Checksum), IndexedDB (`voiceHistoryService.ts`), Schema v2 JSON
