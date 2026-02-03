/**
 * AddonManager - Gestionnaire d'extensions (add-ons) pour StoryCore
 *
 * Permet d'activer/désactiver des add-ons et de gérer leur cycle de vie
 */

import { fileSystemService } from './FileSystemService';

/**
 * Manifeste d'add-on externe
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
 * Ressource enregistrée pour un add-on (pour nettoyage)
 */
interface AddonResource {
  eventListeners: Map<string, EventListener[]>;
  timers: number[];
  domElements: Set<HTMLElement>;
  intervals: number[];
}

export interface AddonInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: 'ui' | 'processing' | 'export' | 'integration' | 'utility';
  dependencies?: string[];
  enabled: boolean;
  builtin: boolean; // true pour les add-ons intégrés, false pour les externes
  status: 'active' | 'inactive' | 'error' | 'loading';
  errorMessage?: string;
  icon?: string;
  tags?: string[];
}

export interface AddonConfig {
  [addonId: string]: {
    enabled: boolean;
    settings?: Record<string, any>;
  };
}

export interface AddonSetting {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  defaultValue: any;
  description?: string;
  options?: Array<{ label: string; value: any }>; // Pour les selects
  min?: number; // Pour les numbers
  max?: number; // Pour les numbers
  validation?: (value: any) => boolean;
}

export interface AddonSettingsDefinition {
  [addonId: string]: AddonSetting[];
}

