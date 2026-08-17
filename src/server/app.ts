// Приложение (роуты) без server.listen — вынесено из index.ts для интеграционных тестов
// и чистого разделения «конфигурация приложения / запуск сервера».
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { getDb } from '../db/index.js';
import { DEEPSEEK_MODEL, DEEPSEEK_FLASH_MODEL } from './config.js';
import { isModelAllowed, getAvailableModels, defaultModel } from './models.js';
import { setupWebSocket, broadcast, setReplayHandler } from './ws.js';
import { handlePrompt, stopGeneration, isProcessing } from './llm.js';
import { getState, saveState, mergeState, sanitizeStateEvents } from './state.js';
import { requireClient, checkClient } from './auth.js';
import { getWeather } from './weather.js';
import { mediaFileInfo, prunePhotos, ingestMedia, queueFor, trimQueue, chatPhotoDir, restoreMediaQueue } from './photos.js';
import { exportChatZip, dailyBackup } from './backup.js';
import { v4 as uuid } from 'uuid';
import type { LlmMessage, ChatPreview } from '../db/schema.js';
import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync, cpSync, rmSync, createReadStream } from 'fs';
import { join } from 'path';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const app = express();
// Лимит 12 МБ: фотографии идут base64 в JSON (express.json по умолчанию режет на 100kb → 413)
app.use(express.json({ limit: '12mb' }));

export const server = http.createServer(app);
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

setReplayHandler((chatId: string, path: string) => {
  const db = getDb();
  if (path === '/body') {
    const rows = db.prepare('SELECT id, role, content, choices, multi FROM llm_messages WHERE chat_id = ? ORDER BY created_at ASC').all(chatId) as Pick<LlmMessage, 'id' | 'role' | 'content' | 'choices' | 'multi'>[];
    return rows.map((r) => {
      let attr = '';
      if (r.choices) {
        try { const p = JSON.parse(r.choices); if (Array.isArray(p) && p.length) attr = ' data-choices="' + escapeAttr(JSON.stringify(p.map(String))) + '"' + (r.multi ? ' data-multi="1"' : ''); } catch { /* ignore */ }
      }
      return `<div class="message message-${r.role}"${attr}>${escapeHtml(r.content)}</div>`;
    }).join('\n');
  }
  return null;
});

function sendClientFile(res: express.Response, filename: string) {
  const filePath = resolve(__dirname, '..', '..', 'dist', 'client', filename);
  if (existsSync(filePath)) { res.type('application/javascript').send(readFileSync(filePath, 'utf-8')); }
  else { res.status(404).send('// not found'); }
}

function indexHtml() {
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"><meta name="theme-color" content="#e8622a"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon.svg"><title>Baby Diary</title></head><body><script src="/api/chat-list.js"></script></body></html>`;
}

function appHtml(chatId: string) {
  const db = getDb();
  const rows = db.prepare('SELECT id, role, content, choices, multi FROM llm_messages WHERE chat_id = ? ORDER BY created_at ASC').all(chatId) as Pick<LlmMessage, 'id' | 'role' | 'content' | 'choices' | 'multi'>[];
  const messages = rows.map((r) => {
  let choices: string[] | undefined;
  if (r.choices) {
    try { const p = JSON.parse(r.choices); if (Array.isArray(p)) choices = p.map(String); } catch { /* ignore */ }
  }
  return { id: String(r.id), role: r.role, text: r.content, timestamp: 0, ...(choices && choices.length ? { choices } : {}), ...(r.multi ? { multi: true } : {}) };
  });
  const chat = db.prepare('SELECT thinking FROM chats WHERE id = ?').get(chatId) as { thinking: number } | undefined;
  const thinking = chat?.thinking === 1;

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"><meta name="theme-color" content="#e8622a"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon.svg"><title>Baby Diary</title></head><body><script>window.__CHAT_ID__='${chatId}';</script><script>window.__CHAT_THINKING__=${thinking};</script><script>window.__INITIAL_MESSAGES__=${JSON.stringify(messages).replace(/<\//g, '<\\/')};</script><script src="/api/runtime.js"></script><script src="/api/bridge.js"></script><script src="/api/diary-ui.js"></script></body></html>`;
}

app.get('/', (_req, res) => { res.send(indexHtml()); });

