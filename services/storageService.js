const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(fileBuffer, filename, subdir = '') {
    const dir = path.join(this.uploadDir, subdir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, fileBuffer);
    return filePath;
  }

  async deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (err) {
      logger.error('Storage delete file error:', err.message);
    }
    return false;
  }
}

module.exports = new StorageService();
