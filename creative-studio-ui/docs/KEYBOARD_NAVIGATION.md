# Keyboard Navigation Guide

## Overview

The Project Setup Wizard implements comprehensive keyboard navigation support to ensure accessibility for all users. This document describes the keyboard shortcuts and navigation patterns available throughout the wizard.

**Requirements Validated:** 13.3

## General Keyboard Shortcuts

### Global Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to next interactive element |
| `Shift + Tab` | Move focus to previous interactive element |
| `Enter` | Activate focused button or link |
| `Space` | Activate focused button or checkbox |
| `Escape` | Close modal/dialog or cancel action |

### Form Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move to next form field |
| `Shift + Tab` | Move to previous form field |
| `Arrow Up/Down` | Navigate select options or radio buttons |
| `Space` | Toggle checkbox or radio button |
| `Enter` | Submit form or activate button |

## Component-Specific Navigation

### Wizard Header

**Mode Toggle Buttons:**
- `Tab` to focus mode toggle buttons
- `Arrow Left/Right` to switch between Beginner and Advanced modes
- `Enter` or `Space` to activate selected mode

### Wizard Navigation

**Navigation Buttons:**
- `Tab` to focus navigation buttons (Back, Save Draft, Skip, Next)
- `Enter` or `Space` to activate focused button
- Buttons are disabled when validation fails (indicated by visual styling)

**Keyboard Shortcuts:**
- `Alt + B` - Go back to previous step (when available)
- `Alt + N` - Go to next step (when validation passes)
- `Alt + S` - Save draft
- `Alt + K` - Skip optional step (when available)

### Wizard Review

**Section Navigation:**
- `Tab` to focus section headers
- `Enter` or `Space` to expand/collapse section
- `Arrow Up/Down` to navigate between sections
- `Tab` to focus Edit button within expanded section
- `Enter` or `Space` to activate Edit button

**Action Buttons:**
- `Tab` to focus Cancel or Confirm buttons
- `Enter` or `Space` to activate focused button

### Step Components

#### Project Type Selection (Step 1)

**Project Type Cards:**
- `Tab` to focus project type cards
- `Arrow Up/Down` or `Arrow Left/Right` to navigate between cards
- `Enter` or `Space` to select focused card
- Selected card is indicated by visual styling and `aria-selected="true"`

**Custom Duration Input:**
- `Tab` to focus custom duration input field
- Type number directly
- `Enter` to confirm input

#### Genre & Style Selection (Step 2)

**Genre Checkboxes:**
- `Tab` to focus genre checkboxes
- `Space` to toggle checkbox
- Multiple selections allowed

**Visual Style Radio Buttons:**
- `Tab` to focus visual style group
- `Arrow Up/Down` to navigate between options
- `Space` to select option

**Color Palette Picker:**
- `Tab` to focus color inputs
- `Enter` to open color picker
- `Arrow keys` to adjust color values
- `Escape` to close color picker

#### World Building (Step 3)

**Location List:**
- `Tab` to focus location list
- `Arrow Up/Down` to navigate between locations
- `Enter` to edit focused location
- `Delete` to remove focused location
- `Insert` or `Ctrl + N` to add new location

**Location Form:**
- `Tab` to navigate between form fields
- `Enter` to save location
- `Escape` to cancel editing

#### Character Creation (Step 4)

**Character List:**
- `Tab` to focus character list
- `Arrow Up/Down` to navigate between characters
- `Enter` to edit focused character
- `Delete` to remove focused character
- `Insert` or `Ctrl + N` to add new character

**Character Form:**
- `Tab` to navigate between form fields
- `Enter` in personality traits field to add trait
- `Backspace` on empty field to remove last trait
- `Enter` to save character
- `Escape` to cancel editing

**Relationship Matrix:**
- `Tab` to focus relationship cells
- `Arrow keys` to navigate between cells
- `Enter` to edit relationship
- `Escape` to close relationship editor

#### Story Structure (Step 5)

**Act Structure Selection:**
- `Tab` to focus act structure buttons
- `Arrow Left/Right` to navigate between options
- `Enter` or `Space` to select option

**Plot Point Timeline:**
- `Tab` to focus plot points
- `Arrow Up/Down` to navigate between plot points
- `Enter` to edit focused plot point
- `Delete` to remove focused plot point
- `Insert` or `Ctrl + N` to add new plot point

#### Dialogue & Script (Step 6)

**Script Format Selection:**
- `Tab` to focus format buttons
- `Arrow Left/Right` to navigate between formats
- `Enter` or `Space` to select format

**Script Editor:**
- `Tab` to focus script editor
- Standard text editing shortcuts apply
- `Ctrl + S` to save draft
- `Ctrl + Z` to undo
- `Ctrl + Y` to redo

