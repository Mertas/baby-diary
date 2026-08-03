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

.actions { display: flex; gap: 0; padding: 14px 24px 12px; flex-shrink: 0; justify-content: center; border-bottom: 1px solid var(--border); }
.action { background: none; border: none; border-bottom: 1px solid transparent; padding: 6px 16px; font-family: var(--sans); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); cursor: pointer; transition: all .2s; }
.action:hover { color: var(--accent); }
.action.sel { color: var(--accent); border-bottom-color: var(--accent); }

.tabs { display: flex; padding: 0 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.tab { padding: 10px 14px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; color: var(--text-dim); border-bottom: 2px solid transparent; background: none; border-top: none; border-left: none; border-right: none; font-family: var(--sans); font-weight: 500; }
.tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab:hover { color: var(--text); }

.content { flex: 1; overflow-y: auto; padding: 14px 18px; display: none; }
.content.active { display: block; }

.card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 10px; }
.card-h { padding: 12px 18px 8px; font-family: var(--serif); font-size: 15px; font-weight: 500; color: var(--text); letter-spacing: 0.02em; border-bottom: 1px solid var(--border); }
.event-row { display: flex; gap: 12px; padding: 10px 18px; align-items: baseline; border-bottom: 1px solid var(--border); }
.event-row:last-child { border-bottom: none; }
.event-row .e-time { font-size: 11px; color: var(--text-soft); font-variant-numeric: tabular-nums; flex-shrink: 0; min-width: 40px; }
.event-row .e-title { font-size: 13px; font-weight: 500; }
.event-row .e-sub { font-size: 11px; color: var(--text-dim); }
.empty { text-align: center; padding: 36px 16px; color: var(--text-dim); font-size: 13px; font-family: var(--serif); font-style: italic; }
.empty button { display: block; margin: 14px auto 0; background: none; border: none; border-bottom: 1px solid var(--accent); color: var(--accent); cursor: pointer; font-size: 11px; font-family: var(--sans); letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 0; font-style: normal; }

.tip-card { padding: 12px 18px; border-bottom: 1px solid var(--border); }
.tip-card:last-child { border-bottom: none; }
.tip-card .t-cat { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 3px; }
.tip-card .t-title { font-family: var(--serif); font-size: 16px; font-weight: 500; margin-bottom: 3px; }
.tip-card .t-text { font-size: 12px; color: var(--text-dim); line-height: 1.55; }

.recipe-card { padding: 12px 18px; border-bottom: 1px solid var(--border); }
.recipe-card:last-child { border-bottom: none; }
.recipe-card .r-title { font-family: var(--serif); font-size: 16px; font-weight: 500; margin-bottom: 4px; }
.recipe-card .r-text { font-size: 12px; color: var(--text-dim); line-height: 1.55; margin-bottom: 6px; }
.recipe-card .r-meta { font-size: 10px; color: var(--text-soft); letter-spacing: 0.04em; }

.spurt-card { padding: 18px 20px; border-bottom: 1px solid var(--border); }
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

.clothes-row { display: flex; justify-content: space-between; padding: 9px 18px; font-size: 12px; border-bottom: 1px solid var(--border); }
.clothes-row:last-child { border-bottom: none; }
.clothes-row .c-lbl { color: var(--text-dim); } .clothes-row .c-val { font-weight: 500; }
.clothes-need { display: inline-block; border: 1px solid var(--border); padding: 3px 10px; font-size: 11px; margin: 3px; color: var(--text); }

.todo-item { display: flex; align-items: center; gap: 10px; padding: 9px 18px; font-size: 12px; cursor: pointer; border-bottom: 1px solid var(--border); }
.todo-item:last-child { border-bottom: none; }
.todo-item input { accent-color: var(--accent); width: 14px; height: 14px; }
.todo-item.done { color: var(--text-dim); text-decoration: line-through; }

