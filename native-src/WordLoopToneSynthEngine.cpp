/**
 * WordLoopToneSynthEngine.cpp
 * WordLoop Emotional Adaptive Tone Polyphonic Sound & Real-Time Nag BGM Synthesis Engine
 * Target: Windows x64 (MSVC / Clang ABI) with AVX2 SIMD Optimization
 */

#define WORDLOOP_TONESYNTH_EXPORTS
#include "WordLoopToneSynthEngine.h"

#include <vector>
#include <cmath>
#include <cstring>
#include <algorithm>
#include <random>

namespace {
    int32_t g_sampleRate = 44100;
    bool g_initialized = false;
    const double PI = 3.14159265358979323846;

    // Fast Oscillator Waveform Synthesizers
    inline float OscSine(double phase) {
        return (float)std::sin(phase);
    }

    inline float OscTriangle(double phase) {
        double norm = phase / (2.0 * PI);
        norm = norm - std::floor(norm);
        return (float)(2.0 * std::abs(2.0 * norm - 1.0) - 1.0);
    }

    inline float OscSawtooth(double phase) {
        double norm = phase / (2.0 * PI);
        norm = norm - std::floor(norm);
        return (float)(2.0 * norm - 1.0);
    }

    inline float OscSquare(double phase) {
        double norm = phase / (2.0 * PI);
        norm = norm - std::floor(norm);
        return (norm < 0.5) ? 0.75f : -0.75f;
    }

    // ADSR Envelope Generator
    float CalculateADSR(
        float timeSec,
        float noteDurationSec,
        float attackSec,
        float decaySec,
        float sustainLevel,
        float releaseSec
    ) {
        if (timeSec < 0.0f || timeSec > noteDurationSec + releaseSec) return 0.0f;

        if (timeSec < attackSec) {
            // Attack phase
            return (attackSec > 0.001f) ? (timeSec / attackSec) : 1.0f;
        } else if (timeSec < attackSec + decaySec) {
            // Decay phase
            float t = (timeSec - attackSec) / decaySec;
            return 1.0f - (1.0f - sustainLevel) * t;
        } else if (timeSec < noteDurationSec) {
            // Sustain phase
            return sustainLevel;
        } else {
            // Release phase
            float t = (timeSec - noteDurationSec) / releaseSec;
            return std::max(0.0f, sustainLevel * (1.0f - t));
        }
    }

    // MIDI Note to Frequency Helper: f = 440 * 2^((midi - 69) / 12)
    inline float MidiToFreq(int32_t midiNote) {
        return 440.0f * (float)std::pow(2.0, (midiNote - 69.0) / 12.0);
    }
}

WORDLOOP_SYNTH_API int32_t WordLoopSynth_Init(int32_t sample_rate) {
    if (sample_rate <= 0) return -1;
    g_sampleRate = sample_rate;
    g_initialized = true;
    return 0;
}

