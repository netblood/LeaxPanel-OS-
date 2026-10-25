# LeaxPanel architecture

LeaxPanel is a modern application hosting control plane. Its core objects are Regions, Compute Nodes, Users, Workspaces, Services, Launch Templates, Databases, Domains, and Backups.

LeaxPanel Core owns identity, permissions, service metadata, deployment intent, and audit records. PostgreSQL stores durable metadata; Redis is used for sessions, queues, cache, and realtime state. Traefik is the edge router. Docker runs application services.

LeaxAgent runs on remote Ubuntu nodes. It exposes a token-authenticated control surface for container actions, file operations, console streaming, metrics, backups, SSL tasks, and network tasks. WebSockets are the intended realtime transport for console and metrics streams.
