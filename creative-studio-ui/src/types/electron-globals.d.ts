import type { StoryCoreElectronAPI } from './electron';
import type { TOSElectronAPI } from './tos';

declare global {
  interface Window {
    /** Absent when the studio runs in a browser without the Electron preload. */
    electronAPI?: StoryCoreElectronAPI;
    tosAPI?: TOSElectronAPI;
  }
}
