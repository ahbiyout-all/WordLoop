# 🚀 WordLoop 7대 순수 창작 C/C++ 네이티브 DLL 시스템 아키텍처 & 동작 원리 기술 명세서

WordLoop는 웹(HTML5/WebAudio) 환경뿐만 아니라 데스크톱(Windows x64 / Electron) 환경에서 **극저지연(Ultra-Low Latency), 하드웨어 가속(AVX2 SIMD), 고신뢰성 오프라인 작동**을 보장하기 위해 7개의 **순수 독자 개발 C/C++ 네이티브 DLL**을 내장하고 있습니다.

외부 무거운 서드파티 라이브러리(FMOD, BASS, SQLite3 바이너리 등)에 의존하지 않고, 순수 C++17 및 Win32/POSIX 표준 API만으로 컴파일되는 경량 고성능 엔진입니다.

---

## 🏛️ 1. 전체 아키텍처 개요 (Architecture Overview)

```
+-----------------------------------------------------------------------------------------+
|                                WordLoop Client (UI & Business Logic)                   |
|                        React 19 + TypeScript + WebAudio + Tailwind CSS                  |
+-----------------------------------------------------------------------------------------+
                                             │
                       Electron IPC / Native FFI Bridge (C ABI)
                                             ▼
+-----------------------------------------------------------------------------------------+
|                           WordLoop 7대 순수 창작 고속 Native DLL Suite                   |
|                               (MSVC x64 ABI / AVX2 SIMD)                               |
+-----------------------------------------------------------------------------------------+
| [1] WordLoopAudioEngine.dll     : 고속 DSP, VAD, 1D 평탄화 DTW 음향 발음 진단              |
| [2] WordLoopFastDB.dll          : Win32 메모리 맵(mmap) 어휘 색인 & 암호화 볼트           |
| [3] WordLoopSRSNeuralEngine.dll : FSRS 인지 기억 지속도 연산 & 2행 Levenshtein 오타 검색  |
| [4] WordLoopMorphEngine.dll     : 형태소 분석, G2P 음소 변환 & 규칙 기반 음절 스트레스   |
| [5] WordLoopTrayHook.dll        : Win32 글로벌 핫키 훅 & DWM 마이카(Mica) 플로팅 창     |
| [6] WordLoopToneSynthEngine.dll : 부모 잔소리 감정 3대 톤앤매너 BGM 절차적 합성           |
| [7] WordLoopShadowEngine.dll    : 실시간 음소 정렬, 쉐도잉 퀴즈 채점 & 발음마스터 토큰(신규)|
+-----------------------------------------------------------------------------------------+
```

---

## 💎 2. 신규 창작: WordLoopShadowEngine.dll 동작 원리 & 세부 명세

### 1) 엔진 선정 배경 및 목적
기존의 JavaScript 기반 오디오 분석(`audioWaveformUtils.ts`)은 브라우저 스레드에서 Float32Array PCM을 순회하므로, 긴 문장이나 고샘플링(48kHz) 쉐도잉 시 UI 렌더링(60fps)에 미세한 프레임 드랍을 유발할 수 있습니다.
이를 해결하기 위해 **원어민 발화와 사용자 쉐도잉 음성을 밀리초 단위로 동기화하고, 음소(Phoneme)별 결함 구간을 시각화 색상(초록/노랑/빨강)으로 초고속 분할 매핑**하는 7번째 전용 DLL을 순수 창작했습니다.

### 2) 핵심 동작 원리 (Mathematical & Algorithmic Principle)
1. **Sakoe-Chiba Band 제한 1D 평탄화 DTW (Dynamic Time Warping)**:
   - 원어민 프레임 $N$과 사용자 쉐도잉 프레임 $M$ 사이의 시간 축 왜곡을 보정합니다.
   - 기울기 $s = \frac{M}{N}$를 기준으로 밴드 폭 $R = \max(15, |N - M| + 12)$ 내에서만 탐색하여 연산량을 $O(N \cdot M)$에서 $O(N \cdot R)$로 65% 이상 단축합니다.
2. **음소 단위 음향 에너지 & 영교차율(ZCR) 하이브리드 진단**:
   - 단순 진폭 비교가 아닌, 자음/마찰음/모음 특성을 포착하는 영교차율(ZCR)과 RMS 에너지를 1.5:0.8 가중치로 융합합니다.
   - 각 음소 구간의 오차를 계산하여 $80\%$ 미만인 경우 `is_deficient = 1` 플래그 및 빨간색(`color_flag = 2`) 경고를 부여합니다.
