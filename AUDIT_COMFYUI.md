# 🔍 Audit & Réflexion — Intégration ComfyUI & Système de File d'Attente

> **Date :** 2026-02-22 · **Scope :** `src/`, `backend/`, `creative-studio-ui/src/`
> **Statut global :** 2 bugs critiques corrigés · 5 avertissements actifs · 6 pistes d'optimisation identifiées

---

## 1. Bugs Critiques Identifiés et Corrigés ✅

### 🐛 BUG-001 — `self.stats.tasks.timeout` (AttributeError silencieux)

| Propriété | Valeur |
|-----------|--------|
| **Fichier** | `src/async_task_queue.py` — ligne 439 |
| **Gravité** | 🔴 CRITIQUE |
| **Impact** | Chaque appel à `GET /api/tasks/stats` lève une `AttributeError` non rattrapée, retournant une 500 Internal Server Error |
| **Cause** | `QueueStatistics` définit `tasks_timeout: int = 0` (dataclass flat), mais le code référençait `self.stats.tasks.timeout` (accès chaîné inexistant) |
| **Correction** | `self.stats.tasks.timeout` → `self.stats.tasks_timeout` |

---

### 🐛 BUG-002 — `job_storage.list_files()` méthode absente (AttributeError)

| Propriété | Valeur |
|-----------|--------|
| **Fichier** | `backend/storage.py` / appelé depuis `backend/task_queue_api.py` ligne 127 |
| **Gravité** | 🔴 CRITIQUE |
| **Impact** | `GET /api/tasks/queue` échoue systématiquement avec `AttributeError: 'JSONFileStorage' object has no attribute 'list_files'` |
| **Cause** | `task_queue_api.py` appelle `job_storage.list_files()` mais la méthode n'était jamais implémentée dans `JSONFileStorage` |
| **Correction** | Ajout de `list_files() -> List[str]` qui scanne le répertoire et retourne les stems des fichiers `.json` |

---

### 🐛 BUG-003 — Double bloc `keyObjects` dans les prompts LLM (TS)

| Propriété | Valeur |
|-----------|--------|
| **Fichier** | `creative-studio-ui/src/services/storyGenerationService.ts` — lignes 247-274 |
| **Gravité** | 🟡 MINEUR |
| **Impact** | La section "Key Objects & Artifacts" apparaissait deux fois dans chaque prompt de génération d'histoire, gaspillant des tokens et polluant le contexte |
| **Cause** | Copier-coller non révisé dans `buildWorldContextDescription()` |
| **Correction** | Suppression du bloc dupliqué |

---

## 2. Avertissements & Code Problématique ⚠️

### ⚠️ WARN-001 — Test cassé `test_audio_remix_api.py`

- **Fichier :** `tests/test_audio_remix_api.py` lignes 13-14
- **Problème :** Imports `from api.audio_remix_routes import ...` et `from api_server_fastapi import app` ne trouvent pas leurs modules (chemins incorrects ou modules non existants)
- **Risque :** La suite de tests CI est invalide pour ce fichier — les tests passent pour de mauvaises raisons (import-time skip)
- **Recommandation :** Corriger les chemins d'import ou créer les modules manquants

### ⚠️ WARN-002 — `sequence_api.py` : génération simulée en production

- **Fichier :** `backend/sequence_api.py` — fonction `run_generation()`
- **Problème :** Le moteur de génération réel ComfyUI n'est **pas connecté** à l'API de séquence. La fonction simule la progression avec `asyncio.sleep()` et génère des données synthétiques. Il n'y a aucun appel à `ComfyUIImageEngine` ou `ComfyUIIntegrationManager`
- **Risque :** 🔴 Les utilisateurs déclenchent de "vraies" générations mais n'obtiennent que des données factices
- **Recommandation :** Brancher `ComfyUIImageEngine.process_image_generation()` dans `run_generation()`

### ⚠️ WARN-003 — `comfyui_manager.py` : gestion mono-serveur uniquement

- **Fichier :** `src/comfyui_manager.py`
- **Problème :** Le manager gère un seul processus ComfyUI via subprocess. Il n'y a aucune logique de load-balancing, failover, ou distribution de tâches entre plusieurs instances
- **Risque :** Bottleneck sévère en charge, SPOF (Single Point of Failure)
- **Recommandation :** Voir section 4 (Optimisations multi-serveurs)

