/**
 * Complete Integration Example
 * Shows how to integrate the Prompt Library into a StoryCore pipeline
 */

import { promptLibrary, PromptTemplate } from './PromptLibraryService';

// Example: Complete scene generation workflow
export class SceneGenerator {
  private projectConfig = {
    name: 'Neon Dreams',
    genre: 'cyberpunk sci-fi',
    colors: 'electric blue, neon purple, chrome silver',
    lighting: 'neon volumetric lighting'
  };

  /**
   * Step 1: Generate Master Coherence Sheet
   */
  async generateMasterCoherence() {
    const template = await promptLibrary.loadPrompt(
      '01-master-coherence/coherence-grid.json'
    );

    const prompt = promptLibrary.fillPrompt(template, {
      PROJECT_NAME: this.projectConfig.name,
      GENRE_STYLE: this.projectConfig.genre,
      PRIMARY_COLORS: this.projectConfig.colors,
      LIGHTING_TYPE: this.projectConfig.lighting
    });

    console.log('Master Coherence Prompt:', prompt);
    return prompt;
  }

  /**
   * Step 2: Generate character design sheet
   */
  async generateCharacterSheet(characterData: {
    description: string;
    age: string;
    gender: string;
    features: string;
  }) {
    const template = await promptLibrary.loadPrompt(
      '01-master-coherence/character-grid.json'
    );

    const prompt = promptLibrary.fillPrompt(template, {
      CHARACTER_DESCRIPTION: characterData.description,
      AGE: characterData.age,
      GENDER: characterData.gender,
      DISTINCTIVE_FEATURES: characterData.features,
      ART_STYLE: this.projectConfig.genre
    });

    return prompt;
  }

  /**
   * Step 3: Generate specific scene shot
   */
  async generateSceneShot(
    sceneElement: string,
    shotType: 'wide' | 'medium' | 'close-up',
    lighting: 'golden-hour' | 'blue-hour' | 'night-moonlight'
  ) {
    // Load genre template
    const genreTemplate = await promptLibrary.loadPrompt('02-genres/scifi.json');
    
    // Load shot type template
    const shotPath = `03-shot-types/${shotType === 'close-up' ? 'close-up' : shotType + '-shot'}.json`;
    const shotTemplate = await promptLibrary.loadPrompt(shotPath);
    
    // Load lighting template
    const lightingTemplate = await promptLibrary.loadPrompt(
      `04-lighting/${lighting}.json`
    );

    // Generate each part
    const genrePrompt = promptLibrary.fillPrompt(genreTemplate, {
      SPECIFIC_ELEMENT: sceneElement,
      AESTHETIC: 'cyberpunk'
    });

    const shotPrompt = promptLibrary.fillPrompt(shotTemplate, {
      SUBJECT: sceneElement,
      ENVIRONMENT: 'neon city street',
      LIGHTING_TYPE: 'neon lighting'
    });

    const lightingPrompt = promptLibrary.fillPrompt(lightingTemplate, {
      SCENE: sceneElement,
      TIME: 'sunset'
    });

    // Combine prompts
    return `${shotPrompt}. ${genrePrompt}. ${lightingPrompt}`;
  }

  /**
   * Complete pipeline example
   */
  async generateCompleteScene() {
    console.log('=== Starting Scene Generation Pipeline ===\n');

    // Step 1: Master Coherence
    console.log('Step 1: Generating Master Coherence Sheet...');
    const masterPrompt = await this.generateMasterCoherence();
    console.log('✓ Master coherence prompt ready\n');

    // Step 2: Character Design
    console.log('Step 2: Generating Character Design...');
    const characterPrompt = await this.generateCharacterSheet({
      description: 'cyberpunk hacker',
      age: '25',
      gender: 'female',
      features: 'neon tattoos, augmented eyes, leather jacket'
    });
    console.log('✓ Character design prompt ready\n');

    // Step 3: Scene Shots
    console.log('Step 3: Generating Scene Shots...');
    
    const establishingShot = await this.generateSceneShot(
      'neon city skyline',
      'wide',
      'blue-hour'
    );
    console.log('✓ Establishing shot ready');

    const characterShot = await this.generateSceneShot(
      'hacker at terminal',
      'medium',
      'night-moonlight'
    );
    console.log('✓ Character shot ready');

    const detailShot = await this.generateSceneShot(
      'glowing holographic interface',
      'close-up',
      'night-moonlight'
    );
    console.log('✓ Detail shot ready\n');

    return {
      masterCoherence: masterPrompt,
      character: characterPrompt,
      shots: {
        establishing: establishingShot,
        character: characterShot,
        detail: detailShot
      }
    };
  }
}

