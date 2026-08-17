// diary-ui.ts — Baby Diary, Hermès-style
export {}; // внешний модуль (для typecheck: изолированный скоуп, общение через window.PromptUI)
import { el, $, $$, on, append, clear, CHAT_ID, CID, SEC, S, setS, phUrl, todayRef, modal } from './core.js';
// Реэкспорт общих имён для модулей, которые ещё импортируют их из diary-ui
export { el, $, $$, on, append, clear, CHAT_ID, CID, SEC, S, setS, phUrl, todayRef, modal } from './core.js';
import { renderCalendar } from './calendar.js';
import { renderPhotos, setupAvatar, renderMediaPanel, setMediaQueue, mediaQueueItems, mediaQueueListener } from './gallery.js';
import { renderMode, renderDash, renderSkills, renderTips, renderRecipes, renderSpurts, renderClothes, renderSad, renderShopping, renderStock, renderLlmn, renderFamily, renderBudget, renderDynTabs, setupTabs, setupActions } from './tabs.js';

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
.exp-btn { margin-left: 8px; background: none; border: 1px solid var(--border); border-radius: 3px; color: var(--text-soft); cursor: pointer; font-size: 11px; padding: 1px 6px; vertical-align: 1px; transition: all .2s; }
.exp-btn:hover { color: var(--accent); border-color: var(--accent); }
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
.model-row { display: flex; align-items: center; gap: 12px; padding: 6px 16px 0; position: relative; }
.model-sel { position: relative; }
.ms-btn { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); cursor: pointer; font-size: 11px; font-family: var(--sans); color: var(--text); transition: border-color .2s, color .2s; }
.ms-btn:hover { border-color: var(--accent); color: var(--accent); }
.ms-btn .free-badge { background: #e7f4e9; color: #2e7d32; font-size: 8px; padding: 1px 5px; border-radius: 8px; letter-spacing: .06em; text-transform: uppercase; font-weight: 700; }
.ms-btn .caret { font-size: 8px; color: var(--text-soft); }
.ms-panel { position: absolute; top: calc(100% + 8px); left: 0; min-width: 270px; max-width: 330px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 14px 36px rgba(0,0,0,.16); padding: 6px; z-index: 60; display: none; max-height: 320px; overflow-y: auto; }
.ms-panel.open { display: block; }
.ms-panel.up { top: auto; bottom: calc(100% + 8px); } /* авто-переворот, если внизу нет места */
.ms-group { font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-soft); padding: 8px 10px 4px; }
.ms-item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 8px 10px; border: none; background: none; border-radius: 8px; cursor: pointer; font-size: 12px; color: var(--text); font-family: var(--sans); }
.ms-item:hover { background: var(--accent-soft); color: var(--accent-dark); }
.ms-item.sel { color: var(--accent); font-weight: 600; }
.ms-item .ms-free { font-size: 9px; color: #2e7d32; background: #e7f4e9; border-radius: 8px; padding: 1px 6px; margin-left: auto; }
.ms-item .ms-check { margin-left: auto; font-size: 12px; visibility: hidden; }
.ms-item.sel .ms-check { visibility: visible; }
.model-row .undo { margin-left: auto; padding: 0; border: none; background: none; cursor: pointer; font-size: 13px; font-family: var(--sans); color: var(--text-soft); }
.model-row .undo:hover, .model-row .collapse:hover { color: var(--accent); }
.model-row .collapse { padding: 0; border: none; background: none; cursor: pointer; font-size: 12px; font-family: var(--sans); color: var(--text-soft); }
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
    <div class="mark">Baby Diary <button id="inv" class="exp-btn" title="Пригласить члена семьи (папу/бабушку)">🔗</button><button id="exp" class="exp-btn" title="Скачать архив дневника (state.json + фото)">⬇</button></div>
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
    <div class="model-row">
      <div class="model-sel" id="msel"><button id="ms-btn" class="ms-btn" title="Выбрать модель">…</button><div class="ms-panel" id="ms-panel"></div></div>
      <button id="cc" class="collapse" title="Свернуть чат">▾</button>
      <button id="cud" class="undo" title="Отменить последний ответ">↶</button>
    </div>
    <div class="chat-msgs" id="cm"></div>
    <div class="chat-bar"><textarea id="ci" placeholder="Написать..." rows="1"></textarea><button class="send" id="csd">▶</button></div>
  </div>
</div>
`);
window.PromptUI.ui.activateScripts(document.body);

// ===== State =====
/** URL медиа — без креденшелов в query: HttpOnly-кука bd ставится сервером при первом
 *  аутентифицированном запросе (loadState), <img>/<video> ходят по ней. */
export function ageStr(bd?: string): string {
  if (!bd) return '';
  const d = Math.floor((todayRef() - new Date(bd).getTime()) / 86400000);
  if (d < 0) return '';
  if (d < 30) return d + ' дн.';
  const m = Math.floor(d / 30);
  if (m < 12) return m + ' мес.';
  const y = Math.floor(m / 12), mo = m % 12;
  return mo ? y + ' г. ' + mo + ' мес.' : y + ' г.';
}
export function ageMonths(bd?: string): number {
  if (!bd) return 0;
  return Math.max(0, Math.floor((todayRef() - new Date(bd).getTime()) / 2592000000));
}
export function fmtTime(ts?: number): string {
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
export function dayKey(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
export const DAY_MS = 86400000;
export function iso(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function fmtDay(d: Date): string { return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0'); }
export const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export function dayTitle(key: string): string {
  const now = new Date(todayRef());
  if (key === dayKey(now.getTime())) return 'Сегодня';
  const y = new Date(now.getTime()); y.setDate(y.getDate() - 1);
  if (key === dayKey(y.getTime())) return 'Вчера';
  const d = new Date(key + 'T00:00:00');
  const wd = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'][d.getDay()];
  return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + ', ' + wd;
}
export function durStr(ms: number): string {
  if (ms < 60000) return 'менее 1 мин';
  const m = Math.round(ms / 60000);
  if (m < 60) return m + ' мин';
  return Math.floor(m / 60) + ' ч ' + (m % 60) + ' мин';
}
export function timeField(): HTMLInputElement {
  const now = new Date();
  const pad = (n: number) => ('0' + n).slice(-2);
  const inp = el('input', { type: 'datetime-local', class: 'modal-inp', value: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes()) }) as HTMLInputElement;
  return inp;
}
export function tsFromTime(t?: string, allowFuture = false): number {
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
export function askChat(prompt: string) {
  // Fill input and send directly
  const inp = $('#ci') as HTMLTextAreaElement;
  const sb = $('#csd') as HTMLButtonElement;
  if (inp && sb) {
    inp.value = prompt;
    sb.click();
  }
}

const STATE_CACHE_KEY = () => 'bd_state_' + CHAT_ID;
function cacheState(): void {
  try { localStorage.setItem(STATE_CACHE_KEY(), JSON.stringify(S)); } catch { /* кэш не критичен */ }
}

export function loadState(): Promise<void> {
  return fetch('/api/chat/' + CHAT_ID + '/state?clientId=' + encodeURIComponent(CID) + '&clientSecret=' + encodeURIComponent(SEC))
    .then(r => r.json())
    .then(st => { setS(st || {}); cacheState(); renderAll(); })
    .catch(() => {
      // Офлайн/сервер недоступен: показываем последний известный срез (офлайн-чтение)
      try {
        const cached = localStorage.getItem(STATE_CACHE_KEY());
        if (cached) { setS(JSON.parse(cached) || {}); renderAll(); }
      } catch { /* нет кэша */ }
    });
}
export function saveState(partial: any): Promise<any> {
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
  }).then(st => { setS(st || {}); cacheState(); renderAll(); return st; }).catch(() => {});
}

let lastTabsKey = '';
function renderAll() {
  // Сохранить скролл активной вкладки — render пересоздаёт DOM, иначе «прыжок наверх» на каждый чих
  const activeEl = $('.content.active');
  const savedScroll = activeEl ? activeEl.scrollTop : 0;
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
  if (activeEl) activeEl.scrollTop = savedScroll;
}

// Reusable todo list with checkboxes. todos: [{text, done, section}]
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

  // Селект модели — выпадающий список как в современных чатах (группы, бейдж FREE, галочка)
  let mdl = localStorage.getItem('bd_model') || '';
  const msBtn = $('#ms-btn'), msPanel = $('#ms-panel');
  let modelList: { id: string; label: string; group: string; free?: boolean }[] = [];
  const closeMsPanel = () => { if (msPanel) msPanel.classList.remove('open'); };
  function renderModelSelect() {
    if (!msBtn || !msPanel || !modelList.length) return;
    const cur = modelList.find((m) => m.id === mdl) || modelList[0];
    if (cur) {
      msBtn.innerHTML = (cur.free ? '<span class="free-badge">FREE</span>' : '') + '<span>' + cur.label + '</span><span class="caret">▾</span>';
    }
    msPanel.innerHTML = '';
    let lastGroup = '';
    for (const m of modelList) {
      if (m.group !== lastGroup) {
        lastGroup = m.group;
        append(msPanel, el('div', { class: 'ms-group' }, m.group));
      }
      const item = el('button', { class: 'ms-item' + (m.id === mdl ? ' sel' : '') },
        el('span', {}, m.label),
        m.free ? el('span', { class: 'ms-free' }, 'FREE') : null,
        el('span', { class: 'ms-check' }, '✓'));
      item.addEventListener('click', () => {
        mdl = m.id;
        localStorage.setItem('bd_model', m.id);
        renderModelSelect();
        closeMsPanel();
      });
      append(msPanel, item);
    }
  }
  if (msBtn) msBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!msPanel) return;
    msPanel.classList.toggle('open');
    if (msPanel.classList.contains('open')) {
      // Переворот: если панель не помещается вниз (чат прижат к низу на мобильных) — открыть вверх
      const r = msPanel.getBoundingClientRect();
      msPanel.classList.toggle('up', r.bottom > window.innerHeight);
    }
  });
  document.addEventListener('click', closeMsPanel);
  fetch('/api/models')
    .then((r) => r.json())
    .then((d) => {
      modelList = Array.isArray(d.models) ? d.models : [];
      if (!modelList.length) return;
      if (!mdl || !modelList.some((m) => m.id === mdl)) mdl = String(d.default || modelList[0].id);
      renderModelSelect();
    })
    .catch(() => { /* моделей нет — селект остаётся «…» */ });
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
loadState().then(() => checkNotifications());
// Приглашение члена семьи: одноразовая ссылка, по которой второй человек получит доступ к дневнику
const invBtn = $('#inv');
if (invBtn) invBtn.addEventListener('click', () => {
  fetch('/api/chat/' + CHAT_ID + '/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: CID, clientSecret: SEC }),
  })
    .then((r) => r.json())
    .then((d) => {
      if (!d || !d.url) throw new Error('no url');
      const url = location.origin + d.url;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => alert('Ссылка-приглашение скопирована:\n' + url + '\nОткройте её на другом устройстве — второй человек получит свой доступ к дневнику.')).catch(() => prompt('Скопируйте ссылку-приглашение:', url));
      } else {
        prompt('Скопируйте ссылку-приглашение (откройте на другом устройстве):', url);
      }
    })
    .catch((e) => { console.error('invite failed:', e); alert('Не удалось создать приглашение'); });
});
// Скачать архив дневника (state.json + фото/видео одним zip)
const expBtn = $('#exp');
if (expBtn) expBtn.addEventListener('click', () => {
  fetch('/api/chat/' + CHAT_ID + '/export')
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'babydiary-' + CHAT_ID.slice(0, 8) + '.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    })
    .catch((e) => { console.error('export failed:', e); alert('Не удалось скачать архив'); });
});
// Восстановить панель обработки после перезагрузки страницы (очередь живёт на сервере)
fetch('/api/chat/' + CHAT_ID + '/media-queue?clientId=' + CID + '&clientSecret=' + SEC)
  .then((r) => r.json())
  .then((d) => { if (d && Array.isArray(d.items)) { setMediaQueue(d.items); renderMediaPanel(); } })
  .catch(() => { /* ок */ });
window.__runtime_subscribe('/chat/state', (raw: string) => {
  try { const d = JSON.parse(raw); if (d.type === 'state' && d.state) { setS(d.state); renderAll(); checkNotifications(); } } catch { /* ignore */ }
});

// ─── Локальные уведомления: reminders/calendar → Notification API (пока приложение открыто) ───
const NOTIF_KEY = 'bd_notified';
const notifShown: Set<string> = new Set(JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'));
function checkNotifications(): void {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') { Notification.requestPermission().catch(() => {}); return; }
  if (Notification.permission !== 'granted') return;
  const now = new Date();
  const dayKey = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = dayKey(now), tomorrow = dayKey(new Date(now.getTime() + 86400000));
  const items: { title: string; body: string }[] = [];
  // Календарь: важные события сегодня/завтра (с учётом повторения — occursOn есть в calendar.ts, но здесь проще по датам)
  for (const ev of (S.calendar || [])) {
    if (!ev || ev.done) continue;
    const d = ev.date ? String(ev.date).slice(0, 10) : '';
    const match = d === today || d === tomorrow;
    if (!match && ev.recurring) {
      const dd = new Date(d + 'T00:00:00');
      if (!isNaN(dd.getTime())) {
        const diff = Math.round((new Date(today + 'T00:00:00').getTime() - dd.getTime()) / 86400000);
        const hits = (ev.recurring === 'daily' && diff >= 0) ||
          (ev.recurring === 'weekly' && diff >= 0 && diff % 7 === 0) ||
          (ev.recurring === 'monthly' && dd.getDate() === now.getDate()) ||
          (ev.recurring === 'yearly' && dd.getMonth() === now.getMonth() && dd.getDate() === now.getDate());
        if (hits && !(ev.until && d && String(ev.until) < today)) items.push({ title: '📅 ' + ev.title, body: (ev.time ? 'Сегодня в ' + ev.time : 'Сегодня') + (ev.note ? ' · ' + ev.note : '') });
      }
    } else if (match) {
      items.push({ title: (d === today ? 'Сегодня: ' : 'Завтра: ') + ev.title, body: (ev.time ? 'В ' + ev.time : '') + (ev.note ? ' · ' + ev.note : '') });
    }
  }
  // Напоминания LLM: дата сегодня/завтра
  for (const r of (S.reminders || [])) {
    if (!r || r.done) continue;
    const d = r.date ? String(r.date).slice(0, 10) : '';
    if (d === today || d === tomorrow) items.push({ title: (d === today ? 'Сегодня: ' : 'Завтра: ') + (r.text || 'Напоминание'), body: '' });
  }
  let shown = 0;
  for (const it of items) {
    if (shown >= 3) break;
    const key = it.title + '|' + it.body;
    if (notifShown.has(key)) continue;
    notifShown.add(key);
    shown++;
    try {
      const n = new Notification(it.title, { body: it.body, tag: 'bd-' + key.slice(0, 40) });
      n.onclick = () => { window.focus(); n.close(); };
    } catch { /* ок */ }
  }
  if (shown > 0) {
    // Держим только последние ~50 ключей
    const arr = [...notifShown].slice(-50);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(arr));
  }
}
window.__runtime_subscribe('/media-queue', (raw: string) => {
  try {
    const d = JSON.parse(raw);
    if (d.type === 'queue' && Array.isArray(d.items)) {
      const wasPending = mediaQueueItems.some((i) => i.status !== 'done' && i.status !== 'error');
      setMediaQueue(d.items);
      const pending = mediaQueueItems.some((i) => i.status !== 'done' && i.status !== 'error');
      if (mediaQueueListener) mediaQueueListener(d.items);
      renderMediaPanel();
      // Вся обработка завершилась — показать новые записи, панель убрать через пару секунд
      if (wasPending && !pending) {
        loadState();
        setTimeout(() => { setMediaQueue([]); renderMediaPanel(); }, 2500);
      }
    }
  } catch { /* ignore */ }
});
