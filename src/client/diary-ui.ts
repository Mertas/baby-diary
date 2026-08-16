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
.brand-row { display: flex; align-items: center; justify-content: center; gap: 18px; margin-top: 6px; }
.brand-info { min-width: 0; }
.name-row { display: flex; align-items: baseline; justify-content: center; gap: 12px; flex-wrap: wrap; }
.brand .name { font-family: var(--serif); font-size: 26px; font-weight: 500; color: var(--text); line-height: 1.15; }
.brand .meta { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; font-size: 11px; color: var(--text-dim); letter-spacing: 0.06em; text-transform: uppercase; }
.brand .meta span { padding-bottom: 2px; border-bottom: 1px solid var(--border); }
.brand .hint { font-size: 12px; color: var(--accent); margin-top: 6px; font-family: var(--serif); font-style: italic; }

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
.spurt-card .s-desc { font-size: 13px; color: var(--text-dim); line-height: 1.6; margin-top: 8px; white-space: pre-line; }
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
.msg-choices { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.msg-choice { border: 1px solid var(--border); background: none; border-radius: 18px; padding: 5px 12px; font-size: 12px; color: var(--text-dim); cursor: pointer; font-family: var(--sans); }
.msg-choice:hover { border-color: var(--accent); color: var(--accent); }
.msg-choice.sel { background: var(--accent); border-color: var(--accent); color: #fff; }
.msg-choice.done { border-color: var(--accent); color: var(--accent); font-weight: 600; }
.msg-choice.done:hover { background: var(--accent-soft); }
.msg-choice:disabled { opacity: .45; cursor: default; }
.msg-choice:disabled:hover { border-color: var(--border); color: var(--text-dim); background: none; }

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
.chat-bar .send { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--accent); background: none; color: var(--accent); cursor: pointer; font-size: 16px; line-height: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .2s; }
.chat-bar .send:hover { background: var(--accent); color: #fff; }
.chat-bar .send.stop { background: var(--accent); color: #fff; }
/* Плашки-нотификации */
.banners { display: flex; flex-direction: column; gap: 6px; padding: 0 16px 10px; }
.banner { display: flex; gap: 8px; align-items: center; border-radius: 8px; padding: 8px 12px; font-size: 13px; background: #fff8e6; border: 1px solid #f0d9a8; }
.banner.imp { background: #fdecea; border-color: #f0b4a8; font-weight: 600; }
.banner .b-ico { font-size: 15px; }
/* Форма (календарь и др.): строка «подпись + контрол» по центру */
.form-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; }
.form-row .f-lbl { width: 110px; flex: none; font-size: 12.5px; color: var(--text-dim); line-height: 1.3; }
.form-row .modal-inp { flex: 1; min-width: 0; }
/* Календарь */
.cal-head { display: flex; align-items: center; gap: 6px; padding: 10px 16px; flex-wrap: wrap; }
.cal-head .cal-title { flex: 1; font-weight: 700; font-size: 15px; min-width: 130px; }
.cal-add-ev { margin-left: auto; border: 1px solid var(--accent); color: var(--accent); background: none; border-radius: 14px; padding: 4px 12px; font-size: 12px; cursor: pointer; flex: none; }
.cal-add-ev:hover { background: var(--accent); color: #fff; }
.cal-head button { border: 1px solid var(--border); background: none; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; color: var(--text); }
.cal-head button:hover { background: var(--bg-soft, #eef2f7); }
.cal-head .cal-view button.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; padding: 0 12px 12px; }
.cal-dow { text-align: center; font-size: 11px; color: var(--text-soft); padding: 4px 0; }
.cal-cell { position: relative; aspect-ratio: 3 / 4; border: 1px solid var(--border); border-radius: 6px; padding: 3px; font-size: 11px; cursor: pointer; overflow: hidden; }
.cal-cell:hover { background: var(--bg-soft, #eef2f7); }
.cal-cell.other { opacity: .38; }
.cal-cell.today { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.cal-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .28; pointer-events: none; border-radius: 5px; transition: opacity .15s ease; }
.cal-cell:hover .cal-ph, .cal-phwrap:hover .cal-ph { opacity: 1; }
.cal-phcnt { position: absolute; bottom: 2px; right: 3px; z-index: 1; font-size: 9px; color: var(--text-dim); background: rgba(255, 255, 255, 0.75); border-radius: 6px; padding: 0 4px; pointer-events: none; }
.cal-num { position: relative; z-index: 1; font-size: 11px; color: var(--text-soft); }
.cal-cell.today .cal-num { color: var(--accent); font-weight: 700; }
.cal-evs { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2; display: flex; flex-direction: column; gap: 1px; padding: 2px; pointer-events: none; }
.cal-evs .cal-ev { pointer-events: auto; }
.cal-ev { position: relative; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 4px; padding: 1px 4px; margin-top: 1px; background: #e8f0fb; }
.cal-ev.imp { background: #fdecea; color: #c0392b; font-weight: 600; }
.cal-ev.rec::after { content: ' 🔁'; }
.cal-ev.done { text-decoration: line-through; opacity: .5; }
.cal-phwrap { position: relative; aspect-ratio: 3 / 4; border-radius: 8px; overflow: hidden; margin: 4px 0; cursor: pointer; }
.cal-phwrap .cal-ph { opacity: .85; }
.cal-dgal { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 6px; padding: 10px 18px 14px; }
.cal-dgal-item { position: relative; aspect-ratio: 3 / 4; border-radius: 8px; overflow: hidden; cursor: pointer; box-shadow: 0 1px 3px rgba(0, 0, 0, .1); }
.cal-dgal-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cal-more { font-size: 10px; color: var(--text-soft); }
.cal-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 0 12px 12px; }
.cal-daycol { border: 1px solid var(--border); border-radius: 6px; min-height: 130px; padding: 4px; font-size: 11px; }
.cal-daycol.today { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.cal-daycol h4 { margin: 0 0 4px; font-size: 11px; color: var(--text-soft); font-weight: 600; }
.cal-list { display: flex; flex-direction: column; gap: 3px; }
.cal-item { border-radius: 6px; padding: 4px 6px; font-size: 12px; background: #e8f0fb; }
.cal-item .t { font-weight: 600; display: flex; align-items: center; gap: 6px; }
.cal-del { margin-left: auto; border: none; background: none; color: var(--text-soft); cursor: pointer; font-size: 13px; line-height: 1; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 50%; flex: none; padding: 0; transition: background .15s ease, color .15s ease; }
.cal-del:hover { color: #c0392b; background: rgba(192,57,43,.08); }
/* В строках вкладок и списков ✕ — компактная и деликатная: маленькая, полупрозрачная, круг при наведении */
.fam-row .cal-del, .llmn-row .cal-del, .budget-row .cal-del, .todo-item .cal-del, .shop-row .cal-del, #c-dyn .cal-del, .card-h .cal-del { width: 22px; height: 22px; font-size: 12px; opacity: .55; margin-left: 2px; }
.fam-row .cal-del:hover, .llmn-row .cal-del:hover, .budget-row .cal-del:hover, .todo-item .cal-del:hover, .shop-row .cal-del:hover, #c-dyn .cal-del:hover, .card-h .cal-del:hover { opacity: 1; }
/* Вкладки Семья / Бюджет / Помощник / динамические */
.card-h { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.card-h .cal-del { margin-left: auto; }
.fam-row, .llmn-row, .budget-row, .stock-row { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-bottom: 1px solid rgba(0,0,0,.045); font-size: 14px; border-radius: 8px; margin: 0 -8px; transition: background .15s ease; }
.fam-row:hover, .llmn-row:hover, .budget-row:hover, .stock-row:hover { background: rgba(232,98,42,.05); }
.fam-row .fam-ico, .llmn-row .llmn-ico, .stock-row .stock-ico { font-size: 14px; flex: none; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background: var(--accent-soft); border-radius: 50%; }
.fam-row > span:nth-child(2), .llmn-row > span:nth-child(2) { flex: 1; min-width: 0; overflow-wrap: anywhere; line-height: 1.45; }
.fam-row .fam-name { font-weight: 600; }
.fam-row .fam-role { color: var(--text-dim); font-size: 12.5px; }
.fam-row .s-cat, .llmn-row .s-cat { color: var(--text-soft); font-size: 12px; flex: none; font-style: italic; max-width: 40%; overflow-wrap: anywhere; }
.budget-cat { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 4px 4px; font-weight: 700; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--text); }
.mode-card { margin-bottom: 10px; }
.mode-body { padding: 4px 18px 14px; font-size: 13.5px; line-height: 1.65; white-space: pre-line; overflow-wrap: anywhere; color: var(--text); }
/* Аватарка и галерея */
.av { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; cursor: pointer; display: none; border: 2px solid var(--border); background: var(--surface); flex: none; }
.av.on { display: block; }
.gal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; padding: 14px 18px 18px; }
.gal-item { position: relative; border-radius: 12px; overflow: hidden; background: #eee; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.gal-item img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; }
.gal-item .gal-video { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; background: #222; }
.gal-video-ico { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 34px; height: 34px; border-radius: 50%; background: rgba(0, 0, 0, 0.5); color: #fff; font-size: 13px; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 1; }
.cal-video-ico { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 26px; height: 26px; border-radius: 50%; background: rgba(0, 0, 0, 0.5); color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 2; }
.cal-dgal-video { width: 100%; height: 100%; object-fit: cover; display: block; background: #222; }
/* Прогресс-бар загрузки */
.up-wrap { grid-column: 1 / -1; height: 10px; border-radius: 5px; background: rgba(0, 0, 0, 0.06); overflow: hidden; }
.up-bar { height: 100%; width: 0%; border-radius: 5px; background: var(--accent); font-size: 9px; color: #fff; text-align: center; line-height: 10px; transition: width .1s ease; }
/* Панель «⏳ Обработка N/M» — карточка как «Добавить фото» (одна колонка сетки, 3:4) */
.media-panel { aspect-ratio: 3 / 4; border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; background: var(--card, #fff); display: flex; flex-direction: column; min-width: 0; box-shadow: 0 1px 4px rgba(0, 0, 0, .08); }
.media-panel .mp-title { font-size: 12px; font-weight: 600; margin-bottom: 6px; line-height: 1.35; }
.media-panel .mp-title.err { color: #c0392b; }
.media-panel .up-wrap { flex: none; margin-bottom: 6px; height: 8px; }
.media-panel .mp-list { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.media-panel .mp-row { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--text-dim); line-height: 1.4; }
.media-panel .mp-row.ok { color: var(--text); }
.media-panel .mp-row.err { color: #c0392b; }
.media-panel .mp-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; }
.media-panel .mp-st { flex: none; }
.gal-item .gal-cap { padding: 6px 8px; font-size: 11.5px; color: var(--text-dim); line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gal-item .gal-del { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(0,0,0,.45); color: #fff; font-size: 12px; cursor: pointer; opacity: 0; transition: opacity .15s ease; }
.gal-item:hover .gal-del { opacity: 1; }
.gal-item .gal-del:hover { background: #c0392b; }
.gal-add { border: 1.5px dashed var(--border); border-radius: 12px; min-height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: none; cursor: pointer; color: var(--text-soft); font-family: var(--sans); font-size: 13px; }
.gal-add:hover { border-color: var(--accent); color: var(--accent); }
.gal-add .ga-ico { font-size: 26px; }
.gal-preview { width: 100%; max-height: 260px; object-fit: contain; border-radius: 10px; margin-bottom: 10px; background: #f5f3ef; }
.gal-exif { font-size: 12px; color: var(--text-dim); padding: 0 0 10px; line-height: 1.5; }
.gal-bar { display: flex; gap: 8px; padding: 14px 18px 0; flex-wrap: wrap; }
.gal-seg { border: 1px solid var(--border); background: none; border-radius: 14px; padding: 4px 12px; font-size: 12px; cursor: pointer; color: var(--text-dim); font-family: var(--sans); }
.gal-seg:hover { border-color: var(--accent); color: var(--accent); }
.gal-seg.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.photo-desc-row { display: flex; gap: 8px; align-items: center; padding: 2px 0 10px; }
.photo-actions { display: flex; justify-content: center; gap: 14px; padding-top: 14px; }
/* Полноэкранный просмотр фото (оверлей поверх UI) */
.fs-view { position: fixed; inset: 0; background: rgba(8, 8, 10, 0.93); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.fs-stage { position: absolute; inset: 0; left: 250px; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: grab; touch-action: none; }
.fs-img { max-width: 94%; max-height: 92%; object-fit: contain; border-radius: 6px; user-select: none; transform-origin: center center; will-change: transform; box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5); }
.fs-video { max-width: 94%; max-height: 92%; border-radius: 8px; box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5); outline: none; }
.fs-close { position: fixed; top: 12px; right: 14px; z-index: 1001; width: 38px; height: 38px; border-radius: 50%; border: none; background: rgba(255, 255, 255, 0.14); color: #fff; font-size: 16px; cursor: pointer; }
.fs-close:hover { background: rgba(255, 255, 255, 0.28); }
.fs-nav { position: fixed; top: 50%; transform: translateY(-50%); z-index: 1001; width: 44px; height: 44px; border-radius: 50%; border: none; background: rgba(255, 255, 255, 0.14); color: #fff; font-size: 17px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.fs-nav:hover { background: rgba(255, 255, 255, 0.3); }
.fs-nav.l { left: 268px; }
.fs-nav.r { right: 14px; }
/* Левая колонка-панель: информация (описание, дата, GPS) и контролы — на всю высоту */
.fs-side { position: fixed; left: 0; top: 0; bottom: 0; width: 250px; z-index: 1001; display: flex; flex-direction: column; gap: 10px; padding: 16px 14px; background: rgba(12, 12, 16, 0.82); border-radius: 0 14px 14px 0; backdrop-filter: blur(8px); overflow-y: auto; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4); }
.fs-side .modal-inp { flex: none; color: #fff; border-bottom-color: rgba(255, 255, 255, 0.35); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9), 0 0 3px rgba(0, 0, 0, 0.8); font-size: 13px; }
.fs-side .modal-inp::placeholder { color: rgba(255, 255, 255, 0.7); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9), 0 0 3px rgba(0, 0, 0, 0.8); }
.fs-side .fs-info { font-size: 12.5px; color: #fff; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9), 0 0 3px rgba(0, 0, 0, 0.8); line-height: 1.65; display: flex; flex-direction: column; gap: 3px; word-break: break-word; }
.fs-side .fs-acts { display: flex; flex-direction: column; gap: 8px; }
.fs-side .fs-acts .modal-btn { width: 100%; justify-content: center; }
@media (max-width: 900px) {
  .fs-side { top: auto; bottom: 14px; left: 14px; right: 14px; width: auto; max-height: 45vh; border-radius: 14px; }
  .fs-stage { left: 0; }
  .fs-nav.l { left: 14px; }
}
/* Погода */
.weather-hint { padding: 4px 18px 14px; font-size: 12.5px; color: var(--text-dim); line-height: 1.55; }
.weather-body { padding: 2px 18px 14px; }
.w-today { display: flex; align-items: center; gap: 16px; padding: 6px 0 12px; border-bottom: 1px solid rgba(0,0,0,.05); }
.w-now { display: flex; align-items: center; gap: 8px; }
.w-ico { font-size: 38px; }
.w-temp { font-size: 34px; font-weight: 600; font-variant-numeric: tabular-nums; }
.w-desc { font-size: 14px; font-weight: 500; }
.w-meta { font-size: 12px; color: var(--text-dim); margin-top: 3px; line-height: 1.5; }
.w-meta2 { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
.w-days { display: flex; flex-direction: column; }
.w-day { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid rgba(0,0,0,.04); font-size: 12.5px; }
.w-day:last-child { border-bottom: none; }
.w-dn { width: 30px; font-weight: 600; flex: none; }
.w-di { font-size: 17px; flex: none; width: 24px; text-align: center; }
.w-ddesc { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-dim); }
.w-dt { flex: none; font-variant-numeric: tabular-nums; white-space: nowrap; }
.w-dp { flex: none; width: 64px; text-align: right; font-size: 11.5px; color: var(--text-soft); }
.w-load { padding: 10px 0; font-size: 12.5px; color: var(--text-soft); }
.budget-cat .s-cat { font-weight: 600; letter-spacing: 0; text-transform: none; font-size: 13px; color: var(--accent); font-variant-numeric: tabular-nums; }
.budget-row .budget-note { color: var(--text-soft); font-size: 12px; flex: none; }
.budget-row .budget-amt { margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.budget-row .cal-del { margin-left: 4px; }
.stock-row > span:nth-child(2) { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.stock-row .stock-name { font-weight: 600; }
.stock-row .stock-note { color: var(--text-soft); font-size: 12px; font-style: italic; }
.stock-row .stock-qty { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--accent); }
.budget-total { display: flex; justify-content: space-between; padding: 12px 4px 2px; font-weight: 700; font-size: 15px; border-top: 1px dashed rgba(0,0,0,.1); margin-top: 6px; }
.budget-summary { display: flex; gap: 18px; flex-wrap: wrap; padding: 14px 18px 0; }
.budget-summary .bs-item { display: flex; flex-direction: column; gap: 2px; }
.budget-summary .bs-lbl { color: var(--text-soft); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
.budget-summary .bs-val { font-weight: 700; font-size: 16px; font-variant-numeric: tabular-nums; }
.budget-summary .bs-val.neg { color: #c0392b; }
.budget-summary .bs-val.pos { color: #2e7d32; }
.card-sub { font-size: 12px; color: var(--text-soft); padding: 0 18px 4px; line-height: 1.5; }
.budget-total .s-cat { color: var(--text-soft); font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
.budget-total .val { font-variant-numeric: tabular-nums; }
.budget-total .val.neg { color: #c0392b; } .budget-total .val.pos { color: #2e7d32; }
.card .ask-btn { margin: 12px auto 8px; }
#c-dyn .card { margin-bottom: 12px; }
.dyn-body { padding: 10px 18px 14px; white-space: pre-line; line-height: 1.65; color: var(--text); font-size: 14px; overflow-wrap: anywhere; }
.dyn-body strong { font-weight: 600; }
.cal-item.imp { background: #fdecea; color: #c0392b; }
.cal-day .cal-item { margin-bottom: 4px; }
/* Типы карточек Главной: hero-сводка, тихий профиль, тёплый план, хроника на всю ширину */
.card.hero { border-color: var(--accent); border-top: 3px solid var(--accent); background: linear-gradient(180deg, #fff6ee, var(--card)); }
.card.hero .card-h { background: #f6eee2; }
.hero-stats { display: flex; gap: 28px; padding: 14px 18px 16px; flex-wrap: wrap; }
.hero-stats .hs { display: flex; flex-direction: column; }
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
  .brand-row { justify-content: flex-start; }
  .brand-row .av { margin-left: auto; } /* аватарка прижата к правому краю шапки */
  .name-row { justify-content: flex-start; }
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
    <div class="brand-row">
      <div class="brand-info">
        <div class="name-row"><span class="name" id="nm">—</span><span class="meta" id="mt"></span></div>
        <div class="hint" id="ht"></div>
      </div>
      <img id="av" class="av" alt="Фото" title="Сменить фото">
    </div>
  </div>
  <div class="actions" id="qa"></div>
  <div class="tabs" id="tb"></div>
  <div class="content active" id="c-dash"></div>
  <div class="content" id="c-mode"></div>
  <div class="content" id="c-photos"></div>
  <div class="content" id="c-skills"></div>
  <div class="content" id="c-tips"></div>
  <div class="content" id="c-recipes"></div>
  <div class="content" id="c-spurts"></div>
  <div class="content" id="c-clothes"></div>
  <div class="content" id="c-sad"></div>
  <div class="content" id="c-shopping"></div>
  <div class="content" id="c-stock"></div>
  <div class="content" id="c-llmn"></div>
  <div class="content" id="c-family"></div>
  <div class="content" id="c-budget"></div>
  <div id="c-dyn"></div>
  <div class="content" id="c-calendar"></div>
  <div class="chat-panel">
    <div class="model-row"><button id="mp">Pro</button><button id="mf" class="active">Flash</button><button id="cc" class="collapse" title="Свернуть чат">▾</button><button id="cud" class="undo" title="Отменить последний ответ">↶</button></div>
    <div class="chat-msgs" id="cm"></div>
    <div class="chat-bar"><textarea id="ci" placeholder="Написать..." rows="1"></textarea><button class="send" id="csd">▶</button></div>
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

/** URL медиа с креденшелами (media-эндпоинт защищён, <img>/<video> шлют только query). */
function phUrl(id: string, thumb = false): string {
  return '/api/photo/' + CHAT_ID + '/' + id + (thumb ? '?th=1&' : '?') + 'clientId=' + encodeURIComponent(CID) + '&clientSecret=' + encodeURIComponent(SEC);
}

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
function tsFromTime(t?: string, allowFuture = false): number {
  if (!t) return Date.now();
  // 'ГГГГ-ММ-ДДTЧЧ:ММ' — парсится как локальное время
  const d = new Date(t);
  if (isNaN(d.getTime())) return Date.now();
  // Запись в будущем (случайный выбор даты) — ставим «сейчас».
  // При РЕДАКТИРОВАНИИ события (allowFuture) будущее допустимо — это перенос.
  if (!allowFuture && d.getTime() > Date.now()) return Date.now();
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
  const strOf = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.type === 'string') return o.type;
      if (typeof o.name === 'string') return o.name;
    }
    return '';
  };
  // В шапке — ОДНО предложение, не больше; полный текст — во вкладке «Режим»
  const shortOf = (v: unknown): string => {
    const s = strOf(v);
    const m = s.match(/^(.+?)([.!?])(?:\s|$)/);
    if (m && m[1].trim()) {
      const rest = s.slice(m[0].length).trim();
      return rest ? m[1].trim() + '…' : m[1].trim() + m[2];
    }
    return s.length > 60 ? s.slice(0, 60) + '…' : s;
  };
  if (nm) nm.textContent = S.name || '—';
  // Аватарка: показываем, если задана
  const avEl = $('#av') as HTMLImageElement;
  if (avEl) {
    if (S.avatar) { avEl.src = phUrl(S.avatar, true); avEl.classList.add('on'); }
    else avEl.classList.remove('on');
  }
  if (mt) {
    clear(mt);
    const p: string[] = [];
    const a = ageStr(S.birthDate); if (a) p.push(a);
    if (S.gender) p.push(strOf(S.gender));
    if (d.allergies && d.allergies !== 'нет' && d.allergies !== 'не обнаружено') p.push('Аллергии');
    for (const s of p) append(mt, el('span', {}, s));
  }
  // Под именем: милое описание (blurb) — одно предложение; иначе подсказка
  if (ht) {
    const blurb = strOf(S.blurb);
    ht.textContent = blurb ? shortOf(blurb) : (d.feeding ? shortOf(d.feeding) : ((S.name && S.birthDate) ? '' : 'Напишите в чат — я помогу заполнить дневник'));
  }

  renderMode();
  renderPhotos();
  renderDash();
  renderSkills();
  renderTips();
  renderRecipes();
  renderSpurts();
  renderClothes();
  renderSad();
  renderShopping();
  renderStock();
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

function renderStock() {
  const c = $('#c-stock'); if (!c) return; clear(c);
  const stock = S.stock || [];
  if (!stock.length) { append(c, emptySection('Запасы пока не записаны.', 'Расскажите в чате, сколько чего осталось (подгузники, смесь, продукты) — я запомню и напомню купить заранее.')); return; }
  const card = el('div', { class: 'card' });
  append(card, el('div', { class: 'card-h' }, '📦 Запасы'));
  append(card, el('div', { class: 'card-sub' }, 'Система спросит и напомнит купить, когда запас на исходе.'));
  const bd = el('div', { style: 'padding: 8px 18px 14px' });
  for (const s of stock) {
    const name = s.name || '—';
    const qty = (s.qty != null ? s.qty : '') + (s.unit ? ' ' + s.unit : '');
    const row = el('div', { class: 'stock-row' }, el('span', { class: 'stock-ico' }, '📦'), el('span', {}, el('span', { class: 'stock-name' }, name), (s.note ? el('span', { class: 'stock-note' }, ' — ' + s.note) : null)), qty ? el('span', { class: 'stock-qty' }, qty) : null, delBtn(() => { saveState({ stock: [{ name, _delete: true }] }); }));
    append(bd, row);
  }
  const add = el('button', { class: 'ask-btn' }, '＋ Добавить запас');
  add.addEventListener('click', () => {
    modal('Добавить запас', (b) => {
      const mk = (ph: string) => { const i = el('input', { class: 'modal-inp', placeholder: ph }); append(b, i); return i; };
      const ni = mk('Что (подгузники, смесь…)'), qi = mk('Сколько осталось (2 пачки, 500 мл…)'), no = mk('На сколько хватит / примечание');
      (window as any).__stk = { ni, qi, no };
    }, () => {
      const { ni, qi, no } = (window as any).__stk;
      const qv = String(qi.value || '').match(/(\d+(?:[.,]\d+)?)/);
      const stock2 = [...(S.stock || [])];
      const nm = ni.value.trim();
      if (!nm) return;
      const existing = stock2.find((x: any) => x.name === nm);
      const item = { name: nm, qty: qv ? Number(qv[1].replace(',', '.')) : qi.value.trim(), unit: qi.value.trim().replace(/^\d+(?:[.,]\d+)?\s*/, '') || undefined, note: no.value.trim() || undefined };
      if (existing) { Object.assign(existing, item); saveState({ stock: stock2 }); }
      else { stock2.push(item); saveState({ stock: stock2 }); }
    });
  });
  append(card, bd, add);
  append(c, card);
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
    const role = m.role || '';
    const note = m.note || '';
    const row = el('div', { class: 'fam-row' }, el('span', { class: 'fam-ico' }, '👤'), el('span', {}, el('span', { class: 'fam-name' }, name), role ? el('span', { class: 'fam-role' }, ' · ' + role) : null), note ? el('span', { class: 's-cat' }, note) : null, delBtn(() => { saveState({ family: [{ name, _delete: true }] }); }));
    append(bd, row);
  }
  const add = el('button', { class: 'ask-btn' }, '＋ Добавить');
  add.addEventListener('click', () => {
    modal('Добавить члена семьи', (b) => {
      const inp = (ph: string) => { const i = el('input', { class: 'modal-inp', placeholder: ph }); append(b, i); return i; };
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
  append(card, el('div', { class: 'budget-summary' },
    el('span', { class: 'bs-item' }, el('span', { class: 'bs-lbl' }, 'Доходы'), el('span', { class: 'bs-val pos' }, `${totalIn.toLocaleString('ru-RU')} ₽`)),
    el('span', { class: 'bs-item' }, el('span', { class: 'bs-lbl' }, 'Расходы'), el('span', { class: 'bs-val neg' }, `${totalOut.toLocaleString('ru-RU')} ₽`)),
    el('span', { class: 'bs-item' }, el('span', { class: 'bs-lbl' }, 'Остаток'), el('span', { class: 'bs-val' + ((totalIn - totalOut) < 0 ? ' neg' : ' pos') }, `${(totalIn - totalOut).toLocaleString('ru-RU')} ₽`))));
  const bd = el('div', { style: 'padding: 8px 18px 14px' });
  for (const [cat, g] of byCat) {
    append(bd, el('div', { class: 'budget-cat' }, el('span', {}, cat), el('span', { class: 's-cat' }, `${g.expense ? '−' + g.expense.toLocaleString('ru-RU') + ' ₽' : ''}${g.income ? ' +' + g.income.toLocaleString('ru-RU') + ' ₽' : ''}`)));
    for (const it of g.items.slice(-6)) {
      const row = el('div', { class: 'budget-row' },
        el('span', {}, it.note || it.category || 'другое'),
        it.date ? el('span', { class: 'budget-note' }, String(it.date).slice(5)) : null,
        el('span', { class: 'budget-amt' }, `${it.type === 'income' ? '+' : '−'}${Number(it.amount) || 0} ₽`),
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
      const mk = (ph: string, def?: string) => { const i = el('input', { class: 'modal-inp', placeholder: ph, value: def || '' }); append(b, i); return i; };
      const sel = el('select', { class: 'modal-inp' });
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
    const bd = el('div', { class: 'dyn-body' }, t.content || '');
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

/* Карточка события таймлайна: клик по маркеру (просмотр + смена даты/времени + удаление) */
function htlEventCard(it: any) {
  const d = it.e;
  const key = it.kind === 'feeds' ? 'feeds' : it.kind === 'sleeps' ? 'sleeps' : 'events';
  // Дата+время локально (НЕ toISOString — UTC-сдвиг уедет на день назад)
  const dt = new Date(d.timestamp);
  const pad = (n: number) => ('0' + n).slice(-2);
  const tf = el('input', { type: 'datetime-local', class: 'modal-inp', value: dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) + 'T' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) }) as HTMLInputElement;
  modal(it.title, (b) => {
    append(b, el('div', { style: 'font-size:26px;text-align:center;padding:8px 0 6px' }, it.icon));
    const rows: [string, string][] = [];
    if (it.kind === 'sleeps' && d.end) rows.push(['Длительность', durStr(d.end - d.timestamp)]);
    if (it.kind === 'feeds' && d.amount) rows.push(['Объём', String(d.amount) + ' мл']);
    if (d.type) rows.push(['Тип', String(d.type)]);
    if (d.note) rows.push(['Заметка', String(d.note)]);
    for (const [l, v] of rows) append(b, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, l), el('span', { class: 'c-val' }, v)));
    append(b, el('div', { class: 'clothes-row' }, el('span', { class: 'c-lbl' }, 'Дата и время'), tf));
    const del = el('button', { class: 'modal-btn danger' }, 'Удалить запись');
    del.addEventListener('click', () => {
      if (!confirm('Удалить эту запись?')) return;
      // Серверный merge только дополняет массивы — удаление работает ТОЛЬКО через маркер _delete
      // (копия записи целиком, включая timestamp: delByKey матчит по title|note|timestamp).
      saveState({ [key]: [{ ...d, _delete: true }] });
      document.querySelector('.modal-overlay')?.remove();
    });
    append(b, el('div', { style: 'text-align:center;padding-top:12px' }, del));
  }, () => {
    const newTs = tsFromTime(tf.value, true);
    if (newTs === d.timestamp) return; // ничего не меняли
    const { _delete, ...rest } = d;
    saveState({ [key]: [{ ...d, _delete: true }, { ...rest, timestamp: newTs }] });
  });
}

let htlDays = 5; // глубина горизонтального таймлайна (дней)

// --- Фото: EXIF + обработка перед загрузкой ---
/** Данные из EXIF: ориентация (0x0112), дата съёмки (0x9003 в ExifIFD), GPS (IFD GPSInfo). */
function getExifInfo(buf: ArrayBuffer): { orientation: number; taken: string | null; gps: { lat: number; lon: number } | null } {
  const info = { orientation: 1, taken: null as string | null, gps: null as { lat: number; lon: number } | null };
  try {
    const dv = new DataView(buf);
    if (dv.getUint16(0, false) !== 0xffd8) return info; // не JPEG
    const ascii = (p: number, len: number): string => {
      const bytes: number[] = [];
      for (let i = 0; i < len; i++) {
        const b = dv.getUint8(p + i);
        if (b === 0) break;
        bytes.push(b);
      }
      return String.fromCharCode(...bytes);
    };
    const rational = (p: number, little: boolean): number => {
      const num = dv.getUint32(p, little), den = dv.getUint32(p + 4, little);
      return den ? num / den : NaN;
    };
    let off = 2;
    while (off + 4 < dv.byteLength) {
      // ВНИМАНИЕ: проверяем БАЙТ маркера (getUint8), а не слово — иначе FF E0/E1 ≠ 0xff и выходим сразу
      if (dv.getUint8(off) !== 0xff) return info;
      const marker = dv.getUint8(off + 1);
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) { off += 2; continue; }
      const len = dv.getUint16(off + 2, false);
      if (marker === 0xe1) { // APP1 — Exif
        let p = off + 4;
        if (dv.getUint32(p, false) === 0x45786966 && dv.getUint16(p + 4, false) === 0) { // 'Exif\0\0'
          p += 6;
          const bo = dv.getUint16(p, false);
          if (bo !== 0x4949 && bo !== 0x4d4d) return info;
          const little = bo === 0x4949;
          const ifd0 = dv.getUint32(p + 4, little);
          const readIfd = (base: number): Map<number, [number, number]> => {
            // p уже указывает на начало TIFF (после 'Exif\0\0') — офсеты IFD относительны p
            const tiff = p;
            const tags = new Map<number, [number, number]>();
            let q = tiff + ifd0;
            const n = dv.getUint16(q, little);
            q += 2;
            for (let i = 0; i < n && q + 12 <= dv.byteLength; i++) {
              const tag = dv.getUint16(q, little);
              const type = dv.getUint16(q + 2, little);
              const count = dv.getUint32(q + 4, little);
              tags.set(tag, [type, count]);
              tags.set(-(tag + 100000), q + 8); // офсет данных (некрасиво, но компактно)
              q += 12;
            }
            return tags;
          };
          const ifd0Tags = readIfd(ifd0);
          const valPtr = (tag: number, type: number, count: number): number => {
            const size = (type === 1 || type === 7) ? 1 : type === 2 ? 1 : type === 3 ? 2 : type === 4 || type === 9 ? 4 : 8;
            const dataOff = ifd0Tags.get(-(tag + 100000)) ?? 0;
            return (size * count > 4 || type === 5 || type === 10) ? (p + dv.getUint32(dataOff, little)) : dataOff;
          };
          // Ориентация
          if (ifd0Tags.has(0x0112)) {
            const [t, c] = ifd0Tags.get(0x0112)!;
            info.orientation = dv.getUint16(valPtr(0x0112, t, c), little) || 1;
          }
          // ExifIFD → дата съёмки
          if (ifd0Tags.has(0x8769)) {
            const [t, c] = ifd0Tags.get(0x8769)!;
            const exifIfd = dv.getUint32(valPtr(0x8769, t, c), little);
            const tiff = p;
            let q = tiff + exifIfd;
            const n = dv.getUint16(q, little);
            q += 2;
            for (let i = 0; i < n && q + 12 <= dv.byteLength; i++) {
              const tag = dv.getUint16(q, little);
              const type = dv.getUint16(q + 2, little);
              const count = dv.getUint32(q + 4, little);
              if (tag === 0x9003) { // DateTimeOriginal 'YYYY:MM:DD HH:MM:SS'
                const size = type === 2 ? 1 : 4;
                const dOff = size * count > 4 ? tiff + dv.getUint32(q + 8, little) : q + 8;
                info.taken = ascii(dOff, Math.min(count, 19));
              }
              q += 12;
            }
          }
          // Некоторые обработчики (PIL и др.) пишут DateTimeOriginal прямо в IFD0 — fallback
          // valPtr уже возвращает АБСОЛЮТНУЮ позицию данных — повторно p/офсет применять нельзя
          if (!info.taken && ifd0Tags.has(0x9003)) {
            const [t, c] = ifd0Tags.get(0x9003)!;
            info.taken = ascii(valPtr(0x9003, t, c), Math.min(c, 19));
          }
          // GPSInfo IFD → координаты
          if (ifd0Tags.has(0x8825)) {
            const [t, c] = ifd0Tags.get(0x8825)!;
            const gpsIfd = dv.getUint32(valPtr(0x8825, t, c), little);
            const tiff = p;
            let q = tiff + gpsIfd;
            const n = dv.getUint16(q, little);
            q += 2;
            let lat: number | null = null, lon: number | null = null;
            let latRef = '', lonRef = '';
            for (let i = 0; i < n && q + 12 <= dv.byteLength; i++) {
              const tag = dv.getUint16(q, little);
              const type = dv.getUint16(q + 2, little);
              const count = dv.getUint32(q + 4, little);
              if (tag === 0x0001) latRef = ascii(q + 8, 1); // GPSLatitudeRef
              else if (tag === 0x0002) { // GPSLatitude: 3 RATIONAL
                const dOff = type === 5 ? tiff + dv.getUint32(q + 8, little) : q + 8;
                const d = rational(dOff, little), m = rational(dOff + 8, little), s = rational(dOff + 16, little);
                lat = d + m / 60 + s / 3600;
              } else if (tag === 0x0003) lonRef = ascii(q + 8, 1);
              else if (tag === 0x0004) {
                const dOff = type === 5 ? tiff + dv.getUint32(q + 8, little) : q + 8;
                const d = rational(dOff, little), m = rational(dOff + 8, little), s = rational(dOff + 16, little);
                lon = d + m / 60 + s / 3600;
              }
              q += 12;
            }
            if (lat != null && lon != null && isFinite(lat) && isFinite(lon)) {
              if (latRef === 'S') lat = -lat;
              if (lonRef === 'W') lon = -lon;
              info.gps = { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 };
            }
          }
        }
        return info;
      }
      off += 2 + len;
    }
  } catch { /* мусор — без EXIF */ }
  return info;
}

/** Ресайз через canvas; EXIF-ориентацию НЕ поворачиваем вручную — современные браузеры
 *  применяют её при декодировании (image-orientation: from-image), drawImage рисует уже
 *  повёрнутое изображение. Ручной поворот давал ДВОЙНОЕ применение (баг: IMG_0270 c iPhone). */
function processPhoto(file: File): Promise<{ dataUrl: string; exif: { taken: string | null; gps: { lat: number; lon: number } | null } }> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('read failed'));
    fr.onload = () => {
      const buf = fr.result as ArrayBuffer;
      const exif = getExifInfo(buf);
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        const MAX = 1200;
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const sc = Math.min(1, MAX / Math.max(iw, ih));
        const w = Math.max(1, Math.round(iw * sc)), h = Math.max(1, Math.round(ih * sc));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        if (!ctx) { reject(new Error('no canvas')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: cv.toDataURL('image/jpeg', 0.85), exif });
      };
      img.src = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
    };
    fr.readAsArrayBuffer(file);
  });
}

/** dataURL → Blob (для бинарной загрузки с прогрессом) */
function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}

/** Бинарный POST медиа с прогрессом загрузки (XHR upload.onprogress). */
function xhrPostMedia(url: string, body: Blob, fileName: string, kind: 'photo' | 'video', desc: string, exif: any, onProgress?: (pct: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(fileName || (kind === 'video' ? 'video.mp4' : 'photo.jpg')));
    xhr.setRequestHeader('X-Kind', kind);
    xhr.setRequestHeader('X-Desc', encodeURIComponent(desc));
    if (exif) xhr.setRequestHeader('X-Exif', encodeURIComponent(JSON.stringify(exif)));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      try {
        const j = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) reject(new Error((j && j.error) || 'HTTP ' + xhr.status));
        else resolve(j);
      } catch { reject(new Error('bad response')); }
    };
    xhr.onerror = () => reject(new Error('network error'));
    xhr.send(body);
  });
}

/** Загрузка медиа: только фаза UPLOAD (ответ сервера мгновенный — файл встал в очередь).
 *  Прогресс обработки (конвертация) приходит по WS '/media-queue'. */
function uploadMedia(file: File, kind: 'photo' | 'video', desc: string, pre?: { dataUrl: string; exif: { taken: string | null; gps: { lat: number; lon: number } | null } }, onProgress?: (pct: number) => void): Promise<any> {
  const url = '/api/chat/' + CHAT_ID + '/media?clientId=' + CID + '&clientSecret=' + SEC;
  if (kind === 'video') {
    return xhrPostMedia(url, file, file.name, 'video', desc, null, onProgress);
  }
  const p = pre ? Promise.resolve(pre) : processPhoto(file);
  return p.then((r) => dataUrlToBlob(r.dataUrl).then((blob) => xhrPostMedia(url, blob, file.name || 'photo.jpg', 'photo', desc, r.exif, onProgress)));
}

function pickPhotoFile(onPick: (f: File) => void): void {
  const inp = el('input', { type: 'file', accept: 'image/*,video/*' }) as HTMLInputElement;
  inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) onPick(f); });
  inp.click();
}

function pickPhotoFiles(onPick: (files: File[]) => void): void {
  const inp = el('input', { type: 'file', accept: 'image/*,video/*', multiple: true }) as HTMLInputElement;
  inp.addEventListener('change', () => { const fs = Array.from(inp.files || []); if (fs.length) onPick(fs); });
  inp.click();
}

/** 'YYYY:MM:DD HH:MM:SS' (EXIF) → 'ДД.ММ.ГГГГ ЧЧ:ММ' */
function fmtTaken(s: string): string {
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);
  if (!m) return s;
  return m[3] + '.' + m[2] + '.' + m[1] + ' ' + m[4] + ':' + m[5];
}

/** Секунды → 'М:СС' (длительность видео) */
function fmtDur(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/** Полноэкранный просмотр фото: зум колесом/пинчем, драг мышью/пальцем, двойной клик — 2.5x.
 *  Оверлей поверх приложения — остальной UI остаётся под ним. */
function photoFullscreen(p: any, nav?: any[]) {
  document.querySelectorAll('.modal-overlay, .fs-view').forEach((x) => x.remove());
  // Список для листания ◀▶: переданный контекст (например, фото дня) или вся галерея
  const sorted = nav || (S.photos || []).slice().sort((a, b) => galDir * (photoSortKey(a) - photoSortKey(b)));
  const idx = sorted.findIndex((x: any) => x.id === p.id);
  const ov = el('div', { class: 'fs-view' });
  const stage = el('div', { class: 'fs-stage' });
  const isVideo = p.type === 'video';
  const src = phUrl(p.id);
  // Видео — native controls (autoplay), без зума/драга; фото — как раньше
  const media = isVideo
    ? (el('video', { class: 'fs-video', src, controls: '', autoplay: '', playsinline: '' }) as HTMLVideoElement)
    : (el('img', { class: 'fs-img', src, alt: p.desc || '' }) as HTMLImageElement);
  let scale = 1, tx = 0, ty = 0;
  let onMove: ((e: MouseEvent) => void) | null = null;
  let onUp: (() => void) | null = null;
  const apply = () => { media.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; };
  if (!isVideo) {
    // ВАЖНО: img draggable по умолчанию — браузер перехватывает нажатие в native drag
    // (картинка «тянется как файл», mousemove/mouseup не приходят). Отключаем.
    (media as HTMLImageElement).draggable = false;
    stage.addEventListener('dragstart', (e: DragEvent) => e.preventDefault());
    // Зум колесом (от курсора — держим точку под курсором неподвижной)
    stage.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const rect = stage.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2 - tx;
      const cy = e.clientY - rect.top - rect.height / 2 - ty;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const ns = Math.min(6, Math.max(1, scale * factor));
      if (ns === scale) return;
      tx -= cx * (ns / scale - 1);
      ty -= cy * (ns / scale - 1);
      scale = ns;
      apply();
    }, { passive: false });
    // Драг мышью — именованные обработчики, чтобы снимать их при закрытии/листании
    let dragging = false, sx = 0, sy = 0, stx = 0, sty = 0;
    onMove = (e: MouseEvent) => { if (!dragging) return; tx = stx + (e.clientX - sx); ty = sty + (e.clientY - sy); apply(); };
    onUp = () => { dragging = false; stage.style.cursor = 'grab'; };
    stage.addEventListener('mousedown', (e: MouseEvent) => { dragging = true; sx = e.clientX; sy = e.clientY; stx = tx; sty = ty; stage.style.cursor = 'grabbing'; });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  // Тач: драг + пинч-зум
  let pinch0 = 0, pScale = 1, pTx = 0, pTy = 0;
  stage.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length === 2) { pinch0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); pScale = scale; pTx = tx; pTy = ty; dragging = false; }
    else if (e.touches.length === 1) { dragging = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; stx = tx; sty = ty; }
  }, { passive: true });
  stage.addEventListener('touchmove', (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinch0 > 0) scale = Math.min(6, Math.max(1, pScale * (d / pinch0)));
      apply();
    } else if (dragging && e.touches.length === 1) {
      tx = stx + (e.touches[0].clientX - sx); ty = sty + (e.touches[0].clientY - sy); apply();
    }
  }, { passive: true });
  stage.addEventListener('touchend', () => { dragging = false; pinch0 = 0; }, { passive: true });
  // Двойной клик — 2.5x / сброс
  media.addEventListener('dblclick', () => { if (scale > 1) { scale = 1; tx = 0; ty = 0; } else { scale = 2.5; tx = 0; ty = 0; } apply(); });
  } // конец if (!isVideo) — для видео зум/драг не нужны (native controls)
  // Панель слева: описание, EXIF (дата съёмки, длительность, GPS), действия
  let desc = String(p.desc || '');
  const bar = el('div', { class: 'fs-side' });
  const ni = el('input', { type: 'text', class: 'modal-inp', value: desc, placeholder: 'Описание (необязательно)' }) as HTMLInputElement;
  ni.addEventListener('input', () => { desc = ni.value; });
  ni.addEventListener('blur', () => { if (desc !== String(p.desc || '')) saveState({ photos: [{ id: p.id, desc }] }); });
  const ex = p.exif;
  const info: string[] = [];
  if (p.duration) info.push('⏱ ' + fmtDur(p.duration));
  if (ex && ex.taken) info.push('📅 Снято: ' + fmtTaken(ex.taken));
  if (ex && ex.gps) info.push('📍 ' + ex.gps.lat.toFixed(4) + ', ' + ex.gps.lon.toFixed(4));
  const acts: HTMLElement[] = [];
  if (!isVideo) {
    const setAv = el('button', { class: 'modal-btn' + (S.avatar === p.id ? ' sel' : '') }, S.avatar === p.id ? '⭐ Это аватарка' : 'Сделать аватаркой');
    setAv.addEventListener('click', () => { saveState({ avatar: p.id }); setAv.textContent = '⭐ Это аватарка'; setAv.classList.add('sel'); });
    acts.push(setAv);
  }
  const del = el('button', { class: 'modal-btn danger' }, '🗑 Удалить');
  del.addEventListener('click', () => {
    if (!confirm('Удалить это фото?')) return;
    const extra: any = { photos: [{ id: p.id, _delete: true }] };
    if (S.avatar === p.id) extra.avatar = '';
    saveState(extra);
    closeFs();
  });
  append(bar, ni);
  if (info.length) append(bar, el('span', { class: 'fs-info' }, info.join('  ·  ')));
  append(bar, el('span', { class: 'fs-acts' }, ...acts, del));
  // Навигация: стрелки ◀ ▶ (в порядке сортировки галереи) + клавиши ← → Esc
  // ВАЖНО: при листании снимаем ВСЕ window-обработчики старого просмотра —
  // иначе они копятся и при нажатии клавиш запускают лавину пересозданий (виснет после ~10 фото)
  const closeFs = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('keydown', onKey);
    ov.remove();
  };
  const go = (d: number) => { const t = sorted[idx + d]; if (t) { closeFs(); photoFullscreen(t, nav); } };
  if (sorted.length > 1) {
    if (idx > 0) { const l = el('button', { class: 'fs-nav l', title: 'Предыдущее (←)' }, '◀'); l.addEventListener('click', () => go(-1)); append(ov, l); }
    if (idx >= 0 && idx < sorted.length - 1) { const r = el('button', { class: 'fs-nav r', title: 'Следующее (→)' }, '▶'); r.addEventListener('click', () => go(1)); append(ov, r); }
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'Escape') closeFs();
  };
  window.addEventListener('keydown', onKey);
  const close = el('button', { class: 'fs-close' }, '✕');
  close.addEventListener('click', () => closeFs());
  ov.addEventListener('click', (e: MouseEvent) => { if (e.target === ov) closeFs(); });
  append(stage, media);
  append(ov, stage, bar, close);
  append(document.body, ov);
}

function photoModal(p: any) {
  // Защита от стака модалок
  document.querySelectorAll('.modal-overlay').forEach((x) => x.remove());
  let desc = String(p.desc || '');
  modal('Фото', (b) => {
    append(b, el('img', { class: 'gal-preview', src: phUrl(p.id) }));
    const ex = p.exif;
    if (ex && (ex.taken || ex.gps)) {
      const parts: string[] = [];
      if (ex.taken) parts.push('📅 Снято: ' + fmtTaken(ex.taken));
      if (ex.gps) parts.push('📍 ' + ex.gps.lat.toFixed(4) + ', ' + ex.gps.lon.toFixed(4));
      append(b, el('div', { class: 'gal-exif' }, parts.join('  ·  ')));
    }
    const ni = el('input', { type: 'text', class: 'modal-inp', value: desc, placeholder: 'Описание (необязательно)' }) as HTMLInputElement;
    ni.addEventListener('input', () => { desc = ni.value; });
    append(b, el('div', { class: 'photo-desc-row' }, ni));
    const setAv = el('button', { class: 'modal-btn' + (S.avatar === p.id ? ' sel' : '') }, S.avatar === p.id ? '⭐ Это аватарка' : 'Сделать аватаркой');
    setAv.addEventListener('click', () => { saveState({ avatar: p.id }); setAv.textContent = '⭐ Это аватарка'; setAv.classList.add('sel'); });
    const del = el('button', { class: 'modal-btn danger' }, 'Удалить фото');
    del.addEventListener('click', () => {
      if (!confirm('Удалить это фото?')) return;
      const extra: any = { photos: [{ id: p.id, _delete: true }] };
      if (S.avatar === p.id) extra.avatar = '';
      saveState(extra);
      document.querySelector('.modal-overlay')?.remove();
    });
    append(b, el('div', { class: 'photo-actions' }, setAv, del));
  }, () => {
    if (desc !== String(p.desc || '')) saveState({ photos: [{ id: p.id, desc }] });
  }, true);
}

// Сортировка галереи: по дате добавления (ts) или дате съёмки (exif.taken); -1 = новые сверху
let galSort: 'ts' | 'taken' = 'taken';
let galDir = -1;

/** 'YYYY:MM:DD HH:MM:SS' (EXIF) → локальный timestamp */
function exifTs(s: string): number {
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);
  if (!m) return NaN;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
}

function photoSortKey(p: any): number {
  const base = galSort === 'taken' ? (p.exif && p.exif.taken ? exifTs(p.exif.taken) : NaN) : p.ts;
  return isNaN(base) ? -Infinity : base; // без даты — вниз
}

function renderPhotos() {
  const c = $('#c-photos'); if (!c) return; clear(c);
  const photos = S.photos || [];
  const sorted = photos.slice().sort((a, b) => galDir * (photoSortKey(a) - photoSortKey(b)));
  const bar = el('div', { class: 'gal-bar' });
  const seg = (label: string, key: 'ts' | 'taken') => {
    const b = el('button', { class: 'gal-seg' + (galSort === key ? ' on' : '') }, label + (galSort === key ? (galDir === -1 ? ' ↓' : ' ↑') : ''));
    b.addEventListener('click', () => {
      if (galSort === key) galDir = -galDir; else { galSort = key; galDir = -1; }
      renderPhotos();
    });
    return b;
  };
  append(bar, seg('📥 Добавление', 'ts'), seg('📅 Дата фото', 'taken'));
  append(c, bar);
  const grid = el('div', { class: 'gal-grid' });
  const add = el('button', { class: 'gal-add' }, el('span', { class: 'ga-ico' }, '📷'), 'Добавить фото');
  add.addEventListener('click', () => {
    pickPhotoFiles((files) => {
      if (files.length === 1) {
        // Одно медиа — превью + описание перед загрузкой
        const f = files[0];
        const isVideo = f.type.startsWith('video/');
        const ready: Promise<{ kind: 'photo' | 'video'; dataUrl?: string; exif?: { taken: string | null; gps: { lat: number; lon: number } | null } }> =
          isVideo ? Promise.resolve({ kind: 'video' }) : processPhoto(f).then((r) => ({ kind: 'photo', dataUrl: r.dataUrl, exif: r.exif }));
        ready.then((r) => {
          let desc = '';
          let upBarEl: HTMLElement | null = null;
          document.querySelectorAll('.modal-overlay').forEach((x) => x.remove());
          modal('Добавить фото', (b) => {
            if (r.kind === 'video') {
              append(b, el('video', { class: 'gal-preview', src: URL.createObjectURL(f), muted: true, playsinline: '', controls: '' }));
            } else {
              append(b, el('img', { class: 'gal-preview', src: r.dataUrl }));
            }
            const ni = el('input', { type: 'text', class: 'modal-inp', value: '', placeholder: 'Описание (необязательно)' }) as HTMLInputElement;
            ni.addEventListener('input', () => { desc = ni.value; });
            append(b, ni);
            const pb = el('div', { class: 'up-wrap' });
            append(pb, el('div', { class: 'up-bar' }));
            append(b, pb);
            upBarEl = pb.querySelector('.up-bar');
          }, () => {
            // Одиночный файл: upload-фаза в модалке, обработка — по WS-очереди (id из ответа)
            uploadMedia(f, r.kind, desc, r.kind === 'photo' ? { dataUrl: r.dataUrl as string, exif: r.exif as { taken: string | null; gps: { lat: number; lon: number } | null } } : undefined, (pct) => {
              if (upBarEl) { upBarEl.style.width = pct + '%'; upBarEl.textContent = pct + '%'; }
            })
              .then((rec) => {
                const onQueue = (items: any[]) => {
                  const it = items.find((x) => x.id === rec.id);
                  if (!it) return;
                  if (it.status === 'done') {
                    mediaQueueListener = null;
                    if (upBarEl) { upBarEl.style.width = '100%'; upBarEl.textContent = 'Готово'; }
                    loadState();
                    setTimeout(() => { document.querySelectorAll('.modal-overlay').forEach((x) => x.remove()); }, 500);
                  } else if (it.status === 'error') {
                    mediaQueueListener = null;
                    if (upBarEl) upBarEl.textContent = 'Ошибка обработки';
                  } else {
                    if (upBarEl) { upBarEl.style.width = (it.pct || 0) + '%'; upBarEl.textContent = 'Обработка ' + (it.pct || 0) + '%'; }
                  }
                };
                // Сначала проверить кеш (обработка могла завершиться до установки listener)
                const cached = mediaQueueItems.find((x) => x.id === rec.id);
                if (cached) onQueue(mediaQueueItems);
                else mediaQueueListener = onQueue;
              })
              .catch((e) => { console.error('upload failed:', e); alert('Не удалось загрузить файл'); });
          });
        }).catch((e) => { console.error(e); alert('Не удалось обработать файл'); });
        return;
      }
      // Несколько файлов: СНАЧАЛА загружаем все (upload-фаза, прогресс на кнопке и полосе),
      // потом сервер обрабатывает список по очереди — панель «⏳ Обработка N/M» приходит по WS
      // (и переживает перезагрузку страницы).
      const total = files.length;
      const orig = add.textContent;
      let done = 0;
      const chain = files.reduce((p, f) => {
        const isVideo = f.type.startsWith('video/');
        const ready: Promise<{ kind: 'photo' | 'video'; dataUrl?: string; exif?: { taken: string | null; gps: { lat: number; lon: number } | null } }> =
          isVideo ? Promise.resolve({ kind: 'video' }) : processPhoto(f).then((r) => ({ kind: 'photo', dataUrl: r.dataUrl, exif: r.exif }));
        return p.then(() => ready)
          .then((r) => uploadMedia(f, r.kind, '', r.kind === 'photo' ? { dataUrl: r.dataUrl as string, exif: r.exif as { taken: string | null; gps: { lat: number; lon: number } | null } } : undefined, (pct) => {
            add.textContent = '⏳ Загрузка ' + (done + 1) + '/' + total + ' · ' + pct + '%';
          }))
          .then(() => { done++; add.textContent = '⏳ Загрузка ' + done + '/' + total; });
      }, Promise.resolve());
      chain
        .then(() => { add.textContent = orig; })
        .catch((e) => { console.error('batch upload failed:', e); alert('Не удалось загрузить все файлы'); add.textContent = orig; });
    });
  });
  append(grid, add);
  for (const p of sorted) {
    // ВНИМАНИЕ: нельзя вешать класс .av (display:none для шапки) — карточка галереи скроется
    const item = el('div', { class: 'gal-item' });
    if (p.type === 'video') {
      // Видео-карточка: постер-превью + иконка ▶; при наведении играется (muted, аля ютьюб)
      const v = el('video', { class: 'gal-video', src: phUrl(p.id), poster: phUrl(p.id, true), muted: true, playsinline: '', preload: 'metadata' }) as HTMLVideoElement;
      v.addEventListener('mouseenter', () => { v.play().catch(() => { /* ок */ }); });
      v.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0; });
      append(item, v);
      append(item, el('div', { class: 'gal-video-ico' }, '▶'));
    } else {
      append(item, el('img', { src: phUrl(p.id, true), alt: p.desc || '', loading: 'lazy', decoding: 'async' }));
    }
    const del = el('button', { class: 'gal-del', title: 'Удалить' }, '✕');
    del.addEventListener('click', (evt: Event) => {
      evt.stopPropagation();
      if (!confirm('Удалить это фото?')) return;
      const extra: any = { photos: [{ id: p.id, _delete: true }] };
      if (S.avatar === p.id) extra.avatar = '';
      saveState(extra);
    });
    append(item, del);
    const cap = p.desc || (p.exif && p.exif.taken ? '📅 ' + fmtTaken(p.exif.taken).slice(0, 10) : '');
    if (cap) append(item, el('div', { class: 'gal-cap' }, cap));
    item.addEventListener('click', () => photoFullscreen(p));
    append(grid, item);
  }
  append(c, grid);
  if (!photos.length) {
    append(c, el('div', { class: 'empty', style: 'padding:0 18px 18px' }, 'Фотографий пока нет. Добавьте первые — нажмите «Добавить фото».'));
  }
  renderMediaPanel();
}

function setupAvatar() {
  const av = $('#av') as HTMLImageElement;
  if (!av) return;
  av.addEventListener('click', () => {
    // Клик по аватарке — полноэкранный просмотр ТОЛЬКО этого фото (без листания по галерее)
    const photo = (S.photos || []).find((p: any) => p.id === S.avatar);
    if (photo) { photoFullscreen(photo, [photo]); return; }
    // Аватарки нет — загрузка новой
    pickPhotoFile((f) => {
      uploadMedia(f, 'photo', '')
        .then((p) => saveState({ avatar: p.id }))
        .then(() => loadState())
        .catch((e) => { console.error('avatar upload failed:', e); alert('Не удалось загрузить фото'); });
    });
  });
}
let weatherCache: { city: string; ts: number; data: any } | null = null;
const WD_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
function weatherCard(): HTMLElement | null {
  const card = el('div', { class: 'card weather' });
  const city = String(S.city || '').trim();
  if (!city) {
    append(card, el('div', { class: 'card-h' }, '🌤 Погода'));
    append(card, el('div', { class: 'weather-hint' }, 'Скажите в чате, в каком вы городе — я подключу погоду на сегодня и на неделю.'));
    return card;
  }
  const head = el('div', { class: 'card-h' }, '🌤 Погода · ' + city);
  append(card, head);
  const body = el('div', { class: 'weather-body' });
  append(card, body);
  const apply = (w: any) => {
    clear(body);
    const cur = w.current, today = w.daily?.[0];
    const todayBox = el('div', { class: 'w-today' });
    append(todayBox,
      el('div', { class: 'w-now' }, el('span', { class: 'w-ico' }, cur.icon), el('span', { class: 'w-temp' }, cur.temp + '°')),
      el('div', { class: 'w-cur' },
        el('div', { class: 'w-desc' }, cur.desc),
        el('div', { class: 'w-meta' },
          'Ощущается ' + cur.feels + '° · Ветер ' + cur.wind + ' м/с · Влажность ' + cur.humidity + '%' + (cur.precip ? ' · Осадки ' + cur.precip + ' мм' : ''),
          today ? el('div', { class: 'w-meta2' }, 'Днём ' + today.tmax + '°, ночью ' + today.tmin + '°' + (today.precipProb ? ' · Дождь ' + today.precipProb + '%' : '')) : null)));
    append(body, todayBox);
    const days = el('div', { class: 'w-days' });
    for (const d of (w.daily || []).slice(1, 8)) {
      const day = el('div', { class: 'w-day' });
      const dt = new Date(d.date + 'T00:00:00');
      append(day,
        el('div', { class: 'w-dn' }, WD_SHORT[dt.getDay()]),
        el('div', { class: 'w-di' }, d.icon),
        el('div', { class: 'w-ddesc' }, d.desc),
        el('div', { class: 'w-dt' }, d.tmin + '°…' + d.tmax + '°'),
        el('div', { class: 'w-dp' }, d.precipProb ? '🌧 ' + d.precipProb + '%' : ''));
      append(days, day);
    }
    append(body, days);
  };
  const cached = weatherCache && weatherCache.city === city && Date.now() - weatherCache.ts < 15 * 60 * 1000 ? weatherCache.data : null;
  if (cached) { apply(cached); return card; }
  append(body, el('div', { class: 'w-load' }, 'Загружаю погоду…'));
  fetch('/api/weather?city=' + encodeURIComponent(city) + '&clientId=' + encodeURIComponent(CID) + '&clientSecret=' + encodeURIComponent(SEC))
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((w) => { weatherCache = { city, ts: Date.now(), data: w }; apply(w); })
    .catch(() => { clear(body); append(body, el('div', { class: 'w-load' }, 'Не удалось загрузить погоду для «' + city + '».')); });
  return card;
}
const MODE_LABELS: Record<string, string> = {
  feeding: 'Питание', likes: 'Любит', skills: 'Навыки', sleepPattern: 'Режим сна', sleep: 'Сон',
  character: 'Характер', behavior: 'Поведение', temperament: 'Темперамент', routine: 'Режим дня', habits: 'Привычки',
};
function renderMode() {
  const c = $('#c-mode'); if (!c) return; clear(c);
  const d = S.details || {};
  const keys = Object.keys(d).filter((k) => d[k] != null && String(d[k]).trim());
  if (!keys.length) {
    append(c, emptySection('Информация о режиме и привычках пока не заполнена.', 'Расскажите в чате про режим дня, питание и привычки ребёнка — я сохраню это здесь и буду учитывать в советах.'));
    return;
  }
  for (const k of keys) {
    const card = el('div', { class: 'card mode-card' });
    append(card, el('div', { class: 'card-h' }, MODE_LABELS[k] || (k[0].toUpperCase() + k.slice(1))));
    append(card, el('div', { class: 'mode-body' }, String(d[k])));
    append(c, card);
  }
}
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
  // Порядок на Главной: сводка → напоминания → погода → хроника (на всю ширину) → профиль → задачи → навыки → план
  const wc = weatherCard(); if (wc) byKey.weather = wc;
  const order = ['notice', 'summary', 'rems', 'weather', 'timeline', 'profile', 'todos', 'skills', 'plan'];
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
  const tabs = [['dash', 'Главная'], ['mode', 'Режим'], ['photos', '📷 Галерея'], ['calendar', 'Календарь'], ['skills', 'Навыки'], ['tips', 'Советы'], ['recipes', 'Рецепты'], ['spurts', 'Скачки'], ['clothes', 'Гардероб'], ['sad', 'Сад'], ['shopping', 'Покупки'], ['stock', '📦 Запасы'], ['family', 'Семья'], ['budget', 'Бюджет'], ['llmn', 'Помощник']];
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
  // Кнопки-варианты активны ТОЛЬКО у последнего вопроса: отвеченные/старые ряды гаснут
  function refreshChoiceStates() {
    const rows = Array.from(me.querySelectorAll('.msg-choices')) as HTMLElement[];
    if (!rows.length) return;
    const msgs = Array.from(me.querySelectorAll('.msg'));
    const lastMsg = msgs[msgs.length - 1];
    rows.forEach((row, i) => {
      const active = i === rows.length - 1 && row.closest('.msg') === lastMsg;
      row.classList.toggle('off', !active);
      row.querySelectorAll('button').forEach((b) => { (b as HTMLButtonElement).disabled = !active; });
    });
  }
  function disableRow(row: HTMLElement) {
    row.classList.add('off');
    row.querySelectorAll('button').forEach((b) => { (b as HTMLButtonElement).disabled = true; });
  }
  function r(m: any) {
    const bub = el('div', { class: 'msg msg-' + m.role });
    append(bub, document.createTextNode(m.text || ''));
    if (m.choices && m.choices.length) {
      const row = el('div', { class: 'msg-choices' });
      if (m.multi) {
        // Мультивыбор: клики накапливаются, «Готово» отправляет выбранное через запятую
        const picked: string[] = [];
        for (const ch of m.choices) {
          const b = el('button', { class: 'msg-choice' }, ch);
          b.addEventListener('click', () => {
            if (/свой вариант/i.test(ch)) { inp.focus(); inp.placeholder = 'Ваш вариант (можно несколько, через запятую)...'; me.scrollTo({ top: me.scrollHeight }); return; }
            const i = picked.indexOf(ch);
            if (i >= 0) { picked.splice(i, 1); b.classList.remove('sel'); }
            else { picked.push(ch); b.classList.add('sel'); }
          });
          append(row, b);
        }
        const done = el('button', { class: 'msg-choice done' }, 'Готово');
        done.addEventListener('click', () => {
          if (!picked.length) return;
          inp.value = 'Ответ: ' + picked.join(', '); sb.click();
          // Сброс выбора после отправки — повторный клик не должен слать дубль
          picked.length = 0;
          for (const b of row.querySelectorAll('.msg-choice.sel')) b.classList.remove('sel');
          disableRow(row);
        });
        append(row, done);
      } else {
        for (const ch of m.choices) {
          const b = el('button', { class: 'msg-choice' }, ch);
          b.addEventListener('click', () => {
            if (/свой вариант/i.test(ch)) { inp.focus(); inp.placeholder = 'Ваш вариант...'; me.scrollTo({ top: me.scrollHeight }); return; }
            inp.value = 'Ответ: ' + ch; sb.click();
            disableRow(row);
          });
          append(row, b);
        }
      }
      append(bub, row);
    }
    return bub;
  }
  function sc() { me!.scrollTo({ top: me!.scrollHeight, behavior: 'smooth' }); }
  const ms = window.PromptUI.messages.get(); for (const m of ms) { append(me, r(m)); } refreshChoiceStates(); sc();
  let st: HTMLElement | null = null, stBuf = '';
  window.PromptUI.messages.on('add', (m) => { if (st) { st.remove(); st = null; stBuf = ''; } append(me, r(m as any)); refreshChoiceStates(); sc(); });
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
setupAvatar();
setupChat();
loadState();
// Восстановить панель обработки после перезагрузки страницы (очередь живёт на сервере)
fetch('/api/chat/' + CHAT_ID + '/media-queue?clientId=' + CID + '&clientSecret=' + SEC)
  .then((r) => r.json())
  .then((d) => { if (d && Array.isArray(d.items)) { mediaQueueItems = d.items; renderMediaPanel(); } })
  .catch(() => { /* ок */ });
window.__runtime_subscribe('/chat/state', (raw: string) => {
  try { const d = JSON.parse(raw); if (d.type === 'state' && d.state) { S = d.state; renderAll(); } } catch { /* ignore */ }
});
// ─── Очередь обработки медиа (конвертация идёт на сервере; UI переживает перезагрузку) ───
let mediaQueueItems: any[] = [];
let mediaQueueListener: ((items: any[]) => void) | null = null;

window.__runtime_subscribe('/media-queue', (raw: string) => {
  try {
    const d = JSON.parse(raw);
    if (d.type === 'queue' && Array.isArray(d.items)) {
      const wasPending = mediaQueueItems.some((i) => i.status !== 'done' && i.status !== 'error');
      mediaQueueItems = d.items;
      const pending = mediaQueueItems.some((i) => i.status !== 'done' && i.status !== 'error');
      if (mediaQueueListener) mediaQueueListener(d.items);
      renderMediaPanel();
      // Вся обработка завершилась — показать новые записи, панель убрать через пару секунд
      if (wasPending && !pending) {
        loadState();
        setTimeout(() => { mediaQueueItems = []; renderMediaPanel(); }, 2500);
      }
    }
  } catch { /* ignore */ }
});

/** Панель «⏳ Обработка N/M» в галерее (общий бар + список файлов со статусами). */
function renderMediaPanel() {
  const c = $('#c-photos'); if (!c) return;
  const old = c.querySelector('.media-panel'); if (old) old.remove();
  if (!mediaQueueItems.length) return;
  const total = mediaQueueItems.length;
  const doneN = mediaQueueItems.filter((i) => i.status === 'done').length;
  const errN = mediaQueueItems.filter((i) => i.status === 'error').length;
  const sumPct = mediaQueueItems.reduce((a: number, i) => a + (i.status === 'done' ? 100 : i.pct || 0), 0);
  const panel = el('div', { class: 'media-panel' });
  append(panel, el('div', { class: 'mp-title' }, '⏳ Обработка: ' + doneN + '/' + total + ' · ' + Math.round(sumPct / total) + '%'));
  const pb = el('div', { class: 'up-wrap' });
  append(pb, el('div', { class: 'up-bar', style: 'width:' + Math.round(sumPct / total) + '%' }));
  append(panel, pb);
  const list = el('div', { class: 'mp-list' });
  for (const i of mediaQueueItems) {
    const st = i.status === 'done' ? '✓' : i.status === 'processing' ? '⏳ ' + (i.pct || 0) + '%' : i.status === 'error' ? '✗' : '…';
    append(list, el('div', { class: 'mp-row' + (i.status === 'done' ? ' ok' : i.status === 'error' ? ' err' : '') },
      el('span', { class: 'mp-name' }, String(i.fileName || i.id)), el('span', { class: 'mp-st' }, st)));
  }
  append(panel, list);
  if (errN) append(panel, el('div', { class: 'mp-title err' }, 'Ошибок: ' + errN));
  // Панель — первая «карточка» сетки (ширина как у «Добавить фото», пропорции 3:4)
  const grid = c.querySelector('.gal-grid');
  if (grid && grid.firstChild) grid.insertBefore(panel, grid.firstChild);
  else if (grid) grid.appendChild(panel);
  else append(c, panel);
}

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
  // until: повторение прекращается после этой даты («по вторникам до конца августа»)
  if (ev.until) {
    const u = parseISO(ev.until);
    if (u && day.getTime() > u.getTime()) return false;
  }
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
/** Редактирование события календаря (в т.ч. повторяющегося): модалка с полями.
 *  Сохранение = та же запись с тем же id и обновлёнными полями — серверный merge
 *  обновляет по id (itemKey 'id:'), дубль не создаётся. */
function calEditModal(e: any) {
  // e == null → режим создания нового события (дата — текущий день)
  const isNew = !e;
  const f = {
    title: String((e && e.title) || ''),
    date: String((e && e.date) || iso(calCursor)),
    time: String((e && e.time) || ''),
    recurring: String((e && e.recurring) || ''),
    until: String((e && e.until) || ''),
    important: !!(e && e.important),
    note: String((e && e.note) || ''),
  };
  let untilRow: HTMLElement;
  // Защита от стака модалок (двойной клик) — старые закрываем
  document.querySelectorAll('.modal-overlay').forEach((x) => x.remove());
  modal(isNew ? 'Новое событие' : 'Редактировать событие', (b) => {
    const ti = el('input', { type: 'text', class: 'modal-inp', value: f.title, placeholder: 'Название' }) as HTMLInputElement;
    const di = el('input', { type: 'date', class: 'modal-inp', value: f.date }) as HTMLInputElement;
    const tmi = el('input', { type: 'time', class: 'modal-inp', value: f.time }) as HTMLInputElement;
    const recSel = el('select', { class: 'modal-inp' },
      el('option', { value: '' }, 'Не повторяется'),
      el('option', { value: 'daily' }, 'Каждый день'),
      el('option', { value: 'weekly' }, 'Каждую неделю'),
      el('option', { value: 'monthly' }, 'Каждый месяц'),
      el('option', { value: 'yearly' }, 'Каждый год')) as HTMLSelectElement;
    // el() ставит атрибут selected даже при false (всем опциям) — выставляем значение свойством
    recSel.value = f.recurring || '';
    const ui = el('input', { type: 'date', class: 'modal-inp', value: f.until }) as HTMLInputElement;
    const impCb = el('input', { type: 'checkbox', checked: f.important }) as HTMLInputElement;
    const imp = el('label', { style: 'display:flex;align-items:center;gap:8px;font-size:13px;margin:6px 0 12px;cursor:pointer' },
      impCb, 'Важное событие ⭐');
    const ni = el('input', { type: 'text', class: 'modal-inp', value: f.note, placeholder: 'Заметка (необязательно)' }) as HTMLInputElement;
    const row = (l: string, elm: HTMLElement) => { const r = el('div', { class: 'form-row' }, el('span', { class: 'f-lbl' }, l), elm); append(b, r); return r; };
    row('Название', ti);
    row('Дата', di);
    row('Время', tmi);
    row('Повторение', recSel);
    untilRow = row('Повторять до', ui);
    append(b, imp, ni);
    const syncUntil = () => { untilRow.style.display = recSel.value ? '' : 'none'; };
    recSel.addEventListener('change', syncUntil); syncUntil();
    // Значения живут в замыкании f — onSave читает их без хаков
    ti.addEventListener('input', () => { f.title = ti.value; });
    di.addEventListener('input', () => { f.date = di.value; });
    tmi.addEventListener('input', () => { f.time = tmi.value; });
    recSel.addEventListener('change', () => { f.recurring = recSel.value; syncUntil(); });
    ui.addEventListener('input', () => { f.until = ui.value; });
    impCb.addEventListener('change', () => { f.important = impCb.checked; });
    ni.addEventListener('input', () => { f.note = ni.value; });
    const del = el('button', { class: 'modal-btn danger' }, 'Удалить событие');
    del.addEventListener('click', () => {
      if (!confirm('Удалить это событие?')) return;
      calDelete(e);
      document.querySelector('.modal-overlay')?.remove();
    });
    if (!isNew) append(b, el('div', { style: 'text-align:center;padding-top:12px' }, del));
  }, () => {
    const upd: Record<string, unknown> = isNew ? { id: newCalId() } : { ...e };
    upd.title = f.title.trim() || 'Без названия';
    upd.date = f.date || (e ? e.date : iso(calCursor));
    upd.time = f.time || null;
    upd.recurring = f.recurring || null;
    upd.until = f.recurring ? f.until || null : null;
    upd.important = f.important;
    upd.note = f.note.trim() || null;
    if (upd.time == null) delete upd.time;
    if (upd.until == null) delete upd.until;
    saveState({ calendar: [upd] });
  });
}
function newCalId(): string {
  return 'ev' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
  it.addEventListener('click', () => calEditModal(e));
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
/** Фото по дням съёмки (exif.taken 'YYYY:MM:DD HH:MM:SS' → 'YYYY-MM-DD') */
function dayPhotosMap(): Map<string, any[]> {
  const map = new Map<string, any[]>();
  for (const p of (S.photos || [])) {
    const taken = p && p.exif && typeof p.exif.taken === 'string' ? p.exif.taken : '';
    const m = taken.match(/^(\d{4}):(\d{2}):(\d{2})/);
    if (!m) continue;
    const key = m[1] + '-' + m[2] + '-' + m[3];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

/** Медиа-подложка календаря: фото — превью, видео — постер (первый кадр) + иконка ▶ */
function calMediaEl(p: any): HTMLElement {
  const src = phUrl(p.id);
  if (p.type === 'video') {
    const w = el('span', { class: 'cal-phwrap-inner' });
    append(w, el('video', { class: 'cal-ph', src, poster: src + '?th=1', muted: true, playsinline: '', preload: 'metadata' }));
    append(w, el('span', { class: 'cal-video-ico' }, '▶'));
    return w;
  }
  return el('img', { class: 'cal-ph', src: src + '?th=1', alt: '', decoding: 'async' });
}

/** mousemove-зоны: область host делится по горизонтали на столько частей, сколько фото дня;
 *  наведение на k-ю зону показывает k-е фото. ph — img или video. */
function attachCalPhotoZones(host: HTMLElement, ph: HTMLElement, dayPhotos: any[]) {
  if (dayPhotos.length < 2) return;
  host.addEventListener('mousemove', (e: MouseEvent) => {
    const r = host.getBoundingClientRect();
    if (r.width <= 0) return;
    const zone = Math.min(dayPhotos.length - 1, Math.floor(((e.clientX - r.left) / r.width) * dayPhotos.length));
    const next = dayPhotos[zone];
    const target = phUrl(next.id);
    if ((ph as any).getAttribute('src') !== target) (ph as any).src = target;
  });
}

function renderCalMonth(c: HTMLElement) {
  const first = new Date(calCursor.getFullYear(), calCursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // неделя с понедельника
  const todayIso = iso(new Date());
  const photosByDay = dayPhotosMap();
  const grid = el('div', { class: 'cal-grid' });
  for (const w of WD) append(grid, el('div', { class: 'cal-dow' }, w));
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const evs = calEvents().filter((e: any) => occursOn(e, d)).sort(sortByTime);
    const cell = el('div', {
      class: 'cal-cell' + (d.getMonth() !== calCursor.getMonth() ? ' other' : '') + (iso(d) === todayIso ? ' today' : ''),
    });
    // Медиа дня — подложка; mousemove по горизонтальным зонам листает медиа дня
    const dayPhotos = photosByDay.get(iso(d)) || [];
    if (dayPhotos.length) {
      const ph = calMediaEl(dayPhotos[0]);
      attachCalPhotoZones(cell, ph, dayPhotos);
      append(cell, ph);
      if (dayPhotos[0].type === 'video') append(cell, el('span', { class: 'cal-video-ico' }, '▶'));
      append(cell, el('div', { class: 'cal-phcnt', title: 'Фото за этот день: ' + dayPhotos.length }, '📷 ' + dayPhotos.length));
    }
    append(cell, el('div', { class: 'cal-num' }, String(d.getDate())));
    // События — снизу ячейки, поверх фото
    const evsWrap = el('div', { class: 'cal-evs' });
    for (const e of evs.slice(0, 3)) {
      const evEl = el('div', {
        class: 'cal-ev' + (e.important ? ' imp' : '') + (e.recurring ? ' rec' : '') + (e.done ? ' done' : ''),
        'data-tip': (e.time ? e.time + ' ' : '') + e.title + (e.recurring ? ' · повторяется' : '') + (e.important ? ' · важно' : '') + (e.note ? ' — ' + e.note : ''),
      }, (e.time ? e.time + ' ' : '') + e.title);
      evEl.addEventListener('click', (evt: Event) => { evt.stopPropagation(); calEditModal(e); });
      append(evsWrap, evEl);
    }
    if (evs.length > 3) append(evsWrap, el('div', { class: 'cal-more' }, '+' + (evs.length - 3)));
    if (evs.length) append(cell, evsWrap);
    cell.addEventListener('click', () => { calView = 'day'; calCursor = d; renderCalendar(); });
    append(grid, cell);
  }
  append(c, grid);
}
function renderCalWeek(c: HTMLElement) {
  const monday = startOfDay(calCursor);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const todayIso = iso(new Date());
  const photosByDay = dayPhotosMap();
  const wk = el('div', { class: 'cal-week' });
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * DAY_MS);
    const evs = calEvents().filter((e: any) => occursOn(e, d)).sort(sortByTime);
    const col = el('div', { class: 'cal-daycol' + (iso(d) === todayIso ? ' today' : '') });
    append(col, el('h4', {}, WD[i] + ' ' + fmtDay(d)));
    // Медиа дня — превью 3:4 с mousemove-зонами (как в месячном виде);
    // клик ничем не перехватывается — колонка проваливает в дневной вид
    const dayPhotos = photosByDay.get(iso(d)) || [];
    if (dayPhotos.length) {
      const phWrap = el('div', { class: 'cal-phwrap', title: 'Фото за этот день: ' + dayPhotos.length });
      const ph = calMediaEl(dayPhotos[0]);
      attachCalPhotoZones(phWrap, ph, dayPhotos);
      append(phWrap, ph);
      if (dayPhotos[0].type === 'video') append(phWrap, el('span', { class: 'cal-video-ico' }, '▶'));
      append(col, phWrap);
    }
    const list = el('div', { class: 'cal-list' });
    for (const e of evs) append(list, calItemEl(e));
    append(col, list);
    col.addEventListener('click', () => { calView = 'day'; calCursor = d; renderCalendar(); });
    append(wk, col);
  }
  append(c, wk);
}
function renderCalDay(c: HTMLElement) {
  const d = startOfDay(calCursor);
  const evs = calEvents().filter((e: any) => occursOn(e, d)).sort(sortByTime);
  const card = el('div', { class: 'card' });
  const head = el('div', { class: 'card-h' });
  append(head, el('span', {}, fmtDayFull(d) + (iso(d) === iso(new Date()) ? ' · сегодня' : '')));
  const addEv = el('button', { class: 'cal-add-ev', title: 'Добавить событие' }, '+ Событие');
  addEv.addEventListener('click', () => { calEditModal(null); });
  append(head, addEv);
  append(card, head);
  // Мини-галерея фото дня — сразу под заголовком; клик — полноэкранный просмотр.
  // Порядок — хронологический (время съёмки), листание ◀▶ идёт только по фото дня.
  const dayPhotos = (dayPhotosMap().get(iso(d)) || []).slice()
    .sort((a, b) => {
      const ta = a && a.exif && typeof a.exif.taken === 'string' ? a.exif.taken : '';
      const tb = b && b.exif && typeof b.exif.taken === 'string' ? b.exif.taken : '';
      if (ta < tb) return -1; if (ta > tb) return 1; return 0;
    });
  if (dayPhotos.length) {
    const gal = el('div', { class: 'cal-dgal' });
    for (const p of dayPhotos) {
      const taken = p && p.exif && typeof p.exif.taken === 'string' ? p.exif.taken : '';
      const tm = taken.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);
      const tip = (tm ? '🕐 ' + tm[4] + ':' + tm[5] : '') + (p.duration ? ' · ⏱ ' + fmtDur(p.duration) : '') + (p.desc ? ' — ' + p.desc : '') || 'Фото';
      const t = el('div', { class: 'cal-dgal-item' + (p.type === 'video' ? ' vid' : ''), 'data-tip': tip });
      if (p.type === 'video') {
        const v = el('video', { class: 'cal-dgal-video', src: phUrl(p.id), poster: phUrl(p.id, true), muted: true, playsinline: '', preload: 'metadata' }) as HTMLVideoElement;
        v.addEventListener('mouseenter', () => { v.play().catch(() => { /* ок */ }); });
        v.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0; });
        append(t, v);
        append(t, el('span', { class: 'cal-video-ico' }, '▶'));
      } else {
        append(t, el('img', { src: phUrl(p.id, true), alt: p.desc || '', loading: 'lazy', decoding: 'async' }));
      }
      t.addEventListener('click', () => photoFullscreen(p, dayPhotos));
      append(gal, t);
    }
    append(card, gal);
  }
  if (!evs.length) {
    append(card, el('div', { class: 'empty', style: 'padding:12px' }, 'На этот день событий нет. Напишите в чат — запишу.'));
  }
  for (const e of evs) append(card, calItemEl(e));
  append(c, card);
}
