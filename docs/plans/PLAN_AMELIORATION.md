# Plan d'Amélioration du Projet StoryCore-Engine

**Date de création:** 2026-02-15  
**Version du projet:** 1.0.0  
**Statut:** En cours d'élaboration

---

## 1. Résumé Exécutif

Ce document présente un plan d'amélioration complet pour le projet StoryCore-Engine. Il identifie les domaines clés nécessitant des améliorations, établit les priorités et propose des solutions concrètes pour chaque point faible identifié.

### 1.1 Contexte du Projet

StoryCore-Engine est un pipeline de production multimédia multimodal auto-correcteur qui transforme des scripts en vidéos en quelques minutes avec une cohérence visuelle garantie. Le système intègre:
- **Frontend**: React 18+, TypeScript, Electron, Vite
- **Backend**: FastAPI, Python 3.11+, Pydantic
- **IA/ML**: ComfyUI, Ollama, PyTorch, CUDA
- **Vidéo**: FFmpeg, HunyuanVideo, Wan Video

### 1.2 État Actuel du Projet

| Module | Statut | Couverture de Tests |
|--------|--------|---------------------|
| Python Backend | ✅ Stable | 95%+ |
| TypeScript Frontend | ✅ Stable | 90%+ |
| Intégration Electron | ✅ Stable | 85%+ |
| Workflows ComfyUI | ✅ Stable | 95%+ |
| Sécurité & Validation | ✅ Stable | 100% |
| Gestion d'Erreurs | ✅ Stable | 100% |
| Monitoring | ✅ Stable | 95%+ |
| API REST | ✅ Stable | 90%+ |
| API WebSocket | 🚧 Beta | 80%+ |
| API Plugin | 🚧 Beta | 85%+ |

---

## 2. Améliorations Identifiées

### 2.1 Nettoyage du Code (Priorité: HAUTE)

#### 2.1.1 Vérification des fichiers à supprimer

**Résultats de la vérification (02/2026):**

| Catégorie | Élément | Statut |
|-----------|---------|--------|
| **Temporaires** | `quarantine/` | ✅ NON PRÉSENT |
| **Temporaires** | `temp_assets/` | ✅ NON PRÉSENT |
| **Temporaires** | `temp_audio_export/` | ✅ NON PRÉSENT |
| **Racine** | `ltx2AllInOneComfyui_*.zip` | ✅ NON PRÉSENT |
| **Racine** | `StorycoreIconeV2.png~` | ✅ NON PRÉSENT |
| **Racine** | `build_output.txt` | ✅ NON PRÉSENT |
| **Racine** | `tsc_errors.txt` | ✅ NON PRÉSENT |
| **Racine** | Zone.Identifier | ✅ NON PRÉSENT |
| **BD** | `*.db` fichiers | ✅ NON PRÉSENT |
| **Archives** | `archive/` | ✅ NON PRÉSENT |

**Conclusion**: Le projet est déjà propre. Aucune suppression nécessaire.

#### 2.1.2 Fichiers API Servers

**Fichiers trouvés dans `src/`:**
- `api_server.py` - Serveur API principal
- `api_server_fastapi.py` - Version FastAPI
- `api_server_simple.py` - Version simple

**Observation**: Chaque fichier semble avoir une fonction distincte. À vérifier avant consolidation.

#### 2.1.3 Fichiers Error Handlers

**Fichiers trouvés dans `src/`:**
- `ai_error_handler.py` - Gestionnaire d'erreurs IA
- `error_handler.py` - Gestionnaire général
- `advanced_error_handling.py` - Gestion avancée

**Observation**: Chaque fichier semble avoir un rôle différent. À vérifier avant consolidation.

### 2.2 Fonctionnalités Non Implémentées (Priorité: HAUTE)

#### 2.2.1 Export Functionality ✅ DEJA IMPLÉMENTÉ

