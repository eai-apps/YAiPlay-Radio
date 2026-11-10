# YAi Radio — паспорт проекта

YAi Radio — сайт/PWA и Android-приложение с каталогом открытых радиостанций. Основной сайт: `https://yaiplay-radio.pages.dev/`; служебный GitHub Pages: `https://eai-apps.github.io/YAiPlay-Radio/`. Worker: `yaiplay-radio-api`; KV: `yaiplay-radio-db`; публичный API адрес вписать в `public/content.json` только после создания Worker.

## Функции

- Каталог станций, поиск по жанрам/странам/настроениям, избранное, собственные плейлисты, похожие станции.
- HLS, потоковые метаданные, проверка потоков, веб-камеры, глобус и лёгкая версия.
- PWA с офлайн-оболочкой, страницы конфиденциальности, Android-интеграция в отдельном пакете `com.yaiplay.radio`.
- Синхронизация, поддержка и административные функции требуют отдельного Worker и KV.

## Стек и команды

React 19, TypeScript, Vite, Tailwind v4, Capacitor 7.

```sh
npm ci
npm run build
```

## Внешние подключения

- GitHub Pages URL используется для OTA/каталога.
- Cloudflare Pages — публичный адрес для ссылок и рекламы.
- Telegram: `@YAiPlayer`, бот `@YAiPlayer_bot`; только ручной workflow, dry-run по умолчанию; без публикации до согласия владельца.
- VK-интеграции нет.
- Не размещать в репозитории значения secrets.

Подробности по незавершённой настройке — в корневом `HANDOFF.md`.
