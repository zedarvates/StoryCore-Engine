# TODO: Implémentation des Priorités 1 et 2 pour les Wizards

## Priorité 1: Unification de la gestion d'état (WizardContext vs WizardStore)

### Tâche 1.1: Analyser l'utilisation actuelle de WizardContext ✅ FAIT
- [x] Lu `WizardContext.tsx` - Complet avec auto-save, validation, submission
- [x] Lu `wizardStore.ts` - Plus simple avec persist middleware
- [x] Lu `WizardNavigation.tsx` - Bien structuré avec callbacks
- [x] Lu `WizardDialog.tsx` - Necessite corrections pour les callbacks

### Tâche 1.2: Concevoir l'intégration ✅ PLAN DÉCIDÉ
- [x] Décision: Garder WizardContext comme API principale pour les wizards de type (character, world, storyteller)
- [x] wizardStore sera utilisé uniquement pour le Project Setup Wizard (legacy)
- [x] Les deux systèmes peuvent coexister pour l'instant

### Tâche 1.3: Mettre à jour WizardContext.tsx
- [ ] Ajouter des selectors pour chaque type de données (comme dans wizardStore)
- [ ] Améliorer la gestion des erreurs dans submitWizard

### Tâche 1.4: Mettre à jour wizardStore.ts (optionnel - pour future migration)
- [ ] Documenter que wizardStore est en phase de dépréciation
- [ ] Ajouter un warning si utilisé avec de nouveaux wizards

### Tâche 1.5: Mettre à jour les composants utilisant useWizard()
- [ ] CharacterWizard.tsx
- [ ] WorldWizard.tsx
- [ ] StorytellerWizard.tsx
- [ ] Tous les steps (Step1BasicIdentity.tsx, etc.)

### Tâche 1.6: Tester l'intégration
- [ ] Vérifier que chaque wizard fonctionne correctement
- [ ] Tester la navigation entre les étapes
- [ ] Tester la persistance des données

---

## Priorité 2: Raccorder les callbacks de navigation (onNext, onPrevious, onGenerate)

### Tâche 2.1: Analyser WizardDialog.tsx ✅ FAIT
- [x] Lu et compris le flux de navigation actuel
- [x] Identifié où onNext/onPrevious/onGenerate sont définis
- [x] Vérifié les conditions d'appel

### Tâche 2.2: Analyser WizardNavigation.tsx ✅ FAIT
- [x] Lu le component de navigation
- [x] Identifié les handlers de boutons
- [x] Vérifié comment les callbacks sont passés

### Tâche 2.3: Corriger WizardDialog.tsx ✅ FAIT
- [x] Ajouté logging pour tracer les callbacks
- [x] Ajouté event listener pour 'wizard-submit'
- [x] handleGenerate est appelé via l'event listener

### Tâche 2.4: Corriger WizardNavigation.tsx ✅ FAIT
- [x] Bouton "Next" appelle onNext pour les étapes intermédiaires
- [x] Bouton "Complete" à la dernière étape appelle onSubmit via event
- [x] Changé le texte de "Review" à "Complete"

### Tâche 2.5: Mettre à jour WizardNavigationProps ✅ FAIT
- [x] Ajouté onSubmit?: () => void
- [x] Ajouté onCancel?: () => void

### Tâche 2.6: Corriger WizardContainer.tsx ✅ FAIT
- [x] Ajouté event listener pour 'wizard-submit'
- [x] handleConfirm est appelé quand l'event est reçu
- [x] Utilisation de useRef pour éviter les erreurs de hoisting

### Tâche 2.7: Tester les callbacks de navigation
- [ ] Tester navigation Next/Previous
- [ ] Tester bouton Generate/Complete
- [ ] Tester annulation
- [ ] Vérifier que les données sont préservées

---

## Priorité 3: Validation centralisée (ValidationEngine) ✅ CRÉÉ

### Tâche 3.1: Créer ValidationEngine ✅ FAIT
- [x] Fichier créé: `src/services/wizard/ValidationEngine.ts`
- [x] Types ValidationResult, ValidationError définis
- [x] Fonctions utilitaires (createValidResult, combineResults, isEmpty, etc.)

### Tâche 3.2: Implémenter règles de validation Character ✅ FAIT
- [x] validateCharacterStep1 (nom, archetype, age range requis)
- [x] validateCharacterStep2 (optionnel)
- [x] validateCharacterStep3 (max 10 traits)
- [x] validateCharacterStep4 (optionnel)
- [x] validateCharacterStep5 (relationships)
- [x] validateCharacterStep6 (final review)

