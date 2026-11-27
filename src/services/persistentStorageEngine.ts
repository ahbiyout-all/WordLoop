import { UserProfile, VocabItem, SentenceItem, Goal, DailyGoalHistory } from '../types';
import { APP_VERSION } from '../constants/version';
import { DEFAULT_VOCAB, DEFAULT_SENTENCES } from '../data/defaultVocab';
import {
  STORAGE_KEYS,
  CompactVocabStorageV2,
  CompactSentenceStorageV2,
  computePayloadChecksum,
  hydrateCompactVocab,
  hydrateCompactSentences,
  serializeCompactVocab,
  serializeCompactSentences,
  safeJsonParse,
  sanitizeDeepObject,
} from './deviceStorageService';
import {
  PetCompanionState,
  exportPetStateForBackup,
  restorePetStateFromBackup,
} from './petCompanionService';

export type MediaSlotId = 'mom_photo' | 'dad_photo';

export interface MediaBlobRecord {
  id: MediaSlotId;
  blob: Blob;
  mimeType: string;
  bytes: number;
  updatedAt: string;
}

export interface PrimaryStateRecord {
  key: 'primary_state_v3';
  schemaVersion: 3;
  appVersion: string;
  deviceId: string;
  updatedAt: string;
  checksum: string;
  userProfileMeta: UserProfile | null;
  compactVocab: CompactVocabStorageV2;
  compactSentences: CompactSentenceStorageV2;
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  petState?: PetCompanionState;
}

export interface InternalSnapshotRecord {
  dateKey: string; // YYYY-MM-DD
  createdAt: string;
  bytes: Uint8Array;
  compressed: boolean;
  rawBytes: number;
  compressedBytes: number;
}

export interface FolderSyncMetaRecord {
  key: 'folder_sync_meta';
  folderName: string | null;
  lastSyncedAt: string | null;
  lastDailyDate: string | null;
  lastChecksum: string | null;
  lastBytesWritten: number;
  snapshotCount: number;
}

export interface LocalSyncCapabilities {
  driver: 'electron' | 'browser_fs_access' | 'file_fallback';
  supportsFolderPicker: boolean;
  supportsGzipStream: boolean;
  supportsPersistApi: boolean;
}

export interface LocalSyncFolderStatus {
  driver: 'electron' | 'browser_fs_access' | 'file_fallback';
  isSupported: boolean;
  isConnected: boolean;
  permissionState: 'granted' | 'prompt' | 'denied' | 'unsupported' | 'unconnected';
  folderName: string | null;
  folderPath?: string | null;
  lastSyncedAt: string | null;
  lastBytesWritten: number;
  snapshotCount: number;
}

export interface MultiTierStorageStats {
  indexedDbAvailable: boolean;
  hasPrimaryState: boolean;
  primaryStateUpdatedAt: string | null;
  primaryStateBytes: number;
  mediaCount: number;
  mediaBytes: number;
  snapshotsCount: number;
  snapshotsBytes: number;
  latestSnapshotDate: string | null;
  browserEstimatedUsageBytes: number | null;
  browserEstimatedQuotaBytes: number | null;
  isPersistedGranted: boolean | null;
  folderStatus: LocalSyncFolderStatus;
}

export interface RestoredAppBundle {
  userProfile: UserProfile | null;
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  petState?: PetCompanionState;
}

export interface BootMigrationResult {
  action: 'none' | 'migrated_from_localstorage' | 'recovered_from_indexeddb' | 'recovered_from_folder';
  restoredState?: RestoredAppBundle;
  mediaUrls: {
    momPhotoUrl?: string;
    dadPhotoUrl?: string;
  };
  pendingFolderRecovery?: {
    folderName: string;
    requiresPermission: boolean;
  };
  persistedStorageGranted: boolean;
}

const DB_NAME = 'wordloop_state_db';
const DB_VERSION = 1;
const STORE_KV = 'kv';
const STORE_MEDIA = 'media';
const STORE_SNAPSHOTS = 'snapshots';
const STORE_HANDLES = 'handles';
const DEVICE_ID_LS_KEY = 'wordloop_device_id';
const MAX_RETAINED_SNAPSHOTS = 7;

const objectUrlCache = new Map<MediaSlotId, { signature: string; objectUrl: string }>();

interface ElectronFsBridge {
  isAvailable?: () => boolean;
  pickDirectory?: () => Promise<{ canceled: boolean; folderPath: string | null; folderName: string | null }>;
  getStatus?: () => Promise<{
    folderPath: string;
    folderName: string;
    latestModifiedAt: string | null;
    latestSizeBytes: number;
    snapshotCount: number;
    recentSnapshots: string[];
  }>;
  writeBackupBundle?: (payload: {
    latestBytes: number[];
    dailySnapshotName?: string;
    dailySnapshotBytes?: number[];
    mediaEntries?: Array<{ fileName: string; bytes: number[] }>;
  }) => Promise<{
    success: boolean;
    folderPath: string;
    folderName: string;
    bytesWritten: number;
    wroteDaily: boolean;
    syncedAt: string;
  }>;
  readLatestBundle?: () => Promise<{
    found: boolean;
    folderName: string;
    fileName?: string;
    modifiedAt?: string;
    bytes?: Uint8Array;
  }>;
}

function getElectronFsBridge(): ElectronFsBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = (window as any).WordLoopNative?.fsSync;
  if (bridge && typeof bridge.isAvailable === 'function' && bridge.isAvailable()) {
    return bridge as ElectronFsBridge;
  }
  return null;
}

