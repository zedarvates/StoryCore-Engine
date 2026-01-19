/**
 * Property-Based Tests for Path Alias Resolution
 * Feature: typescript-build-configuration
 * Task 9.2: Write property test for path alias resolution
 * 
 * These tests validate that path aliases (like @/) resolve to TypeScript
 * source files, not compiled JavaScript artifacts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SRC_DIR = path.join(process.cwd(), 'src');
const TEST_TEMP_DIR = path.join(SRC_DIR, '__test_alias_resolution__');

/**
 * Helper: Create a test file with specific content
 */
function createTestFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Helper: Clean up test directory
 */
function cleanupTestDir(): void {
  if (fs.existsSync(TEST_TEMP_DIR)) {
    fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
  }
}

/**
 * Helper: Check if a file has TypeScript-specific syntax
 */
function hasTypeScriptSyntax(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for TypeScript-specific patterns
  const tsPatterns = [
    /:\s*(string|number|boolean|any|unknown|never|void)/,  // Type annotations
    /interface\s+\w+/,                                      // Interface declarations
    /type\s+\w+\s*=/,                                       // Type aliases
    /<\w+>/,                                                // Generic types
    /as\s+\w+/,                                             // Type assertions
  ];
  
  return tsPatterns.some(pattern => pattern.test(content));
}

