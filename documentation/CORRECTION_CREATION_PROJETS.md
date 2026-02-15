# Correction des Problèmes de Création de Projets

## Problèmes Identifiés

### 1. Projets ne se créent pas dans `C:\Users\redga\Documents\StoryCore Projects`

**Cause**: Le chemin par défaut n'est pas correctement utilisé lorsque `projectPath` est une chaîne vide.

**Solution Appliquée**: 
- Modifié `useLandingPage.ts` pour ne pas inclure `location` dans les données si le chemin est vide
- Cela permet au backend d'utiliser automatiquement le chemin par défaut

### 2. En mode web, tous les fichiers se comportent comme des téléchargements

**Cause**: C'est le comportement normal du navigateur web. Les navigateurs ne peuvent pas écrire directement sur le système de fichiers pour des raisons de sécurité.

**Comportement Attendu**:
- **Mode Electron**: Les fichiers sont sauvegardés directement sur le disque via l'API Node.js
- **Mode Web**: Les fichiers sont téléchargés (comportement normal et sécurisé)

## Corrections Appliquées

### 1. Fichier: `creative-studio-ui/src/hooks/useLandingPage.ts`

```typescript
// AVANT:
const electronProject = await window.electronAPI.project.create({
  name: projectName, 
  location: projectPath || undefined,
  format: format,
  initialShots: initialShots,
});

// APRÈS:
const createData: any = {
  name: projectName,
  format: format,
  initialShots: initialShots,
};

// Only include location if it's not empty - this ensures default path is used
if (projectPath && projectPath.trim() !== '') {
  createData.location = projectPath;
}

console.log('[useLandingPage] Creating project with data:', createData);
const electronProject = await window.electronAPI.project.create(createData);
```

**Explication**: 
- Si `projectPath` est vide ou contient seulement des espaces, on n'inclut pas la propriété `location`
- Le backend (`ProjectService.ts`) utilise alors automatiquement `getDefaultProjectsDirectory()`
- Cela garantit que les projets sont créés dans `Documents/StoryCore Projects`

## Vérification du Flux Complet

### 1. Frontend (CreateProjectDialog)
- L'utilisateur laisse le champ "Project Location" vide
- `projectPath` est une chaîne vide `""`

### 2. Hook (useLandingPage)
- Détecte que `projectPath` est vide
- Ne passe PAS la propriété `location` à l'API Electron
- Envoie: `{ name: "Mon Projet", format: {...}, initialShots: [...] }`

### 3. IPC Handler (ipcChannels.ts)
```typescript
// Use default projects directory if location not provided
const location = data.location || getDefaultProjectsDirectory();
console.log(`Creating project "${data.name}" at location: ${location}`);
```

### 4. Backend (ProjectService.ts)
```typescript
// Use default projects directory if location not provided
const location = data.location || getDefaultProjectsDirectory();
console.log(`Creating project "${data.name}" at location: ${location}`);
```

### 5. Chemin par Défaut (defaultPaths.ts)
```typescript
export function getDefaultProjectsDirectory(): string {
  const documentsPath = app.getPath('documents');
  const projectsPath = path.join(documentsPath, 'StoryCore Projects');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(projectsPath)) {
    fs.mkdirSync(projectsPath, { recursive: true });
  }
  
  return projectsPath;
}
```

## Tests à Effectuer

### Test 1: Création avec Chemin par Défaut
1. Ouvrir l'application en mode Electron
2. Cliquer sur "Create New Project"
3. Entrer un nom: "Test Project 1"
4. **NE PAS** sélectionner de dossier (laisser vide)
5. Sélectionner un format
6. Cliquer sur "Create Project"

**Résultat Attendu**:
- Le projet est créé dans `C:\Users\redga\Documents\StoryCore Projects\Test Project 1`
- Le dossier contient: `project.json`, `sequences/`, `characters/`, etc.

### Test 2: Création avec Chemin Personnalisé
1. Ouvrir l'application en mode Electron
2. Cliquer sur "Create New Project"
3. Entrer un nom: "Test Project 2"
4. Cliquer sur "Browse" et sélectionner un dossier personnalisé
5. Sélectionner un format
6. Cliquer sur "Create Project"

**Résultat Attendu**:
- Le projet est créé dans le dossier sélectionné
- Le dossier contient la structure complète du projet

### Test 3: Mode Web (Comportement Normal)
1. Ouvrir l'application dans un navigateur web
2. Créer un nouveau projet
3. Observer le comportement

**Résultat Attendu**:
- Les fichiers sont téléchargés (comportement normal du navigateur)
- Un message peut indiquer que l'application fonctionne en mode démo

## Logs de Débogage

Pour vérifier que tout fonctionne, cherchez ces logs dans la console:

```
[useLandingPage] Creating project with data: { name: "...", format: {...}, initialShots: [...] }
Creating project "..." at location: C:\Users\redga\Documents\StoryCore Projects
Created default projects directory: C:\Users\redga\Documents\StoryCore Projects
Project created successfully at: C:\Users\redga\Documents\StoryCore Projects\...
```

## Notes Importantes

### Mode Web vs Mode Electron

**Mode Electron** (Application de bureau):
- Accès complet au système de fichiers
- Sauvegarde directe des fichiers
- Utilisation de l'API Node.js

**Mode Web** (Navigateur):
- Accès limité au système de fichiers (sécurité)
- Téléchargement des fichiers via blobs
- Utilisation de l'API File System Access (Chrome/Edge) ou téléchargements

### Pourquoi les Téléchargements en Mode Web?

C'est une limitation de sécurité des navigateurs web. Les navigateurs ne peuvent pas écrire directement sur le disque sans permission explicite de l'utilisateur. Les options sont:

1. **File System Access API** (Chrome, Edge, Opera)
   - Demande permission à l'utilisateur
   - Permet l'accès à des dossiers spécifiques

2. **Téléchargements** (Tous les navigateurs)
   - Méthode de secours universelle
   - L'utilisateur doit sauvegarder manuellement

3. **IndexedDB** (Stockage navigateur)
   - Stockage local dans le navigateur
   - Limité en taille et persistance

Pour une expérience optimale, utilisez l'application Electron (mode bureau).

## Prochaines Étapes

Si le problème persiste après ces corrections:

1. Vérifier les permissions du dossier `Documents`
2. Vérifier que l'application Electron a les droits d'écriture
3. Consulter les logs de la console pour identifier l'erreur exacte
4. Vérifier que le dossier `StoryCore Projects` est bien créé

## Commandes de Test

```bash
# Vérifier si le dossier existe
dir "C:\Users\redga\Documents\StoryCore Projects"

# Lister les projets créés
dir "C:\Users\redga\Documents\StoryCore Projects" /s

# Vérifier les permissions
icacls "C:\Users\redga\Documents\StoryCore Projects"
```
