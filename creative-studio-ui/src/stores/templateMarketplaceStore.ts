/**
 * Template Marketplace Store
 * MI3: Template Marketplace - User template sharing
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  Template,
  TemplateCollection,
  TemplateReview,
  MarketplaceSearchParams,
  MarketplaceState,
  UserLibrary,
  TemplateUploadData,
} from '../types/template-marketplace';

interface TemplateMarketplaceStore {
  // Marketplace state
  marketplace: MarketplaceState;
  
  // User library
  userLibrary: UserLibrary;
  
  // Selected items
  selectedTemplateId: string | null;
  selectedCollectionId: string | null;
  
  // UI state
  isPanelOpen: boolean;
  isDetailViewOpen: boolean;
  isUploadModalOpen: boolean;
  
  // Actions
  // Search and browse
  searchTemplates: (params: Partial<MarketplaceSearchParams>) => void;
  loadMoreTemplates: () => void;
  refreshMarketplace: () => void;
  
  // Templates
  selectTemplate: (id: string | null) => void;
  loadTemplateDetails: (id: string) => void;
  downloadTemplate: (id: string) => void;
  purchaseTemplate: (id: string) => void;
  favoriteTemplate: (id: string) => void;
  unfavoriteTemplate: (id: string) => void;
  
  // Collections
  selectCollection: (id: string | null) => void;
  loadCollection: (id: string) => void;
  
  // Reviews
  loadReviews: (templateId: string) => void;
  addReview: (review: TemplateReview) => void;
  helpfulReview: (reviewId: string) => void;
  
  // User library
  addToPurchased: (id: string) => void;
  addToDownloaded: (id: string) => void;
  addToFavorites: (id: string) => void;
  removeFromFavorites: (id: string) => void;
  createUserCollection: (collection: TemplateCollection) => void;
  
  // Upload
  openUploadModal: () => void;
  closeUploadModal: () => void;
  uploadTemplate: (data: TemplateUploadData) => Promise<void>;
  
  // UI
  togglePanel: () => void;
  openDetailView: (id: string) => void;
  closeDetailView: () => void;
  
  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultSearchParams: MarketplaceSearchParams = {
  query: '',
  categories: [],
  platforms: [],
  aspectRatios: [],
  resolutions: [],
  price: 'all',
  sortBy: 'popular',
  page: 1,
  limit: 24,
};

export const useTemplateMarketplaceStore = create<TemplateMarketplaceStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    marketplace: {
      templates: [],
      collections: [],
      featuredTemplates: [],
      searchParams: { ...defaultSearchParams },
      isLoading: false,
      error: null,
      hasMore: true,
      totalCount: 0,
    },
    
    userLibrary: {
      purchasedTemplates: [],
      downloadedTemplates: [],
      favorites: [],
      collections: [],
      uploadHistory: [],
    },
    
    selectedTemplateId: null,
    selectedCollectionId: null,
    isPanelOpen: false,
    isDetailViewOpen: false,
    isUploadModalOpen: false,
    
    // Search and browse
    searchTemplates: (params) => set((state) => ({
      marketplace: {
        ...state.marketplace,
        searchParams: { ...state.marketplace.searchParams, ...params, page: 1 },
        isLoading: true,
      },
    })),
    
    loadMoreTemplates: () => set((state) => ({
      marketplace: {
        ...state.marketplace,
        searchParams: {
          ...state.marketplace.searchParams,
          page: state.marketplace.searchParams.page + 1,
        },
        isLoading: true,
      },
    })),
    
    refreshMarketplace: () => {
      const { marketplace } = get();
      set({
        marketplace: {
          ...marketplace,
          searchParams: { ...marketplace.searchParams, page: 1 },
          isLoading: true,
        },
      });
    },
    
    // Templates
    selectTemplate: (id) => set({ selectedTemplateId: id }),
    
    loadTemplateDetails: (id) => {
      // Would fetch from API
      set({ selectedTemplateId: id, isDetailViewOpen: true });
    },
    
    downloadTemplate: (id) => {
      const { userLibrary } = get();
      if (!userLibrary.downloadedTemplates.includes(id)) {
        set({
          userLibrary: {
            ...userLibrary,
            downloadedTemplates: [...userLibrary.downloadedTemplates, id],
          },
        });
      }
    },
    
    purchaseTemplate: (id) => {
      const { userLibrary } = get();
      if (!userLibrary.purchasedTemplates.includes(id)) {
        set({
          userLibrary: {
            ...userLibrary,
            purchasedTemplates: [...userLibrary.purchasedTemplates, id],
          },
        });
      }
    },
    
    favoriteTemplate: (id) => {
      const { userLibrary } = get();
      if (!userLibrary.favorites.includes(id)) {
        set({
          userLibrary: {
            ...userLibrary,
            favorites: [...userLibrary.favorites, id],
          },
        });
      }
    },
    
    unfavoriteTemplate: (id) => {
      const { userLibrary } = get();
      set({
        userLibrary: {
          ...userLibrary,
          favorites: userLibrary.favorites.filter((fId) => fId !== id),
        },
      });
    },
    
    // Collections
    selectCollection: (id) => set({ selectedCollectionId: id }),
    
    loadCollection: (id) => {
      const collection = get().marketplace.collections.find((c) => c.id === id);
      if (collection) {
        set({
          selectedCollectionId: id,
          marketplace: {
            ...get().marketplace,
            templates: collection.templates.map((tId) =>
              get().marketplace.templates.find((t) => t.id === tId)
            ).filter(Boolean) as Template[],
          },
        });
      }
    },
    
    // Reviews
    loadReviews: (templateId) => {
      // Would fetch from API
    },
    
    addReview: (review) => {
      // Would add to API
    },
    
    helpfulReview: (reviewId) => {
      // Would update API
    },
    
    // User library
    addToPurchased: (id) => set((state) => ({
      userLibrary: {
        ...state.userLibrary,
        purchasedTemplates: [...state.userLibrary.purchasedTemplates, id],
      },
    })),
    
    addToDownloaded: (id) => set((state) => ({
      userLibrary: {
        ...state.userLibrary,
        downloadedTemplates: [...state.userLibrary.downloadedTemplates, id],
      },
    })),
    
    addToFavorites: (id) => set((state) => ({
      userLibrary: {
        ...state.userLibrary,
        favorites: [...state.userLibrary.favorites, id],
      },
    })),
    
    removeFromFavorites: (id) => set((state) => ({
      userLibrary: {
        ...state.userLibrary,
        favorites: state.userLibrary.favorites.filter((fId) => fId !== id),
      },
    })),
    
    createUserCollection: (collection) => set((state) => ({
      userLibrary: {
        ...state.userLibrary,
        collections: [...state.userLibrary.collections, collection.id],
      },
      marketplace: {
        ...state.marketplace,
        collections: [...state.marketplace.collections, collection],
      },
    })),
    
    // Upload
    openUploadModal: () => set({ isUploadModalOpen: true }),
    
    closeUploadModal: () => set({ isUploadModalOpen: false }),
    
    uploadTemplate: async (data) => {
      // Would upload to API
      set({ isUploadModalOpen: false });
    },
    
    // UI
    togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
    
    openDetailView: (id) => {
      set({ selectedTemplateId: id, isDetailViewOpen: true });
    },
    
    closeDetailView: () => set({ isDetailViewOpen: false }),
    
    // State management
    setLoading: (isLoading) => set((state) => ({
      marketplace: { ...state.marketplace, isLoading },
    })),
    
    setError: (error) => set((state) => ({
      marketplace: { ...state.marketplace, error },
    })),
  }))
);
