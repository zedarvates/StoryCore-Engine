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
    id: 'world-building',
    name: 'World Building',
    description: 'Create comprehensive world settings, locations, and lore for your story',
    icon: '🌍',
    enabled: true,
    requiredConfig: ['llm'],
    requiresCharacters: false,
    requiresShots: false,
  },
  {
    id: 'character-creation',
    name: 'Character Creation',
    description: 'Design detailed characters with personalities, backgrounds, and visual descriptions',
    icon: '👤',
    enabled: true,
    requiredConfig: ['llm', 'comfyui'],
    requiresCharacters: false,
    requiresShots: false,
  },
  {
    id: 'scene-generator',
    name: 'Scene Generator',
    description: 'Generate cinematic scenes with camera movements and transitions',
    icon: '🎬',
    enabled: true,
    requiredConfig: ['llm', 'comfyui'],
    requiresCharacters: true, // Needs characters for scene generation (Requirement 8.2)
    requiresShots: false,
  },
  {
    id: 'dialogue-writer',
    name: 'Dialogue Writer',
    description: 'Create natural, character-driven dialogue for your scenes',
    icon: '💬',
    enabled: true,
    requiredConfig: ['llm'],
    requiresCharacters: true, // Needs characters for dialogue (Requirement 8.1)
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
    requiresShots: true, // Needs shots to apply style to (Requirement 8.3)
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