#### Scene Breakdown (Step 7)

**Scene List:**
- `Tab` to focus scene list
- `Arrow Up/Down` to navigate between scenes
- `Enter` to edit focused scene
- `Delete` to remove focused scene
- `Insert` or `Ctrl + N` to add new scene
- `Ctrl + Arrow Up/Down` to reorder scenes

**Scene Form:**
- `Tab` to navigate between form fields
- `Enter` to save scene
- `Escape` to cancel editing

#### Shot Planning (Step 8)

**Scene Selector:**
- `Tab` to focus scene selector
- `Arrow Up/Down` to navigate between scenes
- `Enter` to select scene

**Shot List:**
- `Tab` to focus shot list
- `Arrow Up/Down` to navigate between shots
- `Enter` to edit focused shot
- `Delete` to remove focused shot
- `Insert` or `Ctrl + N` to add new shot

**Shot Form:**
- `Tab` to navigate between form fields
- `Arrow Up/Down` in dropdowns to select options
- `Enter` to save shot
- `Escape` to cancel editing

## Focus Management

### Focus Indicators

All interactive elements display a visible focus indicator when focused via keyboard:
- **Primary elements:** Blue outline with shadow (`#3b82f6`)
- **Secondary elements:** Gray outline with shadow (`#6b7280`)
- **Danger/Cancel elements:** Red outline with shadow (`#dc2626`)

Focus indicators are only shown for keyboard navigation (`:focus-visible`), not for mouse/touch interactions.

### Focus Trap

When a modal or dialog is open:
- Focus is trapped within the modal
- `Tab` cycles through focusable elements within the modal
- `Shift + Tab` cycles backwards
- `Escape` closes the modal and returns focus to the trigger element

### Focus Restoration

When navigating between wizard steps:
- Focus is automatically moved to the first interactive element of the new step
- When returning from review mode, focus is restored to the Edit button that was clicked
- When closing a modal, focus returns to the element that opened it

## Screen Reader Support

### ARIA Labels

All interactive elements have appropriate ARIA labels:
- Buttons include `aria-label` describing their action
- Form fields include `aria-describedby` for error messages
- Sections include `aria-expanded` for collapsible content
- Lists include `aria-label` and `role="list"`

### Live Regions

Dynamic content changes are announced to screen readers:
- Validation errors: `aria-live="assertive"`
- Save status: `aria-live="polite"`
- Step changes: `aria-live="polite"`

### Landmarks

Semantic HTML and ARIA landmarks are used throughout:
- `<header>` for wizard header
- `<main>` for wizard content
- `<nav>` for wizard navigation
- `role="region"` for major sections

## Accessibility Testing

### Manual Testing

To test keyboard navigation:

1. **Tab Navigation:**
   - Press `Tab` repeatedly to ensure all interactive elements are reachable
   - Verify focus indicators are visible
   - Ensure tab order is logical

2. **Activation:**
   - Use `Enter` and `Space` to activate buttons
   - Verify actions are triggered correctly

3. **Arrow Navigation:**
   - Use arrow keys in lists and radio groups
   - Verify navigation works as expected

4. **Focus Trap:**
   - Open modals and verify focus is trapped
   - Press `Escape` to close and verify focus returns

### Automated Testing

Run accessibility tests:

```bash
# Run axe-core accessibility tests
npm run test:a11y

# Run keyboard navigation tests
npm run test:keyboard
```

### Screen Reader Testing

Test with screen readers:
- **Windows:** NVDA or JAWS
- **macOS:** VoiceOver
- **Linux:** Orca

## Best Practices

### For Developers

1. **Always provide focus indicators:**
   - Use `:focus-visible` for keyboard-only indicators
   - Ensure sufficient contrast (3:1 minimum)

2. **Maintain logical tab order:**
   - Use semantic HTML
   - Avoid `tabindex` values greater than 0
   - Use `tabindex="-1"` for programmatic focus only

3. **Provide keyboard alternatives:**
   - Every mouse action should have a keyboard equivalent
   - Document keyboard shortcuts

4. **Test with keyboard only:**
   - Unplug your mouse and navigate the entire wizard
   - Ensure all functionality is accessible

### For Users

1. **Learn the shortcuts:**
   - Review this guide to understand available shortcuts
   - Practice using keyboard navigation

2. **Use focus indicators:**
   - Watch for the blue outline showing focused elements
   - If you lose focus, press `Tab` to find it again

3. **Report issues:**
   - If you encounter keyboard navigation issues, report them
   - Include details about your browser and operating system

## Browser Support

Keyboard navigation is tested and supported in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Related Documentation

- [WCAG 2.1 Keyboard Accessible Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/keyboard-accessible)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN: Keyboard-navigable JavaScript widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets)
