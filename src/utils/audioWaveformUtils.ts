/**
 * Audio Waveform & Voice Activity Detection (VAD) Utilities
 * Extracts the genuine spoken voice portion of a recording,
 * trimming leading/trailing silence, and creating an aligned 50-bar comparative waveform.
 */

export interface VoiceSegmentResult {
  detected: boolean;
  startSec: number;
  endSec: number;
  durationSec: number;
  activeDurationSec?: number;
  totalSec: number;
  silenceTrimmedSec: number;
  activeSamples: Float32Array;
  trimmedAudioBlob?: Blob;
  trimmedAudioUrl?: string;
  normalizedWaveform: number[]; // 50 normalized amplitude points between 0.12 and 1.0
}

/**
 * Encodes a mono Float32Array of audio samples into a standard 16-bit PCM WAV Blob.
 */
export function createWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const format = 1; // PCM
  const bitDepth = 16;
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const bufferArray = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bufferArray);

  // RIFF Chunk Descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // ByteRate
  view.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  // Write PCM audio data (converted from Float32 to 16-bit signed integer)
  let offset = 44;
  for (let i = 0; i < numSamples; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Performs Voice Activity Detection (VAD) on raw Float32Array PCM audio data.
 * Pinpoints the exact active speech onset and offset, strips leading/trailing silence,
 * and downsamples the active voice portion into discrete amplitude bins for waveform alignment.
 */
export function extractVoiceSegmentFromFloat32(
  rawData: Float32Array,
  sampleRate = 44100,
  targetSampleCount = 50
): VoiceSegmentResult {
  const totalSec = Number((rawData.length / sampleRate).toFixed(2));

  // Frame size: 20ms windows
  const frameSize = Math.max(128, Math.floor(sampleRate * 0.02));
  const frameCount = Math.floor(rawData.length / frameSize);

  if (frameCount === 0 || rawData.length === 0) {
    return {
      detected: false,
      startSec: 0,
      endSec: totalSec,
      durationSec: totalSec,
      totalSec,
      silenceTrimmedSec: 0,
      activeSamples: rawData,
      normalizedWaveform: Array(targetSampleCount).fill(0.12),
    };
  }

  // Calculate RMS (Root Mean Square) energy of each frame
  const frameEnergies: number[] = new Float64Array(frameCount) as unknown as number[];
  let maxEnergy = 0;

  for (let f = 0; f < frameCount; f++) {
    let sumSq = 0;
    const offset = f * frameSize;
    for (let i = 0; i < frameSize; i++) {
      const val = rawData[offset + i] || 0;
      sumSq += val * val;
    }
    const rms = Math.sqrt(sumSq / frameSize);
    frameEnergies[f] = rms;
    if (rms > maxEnergy) {
      maxEnergy = rms;
    }
  }

  // Sort energies to estimate the environmental noise floor (20th percentile)
  const sortedEnergies = Array.from(frameEnergies).sort((a, b) => a - b);
  const noiseFloor = sortedEnergies[Math.floor(frameCount * 0.2)] || 0.0005;
  const speechPeak = sortedEnergies[Math.floor(frameCount * 0.95)] || maxEnergy || 0.01;

  // Adaptive threshold: slightly above noise floor, scaled by dynamic peak
  const adaptiveThreshold = Math.max(
    0.006,
    noiseFloor + (speechPeak - noiseFloor) * 0.16
  );

  // Classify frames as active speech
  const isActive = frameEnergies.map((e) => e >= adaptiveThreshold);

  // Hangover smoothing: Bridge short unvoiced gaps (plosives, inter-syllable pauses <= 300ms)
  const maxGapFrames = Math.floor(0.3 / 0.02); // ~15 frames (300ms)
  let lastActiveIdx = -1;

  for (let i = 0; i < frameCount; i++) {
    if (isActive[i]) {
      if (lastActiveIdx !== -1 && i - lastActiveIdx <= maxGapFrames) {
        for (let g = lastActiveIdx + 1; g < i; g++) {
          isActive[g] = true;
        }
      }
      lastActiveIdx = i;
    }
  }

  // Find start and end frames of voice
  const firstActiveFrame = isActive.indexOf(true);
  const lastActiveFrame = isActive.lastIndexOf(true);

  // If no speech detected above threshold, fall back to entire buffer
  if (firstActiveFrame === -1 || lastActiveFrame === -1 || maxEnergy < 0.003) {
    const defaultSamples = downsampleAudio(rawData, targetSampleCount);
    let fullWavBlob: Blob | undefined;
    let fullWavUrl: string | undefined;
    // Only generate a fallback WAV URL if there is non-trivial audio length and audible signal
    if (totalSec >= 0.25 && maxEnergy >= 0.0015) {
      try {
        fullWavBlob = createWavBlob(rawData, sampleRate);
        fullWavUrl = URL.createObjectURL(fullWavBlob);
      } catch (e) {}
    }

    return {
      detected: false,
      startSec: 0,
      endSec: totalSec,
      durationSec: totalSec,
      totalSec,
      silenceTrimmedSec: 0,
      activeSamples: rawData,
      trimmedAudioBlob: fullWavBlob,
      trimmedAudioUrl: fullWavUrl,
      normalizedWaveform: defaultSamples,
    };
  }

  // Add tight pre-roll (~40ms) and post-roll (~60ms) so leading/trailing silence doesn't shift the waveform
  const preRollFrames = Math.floor(0.04 / 0.02); // 2 frames (40ms)
  const postRollFrames = Math.floor(0.06 / 0.02); // 3 frames (60ms)

  const startFrame = Math.max(0, firstActiveFrame - preRollFrames);
  const endFrame = Math.min(frameCount - 1, lastActiveFrame + postRollFrames);

  const startSample = startFrame * frameSize;
  const endSample = Math.min(rawData.length, (endFrame + 1) * frameSize);

  const durationSamples = endSample - startSample;
  const durationSec = Number((durationSamples / sampleRate).toFixed(2));
  const startSec = Number((startSample / sampleRate).toFixed(2));
  const endSec = Number((endSample / sampleRate).toFixed(2));
  const silenceTrimmedSec = Number(Math.max(0, totalSec - durationSec).toFixed(2));

  // If detected voice segment is too brief (< 0.15s), fallback to full audio only if long enough
  if (durationSec < 0.15) {
    const defaultSamples = downsampleAudio(rawData, targetSampleCount);
    let fullWavBlob: Blob | undefined;
    let fullWavUrl: string | undefined;
    if (totalSec >= 0.25 && maxEnergy >= 0.0015) {
      try {
        fullWavBlob = createWavBlob(rawData, sampleRate);
        fullWavUrl = URL.createObjectURL(fullWavBlob);
      } catch (e) {}
    }

    return {
      detected: false,
      startSec: 0,
      endSec: totalSec,
      durationSec: totalSec,
      totalSec,
      silenceTrimmedSec: 0,
      activeSamples: rawData,
      trimmedAudioBlob: fullWavBlob,
      trimmedAudioUrl: fullWavUrl,
      normalizedWaveform: defaultSamples,
    };
  }

  // Sliced active speech data
  const activeVoiceData = rawData.subarray(startSample, endSample);

  // Generate 50 discrete sample bars from active speech data
  const normalizedWaveform = downsampleAudio(activeVoiceData, targetSampleCount);

  // Generate a trimmed WAV blob and URL for instantaneous speech playback
  let trimmedAudioBlob: Blob | undefined;
  let trimmedAudioUrl: string | undefined;
  try {
    trimmedAudioBlob = createWavBlob(activeVoiceData, sampleRate);
    trimmedAudioUrl = URL.createObjectURL(trimmedAudioBlob);
  } catch (err) {
    console.warn('Trimmed WAV blob creation warning:', err);
  }

  return {
    detected: true,
    startSec,
    endSec,
    durationSec,
    totalSec,
    silenceTrimmedSec,
    activeSamples: activeVoiceData,
    trimmedAudioBlob,
    trimmedAudioUrl,
    normalizedWaveform,
  };
}

/**
 * Performs Voice Activity Detection (VAD) on decoded AudioBuffer or Float32Array.
 */
export function extractVoiceSegment(
  audioInput: AudioBuffer | Float32Array,
  sampleRateOrTargetCount: number = 50,
  maybeTargetSampleCount = 50
): VoiceSegmentResult {
  if (audioInput instanceof Float32Array) {
    const sampleRate = sampleRateOrTargetCount > 100 ? sampleRateOrTargetCount : 44100;
    const targetCount = sampleRateOrTargetCount > 100 ? maybeTargetSampleCount : sampleRateOrTargetCount;
    return extractVoiceSegmentFromFloat32(audioInput, sampleRate, targetCount);
  }

  const rawData = audioInput.getChannelData(0);
  const sampleRate = audioInput.sampleRate;
  const targetCount = sampleRateOrTargetCount <= 100 ? sampleRateOrTargetCount : 50;
  return extractVoiceSegmentFromFloat32(rawData, sampleRate, targetCount);
}

/**
 * Safely decodes a recorded audio Blob or Object URL into PCM samples, extracts the voice segment,
 * and ALWAYS closes the temporary AudioContext in a finally block so repeated recordings never
 * exhaust the browser's hardware AudioContext limit (max 6 contexts).
 */
export async function decodeAndExtractVoiceSegment(
  audioSource: Blob | string,
  targetSampleCount = 50
): Promise<VoiceSegmentResult | null> {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  let audioCtx: AudioContext | null = null;
  try {
    const arrayBuffer =
      typeof audioSource === 'string'
        ? await (await fetch(audioSource)).arrayBuffer()
        : await audioSource.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) return null;

    audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return extractVoiceSegment(audioBuffer, targetSampleCount);
  } catch (err) {
    console.warn('decodeAndExtractVoiceSegment warning:', err);
    return null;
  } finally {
    if (audioCtx && audioCtx.state !== 'closed') {
      try {
        await audioCtx.close();
      } catch (e) {}
    }
  }
}

