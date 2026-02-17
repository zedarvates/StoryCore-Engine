/**
 * Sequence Editor - Main Component
 *
 * Professional-grade sequence editing interface for StoryCore-Engine
 * Requirements: 19.6, 20.1, 22.1
 */

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { store } from './store';
import { useAppSelector, useAppDispatch } from './store';

// Import components
import { ToolBar } from './components/ToolBar/ToolBar';
import { AssetLibrary } from './components/AssetLibrary/AssetLibrary';
import { PreviewFrame } from './components/PreviewFrame/PreviewFrame';
import { ShotConfigPanel } from './components/ShotConfig/ShotConfigPanel';
import { Timeline } from './components/Timeline/Timeline';
import { StatusBar } from './components/StatusBar/StatusBar';
import { GenerateButton } from './components/GenerateButton/GenerateButton';
import { ResizablePanel } from './components/Panels/ResizablePanel';
import { RecoveryDialog } from './components/RecoveryDialog/RecoveryDialog';
import { UnsavedChangesDialog } from './components/UnsavedChangesDialog/UnsavedChangesDialog';
import { LayerManager } from './components/LayerManager/LayerManager';
import { LayerPropertiesPanel } from './components/LayerPropertiesPanel/LayerPropertiesPanel';

// Import new enhancement panels
import { TransitionsPanel } from './components/TransitionsPanel';
import { AIFeaturesPanel } from './components/AIFeaturesPanel';
import { AudioMixerPanel } from './components/AudioMixerPanel';
import { ExportPanel } from './components/ExportPanel';
import { EffectsPanel } from './components/EffectsPanel';

// Import R&D Phase 2/3 panels
import { VideoEffectsPanel } from './components/VideoEffectsPanel/VideoEffectsPanel';
import { CompositionTemplateBrowser } from './components/CompositionTemplateBrowser/CompositionTemplateBrowser';

// Import hooks
import { useProjectRecovery } from './hooks/useProjectRecovery';
import { useProjectFile } from './hooks/useProjectFile';
import { useAccessibilityInit } from './hooks/useAccessibility';

// Import utilities
import { initializeBrowserCompat } from './utils/browserCompat';

// Import styles
import './styles/variables.css';
import './styles/layout.css';
import './styles/animations.css';

export interface SequenceEditorProps {
  sequenceId?: string;
  onBack?: () => void;
}

export const SequenceEditor: React.FC<SequenceEditorProps> = ({ sequenceId, onBack }) => {
  return (
    <Provider store={store}>
      <DndProvider backend={HTML5Backend}>
        <SequenceEditorContent sequenceId={sequenceId} onBack={onBack} />
      </DndProvider>
    </Provider>
  );
};

