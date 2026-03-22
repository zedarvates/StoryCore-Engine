// ============================================================================
// Story Generation Service
// ============================================================================
// This service handles LLM-based story generation, including:
// - Story content generation from parameters
// - Story summary generation
// - Character creation with world context
// - Location creation with world context
// ============================================================================

import {
  Story,
  StoryGenerationParams,
  CharacterCreationRequest,
  LocationCreationRequest,
  WorldContext,
  GenerationProgress,
  GeneratedCharacterResult,
  GeneratedLocationResult,
  AdvancedBackendResponse,
  AdvancedBackendCharacter,
  AdvancedBackendLocation,
  AdvancedBackendScene,
} from '../types/story';
import type { LLMService } from './llmService';

// ============================================================================
// LLM Prompt Templates
// ============================================================================

export const STORY_GENERATION_PROMPT = `
[ROLE] You are a master cinematic storyteller and world-class novelist.
[TASK] Generate a highly detailed, immersive, and VERBOSE narrative based on these parameters:

Genre: {genre}
Tone: {tone}
Target Length: {length} words

Characters:
{characterDescriptions}

Locations:
{locationDescriptions}

World Context:
{worldContext}

[STORYTELLING RULES]
1. Show, Don't Tell: Use rich sensory details (smell, sound, texture) to bring scenes to life.
2. Dialogue Mastery: Write meaningful, character-driven dialogue with subtext and distinct voices.
3. Cinematic Depth: Describe camera-like movements, lighting changes, and atmosphere with poetic precision.
4. Emotional Resonance: Explore the internal monologues and emotional states of characters deeply.
5. Narrative Arc: Ensure a complex structure with rising tension, meaningful stakes, and a profound resolution.

[FORMAT] Output the complete story in a beautiful Markdown format. Be extremely verbose, descriptive, and expansive. No meta-commentary.
`;


export const SUMMARY_GENERATION_PROMPT = `
You are a story analysis assistant. Generate a concise summary of the following story:

{storyContent}

Create a summary that includes:
- Main plot points
- Key character roles and development
- Important locations and events
- Overall narrative arc

Keep the summary to 3-5 sentences.
`;

export const CHARACTER_CREATION_PROMPT = `
You are a character creation assistant. Generate a complete character based on:

Name: {name}
Role: {role}
Description: {description}

World Context:
{worldContext}

Create a character that:
- Fits the world's genre, tone, and rules
- Has consistent visual identity
- Has believable personality traits
- Has appropriate background and relationships

Output a JSON object matching the Character interface.
`;

export const LOCATION_CREATION_PROMPT = `
You are a location creation assistant. Generate a complete location based on:

Name: {name}
Type: {type}
Description: {description}

World Context:
{worldContext}

Create a location that:
- Fits the world's genre, tone, and atmosphere
- Has vivid sensory details
- Has clear significance to the world
- Respects world rules and cultural elements

Output a JSON object matching the Location interface.
`;

// ============================================================================
// Dynamic Timeout Configuration
// ============================================================================

/**
 * Calculate timeout based on story length
 * @param length Story length identifier
 * @returns Timeout in milliseconds
 */
export function getTimeoutForStoryLength(length: string): number {
  const timeoutMap: Record<string, number> = {
    short: 120000,      // 2 minutes
    medium: 180000,     // 3 minutes
    long: 300000,       // 5 minutes
    novel: 600000,      // 10 minutes
    epic_novel: 900000, // 15 minutes
    scene: 120000,      // 2 minutes
    short_story: 180000, // 3 minutes
    novella: 300000,    // 5 minutes
  };
  return timeoutMap[length] || 300000; // Default 5 minutes
}

// ============================================================================
// Helper Functions for Building Descriptions
// ============================================================================

/**
 * Build character description for prompt
 * @param char Character data
 * @returns Formatted character description string
 */
