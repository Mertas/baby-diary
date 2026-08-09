import OpenAI from 'openai';
import { getDb } from '../db/index.js';
import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL, LLM_TIMEOUT_MS } from './config.js';
import { getState, saveState, mergeState, sanitizeStateEvents, extractMomDay } from './state.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { LlmMessage } from '../db/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: DEEPSEEK_BASE_URL,
  timeout: LLM_TIMEOUT_MS,
});

interface LlmResponse { text?: string; ui?: string; state?: Record<string, unknown>; choices?: string[]; }

type Broadcaster = (type: string, data: unknown) => void;

const activeRequests = new Map<string, AbortController>();

export function stopGeneration(chatId: string): void {
  const ctrl = activeRequests.get(chatId);
  if (ctrl) { ctrl.abort(); activeRequests.delete(chatId); }
}

export function isProcessing(chatId: string): boolean {
  return activeRequests.has(chatId);
}

function getSystemPrompt(): string {
  const promptPath = resolve(__dirname, '..', '..', 'baby-diary-prompt.md');
  if (existsSync(promptPath)) { return readFileSync(promptPath, 'utf-8'); }
  return 'You are a helpful assistant for a baby diary app.';
}

function buildMessageHistory(chatId: string): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const db = getDb();
  const messages = db.prepare(
    "SELECT role, content FROM (SELECT role, content, created_at FROM llm_messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC"
  ).all(chatId, 40) as Pick<LlmMessage, 'role' | 'content'>[];

  // Append current persistent state so the LLM knows what is filled and what is missing
  let systemPrompt = getSystemPrompt();
  try {
    const state = getState(chatId);
    systemPrompt += '\n\n# ТЕКУЩЕЕ СОСТОЯНИЕ ДНЕВНИКА (JSON)\n' + JSON.stringify(state, null, 1) +
      '\n\nЕсли какие-то разделы пустые или незаполненные — предложи их заполнить. Все новые данные передавай в state.';
  } catch { /* state unavailable */ }

  // Current date — so the baby's age is counted from the real "today", not a made-up one
  const now = new Date();
  const weekday = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'][now.getDay()];
  systemPrompt += '\n\n# ТЕКУЩАЯ ДАТА\nСегодня ' + now.toISOString().slice(0, 10) + ' (' + weekday + '). Возраст ребёнка всегда вычисляй от birthDate относительно этой даты. Не угадывай текущую дату — она указана здесь.';

  // Собственный дополнительный промпт ассистента: заметки, которые LLM сама решила помнить
  try {
    const st = getState(chatId);
    const notes = (st as Record<string, unknown>).llmNotes;
    if (Array.isArray(notes) && notes.length) {
      const lines = notes.map((n: unknown) => '- ' + (n && typeof n === 'object' ? String((n as Record<string, unknown>).note ?? '') : String(n))).filter(Boolean);
      if (lines.length) {
        systemPrompt += '\n\n## ТВОЙ ДОПОЛНИТЕЛЬНЫЙ ПРОМПТ (заметки, которые ты сама решила помнить)\n' +
          lines.join('\n') +
          '\nЭто твой персональный дополнительный промпт — он подставляется в каждый запрос. Обновляй его через state.llmNotes: [{note:"..."}].';
      }
    }
  } catch { /* notes unavailable */ }

  const history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];
  for (const msg of messages) {
    history.push({
      role: msg.role === 'agent' ? 'assistant' : (msg.role as 'system' | 'user'),
      content: msg.content,
    });
  }
  return history;
}

