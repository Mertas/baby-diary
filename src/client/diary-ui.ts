// diary-ui.ts — Baby Diary, Hermès-style
const { el, $, $$, on, append, clear } = window.PromptUI;

window.PromptUI.ui.set(`
<style>
:root {
  --bg: #f8f5f0; --surface: #fffdf9; --card: rgba(255,253,249,0.92); --border: #e3ddd3;
  --accent: #e8622a; --accent-dark: #c64f1c; --accent-soft: #f7e6dc;
  --text: #211d18; --text-dim: #7a7268; --text-soft: #a39a8d;
  --radius: 4px; --radius-sm: 2px;
  --serif: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
  --sans: 'Inter', -apple-system, system-ui, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--sans); background: var(--bg); color: var(--text); height: 100vh; overflow: hidden; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased; letter-spacing: 0.01em; }
::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 2px; }

#app { flex: 1; display: flex; flex-direction: column; overflow: hidden; max-width: 560px; margin: 0 auto; width: 100%; border-left: 1px solid var(--border); border-right: 1px solid var(--border); }

.brand { text-align: center; padding: 22px 16px 6px; flex-shrink: 0; }
.brand .mark { font-family: var(--serif); font-size: 11px; letter-spacing: 0.45em; text-transform: uppercase; color: var(--text-soft); }
.brand .name { font-family: var(--serif); font-size: 26px; font-weight: 500; color: var(--text); margin-top: 6px; line-height: 1.15; }
.brand .meta { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-top: 8px; font-size: 11px; color: var(--text-dim); letter-spacing: 0.06em; text-transform: uppercase; }
.brand .meta span { padding-bottom: 2px; border-bottom: 1px solid var(--border); }
.brand .hint { font-size: 12px; color: var(--accent); margin-top: 10px; font-family: var(--serif); font-style: italic; }

.actions { display: flex; gap: 6px; padding: 14px 16px 12px; flex-shrink: 0; justify-content: center; border-bottom: 1px solid var(--border); }
.action { background: none; border: none; border-bottom: 1px solid transparent; padding: 6px 16px; font-family: var(--sans); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); cursor: pointer; transition: all .2s; }
.action:hover { color: var(--accent); }
.action.sel { color: var(--accent); border-bottom-color: var(--accent); }

.tabs { display: flex; gap: 4px; padding: 0 8px; border-bottom: 1px solid var(--border); flex-shrink: 0; overflow-x: auto; }
.tab { padding: 10px 8px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; color: var(--text-dim); border-bottom: 2px solid transparent; background: none; border-top: none; border-left: none; border-right: none; font-family: var(--sans); font-weight: 500; flex-shrink: 0; }
.tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab:hover { color: var(--text); }

.content { flex: 1; overflow-y: auto; padding: 14px 16px; display: none; }
.content.active { display: block; }

.card { background: var(--card); border: 1px solid #ded6c8; border-radius: var(--radius); margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.card-h { padding: 11px 18px 9px; font-family: var(--serif); font-size: 15px; font-weight: 500; color: var(--text); letter-spacing: 0.02em; border-bottom: 1px solid var(--border); background: #f6eee2; }
.event-row { display: flex; gap: 12px; padding: 10px 18px; align-items: baseline; border-bottom: 1px solid var(--border); }
.event-row:last-child { border-bottom: none; }
.event-row .e-time { font-size: 11px; color: var(--text-soft); font-variant-numeric: tabular-nums; flex-shrink: 0; min-width: 34px; }
.event-row .e-ico { flex-shrink: 0; font-size: 13px; width: 20px; text-align: center; }
.day-head { padding: 8px 18px 6px; font-size: 10px; letter-spacing: 0.12em; text-transform: none; color: var(--text-soft); background: #faf6ee; border-bottom: 1px solid var(--border); }
.day-head:first-child { border-top: none; }
.event-row .e-title { font-size: 13px; font-weight: 500; }
.event-row .e-sub { font-size: 11px; color: var(--text-dim); }
.row-del { margin-left: auto; background: none; border: none; color: var(--text-soft); cursor: pointer; font-size: 11px; flex-shrink: 0; padding: 2px 4px; align-self: center; }
.row-del:hover { color: #c0392b; }
.empty { text-align: center; padding: 36px 16px; color: var(--text-dim); font-size: 13px; font-family: var(--serif); font-style: italic; }
.empty button { display: block; margin: 14px auto 0; background: none; border: none; border-bottom: 1px solid var(--accent); color: var(--accent); cursor: pointer; font-size: 11px; font-family: var(--sans); letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 0; font-style: normal; }

.tip-card { padding: 12px 18px; border-bottom: 1px solid var(--border); }
.tip-card:last-child { border-bottom: none; }
.tip-card .t-cat { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 3px; }
.tip-card .t-title { font-family: var(--serif); font-size: 16px; font-weight: 500; margin-bottom: 3px; }
.tip-card .t-text { font-size: 12px; color: var(--text-dim); line-height: 1.55; white-space: pre-line; }

.recipe-card { padding: 12px 18px; border-bottom: 1px solid var(--border); }
.recipe-card:last-child { border-bottom: none; }
.recipe-card .r-title { font-family: var(--serif); font-size: 16px; font-weight: 500; margin-bottom: 4px; }
.recipe-card .r-text { font-size: 12px; color: var(--text-dim); line-height: 1.55; margin-bottom: 6px; white-space: pre-line; }
.recipe-card .r-meta { font-size: 10px; color: var(--text-soft); letter-spacing: 0.04em; }

.spurt-card { padding: 18px; border-bottom: 1px solid var(--border); }
.spurt-card:last-child { border-bottom: none; }
.spurt-card .s-week { font-family: var(--serif); font-size: 20px; font-weight: 500; color: var(--text); margin-bottom: 6px; line-height: 1.25; }
.spurt-card.past { opacity: 0.7; }
.spurt-card.upcoming { border-left: 2px solid var(--accent); }
.spurt-card.active { background: var(--accent-soft); border: 1px solid var(--accent); box-shadow: 0 4px 20px rgba(232,98,42,0.08); }
.spurt-card .s-badge { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 6px; }
.spurt-card.active .s-badge { color: var(--accent); font-weight: 600; }
.spurt-card.past .s-badge { color: var(--text-soft); }
.spurt-card .s-block { margin-top: 14px; }
.spurt-card .s-block .sb-title { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); font-weight: 600; margin-bottom: 5px; }
.spurt-card .s-block .sb-text { font-size: 14px; color: var(--text); line-height: 1.7; white-space: pre-line; }
.spurt-card.past .s-block .sb-text { font-size: 13px; color: var(--text-dim); }

.clothes-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 18px; font-size: 12px; border-bottom: 1px solid var(--border); }
.clothes-row:last-child { border-bottom: none; }
.clothes-row .c-lbl { color: var(--text-dim); flex-shrink: 0; } .clothes-row .c-val { font-weight: 500; text-align: right; }
.clothes-need { display: inline-block; border: 1px solid var(--border); padding: 3px 10px; font-size: 11px; margin: 3px; color: var(--text); }

.todo-item { display: flex; align-items: center; gap: 10px; padding: 10px 18px; font-size: 12px; cursor: pointer; border-bottom: 1px solid var(--border); }
.todo-item:last-child { border-bottom: none; }
.todo-item input { accent-color: var(--accent); width: 16px; height: 16px; }
.todo-item.done { color: var(--text-dim); text-decoration: line-through; }

/* Knowledge base: tags, categories, tree */
.kb-nav { padding: 8px 0; border-bottom: 1px solid var(--border); }
.kb-nav button { display: block; width: 100%; text-align: left; padding: 6px 18px; border: none; background: none; cursor: pointer; font-family: var(--sans); font-size: 12px; color: var(--text-dim); letter-spacing: 0.02em; }
.kb-nav button:hover { color: var(--text); }
.kb-nav button.active { color: var(--accent); font-weight: 500; }
.kb-nav .depth-1 { padding-left: 30px; }
.kb-nav .depth-2 { padding-left: 46px; }
.kb-nav .kb-group { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-soft); padding: 8px 14px 4px; }
.tag-chip { display: inline-block; border: 1px solid var(--border); border-radius: 20px; padding: 2px 10px; font-size: 10px; color: var(--text-dim); margin: 2px 3px 0 0; cursor: pointer; }
.tag-chip:hover { border-color: var(--accent); color: var(--accent); }
.tag-chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.tag-row { padding: 8px 18px 4px; }
.recipe-meta { font-size: 10px; color: var(--text-soft); display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.notice { background: var(--accent-soft); border: 1px solid var(--accent); border-radius: var(--radius); padding: 14px 18px; margin-bottom: 10px; }
.notice .n-title { font-family: var(--serif); font-size: 15px; color: var(--accent); margin-bottom: 4px; }
.notice .n-text { font-size: 12px; color: var(--text); line-height: 1.55; }
.actions .action.dim { opacity: 0.4; }

/* Skills, shopping, weekly plan, choices, ask button */
.ask-btn { display: block; margin: 4px auto 16px; background: none; border: none; border-bottom: 1px solid var(--accent); color: var(--accent); cursor: pointer; font-size: 11px; font-family: var(--sans); letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 0; }
.skill-row { padding: 12px 18px; border-bottom: 1px solid var(--border); }
.skill-row:last-child { border-bottom: none; }
.skill-row .s-title { font-size: 13px; font-weight: 500; }
.skill-row .s-age { font-size: 10px; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 3px; }
.skill-row .s-note { font-size: 11px; color: var(--text-dim); margin-top: 6px; line-height: 1.5; }
.shop-row { display: flex; align-items: center; gap: 10px; padding: 10px 18px; font-size: 12px; cursor: pointer; border-bottom: 1px solid var(--border); }
.shop-row:last-child { border-bottom: none; }
.shop-row input { accent-color: var(--accent); width: 16px; height: 16px; flex-shrink: 0; }
.shop-row.done { color: var(--text-dim); text-decoration: line-through; }
.shop-row .s-cat { font-size: 10px; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.06em; margin-left: auto; flex-shrink: 0; }
.wp-day { padding: 10px 18px; border-bottom: 1px solid var(--border); }
.wp-day:last-child { border-bottom: none; }
.wp-day .wp-day-name { font-family: var(--serif); font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.wp-meal { display: flex; gap: 12px; font-size: 12px; padding: 1px 0; }
.wp-lbl { color: var(--text-dim); flex-shrink: 0; min-width: 72px; }
.wp-val { color: var(--text); text-align: right; flex: 1; }
.msg-choices { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.msg-choice { background: none; border: 1px solid var(--accent); color: var(--accent); border-radius: 20px; padding: 3px 12px; font-size: 11px; cursor: pointer; font-family: var(--sans); }
.msg-choice:hover { background: var(--accent); color: #fff; }

.modal-overlay { position: fixed; inset: 0; background: rgba(33,29,24,0.3); backdrop-filter: blur(2px); z-index: 9999; display: flex; align-items: center; justify-content: center; }
.modal { background: var(--surface); border-radius: var(--radius); padding: 26px; width: 320px; max-width: 92vw; box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
.modal h3 { font-family: var(--serif); font-size: 19px; font-weight: 500; margin-bottom: 16px; }
.modal-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.modal-btn { padding: 8px 16px; border: none; border-bottom: 1px solid var(--border); background: none; cursor: pointer; font-size: 12px; font-family: var(--sans); color: var(--text-dim); letter-spacing: 0.04em; }
.modal-btn.sel { color: var(--accent); border-bottom-color: var(--accent); }
.modal-inp { width: 100%; padding: 10px 0; border: none; border-bottom: 1px solid var(--border); border-radius: 0; font-size: 13px; font-family: var(--sans); color: var(--text); background: transparent; margin-bottom: 12px; outline: none; }
.modal-inp:focus { border-bottom-color: var(--accent); }
.modal-actions { display: flex; gap: 16px; justify-content: flex-end; margin-top: 8px; }
.modal-actions button { padding: 0; border: none; background: none; cursor: pointer; font-size: 12px; font-family: var(--sans); font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; }
.modal-actions .save { color: var(--accent); } .modal-actions .cancel { color: var(--text-dim); }
.modal-qty { display: flex; align-items: center; gap: 16px; justify-content: center; margin-bottom: 14px; }
.modal-qty button { width: 30px; height: 30px; border: 1px solid var(--border); background: none; cursor: pointer; font-size: 16px; color: var(--accent); }
.modal-qty span { font-size: 20px; font-weight: 500; min-width: 40px; text-align: center; }
.modal-pres { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.period-btns { display: flex; gap: 6px; padding: 8px 18px 6px; border-bottom: 1px solid var(--border); }

.chat-panel { border-top: 1px solid var(--border); flex-shrink: 0; display: flex; flex-direction: column; max-height: 38vh; background: var(--surface); }
.chat-panel.collapsed .chat-msgs, .chat-panel.collapsed .chat-bar { display: none; }
.model-row { display: flex; gap: 14px; padding: 6px 16px 0; }
.model-row button { padding: 0; border: none; background: none; cursor: pointer; font-size: 10px; font-family: var(--sans); letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-soft); }
.model-row button.active { color: var(--accent); }
.model-row .undo { margin-left: auto; letter-spacing: 0; font-size: 13px; }
.model-row .undo:hover, .model-row .collapse:hover { color: var(--accent); }
.model-row .collapse { letter-spacing: 0; font-size: 12px; }
.chat-msgs { flex: 1; overflow-y: auto; padding: 10px 16px 8px; display: flex; flex-direction: column; gap: 6px; min-height: 44px; }
.msg { max-width: 82%; padding: 8px 14px; border-radius: 2px; word-break: break-word; white-space: pre-wrap; font-size: 13px; line-height: 1.5; }
.msg-user { align-self: flex-end; background: var(--accent); color: #fff; }
.msg-agent { align-self: flex-start; border: 1px solid var(--border); color: var(--text); }
.msg.streaming { border-style: dashed; }
.msg-thinking { align-self: flex-start; color: var(--text-soft); font-style: italic; font-size: 12px; }
.chat-bar { display: flex; gap: 10px; padding: 8px 16px 10px; align-items: flex-end; }
.chat-bar textarea { flex: 1; padding: 10px 0; border: none; border-bottom: 1px solid var(--border); border-radius: 0; font-size: 13px; font-family: var(--sans); color: var(--text); background: transparent; outline: none; resize: none; min-height: 36px; max-height: 70px; }
.chat-bar textarea:focus { border-bottom-color: var(--accent); }
.chat-bar .send { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--accent); background: none; color: var(--accent); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .2s; }
.chat-bar .send:hover { background: var(--accent); color: #fff; }
.chat-bar .send.stop { background: var(--accent); color: #fff; }
</style>
<div id="app">
  <div class="brand">
    <div class="mark">Baby Diary</div>
    <div class="name" id="nm">—</div>
    <div class="meta" id="mt"></div>
    <div class="hint" id="ht"></div>
  </div>
  <div class="actions" id="qa"></div>
  <div class="tabs" id="tb"></div>
  <div class="content active" id="c-dash"></div>
  <div class="content" id="c-skills"></div>
  <div class="content" id="c-tips"></div>
  <div class="content" id="c-recipes"></div>
  <div class="content" id="c-spurts"></div>
  <div class="content" id="c-clothes"></div>
  <div class="content" id="c-sad"></div>
  <div class="content" id="c-shopping"></div>
  <div class="chat-panel">
    <div class="model-row"><button id="mp">Pro</button><button id="mf" class="active">Flash</button><button id="cc" class="collapse" title="Свернуть чат">▾</button><button id="cud" class="undo" title="Отменить последний ответ">↶</button></div>
    <div class="chat-msgs" id="cm"></div>
    <div class="chat-bar"><textarea id="ci" placeholder="Написать..." rows="1"></textarea><button class="send" id="csd">→</button></div>
  </div>
</div>
`);
window.PromptUI.ui.activateScripts(document.body);

