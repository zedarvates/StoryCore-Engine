/**
 * TOS Dialog Preload Script
 * 
 * Provides secure IPC bridge between renderer and main process
 * for the Terms of Service dialog.
 * 
 * Requirements: 8.2
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * API exposed to the renderer process
 */
export interface TOSElectronAPI {
  /**
   * Send acceptance message to main process
   */
  sendAcceptance: () => void;
  
  /**
   * Send exit message to main process
   */
  sendExit: () => void;
}

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
} as TOSElectronAPI);

/**
 * Type declaration for window object with TOS API
 */
declare global {
  interface Window {
    tosAPI: TOSElectronAPI;
  }
}
