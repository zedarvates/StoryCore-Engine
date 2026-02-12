# Accessibility Fix Plan

## Issue
Form elements must have labels - Element has no title attribute Element has no placeholder attribute

**File:** `creative-studio-ui/src/components/wizard/storyteller/Step3LocationSelection.tsx`
**Line:** ~62 (checkbox input in LocationCard component)

## Root Cause
The checkbox input in the `LocationCard` component lacks proper accessibility labeling:
- No `id` attribute
- No associated `<label>`
- No `title` attribute for screen readers
- No `aria-label` attribute

## Fix Plan

### 1. LocationCard Component Fix
Add proper accessibility to the checkbox input:
- Add a unique `id` to the checkbox (e.g., `location-checkbox-${location.id}`)
- Add a `title` attribute for screen readers
- Add an `aria-label` for better accessibility
- Alternatively, wrap with a visually hidden label

### 2. Changes Required
```tsx
// Before (problematic code):
<input
  type="checkbox"
  checked={isSelected}
  onChange={onToggle}
  className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
  onClick={(e) => e.stopPropagation()}
/>

// After (fixed code):
<input
  type="checkbox"
  id={`location-checkbox-${location.id}`}
  checked={isSelected}
  onChange={onToggle}
  className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
  onClick={(e) => e.stopPropagation()}
  aria-label={`Select ${location.name}`}
  title={`Select ${location.name}`}
/>
```

## Files to Edit
- `creative-studio-ui/src/components/wizard/storyteller/Step3LocationSelection.tsx`

## Status
- [ ] Implement the fix
- [ ] Verify the fix resolves the accessibility issue

