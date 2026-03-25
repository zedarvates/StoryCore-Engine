# Frontend Audit - Top 60 Tasks

> Generated: 2026-03-24  
> Project: Creative Studio UI (StoryCore-Engine)  
> Priority: High → Low

---

## Executive Summary

This audit identifies **60 critical tasks** across 10 categories for the Creative Studio UI frontend. The codebase uses React 19, TypeScript, Zustand, Redux Toolkit, and Material UI. Key issues include performance bottlenecks, type safety concerns, incomplete implementations, and testing gaps.

---

## Category 1: Performance Optimization (Priority: Critical)

### Task 1: Optimize App.tsx Bundle Size
- **File**: `creative-studio-ui/src/App.tsx`
- **Issue**: 70+ lazy-loaded components imported at top level, causing large initial bundle
- **Action**: Implement dynamic imports with proper code splitting and route-based chunking
- **Impact**: Reduce initial load time by 40-60%

### Task 2: Fix useEffect Dependencies in useVirtualScroll
- **File**: `creative-studio-ui/src/hooks/useVirtualScroll.ts`
- **Issue**: Missing dependency arrays causing unnecessary re-renders
- **Action**: Add proper dependency arrays and memoization
- **Impact**: Reduce scroll jank in timeline components

### Task 3: Implement useMemo in ProjectDashboardNew.tsx
- **File**: `creative-studio-ui/src/components/workspace/ProjectDashboardNew.tsx`
- **Issue**: Heavy computations not memoized (line 50+ imports)
- **Action**: Wrap computed values in useMemo hooks
- **Impact**: Reduce re-render cycles by 30%

### Task 4: Optimize Store Selectors
- **File**: `creative-studio-ui/src/store/index.ts`
- **Issue**: Zustand store with 100+ actions, selectors not memoized
- **Action**: Create memoized selectors using useShallow
- **Impact**: Prevent unnecessary re-renders

### Task 5: Add React.memo to SequenceEditor Components
- **File**: `creative-studio-ui/src/sequence-editor/components/`
- **Issue**: Timeline, PreviewFrame, ToolBar re-render on every state change
- **Action**: Wrap in React.memo with custom comparators
- **Impact**: 25% performance improvement in editor

### Task 6: Implement Virtual Scrolling for Asset Library
- **File**: `creative-studio-ui/src/sequence-editor/components/AssetLibrary/AssetGrid.tsx`
- **Issue**: Rendering 1000+ assets without virtualization
- **Action**: Integrate @tanstack/react-virtual
- **Impact**: Handle large asset libraries smoothly

### Task 7: Optimize useUndoRedo Hook
- **File**: `creative-studio-ui/src/hooks/useUndoRedo.ts`
- **Issue**: State snapshots stored without size limits
- **Action**: Implement max history size and lazy snapshots
- **Impact**: Reduce memory usage by 50%

### Task 8: Add Debounce to useResponsiveGrid
- **File**: `creative-studio-ui/src/hooks/useResponsiveGrid.ts`
- **Issue**: Resize handler fires every pixel
- **Action**: Add 150ms debounce
- **Impact**: Reduce CPU usage during window resize

---

## Category 2: TypeScript & Type Safety (Priority: High)

### Task 9: Replace LegacyAny with Proper Types
- **File**: `creative-studio-ui/src/types/legacy.ts`
- **Issue**: `LegacyAny` and `LegacyArray` types used throughout codebase
- **Action**: Create specific types and migrate progressively
- **Impact**: Better IDE support and runtime safety

### Task 10: Add Type Safety to APIManager
- **File**: `creative-studio-ui/src/services/APIManager.ts`
- **Issue**: Generic `Record<string, unknown>` types
- **Action**: Define strict DTOs for all API communications
- **Impact**: Catch errors at compile time

### Task 11: Fix TypeScript Errors in ProjectCreationService
- **File**: `creative-studio-ui/src/services/ProjectCreationService.ts`
- **Issue**: Type casting with `as` throughout (lines 31-36)
- **Action**: Add runtime validation with Zod
- **Impact**: Prevent runtime type errors

### Task 12: Add Generics to useResultDisplay Hook
- **File**: `creative-studio-ui/src/hooks/useResultDisplay.ts`
- **Issue**: Generic types not properly constrained
- **Action**: Add proper generic constraints
- **Impact**: Type-safe result handling

