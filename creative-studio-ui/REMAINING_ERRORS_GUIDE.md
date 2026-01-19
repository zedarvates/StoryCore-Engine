# Remaining TypeScript Errors - Manual Fix Guide

After automated cleanup of unused code, approximately 79 errors will remain. This guide provides solutions for each category.

## Error Categories

### 1. WizardProvider Test Issues (~40 errors)

**Error:** Property 'onComplete' does not exist on type 'WizardProviderProps'

**Files Affected:**
- `src/components/wizard/character/__tests__/LLMIntegration.simple.test.tsx`
- `src/components/wizard/character/__tests__/Step5Relationships.test.tsx`

**Solution Option A: Add prop to interface**

```typescript
// In src/components/wizard/WizardProvider.tsx
export interface WizardProviderProps<T> {
  children: React.ReactNode;
  initialData?: Partial<T>;
  storageKey?: string;
  onComplete?: (data: T) => void; // Add this line
}
```

**Solution Option B: Remove from tests**

```typescript
// In test files, remove onComplete prop
<WizardProvider initialData={initialData}>
  {/* test content */}
</WizardProvider>
```

**Recommended:** Option A - Add the prop to the interface as it's a useful feature for tests.

---

### 2. OllamaClient Type Issues (2 errors)

**Error:** Property 'num_predict' does not exist in type options

**File:** `src/services/wizard/OllamaClient.ts` (lines 91, 181)

**Solution:**

```typescript
// In src/services/wizard/types.ts
export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    num_predict?: number; // Add this line
    seed?: number;
  };
}
```

---

### 3. PlaybackEngine Test Type Issue (1 error)

**Error:** Type incompatibility in transitionOut.easing

**File:** `src/playback/__tests__/PlaybackEngine.test.ts` (line 290)

**Current Code:**
```typescript
const shotsWithTransition = [
  ...shots,
  {
    ...shots[0],
    transitionOut: {
      id: 'transition-1',
      type: 'fade',
      duration: 1,
      easing: 'ease-in-out', // This is correct
      direction: 'left',
    },
  },
];
```

**Solution:** Cast the easing value

```typescript
const shotsWithTransition = [
  ...shots,
  {
    ...shots[0],
    transitionOut: {
      id: 'transition-1',
      type: 'fade' as const,
      duration: 1,
      easing: 'ease-in-out' as const, // Add 'as const'
      direction: 'left' as const,
    },
  },
] as Shot[];
```

---

### 4. Memoization Utility Type Issue (1 error)

**Error:** Argument of type 'Promise<any>' is not assignable to parameter of type 'ReturnType<T>'

**File:** `src/utils/memoization.ts` (line 65)

**Current Code:**
```typescript
pending.set(key, promise);
```

**Solution:** Add type assertion

```typescript
pending.set(key, promise as ReturnType<T>);
```

Or better, fix the type definition:

```typescript
// Update the pending Map type
const pending = new Map<string, Promise<any>>();
```

---

### 5. World Interface Duplicate Properties (2 errors)

**Error:** Duplicate property declarations in World object

**File:** `src/store/index.ts` (lines 740-747)

**Current Code:**
```typescript
const world: World = {
  // ... other properties
  createdAt: new Date(),
  updatedAt: new Date(),
  technologyMagic: output.data.technology_magic || '',
  threats: output.data.threats || [],
  createdAt: new Date(output.data.created_at), // Duplicate!
  updatedAt: new Date(output.data.created_at), // Duplicate!
};
```

**Solution:** Remove duplicate lines

```typescript
const world: World = {
  id: output.data.id,
  name: output.data.name,
  genre: output.data.genre || [],
  timePeriod: output.data.time_period || '',
  tone: output.data.tone || [],
  locations: output.data.locations || [],
  rules: output.data.rules || [],
  atmosphere: output.data.lore || output.data.atmosphere || '',
  culturalElements: output.data.culture || {
    languages: [],
    religions: [],
    traditions: [],
    historicalEvents: [],
    culturalConflicts: [],
  },
  technology: output.data.technology || '',
  magic: output.data.magic || '',
  conflicts: output.data.conflicts || [],
  createdAt: new Date(output.data.created_at || Date.now()),
  updatedAt: new Date(output.data.created_at || Date.now()),
};
```

---

### 6. AudioTrack Duplicate Properties (1 error)

**Error:** Duplicate duration, fadeIn, fadeOut properties

**File:** `src/store/index.ts` (lines 694-710)

**Solution:** Remove duplicates and consolidate

