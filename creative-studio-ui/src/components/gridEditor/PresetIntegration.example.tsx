/**
 * Preset System Integration Example
 * 
 * Demonstrates how to integrate the preset system into the grid editor.
 * Shows preset panel usage, custom preset creation, and preset application.
 */

import React, { useState } from 'react';
import { PresetPanel } from './PresetPanel';
import { usePresetStore, createPresetFromPanels } from '../../stores/gridEditor/presetStore';
import { useGridEditorStore } from '../../stores/gridEditorStore';
import './PresetPanel.css';

/**
 * Example 1: Basic Preset Panel Integration
 * 
 * Shows how to add the preset panel to your grid editor UI
 */
export const BasicPresetPanelExample: React.FC = () => {
  const [showPresets, setShowPresets] = useState(false);

  return (
    <div className="grid-editor-container">
      <div className="toolbar">
        <button onClick={() => setShowPresets(!showPresets)}>
          {showPresets ? 'Hide' : 'Show'} Presets
        </button>
      </div>

      {showPresets && (
        <div className="preset-sidebar">
          <PresetPanel onClose={() => setShowPresets(false)} />
        </div>
      )}

      <div className="grid-canvas">
        {/* Your grid editor canvas here */}
        <p>Grid Editor Canvas</p>
      </div>
    </div>
  );
};

/**
 * Example 2: Programmatic Preset Application
 * 
 * Shows how to apply presets programmatically
 */
export const ProgrammaticPresetExample: React.FC = () => {
  const { getPresetById } = usePresetStore();
  const { applyPreset } = useGridEditorStore();

  const applyDefaultPreset = () => {
    const preset = getPresetById('preset-default');
    if (preset) {
      applyPreset(preset);
      console.log('Applied default preset');
    }
  };

  const applyCinematicPreset = () => {
    const preset = getPresetById('preset-cinematic');
    if (preset) {
      applyPreset(preset);
      console.log('Applied cinematic preset');
    }
  };

  const applyComicPreset = () => {
    const preset = getPresetById('preset-comic');
    if (preset) {
      applyPreset(preset);
      console.log('Applied comic preset');
    }
  };

  return (
    <div className="preset-controls">
      <h3>Quick Preset Application</h3>
      <div className="button-group">
        <button onClick={applyDefaultPreset}>Default</button>
        <button onClick={applyCinematicPreset}>Cinematic</button>
        <button onClick={applyComicPreset}>Comic Book</button>
      </div>
    </div>
  );
};

/**
 * Example 3: Custom Preset Creation
 * 
 * Shows how to create and save custom presets from current configuration
 */
export const CustomPresetCreationExample: React.FC = () => {
  const { addCustomPreset } = usePresetStore();
  const { panels } = useGridEditorStore();
  const [presetName, setPresetName] = useState('');

  const saveCurrentAsPreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    const presetData = createPresetFromPanels(
      presetName,
      'Custom preset created from current configuration',
      panels.map(p => ({ transform: p.transform, crop: p.crop }))
    );

    const presetId = addCustomPreset(presetData);
    console.log('Created custom preset:', presetId);
    setPresetName('');
  };

  return (
    <div className="custom-preset-creator">
      <h3>Save Current Configuration</h3>
      <input
        type="text"
        value={presetName}
        onChange={(e) => setPresetName(e.target.value)}
        placeholder="Enter preset name..."
      />
      <button onClick={saveCurrentAsPreset}>Save as Preset</button>
    </div>
  );
};

/**
 * Example 4: Preset List with Preview
 * 
 * Shows how to display all presets with custom rendering
 */
