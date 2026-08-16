// calendar.ts — календарь (месяц/неделя/день), плашки-напоминания, повторяющиеся события.
// Вынесен из diary-ui.ts: блок самодостаточен и не зависит от вкладок/галереи/чата.
import { el, append, clear, $, S, saveState, modal, phUrl, todayRef, photoFullscreen, fmtDur, iso, DAY_MS, fmtDay, WD } from './diary-ui.js';

const WD_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
let calView: 'month' | 'week' | 'day' = 'month';
// Инициализация без импортированных хелперов: модуль может загрузиться раньше diary-ui (циклический импорт)
let calCursor: Date = (() => { const x = new Date(); x.setHours(0, 0, 0, 0); return x; })();

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function parseISO(s: string): Date | null {
  const m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
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
export function renderBanners(c: Element) {
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
export function renderCalendar() {
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

function renderCalMonth(c: Element) {
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
function renderCalWeek(c: Element) {
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
function renderCalDay(c: Element) {
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
