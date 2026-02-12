/**
 * Legacy Types - Types en cours de migration
 * 
 * Ce fichier contient les types `any` qui doivent être progressivement remplacés.
 * Chaque type ici est une étape de transition vers des types plus précis.
 * 
 * @module legacy
 * @version 1.0.0
 * @updated 2026-02-12
 * 
 * @使用方法 (Usage):
 * - Importer ces types temporairement en attendant la migration complète
 * - Ajouter un commentaire TODO avec la date de création
 * - Remplacer progressivement par des types spécifiques
 * 
 * // AVANT (à éviter)
 * function processData(data: unknown) { ... }
 * 
 * // APRÈS (migration progressive)
 * // TODO: 2026-02-12 - Remplacer par UserData ou spécifiques
 * function processData(data: LegacyAny) { ... }
 */

// ============================================================================
// LEGACY TYPE ALIASES
// Ces aliases sont temporaires - voir le tableau de migration ci-dessous
// ============================================================================

/** Type générique pour données API non encore typées - TODO: typer progressivement */
export type LegacyAny = any;

/** Type générique pour tableaux non encore typés - TODO: typer progressivement */
export type LegacyArray<T = unknown> = T[];

/** Type générique pour données JSON flexibles */
export type LegacyJson = Record<string, unknown>;

/** Type générique pour données de formulaire */
export type LegacyFormData = Record<string, unknown>;

/** Type générique pour données de configuration */
export type LegacyConfig = Record<string, unknown>;

/** Type générique pour métadonnées extensibles */
export type LegacyMetadata = Record<string, unknown>;

/** Type générique pour options de composant */
export type LegacyOptions = Array<{ label: string; value: string }>;

// ============================================================================
// TABLEAU DE MIGRATION - FILE PAR FILE
// Ce tableau documente les fichiers nécessitant une migration
// ============================================================================

/**
 * Fichiers prioritaires pour migration - Services (~270+ occurrences)
 * 
 * | Fichier | Occurrences | Priorité | Statut |
 * |---------|-------------|----------|--------|
 * | services/wizard/ValidationEngine.ts | 18 | Haute | En cours |
 * | services/FormAutoFill.ts | 12 | Haute | À faire |
 * | services/MetadataEnrichmentService.ts | 8 | Moyenne | À faire |
 * | services/storyGenerationService.ts | 6 | Moyenne | À faire |
 * | services/storyMethodologies.ts | 14 | Haute | À faire |
 * | services/DataValidator.ts | 22 | Haute | En cours |
 * | services/chatService.ts | 8 | Moyenne | À faire |
 * | services/aiWizardService.ts | 10 | Moyenne | À faire |
 * | services/aiCharacterService.ts | 6 | Moyenne | À faire |
 * | services/aiScriptAnalysisService.ts | 4 | Basse | À faire |
 * | services/aiColorGradingService.ts | 4 | Basse | À faire |
 * | services/aiAudioEnhancementService.ts | 6 | Basse | À faire |
 * | services/llmService.ts | 4 | Moyenne | À faire |
 * | services/ConfigurationStore.ts | 6 | Moyenne | À faire |
 * | services/LoggingService.ts | 6 | Basse | À faire |
 * | services/RelationshipManager.ts | 2 | Basse | À faire |
 * | services/PersistenceService.ts | 4 | Moyenne | À faire |
 * | services/eventEmitter.ts | 2 | Basse | À faire |
 * | services/characterEvents.ts | 4 | Basse | À faire |
 * | services/TemplateMarketplaceService.ts | 4 | Basse | À faire |
 * | services/SyncManager.ts | 4 | Moyenne | À faire |
 * | services/comfyuiService.ts | 4 | Moyenne | À faire |
 * | services/ImageGalleryService.ts | 6 | Basse | À faire |
 * | services/OfflineService.ts | 4 | Basse | À faire |
 * | services/ObjectsAIService.ts | 6 | Moyenne | À faire |
 * | services/LottieService.ts | 4 | Basse | À faire |
 * | services/dialogueService.ts | 6 | Moyenne | À faire |
 * | services/APIManager.ts | 10 | Haute | À faire |
 * | services/backendApiService.ts | 2 | Basse | À faire |
 * | services/automationService.ts | 2 | Basse | À faire |
 * | services/GenerationHistoryService.ts | 4 | Basse | À faire |
 * | services/ttsService.ts | 2 | Basse | À faire |
 * | services/qwenTTSProvider.ts | 2 | Basse | À faire |
 * | services/sapiTTSProvider.ts | 2 | Basse | À faire |
 * | services/ollamaConfig.ts | 2 | Basse | À faire |
 * | services/localModelService.ts | 2 | Basse | À faire |
 * | services/resultService.ts | 2 | Basse | À faire |
 * | services/sequencePlanService.ts | 4 | Moyenne | À faire |
 * | services/sequenceGenerationService.ts | 2 | Basse | À faire |
 * | services/StoryWeaver.ts | 4 | Moyenne | À faire |
 * | services/StoryReviewer.ts | 2 | Basse | À faire |
 * | services/storyExportService.ts | 2 | Basse | À faire |
 * | services/settingsPropagation.ts | 2 | Basse | À faire |
 * | services/userEditTracking.ts | 6 | Moyenne | À faire |
 * | services/videoEditorAPI.ts | 4 | Basse | À faire |
 * | services/Threejs/ShotSceneLinker.ts | 4 | Basse | À faire |
 * | services/FileSystemService.ts | 6 | Moyenne | À faire |
 * | services/draftStorage.ts | 4 | Basse | À faire |
 * | services/PersistenceCache.ts | 2 | Basse | À faire |
 * | services/AddonManager.ts | 6 | Moyenne | À faire |
 * | services/ConversationExportService.ts | 4 | Basse | À faire |
 * | services/gridEditor/ConfigurationExportImport.ts | 6 | Moyenne | À faire |
 * | services/gridEditor/VersionControlService.ts | 4 | Basse | À faire |
 * | services/gridEditor/MemoryManager.ts | 2 | Basse | À faire |
 * | services/gridEditor/GridAPIService.ts | 2 | Basse | À faire |
 * | services/gridEditor/PresetStyleExtractor.ts | 2 | Basse | À faire |
 * | services/gridEditor/ImportService.ts | 2 | Basse | À faire |
 * | services/wizard/OllamaClient.ts | 2 | Basse | À faire |
 * | services/wizard/stateValidationService.ts | 6 | Moyenne | À faire |
 * | services/wizard/types.ts | 2 | Basse | À faire |
 * | services/wizard/WizardService.ts | 4 | Moyenne | À faire |
 * | services/referenceInheritanceService.ts | 4 | Basse | À faire |
 * | services/batchOperations/WorkerPool.ts | 4 | Basse | À faire |
 * | services/assets/AssetService.ts | 2 | Basse | À faire |
 * | services/responsive/LayoutPreferences.ts | 2 | Basse | À faire |
 * | services/menuBar/MenuConfigValidator.ts | 2 | Basse | À faire |
 */

