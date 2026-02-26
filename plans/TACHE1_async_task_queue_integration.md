# Plan d'Intégration: AsyncTaskQueue → task_queue_api.py

## Objectif
Connecter le système de file d'attente avancé (AsyncTaskQueue) à l'API REST (task_queue_api.py) pour bénéficier de:
- Circuit breaker pour tolérance aux pannes
- Rate limiting pour contrôle de charge
- Gestion de priorité avancée
- Monitoring temps réel

## Modifications Required

### 1. Imports à ajouter dans task_queue_api.py
```python
from src.async_task_queue import (
    get_async_task_queue,
    TaskPriority,
    TaskState
)
```

### 2. Fonctions à modifier

#### submit_job() - Ajouter:
- Soumettre la tâche à AsyncTaskQueue après sauvegarde storage
- Gérer le retour de la soumission

#### cancel_task() - Remplacer:
- Utiliser `queue.cancel_task()` au lieu de manipulation directe storage

#### update_priority() - Remplacer:
- Utiliser la logique de priorité du queue

#### get_queue_stats() - Améliorer:
- Utiliser完全的AsyncTaskQueue statistics
- Enrichir les données avec circuit_breaker et rate_limiter status

### 3. Persistence
- Garder job_storage pour persistance (survit au redémarrage)
- AsyncTaskQueue pour l'exécution et le monitoring

## Étapes d'Implémentation

1. ✅ Analyser AsyncTaskQueue interface
2. 🔄 Modifier task_queue_api.py pour integration
3. ⏳ Tester l'intégration
4. ⏳ Vérifier circuit breaker et rate limiting

## Fichiers à Modifier
- `backend/task_queue_api.py`

## Statut: EN COURS

### Prochaines étapes
- Lier l'API backend à AsyncTaskQueue et tester l'intégration end-to-end
- Ajouter des tests d'intégration dans tests/test_async_task_queue_integration.py
- Mettre à jour plans/openapi_v1.yaml et backend/README.md
- Déployer le service API et valider le démarrage via backend/test_integration.py

### Prochaines étapes proposées
- Lier l'API backend à AsyncTaskQueue et tester l'intégration end-to-end localement
- Ajouter des tests d'intégration dans tests/test_async_task_queue_integration.py
- Mettre à jour plans/openapi_v1.yaml et backend/README.md pour refléter l'intégration
- Déployer le service API et valider le démarrage via backend/test_integration.py

### Prochaines étapes proposées
- [ ] Lier l'API backend à AsyncTaskQueue et tester l'intégration end-to-end localement
- [ ] Ajouter des tests d'intégration dans tests/test_async_task_queue_integration.py
- [ ] Mettre à jour plans/openapi_v1.yaml et backend/README.md pour refléter l'intégration
- [ ] Déployer le service API et valider le démarrage via backend/test_integration.py

