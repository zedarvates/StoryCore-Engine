# OpenAPI Synchronization Status

- Status: In Progress
- Last updated: 2026-02-24T14:31:02.192Z
- Purpose: document and track the OpenAPI v1 synchronization with backend code and documentation.

## Completed Integrations ✅

### AsyncTaskQueue Integration (2026-02-24)
- [x] AsyncTaskQueue started in main_api lifespan
- [x] task_queue_router included in main API
- [x] Circuit breaker stats available via `/api/tasks/stats`
- [x] Rate limiting enabled
- [x] 8/8 integration tests passing

### Lip Sync Integration (2026-02-24)
- [x] lip_sync_router included in main API
- [x] Backend API: `backend/lipsync_api.py`
- [x] Frontend types: `src/types/lipSync.ts`
- [x] Frontend service: `src/services/lipSyncService.ts`
- [x] Frontend store: `src/stores/lipSyncStore.ts`

## Next Steps

### Pending Tasks
- [ -] 3: Compléter l'intégration de la file d'attente dans le pipeline et lancer un test d'intégration end-to-end – In Progress
- [ ] 4a: Synchroniser plans/openapi_v1.yaml et plans/openapi_sync_status.md avec les nouveaux endpoints/API – In Progress
- [ ] 5a: Ajouter tests de démarrage CI pour évaluer l'API et le flux API-to-queue – In Progress
- [x] 3a: Extended end-to-end tests for API-driven workflow (timeouts/errors) – Completed
- [ ] 3a: Ajouter tests d’intégration supplémentaires couvrant les scénarios d’erreur (403/500) et timeouts – Pending

### API Endpoints to Document
- /api/tasks/queue - Get all jobs in queue
- /api/tasks/{job_id}/priority - Update job priority
- /api/tasks/{job_id}/move-up - Move job up
- /api/tasks/{job_id}/move-down - Move job down
- /api/tasks/{job_id}/retry - Retry failed job
- /api/tasks/stats - Get queue statistics (with circuit breaker status)
- /api/tasks/api/{job_id} - Get API-driven task status
- /api/lipsync/generate - Generate lip sync
- /api/lipsync/workflow - Lip sync workflow

### API Endpoints to Document
- /api/tasks/queue - Get all jobs in queue
- /api/tasks/{job_id}/priority - Update job priority
- /api/tasks/{job_id}/move-up - Move job up
- /api/tasks/{job_id}/move-down - Move job down
- /api/tasks/{job_id}/retry - Retry failed job
- /api/tasks/stats - Get queue statistics (with circuit breaker status)
- /api/tasks/api/{job_id} - Get API-driven task status
- /api/lipsync/generate - Generate lip sync
- /api/lipsync/workflow - Lip sync workflow

Note: This plan complements the ongoing work to keep API specifications in sync with the implementation.

Prochaine étape: finaliser la synchronisation 4a (yaml OpenAPI) et l'ajout des tests CI 5a, puis valider via CI.

Note additionnelle: les tâches 3a et extension restent complètes; les tâches 4a et 5a avancent en CI et synchronisation.


### Status recap (current state)
- 3a Extended end-to-end tests for API-driven workflow (timeouts/errors): Completed
- 4a: Synchroniser plans/openapi_v1.yaml et plans/openapi_sync_status.md avec les nouveaux endpoints/API: In Progress
- 5a: Ajouter tests de démarrage CI pour évaluer l'API et le flux API-to-queue: In Progress

Note: Prochaine étape: synchroniser plans/openapi_v1.yaml avec les endpoints API supplémentaires et ajouter les tests de démarrage CI (4a/5a) afin de valider le flux API-to-queue en CI.
