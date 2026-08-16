import OpenAI from 'openai';
import { getDb } from '../db/index.js';
import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL, LLM_TIMEOUT_MS } from './config.js';
import { getState, saveState, mergeState, sanitizeStateEvents, extractMomDay, stripSensitiveState } from './state.js';
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

interface LlmResponse { text?: string; ui?: string; state?: Record<string, unknown>; choices?: string[]; multi?: boolean; }

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
    // stripSensitiveState: в контекст не попадают GPS-координаты фото (геолокация семьи)
    systemPrompt += '\n\n# ТЕКУЩЕЕ СОСТОЯНИЕ ДНЕВНИКА (JSON)\n' + JSON.stringify(stripSensitiveState(state), null, 1) +
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

// --- Проактивное дозаполнение пустых разделов (навыки/скачки/календарь-вехи) ---
const fillAttempts = new Map<string, number>();

async function fillEmptySections(chatId: string, merged: Record<string, unknown>, emit: Broadcaster, skipSkills = false): Promise<void> {
  const s = merged as Record<string, any>;
  const bd = s.birthDate as string | undefined;
  // «Сегодня» по дневнику = день мамы (lastMomDay 'ГГГГ-ММ-ДД'), иначе серверная дата.
  // Возраст/вехи считаем от него — дневник может вестись «задним числом».
  const dayRef = (() => {
    const lmd = s.lastMomDay as string | undefined;
    if (typeof lmd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lmd)) {
      const d = new Date(Number(lmd.slice(0, 4)), Number(lmd.slice(5, 7)) - 1, Number(lmd.slice(8, 10)));
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return Date.now();
  })();
  const ageMs = bd ? dayRef - new Date(bd).getTime() : NaN;
  const ageDays = isNaN(ageMs) ? NaN : ageMs / 86400000;
  const ageWeeks = ageDays / 7;
  // Навыки: при знакомстве модель должна провести ОПРОС с вариантами. Пока она сама не задаёт вопросы
  // с choices — сервер генерирует их (макс. 2 вопроса), затем дозаполняет skills автоматически.
  const attempts = fillAttempts.get(chatId) || 0;
  if (attempts >= 3) return;
  const skillsEmpty = Array.isArray(s.skills) ? s.skills.length === 0 : true;
  if (skillsEmpty && !skipSkills && attempts < 2) {
    // Попытка тратится только на реальное действие (опрос/дозаполнение) —
    // иначе 3 ответа с заполненным state навсегда отключали бы дозаполнение.
    fillAttempts.set(chatId, attempts + 1);
    // ОПРОС: сервер задаёт вопрос о навыках с вариантами отдельным сообщением
    try {
      const msgs = buildMessageHistory(chatId);
      msgs.push({ role: 'user', content: 'Раздел навыков пуст, идёт знакомство с ребёнком. Задай ОДИН короткий вопрос о навыках ребёнка по его возрасту с вариантами ответа. Верни ТОЛЬКО JSON: {"text":"короткий вопрос","choices":["Да, уверенно","Почти","Пока нет","Другое"]} — без state.' });
      const res = await openai.chat.completions.create({ model: DEEPSEEK_MODEL, messages: msgs, max_tokens: 300, stream: false, temperature: 0.7 });
      const parsed = parseLlmResponse(res.choices?.[0]?.message?.content || '');
      if (parsed?.text && Array.isArray(parsed.choices) && parsed.choices.length) {
        const db = getDb();
        const ch = parsed.choices.map(String).slice(0, 4);
        db.prepare('INSERT INTO llm_messages (chat_id, role, content, choices) VALUES (?, ?, ?, ?)').run(chatId, 'agent', parsed.text, JSON.stringify(ch));
        emit('update', `<div class="message message-agent" data-choices="${escapeAttr(JSON.stringify(ch))}">${escapeHtml(parsed.text)}</div>`);
        console.log('[fill] survey question:', parsed.text.slice(0, 60));
      }
    } catch (e) { console.log('[fill] survey ERR', String(e).slice(0, 200)); }
    return;
  }
  const needSkills = skillsEmpty && attempts >= 2;
  const needSpurts = (!Array.isArray(s.spurts) || s.spurts.length === 0) && !isNaN(ageWeeks) && ageWeeks >= 5 && ageWeeks <= 26;
  const cal = Array.isArray(s.calendar) ? s.calendar : [];
  const hasMed = cal.some((c: any) => /[💉🩺⚕️🎂]/.test(String(c.title || '')));
  const needCal = !hasMed && !isNaN(ageDays) && ageDays <= 730;
  const needBlurb = !s.blurb && !!s.name;
  if (!needSkills && !needSpurts && !needCal && !needBlurb) return;
  // Реальное дозаполнение — только здесь тратим попытку
  fillAttempts.set(chatId, attempts + 1);
  console.log('[fill]', chatId.slice(0, 8), 'attempt', attempts + 1, 'skills:', needSkills, 'spurts:', needSpurts, 'cal:', needCal, 'blurb:', needBlurb);

  const asks: string[] = [];
  if (needSkills) asks.push('skills — навыки по возрасту ребёнка (8–15 шт: что умеет/осваивает/должно появиться, статусы done/current/upcoming, у каждого normal «X–Y мес»)');
  if (needSpurts) asks.push('spurts — актуальный скачок роста по возрасту (неделя + описание)');
  if (needCal) asks.push('calendar — все ближайшие медицинские вехи по нацкалендарю прививок на 3 месяца вперёд от birthDate, с эмодзи в title (💉/🩺/⚕️)');
  if (needBlurb) asks.push('blurb — милое описание ребёнка ОДНИМ предложением (тёплое, образное, с лёгким юмором, без перечисления фактов и цифр)');
  const messages = buildMessageHistory(chatId);
  messages.push({
    role: 'user',
    content: `Дозаполни пустые разделы дневника (мама ничего про них не писала, это твоя проактивность): ${asks.join('; ')}. `
      + `День по дневнику: ${(merged as any).lastMomDay || 'сегодня'} — даты вех/скачков считай от него (если он указан), а не от серверной даты. `
      + `Верни ТОЛЬКО JSON: {"state": { ...только эти разделы... }} — без текста, без других разделов. Схема строго как в системном промпте.`,
  });
  try {
    const res = await openai.chat.completions.create({ model: DEEPSEEK_MODEL, messages, max_tokens: 6000, stream: false, temperature: 0.6 });
    const raw = res.choices?.[0]?.message?.content || '';
    console.log('[fill] raw len', raw.length, raw.slice(0, 80).replace(/\n/g, ' '));
    const parsed = parseLlmResponse(raw);
    const st = parsed?.state;
    if (st && typeof st === 'object' && Object.keys(st).length) {
      const merged2 = mergeState(getState(chatId), sanitizeStateEvents(st));
      saveState(chatId, merged2);
      emit('state', merged2);
    }
  } catch (e) { console.log('[fill] ERR', String(e).slice(0, 300)); /* тихо: дозаполнение не критично */ }
}

