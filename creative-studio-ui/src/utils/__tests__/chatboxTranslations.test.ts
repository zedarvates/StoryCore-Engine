/**
 * Unit tests for chatboxTranslations utility
 * 
 * Tests welcome message translations for all supported languages
 * and validates fallback behavior for unknown languages.
 */

import { describe, it, expect } from 'vitest';
import {
  getWelcomeMessage,
  getAllWelcomeMessages,
  isLanguageSupported,
} from '../chatboxTranslations';
import { type LanguageCode } from '../llmConfigStorage';

describe('chatboxTranslations', () => {
  describe('getWelcomeMessage', () => {
    it('should return French welcome message for fr', () => {
      const message = getWelcomeMessage('fr');
      expect(message).toContain('Bonjour');
      expect(message).toContain('StoryCore');
      expect(message).toContain('assistant');
    });

    it('should return English welcome message for en', () => {
      const message = getWelcomeMessage('en');
      expect(message).toContain('Hello');
      expect(message).toContain('StoryCore');
      expect(message).toContain('assistant');
    });

    it('should return Spanish welcome message for es', () => {
      const message = getWelcomeMessage('es');
      expect(message).toContain('Hola');
      expect(message).toContain('StoryCore');
      expect(message).toContain('asistente');
    });

    it('should return German welcome message for de', () => {
      const message = getWelcomeMessage('de');
      expect(message).toContain('Hallo');
      expect(message).toContain('StoryCore');
      expect(message).toContain('Assistent');
    });

    it('should return Italian welcome message for it', () => {
      const message = getWelcomeMessage('it');
      expect(message).toContain('Ciao');
      expect(message).toContain('StoryCore');
      expect(message).toContain('assistente');
    });

    it('should return Portuguese welcome message for pt', () => {
      const message = getWelcomeMessage('pt');
      expect(message).toContain('Olá');
      expect(message).toContain('StoryCore');
      expect(message).toContain('assistente');
    });

    it('should return Japanese welcome message for ja', () => {
      const message = getWelcomeMessage('ja');
      expect(message).toContain('こんにちは');
      expect(message).toContain('StoryCore');
      expect(message).toContain('アシスタント');
    });

    it('should return Chinese welcome message for zh', () => {
      const message = getWelcomeMessage('zh');
      expect(message).toContain('你好');
      expect(message).toContain('StoryCore');
      expect(message).toContain('助手');
    });

    it('should return Korean welcome message for ko', () => {
      const message = getWelcomeMessage('ko');
      expect(message).toContain('안녕하세요');
      expect(message).toContain('StoryCore');
      expect(message).toContain('어시스턴트');
    });

    it('should return welcome messages for all supported languages', () => {
      const languages: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];
      
      languages.forEach(lang => {
        const message = getWelcomeMessage(lang);
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(0);
        expect(message).toContain('StoryCore');
      });
    });

    it('should fallback to English for unknown language', () => {
      const englishMessage = getWelcomeMessage('en');
      const unknownMessage = getWelcomeMessage('unknown' as LanguageCode);
      expect(unknownMessage).toBe(englishMessage);
    });

    it('should return non-empty strings for all languages', () => {
      const languages: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];
      
      languages.forEach(lang => {
        const message = getWelcomeMessage(lang);
        expect(message.trim()).not.toBe('');
        expect(message.length).toBeGreaterThan(10); // Reasonable minimum length
      });
    });
  });

  describe('getAllWelcomeMessages', () => {
    it('should return all 9 welcome messages', () => {
      const messages = getAllWelcomeMessages();
      const keys = Object.keys(messages);
      expect(keys).toHaveLength(9);
    });

    it('should return object with all supported language keys', () => {
      const messages = getAllWelcomeMessages();
      const expectedLanguages: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];
      
      expectedLanguages.forEach(lang => {
        expect(messages).toHaveProperty(lang);
        expect(messages[lang]).toBeTruthy();
      });
    });

    it('should return all values as non-empty strings', () => {
      const messages = getAllWelcomeMessages();
      
      Object.values(messages).forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.trim()).not.toBe('');
      });
    });

    it('should return a copy (not reference) of messages', () => {
      const messages1 = getAllWelcomeMessages();
      const messages2 = getAllWelcomeMessages();
      
      expect(messages1).not.toBe(messages2); // Different objects
      expect(messages1).toEqual(messages2); // Same content
    });

    it('should include StoryCore in all messages', () => {
      const messages = getAllWelcomeMessages();
      
      Object.values(messages).forEach(message => {
        expect(message).toContain('StoryCore');
      });
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for all 9 supported languages', () => {
      const supportedLanguages: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];
      
      supportedLanguages.forEach(lang => {
        expect(isLanguageSupported(lang)).toBe(true);
      });
    });

    it('should return false for unsupported languages', () => {
      expect(isLanguageSupported('ru')).toBe(false);
      expect(isLanguageSupported('ar')).toBe(false);
      expect(isLanguageSupported('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isLanguageSupported('')).toBe(false);
    });

    it('should return false for undefined-like values', () => {
      expect(isLanguageSupported('undefined')).toBe(false);
      expect(isLanguageSupported('null')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isLanguageSupported('FR')).toBe(false);
      expect(isLanguageSupported('En')).toBe(false);
      expect(isLanguageSupported('fr')).toBe(true);
      expect(isLanguageSupported('en')).toBe(true);
    });
  });

  describe('Translation quality', () => {
    it('should have consistent message structure across languages', () => {
      const messages = getAllWelcomeMessages();
      const lengths = Object.values(messages).map(m => m.length);
      
      // All messages should be within reasonable length range
      const minLength = Math.min(...lengths);
      const maxLength = Math.max(...lengths);
      
      // Allow for language differences, but not extreme variations
      // Asian languages may be shorter due to character density
      expect(maxLength / minLength).toBeLessThan(3.5);
    });

    it('should end with question mark or equivalent in all languages', () => {
      const messages = getAllWelcomeMessages();
      
      Object.entries(messages).forEach(([_lang, message]) => {
        // Most languages use ? but some Asian languages may use different punctuation
        const hasQuestionMark = message.includes('?') || message.includes('？');
        expect(hasQuestionMark).toBe(true);
      });
    });

    it('should mention helping or assistance in all languages', () => {
      const messages = getAllWelcomeMessages();
      
      // Keywords that indicate offering help in different languages
      const helpKeywords: Record<LanguageCode, string[]> = {
        fr: ['aider', 'aide'],
        en: ['help'],
        es: ['ayudar', 'ayuda'],
        de: ['helfen', 'hilfe'],
        it: ['aiutarti', 'aiuto'],
        pt: ['ajudá-lo', 'ajudar', 'ajuda'],
        ja: ['お手伝い', '手伝'],
        zh: ['帮', '助'],
        ko: ['도와', '도움'],
      };
      
      Object.entries(messages).forEach(([lang, message]) => {
        const keywords = helpKeywords[lang as LanguageCode];
        const hasHelpKeyword = keywords.some(keyword => 
          message.toLowerCase().includes(keyword.toLowerCase())
        );
        expect(hasHelpKeyword).toBe(true);
      });
    });
  });
});