import React from 'react';
import { Home, Search, Plus, MapPin } from 'lucide-react';
import { useLocationStore } from '../../../stores/locationStore';
import './Library.css';

export interface SceneLibraryProps {
  onElementSelect: (element: unknown) => void;
  className?: string;
}

export const SceneLibrary: React.FC<SceneLibraryProps> = ({
  onElementSelect,
  className = ''
}) => {
  // Load locations from store
  const locations = useLocationStore((state) => state.locations);

  // Convert locations to scene format
  const scenes = locations.map(location => ({
    id: location.location_id,
    name: location.name,
    type: location.location_type || 'environment',
    description: location.metadata?.description
  }));

  const handleDragStart = (scene: unknown) => (e: React.DragEvent) => {
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
        {scenes.length === 0 ? (
          <div className="library-empty">
            <MapPin size={32} />
            <p>Aucun lieu disponible</p>
            <p className="empty-hint">Créez des lieux dans le dashboard</p>
          </div>
        ) : (
          scenes.map(scene => (
            <div
              key={scene.id}
              className="library-item scene-item"
              draggable
              onDragStart={handleDragStart(scene)}
              title={scene.description}
            >
              <div className="item-icon">
                <Home size={24} />
              </div>
              <div className="item-info">
                <div className="item-name">{scene.name}</div>
                <div className="item-type">{scene.type}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

