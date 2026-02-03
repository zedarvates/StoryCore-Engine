/**
 * Prompt Engineering Engine
 * 
 * Builds enhanced prompts with Confucian principles, thinking/summary format,
 * and few-shot examples for different creative domains.
 */

export interface PromptTemplate {
  wizardType: 'world' | 'character' | 'story';
  systemPrompt: string;
  exampleCount: number;
}

export interface FewShotExample {
  userInput: string;
  thinking: string;
  summary: string;
}

export interface EnhancedPromptOptions {
  showThinking?: boolean;
  principles?: ('ren' | 'li' | 'yi' | 'zhi')[];
  includeExamples?: boolean;
}

/**
 * Prompt Engineering Engine
 */
export class PromptEngineeringEngine {
  private templates: Map<string, PromptTemplate>;
  private fewShotExamples: Map<string, FewShotExample[]>;

  constructor() {
    this.templates = new Map();
    this.fewShotExamples = new Map();
    this.loadTemplates();
    this.loadFewShotExamples();
  }

  /**
   * Build enhanced prompt with thinking/summary format
   */
  buildEnhancedPrompt(
    basePrompt: string,
    wizardType: 'world' | 'character' | 'story',
    userInput: string,
    options?: EnhancedPromptOptions
  ): string {
    const systemInstructions = this.buildSystemInstructions(options);
    const examples = options?.includeExamples !== false 
      ? this.buildFewShotExamples(wizardType)
      : '';

    return `${systemInstructions}

${examples}

${basePrompt}

User Request: ${userInput}

Remember to structure your response with <thinking> and <summary> blocks.`;
  }

  /**
   * Build system instructions with Confucian principles
   */
  private buildSystemInstructions(options?: EnhancedPromptOptions): string {
    const principles = options?.principles || ['ren', 'li', 'yi', 'zhi'];
    
    let instructions = `You are a creative assistant following Confucian principles.

CRITICAL: Structure ALL responses in TWO blocks:
1. <thinking>: Your detailed reasoning process (step-by-step)
2. <summary>: A clear 3-5 step summary for the user

CONFUCIAN PRINCIPLES:`;

    if (principles.includes('ren')) {
      instructions += '\n- 仁 (Ren - Benevolence): Prioritize user\'s creative flourishing';
    }
    if (principles.includes('li')) {
      instructions += '\n- 礼 (Li - Respect): Honor cultural context and preferences';
    }
    if (principles.includes('yi')) {
      instructions += '\n- 义 (Yi - Transparency): Explain your reasoning clearly';
    }
    if (principles.includes('zhi')) {
      instructions += '\n- 智 (Zhi - Wisdom): Learn from feedback and improve';
    }

    instructions += '\n\nYour thinking should be thorough but your summary should be accessible.';

    return instructions;
  }

  /**
   * Build few-shot examples section
   */
  private buildFewShotExamples(wizardType: 'world' | 'character' | 'story'): string {
    const examples = this.fewShotExamples.get(wizardType) || [];
    
    if (examples.length === 0) {
      return '';
    }

    let examplesText = 'EXAMPLES:\n\n';
    
    examples.forEach((example, index) => {
      examplesText += `Example ${index + 1}:\n`;
      examplesText += `User: ${example.userInput}\n\n`;
      examplesText += `<thinking>\n${example.thinking}\n</thinking>\n\n`;
      examplesText += `<summary>\n${example.summary}\n</summary>\n\n`;
      examplesText += '---\n\n';
    });

    return examplesText;
  }

  /**
   * Load prompt templates
   */
  private loadTemplates(): void {
    this.templates.set('world', {
      wizardType: 'world',
      systemPrompt: 'You are a world-building expert...',
      exampleCount: 2,
    });

    this.templates.set('character', {
      wizardType: 'character',
      systemPrompt: 'You are a character development specialist...',
      exampleCount: 2,
    });

    this.templates.set('story', {
      wizardType: 'story',
      systemPrompt: 'You are a storytelling expert...',
      exampleCount: 2,
    });
  }

