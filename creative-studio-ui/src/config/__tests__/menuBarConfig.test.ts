/**
 * Menu Bar Configuration Tests
 * 
 * Tests for menu bar configuration validation and structure.
 */

import { describe, it, expect } from 'vitest';
import { menuBarConfig, getMenuById, getMenuItemById } from '../menuBarConfig';
import { validateMenuConfig } from '../../services/menuBar/MenuConfigValidator';

describe('Menu Bar Configuration', () => {
  describe('Configuration Structure', () => {
    it('should have six menus', () => {
      expect(menuBarConfig).toHaveLength(6);
    });

    it('should have all required menus', () => {
      const menuIds = menuBarConfig.map((menu) => menu.id);
      expect(menuIds).toEqual(['file', 'edit', 'view', 'project', 'tools', 'help']);
    });

    it('should have labels for all menus', () => {
      for (const menu of menuBarConfig) {
        expect(menu.label).toBeTruthy();
        expect(typeof menu.label).toBe('string');
      }
    });

    it('should have items for all menus', () => {
      for (const menu of menuBarConfig) {
        expect(Array.isArray(menu.items)).toBe(true);
        expect(menu.items.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should pass validation', () => {
      const result = validateMenuConfig(menuBarConfig);
      
      // Log any errors or warnings for debugging
      if (result.errors.length > 0) {
        console.error('Validation errors:', result.errors);
      }
      if (result.warnings.length > 0) {
        console.warn('Validation warnings:', result.warnings);
      }
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have no duplicate menu IDs', () => {
      const ids = menuBarConfig.map((menu) => menu.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have no duplicate item IDs within each menu', () => {
      for (const menu of menuBarConfig) {
        const itemIds = menu.items.map((item) => item.id);
        const uniqueItemIds = new Set(itemIds);
        expect(itemIds.length).toBe(uniqueItemIds.size);
      }
    });
  });

  describe('Menu Item Types', () => {
    it('should have valid types for all items', () => {
      const validTypes = ['action', 'submenu', 'separator', 'toggle'];
      
      for (const menu of menuBarConfig) {
        for (const item of menu.items) {
          expect(validTypes).toContain(item.type);
        }
      }
    });

    it('should have action functions for action items', () => {
      for (const menu of menuBarConfig) {
        for (const item of menu.items) {
          if (item.type === 'action') {
            expect(typeof item.action).toBe('function');
          }
        }
      }
    });

    it('should have submenu arrays for submenu items', () => {
      for (const menu of menuBarConfig) {
        for (const item of menu.items) {
          if (item.type === 'submenu') {
            expect(Array.isArray(item.submenu)).toBe(true);
          }
        }
      }
    });

    it('should have checked property for toggle items', () => {
      for (const menu of menuBarConfig) {
        for (const item of menu.items) {
          if (item.type === 'toggle') {
            expect(item.checked).toBeDefined();
          }
        }
      }
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should have valid keyboard shortcuts', () => {
      const itemsWithShortcuts: any[] = [];
      
      for (const menu of menuBarConfig) {
        for (const item of menu.items) {
          if (item.shortcut) {
            itemsWithShortcuts.push(item);
          }
        }
      }
      
      expect(itemsWithShortcuts.length).toBeGreaterThan(0);
      
      for (const item of itemsWithShortcuts) {
        expect(item.shortcut.key).toBeTruthy();
        expect(typeof item.shortcut.key).toBe('string');
      }
    });

    it('should have common shortcuts defined', () => {
      const shortcuts = [
        { menuId: 'file', itemId: 'new-project', key: 'n' },
        { menuId: 'file', itemId: 'open-project', key: 'o' },
        { menuId: 'file', itemId: 'save-project', key: 's' },
        { menuId: 'edit', itemId: 'undo', key: 'z' },
        { menuId: 'edit', itemId: 'redo', key: 'y' },
        { menuId: 'edit', itemId: 'cut', key: 'x' },
        { menuId: 'edit', itemId: 'copy', key: 'c' },
        { menuId: 'edit', itemId: 'paste', key: 'v' },
      ];
      
      for (const shortcut of shortcuts) {
        const result = getMenuItemById(shortcut.itemId);
        expect(result).toBeDefined();
        expect(result?.item.shortcut?.key).toBe(shortcut.key);
      }
    });
  });

  describe('Helper Functions', () => {
    it('should find menu by ID', () => {
      const fileMenu = getMenuById('file');
      expect(fileMenu).toBeDefined();
      expect(fileMenu?.id).toBe('file');
      expect(fileMenu?.label).toBe('menu.file');
    });

    it('should return undefined for non-existent menu', () => {
      const menu = getMenuById('non-existent');
      expect(menu).toBeUndefined();
    });

    it('should find menu item by ID', () => {
      const result = getMenuItemById('save-project');
      expect(result).toBeDefined();
      expect(result?.menu.id).toBe('file');
      expect(result?.item.id).toBe('save-project');
    });

    it('should return undefined for non-existent item', () => {
      const result = getMenuItemById('non-existent');
      expect(result).toBeUndefined();
    });

    it('should find items in submenus', () => {
      const result = getMenuItemById('export-json');
      expect(result).toBeDefined();
      expect(result?.menu.id).toBe('file');
      expect(result?.item.id).toBe('export-json');
    });
  });

  describe('File Menu', () => {
    it('should have all required items', () => {
      const fileMenu = getMenuById('file');
      expect(fileMenu).toBeDefined();
      
      const itemIds = fileMenu!.items.map((item) => item.id);
      expect(itemIds).toContain('new-project');
      expect(itemIds).toContain('open-project');
      expect(itemIds).toContain('save-project');
      expect(itemIds).toContain('save-as');
      expect(itemIds).toContain('export');
      expect(itemIds).toContain('recent-projects');
    });

    it('should have export submenu with formats', () => {
      const result = getMenuItemById('export');
      expect(result).toBeDefined();
      expect(result?.item.type).toBe('submenu');
      expect(result?.item.submenu).toBeDefined();
      
      const submenuIds = result?.item.submenu?.map((item: any) => item.id);
      expect(submenuIds).toContain('export-json');
      expect(submenuIds).toContain('export-pdf');
      expect(submenuIds).toContain('export-video');
    });
  });

  describe('Edit Menu', () => {
    it('should have all required items', () => {
      const editMenu = getMenuById('edit');
      expect(editMenu).toBeDefined();
      
      const itemIds = editMenu!.items.map((item) => item.id);
      expect(itemIds).toContain('undo');
      expect(itemIds).toContain('redo');
      expect(itemIds).toContain('cut');
      expect(itemIds).toContain('copy');
      expect(itemIds).toContain('paste');
      expect(itemIds).toContain('preferences');
    });
  });

  describe('View Menu', () => {
    it('should have all required items', () => {
      const viewMenu = getMenuById('view');
      expect(viewMenu).toBeDefined();
      
      const itemIds = viewMenu!.items.map((item) => item.id);
      expect(itemIds).toContain('timeline');
      expect(itemIds).toContain('zoom-in');
      expect(itemIds).toContain('zoom-out');
      expect(itemIds).toContain('reset-zoom');
      expect(itemIds).toContain('toggle-grid');
      expect(itemIds).toContain('panels');
      expect(itemIds).toContain('fullscreen');
    });

    it('should have panels submenu', () => {
      const result = getMenuItemById('panels');
      expect(result).toBeDefined();
      expect(result?.item.type).toBe('submenu');
      expect(result?.item.submenu).toBeDefined();
      
      const submenuIds = result?.item.submenu?.map((item: any) => item.id);
      expect(submenuIds).toContain('panel-properties');
      expect(submenuIds).toContain('panel-assets');
      expect(submenuIds).toContain('panel-preview');
    });
  });

  describe('Project Menu', () => {
    it('should have all required items', () => {
      const projectMenu = getMenuById('project');
      expect(projectMenu).toBeDefined();
      
      const itemIds = projectMenu!.items.map((item) => item.id);
      expect(itemIds).toContain('settings');
      expect(itemIds).toContain('characters');
      expect(itemIds).toContain('sequences');
      expect(itemIds).toContain('assets');
    });
  });

  describe('Tools Menu', () => {
    it('should have all required items', () => {
      const toolsMenu = getMenuById('tools');
      expect(toolsMenu).toBeDefined();
      
      const itemIds = toolsMenu!.items.map((item) => item.id);
      expect(itemIds).toContain('llm-assistant');
      expect(itemIds).toContain('comfyui-server');
      expect(itemIds).toContain('script-wizard');
      expect(itemIds).toContain('batch-generation');
      expect(itemIds).toContain('quality-analysis');
    });
  });

  describe('Help Menu', () => {
    it('should have all required items', () => {
      const helpMenu = getMenuById('help');
      expect(helpMenu).toBeDefined();
      
      const itemIds = helpMenu!.items.map((item) => item.id);
      expect(itemIds).toContain('documentation');
      expect(itemIds).toContain('keyboard-shortcuts');
      expect(itemIds).toContain('about');
      expect(itemIds).toContain('check-updates');
      expect(itemIds).toContain('report-issue');
    });
  });
});
