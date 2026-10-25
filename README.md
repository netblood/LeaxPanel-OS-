# LeaxPanel

LeaxPanel is a neon-dark operator surface for multi-instance n8n workflow management. The current slice is a frontend foundation for the Automation Center, built so real API and WebSocket data can be connected without redesigning the operator experience.

## Run locally

```bash
npm install
copy .env.example .env
npm start
```

The production build is generated with `npm run build`.

The server contract can be checked with `npm run check:server`, tested with `npm run test:server`, and started with `npm run server`. It refuses to boot until the required environment contract is present and PostgreSQL/Redis endpoints are reachable.

Startup helpers are included for Windows and Linux:

- Windows development: `start.bat` or `start.ps1`.
- Linux/macOS development: `./start.sh`.
- Docker production: `docker-start.bat`, `docker-start.ps1`, or `./docker-start.sh`.
- Docker shutdown: `docker-stop.bat`, `docker-stop.ps1`, or `./docker-stop.sh`.

Docker launchers require a real `.env` file and exit with instructions when it is missing.

`npm start` is the local preview launcher: if the existing `.env` has blank required values, it generates temporary credentials in memory, prints the admin login, and starts the authenticated UI/API preview without pretending PostgreSQL or Redis are healthy. Docker production startup remains strict and requires real configured services.

## Current product slice

- Automation Center dashboard with workflow health, execution, and instance resource summaries.
- Search and status/favorites filtering.
- Grid, list, kanban, and tree workflow views.
- Workflow detail drawer with performance metrics, recent executions, and a graph preview.
- New workflow modal for templates, scratch builds, and n8n JSON imports.
- Dark blue / cyan / purple visual language with lightweight inline SVG icons.
- Environment contract documented in `.env.example`; no credentials are hardcoded in the client.

## Lightweight Docker architecture

The checked-in default stack is intentionally small:

- `panel`
- `postgres`
- `redis`
- `traefik`

The root [docker-compose.yml](./docker-compose.yml) adds health checks, memory caps, persistent volumes, a shared network, and Traefik ACME routing. Monitoring stacks are not included. Project-specific templates live in `docker/compose-templates/` and only add an optional Redis/PostgreSQL companion when the selected profile requires it.

The lightweight [LeaxAgent](./agent/index.mjs) contract is available with `npm run agent`. It requires `LEAX_AGENT_NODE_ID`, `LEAX_AGENT_TOKEN`, and `LEAX_AGENT_CORE_URL`, exposes authenticated capabilities and metrics endpoints, and is designed to run on remote Ubuntu compute nodes.

The [Docker Center](./src/App.tsx) presents the same deployment model in the product UI: Minimal mode, compose previews, Node.js/Python/n8n templates, resource visibility, and one-click deploy flow. The current deploy flow is a frontend interaction; it does not yet execute Docker commands or provision domains.

The dependency-free API exposes live/readiness health checks, env-backed admin login sessions, authenticated compose generation/validation, Docker container-volume-network inventory, resource stats, and a safe Docker Compose deployment adapter. If Docker is unavailable, deployment returns a typed `DOCKER_NOT_AVAILABLE` response instead of silently falling back or bypassing validation.

Operational scripts live under [deploy/](./deploy/): Ubuntu installation, repair, update, backup, uninstall, and systemd unit files. Reference docs live under [docs/](./docs/).

## Deliberate next layer

This repository now has a UI foundation plus a dependency-free API boundary for env validation, admin sessions, health checks, compose generation, and Docker Compose orchestration. Production database-backed persistence, n8n instance adapters, WebSocket execution updates, full RBAC, filesystem project storage, backups, advanced resource controls, domain provisioning, and release test automation still need implementation. The UI and Compose artifacts should not be treated as proof those capabilities are complete.
