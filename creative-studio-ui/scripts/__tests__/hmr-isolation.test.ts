/**
 * Property-Based Tests for Hot Module Replacement Isolation
 * Feature: typescript-build-configuration
 * Task 10: Implement development workflow tests
 * 
 * These tests validate that HMR updates during development do not
 * generate .js files in the src/ directory.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

const SRC_DIR = path.join(process.cwd(), 'src');
const TEST_COMPONENT_DIR = path.join(SRC_DIR, 'test-hmr-components');

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
        jsFiles.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return jsFiles;
}

/**
 * Helper: Start dev server and wait for it to be ready
 */
function startDevServer(): Promise<{ process: ChildProcess; port: number }> {
  return new Promise((resolve, reject) => {
    const devProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      shell: true,
      stdio: 'pipe'
    });

    let output = '';
    const timeout = setTimeout(() => {
      devProcess.kill();
      reject(new Error('Dev server startup timeout'));
    }, 60000); // 60 second timeout

    devProcess.stdout?.on('data', (data) => {
      output += data.toString();
      
      // Look for Vite's ready message
      if (output.includes('Local:') || output.includes('ready in')) {
        clearTimeout(timeout);
        
        // Extract port from output (default is 5173)
        const portMatch = output.match(/localhost:(\d+)/);
        const port = portMatch ? parseInt(portMatch[1]) : 5173;
        
        // Give it a moment to fully initialize
        setTimeout(() => {
          resolve({ process: devProcess, port });
        }, 2000);
      }
    });

    devProcess.stderr?.on('data', (data) => {
      output += data.toString();
    });

    devProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    devProcess.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0 && code !== null) {
        reject(new Error(`Dev server exited with code ${code}`));
      }
    });
  });
}

/**
 * Helper: Stop dev server
 */
function stopDevServer(devProcess: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!devProcess.killed) {
      devProcess.on('exit', () => {
        resolve();
      });
      
      // Try graceful shutdown first
      devProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!devProcess.killed) {
          devProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);
    } else {
      resolve();
    }
  });
}

/**
 * Helper: Create a test component file
 */
function createTestComponent(fileName: string, content: string): string {
  if (!fs.existsSync(TEST_COMPONENT_DIR)) {
    fs.mkdirSync(TEST_COMPONENT_DIR, { recursive: true });
  }
  
  const filePath = path.join(TEST_COMPONENT_DIR, fileName);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Helper: Modify a test component file
 */
function modifyTestComponent(filePath: string, newContent: string): void {
  fs.writeFileSync(filePath, newContent, 'utf-8');
}

/**
 * Helper: Clean up test component directory
 */
function cleanupTestComponents(): void {
  if (fs.existsSync(TEST_COMPONENT_DIR)) {
    fs.rmSync(TEST_COMPONENT_DIR, { recursive: true, force: true });
  }
}

describe('Feature: typescript-build-configuration', () => {
  describe('Property 10: Hot Module Replacement Isolation', () => {
    /**
     * Property: For any file change that triggers HMR during development,
     * no .js files should be created in src/ as a result of the HMR update.
     * 
     * Validates: Requirements 6.4
     */
    
    afterEach(() => {
      cleanupTestComponents();
    });

    it('should not create .js files in src/ during HMR updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 5, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, '_')),
            fc.integer({ min: 1, max: 5 })
          ),
          async ([componentName, updateCount]) => {
            let devServer: { process: ChildProcess; port: number } | null = null;
            
            try {
              // Start dev server
              devServer = await startDevServer();
              
              // Create initial test component
              const componentFile = createTestComponent(
                `${componentName}.tsx`,
                `export const ${componentName} = () => <div>Initial</div>;`
              );
              
              // Wait for initial compilation
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Scan for .js files before modifications
              const jsFilesBefore = findJsFiles(SRC_DIR);
              
              // Perform multiple HMR updates
              for (let i = 0; i < updateCount; i++) {
                modifyTestComponent(
                  componentFile,
                  `export const ${componentName} = () => <div>Update ${i + 1}</div>;`
                );
                
                // Wait for HMR to process
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
              // Wait a bit more to ensure all HMR updates are processed
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Scan for .js files after modifications
              const jsFilesAfter = findJsFiles(SRC_DIR);
              
              // Assert no new .js files were created
              expect(jsFilesAfter.length).toBe(jsFilesBefore.length);
              
              // Assert specifically no .js files in test component directory
              const testDirJsFiles = jsFilesAfter.filter(f => f.includes('test-hmr-components'));
              expect(testDirJsFiles).toHaveLength(0);
              
            } finally {
              // Clean up dev server
              if (devServer) {
                await stopDevServer(devServer.process);
              }
            }
          }
        ),
        { numRuns: 3, timeout: 180000 } // Reduced runs due to dev server overhead
      );
    }, 240000); // 4 minute timeout for dev server tests

    it('should not create .js files when modifying existing components', async () => {
      let devServer: { process: ChildProcess; port: number } | null = null;
      
      try {
        // Start dev server
        devServer = await startDevServer();
        
        // Create a test component
        const testFile = createTestComponent(
          'TestComponent.tsx',
          `import React from 'react';\nexport const TestComponent = () => <div>Test</div>;`
        );
        
        // Wait for initial compilation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get initial .js file count
        const jsFilesBefore = findJsFiles(SRC_DIR);
        
        // Modify the component multiple times
        for (let i = 0; i < 3; i++) {
          modifyTestComponent(
            testFile,
            `import React from 'react';\nexport const TestComponent = () => <div>Modified ${i}</div>;`
          );
          
          // Wait for HMR
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Get final .js file count
        const jsFilesAfter = findJsFiles(SRC_DIR);
        
        // Assert no .js files were created
        expect(jsFilesAfter.length).toBe(jsFilesBefore.length);
        
      } finally {
        if (devServer) {
          await stopDevServer(devServer.process);
        }
      }
    }, 120000); // 2 minute timeout

    it('should maintain clean src/ directory throughout dev server lifecycle', async () => {
      let devServer: { process: ChildProcess; port: number } | null = null;
      
      try {
        // Scan before starting dev server
        const jsFilesInitial = findJsFiles(SRC_DIR);
        
        // Start dev server
        devServer = await startDevServer();
        
        // Wait for server to be fully ready
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Scan after dev server starts
        const jsFilesAfterStart = findJsFiles(SRC_DIR);
        
        // Create and modify a component
        const testFile = createTestComponent(
          'LifecycleTest.tsx',
          `export const LifecycleTest = () => <div>Test</div>;`
        );
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        modifyTestComponent(
          testFile,
          `export const LifecycleTest = () => <div>Modified</div>;`
        );
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Scan after modifications
        const jsFilesAfterModify = findJsFiles(SRC_DIR);
        
        // Assert no .js files at any stage
        expect(jsFilesInitial).toHaveLength(0);
        expect(jsFilesAfterStart).toHaveLength(0);
        expect(jsFilesAfterModify).toHaveLength(0);
        
      } finally {
        if (devServer) {
          await stopDevServer(devServer.process);
        }
      }
    }, 120000); // 2 minute timeout
  });
});
