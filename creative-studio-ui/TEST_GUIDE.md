# Guide de Test - Central Configuration UI

## 🚀 Lancer l'Application

```bash
cd creative-studio-ui
npm run dev
```

L'application sera disponible sur `http://localhost:5173/`

---

## ✅ Checklist de Test

### 1. Landing Page et Création de Projet

- [ ] La landing page s'affiche correctement
- [ ] Le bouton "New Project" fonctionne
- [ ] La boîte de dialogue de création de projet s'ouvre
- [ ] Entrer un nom de projet et créer
- [ ] Le projet est créé et le **Project Dashboard** s'affiche

### 2. Project Dashboard (Vue Principale)

#### En-tête du Projet
- [ ] Le nom du projet s'affiche correctement
- [ ] L'ID du projet est visible
- [ ] Le statut du projet est affiché
- [ ] La date de dernière modification est correcte

#### Statut du Pipeline
- [ ] Les 4 cartes de statut sont visibles :
  - [ ] 📝 Script - Ready
  - [ ] 🎬 Scenes - 0 generated
  - [ ] 🖼️ Images - 0 generated
  - [ ] 🎵 Audio - Not started

#### Boutons de Configuration
- [ ] Bouton "🔌 API" visible et cliquable
- [ ] Bouton "🤖 LLM" visible et cliquable
- [ ] Bouton "🎨 ComfyUI" visible et cliquable

#### Wizard Launcher
- [ ] Les 6 wizards sont affichés :
  - [ ] 🌍 World Building Wizard
  - [ ] 👤 Character Creation Wizard
  - [ ] 🎬 Scene Generator Wizard
  - [ ] 💬 Dialogue Writer Wizard
  - [ ] 📋 Storyboard Creator Wizard
  - [ ] 🎨 Style Transfer Wizard
- [ ] Cliquer sur un wizard affiche une alerte
- [ ] Les tooltips s'affichent au survol

#### Quick Access
- [ ] 4 cartes Quick Access visibles :
  - [ ] 📁 Project Files
  - [ ] 📊 Analytics
  - [ ] 📤 Export
  - [ ] ⚙️ Settings

#### Recent Activity
- [ ] La liste d'activité s'affiche
- [ ] "Project created" est visible
- [ ] "Configuration initialized" est visible
- [ ] Les timestamps sont corrects

### 3. Navigation vers l'Éditeur

- [ ] Cliquer sur "🎬 Open Editor" en haut à droite
- [ ] L'éditeur storyboard/timeline s'ouvre
- [ ] Le bouton "Back to Dashboard" (flèche gauche) est visible
- [ ] Cliquer sur la flèche retourne au dashboard

### 4. Configuration Windows

#### API Settings Window
- [ ] Cliquer sur "🔌 API" ouvre la fenêtre modale
- [ ] Les 5 providers sont visibles :
  - [ ] Ollama
  - [ ] OpenAI
  - [ ] Anthropic
  - [ ] Hugging Face
  - [ ] Replicate
- [ ] Les champs de formulaire sont éditables
- [ ] Le bouton "Test Connection" fonctionne
- [ ] Le bouton "Save" fonctionne
- [ ] Le bouton "Cancel" ferme la fenêtre
- [ ] La fenêtre se ferme après sauvegarde

#### LLM Configuration Window
- [ ] Cliquer sur "🤖 LLM" ouvre la fenêtre modale
- [ ] Les providers sont sélectionnables
- [ ] Les champs de configuration sont visibles
- [ ] Les paramètres (température, max tokens) sont éditables
- [ ] Le bouton "Test Connection" fonctionne
- [ ] Le bouton "Save" fonctionne
- [ ] Le bouton "Cancel" ferme la fenêtre

#### ComfyUI Configuration Window
- [ ] Cliquer sur "🎨 ComfyUI" ouvre la fenêtre modale
- [ ] Le champ "Server URL" est éditable
- [ ] La liste de workflows est visible
- [ ] Le bouton "Test Connection" fonctionne
- [ ] Le bouton "Save" fonctionne
- [ ] Le bouton "Cancel" ferme la fenêtre

### 5. Validation et Erreurs

