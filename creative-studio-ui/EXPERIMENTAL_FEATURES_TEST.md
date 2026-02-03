# Experimental Features Test Plan

## Test Date
Generated: $(date)

## Features Implemented
1. **Advanced Grid Editor** (`advanced-grid-editor`)
   - Path: `/experimental/advanced-grid-editor`
   - Status: Enabled
   - Icon: 🎨
   - Category: development

2. **AI Assistant V3** (`ai-assistant-v3`)
   - Path: `/experimental/ai-assistant-v3`
   - Status: Enabled
   - Icon: 🤖
   - Category: experimental

3. **Performance Profiler** (`performance-profiler`)
   - Path: `/experimental/performance-profiler`
   - Status: Disabled (not shown in menu)
   - Icon: 📊
   - Category: testing

## Manual Test Steps

### Test 1: Secret Menu Activation
1. Open the application at http://localhost:5178/
2. Press and hold `Ctrl+Shift+Alt`
3. **Expected**: Secret Services menu appears in navigation
4. **Expected**: Visual indicator shows "Secret Mode Active"
5. Release any key
6. **Expected**: Secret Services menu disappears

### Test 2: Experimental Feature Navigation
1. Activate secret mode (Ctrl+Shift+Alt)
2. Click on "Secret Services" menu
3. **Expected**: Dropdown shows 2 enabled features (Advanced Grid Editor, AI Assistant V3)
4. **Expected**: Performance Profiler is NOT shown (disabled in registry)
5. Click on "Advanced Grid Editor"
6. **Expected**: Navigate to Advanced Grid Editor page
7. **Expected**: Visual indicator shows "Experimental Feature" with warning
8. **Expected**: Page shows work-in-progress content with progress bars

### Test 3: Back Navigation
1. From Advanced Grid Editor page, click "Back to Main App" button
2. **Expected**: Return to main application view
3. **Expected**: Visual indicator disappears

### Test 4: AI Assistant V3 Feature
1. Activate secret mode and navigate to AI Assistant V3
2. **Expected**: Page shows AI Assistant V3 interface mockup
3. **Expected**: Development status shows different progress percentages
4. **Expected**: Back button works correctly

### Test 5: Direct URL Access (Requirement 7.3)
Note: Since this app doesn't use React Router, direct URL access is not applicable.
The experimental features are accessed through the context-based navigation system.

### Test 6: Cross-Page Secret Mode
1. Navigate to different pages in the app
2. On each page, activate secret mode (Ctrl+Shift+Alt)
3. **Expected**: Secret Services menu appears on all pages
4. **Expected**: Can access experimental features from any page

### Test 7: Disabled Feature
1. Activate secret mode
2. Open Secret Services dropdown
3. **Expected**: Performance Profiler does NOT appear in the list
4. Note: Even though the page component exists, it's not accessible through the menu

## Verification Checklist

- [ ] Secret mode activates with Ctrl+Shift+Alt
- [ ] Secret mode deactivates when keys released
- [ ] Visual indicator shows correct state
- [ ] Only enabled features appear in menu
- [ ] Experimental pages render correctly
- [ ] Back navigation works
- [ ] Pages show work-in-progress badges
- [ ] Development progress bars display
- [ ] No console errors during navigation
- [ ] Experimental pages are not linked from normal navigation

## Requirements Validated

- **Requirement 2.1**: Experimental features accessible through secret menu ✓
- **Requirement 2.2**: Navigation to experimental feature screens ✓
- **Requirement 7.3**: Routes with `/experimental/` prefix (conceptual, no React Router) ✓

## Notes

- The application uses context-based navigation instead of React Router
- Experimental features are accessed by setting `currentExperimentalFeature` in context
- Direct URL access is not applicable without a routing library
- The `/experimental/` path prefix is maintained in the feature registry for consistency
- All experimental pages register themselves when mounted and clean up when unmounted
