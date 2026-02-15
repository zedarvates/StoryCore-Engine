/**
 * Addon Store - Zustand State Management
 * Gestion de l'état des add-ons pour StoryCore Creative Studio
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { logger } from '../utils/logger';

// Types
export interface Addon {
  name: string;
  version: string;
  type: 'workflow_addon' | 'ui_addon' | 'processing_addon' | 'model_addon' | 'export_addon';
  author: string;
  description: string;
  category: 'official' | 'community' | 'templates';
  status: 'enabled' | 'disabled' | 'error';
  enabled: boolean;
  permissions: string[];
  dependencies: Record<string, string>;
  metadata: AddonMetadata;
  load_time?: number;
  error_message?: string;
}

export interface AddonMetadata {
  icon?: string;
  screenshots?: string[];
  homepage?: string;
  repository?: string;
  license?: string;
  tags?: string[];
  created_with?: string;
}

export interface AddonDetails extends Addon {
  entry_points: Record<string, string>;
  compatibility: Record<string, string>;
  compatibility_check: CompatibilityResult;
}

export interface CompatibilityResult {
  compatible: boolean;
  engine_version_ok: boolean;
  python_version_ok: boolean;
  dependencies_ok: boolean;
  conflicts: string[];
}

export interface ValidationResult {
  is_valid: boolean;
  score: number;
  checksum: string;
  issues_count: number;
  issues?: ValidationIssue[];
}

export interface ValidationIssue {
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  message: string;
  file_path?: string;
  line_number?: number;
  suggestion?: string;
}

export interface SecurityReport {
  safe: boolean;
  risk_level: 'low' | 'medium' | 'high';
  dangerous_patterns?: Array<{ file: string; pattern: string }>;
  suspicious_imports?: Array<{ file: string; module: string }>;
  file_access?: Array<{ file: string; operation: string }>;
  network_access?: Array<{ file: string; operation: string }>;
}

export interface QualityReport {
  score: number;
  metrics: {
    total_lines: number;
    code_lines: number;
    comment_lines: number;
    blank_lines: number;
    functions: number;
    classes: number;
    complexity: number;
  };
  issues?: Array<{
    file?: string;
    function?: string;
    issue: string;
    suggestion: string;
  }>;
}

export interface Category {
  name: string;
  description: string;
  count: number;
}

export interface AddonType {
  name: string;
  description: string;
  icon: string;
}

export interface AddonStats {
  addons: {
    discovered: number;
    loaded: number;
    enabled: number;
    errors: number;
  };
  permissions: {
    requests_total: number;
    requests_granted: number;
    requests_denied: number;
    active_grants: number;
  };
  by_type: Record<string, number>;
  by_category: Record<string, number>;
}

// Store State
interface AddonStore {
  // State
  addons: Addon[];
  selectedAddon: AddonDetails | null;
  categories: Record<string, Category>;
  types: Record<string, AddonType>;
  stats: AddonStats | null;
  loading: boolean;
  error: string | null;
  
  // Filters
  searchQuery: string;
  selectedCategory: string | null;
  selectedType: string | null;
  selectedStatus: string | null;
  
  // Actions
  fetchAddons: () => Promise<void>;
  fetchAddonDetails: (name: string) => Promise<void>;
  enableAddon: (name: string) => Promise<void>;
  disableAddon: (name: string) => Promise<void>;
  installAddon: (file: File, category: string) => Promise<void>;
  uninstallAddon: (name: string) => Promise<void>;
  validateAddon: (name: string, detailed?: boolean) => Promise<{
    validation: ValidationResult;
    security: SecurityReport;
    quality: QualityReport;
  }>;
  searchAddons: (query: string) => void;
  filterByCategory: (category: string | null) => void;
  filterByType: (type: string | null) => void;
  filterByStatus: (status: string | null) => void;
  fetchCategories: () => Promise<void>;
  fetchTypes: () => Promise<void>;
  fetchStats: () => Promise<void>;
  checkUpdates: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

// API Base URL
const API_BASE = '/api/addons';

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Create the store
export const useAddonStore = create<AddonStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      addons: [],
      selectedAddon: null,
      categories: {},
      types: {},
      stats: null,
      loading: false,
      error: null,
      searchQuery: '',
      selectedCategory: null,
      selectedType: null,
      selectedStatus: null,

      // Fetch all addons
      fetchAddons: async () => {
        set({ loading: true, error: null });
        try {
          const { selectedCategory, selectedType, selectedStatus } = get();
          
          const params = new URLSearchParams();
          if (selectedCategory) params.append('category', selectedCategory);
          if (selectedType) params.append('addon_type', selectedType);
          if (selectedStatus) params.append('status', selectedStatus);
          
          const query = params.toString();
          const endpoint = query ? `?${query}` : '';
          
          const response = await apiCall<{ success: boolean; addons: Addon[] }>(endpoint);
          
          set({ addons: response.addons, loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch addons',
            loading: false 
          });
        }
      },

      // Fetch addon details
      fetchAddonDetails: async (name: string) => {
        set({ loading: true, error: null });
        try {
          const response = await apiCall<{ success: boolean; addon: AddonDetails }>(
            `/${encodeURIComponent(name)}`
          );
          
          set({ selectedAddon: response.addon, loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch addon details',
            loading: false 
          });
        }
      },

      // Enable addon
      enableAddon: async (name: string) => {
        set({ loading: true, error: null });
        try {
          await apiCall(`/${encodeURIComponent(name)}/enable`, {
            method: 'POST',
          });
          
          // Refresh addons list
          await get().fetchAddons();
          
          // Update selected addon if it's the one being enabled
          if (get().selectedAddon?.name === name) {
            await get().fetchAddonDetails(name);
          }
          
          set({ loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to enable addon',
            loading: false 
          });
          throw error;
        }
      },

      // Disable addon
      disableAddon: async (name: string) => {
        set({ loading: true, error: null });
        try {
          await apiCall(`/${encodeURIComponent(name)}/disable`, {
            method: 'POST',
          });
          
          // Refresh addons list
          await get().fetchAddons();
          
          // Update selected addon if it's the one being disabled
          if (get().selectedAddon?.name === name) {
            await get().fetchAddonDetails(name);
          }
          
          set({ loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to disable addon',
            loading: false 
          });
          throw error;
        }
      },

      // Install addon
      installAddon: async (file: File, category: string) => {
        set({ loading: true, error: null });
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch(`${API_BASE}/install?category=${category}`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
          }

          // Refresh addons list
          await get().fetchAddons();
          
          set({ loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to install addon',
            loading: false 
          });
          throw error;
        }
      },

      // Uninstall addon
      uninstallAddon: async (name: string) => {
        set({ loading: true, error: null });
        try {
          await apiCall(`/${encodeURIComponent(name)}`, {
            method: 'DELETE',
          });
          
          // Clear selected addon if it's the one being uninstalled
          if (get().selectedAddon?.name === name) {
            set({ selectedAddon: null });
          }
          
          // Refresh addons list
          await get().fetchAddons();
          
          set({ loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to uninstall addon',
            loading: false 
          });
          throw error;
        }
      },

      // Validate addon
      validateAddon: async (name: string, detailed = false) => {
        set({ loading: true, error: null });
        try {
          const params = detailed ? '?detailed=true' : '';
          const response = await apiCall<{
            success: boolean;
            validation: ValidationResult;
            security: SecurityReport;
            quality: QualityReport;
          }>(`/${encodeURIComponent(name)}/validate${params}`);
          
          set({ loading: false });
          return {
            validation: response.validation,
            security: response.security,
            quality: response.quality,
          };
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to validate addon',
            loading: false 
          });
          throw error;
        }
      },

      // Search addons
      searchAddons: (query: string) => {
        set({ searchQuery: query });
        
        // If query is empty, just fetch all addons
        if (!query.trim()) {
          get().fetchAddons();
          return;
        }
        
        // Perform search via API
        const { selectedType, selectedCategory } = get();
        const params = new URLSearchParams({ q: query });
        if (selectedType) params.append('addon_type', selectedType);
        if (selectedCategory) params.append('category', selectedCategory);
        
        set({ loading: true, error: null });
        apiCall<{ success: boolean; results: Addon[] }>(`/search?${params.toString()}`)
          .then(response => {
            set({ addons: response.results, loading: false });
          })
          .catch(error => {
            set({ 
              error: error instanceof Error ? error.message : 'Search failed',
              loading: false 
            });
          });
      },

      // Filter by category
      filterByCategory: (category: string | null) => {
        set({ selectedCategory: category });
        get().fetchAddons();
      },

      // Filter by type
      filterByType: (type: string | null) => {
        set({ selectedType: type });
        get().fetchAddons();
      },

      // Filter by status
      filterByStatus: (status: string | null) => {
        set({ selectedStatus: status });
        get().fetchAddons();
      },

      // Fetch categories
      fetchCategories: async () => {
        try {
          const response = await apiCall<{ success: boolean; categories: Record<string, Category> }>(
            '/categories/list'
          );
          set({ categories: response.categories });
        } catch (error) {
          console.error('Failed to fetch categories:', error);
        }
      },

      // Fetch types
      fetchTypes: async () => {
        try {
          const response = await apiCall<{ success: boolean; types: Record<string, AddonType> }>(
            '/types/list'
          );
          set({ types: response.types });
        } catch (error) {
          console.error('Failed to fetch types:', error);
        }
      },

      // Fetch stats
      fetchStats: async () => {
        try {
          const response = await apiCall<{ success: boolean; stats: AddonStats }>(
            '/stats'
          );
          set({ stats: response.stats });
        } catch (error) {
          console.error('Failed to fetch stats:', error);
        }
      },

      // Check updates
      checkUpdates: async () => {
        try {
          const response = await apiCall<{ 
            success: boolean; 
            updates_available: number;
            updates: unknown[];
          }>('/updates/check');
          
          // TODO: Handle updates (show notification, etc.)
          logger.debug(`${response.updates_available} updates available`);
        } catch (error) {
          console.error('Failed to check updates:', error);
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Reset store
      reset: () => {
        set({
          addons: [],
          selectedAddon: null,
          categories: {},
          types: {},
          stats: null,
          loading: false,
          error: null,
          searchQuery: '',
          selectedCategory: null,
          selectedType: null,
          selectedStatus: null,
        });
      },
    }),
    { name: 'AddonStore' }
  )
);

// Selectors
export const selectFilteredAddons = (state: AddonStore) => {
  const { addons, searchQuery } = state;
  
  if (!searchQuery.trim()) {
    return addons;
  }
  
  const query = searchQuery.toLowerCase();
  return addons.filter(addon => 
    addon.name.toLowerCase().includes(query) ||
    addon.description.toLowerCase().includes(query) ||
    addon.author.toLowerCase().includes(query)
  );
};

export const selectAddonsByCategory = (category: string) => (state: AddonStore) => {
  return state.addons.filter(addon => addon.category === category);
};

export const selectAddonsByType = (type: string) => (state: AddonStore) => {
  return state.addons.filter(addon => addon.type === type);
};

export const selectEnabledAddons = (state: AddonStore) => {
  return state.addons.filter(addon => addon.enabled);
};

export const selectDisabledAddons = (state: AddonStore) => {
  return state.addons.filter(addon => !addon.enabled && addon.status !== 'error');
};

export const selectErrorAddons = (state: AddonStore) => {
  return state.addons.filter(addon => addon.status === 'error');
};

