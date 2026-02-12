# StoryCore Engine - Configuration Migration Guide

## Overview

This document describes the migration from hardcoded URLs to centralized configuration for StoryCore Engine. The audit identified ~270 hardcoded URLs (mainly `localhost`) that need to be centralized for easier:
- Development → Production transitions
- Environment-specific configurations
- Testing and CI/CD pipelines
- Maintenance and updates

---

## Files Created

### 1. Backend Configuration
**File:** [`backend/config.py`](backend/config.py)

Centralized Pydantic-based settings for all backend services:

| Setting | Default | Description |
|---------|---------|-------------|
| `API_URL` | `http://localhost:8080` | Backend API URL |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama LLM service |
| `COMFYUI_BASE_URL` | `http://127.0.0.1:7860` | ComfyUI service |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `GITHUB_API_URL` | `https://api.github.com` | GitHub API |
| Feature flags | `DEBUG`, `USE_MOCK_LLM`, etc. | Feature toggles |

### 2. Frontend Configuration
**File:** [`creative-studio-ui/src/config/serverConfig.ts`](creative-studio-ui/src/config/serverConfig.ts)

TypeScript configuration for the Creative Studio UI with environment variable support:

```typescript
import { config, getApiUrl, getOllamaUrl } from '../config/serverConfig';

// Access configuration
config.ollama.baseUrl;
config.comfyui.baseUrl;
config.server.url;

// Get endpoint URLs
getApiUrl('/llm/generate');
getOllamaUrl('/api/tags');
```

### 3. Environment Template
**File:** [`.env.example`](.env.example)

Template for environment configuration with all settings documented.

---

## Backend Migration Pattern

### Before (Hardcoded URL)
```python
# backend/some_service.py
OLLAMA_URL = "http://localhost:11434"
response = requests.post(f"{OLLAMA_URL}/api/generate", ...)
```

### After (Centralized Config)
```python
# backend/some_service.py
from backend.config import settings, get_ollama_url

response = requests.post(f"{get_ollama_url()}/api/generate", ...)
# or
response = requests.post(f"{settings.OLLAMA_BASE_URL}/api/generate", ...)
```

### Convenience Functions
The [`backend/config.py`](backend/config.py) provides helper functions:

```python
from backend.config import (
    get_ollama_url,      # Get Ollama base URL
    get_comfyui_url,     # Get ComfyUI base URL
    get_api_url,         # Get API base URL
    get_redis_url,       # Get Redis URL
    get_github_api_url,  # Get GitHub API URL
)
```

---

## Frontend Migration Pattern

### Before (Hardcoded URL)
```typescript
// creative-studio-ui/src/services/ollamaService.ts
const OLLAMA_URL = "http://localhost:11434";
const response = await fetch(`${OLLAMA_URL}/api/tags`);
```

### After (Centralized Config)
```typescript
// creative-studio-ui/src/services/ollamaService.ts
import { config, getOllamaUrl } from '../config/serverConfig';

const response = await fetch(getOllamaUrl('/api/tags'));
// or
const response = await fetch(`${config.ollama.baseUrl}/api/tags`);
```

### Environment Variables (Vite)
Prefix frontend variables with `VITE_`:

```bash
VITE_OLLAMA_URL=http://localhost:11434
VITE_COMFYUI_URL=http://127.0.0.1:7860
VITE_API_URL=http://localhost:8080
```

---

## Files Requiring Migration

### Backend Files (~10 files)

| File | Current Pattern | Migration Status |
|------|----------------|------------------|
| [`backend/video_editor_api.py`](backend/video_editor_api.py) | `redis://localhost:6379/0` | Pending |
| [`backend/test_integration.py`](backend/test_integration.py) | `http://localhost:8000` | Pending |
| [`backend/test_connection.py`](backend/test_connection.py) | `http://localhost:8000` | Pending |
| [`backend/start_server.py`](backend/start_server.py) | Help text references | Pending |
| [`backend/start_main_api.py`](backend/start_main_api.py) | Help text references | Pending |
| [`backend/main_api.py`](backend/main_api.py) | CORS origins | Pending |
| [`backend/feedback_proxy.py`](backend/feedback_proxy.py) | CORS origins | Pending |

### Frontend Files (~50+ files)

Key files with hardcoded URLs:

| File | Pattern | Migration Status |
|------|---------|------------------|
| [`creative-studio-ui/src/stores/locationStore.ts`](creative-studio-ui/src/stores/locationStore.ts) | `import.meta.env.VITE_API_URL` | Reference config |
| [`creative-studio-ui/src/services/backendApiService.ts`](creative-studio-ui/src/services/backendApiService.ts) | `import.meta.env.VITE_BACKEND_URL` | Reference config |
| [`creative-studio-ui/src/services/ollamaConfig.ts`](creative-studio-ui/src/services/ollamaConfig.ts) | `http://localhost:11434` | Pending |
| [`creative-studio-ui/src/services/wizard/WizardService.ts`](creative-studio-ui/src/services/wizard/WizardService.ts) | `http://localhost:11434` | Pending |
| [`creative-studio-ui/src/services/wizard/OllamaClient.ts`](creative-studio-ui/src/services/wizard/OllamaClient.ts) | `http://localhost:11434` | Pending |
| [`creative-studio-ui/src/utils/ollamaModelDetection.ts`](creative-studio-ui/src/utils/ollamaModelDetection.ts) | `http://localhost:11434` | Pending |
| [`creative-studio-ui/src/utils/ollamaMigration.ts`](creative-studio-ui/src/utils/ollamaMigration.ts) | `http://localhost:11434` | Pending |

