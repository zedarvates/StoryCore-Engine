# Menu System Testing Guide

## Quick Start Testing

### 1. Visual Inspection
```
✓ Open the application
✓ Look at the menu bar (File, Edit, View, Project, Tools, Help)
✓ All menu buttons should be visible and properly spaced
✓ No text overlap or truncation
```

### 2. Basic Menu Interaction
```
✓ Click on "File" menu
✓ Menu should open below the button
✓ Menu items should be clearly visible
✓ Click outside the menu
✓ Menu should close
```

### 3. Keyboard Navigation
```
✓ Press Alt key
✓ First menu (File) should be focused
✓ Press Right Arrow
✓ Focus should move to Edit menu
✓ Press Down Arrow
✓ Menu should open and first item should be focused
✓ Press Down Arrow again
✓ Focus should move to next item (skipping separators)
✓ Press Escape
✓ Menu should close
```

### 4. Menu Item Activation
```
✓ Open File menu
✓ Press Down Arrow to navigate to "Save Project"
✓ Press Enter
✓ Action should execute (notification should appear)
✓ Menu should close
```

---

## Detailed Test Cases

### Test Case 1: Menu Opening/Closing
**Objective**: Verify menu opens and closes correctly

**Steps**:
1. Click on "File" menu button
2. Verify menu appears below button
3. Click on "Edit" menu button
4. Verify File menu closes and Edit menu opens
5. Click outside the menu
6. Verify menu closes
7. Press Escape
8. Verify menu closes

**Expected Result**: ✅ All steps work as expected

---

### Test Case 2: Keyboard Navigation
**Objective**: Verify keyboard navigation works correctly

**Steps**:
1. Press Alt key
2. Verify File menu button is focused
3. Press Right Arrow 5 times
4. Verify focus cycles through all menus
5. Press Left Arrow 5 times
6. Verify focus cycles backward through menus
7. Press Down Arrow
8. Verify menu opens and first item is focused
9. Press Down Arrow multiple times
10. Verify focus moves through items, skipping separators
11. Press Home
12. Verify focus moves to first item
13. Press End
14. Verify focus moves to last item
15. Press Escape
16. Verify menu closes and focus returns to menu button

**Expected Result**: ✅ All navigation works smoothly

---

### Test Case 3: Menu Item Activation
**Objective**: Verify menu items can be activated

**Steps**:
1. Open File menu
2. Navigate to "Save Project" using arrow keys
3. Press Enter
4. Verify notification appears
5. Verify menu closes
6. Open Edit menu
7. Click on "Undo"
8. Verify notification appears
9. Verify menu closes

**Expected Result**: ✅ All items activate correctly

---

### Test Case 4: Disabled Items
**Objective**: Verify disabled items behave correctly

**Steps**:
1. Open File menu
2. Navigate to "Save Project" (should be disabled if no project)
3. Verify item appears grayed out
4. Try to click on it
5. Verify nothing happens
6. Try to activate with Enter
7. Verify nothing happens
8. Navigate past it with arrow keys
9. Verify focus skips disabled items

**Expected Result**: ✅ Disabled items are properly handled

---

### Test Case 5: Separators
**Objective**: Verify separators don't interfere with navigation

**Steps**:
1. Open File menu
2. Navigate with arrow keys through all items
3. Verify separators are skipped
4. Verify focus never lands on a separator
5. Verify visual separators are visible

**Expected Result**: ✅ Separators display and navigation skips them

---

### Test Case 6: Shortcuts Display
**Objective**: Verify keyboard shortcuts display correctly

**Steps**:
1. Open File menu
2. Verify "New Project" shows "Ctrl+N"
3. Verify "Open Project" shows "Ctrl+O"
4. Verify "Save Project" shows "Ctrl+S"
5. Verify shortcuts are right-aligned
6. Verify no text overlap with labels

**Expected Result**: ✅ All shortcuts display correctly

---

### Test Case 7: Menu Width
**Objective**: Verify menu width adapts to content

**Steps**:
1. Open File menu
2. Verify menu width accommodates longest item
3. Verify no text truncation
4. Verify no text overlap
5. Open Edit menu
6. Verify menu width is appropriate
7. Open Tools menu
8. Verify menu width is appropriate

**Expected Result**: ✅ Menu width adapts to content

---

### Test Case 8: Hover States
**Objective**: Verify hover states work correctly

**Steps**:
1. Open File menu
2. Move mouse over first item
3. Verify item highlights
4. Move mouse to next item
5. Verify previous item unhighlights
6. Verify new item highlights
7. Move mouse outside menu
8. Verify highlight remains on last hovered item

**Expected Result**: ✅ Hover states work smoothly

---

### Test Case 9: Focus Management
**Objective**: Verify focus is managed correctly

**Steps**:
1. Open File menu with keyboard
2. Verify first item is focused
3. Navigate with arrow keys
4. Verify focused item is highlighted
5. Close menu with Escape
6. Verify focus returns to menu button
7. Verify menu button is still focused

**Expected Result**: ✅ Focus management works correctly

---

### Test Case 10: Accessibility
**Objective**: Verify accessibility features work

**Steps**:
1. Open browser DevTools
2. Open Accessibility Inspector
3. Open File menu
4. Verify menu has role="menu"
5. Verify items have role="menuitem"
6. Verify separators have role="separator"
7. Verify ARIA attributes are present
8. Use screen reader to navigate menu
9. Verify announcements are made

**Expected Result**: ✅ Accessibility features work

---

## Automated Test Commands

### Run Menu Tests
```bash
cd creative-studio-ui
npm test -- MenuBar.test.tsx
npm test -- Menu.test.tsx
npm test -- MenuDropdown.test.tsx
npm test -- MenuItem.test.tsx
```

### Run E2E Tests
```bash
npm run test:e2e -- menu
```

### Run Accessibility Tests
```bash
npm run test:a11y -- menu
```

---

## Browser Compatibility

Test on the following browsers:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Accessibility Testing

### Screen Reader Testing
- [ ] NVDA (Windows)
- [ ] JAWS (Windows)
- [ ] VoiceOver (macOS/iOS)
- [ ] TalkBack (Android)

### Keyboard Testing
- [ ] Tab navigation
- [ ] Arrow key navigation
- [ ] Enter/Space activation
- [ ] Escape to close
- [ ] Alt key to focus menu bar

### Visual Testing
- [ ] High contrast mode
- [ ] Dark mode
- [ ] Zoom levels (100%, 150%, 200%)
- [ ] Font size adjustments

---

## Performance Testing

### Metrics to Monitor
- Menu open time: < 100ms
- Navigation response: < 50ms
- Item activation: < 100ms
- Memory usage: < 5MB

### Tools
```bash
# Chrome DevTools Performance
# 1. Open DevTools (F12)
# 2. Go to Performance tab
# 3. Record menu interactions
# 4. Analyze results
```

---

## Bug Report Template

If you find an issue, please report it with:

```
**Title**: [Brief description]

**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Result**:
...

**Actual Result**:
...

**Browser**: [Chrome/Firefox/Safari/Edge]
**OS**: [Windows/macOS/Linux]
**Version**: [App version]

**Screenshots/Videos**: [If applicable]
```

---

## Sign-Off Checklist

- [ ] All test cases passed
- [ ] No console errors
- [ ] No accessibility violations
- [ ] Performance acceptable
- [ ] Cross-browser compatible
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Visual design correct
- [ ] No memory leaks
- [ ] Ready for production

---

## Notes

- Tests should be run on a clean build
- Clear browser cache before testing
- Test with and without project loaded
- Test with different screen sizes
- Test with different zoom levels
- Test with different font sizes
