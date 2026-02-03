import React from 'react';
import { ContextMenuItem } from '../../components/contextMenu';
import { Shot } from '../../types';
import { ContextMenuActionHandlers } from './ContextMenuActions';
import { ClipboardManager } from '../clipboard/ClipboardManager';

const clipboardManager = ClipboardManager.getInstance();

/**
 * Context type for menu generation
 */
export type MenuContext = 'single-shot' | 'multiple-shots' | 'empty-timeline';

/**
 * Build context menu items for a single shot
 */
export const buildSingleShotMenu = (
  shot: Shot,
  handlers: ContextMenuActionHandlers
): ContextMenuItem[] => {
  return [
    {
      id: 'copy',
      label: 'Copy',
      shortcut: 'Ctrl+C',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      action: () => handlers.onCopy?.([shot])
    },
    {
      id: 'cut',
      label: 'Cut',
      shortcut: 'Ctrl+X',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
      ),
      action: () => handlers.onCut?.([shot])
    },
    {
      id: 'paste',
      label: 'Paste',
      shortcut: 'Ctrl+V',
      disabled: !clipboardManager.getContent(),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      action: () => handlers.onPaste?.([shot])
    },
    {
      id: 'separator-clipboard',
      label: '',
      separator: true
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      shortcut: 'Ctrl+D',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      action: () => handlers.onDuplicate?.([shot])
    },
    {
      id: 'delete',
      label: 'Delete',
      shortcut: 'Del',
      danger: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      action: () => handlers.onDelete?.([shot.id])
    },
    {
      id: 'separator-1',
      label: '',
      separator: true
    },
    {
      id: 'export',
      label: 'Export',
      submenu: [
        {
          id: 'export-json',
          label: 'Export as JSON',
          action: () => handlers.onExport?.([shot])
        },
        {
          id: 'export-image',
          label: 'Export as Image',
          action: () => handlers.onExport?.([shot])
        }
      ]
    },
    {
      id: 'transform',
      label: 'Transform',
      submenu: [
        {
          id: 'transform-resize',
          label: 'Resize',
          action: () => handlers.onTransform?.([shot], 'resize')
        },
        {
          id: 'transform-crop',
          label: 'Crop',
          action: () => handlers.onTransform?.([shot], 'crop')
        },
        {
          id: 'transform-filter',
          label: 'Apply Filter',
          action: () => handlers.onTransform?.([shot], 'filter')
        }
      ]
    },
    {
      id: 'separator-2',
      label: '',
      separator: true
    },
    {
      id: 'tag',
      label: 'Add Tag',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      action: () => {
        const tag = prompt('Enter tag:');
        if (tag) {
          handlers.onTag?.([shot], tag);
        }
      }
    },
    {
      id: 'properties',
      label: 'Properties',
      shortcut: 'Ctrl+I',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: () => handlers.onShowInfo?.(shot)
    }
  ];
};

/**
 * Build context menu items for multiple shots
 */
