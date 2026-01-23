import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  Zap
} from 'lucide-react';
import { Scene } from '@/types/sequencePlan';
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
  showGrid = true,
  showGizmos = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [transformMode, setTransformMode] = useState<'move' | 'rotate' | 'scale'>('move');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

    const deltaX = (event.clientX - dragStart.x) / 10; // Convert to scene units
    const deltaY = (event.clientY - dragStart.y) / 10;

    const element = scene.elements.find(el => el.id === elementId);
    if (element) {
      updateElement(elementId, {
        position: {
          ...element.position,
          x: element.position.x + deltaX,
          y: element.position.y + deltaY
        }
      });
    }

    setIsDragging(false);
  }, [isDragging, dragStart, scene.elements, updateElement]);

  const handleDragEnd = useCallback((elementId: string, event: React.DragEvent) => {
    if (!isDragging) return;

    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;

    setCanvasData(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === elementId
          ? {
              ...el,
              position: {
                ...el.position,
                x: el.position.x + deltaX * 0.01,
                y: el.position.y - deltaY * 0.01
              }
            }
          : el
      )
    }));

    setIsDragging(false);
  }, [isDragging, dragStart]);

  const addElement = useCallback((element: Omit<CanvasElement, 'id'>) => {
    const newElement: CanvasElement = {
      ...element,
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const updatedScene = {
      ...scene,
      elements: [...scene.elements, newElement]
    };
    // TODO: Update scene through props
  }, [scene]);

  const updateElement = useCallback((elementId: string, updates: Partial<CanvasElement>) => {
    onElementUpdate(elementId, updates);
  }, [onElementUpdate]);

  const deleteElement = useCallback((elementId: string) => {
    const updatedElements = scene.elements.filter(el => el.id !== elementId);
    // TODO: Update scene through props
    if (selectedElement?.id === elementId) {
      onElementSelect(null);
    }
  }, [scene.elements, selectedElement, onElementSelect]);

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
          const elementData = JSON.parse(e.dataTransfer.getData('application/json'));
          addElement(elementData);
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
        {scene.elements.map(element => (
          <div
            key={element.id}
            className={`canvas-element ${element.type} ${selectedElement?.id === element.id ? 'selected' : ''} ${element.visible ? 'visible' : 'hidden'}`}
            style={{
              left: `${50 + element.position.x * 10}%`,
              top: `${50 + element.position.y * 10}%`,
              transform: `translate(-50%, -50%) rotate(${element.rotation.z}deg) scale(${element.scale.x})`
            }}
            onClick={(e) => handleElementClick(element, e)}
            draggable
            onDragStart={(e) => handleDragStart(element, e)}
            onDragEnd={(e) => handleDragEnd(element.id, e)}
          >
            <div className="element-content">
              {element.type === 'puppet' && <Users size={32} />}
              {element.type === 'prop' && <Box size={32} />}
              {element.type === 'environment' && <Sun size={32} />}
              {element.type === 'camera' && <Camera size={32} />}
              {element.type === 'light' && <Zap size={32} />}
            </div>
            <div className="element-label">{element.name}</div>

            {selectedElement?.id === element.id && showGizmos && (
              <div className="element-gizmo">
                {/* Transform gizmos would go here */}
                <div className="gizmo-handle move" />
                <div className="gizmo-handle rotate" />
                <div className="gizmo-handle scale" />
              </div>
            )}

            {/* Audio spatialization indicator */}
            {element.audio?.enabled && element.audio.spatialization && (
              <div className="audio-indicator">
                <div className="speaker-icon">
                  {element.audio.speakerAssignment === 'front-left' && 'FL'}
                  {element.audio.speakerAssignment === 'front-center' && 'FC'}
                  {element.audio.speakerAssignment === 'front-right' && 'FR'}
                  {element.audio.speakerAssignment === 'surround-left' && 'SL'}
                  {element.audio.speakerAssignment === 'surround-right' && 'SR'}
                  {element.audio.speakerAssignment === 'back-left' && 'BL'}
                  {element.audio.speakerAssignment === 'back-right' && 'BR'}
                  {element.audio.speakerAssignment === 'lfe' && 'LFE'}
                  {element.audio.speakerAssignment === 'auto' && 'AUTO'}
                </div>
                <div
                  className="volume-indicator"
                  style={{ opacity: element.audio.volume }}
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
          <span className="value">{scene.elements.length}</span>
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