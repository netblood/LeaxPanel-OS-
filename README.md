# LeaxPanel(os)

**Host Anything. Manage Everything. Deploy Anywhere.**

A complete **Cloud Platform Operating System** built in pure JavaScript — Node.js 22+, Express, EJS, Socket.IO and SQLite.
No build step. No TypeScript. No React. No Vue. No Docker, PostgreSQL, Redis or MinIO required.

> Created & organized by **Bilal Chentouf (NetBlood)** — AI assisted development.

---

## Table of Contents

- [One-Command Install](#one-command-install)
- [Quick Start](#quick-start)
- [Manual Installation](#manual-installation)
- [Default Credentials](#default-credentials)
- [Feature Tour](#feature-tour)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Layout](#project-layout)
- [Configuration](#configuration)
- [REST API](#rest-api)
- [Roles & Permissions](#roles--permissions)
- [Commands](#commands)
- [LeaxPanel Doctor](#leaxpanel-doctor)
- [Troubleshooting](#troubleshooting)
- [Documentation & Links](#documentation--links)
- [License](#license)

---

## One-Command Install

The installer handles **everything**: Node.js check, secret generation, dependency install, database migrations, seeds, admin creation and verification.

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.ps1 | iex
```

### Windows (double-click)

Download [`install.bat`](https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.bat) and run it.

### From a clone

```bash
git clone https://github.com/netblood/LeaxPanel-OS-.git
cd LeaxPanel-OS-

# Linux / macOS
chmod +x install.sh run.sh
./install.sh
./run.sh

# Windows
install.bat
run.bat
```

**What the installer does automatically:**

| Step | Action |
| --- | --- |
| 1 | Verifies Node.js 22+ (and npm) |
| 2 | Opens firewall port `3000` (ufw / firewalld / netsh) |
| 3 | Generates `SESSION_SECRET`, `JWT_SECRET`, `ENCRYPTION_KEY`, admin password |
| 4 | Installs npm dependencies |
| 5 | Applies every database migration |
| 6 | Seeds roles, permissions and the administrator account |
| 7 | Runs the verification suite and prints the credentials |

The generated credentials are also written to `INSTALL_CREDENTIALS.txt`.

---

## Quick Start

1. Run the installer (`install.bat`, `install.sh` or the one-liner above).
2. Start the panel: `run.bat`, `./run.sh` or `npm start`.
3. Open **http://localhost:3000** in your browser.
4. Sign in with the credentials printed by the installer.
5. Optionally run the **setup wizard** at http://localhost:3000/setup.

---

## Manual Installation

```bash
git clone https://github.com/netblood/LeaxPanel-OS-.git
cd LeaxPanel-OS-

npm install                 # dependencies
cp .env.example .env        # then edit the secrets
npm run migrate             # create the SQLite schema
npm run seed                # roles, permissions, administrator
npm start                   # http://localhost:3000
```

Requirements: **Node.js 22+** and **npm 10+**. Nothing else.

---

## Default Credentials

| Field | Value |
| --- | --- |
| Email | `owner@leaxos.local` |
| Password | Generated during installation (see `INSTALL_CREDENTIALS.txt`) |

Override with `ADMIN_EMAIL` / `ADMIN_PASSWORD` environment variables before running the installer.

---

## Feature Tour

### Dashboard

The redesigned dashboard provides:

- **System Overview**: Total websites, apps, bots, workflows, AI agents, domains, users, databases
- **Infrastructure Status**: CPU, RAM, DISK, BANDWIDTH, BACKUPS, SECURITY SCORE
- **Quick Create Section**: Large visible action buttons for one-click creation
- **Service Cards**: Beautiful cards for each service category
- **Visual Status**: Status indicators everywhere (Green/Yellow/Red/Offline)
- **Service Wizards**: Step-by-step deployment wizards
- **Auto Setup**: Automatic OS detection, config generation, folder creation, monitoring, backups, permissions

### Service Categories

Web Hosting:
- NodeJS Hosting
- PHP Hosting
- WordPress Hosting
- WooCommerce Hosting

Telegram Hosting:
- Telegram Bot creation and management

Discord Hosting:
- Discord Bot creation and management

WhatsApp Hosting:
- WhatsApp Instance creation and management

N8N Hosting:
- n8n Workflow automation

AI Hosting:
- AI Agent deployment and management

Database Hosting:
- Database creation and management

Email Hosting:
- SMTP configuration and management

Storage Hosting:
- File management and backups

Each card contains: Install, Manage, Stats, Documentation

### Quick Create Buttons

Large visible action buttons in the dashboard:

- + Create Website
- + Create WordPress
- + Create WooCommerce
- + Create NodeJS App
- + Create PHP App
- + Create Telegram Bot
- + Create Discord Bot
- + Create WhatsApp Instance
- + Create AI Agent
- + Create n8n Workflow
- + Create Database
- + Create Domain
- + Create Email
- + Create Backup

### Service Wizards

Every deployment uses a simple wizard. Example: Create Discord Bot

- **Step 1**: Name
- **Step 2**: Token
- **Step 3**: Repository
- **Step 4**: Deploy
- **Done**.

### Auto Setup & Automation

LeaxPanel should automatically:

- Detect OS
- Detect NodeJS
- Detect PM2
- Detect Nginx
- Detect Firewall
- Detect Available Ports
- Generate SSL
- Generate Configs
- Create Folders
- Generate Logs
- Setup Monitoring
- Setup Backups
- Configure Permissions

Users should not manually perform Linux tasks.

---

## Module Management

Every Website/App/Bot should be manageable from UI with:

- **Overview** - Service status and statistics
- **Files** - File manager
- **Domains** - Domain management and SSL
- **DNS** - DNS configuration
- **SSL** - SSL certificate management
- **Logs** - Access and error logs
- **Backups** - Backup creation and restoration
- **Analytics** - Usage analytics
- **Restart** - Service restart
- **Update** - Service update
- **Clone** - Service cloning
- **Delete** - Service deletion
- **Permissions** - Access control
- **Settings** - Service-specific settings

### Visual Status Indicators

Everything has status indicators:
- **Green** - Running
- **Yellow** - Warning
- **Red** - Offline
- **Gray** - Unknown

---

## Feature Tour

### Overview
- **Dashboard** — CPU, RAM, disk, network, live counters, charts, latest logs, latest backups, activity feed, server health, security score and quick actions.
- **Monitoring** — realtime telemetry, network interfaces, recorded metric history, JSON endpoint.
- **Backups** — manual and scheduled snapshots, restore points, rollback, on-disk manifests.

### Infrastructure
- **Domains & DNS** — domains, DNS records, SSL certificates, Cloudflare zones.
- **Websites** — static, NodeJS, PHP, WordPress and proxy sites.
- **Applications** — NodeJS / PHP / WordPress / Docker deployments with PM2 commands, env vars, ports and domains.
- **File Manager** — upload, download, edit with syntax highlighting, rename, move, delete, create folders, ZIP and extract.
- **Storage** — buckets for files and media.

### Applications & Bots
- **N8N Workflows** — workflow definitions, status, execution readiness.
- **Telegram / Discord / WhatsApp** — bot deployments, tokens, phones, QR-ready sessions.
- **Unified Bots** — every bot in one list.

### AI
- **AI Agents** — support, DevOps, security, marketing, sales and coding agents.
- **AI Providers** — per-user configuration for OpenAI, Claude, Gemini, OpenRouter, DeepSeek, Mistral, Grok, Ollama or any OpenAI-compatible API. Base URL, API key (AES-256-GCM encrypted), model, system prompt, temperature and max tokens.
- **AI Hosting** — hosted inference endpoints and models.
- **Knowledge Bases** — attach documents to agents.

### Data & Services
- **Databases** — SQLite, PostgreSQL, MySQL, MongoDB and Redis instances.
- **Email** — mailboxes, providers, SMTP/IMAP configuration.
- **Communication** — email, SMS, webhook and push channels.
- **Cloudflare** — zones, DNS, SSL, cache and firewall rules.

### Business
- **Service Requests** — clients request a service, admins review, assign and deploy.
- **Billing** — **disabled by default**. The owner can enable Stripe, PayPal or manual billing from Settings. While disabled only the request system is used.
- **Marketplace** — deployable templates and services.

### Administration
- **Users** — accounts, roles, activation, password resets.
- **Roles & Permissions** — nine roles, 45 granular permissions, visible matrix.
- **Security** — security score, audit log, security events, IP whitelist/blacklist, rate limits, 2FA.
- **White Label** — panel name, logo, colours, brand, domain and footer.
- **Platform** — low level configuration keys.
- **Settings** — branding, registration, billing, maintenance mode, support details.
- **API Keys** — scoped keys for the REST API with usage analytics.
- **Notifications** — in-panel event feed with read/unread state.
- **My Profile** — account details, password change, 2FA toggle, personal AI providers.
- **LeaxPanel Doctor** — 12 health checks with one-click automatic fixes.

---

## Architecture

```mermaid
graph TD
    Browser[Browser] -->|HTTPS| Express[Express 4 App]
    Express --> Layout[express-ejs-layouts]
    Express --> Session[SQLite Session Store]
    Express --> CSRF[csurf Protection]
    Express --> RBAC[RBAC Middleware]
    RBAC --> Audit[Audit Middleware]
    RBAC --> Routes[Route Modules]
    Routes --> Services[Service Layer]
    Services --> DB[(better-sqlite3)]
    Express <-->|WebSocket| Socket[Socket.IO]
    Audit --> Discord[Discord Webhook]
    Express -->|REST| API[/api + X-API-Key]
```

### Request lifecycle

1. `helmet` → `compression` → `cors` → body parsers → cookie parser → method override
2. `express-session` backed by a **SQLite store** (no MemoryStore, no Redis)
3. `connect-flash`
4. `csurf` (skipped for `/api/*`)
5. Global locals: user, flash messages, CSRF token, panel settings, sidebar counters
6. `express-ejs-layouts` → app shell (sidebar + topbar + content)
7. Audit middleware → `audit_logs` table (+ Discord mirror)
8. Route handlers → validation → service → SQLite

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 22+ |
| Framework | Express.js 4 |
| Templates | EJS 3 + express-ejs-layouts |
| Database | SQLite via better-sqlite3 (WAL, foreign keys on) |
| Realtime | Socket.IO 4 |
| Auth | bcryptjs, express-session, csurf, speakeasy (TOTP), jsonwebtoken |
| Security | helmet, express-rate-limit, cors |
| Logging | winston, morgan |
| Jobs | node-cron |
| Uploads | multer |
| Process manager | PM2 (optional) |

---

## Project Layout

```text
LeaxPanel/
├── server.js                # Application entry point
├── ecosystem.config.js      # PM2 configuration
├── config/
│   ├── db.js                # SQLite data layer
│   ├── database.js          # Legacy-compatible pool shim
│   ├── sessionStore.js      # SQLite-backed express-session store
│   ├── security.js          # Rate limiters, helmet CSP, CORS
│   ├── modules.js           # Declarative module registry
│   └── socket.js            # Socket.IO bootstrap
├── middleware/
│   ├── auth.js              # requireAuth / requireGuest / optionalAuth
│   ├── rbac.js              # Roles, permissions, guards
│   ├── validation.js        # express-validator schemas
│   └── audit.js             # Audit trail + Discord mirroring
├── routes/                  # One module per route file
├── services/                # Business logic layer
├── views/                   # EJS templates
│   ├── layout.ejs           # App shell
│   ├── partials/            # head, sidebar, topbar, footer, flash, tables, forms
│   └── <module>/            # index / create / edit / show per module
├── migrations/              # Numbered .sql files
├── seeds/                   # Default roles, permissions, admin
├── scripts/
│   ├── bootstrap.js         # Shared installer logic
│   ├── verify.js            # Post-install verification
│   ├── doctor-cli.js        # CLI diagnostics
│   ├── crawl-routes.js      # Route crawler
│   └── generate-views.js    # Regenerates module views
├── public/
│   ├── css/style.css        # Design system
│   └── js/main.js           # Frontend runtime
├── install.bat / install.ps1 / install.sh
└── run.bat / run.sh
```

---

## Configuration

Everything lives in `.env` (created automatically by the installer).

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `NODE_ENV` | `production` | Runtime mode |
| `SESSION_SECRET` | generated | Session signing key |
| `JWT_SECRET` | generated | JWT signing key |
| `ENCRYPTION_KEY` | generated | AES-256-GCM key for stored secrets |
| `ADMIN_EMAIL` | `owner@leaxos.local` | Seeded administrator email |
| `ADMIN_PASSWORD` | generated | Seeded administrator password |
| `DB_PATH` | `./data/leaxos.db` | SQLite file location |
| `PANEL_NAME` | `LeaxPanel` | Brand shown in the UI |
| `REGISTRATION_ENABLED` | `false` | Allow public sign-up |
| `BILLING_ENABLED` | `false` | Enable invoices and payments |
| `BILLING_PROVIDER` | `manual` | `manual`, `stripe` or `paypal` |
| `MAINTENANCE_MODE` | `false` | Show the maintenance message |
| `BACKUP_CRON` | `0 3 * * *` | Scheduled backup time |
| `RATE_LIMIT_MAX` | `300` | General rate limit per window |
| `DISCORD_WEBHOOK_URL` | empty | Mirror audit events to Discord |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, … | empty | Optional provider shortcuts |

---

## REST API

Every resource is available over JSON. Authenticate with the session cookie **or** an API key header.

```bash
# Health
curl http://localhost:3000/api/health

# Statistics
curl -H "X-API-Key: lx_your_key" http://localhost:3000/api/stats

# List a resource
curl -H "X-API-Key: lx_your_key" "http://localhost:3000/api/apps?limit=20"

# Create
curl -X POST -H "X-API-Key: lx_your_key" -H "Content-Type: application/json" \
     -d '{"name":"my-app","type":"nodejs","port":3001}' \
     http://localhost:3000/api/apps

# Update / delete
curl -X PUT    -H "X-API-Key: lx_your_key" -H "Content-Type: application/json" \
     -d '{"status":"running"}' http://localhost:3000/api/apps/1
curl -X DELETE -H "X-API-Key: lx_your_key" http://localhost:3000/api/apps/1
```

Available resources: `users`, `services`, `apps`, `websites`, `databases`, `domains`, `bots`, `workflows`,
`agents`, `backups`, `invoices`, `requests`, `notifications`, `dns_records`, `ssl_certificates`, `webhooks`.

Create keys in the panel under **API Keys** (`/apikeys`). Keys are stored as SHA-256 hashes and shown once.
Every API-key request is recorded in `api_usage_log` and visible at `/apikeys/usage`.

---

## Roles & Permissions

| Role | Level | Purpose |
| --- | --- | --- |
| `owner` | 100 | Full access to everything |
| `admin` | 90 | Everything except system management |
| `reseller` | 80 | Sell and manage services for customers |
| `manager` | 70 | Manage services and users |
| `developer` | 60 | Deploy and manage applications |
| `support` | 50 | Handle support requests |
| `billing` | 40 | Invoices and payments |
| `user` | 30 | Standard access to their own resources |
| `viewer` | 10 | Read-only |

Permissions follow the `module:action` pattern (`apps:create`, `domains:delete`, `doctor:run`, …).
The full matrix is visible at **/users/roles**.

---

## Commands

| Command | Description |
| --- | --- |
| `npm start` | Start the panel |
| `npm run dev` | Start the panel (development) |
| `npm run migrate` | Apply pending migrations |
| `npm run seed` | Seed roles, permissions and the admin |
| `npm run pm2` | Start under PM2 (`leaxpanel`) |
| `npm run pm2:logs` | Tail the PM2 logs |
| `npm run pm2:stop` | Stop the PM2 process |
| `npm run verify` | Post-install verification suite |
| `npm run doctor` | CLI diagnostics |
| `npm run crawl` | Crawl every route and report 404/500s |
| `npm run generate:views` | Regenerate the module views |
| `npm run install:setup` | Run the installer bootstrap manually |

---

## LeaxPanel Doctor

Open **http://localhost:3000/doctor** (or run `npm run doctor`).

Checks performed:

| Check | Auto-fix |
| --- | --- |
| Node.js runtime | — |
| Database connection | — |
| Database migrations | [OK] applies pending migrations |
| Administrator account | [OK] runs the seeds |
| Storage directories | [OK] creates `data/`, `logs/`, `backups/` |
| Network ports | — |
| Security secrets | [OK] generates missing keys in `.env` |
| Roles & permissions | [OK] re-synchronises the matrix |
| Domains & SSL | — |
| Backup system | — |
| Log files | creates the log directory |
| Setup wizard | — |

Use **Fix everything** to apply every available fix in one click.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `EADDRINUSE` | Another process owns port 3000. Change `PORT` in `.env` or stop that process. |
| `secret option required for sessions` | `.env` is missing `SESSION_SECRET`. Run `npm run install:setup`. |
| `Error: secret option required` / empty tables | Run `npm run migrate && npm run seed`. |
| `invalid csrf token` | Your session expired. Reload the page and sign in again. |
| Login loops | Delete `data/leaxos.db` and re-run `npm run migrate && npm run seed`. |
| Port not reachable | Open TCP 3000 in the firewall (the installer tries automatically). |
| Page shows a 404 | Run `npm run crawl` — it lists every failing route. |
| Permission denied on `data/` | `chown -R $USER data logs backups` (Linux/macOS). |

---

## Documentation & Links

| Resource | Link |
| --- | --- |
| Repository | https://github.com/netblood/LeaxPanel-OS- |
| Issues & bugs | https://github.com/netblood/LeaxPanel-OS-/issues |
| Feature requests | https://github.com/netblood/LeaxPanel-OS-/issues/new?labels=enhancement |
| Releases | https://github.com/netblood/LeaxPanel-OS-/releases |
| Quick start | [docs/INSTALL.md](docs/INSTALL.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| API reference | [docs/API.md](docs/API.md) |
| Arabic guide | [README.ar.md](README.ar.md) |
| About the project | [AboutPanel.md](AboutPanel.md) |

---

## License

Released under the **MIT License**.

Created & organized by **Bilal Chentouf (NetBlood)** — AI assisted development.
