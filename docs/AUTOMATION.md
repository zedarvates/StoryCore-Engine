# Système d'Automation StoryCore - Documentation Complète

## Vue d'Ensemble

Le système d'automation StoryCore permet la génération automatique de :
- **Dialogues** avec personnalités de personnages
- **Grilles de personnages** (2x2, 3x3, 4x4)
- **Amélioration de prompts** avec style, éclairage et ambiance

## Nouvelles Fonctionnalités (Retry Queue)

### Gestion des Échecs

Le système inclut maintenant une file d'attente pour les générations échouées avec possibilité de **retry automatique ou manuel**.

#### Utilisation

```typescript
import { automationService, AutomationHelpers } from '../services/automationService';

// Créer un travail avec retry
const job = AutomationHelpers.createJob('dialogue', {
  characters: [...],
  context: {...},
}, 3); // 3 tentatives max

// Le travail est automatiquement ajouté à la file d'attente en cas d'échec
try {
  await automationService.generateDialogue({...});
} catch (error) {
  // Le travail est dans la file d'attente des retries
  const queue = automationService.getRetryQueue();
}
```

#### Retry Manuel

```typescript
// Récupérer les travaux échoués
const queue = automationService.getRetryQueue();
const failedJobs = queue.filter(j => j.status === 'failed');

// Retry un travail spécifique
await automationService.retryJob(failedJobs[0]);

// Ou traiter toute la file d'attente
const results = await automationService.processRetryQueue((completed, total) => {
  console.log(`Progression: ${completed}/${total}`);
});
```

## Architecture

### Backend (Python)

```
backend/
├── automation_endpoints.py    # Endpoints FastAPI
└── feedback_proxy.py         # Serveur principal
```

### Frontend (TypeScript)

```
creative-studio-ui/src/
├── services/
│   └── automationService.ts   # Service API avec Job Queue
└── components/
    └── automation/
        ├── AutomationPanel.tsx  # Panneau principal
        └── index.ts            # Export centralisé
```

## Installation et Utilisation

### 1. Démarrer le Backend

```bash
cd backend
python feedback_proxy.py
```

### 2. Démarrer le Frontend

```bash
cd creative-studio-ui
npm run dev
```

### 3. Accéder à l'Interface

- **Automation Panel**: `http://localhost:5173` (onglets Automation)
- **API Documentation**: `http://localhost:8000/docs`

## API Reference

### Endpoints de Generation

#### Dialogues
- `POST /api/automation/dialogue/generate` - Générer un dialogue
- `GET /api/automation/dialogue/history` - Historique des dialogues
- `DELETE /api/automation/dialogue/history` - Effacer l'historique

#### Character Grids
- `POST /api/automation/character/grid/generate` - Générer une grille
- `GET /api/automation/character/grid/{id}` - Récupérer une grille
- `GET /api/automation/character/grid/options` - Options disponibles

#### Prompts
- `POST /api/automation/prompt/enhance` - Améliorer un prompt
- `GET /api/automation/prompt/styles` - Styles disponibles

### Health Check

```bash
GET /api/automation/health
```

## Types TypeScript

```typescript
// Statut d'un travail
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// Travail de génération
interface GenerationJob {
  job_id: string;
  type: 'dialogue' | 'grid' | 'prompt';
  status: JobStatus;
  params: Record<string, unknown>;
  result?: unknown;
  error?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress?: number;
}
```

## Exemples

### Génération de Dialogue

```typescript
const result = await automationService.generateDialogue({
  characters: [
    { character_id: 'hero_001', name: 'Héros', archetype: 'hero' },
    { character_id: 'villain_001', name: 'Méchant', archetype: 'villain' }
  ],
  context: {
    location: 'Château ancien',
    time_of_day: 'night',
    situation: 'combat',
    mood: 'tense'
  },
  dialogueType: 'conflict',
  numLines: 10
});
```

### Génération de Grille

```typescript
const grid = await automationService.generateCharacterGrid({
  characterId: 'hero_001',
  characterName: 'Héros Principal',
  gridSize: '3x3',
  outfits: ['casual', 'combat', 'armor'],
  poses: ['standing', 'walking', 'fighting', 'casting'],
  expressions: ['neutral', 'happy', 'angry', 'determined']
});
```

### Amélioration de Prompt

```typescript
const enhanced = await automationService.enhancePrompt({
  base_prompt: 'A knight in shining armor',
  style: 'fantasy',
  lighting: 'dramatic',
  mood: 'epic',
  quality: 'high'
});
```

## Dépannage

### Échecs de Génération

1. **Vérifier la file d'attente des retries**
   ```typescript
   const queue = automationService.getRetryQueue();
   console.log('Échecs:', queue.filter(j => j.status === 'failed'));
   ```

2. **Retry manuel**
   ```typescript
   const failedJob = queue.find(j => j.status === 'failed');
   await automationService.retryJob(failedJob);
   ```

3. **Effacer la file d'attente**
   ```typescript
   automationService.clearRetryQueue();
   ```

### Erreurs Courantes

| Erreur | Solution |
|--------|----------|
| `Connection refused` | Vérifier que le backend est démarré |
| `Timeout` | Augmenter le timeout dans le service |
| `Rate limit exceeded` | Attendre avant de réessayer |
| `Model not found` | Vérifier la configuration ComfyUI |

## Licence

MIT License - StoryCore Engine

