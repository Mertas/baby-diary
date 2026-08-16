// Хранение фото/видео галереи: файлы на диске (id.jpg / id.mp4), метаданные — в state (photos/avatar).
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHOTO_DIR = resolve(__dirname, '../../data/photos');

export function chatPhotoDir(chatId: string): string {
  return join(PHOTO_DIR, chatId);
}
function safeId(id: string): boolean {
  return /^[a-z0-9-]{6,64}$/i.test(id);
}

export function mediaPath(chatId: string, id: string, ext: 'jpg' | 'mp4' | 'th.jpg'): string {
  return join(PHOTO_DIR, chatId, id + '.' + ext);
}

/** Сохранить загруженное фото (base64 JPEG, обработано на клиенте). */
export function savePhoto(chatId: string, id: string, base64Data: string): void {
  if (!safeId(chatId) || !safeId(id)) throw new Error('bad id');
  const buf = Buffer.from(base64Data, 'base64');
  if (!buf.length || buf.length > 8 * 1024 * 1024) throw new Error('photo too large');
  const dir = chatPhotoDir(chatId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(mediaPath(chatId, id, 'jpg'), buf);
}

/** Превью (thumb): фото — ресайз до 320px, видео — кадр на 0.5с. `<id>.th.jpg` рядом с оригиналом. */
function makeThumb(src: string, out: string, video: boolean): Promise<void> {
  const args = video
    ? ['-y', '-ss', '0.5', '-i', src, '-vframes', '1', '-vf', 'scale=320:320:force_original_aspect_ratio=decrease', '-q:v', '7', out]
    : ['-y', '-i', src, '-vf', 'scale=320:320:force_original_aspect_ratio=decrease', '-q:v', '7', out];
  return run('ffmpeg', args);
}

/** Читать медиа (фото .jpg или видео .mp4) или его превью (<id>.th.jpg). */
export function readMedia(chatId: string, id: string, thumb = false): { buf: Buffer; mime: string } | null {
  if (!safeId(chatId) || !safeId(id)) return null;
  if (thumb) {
    try {
      const p = join(chatPhotoDir(chatId), id + '.th.jpg');
      if (existsSync(p)) return { buf: readFileSync(p), mime: 'image/jpeg' };
    } catch { /* нет файла */ }
    // Fallback для медиа, загруженных ДО появления превью: отдать оригинал-фото
    try {
      const p = mediaPath(chatId, id, 'jpg');
      if (existsSync(p)) return { buf: readFileSync(p), mime: 'image/jpeg' };
    } catch { /* нет файла */ }
    return null;
  }
  for (const [ext, mime] of [['jpg', 'image/jpeg'], ['mp4', 'video/mp4']] as const) {
    const p = mediaPath(chatId, id, ext);
    if (existsSync(p)) { try { return { buf: readFileSync(p), mime }; } catch { return null; } }
  }
  return null;
}

export function deletePhotoFile(chatId: string, id: string): void {
  if (!safeId(chatId) || !safeId(id)) return;
  for (const ext of ['jpg', 'mp4', 'th.jpg'] as const) {
    const p = mediaPath(chatId, id, ext);
    if (existsSync(p)) { try { unlinkSync(p); } catch { /* ок */ } }
  }
}

/** Удалить файлы медиа, которых больше нет в state (чистка после merge с _delete-маркерами). */
export function prunePhotos(chatId: string, keptIds: Set<string>): void {
  const dir = chatPhotoDir(chatId);
  if (!existsSync(dir)) return;
  for (const f of readdirSafe(dir)) {
    if (!/\.(jpg|mp4)$/i.test(f)) continue;
    const id = f.replace(/\.th\.jpg$/i, '').replace(/\.(jpg|mp4)$/i, '');
    if (!keptIds.has(id)) deletePhotoFile(chatId, id);
  }
}

export interface MediaQueueItem { id: string; fileName: string; kind: 'photo' | 'video'; status: 'queued' | 'processing' | 'done' | 'error'; pct: number; }

/** Очередь обработки медиа по чатам (в памяти; восстанавливается из .tmp-файлов при старте). */
const mediaQueue = new Map<string, MediaQueueItem[]>();
export function queueFor(chatId: string): MediaQueueItem[] {
  if (!mediaQueue.has(chatId)) mediaQueue.set(chatId, []);
  return mediaQueue.get(chatId)!;
}
/** Очистить завершённые элементы очереди (когда клиент увидел done). */
export function trimQueue(chatId: string): void {
  const q = queueFor(chatId);
  if (q.length > 0 && q.every((i) => i.status === 'done' || i.status === 'error')) mediaQueue.delete(chatId);
}

/** При старте сервера восстановить очередь из незавершённых .tmp-файлов; вернуть chatId'ы. */
export function restoreMediaQueue(): string[] {
  const chats: string[] = [];
  for (const chatDir of readdirSafe(PHOTO_DIR)) {
    const dir = join(PHOTO_DIR, chatDir);
    if (!existsSync(dir)) continue;
    for (const f of readdirSafe(dir)) {
      if (!f.endsWith('.meta.json')) continue;
      // '.tmp-' + id + '.meta.json' → id
      const id = f.replace(/^\.tmp-/, '').replace(/\.meta\.json$/, '');
      if (!existsSync(join(dir, '.tmp-' + id + '.bin'))) continue;
      try {
        const meta = JSON.parse(readFileSync(join(dir, f), 'utf8'));
        queueFor(chatDir).push({
          id,
          fileName: typeof meta.fileName === 'string' ? meta.fileName : 'video.mp4',
          kind: meta.kind === 'video' ? 'video' : 'photo',
          status: 'queued',
          pct: 0,
        });
        if (!chats.includes(chatDir)) chats.push(chatDir);
      } catch { /* битый meta — пропустить */ }
    }
  }
  return chats;
}

function readdirSafe(dir: string): string[] {
  try { return readdirSync(dir); } catch { return []; }
}

// ---------- Видео: ffmpeg-конвертация MOV→MP4 + ffprobe-метаданные ----------

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d: Buffer) => { err += String(d); });
    p.on('error', (e) => reject(e));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(cmd + ' exit ' + code + ': ' + err.slice(-300)))));
  });
}