#### Validation des Formulaires
- [ ] Entrer une URL invalide → Message d'erreur s'affiche
- [ ] Laisser un champ requis vide → Message d'erreur s'affiche
- [ ] Les champs invalides sont mis en évidence
- [ ] Le bouton "Save" est désactivé si formulaire invalide

#### Test de Connexion
- [ ] Tester une connexion → Indicateur "Testing..." s'affiche
- [ ] Connexion réussie → Indicateur "Connected" vert
- [ ] Connexion échouée → Indicateur "Disconnected" rouge
- [ ] Message d'erreur détaillé en cas d'échec

#### Notifications
- [ ] Les notifications toast s'affichent en haut à droite
- [ ] Les notifications disparaissent automatiquement après 5s
- [ ] Le bouton "×" ferme la notification manuellement

### 6. Export/Import Configuration

#### Export
- [ ] Ouvrir une fenêtre de configuration
- [ ] Cliquer sur le bouton "Export"
- [ ] Un fichier JSON est téléchargé
- [ ] Le fichier contient la configuration complète

#### Import
- [ ] Ouvrir une fenêtre de configuration
- [ ] Cliquer sur le bouton "Import"
- [ ] Sélectionner un fichier JSON valide
- [ ] La configuration est importée et appliquée
- [ ] Importer un fichier invalide → Message d'erreur

### 7. Raccourcis Clavier

- [ ] `Ctrl+S` (ou `Cmd+S`) → Sauvegarde la configuration
- [ ] `Ctrl+/` (ou `Cmd+/`) → Affiche l'aide des raccourcis
- [ ] `Escape` → Ferme la fenêtre modale active
- [ ] `Ctrl+E` (ou `Cmd+E`) → Ouvre l'éditeur

### 8. Responsive Design

#### Desktop (1920x1080)
- [ ] Tous les éléments sont visibles
- [ ] Pas de débordement horizontal
- [ ] Les grids s'affichent correctement

#### Tablet (768x1024)
- [ ] Le layout s'adapte
- [ ] Les wizards passent en 2 colonnes
- [ ] Les menus sont accessibles

#### Mobile (375x667)
- [ ] Le layout s'adapte
- [ ] Les wizards passent en 1 colonne
- [ ] Les boutons sont cliquables
- [ ] Pas de débordement

### 9. Dark Theme

- [ ] Le thème s'adapte automatiquement selon les préférences système
- [ ] Tous les composants sont lisibles en dark mode
- [ ] Les contrastes sont suffisants
- [ ] Les couleurs sont cohérentes

### 10. Accessibilité

- [ ] Navigation au clavier fonctionne
- [ ] Les éléments focusables ont un outline visible
- [ ] Les labels sont présents sur tous les inputs
- [ ] Les boutons ont des titres descriptifs
- [ ] Les icônes ont des attributs aria-label

---

## 🐛 Bugs Connus

Aucun bug connu pour le moment.

---

## 📝 Notes de Test

### Fonctionnalités Simulées (TODO)

Les fonctionnalités suivantes sont actuellement simulées et nécessitent une implémentation backend :

1. **Test de Connexion** - Simule une connexion réussie après 2 secondes
2. **Wizards** - Affichent une alerte au lieu de lancer le wizard réel
3. **Statut du Pipeline** - Affiche des valeurs statiques
4. **Quick Access** - Les boutons ne font rien pour le moment

### Prochaines Étapes

1. Connecter aux vrais services (Ollama, OpenAI, ComfyUI)
2. Implémenter les wizards réels
3. Connecter le statut du pipeline aux données réelles
4. Implémenter les actions Quick Access

---

## ✅ Résultat Attendu

Après avoir complété tous les tests, vous devriez avoir :

✅ Un **Project Dashboard** fonctionnel comme vue par défaut  
✅ Des **fenêtres de configuration** complètes et fonctionnelles  
✅ Un **système de wizards** prêt à être implémenté  
✅ Une **navigation fluide** entre dashboard et éditeur  
✅ Un **système de validation** robuste  
✅ Des **notifications** claires et informatives  
✅ Un **design responsive** sur tous les devices  
✅ Un **dark theme** automatique  
✅ Une **accessibilité** complète  

---

**Bon test ! 🚀**
