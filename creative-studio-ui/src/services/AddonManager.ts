/**
 * AddonManager - Extension (add-on) manager for StoryCore
 *
 * Allows enabling/disabling add-ons and managing their lifecycle
 * Version 2.0 - Enhanced with pagination, sorting, and marketplace support
 */

import { fileSystemService } from './FileSystemService';
import { logger } from '@/utils/logger';

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'version' | 'status' | 'category';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  sort: {
    by: string;
    order: string;
  };
}

/**
 * Marketplace addon info
 */
export interface MarketplaceAddon {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: string;
  rating: number;
  downloads: number;
  price: string;
}

/**
 * External add-on manifest
 */
export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: string[];
  entryPoint: string;
  dependencies?: Record<string, string>;
}

/**
 * Resource registered for an add-on (for cleanup)
 */
interface AddonResource {
  eventListeners: Map<string, EventListener[]>;
  timers: number[];
  domElements: Set<HTMLElement>;
  intervals: number[];
}

export interface AddonAction {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode | string;
  handler?: () => Promise<void> | void;
}

export interface AddonInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: 'ui' | 'processing' | 'export' | 'integration' | 'utility' | 'character' | 'world' | 'story';
  dependencies?: string[];
  enabled: boolean;
  builtin: boolean; // true for built-in add-ons, false for external ones
  status: 'active' | 'inactive' | 'error' | 'loading';
  errorMessage?: string;
  icon?: string;
  tags?: string[];
}

export interface AddonConfig {
  [addonId: string]: {
    enabled: boolean;
    settings?: Record<string, unknown>;
  };
}

export interface AddonSetting {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  defaultValue: unknown;
  description?: string;
  options?: Array<{ label: string; value: unknown }>; // For selects
  min?: number; // For numbers
  max?: number; // For numbers
  validation?: (value: unknown) => boolean;
}

export interface AddonSettingsDefinition {
  [addonId: string]: AddonSetting[];
}

/**
 * Add-on manager for StoryCore
 */
export class AddonManager {
  private static instance: AddonManager;
  private addons = new Map<string, AddonInfo>();
  private addonResources = new Map<string, AddonResource>();
  private config: AddonConfig = {};
  private initialized = false;
  private settingsDefinitions: AddonSettingsDefinition = {};

  private constructor() {
    this.initializeSettingsDefinitions();
  }

  static getInstance(): AddonManager {
    if (!AddonManager.instance) {
      AddonManager.instance = new AddonManager();
    }
    return AddonManager.instance;
  }

  /**
   * Initializes the add-on manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load configuration from localStorage
    await this.loadConfig();

    // Register built-in add-ons
    await this.registerBuiltinAddons();

    // Load external add-ons (if present)
    await this.loadExternalAddons();

    this.initialized = true;
  }

  /**
   * Registers an add-on
   */
  registerAddon(addon: Omit<AddonInfo, 'enabled' | 'status'>): void {
    const addonInfo: AddonInfo = {
      ...addon,
      enabled: this.config[addon.id]?.enabled ?? false,
      status: 'inactive'
    };

    this.addons.set(addon.id, addonInfo);

    // Enable if configured to be enabled
    if (addonInfo.enabled) {
      this.activateAddon(addon.id).catch(error => {
        logger.error(`[AddonManager] Failed to activate addon ${addon.id}:`, error);
        addonInfo.status = 'error';
        addonInfo.errorMessage = error.message;
      });
    }
  }

  /**
   * Unregisters an add-on
   */
  unregisterAddon(addonId: string): boolean {
    const addon = this.addons.get(addonId);
    if (!addon) return false;

    // Deactivate first
    if (addon.enabled) {
      this.deactivateAddon(addonId);
    }

    this.addons.delete(addonId);
    return true;
  }