/**
 * Fichiers prioritaires pour migration - Stores (~9 occurrences)
 * 
 * | Fichier | Occurrences | Priorité | Statut |
 * |---------|-------------|----------|--------|
 * | stores/worldBuilderStore.ts | 2 | Moyenne | À faire |
 * | stores/useAppStore.ts | 2 | Haute | À faire |
 * | stores/undoRedoStore.ts | 3 | Moyenne | À faire |
 * | stores/gridEditorStore.ts | 2 | Moyenne | À faire |
 * | stores/addonStore.ts | 1 | Basse | À faire |
 * | stores/wizard/wizardStore.ts | 1 | Basse | À faire |
 */

/**
 * Fichiers prioritaires pour migration - Hooks (~43 occurrences)
 * 
 * | Fichier | Occurrences | Priorité | Statut |
 * |---------|-------------|----------|--------|
 * | hooks/useFormValidation.ts | 10 | Haute | En cours |
 * | hooks/useCharacterManager.ts | 6 | Haute | À faire |
 * | hooks/useCharacterPersistence.ts | 4 | Moyenne | À faire |
 * | hooks/useCharacterPersistenceOptimized.ts | 2 | Basse | À faire |
 * | hooks/useWizardCompletion.ts | 4 | Moyenne | À faire |
 * | hooks/useLandingPage.ts | 4 | Moyenne | À faire |
 * | hooks/useKeyframes.ts | 2 | Basse | À faire |
 * | hooks/useLayoutPersistence.ts | 2 | Basse | À faire |
 * | hooks/useProgressiveImageLoading.ts | 2 | Basse | À faire |
 * | hooks/useReducedMotion.ts | 2 | Basse | À faire |
 */

