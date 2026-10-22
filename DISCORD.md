# Discord.md

# Discord Bot Integration

LeaxPanel provides integration with Discord for bot creation and server management.

## Discord Bot Configuration

LeaxPanel simplifies Discord bot deployment with a step-by-step wizard.

### Creating a Discord Bot

Follow the **Create Discord Bot** wizard:

1. **Step 1: Name** - Give your bot a name (e.g., "LeaxPanel Support Bot")
2. **Step 2: Token** - Enter your Discord bot token (from Discord Developer Portal)
3. **Step 3: Repository** - Optionally link a GitHub repository for code deployment
4. **Step 4: Deploy** - Create and start the bot

### Discord Developer Portal Setup

To create a Discord bot:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new Application
3. Navigate to "Bot" section and click "Add Bot"
4. Copy the **Bot Token** - this is your Discord token
5. (Optional) Set up Bot Permissions and Intents
6. (Optional) Set up Command Slash Commands
7. (Optional) Configure Gateway Intents (Message Content, Server Members, etc.)

### Webhook Configuration

LeaxPanel can receive Discord webhook events:

- Message create events
- Message update events  
- Message delete events
- Member join/leave events
- Role create/delete events

Configure the webhook URL in the Discord bot settings within LeaxPanel.

## Bot Management

### Dashboard Features

- **Bot Status** - Green (running), Yellow (warning), Red (offline), Gray (unknown)
- **Command Center** - Execute bot commands from the UI
- **Message Logs** - View sent/received messages
- **Server Management** - Manage Discord servers the bot is connected to
- **Permission Settings** - Configure bot permissions per server

### Bot Commands

LeaxPanel provides these built-in bot commands:

- `/status` - Show bot status and uptime
- `/stats` - Show server statistics
- `/restart` - Restart the bot process
- `/logs` - View recent bot activity
- `/reload` - Reload bot commands and configuration

### Permissions

Configure bot permissions:

- **Administrator** - Full control (use with caution)
- **Manage Roles** - Manage server roles
- **Manage Channels** - Manage text/voice channels
- **Send Messages** - Post messages in channels
- **Embed Links** - Post embeds
- **Attach Files** - Upload files

## Webhook Events

LeaxPanel can listen to Discord webhook events:

| Event | Description |
| --- | --- |
| `message.create` | New message received |
| `message.update` | Message edited |
| `message.delete` | Message deleted |
| `guild.member_join` | Member joined server |
| `guild.member_leave` | Member left server |
| `role.create` | New role created |
| `role.delete` | Role deleted |

Configure which events to listen to in the bot settings.

## Security

- Bot tokens are encrypted at rest with AES-256-GCM
- Webhook signatures are validated
- All interactions logged to `audit_logs`
- Rate limiting per bot
- Token rotation supported

## Troubleshooting

| Issue | Solution |
| --- | --- |
| `Bot not connecting` | Verify token, check intents, ensure bot is added to server |
| `Commands not responding` | Check command registration, verify bot permissions |
| `Webhook not receiving` | Verify webhook URL, check firewall, validate signature |
| `Rate limited by Discord` | Reduce request frequency, wait for reset |
| `Token expired` | Generate new token in Discord Developer Portal |

## API Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/discord/bots` | List Discord bots |
| `POST /api/discord/bots` | Create new bot |
| `GET /api/discord/bots/:id` | Get bot details |
| `PUT /api/discord/bots/:id` | Update bot |
| `POST /api/discord/bots/:id/connect` | Connect bot |
| `POST /api/discord/bots/:id/disconnect` | Disconnect bot |
| `POST /api/discord/bots/:id/send-message` | Send message |
| `GET /api/discord/messages` | List messages |

See [API.md](API.md) for full documentation.