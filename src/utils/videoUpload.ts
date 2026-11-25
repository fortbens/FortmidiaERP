import { API_BASE_URL, getApiAuthToken } from '../services/api';

const IDB_DB_NAME = 'fortmidia_local_media_v1';
const IDB_STORE_NAME = 'videos';
const IDB_PREFIX = 'idb://video/';
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|ogg)$/i;

const resolvedObjectUrlCache = new Map<string, string>();

export interface UploadedVideoResult {
  videoUrl: string;
  posterDataUrl?: string;
  fileName: string;
  sizeMb: number;
  storage: 'server' | 'local';
}

function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste navegador.'));
      return;
    }
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Falha ao abrir banco local de vídeos.'));
  });
}

export async function saveLocalVideoBlob(blob: Blob): Promise<string> {
  const id = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const db = await openVideoDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Falha ao salvar vídeo localmente.'));
  });
  const uri = `${IDB_PREFIX}${id}`;
  // Pre-warm object URL cache so immediate preview plays with zero delay
  try {
    const objUrl = URL.createObjectURL(blob);
    resolvedObjectUrlCache.set(uri, objUrl);
  } catch {
    // Ignore object URL errors
  }
  return uri;
}

export async function getLocalVideoBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openVideoDb();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const req = tx.objectStore(IDB_STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export function isLocalVideoUri(rawUrl?: string | null): boolean {
  return Boolean(rawUrl && rawUrl.trim().startsWith(IDB_PREFIX));
}

export async function resolveVideoUrl(rawUrl?: string | null): Promise<string | null> {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith(IDB_PREFIX)) return trimmed;

  const cached = resolvedObjectUrlCache.get(trimmed);
  if (cached) return cached;

  const id = trimmed.slice(IDB_PREFIX.length);
  const blob = await getLocalVideoBlob(id);
  if (!blob) return null;

  const objUrl = URL.createObjectURL(blob);
  resolvedObjectUrlCache.set(trimmed, objUrl);
  return objUrl;
}

function getSafeVideoExtension(file: File): string {
  const nameMatch = file.name.match(/\.([a-z0-9]+)$/i);
  const ext = nameMatch ? nameMatch[1].toLowerCase() : '';
  if (['mp4', 'webm', 'mov', 'm4v', 'ogv', 'ogg'].includes(ext)) {
    return ext === 'ogv' ? 'ogg' : ext;
  }
  if (file.type.includes('webm')) return 'webm';
  if (file.type.includes('quicktime')) return 'mov';
  if (file.type.includes('ogg')) return 'ogg';
  return 'mp4';
}

function isLikelyVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith('video/')) return true;
  return VIDEO_EXT_RE.test(file.name);
}

/**
 * Extracts a lightweight JPEG/WebP cover frame from a local video file (<= 48 KB)
 * so video news cards automatically receive a clean poster thumbnail.
 */
export function captureVideoPosterDataUrl(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    let objUrl: string | null = null;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const finish = (result?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (objUrl) URL.revokeObjectURL(objUrl);
      resolve(result);
    };

    const timer = window.setTimeout(() => finish(undefined), 3500);

    video.onerror = () => finish(undefined);
    video.onloadeddata = () => {
      try {
        const seekTime =
          Number.isFinite(video.duration) && video.duration > 0.6
            ? Math.min(0.8, video.duration * 0.15)
            : 0;
        if (seekTime > 0 && video.currentTime < seekTime) {
          video.currentTime = seekTime;
        } else {
          drawFrame();
        }
      } catch {
        drawFrame();
      }
    };
    video.onseeked = () => drawFrame();

    const drawFrame = () => {
      try {
        const vw = video.videoWidth || 0;
        const vh = video.videoHeight || 0;
        if (vw <= 0 || vh <= 0) {
          finish(undefined);
          return;
        }
        const scale = Math.min(1, 960 / Math.max(vw, vh));
        const w = Math.max(1, Math.round(vw * scale));
        const h = Math.max(1, Math.round(vh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(undefined);
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        for (const q of [0.76, 0.64, 0.52]) {
          const dataUrl = canvas.toDataURL('image/jpeg', q);
          if (dataUrl.startsWith('data:image/') && dataUrl.length <= 54000) {
            finish(dataUrl);
            return;
          }
        }
        finish(canvas.toDataURL('image/jpeg', 0.45));
      } catch {
        finish(undefined);
      }
    };

    try {
      objUrl = URL.createObjectURL(file);
      video.src = objUrl;
    } catch {
      finish(undefined);
    }
  });
}

async function tryUploadVideoToServer(file: File): Promise<string | null> {
  const ext = getSafeVideoExtension(file);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 90000);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': file.type || 'video/mp4',
    'X-Requested-With': 'XMLHttpRequest',
  };
  const token = getApiAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/media/upload?ext=${encodeURIComponent(ext)}`,
      {
        method: 'POST',
        headers,
        credentials: 'include',
        body: file,
        signal: controller.signal,
      }
    );
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string } | null;
    if (data?.ok && typeof data.url === 'string' && data.url.trim()) {
      return data.url.trim();
    }
    return null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Uploads a video file to `/api/media/upload` when supported by the server,
 * or persists it safely in IndexedDB (`idb://video/...`) as a short URI so
 * saving the article to MySQL / localStorage never fails due to payload limits.
 */
export async function uploadVideoFile(file: File): Promise<UploadedVideoResult> {
  if (!isLikelyVideoFile(file)) {
    throw new Error('Selecione um arquivo de vídeo válido (MP4, WebM ou MOV).');
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      'O vídeo ultrapassa 100 MB. Comprima o arquivo ou cole um link do YouTube, Vimeo ou MP4.'
    );
  }

  const sizeMb = Math.max(0.1, Math.round((file.size / (1024 * 1024)) * 10) / 10);

  const [posterDataUrl, serverUrl] = await Promise.all([
    captureVideoPosterDataUrl(file),
    tryUploadVideoToServer(file),
  ]);

  if (serverUrl) {
    return {
      videoUrl: serverUrl,
      posterDataUrl,
      fileName: file.name,
      sizeMb,
      storage: 'server',
    };
  }

  const localUri = await saveLocalVideoBlob(file);
  return {
    videoUrl: localUri,
    posterDataUrl,
    fileName: file.name,
    sizeMb,
    storage: 'local',
  };
}
