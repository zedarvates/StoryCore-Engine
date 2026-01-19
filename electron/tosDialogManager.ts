/**
 * TOS Dialog Manager
 * 
 * Manages the Terms of Service dialog window lifecycle and coordinates
 * with the main application startup sequence.
 * 
 * Multi-Instance Support:
 * Each Electron app instance runs in a separate Node.js process, which means
 * the module-level state object is naturally isolated per instance. If multiple
 * app instances are allowed to run (e.g., if requestSingleInstanceLock is not used
 * or fails), each instance will have its own independent TOS dialog with separate
 * state tracking. This ensures that:
 * - Each instance creates its own TOS window
 * - Acceptance/exit in one instance does not affect others
 * - No shared state exists between instances
 * 
 * Requirements: 8.1, 9.3
 */

import { BrowserWindow, app, ipcMain } from 'electron';
import * as path from 'path';

/**
 * Configuration for the TOS dialog window
 */
export interface TOSDialogConfig {
  /** The legal text to display */
  message: string;
  /** Window title bar text */
  windowTitle: string;
  /** Text for the accept button */
  acceptButtonText: string;
  /** Text for the exit button */
  exitButtonText: string;
  /** Window width in pixels */
  width: number;
  /** Window height in pixels */
  height: number;
}

/**
 * Internal state tracking for the TOS dialog window
 */
export interface TOSWindowState {
  /** The BrowserWindow instance for the TOS dialog */
  window: BrowserWindow | null;
  /** Whether the dialog is currently visible */
  isVisible: boolean;
  /** Whether the user has accepted the terms */
  isAccepted: boolean;
  /** Whether the user has exited/declined */
  isExited: boolean;
}

/**
 * Interface for the TOS Dialog Manager
 */
export interface TOSDialogManager {
  /**
   * Creates and displays the TOS dialog window
   * @returns Promise that resolves when dialog is ready
   */
  createTOSWindow(): Promise<BrowserWindow>;
  
  /**
   * Handles user acceptance and proceeds to main app
   */
  handleAcceptance(): void;
  
  /**
   * Handles user exit and terminates application
   */
  handleExit(): void;
  
  /**
   * Sets up IPC listeners for dialog events
   */
  setupIPCHandlers(): void;
}

/**
 * Default configuration for the TOS dialog
 */
const DEFAULT_CONFIG: TOSDialogConfig = {
  message: 'StoryCore is an open‑source program licensed under the MIT License. This is a creative tool, and you are solely responsible for how you use it. If you understand and agree, click "OK" and let\'s continue creating. If not, please exit and uninstall the program. Thank you.',
  windowTitle: 'Terms of Service',
  acceptButtonText: 'OK',
  exitButtonText: 'Exit',
  width: 600,
  height: 400,
};

/**
 * Internal state for the TOS dialog
 * 
 * This state is module-level and isolated per Node.js process.
 * Each Electron app instance runs in its own process, ensuring
 * independent state for multi-instance scenarios.
 * 
 * Requirements: 9.3
 */
const state: TOSWindowState = {
  window: null,
  isVisible: false,
  isAccepted: false,
  isExited: false,
};

/**
 * Timeout for IPC response (5 seconds)
 */
const IPC_TIMEOUT_MS = 5000;

/**
 * Timer for IPC timeout detection
 */
let ipcTimeoutTimer: NodeJS.Timeout | null = null;

/**
 * Creates and displays the TOS dialog window
 * 
 * Requirements: 1.1, 5.2, 8.1
 * 
 * @returns Promise that resolves with the BrowserWindow instance
 */
