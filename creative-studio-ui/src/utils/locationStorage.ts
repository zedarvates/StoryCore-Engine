/**
 * Location Storage Utilities
 * 
 * Provides functions to save and load location data as JSON files in project directories.
 * Locations are stored in: ./projects/{project_id}/locations/{location_name}/location.json
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
 * Sanitize a name for use as a folder name
 */
function sanitizeFolderName(name: string): string {
  return name
    .trim()
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_') // Replace invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length
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
 * Creates a folder with the location's name and stores location.json inside
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

    const sanitizedName = sanitizeFolderName(locationData.name);

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
        filePath: `localStorage://${projectId}/locations/${sanitizedName}/location.json`
      };
    }

    // Build file path with location name as folder
    const locationsBaseDir = getLocationsDir(projectId);
    let locationDir = `${locationsBaseDir}/${sanitizedName}`;
    let filePath = `${locationDir}/location.json`;

    // Collision detection: Check if folder exists and belongs to a DIFFERENT location
    if (await window.electronAPI.fs.exists(filePath)) {
      try {
        const existingRaw = await window.electronAPI.fs.readFile(filePath);
        const existingData = JSON.parse(new TextDecoder().decode(existingRaw));
        if (existingData.location_id && existingData.location_id !== locationId) {
          // Name collision! Use ID suffix to differentiate
          const shortId = locationId.substring(0, 5);
          locationDir = `${locationsBaseDir}/${sanitizedName}_${shortId}`;
          filePath = `${locationDir}/location.json`;
          console.log(`[locationStorage] Name collision detected, using unique path: ${locationDir}`);
        }
      } catch (err) {
        console.warn('[locationStorage] Could not read existing location for collision check', err);
      }
    }

    // Ensure directory exists using mkdir (recursive to create parent directories if needed)
    if (window.electronAPI.fs.mkdir) {
      await window.electronAPI.fs.mkdir(locationDir, { recursive: true });
    }

    // Create JSON content
    const jsonData = JSON.stringify(locationData, null, 2);

    // Write file (convert string to Buffer for compatibility)
    await window.electronAPI.fs.writeFile(filePath, jsonData);

    console.log(`[locationStorage] Location saved: ${filePath}`);

    // Create subdirectories for resources
    try {
      await window.electronAPI.fs.mkdir(`${locationDir}/images`, { recursive: true });
      await window.electronAPI.fs.mkdir(`${locationDir}/cube_textures`, { recursive: true });
      await window.electronAPI.fs.mkdir(`${locationDir}/assets`, { recursive: true });
    } catch (error) {
      console.warn('[locationStorage] Could not create resource directories:', error);
    }

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
 * Searches in location folders
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

    const locationsBaseDir = getLocationsDir(projectId);

    // List all location folders
    const exists = await window.electronAPI.fs.exists(locationsBaseDir);
    if (!exists) {
      return null;
    }

    const folders = await window.electronAPI.fs.readdir(locationsBaseDir);

    // Search for location.json in each folder
    for (const folder of folders) {
      const filePath = `${locationsBaseDir}/${folder}/location.json`;
      
      try {
        const fileExists = await window.electronAPI.fs.exists(filePath);
        if (!fileExists) continue;

        const fileContent = await window.electronAPI.fs.readFile(filePath);
        const decoder = new TextDecoder();
        const jsonData = decoder.decode(fileContent);
        const location = JSON.parse(jsonData) as Location;

        // Check if this is the location we're looking for
        if (location.location_id === locationId) {
          return location;
        }
      } catch (error) {
        console.warn(`[locationStorage] Failed to read location from ${folder}:`, error);
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
 * Searches through location folders
 */
/**
 * Loads all locations for a given project in a single parallel pass
 */
export async function loadAllLocationsInProject(
  projectId: string
): Promise<Location[]> {
  try {
    if (!window.electronAPI?.fs) {
      // Fallback to localStorage
      const key = `project-${projectId}-locations`;
      const existingLocationsObj = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.values(existingLocationsObj) as Location[];
    }

    const locationsBaseDir = getLocationsDir(projectId);
    const exists = await window.electronAPI.fs.exists(locationsBaseDir);
    if (!exists) return [];

    const folders = await window.electronAPI.fs.readdir(locationsBaseDir);
    
    // Process all folders in parallel
    const locationPromises = folders.map(async (folder) => {
      const filePath = `${locationsBaseDir}/${folder}/location.json`;
      try {
        const fileExists = await window.electronAPI.fs.exists(filePath);
        if (!fileExists) return null;

        const fileContent = await window.electronAPI.fs.readFile(filePath);
        return JSON.parse(new TextDecoder().decode(fileContent)) as Location;
      } catch (err) {
        console.warn(`[locationStorage] Failed to read location in folder ${folder}:`, err);
        return null;
      }
    });

    const results = await Promise.all(locationPromises);
    return results.filter((loc): loc is Location => loc !== null);
  } catch (error) {
    console.error('[locationStorage] Failed to load all locations:', error);
    return [];
  }
}

/**
 * Lists the IDs of all locations in the project
 * (Now uses the optimized parallel loading internally to get the IDs)
 */
export async function listLocationsInProject(
  projectId: string
): Promise<string[]> {
  const locations = await loadAllLocationsInProject(projectId);
  return locations.map(l => l.location_id);
}

/**
 * Recursively delete a directory and all its contents
 */
async function deleteDirectoryRecursive(dirPath: string): Promise<void> {
  if (!window.electronAPI?.fs) {
    throw new Error('Electron API not available');
  }

  try {
    const exists = await window.electronAPI.fs.exists(dirPath);
    if (!exists) return;

    const items = await window.electronAPI.fs.readdir(dirPath);

    // Delete all files and subdirectories
    for (const item of items) {
      const itemPath = `${dirPath}/${item}`;
      const stats = await window.electronAPI.fs.stat(itemPath);

      if (stats.isDirectory) {
        // Recursively delete subdirectory
        await deleteDirectoryRecursive(itemPath);
      } else {
        // Delete file
        await window.electronAPI.fs.unlink(itemPath);
      }
    }

    console.log(`[locationStorage] Deleted directory: ${dirPath}`);
  } catch (error) {
    console.error(`[locationStorage] Failed to delete directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Deletes a location from the project
 * Deletes the entire location folder
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

    const locationsBaseDir = getLocationsDir(projectId);
    const folders = await window.electronAPI.fs.readdir(locationsBaseDir);

    // Find the folder containing this location
    for (const folder of folders) {
      const filePath = `${locationsBaseDir}/${folder}/location.json`;
      
      try {
        const exists = await window.electronAPI.fs.exists(filePath);
        if (!exists) continue;

        const fileContent = await window.electronAPI.fs.readFile(filePath);
        const decoder = new TextDecoder();
        const jsonData = decoder.decode(fileContent);
        const location = JSON.parse(jsonData) as Location;

        if (location.location_id === locationId) {
          // Delete the entire folder recursively
          const folderPath = `${locationsBaseDir}/${folder}`;
          await deleteDirectoryRecursive(folderPath);
          return true;
        }
      } catch (error) {
        console.warn(`[locationStorage] Failed to check location in ${folder}:`, error);
      }
    }

    return false;
  } catch (error) {
    console.error('[locationStorage] Failed to delete location:', error);
    return false;
  }
}