/**
 * Downsamples an audio Float32Array into a fixed number of normalized amplitude bins [0.12 ~ 0.98].
 * Uses RMS energy, 90th-percentile peak normalization (to prevent a single plosive mic pop from
 * crushing the rest of the sentence), soft-knee perceptual scaling, and 3-tap envelope smoothing.
 */
export function downsampleAudio(samples: Float32Array, totalBins = 50): number[] {
  if (samples.length === 0) {
    return Array(totalBins).fill(0.12);
  }

  const blockSize = Math.floor(samples.length / totalBins);
  if (blockSize <= 0) {
    return Array(totalBins).fill(0.12);
  }

  const rawRms: number[] = [];

  for (let i = 0; i < totalBins; i++) {
    const blockStart = blockSize * i;
    let sumSq = 0;
    for (let j = 0; j < blockSize; j++) {
      const val = samples[blockStart + j] || 0;
      sumSq += val * val;
    }
    rawRms.push(Math.sqrt(sumSq / blockSize));
  }

  // Smooth raw RMS with a 3-tap vocal envelope filter [0.22, 0.56, 0.22]
  const smoothedRms = rawRms.map((val, idx) => {
    const prev = rawRms[Math.max(0, idx - 1)];
    const next = rawRms[Math.min(rawRms.length - 1, idx + 1)];
    return prev * 0.22 + val * 0.56 + next * 0.22;
  });

  // Use 90th percentile instead of absolute max so a single breath/plosive spike doesn't flatten other words
  const sorted = [...smoothedRms].sort((a, b) => a - b);
  const p15 = sorted[Math.floor(sorted.length * 0.15)] || 0;
  const p92 = sorted[Math.floor(sorted.length * 0.92)] || Math.max(...smoothedRms, 0.001);
  const dynamicSpan = Math.max(0.002, p92 - p15 * 0.5);

  return smoothedRms.map((amp) => {
    const net = Math.max(0, amp - p15 * 0.35);
    const ratio = Math.min(1.05, net / dynamicSpan);
    // Perceptual vocal curve (0.76 power) so normal conversational syllables match reference contour height
    const perceptual = Math.pow(ratio, 0.76) * 0.94;
    return Math.max(0.12, Math.min(0.98, Number(perceptual.toFixed(3))));
  });
}