function buildCharacterDescription(char: unknown): string {
  const c = char as {
    name?: string;
    archetype?: string;
    role?: string;
    personality_traits?: string[];
    backstory?: string;
    visual_identity?: {
      hair_color?: string;
      eye_color?: string;
      build?: string;
    }
  };
  const parts = [
    `**${c.name || 'Unknown'}** (${c.archetype || c.role || 'Character'})`,
  ];

  if (c.personality_traits && c.personality_traits.length > 0) {
    parts.push(`  Personality: ${c.personality_traits.join(', ')}`);
  }

  if (c.backstory) {
    parts.push(`  Background: ${c.backstory}`);
  }

  if (c.visual_identity) {
    const visual = c.visual_identity;
    const visualParts = [];
    if (visual.hair_color) visualParts.push(`${visual.hair_color} hair`);
    if (visual.eye_color) visualParts.push(`${visual.eye_color} eyes`);
    if (visual.build) visualParts.push(`${visual.build} build`);
    if (visualParts.length > 0) {
      parts.push(`  Appearance: ${visualParts.join(', ')}`);
    }
  }

  return parts.join('\n');
}

/**
 * Build location description for prompt
 * @param loc Location data
 * @returns Formatted location description string
 */
function buildLocationDescription(loc: unknown): string {
  const l = loc as {
    name?: string;
    type?: string;
    description?: string;
    atmosphere?: string;
    significance?: string;
  };
  const parts = [
    `**${l.name || 'Unknown'}** (${l.type || 'Location'})`,
  ];

  if (l.description) {
    parts.push(`  ${l.description}`);
  }

  if (l.atmosphere) {
    parts.push(`  Atmosphere: ${l.atmosphere}`);
  }

  if (l.significance) {
    parts.push(`  Significance: ${l.significance}`);
  }

  return parts.join('\n');
}

/**
 * Build world context description for prompts
 * @param worldContext World context data
 * @returns Array of world context description lines
 */
function buildWorldContextDescription(worldContext: WorldContext | undefined): string[] {
  const worldContextDescription: string[] = [];

  if (!worldContext) {
    return worldContextDescription;
  }

  if (worldContext.name) {
    worldContextDescription.push(`World: ${worldContext.name}`);
  }

  if (worldContext.atmosphere) {
    worldContextDescription.push(`Atmosphere: ${worldContext.atmosphere}`);
  }

  if (worldContext.rules && worldContext.rules.length > 0) {
    worldContextDescription.push('\nWorld Rules:');
    worldContext.rules.forEach((rule) => {
      worldContextDescription.push(`- ${rule.rule}: ${rule.description}`);
    });
  }

  if (worldContext.culturalElements) {
    const cultural = worldContext.culturalElements;
    if (cultural.languages && cultural.languages.length > 0) {
      worldContextDescription.push(`\nLanguages: ${cultural.languages.join(', ')}`);
    }
    if (cultural.customs && cultural.customs.length > 0) {
      worldContextDescription.push(`Customs: ${cultural.customs.join(', ')}`);
    }
    if (cultural.socialStructure) {
      worldContextDescription.push(`Social Structure: ${cultural.socialStructure}`);
    }
  }

  if (worldContext.keyObjects && worldContext.keyObjects.length > 0) {
    worldContextDescription.push('\nKey Objects & Artifacts:');
    worldContext.keyObjects.forEach((object) => {
      worldContextDescription.push(`- ${object.name} (${object.type}): ${object.description}`);
      if (object.influence) {
        worldContextDescription.push(`  Influence: ${object.influence}`);
      }
      if (object.rules) {
        worldContextDescription.push(`  Rules: ${object.rules}`);
      }
    });
  }

  return worldContextDescription;
}

/**
 * Extract JSON from markdown code blocks
 * @param text Text that may contain JSON in markdown code blocks
 * @returns Extracted JSON string or original text
 */
function extractJsonFromMarkdown(text: string): string {
  const jsonRegex = /```(?:json)?\s*(\{[\s\S]*\})\s*```/;
  const match = jsonRegex.exec(text);
  return match ? match[1] : text;
}

// ============================================================================
// Story Generation Service
// ============================================================================

export interface StoryGenerationService {
  generateStoryContent(params: StoryGenerationParams): Promise<string>;
  generateStorySummary(content: string): Promise<string>;
  createCharacter(
    request: CharacterCreationRequest,
    worldContext: WorldContext
  ): Promise<GeneratedCharacterResult>;
  createLocation(
    request: LocationCreationRequest,
    worldContext: WorldContext
  ): Promise<GeneratedLocationResult>;
}

