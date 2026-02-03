/**
 * Assets Slice - Redux state management for asset library
 * Requirements: 5.1, 5.2, 5.7, 19.1
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AssetsState, Asset, AssetCategory } from '../../types';

// Default asset categories
const DEFAULT_CATEGORIES: AssetCategory[] = [
  { id: 'characters', name: 'Characters', icon: 'user', assets: [] },
  { id: 'environments', name: 'Environments', icon: 'landscape', assets: [] },
  { id: 'props', name: 'Props & Objects', icon: 'cube', assets: [] },
  { id: 'visual-styles', name: 'Visual Styles', icon: 'palette', assets: [] },
  { id: 'templates', name: 'Templates & Styles', icon: 'template', assets: [] },
  { id: 'camera-presets', name: 'Camera Presets', icon: 'camera', assets: [] },
  { id: 'lighting-rigs', name: 'Lighting Rigs', icon: 'lightbulb', assets: [] },
];

const initialState: AssetsState = {
  categories: DEFAULT_CATEGORIES,
  searchQuery: '',
  activeCategory: 'characters',
};

const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    addAsset: (state, action: PayloadAction<{ categoryId: string; asset: Asset }>) => {
      const { categoryId, asset } = action.payload;
      const category = state.categories.find((cat) => cat.id === categoryId);
      if (category) {
        category.assets.push(asset);
      }
    },
    updateAsset: (
      state,
      action: PayloadAction<{ categoryId: string; assetId: string; updates: Partial<Asset> }>
    ) => {
      const { categoryId, assetId, updates } = action.payload;
      const category = state.categories.find((cat) => cat.id === categoryId);
      if (category) {
        const assetIndex = category.assets.findIndex((asset) => asset.id === assetId);
        if (assetIndex !== -1) {
          category.assets[assetIndex] = { ...category.assets[assetIndex], ...updates };
        }
      }
    },
    deleteAsset: (state, action: PayloadAction<{ categoryId: string; assetId: string }>) => {
      const { categoryId, assetId } = action.payload;
      const category = state.categories.find((cat) => cat.id === categoryId);
      if (category) {
        category.assets = category.assets.filter((asset) => asset.id !== assetId);
      }
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearSearchQuery: (state) => {
      state.searchQuery = '';
    },
    setActiveCategory: (state, action: PayloadAction<string>) => {
      state.activeCategory = action.payload;
    },
    loadAssets: (state, action: PayloadAction<AssetCategory[]>) => {
      state.categories = action.payload;
    },
  },
});

export const {
  addAsset,
  updateAsset,
  deleteAsset,
  setSearchQuery,
  clearSearchQuery,
  setActiveCategory,
  loadAssets,
} = assetsSlice.actions;

export default assetsSlice.reducer;