### Task 13: Type AddonVoiceCommandRouter Payloads
- **File**: `creative-studio-ui/src/services/AddonVoiceCommandRouter.ts`
- **Issue**: `AddonActionPayload` uses loose typing
- **Action**: Create discriminated union for action types
- **Impact**: Type-safe voice commands

### Task 14: Create Index Signature Types for Store
- **File**: `creative-studio-ui/src/types/index.ts`
- **Issue**: Shot type has many optional properties with index signatures
- **Action**: Define strict interface with required fields
- **Impact**: Predictable data structures

---

## Category 3: Code Quality & Cleanup (Priority: High)

### Task 15: Remove TODO Comments - Part 1 (Timeline)
- **Files**: `creative-studio-ui/src/sequence-editor/components/Timeline/TODO_*.md`
- **Issue**: 7 TODO files for timeline features
- **Action**: Implement missing timeline features (virtual scrolling, markers, zoom)
- **Impact**: Complete timeline functionality

### Task 16: Remove TODO Comments - Part 2 (Hooks)
- **Files**: `creative-studio-ui/src/hooks/*.ts`
- **Issue**: 59+ TODO/FIXME comments across codebase
- **Action**: Implement placeholder features
- **Impact**: Production-ready features

### Task 17: Replace console.error with Proper Logging
- **Files**: Multiple files
- **Issue**: Debug console.error statements (e.g., `sequencePlanService.ts`)
- **Action**: Use structured logger service
- **Impact**: Proper error tracking in production

### Task 18: Extract Large Component in App.tsx
- **File**: `creative-studio-ui/src/App.tsx`
- **Issue**: 800+ lines, 70+ imports
- **Action**: Split into route-based components
- **Impact**: Maintainable codebase

### Task 19: Remove Magic Numbers
- **Files**: `creative-studio-ui/src/sequence-editor/`
- **Issue**: Hardcoded values like `setTimeout(resolve, 2000)`
- **Action**: Extract to constants/config
- **Impact**: Configurable system

### Task 20: Standardize Error Handling Pattern
- **Files**: `creative-studio-ui/src/services/`
- **Issue**: Inconsistent try/catch patterns
- **Action**: Create error handling wrapper
- **Impact**: Consistent error management

---

## Category 4: State Management (Priority: High)

### Task 21: Consolidate Redux + Zustand Stores
- **Files**: `creative-studio-ui/src/store/`, `creative-studio-ui/src/stores/`
- **Issue**: Two state management systems (Zustand main, Redux for sequence editor)
- **Action**: Migrate to single Zustand store
- **Impact**: Simplified architecture

### Task 22: Implement State Persistence Middleware
- **File**: `creative-studio-ui/src/store/index.ts`
- **Issue**: Manual persistence calls
- **Action**: Create Zustand persist middleware
- **Impact**: Automatic state persistence

### Task 23: Add Immer for Immutable Updates
- **File**: `creative-studio-ui/src/store/index.ts`
- **Issue**: Manual immutable updates
- **Action**: Add Immer middleware
- **Impact**: Cleaner reducers

### Task 24: Optimize useAppStore Selectors
- **File**: `creative-studio-ui/src/stores/useAppStore.ts`
- **Issue**: Selecting entire state slices
- **Action**: Create granular selectors
- **Impact**: Prevent unnecessary re-renders

### Task 25: Add State Validation Middleware
- **File**: `creative-studio-ui/src/store/`
- **Issue**: No runtime validation
- **Action**: Add Zod validation in middleware
- **Impact**: Catch invalid state mutations

---

## Category 5: Testing (Priority: High)

### Task 26: Increase Test Coverage to 70%
- **Files**: `creative-studio-ui/src/__tests__/`
- **Issue**: Current coverage unknown, many untested hooks
- **Action**: Add unit tests for hooks and services
- **Impact**: Reliable codebase

### Task 27: Add Integration Tests for ProjectCreationService
- **File**: `creative-studio-ui/src/services/ProjectCreationService.ts`
- **Issue**: No tests for project creation flow
- **Action**: Add integration tests
- **Impact**: Verify end-to-end flows

### Task 28: Add E2E Tests for Timeline
- **File**: `creative-studio-ui/src/__tests__/e2e/`
- **Issue**: Timeline E2E tests missing
- **Action**: Add Playwright tests
- **Impact**: Verify user workflows

