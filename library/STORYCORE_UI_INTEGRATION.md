# StoryCore UI Integration Guide

How to integrate the Prompt Library into the creative-studio-ui.

## Integration Steps

### Step 1: Copy Library Files

```bash
# Copy the entire library folder to creative-studio-ui
cp -r library/ creative-studio-ui/src/library/
```

### Step 2: Install in Package

Add to `creative-studio-ui/package.json` if needed:

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

### Step 3: Create Service Hook

Create `creative-studio-ui/src/hooks/usePromptLibrary.ts`:

```typescript
import { useState, useEffect } from 'react';
import { promptLibrary, PromptTemplate } from '../library/PromptLibraryService';

export function usePromptLibrary() {
  const [categories, setCategories] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    promptLibrary.getCategories()
      .then(setCategories)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const loadPrompt = async (path: string) => {
    return promptLibrary.loadPrompt(path);
  };

  const search = async (query: string) => {
    return promptLibrary.search(query);
  };

  const searchByTags = async (tags: string[]) => {
    return promptLibrary.searchByTags(tags);
  };

  const fillPrompt = (template: PromptTemplate, values: Record<string, string>) => {
    return promptLibrary.fillPrompt(template, values);
  };

  return {
    categories,
    loading,
    error,
    loadPrompt,
    search,
    searchByTags,
    fillPrompt
  };
}
```

### Step 4: Integrate with Wizard

Update `creative-studio-ui/src/components/wizard/steps/Step2_GenreStyle.tsx`:

```tsx
import { usePromptLibrary } from '../../../hooks/usePromptLibrary';
import { PromptLibraryBrowser } from '../../../library/PromptLibraryBrowser';

export function Step2_GenreStyle() {
  const { fillPrompt } = usePromptLibrary();
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');

  const handlePromptSelect = (prompt: string) => {
    setSelectedPrompt(prompt);
    // Update wizard state with the prompt
    wizardStore.updateGenrePrompt(prompt);
  };

  return (
    <div className="step-genre-style">
      <h2>Select Genre & Style</h2>
      
      {/* Prompt Library Browser */}
      <PromptLibraryBrowser onSelectPrompt={handlePromptSelect} />
      
      {/* Preview */}
      {selectedPrompt && (
        <div className="prompt-preview">
          <h3>Selected Prompt</h3>
          <pre>{selectedPrompt}</pre>
        </div>
      )}
    </div>
  );
}
```

### Step 5: Add to Asset Integration

Update `creative-studio-ui/src/services/asset-integration/NarrativeService.ts`:

```typescript
import { promptLibrary } from '../../library/PromptLibraryService';

export class NarrativeService {
  async generateScenePrompt(sceneData: any) {
    // Load appropriate template
    const template = await promptLibrary.loadPrompt('02-genres/scifi.json');
    
    // Fill with scene data
    const prompt = promptLibrary.fillPrompt(template, {
      SPECIFIC_ELEMENT: sceneData.element,
      AESTHETIC: sceneData.aesthetic
    });
    
    return prompt;
  }

  async generateCharacterPrompt(characterData: any) {
    const template = await promptLibrary.loadPrompt(
      '01-master-coherence/character-grid.json'
    );
    
    return promptLibrary.fillPrompt(template, {
      CHARACTER_DESCRIPTION: characterData.description,
      AGE: characterData.age,
      GENDER: characterData.gender,
      DISTINCTIVE_FEATURES: characterData.features,
      ART_STYLE: characterData.style
    });
  }
}
```

### Step 6: Add to Grid Editor

Update `creative-studio-ui/src/components/gridEditor/BackendIntegration.tsx`:

```typescript
import { promptLibrary } from '../../library/PromptLibraryService';

export function BackendIntegration() {
  const generateFromPrompt = async (promptPath: string, values: any) => {
    const template = await promptLibrary.loadPrompt(promptPath);
    const prompt = promptLibrary.fillPrompt(template, values);
    
    // Send to ComfyUI
    const result = await comfyUIService.generate(prompt);
    return result;
  };

  return (
    <div className="backend-integration">
      {/* Your existing UI */}
      <button onClick={() => generateFromPrompt('02-genres/scifi.json', {...})}>
        Generate
      </button>
    </div>
  );
}
```

