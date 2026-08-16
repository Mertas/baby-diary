// Единая проверка доступа клиента к чату.
// Креденшелы принимаются из тела JSON (POST), query-строки (GET: <img>/<video>/fetch)
// или заголовков X-Client-Id / X-Client-Secret — везде один путь проверки.
import type { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/index.js';

function credsOf(req: Request): { clientId: string; clientSecret: string } {
  const b = (req.body || {}) as Record<string, unknown>;
  return {
    clientId: String(b.clientId ?? req.query.clientId ?? req.header('x-client-id') ?? ''),
    clientSecret: String(b.clientSecret ?? req.query.clientSecret ?? req.header('x-client-secret') ?? ''),
  };
}

/** Верно ли, что (clientId, clientSecret) принадлежат чату. */
export function checkClient(req: Request, chatId: string): boolean {
  const { clientId, clientSecret } = credsOf(req);
  if (!clientId || !clientSecret) return false;
  const db = getDb();
  return !!db.prepare('SELECT 1 FROM clients WHERE client_id = ? AND secret = ? AND chat_id = ?').get(clientId, clientSecret, chatId);
}

/** Express-middleware: 401, если креденшелы не подходят к чату из :chatId/:id параметра. */
export function requireClient(req: Request, res: Response, next: NextFunction): void {
  const chatId = String(req.params.chatId ?? req.params.id ?? '');
  if (!chatId || !checkClient(req, chatId)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  next();
}
