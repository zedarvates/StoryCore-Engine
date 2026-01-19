# Central Configuration UI

Interface utilisateur centrale pour gérer toutes les configurations de StoryCore-Engine et accéder rapidement aux wizards créatifs.

## 🎯 Fonctionnalités

- **Configuration API** : Gérer les endpoints et l'authentification
- **Configuration LLM** : Configurer Ollama, OpenAI, Anthropic
- **Configuration ComfyUI** : Paramétrer le backend de génération d'images
- **Lanceur de Wizards** : Accès rapide aux outils créatifs (world building, character creation, etc.)
- **Workspace Projet** : Vue centrale avec statut du pipeline et activité récente
- **Persistance** : Sauvegarde automatique des configurations
- **Validation** : Validation en temps réel des paramètres

## 📦 Installation

Les composants sont déjà intégrés dans `creative-studio-ui`. Importez simplement ce dont vous avez besoin :

```typescript
import { CentralConfigurationUI } from './components';
```

## 🚀 Utilisation Rapide

### Utilisation de Base

```typescript
import React, { useState } from 'react';
import { CentralConfigurationUI } from './components';

function App() {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div>
      <button onClick={() => setShowConfig(true)}>
        Ouvrir Configuration
      </button>

      {showConfig && (
        <CentralConfigurationUI
          projectId="my-project-123"
          projectName="Mon Projet"
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}
```

### Utilisation Intégrée (Sans Modal)

```typescript
import { CentralConfigurationUI } from './components';

function ConfigPage() {
  return (
    <CentralConfigurationUI
      projectId="my-project-123"
      projectName="Mon Projet"
      // Pas de onClose = pas de bouton fermer
    />
  );
}
```

### Utilisation du Context Directement

```typescript
import { ConfigurationProvider, useConfiguration } from './components';

function MyComponent() {
  const {
    projectConfig,
    saveProjectConfig,
    loadConfiguration,
    isLoading,
  } = useConfiguration();

  // Utiliser les configurations...
}

function App() {
  return (
    <ConfigurationProvider>
      <MyComponent />
    </ConfigurationProvider>
  );
}
```

## 🎨 Composants Disponibles

### CentralConfigurationUI

Composant principal qui intègre tout.

**Props:**
- `projectId` (string, required) : ID du projet
- `projectName` (string, required) : Nom du projet
- `onClose` (function, optional) : Callback pour fermer l'interface

### APISettingsWindow

Fenêtre de configuration des API.

**Props:**
- `isOpen` (boolean) : Afficher/masquer la fenêtre
- `onClose` (function) : Callback de fermeture
- `onSave` (function) : Callback de sauvegarde

### LLMConfigurationWindow

Fenêtre de configuration des LLM.

**Props:**
- `isOpen` (boolean) : Afficher/masquer la fenêtre
- `onClose` (function) : Callback de fermeture
- `onSave` (function) : Callback de sauvegarde

### ComfyUIConfigurationWindow

Fenêtre de configuration de ComfyUI.

**Props:**
- `isOpen` (boolean) : Afficher/masquer la fenêtre
- `onClose` (function) : Callback de fermeture
- `onSave` (function) : Callback de sauvegarde

### ProjectWorkspace

Vue workspace du projet avec wizards.

**Props:**
- `projectId` (string) : ID du projet
- `projectName` (string) : Nom du projet
- `onOpenSettings` (function) : Callback pour ouvrir les paramètres

### WizardLauncher

Lanceur de wizards créatifs.

**Props:**
- `projectId` (string) : ID du projet
- `availableWizards` (WizardDefinition[]) : Liste des wizards disponibles
- `onLaunchWizard` (function) : Callback de lancement

## 🔧 Hooks Disponibles

### useConfiguration()

Hook principal pour accéder au context de configuration.

```typescript
const {
  projectConfig,
  globalConfig,
  activeProject,
  isLoading,
  isSaving,
  loadConfiguration,
  saveProjectConfig,
  saveGlobalConfig,
  validateConfiguration,
  resetToDefaults,
  exportConfiguration,
  importConfiguration,
} = useConfiguration();
```

### useProjectConfig()

Accès direct à la configuration du projet.

```typescript
const projectConfig = useProjectConfig();
```

### useAPIConfig()

Accès direct à la configuration API.

```typescript
const apiConfig = useAPIConfig();
```

### useLLMConfig()

Accès direct à la configuration LLM.

```typescript
const llmConfig = useLLMConfig();
```

### useComfyUIConfig()

Accès direct à la configuration ComfyUI.

```typescript
const comfyuiConfig = useComfyUIConfig();
```

## 📝 Types TypeScript

Tous les types sont exportés depuis `./types/configuration`:

```typescript
import {
  ProjectConfiguration,
  GlobalConfiguration,
  APIConfiguration,
  LLMConfiguration,
  ComfyUIConfiguration,
  WizardDefinition,
  ValidationResult,
  // ... et plus
} from './types/configuration';
```

## 🎭 Wizards Disponibles

Les wizards suivants sont disponibles par défaut :

1. **World Building** 🌍 : Créer des mondes et des lieux
2. **Character Creation** 👤 : Concevoir des personnages détaillés
3. **Scene Generator** 🎬 : Générer des scènes cinématiques
4. **Dialogue Writer** 💬 : Écrire des dialogues naturels
5. **Storyboard Creator** 📋 : Visualiser l'histoire en storyboard
6. **Style Transfer** 🎨 : Appliquer des styles visuels cohérents

## 🔐 Sécurité

- Les clés API et mots de passe sont chiffrés avant stockage
- Les champs sensibles sont masqués dans l'interface
- Validation stricte des URLs et paramètres

## 💾 Stockage

- **Configurations projet** : Local Storage avec clé `storycore_project_{projectId}`
- **Configuration globale** : Local Storage avec clé `storycore_global_config`
- **Export/Import** : Format JSON pour backup et restauration

## 🎨 Personnalisation

### Variables CSS

Personnalisez l'apparence en modifiant les variables CSS :

```css
:root {
  --bg-primary: #1a1a1a;
  --accent-color: #4a9eff;
  --text-primary: #ffffff;
  /* ... voir CentralConfigurationUI.css pour toutes les variables */
}
```

### Thème Clair

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --card-bg: #ffffff;
  --text-primary: #000000;
  --text-secondary: #666666;
  /* ... */
}
```

## 📚 Exemples Complets

Voir `./examples/CentralConfigurationUIExample.tsx` pour des exemples complets d'utilisation.

## 🐛 Dépannage

### La configuration ne se charge pas

Vérifiez que le `projectId` est valide et que le composant est bien enveloppé dans `ConfigurationProvider`.

### Les changements ne sont pas sauvegardés

Assurez-vous d'appeler `saveProjectConfig()` ou `saveGlobalConfig()` après modification.

### Les wizards sont désactivés

Vérifiez que les configurations requises (LLM, ComfyUI) sont bien configurées.

## 📄 Licence

Partie intégrante de StoryCore-Engine.
