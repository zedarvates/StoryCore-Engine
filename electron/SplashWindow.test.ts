import { EventEmitter } from 'events';
import { runInNewContext } from 'vm';
import { BrowserWindow } from 'electron';
import { SplashWindow } from './SplashWindow';

jest.mock('electron', () => ({ BrowserWindow: jest.fn() }));
jest.mock('./defaultPaths', () => ({ getAppIconPath: () => undefined }));

class FakeWindow extends EventEmitter {
  destroyed = false;
  statusElement = { textContent: '' };
  progressElement = { value: 0 };
  renderer = {
    document: {
      getElementById: (id: string) => id === 'status' ? this.statusElement : this.progressElement,
    },
    injected: false,
  };
  webContents = Object.assign(new EventEmitter(), {
    setWindowOpenHandler: jest.fn(),
    executeJavaScript: jest.fn(async (script: string) => runInNewContext(script, this.renderer)),
  });
  loadURL = jest.fn().mockResolvedValue(undefined);
  show = jest.fn();
  isDestroyed = (): boolean => this.destroyed;
  close = jest.fn(() => {
    this.destroyed = true;
    this.emit('closed');
  });
}

describe('SplashWindow startup lifecycle', () => {
  let window: FakeWindow;
  let splash: SplashWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    window = new FakeWindow();
    (BrowserWindow as unknown as jest.Mock).mockReturnValue(window);
    splash = new SplashWindow();
  });

  it('uses a sandboxed local document without a renderer Node bridge', () => {
    expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
    }));
    const url = window.loadURL.mock.calls[0][0] as string;
    expect(url).toMatch(/^data:text\/html;charset=utf-8,/);
    expect(decodeURIComponent(url)).toContain("default-src 'none'");
    expect(window.show).not.toHaveBeenCalled();
    window.emit('ready-to-show');
    expect(window.show).toHaveBeenCalledTimes(1);
  });

  it('keeps the latest update sent before the document has loaded', () => {
    splash.update('Initializing services...', 10);
    splash.update('Connecting to backend engine...', 30);
    expect(window.webContents.executeJavaScript).not.toHaveBeenCalled();
    window.webContents.emit('did-finish-load');
    expect(window.statusElement.textContent).toBe('Connecting to backend engine...');
    expect(window.progressElement.value).toBe(30);
  });

  it('renders quotes, markup and code-like status strings as literal text', () => {
    window.webContents.emit('did-finish-load');
    const message = `"; globalThis.injected = true; // <img src=x onerror=alert(1)>\nÉté`;
    splash.update(message, 70);
    expect(window.statusElement.textContent).toBe(message);
    expect(window.renderer.injected).toBe(false);
    expect(window.progressElement.value).toBe(70);
  });

  it.each([[-10, 0], [120, 100], [NaN, 0], [Infinity, 0], [-Infinity, 0]])(
    'bounds progress %s to %s', (input, expected) => {
      window.webContents.emit('did-finish-load');
      splash.update('Loading interface...', input);
      expect(window.progressElement.value).toBe(expected);
    },
  );

  it('ignores late load, show and update events after an early close', () => {
    splash.close();
    splash.close();
    window.webContents.emit('did-finish-load');
    window.emit('ready-to-show');
    splash.update('Too late', 100);
    expect(window.close).toHaveBeenCalledTimes(1);
    expect(window.show).not.toHaveBeenCalled();
    expect(window.webContents.executeJavaScript).not.toHaveBeenCalled();
  });

  it('ignores updates after the native window is closed', () => {
    window.close();
    splash.update('Too late', 100);
    splash.close();
    expect(window.close).toHaveBeenCalledTimes(1);
    expect(window.webContents.executeJavaScript).not.toHaveBeenCalled();
  });

  it('denies new windows and navigation away from the splash document', () => {
    const openHandler = window.webContents.setWindowOpenHandler.mock.calls[0][0];
    expect(openHandler({ url: 'https://example.invalid/' })).toEqual({ action: 'deny' });
    const event = { preventDefault: jest.fn() };
    window.webContents.emit('will-navigate', event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('handles a document load failure without leaving the splash window open', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    splash.close();
    window = new FakeWindow();
    window.loadURL.mockRejectedValue(new Error('load failed'));
    (BrowserWindow as unknown as jest.Mock).mockReturnValue(window);
    new SplashWindow();
    await Promise.resolve();
    expect(window.close).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });

  it('handles a renderer update failure without an unhandled rejection', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.webContents.executeJavaScript.mockRejectedValue(new Error('renderer stopped'));
    window.webContents.emit('did-finish-load');
    await Promise.resolve();
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });
});
