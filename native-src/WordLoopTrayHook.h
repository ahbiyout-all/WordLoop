/**
 * WordLoopTrayHook.h
 * WordLoop Low-Level Keyboard Hook & Mica/Acrylic Floating Overlay DLL
 * Target: Windows x64 (MSVC / Clang ABI) with Cross-Platform ABI Guard
 */

#pragma once

#if defined(_WIN32) || defined(__CYGWIN__)
  #ifdef WORDLOOP_TRAYHOOK_EXPORTS
    #define WORDLOOP_HOOK_API __declspec(dllexport)
  #else
    #define WORDLOOP_HOOK_API __declspec(dllimport)
  #endif
#else
  #if __GNUC__ >= 4
    #define WORDLOOP_HOOK_API __attribute__((visibility("default")))
  #else
    #define WORDLOOP_HOOK_API
  #endif
#endif

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * 1. 글로벌 단축키 등록 (기본 Ctrl+Alt+W)
 * @param modifier 1: Alt, 2: Ctrl, 4: Shift, 8: Win
 * @param vkey 가상 키코드 (예: 'W' = 0x57)
 * @return 0: 성공, 음수: 오류 코드
 */
WORDLOOP_HOOK_API int32_t WordLoopHook_RegisterGlobalHotkey(uint32_t modifier, uint32_t vkey);

/**
 * 2. 플로팅 퀵 어휘 복습 창 팝업 토글
 * @return 1: 표시됨, 0: 숨김, 음수: 오류
 */
WORDLOOP_HOOK_API int32_t WordLoopHook_ToggleFloatingOverlay(void);

/**
 * 3. 훅 및 윈도우 서브클래스 해제
 */
WORDLOOP_HOOK_API void WordLoopHook_Unregister(void);

#ifdef __cplusplus
}
#endif
