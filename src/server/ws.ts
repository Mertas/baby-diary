import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

type Subscriber = { ws: WebSocket; chatId: string; path: string };
const subscribers: Subscriber[] = [];
let onReplay: ((chatId: string, path: string) => string | null) | null = null;

export function setReplayHandler(handler: (chatId: string, path: string) => string | null): void {
  onReplay = handler;
}

function extractChatId(url: string | undefined): string | null {
  if (!url) return null;
  try { const match = url.match(/\/chat\/([^/]+)\/socket/); return match ? match[1] : null; }
  catch { return null; }
}

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const chatId = extractChatId(req.url) || 'unknown';
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
