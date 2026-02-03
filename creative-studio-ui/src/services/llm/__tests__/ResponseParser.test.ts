/**
 * ResponseParser Unit Tests
 * 
 * Tests for thinking/summary extraction including:
 * - Valid format parsing
 * - Malformed response handling
 * - Fallback extraction
 * - Format validation
 */

import { describe, it, expect } from 'vitest';
import { ResponseParser } from '../ResponseParser';

describe('ResponseParser', () => {
  let parser: ResponseParser;

  beforeEach(() => {
    parser = new ResponseParser();
  });

  describe('parseResponse', () => {
    it('should parse valid thinking/summary format', () => {
      const input = `<thinking>
Step 1: Analyze the request
Step 2: Consider options
Step 3: Make decision
</thinking>

<summary>
I analyzed your request and chose the best approach.
</summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toContain('Step 1');
      expect(result.thinking).toContain('Step 2');
      expect(result.thinking).toContain('Step 3');
      expect(result.summary).toContain('analyzed your request');
      expect(result.formatValid).toBe(true);
      expect(result.rawResponse).toBe(input);
    });

    it('should handle thinking and summary on same line', () => {
      const input = '<thinking>Quick thought</thinking><summary>Quick summary</summary>';

      const result = parser.parseResponse(input);

      expect(result.thinking).toBe('Quick thought');
      expect(result.summary).toBe('Quick summary');
      expect(result.formatValid).toBe(true);
    });

    it('should trim whitespace from extracted content', () => {
      const input = `<thinking>
      
      Content with spaces
      
      </thinking>
      
      <summary>
      
      Summary with spaces
      
      </summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toBe('Content with spaces');
      expect(result.summary).toBe('Summary with spaces');
    });

    it('should handle multiline content', () => {
      const input = `<thinking>
Line 1
Line 2
Line 3
</thinking>

<summary>
Summary line 1
Summary line 2
</summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toContain('Line 1');
      expect(result.thinking).toContain('Line 2');
      expect(result.thinking).toContain('Line 3');
      expect(result.summary).toContain('Summary line 1');
      expect(result.summary).toContain('Summary line 2');
    });

    it('should handle special characters in content', () => {
      const input = `<thinking>
Special chars: <>&"'
Math: 2 + 2 = 4
Code: const x = 5;
</thinking>

<summary>
Result: Success!
</summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toContain('<>&"\'');
      expect(result.thinking).toContain('2 + 2 = 4');
      expect(result.thinking).toContain('const x = 5;');
      expect(result.summary).toContain('Success!');
    });
  });

  describe('Malformed Response Handling', () => {
    it('should handle missing thinking block', () => {
      const input = '<summary>Just a summary</summary>';

      const result = parser.parseResponse(input);

      expect(result.thinking).toBeUndefined();
      expect(result.summary).toBe('Just a summary');
      expect(result.formatValid).toBe(false);
    });

    it('should handle missing summary block', () => {
      const input = '<thinking>Just thinking</thinking>';

      const result = parser.parseResponse(input);

      expect(result.thinking).toBe('Just thinking');
      expect(result.summary).toBe('<thinking>Just thinking</thinking>'); // Fallback uses full response
      expect(result.formatValid).toBe(false);
    });

    it('should handle missing both blocks', () => {
      const input = 'Plain text response without any tags';

      const result = parser.parseResponse(input);

      expect(result.thinking).toBeUndefined();
      expect(result.summary).toBe('Plain text response without any tags');
      expect(result.formatValid).toBe(false);
    });

    it('should handle unclosed thinking tag', () => {
      const input = '<thinking>Unclosed thinking<summary>Summary</summary>';

      const result = parser.parseResponse(input);

      expect(result.thinking).toBeUndefined();
      expect(result.summary).toBe('Summary');
      expect(result.formatValid).toBe(false);
    });

    it('should handle unclosed summary tag', () => {
      const input = '<thinking>Thinking</thinking><summary>Unclosed summary';

      const result = parser.parseResponse(input);

      expect(result.thinking).toBe('Thinking');
      expect(result.summary).toBe('Unclosed summary');
      expect(result.formatValid).toBe(false);
    });

    it('should handle partial tags', () => {
      const input = '<think>Not quite right</think><summ>Also wrong</summ>';

      const result = parser.parseResponse(input);

      expect(result.thinking).toBeUndefined();
      expect(result.summary).toBe('<think>Not quite right</think><summ>Also wrong</summ>');
      expect(result.formatValid).toBe(false);
    });

    it('should handle nested tags', () => {
      const input = `<thinking>
Outer thinking
<thinking>Inner thinking</thinking>
More outer thinking
</thinking>

<summary>Summary</summary>`;

      const result = parser.parseResponse(input);

      // Should extract first thinking block
      expect(result.thinking).toContain('Outer thinking');
      expect(result.summary).toBe('Summary');
    });
  });

  describe('Fallback Extraction', () => {
    it('should extract fallback summary from plain text', () => {
      const input = 'This is a plain text response without any formatting.';

      const result = parser.parseResponse(input);

      expect(result.summary).toBe(input);
      expect(result.thinking).toBeUndefined();
      expect(result.formatValid).toBe(false);
    });

    it('should remove partial thinking tags from fallback', () => {
      const input = '<thinking>Incomplete thinking... And then some text after.';

      const result = parser.parseResponse(input);

      expect(result.summary).not.toContain('<thinking>');
      expect(result.summary).toContain('And then some text after');
    });

    it('should remove partial summary tags from fallback', () => {
      const input = 'Some text before <summary>Incomplete summary...';

      const result = parser.parseResponse(input);

      expect(result.summary).not.toContain('<summary>');
      expect(result.summary).toContain('Some text before');
    });

    it('should handle mixed valid and invalid tags', () => {
      const input = `<thinking>Valid thinking</thinking>
Some extra text
<summary>Incomplete summary`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toBe('Valid thinking');
      expect(result.summary).toContain('Incomplete summary');
      expect(result.summary).not.toContain('<summary>');
    });

    it('should return original response if fallback extraction fails', () => {
      const input = '';

      const result = parser.parseResponse(input);

      expect(result.summary).toBe('');
      expect(result.formatValid).toBe(false);
    });
  });

  describe('validateFormat', () => {
    it('should validate correct format', () => {
      const input = '<thinking>Thinking</thinking><summary>Summary</summary>';

      const validation = parser.validateFormat(input);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing thinking opening tag', () => {
      const input = 'Thinking</thinking><summary>Summary</summary>';

      const validation = parser.validateFormat(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing <thinking> opening tag');
    });

    it('should detect missing thinking closing tag', () => {
      const input = '<thinking>Thinking<summary>Summary</summary>';

      const validation = parser.validateFormat(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing </thinking> closing tag');
    });

    it('should detect missing summary opening tag', () => {
      const input = '<thinking>Thinking</thinking>Summary</summary>';

      const validation = parser.validateFormat(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing <summary> opening tag');
    });

    it('should detect missing summary closing tag', () => {
      const input = '<thinking>Thinking</thinking><summary>Summary';

      const validation = parser.validateFormat(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing </summary> closing tag');
    });

    it('should detect multiple missing tags', () => {
      const input = 'Plain text';

      const validation = parser.validateFormat(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(4);
      expect(validation.errors).toContain('Missing <thinking> opening tag');
      expect(validation.errors).toContain('Missing </thinking> closing tag');
      expect(validation.errors).toContain('Missing <summary> opening tag');
      expect(validation.errors).toContain('Missing </summary> closing tag');
    });

    it('should handle case-sensitive tags', () => {
      const input = '<THINKING>Thinking</THINKING><SUMMARY>Summary</SUMMARY>';

      const validation = parser.validateFormat(input);

      // Should be invalid because tags are case-sensitive
      expect(validation.valid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = parser.parseResponse('');

      expect(result.thinking).toBeUndefined();
      expect(result.summary).toBe('');
      expect(result.formatValid).toBe(false);
    });

    it('should handle very long content', () => {
      const longThinking = 'Step '.repeat(1000);
      const longSummary = 'Summary '.repeat(500);
      const input = `<thinking>${longThinking}</thinking><summary>${longSummary}</summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toContain('Step');
      expect(result.summary).toContain('Summary');
      expect(result.formatValid).toBe(true);
    });

    it('should handle unicode characters', () => {
      const input = `<thinking>
思考过程：分析问题
仁 (Ren) - 仁慈
</thinking>

<summary>
总结：选择最佳方案
🎯 目标达成
</summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toContain('思考过程');
      expect(result.thinking).toContain('仁 (Ren)');
      expect(result.summary).toContain('总结');
      expect(result.summary).toContain('🎯');
      expect(result.formatValid).toBe(true);
    });

    it('should handle HTML-like content inside tags', () => {
      const input = `<thinking>
Consider <strong>bold</strong> text
And <em>italic</em> text
</thinking>

<summary>
Result: <code>success</code>
</summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toContain('<strong>bold</strong>');
      expect(result.thinking).toContain('<em>italic</em>');
      expect(result.summary).toContain('<code>success</code>');
      expect(result.formatValid).toBe(true);
    });

    it('should handle newlines and tabs', () => {
      const input = `<thinking>\n\tStep 1\n\tStep 2\n</thinking>\n\n<summary>\n\tResult\n</summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toContain('Step 1');
      expect(result.thinking).toContain('Step 2');
      expect(result.summary).toContain('Result');
      expect(result.formatValid).toBe(true);
    });

    it('should set timestamp', () => {
      const before = Date.now();
      const result = parser.parseResponse('<thinking>T</thinking><summary>S</summary>');
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it('should preserve rawResponse', () => {
      const input = '<thinking>Thinking</thinking><summary>Summary</summary>';

      const result = parser.parseResponse(input);

      expect(result.rawResponse).toBe(input);
    });

    it('should handle responses with extra content before tags', () => {
      const input = `Here is my response:

<thinking>Thinking process</thinking>

<summary>Final summary</summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toBe('Thinking process');
      expect(result.summary).toBe('Final summary');
      expect(result.formatValid).toBe(true);
    });

    it('should handle responses with extra content after tags', () => {
      const input = `<thinking>Thinking process</thinking>

<summary>Final summary</summary>

Additional notes here.`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toBe('Thinking process');
      expect(result.summary).toBe('Final summary');
      expect(result.formatValid).toBe(true);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle typical world-building response', () => {
      const input = `<thinking>
1. Analyzing user's concept: Steampunk + magic
2. Considering coherence: How do they coexist?
3. Exploring options:
   - Option A: Magic powers technology
   - Option B: Separate systems
   - Option C: Hybrid "Aetherpunk"
4. Decision: Option C provides most flexibility
</thinking>

<summary>
**World Concept: Aetherpunk Realm**

1. **Core Idea**: Victorian-era society where magic ("Aether") is channeled through steam-powered devices
2. **Why This Works**: Combines steampunk aesthetic with magical elements seamlessly
3. **Next Steps**: Define how Aether is harvested

This approach gives you the best of both worlds.
</summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toContain('Analyzing user\'s concept');
      expect(result.thinking).toContain('Option C');
      expect(result.summary).toContain('Aetherpunk Realm');
      expect(result.summary).toContain('Victorian-era society');
      expect(result.formatValid).toBe(true);
    });

    it('should handle typical character creation response', () => {
      const input = `<thinking>
1. Understanding request: Morally complex villain
2. Analyzing "morally complex": Understandable motivations
3. Exploring archetypes:
   - Tragic villain
   - Sympathetic antagonist
   - Anti-villain
4. Decision: Anti-villain with personal tragedy
</thinking>

<summary>
**Character Concept: The Reluctant Tyrant**

1. **Core Trait**: Former idealist turned authoritarian
2. **Moral Complexity**: Believes oppression is necessary
3. **Why Compelling**: Readers will understand their logic

This creates a villain your audience will debate about.
</summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toContain('Morally complex villain');
      expect(result.thinking).toContain('Anti-villain');
      expect(result.summary).toContain('Reluctant Tyrant');
      expect(result.summary).toContain('Former idealist');
      expect(result.formatValid).toBe(true);
    });

    it('should handle response with Confucian principles', () => {
      const input = `<thinking>
1. Analyzing request with 仁 (Ren - Benevolence)
2. Considering user's creative flourishing
3. Applying 礼 (Li - Respect) to cultural context
4. Using 义 (Yi - Transparency) in explanation
5. Demonstrating 智 (Zhi - Wisdom) in decision
</thinking>

<summary>
I've analyzed your request with Confucian principles in mind:

1. **Benevolence**: Prioritized your creative goals
2. **Respect**: Honored your cultural context
3. **Transparency**: Explained my reasoning clearly

This approach ensures ethical and thoughtful assistance.
</summary>`;

      const result = parser.parseResponse(input);

      expect(result.thinking).toContain('仁 (Ren - Benevolence)');
      expect(result.thinking).toContain('礼 (Li - Respect)');
      expect(result.summary).toContain('Confucian principles');
      expect(result.formatValid).toBe(true);
    });
  });
});
