// Run after electron:build, with Electron and a display (Xvfb on Linux CI).
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { app, BrowserWindow } = require('electron');
const { SplashWindow } = require('../dist/electron/SplashWindow.js');

const timeout = setTimeout(() => {
  console.error('Splash smoke test timed out');
  app.exit(1);
}, 15000);

app.whenReady().then(async () => {
  const splash = new SplashWindow();
  const [window] = BrowserWindow.getAllWindows();
  assert.ok(window, 'Splash creates a native BrowserWindow');
  const loaded = once(window.webContents, 'did-finish-load');
  splash.update('Initializing services...', 10);
  splash.update('Connecting to backend engine...', 30);
  await loaded;

  const readStatus = () => window.webContents.executeJavaScript(`({
    message: document.getElementById('status').textContent,
    progress: document.getElementById('progress').value,
    hasNode: typeof require !== 'undefined'
  })`);
  assert.deepEqual(await readStatus(), {
    message: 'Connecting to backend engine...', progress: 30, hasNode: false,
  });
  const message = `Loading interface... É " <img src=x onerror=alert(1)>`;
  splash.update(message, 90);
  assert.deepEqual(await readStatus(), { message, progress: 90, hasNode: false });

  const closed = once(window, 'closed');
  splash.close();
  await closed;
  splash.close();
  splash.update('Too late', 100);
  assert.equal(BrowserWindow.getAllWindows().length, 0);
  console.log('STORYCORE_SPLASH_SMOKE_PASS', JSON.stringify({
    electron: process.versions.electron,
    node: process.versions.node,
    scope: 'splash document, progress and close lifecycle',
  }));
  clearTimeout(timeout);
  app.exit(0);
}).catch((error) => {
  console.error(error);
  clearTimeout(timeout);
  app.exit(1);
});
