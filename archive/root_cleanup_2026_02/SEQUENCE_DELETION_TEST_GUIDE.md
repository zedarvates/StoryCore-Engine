# Sequence Deletion Test Guide

## Pre-Test Setup

1. Open the Creative Studio UI
2. Create or open a project with at least 2 sequences
3. Verify sequences are visible in the "Plan Sequences" section of the dashboard

## Test Case 1: Basic Sequence Deletion

### Steps
1. Locate a sequence in the "Plan Sequences" section
2. Click the red trash button (Trash2 icon) on the sequence card
3. Verify confirmation modal appears with:
   - Title: "Delete Sequence"
   - Message: "Are you sure you want to delete "[sequence name]"? This will also delete all associated shots and cannot be undone."
   - Red "Confirm" button
   - Gray "Cancel" button

### Expected Results
- ✅ Modal appears with correct styling (danger variant - red)
- ✅ Modal is centered on screen
- ✅ Backdrop is visible behind modal

## Test Case 2: Confirm Deletion

### Steps
1. From Test Case 1, click the red "Confirm" button
2. Observe the modal during deletion

### Expected Results
- ✅ "Confirm" button shows loading spinner
- ✅ "Cancel" button is disabled
- ✅ Close button (X) is disabled
- ✅ Modal remains open during deletion
- ✅ Success notification appears: "Sequence deleted successfully"
- ✅ Modal closes automatically
- ✅ Sequence disappears from the dashboard
- ✅ Remaining sequences are visible

## Test Case 3: Cancel Deletion

### Steps
1. Click red trash button on a sequence
2. Confirmation modal appears
3. Click "Cancel" button
4. Verify modal closes

### Expected Results
- ✅ Modal closes without deleting sequence
- ✅ Sequence remains in dashboard
- ✅ No notification appears

## Test Case 4: Close Modal with X Button

### Steps
1. Click red trash button on a sequence
2. Confirmation modal appears
3. Click the X button in the top-right corner
4. Verify modal closes

### Expected Results
- ✅ Modal closes without deleting sequence
- ✅ Sequence remains in dashboard
- ✅ No notification appears

## Test Case 5: Close Modal with Escape Key

### Steps
1. Click red trash button on a sequence
2. Confirmation modal appears
3. Press Escape key
4. Verify modal closes

### Expected Results
- ✅ Modal closes without deleting sequence
- ✅ Sequence remains in dashboard
- ✅ No notification appears

## Test Case 6: File System Verification

### Steps
1. Create a project with sequences
2. Note the project path (visible in project settings or metadata)
3. Delete a sequence using the UI
4. Open file explorer and navigate to `{projectPath}/sequences/`
5. Verify the sequence JSON file is deleted
6. Navigate to `{projectPath}/shots/`
7. Verify associated shot JSON files are deleted

### Expected Results
- ✅ Sequence JSON file is removed from `/sequences/` directory
- ✅ Associated shot JSON files are removed from `/shots/` directory
- ✅ Other sequences and shots remain intact

## Test Case 7: Sequence Reordering

### Steps
1. Create a project with 3 sequences (Order 1, 2, 3)
2. Delete the middle sequence (Order 2)
3. Verify remaining sequences

### Expected Results
- ✅ Remaining sequences are reordered
- ✅ First sequence remains Order 1
- ✅ Third sequence becomes Order 2
- ✅ Sequence files are updated with new order numbers

## Test Case 8: Multiple Deletions

### Steps
1. Create a project with 3+ sequences
2. Delete first sequence
3. Verify deletion completes
4. Delete another sequence
5. Verify deletion completes

### Expected Results
- ✅ Each deletion completes successfully
- ✅ UI updates correctly after each deletion
- ✅ No errors or stuck states
- ✅ Sequences are properly reordered after each deletion

## Test Case 9: Error Handling

### Steps
1. Create a project with sequences
2. Manually delete the sequence JSON file from the file system
3. Try to delete the sequence from the UI
4. Observe error handling

### Expected Results
- ✅ Error notification appears
- ✅ Modal closes
- ✅ UI remains stable
- ✅ No console errors

## Test Case 10: Shots Associated with Sequence

### Steps
1. Create a project with a sequence containing multiple shots
2. Delete the sequence
3. Verify all associated shots are deleted

### Expected Results
- ✅ All shots associated with the sequence are deleted
- ✅ Shot files are removed from `/shots/` directory
- ✅ Shots are removed from the app store
- ✅ No orphaned shot files remain

## Browser Console Checks

During testing, open the browser console (F12) and verify:

1. **No JavaScript Errors**
   - No red error messages
   - No uncaught exceptions

2. **Logging Output**
   - Look for log messages like:
     - `Deleted sequence file: {path}`
     - `Deleted shot file: {path}`
   - Verify no warning messages about missing APIs

3. **Network Activity**
   - Verify IPC calls to Electron API
   - Check for successful responses

## Performance Checks

1. **Deletion Speed**
   - Deletion should complete within 2-5 seconds
   - No UI freezing or lag

2. **Memory Usage**
   - No memory leaks after multiple deletions
   - Browser memory should remain stable

## Accessibility Checks

1. **Keyboard Navigation**
   - Tab through modal buttons
   - Verify focus is visible
   - Verify Enter key confirms deletion
   - Verify Escape key cancels

2. **Screen Reader**
   - Modal title is announced
   - Modal message is announced
   - Buttons are properly labeled

## Regression Testing

After the fix, verify these features still work:

1. **Sequence Creation** - Can still create new sequences
2. **Sequence Editing** - Can still edit sequence properties
3. **Shot Management** - Can still manage shots within sequences
4. **Project Saving** - Project saves correctly after deletion
5. **Project Loading** - Project loads correctly after deletion

## Test Results Template

```
Test Case: [Number and Name]
Date: [Date]
Tester: [Name]
Browser: [Browser and Version]
OS: [Operating System]

Steps Performed:
[List steps]

Expected Results:
[List expected results]

Actual Results:
[List actual results]

Status: ✅ PASS / ❌ FAIL

Notes:
[Any additional notes]
```

## Known Issues to Watch For

1. **Modal Not Closing** - If modal doesn't close, check browser console for errors
2. **Files Not Deleted** - Verify Electron API is available and working
3. **UI Not Updating** - Check that `setForceUpdate` is being called
4. **Reordering Issues** - Verify sequence order is correctly updated in JSON files

## Support

If tests fail:
1. Check browser console for errors
2. Check Electron main process logs
3. Verify file system permissions
4. Verify project path is correct
5. Check that Electron API is properly exposed