app.get('/chat/:id', (req, res) => {
  const db = getDb();
  const chat = db.prepare('SELECT id FROM chats WHERE id = ?').get(req.params.id);
  if (!chat) return res.status(404).send('Chat not found');
  res.send(appHtml(req.params.id));
});

app.get('/api/chats', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(
    `SELECT c.id, c.title, c.created_at as createdAt,
      (SELECT content FROM llm_messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as lastMessage,
      (SELECT role FROM llm_messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as lastRole,
      (SELECT COUNT(*) FROM llm_messages WHERE chat_id = c.id) as messageCount,
      (SELECT MAX(created_at) FROM llm_messages WHERE chat_id = c.id) as updatedAt
    FROM chats c ORDER BY updatedAt DESC, c.created_at DESC`
  ).all() as ChatPreview[];

  res.json(rows.map((r) => ({
    id: r.id, title: r.title, lastMessage: r.lastMessage || null,
    lastRole: r.lastRole || null, messageCount: r.messageCount,
    createdAt: r.createdAt, updatedAt: r.updatedAt || r.createdAt,
  })));
});

// Список доступных моделей для селекта в чате (зависит от ключей в .env).
// Открытый endpoint: имена моделей не персональны (как weather).
app.get('/api/models', (_req, res) => {
  res.json({ models: getAvailableModels(), default: defaultModel() });
});

app.post('/api/chats', (req, res) => {
  const db = getDb();
  // Быстрый старт: имя малыша сразу становится названием дневника (иначе в списке одни «Baby Diary»)
  const title = req.body && typeof (req.body as Record<string, unknown>).title === 'string'
    ? ((req.body as Record<string, unknown>).title as string).trim().slice(0, 80) : '';
  const chatId = uuid(), clientId = uuid(), secret = uuid();
  db.transaction(() => {
    db.prepare('INSERT INTO chats (id, title) VALUES (?, ?)').run(chatId, title || 'Baby Diary');
    db.prepare('INSERT INTO clients (client_id, secret, chat_id) VALUES (?, ?, ?)').run(clientId, secret, chatId);
  })();
  res.json({ id: chatId, clientId, clientSecret: secret });
});

app.post('/chat/:id/prompt', (req, res) => {
  const { prompt, model } = req.body;
  const chatId = req.params.id;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) return res.status(400).json({ error: 'Empty prompt' });
  if (!checkClient(req, chatId)) return res.status(401).json({ error: 'Invalid credentials' });
  if (isProcessing(chatId)) return res.status(429).json({ error: 'Already processing' });
  // Модель — только из доступного списка (клиент не должен слать произвольную строку)
  const safeModel = typeof model === 'string' && isModelAllowed(model) ? model : undefined;
  res.json({ status: 'processing' });

  handlePrompt(chatId, prompt, safeModel, (type, data) => {
    switch (type) {
      case 'user-bubble': broadcast(chatId, '/body', data as string); break;
      case 'thinking': broadcast(chatId, '/chat/stream', JSON.stringify({ path: '/chat/stream', type: 'thinking', value: data })); break;
      case 'stream': broadcast(chatId, '/chat/stream', JSON.stringify({ path: '/chat/stream', type: 'chunk', content: data })); break;
      case 'update': broadcast(chatId, '/body', data as string); break;
      case 'state': broadcast(chatId, '/chat/state', JSON.stringify({ path: '/chat/state', type: 'state', state: data })); break;
      case 'done': broadcast(chatId, '/chat/stream', JSON.stringify({ path: '/chat/stream', type: 'done' })); break;
      case 'fallback': broadcast(chatId, '/body', '<div class="message message-agent">Что-то пошло не так. Попробуйте ещё раз.</div>'); broadcast(chatId, '/chat/stream', JSON.stringify({ path: '/chat/stream', type: 'done' })); break;
    }
  }).catch(() => {
    broadcast(chatId, '/body', '<div class="message message-agent">Что-то пошло не так. Попробуйте ещё раз.</div>');
    broadcast(chatId, '/chat/stream', JSON.stringify({ path: '/chat/stream', type: 'done' }));
  });
});

app.post('/chat/:id/stop', (req, res) => {
  const chatId = req.params.id;
  if (!checkClient(req, chatId)) return res.status(401).json({ error: 'Invalid credentials' });
  stopGeneration(chatId);
  res.json({ status: 'stopped' });
});