### Task 29: Add Performance Benchmarks
- **File**: `creative-studio-ui/src/hooks/`
- **Issue**: No performance regression tests
- **Action**: Add Vitest benchmarks
- **Impact**: Prevent performance degradation

### Task 30: Fix Failing Tests
- **Files**: `creative-studio-ui/src/__tests__/*.test.tsx`
- **Issue**: Tests may be failing (needs verification)
- **Action**: Fix and enable CI
- **Impact**: Reliable test suite

---

## Category 6: Accessibility (Priority: Medium)

### Task 31: Add ARIA Labels to All Interactive Elements
- **Files**: `creative-studio-ui/src/components/`
- **Issue**: Missing accessibility labels
- **Action**: Add aria-label, aria-describedby
- **Impact**: Screen reader support

### Task 32: Implement Keyboard Navigation for Timeline
- **File**: `creative-studio-ui/src/sequence-editor/components/Timeline/`
- **Issue**: Timeline not keyboard accessible
- **Action**: Add keyboard shortcuts
- **Impact**: Full keyboard support

### Task 33: Add Focus Management for Modals
- **Files**: `creative-studio-ui/src/components/modals/`
- **Issue**: Focus not trapped in modals
- **Action**: Use Radix UI focus scope
- **Impact**: Proper focus management

### Task 34: Add Screen Reader Announcements
- **File**: `creative-studio-ui/src/components/menuBar/ScreenReaderAnnouncer.tsx`
- **Issue**: Dynamic content not announced
- **Action**: Add live regions
- **Impact**: Accessible state changes

### Task 35: Implement Reduced Motion Support
- **File**: `creative-studio-ui/src/hooks/useReducedMotion.ts`
- **Issue**: Animations play regardless of user preference
- **Action**: Respect prefers-reduced-motion
- **Impact**: Accessible animations

---

## Category 7: Security (Priority: Medium)

### Task 36: Sanitize User Inputs in LLM Prompts
- **File**: `creative-studio-ui/src/services/llm/`
- **Issue**: User input directly in prompts
- **Action**: Add input sanitization
- **Impact**: Prevent prompt injection

### Task 37: Add Rate Limiting to API Calls
- **File**: `creative-studio-ui/src/services/APIManager.ts`
- **Issue**: No rate limiting
- **Action**: Implement request throttling
- **Impact**: Prevent API abuse

### Task 38: Secure LocalStorage Usage
- **Files**: `creative-studio-ui/src/utils/storageManager.ts`
- **Issue**: Sensitive data in localStorage
- **Action**: Encrypt sensitive data
- **Impact**: Data security

### Task 39: Add Content Security Policy
- **File**: `creative-studio-ui/vite.config.ts`
- **Issue**: No CSP headers
- **Action**: Configure CSP
- **Impact**: XSS prevention

---

## Category 8: Error Handling & Resilience (Priority: Medium)

### Task 40: Implement Global Error Boundary
- **File**: `creative-studio-ui/src/components/ErrorBoundary.tsx`
- **Issue**: Errors crash entire app
- **Action**: Add error boundaries per section
- **Impact**: Graceful degradation

### Task 41: Add Retry Logic to API Calls
- **File**: `creative-studio-ui/src/services/backendApiService.ts`
- **Issue**: No automatic retries
- **Action**: Implement exponential backoff
- **Impact**: Network resilience

### Task 42: Add Offline Support
- **File**: `creative-studio-ui/src/services/`
- **Issue**: App breaks offline
- **Action**: Add service worker
- **Impact**: Work offline

### Task 43: Implement Crash Recovery
- **File**: `creative-studio-ui/src/hooks/useWizardCrashRecovery.ts`
- **Issue**: Wizard state lost on crash
- **Action**: Auto-save and recovery
- **Impact**: Data preservation

### Task 44: Add Loading States to All Async Operations
- **Files**: `creative-studio-ui/src/hooks/`
- **Issue**: No loading indicators for some operations
- **Action**: Add consistent loading states
- **Impact**: Better UX

---

## Category 9: UI/UX Improvements (Priority: Medium)

### Task 45: Implement Dark/Light Theme Toggle
- **File**: `creative-studio-ui/src/stores/themeStore.ts`
- **Issue**: Theme toggle exists but incomplete
- **Action**: Complete theme implementation
- **Impact**: User preference support

