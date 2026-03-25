/**
 * ID Generator Utility
 * 
 * Generates unique IDs for various entities in the application.
 * Uses cryptographically secure random values when available.
 */

/**
 * Generate a unique ID using crypto.randomUUID() or a fallback
 */
export function generateId(): string {
  // Use crypto.randomUUID() if available (modern browsers and Node.js 14.17+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older environments
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 11);
  return `${timestamp}-${randomStr}`;
}

/**
 * Generate a unique ID with a prefix
 * @param prefix The prefix to add to the ID
 */
export function generateIdWithPrefix(prefix: string): string {
  const id = generateId();
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Check if an ID is valid (non-empty string)
 */
export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.trim().length > 0;
}

/**
 * Generate a batch of unique IDs
 * @param count Number of IDs to generate
 */
export function generateIds(count: number): string[] {
  return Array.from({ length: count }, () => generateId());
}

