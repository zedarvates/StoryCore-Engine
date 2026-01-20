# Guide Rapide : Écran d'Édition Vidéo

## 🎬 Comment Accéder à l'Éditeur

### Depuis le Dashboard :
1. Ouvrez un projet
2. Allez dans la section "Plan Sequences"
3. **Cliquez sur une carte de séquence**
4. L'éditeur s'ouvre automatiquement avec les shots de cette séquence

## 🖥️ Interface de l'Éditeur

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back | File | Create | Edit | View | Settings | Docs | Help     │
│                                          [Project Name] [Share] [Export]│
├──────────┬──────────────────────────────────────────┬───────────────┤
│          │                                          │               │
│ LIBRARY  │         VIDEO PLAYER (16:9)             │  SEQUENCE     │
│          │                                          │  PLAN         │
│ Search   │  [Drag resources here...]               │               │
│          │                                          │  ┌─────────┐  │
│ Assets   │                                          │  │ Shot 1  │  │
│ • Chars  │                                          │  │ [image] │  │
│ • Envs   │                                          │  │ 6s      │  │
│ • Props  │                                          │  │ [prompt]│  │
│          │                                          │  └─────────┘  │
│ Templates│                                          │               │
│ • Styles │  ┌────────────────────────────────────┐ │  ┌─────────┐  │
│ • Camera │  │ [◄] [▶] [▶▶]                      │ │  │ Shot 2  │  │
│ • Light  │  │                                    │ │  │ [image] │  │
│          │  │ [Shot 1: 6s] [Shot 2: 10s] [+]   │ │  │ 10s     │  │
│ [+ New   │  │                                    │ │  │ [prompt]│  │
│  Asset]  │  └────────────────────────────────────┘ │  └─────────┘  │
│          │                                          │               │
│ [Dreamina│  Drag resources here and start creating │  [✨ Generate │
│  Prompt] │                                          │   Sequence]   │
└──────────┴──────────────────────────────────────────┴───────────────┘
                                                       
                                    [💬] Chat Assistant (floating)
```

## 🎯 Fonctionnalités Principales

### 1. Panneau Gauche - Bibliothèque
- **Recherche** : Trouvez rapidement vos assets
- **Catégories** :
  - 👥 Personnages
  - 🏔️ Environnements
  - 📦 Props & Objets
  - 🎨 Styles Visuels
  - 📷 Presets Caméra
  - ☀️ Lighting Rig
- **Actions Rapides** :
  - `+ Nouvel Asset IA` : Créer un asset avec l'IA
  - `Dreamina` : Générateur d'images
  - `Prompt Gen` : Assistant de prompts

### 2. Zone Centrale - Lecteur & Timeline
- **Lecteur Vidéo** : Prévisualisation 16:9
- **Timeline Interactive** :
  - Segments violets pour chaque shot
  - Durée proportionnelle
  - Clic pour sélectionner
  - Bouton `+` pour ajouter un shot
- **Contrôles** : Play, Précédent, Suivant

### 3. Panneau Droit - Plan de Séquence
- **Header** :
  - Nom de la séquence
  - Bouton `✨ Générer Séquence` (gradient violet-rose)
- **Grille de Shots** :
  - Numéro du shot
  - Miniature
  - Titre et durée
  - Zone de prompt éditable
- **Footer Technique** :
  - Chemin du projet
  - Format (16:9)
  - Résolution (1920×1080)
  - FPS (30)
  - Bouton `Modifier`

### 4. Assistant Storycore (Chat)
- **Bouton Flottant** : En bas à droite (gradient violet-cyan)
- **Fenêtre de Chat** :
  - Messages utilisateur (violet)
  - Messages assistant (gris)
  - Input avec envoi (Enter ou bouton)
- **Fonctionnalités** :
  - Poser des questions
  - Demander des modifications
  - Obtenir de l'aide

## 🎨 Interactions

### Timeline :
- **Clic sur un segment** : Sélectionne le shot
- **Hover** : Éclaircit le segment
- **Bouton +** : Ajoute un nouveau shot

### Shots :
- **Clic sur une carte** : Sélectionne le shot
- **Éditer le prompt** : Cliquez dans la zone de texte
- **Hover** : Bordure lumineuse

### Navigation :
- **← Back** : Retour au Dashboard
- **Menu File** : Opérations sur le fichier
- **Menu Create** : Créer de nouveaux éléments

## 🔧 Raccourcis Clavier (À venir)

- `Ctrl + S` : Sauvegarder
- `Ctrl + Z` : Annuler
- `Ctrl + Y` : Refaire
- `Space` : Play/Pause
- `Ctrl + N` : Nouveau shot
- `Delete` : Supprimer shot sélectionné

## 💡 Conseils d'Utilisation

### Pour une Édition Efficace :
1. **Organisez vos assets** : Utilisez les catégories
2. **Nommez vos shots** : Titres descriptifs
3. **Détaillez les prompts** : Plus de détails = meilleurs résultats
4. **Utilisez l'assistant** : Posez des questions pour de l'aide
5. **Sauvegardez régulièrement** : Auto-save activé

### Workflow Recommandé :
1. Importez vos assets dans la bibliothèque
2. Créez vos shots dans la timeline
3. Configurez chaque shot (durée, prompt)
4. Utilisez "Générer Séquence" pour l'IA
5. Prévisualisez dans le lecteur
6. Exportez le résultat final

## 🎯 Cas d'Usage

### Créer une Nouvelle Séquence :
1. Dashboard → Cliquez sur `+` dans "Plan Sequences"
2. Une nouvelle séquence est créée
3. Cliquez dessus pour ouvrir l'éditeur
4. Ajoutez des shots avec le bouton `+` de la timeline

### Éditer une Séquence Existante :
1. Dashboard → Cliquez sur la carte de séquence
2. L'éditeur s'ouvre avec les shots existants
3. Modifiez les prompts, durées, etc.
4. Les changements sont sauvegardés automatiquement

### Générer du Contenu IA :
1. Configurez vos shots avec des prompts détaillés
2. Cliquez sur `✨ Générer Séquence`
3. L'IA génère les images/vidéos
4. Prévisualisez dans le lecteur

## 🐛 Dépannage

### L'éditeur ne s'ouvre pas :
- Vérifiez qu'un projet est ouvert
- Vérifiez que la séquence existe
- Consultez la console (F12) pour les erreurs

### Les shots ne s'affichent pas :
- Vérifiez que la séquence contient des shots
- Rafraîchissez la page
- Vérifiez les données dans le store

### Le chat ne répond pas :
- Vérifiez la connexion Ollama
- Consultez les paramètres LLM
- Vérifiez la console pour les erreurs

## 📚 Ressources

- **Documentation complète** : `VIDEO_EDITOR_INTEGRATION_COMPLETE.md`
- **Code source** : `src/components/editor/VideoEditorPage.tsx`
- **Styles** : `src/components/editor/VideoEditorPage.css`

---

**Bon montage ! 🎬**
