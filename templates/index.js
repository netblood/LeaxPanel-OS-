/* ==========================================================================
   LeaxPanel Templates - Starter templates for all service types
   ========================================================================== */

// HTML Hello World
const htmlStarter = {
  name: 'HTML Hello World',
  description: 'Minimal static HTML page with modern styling',
  files: {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hello World</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #1e293b; border-radius: 16px; padding: 3rem; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid #334155; }
    h1 { font-size: 3rem; font-weight: 800; background: linear-gradient(135deg, #7c5cff, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem; }
    p { color: #94a3b8; font-size: 1.25rem; margin-bottom: 2rem; }
    .badge { display: inline-block; background: rgba(124, 92, 255, 0.2); color: #7c5cff; padding: 0.5rem 1rem; border-radius: 999px; font-size: 0.875rem; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello World!</h1>
    <p>Your static site is running on LeaxPanel</p>
    <span class="badge">Deployed via Service Hub</span>
  </div>
</body>
</html>`,
    'package.json': JSON.stringify({ name: 'html-starter', version: '1.0.0', private: true, scripts: { start: 'npx serve -s . -l 3000' }, dependencies: {}, devDependencies: { serve: '^14.2.0' } }, null, 2),
    'README.md': '# HTML Hello World\n\nMinimal static HTML starter template.\n\n## Deploy\n\nClick "Deploy" in the Service Hub to create this site.'
  }
};

// NodeJS Hello World
const nodejsStarter = {
  name: 'NodeJS Hello World',
  description: 'Basic HTTP server with Express-like routing',
  files: {
    'server.js': `const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(\`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeJS Hello World</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #1e293b; border-radius: 16px; padding: 3rem; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid #334155; }
    h1 { font-size: 3rem; font-weight: 800; background: linear-gradient(135deg, #7c5cff, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem; }
    .badge { display: inline-block; background: rgba(124, 92, 255, 0.2); color: #7c5cff; padding: 0.5rem 1rem; border-radius: 999px; font-size: 0.875rem; font-weight: 500; margin: 0.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>NodeJS Server</h1>
        <p>Running on port \${PORT}</p>
    <span class="badge">LeaxPanel</span>
        <span class="badge">Node \${process.version}</span>
  </div>
</body>
</html>\`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on http://0.0.0.0:\${PORT}\`);
});`,
    'package.json': JSON.stringify({ name: 'nodejs-starter', version: '1.0.0', private: true, main: 'server.js', scripts: { start: 'node server.js', dev: 'node server.js' }, engines: { node: '>=22.0.0' } }, null, 2),
    '.env.example': 'PORT=3000\nNODE_ENV=production',
    'README.md': '# NodeJS Hello World\n\nBasic HTTP server starter.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.'
  }
};

// Express Starter
const expressStarter = {
  name: 'Express Starter',
  description: 'Express.js with health check, logging, and error handling',
  files: {
    'server.js': `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(\`\${req.method} \${req.path} \${res.statusCode} \${Date.now() - start}ms\`);
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Express on LeaxPanel', version: '1.0.0' });
});

app.get('/api/hello', (req, res) => {
  res.json({ greeting: 'Hello from Express!', server: 'LeaxPanel' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Express server running on http://0.0.0.0:\${PORT}\`);
});`,
    'package.json': JSON.stringify({ name: 'express-starter', version: '1.0.0', private: true, main: 'server.js', scripts: { start: 'node server.js', dev: 'node server.js' }, dependencies: { express: '^4.18.2' }, engines: { node: '>=22.0.0' } }, null, 2),
    '.env.example': 'PORT=3000\nNODE_ENV=production',
    'README.md': '# Express Starter\n\nExpress.js with health check, logging, and error handling.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.'
  }
};

// Discord Bot Starter
const discordBotStarter = {
  name: 'Discord Bot Starter',
  description: 'Discord.js bot with slash commands and event handling',
  files: {
    'bot.js': `const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('hello').setDescription('Says hello'),
  new SlashCommandBuilder().setName('server').setDescription('Server info'),
  new SlashCommandBuilder().setName('user').setDescription('User info')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(\`Logged in as \${client.user.tag}\`);
  
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash commands registered!');
  } catch (err) {
    console.error('Command registration failed:', err);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName } = interaction;
  
  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  } else if (commandName === 'hello') {
    await interaction.reply(\`Hello, \${interaction.user}! \`);
  } else if (commandName === 'server') {
    await interaction.reply(\`Server: \${interaction.guild.name} (\${interaction.guild.memberCount} members)\`);
  } else if (commandName === 'user') {
    await interaction.reply(\`You are \${interaction.user.tag}\`);
  }
});

client.on(Events.MessageCreate, message => {
  if (message.author.bot) return;
  if (message.content === '!ping') message.reply('Pong!');
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);`,
    'package.json': JSON.stringify({ name: 'discord-bot-starter', version: '1.0.0', private: true, main: 'bot.js', scripts: { start: 'node bot.js', dev: 'node bot.js' }, dependencies: { 'discord.js': '^14.14.1', dotenv: '^16.3.1' }, engines: { node: '>=22.0.0' } }, null, 2),
    '.env.example': 'DISCORD_BOT_TOKEN=your_bot_token_here',
    'README.md': '# Discord Bot Starter\n\nDiscord.js bot with slash commands.\n\n## Setup\n\n1. Create a bot at https://discord.com/developers/applications\n2. Copy the token to .env\n3. Deploy via Service Hub'
  }
};

// Telegram Bot Starter
const telegramBotStarter = {
  name: 'Telegram Bot Starter',
  description: 'Telegraf bot with commands and middleware',
  files: {
    'bot.js': `const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Middleware
bot.use((ctx, next) => {
  console.log(\`[\${new Date().toISOString()}] \${ctx.from?.username}: \${ctx.message?.text || ctx.callbackQuery?.data}\`);
  return next();
});

// Commands
bot.start((ctx) => ctx.reply('Welcome to LeaxPanel Bot!\nUse /help to see commands.'));
bot.help((ctx) => ctx.reply('Commands:\n/start - Start bot\n/help - This message\n/ping - Pong\n/hello - Greeting'));

bot.command('ping', (ctx) => ctx.reply('Pong!'));
bot.command('hello', (ctx) => ctx.reply(\`Hello, \${ctx.from.first_name}! \`));

// Inline keyboard
bot.command('menu', (ctx) => {
  ctx.reply('Choose an option:', Markup.inlineKeyboard([
    Markup.button.callback('Status', 'status'),
    Markup.button.callback('Info', 'info'),
    Markup.button.url('LeaxPanel', 'https://leaxpanel.com')
  ]));
});

bot.action('status', (ctx) => ctx.answerCbQuery('Bot is running!'));
bot.action('info', (ctx) => ctx.answerCbQuery('Telegram Bot on LeaxPanel'));

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('An error occurred. Please try again.');
});

bot.launch().then(() => console.log('Telegram bot started')).catch(console.error);

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));`,

    'package.json': JSON.stringify({ name: 'telegram-bot-starter', version: '1.0.0', private: true, main: 'bot.js', scripts: { start: 'node bot.js', dev: 'node bot.js' }, dependencies: { telegraf: '^4.15.3', dotenv: '^16.3.1' }, engines: { node: '>=22.0.0' } }, null, 2),
    '.env.example': 'TELEGRAM_BOT_TOKEN=your_bot_token_here',
    'README.md': '# Telegram Bot Starter\n\nTelegraf bot with commands and inline keyboards.\n\n## Setup\n\n1. Create bot via @BotFather\n2. Copy token to .env\n3. Deploy via Service Hub'
  }
};

// WhatsApp Starter
const whatsappStarter = {
  name: 'WhatsApp Starter',
  description: 'WhatsApp bot using Baileys',
  files: {
    'bot.js': `const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
require('dotenv').config();

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth'));
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ['LeaxPanel Bot', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed:', shouldReconnect ? 'reconnecting' : 'logged out');
      if (shouldReconnect) connect();
    } else if (connection === 'open') {
      console.log('WhatsApp connected!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const jid = msg.key.remoteJid;
      
      if (text === '!ping') {
        await sock.sendMessage(jid, { text: 'Pong!' });
      } else if (text === '!hello') {
        await sock.sendMessage(jid, { text: 'Hello! This is LeaxPanel WhatsApp Bot' });
      } else if (text.startsWith('!echo ')) {
        await sock.sendMessage(jid, { text: text.slice(6) });
      }
    }
  });
}

connect().catch(console.error);`,
    'package.json': JSON.stringify({ name: 'whatsapp-starter', version: '1.0.0', private: true, main: 'bot.js', scripts: { start: 'node bot.js' }, dependencies: { '@whiskeysockets/baileys': '^6.7.0', '@hapi/boom': '^10.0.1', dotenv: '^16.3.1' }, engines: { node: '>=22.0.0' } }, null, 2),
    '.env.example': '# No token needed - scan QR code on first run',
    'README.md': '# WhatsApp Starter\n\nWhatsApp bot using Baileys (multi-device).\n\n## Deploy\n\nClick "Deploy" in the Service Hub, then scan QR code in logs.'
  }
};

// N8N Starter
const n8nStarter = {
  name: 'N8N Starter',
  description: 'N8N workflow automation with example workflow',
  files: {
    'docker-compose.yml': `version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "\${PORT:-5678}:5678"
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
      - WEBHOOK_URL=\${WEBHOOK_URL}
      - GENERIC_TIMEZONE=\${TIMEZONE:-UTC}
    volumes:
      - ./n8n_data:/home/node/.n8n
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5678/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3`,
    '.env.example': 'PORT=5678\nWEBHOOK_URL=https://your-domain.com\nTIMEZONE=UTC\nN8N_BASIC_AUTH_ACTIVE=true\nN8N_BASIC_AUTH_USER=admin\nN8N_BASIC_AUTH_PASSWORD=changeme',
    'README.md': '# N8N Starter\n\nN8N workflow automation.\n\n## Deploy\n\nClick "Deploy" in the Service Hub. Access at your domain on port 5678.'
  }
};

// AI Agent Starter
const aiAgentStarter = {
  name: 'AI Agent Starter',
  description: 'Generic AI agent with OpenAI-compatible API',
  files: {
    'agent.js': `const { OpenAI } = require('openai');
require('dotenv').config();

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1'
});

const SYSTEM_PROMPT = process.env.AI_SYSTEM_PROMPT || 'You are a helpful AI assistant running on LeaxPanel.';

async function chat(messages) {
  const response = await client.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    temperature: Number(process.env.AI_TEMPERATURE) || 0.7,
    max_tokens: Number(process.env.AI_MAX_TOKENS) || 2000
  });
  return response.choices[0].message.content;
}

// Example usage
async function main() {
  const response = await chat([{ role: 'user', content: 'Hello! What can you do?' }]);
  console.log('AI:', response);
}

main().catch(console.error);

module.exports = { chat, client };`,

    'package.json': JSON.stringify({ name: 'ai-agent-starter', version: '1.0.0', private: true, main: 'agent.js', scripts: { start: 'node agent.js', dev: 'node agent.js' }, dependencies: { openai: '^4.28.0', dotenv: '^16.3.1' }, engines: { node: '>=22.0.0' } }, null, 2),
    '.env.example': 'AI_API_KEY=your_api_key\nAI_BASE_URL=https://api.openai.com/v1\nAI_MODEL=gpt-4o-mini\nAI_SYSTEM_PROMPT=You are a helpful AI assistant.\nAI_TEMPERATURE=0.7\nAI_MAX_TOKENS=2000',
    'README.md': '# AI Agent Starter\n\nGeneric AI agent with OpenAI-compatible API.\n\n## Providers Supported\n\n- OpenAI\n- Anthropic (Claude)\n- Google (Gemini)\n- OpenRouter\n- DeepSeek\n- Ollama (local)\n- Any OpenAI-compatible endpoint\n\n## Deploy\n\nClick "Deploy" in the Service Hub, configure your API key in .env'
  }
};

// WordPress Starter
const wordpressStarter = {
  name: 'WordPress Starter',
  description: 'WordPress with Docker, auto SSL, and optimized config',
  files: {
    'docker-compose.yml': `version: '3.8'
services:
  wordpress:
    image: wordpress:latest
    ports:
      - "\${PORT:-80}:80"
    environment:
      - WORDPRESS_DB_HOST=db:3306
      - WORDPRESS_DB_NAME=\${DB_NAME:-wordpress}
      - WORDPRESS_DB_USER=\${DB_USER:-wp_user}
      - WORDPRESS_DB_PASSWORD=\${DB_PASSWORD}
      - WORDPRESS_DEBUG=0
    volumes:
      - ./wp-content:/var/www/html/wp-content
      - ./uploads.ini:/usr/local/etc/php/conf.d/uploads.ini
    depends_on:
      - db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health.php"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: mysql:8.0
    environment:
      - MYSQL_DATABASE=\${DB_NAME:-wordpress}
      - MYSQL_USER=\${DB_USER:-wp_user}
      - MYSQL_PASSWORD=\${DB_PASSWORD}
      - MYSQL_ROOT_PASSWORD=\${DB_ROOT_PASSWORD}
    volumes:
      - ./db_data:/var/lib/mysql
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5`,
    'uploads.ini': 'file_uploads = On\nmemory_limit = 256M\nupload_max_filesize = 100M\npost_max_size = 100M\nmax_execution_time = 300',
    '.env.example': 'PORT=80\nDB_NAME=wordpress\nDB_USER=wp_user\nDB_PASSWORD=changeme\nDB_ROOT_PASSWORD=changeme_root',
    'README.md': '# WordPress Starter\n\nWordPress with MySQL via Docker.\n\n## Deploy\n\nClick "Deploy" in the Service Hub. Auto-provisions database and SSL.'
  }
};

// WooCommerce Starter
const woocommerceStarter = {
  name: 'WooCommerce Starter',
  description: 'WordPress + WooCommerce pre-configured for e-commerce',
  files: {
    'docker-compose.yml': `version: '3.8'
services:
  wordpress:
    image: wordpress:latest
    ports:
      - "\${PORT:-80}:80"
    environment:
      - WORDPRESS_DB_HOST=db:3306
      - WORDPRESS_DB_NAME=\${DB_NAME:-woocommerce}
      - WORDPRESS_DB_USER=\${DB_USER:-wc_user}
      - WORDPRESS_DB_PASSWORD=\${DB_PASSWORD}
      - WORDPRESS_DEBUG=0
    volumes:
      - ./wp-content:/var/www/html/wp-content
      - ./uploads.ini:/usr/local/etc/php/conf.d/uploads.ini
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_DATABASE=\${DB_NAME:-woocommerce}
      - MYSQL_USER=\${DB_USER:-wc_user}
      - MYSQL_PASSWORD=\${DB_PASSWORD}
      - MYSQL_ROOT_PASSWORD=\${DB_ROOT_PASSWORD}
    volumes:
      - ./db_data:/var/lib/mysql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - ./redis_data:/data
    restart: unless-stopped`,
    'uploads.ini': 'file_uploads = On\nmemory_limit = 512M\nupload_max_filesize = 200M\npost_max_size = 200M\nmax_execution_time = 600',
    '.env.example': 'PORT=80\nDB_NAME=woocommerce\nDB_USER=wc_user\nDB_PASSWORD=changeme\nDB_ROOT_PASSWORD=changeme_root',
    'README.md': '# WooCommerce Starter\n\nWordPress + WooCommerce + Redis for object caching.\n\n## Deploy\n\nClick "Deploy" in the Service Hub. Includes Redis for performance.'
  }
};

// PostgreSQL Starter
const postgresqlStarter = {
  name: 'PostgreSQL Starter',
  description: 'PostgreSQL 16 with auto-backup and monitoring',
  files: {
    'docker-compose.yml': `version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "\${PORT:-5432}:5432"
    environment:
      - POSTGRES_DB=\${DB_NAME:-app}
      - POSTGRES_USER=\${DB_USER:-app_user}
      - POSTGRES_PASSWORD=\${DB_PASSWORD}
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER:-app_user} -d \${DB_NAME:-app}"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: >
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=256MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200`,
    'init.sql': `-- Initialization script
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create read-only user
-- CREATE ROLE readonly WITH LOGIN PASSWORD 'changeme_readonly';
-- GRANT CONNECT ON DATABASE app TO readonly;
-- GRANT USAGE ON SCHEMA public TO readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;`,
    '.env.example': 'PORT=5432\nDB_NAME=app\nDB_USER=app_user\nDB_PASSWORD=changeme',
    'README.md': '# PostgreSQL Starter\n\nPostgreSQL 16 with optimized configuration.\n\n## Deploy\n\nClick "Deploy" in the Service Hub. Includes uuid-ossp and pg_trgm extensions.'
  }
};

// MySQL Starter
const mysqlStarter = {
  name: 'MySQL Starter',
  description: 'MySQL 8.0 with optimized configuration',
  files: {
    'docker-compose.yml': `version: '3.8'
services:
  mysql:
    image: mysql:8.0
    ports:
      - "\${PORT:-3306}:3306"
    environment:
      - MYSQL_DATABASE=\${DB_NAME:-app}
      - MYSQL_USER=\${DB_USER:-app_user}
      - MYSQL_PASSWORD=\${DB_PASSWORD}
      - MYSQL_ROOT_PASSWORD=\${DB_ROOT_PASSWORD}
    volumes:
      - ./mysql_data:/var/lib/mysql
      - ./my.cnf:/etc/mysql/conf.d/custom.cnf
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5`,
    'my.cnf': '[mysqld]\ninnodb_buffer_pool_size = 256M\ninnodb_log_file_size = 64M\ninnodb_flush_log_at_trx_commit = 2\ninnodb_flush_method = O_DIRECT\nquery_cache_type = 0\nquery_cache_size = 0\ndefault_authentication_plugin = mysql_native_password\ncharacter_set_server = utf8mb4\ncollation_server = utf8mb4_unicode_ci',
    '.env.example': 'PORT=3306\nDB_NAME=app\nDB_USER=app_user\nDB_PASSWORD=changeme\nDB_ROOT_PASSWORD=changeme_root',
    'README.md': '# MySQL Starter\n\nMySQL 8.0 with optimized InnoDB configuration.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.'
  }
};

// MongoDB Starter
const mongodbStarter = {
  name: 'MongoDB Starter',
  description: 'MongoDB 7 with replica set ready config',
  files: {
    'docker-compose.yml': `version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    ports:
      - "\${PORT:-27017}:27017"
    environment:
      - MONGO_INITDB_DATABASE=\${DB_NAME:-app}
      - MONGO_INITDB_ROOT_USERNAME=\${DB_ROOT_USER:-admin}
      - MONGO_INITDB_ROOT_PASSWORD=\${DB_ROOT_PASSWORD}
    volumes:
      - ./mongo_data:/data/db
      - ./init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    restart: unless-stopped
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/\${DB_NAME:-app} --quiet
      interval: 10s
      timeout: 5s
      retries: 5
    command: --wiredTigerCacheSizeGB 1 --bind_ip_all`,
    'init-mongo.js': `// Create application user
db = db.getSiblingDB('\${DB_NAME:-app}');
db.createUser({
  user: '\${DB_USER:-app_user}',
  pwd: '\${DB_PASSWORD}',
  roles: [{ role: 'readWrite', db: '\${DB_NAME:-app}' }]
});

// Create indexes for common patterns
// db.collection.createIndex({ "field": 1 });
// db.collection.createIndex({ "createdAt": -1 });`,
    '.env.example': 'PORT=27017\nDB_NAME=app\nDB_ROOT_USER=admin\nDB_ROOT_PASSWORD=changeme_root\nDB_USER=app_user\nDB_PASSWORD=changeme',
    'README.md': '# MongoDB Starter\n\nMongoDB 7 with replica set ready configuration.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.'
  }
};

// Redis Starter
const redisStarter = {
  name: 'Redis Starter',
  description: 'Redis 7 with persistence and optimized config',
  files: {
    'docker-compose.yml': `version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "\${PORT:-6379}:6379"
    volumes:
      - ./redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5`,
    'redis.conf': 'bind 0.0.0.0\nport 6379\nappendonly yes\nappendfsync everysec\nmaxmemory 512mb\nmaxmemory-policy allkeys-lru\nsave 900 1\nsave 300 10\nsave 60 10000\ntcp-keepalive 300\ntimeout 0\ntcp-backlog 511',
    '.env.example': 'PORT=6379',
    'README.md': '# Redis Starter\n\nRedis 7 with AOF persistence and optimized memory policy.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.'
  }
};

// SQLite Starter
const sqliteStarter = {
  name: 'SQLite Starter',
  description: 'Lightweight embedded database for small apps',
  files: {
    'database.js': `const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// Initialize schema
db.exec(\`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    data TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  
  CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
\`);

function getUser(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function createUser(email, name) {
  const stmt = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
  const result = stmt.run(email, name);
  return { id: result.lastInsertRowid, email, name };
}

function getItems(userId) {
  return db.prepare('SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

function createItem(userId, title, data) {
  const stmt = db.prepare('INSERT INTO items (user_id, title, data) VALUES (?, ?, ?)');
  const result = stmt.run(userId, title, JSON.stringify(data));
  return { id: result.lastInsertRowid, userId, title, data };
}

module.exports = { db, getUser, createUser, getItems, createItem };`,

    'package.json': JSON.stringify({ name: 'sqlite-starter', version: '1.0.0', private: true, main: 'database.js', scripts: { start: 'node database.js', test: 'node -e "require(\"./database.js\")"' }, dependencies: { 'better-sqlite3': '^11.0.0' }, engines: { node: '>=22.0.0' } }, null, 2),
    '.env.example': 'DB_PATH=./data.db',
    'README.md': '# SQLite Starter\n\nLightweight embedded database using better-sqlite3.\n\n## Deploy\n\nClick "Deploy" in the Service Hub. No separate database server needed.'
  }
};

// Email Starter
const emailStarter = {
  name: 'Email Starter',
  description: 'Postfix + Dovecot mail server with Roundcube webmail',
  files: {
    'docker-compose.yml': `version: '3.8'
services:
  mail:
    image: mailserver/docker-mailserver:latest
    ports:
      - "25:25"
      - "143:143"
      - "587:587"
      - "993:993"
      - "4190:4190"
    environment:
      - ENABLE_POP3=0
      - ENABLE_SIEVE=1
      - SPOOF_PROTECTION=1
      - ENABLE_FAIL2BAN=1
      - SSL_TYPE=letsencrypt
      - SSL_DOMAIN=\${DOMAIN}
      - POSTMASTER_ADDRESS=postmaster@\${DOMAIN}
    volumes:
      - ./mail_data:/var/mail
      - ./mail_state:/var/mail-state
      - ./config:/tmp/docker-mailserver
      - /etc/letsencrypt:/etc/letsencrypt:ro
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_RESOURCE
      - CAP_DAC_OVERRIDE

  webmail:
    image: roundcube/roundcubemail:latest
    ports:
      - "\${WEBMAIL_PORT:-8080}:80"
    environment:
      - ROUNDCUBE_DEFAULT_HOST=mail
      - ROUNDCUBE_DEFAULT_PORT=143
      - ROUNDCUBE_SMTP_SERVER=mail
      - ROUNDCUBE_SMTP_PORT=587
      - ROUNDCUBE_SMTP_USER=%u
      - ROUNDCUBE_SMTP_PASS=%p
    depends_on:
      - mail
    restart: unless-stopped`,
    '.env.example': 'DOMAIN=example.com\nWEBMAIL_PORT=8080',
    'README.md': '# Email Starter\n\nFull mail server with Postfix, Dovecot, and Roundcube webmail.\n\n## Deploy\n\nClick "Deploy" in the Service Hub. Requires domain with MX records.'
  }
};

// Storage Starter
const storageStarter = {
  name: 'Storage Starter',
  description: 'MinIO S3-compatible object storage',
  files: {
    'docker-compose.yml': `version: '3.8'
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "\${PORT:-9000}:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=\${MINIO_ROOT_USER:-minioadmin}
      - MINIO_ROOT_PASSWORD=\${MINIO_ROOT_PASSWORD}
    volumes:
      - ./minio_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3`,
    '.env.example': 'PORT=9000\nMINIO_ROOT_USER=minioadmin\nMINIO_ROOT_PASSWORD=changeme123',
    'README.md': '# Storage Starter\n\nMinIO S3-compatible object storage with web console.\n\n## Deploy\n\nClick "Deploy" in the Service Hub. Access console at port 9001.'
  }
};

// Domain Starter
const domainStarter = {
  name: 'Domain Starter',
  description: 'Domain configuration with Cloudflare DNS and auto SSL',
  files: {
    'README.md': '# Domain Starter\n\nDomain management with Cloudflare integration.\n\n## Features\n\n- Auto DNS provisioning\n- Auto SSL via Let\'s Encrypt / Cloudflare\n- Subdomain management\n- DNS record templates\n\n## Deploy\n\nClick "Deploy" in the Service Hub. Requires Cloudflare API token configured.'
  }
};

// Module exports
module.exports = {
  'html-starter': htmlStarter,
  'nodejs-starter': nodejsStarter,
  'express-starter': expressStarter,
  'nestjs-starter': { name: 'NestJS Starter', description: 'NestJS with TypeScript, Swagger, and validation', files: { 'README.md': '# NestJS Starter\n\nNestJS starter with TypeScript.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'fastify-starter': { name: 'Fastify Starter', description: 'Fastify with TypeScript and plugins', files: { 'README.md': '# Fastify Starter\n\nFastify starter.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'go-starter': { name: 'Go Starter', description: 'Golang HTTP server with Chi router', files: { 'README.md': '# Go Starter\n\nGolang starter.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'python-starter': { name: 'Python Starter', description: 'FastAPI with Uvicorn and Pydantic', files: { 'README.md': '# Python Starter\n\nFastAPI starter.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'docker-starter': { name: 'Docker Starter', description: 'Generic Docker container deployment', files: { 'README.md': '# Docker Starter\n\nDocker container deployment.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'telegram-bot-starter': telegramBotStarter,
  'discord-bot-starter': discordBotStarter,
  'whatsapp-starter': whatsappStarter,
  'slack-bot-starter': { name: 'Slack Bot Starter', description: 'Slack Bolt app with Socket Mode', files: { 'README.md': '# Slack Bot Starter\n\nSlack Bolt starter.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'support-agent-starter': { name: 'Support Agent Starter', description: 'AI customer support agent', files: { 'README.md': '# Support Agent Starter\n\nAI support agent.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'devops-agent-starter': { name: 'DevOps Agent Starter', description: 'AI infrastructure automation agent', files: { 'README.md': '# DevOps Agent Starter\n\nAI DevOps agent.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'security-agent-starter': { name: 'Security Agent Starter', description: 'AI threat detection agent', files: { 'README.md': '# Security Agent Starter\n\nAI security agent.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'marketing-agent-starter': { name: 'Marketing Agent Starter', description: 'AI content and campaign agent', files: { 'README.md': '# Marketing Agent Starter\n\nAI marketing agent.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'sales-agent-starter': { name: 'Sales Agent Starter', description: 'AI lead qualification agent', files: { 'README.md': '# Sales Agent Starter\n\nAI sales agent.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'coding-agent-starter': { name: 'Coding Agent Starter', description: 'AI code generation and review agent', files: { 'README.md': '# Coding Agent Starter\n\nAI coding agent.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'n8n-starter': n8nStarter,
  'postgresql-starter': postgresqlStarter,
  'mysql-starter': mysqlStarter,
  'mongodb-starter': mongodbStarter,
  'redis-starter': redisStarter,
  'sqlite-starter': sqliteStarter,
  'email-starter': emailStarter,
  'storage-starter': storageStarter,
  'domain-starter': domainStarter,
  'wordpress-starter': wordpressStarter,
  'woocommerce-starter': woocommerceStarter,
  'php-starter': { name: 'PHP Starter', description: 'PHP 8.3 with Apache/Nginx', files: { 'README.md': '# PHP Starter\n\nPHP starter.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } },
  'laravel-starter': { name: 'Laravel Starter', description: 'Laravel 11 with Octane and Horizon', files: { 'README.md': '# Laravel Starter\n\nLaravel starter.\n\n## Deploy\n\nClick "Deploy" in the Service Hub.' } }
};

// Helper to get template by name
function getTemplate(name) {
  return module.exports[name];
}

// List all templates
function listTemplates() {
  return Object.entries(module.exports).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description
  }));
}

module.exports.getTemplate = getTemplate;
module.exports.listTemplates = listTemplates;
