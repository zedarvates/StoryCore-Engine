# Shot Deletion with Phrase Handling

## Overview

The shot deletion functionality provides a safe and user-friendly way to delete shots from a project while properly handling associated dialogue phrases. This ensures data integrity and prevents orphaned phrase references.

**Requirements:** 7.3

## Components

### ShotDeletionDialog

A confirmation dialog that prompts users to choose how to handle associated dialogue phrases when deleting a shot.

**Props:**
- `shot: Shot` - The shot to be deleted
- `associatedPhrases: DialoguePhrase[]` - Dialogue phrases linked to this shot
- `isOpen: boolean` - Whether the dialog is visible
- `onConfirmDelete: (deletePhrases: boolean) => void` - Callback when deletion is confirmed
- `onCancel: () => void` - Callback when deletion is cancelled

**Features:**
- Displays shot information and associated phrase count
- Provides two deletion options when phrases exist:
  - **Delete Shot and Phrases**: Permanently removes both shot and phrases
  - **Delete Shot, Keep Phrases (Unlink)**: Removes shot but keeps phrases with empty shotId
- Shows clear explanations of each option
- Accessible with ARIA labels and keyboard navigation

## Context Integration

### ProjectContext.deleteShot

The `deleteShot` function in ProjectContext handles the actual deletion logic:

```typescript
deleteShot(shotId: string, deletePhrases: boolean): void
```

**Parameters:**
- `shotId` - ID of the shot to delete
- `deletePhrases` - If true, delete associated phrases; if false, unlink them

**Behavior:**
1. Verifies shot exists
2. Removes shot from shots array
3. Handles associated phrases based on `deletePhrases` parameter:
   - If true: Removes all phrases with matching shotId
   - If false: Sets shotId to empty string for all matching phrases
4. Removes shot from all sequences
5. Triggers auto-save

## Utility Functions

### shotDeletion.ts

Provides helper functions for shot deletion operations:

#### validateShotDeletion
```typescript
validateShotDeletion(shotId: string, project: Project): ShotDeletionValidation
```
Validates that a shot can be deleted and returns information about associated data.

**Returns:**
- `canDelete: boolean` - Whether deletion is allowed
- `errors: string[]` - Any errors preventing deletion
- `warnings: string[]` - Warnings about associated data
- `associatedPhrases: DialoguePhrase[]` - Phrases linked to the shot
- `affectedSequences: string[]` - Sequences containing the shot

#### detectOrphanedPhrases
```typescript
detectOrphanedPhrases(project: Project): DialoguePhrase[]
```
Finds phrases that reference non-existent shots (orphaned references).

#### validateNoOrphanedPhrases
```typescript
validateNoOrphanedPhrases(project: Project): boolean
```
Validates that no orphaned phrase references exist in the project.

#### simulateShotDeletion
```typescript
simulateShotDeletion(
  shotId: string,
  project: Project,
  options: ShotDeletionOptions
): Project
```
Simulates deletion and returns the resulting project state without mutating the original.

#### getShotDeletionSummary
```typescript
getShotDeletionSummary(
  shotId: string,
  project: Project,
  options: ShotDeletionOptions
): ShotDeletionSummary
```
Gets a summary of what will be affected by the deletion.

#### validateShotPhraseIntegrity
```typescript
validateShotPhraseIntegrity(project: Project): IntegrityValidation
```
Validates the integrity of all shot-phrase relationships in the project.

## Usage Example

```typescript
import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { ShotDeletionDialog } from '../components/ShotDeletionDialog';
import { validateShotDeletion } from '../utils/shotDeletion';

function ShotManager() {
  const { project, deleteShot } = useProject();
  const [shotToDelete, setShotToDelete] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  const handleDeleteClick = (shot) => {
    // Validate deletion
    const validation = validateShotDeletion(shot.id, project);
    
    if (!validation.canDelete) {
      alert(`Cannot delete: ${validation.errors.join(', ')}`);
      return;
    }

    // Show confirmation dialog
    setShotToDelete(shot);
    setShowDialog(true);
  };

  const handleConfirmDelete = (deletePhrases) => {
    if (!shotToDelete) return;

    // Delete the shot
    deleteShot(shotToDelete.id, deletePhrases);

    // Close dialog
    setShowDialog(false);
    setShotToDelete(null);
  };

  const associatedPhrases = shotToDelete
    ? project.audioPhrases.filter(p => p.shotId === shotToDelete.id)
    : [];

  return (
    <div>
      {project.shots.map(shot => (
        <div key={shot.id}>
          <span>{shot.id}</span>
          <button onClick={() => handleDeleteClick(shot)}>
            Delete
          </button>
        </div>
      ))}

      {shotToDelete && (
        <ShotDeletionDialog
          shot={shotToDelete}
          associatedPhrases={associatedPhrases}
          isOpen={showDialog}
          onConfirmDelete={handleConfirmDelete}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}
```

## Data Integrity Guarantees

The shot deletion system ensures:

1. **No Orphaned References**: Phrases are either deleted or unlinked (shotId set to empty string)
2. **Sequence Consistency**: Shot is removed from all sequences
3. **Validation**: Pre-deletion validation prevents invalid operations
4. **Post-Deletion Integrity**: Utility functions can verify integrity after deletion
5. **Auto-Save**: Changes are automatically persisted

## Phrase Handling Options

### Option 1: Delete Shot and Phrases
- **Use Case**: Shot and its dialogue are no longer needed
- **Result**: Both shot and all associated phrases are permanently removed
- **Data State**: Clean removal with no references remaining

### Option 2: Delete Shot, Keep Phrases (Unlink)
- **Use Case**: Dialogue might be reused with other shots
- **Result**: Shot is removed, phrases remain with empty shotId
- **Data State**: Phrases exist but are unlinked (can be linked to other shots later)

## Accessibility

The ShotDeletionDialog component follows accessibility best practices:

- **ARIA Labels**: All interactive elements have descriptive labels
- **Role Attributes**: Dialog uses proper `role="dialog"` and `aria-modal="true"`
- **Keyboard Navigation**: Full keyboard support for all actions
- **Focus Management**: Focus is properly managed when dialog opens/closes
- **Screen Reader Support**: Clear announcements for all actions

## Testing

See `src/__tests__/shotDeletion.test.ts` for comprehensive unit tests covering:
- Shot deletion with phrase deletion
- Shot deletion with phrase unlinking
- Orphaned phrase detection
- Validation functions
- Integrity checks
- Edge cases (non-existent shots, empty projects, etc.)

## Related Requirements

- **Requirement 7.3**: Shot deletion with confirmation and phrase handling
- **Requirement 4.4**: Dialogue phrase management
- **Requirement 9.1, 9.2**: Auto-save on data changes

## See Also

- [ProjectContext Documentation](../contexts/ProjectContext.tsx)
- [Timeline Synchronization](../utils/timelineSynchronization.ts)
- [Shot Deletion Example](../examples/ShotDeletionExample.tsx)