// ===== State =====
const CHAT_ID = window.__CHAT_ID__;
const CID = localStorage.getItem('pui2_clientId_' + CHAT_ID) || '';
const SEC = localStorage.getItem('pui2_secret_' + CHAT_ID) || '';
let S: any = {};
let dashPeriod = 0; // 0 = сегодня, 3 = за 3 дня, 7 = за 7 дней

function ageStr(bd?: string): string {
  if (!bd) return '';
  const d = Math.floor((Date.now() - new Date(bd).getTime()) / 86400000);
  if (d < 0) return '';
  if (d < 30) return d + ' дн.';
  const m = Math.floor(d / 30);
  if (m < 12) return m + ' мес.';
  const y = Math.floor(m / 12), mo = m % 12;
  return mo ? y + ' г. ' + mo + ' мес.' : y + ' г.';
}
function ageMonths(bd?: string): number {
  if (!bd) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(bd).getTime()) / 2592000000));
}
function fmtTime(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
}
function dayLabel(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts), now = new Date();
  const day0 = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day0(now) - day0(d)) / 86400000);
  if (diff <= 0) return '';
  if (diff === 1) return 'вчера';
  return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2);
}
function dayKey(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function dayTitle(key: string): string {
  const now = new Date();
  if (key === dayKey(now.getTime())) return 'Сегодня';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (key === dayKey(y.getTime())) return 'Вчера';
  const d = new Date(key + 'T00:00:00');
  const wd = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'][d.getDay()];
  return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + ', ' + wd;
}
function durStr(ms: number): string {
  if (ms < 60000) return 'менее 1 мин';
  const m = Math.round(ms / 60000);
  if (m < 60) return m + ' мин';
  return Math.floor(m / 60) + ' ч ' + (m % 60) + ' мин';
}
function timeField(): HTMLInputElement {
  const now = new Date();
  const pad = (n: number) => ('0' + n).slice(-2);
  const inp = el('input', { type: 'datetime-local', class: 'modal-inp', value: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes()) }) as HTMLInputElement;
  return inp;
}
function tsFromTime(t?: string): number {
  if (!t) return Date.now();
  // 'ГГГГ-ММ-ДДTЧЧ:ММ' — парсится как локальное время
  const d = new Date(t);
  if (isNaN(d.getTime())) return Date.now();
  // Запись в будущем (случайный выбор даты) — ставим «сейчас»
  if (d.getTime() > Date.now()) return Date.now();
  return d.getTime();
}