// Example: Search and filter prompts
export class PromptDiscovery {
  /**
   * Find prompts for a specific genre
   */
  async findGenrePrompts(genre: string) {
    const results = await promptLibrary.search(genre);
    return results.filter(p => p.category === 'genres');
  }

  /**
   * Find all character-related prompts
   */
  async findCharacterPrompts() {
    return promptLibrary.searchByTags(['character', 'hero', 'villain']);
  }

  /**
   * Get recommended prompts for beginners
   */
  async getBeginnerPrompts() {
    const categories = await promptLibrary.getCategories();
    
    // Get one prompt from each category
    const recommendations: PromptTemplate[] = [];
    
    for (const [categoryId, category] of Object.entries(categories)) {
      if (category.prompts.length > 0) {
        const prompt = await promptLibrary.loadPrompt(category.prompts[0]);
        recommendations.push(prompt);
      }
    }
    
    return recommendations;
  }
}

// Example: Batch generation
export class BatchGenerator {
  /**
   * Generate multiple variations of a scene
   */
  async generateVariations(
    baseTemplate: PromptTemplate,
    variationSets: Array<Record<string, string>>
  ) {
    const prompts: string[] = [];

    for (const values of variationSets) {
      const validation = promptLibrary.validateValues(baseTemplate, values);
      
      if (validation.valid) {
        const prompt = promptLibrary.fillPrompt(baseTemplate, values);
        prompts.push(prompt);
      } else {
        console.warn(`Skipping invalid variation:`, validation.errors);
      }
    }

    return prompts;
  }

  /**
   * Generate a complete storyboard
   */
  async generateStoryboard(scenes: Array<{
    description: string;
    shotType: string;
    lighting: string;
  }>) {
    const storyboard: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      console.log(`Generating scene ${i + 1}/${scenes.length}...`);

      // Load templates
      const shotTemplate = await promptLibrary.loadPrompt(
        `03-shot-types/${scene.shotType}.json`
      );
      const lightingTemplate = await promptLibrary.loadPrompt(
        `04-lighting/${scene.lighting}.json`
      );

      // Generate prompts
      const shotPrompt = promptLibrary.fillPrompt(shotTemplate, {
        SUBJECT: scene.description,
        ENVIRONMENT: 'scene environment',
        LIGHTING_TYPE: 'cinematic'
      });

      const lightingPrompt = promptLibrary.fillPrompt(lightingTemplate, {
        SCENE: scene.description
      });

      storyboard.push(`${shotPrompt}. ${lightingPrompt}`);
    }

    return storyboard;
  }
}

// Usage examples
async function main() {
  console.log('=== Prompt Library Integration Examples ===\n');

  // Example 1: Complete scene generation
  const generator = new SceneGenerator();
  const scene = await generator.generateCompleteScene();
  console.log('\nGenerated Scene:', scene);

  // Example 2: Discover prompts
  const discovery = new PromptDiscovery();
  const scifiPrompts = await discovery.findGenrePrompts('sci-fi');
  console.log('\nFound', scifiPrompts.length, 'sci-fi prompts');

  // Example 3: Batch generation
  const batch = new BatchGenerator();
  const template = await promptLibrary.loadPrompt('02-genres/scifi.json');
  const variations = await batch.generateVariations(template, [
    { SPECIFIC_ELEMENT: 'hovering vehicle', AESTHETIC: 'cyberpunk' },
    { SPECIFIC_ELEMENT: 'space station', AESTHETIC: 'clean minimalist future' },
    { SPECIFIC_ELEMENT: 'robot factory', AESTHETIC: 'dystopian industrial' }
  ]);
  console.log('\nGenerated', variations.length, 'variations');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
