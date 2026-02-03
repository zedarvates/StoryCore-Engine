/**
 * StoryCore LLM Prompt Parser
 * Parses complex creative prompts to extract structured project data
 */

import { LLMProviderManager } from './provider-manager';
import { LLMConfig, Message } from './interfaces';

export interface ParsedPrompt {
  // Basic Info
  projectTitle: string;
  genre: string;
  subGenre?: string;
  setting: string;
  timePeriod: string;
  location: string;
  
  // Characters
  characters: ParsedCharacter[];
  
  // Narrative
  mood: string[];
  style: string[];
  tone: string;
  videoType: VideoType;
  
  // Technical
  aspectRatio: AspectRatio;
  durationSeconds: number;
  qualityTier: QualityTier;
  
  // Key Elements
  keyElements: string[];
  visualReferences: string[];
  excludedElements: string[];
  
  // Raw
  rawPrompt: string;
  confidence: number;
}

export interface ParsedCharacter {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  description: string;
  attributes: string[];
}

export type VideoType = 'trailer' | 'teaser' | 'short_film' | 'music_video' | 'documentary' | 'commercial' | 'unknown';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9' | 'auto';

export type QualityTier = 'draft' | 'preview' | 'final';

export interface PromptParserConfig {
  provider?: string;
  useLLM: boolean;
  fallbackToRuleBased: boolean;
}

const DEFAULT_CONFIG: PromptParserConfig = {
  useLLM: true,
  fallbackToRuleBased: true,
};

export class PromptParser {
  private providerManager: LLMProviderManager | null = null;
  private config: PromptParserConfig;