// Empty-state helper: invites user to ask in chat
function emptySection(text: string, prompt: string) {
  const box = el('div', { class: 'empty' }, text);
  const btn = el('button', {}, 'Спросить в чате');
  btn.addEventListener('click', () => { askChat(prompt); });
  append(box, btn);
  return box;
}
function askChat(prompt: string) {
  // Fill input and send directly
  const inp = $('#ci') as HTMLTextAreaElement;
  const sb = $('#csd') as HTMLButtonElement;
  if (inp && sb) {
    inp.value = prompt;
    sb.click();
  }
}

function loadState(): Promise<void> {
  return fetch('/api/chat/' + CHAT_ID + '/state?clientId=' + encodeURIComponent(CID) + '&clientSecret=' + encodeURIComponent(SEC)).then(r => r.json()).then(st => { S = st || {}; renderAll(); }).catch(() => {});
}
function saveState(partial: any): Promise<any> {
  return fetch('/api/chat/' + CHAT_ID + '/state', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: CID, clientSecret: SEC, state: partial }),
  }).then(r => {
    if (!r.ok) {
      console.error('saveState failed:', r.status);
      const me = $('#cm'); if (me) {
        const nb = el('div', { class: 'msg msg-agent' }, 'Не удалось сохранить запись (ошибка ' + r.status + '). Проверьте доступ к дневнику.');
        append(me, nb); me.scrollTo({ top: me.scrollHeight });
      }
      throw new Error('HTTP ' + r.status);
    }
    return r.json();
  }).then(st => { S = st || {}; renderAll(); return st; }).catch(() => {});
}

function renderAll() {
  const d = S.details || {};
  const nm = $('#nm'), mt = $('#mt'), ht = $('#ht');
  if (nm) nm.textContent = S.name || '—';
  if (mt) {
    clear(mt);
    const p: string[] = [];
    const a = ageStr(S.birthDate); if (a) p.push(a);
    if (S.gender) p.push(S.gender);
    if (d.feeding) p.push(d.feeding);
    if (d.allergies && d.allergies !== 'нет' && d.allergies !== 'не обнаружено') p.push('Аллергии');
    for (const s of p) append(mt, el('span', {}, s));
  }
  if (ht) ht.textContent = (S.name && S.birthDate) ? '' : 'Напишите в чат — я помогу заполнить дневник';

  renderDash();
  renderSkills();
  renderTips();
  renderRecipes();
  renderSpurts();
  renderClothes();
  checkDueReminders();
  renderSad();
  renderShopping();
}

// Reusable todo list with checkboxes. todos: [{text, done, section}]
function todoCard(title: string, todos: any[], section?: string) {
  const list = section ? todos.filter((t: any) => t.section === section) : todos;
  if (!list.length) return null;
  const card = el('div', { class: 'card' }); append(card, el('div', { class: 'card-h' }, title));
  for (const t of list) {
    const row = el('div', { class: 'todo-item' + (t.done ? ' done' : '') }, el('input', { type: 'checkbox', checked: !!t.done }), el('span', {}, t.text || t.title || ''));
    (row.querySelector('input') as HTMLInputElement).addEventListener('change', function () { t.done = this.checked; saveState({ todos: todos }); });
    append(card, row);
  }
  return card;
}

function askFooter(prompt: string): HTMLElement {
  const b = el('button', { class: 'ask-btn' }, 'Спросить в чате');
  b.addEventListener('click', () => askChat(prompt));
  return b;
}

function renderSkills() {
  const c = $('#c-skills'); if (!c) return; clear(c);
  const skills = S.skills || [];
  if (!skills.length) { append(c, emptySection('Список навыков ещё не заполнен.', 'Составь список навыков по педиатрическим нормам развития и сразу сохрани его: что ребёнок уже умеет, что осваивает сейчас и что должно появиться в ближайшее время (моторика, речь, социальные навыки, самообслуживание).')); return; }

  const groups: [string, string][] = [['done', 'Уже умеет'], ['current', 'Осваивает сейчас'], ['upcoming', 'Должно появиться']];
  for (const [st, title] of groups) {
    const list = skills.filter((s: any) => (s.status || 'upcoming') === st);
    if (!list.length) continue;
    const card = el('div', { class: 'card' }); append(card, el('div', { class: 'card-h' }, title));
    for (const s of list) {
      const row = el('div', { class: 'skill-row' });
      append(row, el('div', { class: 's-title' }, String(s.skill || s.title || '')));
      append(row, el('div', { class: 's-age' }, 'норма: ' + (s.age || '—')));
      if (s.note) append(row, el('div', { class: 's-note' }, String(s.note)));
      append(card, row);
    }
    append(c, card);
  }
  append(c, askFooter('Обнови список навыков по педиатрическим нормам: что уже умеем, что осваиваем, что должно появиться. Сохрани обновлённый список сразу.'));
}

