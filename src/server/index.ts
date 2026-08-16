// Точка входа: запуск сервера. Все роуты/приложение — в app.ts (экспорт app/server/wss).
import { getDb, closeDb } from '../db/index.js';
import { PORT } from './config.js';
import { server, wss, processMediaQueue } from './app.js';
import { restoreMediaQueue } from './photos.js';
import { dailyBackup } from './backup.js';

server.listen(PORT, () => {
  console.log(`BabyDiary running at http://localhost:${PORT}`);
  // Догнать незавершённые конвертации после рестарта (очередь восстанавливается из .tmp-файлов)
  for (const chatId of restoreMediaQueue()) void processMediaQueue(chatId);
  rotateLogs();
  // llm_logs (полные промпты+ответы) растут мегабайтами — чистим ещё и по расписанию, не только при старте
  setInterval(rotateLogs, 3600 * 1000).unref();
  // После удаления старых логов файл БД не уменьшается без VACUUM — делаем один раз при старте
  setTimeout(() => {
    try { const before = fileSize(getDb()); getDb().pragma('wal_checkpoint(TRUNCATE)'); getDb().exec('VACUUM'); console.log(`[db] vacuumed (${before} → ${fileSize(getDb())} bytes)`); }
    catch (e) { console.error('[db] vacuum failed:', e); }
  }, 2000).unref();
  // Авто-бэкап на диск: сразу при старте и далее раз в сутки (data/backups/<дата>/)
  dailyBackup();
  setInterval(dailyBackup, 24 * 3600 * 1000).unref();
});
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

function fileSize(db: unknown): number {
  try { return (db as { pragma: (p: string, o?: object) => unknown }).pragma('page_count', { simple: true }) as number * 4096; }
  catch { return 0; }
}

/** Удалить старые записи llm_logs (14 дней — компактный период для отладки). */
function rotateLogs(): void {
  try {
    const cutoff = Date.now() - 14 * 86400000;
    const { changes } = getDb().prepare('DELETE FROM llm_logs WHERE created_at < ?').run(cutoff);
    if (changes > 0) console.log(`[logs] cleaned ${changes} old llm_logs rows`);
  } catch (e) { console.error('[logs] rotation failed:', e); }
}

function shutdown() {
  console.log('\nShutting down...');
  wss.close(); server.close(); closeDb(); process.exit(0);
}
