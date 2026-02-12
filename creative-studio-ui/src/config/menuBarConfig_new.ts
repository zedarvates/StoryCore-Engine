/**
 * Menu Bar Configuration
 * 
 * Complete menu structure configuration for the StoryCore Creative Studio.
 * Defines all six menus: File, Edit, View, Project, Tools, Help.
 * 
 * This configuration supports Requirements 1.1-6.5 and 11.1-11.5.
 */

import { MenuBarConfig, MenuConfig } from '../types/menuConfig';
import { fileActions, editActions, viewActions, projectActions, wizardsActions, toolsActions, helpActions } from '../components/menuBar/menuActions';

/**
 * File Menu Configuration
 * Handles project lifecycle operations
 */
const fileMenuConfig: MenuConfig = {
  id: 'file',
  label: 'file',
  items: [
    {
      id: 'new-project',
      label: 'file.new',
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
      label: 'file.open',
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
      label: 'file.save',
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
      label: 'file.saveAs',
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
      label: 'file.export',
      type: 'submenu',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'download',
      description: 'Export project in various formats',
      submenu: [
        {
          id: 'export-json',
          label: 'file.export.json',
          type: 'action',
          enabled: true,
          visible: true,
          description: 'Export as JSON (Data Contract v1)',
          action: fileActions.exportJSON,
        },
        {
          id: 'export-pdf',
          label: 'file.export.pdf',
          type: 'action',
          enabled: true,
          visible: true,
          description: 'Export as PDF report',
          action: fileActions.exportPDF,
        },
        {
          id: 'export-video',
          label: 'file.export.video',
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
      id: 'preferences',
      label: 'file.preferences',
      type: 'action',
      enabled: true,
      visible: true,
      shortcut: { key: ',', ctrl: true },
      icon: 'settings',
      description: 'User preferences and settings',
      action: fileActions.preferences,
    },
    {
      id: 'addons',
      label: 'file.addons',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'puzzle',
      description: 'Manage add-ons and extensions',
      action: editActions.openAddonsSettings,
    },
    {
      id: 'separator-4',
      label: 'file.preferences',
      type: 'action',
      enabled: true,
      visible: true,
      shortcut: { key: ',', ctrl: true },
      icon: 'settings',
      description: 'User preferences and settings',
      action: fileActions.preferences,
    },
    {
      id: 'separator-4',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'exit-project',
      label: 'file.exit',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: (state) => state.project !== null,
      shortcut: { key: 'w', ctrl: true },
      icon: 'log-out',
      description: 'Exit current project and return to dashboard',
      action: fileActions.exitProject,
    },
    {
      id: 'quit-application',
      label: 'file.quit',
      type: 'action',
      enabled: true,
      visible: true,
      shortcut: { key: 'q', ctrl: true },
      icon: 'x-circle',
      description: 'Quit StoryCore application',
      action: fileActions.quitApplication,
    },
  ],
};

/**
 * Edit Menu Configuration
 * Handles editing operations and Settings
 */
const editMenuConfig: MenuConfig = {
  id: 'edit',
  label: 'edit',
  items: [
    {
      id: 'undo',
      label: 'edit.undo',
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
      label: 'edit.redo',
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
      label: 'edit.cut',
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
      label: 'edit.copy',
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
      label: 'edit.paste',
      type: 'action',
      enabled: (state) => state.clipboard.hasContent,
      visible: true,
      shortcut: { key: 'v', ctrl: true },
      icon: 'clipboard',
      description: 'Paste from clipboard',
      action: editActions.paste,
    },

  ],
};

/**
 * View Menu Configuration
 * Handles view state and workspace layout
 */
const viewMenuConfig: MenuConfig = {
  id: 'view',
  label: 'view',
  items: [
    {
      id: 'timeline',
      label: 'view.timeline',
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
      label: 'view.zoomIn',
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
      label: 'view.zoomOut',
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
      label: 'view.resetZoom',
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
      id: 'fullscreen',
      label: 'view.fullScreen',
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
  label: 'project',
  items: [
    {
      id: 'back-to-dashboard',
      label: 'project.backToDashboard',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: (state) => state.project !== null,
      icon: 'layout-dashboard',
      shortcut: { key: 'h', ctrl: true, shift: true },
      description: 'Return to Project Dashboard',
      action: projectActions.backToDashboard,
    },
    {
      id: 'separator-0',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'characters',
      label: 'project.characters',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: (state) => state.project !== null,
      icon: 'users',
      description: 'Character Wizard - Design detailed characters',
      action: projectActions.characters,
    },
    {
      id: 'assets',
      label: 'project.assets',
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
 * Wizards Menu Configuration
 * All wizards in one centralized menu
 */
const wizardsMenuConfig: MenuConfig = {
  id: 'wizards',
  label: 'wizards',
  items: [
    {
      id: 'project-setup',
      label: 'wizards.projectSetup',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'settings',
      description: 'Project Setup Wizard - Configure project settings',
      action: wizardsActions.projectSetup,
    },
    {
      id: 'separator-1',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'character-wizard',
      label: 'wizards.characters',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'users',
      description: 'Character Wizard - Design detailed characters',
      action: wizardsActions.characters,
    },
    {
      id: 'world-builder',
      label: 'wizards.world',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'globe',
      description: 'World Builder - Create comprehensive world settings',
      action: wizardsActions.world,
    },
    {
      id: 'story-generator',
      label: 'wizards.sequences',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'film',
      description: 'Story Generator - Generate complete stories with AI',
      action: wizardsActions.sequences,
    },
    {
      id: 'separator-2',
      label: '',
      type: 'separator',
      enabled: true,
      visible: true,
    },
    {
      id: 'script-wizard',
      label: 'wizards.script',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'wand',
      description: 'Script Wizard - Convert scripts to shots',
      action: wizardsActions.scriptWizard,
    },
  ],
};

/**
 * Tools Menu Configuration
 * Handles AI tools and utilities
 */
const toolsMenuConfig: MenuConfig = {
  id: 'tools',
  label: 'tools',
  items: [
    {
      id: 'llm-assistant',
      label: 'tools.llmAssistant',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'message-circle',
      description: 'LLM StoryCore Assistant',
      action: toolsActions.llmAssistant,
    },
    {
      id: 'comfyui-server',
      label: 'tools.comfyUIServer',
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
      label: 'tools.scriptWizard',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'wand',
      description: 'Script-to-shots wizard',
      action: toolsActions.scriptWizard,
    },
    {
      id: 'batch-generation',
      label: 'tools.batchGeneration',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'layers',
      description: 'Batch processing',
      action: toolsActions.batchGeneration,
    },
    {
      id: 'quality-analysis',
      label: 'tools.qualityAnalysis',
      type: 'action',
      enabled: (state) => state.project !== null,
      visible: true,
      icon: 'check-circle',
      description: 'Run QA Engine',
      action: toolsActions.qualityAnalysis,
    },
    {
      id: 'fact-check',
      label: 'tools.factCheck',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'search',
      shortcut: { key: 'f', ctrl: true, shift: true },
      description: 'Fact Check - Verify statements with AI',
      action: toolsActions.factCheck,
    },
  ],
};

/**
 * Help Menu Configuration
 * Handles documentation and support
 */
const helpMenuConfig: MenuConfig = {
  id: 'help',
  label: 'help',
  items: [
    {
      id: 'documentation',
      label: 'help.documentation',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'book-open',
      description: 'Open documentation',
      action: helpActions.documentation,
    },
    {
      id: 'keyboard-shortcuts',
      label: 'help.keyboardShortcuts',
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
      label: 'help.about',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'info',
      description: 'About StoryCore',
      action: helpActions.about,
    },
    {
      id: 'check-updates',
      label: 'help.checkUpdates',
      type: 'action',
      enabled: true,
      visible: true,
      icon: 'download-cloud',
      description: 'Check for updates',
      action: helpActions.checkUpdates,
    },
    {
      id: 'report-issue',
      label: 'help.reportIssue',
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
 * Exports all menus in order
 */
export const menuBarConfig: MenuBarConfig = [
  fileMenuConfig,
  editMenuConfig,
  viewMenuConfig,
  projectMenuConfig,
  wizardsMenuConfig,
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
export function getMenuItemById(itemId: string): { menu: MenuConfig; item: unknown } | undefined {
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
function findMenuItemRecursive(items: unknown[], itemId: string): unknown {
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


