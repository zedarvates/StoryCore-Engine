import React, { useState } from 'react';
import { useWorldBuilderSelectors } from '../../../stores/worldBuilderStore';
import { WorldMap2D } from './WorldMap2D';
import { WorldPreview3D } from './WorldPreview3D';
import { ElementInspector } from './ElementInspector';

export const WorldPreview: React.FC = () => {
  const { worldData } = useWorldBuilderSelectors();
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [selectedElement, setSelectedElement] = useState<any>(null);

  if (!worldData) {
    return (
      <div className="world-preview empty">
        <p>Complete world foundations to see preview</p>
      </div>
    );
  }

  return (
    <div className="world-preview">
      <div className="preview-controls">
        <button
          className={viewMode === '2d' ? 'active' : ''}
          onClick={() => setViewMode('2d')}
        >
          2D Map
        </button>
        <button
          className={viewMode === '3d' ? 'active' : ''}
          onClick={() => setViewMode('3d')}
        >
          3D Preview
        </button>
      </div>

      <div className="preview-content">
        {viewMode === '2d' ? (
          <WorldMap2D
            locations={worldData.locations}
            onElementSelect={setSelectedElement}
          />
        ) : (
          <WorldPreview3D
            worldData={worldData}
            onElementSelect={setSelectedElement}
          />
        )}
      </div>

      {selectedElement && (
        <ElementInspector
          element={selectedElement}
          onClose={() => setSelectedElement(null)}
        />
      )}
    </div>
  );
};