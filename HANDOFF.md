# HANDOFF — YAiPlay Radio

Последняя запись сверху. Дата/время: 10 ноября 2026, Europe/Berlin. Владелец — новичок; шаги для ручных действий описывать с самого начала и с ожидаемым результатом. Никогда не просить значения ключей, паролей или токенов.

## Подтверждённые решения владельца

- Репозиторий: `eai-apps/YAiPlay-Radio`, ветка `main`.
- По решению владельца все сохраняемые материалы и архивы проекта радио размещать в `G:\evvant\Projects\Projects\HANDOFF\Radio-Clone\YAiPlay-Radio`. Не хранить там секреты. Существующие файлы не перезаписывать без необходимости; использовать понятные имена и даты.
- Бренд: **YAiPlay Radio**, приложение Android: `com.yaiplay.radio`, схема ссылок: `yaiplayradio://`.
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

Чтобы включить GitHub Pages: откройте `https://github.com/eai-apps/YAiPlay-Radio` → **Settings** → слева **Pages** → в **Build and deployment** выберите **Source: GitHub Actions**. Затем откройте **Actions** → **Публикация на GitHub Pages** → **Run workflow** → ветка `main` → **Run workflow**. Ожидаемый результат — зелёный запуск и сайт `https://eai-apps.github.io/YAiPlay-Radio/`.

## Ещё требуется

- Worker, KV и Pages созданы; владельцу ещё нужно настроить необходимые secrets, после проверки их существующих имён.
- Владелец должен включить GitHub Pages по шагам выше; первый запуск собрал сайт, но остановился на отключённой настройке Pages.
- Создать новые графические материалы YAi Radio для карточки RuStore; старые изображения бренда удалены и публикация магазина не запускалась.
- Добавить необходимые GitHub secrets/variables.
- Проверить доступные функции Worker после настройки необходимых secrets; `/health` уже проверен и `public/content.json → apiUrl` заполнен.
- Проверить dry-run workflow; не отправлять тестовый пост. Реальную первую публикацию согласовать с владельцем отдельно.
- Добавить/проверить Android signing secrets владельцем и только затем запускать APK workflow; проверить приложение на телефоне владельца.
- Не включать Store/RuStore публикации без отдельного решения.

---

## Журнал работ

### 2026-11-10 — Codex: состояние передачи

- Код с новым названием и 2G находится в draft PR https://github.com/eai-apps/YAiPlay-Radio/pull/1, ветка `codex/yaiplay-name-2g`; в `main` эти изменения пока не влиты. Автоматическая проверка отклонила прямое обновление `main`, поэтому не обходить это решение; потребуется согласованное принятие PR.
- Оба сайта уже опубликованы вручную из архивов; Worker продолжает работать, но его шаблон превью ссылок пока может показывать старое имя, поскольку редактор Cloudflare не завершил загрузку при попытке обновления. После принятия PR обновить Worker и повторить `/health`.

### 2026-11-10 — Codex: название YAiPlay Radio

- Владелец уточнил правильное название: **YAiPlay Radio**. В текстах сайта, PWA, Worker, подготовленных Telegram-материалах и исходниках приложения заменено прежнее имя; адреса и идентификаторы сохранены. Для будущих чатов дополнен исходный `G:\evvant\Projects\Projects\HANDOFF\Radio-Clone\TASK-RADIO-CLONE.md`; все сохраняемые материалы размещать в его подпапке `YAiPlay-Radio`.
- Основной сайт и отдельный Pages preview `2g` опубликованы вручную из архивов с новым именем. Оба интерфейса открылись; `https://2g.yaiplay-radio.pages.dev/api/health` вернул `ok: true`, `kv: true`, а `/data/content.json` получил настройки с основного сайта. Сборка 2G: 160792 байт gzip на старте; тесты прокси 7/7, реальная сеть 2G, телефон и личный вход не проверены. Надписи внутри растровых изображений не проверены. Реальных постов Telegram и сборок Android не запускать без отдельного решения.
- `.github/workflows/deploy-lite.yml` направлен в Pages-проект `yaiplay-radio` на ветку `2g`; для автоматического деплоя нужны Cloudflare secrets, запуск workflow пока не проверен. Архивы `yaiplay-main-2026-11-10.zip` и `yaiplay-2g-2026-11-10.zip` сохранены в указанной папке.

### 2026-11-10 — Codex: публикация Pages и папка материалов