/**
 * Gestionnaire d'add-ons pour StoryCore
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
   * Initialise le gestionnaire d'add-ons
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Charger la configuration depuis localStorage
    await this.loadConfig();

    // Enregistrer les add-ons intégrés
    await this.registerBuiltinAddons();

    // Charger les add-ons externes (si présents)
    await this.loadExternalAddons();

    this.initialized = true;
  }

  /**
   * Enregistre un add-on
   */
  registerAddon(addon: Omit<AddonInfo, 'enabled' | 'status'>): void {
    const addonInfo: AddonInfo = {
      ...addon,
      enabled: this.config[addon.id]?.enabled ?? false,
      status: 'inactive'
    };

    this.addons.set(addon.id, addonInfo);

    // Activer si configuré pour l'être
    if (addonInfo.enabled) {
      this.activateAddon(addon.id).catch(error => {
        console.error(`[AddonManager] Failed to activate addon ${addon.id}:`, error);
        addonInfo.status = 'error';
        addonInfo.errorMessage = error.message;
      });
    }
  }

  /**
   * Désenregistre un add-on
   */
  unregisterAddon(addonId: string): boolean {
    const addon = this.addons.get(addonId);
    if (!addon) return false;

    // Désactiver d'abord
    if (addon.enabled) {
      this.deactivateAddon(addonId);
    }

    this.addons.delete(addonId);
    return true;
  }

  /**
   * Active un add-on
   */
  async activateAddon(addonId: string): Promise<boolean> {
    const addon = this.addons.get(addonId);
    if (!addon) {
      throw new Error(`Addon ${addonId} not found`);
    }

    if (addon.enabled) {
      return true; // Déjà activé
    }

    try {
      addon.status = 'loading';

      // Vérifier les dépendances
      await this.checkDependencies(addon);

      // Charger l'add-on
      await this.loadAddon(addon);

      // Marquer comme activé
      addon.enabled = true;
      addon.status = 'active';
      addon.errorMessage = undefined;

      // Sauvegarder la configuration
      await this.saveConfig();

      return true;

    } catch (error) {
      addon.status = 'error';
      addon.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AddonManager] Failed to activate addon ${addonId}:`, error);
      return false;
    }
  }

  /**
   * Désactive un add-on
   */
  async deactivateAddon(addonId: string): Promise<boolean> {
    const addon = this.addons.get(addonId);
    if (!addon) {
      throw new Error(`Addon ${addonId} not found`);
    }

    if (!addon.enabled) {
      return true; // Déjà désactivé
    }

    try {
      // Décharger l'add-on
      await this.unloadAddon(addon);

      // Marquer comme désactivé
      addon.enabled = false;
      addon.status = 'inactive';
      addon.errorMessage = undefined;

      // Sauvegarder la configuration
      await this.saveConfig();

      return true;

    } catch (error) {
      addon.status = 'error';
      addon.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AddonManager] Failed to deactivate addon ${addonId}:`, error);
      return false;
    }
  }

  /**
   * Active/Désactive un add-on (toggle)
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
   * Obtient la liste des add-ons
   */
  getAddons(): AddonInfo[] {
    return Array.from(this.addons.values());
  }

  /**
   * Obtient un add-on par son ID
   */
  getAddon(addonId: string): AddonInfo | undefined {
    return this.addons.get(addonId);
  }

  /**
   * Obtient les add-ons actifs
   */
  getActiveAddons(): AddonInfo[] {
    return this.getAddons().filter(addon => addon.enabled && addon.status === 'active');
  }

  /**
   * Obtient les add-ons par catégorie
   */
  getAddonsByCategory(category: AddonInfo['category']): AddonInfo[] {
    return this.getAddons().filter(addon => addon.category === category);
  }

  /**
   * Recherche des add-ons
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
   * Met à jour les paramètres d'un add-on
   */
  updateAddonSettings(addonId: string, settings: Record<string, any>): void {
    if (!this.config[addonId]) {
      this.config[addonId] = { enabled: false };
    }
    this.config[addonId].settings = { ...this.config[addonId].settings, ...settings };
    this.saveConfig();
  }

  /**
   * Obtient les paramètres d'un add-on
   */
  getAddonSettings(addonId: string): Record<string, any> | undefined {
    return this.config[addonId]?.settings;
  }

  /**
   * Obtient la définition des paramètres d'un add-on
   */
  getAddonSettingsDefinition(addonId: string): AddonSetting[] {
    return this.settingsDefinitions[addonId] || [];
  }

  /**
   * Obtient les paramètres actuels d'un add-on (avec valeurs par défaut)
   */
  getAddonSettingsWithDefaults(addonId: string): Record<string, any> {
    const definition = this.getAddonSettingsDefinition(addonId);
    const currentSettings = this.getAddonSettings(addonId) || {};

    const settingsWithDefaults: Record<string, any> = {};
    definition.forEach(setting => {
      settingsWithDefaults[setting.key] = currentSettings[setting.key] ?? setting.defaultValue;
    });

    return settingsWithDefaults;
  }

  /**
   * Exporte la configuration des add-ons
   */
  exportConfig(): AddonConfig {
    return { ...this.config };
  }

  /**
   * Importe une configuration d'add-ons
   */
  importConfig(config: AddonConfig): void {
    this.config = { ...config };
    this.saveConfig();
  }

  /**
   * Vérifie les dépendances d'un add-on
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
   * Charge un add-on
   */
  private async loadAddon(addon: AddonInfo): Promise<void> {
    // Initialiser le suivi des ressources pour cet add-on
    this.registerAddonResource(addon.id);
    
    // Pour les add-ons intégrés, charger dynamiquement
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
          default:
            console.warn(`[AddonManager] Unknown builtin addon: ${addon.id}`);
        }
      } catch (error) {
        throw new Error(`Failed to load builtin addon: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Pour les add-ons externes, charger dynamiquement
      try {
        const addonPath = `addons/community/${addon.id}`;
        // Le charger comme module
        const module = await import(/* @vite-ignore */ `${addonPath}/${addon.id}.js`);
        
        // Appeler la fonction d'initialisation si elle existe
        if (module.initialize) {
          await module.initialize();
        }
      } catch (error) {
        throw new Error(`Failed to load external addon: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Décharge un add-on et nettoie les ressources
   */
  private async unloadAddon(addon: AddonInfo): Promise<void> {
    const resources = this.addonResources.get(addon.id);
    
    if (resources) {
      // 1. Nettoyer les event listeners
      const eventTypes = Array.from(resources.eventListeners.keys());
      for (const eventType of eventTypes) {
        const listeners = resources.eventListeners.get(eventType) || [];
        for (const listener of listeners) {
          // Note: Pour un nettoyage complet, il faudrait conserver les cibles des listeners
          // Ici on log juste pour le débogage
          console.log(`[AddonManager] Would remove event listener: ${eventType} for addon ${addon.id}`);
        }
        resources.eventListeners.delete(eventType);
      }
      
      // 2. Arrêter les timers
      for (const timerId of resources.timers) {
        clearTimeout(timerId);
      }
      resources.timers = [];
      
      // 3. Arrêter les intervals
      for (const intervalId of resources.intervals) {
        clearInterval(intervalId);
      }
      resources.intervals = [];
      
      // 4. Supprimer les éléments DOM créés par l'add-on
      const elements = Array.from(resources.domElements);
      for (const element of elements) {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
      resources.domElements.clear();
      
      // Supprimer les ressources de la map
      this.addonResources.delete(addon.id);
    }
    
    // 5. Nettoyer les styles injectés
    const styleElements = document.querySelectorAll(`style[data-addon="${addon.id}"]`);
    styleElements.forEach(style => style.remove());
    
    // 6. Nettoyer les event listeners globaux
    const globalListeners = document.querySelectorAll(`[data-addon-listener="${addon.id}"]`);
    globalListeners.forEach(element => {
      element.removeAttribute('data-addon-listener');
    });
    
    console.log(`[AddonManager] Unloaded addon: ${addon.id}`);
  }

  /**
   * Enregistre les add-ons intégrés
   */
  private async registerBuiltinAddons(): Promise<void> {
    // Add-on Casting
    this.registerAddon({
      id: 'casting',
      name: 'Casting Manager',
      description: 'Gestion avancée du casting et des personnages pour vos projets',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'ui',
      builtin: true,
      tags: ['casting', 'characters', 'actors']
    });

    // Add-on Audio Production
    this.registerAddon({
      id: 'audio-production',
      name: 'Audio Production Suite',
      description: 'Suite complète pour la production audio et les effets sonores',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'processing',
      builtin: true,
      tags: ['audio', 'sound', 'effects', 'music']
    });

    // Add-on Comic to Sequence
    this.registerAddon({
      id: 'comic-to-sequence',
      name: 'Comic to Sequence Converter',
      description: 'Convertit automatiquement les bandes dessinées en séquences vidéo',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'processing',
      builtin: true,
      tags: ['comic', 'conversion', 'sequence', 'automation']
    });

    // Add-on Transitions
    this.registerAddon({
      id: 'transitions',
      name: 'Advanced Transitions',
      description: 'Bibliothèque étendue d\'effets de transition professionnels',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'ui',
      builtin: true,
      tags: ['transitions', 'effects', 'professional']
    });

    // Add-on Plan Sequences
    this.registerAddon({
      id: 'plan-sequences',
      name: 'Plan Sequences Manager',
      description: 'Gestion avancée des plans et séquences de montage',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'ui',
      builtin: true,
      tags: ['sequences', 'planning', 'editing']
    });

    // Add-on MCP Server
    this.registerAddon({
      id: 'mcp-server',
      name: 'MCP Server Addon',
      description: 'Serveur MCP (Model Context Protocol) pour l\'intégration de services externes via JSON-RPC 2.0',
      version: '1.0.0',
      author: 'StoryCore Team',
      category: 'integration',
      builtin: true,
      tags: ['mcp', 'protocol', 'integration', 'rpc']
    });

    // Add-on Demo Addon
    this.registerAddon({
      id: 'demo-addon',
      name: 'Demo Addon',
      description: 'Add-on de démonstration du système',
      version: '1.0.0',
      author: 'Unknown',
      category: 'utility',
      builtin: true,
      tags: ['demo', 'example', 'test']
    });

    // Add-on Example Workflow
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
  }

  /**
   * Charge les add-ons externes
   */
  private async loadExternalAddons(): Promise<void> {
    try {
      // Scanner le dossier addons/community/ pour les add-ons externes
      const addonsDir = 'addons/community';
      
      // Utiliser fileSystemService pour lister les dossiers
      const addonFolders = await this.scanAddonDirectories(addonsDir);
      
      for (const addonPath of addonFolders) {
        try {
          // Parser le manifest de l'add-on
          const manifest = await this.parseAddonManifest(addonPath);
          
          if (!manifest) {
            console.warn(`[AddonManager] Invalid manifest for addon at ${addonPath}`);
            continue;
          }
          
          // Valider la sécurité de l'add-on
          if (!this.validateAddonSecurity(manifest)) {
            console.warn(`[AddonManager] Security validation failed for addon: ${manifest.id}`);
            continue;
          }
          
          // Enregistrer l'add-on
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
          
          console.log(`[AddonManager] Loaded external addon: ${manifest.name} v${manifest.version}`);
        } catch (error) {
          console.error(`[AddonManager] Failed to load addon at ${addonPath}:`, error);
        }
      }
    } catch (error) {
      console.warn('[AddonManager] Failed to scan external addons directory:', error);
    }
  }

  /**
   * Scan les répertoires d'add-ons
   */
  private async scanAddonDirectories(basePath: string): Promise<string[]> {
    const folders: string[] = [];
    
    try {
      // Utiliser fetch pour scanner le dossier (compatible browser et Electron)
      // Pour Electron, on utilise l'API IPC pour lister le dossier
      
      // Essayer d'abord via fetch (pour les fichiers statiques)
      try {
        const response = await fetch(`${basePath}/index.json`);
        if (response.ok) {
          const entries = await response.json() as Array<{name: string; type: 'directory' | 'file'}>;
          for (const entry of entries) {
            if (entry.type === 'directory') {
              const addonPath = `${basePath}/${entry.name}`;
              folders.push(addonPath);
            }
          }
          return folders;
        }
      } catch {
        // Le fichier index.json n'existe pas, continuer avec la méthode alternative
      }
      
      // Méthode alternative: utiliser fetch pour tester chaque dossier potentiel
      // Liste des add-ons communautaires potentiels (hardcodé pour l'instant)
      const potentialAddons = ['example-community-addon', 'my-custom-addon', 'demo-external-addon'];
      
      for (const addonName of potentialAddons) {
        const addonPath = `${basePath}/${addonName}`;
        try {
          const manifestResponse = await fetch(`${addonPath}/addon.json`);
          if (manifestResponse.ok) {
            folders.push(addonPath);
          }
        } catch {
          // Dossier non accessible
        }
      }
      
    } catch (error) {
      console.warn(`[AddonManager] Cannot scan addons directory: ${basePath}`);
    }
    
    return folders;
  }

  /**
   * Parse le manifest d'un add-on
   */
  private async parseAddonManifest(addonPath: string): Promise<AddonManifest | null> {
    const manifestPath = `${addonPath}/addon.json`;
    
    try {
      const response = await fetch(manifestPath);
      if (!response.ok) {
        console.warn(`[AddonManager] Manifest not found: ${manifestPath}`);
        return null;
      }
      
      const content = await response.text();
      const manifest = JSON.parse(content) as AddonManifest;
      
      // Valider la structure minimale du manifest
      if (!manifest.id || !manifest.name || !manifest.version || !manifest.entryPoint) {
        console.warn(`[AddonManager] Invalid manifest structure: missing required fields`);
        return null;
      }
      
      // Vérifier que l'ID est valide (alphanumérique, tirets, underscores)
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(manifest.id)) {
        console.warn(`[AddonManager] Invalid addon ID format: ${manifest.id}`);
        return null;
      }
      
      return manifest;
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.warn(`[AddonManager] Invalid JSON in manifest: ${manifestPath}`);
      } else {
        console.warn(`[AddonManager] Failed to read manifest: ${manifestPath}`, error);
      }
      return null;
    }
  }

  /**
   * Valide la sécurité d'un add-on
   */
  private validateAddonSecurity(manifest: AddonManifest): boolean {
    // Permissions dangereuses qui nécessitent une validation supplémentaire
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
    
    // Vérifier les permissions demandées
    if (manifest.permissions) {
      for (const permission of manifest.permissions) {
        if (dangerousPermissions.includes(permission)) {
          // Log un avertissement mais autoriser pour le moment
          console.warn(`[AddonManager] Dangerous permission requested by ${manifest.id}: ${permission}`);
        }
      }
    }
    
    // Vérifier les ressources limitées (pas de chemin absolu, pas de fichiers système)
    if (manifest.entryPoint) {
      if (manifest.entryPoint.startsWith('/') || manifest.entryPoint.includes('..')) {
        console.warn(`[AddonManager] Invalid entryPoint path: ${manifest.entryPoint}`);
        return false;
      }
    }
    
    // Vérifier les dépendances (pas de packages Node.js critiques)
    const dangerousDeps = ['child_process', 'fs', 'http', 'https', 'net', 'crypto', 'tls'];
    if (manifest.dependencies) {
      for (const dep of Object.keys(manifest.dependencies)) {
        if (dangerousDeps.includes(dep)) {
          console.warn(`[AddonManager] Dangerous dependency requested by ${manifest.id}: ${dep}`);
        }
      }
    }
    
    return true;
  }

  /**
   * Enregistre une ressource pour un add-on
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
   * Ajoute un event listener pour un add-on
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
   * Ajoute un timer pour un add-on
   */
  trackTimer(addonId: string, timerId: number): void {
    const resources = this.addonResources.get(addonId);
    if (resources) {
      resources.timers.push(timerId);
    }
  }

  /**
   * Ajoute un interval pour un add-on
   */
  trackInterval(addonId: string, intervalId: number): void {
    const resources = this.addonResources.get(addonId);
    if (resources) {
      resources.intervals.push(intervalId);
    }
  }

  /**
   * Suit un élément DOM créé par un add-on
   */
  trackDOMElement(addonId: string, element: HTMLElement): void {
    const resources = this.addonResources.get(addonId);
    if (resources) {
      resources.domElements.add(element);
    }
  }

  /**
   * Charge la configuration depuis localStorage
   */
  private async loadConfig(): Promise<void> {
    try {
      const stored = localStorage.getItem('storycore_addon_config');
      if (stored) {
        this.config = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[AddonManager] Failed to load addon config:', error);
      this.config = {};
    }
  }

  /**
   * Initialise les définitions de paramètres pour les add-ons
   */
  private initializeSettingsDefinitions(): void {
    this.settingsDefinitions = {
      'casting': [
        {
          key: 'maxActorsPerScene',
          label: 'Acteurs maximum par scène',
          type: 'number',
          defaultValue: 5,
          description: 'Nombre maximum d\'acteurs affichés simultanément dans une scène',
          min: 1,
          max: 20,
          validation: (value: number) => value >= 1 && value <= 20
        },
        {
          key: 'enableActorTemplates',
          label: 'Activer les templates d\'acteurs',
          type: 'boolean',
          defaultValue: true,
          description: 'Utiliser des templates prédéfinis pour créer rapidement des acteurs'
        },
        {
          key: 'autoSaveCasting',
          label: 'Sauvegarde automatique du casting',
          type: 'boolean',
          defaultValue: true,
          description: 'Sauvegarder automatiquement les modifications du casting'
        }
      ],
      'audio-production': [
        {
          key: 'defaultSampleRate',
          label: 'Fréquence d\'échantillonnage par défaut',
          type: 'select',
          defaultValue: 44100,
          description: 'Fréquence d\'échantillonnage pour les nouveaux projets audio',
          options: [
            { label: '22050 Hz (Voix)', value: 22050 },
            { label: '44100 Hz (CD)', value: 44100 },
            { label: '48000 Hz (DVD)', value: 48000 },
            { label: '96000 Hz (HD)', value: 96000 }
          ]
        },
        {
          key: 'maxAudioTracks',
          label: 'Pistes audio maximum',
          type: 'number',
          defaultValue: 16,
          description: 'Nombre maximum de pistes audio par projet',
          min: 1,
          max: 64,
          validation: (value: number) => value >= 1 && value <= 64
        },
        {
          key: 'enableAudioNormalization',
          label: 'Normalisation automatique',
          type: 'boolean',
          defaultValue: true,
          description: 'Normaliser automatiquement les niveaux audio'
        }
      ],
      'comic-to-sequence': [
        {
          key: 'defaultPanelDuration',
          label: 'Durée par défaut des panneaux',
          type: 'number',
          defaultValue: 3,
          description: 'Durée en secondes pour chaque panneau de BD converti',
          min: 1,
          max: 10,
          validation: (value: number) => value >= 1 && value <= 10
        },
        {
          key: 'autoDetectSpeechBubbles',
          label: 'Détection automatique des bulles',
          type: 'boolean',
          defaultValue: true,
          description: 'Détecter automatiquement les bulles de dialogue dans les images'
        },
        {
          key: 'enableOCR',
          label: 'Activer l\'OCR',
          type: 'boolean',
          defaultValue: false,
          description: 'Utiliser la reconnaissance optique de caractères pour extraire le texte'
        },
        {
          key: 'outputFormat',
          label: 'Format de sortie',
          type: 'select',
          defaultValue: 'sequence',
          description: 'Format de sortie pour la conversion',
          options: [
            { label: 'Séquence complète', value: 'sequence' },
            { label: 'Plans individuels', value: 'shots' },
            { label: 'Storyboard', value: 'storyboard' }
          ]
        }
      ],
      'transitions': [
        {
          key: 'defaultTransitionDuration',
          label: 'Durée par défaut des transitions',
          type: 'number',
          defaultValue: 0.5,
          description: 'Durée en secondes des transitions par défaut',
          min: 0.1,
          max: 5.0,
          validation: (value: number) => value >= 0.1 && value <= 5.0
        },
        {
          key: 'enableSmoothTransitions',
          label: 'Transitions fluides',
          type: 'boolean',
          defaultValue: true,
          description: 'Utiliser des transitions fluides pour un rendu professionnel'
        },
        {
          key: 'transitionLibrary',
          label: 'Bibliothèque de transitions',
          type: 'select',
          defaultValue: 'professional',
          description: 'Ensemble de transitions à utiliser',
          options: [
            { label: 'Basique', value: 'basic' },
            { label: 'Professionnel', value: 'professional' },
            { label: 'Cinématographique', value: 'cinematic' },
            { label: 'Créatif', value: 'creative' }
          ]
        }
      ],
      'plan-sequences': [
        {
          key: 'maxShotsPerSequence',
          label: 'Plans maximum par séquence',
          type: 'number',
          defaultValue: 20,
          description: 'Nombre maximum de plans dans une séquence',
          min: 1,
          max: 100,
          validation: (value: number) => value >= 1 && value <= 100
        },
        {
          key: 'autoCalculateDuration',
          label: 'Calcul automatique des durées',
          type: 'boolean',
          defaultValue: true,
          description: 'Calculer automatiquement la durée totale des séquences'
        },
        {
          key: 'enableSequenceTemplates',
          label: 'Templates de séquences',
          type: 'boolean',
          defaultValue: true,
          description: 'Utiliser des templates prédéfinis pour créer des séquences'
        },
        {
          key: 'sequenceNamingConvention',
          label: 'Convention de nommage',
          type: 'select',
          defaultValue: 'numbered',
          description: 'Format de nommage automatique des séquences',
          options: [
            { label: 'Numéroté (Sequence 1, 2, 3...)', value: 'numbered' },
            { label: 'Descriptif (Ouverture, Développement...)', value: 'descriptive' },
            { label: 'Personnalisé', value: 'custom' }
          ]
        }
      ]
    };
  }

  /**
   * Sauvegarde la configuration dans localStorage
   */
  private async saveConfig(): Promise<void> {
    try {
      localStorage.setItem('storycore_addon_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('[AddonManager] Failed to save addon config:', error);
    }
  }

  /**
   * Sauvegarde la configuration dans un fichier
   * @param filePath Chemin du fichier (par défaut: 'config/addons.json')
   */
  async saveToFile(filePath: string = 'config/addons.json'): Promise<void> {
    try {
      // Exporter la configuration actuelle
      const config = this.exportConfig();
      
      // Sauvegarder dans le fichier
      await fileSystemService.writeConfigFile(filePath, config);
      
      // Synchroniser avec localStorage
      await fileSystemService.syncWithLocalStorage(config);
      
      console.log(`[AddonManager] Configuration saved to ${filePath}`);
    } catch (error) {
      console.error('[AddonManager] Failed to save config to file:', error);
      throw error;
    }
  }

  /**
   * Charge la configuration depuis un fichier
   * @param filePath Chemin du fichier (par défaut: 'config/addons.json')
   */
  async loadFromFile(filePath: string = 'config/addons.json'): Promise<void> {
    try {
      // Lire la configuration depuis le fichier
      const config = await fileSystemService.readConfigFile(filePath);
      
      // Importer la configuration
      this.importConfig(config);
      
      // Synchroniser avec localStorage
      await fileSystemService.syncWithLocalStorage(config);
      
      console.log(`[AddonManager] Configuration loaded from ${filePath}`);
    } catch (error) {
      console.error('[AddonManager] Failed to load config from file:', error);
      throw error;
    }
  }

  /**
   * Synchronisation automatique entre localStorage et fichier
   */
  async autoSync(): Promise<void> {
    try {
      // Sauvegarder automatiquement dans le fichier
      await this.saveToFile();
    } catch (error) {
      console.warn('[AddonManager] Auto-sync failed:', error);
    }
  }
}

// Export de l'instance singleton
export const addonManager = AddonManager.getInstance();