/* Knowledge base: tags, categories, tree */
.kb-nav { padding: 8px 4px; border-bottom: 1px solid var(--border); }
.kb-nav button { display: block; width: 100%; text-align: left; padding: 6px 14px; border: none; background: none; cursor: pointer; font-family: var(--sans); font-size: 12px; color: var(--text-dim); letter-spacing: 0.02em; }
.kb-nav button:hover { color: var(--text); }
.kb-nav button.active { color: var(--accent); font-weight: 500; }
.kb-nav .depth-1 { padding-left: 30px; }
.kb-nav .depth-2 { padding-left: 46px; }
.kb-nav .kb-group { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-soft); padding: 8px 14px 4px; }
.tag-chip { display: inline-block; border: 1px solid var(--border); border-radius: 20px; padding: 2px 10px; font-size: 10px; color: var(--text-dim); margin: 2px 3px 0 0; cursor: pointer; }
.tag-chip:hover { border-color: var(--accent); color: var(--accent); }
.tag-chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.tag-row { padding: 8px 14px 4px; }
.recipe-meta { font-size: 10px; color: var(--text-soft); display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.notice { background: var(--accent-soft); border: 1px solid var(--accent); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 10px; }
.notice .n-title { font-family: var(--serif); font-size: 15px; color: var(--accent); margin-bottom: 4px; }
.notice .n-text { font-size: 12px; color: var(--text); line-height: 1.55; }
.actions .action.dim { opacity: 0.4; }

.modal-overlay { position: fixed; inset: 0; background: rgba(33,29,24,0.3); backdrop-filter: blur(2px); z-index: 9999; display: flex; align-items: center; justify-content: center; }
.modal { background: var(--surface); border-radius: var(--radius); padding: 26px; width: 320px; max-width: 92vw; box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
.modal h3 { font-family: var(--serif); font-size: 19px; font-weight: 500; margin-bottom: 16px; }
.modal-btns { display: flex; gap: 0; flex-wrap: wrap; margin-bottom: 12px; }
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

.chat-panel { border-top: 1px solid var(--border); flex-shrink: 0; display: flex; flex-direction: column; max-height: 38vh; background: var(--surface); }
.model-row { display: flex; gap: 14px; padding: 6px 14px 0; }
.model-row button { padding: 0; border: none; background: none; cursor: pointer; font-size: 10px; font-family: var(--sans); letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-soft); }
.model-row button.active { color: var(--accent); }
.chat-msgs { flex: 1; overflow-y: auto; padding: 8px 14px; display: flex; flex-direction: column; gap: 6px; min-height: 44px; }
.msg { max-width: 82%; padding: 8px 14px; border-radius: 2px; word-break: break-word; font-size: 13px; line-height: 1.5; }
.msg-user { align-self: flex-end; background: var(--accent); color: #fff; }
.msg-agent { align-self: flex-start; border: 1px solid var(--border); color: var(--text); }
.msg-thinking { align-self: flex-start; color: var(--text-soft); font-style: italic; font-size: 12px; }
.chat-bar { display: flex; gap: 10px; padding: 8px 14px 10px; align-items: flex-end; }
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
  <div class="content" id="c-tips"></div>
  <div class="content" id="c-recipes"></div>
  <div class="content" id="c-spurts"></div>
  <div class="content" id="c-clothes"></div>
  <div class="content" id="c-sad"></div>
  <div class="chat-panel">
    <div class="model-row"><button id="mp" class="active">Pro</button><button id="mf">Flash</button></div>
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

function ageStr(bd?: string): string {
  if (!bd) return '';
  const d = Math.floor((Date.now() - new Date(bd).getTime()) / 86400000);
  if (d < 0) return '';
  if (d < 30) return d + ' дн.';
  const m = Math.floor(d / 30);
  return m < 24 ? m + ' мес.' : Math.floor(m / 12) + ' г.';
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
  return fetch('/api/chat/' + CHAT_ID + '/state').then(r => r.json()).then(st => { S = st || {}; renderAll(); }).catch(() => {});
}
function saveState(partial: any): Promise<any> {
  return fetch('/api/chat/' + CHAT_ID + '/state', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: CID, clientSecret: SEC, state: partial }),
  }).then(r => r.json()).then(st => { S = st || {}; renderAll(); return st; }).catch(() => {});
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
  renderTips();
  renderRecipes();
  renderSpurts();
  renderClothes();
  renderSad();
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

  const tc = todoCard('Задачи', todos);
  if (tc) append(c, tc);

  const all: any[] = [];
  feeds.forEach((e: any) => all.push({ ...e, title: 'Кормление', sub: (e.type || '') + (e.amount ? ' · ' + e.amount + ' мл' : '') }));
  sleeps.forEach((e: any) => all.push({ ...e, title: e.type === 'nap' ? 'Дневной сон' : 'Ночной сон', sub: '' }));
  evts.forEach((e: any) => all.push({ ...e, title: e.title || 'Событие', sub: e.note || '' }));
  all.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
  if (all.length) {
    const card = el('div', { class: 'card' }); append(card, el('div', { class: 'card-h' }, 'Хроника'));
    for (const e of all.slice(0, 30)) {
      append(card, el('div', { class: 'event-row' }, el('span', { class: 'e-time' }, fmtTime(e.timestamp)), el('div', {}, el('div', { class: 'e-title' }, e.title), el('div', { class: 'e-sub' }, e.sub))));
    }
    append(c, card);
  }
  if (!all.length && !todos.length) append(c, el('div', { class: 'empty' }, 'Запишите кормление, сон или спросите в чате.'));
}
function renderTips() {
  const c = $('#c-tips'); if (!c) return; clear(c);
  const tips = S.tips || [];
  if (!tips.length) { append(c, emptySection('Раздел советов пока пуст.', 'Подскажи полезные советы для ' + (S.name || 'ребёнка') + ' с учётом его возраста и привычек.')); return; }

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
}

