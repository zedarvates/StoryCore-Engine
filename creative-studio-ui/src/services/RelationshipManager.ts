// ============================================================================
// RelationshipManager - Bidirectional Character Relationship Management
// ============================================================================
// This module provides utilities for managing bidirectional character
// relationships, ensuring that when a relationship is added from Character A
// to Character B, the inverse relationship is automatically created on
// Character B.
//
// Requirements: 6.1, 6.2, 6.3
// ============================================================================

/**
 * Mapping of relationship types to their inverse types.
 * 
 * For asymmetric relationships (e.g., parent/child, mentor/student),
 * the inverse is different from the original.
 * 
 * For symmetric relationships (e.g., friend, sibling, lover),
 * the inverse is the same as the original.
 * 
 * Requirements: 6.1, 6.2, 6.3
 */
export const INVERSE_RELATIONSHIPS: Record<string, string> = {
  // Asymmetric family relationships
  'parent': 'child',
  'child': 'parent',
  'grandparent': 'grandchild',
  'grandchild': 'grandparent',
  'aunt': 'niece',
  'uncle': 'nephew',
  'niece': 'aunt',
  'nephew': 'uncle',
  
  // Symmetric family relationships
  'sibling': 'sibling',
  'cousin': 'cousin',
  'spouse': 'spouse',
  
  // Asymmetric professional/educational relationships
  'mentor': 'student',
  'student': 'mentor',
  'boss': 'employee',
  'employee': 'boss',
  'master': 'apprentice',
  'apprentice': 'master',
  
  // Symmetric professional relationships
  'colleague': 'colleague',
  'partner': 'partner',
  'coworker': 'coworker',
  
  // Symmetric social relationships
  'friend': 'friend',
  'best friend': 'best friend',
  'acquaintance': 'acquaintance',
  'neighbor': 'neighbor',
  
  // Symmetric romantic relationships
  'lover': 'lover',
  'romantic partner': 'romantic partner',
  'ex-lover': 'ex-lover',
  'ex-partner': 'ex-partner',
  
  // Symmetric adversarial relationships
  'enemy': 'enemy',
  'rival': 'rival',
  'nemesis': 'nemesis',
  
  // Symmetric alliance relationships
  'ally': 'ally',
  'comrade': 'comrade',
  'companion': 'companion',
  
  // Asymmetric power relationships
  'guardian': 'ward',
  'ward': 'guardian',
  'protector': 'protected',
  'protected': 'protector',
  
  // Asymmetric influence relationships
  'idol': 'fan',
  'fan': 'idol',
  'leader': 'follower',
  'follower': 'leader',
};

/**
 * Gets the inverse relationship type for a given relationship type.
 * 
 * For symmetric relationships (e.g., friend, sibling), returns the same type.
 * For asymmetric relationships (e.g., parent, mentor), returns the inverse type.
 * 
 * If the relationship type is not found in the mapping, returns the original
 * type (treating it as symmetric by default).
 * 
 * @param relationshipType - The original relationship type
 * @returns The inverse relationship type
 * 
 * @example
 * ```typescript
 * getInverseRelationshipType('parent') // Returns 'child'
 * getInverseRelationshipType('friend') // Returns 'friend'
 * getInverseRelationshipType('mentor') // Returns 'student'
 * getInverseRelationshipType('custom-relationship') // Returns 'custom-relationship'
 * ```
 * 
 * Requirements: 6.1, 6.2, 6.3
 */
export function getInverseRelationshipType(relationshipType: string): string {
  // Normalize the relationship type to lowercase for case-insensitive matching
  const normalizedType = relationshipType.toLowerCase().trim();
  
  // Look up the inverse relationship in the mapping
  const inverse = INVERSE_RELATIONSHIPS[normalizedType];
  
  // If found, return the inverse; otherwise, treat as symmetric and return the original
  return inverse || relationshipType;
}

/**
 * Checks if a relationship type is symmetric (i.e., its inverse is itself).
 * 
 * @param relationshipType - The relationship type to check
 * @returns True if the relationship is symmetric, false otherwise
 * 
 * @example
 * ```typescript
 * isSymmetricRelationship('friend') // Returns true
 * isSymmetricRelationship('parent') // Returns false
 * isSymmetricRelationship('sibling') // Returns true
 * ```
 * 
 * Requirements: 6.1, 6.2, 6.3
 */
