import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { getDb, closeDb } from '../db/index.js';
import { PORT } from './config.js';
import { setupWebSocket, broadcast, setReplayHandler } from './ws.js';
import { handlePrompt, stopGeneration, isProcessing } from './llm.js';
import { getState, saveState, mergeState, sanitizeStateEvents } from './state.js';
import { v4 as uuid } from 'uuid';
import type { LlmMessage, ChatPreview } from '../db/schema.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

setReplayHandler((chatId: string, path: string) => {
  const db = getDb();
  if (path === '/body') {
    const rows = db.prepare('SELECT id, role, content, choices FROM llm_messages WHERE chat_id = ? ORDER BY created_at ASC').all(chatId) as Pick<LlmMessage, 'id' | 'role' | 'content' | 'choices'>[];
    return rows.map((r) => {
      let attr = '';
      if (r.choices) {
        try { const p = JSON.parse(r.choices); if (Array.isArray(p) && p.length) attr = ' data-choices="' + escapeAttr(JSON.stringify(p.map(String))) + '"'; } catch { /* ignore */ }
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
  const rows = db.prepare('SELECT id, role, content, choices FROM llm_messages WHERE chat_id = ? ORDER BY created_at ASC').all(chatId) as Pick<LlmMessage, 'id' | 'role' | 'content' | 'choices'>[];
  const messages = rows.map((r) => {
    let choices: string[] | undefined;
    if (r.choices) {
      try { const p = JSON.parse(r.choices); if (Array.isArray(p)) choices = p.map(String); } catch { /* ignore */ }
    }
    return { id: String(r.id), role: r.role, text: r.content, timestamp: 0, ...(choices && choices.length ? { choices } : {}) };
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
  const { clientId, clientSecret, prompt, model } = req.body;
  const chatId = req.params.id;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) return res.status(400).json({ error: 'Empty prompt' });
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE client_id = ? AND secret = ? AND chat_id = ?').get(clientId, clientSecret, chatId);
  if (!client) return res.status(401).json({ error: 'Invalid credentials' });
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
  const { clientId, clientSecret } = req.body;
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE client_id = ? AND secret = ? AND chat_id = ?').get(clientId, clientSecret, req.params.id);
  if (!client) return res.status(401).json({ error: 'Invalid credentials' });
  stopGeneration(req.params.id);
  res.json({ status: 'stopped' });
});

app.post('/chat/:id/undo', (req, res) => {
  const { clientId, clientSecret } = req.body;
  const chatId = req.params.id;
  const db = getDb();
  if (!db.prepare('SELECT * FROM clients WHERE client_id = ? AND secret = ? AND chat_id = ?').get(clientId, clientSecret, chatId)) return res.status(401).json({ error: 'Invalid credentials' });
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
  const { clientId, clientSecret } = req.body;
  const chatId = req.params.id;
  const db = getDb();
  if (!db.prepare('SELECT * FROM clients WHERE client_id = ? AND secret = ? AND chat_id = ?').get(clientId, clientSecret, chatId)) return res.status(401).json({ error: 'Invalid credentials' });
  const newChatId = uuid(), newClientId = uuid(), newSecret = uuid();
  db.transaction(() => {
    db.prepare('INSERT INTO chats (id, title) SELECT ?, title FROM chats WHERE id = ?').run(newChatId, chatId);
    db.prepare('INSERT INTO clients (client_id, secret, chat_id) VALUES (?, ?, ?)').run(newClientId, newSecret, newChatId);
    db.prepare('INSERT INTO llm_messages (chat_id, role, content, ui, patch, choices, created_at) SELECT ?, role, content, ui, patch, choices, created_at FROM llm_messages WHERE chat_id = ?').run(newChatId, chatId);
  })();
  res.json({ id: newChatId, clientId: newClientId, clientSecret: newSecret });
});

app.delete('/api/chats/:id', (req, res) => {
  const db = getDb();
  const { clientId, clientSecret } = req.body;
  const chatId = req.params.id;
  if (!db.prepare('SELECT * FROM clients WHERE client_id = ? AND secret = ? AND chat_id = ?').get(clientId, clientSecret, chatId)) return res.status(401).json({ error: 'Invalid credentials' });
  stopGeneration(chatId);
  db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);
  res.json({ status: 'deleted' });
});

// ─── API: Baby state (persistent app data) ──────────────────

app.get('/api/chat/:id/state', (req, res) => {
  // Открытый доступ осознанно: страница чата и так содержит все сообщения,
  // приложение однопользовательское (localhost). Защищено только удаление.
  res.json(getState(req.params.id));
});

app.post('/api/chat/:id/state', (req, res) => {
  const { clientId, clientSecret, state } = req.body;
  const chatId = req.params.id;
  const db = getDb();
  if (!db.prepare('SELECT * FROM clients WHERE client_id = ? AND secret = ? AND chat_id = ?').get(clientId, clientSecret, chatId)) return res.status(401).json({ error: 'Invalid credentials' });
  if (!state || typeof state !== 'object' || Array.isArray(state)) return res.status(400).json({ error: 'State must be an object' });
  const merged = mergeState(getState(chatId), sanitizeStateEvents(state));
  saveState(chatId, merged);
  res.json(merged);
});

app.get('/api/runtime.js', (_req, res) => sendClientFile(res, 'runtime.js'));
app.get('/api/bridge.js', (_req, res) => sendClientFile(res, 'bridge.js'));
app.get('/api/diary-ui.js', (_req, res) => sendClientFile(res, 'diary-ui.js'));
app.get('/api/chat-list.js', (_req, res) => sendClientFile(res, 'chat-list.js'));

server.listen(PORT, () => { console.log(`BabyDiary running at http://localhost:${PORT}`); });
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
