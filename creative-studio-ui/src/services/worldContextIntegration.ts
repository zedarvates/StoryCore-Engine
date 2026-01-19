/**
 * World Context Integration Service
 * 
 * Integrates world context into LLM generation prompts
 * Ensures world-specific style guidance and consistency
 * 
 * Validates Requirements: 7.7
 */

import type { World } from '@/types/world';
import {
  formatCompactWorldContext,
  extractWorldStyleGuidance,
  getLocationContext,
  mergeWorldContextWithPrompt,
} from '@/utils/worldContext';

// ============================================================================
// World Context Integration
// ============================================================================

/**
 * Enhances a generation prompt with world context
 */
export function enhancePromptWithWorldContext(
  basePrompt: string,
  world: World | null,
  options: {
    includeFullContext?: boolean;
    locationName?: string;
    includeStyleGuidance?: boolean;
  } = {}
): string {
  if (!world) {
    return basePrompt;
  }

  const {
    includeFullContext = true,
    locationName,
    includeStyleGuidance = true,
  } = options;

  // Get world context
  const worldContext = mergeWorldContextWithPrompt(basePrompt, world, {
    includeFullContext,
    locationName,
  });

  // Add style guidance if requested
  if (includeStyleGuidance) {
    const styleGuidance = extractWorldStyleGuidance(world);
    const styleSection = formatStyleGuidance(styleGuidance);
    return `${worldContext}\n\n${styleSection}`;
  }

  return worldContext;
}

/**
 * Formats style guidance for prompts
 */
function formatStyleGuidance(guidance: {
  styleKeywords: string[];
  colorPalette: string[];
  atmosphere: string;
}): string {
  const sections: string[] = [];

  if (guidance.styleKeywords.length > 0) {
    sections.push(`Style: ${guidance.styleKeywords.join(', ')}`);
  }

  if (guidance.colorPalette.length > 0) {
    sections.push(`Color Palette: ${guidance.colorPalette.join(', ')}`);
  }

  if (guidance.atmosphere) {
    sections.push(`Visual Atmosphere: ${guidance.atmosphere}`);
  }

  return sections.join('\n');
}

/**
 * Adds world rules to consistency checks
 */
export function getWorldRulesForConsistency(world: World | null): string[] {
  if (!world) {
    return [];
  }

  return world.rules.map((rule) => `[${rule.category}] ${rule.rule}`);
}

/**
 * Gets location-specific context for scene generation
 */
export function getLocationSpecificContext(
  world: World | null,
  locationName: string
): string {
  if (!world) {
    return '';
  }

  return getLocationContext(world, locationName);
}

/**
 * Generates a system prompt that includes world context
 */
export function generateWorldAwareSystemPrompt(
  baseSystemPrompt: string,
  world: World | null
): string {
  if (!world) {
    return baseSystemPrompt;
  }

  const worldSummary = formatCompactWorldContext(world);
  const worldRules = getWorldRulesForConsistency(world);

  const sections: string[] = [baseSystemPrompt];

  sections.push('\n\n## World Context');
  sections.push(worldSummary);

  if (worldRules.length > 0) {
    sections.push('\n## World Rules (Maintain Consistency)');
    worldRules.forEach((rule) => {
      sections.push(`- ${rule}`);
    });
  }

  sections.push(
    '\n## Instructions',
    'Always maintain consistency with the world context and rules above.',
    'Ensure all generated content fits within the established world setting.'
  );

  return sections.join('\n');
}

/**
 * Extracts world context for image generation prompts
 */
export function getImageGenerationContext(
  world: World | null,
  locationName?: string
): {
  positivePrompt: string;
  negativePrompt: string;
  styleKeywords: string[];
} {
  if (!world) {
    return {
      positivePrompt: '',
      negativePrompt: '',
      styleKeywords: [],
    };
  }

  const styleGuidance = extractWorldStyleGuidance(world);
  const locationContext = locationName
    ? getLocationContext(world, locationName)
    : '';

  // Build positive prompt additions
  const positiveElements: string[] = [];

  if (locationContext) {
    positiveElements.push(locationContext);
  }

  if (styleGuidance.atmosphere) {
    positiveElements.push(styleGuidance.atmosphere);
  }

  if (styleGuidance.colorPalette.length > 0) {
    positiveElements.push(`colors: ${styleGuidance.colorPalette.join(', ')}`);
  }

  // Build negative prompt (things to avoid)
  const negativeElements: string[] = [];

  // Add genre-specific negative prompts
  if (world.genre.includes('fantasy') && !world.genre.includes('sci-fi')) {
    negativeElements.push('modern technology', 'contemporary clothing', 'cars');
  }

  if (world.genre.includes('sci-fi') && !world.genre.includes('fantasy')) {
    negativeElements.push('medieval', 'magic', 'fantasy creatures');
  }

  if (world.genre.includes('historical')) {
    negativeElements.push('anachronistic elements', 'modern items');
  }

  return {
    positivePrompt: positiveElements.join(', '),
    negativePrompt: negativeElements.join(', '),
    styleKeywords: styleGuidance.styleKeywords,
  };
}

/**
 * Validates that generated content matches world context
 */
export function validateContentAgainstWorld(
  content: string,
  world: World | null
): {
  isValid: boolean;
  warnings: string[];
} {
  if (!world) {
    return { isValid: true, warnings: [] };
  }

  const warnings: string[] = [];
  const contentLower = content.toLowerCase();

  // Check for genre consistency
  const genreKeywords: Record<string, string[]> = {
    fantasy: ['magic', 'dragon', 'elf', 'wizard', 'spell'],
    'sci-fi': ['technology', 'spaceship', 'robot', 'laser', 'alien'],
    historical: ['historical', 'period', 'era'],
    contemporary: ['modern', 'current', 'today'],
  };

  // Check if content mentions genres not in the world
  Object.entries(genreKeywords).forEach(([genre, keywords]) => {
    if (!world.genre.includes(genre)) {
      const hasKeywords = keywords.some((keyword) =>
        contentLower.includes(keyword)
      );
      if (hasKeywords) {
        warnings.push(
          `Content mentions ${genre} elements, but world genre is ${world.genre.join(', ')}`
        );
      }
    }
  });

  // Check for tone consistency
  if (world.tone.includes('dark') && contentLower.includes('cheerful')) {
    warnings.push('Content tone seems cheerful, but world tone is dark');
  }

  if (world.tone.includes('light') && contentLower.includes('grim')) {
    warnings.push('Content tone seems grim, but world tone is light');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
