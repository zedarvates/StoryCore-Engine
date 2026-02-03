# Asset Panel Fix - TODO

**Date:** January 26, 2026
**Status:** In Progress

## Problem
Assets not visible or loading incorrectly in the Asset Panel.

## Root Causes
1. Incorrect asset paths pointing to non-existent folders (`/src/assets/images/`, `/assets/audio/`)
2. Dependency on `window.electronAPI` which is not available in browser context
3. No graceful fallback when assets fail to load

## Available Assets (to use as source)
- `/assets/library/` - Library assets, includes StorycoreIconeV2.png
- `/assets/resources/` - Resources including jpg-files, icons, ui assets
- `/assets/workflows/` - Workflow templates

## Tasks

### Step 1: Update assetLibraryService.ts with correct paths
- [ ] Fix BASE_LIBRARY_ASSETS paths to use existing files
- [ ] Add browser fallback mode for development
- [ ] Add demo assets from available resources
- [ ] Add better error handling

### Step 2: Update AssetPanel.tsx with better error states
- [ ] Add visual feedback when no assets available
- [ ] Add "Demo Mode" indicator
- [ ] Improve loading/error states

### Step 3: Test the fix
- [ ] Verify assets load in browser context
- [ ] Verify fallback mode works

## Implementation Notes

### Correct paths to use:
- `/assets/library/StorycoreIconeV2.png` → exists
- `/assets/resources/jpg-files/` → exists with multiple images
- `/assets/resources/icons/` → exists with icons
- `/assets/resources/ui/` → exists with UI assets

### Demo mode fallback:
When `window.electronAPI` is not available, use local demo assets from the public folder.

## Files to modify:
- `creative-studio-ui/src/services/assetLibraryService.ts`
- `creative-studio-ui/src/components/AssetPanel.tsx`

