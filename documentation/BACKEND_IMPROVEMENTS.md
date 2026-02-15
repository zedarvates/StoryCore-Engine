# Backend API Improvements - Améliorations du Backend StoryCore

## Overview
Ce document décrit les améliorations potentielles du backend API pour améliorer l'expérience de développement et de test.

---

## 1. Mode Mock pour Tests

### Endpoints Mock
Ajouter un mode "mock" pour permettre aux développeurs de tester l'UI sans avoir besoin du backend en cours d'exécution.

```python
# backend/main_api.py - Ajouter après les endpoints existants

@app.get("/api/mock/generate-sequence")
async def mock_generate_sequence():
    """Mock endpoint pour tests UI sans backend réel"""
    import uuid
    return {
        "job_id": f"mock_{uuid.uuid4().hex[:8]}",
        "status": "completed",
        "progress": 100,
        "result": {
            "id": f"seq_{uuid.uuid4().hex[:8]}",
            "project_id": "mock_project",
            "name": "Mock Generated Sequence",
            "shots": [
                {
                    "id": f"shot_{uuid.uuid4().hex[:8]}",
                    "order_index": 0,
                    "name": "Shot 1 - Opening",
                    "prompt": "A beautiful landscape at sunset",
                    "duration_seconds": 5.0,
                    "shot_type": "establishing"
                },
                {
                    "id": f"shot_{uuid.uuid4().hex[:8]}",
                    "order_index": 1,
                    "name": "Shot 2 - Action",
                    "prompt": "Character walking through the scene",
                    "duration_seconds": 3.0,
                    "shot_type": "action"
                }
            ],
            "total_duration": 8.0,
            "prompt": "Beautiful sunset landscape sequence"
        }
    }

@app.get("/api/mock/audio-generate")
async def mock_audio_generate():
    """Mock endpoint audio pour tests"""
    import uuid
    return {
        "job_id": f"mock_audio_{uuid.uuid4().hex[:8]}",
        "status": "completed",
        "progress": 100,
        "result": {
            "id": f"audio_{uuid.uuid4().hex[:8]}",
            "project_id": "mock_project",
            "type": "voice",
            "format": "mp3",
            "duration_seconds": 15.0,
            "file_size_bytes": 240000,
            "file_url": "/api/audio/mock/download",
            "sample_rate": 44100,
            "channels": 2,
            "status": "completed"
        }
    }

@app.get("/api/mock/health")
async def mock_health_check():
    """Mock health check"""
    return {
        "status": "healthy",
        "service": "StoryCore-Engine API (Mock Mode)",
        "version": "1.0.0",
        "mode": "mock",
        "timestamp": datetime.utcnow().isoformat()
    }
```

---

## 2. Endpoints de Job Logs

### Récupérer les logs d'un job
```python
@app.get("/api/jobs/{job_id}/logs")
async def get_job_logs(job_id: str, lines: int = 100):
    """Récupère les logs d'un job spécifique"""
    log_file = f"./data/jobs/{job_id}.log"
    
    if os.path.exists(log_file):
        with open(log_file, 'r') as f:
            all_lines = f.readlines()
            return {"logs": all_lines[-lines:], "total_lines": len(all_lines)}
    
    return {"logs": [], "total_lines": 0, "message": "No logs found"}
```

---

## 3. Endpoints de Statistiques

### Statistiques Globales
```python
@app.get("/api/stats")
async def get_stats():
    """Récupère les statistiques globales du système"""
    return {
        "total_projects": len(projects_db),
        "total_shots": len(shots_db),
        "active_jobs": len([j for j in jobs_db.values() if j.status == "processing"]),
        "completed_jobs_today": sum(
            1 for j in jobs_db.values() 
            if j.status == "completed" and j.completed_at.date() == datetime.utcnow().date()
        ),
        "storage_used_mb": get_storage_usage()
    }
```

---

## 4. Rate Limiting Amélioré

### Configuration
```python
# backend/rate_limiter.py

class RateLimitConfig:
    """Configuration du rate limiting par endpoint"""
    
    LIMITS = {
        "/api/sequences/generate": {"requests": 10, "window": 60},  # 10/min
        "/api/audio/generate": {"requests": 5, "window": 60},        # 5/min
        "/api/llm/generate": {"requests": 30, "window": 60},       # 30/min
        "/api/projects": {"requests": 60, "window": 60},           # 60/min
        "/api/shots": {"requests": 100, "window": 60},            # 100/min
    }
```

