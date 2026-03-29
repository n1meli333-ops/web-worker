# YouTube Agent - Повна інструкція з налаштування

## Що потрібно купити

### 1. Windows VPS (для AdsPower)
- **Contabo VPS S** (~€12/міс): 4 vCPU, 8GB RAM, 200GB SSD, Windows Server 2022
- Сайт: contabo.com

### 2. Linux VPS (для агента)
- **Hetzner CX32** (~€8/міс): 4 vCPU, 8GB RAM, 80GB SSD, Ubuntu 22.04
- Сайт: hetzner.com

### 3. Telegram Bot Token
- Безкоштовно через @BotFather

---

## Крок 1: Windows VPS — AdsPower

### 1.1 Підключення
- Після покупки отримаєш IP + пароль
- Відкрий Remote Desktop (RDP): `mstsc` на Windows або Microsoft Remote Desktop на Mac
- Підключись: IP:3389, login: Administrator

### 1.2 Встановлення AdsPower
- Завантаж AdsPower з офіційного сайту
- Встанови та залогінься в свій акаунт

### 1.3 Створення профілів
Створи **окремий профіль** для кожного сервісу:

| # | Ім'я профілю | Де залогінитись | Serial |
|---|-------------|----------------|--------|
| 1 | YouTube-Channel1 | YouTube Studio (акаунт каналу) | запиши |
| 2 | Claude-Main | claude.ai (твій акаунт) | запиши |
| 3 | Flow-Video | Flow (де скрипт генерації) | запиши |
| 4 | ElevenLabs | Сайт озвучки (залогінений) | запиши |
| 5 | AssemblyAI | assemblyai.com (опціонально) | запиши |

**Як дізнатись Serial Number:**
- Відкрий AdsPower → список профілів → стовпчик "Serial Number" або "No."

### 1.4 Увімкнути API
1. AdsPower → **Settings** → **Local API**
2. **Enable** Local API
3. Binding address: `0.0.0.0` Port: `50325`
4. Зберегти

### 1.5 Відкрити порт в Firewall
- Windows Firewall → Advanced → Inbound Rule → New Rule
- Port → TCP → 50325 → Allow

### 1.6 Перевірка
Відкрий у браузері на Linux VPS:
```
http://WINDOWS_VPS_IP:50325/api/v1/user/list
```
Має повернути JSON з профілями.

---

## Крок 2: Telegram Bot

