export interface World {
  world_id: string;
  name: string;
  description: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
  config: WorldConfig;
  characters: Character[];
  scenes: Scene[];
  lore: Lore[];
  locations: Location[];
  artifacts: Artifact[];
  status: WorldStatus;
  metadata: WorldMetadata;
}

export interface WorldConfig {
  genre: string;
  theme: string;
  tone: string;
  complexity_level: 'simple' | 'moderate' | 'complex';
  target_audience: string;
  world_scale: 'personal' | 'local' | 'regional' | 'global' | 'cosmic';
  magic_system?: MagicSystem;
  technology_level?: string;
}

export interface Character {
  character_id: string;
  name: string;
  age: string;
  gender: string;
  species: string;
  occupation: string;
  personality: string[];
  backstory: string;
  motivations: string[];
  relationships: CharacterRelationship[];
  abilities: string[];
  appearance: string;
  voice_description?: string;
  created_at: string;
  updated_at: string;
}

export interface CharacterRelationship {
  target_character_id: string;
  relationship_type: string;
  description: string;
  strength: number;
}

export interface Scene {
  scene_id: string;
  name: string;
  description: string;
  location_id: string;
  characters_present: string[];
  plot_points: string[];
  atmosphere: string;
  time_of_day: string;
  weather?: string;
  duration_estimate: number;
  sequence_order: number;
  created_at: string;
  updated_at: string;
}

export interface Location {
  location_id: string;
  name: string;
  type: string;
  description: string;
  coordinates?: GeographicCoordinates;
  inhabitants?: string[];
  landmarks: string[];
  atmosphere: string;
  strategic_importance?: string;
  created_at: string;
  updated_at: string;
}

export interface GeographicCoordinates {
  latitude: number;
  longitude: number;
  elevation?: number;
}

export interface Lore {
  lore_id: string;
  title: string;
  content: string;
  category: string;
  significance: string;
  related_entities: string[];
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  artifact_id: string;
  name: string;
  type: string;
  description: string;
  origin: string;
  powers?: string[];
  current_location?: string;
  owner?: string;
  significance: string;
  created_at: string;
  updated_at: string;
}

export interface MagicSystem {
  type: string;
  rules: string[];
  limitations: string[];
  sources: string[];
  rituals?: string[];
}

export interface WorldStatus {
  current_phase: string;
  validation_passed: boolean;
  last_validation_report_id?: string;
  completeness_percentage: number;
  ai_generated_content_count: number;
}

export interface WorldMetadata {
  author: string;
  tags: string[];
  version_history: VersionEntry[];
  ai_assistance_used: boolean;
  estimated_reading_time?: number;
}

export interface VersionEntry {
  version: string;
  timestamp: string;
  changes: string;
  author: string;
}

export interface WorldBuildRequest {
  base_prompt: string;
  genre: string;
  complexity_level: 'simple' | 'moderate' | 'complex';
  existing_world_data?: Partial<World>;
}

export interface WorldBuildResult {
  world: World;
  generation_metadata: GenerationMetadata;
  validation_report?: ValidationReport;
}

export interface GenerationMetadata {
  total_tokens_used: number;
  generation_time_ms: number;
  llm_calls_made: number;
  confidence_score: number;
  warnings?: string[];
}

export interface ValidationReport {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
  validated_at: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface PersistenceResult<T> {
  success: boolean;
  data?: T;
  error?: PersistenceError;
  metadata: PersistenceMetadata;
}

export interface PersistenceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PersistenceMetadata {
  operation_type: string;
  file_path: string;
  version_created?: string;
  backup_created?: boolean;
  timestamp: string;
}

export interface VersionInfo {
  version: string;
  timestamp: string;
  hash: string;
  changes_summary: string;
}

export class WorldBuilderError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WorldBuilderError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public severity: 'error' | 'warning' = 'error'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PersistenceError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string
  ) {
    super(message);
    this.name = 'PersistenceError';
  }
}