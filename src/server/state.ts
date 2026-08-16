import { getDb } from '../db/index.js';

const ARRAY_KEYS = new Set(['feeds', 'sleeps', 'events', 'tips', 'recipes', 'spurts', 'todos', 'shopping', 'reminders', 'calendar', 'tabs', 'family', 'budget', 'llmNotes', 'stock', 'photos']);

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

/** Локальное время суток (мс от начала локального дня) — для «в тот же час» в день мамы. */
function timeOfDay(now: number): number {
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  return now - d.getTime();
}

export function parseTimeHint(hint: unknown, now: number, dayBase?: number): number {
  if (typeof hint !== 'string' || !hint.trim()) return dayBase != null ? dayBase + timeOfDay(now) : Math.floor(now / 60000) * 60000;
  const s = hint.trim().toLowerCase();
  // Дата «25.09» / «25.09.2026» / «25.09 10:30» — с точкой-разделителем (время — с двоеточием «10:30»).
  // «05.06» = 5 июня; «5.30» = не дата (месяца 30 нет) → время 5:30.
  const hasColon = s.includes(':');
  const dm = s.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dm) {
    const day = parseInt(dm[1], 10), mon = parseInt(dm[2], 10);
    // «11.08 06:30» — дата+время (есть ЧЧ:ММ) — однозначно дата, даже если день ≤ 23
    const hasTime = !!dm[4];
    const isDate = day > 23 || (mon >= 1 && mon <= 12 && (!hasColon || hasTime));
    if (isDate && mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      const yr = dm[3] ? (parseInt(dm[3], 10) < 100 ? 2000 + parseInt(dm[3], 10) : parseInt(dm[3], 10)) : new Date(now).getFullYear();
      const d = new Date(yr, mon - 1, day);
      if (!isNaN(d.getTime())) {
        let ts = d.getTime();
        if (dm[4]) ts += parseInt(dm[4], 10) * 3600000 + parseInt(dm[5], 10) * 60000;
        return ts;
      }
    }
  }
  const m = s.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) {
    // «ночью», «утром», «только что» — без времени: день мамы (если задан) или сейчас
    return dayBase != null ? dayBase + timeOfDay(now) : Math.floor(now / 60000) * 60000;
  }
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  if (dayBase != null) {
    // день мамы: время парсится от её дня, без сдвига «будущее → вчера»
    let base = dayBase;
    if (/позавчера/.test(s)) base -= 2 * 86400000;
    else if (/вчера/.test(s)) base -= 86400000;
    return base + h * 3600000 + min * 60000;
  }
  const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
  let base = day0.getTime();
  if (/позавчера/.test(s)) base -= 2 * 86400000;
  else if (/вчера/.test(s)) base -= 86400000;
  let ts = base + h * 3600000 + min * 60000;
  if (ts > now) ts -= 86400000; // время сегодня, но ещё не наступило → вчера
  return ts;
}

const RECURRING_MAP: Record<string, string> = {
  daily: 'daily', 'ежедневно': 'daily', 'каждый день': 'daily', 'ежедневный': 'daily',
  weekly: 'weekly', 'еженедельно': 'weekly', 'каждую неделю': 'weekly', 'раз в неделю': 'weekly',
  monthly: 'monthly', 'ежемесячно': 'monthly', 'каждый месяц': 'monthly', 'раз в месяц': 'monthly',
  yearly: 'yearly', 'ежегодно': 'yearly', 'каждый год': 'yearly', 'раз в год': 'yearly', 'день рождения': 'yearly',
};
function calId(title: string, date: string, time: string): string {
  let h = 0;
  for (const ch of title + '|' + date + '|' + time) { h = (h * 31 + ch.charCodeAt(0)) >>> 0; }
  return 'c' + h.toString(36);
}
/** Нормализация календаря: {id?, title, date:'YYYY-MM-DD', time:'HH:MM', recurring?, important?, done?}.
 *  Модель пишет дату строкой (может «завтра»/«сегодня») — приводим к ISO; повторяемость — к enum;
 *  важное/сделанное — к boolean. Без даты запись остаётся (UI покажет как «без даты»). */
