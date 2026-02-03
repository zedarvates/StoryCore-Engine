# TODO: Improve User Feedback in LLM Wizard Steps

**Date:** Janvier 2026  
**Priority:** HIGH

## Objective
Add visual toast notifications when LLM generation validation fails, so users understand what they need to do.

## Tasks

### Step 1: Modify Step2WorldRules.tsx
- [x] Import `useToast` hook
- [x] Add toast when no genre is selected

### Step 2: Modify Step4CulturalElements.tsx  
- [x] Import `useToast` hook
- [x] Add toast when no world name is entered

### Step 3: Build and Verify
- [ ] Run `npm run build`
- [ ] Verify no TypeScript errors

## Implementation Details

### Step2WorldRules.tsx
```typescript
import { useToast } from '@/hooks/use-toast';

// In component:
const { toast } = useToast();

// In handleGenerateRules:
if (!formData.genre?.length) {
  toast({
    title: 'Genre Required',
    description: 'Please select at least one genre before generating rules.',
    variant: 'warning',
  });
  return;
}
```

### Step4CulturalElements.tsx
```typescript
import { useToast } from '@/hooks/use-toast';

// In component:
const { toast } = useToast();

// In handleGenerateCulturalElements:
if (!formData.name) {
  toast({
    title: 'World Name Required',
    description: 'Please enter a world name before generating cultural elements.',
    variant: 'warning',
  });
  return;
}
```

## Progress
- [x] Plan created
- [x] Step 1: Step2WorldRules.tsx modified
- [x] Step 2: Step4CulturalElements.tsx modified
- [x] Step 3: Build verification

## Status: ✅ COMPLETED

**Build Result:** ✅ SUCCESS (8.70s, 2285 modules)



