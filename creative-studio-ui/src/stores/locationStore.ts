/**
 * Location Store
 * 
 * Zustand store for managing location state with CRUD operations,
 * cube texture management, and scene placement functions.
 * Now connects to backend API for persistent storage.
 * 
 * File: creative-studio-ui/src/stores/locationStore.ts
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Location,
  CubeFace,
  LocationType,
  CubeTextureMapping,
  CubeFaceTexture,
  PlacedAsset,
  Transform3D,
  SceneLocation
} from '@/types/location';
import { listLocationsInProject, loadLocationFromProject } from '@/utils/locationStorage';
import { API_BASE_URL } from '../config/apiConfig';

// ============================================================================
// API Configuration
// ============================================================================

// API_BASE_URL is now imported from central config

/**
 * Fetch wrapper with error handling
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    // Don't log error in offline mode (Electron without backend)
    // This is expected behavior
    throw error;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Location store state interface
 */
interface LocationState {
  // Data
  locations: Location[];
  sceneLocations: SceneLocation[];
  projectLocationIds: string[];

  // UI State
  selectedLocationId: string | null;
  editingLocationId: string | null;
  selectedSceneLocationId: string | null;

  // Editor state
  cubeViewRotation: { x: number; y: number };
  selectedCubeFace: CubeFace | null;
  textureDirection: 'inward' | 'outward';

  // Filters
  filterType: LocationType | 'all';
  filterWorld: string | 'all';
  searchQuery: string;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  generationProgress: Map<string, number>;

  // Error state
  error: string | null;

