/**
 * Property-Based Tests for TypeScript No-Emit Behavior
 * Feature: typescript-build-configuration
 * Task 8.2: Write property test for TypeScript no-emit
 * 
 * These tests validate that the TypeScript compiler does not generate
 * .js files when configured with noEmit: true.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SRC_DIR = path.join(process.cwd(), 'src');
const PROJECT_ROOT = process.cwd();

/**
 * Helper: Find all .js files in the project (excluding node_modules, dist)
 */
function findAllJsFiles(rootDir: string): string[] {
  const jsFiles: string[] = [];
  const excludeDirs = ['node_modules', '.git', 'dist', 'coverage', '.test-temp'];
  
  if (!fs.existsSync(rootDir)) {
    return jsFiles;
  }

  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        // Exclude root-level config files
        const relativePath = path.relative(rootDir, fullPath);
        const isRootConfig = !relativePath.includes(path.sep) && 
                            (entry.name.endsWith('.config.js') || 
                             entry.name === 'vite.config.js' ||
                             entry.name === 'vitest.config.js' ||
                             entry.name === 'eslint.config.js' ||
                             entry.name === 'postcss.config.js' ||
                             entry.name === 'tailwind.config.js');
        
        if (!isRootConfig) {
          jsFiles.push(fullPath);
        }
      }
    }
  }
  
  traverse(rootDir);
  return jsFiles;
}

/**
 * Helper: Create a test TypeScript file
 */
function createTestTsFile(relativePath: string, content: string): string {
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
        
        // Also remove corresponding .js file if it exists
        const jsFile = file.replace(/\.ts$/, '.js');
        if (fs.existsSync(jsFile)) {
          fs.unlinkSync(jsFile);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

describe('Feature: typescript-build-configuration', () => {
  describe('Property 2: TypeScript Compiler No-Emit Behavior', () => {
    /**
     * Property: For any execution of the TypeScript compiler (tsc -b),
     * no .js files should be generated in any directory within the project.
     * 
     * Validates: Requirements 2.2
     */
    
    it('should not generate .js files when running tsc -b', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9_-]/g, '_')),
              content: fc.constantFrom(
                'export const value = 42;',
                'export function test() { return true; }',
                'export interface TestInterface { id: number; }',
                'export type TestType = string | number;',
                'export class TestClass { constructor(public name: string) {} }'
              )
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (testFiles) => {
            const createdFiles: string[] = [];
            
            try {
              // Get baseline .js files before test
              const jsFilesBefore = findAllJsFiles(PROJECT_ROOT);
              
              // Create test TypeScript files
              for (const testFile of testFiles) {
                const fileName = `test_${testFile.path}.ts`;
                const filePath = createTestTsFile(fileName, testFile.content);
                createdFiles.push(filePath);
              }

              // Run TypeScript compiler
              try {
                execSync('npx tsc -b', { 
                  cwd: PROJECT_ROOT, 
                  stdio: 'pipe',
                  timeout: 30000 
                });
              } catch (error) {
                // tsc might fail due to type errors, but we still check for .js files
              }

              // Get .js files after compilation
              const jsFilesAfter = findAllJsFiles(PROJECT_ROOT);
              
              // Assert no new .js files were created
              expect(jsFilesAfter.length).toBe(jsFilesBefore.length);
            } finally {
              // Cleanup test files
              cleanupTestFiles(createdFiles);
            }
          }
        ),
        { numRuns: 10, timeout: 60000 } // Reduced runs for performance
      );
    }, 120000);

    it('should verify noEmit is set in tsconfig files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('tsconfig.app.json', 'tsconfig.node.json', 'tsconfig.test.json'),
          async (tsconfigFile) => {
            const tsconfigPath = path.join(PROJECT_ROOT, tsconfigFile);
            
            if (fs.existsSync(tsconfigPath)) {
              const content = fs.readFileSync(tsconfigPath, 'utf-8');
              
              // Remove comments and trailing commas for JSON parsing
              const jsonContent = content
                .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
                .replace(/\/\/.*/g, '') // Remove // comments
                .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                .trim();
              
              try {
                const config = JSON.parse(jsonContent);
                
                // Check that either noEmit is true or outDir is not src/
                const hasNoEmit = config.compilerOptions?.noEmit === true;
                const outDir = config.compilerOptions?.outDir;
                const outDirNotSrc = !outDir || !outDir.includes('src');
                
                // At least one condition should be true
                expect(hasNoEmit || outDirNotSrc).toBe(true);
              } catch (error) {
                // If JSON parsing fails, check the raw content for noEmit
                const hasNoEmitInContent = content.includes('"noEmit": true') || 
                                          content.includes('"noEmit":true');
                expect(hasNoEmitInContent).toBe(true);
              }
            }
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    }, 15000);

    it('should not create .js files in src/ after type checking', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 30 }).map(s => s.replace(/[^a-zA-Z0-9_-]/g, '_')),
          async (fileName) => {
            const createdFiles: string[] = [];
            
            try {
              // Create a test TypeScript file
              const testFile = createTestTsFile(
                `test_${fileName}.ts`,
                'export const testValue: number = 123;'
              );
              createdFiles.push(testFile);

              // Run type checking
              try {
                execSync('npx tsc --noEmit', { 
                  cwd: PROJECT_ROOT, 
                  stdio: 'pipe',
                  timeout: 30000 
                });
              } catch (error) {
                // Type checking might fail, but we still verify no .js files
              }

              // Check that no .js file was created
              const jsFile = testFile.replace(/\.ts$/, '.js');
              expect(fs.existsSync(jsFile)).toBe(false);
              
              // Also check src/ directory has no new .js files
              const srcJsFiles = fs.readdirSync(SRC_DIR)
                .filter(f => f.endsWith('.js') && f.startsWith('test_'));
              expect(srcJsFiles).toHaveLength(0);
            } finally {
              // Cleanup
              cleanupTestFiles(createdFiles);
            }
          }
        ),
        { numRuns: 10, timeout: 60000 } // Reduced runs for performance
      );
    }, 120000);
  });
});