export const PresetListExample: React.FC = () => {
  const { getAllPresets, selectPreset, selectedPresetId } = usePresetStore();
  const { applyPreset } = useGridEditorStore();
  const allPresets = getAllPresets();

  const handlePresetClick = (presetId: string) => {
    const preset = allPresets.find(p => p.id === presetId);
    if (preset) {
      selectPreset(presetId);
      applyPreset(preset);
    }
  };

  return (
    <div className="preset-list">
      <h3>Available Presets</h3>
      <ul>
        {allPresets.map((preset) => (
          <li
            key={preset.id}
            className={selectedPresetId === preset.id ? 'selected' : ''}
            onClick={() => handlePresetClick(preset.id)}
          >
            <strong>{preset.name}</strong>
            <p>{preset.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Example 5: Complete Integration
 * 
 * Full example showing all preset features integrated
 */
export const CompletePresetIntegrationExample: React.FC = () => {
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const { getAllPresets, selectedPresetId } = usePresetStore();
  const { applyPreset } = useGridEditorStore();

  const quickApplyPreset = (presetId: string) => {
    const preset = getAllPresets().find(p => p.id === presetId);
    if (preset) {
      applyPreset(preset);
    }
  };

  return (
    <div className="complete-preset-integration">
      {/* Main toolbar with preset button */}
      <div className="main-toolbar">
        <button onClick={() => setShowPresetPanel(!showPresetPanel)}>
          📐 Presets
        </button>
        
        {/* Quick preset buttons */}
        <div className="quick-presets">
          <button onClick={() => quickApplyPreset('preset-cinematic')}>
            🎬 Cinematic
          </button>
          <button onClick={() => quickApplyPreset('preset-comic')}>
            📚 Comic
          </button>
          <button onClick={() => quickApplyPreset('preset-portrait')}>
            🖼️ Portrait
          </button>
          <button onClick={() => quickApplyPreset('preset-landscape')}>
            🏞️ Landscape
          </button>
        </div>
      </div>

      {/* Grid editor layout */}
      <div className="editor-layout">
        {/* Preset panel sidebar */}
        {showPresetPanel && (
          <aside className="preset-sidebar">
            <PresetPanel onClose={() => setShowPresetPanel(false)} />
          </aside>
        )}

        {/* Main canvas */}
        <main className="canvas-area">
          <div className="canvas-header">
            {selectedPresetId && (
              <div className="active-preset-indicator">
                Active Preset: {getAllPresets().find(p => p.id === selectedPresetId)?.name}
              </div>
            )}
          </div>
          <div className="grid-canvas">
            {/* Your grid editor canvas component here */}
            <p>Grid Editor Canvas</p>
          </div>
        </main>
      </div>
    </div>
  );
};

/**
 * Example 6: Preset with Backend Integration
 * 
 * Shows how to integrate presets with backend generation
 */
export const PresetBackendIntegrationExample: React.FC = () => {
  const { getPresetById } = usePresetStore();
  const { applyPreset, panels } = useGridEditorStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const applyPresetAndGenerate = async (presetId: string) => {
    const preset = getPresetById(presetId);
    if (!preset) return;

    // Apply preset
    applyPreset(preset);

    // Trigger backend generation with preset parameters
    setIsGenerating(true);
    try {
      // Example: Send preset style parameters to backend
      const response = await fetch('/api/generate-with-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetId: preset.id,
          presetName: preset.name,
          panels: panels.map((panel, index) => ({
            panelId: panel.id,
            transform: preset.panelTransforms[index],
            crop: preset.panelCrops[index],
          })),
        }),
      });

      const result = await response.json();
      console.log('Generation complete:', result);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="preset-backend-integration">
      <h3>Apply Preset & Generate</h3>
      <div className="preset-actions">
        <button
          onClick={() => applyPresetAndGenerate('preset-cinematic')}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Cinematic + Generate'}
        </button>
        <button
          onClick={() => applyPresetAndGenerate('preset-comic')}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Comic + Generate'}
        </button>
      </div>
    </div>
  );
};

// Example CSS for integration
const exampleStyles = `
.grid-editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.toolbar {
  padding: 1rem;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
}

.editor-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.preset-sidebar {
  width: 300px;
  border-right: 1px solid #333;
  overflow-y: auto;
}

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.canvas-header {
  padding: 0.5rem 1rem;
  background: #1e1e1e;
  border-bottom: 1px solid #333;
}

.active-preset-indicator {
  font-size: 0.875rem;
  color: #007bff;
}

.grid-canvas {
  flex: 1;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-presets {
  display: inline-flex;
  gap: 0.5rem;
  margin-left: 1rem;
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

button:hover {
  background: #0056b3;
}

button:disabled {
  background: #555;
  cursor: not-allowed;
}
`;

console.log('Example styles:', exampleStyles);