  // Actions - Locations CRUD
  setLocations: (locations: Location[]) => void;
  fetchLocations: () => Promise<void>;
  fetchProjectLocations: (projectId: string) => Promise<void>;
  mergeProjectLocations: (projectId: string) => Promise<void>;
  addLocation: (location: Location) => Promise<void>;
  updateLocation: (id: string, updates: Partial<Location>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;

  // Selection
  selectLocation: (id: string | null) => void;
  openEditor: (id: string) => void;
  closeEditor: () => void;

  // Cube editing
  setCubeViewRotation: (rotation: { x: number; y: number }) => void;
  selectCubeFace: (face: CubeFace | null) => void;
  setTextureDirection: (direction: 'inward' | 'outward') => void;
  updateCubeTexture: (locationId: string, face: CubeFace, texture: CubeFaceTexture) => Promise<void>;
  removeCubeTexture: (locationId: string, face: CubeFace) => Promise<void>;

  // Filters
  setFilterType: (type: LocationType | 'all') => void;
  setFilterWorld: (worldId: string | 'all') => void;
  setSearchQuery: (query: string) => void;

  // Progress
  setGenerationProgress: (faceId: string, progress: number) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;

  // Scene placement
  addSceneLocation: (sceneLocation: SceneLocation) => void;
  updateSceneLocation: (instanceId: string, updates: Partial<SceneLocation>) => void;
  removeSceneLocation: (instanceId: string) => void;
  selectSceneLocation: (instanceId: string | null) => void;
  updateSceneLocationTransform: (instanceId: string, transform: Partial<Transform3D>) => void;

  // Assets
  addPlacedAsset: (locationId: string, asset: PlacedAsset) => void;
  updatePlacedAsset: (locationId: string, assetId: string, updates: Partial<PlacedAsset>) => void;
  removePlacedAsset: (locationId: string, assetId: string) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useLocationStore = create<LocationState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        locations: [],
        sceneLocations: [],
        projectLocationIds: [],
        selectedLocationId: null,
        editingLocationId: null,
        selectedSceneLocationId: null,
        cubeViewRotation: { x: 0, y: 0 },
        selectedCubeFace: null,
        textureDirection: 'outward',
        filterType: 'all',
        filterWorld: 'all',
        searchQuery: '',
        isLoading: false,
        isSaving: false,
        generationProgress: new Map(),
        error: null,

        // Actions - Locations CRUD
        setLocations: (locations) => set({ locations }),

        fetchLocations: async () => {
          set({ isLoading: true, error: null });
          try {
            // Try to fetch from API, but don't fail if offline (Electron mode)
            const response = await fetchApi<{ locations: Location[] }>('/api/locations');
            set({ locations: response.locations });
          } catch (error) {
            // Handle 404 Not Found gracefully - it just means no locations exist yet
            if (error instanceof Error && error.message.includes('404')) {
              console.warn('No locations found on server, using local locations');
              set({ locations: [] });
            } else {
              // In Electron mode without backend, just use existing locations from store
              console.warn('API not available, using local locations:', error);
              // Don't set error in offline mode - just silently use local data
            }
            set({ error: null });
          } finally {
            set({ isLoading: false });
          }
        },

        fetchProjectLocations: async (projectId: string) => {
          set({ isLoading: true, error: null });
          try {
            // List all location files in the project's locations folder
            const locationIds = await listLocationsInProject(projectId);
            set({ projectLocationIds: locationIds });

            // Load each location
            const projectLocations: Location[] = [];
            for (const locationId of locationIds) {
              const location = await loadLocationFromProject(projectId, locationId);
              if (location) {
                projectLocations.push(location);
              }
            }

            // Merge with existing locations, avoiding duplicates by location_id
            set((state) => {
              const existingIds = new Set(state.locations.map(l => l.location_id));
              const newLocations = [...state.locations];

              for (const location of projectLocations) {
                if (!existingIds.has(location.location_id)) {
                  newLocations.push(location);
                }
              }

              return { locations: newLocations };
            });
          } catch (error) {
            console.warn('Failed to fetch project locations:', error);
            set({ error: null });
          } finally {
            set({ isLoading: false });
          }
        },

        mergeProjectLocations: async (projectId: string) => {
          await get().fetchProjectLocations(projectId);
        },

        addLocation: async (location) => {
          set({ isSaving: true, error: null });
          try {
            // Try API first, fallback to local storage in offline mode
            try {
              const response = await fetchApi<{ location: Location }>('/api/locations', {
                method: 'POST',
                body: JSON.stringify({
                  name: location.name,
                  location_type: location.location_type,
                  description: location.metadata?.description,
                  atmosphere: location.metadata?.atmosphere,
                  genre_tags: location.metadata?.genre_tags,
                  world_id: location.world_id,
                  world_location_id: location.world_location_id,
                }),
              });
              set((state) => ({
                locations: [...state.locations, response.location],
              }));
            } catch (apiError) {
              // Offline mode - add locally
              console.warn('API not available, adding location locally');
              set((state) => ({
                locations: [...state.locations, location],
              }));
            }
          } catch (error) {
            set({ error: 'Failed to create location' });
            console.error('Failed to create location:', error);
            throw error;
          } finally {
            set({ isSaving: false });
          }
        },

        updateLocation: async (id, updates) => {
          set({ isSaving: true, error: null });
          try {
            // Try API first, fallback to local update in offline mode
            try {
              const response = await fetchApi<{ location: Location }>(`/api/locations/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
              });
              set((state) => ({
                locations: state.locations.map((loc) =>
                  loc.location_id === id ? response.location : loc
                ),
              }));
            } catch (apiError) {
              // Offline mode - update locally
              console.warn('API not available, updating location locally');
              set((state) => ({
                locations: state.locations.map((loc) =>
                  loc.location_id === id ? { ...loc, ...updates } : loc
                ),
              }));
            }
          } catch (error) {
            set({ error: 'Failed to update location' });
            console.error('Failed to update location:', error);
            throw error;
          } finally {
            set({ isSaving: false });
          }
        },

        deleteLocation: async (id) => {
          set({ isSaving: true, error: null });
          try {
            // Try API first, fallback to local delete in offline mode
            try {
              await fetchApi(`/api/locations/${id}`, {
                method: 'DELETE',
              });
            } catch (apiError) {
              // Offline mode - delete locally
              console.warn('API not available, deleting location locally');
            }
            // Always update local state
            set((state) => ({
              locations: state.locations.filter((loc) => loc.location_id !== id),
              selectedLocationId: state.selectedLocationId === id ? null : state.selectedLocationId,
              editingLocationId: state.editingLocationId === id ? null : state.editingLocationId,
            }));
          } catch (error) {
            set({ error: 'Failed to delete location' });
            console.error('Failed to delete location:', error);
            throw error;
          } finally {
            set({ isSaving: false });
          }
        },

        // Selection
        selectLocation: (id) => set({ selectedLocationId: id }),
        openEditor: (id) => set({ editingLocationId: id }),
        closeEditor: () => set({ editingLocationId: null, selectedCubeFace: null }),

        // Cube editing
        setCubeViewRotation: (rotation) => set({ cubeViewRotation: rotation }),
        selectCubeFace: (face) => set({ selectedCubeFace: face }),
        setTextureDirection: (direction) => set({ textureDirection: direction }),

        updateCubeTexture: async (locationId, face, texture) => {
          set({ isSaving: true, error: null });
          try {
            const response = await fetchApi<{ location: Location }>(`/api/locations/${locationId}/cube-textures`, {
              method: 'POST',
              body: JSON.stringify({
                face,
                prompt: texture.generation_params?.prompt,
                negative_prompt: texture.generation_params?.negative_prompt,
                width: texture.generation_params?.width || 512,
                height: texture.generation_params?.height || 512,
                steps: texture.generation_params?.steps || 20,
                cfg_scale: texture.generation_params?.cfg_scale || 7,
                seed: texture.generation_params?.seed,
              }),
            });
            set((state) => ({
              locations: state.locations.map((loc) =>
                loc.location_id === locationId ? response.location : loc
              ),
            }));
          } catch (error) {
            set({ error: 'Failed to update cube texture' });
            console.error('Failed to update cube texture:', error);
            throw error;
          } finally {
            set({ isSaving: false });
          }
        },

        removeCubeTexture: async (locationId, face) => {
          set({ isSaving: true, error: null });
          try {
            const location = get().locations.find((loc) => loc.location_id === locationId);
            if (location) {
              const { [face]: _, ...remainingTextures } = location.cube_textures;
              await get().updateLocation(locationId, { cube_textures: remainingTextures });
            }
          } catch (error) {
            set({ error: 'Failed to remove cube texture' });
            console.error('Failed to remove cube texture:', error);
            throw error;
          } finally {
            set({ isSaving: false });
          }
        },

        // Filters
        setFilterType: (type) => set({ filterType: type }),
        setFilterWorld: (worldId) => set({ filterWorld: worldId }),
        setSearchQuery: (query) => set({ searchQuery: query }),

        // Progress
        setGenerationProgress: (faceId, progress) => set((state) => {
          const newProgress = new Map(state.generationProgress);
          newProgress.set(faceId, progress);
          return { generationProgress: newProgress };
        }),

        setLoading: (loading) => set({ isLoading: loading }),
        setSaving: (saving) => set({ isSaving: saving }),
        setError: (error) => set({ error }),

        // Scene placement
        addSceneLocation: (sceneLocation) => set((state) => ({
          sceneLocations: [...state.sceneLocations, sceneLocation],
        })),

        updateSceneLocation: (instanceId, updates) => set((state) => ({
          sceneLocations: state.sceneLocations.map((sl) =>
            sl.instance_id === instanceId ? { ...sl, ...updates } : sl
          ),
        })),

        removeSceneLocation: (instanceId) => set((state) => ({
          sceneLocations: state.sceneLocations.filter((sl) => sl.instance_id !== instanceId),
          selectedSceneLocationId: state.selectedSceneLocationId === instanceId ? null : state.selectedSceneLocationId,
        })),

        selectSceneLocation: (instanceId) => set({ selectedSceneLocationId: instanceId }),

        updateSceneLocationTransform: (instanceId, transform) => set((state) => ({
          sceneLocations: state.sceneLocations.map((sl) =>
            sl.instance_id === instanceId
              ? { ...sl, transform: { ...sl.transform, ...transform } }
              : sl
          ),
        })),

        // Assets
        addPlacedAsset: (locationId, asset) => set((state) => ({
          locations: state.locations.map((loc) => {
            if (loc.location_id !== locationId) return loc;
            return {
              ...loc,
              placed_assets: [...loc.placed_assets, asset],
            };
          }),
        })),

        updatePlacedAsset: (locationId, assetId, updates) => set((state) => ({
          locations: state.locations.map((loc) => {
            if (loc.location_id !== locationId) return loc;
            return {
              ...loc,
              placed_assets: loc.placed_assets.map((asset) =>
                asset.id === assetId ? { ...asset, ...updates } : asset
              ),
            };
          }),
        })),

        removePlacedAsset: (locationId, assetId) => set((state) => ({
          locations: state.locations.map((loc) => {
            if (loc.location_id !== locationId) return loc;
            return {
              ...loc,
              placed_assets: loc.placed_assets.filter((asset) => asset.id !== assetId),
            };
          }),
        })),
      }),
      {
        name: 'location-store',
        partialize: (state) => ({
          filterType: state.filterType,
          filterWorld: state.filterWorld,
          searchQuery: state.searchQuery,
        }),
      }
    ),
    { name: 'LocationStore' }
  )
);

// ============================================================================
// Selector Functions
// ============================================================================

/**
 * Get filtered locations based on current filters
 */
export function getFilteredLocations(state: LocationState): Location[] {
  let filtered = [...state.locations];

  // Filter by type
  if (state.filterType !== 'all') {
    filtered = filtered.filter((loc) => loc.location_type === state.filterType);
  }

  // Filter by world
  if (state.filterWorld !== 'all') {
    filtered = filtered.filter((loc) => loc.world_id === state.filterWorld);
  }

  // Filter by search query
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter((loc) =>
      loc.name.toLowerCase().includes(query) ||
      loc.metadata?.description?.toLowerCase().includes(query) ||
      loc.metadata?.genre_tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  return filtered;
}

/**
 * Get selected location
 */
export function getSelectedLocation(state: LocationState): Location | undefined {
  return state.locations.find((loc) => loc.location_id === state.selectedLocationId);
}

/**
 * Get editing location
 */
export function getEditingLocation(state: LocationState): Location | undefined {
  return state.locations.find((loc) => loc.location_id === state.editingLocationId);
}

/**
 * Get scene location by instance ID
 */
export function getSceneLocationById(state: LocationState, instanceId: string): SceneLocation | undefined {
  return state.sceneLocations.find((sl) => sl.instance_id === instanceId);
}

/**
 * Get locations by world ID
 */
export function getLocationsByWorldId(state: LocationState, worldId: string): Location[] {
  return state.locations.filter((loc) => loc.world_id === worldId);
}

/**
 * Get scene locations for a specific shot
 */
export function getSceneLocationsByShotId(state: LocationState, shotId: string): SceneLocation[] {
  return state.sceneLocations.filter((sl) => sl.parent_shot_id === shotId);
}

/**
 * Check if a location has all cube faces generated
 */
export function isLocationFullyTextured(location: Location): boolean {
  const requiredFaces: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
  return requiredFaces.every((face) => location.cube_textures[face]?.image_path);
}

/**
 * Get completion percentage for a location's cube textures
 */
export function getLocationCompletionPercentage(location: Location): number {
  const requiredFaces: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
  const completedFaces = requiredFaces.filter((face) => location.cube_textures[face]?.image_path);
  return Math.round((completedFaces.length / requiredFaces.length) * 100);
}

