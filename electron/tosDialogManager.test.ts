/**
 * Tests for TOS Dialog Manager
 * 
 * Task 3 Checkpoint: Ensure main process logic compiles and basic window creation works
 */

import { BrowserWindow, app } from 'electron';
import {
  createTOSWindow,
  handleAcceptance,
  handleExit,
  setupIPCHandlers,
  getTOSState,
  resetTOSState,
} from './tosDialogManager';

// Mock Electron modules
jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
  app: {
    quit: jest.fn(),
    emit: jest.fn(),
    getPath: jest.fn(() => '/mock/path'),
  },
  ipcMain: {
    on: jest.fn(),
    removeHandler: jest.fn(),
  },
}));

describe('TOS Dialog Manager', () => {
  let mockWindow: any;

  beforeEach(() => {
    // Reset state before each test
    resetTOSState();

    // Clear all mocks
    jest.clearAllMocks();

    // Create mock window
    mockWindow = {
      loadFile: jest.fn().mockResolvedValue(undefined),
      show: jest.fn(),
      close: jest.fn(),
      isDestroyed: jest.fn().mockReturnValue(false),
      on: jest.fn(),
      webContents: {
        on: jest.fn(),
      },
    };

    // Mock BrowserWindow constructor
    (BrowserWindow as unknown as jest.Mock).mockImplementation(() => mockWindow);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createTOSWindow', () => {
    it('should create a BrowserWindow with correct configuration', async () => {
      await createTOSWindow();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 600,
          height: 400,
          title: 'Terms of Service',
          resizable: false,
          minimizable: false,
          maximizable: false,
          alwaysOnTop: true,
          center: true,
          frame: true,
          webPreferences: expect.objectContaining({
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          }),
        })
      );
    });

    it('should load the TOS HTML file', async () => {
      await createTOSWindow();

      expect(mockWindow.loadFile).toHaveBeenCalled();
      const loadedPath = mockWindow.loadFile.mock.calls[0][0];
      expect(loadedPath).toContain('tos.html');
    });

    it('should set up window event listeners', async () => {
      await createTOSWindow();

      expect(mockWindow.on).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
      expect(mockWindow.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should set up renderer process crash handler', async () => {
      await createTOSWindow();

      expect(mockWindow.webContents.on).toHaveBeenCalledWith(
        'render-process-gone',
        expect.any(Function)
      );
    });

    it('should set up resource loading failure handler', async () => {
      await createTOSWindow();

      expect(mockWindow.webContents.on).toHaveBeenCalledWith(
        'did-fail-load',
        expect.any(Function)
      );
    });

    it('should return the created BrowserWindow', async () => {
      const window = await createTOSWindow();

      expect(window).toBe(mockWindow);
    });

    it('should update state with window reference', async () => {
      await createTOSWindow();

      const state = getTOSState();
      expect(state.window).toBe(mockWindow);
    });

    it('should handle window creation failure', async () => {
      // Mock BrowserWindow to throw error
      (BrowserWindow as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Window creation failed');
      });

      await expect(createTOSWindow()).rejects.toThrow('Window creation failed');
      expect(app.quit).toHaveBeenCalled();
    });

    it('should show window when ready-to-show event fires', async () => {
      await createTOSWindow();

      // Find and call the ready-to-show handler
      const readyToShowCall = mockWindow.on.mock.calls.find(
        (call: any[]) => call[0] === 'ready-to-show'
      );
      expect(readyToShowCall).toBeDefined();

      const readyToShowHandler = readyToShowCall[1];
      readyToShowHandler();

      expect(mockWindow.show).toHaveBeenCalled();

      const state = getTOSState();
      expect(state.isVisible).toBe(true);
    });

    it('should call handleExit when window close event fires', async () => {
      await createTOSWindow();

      // Find and call the close handler
      const closeCall = mockWindow.on.mock.calls.find((call: any[]) => call[0] === 'close');
      expect(closeCall).toBeDefined();

      const closeHandler = closeCall[1];
      const mockEvent = { preventDefault: jest.fn() };
      closeHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(app.quit).toHaveBeenCalled();
    });

    it('should call handleExit when renderer process crashes', async () => {
      await createTOSWindow();

      // Find and call the render-process-gone handler
      const crashCall = mockWindow.webContents.on.mock.calls.find(
        (call: any[]) => call[0] === 'render-process-gone'
      );
      expect(crashCall).toBeDefined();

      const crashHandler = crashCall[1];
      crashHandler({}, { reason: 'crashed' });

      expect(app.quit).toHaveBeenCalled();
    });

    it('should call handleExit when resource loading fails', async () => {
      await createTOSWindow();

      // Find and call the did-fail-load handler
      const failLoadCall = mockWindow.webContents.on.mock.calls.find(
        (call: any[]) => call[0] === 'did-fail-load'
      );
      expect(failLoadCall).toBeDefined();

      const failLoadHandler = failLoadCall[1];
      failLoadHandler({}, -2, 'ERR_FAILED');

      expect(app.quit).toHaveBeenCalled();
    });
  });

  describe('handleAcceptance', () => {
    beforeEach(async () => {
      await createTOSWindow();
    });

    it('should set isAccepted state to true', () => {
      handleAcceptance();

      const state = getTOSState();
      expect(state.isAccepted).toBe(true);
    });

    it('should close the TOS window', () => {
      handleAcceptance();

      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should emit tos:accepted event', () => {
      handleAcceptance();

      expect(app.emit).toHaveBeenCalledWith('tos:accepted');
    });

    it('should not close window if already destroyed', () => {
      mockWindow.isDestroyed.mockReturnValue(true);

      handleAcceptance();

      expect(mockWindow.close).not.toHaveBeenCalled();
    });

    it('should prevent duplicate acceptance', () => {
      handleAcceptance();
      jest.clearAllMocks();

      handleAcceptance();

      expect(mockWindow.close).not.toHaveBeenCalled();
      expect(app.emit).not.toHaveBeenCalled();
    });

    it('should not accept if already exited', () => {
      handleExit();
      jest.clearAllMocks();

      handleAcceptance();

      const state = getTOSState();
      expect(state.isAccepted).toBe(false);
    });
  });

  describe('handleExit', () => {
    beforeEach(async () => {
      await createTOSWindow();
    });

    it('should set isExited state to true', () => {
      handleExit();

      const state = getTOSState();
      expect(state.isExited).toBe(true);
    });

    it('should close the TOS window', () => {
      handleExit();

      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should quit the application', () => {
      handleExit();

      expect(app.quit).toHaveBeenCalled();
    });

    it('should not close window if already destroyed', () => {
      mockWindow.isDestroyed.mockReturnValue(true);

      handleExit();

      expect(mockWindow.close).not.toHaveBeenCalled();
    });

    it('should prevent duplicate exit', () => {
      handleExit();
      jest.clearAllMocks();

      handleExit();

      expect(mockWindow.close).not.toHaveBeenCalled();
      expect(app.quit).not.toHaveBeenCalled();
    });
  });

  describe('setupIPCHandlers', () => {
    it('should register IPC handlers', () => {
      const { ipcMain } = require('electron');

      setupIPCHandlers();

      expect(ipcMain.on).toHaveBeenCalledWith('tos:accept', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('tos:exit', expect.any(Function));
    });

    it('should call handleAcceptance when tos:accept event is received', async () => {
      const { ipcMain } = require('electron');
      await createTOSWindow();

      setupIPCHandlers();

      // Find and call the tos:accept handler
      const acceptCall = ipcMain.on.mock.calls.find((call: any[]) => call[0] === 'tos:accept');
      expect(acceptCall).toBeDefined();

      const acceptHandler = acceptCall[1];
      acceptHandler();

      const state = getTOSState();
      expect(state.isAccepted).toBe(true);
    });

    it('should call handleExit when tos:exit event is received', async () => {
      const { ipcMain } = require('electron');
      await createTOSWindow();

      setupIPCHandlers();

      // Find and call the tos:exit handler
      const exitCall = ipcMain.on.mock.calls.find((call: any[]) => call[0] === 'tos:exit');
      expect(exitCall).toBeDefined();

      const exitHandler = exitCall[1];
      exitHandler();

      const state = getTOSState();
      expect(state.isExited).toBe(true);
    });
  });

  describe('getTOSState', () => {
    it('should return initial state', () => {
      const state = getTOSState();

      expect(state.window).toBeNull();
      expect(state.isVisible).toBe(false);
      expect(state.isAccepted).toBe(false);
      expect(state.isExited).toBe(false);
    });

    it('should return current state after window creation', async () => {
      await createTOSWindow();

      const state = getTOSState();

      expect(state.window).toBe(mockWindow);
      expect(state.isVisible).toBe(false);
      expect(state.isAccepted).toBe(false);
      expect(state.isExited).toBe(false);
    });

    it('should return a copy of state', () => {
      const state1 = getTOSState();
      const state2 = getTOSState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });
  });

  describe('resetTOSState', () => {
    it('should reset state to initial values', async () => {
      await createTOSWindow();
      handleAcceptance();

      resetTOSState();

      const state = getTOSState();
      expect(state.window).toBeNull();
      expect(state.isVisible).toBe(false);
      expect(state.isAccepted).toBe(false);
      expect(state.isExited).toBe(false);
    });
  });

  describe('TypeScript compilation', () => {
    it('should have correct TypeScript interfaces', () => {
      // This test ensures the module exports the expected types
      // If this compiles, the interfaces are correct
      const config: import('./tosDialogManager').TOSDialogConfig = {
        message: 'test',
        windowTitle: 'test',
        acceptButtonText: 'OK',
        exitButtonText: 'Exit',
        width: 600,
        height: 400,
      };

      const state: import('./tosDialogManager').TOSWindowState = {
        window: null,
        isVisible: false,
        isAccepted: false,
        isExited: false,
      };

      expect(config).toBeDefined();
      expect(state).toBeDefined();
    });
  });

  describe('Multi-instance support', () => {
    it('should maintain independent state per module instance', async () => {
      // Create first TOS window
      await createTOSWindow();
      const state1 = getTOSState();
      
      expect(state1.window).toBe(mockWindow);
      expect(state1.isVisible).toBe(false);
      expect(state1.isAccepted).toBe(false);
      expect(state1.isExited).toBe(false);

      // Simulate acceptance in first instance
      handleAcceptance();
      const state1AfterAccept = getTOSState();
      
      expect(state1AfterAccept.isAccepted).toBe(true);
      expect(state1AfterAccept.isExited).toBe(false);

      // Reset state to simulate a new process/instance
      resetTOSState();
      
      // Create second TOS window (simulating a new instance)
      const mockWindow2 = {
        loadFile: jest.fn().mockResolvedValue(undefined),
        show: jest.fn(),
        close: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
        },
      };
      (BrowserWindow as unknown as jest.Mock).mockImplementation(() => mockWindow2);
      
      await createTOSWindow();
      const state2 = getTOSState();
      
      // Verify second instance has independent state
      expect(state2.window).toBe(mockWindow2);
      expect(state2.window).not.toBe(mockWindow);
      expect(state2.isVisible).toBe(false);
      expect(state2.isAccepted).toBe(false); // Not affected by first instance
      expect(state2.isExited).toBe(false);
    });

    it('should create independent TOS windows for each instance', async () => {
      // Create first window
      const window1 = await createTOSWindow();
      expect(window1).toBe(mockWindow);

      // Reset and create second window (simulating new instance)
      resetTOSState();
      const mockWindow2 = {
        loadFile: jest.fn().mockResolvedValue(undefined),
        show: jest.fn(),
        close: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
        },
      };
      (BrowserWindow as unknown as jest.Mock).mockImplementation(() => mockWindow2);
      
      const window2 = await createTOSWindow();
      
      // Verify windows are independent
      expect(window2).toBe(mockWindow2);
      expect(window2).not.toBe(window1);
    });

    it('should not share acceptance state between instances', async () => {
      // First instance accepts
      await createTOSWindow();
      handleAcceptance();
      
      const state1 = getTOSState();
      expect(state1.isAccepted).toBe(true);

      // Reset to simulate new instance
      resetTOSState();
      
      // Second instance should start fresh
      const mockWindow2 = {
        loadFile: jest.fn().mockResolvedValue(undefined),
        show: jest.fn(),
        close: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
        },
      };
      (BrowserWindow as unknown as jest.Mock).mockImplementation(() => mockWindow2);
      
      await createTOSWindow();
      const state2 = getTOSState();
      
      // Second instance should not be affected by first instance's acceptance
      expect(state2.isAccepted).toBe(false);
      expect(state2.isExited).toBe(false);
    });

    it('should not share exit state between instances', async () => {
      // First instance exits
      await createTOSWindow();
      handleExit();
      
      const state1 = getTOSState();
      expect(state1.isExited).toBe(true);

      // Reset to simulate new instance
      resetTOSState();
      
      // Second instance should start fresh
      const mockWindow2 = {
        loadFile: jest.fn().mockResolvedValue(undefined),
        show: jest.fn(),
        close: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
        },
      };
      (BrowserWindow as unknown as jest.Mock).mockImplementation(() => mockWindow2);
      
      await createTOSWindow();
      const state2 = getTOSState();
      
      // Second instance should not be affected by first instance's exit
      expect(state2.isAccepted).toBe(false);
      expect(state2.isExited).toBe(false);
    });
  });

  describe('IPC timeout handling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start timeout timer when window is shown', async () => {
      await createTOSWindow();

      // Find and call the ready-to-show handler
      const readyToShowCall = mockWindow.on.mock.calls.find(
        (call: any[]) => call[0] === 'ready-to-show'
      );
      const readyToShowHandler = readyToShowCall[1];
      readyToShowHandler();

      // Verify timeout is set (by checking if app.quit is called after timeout)
      jest.advanceTimersByTime(5000);

      expect(app.quit).toHaveBeenCalled();
    });

    it('should clear timeout when acceptance is received', async () => {
      await createTOSWindow();

      // Trigger ready-to-show to start timeout
      const readyToShowCall = mockWindow.on.mock.calls.find(
        (call: any[]) => call[0] === 'ready-to-show'
      );
      const readyToShowHandler = readyToShowCall[1];
      readyToShowHandler();

      // Clear mocks after window setup
      jest.clearAllMocks();

      // Handle acceptance before timeout
      handleAcceptance();

      // Advance time past timeout
      jest.advanceTimersByTime(5000);

      // app.quit should not be called due to timeout (only from acceptance)
      expect(app.quit).not.toHaveBeenCalled();
    });

    it('should clear timeout when exit is received', async () => {
      await createTOSWindow();

      // Trigger ready-to-show to start timeout
      const readyToShowCall = mockWindow.on.mock.calls.find(
        (call: any[]) => call[0] === 'ready-to-show'
      );
      const readyToShowHandler = readyToShowCall[1];
      readyToShowHandler();

      // Clear mocks after window setup
      jest.clearAllMocks();

      // Handle exit before timeout
      handleExit();

      // Clear the quit call from handleExit
      jest.clearAllMocks();

      // Advance time past timeout
      jest.advanceTimersByTime(5000);

      // app.quit should not be called again due to timeout
      expect(app.quit).not.toHaveBeenCalled();
    });

    it('should terminate application on IPC timeout', async () => {
      await createTOSWindow();

      // Trigger ready-to-show to start timeout
      const readyToShowCall = mockWindow.on.mock.calls.find(
        (call: any[]) => call[0] === 'ready-to-show'
      );
      const readyToShowHandler = readyToShowCall[1];
      readyToShowHandler();

      // Clear mocks after window setup
      jest.clearAllMocks();

      // Advance time to trigger timeout
      jest.advanceTimersByTime(5000);

      // Verify application terminates
      expect(app.quit).toHaveBeenCalled();

      const state = getTOSState();
      expect(state.isExited).toBe(true);
    });

    it('should clear timeout on renderer crash', async () => {
      // Reset and recreate mock for this test
      jest.clearAllMocks();
      resetTOSState();
      
      mockWindow = {
        loadFile: jest.fn().mockResolvedValue(undefined),
        show: jest.fn(),
        close: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
        },
      };
      (BrowserWindow as unknown as jest.Mock).mockImplementation(() => mockWindow);

      await createTOSWindow();

      // Capture event handlers from the new mock
      const readyToShowCall = mockWindow.on.mock.calls.find(
        (call: any[]) => call[0] === 'ready-to-show'
      );
      const crashCall = mockWindow.webContents.on.mock.calls.find(
        (call: any[]) => call[0] === 'render-process-gone'
      );
      
      expect(readyToShowCall).toBeDefined();
      expect(crashCall).toBeDefined();
      
      const readyToShowHandler = readyToShowCall[1];
      const crashHandler = crashCall[1];

      // Trigger ready-to-show to start timeout
      readyToShowHandler();

      // Clear mocks after window setup
      jest.clearAllMocks();

      // Trigger renderer crash
      crashHandler({}, { reason: 'crashed' });

      // Clear the quit call from crash handler
      jest.clearAllMocks();

      // Advance time past timeout
      jest.advanceTimersByTime(5000);

      // app.quit should not be called again due to timeout
      expect(app.quit).not.toHaveBeenCalled();
    });

    it('should clear timeout on resource loading failure', async () => {
      // Reset and recreate mock for this test
      jest.clearAllMocks();
      resetTOSState();
      
      mockWindow = {
        loadFile: jest.fn().mockResolvedValue(undefined),
        show: jest.fn(),
        close: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
        },
      };
      (BrowserWindow as unknown as jest.Mock).mockImplementation(() => mockWindow);

      await createTOSWindow();

      // Capture event handlers from the new mock
      const readyToShowCall = mockWindow.on.mock.calls.find(
        (call: any[]) => call[0] === 'ready-to-show'
      );
      const failLoadCall = mockWindow.webContents.on.mock.calls.find(
        (call: any[]) => call[0] === 'did-fail-load'
      );
      
      expect(readyToShowCall).toBeDefined();
      expect(failLoadCall).toBeDefined();
      
      const readyToShowHandler = readyToShowCall[1];
      const failLoadHandler = failLoadCall[1];

      // Trigger ready-to-show to start timeout
      readyToShowHandler();

      // Clear mocks after window setup
      jest.clearAllMocks();

      // Trigger resource loading failure
      failLoadHandler({}, -2, 'ERR_FAILED');

      // Clear the quit call from fail handler
      jest.clearAllMocks();

      // Advance time past timeout
      jest.advanceTimersByTime(5000);

      // app.quit should not be called again due to timeout
      expect(app.quit).not.toHaveBeenCalled();
    });

    it('should clear timeout on window creation failure', async () => {
      // Mock BrowserWindow to throw error
      (BrowserWindow as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Window creation failed');
      });

      try {
        await createTOSWindow();
      } catch (error) {
        // Expected error
      }

      // Clear mocks after window creation failure
      jest.clearAllMocks();

      // Advance time past timeout
      jest.advanceTimersByTime(5000);

      // app.quit should not be called due to timeout (already called on creation failure)
      expect(app.quit).not.toHaveBeenCalled();
    });
  });
});
