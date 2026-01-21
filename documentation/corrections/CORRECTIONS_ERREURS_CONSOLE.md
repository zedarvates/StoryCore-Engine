# Corrections des Erreurs de Console

## 📋 Problèmes Identifiés et Corrigés

### 1. ✅ Erreur: model 'local-model' not found

**Problème:**
```
LLM Error: {
  category: 'unknown',
  code: 'api_error',
  message: "model 'local-model' not found"
}
```

**Cause:**
Le modèle par défaut "local-model" est un placeholder générique qui n'existe pas dans Ollama.

**Solution Appliquée:**

#### A. Mise à jour de la configuration par défaut
**Fichier:** `creative-studio-ui/src/utils/llmConfigStorage.ts`

```typescript
// AVANT
export const DEFAULT_LLM_CONFIG: ChatboxLLMConfig = {
  provider: 'openai',
  model: 'gpt-4',
  // ...
};

// APRÈS
export const DEFAULT_LLM_CONFIG: ChatboxLLMConfig = {
  provider: 'local',
  model: 'gemma2:2b', // Modèle Ollama léger par défaut
  // ...
};
```

#### B. Mise à jour des modèles disponibles
**Fichier:** `creative-studio-ui/src/services/llmService.ts`

```typescript
// AVANT
{
  id: 'local',
  name: 'Local LLM',
  models: [
    {
      id: 'local-model', // ❌ N'existe pas
      name: 'Local Model',
      // ...
    },
  ],
}

// APRÈS
{
  id: 'local',
  name: 'Local LLM',
  models: [
    {
      id: 'gemma2:2b', // ✅ Modèle réel
      name: 'Gemma 2 2B (Recommended)',
      contextWindow: 8192,
      capabilities: ['chat', 'completion', 'streaming'],
    },
    {
      id: 'llama3.2:1b',
      name: 'Llama 3.2 1B (Fast)',
      contextWindow: 4096,
      capabilities: ['chat', 'completion', 'streaming'],
    },
    {
      id: 'qwen2.5:0.5b',
      name: 'Qwen 2.5 0.5B (Ultra Fast)',
      contextWindow: 4096,
      capabilities: ['chat', 'completion', 'streaming'],
    },
    {
      id: 'phi3:mini',
      name: 'Phi 3 Mini',
      contextWindow: 4096,
      capabilities: ['chat', 'completion', 'streaming'],
    },
  ],
}
```

**Modèles Ollama Recommandés:**

| Modèle | Taille | Vitesse | RAM Requise | Usage |
|--------|--------|---------|-------------|-------|
| `gemma2:2b` | 2B | Rapide | ~4GB | Recommandé (équilibre) |
| `llama3.2:1b` | 1B | Très rapide | ~2GB | Développement rapide |
| `qwen2.5:0.5b` | 0.5B | Ultra rapide | ~1GB | Tests/prototypage |
| `phi3:mini` | 3.8B | Moyen | ~6GB | Qualité supérieure |

**Installation des modèles:**
```bash
# Modèle recommandé
ollama pull gemma2:2b

# Alternatives
ollama pull llama3.2:1b
ollama pull qwen2.5:0.5b
ollama pull phi3:mini
```

---

### 2. ⚠️ Avertissement: DialogContent requires DialogTitle

**Problème:**
```
`DialogContent` requires a `DialogTitle` for the component to be accessible 
for screen reader users.
```

**Cause:**
Les modales (GenericWizardModal, etc.) n'ont pas de `DialogTitle` explicite pour l'accessibilité.

**Solution:**

#### Option A: Ajouter un DialogTitle visible
```typescript
<DialogContent>
  <DialogHeader>
    <DialogTitle>Titre de la Modale</DialogTitle>
  </DialogHeader>
  {/* Contenu */}
</DialogContent>
```

#### Option B: Ajouter un DialogTitle caché (si pas de titre visuel)
```typescript
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

<DialogContent>
  <VisuallyHidden>
    <DialogTitle>Description pour lecteurs d'écran</DialogTitle>
  </VisuallyHidden>
  {/* Contenu */}
</DialogContent>
```

**Fichiers à corriger:**
- `creative-studio-ui/src/components/wizard/GenericWizardModal.tsx`
- Autres modales sans DialogTitle

