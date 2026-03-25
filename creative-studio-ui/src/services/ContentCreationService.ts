/**
 * ContentCreationService - Unified Content Creation from Chat
 * 
 * This service bridges the gap between the LLM Chat Assistant and all creation services.
 * It can:
 * 1. Detect what type of content the user wants to create
 * 2. Parse partial data from chat context
 * 3. Auto-fill missing data using LLM generation
 * 4. Trigger the appropriate creation service
 * 5. Return the created entity to the chat for confirmation
 * 
 * Supports: Characters, Locations, Objects, Dialogues, Stories, Worlds, Scenarios, Images, Audio
 */

import { llmConfigService } from './llmConfigService';
import { llmResponseParser } from './LLMResponseParser';
import { generationOrchestrator } from './GenerationOrchestrator';
import { logger } from '@/utils/logger';
import type { LanguageCode } from '@/utils/llmConfigStorage';
import { generateIdWithPrefix } from '@/utils/idGenerator';

// ============================================================================
// Types - Content Creation
// ============================================================================

export type ContentType =
    | 'character'
    | 'location'
    | 'object'
    | 'dialogue'
    | 'story'
    | 'world'
    | 'scenario'
    | 'image'
    | 'audio'
    | 'video';

export interface ContentDetectionResult {
    type: ContentType;
    confidence: number; // 0-1
    extractedData: Record<string, unknown>;
    missingFields: string[];
    suggestedAction: string;
}

export interface CreationResult {
    success: boolean;
    type: ContentType;
    entity: Record<string, unknown>;
    message: string;
    error?: string;
}

export interface AutoFillResult {
    field: string;
    value: unknown;
    source: 'llm' | 'default' | 'context';
}

// Entity-specific creation params
export interface CharacterCreationParams {
    name?: string;
    archetype?: string;
    role?: string;
    gender?: string;
    age?: string;
    ethnicity?: string;
    personality?: string[];
    appearance?: string;
    backstory?: string;
    description?: string;
    worldContext?: string;
    visualRef?: string; // Base64 image
    prompts?: string[]; // Generation prompts
}

export interface LocationCreationParams {
    name?: string;
    type?: string;
    description?: string;
    atmosphere?: string;
    significance?: string;
    worldContext?: string;
    visualRef?: string; // Base64 image
    prompts?: string[]; // Generation prompts
}

export interface ObjectCreationParams {
    name?: string;
    type?: string;
    description?: string;
    rarity?: string;
    powerLevel?: number;
    abilities?: string[];
    lore?: string;
    material?: string;
    usage?: string;
    worldContext?: string;
    visualRef?: string; // Base64 image
    prompts?: string[]; // Generation prompts
}

export interface DialogueCreationParams {
    characters?: string[];
    topic?: string;
    tone?: string;
    setting?: string;
    genre?: string;
    length?: 'short' | 'medium' | 'long';
}

export interface StoryCreationParams {
    title?: string;
    genre?: string;
    theme?: string;
    characters?: string[];
    setting?: string;
    plotOutline?: string;
    length?: string;
}

export interface WorldCreationParams {
    name?: string;
    genre?: string;
    era?: string;
    description?: string;
    rules?: string[];
    cultures?: string[];
}

export interface ScenarioCreationParams {
    title?: string;
    genre?: string;
    characters?: string[];
    setting?: string;
    conflict?: string;
    resolution?: string;
}

// ============================================================================
// Intent Detection Keywords (multilingual)
// ============================================================================

const INTENT_KEYWORDS: Record<ContentType, { fr: string[]; en: string[] }> = {
    character: {
        fr: ['personnage', 'créer un personnage', 'nouveau personnage', 'héros', 'protagoniste', 'antagoniste', 'pnj', 'créer le personnage', 'générer personnage', 'crée un personnage', 'crée-moi un personnage', 'fais un personnage'],
        en: ['character', 'create a character', 'new character', 'hero', 'protagonist', 'antagonist', 'npc', 'create the character', 'generate character', 'make a character'],
    },
    location: {
        fr: ['lieu', 'location', 'endroit', 'créer un lieu', 'nouveau lieu', 'place', 'emplacement', 'environnement', 'décor', 'crée un lieu', 'crée-moi un lieu'],
        en: ['location', 'place', 'setting', 'create a location', 'new location', 'environment', 'scenery', 'create place'],
    },
    object: {
        fr: ['objet', 'artefact', 'item', 'créer un objet', 'nouvel objet', 'relique', 'arme', 'outil', 'crée un objet'],
        en: ['object', 'artifact', 'item', 'create an object', 'new object', 'relic', 'weapon', 'tool', 'create item'],
    },
    dialogue: {
        fr: ['dialogue', 'conversation', 'réplique', 'créer un dialogue', 'écrire un dialogue', 'crée un dialogue', 'écris un dialogue'],
        en: ['dialogue', 'conversation', 'create dialogue', 'write dialogue', 'create a dialogue', 'write a conversation'],
    },
    story: {
        fr: ['histoire', 'récit', 'conte', 'créer une histoire', 'raconter', 'narration', 'crée une histoire', 'écris une histoire'],
        en: ['story', 'tale', 'create a story', 'write a story', 'narrative', 'create story'],
    },
    world: {
        fr: ['monde', 'univers', 'créer un monde', 'world building', 'construire un monde', 'crée un monde', 'crée un univers'],
        en: ['world', 'universe', 'create a world', 'world building', 'build a world', 'create universe'],
    },
    scenario: {
        fr: ['scénario', 'script', 'screenplay', 'créer un scénario', 'scénariser', 'crée un scénario', 'écris un scénario'],
        en: ['scenario', 'script', 'screenplay', 'create a scenario', 'write a script', 'create screenplay'],
    },
    image: {
        fr: ['image', 'illustration', 'dessin', 'générer une image', 'créer une image', 'portrait', 'visualiser', 'crée une image', 'dessine'],
        en: ['image', 'illustration', 'drawing', 'generate image', 'create image', 'portrait', 'visualize', 'draw'],
    },
    audio: {
        fr: ['audio', 'voix', 'son', 'musique', 'générer audio', 'créer une voix', 'parler', 'tts', 'crée une voix'],
        en: ['audio', 'voice', 'sound', 'music', 'generate audio', 'create voice', 'speak', 'tts'],
    },
    video: {
        fr: ['vidéo', 'animation', 'clip', 'générer vidéo', 'créer une vidéo', 'crée une vidéo', 'anime'],
        en: ['video', 'animation', 'clip', 'generate video', 'create video', 'animate'],
    },
};

