import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { getDb, closeDb } from '../db/index.js';
import { PORT } from './config.js';
import { setupWebSocket, broadcast, setReplayHandler } from './ws.js';
import { handlePrompt, stopGeneration, isProcessing } from './llm.js';
import { getState, saveState, mergeState, sanitizeStateEvents } from './state.js';
import { requireClient, checkClient } from './auth.js';
import { getWeather } from './weather.js';
import { savePhoto, readMedia, prunePhotos, ingestMedia, queueFor, trimQueue, chatPhotoDir, restoreMediaQueue } from './photos.js';
import { v4 as uuid } from 'uuid';
import type { LlmMessage, ChatPreview } from '../db/schema.js';
import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const app = express();
// Лимит 12 МБ: фотографии идут base64 в JSON (express.json по умолчанию режет на 100kb → 413)
app.use(express.json({ limit: '12mb' }));

const server = http.createServer(app);
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
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Baby Diary</title></head><body><script src="/api/chat-list.js"></script></body></html>`;
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

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Baby Diary</title></head><body><script>window.__CHAT_ID__='${chatId}';</script><script>window.__CHAT_THINKING__=${thinking};</script><script>window.__INITIAL_MESSAGES__=${JSON.stringify(messages).replace(/<\//g, '<\\/')};</script><script src="/api/runtime.js"></script><script src="/api/bridge.js"></script><script src="/api/diary-ui.js"></script></body></html>`;
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

