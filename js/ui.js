import { panels, selectedPanel, setSelectedPanel } from './state.js';

// DOM helper
export const $ = id => document.getElementById(id);

// Generate the master grid
export function generateMasterGrid() {
    const grid = $('masterGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    panels.forEach(panel => {
        const panelDiv = document.createElement('div');
        panelDiv.className = `aspect-square bg-gray-700 rounded border-2 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-center p-2 ${
            panel.id === selectedPanel ? 'border-blue-500 bg-gray-600' : 'border-gray-600 hover:border-gray-500'
        }`;
        panelDiv.onclick = () => selectPanel(panel.id);
        
        // Status badge
        let statusBadge = '';
        if (panel.status === 'ok') {
            statusBadge = '<div class="w-2 h-2 bg-green-400 rounded-full mb-1"></div>';
        } else if (panel.status === 'auto_fixed') {
            statusBadge = '<div class="w-2 h-2 bg-orange-400 rounded-full mb-1"></div>';
        } else if (panel.status === 'processing') {
            statusBadge = '<div class="w-2 h-2 bg-blue-400 rounded-full mb-1 animate-pulse"></div>';
        }
        
        panelDiv.innerHTML = `
            ${statusBadge}
            <div class="text-xs font-medium text-gray-300">${panel.id}</div>
            <div class="text-xs text-gray-400 mt-1">
                ${panel.status === 'processing' ? 'Processing...' : `${panel.sharpness}`}
            </div>
        `;
        
        grid.appendChild(panelDiv);
    });
}

// Select a panel
function selectPanel(panelId) {
    setSelectedPanel(panelId);
    generateMasterGrid();
    updatePanelDetails();
}

// Update panel details in sidebar
export function updatePanelDetails() {
    const panel = panels.find(p => p.id === selectedPanel);
    if (!panel) return;
    
    const selectedPanelEl = $('selectedPanelId');
    const panelStatusEl = $('panelStatus');
    const panelSharpnessEl = $('panelSharpness');
    
    if (selectedPanelEl) selectedPanelEl.textContent = panel.id;
    
    if (panelStatusEl) {
        if (panel.status === 'ok') {
            panelStatusEl.innerHTML = '<span class="text-green-400">✓ OK</span>';
        } else if (panel.status === 'auto_fixed') {
            panelStatusEl.innerHTML = '<span class="text-orange-400">🔧 Auto-Fixed</span>';
        } else if (panel.status === 'processing') {
            panelStatusEl.innerHTML = '<span class="text-blue-400">⏳ Processing</span>';
        }
    }
    
    if (panelSharpnessEl) {
        panelSharpnessEl.textContent = panel.status === 'processing' ? '--' : panel.sharpness.toString();
    }
}

// Show/hide modals
export function showModal(modalId) {
    const modal = $(modalId);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

export function hideModal(modalId) {
    const modal = $(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// Show notifications
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-green-600' : 
        type === 'error' ? 'bg-red-600' : 'bg-blue-600'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Update slider values
export function updateSliderValue(sliderId, valueId) {
    const slider = $(sliderId);
    const valueEl = $(valueId);
    if (slider && valueEl) {
        valueEl.textContent = slider.value;
    }
}

// Handle image upload
export function handleImageUpload(file, targetElementId) {
    if (!file || !file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const targetEl = $(targetElementId);
        if (targetEl) {
            targetEl.innerHTML = `<img src="${e.target.result}" alt="Uploaded image" class="w-full h-full object-cover rounded">`;
            
            // Update image info
            const beforeSharpness = $('beforeSharpness');
            const beforeSize = $('beforeSize');
            if (beforeSharpness) beforeSharpness.textContent = '89.2'; // DEMO: simulated value
            if (beforeSize) beforeSize.textContent = '512x512';
        }
    };
    reader.readAsDataURL(file);
}

// Populate models list
export function populateModelsList(models) {
    const modelsList = $('modelsList');
    if (!modelsList) return;
    
    modelsList.innerHTML = '';
    models.forEach(model => {
        const modelDiv = document.createElement('div');
        modelDiv.className = 'flex justify-between items-center p-2 bg-gray-700 rounded text-sm';
        modelDiv.innerHTML = `
            <div>
                <div class="font-medium">${model.name}</div>
                <div class="text-xs text-gray-400">${model.subfolder} → models/${model.subfolder}/</div>
            </div>
            <div class="text-gray-300">${model.size}</div>
        `;
        modelsList.appendChild(modelDiv);
    });
}
