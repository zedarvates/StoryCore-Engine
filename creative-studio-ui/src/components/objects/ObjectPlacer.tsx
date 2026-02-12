/**
 * 3D Object Placer Component
 * 
 * Interface for placing 3D objects into scenes with drag-and-drop positioning.
 * Requirements: 3D object library integration, position controls, real-time preview
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import './ObjectPlacer.css';

interface Object3D {
  id: string;
  name: string;
  category: string;
  tags?: string[];
  thumbnail?: string;
}

interface ObjectPlacerProps {
  /** Current scene background image */
  backgroundImage?: string;
  
  /** Canvas dimensions */
  width: number;
  height: number;
  
  /** Current camera settings for perspective matching */
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  cameraFOV: number;
  
  /** Existing placements */
  placements: ObjectPlacement3D[];
  
  /** Called when placement changes */
  onPlacementsChange: (placements: ObjectPlacement3D[]) => void;
  
  /** Called when an object is selected */
  onObjectSelect?: (placementId: string | null) => void;
  
  /** Available 3D objects from library */
  availableObjects: Object3D[];
}

interface ObjectPlacement3D {
  placementId: string;
  objectId: string;
  objectName: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  visible: boolean;
  depth: number;
}

/**
 * Transform mode for object manipulation
 */
type TransformMode = 'translate' | 'rotate' | 'scale';

/**
 * 3D Object Placer Component
 */
