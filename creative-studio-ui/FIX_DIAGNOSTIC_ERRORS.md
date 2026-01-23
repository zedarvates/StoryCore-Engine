# Diagnostic Errors Fix Plan

## Files to Fix:

### 1. accessibility/index.tsx
- [ ] Fix aria-live/aria-atomic on line 117 (expression → 'polite')
- [ ] Fix aria-selected/aria-disabled on line 403 (expression → boolean)
- [ ] Fix useState missing initialValue on line 471
- [ ] Remove unused 'priority' variable on line 168

### 2. i18n.ts (CRITICAL - ~150 errors)
- [ ] Remove corrupted JSX template code (lines 262-407)
- [ ] The LanguageSelector component export is duplicated

### 3. DialogueGenerator.tsx
- [ ] Add title attribute to select (line 82)
- [ ] Add title attribute to select (line 113)
- [ ] Add title attribute to select (line 192)
- [ ] Add title attribute to select (line 208)
- [ ] Add title to textarea (line 232)
- [ ] Add title to textarea (line 263)
- [ ] Add title to textarea (line 282)
- [ ] Add title to textarea (line 301)
- [ ] Remove unused handleUpdateSpatialization (line 68)

### 4. StorytellerWizard.tsx
- [ ] Add title to button (line 352)
- [ ] Add title to textarea (line 497)
- [ ] Add title to select (line 562)
- [ ] Add title to textarea (line 726)
- [ ] Add title to textarea (line 738)
- [ ] Add title to textarea (line 750)

### 5. ProjectDashboardNew.tsx
- [ ] Fix aria-valuenow (line 308)
- [ ] Replace inline style with class (line 318)

### 6. LoadingFeedback.tsx
- [ ] Fix aria-live (line 124)
- [ ] Fix aria-valuenow/min/max (line 449)
- [ ] Replace inline style with class (line 147)
- [ ] Replace inline style with class (line 256)
- [ ] Replace inline style with class (line 460)

### 7. ValidatedInput.tsx
- [ ] Fix aria-invalid (line 105)
- [ ] Fix aria-invalid (line 272)

## Fix Strategy:
1. ARIA expression values → convert to string literals 'true'/'false'
2. Missing title attributes → add descriptive title attributes
3. Inline styles → replace with CSS classes or data attributes
4. Unused variables → prefix with underscore or remove
5. Missing function arguments → add required arguments

