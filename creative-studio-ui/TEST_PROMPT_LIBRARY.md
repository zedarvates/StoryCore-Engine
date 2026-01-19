# 🧪 Test Prompt Library - Quick Guide

## How to Test the Integration

### Option 1: Test the Example Component (Recommended)

1. **Add route to the example** (if not already done):

```typescript
// In your router configuration
import { PromptLibraryExample } from './examples/PromptLibraryExample';

// Add route
{
  path: '/prompt-library-test',
  element: <PromptLibraryExample />
}
```

2. **Start the dev server**:
```bash
cd creative-studio-ui
npm run dev
```

3. **Navigate to the test page**:
```
http://localhost:5173/prompt-library-test
```

4. **Test features**:
- Click "Browse Prompt Library" to open the modal
- Click "Generate Master Coherence" to see a generated prompt
- Click "Generate Character" to see character prompt
- Click "Generate Environment" to see environment prompt
- Copy prompts to clipboard

### Option 2: Test in Console

1. **Open browser console** (F12)

2. **Test the service**:
```javascript
// Import the service
import { promptGenerationService } from './services/PromptGenerationService';

// Test Master Coherence generation
const prompt = await promptGenerationService.generateMasterCoherence({
  name: 'Test Project',
  genre: 'sci-fi',
  colors: 'blue, purple',
  lighting: 'neon'
});
console.log(prompt);

// Test available genres
const genres = await promptGenerationService.getAvailableGenres();
console.log('Available genres:', genres);
```

3. **Test the library directly**:
```javascript
import { promptLibrary } from './library/PromptLibraryService';

// Get categories
const categories = await promptLibrary.getCategories();
console.log('Categories:', categories);

// Load a prompt
const template = await promptLibrary.loadPrompt('02-genres/scifi.json');
console.log('Template:', template);

// Fill the prompt
const filled = promptLibrary.fillPrompt(template, {
  SPECIFIC_ELEMENT: 'hovering vehicle',
  AESTHETIC: 'cyberpunk'
});
console.log('Filled prompt:', filled);
```

### Option 3: Test in Wizard Step

1. **Temporarily add to Step2_GenreStyle**:

```typescript
// At the top of Step2_GenreStyle.tsx
import { PromptLibraryModal, usePromptLibraryModal } from '../PromptLibraryModal';
import { BookOpen } from 'lucide-react';

export function Step2_GenreStyle({ data, onUpdate, errors }: Step2_GenreStyleProps) {
  const promptModal = usePromptLibraryModal();
  
  const handlePromptSelect = (prompt: string) => {
    console.log('Selected prompt:', prompt);
    alert(`Selected prompt:\n\n${prompt}`);
  };

  return (
    <WizardFormLayout title="Genre & Style">
      {/* Add test button at the top */}
      <div className="mb-4">
        <button
          onClick={promptModal.open}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <BookOpen className="h-4 w-4" />
          Test Prompt Library
        </button>
      </div>

      {/* ... rest of the component ... */}

      {/* Add modal at the end */}
      <PromptLibraryModal
        isOpen={promptModal.isOpen}
        onClose={promptModal.close}
        onSelectPrompt={handlePromptSelect}
        title="Test Prompt Library"
      />
    </WizardFormLayout>
  );
}
```

2. **Run the wizard**:
```bash
npm run dev
```

3. **Navigate to Step 2** and click "Test Prompt Library"

## 🎯 What to Test

### 1. Library Loading
- [ ] Categories load correctly
- [ ] No errors in console
- [ ] Loading state shows briefly

### 2. Browsing
- [ ] Can select categories
- [ ] Prompts list updates
- [ ] Can select individual prompts

### 3. Search
- [ ] Text search works
- [ ] Results are relevant
- [ ] Can clear search

### 4. Variable Form
- [ ] Form fields appear
- [ ] Can fill in values
- [ ] Validation works
- [ ] Required fields marked

### 5. Generation
- [ ] "Generate Prompt" button works
- [ ] Preview shows filled prompt
- [ ] Copy to clipboard works

### 6. Service Methods
- [ ] generateMasterCoherence() works
- [ ] generateCharacterSheet() works
- [ ] generateEnvironmentSheet() works
- [ ] getAvailableGenres() returns list
- [ ] getAvailableShotTypes() returns list

### 7. Modal
- [ ] Opens correctly
- [ ] Closes on backdrop click
- [ ] Closes on X button
- [ ] Closes after selection

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module './library/PromptLibraryService'"
**Solution**: Make sure the library folder was copied correctly:
```bash
# Check if files exist
ls creative-studio-ui/src/library/

# If not, copy again
xcopy /E /I /Y library creative-studio-ui\src\library
```

### Issue: "Failed to fetch index.json"
**Solution**: The library files need to be served. Make sure:
1. Files are in `src/library/`
2. Dev server is running
3. Check browser network tab for 404 errors

### Issue: Styling looks wrong
**Solution**: Make sure CSS is imported:
```typescript
import '../library/PromptLibraryBrowser.css';
```

### Issue: TypeScript errors
**Solution**: Check that all types are exported:
```typescript
import type { PromptTemplate } from '../library/PromptLibraryService';
```

## ✅ Expected Results

### When browsing the library:
- Should see 5 categories
- Should see 24 total prompts
- Should be able to search and filter
- Should see variable forms for each prompt

### When generating prompts:
- Master Coherence: ~200-300 words
- Character Sheet: ~150-200 words
- Environment Sheet: ~150-200 words
- All should be coherent and professional

### Example Master Coherence Output:
```
A 3x3 grid layout showing consistent visual DNA for Neon Dreams. 
Style: cyberpunk sci-fi. Color palette: electric blue, neon purple, 
chrome silver. Lighting: neon volumetric lighting. Composition: 
professional cinematic framing. Each panel shows the same scene from 
slightly different angles maintaining perfect style consistency, color 
harmony, and atmospheric coherence. High quality, sharp details, 
4K resolution.
```

## 📊 Performance Checks

- [ ] Library loads in < 1 second
- [ ] Search is instant
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] Responsive on mobile

## 🎉 Success Criteria

The integration is successful if:
1. ✅ All 24 prompts are accessible
2. ✅ Search and filtering work
3. ✅ Variable forms appear correctly
4. ✅ Generated prompts are coherent
5. ✅ Copy to clipboard works
6. ✅ No console errors
7. ✅ Modal opens and closes smoothly
8. ✅ Service methods work correctly

## 📝 Test Report Template

```markdown
# Prompt Library Test Report

**Date**: [Date]
**Tester**: [Name]
**Version**: 1.0.0

## Test Results

### Library Loading
- [ ] Pass / [ ] Fail
- Notes: 

### Browsing
- [ ] Pass / [ ] Fail
- Notes:

### Search
- [ ] Pass / [ ] Fail
- Notes:

### Generation
- [ ] Pass / [ ] Fail
- Notes:

### Modal
- [ ] Pass / [ ] Fail
- Notes:

## Issues Found
1. 
2. 
3. 

## Overall Status
- [ ] Ready for production
- [ ] Needs fixes
- [ ] Blocked

## Next Steps
1. 
2. 
3. 
```

## 🚀 Next Steps After Testing

Once testing is complete:
1. Remove test buttons from wizard steps
2. Integrate properly into Step 2, 3, and 4
3. Connect to ComfyUI backend
4. Test with real image generation
5. Add to production build

---

**Happy Testing! 🎉**

For issues, check:
- `library/README.md` - Full documentation
- `library/QUICKSTART.md` - Quick start guide
- `creative-studio-ui/PROMPT_LIBRARY_INTEGRATION_COMPLETE.md` - Integration guide
