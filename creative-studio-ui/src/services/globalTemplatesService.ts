// ============================================================================
// Global Templates Service
// ============================================================================
// Provides access to pre-recorded templates for characters, locations, objects
// These templates are stored outside user projects and can be used as starting points
// ============================================================================

import type { CharacterReference, LocationReference } from '@/types/story';

// ============================================================================
// Template Types
// ============================================================================

export interface CharacterTemplate {
    id: string;
    name: string;
    role: string;
    description: string;
    personality: string[];
    appearance: string[];
    typicalGenre: string[];
    isDefault?: boolean;
}

export interface LocationTemplate {
    id: string;
    name: string;
    type: string;
    description: string;
    atmosphere: string;
    typicalGenre: string[];
    isDefault?: boolean;
}

export interface ObjectTemplate {
    id: string;
    name: string;
    type: string;
    description: string;
    significance: string;
    typicalGenre: string[];
    isDefault?: boolean;
}

export interface GlobalTemplates {
    characters: CharacterTemplate[];
    locations: LocationTemplate[];
    objects: ObjectTemplate[];
}

// ============================================================================
// Default Templates Data
// ============================================================================

const DEFAULT_CHARACTER_TEMPLATES: CharacterTemplate[] = [
    // Fantasy Characters
    {
        id: 'tpl-char-hero-fantasy',
        name: 'Fantasy Hero',
        role: 'Protagonist',
        description: 'A brave adventurer on a quest to save their world from an ancient evil.',
        personality: ['brave', 'determined', 'compassionate'],
        appearance: ['athletic build', 'determined eyes', 'practical clothing'],
        typicalGenre: ['fantasy', 'adventure'],
        isDefault: true,
    },
    {
        id: 'tpl-char-mentor',
        name: 'Wise Mentor',
        role: 'Mentor',
        description: 'An experienced guide who helps the protagonist on their journey.',
        personality: ['wise', 'patient', 'mysterious'],
        appearance: ['aged features', 'knowing eyes', 'distinguished attire'],
        typicalGenre: ['fantasy', 'scifi', 'adventure'],
        isDefault: true,
    },
    {
        id: 'tpl-char-villain',
        name: 'Dark Antagonist',
        role: 'Antagonist',
        description: 'A formidable opponent with complex motivations.',
        personality: ['cunning', 'ambitious', 'ruthless'],
        appearance: ['imposing presence', 'sharp features', 'dark attire'],
        typicalGenre: ['fantasy', 'thriller', 'drama'],
        isDefault: true,
    },
    {
        id: 'tpl-char-sidekick',
        name: 'Loyal Companion',
        role: 'Supporting',
        description: 'A faithful friend who provides support and comic relief.',
        personality: ['loyal', 'humorous', 'resourceful'],
        appearance: ['friendly demeanor', 'practical attire', 'expressive face'],
        typicalGenre: ['fantasy', 'adventure', 'comedy'],
        isDefault: true,
    },
    // Sci-Fi Characters
    {
        id: 'tpl-char-scientist',
        name: 'Brilliant Scientist',
        role: 'Protagonist',
        description: 'A brilliant mind caught in a discovery that could change everything.',
        personality: ['intelligent', 'curious', 'ethical'],
        appearance: ['professional attire', 'thoughtful expression', 'practical glasses'],
        typicalGenre: ['scifi', 'thriller'],
        isDefault: true,
    },
    {
        id: 'tpl-char-space-captain',
        name: 'Space Captain',
        role: 'Protagonist',
        description: 'A seasoned leader navigating the dangers of deep space.',
        personality: ['decisive', 'experienced', 'protective'],
        appearance: ['military bearing', 'weathered features', 'command uniform'],
        typicalGenre: ['scifi', 'adventure'],
        isDefault: true,
    },
    // Drama Characters
    {
        id: 'tpl-char-detective',
        name: 'Determined Detective',
        role: 'Protagonist',
        description: 'A dedicated investigator seeking truth and justice.',
        personality: ['observant', 'persistent', 'troubled'],
        appearance: ['tired eyes', 'practical clothes', 'disheveled appearance'],
        typicalGenre: ['thriller', 'mystery', 'drama'],
        isDefault: true,
    },
    {
        id: 'tpl-char-love-interest',
        name: 'Love Interest',
        role: 'Supporting',
        description: 'A compelling romantic interest with their own dreams and struggles.',
        personality: ['charismatic', 'independent', 'complex'],
        appearance: ['attractive', 'unique style', 'warm expression'],
        typicalGenre: ['romance', 'drama'],
        isDefault: true,
    },
];

