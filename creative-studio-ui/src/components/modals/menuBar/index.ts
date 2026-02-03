/**
 * Menu Bar Modals
 * 
 * Exports all modal components used by the menu bar system.
 */

export { NewProjectModal } from './NewProjectModal';
export type { NewProjectModalProps } from './NewProjectModal';

export { SaveAsModal } from './SaveAsModal';
export type { SaveAsModalProps } from './SaveAsModal';

export { ExportModal } from './ExportModal';
export type { ExportModalProps, ExportFormat, ExportOptions } from './ExportModal';

export { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
export type {
  KeyboardShortcutsModalProps,
  ShortcutItem,
  ShortcutCategory,
} from './KeyboardShortcutsModal';

export { AboutModal } from './AboutModal';
export type { AboutModalProps } from './AboutModal';

export {
  ConfirmationModal,
  UnsavedChangesConfirmation,
  DeleteConfirmation,
} from './ConfirmationModal';
export type {
  ConfirmationModalProps,
  ConfirmationType,
  ConfirmationButton,
  UnsavedChangesConfirmationProps,
  DeleteConfirmationProps,
} from './ConfirmationModal';