export const ObjectPlacer: React.FC<ObjectPlacerProps> = ({
  backgroundImage,
  width,
  height,
  cameraPosition,
  cameraTarget,
  cameraFOV,
  placements,
  onPlacementsChange,
  onObjectSelect,
  availableObjects,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // State
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showObjectLibrary, setShowObjectLibrary] = useState(false);
  
  // Calculate 2D screen positions from 3D placements
  const screenPlacements = useMemo(() => {
    return placements.map(placement => ({
      ...placement,
      screenPosition: calculateScreenPosition(
        placement.position,
        cameraPosition,
        cameraTarget,
        cameraFOV,
        width,
        height
      ),
      scaleFactor: calculateScaleFactor(
        placement.position,
        cameraPosition,
        cameraFOV,
        height
      ),
    }));
  }, [placements, cameraPosition, cameraTarget, cameraFOV, width, height]);
  
  // Handle mouse down on placement
  const handlePlacementMouseDown = useCallback((e: React.MouseEvent, placementId: string) => {
    e.stopPropagation();
    setSelectedPlacementId(placementId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    onObjectSelect?.(placementId);
  }, [onObjectSelect]);
  
  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedPlacementId) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Update placement based on transform mode
    onPlacementsChange(placements.map(p => {
      if (p.placementId !== selectedPlacementId) return p;
      
      if (transformMode === 'translate') {
        // Convert screen movement to 3D position change
        const position = { ...p.position };
        
        // X movement affects X and Z (based on camera angle)
        position.x += deltaX * 0.01;
        
        // Y movement affects Y (up/down)
        position.y -= deltaY * 0.01;
        
        // Recalculate Z based on depth sorting
        position.z = calculateDepthFromPosition(position, cameraPosition);
        
        return { ...p, position, depth: position.z };
      } else if (transformMode === 'rotate') {
        // Rotate based on drag direction
        return {
          ...p,
          rotation: {
            x: p.rotation.x + deltaY * 0.5,
            y: p.rotation.y + deltaX * 0.5,
            z: p.rotation.z,
          },
        };
      } else if (transformMode === 'scale') {
        // Scale based on drag distance
        const scaleDelta = 1 + (deltaY * 0.01);
        return {
          ...p,
          scale: {
            x: p.scale.x * scaleDelta,
            y: p.scale.y * scaleDelta,
            z: p.scale.z * scaleDelta,
          },
        };
      }
      return p;
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, selectedPlacementId, dragStart, placements, transformMode, cameraPosition, onPlacementsChange]);
  
  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Handle canvas click (deselect)
  const handleCanvasClick = useCallback(() => {
    setSelectedPlacementId(null);
    onObjectSelect?.(null);
  }, [onObjectSelect]);
  
  // Add new object from library
  const handleAddObject = useCallback((object: Object3D) => {
    const newPlacement: ObjectPlacement3D = {
      placementId: `placement_${Date.now()}`,
      objectId: object.id,
      objectName: object.name,
      position: { x: 0, y: 0, z: 2 }, // Place in front of camera
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      depth: 2,
    };
    
    onPlacementsChange([...placements, newPlacement]);
    setShowObjectLibrary(false);
    
    toast({
      title: 'Object Added',
      description: `Added ${object.name} to scene`,
      variant: 'success',
    });
  }, [placements, onPlacementsChange, toast]);
  
  // Remove selected object
  const handleRemoveObject = useCallback(() => {
    if (!selectedPlacementId) return;
    
    onPlacementsChange(placements.filter(p => p.placementId !== selectedPlacementId));
    setSelectedPlacementId(null);
    
    toast({
      title: 'Object Removed',
      variant: 'info',
    });
  }, [selectedPlacementId, placements, onPlacementsChange, toast]);
  
  // Update placement properties
  const updatePlacement = useCallback((updates: Partial<ObjectPlacement3D>) => {
    if (!selectedPlacementId) return;
    
    onPlacementsChange(placements.map(p =>
      p.placementId === selectedPlacementId
        ? { ...p, ...updates }
        : p
    ));
  }, [selectedPlacementId, placements, onPlacementsChange]);
  
  // Get selected placement
  const selectedPlacement = placements.find(p => p.placementId === selectedPlacementId);
  
  return (
    <div className="object-placer">
      {/* Canvas / Preview Area */}
      <div
        ref={containerRef}
        className="object-placer-canvas"
        style={{ width, height }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        {/* Background Image */}
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt="Scene background"
            className="scene-background"
            style={{ width, height }}
          />
        )}
        
        {/* Placed Objects */}
        {screenPlacements.map(placement => (
          <ObjectPreview
            key={placement.placementId}
            placement={placement}
            isSelected={placement.placementId === selectedPlacementId}
            onMouseDown={(e) => handlePlacementMouseDown(e, placement.placementId)}
          />
        ))}
        
        {/* Grid Overlay */}
        <div className="grid-overlay" />
      </div>
      
      {/* Toolbar */}
      <div className="object-placer-toolbar">
        {/* Transform Mode Selector */}
        <div className="transform-mode-selector">
          <button
            className={`transform-btn ${transformMode === 'translate' ? 'active' : ''}`}
            onClick={() => setTransformMode('translate')}
            title="Move (G)"
          >
            <MoveIcon />
          </button>
          <button
            className={`transform-btn ${transformMode === 'rotate' ? 'active' : ''}`}
            onClick={() => setTransformMode('rotate')}
            title="Rotate (R)"
          >
            <RotateIcon />
          </button>
          <button
            className={`transform-btn ${transformMode === 'scale' ? 'active' : ''}`}
            onClick={() => setTransformMode('scale')}
            title="Scale (S)"
          >
            <ScaleIcon />
          </button>
        </div>
        
        {/* Add Object Button */}
        <button
          className="add-object-btn"
          onClick={() => setShowObjectLibrary(true)}
          title="Add 3D Object"
        >
          <PlusIcon />
          <span>Add Object</span>
        </button>
        
        {/* Selected Object Info */}
        {selectedPlacement && (
          <div className="selected-info">
            <span className="object-name">{selectedPlacement.objectName}</span>
            <span className="position-display">
              ({selectedPlacement.position.x.toFixed(1)}, {selectedPlacement.position.y.toFixed(1)}, {selectedPlacement.position.z.toFixed(1)})
            </span>
          </div>
        )}
        
        {/* Delete Button */}
        {selectedPlacement && (
          <button
            className="delete-btn"
            onClick={handleRemoveObject}
            title="Remove Object"
          >
            <TrashIcon />
          </button>
        )}
      </div>
      
      {/* Object Library Panel */}
      {showObjectLibrary && (
        <ObjectLibraryPanel
          objects={availableObjects}
          onSelect={handleAddObject}
          onClose={() => setShowObjectLibrary(false)}
        />
      )}
      
      {/* Properties Panel for Selected Object */}
      {selectedPlacement && (
        <ObjectPropertiesPanel
          placement={selectedPlacement}
          onChange={updatePlacement}
        />
      )}
    </div>
  );
};

/**
 * Object preview rendered on canvas
 */