export function isSymmetricRelationship(relationshipType: string): boolean {
  const normalizedType = relationshipType.toLowerCase().trim();
  const inverse = INVERSE_RELATIONSHIPS[normalizedType];
  
  // If no inverse is defined, treat as symmetric
  if (!inverse) {
    return true;
  }
  
  // Check if the inverse is the same as the original
  return inverse.toLowerCase() === normalizedType;
}

/**
 * Gets all supported relationship types.
 * 
 * @returns Array of all relationship types defined in the mapping
 */
export function getSupportedRelationshipTypes(): string[] {
  return Object.keys(INVERSE_RELATIONSHIPS);
}

/**
 * Validates if a relationship type is supported.
 * 
 * @param relationshipType - The relationship type to validate
 * @returns True if the relationship type is supported, false otherwise
 */
export function isValidRelationshipType(relationshipType: string): boolean {
  const normalizedType = relationshipType.toLowerCase().trim();
  return normalizedType in INVERSE_RELATIONSHIPS;
}

/**
 * Result of cycle detection in relationship graph.
 * 
 * Requirements: 6.4
 */
export interface CycleDetectionResult {
  /** Whether a cycle was detected */
  hasCycle: boolean;
  /** The path of character IDs forming the cycle, if found */
  cyclePath?: string[];
}

/**
 * Detects circular dependencies in character relationships.
 * 
 * Uses depth-first search (DFS) to traverse the relationship graph and detect
 * cycles. A cycle exists when following relationship references returns to a
 * character already in the current path.
 * 
 * The algorithm checks if adding a relationship from fromCharacterId to toCharacterId
 * would create a cycle by checking if there's already a path from toCharacterId
 * back to fromCharacterId.
 * 
 * @param characters - Map of character ID to character object
 * @param fromCharacterId - The starting character ID
 * @param toCharacterId - The target character ID to add a relationship to
 * @returns CycleDetectionResult indicating if a cycle would be created
 * 
 * @example
 * ```typescript
 * // Scenario: A→B→C, trying to add C→A would create a cycle
 * const result = detectRelationshipCycle(characters, 'C', 'A');
 * // result.hasCycle === true
 * // result.cyclePath === ['C', 'A', 'B', 'C']
 * ```
 * 
 * Requirements: 6.4
 */
export function detectRelationshipCycle(
  characters: Map<string, { character_id: string; relationships: Array<{ character_id: string }> }>,
  fromCharacterId: string,
  toCharacterId: string
): CycleDetectionResult {
  // If adding a self-relationship, that's an immediate cycle
  if (fromCharacterId === toCharacterId) {
    return {
      hasCycle: true,
      cyclePath: [fromCharacterId, toCharacterId],
    };
  }

  // Check if adding this relationship would create a cycle by checking if
  // there's already a path from toCharacter to fromCharacter.
  // If such a path exists, then adding fromCharacter→toCharacter would complete the cycle.
  
  const visited = new Set<string>();
  const path: string[] = [];

  /**
   * DFS helper function to find a path from current to target
   * @param currentId - Current character ID being visited
   * @param targetId - Target character ID we're trying to reach
   * @returns True if a path to target is found
   */
  function findPath(currentId: string, targetId: string): boolean {
    // If we've reached the target, we found a path
    if (currentId === targetId) {
      path.push(currentId);
      return true;
    }

    // Mark as visited to avoid infinite loops
    if (visited.has(currentId)) {
      return false;
    }
    
    visited.add(currentId);
    path.push(currentId);

    // Get the current character
    const currentCharacter = characters.get(currentId);
    
    if (currentCharacter && currentCharacter.relationships) {
      // Visit all adjacent characters (those this character has relationships with)
      for (const relationship of currentCharacter.relationships) {
        const adjacentId = relationship.character_id;
        
        if (findPath(adjacentId, targetId)) {
          return true;
        }
      }
    }

    // Backtrack if no path found through this node
    path.pop();
    return false;
  }

  // Check if there's a path from toCharacter to fromCharacter
  // If yes, adding fromCharacter→toCharacter would create a cycle
  const pathExists = findPath(toCharacterId, fromCharacterId);

  if (pathExists) {
    // We found a path from toCharacter to fromCharacter
    // Adding fromCharacter→toCharacter would complete the cycle
    // The cycle is: fromCharacter → toCharacter → ... → fromCharacter
    const cyclePath = [fromCharacterId, ...path];
    return {
      hasCycle: true,
      cyclePath,
    };
  }

  return {
    hasCycle: false,
  };
}

