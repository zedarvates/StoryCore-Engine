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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * | types/electron.ts | 10 | Haute | Terminé |
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

/**
 * Complete UserData interface for user information
 * Replaces generic types with strict typing
 */
export interface UserData {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
  preferences: UserPreferences;
  subscription?: SubscriptionInfo;
  projects: string[];
  role: 'user' | 'admin' | 'guest';
  language: 'fr' | 'en' | 'es' | 'de';
  theme: 'light' | 'dark' | 'system';
}

export interface UserPreferences {
  autoSave: boolean;
  autoSaveInterval: number;
  defaultVisualStyle?: string;
  defaultAudioStyle?: string;
  gridEditorPreferences?: GridEditorPreferences;
  notificationSettings: NotificationSettings;
}

export interface GridEditorPreferences {
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
  showRulers: boolean;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  projectUpdates: boolean;
  marketingEmails: boolean;
}

export interface SubscriptionInfo {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired';
  expiresAt?: number;
  features: string[];
}

/**
 * Complete CharacterData interface for character information
 * Based on Character type from character.ts
 */
export interface CharacterData {
  character_id: string;
  name: string;
  creation_method: 'wizard' | 'auto_generated' | 'manual' | 'ai_vision';
  creation_timestamp: number;
  last_modified?: number;
  version: string;
  visual_identity: VisualIdentityData;
  personality: PersonalityData;
  background: BackgroundData;
  relationships: CharacterRelationshipData[];
  role: RoleData;
  archetype?: string;
  goal?: string;
  flaw_sympathy?: string;
  daily_details?: DailyDetailsData;
  prompts?: string[];
  material_color?: [number, number, number];
  ai_coherence_data?: unknown;
}

export interface VisualIdentityData {
  hair_color: string;
  hair_style: string;
  hair_length: string;
  eye_color: string;
  eye_shape: string;
  skin_tone: string;
  facial_structure: string;
  distinctive_features: string[];
  age_range: string;
  gender: 'male' | 'female' | 'non-binary' | 'other' | 'unspecified';
  height: string;
  build: string;
  posture: string;
  clothing_style: string;
  color_palette: string[];
  generated_portrait?: string;
  reference_images: ReferenceImageData[];
  reference_sheet_images: SheetImageData[];
}

export interface ReferenceImageData {
  id: string;
  url: string;
  type: 'reference' | 'reference_sheet';
  panel?: string;
  created_at: number;
  filename?: string;
}

export interface SheetImageData {
  id: string;
  url: string;
  panel: string;
  created_at: number;
  filename?: string;
}

export interface PersonalityData {
  traits: string[];
  values: string[];
  fears: string[];
  desires: string[];
  flaws: string[];
  strengths: string[];
  temperament: string;
  communication_style: string;
  goal?: string;
  flaw_sympathy?: string;
  daily_details?: DailyDetailsData;
}

export interface DailyDetailsData {
  habits?: string[];
  diet?: string;
  clothing_style?: string;
  [key: string]: unknown;
}

export interface BackgroundData {
  origin: string;
  occupation: string;
  education: string;
  family: string;
  significant_events: string[];
  current_situation: string;
  backstory: string;
}

export interface CharacterRelationshipData {
  character_id: string;
  character_name: string;
  relationship_type: string;
  description: string;
  dynamic: string;
}

export interface RoleData {
  archetype: string;
  narrative_function: string;
  character_arc: string;
}

/**
 * Complete LocationData interface for location information
 * Based on Location type from location.ts
 */
export interface LocationData {
  location_id: string;
  world_location_id?: string;
  world_id?: string;
  name: string;
  creation_method: 'wizard' | 'auto_generated' | 'manual' | 'ai_vision';
  creation_timestamp: number;
  last_modified?: number;
  version: string;
  location_type: 'exterior' | 'interior';
  texture_direction: 'inward' | 'outward';
  metadata: LocationMetadataData;
  cube_textures: CubeTextureMappingData;
  prompts?: string[];
  skybox_config?: SkyBoxConfigData;
  placed_assets: PlacedAssetData[];
  scene_transform?: Transform3DData;
  is_world_derived: boolean;
  world_snapshot?: WorldLocationSnapshotData;
}

export interface LocationMetadataData {
  description: string;
  atmosphere: string;
  significance?: string;
  time_period?: string;
  genre_tags: string[];
  color_palette?: string[];
  key_features?: string[];
  address?: string;
  coordinates?: string;
  owner?: string;
  purpose?: string;
  secrets?: string;
  importance?: 'high' | 'medium' | 'low';
  accessibility?: 'public' | 'private' | 'restricted';
  thumbnail_path?: string;
  tile_image_path?: string;
}

