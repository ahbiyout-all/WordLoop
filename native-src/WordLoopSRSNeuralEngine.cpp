/**
 * WordLoopSRSNeuralEngine.cpp
 * WordLoop Cognitive Spaced Repetition (FSRS) & Typo-Tolerant Fuzzy Engine Implementation
 * Target: Windows x64 (MSVC / Clang) with AVX2 SIMD Optimization
 */

#define WORDLOOP_SRS_EXPORTS
#include "WordLoopSRSNeuralEngine.h"

#include <vector>
#include <cmath>
#include <algorithm>
#include <cstring>
#include <queue>

namespace {
    float g_targetRetention = 0.90f; // 90% target retention
    float g_decayFactor = -0.5f;     // Power decay exponent
    const float FACTOR = 19.0f / 81.0f; // FSRS constant: 19/81 approx 0.234567

    // Current retrievability calculation R(t, S)
    inline float CalculateRetrievability(float elapsedDays, float stability) {
        if (stability <= 0.05f) return 0.1f;
        if (elapsedDays <= 0.0f) return 1.0f;
        float base = 1.0f + FACTOR * (elapsedDays / stability);
        return std::pow(base, g_decayFactor);
    }

    // Levenshtein distance using 2-row rolling buffer
    int32_t FastLevenshteinDistance(const char* s1, int32_t len1, const char* s2, int32_t len2, int32_t maxDist) {
        if (std::abs(len1 - len2) > maxDist) return maxDist + 1;
        if (len1 == 0) return len2;
        if (len2 == 0) return len1;

        std::vector<int32_t> prevRow(len2 + 1);
        std::vector<int32_t> currRow(len2 + 1);

        for (int32_t j = 0; j <= len2; ++j) {
            prevRow[j] = j;
        }

        for (int32_t i = 1; i <= len1; ++i) {
            currRow[0] = i;
            int32_t minInRow = currRow[0];

            for (int32_t j = 1; j <= len2; ++j) {
                int32_t cost = (s1[i - 1] == s2[j - 1]) ? 0 : 1;
                currRow[j] = std::min({
                    prevRow[j] + 1,      // deletion
                    currRow[j - 1] + 1,  // insertion
                    prevRow[j - 1] + cost// substitution
                });
                if (currRow[j] < minInRow) {
                    minInRow = currRow[j];
                }
            }

            // Early exit if the minimum distance in this row exceeds maxDist
            if (minInRow > maxDist) {
                return maxDist + 1;
            }

            prevRow = currRow;
        }

        return currRow[len2];
    }
}

WORDLOOP_SRS_API int32_t WordLoopSRS_Init(float target_retention, float decay_factor) {
    if (target_retention <= 0.5f || target_retention >= 1.0f) return -1;
    g_targetRetention = target_retention;
    g_decayFactor = (decay_factor < 0.0f) ? decay_factor : -decay_factor;
    return 0;
}

WORDLOOP_SRS_API int32_t WordLoopSRS_CalculateInterval(
    const WordLoopSRSRecord* record,
    WordLoopSRSIntervalResult* out_result
) {
    if (!record || !out_result) return -1;

    float S = std::max(0.1f, record->stability);
    float D = std::max(1.0f, std::min(10.0f, record->difficulty));
    int32_t grade = record->last_grade;
    if (grade < 1 || grade > 4) grade = 3; // Default Good

    // 1. Calculate current Retrievability
    float R = CalculateRetrievability(record->last_elapsed_days, S);

    // 2. Compute Next Difficulty D'
    // D' = D - w6 * (grade - 3)
    float deltaD = -0.7f * (grade - 3);
    float nextD = std::max(1.0f, std::min(10.0f, D + deltaD));

    // 3. Compute Next Stability S'
    float nextS = S;
    if (grade == 1) { // Again (Lapse/Forgotten)
        // S'_recall = w11 * D^-w12 * ((S + 1)^w13 - 1) * exp(w14 * (1 - R))
        nextS = std::max(0.2f, 0.4f * std::pow(D, -0.15f) * std::pow(S + 1.0f, 0.2f) * std::exp(0.2f * (1.0f - R)));
    } else {
        // Successful Recall
        float hardPenalty = (grade == 2) ? 0.65f : 1.0f;
        float easyBonus = (grade == 4) ? 1.35f : 1.0f;

        // Pronunciation speech bonus / penalty
        float speechFactor = 1.0f;
        if (record->speech_accuracy >= 90.0f) {
            speechFactor = 1.15f; // Pronunciation excellence bonus
        } else if (record->speech_accuracy > 0.0f && record->speech_accuracy < 70.0f) {
            speechFactor = 0.85f; // Pronunciation flaw penalty
        }

        // Latency penalty: hesitant answer (>3.5s) suggests fragile memory
        float latencyFactor = 1.0f;
        if (record->last_response_ms > 3500.0f) {
            latencyFactor = 0.90f;
        }

        float recallMultiplier = 1.0f + std::exp(2.2f) * (11.0f - D) * std::pow(S, -0.2f) * (std::exp((1.0f - R) * 0.9f) - 1.0f);
        nextS = S * (1.0f + recallMultiplier * hardPenalty * easyBonus * speechFactor * latencyFactor);
    }

    // 4. Calculate Optimal Interval for Target Retention
    // I = (S / FACTOR) * (R_target^(1/decay) - 1)
    float powerTerm = std::pow(g_targetRetention, 1.0f / g_decayFactor) - 1.0f;
    float nextIntervalDays = (nextS / FACTOR) * powerTerm;
    if (grade == 1) {
        nextIntervalDays = 0.5f; // Review again within 12 hours
    } else {
        nextIntervalDays = std::max(1.0f, std::round(nextIntervalDays));
    }

    // 5. Calculate Priority Score (0 ~ 1000, higher means urgent review needed)
    int32_t priority = (int32_t)((1.0f - R) * 800.0f + (10.0f - record->last_grade) * 50.0f);
    if (record->lapses > 2) priority += 100;
    priority = std::max(0, std::min(1000, priority));

    out_result->next_stability = nextS;
    out_result->next_difficulty = nextD;
    out_result->optimal_interval_days = nextIntervalDays;
    out_result->retrievability = R;
    out_result->priority_score = priority;

    return 0;
}