function renderShopping() {
  const c = $('#c-shopping'); if (!c) return; clear(c);
  const shopping = S.shopping || [];
  const cl = S.clothes || {};
  const hasClothesNeeds = !!(cl.needs && cl.needs.length) || (S.todos || []).some((t: any) => t.section === 'clothes');
  if (!shopping.length && !hasClothesNeeds) { append(c, emptySection('Список покупок пуст.', 'Составь список покупок и сразу сохрани его: продукты на неделю (с учётом меню и рецептов), одежда и что ещё нужно купить.')); return; }

  if (cl.needs?.length) {
    const card = el('div', { class: 'card' }); append(card, el('div', { class: 'card-h' }, 'Одежда к покупке'));
    const bd = el('div', { style: 'padding:10px 18px' });
    for (const n of cl.needs) append(bd, el('span', { class: 'clothes-need' }, n));
    append(card, bd); append(c, card);
  }
  const tc = todoCard('Задачи по одежде', S.todos || [], 'clothes');
  if (tc) append(c, tc);

  const cats: [string, string][] = [['продукты', 'Продукты'], ['одежда', 'Одежда'], ['другое', 'Другое']];
  for (const [cat, title] of cats) {
    const list = shopping.filter((x: any) => (x.category || 'другое') === cat);
    if (!list.length) continue;
    const card = el('div', { class: 'card' }); append(card, el('div', { class: 'card-h' }, title));
    for (const x of list) {
      const row = el('div', { class: 'shop-row' + (x.done ? ' done' : '') }, el('input', { type: 'checkbox', checked: !!x.done }), el('span', {}, x.text || ''), el('span', { class: 's-cat' }, cat));
      (row.querySelector('input') as HTMLInputElement).addEventListener('change', function () { x.done = this.checked; saveState({ shopping }); });
      append(card, row);
    }
    append(c, card);
  }
  append(c, askFooter('Дополни и обнови список покупок: продукты на неделю (с учётом меню), одежда и что ещё нужно купить.'));
}

