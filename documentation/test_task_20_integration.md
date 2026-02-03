# Task 20 Integration Test Guide

## Overview
This guide provides step-by-step instructions to test the retry functionality UI integration.

## Prerequisites
1. Backend server running (`python backend/feedback_proxy.py`)
2. Frontend development server running (`npm run dev` in creative-studio-ui)
3. GitHub API token configured in backend environment

## Test Scenarios

### Scenario 1: Access Pending Reports List

**Steps**:
1. Open the Creative Studio UI in browser
2. Open the Feedback Panel (Help & Support menu or Ctrl+Shift+F)
3. Look for "View pending reports" link at the bottom left of the dialog
4. Click the link
5. Verify the Pending Reports List modal opens

**Expected Result**:
- ✅ Pending Reports List modal opens
- ✅ Shows "No pending reports" message if no reports exist
- ✅ Shows list of pending reports if any exist

### Scenario 2: Create a Pending Report

**Steps**:
1. Stop the backend server to simulate unavailability
2. Open Feedback Panel
3. Select "Automatic Mode"
4. Fill in:
   - Report Type: Bug Report
   - Description: "Test pending report functionality"
   - Reproduction Steps: "1. Stop backend 2. Submit report"
5. Click "Send to GitHub"
6. Verify error message appears
7. Check `~/.storycore/feedback/pending/` directory for saved report

**Expected Result**:
- ✅ Error message displayed
- ✅ Report saved to local storage
- ✅ File exists in pending directory with format `report_YYYYMMDD_HHMMSS_UUID.json`

### Scenario 3: View Pending Reports

**Steps**:
1. With pending reports in storage (from Scenario 2)
2. Open Feedback Panel
3. Click "View pending reports" link
4. Verify pending reports list displays

**Expected Result**:
- ✅ List shows pending report(s)
- ✅ Each report shows:
  - Filename
  - Timestamp (formatted as YYYY-MM-DD HH:MM:SS)
  - Size (in KB or MB)
  - Report ID
  - Status badge ("Pending")
  - "Retry" button
  - "Delete" button

### Scenario 4: Retry Pending Report (Success)

**Steps**:
1. Start the backend server
2. Open Pending Reports List
3. Click "Retry" button on a pending report
4. Watch the status change

**Expected Result**:
- ✅ Status changes to "Retrying..." with spinner
- ✅ GitHub issue is created
- ✅ Status changes to "Success" with green badge
- ✅ Report is removed from list after 2 seconds
- ✅ Report file is deleted from `~/.storycore/feedback/pending/`

### Scenario 5: Retry Pending Report (Failure)

**Steps**:
1. Stop the backend server
2. Open Pending Reports List
3. Click "Retry" button on a pending report
4. Watch the status change

**Expected Result**:
- ✅ Status changes to "Retrying..." with spinner
- ✅ Status changes to "Failed" with red badge
- ✅ Error message displayed: "Backend proxy unavailable"
- ✅ Report remains in list
- ✅ Can retry again later

### Scenario 6: Delete Pending Report

**Steps**:
1. Open Pending Reports List
2. Click "Delete" button on a pending report
3. Confirm deletion in dialog
4. Verify report is removed

**Expected Result**:
- ✅ Confirmation dialog appears
- ✅ Report is removed from list immediately
- ✅ Report file is deleted from `~/.storycore/feedback/pending/`

### Scenario 7: Refresh Pending Reports

**Steps**:
1. Open Pending Reports List
2. Manually add a report file to `~/.storycore/feedback/pending/`
3. Click "Refresh" button
4. Verify new report appears in list

**Expected Result**:
- ✅ List reloads
- ✅ New report appears
- ✅ Loading spinner shown during refresh

### Scenario 8: Empty State

**Steps**:
1. Delete all pending reports
2. Open Pending Reports List
3. Verify empty state message

**Expected Result**:
- ✅ Empty state icon displayed
- ✅ Message: "No pending reports"
- ✅ Subtext: "All feedback reports have been submitted successfully."

## API Endpoint Testing

### Test GET /api/feedback/pending

```bash
curl http://localhost:8000/api/feedback/pending
```

**Expected Response**:
```json
[
  {
    "report_id": "report_20240115_143022_a1b2c3d4",
    "filename": "report_20240115_143022_a1b2c3d4.json",
    "filepath": "/home/user/.storycore/feedback/pending/report_20240115_143022_a1b2c3d4.json",
    "timestamp": "20240115_143022",
    "size_bytes": 4567
  }
]
```