**Vérification effectuée:**
- Service: `creative-studio-ui/src/services/projectExportService.ts`
- Méthodes: `exportJSON()`, `exportPDF()`, `exportVideo()` toutes implémentées
- Tests: Présents dans `src/services/__tests__/projectExportService.test.ts`
- Intégration MenuBar: `projectExportService` importé et utilisé dans `menuActions.ts`

#### 2.2.2 Asset Management - Directory Creation ✅ DEJA IMPLÉMENTÉ

**Vérification effectuée:**
- API Electron: Méthode `mkdir` définie dans `electron.ts`
- Service: `AssetManagementService.ts` avec méthode `ensureDirectoryExists`
- Utilisation: Présente dans multiples services (PersistenceService, FileSystemService, etc.)

#### 2.2.3 GitHub API Error Handling ✅ DEJA IMPLÉMENTÉ

**Vérification effectuée:**
- Classe: `GitHubAPIError` dans `backend/github_api.py`
- Fonctionnalités: Codes d'erreur (RATE_LIMIT, AUTH_FAILED, etc.), messages détaillés, suggestions de récupération
- Méthode: `create_github_issue` utilise la classe enrichie

### 2.3 Implémentation des Wizards (Priorité: MOYENNE)

#### 2.3.1 Wizards ✅ DEJA IMPLÉMENTÉS

**Wizards trouvés dans le code:**

| Wizard | Fichier | Statut |
|--------|---------|--------|
| Shot Planning | `creative-studio-ui/src/components/wizard/shot/ShotWizard.tsx` | ✅ |
| Audio Production | `creative-studio-ui/src/components/wizard/production/AudioProductionWizard.tsx` | ✅ |
| Video Editor | `creative-studio-ui/src/components/wizard/production/VideoEditorWizard.tsx` | ✅ |
| Marketing | `creative-studio-ui/src/components/wizard/production/MarketingWizard.tsx` | ✅ |
| Comic-to-Sequence | `creative-studio-ui/src/components/wizard/production/ComicToSequenceWizard.tsx` | ✅ |

**Conclusion**: Tous les wizards sont implémentés avec tests d'intégration.

### 2.4 Améliorations du Système d'Addons (Priorité: MOYENNE)

**Fichier:** `creative-studio-ui/src/services/AddonManager.ts`  
**Statut:** Implémentation partielle (seuls les addons intégrés supportés)

**Améliorations nécessaires:**

| Fonctionnalité | Statut | Action |
|----------------|--------|--------|
| Support des addons externes | Non implémenté | Implémenter le parsing du manifeste |
| Chargement des addons externes | Non implémenté | Implémenter le scan de répertoire |
| Déchargement des addons | Partiel | Améliorer le nettoyage des ressources |
| Gestion du cycle de vie | Non implémenté | Implémenter install/enable/disable/uninstall |

### 2.5 Améliorations UI/UX (Priorité: MOYENNE)

#### 2.5.1 TypeScript Build Errors

**Statut:** 381 erreurs restantes (réduit de 661)  
**Référence:** `.kiro/specs/typescript-build-errors-fix`

**Actions:**
1. Nettoyer les erreurs de linting
2. Résoudre les types non définis
3. Ajouter les types manquants

#### 2.5.2 UI en Cours de Développement

| Composant | Statut | Priorité |
|-----------|--------|----------|
| Video Editor V3 | 📋 Planifié | Haute |
| Project Dashboard Enhancement | 🚧 En cours | Haute |
| Wizard System Integration | 🚧 En cours | Haute |
| Native File Dialog | 📋 Planifié | Moyenne |
| Terms of Service Dialog | 🚧 En cours | Moyenne |

### 2.6 Optimisations de Performance (Priorité: MOYENNE)

#### 2.6.1 Performance Backend

| Optimisation | Impact | Complexité |
|--------------|--------|------------|
| Mise en cache avancée | Élevé | Moyenne |
| Traitement parallèle | Élevé | Haute |
| Optimisation GPU | Élevé | Haute |
| Gestion adaptative de la mémoire | Moyen | Moyenne |