// ============================================================================
// Default Names and Values for Auto-Fill
// ============================================================================

const DEFAULT_NAMES = {
    character: {
        fr: ['Aria', 'Kael', 'Lumina', 'Drakon', 'Seraphina', 'Thorin', 'Isadora', 'Fenrir', 'Elara', 'Zephyr'],
        en: ['Aria', 'Kael', 'Lumina', 'Drakon', 'Seraphina', 'Thorin', 'Isadora', 'Fenrir', 'Elara', 'Zephyr'],
    },
    location: {
        fr: ['La Forêt Ancienne', 'Le Bastion d\'Émeraude', 'Les Cavernes de Cristal', 'Le Port des Brumes', 'La Tour Céleste'],
        en: ['The Ancient Forest', 'Emerald Bastion', 'Crystal Caverns', 'Misty Harbor', 'Celestial Tower'],
    },
    object: {
        fr: ['L\'Amulette du Crépuscule', 'La Lame de l\'Aube', 'Le Grimoire des Étoiles', 'Le Calice de Lumière', 'L\'Arc du Destin'],
        en: ['Twilight Amulet', 'Dawn Blade', 'Star Grimoire', 'Light Chalice', 'Destiny Bow'],
    },
    world: {
        fr: ['Eldoria', 'Chronalis', 'Valthéra', 'Arkenmyst', 'Solennara'],
        en: ['Eldoria', 'Chronalis', 'Valthera', 'Arkenmyst', 'Solennara'],
    },
};

// ============================================================================
// ContentCreationService
// ============================================================================

class ContentCreationServiceImpl {
    private static instance: ContentCreationServiceImpl;

    static getInstance(): ContentCreationServiceImpl {
        if (!ContentCreationServiceImpl.instance) {
            ContentCreationServiceImpl.instance = new ContentCreationServiceImpl();
        }
        return ContentCreationServiceImpl.instance;
    }

    // ---------------------------------------------------------------------------
    // Intent Detection - Detect what the user wants to create
    // ---------------------------------------------------------------------------

    detectCreationIntent(userMessage: string, assistantResponse: string, language: LanguageCode = 'fr'): ContentDetectionResult | null {
        const combinedText = `${userMessage} ${assistantResponse}`.toLowerCase();
        const langKey = language === 'fr' ? 'fr' : 'en';

        let bestMatch: ContentDetectionResult | null = null;
        let highestConfidence = 0;

        for (const [contentType, keywords] of Object.entries(INTENT_KEYWORDS)) {
            const langKeywords = keywords[langKey] || keywords['en'];
            let matchCount = 0;

            for (const keyword of langKeywords) {
                if (combinedText.includes(keyword.toLowerCase())) {
                    matchCount++;
                }
            }

            if (matchCount > 0) {
                const confidence = Math.min(matchCount / 3, 1); // Normalize to 0-1
                if (confidence > highestConfidence) {
                    highestConfidence = confidence;
                    bestMatch = {
                        type: contentType as ContentType,
                        confidence,
                        extractedData: this.extractDataFromText(contentType as ContentType, combinedText, langKey),
                        missingFields: this.getMissingFields(contentType as ContentType, {}),
                        suggestedAction: this.getSuggestedAction(contentType as ContentType, langKey),
                    };
                }
            }
        }

        // Only return if confidence is above threshold
        return bestMatch && bestMatch.confidence >= 0.3 ? bestMatch : null;
    }

    // ---------------------------------------------------------------------------
    // Data Extraction from Text
    // ---------------------------------------------------------------------------