### Tâche 3.3: Implémenter règles de validation World ✅ FAIT
- [x] validateWorldStep1 (nom, genre requis)
- [x] validateWorldStep2 (au moins 1 règle)
- [x] validateWorldStep3 (setting)
- [x] validateWorldStep4 (societies optionnel)
- [x] validateWorldStep5 (final review)

### Tâche 3.4: Implémenter règles de validation Storyteller ✅ FAIT
- [x] validateStorytellerStep1 (storySummary requis)
- [x] validateStorytellerStep2 (selectedCharacters requis)
- [x] validateStorytellerStep3 (optionnel)
- [x] validateStorytellerStep4 (mainConflict requis)
- [x] validateStorytellerStep5 (final review)

### Tâche 3.5: Implémenter règles de validation Project Setup ✅ FAIT
- [x] validateProjectSetupStep1 (projectName requis)
- [x] validateProjectSetupStep2 (genres requis)
- [x] validateProjectSetupStep3 (scenes requis)

### Tâche 3.6: Créer WizardValidationEngine class ✅ FAIT
- [x] Enregistrement automatique des règles par défaut
- [x] Méthode validateStep(wizardType, step, data)
- [x] Méthode validateAll(wizardType, allData)
- [x] Méthode getSummary(result) pour affichage

### Tâche 3.7: Helper functions pour UI ✅ FAIT
- [x] formatValidationErrors(result)
- [x] getFieldError(result, field)
- [x] hasFieldError(result, field)
- [x] groupErrorsByField(result)

### Tâche 3.8: Intégrer ValidationEngine dans CharacterWizard
- [ ] Remplacer validateStep actuel par validationEngine.validateStep
- [ ] Afficher erreurs avec formatValidationErrors

### Tâche 3.9: Intégrer ValidationEngine dans wizardStore
- [ ] Mettre à jour validateStep pour utiliser validationEngine
- [ ] Supprimer validation inline

---

## Priorité 4: Persistance des données (Auto-save) ✅ CRÉÉ

### Tâche 4.1: Créer hook useWizardAutoSave ✅ FAIT
- [x] Fichier créé: `src/hooks/useWizardAutoSave.ts`
- [x] Auto-save avec intervalle configurable (30s par défaut)
- [x] Support web (localStorage) et desktop (file system)
- [x] Méthodes: save(), clear(), listDrafts(), recover()

### Tâche 4.2: Implémenter crash recovery ✅ FAIT
- [x] Hook useWizardCrashRecovery
- [x] Détection automatique des drafts récents (< 24h)
- [x] Dialog de récupération avec accept/discard

### Tâche 4.3: Créer composants UI ✅ FAIT
- [x] WizardAutoSaveIndicator - Affiche statut (Saving/Saved/Unsaved)
- [x] WizardRecoveryDialog - Dialog de crash recovery

### Tâche 4.4: Intégrer dans CharacterWizard
- [ ] Utiliser useWizardAutoSave dans CharacterWizard
- [ ] Afficher WizardAutoSaveIndicator
- [ ] Afficher WizardRecoveryDialog si crash recovery disponible

### Tâche 4.5: Intégrer dans WorldWizard
- [ ] Utiliser useWizardAutoSave dans WorldWizard
- [ ] Afficher WizardAutoSaveIndicator
- [ ] Afficher WizardRecoveryDialog si crash recovery disponible

### Tâche 4.6: Intégrer dans StorytellerWizard
- [ ] Utiliser useWizardAutoSave dans StorytellerWizard
- [ ] Afficher WizardAutoSaveIndicator
- [ ] Afficher WizardRecoveryDialog si crash recovery disponible

---

## Priorité 5: Vérification des services (Service Status) ✅ CRÉÉ

### Tâche 5.1: Créer ServiceStatusBanner ✅ FAIT
- [x] Fichier créé: `src/components/service/ServiceStatusBanner.tsx`
- [x] Affichage du statut Ollama et ComfyUI
- [x] 3 variantes: banner, card, inline
- [x] Auto-expansion si services requis manquants

### Tâche 5.2: Implémenter ServiceBadge ✅ FAIT
- [x] Icône et couleur selon le statut
- [x] Bouton Configure si service requis manquant
- [x] Design cohérent avec le reste de l'UI

### Tâche 5.3: Créer helper getWizardServiceRequirements ✅ FAIT
- [x] Configuration par wizard ID
- [x] Champs required/optional pour chaque service
- [x] Descriptions claires pour l'utilisateur

### Tâche 5.4: Créer WizardServiceIndicator ✅ FAIT
- [x] Component compact pour les headers
- [x] Utilise getWizardServiceRequirements automatiquement