function renderDash() {
  const c = $('#c-dash'); if (!c) return; clear(c);
  const feeds = S.feeds || [], sleeps = S.sleeps || [], evts = S.events || [], todos = S.todos || [];
  const d = S.details || {};

  // Age-aware notice: precise tracking becomes less relevant as the child grows
  const age = ageMonths(S.birthDate);
  if (age >= 36) {
    const notice = el('div', { class: 'notice' },
      el('div', { class: 'n-title' }, 'Точный учёт уже не так важен'),
      el('div', { class: 'n-text' }, 'С возрастом ребёнка отпадает необходимость поминутно фиксировать каждое кормление, сон и пробуждение. Режим стабилизируется, и вы сами лучше чувствуете потребности. Теперь дневник — это база знаний: рецепты, советы, развитие и подготовка к школе. Пользоваться кнопками учёта можно, но они не обязательны.')
    );
    append(c, notice);
  }

  if (S.birthDate) {
    const card = el('div', { class: 'card' }); append(card, el('div', { class: 'card-h' }, 'Профиль'));
    const rows: [string, string][] = [];
    const a = ageStr(S.birthDate); if (a) rows.push(['Возраст', a]);
    if (S.weight) rows.push(['Вес', S.weight + ' г']);
    if (S.height) rows.push(['Рост', S.height + ' см']);
    if (d.skills) rows.push(['Навыки', String(d.skills)]);
    if (d.sleepPattern) rows.push(['Сон', String(d.sleepPattern)]);
    if (rows.length) for (const [l, v] of rows) append(card, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, l), el('span', { class: 'c-val' }, String(v))));
    append(c, card);
  }

  // Сводка: Навыки
  const sk = S.skills || [];
  const skCard = el('div', { class: 'card' }); append(skCard, el('div', { class: 'card-h' }, 'Навыки'));
  if (!sk.length) {
    append(skCard, el('div', { class: 'empty', style: 'padding:12px' }, 'Список навыков ещё не заполнен'));
    append(skCard, askFooter('Составь список навыков по педиатрическим нормам развития и сразу сохрани его: что ребёнок уже умеет, что осваивает сейчас и что должно появиться в ближайшее время (моторика, речь, социальные навыки, самообслуживание).'));
  } else {
    const skGroups: [string, string][] = [['done', 'Уже умеет'], ['current', 'Осваивает сейчас'], ['upcoming', 'Должно появиться']];
    for (const [st, title] of skGroups) {
      const n = sk.filter((s: any) => (s.status || 'upcoming') === st).length;
      if (n) append(skCard, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, title), el('span', { class: 'c-val' }, String(n))));
    }
    const doneTop = sk.filter((s: any) => (s.status || 'upcoming') === 'done').slice(0, 3);
    if (doneTop.length) {
      const bd = el('div', { style: 'padding:6px 18px 12px' });
      for (const d of doneTop) append(bd, el('span', { class: 'clothes-need' }, String(d.skill || d.title || '')));
      append(skCard, bd);
    }
    const openSk = el('button', { class: 'ask-btn' }, 'Открыть раздел');
    openSk.addEventListener('click', () => { const t = [...document.querySelectorAll('.tab')].find(b => b.textContent === 'Навыки'); if (t) t.click(); });
    append(skCard, openSk);
  }
  append(c, skCard);

  // План на неделю
  const wp = S.weekPlan;
  const wpCard = el('div', { class: 'card' }); append(wpCard, el('div', { class: 'card-h' }, 'План на неделю'));
  if (wp && Array.isArray(wp.days) && wp.days.length) {
    for (const d of wp.days) {
      const day = el('div', { class: 'wp-day' });
      append(day, el('div', { class: 'wp-day-name' }, d.day || ''));
      const meals: [string, unknown][] = [['Завтрак', d.breakfast], ['Обед', d.lunch], ['Ужин', d.dinner], ['Перекус', d.snack]];
      for (const [l, v] of meals) if (v) append(day, el('div', { class: 'wp-meal' }, el('span', { class: 'wp-lbl' }, l), el('span', { class: 'wp-val' }, String(v))));
      if (d.activities) append(day, el('div', { class: 'wp-meal' }, el('span', { class: 'wp-lbl' }, 'Активности'), el('span', { class: 'wp-val' }, String(d.activities))));
      append(wpCard, day);
    }
    append(wpCard, askFooter('Обнови план на неделю: меню с граммовкой, активности. Учти возраст, режим и любимые продукты.'));
  } else {
    append(wpCard, el('div', { class: 'empty', style: 'padding:14px' }, 'Плана пока нет'));
    append(wpCard, askFooter('Составь план на неделю: меню на каждый день (завтрак, обед, ужин, перекус — с граммовкой, на 2–3 дня), прогулки и активности. Учти возраст, режим и любимые продукты. Сохрани в weekPlan.'));
  }
  append(c, wpCard);

  const tc = todoCard('Задачи', todos.filter((t: any) => !t.section));
  if (tc) append(c, tc);

  const all: any[] = [];
  feeds.forEach((e: any, i: number) => all.push({ e, kind: 'feeds', i, icon: '🍼', title: 'Кормление', sub: (e.type || '') + (e.amount ? ' · ' + e.amount + ' мл' : '') }));
  sleeps.forEach((e: any, i: number) => all.push({ e, kind: 'sleeps', i, icon: '😴', title: e.type === 'nap' ? 'Дневной сон' : 'Ночной сон', sub: e.end ? fmtTime(e.timestamp) + '–' + fmtTime(e.end) + ' · ' + durStr(e.end - e.timestamp) : '' }));
  evts.forEach((e: any, i: number) => all.push({ e, kind: 'events', i, icon: /пробужд/i.test(e.title || '') ? '☀️' : /замер/i.test(e.title || '') ? '⚖️' : '📌', title: e.title || 'Событие', sub: e.note || '' }));
  all.sort((a: any, b: any) => (b.e.timestamp || 0) - (a.e.timestamp || 0));

  // Сводка за период (сегодня / 3 дня / 7 дней) — считает клиент, точно
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const t0 = startToday.getTime() - (dashPeriod > 0 ? (dashPeriod - 1) * 86400000 : 0);
  const nFeeds = feeds.filter((e: any) => (e.timestamp || 0) >= t0).length;
  let sleepMs = 0;
  for (const s of sleeps) {
    if ((s.timestamp || 0) < t0) continue;
    const end = s.end || Date.now();
    if (end > (s.timestamp || 0)) sleepMs += end - s.timestamp;
  }
  const nEvts = evts.filter((e: any) => (e.timestamp || 0) >= t0).length;
  const feedAmt = feeds.filter((e: any) => (e.timestamp || 0) >= t0).reduce((a: number, e: any) => a + (e.amount || 0), 0);
  // Сводка видна всегда, когда в дневнике есть хоть какие-то данные (даже если за период пусто — можно переключить период)
  if (feeds.length || sleeps.length || evts.length) {
    const sc = el('div', { class: 'card' }); append(sc, el('div', { class: 'card-h' }, dashPeriod === 0 ? 'Сегодня' : 'За ' + dashPeriod + ' дня'));
    const pbar = el('div', { class: 'period-btns' });
    for (const [v, label] of [['0', 'Сегодня'], ['3', '3 дня'], ['7', '7 дней']] as [string, string][]) {
      const b = el('button', { class: 'modal-btn' + (String(dashPeriod) === v ? ' sel' : '') }, label);
      b.addEventListener('click', () => { dashPeriod = parseInt(v, 10); renderDash(); });
      append(pbar, b);
    }
    append(sc, pbar);
    if (nFeeds) append(sc, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, 'Кормлений'), el('span', { class: 'c-val' }, String(nFeeds))));
    if (feedAmt) append(sc, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, 'Объём'), el('span', { class: 'c-val' }, feedAmt + ' мл')));
    if (sleepMs) append(sc, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, 'Сон'), el('span', { class: 'c-val' }, durStr(sleepMs))));
    if (nEvts) append(sc, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, 'Событий'), el('span', { class: 'c-val' }, String(nEvts))));
    append(c, sc);
  }

  // Напоминания (все невыполненные — просроченные и ближайшие)
  const rems = S.reminders || [];
  const activeRems = rems.filter((r: any) => !r.done);
  if (activeRems.length) {
    const rc = el('div', { class: 'card' }); append(rc, el('div', { class: 'card-h' }, 'Напоминания'));
    for (const r of activeRems) {
      const row = el('div', { class: 'todo-item' + (r.done ? ' done' : '') }, el('input', { type: 'checkbox', checked: !!r.done }), el('span', {}, (r.date ? r.date.slice(5) + ' · ' : '') + (r.text || '')));
      (row.querySelector('input') as HTMLInputElement).addEventListener('change', function () { r.done = this.checked; saveState({ reminders: rems }); });
      append(rc, row);
    }
    append(c, rc);
  }

  if (all.length) {
    const card = el('div', { class: 'card' }); append(card, el('div', { class: 'card-h' }, 'Хроника'));
    let curDay = '';
    for (const it of all.slice(0, 40)) {
      const k = dayKey(it.e.timestamp);
      if (k !== curDay) {
        curDay = k;
        append(card, el('div', { class: 'day-head' }, dayTitle(k)));
      }
      const row = el('div', { class: 'event-row' }, el('span', { class: 'e-ico' }, it.icon), el('span', { class: 'e-time' }, fmtTime(it.e.timestamp)), el('div', {}, el('div', { class: 'e-title' }, it.title), el('div', { class: 'e-sub' }, it.sub)));
      const del = el('button', { class: 'row-del', title: 'Удалить запись' }, '✕');
      del.addEventListener('click', () => {
        if (!confirm('Удалить эту запись?')) return;
        const arr = it.kind === 'feeds' ? (S.feeds || []) : it.kind === 'sleeps' ? (S.sleeps || []) : (S.events || []);
        const next = arr.slice(); next.splice(it.i, 1);
        saveState({ feeds: it.kind === 'feeds' ? next : S.feeds || [], sleeps: it.kind === 'sleeps' ? next : S.sleeps || [], events: it.kind === 'events' ? next : S.events || [] });
      });
      append(row, del);
      append(card, row);
    }
    append(c, card);
  }
  if (!all.length && !todos.length) append(c, el('div', { class: 'empty' }, 'Запишите кормление, сон или спросите в чате.'));
}
function renderTips() {
  const c = $('#c-tips'); if (!c) return; clear(c);
  const tips = S.tips || [];
  if (!tips.length) { append(c, emptySection('Раздел советов пока пуст.', 'Подскажи полезные советы с учётом возраста и привычек ребёнка.')); return; }

  const cats = Array.from(new Set(tips.map((t: any) => t.category || 'Общее')));
  const nav = el('div', { class: 'kb-nav' }); append(nav, el('div', { class: 'kb-group' }, 'Разделы'));
  const btns: HTMLElement[] = [];
  const all = el('button', { class: 'active' }, 'Все советы'); btns.push(all); append(nav, all);
  for (const cat of cats) { const b = el('button', { class: 'depth-0' }, cat); btns.push(b); append(nav, b); }
  append(c, nav);

  const refresh = (activeCat: string) => {
    const list = el('div', { class: 'card' }); append(list, el('div', { class: 'card-h' }, 'Советы' + (activeCat ? ' · ' + activeCat : '')));
    const filtered = tips.filter((t: any) => !activeCat || (t.category || 'Общее') === activeCat);
    for (const t of filtered) {
      const meta = el('div', { class: 'recipe-meta' }); if (t.category) append(meta, el('span', {}, t.category)); for (const tg of t.tags || []) append(meta, el('span', { class: 'tag-chip' }, '#' + tg));
      append(list, el('div', { class: 'tip-card' }, el('div', { class: 't-cat' }, t.category || ''), el('div', { class: 't-title' }, t.title), el('div', { class: 't-text' }, t.text), meta));
    }
    const old = c.querySelector('.card'); if (old) old.remove();
    append(c, list);
  };
  btns.forEach((b, i) => b.addEventListener('click', () => { btns.forEach(x => x.classList.remove('active')); b.classList.add('active'); refresh(i === 0 ? '' : cats[i - 1]); }));
  refresh('');
  append(c, askFooter('Дополни и обнови раздел советов: что ещё полезно знать для этого возраста. Учти текущие данные дневника.'));
}

