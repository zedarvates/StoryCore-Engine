/**
 * Cross-Platform Path Utilities
 * 
 * Provides cross-platform file path handling utilities.
 * Ensures compatibility across Windows, Linux, and macOS.
 * 
 * Note: This is a browser-compatible implementation that mimics Node.js path module behavior.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 */

// Detect platform separator (for display purposes)
const isWindowsPath = (path: string): boolean => /^[a-zA-Z]:\\/.test(path) || path.includes('\\');
const POSIX_SEP = '/';
const WIN_SEP = '\\';

/**
 * Join path segments using forward slashes (standard for web/storage)
 * 
 * @param segments - Path segments to join
 * @returns Joined path with forward slashes
 */
export function joinPath(...segments: string[]): string {
  // Filter out empty segments
  const filtered = segments.filter(seg => seg && seg.length > 0);
  
  if (filtered.length === 0) {
    return '.';
  }
  
  // Join with forward slash and normalize
  let joined = filtered.join(POSIX_SEP);
  
  // Normalize multiple slashes
  joined = joined.replace(/\/+/g, POSIX_SEP);
  
  // Remove trailing slash unless it's the root
  if (joined.length > 1 && joined.endsWith(POSIX_SEP)) {
    joined = joined.slice(0, -1);
  }
  
  return joined;
}

/**
 * Normalize a path to use forward slashes (for storage in JSON)
 * 
 * @param filePath - Path to normalize
 * @returns Path with forward slashes
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, POSIX_SEP).replace(/\/+/g, POSIX_SEP);
}

/**
 * Convert a stored path (with forward slashes) to platform-specific format
 * For browser environment, this returns the path as-is with forward slashes
 * 
 * @param storedPath - Path with forward slashes from JSON
 * @returns Path (forward slashes for web compatibility)
 */
export function toPlatformPath(storedPath: string): string {
  // In browser environment, always use forward slashes
  return normalizePath(storedPath);
}

/**
 * Get the directory name from a path
 * 
 * @param filePath - Full file path
 * @returns Directory path
 */
export function getDirName(filePath: string): string {
  const normalized = normalizePath(filePath);
  const lastSlash = normalized.lastIndexOf(POSIX_SEP);
  
  if (lastSlash === -1) {
    return '.';
  }
  
  if (lastSlash === 0) {
    return POSIX_SEP;
  }
  
  return normalized.slice(0, lastSlash);
}

/**
 * Get the base name (filename with extension) from a path
 * 
 * @param filePath - Full file path
 * @returns Filename with extension
 */
export function getBaseName(filePath: string): string {
  const normalized = normalizePath(filePath);
  const lastSlash = normalized.lastIndexOf(POSIX_SEP);
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
}

/**
 * Get the file extension from a path
 * 
 * @param filePath - Full file path
 * @returns File extension (including the dot)
 */
export function getExtension(filePath: string): string {
  const base = getBaseName(filePath);
  const lastDot = base.lastIndexOf('.');
  
  if (lastDot === -1 || lastDot === 0) {
    return '';
  }
  
  return base.slice(lastDot);
}

/**
 * Get the filename without extension
 * 
 * @param filePath - Full file path
 * @returns Filename without extension
 */
export function getFileNameWithoutExt(filePath: string): string {
  const base = getBaseName(filePath);
  const ext = getExtension(filePath);
  return ext ? base.slice(0, -ext.length) : base;
}

/**
 * Check if a path is absolute
 * 
 * @param filePath - Path to check
 * @returns True if path is absolute
 */
export function isAbsolute(filePath: string): boolean {
  // Check for Windows absolute path (C:\, D:\, etc.)
  if (/^[a-zA-Z]:[\\\/]/.test(filePath)) {
    return true;
  }
  
  // Check for Unix absolute path (starts with /)
  if (filePath.startsWith(POSIX_SEP)) {
    return true;
  }
  
  return false;
}

/**
 * Resolve a relative path to an absolute path
 * Note: In browser environment, this is limited - mainly for path manipulation
 * 
 * @param basePath - Base directory path
 * @param relativePath - Relative path to resolve
 * @returns Resolved path
 */
export function resolvePath(basePath: string, relativePath: string): string {
  if (isAbsolute(relativePath)) {
    return normalizePath(relativePath);
  }
  
  return joinPath(basePath, relativePath);
}

/**
 * Get the relative path from one path to another
 * 
 * @param from - Starting path
 * @param to - Target path
 * @returns Relative path from 'from' to 'to'
 */
