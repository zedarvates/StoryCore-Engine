/**
 * Menu Bar Configuration
 * 
 * Complete menu structure configuration for the StoryCore Creative Studio.
 * Defines all six menus: File, Edit, View, Project, Tools, Help.
 * 
 * This configuration supports Requirements 1.1-6.5 and 11.1-11.5.
 */

import { MenuBarConfig, MenuConfig } from '../types/menuConfig';
import { fileActions, editActions, viewActions, projectActions, toolsActions, helpActions } from '../components/menuBar/menuActions';

/**
 * File Menu Configuration
 * Handles project lifecycle operations
 */
const fileMenuConfig: MenuConfig = {
  id: 'file',
  label: 'menu.file',
  items: [
    {
      id: 'new-project',
      label: 'menu.file.new',
      type: 'action',
      enabled: true,
      visible: true,
      shortcut: { key: 'n', ctrl: true },
      icon: 'file-plus',
      description: 'Create a new project',
      action: fileActions.newProject,
    },
    {
      id: 'open-project',
      label: 'menu.file.open',
      type: 'action',
      enabled: true,
      visible: true,
      shortcut: { key: 'o', ctrl: true },
      icon: 'folder-open',
      description: 'Open an existing project',
      action: fileActions.openProject,
    },
    {
      id: 'separator-1',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'save-project',
      label: 'menu.file.save',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      shortcut: { key: 's', ctrl: true },
      icon: 'save',
      description: 'Save the current project',
      action: fileActions.saveProject,
    },
    {
      id: 'save-as',
      label: 'menu.file.saveAs',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      shortcut: { key: 's', ctrl: true, shift: true },
      icon: 'save',
      description: 'Save project with a new name',
      action: fileActions.saveProjectAs,
    },
    {
      id: 'separator-2',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'export',
      label: 'menu.file.export',
      type: 'submenu',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'download',
      description: 'Export project in various formats',
      submenu: [
        {
          id: 'export-json',
          label: 'menu.file.export.json',
          type: 'action',
          enabled: true,
          visible: true,
          description: 'Export as JSON (Data Contract v1)',
          action: fileActions.exportJSON,
        },
        {
          id: 'export-pdf',
          label: 'menu.file.export.pdf',
          type: 'action',
          enabled: true,
          visible: true,
          description: 'Export as PDF report',
          action: fileActions.exportPDF,
        },
        {
          id: 'export-video',
          label: 'menu.file.export.video',
          type: 'action',
          enabled: true,
          visible: true,
          description: 'Export as video sequence',
          action: fileActions.exportVideo,
        },
      ],
    },
    {
      id: 'separator-3',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'recent-projects',
      label: 'menu.file.recent',
      type: 'submenu',
      enabled: true,
      visible: true,
      icon: 'clock',
      description: 'Recently opened projects',
      submenu: [],
    },
  ],
};

/**
 * Edit Menu Configuration
 * Handles editing operations and Settings
 */