function renderRecipes() {
  const c = $('#c-recipes'); if (!c) return; clear(c);
  const recipes = S.recipes || [];
  if (!recipes.length) { append(c, emptySection('Рецептов пока нет.', 'Добавь простые рецепты с учётом любимых продуктов ребёнка.')); return; }

  // Collect all tags + categories for nav
  const tags = Array.from(new Set(recipes.flatMap((r: any) => r.tags || [])));
  const cats = Array.from(new Set(recipes.map((r: any) => r.category || 'Без категории')));

  // Nav: category tree + tag filter
  const nav = el('div', { class: 'kb-nav' });
  append(nav, el('div', { class: 'kb-group' }, 'Категории'));
  const catBtns: HTMLElement[] = [];
  const allCat = el('button', { class: 'active' }, 'Все рецепты');
  catBtns.push(allCat); append(nav, allCat);
  for (const cat of cats) { const b = el('button', { class: 'depth-0' }, cat); catBtns.push(b); append(nav, b); }
  if (tags.length) {
    append(nav, el('div', { class: 'kb-group' }, 'Теги'));
    const tagRow = el('div', { class: 'tag-row' });
    const tagBtns: HTMLElement[] = [];
    for (const t of tags) { const chip = el('span', { class: 'tag-chip' }, t); tagBtns.push(chip); append(tagRow, chip); }
    append(nav, tagRow);
    let activeCat = '', activeTag = '';
    const refresh = () => {
      const filtered = recipes.filter((r: any) => {
        const catOk = !activeCat || (r.category || 'Без категории') === activeCat;
        const tagOk = !activeTag || (r.tags || []).includes(activeTag);
        return catOk && tagOk;
      });
      const list = el('div', { class: 'card' }); append(list, el('div', { class: 'card-h' }, 'Рецепты' + (activeCat ? ' · ' + activeCat : '') + (activeTag ? ' · #' + activeTag : '')));
      for (const r of filtered) {
        const meta = el('div', { class: 'recipe-meta' });
        if (r.category) append(meta, el('span', {}, r.category));
        if (r.age) append(meta, el('span', {}, 'Возраст: ' + r.age));
        for (const t of r.tags || []) append(meta, el('span', { class: 'tag-chip' }, '#' + t));
        append(list, el('div', { class: 'recipe-card' }, el('div', { class: 'r-title' }, r.title), el('div', { class: 'r-text' }, r.instructions), el('div', { class: 'r-meta' }, 'Состав: ' + (r.ingredients || []).join(', ')), meta));
      }
      // Replace existing list card if any
      const old = c.querySelector('.card'); if (old) old.remove();
      append(c, list);
    };
    catBtns.forEach((b, i) => b.addEventListener('click', () => { catBtns.forEach(x => x.classList.remove('active')); b.classList.add('active'); activeCat = i === 0 ? '' : cats[i - 1]; refresh(); }));
    tagBtns.forEach((chip) => chip.addEventListener('click', () => { tagBtns.forEach(x => x.classList.remove('active')); chip.classList.add('active'); activeTag = chip.textContent === activeTag ? '' : chip.textContent || ''; refresh(); }));
    append(c, nav); refresh();
  } else {
    append(c, nav);
    catBtns.forEach((b, i) => b.addEventListener('click', () => {
      catBtns.forEach(x => x.classList.remove('active')); b.classList.add('active');
      const cat = i === 0 ? '' : cats[i - 1];
      const list = el('div', { class: 'card' }); append(list, el('div', { class: 'card-h' }, 'Рецепты' + (cat ? ' · ' + cat : '')));
      for (const r of recipes.filter((x: any) => !cat || (x.category || 'Без категории') === cat)) {
        const meta = el('div', { class: 'recipe-meta' }); if (r.category) append(meta, el('span', {}, r.category)); if (r.age) append(meta, el('span', {}, 'Возраст: ' + r.age));
        append(list, el('div', { class: 'recipe-card' }, el('div', { class: 'r-title' }, r.title), el('div', { class: 'r-text' }, r.instructions), el('div', { class: 'r-meta' }, 'Состав: ' + (r.ingredients || []).join(', ')), meta));
      }
      const old = c.querySelector('.card'); if (old) old.remove();
      append(c, list);
    }));
  }
  append(c, askFooter('Дополни раздел рецептов: добавь новые блюда с граммовкой на 2–3 дня. Учти возраст и любимые продукты.'));
}

function renderSpurts() {
  const c = $('#c-spurts'); if (!c) return; clear(c);
  const spurts = S.spurts || [];
  if (!spurts.length) { append(c, emptySection('Скачки роста ещё не заполнены.', 'Составь подробный анализ скачков роста: какой сейчас идёт, какие пройдены, что ждёт дальше — с учётом умений ребёнка.')); return; }

  // Split by status
  const active = spurts.filter((s: any) => s.status === 'active' || s.status === 'now');
  const past = spurts.filter((s: any) => s.status === 'done' || s.status === 'past').slice(-4);
  const upcoming = spurts.filter((s: any) => s.status === 'upcoming' || s.status === 'next').slice(0, 2);

  // ===== ACTIVE (current crisis) — full psychological analysis =====
  if (active.length) {
    const a = active[0];
    const card = el('div', { class: 'card spurt-card active' });
    append(card, el('div', { class: 's-badge' }, 'Сейчас идёт'));
    append(card, el('div', { class: 's-week' }, (a.week ? 'Неделя ' + a.week + ' — ' : '') + (a.label || 'Кризис')));
    if (a.skills) append(card, block('С чем связано', a.skills));
    if (a.crisis) append(card, block('Что происходит', a.crisis));
    if (a.parent) append(card, block('Как себя вести родителям', a.parent));
    if (a.help) append(card, block('Как помочь ребёнку', a.help));
    if (a.desc && !a.crisis) append(card, block('Психологический анализ', a.desc));
    append(c, card);
  }

  // ===== UPCOMING (nearest) =====
  for (const s of upcoming) {
    const card = el('div', { class: 'card spurt-card upcoming' });
    append(card, el('div', { class: 's-badge' }, 'Предстоит'));
    append(card, el('div', { class: 's-week' }, (s.week ? 'Неделя ' + s.week + ' — ' : '') + (s.label || '')));
    if (s.skills) append(card, block('Признаки', s.skills));
    if (s.desc) append(card, block('Ожидайте', s.desc));
    append(c, card);
  }

  // ===== PAST =====
  if (past.length) {
    const card = el('div', { class: 'card' }); append(card, el('div', { class: 'card-h' }, 'Пройденные'));
    for (const s of past) {
      append(card, el('div', { class: 'spurt-card past' }, el('div', { class: 's-badge' }, 'Пройден'), el('div', { class: 's-week' }, (s.week ? 'Неделя ' + s.week + ' — ' : '') + (s.label || '')), (s.skills ? el('div', { class: 's-desc' }, s.skills) : (s.desc ? el('div', { class: 's-desc' }, s.desc) : null))));
    }
    append(c, card);
  }
  append(c, askFooter('Обнови анализ скачков роста: что сейчас идёт, что дальше, с учётом текущих умений.'));
}

function block(title: string, text: any) {
  return el('div', { class: 's-block' }, el('div', { class: 'sb-title' }, title), el('div', { class: 'sb-text' }, String(text)));
}

function renderClothes() {
  const c = $('#c-clothes'); if (!c) return; clear(c);
  const cl = S.clothes || {};
  if (!cl.size && !cl.needs?.length) { append(c, emptySection('Данные о гардеробе отсутствуют.', 'Спроси про размеры одежды и обуви ребёнка и что нужно купить.')); return; }
  const card = el('div', { class: 'card' }); append(card, el('div', { class: 'card-h' }, 'Гардероб'));
  [['Размер', cl.size], ['Обувь', cl.shoe], ['Сезон', cl.season]].forEach(([l, v]) => { if (v) append(card, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, l), el('span', { class: 'c-val' }, String(v)))); });
  if (cl.needs?.length) { const h = el('div', { class: 'card-h' }, 'К покупке'); append(card, h); const bd = el('div', { style: 'padding:10px 18px' }); for (const n of cl.needs) append(bd, el('span', { class: 'clothes-need' }, n)); append(card, bd); }
  append(c, card);

  const tc = todoCard('Задачи по гардеробу', S.todos || [], 'clothes');
  if (tc) append(c, tc);
  append(c, askFooter('Обнови данные о гардеробе: размеры, сезон, что купить (одежда, обувь).'));
}

