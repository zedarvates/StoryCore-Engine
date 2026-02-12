# 🚨 TOP 10 TÂCHES URGENTES - StoryCore Engine

## Priorité 🔴 CRITIQUE (Bloquant)

### 1. Résolution des Erreurs de Build TypeScript
- **Statut:** 381 erreurs restantes
- **Emplacement:** `creative-studio-ui/`
- **Impact:** Bloque tout le pipeline de développement frontend
- **Effort estimé:** 2-3 jours

### 2. Intégration Wizard Modal - Phase 1
- **Statut:** Non commencé (20 tâches en attente)
- **Emplacement:** `.kiro/specs/wizard-modal-integration/`
- **Impact:** Empêche l'utilisation des modals Sequence Plan et Shot Wizard
- **Effort estimé:** 2-3 jours

### 3. Séquence Editor - Tâches Finales (13, 22, 23)
- **Statut:** 91% complet (21/23 tâches terminées)
- **Emplacement:** `.kiro/specs/sequence-editor-interface/TODO.md`
- **Tâches manquantes:**
  - Task 13: Raccourcis clavier globaux
  - Task 22: Intégration et polish
  - Task 23: Tests finaux
- **Effort estimé:** 1-2 jours

## Priorité 🟠 HAUTE (Bloquant)

### 4. Stores Redux pour UI Integration
- **Statut:** En cours
- **Fichiers à créer:**
  - `mediaSearchStore.ts`
  - `audioRemixStore.ts`
  - `transcriptionStore.ts`
- **Effort estimé:** 1 jour

### 5. APIs Backend Manquantes
- **Statut:** Multiples APIs critiques non implémentées
- **APIs critiques:**
  - `POST /api/projects` (3-4 semaines)
  - `POST /api/sequences/generate` (4-5 semaines)
  - `POST /api/shots` (2-3 semaines)
  - `POST /api/audio/generate` (3-4 semaines)
- **Effort estimé:** 2-3 semaines

### 6. Tests Validation Character Role
- **Statut:** Correction core faite, tests en attente
- **Tâches manquantes:**
  - Test propriété validation role object
  - Test propriété migration role
  - Tests unitaires cas limites
- **Effort estimé:** 0.5 jour

## Priorité 🟡 MOYENNE

### 7. Tests React Hooks
- **Tests manquants:**
  - Test unitaire CharacterWizard rendering
  - Test intégration character creation flow
- **Effort estimé:** 0.5 jour

### 8. Raccourcis Clavier Globaux
- **Raccourcis requis:**
  - Ctrl/Cmd + Shift + P: Sequence Plan Wizard
  - Ctrl/Cmd + Shift + S: Shot Wizard
  - Ctrl/Cmd + Shift + Q: Quick Shot
- **Effort estimé:** 0.5-1 jour

### 9. Wizards de Production Manquants
- **Wizards manquants:**
  - Audio Production Wizard
  - Video Editor Wizard
  - Comic-to-Sequence Wizard
- **Effort estimé:** 2-3 semaines

### 10. Services Cache & Offline
- **Services à créer:**
  - CacheService (cacheService.ts)
  - OfflineService (offlineService.ts)
- **Effort estimé:** 1-2 jours

## Plan d'Action Recommandé

### Semaine 1: Critiques Bloquants
1. ✅ Résoudre erreurs TypeScript
2. 🔄 Démarrer Intégration Wizard Modal Phase 1
3. 🔄 Créer Stores Redux

### Semaine 2: Intégration
1. Finaliser Wizard Modal Phases 2-3
2. Compléter tâches Sequence Editor
3. Ajouter raccourcis clavier globaux

### Semaine 3-4: Fonctionnalités Core
1. Implémenter APIs backend critiques
2. Ajouter Wizards de production
3. Implémenter cache & support offline
