/**
 * LLM Response Parser
 * 
 * Intelligent parser that analyzes LLM responses to extract structured data
 * about entities (characters, locations, objects, etc.)
 * 
 * This parser bridges the gap between free-text LLM responses and 
 * actionable structured data for the ContentCreationService.
 */

import { logger } from '@/utils/logger';
import type { ContentType } from './ContentCreationService';
import type { LanguageCode } from '@/utils/llmConfigStorage';

// ============================================================================
// Types
// ============================================================================

export interface ParsedEntity {
    type: ContentType;
    confidence: number; // 0-1
    data: Record<string, unknown>;
    rawText: string; // The section of text this was extracted from
}

export interface ParserResult {
    entities: ParsedEntity[];
    detectedTypes: ContentType[];
    hasStructuredData: boolean; // Whether JSON or structured format was found
    rawResponse: string;
}

export interface EntityAttribute {
    key: string;
    value: unknown;
    source: 'json' | 'pattern' | 'inference';
}

// ============================================================================
// Extraction Patterns (FR + EN)
// ============================================================================

const NAME_PATTERNS = {
    fr: [
        /(?:nom|appelé|nommé|intitulé|s'appelle)\s*[:：]?\s*[«"']?([^»"'\n,;.]{2,50})[»"']?/gi,
        /\*\*(?:Nom|Prénom)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
        /^(?:Nom|Prénom)\s*[:：]\s*(.+?)$/gim,
    ],
    en: [
        /(?:name|called|named|titled)\s*[:：]?\s*[«"']?([^»"'\n,;.]{2,50})[»"']?/gi,
        /\*\*(?:Name|Title)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
        /^(?:Name|Title)\s*[:：]\s*(.+?)$/gim,
    ],
};

const DESCRIPTION_PATTERNS = {
    fr: [
        /(?:description|présentation|apparence)\s*[:：]\s*(.+?)(?:\n\n|\n(?=[A-Z*#-]))/gis,
        /\*\*(?:Description|Apparence|Présentation)\s*[:：]?\*\*\s*(.+?)(?:\n\n|\n(?=[A-Z*#-]))/gis,
    ],
    en: [
        /(?:description|appearance|overview)\s*[:：]\s*(.+?)(?:\n\n|\n(?=[A-Z*#-]))/gis,
        /\*\*(?:Description|Appearance|Overview)\s*[:：]?\*\*\s*(.+?)(?:\n\n|\n(?=[A-Z*#-]))/gis,
    ],
};

const GENDER_PATTERNS = {
    fr: [
        /(?:genre|sexe)\s*[:：]\s*(homme|femme|masculin|féminin|non-binaire|neutre)/gi,
        /\*\*(?:Genre|Sexe)\s*[:：]?\*\*\s*(homme|femme|masculin|féminin|non-binaire|neutre)/gi,
    ],
    en: [
        /(?:gender|sex)\s*[:：]\s*(male|female|non-binary|neutral)/gi,
        /\*\*(?:Gender|Sex)\s*[:：]?\*\*\s*(male|female|non-binary|neutral)/gi,
    ],
};

const ROLE_PATTERNS = {
    fr: [
        /(?:rôle|fonction)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Rôle|Fonction)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
    en: [
        /(?:role|function|class)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Role|Function|Class)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
};

const TYPE_PATTERNS = {
    fr: [
        /(?:type|catégorie|genre)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Type|Catégorie)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
    en: [
        /(?:type|category|kind)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Type|Category|Kind)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
};

const ARCHETYPE_PATTERNS = {
    fr: [
        /(?:archétype|classe|archetype)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Archétype|Classe)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
    en: [
        /(?:archetype|class)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Archetype|Class)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
};

const AGE_PATTERNS = {
    fr: [
        /(?:âge|age)\s*[:：]\s*(\d+\s*(?:ans)?|[a-zéè]+ ans)/gi,
        /\*\*(?:Âge|Age)\s*[:：]?\*\*\s*(\d+\s*(?:ans)?)/gi,
    ],
    en: [
        /(?:age)\s*[:：]\s*(\d+\s*(?:years? old)?|[a-z]+ years? old)/gi,
        /\*\*(?:Age)\s*[:：]?\*\*\s*(\d+)/gi,
    ],
};

const GENRE_PATTERNS = {
    fr: [
        /(?:genre littéraire|genre)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Genre)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
    en: [
        /(?:genre|literary genre)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Genre)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
};

const ERA_PATTERNS = {
    fr: [
        /(?:époque|ère|période)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Époque|Ère|Période)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
    en: [
        /(?:era|period|epoch|age)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Era|Period|Epoch)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
};

const RARITY_PATTERNS = {
    fr: [
        /(?:rareté)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Rareté)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
    en: [
        /(?:rarity)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Rarity)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
};

const MATERIAL_PATTERNS = {
    fr: [
        /(?:matériau|matière|composition)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Matériau|Matière)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
    en: [
        /(?:material|composition|made of)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Material|Composition)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
};

const USAGE_PATTERNS = {
    fr: [
        /(?:utilisation|usage|fonction)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Utilisation|Usage|Fonction)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
    en: [
        /(?:usage|use|function)\s*[:：]\s*(.+?)(?:\n|$)/gi,
        /\*\*(?:Usage|Use|Function)\s*[:：]?\*\*\s*(.+?)(?:\n|$)/gi,
    ],
};

// ============================================================================
// LLMResponseParser Class
// ============================================================================

class LLMResponseParserImpl {
    private static instance: LLMResponseParserImpl;

    static getInstance(): LLMResponseParserImpl {
        if (!LLMResponseParserImpl.instance) {
            LLMResponseParserImpl.instance = new LLMResponseParserImpl();
        }
        return LLMResponseParserImpl.instance;
    }

    // -------------------------------------------------------------------------
    // Main Parse Method
    // -------------------------------------------------------------------------

    parse(
        response: string,
        expectedType?: ContentType,
        language: LanguageCode = 'fr'
    ): ParserResult {
        const result: ParserResult = {
            entities: [],
            detectedTypes: [],
            hasStructuredData: false,
            rawResponse: response,
        };

        if (!response || response.trim().length === 0) {
            return result;
        }

        // Step 1: Try to extract JSON blocks first (most reliable)
        const jsonEntities = this.extractFromJSON(response, expectedType);
        if (jsonEntities.length > 0) {
            result.entities.push(...jsonEntities);
            result.hasStructuredData = true;
        }

        // Step 2: Extract from structured markdown/text patterns
        const patternEntities = this.extractFromPatterns(response, expectedType, language);

        // Merge pattern entities with JSON entities (avoid duplicates)
        for (const pe of patternEntities) {
            const existingIdx = result.entities.findIndex(e => e.type === pe.type);
            if (existingIdx >= 0) {
                // Merge data (JSON data takes priority)
                result.entities[existingIdx].data = {
                    ...pe.data,
                    ...result.entities[existingIdx].data,
                };
                // Use higher confidence
                result.entities[existingIdx].confidence = Math.max(
                    result.entities[existingIdx].confidence,
                    pe.confidence
                );
            } else {
                result.entities.push(pe);
            }
        }

        // Collect detected types
        result.detectedTypes = [...new Set(result.entities.map(e => e.type))];

        logger.debug(`[LLMResponseParser] Parsed ${result.entities.length} entities, types: ${result.detectedTypes.join(', ')}`);

        return result;
    }

    // -------------------------------------------------------------------------
    // JSON Extraction
    // -------------------------------------------------------------------------

    private extractFromJSON(text: string, expectedType?: ContentType): ParsedEntity[] {
        const entities: ParsedEntity[] = [];

        // Match JSON objects or arrays in the text
        const jsonPatterns = [
            /```json\s*\n?([\s\S]*?)\n?```/g,      // Fenced JSON blocks
            /```\s*\n?(\{[\s\S]*?\})\n?```/g,        // Fenced objects
            /```\s*\n?(\[[\s\S]*?\])\n?```/g,        // Fenced arrays
            /(?:^|\n)(\{[\s\S]*?\})(?:\n|$)/g,        // Inline JSON objects
            /(?:^|\n)(\[[\s\S]*?\])(?:\n|$)/g,        // Inline JSON arrays
        ];

        for (const pattern of jsonPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                try {
                    const parsed = JSON.parse(match[1]);
                    const items = Array.isArray(parsed) ? parsed : [parsed];

                    for (const item of items) {
                        if (typeof item === 'object' && item !== null) {
                            const type = this.inferTypeFromData(item, expectedType);
                            if (type) {
                                entities.push({
                                    type,
                                    confidence: 0.95,
                                    data: this.normalizeData(item, type),
                                    rawText: match[0],
                                });
                            }
                        }
                    }
                } catch {
                    // Invalid JSON, skip
                }
            }
        }

        return entities;
    }

    // -------------------------------------------------------------------------
    // Pattern-Based Extraction
    // -------------------------------------------------------------------------

    private extractFromPatterns(
        text: string,
        expectedType?: ContentType,
        language: LanguageCode = 'fr'
    ): ParsedEntity[] {
        const entities: ParsedEntity[] = [];
        const lang = language === 'fr' ? 'fr' : 'en';

        // Extract attributes from text
        const attributes: Record<string, string> = {};

        // Extract name
        const name = this.extractFirstMatch(text, NAME_PATTERNS[lang]);
        if (name) attributes.name = name.trim();

        // Extract description
        const description = this.extractFirstMatch(text, DESCRIPTION_PATTERNS[lang]);
        if (description) attributes.description = description.trim();

        // Extract gender
        const gender = this.extractFirstMatch(text, GENDER_PATTERNS[lang]);
        if (gender) attributes.gender = this.normalizeGender(gender.trim());

        // Extract role
        const role = this.extractFirstMatch(text, ROLE_PATTERNS[lang]);
        if (role) attributes.role = role.trim();

        // Extract type/category
        const type = this.extractFirstMatch(text, TYPE_PATTERNS[lang]);
        if (type) attributes.type = type.trim();

        // Extract archetype
        const archetype = this.extractFirstMatch(text, ARCHETYPE_PATTERNS[lang]);
        if (archetype) attributes.archetype = archetype.trim();

        // Extract age
        const age = this.extractFirstMatch(text, AGE_PATTERNS[lang]);
        if (age) attributes.age = age.trim();

        // Extract genre
        const genre = this.extractFirstMatch(text, GENRE_PATTERNS[lang]);
        if (genre) attributes.genre = genre.trim();

        // Extract era
        const era = this.extractFirstMatch(text, ERA_PATTERNS[lang]);
        if (era) attributes.era = era.trim();

        // Extract rarity
        const rarity = this.extractFirstMatch(text, RARITY_PATTERNS[lang]);
        if (rarity) attributes.rarity = rarity.trim();

        // Extract material
        const material = this.extractFirstMatch(text, MATERIAL_PATTERNS[lang]);
        if (material) attributes.material = material.trim();

        // Extract usage
        const usage = this.extractFirstMatch(text, USAGE_PATTERNS[lang]);
        if (usage) attributes.usage = usage.trim();

        // Determine entity type from extracted attributes or context
        const detectedType = expectedType || this.inferTypeFromAttributes(attributes);

        if (detectedType && Object.keys(attributes).length >= 1) {
            const confidence = this.calculateConfidence(attributes, detectedType);
            entities.push({
                type: detectedType,
                confidence,
                data: attributes,
                rawText: text.substring(0, Math.min(text.length, 500)),
            });
        }

        return entities;
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    private extractFirstMatch(text: string, patterns: RegExp[]): string | null {
        for (const pattern of patterns) {
            // Reset lastIndex for global patterns
            pattern.lastIndex = 0;
            const match = pattern.exec(text);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }

    private normalizeGender(gender: string): string {
        const lower = gender.toLowerCase();
        if (/femme|féminin|female|woman|girl|fille/.test(lower)) return 'female';
        if (/homme|masculin|male|man|boy|garçon/.test(lower)) return 'male';
        if (/non-binaire|non-binary/.test(lower)) return 'non-binary';
        return 'neutral';
    }

    private inferTypeFromData(data: Record<string, unknown>, expectedType?: ContentType): ContentType | null {
        if (expectedType) return expectedType;

        // Check for type-specific keys
        if (data.archetype || data.personality || data.backstory || data.visual_identity) return 'character';
        if (data.atmosphere || data.coordinates || data.connectedLocations) return 'location';
        if (data.rarity || data.powerLevel || data.abilities) return 'object';
        if (data.lines || data.dialogue || data.speakers) return 'dialogue';
        if (data.plotOutline || data.chapters || data.narrative) return 'story';
        if (data.era || data.cultures || data.worldRules || data.cosmology) return 'world';
        if (data.scenes || data.screenplay || data.conflict) return 'scenario';
        if (data.prompt && (data.size || data.style)) return 'image';

        // Fallback: check role/gender → character
        if (data.gender || data.role) return 'character';
        if (data.genre && (data.title || data.name)) {
            // Could be story or world
            if (data.era) return 'world';
            return 'story';
        }

        return null;
    }

    private inferTypeFromAttributes(attributes: Record<string, string>): ContentType | null {
        // If we have character-specific attributes
        if (attributes.gender || attributes.archetype || attributes.role) return 'character';
        if (attributes.rarity) return 'object';
        if (attributes.era) return 'world';
        if (attributes.genre && !attributes.era) return 'story';
        if (attributes.type && (attributes.name || attributes.description)) return 'location';

        // Default: if we have a name and description, it could be anything
        return null;
    }

    private normalizeData(data: Record<string, unknown>, type: ContentType): Record<string, unknown> {
        const normalized: Record<string, unknown> = {};

        // Copy all known fields
        for (const [key, value] of Object.entries(data)) {
            // Normalize key names
            const normalizedKey = this.normalizeKey(key);
            normalized[normalizedKey] = value;
        }

        return normalized;
    }

    private normalizeKey(key: string): string {
        // Map common alternative key names to standard names
        const keyMap: Record<string, string> = {
            'nom': 'name',
            'prénom': 'name',
            'titre': 'title',
            'sexe': 'gender',
            'âge': 'age',
            'rôle': 'role',
            'classe': 'archetype',
            'catégorie': 'type',
            'époque': 'era',
            'période': 'era',
            'rareté': 'rarity',
            'puissance': 'powerLevel',
            'capacités': 'abilities',
            'apparence': 'appearance',
            'personnalité': 'personality',
            'histoire': 'backstory',
            'atmosphère': 'atmosphere',
            'significance': 'significance',
            'résumé': 'summary',
            'synopsis': 'summary',
            'matière': 'material',
            'matériau': 'material',
            'utilisation': 'usage',
            'fonction': 'usage',
        };

        const lower = key.toLowerCase();
        return keyMap[lower] || key;
    }

    private calculateConfidence(attributes: Record<string, string>, type: ContentType): number {
        const fieldCount = Object.keys(attributes).length;

        // Base confidence from number of attributes
        let confidence = Math.min(fieldCount * 0.2, 0.8);

        // Bonus for having a name
        if (attributes.name) confidence += 0.1;

        // Bonus for type-specific required fields
        switch (type) {
            case 'character':
                if (attributes.name && attributes.role) confidence += 0.1;
                if (attributes.gender) confidence += 0.05;
                break;
            case 'location':
                if (attributes.name && attributes.type) confidence += 0.1;
                break;
            case 'object':
                if (attributes.name && attributes.type) confidence += 0.1;
                if (attributes.rarity) confidence += 0.05;
                break;
            case 'world':
                if (attributes.name && attributes.era) confidence += 0.1;
                break;
            case 'story':
            case 'scenario':
                if (attributes.name && attributes.genre) confidence += 0.1;
                break;
        }

        return Math.min(confidence, 1);
    }

    // -------------------------------------------------------------------------
    // Convenience Methods
    // -------------------------------------------------------------------------

    /**
     * Parse response expecting a specific entity type
     */
    parseForType(
        response: string,
        type: ContentType,
        language: LanguageCode = 'fr'
    ): ParsedEntity | null {
        const result = this.parse(response, type, language);
        return result.entities.find(e => e.type === type) || null;
    }

    /**
     * Extract a character from LLM response
     */
    parseCharacter(response: string, language: LanguageCode = 'fr'): Record<string, unknown> | null {
        const entity = this.parseForType(response, 'character', language);
        return entity ? entity.data : null;
    }

    /**
     * Extract a location from LLM response
     */
    parseLocation(response: string, language: LanguageCode = 'fr'): Record<string, unknown> | null {
        const entity = this.parseForType(response, 'location', language);
        return entity ? entity.data : null;
    }

    /**
     * Extract a world from LLM response
     */
    parseWorld(response: string, language: LanguageCode = 'fr'): Record<string, unknown> | null {
        const entity = this.parseForType(response, 'world', language);
        return entity ? entity.data : null;
    }

    /**
     * Check if a response contains parseable entity data
     */
    hasEntityData(response: string, language: LanguageCode = 'fr'): boolean {
        const result = this.parse(response, undefined, language);
        return result.entities.length > 0;
    }

    /**
     * Extract all detected content types from a response
     */
    detectTypes(response: string, language: LanguageCode = 'fr'): ContentType[] {
        const result = this.parse(response, undefined, language);
        return result.detectedTypes;
    }
}

// Export singleton
export const llmResponseParser = LLMResponseParserImpl.getInstance();
export type { LLMResponseParserImpl as LLMResponseParserType };
