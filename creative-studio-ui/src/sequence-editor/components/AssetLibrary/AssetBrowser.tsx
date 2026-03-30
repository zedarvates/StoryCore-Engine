/**
 * Asset Browser Component - Second Top Zone (Green in Image 2)
 * 
 * Displays the grid of assets based on the active category from the navigator.
 * Includes search bar and specialized views for transitions, effects, etc.
 */

import React from 'react';
import { useAssetLibrary } from '../../hooks/useAssetLibrary';
import { AssetGrid } from './AssetGrid';
import { TransitionLibrary } from './TransitionLibrary';
import { EffectLibrary } from './EffectLibrary';
import { PresetLibrary } from './PresetLibrary';
import { Search, Binary } from 'lucide-react';

interface AssetBrowserProps {
  title?: string;
}

export const AssetBrowser: React.FC<AssetBrowserProps> = ({ title }) => {
  const { 
    loading, error, activeCategory, currentCategory, searchQuery, 
    setSearchQuery, filteredAssets, sources 
  } = useAssetLibrary();

  return (
    <main className="asset-library-browser">
       <header className="browser-header">
         {title && <div className="browser-title">{title}</div>}
         <div className="search-group glassmorphic-dark">
           <Search className="w-3.5 h-3.5 opacity-40 ml-3" />
           <input
             type="text"
             placeholder={`Search ${currentCategory.name.toLowerCase()}...`}
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="browser-search-input"
           />
           {searchQuery && (
             <button className="mr-2 opacity-50 hover:opacity-100" onClick={() => setSearchQuery('')}>✕</button>
           )}
         </div>
       </header>

       <div className="browser-content-area">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <div className="animate-spin mb-4"><Binary className="w-8 h-8" /></div>
              <p className="text-sm font-medium">Indexing Assets...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">
              <p className="mb-4">{error}</p>
              <button className="btn-secondary" onClick={() => window.location.reload()}>Retry</button>
            </div>
          ) : (
            <div className="asset-browser-grid-container">
              {activeCategory === 'transitions' ? (
                <TransitionLibrary sources={sources} searchQuery={searchQuery} />
              ) : activeCategory === 'effects' ? (
                <EffectLibrary sources={sources} searchQuery={searchQuery} />
              ) : activeCategory === 'custom-presets' ? (
                <PresetLibrary />
              ) : (
                <AssetGrid assets={filteredAssets} categoryId={currentCategory.id} searchQuery={searchQuery} />
              )}
            </div>
          )}
       </div>
    </main>
  );
};

export default AssetBrowser;
