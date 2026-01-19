# Event Emission System

## Overview

The Event Emission System provides a centralized pub/sub mechanism for wizard completions and entity operations throughout the Creative Studio UI. Components can subscribe to events and receive notifications when entities are created, updated, or deleted.

**Requirements:** 7.5

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Emitter Service                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Zustand    │  │   Wizards    │  │  Components  │      │
│  │    Store     │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                     ┌──────▼──────┐                         │
│                     │   Emit      │                         │
│                     │   Events    │                         │
│                     └──────┬──────┘                         │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐     │
│  │ Subscriber 1 │  │ Subscriber 2 │  │ Subscriber 3 │     │
│  │ (Component)  │  │ (Service)    │  │ (Hook)       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Event Types

### World Events
- `WORLD_CREATED` - Emitted when a new world is created
- `WORLD_UPDATED` - Emitted when a world is updated
- `WORLD_DELETED` - Emitted when a world is deleted
- `WORLD_SELECTED` - Emitted when a world is selected

### Character Events
- `CHARACTER_CREATED` - Emitted when a new character is created
- `CHARACTER_UPDATED` - Emitted when a character is updated
- `CHARACTER_DELETED` - Emitted when a character is deleted

### Settings Events
- `LLM_SETTINGS_UPDATED` - Emitted when LLM settings are updated
- `COMFYUI_SETTINGS_UPDATED` - Emitted when ComfyUI settings are updated

### Wizard Lifecycle Events
- `WIZARD_STARTED` - Emitted when a wizard is started
- `WIZARD_STEP_CHANGED` - Emitted when wizard step changes
- `WIZARD_COMPLETED` - Emitted when a wizard is completed
- `WIZARD_CANCELLED` - Emitted when a wizard is cancelled

## Event Payload Structures

### WorldCreatedPayload
```typescript
{
  world: World;
  projectName?: string;
  timestamp: Date;
  source: string;
}
```

### WorldUpdatedPayload
```typescript
{
  worldId: string;
  updates: Partial<World>;
  previousWorld?: World;
  timestamp: Date;
  source: string;
}
```

### WorldDeletedPayload
```typescript
{
  worldId: string;
  worldName: string;
  timestamp: Date;
  source: string;
}
```

### WorldSelectedPayload
```typescript
{
  worldId: string | null;
  world: World | null;
  timestamp: Date;
  source: string;
}
```

### CharacterCreatedPayload
```typescript
{
  character: Character;
  projectName?: string;
  timestamp: Date;
  source: string;
}
```

### CharacterUpdatedPayload
```typescript
{
  characterId: string;
  updates: Partial<Character>;
  previousCharacter?: Character;
  timestamp: Date;
  source: string;
}
```

### CharacterDeletedPayload
```typescript
{
  characterId: string;
  characterName: string;
  timestamp: Date;
  source: string;
}
```

## Usage Examples

### Subscribing to Events

#### In a React Component
```typescript
import { useEventListener, WizardEventType } from '@/services/eventEmitter';

function MyComponent() {
  // Subscribe to world creation events
  useEventListener(
    WizardEventType.WORLD_CREATED,
    (payload) => {
      console.log('New world created:', payload.world.name);
      // Update UI, show notification, etc.
    }
  );

  return <div>My Component</div>;
}
```

#### In a Service or Hook
```typescript
import { eventEmitter, WizardEventType } from '@/services/eventEmitter';

// Subscribe
const subscription = eventEmitter.on(
  WizardEventType.CHARACTER_CREATED,
  (payload) => {
    console.log('New character:', payload.character.name);
    // Refresh character list, update dropdowns, etc.
  }
);

// Unsubscribe when done
subscription.unsubscribe();
```

#### One-Time Subscription
```typescript
import { eventEmitter, WizardEventType } from '@/services/eventEmitter';

// Subscribe for a single occurrence
eventEmitter.once(
  WizardEventType.WIZARD_COMPLETED,
  (payload) => {
    console.log('Wizard completed:', payload.wizardType);
  }
);
```

### Emitting Events

#### From Zustand Store
```typescript
import { eventEmitter, WizardEventType } from '@/services/eventEmitter';

// In a store action
addWorld: (world) => {
  // ... update state ...
  
  // Emit event
  eventEmitter.emit(WizardEventType.WORLD_CREATED, {
    world,
    projectName: state.project?.project_name,
    timestamp: new Date(),
    source: 'store',
  });
}
```

