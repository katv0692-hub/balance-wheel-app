# Balance Wheel — Telegram Mini App

Мини-приложение Telegram для отслеживания колеса баланса жизни.
Каждый день пользователь оценивает свои жизненные сферы от 0 до 10
и видит их на радар-диаграмме.

## Структура

```
balance-wheel-app/
├── bot/           # Telegraf бот — открывает Mini App
├── backend/       # Express API — CRUD сфер и записей
├── frontend/      # Mini App (vanilla JS + Chart.js radar)
├── supabase-schema.sql  # SQL-схема для Supabase
└── .env.example
```

## Быстрый старт

### 1. Supabase

1. Создай проект на [supabase.com](https://supabase.com)
2. Открой SQL Editor → вставь содержимое `supabase-schema.sql` → Run
3. Скопируй Project URL, anon key, и service_role key

### 2. Telegram Bot

1. Открой [@BotFather](https://t.me/BotFather)
2. Создай бота: `/newbot`
3. Скопируй токен
4. Настрой Mini App: `/newapp` → выбери бота → укажи URL

### 3. Установка

```bash
# Установить зависимости
npm install
cd frontend && npm install && cd ..

# Создать .env
cp .env.example .env
# Заполнить .env своими ключами

# Запустить всё (bot + backend + frontend)
npm run dev
```

### 4. Локальная разработка

```bash
# Запустить ngrok для публичного доступа
ngrok http 5174
# Использовать ngrok URL как MINI_APP_URL
```

### 5. Деплой

- **Frontend**: загрузи `frontend/dist/` на любой статический хостинг
  (или используй Telegram Hosting через @BotFather `/newapp`)
- **Backend**: разверни на Railway / Render / VPS
- **Bot**: запусти `node bot/index.js` на том же сервере

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Login/upsert user |
| `/api/spheres` | GET | Get user spheres |
| `/api/spheres` | POST | Create sphere |
| `/api/spheres/batch` | POST | Batch create (onboarding) |
| `/api/spheres/:id` | PATCH | Update sphere |
| `/api/spheres/:id` | DELETE | Delete sphere |
| `/api/entries` | GET | Get entries (date or range) |
| `/api/entries` | POST | Upsert entry |
| `/api/entries/batch` | POST | Batch upsert (save all) |
| `/api/history` | GET | History (last N days) |
