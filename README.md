# Baby Diary

Однопользовательский «дневник малыша» с LLM-помощником: чат (DeepSeek) + постоянное состояние дневника (профиль, кормления, сны, навыки, календарь, бюджет, фото/видео, погода). Всё хранится локально.

## Запуск

```bash
npm install          # пересоберёт нативные модули (better-sqlite3) под ваш Node
cp .env.example .env # или создайте .env: DEEPSEEK_API_KEY=<ключ DeepSeek>
npm run dev          # сборка клиента + tsx watch сервера
# или npm start
```

Откройте http://localhost:1911 (порт — `PORT` в `.env`, по умолчанию 1911).

Требования: Node 20.x, [ffmpeg](https://ffmpeg.org) в PATH (конвертация MOV→MP4 и превью; фото работают и без него).

> ⚠️ **Версия Node зафиксирована на 20.x** (см. `.nvmrc`, `engines` в `package.json`). `better-sqlite3` — нативный модуль, собранный под конкретный ABI (Node 20 → `NODE_MODULE_VERSION 115`). Если в системе несколько Node (nvm) и при установке/запуске используются разные — будет ошибка `NODE_MODULE_VERSION`. Перед `dev`/`start` запускается `scripts/check-node.cjs`, который прерывает запуск с подсказкой. При смене версии Node:
> ```bash
> nvm use 20.19.5
> npm rebuild better-sqlite3
> # или скачать предсобранный бинарник без компилятора:
> node node_modules/prebuild-install/bin.js --directory node_modules/better-sqlite3
> ```
> Для перехода на другую мажорную версию Node обновите `.nvmrc` и `engines.node`, затем пересоберите модуль.

## Как это устроено

- **LLM управляет данными**: вся бизнес-логика дневника описана в [`baby-diary-prompt.md`](baby-diary-prompt.md) (57 КБ системного промпта). Модель возвращает JSON `{"text": ..., "state": {...}, "choices": [...]}` (включён JSON mode, температура 0.3).
- **Сервер нормализует** (`src/server/state.ts`): парсит «время мамы» («вчера 22:00», «20.07 07:30»), чинит схема-дрейф модели, дедуплицирует, мержит массивы, обрабатывает удаления через маркер `_delete:true`; в контекст LLM уходит **проекция** state (события за 14 дней + агрегаты) — рост токенов ограничен.
- **Клиент** — SPA без фреймворков из модулей: `diary-ui` (шаблон, чат, bootstrap), `tabs` (вкладки, быстрые записи), `calendar`, `gallery`, `core` (общие данные/хелперы). Рендер state во вкладки, чат с кнопками-вариантами, галерея с очередью обработки медиа, календарь с фото-подложкой, погода.

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | сборка клиента + сервер с hot-reload (tsx watch) |
| `npm start` | сборка клиента + сервер |
| `npm run build:client` | esbuild клиента в `dist/client/` |
| `npm run typecheck` | tsc сервера |
| `npm run typecheck:client` | tsc клиента (`tsconfig.client.json`) |
| `npm test` | node:test: unit (парсеры state/llm) + интеграционные HTTP на `:memory:` |
| `npm run lint` / `npm run lint:fix` | ESLint (src, test) |
| `npm run format` | Prettier |

## API (кратко)

Все `/api` и WebSocket защищены креденшелами чата (`clientId`/`clientSecret` из тела, query, заголовков `X-Client-Id`/`X-Client-Secret` **или HttpOnly-куки `bd`**, которую сервер ставит при первой аутентификации — медиа/WS ходят по ней, секреты не торчат в URL). Открыты только список/создание чатов и HTML-страница.

- `POST /api/chats` — создать дневник (можно сразу с `title` — именем малыша) → `{id, clientId, clientSecret}`
- `GET/POST /api/chat/:id/state` — читать/слить состояние дневника
- `POST /chat/:id/prompt` — сообщение (стриминг WS `/chat/stream`); `stop`, `undo` (откат ответа **вместе с изменениями state**), `snapshot` (копия дневника с state и фото)
- `POST /api/chat/:id/media` — бинарная загрузка фото/видео (очередь обработки, прогресс WS `/media-queue`); `GET /api/photo/:chatId/:id[?th=1]` — стрим с Range (перемотка видео)
- `GET /api/chat/:id/export` — zip-архив дневника (state.json без GPS + все фото/видео); в шапке — кнопка ⬇
- `POST /api/chat/:id/invite` → `GET /api/join/:token` — одноразовое приглашение для члена семьи (🔗 в шапке)
- `GET /api/weather?city=...` — погода Open-Meteo (без ключа, кэш 30 мин)
- `PATCH /api/chats/:id` — переименование дневника (✎ в списке)

## Данные

- SQLite: `data/babydiary.db` (схема — `src/db/schema.ts`; версионирование — `PRAGMA user_version`, миграции — `src/db/index.ts`; `VACUUM` при старте)
- Фото/видео: `data/photos/<chatId>/<id>.jpg|.mp4` + превью `<id>.th.jpg`; GPS-координаты из EXIF **не сохраняются** (приватность)
- Авто-бэкап: раз в сутки копия БД+фото в `data/backups/<дата>/` (хранятся 7 дней)
- `llm_logs` ротируются ежечасно (14 дней); метрики токенов/стоимости — см. `scripts/audit-db.mjs`

## Известные особенности

- Приложение рассчитано на одного пользователя на localhost (плюс семейный доступ по приглашению); креденшелы чата — основная защита, не выставляйте порт в интернет без HTTPS.
- `baby-diary-prompt.md` — промпт для модели, а не документация; правится напрямую. При изменении учитывайте, что стабильный префикс промпта даёт кэш-скидки DeepSeek (×10 дешевле вход).
