# 🔍 Analyse Profonde des Problèmes de Persistance et APIs - StoryCore

## 📋 Vue d'ensemble des problèmes identifiés

### Problèmes principaux signalés :
1. **APIs défaillantes** : Enregistrement/modification/rafraîchissement des données fichiers
2. **Assistants de completion** : Ne fonctionnent pas pour populariser les valeurs des pages
3. **Persistance des données** : Problèmes de synchronisation entre store, localStorage et fichiers

---

## 🏗️ Architecture actuelle analysée

### 1. **Système de stockage multi-couches**

#### **Couche 1 : Zustand Store** (`src/store/index.ts`)
```typescript
interface StoreActions {
  addWorld: (world: World) => void;
  updateWorld: (id: string, updates: Partial<World>) => void;
  // ... autres actions
}
```

**Fonctionnement actuel :**
- ✅ Sauvegarde dans `localStorage` avec clé `project-{nomProjet}-worlds`
- ✅ Événements personnalisés (`WizardEventType.WORLD_CREATED`)
- ❌ **PROBLÈME** : Pas de sauvegarde automatique dans les fichiers JSON du projet

#### **Couche 2 : APIs Electron** (`window.electronAPI`)
```typescript
// Exemple d'utilisation dans les wizards
if (window.electronAPI?.project?.updateMetadata) {
  await window.electronAPI.project.updateMetadata(projectPath, { globalResume: globalResume });
}
```

**Problèmes identifiés :**
- ❌ APIs non fiables dans certains environnements
- ❌ Pas de fallback quand Electron n'est pas disponible
- ❌ Gestion d'erreur insuffisante

#### **Couche 3 : Fichiers JSON du projet**
**Structure attendue :**
```
project-folder/
├── project.json          # Métadonnées du projet
├── sequences/            # Dossiers des séquences
│   └── sequence_001.json
├── shots/               # Plans individuels
│   └── shot_001.json
└── assets/              # Ressources
```

**État actuel :**
- ❌ Création de fichiers JSON non systématique
- ❌ Synchronisation entre store et fichiers défaillante

---

## 🔧 Analyse détaillée des composants défaillants

### 2. **Système de Wizards et persistance**

#### **WorldWizard** (`src/components/wizard/world/WorldWizard.tsx`)
```typescript
const handleSubmit = useCallback(async (data: Partial<World>) => {
  // Add to store (which also persists to localStorage and updates project)
  addWorld(world); // ✅ Sauvegarde store

  // ❌ MANQUE : Sauvegarde fichier JSON du projet
  // ❌ MANQUE : Vérification de la persistance
}, [onComplete, addWorld]);
```

**Problèmes :**
1. **Sauvegarde incomplète** : Store uniquement, pas de fichier projet
2. **Pas de vérification** de succès de sauvegarde
3. **Pas de rollback** en cas d'échec

#### **Store Zustand** - Fonction `addWorld`
```typescript
addWorld: (world) =>
  set((state) => {
    const newWorlds = [...state.worlds, world];

    // ✅ Persist to localStorage
    if (updatedProject) {
      localStorage.setItem(`project-${updatedProject.project_name}-worlds`, JSON.stringify(newWorlds));
    }

    // ❌ MANQUE : Sauvegarde dans project.json
    // ❌ MANQUE : Création de world_001.json séparé
  })
```

### 3. **Assistants de completion**

#### **Problème identifié :**
Les assistants de completion qui devraient pré-remplir les formulaires des pages ne fonctionnent pas.

#### **Code analysé :**
```typescript
// Dans LandingChatBox.tsx - génération de réponses
function generateAssistantResponse(input: string): string {
  // ✅ Détection des demandes wizard
  // ✅ Lancement automatique des wizards
  // ❌ MANQUE : Pré-remplissage intelligent des formulaires
}
```

**Manque de fonctionnalités :**
1. **Extraction de contexte** du prompt utilisateur
2. **Pré-remplissage automatique** des champs des wizards
3. **Mapping intelligent** entre texte naturel et valeurs structurées

---

## 🚨 Problèmes critiques identifiés

### 4. **Problèmes de synchronisation**

#### **A. Store vs localStorage vs Fichiers**
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Zustand   │ => │ localStorage │ => │ Fichiers JSON│
│    Store    │    │              │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
       ✅               ✅                ❌ BROKEN
```

#### **B. Gestion des erreurs**
```typescript
// Code actuel problématique
try {
  await window.electronAPI.project.updateMetadata(projectPath, data);
} catch (error) {
  console.error('Failed to save:', error);
  alert('Erreur lors de la sauvegarde'); // ❌ Pas de récupération
}
```

**Manque :**
- Retry logic
- Offline queue
- Data validation
- Rollback mechanisms

#### **C. APIs Electron instables**
```typescript
// Problème : window.electronAPI peut être undefined
if (window.electronAPI?.project?.updateMetadata) {
  // Code
} else {
  console.log('API not available'); // ❌ Pas de fallback
}
```

---

## 🛠️ Solutions proposées

### 5. **Architecture de persistance robuste**

#### **A. Service de persistance unifié**
```typescript
class PersistenceService {
  // Multi-layer persistence with fallbacks
  async saveWorld(world: World, projectPath: string): Promise<void> {
    // 1. Store Zustand
    // 2. localStorage
    // 3. Fichier JSON projet
    // 4. Backup cloud (futur)
  }

