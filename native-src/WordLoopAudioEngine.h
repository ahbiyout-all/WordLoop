/**
 * WordLoopAudioEngine.h
 * WordLoop Pure Proprietary Native Audio DSP & Pronunciation Diagnostic DLL
 * Target: Windows x64 (MSVC / Clang ABI) with Cross-Platform ABI Guard
 */

#pragma once

#if defined(_WIN32) || defined(__CYGWIN__)
  #ifdef WORDLOOP_AUDIO_EXPORTS
    #define WORDLOOP_AUDIO_API __declspec(dllexport)
  #else
    #define WORDLOOP_AUDIO_API __declspec(dllimport)
  #endif
#else
  #if __GNUC__ >= 4
    #define WORDLOOP_AUDIO_API __attribute__((visibility("default")))
  #else
    #define WORDLOOP_AUDIO_API
  #endif
#endif

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#pragma pack(push, 1)
// 발음 정밀 진단 결과 구조체 (1바이트 패킹으로 C/C++/C#/Node.js FFI 메모리 정렬 일치)
typedef struct {
    float overall_score;         // 종합 일치 점수 (0.0 ~ 100.0)
    float pitch_accuracy;        // 피치/억양 정확도 (0.0 ~ 100.0)
    float energy_similarity;     // 음압/발성 강도 유사도 (0.0 ~ 100.0)
    int32_t syllable_count;      // 판별된 총 음절 수
    int32_t inaccurate_start_ms; // 발음 교정이 필요한 시작 구간 (밀리초)
    int32_t inaccurate_end_ms;   // 발음 교정이 필요한 종료 구간 (밀리초)
    char diagnostic_msg[128];    // 세부 피드백 메시지 (UTF-8)
} WordLoopAudioDiagnosticResult;
#pragma pack(pop)

/**
 * 1. 엔진 초기화
 * @param sample_rate 샘플링 레이트 (예: 48000 또는 16000)
 * @return 0: 성공, 음수: 오류 코드
 */
WORDLOOP_AUDIO_API int32_t WordLoopAudio_Init(int32_t sample_rate);

/**
 * 2. 밴드 에너지 및 영교차율(ZCR) 기반 초고속 VAD (Voice Activity Detection)
 * @param pcm_data 단일 채널 Float32 PCM 버퍼 포인터 (-1.0 ~ 1.0)
 * @param sample_count 샘플 개수
 * @param energy_threshold 에너지 임계값 (기본 0.015f 권장)
 * @return 1: 유효 음성 발화 감지, 0: 묵음/배경 소음, 음수: 오류
 */
WORDLOOP_AUDIO_API int32_t WordLoopAudio_ProcessVAD(
    const float* pcm_data,
    int32_t sample_count,
    float energy_threshold
);

/**
 * 3. 원어민 오디오 vs 사용자 녹음 오디오 1:1 DTW(Dynamic Time Warping) 발음 평가
 * @param native_pcm 원어민 기준 오디오 PCM 포인터
 * @param native_count 원어민 샘플 개수
 * @param user_pcm 사용자 녹음 오디오 PCM 포인터
 * @param user_count 사용자 샘플 개수
 * @param out_result 진단 결과 반환 버퍼 구조체 포인터
 * @return 0: 성공, 음수: 오류 코드
 */
WORDLOOP_AUDIO_API int32_t WordLoopAudio_ComparePronunciation(
    const float* native_pcm,
    int32_t native_count,
    const float* user_pcm,
    int32_t user_count,
    WordLoopAudioDiagnosticResult* out_result
);

/**
 * 4. 오디오 엔진 메모리 해제
 */
WORDLOOP_AUDIO_API void WordLoopAudio_Release(void);

#ifdef __cplusplus
}
#endif