  /**
   * Activates an add-on
   */
  async activateAddon(addonId: string): Promise<boolean> {
    const addon = this.addons.get(addonId);
    if (!addon) {
      throw new Error(`Addon ${addonId} not found`);
    }

    if (addon.enabled) {
      return true; // Already activated
    }

    try {
      addon.status = 'loading';

      // Check dependencies
      await this.checkDependencies(addon);

      // Load the add-on
      await this.loadAddon(addon);

      // Mark as activated
      addon.enabled = true;
      addon.status = 'active';
      addon.errorMessage = undefined;

      // Save configuration
      await this.saveConfig();

      return true;

    } catch (error) {
      addon.status = 'error';
      addon.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[AddonManager] Failed to activate addon ${addonId}:`, error);
      return false;
    }
  }

  /**
   * Deactivates an add-on
   */
  async deactivateAddon(addonId: string): Promise<boolean> {
    const addon = this.addons.get(addonId);
    if (!addon) {
      throw new Error(`Addon ${addonId} not found`);
    }

    if (!addon.enabled) {
      return true; // Already deactivated
    }

    try {
      // Unload the add-on
      await this.unloadAddon(addon);

      // Mark as deactivated
      addon.enabled = false;
      addon.status = 'inactive';
      addon.errorMessage = undefined;

      // Save configuration
      await this.saveConfig();

      return true;

    } catch (error) {
      addon.status = 'error';
      addon.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[AddonManager] Failed to deactivate addon ${addonId}:`, error);
      return false;
    }
  }

  /**
   * Toggles an add-on (enable/disable)
   */
  async toggleAddon(addonId: string): Promise<boolean> {
    const addon = this.addons.get(addonId);
    if (!addon) {
      throw new Error(`Addon ${addonId} not found`);
    }

    return addon.enabled
      ? await this.deactivateAddon(addonId)
      : await this.activateAddon(addonId);
  }

  /**
   * Gets the list of add-ons
   */
  getAddons(): AddonInfo[] {
    return Array.from(this.addons.values());
  }

  /**
   * Gets an add-on by its ID
   */
  getAddon(addonId: string): AddonInfo | undefined {
    return this.addons.get(addonId);
  }

  /**
   * Gets active add-ons
   */
  getActiveAddons(): AddonInfo[] {
    return this.getAddons().filter(addon => addon.enabled && addon.status === 'active');
  }

  /**
   * Gets add-ons by category
   */
  getAddonsByCategory(category: AddonInfo['category']): AddonInfo[] {
    return this.getAddons().filter(addon => addon.category === category);
  }

  /**
   * Searches for add-ons
   */
  searchAddons(query: string): AddonInfo[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAddons().filter(addon =>
      addon.name.toLowerCase().includes(lowercaseQuery) ||
      addon.description.toLowerCase().includes(lowercaseQuery) ||
      addon.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Updates an add-on's settings
   */
  updateAddonSettings(addonId: string, settings: Record<string, unknown>): void {
    if (!this.config[addonId]) {
      this.config[addonId] = { enabled: false };
    }
    this.config[addonId].settings = { ...this.config[addonId].settings, ...settings };
    this.saveConfig();
  }

  /**
   * Gets an add-on's settings
   */
  getAddonSettings(addonId: string): Record<string, unknown> | undefined {
    return this.config[addonId]?.settings;
  }

  /**
   * Gets an add-on's settings definition
   */
  getAddonSettingsDefinition(addonId: string): AddonSetting[] {
    return this.settingsDefinitions[addonId] || [];
  }

  /**
   * Gets an add-on's current settings (with default values)
   */
  getAddonSettingsWithDefaults(addonId: string): Record<string, unknown> {
    const definition = this.getAddonSettingsDefinition(addonId);
    const currentSettings = this.getAddonSettings(addonId) || {};

    const settingsWithDefaults: Record<string, unknown> = {};
    definition.forEach(setting => {
      settingsWithDefaults[setting.key] = currentSettings[setting.key] ?? setting.defaultValue;
    });

    return settingsWithDefaults;
  }

  /**
   * Gets the list of actions available for an add-on
   */
  getAddonActions(addonId: string): AddonAction[] {
    const addon = this.addons.get(addonId);
    if (!addon) {
      return [];
    }

    // Define default actions based on addon type
    const defaultActions: AddonAction[] = [];

    // Add common actions for active addons
    if (addon.status === 'active') {
      defaultActions.push({
        id: 'settings',
        name: 'Settings',
        description: 'Configure addon settings',
        icon: '⚙️'
      });
    }

    // Add addon-specific actions based on addon ID
    switch (addonId) {
      case 'casting':
        defaultActions.push({
          id: 'launch-wizard',
          name: 'Create Character',
          description: 'Launch the character creation wizard',
          icon: '👤'
        });
        break;
      case 'world-builder':
        defaultActions.push({
          id: 'launch-wizard',
          name: 'Create World',
          description: 'Launch the world builder wizard',
          icon: '🌍'
        });
        break;
      case 'storyteller':
        defaultActions.push({
          id: 'launch-wizard',
          name: 'Create Story',
          description: 'Launch the storyteller wizard',
          icon: '📖'
        });
        break;
      case 'audio-production':
        defaultActions.push({
          id: 'open-audio-editor',
          name: 'Audio Editor',
          description: 'Open the audio production editor',
          icon: '🎵'
        });
        break;
      default:
        break;
    }

    return defaultActions;
  }

  /**
   * Executes an add-on action
   */
  async executeAddonAction(addonId: string, actionId: string): Promise<void> {
    const addon = this.addons.get(addonId);
    if (!addon) {
      throw new Error(`Addon ${addonId} not found`);
    }

    if (addon.status !== 'active') {
      throw new Error(`Addon ${addonId} is not active`);
    }

    // Handle common actions
    switch (actionId) {
      case 'settings':
        // This will be handled by the UI component
        logger.debug(`[AddonManager] Opening settings for addon: ${addonId}`);
        break;
      case 'launch-wizard':
        // This will be handled by the UI component via the handler
        logger.debug(`[AddonManager] Launching wizard for addon: ${addonId}`);
        break;
      default:
        logger.debug(`[AddonManager] Executing action ${actionId} for addon: ${addonId}`);
        break;
    }
  }

  /**
   * Exports add-ons configuration
   */
  exportConfig(): AddonConfig {
    return { ...this.config };
  }

  /**
   * Imports an add-ons configuration
   */
  importConfig(config: AddonConfig): void {
    this.config = { ...config };
    this.saveConfig();
  }

  /**
   * Checks an add-on's dependencies
   */
  private async checkDependencies(addon: AddonInfo): Promise<void> {
    if (!addon.dependencies || addon.dependencies.length === 0) {
      return;
    }

    for (const depId of addon.dependencies) {
      const depAddon = this.addons.get(depId);
      if (!depAddon) {
        throw new Error(`Dependency ${depId} not found`);
      }

      if (!depAddon.enabled) {
        throw new Error(`Dependency ${depId} is not enabled`);
      }

      if (depAddon.status !== 'active') {
        throw new Error(`Dependency ${depId} is not active (status: ${depAddon.status})`);
      }
    }
  }

  /**
   * Loads an add-on
   */
  private async loadAddon(addon: AddonInfo): Promise<void> {
    // Initialize resource tracking for this add-on
    this.registerAddonResource(addon.id);

    // For built-in add-ons, load dynamically
    if (addon.builtin) {
      try {
        switch (addon.id) {
          case 'casting':
            await import('@/addons/casting');
            break;
          case 'audio-production':
            await import('@/addons/audio-production');
            break;
          case 'comic-to-sequence':
            await import('@/addons/comic-to-sequence');
            break;
          case 'transitions':
            await import('@/addons/transitions');
            break;
          case 'plan-sequences':
            await import('@/addons/plan-sequences');
            break;
          case 'mcp-server':
            await import('@/addons/mcp-server');
            break;
          case 'demo-addon':
            await import('@/addons/demo-addon');
            break;
          case 'example-workflow':
            await import('@/addons/example-workflow');
            break;
          case 'grok-integration':
            await import('@/addons/grok-integration');
            break;
          case 'seed-dance':
            await import('@/addons/seed-dance');
            break;
          default:
            logger.warn(`[AddonManager] Unknown builtin addon: ${addon.id}`);
        }
      } catch (error) {
        throw new Error(`Failed to load builtin addon: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // For external add-ons, load dynamically
      try {
        const addonPath = `addons/community/${addon.id}`;
        // Load it as a module
        const module = await import(/* @vite-ignore */ `${addonPath}/${addon.id}.js`);

        // Call the initialization function if it exists
        if (module.initialize) {
          await module.initialize();
        }
      } catch (error) {
        throw new Error(`Failed to load external addon: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Unloads an add-on and cleans up resources
   */
  private async unloadAddon(addon: AddonInfo): Promise<void> {
    const resources = this.addonResources.get(addon.id);

    if (resources) {
      // 1. Clean up event listeners
      const eventTypes = Array.from(resources.eventListeners.keys());
      for (const eventType of eventTypes) {
        const listeners = resources.eventListeners.get(eventType) || [];
        for (const listener of listeners) {
          // Note: For complete cleanup, we should keep track of listener targets
          // Here we just log for debugging
          logger.debug(`[AddonManager] Would remove event listener: ${eventType} for addon ${addon.id}`);
        }
        resources.eventListeners.delete(eventType);
      }

      // 2. Stop timers
      for (const timerId of resources.timers) {
        clearTimeout(timerId);
      }
      resources.timers = [];

      // 3. Stop intervals
      for (const intervalId of resources.intervals) {
        clearInterval(intervalId);
      }
      resources.intervals = [];

      // 4. Remove DOM elements created by the add-on
      const elements = Array.from(resources.domElements);
      for (const element of elements) {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
      resources.domElements.clear();

      // Remove resources from the map
      this.addonResources.delete(addon.id);
    }

    // 5. Clean up injected styles
    const styleElements = document.querySelectorAll(`style[data-addon="${addon.id}"]`);
    styleElements.forEach(style => style.remove());

    // 6. Clean up global event listeners
    const globalListeners = document.querySelectorAll(`[data-addon-listener="${addon.id}"]`);
    globalListeners.forEach(element => {
      element.removeAttribute('data-addon-listener');
    });

    logger.debug(`[AddonManager] Unloaded addon: ${addon.id}`);
  }

  /**
   * Registers built-in add-ons
   */
  private async registerBuiltinAddons(): Promise<void> {
    // Casting Add-on
    this.registerAddon({
      id: 'casting',
      name: 'Casting Manager',
      description: 'Advanced casting and character management for your projects',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'ui',
      builtin: true,
      tags: ['casting', 'characters', 'actors']
    });

    // Audio Production Add-on
    this.registerAddon({
      id: 'audio-production',
      name: 'Audio Production Suite',
      description: 'Complete suite for audio production and sound effects',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'processing',
      builtin: true,
      tags: ['audio', 'sound', 'effects', 'music']
    });

    // Comic to Sequence Add-on
    this.registerAddon({
      id: 'comic-to-sequence',
      name: 'Comic to Sequence Converter',
      description: 'Automatically converts comic books to video sequences',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'processing',
      builtin: true,
      tags: ['comic', 'conversion', 'sequence', 'automation']
    });

    // Transitions Add-on
    this.registerAddon({
      id: 'transitions',
      name: 'Advanced Transitions',
      description: 'Extended library of professional transition effects',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'ui',
      builtin: true,
      tags: ['transitions', 'effects', 'professional']
    });

    // Plan Sequences Add-on
    this.registerAddon({
      id: 'plan-sequences',
      name: 'Plan Sequences Manager',
      description: 'Advanced management of shots and editing sequences',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'ui',
      builtin: true,
      tags: ['sequences', 'planning', 'editing']
    });

    // MCP Server Add-on
    this.registerAddon({
      id: 'mcp-server',
      name: 'MCP Server Addon',
      description: 'MCP Server (Model Context Protocol) for external service integration via JSON-RPC 2.0',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'integration',
      builtin: true,
      tags: ['mcp', 'protocol', 'integration', 'rpc']
    });

    // Demo Add-on
    this.registerAddon({
      id: 'demo-addon',
      name: 'Demo Addon',
      description: 'System demonstration add-on',
      version: '1.0.0',
      author: 'Unknown',
      category: 'utility',
      builtin: true,
      tags: ['demo', 'example', 'test']
    });

    // Example Workflow Add-on
    this.registerAddon({
      id: 'example-workflow',
      name: 'Example Workflow',
      description: 'Example workflow addon for testing',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'utility',
      builtin: true,
      tags: ['example', 'workflow', 'test']
    });

    // Grok Integration Add-on
    this.registerAddon({
      id: 'grok-integration',
      name: 'Grok AI Integration',
      description: 'Integration with xAI Grok models for advanced reasoning and storytelling',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'integration',
      builtin: true,
      tags: ['ai', 'llm', 'grok', 'xai', 'reasoning']
    });

    // SeedChange (SeedDance) Add-on
    this.registerAddon({
      id: 'seed-dance',
      name: 'SeedDance Video Gen',
      description: 'Advanced AI video generation using SeedDance technology',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'processing',
      builtin: true,
      tags: ['video', 'ai', 'generation', 'animation', 'seeddance']
    });
  }

  /**
   * Loads external add-ons
   */
  private async loadExternalAddons(): Promise<void> {
    try {
      // Scan the addons/community/ folder for external add-ons
      const addonsDir = 'addons/community';

      // Use fileSystemService to list folders
      const addonFolders = await this.scanAddonDirectories(addonsDir);

      for (const addonPath of addonFolders) {
        try {
          // Parse the add-on manifest
          const manifest = await this.parseAddonManifest(addonPath);

          if (!manifest) {
            logger.warn(`[AddonManager] Invalid manifest for addon at ${addonPath}`);
            continue;
          }

          // Validate add-on security
          if (!this.validateAddonSecurity(manifest)) {
            logger.warn(`[AddonManager] Security validation failed for addon: ${manifest.id}`);
            continue;
          }

          // Register the add-on
          this.registerAddon({
            id: manifest.id,
            name: manifest.name,
            description: manifest.description,
            version: manifest.version,
            author: manifest.author,
            category: 'utility',
            builtin: false,
            tags: ['external', 'community'],
            dependencies: manifest.dependencies ? Object.keys(manifest.dependencies) : undefined
          });

          logger.debug(`[AddonManager] Loaded external addon: ${manifest.name} v${manifest.version}`);
        } catch (error) {
          logger.error(`[AddonManager] Failed to load addon at ${addonPath}:`, error);
        }
      }
    } catch (error) {
      logger.warn('[AddonManager] Failed to scan external addons directory:', error);
    }
  }

  /**
   * Scans add-on directories
   */
  private async scanAddonDirectories(basePath: string): Promise<string[]> {
    const folders: string[] = [];

    try {
      // Use fetch to scan the folder (compatible with browser and Electron)
      // For Electron, we use the IPC API to list the folder

      // Try first via fetch (for static files)
      try {
        const response = await fetch(`${basePath}/index.json`);
        if (response.ok) {
          const entries = await response.json() as Array<{ name: string; type: 'directory' | 'file' }>;
          for (const entry of entries) {
            if (entry.type === 'directory') {
              const addonPath = `${basePath}/${entry.name}`;
              folders.push(addonPath);
            }
          }
          return folders;
        }
      } catch {
        // The index.json file does not exist, continue with alternative method
      }

      // Alternative method: use fetch to test each potential folder
      // Only scan for addons that actually exist in the filesystem
      // by checking the directory listing from index.json

      // For now, we'll scan the actual directories that exist:
      const existingAddons = ['demo_addon', 'example_workflow', 'test_addon'];

      for (const addonName of existingAddons) {
        const addonPath = `${basePath}/${addonName}`;
        try {
          const manifestResponse = await fetch(`${addonPath}/addon.json`);
          if (manifestResponse.ok) {
            folders.push(addonPath);
          }
        } catch {
          // Folder not accessible or doesn't exist
        }
      }

    } catch (error) {
      logger.warn('[AddonManager] Cannot scan addons directory:', { basePath });
    }

    return folders;
  }

  /**
   * Parses an add-on manifest
   */
  private async parseAddonManifest(addonPath: string): Promise<AddonManifest | null> {
    const manifestPath = `${addonPath}/addon.json`;

    try {
      const response = await fetch(manifestPath);
      if (!response.ok) {
        logger.warn(`[AddonManager] Manifest not found: ${manifestPath}`);
        return null;
      }

      const content = await response.text();
      const manifest = JSON.parse(content) as AddonManifest;

      // Validate minimum manifest structure
      if (!manifest.id || !manifest.name || !manifest.version || !manifest.entryPoint) {
        logger.warn('[AddonManager] Invalid manifest structure: missing required fields');
        return null;
      }

      // Verify that the ID is valid (alphanumeric, dashes, underscores)
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(manifest.id)) {
        logger.warn(`[AddonManager] Invalid addon ID format: ${manifest.id}`);
        return null;
      }

      return manifest;
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.warn(`[AddonManager] Invalid JSON in manifest: ${manifestPath}`);
      } else {
        logger.warn(`[AddonManager] Failed to read manifest: ${manifestPath}`, error);
      }
      return null;
    }
  }

  /**
   * Validates an add-on's security
   */
  private validateAddonSecurity(manifest: AddonManifest): boolean {
    // Dangerous permissions that require additional validation
    const dangerousPermissions = [
      'fileSystem.write',
      'fileSystem.read',
      'network.request',
      'network.websocket',
      'process.execute',
      'process.spawn',
      'eval',
      'require'
    ];

    // Check requested permissions
    if (manifest.permissions) {
      for (const permission of manifest.permissions) {
        if (dangerousPermissions.includes(permission)) {
          // Log a warning but allow for now
          logger.warn(`[AddonManager] Dangerous permission requested by ${manifest.id}: ${permission}`);
        }
      }
    }

    // Check limited resources (no absolute path, no system files)
    if (manifest.entryPoint) {
      if (manifest.entryPoint.startsWith('/') || manifest.entryPoint.includes('..')) {
        logger.warn(`[AddonManager] Invalid entryPoint path: ${manifest.entryPoint}`);
        return false;
      }
    }

    // Check dependencies (no critical Node.js packages)
    const dangerousDeps = ['child_process', 'fs', 'http', 'https', 'net', 'crypto', 'tls'];
    if (manifest.dependencies) {
      for (const dep of Object.keys(manifest.dependencies)) {
        if (dangerousDeps.includes(dep)) {
          logger.warn(`[AddonManager] Dangerous dependency requested by ${manifest.id}: ${dep}`);
        }
      }
    }

    return true;
  }

  /**
   * Registers a resource for an add-on
   */
  private registerAddonResource(addonId: string): void {
    if (!this.addonResources.has(addonId)) {
      this.addonResources.set(addonId, {
        eventListeners: new Map(),
        timers: [],
        domElements: new Set(),
        intervals: []
      });
    }
  }

  /**
   * Adds an event listener for an add-on
   */
  trackEventListener(addonId: string, eventType: string, listener: EventListener): void {
    const resources = this.addonResources.get(addonId);
    if (resources) {
      const listeners = resources.eventListeners.get(eventType) || [];
      listeners.push(listener);
      resources.eventListeners.set(eventType, listeners);
    }
  }

  /**
   * Adds a timer for an add-on
   */
  trackTimer(addonId: string, timerId: number): void {
    const resources = this.addonResources.get(addonId);
    if (resources) {
      resources.timers.push(timerId);
    }
  }

  /**
   * Adds an interval for an add-on
   */
  trackInterval(addonId: string, intervalId: number): void {
    const resources = this.addonResources.get(addonId);
    if (resources) {
      resources.intervals.push(intervalId);
    }
  }

  /**
   * Tracks a DOM element created by an add-on
   */
  trackDOMElement(addonId: string, element: HTMLElement): void {
    const resources = this.addonResources.get(addonId);
    if (resources) {
      resources.domElements.add(element);
    }
  }

  /**
   * Loads configuration from localStorage
   */
  private async loadConfig(): Promise<void> {
    try {
      const stored = localStorage.getItem('storycore_addon_config');
      if (stored) {
        this.config = JSON.parse(stored);
      }
    } catch (error) {
      logger.warn('[AddonManager] Failed to load addon config:', error);
      this.config = {};
    }
  }

  /**
   * Initializes settings definitions for add-ons
   */
  private initializeSettingsDefinitions(): void {
    this.settingsDefinitions = {
      'casting': [
        {
          key: 'maxActorsPerScene',
          label: 'Maximum actors per scene',
          type: 'number',
          defaultValue: 5,
          description: 'Maximum number of actors displayed simultaneously in a scene',
          min: 1,
          max: 20,
          validation: (value: unknown): boolean => typeof value === 'number' && value >= 1 && value <= 20
        },
        {
          key: 'enableActorTemplates',
          label: 'Enable actor templates',
          type: 'boolean',
          defaultValue: true,
          description: 'Use predefined templates to quickly create actors'
        },
        {
          key: 'autoSaveCasting',
          label: 'Automatic casting save',
          type: 'boolean',
          defaultValue: true,
          description: 'Automatically save casting modifications'
        }
      ],
      'audio-production': [
        {
          key: 'defaultSampleRate',
          label: 'Default sample rate',
          type: 'select',
          defaultValue: 44100,
          description: 'Sample rate for new audio projects',
          options: [
            { label: '22050 Hz (Voice)', value: 22050 },
            { label: '44100 Hz (CD)', value: 44100 },
            { label: '48000 Hz (DVD)', value: 48000 },
            { label: '96000 Hz (HD)', value: 96000 }
          ]
        },
        {
          key: 'maxAudioTracks',
          label: 'Maximum audio tracks',
          type: 'number',
          defaultValue: 16,
          description: 'Maximum number of audio tracks per project',
          min: 1,
          max: 64,
          validation: (value: unknown): boolean => typeof value === 'number' && value >= 1 && value <= 64
        },
        {
          key: 'enableAudioNormalization',
          label: 'Automatic normalization',
          type: 'boolean',
          defaultValue: true,
          description: 'Automatically normalize audio levels'
        }
      ],
      'comic-to-sequence': [
        {
          key: 'defaultPanelDuration',
          label: 'Default panel duration',
          type: 'number',
          defaultValue: 3,
          description: 'Duration in seconds for each converted comic panel',
          min: 1,
          max: 10,
          validation: (value: unknown): boolean => typeof value === 'number' && value >= 1 && value <= 10
        },
        {
          key: 'autoDetectSpeechBubbles',
          label: 'Automatic bubble detection',
          type: 'boolean',
          defaultValue: true,
          description: 'Automatically detect speech bubbles in images'
        },
        {
          key: 'enableOCR',
          label: 'Enable OCR',
          type: 'boolean',
          defaultValue: false,
          description: 'Use optical character recognition to extract text'
        },
        {
          key: 'outputFormat',
          label: 'Output format',
          type: 'select',
          defaultValue: 'sequence',
          description: 'Output format for conversion',
          options: [
            { label: 'Complete sequence', value: 'sequence' },
            { label: 'Individual shots', value: 'shots' },
            { label: 'Storyboard', value: 'storyboard' }
          ]
        }
      ],
      'transitions': [
        {
          key: 'defaultTransitionDuration',
          label: 'Default transition duration',
          type: 'number',
          defaultValue: 0.5,
          description: 'Default transition duration in seconds',
          min: 0.1,
          max: 5.0,
          validation: (value: unknown): boolean => typeof value === 'number' && value >= 0.1 && value <= 5.0
        },
        {
          key: 'enableSmoothTransitions',
          label: 'Smooth transitions',
          type: 'boolean',
          defaultValue: true,
          description: 'Use smooth transitions for professional rendering'
        },
        {
          key: 'transitionLibrary',
          label: 'Transition library',
          type: 'select',
          defaultValue: 'professional',
          description: 'Set of transitions to use',
          options: [
            { label: 'Basic', value: 'basic' },
            { label: 'Professional', value: 'professional' },
            { label: 'Cinematic', value: 'cinematic' },
            { label: 'Creative', value: 'creative' }
          ]
        }
      ],
      'plan-sequences': [
        {
          key: 'maxShotsPerSequence',
          label: 'Maximum shots per sequence',
          type: 'number',
          defaultValue: 20,
          description: 'Maximum number of shots in a sequence',
          min: 1,
          max: 100,
          validation: (value: unknown): boolean => typeof value === 'number' && value >= 1 && value <= 100
        },
        {
          key: 'autoCalculateDuration',
          label: 'Automatic duration calculation',
          type: 'boolean',
          defaultValue: true,
          description: 'Automatically calculate total sequence duration'
        },
        {
          key: 'enableSequenceTemplates',
          label: 'Sequence templates',
          type: 'boolean',
          defaultValue: true,
          description: 'Use predefined templates to create sequences'
        },
        {
          key: 'sequenceNamingConvention',
          label: 'Naming convention',
          type: 'select',
          defaultValue: 'numbered',
          description: 'Automatic sequence naming format',
          options: [
            { label: 'Numbered (Sequence 1, 2, 3...)', value: 'numbered' },
            { label: 'Descriptive (Opening, Development...)', value: 'descriptive' },
            { label: 'Custom', value: 'custom' }
          ]
        }
      ],
      'grok-integration': [
        {
          key: 'apiKey',
          label: 'Grok API Key',
          type: 'text',
          defaultValue: '',
          description: 'Your xAI API key for Grok models'
        },
        {
          key: 'defaultModel',
          label: 'Default Model',
          type: 'select',
          defaultValue: 'grok-2',
          description: 'Model to use for generation',
          options: [
            { label: 'Grok-1', value: 'grok-1' },
            { label: 'Grok-1.5', value: 'grok-1.5' },
            { label: 'Grok-2', value: 'grok-2' },
            { label: 'Grok-2 Vision', value: 'grok-2-vision' },
            { label: 'Grok-3 (Limited)', value: 'grok-3' },
            { label: 'Grok Beta', value: 'grok-beta' }
          ]
        },
        {
          key: 'enableReasoning',
          label: 'Enable Reasoning Features',
          type: 'boolean',
          defaultValue: true,
          description: 'Unlock advanced reasoning capabilities'
        },
        {
          key: 'humorLevel',
          label: 'Grok Humor Level',
          type: 'number',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          description: 'Control the "fun" level of responses'
        },
        {
          key: 'chainOfThought',
          label: 'Chain of Thought',
          type: 'boolean',
          defaultValue: false,
          description: 'Show internal reasoning before final response'
        },
        {
          key: 'sarcasmMode',
          label: 'Sarcasm Mode',
          type: 'boolean',
          defaultValue: false,
          description: 'Enable Grok\'s signature sarcastic personality'
        },
        {
          key: 'funFactFrequency',
          label: 'Fun Fact Frequency',
          type: 'number',
          defaultValue: 0.2,
          min: 0,
          max: 1,
          description: 'How often Grok injects random fun facts into the conversation'
        }
      ],
      'seed-dance': [
        {
          key: 'apiKey',
          label: 'SeedDance API Key',
          type: 'text',
          defaultValue: '',
          description: 'API Key for SeedDance services'
        },
        {
          key: 'resolution',
          label: 'Default Resolution',
          type: 'select',
          defaultValue: '1080p',
          description: 'Output video resolution',
          options: [
            { label: '720p HD', value: '720p' },
            { label: '1080p FHD', value: '1080p' },
            { label: '4K UHD', value: '4k' }
          ]
        },
        {
          key: 'motionStrength',
          label: 'Default Motion Strength',
          type: 'number',
          defaultValue: 0.5,
          min: 0.1,
          max: 1.0,
          description: 'Intensity of movement in generated video',
          validation: (value: unknown): boolean => typeof value === 'number' && value >= 0.1 && value <= 1.0
        },
        {
          key: 'videoDuration',
          label: 'Duration (Seconds)',
          type: 'select',
          defaultValue: '5',
          description: 'Length of the generated clip',
          options: [
            { label: '3 Seconds', value: '3' },
            { label: '5 Seconds', value: '5' },
            { label: '10 Seconds (Beta)', value: '10' }
          ]
        },
        {
          key: 'cameraMovement',
          label: 'Camera Movement',
          type: 'select',
          defaultValue: 'static',
          description: 'Automatic camera motion',
          options: [
            { label: 'Static', value: 'static' },
            { label: 'Zoom In', value: 'zoom_in' },
            { label: 'Zoom Out', value: 'zoom_out' },
            { label: 'Pan Left', value: 'pan_left' },
            { label: 'Pan Right', value: 'pan_right' },
            { label: 'Crane Up', value: 'crane_up' }
          ]
        },
        {
          key: 'viralOptimization',
          label: 'Viral Clip Optimization',
          type: 'boolean',
          defaultValue: true,
          description: 'Optimize video for short-form social media (Reels/TikTok)'
        },
        {
          key: 'automaticSubtitles',
          label: 'Automatic Subtitles',
          type: 'boolean',
          defaultValue: false,
          description: 'Generate dynamic animated subtitles'
        }
      ]
    };
  }

  /**
   * Saves configuration to localStorage
   */
  private async saveConfig(): Promise<void> {
    try {
      localStorage.setItem('storycore_addon_config', JSON.stringify(this.config));
    } catch (error) {
      logger.error('[AddonManager] Failed to save addon config:', error);
    }
  }

  /**
   * Saves configuration to a file
   * @param filePath File path (default: 'config/addons.json')
   */
  async saveToFile(filePath: string = 'config/addons.json'): Promise<void> {
    try {
      // Export current configuration
      const config = this.exportConfig();

      // Save to file
      await fileSystemService.writeConfigFile(filePath, config);

      // Sync with localStorage
      await fileSystemService.syncWithLocalStorage(config);

      logger.debug(`[AddonManager] Configuration saved to ${filePath}`);
    } catch (error) {
      logger.error('[AddonManager] Failed to save config to file:', error);
      throw error;
    }
  }

  /**
   * Loads configuration from a file
   * @param filePath File path (default: 'config/addons.json')
   */
  async loadFromFile(filePath: string = 'config/addons.json'): Promise<void> {
    try {
      // Read configuration from file
      const config = await fileSystemService.readConfigFile(filePath);

      // Import configuration
      this.importConfig(config);

      // Sync with localStorage
      await fileSystemService.syncWithLocalStorage(config);

      logger.debug(`[AddonManager] Configuration loaded from ${filePath}`);
    } catch (error) {
      logger.error('[AddonManager] Failed to load config from file:', error);
      throw error;
    }
  }

  /**
   * Automatic synchronization between localStorage and file
   */
  async autoSync(): Promise<void> {
    try {
      // Automatically save to file
      await this.saveToFile();
    } catch (error) {
      logger.warn('[AddonManager] Auto-sync failed:', error);
    }
  }

  // ============================================
  // NEW METHODS - Phase 3 Enhancements
  // ============================================

  /**
   * Gets paginated and sorted list of add-ons
   */
  getAddonsPaginated(options: PaginationOptions = {}): PaginatedResult<AddonInfo> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    let addonsList = Array.from(this.addons.values());

    // Apply sorting
    const reverse = sortOrder === 'desc';
    addonsList.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'version':
          comparison = a.version.localeCompare(b.version);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      return reverse ? -comparison : comparison;
    });

    // Apply pagination
    const totalItems = addonsList.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedItems = addonsList.slice(startIdx, endIdx);

    return {
      items: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      sort: {
        by: sortBy,
        order: sortOrder
      }
    };
  }

  /**
   * Bulk enable add-ons
   */
  async bulkEnable(addonIds: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const addonId of addonIds) {
      try {
        const result = await this.activateAddon(addonId);
        if (result) {
          success.push(addonId);
        } else {
          failed.push(addonId);
        }
      } catch (error) {
        logger.error(`[AddonManager] Failed to enable addon ${addonId}:`, error);
        failed.push(addonId);
      }
    }

    return { success, failed };
  }

  /**
   * Bulk disable add-ons
   */
  async bulkDisable(addonIds: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const addonId of addonIds) {
      try {
        const result = await this.deactivateAddon(addonId);
        if (result) {
          success.push(addonId);
        } else {
          failed.push(addonId);
        }
      } catch (error) {
        logger.error(`[AddonManager] Failed to disable addon ${addonId}:`, error);
        failed.push(addonId);
      }
    }

    return { success, failed };
  }

  /**
   * Reload an addon (disable + enable)
   */
  async reloadAddon(addonId: string): Promise<boolean> {
    try {
      await this.deactivateAddon(addonId);
      return await this.activateAddon(addonId);
    } catch (error) {
      logger.error(`[AddonManager] Failed to reload addon ${addonId}:`, error);
      return false;
    }
  }

  /**
   * Get addon dependencies
   */
  getAddonDependencies(addonId: string, recursive: boolean = false): string[] {
    const addon = this.addons.get(addonId);
    if (!addon || !addon.dependencies) {
      return [];
    }

    const deps = [...addon.dependencies];

    if (recursive) {
      for (const depId of addon.dependencies) {
        const subDeps = this.getAddonDependencies(depId, true);
        deps.push(...subDeps);
      }
    }

    return [...new Set(deps)]; // Remove duplicates
  }

  /**
   * Browse marketplace (mock implementation)
   */
  async browseMarketplace(options: {
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ items: MarketplaceAddon[]; pagination: any }> {
    // Mock marketplace data
    const marketplaceAddons: MarketplaceAddon[] = [
      {
        id: 'premium-video-filters',
        name: 'Premium Video Filters',
        description: 'Collection de filtres vidéo professionnels',
        author: 'StoryCore Team',
        version: '1.2.0',
        category: 'processing',
        rating: 4.8,
        downloads: 15000,
        price: 'Free'
      },
      {
        id: 'ai-voice-cloning',
        name: 'AI Voice Cloning',
        description: 'Clonez des voix pour vos personnages',
        author: 'AI Labs',
        version: '2.0.0',
        category: 'audio',
        rating: 4.5,
        downloads: 8500,
        price: 'Premium'
      },
      {
        id: '3d-character-export',
        name: '3D Character Export',
        description: 'Exportez vos personnages en format 3D',
        author: '3D Studios',
        version: '1.0.0',
        category: 'export',
        rating: 4.2,
        downloads: 3200,
        price: 'Free'
      }
    ];

    let results = marketplaceAddons;

    // Apply filters
    if (options.category) {
      results = results.filter(a => a.category === options.category);
    }
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      results = results.filter(a => 
        a.name.toLowerCase().includes(searchLower) || 
        a.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const totalItems = results.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedItems = results.slice(startIdx, endIdx);

    return {
      items: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Check version compatibility for all addons
   */
  async checkVersionCompatibility(): Promise<{
    compatible: string[];
    incompatible: string[];
  }> {
    const compatible: string[] = [];
    const incompatible: string[] = [];

    for (const [addonId, addon] of this.addons.entries()) {
      // Mock compatibility check - in real implementation would check against versions
      try {
        // For now, all built-in addons are compatible
        if (addon.builtin) {
          compatible.push(addonId);
        } else {
          // External addons need real validation
          compatible.push(addonId);
        }
      } catch {
        incompatible.push(addonId);
      }
    }

    return { compatible, incompatible };
  }
}

// Export singleton instance
export const addonManager = AddonManager.getInstance();


