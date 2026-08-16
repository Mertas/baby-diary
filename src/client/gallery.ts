// gallery.ts — галерея фото/видео: EXIF, ресайз, загрузка с очередью обработки,
// полноэкранный просмотр, аватарка, виджет погоды. Вынесен из diary-ui.ts.
import { el, append, clear, $, S, saveState, loadState, modal, phUrl, CHAT_ID, CID, SEC } from './diary-ui.js';

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
          const readIfd = (base: number): Map<number, [number, number] | number> => {
            // p уже указывает на начало TIFF (после 'Exif\0\0') — офсеты IFD относительны p
            const tiff = p;
            const tags = new Map<number, [number, number] | number>();
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
            const dataOff = (ifd0Tags.get(-(tag + 100000)) ?? 0) as number;
            return (size * count > 4 || type === 5 || type === 10) ? (p + dv.getUint32(dataOff, little)) : dataOff;
          };
          // Ориентация
          if (ifd0Tags.has(0x0112)) {
            const [t, c] = ifd0Tags.get(0x0112) as [number, number];
            info.orientation = dv.getUint16(valPtr(0x0112, t, c), little) || 1;
          }
          // ExifIFD → дата съёмки
          if (ifd0Tags.has(0x8769)) {
            const [t, c] = ifd0Tags.get(0x8769) as [number, number];
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
            const [t, c] = ifd0Tags.get(0x9003) as [number, number];
            info.taken = ascii(valPtr(0x9003, t, c), Math.min(c, 19));
          }
          // GPSInfo IFD → координаты
          if (ifd0Tags.has(0x8825)) {
            const [t, c] = ifd0Tags.get(0x8825) as [number, number];
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
      } catch (e) { reject(new Error('bad response ' + xhr.status)); }
    };
    xhr.onerror = () => reject(new Error('network error'));
    xhr.send(body);
  });
}

/** Загрузка медиа: только фаза UPLOAD (ответ сервера мгновенный — файл встал в очередь).
 *  Прогресс обработки (конвертация) приходит по WS '/media-queue'. */
function uploadMedia(file: File, kind: 'photo' | 'video', desc: string, pre?: { dataUrl: string; exif: { taken: string | null; gps: { lat: number; lon: number } | null } }, onProgress?: (pct: number) => void): Promise<any> {
  const url = '/api/chat/' + CHAT_ID + '/media?clientId=' + encodeURIComponent(CID) + '&clientSecret=' + encodeURIComponent(SEC);
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
export function fmtTaken(s: string): string {
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);
  if (!m) return s;
  return m[3] + '.' + m[2] + '.' + m[1] + ' ' + m[4] + ':' + m[5];
}

/** Секунды → 'М:СС' (длительность видео) */
export function fmtDur(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/** Полноэкранный просмотр фото: зум колесом/пинчем, драг мышью/пальцем, двойной клик — 2.5x.
 *  Оверлей поверх приложения — остальной UI остаётся под ним. */
export function photoFullscreen(p: any, nav?: any[]) {
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

export function renderPhotos() {
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

export function setupAvatar() {
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
export function weatherCard(): HTMLElement | null {
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

// ─── Очередь обработки медиа (конвертация идёт на сервере; UI переживает перезагрузку) ───
export let mediaQueueItems: any[] = [];
export let mediaQueueListener: ((items: any[]) => void) | null = null;

/** Заменить очередь (main получает её по WS/при старте; импортированный let переприсваивать нельзя). */
export function setMediaQueue(items: any[]): void {
  mediaQueueItems = items;
}

/** Панель «⏳ Обработка N/M» в галерее (общий бар + список файлов со статусами). */
export function renderMediaPanel() {
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