/**
 * Validates that adding a relationship would not create a cycle.
 * 
 * This is a convenience wrapper around detectRelationshipCycle that returns
 * a boolean and can be used for simple validation.
 * 
 * @param characters - Map of character ID to character object
 * @param fromCharacterId - The starting character ID
 * @param toCharacterId - The target character ID to add a relationship to
 * @returns True if the relationship can be added without creating a cycle
 * 
 * Requirements: 6.4
 */
export function canAddRelationshipWithoutCycle(
  characters: Map<string, { character_id: string; relationships: Array<{ character_id: string }> }>,
  fromCharacterId: string,
  toCharacterId: string
): boolean {
  const result = detectRelationshipCycle(characters, fromCharacterId, toCharacterId);
  return !result.hasCycle;
}

// ============================================================================
// Relationship Management Functions
// ============================================================================

/**
 * Character interface for relationship management.
 * This is a minimal interface that includes only the fields needed for
 * relationship operations.
 */
export interface CharacterForRelationship {
  character_id: string;
  name: string;
  relationships: Array<{
    character_id: string;
    character_name: string;
    relationship_type: string;
    description: string;
    dynamic: string;
  }>;
}

/**
 * Relationship data structure.
 */
export interface RelationshipData {
  relationship_type: string;
  description: string;
  dynamic: string;
}

/**
 * Store interface for character operations.
 * This defines the minimal interface needed for the store to support
 * relationship management.
 */
export interface CharacterStore {
  getCharacter: (id: string) => CharacterForRelationship | undefined;
  updateCharacter: (id: string, updates: Partial<CharacterForRelationship>) => void;
  getAllCharacters?: () => CharacterForRelationship[]; // Optional method to get all characters for cycle detection
}

/**
 * Event emitter interface for character events.
 */
export interface CharacterEventEmitter {
  emit: (eventType: string, payload: any) => void;
}

/**
 * Result of adding a relationship.
 */
export interface AddRelationshipResult {
  success: boolean;
  error?: string;
  fromCharacter?: CharacterForRelationship;
  toCharacter?: CharacterForRelationship;
}

/**
 * Adds a bidirectional relationship between two characters.
 * 
 * This function:
 * 1. Validates that both characters exist
 * 2. Checks that adding the relationship won't create a cycle
 * 3. Adds the relationship to the source character
 * 4. Creates and adds the inverse relationship to the target character
 * 5. Updates both characters in the store
 * 6. Emits update events for both characters
 * 
 * @param store - The character store
 * @param eventEmitter - The event emitter for character events
 * @param fromCharacterId - The source character ID
 * @param toCharacterId - The target character ID
 * @param relationshipData - The relationship data (type, description, dynamic)
 * @returns AddRelationshipResult indicating success or failure
 * 
 * @example
 * ```typescript
 * const result = addRelationship(
 *   store,
 *   eventEmitter,
 *   'char-1',
 *   'char-2',
 *   {
 *     relationship_type: 'mentor',
 *     description: 'Teaches advanced magic',
 *     dynamic: 'Respectful and supportive'
 *   }
 * );
 * 
 * if (result.success) {
 *   console.log('Relationship added successfully');
 *   // char-1 now has 'mentor' relationship to char-2
 *   // char-2 now has 'student' relationship to char-1
 * }
 * ```
 * 
 * Requirements: 6.1
 */
