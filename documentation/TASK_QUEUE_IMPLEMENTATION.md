# Système de Priorisation de Génération - Plan d'Implémentation

## Objectif
Implémenter un système permettant aux utilisateurs de:
- Voir tous les jobs de génération en cours
- Modifier la priorité des jobs (monter/descendre dans la file)
- Annuler ou relancer des jobs
- Suivre la progression en temps réel

---

## Backend - Modifications Complétées ✅

### 1. Fichier: `backend/sequence_api.py` ✅
- [x] Ajouter champ `priority` à `GenerationJob`
- [x] Ajouter champ `estimated_time` à `GenerationJob`
- [x] Mettre à jour la création de job pour inclure ces champs

### 2. Fichier: `backend/task_queue_api.py` ✅ (NOUVEAU)
- [x] Créer API router pour la gestion de la file d'attente
- [x] Endpoint GET `/api/tasks/queue` - Liste tous les jobs avec priorité
- [x] Endpoint PUT `/api/tasks/{job_id}/priority` - Modifier priorité
- [x] Endpoint POST `/api/tasks/{job_id}/move-up` - Monter dans la file
- [x] Endpoint POST `/api/tasks/{job_id}/move-down` - Descendre dans la file
- [x] Endpoint POST `/api/tasks/{job_id}/retry` - Relancer job échoué
- [x] Endpoint GET `/api/tasks/stats` - Statistiques de la file
- [x] Endpoint DELETE `/api/tasks/{job_id}` - Supprimer job

### 3. Fichier: `backend/main_api.py` ✅
- [x] Ajouter le routeur task_queue_api

---

## Frontend - Fichiers Créés

### 1. `creative-studio-ui/src/services/taskQueueService.ts` ✅
- [x] Fonctions pour communiquer avec le backend
- [x] `getQueue()` - Récupérer liste des jobs
- [x] `updatePriority()` - Changer priorité
- [x] `moveTask()` - Monter/descendre
- [x] `retryJob()` - Relancer job
- [x] `deleteJob()` - Supprimer job
- [x] Fonctions utilitaires pour les couleurs/icônes

### 2. `creative-studio-ui/src/components/ui/TaskQueuePanel.tsx` ✅
- [x] Composant panel pour afficher la file d'attente
- [x] Liste des tâches avec badges de priorité
- [x] Indicateurs de progression (progress bar)
- [x] Boutons pour monter/descendre priorité
- [x] Boutons annuler/reller/retirer
- [x] Animation de statut (pending = yellow, processing = blue, etc.)

### 3. `creative-studio-ui/src/types/index.ts` ✅
- [x] Types pour TaskQueueItem, TaskQueueResponse, PriorityUpdateResponse, etc.

---

## Modèle de Données

```typescript
interface GenerationJob {
  id: string;
  project_id: string;
  prompt: string;
  shot_count: number;
  style?: string;
  mood?: string;
  characters: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_step?: string;
  result?: Dict[str, Any];
  error?: string;
  created_at: datetime;
  started_at?: datetime;
  completed_at?: datetime;
  user_id: string;
  priority: int = 10;  // 1 = haute priorité, 10 = basse priorité
  estimated_time?: int; // Temps estimé en secondes
}
```

---

## Utilisation du Composant UI

```tsx
import { TaskQueuePanel } from '../components/ui/TaskQueuePanel';

function App() {
  const [showQueue, setShowQueue] = useState(true);
  
  return (
    <div className="flex">
      <main className="flex-1">
        {/* Contenu principal */}
      </main>
      
      {showQueue && (
        <TaskQueuePanel
          projectId="mon-projet"
          isOpen={showQueue}
          onClose={() => setShowQueue(false)}
        />
      )}
    </div>
  );
}
```

---

## Ordre d'Implémentation

1. ✅ Backend: Ajouter priorité et estimated_time
2. ✅ Backend: Créer task_queue_api.py
3. ✅ Frontend: Créer taskQueueService
4. ✅ Frontend: Créer TaskQueuePanel.tsx
5. ⏳ Intégration: Connecter dans EditorPage.tsx (à faire)

---

## Prochaines Étapes

Pour finaliser l'intégration, il faut:
1. Ouvrir `creative-studio-ui/src/pages/EditorPage.tsx`
2. Importer et intégrer le composant `TaskQueuePanel`
3. Ajouter un bouton pour toggle l'affichage du panel

---

## Notes

- La priorité la plus basse (1) est traitée en premier
- Les jobs en cours de traitement ne peuvent pas être réordonnés
- L'estimation de temps est calculée basée sur le nombre de shots restants
- Rafraîchissement automatique toutes les 5 secondes

