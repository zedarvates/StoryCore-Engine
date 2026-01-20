# Grid Editor - Guide de Démarrage Rapide 🚀

## 🎯 Qu'est-ce que le Grid Editor ?

Le **Grid Editor** est l'outil principal pour créer et éditer votre **Master Coherence Sheet** (grille 3x3) qui définit l'ADN visuel de votre projet StoryCore.

---

## 📍 Comment y Accéder ?

### Depuis le Dashboard du Projet

1. Ouvrez votre projet
2. Dans la section **Quick Access**, cliquez sur le bouton **🎨 Grid Editor**
3. L'éditeur s'ouvre automatiquement

```
Dashboard → Quick Access → 🎨 Grid Editor
```

---

## 🛠️ Les 6 Outils Essentiels

### 1. ⬚ Select Tool (V)
**Utilisation:**
- Cliquer pour sélectionner un panel
- Glisser pour déplacer
- Ctrl+Clic pour sélection multiple

**Raccourci:** `V`

---

### 2. ✂ Crop Tool (C)
**Utilisation:**
- Définir une zone de recadrage
- Glisser les poignées pour ajuster
- Appliquer le crop au panel sélectionné

**Raccourci:** `C`

---

### 3. ↻ Rotate Tool (R)
**Utilisation:**
- Faire pivoter le panel sélectionné
- Glisser pour rotation libre
- Entrer un angle précis

**Raccourci:** `R`

---

### 4. ⇲ Scale Tool (S)
**Utilisation:**
- Redimensionner le panel
- Glisser les coins pour ajuster
- Shift pour proportions uniformes

**Raccourci:** `S`

---

### 5. ✋ Pan Tool (Space)
**Utilisation:**
- Naviguer dans le canvas
- Glisser pour déplacer la vue
- Molette pour zoomer

**Raccourci:** `Space` (maintenir)

---

### 6. ✎ Annotate Tool (A)
**Utilisation:**
- Dessiner des annotations
- Ajouter des notes textuelles
- Marquer des zones importantes

**Raccourci:** `A`

---

## ⌨️ Raccourcis Clavier Essentiels

| Raccourci | Action | Description |
|-----------|--------|-------------|
| `Ctrl+Z` | Undo | Annuler la dernière action |
| `Ctrl+Shift+Z` | Redo | Rétablir l'action annulée |
| `Ctrl+S` | Save | Sauvegarder la configuration |
| `Ctrl+E` | Export | Exporter la configuration |
| `Delete` | Delete | Supprimer le panel sélectionné |
| `Ctrl+D` | Duplicate | Dupliquer le panel |
| `F` | Fit to View | Ajuster la vue à la grille |
| `+` / `-` | Zoom | Zoomer / Dézoomer |
| `?` | Help | Ouvrir le guide d'aide |

---

## 📋 Workflow Recommandé

### Étape 1: Charger les Assets
```
1. Générez ou importez vos assets dans le projet
2. Les 9 premiers assets se chargent automatiquement dans la grille 3x3
```

### Étape 2: Ajuster les Panels
```
1. Sélectionnez un panel (outil Select)
2. Ajustez la position, rotation, échelle selon vos besoins
3. Utilisez l'outil Crop pour recadrer si nécessaire
```

### Étape 3: Ajouter des Annotations
```
1. Activez l'outil Annotate
2. Dessinez ou ajoutez du texte pour marquer les zones importantes
3. Les annotations aident à guider le pipeline de génération
```

### Étape 4: Sauvegarder
```
1. Appuyez sur Ctrl+S ou cliquez sur Save
2. La configuration est sauvegardée dans grid_config.json
3. Un message de confirmation s'affiche
```

### Étape 5: Exporter (Optionnel)
```
1. Appuyez sur Ctrl+E ou cliquez sur Export
2. Un fichier avec timestamp est créé dans exports/
3. Utilisez ce fichier pour partager ou sauvegarder des versions
```

---

## 💡 Conseils Pro

### 🎨 Master Coherence Sheet
La grille 3x3 définit l'ADN visuel de votre projet. Chaque panel doit être cohérent en termes de :
- Style artistique
- Palette de couleurs
- Composition
- Éclairage

### 💾 Auto-Save
Les modifications sont automatiquement sauvegardées toutes les 30 secondes. Vous pouvez aussi sauvegarder manuellement avec `Ctrl+S`.

### 📐 Layers
Utilisez le **Properties Panel** (à droite) pour gérer les layers de chaque panel :
- Ajouter des layers d'effets
- Ajuster l'opacité
- Changer les modes de fusion

### 🔄 Presets
Sauvegardez vos configurations fréquentes comme presets pour les réutiliser rapidement sur d'autres projets.

### 📤 Export
Exportez régulièrement vos configurations pour :
- Créer des backups
- Partager avec l'équipe
- Versionner votre travail

---

## 🆘 Besoin d'Aide ?

### Dans l'Éditeur
Cliquez sur le bouton **?** dans la toolbar pour ouvrir le guide d'aide complet avec :
- Description détaillée de chaque outil
- Liste complète des raccourcis clavier
- Conseils de workflow
- Guide de démarrage

### Problèmes Courants

#### La grille est vide
**Solution:** Assurez-vous d'avoir généré ou importé des assets dans votre projet.

#### La sauvegarde ne fonctionne pas
**Solution:** Vérifiez que vous avez bien ouvert un projet (pas juste l'éditeur seul).

#### Les modifications sont perdues
**Solution:** Utilisez `Ctrl+S` pour sauvegarder manuellement. L'auto-save fonctionne toutes les 30 secondes.

#### Je ne vois pas mes assets
**Solution:** Rechargez le projet ou utilisez le bouton "Refresh" dans l'asset library.

---

## 🎯 Objectifs du Grid Editor

### Cohérence Visuelle
Le Grid Editor garantit que tous les panels de votre projet partagent le même ADN visuel, éliminant les incohérences dans la génération AI.

### Contrôle Précis
Ajustez chaque panel individuellement avec des outils professionnels de transformation et de recadrage.

### Pipeline Intégré
La configuration du Grid Editor alimente directement le pipeline StoryCore pour la génération et la promotion des images.

---

## 📊 Checklist de Qualité

Avant de finaliser votre Master Coherence Sheet, vérifiez :

- [ ] Les 9 panels sont remplis avec des assets cohérents
- [ ] Le style artistique est uniforme sur tous les panels
- [ ] La palette de couleurs est harmonieuse
- [ ] Les compositions sont équilibrées
- [ ] Les annotations marquent les zones importantes
- [ ] La configuration est sauvegardée (`Ctrl+S`)
- [ ] Un export de backup a été créé (`Ctrl+E`)

---

## 🚀 Prêt à Commencer ?

1. **Ouvrez votre projet** dans StoryCore
2. **Cliquez sur 🎨 Grid Editor** dans Quick Access
3. **Suivez le workflow** ci-dessus
4. **Appuyez sur ?** pour plus d'aide

**Bon travail créatif ! 🎨**

---

*Guide créé pour StoryCore-Engine v1.0*
*Dernière mise à jour: 2026-01-20*
