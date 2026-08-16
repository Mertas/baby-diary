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

Требования: Node 18+, [ffmpeg](https://ffmpeg.org) в PATH (конвертация MOV→MP4 и превью; фото работают и без него).

## Как это устроено

- **LLM управляет данными**: вся бизнес-логика дневника описана в [`baby-diary-prompt.md`](baby-diary-prompt.md) (57 КБ системного промпта). Модель возвращает JSON `{"text": ..., "state": {...}, "choices": [...]}`.
- **Сервер нормализует** (`src/server/state.ts`): парсит «время мамы» («вчера 22:00», «20.07 07:30»), чинит схема-дрейф модели (time/start, события в events вместо feeds/sleeps), дедуплицирует, мержит массивы, обрабатывает удаления через маркер `_delete:true`.
- **Клиент** (`src/client/diary-ui.ts`) — монолитный SPA без фреймворков: рендерит state во вкладки, чат с кнопками-вариантами (мультивыбор), галерею с очередью обработки медиа, календарь с фото-подложкой, погоду.

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | сборка клиента + сервер с hot-reload (tsx watch) |
| `npm start` | сборка клиента + сервер |
| `npm run build:client` | esbuild клиента в `dist/client/` |
| `npm run typecheck` | tsc сервера (без клиента) |
| `npm test` | node:test по чистым функциям (`test/`) |

## API (кратко)

Все `/api` и WebSocket защищены креденшелами чата (`clientId`/`clientSecret` из тела, query или заголовков `X-Client-Id`/`X-Client-Secret`); открыты только список/создание чатов и HTML-страница.

- `POST /api/chats` — создать дневник → `{id, clientId, clientSecret}` (секреты храните в localStorage)
- `GET/POST /api/chat/:id/state` — читать/слить состояние дневника
- `POST /chat/:id/prompt` — отправить сообщение (стриминг по WS `/chat/stream`), `POST /chat/:id/stop` — остановить, `POST /chat/:id/undo` — откатить последний ответ **вместе с изменениями state**, `POST /chat/:id/snapshot` — копия дневника (включая state и файлы фото)
- `POST /api/chat/:id/photo` — фото base64; `POST /api/chat/:id/media` — бинарная загрузка (встаёт в очередь обработки, прогресс — WS `/media-queue`); `GET /api/photo/:chatId/:id[?th=1]` — отдача со стримом и Range (перемотка видео)
- `GET /api/weather?city=...` — погода Open-Meteo (без ключа, кэш 30 мин)

## Данные

- SQLite: `data/babydiary.db` (схема — `src/db/schema.ts`, миграции — idempotent `ALTER TABLE` в `src/db/index.ts`)
- Фото/видео: `data/photos/<chatId>/<id>.jpg|.mp4` + превью `<id>.th.jpg`
- `llm_logs` (полные промпты/ответы) ротируются при старте: хранятся 30 дней

## Известные особенности

- Приложение рассчитано на одного пользователя на localhost; креденшелы чата — единственная защита, не выставляйте порт в интернет.
- `baby-diary-prompt.md` — промпт для модели, а не документация; правится напрямую.
