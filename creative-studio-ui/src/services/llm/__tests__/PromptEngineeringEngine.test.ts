/**
 * Tests for PromptEngineeringEngine
 * 
 * Tests prompt building including:
 * - System instructions with Confucian principles
 * - Few-shot examples
 * - Template system
 * - Enhanced prompt generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptEngineeringEngine, type FewShotExample } from '../PromptEngineeringEngine';

describe('PromptEngineeringEngine', () => {
  let engine: PromptEngineeringEngine;

  beforeEach(() => {
    engine = new PromptEngineeringEngine();
  });

  describe('buildEnhancedPrompt', () => {
    it('should build enhanced prompt with all components', () => {
      const result = engine.buildEnhancedPrompt(
        'Create a fantasy world',
        'world',
        'I want a steampunk world with magic'
      );

      expect(result).toContain('You are a creative assistant');
      expect(result).toContain('<thinking>');
      expect(result).toContain('<summary>');
      expect(result).toContain('CONFUCIAN PRINCIPLES');
      expect(result).toContain('Create a fantasy world');
      expect(result).toContain('I want a steampunk world with magic');
      expect(result).toContain('EXAMPLES:');
    });

    it('should include system instructions', () => {
      const result = engine.buildEnhancedPrompt(
        'Test prompt',
        'world',
        'Test input'
      );

      expect(result).toContain('You are a creative assistant following Confucian principles');
      expect(result).toContain('Structure ALL responses in TWO blocks');
    });

    it('should include few-shot examples by default', () => {
      const result = engine.buildEnhancedPrompt(
        'Test prompt',
        'world',
        'Test input'
      );

      expect(result).toContain('EXAMPLES:');
      expect(result).toContain('Example 1:');
    });

    it('should exclude examples when includeExamples is false', () => {
      const result = engine.buildEnhancedPrompt(
        'Test prompt',
        'world',
        'Test input',
        { includeExamples: false }
      );

      expect(result).not.toContain('EXAMPLES:');
      expect(result).not.toContain('Example 1:');
    });

    it('should work with world wizard type', () => {
      const result = engine.buildEnhancedPrompt(
        'Create a world',
        'world',
        'Steampunk world'
      );

      expect(result).toContain('Create a world');
      expect(result).toContain('Steampunk world');
    });

    it('should work with character wizard type', () => {
      const result = engine.buildEnhancedPrompt(
        'Create a character',
        'character',
        'Morally complex villain'
      );

      expect(result).toContain('Create a character');
      expect(result).toContain('Morally complex villain');
    });

    it('should work with story wizard type', () => {
      const result = engine.buildEnhancedPrompt(
        'Write a story',
        'story',
        'Opening scene'
      );

      expect(result).toContain('Write a story');
      expect(result).toContain('Opening scene');
    });
  });

  describe('System Instructions', () => {
    it('should include all Confucian principles by default', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'world',
        'Input'
      );

      expect(result).toContain('仁 (Ren - Benevolence)');
      expect(result).toContain('礼 (Li - Respect)');
      expect(result).toContain('义 (Yi - Transparency)');
      expect(result).toContain('智 (Zhi - Wisdom)');
    });

    it('should include only specified principles', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'world',
        'Input',
        { principles: ['ren', 'yi'] }
      );

      expect(result).toContain('仁 (Ren - Benevolence)');
      expect(result).toContain('义 (Yi - Transparency)');
      expect(result).not.toContain('礼 (Li - Respect)');
      expect(result).not.toContain('智 (Zhi - Wisdom)');
    });

    it('should include Ren principle with correct description', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'world',
        'Input',
        { principles: ['ren'] }
      );

      expect(result).toContain('仁 (Ren - Benevolence)');
      expect(result).toContain('Prioritize user\'s creative flourishing');
    });

    it('should include Li principle with correct description', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'world',
        'Input',
        { principles: ['li'] }
      );

      expect(result).toContain('礼 (Li - Respect)');
      expect(result).toContain('Honor cultural context and preferences');
    });

    it('should include Yi principle with correct description', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'world',
        'Input',
        { principles: ['yi'] }
      );

      expect(result).toContain('义 (Yi - Transparency)');
      expect(result).toContain('Explain your reasoning clearly');
    });

    it('should include Zhi principle with correct description', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'world',
        'Input',
        { principles: ['zhi'] }
      );

      expect(result).toContain('智 (Zhi - Wisdom)');
      expect(result).toContain('Learn from feedback and improve');
    });

    it('should include format instructions', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'world',
        'Input'
      );

      expect(result).toContain('Structure ALL responses in TWO blocks');
      expect(result).toContain('1. <thinking>: Your detailed reasoning process');
      expect(result).toContain('2. <summary>: A clear 3-5 step summary');
    });
  });

  describe('Few-Shot Examples', () => {
    it('should include world-building examples', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'world',
        'Input'
      );

      expect(result).toContain('EXAMPLES:');
      expect(result).toContain('steampunk world with magic');
      expect(result).toContain('Aetherpunk Realm');
    });

    it('should include character creation examples', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'character',
        'Input'
      );

      expect(result).toContain('EXAMPLES:');
      expect(result).toContain('morally complex villain');
      expect(result).toContain('Reluctant Tyrant');
    });

    it('should include storytelling examples', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'story',
        'Input'
      );

      expect(result).toContain('EXAMPLES:');
      expect(result).toContain('opening scene');
      expect(result).toContain('in medias res');
    });

    it('should format examples with thinking and summary blocks', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'world',
        'Input'
      );

      expect(result).toContain('Example 1:');
      expect(result).toContain('User:');
      expect(result).toContain('<thinking>');
      expect(result).toContain('</thinking>');
      expect(result).toContain('<summary>');
      expect(result).toContain('</summary>');
    });

    it('should separate examples with dividers', () => {
      const result = engine.buildEnhancedPrompt(
        'Test',
        'character',
        'Input'
      );

      // Character has multiple examples
      expect(result).toContain('---');
    });
  });

  describe('getTemplate', () => {
    it('should return world template', () => {
      const template = engine.getTemplate('world');

      expect(template).toBeDefined();
      expect(template?.wizardType).toBe('world');
      expect(template?.systemPrompt).toContain('world-building');
    });

    it('should return character template', () => {
      const template = engine.getTemplate('character');

      expect(template).toBeDefined();
      expect(template?.wizardType).toBe('character');
      expect(template?.systemPrompt).toContain('character development');
    });

    it('should return story template', () => {
      const template = engine.getTemplate('story');

      expect(template).toBeDefined();
      expect(template?.wizardType).toBe('story');
      expect(template?.systemPrompt).toContain('storytelling');
    });

    it('should have example count for each template', () => {
      const worldTemplate = engine.getTemplate('world');
      const charTemplate = engine.getTemplate('character');
      const storyTemplate = engine.getTemplate('story');

      expect(worldTemplate?.exampleCount).toBeGreaterThan(0);
      expect(charTemplate?.exampleCount).toBeGreaterThan(0);
      expect(storyTemplate?.exampleCount).toBeGreaterThan(0);
    });
  });

  describe('getExamples', () => {
    it('should return world examples', () => {
      const examples = engine.getExamples('world');

      expect(examples).toHaveLength(1);
      expect(examples[0].userInput).toContain('steampunk');
      expect(examples[0].thinking).toBeTruthy();
      expect(examples[0].summary).toBeTruthy();
    });

    it('should return character examples', () => {
      const examples = engine.getExamples('character');

      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0].userInput).toBeTruthy();
      expect(examples[0].thinking).toBeTruthy();
      expect(examples[0].summary).toBeTruthy();
    });

    it('should return story examples', () => {
      const examples = engine.getExamples('story');

      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0].userInput).toBeTruthy();
      expect(examples[0].thinking).toBeTruthy();
      expect(examples[0].summary).toBeTruthy();
    });

    it('should return empty array for unknown wizard type', () => {
      const examples = engine.getExamples('unknown' as any);

      expect(examples).toEqual([]);
    });

    it('should return examples with proper structure', () => {
      const examples = engine.getExamples('world');

      examples.forEach(example => {
        expect(example).toHaveProperty('userInput');
        expect(example).toHaveProperty('thinking');
        expect(example).toHaveProperty('summary');
        expect(typeof example.userInput).toBe('string');
        expect(typeof example.thinking).toBe('string');
        expect(typeof example.summary).toBe('string');
      });
    });
  });

  describe('addExample', () => {
    it('should add custom example to world wizard', () => {
      const customExample: FewShotExample = {
        userInput: 'Create a cyberpunk world',
        thinking: 'Analyzing cyberpunk elements...',
        summary: 'Neon-lit dystopian future',
      };

      engine.addExample('world', customExample);
      const examples = engine.getExamples('world');

      expect(examples).toContain(customExample);
      expect(examples[examples.length - 1]).toEqual(customExample);
    });

    it('should add custom example to character wizard', () => {
      const customExample: FewShotExample = {
        userInput: 'Create a hero character',
        thinking: 'Analyzing hero archetype...',
        summary: 'Reluctant hero with flaws',
      };

      engine.addExample('character', customExample);
      const examples = engine.getExamples('character');

      expect(examples).toContain(customExample);
    });

    it('should add custom example to story wizard', () => {
      const customExample: FewShotExample = {
        userInput: 'Write a plot twist',
        thinking: 'Analyzing twist mechanics...',
        summary: 'Unexpected revelation',
      };

      engine.addExample('story', customExample);
      const examples = engine.getExamples('story');

      expect(examples).toContain(customExample);
    });

    it('should preserve existing examples when adding new ones', () => {
      const initialCount = engine.getExamples('world').length;
      
      const customExample: FewShotExample = {
        userInput: 'Test',
        thinking: 'Test thinking',
        summary: 'Test summary',
      };

      engine.addExample('world', customExample);
      const examples = engine.getExamples('world');

      expect(examples.length).toBe(initialCount + 1);
    });

    it('should add multiple examples', () => {
      const example1: FewShotExample = {
        userInput: 'Test 1',
        thinking: 'Thinking 1',
        summary: 'Summary 1',
      };

      const example2: FewShotExample = {
        userInput: 'Test 2',
        thinking: 'Thinking 2',
        summary: 'Summary 2',
      };

      engine.addExample('world', example1);
      engine.addExample('world', example2);
      
      const examples = engine.getExamples('world');

      expect(examples).toContain(example1);
      expect(examples).toContain(example2);
    });
  });

  describe('Integration', () => {
    it('should build complete prompt with all features', () => {
      const result = engine.buildEnhancedPrompt(
        'Help me create a fantasy world',
        'world',
        'I want a world where magic and technology coexist',
        {
          principles: ['ren', 'li', 'yi', 'zhi'],
          includeExamples: true,
        }
      );

      // Check all components are present
      expect(result).toContain('You are a creative assistant');
      expect(result).toContain('CONFUCIAN PRINCIPLES');
      expect(result).toContain('仁 (Ren - Benevolence)');
      expect(result).toContain('礼 (Li - Respect)');
      expect(result).toContain('义 (Yi - Transparency)');
      expect(result).toContain('智 (Zhi - Wisdom)');
      expect(result).toContain('EXAMPLES:');
      expect(result).toContain('Help me create a fantasy world');
      expect(result).toContain('I want a world where magic and technology coexist');
      expect(result).toContain('Remember to structure your response');
    });

    it('should build minimal prompt without examples', () => {
      const result = engine.buildEnhancedPrompt(
        'Quick question',
        'world',
        'What is worldbuilding?',
        {
          principles: ['ren'],
          includeExamples: false,
        }
      );

      expect(result).toContain('You are a creative assistant');
      expect(result).toContain('仁 (Ren - Benevolence)');
      expect(result).not.toContain('EXAMPLES:');
      expect(result).toContain('Quick question');
      expect(result).toContain('What is worldbuilding?');
    });

    it('should handle long user inputs', () => {
      const longInput = 'I want to create a world that combines elements from multiple genres including fantasy, science fiction, steampunk, and cyberpunk, with a complex magic system that interacts with advanced technology in unexpected ways.';

      const result = engine.buildEnhancedPrompt(
        'Create a world',
        'world',
        longInput
      );

      expect(result).toContain(longInput);
    });

    it('should handle special characters in user input', () => {
      const specialInput = 'Create a world with "magic" & <technology> (advanced)';

      const result = engine.buildEnhancedPrompt(
        'Test',
        'world',
        specialInput
      );

      expect(result).toContain(specialInput);
    });
  });

  describe('Character Examples Coverage', () => {
    it('should have multiple character examples', () => {
      const examples = engine.getExamples('character');

      expect(examples.length).toBeGreaterThanOrEqual(2);
    });

    it('should include name generation example', () => {
      const examples = engine.getExamples('character');
      const nameExample = examples.find(ex => 
        ex.userInput.toLowerCase().includes('name')
      );

      expect(nameExample).toBeDefined();
      expect(nameExample?.thinking).toContain('phonetic');
      expect(nameExample?.summary).toContain('Aelindra');
    });

    it('should include personality traits example', () => {
      const examples = engine.getExamples('character');
      const personalityExample = examples.find(ex => 
        ex.userInput.toLowerCase().includes('personality')
      );

      expect(personalityExample).toBeDefined();
      expect(personalityExample?.thinking).toContain('wise mentor');
    });

    it('should include backstory example', () => {
      const examples = engine.getExamples('character');
      const backstoryExample = examples.find(ex => 
        ex.userInput.toLowerCase().includes('backstory')
      );

      expect(backstoryExample).toBeDefined();
      expect(backstoryExample?.thinking).toContain('rogue');
    });
  });

  describe('Story Examples Coverage', () => {
    it('should have multiple story examples', () => {
      const examples = engine.getExamples('story');

      expect(examples.length).toBeGreaterThanOrEqual(1);
    });

    it('should include opening scene example', () => {
      const examples = engine.getExamples('story');
      const openingExample = examples.find(ex => 
        ex.userInput.toLowerCase().includes('opening')
      );

      expect(openingExample).toBeDefined();
      expect(openingExample?.thinking).toContain('in medias res');
    });

    it('should include complete story example', () => {
      const examples = engine.getExamples('story');
      const storyExample = examples.find(ex => 
        ex.userInput.toLowerCase().includes('complete story')
      );

      expect(storyExample).toBeDefined();
      expect(storyExample?.summary).toContain('Act 1');
      expect(storyExample?.summary).toContain('Act 2');
      expect(storyExample?.summary).toContain('Act 3');
    });
  });
});
