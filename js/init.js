import * as UI from './ui.js';
import * as Models from './models.js';
import * as Backend from './backend.js';
import { modelDownloadState, setProcessing } from './state.js';

// Main initialization function
export function init() {
    // Initialize UI components
    UI.generateMasterGrid();
    UI.updatePanelDetails();
    UI.populateModelsList(modelDownloadState.models);
    
    // Initialize backend
    Backend.updateBackendStatus();
    Backend.initBackendConfig();
    
    // Check for missing models after a delay
    setTimeout(Models.checkMissingModels, 2000);
    
    // Attach event listeners
    attachEventListeners();
}

function attachEventListeners() {
    // Slider event listeners
    const denoisingSlider = UI.$('denoisingSlider');
    const sharpenSlider = UI.$('sharpenSlider');
    
    if (denoisingSlider) {
        denoisingSlider.addEventListener('input', () => {
            UI.updateSliderValue('denoisingSlider', 'denoisingValue');
        });
    }
    
    if (sharpenSlider) {
        sharpenSlider.addEventListener('input', () => {
            UI.updateSliderValue('sharpenSlider', 'sharpenValue');
        });
    }
    
    // Manual re-promote button
    const rePromoteBtn = UI.$('manualRePromoteBtn');
    if (rePromoteBtn) {
        rePromoteBtn.addEventListener('click', handleManualRePromote);
    }
    
    // Backend configuration
    const configureBackendBtn = UI.$('configureBackendBtn');
    if (configureBackendBtn) {
        configureBackendBtn.addEventListener('click', () => UI.showModal('backendModal'));
    }
    
    const closeBackendModalBtn = UI.$('closeBackendModalBtn');
    if (closeBackendModalBtn) {
        closeBackendModalBtn.addEventListener('click', () => UI.hideModal('backendModal'));
    }
    
    const cancelBackendBtn = UI.$('cancelBackendBtn');
    if (cancelBackendBtn) {
        cancelBackendBtn.addEventListener('click', () => UI.hideModal('backendModal'));
    }
    
    const testConnectionBtn = UI.$('testConnectionBtn');
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', Backend.handleTestConnection);
    }
    
    const saveBackendBtn = UI.$('saveBackendBtn');
    if (saveBackendBtn) {
        saveBackendBtn.addEventListener('click', Backend.saveBackendConfig);
    }
    
    // Model download modal
    const openModelDownloadBtn = UI.$('openModelDownloadBtn');
    if (openModelDownloadBtn) {
        openModelDownloadBtn.addEventListener('click', () => UI.showModal('modelDownloadModal'));
    }
    
    const closeModelDownloadBtn = UI.$('closeModelDownloadBtn');
    if (closeModelDownloadBtn) {
        closeModelDownloadBtn.addEventListener('click', () => UI.hideModal('modelDownloadModal'));
    }
    
    const cancelDownloadBtn = UI.$('cancelDownloadBtn');
    if (cancelDownloadBtn) {
        cancelDownloadBtn.addEventListener('click', () => UI.hideModal('modelDownloadModal'));
    }
    
    const startDownloadBtnMain = UI.$('startDownloadBtnMain');
    if (startDownloadBtnMain) {
        startDownloadBtnMain.addEventListener('click', Models.startModelDownload);
    }
    
    // Download mode radio buttons
    const downloadModeRadios = document.querySelectorAll('input[name="downloadMode"]');
    downloadModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            Models.setDownloadMode(e.target.value);
        });
    });
    
    const selectFolderBtn = UI.$('selectFolderBtn');
    if (selectFolderBtn) {
        selectFolderBtn.addEventListener('click', Models.selectManualPath);
    }
    
    // Missing models banner
    const dismissMissingBannerBtn = UI.$('dismissMissingBannerBtn');
    if (dismissMissingBannerBtn) {
        dismissMissingBannerBtn.addEventListener('click', Models.dismissMissingModelsBanner);
    }
    
    const toggleModelInfoBtn = UI.$('toggleModelInfoBtn');
    if (toggleModelInfoBtn) {
        toggleModelInfoBtn.addEventListener('click', Models.toggleModelInfo);
    }
    
    const autoFixModelsBtn = UI.$('autoFixModelsBtn');
    if (autoFixModelsBtn) {
        autoFixModelsBtn.addEventListener('click', Models.autoFixModels);
    }
    
    // Image upload
    const beforeImageInput = UI.$('beforeImageInput');
    if (beforeImageInput) {
        beforeImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                UI.handleImageUpload(file, 'beforePanel');
                // DEMO: simulate processing after image upload
                simulateProcessing();
            }
        });
    }
    
    // Export project (global function for now)
    window.exportProject = function() {
        UI.showNotification('Project exported successfully!', 'success');
        // DEMO: simulate export - replace with real implementation
        console.log('Exporting project...');
    };
}

function handleManualRePromote() {
    if (modelDownloadState.isDownloading) {
        UI.showNotification('Cannot re-promote while downloading models', 'error');
        return;
    }
    
    setProcessing(true);
    UI.showNotification('Starting manual re-promotion...', 'info');
    
    // DEMO: simulate processing - replace with real implementation
    simulateProcessing();
}

function simulateProcessing() {
    const afterPanel = UI.$('afterPanel');
    if (!afterPanel) return;
    
    // Show processing state
    afterPanel.innerHTML = `
        <div class="processing-overlay absolute inset-0 flex items-center justify-center">
            <div class="text-center">
                <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <div class="text-sm text-gray-300">Processing...</div>
            </div>
        </div>
    `;
    
    // DEMO: simulate completion after 3 seconds
    setTimeout(() => {
        afterPanel.innerHTML = `
            <div class="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 rounded flex items-center justify-center">
                <div class="text-center text-white">
                    <div class="text-lg font-semibold mb-1">✨ Promoted</div>
                    <div class="text-xs opacity-75">DEMO Result</div>
                </div>
            </div>
        `;
        
        // Update sharpness values
        const afterSharpness = UI.$('afterSharpness');
        const afterSize = UI.$('afterSize');
        if (afterSharpness) afterSharpness.textContent = '142.3';
        if (afterSize) afterSize.textContent = '1024x1024';
        
        setProcessing(false);
        UI.showNotification('Processing completed successfully!', 'success');
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
