import React from 'react';
import { Package, Search, Plus, Box } from 'lucide-react';
import { useStore } from '../../../store';
import './Library.css';

export interface ObjectLibraryProps {
  onElementSelect: (element: unknown) => void;
  className?: string;
}

export const ObjectLibrary: React.FC<ObjectLibraryProps> = ({
  onElementSelect,
  className = ''
}) => {
  // Load objects from store
  const objects = useStore((state) => state.objects || []);

  const handleDragStart = (object: unknown) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'prop',
      assetId: object.id,
      name: object.name,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      properties: { 
        objectType: object.type,
        description: object.description
      }
    }));
  };

  return (
    <div className={`object-library ${className}`}>
      <div className="library-header">
        <h3>Objets & Props</h3>
        <div className="search-bar">
          <Search size={16} />
          <input type="text" placeholder="Rechercher..." />
        </div>
      </div>

      <div className="library-content">
        {objects.length === 0 ? (
          <div className="library-empty">
            <Box size={32} />
            <p>Aucun objet disponible</p>
            <p className="empty-hint">Créez des objets dans le dashboard</p>
          </div>
        ) : (
          objects.map((object: unknown) => (
            <div
              key={object.id}
              className="library-item object-item"
              draggable
              onDragStart={handleDragStart(object)}
              title={object.description}
            >
              <div className="item-icon">
                <Package size={24} />
              </div>
              <div className="item-info">
                <div className="item-name">{object.name}</div>
                {object.type && <div className="item-type">{object.type}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

