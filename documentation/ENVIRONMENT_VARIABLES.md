# Environment Variables Configuration

This document describes all environment variables required for production deployment of StoryCore Engine.

## Quick Reference

| Variable | Default (Dev) | Description |
|----------|---------------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | Backend API URL |
| `VITE_OLLAMA_URL` | `http://localhost:11434` | Ollama LLM service URL |
| `VITE_COMFYUI_URL` | `http://127.0.0.1:7860` | ComfyUI service URL |
| `VITE_REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `VITE_BACKEND_URL` | `http://localhost:3000` | Alternative backend URL |
| `VITE_WS_URL` | `ws://localhost:8080` | WebSocket URL |
| `OLLAMA_HOST` | `http://localhost:11434` | Backend Ollama URL |
| `REDIS_URL` | `redis://localhost:6379/0` | Backend Redis URL |
| `JWT_SECRET` | *(required in prod)* | JWT signing secret |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,...` | Allowed CORS origins |

---

## Frontend Environment Variables (Vite/React)

These variables are used by the frontend application and should be set in `.env` or `.env.production` files.

### API Configuration

#### `VITE_API_URL`
- **Default:** `http://localhost:8080`
- **Description:** The base URL for the backend API server
- **Production Example:** `https://api.yourdomain.com`

#### `VITE_BACKEND_URL`
- **Default:** `http://localhost:3000`
- **Description:** Alternative backend URL used by some services
- **Production Example:** `https://api.yourdomain.com`

#### `VITE_WS_URL`
- **Default:** `ws://localhost:8080` (derived from API_URL)
- **Description:** WebSocket URL for real-time communication
- **Production Example:** `wss://api.yourdomain.com`

### LLM Service Configuration

#### `VITE_OLLAMA_URL`
- **Default:** `http://localhost:11434`
- **Description:** URL for the Ollama LLM service
- **Production Example:** `https://ollama.yourdomain.com`

#### `VITE_OLLAMA_MODEL`
- **Default:** `qwen3:8b`
- **Description:** Default Ollama model to use
- **Production Example:** `llama3:70b`

#### `VITE_OLLAMA_TIMEOUT`
- **Default:** `300000` (5 minutes)
- **Description:** Timeout for Ollama requests in milliseconds

### ComfyUI Configuration

#### `VITE_COMFYUI_URL`
- **Default:** `http://127.0.0.1:7860`
- **Description:** URL for the ComfyUI image generation service
- **Production Example:** `https://comfyui.yourdomain.com`

#### `VITE_COMFYUI_TIMEOUT`
- **Default:** `600000` (10 minutes)
- **Description:** Timeout for ComfyUI requests in milliseconds

### Redis Configuration

#### `VITE_REDIS_URL`
- **Default:** `redis://localhost:6379/0`
- **Description:** Redis connection URL
- **Production Example:** `redis://redis.yourdomain.com:6379/0`

### CORS Configuration

#### `VITE_CORS_ORIGINS`
- **Default:** `http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173`
- **Description:** Comma-separated list of allowed CORS origins
- **Production Example:** `https://yourdomain.com,https://app.yourdomain.com`

---

## Backend Environment Variables (Python/FastAPI)

These variables are used by the backend API server.

### Server Configuration

#### `API_HOST`
- **Default:** `0.0.0.0`
- **Description:** Host to bind the API server

#### `API_PORT`
- **Default:** `8080`
- **Description:** Port for the API server

#### `API_URL`
- **Default:** `http://localhost:8080`
- **Description:** Full API URL (used for self-referential links)

### Authentication

#### `JWT_SECRET`
- **Default:** None (required in production)
- **Description:** Secret key for JWT token signing
- **Security:** MUST be set in production. Generate with:
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```

#### `JWT_ALGORITHM`
- **Default:** `HS256`
- **Description:** JWT signing algorithm

#### `ACCESS_TOKEN_EXPIRE_MINUTES`
- **Default:** `30`
- **Description:** Access token expiration time in minutes

### Ollama Configuration

#### `OLLAMA_BASE_URL` (Backend)
- **Default:** `http://localhost:11434`
- **Description:** Ollama service URL for backend
- **Environment Variable:** Can also use `OLLAMA_HOST` for compatibility

#### `OLLAMA_MODEL`
- **Default:** `qwen3:8b`
- **Description:** Default Ollama model

#### `OLLAMA_TIMEOUT`
- **Default:** `300`
- **Description:** Ollama request timeout in seconds

### ComfyUI Configuration

#### `COMFYUI_BASE_URL`
- **Default:** `http://127.0.0.1:7860`
- **Description:** ComfyUI service URL
- **Production Example:** `https://comfyui.yourdomain.com`

#### `COMFYUI_TIMEOUT`
- **Default:** `600`
- **Description:** ComfyUI request timeout in seconds

