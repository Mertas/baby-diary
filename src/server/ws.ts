import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { getDb } from '../db/index.js';
import { credsFromRequest } from './auth.js';

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

function isAuthed(chatId: string, req: IncomingMessage): boolean {
  // Креды — из query/заголовков/HttpOnly-куки bd (единый путь из auth.ts; IncomingMessage безопасен для credsOf)
  const { clientId, clientSecret } = credsFromRequest(req as never);
  if (!clientId || !clientSecret) return false;
  try {
    const db = getDb();
    return !!db.prepare('SELECT 1 FROM clients WHERE client_id = ? AND secret = ? AND chat_id = ?').get(clientId, clientSecret, chatId);
  } catch { return false; }
}

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const chatId = chatIdFromUrl(req.url) || 'unknown';
    // Без валидных креденшелов сокет не подключается: сообщения и state чата — персональные данные.
    if (!isAuthed(chatId, req)) {
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
