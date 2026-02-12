/**
 * Story Object Types
 * 
 * Defines types for story objects (props, items, artifacts, etc.)
 */

export type ObjectType = 
  | 'prop'           // Physical props (furniture, tools, etc.)
  | 'weapon'         // Weapons and combat items
  | 'artifact'       // Magical or special artifacts
  | 'vehicle'        // Vehicles and transportation
  | 'technology'     // Tech items and gadgets
  | 'clothing'       // Clothing and accessories
  | 'consumable'     // Food, potions, etc.
  | 'document'       // Books, letters, maps
  | 'treasure'       // Valuable items
  | 'other';         // Other objects

export type ObjectRarity = 
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'legendary'
  | 'unique';

export type ObjectCondition =
  | 'pristine'
  | 'good'
  | 'worn'
  | 'damaged'
  | 'broken';

export interface ObjectProperties {
  weight?: string;           // e.g., "2 kg", "light", "heavy"
  size?: string;             // e.g., "small", "medium", "large"
  material?: string;         // e.g., "wood", "metal", "crystal"
  color?: string;            // Primary color
  durability?: ObjectCondition;
  magical?: boolean;         // Is it magical/special?
  value?: string;            // Monetary or symbolic value
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
  appearance: string;        // Physical description
  
  // Properties
  properties: ObjectProperties;
  
  // Abilities/Powers (if any)
  abilities?: ObjectAbility[];
  
  // Story context
  significance: string;      // Why is this object important?
  history?: string;          // Object's backstory
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
    appearance: '',
    properties: {},
    significance: '',
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
  artifact: 'Artifact',
  vehicle: 'Vehicle',
  technology: 'Technology',
  clothing: 'Clothing',
  consumable: 'Consumable',
  document: 'Document',
  treasure: 'Treasure',
  other: 'Other',
};

/**
 * Object rarity labels for UI
 */
export const OBJECT_RARITY_LABELS: Record<ObjectRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
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