export async function createTOSWindow(): Promise<BrowserWindow> {
  try {
    // Set up IPC handlers before creating the window
    setupIPCHandlers();
    
    // Create the browser window with specified configuration
    const tosWindow = new BrowserWindow({
      width: DEFAULT_CONFIG.width,
      height: DEFAULT_CONFIG.height,
      title: DEFAULT_CONFIG.windowTitle,
      resizable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      center: true,
      frame: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'tos-preload.js'),
      },
    });

    // Store window reference
    state.window = tosWindow;

    // Load the TOS dialog HTML
    // In development, load from source; in production, load from built files
    const isDevelopment = process.env.NODE_ENV === 'development';
    const tosHtmlPath = isDevelopment
      ? path.join(__dirname, '../../creative-studio-ui/src/renderer/tos/tos.html')
      : path.join(__dirname, '../renderer/tos/tos.html');
    
    await tosWindow.loadFile(tosHtmlPath);

    // Set up window event listeners
    tosWindow.on('ready-to-show', () => {
      state.isVisible = true;
      tosWindow.show();
      
      // Start IPC timeout timer after window is shown
      startIPCTimeout();
    });

    tosWindow.on('close', (event) => {
      // Treat window close as exit action
      if (!state.isAccepted && !state.isExited) {
        event.preventDefault();
        handleExit();
      }
    });

    // Handle renderer process crashes
    tosWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error('TOS dialog renderer process crashed:', details);
      clearIPCTimeout();
      handleExit();
    });

    // Handle resource loading failures
    tosWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error('TOS dialog failed to load:', errorCode, errorDescription);
      clearIPCTimeout();
      handleExit();
    });

    return tosWindow;
  } catch (error) {
    console.error('Failed to create TOS window:', error);
    clearIPCTimeout();
    // Terminate application on window creation failure
    app.quit();
    throw error;
  }
}

/**
 * Handles user acceptance of terms
 * 
 * Requirements: 3.2, 3.4, 8.2
 * 
 * Note: This function closes the TOS dialog and emits an event.
 * The main application window creation is handled by the main.ts
 * file when it receives the 'tos:accepted' event.
 */
export function handleAcceptance(): void {
  if (state.isAccepted || state.isExited) {
    return; // Prevent duplicate actions
  }

  state.isAccepted = true;
  
  // Clear IPC timeout since we received a response
  clearIPCTimeout();

  // Close TOS dialog window
  if (state.window && !state.window.isDestroyed()) {
    state.window.close();
  }

  // Emit event for main app to proceed
  // This will be handled by the main application initialization code
  app.emit('tos:accepted');
}

/**
 * Handles user exit/decline of terms
 * 
 * Requirements: 4.2, 4.5, 8.3
 */
export function handleExit(): void {
  if (state.isExited) {
    return; // Prevent duplicate actions
  }

  state.isExited = true;
  
  // Clear IPC timeout since we received a response
  clearIPCTimeout();

  // Close TOS dialog window
  if (state.window && !state.window.isDestroyed()) {
    state.window.close();
  }

  // Clean up event listeners
  ipcMain.removeHandler('tos:accept');
  ipcMain.removeHandler('tos:exit');

  // Terminate application
  app.quit();
}

/**
 * Sets up IPC handlers for dialog events
 * 
 * Requirements: 8.2
 */
export function setupIPCHandlers(): void {
  // Handle acceptance event from renderer
  ipcMain.on('tos:accept', () => {
    handleAcceptance();
  });

  // Handle exit event from renderer
  ipcMain.on('tos:exit', () => {
    handleExit();
  });
}

/**
 * Get current TOS dialog state (for testing/debugging)
 */
export function getTOSState(): Readonly<TOSWindowState> {
  return { ...state };
}

/**
 * Reset TOS dialog state (for testing)
 */
export function resetTOSState(): void {
  state.window = null;
  state.isVisible = false;
  state.isAccepted = false;
  state.isExited = false;
  clearIPCTimeout();
}

/**
 * Start IPC timeout timer
 * 
 * Requirements: Error Handling - IPC Communication Failures
 * 
 * If no IPC response is received within the timeout period,
 * the application will terminate.
 */
function startIPCTimeout(): void {
  // Clear any existing timeout
  clearIPCTimeout();
  
  // Start new timeout
  ipcTimeoutTimer = setTimeout(() => {
    console.error('IPC timeout: No response from TOS dialog within 5 seconds');
    console.error('Terminating application due to IPC communication failure');
    
    // Log timeout error for debugging
    if (state.window && !state.window.isDestroyed()) {
      console.error('TOS window state:', {
        isVisible: state.isVisible,
        isAccepted: state.isAccepted,
        isExited: state.isExited,
      });
    }
    
    // Terminate application on timeout
    handleExit();
  }, IPC_TIMEOUT_MS);
}

/**
 * Clear IPC timeout timer
 */
function clearIPCTimeout(): void {
  if (ipcTimeoutTimer) {
    clearTimeout(ipcTimeoutTimer);
    ipcTimeoutTimer = null;
  }
}
