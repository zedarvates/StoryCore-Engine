# Testing Checklist - Project Navigation

## Prerequisites
1. Build completed: ✅
2. No TypeScript errors: ✅
3. Start application: `.\start-electron.bat`

## Test Cases

### Test 1: Create New Project
**Steps**:
1. Launch application
2. Click "New Project" button
3. Enter project name (e.g., "Test Project 1")
4. Select/confirm project location
5. Click "Create"

**Expected Result**:
- ✅ Project is created on disk
- ✅ Dialog closes automatically
- ✅ Application navigates to editor view
- ✅ Editor shows: "Project Loaded Successfully"
- ✅ Project name is displayed correctly
- ✅ Shots count shows 0
- ✅ Assets count shows 0

**Console Output Should Show**:
```
Project created and loaded successfully: { project_name: "Test Project 1", ... }
```

---

### Test 2: Open Existing Project
**Steps**:
1. From Landing Page, click "Open Project" button
2. Select an existing project directory
3. Confirm selection

**Expected Result**:
- ✅ Project is loaded from disk
- ✅ Application navigates to editor view
- ✅ Editor shows project details correctly
- ✅ All project data is loaded (shots, assets, etc.)

**Console Output Should Show**:
```
Project opened and loaded successfully: { project_name: "...", ... }
```

---

### Test 3: Open Recent Project
**Steps**:
1. From Landing Page, locate "Recent Projects" section
2. Click on a recent project card

**Expected Result**:
- ✅ Project is loaded from disk
- ✅ Application navigates to editor view immediately
- ✅ Editor shows project details correctly
- ✅ Recent projects list updates "last accessed" time

**Console Output Should Show**:
```
Recent project opened and loaded: { project_name: "...", ... }
```

---

### Test 4: Error Handling - Invalid Project
**Steps**:
1. Try to open a non-existent or corrupted project
2. Observe error handling

**Expected Result**:
- ✅ Error message is displayed to user
- ✅ Application remains on Landing Page
- ✅ User can try again or create new project
- ✅ No crash or blank screen

---

### Test 5: Close Project and Return to Landing
**Steps**:
1. With a project open in editor
2. Click "Close Project" button

**Expected Result**:
- ✅ Application returns to Landing Page
- ✅ Recent projects list is updated
- ✅ Can open another project or create new one

---

### Test 6: Demo Mode (No Electron API)
**Steps**:
1. Test in web browser (without Electron)
2. Create/open project

**Expected Result**:
- ✅ Demo mode activates automatically
- ✅ Simulated project creation works
- ✅ Navigation to editor works
- ✅ Demo project has all required fields

---

## Known Issues to Watch For

### Issue 1: Project Not Loading
**Symptom**: Dialog closes but stays on Landing Page
**Cause**: Store not updated
**Check**: Console for "Project created/opened and loaded successfully" message

### Issue 2: TypeScript Errors in Console
**Symptom**: Red errors in browser console
**Cause**: Type mismatch between Electron and Store projects
**Check**: Verify `convertElectronProjectToStore()` is working correctly

### Issue 3: Missing Project Data
**Symptom**: Editor shows but project name/data is missing
**Cause**: Incomplete conversion from Electron to Store format
**Check**: Verify all required fields are populated in converter function

---

## Success Criteria
All 6 test cases pass without errors ✅

## Regression Testing
- ✅ Existing features still work (menu, dialogs, etc.)
- ✅ No new console errors or warnings
- ✅ Application performance is not degraded
- ✅ File system operations work correctly

---

## Next Steps After Testing
1. If all tests pass → Mark task as complete
2. If issues found → Document and fix
3. Consider adding automated tests for these flows
4. Plan wizard integration for post-creation setup
