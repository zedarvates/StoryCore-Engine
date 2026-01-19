# Guide: Créer l'Exécutable Windows pour StoryCore Creative Studio

## 🎯 Objectif

Créer un fichier `.exe` que les utilisateurs peuvent double-cliquer pour installer et lancer StoryCore Creative Studio sur Windows.

## ✅ État Actuel

- ✅ Infrastructure Electron complète (Tasks 1-14)
- ✅ Code Electron compilé dans `dist/electron/`
- ✅ Interface UI compilée dans `creative-studio-ui/dist/`
- ✅ Configuration `electron-builder.json` prête
- ⚠️  Icône personnalisée manquante (utilise l'icône Electron par défaut)

## 🚀 Étapes pour Créer l'Exécutable

### Étape 1: Vérifier les Prérequis

```bash
# Vérifier que Node.js est installé
node --version
# Devrait afficher: v18.x.x ou supérieur

# Vérifier que npm est installé
npm --version
# Devrait afficher: 9.x.x ou supérieur
```

### Étape 2: Installer les Dépendances (si nécessaire)

```bash
# Dans le dossier racine du projet
npm install
```

### Étape 3: Builder l'Application

```bash
# Option A: Build complet + packaging (RECOMMANDÉ)
npm run package:win

# Option B: Build en deux étapes (pour debug)
npm run build          # Compile tout
npm run package        # Crée l'exécutable
```

**Temps estimé:** 2-5 minutes (première fois), 1-2 minutes ensuite

### Étape 4: Trouver l'Exécutable

Après le build, vous trouverez:

```
release/
├── StoryCore Creative Studio-Setup-1.0.0.exe    ← INSTALLATEUR (distribuer celui-ci)
└── win-unpacked/                                 ← Version non packagée (pour test)
    └── StoryCore Creative Studio.exe
```

### Étape 5: Tester l'Installateur

1. **Double-cliquer** sur `StoryCore Creative Studio-Setup-1.0.0.exe`
2. **Suivre l'assistant d'installation:**
   - Choisir le dossier d'installation (par défaut: `C:\Program Files\StoryCore Creative Studio`)
   - Créer un raccourci sur le bureau (recommandé)
   - Créer un raccourci dans le menu Démarrer (recommandé)
3. **Cliquer sur "Installer"**
4. **Lancer l'application** depuis le raccourci créé

## 📦 Ce qui est Inclus dans l'Exécutable

L'installateur contient:
- ✅ Application Electron complète
- ✅ Runtime Node.js intégré
- ✅ Interface utilisateur (React)
- ✅ Toutes les dépendances nécessaires
- ✅ Gestionnaire de serveur Vite
- ✅ Système de gestion de projets

**Taille approximative:** 150-200 MB

## 🎨 Ajouter une Icône Personnalisée (Optionnel)

### Méthode Rapide: Utiliser le Script

```bash
# Créer un placeholder SVG
node create-placeholder-icon.js
```

Ensuite:
1. Ouvrir `build/icon.svg` dans un éditeur d'images
2. Exporter en PNG 512x512 → `build/icon.png`
3. Convertir PNG en ICO sur https://convertio.co/png-ico/
4. Placer `icon.ico` dans `build/`
5. Rebuilder: `npm run package:win`

### Méthode Professionnelle: Designer une Icône

1. **Créer un design 512x512 pixels** dans Photoshop/Figma/Illustrator
2. **Exporter en PNG** haute qualité
3. **Convertir en ICO:**
   - En ligne: https://convertio.co/png-ico/
   - Ou avec ImageMagick: `convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico`
4. **Placer dans `build/icon.ico`**
5. **Décommenter la ligne icon dans `electron-builder.json`:**
   ```json
   "win": {
     "icon": "build/icon.ico",  // ← Ajouter cette ligne
     ...
   }
   ```
6. **Rebuilder:** `npm run package:win`

## 🔧 Dépannage

### Problème: "Cannot find module 'electron-builder'"

**Solution:**
```bash
npm install --save-dev electron-builder
npm run package:win
```

### Problème: "ENOENT: no such file or directory, stat 'dist/electron/main.js'"

**Solution:**
```bash
# Compiler le code Electron d'abord
npm run electron:build
npm run package:win
```

### Problème: "ENOENT: no such file or directory, stat 'creative-studio-ui/dist'"

**Solution:**
```bash
# Compiler l'UI d'abord
npm run ui:build
npm run package:win
```

### Problème: Le build échoue avec une erreur de mémoire

**Solution:**
```bash
# Augmenter la mémoire Node.js
set NODE_OPTIONS=--max-old-space-size=4096
npm run package:win
```

### Problème: L'installateur se crée mais l'application ne démarre pas

**Solution:**
1. Tester la version non packagée d'abord:
   ```bash
   cd release/win-unpacked
   "StoryCore Creative Studio.exe"
   ```
2. Vérifier les logs dans: `%APPDATA%\StoryCore Creative Studio\logs`
3. Vérifier que le port 5173 est disponible

## 📋 Checklist de Distribution

Avant de distribuer l'exécutable:

- [ ] Tester l'installation sur un PC Windows propre
- [ ] Vérifier que l'application démarre correctement
- [ ] Tester la création d'un nouveau projet
- [ ] Tester l'ouverture d'un projet existant
- [ ] Vérifier que les projets récents s'affichent
- [ ] Tester la désinstallation
- [ ] Vérifier la taille du fichier (< 250 MB)
- [ ] Ajouter une icône personnalisée (optionnel mais recommandé)

## 🚀 Distribution

### Option 1: Partage Direct

1. Uploader `StoryCore Creative Studio-Setup-1.0.0.exe` sur:
   - Google Drive / Dropbox
   - Site web de l'entreprise
   - Serveur de fichiers interne

2. Partager le lien avec les utilisateurs

3. Instructions pour l'utilisateur:
   ```
   1. Télécharger StoryCore Creative Studio-Setup-1.0.0.exe
   2. Double-cliquer sur le fichier
   3. Suivre l'assistant d'installation
   4. Lancer depuis le raccourci bureau
   ```

### Option 2: Version Portable (Sans Installation)

```bash
# Créer une version portable
npm run build
npx electron-builder --win portable
```

Résultat: `release/StoryCore Creative Studio-1.0.0-portable.exe`

**Avantages:**
- Pas d'installation requise
- Peut être lancé depuis une clé USB
- Idéal pour les environnements restreints

### Option 3: Microsoft Store (Futur)

Pour publier sur le Microsoft Store:
1. Créer un compte développeur Microsoft
2. Configurer electron-builder pour appx
3. Soumettre l'application pour révision

## 📊 Comparaison des Méthodes de Lancement

| Méthode | Avantages | Inconvénients | Cas d'Usage |
|---------|-----------|---------------|-------------|
| **npm run dev** | Hot reload, DevTools, rapide | Nécessite Node.js, terminal | Développement |
| **Installateur .exe** | Professionnel, raccourcis, auto-update | Taille importante | Distribution finale |
| **Portable .exe** | Sans installation, portable | Pas de raccourcis | Tests, démos |

## 🎉 Résultat Final

Après avoir suivi ce guide, vous aurez:

✅ Un installateur Windows professionnel
✅ Raccourcis bureau et menu Démarrer
✅ Application qui se lance comme n'importe quel logiciel Windows
✅ Prêt pour distribution aux utilisateurs finaux

## 📞 Support

En cas de problème:
1. Vérifier les logs: `%APPDATA%\StoryCore Creative Studio\logs`
2. Consulter la documentation Electron: https://www.electronjs.org/docs
3. Consulter la documentation electron-builder: https://www.electron.build/

---

**Temps total estimé:** 10-15 minutes (première fois)

**Prêt à builder?** Exécutez simplement:
```bash
npm run package:win
```

Et votre exécutable sera créé dans le dossier `release/` ! 🚀