/**
 * Generate story content using LLM
 * @param params Story generation parameters
 * @returns Generated story content as string
 */
export async function generateStoryContent(
  params: StoryGenerationParams
): Promise<string> {
  // Import LLM service dynamically to avoid circular dependencies
  const { getLLMService } = await import('./llmService');
  const llmService: LLMService = await getLLMService();

  // Calculate target word count based on length
  const wordCountMap: Record<string, string> = {
    short: '1000-2000',
    medium: '2500-4000',
    long: '5000-8000',
    scene: '500-1000',
    short_story: '3000-5000',
    novella: '15000-25000',
    novel: '60000-80000',
    epic_novel: '100000-150000',
  };
  const targetWordCount = wordCountMap[params.length];

  // Build character descriptions using helper function
  const characterDescriptions = params.characters
    .map((char: unknown) => buildCharacterDescription(char))
    .join('\n\n');

  // Build location descriptions using helper function
  const locationDescriptions = params.locations
    .map((loc: unknown) => buildLocationDescription(loc))
    .join('\n\n');

  // Build world context description using helper function
  const worldContextDescription = buildWorldContextDescription(params.worldContext);

  // Substitute parameters in the prompt template
  const prompt = STORY_GENERATION_PROMPT
    .replace('{genre}', params.genre.join(', '))
    .replace('{tone}', params.tone.join(', '))
    .replace('{length}', targetWordCount)
    .replace('{characterDescriptions}', characterDescriptions || 'No specific characters provided')
    .replace('{locationDescriptions}', locationDescriptions || 'No specific locations provided')
    .replace('{worldContext}', worldContextDescription.join('\n') || 'No specific world context provided');

  // Calculate max tokens based on story length
  const maxTokens = params.length === 'short' ? 1500 : params.length === 'medium' ? 3000 : 6000;

  // Call LLM service with retry logic
  try {
    const storyContent = await retryWithBackoff(async () => {
      const response = await llmService.generateText(prompt, {
        temperature: 0.7,
        maxTokens,
      });

      // Validate that we got content
      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from LLM service');
      }

      return response;
    });

    return storyContent;
  } catch (error) {
    // Handle errors with descriptive messages
    const errorMessage = handleLLMError(error);
    throw new Error(errorMessage);
  }
}

/**
 * Generate story summary using LLM
 * @param content Full story content
 * @returns Generated summary as string
 */
export async function generateStorySummary(content: string): Promise<string> {
  // Import LLM service dynamically to avoid circular dependencies
  const { getLLMService } = await import('./llmService');
  const llmService: LLMService = await getLLMService();

  // Substitute story content in the prompt template
  const prompt = SUMMARY_GENERATION_PROMPT.replace('{storyContent}', content);

  // Call LLM service with retry logic
  try {
    const summary = await retryWithBackoff(async () => {
      const response = await llmService.generateText(prompt, {
        temperature: 0.5, // Lower temperature for more focused summaries
        maxTokens: 500, // Summaries should be concise
      });

      // Validate that we got content
      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from LLM service');
      }

      return response.trim();
    });

    return summary;
  } catch (error) {
    // Handle errors with descriptive messages
    const errorMessage = handleLLMError(error);
    throw new Error(errorMessage);
  }
}

/**
 * Build extended world context description for character/location creation
 * @param worldContext World context data
 * @returns Array of world context description lines
 */
