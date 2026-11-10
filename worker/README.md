# Worker YAi Radio

Cloudflare Worker `yaiplay-radio-api` обеспечивает вход, синхронизацию, поддержку, метаданные потоков, проверку геоограничений и публикацию контента сайта. Для данных нужна отдельная KV namespace `yaiplay-radio-db`, привязка переменной `DB`. Worker не разворачивается при публикации сайта.

## Создать новый KV и Worker

1. Откройте https://dash.cloudflare.com и войдите в аккаунт, где размещается проект YAiPlayer.
2. Слева откройте **Storage & Databases → KV** и нажмите **Create**. Название namespace: `yaiplay-radio-db`. Создайте и сохраните её ID для локальной конфигурации Wrangler.
3. Слева откройте **Workers & Pages → Create application → Create Worker**. Имя: `yaiplay-radio-api`. Создайте Worker.
4. Откройте Worker → **Edit code**, замените шаблон содержимым `worker/index.js`, затем **Deploy**.
5. В Worker откройте **Settings → Bindings → Add binding → KV namespace**. Variable name: `DB`; выберите `yaiplay-radio-db`, сохраните и задеплойте.
6. В **Settings → Variables and Secrets → Add** добавляйте только нужные переменные. Сначала проверьте имена уже имеющихся переменных в этом Worker и secrets в GitHub; значения не показывайте и не отправляйте в чат.

| Тип | Имя | Нужно для |
|---|---|---|
| Secret | `ADMIN_PASSWORD` | вход в админку |
| Secret | `TOKEN_SECRET` | подпись сеансов; при смене пользователей разлогинит |
| Secret | `GITHUB_TOKEN` | публикация `public/content.json` из админки |
| Secret | `WINDY_API_KEY` | веб-камеры Windy, если они нужны |
| Secret | `TELEGRAM_BOT_TOKEN` | уведомления поддержки, только если включите; существующий бот `@YAiPlayer_bot` |
| Text | `TELEGRAM_CHAT_ID` | адрес уведомлений поддержки |

Значения вводит владелец непосредственно в Cloudflare.

## Проверить Worker

Откройте в браузере `https://yaiplay-radio-api.<account-subdomain>.workers.dev/health`. Ожидается JSON со значениями `ok: true` и `kv: true`. После создания откройте `public/content.json`, укажите фактический Worker URL в `apiUrl`, затем опубликуйте сайт.

## Локальная публикация кода Worker

Папка `worker/` — самостоятельный Worker, `index.js` — его вход. Не направляйте deployment сайта в Worker: сайт публикуется в отдельный Pages-проект `yaiplay-radio`.
