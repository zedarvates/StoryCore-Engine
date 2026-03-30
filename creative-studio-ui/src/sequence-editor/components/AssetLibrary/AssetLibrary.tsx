/**
 * Professional Asset Library Component
 * 
 * Styled to match DaVinci Resolve (Image 1).
 * Features a vertical navigation bar on the left (LibraryNavigator)
 * and a main content grid on the right (LibraryBrowser).
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { AssetGrid } from './AssetGrid';
import { TransitionLibrary } from './TransitionLibrary';
import { EffectLibrary } from './EffectLibrary';
import { AssetGenerationDialog } from './AssetGenerationDialog';
import { AssetDragLayer } from './AssetDragLayer';
import { useAppDispatch, useAppSelector } from '../../store';
import { setAssetCategory } from '../../store/slices/panelsSlice';
import { PresetLibrary } from './PresetLibrary';
import { AssetLibraryService, type AssetSource } from '../../../services/assetLibraryService';
import { ServiceAsset } from '../../types';
import { useProductionStore } from '../../../stores/productionStore';
import { MCPResourceLibrary } from './MCPResourceLibrary';

// Icons
import { 
  Users, Mountain, Box, Palette, Layout, Camera, 
  FlipHorizontal, Sparkles, Music, Video, Binary, Save, Search, Plus
} from 'lucide-react';

import './assetLibrary.css';

interface CategoryConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { id: 'neural', name: 'Neural Ledger', icon: <Sparkles className="w-4 h-4 text-indigo-400" /> },
  { id: 'characters', name: 'Characters', icon: <Users className="w-4 h-4" /> },
  { id: 'environments', name: 'Environments', icon: <Mountain className="w-4 h-4" /> },
  { id: 'props', name: 'Props & Objects', icon: <Box className="w-4 h-4" /> },
  { id: 'visual-styles', name: 'Visual Styles', icon: <Palette className="w-4 h-4" /> },
  { id: 'templates', name: 'Templates', icon: <Layout className="w-4 h-4" /> },
  { id: 'camera-presets', name: 'Camera Presets', icon: <Camera className="w-4 h-4" /> },
  { id: 'transitions', name: 'Transitions', icon: <FlipHorizontal className="w-4 h-4" /> },
  { id: 'effects', name: 'Effects', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'audio-sound', name: 'Audio & Sound', icon: <Music className="w-4 h-4" /> },
  { id: 'video-footage', name: 'Videos', icon: <Video className="w-4 h-4" /> },
  { id: '3d-models', name: '3D Models', icon: <Binary className="w-4 h-4" /> },
  { id: 'custom-presets', name: 'My Presets', icon: <Save className="w-4 h-4" /> },
  { id: 'mcp-resources', name: 'Remote Apps (MCP)', icon: <Binary className="w-4 h-4 text-blue-400" /> },
];

// Helper to get assets (keep original logic)
function getAssetsForCategory(categoryId: string, sources: AssetSource[], neuralAssets: any[]): ServiceAsset[] {
  const allAssets: ServiceAsset[] = [];
  
  if (categoryId === 'neural') {
    return neuralAssets.map(a => ({
      id: a.id,
      name: a.characterName || (a.type === 'STORY_PART_IMAGE' ? 'Story Concept' : 'Neural Asset'),
      type: 'image',
      url: a.url,
      thumbnailUrl: a.url,
      metadata: {
        category: a.type,
        tags: ['neural', 'ai-generated', a.type.toLowerCase().replace(/_/g, ' ')]
      }
    }));
  }

  for (const source of sources) {
    const sourceAssets = source.assets || [];
    switch (categoryId) {
      case 'characters': allAssets.push(...sourceAssets.filter(a => a.type === 'image' && (source.id === 'characters' || a.metadata?.category === 'character' || (Array.isArray(a.metadata?.tags) && a.metadata.tags.includes('character'))))); break;
      case 'environments': allAssets.push(...sourceAssets.filter(a => a.type === 'image' && (source.id === 'library' || source.id === 'images' || a.metadata?.category === 'demo' || a.metadata?.category === 'environment' || (Array.isArray(a.metadata?.tags) && (a.metadata.tags.includes('environment') || a.metadata.tags.includes('scene')))))); break;
      case 'props': allAssets.push(...sourceAssets.filter(a => a.type === 'image' && (a.metadata?.category === 'props' || (Array.isArray(a.metadata?.tags) && (a.metadata.tags.includes('prop') || a.metadata.tags.includes('object')))))); break;
      case 'visual-styles': allAssets.push(...sourceAssets.filter(a => a.type === 'image' && (a.metadata?.category === 'style' || (Array.isArray(a.metadata?.tags) && (a.metadata.tags.includes('style') || a.metadata.tags.includes('visual')))))); break;
      case 'templates': allAssets.push(...sourceAssets.filter(a => a.type === 'template' || source.type === 'template')); break;
      case 'camera-presets': allAssets.push(...sourceAssets.filter(a => a.type === 'image' && (a.name.includes('camera') || a.name.includes('shot')))); break;
      case 'video-footage': allAssets.push(...sourceAssets.filter(a => a.type === 'video' || (typeof a.metadata?.type === 'string' && a.metadata.type === 'video'))); break;
      case 'audio-sound': allAssets.push(...sourceAssets.filter(a => a.type === 'audio' || source.id === 'sound')); break;
      case '3d-models': allAssets.push(...sourceAssets.filter(a => (a.type as string) === '3d' || (Array.isArray(a.metadata?.tags) && a.metadata?.tags.includes('3d')) || (typeof a.metadata?.filename === 'string' && ['glb', 'gltf', 'obj', 'fbx'].some(ext => a.metadata?.filename?.toLowerCase().endsWith(ext))))); break;
      case 'transitions': 
        allAssets.push(...sourceAssets.filter(a => a.type === 'template' && (a.name.includes('transition') || a.metadata?.category === 'transition')));
        if (allAssets.length === 0 && source.id === 'builtin') {
          ['Dissolve', 'Wipe', 'Slide', 'Zoom', 'Smooth Cut'].forEach(name => {
             allAssets.push({ id: `trans_${name.toLowerCase().replace(' ', '_')}`, name, type: 'template', metadata: { category: 'transition' } });
          });
        }
        break;
      case 'effects': allAssets.push(...sourceAssets.filter(a => a.type === 'template' && (a.name.includes('effect') || a.metadata?.category === 'effect' || a.metadata?.category === 'lut'))); break;
    }
  }
  return allAssets;
}

export const AssetLibrary: React.FC = () => {
  const dispatch = useAppDispatch();
  const [sources, setSources] = useState<AssetSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeAssetCategory } = useAppSelector((state) => state.panels);
  const { manifestedAssets } = useProductionStore();
  const activeCategory = activeAssetCategory || 'environments';
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoading(true);
        const assetService = AssetLibraryService.getInstance();
        const loadedSources = await assetService.getAllAssets();
        setSources(loadedSources);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assets');
      } finally {
        setLoading(false);
      }
    };
    loadAssets();
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [searchQuery]);

  const currentCategory = CATEGORY_CONFIGS.find((c) => c.id === activeCategory) || CATEGORY_CONFIGS[0];
  const categoryAssets = useMemo(() => getAssetsForCategory(activeCategory, sources, manifestedAssets), [activeCategory, sources, manifestedAssets]);
  const fuse = useMemo(() => categoryAssets.length > 0 ? new Fuse(categoryAssets, { keys: [{ name: 'name', weight: 0.5 }, { name: 'metadata.tags', weight: 0.3 }], threshold: 0.4 }) : null, [categoryAssets]);

  const filteredAssets = useMemo(() => {
    if (!debouncedQuery.trim()) return categoryAssets;
    if (fuse) return fuse.search(debouncedQuery).map(r => r.item);
    return categoryAssets.filter(a => a.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
  }, [categoryAssets, debouncedQuery, fuse]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    dispatch(setAssetCategory(categoryId));
  }, [dispatch]);

  return (
    <div className="asset-library-v2">
      <AssetDragLayer />

      {/* Sidebar Navigator (Yellow-Green Zone from Image 2) */}
      <aside className="asset-library-sidebar">
        <div className="sidebar-header">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-4">Library</span>
        </div>
        <div className="sidebar-scroll-area">
          {CATEGORY_CONFIGS.map((category) => (
            <button
              key={category.id}
              className={`sidebar-tab ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => handleCategorySelect(category.id)}
            >
              <span className="tab-icon">{category.icon}</span>
              <span className="tab-name">{category.name}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
           <button className="new-asset-fab" onClick={() => setShowGenerationDialog(true)}>
             <Plus className="w-4 h-4" />
             <span className="text-[10px] font-bold uppercase">New IA</span>
           </button>
        </div>
      </aside>

      {/* Main Browser (Green Zone from Image 2) */}
      <main className="asset-library-browser">
         <header className="browser-header">
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
                ) : activeCategory === 'mcp-resources' ? (
                  <MCPResourceLibrary />
                ) : (
                  <AssetGrid assets={filteredAssets} categoryId={currentCategory.id} searchQuery={searchQuery} />
                )}
              </div>
            )}
         </div>
      </main>

      {showGenerationDialog && (
        <AssetGenerationDialog
          onClose={() => setShowGenerationDialog(false)}
          defaultCategory={currentCategory.id}
        />
      )}
    </div>
  );
};

export default AssetLibrary;
