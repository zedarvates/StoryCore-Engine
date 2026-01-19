/**
 * System Prompt Builder
 * 
 * Builds language-aware system prompts for the LLM chatbox assistant.
 * Maintains StoryCore assistant personality across all supported languages.
 * 
 * This module implements requirement 9.1-9.10 from the LLM Chatbox Enhancement spec,
 * ensuring that the AI assistant responds in the user's preferred language while
 * maintaining consistent personality and capabilities.
 * 
 * @module systemPromptBuilder
 * 
 * @example
 * ```typescript
 * import { buildSystemPrompt } from '@/utils/systemPromptBuilder';
 * 
 * // Build French system prompt
 * const frenchPrompt = buildSystemPrompt('fr');
 * 
 * // Use in LLM request
 * const request = {
 *   prompt: userMessage,
 *   systemPrompt: frenchPrompt,
 *   stream: true
 * };
 * ```
 */

import { type LanguageCode } from '@/components/launcher/LanguageSelector';

/**
 * Base StoryCore assistant personality and role description
 * 
 * This prompt defines the core identity and capabilities of the StoryCore assistant.
 * It remains consistent across all languages to ensure uniform behavior and expertise.
 * 
 * The assistant is positioned as a helpful expert in video storyboard creation,
 * providing guidance on shots, transitions, audio, and production workflows.
 */
const BASE_SYSTEM_PROMPT = `You are the StoryCore AI assistant, helping users create and manage video storyboard projects. You provide guidance on creating shots, adding transitions, configuring audio, and optimizing production workflows.`;

/**
 * Language-specific instruction mapping
 * 
 * Maps each supported language code to its corresponding instruction for the LLM.
 * These instructions tell the LLM which language to use for responses while
 * maintaining natural, conversational tone appropriate for each language.
 * 
 * The instructions are carefully crafted to:
 * - Specify the target language clearly
 * - Request natural, conversational language
 * - Use appropriate politeness levels (e.g., polite Japanese/Korean)
 * - Maintain professional yet friendly tone
 * 
 * @see {@link LanguageCode} for supported language codes
 */
const LANGUAGE_INSTRUCTIONS: Record<LanguageCode, string> = {
  fr: 'Respond in French (Français). Use natural, conversational French.',
  en: 'Respond in English. Use clear, professional language.',
  es: 'Respond in Spanish (Español). Use natural, conversational Spanish.',
  de: 'Respond in German (Deutsch). Use natural, conversational German.',
  it: 'Respond in Italian (Italiano). Use natural, conversational Italian.',
  pt: 'Respond in Portuguese (Português). Use natural, conversational Portuguese.',
  ja: 'Respond in Japanese (日本語). Use polite, natural Japanese.',
  zh: 'Respond in Chinese (中文). Use clear, natural Chinese.',
  ko: 'Respond in Korean (한국어). Use polite, natural Korean.',
};

/**
 * Build a language-aware system prompt
 * 
 * Combines the base StoryCore assistant personality with language-specific
 * instructions to ensure responses are in the user's preferred language.
 * 
 * @param language - The language code for the desired response language
 * @returns Complete system prompt with language instructions
 * 
 * @example
 * ```typescript
 * const prompt = buildSystemPrompt('fr');
 * // Returns: "You are the StoryCore AI assistant... Respond in French..."
 * ```
 */
export function buildSystemPrompt(language: LanguageCode): string {
  const languageInstruction = LANGUAGE_INSTRUCTIONS[language];
  
  if (!languageInstruction) {
    // Fallback to English if language not found (should never happen with TypeScript)
    console.warn(`Unknown language code: ${language}, falling back to English`);
    return `${BASE_SYSTEM_PROMPT}\n\n${LANGUAGE_INSTRUCTIONS.en}`;
  }
  
  return `${BASE_SYSTEM_PROMPT}\n\n${languageInstruction}`;
}

/**
 * Get all supported languages with their instructions
 * 
 * Returns a copy of the language instructions mapping. Useful for testing,
 * validation, and documentation purposes.
 * 
 * @returns Record of all language codes and their instructions
 * 
 * @example
 * ```typescript
 * const languages = getSupportedLanguages();
 * console.log(languages.fr); // "Respond in French (Français)..."
 * console.log(Object.keys(languages)); // ['fr', 'en', 'es', ...]
 * ```
 */
export function getSupportedLanguages(): Record<LanguageCode, string> {
  return { ...LANGUAGE_INSTRUCTIONS };
}

/**
 * Validate that a language code is supported
 * 
 * Type guard function that checks if a given string is a valid language code
 * with an associated instruction. Useful for runtime validation before building
 * system prompts.
 * 
 * @param language - The language code to validate
 * @returns True if the language is supported, false otherwise
 * 
 * @example
 * ```typescript
 * if (isLanguageSupported('fr')) {
 *   // TypeScript knows language is LanguageCode here
 *   const prompt = buildSystemPrompt('fr');
 * }
 * 
 * if (!isLanguageSupported('unknown')) {
 *   console.error('Language not supported');
 * }
 * ```
 */
export function isLanguageSupported(language: string): language is LanguageCode {
  return language in LANGUAGE_INSTRUCTIONS;
}
