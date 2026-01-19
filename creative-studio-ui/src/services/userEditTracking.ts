/**
 * User Edit Tracking Service
 * 
 * Tracks which fields have been manually edited by the user
 * Preserves user edits during LLM regeneration
 * 
 * Validates Requirements: 1.8
 */

// ============================================================================
// Types
// ============================================================================

export interface EditTrackingState {
  /**
   * Map of field paths to edit status
   * Example: { "name": true, "visual_identity.hair_color": true }
   */
  editedFields: Record<string, boolean>;

  /**
   * Timestamp of last edit
   */
  lastEditTime: Date;
}

// ============================================================================
// Edit Tracking Manager
// ============================================================================

export class EditTrackingManager {
  private editedFields: Set<string> = new Set();
  private lastEditTime: Date = new Date();

  /**
   * Mark a field as edited by the user
   */
  markFieldAsEdited(fieldPath: string): void {
    this.editedFields.add(fieldPath);
    this.lastEditTime = new Date();
  }

  /**
   * Mark multiple fields as edited
   */
  markFieldsAsEdited(fieldPaths: string[]): void {
    fieldPaths.forEach((path) => this.editedFields.add(path));
    this.lastEditTime = new Date();
  }

  /**
   * Check if a field has been edited
   */
  isFieldEdited(fieldPath: string): boolean {
    return this.editedFields.has(fieldPath);
  }

  /**
   * Get all edited field paths
   */
  getEditedFields(): string[] {
    return Array.from(this.editedFields);
  }

  /**
   * Clear edit tracking for a specific field
   */
  clearFieldEdit(fieldPath: string): void {
    this.editedFields.delete(fieldPath);
  }

  /**
   * Clear all edit tracking
   */
  clearAllEdits(): void {
    this.editedFields.clear();
    this.lastEditTime = new Date();
  }

  /**
   * Reset a field to generated state (allow regeneration)
   */
  resetFieldToGenerated(fieldPath: string): void {
    this.editedFields.delete(fieldPath);
  }

  /**
   * Get edit tracking state for persistence
   */
  getState(): EditTrackingState {
    return {
      editedFields: Object.fromEntries(
        Array.from(this.editedFields).map((field) => [field, true])
      ),
      lastEditTime: this.lastEditTime,
    };
  }

  /**
   * Restore edit tracking state from persistence
   */
  restoreState(state: EditTrackingState): void {
    this.editedFields = new Set(Object.keys(state.editedFields));
    this.lastEditTime = new Date(state.lastEditTime);
  }

  /**
   * Get count of edited fields
   */
  getEditedFieldCount(): number {
    return this.editedFields.size;
  }
}

// ============================================================================
// Merge Strategy for Regeneration
// ============================================================================

/**
 * Merges generated data with user-edited data
 * Preserves user edits while updating non-edited fields
 */
export function mergeWithUserEdits<T extends Record<string, any>>(
  generatedData: T,
  currentData: T,
  editTracker: EditTrackingManager
): T {
  // Recursively preserve edited fields
  // Using 'any' for recursive merge to handle nested objects of varying structures
  function preserveEdits(
    generated: any,
    current: any,
    path: string = ''
  ): any {
    if (typeof generated !== 'object' || generated === null) {
      // Check if this field was edited
      if (editTracker.isFieldEdited(path)) {
        return current;
      }
      return generated;
    }

    if (Array.isArray(generated)) {
      // For arrays, check if the entire array was edited
      if (editTracker.isFieldEdited(path)) {
        return current;
      }
      return generated;
    }

    // For objects, recursively check each property
    // Using 'any' for result object to build merged structure dynamically
    const result: any = {};
    const allKeys = new Set([
      ...Object.keys(generated),
      ...Object.keys(current || {}),
    ]);

    allKeys.forEach((key) => {
      const fieldPath = path ? `${path}.${key}` : key;
      const generatedValue = generated[key];
      const currentValue = current?.[key];

      if (editTracker.isFieldEdited(fieldPath)) {
        // Preserve user edit
        result[key] = currentValue;
      } else if (
        typeof generatedValue === 'object' &&
        generatedValue !== null &&
        !Array.isArray(generatedValue)
      ) {
        // Recursively merge nested objects
        result[key] = preserveEdits(generatedValue, currentValue, fieldPath);
      } else {
        // Use generated value
        result[key] = generatedValue;
      }
    });

    return result;
  }

  return preserveEdits(generatedData, currentData) as T;
}

// ============================================================================
// Field Path Utilities
// ============================================================================

/**
 * Converts a nested object path to a field path string
 * Example: ["visual_identity", "hair_color"] => "visual_identity.hair_color"
 */
export function createFieldPath(pathSegments: string[]): string {
  return pathSegments.join('.');
}

/**
 * Extracts field path from an input name
 * Example: "visual_identity.hair_color" => ["visual_identity", "hair_color"]
 */
export function parseFieldPath(fieldPath: string): string[] {
  return fieldPath.split('.');
}

/**
 * Gets the value at a field path in an object
 */
// Using 'any' for obj parameter and return type to support accessing any object structure
export function getValueAtPath(obj: any, fieldPath: string): any {
  const segments = parseFieldPath(fieldPath);
  let current = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

/**
 * Sets the value at a field path in an object
 */
// Using 'any' for obj and value parameters to support setting values in any object structure
export function setValueAtPath(
  obj: any,
  fieldPath: string,
  value: any
): void {
  const segments = parseFieldPath(fieldPath);
  let current = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (!(segment in current)) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
}

// ============================================================================
// React Hook for Edit Tracking
// ============================================================================

import { useState, useCallback, useRef } from 'react';

export function useEditTracking() {
  const trackerRef = useRef(new EditTrackingManager());
  const [editCount, setEditCount] = useState(0);

  const markFieldAsEdited = useCallback((fieldPath: string) => {
    trackerRef.current.markFieldAsEdited(fieldPath);
    setEditCount(trackerRef.current.getEditedFieldCount());
  }, []);

  const markFieldsAsEdited = useCallback((fieldPaths: string[]) => {
    trackerRef.current.markFieldsAsEdited(fieldPaths);
    setEditCount(trackerRef.current.getEditedFieldCount());
  }, []);

  const isFieldEdited = useCallback((fieldPath: string) => {
    return trackerRef.current.isFieldEdited(fieldPath);
  }, []);

  const resetFieldToGenerated = useCallback((fieldPath: string) => {
    trackerRef.current.resetFieldToGenerated(fieldPath);
    setEditCount(trackerRef.current.getEditedFieldCount());
  }, []);

  const clearAllEdits = useCallback(() => {
    trackerRef.current.clearAllEdits();
    setEditCount(0);
  }, []);

  const getEditedFields = useCallback(() => {
    return trackerRef.current.getEditedFields();
  }, []);

  const mergeWithEdits = useCallback(
    <T extends Record<string, any>>(generatedData: T, currentData: T): T => {
      return mergeWithUserEdits(generatedData, currentData, trackerRef.current);
    },
    []
  );

  return {
    markFieldAsEdited,
    markFieldsAsEdited,
    isFieldEdited,
    resetFieldToGenerated,
    clearAllEdits,
    getEditedFields,
    mergeWithEdits,
    editCount,
    tracker: trackerRef.current,
  };
}
