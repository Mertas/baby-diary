import Database from 'better-sqlite3';
import { SCHEMA } from './schema.js';
import { DB_PATH } from '../server/config.js';

/** Текущая версия схемы БД (PRAGMA user_version). Растёт при структурных изменениях;
 *  миграции ниже выполняются последовательно от старой версии к новой. */
const SCHEMA_VERSION = 2;

/** Упорядоченные миграции: [версия, SQL]. Выполняются один раз, затем user_version = версия. */
const MIGRATIONS: Array<[number, string]> = [
  // v1: колонки, добавленные post-hoc поверх базового SCHEMA (до введения user_version)
  [1, `
    ALTER TABLE llm_messages ADD COLUMN ui TEXT;
    ALTER TABLE chats ADD COLUMN thinking INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE llm_messages ADD COLUMN patch TEXT;
    ALTER TABLE llm_messages ADD COLUMN choices TEXT;
    ALTER TABLE llm_messages ADD COLUMN multi INTEGER NOT NULL DEFAULT 0;
  `],
  // v2: снимок state до ответа — для undo с откатом данных
  [2, `ALTER TABLE llm_messages ADD COLUMN prev_state TEXT;`],
];

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.exec(SCHEMA);
    // Выполняем миграции, которых ещё не было (каждая — в try: колонка может уже существовать)
    const current = _db.pragma('user_version', { simple: true }) as number;
    for (const [version, sql] of MIGRATIONS) {
      if (version <= current) continue;
      for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
        try { _db!.exec(stmt); } catch { /* колонка уже есть — не страшно */ }
      }
    }
    _db.pragma(`user_version = ${SCHEMA_VERSION}`);
  }
  return _db;
}

export function closeDb(): void {
  if (_db) { _db.close(); _db = null; }
}
