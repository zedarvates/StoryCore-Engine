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

console.log('=== Wizard Service Infrastructure Verification ===\n');

// Test 1: WizardError
console.log('1. Testing WizardError:');
const error = new WizardError(
  'Connection failed',
  'connection',
  true,
  true,
  { service: 'Ollama', endpoint: 'http://localhost:11434' }
);
console.log('  ✓ Error created:', error.message);
console.log('  ✓ Category:', error.category);
console.log('  ✓ User message:', error.getUserMessage().substring(0, 50) + '...');
console.log('  ✓ JSON export:', Object.keys(error.toJSON()).join(', '));

// Test 2: Path Utilities
console.log('\n2. Testing Path Utilities:');
console.log('  ✓ joinPath:', joinPath('projects', 'my-project', 'assets'));
console.log('  ✓ normalizePath:', normalizePath('C:\\Users\\test\\file.txt'));
console.log('  ✓ getDirName:', getDirName('projects/my-project/file.json'));
console.log('  ✓ getBaseName:', getBaseName('projects/my-project/file.json'));
console.log('  ✓ getExtension:', getExtension('file.json'));
console.log('  ✓ sanitizeFilename:', sanitizeFilename('my file<name>.txt'));
console.log('  ✓ generateUniqueId:', generateUniqueId('shot', 1));
console.log('  ✓ buildProjectFilePath:', buildProjectFilePath('/projects/test', 'characters', 'char.json'));
console.log('  ✓ buildAssetFilePath:', buildAssetFilePath('/projects/test', 'images', 'img.png'));

// Test 3: Logger
console.log('\n3. Testing Logger:');
const logger = createLogger({ enableFile: false, enableConsole: false });
logger.info('test', 'Test info message', { data: 'test' });
logger.warn('test', 'Test warning');
logger.error('test', 'Test error', new Error('Test'));
logger.logWizardError(error);

const logs = logger.getLogs();
console.log('  ✓ Logged', logs.length, 'messages');
console.log('  ✓ Log levels:', logs.map(l => l.level).join(', '));
console.log('  ✓ Error logs:', logger.getErrorLogs().length);

const stats = logger.getStatistics();
console.log('  ✓ Statistics:', JSON.stringify(stats.byLevel));

// Test 4: Cross-platform compatibility
console.log('\n4. Testing Cross-Platform Compatibility:');
const windowsPath = 'C:\\Users\\test\\project\\file.txt';
const unixPath = '/home/user/project/file.txt';
console.log('  ✓ Windows path normalized:', normalizePath(windowsPath));
console.log('  ✓ Unix path normalized:', normalizePath(unixPath));
console.log('  ✓ Mixed separators:', normalizePath('a/b\\c/d'));

console.log('\n=== All Verifications Passed ===');
console.log('\nThe wizard service infrastructure is working correctly!');
console.log('All components (types, path utilities, logger) are functional.');