app.post('/chat/:id/undo', (req, res) => {
  const chatId = req.params.id;
  if (!checkClient(req, chatId)) return res.status(401).json({ error: 'Invalid credentials' });
  const db = getDb();
  const lastAgent = db.prepare('SELECT id, prev_state FROM llm_messages WHERE chat_id = ? AND role = ? ORDER BY id DESC LIMIT 1').get(chatId, 'agent') as Pick<LlmMessage, 'id' | 'prev_state'> | undefined;
  let agentId: number | null = null, userId: number | null = null;
  if (lastAgent) {
    const lastUser = db.prepare('SELECT id FROM llm_messages WHERE chat_id = ? AND role = ? AND id < ? ORDER BY id DESC LIMIT 1').get(chatId, 'user', lastAgent.id) as LlmMessage | undefined;
    agentId = lastAgent.id;
    if (lastUser) userId = lastUser.id;
    db.prepare('DELETE FROM llm_messages WHERE id = ?').run(lastAgent.id);
    if (lastUser) db.prepare('DELETE FROM llm_messages WHERE id = ?').run(lastUser.id);
    // Откат state к виду до этого ответа (если ответ менял дневник)
    if (typeof lastAgent.prev_state === 'string' && lastAgent.prev_state) {
      try {
        const restored = JSON.parse(lastAgent.prev_state) as Record<string, unknown>;
        saveState(chatId, restored);
        // Убрать файлы фото, которых больше нет в откаченном state (иначе осиротеют на диске)
        if (Array.isArray(restored.photos)) {
          prunePhotos(chatId, new Set<string>(restored.photos.map((p: any) => String(p.id || ''))));
        }
        broadcast(chatId, '/chat/state', JSON.stringify({ path: '/chat/state', type: 'state', state: restored }));
      } catch { /* битый снапшот — state не трогаем */ }
    }
  }
  broadcast(chatId, '/body', JSON.stringify({ path: '/body', type: 'undo', agentId, userId }));
  res.json({ status: 'ok' });
});

app.post('/chat/:id/snapshot', (req, res) => {
  const chatId = req.params.id;
  if (!checkClient(req, chatId)) return res.status(401).json({ error: 'Invalid credentials' });
  const db = getDb();
  const newChatId = uuid(), newClientId = uuid(), newSecret = uuid();
  db.transaction(() => {
    db.prepare('INSERT INTO chats (id, title) SELECT ?, title FROM chats WHERE id = ?').run(newChatId, chatId);
    db.prepare('INSERT INTO clients (client_id, secret, chat_id) VALUES (?, ?, ?)').run(newClientId, newSecret, newChatId);
    db.prepare('INSERT INTO llm_messages (chat_id, role, content, ui, patch, choices, multi, prev_state, created_at) SELECT ?, role, content, ui, patch, choices, multi, prev_state, created_at FROM llm_messages WHERE chat_id = ?').run(newChatId, chatId);
    // Дневник (baby_state) — снимок должен копировать и его, иначе «снимок» теряет все данные
    const st = getState(chatId);
    if (Object.keys(st).length) saveState(newChatId, st);
  })();
  // Фото/видео чата на диске — копируем в каталог нового чата
  const srcDir = chatPhotoDir(chatId);
  if (existsSync(srcDir)) {
    try { cpSync(srcDir, chatPhotoDir(newChatId), { recursive: true }); } catch (e) { console.error('snapshot copy photos failed:', e); }
  }
  res.json({ id: newChatId, clientId: newClientId, clientSecret: newSecret });
});

app.delete('/api/chats/:id', (req, res) => {
  const chatId = req.params.id;
  if (!checkClient(req, chatId)) return res.status(401).json({ error: 'Invalid credentials' });
  const db = getDb();
  stopGeneration(chatId);
  db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);
  // Медиа на диске и очередь обработки — иначе файлы/хвосты остаются после удаления дневника
  const dir = chatPhotoDir(chatId);
  if (existsSync(dir)) { try { rmSync(dir, { recursive: true, force: true }); } catch { /* ок */ } }
  queueFor(chatId).length = 0;
  res.json({ status: 'deleted' });
});