/**
 * Aligns the user's extracted 50-bin voice envelope to the target AI reference syllable envelope.
 * Compresses unnatural mid-sentence pauses and elastically aligns vocal bursts to syllable windows
 * while preserving the user's genuine vocal intensity and stress variations.
 */
export function alignUserWaveformToReference(
  userWaveform: number[],
  aiSamples: number[]
): number[] {
  if (!userWaveform || userWaveform.length === 0) return [];
  const count = aiSamples.length || 50;

  // 1. Strip out long internal dead-air gaps (bins < 0.16) if the user paused mid-sentence,
  // while keeping natural inter-word dips, then resample cleanly to `count` bins
  const activeWeightedBins: number[] = [];
  for (let i = 0; i < userWaveform.length; i++) {
    const val = userWaveform[i];
    const prev = userWaveform[Math.max(0, i - 1)];
    const next = userWaveform[Math.min(userWaveform.length - 1, i + 1)];
    // If 3 consecutive bins are near noise floor, compress the dead pause
    if (val < 0.16 && prev < 0.16 && next < 0.16 && activeWeightedBins.length > 0 && activeWeightedBins[activeWeightedBins.length - 1] < 0.16) {
      continue;
    }
    activeWeightedBins.push(val);
  }

  const sourceBins = activeWeightedBins.length >= 6 ? activeWeightedBins : userWaveform;

  // 2. Resample sourceBins to `count` using linear interpolation
  const resampled: number[] = new Array(count).fill(0.12);
  for (let i = 0; i < count; i++) {
    const pos = (i / Math.max(1, count - 1)) * (sourceBins.length - 1);
    const idxLow = Math.floor(pos);
    const idxHigh = Math.min(sourceBins.length - 1, Math.ceil(pos));
    const frac = pos - idxLow;
    resampled[i] = sourceBins[idxLow] * (1 - frac) + sourceBins[idxHigh] * frac;
  }

  // 3. Local window phase-lock: within a ±2 bin neighborhood, align user vocal peaks
  // with corresponding syllable peaks so slight timing offsets don't cause false mismatch
  const aligned: number[] = new Array(count).fill(0.12);
  for (let i = 0; i < count; i++) {
    const aiVal = aiSamples[i] ?? 0.5;
    let bestVal = resampled[i];
    let bestDist = Math.abs(bestVal - aiVal);

    for (let offset = -2; offset <= 2; offset++) {
      const neighborIdx = i + offset;
      if (neighborIdx >= 0 && neighborIdx < count) {
        const candidate = resampled[neighborIdx];
        // Penalize distant offsets slightly so genuine user stress errors are still preserved
        const effectiveDist = Math.abs(candidate - aiVal) + Math.abs(offset) * 0.045;
        if (effectiveDist < bestDist) {
          bestDist = effectiveDist;
          bestVal = candidate;
        }
      }
    }

    // Blend 75% phase-aligned user vocal amplitude + 25% direct resampled amplitude
    const blended = bestVal * 0.75 + resampled[i] * 0.25;
    aligned[i] = Math.max(0.12, Math.min(0.98, Number(blended.toFixed(3))));
  }

  return aligned;
}

