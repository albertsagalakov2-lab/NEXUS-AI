# Как установить NeiroPeiro AI — Clean Workspace

Эта версия сохраняет публичную главную страницу, Supabase, авторизацию, чаты, генерацию изображений и видео. Рабочая страница `/chat` переделана в спокойный минималистичный интерфейс с desktop sidebar, мобильным drawer-меню и нижней навигацией.

## Установка через GitHub Desktop

1. Распакуйте архив.
2. Откройте GitHub Desktop и выберите репозиторий `NEXUS-AI`.
3. Нажмите `Repository → Show in Explorer`.
4. Скопируйте **всё содержимое** распакованной папки `NeiroPeiro-AI-clean-workspace` в папку репозитория.
5. Подтвердите замену существующих файлов.
6. В GitHub Desktop создайте коммит, например: `Clean workspace desktop and mobile`.
7. Нажмите `Push origin`.
8. Vercel автоматически запустит новый деплой.

## Что не нужно делать заново

При обновлении того же Vercel-проекта не нужно повторно создавать Supabase и не нужно заново добавлять переменные окружения.

В Vercel должны оставаться:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` — сюда вставляется ваш ключ OpenRouter
- `OPENAI_API_BASE_URL=https://openrouter.ai/api/v1`
- `OPENAI_MODEL` — выбранная модель OpenRouter

Не загружайте `.env`, API-ключи и пароли в GitHub.

## Что проверить после деплоя

- `/` — публичная главная;
- `/chat` — новый рабочий интерфейс;
- создание нового чата;
- поиск и открытие старых чатов;
- отправка сообщений через OpenRouter;
- `/image` и `/video`;
- мобильное выдвижное меню;
- нижняя мобильная навигация;
- вход и регистрация.

## Как откатить

### GitHub Desktop

1. Откройте `History`.
2. Нажмите правой кнопкой по коммиту с этим обновлением.
3. Выберите `Revert Changes in Commit`.
4. Нажмите `Push origin`.

### Vercel

Откройте `Deployments`, выберите предыдущий рабочий деплой и нажмите `Promote to Production`.
