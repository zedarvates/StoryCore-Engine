# Getting Started - Developer Guide

Bienvenue dans l'équipe StoryCore Engine ! Ce guide vous aidera à démarrer rapidement.

## 🎯 Objectif

Vous permettre de :
1. ✅ Cloner et installer le projet (5 minutes)
2. ✅ Lancer l'application en développement (2 minutes)
3. ✅ Faire votre premier build (1 minute)
4. ✅ Comprendre la structure du projet (10 minutes)

**Temps total estimé : 20 minutes**

---

## 📋 Prérequis

### Logiciels Requis
- **Node.js** 18+ ([télécharger](https://nodejs.org/))
- **Python** 3.9+ ([télécharger](https://www.python.org/))
- **Git** ([télécharger](https://git-scm.com/))
- **Éditeur de code** (VS Code recommandé)

### Matériel Recommandé
- **GPU** : RTX 3060+ avec 12GB VRAM (pour ComfyUI)
- **RAM** : 16GB minimum
- **Disque** : 10GB d'espace libre

### Vérification
```bash
# Vérifier les versions
node --version    # Devrait afficher v18.x ou supérieur
python --version  # Devrait afficher 3.9.x ou supérieur
git --version     # N'importe quelle version récente
```

---

## 🚀 Installation (5 minutes)

### Étape 1 : Cloner le Projet
```bash
# Cloner le repository
git clone https://github.com/zedarvates/StoryCore-Engine.git
cd storycore-engine
```

### Étape 2 : Installer les Dépendances Python
```bash
# Créer un environnement virtuel (recommandé)
python -m venv .venv

# Activer l'environnement
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

### Étape 3 : Installer les Dépendances Node.js
```bash
# Installer les dépendances root
npm install

# Installer les dépendances UI
cd creative-studio-ui
npm install
cd ..
```

### Étape 4 : Vérifier l'Installation
```bash
# Vérifier que tout est installé
npm run build

# Si le build réussit, vous êtes prêt ! ✅
```

---

## 🎮 Lancer l'Application (2 minutes)

### Mode Développement (Recommandé)
```bash
# Terminal 1 : Lancer le serveur de développement
npm run dev

# L'application s'ouvrira automatiquement
# UI disponible sur : http://localhost:5173
```

### Mode Production (Pour Tester)
```bash
# Build complet
npm run build

# Lancer l'application
npm run electron:start
```

---

## 🏗️ Structure du Projet (10 minutes)

### Vue d'Ensemble
```
storycore-engine/
├── 📱 creative-studio-ui/    # Interface React/TypeScript
├── 🖥️ electron/               # Application Electron
├── 🐍 src/                    # Backend Python
├── 📚 documentation/          # Documentation technique
├── 🧪 tests/                  # Tests
└── 📦 workflows/              # Workflows ComfyUI
```

### Fichiers Importants

#### Configuration
- `package.json` - Dépendances et scripts Node.js
- `requirements.txt` - Dépendances Python
- `electron-builder.json` - Configuration Electron

#### Documentation
- `README.md` - Vue d'ensemble du projet
- `DOCUMENTATION_INDEX.md` - 📑 **Index complet** de la documentation
- `QUICK_REFERENCE.md` - Commandes courantes
- `BUILD_REPORT.md` - État du build

#### Code Principal
- `storycore.py` - CLI Python
- `creative-studio-ui/src/App.tsx` - Application React
- `electron/main.ts` - Process principal Electron

---

## 🔧 Commandes Essentielles

### Développement
```bash
# Démarrer en mode dev (hot-reload)
npm run dev

# Démarrer uniquement l'UI
npm run ui:dev

# Démarrer uniquement Electron
npm run electron:dev
```

### Build
```bash
# Build complet
npm run build

# Build UI uniquement
npm run ui:build

# Build Electron uniquement
npm run electron:build
```

### Tests
```bash
# Lancer tous les tests
npm run test

# Tests en mode watch
cd creative-studio-ui && npm run test:watch

# Tests avec UI
cd creative-studio-ui && npm run test:ui
```

### Packaging
```bash
# Packager pour votre plateforme
npm run package

# Packager pour Windows
npm run package:win

# Packager pour macOS
npm run package:mac
```

---

## 📖 Prochaines Étapes

### 1. Explorer la Documentation
- Lisez [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) pour naviguer
- Consultez [QUICK_REFERENCE.md](QUICK_REFERENCE.md) pour les commandes
- Parcourez [BUILD_REPORT.md](BUILD_REPORT.md) pour comprendre le build

### 2. Comprendre l'Architecture
- Lisez [documentation/TECHNICAL_GUIDE.md](documentation/TECHNICAL_GUIDE.md)
- Explorez le code dans `creative-studio-ui/src/`
- Regardez les workflows dans `workflows/`

### 3. Faire Votre Première Contribution
- Lisez [documentation/CONTRIBUTING.md](documentation/CONTRIBUTING.md)
- Choisissez une issue "good first issue"
- Créez une branche et faites un PR

---

## 🐛 Problèmes Courants

### Le Build Échoue
```bash
# Solution 1 : Nettoyer et réinstaller
rm -rf node_modules
npm install

# Solution 2 : Nettoyer le cache
npm run clean
cd creative-studio-ui && npm run clean

# Solution 3 : Vérifier les versions
node --version  # Doit être 18+
python --version  # Doit être 3.9+
```

### L'Application Ne Démarre Pas
```bash
# Vérifier que le build est à jour
npm run build

# Vérifier les logs
npm run electron:dev 2>&1 | tee error.log

# Vérifier les ports
# Port 5173 doit être libre pour Vite
```

### Les Tests Échouent
```bash
# Nettoyer le cache des tests
cd creative-studio-ui
npx vitest --clearCache

# Lire le guide des tests
cat ../FIX_TESTS.md
```

---

## 💡 Conseils de Développement

### VS Code (Recommandé)
Extensions utiles :
- ESLint
- Prettier
- TypeScript Vue Plugin
- Python
- GitLens

### Configuration Git
```bash
# Configurer votre identité
git config user.name "Votre Nom"
git config user.email "votre@email.com"

# Créer une branche pour vos changements
git checkout -b feature/ma-fonctionnalite
```

### Workflow de Développement
1. Créer une branche depuis `main`
2. Faire vos changements
3. Tester localement (`npm run test`)
4. Faire un build (`npm run build`)
5. Commit et push
6. Créer un Pull Request

---

## 📚 Ressources Utiles

### Documentation Interne
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) - Index complet
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Référence rapide
- [BUILD_REPORT.md](BUILD_REPORT.md) - État du build
- [FIX_TESTS.md](FIX_TESTS.md) - Guide des tests

### Documentation Externe
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)

### Outils
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - Workflows AI
- [Ollama](https://ollama.com/) - LLM local

---

## 🎯 Checklist de Démarrage

Cochez au fur et à mesure :

### Installation
- [ ] Node.js 18+ installé
- [ ] Python 3.9+ installé
- [ ] Git installé
- [ ] Repository cloné
- [ ] Dépendances Python installées
- [ ] Dépendances Node.js installées
- [ ] Build réussi

### Compréhension
- [ ] Application lancée en mode dev
- [ ] Structure du projet comprise
- [ ] Documentation principale lue
- [ ] Commandes essentielles connues

### Prêt à Contribuer
- [ ] Git configuré
- [ ] Branche de travail créée
- [ ] Tests lancés avec succès
- [ ] Guide de contribution lu

---

## 🆘 Besoin d'Aide ?

### Documentation
1. Consultez [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
2. Lisez [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
3. Vérifiez [documentation/TROUBLESHOOTING.md](documentation/TROUBLESHOOTING.md)

### Support
1. Cherchez dans les [Issues GitHub](https://github.com/zedarvates/StoryCore-Engine/issues)
2. Posez une question dans [Discussions](https://github.com/zedarvates/StoryCore-Engine/discussions)
3. Contactez l'équipe

---

## 🎉 Bienvenue dans l'Équipe !

Vous êtes maintenant prêt à contribuer à StoryCore Engine. N'hésitez pas à poser des questions et à explorer le code.

**Bon développement ! 🚀**

---

**Dernière mise à jour** : 23 janvier 2026  
**Version** : 1.0.0  
**Statut** : ✅ Production Ready