### Task 46: Add Skeleton Loading States
- **Files**: `creative-studio-ui/src/components/`
- **Issue**: Content flashes in
- **Action**: Add skeleton loaders
- **Impact**: Perceived performance

### Task 47: Implement Toast Notifications
- **File**: `creative-studio-ui/src/hooks/use-toast.ts`
- **Issue**: Toast system exists but needs polish
- **Action**: Improve notification system
- **Impact**: User feedback

### Task 48: Add Drag and Drop Feedback
- **File**: `creative-studio-ui/src/sequence-editor/`
- **Issue**: No visual feedback during drag
- **Action**: Add drag previews
- **Impact**: Better UX

### Task 49: Implement Responsive Design
- **File**: `creative-studio-ui/src/hooks/useResponsiveGrid.ts`
- **Issue**: Not fully responsive
- **Action**: Complete responsive implementation
- **Impact**: Mobile support

### Task 50: Add Keyboard Shortcuts Documentation
- **File**: `creative-studio-ui/src/components/KeyboardShortcutsDialog.tsx`
- **Issue**: Shortcuts exist but undocumented
- **Action**: Add help dialog
- **Impact**: Discoverability

---

## Category 10: Documentation & Maintenance (Priority: Low)

### Task 51: Add JSDoc to All Public APIs
- **Files**: `creative-studio-ui/src/services/`
- **Issue**: Missing documentation
- **Action**: Add JSDoc comments
- **Impact**: Maintainable code

### Task 52: Create Component Storybook
- **Files**: `creative-studio-ui/src/components/`
- **Issue**: No component library
- **Action**: Set up Storybook
- **Impact**: Component documentation

### Task 53: Add README to Sequence Editor
- **File**: `creative-studio-ui/src/sequence-editor/README.md`
- **Issue**: Limited documentation
- **Action**: Expand documentation
- **Impact**: Onboarding

### Task 54: Create Migration Guide for Legacy Types
- **File**: `creative-studio-ui/src/types/legacy.ts`
- **Issue**: No migration path
- **Action**: Document migration steps
- **Impact**: Type safety

### Task 55: Add Contributing Guidelines
- **File**: `creative-studio-ui/`
- **Issue**: No contribution guide
- **Action**: Create CONTRIBUTING.md
- **Impact**: Community contribution

### Task 56: Set Up CI/CD Pipeline
- **File**: `.github/`
- **Issue**: Limited CI
- **Action**: Add GitHub Actions
- **Impact**: Automated quality

### Task 57: Add ESLint Rules for Best Practices
- **File**: `creative-studio-ui/eslint.config.js`
- **Issue**: Basic ESLint
- **Action**: Add strict rules
- **Impact**: Code quality

### Task 58: Implement Pre-commit Hooks
- **File**: `creative-studio-ui/`
- **Issue**: No pre-commit validation
- **Action**: Add husky + lint-staged
- **Impact**: Quality gates

### Task 59: Add Performance Monitoring
- **File**: `creative-studio-ui/src/services/`
- **Issue**: No runtime performance tracking
- **Action**: Add Web Vitals tracking
- **Impact**: Performance insights

### Task 60: Create API Documentation
- **File**: `creative-studio-ui/src/services/`
- **Issue**: No API docs
- **Action**: Generate OpenAPI spec
- **Impact**: Developer experience

---

## Implementation Priority Matrix

| Priority | Count | Tasks |
|----------|-------|-------|
| Critical | 8 | 1-8 |
| High | 17 | 9-25 |
| Medium | 20 | 26-45 |
| Low | 15 | 46-60 |

---

## Recommended Approach

1. **Phase 1 (Week 1-2)**: Performance tasks 1-8 - Immediate user impact
2. **Phase 2 (Week 3-4)**: TypeScript tasks 9-16 - Foundation for safety
3. **Phase 3 (Week 5-6)**: State management & Error handling
4. **Phase 4 (Week 7-8)**: Testing & Accessibility
5. **Phase 5 (Week 9+)**: UI/UX & Documentation

---

## Notes

- This audit is based on static code analysis
- Some tasks may overlap or depend on each other
- Estimated total effort: 3-4 months for full implementation
- Prioritize tasks based on user impact and technical debt
