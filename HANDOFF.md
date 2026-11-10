# HANDOFF — YAi Radio

Последняя запись сверху. Дата/время: 10 ноября 2026, Europe/Berlin. Владелец — новичок; шаги для ручных действий описывать с самого начала и с ожидаемым результатом. Никогда не просить значения ключей, паролей или токенов.

## Подтверждённые решения владельца

- Репозиторий: `eai-apps/YAiPlay-Radio`, ветка `main`.
- Бренд: **YAi Radio**, приложение Android: `com.yaiplay.radio`, схема ссылок: `yaiplayradio://`.
- Cloudflare Pages: `yaiplay-radio` → `https://yaiplay-radio.pages.dev/`; Worker: `yaiplay-radio-api`; новое KV: `yaiplay-radio-db`. Worker и KV должны быть отдельными ресурсами и привязаны только к радио.
- GitHub Pages: `https://eai-apps.github.io/YAiPlay-Radio/` — служебный адрес и источник OTA/каталога.
- Telegram: использовать существующий канал `@YAiPlayer` и существующего бота `@YAiPlayer_bot`; новых токенов не создавать. Workflow ручной, без расписания; `DRY_RUN=true` по умолчанию; реальные сообщения — только после отдельного «да» владельца. Уведомления без звука.
- VK отключён: интеграции, очередь и секреты удалены.
- На баннерах и рекламных материалах только Cloudflare Pages адрес. Не упоминать телевизионный раздел в рекламе и постах.
- Windy/Gemini/Cloudflare/Android secrets владелец добавляет сам и значения никому не присылает.

## Текущее устройство

React 19 + TypeScript + Vite + Tailwind v4. Основные каталоги: сайт `src/`, PWA `public/`, лёгкая версия `lite/`, Worker `worker/`, нативный Android-код `native/`, workflow `.github/workflows/`. Android проект формируется в CI; не коммитить каталог `android/`.

## Секреты — только имена

| Где | Имена | Назначение | Если значение сменится |
|---|---|---|---|
| GitHub `eai-apps/YAiPlay-Radio` → Settings → Secrets and variables → Actions | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | публикация Cloudflare Pages | владелец обновляет в этом репозитории |
| GitHub `eai-apps/YAiPlay-Radio` → Settings → Secrets and variables → Actions | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL`, `GEMINI_API_KEY` | ручной dry-run/посты и тексты | использовать существующие значения из репозитория YAiPlayer; при ротации обновить в обоих репозиториях |
| GitHub `eai-apps/YAiPlay-Radio` → Settings → Secrets and variables → Actions | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` | подписанный APK | ключ не перевыпускать для обновления существующего пакета; новые значения добавляет владелец |
| Cloudflare Worker `yaiplay-radio-api` → Settings → Variables and Secrets | `ADMIN_PASSWORD`, `TOKEN_SECRET`, `GITHUB_TOKEN`, `WINDY_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | админка, публикация контента, камеры и сообщения поддержки | владелец обновляет только Worker радио |

Не добавлять `VK_TOKEN`, `VK_GROUP_ID`, `VK_BRIDGE_KEY`. Ни одного значения этих secrets в коде нет.

## Проверка и публикация

```sh
npm ci
npm run build
```

`deploy.yml` публикует одинаковый сайт на GitHub Pages и Cloudflare Pages после настройки GitHub Pages (Source: GitHub Actions) и Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Worker деплоится отдельно — это не происходит от публикации сайта. Telegram workflow только `workflow_dispatch`, с сухим прогоном по умолчанию. Android signing требует keystore secrets. Магазинные workflow оставить образцами и не запускать.

## Ещё требуется

- Создать отдельные Pages/Worker/KV в Cloudflare, получить точный `workers.dev` адрес и KV namespace ID, привязать KV и внести secrets владельцем.
- Включить GitHub Pages из Actions и добавить необходимые GitHub secrets/variables.
- Выполнить worker deploy и проверить `/health`; до этого `public/content.json → apiUrl` оставлять пустым.
- Проверить dry-run workflow; не отправлять тестовый пост. Реальную первую публикацию согласовать с владельцем отдельно.
- Добавить/проверить Android signing secrets владельцем и только затем запускать APK workflow; проверить приложение на телефоне владельца.
- Не включать Store/RuStore публикации без отдельного решения.

---

## Журнал работ

### 2026-11-10 — Codex

- Повторно проверил GitHub доступ: у подключённого аккаунта есть `write` в целевой репозиторий.
- Подготовил первую веб-копию и отправил корневой коммит; после подтверждения владельцем package ID `com.yaiplay.radio` перехожу к полному шаблону handoff.
- Текущее изменение: перенос полного исходного проекта с чистым ребрендингом, отключение VK и безопасный ручной Telegram dry-run.
- Проверить: `npm ci`, `npm run build`, текстовый поиск старого бренда, dry-run без отправки.
- Внешние панели, секреты, настоящие посты и APK не считаются проверенными до выполнения соответствующих шагов.
