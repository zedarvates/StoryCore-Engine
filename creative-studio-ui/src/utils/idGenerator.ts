/**
 * ID Generator Utility
 * 
 * Generates unique IDs for various entities in the application
 */

/**
 * Generate a unique ID using timestamp and random string
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomStr}`;
}

/**
 * Generate a unique ID with a prefix
 */
export function generateIdWithPrefix(prefix: string): string {
  return `${prefix}-${generateId()}`;
}

/**
 * Check if an ID is valid (non-empty string)
 */
export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0;
}

/**
 * Generate a batch of unique IDs
 */
export function generateIds(count: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(generateId());
    // Small delay to ensure uniqueness
    if (i < count - 1) {
      const start = Date.now();
      while (Date.now() - start < 1) {
        // Busy wait for 1ms
      }
    }
  }
  return ids;
}
