# Guide d'Intégration - Central Configuration UI

## 📋 Vue d'ensemble

Ce guide explique comment intégrer le Central Configuration UI dans votre application StoryCore-Engine.

## ✅ Intégration Actuelle

Le Central Configuration UI est **déjà partiellement intégré** dans `EditorPage.tsx` :

```typescript
// Dans EditorPage.tsx
import CentralConfigurationUI from '../../../src/ui/CentralConfigurationUI';

// État pour afficher/masquer la configuration
const [showConfiguration, setShowConfiguration] = useState(false);

// Bouton pour ouvrir la configuration
<button onClick={() => setShowConfiguration(!showConfiguration)}>
  <Settings className="w-4 h-4" />
</button>

// Affichage conditionnel
if (showConfiguration && project) {
  return (
    <CentralConfigurationUI
      projectId={project.project_name}
      projectName={project.project_name}
      onClose={() => setShowConfiguration(false)}
    />
  );
}
```

## 🔄 Migration vers la Nouvelle Implémentation

### Étape 1 : Mettre à jour l'import

Remplacez l'ancien import par le nouveau :

```typescript
// Ancien (à remplacer)
import CentralConfigurationUI from '../../../src/ui/CentralConfigurationUI';

// Nouveau (recommandé)
import { CentralConfigurationUI } from '@/components';
// ou
import { CentralConfigurationUI } from '../components';
```

### Étape 2 : Ajouter le Provider (Optionnel)

Si vous voulez utiliser le context de configuration dans d'autres composants :

```typescript
// Dans App.tsx ou main.tsx
import { ConfigurationProvider } from '@/components';

function App() {
  return (
    <ConfigurationProvider>
      {/* Votre application */}
      <EditorPage />
    </ConfigurationProvider>
  );
}
```

### Étape 3 : Utiliser les Hooks (Optionnel)

Dans n'importe quel composant enfant :

```typescript
import { useConfiguration, useProjectConfig } from '@/components';

function MyComponent() {
  const { projectConfig, saveProjectConfig } = useConfiguration();
  const apiConfig = useProjectConfig()?.api;
  
  // Utiliser les configurations...
}
```

## 🎯 Scénarios d'Utilisation

### Scénario 1 : Modal Overlay (Actuel)

```typescript
function EditorPage() {
  const [showConfig, setShowConfig] = useState(false);
  const { project } = useAppStore();

  if (showConfig && project) {
    return (
      <CentralConfigurationUI
        projectId={project.id}
        projectName={project.project_name}
        onClose={() => setShowConfig(false)}
      />
    );
  }

  return (
    <div>
      {/* Votre interface */}
      <button onClick={() => setShowConfig(true)}>
        <Settings />
      </button>
    </div>
  );
}
```

### Scénario 2 : Page Dédiée

```typescript
// Dans votre router
import { CentralConfigurationUI } from '@/components';

<Route path="/project/:id/settings" element={
  <CentralConfigurationUI
    projectId={projectId}
    projectName={projectName}
  />
} />
```

### Scénario 3 : Sidebar Intégré

```typescript
function EditorPage() {
  const [showConfigSidebar, setShowConfigSidebar] = useState(false);

  return (
    <div className="flex">
      {/* Votre contenu principal */}
      <div className="flex-1">
        {/* ... */}
      </div>

      {/* Sidebar de configuration */}
      {showConfigSidebar && (
        <div className="w-96 border-l">
          <CentralConfigurationUI
            projectId={projectId}
            projectName={projectName}
            onClose={() => setShowConfigSidebar(false)}
          />
        </div>
      )}
    </div>
  );
}
```

## 🔌 Connexion aux Services Backend

### API Configuration

Remplacez les tests de connexion simulés par de vrais appels :

```typescript
// Dans APISettingsWindow.tsx
const handleTestConnection = async (serviceName: string) => {
  const endpoint = formData.endpoints[serviceName];
  
  try {
    // Remplacer la simulation par un vrai appel
    const response = await fetch(endpoint.url, {
      headers: {
        'Authorization': `Bearer ${endpoint.apiKey}`,
      },
    });
    
    if (response.ok) {
      setTestResults(prev => ({
        ...prev,
        [serviceName]: 'Connection successful',
      }));
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    setTestResults(prev => ({
      ...prev,
      [serviceName]: `Connection failed: ${error.message}`,
    }));
  }
};
```

### LLM Configuration

Connectez aux vrais services LLM :

```typescript
// Dans LLMConfigurationWindow.tsx
const handleTestConnection = async (provider: string) => {
  try {
    if (provider === 'ollama') {
      const response = await fetch(`${formData.ollama.baseUrl}/api/tags`);
      const data = await response.json();
      setConnectionStatus(prev => ({
        ...prev,
        ollama: `Connected - ${data.models?.length || 0} models available`,
      }));
    } else if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${formData.openai.apiKey}`,
        },
      });
      if (response.ok) {
        setConnectionStatus(prev => ({
          ...prev,
          openai: 'Connected successfully',
        }));
      }
    }
    // ... autres providers
  } catch (error) {
    setConnectionStatus(prev => ({
      ...prev,
      [provider]: `Error: ${error.message}`,
    }));
  }
};
```

### ComfyUI Configuration

Connectez à ComfyUI :

```typescript
// Dans ComfyUIConfigurationWindow.tsx
const handleTestConnection = async () => {
  try {
    // Récupérer les workflows disponibles
    const response = await fetch(`${formData.serverUrl}/api/workflows`);
    const workflows = await response.json();
    
    setConnectionStatus('Connected successfully');
    setAvailableWorkflows(workflows.map(w => w.id));
  } catch (error) {
    setConnectionStatus(`Connection failed: ${error.message}`);
  }
};
```

## 🧙 Implémentation des Wizards

### Créer un Wizard Réel

```typescript
// Dans WizardLauncher.tsx
const handleLaunchWizard = (wizardId: string) => {
  switch (wizardId) {
    case 'world-building':
      // Ouvrir le wizard de world building
      navigate(`/project/${projectId}/wizard/world-building`);
      break;
      
    case 'character-creation':
      // Ouvrir le wizard de création de personnage
      navigate(`/project/${projectId}/wizard/character-creation`);
      break;
      
    // ... autres wizards
  }
};
```

### Créer un Composant Wizard

```typescript
// wizards/WorldBuildingWizard.tsx
import { useConfiguration } from '@/components';

