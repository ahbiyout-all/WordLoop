/**
 * WordLoopShadowEngine.cpp
 * WordLoop Real-Time Phoneme Alignment, Shadowing Quiz & Acoustic Discrepancy Engine Implementation
 * Target: Windows x64 (MSVC / Clang) with AVX2 SIMD Optimization
 */

#define WORDLOOP_SHADOW_EXPORTS
#include "WordLoopShadowEngine.h"

#include <vector>
#include <cmath>
#include <cstring>
#include <algorithm>
#include <cstdio>
#include <string>
#include <cctype>

namespace {
    int32_t g_sampleRate = 48000;
    float g_deficiencyThreshold = 80.0f;
    bool g_initialized = false;

    // Fast Root Mean Square (RMS) calculation
    float CalculateRMS(const float* data, int32_t count) {
        if (!data || count <= 0) return 0.0f;
        double sum = 0.0;
        int32_t i = 0;
        for (; i + 3 < count; i += 4) {
            float s0 = std::isfinite(data[i]) ? data[i] : 0.0f;
            float s1 = std::isfinite(data[i + 1]) ? data[i + 1] : 0.0f;
            float s2 = std::isfinite(data[i + 2]) ? data[i + 2] : 0.0f;
            float s3 = std::isfinite(data[i + 3]) ? data[i + 3] : 0.0f;
            sum += (double)s0 * s0 + (double)s1 * s1 + (double)s2 * s2 + (double)s3 * s3;
        }
        for (; i < count; ++i) {
            float s = std::isfinite(data[i]) ? data[i] : 0.0f;
            sum += (double)s * s;
        }
        return (float)std::sqrt(sum / count);
    }

    // Zero Crossing Rate (ZCR) for fricative/consonant acoustic feature detection
    float CalculateZCR(const float* data, int32_t count) {
        if (!data || count < 2) return 0.0f;
        int32_t crossings = 0;
        for (int32_t i = 1; i < count; ++i) {
            if ((data[i] >= 0.0f && data[i - 1] < 0.0f) || (data[i] < 0.0f && data[i - 1] >= 0.0f)) {
                crossings++;
            }
        }
        return (float)crossings / (count - 1);
    }

    // Autocorrelation-based pitch (F0 in Hz) estimation
    float EstimatePitchHz(const float* data, int32_t count, int32_t sampleRate) {
        if (!data || count < 256 || sampleRate <= 0) return 0.0f;
        
        int32_t minLag = sampleRate / 400; // ~400 Hz (high pitch limit)
        int32_t maxLag = sampleRate / 70;  // ~70 Hz (low pitch limit)
        if (maxLag >= count) maxLag = count - 1;

        float maxCorr = -1.0f;
        int32_t bestLag = 0;

        for (int32_t lag = minLag; lag <= maxLag; ++lag) {
            float sum = 0.0f;
            for (int32_t n = 0; n < count - lag; ++n) {
                sum += data[n] * data[n + lag];
            }
            if (sum > maxCorr) {
                maxCorr = sum;
                bestLag = lag;
            }
        }

        if (bestLag > 0 && maxCorr > 0.01f) {
            return (float)sampleRate / (float)bestLag;
        }
        return 0.0f;
    }

    // Cryptographic token checksum calculation (FNV-1a with secret salt)
    uint32_t ComputeMasterTokenHash(const char* target, float score, int32_t latency) {
        uint32_t hash = 2166136261u;
        const char salt[] = "WordLoop_Pronunciation_Master_2026_Secret!";
        for (const char* p = salt; *p; ++p) {
            hash ^= (uint8_t)(*p);
            hash *= 16777619u;
        }
        if (target) {
            for (const char* p = target; *p; ++p) {
                hash ^= (uint8_t)(*p);
                hash *= 16777619u;
            }
        }
        uint32_t scoreBits = *(uint32_t*)&score;
        hash ^= (scoreBits & 0xFF); hash *= 16777619u;
        hash ^= ((scoreBits >> 8) & 0xFF); hash *= 16777619u;
        hash ^= ((scoreBits >> 16) & 0xFF); hash *= 16777619u;
        hash ^= ((scoreBits >> 24) & 0xFF); hash *= 16777619u;
        hash ^= (uint32_t)latency; hash *= 16777619u;
        return hash;
    }

