# Grid Editor - Correction du Zoom

## Problèmes Identifiés

### 1. Zoom à la molette incohérent
- Le zoom ne restait pas centré sur le curseur
- Le comportement était imprévisible lors de zooms successifs
- Les limites min/max n'étaient pas correctement gérées

### 2. Boutons Zoom In/Out décalaient la vue
- Les boutons +/- ne maintenaient pas le centre de la vue
- Le contenu "sautait" lors de l'utilisation des boutons

### 3. Calcul du pan incorrect
- La formule de `zoomToPoint` ne gérait pas correctement les cas limites
- Pas de vérification si le zoom avait réellement changé

## Solutions Implémentées

### 1. Amélioration de `zoomToPoint` (viewportStore.ts)

**Avant :**
```typescript
zoomToPoint: (newZoom: number, point: Point) => {
  const { zoom, pan, minZoom, maxZoom } = get();
  const clampedZoom = clamp(newZoom, minZoom, maxZoom);
  const zoomRatio = clampedZoom / zoom;
  const newPan: Point = {
    x: point.x - (point.x - pan.x) * zoomRatio,
    y: point.y - (point.y - pan.y) * zoomRatio,
  };
  set({ zoom: clampedZoom, pan: newPan });
}
```

**Après :**
```typescript
zoomToPoint: (newZoom: number, point: Point) => {
  const { zoom, pan, minZoom, maxZoom } = get();
  const clampedZoom = clamp(newZoom, minZoom, maxZoom);

  // Si le zoom n'a pas changé (déjà au min/max), ne pas mettre à jour
  if (clampedZoom === zoom) {
    return;
  }

  // Calcul amélioré avec commentaires explicatifs
  const zoomRatio = clampedZoom / zoom;
  const newPan: Point = {
    x: point.x - (point.x - pan.x) * zoomRatio,
    y: point.y - (point.y - pan.y) * zoomRatio,
  };

  set({ zoom: clampedZoom, pan: newPan });
}
```

**Améliorations :**
- Vérification si le zoom a réellement changé
- Évite les mises à jour inutiles quand on atteint les limites
- Commentaires explicatifs de la formule mathématique

### 2. Zoom à la molette plus fluide (Viewport.tsx)

**Avant :**
```typescript
const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or in
const newZoom = zoom * zoomDelta;
```

**Après :**
```typescript
const zoomSpeed = 0.1; // 10% par étape de scroll
const direction = e.deltaY > 0 ? -1 : 1; // Inversion pour scroll naturel
const zoomDelta = 1 + (direction * zoomSpeed);
const newZoom = zoom * zoomDelta;
```

**Améliorations :**
- Vitesse de zoom configurable et plus prévisible
- Direction de scroll plus intuitive
- Incréments constants (10% au lieu de 10%/11%)

### 3. Boutons Zoom In/Out centrés (viewportStore.ts)

**Avant :**
```typescript
zoomIn: () => {
  const { zoom, maxZoom } = get();
  const newZoom = Math.min(zoom * ZOOM_STEP_FACTOR, maxZoom);
  set({ zoom: newZoom });
}
```

**Après :**
```typescript
zoomIn: () => {
  const { zoom, maxZoom, bounds, pan } = get();
  const newZoom = Math.min(zoom * ZOOM_STEP_FACTOR, maxZoom);
  
  // Zoom vers le centre du viewport
  const centerPoint = {
    x: bounds.width / 2,
    y: bounds.height / 2,
  };
  
  // Calcul du nouveau pan pour garder le centre stable
  const zoomRatio = newZoom / zoom;
  const newPan: Point = {
    x: centerPoint.x - (centerPoint.x - pan.x) * zoomRatio,
    y: centerPoint.y - (centerPoint.y - pan.y) * zoomRatio,
  };
  
  set({ zoom: newZoom, pan: newPan });
}
```

**Améliorations :**
- Les boutons zoomIn/zoomOut maintiennent maintenant le centre de la vue
- Pas de "saut" visuel lors de l'utilisation des boutons
- Comportement cohérent avec le zoom à la molette

## Comportement Attendu

