Plan d’action technique: correction ESLint/TypeScript et cSpell et exécution lint/tests

Objectif
- Mettre le code en conformité ESLint et TypeScript strict pour TimelineControls.tsx et useToolInteractions.ts (variables inutilisées, typing explicite, imports propres, etc.).
- Étendre le dictionnaire cSpell avec les termes UI pertinents (Playhead, Timecode, Time, denoising, euler, etc.).
- Lancer lint et tests, corriger les mocks et ajuster les tests si nécessaire.

Fichiers cibles (références cliquables):
- TimelineControls.tsx: [`creative-studio-ui/src/sequence-editor/components/Timeline/TimelineControls.tsx:1`] 
- useToolInteractions.ts: [`creative-studio-ui/src/tools/useToolInteractions.ts:1`] 
- Dictionnaire cSpell: [`root/cspell.json:1`]

Plan par étapes (ordre recommandé):
- Étape 1: Vérification et localisation
  - Ouvrir TimelineControls.tsx et useToolInteractions.ts (l’état des ESLint/TS et cSpell).
- Étape 2: Reproduction des erreurs
  - Lister les messages d’erreur ESLint/TypeScript et les erreurs cSpell sur les deux fichiers.
- Étape 3: TimelineControls.tsx – nettoyage et typings
  - Supprimer les variables inutilisées (ex. isPaused) s’il existe.
  - Déclarer et typer toutes les variables locales et props utilisées.
  - Nettoyer les imports: supprimer les imports non utilisés et fusionner les imports lorsque c’est possible.
- Étape 4: useToolInteractions.ts – nettoyage et refactor
  - Réorganiser les imports et retirer les imports inutilisés.
  - Fusionner les imports du même module.
  - Refactoriser les blocs switch pour extraire des fonctions locales et éviter no-case-declarations.
- Étape 5: Dictionnaire cSpell
  - Ajouter Playhead, Timecode, Time, denoising, euler, etc. dans root/cspell.json.
  - Vérifier l’emplacement et la configuration pour que l’extension cSpell charge correctement le dictionnaire.
- Étape 6: Lint et TS strict
  - Lancer ESLint et corriger les erreurs selon les règles strictes et les options TS (typing explicite, absence de any/unknown, imports propres).
- Étape 7: Tests et mocks
  - Lancer les tests unitaires et ajuster les mocks et tests d’intégration si nécessaire.
  - Mettre à jour les mocks selon les nouveaux types et la logique.
- Étape 8: Documentation & suivi
  - Mettre à jour README/CHANGELOG et ajouter une section de suivi.
  - Documenter les choix et risques dans TODO_IMPLEMENTATION.md ou TODO_PLAN.md.
- Étape 9: Validation finale
  - Vérifier que lint et tests passent, que le dictionnaire est chargé et que les nouveaux termes sont reconnus.

Livrables
- TimelineControls.tsx et useToolInteractions.ts conformes ESLint/TS strict.
- Dictionnaire cSpell étendu et chargé.
- Tests et mocks adaptés.
- Documentation et plan de suivi actualisés.

Remarques
- Ce plan est itératif: les priorités peuvent être réajustées en fonction des messages d’erreur et des dépendances entre modules.
- Si vous validez ce plan, je lancerai les actions dans le cadre du mode Code et vous présenterai les résultats et les étapes suivantes.

Références utilisées dans ce plan:
- TimelineControls.tsx: [`creative-studio-ui/src/sequence-editor/components/Timeline/TimelineControls.tsx:1`]
- useToolInteractions.ts: [`creative-studio-ui/src/tools/useToolInteractions.ts:1`]
- Dictionnaire: [`root/cspell.json:1`]

