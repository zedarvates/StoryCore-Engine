# Automated TypeScript Error Cleanup Guide

This guide provides step-by-step instructions for using automated tools to fix the remaining ~310 unused code errors in the creative-studio-ui project.

## Current Status

- **Total Errors:** 389
- **Unused Code Errors:** ~310 (80%)
- **Other Errors:** ~79 (20%)

## Option 1: ESLint Auto-Fix (Recommended)

ESLint can automatically remove unused imports and variables.

### Step 1: Check ESLint Configuration

Verify that your `eslint.config.js` has the unused variable rules enabled:

```javascript
// Should include these rules:
{
  '@typescript-eslint/no-unused-vars': ['error', {
    'argsIgnorePattern': '^_',
    'varsIgnorePattern': '^_',
    'caughtErrorsIgnorePattern': '^_'
  }]
}
```

### Step 2: Run ESLint Auto-Fix

```bash
# Navigate to creative-studio-ui directory
cd creative-studio-ui

# Run ESLint with auto-fix on all TypeScript files
npx eslint --fix "src/**/*.{ts,tsx}"

# Or fix specific directories
npx eslint --fix "src/components/**/*.{ts,tsx}"
npx eslint --fix "src/services/**/*.{ts,tsx}"
npx eslint --fix "src/hooks/**/*.{ts,tsx}"
```

### Step 3: Verify Results

```bash
# Run TypeScript compiler to check remaining errors
npm run build

# Count remaining errors
npm run build 2>&1 | Select-String "error TS" | Measure-Object
```

## Option 2: TypeScript Compiler with --noUnusedLocals

The TypeScript compiler can identify unused code, but won't auto-fix. Use this to identify what needs manual fixing.

### Generate Error Report

```bash
# Generate detailed error report
npm run build 2>&1 > typescript-errors.txt

# Filter for unused code errors only
npm run build 2>&1 | Select-String "TS6133|TS6196" > unused-code-errors.txt
```

## Option 3: VS Code Quick Fix

If you're using VS Code, you can use the built-in quick fix feature:

### Bulk Fix in VS Code

1. Open the Problems panel (Ctrl+Shift+M / Cmd+Shift+M)
2. Filter for "TS6133" or "TS6196" errors
3. Right-click on an error → "Fix all in file"
4. Repeat for each file with unused code errors

### VS Code Settings for Auto-Fix on Save

Add to `.vscode/settings.json`:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.autoImportFileExcludePatterns": [
    "**/*.test.ts",
    "**/*.test.tsx"
  ]
}
```

## Option 4: Manual Cleanup Script

For more control, create a custom cleanup script:

### Create cleanup-unused.js

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TypeScript files
const getAllTsFiles = (dir) => {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.includes('node_modules')) {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.name.endsWith('.ts') || item.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
};

// Run ESLint fix on each file
const files = getAllTsFiles('./src');
console.log(`Found ${files.length} TypeScript files`);

let fixed = 0;
for (const file of files) {
  try {
    execSync(`npx eslint --fix "${file}"`, { stdio: 'pipe' });
    fixed++;
    if (fixed % 10 === 0) {
      console.log(`Fixed ${fixed}/${files.length} files...`);
    }
  } catch (error) {
    // ESLint returns non-zero exit code if there are errors
    // Continue anyway
  }
}

console.log(`Completed! Fixed ${fixed} files.`);
```

### Run the script

```bash
node cleanup-unused.js
```

## Specific Patterns to Fix

### Pattern 1: Unused Imports

**Before:**
```typescript
import React, { useState, useEffect } from 'react';
import { Button } from './Button';

export function MyComponent() {
  return <div>Hello</div>;
}
```

**After:**
```typescript
export function MyComponent() {
  return <div>Hello</div>;
}
```

### Pattern 2: Unused Variables

**Before:**
```typescript
const [value, setValue] = useState(0);
const unused = 'test';

return <div>{value}</div>;
```

**After:**
```typescript
const [value] = useState(0);

return <div>{value}</div>;
```

### Pattern 3: Unused Function Parameters

**Before:**
```typescript
function handleClick(event: React.MouseEvent, index: number) {
  console.log('clicked');
}
```

