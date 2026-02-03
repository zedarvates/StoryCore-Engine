# Menu System Testing Instructions

## Quick Start Testing

### Test 1: Character Wizard Menu Item
**Steps**:
1. Open the application
2. Click on "Project" menu
3. Click on "Characters" menu item
4. Verify: Character Wizard modal opens

**Expected Result**: 6-step Character Wizard appears on screen

**Pass/Fail**: ___

---

### Test 2: Story Generator Menu Item
**Steps**:
1. Open the application
2. Click on "Project" menu
3. Click on "Sequences" menu item
4. Verify: Story Generator modal opens

**Expected Result**: 5-step Story Generator appears on screen

**Pass/Fail**: ___

---

### Test 3: Report Issue Menu Item
**Steps**:
1. Open the application
2. Click on "Help" menu
3. Click on "Report Issue" menu item
4. Verify: In-app Feedback Panel opens (NOT a web page)

**Expected Result**: Feedback Panel appears in-app

**Pass/Fail**: ___

---

## Detailed Testing

### Test 4: Character Wizard Functionality
**Steps**:
1. Open Character Wizard (Project → Characters)
2. Fill in Step 1: Basic Identity
   - Enter character name
   - Select archetype
   - Select age range
3. Click "Next"
4. Fill in Step 2: Physical Appearance
   - Enter appearance details
5. Click "Next"
6. Fill in Step 3: Personality
   - Enter personality traits
7. Click "Next"
8. Fill in Step 4: Background
   - Enter background information
9. Click "Next"
10. Fill in Step 5: Relationships
    - Add character relationships
11. Click "Next"
12. Review Step 6: Review & Finalize
    - Verify all information is correct
13. Click "Complete"
14. Verify: Character is saved and wizard closes

**Expected Result**: Character created successfully, wizard closes

**Pass/Fail**: ___

---

### Test 5: Story Generator Functionality
**Steps**:
1. Open Story Generator (Project → Sequences)
2. Fill in Step 1: Story Setup
   - Enter story title
   - Select genre
   - Select tone
3. Click "Next"
4. Fill in Step 2: Characters
   - Select or create characters
5. Click "Next"
6. Fill in Step 3: Locations
   - Select or create locations
7. Click "Next"
8. Fill in Step 4: Generate
   - Click "Generate Story"
   - Wait for AI generation
9. Click "Next"
10. Review Step 5: Review & Export
    - Verify story content
11. Click "Complete"
12. Verify: Story is generated and saved

**Expected Result**: Story generated successfully, wizard closes

**Pass/Fail**: ___

---

### Test 6: Settings Menu Items
**Steps**:
1. Click on "Edit" menu
2. Click on "Settings"
3. Click on "LLM Settings"
4. Verify: LLM Settings Modal opens
5. Close modal
6. Click on "Edit" menu
7. Click on "Settings"
8. Click on "ComfyUI Settings"
9. Verify: ComfyUI Settings Modal opens
10. Close modal
11. Click on "Edit" menu
12. Click on "Settings"
13. Click on "Addons"
14. Verify: Addons Modal opens
15. Close modal
16. Click on "Edit" menu
17. Click on "Settings"
18. Click on "General Settings"
19. Verify: General Settings Modal opens

**Expected Result**: All settings modals open correctly

**Pass/Fail**: ___

---

### Test 7: Tools Menu Items
**Steps**:
1. Click on "Tools" menu
2. Click on "LLM Assistant"
3. Verify: Chat Panel opens
4. Close panel
5. Click on "Tools" menu
6. Click on "ComfyUI Server"
7. Verify: ComfyUI Settings Modal opens
8. Close modal
9. Click on "Tools" menu
10. Click on "Script Wizard"
11. Verify: Project Setup Wizard opens

**Expected Result**: All tools panels open correctly

**Pass/Fail**: ___

---

### Test 8: Mutual Exclusion
**Steps**:
1. Open Character Wizard (Project → Characters)
2. Verify: Character Wizard is open
3. Click on "Project" menu
4. Click on "Sequences"
5. Verify: Character Wizard closes
6. Verify: Story Generator opens
7. Click on "Project" menu
8. Click on "Characters"
9. Verify: Story Generator closes
10. Verify: Character Wizard opens

**Expected Result**: Only one wizard open at a time

