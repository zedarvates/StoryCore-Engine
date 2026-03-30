import React from 'react';
import { useStore } from '../../../store';
import { Users, MapPin, Ghost } from 'lucide-react';
import { Character } from '../../../types/character';
import { Location as ProductionLocation } from '../../../types/location';
import './shotConfig.css';

interface ConsistencyAssetBrowserProps {
  onSelectAsset: (asset: Character | ProductionLocation, type: 'character' | 'location') => void;
}

export const ConsistencyAssetBrowser: React.FC<ConsistencyAssetBrowserProps> = ({ onSelectAsset }) => {
  const { characters, locations } = useStore();

  const renderRole = (role: Character['role']) => {
    if (!role) return 'Actor';
    return role.archetype || 'Actor';
  };

  const renderSetting = (loc: ProductionLocation) => {
    return loc.location_type || 'Set';
  };

  // Helper to get thumbnail from character
  const getCharacterThumb = (char: Character): string | null => {
    if (char.visual_identity?.generated_portrait) return char.visual_identity.generated_portrait;
    if (char.visual_identity?.reference_sheet_images?.length > 0) return char.visual_identity.reference_sheet_images[0].url;
    if (char.visual_identity?.reference_images?.length > 0) return char.visual_identity.reference_images[0].url;
    return null;
  };

  // Helper to get thumbnail from location
  const getLocationThumb = (loc: ProductionLocation): string | null => {
    if (loc.metadata?.thumbnail_path) return loc.metadata.thumbnail_path;
    if (loc.cube_textures?.front?.image_path) return loc.cube_textures.front.image_path;
    return null;
  };

  return (
    <div className="consistency-asset-browser">
      <div className="browser-section-header">
        <div className="header-label-group">
          <Ghost className="text-[#6366f1]" size={16} />
          <h3 className="header-title">Coherence Assets</h3>
        </div>
      </div>

      <div className="space-y-6">
        {/* Characters Section */}
        <div className="asset-category">
          <div className="asset-category-label">
            <Users size={12} />
            <span>Characters</span>
          </div>
          <div className="asset-grid">
            {characters.length > 0 ? (
              characters.map((char) => (
                <div 
                  key={char.character_id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('asset', JSON.stringify(char));
                    e.dataTransfer.setData('assetType', 'character');
                  }}
                  onClick={() => onSelectAsset(char, 'character')}
                  className="asset-card-mini"
                >
                  <div className="asset-thumbnail-wrapper square">
                    {getCharacterThumb(char) ? (
                      <img 
                        src={getCharacterThumb(char)!} 
                        alt={char.name} 
                      />
                    ) : (
                      <div className="empty-sheet-placeholder">No Sheet</div>
                    )}
                  </div>
                  <div className="asset-details">
                    <div className="asset-name-mini">{char.name}</div>
                    <div className="asset-role-mini">{renderRole(char.role)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-[10px] text-gray-500 italic py-2">No characters found in project.</div>
            )}
          </div>
        </div>

        {/* Locations Section */}
        <div className="asset-category">
          <div className="asset-category-label">
            <MapPin size={12} />
            <span>Locations</span>
          </div>
          <div className="asset-grid">
            {locations.length > 0 ? (
              locations.map((loc) => (
                <div 
                  key={loc.location_id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('asset', JSON.stringify(loc));
                    e.dataTransfer.setData('assetType', 'location');
                  }}
                  onClick={() => onSelectAsset(loc, 'location')}
                  className="asset-card-mini"
                >
                  <div className="asset-thumbnail-wrapper">
                    {getLocationThumb(loc) ? (
                      <img 
                        src={getLocationThumb(loc)!} 
                        alt={loc.name} 
                      />
                    ) : (
                      <div className="empty-sheet-placeholder">No Sheet</div>
                    )}
                  </div>
                  <div className="asset-details">
                    <div className="asset-name-mini">{loc.name}</div>
                    <div className="asset-role-mini">{renderSetting(loc)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-[10px] text-gray-500 italic py-2">No locations found in project.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#333] text-[9px] text-gray-500 leading-tight">
        💡 <strong>Tip:</strong> Drag and drop an asset onto a shot to lock its visual coherence.
      </div>
    </div>
  );
};