export interface CubeTextureMappingData {
  front?: CubeFaceTextureData;
  back?: CubeFaceTextureData;
  left?: CubeFaceTextureData;
  right?: CubeFaceTextureData;
  top?: CubeFaceTextureData;
  bottom?: CubeFaceTextureData;
}

export interface CubeFaceTextureData {
  id: string;
  face: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
  image_path: string;
  generation_params: ImageGenerationParamsData;
  generated_at: number;
  workflow_url?: string;
}

export interface ImageGenerationParamsData {
  prompt: string;
  negative_prompt?: string;
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  seed: number;
  model?: string;
  sampler?: string;
  scheduler?: string;
}

export interface SkyBoxConfigData {
  type: 'procedural' | 'image_based' | 'none';
  skybox_type?: SkyboxTypeData;
  shot_type?: ShotTypeData;
  colors?: {
    top: string;
    horizon: string;
    bottom: string;
  };
  texture_path?: string;
  time_of_day?: number;
  light_position?: { x: number; y: number; z: number };
  intensity?: number;
  weather?: WeatherConditionData;
  custom_prompt?: string;
  shot_requirements?: ShotRequirementsData;
}

export type SkyboxTypeData = 'clear_day' | 'clear_night' | 'overcast' | 'sunset' | 'sunrise' | 'storm' | 'foggy' | 'custom';
export type ShotTypeData = 'plan_sequence' | 'choc' | 'standard';
export type WeatherConditionData = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'storm' | 'fog' | 'snow';

export interface ShotRequirementsData {
  full_360_required?: boolean;
  horizon_continuity?: boolean;
  time_preservation?: boolean;
  dramatic_lighting?: boolean;
  stylized_elements?: boolean;
}

export interface PlacedAssetData {
  id: string;
  asset_id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  visible: boolean;
}

