import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export class SecurityManager {
  private algorithm = 'aes-256-cbc';
  private key: Buffer;

  constructor(encryptionKey?: string) {
    const password = encryptionKey || process.env.LLM_ENCRYPTION_KEY || 'default-key-32-chars-long!!!!!';
    this.key = scryptSync(password, 'salt', 32);
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}