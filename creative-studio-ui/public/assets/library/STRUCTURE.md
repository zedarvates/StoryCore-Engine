# Library Structure Overview

Visual guide to the Prompt Library organization.

## Directory Tree

```
library/
│
├── 📄 index.json                          # Main index - start here
├── 📄 prompt-library.json                 # Metadata and tags
├── 📄 README.md                           # Full documentation
├── 📄 QUICKSTART.md                       # 5-minute guide
├── 📄 MIGRATION.md                        # Migration from old structure
├── 📄 STRUCTURE.md                        # This file
│
├── 🔧 PromptLibraryService.ts             # TypeScript service
├── 🎨 PromptLibraryBrowser.tsx            # React component
├── 📝 example-integration.ts              # Integration examples
│
├── 📁 01-master-coherence/                # Foundation prompts
│   ├── coherence-grid.json                # 3x3 visual DNA grid
│   ├── character-grid.json                # Character design sheet
│   └── environment-grid.json              # Environment design sheet
│
├── 📁 02-genres/                          # Genre templates
│   ├── scifi.json                         # Science fiction
│   ├── fantasy.json                       # Medieval fantasy
│   ├── horror.json                        # Horror/thriller
│   ├── romance.json                       # Romance/drama
│   ├── action.json                        # Action/adventure
│   └── animation.json                     # Animation/cartoon
│
├── 📁 03-shot-types/                      # Cinematography
│   ├── establishing-shot.json             # Wide establishing
│   ├── wide-shot.json                     # Full figure
│   ├── medium-shot.json                   # Waist up
│   ├── close-up.json                      # Face/object
│   ├── extreme-close-up.json              # Macro detail
│   ├── over-shoulder.json                 # Dialogue shot
│   └── pov.json                           # First person
│
├── 📁 04-lighting/                        # Lighting conditions
│   ├── golden-hour.json                   # Sunrise/sunset
│   ├── blue-hour.json                     # Twilight
│   ├── night-moonlight.json               # Moonlit night
│   └── night-artificial.json              # Urban night
│
└── 📁 05-scene-elements/                  # Scene components
    ├── hero-character.json                # Protagonist
    ├── villain-character.json             # Antagonist
    ├── interior-residential.json          # Indoor home
    └── exterior-nature.json               # Natural landscape
```

## File Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                        index.json                            │
│                   (Central Registry)                         │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─► 01-master-coherence/  ──┐
             │                            │
             ├─► 02-genres/              │
             │                            ├─► Individual Prompts
             ├─► 03-shot-types/          │   (JSON Templates)
             │                            │
             ├─► 04-lighting/            │
             │                            │
             └─► 05-scene-elements/  ────┘
```

## Data Flow

```
User Request
     │
     ▼
┌─────────────────────┐
│ PromptLibraryService│
│  - loadPrompt()     │
│  - search()         │
│  - fillPrompt()     │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ JSON Template│
    │  - prompt    │
    │  - variables │
    │  - examples  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Fill Values  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Final Prompt │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  ComfyUI /   │
    │  Generation  │
    └──────────────┘
```

## Prompt Template Anatomy

```json
{
  "category": "genres",              // ← Category folder
  "subcategory": "science-fiction",  // ← Subcategory for filtering
  "id": "genre-scifi",               // ← Unique identifier
  "name": "Science Fiction Scene",   // ← Display name
  "description": "...",              // ← User-facing description
  "tags": ["scifi", "futuristic"],   // ← Searchable tags
  
  "prompt": "Sci-fi scene, {VAR}...", // ← Template with {VARIABLES}
  
  "variables": {                     // ← Variable definitions
    "VAR": {
      "type": "string|enum|number",  // ← Data type
      "required": true,              // ← Validation
      "options": ["a", "b"],         // ← For enums
      "description": "..."           // ← Help text
    }
  },
  
  "examples": [                      // ← Example values
    { "VAR": "example value" }
  ]
}
```

## Usage Patterns

### Pattern 1: Direct Access
```
User → Load Prompt → Fill Variables → Generate
```

### Pattern 2: Search & Discover
```
User → Search/Browse → Select Prompt → Fill → Generate
```

### Pattern 3: Batch Generation
```
User → Load Template → Multiple Value Sets → Generate All
```

### Pattern 4: Pipeline Integration
```
Master Coherence → Character → Scene Shots → Export
```

## Category Purposes

| Category | Purpose | When to Use |
|----------|---------|-------------|
| **master-coherence** | Establish visual DNA | First step of any project |
| **genres** | Set overall style | Define project aesthetic |
| **shot-types** | Frame composition | Every individual shot |
| **lighting** | Set mood and time | Enhance atmosphere |
| **scene-elements** | Specific objects | Detailed scene building |

## Integration Points

### 1. UI Components
```
PromptLibraryBrowser.tsx → User Interface
```

### 2. Services
```
PromptLibraryService.ts → Programmatic Access
```

### 3. Pipeline
```
StoryCore Pipeline → Automated Generation
```

### 4. API
```
REST API → External Tools
```

## Extensibility

### Adding New Categories
1. Create folder: `06-new-category/`
2. Add prompts as JSON files
3. Update `index.json`
4. Update `prompt-library.json` tags

### Adding New Prompts
1. Create JSON file in appropriate category
2. Follow template structure
3. Add to category's prompt list in `index.json`
4. Increment `totalPrompts` count

### Custom Variables
```json
{
  "variables": {
    "CUSTOM_VAR": {
      "type": "string",
      "required": false,
      "default": "default value",
      "description": "Your custom variable"
    }
  }
}
```

## Best Practices

1. **Start with index.json** - Understand available categories
2. **Use the service** - Don't parse JSON manually
3. **Validate before generating** - Catch errors early
4. **Combine prompts** - Mix categories for rich results
5. **Save successful combinations** - Build your own library

## Quick Reference

| Task | Method |
|------|--------|
| List categories | `getCategories()` |
| Load prompt | `loadPrompt(path)` |
| Search text | `search(query)` |
| Search tags | `searchByTags(tags)` |
| Fill template | `fillPrompt(template, values)` |
| Validate | `validateValues(template, values)` |

## File Naming Convention

```
category-name/
  ├── descriptive-name.json          # Kebab-case
  ├── another-prompt.json
  └── sub-category-name.json
```

## Version Control

- **Current Version**: 1.1.0
- **Last Updated**: 2026-01-22
- **Total Prompts**: 93
- **Format**: JSON Schema compliant

---

For detailed usage, see [README.md](./README.md)  
For quick start, see [QUICKSTART.md](./QUICKSTART.md)  
For migration, see [MIGRATION.md](./MIGRATION.md)
