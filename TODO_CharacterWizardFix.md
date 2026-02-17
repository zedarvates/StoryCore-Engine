# Character Wizard Fix - TODO

## Issues to Fix:

### 1. Name Generation - Same names every time
- **File**: `creative-studio-ui/src/components/wizard/character/Step1BasicIdentity.tsx`
- **Function**: `handleGenerateName`
- **Problem**: Prompts are too similar, LLM returns same names
- **Fix**: Add unique entropy (timestamp, random seed) to prompt - ✅ COMPLETED

### 2. Appearance Generation - Fields not populated
- **File**: `creative-studio-ui/src/components/wizard/character/Step2PhysicalAppearance.tsx`
- **Function**: `handleGenerateAppearance`
- **Problem**: Same issue as name generation + parsing might fail
- **Fix**: Add unique entropy to prompt - ✅ COMPLETED

### 3. Personality Generation - Same personality every time
- **File**: `creative-studio-ui/src/components/wizard/character/Step3Personality.tsx`
- **Function**: `handleGeneratePersonality`
- **Problem**: Same issue - could return similar results
- **Fix**: Add unique entropy to prompt - ✅ COMPLETED

## Implementation Steps:

- [x] Fix Step1BasicIdentity.tsx - Add unique entropy to name generation prompts
- [x] Fix Step2PhysicalAppearance.tsx - Add unique entropy to appearance generation prompts
- [x] Fix Step3Personality.tsx - Add unique entropy to personality generation prompts

## Summary of Changes:

1. **Step1BasicIdentity.tsx**: Added unique entropy (timestamp, randomId, sessionSeed) to both Intelligent and Random name generation prompts. The prompts now include explicit instructions to generate completely unique names.

2. **Step2PhysicalAppearance.tsx**: Added unique entropy to the appearance generation prompt. This ensures each generation request is unique and should populate all fields correctly.

3. **Step3Personality.tsx**: Added unique entropy to the personality generation prompt for consistency and to ensure different results each time.

