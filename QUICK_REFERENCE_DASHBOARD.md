# Quick Reference - Project Dashboard

## 🎯 What's New

The project dashboard now displays **real project data** instead of mock data. All sequences, shots, and statistics come directly from your project files.

## 📊 Dashboard Sections

### 1. Header (Top)
- **Quick Access**: Scenes, Characters, Assets, Settings (with counts)
- **Pipeline Status**: Sequences count, Shots count, Ready indicator

### 2. Global Resume (Large Section)
- Click to edit
- Save/Cancel buttons
- 500 character limit
- LLM ASSISTANT button (future: AI improvements)

### 3. Creative Wizards (Grid)
- World Building
- Character Creation
- Scene Generator
- Dialogue Writer
- Storyboard Creator
- Style Transfer

### 4. Chatterbox Assistant (Chat Interface)
- Future: Natural language commands
- Future: AI-powered modifications

### 5. Plan Sequences (Main Feature)
- Shows all sequences from your project
- Each card displays:
  - Sequence name
  - Order number (#1, #2, etc.)
  - Duration (seconds)
  - Number of shots
  - Description
- **Click a card to open editor for that sequence**
- **+ button**: Add new sequence (coming soon)
- **- button**: Remove last sequence (coming soon)

### 6. Recent Activity (Right Panel)
- Project creation time
- Sequences loaded
- Shots ready
- Dynamic time calculations

## 🔄 How It Works

```
Your Project Files
    ↓
project.json (contains all shots)
    ↓
Dashboard groups shots by sequence_id
    ↓
Displays sequence cards
    ↓
Click card → Opens editor for that sequence
```

## 📁 File Structure

When you create a project with format "Court-métrage":

```
Your Project/
├── project.json              ← Main config with all shots
├── PROJECT_SUMMARY.md        ← Project overview
├── sequences/                ← Sequence files
│   ├── sequence_001.json    ← Sequence 1 data
│   ├── sequence_002.json    ← Sequence 2 data
│   └── ...                  ← Up to sequence_015.json
├── characters/               ← Character data
├── worlds/                   ← World data
└── assets/                   ← Generated assets
```

## 🎬 Formats Available

| Format | Duration | Sequences | Default Shot Duration |
|--------|----------|-----------|----------------------|
| Court-métrage | 15 min | 15 | 60s |
| Moyen-métrage | 40 min | 40 | 60s |
| Long-métrage standard | 90 min | 90 | 60s |
| Long-métrage premium | 120 min | 120 | 60s |
| Très long-métrage | 150 min | 150 | 60s |
| Spécial TV | 60 min | 60 | 60s |
| Épisode de série | 22 min | 22 | 60s |

## ✅ What Works Now

- ✅ Dashboard displays real project sequences
- ✅ Statistics show accurate counts
- ✅ Click sequence card to open editor
- ✅ Edit global resume (Save/Cancel)
- ✅ Recent activity with dynamic times
- ✅ Empty state when no sequences
- ✅ All wizards launch correctly

## 🚧 Coming Soon

- ⏳ Add new sequence (+ button)
- ⏳ Remove sequence (- button)
- ⏳ LLM improve resume
- ⏳ Chat assistant with AI
- ⏳ Save resume to project
- ⏳ Editor filters by sequence

## 🎨 UI Tips

### Editing Resume
1. Click on the resume text
2. Edit the text (max 500 chars)
3. Click "Save" to keep changes
4. Click "Cancel" to discard

### Viewing Sequences
- Hover over a card to see highlight effect
- Click to open in editor
- Order badge shows sequence number
- Duration and shot count displayed

### Using Wizards
- Click any wizard card to launch
- World Building and Character Creation open full wizards
- Other wizards open quick forms

## 🐛 Troubleshooting

**Q: I don't see any sequences**
- A: Create a new project with a format, or add shots to your existing project

**Q: Statistics show 0**
- A: Your project might not have any data yet. Use the wizards to create content.

**Q: Clicking sequence doesn't open editor**
- A: This is working! Check the console log to see the sequenceId being passed.

**Q: Can't save resume changes**
- A: The save functionality will be implemented in the next phase.

## 📝 Quick Actions

| Action | How To |
|--------|--------|
| Edit resume | Click on resume text |
| Launch wizard | Click wizard card |
| Open sequence | Click sequence card |
| View activity | Check right panel |
| See statistics | Look at header |

## 🔍 Where to Find Things

- **Project data**: `project.json` in project folder
- **Sequences**: `sequences/` folder with JSON files
- **Summary**: `PROJECT_SUMMARY.md` in project folder
- **Dashboard code**: `creative-studio-ui/src/components/workspace/ProjectDashboardNew.tsx`

## 📚 Documentation

For more details, see:
- `PROJECT_DASHBOARD_REDESIGN_COMPLETE.md` - Full implementation details
- `DASHBOARD_VISUAL_GUIDE.md` - Visual layout guide
- `AUTO_GENERATION_SEQUENCES_SHOTS_COMPLETE.md` - French summary

## 💡 Pro Tips

1. **Create projects with formats** to get automatic sequences
2. **Use wizards** to populate your project with content
3. **Check Recent Activity** to see what's happening
4. **Click sequences** to work on specific parts of your project
5. **Edit the resume** to describe your overall story

---

**Need Help?** Check the documentation files or the console logs for debugging information.
