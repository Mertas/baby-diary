// tabs.ts — рендер вкладок дневника (режим/главная/навыки/советы/рецепты/скачки/гардероб/сад/
// покупки/запасы/семья/бюджет/помощник/динамические), быстрые записи (кормление/сон/пробуждение/событие/замер).
// Вынесен из diary-ui.ts; общается с ядром через импорты (круговой импорт безопасен — на top-level
// импортированные значения не используются).
import { el, append, clear, $, $$, S, saveState, modal, todayRef, ageStr, ageMonths, fmtTime, dayKey, dayTitle, iso, fmtDay, WD, DAY_MS, durStr, timeField, tsFromTime, askChat } from './diary-ui.js';
import { renderBanners } from './calendar.js';
import { weatherCard } from './gallery.js';

// Переехавшие из diary-ui: период дашборда + мелкие хелперы
let dashPeriod = 0; // 0 = сегодня, 3 = за 3 дня, 7 = за 7 дней

function emptySection(text: string, prompt: string) {
  const box = el('div', { class: 'empty' }, text);
  const btn = el('button', {}, 'Спросить в чате');
  btn.addEventListener('click', () => { askChat(prompt); });
  append(box, btn);
  return box;
}

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

export function renderSkills() {
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

export function renderLlmn() {
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

export function renderStock() {
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
    let f: { ni: HTMLInputElement; qi: HTMLInputElement; no: HTMLInputElement } | null = null;
    modal('Добавить запас', (b) => {
      const mk = (ph: string) => { const i = el('input', { class: 'modal-inp', placeholder: ph }); append(b, i); return i; };
      f = { ni: mk('Что (подгузники, смесь…)') as HTMLInputElement, qi: mk('Сколько осталось (2 пачки, 500 мл…)') as HTMLInputElement, no: mk('На сколько хватит / примечание') as HTMLInputElement };
    }, () => {
      const { ni, qi, no } = f!;
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

export function renderFamily() {
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
    let f: { ni: HTMLInputElement; ri: HTMLInputElement; no: HTMLInputElement } | null = null;
    modal('Добавить члена семьи', (b) => {
      const inp = (ph: string) => { const i = el('input', { class: 'modal-inp', placeholder: ph }); append(b, i); return i; };
      f = { ni: inp('Имя') as HTMLInputElement, ri: inp('Кто (мама, папа, бабушка…)') as HTMLInputElement, no: inp('Примечание (день рождения, особенности)') as HTMLInputElement };
    }, () => {
      const { ni, ri, no } = f!;
      const fam2 = [...(S.family || [])];
      fam2.push({ name: ni.value.trim() || '—', role: ri.value.trim() || '', note: no.value.trim() || undefined });
      saveState({ family: fam2 });
    });
  });
  append(card, bd, add);
  append(c, card);
}

export function renderBudget() {
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
    let f: { sel: HTMLSelectElement; ci: HTMLInputElement; ai: HTMLInputElement; ni: HTMLInputElement } | null = null;
    modal('Добавить запись', (b) => {
      const mk = (ph: string, def?: string) => { const i = el('input', { class: 'modal-inp', placeholder: ph, value: def || '' }); append(b, i); return i; };
      const sel = el('select', { class: 'modal-inp' });
      append(sel, el('option', { value: 'expense' }, 'Расход'), el('option', { value: 'income' }, 'Доход'));
      append(b, sel);
      f = { sel: sel as HTMLSelectElement, ci: mk('Категория (продукты, подгузники…)') as HTMLInputElement, ai: mk('Сумма, ₽') as HTMLInputElement, ni: mk('Примечание') as HTMLInputElement };
    }, () => {
      const { sel, ci, ai, ni } = f!;
      const bud2 = [...(S.budget || [])];
      bud2.push({ id: 'b' + Math.random().toString(36).slice(2, 8), type: (sel.value === 'income' ? 'income' : 'expense'), category: ci.value.trim() || 'другое', amount: Number(ai.value) || 0, note: ni.value.trim() || undefined, date: new Date().toISOString().slice(0, 10) });
      saveState({ budget: bud2 });
    });
  });
  append(card, bd, add);
  append(c, card);
}

export function renderDynTabs() {
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

export function renderShopping() {
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

const MODE_LABELS: Record<string, string> = {
  feeding: 'Питание', likes: 'Любит', skills: 'Навыки', sleepPattern: 'Режим сна', sleep: 'Сон',
  character: 'Характер', behavior: 'Поведение', temperament: 'Темперамент', routine: 'Режим дня', habits: 'Привычки',
};
export function renderMode() {
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
export function renderDash() {
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
    openSk.addEventListener('click', () => { const t = [...document.querySelectorAll('.tab')].find(b => b.textContent === 'Навыки'); if (t) (t as HTMLElement).click(); });
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
export function renderTips() {
  const c = $('#c-tips'); if (!c) return; clear(c);
  const tips = S.tips || [];
  if (!tips.length) { append(c, emptySection('Раздел советов пока пуст.', 'Подскажи полезные советы с учётом возраста и привычек ребёнка.')); return; }

  const cats: string[] = Array.from(new Set(tips.map((t: any) => String(t.category || 'Общее'))));
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

export function renderRecipes() {
  const c = $('#c-recipes'); if (!c) return; clear(c);
  const recipes = S.recipes || [];
  if (!recipes.length) { append(c, emptySection('Рецептов пока нет.', 'Добавь простые рецепты с учётом любимых продуктов ребёнка.')); return; }

  // Collect all tags + categories for nav
  const tags: string[] = Array.from(new Set(recipes.flatMap((r: any) => r.tags || [])));
  const cats: string[] = Array.from(new Set(recipes.map((r: any) => r.category || 'Без категории')));

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

export function renderSpurts() {
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

export function renderClothes() {
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

export function renderSad() {
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

export function setupTabs() {
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

export function setupActions() {
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
  }, () => {
    const ts = Math.floor(tsFromTime(tf.value) / 60000) * 60000; // как на сервере
    quickSave('Кормление записано', { feeds: [{ type: ty, amount: am, timestamp: ts }] },
      { feeds: [{ type: ty, amount: am, timestamp: ts, _delete: true }] });
  });
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
  }, () => {
    const ts = Math.floor(tsFromTime(tf.value) / 60000) * 60000;
    quickSave('Сон записан', { sleeps: [{ type: t, timestamp: ts }] },
      { sleeps: [{ type: t, timestamp: ts, _delete: true }] });
  });
}
function showWake() {
  // Закрываем последний незакрытый сон (длительность = до пробуждения)
  const sleeps = (S.sleeps || []).slice();
  const last = [...sleeps].reverse().find((s: any) => !s.end);
  if (last) last.end = Date.now();
  const now = Date.now();
  quickSave('Пробуждение записано', { sleeps, events: [{ title: 'Пробуждение', timestamp: now }] },
    { events: [{ title: 'Пробуждение', timestamp: Math.floor(now / 60000) * 60000, _delete: true }] });
}
function showEvent() { let ti = '', nt = ''; const tf = timeField(); modal('Событие', (b) => { const t = el('input', { class: 'modal-inp', placeholder: 'Название' }); t.addEventListener('input', () => { ti = (t as HTMLInputElement).value; }); const n = el('input', { class: 'modal-inp', placeholder: 'Заметки' }); n.addEventListener('input', () => { nt = (n as HTMLInputElement).value; }); append(b, tf, t, n); }, () => { const ts = Math.floor(tsFromTime(tf.value) / 60000) * 60000; quickSave('Событие записано', { events: [{ title: ti || 'Событие', note: nt, timestamp: ts }] }, { events: [{ title: ti || 'Событие', note: nt, timestamp: ts, _delete: true }] }); }); }
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
    const ts = Math.floor(tsFromTime(tf.value) / 60000) * 60000;
    const upd: any = { events: [{ title: 'Замер', note, timestamp: ts }] };
    if (w) upd.weight = Math.round(parseFloat(w));
    if (h) upd.height = Math.round(parseFloat(h) * 10) / 10;
    quickSave('Замер записан', upd, { events: [{ title: 'Замер', note, timestamp: ts, _delete: true }] });
  });
}

// ─── Toast «Записано ✓ [Отменить]»: быстрая запись не должна быть необратимой ───
let undoToastT: ReturnType<typeof setTimeout> | null = null;
function quickSave(label: string, partial: any, deletePartial: any): void {
  saveState(partial).then(() => showUndoToast(label, deletePartial)).catch(() => {});
}
function showUndoToast(label: string, deletePartial: any): void {
  document.querySelectorAll('.undo-toast').forEach((x) => x.remove());
  const t = el('div', { class: 'undo-toast', style: 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:9999;background:#211d18;color:#fff;border-radius:8px;padding:10px 14px;font:12px/1.4 system-ui,sans-serif;display:flex;align-items:center;gap:10px;box-shadow:0 4px 16px rgba(0,0,0,.25);max-width:92vw' });
  append(t, el('span', {}, '✓ ' + label));
  const undoBtn = el('button', { style: 'background:#e8622a;border:none;border-radius:5px;color:#fff;padding:5px 12px;cursor:pointer;font:600 11px/1 system-ui,sans-serif' }, 'Отменить');
  undoBtn.addEventListener('click', () => {
    saveState(deletePartial).catch(() => {});
    t.remove();
  });
  append(t, undoBtn);
  append(document.body, t);
  if (undoToastT) clearTimeout(undoToastT);
  undoToastT = setTimeout(() => t.remove(), 6000);
}
