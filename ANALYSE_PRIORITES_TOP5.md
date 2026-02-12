# StoryCore Engine - Top 5 Priorités Détaillées

## 🔴 PRIORITÉ #1: Erreurs de Build TypeScript

### Problème
- **~381 erreurs TypeScript** dans `creative-studio-ui/`
- Bloque le pipeline de build frontend
- Impact critique sur le développement

### Fichiers critiques à corriger

| Fichier | Type d'erreur | Sévérité |
|---------|---------------|----------|
| `ProjectDashboardNew.tsx` | Type 'unknown' not assignable | Haute |
| `Menu.tsx` | ARIA attribute value invalid | Haute |
| `AutomationPanel.tsx` | JSX.Element namespace errors | Haute |

### Plan d'action
```
1.1 Corriger ProjectDashboardNew.tsx (lignes 714-738)
    - Ajouter type guards pour 'unknown'
    - Corriger imports GeneratedAsset

1.2 Corriger Menu.tsx
    - aria-expanded={isOpen} au lieu de expression

1.3 Corriger AutomationPanel.tsx
    - Résoudre erreurs JSX.Element namespace
```

### Effort estimé: 2-3 jours

---

## 🟠 PRIORITÉ #2: Intégration Wizard Modal Phase 1

### Problème
- **20 tâches en attente**
- Wizards Sequence Plan et Shot Wizard non fonctionnels
- Bloque l'expérience utilisateur

### État actuel
- Emplacement: `.kiro/specs/wizard-modal-integration/`
- Statut: Non commencé

### Wizards à implémenter
```
2.1 Sequence Plan Wizard Modal
2.2 Shot Wizard Modal
2.3 Integration avec le système existant
2.4 Tests d'intégration
```

### Effort estimé: 2-3 jours

---

## 🟡 PRIORITÉ #3: Séquence Editor - Finalisation

### Problème
- **91% complet** (21/23 tâches terminées)
- 2 tâches restantes bloquent la release

### Tâches manquantes
```
3.1 Task 13: Raccourcis clavier globaux
    - Ctrl/Cmd + Shift + P: Sequence Plan Wizard
    - Ctrl/Cmd + Shift + S: Shot Wizard
    - Ctrl/Cmd + Shift + Q: Quick Shot

3.2 Task 22: Intégration et polish
    - Nettoyage du code
    - Optimisations UI

3.3 Task 23: Tests finaux
    - Tests d'intégration
    - Tests de régression
```

### Effort estimé: 1-2 jours

---

## 🟢 PRIORITÉ #4: APIs Backend Critiques

### Problème
- APIs essentielles non implémentées
- Bloque fonctionnalités avancées

### APIs manquantes

| API | Description | Effort |
|-----|-------------|--------|
| `POST /api/projects` | Création projets | 3-4 semaines |
| `POST /api/sequences/generate` | Génération séquences | 4-5 semaines |
| `POST /api/shots` | Gestion plans | 2-3 semaines |
| `POST /api/audio/generate` | Génération audio | 3-4 semaines |

### Plan d'action
```
4.1 Créer structure API REST
4.2 Implémenter endpoints projets
4.3 Ajouter génération séquences
4.4 Intégrer gestion shots
4.5 Développer génération audio
```

### Effort total: 2-3 semaines

---

## 🔵 PRIORITÉ #5: Tests et Validation

### Problème
- Tests manquants pour wizards
- Validation de propriétés incomplète

### Tests à implémenter

#### Tests React Hooks
```
5.1 Test unitaire CharacterWizard rendering
5.2 Test intégration character creation flow
```

#### Tests de Validation
```
5.3 Test propriété validation role object
5.4 Test propriété migration role
5.5 Tests unitaires cas limites
```

### Effort estimé: 0.5-1 jour

---

## 📅 Plan d'Exécution

### Semaine 1: Critiques Bloquants

| Jour | Tâche | Livrable |
|------|-------|----------|
| 1 | Corriger TypeScript ProjectDashboardNew | Build passant |
| 2 | Corriger TypeScript Menu.tsx, AutomationPanel | 0 erreurs UI |
| 3 | Wizard Modal Phase 1 - Structure | Modals crées |
| 4 | Wizard Modal - Intégration | Wizards intégrés |
| 5 | Sequence Editor Tâches 13, 22 | Editor finalisé |

### Semaine 2: Fonctionnalités Core

| Semaine | Focus |
|---------|-------|
| 2 | APIs Backend - Phase 1 |
| 3 | APIs Backend - Phase 2 |
| 4 | Tests et validation |

---

## 📊 Métriques Actuelles

| Métrique | Valeur | Cible |
|----------|--------|-------|
| TypeScript Errors | ~381 | 0 |
| Test Pass Rate | ~50% | 100% |
| Build Time | 8s | <10s |
| Bundle Size | 1.38 MB | <2 MB |
| Sécurité | 41/41 | 41/41 |

---

## 🎯 Jalons

### Jalon 1 (Semaine 1)
- [ ] 0 erreurs TypeScript
- [ ] Wizards Modal fonctionnels
- [ ] Sequence Editor complété

### Jalon 2 (Semaine 2)
- [ ] APIs projets fonctionnelles
- [ ] Tests >75% pass rate

### Jalon 3 (Semaine 4)
- [ ] Toutes APIs implémentées
- [ ] 100% tests passants
- [ ] Release ready

---

*Document généré: 2026-02-10*
*Prochaine mise à jour: Hebdomadaire*