// Переименование дневника (два «Baby Diary» в списке не отличить — имя ребёнка как title)
app.patch('/api/chats/:id', (req, res) => {
  const chatId = req.params.id;
  if (!checkClient(req, chatId)) return res.status(401).json({ error: 'Invalid credentials' });
  const { title } = req.body;
  const t = typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : '';
  if (!t) return res.status(400).json({ error: 'Title required' });
  getDb().prepare('UPDATE chats SET title = ? WHERE id = ?').run(t, chatId);
  res.json({ status: 'ok', title: t });
});

// ─── Семейный доступ: одноразовое приглашение выдаёт креды нового клиента ───
app.post('/api/chat/:id/invite', requireClient, (req, res) => {
  const chatId = req.params.id;
  const db = getDb();
  // чистим протухшие
  db.prepare('DELETE FROM invites WHERE expires_at < ?').run(Date.now());
  const token = uuid().replace(/-/g, '').slice(0, 24);
  db.prepare('INSERT INTO invites (token, chat_id, expires_at) VALUES (?, ?, ?)').run(token, chatId, Date.now() + 7 * 86400000);
  res.json({ url: '/join/' + token });
});

// Одноразовый join: выдаёт креды нового клиента для чата приглашения
app.get('/api/join/:token', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT chat_id, expires_at FROM invites WHERE token = ?').get(req.params.token) as { chat_id: string; expires_at: number } | undefined;
  if (!row) return res.status(404).json({ error: 'Invite not found' });
  if (row.expires_at < Date.now()) { db.prepare('DELETE FROM invites WHERE token = ?').run(req.params.token); return res.status(410).json({ error: 'Invite expired' }); }
  const newClientId = uuid(), newSecret = uuid();
  db.transaction(() => {
    db.prepare('INSERT INTO clients (client_id, secret, chat_id) VALUES (?, ?, ?)').run(newClientId, newSecret, row.chat_id);
    db.prepare('DELETE FROM invites WHERE token = ?').run(req.params.token); // одноразовый
  })();
  res.json({ chatId: row.chat_id, clientId: newClientId, clientSecret: newSecret });
});

// ─── API: Baby state (persistent app data) ──────────────────

app.get('/api/chat/:id/state', requireClient, (req, res) => {
  // Доступ только с креденшелами чата (query: clientId/clientSecret) —
  // state содержит персональные данные ребёнка и GPS фото.
  res.json(getState(req.params.id));
});

// Погода (Open-Meteo, без ключа): ?city=Москва — геокодинг + текущая погода + 8 дней.
// Открытый endpoint (город + прогноз — публичные данные, персонального нет), но с rate-limit,
// чтобы нельзя было бесконечно долбить внешний API через сервер.
const weatherHits = new Map<string, { n: number; ts: number }>();
const WEATHER_RATE_LIMIT = 60; // запросов в минуту на IP
app.get('/api/weather', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  // Периодическая очистка устаревших счётчиков (Map не должен расти вечно)
  if (weatherHits.size > 2000) {
    for (const [k, v] of weatherHits) if (now - v.ts > 60000) weatherHits.delete(k);
  }
  const hit = weatherHits.get(ip);
  if (!hit || now - hit.ts > 60000) weatherHits.set(ip, { n: 1, ts: now });
  else {
    hit.n++;
    if (hit.n > WEATHER_RATE_LIMIT) return res.status(429).json({ error: 'too many requests' });
  }
  const city = String(req.query.city || '').trim();
  if (!city) return res.status(400).json({ error: 'city required' });
  getWeather(city)
    .then((w) => res.json(w))
    .catch((e) => res.status(404).json({ error: String((e as Error).message || e) }));
});

app.post('/api/chat/:id/state', requireClient, (req, res) => {
  const { state } = req.body;
  const chatId = req.params.id;
  const db = getDb();
  if (!state || typeof state !== 'object' || Array.isArray(state)) return res.status(400).json({ error: 'State must be an object' });
  const prev = getState(chatId);
  const merged = mergeState(prev, sanitizeStateEvents(state));
  saveState(chatId, merged);
  // Чистка файлов фото, удалённых из state (маркеры _delete).
  // ВАЖНО: если photos в merged — НЕ массив (LLM-дрейф), чистку НЕ делаем:
  // иначе kept пуст и prunePhotos сотрёт всю галерею.
  if (Array.isArray(merged.photos)) {
    const kept = new Set<string>(merged.photos.map((p: any) => String(p.id || '')));
    prunePhotos(chatId, kept);
  }
  // Разослать обновление по WS — иначе другие вкладки не узнают об изменениях (галерея, аватарка)
  broadcast(chatId, '/chat/state', JSON.stringify({ path: '/chat/state', type: 'state', state: merged }));
  res.json(merged);
});