export function getRelativePath(from: string, to: string): string {
  const fromParts = normalizePath(from).split(POSIX_SEP).filter(p => p);
  const toParts = normalizePath(to).split(POSIX_SEP).filter(p => p);
  
  // Find common base
  let commonLength = 0;
  const minLength = Math.min(fromParts.length, toParts.length);
  
  for (let i = 0; i < minLength; i++) {
    if (fromParts[i] === toParts[i]) {
      commonLength++;
    } else {
      break;
    }
  }
  
  // Build relative path
  const upCount = fromParts.length - commonLength;
  const relativeParts = Array(upCount).fill('..');
  const remainingParts = toParts.slice(commonLength);
  
  return joinPath(...relativeParts, ...remainingParts);
}

/**
 * Ensure a path uses forward slashes (standard for web)
 * Handles both forward slashes and backslashes in input
 * 
 * @param filePath - Path to normalize
 * @returns Path with forward slashes
 */
export function ensurePlatformSeparator(filePath: string): string {
  return normalizePath(filePath);
}

/**
 * Build a project file path following the documented pattern
 * 
 * @param projectPath - Base project directory path
 * @param category - File category (e.g., 'characters', 'scenes', 'shots')
 * @param filename - Filename
 * @returns Full file path
 */
export function buildProjectFilePath(
  projectPath: string,
  category: string,
  filename: string
): string {
  return joinPath(projectPath, category, filename);
}

/**
 * Build an asset file path following the documented pattern
 * 
 * @param projectPath - Base project directory path
 * @param assetType - Asset type ('images', 'audio', 'video')
 * @param filename - Filename
 * @returns Full file path
 */
export function buildAssetFilePath(
  projectPath: string,
  assetType: 'images' | 'audio' | 'video',
  filename: string
): string {
  return joinPath(projectPath, 'assets', assetType, filename);
}

/**
 * Generate a unique filename with timestamp
 * 
 * @param prefix - Filename prefix
 * @param extension - File extension (without dot)
 * @returns Unique filename
 */
export function generateUniqueFilename(prefix: string, extension: string): string {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Generate a unique ID following the documented pattern
 * 
 * @param prefix - ID prefix (e.g., 'shot', 'char', 'scene')
 * @param index - Optional index for sequential IDs
 * @returns Unique ID
 */
export function generateUniqueId(prefix: string, index?: number): string {
  const timestamp = Date.now();
  if (index !== undefined) {
    return `${prefix}_${timestamp}_${index}`;
  }
  return `${prefix}_${timestamp}`;
}

/**
 * Sanitize a filename to remove invalid characters
 * 
 * @param filename - Original filename
 * @returns Sanitized filename safe for all platforms
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace characters that are invalid on Windows, macOS, or Linux
  return filename
    .replace(/[<>:"|?*]/g, '') // Windows invalid chars
    .replace(/\//g, '-') // Forward slash
    .replace(/\\/g, '-') // Backslash
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/\.+/g, '.') // Collapse multiple dots
    .replace(/^\./, '') // Remove leading dot
    .trim();
}

/**
 * Validate that a path is safe (no directory traversal)
 * 
 * @param basePath - Base directory that should contain the path
 * @param targetPath - Path to validate
 * @returns True if path is safe
 */
export function isSafePath(basePath: string, targetPath: string): boolean {
  const normalizedBase = normalizePath(basePath);
  const normalizedTarget = normalizePath(targetPath);
  
  // Resolve the target path relative to base
  const resolved = resolvePath(normalizedBase, normalizedTarget);
  
  // Check if resolved path starts with base path
  return resolved.startsWith(normalizedBase);
}

/**
 * Get the path separator (always forward slash for web)
 * 
 * @returns Path separator
 */
export function getPathSeparator(): string {
  return POSIX_SEP;
}

/**
 * Check if the current platform is Windows
 * In browser environment, this checks the user agent
 * 
 * @returns True if running on Windows
 */
export function isWindows(): boolean {
  if (typeof navigator !== 'undefined') {
    return navigator.platform.toLowerCase().includes('win');
  }
  return false;
}

/**
 * Format a path for display in the UI (always use forward slashes)
 * 
 * @param filePath - Path to format
 * @returns Path formatted for display
 */
export function formatPathForDisplay(filePath: string): string {
  return normalizePath(filePath);
}

/**
 * Parse a file path into its components
 * 
 * @param filePath - Path to parse
 * @returns Object with path components
 */
export function parseFilePath(filePath: string): {
  dir: string;
  base: string;
  ext: string;
  name: string;
} {
  const normalized = normalizePath(filePath);
  const dir = getDirName(normalized);
  const base = getBaseName(normalized);
  const ext = getExtension(normalized);
  const name = getFileNameWithoutExt(normalized);
  
  return { dir, base, ext, name };
}
