/**
 * Sequence Editor - Main Component
 *
 * Professional-grade sequence editing interface for StoryCore-Engine
 * Requirements: 19.6, 20.1, 22.1
 */

import React, { useEffect } from 'react';
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

/**
 * SequenceEditor Root Component
 *
 * This component sets up the Redux store provider and drag-and-drop context
 * for the entire sequence editor interface.
 */
export const SequenceEditor: React.FC = () => {
  return (
    <Provider store={store}>
      <DndProvider backend={HTML5Backend}>
        <SequenceEditorContent />
      </DndProvider>
    </Provider>
  );
};

/**
 * SequenceEditorContent - Internal component with access to Redux store
 */
const SequenceEditorContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { selectedElements } = useAppSelector((state) => state.timeline);
  const { showLayerManager } = useAppSelector((state) => state.panels);

  // Initialize accessibility features
  useAccessibilityInit();

  // Initialize browser compatibility
  useEffect(() => {
    initializeBrowserCompat();
  }, []);

  // Get selected shot ID for shot configuration panel
  const selectedShotId = selectedElements.length > 0 ? selectedElements[0] : null;

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
      {/* Recovery Dialog */}
      {showRecoveryDialog && hasRecovery && (
        <RecoveryDialog
          snapshots={recoverySnapshots}
          onRecover={handleRecover}
          onDismiss={handleDismiss}
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
        <ToolBar />
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
          ariaLabel={showLayerManager ? "Layer Manager Panel" : "Shot Configuration Panel"}
        >
          {showLayerManager ? (
            <>
              <LayerManager />
              <LayerPropertiesPanel />
            </>
          ) : (
            <ShotConfigPanel shotId={selectedShotId} />
          )}
        </ResizablePanel>
      </div>

      {/* Bottom Panel - Timeline */}
      <ResizablePanel
        panelId="timeline"
        resizeDirection="vertical"
        minHeight={150}
        className="sequence-editor-timeline"
        ariaLabel="Timeline Panel"
      >
        <Timeline />
      </ResizablePanel>

      {/* Status Bar */}
      <div className="sequence-editor-status-bar" role="status" aria-label="Project status">
        <StatusBar />
      </div>
    </div>
  );
};

export default SequenceEditor;