export function addRelationship(
  store: CharacterStore,
  eventEmitter: CharacterEventEmitter,
  fromCharacterId: string,
  toCharacterId: string,
  relationshipData: RelationshipData
): AddRelationshipResult {
  // Validate that both characters exist
  const fromCharacter = store.getCharacter(fromCharacterId);
  const toCharacter = store.getCharacter(toCharacterId);

  if (!fromCharacter) {
    return {
      success: false,
      error: `Source character with ID "${fromCharacterId}" not found`,
    };
  }

  if (!toCharacter) {
    return {
      success: false,
      error: `Target character with ID "${toCharacterId}" not found`,
    };
  }

  // Build a character map for cycle detection
  const characterMap = new Map<string, { character_id: string; relationships: Array<{ character_id: string }> }>();
  
  // If the store provides a method to get all characters, use it for comprehensive cycle detection
  if (store.getAllCharacters) {
    const allCharacters = store.getAllCharacters();
    allCharacters.forEach(char => {
      characterMap.set(char.character_id, char);
    });
  } else {
    // Otherwise, just use the two characters involved
    // This is a limitation - we can only detect direct cycles between these two
    characterMap.set(fromCharacterId, fromCharacter);
    characterMap.set(toCharacterId, toCharacter);
  }

  // Check for cycles
  const canAdd = canAddRelationshipWithoutCycle(characterMap, fromCharacterId, toCharacterId);
  
  if (!canAdd) {
    return {
      success: false,
      error: `Adding relationship from "${fromCharacter.name}" to "${toCharacter.name}" would create a circular dependency`,
    };
  }

  // Get the inverse relationship type
  const inverseRelationshipType = getInverseRelationshipType(relationshipData.relationship_type);

  // Create the forward relationship
  const forwardRelationship = {
    character_id: toCharacterId,
    character_name: toCharacter.name,
    relationship_type: relationshipData.relationship_type,
    description: relationshipData.description,
    dynamic: relationshipData.dynamic,
  };

  // Create the inverse relationship
  const inverseRelationship = {
    character_id: fromCharacterId,
    character_name: fromCharacter.name,
    relationship_type: inverseRelationshipType,
    description: relationshipData.description, // Same description from both perspectives
    dynamic: relationshipData.dynamic, // Same dynamic from both perspectives
  };

  // Add the forward relationship to the source character
  const updatedFromRelationships = [...fromCharacter.relationships, forwardRelationship];
  
  // Add the inverse relationship to the target character
  const updatedToRelationships = [...toCharacter.relationships, inverseRelationship];

  // Update both characters in the store
  store.updateCharacter(fromCharacterId, {
    relationships: updatedFromRelationships,
  });

  store.updateCharacter(toCharacterId, {
    relationships: updatedToRelationships,
  });

  // Get the updated characters
  const updatedFromCharacter = store.getCharacter(fromCharacterId);
  const updatedToCharacter = store.getCharacter(toCharacterId);

  // Emit update events for both characters
  if (eventEmitter) {
    // Emit character updated event for source character
    eventEmitter.emit('character:updated', {
      characterId: fromCharacterId,
      updates: { relationships: updatedFromRelationships },
      source: 'relationship-sync',
      changeType: 'relationship-sync',
      timestamp: new Date(),
    });

    // Emit character updated event for target character
    eventEmitter.emit('character:updated', {
      characterId: toCharacterId,
      updates: { relationships: updatedToRelationships },
      source: 'relationship-sync',
      changeType: 'relationship-sync',
      timestamp: new Date(),
    });

    // Emit relationship added event
    eventEmitter.emit('character:relationship:added', {
      fromCharacterId,
      toCharacterId,
      relationship: forwardRelationship,
      inverseRelationship,
      bidirectional: true,
      timestamp: new Date(),
      source: 'relationship-manager',
    });
  }

  return {
    success: true,
    fromCharacter: updatedFromCharacter,
    toCharacter: updatedToCharacter,
  };
}

/**
 * Result of updating a relationship.
 */
export interface UpdateRelationshipResult {
  success: boolean;
  error?: string;
  fromCharacter?: CharacterForRelationship;
  toCharacter?: CharacterForRelationship;
}

/**
 * Updates a bidirectional relationship between two characters.
 * 
 * This function:
 * 1. Validates that both characters exist
 * 2. Finds the existing relationship on the source character
 * 3. Finds the existing inverse relationship on the target character
 * 4. Updates the relationship on the source character
 * 5. Updates the inverse relationship on the target character
 * 6. Updates both characters in the store
 * 7. Emits update events for both characters
 * 
 * Note: This function updates the description and dynamic fields. The relationship_type
 * cannot be changed through this function - to change the type, remove the old relationship
 * and add a new one.
 * 
 * @param store - The character store
 * @param eventEmitter - The event emitter for character events
 * @param fromCharacterId - The source character ID
 * @param toCharacterId - The target character ID
 * @param updates - Partial relationship data to update (description, dynamic)
 * @returns UpdateRelationshipResult indicating success or failure
 * 
 * @example
 * ```typescript
 * const result = updateRelationship(
 *   store,
 *   eventEmitter,
 *   'char-1',
 *   'char-2',
 *   {
 *     description: 'Updated: Teaches advanced and dark magic',
 *     dynamic: 'Becoming more tense and competitive'
 *   }
 * );
 * 
 * if (result.success) {
 *   console.log('Relationship updated successfully');
 *   // Both char-1→char-2 and char-2→char-1 relationships are updated
 * }
 * ```
 * 
 * Requirements: 6.2
 */