export const buildMultipleShotsMenu = (
  shots: Shot[],
  handlers: ContextMenuActionHandlers
): ContextMenuItem[] => {
  const shotCount = shots.length;
  
  return [
    {
      id: 'selection-info',
      label: `${shotCount} shots selected`,
      disabled: true
    },
    {
      id: 'separator-0',
      label: '',
      separator: true
    },
    {
      id: 'copy-all',
      label: 'Copy All',
      shortcut: 'Ctrl+C',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      action: () => handlers.onCopy?.(shots)
    },
    {
      id: 'cut-all',
      label: 'Cut All',
      shortcut: 'Ctrl+X',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
      ),
      action: () => handlers.onCut?.(shots)
    },
    {
      id: 'paste-all',
      label: 'Paste',
      shortcut: 'Ctrl+V',
      disabled: !clipboardManager.getContent(),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      action: () => handlers.onPaste?.(shots)
    },
    {
      id: 'separator-clipboard',
      label: '',
      separator: true
    },
    {
      id: 'duplicate-all',
      label: 'Duplicate All',
      shortcut: 'Ctrl+D',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      action: () => handlers.onDuplicate?.(shots)
    },
    {
      id: 'delete-all',
      label: 'Delete All',
      shortcut: 'Del',
      danger: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      action: () => handlers.onDelete?.(shots.map(s => s.id))
    },
    {
      id: 'separator-1',
      label: '',
      separator: true
    },
    {
      id: 'batch-export',
      label: 'Batch Export',
      submenu: [
        {
          id: 'export-json',
          label: 'Export as JSON',
          action: () => handlers.onExport?.(shots)
        },
        {
          id: 'export-images',
          label: 'Export as Images',
          action: () => handlers.onExport?.(shots)
        },
        {
          id: 'export-video',
          label: 'Export as Video',
          action: () => handlers.onExport?.(shots)
        }
      ]
    },
    {
      id: 'batch-transform',
      label: 'Batch Transform',
      submenu: [
        {
          id: 'transform-resize',
          label: 'Resize All',
          action: () => handlers.onTransform?.(shots, 'resize')
        },
        {
          id: 'transform-crop',
          label: 'Crop All',
          action: () => handlers.onTransform?.(shots, 'crop')
        },
        {
          id: 'transform-filter',
          label: 'Apply Filter to All',
          action: () => handlers.onTransform?.(shots, 'filter')
        },
        {
          id: 'transform-adjust',
          label: 'Adjust All',
          action: () => handlers.onTransform?.(shots, 'adjust')
        }
      ]
    },
    {
      id: 'separator-2',
      label: '',
      separator: true
    },
    {
      id: 'batch-tag',
      label: 'Add Tag to All',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      action: () => {
        const tag = prompt('Enter tag for all selected shots:');
        if (tag) {
          handlers.onTag?.(shots, tag);
        }
      }
    },
    {
      id: 'group',
      label: 'Group Shots',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      action: () => handlers.onGroup?.(shots)
    }
  ];
};

/**
 * Build context menu items for empty timeline
 */
export const buildEmptyTimelineMenu = (
  handlers: ContextMenuActionHandlers
): ContextMenuItem[] => {
  return [
    {
      id: 'create-shot',
      label: 'Create New Shot',
      shortcut: 'Ctrl+N',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      action: () => handlers.onCreate?.()
    },
    {
      id: 'import',
      label: 'Import Shots',
      submenu: [
        {
          id: 'import-json',
          label: 'Import from JSON',
          action: () => handlers.onImport?.()
        },
        {
          id: 'import-images',
          label: 'Import Images',
          action: () => handlers.onImport?.()
        },
        {
          id: 'import-video',
          label: 'Import Video',
          action: () => handlers.onImport?.()
        }
      ]
    },
    {
      id: 'separator-1',
      label: '',
      separator: true
    },
    {
      id: 'paste',
      label: 'Paste',
      shortcut: 'Ctrl+V',
      disabled: !clipboardManager.getContent(),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      action: () => handlers.onPaste?.([])
    },
    {
      id: 'separator-2',
      label: '',
      separator: true
    },
    {
      id: 'templates',
      label: 'Create from Template',
      submenu: [
        {
          id: 'template-intro',
          label: 'Intro Sequence',
          action: () => handlers.onCreateFromTemplate?.('intro')
        },
        {
          id: 'template-montage',
          label: 'Montage',
          action: () => handlers.onCreateFromTemplate?.('montage')
        },
        {
          id: 'template-credits',
          label: 'Credits',
          action: () => handlers.onCreateFromTemplate?.('credits')
        }
      ]
    }
  ];
};

/**
 * Build context menu based on context type
 */
export const buildContextMenu = (
  context: MenuContext,
  shots: Shot[],
  handlers: ContextMenuActionHandlers
): ContextMenuItem[] => {
  switch (context) {
    case 'single-shot':
      return buildSingleShotMenu(shots[0], handlers);
      
    case 'multiple-shots':
      return buildMultipleShotsMenu(shots, handlers);
      
    case 'empty-timeline':
      return buildEmptyTimelineMenu(handlers);
      
    default:
      return [];
  }
};

/**
 * Determine context type from selection
 */
export const determineMenuContext = (
  selectedShots: Shot[],
  clickedOnShot: boolean
): MenuContext => {
  if (!clickedOnShot || selectedShots.length === 0) {
    return 'empty-timeline';
  }
  
  if (selectedShots.length === 1) {
    return 'single-shot';
  }
  
  return 'multiple-shots';
};