function sanitizeCalendar(items: unknown): unknown[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const clean: unknown[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayShift: Record<string, number> = { 'позавчера': -2, 'вчера': -1, 'сегодня': 0, 'завтра': 1, 'послезавтра': 2 };
  for (const e of items) {
    const o = e && typeof e === 'object' ? { ...(e as Record<string, unknown>) } : {};
    if (o._delete) { clean.push(o); continue; } // маркер удаления — пропускаем в mergeState как есть
    if (typeof o.title !== 'string' || !o.title.trim()) continue;
    o.title = o.title.trim();
    if (typeof o.date === 'string' && o.date.trim()) {
      const d = o.date.trim().toLowerCase();
      const iso = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (iso) {
        o.date = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
      } else if (dayShift[d]) {
        o.date = new Date(today.getTime() + dayShift[d] * 86400000).toISOString().slice(0, 10);
      }
      // иначе (день недели, «до конца недели») — оставляем строку, пусть LLM уточнит дату при следующем ходе
    }
    if (typeof o.time === 'string') {
      const tm = o.time.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (tm) o.time = `${tm[1].padStart(2, '0')}:${tm[2]}`; else delete o.time;
    }
    if (typeof o.recurring === 'string') {
      o.recurring = RECURRING_MAP[o.recurring.trim().toLowerCase()] || null;
    }
    // until: дата окончания повторения («по вторникам до конца августа» → until 2026-08-25)
    if (o.until != null) {
      if (typeof o.until === 'string') {
        const u = o.until.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (u) o.until = `${u[1]}-${u[2].padStart(2, '0')}-${u[3].padStart(2, '0')}`;
        else delete o.until;
      } else {
        delete o.until;
      }
      if (!o.recurring) delete o.until; // until без повторения бессмыслен
      if (o.until && o.date && String(o.until) < String(o.date)) delete o.until; // раньше начала — мусор
    }
    if (o.important != null && typeof o.important !== 'boolean') {
      o.important = /^(да|true|1|важно|обязательно)$/i.test(String(o.important));
    }
    if (o.done != null && typeof o.done !== 'boolean') {
      o.done = /^(да|true|1)$/i.test(String(o.done));
    }
    // id: модель копирует его при переносе/правке (см. промпт); для новых событий генерируем.
    // ВНИМАНИЕ: серверный id зависит от (title|date|time) — перенос без скопированного id
    // даст новый id и дубль; поэтому промпт требует копировать id при переносе.
    if (!o.id) o.id = calId(String(o.title), String(o.date || ''), o.time ? String(o.time) : '');
    if (typeof o.id !== 'string' || !o.id.trim()) o.id = calId(String(o.title), String(o.date || ''), o.time ? String(o.time) : '');
    // Дедуп по (date|title|time): повторная отправка той же встречи не плодит дубль,
    // а обновление полей (перенос, important) проходит через merge-поля.
    const key = `${o.date || '?'}|${o.title}|${o.time || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(o);
  }
  return clean;
}

/** Семантический ключ события для дедупа: время|тип|(объём/название).
 *  note и порядок полей НЕ участвуют — переизданное событие с другим набором полей
 *  (например, с note vs без, из events-роутинга vs прямых feeds) должно схлопываться.
 *  У сна end не в ключе — при повторе end обновится merge-полями, а не создаст дубль. */
export function eventKey(o: Record<string, unknown>): string {
  const ts = o.timestamp ?? '';
  const type = o.type ?? '';
  if (type === 'nap' || type === 'night') return `sl|${ts}|${type}`;
  if (typeof o.amount !== 'undefined') return `fd|${ts}|${type}|${o.amount}`;
  return `ev|${ts}|${o.title ?? o.note ?? ''}`;
}
export function extractMomDay(text: string): number | undefined {
  // «сегодня 20.07» / «сегодня 20.07.2026» / «сегодня 20 июля» / «сегодня 10 августа» — день мамы
  const MONTHS: Record<string, number> = { 'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6, 'июля': 7, 'августа': 8, 'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12 };
  const m = text.match(/сегодня\s+(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?/i);
  if (m) {
    const day = parseInt(m[1], 10), mon = parseInt(m[2], 10);
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      const yr = m[3] ? (parseInt(m[3], 10) < 100 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : new Date().getFullYear();
      const d = new Date(yr, mon - 1, day);
      if (!isNaN(d.getTime())) { d.setHours(0, 0, 0, 0); return d.getTime(); }
    }
  }
  const mr = text.match(/сегодня\s+(\d{1,2})\s+([а-яё]+)/i);
  if (mr) {
    const mon = MONTHS[mr[2].toLowerCase()];
    if (mon) {
      const day = parseInt(mr[1], 10);
      if (day >= 1 && day <= 31) {
        const d = new Date(new Date().getFullYear(), mon - 1, day);
        if (!isNaN(d.getTime())) { d.setHours(0, 0, 0, 0); return d.getTime(); }
      }
    }
  }
  return undefined;
}

export function sanitizeStateEvents(state: Record<string, unknown>, dayBase?: number): Record<string, unknown> {
  const out: Record<string, unknown> = { ...state };
  const now = Date.now();
  if ('calendar' in out) out.calendar = sanitizeCalendar(out.calendar);
  // blurb — строка (милое описание); объект/мусор выбрасываем
  if ('blurb' in out && typeof out.blurb !== 'string') delete out.blurb;
  // city — строка (город для виджета погоды)
  if ('city' in out && typeof out.city !== 'string') delete out.city;
  // Схема-дрейф: details.feeding модель иногда пишет объектом {type, started, foods} вместо строки
  if (out.details && typeof out.details === 'object') {
    const d = out.details as Record<string, unknown>;
    if (d.feeding && typeof d.feeding === 'object') {
      const f = d.feeding as Record<string, unknown>;
      if (typeof f.type === 'string') d.feeding = f.type;
      else delete d.feeding;
    }
  }
  // Схема-дрейф: модель иногда пишет ВСЁ в единый `events` с type 'feed'/'sleep'
  // (особенно после retry-промпта без примеров). Разруливаем по массивам ДО нормализации,
  // иначе кормления/сны не попадут в статистику, а end останется строкой.
  if (Array.isArray(out.events)) {
    const feeds = Array.isArray(out.feeds) ? out.feeds : [];
    const sleeps = Array.isArray(out.sleeps) ? out.sleeps : [];
    const rest: unknown[] = [];
    for (const e of out.events) {
      const rec = (e && typeof e === 'object') ? (e as Record<string, unknown>) : {};
      const t = typeof rec.type === 'string' ? String(rec.type).toLowerCase() : '';
      const title = typeof rec.title === 'string' ? String(rec.title).toLowerCase() : '';
      // Дрейф бывает и по title («Кормление» в events вместо feeds)
      if (t === 'feed' || t === 'feeding' || t === 'кормление' || title === 'кормление' || title.includes('кормление')) {
        const f = { ...rec };
        delete f.type;
        if (f.amount != null) {
          const n = parseFloat(String(f.amount).replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(n)) f.amount = n;
        } else if (typeof f.note === 'string') {
          // Объём спрятан в note: «Смесь 110 мл»
          const nm = f.note.match(/(\d+)\s*мл/);
          if (nm) f.amount = parseFloat(nm[1]);
        }
        if (typeof f.note === 'string' && !f.type) {
          const nl = f.note.toLowerCase();
          for (const key of Object.keys(FEED_TYPE_MAP)) {
            if (nl.includes(key)) { f.type = FEED_TYPE_MAP[key]; break; }
          }
        }
        if (!f.type) f.type = 'смесь'; // type 'feed' без уточнения — смесь по умолчанию
        feeds.push(f);
      } else if (t === 'sleep' || t === 'nap' || t === 'night' || t === 'сон' || title === 'сон' || title.includes('уснул') || title.includes('заснул')) {
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
      // Маркер удаления — как есть, без нормализации и дедупа: иначе он схлопнется
      // с исправленной записью (eventKey не содержит note: ev|ts|title) и удаление
      // сожрёт новую версию события.
      if (o._delete) { clean.push(o); continue; }
      // Модель пишет время то в `time`, то в `start` — принимаем оба
      let ts = typeof o.timestamp === 'number' && !isNaN(o.timestamp) ? o.timestamp : NaN;
      if (isNaN(ts) || Math.abs(ts - now) > 400 * 86400000) {
        // Модель иногда дублирует: start «12:00» + time «15.08» (дата отдельно) — склеиваем «15.08 12:00»
        let startHint: unknown = o.time ?? o.start;
        if (o.start && o.time && typeof o.start === 'string' && typeof o.time === 'string') {
          const tM = o.time.trim().match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
          const sM = o.start.trim().match(/^(\d{1,2}):(\d{2})$/);
          if (tM && sM) startHint = `${o.time.trim()} ${sM[1]}:${sM[2]}`;
        }
        ts = parseTimeHint(startHint, now, dayBase);
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
          let end: number;
          if (typeof o.end === 'number' && !isNaN(o.end)) {
            end = Math.floor(o.end / 60000) * 60000;
          } else {
            // end может быть «14:30» или «14.08 14:30». Парсим от дня НАЧАЛА сна (или dayBase мамы):
            // «14:30» → день сна 14:30; «14.08 14:30» → явная дата. Без сдвига «будущее→вчера» —
            // иначе сон 12:10–13:40, обработанный в 12:35, терял бы end.
            const endBase = dayBase != null ? dayBase : ts;
            const d = parseTimeHint(o.end, now, endBase);
            if (d != null && !isNaN(d)) {
              end = d;
              // сон через полночь: end ≤ start → следующий день
              if (end <= ts) end += 86400000;
            } else {
              end = Math.floor(now / 60000) * 60000;
            }
          }
          // Защита от выдуманного будущего: end дальше 2 суток от начала сна — сбрасываем
          if (end > ts + 2 * 86400000) end = now;
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
      // Явное удаление: элементы с _delete:true вычёркиваются из базы (маркер не сохраняется).
      // merge по своей природе только дополняет — без маркера удаление из UI невозможно.
      // Матчинг: по id, а для легаси-записей без id — по (title|date|time) из маркера.
      const markers = iv.filter((x: any) => x && typeof x === 'object' && x._delete);
      const delById = new Set(markers.filter((x: any) => x.id).map((x: any) => String(x.id)));
      const delByName = new Set(markers.filter((x: any) => x.name && !x.id).map((x: any) => String(x.name)));
      // timestamp в ключе: события (feeds/sleeps/events) не имеют id/date — исправление/удаление
      // идёт по (title|note|timestamp). Calendar/легаси-записи timestamp не имеют — ключ совпадает.
      // delByKeyNoTs: страховка, если модель не скопировала timestamp — матчим по title|date|time|note.
      const delByKey = new Set(markers.filter((x: any) => !x.id && !x.name).map((x: any) => `${x.title}|${x.date}|${x.time || ''}|${x.note || ''}|${x.timestamp ?? ''}`));
      const delByKeyNoTs = new Set(markers.filter((x: any) => !x.id && !x.name && x.timestamp == null).map((x: any) => `${x.title}|${x.date}|${x.time || ''}|${x.note || ''}`));
      let mergedBase = base;
      if (delById.size || delByName.size || delByKey.size || delByKeyNoTs.size) {
        mergedBase = base.filter((x: any) => {
          if (x && typeof x === 'object') {
            if (x.id && delById.has(String(x.id))) return false;
            if (delByName.has(String(x.name || ''))) return false;
            // Маркер без id матчится по ключу (title|date|time|note|timestamp) —
            // в т.ч. с записями, у которых id есть (легаси-записи, модель могла не скопировать id).
            if (delByKey.has(`${x.title}|${x.date}|${x.time || ''}|${x.note || ''}|${x.timestamp ?? ''}`) ||
                delByKeyNoTs.has(`${x.title}|${x.date}|${x.time || ''}|${x.note || ''}`)) return false;
          }
          return true;
        });
      }
      out[k] = appendUnique(mergedBase as unknown[], iv.filter((x: any) => !(x && typeof x === 'object' && x._delete)), k);
    } else if (iv !== null && iv !== undefined) {
      out[k] = iv;
    }
    // null/undefined incoming values are ignored — don't destroy existing data
  }
  return out;
}

function appendUnique(base: unknown[], incoming: unknown[], arrayKey?: string): unknown[] {
  const out = [...base];
  const byKey = new Map<string, unknown>();
  for (const item of base) byKey.set(itemKey(item), item);
  for (const item of incoming) {
    const itemK = itemKey(item);
    const existing = byKey.get(itemK);
    if (existing !== undefined) {
      // Update existing item (merge fields) instead of appending a duplicate
      const idx = out.indexOf(existing);
      if (idx >= 0 && existing && typeof existing === 'object' && item && typeof item === 'object') {
        out[idx] = { ...(existing as object), ...(item as object) };
      }
    } else {
      // Советы: если текст совпадает с существующим (нормализованно) — не плодим дубль с другим title
      if (arrayKey === 'tips') {
        const nt = normText((item as any)?.text);
        if (nt && base.some((b: any) => normText(b?.text) === nt)) continue;
      }
      out.push(item);
      byKey.set(itemK, item);
    }
  }
  return out;
}

function normText(s: unknown): string {
  return String(s || '').toLowerCase().replace(/[^a-zа-яё0-9]+/g, '');
}

export function itemKey(item: unknown): string {
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    // Семья: ключ по имени (дедуп при переиздании), id модели не должен плодить дубли
    if (o.name && !o.timestamp && !o.title) return 'name:' + String(o.name) + '|' + String(o.role || '');
    // Запасы: ключ по названию
    if (o.name && o.qty !== undefined && !o.timestamp) return 'stock:' + String(o.name);
    if (o.id) return 'id:' + String(o.id);
    // События (feeds/sleeps/events) уникальны по времени — не дедуплицировать по title/типу,
    // иначе два «Пробуждения» или два «Замера» в разные дни заменят друг друга
    if (typeof o.timestamp === 'number' && !o.category) {
      return 'ev:' + eventKey(o as Record<string, unknown>);
    }
    // Календарь: ключ (date|title) — перенос времени/полей проходит как обновление,
    // а не как дубль; разные встречи с одинаковым title в разные даты не сливаются.
    if (o.date && o.title && !o.timestamp) return 'cal:' + String(o.date) + '|' + String(o.title);
    if (o.title) return 'title:' + String(o.title);
    if (o.name) return 'name:' + String(o.name);
    if (o.note) return 'note:' + String(o.note);
    if (o.text) return 'text:' + String(o.text);
    if (o.skill) return 'skill:' + String(o.skill);
    if (o.day) return 'day:' + String(o.day);
  }
  return 'raw:' + JSON.stringify(item);
}
