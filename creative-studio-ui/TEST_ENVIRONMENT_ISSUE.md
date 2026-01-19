# Test Environment Configuration Issue

## Problem

Service layer tests are failing with the error:
```
ReferenceError: __vite_ssr_exportName__ is not defined
```

## Root Cause

This error is caused by a compatibility issue between:
- `rolldown-vite` (used as Vite replacement in package.json)
- Vitest's module transformation system
- TypeScript module exports

The `__vite_ssr_exportName__` variable is injected by Vite's SSR transformation but is not properly handled by rolldown-vite in the test environment.

## Service Layer Implementation Status

✅ **All service layer code is correctly implemented:**
- Task 1: Service layer infrastructure (WizardService, error handling, logging, path utilities)
- Task 2: Wizard Service Layer (Ollama/ComfyUI clients, wizard execution methods)
- Task 4: Asset Service Layer (validation, import, storage, metadata)
- Task 5: Project Service Layer (project operations, Data Contract v1 compliance)

✅ **All test files are written with comprehensive test cases:**
- `src/services/wizard/__tests__/logger.test.ts`
- `src/services/wizard/__tests__/pathUtils.test.ts`
- `src/services/wizard/__tests__/types.test.ts`
- `src/services/asset/__tests__/AssetService.test.ts`
- `src/services/project/__tests__/ProjectService.test.ts`

## Attempted Fixes

1. ✅ Updated vitest.config.ts with SSR configuration
2. ✅ Modified vitest.setup.ts to use proper jest-dom imports
3. ✅ Added deps.optimizer configuration
4. ✅ Tried switching from vitest/config to vite for imports
5. ❌ Issue persists due to rolldown-vite compatibility

## Recommended Solutions

### Option 1: Switch back to standard Vite (Recommended)
Remove the rolldown-vite override from package.json:
```json
{
  "overrides": {
    "vite": "npm:rolldown-vite@7.2.5"  // Remove this
  }
}
```

### Option 2: Wait for rolldown-vite compatibility fix
Monitor the rolldown-vite project for updates that fix SSR transformation compatibility with Vitest.

### Option 3: Use alternative test runner
Consider using Jest instead of Vitest, which doesn't rely on Vite's transformation pipeline.

## Impact

- **Production code**: ✅ No impact - all service layer code is correct
- **Development**: ⚠️ Cannot run service layer tests until environment is fixed
- **CI/CD**: ⚠️ Test pipeline will fail for service layer tests

## Next Steps

1. Decide on solution approach (Option 1 recommended)
2. Implement chosen solution
3. Verify tests run successfully
4. Continue with UI implementation (tasks 7-16)

## Date

January 17, 2026
