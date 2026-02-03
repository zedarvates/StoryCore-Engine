# Guide de Téléchargement des Modèles Locaux

## 🚀 Démarrage Rapide

### Étape 1 : Démarrer Ollama
```bash
ollama serve
```
Laissez cette fenêtre ouverte pendant le téléchargement.

### Étape 2 : Ouvrir la Console du Navigateur
1. Dans l'application, appuyez sur **F12**
2. Cliquez sur l'onglet **Console**
3. Gardez cette fenêtre ouverte pour voir la progression

### Étape 3 : Télécharger un Modèle
1. Allez dans **Settings** → **LLM Configuration**
2. Sélectionnez **Local LLM**
3. Cliquez sur **Download** à côté du modèle souhaité
4. Observez la progression dans la console et dans l'interface

## 📊 Comprendre la Progression

### Dans l'Interface
- **Bouton "Download"** → Le modèle n'est pas installé
- **"Downloading... X%"** → Téléchargement en cours
- **Barre de progression** → Pourcentage téléchargé
- **Bouton "Installed"** → Modèle prêt à utiliser

### Dans la Console (F12)
Vous devriez voir des messages comme :
```
Starting download for model: gemma3:1b
Download progress data: {status: "downloading", completed: 1048576, total: 1610612736}
Download progress for gemma3:1b: {progress: 15.5, ...}
Download progress for gemma3:1b: {progress: 32.8, ...}
Model download completed successfully
```

## ❌ Problèmes Courants

### Problème 1 : "Ollama is not running"
**Cause :** Ollama n'est pas démarré

**Solution :**
```bash
# Ouvrir un terminal et exécuter :
ollama serve
```

### Problème 2 : Le téléchargement reste à 0%
**Causes possibles :**
1. Ollama n'est pas démarré
2. Problème de connexion réseau
3. Le modèle est déjà en cours de téléchargement dans Ollama
4. Le nom du modèle n'existe pas (ex: gemma3:7b n'existe pas, utilisez gemma2:9b)

**Solutions :**
```bash
# 1. Vérifier qu'Ollama fonctionne
curl http://localhost:11434/api/tags

# 2. Vérifier les téléchargements en cours
ollama list

# 3. Essayer de télécharger manuellement
ollama pull gemma2:2b

# 4. Vérifier que le modèle existe
# Modèles valides : gemma2:2b, gemma2:9b, llama3.1:8b, mistral:7b, phi3:mini
```

### Problème 3 : Erreur CORS dans la console
**Message :** `Access to fetch at 'http://localhost:11434' has been blocked by CORS policy`

**Solutions :**
1. Redémarrer Ollama :
   ```bash
   # Arrêter Ollama (Ctrl+C dans le terminal)
   # Puis redémarrer
   ollama serve
   ```

2. Vérifier la version d'Ollama :
   ```bash
   ollama --version
   # Doit être >= 0.1.0
   ```

### Problème 4 : Le téléchargement est très lent
**C'est normal !** Les modèles sont volumineux :
- **Gemma 2 2B** : 1.6 GB (~5-10 minutes)
- **Phi 3 Mini** : 2.3 GB (~7-12 minutes)
- **Mistral 7B** : 4.1 GB (~12-25 minutes)
- **Llama 3.1 8B** : 4.7 GB (~15-30 minutes)
- **Gemma 2 9B** : 5.5 GB (~18-35 minutes)

La vitesse dépend de votre connexion internet.

### Problème 5 : Erreur "Failed to download model"
**Solutions :**
1. Vérifier l'espace disque disponible
2. Vérifier la connexion internet
3. Essayer un modèle plus petit d'abord (Gemma 3 1B)
4. Redémarrer Ollama

## 🔍 Diagnostic Avancé

### Vérifier l'état d'Ollama
```bash
# Lister les modèles installés
ollama list

# Tester la connexion
curl http://localhost:11434/api/tags

# Voir les logs d'Ollama
# (dans le terminal où vous avez lancé "ollama serve")
```

