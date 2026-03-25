import { Character } from '@/types/character';
import { Location } from '@/types/location';
import { StoryObject } from '@/types/object';

/**
 * Cinematic Keyword Library based on R&D research
 */
const CINEMATIC_KEYWORDS = {
  lighting: [
    'Rembrandt lighting',
    'cinematic contrast',
    'golden hour backlight',
    'volumetric fog',
    'anamorphic lens flares',
    'high dynamic range (HDR)',
    'soft key lighting',
    'chiaroscuro'
  ],
  color_science: [
    'LUT color science',
    'film print emulation',
    'Kodak Vision3 color grading',
    'teal and orange palette',
    'balanced skin tones',
    'professional color grading'
  ],
  texture_quality: [
    '35mm film grain',
    'MTF optimization',
    'highly detailed texture',
    '8k resolution',
    'sharp focus',
    'macro photography'
  ]
};

function getRandomKeywords(category: keyof typeof CINEMATIC_KEYWORDS, count: number = 2): string {
  const keywords = CINEMATIC_KEYWORDS[category];
  return [...keywords].sort(() => 0.5 - Math.random()).slice(0, count).join(', ');
}

/**
 * Builds a base visual prompt for a character based on its attributes.
 */
export function buildVisualPromptForCharacter(character: Partial<Character>): string {
    if (!character.name && !character.visual_identity) return `A mysterious character portrait, ${getRandomKeywords('lighting', 2)}, 8k`;

    const parts: string[] = [];
    const name = character.name || 'A character';
    parts.push(`Cinematic photorealistic portrait of ${name}`);

    if (character.visual_identity) {
        const v = character.visual_identity;
        if (v.gender || v.age_range || v.ethnicity) {
            parts.push(`${v.ethnicity || ''} ${v.age_range || ''} ${v.gender || ''}`.trim());
        }
        if (v.hair_color || v.hair_style || v.hair_length) {
            parts.push(`with ${v.hair_length || ''} ${v.hair_color || ''} ${v.hair_style || ''} hair`.trim());
        }
        if (v.eye_color || v.eye_shape) {
            parts.push(`${v.eye_color || ''} ${v.eye_shape || ''} eyes`.trim());
        }
        if (v.skin_tone) parts.push(`${v.skin_tone} skin`);
        if (v.facial_structure) parts.push(`${v.facial_structure} facial features`);
        if (v.build || v.height) {
            parts.push(`${v.height || ''} ${v.build || ''} build`.trim());
        }
        if (v.posture) parts.push(`with ${v.posture} posture`);
        if (v.clothing_style) parts.push(`wearing ${v.clothing_style}`);
        if (v.distinctive_features?.length) parts.push(`featuring ${v.distinctive_features.join(', ')}`);
        if (v.visual_style) parts.push(`Style: ${v.visual_style}`);
    }

    if (character.role?.archetype) parts.push(`Archetype: ${character.role.archetype}`);
    // @ts-ignore - archetype might be at root for some versions
    if (character.archetype) parts.push(`Archetype: ${character.archetype}`);

    // Adding cinematic realism based on research
    parts.push(getRandomKeywords('lighting', 1));
    parts.push(getRandomKeywords('color_science', 1));
    parts.push(getRandomKeywords('texture_quality', 2));
    
    return parts.filter(Boolean).join(', ');
}

/**
 * Builds a base visual prompt for a location based on its attributes.
 */
export function buildVisualPromptForLocation(location: Partial<Location>): string {
    const name = location.name || 'An unknown location';
    const parts: string[] = [];

    parts.push(`Breathtaking ${location.location_type || 'exterior'} view of ${name}`);

    if (location.metadata) {
        const m = location.metadata;
        if (m.description) parts.push(m.description);
        if (m.atmosphere) parts.push(`Atmosphere: ${m.atmosphere}`);
        if (m.time_period) parts.push(`Era: ${m.time_period}`);
        if (m.key_features?.length) parts.push(`Key features: ${m.key_features.join(', ')}`);
    }

    // Cinematic composition and lighting
    parts.push("cinematic wide angle composition");
    parts.push(getRandomKeywords('lighting', 2));
    parts.push(getRandomKeywords('color_science', 1));
    parts.push("detailed environment, professional photography");
    
    return parts.filter(Boolean).join(', ');
}

/**
 * Builds a base visual prompt for a story object based on its attributes.
 */
export function buildVisualPromptForObject(object: Partial<StoryObject>): string {
    const name = object.name || 'A mysterious object';
    const parts: string[] = [];

    parts.push(`Highly detailed ${object.rarity || 'common'} ${object.type || 'object'}: ${name}`);

    if (object.description) parts.push(object.description);
    if (object.appearance) parts.push(`Appearance: ${object.appearance}`);
    if (object.properties?.material) parts.push(`Made of ${object.properties.material}`);
    if (object.properties?.color) parts.push(`${object.properties.color} color`);

    parts.push("isolated on neutral background, macro photography, sharp focus");
    parts.push(getRandomKeywords('texture_quality', 2));
    parts.push("professional product shot");
    
    return parts.filter(Boolean).join(', ');
}