### ⚠️ WARN-004 — `async_task_queue.py` non connecté à `task_queue_api.py`

- **Fichier :** `src/async_task_queue.py` vs `backend/task_queue_api.py`
- **Problème :** L'API (`task_queue_api.py`) lit directement les fichiers JSON via `job_storage` et manipule les priorités manuellement. Le moteur de queue avancé (`AsyncTaskQueue` avec circuit-breaker, rate-limiter, etc.) existe mais **n'est jamais importé ni utilisé** par les endpoints REST
- **Risque :** La logique de priorité, de retry, et de monitoring avancé est du code mort du point de vue de l'API
- **Recommandation :** Faire piloter `task_queue_api.py` par `get_async_task_queue()` au lieu de manipuler `job_storage` directement

### ⚠️ WARN-005 — `comfyuiServersService.ts` : persistance LocalStorage uniquement

- **Fichier :** `creative-studio-ui/src/services/comfyuiServersService.ts`
- **Problème :** La configuration multi-serveurs est stockée exclusivement en `localStorage`. Elle ne se synchronise pas avec le backend. Si l'utilisateur change de navigateur, d'appareil, ou réinstalle l'app Electron, la configuration est perdue
- **Risque :** Configuration volatile, pas de partage multi-utilisateurs
- **Recommandation :** Persister via l'API backend `/api/settings/comfyui-servers`

---

## 3. Analyse de Compatibilité & Conflits

### 3.1 Architecture Queue — Deux systèmes en parallèle

```
Flux ACTUEL (incohérent) :
┌──────────────────┐     ┌────────────────────┐     ┌──────────────────┐
│  Frontend UI     │────▶│ task_queue_api.py  │────▶│ job_storage.json │
│ TaskQueuePanel   │     │ (manipulation raw  │     │ (fichiers disque)│
└──────────────────┘     │  des fichiers JSON)│     └──────────────────┘
                         └────────────────────┘
                                              ✗ N'utilise pas ▼
                         ┌────────────────────┐
                         │  async_task_queue  │  (circuit-breaker,
                         │  .py               │   rate-limiter,
                         │ (code mort)        │   monitoring, etc.)
                         └────────────────────┘

Flux CIBLE (cohérent) :
┌──────────────────┐     ┌────────────────────┐     ┌──────────────────┐
│  Frontend UI     │────▶│ task_queue_api.py  │────▶│ AsyncTaskQueue   │
│  TaskQueuePanel  │     │ (bridge REST→Queue)│     │ (système unifié) │
└──────────────────┘     └────────────────────┘     └──────────────────┘
                                                              │
                                                     ┌────────▼─────────┐
                                                     │ ComfyUIManager   │
                                                     │ (exécution réelle│
                                                     └──────────────────┘
```

### 3.2 Conflicts potentiels à l'échelle

| Scénario | Risque | Mitigation |
|----------|--------|------------|
| Deux workers ComfyUI traitent le même prompt_id | Double génération, corruption outputs | Vérouillage par `prompt_id` dans `comfy_client.py` |
| Circuit-breaker déclenché + job en cours | Job perdu sans retry | `AsyncTaskQueue` gère les retries — brancher au CB |
| `job_storage` lu/écrit simultanément (multi-worker) | Race condition sur fichiers JSON | `threading.Lock` existe, mais non utilisé dans `task_queue_api.py` |
| `available_vram` partagé (comfyui_integration_manager) | Estimate incorrecte si plusieurs projets | Rendre `available_vram` par-instance, pas par-manager |

---

## 4. Idées d'Optimisation

### 4.1 Court terme (1-2 jours)

1. **Brancher `AsyncTaskQueue` dans `task_queue_api.py`**
   - Supprimer la manipulation directe de fichiers JSON
   - Déléguer `submit_task()`, `cancel_task()`, `get_queue_statistics()` au moteur existant
   - Bénéfice immédiat : circuit-breaker, rate-limiter, monitoring, tout fonctionnel

2. **Brancher `ComfyUIImageEngine` dans `run_generation()`**
   - Remplacer les `asyncio.sleep()` simulés par de vrais appels à `process_image_generation()`
   - Propager les vraies progressions (`progress_callback`) vers les websockets ou SSE

