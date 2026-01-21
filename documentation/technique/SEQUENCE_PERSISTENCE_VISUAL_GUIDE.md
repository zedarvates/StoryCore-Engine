# Sequence File Persistence - Visual Guide

## 🎯 What Was Implemented

Shot modifications in the Editor now save directly to sequence JSON files on disk, ensuring all changes persist between sessions.

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         EDITOR UI                                │
│  User edits shot: prompt, negative prompt, steps, CFG, etc.     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EDITOR STORE (Zustand)                        │
│  updateShot(shotId, updates)                                     │
│  • Detects if shot has sequencePlanId                           │
│  • Routes to appropriate persistence method                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌───────────────────┐    ┌───────────────────────┐
    │  HAS sequencePlanId│    │ NO sequencePlanId     │
    │  (ProductionShot)  │    │ (Regular Shot)        │
    └─────────┬──────────┘    └──────────┬────────────┘
              │                          │
              ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────┐
│ NEW: sequence.updateShot │  │ OLD: project.updateShot│
│ (Sequence file)          │  │ (project.json)        │
└────────────┬─────────────┘  └──────────┬───────────┘
             │                           │
             ▼                           ▼
┌─────────────────────────────────────────────────────┐
│              IPC BRIDGE (Electron)                   │
│  • SEQUENCE_UPDATE_SHOT                             │
│  • PROJECT_UPDATE_SHOT                              │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│           PROJECT SERVICE (Backend)                  │
│  • updateShotInSequence() → sequence_XXX.json       │
│  • updateShot() → project.json                      │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│              FILE SYSTEM                             │
│  sequences/sequence_001.json ← UPDATED              │
│  sequences/sequence_002.json                        │
│  project.json                                       │
└─────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Example

### Before (Old System)
```
User edits shot
    ↓
Store updates in memory
    ↓
Save to project.json (all shots in one file)
    ↓
❌ Large file, slow I/O, no organization
```

### After (New System)
```
User edits shot in Sequence 1
    ↓
Store detects sequencePlanId = "001"
    ↓
IPC call: sequence.updateShot(projectPath, "001", shotId, updates)
    ↓
Backend reads sequences/sequence_001.json
    ↓
Updates specific shot in shots array
    ↓
Writes back to sequences/sequence_001.json
    ↓
✅ Fast, organized, scalable
```

## 📁 File Structure

```
my-project/
├── project.json                    # Project metadata only
│   ├── name: "My Film"
│   ├── format: "Court-métrage"
│   └── metadata: { globalResume: "..." }
│
├── sequences/
│   ├── sequence_001.json          # Sequence 1 + its shots
│   │   ├── id: "001"
│   │   ├── name: "Sequence 1"
│   │   ├── shots: [
│   │   │     { id, prompt, parameters, ... },
│   │   │     { id, prompt, parameters, ... }
│   │   │   ]
│   │   └── metadata: { ... }
│   │
│   ├── sequence_002.json          # Sequence 2 + its shots
│   └── sequence_003.json          # Sequence 3 + its shots
│
├── characters/
│   └── character-uuid.json
│
└── assets/
    └── ...
```

## 🎬 Shot Data Structure

### ProductionShot (with sequence info)
```json
{
  "id": "shot-uuid-123",
  "sequencePlanId": "001",          ← KEY: Links to sequence file
  "sceneId": "scene-uuid",
  "number": 1,
  "type": "wide",
  
  "generation": {
    "prompt": "A beautiful landscape...",
    "negativePrompt": "blurry, low quality",
    "model": "flux-dev",
    "parameters": {
      "steps": 20,
      "cfgScale": 7.5,
      "width": 1024,
      "height": 768,
      "seed": 42
    }
  },
  
  "timing": {
    "duration": 5,
    "inPoint": 0,
    "outPoint": 5,
    "transition": "fade"
  },
  
  "camera": {
    "framing": "wide",
    "angle": "eye-level",
    "movement": { "type": "static" }
  },
  
  "status": "planned"
}
```

