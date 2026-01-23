import React, { useState, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Settings,
  Move,
  Layers
} from 'lucide-react';
import './LayerPanel.css';

interface Layer {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'image' | 'effect' | 'adjustment';
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light';
  position: { x: number; y: number; z: number };
  parentId?: string; // For grouped layers
  children?: string[]; // Child layer IDs
  collapsed?: boolean; // For group layers
}

interface LayerPanelProps {
  layers: Layer[];
  selectedLayerIds: string[];
  onLayerSelect: (layerId: string, multiSelect?: boolean) => void;
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onLayerAdd: (type: Layer['type'], name?: string) => void;
  onLayerRemove: (layerId: string) => void;
  onLayerDuplicate: (layerId: string) => void;
  onLayerReorder: (layerId: string, newIndex: number) => void;
  onLayerGroup: (layerIds: string[], groupName?: string) => void;
  onLayerUngroup: (groupId: string) => void;
}

const BLEND_MODES = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'hard-light', label: 'Hard Light' }
];

export function LayerPanel({
  layers,
  selectedLayerIds,
  onLayerSelect,
  onLayerUpdate,
  onLayerAdd,
  onLayerRemove,
  onLayerDuplicate,
  onLayerReorder,
  onLayerGroup,
  onLayerUngroup
}: LayerPanelProps) {
  const [draggedLayer, setDraggedLayer] = useState<string | null>(null);
  const [dragOverLayer, setDragOverLayer] = useState<string | null>(null);

  // Build hierarchical layer structure
  const buildLayerTree = useCallback(() => {
    const layerMap = new Map(layers.map(layer => [layer.id, layer]));
    const rootLayers: Layer[] = [];
    const processedIds = new Set<string>();

    // Find root layers (no parent)
    layers.forEach(layer => {
      if (!layer.parentId) {
        rootLayers.push(layer);
        processedIds.add(layer.id);
      }
    });

    // Attach children to parents
    const attachChildren = (parent: Layer): Layer => {
      if (parent.children && parent.children.length > 0) {
        parent.children.forEach(childId => {
          if (layerMap.has(childId) && !processedIds.has(childId)) {
            const child = layerMap.get(childId)!;
            attachChildren(child);
            processedIds.add(childId);
          }
        });
      }
      return parent;
    };

    return rootLayers.map(attachChildren);
  }, [layers]);

  const layerTree = buildLayerTree();

  const getLayerIcon = (type: Layer['type']) => {
    switch (type) {
      case 'video': return '🎬';
      case 'audio': return '🔊';
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'effect': return '✨';
      case 'adjustment': return '🎨';
      default: return '📄';
    }
  };

  const getLayerDepth = (layer: Layer, depth = 0): number => {
    if (!layer.parentId) return depth;
    const parent = layers.find(l => l.id === layer.parentId);
    return parent ? getLayerDepth(parent, depth + 1) : depth;
  };

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayer(layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    setDragOverLayer(layerId);
  };

  const handleDragEnd = () => {
    setDraggedLayer(null);
    setDragOverLayer(null);
  };

  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    if (!draggedLayer || draggedLayer === targetLayerId) return;

    const draggedLayerData = layers.find(l => l.id === draggedLayer);
    const targetLayerData = layers.find(l => l.id === targetLayerId);

    if (!draggedLayerData || !targetLayerData) return;

    // For now, simple reordering (can be enhanced for grouping)
    const allLayers = [...layers];
    const draggedIndex = allLayers.findIndex(l => l.id === draggedLayer);
    const targetIndex = allLayers.findIndex(l => l.id === targetLayerId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [removed] = allLayers.splice(draggedIndex, 1);
      allLayers.splice(targetIndex, 0, removed);

      // Update positions (simplified - in real app, update backend)
      allLayers.forEach((layer, index) => {
        onLayerUpdate(layer.id, { position: { ...layer.position, z: index } });
      });
    }

    setDraggedLayer(null);
    setDragOverLayer(null);
  };

  const renderLayerItem = (layer: Layer, index: number) => {
    const depth = getLayerDepth(layer);
    const isSelected = selectedLayerIds.includes(layer.id);
    const isGroup = layer.children && layer.children.length > 0;
    const hasParent = !!layer.parentId;

    return (
      <div
        key={layer.id}
        className={`layer-item ${isSelected ? 'selected' : ''} ${dragOverLayer === layer.id ? 'drag-over' : ''} ${hasParent ? 'child' : ''}`}
        style={{ paddingLeft: `${16 + depth * 20}px` }}
        draggable={!layer.locked}
        onDragStart={(e) => handleDragStart(e, layer.id)}
        onDragOver={(e) => handleDragOver(e, layer.id)}
        onDrop={(e) => handleDrop(e, layer.id)}
        onDragEnd={handleDragEnd}
      >
        {/* Layer Controls */}
        <div className="layer-controls">
          {isGroup && (
            <button
              className="collapse-btn"
              onClick={() => onLayerUpdate(layer.id, { collapsed: !layer.collapsed })}
            >
              {layer.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
          )}

          <button
            className={`visibility-btn ${layer.visible ? 'visible' : 'hidden'}`}
            onClick={() => onLayerUpdate(layer.id, { visible: !layer.visible })}
            title={layer.visible ? 'Hide Layer' : 'Show Layer'}
          >
            {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>

          <button
            className={`lock-btn ${layer.locked ? 'locked' : 'unlocked'}`}
            onClick={() => onLayerUpdate(layer.id, { locked: !layer.locked })}
            title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
          >
            {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        </div>

        {/* Layer Icon and Name */}
        <div
          className="layer-info"
          onClick={() => onLayerSelect(layer.id, false)}
        >
          <span className="layer-icon">{getLayerIcon(layer.type)}</span>
          <span className="layer-name">{layer.name}</span>
          {isGroup && (
            <span className="layer-count">({layer.children?.length || 0})</span>
          )}
        </div>

        {/* Layer Actions */}
        <div className="layer-actions">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={layer.opacity}
            onChange={(e) => onLayerUpdate(layer.id, { opacity: parseFloat(e.target.value) })}
            title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
            className="opacity-slider"
          />

          <select
            value={layer.blendMode}
            onChange={(e) => onLayerUpdate(layer.id, { blendMode: e.target.value as Layer['blendMode'] })}
            title="Blend Mode"
            className="blend-mode-select"
          >
            {BLEND_MODES.map(mode => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>

          <button
            className="action-btn"
            onClick={() => onLayerDuplicate(layer.id)}
            title="Duplicate Layer"
          >
            <Copy size={12} />
          </button>

          <button
            className="action-btn delete"
            onClick={() => onLayerRemove(layer.id)}
            title="Delete Layer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  };

  const renderLayerTree = (layerList: Layer[]) => {
    return layerList.map((layer, index) => {
      const isCollapsed = layer.collapsed;
      const children = layer.children
        ? layers.filter(l => layer.children!.includes(l.id))
        : [];

      return (
        <div key={layer.id}>
          {renderLayerItem(layer, index)}
          {layer.children && layer.children.length > 0 && !isCollapsed && (
            <div className="layer-children">
              {renderLayerTree(children)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="layer-panel">
      <div className="panel-header">
        <h3>
          <Layers size={16} />
          Layers
        </h3>

        <div className="header-actions">
          <button
            className="add-layer-btn"
            onClick={() => {
              // Show layer type menu (simplified)
              onLayerAdd('video', 'New Layer');
            }}
            title="Add Layer"
          >
            <Plus size={14} />
          </button>

          {selectedLayerIds.length > 1 && (
            <button
              className="group-btn"
              onClick={() => onLayerGroup(selectedLayerIds, 'New Group')}
              title="Group Layers"
            >
              <Move size={14} />
            </button>
          )}

          {selectedLayerIds.length === 1 && layers.find(l => l.id === selectedLayerIds[0])?.children && (
            <button
              className="ungroup-btn"
              onClick={() => onLayerUngroup(selectedLayerIds[0])}
              title="Ungroup Layer"
            >
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="layers-container">
        {layerTree.length === 0 ? (
          <div className="no-layers">
            <Layers size={48} />
            <p>No layers in this composition</p>
            <button
              onClick={() => onLayerAdd('video', 'New Layer')}
              className="add-first-layer-btn"
            >
              <Plus size={16} />
              Add Layer
            </button>
          </div>
        ) : (
          renderLayerTree(layerTree)
        )}
      </div>

      {selectedLayerIds.length > 0 && (
        <div className="layer-properties">
          <h4>Layer Properties</h4>
          {selectedLayerIds.map(layerId => {
            const layer = layers.find(l => l.id === layerId);
            if (!layer) return null;

            return (
              <div key={layer.id} className="property-group">
                <h5>{layer.name}</h5>

                <div className="property-row">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={layer.name}
                    onChange={(e) => onLayerUpdate(layer.id, { name: e.target.value })}
                  />
                </div>

                <div className="property-row">
                  <label>Opacity:</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={layer.opacity}
                    onChange={(e) => onLayerUpdate(layer.id, { opacity: parseFloat(e.target.value) })}
                  />
                  <span>{Math.round(layer.opacity * 100)}%</span>
                </div>

                <div className="property-row">
                  <label>Position:</label>
                  <input
                    type="number"
                    value={layer.position.x}
                    onChange={(e) => onLayerUpdate(layer.id, {
                      position: { ...layer.position, x: parseInt(e.target.value) }
                    })}
                    placeholder="X"
                  />
                  <input
                    type="number"
                    value={layer.position.y}
                    onChange={(e) => onLayerUpdate(layer.id, {
                      position: { ...layer.position, y: parseInt(e.target.value) }
                    })}
                    placeholder="Y"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}