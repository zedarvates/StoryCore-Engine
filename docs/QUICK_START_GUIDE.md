# StoryCore Creative Studio - Guide de Démarrage Rapide

## 🚀 Comment Lancer le Logiciel

### Option 1: Mode Développement (Actuel)

**Pour les développeurs:**

```bash
# 1. Ouvrir un terminal dans le dossier du projet
cd C:\storycore-engine

# 2. Lancer l'environnement de développement complet
npm run dev
```

**Ce qui se passe:**
- Le serveur Vite démarre sur http://localhost:5173
- L'application Electron se lance automatiquement
- La fenêtre StoryCore Creative Studio s'ouvre
- Le mode développement avec hot-reload est actif

**Temps de démarrage:** ~5 secondes

---

### Option 2: Exécutable Windows (Production) - À CRÉER

**Pour les utilisateurs finaux:**

#### Étape 1: Créer l'exécutable

```bash
# Dans le terminal, exécuter:
npm run package:win
```

**Ce qui sera créé:**
- `dist/StoryCore-Setup-1.0.0.exe` - Installateur Windows
- Taille: ~150-200 MB (inclut Electron + Node + l'application)

#### Étape 2: Installer

1. Double-cliquer sur `StoryCore-Setup-1.0.0.exe`
2. Suivre l'assistant d'installation
3. L'application s'installe dans `C:\Program Files\StoryCore Creative Studio`
4. Un raccourci est créé sur le bureau et dans le menu Démarrer

#### Étape 3: Lancer

**Méthode 1 - Raccourci Bureau:**
- Double-cliquer sur l'icône "StoryCore Creative Studio" sur le bureau

**Méthode 2 - Menu Démarrer:**
- Cliquer sur le menu Démarrer
- Chercher "StoryCore Creative Studio"
- Cliquer sur l'application

**Méthode 3 - Fichier .exe:**
- Naviguer vers `C:\Program Files\StoryCore Creative Studio`
- Double-cliquer sur `StoryCore Creative Studio.exe`

---

### Option 3: Exécutable Portable (Sans Installation)

**Pour une utilisation sans installation:**

```bash
# Créer une version portable
npm run build
npm run package:win -- --portable
```

**Résultat:**
- `dist/StoryCore-1.0.0-portable.exe` - Version portable
- Peut être lancé depuis n'importe où (clé USB, dossier partagé, etc.)
- Aucune installation requise
- Les données sont stockées dans le même dossier que l'exécutable

---

## 📋 Configuration Actuelle

### Ce qui fonctionne MAINTENANT (Mode Dev):

```bash
npm run dev
```

✅ Serveur Vite démarre automatiquement
✅ Electron se lance et se connecte au serveur
✅ Landing page s'affiche avec branding StoryCore
✅ Boutons "Create New Project" et "Open Existing Project"
✅ Liste des projets récents
✅ Hot reload pour le développement

### Ce qui manque pour la production:

❌ Fichier exécutable .exe
❌ Installateur Windows
❌ Icône d'application personnalisée
❌ Configuration electron-builder complète
❌ Signature de code (optionnel)

---

## 🔧 Créer l'Exécutable Maintenant

### Étape 1: Vérifier la configuration

Le fichier `package.json` contient déjà les scripts:

```json
{
  "scripts": {
    "build": "npm run ui:build && npm run electron:build",
    "package": "npm run build && electron-builder",
    "package:win": "npm run build && electron-builder --win"
  }
}
```

### Étape 2: Créer electron-builder.json

Créer un fichier `electron-builder.json` à la racine:

```json
{
  "appId": "com.storycore.creative-studio",
  "productName": "StoryCore Creative Studio",
  "directories": {
    "output": "dist",
    "buildResources": "build"
  },
  "files": [
    "dist/electron/**/*",
    "creative-studio-ui/dist/**/*",
    "package.json"
  ],
  "win": {
    "target": ["nsis", "portable"],
    "icon": "build/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

### Étape 3: Ajouter une icône

1. Créer un dossier `build/` à la racine
2. Ajouter `icon.ico` (256x256 pixels minimum)
3. Ajouter `icon.png` (512x512 pixels pour macOS/Linux)

### Étape 4: Builder l'exécutable

```bash
# Installer electron-builder si nécessaire
npm install --save-dev electron-builder

# Créer l'exécutable Windows
npm run package:win
```

**Temps de build:** ~2-5 minutes (première fois)

**Résultat:**
```
dist/
├── StoryCore-Setup-1.0.0.exe          # Installateur
├── StoryCore-1.0.0-portable.exe       # Version portable
└── win-unpacked/                       # Version non packagée (pour test)
```

---

## 🎯 Workflow Recommandé

### Pour le Développement:
```bash
npm run dev
```
- Développement rapide avec hot reload
- DevTools accessible (F12)
- Console logs visibles

### Pour Tester la Production:
```bash
npm run build
npm run electron:start
```
- Test de la version de production
- Pas de hot reload
- Fichiers optimisés

### Pour Distribuer:
```bash
npm run package:win
```
- Crée l'installateur Windows
- Prêt pour distribution
- Taille optimisée

---

## 📦 Distribution

### Méthode 1: Partage Direct
1. Créer l'exécutable: `npm run package:win`
2. Partager `dist/StoryCore-Setup-1.0.0.exe`
3. L'utilisateur double-clique pour installer

### Méthode 2: Version Portable
1. Créer la version portable
2. Partager `dist/StoryCore-1.0.0-portable.exe`
3. L'utilisateur lance directement (pas d'installation)

### Méthode 3: Microsoft Store (Futur)
1. Configurer electron-builder pour appx
2. Soumettre à Microsoft Store
3. Les utilisateurs installent depuis le Store

---

## 🐛 Dépannage

### Problème: "npm run dev" ne fonctionne pas

**Solution:**
```bash
# Vérifier que les dépendances sont installées
npm install

# Vérifier que le port 5173 est libre
netstat -ano | findstr :5173

# Relancer
npm run dev
```

### Problème: L'exécutable ne se crée pas

**Solution:**
```bash
# Vérifier electron-builder
npm install --save-dev electron-builder

# Nettoyer et rebuilder
rmdir /s /q dist
npm run package:win
```

### Problème: L'application ne démarre pas

**Solution:**
1. Vérifier les logs dans `%APPDATA%\StoryCore Creative Studio\logs`
2. Lancer depuis le terminal pour voir les erreurs
3. Vérifier que Node.js est installé (pour le dev)

---

## 📝 Résumé

### Actuellement (Mode Dev):
```bash
npm run dev
```
→ L'application se lance en mode développement

### Prochaine Étape (Production):
```bash
npm run package:win
```
→ Crée `StoryCore-Setup-1.0.0.exe`
→ L'utilisateur double-clique pour installer
→ Raccourci créé sur le bureau
→ Lance comme n'importe quelle application Windows

### Temps Estimé pour Créer l'Exécutable:
- Configuration: 10 minutes
- Premier build: 5 minutes
- Builds suivants: 2 minutes

---

## 🎉 Prêt à Créer l'Exécutable?

Voulez-vous que je crée maintenant:
1. ✅ Le fichier `electron-builder.json`
2. ✅ Une icône par défaut
3. ✅ Un script de build simplifié
4. ✅ Un guide d'installation pour l'utilisateur final

Dites-moi et je procède! 🚀
