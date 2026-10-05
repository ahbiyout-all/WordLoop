# WordLoop - 영어 단어 & 자기계발 연속 발음 학습 어플리케이션

## 📌 프로젝트 개요
**WordLoop**는 무한 반복 음성 재평가(TTS) 기능과 3단계 암기 관리 시스템(미암기, 학습중, 완벽암기)을 기반으로 한 영단어 및 생활 영어 문장 학습 & 목표 관리 어플리케이션입니다.

상업적으로 허용된 오픈 라이선스 사전 데이터(FreeDictionaryAPI, Wiktionary 데이터, 코드 내 탑재 내장 사전)와 **Gemini AI** 엔진의 맥락 기반 한국어 자연어 번역 기능을 통합하여 최상의 영어 학습 경험을 제공합니다.

---

## 🔥 핵심 기능
1. **상업용 오픈 사전 & 내장 코드 사전 (Open Dictionary + Pre-bundled Code Dictionary)**
   - 앱 내 자주 쓰이는 필수 어휘 DB 탑재 (네트워크 없이도 즉각 검색)
   - FreeDictionaryAPI (Free & Open) + Wiktionary + Gemini AI 결합을 통한 정교한 IPA 발음기호, 품사, 한국어 뜻, 원어민 뉘앙스 팁 및 예문 제공

2. **3단계 암기 정도 관리 (3-Stage Mastery Management)**
   - 🔴 **0단계 (미암기)** / 🟡 **1단계 (학습중)** / 🟢 **2단계 (완벽암기)**
   - 카드에서 한 번의 클릭으로 상태 변경 및 필터링 지원

3. **연속 오디오 루프 & 발음 교정 (Infinite Continuous Audio Loop & Pronunciation Practice)**
   - Web Speech API 기반 원어민 발음 반복 재생
   - 음성 인식 마이크를 통한 실시간 발음 평가 모달

4. **플래시카드 / 퀴즈 / 오답노트 (Flashcards, 4-Choice Quiz, Wrong Answer Notes)**
   - 암기 상태별(미암기 위주) 타겟팅 플래시카드 학습
   - 4지선다 객관식 퀴즈와 자동 스코어링
   - 틀린 단어가 자동으로 수집되는 **오답노트** 팝업 및 복습 기능

5. **단일 팝업 모달로 통합된 학습 옵션 & 도구 (Consolidated Options Modal)**
   - 뜻 가리기 (자가 테스트용 능동 회상), 북마크 필터
   - 암기 단계별 카테고리 필터링
   - CSV / JSON 데이터 전체 백업 및 복원 기능

---

## 🛠 기술 스택
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React Icons
- **Backend / API Server**: Node.js, Express, tsx, esbuild
- **AI Integration**: `@google/genai` (Gemini API)
- **Audio & Speech**: Web Speech API (TTS & SpeechRecognition)
