import React from 'react';
import { WorldData } from '../../../stores/worldBuilderStore';

interface WorldPreview3DProps {
  worldData: WorldData;
  onElementSelect: (element: any) => void;
}

export const WorldPreview3D: React.FC<WorldPreview3DProps> = ({ worldData, onElementSelect }) => {
  return (
    <div className="world-preview-3d">
      <h3>World Preview (3D)</h3>
      <div className="preview-canvas">
        <p>3D preview not implemented yet</p>
        <div className="world-summary">
          <h4>{worldData.foundations.name}</h4>
          <p>Genre: {worldData.foundations.genre}</p>
          <p>Locations: {worldData.locations.length}</p>
          <p>Societies: {worldData.culture.societies.length}</p>
        </div>
      </div>
    </div>
  );
};