export interface Transform3DData {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface WorldLocationSnapshotData {
  world_location_id: string;
  world_id: string;
  world_name: string;
  world_type: string;
  world_description: string;
  significance?: string;
  snapshot_at: number;
}

/**
 * Complete StoryData interface for story information
 * Based on Story type from story.ts
 */
export interface StoryData {
  id: string;
  title: string;
  content: string;
  summary: string;
  genre: string[];
  tone: string[];
  length: 'short' | 'medium' | 'long' | 'scene' | 'short_story' | 'novella' | 'novel' | 'epic_novel';
  charactersUsed: CharacterReferenceData[];
  locationsUsed: LocationReferenceData[];
  autoGeneratedElements: AutoGeneratedElementData[];
  createdAt: number;
  updatedAt: number;
  version: number;
  worldId?: string;
  acts?: StoryActData[];
  logline?: string;
  parts?: StoryPartData[];
  fileFormat?: 'md' | 'txt';
  methodologyState?: unknown;
  productionMode?: ProductionModeData;
  critique?: string;
}

export type ProductionModeData = 'fiction' | 'documentary' | 'interview' | 'music_video' | 'social_media' | 'cinematic' | 'recap' | 'influencer' | 'maker' | 'scientific_review' | 'historical_review' | 'top_tier_list' | 'faith_spirituality' | 'game_review' | 'tech_review' | 'finance_review' | 'masterclass' | 'real_estate' | 'product_hype' | 'legal_recon' | 'asmr' | 'meditation' | 'experimental' | 'true_crime' | 'sports_highlight' | 'gardening' | 'renovation';

export interface CharacterReferenceData {
  id: string;
  name: string;
  role: string;
}

export interface LocationReferenceData {
  id: string;
  name: string;
  significance: string;
  type?: string;
}

export interface AutoGeneratedElementData {
  type: 'character' | 'location';
  id: string;
  name: string;
  generatedAt: number;
}

export interface StoryActData {
  id: string;
  title: string;
  summary: string;
  order: number;
}

export interface StoryPartData {
  id: string;
  type: 'intro' | 'chapter' | 'ending';
  title: string;
  content: string;
  summary: string;
  reviewScore?: ReviewScoreData;
  order: number;
  metadata?: StoryFileMetadataData;
}

export interface ReviewScoreData {
  tension: number;
  drama: number;
  sense: number;
  emotion: number;
  overall: number;
}

export interface StoryFileMetadataData {
  title: string;
  type: 'index' | 'intro' | 'chapter' | 'ending' | 'summary';
  order?: number;
  part_number?: number;
  total_parts?: number;
  genre?: string[];
  tone?: string[];
  characters?: string[];
  locations?: string[];
  previous_summary?: string;
  next_part?: string;
  prev_part?: string;
  generated_at?: string;
  review_score?: ReviewScoreData;
}

/**
 * Complete ProjectData interface for StoryCore projects
 * Based on ProjectData type from project.ts
 */
export interface ProjectData {
  schema_version: string;
  project_name: string;
  capabilities: ProjectCapabilitiesData;
  generation_status: GenerationStatusData;
  storyboard?: unknown[];
  assets?: unknown[];
  characters?: CharacterReferenceData[];
  scenes?: SceneReferenceData[];
  world?: WorldDefinitionData;
  global_resume?: string;
  projectSetup?: ProjectSetupData;
  moodboard?: unknown;
  metadata?: Record<string, unknown>;
}

export interface ProjectCapabilitiesData {
  grid_generation: boolean;
  promotion_engine: boolean;
  qa_engine: boolean;
  autofix_engine: boolean;
  wizard_generation?: boolean;
}

export interface GenerationStatusData {
  grid: 'pending' | 'done' | 'failed' | 'passed';
  promotion: 'pending' | 'done' | 'failed' | 'passed';
  wizard?: 'pending' | 'done' | 'failed' | 'passed';
}

export interface SceneReferenceData {
  id: string;
  name: string;
  shot_ids: string[];
  created_at: string;
}

export interface WorldDefinitionData {
  id: string;
  name: string;
  setting: string;
  time_period: string;
  locations: WorldLocationData[];
  rules: string[];
  lore: string;
  created_at: string;
  metadata: WorldMetadataData;
}

export interface WorldLocationData {
  name: string;
  description: string;
  visual_reference?: string;
}

export interface WorldMetadataData {
  generation_prompt: string;
  used_in_wizards: string[];
}

export interface ProjectSetupData {
  projectName?: string;
  projectDescription?: string;
  genre?: string[];
  tone?: string[];
  productionMode?: string;
  targetAudience?: string;
  estimatedDuration?: string;
  visualStyle?: string;
  audioStyle?: string;
  constraints?: ProjectConstraintData[];
  tags?: string[];
  seoMetadata?: SeoMetadataData;
}

export interface ProjectConstraintData {
  id: string;
  category: 'technical' | 'creative' | 'budget' | 'timeline';
  constraint: string;
  impact: string;
}

export interface SeoMetadataData {
  searchTitle?: string;
  searchDescription?: string;
  canonicalUrl?: string;
}

/**
 * Complete WizardData interface for wizard information
 * Based on wizard types from wizard.ts
 */
export interface WizardData {
  id: string;
  type: WizardTypeData;
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  isValid: boolean;
  data: WizardStepData;
  createdAt: number;
  updatedAt: number;
  language: SupportedLanguageData;
  draft?: WizardDraftData;
  validationErrors: ValidationErrorData[];
}

export type WizardTypeData = 'world' | 'character' | 'storyteller' | 'dialogue-writer' | 'scene-generator' | 'storyboard-creator' | 'style-transfer' | 'sequence-plan' | 'shot';
export type SupportedLanguageData = 'fr' | 'en' | 'es' | 'de';

export interface WizardStepData {
  [key: string]: unknown;
}

export interface WizardDraftData {
  data: WizardStepData;
  timestamp: number;
  language: SupportedLanguageData;
  stepIndex: number;
}

export interface ValidationErrorData {
  field: string;
  message: string;
  code?: string;
}

/**
 * Complete ValidationResult interface for form validation
 * Based on ValidationResult from project.ts
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fieldErrors?: FieldErrorData[];
  timestamp?: number;
  validatedBy?: string;
}

export interface FieldErrorData {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

/**
 * Complete FormSubmission interface for form submissions
 * Robust interface for complete form handling
 */
export interface FormSubmission {
  id: string;
  formId: string;
  data: FormFieldData[];
  submittedAt: number;
  status: SubmissionStatusData;
  validationResult?: ValidationResult;
  metadata?: SubmissionMetadataData;
  attachments?: AttachmentData[];
}

export interface FormFieldData {
  name: string;
  value: unknown;
  type: FieldTypeData;
  isValid: boolean;
  error?: string;
}

export type FieldTypeData = 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'file' | 'textarea' | 'checkbox' | 'radio' | 'hidden';
export type SubmissionStatusData = 'pending' | 'validating' | 'validated' | 'submitted' | 'failed' | 'cancelled';

export interface SubmissionMetadataData {
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  sessionId?: string;
  userId?: string;
}

export interface AttachmentData {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: number;
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