function buildExtendedWorldContextDescription(worldContext: WorldContext | undefined): string[] {
  const worldContextDescription: string[] = [];

  if (!worldContext) {
    worldContextDescription.push('No specific world context provided');
    return worldContextDescription;
  }

  if (worldContext.name) {
    worldContextDescription.push(`World: ${worldContext.name}`);
  }

  if (worldContext.genre && worldContext.genre.length > 0) {
    worldContextDescription.push(`Genre: ${worldContext.genre.join(', ')}`);
  }

  if (worldContext.tone && worldContext.tone.length > 0) {
    worldContextDescription.push(`Tone: ${worldContext.tone.join(', ')}`);
  }

  if (worldContext.atmosphere) {
    worldContextDescription.push(`Atmosphere: ${worldContext.atmosphere}`);
  }

  if (worldContext.rules && worldContext.rules.length > 0) {
    worldContextDescription.push('\nWorld Rules:');
    worldContext.rules.forEach((rule) => {
      worldContextDescription.push(`- ${rule.rule}: ${rule.description}`);
    });
  }

  if (worldContext.culturalElements) {
    const cultural = worldContext.culturalElements;
    if (cultural.languages && cultural.languages.length > 0) {
      worldContextDescription.push(`\nLanguages: ${cultural.languages.join(', ')}`);
    }
    if (cultural.customs && cultural.customs.length > 0) {
      worldContextDescription.push(`Customs: ${cultural.customs.join(', ')}`);
    }
    if (cultural.socialStructure) {
      worldContextDescription.push(`Social Structure: ${cultural.socialStructure}`);
    }
  }

  if (worldContext.keyObjects && worldContext.keyObjects.length > 0) {
    worldContextDescription.push('\nKey Objects & Artifacts:');
    worldContext.keyObjects.forEach((object) => {
      worldContextDescription.push(`- ${object.name} (${object.type}): ${object.description}`);
      if (object.influence) {
        worldContextDescription.push(`  Influence: ${object.influence}`);
      }
      if (object.rules) {
        worldContextDescription.push(`  Rules: ${object.rules}`);
      }
    });
  }

  return worldContextDescription;
}

/**
 * Create a new character using LLM
 * @param request Character creation request
 * @param worldContext World context for consistency
 * @returns Generated character object
 */
export async function createCharacter(
  request: CharacterCreationRequest,
  worldContext?: WorldContext
): Promise<GeneratedCharacterResult> {
  // Import LLM service dynamically to avoid circular dependencies
  const { getLLMService } = await import('./llmService');
  const llmService: LLMService = await getLLMService();

  // Build world context description using helper function
  const worldContextDescription = buildExtendedWorldContextDescription(worldContext);

  // Substitute parameters in the prompt template
  const prompt = CHARACTER_CREATION_PROMPT
    .replace('{name}', request.name)
    .replace('{role}', request.role)
    .replace('{description}', request.description)
    .replace('{worldContext}', worldContextDescription.join('\n'));

  // Call LLM service with retry logic
  try {
    const characterJson = await retryWithBackoff(async () => {
      const response = await llmService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 1000,
      });

      // Validate that we got content
      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from LLM service');
      }

      return response.trim();
    });

    // Parse JSON response using helper function
    let character;
    try {
      const jsonString = extractJsonFromMarkdown(characterJson);
      character = JSON.parse(jsonString);
    } catch (parseError) {
      throw new Error(`Failed to parse character JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate Character structure (basic validation)
    if (!character.name || !character.archetype) {
      throw new Error('Invalid character structure: missing required fields (name, archetype)');
    }

    return character;
  } catch (error) {
    // Handle errors with descriptive messages
    const errorMessage = handleLLMError(error);
    throw new Error(errorMessage);
  }
}

/**
 * Create a new location using LLM
 * @param request Location creation request
 * @param worldContext World context for consistency (optional)
 * @returns Generated location object
 */
export async function createLocation(
  request: LocationCreationRequest,
  worldContext?: WorldContext
): Promise<GeneratedLocationResult> {
  // Import LLM service dynamically to avoid circular dependencies
  const { getLLMService } = await import('./llmService');
  const llmService: LLMService = await getLLMService();

  // Build world context description using helper function
  const worldContextDescription = buildExtendedWorldContextDescription(worldContext);

  // Substitute parameters in the prompt template
  const prompt = LOCATION_CREATION_PROMPT
    .replace('{name}', request.name)
    .replace('{type}', request.type)
    .replace('{description}', request.description)
    .replace('{worldContext}', worldContextDescription.join('\n'));

  // Call LLM service with retry logic
  try {
    const locationJson = await retryWithBackoff(async () => {
      const response = await llmService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 1000,
      });

      // Validate that we got content
      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from LLM service');
      }

      return response.trim();
    });

    // Parse JSON response using helper function
    let location;
    try {
      const jsonString = extractJsonFromMarkdown(locationJson);
      location = JSON.parse(jsonString);
    } catch (parseError) {
      throw new Error(`Failed to parse location JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate Location structure (basic validation)
    if (!location.name || !location.type) {
      throw new Error('Invalid location structure: missing required fields (name, type)');
    }

    return location;
  } catch (error) {
    // Handle errors with descriptive messages
    const errorMessage = handleLLMError(error);
    throw new Error(errorMessage);
  }
}

