/**
 * Story Object Types
 * 
 * Defines types for story objects (props, items, artifacts, etc.)
 * Updated to support both narrative and game-like attributes.
 */

export type ObjectType =
  | 'prop'           // Physical props (furniture, tools, etc.)
  | 'weapon'         // Weapons and combat items
  | 'armor'          // Armor and protective gear
  | 'artifact'       // Magical or special artifacts
  | 'vehicle'        // Vehicles and transportation
  | 'technology'     // Tech items and gadgets
  | 'clothing'       // Clothing and accessories
  | 'consumable'     // Food, potions, etc.
  | 'document'       // Books, letters, maps
  | 'treasure'       // Valuable items
  | 'tool'           // General tools
  | 'magical'        // Purely magical items
  | 'quest'          // Quest-specific items
  | 'key'            // Keys and access items
  | 'other';         // Other objects

export type ObjectRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythical'
  | 'unique';

export type ObjectCondition =
  | 'pristine'
  | 'good'
  | 'worn'
  | 'damaged'
  | 'broken';

export interface ObjectProperties {
  weight?: string | number;  // e.g., "2 kg" or 2.0
  size?: string;             // e.g., "small", "medium", "large"
  material?: string;         // e.g., "wood", "metal", "crystal"
  color?: string;            // Primary color
  durability?: ObjectCondition;
  magical?: boolean;         // Is it magical/special?
  value?: string | number;   // Monetary or symbolic value
  origin?: string;           // Where it came from
}

export interface ObjectAbility {
  id: string;
  name: string;
  description: string;
  type: 'passive' | 'active' | 'triggered';
  cooldown?: string;
}

export interface StoryObject {
  id: string;
  name: string;
  type: ObjectType;
  rarity: ObjectRarity;
  description: string;
  appearance?: string;       // Physical description
  lore?: string;             // Backstory/Legend
  power?: number;            // Power level (0-100)

  // Properties
  properties: ObjectProperties;

  // Abilities/Powers
  abilities?: ObjectAbility[];
  abilityStrings?: string[]; // Simplified abilities for AI generation

  // Requirements
  requirements?: string;

  // Story context
  significance?: string;     // Why is this object important?
  history?: string;          // Alias for lore
  currentOwner?: string;     // Character ID who owns it
  location?: string;         // Where it's currently located

  // Relationships
  relatedCharacters?: string[];  // Character IDs
  relatedLocations?: string[];   // Location IDs
  relatedObjects?: string[];     // Other object IDs

  // Generation metadata
  imageUrl?: string;
  imagePrompt?: string;
  generatedBy?: 'user' | 'ai';

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Tags for organization
  tags?: string[];
}

/**
 * Create an empty object with default values
 */
export function createEmptyObject(): Partial<StoryObject> {
  return {
    name: '',
    type: 'prop',
    rarity: 'common',
    description: '',
    properties: {},
    abilities: [],
    tags: [],
    generatedBy: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Object type labels for UI
 */
export const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  prop: 'Prop / Item',
  weapon: 'Weapon',
  armor: 'Armor',
  artifact: 'Artifact',
  vehicle: 'Vehicle',
  technology: 'Technology',
  clothing: 'Clothing',
  consumable: 'Consumable',
  document: 'Document',
  treasure: 'Treasure',
  tool: 'Tool',
  magical: 'Magical Item',
  quest: 'Quest Item',
  key: 'Key / Access',
  other: 'Other',
};

/**
 * Object rarity labels for UI
 */
export const OBJECT_RARITY_LABELS: Record<ObjectRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythical: 'Mythical',
  unique: 'Unique',
};

/**
 * Object condition labels for UI
 */
export const OBJECT_CONDITION_LABELS: Record<ObjectCondition, string> = {
  pristine: 'Pristine',
  good: 'Good',
  worn: 'Worn',
  damaged: 'Damaged',
  broken: 'Broken',
};
