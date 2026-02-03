# Vérifier les Modèles Ollama Installés

## 🎯 Problème

L'application essaie d'utiliser `gemma2:2b` mais ce modèle n'existe pas sur votre machine.

## ✅ Solution: Vérifier et Installer les Bons Modèles

### Étape 1: Voir les Modèles Installés

Ouvrez un terminal et exécutez:

```bash
ollama list
```

Cela affichera tous les modèles installés sur votre machine.

### Étape 2: Identifier un Modèle à Utiliser

Regardez la liste et notez le nom d'un modèle. Par exemple:
- `llama3.2:1b`
- `llama3.2:3b`
- `llama3.1:8b`
- `mistral:7b`
- `phi3:mini`
- etc.

### Étape 3: Configurer l'Application

#### Option A: Via l'Interface (Recommandé)

1. Dans StoryCore, cliquez sur l'icône ⚙️ (Settings) dans le chatbox
2. Ou allez dans: **Menu → Settings → LLM Configuration**
3. Dans le champ "Model", entrez le nom EXACT du modèle que vous avez vu dans `ollama list`
4. Cliquez "Save"
5. Redémarrez l'application

#### Option B: Installer un Modèle Recommandé

Si vous n'avez aucun modèle installé, installez-en un:

**Modèles Légers (Recommandés pour commencer)**:
```bash
ollama pull llama3.2:1b    # 1.3 GB - Ultra rapide
ollama pull llama3.2:3b    # 2.0 GB - Bon équilibre
ollama pull phi3:mini      # 2.3 GB - Performant
```

**Modèles Plus Puissants**:
```bash
ollama pull llama3.1:8b    # 4.7 GB - Haute qualité
ollama pull mistral:7b     # 4.1 GB - Très bon
```

### Étape 4: Vérifier que le Modèle Fonctionne

Testez le modèle directement:

```bash
ollama run llama3.2:1b "Hello, how are you?"
```

Si vous obtenez une réponse, le modèle fonctionne!

## 🔧 Correction Appliquée

J'ai changé le modèle par défaut dans le code de `gemma2:2b` vers `llama3.2:1b`.

**Mais attention**: Si vous avez déjà sauvegardé une configuration avec `gemma2:2b`, l'application continuera à l'utiliser jusqu'à ce que vous la changiez dans Settings.

## 📋 Pourquoi gemma2:2b N'existe Pas?

Le modèle `gemma2:2b` n'existe pas dans Ollama. Les modèles Gemma 2 disponibles sont:
- `gemma2:9b` (9 milliards de paramètres)
- `gemma2:27b` (27 milliards de paramètres)

Il n'y a pas de version 2B de Gemma 2.

## 🎯 Action Immédiate

1. **Vérifier les modèles installés**:
   ```bash
   ollama list
   ```

2. **Si vous avez des modèles**:
   - Ouvrir Settings → LLM Configuration
   - Changer le modèle vers un qui existe
   - Sauvegarder

3. **Si vous n'avez aucun modèle**:
   ```bash
   ollama pull llama3.2:1b
   ```
   Puis redémarrer l'application

## 🔄 Après Configuration

Une fois le bon modèle configuré:
- ✅ Le chatbox fonctionnera
- ✅ Les wizards fonctionneront
- ✅ Plus d'erreurs "model not found"

---

**Date**: 2026-01-20  
**Statut**: ✅ Correction appliquée - Configuration utilisateur requise
