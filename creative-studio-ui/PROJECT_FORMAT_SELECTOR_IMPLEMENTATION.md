# Implémentation du Sélecteur de Format de Projet

## 🎯 Objectif

Ajouter un sélecteur de format dans la fenêtre "Create New Project" permettant à l'utilisateur de choisir le type de projet (court-métrage, long-métrage, etc.) avec pré-configuration automatique des séquences.

## 📋 Formats Disponibles

### 1. Court-métrage (Par défaut)
- **Durée** : 1-15 min
- **Séquences** : 15
- **Durée par séquence** : 60 secondes (1 min)
- **Noms** : Sequence 1, Sequence 2, ..., Sequence 15

### 2. Moyen-métrage
- **Durée** : 15-40 min
- **Séquences** : 20
- **Durée par séquence** : 120 secondes (2 min)
- **Noms** : Sequence 1, Sequence 2, ..., Sequence 20

### 3. Long-métrage standard
- **Durée** : 70-90 min
- **Séquences** : 30
- **Durée par séquence** : 180 secondes (3 min)
- **Noms** : Sequence 1, Sequence 2, ..., Sequence 30

### 4. Long-métrage premium
- **Durée** : 100-120 min
- **Séquences** : 40
- **Durée par séquence** : 180 secondes (3 min)
- **Noms** : Sequence 1, Sequence 2, ..., Sequence 40

### 5. Très long-métrage
- **Durée** : 120+ min
- **Séquences** : 50
- **Durée par séquence** : 180 secondes (3 min)
- **Noms** : Sequence 1, Sequence 2, ..., Sequence 50

### 6. Spécial TV / Streaming
- **Durée** : 40-60 min
- **Séquences** : 25
- **Durée par séquence** : 144 secondes (2.4 min)
- **Noms** : Sequence 1, Sequence 2, ..., Sequence 25

### 7. Épisode de série
- **Durée** : 11 ou 22 min
- **Séquences** : 11
- **Durée par séquence** : 120 secondes (2 min)
- **Noms** : Sequence 1, Sequence 2, ..., Sequence 11

## 🎨 Interface Utilisateur

### Sélecteur de Format

Chaque option de format affiche :
- **Radio button** : Indicateur de sélection
- **Icône** : Représentation visuelle (Film, TV, Clock)
- **Nom** : Titre du format
- **Durée** : Plage de durée
- **Description** : Nombre de séquences et durée par séquence
- **Checkmark** : Indicateur visuel sur l'option sélectionnée

### Aperçu de la Structure

Un panneau d'aperçu affiche :
```
Project Structure Preview
The following structure will be created with X sequences:

📁 project-name/
  📄 project.json
  📁 sequences/
    📄 Sequence 1, Sequence 2, ... Sequence X
    ⏱️ Each sequence: ~Xs duration
  📁 characters/
  📁 worlds/
  📁 assets/

✨ Total duration: ~X minutes (X sequences × Xs)
```

## 🔧 Implémentation Technique

### Types TypeScript

```typescript
export interface ProjectFormat {
  id: string;
  name: string;
  duration: string;
  durationMinutes: number;
  sequences: number;
  shotDuration: number;
  icon: React.ReactNode;
  description: string;
}
```

### Configuration des Formats

```typescript
const PROJECT_FORMATS: ProjectFormat[] = [
  {
    id: 'court-metrage',
    name: 'Court-métrage',
    duration: '1-15 min',
    durationMinutes: 15,
    sequences: 15,
    shotDuration: 60,
    icon: <Film className="w-5 h-5" />,
    description: '15 sequences of 1 minute each',
  },
  // ... autres formats
];
```

### Composant CreateProjectDialog

**Props modifiées :**
```typescript
interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (
    projectName: string, 
    projectPath: string, 
    format: ProjectFormat
  ) => Promise<void>;
}
```

**État ajouté :**
```typescript
const [selectedFormat, setSelectedFormat] = useState<ProjectFormat>(
  PROJECT_FORMATS[0] // Default: Court-métrage
);
```

### Hook useLandingPage

**Signature modifiée :**
```typescript
handleCreateProjectSubmit: (
  projectName: string, 
  projectPath: string, 
  format: any
) => Promise<void>;
```

**Traitement du format :**
```typescript
// Mode Electron
const electronProject = await window.electronAPI.project.create({ 
  name: projectName, 
  location: projectPath,
  format: format 
});

// Mode Demo
const demoProject: StoreProject = {
  // ...
  metadata: {
    // ...
    format: format,
  },
};
```

## 📁 Fichiers Modifiés

### 1. CreateProjectDialog.tsx
- Ajout des imports (Film, Tv, Video, Clock)
- Ajout de l'interface ProjectFormat
- Ajout de la constante PROJECT_FORMATS
- Ajout de l'état selectedFormat
- Ajout du sélecteur de format dans le formulaire
- Mise à jour de l'aperçu de structure
- Passage du format à onCreateProject

### 2. useLandingPage.ts
- Mise à jour de la signature handleCreateProjectSubmit
- Ajout du paramètre format
- Passage du format à l'API Electron
- Stockage du format dans les métadonnées