export function getLocalSyncCapabilities(): LocalSyncCapabilities {
  const electronBridge = getElectronFsBridge();
  const hasBrowserPicker =
    typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
  const driver: LocalSyncCapabilities['driver'] = electronBridge
    ? 'electron'
    : hasBrowserPicker
    ? 'browser_fs_access'
    : 'file_fallback';

  return {
    driver,
    supportsFolderPicker: Boolean(electronBridge || hasBrowserPicker),
    supportsGzipStream:
      typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined',
    supportsPersistApi:
      typeof navigator !== 'undefined' && Boolean(navigator.storage && navigator.storage.persist),
  };
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_LS_KEY);
    if (existing && existing.length >= 6) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `wl-${crypto.randomUUID().slice(0, 12)}`
        : `wl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(DEVICE_ID_LS_KEY, generated);
    return generated;
  } catch {
    return `wl-${Date.now().toString(36)}`;
  }
}

function openStateDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'dateKey' });
        }
        if (!db.objectStoreNames.contains(STORE_HANDLES)) {
          db.createObjectStore(STORE_HANDLES, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbGet<T = any>(db: IDBDatabase, storeName: string, key: string): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbPut(db: IDBDatabase, storeName: string, value: any): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function idbDelete(db: IDBDatabase, storeName: string, key: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function idbGetAll<T = any>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? (req.result as T[]) : []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

function idbClearStore(db: IDBDatabase, storeName: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function readStreamBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

export function isGzipBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

export async function compressJsonToGzipBytes(
  data: unknown
): Promise<{ bytes: Uint8Array; compressed: boolean; rawBytes: number }> {
  const jsonText = JSON.stringify(data);
  const rawBytesArr = new TextEncoder().encode(jsonText);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(rawBytesArr).catch(() => {});
      writer.close().catch(() => {});
      const compressedBytes = await readStreamBytes(cs.readable);
      return {
        bytes: compressedBytes,
        compressed: true,
        rawBytes: rawBytesArr.byteLength,
      };
    } catch {
      // Fallback to uncompressed UTF-8
    }
  }

  return {
    bytes: rawBytesArr,
    compressed: false,
    rawBytes: rawBytesArr.byteLength,
  };
}

export async function decompressBytesToJson<T = any>(
  bytes: Uint8Array
): Promise<{ parsed: T; wasCompressed: boolean }> {
  if (isGzipBytes(bytes)) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('현재 브라우저가 Gzip 압축 해제를 지원하지 않습니다.');
    }
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    writer.write(copy).catch(() => {});
    writer.close().catch(() => {});
    const plainBytes = await readStreamBytes(ds.readable);
    const text = new TextDecoder().decode(plainBytes);
    return {
      parsed: safeJsonParse<T>(text),
      wasCompressed: true,
    };
  }

  const text = new TextDecoder().decode(bytes);
  return {
    parsed: safeJsonParse<T>(text),
    wasCompressed: false,
  };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return new Blob([dataUrl], { type: 'application/octet-stream' });
  }
  const header = dataUrl.slice(0, commaIdx);
  const body = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+)/i);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const isBase64 = /;base64/i.test(header);

  if (!isBase64) {
    let decoded = body;
    try {
      decoded = decodeURIComponent(body);
    } catch {
      // Recover cleanly from unescaped '%' (e.g. width="100%") or truncated percent sequences
      const trimmed = body.replace(/%[0-9A-Fa-f]?$/, '');
      try {
        decoded = decodeURIComponent(trimmed);
      } catch {
        decoded = trimmed.replace(/%(?:[0-9A-Fa-f]{2})+/g, (seq) => {
          try {
            return decodeURIComponent(seq);
          } catch {
            return seq;
          }
        });
      }
    }
    if (mimeType.includes('svg') && decoded.includes('<svg') && !decoded.includes('</svg>')) {
      const lastClose = decoded.lastIndexOf('>');
      decoded = (lastClose !== -1 ? decoded.slice(0, lastClose + 1) : decoded) + '</svg>';
    }
    return new Blob([decoded], { type: mimeType });
  }

  try {
    const cleanB64 = body.replace(/\s+/g, '');
    const padded = cleanB64 + '='.repeat((4 - (cleanB64.length % 4)) % 4);
    const binaryStr = atob(padded);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  } catch {
    return new Blob([], { type: mimeType });
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('이미지 인코딩 실패'));
      }
    };
    reader.onerror = () => reject(new Error('이미지 읽기 실패'));
    reader.readAsDataURL(blob);
  });
}

function getCachedOrCreateObjectUrl(slot: MediaSlotId, record: MediaBlobRecord): string {
  const sig = `${record.bytes}:${record.updatedAt}`;
  const cached = objectUrlCache.get(slot);
  if (cached && cached.signature === sig) {
    return cached.objectUrl;
  }
  if (cached) {
    try {
      URL.revokeObjectURL(cached.objectUrl);
    } catch {}
  }
  const nextUrl = URL.createObjectURL(record.blob);
  objectUrlCache.set(slot, { signature: sig, objectUrl: nextUrl });
  return nextUrl;
}

/**
 * Strip bulky data:/blob: strings from UserProfile before writing synchronous localStorage bootstrap copies.
 */
export function stripLargeMediaForBootstrap(profile: UserProfile | null): UserProfile | null {
  if (!profile) return null;
  const next: UserProfile = { ...profile };
  if (next.momPhotoUrl) {
    if (next.momPhotoUrl.startsWith('data:') || next.momPhotoUrl.startsWith('blob:')) {
      next.momPhotoRef = 'idb:mom_photo';
      delete next.momPhotoUrl;
    }
  }
  if (next.dadPhotoUrl) {
    if (next.dadPhotoUrl.startsWith('data:') || next.dadPhotoUrl.startsWith('blob:')) {
      next.dadPhotoRef = 'idb:dad_photo';
      delete next.dadPhotoUrl;
    }
  }
  return next;
}

export async function saveMediaAsset(
  slot: MediaSlotId,
  source: string | Blob
): Promise<{ objectUrl: string; bytes: number; mimeType: string } | null> {
  let blob: Blob;
  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      try {
        blob = dataUrlToBlob(source);
        if (blob.size === 0) return null;
      } catch {
        return null;
      }
    } else if (source.startsWith('blob:')) {
      const existingCached = objectUrlCache.get(slot);
      if (existingCached?.objectUrl === source) {
        return { objectUrl: source, bytes: 0, mimeType: 'image/jpeg' };
      }
      try {
        const res = await fetch(source);
        blob = await res.blob();
      } catch {
        return null;
      }
    } else {
      return null;
    }
  } else {
    blob = source;
  }

  const record: MediaBlobRecord = {
    id: slot,
    blob,
    mimeType: blob.type || 'image/jpeg',
    bytes: blob.size,
    updatedAt: new Date().toISOString(),
  };

  const db = await openStateDb();
  if (db) {
    await idbPut(db, STORE_MEDIA, record);
    db.close();
  }

  const objectUrl = getCachedOrCreateObjectUrl(slot, record);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
  }
  return { objectUrl, bytes: record.bytes, mimeType: record.mimeType };
}

export async function deleteMediaAsset(slot: MediaSlotId): Promise<void> {
  const cached = objectUrlCache.get(slot);
  if (cached) {
    try {
      URL.revokeObjectURL(cached.objectUrl);
    } catch {}
    objectUrlCache.delete(slot);
  }
  const db = await openStateDb();
  if (db) {
    await idbDelete(db, STORE_MEDIA, slot);
    db.close();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wordloop_storage_updated'));
  }
}

export async function loadHydratedMediaUrls(): Promise<{ momPhotoUrl?: string; dadPhotoUrl?: string }> {
  const db = await openStateDb();
  if (!db) return {};
  try {
    const [momRec, dadRec] = await Promise.all([
      idbGet<MediaBlobRecord>(db, STORE_MEDIA, 'mom_photo'),
      idbGet<MediaBlobRecord>(db, STORE_MEDIA, 'dad_photo'),
    ]);
    return {
      momPhotoUrl: momRec?.blob ? getCachedOrCreateObjectUrl('mom_photo', momRec) : undefined,
      dadPhotoUrl: dadRec?.blob ? getCachedOrCreateObjectUrl('dad_photo', dadRec) : undefined,
    };
  } finally {
    db.close();
  }
}

export async function exportMediaDataUrls(fallbackProfile?: UserProfile | null): Promise<{
  momPhotoDataUrl?: string;
  dadPhotoDataUrl?: string;
}> {
  const result: { momPhotoDataUrl?: string; dadPhotoDataUrl?: string } = {};
  const db = await openStateDb();
  if (db) {
    try {
      const [momRec, dadRec] = await Promise.all([
        idbGet<MediaBlobRecord>(db, STORE_MEDIA, 'mom_photo'),
        idbGet<MediaBlobRecord>(db, STORE_MEDIA, 'dad_photo'),
      ]);
      if (momRec?.blob) result.momPhotoDataUrl = await blobToDataUrl(momRec.blob);
      if (dadRec?.blob) result.dadPhotoDataUrl = await blobToDataUrl(dadRec.blob);
    } finally {
      db.close();
    }
  }

  if (!result.momPhotoDataUrl && fallbackProfile?.momPhotoUrl?.startsWith('data:')) {
    result.momPhotoDataUrl = fallbackProfile.momPhotoUrl;
  }
  if (!result.dadPhotoDataUrl && fallbackProfile?.dadPhotoUrl?.startsWith('data:')) {
    result.dadPhotoDataUrl = fallbackProfile.dadPhotoUrl;
  }

  return result;
}

export async function requestBrowserPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch {}
  return false;
}

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function saveAppStateToIndexedDb(params: {
  userProfile: UserProfile | null;
  vocabList: VocabItem[];
  sentenceList: SentenceItem[];
  goals: Goal[];
  history: DailyGoalHistory[];
  totalRepeatsCount: number;
  forceSnapshot?: boolean;
}): Promise<{ savedAt: string; compressedBytes: number; snapshotCount: number } | null> {
  const db = await openStateDb();
  if (!db) return null;

  try {
    const compactVocab = serializeCompactVocab(params.vocabList || [], DEFAULT_VOCAB);
    const compactSentences = serializeCompactSentences(params.sentenceList || [], DEFAULT_SENTENCES);
    const strippedProfile = stripLargeMediaForBootstrap(params.userProfile);
    const savedAt = new Date().toISOString();

    const petStateSnapshot = typeof window !== 'undefined' ? exportPetStateForBackup() : undefined;

    const corePayload = {
      userProfileMeta: strippedProfile,
      compactVocab,
      compactSentences,
      goals: params.goals || [],
      history: params.history || [],
      totalRepeatsCount: params.totalRepeatsCount || 0,
      petState: petStateSnapshot,
    };
    const checksum = computePayloadChecksum(corePayload);

    const record: PrimaryStateRecord = {
      key: 'primary_state_v3',
      schemaVersion: 3,
      appVersion: APP_VERSION,
      deviceId: getOrCreateDeviceId(),
      updatedAt: savedAt,
      checksum,
      ...corePayload,
    };

    await idbPut(db, STORE_KV, record);

    // Save compressed daily snapshot in IDB (once per day or if forced), keeping latest 7
    const todayKey = getTodayDateKey();
    const existingSnap = await idbGet<InternalSnapshotRecord>(db, STORE_SNAPSHOTS, todayKey);
    let compressedBytes = existingSnap?.compressedBytes || 0;

    if (!existingSnap || params.forceSnapshot) {
      const mediaDataUrls = await exportMediaDataUrls(params.userProfile);
      const snapshotPayload = {
        app: 'WordLoop',
        schemaVersion: 3,
        appVersion: APP_VERSION,
        deviceId: record.deviceId,
        exportedAt: savedAt,
        checksum,
        payload: {
          userProfile: strippedProfile,
          compactVocab,
          compactSentences,
          goals: params.goals || [],
          history: params.history || [],
          totalRepeatsCount: params.totalRepeatsCount || 0,
          petState: petStateSnapshot,
          mediaDataUrls,
        },
      };
      const compressed = await compressJsonToGzipBytes(snapshotPayload);
      compressedBytes = compressed.bytes.byteLength;
      const snapRecord: InternalSnapshotRecord = {
        dateKey: todayKey,
        createdAt: savedAt,
        bytes: compressed.bytes,
        compressed: compressed.compressed,
        rawBytes: compressed.rawBytes,
        compressedBytes,
      };
      await idbPut(db, STORE_SNAPSHOTS, snapRecord);

      // Rotate older snapshots (> 7)
      const allSnaps = (await idbGetAll<InternalSnapshotRecord>(db, STORE_SNAPSHOTS)).sort((a, b) =>
        a.dateKey.localeCompare(b.dateKey)
      );
      while (allSnaps.length > MAX_RETAINED_SNAPSHOTS) {
        const oldest = allSnaps.shift();
        if (oldest) {
          await idbDelete(db, STORE_SNAPSHOTS, oldest.dateKey);
        }
      }
    }

    const totalSnaps = (await idbGetAll<InternalSnapshotRecord>(db, STORE_SNAPSHOTS)).length;
    return {
      savedAt,
      compressedBytes,
      snapshotCount: totalSnaps,
    };
  } finally {
    db.close();
  }
}

export async function loadAppStateFromIndexedDb(): Promise<RestoredAppBundle | null> {
  const db = await openStateDb();
  if (!db) return null;

  try {
    const primary = await idbGet<PrimaryStateRecord>(db, STORE_KV, 'primary_state_v3');
    if (primary && primary.compactVocab) {
      const mediaUrls = await loadHydratedMediaUrls();
      const hydratedVocab = hydrateCompactVocab(JSON.stringify(primary.compactVocab), DEFAULT_VOCAB);
      const hydratedSentences = primary.compactSentences
        ? hydrateCompactSentences(JSON.stringify(primary.compactSentences), DEFAULT_SENTENCES)
        : DEFAULT_SENTENCES;

      const userProfile: UserProfile | null = primary.userProfileMeta
        ? {
            ...sanitizeDeepObject(primary.userProfileMeta),
            momPhotoUrl: mediaUrls.momPhotoUrl || primary.userProfileMeta.momPhotoUrl,
            dadPhotoUrl: mediaUrls.dadPhotoUrl || primary.userProfileMeta.dadPhotoUrl,
          }
        : null;

      if (primary.petState) {
        restorePetStateFromBackup(primary.petState);
      }

      return {
        userProfile,
        vocabList: hydratedVocab,
        sentenceList: hydratedSentences,
        goals: Array.isArray(primary.goals) ? sanitizeDeepObject(primary.goals) : [],
        history: Array.isArray(primary.history) ? sanitizeDeepObject(primary.history) : [],
        totalRepeatsCount: Number(primary.totalRepeatsCount) || 0,
        petState: primary.petState,
      };
    }

    // Fallback: recover from latest internal compressed snapshot if primary_state_v3 was absent
    const snaps = (await idbGetAll<InternalSnapshotRecord>(db, STORE_SNAPSHOTS)).sort((a, b) =>
      b.dateKey.localeCompare(a.dateKey)
    );
    if (snaps.length > 0 && snaps[0].bytes) {
      const { parsed } = await decompressBytesToJson<any>(snaps[0].bytes);
      const p = parsed?.payload;
      if (p) {
        if (p.mediaDataUrls?.momPhotoDataUrl) {
          await saveMediaAsset('mom_photo', p.mediaDataUrls.momPhotoDataUrl);
        }
        if (p.mediaDataUrls?.dadPhotoDataUrl) {
          await saveMediaAsset('dad_photo', p.mediaDataUrls.dadPhotoDataUrl);
        }
        if (p.petState) {
          restorePetStateFromBackup(p.petState);
        }
        const mediaUrls = await loadHydratedMediaUrls();
        return {
          userProfile: p.userProfile
            ? {
                ...sanitizeDeepObject(p.userProfile),
                momPhotoUrl: mediaUrls.momPhotoUrl,
                dadPhotoUrl: mediaUrls.dadPhotoUrl,
              }
            : null,
          vocabList: p.compactVocab
            ? hydrateCompactVocab(JSON.stringify(p.compactVocab), DEFAULT_VOCAB)
            : DEFAULT_VOCAB,
          sentenceList: p.compactSentences
            ? hydrateCompactSentences(JSON.stringify(p.compactSentences), DEFAULT_SENTENCES)
            : DEFAULT_SENTENCES,
          goals: Array.isArray(p.goals) ? sanitizeDeepObject(p.goals) : [],
          history: Array.isArray(p.history) ? sanitizeDeepObject(p.history) : [],
          totalRepeatsCount: Number(p.totalRepeatsCount) || 0,
          petState: p.petState,
        };
      }
    }

    return null;
  } catch (err) {
    console.warn('IndexedDB restore note:', err);
    return null;
  } finally {
    db.close();
  }
}

export async function clearIndexedDbAppState(): Promise<void> {
  for (const [slot, entry] of objectUrlCache.entries()) {
    try {
      URL.revokeObjectURL(entry.objectUrl);
    } catch {}
    objectUrlCache.delete(slot);
  }
  const db = await openStateDb();
  if (!db) return;
  try {
    await Promise.all([
      idbClearStore(db, STORE_KV),
      idbClearStore(db, STORE_MEDIA),
      idbClearStore(db, STORE_SNAPSHOTS),
    ]);
  } finally {
    db.close();
  }
}

interface StoredDirHandleRecord {
  id: 'sync_dir';
  handle: FileSystemDirectoryHandle;
  folderName: string;
  connectedAt: string;
}

async function getStoredDirHandle(): Promise<StoredDirHandleRecord | null> {
  const db = await openStateDb();
  if (!db) return null;
  try {
    return await idbGet<StoredDirHandleRecord>(db, STORE_HANDLES, 'sync_dir');
  } finally {
    db.close();
  }
}

async function queryHandlePermission(
  handle: any,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<'granted' | 'prompt' | 'denied'> {
  try {
    if (typeof handle?.queryPermission === 'function') {
      return await handle.queryPermission({ mode });
    }
    return 'granted';
  } catch {
    return 'denied';
  }
}

export async function getLocalSyncStatus(): Promise<LocalSyncFolderStatus> {
  const caps = getLocalSyncCapabilities();
  const electron = getElectronFsBridge();

  if (electron && electron.getStatus) {
    try {
      const info = await electron.getStatus();
      return {
        driver: 'electron',
        isSupported: true,
        isConnected: true,
        permissionState: 'granted',
        folderName: info.folderName,
        folderPath: info.folderPath,
        lastSyncedAt: info.latestModifiedAt,
        lastBytesWritten: info.latestSizeBytes || 0,
        snapshotCount: info.snapshotCount || 0,
      };
    } catch {}
  }

  const db = await openStateDb();
  let meta: FolderSyncMetaRecord | null = null;
  let handleRec: StoredDirHandleRecord | null = null;
  if (db) {
    try {
      meta = await idbGet<FolderSyncMetaRecord>(db, STORE_KV, 'folder_sync_meta');
      handleRec = await idbGet<StoredDirHandleRecord>(db, STORE_HANDLES, 'sync_dir');
    } finally {
      db.close();
    }
  }

  if (!caps.supportsFolderPicker) {
    return {
      driver: 'file_fallback',
      isSupported: false,
      isConnected: false,
      permissionState: 'unsupported',
      folderName: null,
      lastSyncedAt: meta?.lastSyncedAt || null,
      lastBytesWritten: meta?.lastBytesWritten || 0,
      snapshotCount: meta?.snapshotCount || 0,
    };
  }

  if (!handleRec?.handle) {
    return {
      driver: 'browser_fs_access',
      isSupported: true,
      isConnected: false,
      permissionState: 'unconnected',
      folderName: null,
      lastSyncedAt: meta?.lastSyncedAt || null,
      lastBytesWritten: meta?.lastBytesWritten || 0,
      snapshotCount: meta?.snapshotCount || 0,
    };
  }

  const perm = await queryHandlePermission(handleRec.handle, 'readwrite');
  return {
    driver: 'browser_fs_access',
    isSupported: true,
    isConnected: true,
    permissionState: perm,
    folderName: handleRec.folderName || handleRec.handle.name,
    lastSyncedAt: meta?.lastSyncedAt || null,
    lastBytesWritten: meta?.lastBytesWritten || 0,
    snapshotCount: meta?.snapshotCount || 0,
  };
}

export async function connectLocalSyncFolder(): Promise<LocalSyncFolderStatus> {
  const electron = getElectronFsBridge();
  if (electron && electron.pickDirectory) {
    const res = await electron.pickDirectory();
    if (res.canceled) {
      return await getLocalSyncStatus();
    }
    return await getLocalSyncStatus();
  }

  if (typeof window === 'undefined' || typeof (window as any).showDirectoryPicker !== 'function') {
    throw new Error('현재 브라우저는 로컬 폴더 직접 연결을 지원하지 않습니다. 아래 압축 스냅샷 파일(.json.gz) 저장 기능을 이용해 주세요.');
  }

  const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({
    id: 'wordloop-sync-folder',
    mode: 'readwrite',
    startIn: 'documents',
  });

  const db = await openStateDb();
  if (db) {
    try {
      await idbPut(db, STORE_HANDLES, {
        id: 'sync_dir',
        handle,
        folderName: handle.name,
        connectedAt: new Date().toISOString(),
      } as StoredDirHandleRecord);
    } finally {
      db.close();
    }
  }

  return await getLocalSyncStatus();
}

export async function authorizeLocalSyncFolder(): Promise<LocalSyncFolderStatus> {
  const electron = getElectronFsBridge();
  if (electron) return await getLocalSyncStatus();

  const rec = await getStoredDirHandle();
  if (!rec?.handle) {
    return await connectLocalSyncFolder();
  }

  if (typeof (rec.handle as any).requestPermission === 'function') {
    await (rec.handle as any).requestPermission({ mode: 'readwrite' });
  }
  return await getLocalSyncStatus();
}

export async function disconnectLocalSyncFolder(): Promise<void> {
  const db = await openStateDb();
  if (!db) return;
  try {
    await Promise.all([
      idbDelete(db, STORE_HANDLES, 'sync_dir'),
      idbDelete(db, STORE_KV, 'folder_sync_meta'),
    ]);
  } finally {
    db.close();
  }
}

async function writeFileToDirHandle(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  bytes: Uint8Array
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  const safeCopy = new Uint8Array(bytes.byteLength);
  safeCopy.set(bytes);
  await writable.write(safeCopy);
  await writable.close();
}

function extensionFromMime(mimeType: string): string {
  const lower = (mimeType || '').toLowerCase();
  if (lower.includes('png')) return 'png';
  if (lower.includes('webp')) return 'webp';
  return 'jpg';
}

export async function syncBundleToLocalFolder(
  data: RestoredAppBundle,
  options?: { forceDailySnapshot?: boolean; ignoreDirtyCheck?: boolean }
): Promise<{
  syncedAt: string;
  folderName: string;
  bytesWritten: number;
  snapshotCount: number;
  skippedUnchanged?: boolean;
}> {
  const mediaDataUrls = await exportMediaDataUrls(data.userProfile);
  const compactVocab = serializeCompactVocab(data.vocabList || [], DEFAULT_VOCAB);
  const compactSentences = serializeCompactSentences(data.sentenceList || [], DEFAULT_SENTENCES);
  const strippedProfile = stripLargeMediaForBootstrap(data.userProfile);

  const payload = {
    userProfile: strippedProfile,
    compactVocab,
    compactSentences,
    goals: data.goals || [],
    history: data.history || [],
    totalRepeatsCount: data.totalRepeatsCount || 0,
    petState: data.petState || (typeof window !== 'undefined' ? exportPetStateForBackup() : undefined),
    mediaDataUrls,
  };
  const checksum = computePayloadChecksum(payload);

  const db = await openStateDb();
  let prevMeta: FolderSyncMetaRecord | null = null;
  if (db) {
    prevMeta = await idbGet<FolderSyncMetaRecord>(db, STORE_KV, 'folder_sync_meta');
  }

  const todayKey = getTodayDateKey();
  const dailyFileName = `wordloop-${todayKey}.json.gz`;

  if (
    !options?.ignoreDirtyCheck &&
    !options?.forceDailySnapshot &&
    prevMeta &&
    prevMeta.lastChecksum === checksum &&
    prevMeta.lastDailyDate === todayKey
  ) {
    if (db) db.close();
    return {
      syncedAt: prevMeta.lastSyncedAt || new Date().toISOString(),
      folderName: prevMeta.folderName || 'WordLoop',
      bytesWritten: prevMeta.lastBytesWritten,
      snapshotCount: prevMeta.snapshotCount,
      skippedUnchanged: true,
    };
  }

  const manifest = {
    app: 'WordLoop' as const,
    schemaVersion: 3 as const,
    appVersion: APP_VERSION,
    deviceId: getOrCreateDeviceId(),
    exportedAt: new Date().toISOString(),
    checksum,
    statsSummary: {
      vocabCount: data.vocabList.length,
      masteredCount: data.vocabList.filter((v) => (v.masteryLevel ?? (v.isLearned ? 2 : 0)) === 2).length,
      sentenceCount: data.sentenceList.length,
      goalsCount: data.goals.length,
      historyDays: data.history.length,
      totalRepeatsCount: data.totalRepeatsCount,
    },
    payload,
  };

  const compressed = await compressJsonToGzipBytes(manifest);

  // Prepare separated media files for readable media/ subfolder
  const mediaEntries: Array<{ fileName: string; bytes: Uint8Array }> = [];
  if (mediaDataUrls.momPhotoDataUrl) {
    const blob = dataUrlToBlob(mediaDataUrls.momPhotoDataUrl);
    mediaEntries.push({
      fileName: `mom_photo.${extensionFromMime(blob.type)}`,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    });
  }
  if (mediaDataUrls.dadPhotoDataUrl) {
    const blob = dataUrlToBlob(mediaDataUrls.dadPhotoDataUrl);
    mediaEntries.push({
      fileName: `dad_photo.${extensionFromMime(blob.type)}`,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    });
  }

  const needsDaily = Boolean(options?.forceDailySnapshot || prevMeta?.lastDailyDate !== todayKey);

  try {
    const electron = getElectronFsBridge();
    if (electron && electron.writeBackupBundle) {
      const res = await electron.writeBackupBundle({
        latestBytes: Array.from(compressed.bytes),
        dailySnapshotName: needsDaily ? dailyFileName : undefined,
        dailySnapshotBytes: needsDaily ? Array.from(compressed.bytes) : undefined,
        mediaEntries: mediaEntries.map((m) => ({ fileName: m.fileName, bytes: Array.from(m.bytes) })),
      });
      const status = electron.getStatus ? await electron.getStatus() : null;
      const snapshotCount = status?.snapshotCount || Math.max(1, prevMeta?.snapshotCount || 1);
      if (db) {
        await idbPut(db, STORE_KV, {
          key: 'folder_sync_meta',
          folderName: res.folderName,
          lastSyncedAt: res.syncedAt,
          lastDailyDate: todayKey,
          lastChecksum: checksum,
          lastBytesWritten: res.bytesWritten,
          snapshotCount,
        } as FolderSyncMetaRecord);
      }
      return {
        syncedAt: res.syncedAt,
        folderName: res.folderName,
        bytesWritten: res.bytesWritten,
        snapshotCount,
      };
    }

    const handleRec = db ? await idbGet<StoredDirHandleRecord>(db, STORE_HANDLES, 'sync_dir') : null;
    if (!handleRec?.handle) {
      throw new Error('연결된 로컬 백업 폴더가 없습니다.');
    }

    const perm = await queryHandlePermission(handleRec.handle, 'readwrite');
    if (perm !== 'granted') {
      throw new Error('폴더 쓰기 권한 확인이 필요합니다. [폴더 권한 다시 허용] 버튼을 눌러주세요.');
    }

    await writeFileToDirHandle(handleRec.handle, 'wordloop-sync-latest.json.gz', compressed.bytes);

    // Daily rotated snapshots folder
    const snapshotsDir = await handleRec.handle.getDirectoryHandle('snapshots', { create: true });
    if (needsDaily) {
      await writeFileToDirHandle(snapshotsDir, dailyFileName, compressed.bytes);
      const names: string[] = [];
      for await (const [name, entry] of (snapshotsDir as any).entries()) {
        if (entry.kind === 'file' && /^wordloop-\d{4}-\d{2}-\d{2}\.json(\.gz)?$/.test(name)) {
          names.push(name);
        }
      }
      names.sort();
      while (names.length > MAX_RETAINED_SNAPSHOTS) {
        const oldest = names.shift();
        if (oldest) {
          await snapshotsDir.removeEntry(oldest).catch(() => {});
        }
      }
    }

    let snapshotCount = 0;
    for await (const [name, entry] of (snapshotsDir as any).entries()) {
      if (entry.kind === 'file' && /^wordloop-\d{4}-\d{2}-\d{2}\.json(\.gz)?$/.test(name)) {
        snapshotCount++;
      }
    }

    if (mediaEntries.length > 0) {
      const mediaDir = await handleRec.handle.getDirectoryHandle('media', { create: true });
      for (const m of mediaEntries) {
        await writeFileToDirHandle(mediaDir, m.fileName, m.bytes);
      }
    }

    const syncedAt = new Date().toISOString();
    const folderName = handleRec.folderName || handleRec.handle.name;
    if (db) {
      await idbPut(db, STORE_KV, {
        key: 'folder_sync_meta',
        folderName,
        lastSyncedAt: syncedAt,
        lastDailyDate: todayKey,
        lastChecksum: checksum,
        lastBytesWritten: compressed.bytes.byteLength,
        snapshotCount: Math.max(1, snapshotCount),
      } as FolderSyncMetaRecord);
    }

    return {
      syncedAt,
      folderName,
      bytesWritten: compressed.bytes.byteLength,
      snapshotCount: Math.max(1, snapshotCount),
    };
  } finally {
    if (db) db.close();
  }
}

export async function readLatestBundleFromLocalFolder(): Promise<{
  bytes: Uint8Array;
  fileName: string;
  folderName: string;
  modifiedAt: string | null;
} | null> {
  const electron = getElectronFsBridge();
  if (electron && electron.readLatestBundle) {
    const res = await electron.readLatestBundle();
    if (!res?.found || !res.bytes) return null;
    return {
      bytes: new Uint8Array(res.bytes),
      fileName: res.fileName || 'wordloop-sync-latest.json.gz',
      folderName: res.folderName,
      modifiedAt: res.modifiedAt || null,
    };
  }

  const rec = await getStoredDirHandle();
  if (!rec?.handle) return null;
  const perm = await queryHandlePermission(rec.handle, 'read');
  if (perm !== 'granted') {
    throw new Error('폴더 읽기 권한 확인이 필요합니다. [폴더 권한 다시 허용]을 눌러주세요.');
  }

  try {
    const fileHandle = await rec.handle.getFileHandle('wordloop-sync-latest.json.gz');
    const file = await fileHandle.getFile();
    return {
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName: file.name,
      folderName: rec.folderName || rec.handle.name,
      modifiedAt: file.lastModified ? new Date(file.lastModified).toISOString() : null,
    };
  } catch {
    return null;
  }
}

export async function getMultiTierStorageStats(): Promise<MultiTierStorageStats> {
  const folderStatus = await getLocalSyncStatus();
  let browserEstimatedUsageBytes: number | null = null;
  let browserEstimatedQuotaBytes: number | null = null;
  let isPersistedGranted: boolean | null = null;

  try {
    if (typeof navigator !== 'undefined' && navigator.storage) {
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        if (typeof est.usage === 'number') browserEstimatedUsageBytes = est.usage;
        if (typeof est.quota === 'number') browserEstimatedQuotaBytes = est.quota;
      }
      if (navigator.storage.persisted) {
        isPersistedGranted = await navigator.storage.persisted();
      }
    }
  } catch {}

  const db = await openStateDb();
  if (!db) {
    return {
      indexedDbAvailable: false,
      hasPrimaryState: false,
      primaryStateUpdatedAt: null,
      primaryStateBytes: 0,
      mediaCount: 0,
      mediaBytes: 0,
      snapshotsCount: 0,
      snapshotsBytes: 0,
      latestSnapshotDate: null,
      browserEstimatedUsageBytes,
      browserEstimatedQuotaBytes,
      isPersistedGranted,
      folderStatus,
    };
  }

  try {
    const [primary, mediaList, snapsList] = await Promise.all([
      idbGet<PrimaryStateRecord>(db, STORE_KV, 'primary_state_v3'),
      idbGetAll<MediaBlobRecord>(db, STORE_MEDIA),
      idbGetAll<InternalSnapshotRecord>(db, STORE_SNAPSHOTS),
    ]);

    const primaryStateBytes = primary ? new TextEncoder().encode(JSON.stringify(primary)).byteLength : 0;
    const mediaBytes = mediaList.reduce((acc, m) => acc + (m.bytes || m.blob?.size || 0), 0);
    const snapshotsBytes = snapsList.reduce((acc, s) => acc + (s.compressedBytes || s.bytes?.byteLength || 0), 0);
    const sortedSnaps = [...snapsList].sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    return {
      indexedDbAvailable: true,
      hasPrimaryState: Boolean(primary),
      primaryStateUpdatedAt: primary?.updatedAt || null,
      primaryStateBytes,
      mediaCount: mediaList.length,
      mediaBytes,
      snapshotsCount: snapsList.length,
      snapshotsBytes,
      latestSnapshotDate: sortedSnaps[0]?.dateKey || null,
      browserEstimatedUsageBytes,
      browserEstimatedQuotaBytes,
      isPersistedGranted,
      folderStatus,
    };
  } finally {
    db.close();
  }
}

/**
 * Automatic lossless boot migration & recovery:
 * 1. Requests persistent browser storage grant.
 * 2. Separates any legacy base64 momPhotoUrl/dadPhotoUrl in localStorage into IndexedDB Blob store.
 * 3. Recovers cleanly from IndexedDB (or connected folder) if localStorage was wiped.
 * 4. Migrates current localStorage state into IndexedDB primary_state_v3 + daily compressed snapshot.
 */
export async function migrateAndHydrateOnBoot(
  currentLsState: RestoredAppBundle
): Promise<BootMigrationResult> {
  const persistedStorageGranted = await requestBrowserPersistentStorage();
  const hasLsProfile = Boolean(localStorage.getItem(STORAGE_KEYS.USER_PROFILE));
  const hasLsVocab = Boolean(localStorage.getItem(STORAGE_KEYS.VOCAB));

  // Extract any legacy inline base64 photos from current userProfile into IDB media blobs
  let extractedAnyPhoto = false;
  if (currentLsState.userProfile) {
    if (currentLsState.userProfile.momPhotoUrl?.startsWith('data:')) {
      await saveMediaAsset('mom_photo', currentLsState.userProfile.momPhotoUrl);
      extractedAnyPhoto = true;
    }
    if (currentLsState.userProfile.dadPhotoUrl?.startsWith('data:')) {
      await saveMediaAsset('dad_photo', currentLsState.userProfile.dadPhotoUrl);
      extractedAnyPhoto = true;
    }
  }

  let mediaUrls = await loadHydratedMediaUrls();

  // Check if localStorage was wiped while IndexedDB still has saved state
  if (!hasLsProfile && !hasLsVocab) {
    const recoveredFromIdb = await loadAppStateFromIndexedDb();
    if (
      recoveredFromIdb &&
      (recoveredFromIdb.userProfile ||
        recoveredFromIdb.history.length > 0 ||
        recoveredFromIdb.totalRepeatsCount > 0)
    ) {
      mediaUrls = await loadHydratedMediaUrls();
      return {
        action: 'recovered_from_indexeddb',
        restoredState: recoveredFromIdb,
        mediaUrls,
        persistedStorageGranted,
      };
    }

    // Check if Electron or already-authorized folder handle has a backup bundle
    const folderStatus = await getLocalSyncStatus();
    if (folderStatus.isConnected) {
      if (folderStatus.permissionState === 'prompt') {
        return {
          action: 'none',
          mediaUrls,
          pendingFolderRecovery: {
            folderName: folderStatus.folderName || 'WordLoop 백업 폴더',
            requiresPermission: true,
          },
          persistedStorageGranted,
        };
      }
      if (folderStatus.permissionState === 'granted') {
        try {
          const bundle = await readLatestBundleFromLocalFolder();
          if (bundle) {
            const { parsed } = await decompressBytesToJson<any>(bundle.bytes);
            const p = parsed?.payload || parsed;
            if (p) {
              if (p.mediaDataUrls?.momPhotoDataUrl) {
                await saveMediaAsset('mom_photo', p.mediaDataUrls.momPhotoDataUrl);
              }
              if (p.mediaDataUrls?.dadPhotoDataUrl) {
                await saveMediaAsset('dad_photo', p.mediaDataUrls.dadPhotoDataUrl);
              }
              if (p.petState) {
                restorePetStateFromBackup(p.petState);
              }
              mediaUrls = await loadHydratedMediaUrls();
              const restoredFromFolder: RestoredAppBundle = {
                userProfile: p.userProfile
                  ? {
                      ...sanitizeDeepObject(p.userProfile),
                      momPhotoUrl: mediaUrls.momPhotoUrl,
                      dadPhotoUrl: mediaUrls.dadPhotoUrl,
                    }
                  : null,
                vocabList: p.compactVocab
                  ? hydrateCompactVocab(JSON.stringify(p.compactVocab), DEFAULT_VOCAB)
                  : Array.isArray(p.vocabList)
                  ? sanitizeDeepObject(p.vocabList)
                  : DEFAULT_VOCAB,
                sentenceList: p.compactSentences
                  ? hydrateCompactSentences(JSON.stringify(p.compactSentences), DEFAULT_SENTENCES)
                  : Array.isArray(p.sentenceList)
                  ? sanitizeDeepObject(p.sentenceList)
                  : DEFAULT_SENTENCES,
                goals: Array.isArray(p.goals) ? sanitizeDeepObject(p.goals) : [],
                history: Array.isArray(p.history) ? sanitizeDeepObject(p.history) : [],
                totalRepeatsCount: Number(p.totalRepeatsCount) || 0,
                petState: p.petState,
              };
              await saveAppStateToIndexedDb(restoredFromFolder);
              return {
                action: 'recovered_from_folder',
                restoredState: restoredFromFolder,
                mediaUrls,
                persistedStorageGranted,
              };
            }
          }
        } catch (err) {
          console.warn('Auto folder recovery failed gracefully:', err);
        }
      }
    }
  }

  // Normal migration path: ensure IDB primary_state_v3 is populated and bloat in localStorage is reclaimed
  const db = await openStateDb();
  const hadPrimaryBefore = db ? Boolean(await idbGet(db, STORE_KV, 'primary_state_v3')) : false;
  if (db) db.close();

  if (hasLsProfile || hasLsVocab || !hadPrimaryBefore) {
    await saveAppStateToIndexedDb({
      userProfile: currentLsState.userProfile,
      vocabList: currentLsState.vocabList,
      sentenceList: currentLsState.sentenceList,
      goals: currentLsState.goals,
      history: currentLsState.history,
      totalRepeatsCount: currentLsState.totalRepeatsCount,
    });

    // Shrink bloated base64 profile & duplicate backup key in localStorage now that IDB holds them
    if (extractedAnyPhoto && currentLsState.userProfile) {
      try {
        const lightProfile = stripLargeMediaForBootstrap(currentLsState.userProfile);
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(lightProfile));
        localStorage.removeItem(STORAGE_KEYS.USER_PROFILE_BACKUP);
      } catch {}
    }
  }

  // Check if a folder handle exists but awaits permission on browser reload
  const folderStatus = await getLocalSyncStatus();
  const pendingFolderRecovery =
    folderStatus.isConnected && folderStatus.permissionState === 'prompt'
      ? { folderName: folderStatus.folderName || 'WordLoop 백업 폴더', requiresPermission: true }
      : undefined;

  return {
    action: !hadPrimaryBefore || extractedAnyPhoto ? 'migrated_from_localstorage' : 'none',
    mediaUrls,
    pendingFolderRecovery,
    persistedStorageGranted,
  };
}