## UI Component Locations

### Where to Add Prompt Library Access

1. **Wizard Step 2 (Genre/Style)**
   - File: `src/components/wizard/steps/Step2_GenreStyle.tsx`
   - Purpose: Let users select genre templates

2. **Wizard Step 3 (World Building)**
   - File: `src/components/wizard/steps/Step3_WorldBuilding.tsx`
   - Purpose: Environment and location prompts

3. **Wizard Step 4 (Character Creation)**
   - File: `src/components/wizard/steps/Step4_CharacterCreation.tsx`
   - Purpose: Character design prompts

4. **Grid Editor**
   - File: `src/components/gridEditor/BackendIntegration.tsx`
   - Purpose: Generate individual panels

5. **Asset Integration**
   - File: `src/components/asset-integration/ProjectTemplate/TemplateEditor.tsx`
   - Purpose: Template-based generation

## Store Integration

Update `creative-studio-ui/src/stores/wizard/wizardStore.ts`:

```typescript
interface WizardState {
  // ... existing state
  selectedPrompts: {
    genre?: string;
    character?: string;
    environment?: string;
    lighting?: string;
  };
  promptValues: Record<string, Record<string, string>>;
}

const wizardStore = create<WizardState>((set) => ({
  // ... existing state
  selectedPrompts: {},
  promptValues: {},
  
  updatePrompt: (category: string, prompt: string) => {
    set((state) => ({
      selectedPrompts: {
        ...state.selectedPrompts,
        [category]: prompt
      }
    }));
  },
  
  updatePromptValues: (promptId: string, values: Record<string, string>) => {
    set((state) => ({
      promptValues: {
        ...state.promptValues,
        [promptId]: values
      }
    }));
  }
}));
```

## Styling Integration

Add to `creative-studio-ui/src/index.css`:

```css
@import './library/PromptLibraryBrowser.css';

/* Override library styles to match StoryCore theme */
.prompt-library-browser {
  --bg-primary: var(--storycore-bg-primary);
  --bg-secondary: var(--storycore-bg-secondary);
  --text-primary: var(--storycore-text-primary);
  --accent-color: var(--storycore-accent);
}
```

## API Integration

Create `creative-studio-ui/src/services/PromptGenerationService.ts`:

```typescript
import { promptLibrary } from '../library/PromptLibraryService';
import { comfyUIService } from './comfyUIService';

export class PromptGenerationService {
  /**
   * Generate Master Coherence Sheet
   */
  async generateMasterCoherence(projectData: any) {
    const template = await promptLibrary.loadPrompt(
      '01-master-coherence/coherence-grid.json'
    );
    
    const prompt = promptLibrary.fillPrompt(template, {
      PROJECT_NAME: projectData.name,
      GENRE_STYLE: projectData.genre,
      PRIMARY_COLORS: projectData.colors,
      LIGHTING_TYPE: projectData.lighting
    });
    
    return comfyUIService.generateGrid(prompt);
  }

  /**
   * Generate scene with specific shot type
   */
  async generateScene(sceneData: any) {
    // Load multiple templates
    const genreTemplate = await promptLibrary.loadPrompt(
      `02-genres/${sceneData.genre}.json`
    );
    const shotTemplate = await promptLibrary.loadPrompt(
      `03-shot-types/${sceneData.shotType}.json`
    );
    const lightingTemplate = await promptLibrary.loadPrompt(
      `04-lighting/${sceneData.lighting}.json`
    );
    
    // Generate each part
    const genrePrompt = promptLibrary.fillPrompt(genreTemplate, sceneData.genreValues);
    const shotPrompt = promptLibrary.fillPrompt(shotTemplate, sceneData.shotValues);
    const lightingPrompt = promptLibrary.fillPrompt(lightingTemplate, sceneData.lightingValues);
    
    // Combine
    const finalPrompt = `${shotPrompt}. ${genrePrompt}. ${lightingPrompt}`;
    
    return comfyUIService.generate(finalPrompt);
  }

  /**
   * Batch generate storyboard
   */
  async generateStoryboard(scenes: any[]) {
    const results = [];
    
    for (const scene of scenes) {
      const result = await this.generateScene(scene);
      results.push(result);
    }
    
    return results;
  }
}

export const promptGenerationService = new PromptGenerationService();
```

