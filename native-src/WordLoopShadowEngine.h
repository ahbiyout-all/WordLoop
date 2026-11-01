/**
 * WordLoopShadowEngine.h
 * WordLoop Real-Time Phoneme Alignment, Shadowing Quiz & Acoustic Discrepancy Engine DLL
 * Target: Windows x64 (MSVC / Clang ABI) with Cross-Platform ABI Guard
 * 
 * Features:
 * 1. Ultra-Low Latency AVX2/SIMD Phoneme-Level Time Alignment
 * 2. Real-Time Syllable & Phoneme Discrepancy Heatmap Generation (Green/Yellow/Red)
 * 3. Shadowing Quiz Real-Time Scoring (Accuracy, Timing Latency, Pitch Contour)
 * 4. Cryptographic Proof Token Generation for 'Pronunciation Master' Badge (>= 90%)
 */

#pragma once

#if defined(_WIN32) || defined(__CYGWIN__)
  #ifdef WORDLOOP_SHADOW_EXPORTS
    #define WORDLOOP_SHADOW_API __declspec(dllexport)
  #else
    #define WORDLOOP_SHADOW_API __declspec(dllimport)
  #endif
#else
  #if __GNUC__ >= 4
    #define WORDLOOP_SHADOW_API __attribute__((visibility("default")))
  #else
    #define WORDLOOP_SHADOW_API
  #endif
#endif

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define WORDLOOP_MAX_PHONEMES 64

#pragma pack(push, 1)
// 개별 음소별 진단 결과 구조체 (1바이트 정렬)
typedef struct {
    char phoneme_symbol[8];      // 음소 기호 (예: "æ", "p", "əl", "str")
    int32_t start_ms;            // 오디오 시작 시점 (ms)
    int32_t end_ms;              // 오디오 종료 시점 (ms)
    float accuracy;              // 음소 정확도 (0.0 ~ 100.0)
    int32_t color_flag;          // 0: 초록 (>=85%), 1: 노랑 (70~84%), 2: 빨강 (<70%)
    int32_t is_deficient;        // 80% 미만 부족 발음 여부 (1: 강조 필요, 0: 정상)
    float acoustic_energy;       // 음향 강도
    float pitch_hz;              // 추정 기본 주파수 (F0)
} WordLoopPhonemeDiagnostic;

// 쉐도잉 퀴즈 종합 진단 결과 구조체
typedef struct {
    float overall_accuracy;      // 종합 쉐도잉 정확도 (0.0 ~ 100.0)
    float phoneme_score;         // 순수 음소 일치율 (0.0 ~ 100.0)
    float timing_score;          // 쉐도잉 템포/타이밍 점수 (0.0 ~ 100.0)
    float pitch_contour_score;   // 억양/피치 곡선 일치율 (0.0 ~ 100.0)
    int32_t latency_ms;          // 원어민 발화 대비 사용자 따라하기 반응 지연시간 (ms)
    int32_t total_phonemes;      // 분석된 총 음소 수 (최대 64)
    int32_t deficient_count;     // 80% 미만 부족 음소 개수
    int32_t is_master_qualified; // 90% 이상 '발음 마스터' 배지 획득 자격 여부 (1: 자격 획득, 0: 미달)
    uint32_t master_token_hash;  // 위변조 방지 인증 토큰 체크섬 (FNV-1a)
    char summary_feedback[128];  // 피드백 문자열 (UTF-8)
    WordLoopPhonemeDiagnostic phonemes[WORDLOOP_MAX_PHONEMES]; // 음소별 상세 배열
} WordLoopShadowEvaluationResult;
#pragma pack(pop)

/**
 * 1. 쉐도잉 엔진 초기화
 * @param sample_rate 오디오 샘플링 레이트 (Hz, 기본: 48000 또는 16000)
 * @param deficiency_threshold 부족 발음 판정 기준 (기본: 80.0f)
 * @return 0: 성공, 음수: 오류 코드
 */
WORDLOOP_SHADOW_API int32_t WordLoopShadow_Init(
    int32_t sample_rate,
    float deficiency_threshold
);

/**
 * 2. 원어민 기준 오디오 vs 사용자 쉐도잉 녹음 오디오 실시간 음소 정밀 평가
 * @param native_pcm 원어민 기준 오디오 PCM Float32 배열 (-1.0 ~ 1.0)
 * @param native_count 원어민 샘플 수
 * @param user_pcm 사용자 녹음 오디오 PCM Float32 배열 (-1.0 ~ 1.0)
 * @param user_count 사용자 샘플 수
 * @param target_text 대상 영단어 또는 문장 문자열 (UTF-8)
 * @param out_result 결과 반환 버퍼 구조체 포인터
 * @return 0: 성공, 음수: 오류 코드
 */
WORDLOOP_SHADOW_API int32_t WordLoopShadow_Evaluate(
    const float* native_pcm,
    int32_t native_count,
    const float* user_pcm,
    int32_t user_count,
    const char* target_text,
    WordLoopShadowEvaluationResult* out_result
);

/**
 * 3. 오디오 웨이브폼 렌더링용 음소 컬러 구간 맵 생성
 * @param result 기 평가된 진단 결과 구조체
 * @param out_color_flags 출력될 타임라인 색상 플래그 배열 (크기: max_points)
 * @param max_points 타임라인 분할 포인트 수 (예: 100 또는 200)
 * @return 생성된 포인트 수, 음수: 오류
 */
WORDLOOP_SHADOW_API int32_t WordLoopShadow_GenerateWaveformColorMap(
    const WordLoopShadowEvaluationResult* result,
    int32_t* out_color_flags,
    int32_t max_points
);

/**
 * 4. 쉐도잉 엔진 메모리 해제
 */
WORDLOOP_SHADOW_API void WordLoopShadow_Release(void);

#ifdef __cplusplus
}
#endif
