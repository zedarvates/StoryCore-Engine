import { app, BrowserWindow, Menu, dialog, globalShortcut, ipcMain, protocol, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ViteServerManager, LauncherConfig } from './ViteServerManager';
import { ProjectService } from './ProjectService';
import { RecentProjectsManager } from './RecentProjectsManager';
import { ConfigStorage } from './ConfigStorage';
import { IPCHandlers } from './ipcChannels';
import { CaptureService } from './services/CaptureService';
// DISABLED: TOS Dialog imports (dialog has been disabled)
// import { createTOSWindow } from './tosDialogManager';
// import { TOSStorageService } from './tosStorageService';
// import { UpdateManager } from './UpdateManager';
import { pathToFileURL } from 'url';

// Register custom protocol for local files before app is ready
// Requirements: 99335124-d3ad-4905-a578-646dbeda00bc (CSP fix)
protocol.registerSchemesAsPrivileged([
  { scheme: 'sc-file', privileges: { standard: true, secure: true, corsEnabled: true, supportFetchAPI: true } }
]);


let mainWindow: BrowserWindow | null = null;
let chatWindow: BrowserWindow | null = null;
let serverManager: ViteServerManager | null = null;
let ipcHandlers: IPCHandlers | null = null;
// let updateManager: UpdateManager | null = null;

/**
 * Get the icon path with environment-aware resolution and fallback handling
 * Requirements: 2.1, 2.2, 2.3
 */
function getIconPath(): string | undefined {
  const possiblePaths = [
    // Production paths (when app is packaged)
    path.join(process.resourcesPath, 'StorycoreIconeV2.png'),
    path.join(process.resourcesPath, 'build', 'icon.ico'),
    // Development paths (when running from source)
    path.join(__dirname, '../StorycoreIconeV2.png'),
    path.join(__dirname, '../build/icon.ico'),
  ];

  for (const iconPath of possiblePaths) {
    try {
      if (fs.existsSync(iconPath)) {
        console.log(`Using icon from: ${iconPath}`);
        return iconPath;
      }
    } catch (error) {
      console.warn(`Error checking icon path ${iconPath}:`, error);
    }
  }

  console.warn('No icon found in any expected location, using default Electron icon');
  return undefined;
}

/**
 * Create the main application window
 */
function createWindow(url: string): void {
  // Disable the native menu bar
  Menu.setApplicationMenu(null);

  // Get icon path with environment-aware resolution and fallback
  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: 'StoryCore Creative Studio',
    show: false, // Don't show until ready
    backgroundColor: '#0a0a0f', // Dark background to match neon theme
    icon: iconPath,
    autoHideMenuBar: true, // Hide menu bar (can be shown with Alt key)
    frame: true, // Keep window frame for minimize/maximize/close buttons
  });

  // 2. Content Security Policy (Centralized Management)
  // Manage all security through Electron headers for better flexibility than static meta tags.
  const isDevelopment = process.env.NODE_ENV === 'development';
  mainWindow!.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    // Basic policy for StoryCore-Engine:
    // - self: our app
    // - sc-file: / blob: / data: / file: (standard media protocols)
    // - https: allow external APIs (OpenAI, Anthropic, Picsum, Cloud assets)
    // - unsafe-inline / unsafe-eval: needed for many React/Vite/Three.js dev features
    // - localhost:8000 / 127.0.0.1:8000: allow ComfyUI connections
    const devCSP = "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* https: data: blob: sc-file: file:; img-src 'self' data: blob: https: http://localhost:* http://127.0.0.1:* sc-file: file:; connect-src 'self' blob: data: https: http://localhost:* ws://localhost:* http://127.0.0.1:* sc-file: file:; font-src 'self' data: https:;";
    const prodCSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: sc-file:; connect-src 'self' blob: data: https: http://127.0.0.1:* sc-file:; font-src 'self' data:; worker-src 'self' blob:;";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [isDevelopment ? devCSP : prodCSP]
      }
    });
  });

  // Load the provided URL
  mainWindow!.loadURL(url);

  console.log('Window created, loading URL:', url);

  mainWindow!.webContents.on('did-start-loading', () => {
    console.log('Started loading page...');
  });

  mainWindow!.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  mainWindow!.webContents.on('dom-ready', () => {
    console.log('DOM is ready');
  });

  // Only open DevTools in development mode
  if (isDevelopment) {
    mainWindow!.webContents.openDevTools();
    console.log('DevTools opened (development mode)');
  }

  // Show window when ready to prevent flickering
  mainWindow!.once('ready-to-show', () => {
    mainWindow?.show();
    console.log('StoryCore Creative Studio window ready');
  });

  // Handle window close
  mainWindow!.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation errors
  mainWindow!.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    if (isDevelopment) {
      console.log('Make sure Vite dev server is running');
    }
  });
}

