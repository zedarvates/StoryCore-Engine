# Character Event System Documentation

## Overview

The Character Event System provides a centralized, type-safe event infrastructure for managing character-related operations across the StoryCore application.

## Event Types

### Character CRUD Events
- `CHARACTER_CREATED` - New character created
- `CHARACTER_UPDATED` - Character modified
- `CHARACTER_DELETED` - Character deleted
- `CHARACTER_SELECTED` - Character selected in UI

### Relationship Events
- `RELATIONSHIP_ADDED` - Relationship added
- `RELATIONSHIP_UPDATED` - Relationship modified
- `RELATIONSHIP_REMOVED` - Relationship deleted

### Validation Events
- `CHARACTER_VALIDATION_FAILED` - Validation failed
- `CHARACTER_VALIDATION_PASSED` - Validation succeeded

### Import/Export Events
- `CHARACTER_EXPORTED` - Character exported
- `CHARACTER_IMPORTED` - Character imported
- `CHARACTER_IMPORT_FAILED` - Import failed

### Dependency Events
- `CHARACTER_DEPENDENCIES_CHECKED` - Dependencies checked
- `CHARACTER_DELETION_BLOCKED` - Deletion blocked

## Usage Example

```typescript
import { eventEmitter, CharacterEventType, createCharacterCreatedPayload } from '@/services/eventEmitter';

// Subscribe to events
const subscription = eventEmitter.on(
  CharacterEventType.CHARACTER_CREATED,
  (payload) => {
    console.log('Character created:', payload.character.name);
  }
);

// Emit events
const payload = createCharacterCreatedPayload(character, 'wizard');
eventEmitter.emit(CharacterEventType.CHARACTER_CREATED, payload);

// Unsubscribe
subscription.unsubscribe();
```

## React Integration

```typescript
import { useEventListener, CharacterEventType } from '@/services/eventEmitter';

function MyComponent() {
  useEventListener(
    CharacterEventType.CHARACTER_CREATED,
    (payload) => {
      // Handle event
    },
    []
  );
}
```

## Best Practices

1. Always unsubscribe from events
2. Use helper functions for payload creation
3. Handle errors in event listeners
4. Use React hook for components
5. Provide descriptive source values

## Testing

```typescript
import { eventEmitter, CharacterEventType } from '@/services/eventEmitter';

it('should emit character created event', () => {
  const listener = vi.fn();
  const subscription = eventEmitter.on(CharacterEventType.CHARACTER_CREATED, listener);
  
  const payload = createCharacterCreatedPayload(mockCharacter, 'wizard');
  eventEmitter.emit(CharacterEventType.CHARACTER_CREATED, payload);
  
  expect(listener).toHaveBeenCalledWith(payload);
  subscription.unsubscribe();
});
```

## References

- Design: `.kiro/specs/character-integration-system/design.md`
- Requirements: `.kiro/specs/character-integration-system/requirements.md`
- Tests: `creative-studio-ui/src/services/__tests__/characterEvents.test.ts`
- Implementation: `creative-studio-ui/src/services/characterEvents.ts`