### Tâche 5.5: Intégrer dans CharacterWizard
- [ ] Ajouter ServiceStatusBanner en bas de page
- [ ] Configurer onConfigure pour ouvrir les settings

### Tâche 5.6: Intégrer dans WorldWizard
- [ ] Ajouter ServiceStatusBanner en bas de page
- [ ] Configurer onConfigure pour ouvrir les settings

### Tâche 5.7: Intégrer dans StorytellerWizard
- [ ] Ajouter ServiceStatusBanner en bas de page
- [ ] Configurer onConfigure pour ouvrir les settings

---

## Priorité 6: Error Boundaries ✅ CRÉÉ

### Tâche 6.1: Améliorer WizardErrorBoundary existant ✅ FAIT
- [x] Emergency export des données en cas d'erreur
- [ ] Logging détaillé pour debugging

### Tâche 6.2: Créer useWizardErrorHandler ✅ FAIT
- [x] Hook créé: `src/hooks/useWizardErrorHandler.ts`
- [x] Gestion d'erreur avec recovery options
- [x] Auto-export des données
- [x] Messages d'erreur user-friendly

### Tâche 6.3: Intégrer dans CharacterWizard
- [ ] Envelopper CharacterWizard avec WizardErrorBoundary
- [ ] Utiliser useWizardErrorHandler pour erreurs catchées

### Tâche 6.4: Intégrer dans WorldWizard
- [ ] Envelopper WorldWizard avec WizardErrorBoundary
- [ ] Utiliser useWizardErrorHandler pour erreurs catchées

### Tâche 6.5: Intégrer dans StorytellerWizard
- [ ] Envelopper StorytellerWizard avec WizardErrorBoundary
- [ ] Utiliser useWizardErrorHandler pour erreurs catchées

---

## Priorité 7: Flux completion (onComplete) ✅ CRÉÉ

### Tâche 7.1: Créer useWizardCompletion ✅ FAIT
- [x] Hook créé: `src/hooks/useWizardCompletion.ts`
- [x] Gestion du flux de completion complet
- [x] Validation avant completion optionnelle
- [x] Callbacks onComplete, onError, onCancel
- [x] Auto-cleanup après completion

### Tâche 7.2: Créer useWizardStepCompletion ✅ FAIT
- [x] Gestion multi-étapes
- [ ] Collecte des données de chaque étape
- [x] Navigation entre étapes

### Tâche 7.3: Helpers de validation ✅ FAIT
- [x] validateWizardData - Validation des champs requis
- [x] createWizardCompleteHandler - Factory pour callbacks
- [x] formatCompletionResult - Formatage pour display

### Tâche 7.4: Intégrer dans CharacterWizard
- [ ] Utiliser useWizardCompletion dans CharacterWizard
- [ ] Appeler onComplete avec données finales
- [ ] Gérer les erreurs avec onError

### Tâche 7.5: Intégrer dans WorldWizard
- [ ] Utiliser useWizardCompletion dans WorldWizard
- [ ] Appeler onComplete avec données finales
- [ ] Gérer les erreurs avec onError

### Tâche 7.6: Intégrer dans StorytellerWizard
- [ ] Utiliser useWizardCompletion dans StorytellerWizard
- [ ] Appeler onComplete avec données finales
- [ ] Gérer les erreurs avec onError

---

## Priorité 8: Step Indicator avec couleurs ✅ CRÉÉ

### Tâche 8.1: Améliorer WizardStepIndicator ✅ FAIT
- [x] Fichier mis à jour: `src/components/wizard/WizardStepIndicator.tsx`
- [x] Ajout de StepState avec status (pending/valid/invalid/warning)
- [x] Couleurs selon état de validation
- [x] Badges d'erreur/avertissement

### Tâche 8.2: Créer CompactStepIndicator ✅ FAIT
- [x] Version compacte pour espaces réduits
- [ ] Même logique de couleurs

### Tâche 8.3: Créer StepIndicatorLegend ✅ FAIT
- [x] Légende des couleurs pour l'utilisateur

### Tâche 8.4: Intégrer stepStates dans CharacterWizard
- [ ] Passer stepStates au WizardStepIndicator
- [ ] Mettre à jour stepStates lors de la validation

### Tâche 8.5: Intégrer stepStates dans WorldWizard
- [ ] Passer stepStates au WizardStepIndicator
- [ ] Mettre à jour stepStates lors de la validation

### Tâche 8.6: Intégrer stepStates dans StorytellerWizard
- [ ] Passer stepStates au WizardStepIndicator
- [ ] Mettre à jour stepStates lors de la validation

