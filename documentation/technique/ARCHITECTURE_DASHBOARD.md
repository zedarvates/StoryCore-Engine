# Architecture du Dashboard - Diagramme Technique

## Vue d'Ensemble du Système

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              ProjectDashboardPage.tsx                        │  │
│  │  (Page wrapper with navigation)                              │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                         │
│                           ↓                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           ProjectDashboardNew.tsx                            │  │
│  │  (Main dashboard component)                                  │  │
│  │                                                              │  │
│  │  • Displays sequences from project                          │  │
│  │  • Shows statistics                                          │  │
│  │  • Handles user interactions                                 │  │
│  │  • Connects to store                                         │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         STATE MANAGEMENT                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    useAppStore (Zustand)                     │  │
│  │                                                              │  │
│  │  State:                                                      │  │
│  │  • project: Project | null                                   │  │
│  │  • shots: Shot[]                                             │  │
│  │  • characters: Character[]                                   │  │
│  │  • assets: Asset[]                                           │  │
│  │  • worlds: World[]                                           │  │
│  │                                                              │  │
│  │  Actions:                                                    │  │
│  │  • setProject(project)                                       │  │
│  │  • setShots(shots)                                           │  │
│  │  • openWizard(wizardId)                                      │  │
│  │  • setShowWorldWizard(show)                                  │  │
│  │  • setShowCharacterWizard(show)                              │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Electron API                              │  │
│  │                                                              │  │
│  │  window.electronAPI.project:                                 │  │
│  │  • create(data) → Project                                    │  │
│  │  • open(path) → Project                                      │  │
│  │  • selectForOpen() → string | null                           │  │
│  │                                                              │  │
│  │  window.electronAPI.recentProjects:                          │  │
│  │  • get() → RecentProject[]                                   │  │
│  │  • remove(path) → void                                       │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Electron)                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  ProjectService.ts                           │  │
│  │                                                              │  │
│  │  Methods:                                                    │  │
│  │  • createProject(data)                                       │  │
│  │    - Creates project directory                               │  │
│  │    - Generates sequences/                                    │  │
│  │    - Creates sequence_XXX.json files                         │  │
│  │    - Writes project.json                                     │  │
│  │    - Creates PROJECT_SUMMARY.md                              │  │
│  │                                                              │  │
│  │  • openProject(path)                                         │  │
│  │    - Validates project structure                             │  │
│  │    - Reads project.json                                      │  │
│  │    - Returns project data                                    │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         FILE SYSTEM                                 │
│                                                                     │
│  Project Directory/                                                 │
│  ├── project.json              ← Main configuration                │
│  ├── PROJECT_SUMMARY.md        ← Project overview                  │
│  ├── sequences/                ← Sequence files                    │
│  │   ├── sequence_001.json    ← Sequence 1 data                   │
│  │   ├── sequence_002.json    ← Sequence 2 data                   │
│  │   └── ...                                                       │
│  ├── characters/               ← Character data                    │
│  ├── worlds/                   ← World data                        │
│  └── assets/                   ← Generated assets                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Flux de Données - Création de Projet

