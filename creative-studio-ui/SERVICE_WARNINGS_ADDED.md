# Avertissements de Service Ajoutés

## 📋 Vue d'Ensemble

Ajout d'avertissements clairs près des boutons qui nécessitent des services externes (LLM, ComfyUI) pour informer l'utilisateur et lui permettre de configurer facilement ces services.

## ✅ Composant Créé

### `ServiceWarning` Component
**Fichier:** `creative-studio-ui/src/components/ui/service-warning.tsx`

**Fonctionnalités:**
- Affiche un avertissement visuel quand un service n'est pas configuré
- Deux variantes: `inline` (compact) et `banner` (pleine largeur)
- Bouton "Configurer" qui ouvre directement les paramètres du service
- Hook `useServiceStatus()` pour vérifier l'état des services

**Services Supportés:**
- `llm` - Services LLM (OpenAI, Anthropic, Ollama, etc.)
- `comfyui` - ComfyUI pour génération d'images

**Exemple d'utilisation:**
```tsx
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';

function MyComponent() {
  const { llmConfigured } = useServiceStatus();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  return (
    <>
      <Button disabled={!llmConfigured}>Generate with AI</Button>
      
      {!llmConfigured && (
        <ServiceWarning
          service="llm"
          variant="inline"
          onConfigure={() => setShowLLMSettings(true)}
        />
      )}
    </>
  );
}
```

## ✅ Avertissements Ajoutés

### 1. World Wizard - Step 2: World Rules
**Fichier:** `Step2WorldRules.tsx`

**Modifications:**
- Ajouté import de `ServiceWarning` et `useServiceStatus`
- Ajouté vérification `llmConfigured` dans le state
- Bouton "Generate Rules" désactivé si LLM non configuré
- Avertissement affiché sous le bouton si LLM non configuré
- Bouton "Configurer LLM" ouvre directement les paramètres

**Avant:**
```tsx
<Button disabled={isLoading || !formData.genre?.length}>
  Generate Rules
</Button>
```

**Après:**
```tsx
<Button disabled={isLoading || !formData.genre?.length || !llmConfigured}>
  Generate Rules
</Button>

{!llmConfigured && (
  <ServiceWarning
    service="llm"
    variant="inline"
    onConfigure={() => setShowLLMSettings(true)}
  />
)}
```

### 2. World Wizard - Step 4: Cultural Elements
**Fichier:** `Step4CulturalElements.tsx`

**Modifications:**
- Même pattern que Step 2
- Bouton "Generate Elements" désactivé si LLM non configuré
- Avertissement avec bouton de configuration

### 3. Character Wizard - Step 1: Basic Identity
**Fichier:** `Step1BasicIdentity.tsx`

**Modifications:**
- Bouton "Suggest Name" désactivé si LLM non configuré
- Avertissement affiché près du champ nom
- Lien direct vers configuration LLM

### 4. Character Wizard - Step 2: Physical Appearance
**À faire:** Même pattern à appliquer

### 5. Character Wizard - Step 3: Personality
**À faire:** Même pattern à appliquer

### 6. Character Wizard - Step 4: Background
**À faire:** Même pattern à appliquer

## 🎨 Design de l'Avertissement

### Variante Inline (Utilisée)
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  LLM Non Configuré                               │
│                                                      │
│ Cette fonctionnalité nécessite un service LLM      │
│ (OpenAI, Anthropic, Ollama, etc.) pour générer     │
│ du contenu avec l'IA.                              │
│                                                      │
│ [⚙️ Configurer LLM]                                │
└─────────────────────────────────────────────────────┘
```

**Couleurs:**
- Fond: Amber 50 (clair) / Amber 950 (sombre)
- Bordure: Amber 200 / Amber 800
- Texte: Amber 900 / Amber 100
- Icône: Amber 600 / Amber 400

### Variante Banner (Alternative)
Plus grande, pour les avertissements importants en haut de page.

## 🔍 Hook useServiceStatus

**Fonctionnalité:**
Vérifie automatiquement si les services sont configurés en lisant `localStorage`.

**Retour:**
```typescript
{
  llmConfigured: boolean,      // LLM est configuré
  comfyUIConfigured: boolean,  // ComfyUI est configuré
  anyConfigured: boolean,      // Au moins un service configuré
  allConfigured: boolean       // Tous les services configurés
}
```

**Vérifications:**
- **LLM:** Vérifie `llm-config` dans localStorage
  - Provider défini
  - API key présente (sauf pour Ollama)
  
- **ComfyUI:** Vérifie `comfyui-config` dans localStorage
  - Server URL défini

## 📊 Impact Utilisateur

### Avant
- Boutons AI non fonctionnels sans explication
- Utilisateur confus pourquoi rien ne se passe
- Pas de guidance pour configurer les services

### Après
- Avertissement clair et visible
- Explication de ce qui est requis
- Bouton direct pour configurer
- Meilleure expérience utilisateur

## 🎯 Prochaines Étapes

### À Compléter
1. ✅ World Wizard Step 2 (World Rules)
2. ✅ World Wizard Step 4 (Cultural Elements)
3. ✅ Character Wizard Step 1 (Basic Identity)
4. ⏳ Character Wizard Step 2 (Physical Appearance)
5. ⏳ Character Wizard Step 3 (Personality)
6. ⏳ Character Wizard Step 4 (Background)

### Autres Endroits Potentiels
- Storyboard generation avec AI
- Scene generation
- Dialogue generation
- Image generation (ComfyUI)
- Tout autre feature utilisant LLM ou ComfyUI

## 💡 Recommandations

### Pour les Développeurs
1. **Toujours vérifier** `llmConfigured` ou `comfyUIConfigured` avant d'activer un bouton AI
2. **Toujours afficher** `ServiceWarning` quand le service n'est pas configuré
3. **Toujours fournir** un bouton de configuration via `onConfigure`

### Pattern Recommandé
```tsx
function MyAIFeature() {
  const { llmConfigured } = useServiceStatus();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);
  
  return (
    <div className="space-y-4">
      <Button 
        onClick={handleGenerate}
        disabled={!llmConfigured || isLoading}
      >
        Generate with AI
      </Button>
      
      {!llmConfigured && (
        <ServiceWarning
          service="llm"
          variant="inline"
          onConfigure={() => setShowLLMSettings(true)}
        />
      )}
    </div>
  );
}
```

## 📝 Notes Techniques

### Détection de Configuration
La détection se fait via `localStorage`:
- Pas de dépendance sur le service LLM lui-même
- Rapide et synchrone
- Fonctionne même si le service a des erreurs

### Limitations
- Ne vérifie pas si l'API key est **valide**, seulement si elle **existe**
- Ne vérifie pas si ComfyUI est **accessible**, seulement si l'URL **existe**
- Pour une vérification complète, il faudrait faire un appel test

### Améliorations Futures
1. Ajouter un test de connexion réel
2. Afficher le statut de connexion (connecté/déconnecté)
3. Ajouter un indicateur de santé du service
4. Permettre de tester la configuration depuis l'avertissement

