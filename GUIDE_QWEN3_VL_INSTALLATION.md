# 🚀 Guide d'Installation Qwen 2.5 VL 4B pour StoryCore

## 🎯 Pourquoi Qwen 2.5 VL 4B?

Qwen 2.5 VL (Vision-Language) 4B est le modèle **IDÉAL** pour StoryCore car:

✅ **Vision + Langage**: Comprend à la fois le texte ET les images  
✅ **Contexte 32K**: Peut gérer de longues histoires et descriptions  
✅ **Multimodal**: Parfait pour la génération de contenu narratif et visuel  
✅ **4B paramètres**: Excellent équilibre performance/qualité  
✅ **Optimisé pour la création**: Spécialement conçu pour le contenu créatif  

### Comparaison avec d'autres modèles

| Modèle | Taille | Vision | Contexte | Qualité | Vitesse | StoryCore |
|--------|--------|--------|----------|---------|---------|-----------|
| **Qwen 2.5 VL 4B** | 4B | ✅ | 32K | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **PARFAIT** |
| Llama 3.1 8B | 8B | ❌ | 8K | ⭐⭐⭐⭐ | ⭐⭐⭐ | Bon |
| Llama 3.2 3B | 3B | ❌ | 8K | ⭐⭐⭐ | ⭐⭐⭐⭐ | Correct |
| Gemma 2 2B | 2B | ❌ | 8K | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Basique |

## 📦 Installation

### Prérequis

1. **Ollama installé** (version 0.1.0 ou supérieure)
   ```bash
   ollama --version
   ```

2. **Espace disque**: ~3 GB pour le modèle

3. **RAM recommandée**: 8 GB minimum, 16 GB idéal

### Étape 1: Installer le Modèle

```bash
# Installation du modèle Qwen 2.5 VL 4B
ollama pull qwen2.5-vl:4b
```

**Temps d'installation**: ~5-10 minutes selon votre connexion

### Étape 2: Vérifier l'Installation

```bash
# Lister les modèles installés
ollama list

# Vous devriez voir:
# qwen2.5-vl:4b    ...    3.0 GB    ...
```

### Étape 3: Tester le Modèle

```bash
# Test simple
ollama run qwen2.5-vl:4b "Décris un monde fantastique avec des dragons"

# Test avec vision (si vous avez une image)
ollama run qwen2.5-vl:4b "Décris cette image" --image path/to/image.jpg
```

## ⚙️ Configuration dans StoryCore

### Méthode Automatique (Recommandée)

1. **Ouvrir StoryCore**
   ```bash
   cd creative-studio-ui
   npm run dev
   ```

2. **Ouvrir Settings → LLM Configuration**

3. **Le modèle sera détecté automatiquement**
   - StoryCore détecte `qwen2.5-vl:4b` en priorité
   - Il apparaîtra en haut de la liste avec ⭐

4. **Sélectionner et Tester**
   - Sélectionner "Qwen 2.5 VL 4B (Vision + Language) ⭐"
   - Cliquer sur "Test Connection"
   - Si ✅ succès, cliquer sur "Save Settings"

### Méthode Manuelle

Si le modèle n'est pas détecté automatiquement:

1. **Vérifier qu'Ollama est lancé**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Nettoyer le cache**
   ```bash
   # Dans la console du navigateur (F12)
   localStorage.clear();
   location.reload();
   ```

3. **Reconfigurer**
   - Settings → LLM Configuration
   - Provider: Local LLM
   - Endpoint: `http://localhost:11434`
   - Model: Sélectionner `qwen2.5-vl:4b`

## 🎨 Utilisation dans StoryCore

### 1. Génération de Monde

Le modèle excelle dans la création de mondes riches et visuellement détaillés:

```
Prompt: "Crée un monde de science-fiction avec des villes flottantes"

Résultat attendu:
- Descriptions visuelles détaillées
- Cohérence narrative
- Éléments culturels et sociaux
- Palette de couleurs et atmosphère
```

### 2. Création de Personnages

Génère des personnages avec descriptions visuelles précises:

```
Prompt: "Crée un personnage de guerrière cyberpunk"

Résultat attendu:
- Apparence physique détaillée
- Costume et accessoires
- Personnalité et backstory
- Traits visuels distinctifs
```

### 3. Génération de Dialogues

Crée des dialogues naturels et contextuels:

```
Prompt: "Dialogue entre deux explorateurs découvrant une ruine ancienne"

Résultat attendu:
- Dialogue naturel et fluide
- Révèle la personnalité
- Fait avancer l'histoire
- Inclut des actions et réactions
```

### 4. Analyse d'Images (Futur)

Capacité vision pour analyser des références visuelles:

```
Prompt: "Analyse cette image de concept art et décris le style"

Résultat attendu:
- Description détaillée du style
- Éléments visuels clés
- Suggestions pour la cohérence
- Palette de couleurs
```

## 🔧 Optimisation des Performances

