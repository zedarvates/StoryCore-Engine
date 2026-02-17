/**
 * Electron Main Process
 * Entry point for Electron application
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, execFile } = require('child_process');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    show: false // Don't show until ready
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // Load built files
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

// =============================================================================
// IPC Handlers — FFmpeg Rendering
// =============================================================================

/**
 * Find the FFmpeg binary on the system.
 * Checks bundled path first, then falls back to PATH.
 */
function findFFmpegPath() {
  // Check bundled ffmpeg
  const bundled = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(bundled)) return bundled;

  // Fallback: assume it's on PATH
  return 'ffmpeg';
}

function findFFprobePath() {
  const bundled = path.join(__dirname, '..', 'bin', 'ffprobe.exe');
  if (fs.existsSync(bundled)) return bundled;
  return 'ffprobe';
}

/** Active FFmpeg processes keyed by job ID */
const activeFFmpegProcesses = new Map();

/**
 * IPC: Run an FFmpeg command with progress reporting.
 *
 * Args: { jobId, args: string[], outputPath: string }
 * Returns progress events via 'ffmpeg:progress' channel.
 */
ipcMain.handle('ffmpeg:run', async (event, { jobId, args, outputPath }) => {
  const ffmpegPath = findFFmpegPath();

  return new Promise((resolve, reject) => {
    // Add progress flags
    const fullArgs = ['-progress', 'pipe:2', '-y', ...args, outputPath];

    console.log(`[FFmpeg] Starting job ${jobId}: ${ffmpegPath} ${fullArgs.join(' ')}`);

    const proc = spawn(ffmpegPath, fullArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    activeFFmpegProcesses.set(jobId, proc);

    // Parse progress from stderr
    let stderrData = '';
    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();

      // Parse FFmpeg progress lines
      const lines = stderrData.split('\n');
      stderrData = lines.pop() || ''; // Keep incomplete line

      for (const line of lines) {
        if (line.startsWith('frame=')) {
          const frame = parseInt(line.split('=')[1]?.trim() || '0', 10);
          mainWindow?.webContents.send('ffmpeg:progress', { jobId, frame });
        }
        if (line.startsWith('progress=end')) {
          mainWindow?.webContents.send('ffmpeg:progress', { jobId, frame: -1, done: true });
        }
      }
    });

    proc.on('close', (code) => {
      activeFFmpegProcesses.delete(jobId);
      if (code === 0) {
        resolve({ success: true, outputPath });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      activeFFmpegProcesses.delete(jobId);
      reject(err);
    });
  });
});

/**
 * IPC: Cancel a running FFmpeg job.
 */
ipcMain.handle('ffmpeg:cancel', async (event, { jobId }) => {
  const proc = activeFFmpegProcesses.get(jobId);
  if (proc) {
    proc.kill('SIGTERM');
    activeFFmpegProcesses.delete(jobId);
    return { cancelled: true };
  }
  return { cancelled: false };
});

/**
 * IPC: Probe a media file for metadata using ffprobe.
 */
ipcMain.handle('ffmpeg:probe', async (event, { filePath }) => {
  const ffprobePath = findFFprobePath();

  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
      ],
      (err, stdout) => {
        if (err) return reject(err);
        try {
          resolve(JSON.parse(stdout));
        } catch (parseErr) {
          reject(parseErr);
        }
      },
    );
  });
});

/**
 * IPC: Check if FFmpeg is available.
 */
ipcMain.handle('ffmpeg:check', async () => {
  const ffmpegPath = findFFmpegPath();
  return new Promise((resolve) => {
    execFile(ffmpegPath, ['-version'], (err, stdout) => {
      if (err) {
        resolve({ available: false, version: null });
      } else {
        const match = stdout.match(/ffmpeg version (\S+)/);
        resolve({ available: true, version: match?.[1] ?? 'unknown' });
      }
    });
  });
});

/**
 * IPC: Show a native save dialog for export.
 */
ipcMain.handle('ffmpeg:save-dialog', async (event, { defaultName, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'output.mp4',
    filters: filters || [
      { name: 'Video', extensions: ['mp4', 'mov', 'webm', 'mkv'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePath;
});

// =============================================================================
// IPC Handlers — AI Background Removal (rembg)
// =============================================================================

/**
 * IPC: Check if rembg is available.
 */
ipcMain.handle('rembg:check', async () => {
  return new Promise((resolve) => {
    execFile('rembg', ['--version'], (err) => {
      resolve(!err);
    });
  });
});

/**
 * IPC: Run rembg on an image file.
 *
 * Args: {
 *   inputPath: string,
 *   alphaMatting: boolean,
 *   foregroundThreshold: number,
 *   backgroundThreshold: number,
 *   outputFormat: 'png' | 'webp',
 * }
 */
ipcMain.handle('rembg:run', async (event, {
  inputPath,
  alphaMatting = true,
  foregroundThreshold = 240,
  backgroundThreshold = 10,
  outputFormat = 'png',
}) => {
  // Output paths
  const dir = path.dirname(inputPath);
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const foregroundPath = path.join(dir, `${baseName}_fg.${outputFormat}`);
  const maskPath = path.join(dir, `${baseName}_mask.${outputFormat}`);

  const args = ['i', inputPath, foregroundPath];

  if (alphaMatting) {
    args.push('-a');
    args.push('-af', String(foregroundThreshold));
    args.push('-ab', String(backgroundThreshold));
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('rembg', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({
          foregroundPath,
          maskPath, // rembg doesn't directly output a mask; we'd need a post-step
        });
      } else {
        reject(new Error(`rembg exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
});