---

## 5. Health Check Détaillé

### Health Check Complet
```python
@app.get("/api/health/detailed")
async def detailed_health_check():
    """Health check détaillé avec status des services"""
    
    services = {
        "database": check_db_connection(),
        "storage": check_storage_access(),
        " Ollama": check_ollama_connection(),
        "ComfyUI": check_comfyui_connection()
    }
    
    all_healthy = all(s["status"] == "healthy" for s in services.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "services": services,
        "uptime_seconds": get_uptime(),
        "memory_usage_mb": get_memory_usage()
    }
```

---

## 6. Retry Automatique pour Jobs

### Configuration des Retries
```python
class JobRetryConfig:
    """Configuration des retries pour jobs échoués"""
    
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 60
    BACKOFF_MULTIPLIER = 2
    
    @classmethod
    def should_retry(cls, job) -> bool:
        """Détermine si un job doit être refait"""
        return (
            job.status == "failed" and 
            job.retry_count < cls.MAX_RETRIES and
            not job.error_code in ["VALIDATION_ERROR", "INVALID_INPUT"]
        )
```

---

## 7. Documentation API Améliorée

### Swagger UI Custom
```python
# Configuration swagger avancée
app = FastAPI(
    title="StoryCore-Engine API",
    description="Backend API for StoryCore Creative Studio Engine",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Tags pour grouper les endpoints
tags_metadata = [
    {"name": "Projects", "description": "Project management operations"},
    {"name": "Sequences", "description": "Sequence generation and management"},
    {"name": "Audio", "description": "Audio processing and TTS"},
    {"name": "LLM", "description": "Language model integration"},
    {"name": "Automation", "description": "Dialogue and grid generation"},
]
```

---

## 8. Exemple d'Utilisation Frontend avec Mode Mock

```typescript
// creative-studio-ui/src/services/mockMode.ts

const USE_MOCK_MODE = import.meta.env.VITE_USE_MOCK === 'true';

export async function generateSequenceMock(params: any) {
  if (!USE_MOCK_MODE) {
    return sequenceService.generateSequence(params);
  }
  
  // Mode mock - retourne des données simulées
  return {
    job_id: `mock_${Date.now()}`,
    status: 'completed',
    progress: 100,
    result: {
      id: `seq_${Date.now()}`,
      name: "Mock Sequence",
      shots: params.shot_count || 5,
      total_duration: (params.shot_count || 5) * 5
    }
  };
}
```

---

## 9. Installation et Configuration

### Variables d'Environnement
```env
# Mode mock pour développement
VITE_USE_MOCK=true

# Backend URL (auto-détection)
VITE_API_URL=http://localhost:8000/api

# Timeout personnalisé
VITE_API_TIMEOUT=30000
```

---

## 10. Tests d'Intégration

### Script de Test Automatisé
```python
# tests/test_api_integration.py

import pytest
from fastapi.testclient import TestClient

def test_sequence_generation():
    """Test complet de la génération de séquence"""
    client = TestClient(app)
    
    # 1. Créer un job
    response = client.post("/api/sequences/generate", json={
        "project_id": "test_project",
        "prompt": "Test scene",
        "shot_count": 3
    })
    assert response.status_code == 202
    job_id = response.json()["job_id"]
    
    # 2. Vérifier le status
    response = client.get(f"/api/sequences/{job_id}/status")
    assert response.status_code == 200
    
    # 3. Annuler le job
    response = client.post(f"/api/sequences/{job_id}/cancel")
    assert response.status_code == 200
```

---

## Résumé des Améliorations

| Amélioration | Priorité | Status |
|--------------|----------|--------|
| Mode Mock UI | Haute | ⏳ À implémenter |
| Job Logs | Moyenne | ⏳ À implémenter |
| Stats Endpoint | Moyenne | ⏳ À implémenter |
| Rate Limiting | Haute | ✅ Existant |
| Health Check | Moyenne | ⏳ À implémenter |
| Auto Retry | Haute | ⏳ À implémenter |
| Documentation | Basse | ⏳ À implémenter |

