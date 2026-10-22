# User Guide

## Getting Started with LeaxPanel

Welcome to LeaxPanel - your complete Cloud Platform Operating System. This guide will help you get started and make the most of all features.

### First Login

1. After installation, open [http://localhost:3000](http://localhost:3000/) in your browser
2. Login with your admin credentials:
   - **Email**: `owner@leaxos.local` (or your custom admin email)
   - **Password**: Generated during installation (check `INSTALL_CREDENTIALS.txt`)
3. You'll be redirected to the dashboard

### Dashboard Overview

The dashboard is your central command center. Here's what you'll see:

#### Quick Create Section (Top)

Large visible action buttons for one-click creation:

- **+ Create Website** - Deploy a new website
- **+ Create WordPress** - Install WordPress in one click
- **+ Create WooCommerce** - Set up WooCommerce store
- **+ Create NodeJS App** - Deploy a Node.js application
- **+ Create PHP App** - Deploy a PHP application
- **+ Create Telegram Bot** - Create a Telegram bot
- **+ Create Discord Bot** - Create a Discord bot
- **+ Create WhatsApp Instance** - Set up WhatsApp Business
- **+ Create AI Agent** - Deploy an AI agent
- **+ Create n8n Workflow** - Create an automation workflow
- **+ Create Database** - Create a new database
- **+ Create Domain** - Register or link a domain
- **+ Create Email** - Configure email services
- **+ Create Backup** - Create a backup plan

#### Service Cards (Middle Section)

Beautiful cards representing each service category:

- **Web Hosting**: NodeJS, PHP, WordPress, WooCommerce hosting
- **Telegram Hosting**: Bot creation and management
- **Discord Hosting**: Bot integration and management
- **WhatsApp Hosting**: Business API instances
- **N8N Hosting**: Workflow automation
- **AI Hosting**: AI agent deployment
- **Database Hosting**: Database creation and management
- **Email Hosting**: SMTP configuration
- **Storage Hosting**: File management and backups

Each card contains: **Install**, **Manage**, **Stats**, **Documentation**

#### System Overview (Left Panel)

- Total Websites
- Total Apps
- Total Bots
- Total Workflows
- Total AI Agents
- Total Domains
- Total Users
- Total Databases

#### Infrastructure Status (Right Panel)

- CPU usage
- RAM usage
- DISK usage
- BANDWIDTH
- BACKUPS status
- SECURITY SCORE

#### Visual Status Indicators

Everything has status indicators:
- **Green** - Running/Healthy
- **Yellow** - Warning
- **Red** - Offline/Error

#### Navigation Sidebar

Collapsible sidebar with these categories:

- **Overview**: Dashboard, Monitoring, Backups
- **Infrastructure**: Domains & DNS, Websites, Applications, File Manager, Storage
- **Applications**: N8N Workflows, Services
- **Bots**: Telegram, Discord, WhatsApp, All Bots
- **AI**: AI Agents, AI Providers, AI Hosting
- **Data & Services**: Databases, Email, Communication, Cloudflare
- **Business**: Service Requests, Billing, Marketplace
- **Administration**: Users, Security, White Label, Platform, Settings, Doctor

### Creating Your First Service

#### Using the Quick Create Buttons

1. Click **+ Create Website** (or any other service)
2. Follow the service wizard:
   - **Step 1**: Name your service
   - **Step 2**: Configure settings (as needed)
   - **Step 3**: Repository/Database settings (if applicable)
   - **Step 4**: Deploy
3. The service will be created and added to your dashboard

#### Using Service Wizards

All deployments use simple wizards with 4 steps:

- **Step 1**: Name
- **Step 2**: Configuration (token, repository, etc.)
- **Step 3**: Settings
- **Step 4**: Deploy

### Managing Services

#### From the Overview Page

Each service has an overview page with:

- **Status indicator** - Running/Warning/Offline
- **Uptime** - How long it's been running
- **Quick actions** - Restart, Update, Clone, Delete
- **Resource usage** - CPU, Memory, Disk stats

#### From the Service Manager

Every Website/App/Bot is manageable from UI with these tabs:

- **Overview** - Service status and statistics
- **Files** - File manager (upload, download, edit, rename, move, delete)
- **Domains** - Domain management and SSL
- **DNS** - DNS configuration
- **SSL** - SSL certificate management
- **Logs** - Access and error logs
- **Backups** - Backup creation and restoration
- **Analytics** - Usage analytics
- **Restart** - Service restart
- **Update** - Service update
- **Clone** - Service cloning
- **Delete** - Service deletion
- **Permissions** - Access control
- **Settings** - Service-specific settings

### Using the File Manager

The file manager lets you manage files without SSH:

- **Upload** - Drag and drop or select files
- **Download** - Download any file
- **Edit** - Edit text files online
- **Rename** - Rename files and folders
- **Move** - Move files between directories
- **Delete** - Delete files and folders
- **ZIP/Extract** - Create and extract ZIP archives
- **Code Editor** - Syntax-highlighted code editor
- **Multi-select** - Select multiple files for batch operations

### Setting Up Domains

1. Go to **Domains** in the sidebar
2. Click **+ Create Domain**
3. Enter your domain name
4. Configure DNS settings
5. Request SSL certificate
6. The domain will be linked to your service

### Managing SSL Certificates

LetaxPanel can automatically generate Let's Encrypt SSL certificates:

1. Ensure your domain is pointed to the server IP
2. Go to the service's **Domains** tab
3. Click **Request SSL**
4. The certificate will be generated and applied automatically

### Creating Backups

#### Automatic Backups

1. Go to **Backups** in the sidebar
2. Enable **Automatic Backups**
3. Set frequency (daily, weekly, monthly)
4. Specify what to include (database, files, both)

#### Manual Backups

1. Go to the service's **Backups** tab
2. Click **Create Backup**
3. Add a description/label
4. The backup will be saved to `backups/` directory

#### Restoring from Backup

1. Go to **Backups** → **Backup History**
2. Find the backup you want to restore
3. Click **Restore**
4. Confirm the restoration

### Viewing Logs

#### Access Logs

Shows incoming requests to your services:

- Filter by date, status, service
- View request details (method, path, IP, user-agent)
- Search and export

#### Error Logs

Shows errors and exceptions:

- Filter by severity (info, warning, error, critical)
- View stack traces
- Search and export

#### Bot Message Logs

For Telegram/Discord bots:

- View sent and received messages
- Filter by date, user, channel
- Export conversation history

### User Profile & Settings

#### Changing Your Password

1. Go to **Settings → Profile**
2. Enter your current password
3. Enter new password twice
4. Save changes

#### Two-Factor Authentication

LeaxPanel supports TOTP two-factor authentication:

1. Go to **Settings → Two-Factor**
2. Scan the QR code with your authenticator app
3. Save the recovery codes
4. Enable 2FA

#### API Keys

Create and manage API keys for programmatic access:

1. Go to **API Keys** in the sidebar
2. Click **+ Create API Key**
3. Set permissions (which modules the key can access)
4. Copy the key (it won't be shown again)
5. Name and describe the key

### Using the Setup Wizard

The setup wizard guides you through initial configuration:

1. Access at http://localhost:3000/setup
2. **Step 1**: Detect OS and installed software
3. **Step 2**: Detect Node.js, PM2, Nginx, Firewall
4. **Step 3**: Detect available ports
5. **Step 4**: Generate SSL certificate
6. **Step 5**: Generate configuration files
7. **Step 6**: Create folders and set up monitoring
8. **Step 7**: Set up backups
9. **Step 8**: Configure permissions
10. **Done** - Your panel is fully configured

### Troubleshooting Common Issues

| Issue | Solution |
| --- | --- |
| `Cannot login` | Check credentials, clear cookies, verify email format |
| `Port 3000 already in use` | Kill existing process, change PORT in .env |
| `404 Page not found` | Verify route, check URL spelling, run doctor |
| `CSRF token mismatch` | Clear cookies, ensure form includes csrfToken |
| `Database connection failed` | Check .env DB settings, run migrations |
| `Service not starting` | Check logs, verify configuration, restart service |
| `SSL certificate not issued` | Ensure domain points to server, wait for DNS propagation |
| `Slow performance` | Check resource usage, optimize queries, enable caching |

### Getting Help

- **Doctor page**: http://localhost:3000/doctor - Full health check with auto-fix
- **API documentation**: http://localhost:3000/api-doc - Interactive API docs
- **GitHub Issues**: https://github.com/netblood/LeaxPanel-OS-/issues
- **Community**: Join the discussion forum

### Keyboard Shortcuts

- **Ctrl + K** - Global search (focus search bar)
- **Ctrl + /** - Open command palette
- **Esc** - Close modals and dropdowns
- **Tab** - Navigate between elements

### Mobile Usage

LeaxPanel is fully responsive and works on mobile devices:

- **Sidebar** - Collapsible, auto-hides on mobile
- **Topbar** - Always accessible with menu button
- **Forms** - Touch-friendly, larger tap targets
- **Tables** - Horizontal scroll on small screens
- **Modals** - Full-screen on mobile

---

## Quick Reference Cheat Sheet

| Action | Shortcut / Location |
| --- | --- |
| **Login** | http://localhost:3000, use admin credentials |
| **Quick Create** | Top section of dashboard |
| **Service Manager** | Click any service card or overview |
| **File Manager** | Service → Files tab |
| **Domain Management** | Service → Domains tab |
| **SSL Management** | Service → SSL tab or Domains page |
| **Backup Creation** | Service → Backups tab or Dashboard → Backups |
| **Log Viewing** | Service → Logs tab or Dashboard → Monitoring |
| **Setup Wizard** | http://localhost:3000/setup |
| **Two-Factor Auth** | Settings → Two-Factor |
| **API Keys** | Sidebar → API Keys |
| **Doctor Check** | http://localhost:3000/doctor |
| **Global Search** | Ctrl + K anywhere |
| **Sidebar Toggle** | Click brand or Ctrl + Shift + S |

---

## Feedback

We'd love to hear your feedback! Please visit:
- **GitHub Discussions**: https://github.com/netblood/LeaxPanel-OS-/
- **Report Issues**: https://github.com/netblood/LeaxPanel-OS-/issues
- **Feature Requests**: Open an issue with your suggestion

Thank you for using LeaxPanel!