function renderSad() {
  const c = $('#c-sad'); if (!c) return; clear(c);
  const k = S.kinder || {};
  const hasData = k.name || k.plan || k.schedule || k.group || (k.bag && k.bag.length);
  if (!hasData) { append(c, emptySection('Информация о саде / школе отсутствует.', 'Расскажи про сад или школу: планируется ли, какие документы нужны.')); return; }
  const card = el('div', { class: 'card' }); append(card, el('div', { class: 'card-h' }, 'Сад / Школа'));
  const rows: [string, unknown][] = [];
  if (k.name) rows.push(['Учреждение', k.name]);
  if (k.plan) rows.push(['План', k.plan]);
  if (k.group) rows.push(['Группа', k.group]);
  if (k.teacher) rows.push(['Воспитатель', k.teacher]);
  if (k.schedule) rows.push(['Расписание', k.schedule]);
  for (const [l, v] of rows) append(card, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, l), el('span', { class: 'c-val' }, String(v))));
  if (k.bag && k.bag.length) {
    append(card, el('div', { class: 'card-h' }, 'Собрать в рюкзак'));
    const bd = el('div', { style: 'padding:10px 18px' });
    for (const item of k.bag) append(bd, el('div', { class: 'event-row', style: 'border:none;padding:5px 0' }, el('span', { style: 'font-size:12px;color:var(--text)' }, '• ' + item)));
    append(card, bd);
  }
  append(c, card);

  const tc = todoCard('Подготовка к саду', S.todos || [], 'sad');
  if (tc) append(c, tc);
  append(c, askFooter('Обнови информацию о саде/школе: что нужно, документы, вещи в рюкзак, сроки.'));
}

function setupTabs() {
  const tb = $('#tb'); if (!tb) return;
  const tabs = [['dash', 'Главная'], ['skills', 'Навыки'], ['tips', 'Советы'], ['recipes', 'Рецепты'], ['spurts', 'Скачки'], ['clothes', 'Гардероб'], ['sad', 'Сад'], ['shopping', 'Покупки']];
  const els: HTMLElement[] = [];
  for (const [id, label] of tabs) {
    const b = el('button', { class: 'tab' + (id === 'dash' ? ' active' : '') }, label);
    b.addEventListener('click', () => { els.forEach(x => x.classList.remove('active')); b.classList.add('active'); $$('.content').forEach(x => x.classList.remove('active')); const c = $('#c-' + id); if (c) c.classList.add('active'); });
    append(tb, b); els.push(b);
  }
}

function setupActions() {
  const qa = $('#qa'); if (!qa) return;
  const acts = [['Кормление', showFeed], ['Сон', showSleep], ['Пробуждение', showWake], ['Событие', showEvent], ['Замер', showMeasure]];
  const btns: HTMLElement[] = [];
  for (const [label, fn] of acts) {
    const b = el('button', { class: 'action' }, label);
    b.addEventListener('click', () => { btns.forEach(x => x.classList.remove('sel')); b.classList.add('sel'); (fn as any)(); });
    append(qa, b); btns.push(b);
  }
  // Age-aware: for older children, precise feeding/sleep tracking is less relevant
  const age = ageMonths(S.birthDate);
  if (age >= 36 && btns.length >= 3) {
    btns[0].classList.add('dim'); btns[1].classList.add('dim'); btns[2].classList.add('dim');
  }
}
function modal(title: string, bodyFn: (b: HTMLElement) => void, onSave: () => void) {
  const ov = el('div', { class: 'modal-overlay' }), md = el('div', { class: 'modal' }), bd = el('div', {});
  const ac = el('div', { class: 'modal-actions' }, el('button', { class: 'cancel' }, 'Отмена'), el('button', { class: 'save' }, 'Сохранить'));
  append(md, el('h3', {}, title), bd, ac); append(ov, md); append(document.body, ov);
  bodyFn(bd);
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter') { const s = ac.querySelector('.save'); if (s) (s as HTMLElement).click(); }
  };
  document.addEventListener('keydown', onKey);
  ac.querySelector('.save')!.addEventListener('click', () => { onSave(); close(); });
  ac.querySelector('.cancel')!.addEventListener('click', close);
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
}
function showFeed() {
  let ty = 'грудное', am = 0;
  const tf = timeField();
  modal('Кормление', (b) => {
    const btns = el('div', { class: 'modal-btns' });
    const ts = ['грудное', 'смесь', 'прикорм'], ls = ['Грудное', 'Смесь', 'Прикорм'];
    const be: HTMLElement[] = [];
    let qty: HTMLElement, pres: HTMLElement;
    const sync = () => { const show = ty !== 'грудное'; qty.style.display = show ? 'flex' : 'none'; pres.style.display = show ? 'flex' : 'none'; };
    for (let i = 0; i < ts.length; i++) {
      const btn = el('button', { class: 'modal-btn' + (ts[i] === ty ? ' sel' : '') }, ls[i]);
      btn.addEventListener('click', () => { be.forEach(x => x.classList.remove('sel')); btn.classList.add('sel'); ty = ts[i]; sync(); });
      append(btns, btn); be.push(btn);
    }
    qty = el('div', { class: 'modal-qty' }, el('button', {}, '−'), el('span', {}, '0 мл'), el('button', {}, '+'));
    const sp = qty.querySelector('span')!;
    const setAm = (v: number) => { am = Math.max(0, v); sp.textContent = am + ' мл'; };
    (qty.querySelectorAll('button')[0] as HTMLElement).addEventListener('click', () => setAm(am - 10));
    (qty.querySelectorAll('button')[1] as HTMLElement).addEventListener('click', () => setAm(am + 10));
    pres = el('div', { class: 'modal-pres' });
    for (const v of [30, 60, 90, 120, 150]) {
      const p = el('button', { class: 'modal-btn' }, v + ' мл');
      p.addEventListener('click', () => setAm(v));
      append(pres, p);
    }
    sync();
    append(b, btns, qty, pres, tf);
  }, () => { saveState({ feeds: [{ type: ty, amount: am, timestamp: tsFromTime(tf.value) }] }); });
}
function showSleep() {
  let t = 'nap';
  const tf = timeField();
  modal('Сон', (b) => {
    const btns = el('div', { class: 'modal-btns' });
    const ts = ['nap', 'night'], ls = ['Дневной', 'Ночной'];
    const be: HTMLElement[] = [];
    for (let i = 0; i < ts.length; i++) {
      const btn = el('button', { class: 'modal-btn' + (ts[i] === t ? ' sel' : '') }, ls[i]);
      btn.addEventListener('click', () => { be.forEach(x => x.classList.remove('sel')); btn.classList.add('sel'); t = ts[i]; });
      append(btns, btn); be.push(btn);
    }
    append(b, btns, tf);
    const open = (S.sleeps || []).filter((s: any) => !s.end).pop();
    if (open) {
      append(b, el('div', { class: 'notice', style: 'padding:10px 14px' }, 'Есть незакрытый сон с ' + fmtTime(open.timestamp) + ' — нажмите «Пробуждение», чтобы закрыть его, и длительность посчитается сама.'));
    }
  }, () => { saveState({ sleeps: [{ type: t, timestamp: tsFromTime(tf.value) }] }); });
}
function showWake() {
  // Закрываем последний незакрытый сон (длительность = до пробуждения)
  const sleeps = (S.sleeps || []).slice();
  const last = [...sleeps].reverse().find((s: any) => !s.end);
  if (last) last.end = Date.now();
  saveState({ sleeps, events: [{ title: 'Пробуждение', timestamp: Date.now() }] });
}
function showEvent() { let ti = '', nt = ''; const tf = timeField(); modal('Событие', (b) => { const t = el('input', { class: 'modal-inp', placeholder: 'Название' }); t.addEventListener('input', () => { ti = (t as HTMLInputElement).value; }); const n = el('input', { class: 'modal-inp', placeholder: 'Заметки' }); n.addEventListener('input', () => { nt = (n as HTMLInputElement).value; }); append(b, tf, t, n); }, () => { saveState({ events: [{ title: ti || 'Событие', note: nt, timestamp: tsFromTime(tf.value) }] }); }); }
function showMeasure() {
  let w = '', h = '';
  const tf = timeField();
  modal('Замер', (b) => {
    const wi = el('input', { class: 'modal-inp', type: 'number', placeholder: 'Вес, г (напр. 7800)', min: '0', step: '10' });
    wi.addEventListener('input', () => { w = (wi as HTMLInputElement).value; });
    const hi = el('input', { class: 'modal-inp', type: 'number', placeholder: 'Рост, см (напр. 68)', min: '0', step: '0.5' });
    hi.addEventListener('input', () => { h = (hi as HTMLInputElement).value; });
    append(b, tf, wi, hi);
  }, () => {
    const note = [w ? w + ' г' : '', h ? h + ' см' : ''].filter(Boolean).join(' · ');
    if (!note) return;
    const upd: any = { events: [{ title: 'Замер', note, timestamp: tsFromTime(tf.value) }] };
    if (w) upd.weight = Math.round(parseFloat(w));
    if (h) upd.height = Math.round(parseFloat(h) * 10) / 10;
    saveState(upd);
  });
}

