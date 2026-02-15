// ============================================================================
// Location Logic Loop Types
// Ref: "Writing Blueprint That Turns Generic Settings Into Compelling Worlds"
// Framework: Function → Constraints → Culture → Reputation → Emergent Details
// ============================================================================

/**
 * Primary function types for locations
 */
export type LocationFunctionType = 
  | 'economic'    
  | 'defensive'   
  | 'social'      
  | 'logistical';  

/**
 * Sub-function types for more specific categorization
 */
export type LocationSubFunction =
  // Economic sub-functions
  | 'trade_hub'
  | 'mining'
  | 'fishing'
  | 'agricultural'
  | 'manufacturing'
  // Defensive sub-functions
  | 'fortress'
  | 'border_post'
  | 'watchtower'
  | 'sanctuary'
  // Social/Religious sub-functions
  | 'pilgrimage'
  | 'university'
  | 'resistance'
  | 'royal_court'
  // Logistical sub-functions
  | 'waystation'
  | 'space_station'
  | 'caravan_stop'
  | 'communication';

/**
 * Types of constraints a location faces
 */
export type ConstraintType =
  | 'environmental'      
  | 'resource_scarcity'  
  | 'external_threat';   

/**
 * Severity level for constraints
 */
export type ConstraintSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Individual constraint on a location
 */
export interface LocationConstraint {
  type: ConstraintType;
  description: string;
  severity: ConstraintSeverity;
  impact_on_function: string;
}

/**
 * All constraints for a location
 */
export interface LocationConstraints {
  primary_constraints: LocationConstraint[];
  environmental_pressures: string[];
  resource_scarcities: string[];
  external_threats: string[];
}

/**
 * Cultural adaptation types
 */
export type CulturalAdaptationType =
  | 'architecture'
  | 'social_structure'
  | 'religion'
  | 'laws'
  | 'technology'
  | 'traditions'
  | 'fashion'
  | 'cuisine'
  | 'artisanry';

/**
 * Culture details for a location
 */
export interface LocationCulture {
  behaviors: string[];
  traditions: string[];
  laws: string[];
  technologies: string[];
  social_hierarchy: string;
  valued_skills: string[];
  revered_professions: string[];
  worldview: string;
  attitude_towards_danger: string;
  relationship_with_environment: string;
}

/**
 * Reputation details for a location
 */
export interface LocationReputation {
  external_reputation: string;
  rumored_wealth: string;
  perceived_danger: string;
  reality_vs_rumor: string;
  what_locals_know: string;
  pride_shame: string;
  how_locals_handle_it: string;
  who_comes_here: string[];
  who_avoids: string[];
}

/**
 * Emergent details for a location
 */
export interface EmergentDetails {
  name_origin: string;
  name_meaning: string;
  historical_names: string[];
  landmarks: Array<{
    name: string;
    description: string;
    significance: string;
  }>;
  notable_buildings: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  layout_principle: string;
  key_geographical_features: string[];
  defensive_features: string[];
  architectural_style: string;
  color_palette: string[];
  common_materials: string[];
}

/**
 * Complete Location Logic Loop data structure
 */
export interface LocationLogicLoop {
  function: {
    primary: LocationFunctionType;
    sub: LocationSubFunction;
    description: string;
  };
  constraints: LocationConstraints;
  culture: LocationCulture;
  reputation: LocationReputation;
  emergent_details: EmergentDetails;
  story_hooks: string[];
}

/**
 * Request for generating a location using Location Logic Loop
 */
export interface LogicLoopGenerationRequest {
  name: string;
  description: string;
  genre: string;
  tone: string;
  function?: LocationFunctionType;
  context?: string;
}

/**
 * Response from location generation
 */
export interface LogicLoopLocationResponse {
  name: string;
  description: string;
  function: LocationLogicLoop['function'];
  constraints: LocationConstraints;
  culture: LocationCulture;
  reputation: LocationReputation;
  emergent_details: EmergentDetails;
  story_hooks: string[];
  generated_at: string;
}

/**
 * Function options for UI display
 */
export interface FunctionOption {
  id: LocationFunctionType;
  name: string;
  description: string;
  sub_functions: Array<{
    id: LocationSubFunction;
    name: string;
    description: string;
  }>;
}

/**
 * Constraint template for quick setup
 */
export interface ConstraintTemplate {
  type: ConstraintType;
  severity: ConstraintSeverity;
  description: string;
  impact: string;
}

/**
 * Framework information for display
 */