---

## Priorité 9: Standardisation (BaseWizard) ✅ CRÉÉ

### Tâche 9.1: Créer BaseWizard component ✅ FAIT
- [x] Fichier créé: `src/components/wizard/BaseWizard.tsx`
- [x] Gestion centralisée de l'état du wizard
- [x] Intégration auto-save, validation, error handling
- [x] Navigation standardisée

### Tâche 9.2: Créer factory function createWizard ✅ FAIT
- [x] Fonction pour créer des wizards typés
- [ ] Documentation des paramètres

### Tâche 9.3: Définir interfaces standardisées ✅ FAIT
- [x] BaseWizardConfig<T>
- [x] BaseWizardProps<T>
- [x] WizardStepComponentProps<T>

### Tâche 9.4: Exemple d'utilisation ✅ FAIT
- [x] Exemple CharacterWizard avec createWizard
- [x] Pattern de renderStep callback

### Tâche 9.5: Remplacer CharacterWizard par BaseWizard
- [ ] Refactorer CharacterWizard pour utiliser BaseWizard
- [ ] Tester le wizard refactorisé

### Tâche 9.6: Remplacer WorldWizard par BaseWizard
- [ ] Refactorer WorldWizard pour utiliser BaseWizard
- [ ] Tester le wizard refactorisé

### Tâche 9.7: Remplacer StorytellerWizard par BaseWizard
- [ ] Refactorer StorytellerWizard pour utiliser BaseWizard
- [ ] Tester le wizard refactorisé

---

## Priorité 10: Tests d'intégration (Playwright E2E) ✅ CRÉÉ

### Tâche 10.1: Créer fichier de tests E2E ✅ FAIT
- [x] Fichier créé: `tests/wizard/wizard.integration.spec.ts`
- [x] Tests pour Character Wizard
- [x] Tests pour World Wizard
- [x] Tests pour Storyteller Wizard

### Tâche 10.2: Tests Auto-save et Crash Recovery ✅ FAIT
- [x] Test auto-save des données
- [x] Test recovery après crash
- [x] Test confirmation de cancellation

### Tâche 10.3: Tests Service Status ✅ FAIT
- [x] Test affichage du statut Ollama/ComfyUI
- [x] Test configuration depuis le banner

### Tâche 10.4: Tests Step Indicator ✅ FAIT
- [x] Test couleurs selon état validation
- [x] Test badges d'erreur

### Tâche 10.5: Tests Error Boundary ✅ FAIT
- [x] Test UI d'erreur
- [x] Test retry après erreur

### Tâche 10.6: Tests Navigation ✅ FAIT
- [x] Test navigation Next/Back
- [x] Test Cancel avec confirmation

### Tâche 10.7: Configuration Playwright ✅ FAIT
- [x] Commentaires pour playwright.config.ts
- [x] Commandes pour exécuter les tests

---

## Tests de régression

---

## Tests de régression

### Avant de commencer
- [ ] Créer un backup des fichiers modifiés
- [ ] Noter les tests existants qui passent

### Après chaque tâche
- [ ] Exécuter les tests unitaires
- [ ] Vérifier que rien n'est cassé
- [ ] Documenter les éventuels problèmes

### Tests finaux
- [ ] Tester tous les wizards manuellement
- [ ] Vérifier la navigation entre les étapes
- [ ] Vérifier la persistance des données
- [ ] Vérifier la completion des wizards

---

## Notes

### Files à modifier
- `creative-studio-ui/src/contexts/WizardContext.tsx`
- `creative-studio-ui/src/stores/wizard/wizardStore.ts`
- `creative-studio-ui/src/components/wizard/WizardDialog.tsx`
- `creative-studio-ui/src/components/wizard/WizardNavigation.tsx`
- `creative-studio-ui/src/components/wizard/character/CharacterWizard.tsx`
- `creative-studio-ui/src/components/wizard/world/WorldWizard.tsx`
- `creative-studio-ui/src/components/wizard/storyteller/StorytellerWizard.tsx`
- `creative-studio-ui/src/components/wizard/character/Step*.tsx` (tous les steps)
- `creative-studio-ui/src/components/wizard/world/Step*.tsx` (tous les steps)

### Ordre d'implémentation suggéré
1. Analyser l'existant (Tâches 1.1, 2.1, 2.2)
2. Implémenter Priorité 1 (Tâches 1.2-1.6)
3. Implémenter Priorité 2 (Tâches 2.3-2.5)
4. Tester tout ensemble (Tâches 2.6)

