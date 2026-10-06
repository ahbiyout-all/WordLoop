/**
 * WordLoopFastDB.h
 * WordLoop Memory-Mapped File & Fast Trie Vocabulary Search DLL
 * Target: Windows x64 (MSVC / Clang ABI) with Cross-Platform ABI Guard
 */

#pragma once

#if defined(_WIN32) || defined(__CYGWIN__)
  #ifdef WORDLOOP_FASTDB_EXPORTS
    #define WORDLOOP_FASTDB_API __declspec(dllexport)
  #else
    #define WORDLOOP_FASTDB_API __declspec(dllimport)
  #endif
#else
  #if __GNUC__ >= 4
    #define WORDLOOP_FASTDB_API __attribute__((visibility("default")))
  #else
    #define WORDLOOP_FASTDB_API
  #endif
#endif

#include <stdint.h>
#include <wchar.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * 1. 어휘 데이터베이스 메모리 맵 로드
 * @param db_file_path UTF-16 와이드 파일 경로 (공백 및 특수문자 완벽 지원)
 * @return 0: 성공, 음수: 오류 코드
 */
WORDLOOP_FASTDB_API int32_t WordLoopDB_Open(const wchar_t* db_file_path);

/**
 * 2. 접두사/전체 일치 고속 단어 검색
 * @param query 영단어 검색어 (UTF-8)
 * @param out_json_buffer JSON 결과 버퍼 포인터
 * @param buffer_size 버퍼 바이트 용량
 * @return 검색된 결과 개수, 음수: 오류 코드
 */
WORDLOOP_FASTDB_API int32_t WordLoopDB_SearchWord(
    const char* query,
    char* out_json_buffer,
    int32_t buffer_size
);

/**
 * 3. 사용자 볼트(학습 진행 및 오디오) AES-256 하드웨어 암호화 저장
 * @param in_data 원본 데이터 버퍼 포인터
 * @param in_len 데이터 바이트 길이
 * @param vault_path 저장 대상 파일 경로 (UTF-16)
 * @param key_hash 키 해시 문자열
 * @return 0: 성공, 음수: 오류 코드
 */
WORDLOOP_FASTDB_API int32_t WordLoopDB_SaveEncryptedVault(
    const uint8_t* in_data,
    int32_t in_len,
    const wchar_t* vault_path,
    const char* key_hash
);

/**
 * 4. 데이터베이스 및 메모리 맵 핸들 안전 해제
 */
WORDLOOP_FASTDB_API void WordLoopDB_Close(void);

#ifdef __cplusplus
}
#endif