/**
 * Get the URL for loading pages (handles both dev and production)
 */
function getAppUrl(): string | null {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // In development, use localhost
    return 'http://localhost:5173';
  } else {
    // In production, use file protocol
    const distPath = path.join(__dirname, '..', '..', 'creative-studio-ui', 'dist');
    if (fs.existsSync(distPath)) {
      return `file://${distPath.replace(/\\/g, '/')}`;
    }
  }
  return null;
}

/**
 * Create the detached chat window
 * This window can be moved outside the main application window
 */
function createChatWindow(): BrowserWindow | null {
  // If chat window already exists, focus it
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.focus();
    return chatWindow;
  }

  const iconPath = getIconPath();
  const appUrl = getAppUrl();

  if (!appUrl) {
    console.error('Could not determine app URL for chat window');
    return null;
  }

  chatWindow = new BrowserWindow({
    width: 450,
    height: 700,
    minWidth: 350,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: 'StoryCore Assistant',
    show: false,
    backgroundColor: '#1a1a2e',
    icon: iconPath,
    frame: true,
    alwaysOnTop: false,
    skipTaskbar: false,
  });

  // Load the chat route
  const chatUrl = appUrl.includes('localhost') 
    ? `${appUrl}/detached-chat` 
    : `${appUrl}/detached-chat.html`;
  
  console.log('Loading chat window URL:', chatUrl);
  chatWindow.loadURL(chatUrl);

  // Show window when ready
  chatWindow.once('ready-to-show', () => {
    chatWindow?.show();
    console.log('Chat window ready');
    
    // Notify main window that chat window is open
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chat-window:state-changed', { isOpen: true });
    }
  });

  // Handle window close
  chatWindow.on('closed', () => {
    chatWindow = null;
    console.log('Chat window closed');
    
    // Notify main window that chat window is closed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chat-window:state-changed', { isOpen: false });
    }
  });

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    chatWindow.webContents.openDevTools({ mode: 'detach' });
  }

  return chatWindow;
}

/**
 * Toggle the chat window (open/close)
 */
function toggleChatWindow(): void {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.close();
  } else {
    createChatWindow();
  }
}

/**
 * Close the chat window if it exists
 */
function closeChatWindow(): void {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.close();
    chatWindow = null;
  }
}

/**
 * Check if chat window is open
 */
function isChatWindowOpen(): boolean {
  return chatWindow !== null && !chatWindow.isDestroyed();
}

/**
 * Check if a server is already running on a port
 */
