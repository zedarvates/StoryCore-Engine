# StoryCore Engine - Documentation

Bienvenue dans la documentation de StoryCore Engine, un moteur de création d'histoires et de production vidéo utilisant l'IA.

## 📋 Table des Matières

1. [Aperçu du Projet](#aperçu-du-projet)
2. [Installation et Configuration](#installation-et-configuration)
3. [Architecture du Système](#architecture-du-système)
4. [Commandes CLI](#commandes-cli)
5. [Workflows de Production](#workflows-de-production)
6. [Résolution des Problèmes](#résolution-des-problèmes)
7. [Développement](#développement)
8. [Sécurité](#sécurité)

---

## Aperçu du Projet

StoryCore Engine est une plateforme complète de création de contenu vidéo qui intègre :

- **Création d'histoires** : Wizards pour créer personnages, mondes, dialogues
- **Production vidéo** : Édition vidéo, transitions, effets
- **IA générative** : Intégration LLM, génération d'images, audio, vidéo
- **Workflows automatisés** : Pipeline de production complet

### Fonctionnalités Principales

- ✨ Wizards de création guidée
- 🎬 Éditeur vidéo intégré
- 🤖 Intégration LLM (OpenAI, Anthropic, Ollama)
- 🎨 Gestion des assets
- 📐 Plan de séquence
- 🎭 Gestion des personnages
- 🌍 Construction de monde
- 💬 Dialogue writer
- 🎵 Mixage audio

---

## Installation et Configuration

### Prérequis

- Node.js 18+
- Python 3.10+
- FFmpeg (optionnel pour le traitement vidéo)
- ComfyUI (optionnel pour la génération d'images)

### Installation Rapide

```bash
# Cloner le dépôt
git clone https://github.com/zedarvates/StoryCore-Engine.git
cd StoryCore-Engine

# Installer les dépendances frontend
cd creative-studio-ui
npm install
npm run build

# Installer les dépendances backend
cd ../backend
pip install -r requirements.txt
```

### Configuration

1. **Variables d'environnement** : Copier `.env.example` vers `.env` et configurer les clés API
2. **LLM Configuration** : Utiliser le wizard de configuration LLM dans l'interface
3. **ComfyUI** : Configurer les serveurs ComfyUI dans les paramètres

---

## Architecture du Système

### Structure du Projet

```
storycore-engine/
├── creative-studio-ui/     # Frontend React/TypeScript
├── backend/                # APIs Python/Flask
├── docs/                   # Documentation Markdown
├── addons/                 # Extensions et plugins
├── assets/                 # Ressources media
├── projects/               # Projets utilisateur
└── workflows/              # Workflows définis
```

### Composants Principaux

#### Frontend (creative-studio-ui)

- **React 18** avec TypeScript
- **Zustand** pour la gestion d'état
- **Radix UI** pour les composants d'interface
- **Vite** comme bundler

#### Backend (backend)

- **Flask** (Python) pour les APIs
- **SQLAlchemy** pour l'ORM
- **Celery** pour les tâches asynchrones
- **WebSocket** pour les mises à jour en temps réel

---

## Commandes CLI

Le CLI StoryCore fournit les commandes suivantes :

### Wizards de Création

| Commande | Description |
|----------|-------------|
| `character-wizard` | Création guidée de personnages |
| `world-generate` | Génération de monde |
| `dialogue-wizard` | Écriture de dialogues |
| `storyboard` | Création de storyboard |
| `shot-planning` | Planification des plans |
| `audio-production-wizard` | Production audio |

### Génération

| Commande | Description |
|----------|-------------|
| `generate-images` | Génération d'images IA |
| `generate-video` | Génération de vidéo |
| `generate-audio` | Génération audio |
| `generate-skybox` | Génération de skybox 360° |
| `generate-pantin` | Génération de pantin (animation) |
| `generate-box-scene` | Génération de scène 3D |

### Gestion de Projet

| Commande | Description |
|----------|-------------|
| `init` | Initialiser un nouveau projet |
| `dashboard` | Ouvrir le tableau de bord |
| `export` | Exporter le projet |
| `list-models` | Lister les modèles disponibles |
| `validate` | Valider la configuration |
| `test-connection` | Tester les connexions |

### Utilitaires

| Commande | Description |
|----------|-------------|
| `help` | Afficher l'aide |
| `comfyui` | Gérer l'intégration ComfyUI |
| `integration` | Gérer les intégrations |
| `deploy-workflows` | Déployer les workflows |
| `memory-export` | Exporter la mémoire |
| `memory-recover` | Récupérer la mémoire |

---

## Workflows de Production

### Workflow Standard

1. **Création de projet** : Définir le concept
2. **Construction du monde** : Créer l'univers
3. **Développement des personnages** : Créer les personnages
4. **Écriture** : Scénario et dialogues
5. **Plan de tournage** : Storyboard et planification
6. **Production** : Génération des assets
7. **Post-production** : Montage, effets, mixage
8. **Export** : Finalisation

### Workflow avec IA

- Utiliser les assistants IA pour chaque étape
- Génération semi-automatique des éléments
- Validation et ajustement manuel

---

## Résolution des Problèmes

### Erreurs Courantes

#### TypeScript Compilation

Le projet utilise TypeScript strict. Les erreurs courantes incluent :

- **Unused variables** : Variables déclarées mais non utilisées
- **Type mismatches** : Incompatibilité de types
- **Missing properties** : Propriétés manquantes dans les objets

Pour vérifier :
```bash
cd creative-studio-ui
npm run validate
```

#### ComfyUI Integration

Si ComfyUI ne se connecte pas :
1. Vérifier que ComfyUI est en cours d'exécution
2. Vérifier l'URL du serveur dans les paramètres
3. Tester avec `test-connection`

#### LLM Configuration

Problèmes courants :
- Clés API manquantes ou invalides
- Modèles non disponibles
- Timeout de connexion

Solution : Vérifier la configuration dans `LLMConfigDialog`

### Logs et Diagnostics

Les logs sont disponibles dans :
- `logs/` : Logs d'application
- `audit_logs/` : Logs d'audit
- `build_output.txt` : Sortie de compilation
- `tsc_errors.txt` : Erreurs TypeScript

---

## Développement

### Structure du Code

```
creative-studio-ui/
├── src/
│   ├── components/    # Composants React
│   ├── services/      # Services (API, état)
│   ├── hooks/         # Hooks personnalisés
│   ├── stores/        # Stores Zustand
│   ├── types/         # Définitions TypeScript
│   ├── utils/         # Fonctions utilitaires
│   └── contexts/      # Contextes React
```

### Conventions de Code

- **TypeScript** : Typage strict, interfaces bien définies
- **React** : Composants fonctionnels avec hooks
- **CSS** : Tailwind CSS pour le styling
- **State** : Zustand pour la gestion d'état global

### Workflow de Développement

```bash
# Démarrer le serveur de développement
npm run dev

# Build de production
npm run build

# Linter
npm run lint

# Tests
npm test
```

### Ajouter un Nouveau Wizard

1. Créer le composant wizard dans `src/components/wizard/`
2. Définir la configuration dans `src/wizard/`
3. Enregistrer dans `WizardLauncher.tsx`
4. Ajouter les traductions si nécessaire

---

## Sécurité

### Bonnes Pratiques

- **Clés API** : Ne jamais commiter les clés API
- **Validation** : Toujours valider les entrées utilisateur
- **Sanitisation** : Nettoyer le contenu généré
- **HTTPS** : Utiliser HTTPS en production

### Variables d'Environnement

```env
# LLM APIs
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
OLLAMA_BASE_URL=http://localhost:11434

# Database
DATABASE_URL=sqlite:///storycore.db

# Secrets
JWT_SECRET=your_secret
ENCRYPTION_KEY=your_key
```

### Audit et Logging

- Les logs d'audit sont stockés dans `audit_logs/`
- Suivi des modifications avec horodatage
- Possibilité d'export des logs pour analyse

---

## Ressources Utiles

- [Guide d'Implémentation](implementation_plan.md)
- [Améliorations](improvement_plan.md)
- [Sécurité](security.md)
- [Workflows](workflows/)
- [Addons](addons/)

---

*Documentation générée le 2026-03-22*