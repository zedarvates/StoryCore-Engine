/**
 * Recap Engine Addon - Index Export
 * Provides automatic scene summary and highlight generation
 */

// Main component
export { default as RecapEngine } from './RecapEngine';

// Plugin interface
export interface RecapEnginePlugin {
  name: string;
  version: string;
  description: string;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

// Plugin instance
export const recapEnginePlugin: RecapEnginePlugin = {
  name: 'Recap Engine',
  version: '1.0.0',
  description: 'Génération automatique de résumés de scènes',
  
  async initialize(): Promise<void> {
    console.log('Recap Engine Addon initialized');
  },
  
  async destroy(): Promise<void> {
    console.log('Recap Engine Addon destroyed');
  }
};

// Export default
export default recapEnginePlugin;
