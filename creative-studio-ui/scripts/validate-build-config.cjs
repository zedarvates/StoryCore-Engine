#!/usr/bin/env node

/**
 * Build Configuration Validation Script
 * 
 * Validates the build configuration to detect issues that could cause
 * TypeScript/JavaScript compilation conflicts and module resolution errors.
 * 
 * Checks:
 * - .js files in src/ directory
 * - TypeScript configuration (noEmit, outDir settings)
 * - .gitignore patterns for build artifacts
 * 
 * Usage:
 *   node scripts/validate-build-config.cjs [options]
 * 
 * Options:
 *   --ci            CI mode (strict, no prompts, exit codes)
 *   --fix           Attempt automatic fixes where possible
 *   --verbose       Show detailed logging
 *   --help          Show this help message
 * 
 * Exit Codes:
 *   0 - Validation passed
 *   1 - Validation failed (errors detected)
 * 
 * Examples:
 *   node scripts/validate-build-config.cjs
 *   node scripts/validate-build-config.cjs --ci
 *   node scripts/validate-build-config.cjs --fix
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    ci: false,
    fix: false,
    verbose: false,
    help: false
  };

  for (const arg of args) {
    if (arg === '--ci') {
      options.ci = true;
    } else if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
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
Build Configuration Validation Script

Validates the build configuration to detect issues that could cause
TypeScript/JavaScript compilation conflicts and module resolution errors.

Usage:
  node scripts/validate-build-config.cjs [options]

Options:
  --ci            CI mode (strict, no prompts, exit codes)
  --fix           Attempt automatic fixes where possible
  --verbose       Show detailed logging
  --help          Show this help message

Exit Codes:
  0 - Validation passed
  1 - Validation failed (errors detected)

Examples:
  node scripts/validate-build-config.cjs
  node scripts/validate-build-config.cjs --ci
  node scripts/validate-build-config.cjs --fix
`);
}

/**
 * Scan src/ directory for .js files
 */
function detectJsFilesInSrc(options) {
  const srcDir = path.resolve(process.cwd(), 'src');
  const jsFiles = [];
  const errors = [];
  
  if (!fs.existsSync(srcDir)) {
    return {
      jsFiles: [],
      errors: [{ message: 'src/ directory does not exist', severity: 'warning' }]
    };
  }
  
  // Directories to exclude
  const excludeDirs = ['node_modules', 'dist', 'dist-ssr', '.git', 'coverage', 'build'];
  
  function traverse(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (excludeDirs.includes(entry.name)) {
            continue;
          }
          traverse(fullPath);
        } else if (entry.isFile()) {
          // Check for .js files (but not .config.js files)
          if (entry.name.endsWith('.js') && !entry.name.endsWith('.config.js')) {
            const relativePath = path.relative(process.cwd(), fullPath);
            jsFiles.push(relativePath);
          }
        }
      }
    } catch (error) {
      errors.push({
        message: `Error scanning directory ${dir}: ${error.message}`,
        severity: 'error'
      });
    }
  }
  
  traverse(srcDir);
  
  return { jsFiles, errors };
}

/**
 * Parse and validate TypeScript configuration files
 */
