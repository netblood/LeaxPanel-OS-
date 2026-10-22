# n8n Workflow Automation

LeaxPanel includes native n8n workflow automation for connecting services and automating tasks.

## What is n8n?

n8n is a workflow automation tool that lets you connect different services, automate repetitive tasks, and create complex business processes without coding.

## n8n in LeaxPanel

LeaxPanel provides:

- **Built-in n8n instance** - No external deployment needed
- **Visual workflow editor** - Drag-and-drop interface
- **Pre-configured integrations** - LeaxPanel services, APIs, databases
- **Scheduler** - Automatic workflow execution
- **Webhook endpoints** - Trigger workflows from external services

## Getting Started

### Access n8n

Navigate to **n8n** in the dashboard to access the workflow editor.

### Default Credentials

- **URL**: http://localhost:3000/n8n
- **Email**: admin@leaxos.local (set during installation)
- **Password**: Generated during installation (see INSTALL_CREDENTIALS.txt)

### First Login

1. Click "I don't have an account" 
2. Use the admin credentials from installation
3. Create your first workflow

## Creating Workflows

### Basic Concepts

- **Nodes** - Individual operations (HTTP, Database, n8n built-in)
- **Connections** - Data flow between nodes
- **Triggers** - Start events (cron, webhook, manual)
- **Outputs** - Final destination (response, database, file)

### Pre-configured n8n Integrations

LeaxPanel comes with these n8n nodes pre-configured:

| Integration | Purpose |
| --- | --- |
| **LeaxPanel API** | Manage panel objects from workflows |
| **Telegram** | Send/receive messages |
| **Discord** | Send/receive messages |
| **WhatsApp** | Send/receive messages |
| **Email** | Send emails via SMTP |
| **File System** | Read/write files |
| **Database** | SQLite/MySQL/PostgreSQL queries |
| **HTTP Request** | Generic API calls |
| **Schedule** | Cron-based triggers |
| **IF/ELSE** | Conditional logic |

### Example Workflows

#### 1. Daily Backup Workflow

```
Schedule (cron: 02:00) → LeaxPanel Backup → Email (daily-report@domain.com)
```

#### 2. New User Welcome

```
Webhook → Create User → Send Telegram Welcome → Add to Database
```

#### 3. Server Health Monitor

```
Schedule (every 5 min) → LeaxPanel Doctor → If issues → Send Discord Alert
```

## n8n API Integration

### Via LeaxPanel API

```bash
# List workflows
curl http://localhost:3000/api/n8n/workflows

# Create workflow
curl -X POST http://localhost:3000/api/n8n/workflows \
  -H "Authorization: Bearer API_KEY" \
  -d '{"name": "Backup", "nodes": [...]}'

# Execute workflow
curl -X POST http://localhost:3000/api/n8n/workflows/:id/run
```

### Via n8n HTTP Request Node

Use these base URLs:

- **LeaxPanel API**: `http://localhost:3000/api/`
- **n8n Editor**: `http://localhost:3000/n8n`

## Security

- n8n runs within the LeaxPanel trusted environment
- API key authentication for external access
- Workflow execution logged to `audit_logs`
- No external credentials stored without encryption
- Rate limiting on workflow execution

## Troubleshooting

| Issue | Solution |
| --- | --- |
| `Workflow not executing` | Check node connections, verify credentials |
| `Execution timeout` | Increase timeout or optimize workflow |
| `API authentication failed` | Verify API key, check permissions |
| `Database connection failed` | Check database configuration, firewall |
| `Webhook not receiving` | Verify webhook URL, check node settings |

## Best Practices

1. **Test workflows** in development before deploying
2. **Use error handlers** for graceful failure
3. **Monitor execution** via the LeaxPanel dashboard
4. **Keep n8n updated** via the panel's update system
5. **Backup workflows** before major panel upgrades

---

## API Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/n8n/workflows` | List all workflows |
| `POST /api/n8n/workflows` | Create new workflow |
| `GET /api/n8n/workflows/:id` | Get workflow details |
| `PUT /api/n8n/workflows/:id` | Update workflow |
| `DELETE /api/n8n/workflows/:id` | Delete workflow |
| `POST /api/n8n/workflows/:id/run` | Execute workflow |
| `GET /api/n8n/executions` | List execution history |

See [API.md](API.md) for full documentation.