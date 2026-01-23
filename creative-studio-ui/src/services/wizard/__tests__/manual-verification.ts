/**
 * Manual Verification Script
 * 
 * This script demonstrates that the wizard service infrastructure works correctly.
 * Run with: npx tsx src/services/wizard/__tests__/manual-verification.ts
 */

import { WizardError } from '../types';
import { 
  joinPath, 
  normalizePath, 
  getDirName, 
  getBaseName,
  getExtension,
  sanitizeFilename,
  generateUniqueId,
  buildProjectFilePath,
  buildAssetFilePath
} from '../pathUtils';
import { createLogger } from '../logger';


// Test 1: WizardError
const error = new WizardError(
  'Connection failed',
  'connection',
  true,
  true,
  { service: 'Ollama', endpoint: 'http://localhost:11434' }
);

// Test 2: Path Utilities

// Test 3: Logger
const logger = createLogger({ enableFile: false, enableConsole: false });
logger.info('test', 'Test info message', { data: 'test' });
logger.warn('test', 'Test warning');
logger.error('test', 'Test error', new Error('Test'));
logger.logWizardError(error);

const logs = logger.getLogs();

const stats = logger.getStatistics();

// Test 4: Cross-platform compatibility
const windowsPath = 'C:\\Users\\test\\project\\file.txt';
const unixPath = '/home/user/project/file.txt';