export function WorldBuildingWizard() {
  const { projectConfig } = useConfiguration();
  const llmConfig = projectConfig?.llm;

  const generateWorld = async (prompt: string) => {
    // Utiliser la configuration LLM pour générer
    const response = await fetch(`${llmConfig.ollama.baseUrl}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: llmConfig.ollama.model,
        prompt: prompt,
        temperature: llmConfig.ollama.temperature,
      }),
    });
    
    // Traiter la réponse...
  };

  return (
    <div>
      {/* Interface du wizard */}
    </div>
  );
}
```

## 🔐 Améliorer la Sécurité

### Remplacer le Chiffrement XOR

```typescript
// services/configurationStore.ts

// Utiliser crypto-js ou une bibliothèque similaire
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'default-key';

function encryptSensitiveData(data: string): string {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
}

function decryptSensitiveData(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

### Ajouter la Validation Backend

```typescript
// Valider côté serveur également
const handleSave = async (config: any) => {
  // Validation côté client
  const validation = validateConfiguration(config);
  if (!validation.isValid) {
    throw new Error('Invalid configuration');
  }

  // Envoyer au backend pour validation et sauvegarde
  const response = await fetch('/api/configuration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error('Failed to save configuration');
  }
};
```

## 🎨 Personnalisation du Thème

### Adapter aux Couleurs de votre Application

```typescript
// Dans votre fichier CSS principal
:root {
  /* Utiliser vos variables existantes */
  --bg-primary: var(--background);
  --text-primary: var(--foreground);
  --accent-color: var(--primary);
  --border-color: var(--border);
  /* ... */
}
```

### Utiliser Tailwind CSS

Si vous utilisez Tailwind, vous pouvez remplacer les classes CSS par des classes Tailwind :

```typescript
// Exemple dans ProjectWorkspace.tsx
<div className="p-8 max-w-7xl mx-auto">
  <div className="flex justify-between items-start mb-8 pb-5 border-b-2 border-gray-700">
    {/* ... */}
  </div>
</div>
```

## 📊 Monitoring et Analytics

### Ajouter le Tracking

```typescript
// Dans CentralConfigurationUI.tsx
import { analytics } from '@/services/analytics';

const handleOpenSettings = (window: 'api' | 'llm' | 'comfyui') => {
  // Track l'ouverture
  analytics.track('configuration_window_opened', {
    window_type: window,
    project_id: projectId,
  });
  
  setActiveWindow(window);
};

const handleSave = async (config: any) => {
  await saveProjectConfig(config);
  
  // Track la sauvegarde
  analytics.track('configuration_saved', {
    config_type: 'project',
    project_id: projectId,
  });
};
```

## 🧪 Tests

### Tests d'Intégration

```typescript
// __tests__/CentralConfigurationUI.integration.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CentralConfigurationUI } from '@/components';

describe('CentralConfigurationUI Integration', () => {
  it('should open API settings window', async () => {
    render(
      <CentralConfigurationUI
        projectId="test-123"
        projectName="Test Project"
      />
    );

    // Cliquer sur le bouton API
    const apiButton = screen.getByText(/API/i);
    fireEvent.click(apiButton);

    // Vérifier que la fenêtre s'ouvre
    expect(screen.getByText(/API Settings/i)).toBeInTheDocument();
  });
});
```

## 🚀 Déploiement

### Build de Production

```bash
# Installer les dépendances
npm install

# Build
npm run build

# Le Central Configuration UI sera inclus dans le build
```

### Variables d'Environnement

```env
# .env.production
REACT_APP_ENCRYPTION_KEY=your-secure-key-here
REACT_APP_API_BASE_URL=https://api.yourapp.com
REACT_APP_OLLAMA_DEFAULT_URL=http://localhost:11434
REACT_APP_COMFYUI_DEFAULT_URL=http://localhost:8188
```

## 📝 Checklist d'Intégration

- [ ] Mettre à jour les imports
- [ ] Ajouter le ConfigurationProvider si nécessaire
- [ ] Connecter aux vrais services backend
- [ ] Implémenter les wizards réels
- [ ] Remplacer le chiffrement XOR
- [ ] Adapter le thème à votre application
- [ ] Ajouter le tracking/analytics
- [ ] Écrire les tests
- [ ] Configurer les variables d'environnement
- [ ] Tester en production

## 🆘 Support

Pour toute question ou problème :
1. Consultez la documentation dans `components/README.md`
2. Vérifiez les exemples dans `examples/CentralConfigurationUIExample.tsx`
3. Consultez le design document dans `.kiro/specs/central-configuration-ui/design.md`

## 🎉 Conclusion

Le Central Configuration UI est maintenant prêt à être intégré dans votre application. Suivez ce guide étape par étape pour une intégration réussie !
