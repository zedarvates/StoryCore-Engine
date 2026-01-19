// Global state management for StoryCore Dashboard
export const panels = [
    { id: 'panel_01', status: 'ok', sharpness: 112.4 },
    { id: 'panel_02', status: 'auto_fixed', sharpness: 89.2, initial_sharpness: 67.8, improvement_delta: 21.4 },
    { id: 'panel_03', status: 'ok', sharpness: 134.7 },
    { id: 'panel_04', status: 'processing', sharpness: 0 },
    { id: 'panel_05', status: 'ok', sharpness: 98.3 },
    { id: 'panel_06', status: 'auto_fixed', sharpness: 156.9, initial_sharpness: 78.2, improvement_delta: 78.7 },
    { id: 'panel_07', status: 'ok', sharpness: 142.1 },
    { id: 'panel_08', status: 'ok', sharpness: 167.8 },
    { id: 'panel_09', status: 'ok', sharpness: 129.5 }
];

export let backendUrl = localStorage.getItem('storycore_backend_base_url') || '';
export let isProcessing = false;
export let selectedPanel = 'panel_01';

// Unified model download state
export const modelDownloadState = {
    isDownloading: false,
    progress: 0,
    currentModel: '',
    mode: 'automatic',
    targetPath: '\\\\wsl.localhost\\Ubuntu\\home\\redga\\projects\\storycore-engine\\comfyui_portable\\ComfyUI\\models',
    models: [
        { 
            name: 'flux2-vae.safetensors', 
            url: 'https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors', 
            subfolder: 'vae', 
            size: '335MB' 
        },
        { 
            name: 'flux2_berthe_morisot.safetensors', 
            url: 'https://huggingface.co/ostris/flux2_berthe_morisot/resolve/main/flux2_berthe_morisot.safetensors', 
            subfolder: 'loras', 
            size: '100MB' 
        },
        { 
            name: 'flux2_dev_fp8mixed.safetensors', 
            url: 'https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/diffusion_models/flux2_dev_fp8mixed.safetensors', 
            subfolder: 'checkpoints', 
            size: '3.5GB' 
        },
        { 
            name: 'mistral_3_small_flux2_bf16.safetensors', 
            url: 'https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/text_encoders/mistral_3_small_flux2_bf16.safetensors', 
            subfolder: 'clip', 
            size: '7.2GB' 
        }
    ]
};

export let missingModelsState = { 
    detected: false, 
    models: [] 
};

// State update functions
export function setBackendUrl(url) {
    backendUrl = url;
    localStorage.setItem('storycore_backend_base_url', url);
}

export function setSelectedPanel(panelId) {
    selectedPanel = panelId;
}

export function setProcessing(processing) {
    isProcessing = processing;
}

export function updateMissingModelsState(detected, models = []) {
    missingModelsState.detected = detected;
    missingModelsState.models = models;
}
