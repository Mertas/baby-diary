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
.modal-btn.danger { color: #c0392b; border-bottom-color: #c0392b; }
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
/* Плашки-нотификации */
.banners { display: flex; flex-direction: column; gap: 6px; padding: 0 16px 10px; }
.banner { display: flex; gap: 8px; align-items: center; border-radius: 8px; padding: 8px 12px; font-size: 13px; background: #fff8e6; border: 1px solid #f0d9a8; }
.banner.imp { background: #fdecea; border-color: #f0b4a8; font-weight: 600; }
.banner .b-ico { font-size: 15px; }
/* Календарь */
.cal-head { display: flex; align-items: center; gap: 6px; padding: 10px 16px; flex-wrap: wrap; }
.cal-head .cal-title { flex: 1; font-weight: 700; font-size: 15px; min-width: 130px; }
.cal-head button { border: 1px solid var(--border); background: none; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; color: var(--text); }
.cal-head button:hover { background: var(--bg-soft, #eef2f7); }
.cal-head .cal-view button.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; padding: 0 12px 12px; }
.cal-dow { text-align: center; font-size: 11px; color: var(--text-soft); padding: 4px 0; }
.cal-cell { min-height: 62px; border: 1px solid var(--border); border-radius: 6px; padding: 3px; font-size: 11px; cursor: pointer; overflow: hidden; }
.cal-cell:hover { background: var(--bg-soft, #eef2f7); }
.cal-cell.other { opacity: .38; }
.cal-cell.today { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.cal-num { font-size: 11px; color: var(--text-soft); }
.cal-cell.today .cal-num { color: var(--accent); font-weight: 700; }
.cal-ev { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 4px; padding: 1px 4px; margin-top: 1px; background: #e8f0fb; }
.cal-ev.imp { background: #fdecea; color: #c0392b; font-weight: 600; }
.cal-ev.rec::after { content: ' 🔁'; }
.cal-ev.done { text-decoration: line-through; opacity: .5; }
.cal-more { font-size: 10px; color: var(--text-soft); }
.cal-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 0 12px 12px; }
.cal-daycol { border: 1px solid var(--border); border-radius: 6px; min-height: 130px; padding: 4px; font-size: 11px; }
.cal-daycol.today { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.cal-daycol h4 { margin: 0 0 4px; font-size: 11px; color: var(--text-soft); font-weight: 600; }
.cal-list { display: flex; flex-direction: column; gap: 3px; }
.cal-item { border-radius: 6px; padding: 4px 6px; font-size: 12px; background: #e8f0fb; }
.cal-item .t { font-weight: 600; display: flex; align-items: center; gap: 6px; }
.cal-item .cal-del { margin-left: auto; border: none; background: none; color: var(--text-soft); cursor: pointer; font-size: 11px; padding: 0 2px; }
.cal-item .cal-del:hover { color: #c0392b; }
/* Вкладки Семья / Бюджет / Помощник / динамические */
.card-h { display: flex; align-items: center; gap: 8px; }
.card-h .cal-del { margin-left: auto; }
.fam-row, .llmn-row, .budget-row { display: flex; align-items: center; gap: 8px; padding: 7px 2px; border-bottom: 1px solid rgba(0,0,0,.05); font-size: 14px; }
.fam-row .fam-ico, .llmn-row .llmn-ico { font-size: 16px; flex: none; }
.fam-row > span:nth-child(2), .llmn-row > span:nth-child(2) { flex: 1; min-width: 0; }
.fam-row .s-cat, .budget-row .s-cat { color: var(--text-dim); font-size: 12px; flex: none; }
.budget-cat { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 2px 4px; font-weight: 700; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--text); }
.budget-row > span:nth-child(2) { margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.card .ask-btn { margin: 12px auto 8px; }
#c-dyn .card { margin-bottom: 12px; }
.cal-item.imp { background: #fdecea; color: #c0392b; }
.cal-day .cal-item { margin-bottom: 4px; }
/* Типы карточек Главной: hero-сводка, тихий профиль, тёплый план, хроника на всю ширину */
.card.hero { border-color: var(--accent); border-top: 3px solid var(--accent); background: linear-gradient(180deg, #fff6ee, var(--card)); }
.card.hero .card-h { background: #f6eee2; }
.hero-stats { display: flex; gap: 28px; padding: 14px 18px 16px; flex-wrap: wrap; }
.hero-stats .hs-v { font-family: var(--serif); font-size: 28px; font-weight: 600; color: var(--accent); line-height: 1.1; }
.hero-stats .hs-l { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); margin-top: 3px; }
.card.quiet { background: rgba(255,253,249,0.55); box-shadow: none; border-color: #e8e1d5; }
.card.week { background: #fffdf4; border-color: #e6dcc0; }
.card.week .card-h { background: #f6eeda; }
.card.span2 { grid-column: 1 / -1; }
/* Хроника: горизонтальный таймлайн — дни дорожками, события по времени суток */
.htl { overflow-x: auto; padding: 12px 18px 4px; }
.htl-grid, .htl-day { position: relative; min-width: 640px; }
.htl-grid { height: 16px; border-bottom: 1px dashed var(--border); }
.htl-h { position: absolute; top: 0; font-size: 10px; color: var(--text-soft); transform: translateX(-50%); }
.htl-day { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
.htl-lbl { width: 112px; flex-shrink: 0; font-size: 12px; color: var(--text-dim); text-align: right; letter-spacing: 0.02em; }
.htl-track { position: relative; flex: 1; height: 44px; border-bottom: 1px solid #f2ede4; background: repeating-linear-gradient(90deg, transparent 0, transparent calc(25% - 1px), #f4efe6 calc(25% - 1px), #f4efe6 25%); }
.htl-ev { position: absolute; top: 50%; cursor: pointer; z-index: 1; }
.htl-ev.feed { width: 14px; height: 14px; border-radius: 50%; background: var(--accent); transform: translate(-50%, -50%); z-index: 5; }
.htl-ev.sleep { height: 18px; border-radius: 9px; background: #5b8def; opacity: 0.85; transform: translateY(-50%); }
.htl-ev.ev { width: 11px; height: 11px; background: #8e6fd8; transform: translate(-50%, -50%) rotate(45deg); z-index: 3; }
/* Полоса сна НИКОГДА не поднимается выше точек (hover — только подсветка) */
.htl-ev.sleep:hover { opacity: 1; cursor: pointer; }
/* Большая зона наведения для точек: невидимый круг 30px */
.htl-ev.feed::after, .htl-ev.ev::after { content: ''; position: absolute; inset: -8px; border-radius: 50%; }
.htl-ev.feed:hover { z-index: 6; transform: translate(-50%, -50%) scale(1.3); box-shadow: 0 0 0 3px rgba(232, 98, 42, 0.15); }
.htl-ev.ev:hover { z-index: 4; transform: translate(-50%, -50%) rotate(0deg) scale(1.3); box-shadow: 0 0 0 3px rgba(142, 111, 216, 0.18); }
.htl-empty { position: absolute; left: 0; top: 50%; transform: translateY(-50%); font-size: 11px; color: #d9d1c3; }
.htl-legend { display: flex; gap: 16px; align-items: center; padding: 4px 18px 10px; font-size: 11px; color: var(--text-soft); }
.htl-legend .lg { display: inline-block; width: 11px; height: 11px; border-radius: 50%; margin-right: 4px; vertical-align: -1px; }
.htl-legend .lg.sleep { height: 9px; border-radius: 5px; background: #5b8def; }
.htl-legend .lg.ev { transform: rotate(45deg); background: #8e6fd8; }
/* Летающий тултип (как в Megabrain2): один общий элемент, перелетает между целями */
.flytip { position: fixed; z-index: 9999; background: #43392e; color: #fdf8ef; font-size: 12px; line-height: 1.5; padding: 8px 12px; border-radius: 9px; max-width: 300px; pointer-events: none; opacity: 0; transition: opacity 0.15s ease, left 0.28s cubic-bezier(0.22, 0.9, 0.3, 1.25), top 0.28s cubic-bezier(0.22, 0.9, 0.3, 1.25); box-shadow: 0 8px 22px rgba(50, 30, 10, 0.28); }
.flytip.on { opacity: 1; white-space: pre-line; }
.flytip::after { content: ''; position: absolute; left: 50%; bottom: -5px; width: 10px; height: 10px; background: #43392e; transform: translateX(-50%) rotate(45deg); border-radius: 2px; }
.flytip.below::after { bottom: auto; top: -5px; }
/* ─── Адаптив: десктоп = контент + чат-сайдбар; планшет/мобайл = одна колонка ─── */
@media (min-width: 1024px) {
  #app { display: grid; grid-template-columns: minmax(0, 1100px) 400px; grid-template-rows: auto auto auto minmax(0, 1fr); max-width: 1560px; margin: 0 auto; border: none; }
  .brand { grid-column: 1; grid-row: 1; text-align: left; padding: 26px 28px 8px; }
  .brand .meta { justify-content: flex-start; }
  .brand .hint { text-align: left; }
  .actions { grid-column: 1; grid-row: 2; justify-content: flex-start; padding: 12px 28px; }
  .tabs { grid-column: 1; grid-row: 3; padding-left: 24px; }
  .content { grid-column: 1; grid-row: 4; padding: 16px 28px 48px; }
  /* Главная: карточки в две колонки, плашки — компактной сеткой */
  #c-dash.active { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 18px; align-items: start; grid-auto-flow: dense; }
  #c-dash .banners { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 0 0 10px; }
  #c-dash .card { margin-bottom: 14px; }
  #c-dash .notice { grid-column: 1 / -1; }
  /* План на неделю: на всю ширину, дни в две колонки, чтобы карточка не вытягивалась */
  #c-dash .card.week { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 18px; align-items: start; }
  #c-dash .card.week .card-h, #c-dash .card.week .ask-btn { grid-column: 1 / -1; }
  /* Текстовые разделы — читаемая ширина, карточки не растягиваются */
  #c-tips, #c-recipes, #c-skills, #c-spurts, #c-clothes, #c-sad, #c-shopping { max-width: 840px; }
  .chat-panel { grid-column: 2; grid-row: 1 / 5; border-top: none; border-left: 1px solid var(--border); max-height: none; }
  .chat-msgs { flex: 1; min-height: 0; }
  .msg { max-width: 88%; }
}
@media (min-width: 768px) and (max-width: 1023px) {
  #app { max-width: 780px; }
}
@media (max-width: 640px) {
  .actions { flex-wrap: wrap; gap: 4px 8px; }
  .action { padding: 6px 10px; }
  .brand .name { font-size: 22px; }
  .banner { font-size: 12px; padding: 7px 10px; }
  .cal-cell { min-height: 44px; }
  #c-calendar { overflow: auto; }
  .cal-week { min-width: 600px; }
  .cal-head { padding: 8px 12px; }
  .cal-head .cal-title { font-size: 14px; }
  .msg { max-width: 92%; }
}
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
  <div class="content" id="c-llmn"></div>
  <div class="content" id="c-family"></div>
  <div class="content" id="c-budget"></div>
  <div id="c-dyn"></div>
  <div class="content" id="c-calendar"></div>
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

function todayRef(): number {
  // «Сегодня» = день мамы (последняя дата из её сообщений), иначе реальная дата
  if (S.lastMomDay) { const d = new Date(S.lastMomDay + 'T00:00:00'); if (!isNaN(d.getTime())) return d.getTime(); }
  return Date.now();
}
function ageStr(bd?: string): string {
  if (!bd) return '';
  const d = Math.floor((todayRef() - new Date(bd).getTime()) / 86400000);
  if (d < 0) return '';
  if (d < 30) return d + ' дн.';
  const m = Math.floor(d / 30);
  if (m < 12) return m + ' мес.';
  const y = Math.floor(m / 12), mo = m % 12;
  return mo ? y + ' г. ' + mo + ' мес.' : y + ' г.';
}
function ageMonths(bd?: string): number {
  if (!bd) return 0;
  return Math.max(0, Math.floor((todayRef() - new Date(bd).getTime()) / 2592000000));
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
  const now = new Date(todayRef());
  if (key === dayKey(now.getTime())) return 'Сегодня';
  const y = new Date(now.getTime()); y.setDate(y.getDate() - 1);
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

let lastTabsKey = '';
function renderAll() {
  // Динамические вкладки: пересоздаём кнопки панели, если набор изменился (добавлена/удалена вкладка)
  const tabsKey = JSON.stringify((S.tabs || []).map((t: any) => t.id));
  if (tabsKey !== lastTabsKey) { lastTabsKey = tabsKey; setupTabs(); }
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
  renderSad();
  renderShopping();
  renderLlmn();
  renderFamily();
  renderBudget();
  renderDynTabs();
  renderCalendar();
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

/* ─── Летающий тултип (как в Megabrain2): один элемент, перелетает между целями ─── */
const flytip = (() => {
  let el: HTMLElement | null = null;
  let hideT = 0;
  function ensure(): HTMLElement {
    if (!el) { el = document.createElement('div'); el.className = 'flytip'; document.body.appendChild(el); }
    return el;
  }
  function place(a: HTMLElement) {
    const t = ensure();
    const r = a.getBoundingClientRect();
    const w = t.offsetWidth || 120;
    const h = t.offsetHeight || 40;
    const above = r.top - h - 10 > 8;
    const x = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
    const y = above ? r.top - h - 10 : r.bottom + 10;
    t.classList.toggle('below', !above); // стрелка вниз (по умолчанию) — тултип над целью; вверх — под целью
    t.style.left = x + 'px';
    t.style.top = y + 'px';
  }
  return {
    show(a: HTMLElement, text: string) {
      clearTimeout(hideT);
      const t = ensure();
      t.textContent = text;
      t.classList.add('on');
      place(a);
    },
    hide() {
      const t = ensure();
      hideT = window.setTimeout(() => { t.classList.remove('on'); }, 80);
    },
  };
})();
let flytipCur: HTMLElement | null = null;
document.addEventListener('mouseover', (ev) => {
  const tgt = ev.target as HTMLElement;
  const t = tgt.closest ? tgt.closest('[data-tip]') as HTMLElement | null : null;
  if (t && t !== flytipCur) {
    flytipCur = t;
    // Кластер на таймлайне: события, пересекающиеся с наведённым, показываем одним тултипом
    if (t.classList.contains('htl-ev')) {
      const track = t.closest('.htl-track');
      const r = t.getBoundingClientRect();
      const near: HTMLElement[] = [];
      if (track) for (const o of track.querySelectorAll('.htl-ev') as unknown as HTMLElement[]) {
        if (o === t) continue;
        const or = o.getBoundingClientRect();
        if (or.left < r.right + 4 && or.right > r.left - 4) near.push(o);
      }
      const lines = [t.getAttribute('data-tip') || '', ...near.map((o) => o.getAttribute('data-tip') || '')];
      lines.sort((a, b) => (a < b ? -1 : 1));
      flytip.show(t, lines.join('\n'));
    } else {
      flytip.show(t, t.getAttribute('data-tip') || '');
    }
  }
});
document.addEventListener('mouseout', (ev) => {
  const tgt = ev.target as HTMLElement;
  const t = tgt.closest ? tgt.closest('[data-tip]') as HTMLElement | null : null;
  if (t && t === flytipCur) {
    const to = ev.relatedTarget as Node | null;
    if (!to || !t.contains(to)) { flytipCur = null; flytip.hide(); }
  }
});

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

function renderLlmn() {
  const c = $('#c-llmn'); if (!c) return; clear(c);
  const notes = S.llmNotes || [];
  if (!notes.length) {
    append(c, emptySection('Помощник ещё не составил свой дополнительный промпт.', 'Это его личные заметки о вашей семье: скажите в чате «Запомни, что…» — и он добавит заметку. Она будет видна здесь и учитываться в каждом его ответе.'));
    return;
  }
  const card = el('div', { class: 'card' });
  append(card, el('div', { class: 'card-h' }, 'Дополнительный промпт помощника'));
  append(card, el('div', { class: 'card-sub' }, 'Заметки, которые помощник сам решил помнить: они подставляются ему в каждый запрос и видны здесь.'));
  const bd = el('div', { style: 'padding: 8px 18px 14px' });
  for (const n of notes) {
    const txt = n && typeof n === 'object' ? (n.note || '') : String(n);
    if (!txt) continue;
    append(bd, el('div', { class: 'llmn-row' }, el('span', { class: 'llmn-ico' }, '🧠'), el('span', {}, txt), delBtn(() => { saveState({ llmNotes: [{ note: txt, _delete: true }] }); })));
  }
  append(card, bd);
  append(c, card);
}

function delBtn(onDel: () => void): HTMLElement {
  const b = el('button', { class: 'cal-del', title: 'Удалить' }, '✕');
  b.addEventListener('click', onDel);
  return b;
}

function renderFamily() {
  const c = $('#c-family'); if (!c) return; clear(c);
  const fam = S.family || [];
  if (!fam.length) { append(c, emptySection('Состав семьи пока не заполнен.', 'Расскажите в чате о семье — я запомню и буду учитывать в советах и планах.')); }
  const card = el('div', { class: 'card' });
  append(card, el('div', { class: 'card-h' }, '👨‍👩‍👧 Состав семьи'));
  const bd = el('div', { style: 'padding: 8px 18px 14px' });
  for (const m of fam) {
    const name = m.name || '—';
    const role = m.role ? ' · ' + m.role : '';
    const note = m.note ? ' — ' + m.note : '';
    const row = el('div', { class: 'fam-row' }, el('span', { class: 'fam-ico' }, '👤'), el('span', {}, name + role + (note ? '' : '')), el('span', { class: 's-cat' }, note), delBtn(() => { saveState({ family: [{ name, _delete: true }] }); }));
    append(bd, row);
  }
  const add = el('button', { class: 'ask-btn' }, '＋ Добавить');
  add.addEventListener('click', () => {
    modal('Добавить члена семьи', (b) => {
      const inp = (ph: string) => { const i = el('input', { placeholder: ph }); i.style.cssText = 'display:block;width:100%;margin:6px 0;padding:6px 8px'; append(b, i); return i; };
      const ni = inp('Имя'), ri = inp('Кто (мама, папа, бабушка…)'), no = inp('Примечание (день рождения, особенности)');
      (window as any).__fam = { ni, ri, no };
    }, () => {
      const { ni, ri, no } = (window as any).__fam;
      const fam2 = [...(S.family || [])];
      fam2.push({ name: ni.value.trim() || '—', role: ri.value.trim() || '', note: no.value.trim() || undefined });
      saveState({ family: fam2 });
    });
  });
  append(card, bd, add);
  append(c, card);
}

function renderBudget() {
  const c = $('#c-budget'); if (!c) return; clear(c);
  const bud = S.budget || [];
  if (!bud.length) { append(c, emptySection('Бюджет пока пуст.', 'Записывайте траты и доходы в чате (например: «купили продукты на 3500») или добавьте вручную.')); }
  const byCat = new Map<string, { income: number; expense: number; items: any[] }>();
  for (const b of bud) {
    const cat = b.category || 'другое';
    if (!byCat.has(cat)) byCat.set(cat, { income: 0, expense: 0, items: [] });
    const g = byCat.get(cat)!;
    if (b.type === 'income') g.income += Number(b.amount) || 0; else g.expense += Number(b.amount) || 0;
    g.items.push(b);
  }
  let totalIn = 0, totalOut = 0;
  for (const g of byCat.values()) { totalIn += g.income; totalOut += g.expense; }
  const card = el('div', { class: 'card' });
  append(card, el('div', { class: 'card-h' }, '💰 Бюджет'));
  append(card, el('div', { class: 'card-sub' }, `Доходы: ${totalIn.toLocaleString('ru-RU')} ₽ · Расходы: ${totalOut.toLocaleString('ru-RU')} ₽ · Остаток: ${(totalIn - totalOut).toLocaleString('ru-RU')} ₽`));
  const bd = el('div', { style: 'padding: 8px 18px 14px' });
  for (const [cat, g] of byCat) {
    append(bd, el('div', { class: 'budget-cat' }, el('span', {}, cat), el('span', { class: 's-cat' }, `${g.expense ? '−' + g.expense.toLocaleString('ru-RU') + ' ₽' : ''}${g.income ? ' +' + g.income.toLocaleString('ru-RU') + ' ₽' : ''}`)));
    for (const it of g.items.slice(-6)) {
      const row = el('div', { class: 'budget-row' },
        el('span', {}, (it.note || it.category || '') + (it.date ? ' · ' + String(it.date).slice(5) : '')),
        el('span', {}, `${it.type === 'income' ? '+' : '−'}${Number(it.amount) || 0} ₽`),
        delBtn(() => {
          if (it.id) saveState({ budget: [{ id: it.id, _delete: true }] });
          else saveState({ budget: [{ note: it.note || '', category: it.category || '', amount: it.amount, type: it.type, _delete: true }] });
        }));
      append(bd, row);
    }
  }
  const add = el('button', { class: 'ask-btn' }, '＋ Добавить трату/доход');
  add.addEventListener('click', () => {
    modal('Добавить запись', (b) => {
      const mk = (ph: string, def?: string) => { const i = el('input', { placeholder: ph, value: def || '' }); i.style.cssText = 'display:block;width:100%;margin:6px 0;padding:6px 8px'; append(b, i); return i; };
      const sel = el('select', {}); sel.style.cssText = 'display:block;width:100%;margin:6px 0;padding:6px 8px';
      append(sel, el('option', { value: 'expense' }, 'Расход'), el('option', { value: 'income' }, 'Доход'));
      append(b, sel);
      const ci = mk('Категория (продукты, подгузники…)'), ai = mk('Сумма, ₽'), ni = mk('Примечание');
      (window as any).__bud = { sel, ci, ai, ni };
    }, () => {
      const { sel, ci, ai, ni } = (window as any).__bud;
      const bud2 = [...(S.budget || [])];
      bud2.push({ id: 'b' + Math.random().toString(36).slice(2, 8), type: sel.value, category: ci.value.trim() || 'другое', amount: Number(ai.value) || 0, note: ni.value.trim() || undefined, date: new Date().toISOString().slice(0, 10) });
      saveState({ budget: bud2 });
    });
  });
  append(card, bd, add);
  append(c, card);
}

function renderDynTabs() {
  const c = $('#c-dyn'); if (!c) return; clear(c);
  for (const t of S.tabs || []) {
    if (!t || !t.id) continue;
    let box = $('#c-dyn-' + t.id);
    if (!box) { box = el('div', { class: 'content', id: 'c-dyn-' + t.id }); append(c, box); }
    clear(box);
    const card = el('div', { class: 'card' });
    const head = el('div', { class: 'card-h' }, (t.emoji ? t.emoji + ' ' : '') + (t.title || ''));
    append(head, delBtn(() => { saveState({ tabs: [{ id: t.id, _delete: true }] }); }));
    append(card, head);
    const bd = el('div', { style: 'padding: 10px 18px 14px; white-space: pre-line' }, t.content || '');
    append(card, bd);
    append(box, card);
  }
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
    const total = list.reduce((a: number, x: any) => a + (Number(x.price) || 0), 0);
    const card = el('div', { class: 'card' });
    const head = el('div', { class: 'card-h' }, title);
    if (total) append(head, el('span', { class: 's-cat' }, `≈ ${total.toLocaleString('ru-RU')} ₽`));
    append(card, head);
    for (const x of list) {
      const row = el('div', { class: 'shop-row' + (x.done ? ' done' : '') }, el('input', { type: 'checkbox', checked: !!x.done }), el('span', {}, x.text || ''), el('span', { class: 's-cat' }, cat));
      (row.querySelector('input') as HTMLInputElement).addEventListener('change', function () { x.done = this.checked; saveState({ shopping }); });
      append(card, row);
    }
    append(c, card);
  }
  append(c, askFooter('Дополни и обнови список покупок: продукты на неделю (с учётом меню), одежда и что ещё нужно купить.'));
}

/* Карточка события таймлайна: клик по маркеру */
function htlEventCard(it: any) {
  const d = it.e;
  modal(it.title, (b) => {
    append(b, el('div', { style: 'font-size:26px;text-align:center;padding:8px 0 6px' }, it.icon));
    const rows: [string, string][] = [];
    rows.push(['Время', fmtTime(d.timestamp)]);
    if (it.kind === 'sleeps' && d.end) rows.push(['Длительность', durStr(d.end - d.timestamp)]);
    if (it.kind === 'feeds' && d.amount) rows.push(['Объём', String(d.amount) + ' мл']);
    if (d.type) rows.push(['Тип', String(d.type)]);
    if (d.note) rows.push(['Заметка', String(d.note)]);
    for (const [l, v] of rows) append(b, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, l), el('span', { class: 'c-val' }, v)));
    const del = el('button', { class: 'modal-btn danger' }, 'Удалить запись');
    del.addEventListener('click', () => {
      if (!confirm('Удалить эту запись?')) return;
      const arr = it.kind === 'feeds' ? (S.feeds || []) : it.kind === 'sleeps' ? (S.sleeps || []) : (S.events || []);
      const next = arr.slice(); next.splice(it.i, 1);
      saveState({ feeds: it.kind === 'feeds' ? next : S.feeds || [], sleeps: it.kind === 'sleeps' ? next : S.sleeps || [], events: it.kind === 'events' ? next : S.events || [] });
      document.querySelector('.modal-overlay')?.remove();
    });
    append(b, el('div', { style: 'text-align:center;padding-top:12px' }, del));
  }, () => { }, true);
}

let htlDays = 5; // глубина горизонтального таймлайна (дней)
function renderDash() {
  const c = $('#c-dash'); if (!c) return; clear(c);
  renderBanners(c);
  const byKey: Record<string, HTMLElement> = {};
  const feeds = S.feeds || [], sleeps = S.sleeps || [], evts = S.events || [], todos = S.todos || [];
  const d = S.details || {};

  // Age-aware notice: precise tracking becomes less relevant as the child grows
  const age = ageMonths(S.birthDate);
  if (age >= 36) {
    const notice = el('div', { class: 'notice' },
      el('div', { class: 'n-title' }, 'Точный учёт уже не так важен'),
      el('div', { class: 'n-text' }, 'С возрастом ребёнка отпадает необходимость поминутно фиксировать каждое кормление, сон и пробуждение. Режим стабилизируется, и вы сами лучше чувствуете потребности. Теперь дневник — это база знаний: рецепты, советы, развитие и подготовка к школе. Пользоваться кнопками учёта можно, но они не обязательны.')
    );
    byKey.notice = notice;
  }

  if (S.birthDate) {
    const card = el('div', { class: 'card quiet' }); append(card, el('div', { class: 'card-h' }, 'Профиль'));
    const rows: [string, string][] = [];
    const a = ageStr(S.birthDate); if (a) rows.push(['Возраст', a]);
    if (S.weight) rows.push(['Вес', S.weight + ' г']);
    if (S.height) rows.push(['Рост', S.height + ' см']);
    if (d.skills) rows.push(['Навыки', String(d.skills)]);
    if (d.sleepPattern) rows.push(['Сон', String(d.sleepPattern)]);
    if (rows.length) for (const [l, v] of rows) append(card, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, l), el('span', { class: 'c-val' }, String(v))));
    byKey.profile = card;
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
  byKey.skills = skCard;

  // План на неделю
  const wp = S.weekPlan;
  const wpCard = el('div', { class: 'card week' }); append(wpCard, el('div', { class: 'card-h' }, 'План на неделю'));
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
  byKey.plan = wpCard;

  const tc = todoCard('Задачи', todos.filter((t: any) => !t.section));
  if (tc) byKey.todos = tc;

  const all: any[] = [];
  feeds.forEach((e: any, i: number) => all.push({ e, kind: 'feeds', i, icon: '🍼', title: 'Кормление', sub: (e.type || '') + (e.amount ? ' · ' + e.amount + ' мл' : '') }));
  sleeps.forEach((e: any, i: number) => all.push({ e, kind: 'sleeps', i, icon: '😴', title: e.type === 'nap' ? 'Дневной сон' : 'Ночной сон', sub: e.end ? fmtTime(e.timestamp) + '–' + fmtTime(e.end) + ' · ' + durStr(e.end - e.timestamp) : '' }));
  evts.forEach((e: any, i: number) => all.push({ e, kind: 'events', i, icon: /пробужд/i.test(e.title || '') ? '☀️' : /замер/i.test(e.title || '') ? '⚖️' : '📌', title: e.title || 'Событие', sub: e.note || '' }));
  all.sort((a: any, b: any) => (b.e.timestamp || 0) - (a.e.timestamp || 0));

  // Сводка за период (сегодня / 3 дня / 7 дней) — считает клиент, точно; «сегодня» = день мамы
  const startToday = new Date(todayRef()); startToday.setHours(0, 0, 0, 0);
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
    const sc = el('div', { class: 'card hero' }); append(sc, el('div', { class: 'card-h' }, dashPeriod === 0 ? 'Сегодня' : 'За ' + dashPeriod + ' дня'));
    const pbar = el('div', { class: 'period-btns' });
    for (const [v, label] of [['0', 'Сегодня'], ['3', '3 дня'], ['7', '7 дней']] as [string, string][]) {
      const b = el('button', { class: 'modal-btn' + (String(dashPeriod) === v ? ' sel' : '') }, label);
      b.addEventListener('click', () => { dashPeriod = parseInt(v, 10); renderDash(); });
      append(pbar, b);
    }
    append(sc, pbar);
    const stats = el('div', { class: 'hero-stats' });
    if (nFeeds) append(stats, el('div', { class: 'hs' }, el('div', { class: 'hs-v' }, String(nFeeds)), el('div', { class: 'hs-l' }, 'кормлений')));
    if (feedAmt) append(stats, el('div', { class: 'hs' }, el('div', { class: 'hs-v' }, String(feedAmt)), el('div', { class: 'hs-l' }, 'мл смеси')));
    if (sleepMs) append(stats, el('div', { class: 'hs' }, el('div', { class: 'hs-v' }, durStr(sleepMs)), el('div', { class: 'hs-l' }, 'сон')));
    if (nEvts) append(stats, el('div', { class: 'hs' }, el('div', { class: 'hs-v' }, String(nEvts)), el('div', { class: 'hs-l' }, 'событий')));
    append(sc, stats);
    byKey.summary = sc;
  }

  // Напоминания (все невыполненные — просроченные и ближайшие; на Главной — первые 6)
  const rems = S.reminders || [];
  const activeRems = rems.filter((r: any) => !r.done).sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
  if (activeRems.length) {
    const rc = el('div', { class: 'card' }); append(rc, el('div', { class: 'card-h' }, 'Напоминания'));
    const shown = activeRems.slice(0, 6);
    for (const r of shown) {
      const row = el('div', { class: 'todo-item' + (r.done ? ' done' : '') }, el('input', { type: 'checkbox', checked: !!r.done }), el('span', {}, (r.date ? r.date.slice(5) + ' · ' : '') + (r.text || '')));
      (row.querySelector('input') as HTMLInputElement).addEventListener('change', function () { r.done = this.checked; saveState({ reminders: rems }); });
      append(row, delBtn(() => { saveState({ reminders: [{ date: r.date || '', text: r.text || '', _delete: true }] }); }));
      append(rc, row);
    }
    if (activeRems.length > 6) {
      const more = el('button', { class: 'ask-btn' }, `Ещё ${activeRems.length - 6} напоминаний`);
      more.addEventListener('click', () => { for (const r of activeRems.slice(6)) { const row = el('div', { class: 'todo-item' }, el('input', { type: 'checkbox', checked: !!r.done }), el('span', {}, (r.date ? r.date.slice(5) + ' · ' : '') + (r.text || ''))); (row.querySelector('input') as HTMLInputElement).addEventListener('change', function () { r.done = this.checked; saveState({ reminders: rems }); }); append(row, delBtn(() => { saveState({ reminders: [{ date: r.date || '', text: r.text || '', _delete: true }] }); })); more.parentNode!.insertBefore(row, more); } more.remove(); });
      append(rc, more);
    }
    byKey.rems = rc;
  }

  if (all.length) {
    const card = el('div', { class: 'card span2' }); append(card, el('div', { class: 'card-h' }, 'Хроника'));
    // Горизонтальный таймлайн: дни С СОБЫТИЯМИ (последние htlDays), плюс дозаполнение
    // календарными днями перед самым старым — иначе редкие события (визиты раз в месяц)
    // выпадают из окна и таймлайн выглядит пустым.
    const nowD = new Date(todayRef()); nowD.setHours(0, 0, 0, 0);
    const daySet = new Set<string>();
    for (const it of all) daySet.add(dayKey(it.e.timestamp));
    let dayKeys = [...daySet].sort((a, b) => (a < b ? 1 : -1)).slice(0, htlDays);
    if (dayKeys.length < htlDays) {
      // дополнить календарными днями перед самым старым днём с событием
      const oldest = dayKeys.length ? dayKeys[dayKeys.length - 1] : iso(nowD);
      const oldestD = new Date(oldest + 'T00:00:00');
      for (let i = 1; dayKeys.length < htlDays && i <= 14; i++) {
        const k = iso(new Date(oldestD.getTime() - i * DAY_MS));
        if (!daySet.has(k)) dayKeys.push(k);
      }
    }
    const lanes: { key: string; label: string; track: HTMLElement; items: any[] }[] = [];
    for (const key of dayKeys) {
      const d = new Date(key + 'T00:00:00');
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      let label: string;
      if (key === dayKey(nowD.getTime())) label = 'Сегодня';
      else if (key === dayKey(nowD.getTime() - DAY_MS)) label = 'Вчера';
      else if (key === dayKey(nowD.getTime() - 2 * DAY_MS)) label = 'Позавчера';
      else label = fmtDay(d) + ' ' + WD[idx];
      lanes.push({ key, label, track: el('div', { class: 'htl-track' }), items: [] });
    }
    for (const it of all) {
      const lane = lanes.find((l) => l.key === dayKey(it.e.timestamp));
      if (lane) lane.items.push(it);
    }
    const htl = el('div', { class: 'htl' });
    const grid = el('div', { class: 'htl-grid' });
    for (const h of [0, 6, 12, 18, 24]) append(grid, el('span', { class: 'htl-h', style: 'left:' + (h / 24 * 100) + '%' }, h === 24 ? '' : String(h).padStart(2, '0')));
    append(htl, grid);
    const pctOf = (ts: number) => { const d = new Date(ts); return (d.getHours() * 60 + d.getMinutes()) / 1440 * 100; };
    for (const lane of lanes) {
      const row = el('div', { class: 'htl-day' });
      append(row, el('div', { class: 'htl-lbl' }, lane.label));
      for (const it of lane.items) {
        const ts = it.e.timestamp || 0;
        const startPct = pctOf(ts);
        if (it.kind === 'sleeps' && it.e.end) {
          const endPct = pctOf(it.e.end);
          const cross = endPct <= startPct; // сон через полночь
          const w = cross ? 100 - startPct : Math.max(1.5, endPct - startPct);
          const sl = el('div', { class: 'htl-ev sleep', style: 'left:' + startPct + '%;width:' + w + '%', 'data-tip': fmtTime(ts) + '–' + fmtTime(it.e.end) + ' · ' + it.title + ' · ' + durStr(it.e.end - ts) });
          sl.addEventListener('click', (evt: Event) => { evt.stopPropagation(); htlEventCard(it); });
          append(lane.track, sl);
          if (cross) {
            const nk = dayKey(ts + DAY_MS);
            const nl = lanes.find((l) => l.key === nk);
            if (nl) {
              const cont = el('div', { class: 'htl-ev sleep', style: 'left:0;width:' + endPct + '%;', 'data-tip': fmtTime(ts) + '–' + fmtTime(it.e.end) + ' · ' + it.title + ' · ' + durStr(it.e.end - ts) });
              cont.addEventListener('click', (evt: Event) => { evt.stopPropagation(); htlEventCard(it); });
              append(nl.track, cont);
            }
          }
        } else {
          const cls = it.kind === 'feeds' ? 'feed' : 'ev';
          const dot = el('div', { class: 'htl-ev ' + cls, style: 'left:' + startPct + '%', 'data-tip': fmtTime(ts) + ' · ' + it.title + (it.sub ? ' · ' + it.sub : '') });
          dot.addEventListener('click', (evt: Event) => { evt.stopPropagation(); htlEventCard(it); });
          append(lane.track, dot);
        }
      }
      if (!lane.track.querySelector('.htl-ev')) append(lane.track, el('span', { class: 'htl-empty' }, 'нет записей'));
      append(row, lane.track);
      append(htl, row);
    }
    append(card, htl);
    append(card, el('div', { class: 'htl-legend' },
      el('span', {}, el('span', { class: 'lg' }), 'кормление'),
      el('span', {}, el('span', { class: 'lg sleep' }), 'сон'),
      el('span', {}, el('span', { class: 'lg ev' }), 'событие')));
    const more = el('button', { class: 'ask-btn' }, 'Показать ещё 10 дней');
    more.addEventListener('click', () => { htlDays += 10; renderDash(); });
    append(card, more);
    byKey.timeline = card;
  }
  // Порядок на Главной: сводка → напоминания → хроника (на всю ширину) → профиль → задачи → навыки → план
  const order = ['notice', 'summary', 'rems', 'timeline', 'profile', 'todos', 'skills', 'plan'];
  let anyCard = false;
  for (const k of order) {
    const x = byKey[k];
    if (x) { append(c, x); anyCard = true; }
  }
  if (!anyCard) append(c, el('div', { class: 'empty' }, 'Запишите кормление, сон или спросите в чате.'));
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
  clear(tb);
  const tabs = [['dash', 'Главная'], ['calendar', 'Календарь'], ['skills', 'Навыки'], ['tips', 'Советы'], ['recipes', 'Рецепты'], ['spurts', 'Скачки'], ['clothes', 'Гардероб'], ['sad', 'Сад'], ['shopping', 'Покупки'], ['family', 'Семья'], ['budget', 'Бюджет'], ['llmn', 'Помощник']];
  // Динамические вкладки от LLM (персонализированные разделы: бизнес, хобби…)
  for (const t of S.tabs || []) {
    if (!t || !t.id || !t.title) continue;
    // эмодзи уже в начале title («🍰 Сладкая Зоя») — не дублируем отдельным полем
    const startsEmoji = /^[^\p{L}\p{N}]/u.test(String(t.title).trim());
    const label = (t.emoji && !startsEmoji ? t.emoji + ' ' : '') + t.title;
    tabs.push(['dyn-' + t.id, label]);
  }
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
function modal(title: string, bodyFn: (b: HTMLElement) => void, onSave: () => void, noSave?: boolean) {
  const ov = el('div', { class: 'modal-overlay' }), md = el('div', { class: 'modal' }), bd = el('div', {});
  const ac = el('div', { class: 'modal-actions' }, el('button', { class: 'cancel' }, 'Отмена'), el('button', { class: 'save' }, 'Сохранить'));
  append(md, el('h3', {}, title), bd, ac); append(ov, md); append(document.body, ov);
  bodyFn(bd);
  if (noSave) ac.querySelector('.save')!.style.display = 'none';
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter') { const s = ac.querySelector('.save'); if (s && (s as HTMLElement).style.display !== 'none') (s as HTMLElement).click(); }
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

// ─── Календарь: месяц / неделя / день + UI-плашки ───
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WD_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
let calView: 'month' | 'week' | 'day' = 'month';
let calCursor: Date = startOfDay(new Date());
const DAY_MS = 86400000;

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function iso(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function parseISO(s: string): Date | null {
  const m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function fmtDay(d: Date): string { return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0'); }
function fmtDayFull(d: Date): string {
  const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const w = WD_FULL[idx];
  return w[0].toUpperCase() + w.slice(1) + ' ' + fmtDay(d);
}
function calEvents(): any[] { return (S.calendar || []) as any[]; }
/** Есть ли событие (с учётом повторяемости) в конкретный день? */
function occursOn(ev: any, day: Date): boolean {
  const d = parseISO(ev.date);
  if (!d || ev.done) return false;
  const diff = Math.round((startOfDay(day).getTime() - d.getTime()) / DAY_MS);
  if (diff < 0) return false;
  if (!ev.recurring) return diff === 0;
  if (ev.recurring === 'daily') return true;
  if (ev.recurring === 'weekly') return diff % 7 === 0;
  if (ev.recurring === 'monthly') return d.getDate() === day.getDate();
  if (ev.recurring === 'yearly') return d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
  return false;
}
/** Ближайшее вхождение события не раньше from (для плашек). */
function nextOccurrence(ev: any, from: Date): Date | null {
  const d = parseISO(ev.date);
  if (!d || ev.done) return null;
  if (!ev.recurring) return iso(d) >= iso(from) ? d : null;
  let cur = new Date(d);
  for (let i = 0; i < 500; i++) {
    if (iso(cur) >= iso(from) && occursOn(ev, cur)) return cur;
    cur = new Date(cur.getTime() + DAY_MS);
  }
  return null;
}
function sortByTime(a: any, b: any): number { return (a.time || '99:99').localeCompare(b.time || '99:99'); }
/** Удаление события календаря из state (кнопка ✕) — через маркер _delete: серверный
 *  merge дополняет массивы и не может удалить по отсутствию элемента.
 *  Для легаси-записей без id маркер несёт (title|date|time) — точное совпадение. */
function calDelete(ev: any) {
  saveState({ calendar: [{ id: ev.id, title: ev.title, date: ev.date, time: ev.time, _delete: true }] });
}
function calItemEl(e: any): HTMLElement {
  const it = el('div', { class: 'cal-item' + (e.important ? ' imp' : ''), 'data-tip': (e.time ? e.time + ' ' : '') + e.title + (e.recurring ? ' · повторяется' : '') + (e.important ? ' · важно' : '') + (e.note ? ' — ' + e.note : '') });
  const row = el('div', { class: 't' });
  append(row, el('span', {}, (e.time ? e.time + ' ' : '') + e.title + (e.recurring ? ' 🔁' : '') + (e.important ? ' ⭐' : '')));
  const del = el('button', { class: 'cal-del', title: 'Удалить' }, '✕');
  del.addEventListener('click', (evt: Event) => { evt.stopPropagation(); calDelete(e); });
  append(row, del);
  append(it, row);
  if (e.note) append(it, el('div', {}, e.note));
  return it;
}

// Плашки: «Сегодня в 9:00 — Педиатр», «Завтра — Бассейн», «До 12.08 — Собрать справки»
function renderBanners(c: HTMLElement) {
  const today = startOfDay(new Date(todayRef()));
  const items: { d: Date; ev: any; when: string }[] = [];
  for (const ev of calEvents()) {
    const n = nextOccurrence(ev, today);
    if (!n) continue;
    const diff = Math.round((startOfDay(n).getTime() - today.getTime()) / DAY_MS);
    if (diff > 7) continue;
    const when = diff === 0 ? 'Сегодня' : diff === 1 ? 'Завтра' : 'До ' + fmtDay(n);
    items.push({ d: n, ev, when });
  }
  items.sort((a, b) => a.d.getTime() - b.d.getTime() || (b.ev.important ? 1 : 0) - (a.ev.important ? 1 : 0));
  if (!items.length) return;
  const box = el('div', { class: 'banners' });
  for (const it of items.slice(0, 6)) {
    const t = it.ev.time ? ' в ' + it.ev.time : '';
    const txt = it.when + t + ' — ' + it.ev.title;
    append(box, el('div', { class: 'banner' + (it.ev.important ? ' imp' : '') },
      el('span', { class: 'b-ico' }, it.ev.important ? '⭐' : '📅'),
      el('span', {}, txt)));
  }
  append(c, box);
}

function calTitle(): string {
  if (calView === 'month') {
    const m = MONTHS[calCursor.getMonth()];
    return m[0].toUpperCase() + m.slice(1) + ' ' + calCursor.getFullYear();
  }
  if (calView === 'week') {
    const end = new Date(calCursor.getTime() + 6 * DAY_MS);
    return fmtDay(calCursor) + ' – ' + fmtDay(end);
  }
  return fmtDayFull(calCursor);
}
function shiftCal(dir: number) {
  if (calView === 'month') calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + dir, 1);
  else if (calView === 'week') calCursor = new Date(calCursor.getTime() + dir * 7 * DAY_MS);
  else calCursor = new Date(calCursor.getTime() + dir * DAY_MS);
}
function renderCalendar() {
  const c = $('#c-calendar'); if (!c) return; clear(c);
  const head = el('div', { class: 'cal-head' });
  const navL = el('button', {}, '‹'), navR = el('button', {}, '›');
  const title = el('div', { class: 'cal-title' }, calTitle());
  const todayB = el('button', {}, 'Сегодня');
  const views = el('div', { class: 'cal-view' });
  for (const [v, l] of [['month', 'Месяц'], ['week', 'Неделя'], ['day', 'День']] as const) {
    const b = el('button', { class: calView === v ? 'active' : '' }, l);
    b.addEventListener('click', () => { calView = v; renderCalendar(); });
    append(views, b);
  }
  navL.addEventListener('click', () => { shiftCal(-1); renderCalendar(); });
  navR.addEventListener('click', () => { shiftCal(1); renderCalendar(); });
  todayB.addEventListener('click', () => { calCursor = startOfDay(new Date(todayRef())); renderCalendar(); });
  append(head, navL, title, navR, todayB, views);
  append(c, head);
  if (calView === 'month') renderCalMonth(c);
  else if (calView === 'week') renderCalWeek(c);
  else renderCalDay(c);
}
function renderCalMonth(c: HTMLElement) {
  const first = new Date(calCursor.getFullYear(), calCursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // неделя с понедельника
  const todayIso = iso(new Date());
  const grid = el('div', { class: 'cal-grid' });
  for (const w of WD) append(grid, el('div', { class: 'cal-dow' }, w));
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const evs = calEvents().filter((e: any) => occursOn(e, d)).sort(sortByTime);
    const cell = el('div', {
      class: 'cal-cell' + (d.getMonth() !== calCursor.getMonth() ? ' other' : '') + (iso(d) === todayIso ? ' today' : ''),
    });
    append(cell, el('div', { class: 'cal-num' }, String(d.getDate())));
    for (const e of evs.slice(0, 3)) {
      append(cell, el('div', {
        class: 'cal-ev' + (e.important ? ' imp' : '') + (e.recurring ? ' rec' : '') + (e.done ? ' done' : ''),
        'data-tip': (e.time ? e.time + ' ' : '') + e.title + (e.recurring ? ' · повторяется' : '') + (e.important ? ' · важно' : '') + (e.note ? ' — ' + e.note : ''),
      }, (e.time ? e.time + ' ' : '') + e.title));
    }
    if (evs.length > 3) append(cell, el('div', { class: 'cal-more' }, '+' + (evs.length - 3)));
    cell.addEventListener('click', () => { calView = 'day'; calCursor = d; renderCalendar(); });
    append(grid, cell);
  }
  append(c, grid);
}
function renderCalWeek(c: HTMLElement) {
  const monday = startOfDay(calCursor);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const todayIso = iso(new Date());
  const wk = el('div', { class: 'cal-week' });
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * DAY_MS);
    const evs = calEvents().filter((e: any) => occursOn(e, d)).sort(sortByTime);
    const col = el('div', { class: 'cal-daycol' + (iso(d) === todayIso ? ' today' : '') });
    append(col, el('h4', {}, WD[i] + ' ' + fmtDay(d)));
    const list = el('div', { class: 'cal-list' });
    for (const e of evs) append(list, calItemEl(e));
    append(col, list);
    append(wk, col);
  }
  append(c, wk);
}
function renderCalDay(c: HTMLElement) {
  const d = startOfDay(calCursor);
  const evs = calEvents().filter((e: any) => occursOn(e, d)).sort(sortByTime);
  const card = el('div', { class: 'card' });
  append(card, el('div', { class: 'card-h' }, fmtDayFull(d) + (iso(d) === iso(new Date()) ? ' · сегодня' : '')));
  if (!evs.length) {
    append(card, el('div', { class: 'empty', style: 'padding:12px' }, 'На этот день событий нет. Напишите в чат — запишу.'));
  }
  for (const e of evs) append(card, calItemEl(e));
  append(c, card);
}
