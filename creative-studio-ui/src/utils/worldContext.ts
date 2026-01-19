import type { World } from '@/types/world';

// ============================================================================
// World Context Utilities
// ============================================================================

/**
 * Formats world data into a context string for LLM prompts
 */
export function formatWorldContextForPrompt(world: World): string {
  const sections: string[] = [];

  // Basic information
  sections.push(`World: ${world.name}`);
  sections.push(`Genre: ${world.genre.join(', ')}`);
  sections.push(`Time Period: ${world.timePeriod}`);
  sections.push(`Tone: ${world.tone.join(', ')}`);

  // Atmosphere
  if (world.atmosphere) {
    sections.push(`\nAtmosphere: ${world.atmosphere}`);
  }

  // Technology and magic
  if (world.technology) {
    sections.push(`\nTechnology Level: ${world.technology}`);
  }
  if (world.magic) {
    sections.push(`\nMagic System: ${world.magic}`);
  }

  // World rules
  if (world.rules.length > 0) {
    sections.push('\nWorld Rules:');
    world.rules.forEach((rule) => {
      sections.push(`- [${rule.category}] ${rule.rule}`);
      if (rule.implications) {
        sections.push(`  Implications: ${rule.implications}`);
      }
    });
  }

  // Key locations
  if (world.locations.length > 0) {
    sections.push('\nKey Locations:');
    world.locations.slice(0, 5).forEach((location) => {
      sections.push(`- ${location.name}: ${location.description}`);
      if (location.significance) {
        sections.push(`  Significance: ${location.significance}`);
      }
    });
    if (world.locations.length > 5) {
      sections.push(`  ... and ${world.locations.length - 5} more locations`);
    }
  }

  // Cultural elements
  const { culturalElements } = world;
  if (
    culturalElements.languages.length > 0 ||
    culturalElements.religions.length > 0 ||
    culturalElements.traditions.length > 0
  ) {
    sections.push('\nCultural Elements:');
    if (culturalElements.languages.length > 0) {
      sections.push(`Languages: ${culturalElements.languages.join(', ')}`);
    }
    if (culturalElements.religions.length > 0) {
      sections.push(`Religions: ${culturalElements.religions.join(', ')}`);
    }
    if (culturalElements.traditions.length > 0) {
      sections.push(`Traditions: ${culturalElements.traditions.slice(0, 3).join(', ')}`);
    }
  }

  // Conflicts
  if (world.conflicts.length > 0) {
    sections.push('\nMajor Conflicts:');
    world.conflicts.forEach((conflict) => {
      sections.push(`- ${conflict}`);
    });
  }

  return sections.join('\n');
}

/**
 * Creates a compact world context for shorter prompts
 */
export function formatCompactWorldContext(world: World): string {
  const parts: string[] = [
    `${world.name} (${world.genre.join('/')})`,
    world.timePeriod,
    world.tone.join('/'),
  ];

  if (world.atmosphere) {
    parts.push(world.atmosphere);
  }

  return parts.join(' • ');
}

/**
 * Extracts style guidance from world for image generation
 */
export function extractWorldStyleGuidance(world: World): {
  styleKeywords: string[];
  colorPalette: string[];
  atmosphere: string;
} {
  const styleKeywords: string[] = [...world.genre, ...world.tone];

  // Extract color palette hints from atmosphere and cultural elements
  const colorPalette: string[] = [];
  
  // Common color associations
  const colorMap: Record<string, string[]> = {
    dark: ['black', 'deep purple', 'midnight blue'],
    light: ['white', 'cream', 'pale yellow'],
    gritty: ['brown', 'rust', 'grey'],
    whimsical: ['pastel pink', 'sky blue', 'mint green'],
    fantasy: ['gold', 'emerald', 'royal purple'],
    'sci-fi': ['neon blue', 'chrome', 'electric purple'],
    cyberpunk: ['neon pink', 'electric blue', 'black'],
    steampunk: ['brass', 'copper', 'sepia'],
  };

  // Add colors based on genre and tone
  [...world.genre, ...world.tone].forEach((keyword) => {
    const colors = colorMap[keyword.toLowerCase()];
    if (colors) {
      colorPalette.push(...colors);
    }
  });

  return {
    styleKeywords,
    colorPalette: [...new Set(colorPalette)], // Remove duplicates
    atmosphere: world.atmosphere || '',
  };
}

/**
 * Generates location-specific context for scene generation
 */
export function getLocationContext(world: World, locationName?: string): string {
  if (!locationName) {
    return formatWorldContextForPrompt(world);
  }

  const location = world.locations.find(
    (loc) => loc.name.toLowerCase() === locationName.toLowerCase()
  );

  if (!location) {
    return formatWorldContextForPrompt(world);
  }

  const sections: string[] = [
    `Location: ${location.name}`,
    `World: ${world.name} (${world.genre.join(', ')})`,
    `\nDescription: ${location.description}`,
  ];

  if (location.atmosphere) {
    sections.push(`Atmosphere: ${location.atmosphere}`);
  }

  if (location.significance) {
    sections.push(`Significance: ${location.significance}`);
  }

  // Add relevant world rules
  const relevantRules = world.rules.filter(
    (rule) =>
      rule.rule.toLowerCase().includes(location.name.toLowerCase()) ||
      location.description.toLowerCase().includes(rule.category.toLowerCase())
  );

  if (relevantRules.length > 0) {
    sections.push('\nRelevant World Rules:');
    relevantRules.forEach((rule) => {
      sections.push(`- [${rule.category}] ${rule.rule}`);
    });
  }

  return sections.join('\n');
}

/**
 * Validates that world context is suitable for generation
 */
export function validateWorldContext(world: World): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!world.name || world.name.trim() === '') {
    warnings.push('World name is missing');
  }

  if (world.genre.length === 0) {
    warnings.push('No genre specified - may result in generic outputs');
  }

  if (world.tone.length === 0) {
    warnings.push('No tone specified - may result in inconsistent mood');
  }

  if (!world.atmosphere || world.atmosphere.trim() === '') {
    warnings.push('No atmosphere defined - consider adding for better visual consistency');
  }

  if (world.locations.length === 0) {
    warnings.push('No locations defined - consider adding key locations for scene generation');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * Merges world context with user prompt
 */
export function mergeWorldContextWithPrompt(
  userPrompt: string,
  world: World | null,
  options: {
    includeFullContext?: boolean;
    locationName?: string;
  } = {}
): string {
  if (!world) {
    return userPrompt;
  }

  const { includeFullContext = true, locationName } = options;

  let contextString: string;

  if (locationName) {
    contextString = getLocationContext(world, locationName);
  } else if (includeFullContext) {
    contextString = formatWorldContextForPrompt(world);
  } else {
    contextString = formatCompactWorldContext(world);
  }

  return `${contextString}\n\n${userPrompt}`;
}
