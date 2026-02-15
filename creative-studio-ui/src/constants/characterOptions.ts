/**
 * Shared character options constants
 * 
 * This file centralizes all character-related dropdown options to ensure
 * consistency between the CharacterEditor (dashboard tile) and CharacterWizard.
 * 
 * @see CharacterEditor.tsx - uses these for editing existing characters
 * @see CharacterWizard.tsx - uses these for creating new characters
 */

/**
 * Character archetypes based on narrative theory
 * Combines options from both Editor and Wizard with comprehensive coverage
 */
export const CHARACTER_ARCHETYPES = [
  'Protagonist',
  'Antagonist',
  'Mentor',
  'Sidekick',
  'Ally',
  'Love Interest',
  'Guardian',
  'Threshold Guardian',
  'Trickster',
  'Shapeshifter',
  'Shadow',
  'Herald',
] as const;

export type CharacterArchetype = typeof CHARACTER_ARCHETYPES[number];

/**
 * Age range options for characters
 * Uses the more granular Wizard breakdown for better precision
 */
export const AGE_RANGES = [
  'Child (0-12)',
  'Teenager (13-19)',
  'Young Adult (20-29)',
  'Adult (30-49)',
  'Middle-Aged (50-64)',
  'Senior (65+)',
  'Ageless/Unknown',
] as const;

export type AgeRange = typeof AGE_RANGES[number];

/**
 * Gender options for character identity
 * Includes standard options plus 'Other' for custom input (aliens, fantasy, etc.)
 */
export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Non-binary',
  'Other',
] as const;

export type GenderOption = typeof GENDER_OPTIONS[number];

/**
 * Hair color suggestions for autocomplete/reference
 */
export const HAIR_COLORS = [
  'Black',
  'Brown',
  'Blonde',
  'Red',
  'Auburn',
  'Brunette',
  'Gray',
  'White',
  'Silver',
  'Platinum',
  'Blue',
  'Green',
  'Purple',
  'Pink',
  'Multi-colored',
] as const;

/**
 * Eye color suggestions
 */
export const EYE_COLORS = [
  'Brown',
  'Blue',
  'Green',
  'Hazel',
  'Gray',
  'Amber',
  'Violet',
  'Red',
  'Heterochromia',
] as const;

/**
 * Skin tone suggestions
 */
export const SKIN_TONES = [
  'Fair',
  'Pale',
  'Light',
  'Medium',
  'Olive',
  'Tan',
  'Brown',
  'Dark Brown',
  'Black',
] as const;

/**
 * Body build options
 */
export const BODY_BUILDS = [
  'Slim',
  'Athletic',
  'Muscular',
  'Average',
  'Heavy',
  'Petite',
  'Tall and Lean',
  'Stocky',
] as const;

/**
 * Height categories
 */
export const HEIGHT_CATEGORIES = [
  'Very Short',
  'Short',
  'Average',
  'Tall',
  'Very Tall',
] as const;

/**
 * Posture options
 */
export const POSTURE_OPTIONS = [
  'Upright',
  'Confident',
  'Slouched',
  'Relaxed',
  'Rigid',
  'Graceful',
  'Stooped',
] as const;

/**
 * Clothing style suggestions
 */
export const CLOTHING_STYLES = [
  'Casual',
  'Formal',
  'Bohemian',
  'Business',
  'Athletic',
  'Vintage',
  'Gothic',
  'Preppy',
  'Streetwear',
  'Traditional',
  'Eccentric',
] as const;

/**
 * Narrative function options
 */
export const NARRATIVE_FUNCTIONS = [
  'Protagonist',
  'Antagonist',
  'Supporting Character',
  'Comic Relief',
  'Love Interest',
  'Mentor Figure',
  'Villain',
  'Anti-Hero',
  'Foil',
  'Catalyst',
] as const;

/**
 * Temperament options for personality
 */
export const TEMPERAMENTS = [
  'Sanguine',
  'Choleric',
  'Melancholic',
  'Phlegmatic',
  'Balanced',
] as const;

/**
 * Communication style options
 */
export const COMMUNICATION_STYLES = [
  'Direct',
  'Indirect',
  'Formal',
  'Casual',
  'Verbose',
  'Terse',
  'Diplomatic',
  'Aggressive',
  'Passive',
  'Sarcastic',
] as const;

/**
 * Relationship types for character connections
 */
export const RELATIONSHIP_TYPES = [
  'Family',
  'Friend',
  'Enemy',
  'Rival',
  'Love Interest',
  'Mentor',
  'Student',
  'Colleague',
  'Ally',
  'Acquaintance',
] as const;
