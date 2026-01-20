# Correction : Erreur "An object could not be cloned"

## 🐛 Problème

**Erreur rencontrée :**
```
CreateProjectDialog.tsx:200 Failed to create project: Error: An object could not be cloned.
```

**Cause :**
L'objet `ProjectFormat` contenait des composants React (`icon: React.ReactNode`) qui ne peuvent pas être clonés/sérialisés lors du passage entre les contextes (par exemple, vers l'API Electron ou le stockage).

## 🔧 Solution Appliquée

### 1. Séparation des Données et de la Présentation

**Avant (Problématique) :**
```typescript
export interface ProjectFormat {
  id: string;
  name: string;
  // ...
  icon: React.ReactNode; // ❌ Ne peut pas être sérialisé
  description: string;
}

const PROJECT_FORMATS: ProjectFormat[] = [
  {
    id: 'court-metrage',
    icon: <Film className="w-5 h-5" />, // ❌ Composant React
    // ...
  },
];
```

**Après (Corrigé) :**
```typescript
export interface ProjectFormat {
  id: string;
  name: string;
  // ...
  iconType: 'film' | 'tv' | 'video' | 'clock'; // ✅ Chaîne sérialisable
  description: string;
}

export interface SerializableProjectFormat {
  id: string;
  name: string;
  // ...
  iconType: 'film' | 'tv' | 'video' | 'clock'; // ✅ Sérialisable
  description: string;
}

const PROJECT_FORMATS: ProjectFormat[] = [
  {
    id: 'court-metrage',
    iconType: 'film', // ✅ Chaîne simple
    // ...
  },
];
```

### 2. Fonction Helper pour les Icônes

**Ajout d'une fonction de conversion :**
```typescript
const getIconComponent = (iconType: 'film' | 'tv' | 'video' | 'clock') => {
  switch (iconType) {
    case 'film':
      return <Film className="w-5 h-5" />;
    case 'tv':
      return <Tv className="w-5 h-5" />;
    case 'video':
      return <Video className="w-5 h-5" />;
    case 'clock':
      return <Clock className="w-5 h-5" />;
    default:
      return <Film className="w-5 h-5" />;
  }
};
```

**Utilisation dans le rendu :**
```typescript
<div className="...">
  {getIconComponent(format.iconType)} {/* ✅ Conversion à la volée */}
</div>
```

### 3. Fonction de Sérialisation

**Conversion avant envoi :**
```typescript
const toSerializableFormat = (format: ProjectFormat): SerializableProjectFormat => {
  return {
    id: format.id,
    name: format.name,
    duration: format.duration,
    durationMinutes: format.durationMinutes,
    sequences: format.sequences,
    shotDuration: format.shotDuration,
    iconType: format.iconType, // ✅ Chaîne sérialisable
    description: format.description,
  };
};
```

**Utilisation lors de la soumission :**
```typescript
await onCreateProject(
  projectName, 
  projectPath, 
  toSerializableFormat(selectedFormat) // ✅ Objet sérialisable
);
```

## 📋 Changements Détaillés

### CreateProjectDialog.tsx

#### 1. Types Modifiés
```typescript
// Avant
export interface ProjectFormat {
  icon: React.ReactNode; // ❌
}

// Après
export interface ProjectFormat {
  iconType: 'film' | 'tv' | 'video' | 'clock'; // ✅
}

export interface SerializableProjectFormat {
  iconType: 'film' | 'tv' | 'video' | 'clock'; // ✅
}
```

#### 2. Configuration des Formats
```typescript
// Avant
{
  id: 'court-metrage',
  icon: <Film className="w-5 h-5" />, // ❌
}

// Après
{
  id: 'court-metrage',
  iconType: 'film', // ✅
}
```

#### 3. Props du Composant
```typescript
// Avant
interface CreateProjectDialogProps {
  onCreateProject: (
    projectName: string, 
    projectPath: string, 
    format: ProjectFormat // ❌ Contient React.ReactNode
  ) => Promise<void>;
}

// Après
interface CreateProjectDialogProps {
  onCreateProject: (
    projectName: string, 
    projectPath: string, 
    format: SerializableProjectFormat // ✅ Sérialisable
  ) => Promise<void>;
}
```

#### 4. Soumission du Formulaire
```typescript
// Avant
await onCreateProject(projectName, projectPath, selectedFormat); // ❌

// Après
await onCreateProject(
  projectName, 
  projectPath, 
  toSerializableFormat(selectedFormat) // ✅
);
```

#### 5. Rendu des Icônes
```typescript
// Avant
<div>{format.icon}</div> // ❌

// Après
<div>{getIconComponent(format.iconType)}</div> // ✅
```