function validateTsConfig(options) {
  const issues = [];
  const warnings = [];
  
  // TypeScript config files to check
  const tsConfigFiles = [
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'tsconfig.test.json'
  ];
  
  for (const configFile of tsConfigFiles) {
    const configPath = path.resolve(process.cwd(), configFile);
    
    if (!fs.existsSync(configPath)) {
      if (options.verbose) {
        console.log(`  Skipping ${configFile} (not found)`);
      }
      continue;
    }
    
    try {
      // Read file content
      const content = fs.readFileSync(configPath, 'utf8');
      
      // Use a simple regex-based approach to extract key values
      // This avoids complex JSON parsing issues with comments
      let config = null;
      
      // Try standard JSON parse first (works if no comments)
      try {
        config = JSON.parse(content);
      } catch (e) {
        // If that fails, use regex to extract the values we need
        // This is more robust than trying to clean the JSON
        config = {
          compilerOptions: {},
          exclude: []
        };
        
        // Extract noEmit value
        const noEmitMatch = content.match(/"noEmit"\s*:\s*(true|false)/);
        if (noEmitMatch) {
          config.compilerOptions.noEmit = noEmitMatch[1] === 'true';
        }
        
        // Extract outDir value
        const outDirMatch = content.match(/"outDir"\s*:\s*"([^"]+)"/);
        if (outDirMatch) {
          config.compilerOptions.outDir = outDirMatch[1];
        }
        
        // Extract declarationDir value
        const declDirMatch = content.match(/"declarationDir"\s*:\s*"([^"]+)"/);
        if (declDirMatch) {
          config.compilerOptions.declarationDir = declDirMatch[1];
        }
        
        // Extract exclude array (simplified)
        const excludeMatch = content.match(/"exclude"\s*:\s*\[([\s\S]*?)\]/);
        if (excludeMatch) {
          const excludeContent = excludeMatch[1];
          const excludeItems = excludeContent.match(/"([^"]+)"/g);
          if (excludeItems) {
            config.exclude = excludeItems.map(item => item.replace(/"/g, ''));
          }
        }
      }
      
      const compilerOptions = config.compilerOptions || {};
      
      // Check noEmit setting
      const hasNoEmit = compilerOptions.noEmit === true;
      const outDir = compilerOptions.outDir;
      const declarationDir = compilerOptions.declarationDir;
      
      // Validate: either noEmit should be true, or outDir should not point to src/
      if (!hasNoEmit) {
        if (outDir && (outDir.includes('src') || outDir === 'src')) {
          issues.push({
            type: 'tsconfig-emit',
            severity: 'error',
            message: `${configFile}: outDir points to src/ directory`,
            file: configPath,
            fix: `Set "noEmit": true or change "outDir" to "dist"`
          });
        } else if (!outDir) {
          warnings.push({
            type: 'tsconfig-emit',
            severity: 'warning',
            message: `${configFile}: noEmit is false and no outDir specified`,
            file: configPath,
            fix: `Set "noEmit": true in ${configFile}`
          });
        }
      }
      
      // Check if declarationDir points to src/
      if (declarationDir && (declarationDir.includes('src') || declarationDir === 'src')) {
        issues.push({
          type: 'tsconfig-emit',
          severity: 'error',
          message: `${configFile}: declarationDir points to src/ directory`,
          file: configPath,
          fix: `Remove "declarationDir" or set it to "dist"`
        });
      }
      
      // Check exclude array
      const exclude = config.exclude || [];
      if (!exclude.includes('dist') && !exclude.includes('dist/')) {
        warnings.push({
          type: 'tsconfig-exclude',
          severity: 'warning',
          message: `${configFile}: exclude array should include "dist"`,
          file: configPath,
          fix: `Add "dist" to exclude array in ${configFile}`
        });
      }
      
      if (options.verbose) {
        console.log(`  ✓ Validated ${configFile}`);
      }
      
    } catch (error) {
      // Catch file read errors
      issues.push({
        type: 'tsconfig-read',
        severity: 'error',
        message: `Failed to read ${configFile}: ${error.message}`,
        file: configPath,
        fix: 'Check file permissions'
      });
    }
  }
  
  return { issues, warnings };
}

/**
 * Validate .gitignore patterns
 */
function validateGitIgnore(options) {
  const issues = [];
  const warnings = [];
  const gitignorePath = path.resolve(process.cwd(), '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    issues.push({
      type: 'gitignore-missing',
      severity: 'error',
      message: '.gitignore file not found',
      file: gitignorePath,
      fix: 'Create .gitignore file with appropriate patterns'
    });
    return { issues, warnings, missingPatterns: [] };
  }
  
  try {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const lines = content.split('\n').map(line => line.trim());
    
    // Required patterns
    const requiredPatterns = [
      { pattern: 'src/**/*.js', description: 'Compiled .js files in src/' },
      { pattern: 'dist/', description: 'Build output directory' },
      { pattern: 'dist', description: 'Build output directory (alternative)' }
    ];
    
    const missingPatterns = [];
    
    for (const { pattern, description } of requiredPatterns) {
      // Check if pattern exists (exact match or similar)
      const hasPattern = lines.some(line => {
        // Exact match
        if (line === pattern) return true;
        
        // For dist, accept both "dist" and "dist/"
        if (pattern === 'dist/' && line === 'dist') return true;
        if (pattern === 'dist' && line === 'dist/') return true;
        
        return false;
      });
      
      if (!hasPattern) {
        // Special handling for dist/ - only report if neither variant exists
        if (pattern === 'dist' && lines.includes('dist/')) {
          continue;
        }
        if (pattern === 'dist/' && lines.includes('dist')) {
          continue;
        }
        
        missingPatterns.push({ pattern, description });
        
        issues.push({
          type: 'gitignore-pattern',
          severity: 'error',
          message: `.gitignore missing pattern: ${pattern}`,
          file: gitignorePath,
          fix: `Add "${pattern}" to .gitignore`,
          pattern
        });
      }
    }
    
    // Optional but recommended patterns
    const recommendedPatterns = [
      'src/**/*.js.map',
      'src/**/*.d.ts',
      '*.tsbuildinfo'
    ];
    
    for (const pattern of recommendedPatterns) {
      if (!lines.includes(pattern)) {
        warnings.push({
          type: 'gitignore-pattern',
          severity: 'warning',
          message: `.gitignore missing recommended pattern: ${pattern}`,
          file: gitignorePath,
          fix: `Consider adding "${pattern}" to .gitignore`
        });
      }
    }
    
    if (options.verbose) {
      console.log(`  ✓ Validated .gitignore`);
    }
    
    return { issues, warnings, missingPatterns };
    
  } catch (error) {
    issues.push({
      type: 'gitignore-read',
      severity: 'error',
      message: `Failed to read .gitignore: ${error.message}`,
      file: gitignorePath,
      fix: 'Check file permissions'
    });
    return { issues, warnings, missingPatterns: [] };
  }
}

