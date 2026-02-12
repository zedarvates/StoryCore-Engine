/**
 * LocationAssetsPanel Component
 * 
 * Asset library browser for placing environmental assets in the scene.
 * Supports drag and drop functionality for asset placement.
 * 
 * File: creative-studio-ui/src/components/location/LocationAssetsPanel.tsx
 */

import React, { useState, useCallback } from 'react';
import { Search, Plus, Trash2, GripVertical, Package, FolderOpen } from 'lucide-react';
import type { Location, PlacedAsset } from '@/types/location';
import { v4 as uuidv4 } from 'uuid';
import './LocationAssetsPanel.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the LocationAssetsPanel component
 */
export interface LocationAssetsPanelProps {
  /** Location being edited */
  location: Location;
  
  /** Handler for updates */
  onUpdate: (updates: Partial<Location>) => void;
}

// ============================================================================
// Component
// ============================================================================

export function LocationAssetsPanel({
  location,
  onUpdate,
}: LocationAssetsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  
  // Mock asset library - in production, this would come from AssetService
  const assetLibrary = [
    { id: 'tree_oak', name: 'Oak Tree', category: 'Nature', thumbnail: '🌳' },
    { id: 'tree_pine', name: 'Pine Tree', category: 'Nature', thumbnail: '🌲' },
    { id: 'rock_large', name: 'Large Rock', category: 'Nature', thumbnail: '🪨' },
    { id: 'rock_small', name: 'Small Rock', category: 'Nature', thumbnail: '🪨' },
    { id: 'bush', name: 'Bush', category: 'Nature', thumbnail: '🌿' },
    { id: 'flower_red', name: 'Red Flower', category: 'Nature', thumbnail: '🌸' },
    { id: 'bench', name: 'Bench', category: 'Props', thumbnail: '🪑' },
    { id: 'lantern', name: 'Lantern', category: 'Props', thumbnail: '🏮' },
    { id: 'fountain', name: 'Fountain', category: 'Props', thumbnail: '⛲' },
    { id: 'statue', name: 'Statue', category: 'Props', thumbnail: '🗽' },
  ];
  
  const filteredAssets = assetLibrary.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const categories = [...new Set(assetLibrary.map((a) => a.category))];
  
  const handleAddAsset = useCallback((asset: typeof assetLibrary[0]) => {
    const newAsset: PlacedAsset = {
      id: uuidv4(),
      asset_id: asset.id,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1.0,
      visible: true,
    };
    
    onUpdate({ placed_assets: [...location.placed_assets, newAsset] });
    setSelectedAssetId(newAsset.id);
  }, [location.placed_assets, onUpdate]);
  
  const handleRemoveAsset = useCallback((assetId: string) => {
    onUpdate({
      placed_assets: location.placed_assets.filter((a) => a.id !== assetId),
    });
    if (selectedAssetId === assetId) {
      setSelectedAssetId(null);
    }
  }, [location.placed_assets, selectedAssetId, onUpdate]);
  
  const handleUpdateAsset = useCallback((assetId: string, updates: Partial<PlacedAsset>) => {
    onUpdate({
      placed_assets: location.placed_assets.map((a) =>
        a.id === assetId ? { ...a, ...updates } : a
      ),
    });
  }, [location.placed_assets, onUpdate]);
  
  const selectedPlacedAsset = location.placed_assets.find((a) => a.id === selectedAssetId);
  
  return (
    <div className="location-assets-panel">
      <div className="location-assets-panel__content">
        {/* Asset Library */}
        <div className="location-assets-panel__library">
          <div className="location-assets-panel__library-header">
            <h4 className="location-assets-panel__library-title">
              <FolderOpen size={16} />
              Asset Library
            </h4>
          </div>
          
          {/* Search */}
          <div className="location-assets-panel__search">
            <Search size={16} className="location-assets-panel__search-icon" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="location-assets-panel__search-input"
            />
          </div>
          
          {/* Categories */}
          <div className="location-assets-panel__categories">
            {categories.map((category) => (
              <button
                key={category}
                className="location-assets-panel__category"
              >
                {category}
              </button>
            ))}
          </div>
          
          {/* Asset Grid */}
          <div className="location-assets-panel__asset-grid">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                className="location-assets-panel__asset-btn"
                onClick={() => handleAddAsset(asset)}
              >
                <span className="location-assets-panel__asset-thumbnail">{asset.thumbnail}</span>
                <span className="location-assets-panel__asset-name">{asset.name}</span>
                <Plus size={14} className="location-assets-panel__asset-add" />
              </button>
            ))}
          </div>
        </div>
        
        {/* Placed Assets */}
        <div className="location-assets-panel__placed">
          <div className="location-assets-panel__placed-header">
            <h4 className="location-assets-panel__placed-title">
              <Package size={16} />
              Placed Assets ({location.placed_assets.length})
            </h4>
          </div>
          
          {location.placed_assets.length === 0 ? (
            <div className="location-assets-panel__empty">
              <Package size={40} />
              <p>No assets placed yet</p>
              <p className="location-assets-panel__empty-hint">Click an asset from the library to add it</p>
            </div>
          ) : (
            <div className="location-assets-panel__placed-list">
              {location.placed_assets.map((asset) => {
                const libraryAsset = assetLibrary.find((a) => a.id === asset.asset_id);
                return (
                  <div
                    key={asset.id}
                    className={`location-assets-panel__placed-item ${selectedAssetId === asset.id ? 'location-assets-panel__placed-item--selected' : ''}`}
                    onClick={() => setSelectedAssetId(asset.id)}
                  >
                    <GripVertical size={16} className="location-assets-panel__placed-drag" />
                    <span className="location-assets-panel__placed-thumbnail">
                      {libraryAsset?.thumbnail || '📦'}
                    </span>
                    <div className="location-assets-panel__placed-info">
                      <span className="location-assets-panel__placed-name">
                        {libraryAsset?.name || asset.asset_id}
                      </span>
                      <span className="location-assets-panel__placed-coords">
                        ({asset.position.x.toFixed(1)}, {asset.position.y.toFixed(1)}, {asset.position.z.toFixed(1)})
                      </span>
                    </div>
                    <button
                      className="location-assets-panel__placed-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAsset(asset.id);
                      }}
                      title="Remove asset"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Asset Properties */}
      {selectedPlacedAsset && (
        <div className="location-assets-panel__properties">
          <h4 className="location-assets-panel__properties-title">Transform</h4>
          
          <div className="location-assets-panel__property-group">
            <label>Position</label>
            <div className="location-assets-panel__property-row">
              <input
                type="number"
                value={selectedPlacedAsset.position.x}
                onChange={(e) => handleUpdateAsset(selectedPlacedAsset.id, {
                  position: { ...selectedPlacedAsset.position, x: parseFloat(e.target.value) || 0 }
                })}
                placeholder="X"
                step="0.1"
                aria-label="Position X"
              />
              <input
                type="number"
                value={selectedPlacedAsset.position.y}
                onChange={(e) => handleUpdateAsset(selectedPlacedAsset.id, {
                  position: { ...selectedPlacedAsset.position, y: parseFloat(e.target.value) || 0 }
                })}
                placeholder="Y"
                step="0.1"
                aria-label="Position Y"
              />
              <input
                type="number"
                value={selectedPlacedAsset.position.z}
                onChange={(e) => handleUpdateAsset(selectedPlacedAsset.id, {
                  position: { ...selectedPlacedAsset.position, z: parseFloat(e.target.value) || 0 }
                })}
                placeholder="Z"
                step="0.1"
                aria-label="Position Z"
              />
            </div>
          </div>
          
          <div className="location-assets-panel__property-group">
            <label>Rotation</label>
            <div className="location-assets-panel__property-row">
              <input
                type="number"
                value={selectedPlacedAsset.rotation.x}
                onChange={(e) => handleUpdateAsset(selectedPlacedAsset.id, {
                  rotation: { ...selectedPlacedAsset.rotation, x: parseFloat(e.target.value) || 0 }
                })}
                placeholder="Pitch"
                step="1"
              />
              <input
                type="number"
                value={selectedPlacedAsset.rotation.y}
                onChange={(e) => handleUpdateAsset(selectedPlacedAsset.id, {
                  rotation: { ...selectedPlacedAsset.rotation, y: parseFloat(e.target.value) || 0 }
                })}
                placeholder="Yaw"
                step="1"
              />
              <input
                type="number"
                value={selectedPlacedAsset.rotation.z}
                onChange={(e) => handleUpdateAsset(selectedPlacedAsset.id, {
                  rotation: { ...selectedPlacedAsset.rotation, z: parseFloat(e.target.value) || 0 }
                })}
                placeholder="Roll"
                step="1"
              />
            </div>
          </div>
          
          <div className="location-assets-panel__property-group">
            <label>Scale</label>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={selectedPlacedAsset.scale}
              onChange={(e) => handleUpdateAsset(selectedPlacedAsset.id, {
                scale: parseFloat(e.target.value) || 1.0
              })}
              className="location-assets-panel__scale-slider"
            />
            <span className="location-assets-panel__scale-value">{selectedPlacedAsset.scale.toFixed(1)}x</span>
          </div>
          
          <div className="location-assets-panel__property-group">
            <label className="location-assets-panel__checkbox-label">
              <input
                type="checkbox"
                checked={selectedPlacedAsset.visible}
                onChange={(e) => handleUpdateAsset(selectedPlacedAsset.id, {
                  visible: e.target.checked
                })}
              />
              Visible
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationAssetsPanel;