const SequenceEditorContent: React.FC<SequenceEditorProps> = ({ sequenceId, onBack }) => {
  const dispatch = useAppDispatch();
  const { selectedElements, shots } = useAppSelector((state) => state.timeline);
  const { showLayerManager } = useAppSelector((state) => state.panels);

  // State for right panel tabs (new enhancement panels)
  const [activeRightPanel, setActiveRightPanel] = useState<'shotConfig' | 'transitions' | 'aiFeatures' | 'effects' | 'videoFx' | 'templates'>('shotConfig');

  // State for bottom panel (audio mixer and export)
  const [activeBottomPanel, setActiveBottomPanel] = useState<'timeline' | 'audioMixer' | 'export'>('timeline');

  // Initialize sequence from global store
  useEffect(() => {
    if (sequenceId) {
      console.log(`[SequenceEditor] Initializing sequence: ${sequenceId}`);

      // 1. Access global state (Zustand)
      // Note: We use a dynamic check for useStore to avoid circular dependencies or import issues
      const gStore = (window as any).useStore;
      if (!gStore) {
        console.warn('[SequenceEditor] Global store (window.useStore) not found. Synchronization might fail.');
        return;
      }

      const { shots: globalShots, project: globalProject } = gStore.getState();

      // 2. Filter shots for this sequence
      const sequenceShots = globalShots.filter((s: any) => s.sequence_id === sequenceId || s.sequenceId === sequenceId);

      if (sequenceShots.length > 0) {
        // 3. Map to Redux Format (Data Contract v1)
        const FPS = 24; // Default to 24 FPS

        const mappedShots = sequenceShots.map((s: any) => ({
          id: s.id,
          name: s.title || s.name || 'Untitled Shot',
          startTime: Math.round((s.start_time || 0) * FPS),
          duration: Math.round((s.duration || 1) * FPS),
          layers: s.layers || [],
          referenceImages: s.referenceImages || [],
          prompt: s.description || s.prompt || '',
          parameters: s.generation?.parameters || {
            seed: -1,
            denoising: 0.7,
            steps: 20,
            guidance: 7.0,
            sampler: 'euler',
            scheduler: 'normal'
          },
          generationStatus: (s.status === 'done' || s.status === 'completed') ? 'complete' : 'pending',
          outputPath: s.generated_image_url || s.image || '',
        }));

        // 4. Dispatch to Redux
        const { reorderShots } = require('./store/slices/timelineSlice');
        dispatch(reorderShots(mappedShots));

        // 5. Update Project Metadata in Redux
        const { updateMetadata } = require('./store/slices/projectSlice');
        dispatch(updateMetadata({
          id: sequenceId,
          name: sequenceShots[0]?.name || `Sequence ${sequenceId}`,
          path: globalProject?.path || '',
          modified: Date.now()
        }));
      }
    }
  }, [sequenceId, dispatch]);

  // Initialize accessibility features
  useAccessibilityInit();

  // Initialize browser compatibility
  useEffect(() => {
    initializeBrowserCompat();
  }, []);

  // Get selected shot ID for shot configuration panel
  const selectedShotId = selectedElements.length > 0 ? selectedElements[0] : null;

  // Get the selected shot object for LayerManager and LayerPropertiesPanel
  const selectedShot = selectedShotId ? shots.find(shot => shot.id === selectedShotId) : undefined;

  // Get selected layer IDs from the selected elements (filter to only layer IDs)
  const selectedLayerIds = selectedElements.filter(id =>
    shots.some(shot => shot.layers.some(layer => layer.id === id))
  );

  // Initialize project recovery
  const {
    hasRecovery,
    recoverySnapshots,
    showRecoveryDialog,
    handleRecover,
    handleDismiss,
  } = useProjectRecovery();

  // Initialize project file management
  const {
    showUnsavedDialog,
    handleSave,
    handleDiscard,
    handleCancel,
  } = useProjectFile();

  // Keyboard shortcuts for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl/Cmd + S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <div
      className="sequence-editor-root"
      role="application"
      aria-label="Sequence Editor"
    >
      {/* Recovery Dialog - Uses hook internally, no props needed */}
      {(showRecoveryDialog || hasRecovery) && (
        <RecoveryDialog />
      )}

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <UnsavedChangesDialog
          onSave={handleSave}
          onDiscard={handleDiscard}
          onCancel={handleCancel}
        />
      )}

      {/* Top Toolbar */}
      <div className="sequence-editor-toolbar" role="toolbar" aria-label="Main toolbar">
        <ToolBar onBack={onBack} />
        <div className="toolbar-spacer" />
        <GenerateButton />
      </div>

      {/* Main Content Area */}
      <div className="sequence-editor-main" role="main">
        {/* Left Panel - Asset Library */}
        <ResizablePanel
          panelId="assetLibrary"
          resizeDirection="horizontal"
          minWidth={200}
          className="sequence-editor-asset-library"
          ariaLabel="Asset Library Panel"
        >
          <AssetLibrary />
        </ResizablePanel>

        {/* Center Panel - Preview Frame */}
        <div className="sequence-editor-center" role="region" aria-label="Preview area">
          <PreviewFrame />
        </div>

        {/* Right Panel - Shot Configuration or Layer Manager */}
        <ResizablePanel
          panelId="shotConfig"
          resizeDirection="horizontal"
          minWidth={200}
          className="sequence-editor-shot-config"
          ariaLabel="Right Panel"
        >
          {/* Right Panel Tabs for Enhancement Panels */}
          <div className="right-panel-tabs">
            <button
              className={`panel-tab ${activeRightPanel === 'shotConfig' ? 'active' : ''}`}
              onClick={() => setActiveRightPanel('shotConfig')}
            >
              Shot
            </button>
            <button
              className={`panel-tab ${activeRightPanel === 'transitions' ? 'active' : ''}`}
              onClick={() => setActiveRightPanel('transitions')}
            >
              Transitions
            </button>
            <button
              className={`panel-tab ${activeRightPanel === 'aiFeatures' ? 'active' : ''}`}
              onClick={() => setActiveRightPanel('aiFeatures')}
            >
              AI Features
            </button>
            <button
              className={`panel-tab ${activeRightPanel === 'effects' ? 'active' : ''}`}
              onClick={() => setActiveRightPanel('effects')}
            >
              Effects
            </button>
            <button
              className={`panel-tab ${activeRightPanel === 'videoFx' ? 'active' : ''}`}
              onClick={() => setActiveRightPanel('videoFx')}
            >
              Video FX
            </button>
            <button
              className={`panel-tab ${activeRightPanel === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveRightPanel('templates')}
            >
              Templates
            </button>
          </div>

          {/* Panel Content */}
          <div className="right-panel-content">
            {showLayerManager ? (
              <>
                {selectedShot ? (
                  <>
                    <LayerManager shot={selectedShot} selectedLayerIds={selectedLayerIds} />
                    <LayerPropertiesPanel shot={selectedShot} selectedLayerId={selectedLayerIds[0] || null} />
                  </>
                ) : (
                  <div className="layer-manager-empty">
                    <p>No shot selected</p>
                    <p className="hint">Select a shot to manage its layers</p>
                  </div>
                )}
              </>
            ) : activeRightPanel === 'shotConfig' ? (
              <ShotConfigPanel />
            ) : activeRightPanel === 'transitions' ? (
              <TransitionsPanel />
            ) : activeRightPanel === 'aiFeatures' ? (
              <AIFeaturesPanel />
            ) : activeRightPanel === 'effects' ? (
              <EffectsPanel />
            ) : activeRightPanel === 'videoFx' ? (
              <VideoEffectsPanel shot={null as any} selectedLayerId={null} />
            ) : activeRightPanel === 'templates' ? (
              <CompositionTemplateBrowser
                insertionFrame={0}
                onInsertLayers={(layers) => {
                  console.log('[SequenceEditor] Insert template layers:', layers);
                  // TODO: dispatch addLayer for each layer
                }}
              />
            ) : null}
          </div>
        </ResizablePanel>
      </div>

      {/* Bottom Panel - Timeline / Audio Mixer / Export */}
      <ResizablePanel
        panelId="timeline"
        resizeDirection="vertical"
        minHeight={150}
        className="sequence-editor-timeline"
        ariaLabel="Bottom Panel"
      >
        {/* Bottom Panel Tabs */}
        <div className="bottom-panel-tabs">
          <button
            className={`panel-tab ${activeBottomPanel === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveBottomPanel('timeline')}
          >
            Timeline
          </button>
          <button
            className={`panel-tab ${activeBottomPanel === 'audioMixer' ? 'active' : ''}`}
            onClick={() => setActiveBottomPanel('audioMixer')}
          >
            Audio Mixer
          </button>
          <button
            className={`panel-tab ${activeBottomPanel === 'export' ? 'active' : ''}`}
            onClick={() => setActiveBottomPanel('export')}
          >
            Export
          </button>
        </div>

        {/* Bottom Panel Content */}
        <div className="bottom-panel-content">
          {activeBottomPanel === 'timeline' && <Timeline />}
          {activeBottomPanel === 'audioMixer' && <AudioMixerPanel />}
          {activeBottomPanel === 'export' && <ExportPanel />}
        </div>
      </ResizablePanel>

      {/* Status Bar */}
      <div className="sequence-editor-status-bar" role="status" aria-label="Project status">
        <StatusBar />
      </div>
    </div>
  );
};

export default SequenceEditor;
