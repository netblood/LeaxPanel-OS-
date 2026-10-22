const pool = require('../config/database');
const logger = require('../utils/logger');

class DiscordService {
  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || null;
  }

  async listBots() {
    try {
      const result = await pool.query('SELECT * FROM discord_bots ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('Discord list error:', err.message);
      return [];
    }
  }

  async sendWebhook(message, options = {}) {
    if (!this.webhookUrl) {
      logger.warn('Discord webhook URL not configured');
      return false;
    }

    try {
      const axios = require('axios');
      const payload = {
        content: message,
        username: options.username || 'LEAXOS',
        avatar_url: options.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png',
        embeds: options.embeds || [],
        ...options
      };

      await axios.post(this.webhookUrl, payload);
      logger.info('Discord webhook sent successfully');
      return true;
    } catch (err) {
      logger.error('Discord webhook error:', err.message);
      return false;
    }
  }

  async logEvent(eventType, details, severity = 'info') {
    const embed = {
      title: `LEAXOS - ${eventType}`,
      description: typeof details === 'string' ? details : JSON.stringify(details, null, 2),
      color: this.getSeverityColor(severity),
      timestamp: new Date().toISOString(),
      footer: { text: 'LEAXOS Cloud Operating System' }
    };

    return this.sendWebhook('', { embeds: [embed] });
  }

  async logAuthEvent(user, action, ip) {
    return this.logEvent('Authentication Event', {
      user: user?.email || 'Unknown',
      action,
      ip: ip || 'Unknown',
      timestamp: new Date().toISOString()
    }, 'info');
  }

  async logError(error, context = {}) {
    return this.logEvent('Error', {
      message: error.message || error,
      stack: error.stack,
      context
    }, 'error');
  }

  async logSecurityEvent(event, details) {
    return this.logEvent('Security Event', {
      event,
      ...details
    }, 'warning');
  }

  async logSystemEvent(event, details) {
    return this.logEvent('System Event', {
      event,
      ...details
    }, 'info');
  }

  getSeverityColor(severity) {
    const colors = {
      info: 0x00d4ff,
      warning: 0xffaa00,
      error: 0xff3366,
      success: 0x00ff88
    };
    return colors[severity] || colors.info;
  }
}

module.exports = new DiscordService();
