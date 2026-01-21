/**
 * AddonManager - Gestionnaire d'extensions (add-ons) pour StoryCore
 *
 * Permet d'activer/désactiver des add-ons et de gérer leur cycle de vie
 */

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
    console.log(`[AddonManager] Initialized with ${this.addons.size} add-ons`);
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

      console.log(`[AddonManager] Activated addon: ${addon.name} (${addonId})`);
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

      console.log(`[AddonManager] Deactivated addon: ${addon.name} (${addonId})`);
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
    // Pour les add-ons intégrés, charger dynamiquement
    if (addon.builtin) {
      try {
        switch (addon.id) {
          case 'casting':
            await import('@/addons/casting');
            break;
          // Ajouter d'autres add-ons intégrés ici
          default:
            console.warn(`[AddonManager] Unknown builtin addon: ${addon.id}`);
        }
      } catch (error) {
        throw new Error(`Failed to load builtin addon: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Pour les add-ons externes, charger depuis un système de plugins
      // TODO: Implémenter le système de plugins externes
      throw new Error('External add-ons not yet supported');
    }
  }

  /**
   * Décharge un add-on
   */
  private async unloadAddon(addon: AddonInfo): Promise<void> {
    // Nettoyer les ressources de l'add-on
    // TODO: Implémenter le nettoyage selon le type d'add-on
    console.log(`[AddonManager] Unloading addon: ${addon.name}`);
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
  }

  /**
   * Charge les add-ons externes
   */
  private async loadExternalAddons(): Promise<void> {
    // TODO: Implémenter le chargement des add-ons externes
    // Cela pourrait inclure :
    // - Scan d'un dossier d'add-ons
    // - Chargement de manifests JSON
    // - Validation des signatures
    // - Gestion des permissions
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
}

// Export de l'instance singleton
export const addonManager = AddonManager.getInstance();