### Redis Configuration

#### `REDIS_URL` (Backend)
- **Default:** `redis://localhost:6379/0`
- **Description:** Redis connection URL for backend
- **Production Example:** `redis://:password@redis.yourdomain.com:6379/0`

### Database Configuration

#### `DATABASE_URL`
- **Default:** `postgresql://user:password@localhost/video_editor`
- **Description:** PostgreSQL connection URL
- **Production Example:** `postgresql://user:password@db.yourdomain.com/video_editor`

### CORS Configuration

#### `CORS_ALLOWED_ORIGINS`
- **Default:** `http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173`
- **Description:** Comma-separated list of allowed CORS origins
- **Production Example:** `https://yourdomain.com,https://app.yourdomain.com`

### Feature Flags

#### `USE_MOCK_LLM`
- **Default:** `false`
- **Description:** Use mock LLM responses (development only)

#### `USE_MOCK_COMFYUI`
- **Default:** `false`
- **Description:** Use mock ComfyUI responses (development only)

#### `DEBUG`
- **Default:** `false`
- **Description:** Enable debug mode with verbose logging

---

## Example Production Configuration

### Frontend `.env.production`
```env
VITE_API_URL=https://api.yourdomain.com
VITE_BACKEND_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
VITE_OLLAMA_URL=https://ollama.yourdomain.com
VITE_COMFYUI_URL=https://comfyui.yourdomain.com
VITE_REDIS_URL=redis://redis.yourdomain.com:6379/0
VITE_CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Backend `.env`
```env
# Server
API_HOST=0.0.0.0
API_PORT=8080
API_URL=https://api.yourdomain.com

# Authentication (REQUIRED)
JWT_SECRET=your-secure-jwt-secret-here

# Services
OLLAMA_BASE_URL=https://ollama.yourdomain.com
COMFYUI_BASE_URL=https://comfyui.yourdomain.com
REDIS_URL=redis://:password@redis.yourdomain.com:6379/0
DATABASE_URL=postgresql://user:password@db.yourdomain.com/video_editor

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Environment
ENVIRONMENT=production
DEBUG=false
```

---

## Docker/Kubernetes Configuration

When deploying with Docker or Kubernetes, set these environment variables in your deployment configuration:

### Docker Compose Example
```yaml
services:
  api:
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - OLLAMA_BASE_URL=http://ollama:11434
      - COMFYUI_BASE_URL=http://comfyui:7860
      - REDIS_URL=redis://redis:6379/0
      - CORS_ALLOWED_ORIGINS=https://yourdomain.com
  
  frontend:
    environment:
      - VITE_API_URL=https://api.yourdomain.com
      - VITE_OLLAMA_URL=https://ollama.yourdomain.com
      - VITE_COMFYUI_URL=https://comfyui.yourdomain.com
```

### Kubernetes ConfigMap Example
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: storycore-config
data:
  VITE_API_URL: "https://api.yourdomain.com"
  VITE_OLLAMA_URL: "https://ollama.yourdomain.com"
  VITE_COMFYUI_URL: "https://comfyui.yourdomain.com"
  OLLAMA_BASE_URL: "http://ollama-service:11434"
  COMFYUI_BASE_URL: "http://comfyui-service:7860"
  REDIS_URL: "redis://redis-service:6379/0"
---
apiVersion: v1
kind: Secret
metadata:
  name: storycore-secrets
type: Opaque
stringData:
  JWT_SECRET: "your-secure-jwt-secret-here"
```

---

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Always set `JWT_SECRET`** in production - never use the development default
3. **Use HTTPS** for all production URLs
4. **Restrict CORS origins** to only your actual domains
5. **Use Redis authentication** in production (`redis://:password@host:port/db`)
6. **Set `ENVIRONMENT=production`** to enforce production security rules

---

## Files Modified

The following files were updated to use centralized configuration:

### Frontend (TypeScript)
- `creative-studio-ui/src/config/apiConfig.ts` (new) - Central configuration exports
- `creative-studio-ui/src/config/serverConfig.ts` - Existing config extended
- `creative-studio-ui/src/services/wizard/WizardService.ts`
- `creative-studio-ui/src/services/llmService.ts`
- `creative-studio-ui/src/services/llm/OllamaClient.ts`
- `creative-studio-ui/src/services/comfyuiService.ts`
- `creative-studio-ui/src/services/backendApiService.ts`
- `creative-studio-ui/src/services/taskQueueService.ts`
- `creative-studio-ui/src/stores/locationStore.ts`

### Backend (Python)
- `backend/config.py` - Centralized configuration (already existed)
- `backend/llm_api.py` - Updated to use central config
- `backend/main_api.py` - Updated to use central config
- `backend/video_editor_api.py` - Already using central config