export function updateRelationship(
  store: CharacterStore,
  eventEmitter: CharacterEventEmitter,
  fromCharacterId: string,
  toCharacterId: string,
  updates: Partial<RelationshipData>
): UpdateRelationshipResult {
  // Validate that both characters exist
  const fromCharacter = store.getCharacter(fromCharacterId);
  const toCharacter = store.getCharacter(toCharacterId);

  if (!fromCharacter) {
    return {
      success: false,
      error: `Source character with ID "${fromCharacterId}" not found`,
    };
  }

  if (!toCharacter) {
    return {
      success: false,
      error: `Target character with ID "${toCharacterId}" not found`,
    };
  }

  // Find the existing relationship from source to target
  const fromRelationshipIndex = fromCharacter.relationships.findIndex(
    rel => rel.character_id === toCharacterId
  );

  if (fromRelationshipIndex === -1) {
    return {
      success: false,
      error: `No relationship found from "${fromCharacter.name}" to "${toCharacter.name}"`,
    };
  }

  // Find the existing inverse relationship from target to source
  const toRelationshipIndex = toCharacter.relationships.findIndex(
    rel => rel.character_id === fromCharacterId
  );

  if (toRelationshipIndex === -1) {
    return {
      success: false,
      error: `No inverse relationship found from "${toCharacter.name}" to "${fromCharacter.name}"`,
    };
  }

  // Get the existing relationships
  const existingFromRelationship = fromCharacter.relationships[fromRelationshipIndex];
  const existingToRelationship = toCharacter.relationships[toRelationshipIndex];

  // Create updated relationships by merging with updates
  const updatedFromRelationship = {
    ...existingFromRelationship,
    ...(updates.description !== undefined && { description: updates.description }),
    ...(updates.dynamic !== undefined && { dynamic: updates.dynamic }),
  };

  const updatedToRelationship = {
    ...existingToRelationship,
    ...(updates.description !== undefined && { description: updates.description }),
    ...(updates.dynamic !== undefined && { dynamic: updates.dynamic }),
  };

  // If relationship_type is being updated, we need to update the inverse as well
  if (updates.relationship_type !== undefined) {
    const newInverseType = getInverseRelationshipType(updates.relationship_type);
    updatedFromRelationship.relationship_type = updates.relationship_type;
    updatedToRelationship.relationship_type = newInverseType;
  }

  // Create new relationship arrays with the updated relationships
  const updatedFromRelationships = [...fromCharacter.relationships];
  updatedFromRelationships[fromRelationshipIndex] = updatedFromRelationship;

  const updatedToRelationships = [...toCharacter.relationships];
  updatedToRelationships[toRelationshipIndex] = updatedToRelationship;

  // Update both characters in the store
  store.updateCharacter(fromCharacterId, {
    relationships: updatedFromRelationships,
  });

  store.updateCharacter(toCharacterId, {
    relationships: updatedToRelationships,
  });

  // Get the updated characters
  const updatedFromCharacter = store.getCharacter(fromCharacterId);
  const updatedToCharacter = store.getCharacter(toCharacterId);

  // Emit update events for both characters
  if (eventEmitter) {
    // Emit character updated event for source character
    eventEmitter.emit('character:updated', {
      characterId: fromCharacterId,
      updates: { relationships: updatedFromRelationships },
      source: 'relationship-sync',
      changeType: 'relationship-sync',
      timestamp: new Date(),
    });

    // Emit character updated event for target character
    eventEmitter.emit('character:updated', {
      characterId: toCharacterId,
      updates: { relationships: updatedToRelationships },
      source: 'relationship-sync',
      changeType: 'relationship-sync',
      timestamp: new Date(),
    });

    // Emit relationship updated event
    eventEmitter.emit('character:relationship:updated', {
      fromCharacterId,
      toCharacterId,
      relationship: updatedFromRelationship,
      inverseRelationship: updatedToRelationship,
      updates,
      bidirectional: true,
      timestamp: new Date(),
      source: 'relationship-manager',
    });
  }

  return {
    success: true,
    fromCharacter: updatedFromCharacter,
    toCharacter: updatedToCharacter,
  };
}

/**
 * Result of removing a relationship.
 */