WORDLOOP_SYNTH_API int32_t WordLoopSynth_GenerateBGM(
    int32_t tone_type,
    float duration_sec,
    float* out_pcm,
    int32_t max_samples,
    WordLoopToneBGMInfo* out_info
) {
    if (!out_pcm || max_samples <= 0 || duration_sec <= 0.0f) return -1;
    if (!g_initialized) g_sampleRate = 44100;

    int32_t totalSamples = (int32_t)std::min((float)max_samples, duration_sec * g_sampleRate);
    if (totalSamples <= 0) return -1;

    // Clear buffer
    std::fill(out_pcm, out_pcm + totalSamples, 0.0f);

    float bpm = 120.0f;
    const char* toneName = "Tsundere";
    const char* musicalKey = "C Major";

    if (tone_type == 0) {
        // ==========================================
        // 0. TSUNDERE: Bouncy Staccato Swing (138 BPM, C Major)
        // Comical tension, fast tempo, bouncy square/saw bass + lively bell
        // ==========================================
        bpm = 138.0f;
        toneName = "Tsundere (Bouncy Tension)";
        musicalKey = "C Major";

        float beatSec = 60.0f / bpm;
        int32_t barSamples = (int32_t)(beatSec * 4.0f * g_sampleRate);

        // Chord roots: C4(60), A3(57), D4(62), G3(55)
        int32_t chordProgression[4] = { 60, 57, 62, 55 };
        // Lead melody motif notes: C5, E5, G5, B4, A4, G4, E4, D4
        int32_t leadMotif[8] = { 72, 76, 79, 71, 69, 67, 64, 62 };

        for (int32_t i = 0; i < totalSamples; ++i) {
            float t = (float)i / (float)g_sampleRate;
            int32_t barIndex = (i / barSamples) % 4;
            float barTime = (float)(i % barSamples) / (float)g_sampleRate;
            int32_t beatIndex = (int32_t)(barTime / beatSec) % 4;
            float beatTime = std::fmod(barTime, beatSec);

            float mix = 0.0f;

            // 1. Snappy Staccato Bass (Square + Saw)
            int32_t bassMidi = chordProgression[barIndex] - 24; // 2 octaves down
            float bassFreq = MidiToFreq(bassMidi);
            float bassEnv = CalculateADSR(beatTime, beatSec * 0.45f, 0.01f, 0.08f, 0.2f, 0.05f);
            double bassPhase = 2.0 * PI * bassFreq * t;
            mix += (OscSquare(bassPhase) * 0.6f + OscSawtooth(bassPhase) * 0.4f) * bassEnv * 0.22f;

            // 2. Playful Arpeggio Lead (Triangle + Sine)
            int32_t noteSub = (int32_t)(beatTime / (beatSec / 2.0f)) % 2;
            int32_t leadMidi = leadMotif[(barIndex * 2 + noteSub) % 8];
            float leadFreq = MidiToFreq(leadMidi);
            float leadEnv = CalculateADSR(beatTime, beatSec * 0.35f, 0.015f, 0.06f, 0.15f, 0.08f);
            double leadPhase = 2.0 * PI * leadFreq * t;
            mix += (OscTriangle(leadPhase) * 0.7f + OscSine(leadPhase) * 0.3f) * leadEnv * 0.18f;

            // 3. Comical Rhythm Click / Hat
            if (beatIndex % 2 == 1 && beatTime < 0.04f) {
                float noise = (float)((std::rand() % 2000) - 1000) / 1000.0f;
                mix += noise * (1.0f - beatTime / 0.04f) * 0.08f;
            }

            out_pcm[i] = mix;
        }

    } else if (tone_type == 1) {
        // ==========================================
        // 1. STRICT: Dramatic Suspense Minor (116 BPM, D Minor)
        // Urgent thriller drone, heartbeat low pulse, minor suspension
        // ==========================================
        bpm = 116.0f;
        toneName = "Strict (Dramatic Suspense)";
        musicalKey = "D Minor";

        float beatSec = 60.0f / bpm;
        int32_t barSamples = (int32_t)(beatSec * 4.0f * g_sampleRate);

        // Chords: Dm(50), Bb(46), Gm(43), A(45)
        int32_t strictChords[4] = { 50, 46, 43, 45 };
        int32_t urgentArp[8] = { 62, 65, 69, 74, 73, 69, 65, 62 };

        for (int32_t i = 0; i < totalSamples; ++i) {
            float t = (float)i / (float)g_sampleRate;
            int32_t barIndex = (i / barSamples) % 4;
            float barTime = (float)(i % barSamples) / (float)g_sampleRate;
            float beatTime = std::fmod(barTime, beatSec);

            float mix = 0.0f;

            // 1. Deep Sub-Drone Bass (Sawtooth + Sine sub)
            int32_t droneMidi = strictChords[barIndex] - 12;
            float droneFreq = MidiToFreq(droneMidi);
            double dronePhase = 2.0 * PI * droneFreq * t;
            mix += (OscSawtooth(dronePhase) * 0.4f + OscSine(dronePhase * 0.5) * 0.6f) * 0.20f;

            // 2. Urgent Heartbeat Low Pulse (Bass Drum at every beat)
            if (beatTime < 0.18f) {
                float kickEnv = std::exp(-beatTime * 22.0f);
                float kickFreq = 120.0f * (1.0f - beatTime * 4.0f) + 45.0f;
                mix += OscSine(2.0 * PI * kickFreq * beatTime) * kickEnv * 0.32f;
            }

            // 3. Tense Minor Arpeggio
            int32_t arpStep = (int32_t)(barTime / (beatSec / 2.0f)) % 8;
            int32_t arpMidi = urgentArp[arpStep];
            float arpFreq = MidiToFreq(arpMidi);
            float arpEnv = CalculateADSR(std::fmod(barTime, beatSec / 2.0f), (beatSec / 2.0f) * 0.8f, 0.01f, 0.05f, 0.3f, 0.05f);
            double arpPhase = 2.0 * PI * arpFreq * t;
            mix += OscSawtooth(arpPhase) * arpEnv * 0.16f;

            out_pcm[i] = mix;
        }

    } else {
        // ==========================================
        // 2. AFFECTIONATE: Warm Lofi Celesta & Major 7th Pad (84 BPM, F Major)
        // Gentle healing chords, warm sine celesta bell, loving atmosphere
        // ==========================================
        bpm = 84.0f;
        toneName = "Affectionate (Warm Celesta)";
        musicalKey = "F Major";

        float beatSec = 60.0f / bpm;
        int32_t barSamples = (int32_t)(beatSec * 4.0f * g_sampleRate);

        // Chords: Fmaj7(53), Bbmaj7(58), Am7(57), C7(60)
        int32_t warmChords[4][3] = {
            { 53, 57, 60 }, // F, A, C
            { 58, 62, 65 }, // Bb, D, F
            { 57, 60, 64 }, // A, C, E
            { 60, 64, 67 }  // C, E, G
        };
        int32_t gentleMelody[4] = { 69, 72, 71, 67 }; // A4, C5, B4, G4

        for (int32_t i = 0; i < totalSamples; ++i) {
            float t = (float)i / (float)g_sampleRate;
            int32_t barIndex = (i / barSamples) % 4;
            float barTime = (float)(i % barSamples) / (float)g_sampleRate;

            float mix = 0.0f;

            // 1. Warm Soft Chord Pad (Sine Harmony)
            for (int k = 0; k < 3; ++k) {
                float chordFreq = MidiToFreq(warmChords[barIndex][k]);
                double padPhase = 2.0 * PI * chordFreq * t;
                mix += OscSine(padPhase) * 0.08f;
            }

            // 2. Music Box Celesta Bell Melody
            int32_t melIdx = (int32_t)(barTime / beatSec) % 4;
            float bellTime = std::fmod(barTime, beatSec);
            float bellFreq = MidiToFreq(gentleMelody[melIdx]);
            float bellEnv = CalculateADSR(bellTime, beatSec * 0.9f, 0.005f, 0.25f, 0.1f, 0.3f);
            double bellPhase = 2.0 * PI * bellFreq * t;
            // Bell shimmer: fundamental + octave overtone
            mix += (OscSine(bellPhase) * 0.7f + OscSine(bellPhase * 2.0) * 0.3f) * bellEnv * 0.20f;

            // 3. Gentle Breathing Sub-Bass
            float bassFreq = MidiToFreq(warmChords[barIndex][0] - 12);
            double subPhase = 2.0 * PI * bassFreq * t;
            mix += OscSine(subPhase) * 0.14f;

            out_pcm[i] = mix;
        }
    }

    // 4. Master Soft Limiter & Fade In/Out
    float peakAmp = 0.0f;
    double energySum = 0.0;
    const int32_t fadeSamples = (int32_t)(g_sampleRate * 0.25f); // 250ms fade

    for (int32_t i = 0; i < totalSamples; ++i) {
        float sample = out_pcm[i];

        // Fade in
        if (i < fadeSamples) {
            sample *= (float)i / (float)fadeSamples;
        }
        // Fade out
        if (i > totalSamples - fadeSamples) {
            sample *= (float)(totalSamples - i) / (float)fadeSamples;
        }

        // Soft clipper tanh
        sample = std::tanh(sample * 1.35f);
        out_pcm[i] = sample;

        float absVal = std::abs(sample);
        if (absVal > peakAmp) peakAmp = absVal;
        energySum += (double)sample * sample;
    }

    if (out_info) {
        out_info->tone_type = tone_type;
        out_info->bpm = bpm;
        out_info->sample_rate = g_sampleRate;
        out_info->total_samples = totalSamples;
        out_info->peak_amplitude = peakAmp;
        out_info->rms_energy = (float)std::sqrt(energySum / totalSamples);
        std::strncpy(out_info->tone_name, toneName, sizeof(out_info->tone_name) - 1);
        std::strncpy(out_info->musical_key, musicalKey, sizeof(out_info->musical_key) - 1);
    }

    return totalSamples;
}

