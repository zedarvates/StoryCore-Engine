import { Character } from '@/types/character';
import { Location } from '@/types/location';
import { StoryObject } from '@/types/object';

/**
 * Builds a base visual prompt for a character based on its attributes.
 */
export function buildVisualPromptForCharacter(character: Partial<Character>): string {
    if (!character.name && !character.visual_identity) return 'A mysterious character portrait, cinematic lighting, 8k';

    const parts: string[] = [];
    const name = character.name || 'A character';
    parts.push(`Cinematic photorealistic portrait of ${name}`);

    if (character.visual_identity) {
        const v = character.visual_identity;
        if (v.gender || v.age_range) {
            parts.push(`${v.age_range || ''} ${v.gender || ''}`.trim());
        }
        if (v.hair_color || v.hair_style) {
            parts.push(`with ${v.hair_color || ''} ${v.hair_style || ''} hair`.trim());
        }
        if (v.eye_color) parts.push(`${v.eye_color} eyes`);
        if (v.skin_tone) parts.push(`${v.skin_tone} skin`);
        if (v.clothing_style) parts.push(`wearing ${v.clothing_style}`);
        if (v.distinctive_features?.length) parts.push(`featuring ${v.distinctive_features.join(', ')}`);
    }

    if (character.role?.archetype) parts.push(`Archetype: ${character.role.archetype}`);

    parts.push("high detail, sharp focus, 8k, professional lighting, character reference style");
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

    parts.push("cinematic composition, detailed environment, 8k, wide angle, professional photography");
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

    parts.push("isolated on neutral background, macro photography, sharp focus, 8k, professional product shot");
    return parts.filter(Boolean).join(', ');
}
