import { SystemTrayManager } from './SystemTrayManager';
import { ServerStatus } from './ViteServerManager';
import { Tray, Menu, nativeImage, app } from 'electron';

// Mock Electron modules
jest.mock('electron', () => ({
  Tray: jest.fn(),
  Menu: {
    buildFromTemplate: jest.fn(),
  },
  nativeImage: {
    createFromDataURL: jest.fn(),
  },
  app: {
    quit: jest.fn(),
  },
}));

describe('SystemTrayManager', () => {
  let manager: SystemTrayManager;
  let mockTray: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock tray instance
    mockTray = {
      setToolTip: jest.fn(),
      setImage: jest.fn(),
      setContextMenu: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn(),
    };

    // Mock Tray constructor
    (Tray as unknown as jest.Mock).mockImplementation(() => mockTray);

    // Mock nativeImage
    (nativeImage.createFromDataURL as jest.Mock).mockReturnValue({});

    // Mock Menu
    (Menu.buildFromTemplate as jest.Mock).mockReturnValue({});

    manager = new SystemTrayManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('create', () => {
    it('should create a tray icon', () => {
      const tray = manager.create();

      expect(Tray).toHaveBeenCalled();
      expect(tray).toBe(mockTray);
      expect(mockTray.setToolTip).toHaveBeenCalledWith('StoryCore Creative Studio');
    });

    it('should return existing tray if already created', () => {
      const tray1 = manager.create();
      const tray2 = manager.create();

      expect(tray1).toBe(tray2);
      expect(Tray).toHaveBeenCalledTimes(1);
    });

    it('should set up click handler', () => {
      manager.create();

      expect(mockTray.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should call onShow callback when tray is clicked', () => {
      const onShowCallback = jest.fn();
      manager.onShow(onShowCallback);
      manager.create();

      // Get the click handler and call it
      const clickHandler = (mockTray.on as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'click'
      )?.[1];
      
      if (clickHandler) {
        clickHandler();
      }

      expect(onShowCallback).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    beforeEach(() => {
      manager.create();
      jest.clearAllMocks();
    });

    it('should update icon and tooltip when status changes to running', () => {
      const status: ServerStatus = {
        state: 'running',
        port: 5173,
        url: 'http://localhost:5173',
        pid: 12345,
        uptime: 5000,
      };

      manager.updateStatus(status);

      expect(mockTray.setImage).toHaveBeenCalled();
      expect(mockTray.setToolTip).toHaveBeenCalledWith(
        expect.stringContaining('Server running on port 5173')
      );
    });

    it('should update icon and tooltip when status changes to starting', () => {
      const status: ServerStatus = {
        state: 'starting',
      };

      manager.updateStatus(status);

      expect(mockTray.setImage).toHaveBeenCalled();
      expect(mockTray.setToolTip).toHaveBeenCalledWith(
        expect.stringContaining('Server starting...')
      );
    });

    it('should update icon and tooltip when status changes to error', () => {
      const status: ServerStatus = {
        state: 'error',
        error: {
          code: 'PORT_CONFLICT',
          message: 'Port already in use',
          timestamp: new Date(),
        },
      };

      manager.updateStatus(status);

      expect(mockTray.setImage).toHaveBeenCalled();
      expect(mockTray.setToolTip).toHaveBeenCalledWith(
        expect.stringContaining('Server error: Port already in use')
      );
    });

    it('should update icon and tooltip when status changes to stopped', () => {
      const status: ServerStatus = {
        state: 'stopped',
      };

      manager.updateStatus(status);

      expect(mockTray.setImage).toHaveBeenCalled();
      expect(mockTray.setToolTip).toHaveBeenCalledWith(
        expect.stringContaining('Server stopped')
      );
    });

    it('should not update icon if state has not changed', () => {
      const status: ServerStatus = {
        state: 'running',
        port: 5173,
      };

      manager.updateStatus(status);
      jest.clearAllMocks();
      
      manager.updateStatus(status);

      expect(mockTray.setImage).not.toHaveBeenCalled();
    });

    it('should always update menu even if state has not changed', () => {
      const status: ServerStatus = {
        state: 'running',
        port: 5173,
      };

      manager.updateStatus(status);
      jest.clearAllMocks();
      
      manager.updateStatus(status);

      expect(mockTray.setContextMenu).toHaveBeenCalled();
    });

    it('should do nothing if tray is not created', () => {
      const newManager = new SystemTrayManager();
      const status: ServerStatus = { state: 'running' };

      // Should not throw
      expect(() => newManager.updateStatus(status)).not.toThrow();
    });
  });

  describe('context menu', () => {
    beforeEach(() => {
      manager.create();
      jest.clearAllMocks();
    });

    it('should include server status in menu when running', () => {
      const status: ServerStatus = {
        state: 'running',
        port: 5173,
        uptime: 65000, // 1 minute 5 seconds
      };

      manager.updateStatus(status);

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];

      // Check for status label
      const statusItem = menuTemplate.find((item: any) => 
        item.label && item.label.includes('Running')
      );
      expect(statusItem).toBeDefined();

      // Check for port
      const portItem = menuTemplate.find((item: any) => 
        item.label && item.label.includes('Port: 5173')
      );
      expect(portItem).toBeDefined();

      // Check for uptime
      const uptimeItem = menuTemplate.find((item: any) => 
        item.label && item.label.includes('Uptime:')
      );
      expect(uptimeItem).toBeDefined();
    });

    it('should include error message in menu when in error state', () => {
      const status: ServerStatus = {
        state: 'error',
        error: {
          code: 'SERVER_CRASHED',
          message: 'Server crashed unexpectedly',
          timestamp: new Date(),
        },
      };

      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];

      const errorItem = menuTemplate.find((item: any) => 
        item.label && item.label.includes('Server crashed unexpectedly')
      );
      expect(errorItem).toBeDefined();
    });

    it('should include Show Window menu item', () => {
      const status: ServerStatus = { state: 'running' };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];

      const showItem = menuTemplate.find((item: any) => 
        item.label === 'Show Window'
      );
      expect(showItem).toBeDefined();
      expect(showItem.click).toBeInstanceOf(Function);
    });

    it('should include Restart Server menu item when running', () => {
      const status: ServerStatus = { state: 'running', port: 5173 };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];

      const restartItem = menuTemplate.find((item: any) => 
        item.label === 'Restart Server'
      );
      expect(restartItem).toBeDefined();
    });

    it('should include Restart Server menu item when in error state', () => {
      const status: ServerStatus = {
        state: 'error',
        error: {
          code: 'ERROR',
          message: 'Error',
          timestamp: new Date(),
        },
      };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];

      const restartItem = menuTemplate.find((item: any) => 
        item.label === 'Restart Server'
      );
      expect(restartItem).toBeDefined();
    });

    it('should not include Restart Server menu item when stopped', () => {
      const status: ServerStatus = { state: 'stopped' };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];

      const restartItem = menuTemplate.find((item: any) => 
        item.label === 'Restart Server'
      );
      expect(restartItem).toBeUndefined();
    });

    it('should include Quit menu item', () => {
      const status: ServerStatus = { state: 'running' };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];

      const quitItem = menuTemplate.find((item: any) => 
        item.label === 'Quit'
      );
      expect(quitItem).toBeDefined();
      expect(quitItem.click).toBeInstanceOf(Function);
    });
  });

  describe('callbacks', () => {
    beforeEach(() => {
      manager.create();
    });

    it('should call onQuit callback when quit menu item is clicked', () => {
      const onQuitCallback = jest.fn();
      manager.onQuit(onQuitCallback);

      const status: ServerStatus = { state: 'running' };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const quitItem = menuTemplate.find((item: any) => item.label === 'Quit');
      
      quitItem.click();

      expect(onQuitCallback).toHaveBeenCalled();
    });

    it('should call app.quit if no onQuit callback is set', () => {
      const status: ServerStatus = { state: 'running' };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const quitItem = menuTemplate.find((item: any) => item.label === 'Quit');
      
      quitItem.click();

      expect(app.quit).toHaveBeenCalled();
    });

    it('should call onShow callback when Show Window is clicked', () => {
      const onShowCallback = jest.fn();
      manager.onShow(onShowCallback);

      const status: ServerStatus = { state: 'running' };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const showItem = menuTemplate.find((item: any) => item.label === 'Show Window');
      
      showItem.click();

      expect(onShowCallback).toHaveBeenCalled();
    });

    it('should call onRestart callback when Restart Server is clicked', () => {
      const onRestartCallback = jest.fn();
      manager.onRestart(onRestartCallback);

      const status: ServerStatus = { state: 'running', port: 5173 };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const restartItem = menuTemplate.find((item: any) => item.label === 'Restart Server');
      
      restartItem.click();

      expect(onRestartCallback).toHaveBeenCalled();
    });
  });

  describe('setMenu', () => {
    it('should set custom menu on tray', () => {
      manager.create();
      
      const customMenu = {} as Menu;
      manager.setMenu(customMenu);

      expect(mockTray.setContextMenu).toHaveBeenCalledWith(customMenu);
    });

    it('should do nothing if tray is not created', () => {
      const newManager = new SystemTrayManager();
      const customMenu = {} as Menu;

      // Should not throw
      expect(() => newManager.setMenu(customMenu)).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should destroy the tray icon', () => {
      manager.create();
      manager.destroy();

      expect(mockTray.destroy).toHaveBeenCalled();
      expect(manager.getTray()).toBeNull();
    });

    it('should do nothing if tray is not created', () => {
      const newManager = new SystemTrayManager();
      
      // Should not throw
      expect(() => newManager.destroy()).not.toThrow();
    });
  });

  describe('getTray', () => {
    it('should return null before tray is created', () => {
      expect(manager.getTray()).toBeNull();
    });

    it('should return tray instance after creation', () => {
      manager.create();
      expect(manager.getTray()).toBe(mockTray);
    });

    it('should return null after destruction', () => {
      manager.create();
      manager.destroy();
      expect(manager.getTray()).toBeNull();
    });
  });

  describe('uptime formatting', () => {
    beforeEach(() => {
      manager.create();
    });

    it('should format uptime in seconds', () => {
      const status: ServerStatus = {
        state: 'running',
        port: 5173,
        uptime: 5000, // 5 seconds
      };

      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const uptimeItem = menuTemplate.find((item: any) => 
        item.label && item.label.includes('Uptime:')
      );

      expect(uptimeItem.label).toContain('5s');
    });

    it('should format uptime in minutes and seconds', () => {
      const status: ServerStatus = {
        state: 'running',
        port: 5173,
        uptime: 125000, // 2 minutes 5 seconds
      };

      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const uptimeItem = menuTemplate.find((item: any) => 
        item.label && item.label.includes('Uptime:')
      );

      expect(uptimeItem.label).toContain('2m');
      expect(uptimeItem.label).toContain('5s');
    });

    it('should format uptime in hours and minutes', () => {
      const status: ServerStatus = {
        state: 'running',
        port: 5173,
        uptime: 7325000, // 2 hours 2 minutes 5 seconds
      };

      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const uptimeItem = menuTemplate.find((item: any) => 
        item.label && item.label.includes('Uptime:')
      );

      expect(uptimeItem.label).toContain('2h');
      expect(uptimeItem.label).toContain('2m');
    });
  });

  describe('status indicators', () => {
    beforeEach(() => {
      manager.create();
    });

    it('should show running indicator (✓) when server is running', () => {
      const status: ServerStatus = { state: 'running', port: 5173 };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const statusItem = menuTemplate.find((item: any) => 
        item.label && item.label.includes('✓')
      );

      expect(statusItem).toBeDefined();
      expect(statusItem.label).toContain('Running');
    });

    it('should show starting indicator (⟳) when server is starting', () => {
      const status: ServerStatus = { state: 'starting' };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const statusItem = menuTemplate.find((item: any) => 
        item.label && item.label.includes('⟳')
      );

      expect(statusItem).toBeDefined();
      expect(statusItem.label).toContain('Starting');
    });

    it('should show error indicator (✗) when server has error', () => {
      const status: ServerStatus = {
        state: 'error',
        error: {
          code: 'ERROR',
          message: 'Error',
          timestamp: new Date(),
        },
      };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const statusItem = menuTemplate.find((item: any) => 
        item.label && item.label.includes('✗')
      );

      expect(statusItem).toBeDefined();
      expect(statusItem.label).toContain('Error');
    });

    it('should show stopped indicator (○) when server is stopped', () => {
      const status: ServerStatus = { state: 'stopped' };
      manager.updateStatus(status);

      const menuTemplate = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const statusItem = menuTemplate.find((item: any) => 
        item.label && item.label.includes('○')
      );

      expect(statusItem).toBeDefined();
      expect(statusItem.label).toContain('Stopped');
    });
  });
});