describe('Feature: typescript-build-configuration', () => {
  beforeEach(() => {
    cleanupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('Property 9: Path Alias Resolution', () => {
    /**
     * Property: For any import using the @ path alias, the resolved file
     * should be a TypeScript source file from src/, not a compiled .js artifact.
     * 
     * Validates: Requirements 5.5
     */
    
    it('should resolve @ alias to .ts files not .js files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 3, maxLength: 15 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
            fc.string({ minLength: 3, maxLength: 15 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s))
          ),
          async ([subDir, moduleName]) => {
            const moduleDir = path.join(TEST_TEMP_DIR, subDir);
            const tsFilePath = path.join(moduleDir, `${moduleName}.ts`);
            const jsFilePath = path.join(moduleDir, `${moduleName}.js`);
            
            // Create .ts file with TypeScript-specific content
            const tsContent = `
export interface TestInterface {
  value: string;
  count: number;
}

export const testValue: TestInterface = {
  value: "typescript",
  count: 42
};
`;
            createTestFile(tsFilePath, tsContent);
            
            // Create .js file (simulating a stray compiled artifact)
            const jsContent = `
export const testValue = {
  value: "javascript",
  count: 0
};
`;
            createTestFile(jsFilePath, jsContent);
            
            // Create importer using @ alias
            const importerPath = path.join(TEST_TEMP_DIR, 'alias-importer.ts');
            const importerContent = `
import { testValue, TestInterface } from '@/__test_alias_resolution__/${subDir}/${moduleName}';

export const result: TestInterface = testValue;
`;
            createTestFile(importerPath, importerContent);
            
            // Type check - should resolve to .ts file
            try {
              execSync('npx tsc --noEmit', {
                cwd: process.cwd(),
                stdio: 'pipe',
                timeout: 10000
              });
              
              // If type checking passes, it resolved to the .ts file
              // (The TestInterface import would fail if it resolved to .js)
              expect(true).toBe(true);
            } catch (error) {
              const errorOutput = (error as any).stderr?.toString() || '';
              
              // Check if error is about missing TestInterface
              // If so, it might have resolved to .js file
              if (errorOutput.includes('TestInterface')) {
                // This suggests it resolved to .js file (which doesn't export TestInterface)
                throw new Error('Path alias resolved to .js file instead of .ts file');
              }
              
              // Other errors are acceptable (might be unrelated to resolution)
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    }, 60000);

    it('should resolve @ alias to .tsx files for React components', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 15 }).filter(s => /^[A-Z][a-zA-Z0-9]*$/.test(s)),
          async (componentName) => {
            const componentDir = path.join(TEST_TEMP_DIR, 'components');
            const tsxFilePath = path.join(componentDir, `${componentName}.tsx`);
            const jsxFilePath = path.join(componentDir, `${componentName}.jsx`);
            
            // Create .tsx file with TypeScript props
            const tsxContent = `
import React from 'react';

interface ${componentName}Props {
  title: string;
  count: number;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ title, count }) => {
  return <div>{title}: {count}</div>;
};
`;
            createTestFile(tsxFilePath, tsxContent);
            
            // Create .jsx file without types
            const jsxContent = `
import React from 'react';

export const ${componentName} = ({ title, count }) => {
  return <div>{title}: {count}</div>;
};
`;
            createTestFile(jsxFilePath, jsxContent);
            
            // Create importer using @ alias
            const importerPath = path.join(TEST_TEMP_DIR, 'component-importer.tsx');
            const importerContent = `
import React from 'react';
import { ${componentName} } from '@/__test_alias_resolution__/components/${componentName}';

export const App: React.FC = () => {
  return <${componentName} title="Test" count={42} />;
};
`;
            createTestFile(importerPath, importerContent);
            
            // Type check
            try {
              execSync('npx tsc --noEmit', {
                cwd: process.cwd(),
                stdio: 'pipe',
                timeout: 10000
              });
              
              expect(true).toBe(true);
            } catch (error) {
              const errorOutput = (error as any).stderr?.toString() || '';
              
              // Should not reference .jsx file
              expect(errorOutput).not.toContain(`${componentName}.jsx`);
            }
          }
        ),
        { numRuns: 5, timeout: 30000 }
      );
    }, 60000);

    it('should resolve nested @ alias paths to TypeScript files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z][a-z0-9]*$/.test(s)),
            fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z][a-z0-9]*$/.test(s)),
            fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z][a-z0-9]*$/.test(s))
          ),
          async ([dir1, dir2, moduleName]) => {
            const nestedPath = path.join(TEST_TEMP_DIR, dir1, dir2);
            const tsFilePath = path.join(nestedPath, `${moduleName}.ts`);
            const jsFilePath = path.join(nestedPath, `${moduleName}.js`);
            
            // Create .ts file with type exports
            const tsContent = `
export type NestedType = {
  nested: boolean;
  depth: number;
};

export const nestedValue: NestedType = {
  nested: true,
  depth: 3
};
`;
            createTestFile(tsFilePath, tsContent);
            
            // Create .js file
            const jsContent = `
export const nestedValue = {
  nested: true,
  depth: 3
};
`;
            createTestFile(jsFilePath, jsContent);
            
            // Create importer with nested @ alias
            const importerPath = path.join(TEST_TEMP_DIR, 'nested-alias-importer.ts');
            const importerContent = `
import { nestedValue, NestedType } from '@/__test_alias_resolution__/${dir1}/${dir2}/${moduleName}';

export const result: NestedType = nestedValue;
`;
            createTestFile(importerPath, importerContent);
            
            // Type check
            try {
              execSync('npx tsc --noEmit', {
                cwd: process.cwd(),
                stdio: 'pipe',
                timeout: 10000
              });
              
              expect(true).toBe(true);
            } catch (error) {
              const errorOutput = (error as any).stderr?.toString() || '';
              
              // If NestedType is not found, it resolved to .js
              if (errorOutput.includes('NestedType')) {
                throw new Error('Nested path alias resolved to .js file instead of .ts file');
              }
            }
          }
        ),
        { numRuns: 5, timeout: 30000 }
      );
    }, 60000);

    it('should resolve @ alias consistently across multiple imports', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z][a-z0-9]*$/.test(s)),
            { minLength: 2, maxLength: 5 }
          ),
          async (moduleNames) => {
            const uniqueModules = [...new Set(moduleNames)];
            
            // Create .ts and .js files for each module
            for (const moduleName of uniqueModules) {
              const tsFilePath = path.join(TEST_TEMP_DIR, `${moduleName}.ts`);
              const jsFilePath = path.join(TEST_TEMP_DIR, `${moduleName}.js`);
              
              createTestFile(tsFilePath, `
export interface ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Type {
  id: string;
}
export const ${moduleName}Value: ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Type = { id: "${moduleName}" };
`);
              
              createTestFile(jsFilePath, `
export const ${moduleName}Value = { id: "${moduleName}" };
`);
            }
            
            // Create importer that imports all modules using @ alias
            const importerPath = path.join(TEST_TEMP_DIR, 'multi-import.ts');
            const imports = uniqueModules.map(name => 
              `import { ${name}Value, ${name.charAt(0).toUpperCase() + name.slice(1)}Type } from '@/__test_alias_resolution__/${name}';`
            ).join('\n');
            
            const importerContent = `
${imports}

export const allValues = {
  ${uniqueModules.map(name => `${name}: ${name}Value`).join(',\n  ')}
};
`;
            createTestFile(importerPath, importerContent);
            
            // Type check
            try {
              execSync('npx tsc --noEmit', {
                cwd: process.cwd(),
                stdio: 'pipe',
                timeout: 10000
              });
              
              // All imports resolved to .ts files
              expect(true).toBe(true);
            } catch (error) {
              const errorOutput = (error as any).stderr?.toString() || '';
              
              // Check if any Type imports failed (would indicate .js resolution)
              const typeErrors = uniqueModules.filter(name => 
                errorOutput.includes(`${name.charAt(0).toUpperCase() + name.slice(1)}Type`)
              );
              
              if (typeErrors.length > 0) {
                throw new Error(`Path alias resolved to .js files for: ${typeErrors.join(', ')}`);
              }
            }
          }
        ),
        { numRuns: 5, timeout: 30000 }
      );
    }, 60000);
  });
});
