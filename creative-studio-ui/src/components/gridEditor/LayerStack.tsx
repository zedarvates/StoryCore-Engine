/**
 * LayerStack Component - Layer management panel for grid editor
 * 
 * Displays and manages layers within a selected panel:
 * - Shows list of layers with thumbnails and names
 * - Displays layer visibility, lock status, and opacity
 * - Supports drag-and-drop for layer reordering
 * - Provides buttons for layer operations (add, delete, duplicate)
 * 
 * Requirements: 5.6
 */

import React, { useState, useCallback, useRef } from 'react';
import { Layer, Panel } from '../../types/gridEditor';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Plus,
  Copy,
  Image as ImageIcon,
  Type,
  Sparkles,
} from 'lucide-react';

interface LayerStackProps {
  panel: Panel | null;
  selectedLayerId: string | null;
  onLayerSelect: (layerId: string) => void;
  onLayerReorder: (layerId: string, newIndex: number) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerLockToggle: (layerId: string) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerAdd: (type: 'image' | 'annotation' | 'effect') => void;
  onLayerDuplicate: (layerId: string) => void;
}

/**
 * LayerStack - Displays and manages layers for a panel
 */
export const LayerStack: React.FC<LayerStackProps> = ({
  panel,
  selectedLayerId,
  onLayerSelect,
  onLayerReorder,
  onLayerVisibilityToggle,
  onLayerLockToggle,
  onLayerOpacityChange,
  onLayerDelete,
  onLayerAdd,
  onLayerDuplicate,
}) => {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // If no panel is selected, show empty state
  if (!panel) {
    return (
      <div className="layer-stack-empty">
        <p className="text-gray-500 text-sm text-center py-8">
          Select a panel to manage layers
        </p>
      </div>
    );
  }

  const layers = panel.layers;

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layerId);
  }, []);

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  /**
   * Handle drop
   */
  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (draggedLayerId) {
      onLayerReorder(draggedLayerId, targetIndex);
    }
    
    setDraggedLayerId(null);
    setDragOverIndex(null);
  }, [draggedLayerId, onLayerReorder]);

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    setDraggedLayerId(null);
    setDragOverIndex(null);
  }, []);

  /**
   * Get icon for layer type
   */
  const getLayerIcon = (type: Layer['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={16} />;
      case 'annotation':
        return <Type size={16} />;
      case 'effect':
        return <Sparkles size={16} />;
      default:
        return <ImageIcon size={16} />;
    }
  };

  /**
   * Handle add layer menu
   */
  const handleAddLayer = (type: 'image' | 'annotation' | 'effect') => {
    onLayerAdd(type);
    setShowAddMenu(false);
  };

  /**
   * Close add menu when clicking outside
   */
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddMenu]);

  return (
    <div className="layer-stack">
      {/* Header */}
      <div className="layer-stack-header">
        <h3 className="text-sm font-semibold text-gray-700">Layers</h3>
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="layer-stack-add-btn"
            title="Add Layer"
          >
            <Plus size={16} />
          </button>
          
          {/* Add Layer Menu */}
          {showAddMenu && (
            <div className="layer-stack-add-menu">
              <button
                onClick={() => handleAddLayer('image')}
                className="layer-stack-add-menu-item"
              >
                <ImageIcon size={16} />
                <span>Image Layer</span>
              </button>
              <button
                onClick={() => handleAddLayer('annotation')}
                className="layer-stack-add-menu-item"
              >
                <Type size={16} />
                <span>Annotation Layer</span>
              </button>
              <button
                onClick={() => handleAddLayer('effect')}
                className="layer-stack-add-menu-item"
              >
                <Sparkles size={16} />
                <span>Effect Layer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Layer List */}
      <div className="layer-stack-list">
        {layers.length === 0 ? (
          <div className="layer-stack-empty-list">
            <p className="text-gray-400 text-xs text-center py-4">
              No layers yet. Click + to add a layer.
            </p>
          </div>
        ) : (
          // Render layers in reverse order (top layer first in UI)
          [...layers].reverse().map((layer, reverseIndex) => {
            const actualIndex = layers.length - 1 - reverseIndex;
            const isSelected = layer.id === selectedLayerId;
            const isDragging = layer.id === draggedLayerId;
            const isDragOver = dragOverIndex === actualIndex;

            return (
              <div
                key={layer.id}
                draggable={!layer.locked}
                onDragStart={(e) => handleDragStart(e, layer.id)}
                onDragOver={(e) => handleDragOver(e, actualIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, actualIndex)}
                onDragEnd={handleDragEnd}
                onClick={() => onLayerSelect(layer.id)}
                className={`layer-stack-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                style={{
                  opacity: isDragging ? 0.5 : 1,
                  cursor: layer.locked ? 'default' : 'grab',
                }}
              >
                {/* Drag indicator */}
                {isDragOver && (
                  <div className="layer-stack-drag-indicator" />
                )}

                {/* Layer thumbnail */}
                <div className="layer-stack-thumbnail">
                  {getLayerIcon(layer.type)}
                </div>

                {/* Layer info */}
                <div className="layer-stack-info">
                  <div className="layer-stack-name">
                    {layer.name}
                  </div>
                  <div className="layer-stack-opacity-label">
                    Opacity: {Math.round(layer.opacity * 100)}%
                  </div>
                </div>

                {/* Layer controls */}
                <div className="layer-stack-controls">
                  {/* Visibility toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerVisibilityToggle(layer.id);
                    }}
                    className="layer-stack-control-btn"
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>

                  {/* Lock toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerLockToggle(layer.id);
                    }}
                    className="layer-stack-control-btn"
                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  >
                    {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerDuplicate(layer.id);
                    }}
                    className="layer-stack-control-btn"
                    title="Duplicate layer"
                    disabled={layer.locked}
                  >
                    <Copy size={14} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete layer "${layer.name}"?`)) {
                        onLayerDelete(layer.id);
                      }
                    }}
                    className="layer-stack-control-btn layer-stack-delete-btn"
                    title="Delete layer"
                    disabled={layer.locked}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Opacity slider (shown when selected) */}
                {isSelected && (
                  <div className="layer-stack-opacity-slider">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(layer.opacity * 100)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onLayerOpacityChange(layer.id, parseInt(e.target.value) / 100);
                      }}
                      disabled={layer.locked}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .layer-stack {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
          border-radius: 4px;
          overflow: hidden;
        }

        .layer-stack-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .layer-stack-add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: #3b82f6;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .layer-stack-add-btn:hover {
          background: #2563eb;
        }

        .layer-stack-add-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          min-width: 160px;
        }

        .layer-stack-add-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }

        .layer-stack-add-menu-item:hover {
          background: #f3f4f6;
        }

        .layer-stack-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .layer-stack-empty-list {
          padding: 16px;
        }

        .layer-stack-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          margin-bottom: 4px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          background: white;
          transition: all 0.2s;
        }

        .layer-stack-item:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .layer-stack-item.selected {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .layer-stack-item.dragging {
          opacity: 0.5;
        }

        .layer-stack-item.drag-over {
          border-top: 2px solid #3b82f6;
        }

        .layer-stack-drag-indicator {
          position: absolute;
          top: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #3b82f6;
        }

        .layer-stack-thumbnail {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #f3f4f6;
          border-radius: 4px;
          flex-shrink: 0;
          color: #6b7280;
        }

        .layer-stack-info {
          flex: 1;
          min-width: 0;
        }

        .layer-stack-name {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .layer-stack-opacity-label {
          font-size: 11px;
          color: #6b7280;
        }

        .layer-stack-controls {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .layer-stack-control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: none;
          color: #6b7280;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .layer-stack-control-btn:hover:not(:disabled) {
          background: #e5e7eb;
          color: #374151;
        }

        .layer-stack-control-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .layer-stack-delete-btn:hover:not(:disabled) {
          background: #fee2e2;
          color: #dc2626;
        }

        .layer-stack-opacity-slider {
          position: absolute;
          bottom: 4px;
          left: 48px;
          right: 8px;
          padding: 4px 0;
        }

        .layer-stack-item.selected {
          padding-bottom: 32px;
        }

        .layer-stack-empty {
          padding: 16px;
        }
      `}</style>
    </div>
  );
};