    private extractDataFromText(type: ContentType, text: string, lang: string): Record<string, unknown> {
        const data: Record<string, unknown> = {};

        // Try to extract a name using quotes or "called/named" patterns
        const namePatterns = lang === 'fr'
            ? [/(?:appelé|nommé|intitulé|s'appelle)\s+"?([^",.]+)"?/i, /"([^"]+)"/]
            : [/(?:called|named|titled)\s+"?([^",.]+)"?/i, /"([^"]+)"/];

        for (const pattern of namePatterns) {
            const match = text.match(pattern);
            if (match) {
                data.name = match[1].trim();
                break;
            }
        }

        // Type-specific extractions
        switch (type) {
            case 'character': {
                // Gender
                if (/\b(femme|féminin|female|woman|girl|fille)\b/i.test(text)) data.gender = 'female';
                else if (/\b(homme|masculin|male|man|boy|garçon)\b/i.test(text)) data.gender = 'male';

                // Role
                if (/\b(héros|hero|protagoniste|protagonist)\b/i.test(text)) data.role = 'protagonist';
                else if (/\b(méchant|villain|antagoniste|antagonist)\b/i.test(text)) data.role = 'antagonist';
                else if (/\b(mentor|sage|wise)\b/i.test(text)) data.role = 'mentor';

                // Archetype
                if (/\b(guerrier|warrior|fighter)\b/i.test(text)) data.archetype = 'warrior';
                else if (/\b(mage|magicien|wizard|sorcerer)\b/i.test(text)) data.archetype = 'mage';
                else if (/\b(voleur|thief|rogue)\b/i.test(text)) data.archetype = 'rogue';
                break;
            }
            case 'location': {
                if (/\b(forêt|forest|bois|woods)\b/i.test(text)) data.type = 'forest';
                else if (/\b(ville|city|cité|town)\b/i.test(text)) data.type = 'city';
                else if (/\b(grotte|cave|caverne|cavern)\b/i.test(text)) data.type = 'cave';
                else if (/\b(montagne|mountain|pic|peak)\b/i.test(text)) data.type = 'mountain';
                else if (/\b(château|castle|forteresse|fortress)\b/i.test(text)) data.type = 'castle';
                break;
            }
            case 'object': {
                if (/\b(épée|sword|lame|blade)\b/i.test(text)) data.type = 'weapon';
                else if (/\b(amulette|amulet|collier|necklace)\b/i.test(text)) data.type = 'amulet';
                else if (/\b(livre|book|grimoire|tome)\b/i.test(text)) data.type = 'book';
                else if (/\b(potion|élixir|elixir|fiole)\b/i.test(text)) data.type = 'potion';

                if (/\b(légendaire|legendary)\b/i.test(text)) data.rarity = 'legendary';
                else if (/\b(rare)\b/i.test(text)) data.rarity = 'rare';
                else if (/\b(épique|epic)\b/i.test(text)) data.rarity = 'epic';
                break;
            }
            case 'story':
            case 'scenario': {
                if (/\b(fantaisie|fantasy|fantastique)\b/i.test(text)) data.genre = 'fantasy';
                else if (/\b(science-fiction|sci-fi|futuriste)\b/i.test(text)) data.genre = 'sci-fi';
                else if (/\b(horreur|horror|terreur)\b/i.test(text)) data.genre = 'horror';
                else if (/\b(romance|amour|love)\b/i.test(text)) data.genre = 'romance';
                break;
            }
            case 'world': {
                if (/\b(médiéval|medieval)\b/i.test(text)) data.era = 'medieval';
                else if (/\b(futuriste|futuristic|cyberpunk)\b/i.test(text)) data.era = 'futuristic';
                else if (/\b(contemporain|modern|contemporary)\b/i.test(text)) data.era = 'modern';
                break;
            }
        }

        return data;
    }

    // ---------------------------------------------------------------------------
    // Missing Fields Detection
    // ---------------------------------------------------------------------------

    private getMissingFields(type: ContentType, data: Record<string, unknown>): string[] {
        const requiredFields: Record<ContentType, string[]> = {
            character: ['name', 'role', 'gender'],
            location: ['name', 'type'],
            object: ['name', 'type'],
            dialogue: ['characters', 'topic'],
            story: ['title', 'genre'],
            world: ['name', 'genre'],
            scenario: ['title', 'genre'],
            image: ['prompt'],
            audio: ['text'],
            video: ['prompt'],
        };

        const required = requiredFields[type] || [];
        return required.filter(field => !data[field]);
    }

    // ---------------------------------------------------------------------------
    // Suggested Actions
    // ---------------------------------------------------------------------------

    private getSuggestedAction(type: ContentType, lang: string): string {
        const actions: Record<ContentType, Record<string, string>> = {
            character: { fr: '✨ Créer ce personnage', en: '✨ Create this character' },
            location: { fr: '📍 Créer ce lieu', en: '📍 Create this location' },
            object: { fr: '🎒 Créer cet objet', en: '🎒 Create this object' },
            dialogue: { fr: '💬 Générer ce dialogue', en: '💬 Generate this dialogue' },
            story: { fr: '📖 Créer cette histoire', en: '📖 Create this story' },
            world: { fr: '🌍 Créer ce monde', en: '🌍 Create this world' },
            scenario: { fr: '🎬 Créer ce scénario', en: '🎬 Create this scenario' },
            image: { fr: '🖼️ Générer cette image', en: '🖼️ Generate this image' },
            audio: { fr: '🎤 Générer cet audio', en: '🎤 Generate this audio' },
            video: { fr: '🎥 Générer cette vidéo', en: '🎥 Generate this video' },
        };

        return actions[type]?.[lang] || actions[type]?.['en'] || '✨ Create';
    }

    // ---------------------------------------------------------------------------
    // Auto-Fill Missing Data
    // ---------------------------------------------------------------------------

    async autoFillMissingData(
        type: ContentType,
        partialData: Record<string, unknown>,
        worldContext?: string,
        language: LanguageCode = 'fr'
    ): Promise<Record<string, unknown>> {
        const filledData = { ...partialData };
        const langKey = language === 'fr' ? 'fr' : 'en';

        // Auto-generate name if missing
        if (!filledData.name && (type === 'character' || type === 'location' || type === 'object' || type === 'world')) {
            const names = DEFAULT_NAMES[type]?.[langKey] || DEFAULT_NAMES[type]?.['en'] || ['Unnamed'];
            filledData.name = names[Math.floor(Math.random() * names.length)];

            // Try to use LLM for a better name
            try {
                const llmService = llmConfigService.getService();
                if (!llmService) {
                    throw new Error('LLM Service not configured');
                }
                const namePrompt = language === 'fr'
                    ? `Génère un seul nom unique et créatif pour un(e) ${type} dans un univers ${worldContext || 'fantastique'}. Réponds uniquement avec le nom, sans explication.`
                    : `Generate a single unique creative name for a ${type} in a ${worldContext || 'fantasy'} universe. Reply only with the name, no explanation.`;

                const response = await llmService.generateCompletion({
                    prompt: namePrompt,
                    maxTokens: 50,
                    temperature: 0.9,
                });

                if (response.success && response.data?.content) {
                    const generatedName = response.data.content.trim().replace(/["\n]/g, '');
                    if (generatedName.length > 0 && generatedName.length < 100) {
                        filledData.name = generatedName;
                    }
                }
            } catch (e) {
                logger.warn('Failed to generate name via LLM, using default', e);
            }
        }

        // Auto-fill description if missing
        if (!filledData.description && type !== 'dialogue' && type !== 'image' && type !== 'audio' && type !== 'video') {
            try {
                const llmService = llmConfigService.getService();
                if (!llmService) {
                    throw new Error('LLM Service not configured');
                }
                const descPrompt = language === 'fr'
                    ? `Génère une courte description (2-3 phrases) pour ${type === 'character' ? `le personnage ${filledData.ethnicity ? filledData.ethnicity : ''}` : type === 'location' ? 'le lieu' : type === 'object' ? 'l\'objet' : type === 'world' ? 'le monde' : 'le contenu'} "${filledData.name || 'inconnu'}" dans un contexte ${worldContext || 'fantastique'}. Réponds uniquement avec la description.`
                    : `Generate a short description (2-3 sentences) for the ${type} ${type === 'character' && filledData.ethnicity ? filledData.ethnicity : ''} "${filledData.name || 'unknown'}" in a ${worldContext || 'fantasy'} context. Reply only with the description.`;

                const response = await llmService.generateCompletion({
                    prompt: descPrompt,
                    maxTokens: 200,
                    temperature: 0.7,
                });

                if (response.success && response.data?.content) {
                    filledData.description = response.data.content.trim();
                }
            } catch (e) {
                logger.warn('Failed to generate description via LLM', e);
                filledData.description = language === 'fr'
                    ? `Description de ${filledData.name || type} - à compléter.`
                    : `Description of ${filledData.name || type} - to be completed.`;
            }
        }

        // Type-specific auto-fill
        switch (type) {
            case 'character': {
                if (!filledData.gender) filledData.gender = Math.random() > 0.5 ? 'female' : 'male';
                if (!filledData.role) filledData.role = 'supporting';
                if (!filledData.archetype) filledData.archetype = 'explorer';
                break;
            }
            case 'location': {
                if (!filledData.type) filledData.type = 'landmark';
                if (!filledData.atmosphere) filledData.atmosphere = language === 'fr' ? 'mystérieux' : 'mysterious';
                break;
            }
            case 'object': {
                if (!filledData.type) filledData.type = 'artifact';
                if (!filledData.rarity) filledData.rarity = 'uncommon';
                if (!filledData.powerLevel) filledData.powerLevel = Math.floor(Math.random() * 5) + 1;
                break;
            }
            case 'story':
            case 'scenario': {
                if (!filledData.genre) filledData.genre = 'fantasy';
                if (!filledData.title && filledData.name) filledData.title = filledData.name;
                break;
            }
            case 'world': {
                if (!filledData.genre) filledData.genre = 'fantasy';
                if (!filledData.era) filledData.era = 'medieval';
                break;
            }
        }

        return filledData;
    }

    // ---------------------------------------------------------------------------
    // Create Content - Main Entry Point
    // ---------------------------------------------------------------------------

    async createContent(
        type: ContentType,
        partialData: Record<string, unknown>,
        worldContext?: string,
        language: LanguageCode = 'fr'
    ): Promise<CreationResult> {
        try {
            // Step 1: Auto-fill missing data
            const completeData = await this.autoFillMissingData(type, partialData, worldContext, language);

            // Step 2: Create the entity via appropriate service
            const entity = await this.executeCreation(type, completeData, worldContext, language);

            // Step 3: Generate success message
            const message = this.getSuccessMessage(type, entity, language);

            return {
                success: true,
                type,
                entity,
                message,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Content creation failed for ${type}:`, error);

            return {
                success: false,
                type,
                entity: partialData,
                message: language === 'fr'
                    ? `❌ Erreur lors de la création du ${type}: ${errorMessage}`
                    : `❌ Error creating ${type}: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }

    // ---------------------------------------------------------------------------
    // Create from LLM Response - Uses Parser to Extract Data
    // ---------------------------------------------------------------------------

    /**
     * Create content by parsing an LLM response for structured data.
     * Uses LLMResponseParser to extract entities, then merges with any
     * partial data provided by the user.
     */
    async createFromLLMResponse(
        llmResponse: string,
        type: ContentType,
        additionalData: Record<string, unknown> = {},
        worldContext?: string,
        language: LanguageCode = 'fr'
    ): Promise<CreationResult> {
        try {
            // Step 1: Parse the LLM response for structured entity data
            const parsed = llmResponseParser.parseForType(llmResponse, type, language);

            // Step 2: Merge parsed data with user-provided data (user data takes priority)
            const mergedData = {
                ...(parsed?.data || {}),
                ...additionalData,
            };

            logger.info(`[ContentCreation] Creating ${type} from LLM response. Parsed fields: ${Object.keys(parsed?.data || {}).join(', ')}, confidence: ${parsed?.confidence || 0}`);

            // Step 3: Create via standard flow (which includes auto-fill for any remaining gaps)
            return await this.createContent(type, mergedData, worldContext, language);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Content creation from LLM response failed for ${type}:`, error);

            return {
                success: false,
                type,
                entity: additionalData,
                message: language === 'fr'
                    ? `❌ Erreur lors de la création à partir de la réponse LLM: ${errorMessage}`
                    : `❌ Error creating from LLM response: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }

    // ---------------------------------------------------------------------------
    // Execute Creation via Appropriate Service
    // ---------------------------------------------------------------------------

    private async executeCreation(
        type: ContentType,
        data: Record<string, unknown>,
        worldContext?: string,
        language: LanguageCode = 'fr'
    ): Promise<Record<string, unknown>> {
        const id = generateIdWithPrefix(type);
        const now = Date.now();

        // Helper for data URIs
        const formatImage = (base64: string | undefined) => {
            if (!base64) return undefined;
            return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
        };

        const charData = data as CharacterCreationParams;
        const locData = data as LocationCreationParams;
        const objData = data as ObjectCreationParams;

        switch (type) {
            case 'character': {
                return {
                    id,
                    name: charData.name,
                    archetype: charData.archetype || 'explorer',
                    role: charData.role || 'supporting',
                    gender: charData.gender || 'neutral',
                    age: charData.age || '',
                    ethnicity: charData.ethnicity || '',
                    description: charData.description || '',
                    personality: charData.personality || [],
                    appearance: charData.appearance || '',
                    backstory: charData.backstory || '',
                    visual_identity: {
                        physical_description: charData.appearance || charData.description || '',
                        generated_portrait: formatImage(charData.visualRef),
                    },
                    prompts: charData.prompts || [],
                    creation_timestamp: now,
                    last_modified: now,
                };
            }

            case 'location': {
                return {
                    id,
                    name: locData.name,
                    type: locData.type || 'landmark',
                    metadata: {
                        description: locData.description || '',
                        atmosphere: locData.atmosphere || '',
                        significance: locData.significance || '',
                        thumbnail_path: formatImage(locData.visualRef),
                    },
                    prompts: locData.prompts || [],
                    coordinates: { x: 0, y: 0 },
                    connectedLocations: [],
                    creation_timestamp: now,
                    last_modified: now,
                };
            }

            case 'object': {
                return {
                    id,
                    name: objData.name,
                    type: objData.type || 'artifact',
                    description: objData.description || '',
                    rarity: objData.rarity || 'uncommon',
                    properties: {
                        material: objData.material || '',
                        usage: objData.usage || '',
                    },
                    power: objData.powerLevel || (objData as any).power || 1,
                    abilities: objData.abilities || [],
                    lore: (objData as any).lore || '',
                    imageUrl: formatImage(objData.visualRef),
                    prompts: objData.prompts || [],
                    generatedBy: 'ai',
                    createdAt: now,
                    updatedAt: now,
                };
            }

            case 'dialogue': {
                // Generate dialogue using LLM
                const dialogueLines = await this.generateDialogueViaLLM(data, language);
                return {
                    id,
                    title: data.topic || (language === 'fr' ? 'Nouveau Dialogue' : 'New Dialogue'),
                    characters: data.characters || [],
                    lines: dialogueLines,
                    genre: data.genre || '',
                    tone: data.tone || 'neutral',
                    setting: data.setting || '',
                    createdAt: now,
                };
            }

            case 'story': {
                return {
                    id,
                    title: data.title || data.name || (language === 'fr' ? 'Nouvelle Histoire' : 'New Story'),
                    genre: Array.isArray(data.genre) ? data.genre : [data.genre || 'fantasy'],
                    tone: Array.isArray(data.tone) ? data.tone : [data.tone || 'neutral'],
                    summary: data.description || data.summary || '',
                    charactersUsed: (Array.isArray(data.characters) ? data.characters : []).map((c: any) => {
                        const char = typeof c === 'object' ? c : { name: String(c) };
                        return {
                            id: (char as any).id || crypto.randomUUID(),
                            name: (char as any).name || 'Unnamed',
                            role: (char as any).role || '',
                        };
                    }),
                    locationsUsed: (Array.isArray(data.locations) ? data.locations : []).map((l: any) => ({
                        id: (l as any).id || generateIdWithPrefix('loc'),
                        name: (l as any).name || String(l),
                        description: (l as any).description || '',
                    })),
                    autoGeneratedElements: [],
                    content: '',
                    createdAt: now,
                    updatedAt: now,
                    version: 1,
                    length: data.length || 'medium',
                };
            }

            case 'world': {
                return {
                    id,
                    name: data.name as string,
                    genre: Array.isArray(data.genre) ? data.genre : [data.genre || 'fantasy'],
                    timePeriod: data.era || data.timePeriod || 'medieval',
                    tone: Array.isArray(data.tone) ? data.tone : [data.tone || 'neutral'],
                    atmosphere: data.description || data.atmosphere || '',
                    rules: data.rules || [],
                    culturalElements: {
                        languages: Array.isArray(data.languages) ? data.languages : [],
                        religions: Array.isArray(data.religions) ? data.religions : [],
                        traditions: Array.isArray(data.traditions) ? data.traditions : [],
                        historicalEvents: Array.isArray(data.historicalEvents) ? data.historicalEvents : [],
                        culturalConflicts: Array.isArray(data.culturalConflicts) ? data.culturalConflicts : [],
                        ...(typeof data.cultures === 'object' ? data.cultures as any : {})
                    },
                    locations: [],
                    createdAt: now,
                    updatedAt: now,
                    creation_timestamp: new Date(now).toISOString(),
                };
            }

            case 'scenario': {
                const summary = [
                    data.setting ? `${language === 'fr' ? 'Cadre' : 'Setting'}: ${data.setting}` : '',
                    data.conflict ? `${language === 'fr' ? 'Conflit' : 'Conflict'}: ${data.conflict}` : '',
                    data.resolution ? `${language === 'fr' ? 'Résolution' : 'Resolution'}: ${data.resolution}` : ''
                ].filter(Boolean).join('\n\n');

                return {
                    id,
                    title: data.title || data.name || (language === 'fr' ? 'Nouveau Scénario' : 'New Scenario'),
                    content: '', // Scenarios are initially empty content, just metadata/structure
                    summary,
                    genre: Array.isArray(data.genre) ? data.genre : [data.genre || (language === 'fr' ? 'fantaisie' : 'fantasy')],
                    tone: Array.isArray(data.tone) ? data.tone : [data.tone || 'neutral'],
                    length: (data.length as 'scene' | 'act' | 'chapter' | 'full') || 'scene',
                    charactersUsed: (Array.isArray(data.characters) ? data.characters : []).map((c: any) => {
                        const char = typeof c === 'object' ? c : { name: String(c) };
                        return {
                            id: char.id || generateIdWithPrefix('char'),
                            name: char.name || 'Unnamed',
                            role: char.role || '',
                        };
                    }),
                    locationsUsed: [],
                    autoGeneratedElements: [],
                    createdAt: now,
                    updatedAt: now,
                    version: 1,
                    fileFormat: 'md'
                };
            }
            case 'image': {
                // Generate image via ComfyUI / GenerationOrchestrator
                const prompt = (data.prompt || data.description || data.name || '') as string;
                if (!prompt) {
                    return {
                        id,
                        error: language === 'fr' ? 'Un prompt est requis pour générer une image' : 'A prompt is required to generate an image',
                        createdAt: now,
                    };
                }

                try {
                    const imageResult = await generationOrchestrator.generateImage({
                        prompt,
                        negativePrompt: (data.negativePrompt as string) || 'low quality, blurry, distorted',
                        width: (data.width as number) || 1024,
                        height: (data.height as number) || 1024,
                        steps: (data.steps as number) || 20,
                        cfgScale: (data.cfgScale as number) || 7.0,
                        seed: (data.seed as number) || Math.floor(Math.random() * 2147483647),
                        sampler: (data.sampler as string) || 'euler',
                        scheduler: (data.scheduler as string) || 'normal',
                    });

                    return {
                        id,
                        type: 'image',
                        prompt,
                        url: imageResult.url,
                        metadata: imageResult.metadata,
                        createdAt: now,
                    };
                } catch (imgError) {
                    logger.error('[ContentCreation] Image generation failed:', imgError);
                    return {
                        id,
                        type: 'image',
                        prompt,
                        error: imgError instanceof Error ? imgError.message : 'Image generation failed',
                        createdAt: now,
                    };
                }
            }

            case 'audio': {
                // Generate audio via TTS / GenerationOrchestrator
                const text = (data.text || data.content || data.description || '') as string;
                if (!text) {
                    return {
                        id,
                        error: language === 'fr' ? 'Un texte est requis pour générer de l\'audio' : 'Text is required to generate audio',
                        createdAt: now,
                    };
                }

                try {
                    const voiceTypeRaw = (data.voiceType as string) || 'neutral';
                    const voiceType = (['male', 'female', 'neutral'].includes(voiceTypeRaw) ? voiceTypeRaw : 'neutral') as 'male' | 'female' | 'neutral';
                    const emotionRaw = (data.emotion as string) || 'neutral';
                    const emotion = (['neutral', 'happy', 'sad', 'excited', 'calm'].includes(emotionRaw) ? emotionRaw : 'neutral') as 'neutral' | 'happy' | 'sad' | 'excited' | 'calm';

                    const audioResult = await generationOrchestrator.generateAudio({
                        text,
                        voiceType,
                        speed: (data.speed as number) || 1.0,
                        pitch: (data.pitch as number) || 1.0,
                        language: (data.audioLanguage as string) || language,
                        emotion,
                    });

                    return {
                        id,
                        type: 'audio',
                        text,
                        url: audioResult.url,
                        duration: audioResult.metadata?.duration,
                        metadata: audioResult.metadata,
                        createdAt: now,
                    };
                } catch (audioError) {
                    logger.error('[ContentCreation] Audio generation failed:', audioError);
                    return {
                        id,
                        type: 'audio',
                        text,
                        error: audioError instanceof Error ? audioError.message : 'Audio generation failed',
                        createdAt: now,
                    };
                }
            }

            case 'video': {
                // Generate video via ComfyUI video pipeline / GenerationOrchestrator
                const videoPrompt = (data.prompt || data.description || data.name || '') as string;
                if (!videoPrompt) {
                    return {
                        id,
                        error: language === 'fr' ? 'Un prompt est requis pour générer une vidéo' : 'A prompt is required to generate a video',
                        createdAt: now,
                    };
                }

                try {
                    const videoResult = await generationOrchestrator.generateVideo({
                        inputImagePath: (data.inputImagePath as string) || '',
                        prompt: videoPrompt,
                        frameCount: (data.frameCount as number) || 16,
                        frameRate: (data.frameRate as number) || 8,
                        width: (data.width as number) || 512,
                        height: (data.height as number) || 512,
                        motionStrength: (data.motionStrength as number) || 0.5,
                    });

                    return {
                        id,
                        type: 'video',
                        prompt: videoPrompt,
                        url: videoResult.url,
                        metadata: videoResult.metadata,
                        createdAt: now,
                    };
                } catch (vidError) {
                    logger.error('[ContentCreation] Video generation failed:', vidError);
                    return {
                        id,
                        type: 'video',
                        prompt: videoPrompt,
                        error: vidError instanceof Error ? vidError.message : 'Video generation failed',
                        createdAt: now,
                    };
                }
            }

            default:
                return { id, ...data, createdAt: now };
        }
    }

    // ---------------------------------------------------------------------------
    // Dialogue Generation via LLM
    // ---------------------------------------------------------------------------

    private async generateDialogueViaLLM(
        data: Record<string, unknown>,
        language: LanguageCode
    ): Promise<Array<{ character: string; text: string; emotion: string }>> {
        try {
            const llmService = llmConfigService.getService();
            if (!llmService) {
                 throw new Error('LLM Service not configured');
            }
            const characters = (data.characters as string[]) || ['Character A', 'Character B'];
            const topic = (data.topic as string) || (language === 'fr' ? 'une discussion' : 'a conversation');

            const prompt = language === 'fr'
                ? `Écris un court dialogue (5-8 répliques) entre ${characters.join(' et ')} sur le sujet : ${topic}. Ton : ${data.tone || 'neutre'}.
Format : JSON array avec les champs "character", "text", "emotion" pour chaque réplique.
Exemple : [{"character": "Alice", "text": "Bonjour !", "emotion": "joyeux"}]
Réponds uniquement avec le JSON.`
                : `Write a short dialogue (5-8 lines) between ${characters.join(' and ')} about: ${topic}. Tone: ${data.tone || 'neutral'}.
Format: JSON array with "character", "text", "emotion" fields.
Reply only with JSON.`;

            const response = await llmService.generateCompletion({
                prompt,
                maxTokens: 500,
                temperature: 0.8,
            });

            if (response.success && response.data?.content) {
                try {
                    // Try to parse JSON from response
                    const content = response.data.content.trim();
                    const jsonMatch = content.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    }
                } catch {
                    logger.warn('Failed to parse dialogue JSON');
                }
            }
        } catch (e) {
            logger.warn('Failed to generate dialogue via LLM', e);
        }

        // Return default dialogue
        return [
            { character: 'Character A', text: language === 'fr' ? 'Bonjour !' : 'Hello!', emotion: 'neutral' },
            { character: 'Character B', text: language === 'fr' ? 'Bonjour, comment ça va ?' : 'Hi, how are you?', emotion: 'friendly' },
        ];
    }

    // ---------------------------------------------------------------------------
    // Success Messages
    // ---------------------------------------------------------------------------

    private getSuccessMessage(type: ContentType, entity: Record<string, unknown>, language: LanguageCode): string {
        const name = (entity.name || entity.title || '') as string;

        const messages: Record<ContentType, Record<string, string>> = {
            character: {
                fr: `✅ Personnage "${name}" créé avec succès ! Vous pouvez le retrouver dans le panel Personnages.`,
                en: `✅ Character "${name}" created successfully! You can find it in the Characters panel.`,
            },
            location: {
                fr: `✅ Lieu "${name}" créé avec succès ! Vous pouvez le retrouver dans le World Builder.`,
                en: `✅ Location "${name}" created successfully! You can find it in the World Builder.`,
            },
            object: {
                fr: `✅ Objet "${name}" créé avec succès ! Il apparaît dans l'inventaire.`,
                en: `✅ Object "${name}" created successfully! It appears in the inventory.`,
            },
            dialogue: {
                fr: `✅ Dialogue créé avec succès ! ${(entity.lines as unknown[])?.length || 0} répliques générées.`,
                en: `✅ Dialogue created successfully! ${(entity.lines as unknown[])?.length || 0} lines generated.`,
            },
            story: {
                fr: `✅ Histoire "${name}" créée avec succès !`,
                en: `✅ Story "${name}" created successfully!`,
            },
            world: {
                fr: `✅ Monde "${name}" créé avec succès !`,
                en: `✅ World "${name}" created successfully!`,
            },
            scenario: {
                fr: `✅ Scénario "${name}" créé avec succès !`,
                en: `✅ Scenario "${name}" created successfully!`,
            },
            image: {
                fr: `✅ Image générée avec succès !`,
                en: `✅ Image generated successfully!`,
            },
            audio: {
                fr: `✅ Audio généré avec succès !`,
                en: `✅ Audio generated successfully!`,
            },
            video: {
                fr: `✅ Vidéo générée avec succès !`,
                en: `✅ Video generated successfully!`,
            },
        };

        return messages[type]?.[language] || messages[type]?.['en'] || '✅ Created!';
    }

    // ---------------------------------------------------------------------------
    // Get Creation Action Buttons for Chat UI
    // ---------------------------------------------------------------------------

    getCreationButtons(detectedIntent: ContentDetectionResult | null, language: LanguageCode = 'fr'): Array<{
        id: string;
        label: string;
        icon: string;
        type: ContentType;
        data: Record<string, unknown>;
    }> {
        if (!detectedIntent) return [];

        const buttons = [{
            id: `create-${detectedIntent.type}-${Date.now()}`,
            label: detectedIntent.suggestedAction,
            icon: this.getTypeIcon(detectedIntent.type),
            type: detectedIntent.type,
            data: detectedIntent.extractedData,
        }];

        return buttons;
    }

    // ---------------------------------------------------------------------------
    // Get All Quick Creation Buttons (always visible in chat)
    // ---------------------------------------------------------------------------

    getQuickCreationButtons(language: LanguageCode = 'fr'): Array<{
        id: string;
        label: string;
        icon: string;
        type: ContentType;
    }> {
        const lang = language === 'fr' ? 'fr' : 'en';

        return [
            { id: 'quick-character', label: lang === 'fr' ? 'Personnage' : 'Character', icon: '👤', type: 'character' as ContentType },
            { id: 'quick-location', label: lang === 'fr' ? 'Lieu' : 'Location', icon: '📍', type: 'location' as ContentType },
            { id: 'quick-object', label: lang === 'fr' ? 'Objet' : 'Object', icon: '🎒', type: 'object' as ContentType },
            { id: 'quick-dialogue', label: lang === 'fr' ? 'Dialogue' : 'Dialogue', icon: '💬', type: 'dialogue' as ContentType },
            { id: 'quick-story', label: lang === 'fr' ? 'Histoire' : 'Story', icon: '📖', type: 'story' as ContentType },
            { id: 'quick-world', label: lang === 'fr' ? 'Monde' : 'World', icon: '🌍', type: 'world' as ContentType },
            { id: 'quick-scenario', label: lang === 'fr' ? 'Scénario' : 'Scenario', icon: '🎬', type: 'scenario' as ContentType },
        ];
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private getTypeIcon(type: ContentType): string {
        const icons: Record<ContentType, string> = {
            character: '👤',
            location: '📍',
            object: '🎒',
            dialogue: '💬',
            story: '📖',
            world: '🌍',
            scenario: '🎬',
            image: '🖼️',
            audio: '🎤',
            video: '🎥',
        };
        return icons[type] || '✨';
    }
}

// Export singleton
export const contentCreationService = ContentCreationServiceImpl.getInstance();
export type { ContentCreationServiceImpl as ContentCreationServiceType };
