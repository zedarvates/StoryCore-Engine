# 🚀 Quick Reference - Gestion des Modèles Locaux

## ⚡ Démarrage rapide (30 secondes)

```bash
# 1. Installer Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Démarrer Ollama
ollama serve

# 3. Dans StoryCore-Engine
Settings → LLM Configuration → Provider: Local → Télécharger un modèle → Save
```

## 📊 Tableau de sélection rapide

| Votre RAM | Modèle recommandé | Taille | Temps de téléchargement* |
|-----------|-------------------|--------|--------------------------|
| 2-4 GB    | Gemma 3 1B       | 1.5GB  | ~2 min                   |
| 4-8 GB    | Gemma 3 3B       | 3.5GB  | ~4 min                   |
| 8-16 GB   | Llama 3 8B       | 4.7GB  | ~5 min                   |
| 16-32 GB  | Phi 3 Medium     | 7.9GB  | ~8 min                   |
| 32+ GB + GPU | Llama 3 70B   | 40GB   | ~40 min                  |

*Avec connexion 100 Mbps

## 🎯 Commandes essentielles

### Via l'interface

```
Télécharger:  Clic sur "Download" dans la carte du modèle
Sélectionner: Clic sur "Select" ou sur la carte
Supprimer:    Clic sur l'icône 🗑️
Filtrer:      Utiliser les boutons de famille en haut
```

### Via CLI (alternative)

```bash
# Lister les modèles disponibles
ollama list

# Télécharger un modèle
ollama pull gemma3:3b

# Supprimer un modèle
ollama rm gemma3:3b

# Tester un modèle
ollama run gemma3:3b "Hello, how are you?"
```

## 🔍 Diagnostic rapide

### Problème: "Ollama is not running"

```bash
# Vérifier l'installation
ollama --version

# Démarrer Ollama
ollama serve

# Vérifier le port
curl http://localhost:11434/api/tags
```

### Problème: Téléchargement lent

```bash
# Vérifier la connexion
ping ollama.ai

# Télécharger via CLI (plus rapide parfois)
ollama pull gemma3:3b

# Vérifier l'espace disque
df -h
```

### Problème: Modèle lent

```bash
# Vérifier la RAM utilisée
top

# Passer à un modèle plus petit
# Gemma 3 7B → Gemma 3 3B → Gemma 3 1B
```

## 📦 Catalogue rapide

### Gemma 3 (Google)
```
1B:  Rapide, léger, tâches basiques
3B:  Équilibré, usage général
7B:  Puissant, tâches complexes
```

### Llama 3 (Meta)
```
8B:  Excellent, usage général
70B: Top qualité, nécessite GPU
```

### Mistral (Mistral AI)
```
7B:  Rapide, efficace, production
```

### Phi 3 (Microsoft)
```
Mini:   Compact, surprenant
Medium: Qualité excellente
```

### Qwen 2 (Alibaba)
```
7B: Multilingue, international
```

## 🎨 Badges et indicateurs

```
⚡ Recommended  → Recommandé pour votre système
✓ Installed    → Déjà téléchargé
💾 Size        → Taille du modèle
🖥️ RAM         → RAM requise
⚡ GPU         → GPU nécessaire
🗑️             → Supprimer
```

## 💡 Astuces pro

### 1. Commencer petit
```
Toujours tester avec Gemma 3 1B d'abord
Puis augmenter si nécessaire
```

### 2. Surveiller la RAM
```
Garder 20-30% de RAM libre
Fermer les autres applications
```

### 3. Utiliser les filtres
```
"Installed Only" pour voir rapidement vos modèles
Filtres de famille pour explorer
```

### 4. Télécharger la nuit
```
Les gros modèles (70B) prennent du temps
Lancer le téléchargement avant de dormir
```

### 5. Tester avant de sauvegarder
```
Utiliser "Test Connection" avant "Save Settings"
Vérifier que le modèle répond bien
```

## 🔗 Liens utiles

```
Site Ollama:        https://ollama.ai
Documentation:      https://github.com/ollama/ollama
Modèles disponibles: https://ollama.ai/library
Support:            https://github.com/ollama/ollama/issues
```

## 📱 Raccourcis clavier

```
Ctrl/Cmd + S    → Sauvegarder les paramètres
Esc             → Fermer les dialogues
Tab             → Naviguer entre les champs
Enter           → Confirmer les actions
```

## 🎯 Checklist de démarrage

```
☐ Ollama installé
☐ Ollama en cours d'exécution (ollama serve)
☐ Espace disque suffisant (vérifier avec df -h)
☐ RAM disponible (vérifier avec top/htop)
☐ Connexion internet stable
☐ Settings → LLM Configuration ouvert
☐ Provider "Local" sélectionné
☐ Modèle téléchargé
☐ Modèle sélectionné
☐ Configuration sauvegardée
☐ Test de génération réussi
```

## 🚨 Erreurs courantes

### "No models found"
```
Solution: Télécharger au moins un modèle
```

### "Connection failed"
```
Solution: Vérifier qu'Ollama est démarré (ollama serve)
```

### "Out of memory"
```
Solution: Choisir un modèle plus petit ou fermer d'autres apps
```

### "Download stuck at X%"
```
Solution: Annuler et réessayer, ou utiliser CLI (ollama pull)
```

### "Model not responding"
```
Solution: Redémarrer Ollama (killall ollama && ollama serve)
```

## 📊 Comparaison rapide

### Vitesse vs Qualité

```
Rapide:  Gemma 3 1B, Phi 3 Mini
Moyen:   Gemma 3 3B, Mistral 7B
Lent:    Llama 3 8B, Gemma 3 7B
Très lent: Llama 3 70B, Phi 3 Medium
```

### Taille vs Performance

```
Petit (1-3B):   Bon pour tâches simples
Moyen (7-8B):   Excellent pour usage général
Grand (70B+):   Meilleur qualité, nécessite ressources
```

### Spécialisation

```
Général:     Gemma 3, Llama 3
Code:        Mistral 7B, Llama 3 8B
Multilingue: Qwen 2 7B
Compact:     Phi 3 Mini, Gemma 3 1B
```

## 🎓 Progression recommandée

### Débutant
```
1. Installer Ollama
2. Télécharger Gemma 3 1B
3. Tester avec des prompts simples
4. Se familiariser avec l'interface
```

### Intermédiaire
```
1. Essayer Gemma 3 3B ou Llama 3 8B
2. Comparer les performances
3. Ajuster les paramètres (température, etc.)
4. Utiliser dans les wizards
```

### Avancé
```
1. Tester plusieurs modèles
2. Optimiser pour votre cas d'usage
3. Utiliser les modèles spécialisés
4. Intégrer dans des workflows personnalisés
```

## 💾 Gestion de l'espace disque

### Vérifier l'espace
```bash
# Linux/Mac
df -h ~/.ollama

# Windows
dir %USERPROFILE%\.ollama
```

### Nettoyer
```bash
# Supprimer les modèles non utilisés
ollama rm <model-name>

# Lister pour voir ce qui prend de la place
ollama list
```

### Optimiser
```
- Garder seulement 2-3 modèles actifs
- Supprimer les anciens modèles
- Utiliser des modèles plus petits si possible
```

## 🔄 Mise à jour

### Mettre à jour Ollama
```bash
# Mac/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Ou via package manager
brew upgrade ollama  # Mac
```

### Mettre à jour un modèle
```bash
# Re-télécharger la dernière version
ollama pull gemma3:3b
```

---

**Gardez cette référence à portée de main pour un accès rapide aux informations essentielles!**
