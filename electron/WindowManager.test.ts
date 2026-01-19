import { BrowserWindow, screen, shell } from 'electron';
import { WindowManager, WindowState } from './WindowManager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock Electron modules
jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
  screen: {
    getPrimaryDisplay: jest.fn(),
  },
  shell: {
    openExternal: jest.fn(),
  },
}));

// Mock fs module
jest.mock('fs');

describe('WindowManager', () => {
  let windowManager: WindowManager;
  let mockWindow: any;
  let mockSplashWindow: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock window
    mockWindow = {
      loadURL: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      focus: jest.fn(),
      close: jest.fn(),
      maximize: jest.fn(),
      isDestroyed: jest.fn().mockReturnValue(false),
      isMaximized: jest.fn().mockReturnValue(false),
      getBounds: jest.fn().mockReturnValue({ x: 100, y: 100, width: 1200, height: 800 }),
      once: jest.fn((event, callback) => {
        if (event === 'ready-to-show') {
          // Simulate ready-to-show event
          setTimeout(callback, 0);
        }
      }),
      on: jest.fn(),
      webContents: {
        setWindowOpenHandler: jest.fn(),
      },
    };

    mockSplashWindow = {
      loadURL: jest.fn(),
      show: jest.fn(),
      close: jest.fn(),
      isDestroyed: jest.fn().mockReturnValue(false),
    };

    // Mock BrowserWindow constructor
    (BrowserWindow as unknown as jest.Mock).mockImplementation((options) => {
      if (options.frame === false) {
        return mockSplashWindow;
      }
      return mockWindow;
    });

    // Mock screen
    (screen.getPrimaryDisplay as jest.Mock).mockReturnValue({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    });

    // Mock fs by default (no saved state)
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    windowManager = new WindowManager();
  });

  describe('createMainWindow', () => {
    it('should create a main window with default configuration', () => {
      const url = 'http://localhost:5173';
      const window = windowManager.createMainWindow(url);

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1200,
          height: 800,
          minWidth: 800,
          minHeight: 600,
          title: 'StoryCore Creative Studio',
          show: false,
          backgroundColor: '#1a1a1a',
        })
      );

      expect(mockWindow.loadURL).toHaveBeenCalledWith(url);
      expect(window).toBe(mockWindow);
    });

    it('should create a main window with custom configuration', () => {
      const url = 'http://localhost:5173';
      const config = {
        width: 1600,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        title: 'Custom Title',
        preload: '/path/to/preload.js',
      };

      windowManager.createMainWindow(url, config);

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1600,
          height: 900,
          minWidth: 1024,
          minHeight: 768,
          title: 'Custom Title',
          webPreferences: expect.objectContaining({
            preload: '/path/to/preload.js',
          }),
        })
      );
    });

    it('should show window when ready-to-show event fires', (done) => {
      windowManager.createMainWindow('http://localhost:5173');

      // Wait for ready-to-show callback
      setTimeout(() => {
        expect(mockWindow.show).toHaveBeenCalled();
        done();
      }, 10);
    });

    it('should return existing window if already created', () => {
      const window1 = windowManager.createMainWindow('http://localhost:5173');
      const window2 = windowManager.createMainWindow('http://localhost:5174');

      expect(window1).toBe(window2);
      expect(mockWindow.focus).toHaveBeenCalled();
      expect(BrowserWindow).toHaveBeenCalledTimes(1);
    });

    it('should load saved window state', () => {
      const savedState: WindowState = {
        width: 1400,
        height: 900,
        x: 200,
        y: 150,
        isMaximized: false,
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(savedState));

      windowManager = new WindowManager();
      windowManager.createMainWindow('http://localhost:5173');

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1400,
          height: 900,
          x: 200,
          y: 150,
        })
      );
    });

    it('should restore maximized state', () => {
      const savedState: WindowState = {
        width: 1200,
        height: 800,
        isMaximized: true,
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(savedState));

      windowManager = new WindowManager();
      windowManager.createMainWindow('http://localhost:5173');

      expect(mockWindow.maximize).toHaveBeenCalled();
    });

    it('should reset position if window would be off-screen', () => {
      const savedState: WindowState = {
        width: 1200,
        height: 800,
        x: 5000, // Off-screen
        y: 5000,
        isMaximized: false,
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(savedState));

      windowManager = new WindowManager();
      windowManager.createMainWindow('http://localhost:5173');

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          x: undefined,
          y: undefined,
        })
      );
    });

    it('should save window state on close', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      windowManager.createMainWindow('http://localhost:5173');

      // Get the close handler
      const closeHandler = (mockWindow.on as jest.Mock).mock.calls.find(
        call => call[0] === 'close'
      )?.[1];

      expect(closeHandler).toBeDefined();

      // Trigger close
      closeHandler();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('window-state.json'),
        expect.stringContaining('"width": 1200'),
        'utf-8'
      );
    });

    it('should handle external links', () => {
      windowManager.createMainWindow('http://localhost:5173');

      const handler = (mockWindow.webContents.setWindowOpenHandler as jest.Mock).mock.calls[0][0];
      const result = handler({ url: 'https://example.com' });

      expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
      expect(result).toEqual({ action: 'deny' });
    });

    it('should use default state if saved state is invalid', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      windowManager = new WindowManager();
      windowManager.createMainWindow('http://localhost:5173');

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1200,
          height: 800,
        })
      );
    });
  });

  describe('createSplashScreen', () => {
    it('should create a splash screen window', () => {
      const splash = windowManager.createSplashScreen();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 400,
          height: 300,
          frame: false,
          transparent: true,
          alwaysOnTop: true,
          resizable: false,
          center: true,
        })
      );

      expect(mockSplashWindow.loadURL).toHaveBeenCalledWith(
        expect.stringContaining('data:text/html')
      );
      expect(mockSplashWindow.show).toHaveBeenCalled();
      expect(splash).toBe(mockSplashWindow);
    });

    it('should return existing splash screen if already created', () => {
      const splash1 = windowManager.createSplashScreen();
      const splash2 = windowManager.createSplashScreen();

      expect(splash1).toBe(splash2);
      expect(BrowserWindow).toHaveBeenCalledTimes(1);
    });

    it('should close splash screen when main window is ready', (done) => {
      windowManager.createSplashScreen();
      windowManager.createMainWindow('http://localhost:5173');

      // Wait for ready-to-show callback
      setTimeout(() => {
        expect(mockSplashWindow.close).toHaveBeenCalled();
        done();
      }, 10);
    });
  });

  describe('showWindow', () => {
    it('should show and focus a window', () => {
      windowManager.createMainWindow('http://localhost:5173');
      windowManager.showWindow(mockWindow);

      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('should not throw if window is destroyed', () => {
      mockWindow.isDestroyed.mockReturnValue(true);

      expect(() => {
        windowManager.showWindow(mockWindow);
      }).not.toThrow();

      expect(mockWindow.show).not.toHaveBeenCalled();
    });
  });

  describe('hideWindow', () => {
    it('should hide a window', () => {
      windowManager.createMainWindow('http://localhost:5173');
      windowManager.hideWindow(mockWindow);

      expect(mockWindow.hide).toHaveBeenCalled();
    });

    it('should not throw if window is destroyed', () => {
      mockWindow.isDestroyed.mockReturnValue(true);

      expect(() => {
        windowManager.hideWindow(mockWindow);
      }).not.toThrow();

      expect(mockWindow.hide).not.toHaveBeenCalled();
    });
  });

  describe('openBrowser', () => {
    it('should open URL in external browser', async () => {
      (shell.openExternal as jest.Mock).mockResolvedValue(undefined);

      await windowManager.openBrowser('http://localhost:5173');

      expect(shell.openExternal).toHaveBeenCalledWith('http://localhost:5173');
    });

    it('should throw error if browser opening fails', async () => {
      const error = new Error('Failed to open');
      (shell.openExternal as jest.Mock).mockRejectedValue(error);

      await expect(windowManager.openBrowser('http://localhost:5173')).rejects.toThrow(
        'Failed to open browser: Failed to open'
      );
    });
  });

  describe('getMainWindow', () => {
    it('should return null if no main window created', () => {
      expect(windowManager.getMainWindow()).toBeNull();
    });

    it('should return main window if created', () => {
      windowManager.createMainWindow('http://localhost:5173');
      expect(windowManager.getMainWindow()).toBe(mockWindow);
    });
  });

  describe('getSplashWindow', () => {
    it('should return null if no splash window created', () => {
      expect(windowManager.getSplashWindow()).toBeNull();
    });

    it('should return splash window if created', () => {
      windowManager.createSplashScreen();
      expect(windowManager.getSplashWindow()).toBe(mockSplashWindow);
    });
  });

  describe('closeAll', () => {
    it('should close all windows', () => {
      windowManager.createSplashScreen();
      windowManager.createMainWindow('http://localhost:5173');

      windowManager.closeAll();

      expect(mockSplashWindow.close).toHaveBeenCalled();
      expect(mockWindow.close).toHaveBeenCalled();
      expect(windowManager.getSplashWindow()).toBeNull();
      expect(windowManager.getMainWindow()).toBeNull();
    });

    it('should not throw if windows are already destroyed', () => {
      windowManager.createSplashScreen();
      windowManager.createMainWindow('http://localhost:5173');

      mockSplashWindow.isDestroyed.mockReturnValue(true);
      mockWindow.isDestroyed.mockReturnValue(true);

      expect(() => {
        windowManager.closeAll();
      }).not.toThrow();
    });

    it('should handle case when no windows exist', () => {
      expect(() => {
        windowManager.closeAll();
      }).not.toThrow();
    });
  });

  describe('window state persistence', () => {
    it('should create directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      windowManager.createMainWindow('http://localhost:5173');

      // Trigger close to save state
      const closeHandler = (mockWindow.on as jest.Mock).mock.calls.find(
        call => call[0] === 'close'
      )?.[1];
      closeHandler();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });

    it('should handle save errors gracefully', () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write failed');
      });

      windowManager.createMainWindow('http://localhost:5173');

      // Trigger close - should not throw
      const closeHandler = (mockWindow.on as jest.Mock).mock.calls.find(
        call => call[0] === 'close'
      )?.[1];

      expect(() => {
        closeHandler();
      }).not.toThrow();
    });

    it('should handle load errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read failed');
      });

      windowManager = new WindowManager();
      windowManager.createMainWindow('http://localhost:5173');

      // Should use default state
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1200,
          height: 800,
        })
      );
    });
  });

  describe('platform-specific user data path', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
      });
    });

    it('should use correct path on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });
      process.env.APPDATA = 'C:\\Users\\Test\\AppData\\Roaming';

      windowManager = new WindowManager();
      windowManager.createMainWindow('http://localhost:5173');

      // Trigger save to verify path
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const closeHandler = (mockWindow.on as jest.Mock).mock.calls.find(
        call => call[0] === 'close'
      )?.[1];
      closeHandler();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('StoryCore'),
        expect.any(String),
        'utf-8'
      );
    });
  });
});