### 2.1 Створення бота
1. Відкрий Telegram → знайди @BotFather
2. Відправ `/newbot`
3. Введи ім'я: `YouTube Agent Bot`
4. Введи username: `yt_agent_XXXXX_bot` (щось унікальне)
5. **Збережи токен** (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2.2 Отримання Chat ID
1. Відправ будь-яке повідомлення своєму боту
2. Відкрий у браузері: `https://api.telegram.org/bot<ТОКЕН>/getUpdates`
3. Знайди `"chat":{"id": XXXXXXX}` — це твій Chat ID

---

## Крок 3: Linux VPS — Деплой

### 3.1 Підключення
```bash
ssh root@LINUX_VPS_IP
```

### 3.2 Запуск setup
```bash
curl -o setup.sh https://raw.githubusercontent.com/n1meli333-ops/web-worker/claude/youtube-agent-builder-oFfaW/youtube-agent/setup.sh
chmod +x setup.sh
./setup.sh
```

### 3.3 Клонування репо
```bash
cd /opt/youtube-agent
git clone https://github.com/n1meli333-ops/web-worker.git .
cd youtube-agent
```

### 3.4 Конфігурація .env
```bash
cp .env.example .env
nano .env
```

Заповни ВСІ поля:
```env
# Адреса Windows VPS з AdsPower
ADSPOWER_URL=http://YOUR_WINDOWS_VPS_IP:50325

# Telegram Bot (з кроку 2)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=987654321

# AssemblyAI (безкоштовно $50)
ASSEMBLYAI_API_KEY=your_key_from_assemblyai.com

# Flow — URL сторінки де скрипт генерації відео
FLOW_SCRIPT_URL=https://your-flow-url.com

# ElevenLabs — URL стороннього сайту озвучки
ELEVENLABS_SITE_URL=https://your-elevenlabs-site.com

# Розклад (за замовчуванням кожні 2 години)
SCHEDULER_CRON=0 */2 * * *
```

### 3.5 Запуск
```bash
docker compose up -d
```

### 3.6 Міграція бази даних
```bash
docker compose exec server npx prisma migrate deploy
docker compose exec server npx prisma db seed
```

### 3.7 Перевірка
```bash
# Перевірити що всі контейнери працюють
docker compose ps

# Дивитись логи агента
docker compose logs agent -f

# Дивитись логи сервера
docker compose logs server -f
```

### 3.8 Відкрити дашборд
У браузері: `http://LINUX_VPS_IP`

---

## Крок 4: Налаштування в Dashboard

### 4.1 Settings (Налаштування)
1. Відкрий дашборд → Settings
2. Заповни AdsPower URL, Telegram, Flow URL, ElevenLabs URL
3. Save

### 4.2 Browser Profiles (Профілі браузера)
1. Dashboard → Browser Profiles → Add Profile
2. Додай кожен профіль AdsPower:
   - Name: `YouTube-Channel1`, Type: `YOUTUBE`, Serial: `1`
   - Name: `Claude-Main`, Type: `CLAUDE`, Serial: `2`
   - Name: `Flow-Video`, Type: `FLOW`, Serial: `3`
   - Name: `ElevenLabs`, Type: `ELEVENLABS`, Serial: `4`
   - Name: `AssemblyAI`, Type: `ASSEMBLYAI`, Serial: `5`

### 4.3 Voices (Голоси)
1. Dashboard → Voices → Add Voice
2. Додай голос який використовуєш в ElevenLabs
   - Name: назва голосу як в ElevenLabs

### 4.4 Prompts (Промпти)
1. Dashboard → Prompts
2. Вже є 3 дефолтні промпти (story, video, thumbnail)
3. Відредагуй їх під свої потреби або створи нові

### 4.5 Channels (Канали)
1. Dashboard → Channels → Add Channel
2. Заповни: ім'я, YouTube URL, ніша, мова, голос, частота
3. Додай конкурентів (їх YouTube URL)

### 4.6 Запуск першого відео
- На сторінці каналу натисни **"Create Video Now"**
- Або в Telegram відправ: `/create Назва_каналу`
- Слідкуй за прогресом: Dashboard → Pipelines

---

## Крок 5: Telegram Bot команди

```
/start    — Привітання та список команд
/status   — Статус всіх каналів
/channels — Список каналів з деталями
/create ИмяКаналу — Створити відео зараз
/pause ИмяКаналу  — Поставити канал на паузу
/resume ИмяКаналу — Відновити канал
/pipeline ID      — Деталі конкретного pipeline
/queue            — Черга задач
/logs             — Останні логи агента
/stats            — Статистика
```

---

## Архітектура з'єднання

```
                    Telegram
                       ↕
┌──────────────────────────────────────────┐
│          LINUX VPS (Hetzner)              │
│                                          │
│  ┌─ Dashboard (React) ─── :80            │
│  ├─ API Server (Express) ─ :3002         │
│  ├─ Agent (Node.js)                      │
│  │   └─ connects via Playwright CDP →    │──→ AdsPower API
│  ├─ PostgreSQL ──────────── :5433        │    (Windows VPS:50325)
│  └─ Redis ───────────────── :6379        │
└──────────────────────────────────────────┘
                                              ┌──────────────────────┐
                                              │  WINDOWS VPS         │
                                              │  (Contabo)           │
                                              │                      │
                                              │  AdsPower running    │
                                              │  with profiles for:  │
                                              │  - YouTube Studio    │
                                              │  - Claude.ai         │
                                              │  - Flow              │
                                              │  - ElevenLabs        │
                                              │  - AssemblyAI        │
                                              └──────────────────────┘
```

---

## Вирішення проблем

### Агент не може підключитись до AdsPower
- Перевір що AdsPower запущений на Windows VPS
- Перевір що API увімкнено (Settings → Local API)
- Перевір firewall: порт 50325 відкритий
- Тест: `curl http://WINDOWS_IP:50325/api/v1/user/list`

### Pipeline падає на певному кроці
- Дивись логи: `docker compose logs agent -f`
- CSS селектори можуть застаріти якщо сайт оновив інтерфейс
- Файли сервісів для редагування: `agent/src/services/`

### Бот не відповідає
- Перевір TELEGRAM_BOT_TOKEN і TELEGRAM_CHAT_ID
- `docker compose logs agent -f | grep telegram`

### Як оновити код
```bash
cd /opt/youtube-agent/youtube-agent
git pull
docker compose up -d --build
```
