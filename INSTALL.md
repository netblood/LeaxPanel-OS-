# Installation Guide

## Quick Start (Recommended)

The fastest way to get LeaxPanel up and running is using the one-command installer.

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.bat | iex
```

### Windows (double-click)

Double-click `install.bat` to install dependencies and configure admin account.

---

## Manual Installation

For a manual setup, follow these steps:

### Prerequisites

- **Node.js 22+** and **npm 10+**
- No database server required (SQLite is embedded)
- No Redis or MinIO required

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/netblood/LeaxPanel-OS-.git
   cd LeaxPanel-OS-
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your settings (especially ADMIN_EMAIL and ADMIN_PASSWORD if desired)
   ```

4. **Run database migrations**

   ```bash
   npm run migrate
   # This creates the SQLite schema and tracks migrations in schema_migrations
   ```

5. **Seed the administrator and roles**

   ```bash
   npm run seed
   # This creates roles, permissions, and the administrator account
   ```

6. **Start the panel**

   ```bash
   npm start
   # or: node server.js
   # Access at: http://localhost:3000
   ```

### Post-Installation

After starting the panel:

1. Open [http://localhost:3000](http://localhost:3000/) in your browser
2. Login with the admin credentials (generated during installation or specified via .env)
3. Optionally run the **setup wizard** at http://localhost:3000/setup
4. Add your first service using the Quick Create buttons

---

## One-Command Installer Details

The installer script handles **everything automatically**:

### What the installer does:

| Step | Action |
| --- | --- |
| 1 | Verifies Node.js 22+ (and npm) |
| 2 | Opens firewall port 3000 (ufw / firewalld / netsh) |
| 3 | Generates `SESSION_SECRET`, `JWT_SECRET`, `ENCRYPTION_KEY`, admin password |
| 4 | Installs npm dependencies |
| 5 | Applies every database migration |
| 6 | Seeds roles, permissions and the administrator account |
| 7 | Runs the verification suite and prints the credentials |

The generated credentials are also written to `INSTALL_CREDENTIALS.txt` in the project root.

### Installer Environment Variables

You can customize the installation by setting these environment variables before running the installer:

| Variable | Default | Description |
| --- | --- | --- |
| `ADMIN_EMAIL` | `owner@leaxos.local` | Admin user email |
| `ADMIN_PASSWORD` | Auto-generated | Admin user password |
| `SESSION_SECRET` | Auto-generated | Session signing secret |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server bind host |

### Linux / macOS Installer

```bash
# Run directly from GitHub
curl -fsSL https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.sh | bash

# Or run from cloned repo
chmod +x install.sh
./install.sh
```

### Windows Installer

```powershell
# Run directly from GitHub
iwr -useb https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.bat | iex

# Or run from cloned repo
install.bat
```

---

## Manual Installer (Step-by-Step)

For Windows, the batch installer runs these steps:

```
[1/5] Checking Node.js runtime...
[2/5] Opening the required firewall ports...
[3/5] Running the LeaxPanel bootstrap (dependencies, migrations, seeds)...
[4/5] Verifying the installation...
[5/5] Finalising... (creating data, logs, backups directories)
```

After the installer completes:

- Start the panel: `run.bat` (or `npm start`)
- Open: http://localhost:3000
- Health check: http://localhost:3000/doctor
- Setup wizard: http://localhost:3000/setup
- Admin email: `owner@leaxos.local`
- Admin password: See `INSTALL_CREDENTIALS.txt`

---

## Database Management

LeaxPanel uses **SQLite** with WAL mode for all data storage. No external database server is required.

### SQLite Location

Default: `./data/leaxos.db`

### Migration Commands

```bash
# Create schema (equivalent to npm run migrate)
node scripts/bootstrap.js --migrate

# Seed administrator
node scripts/bootstrap.js --seed

# Full bootstrap (migrate + seed)
node scripts/bootstrap.js
```

### Backup & Restore

```bash
# Create backup
cp data/leaxos.db data/backups/leaxos-$(date +%Y%m%d).db

# Restore from backup
cp data/backups/leaxos-20240101.db data/leaxos.db
```

---

## SSL Certificate Management

LetaxPanel can automatically generate Let's Encrypt SSL certificates when running behind a reverse proxy (nginx, Caddy, etc.).

### Manual SSL Setup

1. Place your certificate files in `public/ssl/`
2. Configure nginx or your reverse proxy to use them
3. Access the panel via HTTPS

### Auto SSL (Future)

The panel will detect domain configuration and auto-request Let's Encrypt certificates.

---

## upgrading LeaxPanel

To upgrade to a newer version:

1. **Backup your data**: `cp data/leaxos.db data/backups/pre-upgrade.db`
2. **Pull the latest code**: `git pull`
3. **Run migrations**: `npm run migrate`
4. **Re-seed if needed**: `npm run seed`
5. **Restart**: `npm start` or `pm2 restart all`

---

## Docker Installation (Not Recommended)

LeaxPanel is designed to run directly on Node.js without Docker. If you must use Docker:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]
```

**Note**: Docker users will need to set up SQLite persistence, nginx reverse proxy for SSL, and manage all services manually.

---

## Troubleshooting

### Common Issues

| Issue | Solution |
| --- | --- |
| `EADDRINUSE` | Port 3000 is already in use. Kill the existing process or change PORT in .env |
| `ECONNREFUSED` | Server not running. Start with `npm start` |
| `ER_ACCESS_DENIED` | Check `.env` database path configuration |
| `CSRF_TOKEN_MISMATCH` | Clear cookies or ensure form includes csrfToken |
| `SESSION_EXPIRED` | Log in again; session store is SQLite-backed |

### Getting Help

- GitHub Issues: <https://github.com/netblood/LeaxPanel-OS-/issues>
- Doctor page: http://localhost:3000/doctor
- Health check: http://localhost:3000/health

---

## License

This project is licensed under the MIT License.

---

## Links

- Repository: <https://github.com/netblood/LeaxPanel-OS->
- Report Issues: <https://github.com/netblood/LeaxPanel-OS-/issues>
- Documentation: <https://github.com/netblood/LeaxPanel-OS-/wiki>