/**
 * Generate story using advanced asynchronous backend (Python/FastAPI)
 * @param params Generation parameters
 * @param onProgress Progress callback
 * @returns Complete story object
 */
export async function generateStoryFromAdvancedBackend(
  params: StoryGenerationParams,
  onProgress?: (progress: GenerationProgress) => void
): Promise<Story> {
  onProgress?.({
    stage: 'preparing',
    progress: 5,
    currentTask: 'Establishing connection to Narrative Engine...',
  });

  try {
    // Determine backend parameters
    const backendGenre = params.genre.length > 0 ? params.genre[0].toUpperCase() : 'FANTASY';
    const backendLength = ['short', 'medium', 'long'].includes(params.length)
      ? params.length.toUpperCase()
      : 'MEDIUM';

    // Call the FastAPI endpoint
    const response = await fetch('/api/story/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: params.totalTitle || 'Untitled Exploration',
        genre: backendGenre,
        structure: 'THREE_ACT', // Default for now
        mode: (params.productionMode || 'fiction').toUpperCase(),
        length: backendLength,
        with_critique: params.withCritique || false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown backend error' }));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    onProgress?.({
      stage: 'generating_story',
      progress: 50,
      currentTask: 'Synthesizing narrative acts and character arcs...',
    });

    const result: AdvancedBackendResponse = await response.json();

    // Transform backend Result to Story interface
    return {
      id: result.id || crypto.randomUUID(),
      title: result.title || params.totalTitle || 'Advanced Generated Story',
      content: result.synopsis || '', // Use synopsis as main content if no scenes are joined yet
      summary: result.synopsis || '',
      genre: result.genre ? [result.genre] : params.genre,
      tone: params.tone,
      length: (result.length as Story['length']) || params.length,
      charactersUsed: (result.characters || []).map((c: AdvancedBackendCharacter) => ({
        id: c.id || crypto.randomUUID(),
        name: c.name,
        role: c.role || 'Character',
        description: c.description || '',
      })),
      locationsUsed: (result.locations || []).map((l: AdvancedBackendLocation) => ({
        id: l.id || crypto.randomUUID(),
        name: l.name,
        significance: 'Primary',
        type: l.type,
      })),
      autoGeneratedElements: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      critique: result.critique,
      parts: (result.scenes || []).map((s: AdvancedBackendScene, idx: number) => ({
        id: crypto.randomUUID(),
        type: 'chapter',
        title: s.title || `Scene ${idx + 1}`,
        content: s.description || '',
        summary: s.description?.substring(0, 100) || '',
        order: idx + 1,
      })),
    } as Story;
  } catch (error) {
    console.error('[StoryGenerationService] Advanced backend failed:', error);
    throw error;
  }
}

/**
 * Generate complete story with progress tracking
 * @param data Partial story data or generation params
 * @param onProgress Progress callback
 * @returns Complete story object
 */
