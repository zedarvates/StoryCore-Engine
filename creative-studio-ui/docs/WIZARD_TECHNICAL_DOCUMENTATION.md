# UI Configuration Wizards - Technical Documentation

## Overview

This document provides technical details about the UI Configuration Wizards implementation, including architecture, APIs, testing strategies, and integration points.

## Table of Contents

1. [Architecture](#architecture)
2. [Component Structure](#component-structure)
3. [State Management](#state-management)
4. [API Integration](#api-integration)
5. [Testing](#testing)
6. [Security](#security)
7. [Performance](#performance)
8. [Accessibility](#accessibility)

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Creative Studio UI                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  World Wizard    │  │ Character Wizard │                │
│  │  (Multi-Step)    │  │  (Multi-Step)    │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                      │                           │
│           └──────────┬───────────┘                           │
│                      │                                       │
│           ┌──────────▼──────────┐                           │
│           │   Wizard Context    │                           │
│           │  (State Management) │                           │
│           └──────────┬──────────┘                           │
│                      │                                       │
│        ┌─────────────┼─────────────┐                        │
│        │             │             │                         │
│  ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐                  │
│  │   LLM     │ │ ComfyUI │ │  Zustand  │                  │
│  │  Service  │ │ Service │ │   Store   │                  │
│  └─────┬─────┘ └────┬────┘ └─────┬─────┘                  │
│        │            │            │                          │
│        └────────────┼────────────┘                          │
│                     │                                        │
│              ┌──────▼──────┐                                │
│              │   Backend   │                                │
│              │     API     │                                │
│              └─────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

### State Management Layers

1. **Local Wizard State**: React Context for wizard-specific state
2. **Persistent Storage**: LocalStorage for auto-save functionality
3. **Global App State**: Zustand store for completed entities
4. **Backend Sync**: Integration with backendApiService

---

## Component Structure

### Core Components

#### WizardProvider
**Location**: `src/components/wizard/WizardContext.tsx`

Provides wizard state and actions to child components.

```typescript
interface WizardContextState<T> {
  currentStep: number;
  totalSteps: number;
  formData: Partial<T>;
  validationErrors: Record<string, string[]>;
  isSubmitting: boolean;
  isDirty: boolean;
  
  // Actions
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateFormData: (data: Partial<T>) => void;
  validateStep: (step: number) => Promise<boolean>;
  submitWizard: () => Promise<void>;
  resetWizard: () => void;
  saveProgress: () => void;
  loadProgress: () => void;
}
```

**Usage**:
```typescript
<WizardProvider
  totalSteps={5}
  onSubmit={handleSubmit}
  storageKey="world-wizard"
  autoSave={true}
>
  <WorldWizardSteps />
</WizardProvider>
```

#### useWizard Hook
**Location**: `src/components/wizard/WizardContext.tsx`

Access wizard state and actions from any child component.

```typescript
const {
  formData,
  updateFormData,
  validationErrors,
  isSubmitting
} = useWizard<WorldFormData>();
```

#### useWizardNavigation Hook
**Location**: `src/components/wizard/WizardContext.tsx`

Access navigation-specific functionality.

```typescript
const {
  currentStep,
  totalSteps,
  nextStep,
  previousStep,
  canGoNext,
  canGoPrevious
} = useWizardNavigation();
```

### Wizard Components

#### World Wizard
**Location**: `src/components/wizard/WorldWizard.tsx`

5-step wizard for world creation.

**Steps**:
1. Basic Information
2. World Rules
3. Locations
4. Cultural Elements
5. Review and Finalize

**Props**:
```typescript
interface WorldWizardProps {
  onComplete: (world: World) => void;
  onCancel: () => void;
  initialData?: Partial<World>;
}
```

#### Character Wizard
**Location**: `src/components/wizard/CharacterWizard.tsx`

6-step wizard for character creation.

**Steps**:
1. Basic Identity
2. Physical Appearance
3. Personality
4. Background
5. Relationships
6. Review and Finalize

**Props**:
```typescript
interface CharacterWizardProps {
  onComplete: (character: Character) => void;
  onCancel: () => void;
  worldContext?: World;
  initialData?: Partial<Character>;
}
```

### Settings Panels

#### LLM Settings Panel
**Location**: `src/components/settings/LLMSettingsPanel.tsx`

Configure LLM integration.

**Props**:
```typescript
interface LLMSettingsPanelProps {
  onSave: (config: LLMConfig) => void;
  onCancel: () => void;
  currentConfig?: LLMConfig;
}
```

#### ComfyUI Settings Panel
**Location**: `src/components/settings/ComfyUISettingsPanel.tsx`

Configure ComfyUI connection.

**Props**:
```typescript
interface ComfyUISettingsPanelProps {
  onSave: (config: ComfyUIConfig) => void;
  onCancel: () => void;
  currentConfig?: ComfyUIConfig;
}
```

---

## State Management

### Wizard State Persistence

**Storage Key Format**: `wizard-{type}-{timestamp}`

**Auto-Save Behavior**:
- Saves every 2 seconds when data changes
- Debounced to prevent excessive writes
- Includes expiration timestamp (7 days)

**State Structure**:
```typescript
interface WizardAutoSaveState<T> {
  wizardType: 'world' | 'character';
  timestamp: Date;
  currentStep: number;
  formData: Partial<T>;
  expiresAt: Date;
}
```

### Zustand Store Integration

**World Store Actions**:
```typescript
// Add world to store
const { addWorld } = useAppStore();
addWorld(newWorld);

// Get all worlds
const worlds = useAppStore(state => state.worlds);
```

**Character Store Actions**:
```typescript
// Add character to store
const { addCharacter } = useAppStore();
addCharacter(newCharacter);

// Get all characters
const characters = useAppStore(state => state.characters);
```

### Event Emission

**Event Types**:
- `world:created` - Emitted when world is created
- `character:created` - Emitted when character is created
- `settings:updated` - Emitted when settings change

**Usage**:
```typescript
import { eventEmitter } from '@/services/eventEmitter';

// Subscribe to events
eventEmitter.on('world:created', (world) => {
  console.log('New world created:', world);
});

// Emit events
eventEmitter.emit('world:created', newWorld);
```

---

## API Integration

### LLM Service

**Location**: `src/services/llmService.ts`

**Methods**:

```typescript
interface LLMService {
  // Generate world suggestions
  generateWorldSuggestions(context: WorldContext): Promise<WorldSuggestions>;
  
  // Generate character suggestions
  generateCharacterSuggestions(context: CharacterContext): Promise<CharacterSuggestions>;
  
  // Validate connection
  validateConnection(): Promise<boolean>;
  
  // Stream response
  streamResponse(prompt: string, onChunk: (chunk: string) => void): Promise<void>;
}
```

**Error Handling**:
```typescript
try {
  const suggestions = await llmService.generateWorldSuggestions(context);
} catch (error) {
  if (error instanceof LLMError) {
    // Handle specific LLM errors
    if (error.isRetryable) {
      // Retry logic
    } else {
      // Fallback to manual entry
    }
  }
}
```

### ComfyUI Service

**Location**: `src/services/comfyuiService.ts`

**Methods**:

```typescript
interface ComfyUIService {
  // Test connection
  testConnection(config: ComfyUIConfig): Promise<boolean>;
  
  // Get server info
  getServerInfo(): Promise<ComfyUIServerInfo>;
  
  // Execute workflow
  executeWorkflow(workflowId: string, inputs: any): Promise<WorkflowResult>;
  
  // Get workflow status
  getWorkflowStatus(jobId: string): Promise<WorkflowStatus>;
}
```

### Backend API Service

**Location**: `src/services/backendApiService.ts`

**Integration Points**:
- Save world to project configuration
- Save character to characters/ directory
- Update project capabilities
- Sync settings with backend

---

## Testing

### Unit Tests

**Test Files**:
- `src/components/wizard/__tests__/WizardInfrastructure.test.tsx`
- `src/stores/wizard/__tests__/wizardStore.test.ts`
- `src/services/wizard/__tests__/*.test.ts`

**Running Tests**:
```bash
npm test -- run
```

**Example Test**:
```typescript
describe('WizardContext', () => {
  it('should provide wizard state to children', () => {
    const onSubmit = vi.fn();
    
    render(
      <WizardProvider totalSteps={3} onSubmit={onSubmit}>
        <TestComponent />
      </WizardProvider>
    );
    
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });
});
```

### Integration Tests

**Test Files**:
- `src/__tests__/integration/wizardWorkflows.integration.test.tsx`
- `src/__tests__/integration/wizardIntegration.test.tsx`

**Coverage Areas**:
- Complete wizard workflows
- State synchronization
- Event emission
- Backend integration

### Property-Based Tests

**Framework**: fast-check

**Test Files**:
- Property tests are marked as optional in tasks.md
- Located in `src/__tests__/properties/` (when implemented)

**Example Property**:
```typescript
// Property 4: State Persistence Round Trip
test('wizard state round trips through localStorage', () => {
  fc.assert(
    fc.property(
      wizardStateArbitrary(),
      (state) => {
        saveWizardState('world', state);
        const loaded = loadWizardState('world');
        expect(loaded).toEqual(state);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Accessibility Tests

**Tools**:
- jest-axe for automated accessibility testing
- Manual testing with screen readers (NVDA, JAWS)

**Test Coverage**:
- Keyboard navigation
- ARIA labels
- Focus management
- Screen reader announcements

---

## Security

### Credential Encryption

**Implementation**: Web Crypto API

**Encryption Flow**:
```typescript
// Encrypt API key before storage
const encryptedKey = await encryptCredential(apiKey);
localStorage.setItem('llm-config', JSON.stringify({
  ...config,
  encryptedApiKey
}));

// Decrypt when needed
const decryptedKey = await decryptCredential(encryptedKey);
```

**Key Derivation**:
- Uses PBKDF2 with 100,000 iterations
- Salt stored separately from encrypted data
- AES-GCM for encryption

### Data Protection

**Measures**:
1. **Masked Input**: API keys masked after entry
2. **No Logging**: Credentials never logged
3. **HTTPS Only**: All API calls use HTTPS
4. **Export Exclusion**: Credentials excluded from exports
5. **Secure Deletion**: Overwrite before deletion

### Validation

**Input Validation**:
- URL format validation
- API key format validation
- Parameter range validation
- XSS prevention

---

## Performance

### Optimization Strategies

#### 1. Debounced Auto-Save
```typescript
const debouncedSave = useMemo(
  () => debounce(saveProgress, 2000),
  [saveProgress]
);
```

#### 2. Lazy Loading
```typescript
const WorldWizard = lazy(() => import('./WorldWizard'));
const CharacterWizard = lazy(() => import('./CharacterWizard'));
```

#### 3. Memoization
```typescript
const validationErrors = useMemo(
  () => validateFormData(formData),
  [formData]
);
```

#### 4. Virtual Scrolling
For large lists (locations, characters), use virtual scrolling to improve performance.

### Performance Metrics

**Target Metrics**:
- Initial render: < 100ms
- Step navigation: < 50ms
- Auto-save: < 10ms (debounced)
- AI generation: < 5s (depends on provider)

---

## Accessibility

### WCAG 2.1 Level AA Compliance

#### Keyboard Navigation
- **Tab**: Navigate between fields
- **Enter**: Submit/advance
- **Escape**: Cancel
- **Arrow Keys**: Navigate within components

#### ARIA Labels
```typescript
<input
  type="text"
  aria-label="World Name"
  aria-required="true"
  aria-invalid={!!errors.name}
  aria-describedby={errors.name ? 'name-error' : undefined}
/>
```

#### Live Regions
```typescript
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

#### Focus Management
```typescript
useEffect(() => {
  if (currentStep === 1) {
    firstFieldRef.current?.focus();
  }
}, [currentStep]);
```

### Screen Reader Support

**Announcements**:
- Step changes
- Validation errors
- Loading states
- Success/error messages

**Testing**:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS)

---

## Error Handling

### Error Categories

#### 1. LLM Errors
```typescript
class LLMError extends Error {
  constructor(
    message: string,
    public category: 'connection' | 'authentication' | 'rate_limit' | 'invalid_response',
    public isRetryable: boolean,
    public hasFallback: boolean
  ) {
    super(message);
  }
}
```

#### 2. Validation Errors
```typescript
interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'range' | 'custom';
}
```

#### 3. Network Errors
```typescript
interface NetworkError {
  status: number;
  message: string;
  isRetryable: boolean;
}
```

### Error Recovery

**Strategies**:
1. **Retry with Backoff**: For transient errors
2. **Fallback Mode**: Manual entry when AI fails
3. **State Preservation**: Save progress on error
4. **User Guidance**: Clear error messages with actions

---

## Integration Points

### Project Service Integration

**Save World**:
```typescript
await projectService.saveWorld(projectPath, world);
```

**Save Character**:
```typescript
await projectService.saveCharacter(projectPath, character);
```

### Asset Library Integration

**Update Library**:
```typescript
// Characters automatically added to library
eventEmitter.on('character:created', (character) => {
  assetLibrary.addCharacter(character);
});
```

### Shot Editor Integration

**Character Dropdowns**:
```typescript
// Characters available in shot editor
const characters = useAppStore(state => state.characters);
```

---

## Configuration

### Environment Variables

```env
# LLM Configuration
VITE_DEFAULT_LLM_PROVIDER=openai
VITE_DEFAULT_LLM_MODEL=gpt-4

# ComfyUI Configuration
VITE_DEFAULT_COMFYUI_URL=http://localhost:8188

# Feature Flags
VITE_ENABLE_WIZARD_AUTO_SAVE=true
VITE_WIZARD_AUTO_SAVE_INTERVAL=2000
```

### Build Configuration

**Vite Config**:
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'wizard': [
            './src/components/wizard/WorldWizard',
            './src/components/wizard/CharacterWizard'
          ]
        }
      }
    }
  }
});
```

---

## Deployment

### Build Process

```bash
# Install dependencies
npm install

# Run tests
npm test -- run

# Build for production
npm run build

# Preview build
npm run preview
```

### Production Checklist

- [ ] All tests passing
- [ ] No console errors
- [ ] Accessibility audit passed
- [ ] Performance metrics met
- [ ] Security review completed
- [ ] Documentation updated

---

## Troubleshooting

### Common Development Issues

#### TypeScript Errors
```bash
# Check for type errors
npm run type-check

# Fix auto-fixable issues
npm run lint -- --fix
```

#### Test Failures
```bash
# Run specific test file
npm test -- run src/components/wizard/__tests__/WizardInfrastructure.test.tsx

# Run with coverage
npm test -- run --coverage
```

#### Build Issues
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## API Reference

### Wizard Context API

See `src/components/wizard/WizardContext.tsx` for complete API.

### LLM Service API

See `src/services/llmService.ts` for complete API.

### ComfyUI Service API

See `src/services/comfyuiService.ts` for complete API.

---

## Contributing

### Code Style

- Follow existing patterns
- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Write tests for new features

### Pull Request Process

1. Create feature branch
2. Implement changes
3. Add/update tests
4. Update documentation
5. Submit PR with description

---

## Version History

**v1.0.0** (January 2026)
- Initial release
- World Creation Wizard
- Character Creation Wizard
- LLM Configuration Settings
- ComfyUI Connection Settings

---

## License

See LICENSE file in repository root.

---

*For user-facing documentation, see WIZARD_USER_GUIDE.md*