/**
 * Attempt automatic fixes
 */
function applyFixes(validationResult, options) {
  const fixed = [];
  const failedFixes = [];
  
  // Fix .gitignore patterns
  if (validationResult.gitignore.missingPatterns.length > 0) {
    try {
      const gitignorePath = path.resolve(process.cwd(), '.gitignore');
      let content = '';
      
      if (fs.existsSync(gitignorePath)) {
        content = fs.readFileSync(gitignorePath, 'utf8');
      }
      
      // Add missing patterns
      const patternsToAdd = validationResult.gitignore.missingPatterns
        .filter(p => p.pattern !== 'dist') // Skip 'dist' if we're adding 'dist/'
        .map(p => p.pattern);
      
      if (patternsToAdd.length > 0) {
        // Ensure file ends with newline
        if (content && !content.endsWith('\n')) {
          content += '\n';
        }
        
        // Add header comment
        content += '\n# TypeScript build artifacts (added by validate-build-config)\n';
        
        // Add patterns
        for (const pattern of patternsToAdd) {
          content += `${pattern}\n`;
        }
        
        fs.writeFileSync(gitignorePath, content, 'utf8');
        
        fixed.push({
          type: 'gitignore-patterns',
          message: `Added ${patternsToAdd.length} missing pattern(s) to .gitignore`,
          patterns: patternsToAdd
        });
      }
      
    } catch (error) {
      failedFixes.push({
        type: 'gitignore-fix',
        message: `Failed to update .gitignore: ${error.message}`
      });
    }
  }
  
  return { fixed, failedFixes };
}

/**
 * Format output for CI mode
 */
function formatCIOutput(validationResult) {
  const lines = [];
  
  lines.push('::group::Build Configuration Validation');
  
  // JS files in src/
  if (validationResult.jsFiles.length > 0) {
    lines.push('::error::Found compiled .js files in src/ directory');
    validationResult.jsFiles.forEach(file => {
      lines.push(`::error file=${file}::Compiled artifact in source directory`);
    });
  }
  
  // TypeScript config issues
  validationResult.tsconfig.issues.forEach(issue => {
    lines.push(`::error file=${issue.file}::${issue.message}`);
  });
  
  // .gitignore issues
  validationResult.gitignore.issues.forEach(issue => {
    lines.push(`::error file=${issue.file}::${issue.message}`);
  });
  
  // Warnings
  const allWarnings = [
    ...validationResult.tsconfig.warnings,
    ...validationResult.gitignore.warnings
  ];
  
  allWarnings.forEach(warning => {
    lines.push(`::warning file=${warning.file}::${warning.message}`);
  });
  
  lines.push('::endgroup::');
  
  return lines.join('\n');
}

/**
 * Main validation function
 */
