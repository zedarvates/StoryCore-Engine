Plan d'actions – TACHE1_async_task_queue_integration_next_steps

- Objectif: Intégrer le bridge AsyncTaskQueue avec le backend task_queue_api.py et valider via tests/test_async_task_queue_integration.py.
- Étapes prévues:
  1) Mapper les endpoints backend existants vers les appels AsyncTaskQueue (soumission et statut).
  2) Ajouter les tests d’intégration testant le flux end-to-end (submission → processing → completion).
  3) Mettre à jour le document Plans OpenAPI et backend/README.md pour refléter les endpoints et le schéma de données.
  4) Mettre en place les tests CI qui exécutent les tests d’intégration et vérifient la couverture (>80%).
  5) Déployer les services API en staging et vérifier le démarrage et les journaux (log rotation).

- Critères d’acceptation:
  - L’API expose les endpoints d’intégration et reflète correctement l’état de la queue.
  - Les tests end-to-end passent dans CI et la couverture est ≥ 80%.
  - La documentation est à jour et les schémas OpenAPI restent cohérents.

- Prochaines étapes (statut):
- Tâche 3: [ - ] In Progress
- Tâche 4: [ - ] In Progress
- Tâche 5: [ - ] Pending
