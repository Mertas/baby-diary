// core.ts — общие данные и DOM-хелперы клиента. Импортируется и diary-ui, и tabs/calendar/gallery,
// чтобы эти модули не тянули их из diary-ui (уменьшение круговых связей).
// Здесь НЕТ зависимостей от render-модулей — только окно, localStorage и чистые функции.
import type { BabyState } from '../shared/types.js';

export const CHAT_ID = window.__CHAT_ID__;
export const CID = localStorage.getItem('pui2_clientId_' + CHAT_ID) || '';
export const SEC = localStorage.getItem('pui2_secret_' + CHAT_ID) || '';
export let S: BabyState = {};
/** Присваивание S (ESM-импорт только для чтения; state обновляется здесь). */
export function setS(state: BabyState): void { S = state; }

export const { el, $, $$, on, append, clear } = window.PromptUI;

/** URL медиа — без креденшелов в query: HttpOnly-кука bd ставится сервером при первом
 *  аутентифицированном запросе (loadState), <img>/<video> ходят по ней. */
export function phUrl(id: string, thumb = false): string {
  return '/api/photo/' + CHAT_ID + '/' + id + (thumb ? '?th=1' : '');
}

/** «Сегодня» = день мамы (последняя дата из её сообщений), иначе реальная дата */
export function todayRef(): number {
  if (S.lastMomDay) { const d = new Date(S.lastMomDay + 'T00:00:00'); if (!isNaN(d.getTime())) return d.getTime(); }
  return Date.now();
}

/** Универсальная модалка: контейнер, actions (Отмена/Сохранить), Esc/Enter. */
export function modal(title: string, bodyFn: (b: HTMLElement) => void, onSave: () => void, noSave?: boolean) {
  const ov = el('div', { class: 'modal-overlay' }), md = el('div', { class: 'modal' }), bd = el('div', {});
  const ac = el('div', { class: 'modal-actions' }, el('button', { class: 'cancel' }, 'Отмена'), el('button', { class: 'save' }, 'Сохранить'));
  append(md, el('h3', {}, title), bd, ac); append(ov, md); append(document.body, ov);
  bodyFn(bd);
  if (noSave) (ac.querySelector('.save') as HTMLElement | null)!.style.display = 'none';
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
