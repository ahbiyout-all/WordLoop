/**
 * WordLoopSRSNeuralEngine.h
 * WordLoop Cognitive Spaced Repetition (FSRS) & Typo-Tolerant Fuzzy Engine DLL
 * Target: Windows x64 (MSVC / Clang ABI) with Cross-Platform ABI Guard
 */

#pragma once

#if defined(_WIN32) || defined(__CYGWIN__)
  #ifdef WORDLOOP_SRS_EXPORTS
    #define WORDLOOP_SRS_API __declspec(dllexport)
  #else
    #define WORDLOOP_SRS_API __declspec(dllimport)
  #endif
#else
  #if __GNUC__ >= 4
    #define WORDLOOP_SRS_API __attribute__((visibility("default")))
  #else
    #define WORDLOOP_SRS_API
  #endif
#endif

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#pragma pack(push, 1)
// 단어별 인지 학습 기록 구조체 (C/C++ 및 Node.js FFI 1바이트 정렬)
typedef struct {
    int32_t word_id;            // 어휘 고유 ID (0 ~ 3210)
    float stability;            // 기억 지속 안정도 S (일 단위)
    float difficulty;           // 학습 난이도 D (1.0 ~ 10.0)
    int32_t reps;               // 총 학습 회수
    int32_t lapses;             // 망각/실패 회수
    float last_elapsed_days;    // 직전 복습 이후 경과 일수
    float last_response_ms;     // 직전 퀴즈 응답 시간 (ms)
    float speech_accuracy;      // 직전 발음 평가 점수 (0.0 ~ 100.0)
    int32_t last_grade;         // 1: Again(망각), 2: Hard, 3: Good, 4: Easy
} WordLoopSRSRecord;

// 계산된 차기 복습 스케줄 결과 구조체
typedef struct {
    float next_stability;       // 갱신된 기억 안정도 (S')
    float next_difficulty;      // 갱신된 난이도 (D')
    float optimal_interval_days;// 최적 복습 간격 (일 단위)
    float retrievability;       // 현재 시점 기억 회상 확률 R (0.0 ~ 1.0)
    int32_t priority_score;     // 복습 시급성 우선순위 (0 ~ 1000)
} WordLoopSRSIntervalResult;
#pragma pack(pop)

/**
 * 1. SRS 엔진 초기화
 * @param target_retention 목표 기억 유지율 (기본: 0.90 = 90%)
 * @param decay_factor 망각 지수 감쇠 계수 (기본: -0.5f)
 * @return 0: 성공, 음수: 오류
 */
WORDLOOP_SRS_API int32_t WordLoopSRS_Init(float target_retention, float decay_factor);

/**
 * 2. FSRS 기반 차기 최적 복습 주기 산출
 * @param record 현재 단어의 학습 이력 구조체 포인터
 * @param out_result 연산 결과 반환 버퍼 포인터
 * @return 0: 성공, 음수: 오류
 */
WORDLOOP_SRS_API int32_t WordLoopSRS_CalculateInterval(
    const WordLoopSRSRecord* record,
    WordLoopSRSIntervalResult* out_result
);

/**
 * 3. 3,210단어 중 취약 어휘(망각 직전 R < 임계치) 최우선 순위 정렬
 * @param records 전체 단어 학습 기록 배열
 * @param count 전체 단어 수
 * @param retrievability_threshold 복습 필요 판정 임계치 (예: 0.85f)
 * @param out_ranked_ids 우선 복습해야 할 단어 ID 반환 버퍼
 * @param max_results 추출할 최대 단어 수 (예: 20 또는 50)
 * @return 추출된 취약 단어 개수, 음수: 오류
 */
WORDLOOP_SRS_API int32_t WordLoopSRS_RankVulnerableWords(
    const WordLoopSRSRecord* records,
    int32_t count,
    float retrievability_threshold,
    int32_t* out_ranked_ids,
    int32_t max_results
);

/**
 * 4. 초고속 Levenshtein 오타 허용 단어 검색 (SIMD 2행 슬라이딩 윈도우)
 * @param query 검색할 영단어 (오타 포함 가능)
 * @param dictionary 영단어 사전 문자열 배열 포인터
 * @param dict_size 사전 단어 수 (예: 3210)
 * @param max_distance 허용 최대 편집 거리 (예: 2)
 * @param out_matched_indices 일치한 사전 인덱스 반환 버퍼
 * @param max_matches 반환받을 최대 검색 결과 수
 * @return 검색된 유사 단어 개수, 음수: 오류
 */
WORDLOOP_SRS_API int32_t WordLoopSRS_FuzzySearch(
    const char* query,
    const char** dictionary,
    int32_t dict_size,
    int32_t max_distance,
    int32_t* out_matched_indices,
    int32_t max_matches
);

/**
 * 5. 리소스 해제
 */
WORDLOOP_SRS_API void WordLoopSRS_Release(void);

#ifdef __cplusplus
}
#endif
