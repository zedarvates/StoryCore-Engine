/**
 * GridEditorPropertiesPanel Component - Properties display for grid editor
 * 
 * Displays properties for selected panels:
 * - Transform values (position, scale, rotation)
 * - Crop settings with indicator when active
 * - Layer stack (future implementation)
 * 
 * Requirements: 4.8 (crop indicator), future: layer management
 */

import React from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import type { Transform, CropRegion } from '../../stores/gridEditorStore';
import { Crop, Move, RotateCw, Maximize2, Layers } from 'lucide-react';
import { PanelGenerationControls } from './PanelGenerationControls';

// ============================================================================
// Type Definitions
// ============================================================================

export interface GridEditorPropertiesPanelProps {
  /**
   * Optional CSS class name
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const GridEditorPropertiesPanel: React.FC<GridEditorPropertiesPanelProps> = ({
  className = '',
}) => {
  const panels = useGridStore((state) => state.config.panels);
  const selectedPanelIds = useGridStore((state) => state.selectedPanelIds);

  // Get selected panels
  const selectedPanels = panels.filter((panel) =>
    selectedPanelIds.includes(panel.id)
  );

  // If no selection, show empty state
  if (selectedPanels.length === 0) {
    return (
      <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Properties
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No panel selected</p>
            <p className="text-xs mt-1">Select a panel to view properties</p>
          </div>
        </div>
      </div>
    );
  }

  // If multiple panels selected, show multi-selection state
  if (selectedPanels.length > 1) {
    return (
      <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Properties
          </h2>
        </div>
        <div className="flex-1 p-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
              {selectedPanels.length} panels selected
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Multi-panel editing coming soon
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Single panel selected - show full properties
  const panel = selectedPanels[0];

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Properties
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Panel {panel.position.row * 3 + panel.position.col + 1} ({panel.position.row}, {panel.position.col})
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Generation Controls */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Generation
            </h3>
            <PanelGenerationControls panel={panel as any} />
          </div>

          {/* Transform Properties */}
          <TransformProperties transform={panel.transform} />

          {/* Crop Properties */}
          <CropProperties crop={panel.crop} />

          {/* Layer Stack (placeholder) */}
          <LayerStackPlaceholder layerCount={panel.layers.length} />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Transform Properties Section
// ============================================================================

interface TransformPropertiesProps {
  transform: Transform;
}

const TransformProperties: React.FC<TransformPropertiesProps> = ({ transform }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Move className="h-4 w-4" />
        Transform
      </h3>

      <div className="space-y-3">
        {/* Position */}
        <PropertyRow
          icon={<Move className="h-3.5 w-3.5" />}
          label="Position"
          value={`${Math.round(transform.position.x)}px, ${Math.round(transform.position.y)}px`}
        />

        {/* Scale */}
        <PropertyRow
          icon={<Maximize2 className="h-3.5 w-3.5" />}
          label="Scale"
          value={`${Math.round(transform.scale.x * 100)}%, ${Math.round(transform.scale.y * 100)}%`}
        />

        {/* Rotation */}
        <PropertyRow
          icon={<RotateCw className="h-3.5 w-3.5" />}
          label="Rotation"
          value={`${Math.round(transform.rotation)}°`}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Crop Properties Section
// ============================================================================

interface CropPropertiesProps {
  crop: CropRegion | null;
}

const CropProperties: React.FC<CropPropertiesProps> = ({ crop }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Crop className="h-4 w-4" />
        Crop
      </h3>

      {crop ? (
        <div className="space-y-3">
          {/* Crop Active Indicator */}
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <Crop className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-900 dark:text-green-100">
              Crop Active
            </span>
          </div>

          {/* Crop Dimensions */}
          <PropertyRow
            label="Dimensions"
            value={`${Math.round(crop.width * 100)}% × ${Math.round(crop.height * 100)}%`}
          />

          {/* Crop Position */}
          <PropertyRow
            label="Position"
            value={`(${Math.round(crop.x * 100)}%, ${Math.round(crop.y * 100)}%)`}
          />

          {/* Crop Area */}
          <PropertyRow
            label="Area"
            value={`${Math.round(crop.width * crop.height * 100)}%`}
          />
        </div>
      ) : (
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No crop applied
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Activate crop tool to crop this panel
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Layer Stack Placeholder
// ============================================================================

interface LayerStackPlaceholderProps {
  layerCount: number;
}

const LayerStackPlaceholder: React.FC<LayerStackPlaceholderProps> = ({ layerCount }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Layers className="h-4 w-4" />
        Layers
      </h3>

      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {layerCount} {layerCount === 1 ? 'layer' : 'layers'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Layer management coming in Task 9
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Property Row Component
// ============================================================================

interface PropertyRowProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
}

const PropertyRow: React.FC<PropertyRowProps> = ({ icon, label, value }) => {
  return (
    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="text-gray-500 dark:text-gray-400">
            {icon}
          </span>
        )}
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </div>
      <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
};

export default GridEditorPropertiesPanel;
