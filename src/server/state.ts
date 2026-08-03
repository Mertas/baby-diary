import { getDb } from '../db/index.js';

const ARRAY_KEYS = new Set(['feeds', 'sleeps', 'events', 'tips', 'recipes', 'spurts', 'todos']);

export function getState(chatId: string): Record<string, unknown> {
  const db = getDb();
  const row = db.prepare('SELECT state FROM baby_state WHERE chat_id = ?').get(chatId) as { state: string } | undefined;
  if (!row) return {};
  try { return JSON.parse(row.state); } catch { return {}; }
}

export function saveState(chatId: string, state: Record<string, unknown>): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(
    'INSERT INTO baby_state (chat_id, state, created_at, updated_at) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(chat_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at'
  ).run(chatId, JSON.stringify(state), now, now);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Deep-merge incoming into current:
 * - plain objects merge key-by-key
 * - arrays append new items (dedupe by title/id)
 * - scalars overwrite
 */
export function mergeState(current: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...current };
  for (const k of Object.keys(incoming)) {
    const iv = incoming[k];
    const cv = out[k];
    if (isPlainObject(iv)) {
      out[k] = mergeState(isPlainObject(cv) ? cv : {}, iv);
    } else if (Array.isArray(iv)) {
      const base = Array.isArray(cv) ? cv : [];
      out[k] = appendUnique(base as unknown[], iv);
    } else if (iv !== null && iv !== undefined) {
      out[k] = iv;
    }
    // null/undefined incoming values are ignored — don't destroy existing data
  }
  return out;
}

function appendUnique(base: unknown[], incoming: unknown[]): unknown[] {
  const out = [...base];
  const byKey = new Map<string, unknown>();
  for (const item of base) byKey.set(itemKey(item), item);
  for (const item of incoming) {
    const key = itemKey(item);
    const existing = byKey.get(key);
    if (existing !== undefined) {
      // Update existing item (merge fields) instead of appending a duplicate
      const idx = out.indexOf(existing);
      if (idx >= 0 && existing && typeof existing === 'object' && item && typeof item === 'object') {
        out[idx] = { ...(existing as object), ...(item as object) };
      }
    } else {
      out.push(item);
      byKey.set(key, item);
    }
  }
  return out;
}

function itemKey(item: unknown): string {
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    if (o.id) return 'id:' + String(o.id);
    if (o.title) return 'title:' + String(o.title);
    if (o.text) return 'text:' + String(o.text);
  }
  return 'raw:' + JSON.stringify(item);
}
