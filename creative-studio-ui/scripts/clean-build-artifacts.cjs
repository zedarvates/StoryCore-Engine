#!/usr/bin/env node

/**
 * Clean Build Artifacts Script
 * 
 * Removes compiled JavaScript files from the source directory to prevent
 * module resolution conflicts between TypeScript source files and compiled artifacts.
 * 
 * Usage:
 *   node scripts/clean-build-artifacts.cjs [options]
 * 
 * Options:
 *   --dry-run       Preview what would be deleted without actually deleting
 *   --verbose       Show detailed logging of operations
 *   --target-dir    Specify directory to clean (default: 'src')
 *   --help          Show this help message
 * 
 * Examples:
 *   node scripts/clean-build-artifacts.cjs
 *   node scripts/clean-build-artifacts.cjs --dry-run
 *   node scripts/clean-build-artifacts.cjs --verbose
 *   node scripts/clean-build-artifacts.cjs --target-dir src --verbose
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    verbose: false,
    targetDir: 'src',
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--target-dir') {
      if (i + 1 < args.length) {
        options.targetDir = args[++i];
      } else {
        console.error('Error: --target-dir requires a directory path');
        process.exit(1);
      }
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      console.error(`Error: Unknown option '${arg}'`);
      console.error('Run with --help to see available options');
      process.exit(1);
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Clean Build Artifacts Script

Removes compiled JavaScript files from the source directory to prevent
module resolution conflicts between TypeScript source files and compiled artifacts.

Usage:
  node scripts/clean-build-artifacts.cjs [options]

Options:
  --dry-run       Preview what would be deleted without actually deleting
  --verbose       Show detailed logging of operations
  --target-dir    Specify directory to clean (default: 'src')
  --help          Show this help message

Examples:
  node scripts/clean-build-artifacts.cjs
  node scripts/clean-build-artifacts.cjs --dry-run
  node scripts/clean-build-artifacts.cjs --verbose
  node scripts/clean-build-artifacts.cjs --target-dir src --verbose
`);
}

/**
 * Check if a file should be preserved (root-level config files)
 */
function shouldPreserveFile(filePath, targetDir) {
  const relativePath = path.relative(process.cwd(), filePath);
  const fileName = path.basename(filePath);
  
  // Preserve root-level config files
  const isRootLevel = !relativePath.includes(path.sep) || relativePath.split(path.sep).length === 1;
  const isConfigFile = fileName.endsWith('.config.js') || 
                       fileName.endsWith('.config.ts') ||
                       fileName === 'vite.config.js' ||
                       fileName === 'vite.config.ts' ||
                       fileName === 'vitest.config.js' ||
                       fileName === 'vitest.config.ts' ||
                       fileName === 'tailwind.config.js' ||
                       fileName === 'postcss.config.js' ||
                       fileName === 'eslint.config.js';
  
  if (isRootLevel && isConfigFile) {
    return true;
  }
  
  // Don't clean files outside the target directory
  if (!relativePath.startsWith(targetDir)) {
    return true;
  }
  
  return false;
}

/**
 * Recursively traverse directory and collect files to remove
 */
function findFilesToRemove(dir, targetDir, options) {
  const filesToRemove = [];
  const errors = [];
  
  // Directories to exclude from scanning
  const excludeDirs = ['node_modules', 'dist', 'dist-ssr', '.git', 'coverage', 'build'];
  
  function traverse(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (excludeDirs.includes(entry.name)) {
            if (options.verbose) {
              console.log(`Skipping excluded directory: ${fullPath}`);
            }
            continue;
          }
          
          // Recursively traverse subdirectories
          traverse(fullPath);
        } else if (entry.isFile()) {
          const fileName = entry.name;
          
          // Match .js and .js.map files
          if (fileName.endsWith('.js') || fileName.endsWith('.js.map')) {
            // Check if file should be preserved
            if (shouldPreserveFile(fullPath, targetDir)) {
              if (options.verbose) {
                console.log(`Preserving: ${fullPath}`);
              }
              continue;
            }
            
            filesToRemove.push(fullPath);
          }
        }
      }
    } catch (error) {
      errors.push({
        path: currentDir,
        error: error.message,
        code: error.code
      });
    }
  }
  
  traverse(dir);
  
  return { filesToRemove, errors };
}

/**
 * Remove files with error handling
 */
function removeFiles(files, options) {
  const filesRemoved = [];
  const errors = [];
  
  for (const filePath of files) {
    try {
      if (options.dryRun) {
        if (options.verbose) {
          console.log(`[DRY RUN] Would remove: ${filePath}`);
        }
        filesRemoved.push(filePath);
      } else {
        fs.unlinkSync(filePath);
        if (options.verbose) {
          console.log(`Removed: ${filePath}`);
        }
        filesRemoved.push(filePath);
      }
    } catch (error) {
      const errorInfo = {
        path: filePath,
        error: error.message,
        code: error.code
      };
      
      errors.push(errorInfo);
      
      // Log error with context
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        console.error(`Permission denied: ${filePath}`);
        console.error('  Try running with elevated permissions or close any programs using this file');
      } else if (error.code === 'EBUSY') {
        console.error(`File is locked: ${filePath}`);
        console.error('  Close any programs using this file and try again');
      } else {
        console.error(`Error removing ${filePath}: ${error.message}`);
      }
    }
  }
  
  return { filesRemoved, errors };
}

/**
 * Main cleanup function
 */
function cleanBuildArtifacts(options) {
  const startTime = Date.now();
  
  // Resolve target directory
  const targetDir = path.resolve(process.cwd(), options.targetDir);
  
  // Check if target directory exists
  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Target directory does not exist: ${targetDir}`);
    return {
      filesRemoved: [],
      errors: [{ path: targetDir, error: 'Directory does not exist', code: 'ENOENT' }],
      duration: 0
    };
  }
  
  // Log operation start
  if (options.verbose || options.dryRun) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Clean Build Artifacts${options.dryRun ? ' [DRY RUN]' : ''}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Target directory: ${targetDir}`);
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);
  }
  
  // Find files to remove
  const { filesToRemove, errors: scanErrors } = findFilesToRemove(targetDir, options.targetDir, options);
  
  if (options.verbose) {
    console.log(`\nFound ${filesToRemove.length} file(s) to remove`);
    if (scanErrors.length > 0) {
      console.log(`Encountered ${scanErrors.length} error(s) during scan`);
    }
    console.log('');
  }
  
  // Remove files
  const { filesRemoved, errors: removeErrors } = removeFiles(filesToRemove, options);
  
  // Calculate duration
  const duration = Date.now() - startTime;
  
  // Combine all errors
  const allErrors = [...scanErrors, ...removeErrors];
  
  // Report results
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Cleanup ${options.dryRun ? 'Preview ' : ''}Complete`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Files ${options.dryRun ? 'to be removed' : 'removed'}: ${filesRemoved.length}`);
  console.log(`Errors encountered: ${allErrors.length}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Log errors summary
  if (allErrors.length > 0) {
    console.error('Errors:');
    allErrors.forEach((err, index) => {
      console.error(`  ${index + 1}. ${err.path}`);
      console.error(`     ${err.error} (${err.code || 'UNKNOWN'})`);
    });
    console.error('');
  }
  
  return {
    filesRemoved,
    errors: allErrors,
    duration
  };
}

/**
 * Main entry point
 */
function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  const result = cleanBuildArtifacts(options);
  
  // Exit with error code if there were errors
  if (result.errors.length > 0) {
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  cleanBuildArtifacts,
  parseArgs,
  shouldPreserveFile,
  findFilesToRemove,
  removeFiles
};
