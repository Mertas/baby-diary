import { getDb } from '../db/index.js';

const ARRAY_KEYS = new Set(['feeds', 'sleeps', 'events', 'tips', 'recipes', 'spurts', 'todos']);

export function getState(chatId: string): Record<string, unknown> {
  const db = getDb();
  const row = db.prepare('SELECT state FROM baby_state WHERE chat_id = ?').get(chatId) as { state: string } | undefined;
  if (!row) return {};
  try { return JSON.parse(row.state); } catch { return {}; }
}

/** Нормализация событий из LLM. Модель НЕ умеет считать timestamp — пусть пишет `time` текстом.
 *  Правила: time='07:30' → сегодня/вчера в это время; 'вчера 22:00' → вчера; без time = сейчас.
 *  type кормления нормализуем (formula→смесь и т.п.), сну ставим nap/night по времени, end — числом. */
const FEED_TYPE_MAP: Record<string, string> = {
  formula: 'смесь', 'искусственное': 'смесь', искусств: 'смесь',
  грудное: 'грудное', breastfeeding: 'грудное', breastmilk: 'грудное', гв: 'грудное', грудь: 'грудное',
  прикорм: 'прикорм', puree: 'прикорм', solid: 'прикорм',
};

function parseTimeHint(hint: unknown, now: number): number {
  if (typeof hint !== 'string' || !hint.trim()) return Math.floor(now / 60000) * 60000;
  const s = hint.trim().toLowerCase();
  const m = s.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return Math.floor(now / 60000) * 60000; // «ночью», «утром», «только что» — текущая минута (квантуем: иначе каждый переизданный «только что» даёт новый timestamp и ломает дедуп)
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
  let base = day0.getTime();
  if (/позавчера/.test(s)) base -= 2 * 86400000;
  else if (/вчера/.test(s)) base -= 86400000;
  let ts = base + h * 3600000 + min * 60000;
  if (ts > now) ts -= 86400000; // время сегодня, но ещё не наступило → вчера
  return ts;
}

/** Семантический ключ события для дедупа: время|тип|(объём/название).
 *  note и порядок полей НЕ участвуют — переизданное событие с другим набором полей
 *  (например, с note vs без, из events-роутинга vs прямых feeds) должно схлопываться.
 *  У сна end не в ключе — при повторе end обновится merge-полями, а не создаст дубль. */
