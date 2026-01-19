import { modelDownloadState, missingModelsState, updateMissingModelsState } from './state.js';
import { $, showNotification, hideModal, populateModelsList } from './ui.js';

// Check for missing models
export function checkMissingModels() {
    // DEMO: simulate missing models detection (30% chance)
    const requiredModels = modelDownloadState.models;
    const missingModels = requiredModels.filter(() => Math.random() > 0.7);
    
    if (missingModels.length > 0) {
        updateMissingModelsState(true, missingModels);
        showMissingModelsBanner(missingModels);
    }
}

function showMissingModelsBanner(missingModels) {
    const banner = $('missingModelsBanner');
    const modelsList = $('missingModelsList');
    
    if (!banner || !modelsList) return;
    
    modelsList.innerHTML = missingModels.map(model => 
        `<div class="flex justify-between items-center py-1">
            <span>❌ ${model.name}</span>
            <span class="text-xs text-yellow-300">${model.size}</span>
        </div>`
    ).join('');
    
    banner.classList.remove('hidden');
}

export function dismissMissingModelsBanner() {
    const banner = $('missingModelsBanner');
    if (banner) banner.classList.add('hidden');
}

export function toggleModelInfo() {
    const panel = $('modelInfoPanel');
    if (panel) panel.classList.toggle('hidden');
}

// Set download mode
export function setDownloadMode(mode) {
    modelDownloadState.mode = mode;
    const manualSection = $('manualPathSection');
    const automaticPath = $('automaticPath');
    
    if (mode === 'manual') {
        if (manualSection) manualSection.classList.remove('hidden');
        if (automaticPath) automaticPath.classList.add('hidden');
    } else {
        if (manualSection) manualSection.classList.add('hidden');
        if (automaticPath) automaticPath.classList.remove('hidden');
    }
}

// Select manual path
export async function selectManualPath() {
    try {
        // @ts-ignore - File System Access API
        const dirHandle = await window.showDirectoryPicker();
        modelDownloadState.targetPath = dirHandle.name;
        const selectedPath = $('selectedPath');
        if (selectedPath) selectedPath.textContent = dirHandle.name;
    } catch (error) {
        if (error.name !== 'AbortError') {
            showNotification('Folder selection not supported. Please use automatic mode or update your browser.', 'error');
        }
    }
}

// Start model download
export async function startModelDownload() {
    if (modelDownloadState.isDownloading) return;
    
    modelDownloadState.isDownloading = true;
    const progressSection = $('downloadProgressMain');
    const startBtn = $('startDownloadBtnMain');
    
    if (progressSection) progressSection.classList.remove('hidden');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'Downloading...';
    }
    
    try {
        await downloadModelsSequentially();
        
        // Validate models after download
        const validationResult = await validateDownloadedModels();
        
        if (validationResult.allValid) {
            showDownloadComplete();
            enableModelDependentFeatures();
        } else {
            // Trigger automatic fallback
            await triggerAutomaticFallback(validationResult.missingModels);
        }
    } catch (error) {
        showDownloadError(error.message);
    } finally {
        modelDownloadState.isDownloading = false;
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Download';
        }
    }
}

async function downloadModelsSequentially() {
    const totalModels = modelDownloadState.models.length;
    
    for (let i = 0; i < totalModels; i++) {
        const model = modelDownloadState.models[i];
        modelDownloadState.currentModel = model.name;
        
        // Update progress
        const progress = (i / totalModels) * 100;
        modelDownloadState.progress = progress;
        updateProgressUI();
        
        // Check UNC path permissions for automatic mode
        if (modelDownloadState.mode === 'automatic') {
            await checkUNCPermissions();
        }
        
        // DEMO: simulate download - replace with real implementation
        await simulateModelDownload(model);
        
        // Update progress to show completion of current model
        modelDownloadState.progress = ((i + 1) / totalModels) * 100;
        updateProgressUI();
    }
}

async function checkUNCPermissions() {
    // DEMO: simulate UNC path permission check
    const hasPermission = Math.random() > 0.2; // 80% success rate for demo
    
    if (!hasPermission) {
        throw new Error(`UNC Path Access Denied: Cannot write to ${modelDownloadState.targetPath}. Please run as administrator or use manual mode.`);
    }
}

// DEMO: simulate download - replace with real implementation
async function simulateModelDownload(model) {
    // Simulate download time based on model size
    const downloadTime = model.size.includes('GB') ? 3000 : 
                       model.size.includes('MB') && parseInt(model.size) > 500 ? 2000 : 1000;
    
    await new Promise(resolve => setTimeout(resolve, downloadTime));
    
    // Simulate occasional download failure
    if (Math.random() < 0.1) {
        throw new Error(`Failed to download ${model.name}: Network timeout`);
    }
}

