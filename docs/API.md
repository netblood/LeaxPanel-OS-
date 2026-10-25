# API boundary

Public: `GET /api/health/live`, `GET /api/health/ready`, `POST /api/auth/login`, `GET /api/templates`.

Authenticated: `GET /api/auth/session`, `POST /api/auth/logout`, `POST /api/compose/generate`, `POST /api/compose/validate`, `POST /api/deploy`, `GET /api/runtime/containers`, `GET /api/runtime/volumes`, `GET /api/runtime/networks`, and `GET /api/runtime/stats`.

The Docker adapter returns a typed `DOCKER_NOT_AVAILABLE` response when the host does not have a usable Docker runtime.
