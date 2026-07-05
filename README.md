# NeiroPeiro AI

Адаптивная AI-платформа на Next.js с чатом, генерацией изображений и видео.

## Стек

- Next.js 16 / React 19
- TypeScript
- Tailwind CSS
- Supabase Auth + Database
- OpenAI-compatible Chat API

## Запуск

```bash
pnpm install
pnpm dev
```

Откройте `http://localhost:3000`.

## Переменные окружения

Создайте `.env.local` только на своём компьютере или добавьте переменные в Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_API_BASE_URL=
OPENAI_MODEL=
```

Не добавляйте `.env.local` в GitHub.

## Проверка сборки

```bash
pnpm build
```

## Развёртывание и откат

Подробная пошаговая инструкция находится в [INSTRUCTIONS-RU.md](./INSTRUCTIONS-RU.md).

## Важно

Редизайн не меняет таблицы Supabase и не удаляет пользовательские данные. Внутренние ключи истории чатов сохранены для совместимости со старой версией.

## Интерфейс

Публичная страница `/` содержит адаптивный landing. Рабочая страница `/chat` использует Clean Workspace: минималистичную desktop-панель, мобильное drawer-меню, компактный composer и нижнюю мобильную навигацию.

## Последние изменения

- Убраны лишние пункты навигации: «Проекты», «Медиа» и «Приложения».
