# TOP 10 - Priorités pour le bon fonctionnement des Wizards

## Vue d'ensemble
Ce document liste les 10 problèmes les plus critiques à résoudre pour que tous les wizards fonctionnent correctement.

---

## 🔴 PRIORITÉ 1: Unification de la gestion d'état (WizardContext vs WizardStore)

### Problème identifié
Le projet utilise deux systèmes de state management différents :
- `WizardContext.tsx` - Context API simple (currentStep uniquement)
- `wizardStore.ts` - Zustand store complet (plus de fonctionnalités)

### Fichiers concernés
- `creative-studio-ui/src/contexts/WizardContext.tsx`
- `creative-studio-ui/src/stores/wizard/wizardStore.ts`
- `creative-studio-ui/src/components/wizard/WizardContainer.tsx`

### Action requise
- Intégrer WizardContext avec wizardStore
- Utiliser wizardStore comme source de vérité unique
- Supprimer ou simplifier WizardContext

---

## 🔴 PRIORITÉ 2: Raccorder les callbacks de navigation (onNext, onPrevious, onGenerate)

### Problème identifié
Dans `WizardDialog.tsx`, les callbacks sont reçus mais certains ne sont pas appelés correctement :
- `onGenerate` appelé uniquement si `isLastStep`
- `onComplete` pas toujours appelé après validation

### Fichiers concernés
- `creative-studio-ui/src/components/wizard/WizardDialog.tsx`
- `creative-studio-ui/src/components/wizard/WizardNavigation.tsx`
- `creative-studio-ui/src/components/wizard/character/CharacterWizard.tsx`

### Action requise
- Vérifier que `onNext()` est appelé uniquement si `canGoNext` est true
- Vérifier que `onGenerate()` est appelé au bon moment
- Ajouter logging pour tracer les callbacks

---

## 🟠 PRIORITÉ 3: Validation des étapes - cohérence entre tous les wizards

### Problème identifié
Chaque wizard a sa propre validation :
- `CharacterWizard` : validation dans `validateStep()`
- `WizardStore` : validation basique dans `validateStep()`
- `WorldWizard` : pas de validation visible

### Fichiers concernés
- `creative-studio-ui/src/stores/wizard/wizardStore.ts`
- `creative-studio-ui/src/components/wizard/character/CharacterWizard.tsx`
- `creative-studio-ui/src/components/wizard/world/WorldWizard.tsx`

### Action requise
- Créer un `ValidationEngine` centralisé
- Standardiser les règles de validation par étape
- Afficher les erreurs de validation de manière cohérente

---

## 🟠 PRIORITÉ 4: Persistance des données des wizards

### Problème identifié
- `DraftPersistence` existe mais n'est pas utilisé par tous les wizards
- `CharacterPersistence` fonctionne mais pourrait échouer silencieusement
- Pas de recovery après crash

### Fichiers concernés
- `creative-studio-ui/src/services/wizard/DraftPersistence.ts`
- `creative-studio-ui/src/services/character/CharacterPersistence.ts`
- `creative-studio-ui/src/components/wizard/StateRecoveryDialog.tsx`

### Action requise
- Activer auto-save par défaut pour tous les wizards
- Implémenter `StateRecoveryDialog` pour recovery après crash
- Ajouter sync localeStorage → backend

---

## 🟠 PRIORITÉ 5: Vérification des services (LLM, ComfyUI)

### Problème identifié
Certains wizards vérifient le statut des services :
- `CharacterWizard` vérifie Ollama
- D'autres wizards ne vérifient pas avant de commencer

### Fichiers concernés
- `creative-studio-ui/src/hooks/useServiceStatus.ts`
- `creative-studio-ui/src/components/wizard/character/CharacterWizard.tsx`

### Action requise
- Ajouter vérification de service au niveau du wizard parent
- Afficher message clair si service non disponible
- Permettre configuration rapide si manquant

---

## 🟡 PRIORITÉ 6: Error Boundary pour chaque wizard

### Problème identifié
- `WizardErrorBoundary.tsx` existe mais pas utilisé systématiquement
- Les erreurs JS peuvent crasher tout le wizard