export interface SilenceAutoStopConfig {
  estimatedDurationSec: number;
  initialSilenceTimeoutMs: number; // Max wait for user to start speaking
  postSpeechSilenceTimeoutMs: number; // Silence duration after speech to trigger auto-stop
  maxTotalDurationMs: number; // Absolute safety ceiling
  isSentence: boolean;
  wordCount: number;
}

/**
 * Calculates tailored speech duration and silence thresholds based on target word/sentence length.
 */
export function getExpectedSpeechDurationAndSilenceLimits(text: string): SilenceAutoStopConfig {
  const clean = (text || '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);
  const isSentence = wordCount > 1;

  // Approximate syllable count from vowel clusters
  const totalSyllables = words.reduce((acc, w) => {
    const matches = w.match(/[aeiouy]{1,2}/gi);
    return acc + Math.max(1, matches ? matches.length : 1);
  }, 0);

  // Standard duration estimate: ~0.28s per syllable + 0.12s per word boundary
  const estimatedDurationSec = Number(
    Math.max(0.6, totalSyllables * 0.28 + wordCount * 0.12).toFixed(1)
  );

  let initialSilenceTimeoutMs: number;
  let postSpeechSilenceTimeoutMs: number;
  let maxTotalDurationMs: number;

  if (wordCount === 1) {
    // 1 Word: e.g. "apple", "communication"
    // Initial silence: ~3.0s (if user doesn't speak at all)
    initialSilenceTimeoutMs = 3000;
    // Post-speech silence: once spoken, a single word has no pause; 1.1s is definitive end
    postSpeechSilenceTimeoutMs = 1100;
    // Hard maximum: 5.0s
    maxTotalDurationMs = 5000;
  } else if (wordCount <= 4) {
    // Short sentence / phrase: e.g. "Good morning", "How are you?"
    initialSilenceTimeoutMs = 3600;
    // Allow small natural transition between words, stop after 1.4s of trailing silence
    postSpeechSilenceTimeoutMs = 1400;
    maxTotalDurationMs = Math.min(10000, Math.max(6000, Math.round(estimatedDurationSec * 2200)));
  } else {
    // Long sentence: 5+ words
    initialSilenceTimeoutMs = 4500;
    // Allow natural inter-clause breathing pauses up to ~600-800ms; stop after 1.8s silence
    postSpeechSilenceTimeoutMs = 1800;
    maxTotalDurationMs = Math.min(22000, Math.max(8000, Math.round(estimatedDurationSec * 2000 + 3500)));
  }

  return {
    estimatedDurationSec,
    initialSilenceTimeoutMs,
    postSpeechSilenceTimeoutMs,
    maxTotalDurationMs,
    isSentence,
    wordCount,
  };
}

export type SilenceStopReason = 'initial_silence' | 'trailing_silence' | 'max_timeout';

export interface LiveSilenceDetectorOptions {
  stream: MediaStream;
  targetText: string;
  onSilenceTimeout: (reason: SilenceStopReason) => void;
  onSpeechDetected?: () => void;
  onVolumeTick?: (rms: number, isSpeech: boolean, silenceSec: number) => void;
  onVoiceSegmentReady?: (result: VoiceSegmentResult) => void;
}

export interface LiveSilenceDetector {
  stop: () => VoiceSegmentResult | null;
  getConfig: () => SilenceAutoStopConfig;
}

/**
 * Creates a real-time silence detection monitor on an active MediaStream.
 * Simultaneously records raw PCM Float32 audio samples in memory so that
 * when recording stops, it directly extracts the genuine voice segment without
 * failing Web Audio decodeAudioData on mobile devices.
 */
export function createLiveSilenceDetector(
  options: LiveSilenceDetectorOptions
): LiveSilenceDetector | null {
  const { stream, targetText, onSilenceTimeout, onSpeechDetected, onVolumeTick, onVoiceSegmentReady } = options;

  if (typeof window === 'undefined') return null;

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  let audioCtx: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let scriptProcessor: ScriptProcessorNode | null = null;
  let dummyGain: GainNode | null = null;
  let intervalId: any = null;
  let isStopped = false;

  const pcmChunks: Float32Array[] = [];
  const config = getExpectedSpeechDurationAndSilenceLimits(targetText);

  try {
    audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);

    // Capture raw Float32 PCM directly from stream
    if (audioCtx.createScriptProcessor) {
      scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessor.onaudioprocess = (e) => {
        if (isStopped) return;
        const inputData = e.inputBuffer.getChannelData(0);
        pcmChunks.push(new Float32Array(inputData));
      };
      source.connect(scriptProcessor);
      dummyGain = audioCtx.createGain();
      dummyGain.gain.value = 0;
      scriptProcessor.connect(dummyGain);
      dummyGain.connect(audioCtx.destination);
    }
  } catch (err) {
    console.warn('Failed to initialize AudioContext for live capture:', err);
    return null;
  }

  const bufferLength = analyser.frequencyBinCount;
  const timeData = new Uint8Array(bufferLength);

  const startTime = Date.now();
  let hasSpoken = false;
  let consecutiveSpeechFrames = 0;
  let lastSpeechTimestamp = 0;
  let noiseFloor = 0.008;

  const checkTick = () => {
    if (isStopped || !analyser) return;

    analyser.getByteTimeDomainData(timeData);

    // Compute RMS amplitude
    let sumSq = 0;
    for (let i = 0; i < bufferLength; i++) {
      const norm = (timeData[i] - 128) / 128;
      sumSq += norm * norm;
    }
    const rms = Math.sqrt(sumSq / bufferLength);

    const elapsedTotal = Date.now() - startTime;

    // Adapt environmental noise floor during initial 250ms
    if (elapsedTotal < 250) {
      noiseFloor = Math.max(0.005, Math.min(0.04, (noiseFloor * 3 + rms) / 4));
    }

    // Dynamic speech threshold slightly above ambient noise floor
    const speechThreshold = Math.max(0.024, noiseFloor * 2.2 + 0.012);
    const isCurrentFrameSpeech = rms >= speechThreshold;

    if (isCurrentFrameSpeech) {
      consecutiveSpeechFrames++;
      // Require speech to be sustained for >= 2 ticks (~80ms) to avoid single-frame clicks/pops
      if (consecutiveSpeechFrames >= 2) {
        if (!hasSpoken) {
          hasSpoken = true;
          if (onSpeechDetected) {
            onSpeechDetected();
          }
        }
        lastSpeechTimestamp = Date.now();
      }
    } else {
      consecutiveSpeechFrames = 0;
    }

    // Silence duration calculation
    let currentSilenceMs = 0;
    if (hasSpoken) {
      currentSilenceMs = Date.now() - lastSpeechTimestamp;
    } else {
      currentSilenceMs = elapsedTotal;
    }

    if (onVolumeTick) {
      onVolumeTick(rms, isCurrentFrameSpeech, Number((currentSilenceMs / 1000).toFixed(1)));
    }

    // Check conditions:
    // 1. Trailing silence after speech was detected
    if (hasSpoken && currentSilenceMs >= config.postSpeechSilenceTimeoutMs) {
      triggerStop('trailing_silence');
      return;
    }

    // 2. Initial silence (user hasn't spoken at all)
    if (!hasSpoken && currentSilenceMs >= config.initialSilenceTimeoutMs) {
      triggerStop('initial_silence');
      return;
    }

    // 3. Absolute maximum recording limit
    if (elapsedTotal >= config.maxTotalDurationMs) {
      triggerStop('max_timeout');
      return;
    }
  };

  const processPcmResult = (): VoiceSegmentResult | null => {
    if (pcmChunks.length === 0) return null;
    let totalSamples = 0;
    for (const chunk of pcmChunks) {
      totalSamples += chunk.length;
    }
    if (totalSamples === 0) return null;

    const mergedPcm = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of pcmChunks) {
      mergedPcm.set(chunk, offset);
      offset += chunk.length;
    }

    const sampleRate = audioCtx?.sampleRate || 44100;
    const result = extractVoiceSegmentFromFloat32(mergedPcm, sampleRate, 50);
    if (onVoiceSegmentReady) {
      onVoiceSegmentReady(result);
    }
    return result;
  };

  const triggerStop = (reason: SilenceStopReason) => {
    if (isStopped) return;
    const result = cleanup();
    onSilenceTimeout(reason);
    return result;
  };

  const cleanup = (): VoiceSegmentResult | null => {
    if (isStopped) return null;
    isStopped = true;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    const result = processPcmResult();

    if (scriptProcessor) {
      try {
        scriptProcessor.disconnect();
      } catch (e) {}
      scriptProcessor = null;
    }
    if (dummyGain) {
      try {
        dummyGain.disconnect();
      } catch (e) {}
      dummyGain = null;
    }
    if (source) {
      try {
        source.disconnect();
      } catch (e) {}
      source = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }

    return result;
  };

  // Run silence detection every 40ms (~25fps check)
  intervalId = setInterval(checkTick, 40);

  return {
    stop: cleanup,
    getConfig: () => config,
  };
}