**Pass/Fail**: ___

---

### Test 9: Feedback Panel
**Steps**:
1. Click on "Help" menu
2. Click on "Report Issue"
3. Verify: Feedback Panel opens
4. Enter feedback text
5. Click "Submit"
6. Verify: Feedback is submitted
7. Verify: Panel closes

**Expected Result**: Feedback submitted successfully

**Pass/Fail**: ___

---

### Test 10: Console Errors
**Steps**:
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Perform all menu tests above
4. Verify: No red error messages in console
5. Verify: No TypeScript errors
6. Verify: No warnings

**Expected Result**: No console errors or warnings

**Pass/Fail**: ___

---

## Performance Testing

### Test 11: Menu Performance
**Steps**:
1. Open browser Developer Tools (F12)
2. Go to Performance tab
3. Start recording
4. Click on "Project" menu
5. Click on "Characters"
6. Wait for wizard to open
7. Stop recording
8. Analyze performance metrics
9. Verify: No performance issues
10. Verify: Wizard opens quickly

**Expected Result**: Fast menu response, no performance issues

**Pass/Fail**: ___

---

### Test 12: Memory Usage
**Steps**:
1. Open browser Developer Tools (F12)
2. Go to Memory tab
3. Take heap snapshot
4. Open Character Wizard
5. Close Character Wizard
6. Open Story Generator
7. Close Story Generator
8. Take another heap snapshot
9. Compare snapshots
10. Verify: No memory leaks

**Expected Result**: No memory leaks detected

**Pass/Fail**: ___

---

## Browser Compatibility Testing

### Test 13: Chrome
**Steps**:
1. Open application in Chrome
2. Perform all menu tests
3. Verify: All tests pass

**Expected Result**: All tests pass in Chrome

**Pass/Fail**: ___

---

### Test 14: Firefox
**Steps**:
1. Open application in Firefox
2. Perform all menu tests
3. Verify: All tests pass

**Expected Result**: All tests pass in Firefox

**Pass/Fail**: ___

---

### Test 15: Safari
**Steps**:
1. Open application in Safari
2. Perform all menu tests
3. Verify: All tests pass

**Expected Result**: All tests pass in Safari

**Pass/Fail**: ___

---

## Edge Cases

### Test 16: Rapid Menu Clicks
**Steps**:
1. Rapidly click on menu items
2. Rapidly open and close wizards
3. Verify: No errors or crashes
4. Verify: Application remains stable

**Expected Result**: Application handles rapid clicks gracefully

**Pass/Fail**: ___

---

### Test 17: Menu with No Project
**Steps**:
1. Close any open project
2. Click on "Project" menu
3. Verify: Menu items are disabled
4. Verify: No errors

**Expected Result**: Menu items properly disabled when no project

**Pass/Fail**: ___

---

### Test 18: Menu with Large Project
**Steps**:
1. Open a large project
2. Click on "Project" menu
3. Click on "Characters"
4. Verify: Wizard opens quickly
5. Verify: No performance issues

**Expected Result**: Menu works well with large projects

**Pass/Fail**: ___

---

## Summary

### Total Tests: 18
- Passed: ___
- Failed: ___
- Skipped: ___

### Overall Status: ___

### Issues Found:
1. ___
2. ___
3. ___

### Notes:
___

---

**Tester Name**: ___  
**Date**: ___  
**Time**: ___  
**Environment**: ___  
**Browser**: ___  
**OS**: ___  

---

## Sign-Off

**Tested By**: ___  
**Date**: ___  
**Status**: ✅ PASS / ❌ FAIL  

**Approved By**: ___  
**Date**: ___  

---

## Appendix: Troubleshooting

### If Character Wizard doesn't open:
1. Check browser console for errors
2. Verify app store is initialized
3. Hard refresh the page (Ctrl+Shift+R)
4. Restart the application

### If Story Generator doesn't open:
1. Check browser console for errors
2. Verify app store is initialized
3. Hard refresh the page (Ctrl+Shift+R)
4. Restart the application

### If Report Issue opens web page:
1. Clear browser cache
2. Hard refresh the page (Ctrl+Shift+R)
3. Check if feedback panel is available
4. Restart the application

### If multiple wizards open:
1. Close all wizards
2. Hard refresh the page
3. Try again
4. Contact support if issue persists
