# Bug Report: Data Persistence Issues in StoryCore

## Report Information

| Field | Value |
|-------|-------|
| **Bug ID** | PERSISTENCE-001 |
| **Title** | Project Data Loss on Close/Reopen - Images, Header, and Variables Disappearing |
| **Severity** | Critical (P0) |
| **Status** | Confirmed |
| **Date Reported** | 2026-03-25 |
| **Reporter** | StoryCore Development Team |
| **Affected Versions** | All versions prior to fix |
| **Priority** | High |

---

## Executive Summary

This bug report documents a critical data persistence issue in StoryCore where project data (images, header/summary, and state variables) is lost when closing and reopening a project. The issue severely impacts user experience and data integrity.

---

## 1. Steps to Reproduce

### Primary Reproduction Path

1. **Create a new project** in StoryCore using the project wizard
2. **Add content to the project**:
   - Upload character images
   - Add location images/tiles
   - Create a header/summary for the project
   - Set various state variables and preferences
3. **Close the project** (close the application or switch to another project)
4. **Reopen the project** - Navigate back to the previously created project
5. **Observe the data loss**:
   - Images are missing or show broken links
   - Header/summary is empty or missing
   - Previously set variables have reverted to defaults

### Alternative Reproduction Path

1. Open an existing project with images and content
2. Close the application normally (File > Exit or window close)
3. Reopen StoryCore
4. Load the same project
5. Verify that images and header data are not loaded

---

## 2. Behavior

### Expected Behavior

When a user closes and reopens a project in StoryCore:

1. **Images**: All character images, location tiles, and visual assets should persist and be accessible offline
2. **Header/Summary**: The project header/summary text should be preserved and displayed
3. **Variables**: All state variables, preferences, and project-specific data should be restored to their previous values
4. **Complete State**: The project should appear exactly as it was when closed, with no data loss

### Observed Behavior

Upon reopening a project:

1. **Images Disappear**:
   - Character images are not displayed
   - Location tiles/visuals are missing
   - Visual assets show broken image placeholders
   - Images stored as ComfyUI dynamic URLs are unavailable offline

2. **Header/Résumé Missing**:
   - The project header area is empty
   - Summary text is not displayed
   - Data appears as if never created

3. **Variables Not Loaded**:
   - State variables revert to default values
   - User preferences are lost
   - Project-specific data is not restored
   - Zustand store only persists UI preferences, not project data

---

## 3. Root Cause Analysis

### 3.1 Image Storage Issue

**Problem**: Images are stored as dynamic ComfyUI URLs that are not available offline.

**Root Cause**:
- Images are generated through ComfyUI and stored as temporary URLs
- No local copy is created during the save process
- URLs become invalid when ComfyUI server is not running or session expires

**Affected Code Areas**:
- Character image handling
- Location tile management
- Visual asset storage

**Solution Required**:
- Implement automatic local image copying during save
- Store images in project directory with persistent paths
- Use local file paths instead of dynamic URLs

### 3.2 Header/Summary Field Missing

**Problem**: The "summary" field exists in project.json but is not mapped in ProjectConfig.

**Root Cause**:
- The `project.json` file contains a "summary" field
- The `ProjectConfig` TypeScript interface does not include this field
- Data is saved but not loaded due to type mismatch

**Affected Code Areas**:
- `ProjectConfig` interface definition
- Project loading/saving logic
- Type validation

**Solution Required**:
- Add "summary" field to ProjectConfig interface
- Ensure proper serialization/deserialization
- Validate field presence during load

### 3.3 Zustand Store Persistence Issue

**Problem**: The Zustand store only persists UI preferences, not project data.

**Root Cause**:
- Current persistence middleware only targets UI preferences
- Project-specific state variables are not included in persistence
- No mechanism to restore full project state on load

**Affected Code Areas**:
- Zustand store configuration
- Persistence middleware setup
- State hydration on project load

**Solution Required**:
- Extend persistence to include critical project state
- Implement proper state hydration
- Add state validation on load

---

## 4. Impact Assessment

### User Impact

| Impact Area | Severity | Description |
|-------------|----------|-------------|
| **Data Loss** | Critical | Users lose all images, header, and variables |
| **Workflow Disruption** | High | Cannot continue work from previous session |
| **Trust** | High | Users may lose confidence in the application |
| **Productivity** | High | Must recreate content from scratch |
| **Offline Use** | Critical | Cannot work offline with existing projects |

### Technical Impact

| Area | Impact |
|------|--------|
| **Data Integrity** | Project files become incomplete |
| **Backup Reliability** | Backups may contain incomplete data |
| **Migration** | Cannot reliably migrate projects |
| **Collaboration** | Shared projects lose data |

### Business Impact

| Factor | Impact |
|--------|--------|
| **User Retention** | High risk of user churn |
| **Support Cost** | Increased support tickets |
| **Reputation** | Negative reviews due to data loss |
| **Development Time** | Significant fix required |

---

## 5. Affected Components

### Primary Components

1. **Project Service** (`electron/ProjectService.ts`)
   - Project load/save operations
   - Data serialization

2. **Project Config** (`creative-studio-ui/src/config/`)
   - ProjectConfig interface
   - Type definitions

3. **Zustand Store** (`creative-studio-ui/src/stores/`)
   - State management
   - Persistence middleware

4. **Image Storage** (`creative-studio-ui/src/utils/`)
   - Image handling utilities
   - Asset management

### Secondary Components

1. **Character Storage** (`characterStorage.ts`)
2. **Location Storage** (`locationStorage.ts`)
3. **Project Manager** (`projectManager.ts`)
4. **Storage Manager** (`storageManager.ts`)

---

## 6. Proposed Solutions

### Solution 1: Enhanced Project Storage System

Create a comprehensive storage system that:
- Automatically copies images to local storage
- Includes summary field in project config
- Implements backup system
- Persists critical state variables

### Solution 2: Project Integrity Checker

Implement pre-save validation that:
- Verifies data consistency
- Copies remote images locally
- Validates all required fields
- Proposes automatic corrections

### Solution 3: Diagnostic System

Create diagnostic tools that:
- Check project data integrity on load
- Detect missing images
- Validate metadata
- Generate detailed reports

---

## 7. Testing Recommendations

### Unit Tests

1. Test image local copy functionality
2. Test summary field serialization
3. Test state persistence and hydration
4. Test integrity validation

### Integration Tests

1. Test full save/load cycle
2. Test project reopening
3. Test offline functionality
4. Test backup restoration

### Manual Testing

1. Create project with all content types
2. Close and reopen multiple times
3. Test with various image sources
4. Test offline scenarios

---

## 8. Related Issues

- Issue #001: Image URL expiration not handled
- Issue #002: ProjectConfig missing fields
- Issue #003: Zustand persistence incomplete
- Issue #004: No offline image support

---

## 9. Attachments

- Project structure diagram
- Sample project.json with issue
- Error logs from reproduction
- Screen recordings of bug

---

## 10. Conclusion

This is a critical bug that severely impacts user experience and data integrity. The fix requires a comprehensive approach including:

1. Local image storage implementation
2. ProjectConfig interface update
3. Extended Zustand persistence
4. Diagnostic and validation systems

**Recommended Priority**: P0 - Critical
**Estimated Fix Time**: 2-3 sprints
**Risk Level**: High if not addressed

---

*Report generated by StoryCore Development Team*
*Last updated: 2026-03-25*
