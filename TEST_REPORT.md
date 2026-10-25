# LeaxPanel local QA report

Date: 2026-10-25
Environment: Windows local preview via `npm start`

## Executed checks

| Area | Result | Evidence |
| --- | --- | --- |
| Build | PASS | `npm run build` completed successfully. |
| TypeScript | PASS | Build completed with no TypeScript diagnostics. |
| Server unit/integration tests | PASS | 16 tests passed with `npm run test:server`. |
| Shell script syntax | PASS | `bash -n` passed for installer, repair, update, backup, and uninstall scripts. |
| Panel startup | PASS | `npm start` launched API on `127.0.0.1:8787` and UI on `127.0.0.1:5173`. |
| Browser access | PASS | UI returned HTTP 200 and rendered in the browser. |
| Owner login | PASS | Env-backed admin login, signed session, and logout were exercised. |
| API live health | PASS | `GET /api/health/live` returned 200. |
| API readiness | NOT TESTED | Preview intentionally has no PostgreSQL/Redis services; `/api/health/ready` returned 503. |
| Templates API | PASS | `GET /api/templates` returned Node.js, Python, and n8n templates. |
| Authenticated compose generation | PASS | Unauthorized request returned 401; authenticated request returned generated YAML. |
| Docker inventory/deployment | NOT TESTED | Docker is not installed; inventory and deploy endpoints correctly returned 503. |
| Owner navigation | PASS | Users, Regions, Nodes, Workspaces, Launch Templates, Domains, and Security pages rendered. |
| User isolation UI | PASS | User view hid platform-control navigation and showed assigned services only. |
| Application workspace | PASS | Console, Files, Databases, Domains, Backups, Schedules, Environment, Resources, Activity, Deployments, and Startup tabs rendered. |
| Real users/roles | NOT TESTED | No persistent user database or multiple-account test environment is configured. |
| Real deployments/hosting | NOT TESTED | No Docker runtime or remote compute node is available. |
| Console commands/streaming | NOT TESTED | Current console is a UI fixture. |
| File operations/editor | NOT TESTED | Current file manager is a UI fixture; no upload/storage/Monaco backend is connected. |
| PostgreSQL/MySQL/Redis databases | NOT TESTED | No database services are running locally. |
| Domains/DNS/SSL | NOT TESTED | Requires DNS provider and public domain. |
| Backups/restore | NOT TESTED | Requires real service data and storage. |
| n8n workflow execution | NOT TESTED | Requires a running n8n instance. |
| Installer on fresh Ubuntu | NOT TESTED | No fresh Ubuntu host is available. |
| Update/repair recovery | NOT TESTED | No deployed Compose environment is available to break and recover. |

## Critical blockers

The following mandatory acceptance requirements remain unverified and therefore cannot be marked as passing:

- Real PostgreSQL and Redis readiness.
- Multiple persistent users and server-enforced permissions.
- Real Node.js, Python, n8n, and Docker deployments.
- Real hosting, restarts, environment variables, and resource enforcement.
- Console command execution and log streaming.
- File upload/download/edit/archive operations.
- Database creation, connectivity, backup, and restore.
- Domain routing, DNS, and SSL.
- Backup deletion and service restoration.
- Fresh Ubuntu installation, update, and repair recovery.

No completion claim is made while these critical tests remain NOT TESTED.
