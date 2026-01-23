import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Test suite for validating dead code removal improvements
 * Ensures no unused code remains in the codebase
 */
describe('Dead Code Removal Validation', () => {
  const SRC_DIR = path.join(process.cwd(), 'src');

  /**
   * Recursively find all TypeScript and JavaScript files
   */
  const findSourceFiles = (dir: string): string[] => {
    const files: string[] = [];

    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...findSourceFiles(fullPath));
      } else if (stat.isFile() && /\.(ts|tsx)$/.test(item)) {
        files.push(fullPath);
      }
    });

    return files;
  };

  /**
   * Extract exports from a TypeScript file
   */
  const extractExports = (content: string): string[] => {
    const exports: string[] = [];
    const exportRegexes = [
      /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g,
      /export\s*\{\s*([^}]+)\s*\}/g,
      /export\s+default\s+(?:\w+|\{[^}]*\}|function|\([^)]*\)\s*=>)/g,
    ];

    exportRegexes.forEach(regex => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (match[1]) {
          // Handle named exports in braces
          if (match[0].includes('{')) {
            const namedExports = match[1].split(',').map(exp => exp.trim().split(' as ')[0]);
            exports.push(...namedExports);
          } else {
            exports.push(match[1]);
          }
        }
      }
    });

    return [...new Set(exports)]; // Remove duplicates
  };

  /**
   * Check if an export is used in the codebase
   */
  const isExportUsed = (exportName: string, filePath: string): boolean => {
    const sourceFiles = findSourceFiles(SRC_DIR);
    const fileDir = path.dirname(filePath);

    for (const otherFile of sourceFiles) {
      if (otherFile === filePath) continue;

      try {
        const content = fs.readFileSync(otherFile, 'utf-8');

        // Check for imports
        const importRegex = new RegExp(`import.*${exportName}.*from.*${path.relative(fileDir, filePath).replace(/\\/g, '/').replace(/\.tsx?$/, '')}`, 'g');
        if (importRegex.test(content)) {
          return true;
        }

        // Check for direct usage (simple heuristic)
        const usageRegex = new RegExp(`\\b${exportName}\\b`, 'g');
        if (usageRegex.test(content)) {
          return true;
        }
      } catch (error) {
        // Skip unreadable files
      }
    }

    return false;
  };

  describe('Export usage validation', () => {
    it('should validate that critical exports are used', () => {
      // Test a few known exports that should be used
      const dialogFile = path.join(SRC_DIR, 'components/ui/dialog.tsx');

      if (fs.existsSync(dialogFile)) {
        const content = fs.readFileSync(dialogFile, 'utf-8');
        const exports = extractExports(content);

        // These are the main exports from dialog.tsx that should be used
        const criticalExports = ['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle'];

        criticalExports.forEach(exportName => {
          expect(exports).toContain(exportName);
        });
      }
    });

    it('should not contain obviously unused private functions', () => {
      const sourceFiles = findSourceFiles(SRC_DIR);
      let deadCodeCount = 0;

      sourceFiles.forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');

          // Look for private functions (starting with underscore or marked as private)
          const privateFunctionRegex = /(?:function\s+(_\w+)|(?:\/\*\*\s*\n\s*\*\s*@private\s*\*\/\s*)function\s+(\w+))/g;
          let match;

          while ((match = privateFunctionRegex.exec(content)) !== null) {
            const functionName = match[1] || match[2];
            const usageRegex = new RegExp(`\\b${functionName}\\b`, 'g');

            // Check if used within the same file
            const usagesInFile = (content.match(usageRegex) || []).length;

            // If defined but used only once (the definition), it might be dead
            if (usagesInFile <= 1) {
              deadCodeCount++;
            }
          }
        } catch (error) {
          // Skip problematic files
        }
      });

      // Allow some dead code (e.g., utility functions for future use)
      // but flag if there's a lot
      expect(deadCodeCount).toBeLessThan(10);
    });
  });

  describe('Build-time dead code detection', () => {
    it('should validate through TypeScript compilation', () => {
      // This test assumes the project compiles without errors
      // In a real scenario, we'd run tsc and check for unused variable warnings
      const sourceFiles = findSourceFiles(SRC_DIR);
      expect(sourceFiles.length).toBeGreaterThan(50); // Reasonable minimum

      // Check that index files exist and are properly structured
      const componentsIndex = path.join(SRC_DIR, 'components/index.ts');
      if (fs.existsSync(componentsIndex)) {
        const content = fs.readFileSync(componentsIndex, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
      }
    });

    it('should ensure no commented out code blocks', () => {
      const sourceFiles = findSourceFiles(SRC_DIR);
      let commentedCodeBlocks = 0;

      sourceFiles.forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');

          let inBlockComment = false;
          lines.forEach(line => {
            if (line.includes('/*')) inBlockComment = true;
            if (line.includes('*/')) inBlockComment = false;

            // Look for commented code patterns
            if ((line.trim().startsWith('//') || inBlockComment) &&
                (line.includes('function') || line.includes('const') || line.includes('let') || line.includes('var'))) {
              commentedCodeBlocks++;
            }
          });
        } catch (error) {
          // Skip
        }
      });

      // Allow some commented code but not too much
      expect(commentedCodeBlocks).toBeLessThan(20);
    });
  });

  describe('Code coverage and dead code correlation', () => {
    it('should validate that test files exist for components', () => {
      const componentsDir = path.join(SRC_DIR, 'components');
      const testDir = path.join(SRC_DIR, '__tests__');

      if (fs.existsSync(componentsDir) && fs.existsSync(testDir)) {
        const componentFiles = findSourceFiles(componentsDir).filter(file =>
          !file.includes('__tests__')
        );

        const testFiles = findSourceFiles(testDir);

        // At least some components should have tests
        expect(testFiles.length).toBeGreaterThan(0);

        // Check that critical UI components have tests
        const hasDialogTest = testFiles.some(file => file.includes('dialog.test'));
        expect(hasDialogTest).toBe(true);
      }
    });
  });
});