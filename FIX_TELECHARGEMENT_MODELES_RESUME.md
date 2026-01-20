# Fix: Téléchargement des Modèles Ollama

## 🎯 Problème

```
❌ LLM Error: model 'gemma2:2b' not found
```

Le modèle `gemma2:2b` n'est pas installé dans Ollama.

## ✅ Solution Immédiate

### Option 1: Installer le modèle (Recommandé)

Ouvrez un terminal et exécutez:

```bash
ollama pull gemma2:2b
```

Cela va télécharger le modèle (~1.6 GB). Une fois terminé, redémarrez l'application.

### Option 2: Utiliser un modèle déjà installé

Si vous avez déjà d'autres modèles installés:

1. **Vérifier les modèles installés**:
   ```bash
   ollama list
   ```

2. **Changer le modèle dans Settings**:
   - Cliquer sur l'icône ⚙️ (Settings) dans le chatbox
   - Ou aller dans Settings → LLM Configuration
   - Changer le modèle vers un modèle installé (ex: `llama3.2:1b`, `llama3.2:3b`)

## 📋 Modèles Recommandés

### Modèles Légers (Rapides)
```bash
ollama pull gemma2:2b      # 1.6 GB - Très rapide
ollama pull llama3.2:1b    # 1.3 GB - Ultra rapide
```

### Modèles Équilibrés (Qualité/Vitesse)
```bash
ollama pull llama3.2:3b    # 2.0 GB - Bon équilibre
ollama pull phi3:mini      # 2.3 GB - Performant
```

### Modèles Puissants (Meilleure Qualité)
```bash
ollama pull llama3.1:8b    # 4.7 GB - Haute qualité
ollama pull mistral:7b     # 4.1 GB - Très bon
```

## 🔧 Vérification

Après installation, vérifier que le modèle est disponible:

```bash
ollama list
```

Vous devriez voir:
```
NAME              ID              SIZE      MODIFIED
gemma2:2b         abc123def456    1.6 GB    2 minutes ago
```

## 🚀 Test Rapide

Tester le modèle directement:

```bash
ollama run gemma2:2b "Hello, how are you?"
```

Si ça fonctionne, le chatbox et les wizards fonctionneront aussi.

## ⚠️ Warnings Secondaires (Peuvent être Ignorés)

### 1. Dialog Description Warning
```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}
```
- **Impact**: Aucun sur la fonctionnalité
- **Cause**: Radix UI accessibility check
- **Action**: Peut être ignoré (problème cosmétique)

### 2. setTimeout Violation
```
[Violation] 'setTimeout' handler took 80ms
```
- **Impact**: Aucun sur la fonctionnalité
- **Cause**: Chargement du projet
- **Action**: Peut être ignoré (performance acceptable)

## 📊 Résumé

| Problème | Priorité | Solution |
|----------|----------|----------|
| Model not found | 🔴 Critique | `ollama pull gemma2:2b` |
| Dialog warnings | 🟡 Cosmétique | Ignorer |
| setTimeout violation | 🟢 Info | Ignorer |

## 🎯 Action Immédiate

**Exécutez maintenant**:
```bash
ollama pull gemma2:2b
```

Puis redémarrez l'application. Le chatbox et les wizards fonctionneront.

---

**Date**: 2026-01-20  
**Statut**: ✅ Solution fournie  
**Temps estimé**: 2-5 minutes (téléchargement)