app.post('/api/chats', (_req, res) => {
  const db = getDb();
  const chatId = uuid(), clientId = uuid(), secret = uuid();
  db.transaction(() => {
    db.prepare('INSERT INTO chats (id, title) VALUES (?, ?)').run(chatId, 'Baby Diary');
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
  res.json({ status: 'processing' });

  handlePrompt(chatId, prompt, model, (type, data) => {
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
  const lastAgent = db.prepare('SELECT id FROM llm_messages WHERE chat_id = ? AND role = ? ORDER BY id DESC LIMIT 1').get(chatId, 'agent') as LlmMessage | undefined;
  let agentId: number | null = null, userId: number | null = null;
  if (lastAgent) {
    const lastUser = db.prepare('SELECT id FROM llm_messages WHERE chat_id = ? AND role = ? AND id < ? ORDER BY id DESC LIMIT 1').get(chatId, 'user', lastAgent.id) as LlmMessage | undefined;
    agentId = lastAgent.id;
    if (lastUser) userId = lastUser.id;
    db.prepare('DELETE FROM llm_messages WHERE id = ?').run(lastAgent.id);
    if (lastUser) db.prepare('DELETE FROM llm_messages WHERE id = ?').run(lastUser.id);
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
    db.prepare('INSERT INTO llm_messages (chat_id, role, content, ui, patch, choices, created_at) SELECT ?, role, content, ui, patch, choices, created_at FROM llm_messages WHERE chat_id = ?').run(newChatId, chatId);
  })();
  res.json({ id: newChatId, clientId: newClientId, clientSecret: newSecret });
});

app.delete('/api/chats/:id', (req, res) => {
  const chatId = req.params.id;
  if (!checkClient(req, chatId)) return res.status(401).json({ error: 'Invalid credentials' });
  const db = getDb();
  stopGeneration(chatId);
  db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);
  res.json({ status: 'deleted' });
});

// ─── API: Baby state (persistent app data) ──────────────────

app.get('/api/chat/:id/state', requireClient, (req, res) => {
  // Доступ только с креденшелами чата (query: clientId/clientSecret) —
  // state содержит персональные данные ребёнка и GPS фото.
  res.json(getState(req.params.id));
});

// Погода (Open-Meteo, без ключа): ?city=Москва — геокодинг + текущая погода + 8 дней
app.get('/api/weather', requireClient, async (req, res) => {
  const city = String(req.query.city || '').trim();
  if (!city) return res.status(400).json({ error: 'city required' });
  try {
    res.json(await getWeather(city));
  } catch (e) {
    res.status(404).json({ error: String((e as Error).message || e) });
  }
});

app.post('/api/chat/:id/state', requireClient, (req, res) => {
  const { state } = req.body;
  const chatId = req.params.id;
  const db = getDb();
  if (!state || typeof state !== 'object' || Array.isArray(state)) return res.status(400).json({ error: 'State must be an object' });
  const prev = getState(chatId);
  const merged = mergeState(prev, sanitizeStateEvents(state));
  saveState(chatId, merged);
  // Чистка файлов фото, удалённых из state (маркеры _delete)
  const kept = new Set<string>((Array.isArray(merged.photos) ? merged.photos : []).map((p: any) => String(p.id || '')));
  prunePhotos(chatId, kept);
  // Разослать обновление по WS — иначе другие вкладки не узнают об изменениях (галерея, аватарка)
  broadcast(chatId, '/chat/state', JSON.stringify({ path: '/chat/state', type: 'state', state: merged }));
  res.json(merged);
});

// Загрузка фотографии (base64 JPEG, уже обработанной на клиенте: ресайз + EXIF-ориентация)
app.post('/api/chat/:id/photo', requireClient, (req, res) => {
  const { data, desc } = req.body;
  const chatId = req.params.id;
  const db = getDb();
  if (typeof data !== 'string' || !data) return res.status(400).json({ error: 'data required' });
  const id = uuid().slice(0, 8);
  try {
    savePhoto(chatId, id, data);
  } catch (e) {
    return res.status(400).json({ error: String((e as Error).message || e) });
  }
  // EXIF-метаданные (дата съёмки, GPS) — валидируем и храним в записи фото
  let exif: unknown = undefined;
  if (req.body.exif && typeof req.body.exif === 'object') {
    const e = req.body.exif as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};
    if (typeof e.taken === 'string' && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}/.test(e.taken)) cleaned.taken = e.taken.slice(0, 19);
    if (e.gps && typeof e.gps === 'object') {
      const g = e.gps as Record<string, unknown>;
      if (typeof g.lat === 'number' && typeof g.lon === 'number' && isFinite(g.lat) && isFinite(g.lon) &&
          Math.abs(g.lat) <= 90 && Math.abs(g.lon) <= 180) cleaned.gps = { lat: g.lat, lon: g.lon };
    }
    if (Object.keys(cleaned).length) exif = cleaned;
  }
  const photo = { id, desc: typeof desc === 'string' && desc.trim() ? desc.trim().slice(0, 500) : '', ts: Date.now(), exif };
  const merged = mergeState(getState(chatId), { photos: [photo] });
  saveState(chatId, merged);
  // Другие вкладки тоже должны увидеть новое фото
  broadcast(chatId, '/chat/state', JSON.stringify({ path: '/chat/state', type: 'state', state: merged }));
  res.json(photo);
});

// Отдача медиа (фото/видео) и превью: /api/photo/<chatId>/<id>[?th=1]
app.get('/api/photo/:chatId/:id', requireClient, (req, res) => {
  const m = readMedia(req.params.chatId, req.params.id, req.query.th === '1');
  if (!m) return res.status(404).json({ error: 'not found' });
  res.set('Content-Type', m.mime);
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(m.buf);
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
async function processMediaQueue(chatId: string): Promise<void> {
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
          if (typeof metaJson.exif.taken === 'string' && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}/.test(metaJson.exif.taken)) exif.taken = metaJson.exif.taken.slice(0, 19);
          const g = metaJson.exif.gps;
          if (g && typeof g.lat === 'number' && typeof g.lon === 'number' && isFinite(g.lat) && isFinite(g.lon) && Math.abs(g.lat) <= 90 && Math.abs(g.lon) <= 180) exif.gps = { lat: g.lat, lon: g.lon };
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

server.listen(PORT, () => {
  console.log(`BabyDiary running at http://localhost:${PORT}`);
  // Догнать незавершённые конвертации после рестарта (очередь восстанавливается из .tmp-файлов)
  for (const chatId of restoreMediaQueue()) void processMediaQueue(chatId);
});
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('\nShutting down...');
  wss.close(); server.close(); closeDb(); process.exit(0);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
