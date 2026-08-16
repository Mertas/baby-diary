// Единая проверка доступа клиента к чату.
// Креденшелы принимаются из (по приоритету):
//   1. тела JSON (POST),
//   2. query-строки (GET — fallback для curl/тестов),
//   3. заголовков X-Client-Id / X-Client-Secret,
//   4. HttpOnly-куки `bd` (основной путь для <img>/<video> и WebSocket —
//      секреты не должны торчать в URL/истории/логах прокси).
// При успешной аутентификации через requireClient сервер ставит/обновляет куку.
import type { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/index.js';

const COOKIE_NAME = 'bd';
const COOKIE_MAX_AGE = 365 * 24 * 3600 * 1000; // 1 год

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) { try { out[k] = decodeURIComponent(v); } catch { out[k] = v; } }
  }
  return out;
}

/** Безопасное чтение кредов: req может быть express-Request ИЛИ IncomingMessage от ws
 *  (у того нет body/query/header — поля необязательны). */
function credsOf(req: Request): { clientId: string; clientSecret: string } {
  const b = ((req as { body?: unknown }).body && typeof (req as { body?: unknown }).body === 'object' ? (req as { body: Record<string, unknown> }).body : {});
  const q = ((req as { query?: unknown }).query && typeof (req as { query?: unknown }).query === 'object' ? (req as { query: Record<string, unknown> }).query : {});
  // req.headers есть и у express.Request, и у IncomingMessage (ws) — единый путь чтения
  const headers = ((req as { headers?: Record<string, string | string[] | undefined> }).headers ?? {}) as Record<string, string | string[] | undefined>;
  const header = (name: string): string | undefined => {
    const v = headers[name.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  };
  let clientId = String(b.clientId ?? q.clientId ?? header('x-client-id') ?? '');
  let clientSecret = String(b.clientSecret ?? q.clientSecret ?? header('x-client-secret') ?? '');
  if (!clientId || !clientSecret) {
    const c = parseCookies(header('cookie'));
    const raw = c[COOKIE_NAME] || '';
    const parts = raw.split(':');
    if (parts.length >= 3) {
      clientId = clientId || parts[1];
      clientSecret = clientSecret || parts[2];
    }
  }
  return { clientId, clientSecret };
}

/** Верно ли, что (clientId, clientSecret) принадлежат чату. */
export function checkClient(req: Request, chatId: string): boolean {
  const { clientId, clientSecret } = credsOf(req);
  if (!clientId || !clientSecret) return false;
  const db = getDb();
  return !!db.prepare('SELECT 1 FROM clients WHERE client_id = ? AND secret = ? AND chat_id = ?').get(clientId, clientSecret, chatId);
}

/** Прочитать креды (в т.ч. из куки) без проверки — для ws.ts. */
export function credsFromRequest(req: Request): { clientId: string; clientSecret: string } {
  return credsOf(req);
}

/** Express-middleware: 401, если креденшелы не подходят к чату из :chatId/:id параметра. */
export function requireClient(req: Request, res: Response, next: NextFunction): void {
  const chatId = String(req.params.chatId ?? req.params.id ?? '');
  if (!chatId || !checkClient(req, chatId)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  // Продлеваем/ставим HttpOnly-куку: <img>/<video>/WebSocket ходят по ней, а не по query
  const { clientId, clientSecret } = credsOf(req);
  res.cookie(COOKIE_NAME, `${chatId}:${clientId}:${clientSecret}`, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  next();
}
