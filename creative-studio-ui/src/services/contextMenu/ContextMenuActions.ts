import { Shot } from '../../types';
import { clipboardManager } from '../clipboard/ClipboardManager';

/**
 * Generate a unique name for a duplicated shot
 * Adds a numeric suffix like " (2)", " (3)", etc.
 */
export const generateDuplicateName = (originalName: string, existingNames: string[]): string => {
  let counter = 2; // Start from 2 since the original is (1)
  let newName = `${originalName} (${counter})`;
  
  while (existingNames.includes(newName)) {
    counter++;
    newName = `${originalName} (${counter})`;
  }
  
  return newName;
};

/**
 * Copy shots to clipboard
 * Requirements: 13.1, 13.2
 */
export const copyShots = (shots: Shot[], sourceSequenceId?: string): void => {
  clipboardManager.copy(shots, sourceSequenceId);
};

/**
 * Cut shots to clipboard
 * Requirements: 13.1, 13.5
 */
export const cutShots = (shots: Shot[], sourceSequenceId?: string): void => {
  clipboardManager.cut(shots, sourceSequenceId);
};

/**
 * Paste shots from clipboard
 * Requirements: 13.2, 13.3, 13.4
 */
export const pasteShots = (
  targetSequenceId?: string,
  position?: number
): Shot[] | null => {
  const result = clipboardManager.paste({
    targetSequenceId,
    position,
    validateCompatibility: true,
  });

  if (result.success) {
    return result.pastedShots;
  }

  if (result.errors && result.errors.length > 0) {
    console.error('Paste failed:', result.errors);
    alert(`Failed to paste: ${result.errors.join(', ')}`);
  }

  return null;
};

/**
 * Duplicate a shot with a unique name
 */
export const duplicateShot = (shot: Shot, existingShots: Shot[]): Shot => {
  const existingNames = existingShots.map(s => s.title);
  const newName = generateDuplicateName(shot.title, existingNames);
  
  return {
    ...shot,
    id: `shot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: newName,
    position: shot.position + 1, // Insert after original
    metadata: {
      ...shot.metadata,
      duplicatedFrom: shot.id,
      createdAt: new Date().toISOString()
    }
  };
};

/**
 * Duplicate multiple shots
 */
export const duplicateShots = (shots: Shot[], allShots: Shot[]): Shot[] => {
  return shots.map(shot => duplicateShot(shot, allShots));
};

/**
 * Check if deletion requires confirmation
 * Returns true if more than 5 shots are selected
 */
export const requiresDeleteConfirmation = (shotCount: number): boolean => {
  return shotCount > 5;
};

/**
 * Show confirmation dialog for deletion
 */
export const confirmDelete = async (shotCount: number): Promise<boolean> => {
  if (!requiresDeleteConfirmation(shotCount)) {
    return true;
  }
  
  return new Promise((resolve) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${shotCount} shots? This action cannot be undone.`
    );
    resolve(confirmed);
  });
};

/**
 * Delete shots with confirmation if needed
 */
export const deleteShots = async (
  shots: Shot[],
  onDelete: (shotIds: string[]) => void
): Promise<boolean> => {
  const confirmed = await confirmDelete(shots.length);
  
  if (confirmed) {
    onDelete(shots.map(s => s.id));
    return true;
  }
  
  return false;
};

/**
 * Export shots to JSON
 */
export const exportShots = (shots: Shot[]): void => {
  const data = JSON.stringify(shots, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `shots-export-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Transform shots (placeholder for future implementation)
 */
export const transformShots = (
  shots: Shot[],
  transformType: 'resize' | 'crop' | 'filter' | 'adjust',
  onTransform: (shots: Shot[]) => void
): void => {
  // This would delegate to the appropriate transformation handler
  onTransform(shots);
};

/**
 * Tag shots with a label
 */
export const tagShots = (
  shots: Shot[],
  tag: string,
  onUpdate: (shots: Shot[]) => void
): void => {
  const updatedShots = shots.map(shot => ({
    ...shot,
    metadata: {
      ...shot.metadata,
      tags: [...(shot.metadata?.tags || []), tag]
    }
  }));
  
  onUpdate(updatedShots);
};

/**
 * Context menu action handlers
 */
export interface ContextMenuActionHandlers {
  onCopy?: (shots: Shot[]) => void;
  onCut?: (shots: Shot[]) => void;
  onPaste?: (shots: Shot[]) => void;
  onDuplicate?: (shots: Shot[]) => void;
  onDelete?: (shotIds: string[]) => void;
  onExport?: (shots: Shot[]) => void;
  onTransform?: (shots: Shot[], transformType: string) => void;
  onTag?: (shots: Shot[], tag: string) => void;
  onCreate?: () => void;
}

/**
 * Execute a context menu action
 */
export const executeContextMenuAction = async (
  action: string,
  shots: Shot[],
  allShots: Shot[],
  handlers: ContextMenuActionHandlers,
  sequenceId?: string
): Promise<void> => {
  switch (action) {
    case 'copy':
      if (handlers.onCopy) {
        copyShots(shots, sequenceId);
        handlers.onCopy(shots);
      }
      break;

    case 'cut':
      if (handlers.onCut) {
        cutShots(shots, sequenceId);
        handlers.onCut(shots);
      }
      break;

    case 'paste':
      if (handlers.onPaste) {
        const pastedShots = pasteShots(sequenceId);
        if (pastedShots) {
          handlers.onPaste(pastedShots);
        }
      }
      break;
      
    case 'duplicate':
      if (handlers.onDuplicate) {
        const duplicated = duplicateShots(shots, allShots);
        handlers.onDuplicate(duplicated);
      }
      break;
      
    case 'delete':
      if (handlers.onDelete) {
        await deleteShots(shots, handlers.onDelete);
      }
      break;
      
    case 'export':
      if (handlers.onExport) {
        exportShots(shots);
        handlers.onExport(shots);
      }
      break;
      
    case 'transform':
      if (handlers.onTransform) {
        // Default to resize, but this could be parameterized
        transformShots(shots, 'resize', (transformed) => {
          handlers.onTransform!(transformed, 'resize');
        });
      }
      break;
      
    case 'tag':
      if (handlers.onTag) {
        // This would typically show a dialog to enter the tag
        const tag = prompt('Enter tag:');
        if (tag) {
          tagShots(shots, tag, (tagged) => {
            handlers.onTag!(tagged, tag);
          });
        }
      }
      break;
      
    case 'create':
      if (handlers.onCreate) {
        handlers.onCreate();
      }
      break;
      
    default:
      console.warn(`Unknown context menu action: ${action}`);
  }
};
