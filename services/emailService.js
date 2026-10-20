const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      });
      logger.info('Email service initialized');
    } catch (err) {
      logger.warn('Email service init failed:', err.message);
    }
  }

  async sendMail(options) {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }
    return await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@leaxos.local',
      ...options
    });
  }
}

module.exports = new EmailService();