/** ffmpeg с прогрессом: '-progress pipe:1 -nostats' → out_time_us против известной длительности.
 *  Процент в диапазоне [5..95]; вызывающий сам шлёт 100 по завершении. */
function runFfmpegProgress(args: string[], durationSec: number | null, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', ...args, '-progress', 'pipe:1', '-nostats'], { windowsHide: true });
    let err = '';
    let out = '';
    p.stdout.on('data', (d: Buffer) => {
      out += String(d);
      if (!durationSec) return;
      let lastUs = -1;
      const re = /out_time_us=(-?\d+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(out)) !== null) lastUs = parseInt(m[1], 10);
      if (lastUs >= 0) onProgress(Math.min(95, Math.max(5, Math.round((lastUs / (durationSec * 1e6)) * 90 + 5))));
    });
    p.stderr.on('data', (d: Buffer) => { err += String(d); });
    p.on('error', (e) => reject(e));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code + ': ' + err.slice(-300)))));
  });
}

function ffprobeJson(file: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', file], { windowsHide: true });
    let out = '', err = '';
    p.stdout.on('data', (d: Buffer) => { out += String(d); });
    p.stderr.on('data', (d: Buffer) => { err += String(d); });
    p.on('error', (e) => reject(e));
    p.on('close', () => { try { resolve(JSON.parse(out)); } catch { reject(new Error('ffprobe parse failed')); } });
  });
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

export interface MediaMeta { ext: 'jpg' | 'mp4'; duration?: number; taken?: string; }

/**
 * Принять бинарное медиа: видео — сохранить .mp4 (MOV конвертировать через ffmpeg,
 * H.264/AAC + faststart; autorotate по умолчанию применяет ориентацию iPhone),
 * метаданные (duration, creation_time→локальное время) — через ffprobe.
 * Фото — сохранить как .jpg как есть.
 */
export async function ingestMedia(chatId: string, id: string, buf: Buffer, fileName: string, kind: 'photo' | 'video', onProgress?: (pct: number) => void): Promise<MediaMeta> {
  if (!safeId(chatId) || !safeId(id)) throw new Error('bad id');
  const dir = chatPhotoDir(chatId);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, '.tmp-' + id + '.bin');
  writeFileSync(tmp, buf);
  try {
    if (kind === 'video') {
      const out = mediaPath(chatId, id, 'mp4');
      if (/\.mov$/i.test(fileName)) {
        // Сначала длительность исходника (для процентов), потом конвертация с прогрессом
        let durationSec: number | null = null;
        try {
          const j = await ffprobeJson(tmp);
          if (j && j.format && typeof j.format.duration === 'string') {
            const d = parseFloat(j.format.duration);
            if (isFinite(d)) durationSec = d;
          }
        } catch { /* ок */ }
        await runFfmpegProgress(['-i', tmp, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out], durationSec, onProgress || (() => { /* ок */ }));
      } else {
        writeFileSync(out, buf);
      }
      // Превью-кадр (постер) — этап «превью» в прогрессе
      if (onProgress) onProgress(88);
      try {
        await makeThumb(out, join(dir, id + '.th.jpg'), true);
      } catch (e) { console.error('video thumb failed:', e); }
      if (onProgress) onProgress(100);
      let duration: number | undefined;
      let taken: string | undefined;
      try {
        const j = await ffprobeJson(out);
        const fmt = j && j.format;
        if (fmt && typeof fmt.duration === 'string') {
          const d = parseFloat(fmt.duration);
          if (isFinite(d)) duration = Math.max(1, Math.round(d));
        }
        const ct = fmt && fmt.tags && (fmt.tags.creation_time || fmt.tags['com.apple.quicktime.creationdate']);
        if (ct) {
          const dt = new Date(ct);
          if (!isNaN(dt.getTime())) {
            taken = pad(dt.getFullYear()) + ':' + pad(dt.getMonth() + 1) + ':' + pad(dt.getDate()) + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds());
          }
        }
      } catch { /* метаданные не критичны */ }
      return { ext: 'mp4', duration, taken };
    }
    const out = mediaPath(chatId, id, 'jpg');
    writeFileSync(out, buf);
    // Превью — ресайз до 320px (этап в прогрессе)
    if (onProgress) onProgress(55);
    try {
      await makeThumb(out, join(dir, id + '.th.jpg'), false);
    } catch (e) { console.error('photo thumb failed:', e); }
    if (onProgress) onProgress(100);
    return { ext: 'jpg' };
  } finally {
    try { unlinkSync(tmp); } catch { /* ок */ }
  }
}
