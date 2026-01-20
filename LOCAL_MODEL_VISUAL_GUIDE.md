# Guide Visuel - Gestion des Modèles Locaux

## 🎨 Interface Utilisateur

### 1. Accès à la fonctionnalité

```
┌─────────────────────────────────────────────────────────┐
│  Settings                                               │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┬─────────┬──────────┐                      │
│  │   LLM   │ ComfyUI │ Advanced │                      │
│  └─────────┴─────────┴──────────┘                      │
│                                                         │
│  Provider Selection                                     │
│  ○ OpenAI                                              │
│  ○ Anthropic                                           │
│  ● Local  ← Sélectionner ici                           │
│  ○ Custom                                              │
│                                                         │
│  ↓ Le sélecteur de modèles apparaît automatiquement   │
└─────────────────────────────────────────────────────────┘
```

### 2. Sélecteur de Modèles

```
┌─────────────────────────────────────────────────────────────────┐
│  ℹ️ Local Model Management                                      │
│  Download and manage local LLM models. Models run on your      │
│  machine without requiring API keys.                           │
├─────────────────────────────────────────────────────────────────┤
│  Filtres:                                                       │
│  [All Models] [Gemma] [Llama] [Mistral] [Phi] [Qwen] │ [✓ Installed Only] │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌──────────────────────────┐   │
│  │ Gemma 3 1B        ⚡ Rec │  │ Gemma 3 3B        ✓ Inst │   │
│  │ Lightweight model, fast  │  │ Balanced model, good     │   │
│  │                          │  │                          │   │
│  │ 💾 1.5GB  🖥️ 2GB RAM min │  │ 💾 3.5GB  🖥️ 4GB RAM min │   │
│  │ text-generation, chat    │  │ text-generation, chat    │   │
│  │                          │  │                          │   │
│  │ [📥 Download]            │  │ [✓ Selected] [🗑️]        │   │
│  └──────────────────────────┘  └──────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────┐  ┌──────────────────────────┐   │
│  │ Llama 3 8B               │  │ Mistral 7B               │   │
│  │ Meta's powerful model    │  │ Fast and efficient       │   │
│  │                          │  │                          │   │
│  │ 💾 4.7GB  🖥️ 8GB RAM min │  │ 💾 4.1GB  🖥️ 8GB RAM min │   │
│  │ text-generation, code    │  │ text-generation, code    │   │
│  │                          │  │                          │   │
│  │ [📥 Download]            │  │ [📥 Download]            │   │
│  └──────────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Téléchargement en cours

```
┌──────────────────────────────────────────────┐
│ Gemma 3 7B                    ⚡ Recommended │
│ High-quality model, excellent for complex    │
│                                              │
│ 💾 7GB  🖥️ 8GB RAM min                       │
│ text-generation, chat, advanced-reasoning    │
│                                              │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ Downloading... 45%                           │
│                                              │
│ [⏳ Downloading...]                          │
└──────────────────────────────────────────────┘
```

### 4. Modèle installé et sélectionné

```
┌──────────────────────────────────────────────┐
│ Gemma 3 3B          ⚡ Recommended ✓ Installed│
│ Balanced model, good performance for most    │
│                                              │
│ 💾 3.5GB  🖥️ 4GB RAM min                     │
│ text-generation, chat, reasoning             │
│                                              │
│ [✓ Selected] [🗑️]                            │
└──────────────────────────────────────────────┘
       ↑
   Bordure bleue indiquant la sélection
```

## 🎯 Flux d'utilisation

### Scénario 1: Premier téléchargement

```
1. Ouvrir Settings → LLM Configuration
   │
   ↓
2. Sélectionner "Local" comme provider
   │
   ↓
3. Le sélecteur de modèles apparaît
   │
   ↓
4. Parcourir les modèles disponibles
   │  - Voir les badges "Recommended"
   │  - Vérifier les requis (RAM, taille)
   │  - Lire les descriptions
   │
   ↓
5. Cliquer sur "Download" pour un modèle
   │
   ↓
6. Attendre la fin du téléchargement
   │  - Barre de progression visible
   │  - Pourcentage affiché
   │
   ↓
7. Modèle automatiquement sélectionné
   │
   ↓
8. Cliquer sur "Save Settings"
   │
   ↓
9. ✅ Configuration sauvegardée!
```

### Scénario 2: Changement de modèle

```
1. Ouvrir Settings → LLM Configuration
   │
   ↓
2. Provider "Local" déjà sélectionné
   │
   ↓
3. Voir les modèles installés (badge ✓)
   │
   ↓
4. Cliquer sur un autre modèle installé
   │  OU
   │  Cliquer sur "Select" dans la carte
   │
   ↓
5. Le modèle est sélectionné (bordure bleue)
   │
   ↓
6. Cliquer sur "Save Settings"
   │
   ↓
7. ✅ Nouveau modèle actif!
```

### Scénario 3: Suppression de modèle

```
1. Ouvrir Settings → LLM Configuration
   │
   ↓
2. Trouver un modèle installé
   │
   ↓
3. Cliquer sur l'icône 🗑️ (poubelle)
   │
   ↓
4. Confirmer la suppression
   │  "Are you sure you want to delete...?"
   │
   ↓
