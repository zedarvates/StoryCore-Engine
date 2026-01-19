/**
 * Backend Integration Example
 * 
 * Demonstrates the complete backend integration workflow:
 * - Panel image generation with loading states
 * - Batch generation for multiple panels
 * - Error handling and recovery
 * - Undo/redo integration
 * - Modified panel tracking
 * 
 * This example shows how all the backend integration pieces work together.
 */

import React, { useState } from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { PanelGenerationControls } from './PanelGenerationControls';
import { PanelContextMenu } from './PanelContextMenu';
import { gridApi } from '../../services/gridEditor/GridAPIService';
import { imageLoader } from '../../services/gridEditor/ImageLoaderService';
import type { Panel } from '../../types/gridEditor';

export const BackendIntegrationExample: React.FC = () => {
  const panels = useGridStore((state) => state.config.panels);
  const selectedPanelIds = useGridStore((state) => state.selectedPanelIds);
  const selectPanel = useGridStore((state) => state.selectPanel);
  const updatePanelImage = useGridStore((state) => state.updatePanelImage);
  const markPanelAsModified = useGridStore((state) => state.markPanelAsModified);
  
  const pushOperation = useUndoRedoStore((state) => state.pushOperation);
  const undo = useUndoRedoStore((state) => state.undo);
  const redo = useUndoRedoStore((state) => state.redo);
  const canUndo = useUndoRedoStore((state) => state.canUndo);
  const canRedo = useUndoRedoStore((state) => state.canRedo);

  const [contextMenu, setContextMenu] = useState<{
    panel: Panel;
    position: { x: number; y: number };
  } | null>(null);

  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });

  /**
   * Handle panel right-click to show context menu
   */
  const handlePanelContextMenu = (panel: Panel, event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      panel,
      position: { x: event.clientX, y: event.clientY },
    });
  };

  /**
   * Handle generate from context menu
   */
  const handleGenerateFromMenu = async (panelId: string) => {
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return;

    // The PanelGenerationControls component handles the actual generation
    // This is just to demonstrate the workflow
    console.log('Generate triggered for panel:', panelId);
  };

  /**
   * Handle batch generation for all panels
   */
  const handleBatchGenerate = async () => {
    setBatchGenerating(true);
    setBatchProgress({ completed: 0, total: panels.length });

    try {
      // Build batch request
      const batchRequest = {
        panels: panels.map((panel) => ({
          panelId: panel.id,
          prompt: `Generate image for panel ${panel.position.row}-${panel.position.col}`,
          seed: Math.floor(Math.random() * 1000000),
          transform: panel.transform,
          crop: panel.crop,
          styleReference: 'master-coherence-sheet',
          width: 512,
          height: 512,
        })),
        parallel: true,
        maxConcurrent: 3,
      };

      // Submit batch generation
      const response = await gridApi.batchGeneratePanels(batchRequest);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Batch generation failed');
      }

      // Update panels with generated images
      for (const result of response.data.results) {
        updatePanelImage(result.panelId, result.imageUrl, result.metadata);
        
        // Preload image for better performance
        await imageLoader.loadImage(result.imageUrl);
        
        setBatchProgress((prev) => ({
          ...prev,
          completed: prev.completed + 1,
        }));
      }

      // Record batch operation for undo
      pushOperation({
        type: 'batch_generation',
        timestamp: Date.now(),
        data: {
          panelId: response.data.results[0]?.panelId || '',
          before: {},
          after: response.data.results,
        },
      });

      console.log('Batch generation complete:', response.data);
    } catch (error) {
      console.error('Batch generation error:', error);
    } finally {
      setBatchGenerating(false);
    }
  };

  /**
   * Handle panel modification (e.g., after transform)
   */
  const handlePanelModified = (panelId: string) => {
    markPanelAsModified(panelId);
  };

  /**
   * Handle generation complete
   */
  const handleGenerationComplete = (panelId: string, imageUrl: string) => {
    console.log('Generation complete:', panelId, imageUrl);
    
    // Preload image with mipmaps for better performance
    imageLoader.loadImageWithMipmaps(imageUrl).then((mipmaps) => {
      console.log('Mipmaps loaded:', mipmaps.length, 'levels');
    });
  };

  /**
   * Handle generation error
   */
  const handleGenerationError = (panelId: string, error: string) => {
    console.error('Generation error:', panelId, error);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Backend Integration Example
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Demonstrates panel generation, batch processing, and undo/redo
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Grid Display */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
            {panels.map((panel) => (
              <div
                key={panel.id}
                className={`
                  aspect-square border-2 rounded-lg overflow-hidden cursor-pointer
                  transition-all duration-200
                  ${
                    selectedPanelIds.includes(panel.id)
                      ? 'border-blue-500 shadow-lg'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }
                  ${panel.metadata?.modified ? 'ring-2 ring-yellow-400' : ''}
                `}
                onClick={() => selectPanel(panel.id, false)}
                onContextMenu={(e) => handlePanelContextMenu(panel, e)}
              >
                {panel.layers[0]?.content.type === 'image' ? (
                  <img
                    src={(panel.layers[0].content as any).url}
                    alt={`Panel ${panel.position.row}-${panel.position.col}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      Panel {panel.position.row * 3 + panel.position.col + 1}
                    </span>
                  </div>
                )}
                
                {/* Modified Indicator */}
                {panel.metadata?.modified && (
                  <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded">
                    Modified
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Batch Generation Controls */}
          <div className="max-w-4xl mx-auto mt-8">
            <button
              onClick={handleBatchGenerate}
              disabled={batchGenerating}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {batchGenerating
                ? `Generating... ${batchProgress.completed}/${batchProgress.total}`
                : 'Generate All Panels'}
            </button>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
          {selectedPanelIds.length === 1 && (
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Panel Properties
              </h2>
              
              {/* Generation Controls */}
              <PanelGenerationControls
                panel={panels.find((p) => p.id === selectedPanelIds[0])!}
                onGenerationComplete={handleGenerationComplete}
                onGenerationError={handleGenerationError}
              />

              {/* Undo/Redo Controls */}
              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  History
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => undo()}
                    disabled={!canUndo()}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Undo
                  </button>
                  <button
                    onClick={() => redo()}
                    disabled={!canRedo()}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Redo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <PanelContextMenu
          panel={contextMenu.panel}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onGenerate={handleGenerateFromMenu}
        />
      )}
    </div>
  );
};

export default BackendIntegrationExample;
