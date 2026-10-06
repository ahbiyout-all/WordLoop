cmake_minimum_required(VERSION 3.20)
project(WordLoopNativeSuite VERSION 3.17.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Optimization flags for AVX2 and MSVC
if(MSVC)
    add_compile_options(/W4 /arch:AVX2 /O2 /Oi /Ot /GL)
    add_link_options(/LTCG)
elseif(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(-Wall -Wextra -O3 -mavx2 -fPIC)
endif()

# 1. WordLoopAudioEngine.dll (High-Speed DSP & Pronunciation DTW Diagnostic)
add_library(WordLoopAudioEngine SHARED
    WordLoopAudioEngine.h
    WordLoopAudioEngine.cpp
)
target_include_directories(WordLoopAudioEngine PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

# 2. WordLoopFastDB.dll (Memory-Mapped Vocabulary Search & Encrypted Vault)
add_library(WordLoopFastDB SHARED
    WordLoopFastDB.h
    WordLoopFastDB.cpp
)
target_include_directories(WordLoopFastDB PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

# 3. WordLoopSRSNeuralEngine.dll (Cognitive Spaced Repetition FSRS & Typo-Tolerant Fuzzy Engine)
add_library(WordLoopSRSNeuralEngine SHARED
    WordLoopSRSNeuralEngine.h
    WordLoopSRSNeuralEngine.cpp
)
target_include_directories(WordLoopSRSNeuralEngine PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

# 4. WordLoopMorphEngine.dll (G2P IPA Phonetics, Syllable Stress & Lemmatizer)
add_library(WordLoopMorphEngine SHARED
    WordLoopMorphEngine.h
    WordLoopMorphEngine.cpp
)
target_include_directories(WordLoopMorphEngine PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

# 5. WordLoopTrayHook.dll (Low-Level Hotkey & Mica Floating Overlay Hook)
add_library(WordLoopTrayHook SHARED
    WordLoopTrayHook.h
    WordLoopTrayHook.cpp
)
target_include_directories(WordLoopTrayHook PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

# Output directories
set_target_properties(
    WordLoopAudioEngine
    WordLoopFastDB
    WordLoopSRSNeuralEngine
    WordLoopMorphEngine
    WordLoopTrayHook
    PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib"
    ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib"
)
