import React from 'react';
import { Users, Search, Plus } from 'lucide-react';
import { useStore } from '../../../store';

export interface PuppetLibraryProps {
  worldId: string;
  onElementSelect: (element: any) => void;
  className?: string;
}

export const PuppetLibrary: React.FC<PuppetLibraryProps> = ({
  worldId,
  onElementSelect,
  className = ''
}) => {
  const characters = useStore((state) => state.characters);

  // Convert characters to puppet format
  const puppets = characters.map(char => ({
    id: char.character_id,
    name: char.name,
    type: 'character',
    pose: 'standing'
  }));

  const handleDragStart = (puppet: any) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'puppet',
      assetId: puppet.id,
      name: puppet.name,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      properties: { pose: puppet.pose }
    }));
  };

  return (
    <div className={`puppet-library ${className}`}>
      <div className="library-header">
        <h3>Personnages</h3>
        <div className="search-bar">
          <Search size={16} />
          <input type="text" placeholder="Rechercher..." />
        </div>
      </div>

      <div className="library-content">
        {puppets.map(puppet => (
          <div
            key={puppet.id}
            className="library-item puppet-item"
            draggable
            onDragStart={handleDragStart(puppet)}
          >
            <div className="item-icon">
              <Users size={24} />
            </div>
            <div className="item-info">
              <div className="item-name">{puppet.name}</div>
              <div className="item-type">{puppet.pose}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};