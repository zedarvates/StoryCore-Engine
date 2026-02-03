# Plan de Correction des Bugs UI Critiques

## Priorité Haute - Corrections Immédiates

### ✅ 1. Fix useToast.ts - ID Generation
**Statut:** TERMINÉ
**Problème:** `Math.random()` pour générer les IDs des toasts peut causer des collisions
**Solution:** Utiliser un counter séquentiel + timestamp
**Fichier:** `creative-studio-ui/src/hooks/use-toast.ts`

### ✅ 2. Fix globalErrorHandler.ts - Null Check
**Statut:** TERMINÉ
**Problème:** `openFeedbackPanel` pourrait être null lors de l'appel
**Solution:** Ajouter try/catch et logs détaillés
**Fichier:** `creative-studio-ui/src/utils/globalErrorHandler.ts`

### ✅ 3. Fix Menu.tsx - Race Condition
**Statut:** TERMINÉ
**Problème:** setTimeout de 100ms dans click outside handler peut causer des problèmes de race
**Solution:** Utiliser une ref pour track si le menu est ouvert + cleanup approprié
**Fichier:** `creative-studio-ui/src/components/menuBar/Menu.tsx`

### ✅ 4. Fix MenuDropdown.tsx - Race Condition
**Statut:** TERMINÉ
**Problème:** Même problème de race condition avec setTimeout
**Solution:** Refactor pour éviter le setTimeout + cleanup approprié
**Fichier:** `creative-studio-ui/src/components/menuBar/MenuDropdown.tsx`

### ✅ 5. Fix WizardErrorBoundary.tsx - Accessibilité
**Statut:** TERMINÉ
**Problème:** Texte sur fond coloré avec contraste insuffisant (text-destructive sur bg-muted)
**Solution:** Couleurs explicites avec meilleur contraste WCAG AA + role="alert"
**Fichier:** `creative-studio-ui/src/components/wizard/WizardErrorBoundary.tsx`

### 6. Fix CharactersModal.tsx - Performance (À FAIRE)
**Problème:** Pas de React.memo sur les composants internes de liste
**Solution:** Ajouter React.memo aux composants de liste de personnages
**Fichier:** `creative-studio-ui/src/components/modals/CharactersModal.tsx`

### 7. Fix MenuBar.tsx - Documentation (À FAIRE)
**Problème:** Alt key focus management non standard
**Solution:** Documenter et ajouter alternative F10
**Fichier:** `creative-studio-ui/src/components/menuBar/MenuBar.tsx`

---

## Métriques de Suivi

- [x] IDs de toasts uniques
- [x] Gestion null du feedback panel
- [x] Race conditions résolues
- [x] Contraste accessibilité amélioré

## Tests de Validation

1. ✅ Tester les toasts multiples sans collision d'IDs
2. ✅ Tester la navigation clavier du menu
3. ✅ Tester la fermeture du menu au click outside
4. ✅ Tester l'affichage des erreurs de wizards avec bon contraste

---

## Résumé des Modifications

### creative-studio-ui/src/hooks/use-toast.ts
- Remplacement `Math.random()` par counter séquentiel + timestamp
- Ajout `pendingTimeouts` pour cleanup des timeouts
- Amélioration de la gestion des dépendances React

### creative-studio-ui/src/utils/globalErrorHandler.ts
- Ajout try/catch dans `captureError`
- Logs plus détaillés quand le callback n'est pas défini

### creative-studio-ui/src/components/menuBar/Menu.tsx
- Refactor du click outside handler avec ref tracking
- Correction aria-expanded (boolean au lieu de string)
- Meilleure gestion du cleanup

### creative-studio-ui/src/components/menuBar/MenuDropdown.tsx
- Même refactor que Menu.tsx
- Meilleure gestion des race conditions

### creative-studio-ui/src/components/wizard/WizardErrorBoundary.tsx
- Couleurs explicites pour meilleur contraste
- Ajout `role="alert"` pour accessibilité
- Style de la stack trace amélioré

