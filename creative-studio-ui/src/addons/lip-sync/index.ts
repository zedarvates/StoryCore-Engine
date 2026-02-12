/**
 * Lip Sync Addon - Index Export
 * Provides lip synchronization functionality using Wav2Lip
 */

// Main component
export { LipSyncAddon } from './LipSyncAddon';

// Plugin interface
export interface LipSyncPlugin {
  name: string;
  version: string;
  description: string;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

// Plugin instance
export const lipSyncPlugin: LipSyncPlugin = {
  name: 'Lip Sync Generator',
  version: '1.0.0',
  description: 'Lip synchronization using Wav2Lip and GFPGAN',
  
  async initialize(): Promise<void> {
    console.log('Lip Sync Addon initialized');
  },
  
  async destroy(): Promise<void> {
    console.log('Lip Sync Addon destroyed');
  }
};

// Export default
export default lipSyncPlugin;