```
User Action: Create Project
         ↓
┌────────────────────────┐
│  CreateProjectDialog   │
│  • Name: "Mon Film"    │
│  • Format: Court-métrage│
└──────────┬─────────────┘
           ↓
┌────────────────────────────────────┐
│  projectTemplateGenerator.ts       │
│  • generateProjectTemplate()       │
│  • Creates 15 sequences            │
│  • Each with 1 shot (60s)          │
│  • Returns: ProjectTemplate        │
└──────────┬─────────────────────────┘
           ↓
┌────────────────────────────────────┐
│  useLandingPage.ts                 │
│  • handleCreateProjectSubmit()     │
│  • Converts template to shots      │
│  • Calls Electron API              │
└──────────┬─────────────────────────┘
           ↓
┌────────────────────────────────────┐
│  Electron API                      │
│  • window.electronAPI.project      │
│  • create({ name, location,        │
│             format, initialShots })│
└──────────┬─────────────────────────┘
           ↓
┌────────────────────────────────────┐
│  ProjectService.ts                 │
│  • createProject()                 │
│  • Creates directories             │
│  • Writes project.json             │
│  • Creates sequence files          │
│  • Returns: Project                │
└──────────┬─────────────────────────┘
           ↓
┌────────────────────────────────────┐
│  File System                       │
│  • sequences/sequence_001.json     │
│  • sequences/sequence_002.json     │
│  • ...                             │
│  • project.json                    │
│  • PROJECT_SUMMARY.md              │
└──────────┬─────────────────────────┘
           ↓
┌────────────────────────────────────┐
│  Store Update                      │
│  • setProject(project)             │
│  • setShots(shots)                 │
└──────────┬─────────────────────────┘
           ↓
┌────────────────────────────────────┐
│  Dashboard Render                  │
│  • Displays sequences              │
│  • Shows statistics                │
└────────────────────────────────────┘
```

## Flux de Données - Affichage Dashboard

```
Dashboard Mount
      ↓
┌─────────────────────────────┐
│  ProjectDashboardNew.tsx    │
│  • useAppStore()            │
│  • Get project, shots       │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│  useMemo: Compute Sequences │
│  • Group shots by           │
│    sequence_id              │
│  • Calculate duration       │
│  • Count shots              │
│  • Sort by order            │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│  Render Sequence Cards      │
│  • Map over sequences       │
│  • Display each card        │
│  • Add click handlers       │
└─────────────────────────────┘
```

## Flux de Données - Clic sur Séquence

```
User Clicks Sequence Card
         ↓
┌────────────────────────────┐
│  handleSequenceClick()     │
│  • Get sequenceId          │
│  • Call onOpenEditor()     │
└──────────┬─────────────────┘
           ↓
┌────────────────────────────┐
│  ProjectDashboardPage      │
│  • onOpenEditor(sequenceId)│
│  • Navigate to editor      │
└──────────┬─────────────────┘
           ↓
┌────────────────────────────┐
│  Editor (Future)           │
│  • Filter shots by         │
│    sequence_id             │
│  • Display only those      │
│    shots                   │
└────────────────────────────┘
```

## Structure des Composants

```
ProjectDashboardPage
    │
    └── ProjectDashboardNew
            │
            ├── Header
            │   ├── Quick Access (4 buttons)
            │   └── Pipeline Status (3 items)
            │
            ├── Main Content (Left)
            │   ├── Global Resume Section
            │   │   ├── Editable Text Area
            │   │   ├── Save/Cancel Buttons
            │   │   └── LLM Assistant Button
            │   │
            │   ├── Creative Wizards Grid
            │   │   ├── World Building Card
            │   │   ├── Character Creation Card
            │   │   ├── Scene Generator Card
            │   │   ├── Dialogue Writer Card
            │   │   ├── Storyboard Creator Card
            │   │   └── Style Transfer Card
            │   │
            │   ├── Chatterbox Assistant
            │   │   ├── Chat Messages Area
            │   │   └── Input + Send Button
            │   │
            │   └── Plan Sequences Section
            │       ├── Header with +/- buttons
            │       └── Sequence Cards Grid
            │           ├── Sequence Card 1
            │           ├── Sequence Card 2
            │           └── ...
            │
            └── Recent Activity (Right)
                ├── Activity Item 1
                ├── Activity Item 2
                └── ...
```

## Hooks et État

```
ProjectDashboardNew Component
    │
    ├── useAppStore()
    │   ├── project
    │   ├── shots
    │   ├── openWizard
    │   ├── setShowWorldWizard
    │   └── setShowCharacterWizard
    │
    ├── useState()
    │   ├── globalResume
    │   ├── isEditingResume
    │   ├── chatMessages
    │   └── chatInput
    │
    ├── useMemo()
    │   ├── sequences (computed from shots)
    │   └── recentActivity (computed from project)
    │
    └── useEffect()
        └── Update globalResume when project changes
```

