# Security

- Credentials are sourced from environment configuration; no default admin password is shipped.
- Session cookies are HttpOnly, SameSite, signed with `COOKIE_SECRET`, and expire after 12 hours.
- Compose generation validates project names, hostnames, memory limits, and ports.
- Docker commands use argument arrays and never invoke a shell.
- Owner and user views are separate product surfaces; production authorization must be enforced by the API for every resource.
- Production startup requires valid environment values and reachable PostgreSQL/Redis endpoints.
