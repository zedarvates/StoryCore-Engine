# StoryCore Engine - Technical Overview

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Technologies](#core-technologies)
3. [Project Structure](#project-structure)
4. [State Management](#state-management)
5. [Data Persistence](#data-persistence)
6. [Error Handling](#error-handling)
7. [Testing Strategy](#testing-strategy)
8. [Performance Optimization](#performance-optimization)
9. [Security Considerations](#security-considerations)
10. [Development Workflow](#development-workflow)

---

## Architecture Overview

StoryCore Engine is a creative studio application built with modern web technologies. The architecture follows a modular, component-based approach with clear separation of concerns.

### Key Architectural Principles

- **Component-Based UI**: React components with TypeScript for type safety
- **Centralized State Management**: Zustand for global state with persistence
- **Modular Services**: Separate services for different functionalities
- **Type-Safe Development**: Comprehensive TypeScript types for all data models
- **Progressive Enhancement**: Core functionality works without advanced features

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)            │
├─────────────────────────────────────────────────────────────┤
│  Components  │  Hooks  │  Services  │  Utils  │  Types     │
├─────────────────────────────────────────────────────────────┤
│                    State Management (Zustand)               │
├─────────────────────────────────────────────────────────────┤
│                    Data Persistence Layer                   │
│  (localStorage, Project Directory, IndexedDB)              │
├─────────────────────────────────────────────────────────────┤
│                    Backend Services (Optional)              │
│  (AI Generation, File System, API Integration)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Technologies

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 7.x | Build Tool |
| Zustand | 4.x | State Management |
| Tailwind CSS | 3.x | Styling |
| Framer Motion | 10.x | Animations |
| Radix UI | 1.x | Accessible Components |

### Development Tools

| Tool | Purpose |
|------|---------|
| Vitest | Unit Testing |
| ESLint | Code Linting |
| Prettier | Code Formatting |
| Husky | Git Hooks |
| TypeScript | Type Checking |

---

## Project Structure

```
creative-studio-ui/
├── src/
│   ├── components/          # React Components
│   │   ├── ui/             # Reusable UI Components
│   │   ├── wizard/         # Wizard Components
│   │   ├── workspace/      # Workspace Components
│   │   └── ...
│   ├── hooks/              # Custom React Hooks
│   ├── services/           # Business Logic Services
│   ├── stores/             # Zustand Stores
│   ├── types/              # TypeScript Type Definitions
│   ├── utils/              # Utility Functions
│   ├── pages/              # Page Components
│   └── __tests__/          # Test Files
├── docs/                   # Documentation
├── public/                 # Static Assets
└── package.json           # Dependencies
```

### Key Directories

- **`components/`**: All React components organized by feature
- **`hooks/`**: Custom hooks for state and logic reuse
- **`services/`**: Business logic and API interactions
- **`stores/`**: Zustand state management
- **`types/`**: TypeScript type definitions
- **`utils/`**: Helper functions and utilities

---

## State Management

### Zustand Store Architecture

The application uses Zustand for state management with the following structure:

```typescript
interface AppState {
  // Project State
  project: Project | null;
  worlds: World[];
  characters: Character[];
  objects: StoryObject[];
  
  // UI State
  currentView: ViewType;
  selectedWorldId: string | null;
  selectedCharacterId: string | null;
  
  // Actions
  setProject: (project: Project) => void;
  addWorld: (world: World) => void;
  updateWorld: (id: string, updates: Partial<World>) => void;
  deleteWorld: (id: string) => void;
  // ... more actions
}
```

### State Persistence

- **localStorage**: UI preferences and temporary data
- **Project Directory**: Project-specific data (worlds, characters, objects)
- **IndexedDB**: Large data sets and caching

### Selector Hooks

```typescript
// Optimized selectors for performance
export const useWorlds = () => useStore((state) => state.worlds);
export const useSelectedWorld = () => {
  const worlds = useStore((state) => state.worlds);
  const selectedWorldId = useStore((state) => state.selectedWorldId);
  return worlds.find((world) => world.id === selectedWorldId) || null;
};
```

---

## Data Persistence

### Persistence Strategy

The application uses a multi-layered persistence strategy:

1. **Immediate UI State**: localStorage for UI preferences
2. **Project Data**: File system for project-specific data
3. **Cache Layer**: IndexedDB for performance optimization

### Storage Utilities

```typescript
// World Storage
export const saveWorldToProject = async (
  projectId: string,
  worldId: string,
  world: World
): Promise<SaveResult>;

export const loadWorldFromProject = async (
  projectId: string,
  worldId: string
): Promise<World | null>;

export const listWorldsInProject = async (
  projectId: string
): Promise<string[]>;
```

### Data Validation

All data is validated before persistence using Zod schemas:

```typescript
export const WorldSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  genre: z.array(z.string()),
  // ... more fields
});
```

---

## Error Handling

### Error Handling Architecture

The application implements a comprehensive error handling system:

```typescript
export class GenerationErrorHandler {
  private retryStrategy: RetryStrategy;
  private errorHistory: ErrorContext[] = [];
  
  handleError(
    error: Error | GenerationError,
    context: Partial<ErrorContext>
  ): ErrorHandlerResult;
  
  savePartialResults(
    projectId: string,
    completedStages: string[],
    generatedShots: GeneratedShot[]
  ): void;
}
```

### Error Types

- **Retryable Errors**: Network timeouts, temporary failures
- **Permanent Errors**: Validation errors, authentication failures
- **User Errors**: Invalid input, missing data

### Error Recovery

- **Automatic Retry**: Exponential backoff for retryable errors
- **Partial Results**: Save progress for recovery
- **User Feedback**: Clear error messages with suggestions

---

## Testing Strategy

### Testing Pyramid

```
        E2E Tests (Few)
           /     \
    Integration Tests
         /         \
   Unit Tests (Many)
```

### Test Categories

1. **Unit Tests**: Individual functions and components
2. **Integration Tests**: Component interactions
3. **E2E Tests**: Complete user workflows

### Testing Tools

- **Vitest**: Test runner and assertions
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **Playwright**: E2E testing

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical paths
- **E2E Tests**: User workflows

---

## Performance Optimization

### Build Optimization

- **Code Splitting**: Automatic chunk splitting by Vite
- **Tree Shaking**: Remove unused code
- **Minification**: Production builds are minified
- **Compression**: Gzip compression for assets

### Runtime Optimization

- **React.memo**: Prevent unnecessary re-renders
- **useMemo/useCallback**: Memoize expensive calculations
- **Virtual Scrolling**: For large lists
- **Lazy Loading**: Load components on demand

### Performance Monitoring

```typescript
// Performance metrics
const performanceMetrics = {
  buildTime: '37s',
  bundleSize: '1.6MB (gzip: 438KB)',
  chunkCount: 95,
  largestChunk: 'ai-services (1.6MB)',
};
```

---

## Security Considerations

### Data Security

- **Input Validation**: All user input is validated
- **XSS Prevention**: React's built-in XSS protection
- **CSRF Protection**: Token-based CSRF protection
- **Data Encryption**: Sensitive data encryption at rest

### API Security

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control
- **Rate Limiting**: API rate limiting
- **Input Sanitization**: All API inputs are sanitized

### File System Security

- **Path Validation**: Prevent directory traversal
- **File Type Validation**: Validate file types and sizes
- **Sandboxing**: Isolate file operations

---

## Development Workflow

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Code Quality

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Husky**: Pre-commit hooks

### Git Workflow

1. **Feature Branch**: Create feature branch from main
2. **Development**: Implement feature with tests
3. **Code Review**: Submit pull request for review
4. **Merge**: Merge to main after approval
5. **Deploy**: Automatic deployment to staging

### Release Process

1. **Version Bump**: Update version in package.json
2. **Changelog**: Update CHANGELOG.md
3. **Build**: Create production build
4. **Test**: Run full test suite
5. **Deploy**: Deploy to production

---

## API Reference

### Core APIs

- **World API**: CRUD operations for worlds
- **Character API**: CRUD operations for characters
- **Object API**: CRUD operations for objects
- **Project API**: Project management operations

### Hook APIs

- **useWorldPersistence**: World data persistence
- **useCharacterPersistence**: Character data persistence
- **useObjectPersistence**: Object data persistence
- **useProjectPersistence**: Project data persistence

### Service APIs

- **StorageService**: Data storage operations
- **ValidationService**: Data validation
- **ErrorService**: Error handling
- **SyncService**: Data synchronization

---

## Troubleshooting

### Common Issues

1. **Build Failures**: Check TypeScript errors
2. **Test Failures**: Check test environment setup
3. **Performance Issues**: Check bundle size and runtime performance
4. **Data Loss**: Check persistence configuration

### Debug Tools

- **React DevTools**: Component debugging
- **Zustand DevTools**: State debugging
- **Network Tab**: API debugging
- **Console**: Error logging

### Support

- **Documentation**: Check docs/ directory
- **Issues**: Create GitHub issue
- **Discussions**: Use GitHub discussions
- **Email**: Contact development team

---

## Contributing

### Development Guidelines

1. **Code Style**: Follow ESLint and Prettier rules
2. **Type Safety**: Use TypeScript for all code
3. **Testing**: Write tests for new features
4. **Documentation**: Update documentation for changes
5. **Performance**: Consider performance implications

### Pull Request Process

1. **Description**: Clear description of changes
2. **Tests**: Include tests for new features
3. **Documentation**: Update relevant documentation
4. **Review**: Request review from team members
5. **Merge**: Merge after approval

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Contact

- **GitHub**: https://github.com/zedarvates/StoryCore-Engine
- **Documentation**: https://storycore-engine.readthedocs.io
- **Email**: contact@storycore-engine.com