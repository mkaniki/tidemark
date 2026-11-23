# Tidemark: your BTC strategy as a phone app + cloud alerts

This folder gives you two things, both free:

1. **Cloud alert bot.** Every hour (2 minutes past, UTC) GitHub runs **All-in-one v2** on BTCUSDT 1H
   and sends any new entry, stop move, stop hit or exit to your phone, with exact Bitunix sizes.
   Your computer can be off.
2. **Tidemark phone app.** The full charting app, installable on your home screen, showing the bot's last check,
   your open positions and recent alerts.

Alerts only: nothing trades automatically. You place the orders on Bitunix.

---

## Setup (about 10 minutes)

### 1. Make the repository
1. Sign in at **github.com** (or create a free account).
2. Click **+** (top right) → **New repository**. Name it `tidemark`, choose **Public**, then **Create repository**.
   (Free GitHub Pages hosting needs a public repo. Your balance and alert settings stay private in step 2.)
3. Click **uploading an existing file**, drag in everything from this folder **except** the `.github` folder, then **Commit changes**.
4. Add the bot's schedule file (hidden folders don't drag-and-drop reliably):
   **Add file → Create new file**, type the name `.github/workflows/alerts.yml`,
   paste the contents of `.github/workflows/alerts.yml` from this folder, then **Commit changes**.

### 2. Private settings
Repo **Settings → Secrets and variables → Actions**:
- **Secrets** tab → **New repository secret**
  - `NTFY_TOPIC` = your ntfy topic name (the same one you subscribed to in the ntfy app)
  - optional: `TELEGRAM_TOKEN` and `TELEGRAM_CHAT_ID` for Telegram alerts
- **Variables** tab → **New repository variable**
  - `BALANCE` = `3000` (your Bitunix futures balance in USDT; update it as your account changes)

### 3. Let the bot save its state
**Settings → Actions → General → Workflow permissions** → choose **Read and write permissions** → **Save**.

### 4. Turn on the app
**Settings → Pages** → Source: **Deploy from a branch** → Branch **main**, folder **/docs** → **Save**.
After a minute your app is at `https://YOUR-USERNAME.github.io/tidemark/`.

### 5. Test it
**Actions** tab → enable workflows if asked → **Tidemark hourly check** → **Run workflow** →
tick **Send a test alert to my phone** → **Run workflow**.
Within about a minute your phone should get "TEST · Tidemark cloud bot".

### 6. Put the app on your phone
Open `https://YOUR-USERNAME.github.io/tidemark/` on your phone:
- **iPhone (Safari):** Share button → **Add to Home Screen**
- **Android (Chrome):** ⋮ menu → **Install app** (or **Add to Home screen**)

The green **Bot ✓** button in the app opens the bot panel: last check, open positions, recent alerts.

---

## Day to day
- **Update your balance:** GitHub app or website → repo → Settings → Secrets and variables → Actions → Variables → `BALANCE`.
- **Change sizing:** edit `config.json` → `"sizing"`: `"Growth: 3% risk, 50% weekly"` or `"Balanced: 2.5% risk, 25% weekly"`.
- **Is it running?** The app's bot button turns red ("Bot late") if there hasn't been a check for over 2 hours.
  GitHub's scheduler can run a few minutes late at busy times.
- **Pause alerts:** Actions tab → Tidemark hourly check → ⋯ → **Disable workflow**.
- **Kill switch:** if the account falls more than about 50% from its peak, stop and reassess.

## What's inside
| Path | What it is |
|---|---|
| `bot/run.mjs` | the hourly checker: downloads BTC data, runs the strategy, sends new alerts |
| `bot/engine.js`, `bot/strategy.js` | the same backtest engine and All-in-one v2 code as the app |
| `docs/` | the phone app (served by GitHub Pages) plus the bot's status files |
| `.github/workflows/alerts.yml` | the hourly schedule |
| `config.json` | symbol, sizing, Bitunix leverage setting |

Backtest results are not a promise of future returns. This is not financial advice.
