/**
 * WordLoopToneSynthEngine.h
 * WordLoop Emotional Adaptive Tone Polyphonic Sound & Real-Time Nag BGM Synthesis DLL
 * Target: Windows x64 (MSVC / Clang ABI) with Cross-Platform ABI Guard
 * 
 * Features:
 * 1. Procedural Polyphonic Audio Synthesis (Sine, Triangle, Sawtooth, Pulse, Noise)
 * 2. 3 Mom & Dad Emotional Tone Presets:
 *    - 0: Tsundere (Bouncy staccato swing, comical tension, 138 BPM)
 *    - 1: Strict (D-minor suspense thriller, sawtooth sub-drone, heartbeat pulse, 116 BPM)
 *    - 2: Affectionate (F-major warm lofi chords, sine music box celesta bell, 84 BPM)
 * 3. ADSR Envelope calculation & 4-Voice Polyphony
 * 4. Real-Time 32-Band FFT Energy Spectrum Extractor for 60fps HUD Waveforms
 */

#pragma once

#if defined(_WIN32) || defined(__CYGWIN__)
  #ifdef WORDLOOP_TONESYNTH_EXPORTS
    #define WORDLOOP_SYNTH_API __declspec(dllexport)
  #else
    #define WORDLOOP_SYNTH_API __declspec(dllimport)
  #endif
#else
  #if __GNUC__ >= 4
    #define WORDLOOP_SYNTH_API __attribute__((visibility("default")))
  #else
    #define WORDLOOP_SYNTH_API
  #endif
#endif

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#pragma pack(push, 1)
// 톤앤매너 BGM 메타데이터 구조체 (1바이트 정렬)
typedef struct {
    int32_t tone_type;           // 0: Tsundere, 1: Strict, 2: Affectionate
    float bpm;                   // 템포 (BPM)
    int32_t sample_rate;         // 샘플링 레이트 (Hz)
    int32_t total_samples;       // 생성된 총 샘플 수
    float peak_amplitude;        // 최대 진폭 (0.0 ~ 1.0)
    float rms_energy;            // 평균 RMS 에너지
    char tone_name[32];          // 톤 명칭 문자열 (UTF-8)
    char musical_key[16];        // 음악 조성 (예: "C Major", "D Minor")
} WordLoopToneBGMInfo;
#pragma pack(pop)

/**
 * 1. 톤 신디사이저 엔진 초기화
 * @param sample_rate 샘플링 레이트 (예: 44100 또는 48000)
 * @return 0: 성공, 음수: 오류
 */
WORDLOOP_SYNTH_API int32_t WordLoopSynth_Init(int32_t sample_rate);

/**
 * 2. 부모 잔소리 톤앤매너 전용 BGM PCM 파형 절차적 합성
 * @param tone_type 0: 츤데레(Tsundere), 1: 엄격(Strict), 2: 다정(Affectionate)
 * @param duration_sec 합성할 BGM 지속 시간 (초 단위, 권장 3.0f ~ 30.0f)
 * @param out_pcm 출력 Float32 PCM 버퍼 포인터 (-1.0f ~ 1.0f)
 * @param max_samples 버퍼의 최대 샘플 수용량
 * @param out_info 합성 결과 메타데이터 구조체 포인터 (선택)
 * @return 실제 생성된 샘플 수, 음수: 오류 코드
 */
WORDLOOP_SYNTH_API int32_t WordLoopSynth_GenerateBGM(
    int32_t tone_type,
    float duration_sec,
    float* out_pcm,
    int32_t max_samples,
    WordLoopToneBGMInfo* out_info
);

/**
 * 3. 32-밴드 실시간 오디오 스펙트럼 에너지 추출 (60fps 파형 HUD 연동용)
 * @param pcm_window 분석 대상 Float32 PCM 윈도우 버퍼
 * @param window_size 윈도우 크기 (권장 512 ~ 2048 샘플)
 * @param out_bars 출력 32-밴드 정규화 높이 배열 (0.0f ~ 100.0f)
 * @param bar_count 출력 밴드 개수 (기본 32)
 * @return 0: 성공, 음수: 오류 코드
 */
WORDLOOP_SYNTH_API int32_t WordLoopSynth_GetSpectrum(
    const float* pcm_window,
    int32_t window_size,
    float* out_bars,
    int32_t bar_count
);

/**
 * 4. 단일 톤 화음(Chord) 및 스타카토 즉각 렌더링
 * @param tone_type 0: Tsundere, 1: Strict, 2: Affectionate
 * @param chord_step 화음 단계 (0: I, 1: IV, 2: V, 3: vi 등)
 * @param out_pcm 출력 Float32 버퍼 포인터
 * @param sample_count 생성할 샘플 수
 * @return 0: 성공, 음수: 오류
 */
WORDLOOP_SYNTH_API int32_t WordLoopSynth_SynthesizeToneChord(
    int32_t tone_type,
    int32_t chord_step,
    float* out_pcm,
    int32_t sample_count
);

/**
 * 5. 톤 신디사이저 엔진 메모리 해제
 */
WORDLOOP_SYNTH_API void WordLoopSynth_Release(void);

#ifdef __cplusplus
}
#endif
