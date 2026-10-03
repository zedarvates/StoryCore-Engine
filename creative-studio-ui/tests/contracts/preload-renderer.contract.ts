// A separate compile-only program avoids mixing the legacy desktop Window
// declaration with the optional browser declaration. Check the whole core shape.
import type { ElectronAPI as PreloadAPI } from '../../../electron/electronAPI';
import type { StoryCoreElectronAPI } from '../../src/types/electron';

declare const preload: PreloadAPI;
const renderer: StoryCoreElectronAPI = preload;
void renderer;
