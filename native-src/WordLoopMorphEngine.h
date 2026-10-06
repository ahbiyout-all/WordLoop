/**
 * WordLoopMorphEngine.h
 * WordLoop English Morphological, G2P (Grapheme-to-Phoneme) & Syllable Stress Engine DLL
 * Target: Windows x64 (MSVC / Clang ABI) with Cross-Platform ABI Guard
 * 
 * Features:
 * 1. G2P (Grapheme-to-Phoneme) offline IPA phonetic transcription
 * 2. Syllabification: Sonority Sequencing & Maximal Onset Principle hyphenation
 * 3. Primary (ˈ) and Secondary (ˌ) syllable stress position detection
 * 4. High-speed Lemmatization (Inflection to base dictionary lemma)
 */

#pragma once

#if defined(_WIN32) || defined(__CYGWIN__)
  #ifdef WORDLOOP_MORPH_EXPORTS
    #define WORDLOOP_MORPH_API __declspec(dllexport)
  #else
    #define WORDLOOP_MORPH_API __declspec(dllimport)
  #endif
#else
  #if __GNUC__ >= 4
    #define WORDLOOP_MORPH_API __attribute__((visibility("default")))
  #else
    #define WORDLOOP_MORPH_API
  #endif
#endif

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#pragma pack(push, 1)
// 음절 분해 및 강세 분석 결과 구조체 (1바이트 정렬)
typedef struct {
    char syllables_hyphenated[128]; // 하이픈으로 분해된 음절 (예: "cur-ric-u-lum")
    char ipa_transcription[128];    // 완전한 IPA 발음기호 (예: "/kəˈrɪk.jə.ləm/")
    int32_t syllable_count;         // 총 음절 개수
    int32_t primary_stress_index;   // 주강세가 위치한 음절 인덱스 (0부터 시작)
    int32_t secondary_stress_index; // 차강세가 위치한 음절 인덱스 (-1 if none)
    char lemma[64];                 // 원형 기본 단어 (예: "running" -> "run")
    char pos_tag[32];               // 추정 품사 (Noun, Verb, Adjective 등)
} WordLoopMorphAnalysisResult;
#pragma pack(pop)

/**
 * 1. 형태소 및 음운 엔진 초기화
 * @return 0: 성공, 음수: 오류
 */
WORDLOOP_MORPH_API int32_t WordLoopMorph_Init(void);

/**
 * 2. 단어 음절 분해, IPA 음소 전사, 강세 위치 및 원형 복원 통합 분석
 * @param word 분석할 영단어 (대소문자 무관)
 * @param out_result 결과 구조체 포인터
 * @return 0: 성공, 음수: 오류 코드
 */
WORDLOOP_MORPH_API int32_t WordLoopMorph_AnalyzeWord(
    const char* word,
    WordLoopMorphAnalysisResult* out_result
);

/**
 * 3. 굴절어(복수형, 과거형, 진행형, 비교급) 기본형(Lemma) 고속 추출
 * @param inflected_word 굴절된 단어
 * @param out_lemma_buffer 기본형 반환 버퍼
 * @param buffer_size 버퍼 바이트 용량
 * @return 0: 성공, 음수: 오류
 */
WORDLOOP_MORPH_API int32_t WordLoopMorph_Lemmatize(
    const char* inflected_word,
    char* out_lemma_buffer,
    int32_t buffer_size
);

/**
 * 4. 리소스 해제
 */
WORDLOOP_MORPH_API void WordLoopMorph_Release(void);

#ifdef __cplusplus
}
#endif
