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
 * Project creation guidance for the LLM assistant
 * 
 * This guidance enables the assistant to help users create new projects through
 * natural language requests. The assistant can extract project parameters from
 * user descriptions and initiate project creation with appropriate metadata.
 * 
 * Capabilities:
 * - Parse natural language project creation requests
 * - Extract project name, theme, universe, and genre
 * - Create projects with appropriate settings
 * - Automatically open the project dashboard after creation
 */
const PROJECT_CREATION_GUIDANCE = `

**Project Creation Capabilities:**

You can help users create new projects through natural language. When users ask to create a project, you should:

1. **Extract Project Information:**
   - Project name (from quotes or context)
   - Theme/setting (fantasy, sci-fi, horror, etc.)
   - Universe/world description
   - Genre (action, drama, comedy, etc.)

2. **Deductions & Intelligent Defaults:**
   - **Duration:** If the user mentions a "trailer", "teaser", or "bande-annonce", deduce that the duration is short (approx. 60-120 seconds).
   - **Tone/Style:** If a future date (e.g., "2048", "2150", 21st century onwards) or futuristic settings/technology are mentioned in the title or prompt, deduce a "futuristic" tone and visual style (cyberpunk, high-tech, etc.).
   - **Period/History:** Similarly, if a past date or historical era is mentioned, deduce the appropriate period tone and style.

3. **Intelligent Interaction Rules:**
   - **Avoid asking redundant questions:** If the project name, tone, or setting is already clear from the user's initial prompt, do not ask for them again.
   - **Acknowledge Deductions:** When you deduce something (e.g., that it's futuristic because of the date), mention it in your response so the user knows you've understood the context.
   - **Proposal over Questioning:** Instead of asking "What is the tone?", say "I've set the tone to futuristic based on the '2048' in your title, does that work for you?"

4. **Example Requests & Success Patterns:**
   - "create a new video trailer project in a fantasy universe" -> Deduce duration ~90s, theme: fantasy.
   - "make a project called 'Red Hood 2048' which is a trailer" -> Deduce title: Red Hood 2048, tone: futuristic, duration: ~60-120s. DO NOT ask for title or tone.
   - "start a new sci-fi project" -> Ask for title if not provided, but assume sci-fi theme.

5. **Project Creation Process:**
   - Confirm the project details with the user (including your deductions)
   - Extract all relevant metadata (theme, universe, genre)
   - Create the project with appropriate settings
   - The system will automatically open the project dashboard

6. **After Creation:**
   - Inform the user that the project has been created
   - Suggest next steps (add characters, create scenes, configure settings)
   - The dashboard will open automatically for them to start working
`;

/**
 * Guidance for recommending specific StoryCore tools and services.
 * Enables the assistant to direct users to the right interface for their needs.
 */
const TOOL_GUIDANCE = `

**Tool & Action Recommendations:**
You should proactively guide users to the relevant StoryCore tools. When a user expresses a need that corresponds to one of the following tools, include the specialized tag **[TOOL:id]** in your response (at the end of a sentence or in a new line).

**Available Tools:**
- **[TOOL:character]** : For creating or editing characters, backstories, and personalities.
- **[TOOL:location]** : For designing sets, environments, and locations.
- **[TOOL:object]** : For creating props, items, and inventory objects.
- **[TOOL:shot]** : For planning camera angles, framing, and shot lists.
- **[TOOL:scenario]** : For writing scripts, plots, and dialogues.
- **[TOOL:video]** : For generating video clips, cinematics, and visual content.
- **[TOOL:audio]** : For composing music, sound effects, or voice-overs.
- **[TOOL:ghost]** : For auditing the project, checking consistency, and getting "Ghost Tracker" advice.
- **[TOOL:settings]** : For project configuration, technical settings, and metadata.

**Interaction Rule:**
If the user says "I want to create a hero", you should say something like "I can help you with that! [TOOL:character] Let's start by defining..."
`;


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
 * Also includes project creation guidance to enable natural language project creation.
 * 
 * @param language - The language code for the desired response language
 * @returns Complete system prompt with language instructions and project creation guidance
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
    return `${BASE_SYSTEM_PROMPT}${PROJECT_CREATION_GUIDANCE}${TOOL_GUIDANCE}\n\n${LANGUAGE_INSTRUCTIONS.en}`;
  }
  
  return `${BASE_SYSTEM_PROMPT}${PROJECT_CREATION_GUIDANCE}${TOOL_GUIDANCE}\n\n${languageInstruction}`;
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