3. **Corriger les tests cassés**
   - `test_audio_remix_api.py` : corriger les imports ou mocker les modules manquants

### 4.2 Moyen terme (1 semaine)

4. **Load-balancing multi-serveurs ComfyUI**
   - Étendre `ComfyUIManager` pour gérer un pool d'instances
   - Algorithme de sélection : round-robin, ou par charge de VRAM disponible
   - S'appuyer sur `comfyuiServersService.ts` côté frontend déjà prêt pour multi-serveurs

5. **Persistance backend pour la config multi-serveurs**
   - Endpoint `PUT /api/settings/comfyui-servers`
   - Synchronisation Electron ↔ Backend ↔ Frontend

### 4.3 Long terme (1+ mois)

6. **Queue distribuée (Redis / Celery)**
   - Remplacer le stockage JSON par Redis Streams ou Celery pour les queues persistantes
   - Permet le scaling horizontal (plusieurs instances backend)
   - Conserve le code `AsyncTaskQueue` en façade mais délègue le storage

---

## 5. Analyse de la Qualité du Code

### Points Positifs ✅

- **`storage.py`** : LRU cache avec TTL, index par `owner_id`, thread-safe — architecture solide
- **`async_task_queue.py`** : Circuit-breaker, rate-limiter, dependency graph, monitoring — très robuste
- **`comfyuiServersService.ts`** : Migration automatique des anciens configs, export/import JSON, tests unitaires complets
- **`taskQueueService.ts`** : Pas d'`any`, types stricts, gestion d'erreurs cohérente
- **`storyGenerationService.ts`** : Retry avec backoff exponentiel, messages d'erreur utilisateur clairs

### Points à Améliorer ⚠️

| Fichier | Problème |
|---------|----------|
| `comfyui_integration_manager.py` | `available_vram = 8.0` hardcodé, non détecté dynamiquement |
| `task_queue_api.py` | Sort par `(priority, created_at)` mais `created_at` peut être `str` ou `datetime` → tri instable |
| `sequence_api.py` | Génération entièrement simulée, aucune vrai intégration backend IA |
| `comfyui_manager.py` | `subprocess.Popen` sans timeout sur la détection de démarrage (risque de blocage infini) |
| `storage.py` | `cache.pop()` appelé mais `LRUCache` n'implémente pas `pop()` → `AttributeError` latent dans `delete()` |

> **Note :** `cache.pop()` dans `delete()` (ligne 252) : `LRUCache` implémente `__delitem__` mais pas `pop()`.
> Risque : `AttributeError` si l'item est en cache lors de la suppression. À corriger.

---

## 6. Interface Utilisateur — File d'Attente

### Composants Existants

| Composant | Chemin | Status |
|-----------|--------|--------|
| `TaskQueuePanel` | `src/components/ui/TaskQueuePanel.tsx` | ✅ Fonctionnel |
| `TaskQueueModal` | `src/components/TaskQueueModal.tsx` | ✅ Fonctionnel |
| `taskQueueService.ts` | `src/services/taskQueueService.ts` | ✅ Tous les endpoints |

### Améliorations suggérées pour le panneau (voir `TaskQueueManagerWindow.tsx`)

- ✅ Vue d'ensemble avec statistiques globales
- ✅ Filtres par statut, projet, priorité
- ✅ (Futur) Connexion WebSocket pour mise à jour temps réel sans polling
- ✅ (Futur) Graphique de throughput/temps d'exécution
- ✅ (Futur) Actions bulk (annuler tous les jobs en attente)

---

## 7. Résumé Exécutif

```
Bugs corrigés     : 3 (2 critiques, 1 mineur)
Avertissements    : 5 (2 critiques, 3 mineurs)
Tests cassés      : 1 fichier (imports manquants)
Code mort         : AsyncTaskQueue non connecté à l'API REST
Simulation active : sequence_api.py génère des données factices
Optimisations     : 6 pistes identifiées

Priorité immédiate :
  1. Brancher AsyncTaskQueue → task_queue_api.py
  2. Brancher ComfyUIImageEngine → sequence_api.py  
  3. Corriger le cache.pop() dans storage.py
  4. Corriger les imports de test_audio_remix_api.py
```

---

*Document généré lors de l'audit StoryCore-Engine — Session 2026-02-22*