// Отдача медиа (фото/видео) и превью: /api/photo/<chatId>/<id>[?th=1]
// Стрим с Range (Accept-Ranges) — видео можно перематывать, файл не грузится в память целиком.
app.get('/api/photo/:chatId/:id', requireClient, (req, res) => {
  const info = mediaFileInfo(req.params.chatId, req.params.id, req.query.th === '1');
  if (!info) return res.status(404).json({ error: 'not found' });
  res.set('Content-Type', info.mime);
  res.set('Accept-Ranges', 'bytes');
  res.set('Cache-Control', 'public, max-age=86400');
  const range = req.headers.range;
  let start = 0, end = info.size - 1, partial = false;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
    if (m && (m[1] || m[2])) {
      const s = m[1] ? parseInt(m[1], 10) : NaN;
      const e = m[2] ? parseInt(m[2], 10) : NaN;
      if (!isNaN(s)) start = Math.max(0, Math.min(s, info.size - 1));
      if (!isNaN(e)) end = Math.max(start, Math.min(e, info.size - 1));
      else end = info.size - 1;
      if (start > end) { res.status(416).set('Content-Range', `bytes */${info.size}`).end(); return; }
      partial = true;
      res.status(206);
      res.set('Content-Range', `bytes ${start}-${end}/${info.size}`);
    }
  }
  res.set('Content-Length', String(end - start + 1));
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = createReadStream(info.path, { start, end });
  stream.on('error', () => { if (!res.headersSent) res.status(404).json({ error: 'not found' }); else res.destroy(); });
  stream.pipe(res);
});