function validateBuildConfig(options) {
  const startTime = Date.now();
  
  if (!options.ci) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('Build Configuration Validation');
    console.log(`${'='.repeat(60)}\n`);
  }
  
  // 1. Check for .js files in src/
  if (options.verbose || !options.ci) {
    console.log('Checking for .js files in src/...');
  }
  const jsFilesResult = detectJsFilesInSrc(options);
  
  // 2. Validate TypeScript configuration
  if (options.verbose || !options.ci) {
    console.log('Validating TypeScript configuration...');
  }
  const tsconfigResult = validateTsConfig(options);
  
  // 3. Validate .gitignore
  if (options.verbose || !options.ci) {
    console.log('Validating .gitignore patterns...');
  }
  const gitignoreResult = validateGitIgnore(options);
  
  // Compile results
  const validationResult = {
    jsFiles: jsFilesResult.jsFiles,
    tsconfig: tsconfigResult,
    gitignore: gitignoreResult,
    errors: jsFilesResult.errors
  };
  
  // Apply fixes if requested
  let fixResult = null;
  if (options.fix) {
    if (!options.ci) {
      console.log('\nAttempting automatic fixes...');
    }
    fixResult = applyFixes(validationResult, options);
  }
  
  // Calculate if validation passed
  const hasErrors = 
    validationResult.jsFiles.length > 0 ||
    validationResult.tsconfig.issues.length > 0 ||
    validationResult.gitignore.issues.length > 0 ||
    validationResult.errors.length > 0;
  
  const valid = !hasErrors;
  
  // Format output
  if (options.ci) {
    // CI mode output
    console.log(formatCIOutput(validationResult));
  } else {
    // Human-readable output
    console.log(`\n${'='.repeat(60)}`);
    console.log('Validation Results');
    console.log(`${'='.repeat(60)}\n`);
    
    // Report .js files in src/
    if (validationResult.jsFiles.length > 0) {
      console.log(`❌ Found ${validationResult.jsFiles.length} compiled .js file(s) in src/:\n`);
      validationResult.jsFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
      console.log(`\n  Fix: Run 'npm run clean' to remove these files\n`);
    } else {
      console.log('✓ No .js files found in src/\n');
    }
    
    // Report TypeScript config issues
    if (validationResult.tsconfig.issues.length > 0) {
      console.log(`❌ TypeScript configuration issues:\n`);
      validationResult.tsconfig.issues.forEach(issue => {
        console.log(`  ${issue.severity.toUpperCase()}: ${issue.message}`);
        if (issue.file) console.log(`    File: ${issue.file}`);
        if (issue.fix) console.log(`    Fix: ${issue.fix}`);
        console.log('');
      });
    } else {
      console.log('✓ TypeScript configuration is correct\n');
    }
    
    // Report .gitignore issues
    if (validationResult.gitignore.issues.length > 0) {
      console.log(`❌ .gitignore issues:\n`);
      validationResult.gitignore.issues.forEach(issue => {
        console.log(`  ${issue.severity.toUpperCase()}: ${issue.message}`);
        if (issue.fix) console.log(`    Fix: ${issue.fix}`);
        console.log('');
      });
    } else {
      console.log('✓ .gitignore patterns are correct\n');
    }
    
    // Report warnings
    const allWarnings = [
      ...validationResult.tsconfig.warnings,
      ...validationResult.gitignore.warnings
    ];
    
    if (allWarnings.length > 0) {
      console.log(`⚠️  Warnings:\n`);
      allWarnings.forEach(warning => {
        console.log(`  - ${warning.message}`);
        if (warning.fix) console.log(`    ${warning.fix}`);
      });
      console.log('');
    }
    
    // Report fixes applied
    if (fixResult && fixResult.fixed.length > 0) {
      console.log(`✓ Applied ${fixResult.fixed.length} automatic fix(es):\n`);
      fixResult.fixed.forEach(fix => {
        console.log(`  - ${fix.message}`);
        if (fix.patterns) {
          fix.patterns.forEach(p => console.log(`    • ${p}`));
        }
      });
      console.log('');
    }
    
    if (fixResult && fixResult.failedFixes.length > 0) {
      console.log(`❌ Failed to apply ${fixResult.failedFixes.length} fix(es):\n`);
      fixResult.failedFixes.forEach(fix => {
        console.log(`  - ${fix.message}`);
      });
      console.log('');
    }
    
    // Summary
    console.log(`${'='.repeat(60)}`);
    if (valid) {
      console.log('✅ Build configuration is valid\n');
    } else {
      console.log('❌ Build configuration validation failed\n');
      console.log('Run with --fix to attempt automatic repairs');
      console.log('Some issues may require manual intervention\n');
    }
    console.log(`Duration: ${Date.now() - startTime}ms`);
    console.log(`${'='.repeat(60)}\n`);
  }
  
  return {
    valid,
    issues: [
      ...validationResult.tsconfig.issues,
      ...validationResult.gitignore.issues
    ],
    warnings: [
      ...validationResult.tsconfig.warnings,
      ...validationResult.gitignore.warnings
    ],
    jsFiles: validationResult.jsFiles,
    fixes: fixResult
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
  
  const result = validateBuildConfig(options);
  
  // Exit with appropriate code
  if (result.valid) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  validateBuildConfig,
  parseArgs,
  detectJsFilesInSrc,
  validateTsConfig,
  validateGitIgnore,
  applyFixes,
  formatCIOutput
};