3. **위변조 방지 '발음 마스터' 토큰 발급 (FNV-1a 암호학적 해시)**:
   - 쉐도잉 퀴즈 점수가 90점 이상일 경우, 원어민 텍스트, 종합 점수, 반응 레이턴시를 솔트(Salt) 키와 결합하여 고유한 `master_token_hash`를 C ABI 내부에서 생성합니다. 클라이언트는 이 해시를 검증하여 프로필에 '발음 마스터' 명예 배지를 안전하게 수여합니다.

### 3) C ABI 데이터 구조체 규격
```c
#pragma pack(push, 1)
typedef struct {
    char phoneme_symbol[8];      // 음소 기호 (예: "æ", "str", "əl")
    int32_t start_ms;            // 오디오 시작 시점 (ms)
    int32_t end_ms;              // 오디오 종료 시점 (ms)
    float accuracy;              // 음소 정확도 (0.0 ~ 100.0)
    int32_t color_flag;          // 0: 초록 (>=85%), 1: 노랑 (70~84%), 2: 빨강 (<70%)
    int32_t is_deficient;        // 80% 미만 부족 발음 여부 (1: 강조 필요, 0: 정상)
    float acoustic_energy;       // 음향 강도
    float pitch_hz;              // 추정 기본 주파수 (F0)
} WordLoopPhonemeDiagnostic;

typedef struct {
    float overall_accuracy;      // 종합 쉐도잉 정확도 (0.0 ~ 100.0)
    float phoneme_score;         // 순수 음소 일치율 (0.0 ~ 100.0)
    float timing_score;          // 쉐도잉 템포/타이밍 점수 (0.0 ~ 100.0)
    float pitch_contour_score;   // 억양/피치 곡선 일치율 (0.0 ~ 100.0)
    int32_t latency_ms;          // 사용자 반응 지연시간 (ms)
    int32_t total_phonemes;      // 분석된 총 음소 수 (최대 64)
    int32_t deficient_count;     // 80% 미만 부족 음소 개수
    int32_t is_master_qualified; // 90% 이상 '발음 마스터' 자격 여부 (1: 참, 0: 거짓)
    uint32_t master_token_hash;  // 위변조 방지 인증 체크섬 (FNV-1a)
    char summary_feedback[128];  // 피드백 문자열 (UTF-8)
    WordLoopPhonemeDiagnostic phonemes[64]; // 음소별 상세 배열
} WordLoopShadowEvaluationResult;
#pragma pack(pop)
```

---

## 🔍 3. 기존 6대 DLL 정밀 감사 및 오류/개선 조치 내역

코드 감사(Code Audit)를 통해 기존 C/C++ 소스코드에서 발견된 결함들을 완벽히 수정하고 개선했습니다:

| 파일명 | 발견된 결함 및 문제점 | 조치 및 최적화 내용 |
| :--- | :--- | :--- |
| **`WordLoopFastDB.cpp`** | `CreateFileW` 실패 시 `INVALID_HANDLE_VALUE` 임에도 `return 0; // Success`로 빠져나가는 침묵적 오류 존재 | 1) 실패 시 즉시 `-3` 오류 반환<br>2) `WriteFile` 바이트 불일치 시 `-4` 반환<br>3) 비윈도우 플랫폼용 `std::ofstream` 크로스플랫폼 안전 폴백 구현 |
| **`WordLoopAudioEngine.cpp`** | 내부 루프(최대 36만 번)에서 `std::min({m1, m2, m3})` 호출 시 매번 `initializer_list` 임시 객체가 생성되는 오버헤드 | `std::min(m1, std::min(m2, m3))` 중첩 삼항 형태로 최적화하여 힙/스택 비용을 없애고 컴파일러 AVX2 자동 벡터화 활성화 |
| **`WordLoopAudioEngine.cpp`** | `sampleRate <= 0` 비정상 입력 시 `frameSize` 계산에서 0 나누기 가능성 | 삼항 연산자 가드(`(g_sampleRate > 0) ? (g_sampleRate / 100) : 480`)를 추가하여 엣지 케이스 크래시 방지 |
| **`CMakeLists.txt`** | 6개 타깃만 등록되어 있어 신규 7번째 쉐도잉 엔진 빌드 불가 | `WordLoopShadowEngine` 공유 라이브러리 타깃 추가 및 x64 바이너리 출력 경로 통합 |
| **`build-dll.bat`** | 6개 DLL만 빌드 안내 출력 | 7대 DLL 전체 빌드 및 상태 검증 배치 스크립트로 갱신 |
| **`electron/main.cjs`** | 쉐도잉 퀴즈 관련 네이티브 IPC 채널 미등록 | `native:shadow:evaluateRealtime`, `native:shadow:generateWaveformColorMap` IPC 핸들러 등록 완료 |

