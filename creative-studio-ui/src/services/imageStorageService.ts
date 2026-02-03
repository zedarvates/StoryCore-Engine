/**
 * Image Storage Service
 * 
 * Handles downloading images from ComfyUI and saving them to the project folder.
 * Supports both Electron (file system) and Web (IndexedDB) modes.
 */

// ============================================================================
// Types
// ============================================================================

export interface SaveImageResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

// ============================================================================
// Electron Mode - File System Storage
// ============================================================================

/**
 * Downloads an image from ComfyUI and saves it to the project folder
 * @param imageUrl - The ComfyUI image URL (http://localhost:8000/view?...)
 * @param projectPath - The project folder path
 * @param characterId - The character ID for filename
 * @returns The local file path relative to project
 */
export async function downloadAndSaveImageElectron(
  imageUrl: string,
  projectPath: string,
  characterId: string
): Promise<SaveImageResult> {
  try {
    // Check if Electron API is available
    if (!(window as any).electronAPI?.fs?.mkdir || !(window as any).electronAPI?.fs?.writeFile) {
      console.warn('⚠️ [ImageStorage] Electron API not available, falling back to web mode');
      return downloadAndSaveImageWeb(imageUrl, characterId);
    }
    
    console.log('📥 [ImageStorage] Downloading image from ComfyUI:', imageUrl);
    
    // 1. Download image from ComfyUI
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('✅ [ImageStorage] Image downloaded, size:', blob.size, 'bytes');
    
    // 2. Convert to buffer (Uint8Array for browser compatibility)
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // 3. Create characters/portraits directory
    const portraitsDir = `${projectPath}/characters/portraits`;
    console.log('📁 [ImageStorage] Creating directory:', portraitsDir);
    
    await (window as any).electronAPI.fs.mkdir(portraitsDir, { recursive: true });
    
    // 4. Generate filename with timestamp
    const timestamp = Date.now();
    const filename = `${characterId}_${timestamp}.png`;
    const filePath = `${portraitsDir}/${filename}`;
    
    console.log('💾 [ImageStorage] Saving to:', filePath);
    
    // 5. Save file
    await (window as any).electronAPI.fs.writeFile(filePath, buffer);
    
    // 6. Return relative path
    const relativePath = `characters/portraits/${filename}`;
    console.log('✅ [ImageStorage] Image saved successfully:', relativePath);
    
    return {
      success: true,
      localPath: relativePath,
    };
  } catch (error) {
    console.error('❌ [ImageStorage] Failed to save image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Web Mode - IndexedDB Storage
// ============================================================================

/**
 * Opens or creates the IndexedDB database for image storage
 */
async function openImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('storycore-images', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('portraits')) {
        db.createObjectStore('portraits');
      }
    };
  });
}

/**
 * Downloads an image from ComfyUI and saves it to IndexedDB (Web mode)
 * @param imageUrl - The ComfyUI image URL
 * @param characterId - The character ID for key
 * @returns The IndexedDB key for retrieving the image
 */
export async function downloadAndSaveImageWeb(
  imageUrl: string,
  characterId: string
): Promise<SaveImageResult> {
  try {
    console.log('📥 [ImageStorage] Downloading image from ComfyUI (Web mode):', imageUrl);
    
    // 1. Download image from ComfyUI
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('✅ [ImageStorage] Image downloaded, size:', blob.size, 'bytes');
    
    // 2. Open IndexedDB
    const db = await openImageDB();
    
    // 3. Generate key with timestamp
    const timestamp = Date.now();
    const key = `portrait_${characterId}_${timestamp}`;
    
    console.log('💾 [ImageStorage] Saving to IndexedDB with key:', key);
    
    // 4. Save to IndexedDB
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['portraits'], 'readwrite');
      const store = transaction.objectStore('portraits');
      const request = store.put(blob, key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // 5. Return IndexedDB key
    const dbPath = `indexeddb://${key}`;
    console.log('✅ [ImageStorage] Image saved successfully:', dbPath);
    
    return {
      success: true,
      localPath: dbPath,
    };
  } catch (error) {
    console.error('❌ [ImageStorage] Failed to save image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retrieves an image from IndexedDB and creates an object URL
 * @param key - The IndexedDB key (format: "indexeddb://portrait_...")
 * @returns Object URL for the image
 */
export async function getImageFromIndexedDB(key: string): Promise<string | null> {
  try {
    // Remove "indexeddb://" prefix
    const dbKey = key.replace('indexeddb://', '');
    
    console.log('🔍 [ImageStorage] Retrieving image from IndexedDB:', dbKey);
    
    // Open IndexedDB
    const db = await openImageDB();
    
    // Retrieve blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      const transaction = db.transaction(['portraits'], 'readonly');
      const store = transaction.objectStore('portraits');
      const request = store.get(dbKey);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result as Blob);
        } else {
          reject(new Error('Image not found in IndexedDB'));
        }
      };
      request.onerror = () => reject(request.error);
    });
    
    // Create object URL
    const objectUrl = URL.createObjectURL(blob);
    console.log('✅ [ImageStorage] Image retrieved:', objectUrl);
    
    return objectUrl;
  } catch (error) {
    console.error('❌ [ImageStorage] Failed to retrieve image:', error);
    return null;
  }
}

