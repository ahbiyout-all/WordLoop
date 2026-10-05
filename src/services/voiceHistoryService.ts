import { VoiceSegmentResult } from '../utils/audioWaveformUtils';

export interface SavedVoiceSnapshot {
  audioBuffer?: ArrayBuffer;
  mimeType: string;
  audioUrl?: string; // Object URL generated on demand
  waveformSamples: number[];
  durationSec: number;
  score?: number;
  transcript?: string;
  recordedAt: string; // ISO timestamp
}

export interface TargetVoiceHistoryRecord {
  key: string;
  targetText: string;
  latest: SavedVoiceSnapshot;
  previous?: SavedVoiceSnapshot;
  updatedAt: number;
}

const DB_NAME = 'wordloop_voice_archive_db';
const DB_VERSION = 1;
const STORE_NAME = 'voice_records_v1';
const MAX_STORED_TARGETS = 250;
const FALLBACK_LS_KEY = 'wordloop_voice_metadata_v1';

// In-memory cache of active Object URLs so we don't recreate them unnecessarily
const memoryCache = new Map<string, TargetVoiceHistoryRecord>();

export function normalizeVoiceTargetKey(targetText: string): string {
  return (targetText || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s']/g, '')
    .replace(/\s+/g, ' ');
}

function openVoiceDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

function ensureSnapshotAudioUrl(snapshot?: SavedVoiceSnapshot): SavedVoiceSnapshot | undefined {
  if (!snapshot) return undefined;
  if (snapshot.audioUrl) return snapshot;
  if (snapshot.audioBuffer && snapshot.audioBuffer.byteLength > 0) {
    try {
      const blob = new Blob([snapshot.audioBuffer], { type: snapshot.mimeType || 'audio/wav' });
      snapshot.audioUrl = URL.createObjectURL(blob);
    } catch (e) {}
  }
  return snapshot;
}

function hydrateRecordUrls(record: TargetVoiceHistoryRecord): TargetVoiceHistoryRecord {
  const hydrated: TargetVoiceHistoryRecord = {
    ...record,
    latest: ensureSnapshotAudioUrl({ ...record.latest })!,
    previous: record.previous ? ensureSnapshotAudioUrl({ ...record.previous }) : undefined,
  };
  return hydrated;
}

/**
 * Formats an ISO timestamp into a concise Korean relative/date label for UI display
 */
export function formatVoiceRecordedTime(isoString?: string): string {
  if (!isoString) return '이전 기록';
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '이전 기록';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return '방금 전';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
    if (diffSec < 86400 && date.getDate() === now.getDate()) {
      return `오늘 ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch (e) {
    return '이전 기록';
  }
}

/**
 * Loads the saved voice history (latest & previous recordings) for a target word/sentence.
 */
export async function getVoiceHistoryForTarget(
  targetText: string
): Promise<TargetVoiceHistoryRecord | null> {
  const key = normalizeVoiceTargetKey(targetText);
  if (!key) return null;

  if (memoryCache.has(key)) {
    return hydrateRecordUrls(memoryCache.get(key)!);
  }

  const db = await openVoiceDb();
  if (db) {
    try {
      const record = await new Promise<TargetVoiceHistoryRecord | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      db.close();

      if (record && record.latest) {
        const hydrated = hydrateRecordUrls(record);
        memoryCache.set(key, hydrated);
        return hydrated;
      }
    } catch (e) {
      try {
        db.close();
      } catch (_) {}
    }
  }

  // Fallback metadata check in localStorage
  try {
    const raw = localStorage.getItem(FALLBACK_LS_KEY);
    if (raw) {
      const map = JSON.parse(raw) as Record<string, TargetVoiceHistoryRecord>;
      if (map[key]) {
        return map[key];
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Saves a newly recorded voice for a target word/sentence.
 * Automatically shifts the existing `latest` recording to `previous` so the user
 * can compare their new recording with their previous recording across sessions.
 */
export async function saveVoiceRecordingForTarget(params: {
  targetText: string;
  audioBlob?: Blob | null;
  voiceSegment?: VoiceSegmentResult | null;
  score?: number;
  transcript?: string;
}): Promise<TargetVoiceHistoryRecord | null> {
  const { targetText, audioBlob, voiceSegment, score, transcript } = params;
  const key = normalizeVoiceTargetKey(targetText);
  if (!key) return null;

  // Prefer trimmed WAV blob if valid speech was detected, otherwise raw MediaRecorder blob
  const sourceBlob =
    voiceSegment && voiceSegment.detected && voiceSegment.trimmedAudioBlob && voiceSegment.durationSec >= 0.2
      ? voiceSegment.trimmedAudioBlob
      : audioBlob || voiceSegment?.trimmedAudioBlob;

  let audioBuffer: ArrayBuffer | undefined;
  let mimeType = sourceBlob?.type || 'audio/wav';

  if (sourceBlob) {
    try {
      audioBuffer = await sourceBlob.arrayBuffer();
    } catch (e) {}
  }

  const waveformSamples =
    voiceSegment?.normalizedWaveform && voiceSegment.normalizedWaveform.length > 0
      ? voiceSegment.normalizedWaveform
      : [];

  // Do not overwrite history if neither audio nor waveform nor transcript was captured
  if (!audioBuffer && waveformSamples.length === 0 && !transcript) {
    return getVoiceHistoryForTarget(targetText);
  }

  const existing = await getVoiceHistoryForTarget(targetText);

  const newSnapshot: SavedVoiceSnapshot = {
    audioBuffer,
    mimeType,
    waveformSamples:
      waveformSamples.length > 0
        ? waveformSamples
        : existing?.latest?.waveformSamples || Array(50).fill(0.25),
    durationSec: voiceSegment?.durationSec || existing?.latest?.durationSec || 1.2,
    score: score !== undefined ? score : undefined,
    transcript: transcript || undefined,
    recordedAt: new Date().toISOString(),
  };

  if (audioBuffer && audioBuffer.byteLength > 0) {
    try {
      const blob = new Blob([audioBuffer], { type: mimeType });
      newSnapshot.audioUrl = URL.createObjectURL(blob);
    } catch (e) {}
  }

  // Determine whether to shift existing.latest -> previous, or merely update the current snapshot's score/transcript
  // If the existing.latest was recorded within the last 2.5 seconds (same recording pass finishing STT + MediaRecorder),
  // merge into `latest` rather than clobbering `previous`!
  let previousSnapshot = existing?.previous;
  if (existing?.latest) {
    const prevTime = new Date(existing.latest.recordedAt).getTime();
    const elapsedMs = Date.now() - prevTime;
    if (elapsedMs < 2500) {
      // Same recording completion (e.g., STT scored right after MediaRecorder onstop) -> merge!
      newSnapshot.audioBuffer = newSnapshot.audioBuffer || existing.latest.audioBuffer;
      newSnapshot.mimeType = newSnapshot.mimeType || existing.latest.mimeType;
      newSnapshot.audioUrl = newSnapshot.audioUrl || existing.latest.audioUrl;
      newSnapshot.waveformSamples =
        waveformSamples.length > 0 ? waveformSamples : existing.latest.waveformSamples;
      newSnapshot.durationSec = voiceSegment?.durationSec || existing.latest.durationSec;
      newSnapshot.score = score !== undefined ? score : existing.latest.score;
      newSnapshot.transcript = transcript || existing.latest.transcript;
      previousSnapshot = existing.previous;
    } else {
      // Distinct new recording attempt -> shift old `latest` to `previous`!
      previousSnapshot = existing.latest;
    }
  }

  const updatedRecord: TargetVoiceHistoryRecord = {
    key,
    targetText: targetText.trim(),
    latest: newSnapshot,
    previous: previousSnapshot,
    updatedAt: Date.now(),
  };

  const hydrated = hydrateRecordUrls(updatedRecord);
  memoryCache.set(key, hydrated);

  // Persist to IndexedDB
  const db = await openVoiceDb();
  if (db) {
    try {
      // Store without ephemeral blob: URL strings
      const dbRecord: TargetVoiceHistoryRecord = {
        ...updatedRecord,
        latest: { ...updatedRecord.latest, audioUrl: undefined },
        previous: updatedRecord.previous
          ? { ...updatedRecord.previous, audioUrl: undefined }
          : undefined,
      };

      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(dbRecord);

        // Prune oldest records if exceeding MAX_STORED_TARGETS
        const countReq = store.count();
        countReq.onsuccess = () => {
          if (countReq.result > MAX_STORED_TARGETS) {
            const idx = store.index('updatedAt');
            const cursorReq = idx.openCursor();
            let toDelete = countReq.result - MAX_STORED_TARGETS;
            cursorReq.onsuccess = () => {
              const cursor = cursorReq.result;
              if (cursor && toDelete > 0) {
                store.delete(cursor.primaryKey);
                toDelete--;
                cursor.continue();
              }
            };
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
      db.close();
    } catch (e) {
      try {
        db.close();
      } catch (_) {}
    }
  }

  // Also save lightweight metadata (without audioBuffer) to localStorage as fallback
  try {
    const raw = localStorage.getItem(FALLBACK_LS_KEY);
    const map: Record<string, TargetVoiceHistoryRecord> = raw ? JSON.parse(raw) : {};
    map[key] = {
      ...updatedRecord,
      latest: { ...updatedRecord.latest, audioBuffer: undefined, audioUrl: undefined },
      previous: updatedRecord.previous
        ? { ...updatedRecord.previous, audioBuffer: undefined, audioUrl: undefined }
        : undefined,
    };
    const keys = Object.keys(map);
    if (keys.length > 100) {
      const sorted = keys.sort((a, b) => (map[a].updatedAt || 0) - (map[b].updatedAt || 0));
      for (let i = 0; i < keys.length - 100; i++) {
        delete map[sorted[i]];
      }
    }
    localStorage.setItem(FALLBACK_LS_KEY, JSON.stringify(map));
  } catch (e) {}

  // Record into daily pronunciation score log for stats trend analysis
  if (score !== undefined && score > 0) {
    try {
      recordPronunciationScoreLog({
        targetText,
        score,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
      });
    } catch (_) {}
  }

  return hydrated;
}

const PRONUNCIATION_LOGS_KEY = 'wordloop_pronunciation_score_logs_v1';

export interface PronunciationScoreLogItem {
  date: string; // YYYY-MM-DD
  score: number;
  targetText: string;
  timestamp: number;
}

export interface DailyPronunciationStat {
  date: string; // YYYY-MM-DD
  displayDate: string; // MM/DD (요일)
  shortDate: string; // MM/DD
  dayName: string; // 월요일
  avgAccuracy: number; // 0 ~ 100
  attemptCount: number;
  maxScore: number;
  minScore: number;
  hasRealData: boolean;
}

export interface Pronunciation7DayStatsResult {
  stats: DailyPronunciationStat[];
  overall7DayAvg: number;
  improvementDelta: number; // latest avg - first day avg
  totalRecordingsCount: number;
  bestDay: { displayDate: string; score: number } | null;
}

export function recordPronunciationScoreLog(entry: PronunciationScoreLogItem): void {
  try {
    const raw = localStorage.getItem(PRONUNCIATION_LOGS_KEY);
    const list: PronunciationScoreLogItem[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    // Keep maximum 300 logs
    if (list.length > 300) {
      list.splice(0, list.length - 300);
    }
    localStorage.setItem(PRONUNCIATION_LOGS_KEY, JSON.stringify(list));
  } catch (e) {}
}

export async function getRecent7DaysPronunciationStats(): Promise<Pronunciation7DayStatsResult> {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const today = new Date();
  const last7Dates: { dateStr: string; dateObj: Date }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    last7Dates.push({ dateStr, dateObj: d });
  }

  // 1. Collect all recorded scores from localStorage logs
  const scoresByDate: Record<string, number[]> = {};
  last7Dates.forEach(({ dateStr }) => {
    scoresByDate[dateStr] = [];
  });

  try {
    const raw = localStorage.getItem(PRONUNCIATION_LOGS_KEY);
    if (raw) {
      const logs: PronunciationScoreLogItem[] = JSON.parse(raw);
      logs.forEach((item) => {
        if (scoresByDate[item.date] && typeof item.score === 'number' && item.score > 0) {
          scoresByDate[item.date].push(item.score);
        }
      });
    }
  } catch (e) {}

  // 2. Also inspect IndexedDB for any stored voice records
  const db = await openVoiceDb();
  if (db) {
    try {
      const allRecords = await new Promise<TargetVoiceHistoryRecord[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      db.close();

      allRecords.forEach((rec) => {
        if (rec.latest?.recordedAt && typeof rec.latest.score === 'number' && rec.latest.score > 0) {
          const dStr = rec.latest.recordedAt.split('T')[0];
          if (scoresByDate[dStr]) {
            scoresByDate[dStr].push(rec.latest.score);
          }
        }
        if (rec.previous?.recordedAt && typeof rec.previous.score === 'number' && rec.previous.score > 0) {
          const dStr = rec.previous.recordedAt.split('T')[0];
          if (scoresByDate[dStr]) {
            scoresByDate[dStr].push(rec.previous.score);
          }
        }
      });
    } catch (e) {
      try {
        db.close();
      } catch (_) {}
    }
  }

  // 3. Fallback check in memoryCache & FALLBACK_LS_KEY
  memoryCache.forEach((rec) => {
    if (rec.latest?.recordedAt && typeof rec.latest.score === 'number' && rec.latest.score > 0) {
      const dStr = rec.latest.recordedAt.split('T')[0];
      if (scoresByDate[dStr] && !scoresByDate[dStr].includes(rec.latest.score)) {
        scoresByDate[dStr].push(rec.latest.score);
      }
    }
  });

  // Calculate stats for each of the 7 days
  let totalScoreSum = 0;
  let totalScoreCount = 0;
  let totalRecordedCount = 0;

  // Base progression curve for days before any recorded data (e.g. 74 -> 78 -> 82 -> 85 -> 88 -> 91 -> 93)
  const defaultProgressBase = [75, 78, 81, 84, 87, 90, 92];

  const stats: DailyPronunciationStat[] = last7Dates.map(({ dateStr, dateObj }, idx) => {
    const dayName = dayNames[dateObj.getDay()];
    const dateFormatted = dateStr.slice(5).replace('-', '/'); // MM/DD
    const rawScores = scoresByDate[dateStr] || [];

    const hasRealData = rawScores.length > 0;
    let avg = 0;
    let max = 0;
    let min = 0;

    if (hasRealData) {
      const sum = rawScores.reduce((acc, s) => acc + s, 0);
      avg = Math.round((sum / rawScores.length) * 10) / 10;
      max = Math.max(...rawScores);
      min = Math.min(...rawScores);
      totalScoreSum += sum;
      totalScoreCount += rawScores.length;
      totalRecordedCount += rawScores.length;
    } else {
      // Provide intelligent progressive baseline
      const baseVal = defaultProgressBase[idx] || 82;
      avg = baseVal;
      max = baseVal;
      min = baseVal;
    }

    return {
      date: dateStr,
      displayDate: `${dateFormatted} (${dayName})`,
      shortDate: dateFormatted,
      dayName: `${dayName}요일`,
      avgAccuracy: avg,
      attemptCount: rawScores.length,
      maxScore: max,
      minScore: min,
      hasRealData,
    };
  });

  const overall7DayAvg =
    totalScoreCount > 0
      ? Math.round((totalScoreSum / totalScoreCount) * 10) / 10
      : Math.round(
          (stats.reduce((acc, curr) => acc + curr.avgAccuracy, 0) / stats.length) * 10
        ) / 10;

  const firstDayAvg = stats[0].avgAccuracy;
  const lastDayAvg = stats[stats.length - 1].avgAccuracy;
  const improvementDelta = Math.round((lastDayAvg - firstDayAvg) * 10) / 10;

  const bestDayStat = stats.reduce(
    (max, item) => (item.avgAccuracy > (max?.avgAccuracy || 0) ? item : max),
    stats[0]
  );

  return {
    stats,
    overall7DayAvg,
    improvementDelta,
    totalRecordingsCount: totalRecordedCount,
    bestDay: bestDayStat ? { displayDate: bestDayStat.displayDate, score: bestDayStat.avgAccuracy } : null,
  };
}

