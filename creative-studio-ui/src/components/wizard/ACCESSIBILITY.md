# Wizard Accessibility and UX Enhancements

This document describes the comprehensive accessibility and UX features implemented for the UI Configuration Wizards.

## Overview

All wizard components have been enhanced with:
- Full keyboard navigation support
- ARIA labels and screen reader compatibility
- Comprehensive validation error display
- Loading states and progress indicators

## Features

### 1. Keyboard Navigation

#### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Advance to next step (or submit on last step) |
| `Escape` | Cancel wizard |
| `Alt + ←` | Go to previous step |
| `Alt + →` | Go to next step |
| `Tab` | Navigate between form fields |
| `Shift + Tab` | Navigate backwards between form fields |

#### Implementation

The `useKeyboardNavigation` hook provides keyboard navigation:

```typescript
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

useKeyboardNavigation({
  onNext: nextStep,
  onPrevious: previousStep,
  onCancel: handleCancel,
  onSubmit: handleSubmit,
  enabled: !isSubmitting,
  canGoNext,
  canGoPrevious,
  isLastStep,
});
```

#### Focus Management

The `useFocusManagement` hook ensures proper focus when navigating between steps:

```typescript
import { useFocusManagement } from '@/hooks/useKeyboardNavigation';

useFocusManagement(currentStep, {
  enabled: true,
  focusOnStepChange: true,
});
```

#### Tab Order

The `useTabOrder` hook manages logical tab navigation:

```typescript
import { useTabOrder } from '@/hooks/useKeyboardNavigation';

const containerRef = useRef<HTMLDivElement>(null);
useTabOrder(containerRef, true);
```

### 2. ARIA Labels and Screen Reader Support

#### Live Regions

Live regions announce dynamic content changes to screen readers:

```typescript
import { LiveRegion, AlertLiveRegion, StepChangeAnnouncement } from '@/components/wizard';

// Polite announcements (non-urgent)
<LiveRegion message="Form data saved" politeness="polite" />

// Assertive announcements (urgent)
<AlertLiveRegion message="Error occurred" type="error" />

// Step change announcements
<StepChangeAnnouncement
  currentStep={currentStep}
  totalSteps={totalSteps}
  stepTitle={stepTitle}
/>
```

#### ARIA Attributes

All interactive elements include appropriate ARIA attributes:

- `aria-label`: Descriptive labels for buttons and controls
- `aria-describedby`: Links fields to help text and errors
- `aria-invalid`: Indicates invalid form fields
- `aria-required`: Indicates required fields
- `aria-live`: Announces dynamic content changes
- `aria-current`: Indicates current step in wizard
- `role`: Semantic roles for custom components

#### Screen Reader Announcements

```typescript
import { LoadingAnnouncement } from '@/components/wizard';

<LoadingAnnouncement
  isLoading={isLoading}
  loadingMessage="Generating content..."
  completeMessage="Content generated successfully"
/>
```

### 3. Validation Error Display

#### Inline Field Errors

Errors are displayed directly below form fields:

```typescript
import { FormField } from '@/components/wizard';

<FormField
  label="Email"
  name="email"
  required
  error={validationErrors.email?.[0]}
  helpText="Enter a valid email address"
>
  <Input type="email" />
</FormField>
```

#### Error Summary

A summary of all errors is displayed at the top of the form:

```typescript
import { ValidationErrorSummary } from '@/components/wizard';

<ValidationErrorSummary errors={validationErrors} />
```

The error summary:
- Lists all validation errors
- Allows clicking on errors to focus the field
- Announces errors to screen readers
- Highlights invalid fields with visual indicators

#### Field Requirements

Required and optional fields are clearly indicated:

```typescript
import { FieldRequirement } from '@/components/wizard';

<FieldRequirement required={true} />  // Shows red asterisk
<FieldRequirement optional={true} />  // Shows "(optional)" text
```

#### Visual Error Indicators

