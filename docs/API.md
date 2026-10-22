# REST API

Every LeaxPanel resource is exposed over JSON under `/api`.

---

## Authentication

Two options — use whichever fits:

**1. Session cookie** — the browser already has one after signing in.

**2. API key** — send it in the `X-API-Key` header, or as a Bearer token:

```http
X-API-Key: lx_2f9c1b...
```

```http
Authorization: Bearer lx_2f9c1b...
```

Create keys in the panel under **API Keys** (`/apikeys`). The raw key is displayed exactly once and
stored only as a SHA-256 hash.

Unauthenticated requests return `401`:

```json
{ "error": "Authentication required", "hint": "Send an X-API-Key header" }
```

---

## Endpoints

### System

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness probe |
| `GET` | `/api/stats` | Counts for every core table |
| `GET` | `/api/resources` | List of available resource names |

### Resources

Every resource below supports the same five operations:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/:resource` | List — supports `?limit=` (max 200) and `?offset=` |
| `GET` | `/api/:resource/:id` | Fetch one record |
| `POST` | `/api/:resource` | Create |
| `PUT` | `/api/:resource/:id` | Update |
| `DELETE` | `/api/:resource/:id` | Delete |

| Resource | Table | Writable fields |
| --- | --- | --- |
| `users` | `users` | `name`, `email`, `role`, `is_active` |
| `services` | `services` | `name`, `type`, `status`, `config` |
| `apps` | `apps` | `name`, `type`, `runtime`, `version`, `domain`, `root_path`, `entrypoint`, `start_command`, `install_command`, `build_command`, `port`, `status`, `env_vars`, `config` |
| `websites` | `websites` | `name`, `domain`, `platform`, `status`, `config` |
| `databases` | `databases` | `name`, `type`, `host`, `port`, `username`, `status` |
| `domains` | `domains` | `name`, `status`, `dns_records` |
| `bots` | `bots` | `name`, `type`, `status`, `config` |
| `workflows` | `n8n_workflows` | `name`, `status`, `workflow_data` |
| `agents` | `ai_agents` | `name`, `type`, `model`, `status`, `config` |
| `backups` | `backups` | `name`, `type`, `status` |
| `invoices` | `invoices` | `invoice_number`, `customer_name`, `amount`, `currency`, `status` |
| `requests` | `requests` | `subject`, `description`, `status`, `priority` |
| `notifications` | `notifications` | `title`, `message`, `type`, `is_read` |
| `dns_records` | `dns_records` | `domain_id`, `type`, `name`, `value`, `ttl`, `priority`, `proxied` |
| `ssl_certificates` | `ssl_certificates` | `domain_id`, `provider`, `status`, `issuer`, `serial`, `valid_from`, `valid_to`, `auto_renew` |
| `webhooks` | `webhooks` | `name`, `target_url`, `method`, `events`, `secret`, `status` |

---

## Response shapes

**List**

```json
{
  "data": [ { "id": 1, "name": "my-app", "type": "nodejs" } ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

**Single / create / update**

```json
{ "data": { "id": 1, "name": "my-app", "type": "nodejs" } }
```

**Delete**

```json
{ "deleted": true, "id": 1 }
```

**Errors**

```json
{ "error": "Record not found" }
```

```json
{ "error": "Unknown resource \"widgets\"" }
```

```json
{ "error": "No writable fields supplied", "allowed": ["name", "type"] }
```

---

## Examples

```bash
# Health
curl http://localhost:3000/api/health

# Statistics
curl -H "X-API-Key: lx_..." http://localhost:3000/api/stats

# List applications
curl -H "X-API-Key: lx_..." "http://localhost:3000/api/apps?limit=10&offset=0"

# Create an application
curl -X POST \
     -H "X-API-Key: lx_..." \
     -H "Content-Type: application/json" \
     -d '{"name":"api","type":"nodejs","port":3001,"status":"running"}' \
     http://localhost:3000/api/apps

# Update its status
curl -X PUT \
     -H "X-API-Key: lx_..." \
     -H "Content-Type: application/json" \
     -d '{"status":"stopped"}' \
     http://localhost:3000/api/apps/1

# Delete
curl -X DELETE -H "X-API-Key: lx_..." http://localhost:3000/api/apps/1
```

---

## Rate limits

| Scope | Limit | Window |
| --- | --- | --- |
| `/api/*` | 120 requests | 1 minute |
| Write operations | 60 requests | 1 minute |
| Authentication | 10 attempts | 15 minutes (successful requests skipped) |
| Everything else | 300 requests | 15 minutes |

Limits are configurable with `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`.

---

## Usage analytics

Every request made with an API key is written to `api_usage_log`:

| Column | Meaning |
| --- | --- |
| `api_key_id` | Which key was used |
| `user_id` | The owning user |
| `method` / `endpoint` | The request |
| `status_code` | The response code |
| `duration_ms` | Server-side duration |
| `ip_address` | Caller IP |

View the log in the panel at `/apikeys/usage`.