#### 2.6.2 Performance Frontend

| Optimisation | Impact | Complexité |
|--------------|--------|------------|
| Code splitting | Moyen | Moyenne |
| Lazy loading des composants | Moyen | Faible |
| Optimisation des assets | Moyen | Faible |
| Memoisation excessive | Moyen | Faible |

---

## 3. Plan d'Action

### Phase 1: Nettoyage (Semaine 1-2)

```
✓ Étape 1.1: Sauvegarde complète du projet
  ├── Créer une archive de tous les fichiers
  └── Vérifier que le projet fonctionne avant modifications

✓ Étape 1.2: Suppression des fichiers temporaires
  ├── Supprimer `quarantine/`
  ├── Supprimer `temp_assets/`
  ├── Supprimer `temp_audio_export/`
  └── Supprimer les fichiers identifiés à la racine

✓ Étape 1.3: Archives
  ├── Créer un package `archive_old_<date>.zip`
  └── Supprimer le répertoire `archive/`

✓ Étape 1.4: Nettoyage du code
  ├── Consolider les fichiers API servers
  └── Supprimer les fichiers backup dans `src/`
```

### Phase 2: Fonctionnalités Prioritaires (Semaine 3-4)

```
✓ Étape 2.1: Export Functionality
  ├── Créer ExportService
  ├── Implémenter exportJSON
  ├── Implémenter exportPDF
  ├── Implémenter exportVideo
  └── Écrire les tests

✓ Étape 2.2: Asset Management
  ├── Ajouter mkdir à l'API Electron
  ├── Mettre à jour AssetManagementService
  └── Écrire les tests

✓ Étape 2.3: GitHub API Error Handling
  ├── Enrichir GitHubAPIError
  ├── Mettre à jour les méthodes API
  └── Écrire les tests
```

### Phase 3: Wizards et Addons (Semaine 5-6)

```
✓ Étape 3.1: Shot Planning Wizard
  ├── Créer le composant wizard
  ├── Implémenter la configuration des paramètres
  └── Intégrer avec la gestion de projet

✓ Étape 3.2: Audio Production Wizard
  ├── Créer le composant wizard
  ├── Implémenter la gestion des pistes audio
  └── Ajouter le support des effets sonores

✓ Étape 3.3: Système d'Addons
  ├── Implémenter le parsing du manifeste
  ├── Ajouter le support externe
  └── Implémenter le cycle de vie
```

### Phase 4: UI/UX et Performance (Semaine 7-8)

```
✓ Étape 4.1: Corrections TypeScript
  ├── Résoudre les 381 erreurs restantes
  └── Nettoyer les avertissements de linting

✓ Étape 4.2: Améliorations UI
  ├── Finaliser Video Editor V3
  ├── Terminer Project Dashboard Enhancement
  └── Finaliser Wizard System Integration

✓ Étape 4.3: Optimisations
  ├── Implémenter la mise en cache
  ├── Optimiser le traitement parallèle
  └── Améliorer la gestion de la mémoire
```

### Phase 5: Tests et Documentation (Semaine 9)

```
✓ Étape 5.1: Tests
  ├── Exécuter tous les tests
  ├── Vérifier la couverture de code
  └── Corriger les échecs

✓ Étape 5.2: Documentation
  ├── Mettre à jour la documentation
  ├── Générer les rapports
  └── Préparer les notes de version
```

---

## 4. Matrice des Priorités

