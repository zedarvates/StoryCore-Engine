import { BrowserWindow } from 'electron';
import { getAppIconPath } from './defaultPaths';

const SPLASH_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
    <title>StoryCore Creative Studio</title>
    <style>
      body { margin: 0; padding: 32px; background: #1a1a2e; color: white;
             font-family: system-ui, sans-serif; text-align: center; }
      h1 { font-size: 22px; margin: 16px 0 24px; }
      progress { width: 100%; accent-color: #667eea; }
      #status { font-size: 14px; min-height: 36px; }
    </style>
  </head>
  <body>
    <h1>StoryCore Creative Studio</h1>
    <p id="status" role="status">Starting...</p>
    <progress id="progress" max="100" value="0" aria-label="Startup progress"></progress>
  </body>
</html>`;

/** Startup status window used by main.ts until the main renderer is ready. */
export class SplashWindow {
  private window: BrowserWindow | null;
  private loaded = false;
  private status = { message: 'Starting...', progress: 0 };

  constructor() {
    const window = new BrowserWindow({
      width: 420,
      height: 240,
      frame: false,
      resizable: false,
      center: true,
      alwaysOnTop: true,
      show: false,
      backgroundColor: '#1a1a2e',
      icon: getAppIconPath(),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    this.window = window;

    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    window.webContents.once('did-finish-load', () => {
      if (this.window === window && !window.isDestroyed()) {
        this.loaded = true;
        this.renderStatus();
      }
    });
    window.once('ready-to-show', () => {
      if (this.window === window && !window.isDestroyed()) window.show();
    });
    window.on('closed', () => {
      this.window = null;
      this.loaded = false;
    });

    void window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`)
      .catch((error: unknown) => {
        console.warn('Could not load startup status window:', error);
        this.close();
      });
  }

  update(message: string, progress: number): void {
    this.status = {
      message,
      progress: Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0,
    };
    this.renderStatus();
  }

  close(): void {
    const window = this.window;
    this.window = null;
    this.loaded = false;
    if (window && !window.isDestroyed()) window.close();
  }

  private renderStatus(): void {
    const window = this.window;
    if (!this.loaded || !window || window.isDestroyed()) return;

    // JSON quoting and textContent keep status messages as text, never markup/code.
    const script = `(() => {
      document.getElementById('status').textContent = ${JSON.stringify(this.status.message)};
      document.getElementById('progress').value = ${this.status.progress};
    })()`;
    void window.webContents.executeJavaScript(script).catch((error: unknown) => {
      if (!window.isDestroyed()) console.warn('Could not update startup status:', error);
    });
  }
}
