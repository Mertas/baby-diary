import Database from 'better-sqlite3';
import { SCHEMA } from './schema.js';
import { DB_PATH } from '../server/config.js';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.exec(SCHEMA);
    try { _db.exec('ALTER TABLE llm_messages ADD COLUMN ui TEXT'); } catch { /* ok */ }
    try { _db.exec('ALTER TABLE chats ADD COLUMN thinking INTEGER NOT NULL DEFAULT 0'); } catch { /* ok */ }
    try { _db.exec('ALTER TABLE llm_messages ADD COLUMN patch TEXT'); } catch { /* ok */ }
    try { _db.exec('CREATE TABLE IF NOT EXISTS baby_state (chat_id TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT \'{}\', created_at INTEGER NOT NULL DEFAULT (strftime(\'%s\',\'now\') * 1000), updated_at INTEGER NOT NULL DEFAULT (strftime(\'%s\',\'now\') * 1000), FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE)'); } catch { /* ok */ }
  }
  return _db;
}

export function closeDb(): void {
  if (_db) { _db.close(); _db = null; }
}
