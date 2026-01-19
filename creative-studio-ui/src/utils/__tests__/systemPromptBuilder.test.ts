/**
 * Tests for System Prompt Builder
 */

import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  getSupportedLanguages,
  isLanguageSupported,
} from '../systemPromptBuilder';
import { type LanguageCode } from '@/components/launcher/LanguageSelector';

describe('systemPromptBuilder', () => {
  describe('buildSystemPrompt', () => {
    it('should include base StoryCore personality for all languages', () => {
      const languages: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];
      
      languages.forEach((lang) => {
        const prompt = buildSystemPrompt(lang);
        expect(prompt).toContain('StoryCore AI assistant');
        expect(prompt).toContain('video storyboard projects');
      });
    });

    it('should include French instruction for French language', () => {
      const prompt = buildSystemPrompt('fr');
      expect(prompt).toContain('Respond in French');
      expect(prompt).toContain('Français');
    });

    it('should include English instruction for English language', () => {
      const prompt = buildSystemPrompt('en');
      expect(prompt).toContain('Respond in English');
    });

    it('should include Spanish instruction for Spanish language', () => {
      const prompt = buildSystemPrompt('es');
      expect(prompt).toContain('Respond in Spanish');
      expect(prompt).toContain('Español');
    });

    it('should include German instruction for German language', () => {
      const prompt = buildSystemPrompt('de');
      expect(prompt).toContain('Respond in German');
      expect(prompt).toContain('Deutsch');
    });

    it('should include Italian instruction for Italian language', () => {
      const prompt = buildSystemPrompt('it');
      expect(prompt).toContain('Respond in Italian');
      expect(prompt).toContain('Italiano');
    });

    it('should include Portuguese instruction for Portuguese language', () => {
      const prompt = buildSystemPrompt('pt');
      expect(prompt).toContain('Respond in Portuguese');
      expect(prompt).toContain('Português');
    });

    it('should include Japanese instruction for Japanese language', () => {
      const prompt = buildSystemPrompt('ja');
      expect(prompt).toContain('Respond in Japanese');
      expect(prompt).toContain('日本語');
    });

    it('should include Chinese instruction for Chinese language', () => {
      const prompt = buildSystemPrompt('zh');
      expect(prompt).toContain('Respond in Chinese');
      expect(prompt).toContain('中文');
    });

    it('should include Korean instruction for Korean language', () => {
      const prompt = buildSystemPrompt('ko');
      expect(prompt).toContain('Respond in Korean');
      expect(prompt).toContain('한국어');
    });

    it('should return consistent format with base prompt followed by language instruction', () => {
      const prompt = buildSystemPrompt('en');
      const parts = prompt.split('\n\n');
      
      expect(parts).toHaveLength(2);
      expect(parts[0]).toContain('StoryCore AI assistant');
      expect(parts[1]).toContain('Respond in');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all 9 supported languages', () => {
      const languages = getSupportedLanguages();
      const languageCodes = Object.keys(languages);
      
      expect(languageCodes).toHaveLength(9);
      expect(languageCodes).toContain('fr');
      expect(languageCodes).toContain('en');
      expect(languageCodes).toContain('es');
      expect(languageCodes).toContain('de');
      expect(languageCodes).toContain('it');
      expect(languageCodes).toContain('pt');
      expect(languageCodes).toContain('ja');
      expect(languageCodes).toContain('zh');
      expect(languageCodes).toContain('ko');
    });

    it('should return instructions for each language', () => {
      const languages = getSupportedLanguages();
      
      Object.values(languages).forEach((instruction) => {
        expect(instruction).toBeTruthy();
        expect(typeof instruction).toBe('string');
        expect(instruction.length).toBeGreaterThan(0);
      });
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for all supported languages', () => {
      const supportedCodes = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];
      
      supportedCodes.forEach((code) => {
        expect(isLanguageSupported(code)).toBe(true);
      });
    });

    it('should return false for unsupported languages', () => {
      const unsupportedCodes = ['ru', 'ar', 'hi', 'invalid', ''];
      
      unsupportedCodes.forEach((code) => {
        expect(isLanguageSupported(code)).toBe(false);
      });
    });
  });
});
