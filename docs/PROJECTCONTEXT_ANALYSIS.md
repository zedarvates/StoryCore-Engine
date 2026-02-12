# ProjectContext Analysis & Split Recommendation

**File:** `creative-studio-ui/src/contexts/ProjectContext.tsx`  
**Status:** Large, monolithic context requiring refactoring  
**Total Lines:** 738

---

## 1. Current State Variables

| # | Variable | Type | Purpose |
|---|-----------|------|---------|
| 1 | `project` | `DashboardProject \| null` | Main project data including sequences, shots, audio phrases |
| 2 | `selectedShot` | `DashboardShot \| null` | Currently selected shot for editing |
| 3 | `generationStatus` | `DashboardGenerationStatus` | Generation stage and progress tracking |
| 4 | `isGenerating` | `boolean` | Flag indicating generation in progress |
| 5 | `isLoading` | `boolean` | Flag indicating project loading |
| 6 | `isSaving` | `boolean` | Flag indicating project saving |
| 7 | `saveStatus` | `'idle' \| 'saving' \| 'saved' \| 'error'` | Save operation status |
| 8 | `error` | `string \| null` | Error messages for display |

**Total State Variables:** 8

---

## 2. Current Callback Functions

### Project Management
| # | Function | Purpose |
|---|----------|---------|
| 1 | `loadProject(id: string)` | Load project from persistence layer or create new |
| 2 | `saveProject()` | Save project to persistence layer |

### Shot Management (Task 3.2)
| # | Function | Purpose |
|---|----------|---------|
| 3 | `updateShot(shotId, updates)` | Update shot properties with memoized prompt validation |
| 4 | `deleteShot(shotId, deletePhrases)` | Delete shot with optional phrase cleanup |
| 5 | `validateAllShots()` | Validate all shots have valid prompts |
| 6 | `getPromptCompletionStatus()` | Get counts of complete/incomplete prompts |

### Dialogue Phrase Management (Task 3.3)
| # | Function | Purpose |
|---|----------|---------|
| 7 | `addDialoguePhrase(phrase)` | Add new dialogue phrase with auto-generated ID |
| 8 | `updateDialoguePhrase(phraseId, updates)` | Update existing phrase |
| 9 | `deleteDialoguePhrase(phraseId)` | Delete phrase |
| 10 | `linkPhraseToShot(phraseId, shotId)` | Link phrase to shot with validation |

### Generation Management
| # | Function | Purpose |
|---|----------|---------|
| 11 | `generateSequence()` | Execute StoryCore pipeline with progress callbacks |
| 12 | `cancelGeneration()` | Cancel ongoing generation |

### Selection Management
| # | Function | Purpose |
|---|----------|---------|
| 13 | `selectShot(shot)` | Select shot for editing |

**Total Callback Functions:** 13

---

## 3. Recommended Split

### 3.1 ProjectDataContext

**Responsibility:** Core project CRUD operations and persistence

**State Variables:**
- `project` (shared)
- `isLoading`
- `isSaving`
- `saveStatus`
- `error`

**Callback Functions:**
- `loadProject(id: string)`
- `saveProject()`

**Rationale:** Isolates data persistence concerns. Other contexts need project data but shouldn't manage loading/saving states.

**Dependencies:**
- `projectPersistence` service
- `memoizedValidatePrompt` (for prompt validation)

---

### 3.2 ShotManagementContext

**Responsibility:** Shot CRUD operations and validation

**State Variables:**
- `selectedShot` (for UI selection)

**Callback Functions:**
- `updateShot(shotId, updates)`
- `deleteShot(shotId, deletePhrases)`
- `validateAllShots()`
- `getPromptCompletionStatus()`
- `selectShot(shot)`

**Rationale:** Shots are independent entities. This context manages shot lifecycle without coupling to dialogue or generation.

**Dependencies:**
- `memoizedValidatePrompt` for validation
- Needs `project` from ProjectDataContext

---

### 3.3 DialogueContext

**Responsibility:** Dialogue/phrase CRUD operations

**State Variables:**
- None (operates on project.audioPhrases)

**Callback Functions:**
- `addDialoguePhrase(phrase)`
- `updateDialoguePhrase(phraseId, updates)`
- `deleteDialoguePhrase(phraseId)`
- `linkPhraseToShot(phraseId, shotId)`

**Rationale:** Dialogue phrases are independent entities that can be linked to shots but don't require generation coupling.

**Dependencies:**
- Needs `project` from ProjectDataContext (for shot validation in linkPhraseToShot)

---

### 3.4 GenerationContext

**Responsibility:** Generation status and control

**State Variables:**
- `generationStatus`
- `isGenerating`

**Callback Functions:**
- `generateSequence()`
- `cancelGeneration()`

**Rationale:** Generation is an independent process that reads project data and produces results. It doesn't need to modify project structure.

**Dependencies:**
- `generationStatePersistence` service
- `sequenceGenerationService`
- Needs `project` from ProjectDataContext for validation

---

## 4. Estimated Effort

| Context | Complexity | Lines of Code | Estimated Effort |
|---------|------------|---------------|------------------|
| ProjectDataContext | Medium | ~80 | 1 hour |
| ShotManagementContext | Medium | ~100 | 1.5 hours |
| DialogueContext | Low | ~60 | 45 minutes |
| GenerationContext | Medium | ~90 | 1 hour |
| Composite Provider | Low | ~40 | 30 minutes |

**Total Estimated Effort:** ~5 hours

---

## 5. Implementation Order

1. **Phase 1:** Create `ProjectDataContext` (core data + persistence)
2. **Phase 2:** Create `ShotManagementContext` (shot CRUD)
3. **Phase 3:** Create `DialogueContext` (phrase CRUD)
4. **Phase 4:** Create `GenerationContext` (generation control)
5. **Phase 5:** Create composite `ProjectProvider` that combines all contexts
6. **Phase 6:** Update all consumers to use new contexts

---

## 6. Benefits of Split

| Benefit | Description |
|---------|-------------|
| **Smaller bundle size** | Components only import contexts they need |
| **Better performance** | Smaller re-render scopes when state changes |
| **Improved maintainability** | Each context has single responsibility |
| **Easier testing** | Contexts can be unit tested in isolation |
| **Better developer experience** | Clearer API boundaries |

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing consumers | Use compatibility wrapper or gradual migration |
| Context proliferation | Use composite provider pattern |
| Duplicate state | Keep `project` as single source of truth in ProjectDataContext |
| Circular dependencies | Ensure contexts are imported statically, not dynamically |

---

## 8. Files to Create/Modify

**New Files:**
- `creative-studio-ui/src/contexts/ProjectDataContext.tsx`
- `creative-studio-ui/src/contexts/ShotManagementContext.tsx`
- `creative-studio-ui/src/contexts/DialogueContext.tsx`
- `creative-studio-ui/src/contexts/GenerationContext.tsx`

**Modified Files:**
- `creative-studio-ui/src/contexts/ProjectContext.tsx` (becomes thin wrapper)
- All components consuming `useProject` hook