// ============================================================================
// Unified API
// ============================================================================

/**
 * Downloads and saves an image, automatically detecting Electron vs Web mode
 * @param imageUrl - The ComfyUI image URL
 * @param characterId - The character ID
 * @param projectPath - The project folder path (Electron only)
 * @returns Save result with local path
 */
export async function downloadAndSaveImage(
  imageUrl: string,
  characterId: string,
  projectPath?: string
): Promise<SaveImageResult> {
  // Check if running in Electron mode
  const isElectron = !!(window as any).electronAPI?.fs?.writeFile;
  
  if (isElectron && projectPath) {
    return downloadAndSaveImageElectron(imageUrl, projectPath, characterId);
  } else {
    return downloadAndSaveImageWeb(imageUrl, characterId);
  }
}

/**
 * Gets the display URL for an image, handling both file:// and indexeddb:// paths
 * @param imagePath - The image path (relative file path or indexeddb:// URL)
 * @param projectPath - The project folder path (for file:// URLs)
 * @returns Display URL for the image
 */
export async function getImageDisplayUrl(
  imagePath: string,
  projectPath?: string
): Promise<string | null> {
  if (!imagePath) {
    return null;
  }
  
  // IndexedDB path
  if (imagePath.startsWith('indexeddb://')) {
    return await getImageFromIndexedDB(imagePath);
  }
  
  // Relative file path (Electron mode)
  if (imagePath.startsWith('characters/') && projectPath) {
    // Check if Electron API is available
    const isElectron = !!(window as any).electronAPI?.fs?.readFile;
    
    if (isElectron) {
      try {
        // Read file using Electron API
        const fullPath = `${projectPath}/${imagePath}`;
        console.log('📖 [ImageStorage] Reading image from Electron:', fullPath);
        
        const buffer = await (window as any).electronAPI.fs.readFile(fullPath);
        
        // Convert buffer to blob
        const blob = new Blob([buffer], { type: 'image/png' });
        const objectUrl = URL.createObjectURL(blob);
        
        console.log('✅ [ImageStorage] Image loaded from Electron:', objectUrl);
        return objectUrl;
      } catch (error) {
        console.error('❌ [ImageStorage] Failed to read image from Electron:', error);
        return null;
      }
    } else {
      // Fallback to file:// URL (may not work in all contexts)
      return `file://${projectPath}/${imagePath}`;
    }
  }
  
  // Absolute URL (ComfyUI or other)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Unknown format
  console.warn('⚠️ [ImageStorage] Unknown image path format:', imagePath);
  return null;
}

/**
 * Deletes an image from storage
 * @param imagePath - The image path to delete
 * @param projectPath - The project folder path (for file deletion)
 */
export async function deleteImage(
  imagePath: string,
  projectPath?: string
): Promise<boolean> {
  try {
    // IndexedDB path
    if (imagePath.startsWith('indexeddb://')) {
      const dbKey = imagePath.replace('indexeddb://', '');
      const db = await openImageDB();
      
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(['portraits'], 'readwrite');
        const store = transaction.objectStore('portraits');
        const request = store.delete(dbKey);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      console.log('✅ [ImageStorage] Image deleted from IndexedDB:', dbKey);
      return true;
    }
    
    // File path (Electron mode)
    if (imagePath.startsWith('characters/') && projectPath) {
      const fullPath = `${projectPath}/${imagePath}`;
      
      if ((window as any).electronAPI?.fs?.unlink) {
        await (window as any).electronAPI.fs.unlink(fullPath);
        console.log('✅ [ImageStorage] Image file deleted:', fullPath);
        return true;
      }
    }
    
    console.warn('⚠️ [ImageStorage] Cannot delete image, unsupported path:', imagePath);
    return false;
  } catch (error) {
    console.error('❌ [ImageStorage] Failed to delete image:', error);
    return false;
  }
}