### Fichiers concernés
- `creative-studio-ui/src/components/wizard/WizardErrorBoundary.tsx`
- Tous les fichiers `*Wizard.tsx` et `*WizardModal.tsx`

### Action requise
- Envelopper chaque wizard dans `WizardErrorBoundary`
- Afficher message utilisateur friendly en cas d'erreur
- Logger l'erreur pour debugging

---

## 🟡 PRIORITÉ 7: Gestion du flux de completion (onComplete callback)

### Problème identifié
Le callback `onComplete` n'est pas toujours appelé :
- Dans `CharacterWizard`, `handleWizardComplete` ne fait rien (juste console.log)
- Dans `WizardDialog`, `onClose()` appelé après succès sans vérification

### Fichiers concernés
- `creative-studio-ui/src/components/wizard/WizardDialog.tsx`
- `creative-studio-ui/src/components/wizard/character/CharacterWizard.tsx`
- `creative-studio-ui/src/components/wizard/world/WorldWizard.tsx`

### Action requise
- S'assurer que `onComplete(data)` est appelé avec les données finales
- Ne pas fermer le modal avant que `onComplete` soit résolu
- Gérer les erreurs dans `onComplete`

---

## 🟡 PRIORITÉ 8: Step Indicator - navigation et validation visuelle

### Problème identifié
- `WizardStepIndicator` montre la progression
- Mais ne reflète pas l'état de validation (erreur/succès)
- AllowJumpToStep non implémenté

### Fichiers concernés
- `creative-studio-ui/src/components/wizard/WizardStepIndicator.tsx`
- `creative-studio-ui/src/components/wizard/WizardNavigation.tsx`

### Action requise
- Afficher les étapes avec erreur en rouge
- Afficher les étapes validées en vert
- Implémenter navigation directe si `allowJumpToStep=true`

---

## 🟢 PRIORITÉ 9: Standardiser la structure des wizards

### Problème identifié
Pas de structure standardisée :
- Certains wizards utilisent `WizardProvider` + `useWizard`
- D'autres utilisent `WizardContainer` + `wizardStore`
- Les steps ont des interfaces différentes

### Fichiers concernés
- `creative-studio-ui/src/components/wizard/WizardContainer.tsx`
- `creative-studio-ui/src/components/wizard/character/CharacterWizard.tsx`
- `creative-studio-ui/src/components/wizard/world/WorldWizard.tsx`

### Action requise
- Créer un `BaseWizard` component
- Standardiser les interfaces de props
- Documenter la structure attendue

---

## 🟢 PRIORITÉ 10: Tests d'intégration pour les wizards

### Problème identifié
- Tests unitaires existent (`__tests__/`)
- Pas de tests d'intégration end-to-end
- Pas de tests de flow complet (navigation + validation + completion)

### Fichiers concernés
- `creative-studio-ui/src/components/wizard/__tests__/WizardInfrastructure.test.tsx`
- Tous les fichiers dans `__tests__/`

### Action requise
- Créer tests d'intégration avec Playwright
- Tester le flow complet de chaque wizard
- Tester les cas d'erreur et recovery

---

## Résumé des priorités

| Priorité | Impact | Effort | Description |
|----------|--------|--------|-------------|
| 1 | 🔴 Critique | Moyen | Unifier state management |
| 2 | 🔴 Critique | Faible | Raccorder callbacks navigation |
| 3 | 🟠 Élevé | Élevé | Validation centralisée |
| 4 | 🟠 Élevé | Moyen | Persistance données |
| 5 | 🟠 Élevé | Faible | Vérification services |
| 6 | 🟡 Moyen | Faible | Error boundaries |
| 7 | 🟡 Moyen | Faible | Flux completion |
| 8 | 🟡 Moyen | Moyen | Step indicator |
| 9 | 🟢 Faible | Élevé | Standardisation structure |
| 10| 🟢 Faible | Élevé | Tests d'intégration |

---

## Prochaines étapes

1. Valider ce plan avec l'équipe
2. Commencer par les priorités 1 et 2 (impact critique, effort faible)
3. Créer un fichier TODO.md avec les tâches détaillées
4. Implémenter et tester step by step