const editMenuConfig: MenuConfig = {
  id: 'edit',
  label: 'menu.edit',
  items: [
    {
      id: 'undo',
      label: 'menu.edit.undo',
      type: 'action',
      enabled: (state) => state.undoStack.canUndo,
      visible: true,
      shortcut: { key: 'z', ctrl: true },
      icon: 'undo',
      description: 'Undo last action',
      action: editActions.undo,
    },
    {
      id: 'redo',
      label: 'menu.edit.redo',
      type: 'action',
      enabled: (state) => state.undoStack.canRedo,
      visible: true,
      shortcut: { key: 'y', ctrl: true },
      icon: 'redo',
      description: 'Redo last undone action',
      action: editActions.redo,
    },
    {
      id: 'separator-1',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'cut',
      label: 'menu.edit.cut',
      type: 'action',
      enabled: (state) => {
        if (!state.project) return false;
        const selectedShotId = (state.project as any).selectedShotId;
        return selectedShotId !== null && selectedShotId !== undefined;
      },
      visible: true,
      shortcut: { key: 'x', ctrl: true },
      icon: 'scissors',
      description: 'Cut selection to clipboard',
      action: editActions.cut,
    },
    {
      id: 'copy',
      label: 'menu.edit.copy',
      type: 'action',
      enabled: (state) => {
        if (!state.project) return false;
        const selectedShotId = (state.project as any).selectedShotId;
        return selectedShotId !== null && selectedShotId !== undefined;
      },
      visible: true,
      shortcut: { key: 'c', ctrl: true },
      icon: 'copy',
      description: 'Copy selection to clipboard',
      action: editActions.copy,
    },
    {
      id: 'paste',
      label: 'menu.edit.paste',
      type: 'action',
      enabled: (state) => state.clipboard.hasContent,
      visible: true,
      shortcut: { key: 'v', ctrl: true },
      icon: 'clipboard',
      description: 'Paste from clipboard',
      action: editActions.paste,
    },
    {
      id: 'separator-2',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'settings',
      label: 'menu.edit.settings',
      type: 'submenu',
      enabled: true,
      visible: true,
      icon: 'settings',
      description: 'Application settings',
      submenu: [
        {
          id: 'settings-llm',
          label: 'menu.edit.settings.llm',
          type: 'action',
          enabled: true,
          visible: true,
          icon: 'brain',
          description: 'Configure LLM settings (OpenAI, Anthropic, Ollama, etc.)',
          action: editActions.openLLMSettings,
        },
        {
          id: 'settings-comfyui',
          label: 'menu.edit.settings.comfyui',
          type: 'action',
          enabled: true,
          visible: true,
          icon: 'server',
          description: 'Configure ComfyUI servers and workflows',
          action: editActions.openComfyUISettings,
        },
        {
          id: 'separator-settings-1',
          label: '',
          type: 'separator',
          enabled: true,
          visible: true,
        },
        {
          id: 'settings-addons',
          label: 'menu.edit.settings.addons',
          type: 'action',
          enabled: true,
          visible: true,
          icon: 'puzzle',
          description: 'Manage addons and extensions',
          action: editActions.openAddonsSettings,
        },
        {
          id: 'separator-settings-2',
          label: '',
          type: 'separator',
          enabled: true,
          visible: true,
        },
        {
          id: 'settings-general',
          label: 'menu.edit.settings.general',
          type: 'action',
          enabled: true,
          visible: true,
          icon: 'sliders',
          description: 'General application settings',
          action: editActions.openGeneralSettings,
        },
      ],
    },
  ],
};

/**
 * View Menu Configuration
 * Handles view state and workspace layout
 */
const viewMenuConfig: MenuConfig = {
  id: 'view',
  label: 'menu.view',
  items: [
    {
      id: 'timeline',
      label: 'menu.view.timeline',
      type: 'toggle',
      enabled: true,
      visible: true,
      checked: (state) => state.viewState.timelineVisible,
      icon: 'layout',
      description: 'Toggle timeline panel visibility',
      action: viewActions.toggleTimeline,
    },
    {
      id: 'separator-1',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'zoom-in',
      label: 'menu.view.zoomIn',
      type: 'action',
      enabled: (state) => state.viewState.zoomLevel < state.viewState.maxZoom,
      visible: true,
      shortcut: { key: '=', ctrl: true },
      icon: 'zoom-in',
      description: 'Zoom in (Ctrl+=)',
      action: viewActions.zoomIn,
    },
    {
      id: 'zoom-out',
      label: 'menu.view.zoomOut',
      type: 'action',
      enabled: (state) => state.viewState.zoomLevel > state.viewState.minZoom,
      visible: true,
      shortcut: { key: '-', ctrl: true },
      icon: 'zoom-out',
      description: 'Zoom out (Ctrl+-)',
      action: viewActions.zoomOut,
    },
    {
      id: 'reset-zoom',
      label: 'menu.view.resetZoom',
      type: 'action',
      enabled: (state) => state.viewState.zoomLevel !== 1,
      visible: true,
      shortcut: { key: '0', ctrl: true },
      icon: 'maximize',
      description: 'Reset zoom to 100% (Ctrl+0)',
      action: viewActions.resetZoom,
    },
    {
      id: 'separator-2',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'toggle-grid',
      label: 'menu.view.grid',
      type: 'toggle',
      enabled: true,
      visible: true,
      checked: (state) => state.viewState.gridVisible,
      icon: 'grid',
      description: 'Toggle grid overlay',
      action: viewActions.toggleGrid,
    },
    {
      id: 'separator-3',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'fullscreen',
      label: 'menu.view.fullScreen',
      type: 'toggle',
      enabled: true,
      visible: true,
      checked: (state) => state.viewState.fullScreen,
      shortcut: { key: 'F11' },
      icon: 'maximize',
      description: 'Toggle fullscreen mode (F11)',
      action: viewActions.toggleFullscreen,
    },
  ],
};

/**
 * Project Menu Configuration
 * Handles project-specific settings and resources
 */
