import type { StoryCoreElectronAPI } from './electron';

declare global {
  interface Window {
    /** Absent when the studio runs in a browser without the Electron preload. */
    electronAPI?: StoryCoreElectronAPI;
  }
}
