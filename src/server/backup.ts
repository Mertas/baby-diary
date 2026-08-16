// Бэкап и экспорт: zip-архив дневника (state.json + фото/видео) и авто-копии на диск.
import { zipSync, strToU8 } from 'fflate';
import { mkdirSync, readdirSync, readFileSync, copyFileSync, existsSync, statSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getState, stripSensitiveState } from './state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data');
const PHOTO_DIR = join(DATA_DIR, 'photos');
const BACKUP_DIR = join(DATA_DIR, 'backups');
const BACKUP_KEEP = 7; // дней авто-копий

/** Собрать ZIP дневника: state.json (без GPS) + все файлы медиа чата. */
export function exportChatZip(chatId: string): Buffer {
  const files: Record<string, Uint8Array> = {
    'state.json': strToU8(JSON.stringify(stripSensitiveState(getState(chatId)), null, 1)),
    'README.txt': strToU8(
      'Дневник Baby Diary — экспорт\n' +
      `chatId: ${chatId}\n` +
      'state.json — все данные дневника (без GPS-координат фото).\n' +
      'Фото/видео — в каталоге media/ (id.jpg / id.mp4 / id.th.jpg).\n' +
      'Импорт: положите state.json и media/ в data/ этого приложения.\n'
    ),
  };
  const dir = join(PHOTO_DIR, chatId);
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (!/\.(jpg|mp4)$/i.test(f)) continue; // .tmp и .meta пропускаем
      try {
        files['media/' + f] = new Uint8Array(readFileSync(join(dir, f)));
      } catch { /* битый файл — пропускаем */ }
    }
  }
  return Buffer.from(zipSync(files, { level: 6 }));
}

/** Авто-копия на диск: БД (после WAL-checkpoint) + фото. Держим BACKUP_KEEP копий. */
export function dailyBackup(): void {
  try {
    const stamp = new Date().toISOString().slice(0, 10);
    const dir = join(BACKUP_DIR, stamp);
    mkdirSync(dir, { recursive: true });
    const dbPath = join(DATA_DIR, 'babydiary.db');
    if (existsSync(dbPath)) copyFileSync(dbPath, join(dir, 'babydiary.db'));
    const walPath = dbPath + '-wal';
    if (existsSync(walPath)) copyFileSync(walPath, join(dir, 'babydiary.db-wal'));
    const shmPath = dbPath + '-shm';
    if (existsSync(shmPath)) copyFileSync(shmPath, join(dir, 'babydiary.db-shm'));
    if (existsSync(PHOTO_DIR)) copyDir(PHOTO_DIR, join(dir, 'photos'));
    // Удаляем копии старше BACKUP_KEEP дней
    for (const d of readdirSync(BACKUP_DIR)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      if (d < stamp) {
        try {
          const age = (Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000;
          if (age > BACKUP_KEEP) rmSync(join(BACKUP_DIR, d), { recursive: true, force: true });
        } catch { /* ок */ }
      }
    }
    console.log(`[backup] saved ${stamp} (${dbSize(dir)} bytes)`);
  } catch (e) { console.error('[backup] failed:', e); }
}

function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const f of readdirSync(src)) {
    const s = join(src, f), d = join(dest, f);
    try {
      if (statSync(s).isDirectory()) copyDir(s, d);
      else copyFileSync(s, d);
    } catch { /* ок */ }
  }
}

function dbSize(dir: string): number {
  try {
    let n = 0;
    for (const f of readdirSync(dir)) {
      try { n += statSync(join(dir, f)).size; } catch { /* ок */ }
    }
    return n;
  } catch { return 0; }
}