export function parseLlmResponse(raw: string): LlmResponse | null {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');

  try {
    const p = JSON.parse(text) as LlmResponse;
    if (p && Array.isArray(p.choices)) p.choices = p.choices.map(String).slice(0, 6);
    return p;
  } catch { /* continue */ }

  const startIdx = text.indexOf('{');
  if (startIdx !== -1) {
    let endIdx = -1;
    let depth = 0, inString = false, escaped = false;
    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (!inString) {
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
      }
    }
    if (endIdx !== -1) {
      let sanitized = '';
      inString = false; escaped = false;
      for (let i = startIdx; i <= endIdx; i++) {
        const ch = text[i];
        if (escaped) { sanitized += ch; escaped = false; continue; }
        if (ch === '\\') { sanitized += ch; escaped = true; continue; }
        if (ch === '"') { sanitized += ch; inString = !inString; continue; }
        if (inString && ch === '\n') { sanitized += '\\n'; continue; }
        if (inString && ch === '\r') { sanitized += '\\r'; continue; }
        if (inString && ch === '\t') { sanitized += '\\t'; continue; }
        sanitized += ch;
      }
      try {
        const p = JSON.parse(sanitized) as LlmResponse;
        if (p && Array.isArray(p.choices)) p.choices = p.choices.map(String).slice(0, 6);
        return p;
      } catch { /* fall through */ }
    }
  }

  // Ответ мог быть обрезан лимитом токенов (state молча терялся): пробуем закрыть
  // незакрытые скобки в конце — сработает, если обрыв пришёлся на границу объекта.
  for (let k = 1; k <= 8; k++) {
    try {
      const p = JSON.parse(text + '}'.repeat(k)) as LlmResponse;
      if (p && p.text) return p;
    } catch { /* continue */ }
  }

  const textMatch = text.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!textMatch) return null;

  const result: LlmResponse = { text: JSON.parse(`"${textMatch[1]}"`) as string };
  const uiKeyIdx = text.indexOf('"ui"');
  if (uiKeyIdx !== -1) {
    const colonIdx = text.indexOf(':', uiKeyIdx);
    if (colonIdx !== -1) {
      const valStart = text.indexOf('"', colonIdx);
      if (valStart !== -1) {
        const scriptEnd = text.lastIndexOf('</script>');
        if (scriptEnd > valStart) {
          const afterScript = text.indexOf('"', scriptEnd + 9);
          if (afterScript !== -1) {
            try { result.ui = JSON.parse('"' + text.substring(valStart + 1, afterScript).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"') as string; } catch { /* ignore */ }
          }
        }
        if (!result.ui) {
          let uiVal = '';
          let esc = false;
          for (let i = valStart + 1; i < text.length; i++) {
            const ch = text[i];
            if (esc) { uiVal += ch; esc = false; continue; }
            if (ch === '\\') { uiVal += ch; esc = true; continue; }
            if (ch === '"') break;
            uiVal += ch;
          }
          try { result.ui = JSON.parse(`"${uiVal.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}"`) as string; } catch { /* ignore */ }
        }
      }
    }
  }
  return result;
}

export async function handlePrompt(chatId: string, prompt: string, modelName: string | undefined, emit: Broadcaster): Promise<void> {
  const db = getDb();
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) { emit('done', null); return; }

  db.prepare('INSERT INTO llm_messages (chat_id, role, content) VALUES (?, ?, ?)').run(chatId, 'user', prompt);
  updateChatTitle(chatId, prompt);
  emit('user-bubble', `<div class="message message-user">${escapeHtml(prompt)}</div>`);
  db.prepare('UPDATE chats SET thinking = 1 WHERE id = ?').run(chatId);

  const aborter = new AbortController();
  activeRequests.set(chatId, aborter);
  emit('thinking', true);

  let fullResponse = '';
  try {
    const messages = buildMessageHistory(chatId);
    messages.push({ role: 'user', content: prompt });

    const stream = await openai.chat.completions.create(
      { model: modelName || DEEPSEEK_MODEL, messages, stream: true, max_tokens: 8192 },
      { signal: aborter.signal },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) { fullResponse += delta; }
    }

    db.prepare('INSERT INTO llm_logs (chat_id, request, response) VALUES (?, ?, ?)').run(chatId, JSON.stringify(messages), fullResponse);

    let parsed = parseLlmResponse(fullResponse);

    // Retry once if LLM returned non-JSON prose but user provided baby info
    if ((!parsed || !parsed.text) && !aborter.signal.aborted && fullResponse.trim().length > 0) {
      const retryMsgs = buildMessageHistory(chatId);
      retryMsgs.push(
        { role: 'assistant', content: fullResponse.trim() },
        { role: 'user', content: 'Ты ответила обычным текстом, но данные не сохранились. Верни ответ ТОЛЬКО в формате JSON: {"text":"что сказать","state":{...данные которые нужно сохранить...}}. Если данных для state нет — верни {"text":"...","state":{}}. Схема state — строго как в системном промпте: кормления в feeds (amount числом), сны в sleeps, остальное в events; время — текстом в time/start/end (если мама назвала дату дня — все события с ней, например "20.07 07:30"). Если мама упоминала ВЕС или РОСТ — обязательно включи в state: weight/height и событие {title:"Замер"}. Если мама просила СОХРАНИТЬ или ОБНОВИТЬ советы/рецепты/списки/покупки — включи их в state (tips/recipes/todos/shopping; при обновлении — тот же title, дополненный text). Плюс проактивно: если в calendar ещё нет ближайших медицинских вех (прививки/осмотры по нацкалендарю на 3 месяца вперёд от birthDate) — добавь их с эмодзи (💉/🩺/⚕️); если навыки (skills) не обновлялись 2+ недели — добавь skills по возрасту ребёнка; если в разговоре была содержательная тема (колики, сон, купание и т.п.) — добавь 2-3 совета в tips. Проверь свой state перед отправкой: всё, что мама назвала, — присутствует.' },
      );
      const retryStream = await openai.chat.completions.create(
        { model: modelName || DEEPSEEK_MODEL, messages: retryMsgs, stream: true, max_tokens: 8192 },
        { signal: aborter.signal },
      );
      let retryResp = '';
      for await (const chunk of retryStream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) retryResp += delta;
      }
      db.prepare('INSERT INTO llm_logs (chat_id, request, response) VALUES (?, ?, ?)').run(chatId, JSON.stringify(retryMsgs), retryResp);
      const retried = parseLlmResponse(retryResp);
      if (retried && retried.text) parsed = retried;
      else fullResponse = retryResp; // use retry text as fallback
    }

    if (!parsed || !parsed.text) {
      const text = fullResponse.trim() || 'No response generated.';
      db.prepare('INSERT INTO llm_messages (chat_id, role, content) VALUES (?, ?, ?)').run(chatId, 'agent', text);
      emit('update', `<div class="message message-agent">${escapeHtml(text)}</div>`);
      emit('done', null);
      return;
    }

    const text = parsed.text;
    const ui = parsed.ui || null;
    const state = parsed.state || null;
    const choices = Array.isArray(parsed.choices) && parsed.choices.length ? parsed.choices.map(String) : null;

    db.prepare('INSERT INTO llm_messages (chat_id, role, content, ui, choices) VALUES (?, ?, ?, ?, ?)').run(chatId, 'agent', text, ui, choices ? JSON.stringify(choices) : null);

    const choicesAttr = choices ? ` data-choices="${escapeAttr(JSON.stringify(choices))}"` : '';
    emit('update', `<div class="message message-agent"${choicesAttr}>${escapeHtml(text)}</div>`);

    // Save structured state to DB (persistent app data), then broadcast to clients
    if (state) {
      const dayBase = extractMomDay(prompt);
      const merged = mergeState(getState(chatId), sanitizeStateEvents(state, dayBase));
      if (dayBase != null) {
        // запоминаем «день мамы» — возраст/сводка/таймлайн считают от него
        merged.lastMomDay = new Date(dayBase).toISOString().slice(0, 10);
      }
      saveState(chatId, merged);
      emit('state', merged);
    }
    emit('done', null);
  } catch (err) {
    try {
      const messages = buildMessageHistory(chatId);
      messages.push({ role: 'user', content: prompt });
      db.prepare('INSERT INTO llm_logs (chat_id, request, response) VALUES (?, ?, ?)').run(chatId, JSON.stringify(messages), fullResponse || String(err));
    } catch { /* non-critical */ }
    if (aborter.signal.aborted) {
      const partial = fullResponse.trim();
      if (partial) {
        db.prepare('INSERT INTO llm_messages (chat_id, role, content) VALUES (?, ?, ?)').run(chatId, 'agent', partial);
        emit('update', `<div class="message message-agent">${escapeHtml(partial)}</div>`);
      }
      emit('done', null);
    } else {
      console.error('LLM error:', err);
      emit('fallback', null);
    }
  } finally {
    activeRequests.delete(chatId);
    db.prepare('UPDATE chats SET thinking = 0 WHERE id = ?').run(chatId);
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function updateChatTitle(chatId: string, userPrompt: string): void {
  const db = getDb();
  const { count } = db.prepare('SELECT COUNT(*) as count FROM llm_messages WHERE chat_id = ? AND role IN (?, ?)').get(chatId, 'user', 'agent') as { count: number };
  if (count <= 2) {
    const title = userPrompt.slice(0, 60) + (userPrompt.length > 60 ? '...' : '');
    db.prepare('UPDATE chats SET title = ? WHERE id = ? AND title = ?').run(title, chatId, 'New Chat');
  }
}
