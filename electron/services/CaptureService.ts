import { desktopCapturer, ipcMain, screen, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface CaptureOptions {
  quality?: number;
  format?: 'png' | 'jpg';
  projectPath?: string;
}

export class CaptureService {
  private captureWindow: BrowserWindow | null = null;

  constructor() {
    this.registerIpcHandlers();
  }

  private registerIpcHandlers() {
    ipcMain.handle('screen:capture', async (_event, options: CaptureOptions = {}) => {
      return await this.captureScreen(options);
    });

    ipcMain.handle('screen:save-capture', async (_event, data: string, filename: string, projectPath?: string) => {
      return await this.saveCapture(data, filename, projectPath);
    });

    ipcMain.handle('screen:start-area-capture', async (_event, options: CaptureOptions = {}) => {
      return await this.startAreaCapture(options);
    });
  }

  /**
   * Capture a screen
   * @param options Capture options including display index
   */
  async captureScreen(options: CaptureOptions & { displayIndex?: number } = {}): Promise<string> {
    const displays = screen.getAllDisplays();
    const displayIndex = options.displayIndex !== undefined ? options.displayIndex : 0;
    
    if (displayIndex >= displays.length) {
      throw new Error(`Display index ${displayIndex} out of bounds (total displays: ${displays.length})`);
    }

    const targetDisplay = displays[displayIndex];
    const { width, height } = targetDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { 
        width: Math.floor(width * targetDisplay.scaleFactor), 
        height: Math.floor(height * targetDisplay.scaleFactor) 
      }
    });

    // Find the source that matches our target display
    // Note: desktopCapturer sources are usually in the same order as screen.getAllDisplays()
    // but names might be 'Screen 1', 'Screen 2', etc.
    const source = sources[displayIndex] || sources[0];
    
    if (!source) {
      throw new Error('No screen source found');
    }

    const thumbnail = source.thumbnail;
    
    if (options.format === 'jpg') {
      return thumbnail.toJPEG(options.quality || 80).toString('base64');
    } else {
      return thumbnail.toPNG().toString('base64');
    }
  }

  /**
   * Save a capture to disk
   */
  async saveCapture(base64Data: string, filename: string, projectPath?: string): Promise<{ success: boolean; path: string }> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      
      let saveDir: string;
      if (projectPath) {
        // Security: Validate and sanitize projectPath to prevent path traversal
        const normalizedProjectPath = path.normalize(projectPath).replace(/^([A-Za-z]:\/)/, '');
        if (normalizedProjectPath.includes('..')) {
          throw new Error('Invalid project path: path traversal detected');
        }
        saveDir = path.join(projectPath, 'captures');
      } else {
        const userDataPath = path.join(process.env.APPDATA || '', 'StoryCore', 'captures');
        saveDir = userDataPath;
      }

      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      // Security: Sanitize filename to prevent path traversal
      const sanitizedFilename = path.basename(filename);
      if (sanitizedFilename !== filename) {
        throw new Error('Invalid filename: path traversal detected');
      }

      const filePath = path.join(saveDir, sanitizedFilename);
      fs.writeFileSync(filePath, buffer);

      return { success: true, path: filePath };
    } catch (error) {
      console.error('Failed to save capture:', error);
      return { success: false, path: '' };
    }
  }

  /**
   * Start area capture workflow
   */
  async startAreaCapture(options: CaptureOptions = {}): Promise<string | null> {
    return new Promise((resolve) => {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height, x, y } = primaryDisplay.bounds;

      this.captureWindow = new BrowserWindow({
        width,
        height,
        x,
        y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        movable: false,
        hasShadow: false,
        backgroundColor: '#00000000',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, '..', 'capture-preload.js')
        }
      });

      const selectionHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { margin: 0; padding: 0; overflow: hidden; background: rgba(0,0,0,0.3); cursor: crosshair; }
              #selection { border: 2px solid #2563eb; position: absolute; background: rgba(37, 99, 235, 0.1); display: none; }
              #hint { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; pointer-events: none; font-family: sans-serif; }
            </style>
          </head>
          <body>
            <div id="hint">Sélectionnez une zone à capturer (Echap pour annuler)</div>
            <div id="selection"></div>
            <script>
              const selection = document.getElementById('selection');
              let startX, startY, isDragging = false;

              window.addEventListener('mousedown', e => {
                startX = e.clientX;
                startY = e.clientY;
                isDragging = true;
                selection.style.left = startX + 'px';
                selection.style.top = startY + 'px';
                selection.style.width = '0px';
                selection.style.height = '0px';
                selection.style.display = 'block';
              });

              window.addEventListener('mousemove', e => {
                if (!isDragging) return;
                const currentX = e.clientX;
                const currentY = e.clientY;
                const x = Math.min(startX, currentX);
                const y = Math.min(startY, currentY);
                const w = Math.abs(startX - currentX);
                const h = Math.abs(startY - currentY);
                selection.style.left = x + 'px';
                selection.style.top = y + 'px';
                selection.style.width = w + 'px';
                selection.style.height = h + 'px';
              });

              window.addEventListener('mouseup', async e => {
                isDragging = false;
                const rect = selection.getBoundingClientRect();
                if (rect.width > 5 && rect.height > 5) {
                   window.ipcRenderer.send('capture:finish', {
                      x: Math.round(rect.x),
                      y: Math.round(rect.y),
                      width: Math.round(rect.width),
                      height: Math.round(rect.height)
                   });
                }
              });

              window.addEventListener('keydown', e => {
                if (e.key === 'Escape') {
                  window.ipcRenderer.send('capture:cancel');
                }
              });
            </script>
          </body>
        </html>
      `;

      this.captureWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(selectionHtml)}`);

      ipcMain.once('capture:finish', async (_event, rect) => {
        if (this.captureWindow) {
          this.captureWindow.close();
          this.captureWindow = null;
        }

        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: width * 2, height: height * 2 }
        });

        const thumbnail = sources[0].thumbnail;
        
        // Adjust for device pixel ratio if needed, for now assume 1:1 with screen coordinates
        const cropped = thumbnail.crop(rect);
        
        const base64 = options.format === 'jpg' 
          ? cropped.toJPEG(options.quality || 80).toString('base64')
          : cropped.toPNG().toString('base64');
          
        resolve(base64);
      });

      ipcMain.once('capture:cancel', () => {
        if (this.captureWindow) {
          this.captureWindow.close();
          this.captureWindow = null;
        }
        resolve(null);
      });
    });
  }
}
