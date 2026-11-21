/**
 * TOS Dialog Preload Script
 * 
 * Provides secure IPC bridge between renderer and main process
 * for the Terms of Service dialog.
 * 
 * Requirements: 8.2
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { TOSElectronAPI } from '../creative-studio-ui/src/types/tos';
export type { TOSElectronAPI } from '../creative-studio-ui/src/types/tos';

/**
 * Expose TOS-specific API to renderer process via contextBridge
 * 
 * This ensures proper security isolation while allowing
 * the renderer to communicate with the main process.
 */
contextBridge.exposeInMainWorld('tosAPI', {
  /**
   * Send acceptance event to main process
   * 
   * Requirements: 3.2, 8.2
   */
  sendAcceptance: (): void => {
    ipcRenderer.send('tos:accept');
  },
  
  /**
   * Send exit event to main process
   * 
   * Requirements: 4.2, 8.2
   */
  sendExit: (): void => {
    ipcRenderer.send('tos:exit');
  },
} satisfies TOSElectronAPI);
