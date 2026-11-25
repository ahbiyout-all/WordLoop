import { PronunciationCorrectionReport } from '../types';
import { getAiEngineMode, getAuthHeaders, getUserGeminiKey } from './apiClient';
import { generateFreeAiPhonemeReport } from './freeAiService';

const MAX_AUDIO_BYTES = 2_200_000; // ~2.2MB binary -> ~2.9MB base64 (under 3MB server route limit)

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error('오디오 인코딩 변환에 실패했습니다.'));
        return;
      }
      resolve(dataUrl.slice(commaIdx + 1));
    };
    reader.onerror = () => reject(new Error('녹음 파일을 읽는 중 오류가 발생했습니다.'));
    reader.readAsDataURL(blob);
  });
}

export interface RequestAiPronunciationReportParams {
  targetText: string;
  recognizedText: string;
  audioBlob?: Blob | null;
  localReport?: PronunciationCorrectionReport | null;
  signal?: AbortSignal;
}

export interface AiPronunciationReportResponse {
  report: PronunciationCorrectionReport;
}

export class AiPronunciationAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiPronunciationAuthError';
  }
}

export async function requestAiPronunciationReport({
  targetText,
  recognizedText,
  audioBlob,
  localReport,
  signal,
}: RequestAiPronunciationReportParams): Promise<PronunciationCorrectionReport> {
  const engineMode = getAiEngineMode();
  const hasGeminiKey = Boolean(getUserGeminiKey().trim());

  // When no Gemini key is registered and user is on a browser-capable free AI mode,
  // try browser-direct keyless AI first (uses learner's own IP, works even without backend).
  if (
    !hasGeminiKey &&
    engineMode !== 'gemini_byok' &&
    engineMode !== 'mlvoca' &&
    engineMode !== 'kilo_free'
  ) {
    try {
      return await generateFreeAiPhonemeReport({
        targetText,
        recognizedText,
        localReport,
        signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) throw err;
      // Fall through to server proxy (/api/ai/pronunciation-report handles MLVoca + server free AI)
    }
  }

  let audioBase64: string | undefined;
  let audioMimeType: string | undefined;

  if (audioBlob && audioBlob.size > 0 && audioBlob.size <= MAX_AUDIO_BYTES) {
    audioBase64 = await blobToBase64(audioBlob);
    audioMimeType = (audioBlob.type || 'audio/webm').split(';')[0].trim().toLowerCase();
  }

  const localHints = localReport
    ? localReport.phonemeItems
        .slice(0, 14)
        .map(
          (p) =>
            `${p.word}[${p.grapheme}] ${p.expectedIpa}->${p.spokenIpa} (${p.errorType}, score:${p.accuracyScore})`
        )
        .join('; ')
    : '';

  const res = await fetch('/api/ai/pronunciation-report', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      targetText,
      recognizedText,
      localHints,
      audioBase64,
      audioMimeType,
    }),
  });

  const ct = res.headers.get('content-type') || '';
  let data: any = null;
  if (ct.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const errMsg =
      data?.error ||
      (!data
        ? '정적 웹(GitHub Pages) 환경에서는 백엔드 음소 분석 API가 없어 로컬 음소 리포트 또는 브라우저 무료 AI로 동작합니다.'
        : `AI 음소 리포트 요청에 실패했습니다 (HTTP ${res.status}).`);
    if (res.status === 401) {
      throw new AiPronunciationAuthError(errMsg);
    }
    throw new Error(errMsg);
  }

  if (!data?.report) {
    throw new Error('서버에서 유효한 음소 분석 리포트를 반환하지 않았습니다.');
  }

  return data.report as PronunciationCorrectionReport;
}
