# Comment l'Utilisateur Final Lance le Logiciel

## 🎯 Réponse Rapide

**Pour l'utilisateur final, c'est simple:**

1. **Double-cliquer** sur `StoryCore Creative Studio-Setup-1.0.0.exe`
2. **Suivre l'installation** (comme n'importe quel logiciel Windows)
3. **Double-cliquer** sur l'icône "StoryCore Creative Studio" sur le bureau

**C'est tout!** 🎉

---

## 📦 Étapes Détaillées

### Étape 1: Obtenir l'Installateur

L'utilisateur reçoit le fichier:
```
StoryCore Creative Studio-Setup-1.0.0.exe
```

**Taille:** ~150-200 MB

### Étape 2: Installation

1. **Double-cliquer** sur le fichier `.exe`
2. **Windows SmartScreen** peut afficher un avertissement:
   - Cliquer sur "Plus d'informations"
   - Cliquer sur "Exécuter quand même"
   - (Normal pour les applications non signées)

3. **Assistant d'installation** s'ouvre:
   ```
   ┌─────────────────────────────────────┐
   │  StoryCore Creative Studio Setup    │
   ├─────────────────────────────────────┤
   │                                     │
   │  Choisir le dossier d'installation: │
   │  C:\Program Files\StoryCore...      │
   │                                     │
   │  ☑ Créer un raccourci bureau       │
   │  ☑ Créer un raccourci menu Démarrer│
   │                                     │
   │  [Annuler]  [Installer]             │
   └─────────────────────────────────────┘
   ```

4. **Cliquer sur "Installer"**
5. **Attendre** 10-30 secondes
6. **Cliquer sur "Terminer"**

### Étape 3: Premier Lancement

**Méthode 1 - Raccourci Bureau (PLUS SIMPLE):**
```
Bureau Windows
├── 📁 Ce PC
├── 📁 Corbeille
└── 🎬 StoryCore Creative Studio  ← Double-cliquer ici!
```

**Méthode 2 - Menu Démarrer:**
1. Cliquer sur le bouton Windows (en bas à gauche)
2. Taper "StoryCore"
3. Cliquer sur "StoryCore Creative Studio"

**Méthode 3 - Fichier Exécutable:**
1. Ouvrir l'Explorateur Windows
2. Aller dans `C:\Program Files\StoryCore Creative Studio`
3. Double-cliquer sur `StoryCore Creative Studio.exe`

### Étape 4: Utilisation

L'application s'ouvre et affiche:

```
┌────────────────────────────────────────────┐
│  🎬 StoryCore Creative Studio              │
├────────────────────────────────────────────┤
│                                            │
│  Bienvenue dans StoryCore Creative Studio  │
│                                            │
│  ┌──────────────────┐  ┌──────────────┐   │
│  │ Create New       │  │ Open Existing│   │
│  │ Project          │  │ Project      │   │
│  └──────────────────┘  └──────────────┘   │
│                                            │
│  Recent Projects:                          │
│  • Mon Premier Projet                      │
│  • Demo Video                              │
│                                            │
└────────────────────────────────────────────┘
```

**L'utilisateur peut:**
- ✅ Créer un nouveau projet
- ✅ Ouvrir un projet existant
- ✅ Accéder aux projets récents

---

## 🔄 Lancements Suivants

Après la première installation, l'utilisateur lance simplement:

**Double-clic sur l'icône bureau** 🎬

Ou:

**Menu Démarrer → StoryCore Creative Studio**

**Temps de démarrage:** 2-5 secondes

---

## 🗑️ Désinstallation

Si l'utilisateur veut désinstaller:

**Méthode 1 - Paramètres Windows:**
1. Ouvrir "Paramètres Windows"
2. Aller dans "Applications"
3. Chercher "StoryCore Creative Studio"
4. Cliquer sur "Désinstaller"

**Méthode 2 - Panneau de Configuration:**
1. Ouvrir "Panneau de configuration"
2. Aller dans "Programmes et fonctionnalités"
3. Trouver "StoryCore Creative Studio"
4. Clic droit → "Désinstaller"

---

## 📊 Comparaison: Développeur vs Utilisateur Final

| Aspect | Développeur | Utilisateur Final |
|--------|-------------|-------------------|
| **Installation** | `npm install` | Double-clic sur .exe |
| **Lancement** | `npm run dev` | Double-clic sur icône |
| **Prérequis** | Node.js, npm, Git | Aucun |
| **Temps de démarrage** | 5-10 secondes | 2-5 secondes |
| **Mise à jour** | `git pull` | Nouveau .exe |
| **Taille** | ~500 MB (avec node_modules) | ~200 MB |

---

## 🎯 Instructions pour l'Utilisateur Final (à partager)

Voici le texte à envoyer aux utilisateurs:

```
=== INSTALLATION DE STORYCORE CREATIVE STUDIO ===

1. Téléchargez le fichier "StoryCore Creative Studio-Setup-1.0.0.exe"

2. Double-cliquez sur le fichier téléchargé

3. Si Windows affiche un avertissement de sécurité:
   - Cliquez sur "Plus d'informations"
   - Puis sur "Exécuter quand même"

4. Suivez l'assistant d'installation:
   - Choisissez le dossier d'installation (ou laissez par défaut)
   - Cochez "Créer un raccourci bureau"
   - Cliquez sur "Installer"

5. Une fois l'installation terminée, double-cliquez sur l'icône
   "StoryCore Creative Studio" sur votre bureau

C'est tout! L'application est prête à l'emploi.

=== UTILISATION ===

Au premier lancement:
- Cliquez sur "Create New Project" pour créer un nouveau projet
- Ou "Open Existing Project" pour ouvrir un projet existant

Les projets récents apparaîtront automatiquement sur la page d'accueil.

=== SUPPORT ===

En cas de problème, contactez: support@storycore.com
```

---

## 🚀 Pour Créer l'Installateur (Développeur)

**Méthode Simple:**
```bash
# Double-cliquer sur ce fichier:
build-windows-exe.bat
```

**Méthode Manuelle:**
```bash
npm run package:win
```

**Résultat:**
```
release/
└── StoryCore Creative Studio-Setup-1.0.0.exe  ← Distribuer ce fichier
```

---

## ✅ Checklist de Distribution

Avant de distribuer l'installateur:

- [ ] Tester sur un PC Windows propre (sans Node.js)
- [ ] Vérifier que l'installation fonctionne
- [ ] Vérifier que l'application démarre
- [ ] Tester la création d'un projet
- [ ] Tester l'ouverture d'un projet
- [ ] Vérifier la désinstallation
- [ ] Préparer les instructions utilisateur
- [ ] Choisir un canal de distribution (email, site web, etc.)

---

## 🎉 Résumé

**Pour l'utilisateur final, c'est aussi simple que:**

1. 📥 Télécharger le fichier .exe
2. 🖱️ Double-cliquer pour installer
3. 🎬 Double-cliquer sur l'icône pour lancer

**Aucune connaissance technique requise!**

**Aucun prérequis à installer!**

**Fonctionne comme n'importe quel logiciel Windows!**

---

**Prêt à créer l'installateur?**

Exécutez simplement:
```bash
build-windows-exe.bat
```

Ou:
```bash
npm run package:win
```

Et partagez le fichier créé dans `release/` avec vos utilisateurs! 🚀
