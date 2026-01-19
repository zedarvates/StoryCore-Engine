import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createCipher, createDecipher } from 'crypto';
import { ProjectConfiguration, GlobalConfiguration, ValidationRule, ValidationResult, ValidationError } from './configurationTypes';

const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'change-this-in-production-key-32chars';
// const IV = '1234567890123456'; // 16 bytes for AES-256-CBC (not used with createCipher)

export class ConfigurationStore {
  private encrypt(text: string): string {
    const cipher = createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(encrypted: string): string {
    const decipher = createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private processSensitiveFields(obj: any, action: 'encrypt' | 'decrypt'): void {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.processSensitiveFields(obj[key], action);
      } else if ((key === 'apiKey' || key === 'password') && typeof obj[key] === 'string') {
        if (action === 'encrypt') {
          obj[key] = this.encrypt(obj[key]);
        } else {
          obj[key] = this.decrypt(obj[key]);
        }
      }
    }
  }

  async saveProjectConfig(projectId: string, config: ProjectConfiguration): Promise<void> {
    const toSave = {
      schema_version: '1.0',
      ...config
    };
    this.processSensitiveFields(toSave, 'encrypt');
    const dir = path.join(process.cwd(), 'projects', projectId);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, 'config.json');
    await fs.writeFile(filePath, JSON.stringify(toSave, null, 2), 'utf8');
  }

  async loadProjectConfig(projectId: string): Promise<ProjectConfiguration | null> {
    const filePath = path.join(process.cwd(), 'projects', projectId, 'config.json');
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed.schema_version !== '1.0') {
        throw new Error('Unsupported schema version');
      }
      delete parsed.schema_version;
      this.processSensitiveFields(parsed, 'decrypt');
      return parsed as ProjectConfiguration;
    } catch {
      return null;
    }
  }

  async saveGlobalConfig(config: GlobalConfiguration): Promise<void> {
    const toSave = {
      schema_version: '1.0',
      ...config
    };
    this.processSensitiveFields(toSave, 'encrypt');
    const dir = path.join(os.homedir(), '.storycore');
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, 'global-config.json');
    await fs.writeFile(filePath, JSON.stringify(toSave, null, 2), 'utf8');
  }

  async loadGlobalConfig(): Promise<GlobalConfiguration | null> {
    const filePath = path.join(os.homedir(), '.storycore', 'global-config.json');
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed.schema_version !== '1.0') {
        throw new Error('Unsupported schema version');
      }
      delete parsed.schema_version;
      this.processSensitiveFields(parsed, 'decrypt');
      return parsed as GlobalConfiguration;
    } catch {
      return null;
    }
  }

  // Validation functions
  validateURL(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  validateRequired(value: any): boolean {
    return value !== undefined && value !== null && value !== '';
  }

  validateNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value);
  }

  validateString(value: any): boolean {
    return typeof value === 'string';
  }

  validateBoolean(value: any): boolean {
    return typeof value === 'boolean';
  }

  validateConfig(config: any, rules: ValidationRule[]): ValidationResult {
    const errors: ValidationError[] = [];
    for (const rule of rules) {
      const value = this.getNestedValue(config, rule.field);
      if (!rule.validator(value)) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage,
          severity: 'error'
        });
      }
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }
}