function setupChat() {
  const me = $('#cm'), inp = $('#ci') as HTMLTextAreaElement, sb = $('#csd') as HTMLButtonElement;
  if (!me || !inp || !sb) return;
  function r(m: any) {
    const bub = el('div', { class: 'msg msg-' + m.role });
    append(bub, document.createTextNode(m.text || ''));
    if (m.choices && m.choices.length) {
      const row = el('div', { class: 'msg-choices' });
      for (const ch of m.choices) {
        const b = el('button', { class: 'msg-choice' }, ch);
        b.addEventListener('click', () => {
          if (/свой вариант/i.test(ch)) { inp.focus(); inp.placeholder = 'Ваш вариант...'; me.scrollTo({ top: me.scrollHeight }); return; }
          inp.value = 'Ответ: ' + ch; sb.click();
        });
        append(row, b);
      }
      append(bub, row);
    }
    return bub;
  }
  function sc() { me!.scrollTo({ top: me!.scrollHeight, behavior: 'smooth' }); }
  const ms = window.PromptUI.messages.get(); for (const m of ms) { append(me, r(m)); } sc();
  let st: HTMLElement | null = null, stBuf = '';
  window.PromptUI.messages.on('add', (m) => { if (st) { st.remove(); st = null; stBuf = ''; } append(me, r(m as any)); sc(); });
  window.PromptUI.messages.on('stream', (chunk) => {
    if (typeof chunk !== 'string') return;
    if (!chunk) { if (st) { st.remove(); st = null; stBuf = ''; } return; }
    if (!st) { st = el('div', { class: 'msg msg-agent streaming' }); append(me, st); sc(); }
    stBuf += chunk; st.textContent = stBuf; sc();
  });
  let dt: HTMLElement | null = null;
  window.PromptUI.messages.on('thinking', (v) => { if (v) { dt = el('div', { class: 'msg msg-thinking' }, '...'); append(me, dt); sc(); } else if (dt) { dt.remove(); dt = null; } });
  window.PromptUI.messages.on('add', () => { if (dt) { dt.remove(); dt = null; } });
  if (window.PromptUI.messages.thinking) { dt = el('div', { class: 'msg msg-thinking' }, '...'); append(me, dt); sc(); }

  let mdl = 'deepseek-chat';
  const mp = $('#mp'), mf = $('#mf');
  if (mp && mf) {
    const setMd = (m: string) => { mdl = m; mp.classList.toggle('active', m === 'deepseek-v4-pro'); mf.classList.toggle('active', m !== 'deepseek-v4-pro'); };
    mp.addEventListener('click', () => setMd('deepseek-v4-pro'));
    mf.addEventListener('click', () => setMd('deepseek-chat'));
  }
  const cu = $('#cud');
  if (cu) cu.addEventListener('click', () => { window.PromptUI.messages.undo(); });
  const cc = $('#cc');
  if (cc) cc.addEventListener('click', () => {
    const p = document.querySelector('.chat-panel');
    if (!p) return;
    const collapsed = p.classList.toggle('collapsed');
    cc.textContent = collapsed ? '▴' : '▾';
  });
  function doSend(txt: string) {
    if (window.PromptUI.messages.thinking) {
      fetch('/chat/' + CHAT_ID + '/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: CID, clientSecret: SEC }) });
    } else {
      fetch('/chat/' + CHAT_ID + '/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: CID, clientSecret: SEC, prompt: txt, model: mdl }) })
        .then((r) => {
          if (!r.ok) {
            // Не потерять текст пользователя: вернуть его в поле и показать причину
            inp.value = txt; inp.style.height = 'auto'; inp.style.height = Math.min(70, inp.scrollHeight) + 'px';
            return r.json().then((j) => { throw new Error((j && j.error) || ('HTTP ' + r.status)); }).catch(() => { throw new Error('HTTP ' + r.status); });
          }
        })
        .catch((e) => {
          console.error('send failed:', e);
          const nb = el('div', { class: 'msg msg-agent' }, 'Не удалось отправить сообщение (' + (e.message || 'ошибка') + '). Текст возвращён в поле ввода.');
          append(me, nb); sc();
        });
    }
  }
  sb.addEventListener('click', () => { const t = inp.value.trim(); if (t) doSend(t); inp.value = ''; inp.style.height = 'auto'; });
  inp.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) { (e as KeyboardEvent).preventDefault(); sb.click(); } });
  inp.addEventListener('input', () => { inp.style.height = 'auto'; inp.style.height = Math.min(70, inp.scrollHeight) + 'px'; });
  window.PromptUI.messages.on('thinking', (v) => { sb.textContent = v ? '■' : '→'; sb.classList.toggle('stop', !!v); });
  if (window.PromptUI.messages.thinking) { sb.textContent = '■'; sb.classList.add('stop'); }
}

setupTabs();
setupActions();
setupChat();
loadState();
window.__runtime_subscribe('/chat/state', (raw: string) => {
  try { const d = JSON.parse(raw); if (d.type === 'state' && d.state) { S = d.state; renderAll(); } } catch { /* ignore */ }
});

// ─── Напоминания: уведомления (Notification API) ───
// Проверка при каждом обновлении state (renderAll) + каждые 60 сек.
// Срабатывают reminders с датой <= сегодня и !done; повторная отправка
// одного и того же исключается localStorage-флагом (bd_notified_v1).
const NOTIF_KEY = 'bd_notified_v1';
function notifiedSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]')); } catch { return new Set(); }
}
function saveNotified(s: Set<string>) {
  try { localStorage.setItem(NOTIF_KEY, JSON.stringify([...s].slice(-200))); } catch { /* ignore */ }
}
function checkDueReminders() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const rems = (S.reminders || []) as any[];
  if (!rems.length) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const seen = notifiedSet();
  let changed = false;
  for (const r of rems) {
    if (r.done || !r.date || typeof r.date !== 'string') continue; // без даты — чек-лист, не будильник
    const d = new Date(r.date + 'T00:00:00');
    if (isNaN(d.getTime()) || d.getTime() > today.getTime()) continue; // будущее — ждём
    const key = r.date + '|' + (r.text || '');
    if (seen.has(key)) continue;
    try { new Notification('Baby Diary', { body: r.text || 'Напоминание', tag: 'bd:' + key }); } catch { /* ignore */ }
    seen.add(key); changed = true;
  }
  if (changed) saveNotified(seen);
}
function requestNotifPermission() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
  try { Notification.requestPermission(); } catch { /* ignore */ }
}
requestNotifPermission();
// Повторный запрос разрешения при первом взаимодействии (если браузер его требует)
window.addEventListener('pointerdown', function once() {
  requestNotifPermission();
  window.removeEventListener('pointerdown', once);
});
setInterval(checkDueReminders, 60000);