---

## Automated Migration Script

### Python Script for Backend

```python
#!/usr/bin/env python3
"""
Script to migrate hardcoded URLs to centralized config.
Run from project root: python scripts/migrate_backend_urls.py
"""

import os
import re
from pathlib import Path

PATTERNS = [
    # Pattern: requests.post("http://localhost:11434/...
    (r'"http://localhost:11434"', 'f"{settings.OLLAMA_BASE_URL}"'),
    (r"'http://localhost:11434'", 'f"{settings.OLLAMA_BASE_URL}"'),
    # Pattern: redis://localhost:6379
    (r'"redis://localhost:6379"', 'f"{settings.REDIS_URL}"'),
    (r"'redis://localhost:6379'", 'f"{settings.REDIS_URL}"'),
    # Pattern: http://localhost:8080
    (r'"http://localhost:8080"', 'f"{settings.API_URL}"'),
    (r"'http://localhost:8080'", 'f"{settings.API_URL}"'),
    # Pattern: http://127.0.0.1:7860
    (r'"http://127\.0\.0\.1:7860"', 'f"{settings.COMFYUI_BASE_URL}"'),
]

def migrate_file(filepath: Path) -> bool:
    """Migrate a single file and return True if changes were made."""
    content = filepath.read_text()
    original = content
    
    for pattern, replacement in PATTERNS:
        content = re.sub(pattern, replacement, content)
    
    if content != original:
        filepath.write_text(content)
        return True
    return False

# Usage
backend_dir = Path("backend")
for py_file in backend_dir.glob("*.py"):
    if migrate_file(py_file):
        print(f"Migrated: {py_file}")
```

### Bash Script for Frontend

```bash
#!/bin/bash
# migrate_frontend_urls.sh - Migrate frontend URLs to centralized config

# Find and replace patterns
find creative-studio-ui/src -name "*.ts" -o -name "*.tsx" | while read file; do
    # Replace hardcoded localhost:11434
    sed -i 's|http://localhost:11434|${config.ollama.baseUrl}|g' "$file"
    sed -i 's|http://127.0.0.1:7860|${config.comfyui.baseUrl}|g' "$file"
    sed -i 's|http://localhost:8080|${config.server.url}|g' "$file"
done
```

---

## Step-by-Step Migration Checklist

### Step 1: Create Environment File
```bash
cp .env.example .env
# Edit .env with your local settings
```

### Step 2: Update Backend Files
1. Add import: `from backend.config import settings, get_ollama_url`
2. Replace hardcoded URLs with settings references
3. Remove duplicate Settings classes

### Step 3: Update Frontend Files
1. Add import: `import { config, getOllamaUrl } from '../config/serverConfig'`
2. Replace hardcoded URLs with config references
3. Update default values to use `config.service.property`

### Step 4: Test Configuration Loading
```bash
# Backend
cd backend
python -c "from config import settings; print(settings.OLLAMA_BASE_URL)"

# Frontend
cd creative-studio-ui
npm run dev  # Should load VITE_* env vars
```

---

## Environment-Specific Configurations

### Development (.env)
```bash
DEBUG=true
OLLAMA_BASE_URL=http://localhost:11434
COMFYUI_BASE_URL=http://127.0.0.1:7860
DATABASE_URL=postgresql://user:password@localhost/video_editor
```

### Production (.env.production)
```bash
DEBUG=false
OLLAMA_BASE_URL=http://ollama.internal:11434
COMFYUI_BASE_URL=http://comfyui.internal:7860
DATABASE_URL=postgresql://prod_user:prod_pass@db.example.com/video_editor
```

### Docker Compose Override
```yaml
services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
  
  comfyui:
    ports:
      - "7860:7860"
```

---

## Verification

After migration, verify:

1. **Backend:** Start the API server and check logs
   ```bash
   cd backend
   python -m uvicorn main_api:app --host 0.0.0.0 --port 8080
   ```

2. **Frontend:** Start the dev server
   ```bash
   cd creative-studio-ui
   npm run dev
   ```

3. **Health Check:** Verify services are accessible
   ```bash
   curl http://localhost:8080/health
   curl http://localhost:11434/api/tags
   curl http://127.0.0.1:7860/system_stats
   ```

---

## Rollback Plan

If issues arise:

1. **Backend:** The original Settings class in each module can be temporarily re-enabled
2. **Frontend:** Keep localStorage-based config as fallback
3. **Environment:** Source control `.env.example` to restore defaults

---

## Questions & Support

For issues related to configuration migration:
1. Check the [README.md](README.md) for project overview
2. Review [backend/README.md](backend/README.md) for backend specifics
3. Check console logs for configuration errors