export interface FrameworkInfo {
  framework: string;
  source: string;
  description: string;
  layers: Array<{
    name: string;
    question: string;
    options?: string[];
    types?: string[];
    aspects?: string[];
    importance: string;
  }>;
  key_principle: string;
}

/**
 * Example location for reference
 */
export interface ExampleLocation {
  name: string;
  description: string;
  genre: string;
  tone: string;
  function: {
    primary: LocationFunctionType;
    sub: string;
    description: string;
  };
  constraints: Array<{
    type: ConstraintType;
    severity: ConstraintSeverity;
    description: string;
    impact_on_function: string;
  }>;
  culture: LocationCulture;
  reputation: LocationReputation;
  emergent_details: EmergentDetails;
  story_hooks: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the function options for the Location Logic Loop
 */
export function getFunctionOptions(): FunctionOption[] {
  return [
    {
      id: 'economic',
      name: 'Economic',
      description: 'Trade hub, resource extraction, market',
      sub_functions: [
        { id: 'trade_hub', name: 'Trade Hub', description: 'Crossroads of commerce' },
        { id: 'mining', name: 'Mining', description: 'Resource extraction' },
        { id: 'fishing', name: 'Fishing', description: 'Maritime resources' },
        { id: 'agricultural', name: 'Agricultural', description: 'Farming region' },
        { id: 'manufacturing', name: 'Manufacturing', description: 'Production center' },
      ],
    },
    {
      id: 'defensive',
      name: 'Defensive',
      description: 'Fortress, garrison, watchtower',
      sub_functions: [
        { id: 'fortress', name: 'Fortress', description: 'Impregnable stronghold' },
        { id: 'border_post', name: 'Border Post', description: 'Frontier garrison' },
        { id: 'watchtower', name: 'Watchtower', description: 'Surveillance outpost' },
        { id: 'sanctuary', name: 'Sanctuary', description: 'Protected refuge' },
      ],
    },
    {
      id: 'social',
      name: 'Social/Religious',
      description: 'Pilgrimage site, university, sanctuary',
      sub_functions: [
        { id: 'pilgrimage', name: 'Pilgrimage Site', description: 'Holy site' },
        { id: 'university', name: 'University', description: 'Knowledge center' },
        { id: 'resistance', name: 'Resistance', description: 'Underground headquarters' },
        { id: 'royal_court', name: 'Royal Court', description: 'Political center' },
      ],
    },
    {
      id: 'logistical',
      name: 'Logistical',
      description: 'Way station, refueling depot, resupply',
      sub_functions: [
        { id: 'waystation', name: 'Way Station', description: 'Army resupply' },
        { id: 'space_station', name: 'Space Station', description: 'Space refueling' },
        { id: 'caravan_stop', name: 'Caravan Stop', description: 'Trade route rest point' },
        { id: 'communication', name: 'Communication Hub', description: 'Message relay' },
      ],
    },
  ];
}

/**
 * Get the constraint types for UI display
 */
export function getConstraintTypes(): Array<{ id: ConstraintType; name: string; examples: string[] }> {
  return [
    { id: 'environmental', name: 'Environmental', examples: ['Weather', 'Terrain', 'Natural disasters'] },
    { id: 'resource_scarcity', name: 'Resource Scarcity', examples: ['No timber', 'No water', 'No food'] },
    { id: 'external_threat', name: 'External Threats', examples: ['Enemies', 'Monsters', 'Rivals'] },
  ];
}

/**
 * Create an empty Location Logic Loop
 */
export function createEmptyLogicLoop(): Partial<LocationLogicLoop> {
  return {
    function: {
      primary: 'economic',
      sub: 'trade_hub',
      description: '',
    },
    constraints: {
      primary_constraints: [],
      environmental_pressures: [],
      resource_scarcities: [],
      external_threats: [],
    },
    culture: {
      behaviors: [],
      traditions: [],
      laws: [],
      technologies: [],
      social_hierarchy: '',
      valued_skills: [],
      revered_professions: [],
      worldview: '',
      attitude_towards_danger: '',
      relationship_with_environment: '',
    },
    reputation: {
      external_reputation: '',
      rumored_wealth: '',
      perceived_danger: '',
      reality_vs_rumor: '',
      what_locals_know: '',
      pride_shame: '',
      how_locals_handle_it: '',
      who_comes_here: [],
      who_avoids: [],
    },
    emergent_details: {
      name_origin: '',
      name_meaning: '',
      historical_names: [],
      landmarks: [],
      notable_buildings: [],
      layout_principle: '',
      key_geographical_features: [],
      defensive_features: [],
      architectural_style: '',
      color_palette: [],
      common_materials: [],
    },
    story_hooks: [],
  };
}

