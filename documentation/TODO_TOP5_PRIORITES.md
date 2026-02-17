# StoryCore Engine - TODO Top 5 Priorités

## 🔴 PRIORITÉ #1: AI Vision & Content Integration
### Objectif: Permettre la création d'assets (Personnages, Lieux, Objets) à partir de l'analyse d'images.
- [ ] **ChatService.ts**: Finaliser `handleVisionRequest` pour retourner des payloads complets (visualRef, prompts).
- [ ] **ContentCreationService.ts**: Mettre à jour `executeCreation` pour mapper `visualRef` et `prompts` dans l'entité créée.
- [ ] **UI Integration**: S'assurer que `LandingChatBox` passe correctement les données.

## 🟠 PRIORITÉ #2: Sequence Recovery Bug
### Objectif: Corriger la fenêtre de récupération inattendue dans "Plan séquence".
- [x] Investiguer `SequencePlanWizard.tsx` et `useStateRecovery`.
- [x] Identifier pourquoi le wizard déclenche la récupération sans erreur apparente.

## 🟡 PRIORITÉ #3: Project Persistence & Data Integrity
### Objectif: Garantir la sauvegarde fiable des projets et des assets.
- [ ] Standardiser l'utilisation des timestamps (number vs Date).
- [ ] Vérifier la cohérence des types entre `RoverBackend` et le frontend.
- [ ] Corriger les erreurs de chargement JSON (SyntaxError).

## 🟢 PRIORITÉ #4: Character Management Dashboard
### Objectif: Affichage correct et filtrage des personnages par projet.
- [ ] Vérifier `CharacterList` et les filtres de projet.
- [ ] S'assurer que `useCharacterManager` gère correctement l'état actif.

## 🔵 PRIORITÉ #5: Documentation & Type Safety
### Objectif: Maintenir la base de code propre et documentée.
- [ ] Mettre à jour le README.
- [ ] Corriger les erreurs TypeScript restantes dans `ProjectDashboardNew` et `StoryboardConnector`.

---
*Mis à jour le: 2026-02-17*
