#!/usr/bin/env tsx

/**
 * Verification script for the Modal Framework
 *
 * This script runs automated tests and checks for the modal framework
 * to ensure it meets production requirements.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color: keyof typeof colors, message: string) {
}

async function runCommand(command: string): Promise<boolean> {
  try {
    execSync(command, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

async function checkFileExists(filePath: string): Promise<boolean> {
  return existsSync(join(process.cwd(), filePath));
}

async function checkTypeScriptCompilation(): Promise<boolean> {
  log('blue', '🔍 Checking TypeScript compilation...');
  return runCommand('npx tsc --noEmit --skipLibCheck');
}

async function runUnitTests(): Promise<boolean> {
  log('blue', '🧪 Running unit tests...');
  return runCommand('npm test -- --run --reporter=verbose');
}

async function checkEslint(): Promise<boolean> {
  log('blue', '📏 Checking ESLint...');
  return runCommand('npx eslint "src/hooks/useModal*.ts" "src/components/ui/Modal*.tsx" "src/types/modal.ts" --ext .ts,.tsx');
}

async function checkBundleSize(): Promise<boolean> {
  log('blue', '📦 Checking bundle size...');

  // Simple check - ensure files are not too large
  const files = [
    'src/hooks/useModalState.ts',
    'src/hooks/useModalValidation.ts',
    'src/hooks/useModalConnectionTest.ts',
    'src/hooks/useModalPersistence.ts',
    'src/components/ui/ModalFramework.tsx',
    'src/types/modal.ts',
  ];

  for (const file of files) {
    try {
      const content = readFileSync(join(process.cwd(), file), 'utf-8');
      const sizeKB = content.length / 1024;

      if (sizeKB > 50) {
        log('yellow', `⚠️  ${file} is ${sizeKB.toFixed(1)}KB - consider splitting`);
      } else {
        log('green', `✅ ${file} size OK (${sizeKB.toFixed(1)}KB)`);
      }
    } catch (error) {
      log('red', `❌ Cannot read ${file}`);
      return false;
    }
  }

  return true;
}

async function checkPerformance(): Promise<boolean> {
  log('blue', '⚡ Checking performance patterns...');

  // Check for potential performance issues
  const patterns = [
    { regex: /any/, message: 'any type found - use strict types' },
    { regex: /unknown/, message: 'unknown type found - use specific types' },
    { regex: /useEffect\(\(\) => \{/, message: 'useEffect without dependencies - potential infinite loop' },
  ];

  const files = [
    'src/hooks/useModalState.ts',
    'src/hooks/useModalValidation.ts',
    'src/hooks/useModalConnectionTest.ts',
    'src/hooks/useModalPersistence.ts',
    'src/components/ui/ModalFramework.tsx',
  ];

  let hasIssues = false;

  for (const file of files) {
    try {
      const content = readFileSync(join(process.cwd(), file), 'utf-8');

      for (const pattern of patterns) {
        if (pattern.regex.test(content)) {
          log('red', `❌ ${file}: ${pattern.message}`);
          hasIssues = true;
        }
      }
    } catch (error) {
      log('red', `❌ Cannot read ${file}`);
      hasIssues = true;
    }
  }

  if (!hasIssues) {
    log('green', '✅ No performance issues found');
  }

  return !hasIssues;
}

async function checkMaintainability(): Promise<boolean> {
  log('blue', '🔧 Checking maintainability...');

  // Check for good practices
  const checks = [
    {
      name: 'TypeScript strict mode',
      check: () => {
        const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf-8'));
        return tsconfig.compilerOptions?.strict === true;
      },
    },
    {
      name: 'Hook exports',
      check: () => checkFileExists('src/hooks/index.ts'),
    },
    {
      name: 'Component exports',
      check: () => checkFileExists('src/components/ui/index.ts'),
    },
    {
      name: 'Test coverage',
      check: async () => {
        const testFiles = [
          'src/hooks/__tests__/useModalState.test.ts',
          'src/hooks/__tests__/useModalValidation.test.ts',
        ];

        for (const file of testFiles) {
          if (!await checkFileExists(file)) {
            return false;
          }
        }
        return true;
      },
    },
  ];

  let passed = 0;
  let total = checks.length;

  for (const check of checks) {
    try {
      const result = await check.check();
      if (result) {
        log('green', `✅ ${check.name}`);
        passed++;
      } else {
        log('red', `❌ ${check.name}`);
      }
    } catch (error) {
      log('red', `❌ ${check.name} - Error: ${error}`);
    }
  }

  const score = (passed / total) * 100;
  log('blue', `📊 Maintainability score: ${score.toFixed(1)}%`);

  return score >= 80;
}

async function main() {
  log('blue', '🚀 Starting Modal Framework verification...\n');

  const checks = [
    { name: 'File existence', fn: checkFileExists.bind(null, 'src/types/modal.ts') },
    { name: 'TypeScript compilation', fn: checkTypeScriptCompilation },
    { name: 'ESLint', fn: checkEslint },
    { name: 'Unit tests', fn: runUnitTests },
    { name: 'Bundle size', fn: checkBundleSize },
    { name: 'Performance', fn: checkPerformance },
    { name: 'Maintainability', fn: checkMaintainability },
  ];

  let passed = 0;
  let total = checks.length;

  for (const check of checks) {
    try {
      const result = await check.fn();
      if (result) {
        passed++;
      }
    } catch (error) {
      log('red', `❌ ${check.name} failed with error: ${error}`);
    }
  }

  const successRate = (passed / total) * 100;

  if (successRate === 100) {
    log('green', `🎉 All checks passed! (${passed}/${total})`);
    log('green', '✅ Modal Framework is ready for production');
  } else if (successRate >= 75) {
    log('yellow', `⚠️  Most checks passed (${passed}/${total})`);
    log('yellow', '🔄 Modal Framework needs minor fixes');
  } else {
    log('red', `❌ Many checks failed (${passed}/${total})`);
    log('red', '🛑 Modal Framework needs significant work');
  }

  process.exit(successRate === 100 ? 0 : 1);
}

main().catch(error => {
  log('red', `💥 Verification failed: ${error}`);
  process.exit(1);
});
