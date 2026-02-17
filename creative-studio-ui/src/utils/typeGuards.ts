/**
 * Type Guard Utilities
 */

/**
 * Checks if a value is a plain object (Record<string, unknown>)
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks if a value is a string
 */
export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/**
 * Checks if a value is a number
 */
export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
}

/**
 * Checks if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

/**
 * Checks if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}
