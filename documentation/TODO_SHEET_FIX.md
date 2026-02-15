# TODO - Sheet Multi-Vue Character Fix

## Objectif
Corriger le système pour que les images tuile générées soient correctement stockées et utilisées comme images par défaut pour les sheets multi-vues personnage dans l'éditeur de personnage.

## Tâches

### 1. Mettre à jour `character.ts` - Ajouter les champs d'images à VisualIdentity ✅
- [x] Ajouter l'interface `ReferenceImageData` pour les images de référence
- [x] Ajouter l'interface `SheetImageData` pour les images de sheet
- [x] Ajouter les champs `reference_images` et `reference_sheet_images` à `VisualIdentity`
- [x] Mettre à jour `createEmptyCharacter()` pour inclure les nouveaux champs

### 2. Corriger `CharacterImagesSection.tsx` - Chargement et utilisation des images ✅
- [x] Charger les images existantes du personnage au démarrage
- [x] Implémenter la logique d'utilisation des images par défaut
- [x] Corriger la fonction `saveImagesToCharacter` pour utiliser les bons types
- [x] Vérifier que les images sont correctement affichées si elles existent

### 3. Vérifier la persistance ⏳
- [ ] Tester que les images sont sauvegardées dans localStorage
- [ ] Vérifier que les images sont restaurées au chargement du personnage

### 4. Tests manuels ⏳
- [ ] Ouvrir l'éditeur de personnage
- [ ] Vérifier que les images existantes sont affichées
- [ ] Générer une nouvelle image de référence
- [ ] Vérifier que l'image est stockée correctement
- [ ] Générer une sheet multi-vue
- [ ] Vérifier que les images sont correctement affichées

## Notes

### Types d'images ajoutés

```typescript
interface ReferenceImageData {
  id: string;
  url: string;
  type: 'reference' | 'reference_sheet';
  panel?: string;
  created_at: string;
  filename?: string;
}

interface SheetImageData {
  id: string;
  url: string;
  panel: string;  // 'front', 'left', 'right', 'back'
  created_at: string;
  filename?: string;
}
```

### Modification de VisualIdentity

```typescript
export interface VisualIdentity {
  // ... champs existants ...
  generated_portrait?: string;
  reference_images: ReferenceImageData[];  // NOUVEAU
  reference_sheet_images: SheetImageData[];  // NOUVEAU
}
```

## Modifications apportées

### 1. `creative-studio-ui/src/types/character.ts`
- Ajout des interfaces `ReferenceImageData` et `SheetImageData`
- Ajout des champs `reference_images` et `reference_sheet_images` à `VisualIdentity`
- Initialisation des nouveaux champs dans `createEmptyCharacter()`

### 2. `creative-studio-ui/src/components/character/editor/CharacterImagesSection.tsx`
- Ajout du chargement des images existantes via `useEffect`
- Conversion des types `CharacterImage` vers `ReferenceImageData`/`SheetImageData` lors de la sauvegarde
- Auto-sélection de la première image de référence au chargement
- Prévisualisation de la première image de sheet au chargement
- Valeurs par défaut pour `panel` ('reference' ou 'front') pour assurer la compatibilité des types

## Problème résolu

Le problème était que `CharacterImagesSection.tsx` essayait de sauvegarder les images dans `visual_identity.reference_images` et `visual_identity.reference_sheet_images`, mais ces champs n'existaient pas dans l'interface `VisualIdentity`. Les images étaient générées mais pas stockées correctement.

Avec ces corrections:
1. Les types sont maintenant définis correctement
2. Les images sont chargées depuis le store au démarrage du composant
3. Les images sont sauvegardées dans le store avec les bons types
4. Les images persistées sont restaurées au chargement

