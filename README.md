# AI Notes — Эйяй Ноутс

Минималистичное веб-приложение для заметок с ИИ. Референсы — «Заметки» от Apple и Notion.
Заметки синхронизируются на всех устройствах, поддерживают форматирование, теги,
напоминания, экспорт и ИИ-функции.

## Возможности

| # | Функция | Где |
|---|---------|-----|
| 1 | Цветные теги и фильтрация по ним | боковая панель → «Теги» |
| 2 | Экспорт заметки / всех заметок в Markdown и `.txt` | меню заметки и низ боковой панели |
| 3 | Синхронизация между устройствами через Supabase (realtime) | автоматически |
| 4 | ИИ-поиск по заметкам + короткая ИИ-сводка | поле «ИИ-поиск» в боковой панели |
| 5 | Форматирование: заголовки, Ж/К/Подчёркивание/Зачёркивание, цвет, выделение, ссылки, маркированные/нумерованные/многоуровневые списки, чек-листы, код, цитата, очистка форматирования | панель редактора |
| 6 | Автоматические неразрывные пробелы (предлоги/частицы не «висят» в конце строки) | при сохранении + кнопка ⤶ в панели |
| 7 | Таблицы (референс — Confluence) | кнопка «таблица» в панели |
| 8 | Напоминания к заметке или к фрагменту текста | меню заметки / ИИ-меню выделения |
| 9 | Выделить текст → ИИ переформулирует, сократит, исправит, сменит тон или выполнит свою команду | всплывающее меню при выделении |
| 10 | Сокращение всей заметки в духе «Главред» | меню заметки → «Сократить (ИИ)» |
| 11 | Архив удалённых заметок + «Удалить всё» | боковая панель → «Архив» |
| 12 | Адаптив под мобильные (iOS Safari) и ПК (Chrome) | весь интерфейс |

## Технологии

- **Next.js 14** (App Router) + **React** + **TypeScript**
- **Tailwind CSS** — стили и адаптив
- **TipTap** (ProseMirror) — редактор форматированного текста и таблиц
- **Supabase** — авторизация (magic link), база данных (Postgres + RLS), хранилище изображений, realtime
- **Claude (Anthropic)** — ИИ-поиск, рерайт, сокращение (вызовы только на сервере)

---

## Настройка (пошагово)

### 1. Установка зависимостей

```bash
npm install
```

### 2. Создание проекта Supabase

1. Зайдите на [supabase.com](https://supabase.com) → **New project**.
2. Задайте имя и пароль БД, дождитесь создания.
3. Откройте **SQL Editor** → **New query**, вставьте содержимое файла
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) и нажмите **Run**.
   Это создаст таблицы (`notes`, `tags`, `note_tags`, `reminders`), политики
   безопасности (RLS) и бакет для изображений `note-images`.
4. **Settings → API** скопируйте:
   - `Project URL` → в `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` ключ → в `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. **Authentication → Sign In / Providers → Email**: включите **Enable Email provider**.
   Для входа по паролю без подтверждения почты — отключите **Confirm email**.
   (Если оставите вход по ссылке — в **Authentication → URL Configuration → Redirect URLs**
   добавьте `http://localhost:3000/auth/callback` и адрес продакшена.)

### 3. Ключ Claude (Anthropic)

1. Зайдите на [console.anthropic.com](https://console.anthropic.com) → **API Keys** → создайте ключ.
2. Скопируйте его в `ANTHROPIC_API_KEY`. Ключ используется только на сервере
   (в route handlers) и **не** попадает в браузер.

### 4. Переменные окружения

Скопируйте пример и подставьте значения:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Запуск

```bash
npm run dev
```

Откройте http://localhost:3000 → «Открыть заметки» → войдите по ссылке из письма.

---

## Деплой на Vercel

1. Запушьте репозиторий на GitHub.
2. На [vercel.com](https://vercel.com) → **Add New → Project** → импортируйте репозиторий.
3. В **Environment Variables** добавьте те же переменные, что в `.env.local`
   (значение `NEXT_PUBLIC_SITE_URL` укажите как продакшен-URL, напр. `https://ai-notes.vercel.app`).
4. Deploy. После деплоя добавьте `https://<домен>/auth/callback` в Redirect URLs Supabase.

---

## Структура проекта

```
src/
├── app/
│   ├── page.tsx              # лендинг
│   ├── login/                # вход (magic link)
│   ├── auth/callback/        # обмен кода на сессию
│   ├── notes/                # рабочая область (защищена middleware)
│   └── api/
│       ├── search/           # ИИ-поиск + сводка
│       ├── rewrite/          # рерайт выделенного фрагмента
│       └── shorten/          # сокращение всей заметки («Главред»)
├── components/               # UI: список, редактор, панель, теги, напоминания
├── lib/
│   ├── supabase/             # клиенты (browser/server/middleware)
│   ├── store.ts              # состояние + синхронизация (Zustand)
│   ├── editor-extensions.ts  # набор расширений TipTap
│   ├── markdown.ts           # экспорт в Markdown/txt и plain text
│   ├── typograf.ts           # неразрывные пробелы
│   └── anthropic.ts          # серверный клиент Claude
└── middleware.ts             # защита приватных маршрутов
supabase/migrations/0001_init.sql  # схема БД + RLS + storage
```

## Полезные команды

```bash
npm run dev        # разработка
npm run build      # прод-сборка
npm run start      # запуск собранного
npm run typecheck  # проверка типов
```
