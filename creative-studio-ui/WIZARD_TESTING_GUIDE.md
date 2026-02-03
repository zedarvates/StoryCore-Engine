# Wizard System Testing Guide

## Overview
This guide provides step-by-step instructions to test the wizard system fixes for mutual exclusion and proper wizard launching.

## Prerequisites
1. Start the application in Electron mode: `npm run electron:start`
2. Load or create a project
3. Navigate to the Project Dashboard

## Test Cases

### Test 1: Project Setup Wizard
**Steps:**
1. Click on "Project Setup" button in the Quick Access section
2. Verify that ProjectSetupWizardModal opens
3. Verify that no other wizards are open

**Expected Result:** ✅ ProjectSetupWizardModal opens correctly

---

### Test 2: World Builder Wizard
**Steps:**
1. Click on "World Builder" in the Creative Wizards section
2. Verify that WorldWizardModal opens
3. Verify that no other wizards are open

**Expected Result:** ✅ WorldWizardModal opens correctly

---

### Test 3: Character Wizard
**Steps:**
1. Click on "Character Wizard" in the Creative Wizards section
2. Verify that CharacterWizardModal opens
3. Verify that no other wizards are open

**Expected Result:** ✅ CharacterWizardModal opens correctly

---

### Test 4: Story Generator Wizard
**Steps:**
1. Click on "Story Generator" in the Creative Wizards section
2. Verify that StorytellerWizardModal opens
3. Verify that no other wizards are open

**Expected Result:** ✅ StorytellerWizardModal opens correctly

---

### Test 5: Scene Generator Wizard
**Steps:**
1. Click on "Scene Generator" in the Creative Wizards section
2. Verify that GenericWizardModal opens with Scene Generator form
3. Verify that no other wizards are open

**Expected Result:** ✅ GenericWizardModal opens with Scene Generator form

---

### Test 6: Storyboard Creator Wizard
**Steps:**
1. Click on "Storyboard Creator" in the Creative Wizards section
2. Verify that GenericWizardModal opens with Storyboard Creator form
3. Verify that no other wizards are open

**Expected Result:** ✅ GenericWizardModal opens with Storyboard Creator form

---

### Test 7: Dialogue Writer Wizard
**Steps:**
1. Click on "Dialogue Wizard" in the Creative Wizards section
2. Verify that GenericWizardModal opens with Dialogue Writer form
3. Verify that no other wizards are open

**Expected Result:** ✅ GenericWizardModal opens with Dialogue Writer form

---

### Test 8: Style Transfer Wizard
**Steps:**
1. Click on "Style Transfer" in the Creative Wizards section
2. Verify that GenericWizardModal opens with Style Transfer form
3. Verify that no other wizards are open

**Expected Result:** ✅ GenericWizardModal opens with Style Transfer form

---

### Test 9: Unimplemented Wizards
**Steps:**
1. Click on "Shot Planning" in the Creative Wizards section
2. Verify that a warning notification appears: "The shot-planning wizard is not yet implemented. Coming soon!"
3. Verify that no wizard modal opens

**Expected Result:** ✅ Warning notification appears, no wizard opens

**Repeat for:**
- SonicCrafter (audio-production-wizard)
- EditForge (video-editor-wizard)
- ViralForge (marketing-wizard)
- PanelForge (comic-to-sequence-wizard)

---

### Test 10: Wizard Mutual Exclusion - Switch Between Wizards
**Steps:**
1. Open World Builder wizard
2. While World Builder is open, click on Character Wizard
3. Verify that World Builder closes and Character Wizard opens
4. While Character Wizard is open, click on Scene Generator
5. Verify that Character Wizard closes and Scene Generator opens

**Expected Result:** ✅ Only one wizard is open at a time, switching between wizards works correctly

---

### Test 11: Create New Story Button
**Steps:**
1. Click on "Create New Story" button in the dashboard
2. Verify that StorytellerWizardModal opens
3. Verify that no other wizards are open

**Expected Result:** ✅ StorytellerWizardModal opens correctly

