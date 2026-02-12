/**
 * Prop Validator Utility
 * 
 * Runtime validation for component props to catch bugs early
 */

import { Logger } from './logger';

/**
 * Validate that a value is not null or undefined
 */
export function validateRequired<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    const error = `Required field "${fieldName}" is missing`;
    Logger.error(error);
    throw new Error(error);
  }
  return value;
}

/**
 * Validate that a value is a function
 */
export function validateFunction(value: unknown, fieldName: string): Function {
  if (typeof value !== 'function') {
    const error = `Field "${fieldName}" must be a function, got ${typeof value}`;
    Logger.error(error);
    throw new Error(error);
  }
  return value;
}

/**
 * Validate that a value is a string
 */
export function validateString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    const error = `Field "${fieldName}" must be a string, got ${typeof value}`;
    Logger.error(error);
    throw new Error(error);
  }
  return value;
}

/**
 * Validate that a value is an array
 */
export function validateArray<T>(value: unknown, fieldName: string): T[] {
  if (!Array.isArray(value)) {
    const error = `Field "${fieldName}" must be an array, got ${typeof value}`;
    Logger.error(error);
    throw new Error(error);
  }
  return value;
}

/**
 * Validate that an array is not empty
 */
export function validateNonEmptyArray<T>(value: T[], fieldName: string): T[] {
  if (value.length === 0) {
    const error = `Field "${fieldName}" cannot be empty`;
    Logger.error(error);
    throw new Error(error);
  }
  return value;
}

/**
 * Validate that a value is a React node
 */
export function validateReactNode(value: unknown, fieldName: string): unknown {
  if (value === null || value === undefined) {
    const error = `Field "${fieldName}" cannot be null or undefined`;
    Logger.error(error);
    throw new Error(error);
  }
  return value;
}

/**
 * Validate component props
 */
export function validateComponentProps(props: Record<string, unknown>, schema: Record<string, (value: unknown) => void>): void {
  Object.entries(schema).forEach(([fieldName, validator]) => {
    try {
      validator(props[fieldName]);
    } catch (error) {
      Logger.error(`Prop validation failed for "${fieldName}":`, error);
      throw error;
    }
  });
}

/**
 * Create a prop validator for a component
 */
export function createPropValidator(schema: Record<string, (value: unknown) => void>) {
  return (props: Record<string, unknown>) => {
    validateComponentProps(props, schema);
  };
}

/**
 * Example usage:
 * 
 * const validateMyComponentProps = createPropValidator({
 *   title: (v) => validateString(v, 'title'),
 *   steps: (v) => validateNonEmptyArray(validateArray(v, 'steps'), 'steps'),
 *   children: (v) => validateReactNode(v, 'children'),
 *   onCancel: (v) => validateFunction(v, 'onCancel'),
 *   onComplete: (v) => v && validateFunction(v, 'onComplete'),
 * });
 * 
 * export function MyComponent(props: MyComponentProps) {
 *   validateMyComponentProps(props);
 *   // ... rest of component
 * }
 */



