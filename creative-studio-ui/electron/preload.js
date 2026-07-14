/**
 * Electron Preload Script
 *
 * Exposes safe IPC methods to the renderer process via window.electronAPI.
 * Even though contextIsolation is currently false, this preload script
 * provides a clean API abstraction for future migration to context isolation.
 */

const { ipcRenderer } = require('electron');

// Expose electronAPI to the renderer
window.electronAPI = {
    // ==========================================================================
    // FFmpeg
    // ==========================================================================

    /** Check if FFmpeg is installed and get version */
    checkFFmpeg: () => ipcRenderer.invoke('ffmpeg:check'),

    /** Run an FFmpeg command */
    runFFmpeg: (args) => ipcRenderer.invoke('ffmpeg:run', args),

    /** Cancel a running FFmpeg job */
    cancelFFmpeg: (jobId) => ipcRenderer.invoke('ffmpeg:cancel', { jobId }),

    /** Probe a media file for metadata */
    probeMedia: (filePath) => ipcRenderer.invoke('ffmpeg:probe', { filePath }),

    /** Show native save dialog for export */
    showSaveDialog: (options) => ipcRenderer.invoke('ffmpeg:save-dialog', options),

    /** Generate a thumbnail from a video file */
    generateThumbnail: (filePath, time, width, height) => 
        ipcRenderer.invoke('ffmpeg:thumbnail', { filePath, time, width, height }),

    /** Listen for FFmpeg progress events */
    onFFmpegProgress: (callback) => {
        ipcRenderer.on('ffmpeg:progress', (event, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('ffmpeg:progress');
    },

    // ==========================================================================
    // AI Background Removal (rembg)
    // ==========================================================================

    /** Check if rembg is available */
    checkRembg: () => ipcRenderer.invoke('rembg:check'),

    /** Run rembg background removal on an image */
    runRembg: (options) => ipcRenderer.invoke('rembg:run', options),
    // ==========================================================================
    // ComfyUI integration
    // ==========================================================================

    comfyui: {
        getServiceStatus: (url) => ipcRenderer.invoke('comfyui:get-service-status', url),
        executeWorkflow: (request) => ipcRenderer.invoke('comfyui:execute-workflow', request),
        getQueueStatus: () => ipcRenderer.invoke('comfyui:get-queue-status'),
        uploadMedia: (filePath, filename) => ipcRenderer.invoke('comfyui:upload-media', filePath, filename),
        downloadOutput: (filename, outputPath) => ipcRenderer.invoke('comfyui:download-output', filename, outputPath),
        getConfig: () => ipcRenderer.invoke('comfyui:get-config'),
        updateConfig: (config) => ipcRenderer.invoke('comfyui:update-config', config),
        testConnection: () => ipcRenderer.invoke('comfyui:test-connection'),
    },
};
