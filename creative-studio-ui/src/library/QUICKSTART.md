# Quick Start Guide - Prompt Library

Get started with the StoryCore Prompt Library in 5 minutes.

## Installation

1. Copy the `library/` folder to your project
2. Import the service in your code

## Basic Usage

### 1. Browse Available Prompts

```typescript
import { promptLibrary } from './library/PromptLibraryService';

// Get all categories
const categories = await promptLibrary.getCategories();
console.log(categories);

// Output:
// {
//   "master-coherence": { name: "Master Coherence Sheets", ... },
//   "genres": { name: "Genre Templates", ... },
//   ...
// }
```

### 2. Load a Prompt Template

```typescript
// Load a sci-fi genre prompt
const scifiTemplate = await promptLibrary.loadPrompt('02-genres/scifi.json');

console.log(scifiTemplate.name);        // "Science Fiction Scene"
console.log(scifiTemplate.variables);   // { SPECIFIC_ELEMENT: {...}, ... }
```

### 3. Fill the Template

```typescript
// Provide values for variables
const values = {
  SPECIFIC_ELEMENT: 'hovering vehicle in neon city',
  AESTHETIC: 'cyberpunk'
};

// Generate the final prompt
const finalPrompt = promptLibrary.fillPrompt(scifiTemplate, values);

console.log(finalPrompt);
// "Sci-fi scene, hovering vehicle in neon city. Futuristic technology, 
//  neon lighting, cyberpunk aesthetic. Color palette: electric blues..."
```

### 4. Use in Your Pipeline

```typescript
// Send to ComfyUI or your image generation backend
async function generateImage(prompt: string) {
  const response = await fetch('http://localhost:8188/prompt', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  });
  return response.json();
}

const result = await generateImage(finalPrompt);
```

## React Component Usage

```tsx
import { PromptLibraryBrowser } from './library/PromptLibraryBrowser';

function App() {
  const handlePromptGenerated = (prompt: string) => {
    console.log('User generated:', prompt);
    // Use the prompt in your application
  };

  return (
    <div>
      <h1>Prompt Library</h1>
      <PromptLibraryBrowser onSelectPrompt={handlePromptGenerated} />
    </div>
  );
}
```

## Common Workflows

### Workflow 1: Create Master Coherence Sheet

```typescript
// 1. Load the coherence grid template
const template = await promptLibrary.loadPrompt(
  '01-master-coherence/coherence-grid.json'
);

// 2. Define your project's visual DNA
const values = {
  PROJECT_NAME: 'Neon Dreams',
  GENRE_STYLE: 'cyberpunk sci-fi',
  PRIMARY_COLORS: 'electric blue, neon purple, chrome silver',
  LIGHTING_TYPE: 'neon volumetric lighting'
};

// 3. Generate the prompt
const prompt = promptLibrary.fillPrompt(template, values);

// 4. Generate the 3x3 grid
const masterGrid = await generateImage(prompt);
```

### Workflow 2: Generate Scene with Specific Shot

```typescript
// 1. Load genre and shot type
const genreTemplate = await promptLibrary.loadPrompt('02-genres/scifi.json');
const shotTemplate = await promptLibrary.loadPrompt('03-shot-types/close-up.json');

// 2. Combine them
const genrePrompt = promptLibrary.fillPrompt(genreTemplate, {
  SPECIFIC_ELEMENT: 'character in cockpit',
  AESTHETIC: 'cyberpunk'
});

const shotPrompt = promptLibrary.fillPrompt(shotTemplate, {
  SUBJECT: 'pilot'
});

// 3. Merge prompts
const finalPrompt = `${shotPrompt}. ${genrePrompt}`;

// 4. Generate
const image = await generateImage(finalPrompt);
```

### Workflow 3: Search and Discover

```typescript
// Search by text
const characterPrompts = await promptLibrary.search('character');

// Search by tags
const heroPrompts = await promptLibrary.searchByTags(['hero', 'protagonist']);

// Browse category
const allShotTypes = await promptLibrary.getPromptsByCategory('shot-types');
```

## Validation

Always validate before generating:

```typescript
const template = await promptLibrary.loadPrompt('02-genres/scifi.json');
const values = {
  SPECIFIC_ELEMENT: 'hovering vehicle',
  // AESTHETIC is missing!
};

const validation = promptLibrary.validateValues(template, values);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  // ["AESTHETIC is required"]
} else {
  const prompt = promptLibrary.fillPrompt(template, values);
  await generateImage(prompt);
}
```

## Tips

1. **Start with Master Coherence**: Always create your 3x3 grid first
2. **Keep variables consistent**: Use the same values across related prompts
3. **Use examples**: Most templates include example values
4. **Combine prompts**: Mix genre + shot type + lighting for rich results
5. **Save successful combinations**: Document what works for your project

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Explore [MIGRATION.md](./MIGRATION.md) if migrating from old structure
- Check out all available prompts in the `library/` folders
- Customize prompts for your specific needs

## Support

For issues or questions, refer to the main StoryCore-Engine documentation.
