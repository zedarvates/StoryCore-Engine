# Migration Guide: Bibliothèque → Library

This guide explains how to migrate from the old French "Bibliothèque" structure to the new English "library" structure.

## What Changed

### Structure
- **Old**: `Bibliothèque/` with nested French folders
- **New**: `library/` with numbered category folders and JSON files

### Format
- **Old**: Folder-based organization
- **New**: JSON-based with programmatic access

### Language
- **Old**: French prompts and structure
- **New**: English prompts and structure (international standard)

## Migration Steps

### 1. Content Mapping

Old structure → New structure:

```
Bibliothèque/
├── Grille de Cohérence Visuelle/     → library/01-master-coherence/coherence-grid.json
├── Grille de Personnage/             → library/01-master-coherence/character-grid.json
├── Grille d'Environnement/           → library/01-master-coherence/environment-grid.json
└── ASSETS PAR GENRE/
    ├── Science-Fiction/              → library/02-genres/scifi.json
    ├── Fantasy Médiéval/             → library/02-genres/fantasy.json
    ├── Horreur -Thriller/            → library/02-genres/horror.json
    ├── Romance -Drame/               → library/02-genres/romance.json
    ├── Action Aventure/              → library/02-genres/action.json
    ├── Animation -Cartoon/           → library/02-genres/animation.json
    ├── Personnage Héroïque/          → library/03-scene-elements/hero-character.json
    ├── Personnage Antagoniste/       → library/03-scene-elements/villain-character.json
    ├── Personnage de Soutien/        → library/03-scene-elements/support-character.json
    ├── Environnements/               → library/03-scene-elements/environments/
    ├── Objets et Props/              → library/03-scene-elements/props/
    ├── ASSETS PAR TYPE DE PLAN/      → library/03-shot-types/
    └── ASSETS PAR MOMENT NARRATIF/   → library/05-narrative-moments/
```

### 2. For Developers

If you have code referencing the old structure:

**Before:**
```typescript
// Manual file reading
const promptFile = await readFile('Bibliothèque/Science-Fiction/prompt.txt');
```

**After:**
```typescript
// Use the service
import { promptLibrary } from './library/PromptLibraryService';
const template = await promptLibrary.loadPrompt('02-genres/scifi.json');
const prompt = promptLibrary.fillPrompt(template, { 
  SPECIFIC_ELEMENT: 'hovering vehicle' 
});
```

### 3. For UI Integration

**Before:**
```tsx
// Manual prompt management
const [prompt, setPrompt] = useState('');
```

**After:**
```tsx
// Use the browser component
import { PromptLibraryBrowser } from './library/PromptLibraryBrowser';

<PromptLibraryBrowser onSelectPrompt={setPrompt} />
```

## Benefits of New Structure

1. **Programmatic Access**: Easy to query and filter prompts
2. **Type Safety**: TypeScript interfaces for all structures
3. **Validation**: Built-in variable validation
4. **Searchable**: Full-text and tag-based search
5. **Extensible**: Easy to add new prompts
6. **International**: English as standard language
7. **Version Control**: JSON files are git-friendly
8. **Documentation**: Each prompt is self-documenting

## Keeping Both Structures

You can keep both during transition:

```
project/
├── Bibliothèque/          # Old structure (deprecated)
└── library/               # New structure (active)
```

Update your code to use `library/` and mark `Bibliothèque/` as deprecated.

## Timeline

1. **Phase 1** (Current): Both structures exist
2. **Phase 2** (Next release): Library is primary, Bibliothèque deprecated
3. **Phase 3** (Future): Remove Bibliothèque folder

## Questions?

See `library/README.md` for full documentation on the new structure.