---

### 3. ❓ Erreur: EditorPage is not defined (App.tsx:471)

**Statut:** Non reproduit dans le code actuel

**Vérifications effectuées:**
- ✅ Import correct: `import { EditorPageSimple } from '@/pages/EditorPageSimple';`
- ✅ Fichier existe: `creative-studio-ui/src/pages/EditorPageSimple.tsx`
- ✅ Aucune référence à `EditorPage` (sans "Simple") trouvée

**Cause possible:**
- Cache du navigateur ou du bundler
- Erreur transitoire lors du hot-reload

**Solution:**
```bash
# Nettoyer le cache et rebuilder
cd creative-studio-ui
npm run clean  # ou rm -rf node_modules/.vite
npm run dev
```

---

## 🔧 Actions Recommandées

### Immédiat

1. **Installer un modèle Ollama:**
```bash
# Démarrer Ollama
ollama serve

# Dans un autre terminal
ollama pull gemma2:2b
```

2. **Vérifier la configuration:**
```javascript
// Dans la console du navigateur
localStorage.getItem('storycore_llm_config')
// Devrait montrer provider: 'local', model: 'gemma2:2b'
```

3. **Tester la connexion:**
```bash
curl http://localhost:11434/api/tags
# Devrait lister gemma2:2b
```

### Court Terme

1. **Corriger les DialogTitle manquants:**
   - Ajouter `<DialogTitle>` dans toutes les modales
   - Utiliser `VisuallyHidden` si pas de titre visuel

2. **Améliorer la gestion des erreurs:**
   - Détecter si Ollama est installé
   - Suggérer l'installation du modèle manquant
   - Afficher un message clair à l'utilisateur

3. **Ajouter une validation au démarrage:**
   - Vérifier si le modèle configuré existe
   - Proposer un modèle alternatif si absent
   - Guider l'utilisateur vers l'installation

---

## 📝 Guide de Dépannage

### Problème: "model not found"

**Diagnostic:**
```bash
# Vérifier les modèles installés
ollama list

# Vérifier la configuration
# Console navigateur:
JSON.parse(localStorage.getItem('storycore_llm_config'))
```

**Solutions:**

1. **Le modèle n'est pas installé:**
```bash
ollama pull gemma2:2b
```

2. **Mauvais nom de modèle:**
```javascript
// Réinitialiser la configuration
localStorage.removeItem('storycore_llm_config');
location.reload();
// Puis reconfigurer avec un modèle valide
```

3. **Ollama n'est pas démarré:**
```bash
ollama serve
```

### Problème: Bouton ne reste pas enclenché

**Cause possible:**
État React non persisté ou réinitialisé.

**Diagnostic:**
```javascript
// Dans React DevTools, vérifier l'état du composant
// Chercher le state qui contrôle le bouton
```

**Solution:**
Vérifier que l'état est bien sauvegardé dans localStorage ou le store global.

---

## 🎯 Checklist de Vérification

Après les corrections:

- [ ] Ollama est installé et démarré
- [ ] Au moins un modèle est téléchargé (`ollama list`)
- [ ] La configuration LLM pointe vers un modèle existant
- [ ] Aucune erreur "model not found" dans la console
- [ ] Les modales ont des DialogTitle (ou VisuallyHidden)
- [ ] L'application se charge sans erreur
- [ ] La chatbox fonctionne avec le LLM local

---

## 📚 Ressources

### Documentation Ollama
- Installation: https://ollama.ai
- Modèles disponibles: https://ollama.ai/library
- API: https://github.com/ollama/ollama/blob/main/docs/api.md

### Modèles Recommandés par Usage

**Développement/Tests:**
- `qwen2.5:0.5b` - Ultra rapide, minimal
- `llama3.2:1b` - Rapide, bon équilibre

**Production:**
- `gemma2:2b` - Recommandé, bon équilibre qualité/vitesse
- `phi3:mini` - Meilleure qualité, plus lent

**Qualité Maximale:**
- `llama3.1:8b` - Très bonne qualité
- `mixtral:8x7b` - Excellente qualité (nécessite 32GB+ RAM)

---

**Date:** 2026-01-20  
**Version:** 1.0  
**Statut:** Corrections appliquées