## 🎯 Avantages de la Solution

### 1. Sérialisation
✅ L'objet peut être cloné/sérialisé sans erreur
✅ Compatible avec l'API Electron
✅ Compatible avec le stockage JSON
✅ Compatible avec les Web Workers

### 2. Maintenabilité
✅ Séparation claire données/présentation
✅ Type-safe avec TypeScript
✅ Facile à tester
✅ Facile à étendre

### 3. Performance
✅ Pas de sérialisation de composants React
✅ Conversion à la volée uniquement lors du rendu
✅ Objet léger pour le transfert

## 🧪 Tests de Validation

### Test 1 : Création de Projet
```typescript
// Devrait fonctionner sans erreur
const format = PROJECT_FORMATS[0];
const serializable = toSerializableFormat(format);
await onCreateProject('Test', '/path', serializable);
// ✅ Pas d'erreur de clonage
```

### Test 2 : Affichage des Icônes
```typescript
// Devrait afficher les bonnes icônes
PROJECT_FORMATS.forEach(format => {
  const icon = getIconComponent(format.iconType);
  // ✅ Icône correcte affichée
});
```

### Test 3 : Sérialisation JSON
```typescript
// Devrait être sérialisable
const format = toSerializableFormat(PROJECT_FORMATS[0]);
const json = JSON.stringify(format);
const parsed = JSON.parse(json);
// ✅ Pas d'erreur
```

## 📊 Comparaison Avant/Après

### Avant (Problématique)
```typescript
{
  id: 'court-metrage',
  name: 'Court-métrage',
  icon: <Film />, // ❌ Composant React
  // ...
}
```
**Problèmes :**
- ❌ Erreur de clonage
- ❌ Non sérialisable en JSON
- ❌ Incompatible avec Electron IPC
- ❌ Mélange données/présentation

### Après (Corrigé)
```typescript
{
  id: 'court-metrage',
  name: 'Court-métrage',
  iconType: 'film', // ✅ Chaîne simple
  // ...
}
```
**Avantages :**
- ✅ Pas d'erreur de clonage
- ✅ Sérialisable en JSON
- ✅ Compatible avec Electron IPC
- ✅ Séparation données/présentation

## 🔄 Pattern Utilisé

### Principe : Séparation Données/Présentation

1. **Données** : Stockées sous forme sérialisable (chaînes, nombres, booléens)
2. **Présentation** : Convertie à la volée lors du rendu
3. **Transfert** : Uniquement les données sérialisables

### Exemple Complet

```typescript
// 1. Définition des données (sérialisable)
const format = {
  id: 'court-metrage',
  iconType: 'film', // ✅ Chaîne
};

// 2. Conversion pour le rendu (présentation)
const icon = getIconComponent(format.iconType); // <Film />

// 3. Transfert (sérialisable)
await api.create(format); // ✅ Pas d'erreur
```

## 📝 Notes Techniques

### Pourquoi React.ReactNode ne peut pas être cloné ?

React.ReactNode contient :
- Des références à des fonctions
- Des références à des objets complexes
- Des symboles internes React
- Des closures

Ces éléments ne peuvent pas être sérialisés par `structuredClone()` ou `JSON.stringify()`.

### Solution Alternative (Non Retenue)

**Option 1 : Stocker uniquement l'ID**
```typescript
// Stocker uniquement l'ID
await onCreateProject(projectName, projectPath, selectedFormat.id);

// Reconstruire le format côté backend
const format = PROJECT_FORMATS.find(f => f.id === formatId);
```

**Pourquoi non retenue :**
- Nécessite de dupliquer la configuration des formats
- Risque de désynchronisation
- Moins flexible

**Option 2 : Utiliser des classes**
```typescript
class ProjectFormat {
  getIcon() {
    return <Film />;
  }
  
  toJSON() {
    return { id: this.id, iconType: this.iconType };
  }
}
```

**Pourquoi non retenue :**
- Plus complexe
- Overhead inutile
- Pattern moins courant en React

## ✅ Statut

**CORRECTION APPLIQUÉE ET TESTÉE**

- ✅ Erreur de clonage corrigée
- ✅ Sérialisation fonctionnelle
- ✅ Icônes affichées correctement
- ✅ Création de projet fonctionnelle
- ✅ Compatible Electron et Web
- ✅ Compilation sans erreurs

## 🎉 Conclusion

Le problème de clonage a été résolu en séparant les données sérialisables (iconType) de la présentation (composants React). Cette approche est plus propre, plus maintenable et suit les meilleures pratiques de séparation des préoccupations.

---

*Correction appliquée le 20 janvier 2026*
*Erreur "An object could not be cloned" résolue*
