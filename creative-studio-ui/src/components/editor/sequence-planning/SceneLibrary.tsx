import React from 'react';
import { Home, Search, Plus } from 'lucide-react';

export interface SceneLibraryProps {
  onElementSelect: (element: any) => void;
  className?: string;
}

export const SceneLibrary: React.FC<SceneLibraryProps> = ({
  onElementSelect,
  className = ''
}) => {
  const scenes = [
    { id: 'scene_1', name: 'Forêt Mystique', type: 'environment' },
    { id: 'scene_2', name: 'Château Ancien', type: 'building' },
    { id: 'scene_3', name: 'Plage Tropicale', type: 'nature' },
  ];

  const handleDragStart = (scene: any) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'decoration',
      assetId: scene.id,
      name: scene.name,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      properties: { type: scene.type }
    }));
  };

  return (
    <div className={`scene-library ${className}`}>
      <div className="library-header">
        <h3>Décors</h3>
        <div className="search-bar">
          <Search size={16} />
          <input type="text" placeholder="Rechercher..." />
        </div>
      </div>

      <div className="library-content">
        {scenes.map(scene => (
          <div
            key={scene.id}
            className="library-item scene-item"
            draggable
            onDragStart={handleDragStart(scene)}
          >
            <div className="item-icon">
              <Home size={24} />
            </div>
            <div className="item-info">
              <div className="item-name">{scene.name}</div>
              <div className="item-type">{scene.type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};