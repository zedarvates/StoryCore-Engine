/**
 * WindowManager Usage Examples
 * 
 * This file demonstrates how to use the WindowManager class
 * in the Electron main process.
 */

import { app } from 'electron';
import { WindowManager } from './WindowManager';
import { ViteServerManager } from './ViteServerManager';

/**
 * Example 1: Basic usage with splash screen
 */
async function basicUsageExample() {
  const windowManager = new WindowManager();
  const serverManager = new ViteServerManager();

  // Show splash screen while server starts
  windowManager.createSplashScreen();

  // Start the Vite server
  const serverInfo = await serverManager.start({
    vitePort: 5173,
    fallbackPorts: [5174, 5175, 5176],
    serverStartTimeout: 30000,
    autoOpenBrowser: false,
  });

  // Create main window (splash will close automatically when ready)
  const mainWindow = windowManager.createMainWindow(serverInfo.url, {
    width: 1400,
    height: 900,
    title: 'StoryCore Creative Studio',
    preload: __dirname + '/preload.js',
  });

  console.log('Application started successfully!');
}

/**
 * Example 2: Opening external browser instead of embedded window
 */
async function externalBrowserExample() {
  const windowManager = new WindowManager();
  const serverManager = new ViteServerManager();

  // Start server
  const serverInfo = await serverManager.start({
    vitePort: 5173,
    fallbackPorts: [5174, 5175, 5176],
    serverStartTimeout: 30000,
    autoOpenBrowser: true,
  });

  // Open in external browser
  await windowManager.openBrowser(serverInfo.url);

  console.log('Opened in external browser:', serverInfo.url);
}

/**
 * Example 3: Custom window configuration
 */
async function customWindowExample() {
  const windowManager = new WindowManager();

  const mainWindow = windowManager.createMainWindow('http://localhost:5173', {
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    title: 'My Custom App',
    icon: __dirname + '/assets/icon.png',
  });

  // Show/hide window programmatically
  windowManager.hideWindow(mainWindow);
  
  setTimeout(() => {
    windowManager.showWindow(mainWindow);
  }, 2000);
}

/**
 * Example 4: Complete application lifecycle
 */
async function completeLifecycleExample() {
  const windowManager = new WindowManager();
  const serverManager = new ViteServerManager();

  try {
    // 1. Show splash screen
    windowManager.createSplashScreen();

    // 2. Start server with error handling
    serverManager.onError((error) => {
      console.error('Server error:', error);
      // Could show error dialog here
    });

    const serverInfo = await serverManager.start({
      vitePort: 5173,
      fallbackPorts: [5174, 5175, 5176, 5177, 5178],
      serverStartTimeout: 30000,
      autoOpenBrowser: false,
    });

    // 3. Create main window
    const mainWindow = windowManager.createMainWindow(serverInfo.url);

    // 4. Handle app quit
    app.on('window-all-closed', async () => {
      // Stop server gracefully
      await serverManager.stop();
      
      // Close all windows
      windowManager.closeAll();
      
      // Quit app
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // 5. Handle app activation (macOS)
    app.on('activate', () => {
      if (windowManager.getMainWindow() === null) {
        windowManager.createMainWindow(serverInfo.url);
      }
    });

  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
}

/**
 * Example 5: Window state persistence
 * 
 * The WindowManager automatically saves and restores:
 * - Window size (width, height)
 * - Window position (x, y)
 * - Maximized state
 * 
 * State is saved to:
 * - Windows: %APPDATA%\StoryCore\window-state.json
 * - macOS: ~/Library/Application Support/StoryCore/window-state.json
 * - Linux: ~/.config/StoryCore/window-state.json
 */
async function windowStatePersistenceExample() {
  const windowManager = new WindowManager();

  // First launch: uses default size (1200x800)
  // Subsequent launches: restores last size and position
  const mainWindow = windowManager.createMainWindow('http://localhost:5173');

  // User resizes/moves window...
  // On close, state is automatically saved
  // Next launch will restore the saved state
}

/**
 * Example 6: Error handling
 */
async function errorHandlingExample() {
  const windowManager = new WindowManager();

  try {
    // Try to open browser
    await windowManager.openBrowser('http://localhost:5173');
  } catch (error) {
    console.error('Failed to open browser:', error);
    // Fallback: create embedded window instead
    windowManager.createMainWindow('http://localhost:5173');
  }
}

/**
 * Example 7: Multiple windows (advanced)
 */
async function multipleWindowsExample() {
  const windowManager = new WindowManager();

  // Main window
  const mainWindow = windowManager.createMainWindow('http://localhost:5173');

  // Splash screen (separate window)
  const splash = windowManager.createSplashScreen();

  // Get references
  console.log('Main window:', windowManager.getMainWindow());
  console.log('Splash window:', windowManager.getSplashWindow());

  // Close all at once
  setTimeout(() => {
    windowManager.closeAll();
  }, 5000);
}

// Export examples for documentation
export {
  basicUsageExample,
  externalBrowserExample,
  customWindowExample,
  completeLifecycleExample,
  windowStatePersistenceExample,
  errorHandlingExample,
  multipleWindowsExample,
};
