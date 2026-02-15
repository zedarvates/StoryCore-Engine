# Plan d'Implémentation: Lip Sync (Priorité 1)

## Objectif
Intégrer la fonctionnalité Lip Sync dans StoryCore Engine pour synchroniser les lèvres des personnages avec l'audio généré.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW LIP SYNC                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Génération Dialogue          2. Génération Audio           │
│     (DialogueWizard)                (Qwen3 TTS)                │
│           ↓                               ↓                      │
│     ┌──────────────────┐          ┌──────────────────┐        │
│     │  Script Dialogue │          │   Fichier Audio  │        │
│     └──────────────────┘          └──────────────────┘        │
│                                                   ↓             │
│  3. Génération Visuel (Face)    4. Lip Sync (Wav2Lip)         │
│     (ComfyUI/Flux)                  ↓                         │
│           ↓                  ┌──────────────────┐              │
│     ┌──────────────────┐     │  Vidéo Lip Sync  │              │
│     │   Image Visage   │     └──────────────────┘              │
│     └──────────────────┘              ↓                         │
│                                  5. Enhancement                │
│                                        ↓                         │
│                                  ┌──────────────────┐          │
│                                  │  Vidéo Finale    │          │
│                                  └──────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à Créer/Modifier

### Backend (Python)

#### 1. `backend/lipsync_api.py` (NOUVEAU)
- Endpoint: POST `/api/lipsync/generate`
- Endpoint: POST `/api/lipsync/workflow`
- Intégration ComfyUI (Wav2Lip)
- Gestion des modèles et workflows

#### 2. `backend/audio_api.py` (MODIFIER)
- Ajouter endpoint pour récupérer l'audio du dialogue

### Frontend (TypeScript/React)

#### 3. `src/services/lipSyncService.ts` (NOUVEAU)
- Service pour appels API lip sync
- Gestion des paramètres et états

#### 4. `src/types/lipSync.ts` (NOUVEAU)
- Types TypeScript pour Lip Sync

#### 5. `src/components/lipSync/` (NOUVEAU)
- `LipSyncWizard.tsx` - Wizard d'interface
- `LipSyncPreview.tsx` - Prévisualisation

#### 6. `src/stores/lipSyncStore.ts` (NOUVEAU)
- Zustand store pour l'état Lip Sync

### ComfyUI

#### 7. Workflows ComfyUI
- `workflows/lipsync_wav2lip.json` - Workflow Wav2Lip
- `workflows/lipsync_sadtalker.json` - Workflow SadTalker

---

## Détails d'Implémentation

### 1. Backend - lip_sync_api.py

```python
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import uuid
import asyncio
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class LipSyncRequest(BaseModel):
    project_id: str
    character_face_image: str  # URL ou chemin vers l'image du visage
    audio_file: str  # URL ou chemin vers l'audio
    model: str = "wav2lip"  # ou "sadtalker"
    enhancer: bool = True
    pads: str = "0 0 0 0"  # Padding pour le visage

class LipSyncResponse(BaseModel):
    job_id: str
    status: str
    video_url: Optional[str] = None
    progress: int
```

### 2. ComfyUI Workflow - Wav2Lip

```json
{
  "nodes": [
    {
      "id": "1",
      "class_type": "LoadImage",
      "inputs": {
        "image": "character_face.png"
      }
    },
    {
      "id": "2", 
      "class_type": "LoadAudio",
      "inputs": {
        "audio": "dialogue.wav"
      }
    },
    {
      "id": "3",
      "class_type": "Wav2Lip",
      "inputs": {
        "face_image": ["1", 0],
        "audio_file": ["2", 0],
        "pads": [0, 0, 0, 0],
        "nosmooth": false,
        "enhancer": true
      }
    },
    {
      "id": "4",
      "class_type": "FaceEnhance", 
      "inputs": {
        "image": ["3", 0],
        "model": "GFPGAN"
      }
    },
    {
      "id": "5",
      "class_type": "SaveVideo",
      "inputs": {
        "video": ["4", 0],
        "filename_prefix": "lipsync_result"
      }
    }
  ]
}
```

### 3. Frontend - lipSyncService.ts

```typescript
export interface LipSyncRequest {
  projectId: string;
  characterFaceImage: string;
  audioFile: string;
  model: 'wav2lip' | 'sadtalker';
  enhancer?: boolean;
}

export interface LipSyncResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  progress: number;
}

export class LipSyncService {
  async generateLipSync(request: LipSyncRequest): Promise<LipSyncResult> {
    const response = await apiClient.post('/api/lipsync/generate', request);
    return response.data;
  }

  async checkStatus(jobId: string): Promise<LipSyncResult> {
    const response = await apiClient.get(`/api/lipsync/status/${jobId}`);
    return response.data;
  }
}
```

---

## Ordre d'Implémentation

### Étape 1: Backend API
- [ ] Créer `backend/lipsync_api.py`
- [ ] Ajouter endpoints pour génération lip sync
- [ ] Tester avec ComfyUI local

### Étape 2: Service Frontend
- [ ] Créer `src/types/lipSync.ts`
- [ ] Créer `src/services/lipSyncService.ts`
- [ ] Créer `src/stores/lipSyncStore.ts`

### Étape 3: Interface Utilisateur
- [ ] Créer `src/components/lipSync/LipSyncWizard.tsx`
- [ ] Intégrer dans le Wizard de dialogue existant

### Étape 4: Workflows ComfyUI
- [ ] Créer `workflows/lipsync_wav2lip.json`
- [ ] Tester le workflow complet

---

## Modèles ComfyUI Requis

1. **Wav2Lip** - Pour la synchronisation labiale de base
   - `wav2lip.pth`
   - `wav2lip_gan.pth` (optionnel, qualité supérieure)

2. **GFPGAN** - Pour l'amélioration du visage
   - `GFPGAN.pth`

3. **CodeFormer** - Alternative pour restauration visage
   - `codeformer.pth`

---

## Statut: EN COURS

### Backend (Python) - TERMINÉ ✅
- [x] `backend/lipsync_api.py` - Créé avec endpoints complet

### Frontend (TypeScript) - TERMINÉ ✅
- [x] `src/types/lipSync.ts` - Types TypeScript
- [x] `src/services/lipSyncService.ts` - Service API
- [x] `src/stores/lipSyncStore.ts` - Zustand store

### À faire
- [ ] Intégrer LipSyncWizard dans le dialogue wizard existant
- [ ] Tester l'intégration ComfyUI
- [ ] Créer les workflows ComfyUI

---

*Document créé pour l'implémentation du Lip Sync - Priorité 1*
*Date: 2026*