function eventKey(o: Record<string, unknown>): string {
  const ts = o.timestamp ?? '';
  const type = o.type ?? '';
  if (type === 'nap' || type === 'night') return `sl|${ts}|${type}`;
  if (typeof o.amount !== 'undefined') return `fd|${ts}|${type}|${o.amount}`;
  return `ev|${ts}|${o.title ?? o.note ?? ''}`;
}
export function sanitizeStateEvents(state: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...state };
  const now = Date.now();
  // Схема-дрейф: модель иногда пишет ВСЁ в единый `events` с type 'feed'/'sleep'
  // (особенно после retry-промпта без примеров). Разруливаем по массивам ДО нормализации,
  // иначе кормления/сны не попадут в статистику, а end останется строкой.
  if (Array.isArray(out.events)) {
    const feeds = Array.isArray(out.feeds) ? out.feeds : [];
    const sleeps = Array.isArray(out.sleeps) ? out.sleeps : [];
    const rest: unknown[] = [];
    for (const e of out.events) {
      const t = e && typeof e === 'object' && typeof (e as Record<string, unknown>).type === 'string'
        ? String((e as Record<string, unknown>).type).toLowerCase() : '';
      if (t === 'feed' || t === 'feeding' || t === 'кормление') {
        const f = { ...(e as Record<string, unknown>) };
        delete f.type;
        if (f.amount != null) {
          const n = parseFloat(String(f.amount).replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(n)) f.amount = n;
        }
        if (typeof f.note === 'string' && !f.type) {
          const nl = f.note.toLowerCase();
          for (const key of Object.keys(FEED_TYPE_MAP)) {
            if (nl.includes(key)) { f.type = FEED_TYPE_MAP[key]; break; }
          }
        }
        if (!f.type) f.type = 'смесь'; // type 'feed' без уточнения — смесь по умолчанию
        feeds.push(f);
      } else if (t === 'sleep' || t === 'nap' || t === 'night' || t === 'сон') {
        const s = { ...(e as Record<string, unknown>) };
        delete s.type; // основной цикл сам выведет nap/night по часу
        delete s.time;
        sleeps.push(s);
      } else {
        rest.push(e);
      }
    }
    out.events = rest;
    out.feeds = feeds;
    out.sleeps = sleeps;
  }
  for (const k of ['feeds', 'sleeps', 'events']) {
    const arr = out[k];
    if (!Array.isArray(arr)) continue;
    const seen = new Set<string>();
    const clean: unknown[] = [];
    for (const e of arr) {
      let o = e && typeof e === 'object' ? { ...(e as Record<string, unknown>) } : {};
      // Модель пишет время то в `time`, то в `start` — принимаем оба
      let ts = typeof o.timestamp === 'number' && !isNaN(o.timestamp) ? o.timestamp : NaN;
      if (isNaN(ts) || Math.abs(ts - now) > 400 * 86400000) {
        ts = parseTimeHint(o.time ?? o.start, now);
      } else {
        // Числовой timestamp от модели — «сейчас» с миллисекундами; при каждом переиздании
        // события он новый (19:59:11 → 19:59:18 → ...) и ломает дедуп. Приложение живёт
        // минутами — квантуем вниз до минуты.
        ts = Math.floor(ts / 60000) * 60000;
      }
      // Канонический ключ для дедупа: timestamp первым, hint-поля (time/start) удаляются.
      // Иначе {start:'19:24'} и {time:'19:24'} после парсинга дают разный JSON и дубликат выживает.
      o.timestamp = ts;
      delete o.time;
      delete o.start;
      const canonical: Record<string, unknown> = { timestamp: ts, ...o };
      o = canonical;
      if (k === 'feeds') {
        if (typeof o.amount === 'string') {
          const n = parseFloat(o.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(n)) o.amount = n;
        }
        if (typeof o.type === 'string') {
          const t = FEED_TYPE_MAP[o.type.toLowerCase()];
          if (t) o.type = t;
        }
      }
      if (k === 'sleeps') {
        if (typeof o.type !== 'string' || !o.type) {
          const h = new Date(ts).getHours();
          o.type = (h >= 21 || h < 7) ? 'night' : 'nap';
        }
        if (o.end != null) {
          let end = typeof o.end === 'number' && !isNaN(o.end) ? o.end : parseTimeHint(String(o.end), now);
          if (typeof o.end === 'number' && !isNaN(o.end)) end = Math.floor(end / 60000) * 60000;
          if (end > now + 86400000) end = now; // end в будущем — считаем «сейчас»
          if (end <= ts) delete o.end; else o.end = end;
        }
      }
      // Дедуп: модель иногда возвращает одинаковые события несколько раз.
      // Ключ семантический (см. eventKey) — порядок полей и note не важны.
      const key = eventKey(o);
      if (seen.has(key)) continue;
      seen.add(key);
      clean.push(o);
    }
    out[k] = clean;
  }
  return out;
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
    // События (feeds/sleeps/events) уникальны по времени — не дедуплицировать по title/типу,
    // иначе два «Пробуждения» или два «Замера» в разные дни заменят друг друга
    if (typeof o.timestamp === 'number' && !o.category) {
      return 'ev:' + eventKey(o as Record<string, unknown>);
    }
    if (o.title) return 'title:' + String(o.title);
    if (o.text) return 'text:' + String(o.text);
    if (o.skill) return 'skill:' + String(o.skill);
    if (o.day) return 'day:' + String(o.day);
  }
  return 'raw:' + JSON.stringify(item);
}