### Télécharger manuellement via CLI
Si le téléchargement via l'interface ne fonctionne pas :
```bash
# Télécharger directement avec Ollama
ollama pull gemma2:2b

# Une fois téléchargé, rafraîchir l'interface
# Le modèle devrait apparaître comme "Installed"
```

### Nettoyer et réessayer
```bash
# Supprimer un modèle partiellement téléchargé
ollama rm gemma2:2b

# Réessayer le téléchargement
ollama pull gemma2:2b
```

## 💡 Conseils

### Choisir le bon modèle
| Modèle | Taille | RAM Min | Utilisation |
|--------|--------|---------|-------------|
| Gemma 2 2B | 1.6 GB | 2 GB | Tests rapides, tâches simples |
| Gemma 2B | 1.4 GB | 2 GB | Modèle original, léger et efficace |
| Phi 3 Mini | 2.3 GB | 4 GB | Compact mais capable, bon pour débuter |
| Mistral 7B | 4.1 GB | 8 GB | Rapide et efficace, production |
| Llama 3.1 8B | 4.7 GB | 8 GB | Excellent pour code et raisonnement |
| Gemma 2 9B | 5.5 GB | 8 GB | Meilleur équilibre qualité/taille |
| Llama 3.1 70B | 40 GB | 48 GB | Performance maximale (nécessite GPU) |

### Recommandations
1. **Commencez petit** : Téléchargez d'abord **Gemma 2 2B** ou **Phi 3 Mini** pour tester
2. **Pour usage général** : **Llama 3.1 8B** ou **Gemma 2 9B** sont excellents
3. **Pour le code** : **Llama 3.1 8B** est particulièrement bon
4. **Patience** : Les gros modèles prennent du temps
5. **Espace disque** : Vérifiez que vous avez assez d'espace
6. **Gardez Ollama ouvert** : Ne fermez pas le terminal pendant le téléchargement

## 📝 Logs Utiles

### Logs Normaux (Tout va bien)
```
Starting download for model: gemma2:2b
Download progress data: {status: "downloading", completed: 524288, total: 1677721600}
Download progress for gemma2:2b: {progress: 3.1, downloadedBytes: 524288, totalBytes: 1677721600}
Download progress data: {status: "downloading", completed: 1048576, total: 1677721600}
Download progress for gemma2:2b: {progress: 6.2, downloadedBytes: 1048576, totalBytes: 1677721600}
...
Download progress data: {status: "success"}
Model download completed successfully
Model gemma2:2b downloaded successfully
```

### Logs d'Erreur
```
Error in handleDownloadModel: Error: Ollama is not running
→ Solution : Démarrer Ollama avec "ollama serve"

Failed to download model: Failed to fetch
→ Solution : Vérifier la connexion réseau et qu'Ollama est démarré

Failed to download model: pull model manifest: file does not exist
→ Solution : Le modèle n'existe pas. Vérifier le nom (ex: gemma2:2b, pas gemma3:7b)

Failed to download model: 404 Not Found
→ Solution : Vérifier le nom du modèle ou essayer "ollama pull <model>"
```

## 🆘 Besoin d'Aide ?

Si aucune de ces solutions ne fonctionne :

1. **Vérifier les logs** : Ouvrez la console (F12) et copiez les messages d'erreur
2. **Vérifier Ollama** : Assurez-vous qu'Ollama fonctionne correctement
3. **Tester manuellement** : Essayez `ollama pull gemma3:1b` dans le terminal
4. **Redémarrer** : Redémarrez Ollama et l'application

## ✅ Checklist de Dépannage

- [ ] Ollama est installé (`ollama --version`)
- [ ] Ollama est en cours d'exécution (`ollama serve`)
- [ ] Le port 11434 est accessible (`curl http://localhost:11434/api/tags`)
- [ ] Connexion internet active
- [ ] Espace disque suffisant (au moins 10 GB libre)
- [ ] Console du navigateur ouverte (F12) pour voir les logs
- [ ] Pas d'erreur CORS dans la console
- [ ] Pas d'autre téléchargement Ollama en cours

Si tous ces points sont verts et que ça ne fonctionne toujours pas, essayez de télécharger manuellement avec `ollama pull` puis rafraîchissez l'interface.