  /**
   * Load few-shot examples
   */
  private loadFewShotExamples(): void {
    // World-building examples
    this.fewShotExamples.set('world', [
      {
        userInput: 'Create a steampunk world with magic',
        thinking: `1. Analyzing user's concept: Steampunk (Victorian + technology) + magic system
2. Considering coherence: How do magic and steam technology coexist?
3. Exploring options:
   - Option A: Magic powers the steam technology
   - Option B: Magic and technology are separate, competing forces
   - Option C: Hybrid "Aetherpunk" where magic is channeled through tech
4. Ethical consideration (仁): Ensuring the world allows for diverse stories
5. Cultural respect (礼): Avoiding stereotypes in Victorian-era inspiration
6. Decision: Option C provides most creative flexibility`,
        summary: `**World Concept: Aetherpunk Realm**

1. **Core Idea**: Victorian-era society where magic ("Aether") is channeled through steam-powered devices
2. **Why This Works**: Combines your steampunk aesthetic with magical elements seamlessly
3. **Next Steps**: Define how Aether is harvested and what limits exist on its use

This approach gives you the best of both worlds while maintaining internal logic.`,
      },
    ]);

    // Character creation examples
    this.fewShotExamples.set('character', [
      {
        userInput: 'Create a morally complex villain',
        thinking: `1. Understanding request: User wants depth, not pure evil
2. Analyzing "morally complex": Villain with understandable motivations
3. Exploring archetypes:
   - Tragic villain (good intentions, bad methods)
   - Sympathetic antagonist (opposing hero for valid reasons)
   - Anti-villain (does bad things for good reasons)
4. Ethical consideration (义): Ensuring character has genuine moral reasoning
5. Benevolence check (仁): Character should challenge reader's thinking
6. Decision: Anti-villain with personal tragedy driving their actions`,
        summary: `**Character Concept: The Reluctant Tyrant**

1. **Core Trait**: Former idealist who became authoritarian to "save" their people
2. **Moral Complexity**: Genuinely believes oppression is necessary for survival
3. **Why Compelling**: Readers will understand their logic even while opposing them

This creates a villain your audience will debate about long after the story ends.`,
      },
      {
        userInput: 'Generate fantasy character names that sound mystical',
        thinking: `1. Understanding request: Names for fantasy setting with mystical quality
2. Analyzing "mystical": Should evoke magic, ancient wisdom, otherworldly feel
3. Considering phonetic patterns:
   - Soft consonants (l, m, n, v) create flowing sound
   - Vowel combinations (ae, ia, eo) add elegance
   - Avoid harsh sounds unless for specific effect
4. Cultural respect (礼): Drawing from various traditions without appropriation
5. Exploring options:
   - Elven-inspired: Aelindra, Thalion
   - Mystical neutral: Lyrien, Seraphel
   - Ancient-sounding: Mordecai, Zephyra
6. Decision: Mix of styles for variety`,
        summary: `Aelindra, Thalion, Lyrien, Seraphel, Zephyra

These names combine soft phonetics with mystical elements, suitable for various fantasy character types.`,
      },
      {
        userInput: 'Describe personality traits for a wise mentor character',
        thinking: `1. Understanding request: Mentor archetype personality
2. Analyzing "wise mentor": Beyond just "old and smart"
3. Considering depth:
   - Wisdom from experience (not just age)
   - Patience balanced with urgency
   - Flaws that make them relatable
4. Benevolence (仁): Mentor should genuinely care about student growth
5. Exploring trait combinations:
   - Patient yet demanding
   - Wise yet still learning
   - Mysterious yet transparent when needed
6. Decision: Complex traits that avoid clichés`,
        summary: `Patient but demanding, Wise yet humble, Mysterious with purpose, Protective but allows failure

These traits create a mentor who guides without controlling, teaching through both wisdom and vulnerability.`,
      },
      {
        userInput: 'Create a backstory for a rogue character in a medieval fantasy world',
        thinking: `1. Understanding request: Rogue archetype in medieval fantasy
2. Analyzing "rogue": Typically involves theft, stealth, moral ambiguity
3. Avoiding clichés:
   - Not just "orphan turned thief"
   - Need unique motivation
4. Exploring origins:
   - Former noble fallen from grace
   - Spy who went independent
   - Thief with a code of honor
5. Ethical consideration (义): Backstory should explain moral complexity
6. Decision: Fallen noble with redemption arc potential`,
        summary: `Born into minor nobility, witnessed family's corruption firsthand. Chose exile over complicity, now uses thieving skills learned from investigating family's crimes to survive and help those wronged by the powerful. Struggles between desire for revenge and hope for redemption.

This backstory explains rogue skills while providing moral complexity and growth potential.`,
      },
    ]);

    // Storytelling examples
    this.fewShotExamples.set('story', [
      {
        userInput: 'Help me write an opening scene that hooks readers',
        thinking: `1. Analyzing goal: Create immediate engagement
2. Considering techniques:
   - In medias res (start in action)
   - Intriguing question
   - Vivid sensory detail
   - Character in crisis
3. Evaluating context: Need to know genre and tone
4. Wisdom principle (智): Best opening depends on story type
5. Decision: Recommend in medias res with sensory detail`,
        summary: `**Opening Scene Strategy**

1. **Technique**: Start in the middle of action (in medias res)
2. **Why It Works**: Immediately engages reader curiosity
3. **How To Execute**: Drop reader into a tense moment, then reveal context gradually

Example: "The knife missed her throat by inches. Sarah didn't have time to wonder who sent the assassin—only how to survive the next sixty seconds."`,
      },
      {
        userInput: 'Create a complete story for a 15-minute short film with fantasy elements',
        thinking: `1. Understanding request: Short film format (15 minutes = ~15 pages)
2. Analyzing constraints:
   - Limited runtime requires focused narrative
   - Fantasy elements need quick establishment
   - Must have complete arc in short time
3. Considering structure:
   - Act 1 (5 min): Setup and inciting incident
   - Act 2 (7 min): Conflict and escalation
   - Act 3 (3 min): Climax and resolution
4. Ethical consideration (仁): Story should be emotionally satisfying despite brevity
5. Cultural respect (礼): Fantasy elements should be original, not appropriative
6. Decision: Single-location fantasy with character-driven conflict`,
        summary: `**Short Film Story: "The Last Wish"**

**Summary**: A young apprentice mage discovers her dying mentor's final spell can grant one wish—but using it will erase all memory of their time together. She must choose between saving her mentor's life or preserving their shared memories.

**Structure**:
- **Act 1 (0-5 min)**: Apprentice finds mentor collapsed, discovers the spell
- **Act 2 (5-12 min)**: Flashbacks of their bond while she prepares the spell, internal conflict builds
- **Act 3 (12-15 min)**: Makes her choice, emotional resolution

**Why This Works**: Single location (mentor's tower), two characters, clear emotional stakes, complete arc, fantasy element serves the emotional story.`,
      },
    ]);
  }

  /**
   * Get template for wizard type
   */
  getTemplate(wizardType: 'world' | 'character' | 'story'): PromptTemplate | undefined {
    return this.templates.get(wizardType);
  }

  /**
   * Get examples for wizard type
   */
  getExamples(wizardType: 'world' | 'character' | 'story'): FewShotExample[] {
    return this.fewShotExamples.get(wizardType) || [];
  }

  /**
   * Add custom example
   */
  addExample(wizardType: 'world' | 'character' | 'story', example: FewShotExample): void {
    const examples = this.fewShotExamples.get(wizardType) || [];
    examples.push(example);
    this.fewShotExamples.set(wizardType, examples);
  }
}
