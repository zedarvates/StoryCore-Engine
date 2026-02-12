# TODO: Correction du Wizard de Création de Personnages

## Problème
Quand on édite un personnage créé via le wizard depuis le dashboard, plusieurs champs ne sont pas remplis:
- **Basic Identity (Role)**: archetype, age_range, narrative_function, character_arc
- **Appearance**: clothing_style, distinctive_features, height, build, posture

## Plan de correction

### 1. Corriger le mapping dans `store/index.ts` - fonction `completeWizard`
- [x] Ajouter le mapping pour `role.archetype`
- [x] Ajouter le mapping pour `role.narrative_function`
- [x] Ajouter le mapping pour `role.character_arc`
- [x] Corriger `visual_identity.age_range` pour utiliser le bon champ
- [x] Corriger `visual_identity.clothing_style` pour utiliser le bon champ
- [x] Ajouter `visual_identity.build`
- [x] Ajouter `visual_identity.posture`
- [x] Ajouter `visual_identity.distinctive_features`
- [x] Support des structures de données alternatives (`visual_identity`, `visual_attributes`, champs racine)

### 2. Vérifier le CharacterWizard
- [ ] S'assurer que les champs sont correctement collectés dans le wizard
- [ ] Vérifier que Step1BasicIdentity exporte `role.archetype`, `role.narrative_function`, `role.character_arc`
- [ ] Vérifier que Step2PhysicalAppearance exporte tous les champs d'apparence

### 3. Vérifier le CharacterEditor
- [ ] S'assurer que tous les champs sont affichés et enregistrés correctement

## Fichiers modifiés
1. `creative-studio-ui/src/store/index.ts` - Fonction `completeWizard` (CORRIGÉ)

## Progression
- [x] Étape 1: Corriger le mapping dans `completeWizard` - **TERMINÉ**
- [ ] Étape 2: Tester le wizard de création
- [ ] Étape 3: Vérifier l'éditeur de personnage

## Notes sur les corrections apportées

### Changements dans `store/index.ts` - fonction `completeWizard`

La fonction `completeWizard` dans le `case 'character':` a été mise à jour pour:

1. **Support multi-niveaux pour `visual_identity`:**
   - `visual_identity.hair_color` → `visual_identity.hair_color`
   - `visual_identity.hair_style` → `visual_identity.hair_style`
   - `visual_identity.hair_length` → `visual_identity.hair_length`
   - `visual_identity.eye_color` → `visual_identity.eye_color`
   - `visual_identity.eye_shape` → `visual_identity.eye_shape`
   - `visual_identity.skin_tone` → `visual_identity.skin_tone`
   - `visual_identity.facial_structure` → `visual_identity.facial_structure`
   - `visual_identity.distinctive_features` → `visual_identity.distinctive_features`
   - `visual_identity.age_range` → `visual_identity.age_range` (supporte aussi `age`)
   - `visual_identity.height` → `visual_identity.height`
   - `visual_identity.build` → `visual_identity.build`
   - `visual_identity.posture` → `visual_identity.posture`
   - `visual_identity.clothing_style` → `visual_identity.clothing_style` (supporte aussi `clothing`)
   - `visual_identity.color_palette` → `visual_identity.color_palette`

2. **Support pour `role`:**
   - `role.archetype` → `role.archetype`
   - `role.narrative_function` → `role.narrative_function`
   - `role.character_arc` → `role.character_arc`

3. **Support pour `personality`:**
   - `personality.traits` → `personality.traits`
   - `personality.values` → `personality.values`
   - `personality.fears` → `personality.fears`
   - `personality.desires` → `personality.desires`
   - `personality.flaws` → `personality.flaws`
   - `personality.strengths` → `personality.strengths`
   - `personality.temperament` → `personality.temperament`
   - `personality.communication_style` → `personality.communication_style` (supporte aussi `dialogue_style`)

4. **Support pour `background`:**
   - `background.origin` → `background.origin`
   - `background.occupation` → `background.occupation`
   - `background.education` → `background.education`
   - `background.family` → `background.family`
   - `background.significant_events` → `background.significant_events`
   - `background.current_situation` → `background.current_situation`

5. **Champs requis ajoutés:**
   - `reference_images: []`
   - `reference_sheet_images: []`

### Format de fallback
Le code utilise maintenant une cascade de fallbacks pour chaque champ, permettant de supporter différents formats de données:
```typescript
champ: output.data.source1?.champ || output.data.source2?.champ || output.data.source3 || ''
```