  // Retry logic avec exponential backoff
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> { /* ... */ }
}
```

#### **B. Validation de données**
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class DataValidator {
  static validateWorld(world: World): ValidationResult {
    // Validation complète des données
    // Schéma JSON, contraintes métier, etc.
  }
}
```

#### **C. Synchronisation bidirectionnelle**
```typescript
class SyncManager {
  // Sync store <=> fichiers JSON
  // Détection de conflits
  // Merge automatique
  // Notifications utilisateur
}
```

### 6. **Amélioration des assistants de completion**

#### **A. Extracteur de contexte intelligent**
```typescript
class ContextExtractor {
  static extractWorldContext(prompt: string): Partial<World> {
    // NLP pour extraire :
    // - Genre (fantasy, sci-fi, etc.)
    // - Tone (dark, light, etc.)
    // - Setting (medieval, modern, etc.)
    // - Key elements
  }
}
```

#### **B. Pré-remplissage automatique**
```typescript
class FormAutoFill {
  static populateWorldWizard(context: Partial<World>): WizardData {
    // Mapping context => champs formulaire
    // Validation des valeurs extraites
    // Suggestions de completion
  }
}
```

### 7. **APIs robustes avec fallbacks**

#### **A. API Manager**
```typescript
class APIManager {
  private apis: Map<string, APIAdapter> = new Map();

  async call(endpoint: string, data: any): Promise<any> {
    // Try Electron API first
    // Fallback to HTTP API
    // Fallback to local storage
    // Queue for later sync
  }
}
```

#### **B. File System abstraction**
```typescript
class FileSystem {
  static async writeJSON(path: string, data: any): Promise<void> {
    // Try Electron FS API
    // Fallback to browser download
    // Fallback to IndexedDB
  }
}
```

---

## 📋 Plan de correction détaillé

### Phase 1 : **Infrastructure de base** (Priorité haute)
1. **Créer PersistenceService** unifié
2. **Implémenter validation de données**
3. **Ajouter retry logic aux APIs**
4. **Créer système de fallback pour Electron APIs**

### Phase 2 : **Synchronisation des données** (Priorité haute)
1. **Synchronisation bidirectionnelle** store ↔ fichiers JSON
2. **Détection et résolution de conflits**
3. **Backup automatique** des données critiques
4. **Migration de données** existantes

### Phase 3 : **Assistants intelligents** (Priorité moyenne)
1. **Extracteur de contexte NLP** basique
2. **Pré-remplissage automatique** des wizards
3. **Suggestions intelligentes** basées sur l'historique
4. **Validation en temps réel** des données extraites

### Phase 4 : **Robustesse et monitoring** (Priorité moyenne)
1. **Logging complet** des opérations de persistance
2. **Monitoring des APIs** et alertes
3. **Tests automatisés** des scénarios de failure
4. **Documentation développeur** mise à jour

---

## 🎯 Métriques de succès

### KPIs à mesurer après corrections :
1. **Taux de succès de sauvegarde** : > 99%
2. **Temps de synchronisation** : < 500ms
3. **Taux de détection de conflits** : 100%
4. **Précision des assistants** : > 80% de pré-remplissage correct

---

## 🔍 Tests à implémenter

### Tests de persistance :
```typescript
describe('PersistenceService', () => {
  it('should save world to all layers', async () => {
    // Test multi-layer persistence
  });

  it('should recover from API failures', async () => {
    // Test fallback mechanisms
  });
});
```

### Tests d'assistants :
```typescript
describe('ContextExtractor', () => {
  it('should extract world context from natural language', () => {
    const result = ContextExtractor.extractWorldContext(
      "Create a dark fantasy world with dragons"
    );
    expect(result.genre).toBe('fantasy');
    expect(result.tone).toBe('dark');
  });
});
```

---

## 📚 Références et dépendances

### APIs externes :
- **Electron APIs** : `window.electronAPI`
- **File System** : Node.js fs APIs via Electron
- **localStorage** : Browser storage

### Stores internes :
- **Zustand** : État global de l'application
- **EventEmitter** : Communication inter-composants

### Formats de données :
- **JSON** : Format principal de persistance
- **YAML** : Configuration (futur)
- **SQLite** : Base de données locale (futur)

---

*Document créé le : 21/01/2026*
*Version : 1.0*
*Auteur : Assistant StoryCore*