function renderRecipes() {
  const c = $('#c-recipes'); if (!c) return; clear(c);
  const recipes = S.recipes || [];
  if (!recipes.length) { append(c, emptySection('Рецептов пока нет.', 'Добавь простые рецепты для ' + (S.name || 'ребёнка') + ' с учётом его любимых продуктов.')); return; }

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
}

function renderSpurts() {
  const c = $('#c-spurts'); if (!c) return; clear(c);
  const spurts = S.spurts || [];
  if (!spurts.length) { append(c, emptySection('Скачки роста ещё не заполнены.', 'Составь подробный анализ скачков роста для ' + (S.name || 'ребёнка') + ': какой сейчас идёт, какие пройдены, что ждёт дальше — с учётом его умений.')); return; }

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
}

function block(title: string, text: any) {
  return el('div', { class: 's-block' }, el('div', { class: 'sb-title' }, title), el('div', { class: 'sb-text' }, String(text)));
}

function renderClothes() {
  const c = $('#c-clothes'); if (!c) return; clear(c);
  const cl = S.clothes || {};
  if (!cl.size && !cl.needs?.length) { append(c, emptySection('Данные о гардеробе отсутствуют.', 'Спроси про размеры одежды и обуви ' + (S.name || 'ребёнка') + ' и что нужно купить.')); return; }
  const card = el('div', { class: 'card' }); append(card, el('div', { class: 'card-h' }, 'Гардероб'));
  [['Размер', cl.size], ['Обувь', cl.shoe], ['Сезон', cl.season]].forEach(([l, v]) => { if (v) append(card, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, l), el('span', { class: 'c-val' }, String(v)))); });
  if (cl.needs?.length) { const h = el('div', { class: 'card-h' }, 'К покупке'); append(card, h); const bd = el('div', { style: 'padding:10px 18px' }); for (const n of cl.needs) append(bd, el('span', { class: 'clothes-need' }, n)); append(card, bd); }
  append(c, card);

  const tc = todoCard('Задачи по гардеробу', S.todos || [], 'clothes');
  if (tc) append(c, tc);
}

function renderSad() {
  const c = $('#c-sad'); if (!c) return; clear(c);
  const k = S.kinder || {};
  const hasData = k.name || k.plan || k.schedule || k.group || (k.bag && k.bag.length);
  if (!hasData) { append(c, emptySection('Информация о саде / школе отсутствует.', 'Расскажи про сад или школу ' + (S.name || 'ребёнка') + ': планируется ли, какие документы нужны.')); return; }
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
}

function setupTabs() {
  const tb = $('#tb'); if (!tb) return;
  const tabs = [['dash', 'Главная'], ['tips', 'Советы'], ['recipes', 'Рецепты'], ['spurts', 'Скачки'], ['clothes', 'Гардероб'], ['sad', 'Сад']];
  const els: HTMLElement[] = [];
  for (const [id, label] of tabs) {
    const b = el('button', { class: 'tab' + (id === 'dash' ? ' active' : '') }, label);
    b.addEventListener('click', () => { els.forEach(x => x.classList.remove('active')); b.classList.add('active'); $$('.content').forEach(x => x.classList.remove('active')); const c = $('#c-' + id); if (c) c.classList.add('active'); });
    append(tb, b); els.push(b);
  }
}

