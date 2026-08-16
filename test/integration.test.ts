// Интеграционные тесты HTTP: поднимаем app на случайном порту с :memory: SQLite.
// ВАЖНО: process.env.DB_PATH ставим ДО импорта app (config.ts читает его при загрузке модуля).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';

process.env.DB_PATH = ':memory:';

let server: Server;
let base = '';
let chatId = '', clientId = '', clientSecret = '';

const j = (method: string, path: string, body?: unknown) => fetch(base + path, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

before(async () => {
  const { server: srv } = await import('../src/server/app.js');
  server = srv;
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

after(() => { server.close(); });

test('создание чата с именем + список', async () => {
  const r = await j('POST', '/api/chats', { title: 'Лёва' });
  assert.equal(r.status, 200);
  const d = await r.json();
  chatId = d.id; clientId = d.clientId; clientSecret = d.clientSecret;
  assert.ok(chatId && clientId && clientSecret);

  const list = await (await j('GET', '/api/chats')).json();
  assert.ok(Array.isArray(list));
  const mine = list.find((c: any) => c.id === chatId);
  assert.ok(mine, 'чат есть в списке');
  assert.equal(mine.title, 'Лёва', 'имя из быстрого старта стало title');
});

test('auth: state без кредов → 401, с кредами → 200', async () => {
  const noAuth = await j('GET', `/api/chat/${chatId}/state`);
  assert.equal(noAuth.status, 401);
  const withAuth = await j('GET', `/api/chat/${chatId}/state?clientId=${clientId}&clientSecret=${clientSecret}`);
  assert.equal(withAuth.status, 200);
});

test('state: POST мержит, скаляры перезаписываются', async () => {
  let r = await j('POST', `/api/chat/${chatId}/state`, { clientId, clientSecret, state: { name: 'Лёва', weight: 7200, feeds: [{ type: 'смесь', amount: 110, time: '07:30' }] } });
  assert.equal(r.status, 200);
  let st = await r.json();
  assert.equal(st.weight, 7200);
  assert.equal(st.feeds.length, 1);
  // скаляр перезаписывается
  r = await j('POST', `/api/chat/${chatId}/state`, { clientId, clientSecret, state: { weight: 7250 } });
  st = await r.json();
  assert.equal(st.weight, 7250);
  assert.equal(st.feeds.length, 1, 'массив не затирается');
});

test('state: _delete убирает запись', async () => {
  let st = await (await j('GET', `/api/chat/${chatId}/state?clientId=${clientId}&clientSecret=${clientSecret}`)).json();
  const feed = st.feeds[0];
  const r = await j('POST', `/api/chat/${chatId}/state`, { clientId, clientSecret, state: { feeds: [{ type: feed.type, amount: feed.amount, timestamp: feed.timestamp, _delete: true }] } });
  st = await r.json();
  assert.equal(st.feeds.length, 0);
});

test('undo: откатывает state из prev_state', async () => {
  // Вставляем user+agent с prev_state вручную (имитация LLM-ответа, изменившего state)
  const db = (await import('better-sqlite3')).default(':memory:') as never;
  // используем ту же БД через getDb
  const { getDb } = await import('../src/db/index.js');
  const d = getDb();
  d.prepare("INSERT INTO llm_messages (chat_id, role, content) VALUES (?, 'user', 'записала вес')").run(chatId);
  d.prepare("INSERT INTO llm_messages (chat_id, role, content, prev_state) VALUES (?, 'agent', 'ок', ?)").run(chatId, JSON.stringify({ name: 'Лёва', weight: 7000 }));
  // меняем state (как будто ответ применился)
  await j('POST', `/api/chat/${chatId}/state`, { clientId, clientSecret, state: { weight: 7100 } });
  let st = await (await j('GET', `/api/chat/${chatId}/state?clientId=${clientId}&clientSecret=${clientSecret}`)).json();
  assert.equal(st.weight, 7100);
  const r = await j('POST', `/chat/${chatId}/undo`, { clientId, clientSecret });
  assert.equal(r.status, 200);
  st = await (await j('GET', `/api/chat/${chatId}/state?clientId=${clientId}&clientSecret=${clientSecret}`)).json();
  assert.equal(st.weight, 7000, 'undo вернул prev_state');
});

test('snapshot: копирует чат, сообщения и state', async () => {
  const r = await j('POST', `/chat/${chatId}/snapshot`, { clientId, clientSecret });
  assert.equal(r.status, 200);
  const snap = await r.json();
  assert.ok(snap.id && snap.clientId && snap.clientSecret);
  const st = await (await j('GET', `/api/chat/${snap.id}/state?clientId=${snap.clientId}&clientSecret=${snap.clientSecret}`)).json();
  assert.equal(st.name, 'Лёва');
  assert.equal(st.weight, 7000);
});

test('rename: PATCH меняет title', async () => {
  const r = await j('PATCH', `/api/chats/${chatId}`, { clientId, clientSecret, title: 'Лёва-малыш' });
  assert.equal(r.status, 200);
  const list = await (await j('GET', '/api/chats')).json();
  assert.equal(list.find((c: any) => c.id === chatId).title, 'Лёва-малыш');
});

test('invite: одноразовый токен выдаёт креды нового клиента', async () => {
  const inv = await (await j('POST', `/api/chat/${chatId}/invite`, { clientId, clientSecret })).json();
  assert.ok(inv.url && inv.url.startsWith('/join/'));
  const token = inv.url.replace('/join/', '');
  const joinR = await j('GET', `/api/join/${token}`);
  assert.equal(joinR.status, 200);
  const jd = await joinR.json();
  assert.equal(jd.chatId, chatId);
  // новый клиент читает state
  const st = await (await j('GET', `/api/chat/${chatId}/state?clientId=${jd.clientId}&clientSecret=${jd.clientSecret}`)).json();
  assert.equal(st.name, 'Лёва');
  // токен одноразовый
  const reuse = await j('GET', `/api/join/${token}`);
  assert.equal(reuse.status, 404);
});

test('export: отдаёт zip с state.json', async () => {
  const r = await fetch(base + `/api/chat/${chatId}/export?clientId=${clientId}&clientSecret=${clientSecret}`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'application/zip');
  const buf = Buffer.from(await r.arrayBuffer());
  assert.ok(buf.length > 50);
  assert.equal(buf.subarray(0, 2).toString('ascii'), 'PK', 'zip-сигнатура');
});

test('delete: удаляет чат', async () => {
  const r = await j('DELETE', `/api/chats/${chatId}`, { clientId, clientSecret });
  assert.equal(r.status, 200);
  const list = await (await j('GET', '/api/chats')).json();
  assert.ok(!list.some((c: any) => c.id === chatId));
});
