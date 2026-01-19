/**
 * LayerStack Integration Example
 * 
 * This example shows how to integrate the LayerStack component
 * with the GridEditor and use the layer operations hook.
 */

import React, { useState } from 'react';
import { LayerStack } from './LayerStack';
import { useLayerOperations } from './useLayerOperations';
import { useGridStore } from '../../stores/gridEditorStore';

/**
 * Example: LayerStack integrated with GridEditor
 */
export const LayerStackIntegrationExample: React.FC = () => {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // Get selected panel from store
  const { selectedPanelIds, getPanelById } = useGridStore();
  const selectedPanelId = selectedPanelIds[0] || null;
  const selectedPanel = selectedPanelId ? getPanelById(selectedPanelId) : null;

  // Get layer operations hook
  const {
    handleAddLayer,
    handleDeleteLayer,
    handleToggleVisibility,
    handleToggleLock,
    handleOpacityChange,
    handleReorderLayers,
    handleDuplicateLayer,
  } = useLayerOperations(selectedPanelId);

  return (
    <div className="layer-stack-container">
      <LayerStack
        panel={selectedPanel || null}
        selectedLayerId={selectedLayerId}
        onLayerSelect={setSelectedLayerId}
        onLayerReorder={handleReorderLayers}
        onLayerVisibilityToggle={handleToggleVisibility}
        onLayerLockToggle={handleToggleLock}
        onLayerOpacityChange={handleOpacityChange}
        onLayerDelete={handleDeleteLayer}
        onLayerAdd={handleAddLayer}
        onLayerDuplicate={handleDuplicateLayer}
      />
    </div>
  );
};

/**
 * Example: Programmatic layer management
 */
export const ProgrammaticLayerExample: React.FC = () => {
  const { addLayer, getPanelById } = useGridStore();
  
  const handleAddImageLayer = () => {
    const panel = getPanelById('panel-0-0');
    if (!panel) return;

    // Create and add an image layer
    const imageLayer = {
      id: `layer-${Date.now()}`,
      name: 'My Image',
      type: 'image' as const,
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: 'normal' as const,
      content: {
        type: 'image' as const,
        url: '/path/to/image.jpg',
        naturalWidth: 1920,
        naturalHeight: 1080,
      },
    };

    addLayer(panel.id, imageLayer);
  };

  return (
    <button onClick={handleAddImageLayer}>
      Add Image Layer Programmatically
    </button>
  );
};

/**
 * Example: Layer operations with custom logic
 */
export const CustomLayerOperationsExample: React.FC = () => {
  const {
    updateLayer,
    getPanelById,
    toggleLayerVisibility,
  } = useGridStore();

  const handleBatchVisibilityToggle = (panelId: string) => {
    const panel = getPanelById(panelId);
    if (!panel) return;

    // Toggle visibility for all layers
    panel.layers.forEach(layer => {
      toggleLayerVisibility(panelId, layer.id);
    });
  };

  const handleSetAllOpacity = (panelId: string, opacity: number) => {
    const panel = getPanelById(panelId);
    if (!panel) return;

    // Set opacity for all layers
    panel.layers.forEach(layer => {
      updateLayer(panelId, layer.id, { opacity });
    });
  };

  return (
    <div>
      <button onClick={() => handleBatchVisibilityToggle('panel-0-0')}>
        Toggle All Layers
      </button>
      <button onClick={() => handleSetAllOpacity('panel-0-0', 0.5)}>
        Set All Opacity to 50%
      </button>
    </div>
  );
};

/**
 * Example: Layer filtering and queries
 */
export const LayerQueryExample: React.FC = () => {
  const { getPanelById } = useGridStore();

  const getVisibleLayers = (panelId: string) => {
    const panel = getPanelById(panelId);
    if (!panel) return [];
    return panel.layers.filter(layer => layer.visible);
  };

  const getLockedLayers = (panelId: string) => {
    const panel = getPanelById(panelId);
    if (!panel) return [];
    return panel.layers.filter(layer => layer.locked);
  };

  const getImageLayers = (panelId: string) => {
    const panel = getPanelById(panelId);
    if (!panel) return [];
    return panel.layers.filter(layer => layer.type === 'image');
  };

  const getTopLayer = (panelId: string) => {
    const panel = getPanelById(panelId);
    if (!panel || panel.layers.length === 0) return null;
    return panel.layers[panel.layers.length - 1];
  };

  return (
    <div>
      <p>Visible Layers: {getVisibleLayers('panel-0-0').length}</p>
      <p>Locked Layers: {getLockedLayers('panel-0-0').length}</p>
      <p>Image Layers: {getImageLayers('panel-0-0').length}</p>
      <p>Top Layer: {getTopLayer('panel-0-0')?.name || 'None'}</p>
    </div>
  );
};

/**
 * Example: Complete GridEditor with LayerStack in sidebar
 */
export const CompleteGridEditorExample: React.FC = () => {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const { selectedPanelIds, getPanelById } = useGridStore();
  
  const selectedPanelId = selectedPanelIds[0] || null;
  const selectedPanel = selectedPanelId ? getPanelById(selectedPanelId) : null;

  const {
    handleAddLayer,
    handleDeleteLayer,
    handleToggleVisibility,
    handleToggleLock,
    handleOpacityChange,
    handleReorderLayers,
    handleDuplicateLayer,
  } = useLayerOperations(selectedPanelId);

  return (
    <div className="grid-editor-layout">
      {/* Main canvas area */}
      <div className="grid-editor-canvas">
        {/* GridRenderer and InteractionLayer would go here */}
      </div>

      {/* Right sidebar with properties and layers */}
      <div className="grid-editor-sidebar">
        {/* Properties Panel */}
        <div className="properties-section">
          <h3>Properties</h3>
          {selectedPanel && (
            <div>
              <p>Panel: {selectedPanel.id}</p>
              <p>Layers: {selectedPanel.layers.length}</p>
            </div>
          )}
        </div>

        {/* Layer Stack */}
        <div className="layers-section">
          <LayerStack
            panel={selectedPanel || null}
            selectedLayerId={selectedLayerId}
            onLayerSelect={setSelectedLayerId}
            onLayerReorder={handleReorderLayers}
            onLayerVisibilityToggle={handleToggleVisibility}
            onLayerLockToggle={handleToggleLock}
            onLayerOpacityChange={handleOpacityChange}
            onLayerDelete={handleDeleteLayer}
            onLayerAdd={handleAddLayer}
            onLayerDuplicate={handleDuplicateLayer}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * CSS for the complete example (for documentation purposes)
 */
const _styles = `
  .grid-editor-layout {
    display: flex;
    height: 100vh;
    width: 100vw;
  }

  .grid-editor-canvas {
    flex: 1;
    background: #f5f5f5;
  }

  .grid-editor-sidebar {
    width: 300px;
    background: white;
    border-left: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
  }

  .properties-section {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  .layers-section {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .layer-stack-container {
    height: 100%;
  }
`;