// --- (конец дозаполнения) ---

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
        { role: 'user', content: 'Ты ответила обычным текстом, но данные не сохранились. Верни ответ ТОЛЬКО в формате JSON: {"text":"что сказать","state":{...данные которые нужно сохранить...}}. Если данных для state нет — верни {"text":"...","state":{}}. Схема state — строго как в системном промпте: кормления в feeds (amount числом), сны в sleeps, остальное в events; время — текстом в time/start/end (если мама назвала дату дня — все события с ней, например "20.07 07:30"). Если мама упоминала ВЕС или РОСТ — обязательно включи в state: weight/height и событие {title:"Замер"}. Если мама просила СОХРАНИТЬ или ОБНОВИТЬ советы/рецепты/списки/покупки — включи их в state (tips/recipes/todos/shopping; при обновлении — тот же title, дополненный text). Плюс проактивно: если в calendar ещё нет ближайших медицинских вех (прививки/осмотры по нацкалендарю на 3 месяца вперёд от birthDate) — добавь их с эмодзи (💉/🩺/⚕️); если навыки (skills) не обновлялись 2+ недели — добавь skills по возрасту ребёнка; если в разговоре была содержательная тема (колики, сон, купание и т.п.) — добавь 2-3 совета в tips; если ребёнку 5–25 недель и spurts пуст или не обновлялись 3+ недели — добавь актуальный скачок роста (неделя + описание). Проверь свой state перед отправкой: всё, что мама назвала, — присутствует.' },
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
    let choices = Array.isArray(parsed.choices) && parsed.choices.length ? parsed.choices.map(String) : null;

    // Модель часто задаёт вопрос без вариантов (свободная форма). Догенерируем варианты серверно,
    // чтобы мама могла ответить кнопками (3-4 варианта + «Свой вариант»; multi если подходит несколько).
    if (!choices && parsed.text && /\?[^\p{L}\p{N}]*$/u.test(parsed.text.trim())) {
      try {
        const genMsgs = [
          { role: 'system' as const, content: 'Ты генерируешь варианты ответа к вопросу. Верни ТОЛЬКО JSON: {"choices": ["Вариант1","Вариант2","Вариант3","Свой вариант"], "multi": true|false} — 3–4 коротких варианта, последний всегда "Свой вариант". multi=true, если можно выбрать НЕСКОЛЬКО вариантов одновременно.' },
          { role: 'user' as const, content: 'Вопрос: ' + parsed.text },
        ];
        const gen = await openai.chat.completions.create({ model: DEEPSEEK_MODEL, messages: genMsgs, max_tokens: 1200, stream: false, temperature: 0.6 });
        const gRaw = gen.choices?.[0]?.message?.content || '';
        console.log('[choices] raw:', JSON.stringify(gRaw).slice(0, 200), '| finish:', (gen.choices?.[0] as any)?.finish_reason);
        const g = parseLlmResponse(gRaw);
        const gc = Array.isArray(g?.choices) ? g.choices.map(String).slice(0, 4) : [];
        if (gc.length) {
          if (!gc.some((c) => /свой вариант/i.test(c))) gc.push('Свой вариант');
          choices = gc;
          if ((g as any)?.multi) parsed.multi = true;
        }
      } catch { /* варианты — опция, не критично */ }
    }

    // Состояние ДО ответа — для undo (откат удаляет и сообщение, и изменения state)
    const prevState = getState(chatId);
    const ins = db.prepare('INSERT INTO llm_messages (chat_id, role, content, ui, choices, multi) VALUES (?, ?, ?, ?, ?, ?)').run(chatId, 'agent', text, ui, choices ? JSON.stringify(choices) : null, parsed.multi ? 1 : 0);
    const agentMsgId = Number(ins.lastInsertRowid);

    const choicesAttr = choices ? ` data-choices="${escapeAttr(JSON.stringify(choices))}"${parsed.multi ? ' data-multi="1"' : ''}` : '';
    emit('update', `<div class="message message-agent"${choicesAttr}>${escapeHtml(text)}</div>`);

    // Save structured state to DB (persistent app data), then broadcast to clients
    if (state) {
      const dayBase = extractMomDay(prompt);
      const merged = mergeState(prevState, sanitizeStateEvents(state, dayBase));
      if (dayBase != null) {
        // запоминаем «день мамы» — возраст/сводка/таймлайн считают от него (ЛОКАЛЬНАЯ дата, не UTC!)
        const dd = new Date(dayBase);
        merged.lastMomDay = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
      }
      saveState(chatId, merged);
      emit('state', merged);
      // Снимок state до ответа — undo восстановит его
      db.prepare('UPDATE llm_messages SET prev_state = ? WHERE id = ?').run(JSON.stringify(prevState), agentMsgId);
      // Проактивное дозаполнение пустых разделов: модель часто отвечает только данными дня,
      // а вкладки (навыки/скачки/календарь-вехи) остаются пустыми. Тихо дозаполняем (макс. 2 попытки на чат).
      // Если модель задала вопрос с вариантами (идёт опрос про навыки) — skills не трогаем.
      fillEmptySections(chatId, merged, emit, choices != null).catch(() => {});
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
    // Имя чата = первые слова первого сообщения (чаты создаются как «Baby Diary» — их не держим вечно)
    const title = userPrompt.slice(0, 60) + (userPrompt.length > 60 ? '...' : '');
    db.prepare('UPDATE chats SET title = ? WHERE id = ?').run(title, chatId);
  }
}