## Calcul des Séquences (useMemo)

```javascript
useMemo(() => {
  if (!shots || shots.length === 0) return [];
  
  // 1. Group shots by sequence_id
  const sequenceMap = new Map();
  shots.forEach(shot => {
    const seqId = shot.sequence_id || 'default';
    if (!sequenceMap.has(seqId)) {
      sequenceMap.set(seqId, []);
    }
    sequenceMap.get(seqId).push(shot);
  });
  
  // 2. Convert to sequence data
  const sequences = [];
  let order = 1;
  
  for (const [sequenceId, seqShots] of sequenceMap) {
    sequences.push({
      id: sequenceId,
      name: `Sequence ${order}`,
      duration: sum(seqShots.map(s => s.duration)),
      shots: seqShots.length,
      resume: seqShots[0]?.description || `Séquence ${order}`,
      order: order
    });
    order++;
  }
  
  // 3. Sort by order
  return sequences.sort((a, b) => a.order - b.order);
}, [shots]);
```

## Gestion des Événements

```
User Interactions
    │
    ├── Click Quick Access Button
    │   └── Navigate to section (future)
    │
    ├── Click Global Resume
    │   └── setIsEditingResume(true)
    │
    ├── Click Save Resume
    │   ├── handleSaveResume()
    │   └── Update project metadata (future)
    │
    ├── Click LLM Assistant
    │   ├── handleImproveResume()
    │   └── Call LLM API (future)
    │
    ├── Click Wizard Card
    │   ├── handleLaunchWizard(wizardId)
    │   └── Open wizard modal
    │
    ├── Type in Chat
    │   └── setChatInput(value)
    │
    ├── Click Send Chat
    │   ├── handleSendChat()
    │   └── Send to LLM (future)
    │
    ├── Click + Button
    │   ├── handleAddSequence()
    │   └── Create new sequence (future)
    │
    ├── Click - Button
    │   ├── handleRemoveSequence()
    │   └── Delete last sequence (future)
    │
    └── Click Sequence Card
        ├── handleSequenceClick(sequenceId)
        └── onOpenEditor(sequenceId)
```

## Performance Optimizations

```
Optimizations Applied:
    │
    ├── useMemo for sequences
    │   └── Only recomputes when shots change
    │
    ├── useMemo for recentActivity
    │   └── Only recomputes when project/sequences change
    │
    ├── useEffect for globalResume
    │   └── Only updates when project.metadata changes
    │
    └── Proper key props
        └── Prevents unnecessary re-renders
```

## Sécurité et Validation

```
Security Measures:
    │
    ├── Path Validation
    │   └── Prevents directory traversal
    │
    ├── Input Sanitization
    │   └── Removes invalid characters
    │
    ├── Type Safety
    │   └── Full TypeScript coverage
    │
    └── Error Handling
        └── Try-catch blocks with cleanup
```

## Prochaines Implémentations

```
Future Features:
    │
    ├── Sequence Management
    │   ├── handleAddSequence()
    │   │   ├── Generate new ID
    │   │   ├── Create default shot
    │   │   ├── Add to store
    │   │   ├── Create JSON file
    │   │   └── Update metadata
    │   │
    │   └── handleRemoveSequence()
    │       ├── Get last sequence
    │       ├── Remove shots
    │       ├── Delete JSON file
    │       └── Update metadata
    │
    ├── LLM Integration
    │   ├── handleSaveResume()
    │   │   └── Save to project.json
    │   │
    │   ├── handleImproveResume()
    │   │   └── Call Ollama/OpenAI API
    │   │
    │   └── handleSendChat()
    │       └── Parse and execute commands
    │
    └── Editor Integration
        ├── Pass sequenceId to editor
        ├── Filter shots by sequence_id
        └── Save changes to JSON file
```

---

**Architecture**: Clean, modular, extensible  
**Performance**: Optimized with proper hooks  
**Security**: Validated and sanitized  
**Maintainability**: Well-documented and typed
