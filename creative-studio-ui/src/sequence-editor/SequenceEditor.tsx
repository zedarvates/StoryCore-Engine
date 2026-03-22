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
import { store } from '@/sequence-editor/store';
import { useAppSelector, useAppDispatch } from '@/sequence-editor/store';
import { reorderShots, addShot } from '@/sequence-editor/store/slices/timelineSlice';
import { toggleCompactMode } from '@/sequence-editor/store/slices/panelsSlice';
import { updateMetadata } from '@/sequence-editor/store/slices/projectSlice';
import type { Shot } from '@/sequence-editor/types';

// Import components
import { ToolBar } from '@/sequence-editor/components/ToolBar/ToolBar';
import { AssetLibrary } from '@/sequence-editor/components/AssetLibrary/AssetLibrary';
import { PreviewFrame } from '@/sequence-editor/components/PreviewFrame/PreviewFrame';
import { ShotConfigPanel } from '@/sequence-editor/components/ShotConfig/ShotConfigPanel';
import { Timeline } from '@/sequence-editor/components/Timeline/Timeline';
import { StatusBar } from '@/sequence-editor/components/StatusBar/StatusBar';
import { ResizablePanel } from '@/sequence-editor/components/Panels/ResizablePanel';
import { RecoveryDialog } from '@/sequence-editor/components/RecoveryDialog/RecoveryDialog';
import { UnsavedChangesDialog } from '@/sequence-editor/components/UnsavedChangesDialog/UnsavedChangesDialog';
import { LayerManager } from '@/sequence-editor/components/LayerManager/LayerManager';
import { LayerPropertiesPanel } from '@/sequence-editor/components/LayerPropertiesPanel/LayerPropertiesPanel';

// Import new enhancement panels
import { TransitionsPanel } from '@/sequence-editor/components/TransitionsPanel';
import { AIFeaturesPanel } from '@/sequence-editor/components/AIFeaturesPanel';
import { AudioMixerPanel } from '@/sequence-editor/components/AudioMixerPanel';
import { ExportPanel } from '@/sequence-editor/components/ExportPanel';
import { EffectsPanel } from '@/sequence-editor/components/EffectsPanel';
import { KeyframeEditorOverlay } from '@/sequence-editor/components/KeyframeEditor/KeyframeEditorOverlay';
import { CompactDirectorPanel } from '@/sequence-editor/components/CompactDirectorPanel/CompactDirectorPanel';

// Import LLM Assistant Sidebar
import { LLMAssistantSidebar } from '@/components/LLMAssistantSidebar';

// Import R&D Phase 2/3 panels
import { VideoEffectsPanel } from '@/sequence-editor/components/VideoEffectsPanel/VideoEffectsPanel';
import { CompositionTemplateBrowser } from '@/sequence-editor/components/CompositionTemplateBrowser/CompositionTemplateBrowser';

import { useProjectRecovery } from '@/sequence-editor/hooks/useProjectRecovery';
import { useProjectFile } from '@/sequence-editor/hooks/useProjectFile';
import { useAccessibilityInit } from '@/sequence-editor/hooks/useAccessibility';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUndoRedo } from '@/sequence-editor/store/hooks/useUndoRedo';