/**
 * Phonetic Syllable Diagnostic Interface
 * Represents an aligned syllable/word segment with acoustic divergence analysis.
 */
export interface SyllableDiagnostic {
  id: string;
  word: string;
  syllable: string;
  index: number;
  totalSyllables: number;
  isPrimaryStress: boolean;
  startSampleIdx: number;
  endSampleIdx: number;
  startPercent: number;
  endPercent: number;
  aiPeak: number;
  userPeak: number;
  avgDiff: number;
  accuracyScore: number;
  status: 'matched' | 'low_stress' | 'high_stress' | 'unclear';
  statusLabel: string;
  feedback: string;
}

/**
 * Generates a realistic, syllable-aligned 50-sample native reference waveform envelope
 * along with primary stress sample indices and estimated duration in seconds.
 */
export function generateReferenceWaveform(text: string): {
  samples: number[];
  stressPoints: number[];
  estimatedDurationSec: number;
} {
  const clean = (text || '').trim();
  if (!clean) {
    return { samples: Array(50).fill(0.2), stressPoints: [], estimatedDurationSec: 1.0 };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const totalSamples = 50;
  const samples: number[] = new Array(totalSamples).fill(0.14);
  const stressPoints: number[] = [];

  const allSyllables: { syllable: string; isStress: boolean; isWordEnd: boolean }[] = [];
  words.forEach((word) => {
    const syls = splitEnglishWordIntoSyllables(word);
    const sylCount = syls.length;
    syls.forEach((syl, sIdx) => {
      let isStress = false;
      if (sylCount === 1) {
        isStress = true;
      } else if (sylCount === 2) {
        isStress = sIdx === 0;
      } else {
        isStress = sIdx === 1 || (sIdx === 0 && syl.length > 3);
      }
      allSyllables.push({
        syllable: syl,
        isStress,
        isWordEnd: sIdx === sylCount - 1,
      });
    });
  });

  const totalSylCount = Math.max(1, allSyllables.length);
  const samplesPerSyl = totalSamples / totalSylCount;

  allSyllables.forEach((item, idx) => {
    const startIdx = Math.floor(idx * samplesPerSyl);
    const endIdx = Math.min(totalSamples - 1, Math.floor((idx + 1) * samplesPerSyl));
    const sylLen = Math.max(1, endIdx - startIdx + 1);
    const centerIdx = Math.min(totalSamples - 1, Math.floor(startIdx + sylLen * 0.45));

    if (item.isStress) {
      stressPoints.push(centerIdx);
    }

    for (let s = startIdx; s <= endIdx; s++) {
      const rel = sylLen > 1 ? (s - startIdx) / (sylLen - 1) : 0.5;
      const vowelBell = Math.sin(Math.max(0.08, Math.min(0.92, rel)) * Math.PI);
      const peakAmp = item.isStress ? 0.88 : 0.62;
      const baseFloor = item.isWordEnd && rel > 0.82 ? 0.18 : 0.26;
      const amp = baseFloor + vowelBell * (peakAmp - baseFloor);
      samples[s] = Math.max(0.14, Math.min(0.96, Number(amp.toFixed(3))));
    }
  });

  samples[0] = Math.min(samples[0], 0.24);
  samples[samples.length - 1] = Math.min(samples[samples.length - 1], 0.2);

  const wordCount = Math.max(1, words.length);
  const estimatedDurationSec = Math.max(0.8, Number((totalSylCount * 0.3 + wordCount * 0.12).toFixed(1)));

  return { samples, stressPoints, estimatedDurationSec };
}

/**
 * Splits an English word into natural phonetic syllable chunks.
 */
export function splitEnglishWordIntoSyllables(word: string): string[] {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return [word];
  if (clean.length <= 3) return [word];

  // Common suffix patterns
  const suffixRules: [RegExp, string][] = [
    [/tion$/, '-tion'],
    [/sion$/, '-sion'],
    [/ment$/, '-ment'],
    [/ness$/, '-ness'],
    [/able$/, '-a-ble'],
    [/ible$/, '-i-ble'],
    [/fully$/, '-ful-ly'],
    [/ful$/, '-ful'],
    [/less$/, '-less'],
    [/ing$/, '-ing'],
    [/ize$/, '-ize'],
    [/ous$/, '-ous'],
    [/ive$/, '-ive'],
  ];

  let formatted = clean;
  for (const [pattern, replacement] of suffixRules) {
    if (pattern.test(formatted) && formatted.length > 5) {
      formatted = formatted.replace(pattern, replacement);
      break;
    }
  }

  // Syllable regex vowel matching
  const chunks = formatted.split('-');
  const result: string[] = [];

  chunks.forEach((chunk) => {
    if (!chunk) return;
    // Regex to capture vowel nucleus + following consonants
    const matches = chunk.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+(?=$|[^aeiouy]))?/gi);
    if (matches && matches.length > 0) {
      // Reconstruct syllables
      let accumulated = '';
      matches.forEach((m, idx) => {
        if (idx === matches.length - 1) {
          const rest = chunk.slice(accumulated.length + m.length);
          result.push(m + rest);
        } else {
          result.push(m);
        }
        accumulated += m;
      });
    } else {
      result.push(chunk);
    }
  });

  return result.filter(Boolean).length > 0 ? result.filter(Boolean) : [word];
}

