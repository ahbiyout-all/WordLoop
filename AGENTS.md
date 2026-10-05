# WordLoop AI Coding Guidelines & Agent Rules

## 📌 자동 패치노트 기록 및 버전 관리 지침 (Version Control & Automated Patch Notes)

코드 수정 및 기능 구현 시 다음과 같은 **특이점(Significant Milestones & Changes)**이 발생하면, **반드시 자동으로 버전을 올리고 패치노트에 기록**합니다:

### 1. 특이점 판단 기준 (Trigger Conditions)
- **신규 기능 추가**: 새로운 학습 모드, 게임, 사전 연동, AI 기능, 데이터 분석 도구 추가 등
- **UI / UX 대규모 개선**: 모바일 반응형 원스크린(100dvh) 개편, 인터랙션 개선, 레이아웃 구조 변경 등
- **아키텍처 및 시스템 변경**: 오프라인 지원, 패키징(Android/Electron), 성능 최적화, 인증/API 구조 변경 등
- **주요 버그 수정 및 안정화**: 핵심 학습 로직, 음성 엔진, 상태 동기화 오류 개선 등

### 2. 필수 업데이트 작업 (Required Steps)
1. **`package.json` 버전 업데이트**:
   - Major/Minor/Patch 규칙 준수 (예: `1.5.0` -> `1.6.0`)
2. **`/docs/PATCH_NOTES.md` 패치 내역 작성**:
   - 신규 버전 번호, 날짜, 핵심 변경 사항을 항목별로 명확하게 작성
3. **인앱 패치노트 데이터(`src/data/patchNotesData.ts`) 동기화**:
   - 앱 내부 UI(상단 네비게이션 버전 배지 클릭 시 열리는 모달)에서도 최신 패치노트를 확인할 수 있도록 동기화
4. **`metadata.json` 설명 업데이트**:
   - 신규 기능이 추가된 경우 최신 상태를 반영하여 설명문 갱신