const projectMenuConfig: MenuConfig = {
  id: 'project',
  label: 'menu.project',
  items: [
    {
      id: 'settings',
      label: 'menu.project.settings',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'settings',
      description: 'Project settings',
      action: projectActions.settings,
    },
    {
      id: 'separator-1',
      label: '',
      type: 'separator',
      enabled: (state) => state.project !== null,
      visible: (state) => state.project !== null,
    },
    {
      id: 'characters',
      label: 'menu.project.characters',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: (state) => state.project !== null,
      icon: 'users',
      description: 'Character Wizard - Design detailed characters',
      action: projectActions.characters,
    },
    {
      id: 'sequences',
      label: 'menu.project.sequences',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: (state) => state.project !== null,
      icon: 'film',
      description: 'Story Generator - Generate complete stories with AI',
      action: projectActions.sequences,
    },
    {
      id: 'assets',
      label: 'menu.project.assets',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: (state) => state.project !== null,
      icon: 'image',
      description: 'Asset library',
      action: projectActions.assets,
    },
  ],
};

/**
 * Tools Menu Configuration
 * Handles AI tools and utilities
 */
const toolsMenuConfig: MenuConfig = {
  id: 'tools',
  label: 'menu.tools',
  items: [
    {
      id: 'llm-assistant',
      label: 'menu.tools.llmAssistant',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'message-circle',
      description: 'LLM StoryCore Assistant',
      action: toolsActions.llmAssistant,
    },
    {
      id: 'comfyui-server',
      label: 'menu.tools.comfyUIServer',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'server',
      description: 'ComfyUI Server configuration',
      action: toolsActions.comfyuiServer,
    },
    {
      id: 'separator-1',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'script-wizard',
      label: 'menu.tools.scriptWizard',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'wand',
      description: 'Script-to-shots wizard',
      action: toolsActions.scriptWizard,
    },
    {
      id: 'batch-generation',
      label: 'menu.tools.batchGeneration',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'layers',
      description: 'Batch processing',
      action: toolsActions.batchGeneration,
    },
    {
      id: 'quality-analysis',
      label: 'menu.tools.qualityAnalysis',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'check-circle',
      description: 'Run QA Engine',
      action: toolsActions.qualityAnalysis,
    },
  ],
};

/**
 * Help Menu Configuration
 * Handles documentation and support
 */
const helpMenuConfig: MenuConfig = {
  id: 'help',
  label: 'menu.help',
  items: [
    {
      id: 'documentation',
      label: 'menu.help.documentation',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'book-open',
      description: 'Open documentation',
      action: helpActions.documentation,
    },
    {
      id: 'keyboard-shortcuts',
      label: 'menu.help.keyboardShortcuts',
      type: 'action',
      enabled: true,
      visible: true,
      shortcut: { key: '/', ctrl: true },
      icon: 'keyboard',
      description: 'View keyboard shortcuts',
      action: helpActions.keyboardShortcuts,
    },
    {
      id: 'separator-1',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'about',
      label: 'menu.help.about',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'info',
      description: 'About StoryCore',
      action: helpActions.about,
    },
    {
      id: 'check-updates',
      label: 'menu.help.checkUpdates',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'download-cloud',
      description: 'Check for updates',
      action: helpActions.checkUpdates,
    },
    {
      id: 'report-issue',
      label: 'menu.help.reportIssue',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'alert-circle',
      description: 'Report an issue',
      action: helpActions.reportIssue,
    },
  ],
};

/**
 * Complete menu bar configuration
 * Exports all six menus in order
 */
export const menuBarConfig: MenuBarConfig = [
  fileMenuConfig,
  editMenuConfig,
  viewMenuConfig,
  projectMenuConfig,
  toolsMenuConfig,
  helpMenuConfig,
];

/**
 * Get menu by ID
 */
export function getMenuById(menuId: string): MenuConfig | undefined {
  return menuBarConfig.find((menu) => menu.id === menuId);
}

/**
 * Get menu item by ID (searches all menus)
 */
export function getMenuItemById(itemId: string): { menu: MenuConfig; item: any } | undefined {
  for (const menu of menuBarConfig) {
    const item = findMenuItemRecursive(menu.items, itemId);
    if (item) {
      return { menu, item };
    }
  }
  return undefined;
}

/**
 * Recursively find menu item by ID
 */
function findMenuItemRecursive(items: any[], itemId: string): any {
  for (const item of items) {
    if (item.id === itemId) {
      return item;
    }
    if (item.submenu) {
      const found = findMenuItemRecursive(item.submenu, itemId);
      if (found) return found;
    }
  }
  return undefined;
}
