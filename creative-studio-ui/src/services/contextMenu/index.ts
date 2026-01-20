export {
  generateDuplicateName,
  duplicateShot,
  duplicateShots,
  requiresDeleteConfirmation,
  confirmDelete,
  deleteShots,
  exportShots,
  transformShots,
  tagShots,
  executeContextMenuAction
} from './ContextMenuActions';

export type { ContextMenuActionHandlers } from './ContextMenuActions';

export {
  buildSingleShotMenu,
  buildMultipleShotsMenu,
  buildEmptyTimelineMenu,
  buildContextMenu,
  determineMenuContext
} from './ContextMenuBuilder';

export type { MenuContext } from './ContextMenuBuilder';
