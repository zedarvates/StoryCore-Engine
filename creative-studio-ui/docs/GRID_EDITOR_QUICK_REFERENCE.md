# Guide de Référence Rapide - Éditeur de Grille

## Raccourcis Essentiels

### Les Plus Utilisés

```
Ctrl+Z          Annuler
Ctrl+Shift+Z    Refaire
Ctrl+C          Copier
Ctrl+V          Coller
Espace          Play/Pause
G               Activer/désactiver la grille
```

### Navigation Vidéo

```
←/→             Frame précédente/suivante
Shift+←/→       Sauter 10 frames
I               Point d'entrée
O               Point de sortie
```

### Sélection

```
Ctrl+A          Tout sélectionner
Ctrl+Clic       Ajouter à la sélection
Shift+Clic      Sélectionner une plage
Escape          Désélectionner
```

## Actions Rapides

### Glisser-Déposer

| Action | Méthode |
|--------|---------|
| Déplacer | Cliquer-glisser |
| Copier | Ctrl + glisser |
| Annuler | Escape pendant le glisser |
| Snap-to-grid | Automatique (désactiver avec Shift) |

### Menu Contextuel

| Clic droit sur | Actions disponibles |
|----------------|---------------------|
| Plan unique | Dupliquer, Supprimer, Exporter, Propriétés |
| Plans multiples | Opérations par lots |
| Zone vide | Nouveau plan, Coller, Sélectionner tout |

## Fonctionnalités Clés

### Visualisation Vidéo

- ✅ Lecture avec contrôles
- ✅ Navigation frame par frame
- ✅ Vitesses : 0.25x à 2x
- ✅ Aperçu au survol
- ✅ Lecture de séquence

### Édition

- ✅ Glisser-déposer intuitif
- ✅ Snap-to-grid automatique
- ✅ Guides d'alignement
- ✅ Annuler/Refaire (50 niveaux)
- ✅ Copier/Coller

### Opérations par Lots

- ✅ Sélection multiple
- ✅ Édition groupée
- ✅ Export parallèle
- ✅ Barre de progression

### Recherche

- ✅ Filtrage en temps réel
- ✅ Opérateurs logiques (AND, OR, NOT)
- ✅ Filtres prédéfinis
- ✅ Filtres sauvegardés

## Formats Supportés

### Vidéo

- MP4 (H.264, H.265)
- WebM (VP8, VP9)
- MOV (QuickTime)

### Export

- JSON (configuration)
- YAML (configuration lisible)
- URL (partage rapide)

## Limites et Performances

### Cas d'Usage Optimal

- **10-30 plans** : Performance optimale
- **30-50 plans** : Performance excellente
- **> 50 plans** : Utilisez les filtres pour réduire l'affichage

### Mémoire

- Cache thumbnails : ~500MB
- Historique : 50 niveaux
- Auto-save : Toutes les 30 secondes

## Dépannage Rapide

| Problème | Solution |
|----------|----------|
| Plans ne s'alignent pas | Activer la grille (G) |
| Vidéo ne charge pas | Vérifier le format |
| Performance lente | Réduire le nombre de plans visibles |
| Historique plein | Limite de 50 niveaux atteinte |

## Ressources

- **Guide complet** : `GRID_EDITOR_USER_GUIDE.md`
- **Documentation développeur** : `GRID_EDITOR_DEVELOPER_GUIDE.md`
- **Exemples** : `src/examples/`
- **Architecture** : `.kiro/specs/advanced-grid-editor-improvements/design.md`

---

**Astuce** : Survolez les boutons pour voir les info-bulles avec les raccourcis !