- Владелец указал сохранять материалы радио в `G:\evvant\Projects\Projects\HANDOFF\Radio-Clone\YAiPlay-Radio`. В этой папке сохранён `radio-pages-2026-11-10.zip` — первая локальная сборка сайта; секретов в архив намеренно не добавляли.
- Архив загружен в отдельный Cloudflare Pages `yaiplay-radio`: Cloudflare подтвердил успешную публикацию, главная страница `https://yaiplay-radio.pages.dev/` открылась. Воспроизведение станций и полный набор функций не проверялись. Последующие публикации через GitHub Actions ещё нужно настроить и проверить.
- GitHub Pages и ручные workflow catalog/Telegram в GitHub Actions остаются непроверенными. Сухой прогон Telegram локально выполнен без отправки; никаких постов не публиковать до отдельного решения владельца.
- При просмотре опубликованной страницы замечена оставшаяся надпись `SLY-SYNC` и ссылка на отдельный 2G-адрес; ребрендинг и работоспособность 2G требуют отдельной проверки в рамках разрешённого объёма.

### 2026-11-10 — Codex: Cloudflare радио

- В аккаунте yai.media.player созданы отдельные Worker `yaiplay-radio-api`, KV `yaiplay-radio-db` и Pages `yaiplay-radio`. KV подключён к Worker как `DB`; идентификатор записан в `worker/wrangler.toml`.
- Worker развёрнут из `worker/index.js`; `https://yaiplay-radio-api.yai-media-player.workers.dev/health` вернул `ok: true`, `kv: true`. Секреты Worker пока не настроены. `public/content.json` указывает на проверенный Worker.
- Pages создан для Direct Upload; загрузку сайта, GitHub Pages, настройки публикации и фактические запуски Actions ещё нужно проверить. Telegram остаётся только dry-run, без cron и отправки.

### 2026-11-10 — Codex: подготовка этапа Cloudflare и workflows

- Telegram workflow ограничен ручным dry-run: `DRY_RUN=true` задан в workflow, выбор реальной отправки и доступ к Telegram secrets убраны, запись состояния отключена. Фактическая отправка по-прежнему требует отдельного решения и изменения workflow.
- В `catalog.yml` исправлена проверка результата push и передача secrets в вызываемый `deploy.yml`; Cloudflare Pages теперь не создаётся автоматически и ошибка её публикации не маскируется.
- Локальный dry-run `feature` сформировал черновик без вызовов Telegram; `station` при отсутствии сетевого доступа не нашёл станцию. Настройка и проверка Cloudflare и GitHub Actions требуют продолжения.

### 2026-11-10 18:38 Europe/Berlin — Codex

- Владелец попросил повторно получить доступ к исходному и целевому GitHub-репозиториям и продолжить по handoff; доступ `write` к `eai-apps/YAiPlay-Radio` подтверждён. Package ID `com.yaiplay.radio` подтверждён владельцем.
- Полный исходный проект подготовлен в `eai-apps/YAiPlay-Radio`: YAi Radio ребрендинг, графика YAi с антенной, PWA/сайт, отдельные конфиги Worker/KV, ручной Telegram dry-run, Android package ID. В тексте и именах файлов нет старых названий проекта/аккаунта; секретов владельца не добавлял.
- VK интеграции/очередь отключены; Telegram публикация и Android/RuStore workflows оставлены только для ручного запуска. Автоматическую сборку APK при push убрал; Android workflow теперь откажется собирать неподписанный APK. Реальный Worker, пост Telegram и APK не запускались.
- Старые магазинные изображения удалены, в `docs/RUSTORE.md` отмечено, что новые скриншоты ещё нужно подготовить.
- Коммит `8f98bb8` отправлен в `main` после `git pull --rebase`. GitHub Actions шаги `npm ci` и `npm run build` завершились успешно. Публикация остановилась на `configure-pages`: GitHub Pages в репозитории не включён (ошибка 404). Инструкция владельцу находится выше.
- Локально npm не смог получить registry из-за сетевой ошибки DNS, поэтому успешный результат сборки взят из GitHub Actions, не из локального ПК.
- Проверены поиск старого бренда в текстовых файлах/именах и diff на whitespace; значение секретов в код не вносились.
- Не выполнено: включение GitHub Pages владельцем; создание и деплой Pages/Worker/KV в Cloudflare и добавление secrets; проверка ручного Telegram dry-run; подпись и проверка APK на устройстве; материалы RuStore. Следующий помощник: сначала проверь результат Pages после настройки владельца, затем продолжай с незавершённых пунктов выше. Не отправляй пост и не запускай APK без соответствующего решения владельца и готовых secrets.