---

### Test 12: Create Character Button
**Steps:**
1. Click on "Create Character" button in the Characters section
2. Verify that CharacterWizardModal opens
3. Verify that no other wizards are open

**Expected Result:** ✅ CharacterWizardModal opens correctly

---

### Test 13: Edit Story
**Steps:**
1. Click on a story card to view its details
2. Click on "Edit" button in the story detail view
3. Verify that StorytellerWizardModal opens with the story data
4. Verify that no other wizards are open

**Expected Result:** ✅ StorytellerWizardModal opens with story data

---

### Test 14: Wizard Modal Close Button
**Steps:**
1. Open any wizard
2. Click the X button to close the wizard
3. Verify that the wizard closes
4. Verify that no other wizards are open

**Expected Result:** ✅ Wizard closes correctly

---

### Test 15: Wizard Modal Overlay Click
**Steps:**
1. Open any wizard
2. Click on the overlay (outside the modal)
3. Verify that the wizard closes
4. Verify that no other wizards are open

**Expected Result:** ✅ Wizard closes correctly when clicking overlay

---

## Regression Tests

### Regression Test 1: Project Dashboard Still Works
**Steps:**
1. Verify that the project dashboard loads correctly
2. Verify that all sections are visible (Quick Access, Sequences, Characters, etc.)
3. Verify that buttons and controls are responsive

**Expected Result:** ✅ Dashboard works correctly

---

### Regression Test 2: Character Management Still Works
**Steps:**
1. Create a new character using the Character Wizard
2. Verify that the character appears in the Characters section
3. Click on the character to open the Character Editor
4. Verify that the Character Editor opens correctly

**Expected Result:** ✅ Character management works correctly

---

### Regression Test 3: Story Management Still Works
**Steps:**
1. Create a new story using the Story Generator
2. Verify that the story appears in the Stories section
3. Click on the story to view its details
4. Verify that the story detail view opens correctly

**Expected Result:** ✅ Story management works correctly

---

## Known Issues

### Issue 1: Character Tiles Not Displaying
**Description:** Character tiles may not display in the Characters section
**Status:** Needs investigation
**Workaround:** Characters are still stored and can be accessed through the Character Editor

### Issue 2: Menu Text Overlap
**Description:** Menu at top has text overlap and display issues
**Status:** Separate issue from wizard system
**Workaround:** None currently available

---

## Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| Test 1: Project Setup | ⬜ | Pending |
| Test 2: World Builder | ⬜ | Pending |
| Test 3: Character Wizard | ⬜ | Pending |
| Test 4: Story Generator | ⬜ | Pending |
| Test 5: Scene Generator | ⬜ | Pending |
| Test 6: Storyboard Creator | ⬜ | Pending |
| Test 7: Dialogue Writer | ⬜ | Pending |
| Test 8: Style Transfer | ⬜ | Pending |
| Test 9: Unimplemented Wizards | ⬜ | Pending |
| Test 10: Mutual Exclusion | ⬜ | Pending |
| Test 11: Create New Story | ⬜ | Pending |
| Test 12: Create Character | ⬜ | Pending |
| Test 13: Edit Story | ⬜ | Pending |
| Test 14: Close Button | ⬜ | Pending |
| Test 15: Overlay Click | ⬜ | Pending |
| Regression 1: Dashboard | ⬜ | Pending |
| Regression 2: Characters | ⬜ | Pending |
| Regression 3: Stories | ⬜ | Pending |

---

## Notes

- All tests should be performed in Electron mode for best results
- If any test fails, check the browser console for error messages
- If a wizard doesn't open, verify that the required services (Ollama, ComfyUI) are running if needed
- Report any issues or unexpected behavior to the development team

---

## Quick Test Checklist

- [ ] All wizards open correctly
- [ ] Only one wizard is open at a time
- [ ] Switching between wizards works correctly
- [ ] Unimplemented wizards show warning messages
- [ ] Dashboard still works correctly
- [ ] Character management still works correctly
- [ ] Story management still works correctly