export async function generateStory(
  data: Partial<Story> | StoryGenerationParams,
  onProgress?: (progress: GenerationProgress) => void
): Promise<Story> {
  const { storyWeaver } = await import('./StoryWeaver');

  // Transform data to generation params if needed
  let params: StoryGenerationParams;

  if ('worldContext' in data) {
    params = data as StoryGenerationParams;
  } else {
    // Transform partial story to generation params
    const d = data;
    const worldContext: WorldContext = d.worldId
      ? { id: d.worldId } as WorldContext
      : { id: 'default' } as WorldContext;
    params = {
      genre: d.genre || [],
      tone: d.tone || [],
      length: d.length || 'medium',
      characters: (d.charactersUsed || []) as unknown as StoryGenerationParams['characters'],
      locations: (d.locationsUsed || []) as unknown as StoryGenerationParams['locations'],
      worldContext,
      totalTitle: d.title,
    };
  }

  // Check if we should use the advanced backend
  if (params.useAdvancedBackend) {
    return generateStoryFromAdvancedBackend(params, onProgress);
  }

  const generatedStory = await storyWeaver.weaveStory(params, undefined, undefined, onProgress);

  // Build final story object
  const storyId = ('id' in data && data.id) ? data.id : crypto.randomUUID();

  return {
    id: storyId,
    title: params.totalTitle || 'Untitled Story',
    genre: params.genre,
    tone: params.tone,
    length: params.length,
    content: generatedStory.content || '',
    summary: generatedStory.summary || '',
    parts: generatedStory.parts || [],
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    charactersUsed: [],
    locationsUsed: [],
    autoGeneratedElements: [],
    ...('worldContext' in data ? {} : data), // Preserve other fields if it was a Story
  } as Story;
}

// ============================================================================
// Error Handling and Retry Logic
// ============================================================================

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Handle LLM service errors with descriptive messages
 * @param error Error object
 * @returns User-friendly error message
 */
export function handleLLMError(error: unknown): string {
  const err = error instanceof Error ? error : new Error(String(error));

  if (err.message?.includes('network')) {
    return 'Network error: Unable to connect to LLM service. Please check your connection.';
  }

  if (err.message?.includes('timeout')) {
    return 'Request timeout: The LLM service took too long to respond. Please try again.';
  }

  if (err.message?.includes('rate limit')) {
    return 'Rate limit exceeded: Too many requests. Please wait a moment and try again.';
  }

  if (err.message?.includes('content filter')) {
    return 'Content filter: The generated content was filtered. Please adjust your parameters.';
  }

  return `Generation error: ${err.message || 'Unknown error occurred'}`;
}

/**
 * Generate a visual storyboard for a story using ComfyUI via advanced backend
 * @param storyId The ID of the story to generate a storyboard for
 * @returns Array of storyboard frames with image URLs
 */
export async function generateStoryboard(storyId: string): Promise<Array<{
  scene_index: number;
  scene_title: string;
  image_url: string;
}>> {
  try {
    const response = await fetch(`/api/story/${storyId}/storyboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown storyboard error' }));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[StoryGenerationService] Storyboard generation failed:', error);
    throw error;
  }
}

/**
 * Process a story refinement with user feedback
 * @param storyId The ID of the story to refine
 * @param feedback User feedback string
 * @returns The refined story object
 */
export async function refineStory(storyId: string, feedback: string): Promise<Story> {
  try {
    const response = await fetch(`/api/story/${storyId}/refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feedback }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown refinement error' }));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    const result: AdvancedBackendResponse = await response.json();

    // Map AdvancedBackendResponse to Story interface
    return {
      id: result.id,
      title: result.title,
      content: result.synopsis || '',
      summary: result.synopsis || '',
      critique: result.critique,
      genre: result.genre ? [result.genre] : [],
      tone: [], // We don't get tone back from backend currently
      length: 'medium', // Default
      charactersUsed: (result.characters || []).map(c => ({
        id: c.id,
        name: c.name,
        role: c.role || 'Character',
        description: c.description || '',
      })),
      locationsUsed: (result.locations || []).map(l => ({
        id: l.id,
        name: l.name,
        significance: 'Primary',
        type: l.type,
        description: l.description
      })),
      autoGeneratedElements: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      parts: (result.scenes || []).map((s, idx) => ({
        id: crypto.randomUUID(),
        type: 'chapter',
        title: s.title || `Scene ${idx + 1}`,
        content: s.description || '',
        summary: s.description?.substring(0, 100) || '',
        order: idx + 1,
      })),
    } as Story;
  } catch (error) {
    console.error('[StoryGenerationService] Refinement failed:', error);
    throw error;
  }
}
