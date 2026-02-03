# Menu System Fixes - Character Wizard, Story Generator, and Report Issue

## Issues Fixed

### 1. Character Wizard & Story Generator Menu Items
**Problem**: Menu items for "Character Wizard" and "Story Generator" were not opening the correct modals/wizards.

**Root Cause**: The menu configuration referenced action handlers that didn't exist or were incomplete in `menuActions.ts`.

**Solution**: 
- Updated `projectActions.characters()` to open the Character Wizard modal via `store.setShowCharactersModal(true)`
- Updated `projectActions.sequences()` to open the Sequence Plan Wizard via `store.openSequencePlanWizard()`
- These are now accessible via Project menu → Characters and Project menu → Sequences

### 2. Help → Report Issue Menu Item
**Problem**: "Help → Report Issue" was opening a web page instead of using the existing feedback/report window.

**Root Cause**: The `helpActions.reportBug()` was calling `window.open('https://github.com/storycore/issues', '_blank')` instead of using the app's feedback panel.

**Solution**:
- Changed `helpActions.reportIssue()` to open the feedback panel via `store.setShowFeedbackPanel(true)`
- This now uses the existing in-app feedback window instead of opening an external web page

## Files Modified

### 1. `creative-studio-ui/src/components/menuBar/menuActions.ts`
- Added import for `useAppStore` from the app store
- Updated `projectActions` to properly open wizards and modals:
  - `settings()` → Opens Project Setup Wizard
  - `characters()` → Opens Characters Modal
  - `sequences()` → Opens Sequence Plan Wizard
  - `assets()` → Opens Image Gallery Modal
- Updated `editActions` to open settings modals:
  - `openLLMSettings()` → Opens LLM Settings
  - `openComfyUISettings()` → Opens ComfyUI Settings
  - `openAddonsSettings()` → Opens Addons Modal
  - `openGeneralSettings()` → Opens General Settings
- Updated `toolsActions` to properly open wizards:
  - `llmAssistant()` → Opens Chat
  - `comfyuiServer()` → Opens ComfyUI Settings
  - `scriptWizard()` → Opens Project Setup Wizard
  - `batchGeneration()` → Shows notification (coming soon)
  - `qualityAnalysis()` → Shows notification (coming soon)
- Updated `helpActions` to use modals instead of web pages:
  - `reportIssue()` → Opens Feedback Panel (was opening GitHub web page)
  - `documentation()` → Still opens external docs (intentional)
  - `keyboardShortcuts()` → Shows notification (coming soon)
  - `about()` → Shows notification
  - `checkUpdates()` → Shows notification

### 2. `creative-studio-ui/src/config/menuBarConfig.ts`
- Updated action references to match new handler names:
  - Help menu: `helpActions.reportBug` → `helpActions.reportIssue`
  - Help menu: `helpActions.openDocumentation` → `helpActions.documentation`
  - Help menu: `helpActions.openAbout` → `helpActions.about`
  - Help menu: `helpActions.checkForUpdates` → `helpActions.checkUpdates`
  - Help menu: `helpActions.keyboardShortcuts` → `helpActions.keyboardShortcuts`

## Menu Structure After Fixes

### Project Menu
- Settings → Opens Project Setup Wizard
- Characters → Opens Characters Modal (Character Wizard)
- Sequences → Opens Sequence Plan Wizard (Story Generator)
- Assets → Opens Image Gallery Modal

### Edit Menu → Settings
- LLM Settings → Opens LLM Configuration Modal
- ComfyUI Settings → Opens ComfyUI Configuration Modal
- Addons → Opens Addons Management Modal
- General Settings → Opens General Settings Modal

### Tools Menu
- LLM Assistant → Opens Chat Panel
- ComfyUI Server → Opens ComfyUI Settings
- Script Wizard → Opens Project Setup Wizard
- Batch Generation → Shows notification (coming soon)
- Quality Analysis → Shows notification (coming soon)

### Help Menu
- Documentation → Opens external docs (intentional)
- Keyboard Shortcuts → Shows notification (coming soon)
- About → Shows notification
- Check Updates → Shows notification
- Report Issue → Opens in-app Feedback Panel (FIXED - was opening GitHub web page)

## Testing Recommendations

1. **Character Wizard**: Click Project → Characters and verify the Characters Modal opens
2. **Story Generator**: Click Project → Sequences and verify the Sequence Plan Wizard opens
3. **Report Issue**: Click Help → Report Issue and verify the in-app Feedback Panel opens (not a web page)
4. **Settings**: Test all settings menu items to ensure they open the correct modals
5. **Tools**: Test LLM Assistant and ComfyUI Server to ensure they open correctly

## Notes

- All menu actions now properly integrate with the Zustand app store
- Modal/wizard opening is now consistent across the application
- The Report Issue feature now uses the existing in-app feedback system instead of external web pages
- All action handlers are synchronous (no async/await) for consistency with the menu system
