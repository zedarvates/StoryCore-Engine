# StoryCore Engine - Prochaines Étapes

## 🎯 Priorité Immédiate: Tests UI (1-2 jours)

### Tests CharacterWizard - Corriger les 19 tests échoués

**Problème identifié:** Les sélecteurs regex ne matchent pas les `aria-label`

```bash
# Lancer les tests
cd creative-studio-ui
npx vitest run src/components/wizard/character/__tests__/CharacterWizard.test.tsx
```

**Actions:**
1. Examiner les aria-labels réels dans le composant
2. Corriger les regex dans les tests
3. Utiliser `aria-label="Continue to next step"` au lieu de regex

---

## 🚀 Semaine 1: Tests et Build

### 1. Build TypeScript
```bash
cd creative-studio-ui
npm run build  # Vérifier 0 erreurs
```

### 2. Tests Unitaires Backend
Créer `backend/test_api.py`:
```python
# Tests pytest pour les APIs
def test_project_create():
    """Test POST /api/projects"""
    pass

def test_sequences_generate():
    """Test POST /api/sequences/generate"""
    pass

def test_shots_crud():
    """Test CRUD operations pour shots"""
    pass
```

### 3. Tests d'Intégration
```bash
# Tests E2E avec Playwright
npx playwright install
npx playwright test
```

---

## 📅 Semaine 2: Fonctionnalités

### 1. Finaliser CharacterWizard Tests
- Corriger les 19 tests échoués
- Tests de validation role object
- Tests de migration role

### 2. APIs Backend Tests
- Tests pytest pour toutes les APIs
- Couverture >80%

### 3. Documentation API
- Swagger/OpenAPI specs
- Exemples de requêtes

---

## 🎯 Checklist Hebdomadaire

### Cette Semaine
- [ ] Build TypeScript sans erreurs
- [ ] 10+ tests CharacterWizard passent
- [ ] Premier test pytest backend
- [ ] Documentation API started

### Semaine Prochaine
- [ ] 100% tests CharacterWizard passent
- [ ] 80% coverage backend
- [ ] Release candidate ready

---

## 📊 Métriques Cibles

| Métrique | Actuel | Cible |
|----------|--------|-------|
| TypeScript Errors | ~381 | 0 |
| Test Pass Rate | ~50% | 100% |
| Coverage Backend | 0% | 80% |
| Build Time | 8s | <10s |

---

*Créé: 2026-02-10*
*Prochaine mise à jour: Hebdomadaire*
