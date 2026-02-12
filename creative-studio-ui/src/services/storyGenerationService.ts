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
} from '../types/story';

// ============================================================================
// LLM Prompt Templates
// ============================================================================

export const STORY_GENERATION_PROMPT = `
You are a creative storytelling assistant. Generate a coherent narrative based on the following parameters:

Genre: {genre}
Tone: {tone}
Length: {length} words

Characters:
{characterDescriptions}

Locations:
{locationDescriptions}

World Context:
{worldContext}

Create a complete story with:
- Clear beginning, middle, and end
- Character development and interactions
- Vivid scene descriptions
- Consistent tone and atmosphere
- Respect for world rules and cultural elements

Output only the story content, no meta-commentary.
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
// Story Generation Service
// ============================================================================

export interface StoryGenerationService {
  generateStoryContent(params: StoryGenerationParams): Promise<string>;
  generateStorySummary(content: string): Promise<string>;
  createCharacter(
    request: CharacterCreationRequest,
    worldContext: WorldContext
  ): Promise<any>;
  createLocation(
    request: LocationCreationRequest,
    worldContext: WorldContext
  ): Promise<any>;
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
  const llmService = getLLMService();

  // Calculate target word count based on length
  const wordCountMap: Record<string, string> = {
    short: '500-1000',
    medium: '1000-2500',
    long: '2500-5000',
    scene: '200-500',
    short_story: '1500-3000',
    novella: '10000-20000',
    novel: '40000-60000',
    epic_novel: '80000-120000',
  };
  const targetWordCount = wordCountMap[params.length];

  // Build character descriptions
  const characterDescriptions = params.characters
    .map((char: unknown) => {
      const parts = [
        `**${char.name}** (${char.archetype || char.role || 'Character'})`,
      ];

      if (char.personality_traits && char.personality_traits.length > 0) {
        parts.push(`  Personality: ${char.personality_traits.join(', ')}`);
      }

      if (char.backstory) {
        parts.push(`  Background: ${char.backstory}`);
      }

      if (char.visual_identity) {
        const visual = char.visual_identity;
        const visualParts = [];
        if (visual.hair_color) visualParts.push(`${visual.hair_color} hair`);
        if (visual.eye_color) visualParts.push(`${visual.eye_color} eyes`);
        if (visual.build) visualParts.push(`${visual.build} build`);
        if (visualParts.length > 0) {
          parts.push(`  Appearance: ${visualParts.join(', ')}`);
        }
      }

      return parts.join('\n');
    })
    .join('\n\n');

  // Build location descriptions
  const locationDescriptions = params.locations
    .map((loc: unknown) => {
      const parts = [
        `**${loc.name}** (${loc.type || 'Location'})`,
      ];

      if (loc.description) {
        parts.push(`  ${loc.description}`);
      }

      if (loc.atmosphere) {
        parts.push(`  Atmosphere: ${loc.atmosphere}`);
      }

      if (loc.significance) {
        parts.push(`  Significance: ${loc.significance}`);
      }

      return parts.join('\n');
    })
    .join('\n\n');

  // Build world context description
  const worldContextDescription = [];

  if (params.worldContext) {
    const ctx = params.worldContext;

    if (ctx.name) {
      worldContextDescription.push(`World: ${ctx.name}`);
    }

    if (ctx.atmosphere) {
      worldContextDescription.push(`Atmosphere: ${ctx.atmosphere}`);
    }

    if (ctx.rules && ctx.rules.length > 0) {
      worldContextDescription.push('\nWorld Rules:');
      ctx.rules.forEach((rule: unknown) => {
        worldContextDescription.push(`- ${rule.rule}: ${rule.description}`);
      });
    }

    if (ctx.culturalElements) {
      const cultural = ctx.culturalElements;
      if (cultural.languages && cultural.languages.length > 0) {
        worldContextDescription.push(`\nLanguages: ${cultural.languages.join(', ')}`);
      }
      if (cultural.customs && cultural.customs.length > 0) {
        worldContextDescription.push(`\nCustoms: ${cultural.customs.join(', ')}`);
      }
      if (cultural.socialStructure) {
        worldContextDescription.push(`\nSocial Structure: ${cultural.socialStructure}`);
      }
    }
  }

  // Substitute parameters in the prompt template
  const prompt = STORY_GENERATION_PROMPT
    .replace('{genre}', params.genre.join(', '))
    .replace('{tone}', params.tone.join(', '))
    .replace('{length}', targetWordCount)
    .replace('{characterDescriptions}', characterDescriptions || 'No specific characters provided')
    .replace('{locationDescriptions}', locationDescriptions || 'No specific locations provided')
    .replace('{worldContext}', worldContextDescription.join('\n') || 'No specific world context provided');

  // Call LLM service with retry logic
  try {
    const storyContent = await retryWithBackoff(async () => {
      const response = await llmService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: params.length === 'short' ? 1500 : params.length === 'medium' ? 3000 : 6000,
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
  const llmService = getLLMService();

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
 * Create a new character using LLM
 * @param request Character creation request
 * @param worldContext World context for consistency
 * @returns Generated character object
 */
export async function createCharacter(
  request: CharacterCreationRequest,
  worldContext?: WorldContext
): Promise<any> {
  // Import LLM service dynamically to avoid circular dependencies
  const { getLLMService } = await import('./llmService');
  const llmService = getLLMService();

  // Build world context description
  const worldContextDescription = [];

  if (worldContext) {
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
  } else {
    worldContextDescription.push('No specific world context provided');
  }

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

    // Parse JSON response
    let character;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = characterJson.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : characterJson;
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
): Promise<any> {
  // Import LLM service dynamically to avoid circular dependencies
  const { getLLMService } = await import('./llmService');
  const llmService = getLLMService();

  // Build world context description
  const worldContextDescription = [];

  if (worldContext) {
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
  } else {
    worldContextDescription.push('No specific world context provided');
  }

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

    // Parse JSON response
    let location;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = locationJson.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : locationJson;
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
    // Using loose typing temporarily for wizard data compatibility
    const d = data as any;
    params = {
      genre: d.genre || [],
      tone: d.tone || [],
      length: d.length || 'medium',
      characters: d.charactersUsed || d.characters || [],
      locations: d.locationsUsed || d.locations || [],
      worldContext: d.worldContext || (d.worldId ? { id: d.worldId } as any : { id: 'default' } as any),
      totalTitle: d.title,
    };
  }

  const generatedStory = await storyWeaver.weaveStory(params, onProgress);

  // Build final story object
  return {
    id: ('id' in data ? (data as any).id : null) || crypto.randomUUID(),
    title: params.totalTitle || 'Untitled Story',
    genre: params.genre,
    tone: params.tone,
    length: params.length as any,
    content: generatedStory.content || '',
    summary: generatedStory.summary || '',
    parts: generatedStory.parts || [],
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...('worldContext' in data ? {} : data as any), // Preserve other fields if it was a Story
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
  if (error.message?.includes('network')) {
    return 'Network error: Unable to connect to LLM service. Please check your connection.';
  }

  if (error.message?.includes('timeout')) {
    return 'Request timeout: The LLM service took too long to respond. Please try again.';
  }

  if (error.message?.includes('rate limit')) {
    return 'Rate limit exceeded: Too many requests. Please wait a moment and try again.';
  }

  if (error.message?.includes('content filter')) {
    return 'Content filter: The generated content was filtered. Please adjust your parameters.';
  }

  return `Generation error: ${error.message || 'Unknown error occurred'}`;
}

