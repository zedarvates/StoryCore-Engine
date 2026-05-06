/**
 * Professional Asset Library Hook - State and Logic Centralization
 * 
 * Manages asset loading, search indexing (Fuse.js), and category filtering
 * for both AssetNavigator and AssetBrowser components.
 */
import { LegacyAny } from '@/types/legacy';


import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { useAppDispatch, useAppSelector } from '../store';
import { setAssetCategory } from '../store/slices/panelsSlice';
import { AssetLibraryService, type AssetSource } from '../../services/assetLibraryService';
import { ServiceAsset } from '../types';

// Icons for navigator
import { 
  Users, Mountain, Box, Palette, Layout, Camera, 
  FlipHorizontal, Sparkles, Music, Video, Binary, Save
} from 'lucide-react';

export interface CategoryConfig {
  id: string;
  name: string;
  icon: JSX.Element;
}

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  { id: 'characters', name: 'Characters', icon: Users as LegacyAny },
  { id: 'environments', name: 'Environments', icon: Mountain as LegacyAny },
  { id: 'props', name: 'Props & Objects', icon: Box as LegacyAny },
  { id: 'visual-styles', name: 'Visual Styles', icon: Palette as LegacyAny },
  { id: 'templates', name: 'Templates', icon: Layout as LegacyAny },
  { id: 'camera-presets', name: 'Camera Presets', icon: Camera as LegacyAny },
  { id: 'transitions', name: 'Transitions', icon: FlipHorizontal as LegacyAny },
  { id: 'effects', name: 'Effects', icon: Sparkles as LegacyAny },
  { id: 'audio-sound', name: 'Audio & Sound', icon: Music as LegacyAny },
  { id: 'video-footage', name: 'Videos', icon: Video as LegacyAny },
  { id: '3d-models', name: '3D Models', icon: Binary as LegacyAny },
  { id: 'custom-presets', name: 'My Presets', icon: Save as LegacyAny },
];

function getAssetsForCategory(categoryId: string, sources: AssetSource[]): ServiceAsset[] {
  const allAssets: ServiceAsset[] = [];
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

export const useAssetLibrary = () => {
  const dispatch = useAppDispatch();
  const [sources, setSources] = useState<AssetSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeAssetCategory } = useAppSelector((state) => state.panels);
  const activeCategory = activeAssetCategory || 'environments';
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
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

  const categoryAssets = useMemo(() => getAssetsForCategory(activeCategory, sources), [activeCategory, sources]);
  const fuse = useMemo(() => categoryAssets.length > 0 ? new Fuse(categoryAssets, { keys: [{ name: 'name', weight: 0.5 }, { name: 'metadata.tags', weight: 0.3 }], threshold: 0.4 }) : null, [categoryAssets]);

  const filteredAssets = useMemo(() => {
    if (!debouncedQuery.trim()) return categoryAssets;
    if (fuse) return fuse.search(debouncedQuery).map(r => r.item);
    return categoryAssets.filter(a => a.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
  }, [categoryAssets, debouncedQuery, fuse]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    dispatch(setAssetCategory(categoryId));
  }, [dispatch]);

  return {
    sources,
    loading,
    error,
    activeCategory,
    searchQuery,
    setSearchQuery,
    filteredAssets,
    handleCategorySelect,
    categoryConfigs: CATEGORY_CONFIGS,
    currentCategory: CATEGORY_CONFIGS.find(c => c.id === activeCategory) || CATEGORY_CONFIGS[0]
  };
};