```typescript
const audioTrack: AudioTrack = {
  id: `audio_${Date.now()}_${index}`,
  name: track.text || `Dialogue ${index + 1}`,
  type: 'dialogue',
  url: track.url || '',
  volume: 100,
  startTime: track.start_time || 0,
  duration: track.end_time ? track.end_time - track.start_time : shot.duration,
  offset: 0,
  fadeIn: 0,
  fadeOut: 0,
  pan: 0,
  // Remove duplicate duration, fadeIn, fadeOut below
};
```

---

### 7. Test Mock Parameter Types (~20 errors)

**Error:** Unused parameters in mock implementations

**Files:** Various test files

**Solution:** Prefix unused parameters with underscore

```typescript
// Before
mockCrypto.subtle.encrypt.mockImplementation(async (algorithm, key, data) => {
  return new ArrayBuffer(8);
});

// After
mockCrypto.subtle.encrypt.mockImplementation(async (_algorithm, _key, data) => {
  return new ArrayBuffer(8);
});
```

---

### 8. Test Helper Unused Variables (~10 errors)

**Error:** Variables declared but never used in tests

**Files:** Various test files

**Solution:** Either use the variable or remove it

```typescript
// Before
const user = userEvent.setup();
// ... test code that doesn't use 'user'

// After - Option 1: Remove if not needed
// ... test code

// After - Option 2: Prefix if needed for future
const _user = userEvent.setup();
```

---

## Batch Fix Script

Create a file `fix-remaining-errors.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';

// Fix 1: Add onComplete to WizardProviderProps
const wizardProviderPath = 'src/components/wizard/WizardProvider.tsx';
let wizardProvider = fs.readFileSync(wizardProviderPath, 'utf-8');
if (!wizardProvider.includes('onComplete?:')) {
  wizardProvider = wizardProvider.replace(
    /export interface WizardProviderProps<T> \{([^}]+)\}/,
    `export interface WizardProviderProps<T> {$1  onComplete?: (data: T) => void;\n}`
  );
  fs.writeFileSync(wizardProviderPath, wizardProvider);
  console.log('✓ Fixed WizardProviderProps');
}

// Fix 2: Add num_predict to OllamaRequest
const ollamaTypesPath = 'src/services/wizard/types.ts';
let ollamaTypes = fs.readFileSync(ollamaTypesPath, 'utf-8');
if (!ollamaTypes.includes('num_predict?:')) {
  ollamaTypes = ollamaTypes.replace(
    /options\?: \{([^}]+)\}/,
    `options?: {$1    num_predict?: number;\n  }`
  );
  fs.writeFileSync(ollamaTypesPath, ollamaTypes);
  console.log('✓ Fixed OllamaRequest');
}

// Fix 3: Fix PlaybackEngine test
const playbackTestPath = 'src/playback/__tests__/PlaybackEngine.test.ts';
let playbackTest = fs.readFileSync(playbackTestPath, 'utf-8');
playbackTest = playbackTest.replace(
  /easing: 'ease-in-out'/g,
  "easing: 'ease-in-out' as const"
);
fs.writeFileSync(playbackTestPath, playbackTest);
console.log('✓ Fixed PlaybackEngine test');

console.log('\nAll fixes applied! Run npm run build to verify.');
```

Run with:
```bash
npx ts-node fix-remaining-errors.ts
```

---

## Verification Checklist

After applying fixes:

- [ ] Run `npm run build` - should show 0 errors
- [ ] Run `npm test` - all tests should pass
- [ ] Check `git diff` - review all changes
- [ ] Test key features manually
- [ ] Commit changes with descriptive message

---

## Expected Final State

After all fixes:
- **TypeScript errors:** 0
- **Build:** Successful
- **Tests:** All passing
- **Code quality:** Maintained
- **Type safety:** Fully enforced

---

## If You Get Stuck

1. **Check the error message carefully** - TypeScript errors are usually very specific
2. **Look at the type definition** - Use "Go to Definition" in your IDE
3. **Check similar code** - See how it's handled elsewhere in the codebase
4. **Use type assertions sparingly** - Only when you're certain the type is correct
5. **Ask for help** - Include the specific error message and file location

---

## Summary

The remaining errors after automated cleanup are:
1. **40 errors** - WizardProvider tests (1 interface change fixes all)
2. **20 errors** - Test mock parameters (prefix with underscore)
3. **10 errors** - Test helper variables (remove or prefix)
4. **5 errors** - Duplicate properties (remove duplicates)
5. **2 errors** - OllamaClient types (1 interface change fixes both)
6. **2 errors** - Other minor issues (individual fixes)

Total estimated time to fix manually: **30-45 minutes**

Or use the batch fix script: **5 minutes**
