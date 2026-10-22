# Installing LeaxPanel(os)

Everything below runs from a single command. The installer performs the whole flow: Node.js check →
firewall → secret generation → `npm install` → migrations → seeds → verification.

---

## One command

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.ps1 | iex
```

### Windows (double-click)

1. Open <https://github.com/netblood/LeaxPanel-OS-/raw/main/install.bat>
2. Save it into an empty folder
3. Double-click it

---

## From a clone

```bash
git clone https://github.com/netblood/LeaxPanel-OS-.git
cd LeaxPanel-OS-
```

**Linux / macOS**

```bash
chmod +x install.sh run.sh
./install.sh
./run.sh
```

**Windows**

```bat
install.bat
run.bat
```

**Windows (PowerShell)**

```powershell
.\install.ps1
.\run.bat
```

---

## What the installer does

| # | Step | Details |
| --- | --- | --- |
| 1 | **Node.js check** | Requires Node.js 22+. Stops with a clear message and install instructions if it is missing. |
| 2 | **Firewall** | Opens TCP 3000 using `ufw`, `firewall-cmd` or `netsh`. Warns if it cannot. |
| 3 | **Port check** | Warns when another process already listens on port 3000. |
| 4 | **Directories** | Creates `data/`, `data/uploads/`, `data/files/`, `logs/` and `backups/`. |
| 5 | **Secrets** | Generates `SESSION_SECRET`, `JWT_SECRET`, `ENCRYPTION_KEY` and a strong admin password. Writes `.env`. |
| 6 | **Dependencies** | Runs `npm install --no-audit --no-fund`. |
| 7 | **Migrations** | Applies every numbered file in `migrations/`. |
| 8 | **Seeds** | Inserts the nine roles, 45 permissions and the administrator account. |
| 9 | **Verification** | Runs `scripts/verify.js` — 11 checks covering runtime, schema, seeds and views. |
| 10 | **Report** | Prints the panel URL, the credentials and the next steps. Also saves `INSTALL_CREDENTIALS.txt`. |

The installer is **idempotent** — running it again keeps your existing `.env` values and only fills in what is missing.

---

## Environment overrides

Set these before running the installer to change the defaults:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='your-strong-password' PORT=8080 ./install.sh
```

```powershell
$env:ADMIN_EMAIL='you@example.com'; $env:ADMIN_PASSWORD='your-strong-password'; $env:PORT='8080'; .\install.ps1
```

---

## Starting the panel

```bash
npm start          # foreground
npm run pm2        # background with PM2
npm run pm2:logs   # tail the logs
npm run pm2:stop   # stop it
```

The panel listens on `http://localhost:3000` by default (`HOST` and `PORT` in `.env`).

---

## After the first login

1. Go to **http://localhost:3000/setup** and complete the wizard.
2. Change the administrator password in **My Profile**.
3. Enable 2FA from **My Profile → Security**.
4. Open **http://localhost:3000/doctor** and run the diagnostics.
5. Optionally enable public registration and set your branding in **Settings**.
6. Connect a Discord webhook (`DISCORD_WEBHOOK_URL`) to mirror audit events.

---

## Updating

```bash
git pull
npm install
npm run migrate
npm run seed
npm run pm2:restart
```

Migrations are tracked in the `schema_migrations` table and only run once each.

---

## Uninstalling

```bash
pm2 delete leaxpanel      # if you used PM2
rm -rf data/ logs/ backups/ node_modules/
```

Keep `data/leaxos.db` if you want to preserve your configuration.
