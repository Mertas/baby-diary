// Тесты чистых функций нормализации state (без БД).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeHint, sanitizeStateEvents, mergeState, eventKey, itemKey } from '../src/server/state.js';

// ─── parseTimeHint ──────────────────────────────────────────

test('parseTimeHint: "07:30" — сегодня в это время', () => {
  const now = new Date(2026, 7, 14, 12, 0, 0).getTime(); // 14.08.2026 12:00
  const ts = parseTimeHint('07:30', now);
  assert.equal(ts, new Date(2026, 7, 14, 7, 30).getTime());
});

test('parseTimeHint: будущее время сегодня → вчера', () => {
  const now = new Date(2026, 7, 14, 12, 0, 0).getTime();
  const ts = parseTimeHint('18:00', now);
  assert.equal(ts, new Date(2026, 7, 13, 18, 0).getTime());
});

test('parseTimeHint: "вчера 22:00"', () => {
  const now = new Date(2026, 7, 14, 12, 0, 0).getTime();
  const ts = parseTimeHint('вчера 22:00', now);
  assert.equal(ts, new Date(2026, 7, 13, 22, 0).getTime());
});

test('parseTimeHint: "20.07 07:30" — явная дата+время', () => {
  const now = new Date(2026, 7, 14, 12, 0, 0).getTime();
  const ts = parseTimeHint('20.07 07:30', now);
  assert.equal(ts, new Date(2026, 6, 20, 7, 30).getTime());
});

test('parseTimeHint: "5.30" — не дата (месяца 30 нет), а время 5:30', () => {
  const now = new Date(2026, 7, 14, 12, 0, 0).getTime();
  const ts = parseTimeHint('5.30', now);
  assert.equal(ts, new Date(2026, 7, 14, 5, 30).getTime());
});

test('parseTimeHint: без времени — день мамы (dayBase) в то же время суток', () => {
  const now = new Date(2026, 7, 14, 12, 0, 0).getTime();
  const dayBase = new Date(2026, 6, 20).getTime();
  const ts = parseTimeHint('', now, dayBase);
  assert.equal(ts, new Date(2026, 6, 20, 12, 0).getTime());
});

test('parseTimeHint: с dayBase время парсится от дня мамы без сдвига будущего', () => {
  const now = new Date(2026, 7, 14, 12, 0, 0).getTime();
  const dayBase = new Date(2026, 6, 20).getTime();
  const ts = parseTimeHint('18:00', now, dayBase);
  assert.equal(ts, new Date(2026, 6, 20, 18, 0).getTime());
});

// ─── sanitizeStateEvents ────────────────────────────────────

test('sanitize: feed "07:30" получает timestamp', () => {
  const out = sanitizeStateEvents({ feeds: [{ type: 'смесь', amount: 110, time: '07:30' }] }) as { feeds: any[] };
  const f = out.feeds[0];
  assert.equal(typeof f.timestamp, 'number');
  assert.equal(f.amount, 110);
  assert.equal(f.type, 'смесь');
  assert.equal('time' in f, false);
});

test('sanitize: amount строкой нормализуется в число', () => {
  const out = sanitizeStateEvents({ feeds: [{ type: 'смесь', amount: '110 мл', time: '07:30' }] }) as { feeds: any[] };
  assert.equal(out.feeds[0].amount, 110);
});

test('sanitize: "formula" → "смесь"', () => {
  const out = sanitizeStateEvents({ feeds: [{ type: 'formula', amount: 90, time: '07:30' }] }) as { feeds: any[] };
  assert.equal(out.feeds[0].type, 'смесь');
});

test('sanitize: дубль события схлопывается (тот же timestamp+amount)', () => {
  const out = sanitizeStateEvents({ feeds: [
    { type: 'смесь', amount: 110, time: '07:30' },
    { type: 'смесь', amount: 110, time: '07:30' },
  ] }) as { feeds: any[] };
  assert.equal(out.feeds.length, 1);
});

test('sanitize: sleep end строкой парсится и end > start', () => {
  const out = sanitizeStateEvents({ sleeps: [{ type: 'nap', start: '11:00', end: '12:10' }] }) as { sleeps: any[] };
  const s = out.sleeps[0];
  assert.equal(typeof s.timestamp, 'number');
  assert.ok(s.end > s.timestamp);
});

test('sanitize: sleep end ≤ start → следующий день', () => {
  const out = sanitizeStateEvents({ sleeps: [{ start: '23:00', end: '06:00' }] }) as { sleeps: any[] };
  const s = out.sleeps[0];
  assert.ok(s.end - s.timestamp >= 6 * 3600000 - 60000, 'end должен быть утром следующего дня');
});

