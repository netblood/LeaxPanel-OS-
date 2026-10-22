# About LeaxPanel(os)

**Host Anything. Manage Everything. Deploy Anywhere.**

---

## The idea

Most "hosting panels" are a thin web UI over a shell script. LeaxPanel(os) started from the opposite
direction: what would it take to run a **complete cloud platform** — websites, applications, bots,
databases, automations, AI providers — from a single dashboard, with **no SSH required**?

The answer is a Node.js monolith that owns the whole lifecycle: creation, configuration, deployment,
monitoring, backup, billing and security, all inside the browser.

---

## What makes it different

| | Traditional panel | LeaxPanel(os) |
| --- | --- | --- |
| Setup | Compile, configure, daemon, SSH | One command |
| Database | External PostgreSQL/MySQL server | Embedded SQLite (WAL) |
| Session store | Redis (often required) | SQLite-backed store |
| File storage | S3/MinIO | Local filesystem |
| Deployment | SSH + rsync + supervisor | PM2 commands from the UI |
| Configuration | Edit files over SSH | Forms in the dashboard |
| Dependencies | Docker, Redis, PostgreSQL, Nginx, PM2 | Node.js only |
| Build step | Webpack/Vite/npm run build | None |

Everything runs with `npm install` and `npm start`.

---

## Principles

1. **No external services.** If a feature needs Postgres, Redis or MinIO to work at all, the feature
   is redesigned instead. SQLite, the filesystem and an in-process cache cover the same ground.
2. **No build step.** EJS renders on the server; the browser gets plain HTML and vanilla JavaScript.
   No bundler, no transpiler, no framework lock-in.
3. **No SSH required.** Every operation a human would do over SSH has a screen in the dashboard.
4. **Boring, predictable stack.** Node, Express, EJS, SQLite. Nothing exotic to operate.
5. **Everything is inspectable.** `audit_logs` records every action, the Doctor explains the health
   of the installation, and the REST API exposes the same data.

---

## Design language

The interface targets modern cPanel / Plesk / Hostinger / CloudPanel / Coolify:

- Dark and light themes built on CSS custom properties
- Glassmorphism app shell with a collapsible sidebar and a sticky topbar
- Soft shadows, rounded cards, professional data tables, modern modals
- Loading skeletons, toast notifications, smooth motion
- Responsive down to mobile, with an off-canvas navigation drawer
- Syntax-highlighted code editor in the file manager

No terminal aesthetic. No crowded navbar. No dated table layouts.

---

## Modules

| Group | Modules |
| --- | --- |
| Overview | Dashboard, Monitoring, Backups |
| Infrastructure | Domains & DNS, Websites, Applications, File Manager, Storage |
| Applications | N8N Workflows, Services |
| Bots | Telegram, Discord, WhatsApp, All Bots |
| AI | AI Agents, AI Providers, AI Hosting |
| Data & Services | Databases, Email, Communication, Cloudflare |
| Business | Service Requests, Billing, Marketplace |
| Administration | Users, Security, White Label, Platform, Settings, LeaxPanel Doctor |

Plus **Setup Wizard**, **Notifications**, **API Keys**, **My Profile**, **Roles & Permissions**,
**Audit Log** and the public **Home** page.

---

## Security

- bcrypt password hashing (cost 12)
- SQLite-backed sessions (`httpOnly`, `sameSite=lax`, `secure` in production)
- `csurf` protection on every non-API form
- Rate limiting on general traffic, the API, writes and authentication
- `helmet` with a strict Content Security Policy
- AES-256-GCM encryption for stored provider keys and tokens
- SHA-256 hashed API keys, scoped and usage-logged
- TOTP two-factor authentication for every account
- Audit trail for every authenticated request, optionally mirrored to Discord

---

## Project facts

| | |
| --- | --- |
| Language | JavaScript (Node.js 22+), ES2022 |
| Framework | Express.js 4 |
| Templates | EJS 3 + express-ejs-layouts |
| Database | SQLite via better-sqlite3 |
| Realtime | Socket.IO 4 |
| Migrations | 36 numbered SQL files, tracked in `schema_migrations` |
| Roles | 9 |
| Permissions | 45 |
| Dependencies | Zero runtime services beyond Node.js |

---

## Credits

Created & organized by **Bilal Chentouf (NetBlood)** — <https://github.com/netblood>

Built with AI-assisted development. The design, architecture and code are open source under the MIT license.

- Repository: <https://github.com/netblood/LeaxPanel-OS->
- Issues: <https://github.com/netblood/LeaxPanel-OS-/issues>
