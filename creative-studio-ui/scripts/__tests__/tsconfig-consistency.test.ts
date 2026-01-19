/**
 * Property-Based Tests for Multiple TypeScript Config Consistency
 * Feature: typescript-build-configuration
 * Task 8.3: Write property test for multiple tsconfig consistency
 * 
 * These tests validate that all tsconfig files in the project have
 * consistent settings that prevent .js file generation in src/.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

interface TsConfig {
  compilerOptions?: {
    noEmit?: boolean;
    outDir?: string;
    declarationDir?: string;
    [key: string]: any;
  };
  extends?: string;
  [key: string]: any;
}

/**
 * Helper: Parse a tsconfig file and resolve extends
 * Uses a more robust approach to handle JSONC (JSON with Comments)
 */
function parseTsConfig(filePath: string): TsConfig {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  try {
    // More robust JSONC parsing:
    // 1. Remove single-line comments (but preserve strings)
    // 2. Remove multi-line comments (but preserve strings)
    // 3. Remove trailing commas
    
    let jsonContent = content;
    
    // Remove multi-line comments /* ... */
    jsonContent = jsonContent.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove single-line comments // ... but be careful with URLs
    // Split by lines and process each line
    jsonContent = jsonContent
      .split('\n')
      .map(line => {
        // Find // that's not inside a string
        let inString = false;
        let stringChar = '';
        let result = '';
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          // Track string boundaries
          if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== '\\')) {
            if (!inString) {
              inString = true;
              stringChar = char;
            } else if (char === stringChar) {
              inString = false;
              stringChar = '';
            }
          }
          
          // If we find // outside a string, stop processing this line
          if (!inString && char === '/' && nextChar === '/') {
            break;
          }
          
          result += char;
        }
        
        return result;
      })
      .join('\n');
    
    // Remove trailing commas before } or ]
    jsonContent = jsonContent.replace(/,(\s*[}\]])/g, '$1');
    
    return JSON.parse(jsonContent.trim());
  } catch (error) {
    console.warn(`Failed to parse ${filePath}:`, error);
    console.warn('Content preview:', content.substring(0, 200));
    return {};
  }
}

/**
 * Helper: Check if a tsconfig has safe output settings
 */
function hasSafeOutputSettings(config: TsConfig): boolean {
  const compilerOptions = config.compilerOptions || {};
  
  // Check noEmit is true
  const hasNoEmit = compilerOptions.noEmit === true;
  
  // Check outDir is not pointing to src/
  const outDir = compilerOptions.outDir;
  const outDirSafe = !outDir || 
                     !path.resolve(PROJECT_ROOT, outDir).includes(path.resolve(SRC_DIR));
  
  // Check declarationDir is not pointing to src/
  const declarationDir = compilerOptions.declarationDir;
  const declarationDirSafe = !declarationDir || 
                             !path.resolve(PROJECT_ROOT, declarationDir).includes(path.resolve(SRC_DIR));
  
  // Either noEmit is true, or both outDir and declarationDir are safe
  return hasNoEmit || (outDirSafe && declarationDirSafe);
}

/**
 * Helper: Find all tsconfig files in the project
 */
function findTsConfigFiles(rootDir: string): string[] {
  const tsconfigFiles: string[] = [];
  const excludeDirs = ['node_modules', '.git', 'dist', 'coverage', '.test-temp'];
  
  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (entry.isFile() && entry.name.startsWith('tsconfig') && entry.name.endsWith('.json')) {
        tsconfigFiles.push(fullPath);
      }
    }
  }
  
  traverse(rootDir);
  return tsconfigFiles;
}