// Import utilities
import { initializeBrowserCompat } from '@/sequence-editor/utils/browserCompat';

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
  const { selectedElements, shots, playheadPosition } = useAppSelector((state) => state.timeline);
  const { showLayerManager, compactMode } = useAppSelector((state) => state.panels);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gStore = (window as unknown as { useStore: any }).useStore;
      if (!gStore) {
        console.warn('[SequenceEditor] Global store (window.useStore) not found. Synchronization might fail.');
        return;
      }

      const globalState = gStore.getState();
      const globalShots = globalState.shots || [];
      const globalProject = globalState.project;

      // 2. Filter shots for this sequence
      const sequenceShots = globalShots.filter((s: { id: string; sequence_id?: string; sequenceId?: string }) => s.sequence_id === sequenceId || s.sequenceId === sequenceId);

      if (sequenceShots.length > 0) {
        // 3. Map to Redux Format (Data Contract v1)
        const FPS = 24; // Default to 24 FPS

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedShots = sequenceShots.map((s: any) => ({
          id: s.id,
          name: s.title || s.name || 'Untitled Shot',
          startTime: Math.round((s.start_time || 0) * FPS),
          // Enforce 4s minimum duration (Data Contract v1 Requirement)
          duration: Math.max(4 * FPS, Math.round((s.duration || 1) * FPS)),
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

        // 4. Deduplicate shots (Requirement: Fix duplicate key shot-1)
        const uniqueShots = mappedShots.filter((shot: Shot, index: number, self: Shot[]) =>
          index === self.findIndex((s: Shot) => s.id === shot.id)
        );

        // 5. Dispatch to Redux
        dispatch(reorderShots(uniqueShots));

        // 6. Update Project Metadata in Redux
        dispatch(updateMetadata({
          id: sequenceId,
          name: sequenceShots[0]?.name || `Sequence ${sequenceId}`,
          path: globalProject?.path || '',
          description: globalProject?.global_resume || '', // Map global_resume to description
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
    hasCrashedSession,
    recoverySnapshots,
    showRecoveryDialog,
    setShowRecoveryDialog,
    handleRecover,
    handleDismiss,
    deleteSnapshot,
    formatTimestamp,
    isRecovering,
    error,
  } = useProjectRecovery();

  // Initialize project file management
  const {
    showUnsavedDialog,
    handleSave,
    handleDiscard,
    handleCancel,
  } = useProjectFile();

  // Undo/Redo hook
  const { undo, redo } = useUndoRedo();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      // History
      { key: 'z', ctrlKey: true, action: undo, description: 'Undo' },
      { key: 'y', ctrlKey: true, action: redo, description: 'Redo' },
      { key: 'z', ctrlKey: true, shiftKey: true, action: redo, description: 'Redo' },
      
      // Save
      { key: 's', ctrlKey: true, action: handleSave, description: 'Save' },
      
      // Navigation
      { key: 'h', ctrlKey: true, action: () => onBack?.(), description: 'Back to Dashboard' },
      { key: 'h', ctrlKey: true, shiftKey: true, action: () => onBack?.(), description: 'Back to Dashboard' },

      // Panel Switching (Right Panel)
      { key: '1', action: () => setActiveRightPanel('shotConfig'), description: 'Switch to Shot Config' },
      { key: '2', action: () => setActiveRightPanel('transitions'), description: 'Switch to Transitions' },
      { key: '3', action: () => setActiveRightPanel('aiFeatures'), description: 'Switch to AI Features' },
      { key: '4', action: () => setActiveRightPanel('effects'), description: 'Switch to Effects' },
      { key: '5', action: () => setActiveRightPanel('videoFx'), description: 'Switch to Video FX' },
      { key: '6', action: () => setActiveRightPanel('templates'), description: 'Switch to Templates' },
      
      // Bottom Panel Switching
      { key: 't', altKey: true, action: () => setActiveBottomPanel('timeline'), description: 'Switch to Timeline' },
      { key: 'm', altKey: true, action: () => setActiveBottomPanel('audioMixer'), description: 'Switch to Audio Mixer' },
      { key: 'e', altKey: true, action: () => setActiveBottomPanel('export'), description: 'Switch to Export' },
      
      // Compact Mode
      { key: 'k', action: () => dispatch(toggleCompactMode()), description: 'Toggle Compact Mode' },
    ]
  });

  return (
    <div
      className="sequence-editor-root"
      role="application"
      aria-label="Sequence Editor"
    >
      {/* Recovery Dialog */}
      {showRecoveryDialog && (
        <RecoveryDialog
          onClose={() => setShowRecoveryDialog(false)}
          hasCrashedSession={hasCrashedSession}
          recoverySnapshots={recoverySnapshots}
          recoverFromSnapshot={handleRecover}
          dismissCrashRecovery={handleDismiss}
          deleteSnapshot={deleteSnapshot}
          formatTimestamp={formatTimestamp}
          isRecovering={isRecovering}
          error={error}
        />
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
              <VideoEffectsPanel shot={selectedShot || (null as unknown as Shot)} selectedLayerId={selectedLayerIds[0] || null} />
            ) : activeRightPanel === 'templates' ? (
              <CompositionTemplateBrowser
                insertionFrame={playheadPosition}
                onInsertLayers={(layers) => {
                  console.log('[SequenceEditor] Insert template layers:', layers);
                  // Find the selected shot or create a new one
                  const targetShot = selectedShotId ? shots.find(s => s.id === selectedShotId) : null;
                  if (targetShot) {
                    // Add layers to existing shot
                    layers.forEach(layer => {
                      dispatch({
                        type: 'timeline/addLayer',
                        payload: { shotId: targetShot.id, layer }
                      });
                    });
                  } else {
                    // Create a new shot with the template layers
                    const newShot = {
                      id: `shot-${Date.now()}`,
                      name: 'Template Shot',
                      startTime: playheadPosition,
                      duration: Math.max(...layers.map(l => l.startTime + l.duration)),
                      layers: layers,
                      referenceImages: [],
                      prompt: '',
                      parameters: {
                        seed: -1,
                        denoising: 0.7,
                        steps: 20,
                        guidance: 7.0,
                        sampler: 'euler',
                        scheduler: 'normal'
                      },
                      generationStatus: 'pending' as const,
                    };
                    dispatch(addShot(newShot));
                  }
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

      {/* Keyframe Editor Overlay */}
      <KeyframeEditorOverlay />

      {/* LLM Assistant Sidebar - Voice Commands Helper */}
      <LLMAssistantSidebar />

      {/* Compact Director Mode Overlay */}
      {compactMode && <CompactDirectorPanel />}
    </div>
  );
};

export default SequenceEditor;