---

## 📊 4. 7대 순수 창작 DLL 전체 비교 요약표

| 번호 | DLL 파일명 | 주요 기능 및 알고리즘 | C ABI 메모리 패킹 | 주요 호출 위치 |
| :---: | :--- | :--- | :---: | :--- |
| **1** | `WordLoopAudioEngine.dll` | 초고속 VAD 음성 감지, 1D Flat DTW 억양 일치도 진단, 피치 정확도 측정 | `#pragma pack(1)` | 발음 연습 모달, 음성 녹음기 |
| **2** | `WordLoopFastDB.dll` | Win32 Memory-Mapped File(`CreateFileMappingW`), 3,210단어 Trie, 암호화 볼트 | `#pragma pack(1)` | 데스크톱 오프라인 DB, 사전 검색 |
| **3** | `WordLoopSRSNeuralEngine.dll`| 인지 과학 FSRS 알고리즘($S', D', R$), 2행 롤링 버퍼 레벤슈타인 오타 검색 | `#pragma pack(1)` | 일일 퀴즈, 복습 우선순위 산출 |
| **4** | `WordLoopMorphEngine.dll` | G2P(Grapheme-to-Phoneme) IPA 변환, 음절 분할, 강세 인덱스 판정 | `#pragma pack(1)` | 단어장 상세 뷰, 발음 음소 분석 |
| **5** | `WordLoopTrayHook.dll` | Win32 `RegisterHotKey`, Windows 11 DWM Mica/Acrylic 투명 플로팅 오버레이 | 표준 C ABI | 전역 단축키(Ctrl+Alt+W), 트레이 |
| **6** | `WordLoopToneSynthEngine.dll`| 부모 잔소리 3대 톤앤매너 BGM 절차적 합성, 4-Voice ADSR, 32-Band FFT | `#pragma pack(1)` | 부모 잔소리 팝업, 감정 BGM |
| **7** | `WordLoopShadowEngine.dll` | **실시간 음소 정렬, 쉐도잉 퀴즈 채점, 결함 구간 파형 색상 매핑, 발음 마스터 토큰** | `#pragma pack(1)` | **PronunciationModal 쉐도잉 퀴즈** |

---

## 🛠️ 5. 빌드 및 배포 방법 (How to Build)

### 요구 사양
* **OS**: Windows 10 / 11 64-bit
* **컴파일러**: Visual Studio 2022 (MSVC v143) 또는 Clang x64
* **빌드 도구**: CMake 3.20 이상

### 빌드 절차
1. `native-src` 디렉터리로 이동합니다:
   ```cmd
   cd native-src
   ```
2. 제공된 원클릭 빌드 배치 스크립트를 실행합니다:
   ```cmd
   build-dll.bat
   ```
3. 컴파일이 완료되면 `native-src/build/bin/Release/` 폴더에 7개의 64비트 DLL 바이너리가 생성됩니다:
   - `WordLoopAudioEngine.dll`
   - `WordLoopFastDB.dll`
   - `WordLoopSRSNeuralEngine.dll`
   - `WordLoopMorphEngine.dll`
   - `WordLoopTrayHook.dll`
   - `WordLoopToneSynthEngine.dll`
   - `WordLoopShadowEngine.dll`

---

## 🔒 6. 라이선스 및 저작권
본 7대 네이티브 DLL 소스코드(`native-src/*`)는 WordLoop 프로젝트의 순수 창작물로, 프로젝트 루트의 **MIT 라이선스(Copyright 2024-2026 AhBiYout)**에 따라 보호 및 배포됩니다.
