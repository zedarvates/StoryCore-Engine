# PlaybackControls ARIA and Inline Style Fixes

## Issues Fixed:
1. ARIA attributes must have valid values (not expressions like `{expression}`)
2. `aria-pressed` and `aria-expanded` must be boolean, not string
3. Inline styles should be moved to external CSS

## Changes Made:

### PlaybackControls.tsx - COMPLETED
- [x] Fix aria-pressed to use boolean instead of string (`isLooping` directly)
- [x] Fix aria-expanded to use boolean instead of string (`showSpeedMenu` directly)
- [x] Replace inline style `width` with CSS custom property `--progress-width`
- [x] Replace inline style `left` with CSS custom property `--progress-position`
- [x] Add proper type casting for CSS custom properties

### PlaybackControls.css - COMPLETED
- [x] Add CSS rule using `--progress-width` custom property for progress bar
- [x] Add CSS rule using `--progress-position` custom property for thumb position


