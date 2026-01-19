import type { WizardDefinition } from '../../electron/configurationTypes';

// Wizard definitions for the StoryCore-Engine creative wizards
// These wizards help users create various elements of their stories

export const availableWizards: WizardDefinition[] = [
  {
    id: 'character-wizard',
    name: 'Character Creator',
    description: 'Create detailed character profiles with AI-generated names, personalities, and backgrounds. Configure appearance, traits, and relationships.',
    icon: '🎭', // Using emoji as icon for now
    enabled: true,
    requiredConfig: ['llm.provider'] // Requires LLM configuration
  },
  {
    id: 'scene-wizard',
    name: 'Scene Builder',
    description: 'Design cinematic scenes with camera angles, lighting, atmosphere, and visual composition. Generate storyboard panels automatically.',
    icon: '🎬',
    enabled: true,
    requiredConfig: ['llm.provider', 'comfyui.serverUrl'] // Requires both LLM and ComfyUI
  },
  {
    id: 'plot-wizard',
    name: 'Plot Weaver',
    description: 'Develop compelling story arcs with multiple plotlines, character development, and dramatic tension. Generate outlines and beat sheets.',
    icon: '📖',
    enabled: true,
    requiredConfig: ['llm.provider'] // Requires LLM configuration
  },
  {
    id: 'dialogue-wizard',
    name: 'Dialogue Composer',
    description: 'Craft natural, character-appropriate dialogue with emotional depth and subtext. Generate conversation flows and character interactions.',
    icon: '💬',
    enabled: true,
    requiredConfig: ['llm.provider'] // Requires LLM configuration
  },
  {
    id: 'world-wizard',
    name: 'World Builder',
    description: 'Construct rich fictional worlds with cultures, histories, magic systems, and geography. Create consistent lore and world-building elements.',
    icon: '🌍',
    enabled: true,
    requiredConfig: ['llm.provider'] // Requires LLM configuration
  },
  {
    id: 'asset-wizard',
    name: 'Asset Generator',
    description: 'Generate custom visual assets, textures, and graphics using AI image generation. Create consistent visual themes for your project.',
    icon: '🎨',
    enabled: true,
    requiredConfig: ['comfyui.serverUrl'] // Requires ComfyUI for image generation
  },
  {
    id: 'music-wizard',
    name: 'Audio Composer',
    description: 'Create original music scores and sound design. Generate themes, motifs, and atmospheric audio elements for your story.',
    icon: '🎵',
    enabled: true,
    requiredConfig: [] // No specific requirements - can work with basic setup
  },
  {
    id: 'marketing-wizard',
    name: 'Marketing Materials',
    description: 'Generate promotional materials, posters, trailers, and marketing copy. Create compelling presentations for your creative work.',
    icon: '📢',
    enabled: true,
    requiredConfig: ['llm.provider'] // Requires LLM for copy generation
  }
];

// Helper function to get wizard by ID
export const getWizardById = (id: string): WizardDefinition | undefined => {
  return availableWizards.find(wizard => wizard.id === id);
};

// Helper function to get wizards that require specific configurations
export const getWizardsRequiring = (configPath: string): WizardDefinition[] => {
  return availableWizards.filter(wizard =>
    wizard.requiredConfig?.includes(configPath) ?? false
  );
};