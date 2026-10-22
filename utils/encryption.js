const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Derive a stable 32-byte key from ENCRYPTION_KEY.
 * Accepts a 64-char hex string or an arbitrary passphrase (hashed with SHA-256).
 */
function deriveKey() {
  const raw = process.env.ENCRYPTION_KEY || 'leaxos-default-encryption-key';
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256').update(String(raw)).digest();
}

const KEY = deriveKey();

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  const parts = String(encryptedText).split(':');
  if (parts.length !== 3) return encryptedText;
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Wrong key or corrupted payload - return the original rather than crashing
    return encryptedText;
  }
}

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = { encrypt, decrypt, hashToken };