  constructor(config: Partial<PromptParserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize with provider manager for LLM-based parsing
   */
  initialize(providerManager: LLMProviderManager): void {
    this.providerManager = providerManager;
  }

  /**
   * Parse a creative prompt into structured data
   */
  async parse(prompt: string): Promise<ParsedPrompt> {
    console.log(`[PromptParser] Parsing prompt: "${prompt.substring(0, 100)}..."`);

    // Try LLM-based parsing first if available
    if (this.providerManager && this.config.useLLM) {
      try {
        const result = await this.parseWithLLM(prompt);
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn('[PromptParser] LLM parsing failed, falling back to rule-based:', error);
      }
    }

    // Fall back to rule-based parsing
    if (this.config.fallbackToRuleBased) {
      return this.parseWithRules(prompt);
    }

    throw new Error('No parsing method available');
  }

  /**
   * Parse using LLM for intelligent extraction
   */
  private async parseWithLLM(prompt: string): Promise<ParsedPrompt | null> {
    if (!this.providerManager) return null;

    const systemMessage = `You are a creative assistant that parses video/project prompts.
Extract the following information from the user's prompt:
1. Project title (suggest one if not explicit)
2. Genre (fantasy, sci-fi, cyberpunk, horror, romance, action, etc.)
3. Setting/Time period/Location
4. Characters (name, role, description)
5. Mood (dark, tense, peaceful, exciting, etc.)
6. Style references (cinematic, anime, documentary, etc.)
7. Tone (intense, humorous, dramatic, etc.)
8. Video type (trailer, teaser, short film, music video, etc.)
9. Key visual elements mentioned
10. Any excluded elements

Respond in JSON format with this structure:
{
  "projectTitle": "string",
  "genre": "string",
  "subGenre": "string or null",
  "setting": "string",
  "timePeriod": "string",
  "location": "string",
  "characters": [{"name": "string", "role": "protagonist|antagonist|supporting|minor", "description": "string", "attributes": ["string"]}],
  "mood": ["string"],
  "style": ["string"],
  "tone": "string",
  "videoType": "trailer|teaser|short_film|music_video|documentary|commercial|unknown",
  "keyElements": ["string"],
  "visualReferences": ["string"],
  "excludedElements": ["string"]
}`;

    const messages: Message[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Parse this prompt:\n\n${prompt}` },
    ];

    try {
      const response = await this.providerManager.generateCompletion(messages);
      const parsed = JSON.parse(response);
      
      return this.enhanceWithDefaults(parsed, prompt);
    } catch (error) {
      console.error('[PromptParser] LLM parsing error:', error);
      return null;
    }
  }

  /**
   * Rule-based parsing for simple prompts
   */
  private parseWithRules(prompt: string): ParsedPrompt {
    const lowerPrompt = prompt.toLowerCase();

    // Detect video type
    const videoType = this.detectVideoType(lowerPrompt);

    // Detect genre
    const genre = this.detectGenre(lowerPrompt);

    // Detect setting/time period
    const { setting, timePeriod } = this.detectSetting(lowerPrompt);

    // Detect location
    const location = this.detectLocation(lowerPrompt);

    // Detect mood
    const mood = this.detectMood(lowerPrompt);

    // Detect style
    const style = this.detectStyle(lowerPrompt);

    // Detect tone
    const tone = this.detectTone(lowerPrompt);

    // Detect characters
    const characters = this.detectCharacters(prompt);

    // Detect key elements
    const keyElements = this.detectKeyElements(lowerPrompt);

    // Detect visual references
    const visualReferences = this.detectVisualReferences(lowerPrompt);

    // Detect excluded elements
    const excludedElements = this.detectExcludedElements(lowerPrompt);

    // Detect aspect ratio
    const aspectRatio = this.detectAspectRatio(lowerPrompt);

    // Detect duration
    const durationSeconds = this.detectDuration(lowerPrompt, videoType);

    // Generate project title
    const projectTitle = this.generateProjectTitle(prompt, genre, setting);

    return {
      projectTitle,
      genre,
      setting,
      timePeriod,
      location,
      characters,
      mood,
      style,
      tone,
      videoType,
      aspectRatio,
      durationSeconds,
      qualityTier: 'preview',
      keyElements,
      visualReferences,
      excludedElements,
      rawPrompt: prompt,
      confidence: 0.7, // Rule-based has lower confidence
    };
  }

  /**
   * Enhance LLM result with defaults for missing fields
   */
  private enhanceWithDefaults(parsed: any, originalPrompt: string): ParsedPrompt {
    const lowerPrompt = originalPrompt.toLowerCase();

    return {
      projectTitle: parsed.projectTitle || this.generateProjectTitle(originalPrompt, parsed.genre, parsed.setting),
      genre: parsed.genre || 'drama',
      subGenre: parsed.subGenre || undefined,
      setting: parsed.setting || 'unspecified',
      timePeriod: parsed.timePeriod || 'unspecified',
      location: parsed.location || 'unspecified',
      characters: parsed.characters || [],
      mood: parsed.mood || ['neutral'],
      style: parsed.style || ['cinematic'],
      tone: parsed.tone || 'neutral',
      videoType: parsed.videoType || this.detectVideoType(lowerPrompt),
      aspectRatio: this.detectAspectRatio(lowerPrompt),
      durationSeconds: this.detectDuration(lowerPrompt, parsed.videoType),
      qualityTier: 'preview',
      keyElements: parsed.keyElements || [],
      visualReferences: parsed.visualReferences || [],
      excludedElements: parsed.excludedElements || [],
      rawPrompt: originalPrompt,
      confidence: 0.9, // LLM-based has higher confidence
    };
  }

  private detectVideoType(prompt: string): VideoType {
    if (prompt.includes('trailer')) return 'trailer';
    if (prompt.includes('teaser')) return 'teaser';
    if (prompt.includes('music video') || prompt.includes('clip musical')) return 'music_video';
    if (prompt.includes('documentary')) return 'documentary';
    if (prompt.includes('commercial') || prompt.includes('advertisement')) return 'commercial';
    if (prompt.includes('short film') || prompt.includes('court métrage')) return 'short_film';
    return 'unknown';
  }

  private detectGenre(prompt: string): string {
    const genres: Record<string, string[]> = {
      'sci-fi': ['sci-fi', 'science fiction', 'cyberpunk', 'space', 'futuristic'],
      'fantasy': ['fantasy', 'magical', 'mythical', 'enchanted'],
      'horror': ['horror', 'scary', 'terror', 'haunted', 'supernatural'],
      'action': ['action', 'explosive', 'chase', 'fight'],
      'romance': ['romance', 'love', 'romantic', 'heart'],
      'drama': ['drama', 'emotional', 'dramatic'],
      'comedy': ['comedy', 'comedic', 'funny', 'humor'],
      'thriller': ['thriller', 'suspense', 'tense', 'mystery'],
      'western': ['western', 'cowboy', 'frontier'],
      'war': ['war', 'battle', 'military', 'soldier'],
    };

    for (const [genre, keywords] of Object.entries(genres)) {
      if (keywords.some(kw => prompt.includes(kw))) {
        return genre;
      }
    }

    return 'drama'; // Default genre
  }

  private detectSetting(prompt: string): { setting: string; timePeriod: string } {
    const timePeriods: Record<string, string[]> = {
      'future': ['future', '2048', '2100', 'futur', '2050'],
      'past': ['past', 'ancient', 'medieval', 'historical', 'victorian'],
      'present': ['present', 'modern', 'contemporary', 'today'],
      'prehistoric': ['prehistoric', 'caveman', 'dinosaur'],
    };

    for (const [timePeriod, keywords] of Object.entries(timePeriods)) {
      if (keywords.some(kw => prompt.includes(kw))) {
        return { setting: timePeriod, timePeriod };
      }
    }

    return { setting: 'unspecified', timePeriod: 'unspecified' };
  }

  private detectLocation(prompt: string): string {
    const locations: Record<string, string[]> = {
      'city': ['city', 'urban', 'metropolitan', 'downtown', 'mégalopole'],
      'space': ['space', 'outer space', 'orbit', 'planet'],
      'forest': ['forest', 'woods', 'nature', 'jungle'],
      'desert': ['desert', 'arid', 'sandy'],
      'ocean': ['ocean', 'sea', 'underwater', 'maritime'],
      'mountain': ['mountain', 'peak', 'alpine', 'highlands'],
    };

    for (const [location, keywords] of Object.entries(locations)) {
      if (keywords.some(kw => prompt.includes(kw))) {
        return location;
      }
    }

    return 'unspecified';
  }

  private detectMood(prompt: string): string[] {
    const moods: Record<string, string[]> = {
      'dark': ['dark', 'gloomy', 'shadow', 'dystopian'],
      'tense': ['tense', 'tension', 'nerve', 'anxious'],
      'peaceful': ['peaceful', 'calm', 'serene', 'tranquil'],
      'exciting': ['exciting', 'energetic', 'dynamic', 'thrilling'],
      'melancholic': ['melancholic', 'sad', 'somber', 'bittersweet'],
      'mysterious': ['mysterious', 'mystery', 'enigmatic', 'cryptic'],
      'epic': ['epic', 'grand', 'majestic', 'heroic'],
    };

    const detectedMoods: string[] = [];
    for (const [mood, keywords] of Object.entries(moods)) {
      if (keywords.some(kw => prompt.includes(kw))) {
        detectedMoods.push(mood);
      }
    }

    return detectedMoods.length > 0 ? detectedMoods : ['neutral'];
  }

  private detectStyle(prompt: string): string[] {
    const styles: Record<string, string[]> = {
      'cinematic': ['cinematic', 'hollywood', 'film'],
      'anime': ['anime', 'japanese animation'],
      'documentary': ['documentary', 'realistic'],
      'vhs': ['vhs', 'retro', 'nostalgic'],
      'minimalist': ['minimalist', 'clean', 'simple'],
      'baroque': ['baroque', 'ornate', 'detailed'],
    };

    const detectedStyles: string[] = [];
    for (const [style, keywords] of Object.entries(styles)) {
      if (keywords.some(kw => prompt.includes(kw))) {
        detectedStyles.push(style);
      }
    }

    return detectedStyles.length > 0 ? detectedStyles : ['cinematic'];
  }

  private detectTone(prompt: string): string {
    const tones: Record<string, string[]> = {
      'intense': ['intense', 'intensity', 'nerve', 'nerveux'],
      'dramatic': ['dramatic', 'dramatique', 'emotional'],
      'humorous': ['humorous', 'funny', 'comic', ' humorous'],
      'serious': ['serious', 'grave', '严肃'],
      'hopeful': ['hopeful', 'optimistic', 'positive'],
    };

    for (const [tone, keywords] of Object.entries(tones)) {
      if (keywords.some(kw => prompt.includes(kw))) {
        return tone;
      }
    }

    return 'neutral';
  }

  private detectCharacters(prompt: string): ParsedCharacter[] {
    const characters: ParsedCharacter[] = [];

    // Look for character patterns like "X as Y" or named characters
    const namePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:as|le|la|est)\s+(.+?)(?=[,.;]|$)/g;
    let match;

    while ((match = namePattern.exec(prompt)) !== null) {
      characters.push({
        name: match[1],
        role: 'protagonist',
        description: match[2],
        attributes: [],
      });
    }

    // Look for numbered lists of characters
    const numberedPattern = /(\d+|sept|seven)\s+(?:mercenaries|chars?|characters)/i;
    if (numberedPattern.test(prompt)) {
      const mercenaryMatch = prompt.match(/(\d+)\s+(?:augmented\s+)?mercenaries?/i);
      if (mercenaryMatch) {
        characters.push({
          name: 'Augmented Mercenaries',
          role: 'supporting',
          description: `${mercenaryMatch[1]} augmented mercenaries`,
          attributes: ['augmented', 'mercenary'],
        });
      }
    }

    return characters;
  }

  private detectKeyElements(prompt: string): string[] {
    const elements: string[] = [];

    // Common key element patterns
    const patterns = [
      /mégalopole\s+(?:néon|neon)/gi,
      /ia\s+(?:corrompue|corrupt)/gi,
      /drones?\s+de\s+surveillance/gi,
      /poursuites?\s+dans/gi,
      /ruelles?\s+(?:sombres|dark)/gi,
      /climax\s+explosif/gi,
      /neon\s+city/gi,
      /surveillance\s+drones/gi,
      /augmented\s+(?:mercenaries|humans)/gi,
      /hacker/gi,
    ];

    for (const pattern of patterns) {
      const matches = prompt.match(pattern);
      if (matches) {
        elements.push(...matches);
      }
    }

    return elements;
  }

  private detectVisualReferences(prompt: string): string[] {
    const references: string[] = [];

    // Look for style references
    const styleRefs = [
      'hollywood',
      'netflix',
      'bladerunner',
      'matrix',
      'district 9',
      'ghost in the shell',
      'akira',
    ];

    for (const ref of styleRefs) {
      if (prompt.toLowerCase().includes(ref)) {
        references.push(ref);
      }
    }

    return references;
  }

  private detectExcludedElements(prompt: string): string[] {
    const excluded: string[] = [];

    // Look for negative patterns
    const negPatterns = [
      /without\s+([^,]+)/gi,
      /pas\s+de\s+([^,]+)/gi,
      /no\s+([^,]+)/gi,
      /exclude\s+([^,]+)/gi,
    ];

    for (const pattern of negPatterns) {
      let match;
      while ((match = pattern.exec(prompt)) !== null) {
        excluded.push(match[1].trim());
      }
    }

    return excluded;
  }

  private detectAspectRatio(prompt: string): AspectRatio {
    const ratios: Record<string, string[]> = {
      '16:9': ['16:9', 'cinema', 'widescreen', 'landscape'],
      '9:16': ['9:16', 'vertical', 'portrait', 'tiktok', 'reels', 'shorts'],
      '1:1': ['1:1', 'square', 'instagram'],
      '4:3': ['4:3', 'classic', 'standard'],
      '21:9': ['21:9', 'ultrawide', 'cinemascope'],
      'auto': ['auto', 'default', 'unspecified'],
    };

    for (const [ratio, keywords] of Object.entries(ratios)) {
      if (keywords.some(kw => prompt.toLowerCase().includes(kw))) {
        return ratio as AspectRatio;
      }
    }

    return '16:9'; // Default to cinema
  }

  private detectDuration(prompt: string, videoType: VideoType): number {
    // First, look for explicit duration
    const durationPatterns = [
      /(\d+)\s*(?:seconds?|sec|s)\b/i,
      /(\d+)\s*(?:minutes?|min)\b/i,
      /(\d+)\s*(?:hours?|hr)\b/i,
    ];

    for (const pattern of durationPatterns) {
      const match = prompt.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (pattern.source.includes('hour')) return value * 3600;
        if (pattern.source.includes('minute')) return value * 60;
        return value;
      }
    }

    // Default based on video type
    const defaults: Record<VideoType, number> = {
      'teaser': 15,
      'trailer': 60,
      'short_film': 180,
      'music_video': 180,
      'documentary': 300,
      'commercial': 30,
      'unknown': 30,
    };

    return defaults[videoType];
  }

  private generateProjectTitle(prompt: string, genre: string, setting: string): string {
    // Try to extract title from prompt
    const titlePatterns = [
      /for\s+(?:a\s+)?([A-Z][a-zA-Z\s]+?)(?:\s*[,.!]|\s*$)/,
      /create\s+(?:a\s+)?([A-Z][a-zA-Z\s]+?)(?:\s*[,.!]|\s*$)/,
      /reinterpretation\s+of\s+([A-Z][a-zA-Z\s]+?)(?:\s*[,.!]|\s*$)/,
    ];

    for (const pattern of titlePatterns) {
      const match = prompt.match(pattern);
      if (match && match[1].length > 3 && match[1].length < 50) {
        return match[1].trim();
      }
    }

    // Generate from genre + setting
    if (setting !== 'unspecified') {
      return `${genre.charAt(0).toUpperCase() + genre.slice(1)} ${setting}`;
    }

    return `Project_${Date.now().toString(36)}`;
  }
}

export const promptParser = new PromptParser();