function setupActions() {
  const qa = $('#qa'); if (!qa) return;
  const acts = [['Кормление', showFeed], ['Сон', showSleep], ['Пробуждение', showWake], ['Событие', showEvent]];
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
  ac.querySelector('.save')!.addEventListener('click', () => { onSave(); ov.remove(); });
  ac.querySelector('.cancel')!.addEventListener('click', () => ov.remove());
  ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
}
function showFeed() { let ty = 'грудное', am = 0; modal('Кормление', (b) => { const btns = el('div', { class: 'modal-btns' }); const ts = ['грудное', 'смесь', 'прикорм']; const ls = ['Грудное', 'Смесь', 'Прикорм']; const be: HTMLElement[] = []; for (let i = 0; i < ts.length; i++) { const btn = el('button', { class: 'modal-btn' + (ts[i] === ty ? ' sel' : '') }, ls[i]); btn.addEventListener('click', () => { be.forEach(x => x.classList.remove('sel')); btn.classList.add('sel'); ty = ts[i]; }); append(btns, btn); be.push(btn); } const qty = el('div', { class: 'modal-qty' }, el('button', {}, '−'), el('span', {}, '0 мл'), el('button', {}, '+')); const sp = qty.querySelector('span')!; (qty.querySelectorAll('button')[0] as HTMLElement).addEventListener('click', () => { am = Math.max(0, am - 10); sp.textContent = am + ' мл'; }); (qty.querySelectorAll('button')[1] as HTMLElement).addEventListener('click', () => { am += 10; sp.textContent = am + ' мл'; }); append(b, btns, qty); }, () => { saveState({ feeds: [{ type: ty, amount: am, timestamp: Date.now() }] }); }); }
function showSleep() { let t = 'nap'; modal('Сон', (b) => { const btns = el('div', { class: 'modal-btns' }); const ts = ['nap', 'night']; const ls = ['Дневной', 'Ночной']; const be: HTMLElement[] = []; for (let i = 0; i < ts.length; i++) { const btn = el('button', { class: 'modal-btn' + (ts[i] === t ? ' sel' : '') }, ls[i]); btn.addEventListener('click', () => { be.forEach(x => x.classList.remove('sel')); btn.classList.add('sel'); t = ts[i]; }); append(btns, btn); be.push(btn); } append(b, btns); }, () => { saveState({ sleeps: [{ type: t, timestamp: Date.now() }] }); }); }
function showWake() { saveState({ events: [{ title: 'Пробуждение', timestamp: Date.now() }] }); }
function showEvent() { let ti = '', nt = ''; modal('Событие', (b) => { const t = el('input', { class: 'modal-inp', placeholder: 'Название' }); t.addEventListener('input', () => { ti = (t as HTMLInputElement).value; }); const n = el('input', { class: 'modal-inp', placeholder: 'Заметки' }); n.addEventListener('input', () => { nt = (n as HTMLInputElement).value; }); append(b, t, n); }, () => { saveState({ events: [{ title: ti || 'Событие', note: nt, timestamp: Date.now() }] }); }); }

function setupChat() {
  const me = $('#cm'), inp = $('#ci') as HTMLTextAreaElement, sb = $('#csd') as HTMLButtonElement;
  if (!me || !inp || !sb) return;
  function r(m: any) { return el('div', { class: 'msg msg-' + m.role }, m.text); }
  function sc() { me!.scrollTo({ top: me!.scrollHeight, behavior: 'smooth' }); }
  const ms = window.PromptUI.messages.get(); for (const m of ms) { append(me, r(m)); } sc();
  window.PromptUI.messages.on('add', (m) => { append(me, r(m as any)); sc(); });
  let dt: HTMLElement | null = null;
  window.PromptUI.messages.on('thinking', (v) => { if (v) { dt = el('div', { class: 'msg msg-thinking' }, '...'); append(me, dt); sc(); } else if (dt) { dt.remove(); dt = null; } });
  window.PromptUI.messages.on('add', () => { if (dt) { dt.remove(); dt = null; } });
  if (window.PromptUI.messages.thinking) { dt = el('div', { class: 'msg msg-thinking' }, '...'); append(me, dt); sc(); }

  let mdl = 'deepseek-v4-pro';
  const mp = $('#mp'), mf = $('#mf');
  if (mp && mf) {
    const setMd = (m: string) => { mdl = m; mp.classList.toggle('active', m === 'deepseek-v4-pro'); mf.classList.toggle('active', m !== 'deepseek-v4-pro'); };
    mp.addEventListener('click', () => setMd('deepseek-v4-pro'));
    mf.addEventListener('click', () => setMd('deepseek-chat'));
  }
  function doSend(txt: string) {
    if (window.PromptUI.messages.thinking) {
      fetch('/chat/' + CHAT_ID + '/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: CID, clientSecret: SEC }) });
    } else {
      fetch('/chat/' + CHAT_ID + '/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: CID, clientSecret: SEC, prompt: txt, model: mdl }) });
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