async function checkServerRunning(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.get(`http://localhost:${port}`, (res: any) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Start the Vite server and create the window
 */
async function startServer(): Promise<void> {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // In development mode, check if Vite server is already running
    const defaultPort = 5173;
    const isRunning = await checkServerRunning(defaultPort);

    if (isRunning) {
      // Server is already running, just connect to it
      console.log(`Vite server already running on http://localhost:${defaultPort}`);
      createWindow(`http://localhost:${defaultPort}`);
    } else {
      // Start the Vite server
      serverManager = new ViteServerManager();

      const config: LauncherConfig = {
        vitePort: defaultPort,
        fallbackPorts: [5174, 5175, 5176, 5177, 5178, 5179, 5180, 5181, 5182, 5183],
        serverStartTimeout: 30000, // 30 seconds
        autoOpenBrowser: true,
      };

      try {
        console.log('Starting Vite server...');
        const serverInfo = await serverManager.start(config);
        console.log(`Vite server started on ${serverInfo.url}`);

        // Create window with the server URL
        createWindow(serverInfo.url);
      } catch (error) {
        console.error('Failed to start Vite server:', error);
        // Show error dialog to user
        await dialog.showErrorBox(
          'Server Start Failed',
          `Failed to start the development server:\n\n${error instanceof Error ? error.message : String(error)}\n\nPlease check if ports 5173-5183 are available.`
        );
        app.quit();
      }
    }
  } else {
    // In production, load from built files
    // The files are packaged in the app.asar, so we use a relative path
    const indexPath = path.join(__dirname, '..', '..', 'creative-studio-ui', 'dist', 'index.html');

    if (!fs.existsSync(indexPath)) {
      console.error('Production build not found at:', indexPath);
      console.error('Please run "npm run build" first');
      await dialog.showErrorBox(
        'Build Not Found',
        `Production build not found.\n\nExpected location: ${indexPath}\n\nPlease run "npm run build" to create the production build.`
      );
      app.quit();
      return;
    }

    const url = `file://${indexPath.replace(/\\/g, '/')}`;
    console.log('Loading production UI from:', url);
    console.log('Index file exists:', fs.existsSync(indexPath));
    createWindow(url);
  }
}

/**
 * Initialize services
 */
function initializeServices(): void {
  // Get app data directory
  const appDataPath = app.getPath('userData');

  // Initialize configuration storage (for future use)
  const configFilePath = path.join(appDataPath, 'config.json');
  new ConfigStorage(configFilePath);

  // Initialize recent projects manager
  const recentProjectsFilePath = path.join(appDataPath, 'recent-projects.json');
  const recentProjectsManager = new RecentProjectsManager(recentProjectsFilePath);

  // Initialize project service
  const projectService = new ProjectService();

  // Initialize IPC handlers
  ipcHandlers = new IPCHandlers(
    projectService,
    recentProjectsManager,
    serverManager || undefined
  );

  // Register IPC handlers
  ipcHandlers.registerHandlers();
  console.log('IPC handlers registered');

  // Register chat window IPC listeners
  ipcMain.on('chat-window:create-request', () => {
    createChatWindow();
  });

  ipcMain.on('chat-window:close-request', () => {
    closeChatWindow();
  });

  ipcMain.on('chat-window:toggle-request', () => {
    toggleChatWindow();
  });

  ipcMain.handle('chat-window:is-open', () => {
    return isChatWindowOpen();
  });

  ipcMain.on('chat-window:send-message', (_event, message) => {
    // Send to whichever window is NOT the sender
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.webContents.send('chat-window:message', message);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chat-window:message', message);
    }
  });

  ipcMain.on('chat-window:sync-state', (_event, state) => {
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.webContents.send('chat-window:state-update', state);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chat-window:state-update', state);
    }
  });

  console.log('Chat window IPC listeners registered');

  // Register the custom protocol handler to serve local assets
  // Use case: loading GLB, skyboxes, and textures from local filesystem
  protocol.handle('sc-file', (request) => {
    // Standard format: sc-file:///C:/path/to/file.ext
    // Extract path after the protocol prefix
    const urlString = request.url;
    let filePath = '';
    
    if (urlString.startsWith('sc-file:///')) {
      filePath = urlString.substring(11); // After sc-file:///
    } else if (urlString.startsWith('sc-file://')) {
      filePath = urlString.substring(10); // After sc-file://
    }
    
    try {
      // Decode the path (important for Windows paths and special characters)
      const decodedPath = decodeURIComponent(filePath);
      
      // Ensure Windows drive letters have a colon after them if they don't already
      // This handles cases where Chromium might have mangled sc-file://C:/ to sc-file://c/
      let normalizedPath = decodedPath;
      if (/^[a-zA-Z]\//.test(normalizedPath)) {
        normalizedPath = normalizedPath[0] + ':' + normalizedPath.substring(1);
      } else if (/^\/[a-zA-Z]\//.test(normalizedPath)) {
        // Handle leading slash if using 3 slashes (e.g. /C:/path)
        normalizedPath = normalizedPath[1] + ':' + normalizedPath.substring(2);
      }
      
      // Construct file URL for net.fetch
      const fileUrl = pathToFileURL(normalizedPath).toString();
      return net.fetch(fileUrl);
    } catch (error) {
      console.error('Failed to handle sc-file protocol:', error);
      return new Response('File not found', { status: 404 });
    }
  });
  console.log('sc-file protocol handler registered');
}

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  try {
    await app.whenReady();
    console.log('Electron app ready');

    // DISABLED: Terms of Service dialog
    // The TOS dialog has been disabled as it doesn't have the desired appearance
    // Uncomment the code below to re-enable it

    /*
    // Check if TOS already accepted (Requirements: 4.2.2, 4.2.3, 4.2.4)
    const tosStorage = new TOSStorageService('1.0');
    const shouldShow = await tosStorage.shouldShowDialog();

    if (shouldShow) {
      // First time user or TOS version changed - show dialog
      console.log('Creating TOS dialog...');
      await createTOSWindow();
      console.log('TOS dialog created and displayed');

      // Wait for TOS acceptance before proceeding
      // The tosDialogManager will emit 'tos:accepted' event when user accepts
      await new Promise<void>((resolve) => {
        app.once('tos:accepted' as any, async () => {
          console.log('TOS accepted, proceeding with main application initialization');
          
          // Save acceptance to storage (Requirements: 4.2.1)
          try {
            await tosStorage.saveAcceptance();
            console.log('TOS acceptance saved to storage');
          } catch (error) {
            console.error('Failed to save TOS acceptance:', error);
            // Continue anyway - don't block app startup
          }
          
          resolve();
        });
      });
    } else {
      // Returning user with current TOS version - skip dialog
      const acceptance = await tosStorage.checkAcceptance();
      console.log('TOS already accepted, skipping dialog', {
        version: acceptance?.version,
        timestamp: acceptance?.timestamp ? new Date(acceptance.timestamp).toISOString() : 'unknown',
      });
    }
    */

    // Initialize update manager
    // updateManager = new UpdateManager('https://api.storycore.com/updates/latest');

    // Initialize services and IPC handlers
    initializeServices();
    new CaptureService(); // Initialize capture service handlers

    // Register global shortcut for voice activation (Alt+Space)
    try {
      globalShortcut.register('Alt+Space', () => {
        if (mainWindow) {
          mainWindow.webContents.send('voice:toggle');
        }
      });
    } catch (e) {
      console.error('Error registering global shortcut:', e);
    }

    await startServer();

    // Initialize update system
    // if (updateManager) {
    //   await updateManager.initialize();
    // }

    // macOS specific: recreate window when dock icon is clicked
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        startServer();
      }
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }
}

// Start the application
initialize().then(() => {
  // Quit when all windows are closed (except on macOS)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Handle app quit
  app.on('will-quit', async () => {
    console.log('StoryCore Creative Studio shutting down');

    // Unregister IPC handlers
    if (ipcHandlers) {
      ipcHandlers.unregisterHandlers();
      console.log('IPC handlers unregistered');
    }

    // Clean up update manager
    // if (updateManager) {
    //   updateManager.dispose();
    //   console.log('Update manager disposed');
    // }

    // Clean up Vite server process if running
    if (serverManager) {
      try {
        await serverManager.stop();
        console.log('Vite server stopped gracefully');
      } catch (error) {
        console.error('Error stopping Vite server:', error);
      }
    }

    // Unregister all global shortcuts
    globalShortcut.unregisterAll();
    console.log('Global shortcuts unregistered');
  });

  // Prevent multiple instances
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    console.log('Another instance is already running');
    app.quit();
  } else {
    app.on('second-instance', () => {
      // Focus the existing window if user tries to open another instance
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      }
    });
  }
}).catch((error) => {
  console.error('Failed to start application:', error);
});