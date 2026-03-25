import React from 'react';
import { useStore } from '../../../store';
import { Users, MapPin, Ghost } from 'lucide-react';

interface ConsistencyAssetBrowserProps {
  onSelectAsset: (asset: any, type: 'character' | 'location') => void;
}

export const ConsistencyAssetBrowser: React.FC<ConsistencyAssetBrowserProps> = ({ onSelectAsset }) => {
  const { characters, locations } = useStore();

  const renderRole = (role: any) => {
    if (!role) return 'Actor';
    if (typeof role === 'string') return role;
    if (typeof role === 'object') {
      return role.archetype || role.name || 'Actor';
    }
    return 'Actor';
  };

  const renderSetting = (setting: any) => {
    if (!setting) return 'Set';
    if (typeof setting === 'string') return setting;
    if (typeof setting === 'object') {
      return setting.name || setting.type || 'Set';
    }
    return 'Set';
  };

  return (
    <div className="consistency-asset-browser p-4 bg-[#1a1a24] rounded-lg border border-[#333] mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Ghost className="text-blue-400" size={18} />
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Coherence Assets</h3>
      </div>

      <div className="space-y-6">
        {/* Characters Section */}
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400 uppercase">
            <Users size={14} />
            <span>Characters</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
                  className="group relative cursor-pointer overflow-hidden rounded-md border border-[#333] bg-[#252530] transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <div className="aspect-square w-full bg-[#111]">
                    {((char as any).appearance_sheet?.sheet_url || (char as any).sheet?.sheet_url) ? (
                      <img 
                        src={(char as any).appearance_sheet?.sheet_url || (char as any).sheet?.sheet_url} 
                        alt={char.name} 
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-500 italic">No Sheet</div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="truncate text-[10px] font-medium text-white">{char.name}</div>
                    <div className="text-[8px] text-gray-500">{renderRole((char as any).role)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-[10px] text-gray-500 italic py-2">No characters found in project.</div>
            )}
          </div>
        </div>

        {/* Locations Section */}
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400 uppercase">
            <MapPin size={14} />
            <span>Locations</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {locations.length > 0 ? (
              locations.map((loc) => (
                <div 
                  key={loc.location_id || (loc as any).id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('asset', JSON.stringify(loc));
                    e.dataTransfer.setData('assetType', 'location');
                  }}
                  onClick={() => onSelectAsset(loc, 'location')}
                  className="group relative cursor-pointer overflow-hidden rounded-md border border-[#333] bg-[#252530] transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <div className="aspect-video w-full bg-[#111]">
                    {((loc as any).appearance_sheet?.sheet_url || (loc as any).sheet?.sheet_url) ? (
                      <img 
                        src={(loc as any).appearance_sheet?.sheet_url || (loc as any).sheet?.sheet_url} 
                        alt={loc.name} 
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-500 italic">No Sheet</div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="truncate text-[10px] font-medium text-white">{loc.name}</div>
                    <div className="text-[8px] text-gray-500">{renderSetting((loc as any).setting)}</div>
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