**After (if parameter is required by interface):**
```typescript
function handleClick(_event: React.MouseEvent, _index: number) {
  console.log('clicked');
}
```

**After (if parameter is not required):**
```typescript
function handleClick() {
  console.log('clicked');
}
```

### Pattern 4: Unused Destructured Properties

**Before:**
```typescript
const { name, age, email } = user;
return <div>{name}</div>;
```

**After:**
```typescript
const { name } = user;
return <div>{name}</div>;
```

## Handling Special Cases

### Test Files

Test files often have intentionally unused variables (mocks, setup). Prefix with underscore:

```typescript
// Before
const mockFn = vi.fn();

// After (if truly unused)
const _mockFn = vi.fn();
```

### Interface Requirements

If a parameter is required by an interface but unused, prefix with underscore:

```typescript
// Interface requires all parameters
interface Handler {
  onClick: (event: MouseEvent, index: number) => void;
}

// Implementation doesn't use all parameters
const handler: Handler = {
  onClick: (_event, index) => {
    console.log(index);
  }
};
```

### React Imports

In React 17+, you don't need to import React for JSX:

```typescript
// Before
import React from 'react';

export function Component() {
  return <div>Hello</div>;
}

// After
export function Component() {
  return <div>Hello</div>;
}
```

## Verification Steps

After running automated cleanup:

### 1. Check Error Count

```bash
npm run build 2>&1 | Select-String "error TS" | Measure-Object
```

Expected result: ~79 errors (down from 389)

### 2. Run Tests

```bash
npm test
```

Ensure no tests are broken by the cleanup.

### 3. Check Git Diff

```bash
git diff --stat
```

Review the changes to ensure nothing important was removed.

### 4. Spot Check Critical Files

Manually review changes in:
- `src/store/index.ts`
- `src/services/llmService.ts`
- `src/components/gridEditor/GridEditorCanvas.tsx`

## Rollback Plan

If automated cleanup causes issues:

```bash
# Discard all changes
git checkout .

# Or restore specific files
git checkout src/path/to/file.ts
```

## Expected Results

After automated cleanup:

- **Unused imports removed:** ~150 errors fixed
- **Unused variables removed:** ~100 errors fixed
- **Unused parameters prefixed:** ~60 errors fixed
- **Remaining errors:** ~79 (test issues, type mismatches)

## Next Steps After Cleanup

Once unused code is cleaned up, the remaining ~79 errors will be:

1. **WizardProvider test issues** (~40 errors)
   - Need to add `onComplete` prop to WizardProviderProps interface
   - Or remove from test files

2. **OllamaClient type issues** (~2 errors)
   - `num_predict` property not in type definition
   - Need to update OllamaRequest interface

3. **PlaybackEngine test issues** (~2 errors)
   - Type incompatibility in test data
   - Need to fix test shot data structure

4. **Other minor issues** (~35 errors)
   - Various small type mismatches
   - Can be fixed individually

## Troubleshooting

### ESLint Not Removing Imports

If ESLint doesn't remove unused imports:

```bash
# Check if the rule is enabled
npx eslint --print-config src/components/App.tsx | grep "no-unused"

# Try with explicit rule
npx eslint --fix --rule '@typescript-eslint/no-unused-vars: error' "src/**/*.{ts,tsx}"
```

### Too Many Changes at Once

If you want to be more conservative:

```bash
# Fix one directory at a time
npx eslint --fix "src/components/**/*.{ts,tsx}"
git add -A && git commit -m "fix: remove unused code in components"

npx eslint --fix "src/services/**/*.{ts,tsx}"
git add -A && git commit -m "fix: remove unused code in services"

# And so on...
```

### Preserve Intentionally Unused Code

Add ESLint disable comments:

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const futureFeature = 'coming soon';
```

## Summary

The recommended approach is:

1. **Run ESLint auto-fix** on all source files
2. **Verify** with TypeScript compiler
3. **Run tests** to ensure nothing broke
4. **Review** git diff for any unexpected changes
5. **Commit** the cleanup

This should reduce errors from 389 to ~79, making the remaining issues much more manageable for manual fixes.
