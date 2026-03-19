// ============================================================================
// Location Persistence Hook
// ============================================================================
// Handles saving and loading locations to/from localStorage and JSON files
// Integrates with Zustand store for state management
// ============================================================================

import { useCallback } from 'react';
import { useLocationStore } from '../stores/locationStore';
import { useAppStore } from '../stores/useAppStore';
import type { Location } from '../types/location';
import { toast } from '../utils/toast';
import { 
  saveLocationToProject, 
  loadAllLocationsInProject,
  deleteLocationFromProject
} from '../utils/locationStorage';

// ============================================================================
// Location Persistence Hook
// ============================================================================

export function useLocationPersistence() {
  // ============================================================================
  // Store Selectors
  // ============================================================================
  const addLocation = useLocationStore((state) => state.addLocation);
  const updateLocation = useLocationStore((state) => state.updateLocation);
  const deleteLocation = useLocationStore((state) => state.deleteLocation);
  const setLocations = useLocationStore((state) => state.setLocations);

  // ============================================================================
  // File System Operations
  // ============================================================================

  /**
   * Save location directly to project directory via Electron API
   */
  const saveToProjectDirectory = useCallback(
    async (location: Location, projectId: string): Promise<void> => {
      try {
        const result = await saveLocationToProject(projectId, location.location_id, location);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to save location');
        }
        
        console.log(`[useLocationPersistence] Location saved to: ${result.filePath}`);
      } catch (error) {
        console.error('[useLocationPersistence] Failed to save location to project directory:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Load all locations from project directory
   */
  const loadLocationsFromProjectDirectory = useCallback(
    async (projectId: string): Promise<Location[]> => {
      try {
        return await loadAllLocationsInProject(projectId);
      } catch (error) {
        console.error('[useLocationPersistence] Failed to load locations from project directory:', error);
        return [];
      }
    },
    []
  );

  // ============================================================================
  // Main Persistence Operations
  // ============================================================================

  /**
   * Save a location with project directory persistence
   */
  const saveLocation = useCallback(
    async (locationData: Location): Promise<Location> => {
      const project = useAppStore.getState().project;
      const projectId = project?.path || project?.id;

      // Save to project directory if projectId is available
      if (projectId) {
        try {
          await saveToProjectDirectory(locationData, projectId);
          console.log(`[useLocationPersistence] Location saved to project directory: ${projectId}`);
          
          toast.success(
            'Location Saved',
            `Location "${locationData.name}" saved to project`,
            3000
          );
        } catch (error) {
          console.warn('[useLocationPersistence] Project directory save failed:', error);
          throw error;
        }
      } else {
        console.log('[useLocationPersistence] No project ID available');
      }

      return locationData;
    },
    [saveToProjectDirectory]
  );

  /**
   * Load and sync locations when a project is loaded
   */
  const loadAndSyncLocations = useCallback(async (): Promise<{ loaded: number; errors: number }> => {
    const project = useAppStore.getState().project;
    const projectId = project?.path || project?.id;

    if (!projectId) {
      console.log('[useLocationPersistence] No project ID available for loading locations');
      return { loaded: 0, errors: 0 };
    }

    let loaded = 0;
    let errors = 0;

    try {
      const projectLocations = await loadLocationsFromProjectDirectory(projectId);

      if (projectLocations.length > 0) {
        // Get current locations directly from store to avoid dependency loop
        const currentLocations = useLocationStore.getState().locations;
        const allLocations = [...currentLocations];

        for (const location of projectLocations) {
          try {
            const existingIndex = allLocations.findIndex(
              (l) => l.location_id === location.location_id
            );

            if (existingIndex >= 0) {
              allLocations[existingIndex] = location;
            } else {
              allLocations.push(location);
            }

            loaded++;
          } catch (error) {
            console.error(`[useLocationPersistence] Failed to sync location ${location.location_id}:`, error);
            errors++;
          }
        }

        setLocations(allLocations);
        console.log(`[useLocationPersistence] Loaded and synced ${loaded} locations from project directory`);
      }

      return { loaded, errors };
    } catch (error) {
      console.error('[useLocationPersistence] Failed to load and sync locations:', error);
      return { loaded, errors };
    }
  }, [loadLocationsFromProjectDirectory, setLocations]);

  /**
   * Delete a location from project directory and store
   */
  const removeLocation = useCallback(
    async (location_id: string): Promise<void> => {
      try {
        const project = useAppStore.getState().project;
        const projectId = project?.path || project?.id;

        // Remove from store
        await deleteLocation(location_id);

        // Remove from project directory if available
        if (projectId) {
          try {
            await deleteLocationFromProject(projectId, location_id);
            console.log(`[useLocationPersistence] Deleted location file from project: ${projectId}`);
          } catch (error) {
            console.warn('[useLocationPersistence] Failed to delete location from project directory:', error);
          }
        }
      } catch (error) {
        console.error('Error deleting location:', error);
        throw error;
      }
    },
    [deleteLocation]
  );

  /**
   * Sync locations from project directory to store
   */
  const syncLocationsFromProject = useCallback(
    async (): Promise<{ loaded: number; errors: number }> => {
      const project = useAppStore.getState().project;
      const projectId = project?.path || project?.id;

      if (!projectId) {
        console.log('[useLocationPersistence] No project ID available for sync');
        return { loaded: 0, errors: 0 };
      }

      let loaded = 0;
      let errors = 0;

      try {
        const projectLocations = await loadLocationsFromProjectDirectory(projectId);
        const currentLocations = useLocationStore.getState().locations;

        for (const location of projectLocations) {
          try {
            const existingIndex = currentLocations.findIndex(
              (l) => l.location_id === location.location_id
            );

            if (existingIndex >= 0) {
              updateLocation(location.location_id, location);
            } else {
              addLocation(location);
            }

            loaded++;
          } catch (error) {
            console.error(`[useLocationPersistence] Failed to sync location ${location.location_id}:`, error);
            errors++;
          }
        }

        if (loaded > 0) {
          toast.success(
            'Locations Synchronized',
            `Loaded ${loaded} location${loaded > 1 ? 's' : ''} from project directory`,
            3000
          );
        }

        return { loaded, errors };
      } catch (error) {
        console.error('[useLocationPersistence] Failed to sync locations from project:', error);
        return { loaded, errors };
      }
    },
    [addLocation, updateLocation, loadLocationsFromProjectDirectory]
  );

  return {
    saveLocation,
    loadAndSyncLocations,
    removeLocation,
    syncLocationsFromProject,
    saveToProjectDirectory,
    loadLocationsFromProjectDirectory,
  };
}