| # | Tâche | Priorité | Complexité | Semaine |
|---|-------|----------|------------|---------|
| 1 | Sauvegarde complète | CRITIQUE | Faible | 1 |
| 2 | Suppression fichiers temporaires | HAUTE | Faible | 1 |
| 3 | Archives | HAUTE | Faible | 2 |
| 4 | Consolidation API servers | MOYENNE | Moyenne | 2 |
| 5 | Export Functionality | HAUTE | Moyenne | 3 |
| 6 | Asset Management | HAUTE | Faible | 3 |
| 7 | GitHub API Error Handling | HAUTE | Faible | 4 |
| 8 | Shot Planning Wizard | HAUTE | Moyenne | 5 |
| 9 | Audio Production Wizard | MOYENNE | Moyenne | 5 |
| 10 | Video Editor Wizard | MOYENNE | Haute | 6 |
| 11 | Addon System Enhancements | MOYENNE | Haute | 6 |
| 12 | TypeScript Corrections | HAUTE | Haute | 7 |
| 13 | UI Improvements | MOYENNE | Moyenne | 8 |
| 14 | Performance Optimizations | MOYENNE | Haute | 8 |
| 15 | Tests et Documentation | HAUTE | Moyenne | 9 |

---

## 5. Métriques de Succès

### 5.1 Critères de Réussite

| Critère | Cible | Mesure |
|---------|-------|--------|
| Couverture de tests | ≥ 95% | Couverture pytest/jest |
| Erreurs TypeScript | 0 | TSC compilation |
| Fonctionnalité export | 100% | Tests unitaires |
| Wizards implémentés | 5/5 | Tests d'intégration |
| Performance backend | < 200ms | Latence API |
| Performance frontend | < 100ms | Time to Interactive |

### 5.2 Indicateurs de Progression

- **Nettoyage**: X fichiers supprimés / Y identifiés
- **Fonctionnalités**: Z implémentées / W planifiées
- **Tests**: Pass/Fail ratio
- **Performance**: Métriques avant/après

---

## 6. Dépendances et Risques

### 6.1 Dépendances

| Dépendance | Version | Usage |
|------------|---------|-------|
| React | 18+ | Frontend |
| TypeScript | 5.9.3+ | Frontend |
| Python | 3.11+ | Backend |
| FastAPI | Latest | API |
| ComfyUI | Latest | Génération IA |
| Ollama | Latest | LLM local |
| FFmpeg | Latest | Traitement vidéo |

### 6.2 Risques et Atténuations

| Risque | Probabilité | Impact | Atténuation |
|--------|-------------|--------|--------------|
| Régression fonctionnelle | Moyenne | Haute | Tests exhaustifs avant livraison |
| Délais | Haute | Moyen | Planning réaliste avec tampon |
| Complexité technique | Moyenne | Haute | Documentation et exemples |
| Dépendances externes | Faible | Haute | Alternatives disponibles |

---

## 7. Ressources Requises

### 7.1 Équipe

| Rôle | Nombre | Tâches |
|------|--------|--------|
| Développeur Full Stack | 2 | Backend, Frontend, Intégration |
| Designer UI/UX | 1 | Améliorations interface |
| QA Engineer | 1 | Tests, Validation |

### 7.2 Outils

- **IDE**: VSCode (déjà utilisé)
- **Gestion de projet**: GitHub Issues
- **CI/CD**: GitHub Actions (déjà configuré)
- **Testing**: pytest, jest

---

## 8. Prochaines Étapes

1. **Valider ce plan** avec l'équipe
2. **Créer les tickets** GitHub pour chaque tâche
3. **Commencer la Phase 1** : Nettoyage
4. **Suivre la progression** via les weekly reviews

---

## 9. Annexes

### A. Références

- [README.md](./README.md) - Documentation principale
- [ROADMAP.md](./ROADMAP.md) - Feuille de route
- [CLEANUP_PLAN.md](./CLEANUP_PLAN.md) - Plan de nettoyage détaillé
- [action-plan.md](./action-plan.md) - Plan d'action du code non implémenté

### B. Glossaire

| Terme | Définition |
|-------|------------|
| Wizard | Assistant guidé pour des tâches complexes |
| Addon | Extension du système |
| ComfyUI | Interface de génération IA |
| Ollama | LLM local |
| Circuit Breaker | Modèle de résilience pour les appels API |

---

*Document généré dans le cadre du projet StoryCore-Engine*  
*Dernière mise à jour: 2026-02-15*

