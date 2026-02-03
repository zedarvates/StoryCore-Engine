/**
 * LayerManager Component - Manages layers within a shot
 * Requirements: 9.1, 9.2, 9.3, 9.7
 * 
 * Provides UI for:
 * - Adding layers of different types to shots
 * - Displaying layers stacked vertically
 * - Showing layer names and icons
 * - Layer selection and highlighting
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  addLayer,
  deleteLayer,
  reorderLayers,
  selectElement,
  deselectElement,
} from '../../store/slices/timelineSlice';
import type { Layer, LayerType, Shot } from '../../types';
import './layerManager.css';

interface LayerManagerProps {
  shot: Shot;
  selectedLayerIds: string[];
  onLayerSelect?: (layerId: string) => void;
}

// Layer type configuration
const LAYER_TYPE_CONFIG: Record<LayerType, { name: string; icon: string; color: string }> = {
  media: { name: 'Media', icon: '🎬', color: '#4A90E2' },
  audio: { name: 'Audio', icon: '🔊', color: '#50C878' },
  effects: { name: 'Effects', icon: '✨', color: '#9B59B6' },
  transitions: { name: 'Transition', icon: '🔀', color: '#E67E22' },
  text: { name: 'Text', icon: '📝', color: '#F39C12' },
  keyframes: { name: 'Keyframe', icon: '🔑', color: '#E74C3C' },
};

export const LayerManager: React.FC<LayerManagerProps> = ({
  shot,
  selectedLayerIds,
  onLayerSelect,
}) => {
  const dispatch = useDispatch();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);

  const handleAddLayer = (type: LayerType) => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      startTime: 0,
      duration: shot.duration,
      locked: false,
      hidden: false,
      opacity: 1,
      blendMode: 'normal',
      data: getDefaultLayerData(type),
    };

    dispatch(addLayer({ shotId: shot.id, layer: newLayer }));
    setShowAddMenu(false);
  };

  const handleDeleteLayer = (layerId: string) => {
    dispatch(deleteLayer({ shotId: shot.id, layerId }));
  };

  const handleLayerClick = (layerId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      if (selectedLayerIds.includes(layerId)) {
        dispatch(deselectElement(layerId));
      } else {
        dispatch(selectElement(layerId));
      }
    } else {
      // Single select
      if (onLayerSelect) {
        onLayerSelect(layerId);
      } else {
        dispatch(selectElement(layerId));
      }
    }
  };

  const handleDragStart = (layerId: string) => {
    setDraggedLayerId(layerId);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (targetLayerId: string) => {
    if (!draggedLayerId || draggedLayerId === targetLayerId) {
      setDraggedLayerId(null);
      return;
    }

    const layers = [...shot.layers];
    const draggedIndex = layers.findIndex((l) => l.id === draggedLayerId);
    const targetIndex = layers.findIndex((l) => l.id === targetLayerId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedLayer] = layers.splice(draggedIndex, 1);
      layers.splice(targetIndex, 0, draggedLayer);
      dispatch(reorderLayers({ shotId: shot.id, layers }));
    }

    setDraggedLayerId(null);
  };

  return (
    <div className="layer-manager">
      <div className="layer-manager-header">
        <h3>Layers</h3>
        <div className="layer-manager-actions">
          <button
            className="add-layer-button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            title="Add Layer"
          >
            + Add Layer
          </button>
        </div>
      </div>

      {showAddMenu && (
        <div className="add-layer-menu">
          {(Object.keys(LAYER_TYPE_CONFIG) as LayerType[]).map((type) => {
            const config = LAYER_TYPE_CONFIG[type];
            return (
              <button
                key={type}
                className="add-layer-menu-item"
                onClick={() => handleAddLayer(type)}
                style={{ borderLeftColor: config.color }}
              >
                <span className="layer-icon">{config.icon}</span>
                <span className="layer-name">{config.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="layer-list">
        {shot.layers.length === 0 ? (
          <div className="layer-list-empty">
            <p>No layers yet</p>
            <p className="layer-list-empty-hint">Click "Add Layer" to get started</p>
          </div>
        ) : (
          shot.layers.map((layer) => {
            const config = LAYER_TYPE_CONFIG[layer.type];
            const isSelected = selectedLayerIds.includes(layer.id);
            const isDragging = draggedLayerId === layer.id;

            return (
              <div
                key={layer.id}
                className={`layer-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${layer.hidden ? 'hidden' : ''} ${layer.locked ? 'locked' : ''}`}
                onClick={(e) => handleLayerClick(layer.id, e)}
                draggable
                onDragStart={() => handleDragStart(layer.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(layer.id)}
                style={{ borderLeftColor: config.color }}
              >
                <div className="layer-item-icon" style={{ color: config.color }}>
                  {config.icon}
                </div>
                <div className="layer-item-content">
                  <div className="layer-item-name">
                    {config.name} {layer.id.split('-').pop()}
                  </div>
                  <div className="layer-item-info">
                    Duration: {layer.duration} frames
                    {layer.opacity < 1 && ` • Opacity: ${Math.round(layer.opacity * 100)}%`}
                    {layer.blendMode !== 'normal' && ` • Blend: ${layer.blendMode}`}
                  </div>
                </div>
                <div className="layer-item-actions">
                  {layer.locked && (
                    <span className="layer-status-icon" title="Locked">
                      🔒
                    </span>
                  )}
                  {layer.hidden && (
                    <span className="layer-status-icon" title="Hidden">
                      👁️‍🗨️
                    </span>
                  )}
                  <button
                    className="layer-delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLayer(layer.id);
                    }}
                    title="Delete Layer"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Helper function to create default layer data based on type
function getDefaultLayerData(type: LayerType): any {
  switch (type) {
    case 'media':
      return {
        sourceUrl: '',
        trim: { start: 0, end: 0 },
        transform: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          anchor: { x: 0.5, y: 0.5 },
        },
      };
    case 'audio':
      return {
        sourceUrl: '',
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
      };
    case 'effects':
      return {
        effectType: 'none',
        parameters: {},
      };
    case 'transitions':
      return {
        transitionType: 'fade' as const,
        duration: 30,
        easing: 'ease-in-out',
      };
    case 'text':
      return {
        content: 'New Text',
        font: 'Arial',
        size: 24,
        color: '#FFFFFF',
        position: { x: 0.5, y: 0.5 },
      };
    case 'keyframes':
      return {
        property: 'opacity',
        keyframes: [],
        interpolation: 'linear' as const,
      };
    default:
      return {};
  }
}