const DEFAULT_LOCATION_TEMPLATES: LocationTemplate[] = [
    // Fantasy Locations
    {
        id: 'tpl-loc-fantasy-castle',
        name: 'Ancient Castle',
        type: 'castle',
        description: 'A majestic fortress with towering spires and hidden secrets.',
        atmosphere: 'mysterious, grand, ancient',
        typicalGenre: ['fantasy', 'historical'],
        isDefault: true,
    },
    {
        id: 'tpl-loc-enchanted-forest',
        name: 'Enchanted Forest',
        type: 'forest',
        description: 'A mystical woodland filled with magical creatures and ancient power.',
        atmosphere: 'mysterious, magical, dangerous',
        typicalGenre: ['fantasy', 'adventure'],
        isDefault: true,
    },
    {
        id: 'tpl-loc-village',
        name: 'Medieval Village',
        type: 'village',
        description: 'A peaceful rural settlement with thatched roofs and cobblestone streets.',
        atmosphere: 'peaceful, rustic, welcoming',
        typicalGenre: ['fantasy', 'historical'],
        isDefault: true,
    },
    // Sci-Fi Locations
    {
        id: 'tpl-loc-spaceship',
        name: 'Space Station',
        type: 'station',
        description: 'A high-tech orbital facility at the edge of known space.',
        atmosphere: 'sterile, futuristic, tense',
        typicalGenre: ['scifi', 'thriller'],
        isDefault: true,
    },
    {
        id: 'tpl-loc-alien-planet',
        name: 'Alien World',
        type: 'planet',
        description: 'A strange new world with unexplored terrain and unknown dangers.',
        atmosphere: 'alien, mysterious, dangerous',
        typicalGenre: ['scifi', 'adventure'],
        isDefault: true,
    },
    // Urban Locations
    {
        id: 'tpl-loc-city-street',
        name: 'City Streets',
        type: 'urban',
        description: 'Bustling urban streets with towering buildings and hidden alleys.',
        atmosphere: 'busy, modern, anonymous',
        typicalGenre: ['drama', 'thriller', 'mystery'],
        isDefault: true,
    },
    {
        id: 'tpl-loc-detective-office',
        name: 'Private Office',
        type: 'interior',
        description: 'A cluttered office with files, photographs, and a worn desk.',
        atmosphere: 'dim, cluttered, intimate',
        typicalGenre: ['mystery', 'thriller', 'drama'],
        isDefault: true,
    },
    // Natural Locations
    {
        id: 'tpl-loc-beach',
        name: 'Seaside Beach',
        type: 'beach',
        description: 'A serene coastline with waves lapping at sandy shores.',
        atmosphere: 'peaceful, romantic, contemplative',
        typicalGenre: ['romance', 'drama'],
        isDefault: true,
    },
];

const DEFAULT_OBJECT_TEMPLATES: ObjectTemplate[] = [
    {
        id: 'tpl-obj-magic-artifact',
        name: 'Ancient Artifact',
        type: 'artifact',
        description: 'A powerful object imbued with magical properties.',
        significance: 'Central to the plot, holds the key to resolving the conflict.',
        typicalGenre: ['fantasy', 'adventure'],
        isDefault: true,
    },
    {
        id: 'tpl-obj-weapon',
        name: 'Legendary Weapon',
        type: 'weapon',
        description: 'A weapon of great power with a storied history.',
        significance: 'Grants its wielder unique abilities.',
        typicalGenre: ['fantasy', 'scifi'],
        isDefault: true,
    },
    {
        id: 'tpl-obj-tech-device',
        name: 'Advanced Technology',
        type: 'device',
        description: 'Cutting-edge technology that could change the world.',
        significance: 'Multiple factions seek to control it.',
        typicalGenre: ['scifi', 'thriller'],
        isDefault: true,
    },
    {
        id: 'tpl-obj-evidence',
        name: 'Crucial Evidence',
        type: 'evidence',
        description: 'A document or object that reveals the truth.',
        significance: 'Key to solving the mystery.',
        typicalGenre: ['mystery', 'thriller'],
        isDefault: true,
    },
];

// ============================================================================
// Storage Keys
// ============================================================================

const GLOBAL_TEMPLATES_KEY = 'storycore_global_templates';
const STYLE_PREFERENCES_KEY = 'storycore_style_preferences';

// ============================================================================
// Style Preferences (for persistence across wizards)
// ============================================================================

export interface StylePreferences {
    lastUsedGenre: string[];
    lastUsedTone: string[];
    lastUsedLength: string;
    lastUsedMethodology: string;
    lastUsedWritingStyle: string;
    savedAt: number;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Load all global templates
 */
export function loadGlobalTemplates(): GlobalTemplates {
    try {
        const stored = localStorage.getItem(GLOBAL_TEMPLATES_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                characters: [...DEFAULT_CHARACTER_TEMPLATES, ...(parsed.customCharacters || [])],
                locations: [...DEFAULT_LOCATION_TEMPLATES, ...(parsed.customLocations || [])],
                objects: [...DEFAULT_OBJECT_TEMPLATES, ...(parsed.customObjects || [])],
            };
        }
    } catch (error) {
        console.warn('[GlobalTemplates] Failed to load from storage:', error);
    }

