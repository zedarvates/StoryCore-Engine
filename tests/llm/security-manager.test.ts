import { SecurityManager } from '../../src/llm/security-manager';

describe('SecurityManager', () => {
  const key = '12345678901234567890123456789012'; // 32 bytes
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = new SecurityManager(key);
  });

  it('should encrypt and decrypt correctly', () => {
    const plainText = 'my secret api key';
    const encrypted = securityManager.encrypt(plainText);
    const decrypted = securityManager.decrypt(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('should produce different encrypted outputs for same input', () => {
    const plainText = 'test';
    const encrypted1 = securityManager.encrypt(plainText);
    const encrypted2 = securityManager.encrypt(plainText);
    expect(encrypted1).not.toBe(encrypted2);
  });



  it('should throw error for invalid encrypted format', () => {
    expect(() => securityManager.decrypt('invalid')).toThrow('Invalid encrypted text format');
  });
});