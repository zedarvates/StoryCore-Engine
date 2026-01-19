/**
 * Chatbox Translations
 * 
 * Provides internationalized UI strings for the chatbox component.
 * Maintains consistent messaging across all supported languages.
 * 
 * This module follows the same pattern as systemPromptBuilder.ts,
 * providing centralized translation management for chatbox UI elements.
 * 
 * @module chatboxTranslations
 * 
 * @example
 * ```typescript
 * import { getWelcomeMessage } from '@/utils/chatboxTranslations';
 * 
 * // Get French welcome message
 * const frenchWelcome = getWelcomeMessage('fr');
 * 
 * // Use in component
 * const welcomeMessage = {
 *   id: '1',
 *   type: 'assistant',
 *   content: getWelcomeMessage(currentLanguage),
 *   timestamp: new Date(),
 * };
 * ```
 */

import { type LanguageCode } from '@/utils/llmConfigStorage';

/**
 * Welcome message translations for all supported languages
 * 
 * Each message maintains a friendly, helpful tone while introducing
 * the StoryCore assistant and offering help to the user.
 * 
 * Translation guidelines:
 * - Use appropriate formality level for each language
 * - Mention "StoryCore" by name (in Latin characters)
 * - Include "assistant" or equivalent term
 * - End with a question about helping
 * - Keep messages concise (1-2 sentences)
 * 
 * @see {@link LanguageCode} for supported language codes
 */
const WELCOME_MESSAGES: Record<LanguageCode, string> = {
  fr: "Bonjour ! Je suis votre assistant StoryCore. Comment puis-je vous aider aujourd'hui ?",
  en: "Hello! I'm your StoryCore assistant. How can I help you today?",
  es: "¡Hola! Soy tu asistente StoryCore. ¿Cómo puedo ayudarte hoy?",
  de: "Hallo! Ich bin Ihr StoryCore-Assistent. Wie kann ich Ihnen heute helfen?",
  it: "Ciao! Sono il tuo assistente StoryCore. Come posso aiutarti oggi?",
  pt: "Olá! Sou o seu assistente StoryCore. Como posso ajudá-lo hoje?",
  ja: "こんにちは！StoryCoreアシスタントです。今日はどのようにお手伝いできますか？",
  zh: "你好！我是您的StoryCore助手。今天我能帮您什么？",
  ko: "안녕하세요! StoryCore 어시스턴트입니다. 오늘 무엇을 도와드릴까요?",
};

/**
 * Get the welcome message for a specific language
 * 
 * Returns the appropriate welcome message based on the user's language
 * preference. Falls back to English if the language is not found.
 * 
 * @param language - The language code for the desired message
 * @returns Welcome message in the specified language
 * 
 * @example
 * ```typescript
 * const message = getWelcomeMessage('fr');
 * // Returns: "Bonjour ! Je suis votre assistant StoryCore..."
 * 
 * const unknownMessage = getWelcomeMessage('unknown' as LanguageCode);
 * // Returns: English message (fallback)
 * ```
 */
export function getWelcomeMessage(language: LanguageCode): string {
  const message = WELCOME_MESSAGES[language];
  
  if (!message) {
    // Fallback to English if language not found (should never happen with TypeScript)
    console.warn(`Unknown language code: ${language}, falling back to English`);
    return WELCOME_MESSAGES.en;
  }
  
  return message;
}

/**
 * Get all welcome messages
 * 
 * Returns a copy of all welcome message translations. Useful for testing,
 * validation, and documentation purposes.
 * 
 * @returns Record of all language codes and their welcome messages
 * 
 * @example
 * ```typescript
 * const messages = getAllWelcomeMessages();
 * console.log(messages.fr); // "Bonjour ! Je suis votre assistant..."
 * console.log(Object.keys(messages)); // ['fr', 'en', 'es', ...]
 * ```
 */
export function getAllWelcomeMessages(): Record<LanguageCode, string> {
  return { ...WELCOME_MESSAGES };
}

/**
 * Validate that a language code is supported
 * 
 * Type guard function that checks if a given string is a valid language code
 * with an associated welcome message. Useful for runtime validation.
 * 
 * @param language - The language code to validate
 * @returns True if the language is supported, false otherwise
 * 
 * @example
 * ```typescript
 * if (isLanguageSupported('fr')) {
 *   // TypeScript knows language is LanguageCode here
 *   const message = getWelcomeMessage('fr');
 * }
 * 
 * if (!isLanguageSupported('unknown')) {
 *   console.error('Language not supported');
 * }
 * ```
 */
export function isLanguageSupported(language: string): language is LanguageCode {
  return language in WELCOME_MESSAGES;
}
