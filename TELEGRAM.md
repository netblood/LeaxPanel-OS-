# Telegram.md

# Telegram Bot Integration

LeaxPanel provides integration with Telegram Bot API for bot creation and management.

## Telegram Bot Configuration

LeaxPanel simplifies Telegram bot deployment with a step-by-step wizard.

### Creating a Telegram Bot

Follow the **Create Telegram Bot** wizard:

1. **Step 1: Name** - Give your bot a name (e.g., "LeaxPanel Bot")
2. **Step 2: Token** - Enter your Telegram bot token (from @BotFather)
3. **Step 3: Repository** - Optionally link a GitHub repository for code deployment
4. **Step 4: Deploy** - Create and start the bot

### BotFather Setup

To create a Telegram bot:

1. Talk to [@BotFather](https://t.me/BotFather) on Telegram
2. Use the `/newbot` command
3. Choose a bot name (visible to users)
4. Choose a bot username (must end with "bot")
5. Copy the **Bot Token** - this is your Telegram token
6. (Optional) Set up `/commands` (/start, /help, /status, etc.)
7. (Optional) Set up webhook URL for LeaxPanel

### Webhook Configuration

LeaxPanel can receive Telegram webhook updates:

- Message text messages
- Photo, Document, Voice messages
- Callback queries (inline keyboards)
- Channel posts
- Group chat events

Configure the webhook URL in the Telegram bot settings within LeaxPanel.

## Bot Management

### Dashboard Features

- **Bot Status** - Green (running), Yellow (warning), Red (offline), Gray (unknown)
- **Command Center** - Execute bot commands from the UI
- **Message Logs** - View sent/received messages
- **Bot Settings** - Configure commands, responses, and behavior
- **Statistics** - Track message counts, user engagement

### Bot Commands

LeaxPanel provides these built-in bot commands:

- `/start` - Initialize bot connection
- `/status` - Show bot status and uptime
- `/stats` - Show bot statistics
- `/restart` - Restart the bot process
- `/logs` - View recent bot activity
- `/help` - Show available commands
- `/broadcast` - Send message to all users (admin only)

### User Management

- Track bot users and chat IDs
- Set user preferences and tags
- Manage banned users
- View user engagement history

### Inline keyboards

Create inline keyboards for bot responses:

- Buttons with callback data
- URL buttons (link to external sites)
- Dynamic buttons based on data

## Security

- Bot tokens are encrypted at rest with AES-256-GCM
- All interactions logged to `audit_logs`
- Rate limiting per bot
- Token rotation supported
- No user data stored longer than 30 days without consent

## Troubleshooting

| Issue | Solution |
| --- | --- |
| `Bot not connecting` | Verify token, talk to @BotFather, check webhook URL |
| `Commands not responding` | Check command registration, verify bot is active |
| `Webhook not receiving` | Verify webhook URL, check firewall, validate update origin |
| `Polling failed` | Switch to webhook mode or check network connectivity |
| `Flood wait` | Reduce request frequency, wait for Telegram to reset |

## API Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/telegram/bots` | List Telegram bots |
| `POST /api/telegram/bots` | Create new bot |
| `GET /api/telegram/bots/:id` | Get bot details |
| `PUT /api/telegram/bots/:id` | Update bot |
| `POST /api/telegram/bots/:id/connect` | Connect bot |
| `POST /api/telegram/bots/:id/disconnect` | Disconnect bot |
| `POST /api/telegram/bots/:id/send-message` | Send message |
| `GET /api/telegram/messages` | List messages |

See [API.md](API.md) for full documentation.