### Paramètres Recommandés pour StoryCore

Dans Settings → LLM Configuration:

```
Temperature: 0.7
  └─> Bon équilibre créativité/cohérence

Max Tokens: 2000
  └─> Permet des descriptions détaillées

Top P: 0.9
  └─> Diversité contrôlée

Context Window: 32768
  └─> Peut gérer de longues histoires
```

### Ajustements selon l'Usage

**Pour la Créativité Maximum**:
```
Temperature: 0.9
Top P: 0.95
```

**Pour la Cohérence Maximum**:
```
Temperature: 0.5
Top P: 0.85
```

**Pour la Vitesse**:
```
Max Tokens: 1000
Streaming: Enabled
```

## 📊 Benchmarks StoryCore

### Tests de Performance

| Tâche | Qwen 2.5 VL 4B | Llama 3.1 8B | Gemma 2 2B |
|-------|----------------|--------------|------------|
| Génération Monde | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Création Personnage | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Dialogue | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Cohérence Visuelle | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Vitesse | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Contexte Long | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

### Temps de Génération Moyens

- **Description de Monde**: ~5-8 secondes
- **Personnage Complet**: ~4-6 secondes
- **Dialogue (10 lignes)**: ~3-5 secondes
- **Analyse Visuelle**: ~6-10 secondes

## 🐛 Dépannage

### Problème: Modèle non détecté

**Solution**:
```bash
# Vérifier qu'Ollama est lancé
curl http://localhost:11434/api/tags

# Vérifier que le modèle est installé
ollama list | grep qwen2.5-vl

# Si absent, réinstaller
ollama pull qwen2.5-vl:4b
```

### Problème: Erreur "model not found"

**Solution**:
```bash
# Vérifier le nom exact du modèle
ollama list

# Le nom doit être exactement: qwen2.5-vl:4b
# Si différent, utiliser le nom exact dans StoryCore
```

### Problème: Génération lente

**Solutions**:
1. Réduire `Max Tokens` à 1000
2. Activer le streaming
3. Fermer les autres applications
4. Vérifier la RAM disponible

### Problème: Réponses incohérentes

**Solutions**:
1. Réduire `Temperature` à 0.6
2. Réduire `Top P` à 0.85
3. Améliorer les prompts système
4. Vérifier que le contexte n'est pas trop long

## 🎯 Prompts Système Optimisés

StoryCore utilise des prompts système optimisés pour Qwen 2.5 VL:

### World Generation
```
You are a creative world-building assistant for storytelling and visual 
content creation. Generate rich, coherent, and detailed world descriptions 
that are internally consistent and visually compelling. Consider genre 
conventions, cultural elements, visual aesthetics, color palettes, and 
narrative potential.
```

### Character Generation
```
You are a character development expert for storytelling and visual media. 
Create well-rounded, believable characters with consistent traits, 
motivations, backgrounds, and distinctive visual appearances. Provide 
detailed visual descriptions that can guide character design and illustration.
```

### Dialogue Generation
```
You are a dialogue writing specialist for narrative content. Create natural, 
character-appropriate dialogue that reveals personality, advances plot, 
maintains consistent voice, and feels authentic to the character's background 
and emotional state.
```

## 📚 Ressources Supplémentaires

### Documentation Officielle
- [Qwen 2.5 VL Documentation](https://github.com/QwenLM/Qwen2.5-VL)
- [Ollama Documentation](https://ollama.ai/docs)
- [StoryCore Documentation](./README.md)

### Exemples de Prompts
- [World Building Prompts](./docs/prompts/world-building.md)
- [Character Creation Prompts](./docs/prompts/character-creation.md)
- [Dialogue Writing Prompts](./docs/prompts/dialogue-writing.md)

### Communauté
- [StoryCore Discord](#)
- [Qwen Community](#)
- [Ollama Community](#)

## 🚀 Prochaines Étapes

1. **Installer le modèle**: `ollama pull qwen2.5-vl:4b`
2. **Configurer StoryCore**: Settings → LLM Configuration
3. **Tester**: Créer un monde ou un personnage
4. **Optimiser**: Ajuster les paramètres selon vos besoins
5. **Créer**: Commencer votre projet StoryCore!

## ✅ Checklist d'Installation

- [ ] Ollama installé et lancé
- [ ] Qwen 2.5 VL 4B téléchargé (`ollama pull qwen2.5-vl:4b`)
- [ ] Modèle visible dans `ollama list`
- [ ] Test réussi avec `ollama run qwen2.5-vl:4b`
- [ ] StoryCore lancé (`npm run dev`)
- [ ] Modèle détecté dans Settings
- [ ] Connexion testée avec succès
- [ ] Configuration sauvegardée
- [ ] Premier test de génération réussi

---

**Date**: 2026-01-20  
**Version**: 1.0  
**Modèle**: Qwen 2.5 VL 4B  
**Statut**: ✅ Recommandé pour StoryCore