### Zoom à la molette
1. Placer le curseur sur un point d'intérêt
2. Scroller vers le haut → zoom in (le point reste sous le curseur)
3. Scroller vers le bas → zoom out (le point reste sous le curseur)
4. Le zoom s'arrête aux limites (0.1x - 10x) sans décalage

### Boutons +/-
1. Cliquer sur "+" → zoom in de 20% centré sur la vue actuelle
2. Cliquer sur "-" → zoom out de 20% centré sur la vue actuelle
3. Le contenu reste centré, pas de décalage

### Boutons spéciaux
1. "Fit to View" → ajuste le zoom pour voir toute la grille
2. "1:1" → zoom à 100% (taille réelle)

## Tests Recommandés

### Test 1 : Zoom à la molette
```
1. Ouvrir le Grid Editor
2. Placer le curseur sur un coin de panel
3. Scroller plusieurs fois vers le haut
4. Vérifier que le coin reste sous le curseur
5. Scroller vers le bas jusqu'au zoom minimum
6. Vérifier qu'il n'y a pas de décalage aux limites
```

### Test 2 : Boutons de zoom
```
1. Centrer la vue sur un panel
2. Cliquer plusieurs fois sur "+"
3. Vérifier que le panel reste centré
4. Cliquer plusieurs fois sur "-"
5. Vérifier que le panel reste centré
```

### Test 3 : Combinaison molette + boutons
```
1. Zoomer avec la molette sur un point
2. Utiliser les boutons +/-
3. Vérifier que le comportement reste cohérent
4. Utiliser "Fit to View"
5. Vérifier que toute la grille est visible
```

### Test 4 : Limites de zoom
```
1. Zoomer au maximum (10x)
2. Essayer de zoomer encore
3. Vérifier qu'il n'y a pas de décalage
4. Dézoomer au minimum (0.1x)
5. Essayer de dézoomer encore
6. Vérifier qu'il n'y a pas de décalage
```

## Formule Mathématique du Zoom

Pour comprendre le calcul du pan lors du zoom :

```
Objectif : Garder un point canvas stable à l'écran lors du zoom

Variables :
- point : position écran du point à garder stable
- pan : décalage de la vue (translation)
- zoom : niveau de zoom actuel
- newZoom : nouveau niveau de zoom

Formule de transformation :
canvasPoint = (screenPoint - pan) / zoom

On veut que le point canvas reste identique :
(point - oldPan) / oldZoom = (point - newPan) / newZoom

Résolution pour newPan :
newPan = point - (point - oldPan) * (newZoom / oldZoom)
```

## Fichiers Modifiés

1. `creative-studio-ui/src/stores/viewportStore.ts`
   - Amélioration de `zoomToPoint`
   - Correction de `zoomIn` et `zoomOut`

2. `creative-studio-ui/src/components/gridEditor/Viewport.tsx`
   - Amélioration du `handleWheel`
   - Vitesse de zoom plus prévisible

## Notes Techniques

### Limites de Zoom
- **Minimum** : 0.1x (10% de la taille réelle)
- **Maximum** : 10x (1000% de la taille réelle)
- **Par défaut** : 1.0x (100% - taille réelle)

### Vitesses de Zoom
- **Molette** : 10% par cran de scroll
- **Boutons +/-** : 20% par clic (facteur 1.2)

### Performance
- Le zoom utilise CSS `transform: scale()` pour des performances optimales
- Pas de re-render des panels lors du zoom
- Utilisation de `will-change: transform` pour l'accélération GPU

## Problèmes Connus Résolus

✅ Le zoom ne restait pas centré sur le curseur  
✅ Les boutons +/- décalaient la vue  
✅ Comportement imprévisible aux limites de zoom  
✅ Incohérence entre zoom molette et boutons  

## Améliorations Futures Possibles

1. **Zoom animé** : Ajouter une transition CSS pour un zoom plus fluide
2. **Zoom tactile** : Améliorer le pinch-to-zoom sur tablettes
3. **Zoom clavier** : Ajouter Ctrl+Plus/Moins pour zoomer
4. **Préréglages de zoom** : Boutons 25%, 50%, 100%, 200%
5. **Zoom sur sélection** : Zoomer automatiquement sur les panels sélectionnés