5. Modèle supprimé
   │  - Badge "Installed" disparaît
   │  - Bouton "Download" réapparaît
   │  - Espace disque libéré
   │
   ↓
6. Si c'était le modèle sélectionné:
   │  - Sélection effacée
   │  - Choisir un autre modèle
   │
   ↓
7. Sauvegarder les changements
```

## 🎨 Éléments visuels

### Badges

```
⚡ Recommended  → Modèle recommandé pour votre système
✓ Installed    → Modèle déjà téléchargé
💾 1.5GB       → Taille du modèle
🖥️ 2GB RAM min → RAM minimum requise
⚡ GPU Required → GPU nécessaire
```

### États des boutons

```
[📥 Download]        → Modèle non installé
[⏳ Downloading...]  → Téléchargement en cours (désactivé)
[✓ Selected]         → Modèle sélectionné (bleu)
[Select]             → Modèle installé mais non sélectionné
[🗑️]                 → Supprimer le modèle
```

### Indicateurs de statut

```
Bordure normale     → Modèle non sélectionné
Bordure bleue       → Modèle actuellement sélectionné
Opacité réduite     → Modèle non installé
Opacité normale     → Modèle installé
```

### Barre de progression

```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░
Downloading... 45%

Vert: Téléchargé
Gris: Restant
```

## 🔍 Filtres

### Filtres de famille

```
[All Models]  → Afficher tous les modèles
[Gemma]       → Uniquement Gemma 3 (1B, 3B, 7B)
[Llama]       → Uniquement Llama 3 (8B, 70B)
[Mistral]     → Uniquement Mistral (7B)
[Phi]         → Uniquement Phi 3 (Mini, Medium)
[Qwen]        → Uniquement Qwen 2 (7B)
```

### Filtre d'installation

```
[✓ Installed Only]  → Afficher uniquement les modèles installés
                      (utile quand beaucoup de modèles)
```

## ⚠️ Messages d'erreur

### Ollama non détecté

```
┌─────────────────────────────────────────────────┐
│ ⚠️ Ollama is not running                        │
│                                                 │
│ Please start Ollama to manage local models.    │
│ Visit ollama.ai to download and install.       │
│                                                 │
│ [Retry Connection]                              │
└─────────────────────────────────────────────────┘
```

### Erreur de téléchargement

```
┌──────────────────────────────────────────────┐
│ Gemma 3 7B                                   │
│ High-quality model...                        │
│                                              │
│ ⚠️ Download failed: Network error            │
│                                              │
│ [📥 Download]  ← Réessayer                   │
└──────────────────────────────────────────────┘
```

## 💡 Conseils visuels

### Recommandations système

```
Si RAM < 4GB:
  → Gemma 3 1B (⚡ Recommended)
  
Si RAM 4-8GB:
  → Gemma 3 3B (⚡ Recommended)
  → Phi 3 Mini (⚡ Recommended)
  
Si RAM 8-16GB:
  → Gemma 3 7B (⚡ Recommended)
  → Llama 3 8B (⚡ Recommended)
  → Mistral 7B (⚡ Recommended)
  
Si RAM > 16GB + GPU:
  → Phi 3 Medium (⚡ Recommended)
  → Llama 3 70B (⚡ Recommended)
```

### Ordre d'affichage

```
1. Modèles recommandés en premier
2. Modèles installés ensuite
3. Autres modèles à la fin
4. Tri par taille (petit → grand)
```

## 🎯 Points d'attention UX

### Feedback immédiat
- ✅ Clic sur Download → Barre de progression apparaît
- ✅ Téléchargement terminé → Badge "Installed" apparaît
- ✅ Sélection → Bordure bleue immédiate
- ✅ Suppression → Confirmation puis mise à jour

### Prévention d'erreurs
- ✅ Boutons désactivés pendant téléchargement
- ✅ Confirmation avant suppression
- ✅ Messages clairs pour Ollama non détecté
- ✅ Validation avant sauvegarde

### Guidage utilisateur
- ✅ Badges "Recommended" pour les meilleurs choix
- ✅ Informations de taille et RAM visibles
- ✅ Descriptions claires des capacités
- ✅ Messages d'aide contextuels

## 📱 Responsive Design

### Desktop (> 768px)
```
┌─────────────────┬─────────────────┐
│   Modèle 1      │   Modèle 2      │
├─────────────────┼─────────────────┤
│   Modèle 3      │   Modèle 4      │
└─────────────────┴─────────────────┘
```

### Mobile (< 768px)
```
┌─────────────────┐
│   Modèle 1      │
├─────────────────┤
│   Modèle 2      │
├─────────────────┤
│   Modèle 3      │
├─────────────────┤
│   Modèle 4      │
└─────────────────┘
```

## 🎨 Thème sombre/clair

### Thème clair
- Fond: Blanc/Gris clair
- Texte: Noir/Gris foncé
- Bordure sélection: Bleu
- Badges: Couleurs vives

### Thème sombre
- Fond: Gris foncé/Noir
- Texte: Blanc/Gris clair
- Bordure sélection: Bleu clair
- Badges: Couleurs adaptées

Les deux thèmes sont automatiquement gérés par Tailwind CSS avec les classes `dark:`.

---

Ce guide visuel vous aide à comprendre l'interface et le flux d'utilisation de la fonctionnalité de gestion des modèles locaux!
