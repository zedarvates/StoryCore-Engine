# Configuration Ollama avec Gemma 3

## Vue d'ensemble

L'application StoryCore est maintenant configurée pour utiliser **Ollama** avec les modèles **Gemma 3** en local. Le système détecte automatiquement les capacités de votre ordinateur et sélectionne le meilleur modèle.

## Modèles Gemma 3 Disponibles

### 1. Gemma 3 1B (Léger)
- **ID**: `gemma3:1b`
- **RAM minimum**: 2 GB
- **RAM recommandée**: 4 GB
- **VRAM minimum**: 1 GB (si GPU)
- **Description**: Modèle le plus petit, réponses rapides, bon pour les tâches basiques
- **Idéal pour**: Ordinateurs portables, machines avec RAM limitée

### 2. Gemma 3 4B (Équilibré) ⭐ Recommandé
- **ID**: `gemma3:4b`
- **RAM minimum**: 6 GB
- **RAM recommandée**: 8 GB
- **VRAM minimum**: 3 GB (si GPU)
- **Description**: Modèle équilibré, bonne qualité et vitesse
- **Idéal pour**: La plupart des ordinateurs modernes

### 3. Gemma 3 12B (Puissant)
- **ID**: `gemma3:12b`
- **RAM minimum**: 16 GB
- **RAM recommandée**: 24 GB
- **VRAM minimum**: 8 GB (si GPU)
- **Description**: Modèle le plus grand, meilleure qualité, réponses plus lentes
- **Idéal pour**: Stations de travail, machines haut de gamme

## Installation d'Ollama

