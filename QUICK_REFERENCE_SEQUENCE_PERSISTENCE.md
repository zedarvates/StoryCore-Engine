# Quick Reference - Sequence File Persistence

## 🎯 What It Does

Shot modifications in the Editor now save directly to sequence JSON files on disk.

## 📝 Usage

### Update a Shot
```typescript
import { useEditorStore } from '@/stores/editorStore';

const { updateShot } = useEditorStore();

// Update shot properties
await updateShot(shotId, {
  generation: {
    prompt: "New prompt text",
    negativePrompt: "New negative prompt",
    parameters: {
      steps: 30,
      cfgScale: 8.5,
      seed: 12345
    }
  }
});

// ✅ Changes automatically saved to sequence_XXX.json
```

### Get Shots from Sequence
```typescript
const shots = await window.electronAPI.sequence.getShots(
  projectPath,
  "001"  // sequence ID
);
```

### Get All Sequences
```typescript
const sequences = await window.electronAPI.sequence.getAll(projectPath);
```

## 🔍 How It Works

1. **User edits shot** in Editor
2. **Store detects** if shot has `sequencePlanId`
3. **If YES**: Save to `sequences/sequence_XXX.json`
4. **If NO**: Save to `project.json` (old method)
5. **Refresh** shots in store
6. **UI updates** with persisted data

## 📁 File Structure

```
my-project/
├── project.json
└── sequences/
    ├── sequence_001.json  ← Shots saved here
    ├── sequence_002.json
    └── sequence_003.json
```

## 🐛 Debugging ComfyUI Status

### Check Console Logs
```
[ProjectDashboard] Checking ComfyUI at: http://localhost:8188
[ProjectDashboard] ComfyUI connected at: http://localhost:8188
```

### Common Issues

| Problem | Solution |
|---------|----------|
| Red indicator | Start ComfyUI server |
| Wrong port | Check Settings → ComfyUI Servers |
| Firewall | Allow ComfyUI in firewall |

### Verify ComfyUI Running
```bash
# Open in browser
http://localhost:8188

# Should see ComfyUI interface
```

## ✅ Testing Checklist

- [ ] Create project with sequences
- [ ] Edit shot in Editor
- [ ] Check `sequences/sequence_001.json` file
- [ ] Verify changes saved
- [ ] Close and reopen app
- [ ] Verify changes persist
- [ ] Check console for ComfyUI logs
- [ ] Verify status indicator color

## 🚀 Status

**Implementation**: ✅ Complete  
**Testing**: ⏳ Pending  
**Documentation**: ✅ Complete  

## 📚 Full Documentation

- `SEQUENCE_FILE_PERSISTENCE_COMPLETE.md` - Technical details
- `SEQUENCE_PERSISTENCE_VISUAL_GUIDE.md` - Visual diagrams
- `SESSION_COMPLETE_SEQUENCE_PERSISTENCE.md` - Session summary