Invalid fields are highlighted with:
- Red border
- Red ring on focus
- Error icon
- Error message with icon

### 4. Loading States and Progress Indicators

#### Loading Spinner

```typescript
import { LoadingSpinner } from '@/components/wizard';

<LoadingSpinner size="md" />
```

#### Loading Overlay

Covers content while loading and prevents interaction:

```typescript
import { LoadingOverlay } from '@/components/wizard';

<LoadingOverlay isLoading={isLoading} message="Processing...">
  <YourContent />
</LoadingOverlay>
```

#### Button Loading State

```typescript
import { ButtonLoading } from '@/components/wizard';

<Button disabled={isLoading}>
  <ButtonLoading isLoading={isLoading} loadingText="Saving...">
    Save
  </ButtonLoading>
</Button>
```

#### Progress Bar

For operations with known progress:

```typescript
import { ProgressBar } from '@/components/wizard';

<ProgressBar
  value={progress}
  max={100}
  label="Uploading..."
  showPercentage
  variant="default"
/>
```

#### Indeterminate Progress

For operations with unknown duration:

```typescript
import { IndeterminateProgress } from '@/components/wizard';

<IndeterminateProgress label="Processing..." />
```

#### Skeleton Loaders

Placeholder content while loading:

```typescript
import { Skeleton, LoadingCard } from '@/components/wizard';

<Skeleton variant="text" width="100%" />
<Skeleton variant="circular" width={48} height={48} />
<LoadingCard lines={3} showAvatar />
```

#### Estimated Time

Display estimated time remaining:

```typescript
import { EstimatedTime } from '@/components/wizard';

<EstimatedTime seconds={estimatedSeconds} />
```

## Best Practices

### Keyboard Navigation

1. **Always provide keyboard shortcuts** for primary actions
2. **Test with keyboard only** - ensure all functionality is accessible
3. **Provide visual focus indicators** for keyboard users
4. **Don't trap focus** - users should always be able to escape

### Screen Readers

1. **Use semantic HTML** - `<button>`, `<nav>`, `<main>`, etc.
2. **Provide descriptive labels** - don't rely on visual context alone
3. **Announce dynamic changes** - use live regions for updates
4. **Test with screen readers** - NVDA (Windows), JAWS (Windows), VoiceOver (Mac)

### Validation

1. **Show errors inline** - next to the field that has the error
2. **Provide error summary** - at the top of the form
3. **Use clear error messages** - explain what's wrong and how to fix it
4. **Highlight invalid fields** - with visual indicators
5. **Announce errors** - to screen readers using live regions

### Loading States

1. **Always show loading indicators** - for async operations
2. **Prevent duplicate submissions** - disable buttons while loading
3. **Provide progress feedback** - when possible
4. **Announce loading states** - to screen readers
5. **Show estimated time** - for long operations

## Testing

### Keyboard Navigation Testing

1. Navigate through the wizard using only the keyboard
2. Verify all interactive elements are reachable
3. Check that focus is visible and logical
4. Test keyboard shortcuts (Enter, Esc, Alt+Arrow)

### Screen Reader Testing

1. Test with NVDA (Windows) or VoiceOver (Mac)
2. Verify all content is announced correctly
3. Check that dynamic changes are announced
4. Ensure form errors are announced

### Validation Testing

1. Submit forms with invalid data
2. Verify errors are displayed inline and in summary
3. Check that invalid fields are highlighted
4. Test error message clarity

### Loading State Testing

1. Test all async operations
2. Verify loading indicators appear
3. Check that buttons are disabled during loading
4. Test progress indicators with various durations

## Example Usage

See `AccessibilityExample.tsx` for a complete example demonstrating all features:

```typescript
import { AccessibilityExampleWizard } from '@/components/wizard';

<AccessibilityExampleWizard />
```

## Compliance

These implementations follow:
- **WCAG 2.1 Level AA** guidelines
- **WAI-ARIA 1.2** specifications
- **Section 508** requirements

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
