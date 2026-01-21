# Project Dashboard - Visual Guide

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER (Compact)                                                       │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐   │
│  │ Quick Access (4 buttons)     │  │ Pipeline Status (3 items)    │   │
│  │ • Scenes (count)             │  │ • Sequences: X               │   │
│  │ • Characters (count)         │  │ • Shots: X                   │   │
│  │ • Assets (count)             │  │ • Ready ✓                    │   │
│  │ • Settings                   │  └──────────────────────────────┘   │
│  └──────────────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐  ┌──────────────────────┐
│  MAIN CONTENT (Left Column)                 │  │  RECENT ACTIVITY     │
│                                              │  │  (Right Column)      │
│  ┌──────────────────────────────────────┐   │  │                      │
│  │ GLOBAL RESUME                        │   │  │  • Project created   │
│  │ (Editable, 500 chars max)            │   │  │    2 hours ago       │
│  │                                      │   │  │                      │
│  │ [Click to edit]                      │   │  │  • 15 sequences      │
│  │                                      │   │  │    loaded            │
│  │ [LLM ASSISTANT] [OLLAMA] [COMFYUI]  │   │  │    Just now          │
│  └──────────────────────────────────────┘   │  │                      │
│                                              │  │  • 15 shots ready    │
│  ┌──────────────────────────────────────┐   │  │    Just now          │
│  │ CREATIVE WIZARDS (Grid)              │   │  │                      │
│  │                                      │   │  └──────────────────────┘
│  │  [World Building]  [Character]       │   │
│  │  [Scene Generator] [Dialogue]        │   │
│  │  [Storyboard]      [Style Transfer]  │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ CHATTERBOX ASSISTANT LLM             │   │
│  │                                      │   │
│  │  [Chat messages area]                │   │
│  │                                      │   │
│  │  [Input field] [Send]                │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ PLAN SEQUENCES          [+] [-]      │   │
│  │                                      │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐   │   │
│  │  │Seq 1   │ │Seq 2   │ │Seq 3   │   │   │
│  │  │60s     │ │60s     │ │60s     │   │   │
│  │  │1 shot  │ │1 shot  │ │1 shot  │   │   │
│  │  └────────┘ └────────┘ └────────┘   │   │
│  │  [Click to open in editor]           │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Header Section (Top)

**Quick Access (Left)**
- 4 compact buttons with icons and counts
- Shows real-time statistics from project
- Buttons: Scenes, Characters, Assets, Settings

**Pipeline Status (Right)**
- 3 status indicators
- Sequences count, Shots count, Ready status
- Green checkmark when ready

### 2. Main Content (Left Column)

**Global Resume Section**
- Large editable text area (500 char max)
- Click to edit, Save/Cancel buttons appear
- LLM ASSISTANT button (purple gradient)
- OLLAMA and COMFYUI buttons (blue outline)

**Creative Wizards Grid**
- 6 wizard cards in 2-column grid
- Each card: Icon + Title + Description + "Use" button
- Hover effect: border color change + lift
- Wizards:
  - World Building (Globe icon)
  - Character Creation (Users icon)
  - Scene Generator (Film icon)
  - Dialogue Writer (MessageSquare icon)
  - Storyboard Creator (FileText icon)
  - Style Transfer (Wand icon)

**Chatterbox Assistant LLM**
- Chat message area (scrollable)
- User messages: right-aligned, dark background
- Assistant messages: left-aligned, blue tint
- Input field + Send button at bottom
- Enter key to send

**Plan Sequences Section**
- Header with title and +/- buttons
- Grid of sequence cards (auto-fill, min 280px)
- Each card shows:
  - Sequence name + order badge (#1, #2, etc.)
  - Duration in seconds
  - Number of shots
  - Resume/description
- Click card to open editor for that sequence
- Empty state message when no sequences

### 3. Recent Activity (Right Column)

**Vertical Panel**
- Fixed width (300px)
- Scrollable list of activity items
- Each item:
  - Icon (green checkmark)
  - Action description
  - Time ago (calculated dynamically)
- Shows:
  - Project creation
  - Sequences loaded
  - Shots ready

## Color Scheme

**Background Colors**:
- Main background: `#1a1a1a` (very dark gray)
- Card background: `#222` (dark gray)
- Input background: `#2a2a2a` (medium dark gray)

**Accent Colors**:
- Primary blue: `#4a9eff` (buttons, borders, highlights)
- Success green: `#22c55e` (status, add button)
- Error red: `#ef4444` (remove button)
- Purple gradient: `#667eea` to `#764ba2` (LLM button)

**Text Colors**:
- Primary text: `#ffffff` (white)
- Secondary text: `#888` (gray)
- Muted text: `#aaa` (light gray)

## Interactions

### Click Actions

1. **Quick Access Buttons**: Navigate to respective sections (future)
2. **Global Resume**: Click to edit, shows Save/Cancel buttons
3. **LLM ASSISTANT**: Improve resume with AI (future)
4. **OLLAMA/COMFYUI**: Configure services (future)
5. **Wizard Cards**: Open respective wizard modal
6. **Chat Send**: Send message to LLM assistant (future)
7. **+ Button**: Add new sequence (future)
8. **- Button**: Remove last sequence (future)
9. **Sequence Card**: Open editor for that sequence

### Hover Effects

- **Buttons**: Background color change, slight lift
- **Wizard Cards**: Border color change to blue, lift effect
- **Sequence Cards**: Border color change to blue, lift + shadow
- **Resume Display**: Border color change to blue (indicates editable)

## Responsive Behavior

**Grid Layouts**:
- Wizards: `repeat(auto-fill, minmax(300px, 1fr))`
- Sequences: `repeat(auto-fill, minmax(280px, 1fr))`
- Adapts to container width automatically

**Scrolling**:
- Left column: Vertical scroll for main content
- Right column: Vertical scroll for activity list
- Chat messages: Vertical scroll within chat area

**Fixed Elements**:
- Header: Fixed at top, no scroll
- Right column: Fixed width (300px)

## Data Sources

All data comes from the project store:

```typescript
// From useAppStore
const project = useAppStore((state) => state.project);
const shots = useAppStore((state) => state.shots);

// Computed
const sequences = useMemo(() => {
  // Group shots by sequence_id
  // Calculate duration, shot count, etc.
}, [shots]);

// Statistics
- Scenes count: shots.length
- Characters count: project.characters.length
- Assets count: project.assets.length
- Sequences count: sequences.length
```

## Future Enhancements

### Phase 1: Sequence Management
- Add sequence: Create new sequence + shot + JSON file
- Remove sequence: Delete sequence + shots + JSON file
- Edit sequence: Modify name, description, duration

### Phase 2: LLM Integration
- Improve resume: AI-powered text enhancement
- Chat assistant: Natural language commands
- Action parsing: Execute commands from chat

### Phase 3: Editor Integration
- Open editor with sequence filter
- Navigate between sequences
- Save changes to sequence JSON files

### Phase 4: Advanced Features
- Drag-and-drop sequence reordering
- Bulk operations (duplicate, merge sequences)
- Export/import sequences
- Sequence templates

---

**Design Philosophy**: Clean, modern, functional. Focus on real data, clear hierarchy, and intuitive interactions.
