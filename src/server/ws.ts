import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { getDb } from '../db/index.js';

type Subscriber = { ws: WebSocket; chatId: string; path: string };
const subscribers: Subscriber[] = [];
let onReplay: ((chatId: string, path: string) => string | null) | null = null;

export function setReplayHandler(handler: (chatId: string, path: string) => string | null): void {
  onReplay = handler;
}

function chatIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try { const match = url.match(/\/chat\/([^/]+)\/socket/); return match ? match[1] : null; }
  catch { return null; }
}

/** Креденшелы в query сокета: /chat/<id>/socket?clientId=...&clientSecret=... */
function credsFromUrl(url: string | undefined): { clientId: string; clientSecret: string } {
  const out = { clientId: '', clientSecret: '' };
  if (!url) return out;
  try {
    const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    for (const part of q.split('&')) {
      const [k, v] = part.split('=');
      if (k === 'clientId') out.clientId = decodeURIComponent(v || '');
      if (k === 'clientSecret') out.clientSecret = decodeURIComponent(v || '');
    }
  } catch { /* ок */ }
  return out;
}

function isAuthed(chatId: string, creds: { clientId: string; clientSecret: string }): boolean {
  if (!creds.clientId || !creds.clientSecret) return false;
  try {
    const db = getDb();
    return !!db.prepare('SELECT 1 FROM clients WHERE client_id = ? AND secret = ? AND chat_id = ?').get(creds.clientId, creds.clientSecret, chatId);
  } catch { return false; }
}

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const chatId = chatIdFromUrl(req.url) || 'unknown';
    // Без валидных креденшелов сокет не подключается: сообщения и state чата — персональные данные.
    if (!isAuthed(chatId, credsFromUrl(req.url))) {
      ws.close(4001, 'unauthorized');
      return;
    }
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && msg.path) {
          for (let i = subscribers.length - 1; i >= 0; i--) {
            if (subscribers[i].ws === ws && subscribers[i].path === msg.path) { subscribers.splice(i, 1); }
          }
          subscribers.push({ ws, chatId, path: msg.path });
          if (onReplay) {
            const replay = onReplay(chatId, msg.path);
            if (replay && ws.readyState === WebSocket.OPEN) { ws.send(replay); }
          }
        }
      } catch { /* ignore */ }
    });
    ws.on('close', () => {
      for (let i = subscribers.length - 1; i >= 0; i--) { if (subscribers[i].ws === ws) { subscribers.splice(i, 1); } }
    });
  });
}

export function broadcast(chatId: string, path: string, data: string): void {
  for (const sub of subscribers) {
    if (sub.chatId === chatId && sub.path === path && sub.ws.readyState === WebSocket.OPEN) {
      try { sub.ws.send(data); } catch { /* closed */ }
    }
  }
}