const ObjectPreview: React.FC<{
  placement: ObjectPlacement3D & { screenPosition: { x: number; y: number }; scaleFactor: number };
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ placement, isSelected, onMouseDown }) => {
  const size = 60 * placement.scaleFactor;
  
  return (
    <div
      className={`object-preview ${isSelected ? 'selected' : ''}`}
      style={{
        left: placement.screenPosition.x - size / 2,
        top: placement.screenPosition.y - size / 2,
        width: size,
        height: size,
      }}
      onMouseDown={onMouseDown}
    >
      {/* Placeholder for 3D object */}
      <div className="object-preview-inner">
        {isSelected && (
          <div className="selection-indicator">
            {/* Corner handles */}
            <span className="handle handle-tl" />
            <span className="handle handle-tr" />
            <span className="handle handle-bl" />
            <span className="handle handle-br" />
          </div>
        )}
        
        {/* Object icon/placeholder */}
        <span className="object-icon">📦</span>
        
        {/* Depth indicator */}
        <span className="depth-indicator">{placement.depth.toFixed(1)}m</span>
      </div>
    </div>
  );
};

/**
 * Object Library Panel
 */
const ObjectLibraryPanel: React.FC<{
  objects: Object3D[];
  onSelect: (object: Object3D) => void;
  onClose: () => void;
}> = ({ objects, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const filteredObjects = useMemo(() => {
    return objects.filter(obj => {
      const matchesSearch = obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obj.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || obj.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [objects, searchTerm, categoryFilter]);
  
  const categories = useMemo(() => {
    return [...new Set(objects.map(obj => obj.category))];
  }, [objects]);
  
  return (
    <div className="object-library-panel">
      <div className="panel-header">
        <h3>3D Object Library</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="panel-search">
        <input
          type="text"
          placeholder="Search objects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search objects"
        />
      </div>
      
      <div className="panel-filters">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          title="Filter by category"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      
      <div className="panel-objects">
        {filteredObjects.map(obj => (
          <div
            key={obj.id}
            className="library-object-card"
            onClick={() => onSelect(obj)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(obj);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Select ${obj.name}`}
          >
            <div className="object-thumbnail">
              {obj.thumbnail ? (
                <img src={obj.thumbnail} alt={obj.name} />
              ) : (
                <div className="thumbnail-placeholder">📦</div>
              )}
            </div>
            <div className="object-info">
              <span className="object-name">{obj.name}</span>
              <span className="object-category">{obj.category}</span>
            </div>
          </div>
        ))}
        
        {filteredObjects.length === 0 && (
          <div className="no-results">
            <p>No objects found</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Object Properties Panel
 */
const ObjectPropertiesPanel: React.FC<{
  placement: ObjectPlacement3D;
  onChange: (updates: Partial<ObjectPlacement3D>) => void;
}> = ({ placement, onChange }) => {
  return (
    <div className="object-properties-panel">
      <div className="panel-header">
        <h3>Object Properties</h3>
      </div>
      
      {/* Position */}
      <div className="property-group">
        <label>Position</label>
        <div className="property-inputs">
          <div className="input-row">
            <span>X</span>
            <input
              type="number"
              step="0.1"
              value={placement.position.x.toFixed(2)}
              onChange={(e) => onChange({
                position: { ...placement.position, x: Number.parseFloat(e.target.value) || 0 }
              })}
              aria-label="Position X"
            />
          </div>
          <div className="input-row">
            <span>Y</span>
            <input
              type="number"
              step="0.1"
              value={placement.position.y.toFixed(2)}
              onChange={(e) => onChange({
                position: { ...placement.position, y: Number.parseFloat(e.target.value) || 0 }
              })}
              aria-label="Position Y"
            />
          </div>
          <div className="input-row">
            <span>Z</span>
            <input
              type="number"
              step="0.1"
              value={placement.position.z.toFixed(2)}
              onChange={(e) => onChange({
                position: { ...placement.position, z: Number.parseFloat(e.target.value) || 0 }
              })}
              aria-label="Position Z"
            />
          </div>
        </div>
      </div>
      
      {/* Rotation */}
      <div className="property-group">
        <label>Rotation</label>
        <div className="property-inputs">
          <div className="input-row">
            <span>X</span>
            <input
              type="number"
              step="5"
              value={Math.round(placement.rotation.x)}
              onChange={(e) => onChange({
                rotation: { ...placement.rotation, x: Number.parseFloat(e.target.value) || 0 }
              })}
              aria-label="Rotation X"
            />
          </div>
          <div className="input-row">
            <span>Y</span>
            <input
              type="number"
              step="5"
              value={Math.round(placement.rotation.y)}
              onChange={(e) => onChange({
                rotation: { ...placement.rotation, y: Number.parseFloat(e.target.value) || 0 }
              })}
              aria-label="Rotation Y"
            />
          </div>
          <div className="input-row">
            <span>Z</span>
            <input
              type="number"
              step="5"
              value={Math.round(placement.rotation.z)}
              onChange={(e) => onChange({
                rotation: { ...placement.rotation, z: Number.parseFloat(e.target.value) || 0 }
              })}
              aria-label="Rotation Z"
            />
          </div>
        </div>
      </div>
      
      {/* Scale */}
      <div className="property-group">
        <label>Scale</label>
        <div className="property-inputs">
          <div className="input-row">
            <span>X</span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={placement.scale.x.toFixed(2)}
              onChange={(e) => onChange({
                scale: { ...placement.scale, x: Number.parseFloat(e.target.value) || 1 }
              })}
              aria-label="Scale X"
            />
          </div>
          <div className="input-row">
            <span>Y</span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={placement.scale.y.toFixed(2)}
              onChange={(e) => onChange({
                scale: { ...placement.scale, y: Number.parseFloat(e.target.value) || 1 }
              })}
              aria-label="Scale Y"
            />
          </div>
          <div className="input-row">
            <span>Z</span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={placement.scale.z.toFixed(2)}
              onChange={(e) => onChange({
                scale: { ...placement.scale, z: Number.parseFloat(e.target.value) || 1 }
              })}
              aria-label="Scale Z"
            />
          </div>
        </div>
      </div>
      
      {/* Visibility */}
      <div className="property-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={placement.visible}
            onChange={(e) => onChange({ visible: e.target.checked })}
          />
          <span>Visible</span>
        </label>
      </div>
    </div>
  );
};

// Helper functions for 3D to 2D projection
function calculateScreenPosition(
  position3D: { x: number; y: number; z: number },
  cameraPosition: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number },
  fov: number,
  screenWidth: number,
  screenHeight: number
): { x: number; y: number } {
  // Calculate camera forward vector
  const forward = {
    x: cameraTarget.x - cameraPosition.x,
    y: cameraTarget.y - cameraPosition.y,
    z: cameraTarget.z - cameraPosition.z,
  };
  
  // Normalize forward vector
  const forwardLen = Math.hypot(forward.x, forward.y, forward.z);
  const normalizedForward = {
    x: forward.x / forwardLen,
    y: forward.y / forwardLen,
    z: forward.z / forwardLen,
  };
  
  // Calculate relative position
  const relPos = {
    x: position3D.x - cameraPosition.x,
    y: position3D.y - cameraPosition.y,
    z: position3D.z - cameraPosition.z,
  };
  
  // Project to screen
  const fovRad = (fov * Math.PI) / 180;
  const tanFov = Math.tan(fovRad / 2);
  const aspect = screenWidth / screenHeight;
  
  // Calculate distance
  const distance = relPos.x * normalizedForward.x +
    relPos.y * normalizedForward.y +
    relPos.z * normalizedForward.z;
  
  if (distance <= 0.1) {
    return { x: screenWidth / 2, y: screenHeight / 2 };
  }
  
  // Simplified projection
  const screenX = screenWidth / 2 + (relPos.x / (distance * tanFov * aspect)) * screenWidth / 2;
  const screenY = screenHeight / 2 - (relPos.y / (distance * tanFov)) * screenHeight / 2;
  
  return { x: screenX, y: screenY };
}

function calculateScaleFactor(
  position3D: { x: number; y: number; z: number },
  cameraPosition: { x: number; y: number; z: number },
  fov: number,
  screenHeight: number
): number {
  const distance = Math.hypot(
    position3D.x - cameraPosition.x,
    position3D.y - cameraPosition.y,
    position3D.z - cameraPosition.z
  );
  
  if (distance < 0.1) return 1;
  
  const fovRad = (fov * Math.PI) / 180;
  const tanFov = Math.tan(fovRad / 2);
  
  return 1 / (distance * tanFov) * screenHeight / 5;
}

function calculateDepthFromPosition(
  position: { x: number; y: number; z: number },
  cameraPosition: { x: number; y: number; z: number }
): number {
  return Math.hypot(
    position.x - cameraPosition.x,
    position.y - cameraPosition.y,
    position.z - cameraPosition.z
  );
}

// Icon components
const MoveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
  </svg>
);

const RotateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

const ScaleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 21l-6-6m6 6v-4m0 4h-4M3 3l6 6M3 3v4m0-4h4m9-9l-6-6m-6 6l-6 6" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

export default ObjectPlacer;

