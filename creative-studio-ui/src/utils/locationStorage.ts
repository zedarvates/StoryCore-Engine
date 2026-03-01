/**
 * Location Storage Utilities
 * 
 * Provides functions to save and load location data as JSON files in project directories.
 * Locations are stored in: ./projects/{project_id}/locations/{location_id}.json
 */

import type { Location, LocationType, LocationMetadata } from '@/types/location';

/**
 * Save result interface
 */
export interface SaveLocationResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Creates a complete Location object from wizard location data
 * 
 * @param locationId - Unique identifier for the location
 * @param wizardData - Wizard form data including name, type, description, and optional location_type
 * @param options - Project and world context options
 */
export function createLocationFromWizardData(
  locationId: string,
  wizardData: {
    name: string;
    type: 'city' | 'wilderness' | 'dungeon' | 'other';
    description: string;
    coordinates?: { x: number; y: number };
    /** Explicit interior/exterior type - takes precedence over inferred type */
    location_type?: LocationType;
  },
  options: {
    projectId: string;
    worldId?: string;
    worldLocationId?: string;
  }
): Location {
  // Determine location type with explicit preference, then inference from wizard type
  let locationType: LocationType;

  if (wizardData.location_type) {
    // Use explicit location_type if provided
    locationType = wizardData.location_type;
  } else {
    // Infer from wizard type - map location categories to interior/exterior
    // 'dungeon' typically means indoor/underground, others are typically outdoor
    locationType = wizardData.type === 'dungeon' ? 'interior' : 'exterior';
  }

  // Build metadata from wizard data
  const metadata: LocationMetadata = {
    description: wizardData.description,
    atmosphere: '',
    genre_tags: [],
  };

  const location: Location = {
    location_id: locationId,
    world_id: options.worldId,
    world_location_id: options.worldLocationId,
    name: wizardData.name,
    creation_method: 'wizard',
    creation_timestamp: Date.now(),
    last_modified: Date.now(),
    version: '1.0',
    location_type: locationType,
    texture_direction: locationType === 'exterior' ? 'outward' : 'inward',
    metadata,
    cube_textures: {},
    placed_assets: [],
    is_world_derived: !!options.worldId || !!options.worldLocationId,
    prompts: [],
  };

  return location;
}

function getLocationsDir(projectId: string): string {
  // If it's an absolute path
  if (projectId.match(/^[a-zA-Z]:[\\/]/) || projectId.startsWith('/')) {
    return `${projectId}/locations`;
  }
  return `./projects/${projectId}/locations`;
}

/**
 * Saves a location to the project's locations directory
 * 
 * @param projectId - The project ID
 * @param locationId - The location UUID
 * @param locationData - The location data to save
 * @returns Promise<SaveLocationResult>
 */