WORDLOOP_SRS_API int32_t WordLoopSRS_RankVulnerableWords(
    const WordLoopSRSRecord* records,
    int32_t count,
    float retrievability_threshold,
    int32_t* out_ranked_ids,
    int32_t max_results
) {
    if (!records || count <= 0 || !out_ranked_ids || max_results <= 0) return -1;

    struct WordUrgency {
        int32_t id;
        float retrievability;
        int32_t lapses;
        int32_t last_grade;
    };

    std::vector<WordUrgency> candidates;
    candidates.reserve(count);

    for (int32_t i = 0; i < count; ++i) {
        float R = CalculateRetrievability(records[i].last_elapsed_days, records[i].stability);
        if (R <= retrievability_threshold || records[i].last_grade <= 2 || records[i].lapses > 0) {
            candidates.push_back({ records[i].word_id, R, records[i].lapses, records[i].last_grade });
        }
    }

    // Sort by lowest retrievability first, then highest lapses
    std::sort(candidates.begin(), candidates.end(), [](const WordUrgency& a, const WordUrgency& b) {
        if (std::abs(a.retrievability - b.retrievability) > 0.05f) {
            return a.retrievability < b.retrievability;
        }
        return a.lapses > b.lapses;
    });

    int32_t returnCount = std::min((int32_t)candidates.size(), max_results);
    for (int32_t i = 0; i < returnCount; ++i) {
        out_ranked_ids[i] = candidates[i].id;
    }

    return returnCount;
}

WORDLOOP_SRS_API int32_t WordLoopSRS_FuzzySearch(
    const char* query,
    const char** dictionary,
    int32_t dict_size,
    int32_t max_distance,
    int32_t* out_matched_indices,
    int32_t max_matches
) {
    if (!query || !dictionary || dict_size <= 0 || !out_matched_indices || max_matches <= 0) return -1;

    int32_t queryLen = (int32_t)std::strlen(query);
    if (queryLen == 0) return 0;

    struct MatchCandidate {
        int32_t index;
        int32_t distance;
    };

    std::vector<MatchCandidate> matches;

    for (int32_t i = 0; i < dict_size; ++i) {
        if (!dictionary[i]) continue;
        int32_t wordLen = (int32_t)std::strlen(dictionary[i]);
        int32_t dist = FastLevenshteinDistance(query, queryLen, dictionary[i], wordLen, max_distance);
        if (dist <= max_distance) {
            matches.push_back({ i, dist });
        }
    }

    std::sort(matches.begin(), matches.end(), [](const MatchCandidate& a, const MatchCandidate& b) {
        return a.distance < b.distance;
    });

    int32_t resultCount = std::min((int32_t)matches.size(), max_matches);
    for (int32_t i = 0; i < resultCount; ++i) {
        out_matched_indices[i] = matches[i].index;
    }

    return resultCount;
}

WORDLOOP_SRS_API void WordLoopSRS_Release(void) {
    // Stateless engine cleanup
}
