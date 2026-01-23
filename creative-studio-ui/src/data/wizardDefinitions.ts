/**
 * Wizard Definitions
 * 
 * Defines all available creative wizards with their metadata
 */

import type { WizardDefinition } from '../types/configuration';

/**
 * Available creative wizards
 */
export const WIZARD_DEFINITIONS: WizardDefinition[] = [
  {
    id: 'project-init',
    name: 'Project Setup',
    description: 'Initialize a new StoryCore project with guided setup and story generation',
    icon: '📁',
    enabled: true,
    requiredConfig: [], // No specific config required for basic setup
    requiresCharacters: false,
    requiresShots: false,
  },
  {
    id: 'world-building',
    name: 'World Builder',
    description: 'Create comprehensive world settings, locations, and lore for your story',
    icon: '🌍',
    enabled: true,
    requiredConfig: ['llm'],
    requiresCharacters: false,
    requiresShots: false,
  },
  {
    id: 'character-creation',
    name: 'Character Wizard',
    description: 'Design detailed characters with personalities, backgrounds, and visual descriptions',
    icon: '👤',
    enabled: true,
    requiredConfig: ['llm', 'comfyui'],
    requiresCharacters: false,
    requiresShots: false,
  },
  {
    id: 'shot-planning',
    name: 'Shot Planning',
    description: 'Process shot planning with cinematic grammar analysis and camera specifications',
    icon: '🎥',
    enabled: true,
    requiredConfig: [], // Uses project data
    requiresCharacters: false,
    requiresShots: false,
  },
  {
    id: 'shot-reference-wizard',
    name: 'Shot References',
    description: 'Generate visual reference images for shots using ComfyUI with cinematic prompts',
    icon: '🖼️',
    enabled: true,
    requiredConfig: ['comfyui'], // Requires ComfyUI for image generation
    requiresCharacters: false,
    requiresShots: true, // Needs shot planning data
  },
  {
    id: 'dialogue-wizard',
    name: 'Dialogue Wizard',
    description: 'Create compelling dialogue scenes with character voices and emotional depth',
    icon: '💬',
    enabled: true,
    requiredConfig: ['llm'],
    requiresCharacters: true, // Needs characters for dialogue
    requiresShots: false,
  },
  {
    id: 'scene-generator',
    name: 'Scene Generator',
    description: 'Generate cinematic scenes with camera movements and transitions',
    icon: '🎬',
    enabled: true,
    requiredConfig: ['llm', 'comfyui'],
    requiresCharacters: true, // Needs characters for scene generation
    requiresShots: false,
  },
  {
    id: 'storyboard-creator',
    name: 'Storyboard Creator',
    description: 'Visualize your story with AI-generated storyboard panels',
    icon: '📋',
    enabled: true,
    requiredConfig: ['llm', 'comfyui'],
    requiresCharacters: false,
    requiresShots: false,
  },
  {
    id: 'style-transfer',
    name: 'Style Transfer',
    description: 'Apply consistent visual styles across your project',
    icon: '🎨',
    enabled: true,
    requiredConfig: ['comfyui'],
    requiresCharacters: false,
    requiresShots: true, // Needs shots to apply style to
  },
  {
    id: 'ghost-tracker-wizard',
    name: 'Ghost Tracker Advisor',
    description: 'AI-powered project advisor providing insights and recommendations for your video storyboard',
    icon: '👻',
    enabled: true,
    requiredConfig: ['llm'], // Uses LLM for analysis and advice
    requiresCharacters: false,
    requiresShots: false,
  },
  {
    id: 'roger-wizard',
    name: 'Roger Data Extractor',
    description: 'Extract project data from text files (stories, novels, LLM discussions) to automatically populate your StoryCore project',
    icon: '🤖',
    enabled: true,
    requiredConfig: [], // No specific config required - works with text files
    requiresCharacters: false,
    requiresShots: false,
  },
  {
    id: 'audio-production-wizard',
    name: 'SonicCrafter',
    description: 'Create comprehensive audio production plans with voice overs, sound effects, and music cues for your video sequences',
    icon: '🎵',
    enabled: true,
    requiredConfig: [], // Works with existing project data
    requiresCharacters: false,
    requiresShots: true, // Needs shot planning data for audio analysis
  },
  {
    id: 'video-editor-wizard',
    name: 'EditForge',
    description: 'Automatically create professional video montages from storyboards with intelligent editing and transitions',
    icon: '🎬',
    enabled: true,
    requiredConfig: [], // Works with existing project data
    requiresCharacters: false,
    requiresShots: true, // Needs shot planning data for montage creation
  },
  {
    id: 'marketing-wizard',
    name: 'ViralForge',
    description: 'Create comprehensive viral marketing campaigns with thumbnails, social posts, trailers, and hashtag strategies',
    icon: '🚀',
    enabled: true,
    requiredConfig: [], // Works with existing project data
    requiresCharacters: false,
    requiresShots: false, // Can work with any project data
  },
  {
    id: 'comic-to-sequence-wizard',
    name: 'PanelForge',
    description: 'Transform comic panel images into professional cinematic sequences with automatic shot planning and storyboard generation',
    icon: '🎭',
    enabled: true,
    requiredConfig: [], // Works with image files
    requiresCharacters: false,
    requiresShots: false, // Creates shots from comic panels
  },
];

/**
 * Get wizard by ID
 */
export function getWizardById(id: string): WizardDefinition | undefined {
  return WIZARD_DEFINITIONS.find(wizard => wizard.id === id);
}

/**
 * Get enabled wizards
 */
export function getEnabledWizards(): WizardDefinition[] {
  return WIZARD_DEFINITIONS.filter(wizard => wizard.enabled);
}

/**
 * Check if wizard requirements are met
 */
export function checkWizardRequirements(
  wizard: WizardDefinition,
  availableConfig: string[]
): boolean {
  if (!wizard.requiredConfig) {
    return true;
  }
  
  return wizard.requiredConfig.every(req => availableConfig.includes(req));
}