function updateProgressUI() {
    const progressBar = $('progressBarMain');
    const progressText = $('progressTextMain');
    const currentModelText = $('currentModelMain');
    
    if (progressBar) progressBar.style.width = `${modelDownloadState.progress}%`;
    if (progressText) progressText.textContent = `${Math.round(modelDownloadState.progress)}%`;
    if (currentModelText) currentModelText.textContent = `Downloading: ${modelDownloadState.currentModel}`;
}

async function validateDownloadedModels() {
    // DEMO: simulate model validation (20% chance of missing models)
    const missingModels = Math.random() < 0.2 ? [modelDownloadState.models[0]] : [];
    
    return {
        allValid: missingModels.length === 0,
        missingModels: missingModels
    };
}

async function triggerAutomaticFallback(missingModels) {
    const downloadStatus = $('downloadStatusMain');
    if (!downloadStatus) return;
    
    downloadStatus.innerHTML = `
        <div class="bg-yellow-900 border border-yellow-600 rounded p-3 mb-3">
            <div class="text-yellow-200 font-semibold mb-2">⚠️ Some Models Missing</div>
            <div class="text-yellow-100 text-sm mb-3">
                Missing: ${missingModels.map(m => m.name).join(', ')}
            </div>
            <div class="text-yellow-100 text-sm mb-3">
                Activating fallback: ComfyUI Manager + Workflow Models Downloader
            </div>
            <button onclick="window.launchFallbackSolution()" 
                    class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium mr-2">
                🔧 Launch Fallback (2 clicks)
            </button>
            <button onclick="window.skipFallback()" 
                    class="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded text-sm">
                Skip
            </button>
        </div>
    `;
}

function showDownloadComplete() {
    const downloadStatus = $('downloadStatusMain');
    if (downloadStatus) {
        downloadStatus.innerHTML = `
            <div class="text-green-400 font-semibold">✅ Download Complete!</div>
            <div class="text-xs mt-1">All models downloaded successfully to ${modelDownloadState.mode} location.</div>
        `;
    }
}

function showDownloadError(errorMessage) {
    const downloadStatus = $('downloadStatusMain');
    if (downloadStatus) {
        downloadStatus.innerHTML = `
            <div class="text-red-400 font-semibold">❌ Download Failed</div>
            <div class="text-xs mt-1 text-red-300">${errorMessage}</div>
            <button onclick="window.retryDownload()" class="mt-2 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs">
                Retry Download
            </button>
        `;
    }
}

function enableModelDependentFeatures() {
    // Enable features that depend on models being available
    const modelsBtn = $('openModelDownloadBtn');
    if (modelsBtn) {
        modelsBtn.innerHTML = `
            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Models Ready</span>
        `;
        modelsBtn.classList.remove('bg-orange-600', 'hover:bg-orange-700');
        modelsBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    }
}

// Auto-fix missing models
export async function autoFixModels() {
    try {
        // Launch ComfyUI Manager
        const managerUrl = 'http://127.0.0.1:8188/?tab=manager&action=install_models';
        window.open(managerUrl, '_blank');
        
        showNotification('🔧 ComfyUI Manager opened. Follow the auto-fix workflow.', 'info');
        
        // Set up refresh callback
        const interval = setInterval(async () => {
            const available = await checkModelsAvailable();
            if (available) {
                clearInterval(interval);
                dismissMissingModelsBanner();
                showNotification('✅ All models detected! Dashboard refreshed.', 'success');
            }
        }, 10000);

        setTimeout(() => clearInterval(interval), 300000);
        
    } catch (error) {
        console.error('Auto-fix failed:', error);
        showNotification('Auto-fix failed. Please try manual installation.', 'error');
    }
}

async function checkModelsAvailable() {
    try {
        // DEMO: simulate model availability check
        return Math.random() > 0.7; // 30% chance of completion per check
    } catch {
        return false;
    }
}

// Global functions for fallback (temporary until full modularization)
window.launchFallbackSolution = async function() {
    showNotification('🔧 Launching ComfyUI Manager fallback...', 'info');
    const managerUrl = 'http://127.0.0.1:8188/?workflow=storycore_flux2&auto_download=true';
    window.open(managerUrl, '_blank', 'width=1200,height=800');
};

window.skipFallback = function() {
    const downloadStatus = $('downloadStatusMain');
    if (downloadStatus) {
        downloadStatus.innerHTML = `
            <div class="text-gray-400 font-semibold">⏭️ Fallback Skipped</div>
            <div class="text-xs mt-1">You can manually install missing models later</div>
        `;
    }
};

window.retryDownload = function() {
    modelDownloadState.progress = 0;
    modelDownloadState.currentModel = '';
    const downloadStatus = $('downloadStatusMain');
    if (downloadStatus) downloadStatus.innerHTML = '';
    startModelDownload();
};
