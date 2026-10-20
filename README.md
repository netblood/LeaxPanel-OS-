# LeaxPanel(os) - Complete Cloud Operating System

LeaxPanel(os) is a complete cloud operating system platform built with pure JavaScript (Node.js 22+, Express, PostgreSQL, Redis, EJS, HTMX, Socket.IO). No build step, no TypeScript, no frontend frameworks.

## Features

- **Enterprise Auth**: RBAC/PBAC, 2FA/TOTP, sessions, JWT
- **AI Platform**: AI agents, model hosting, marketplace
- **Website & Bot Hosting**: Discord, Telegram, WhatsApp bots; website deployment
- **Communication Centers**: Multi-channel messaging
- **N8N Integration**: Workflow automation
- **Database Center**: Managed database instances
- **Email Center**: SMTP email accounts and campaigns
- **Domain Center**: Domain management with Cloudflare integration
- **Storage Center**: File buckets and object storage
- **Cloudflare Integration**: DNS, zones, CDN
- **AI Hosting**: Self-hosted AI models
- **Marketplace**: Apps, themes, plugins
- **Monitoring**: Real-time system metrics
- **Auto-Healing**: Automatic service recovery
- **Backups**: Scheduled and on-demand backups
- **Security**: Audit logs, security events, rate limiting
- **File Manager**: Web-based file management
- **White-Label**: Custom branding and domains
- **Multi-Tenancy**: Isolated customer environments
- **Billing**: Stripe and PayPal integration
- **Request Center**: Support ticket system

## Tech Stack

- Node.js 22+
- Express.js
- PostgreSQL
- Redis
- EJS (templating)
- HTMX (frontend interactivity)
- Socket.IO (real-time)
- Docker, PM2, Nginx, Certbot (deployment)

## Quick Start

### One-command install (from GitHub)

Download and run the installer directly from GitHub in a single command:

**Windows (PowerShell, run as Administrator):**
```powershell
iwr -useb https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.ps1 | iex
```

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.sh | bash
```

Then start the server and open http://localhost:3000 in your browser:

**Windows:**
```powershell
.\run.bat
# or
node server.js
```

**Linux / macOS:**
```bash
chmod +x run.sh
./run.sh
# or
node server.js
```

### Auto-Generated Passwords

All installers (`install.ps1`, `install.sh`, `install.bat`) automatically generate strong random passwords for every service and write them into `.env` for you:

- **PostgreSQL** (`DB_PASSWORD`) — random 16-char password
- **Redis** (`REDIS_PASSWORD`) — random 16-char password
- **Minio** (`MINIO_PASSWORD`) — random 16-char password
- **Session Secret** (`SESSION_SECRET`) — random 32-char secret
- **JWT Secret** (`JWT_SECRET`) — random 32-char secret
- **Encryption Key** (`ENCRYPTION_KEY`) — random 32-char key

The installer also creates `docker-compose.override.yml` to wire these passwords into Docker, starts PostgreSQL/Redis/Minio via Docker, runs migrations and seeds, and prints all credentials at the end. **Save the displayed credentials — they will not be shown again.**

### Windows (manual)

1. Double-click `install.bat` to install dependencies
2. Double-click `run.bat` to start the server
3. Open http://localhost:3000 in your browser

### Linux / macOS (manual)

```bash
chmod +x install.sh run.sh
./install.sh   # Install dependencies
./run.sh       # Start the server
```

Then open http://localhost:3000 in your browser.

## Manual Installation

Clone the repository, then:

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your settings

# Start the server
node server.js
```

Repository: https://github.com/netblood/LeaxPanel-OS-

## Database Setup (Production)

LeaxPanel(os) requires PostgreSQL and Redis for full functionality.

```bash
# Using Docker Compose
docker-compose up -d

# Run migrations
npm run migrate

# Run seeds
npm run seed
```

## Default Admin Account

After running seeds:
- Email: `owner@leaxos.local`
- Password: Set during seeding or first login

## Project Structure

```
LeaxPanel(os)/
├── server.js              # Main Express application entry point
├── package.json           # Dependencies and scripts
├── .env.example           # Environment configuration template
├── .env                   # Environment configuration (created from .env.example)
├── docker-compose.yml     # Docker services (PostgreSQL, Redis)
├── Dockerfile             # Container image definition
├── ecosystem.config.js    # PM2 process configuration
├── nginx.conf             # Nginx reverse proxy config
├── install.bat            # Windows installer
├── run.bat                # Windows runner
├── install.sh             # Linux/macOS installer
├── run.sh                 # Linux/macOS runner
├── README.md              # This file (English)
├── README.ar.md           # Arabic documentation
├── config/                # Database, Redis, Socket.IO config
├── migrations/            # Database migration files (001-030)
├── seeds/                 # Seed data files
├── routes/                # All 24 feature area routes
├── services/              # All 30 service files
├── middleware/            # Auth, RBAC, audit, validation
├── utils/                 # Logger, encryption, helpers
├── views/                 # EJS templates (layout, partials, 24 feature areas)
├── public/                # CSS, JS, images
│   ├── css/style.css      # Cyberpunk dark theme
│   └── js/main.js         # Socket.IO client
├── uploads/               # File uploads
├── backups/               # Backup storage
├── logs/                  # Application logs
└── utils/                 # Utility modules
```

## Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the production server |
| `npm run dev` | Start the development server |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Run seed data |
| `npm run pm2` | Start with PM2 process manager |

## Environment Variables

Key environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `leaxos` |
| `DB_USER` | Database user | `leaxos` |
| `DB_PASSWORD` | Database password | Auto-generated (installer) |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `SESSION_SECRET` | Session signing secret | Auto-generated (installer) |
| `JWT_SECRET` | JWT signing secret | Auto-generated (installer) |
| `ENCRYPTION_KEY` | AES-256-GCM encryption key (32 chars) | Auto-generated (installer) |

## Deployment

### Docker

```bash
docker-compose up -d
```

### PM2 (Production)

```bash
npm run pm2
```

### Nginx Reverse Proxy

See `nginx.conf` for a production-ready Nginx configuration.

## Troubleshooting

### Server won't start

1. Make sure Node.js 22+ is installed: `node --version`
2. Make sure dependencies are installed: `npm install`
3. Check that `.env` exists and is configured correctly
4. Check PostgreSQL and Redis are running (for full functionality)

### Database connection errors

1. Ensure PostgreSQL is running on the configured host/port
2. Verify `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `.env`
3. Run migrations: `npm run migrate`
4. Run seeds: `npm run seed`

### Redis connection errors

1. Ensure Redis is running on port 6379
2. Verify `REDIS_URL` in `.env`
3. The server will run in degraded mode without Redis (sessions use memory store)

## License

MIT License

## Support

For issues and feature requests, please open an issue on the project repository.

---

**LeaxPanel(os)** - Your complete cloud operating system platform.