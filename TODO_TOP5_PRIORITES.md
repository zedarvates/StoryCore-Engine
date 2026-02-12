# StoryCore Engine - TODO Top 5 Priorités

## 🔴 PRIORITÉ #1: Corriger Erreurs TypeScript

### Fichier: ProjectDashboardNew.tsx

#### Lignes 714-738: Type Guards pour 'unknown'
- [ ] Ligne 715: Ajouter type guard pour isRecord(data)
- [ ] Ligne 734: Ajouter type guard pour isRecord(data)

#### Ligne 37: Import GeneratedAsset
- [ ] Vérifier et corriger l'import

---

### Fichier: Menu.tsx

#### Ligne 250: ARIA Attribute
- [ ] Changer `aria-expanded="{expression}"` → `aria-expanded={isOpen}`

---

### Fichier: AutomationPanel.tsx

#### JSX.Element Namespace Errors
- [ ] Identifier les erreurs spécifiques
- [ ] Corriger les types JSX.Element

---

## 🟠 PRIORITÉ #2: Wizard Modal Phase 1

### Structure à créer
```
.kiro/specs/wizard-modal-integration/
├── wizard-modal-integration.md
├── specs/
│   ├── sequence-plan-modal.spec.tsx
│   ├── shot-wizard-modal.spec.tsx
│   └── modal-container.spec.tsx
└── TODO.md
```

### Wizards à implémenter
- [ ] Sequence Plan Wizard Modal
- [ ] Shot Wizard Modal
- [ ] Intégration avec ProjectDashboardNew
- [ ] Tests d'intégration

---

## 🟡 PRIORITÉ #3: Sequence Editor Finalisation

### Task 13: Raccourcis Clavier Globaux
- [ ] Ctrl/Cmd + Shift + P: Sequence Plan Wizard
- [ ] Ctrl/Cmd + Shift + S: Shot Wizard
- [ ] Ctrl/Cmd + Shift + Q: Quick Shot

### Task 22: Intégration et Polish
- [ ] Nettoyage du code
- [ ] Optimisations UI
- [ ] Vérification cohérence

### Task 23: Tests Finaux
- [ ] Tests d'intégration
- [ ] Tests de régression
- [ ] Validation finale

---

## 🟢 PRIORITÉ #4: APIs Backend

### API /api/projects
- [ ] Créer structure endpoint
- [ ] Implémenter POST /api/projects
- [ ] Tests unitaires

### API /api/sequences/generate
- [ ] Créer structure endpoint
- [ ] Implémenter génération séquences
- [ ] Tests

### API /api/shots
- [ ] Créer CRUD operations
- [ ] Implémenter POST/PUT/DELETE
- [ ] Tests

### API /api/audio/generate
- [ ] Créer endpoint génération audio
- [ ] Intégrer avec audio_api.py
- [ ] Tests

---

## 🔵 PRIORITÉ #5: Tests et Validation

### Tests React Hooks
- [ ] CharacterWizard - test unitaire rendering
- [ ] CharacterWizard - test intégration creation flow

### Tests de Validation
- [ ] Test propriété validation role object
- [ ] Test propriété migration role
- [ ] Tests cas limites

---

## 📈 Progression

### Semaine 1
| Tâche | Statut | Notes |
|-------|--------|-------|
| TypeScript ProjectDashboardNew | ⏳ | En attente |
| TypeScript Menu.tsx | ⏳ | En attente |
| TypeScript AutomationPanel | ⏳ | En attente |
| Wizard Modal Phase 1 | ⏳ | En attente |
| Sequence Editor Tasks | ⏳ | En attente |

### Totaux
- Total: 25 tâches
- Complétées: 0
- En cours: 0
- En attente: 25

---

## 🚀 Démarrage Rapide

```bash
# Lancer build TypeScript pour voir erreurs
cd creative-studio-ui
npm run build

# Corriger erreurs une par une
# ...
```

---

*Créé: 2026-02-10*

