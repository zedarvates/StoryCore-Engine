# Correction des Noms de Modèles Ollama

## ❌ Problème
L'application utilisait des noms de modèles incorrects qui n'existent pas dans Ollama :
- `gemma3:1b` ❌ (n'existe pas)
- `gemma3:3b` ❌ (n'existe pas)
- `gemma3:7b` ❌ (n'existe pas)

**Erreur obtenue :**
```
Failed to download model: Error: pull model manifest: file does not exist
```

## ✅ Solution
Mise à jour avec les noms corrects des modèles disponibles sur Ollama.

## 📋 Modèles Corrigés

### Famille Gemma

#### Avant (Incorrect)
```typescript
{ id: 'gemma3:1b', name: 'gemma3:1b', displayName: 'Gemma 3 1B' }
{ id: 'gemma3:3b', name: 'gemma3:3b', displayName: 'Gemma 3 3B' }
{ id: 'gemma3:7b', name: 'gemma3:7b', displayName: 'Gemma 3 7B' }
```

#### Après (Correct)
```typescript
// Gemma 2 (dernière version)
{ id: 'gemma2:2b', name: 'gemma2:2b', displayName: 'Gemma 2 2B' }
{ id: 'gemma2:9b', name: 'gemma2:9b', displayName: 'Gemma 2 9B' }
{ id: 'gemma2:27b', name: 'gemma2:27b', displayName: 'Gemma 2 27B' }

// Gemma 1 (version originale)
{ id: 'gemma:2b', name: 'gemma:2b', displayName: 'Gemma 2B' }
{ id: 'gemma:7b', name: 'gemma:7b', displayName: 'Gemma 7B' }
```

### Famille Llama

#### Ajouté
```typescript
// Llama 3.1 (dernière version avec contexte 128K)
{ id: 'llama3.1:8b', name: 'llama3.1:8b', displayName: 'Llama 3.1 8B' }
{ id: 'llama3.1:70b', name: 'llama3.1:70b', displayName: 'Llama 3.1 70B' }

// Llama 3 (version originale)
{ id: 'llama3:8b', name: 'llama3:8b', displayName: 'Llama 3 8B' }
{ id: 'llama3:70b', name: 'llama3:70b', displayName: 'Llama 3 70B' }
```

## 📊 Liste Complète des Modèles Disponibles

| Modèle | Taille | RAM Min | Context | Description |
|--------|--------|---------|---------|-------------|
| **gemma2:2b** | 1.6 GB | 2 GB | 8K | Léger, rapide, tâches simples |
| **gemma:2b** | 1.4 GB | 2 GB | 8K | Original Gemma, très léger |
| **phi3:mini** | 2.3 GB | 4 GB | 4K | Microsoft, compact mais capable |
| **mistral:7b** | 4.1 GB | 8 GB | 8K | Rapide, efficace, production |
| **qwen2:7b** | 4.4 GB | 8 GB | 32K | Multilingue, grand contexte |
| **llama3.1:8b** | 4.7 GB | 8 GB | 128K | Excellent code, énorme contexte |
| **llama3:8b** | 4.7 GB | 8 GB | 8K | Meta, usage général |
| **gemma:7b** | 4.8 GB | 8 GB | 8K | Original Gemma, équilibré |
| **gemma2:9b** | 5.5 GB | 8 GB | 8K | Meilleur équilibre qualité/taille |
| **phi3:medium** | 7.9 GB | 16 GB | 4K | Microsoft, haute qualité |
| **gemma2:27b** | 16 GB | 24 GB | 8K | Très haute qualité |
| **llama3.1:70b** | 40 GB | 48 GB | 128K | Performance maximale (GPU) |
| **llama3:70b** | 40 GB | 48 GB | 8K | Meta large (GPU) |

## 🎯 Recommandations par Cas d'Usage

### Pour Débuter / Tests Rapides
- **gemma2:2b** (1.6 GB) - Rapide à télécharger, bon pour tester
- **phi3:mini** (2.3 GB) - Compact mais étonnamment capable

### Usage Général / Production
- **llama3.1:8b** (4.7 GB) - ⭐ Meilleur choix global, contexte 128K
- **gemma2:9b** (5.5 GB) - Excellent équilibre qualité/taille
- **mistral:7b** (4.1 GB) - Rapide et efficace

### Développement / Code
- **llama3.1:8b** (4.7 GB) - ⭐ Excellent pour le code
- **qwen2:7b** (4.4 GB) - Bon pour code multilingue

### Multilingue / International
- **qwen2:7b** (4.4 GB) - Spécialisé multilingue
- **llama3.1:8b** (4.7 GB) - Bon support multilingue

### Haute Performance (nécessite GPU)
- **llama3.1:70b** (40 GB) - Performance maximale
- **gemma2:27b** (16 GB) - Alternative plus légère

## 🔍 Comment Vérifier les Modèles Disponibles

### Via Ollama CLI
```bash
# Lister les modèles installés
ollama list

# Rechercher un modèle
ollama search gemma

# Voir les détails d'un modèle
ollama show gemma2:2b
```

### Via le Site Ollama
Visitez : https://ollama.com/library

Modèles populaires :
- https://ollama.com/library/gemma2
- https://ollama.com/library/llama3.1
- https://ollama.com/library/mistral
- https://ollama.com/library/phi3
- https://ollama.com/library/qwen2

## 📝 Changements dans le Code

### Fichier Modifié
`creative-studio-ui/src/services/localModelService.ts`

### Changements Principaux
1. ✅ Supprimé les modèles inexistants (gemma3:*)
2. ✅ Ajouté Gemma 2 (2b, 9b, 27b)
3. ✅ Ajouté Gemma 1 original (2b, 7b)
4. ✅ Ajouté Llama 3.1 (8b, 70b)
5. ✅ Conservé Llama 3 original (8b, 70b)
6. ✅ Mis à jour les tailles et descriptions
7. ✅ Ajouté les contextes corrects (128K pour Llama 3.1)

## ✅ Vérification

### Tester un Modèle
```bash
# Télécharger et tester
ollama pull gemma2:2b
ollama run gemma2:2b "Hello, how are you?"

# Si ça fonctionne, le modèle existe !
```

### Modèles Testés et Validés
- ✅ gemma2:2b
- ✅ gemma2:9b
- ✅ gemma:2b
- ✅ gemma:7b
- ✅ llama3.1:8b
- ✅ llama3:8b
- ✅ mistral:7b
- ✅ phi3:mini
- ✅ qwen2:7b

## 🚨 Erreurs Courantes

### "file does not exist"
**Cause :** Le nom du modèle est incorrect

**Solution :** Utiliser les noms corrects listés ci-dessus

### "model not found"
**Cause :** Typo dans le nom ou version inexistante

**Solution :** Vérifier sur https://ollama.com/library

### "manifest not found"
**Cause :** Le modèle n'existe pas dans le registre Ollama

**Solution :** Utiliser un modèle de la liste officielle

## 📚 Ressources

- **Ollama Library :** https://ollama.com/library
- **Ollama GitHub :** https://github.com/ollama/ollama
- **Documentation :** https://github.com/ollama/ollama/blob/main/docs/README.md

## Status
✅ **CORRIGÉ** - Tous les modèles utilisent maintenant des noms valides disponibles sur Ollama.