// Скачивание архива дневника: state.json (без GPS) + все фото/видео — единым zip
app.get('/api/chat/:id/export', requireClient, (req, res) => {
  const chatId = req.params.id;
  try {
    const zip = exportChatZip(chatId);
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename="babydiary-${chatId.slice(0, 8)}.zip"`);
    res.send(zip);
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message || e) });
  }
});

// Загрузка медиа бинарём: файл сразу ставится в ОЧЕРЕДЬ обработки (ответ мгновенный),
// конвертация/сохранение идут в фоне последовательно; прогресс — WS '/media-queue'.
app.post('/api/chat/:id/media', requireClient, (req, res) => {
  const chatId = req.params.id;
  const kind: 'photo' | 'video' = String(req.headers['x-kind'] || 'photo') === 'video' ? 'video' : 'photo';
  let fileName = String(req.headers['x-file-name'] || (kind === 'video' ? 'video.mp4' : 'photo.jpg'));
  try { fileName = decodeURIComponent(fileName); } catch { /* ок */ }
  let desc = '';
  try { desc = decodeURIComponent(String(req.headers['x-desc'] || '')); } catch { /* ок */ }
  let exif: any = null;
  try {
    const raw = String(req.headers['x-exif'] || '');
    if (raw) exif = JSON.parse(decodeURIComponent(raw));
  } catch { /* ок */ }
  const MAX = 512 * 1024 * 1024;
  const chunks: Buffer[] = [];
  let size = 0;
  req.on('data', (c: Buffer) => {
    size += c.length;
    if (size > MAX) { req.destroy(); return; }
    chunks.push(c);
  });
  req.on('error', () => { if (!res.headersSent) res.status(400).json({ error: 'body too large' }); });
  req.on('end', () => {
    try {
      if (!chunks.length) return res.status(400).json({ error: 'empty body' });
      const id = uuid().slice(0, 8);
      const dir = chatPhotoDir(chatId);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, '.tmp-' + id + '.bin'), Buffer.concat(chunks));
      writeFileSync(join(dir, '.tmp-' + id + '.meta.json'), JSON.stringify({ fileName, kind, desc, exif }));
      queueFor(chatId).push({ id, fileName, kind, status: 'queued', pct: 0 });
      broadcastQueue(chatId);
      res.json({ id, queued: true });
      void processMediaQueue(chatId);
    } catch (e) {
      console.error('media enqueue failed:', e);
      if (!res.headersSent) res.status(400).json({ error: String((e as Error).message || e) });
    }
  });
});

// Текущая очередь обработки (для восстановления UI после перезагрузки страницы)
app.get('/api/chat/:id/media-queue', requireClient, (req, res) => {
  const chatId = req.params.id;
  res.json({ items: queueFor(chatId) });
});

function broadcastQueue(chatId: string): void {
  broadcast(chatId, '/media-queue', JSON.stringify({ path: '/media-queue', type: 'queue', items: queueFor(chatId) }));
}

const processingChats = new Set<string>();

/** Последовательная обработка очереди чата: ffmpeg-конвертация/сохранение → запись в state. */
export async function processMediaQueue(chatId: string): Promise<void> {
  if (processingChats.has(chatId)) return;
  processingChats.add(chatId);
  try {
    const q = queueFor(chatId);
    const dir = chatPhotoDir(chatId);
    for (const item of q) {
      if (item.status === 'done' || item.status === 'error') continue;
      item.status = 'processing';
      item.pct = 0;
      broadcastQueue(chatId);
      const binPath = join(dir, '.tmp-' + item.id + '.bin');
      const metaPath = join(dir, '.tmp-' + item.id + '.meta.json');
      try {
        let metaJson: any = {};
        try { metaJson = JSON.parse(readFileSync(metaPath, 'utf8')); } catch { /* ок */ }
        const meta = await ingestMedia(chatId, item.id, readFileSync(binPath), item.fileName, item.kind, (pct) => {
          item.pct = pct;
          broadcastQueue(chatId);
        });
        const rec: Record<string, unknown> = { id: item.id, desc: String(metaJson.desc || '').trim().slice(0, 500), ts: Date.now() };
        if (item.kind === 'video') {
          rec.type = 'video';
          if (meta.duration) rec.duration = meta.duration;
        }
        const exif: Record<string, unknown> = {};
        if (metaJson.exif && typeof metaJson.exif === 'object') {
          // GPS не сохраняем — см. /api/chat/:id/photo (приватность геолокации)
          if (typeof metaJson.exif.taken === 'string' && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}/.test(metaJson.exif.taken)) exif.taken = metaJson.exif.taken.slice(0, 19);
        }
        if (item.kind === 'video' && meta.taken) exif.taken = meta.taken;
        if (Object.keys(exif).length) rec.exif = exif;
        const merged = mergeState(getState(chatId), { photos: [rec] });
        saveState(chatId, merged);
        broadcast(chatId, '/chat/state', JSON.stringify({ path: '/chat/state', type: 'state', state: merged }));
        item.status = 'done';
        item.pct = 100;
        try { unlinkSync(binPath); unlinkSync(metaPath); } catch { /* ок */ }
      } catch (e) {
        console.error('media process failed:', item.id, e);
        item.status = 'error';
      }
      broadcastQueue(chatId);
    }
    trimQueue(chatId);
  } finally {
    processingChats.delete(chatId);
  }
}

app.get('/api/runtime.js', (_req, res) => sendClientFile(res, 'runtime.js'));
app.get('/api/bridge.js', (_req, res) => sendClientFile(res, 'bridge.js'));
app.get('/api/diary-ui.js', (_req, res) => sendClientFile(res, 'diary-ui.js'));
app.get('/api/chat-list.js', (_req, res) => sendClientFile(res, 'chat-list.js'));

// ─── PWA: manifest + service worker ───
app.get('/manifest.webmanifest', (_req, res) => {
  res.type('application/manifest+json').send(JSON.stringify({
    name: 'Baby Diary',
    short_name: 'BabyDiary',
    description: 'Дневник малыша с LLM-помощником',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f5f0',
    theme_color: '#e8622a',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }));
});
app.get('/icon.svg', (_req, res) => {
  res.type('image/svg+xml').send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="36" fill="#e8622a"/><text x="96" y="124" font-size="96" text-anchor="middle" dominant-baseline="middle">👶</text></svg>`);
});
app.get('/sw.js', (_req, res) => {
  res.type('application/javascript').send(`
const CACHE = 'babydiary-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/api/runtime.js', '/api/bridge.js', '/api/diary-ui.js', '/api/chat-list.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // API — только сеть (данные живые; офлайн-чтение state решает клиент своим кэшем)
  if (url.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok && url.origin === location.origin) { const clone = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, clone)); }
    return r;
  })));
});
`);
});

export { wss };

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