export interface RemoveRelationshipResult {
  success: boolean;
  error?: string;
  fromCharacter?: CharacterForRelationship;
  toCharacter?: CharacterForRelationship;
}

/**
 * Removes a bidirectional relationship between two characters.
 * 
 * This function:
 * 1. Validates that both characters exist
 * 2. Finds the existing relationship on the source character
 * 3. Finds the existing inverse relationship on the target character
 * 4. Removes the relationship from the source character
 * 5. Removes the inverse relationship from the target character
 * 6. Updates both characters in the store
 * 7. Emits update events for both characters
 * 
 * @param store - The character store
 * @param eventEmitter - The event emitter for character events
 * @param fromCharacterId - The source character ID
 * @param toCharacterId - The target character ID
 * @returns RemoveRelationshipResult indicating success or failure
 * 
 * @example
 * ```typescript
 * const result = removeRelationship(
 *   store,
 *   eventEmitter,
 *   'char-1',
 *   'char-2'
 * );
 * 
 * if (result.success) {
 *   console.log('Relationship removed successfully');
 *   // Both char-1→char-2 and char-2→char-1 relationships are removed
 * }
 * ```
 * 
 * Requirements: 6.3
 */
export function removeRelationship(
  store: CharacterStore,
  eventEmitter: CharacterEventEmitter,
  fromCharacterId: string,
  toCharacterId: string
): RemoveRelationshipResult {
  // Validate that both characters exist
  const fromCharacter = store.getCharacter(fromCharacterId);
  const toCharacter = store.getCharacter(toCharacterId);

  if (!fromCharacter) {
    return {
      success: false,
      error: `Source character with ID "${fromCharacterId}" not found`,
    };
  }

  if (!toCharacter) {
    return {
      success: false,
      error: `Target character with ID "${toCharacterId}" not found`,
    };
  }

  // Find the existing relationship from source to target
  const fromRelationshipIndex = fromCharacter.relationships.findIndex(
    rel => rel.character_id === toCharacterId
  );

  if (fromRelationshipIndex === -1) {
    return {
      success: false,
      error: `No relationship found from "${fromCharacter.name}" to "${toCharacter.name}"`,
    };
  }

  // Find the existing inverse relationship from target to source
  const toRelationshipIndex = toCharacter.relationships.findIndex(
    rel => rel.character_id === fromCharacterId
  );

  if (toRelationshipIndex === -1) {
    return {
      success: false,
      error: `No inverse relationship found from "${toCharacter.name}" to "${fromCharacter.name}"`,
    };
  }

  // Get the relationships before removal for event payload
  const removedFromRelationship = fromCharacter.relationships[fromRelationshipIndex];
  const removedToRelationship = toCharacter.relationships[toRelationshipIndex];

  // Create new relationship arrays with the relationships removed
  const updatedFromRelationships = fromCharacter.relationships.filter(
    (_, index) => index !== fromRelationshipIndex
  );

  const updatedToRelationships = toCharacter.relationships.filter(
    (_, index) => index !== toRelationshipIndex
  );

  // Update both characters in the store
  store.updateCharacter(fromCharacterId, {
    relationships: updatedFromRelationships,
  });

  store.updateCharacter(toCharacterId, {
    relationships: updatedToRelationships,
  });

  // Get the updated characters
  const updatedFromCharacter = store.getCharacter(fromCharacterId);
  const updatedToCharacter = store.getCharacter(toCharacterId);

  // Emit update events for both characters
  if (eventEmitter) {
    // Emit character updated event for source character
    eventEmitter.emit('character:updated', {
      characterId: fromCharacterId,
      updates: { relationships: updatedFromRelationships },
      source: 'relationship-sync',
      changeType: 'relationship-sync',
      timestamp: new Date(),
    });

    // Emit character updated event for target character
    eventEmitter.emit('character:updated', {
      characterId: toCharacterId,
      updates: { relationships: updatedToRelationships },
      source: 'relationship-sync',
      changeType: 'relationship-sync',
      timestamp: new Date(),
    });

    // Emit relationship removed event
    eventEmitter.emit('character:relationship:removed', {
      fromCharacterId,
      toCharacterId,
      relationship: removedFromRelationship,
      inverseRelationship: removedToRelationship,
      bidirectional: true,
      timestamp: new Date(),
      source: 'relationship-manager',
    });
  }

  return {
    success: true,
    fromCharacter: updatedFromCharacter,
    toCharacter: updatedToCharacter,
  };
}
