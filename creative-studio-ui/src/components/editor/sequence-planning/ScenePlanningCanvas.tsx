import React, { useState, useRef, useCallback } from 'react';
import {
  Move,
  RotateCw,
  Scale,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Grid3X3,
  Box,
  Camera,
  Sun,
  Zap,
  Users
} from 'lucide-react';
import { CanvasElement, SceneData, ViewMode } from './types';
import './ScenePlanningCanvas.css';

export interface ScenePlanningCanvasProps {
  scene: SceneData;
  viewMode: ViewMode;
  selectedElement: CanvasElement | null;
  onElementSelect: (element: CanvasElement | null) => void;
  onElementUpdate: (elementId: string, updates: Partial<CanvasElement>) => void;
  showGrid?: boolean;
  showGizmos?: boolean;
  className?: string;
}

export const ScenePlanningCanvas: React.FC<ScenePlanningCanvasProps> = ({
  scene,
  viewMode,
  selectedElement,
  onElementSelect,
  onElementUpdate,
  showGrid: initialShowGrid = true,
  showGizmos = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [transformMode, setTransformMode] = useState<'move' | 'rotate' | 'scale'>('move');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(initialShowGrid);

  const handleElementClick = useCallback((element: CanvasElement, event: React.MouseEvent) => {
    event.stopPropagation();
    onElementSelect(element);
  }, [onElementSelect]);

  const handleDragStart = useCallback((element: CanvasElement, event: React.DragEvent) => {
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
  }, []);

  const handleDragEnd = useCallback((elementId: string, event: React.DragEvent) => {
    if (!isDragging) return;

    const deltaX = (event.clientX - dragStart.x) / 10;
    const deltaY = (event.clientY - dragStart.y) / 10;

    const elements = scene.elements || [];
    const element = elements.find((el: CanvasElement) => el.id === elementId);
    if (element) {
      onElementUpdate(elementId, {
        position: {
          ...element.position,
          x: element.position.x + deltaX,
          y: element.position.y + deltaY
        }
      });
    }

    setIsDragging(false);
  }, [isDragging, dragStart, scene.elements, onElementUpdate]);

  const addElement = useCallback((element: Omit<CanvasElement, 'id'>) => {
    const newElement: CanvasElement = {
      ...element,
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const updatedScene = {
      ...scene,
      elements: [...(scene.elements || []), newElement]
    };
    // TODO: Update scene through props
  }, [scene]);

  const updateElement = useCallback((elementId: string, updates: Partial<CanvasElement>) => {
    onElementUpdate(elementId, updates);
  }, [onElementUpdate]);

  const deleteElement = useCallback((elementId: string) => {
    const elements = scene.elements || [];
    const updatedElements = elements.filter((el: CanvasElement) => el.id !== elementId);
    // TODO: Update scene through props
    if (selectedElement?.id === elementId) {
      onElementSelect(null);
    }
  }, [scene.elements, selectedElement, onElementSelect]);

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'puppet': return <Users size={32} />;
      case 'prop': return <Box size={32} />;
      case 'environment': return <Sun size={32} />;
      case 'camera': return <Camera size={32} />;
      case 'light': return <Zap size={32} />;
      default: return <Box size={32} />;
    }
  };

  const getSpeakerLabel = (assignment?: string) => {
    const labels: Record<string, string> = {
      'front-left': 'FL',
      'front-center': 'FC',
      'front-right': 'FR',
      'surround-left': 'SL',
      'surround-right': 'SR',
      'back-left': 'BL',
      'back-right': 'BR',
      'lfe': 'LFE',
      'auto': 'AUTO'
    };
    return assignment ? labels[assignment] || assignment : '';
  };

  return (
    <div className={`scene-planning-canvas ${className}`}>
      {/* Canvas Toolbar */}
      <div className="canvas-toolbar">
        <div className="transform-tools">
          <button
            className={`tool-btn ${transformMode === 'move' ? 'active' : ''}`}
            onClick={() => setTransformMode('move')}
            title="Déplacer"
          >
            <Move size={16} />
          </button>
          <button
            className={`tool-btn ${transformMode === 'rotate' ? 'active' : ''}`}
            onClick={() => setTransformMode('rotate')}
            title="Pivoter"
          >
            <RotateCw size={16} />
          </button>
          <button
            className={`tool-btn ${transformMode === 'scale' ? 'active' : ''}`}
            onClick={() => setTransformMode('scale')}
            title="Redimensionner"
          >
            <Scale size={16} />
          </button>
        </div>

        <div className="view-tools">
          <button
            className={`tool-btn ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
            title="Grille"
          >
            <Grid3X3 size={16} />
          </button>
          <button className="tool-btn" title="Caméra">
            <Camera size={16} />
          </button>
          <button className="tool-btn" title="Éclairage">
            <Sun size={16} />
          </button>
        </div>

        <div className="element-tools">
          {selectedElement && (
            <>
              <button
                className="tool-btn"
                onClick={() => updateElement(selectedElement.id, { visible: !selectedElement.visible })}
                title={selectedElement.visible ? 'Masquer' : 'Afficher'}
              >
                {selectedElement.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button
                className="tool-btn"
                onClick={() => {
                  const newElement = { ...selectedElement, id: `element_${Date.now()}` };
                  addElement(newElement);
                }}
                title="Dupliquer"
              >
                <Copy size={16} />
              </button>
              <button
                className="tool-btn danger"
                onClick={() => deleteElement(selectedElement.id)}
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={canvasRef}
        className={`canvas-area ${viewMode} ${showGrid ? 'show-grid' : ''}`}
        onClick={() => onElementSelect(null)}
        onDrop={(e) => {
          e.preventDefault();
          // Handle element drop from library
          try {
            const elementData = JSON.parse(e.dataTransfer.getData('application/json'));
            addElement(elementData);
          } catch (err) {
            console.error('Failed to parse dropped element:', err);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Grid Background */}
        {showGrid && (
          <div className="canvas-grid">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={`h-${i}`} className="grid-line horizontal" style={{ top: `${i * 5}%` }} />
            ))}
            {Array.from({ length: 20 }, (_, i) => (
              <div key={`v-${i}`} className="grid-line vertical" style={{ left: `${i * 5}%` }} />
            ))}
          </div>
        )}

        {/* Canvas Elements */}
        {(scene.elements || []).map((element: CanvasElement) => (
          <div
            key={element.id}
            className={`canvas-element ${element.type} ${selectedElement?.id === element.id ? 'selected' : ''} ${element.visible ? 'visible' : 'hidden'}`}
            style={{
              left: `${50 + (element.position?.x || 0) * 10}%`,
              top: `${50 + (element.position?.y || 0) * 10}%`,
              transform: `translate(-50%, -50%) rotate(${(element.rotation?.z || 0)}deg) scale(${(element.scale?.x || 1)})`
            }}
            onClick={(e) => handleElementClick(element, e)}
            draggable
            onDragStart={(e) => handleDragStart(element, e)}
            onDragEnd={(e) => handleDragEnd(element.id, e)}
          >
            <div className="element-content">
              {getElementIcon(element.type)}
            </div>
            <div className="element-label">{element.name}</div>

            {selectedElement?.id === element.id && showGizmos && (
              <div className="element-gizmo">
                <div className="gizmo-handle move" />
                <div className="gizmo-handle rotate" />
                <div className="gizmo-handle scale" />
              </div>
            )}

            {/* Audio spatialization indicator */}
            {element.audio?.enabled && element.audio.spatialization && (
              <div className="audio-indicator">
                <div className="speaker-icon">
                  {getSpeakerLabel(element.audio.speakerAssignment)}
                </div>
                <div
                  className="volume-indicator"
                  style={{ opacity: element.audio.volume || 1 }}
                />
              </div>
            )}
          </div>
        ))}

        {/* Drop Zone Indicator */}
        <div className="drop-zone">
          <div className="drop-message">
            Glissez-déposez des éléments ici
          </div>
        </div>
      </div>

      {/* Canvas Info */}
      <div className="canvas-info">
        <div className="info-item">
          <span className="label">Éléments:</span>
          <span className="value">{(scene.elements || []).length}</span>
        </div>
        <div className="info-item">
          <span className="label">Mode:</span>
          <span className="value">{viewMode.toUpperCase()}</span>
        </div>
        <div className="info-item">
          <span className="label">Sélection:</span>
          <span className="value">{selectedElement?.name || 'Aucune'}</span>
        </div>
      </div>
    </div>
  );
};

