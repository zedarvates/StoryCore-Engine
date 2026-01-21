# StoryCore Prompt Library

A comprehensive, structured library of image generation prompts for the StoryCore-Engine pipeline.

## Overview

The Prompt Library provides:
- **Structured JSON format** for easy programmatic access
- **Categorized prompts** for different use cases
- **Variable substitution** for customization
- **TypeScript service** for UI integration
- **React component** for browsing and using prompts

## Structure

```
library/
├── index.json                      # Main index with all categories
├── prompt-library.json             # Library metadata and tags
├── PromptLibraryService.ts         # TypeScript service
├── PromptLibraryBrowser.tsx        # React component example
├── 01-master-coherence/            # Master Coherence Sheet prompts
│   ├── coherence-grid.json
│   ├── character-grid.json
│   └── environment-grid.json
├── 02-genres/                      # Genre-specific prompts
│   ├── scifi.json
│   ├── fantasy.json
│   ├── horror.json
│   ├── romance.json
│   ├── action.json
│   └── animation.json
├── 03-shot-types/                  # Cinematic shot types
│   ├── establishing-shot.json
│   ├── wide-shot.json
│   ├── medium-shot.json
│   ├── close-up.json
│   ├── extreme-close-up.json
│   ├── over-shoulder.json
│   └── pov.json
└── 04-lighting/                    # Lighting conditions
    ├── golden-hour.json
    ├── blue-hour.json
    ├── night-moonlight.json
    └── night-artificial.json
```

## Prompt Template Format

Each prompt is stored as a JSON file with this structure:

```json
{
  "category": "genres",
  "subcategory": "science-fiction",
  "id": "genre-scifi",
  "name": "Science Fiction Scene",
  "description": "Futuristic sci-fi scene with advanced technology",
  "tags": ["scifi", "futuristic", "technology"],
  "prompt": "Sci-fi scene, {SPECIFIC_ELEMENT}. Futuristic technology...",
  "variables": {
    "SPECIFIC_ELEMENT": {
      "type": "string",
      "required": true,
      "description": "The main element of the scene"
    }
  },
  "examples": [
    {
      "SPECIFIC_ELEMENT": "hovering vehicle in neon city"
    }
  ]
}
```

## Usage

### 1. Using the TypeScript Service

```typescript
import { promptLibrary } from './library/PromptLibraryService';

// Load and browse categories
const categories = await promptLibrary.getCategories();

// Get prompts by category
const scifiPrompts = await promptLibrary.getPromptsByCategory('genres');

// Search prompts
const results = await promptLibrary.search('character');

// Search by tags
const heroPrompts = await promptLibrary.searchByTags(['hero', 'character']);

// Load specific prompt
const template = await promptLibrary.loadPrompt('02-genres/scifi.json');

// Fill prompt with values
const filledPrompt = promptLibrary.fillPrompt(template, {
  SPECIFIC_ELEMENT: 'hovering vehicle in neon city',
  AESTHETIC: 'cyberpunk'
});

// Validate values
const validation = promptLibrary.validateValues(template, values);
if (!validation.valid) {
  console.error(validation.errors);
}
```


### 2. Using the React Component

```tsx
import { PromptLibraryBrowser } from './library/PromptLibraryBrowser';

function MyComponent() {
  const handlePromptSelect = (prompt: string) => {
    console.log('Generated prompt:', prompt);
    // Send to ComfyUI or use in your pipeline
  };

  return (
    <PromptLibraryBrowser onSelectPrompt={handlePromptSelect} />
  );
}
```

### 3. Direct JSON Access

You can also load prompts directly via fetch:

```javascript
// Load index
const index = await fetch('/library/index.json').then(r => r.json());

// Load specific prompt
const prompt = await fetch('/library/02-genres/scifi.json').then(r => r.json());
```

## Categories

### 1. Master Coherence (01-master-coherence/)
Establishes the visual DNA for your project through 3x3 grids:
- **Coherence Grid**: Overall visual consistency
- **Character Grid**: Character design sheets
- **Environment Grid**: Location design sheets

### 2. Genres (02-genres/)
Pre-configured prompts for different genres:
- Science Fiction
- Fantasy
- Horror/Thriller
- Romance/Drama
- Action/Adventure
- Animation/Cartoon

### 3. Shot Types (03-shot-types/)
Standard cinematography framing:
- Establishing Shot
- Wide Shot
- Medium Shot
- Close-Up
- Extreme Close-Up
- Over-the-Shoulder
- Point of View (POV)

### 4. Lighting (04-lighting/)
Different lighting conditions:
- Golden Hour
- Blue Hour
- Night (Moonlight)
- Night (Artificial)

## Variable Types

Prompts support three variable types:

### String
```json
{
  "type": "string",
  "required": true,
  "description": "Description of the variable"
}
```

### Enum (Dropdown)
```json
{
  "type": "enum",
  "required": true,
  "options": ["option1", "option2", "option3"]
}
```

### Number
```json
{
  "type": "number",
  "required": false,
  "default": 1.0
}
```

## Adding New Prompts

1. Create a new JSON file in the appropriate category folder
2. Follow the template format
3. Add the file path to `index.json` in the appropriate category
4. Update the `totalPrompts` count in `index.json`

Example:

```json
{
  "category": "shot-types",
  "subcategory": "special-shots",
  "id": "shot-dutch-angle",
  "name": "Dutch Angle Shot",
  "description": "Tilted camera angle for unease",
  "tags": ["dutch-angle", "tilted", "unease"],
  "prompt": "Dutch angle shot, {SUBJECT}. Camera tilted {DEGREES} degrees...",
  "variables": {
    "SUBJECT": { "type": "string", "required": true },
    "DEGREES": { 
      "type": "enum",
      "required": true,
      "options": ["15", "30", "45"]
    }
  }
}
```

## Integration with StoryCore Pipeline

The library integrates with the StoryCore-Engine pipeline:

1. **Master Coherence Sheet Generation**: Use coherence grid prompts
2. **Panel Promotion**: Use shot-type and genre prompts
3. **Scene Composition**: Combine multiple prompts with consistent variables
4. **Quality Assurance**: Prompts include quality modifiers for consistency

## Best Practices

1. **Always use Master Coherence prompts first** to establish visual DNA
2. **Keep variables consistent** across related prompts in a project
3. **Use tags for discovery** when you're not sure which prompt to use
4. **Validate before generating** to catch missing required variables
5. **Save successful combinations** as examples for future use

## API Reference

See `PromptLibraryService.ts` for full API documentation.

### Key Methods

- `getCategories()`: Get all categories
- `getPromptsByCategory(id)`: Get prompts in a category
- `search(query)`: Text search across all prompts
- `searchByTags(tags)`: Find prompts by tags
- `loadPrompt(path)`: Load specific prompt template
- `fillPrompt(template, values)`: Generate final prompt
- `validateValues(template, values)`: Validate variable values

## License

Part of the StoryCore-Engine project.
