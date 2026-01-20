# Batch Operations Service

Service de gestion des opérations par lots pour l'éditeur de grille avancé.

## Vue d'ensemble

Le service Batch Operations permet d'exécuter des opérations sur plusieurs plans simultanément avec:
- Traitement parallèle via WorkerPool
- Gestion de la progression en temps réel
- Gestion des erreurs partielles
- Annulation d'opérations
- Estimation de temps basée sur l'historique

## Architecture

```
batchOperations/
├── BatchOperationsManager.ts  # Gestionnaire principal
├── WorkerPool.ts              # Pool de Web Workers
├── index.ts                   # Exports publics
└── README.md                  # Documentation
```

## Utilisation

### BatchOperationsManager

```typescript
import { BatchOperationsManager } from '@/services/batchOperations';

// Créer le gestionnaire
const manager = new BatchOperationsManager(4); // 4 workers

// Exécuter une opération
const result = await manager.execute('duplicate', selectedShots, {
  suffix: 'copy'
});

// Vérifier les résultats
console.log(`${result.success.length} plans traités avec succès`);
console.log(`${result.failed.length} échecs`);
console.log(`Temps total: ${result.totalTime}ms`);

// Estimer le temps pour une opération
const estimatedTime = manager.estimateTime('export', 10);
console.log(`Temps estimé: ${estimatedTime}ms`);

// Annuler une opération en cours
manager.cancel(operationId);

// Nettoyer
manager.terminate();
```

### WorkerPool

```typescript
import { WorkerPool } from '@/services/batchOperations';

// Créer le pool
const pool = new WorkerPool({ size: 4 });

// Exécuter une tâche
const result = await pool.execute('generateThumbnail', {
  videoUrl: 'video.mp4',
  time: 5.0
});

// Vérifier l'état
console.log(`Workers disponibles: ${pool.getAvailableWorkers()}`);
console.log(`Workers occupés: ${pool.getBusyWorkers()}`);
console.log(`Tâches en attente: ${pool.getQueueSize()}`);

// Annuler toutes les tâches
pool.cancelAll();

// Terminer le pool
pool.terminate();
```

## Opérations supportées

### Duplicate
Duplique les plans sélectionnés.

```typescript
await manager.execute('duplicate', shots, {
  suffix: 'copy' // Suffixe pour les copies
});
```

### Delete
Supprime les plans sélectionnés (marque comme supprimé).

```typescript
await manager.execute('delete', shots);
```

### Export
Exporte les plans dans un format spécifique.

```typescript
await manager.execute('export', shots, {
  format: 'json',
  quality: 'high'
});
```

### Transform
Applique des transformations aux plans.

```typescript
await manager.execute('transform', shots, {
  transform: {
    duration: 10,
    metadata: { category: 'Action' }
  }
});
```

### Tag
Ajoute ou remplace des tags.

```typescript
await manager.execute('tag', shots, {
  tags: ['important', 'review'],
  addTags: true // true = ajouter, false = remplacer
});
```

## Estimation de temps

Le gestionnaire maintient un historique des opérations pour fournir des estimations précises:

```typescript
// Estimation basée sur l'historique
const estimate = manager.estimateTime('export', 20);

// Confiance dans l'estimation
// - 0 échantillons: estimation par défaut (low)
// - 1-4 échantillons: estimation moyenne (medium)
// - 5+ échantillons: estimation précise (high)
```

## Gestion des erreurs

Les erreurs sont capturées et reportées individuellement:

```typescript
const result = await manager.execute('export', shots);

if (result.failed.length > 0) {
  console.log('Échecs:');
  for (const failure of result.failed) {
    console.log(`- ${failure.shot.title}: ${failure.error.message}`);
  }
}
```

## Performance

### Traitement parallèle

Le nombre de workers est automatiquement ajusté selon le CPU:

```typescript
// Utilise navigator.hardwareConcurrency (généralement 4-8)
const manager = new BatchOperationsManager();

// Ou spécifier manuellement
const manager = new BatchOperationsManager(2);
```

### Traitement séquentiel

Pour forcer le traitement séquentiel:

```typescript
await manager.execute('export', shots, {
  parallel: false
});
```

### Limitation de concurrence

Pour limiter le nombre de tâches parallèles:

```typescript
await manager.execute('export', shots, {
  maxConcurrent: 2
});
```

## Exigences satisfaites

- **8.1**: Affichage de barre d'outils lors de sélection multiple
- **8.2**: Application des transformations à tous les plans
- **8.3**: Édition groupée de métadonnées avec prévisualisation
- **8.4**: Traitement parallèle avec barre de progression
- **8.5**: Support des opérations (Delete, Duplicate, Export, Transform, Tag)
- **8.6**: Rapport détaillé en cas d'échec partiel
- **8.7**: Annulation d'opérations par lots
- **8.8**: Estimation du temps de traitement
- **10.1**: Traitement non-bloquant en arrière-plan
- **10.6**: Traitement parallèle avec file d'attente

## Exemples d'intégration

### Avec React

```typescript
import { useMemo, useState } from 'react';
import { BatchOperationsManager } from '@/services/batchOperations';

function MyComponent() {
  const manager = useMemo(() => new BatchOperationsManager(), []);
  const [progress, setProgress] = useState(0);
  
  const handleBatchOperation = async () => {
    const result = await manager.execute('duplicate', selectedShots);
    // Traiter le résultat
  };
  
  return (
    <button onClick={handleBatchOperation}>
      Dupliquer la sélection
    </button>
  );
}
```

### Avec estimation de temps

```typescript
import { useBatchOperationEstimate } from '@/hooks/useBatchOperationEstimate';

function MyComponent() {
  const estimate = useBatchOperationEstimate('export', selectedShots);
  
  return (
    <div>
      <p>Temps estimé: {estimate.formattedTime}</p>
      <p>Confiance: {estimate.confidence}</p>
    </div>
  );
}
```

## Notes techniques

### Web Workers

Les workers sont créés dynamiquement et gèrent:
- Génération de thumbnails
- Encodage vidéo
- Traitement par lots
- Optimisation d'images
- Analyse de qualité vidéo

### Gestion de la mémoire

Le gestionnaire nettoie automatiquement les opérations terminées après 1 heure:

```typescript
// Nettoyage manuel
manager.cleanup();
```

### Persistance

L'historique des opérations est maintenu en mémoire pour les estimations. Pour persister:

```typescript
// Sauvegarder l'historique
const history = manager.getAllOperations();
localStorage.setItem('batchHistory', JSON.stringify(history));

// Restaurer (à implémenter si nécessaire)
```

## Limitations

- Maximum 100 entrées dans l'historique (FIFO)
- Les workers sont limités par `navigator.hardwareConcurrency`
- Les opérations annulées ne peuvent pas être reprises
- L'estimation de temps nécessite un historique pour être précise

## Améliorations futures

- [ ] Persistance de l'historique entre sessions
- [ ] Reprise d'opérations annulées
- [ ] Priorisation de tâches
- [ ] Statistiques détaillées de performance
- [ ] Support de plugins pour opérations personnalisées