### Windows
1. Téléchargez Ollama depuis [ollama.ai](https://ollama.ai)
2. Installez l'application
3. Ollama démarre automatiquement en arrière-plan

### macOS
```bash
brew install ollama
ollama serve
```

### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
```

## Installation des Modèles Gemma 3

Une fois Ollama installé, ouvrez un terminal et exécutez:

```bash
# Pour le modèle 1B (léger)
ollama pull gemma3:1b

# Pour le modèle 4B (recommandé)
ollama pull gemma3:4b

# Pour le modèle 12B (puissant)
ollama pull gemma3:12b
```

## Sélection Automatique du Modèle

L'application détecte automatiquement:
- **RAM totale et disponible**
- **Présence d'un GPU dédié**
- **VRAM du GPU** (estimation)

Puis sélectionne le **meilleur modèle** compatible avec votre système.

### Exemples de Sélection

| Configuration Système | Modèle Sélectionné | Raison |
|----------------------|-------------------|---------|
| 4 GB RAM, pas de GPU | Gemma 3 1B | RAM limitée |
| 8 GB RAM, GPU 4GB | Gemma 3 4B | Configuration équilibrée |
| 16 GB RAM, GPU 8GB | Gemma 3 12B | Configuration puissante |
| 32 GB RAM, RTX 4090 | Gemma 3 12B | Configuration optimale |

## Configuration dans l'Application

### Initialisation Automatique

Au démarrage de l'application:
1. ✅ Détection des capacités système
2. ✅ Sélection du meilleur modèle
3. ✅ Vérification qu'Ollama est en cours d'exécution
4. ✅ Configuration automatique du service LLM

Vous verrez dans la console:
```
✅ Ollama initialized with Gemma 3 4B
📍 Endpoint: http://localhost:11434
🤖 Model: gemma3:4b
🚀 StoryCore ready with Gemma 3 4B
```

### Configuration Manuelle

Si vous souhaitez changer de modèle manuellement:

1. Ouvrez les **Paramètres** de l'application
2. Allez dans **LLM Configuration**
3. Section **Ollama Settings** affiche:
   - État d'Ollama (en cours / arrêté)
   - Capacités système détectées
   - Modèle recommandé
   - Liste des modèles disponibles
4. Sélectionnez le modèle souhaité
5. Cliquez sur **Appliquer**

## Vérification du Statut

### Dans l'Application
L'interface affiche:
- 🟢 **Ollama is running** - Tout fonctionne
- 🔴 **Ollama is not running** - Ollama doit être démarré

### En Ligne de Commande
```bash
# Vérifier qu'Ollama fonctionne
curl http://localhost:11434/api/tags

# Lister les modèles installés
ollama list

# Tester un modèle
ollama run gemma3:4b "Hello, how are you?"
```

## Dépannage

### Problème: Ollama n'est pas détecté
**Solution**:
1. Vérifiez qu'Ollama est installé: `ollama --version`
2. Démarrez Ollama: `ollama serve`
3. Vérifiez le port: `http://localhost:11434`
4. Cliquez sur **Refresh** dans les paramètres

### Problème: Modèle non installé
**Solution**:
```bash
# Installez le modèle recommandé
ollama pull gemma3:4b
```

### Problème: Réponses lentes
**Solutions**:
1. Utilisez un modèle plus petit (gemma3:1b)
2. Vérifiez que vous avez assez de RAM disponible
3. Fermez les applications gourmandes en mémoire
4. Si vous avez un GPU, vérifiez qu'Ollama l'utilise

### Problème: Erreur de mémoire
**Solutions**:
1. Utilisez un modèle plus petit
2. Augmentez la RAM disponible
3. Vérifiez les recommandations système

## Configuration Avancée

### Changer le Port Ollama
Si Ollama utilise un port différent:

1. Dans les paramètres, modifiez **Ollama Endpoint**
2. Exemple: `http://localhost:8080`
3. Cliquez sur **Refresh**

### Paramètres du Modèle
Les paramètres par défaut sont:
- **Temperature**: 0.7 (créativité modérée)
- **Max Tokens**: 2000 (longueur de réponse)
- **Timeout**: 60 secondes (pour modèles locaux)
- **Streaming**: Activé (réponses progressives)

## Utilisation dans l'Application

Une fois configuré, Ollama est utilisé pour:
- 🌍 **Génération de mondes** (World Wizard)
- 👤 **Création de personnages** (Character Wizard)
- 💬 **Génération de dialogues** (Chat Assistant)
- 📝 **Suggestions de scénarios**
- 🎨 **Descriptions créatives**

## Performance Attendue

### Gemma 3 1B
- ⚡ Très rapide (< 1 seconde par réponse)
- 📊 Qualité: Basique
- 💾 Utilisation RAM: ~2-3 GB

### Gemma 3 4B
- ⚡ Rapide (1-3 secondes par réponse)
- 📊 Qualité: Bonne
- 💾 Utilisation RAM: ~4-6 GB

### Gemma 3 12B
- ⚡ Modéré (3-8 secondes par réponse)
- 📊 Qualité: Excellente
- 💾 Utilisation RAM: ~12-16 GB

## Avantages d'Ollama Local

✅ **Confidentialité**: Vos données restent sur votre machine  
✅ **Pas de coûts**: Aucun frais d'API  
✅ **Hors ligne**: Fonctionne sans internet  
✅ **Rapide**: Pas de latence réseau  
✅ **Personnalisable**: Contrôle total sur les modèles  

## Ressources

- **Site Ollama**: [ollama.ai](https://ollama.ai)
- **Documentation**: [github.com/ollama/ollama](https://github.com/ollama/ollama)
- **Modèles Gemma**: [ollama.ai/library/gemma3](https://ollama.ai/library/gemma3)
- **Support**: [github.com/ollama/ollama/issues](https://github.com/ollama/ollama/issues)

## Notes Importantes

⚠️ **Première utilisation**: Le premier téléchargement d'un modèle peut prendre du temps (1-5 GB selon le modèle)

⚠️ **RAM**: Assurez-vous d'avoir suffisamment de RAM disponible avant de lancer un modèle

⚠️ **GPU**: Si vous avez un GPU NVIDIA, Ollama l'utilisera automatiquement pour accélérer les réponses

✅ **Recommandation**: Commencez avec `gemma3:4b` pour un bon équilibre qualité/performance