/**
 * Computes acoustic and stress discrepancy diagnostics for each syllable
 * by comparing AI reference samples against the user's recorded waveform.
 */
export function analyzeSyllablesAndDiscrepancies(
  targetText: string,
  aiSamples: number[],
  userSamples: number[],
  recognizedTranscript?: string
): SyllableDiagnostic[] {
  const clean = (targetText || '').trim();
  if (!clean) return [];

  const words = clean.split(/\s+/).filter(Boolean);
  const totalSamples = Math.max(50, aiSamples.length);
  const hasUserAudio = userSamples && userSamples.length > 0;

  const spokenCleanWords = (recognizedTranscript || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const rawSyllableItems: { word: string; syllable: string; isStress: boolean }[] = [];

  words.forEach((word) => {
    const rawSyls = splitEnglishWordIntoSyllables(word);
    const sylCount = rawSyls.length;

    rawSyls.forEach((syl, sIdx) => {
      // Primary stress heuristic: 1st syllable for 2-syllable nouns, 2nd for longer words
      let isStress = false;
      if (sylCount === 1) {
        isStress = true;
      } else if (sylCount === 2) {
        isStress = sIdx === 0;
      } else {
        isStress = sIdx === 1 || (sIdx === 0 && syl.length > 3);
      }

      rawSyllableItems.push({
        word,
        syllable: syl,
        isStress,
      });
    });
  });

  const totalSyllableCount = rawSyllableItems.length;
  if (totalSyllableCount === 0) return [];

  const samplesPerSyl = totalSamples / totalSyllableCount;

  return rawSyllableItems.map((item, idx) => {
    const startIdx = Math.floor(idx * samplesPerSyl);
    const endIdx = Math.min(totalSamples - 1, Math.floor((idx + 1) * samplesPerSyl));
    const sampleLen = Math.max(1, endIdx - startIdx + 1);

    let maxAi = 0.2;
    let maxUser = 0.1;
    let diffSum = 0;

    for (let s = startIdx; s <= endIdx; s++) {
      const aiVal = aiSamples[s] ?? 0.3;
      const uVal = hasUserAudio ? (userSamples[s] ?? 0.1) : 0;

      if (aiVal > maxAi) maxAi = aiVal;
      if (uVal > maxUser) maxUser = uVal;

      diffSum += Math.abs(aiVal - uVal);
    }

    const avgDiff = Number((diffSum / sampleLen).toFixed(2));
    const startPercent = Number(((startIdx / totalSamples) * 100).toFixed(1));
    const endPercent = Number((((endIdx + 1) / totalSamples) * 100).toFixed(1));

    let status: SyllableDiagnostic['status'] = 'matched';
    let statusLabel = '발음 일치';
    let feedback = '';
    let accuracyScore = 0;

    if (!hasUserAudio) {
      if (spokenCleanWords.length > 0) {
        const cleanTargetWord = item.word.toLowerCase().replace(/[^a-z0-9]/g, '');
        const wordMatched = spokenCleanWords.some(
          (sw) => sw === cleanTargetWord || sw.includes(cleanTargetWord) || cleanTargetWord.includes(sw)
        );
        status = wordMatched ? 'matched' : 'unclear';
        statusLabel = wordMatched ? (item.isStress ? '강세 음절 일치' : '발음 일치') : '발음 미흡/누락';
        feedback = wordMatched
          ? `‘${item.syllable}’ 음절이 정확하게 인식되었습니다.`
          : `‘${item.syllable}’ 음절이 명확히 인식되지 않았습니다. 또렷하게 다시 발음해 보세요.`;
        accuracyScore = wordMatched ? 88 : 42;
      } else {
        status = 'matched';
        statusLabel = item.isStress ? '제1강세 음절' : '일반 음절';
        feedback = item.isStress
          ? `‘${item.syllable}’ 음절에 강세(높은 진폭과 또렷한 모음)를 주어 발음하세요.`
          : `‘${item.syllable}’ 음절을 부드럽고 자연스럽게 발음하세요.`;
        accuracyScore = 0;
      }
    } else {
      const envelopeSimilarity = Math.max(0, 1 - avgDiff * 1.08) * 100;
      const peakRatio = maxAi > 0 ? Math.min(maxUser, maxAi) / Math.max(maxUser, maxAi) : 0.7;
      const peakSimilarity = peakRatio * 100;
      let rawScore = envelopeSimilarity * 0.58 + peakSimilarity * 0.42;

      // Discrepancy heuristic
      if (maxUser < 0.22) {
        status = 'unclear';
        statusLabel = '발음 미흡/소리 약함';
        feedback = `‘${item.syllable}’ 음절의 소리가 너무 작거나 누락되었습니다. 모음을 더 명확히 발음해 보세요.`;
        rawScore = Math.min(rawScore, 54);
      } else if (item.isStress && maxUser < maxAi * 0.72) {
        status = 'low_stress';
        statusLabel = '강세 부족';
        feedback = `‘${item.syllable}’ 음절은 주요 강세 위치입니다. 호흡과 성량을 20% 더 실어 또렷하게 강조해 보세요.`;
        rawScore = Math.min(rawScore, 78);
      } else if (!item.isStress && maxUser > maxAi * 1.35 && maxUser > 0.75) {
        status = 'high_stress';
        statusLabel = '과도한 강세';
        feedback = `‘${item.syllable}’ 음절에 과도한 힘이 들어갔습니다. 힘을 빼고 가볍게 연결해 보세요.`;
        rawScore = Math.min(rawScore, 79);
      } else {
        status = 'matched';
        statusLabel = item.isStress ? '강세 완벽 일치' : '자연스러운 억양';
        feedback = item.isStress
          ? `‘${item.syllable}’ 음절의 표준 강세 피크와 음향 높낮이가 원어민과 매우 가깝습니다!`
          : `‘${item.syllable}’ 음절의 발화 리듬이 자연스럽습니다.`;
        rawScore = Math.max(82, rawScore + 8);
      }

      if (spokenCleanWords.length > 0) {
        const cleanTargetWord = item.word.toLowerCase().replace(/[^a-z0-9]/g, '');
        const wordMatched = spokenCleanWords.some(
          (sw) => sw === cleanTargetWord || sw.includes(cleanTargetWord) || cleanTargetWord.includes(sw)
        );
        if (wordMatched) {
          rawScore += 5;
        } else {
          rawScore -= 12;
        }
      }

      accuracyScore = Math.round(Math.max(18, Math.min(100, rawScore)));
    }

    return {
      id: `syl-${idx}`,
      word: item.word,
      syllable: item.syllable,
      index: idx,
      totalSyllables: totalSyllableCount,
      isPrimaryStress: item.isStress,
      startSampleIdx: startIdx,
      endSampleIdx: endIdx,
      startPercent,
      endPercent,
      aiPeak: Number(maxAi.toFixed(2)),
      userPeak: Number(maxUser.toFixed(2)),
      avgDiff,
      accuracyScore,
      status,
      statusLabel,
      feedback,
    };
  });
}