    return {
        characters: DEFAULT_CHARACTER_TEMPLATES,
        locations: DEFAULT_LOCATION_TEMPLATES,
        objects: DEFAULT_OBJECT_TEMPLATES,
    };
}

/**
 * Get character templates filtered by genre
 */
export function getCharacterTemplatesByGenre(genre: string[]): CharacterTemplate[] {
    const templates = loadGlobalTemplates();
    if (!genre || genre.length === 0) {
        return templates.characters.filter(t => t.isDefault);
    }

    return templates.characters.filter(t =>
        t.typicalGenre.some(g => genre.includes(g)) || t.isDefault
    );
}

/**
 * Get location templates filtered by genre
 */
export function getLocationTemplatesByGenre(genre: string[]): LocationTemplate[] {
    const templates = loadGlobalTemplates();
    if (!genre || genre.length === 0) {
        return templates.locations.filter(t => t.isDefault);
    }

    return templates.locations.filter(t =>
        t.typicalGenre.some(g => genre.includes(g)) || t.isDefault
    );
}

/**
 * Get object templates filtered by genre
 */
export function getObjectTemplatesByGenre(genre: string[]): ObjectTemplate[] {
    const templates = loadGlobalTemplates();
    if (!genre || genre.length === 0) {
        return templates.objects.filter(t => t.isDefault);
    }

    return templates.objects.filter(t =>
        t.typicalGenre.some(g => genre.includes(g)) || t.isDefault
    );
}

/**
 * Convert character template to reference
 */
export function characterTemplateToReference(template: CharacterTemplate): CharacterReference {
    return {
        id: template.id,
        name: template.name,
        role: template.role,
    };
}

/**
 * Convert location template to reference
 */
export function locationTemplateToReference(template: LocationTemplate): LocationReference {
    return {
        id: template.id,
        name: template.name,
        significance: template.atmosphere,
        type: template.type,
    };
}

/**
 * Save custom template (user-created)
 */
export function saveCustomCharacterTemplate(template: CharacterTemplate): void {
    const stored = localStorage.getItem(GLOBAL_TEMPLATES_KEY);
    const data = stored ? JSON.parse(stored) : {};

    if (!data.customCharacters) {
        data.customCharacters = [];
    }

    // Remove existing template with same ID
    data.customCharacters = data.customCharacters.filter(
        (t: CharacterTemplate) => t.id !== template.id
    );

    data.customCharacters.push(template);
    localStorage.setItem(GLOBAL_TEMPLATES_KEY, JSON.stringify(data));
}

/**
 * Save custom location template (user-created)
 */
export function saveCustomLocationTemplate(template: LocationTemplate): void {
    const stored = localStorage.getItem(GLOBAL_TEMPLATES_KEY);
    const data = stored ? JSON.parse(stored) : {};

    if (!data.customLocations) {
        data.customLocations = [];
    }

    data.customLocations = data.customLocations.filter(
        (t: LocationTemplate) => t.id !== template.id
    );

    data.customLocations.push(template);
    localStorage.setItem(GLOBAL_TEMPLATES_KEY, JSON.stringify(data));
}

// ============================================================================
// Style Preferences Persistence
// ============================================================================

/**
 * Load saved style preferences
 */
export function loadStylePreferences(): StylePreferences | null {
    try {
        const stored = localStorage.getItem(STYLE_PREFERENCES_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.warn('[StylePreferences] Failed to load:', error);
    }
    return null;
}

/**
 * Save style preferences (called when completing a wizard step)
 */
export function saveStylePreferences(preferences: Partial<StylePreferences>): void {
    try {
        const existing = loadStylePreferences() || {
            lastUsedGenre: [],
            lastUsedTone: [],
            lastUsedLength: 'medium',
            lastUsedMethodology: 'sequential',
            lastUsedWritingStyle: 'descriptive',
            savedAt: Date.now(),
        };

        const updated: StylePreferences = {
            ...existing,
            ...preferences,
            savedAt: Date.now(),
        };

        localStorage.setItem(STYLE_PREFERENCES_KEY, JSON.stringify(updated));
        console.log('[StylePreferences] Saved:', updated);
    } catch (error) {
        console.warn('[StylePreferences] Failed to save:', error);
    }
}

/**
 * Clear style preferences
 */
export function clearStylePreferences(): void {
    localStorage.removeItem(STYLE_PREFERENCES_KEY);
}

// ============================================================================
// Export Default Templates for External Use
// ============================================================================

export const DEFAULT_TEMPLATES = {
    characters: DEFAULT_CHARACTER_TEMPLATES,
    locations: DEFAULT_LOCATION_TEMPLATES,
    objects: DEFAULT_OBJECT_TEMPLATES,
};