### Test POST /api/feedback/retry/{report_id}

```bash
curl -X POST http://localhost:8000/api/feedback/retry/report_20240115_143022_a1b2c3d4
```

**Expected Response (Success)**:
```json
{
  "success": true,
  "issue_url": "https://github.com/zedarvates/StoryCore-Engine/issues/123",
  "issue_number": 123
}
```

**Expected Response (Failure)**:
```json
{
  "success": false,
  "error": "Backend proxy unavailable",
  "fallback_mode": "manual"
}
```

### Test DELETE /api/feedback/delete/{report_id}

```bash
curl -X DELETE http://localhost:8000/api/feedback/delete/report_20240115_143022_a1b2c3d4
```

**Expected Response**:
```json
{
  "success": true
}
```

## UI Component Testing

### Visual Verification

1. **Modal Appearance**:
   - ✅ Modal is centered on screen
   - ✅ Has proper backdrop (semi-transparent black)
   - ✅ Has close button (X) in top right
   - ✅ Has proper padding and spacing

2. **Report Cards**:
   - ✅ Each report has border and hover effect
   - ✅ Status badges are color-coded (gray/blue/green/red)
   - ✅ Buttons are properly styled (blue for Retry, red for Delete)
   - ✅ Disabled state shows grayed out buttons

3. **Loading States**:
   - ✅ Spinner shown during initial load
   - ✅ Spinner shown during retry
   - ✅ Loading text is clear

4. **Error States**:
   - ✅ Error banner shown at top
   - ✅ Error icon and message are clear
   - ✅ Error persists until dismissed or refresh

5. **Empty State**:
   - ✅ Icon is centered
   - ✅ Message is clear and helpful
   - ✅ No broken layout

### Responsive Design

Test at different screen sizes:
- ✅ Desktop (1920x1080)
- ✅ Laptop (1366x768)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

## Integration Points

### FeedbackPanel Integration

1. **Link Visibility**:
   - ✅ "View pending reports" link visible in footer
   - ✅ Link is styled as blue text with hover underline
   - ✅ Link is positioned on left side of footer

2. **Navigation**:
   - ✅ Clicking link closes FeedbackPanel
   - ✅ Clicking link opens PendingReportsList
   - ✅ Smooth transition between modals

### App.tsx Integration

1. **State Management**:
   - ✅ `showPendingReportsList` state exists in useAppStore
   - ✅ `setShowPendingReportsList` function works
   - ✅ State persists across component renders

2. **Component Rendering**:
   - ✅ PendingReportsList rendered in all app views
   - ✅ Component receives correct props
   - ✅ Component can be opened and closed

## Troubleshooting

### Issue: Pending Reports List doesn't open

**Solution**:
1. Check browser console for errors
2. Verify `showPendingReportsList` state in React DevTools
3. Verify PendingReportsList component is imported in App.tsx

### Issue: No pending reports shown but files exist

**Solution**:
1. Check file format in `~/.storycore/feedback/pending/`
2. Verify backend endpoint `/api/feedback/pending` returns data
3. Check browser network tab for API errors

### Issue: Retry fails with 404

**Solution**:
1. Verify report_id matches filename
2. Check backend logs for errors
3. Verify FeedbackStorage.get_report_payload() works

### Issue: Delete doesn't remove file

**Solution**:
1. Check file permissions on pending directory
2. Verify backend has write access
3. Check backend logs for deletion errors

## Success Criteria

Task 20 is considered complete when:

- ✅ PendingReportsList component renders correctly
- ✅ Can access list from FeedbackPanel
- ✅ Can view list of pending reports
- ✅ Can retry pending reports successfully
- ✅ Can delete pending reports
- ✅ Retry falls back to Manual Mode on failure
- ✅ Reports are removed from list on successful retry
- ✅ All UI states work correctly (loading, error, empty, success)
- ✅ Backend endpoints respond correctly
- ✅ Integration with App.tsx is complete

## Next Steps

After completing these tests:

1. **Optional**: Add keyboard shortcut (Ctrl+Shift+P) to open pending reports
2. **Optional**: Add menu item in Help menu
3. **Optional**: Add notification badge showing count of pending reports
4. **Optional**: Add automatic retry on interval
5. **Optional**: Add batch retry all functionality

---

**Test Date**: _____________  
**Tester**: _____________  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _____________________________________________