describe('Feature: typescript-build-configuration', () => {
  describe('Property 14: Multiple TypeScript Config Consistency', () => {
    /**
     * Property: For all tsconfig files in the project (tsconfig.app.json, tsconfig.node.json, 
     * tsconfig.test.json), each should have either noEmit set to true or outDir set to a 
     * location outside of src/.
     * 
     * Validates: Requirements 2.5
     */
    
    it('should verify all tsconfig files have safe output settings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No random input needed, we check all configs
          async () => {
            // Find all tsconfig files
            const tsconfigFiles = findTsConfigFiles(PROJECT_ROOT);
            
            // Verify we found at least the main tsconfig files
            expect(tsconfigFiles.length).toBeGreaterThan(0);
            
            // Check each tsconfig file
            const results: { file: string; safe: boolean; config: TsConfig }[] = [];
            
            for (const tsconfigFile of tsconfigFiles) {
              const config = parseTsConfig(tsconfigFile);
              const safe = hasSafeOutputSettings(config);
              
              results.push({
                file: path.relative(PROJECT_ROOT, tsconfigFile),
                safe,
                config
              });
            }
            
            // All configs should be safe
            const unsafeConfigs = results.filter(r => !r.safe);
            
            if (unsafeConfigs.length > 0) {
              console.error('Unsafe tsconfig files found:');
              for (const unsafe of unsafeConfigs) {
                console.error(`  - ${unsafe.file}`);
                console.error(`    noEmit: ${unsafe.config.compilerOptions?.noEmit}`);
                console.error(`    outDir: ${unsafe.config.compilerOptions?.outDir}`);
              }
            }
            
            expect(unsafeConfigs).toHaveLength(0);
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    }, 15000);

    it('should verify tsconfig.app.json has noEmit: true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const tsconfigPath = path.join(PROJECT_ROOT, 'tsconfig.app.json');
            
            if (fs.existsSync(tsconfigPath)) {
              const content = fs.readFileSync(tsconfigPath, 'utf-8');
              
              // Check raw content for noEmit: true
              const hasNoEmit = content.includes('"noEmit": true') || 
                               content.includes('"noEmit":true') ||
                               content.includes("'noEmit': true") ||
                               content.includes("'noEmit':true");
              
              expect(hasNoEmit).toBe(true);
            }
          }
        ),
        { numRuns: 5, timeout: 2000 }
      );
    }, 10000);

    it('should verify no tsconfig has outDir pointing to src/', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const tsconfigFiles = findTsConfigFiles(PROJECT_ROOT);
            
            for (const tsconfigFile of tsconfigFiles) {
              const config = parseTsConfig(tsconfigFile);
              const outDir = config.compilerOptions?.outDir;
              
              if (outDir) {
                const resolvedOutDir = path.resolve(PROJECT_ROOT, outDir);
                const resolvedSrcDir = path.resolve(SRC_DIR);
                
                // outDir should not be inside src/
                expect(resolvedOutDir.startsWith(resolvedSrcDir)).toBe(false);
              }
            }
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    }, 15000);

    it('should verify no tsconfig has declarationDir pointing to src/', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const tsconfigFiles = findTsConfigFiles(PROJECT_ROOT);
            
            for (const tsconfigFile of tsconfigFiles) {
              const config = parseTsConfig(tsconfigFile);
              const declarationDir = config.compilerOptions?.declarationDir;
              
              if (declarationDir) {
                const resolvedDeclarationDir = path.resolve(PROJECT_ROOT, declarationDir);
                const resolvedSrcDir = path.resolve(SRC_DIR);
                
                // declarationDir should not be inside src/
                expect(resolvedDeclarationDir.startsWith(resolvedSrcDir)).toBe(false);
              }
            }
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    }, 15000);

    it('should verify tsconfig exclude arrays contain dist/', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('tsconfig.app.json', 'tsconfig.node.json', 'tsconfig.test.json'),
          async (tsconfigFile) => {
            const tsconfigPath = path.join(PROJECT_ROOT, tsconfigFile);
            
            if (fs.existsSync(tsconfigPath)) {
              const config = parseTsConfig(tsconfigPath);
              
              // Check if exclude array exists and contains dist
              if (config.exclude) {
                const excludeArray = Array.isArray(config.exclude) ? config.exclude : [];
                const excludesDist = excludeArray.some(pattern => 
                  pattern === 'dist' || pattern === 'dist/' || pattern.includes('dist')
                );
                
                expect(excludesDist).toBe(true);
              }
            }
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    }, 15000);

    it('should verify consistency across all tsconfig files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const mainTsconfigs = [
              'tsconfig.app.json',
              'tsconfig.node.json', 
              'tsconfig.test.json'
            ];
            
            const configs = mainTsconfigs
              .map(file => ({
                file,
                path: path.join(PROJECT_ROOT, file),
                config: parseTsConfig(path.join(PROJECT_ROOT, file))
              }))
              .filter(c => fs.existsSync(c.path));
            
            // All configs should have safe settings
            for (const { file, config } of configs) {
              const safe = hasSafeOutputSettings(config);
              expect(safe).toBe(true);
            }
            
            // Verify at least one config was checked
            expect(configs.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    }, 30000);
  });
});