test('sanitize: тип сна по часу (23:00 → night)', () => {
  const out = sanitizeStateEvents({ sleeps: [{ start: '23:00' }] }) as { sleeps: any[] };
  assert.equal(out.sleeps[0].type, 'night');
});

test('sanitize: маркер _delete проходит без нормализации и дедупа', () => {
  const out = sanitizeStateEvents({ feeds: [
    { type: 'смесь', amount: 110, time: '07:30', timestamp: 1234567890000, _delete: true },
  ] }) as { feeds: any[] };
  assert.equal(out.feeds.length, 1);
  assert.equal(out.feeds[0]._delete, true);
  assert.equal(out.feeds[0].timestamp, 1234567890000);
});

test('sanitize: события type feed в events переезжают в feeds', () => {
  const out = sanitizeStateEvents({ events: [{ type: 'feed', amount: 80, time: '08:00' }] }) as { feeds: any[]; events: any[] };
  assert.equal(out.feeds.length, 1);
  assert.equal(out.events.length, 0);
});

test('sanitize: blurb/city не-строки выбрасываются', () => {
  const out = sanitizeStateEvents({ blurb: { nonsense: true }, city: 42, name: 'Миша' }) as Record<string, unknown>;
  assert.equal('blurb' in out, false);
  assert.equal('city' in out, false);
  assert.equal(out.name, 'Миша');
});

// ─── mergeState ─────────────────────────────────────────────

test('merge: скаляры перезаписываются, null не затирает', () => {
  const out = mergeState({ name: 'Старое', weight: 7000 }, { name: 'Новое', weight: null });
  assert.equal(out.name, 'Новое');
  assert.equal(out.weight, 7000);
});

test('merge: объекты мержатся по ключам', () => {
  const out = mergeState({ details: { feeding: 'смесь' } }, { details: { allergies: 'нет' } }) as { details: any };
  assert.deepEqual(out.details, { feeding: 'смесь', allergies: 'нет' });
});

test('merge: массивы дополняются без дублей (по id)', () => {
  const out = mergeState({ calendar: [{ id: 'c1', title: 'А' }] }, { calendar: [{ id: 'c1', title: 'А', done: true }, { id: 'c2', title: 'Б' }] }) as { calendar: any[] };
  assert.equal(out.calendar.length, 2);
  assert.equal(out.calendar.find((c: any) => c.id === 'c1')?.done, true);
});

test('merge: _delete убирает элемент по id', () => {
  const out = mergeState({ calendar: [{ id: 'c1', title: 'А' }, { id: 'c2', title: 'Б' }] }, { calendar: [{ id: 'c1', _delete: true }] }) as { calendar: any[] };
  assert.deepEqual(out.calendar.map((c: any) => c.id), ['c2']);
});

test('merge: _delete по ключу (title|date|time) для легаси-записей', () => {
  const out = mergeState({ calendar: [{ id: 'c1', title: 'Педиатр', date: '2026-08-20', time: '09:00' }] },
    { calendar: [{ title: 'Педиатр', date: '2026-08-20', time: '09:00', _delete: true }] }) as { calendar: any[] };
  assert.equal(out.calendar.length, 0);
});

test('merge: _delete не оставляет маркер в результате', () => {
  const out = mergeState({ calendar: [{ id: 'c1', title: 'А' }] }, { calendar: [{ id: 'c1', _delete: true }] }) as { calendar: any[] };
  assert.ok(!out.calendar.some((c: any) => c._delete));
});

test('merge: советы с одинаковым текстом не дублируются', () => {
  const out = mergeState({ tips: [{ title: 'Сон', text: 'Проветривать' }] }, { tips: [{ title: 'Другое название', text: 'Проветривать' }] }) as { tips: any[] };
  assert.equal(out.tips.length, 1);
});

// ─── eventKey / itemKey ─────────────────────────────────────

test('eventKey: кормление по (ts|type|amount)', () => {
  const k = eventKey({ timestamp: 1000, type: 'смесь', amount: 110 });
  assert.equal(k, 'fd|1000|смесь|110');
});

test('eventKey: сон по (ts|type)', () => {
  const k = eventKey({ timestamp: 1000, type: 'night' });
  assert.equal(k, 'sl|1000|night');
});

test('itemKey: события уникальны по времени (два разных события не сливаются)', () => {
  const a = itemKey({ timestamp: 1000, title: 'Замер' });
  const b = itemKey({ timestamp: 2000, title: 'Замер' });
  assert.notEqual(a, b);
});

test('itemKey: календарь — по (date|title)', () => {
  const k = itemKey({ date: '2026-08-20', title: 'Педиатр' });
  assert.equal(k, 'cal:2026-08-20|Педиатр');
});