## 🔧 API Methods

### 1. Update Shot in Sequence
```typescript
await window.electronAPI.sequence.updateShot(
  projectPath,    // "/path/to/project"
  sequenceId,     // "001"
  shotId,         // "shot-uuid-123"
  updates         // { generation: { prompt: "New prompt" } }
);
```

### 2. Get All Shots from Sequence
```typescript
const shots = await window.electronAPI.sequence.getShots(
  projectPath,    // "/path/to/project"
  sequenceId      // "001"
);
// Returns: Shot[]
```

### 3. Get All Sequences
```typescript
const sequences = await window.electronAPI.sequence.getAll(
  projectPath     // "/path/to/project"
);
// Returns: Sequence[]
```

## ✅ Benefits

| Feature | Old System | New System |
|---------|-----------|------------|
| **File Organization** | All shots in project.json | Shots grouped by sequence |
| **File Size** | Large monolithic file | Small, focused files |
| **I/O Performance** | Read/write entire file | Read/write only affected sequence |
| **Scalability** | Degrades with shot count | Constant performance |
| **Data Integrity** | Single point of failure | Isolated sequence files |
| **Concurrent Edits** | Conflicts likely | Reduced conflicts |
| **Backup/Version Control** | Large diffs | Small, targeted diffs |

## 🧪 Testing Scenarios

### Scenario 1: Edit Shot Prompt
```typescript
// 1. Open project with sequences
const project = await window.electronAPI.project.open(projectPath);

// 2. Load shots from sequence 1
const shots = await window.electronAPI.sequence.getShots(projectPath, "001");

// 3. Update shot prompt
await window.electronAPI.sequence.updateShot(
  projectPath,
  "001",
  shots[0].id,
  {
    generation: {
      ...shots[0].generation,
      prompt: "A stunning mountain vista at sunset"
    }
  }
);

// 4. Verify persistence
const updatedShots = await window.electronAPI.sequence.getShots(projectPath, "001");
console.assert(updatedShots[0].generation.prompt === "A stunning mountain vista at sunset");
```

### Scenario 2: Edit Multiple Parameters
```typescript
await window.electronAPI.sequence.updateShot(
  projectPath,
  "001",
  shotId,
  {
    generation: {
      ...shot.generation,
      prompt: "New prompt",
      negativePrompt: "New negative prompt",
      parameters: {
        ...shot.generation.parameters,
        steps: 30,
        cfgScale: 8.5,
        seed: 12345
      }
    }
  }
);
```

### Scenario 3: Verify Persistence After Restart
```typescript
// 1. Edit shot
await updateShot(shotId, updates);

// 2. Close app
await window.electronAPI.app.quit();

// 3. Reopen app and project
const project = await window.electronAPI.project.open(projectPath);

// 4. Load shots
const shots = await window.electronAPI.sequence.getShots(projectPath, "001");

// 5. Verify changes persisted
console.assert(shots[0].generation.prompt === "New prompt");
```

## 🚀 Next Steps

1. **Test Basic Persistence**
   - Create project
   - Edit shot in Editor
   - Check sequence_001.json file
   - Verify changes saved

2. **Test Reload**
   - Close and reopen project
   - Verify changes still present

3. **Test Multiple Sequences**
   - Edit shots in different sequences
   - Verify each sequence file updated correctly

4. **Test Error Handling**
   - Missing sequence file
   - Invalid shot ID
   - Corrupted JSON

5. **Performance Testing**
   - Large project (100+ shots)
   - Measure save time
   - Compare to old system

## 📝 Summary

✅ **Backend**: 3 new methods in ProjectService  
✅ **IPC**: 3 new channels registered  
✅ **Preload**: sequence namespace exposed  
✅ **Types**: Complete TypeScript definitions  
✅ **Store**: Smart routing with fallback  
✅ **No Errors**: All diagnostics pass  

**Status**: READY FOR TESTING 🎉