## Testing

Create `creative-studio-ui/src/library/__tests__/PromptLibraryService.test.ts`:

```typescript
import { promptLibrary } from '../PromptLibraryService';

describe('PromptLibraryService', () => {
  it('should load categories', async () => {
    const categories = await promptLibrary.getCategories();
    expect(categories).toBeDefined();
    expect(Object.keys(categories).length).toBeGreaterThan(0);
  });

  it('should load a prompt', async () => {
    const template = await promptLibrary.loadPrompt('02-genres/scifi.json');
    expect(template).toBeDefined();
    expect(template.prompt).toBeDefined();
  });

  it('should fill a prompt', async () => {
    const template = await promptLibrary.loadPrompt('02-genres/scifi.json');
    const filled = promptLibrary.fillPrompt(template, {
      SPECIFIC_ELEMENT: 'test',
      AESTHETIC: 'cyberpunk'
    });
    expect(filled).toContain('test');
    expect(filled).toContain('cyberpunk');
  });

  it('should validate values', async () => {
    const template = await promptLibrary.loadPrompt('02-genres/scifi.json');
    const validation = promptLibrary.validateValues(template, {
      SPECIFIC_ELEMENT: 'test'
      // Missing AESTHETIC
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});
```

## Example: Complete Wizard Integration

```tsx
// src/components/wizard/PromptWizard.tsx
import { useState } from 'react';
import { usePromptLibrary } from '../../hooks/usePromptLibrary';
import { PromptLibraryBrowser } from '../../library/PromptLibraryBrowser';
import { promptGenerationService } from '../../services/PromptGenerationService';

export function PromptWizard() {
  const { categories, loading } = usePromptLibrary();
  const [step, setStep] = useState(1);
  const [projectData, setProjectData] = useState({
    name: '',
    genre: '',
    colors: '',
    lighting: ''
  });

  const handleGenerateMasterCoherence = async () => {
    const result = await promptGenerationService.generateMasterCoherence(projectData);
    console.log('Generated:', result);
  };

  if (loading) return <div>Loading library...</div>;

  return (
    <div className="prompt-wizard">
      {step === 1 && (
        <div>
          <h2>Step 1: Project Setup</h2>
          <input
            placeholder="Project Name"
            value={projectData.name}
            onChange={(e) => setProjectData({...projectData, name: e.target.value})}
          />
          <button onClick={() => setStep(2)}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Step 2: Select Genre & Style</h2>
          <PromptLibraryBrowser
            onSelectPrompt={(prompt) => {
              setProjectData({...projectData, genre: prompt});
              setStep(3);
            }}
          />
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Step 3: Generate Master Coherence</h2>
          <button onClick={handleGenerateMasterCoherence}>
            Generate
          </button>
        </div>
      )}
    </div>
  );
}
```

## Deployment Checklist

- [ ] Copy library files to creative-studio-ui/src/
- [ ] Create usePromptLibrary hook
- [ ] Integrate with wizard steps
- [ ] Add to asset integration services
- [ ] Update stores with prompt state
- [ ] Add styling overrides
- [ ] Create PromptGenerationService
- [ ] Write tests
- [ ] Update documentation
- [ ] Test with ComfyUI backend

## Performance Tips

1. **Lazy Load**: Only load prompts when needed
2. **Cache**: Service caches loaded prompts
3. **Debounce**: Debounce search input
4. **Virtual Scroll**: For large prompt lists
5. **Code Split**: Lazy load the browser component

## Troubleshooting

### Issue: Prompts not loading
- Check file paths in index.json
- Verify JSON syntax
- Check network tab for 404s

### Issue: Variables not validating
- Check variable definitions
- Ensure required fields are marked
- Verify enum options

### Issue: Styling conflicts
- Use CSS variables for theming
- Add specificity to overrides
- Check for conflicting class names

## Next Steps

1. Integrate with Step 2 (Genre/Style)
2. Add to Character Creation
3. Connect to ComfyUI backend
4. Add prompt history
5. Implement favorites
6. Add custom prompt creation

---

For more details, see the main [README.md](./README.md) and [QUICKSTART.md](./QUICKSTART.md).