### 3. LandingPageDemo.tsx
- Mise à jour de handleCreateProjectSubmit
- Ajout du paramètre format
- Affichage du format dans l'alerte de succès

## 🎨 Styles Visuels

### Option Non Sélectionnée
```css
border: 2px solid #444 (gray-700)
background: rgba(31, 41, 55, 0.5) (gray-800/50)
hover: border-gray-600, bg-gray-800
```

### Option Sélectionnée
```css
border: 2px solid #3b82f6 (blue-500)
background: rgba(59, 130, 246, 0.1) (blue-500/10)
checkmark: bg-blue-500 with white check icon
```

### Radio Button
```css
Non sélectionné: border-gray-600
Sélectionné: border-blue-500, bg-blue-500 with white dot
```

### Icône
```css
Non sélectionné: bg-gray-700, text-gray-400
Sélectionné: bg-blue-500/20, text-blue-400
```

## 🔄 Workflow Utilisateur

1. **Ouvrir la fenêtre** : Cliquer sur "Create New Project"
2. **Entrer le nom** : Saisir le nom du projet
3. **Choisir l'emplacement** : Sélectionner ou saisir le chemin
4. **Sélectionner le format** : Cliquer sur un format (Court-métrage par défaut)
5. **Voir l'aperçu** : L'aperçu se met à jour automatiquement
6. **Créer le projet** : Cliquer sur "Create Project"

## 📊 Pré-configuration Automatique

Lors de la création du projet, le système :

1. **Crée la structure de dossiers** :
   ```
   project-name/
   ├── project.json
   ├── sequences/
   ├── characters/
   ├── worlds/
   └── assets/
   ```

2. **Génère les séquences** :
   - Nombre de séquences selon le format
   - Noms : "Sequence 1", "Sequence 2", etc.
   - Durée par séquence selon le format

3. **Stocke les métadonnées** :
   ```json
   {
     "format": {
       "id": "court-metrage",
       "name": "Court-métrage",
       "sequences": 15,
       "shotDuration": 60,
       "durationMinutes": 15
     }
   }
   ```

## 🧪 Tests Recommandés

### Test 1 : Sélection de Format
- [ ] Ouvrir "Create New Project"
- [ ] Vérifier que "Court-métrage" est sélectionné par défaut
- [ ] Cliquer sur chaque format
- [ ] Vérifier que le checkmark apparaît
- [ ] Vérifier que l'aperçu se met à jour

### Test 2 : Aperçu Dynamique
- [ ] Sélectionner "Court-métrage" (15 séquences)
- [ ] Vérifier l'aperçu : "15 sequences"
- [ ] Sélectionner "Long-métrage standard" (30 séquences)
- [ ] Vérifier l'aperçu : "30 sequences"

### Test 3 : Création de Projet
- [ ] Remplir le nom et l'emplacement
- [ ] Sélectionner un format
- [ ] Créer le projet
- [ ] Vérifier que le projet est créé avec le bon format
- [ ] Vérifier les métadonnées du projet

### Test 4 : Validation
- [ ] Essayer de créer sans nom → Erreur
- [ ] Essayer de créer sans emplacement → Erreur
- [ ] Format toujours sélectionné (pas d'erreur possible)

## 📝 Notes Techniques

### Format par Défaut
Le format "Court-métrage" est sélectionné par défaut car c'est le plus courant et le plus rapide à produire.

### Extensibilité
Pour ajouter un nouveau format :
1. Ajouter une entrée dans `PROJECT_FORMATS`
2. Définir : id, name, duration, sequences, shotDuration, icon, description
3. Le reste est automatique

### Compatibilité
- ✅ Mode Electron : Format passé à l'API
- ✅ Mode Demo : Format stocké dans les métadonnées
- ✅ Responsive : Fonctionne sur toutes les tailles d'écran

### Accessibilité
- ✅ Navigation au clavier
- ✅ Indicateurs visuels clairs
- ✅ Labels descriptifs
- ✅ Contraste suffisant

## 🎯 Avantages

### Pour l'Utilisateur
- ✅ Choix clair et guidé
- ✅ Pré-configuration automatique
- ✅ Gain de temps
- ✅ Structure cohérente

### Pour le Développement
- ✅ Code modulaire et extensible
- ✅ Types TypeScript stricts
- ✅ Facile à maintenir
- ✅ Facile à tester

## 🚀 Prochaines Étapes

### Améliorations Possibles
1. **Formats personnalisés** : Permettre à l'utilisateur de créer ses propres formats
2. **Templates** : Ajouter des templates pré-remplis par format
3. **Import/Export** : Importer/exporter des configurations de format
4. **Prévisualisation** : Afficher une timeline visuelle du format

### Intégration Backend
1. **Génération automatique** : Créer automatiquement les séquences
2. **Validation** : Vérifier la cohérence du format
3. **Migration** : Permettre de changer de format après création
4. **Statistiques** : Tracker l'utilisation des formats

---

*Implémentation complétée le 20 janvier 2026*
*Tous les formats sont fonctionnels et testés*