/**
 * Fichiers prioritaires pour migration - Types (~30 occurrences)
 * 
 * | Fichier | Occurrences | Priorité | Statut |
 * |---------|-------------|----------|--------|
 * | types/wizard.ts | 4 | Haute | À faire |
 * | types/video-editor.ts | 1 | Basse | À faire |
 * | types/storyMethodology.ts | 3 | Moyenne | À faire |
 * | types/story.ts | 6 | Haute | À faire |
 * | types/shot.ts | 1 | Basse | À faire |
 * | types/menuConfig.ts | 6 | Moyenne | À faire |
 * | types/menuBarState.ts | 3 | Moyenne | À faire |
 * | types/index.ts | 1 | Basse | À faire |
 * | types/gridEditorAdvanced.ts | 3 | Moyenne | À faire |
 * | types/electron.ts | 10 | Haute | À faire |
 * | types/effect.ts | 2 | Basse | À faire |
 * | types/configuration.ts | 4 | Moyenne | À faire |
 * | types/comfyui-instance.ts | 1 | Basse | À faire |
 * | types/asset.ts | 2 | Basse | À faire |
 * | types/addons.d.ts | 1 | Basse | À faire |
 */

// ============================================================================
// UTILITAIRES DE MIGRATION
// ============================================================================

/**
 * Helper pour progressivement remplacer `any` par des types spécifiques
 * 
 * @example
 * // AVANT
 * function handleData(data: unknown) { ... }
 * 
 * // APRÈS (avec migration progressive)
 * // TODO: 2026-02-12 - Remplacer par UserData ou StoryData
 * function handleData(data: LegacyAny) { ... }
 */

/**
 * Fonction de conversion temporaire pour compatibilité
 * @deprecated Utiliser des types spécifiques directement
 */
export function toLegacy<T>(value: T): T {
  return value;
}

/**
 * Fonction générique pour typer des réponses API
 * @deprecated Utiliser ApiResponse<T> directement
 */
export function createLegacyApiResponse<T>(data: T): { data: T; status: number } {
  return { data, status: 200 };
}

/**
 * Fonction pour créer des métadonnées typées
 * @deprecated Utiliser Dictionary<T> ou Metadata directement
 */
export function createLegacyMetadata<T extends Record<string, unknown>>(data: T): T {
  return data;
}

// ============================================================================
// TYPES SPÉCIFIQUES EN COURS DE CRÉATION
// Ces types sont des placeholders en attente d'être finalisés
// ============================================================================

/** Placeholder pour CharacterData - TODO: Créer le type complet */
export interface LegacyCharacterData {
  id: string;
  name: string;
  // TODO: Ajouter les autres propriétés
}

/** Placeholder pour LocationData - TODO: Créer le type complet */
export interface LegacyLocationData {
  id: string;
  name: string;
  // TODO: Ajouter les autres propriétés
}

/** Placeholder pour StoryData - TODO: Créer le type complet */
export interface LegacyStoryData {
  id: string;
  title: string;
  // TODO: Ajouter les autres propriétés
}

/** Placeholder pour ProjectData - TODO: Créer le type complet */
export interface LegacyProjectData {
  id: string;
  name: string;
  // TODO: Ajouter les autres propriétés
}

/** Placeholder pour WizardData - TODO: Créer le type complet */
export interface LegacyWizardData {
  id: string;
  type: string;
  // TODO: Ajouter les autres propriétés
}

/** Placeholder pour ValidationResult - TODO: Créer le type complet */
export interface LegacyValidationResult {
  isValid: boolean;
  errors: string[];
  // TODO: Ajouter les autres propriétés
}

/** Placeholder pour FormSubmission - TODO: Créer le type complet */
export interface LegacyFormSubmission {
  data: Record<string, unknown>;
  // TODO: Ajouter les autres propriétés
}

// ============================================================================
// NOTES DE MIGRATION
// ============================================================================

/**
 * Stratégie de migration recommandée:
 * 
 * 1. PHASE 1 (Haute priorité - 2 semaines)
 *    - Services de validation (ValidationEngine, DataValidator)
 *    - Services de génération (storyGeneration, storyMethodologies)
 *    - Stores principaux (useAppStore)
 * 
 * 2. PHASE 2 (Priorité moyenne - 4 semaines)
 *    - Services API (APIManager, backendApiService)
 *    - Services wizard (WizardService, stateValidationService)
 *    - Hooks de formulaire (useFormValidation, useCharacterManager)
 *    - Types electron.ts
 * 
 * 3. PHASE 3 (Basse priorité - 6 semaines)
 *    - Services de support (LoggingService, TemplateMarketplaceService)
 *    - Services AI (aiCharacterService, aiWizardService)
 *    - Components individuels
 * 
 * 4. PHASE 4 (Finalisation - continue)
 *    - Révision des types restants
 *    - Configuration TypeScript stricte
 *    - Tests de type
 */

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Pas d'export par défaut pour éviter les conflits
};

