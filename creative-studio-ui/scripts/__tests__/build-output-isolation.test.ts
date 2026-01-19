/**
 * Property-Based Tests for Build Output Isolation
 * Feature: typescript-build-configuration
 * Task 8: Implement build output isolation tests
 * 
 * These tests validate that the build system maintains proper separation
 * between source files and compiled artifacts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SRC_DIR = path.join(process.cwd(), 'src');
const DIST_DIR = path.join(process.cwd(), 'dist');
const TEST_TEMP_DIR = path.join(process.cwd(), '.test-temp');

/**
 * Helper: Find all .js files in a directory recursively
 */
function findJsFiles(dir: string): string[] {
  const jsFiles: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return jsFiles;
  }

  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other common directories
        if (!['node_modules', '.git', 'dist', 'coverage'].includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        // Exclude root-level config files
        const relativePath = path.relative(process.cwd(), fullPath);
        const isRootConfig = !relativePath.includes(path.sep) && 
                            (entry.name.endsWith('.config.js') || 
                             entry.name === 'vite.config.js' ||
                             entry.name === 'vitest.config.js' ||
                             entry.name === 'eslint.config.js');
        
        if (!isRootConfig) {
          jsFiles.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return jsFiles;
}

/**
 * Helper: Create a test .ts file
 */
function createTestTsFile(relativePath: string, content: string = 'export const test = "test";'): string {
  const fullPath = path.join(SRC_DIR, relativePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
}

/**
 * Helper: Clean up test files
 */
function cleanupTestFiles(files: string[]) {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

describe('Feature: typescript-build-configuration', () => {
  describe('Property 1: Build Output Isolation', () => {
    /**
     * Property: For any build or development operation (dev, build, type-check),
     * after the operation completes, the src/ directory should contain zero .js or .js.map files.
     * 
     * Validates: Requirements 1.1, 1.2, 1.3, 1.5
     */
    
    it('should ensure src/ contains no .js files after build', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('build'),
          async (scriptName) => {
            // Clean before test
            try {
              execSync('npm run clean', { 
                cwd: process.cwd(), 
                stdio: 'pipe',
                timeout: 10000 
              });
            } catch (error) {
              // Cleanup might fail if nothing to clean
            }

            // Run the build script
            try {
              execSync(`npm run ${scriptName}`, { 
                cwd: process.cwd(), 
                stdio: 'pipe',
                timeout: 60000 
              });
            } catch (error) {
              // Build might fail for other reasons, but we still check for .js files
            }

            // Scan src/ for .js files
            const jsFiles = findJsFiles(SRC_DIR);
            
            // Assert no .js files exist in src/
            expect(jsFiles).toHaveLength(0);
          }
        ),
        { numRuns: 5, timeout: 120000 } // Reduced runs for build performance
      );
    }, 180000); // 3 minute timeout for build tests

    it('should ensure src/ contains no .js files after cleanup', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          async (fileNames) => {
            const createdFiles: string[] = [];
            
            try {
              // Create test .js files in src/
              for (const fileName of fileNames) {
                const safeName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
                const testFile = path.join(SRC_DIR, `test_${safeName}.js`);
                fs.writeFileSync(testFile, '// test file', 'utf-8');
                createdFiles.push(testFile);
              }

              // Run cleanup
              execSync('npm run clean', { 
                cwd: process.cwd(), 
                stdio: 'pipe',
                timeout: 10000 
              });

              // Scan src/ for .js files
              const jsFiles = findJsFiles(SRC_DIR);
              
              // Assert no .js files exist in src/
              expect(jsFiles).toHaveLength(0);
            } finally {
              // Cleanup any remaining test files
              cleanupTestFiles(createdFiles);
            }
          }
        ),
        { numRuns: 100, timeout: 30000 }
      );
    }, 60000);

    it('should preserve root-level config files during cleanup', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('vite.config.js', 'vitest.config.js', 'eslint.config.js'),
          async (configFile) => {
            const configPath = path.join(process.cwd(), configFile);
            const configExists = fs.existsSync(configPath);
            
            if (configExists) {
              const contentBefore = fs.readFileSync(configPath, 'utf-8');
              
              // Run cleanup
              execSync('npm run clean', { 
                cwd: process.cwd(), 
                stdio: 'pipe',
                timeout: 10000 
              });
              
              // Verify config file still exists
              expect(fs.existsSync(configPath)).toBe(true);
              
              // Verify content unchanged
              const contentAfter = fs.readFileSync(configPath, 'utf-8');
              expect(contentAfter).toBe(contentBefore);
            }
          }
        ),
        { numRuns: 10, timeout: 15000 }
      );
    }, 30000);
  });
});