export async function saveLocationToProject(
  projectId: string,
  locationId: string,
  locationData: Location
): Promise<SaveLocationResult> {
  try {
    // Validate required fields
    if (!locationId) {
      return { success: false, error: 'Location ID is required' };
    }

    if (!locationData.name) {
      return { success: false, error: 'Location name is required' };
    }

    // Check if Electron API is available
    if (!window.electronAPI?.fs) {
      console.warn('[locationStorage] Electron API not available, falling back to localStorage');

      // Fallback: Save to localStorage
      const key = `project-${projectId}-locations`;
      const existingLocations = JSON.parse(localStorage.getItem(key) || '{}');
      existingLocations[locationId] = locationData;
      localStorage.setItem(key, JSON.stringify(existingLocations));

      return {
        success: true,
        filePath: `localStorage://${projectId}/locations/${locationId}.json`
      };
    }

    // Build file path
    const locationsDir = getLocationsDir(projectId);
    const filePath = `${locationsDir}/${locationId}.json`;

    // Ensure directory exists using mkdir (recursive to create parent directories if needed)
    if (window.electronAPI.fs.mkdir) {
      await window.electronAPI.fs.mkdir(locationsDir, { recursive: true });
    }

    // Create JSON content
    const jsonData = JSON.stringify(locationData, null, 2);

    // Write file (convert string to Buffer for compatibility)
    await window.electronAPI.fs.writeFile(filePath, jsonData);

    console.log(`[locationStorage] Location saved: ${filePath}`);

    return { success: true, filePath };
  } catch (error) {
    console.error('[locationStorage] Failed to save location:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Saves multiple locations to the project
 */
export async function saveLocationsToProject(
  projectId: string,
  locations: Array<{ id: string; data: Location }>
): Promise<SaveLocationResult[]> {
  const results = await Promise.all(
    locations.map(loc => saveLocationToProject(projectId, loc.id, loc.data))
  );
  return results;
}

/**
 * Loads a location from the project
 */
export async function loadLocationFromProject(
  projectId: string,
  locationId: string
): Promise<Location | null> {
  try {
    if (!window.electronAPI?.fs) {
      // Fallback to localStorage
      const key = `project-${projectId}-locations`;
      const existingLocations = JSON.parse(localStorage.getItem(key) || '{}');
      return existingLocations[locationId] || null;
    }

    // Try standard path first
    const locationsDir = getLocationsDir(projectId);
    const standardPath = `${locationsDir}/${locationId}.json`;
    if (await window.electronAPI.fs.exists(standardPath)) {
      const fileContent = await window.electronAPI.fs.readFile(standardPath);
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(fileContent)) as Location;
    }

    // Try new directory-based organization: locations/{name}/{locationId}.json
    const items = await window.electronAPI.fs.readdir(locationsDir);
    
    for (const item of items) {
      if (item.includes('.')) continue; // Skip files with extensions
      
      const nestedPath = `${locationsDir}/${item}/${locationId}.json`;
      if (await window.electronAPI.fs.exists(nestedPath)) {
        const fileContent = await window.electronAPI.fs.readFile(nestedPath);
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(fileContent)) as Location;
      }
      
      // Also try locations/{name}/{name}.json if locationId matches the name
      const namePath = `${locationsDir}/${item}/${item}.json`;
      if (item === locationId && await window.electronAPI.fs.exists(namePath)) {
        const fileContent = await window.electronAPI.fs.readFile(namePath);
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(fileContent)) as Location;
      }
    }

    return null;
  } catch (error) {
    console.error('[locationStorage] Failed to load location:', error);
    return null;
  }
}

/**
 * Lists all locations in a project
 */
export async function listLocationsInProject(
  projectId: string
): Promise<string[]> {
  try {
    if (!window.electronAPI?.fs) {
      // Fallback to localStorage
      const key = `project-${projectId}-locations`;
      const existingLocations = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.keys(existingLocations);
    }

    const locationsDir = getLocationsDir(projectId);

    const exists = await window.electronAPI.fs.exists(locationsDir);
    if (!exists) {
      return [];
    }

    const items = await window.electronAPI.fs.readdir(locationsDir);
    const locationIds: string[] = [];

    for (const item of items) {
      if (item.endsWith('.json')) {
        // Standard organization: locations/{id}.json
        locationIds.push(item.replace('.json', ''));
      } else {
        // New organization: locations/{name}/ containing a .json file
        try {
          const subDir = `${locationsDir}/${item}`;
          // Check if it's a directory by trying to readdir it (simplest check if we don't have isDirectory)
          const subFiles = await window.electronAPI.fs.readdir(subDir);
          const jsonFile = subFiles.find((f: string) => f.endsWith('.json'));
          if (jsonFile) {
            // Use the JSON filename as the ID (consistent with standard approach)
            locationIds.push(jsonFile.replace('.json', ''));
          }
        } catch {
          // Skip items that aren't directories or fail to read
        }
      }
    }

    return Array.from(new Set(locationIds));
  } catch (error) {
    console.error('[locationStorage] Failed to list locations:', error);
    return [];
  }
}

/**
 * Deletes a location from the project
 */
export async function deleteLocationFromProject(
  projectId: string,
  locationId: string
): Promise<boolean> {
  try {
    if (!window.electronAPI?.fs) {
      // Fallback to localStorage
      const key = `project-${projectId}-locations`;
      const existingLocations = JSON.parse(localStorage.getItem(key) || '{}');
      delete existingLocations[locationId];
      localStorage.setItem(key, JSON.stringify(existingLocations));
      return true;
    }

    const locationsDir = getLocationsDir(projectId);
    const filePath = `${locationsDir}/${locationId}.json`;

    // Try to delete the file, but don't fail if it doesn't exist
    try {
      if (window.electronAPI.fs.unlink) {
        await window.electronAPI.fs.unlink(filePath);
      }
    } catch {
      // Ignore deletion errors - file may not exist
    }

    return true;
  } catch (error) {
    console.error('[locationStorage] Failed to delete location:', error);
    return false;
  }
}