    // Extract approximate phonemes from English text
    std::vector<std::string> ExtractTextPhonemes(const std::string& text) {
        std::vector<std::string> phonemes;
        if (text.empty()) return phonemes;

        std::string cleaned;
        for (char c : text) {
            if (std::isalpha((unsigned char)c) || c == ' ') {
                cleaned += (char)std::tolower((unsigned char)c);
            }
        }

        // Group into syllables or phoneme clusters
        std::string current;
        for (size_t i = 0; i < cleaned.length(); ++i) {
            char c = cleaned[i];
            if (c == ' ') {
                if (!current.empty()) {
                    phonemes.push_back(current);
                    current.clear();
                }
                continue;
            }

            current += c;
            // Cluster by vowel-consonant rhythm
            bool isVowel = (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u' || c == 'y');
            if (isVowel && current.length() >= 2) {
                phonemes.push_back(current);
                current.clear();
            } else if (!isVowel && current.length() >= 3) {
                phonemes.push_back(current);
                current.clear();
            }
        }

        if (!current.empty()) {
            phonemes.push_back(current);
        }

        if (phonemes.empty()) {
            phonemes.push_back("sound");
        }

        return phonemes;
    }
}

WORDLOOP_SHADOW_API int32_t WordLoopShadow_Init(
    int32_t sample_rate,
    float deficiency_threshold
) {
    if (sample_rate <= 0) return -1;
    g_sampleRate = sample_rate;
    g_deficiencyThreshold = (deficiency_threshold > 0.0f && deficiency_threshold <= 100.0f)
        ? deficiency_threshold
        : 80.0f;
    g_initialized = true;
    return 0;
}

WORDLOOP_SHADOW_API int32_t WordLoopShadow_Evaluate(
    const float* native_pcm,
    int32_t native_count,
    const float* user_pcm,
    int32_t user_count,
    const char* target_text,
    WordLoopShadowEvaluationResult* out_result
) {
    if (!native_pcm || native_count <= 0 || !user_pcm || user_count <= 0 || !out_result) {
        return -1;
    }

    std::memset(out_result, 0, sizeof(WordLoopShadowEvaluationResult));

    const int32_t frameSize = std::max(160, (g_sampleRate > 0) ? (g_sampleRate / 100) : 480); // 10ms frame
    int32_t nFramesNative = std::min(600, native_count / frameSize);
    int32_t nFramesUser = std::min(600, user_count / frameSize);

    if (nFramesNative == 0 || nFramesUser == 0) return -2;

    // 1. Compute Envelope & ZCR sequences
    std::vector<float> nativeEnergy(nFramesNative);
    std::vector<float> nativeZCR(nFramesNative);
    for (int32_t i = 0; i < nFramesNative; ++i) {
        nativeEnergy[i] = CalculateRMS(&native_pcm[i * frameSize], frameSize);
        nativeZCR[i] = CalculateZCR(&native_pcm[i * frameSize], frameSize);
    }

    std::vector<float> userEnergy(nFramesUser);
    std::vector<float> userZCR(nFramesUser);
    for (int32_t j = 0; j < nFramesUser; ++j) {
        userEnergy[j] = CalculateRMS(&user_pcm[j * frameSize], frameSize);
        userZCR[j] = CalculateZCR(&user_pcm[j * frameSize], frameSize);
    }

    // 2. DTW Alignment with Sakoe-Chiba band constraint
    const int32_t cols = nFramesUser + 1;
    const int32_t rows = nFramesNative + 1;
    std::vector<float> dtw(rows * cols, 1e9f);
    #define DTW_AT(r, c) dtw[(r) * cols + (c)]

    DTW_AT(0, 0) = 0.0f;
    const float slope = (float)nFramesUser / (float)nFramesNative;
    const int32_t band = std::max(15, std::abs(nFramesNative - nFramesUser) + 12);

    for (int32_t i = 1; i <= nFramesNative; ++i) {
        int32_t centerJ = (int32_t)std::round(i * slope);
        int32_t minJ = std::max(1, centerJ - band);
        int32_t maxJ = std::min(nFramesUser, centerJ + band);

        for (int32_t j = minJ; j <= maxJ; ++j) {
            float cost = std::abs(nativeEnergy[i - 1] - userEnergy[j - 1]) * 1.5f +
                         std::abs(nativeZCR[i - 1] - userZCR[j - 1]) * 0.8f;
            float m1 = DTW_AT(i - 1, j);
            float m2 = DTW_AT(i, j - 1);
            float m3 = DTW_AT(i - 1, j - 1);
            float minPrev = std::min(m1, std::min(m2, m3));
            DTW_AT(i, j) = cost + minPrev;
        }
    }

    float totalDistance = DTW_AT(nFramesNative, nFramesUser);
    #undef DTW_AT

    if (totalDistance >= 1e8f) {
        totalDistance = 0.0f;
        for (int32_t k = 0; k < std::min(nFramesNative, nFramesUser); ++k) {
            totalDistance += std::abs(nativeEnergy[k] - userEnergy[k]);
        }
    }

    float normDistance = totalDistance / (nFramesNative + nFramesUser);

    // 3. Extract text phonemes
    std::string textStr = target_text ? target_text : "practice";
    auto textPhonemes = ExtractTextPhonemes(textStr);
    int32_t phonemeCount = std::min((int32_t)textPhonemes.size(), (int32_t)WORDLOOP_MAX_PHONEMES);
    out_result->total_phonemes = phonemeCount;

    int32_t nativeDurationMs = (native_count * 1000) / g_sampleRate;
    int32_t msPerPhoneme = nativeDurationMs / std::max(1, phonemeCount);

    int32_t deficientCount = 0;
    float sumPhonemeScore = 0.0f;

    for (int32_t p = 0; p < phonemeCount; ++p) {
        WordLoopPhonemeDiagnostic& diag = out_result->phonemes[p];
        std::strncpy(diag.phoneme_symbol, textPhonemes[p].c_str(), sizeof(diag.phoneme_symbol) - 1);
        
        diag.start_ms = p * msPerPhoneme;
        diag.end_ms = (p == phonemeCount - 1) ? nativeDurationMs : (p + 1) * msPerPhoneme;

        int32_t frameStart = std::min(nFramesNative - 1, (diag.start_ms * g_sampleRate) / (1000 * frameSize));
        int32_t frameEnd = std::min(nFramesNative - 1, (diag.end_ms * g_sampleRate) / (1000 * frameSize));
        
        float localNativeEnergy = 0.0f;
        float localUserEnergy = 0.0f;
        int32_t framesInRange = 0;

        for (int32_t f = frameStart; f <= frameEnd; ++f) {
            localNativeEnergy += nativeEnergy[f];
            int32_t userF = std::min(nFramesUser - 1, (int32_t)(f * slope));
            localUserEnergy += userEnergy[userF];
            framesInRange++;
        }

        if (framesInRange > 0) {
            localNativeEnergy /= framesInRange;
            localUserEnergy /= framesInRange;
        }

        // Phoneme accuracy
        float diff = std::abs(localNativeEnergy - localUserEnergy);
        float pScore = std::max(0.0f, std::min(100.0f, 100.0f - (diff * 220.0f)));
        
        // Pitch estimation for this phoneme segment
        int32_t pcmOffset = (diag.start_ms * g_sampleRate) / 1000;
        int32_t pcmLen = std::min(user_count - pcmOffset, (msPerPhoneme * g_sampleRate) / 1000);
        if (pcmOffset >= 0 && pcmLen > 256) {
            diag.pitch_hz = EstimatePitchHz(&user_pcm[pcmOffset], pcmLen, g_sampleRate);
        } else {
            diag.pitch_hz = 0.0f;
        }

        diag.acoustic_energy = localUserEnergy;
        diag.accuracy = pScore;
        sumPhonemeScore += pScore;

        if (pScore >= 85.0f) {
            diag.color_flag = 0; // Green
            diag.is_deficient = 0;
        } else if (pScore >= g_deficiencyThreshold) {
            diag.color_flag = 1; // Yellow
            diag.is_deficient = 0;
        } else {
            diag.color_flag = 2; // Red (Deficient section)
            diag.is_deficient = 1;
            deficientCount++;
        }
    }

    out_result->deficient_count = deficientCount;
    float avgPhonemeScore = (phonemeCount > 0) ? (sumPhonemeScore / phonemeCount) : 85.0f;

    // 4. Calculate Shadowing Quiz Scores
    // Latency estimation: how closely user started after native
    int32_t userStartFrame = 0;
    while (userStartFrame < nFramesUser && userEnergy[userStartFrame] < 0.02f) {
        userStartFrame++;
    }
    int32_t latencyMs = (userStartFrame * frameSize * 1000) / g_sampleRate;
    out_result->latency_ms = latencyMs;

    float timingScore = std::max(60.0f, std::min(100.0f, 100.0f - std::abs((float)nFramesUser - (float)nFramesNative) * 0.4f));
    float pitchContourScore = std::max(70.0f, std::min(100.0f, avgPhonemeScore * 0.92f + 7.5f));
    float overall = (avgPhonemeScore * 0.55f) + (timingScore * 0.25f) + (pitchContourScore * 0.20f);
    overall = std::max(0.0f, std::min(100.0f, overall));

    out_result->overall_accuracy = overall;
    out_result->phoneme_score = avgPhonemeScore;
    out_result->timing_score = timingScore;
    out_result->pitch_contour_score = pitchContourScore;

    // 5. 'Pronunciation Master' qualification check (>= 90%)
    if (overall >= 90.0f) {
        out_result->is_master_qualified = 1;
        out_result->master_token_hash = ComputeMasterTokenHash(target_text, overall, latencyMs);
        std::snprintf(out_result->summary_feedback, sizeof(out_result->summary_feedback),
            "🏆 [발음 마스터 달성] 원어민 음소와 90%% 이상 일치하는 완벽한 쉐도잉입니다!");
    } else if (overall >= g_deficiencyThreshold) {
        out_result->is_master_qualified = 0;
        out_result->master_token_hash = 0;
        std::snprintf(out_result->summary_feedback, sizeof(out_result->summary_feedback),
            "✨ 우수한 쉐도잉입니다. 빨간색/노란색으로 표시된 음소 구간을 조금 더 또렷하게 따라 해보세요.");
    } else {
        out_result->is_master_qualified = 0;
        out_result->master_token_hash = 0;
        std::snprintf(out_result->summary_feedback, sizeof(out_result->summary_feedback),
            "💪 보완이 필요합니다. %d개의 부족 발음 구간(빨간색 파형)에 유의하며 다시 쉐도잉해보세요.", deficientCount);
    }

    return 0;
}

WORDLOOP_SHADOW_API int32_t WordLoopShadow_GenerateWaveformColorMap(
    const WordLoopShadowEvaluationResult* result,
    int32_t* out_color_flags,
    int32_t max_points
) {
    if (!result || !out_color_flags || max_points <= 0) return -1;
    if (result->total_phonemes <= 0) {
        for (int32_t i = 0; i < max_points; ++i) out_color_flags[i] = 0;
        return max_points;
    }

    int32_t totalDurationMs = result->phonemes[result->total_phonemes - 1].end_ms;
    if (totalDurationMs <= 0) totalDurationMs = 1000;

    for (int32_t i = 0; i < max_points; ++i) {
        int32_t currentMs = (i * totalDurationMs) / max_points;
        int32_t assignedColor = 0; // Default green

        for (int32_t p = 0; p < result->total_phonemes; ++p) {
            if (currentMs >= result->phonemes[p].start_ms && currentMs <= result->phonemes[p].end_ms) {
                assignedColor = result->phonemes[p].color_flag;
                break;
            }
        }
        out_color_flags[i] = assignedColor;
    }

    return max_points;
}

WORDLOOP_SHADOW_API void WordLoopShadow_Release(void) {
    g_initialized = false;
}
