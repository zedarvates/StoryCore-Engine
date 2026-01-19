import { backendUrl, setBackendUrl } from './state.js';
import { $, showNotification, hideModal } from './ui.js';

// Update backend status
export function updateBackendStatus() {
    const statusEl = $('backendStatus');
    if (!statusEl) return;
    
    if (backendUrl) {
        testConnection().then(isConnected => {
            if (isConnected) {
                statusEl.innerHTML = '<span class="text-green-400">● Connected</span>';
            } else {
                statusEl.innerHTML = '<span class="text-red-400">● Disconnected</span>';
            }
        });
    } else {
        statusEl.innerHTML = '<span class="text-gray-400">● Not Configured</span>';
    }
}

// Test connection to backend
export async function testConnection(url = backendUrl) {
    if (!url) return false;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${url}/system_stats`, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.log('Backend connection test failed:', error.message);
        return false;
    }
}

// Save backend configuration
export function saveBackendConfig() {
    const urlInput = $('customUrlInput');
    if (!urlInput) return;
    
    const newUrl = urlInput.value.trim();
    if (!newUrl) {
        showNotification('Please enter a valid URL', 'error');
        return;
    }
    
    // Test connection before saving
    testConnection(newUrl).then(isConnected => {
        if (isConnected) {
            setBackendUrl(newUrl);
            updateBackendStatus();
            hideModal('backendModal');
            showNotification('Backend configuration saved successfully', 'success');
        } else {
            showNotification('Cannot connect to the specified URL', 'error');
        }
    });
}

// Test connection button handler
export function handleTestConnection() {
    const urlInput = $('customUrlInput');
    if (!urlInput) return;
    
    const testUrl = urlInput.value.trim();
    if (!testUrl) {
        showNotification('Please enter a URL to test', 'error');
        return;
    }
    
    const testBtn = $('testConnectionBtn');
    if (testBtn) {
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
    }
    
    testConnection(testUrl).then(isConnected => {
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.textContent = 'Test Connection';
        }
        
        if (isConnected) {
            showNotification('Connection successful!', 'success');
        } else {
            showNotification('Connection failed. Check URL and ensure ComfyUI is running.', 'error');
        }
    });
}

// Launch ComfyUI
export function launchComfyUI() {
    const instructions = `
To launch ComfyUI:

1. Open terminal/command prompt
2. Navigate to ComfyUI directory:
   cd ./comfyui_portable/ComfyUI

3. Activate virtual environment:
   Linux/macOS: source venv/bin/activate
   Windows: venv\\Scripts\\activate

4. Start ComfyUI:
   python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header

5. Open http://127.0.0.1:8188 in your browser

6. Return to this dashboard and configure backend URL
    `.trim();
    
    showNotification('ComfyUI launch instructions copied to clipboard', 'info');
    
    // Try to copy to clipboard
    if (navigator.clipboard) {
        navigator.clipboard.writeText(instructions).catch(() => {
            // Fallback: show in alert
            alert(instructions);
        });
    } else {
        alert(instructions);
    }
}

// Initialize backend configuration
export function initBackendConfig() {
    const urlInput = $('customUrlInput');
    if (urlInput && backendUrl) {
        urlInput.value = backendUrl;
    }
}