#### From a Wizard Component
```typescript
import { eventEmitter, WizardEventType } from '@/services/eventEmitter';

function WorldWizard() {
  const handleComplete = (worldData: World) => {
    // Save world to store
    addWorld(worldData);
    
    // Emit wizard completed event
    eventEmitter.emit(WizardEventType.WIZARD_COMPLETED, {
      wizardType: 'world',
      data: worldData,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      source: 'WorldWizard',
    });
  };
  
  return <div>...</div>;
}
```

## Integration Points

### 1. Zustand Store Integration
The Zustand store automatically emits events when:
- Worlds are created, updated, deleted, or selected
- Characters are created, updated, or deleted

These events are emitted from the store actions in `src/store/index.ts`.

### 2. Wizard Integration
Wizards should emit events when:
- Starting (`WIZARD_STARTED`)
- Changing steps (`WIZARD_STEP_CHANGED`)
- Completing (`WIZARD_COMPLETED`)
- Cancelling (`WIZARD_CANCELLED`)

### 3. Settings Panel Integration
Settings panels should emit events when:
- LLM settings are updated (`LLM_SETTINGS_UPDATED`)
- ComfyUI settings are updated (`COMFYUI_SETTINGS_UPDATED`)

### 4. Component Integration
Components can subscribe to events to:
- Update UI when entities change
- Show notifications
- Refresh dropdowns and selection lists
- Trigger dependent operations

## Best Practices

### 1. Always Include Timestamp and Source
```typescript
eventEmitter.emit(WizardEventType.WORLD_CREATED, {
  world,
  timestamp: new Date(), // Always include
  source: 'WorldWizard', // Identify the emitter
});
```

### 2. Unsubscribe When Done
```typescript
useEffect(() => {
  const subscription = eventEmitter.on(
    WizardEventType.WORLD_CREATED,
    handleWorldCreated
  );
  
  return () => subscription.unsubscribe(); // Clean up
}, []);
```

### 3. Use Type-Safe Payloads
```typescript
import type { WorldCreatedPayload } from '@/services/eventEmitter';

eventEmitter.on<WorldCreatedPayload>(
  WizardEventType.WORLD_CREATED,
  (payload) => {
    // payload is type-safe
    console.log(payload.world.name);
  }
);
```

### 4. Handle Errors in Listeners
```typescript
eventEmitter.on(WizardEventType.WORLD_CREATED, (payload) => {
  try {
    // Your logic here
  } catch (error) {
    console.error('Error handling world creation:', error);
  }
});
```

### 5. Use Event History for Debugging
```typescript
// Get recent events
const recentEvents = eventEmitter.getHistory(undefined, 10);
console.log('Recent events:', recentEvents);

// Get events of specific type
const worldEvents = eventEmitter.getHistory(WizardEventType.WORLD_CREATED);
console.log('World creation events:', worldEvents);
```

## Testing

### Testing Event Emission
```typescript
import { eventEmitter, WizardEventType } from '@/services/eventEmitter';

test('emits world created event', () => {
  const listener = vi.fn();
  const subscription = eventEmitter.on(
    WizardEventType.WORLD_CREATED,
    listener
  );
  
  // Trigger action that emits event
  addWorld(testWorld);
  
  expect(listener).toHaveBeenCalledWith(
    expect.objectContaining({
      world: testWorld,
      timestamp: expect.any(Date),
      source: 'store',
    })
  );
  
  subscription.unsubscribe();
});
```

### Testing Event Subscription
```typescript
test('component responds to world created event', () => {
  render(<MyComponent />);
  
  // Emit event
  eventEmitter.emit(WizardEventType.WORLD_CREATED, {
    world: testWorld,
    timestamp: new Date(),
    source: 'test',
  });
  
  // Verify component updated
  expect(screen.getByText(testWorld.name)).toBeInTheDocument();
});
```

## Performance Considerations

1. **Event History Size**: Limited to 100 events by default to prevent memory leaks
2. **Listener Cleanup**: Always unsubscribe when components unmount
3. **Error Handling**: Errors in listeners don't affect other listeners
4. **Development Logging**: Events are logged in development mode only

## Future Enhancements

- Event filtering and transformation
- Event replay for debugging
- Event persistence for offline support
- Event batching for performance
- Event middleware for cross-cutting concerns
