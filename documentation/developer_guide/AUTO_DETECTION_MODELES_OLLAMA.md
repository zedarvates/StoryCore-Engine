# Auto-Détection des Modèles Ollama

## 🎯 Amélioration Majeure

StoryCore détecte maintenant **automatiquement** les modèles Ollama installés sur votre machine au lieu d'utiliser des noms hardcodés!

## ✅ Comment Ça Fonctionne

### Au Premier Lancement

1. **Interrogation d'Ollama**: StoryCore appelle `http://localhost:11434/api/tags`
2. **Récupération de la liste**: Obtient tous les modèles installés
3. **Sélection intelligente**: Choisit le meilleur modèle selon un ordre de priorité
4. **Configuration automatique**: Sauvegarde le modèle détecté

### Ordre de Priorité

StoryCore cherche les modèles dans cet ordre:

1. `llama3.2:1b` - Ultra léger et rapide
2. `llama3.2:3b` - Bon équilibre
3. `phi3:mini` - Performant
4. `llama3.1:8b` - Haute qualité
5. `mistral:7b` - Très bon
6. `gemma2:9b` - Gemma 2
7. `qwen2.5:7b` - Qwen
8. **Premier modèle disponible** - Si aucun des préférés n'est trouvé

### Si Aucun Modèle Trouvé

- Utilise `llama3.2:1b` comme fallback
- Affiche un message clair pour installer un modèle
- L'utilisateur peut changer dans Settings

## 📋 Exemple de Logs

```
[LLMConfigService] Initializing...
[LLMConfigService] No configuration found, detecting available models...
[OllamaDetection] Fetching models from http://localhost:11434/api/tags
[LLMConfigService] Auto-detected model: gemma3:1b
[LLMConfigService] Reason: Found gemma3:1b installed - good balance of speed and quality
[LLMConfigService] Alternatives: llama3.2:3b, mistral:7b, phi3:mini
[LLMConfigService] LLM service created
[LLMConfigService] Configuration saved to storage
[LLMConfigService] Initialized successfully
```

## 🔧 Fonctions Disponibles

### `getInstalledOllamaModels()`
Récupère la liste complète des modèles installés.

```typescript
const models = await getInstalledOllamaModels();
// Returns: [{ name: 'gemma3:1b', size: '1.6GB', modified: '2024-01-20' }, ...]
```

### `suggestBestModel()`
Suggère le meilleur modèle à utiliser.

```typescript
const suggestion = await suggestBestModel();
// Returns: { 
//   model: 'gemma3:1b', 
//   reason: 'Found gemma3:1b installed...', 
//   alternatives: ['llama3.2:3b', 'mistral:7b'] 
// }
```

### `isModelInstalled()`
Vérifie si un modèle spécifique est installé.

```typescript
const installed = await isModelInstalled('gemma3:1b');
// Returns: true or false
```

### `validateModelName()`
Valide un nom de modèle et donne des suggestions.

```typescript
const result = await validateModelName('gemma2:2b');
// Returns: { 
//   valid: false, 
//   message: 'Model gemma2:2b not found. Available: gemma3:1b, llama3.2:3b' 
// }
```

## 🎯 Avantages

### 1. Plus de Noms Hardcodés
- ✅ Fonctionne avec **n'importe quel modèle** Ollama
- ✅ Supporte les **nouveaux modèles** automatiquement
- ✅ Pas besoin de mettre à jour le code

### 2. Détection Intelligente
- ✅ Choisit le meilleur modèle disponible
- ✅ Ordre de priorité optimisé (vitesse/qualité)
- ✅ Fallback gracieux si aucun modèle préféré

### 3. Expérience Utilisateur
- ✅ Configuration automatique au premier lancement
- ✅ Messages clairs dans les logs
- ✅ Suggestions d'alternatives

### 4. Flexibilité
- ✅ Fonctionne avec Gemma 3 si vous l'avez
- ✅ Fonctionne avec Llama 3.2, 3.1
- ✅ Fonctionne avec n'importe quel modèle Ollama

## 📊 Cas d'Usage

### Cas 1: Utilisateur avec Gemma 3
```
Modèles installés: gemma3:1b, gemma3:4b
Résultat: Utilise gemma3:1b (détecté automatiquement)
```

### Cas 2: Utilisateur avec Llama 3.2
```
Modèles installés: llama3.2:1b, llama3.2:3b
Résultat: Utilise llama3.2:1b (priorité 1)
```

### Cas 3: Utilisateur avec Modèles Variés
```
Modèles installés: mistral:7b, qwen2.5:7b, phi3:mini
Résultat: Utilise phi3:mini (priorité 3)
```

### Cas 4: Aucun Modèle Installé
```
Modèles installés: (aucun)
Résultat: Utilise llama3.2:1b comme fallback
Message: "No models detected, using fallback"
```

## 🔄 Intégration dans l'Interface

### Settings → LLM Configuration

Le dropdown des modèles peut maintenant être peuplé dynamiquement:

```typescript
import { getModelNames } from '@/utils/ollamaModelDetection';

// Dans le composant
const [availableModels, setAvailableModels] = useState<string[]>([]);

useEffect(() => {
  async function loadModels() {
    const models = await getModelNames();
    setAvailableModels(models);
  }
  loadModels();
}, []);

// Dans le JSX
<select>
  {availableModels.map(model => (
    <option key={model} value={model}>{model}</option>
  ))}
</select>
```

## ⚠️ Notes Importantes

### Timeout
- La détection a un timeout de 5 secondes
- Si Ollama ne répond pas, utilise le fallback

### Endpoint
- Par défaut: `http://localhost:11434`
- Peut être configuré dans Settings

### Ordre de Priorité
- Basé sur un équilibre vitesse/qualité
- Peut être modifié dans `ollamaModelDetection.ts`

## 🚀 Prochaines Étapes

### Amélioration 1: Rafraîchir la Liste
Ajouter un bouton "Refresh Models" dans Settings pour recharger la liste.

### Amélioration 2: Validation en Temps Réel
Valider le modèle sélectionné avant de sauvegarder.

### Amélioration 3: Téléchargement Intégré
Ajouter un bouton "Download Model" directement dans l'interface.

### Amélioration 4: Informations sur les Modèles
Afficher la taille, la date de modification, etc.

## 📚 Fichiers Modifiés

1. **`creative-studio-ui/src/utils/ollamaModelDetection.ts`**
   - Utilitaire de détection (déjà créé)

2. **`creative-studio-ui/src/services/llmConfigService.ts`**
   - Intégration de la détection automatique
   - Logs détaillés

## 💡 Résumé

**Avant**:
```typescript
model: 'gemma2:2b' // Hardcodé, ne fonctionne pas si pas installé
```

**Après**:
```typescript
// Détection automatique
const suggestion = await suggestBestModel();
model: suggestion.model // Utilise ce qui est réellement installé
```

---

**Date**: 2026-01-20  
**Statut**: ✅ Implémenté  
**Impact**: Majeur - Résout tous les problèmes de modèles inexistants
