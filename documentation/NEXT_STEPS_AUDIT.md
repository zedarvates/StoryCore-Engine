# StoryCore Engine - Plan d'Action Post-Audit

## Récapitulatif de l'Audit

**Date:** 2026-02-12  
**Problèmes identifiés:** 149  
**Problèmes corrigés:** 22+  
**Score santé:** 7.5/10 (avant: 5.8/10)

---

## Priorité 1: Sécurité (Complété ✅)

- [x] Credentials externalisés vers variables d'environnement
- [x] Vérification JWT implémentée avec PyJWT
- [x] Mock LLM conditionné par USE_MOCK_LLM
- [x] Exceptions génériques remplacées
- [x] Validation uploads sécurisée
- [x] Path traversal corrigé

---

## Priorité 2: Qualité Code (En cours)

### 2.1 Types TypeScript (~300+ `any` à typer)

**Pattern de migration:**
```typescript
// Avant
function processData(data: any) { ... }

// Après
interface UserData { id: string; name: string; }
function processData(data: UserData) { ... }
```

**Fichiers prioritaires:**
1. `src/services/wizard/ValidationEngine.ts` - 18 occurrences
2. `src/services/DataValidator.ts` - 22 occurrences
3. `src/services/wizard/aiWizardService.ts` - 15 occurrences

**Estimation:** 2-3 semaines

### 2.2 Console.log de production (~140 restants)

**Fichiers à migrer:**
- Services API restants
- Stores restants
- Hooks restants
- Composants

**Commande pour identifier:**
```bash
cd creative-studio-ui
grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | wc -l
```

**Estimation:** 1-2 semaines

### 2.3 Commentaires FR → EN (~200 restants)

**Fichiers prioritaires:**
- `src/services/wizard/*.ts`
- `src/types/*.ts`
- `src/components/*/*.tsx`

**Estimation:** 1-2 semaines

---

## Priorité 3: Performance

### 3.1 Rate Limiter

L identifié 'audit a2 implémentations de rate limiter:
- `backend/rate_limiter.py`
- `backend/middleware/rate_limiter.py`

**Action:** Consolider en une seule implémentation

### 3.2 Cache TTL

**Fichiers à corriger:**
- `backend/storage.py` - LRU Cache sans TTL
- `backend/rate_limiter.py` - request_log sans TTL

**Action:** Ajouter TTL au cache

### 3.3 Pagination

**Fichiers à corriger:**
- Listes frontend sans pagination
- Requêtes API sans pagination

**Action:** Implémenter pagination

---

## Priorité 4: Tests

### 4.1 Couverture de tests

**Fichiers backend sans tests:**
- `backend/auth.py`
- `backend/config.py`
- `backend/location_api.py`

**Action:** Ajouter tests unitaires

### 4.2 Tests d'intégration

**Action:** Vérifier tests existants et compléter

---

## Priorité 5: Documentation

### 5.1 README principal

**Probl Sections malformées
- Structure projet obsolète
- Instructions d'installation incomplèmes identifiés:**
-ètes

**Action:** Mettre à jour README.md

### 5.2 Documentation API

**Action:** Générer documentation OpenAPI

---

## Liste de Tâches Détaillée

### Cette semaine [Priorité Haute]

- [ ] Migrer 20 types `any` vers types spécifiques
- [ ] Remplacer 30 console.log par logger
- [ ] Traduire 50 commentaires FR → EN

### Ce mois [Priorité Moyenne]

- [ ] Compléter migration types TS (300+ → 50 restants)
- [ ] Compléter migration console.log (140 → 0)
- [ ] Compléter traduction FR → EN (200 → 0)
- [ ] Ajouter TTL aux caches
- [ ] Consolider rate limiter

### Ce trimestre [Priorité Basse]

- [ ] Couverture tests > 80%
- [ ] Documentation API complète
- [ ] README.md mis à jour

---

## Métriques à Suivre

| Métrique | Actuel | Cible |
|----------|--------|-------|
| Score santé | 7.5/10 | 9/10 |
| Types `any` | 300+ | < 50 |
| Console.log prod | ~140 | 0 |
| Commentaires FR | ~200 | 0 |
| Couverture tests | ? | > 80% |

---

## Commandes Utiles

```bash
# Compter types any
cd creative-studio-ui
grep -r ": any" src/ --include="*.ts" --include="*.tsx" | wc -l

# Compter console.log
grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v "logger\|devOnly" | wc -l

# Vérifier commentaires FR
grep -r "À\|Cette\|Ce\|Erreur\|Chargement" src/ --include="*.ts" --include="*.tsx" | wc -l

# Lancer tests
cd backend && pytest
cd creative-studio-ui && npm test
```

---

## Ressources

- Rapport d'audit: [`TECHNICAL_AUDIT_REPORT_2026_02_12.md`](TECHNICAL_AUDIT_REPORT_2026_02_12.md)
- Changelog: [`CHANGELOG.md`](CHANGELOG.md)
- Index documentation: [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md)
- Configuration: `CONFIGURATION_MIGRATION.md`

---

*Mis à jour le: 2026-02-12*