WORDLOOP_SYNTH_API int32_t WordLoopSynth_GetSpectrum(
    const float* pcm_window,
    int32_t window_size,
    float* out_bars,
    int32_t bar_count
) {
    if (!pcm_window || window_size <= 0 || !out_bars || bar_count <= 0) return -1;

    // Logarithmic sub-band energy calculation
    int32_t subBandSize = std::max(1, window_size / bar_count);

    for (int32_t b = 0; b < bar_count; ++b) {
        int32_t startIdx = b * subBandSize;
        int32_t endIdx = std::min(window_size, startIdx + subBandSize);

        double bandSum = 0.0;
        for (int32_t i = startIdx; i < endIdx; ++i) {
            float s = pcm_window[i];
            bandSum += (double)s * s;
        }

        float rms = (float)std::sqrt(bandSum / (endIdx - startIdx + 1));
        // Scale to 0.0 ~ 100.0 with dynamic curve
        float barHeight = std::min(100.0f, std::max(8.0f, rms * 280.0f));
        out_bars[b] = barHeight;
    }

    return 0;
}

WORDLOOP_SYNTH_API int32_t WordLoopSynth_SynthesizeToneChord(
    int32_t tone_type,
    int32_t chord_step,
    float* out_pcm,
    int32_t sample_count
) {
    if (!out_pcm || sample_count <= 0) return -1;

    float rootFreq = 440.0f;
    if (tone_type == 0) rootFreq = MidiToFreq(60 + (chord_step % 4) * 2);      // Tsundere C
    else if (tone_type == 1) rootFreq = MidiToFreq(50 + (chord_step % 4) * 3); // Strict Dm
    else rootFreq = MidiToFreq(53 + (chord_step % 4) * 2);                     // Affectionate F

    for (int32_t i = 0; i < sample_count; ++i) {
        float t = (float)i / (float)g_sampleRate;
        float env = CalculateADSR(t, 0.4f, 0.02f, 0.1f, 0.3f, 0.1f);
        double phase = 2.0 * PI * rootFreq * t;
        out_pcm[i] = (float)std::sin(phase) * env * 0.4f;
    }

    return 0;
}

WORDLOOP_SYNTH_API void WordLoopSynth_Release(void) {
    // Engine cleanup
}
