# StoryCore-Engine Feedback Proxy Backend

This is the backend service for the StoryCore-Engine Feedback & Diagnostics module. It provides a secure proxy for submitting feedback reports to GitHub.

## Features

- **Secure GitHub Integration**: Handles GitHub API authentication without exposing tokens to clients
- **CORS Support**: Configured for Creative Studio UI origins
- **Request Validation**: Validates all incoming payloads against JSON schema
- **Rate Limiting**: Prevents abuse with configurable rate limits (implemented in Phase 3)
- **Error Handling**: Graceful error handling with descriptive messages

## Requirements

- Python 3.9+
- FastAPI
- uvicorn
- pydantic-settings
- GitHub personal access token

## Installation

1. Install dependencies (already included in main requirements.txt):
```bash
pip install fastapi uvicorn pydantic-settings
```

2. Configure environment variables:
```bash
cd backend
cp .env.example .env
# Edit .env and add your GitHub token
```

3. Create a GitHub personal access token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: `repo` (for creating issues)
   - Copy the token and add it to `.env`

## Running the Service

### Development Mode (with auto-reload)

```bash
# From the project root
python -m backend.feedback_proxy

# Or using uvicorn directly
uvicorn backend.feedback_proxy:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
uvicorn backend.feedback_proxy:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Health Check
```
GET /health
```

Returns service status and version information.

**Response:**
```json
{
  "status": "healthy",
  "service": "StoryCore-Engine Feedback Proxy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000000"
}
```

### Submit Report
```
POST /api/v1/report
Content-Type: application/json
```

Submits a feedback report and creates a GitHub issue.

**Request Body:**
```json
{
  "schema_version": "1.0",
  "report_type": "bug|enhancement|question",
  "timestamp": "ISO-8601 timestamp",
  "system_info": {
    "storycore_version": "string",
    "python_version": "string",
    "os_platform": "string",
    "os_version": "string",
    "language": "string"
  },
  "module_context": {
    "active_module": "string",
    "module_state": {}
  },
  "user_input": {
    "description": "string (min 10 chars)",
    "reproduction_steps": "string"
  },
  "diagnostics": {
    "stacktrace": "string|null",
    "logs": ["string"],
    "memory_usage_mb": "number",
    "process_state": {}
  },
  "screenshot_base64": "string|null"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "issue_url": "https://github.com/zedarvates/StoryCore-Engine/issues/123",
  "issue_number": 123
}
```

**Error Response (400/429/500):**
```json
{
  "status": "error",
  "message": "Descriptive error message",
  "fallback_mode": "manual"
}
```

## Configuration

All configuration is done via environment variables. See `.env.example` for available options.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_API_TOKEN` | Yes | - | GitHub personal access token |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins |
| `RATE_LIMIT_THRESHOLD` | No | `10` | Max requests per IP per hour |
| `MAX_PAYLOAD_SIZE_MB` | No | `10` | Maximum payload size in MB |
| `GITHUB_REPO_OWNER` | No | `zedarvates` | GitHub repository owner |
| `GITHUB_REPO_NAME` | No | `StoryCore-Engine` | GitHub repository name |

## Security

- **Token Protection**: GitHub API token is stored in environment variables, never in code
- **CORS**: Restricts requests to configured origins only
- **Rate Limiting**: Prevents abuse (implemented in task 16.1)
- **Payload Validation**: All inputs validated against schema
- **Size Limits**: Prevents large payload attacks (implemented in task 14.3)

## Development

### API Documentation

FastAPI provides automatic interactive API documentation:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Testing

```bash
# Run tests (to be implemented)
pytest tests/backend/

# Test the health endpoint
curl http://localhost:8000/health

# Test report submission (requires valid payload)
curl -X POST http://localhost:8000/api/v1/report \
  -H "Content-Type: application/json" \
  -d @test_payload.json
```

## Implementation Status

### Phase 3: Task 13.1 ✅ Complete
- [x] FastAPI application setup
- [x] CORS configuration
- [x] Environment variable loading
- [x] Basic endpoint structure
- [x] Request/response models
- [x] Error handling

### AsyncTaskQueue Integration ✅ Complete
- [x] Task queue API endpoints (`backend/task_queue_api.py`)
- [x] Integration with `src/async_task_queue.py`
- [x] Priority-based task scheduling (1-10, 1 = highest)
- [x] Circuit breaker pattern for fault tolerance
- [x] Rate limiting support
- [x] Task cancellation and retry
- [x] Queue statistics and monitoring
- [x] Unit and integration tests (8/8 passing)

### Upcoming Tasks
- [ ] Task 13.2: Complete /report endpoint implementation
- [ ] Task 14.1: JSON schema validation
- [ ] Task 14.3: Payload size validation
- [ ] Task 15.1: GitHub API integration
- [ ] Task 15.3: Label generation
- [ ] Task 16.1: Rate limiting

## Task Queue Management API

The backend includes a comprehensive Task Queue Management API for handling asynchronous generation jobs.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/queue/status` | Get AsyncTaskQueue status snapshot |
| POST | `/api/tasks/api` | Submit a generic API task to AsyncTaskQueue |
| GET | `/api/tasks/api/{job_id}` | Get status of an API-driven task |
| GET | `/api/tasks/queue` | Get all jobs in queue sorted by priority |
| PUT | `/api/tasks/{job_id}/priority` | Update job priority (1=highest, 10=lowest) |
| POST | `/api/tasks/{job_id}/move-up` | Move job up in queue |
| POST | `/api/tasks/{job_id}/move-down` | Move job down in queue |
| POST | `/api/tasks/{job_id}/retry` | Retry a failed or cancelled job |
| GET | `/api/tasks/stats` | Get queue statistics |
| DELETE | `/api/tasks/{job_id}` | Delete a job from the queue |

### Priority System

Tasks use a priority scale from 1 to 10:
- **1-2**: Critical priority (immediate processing)
- **3-4**: High priority
- **5-7**: Normal priority (default)
- **8-10**: Low priority (background tasks)

### AsyncTaskQueue Features

The `AsyncTaskQueue` (`src/async_task_queue.py`) provides:

1. **Priority-Based Scheduling**: Tasks are processed based on priority and submission time
2. **Circuit Breaker**: Prevents cascade failures when downstream services are unavailable
3. **Rate Limiting**: Controls throughput to prevent resource exhaustion
4. **Task Cancellation**: Allows cancelling pending or running tasks
5. **Timeout Handling**: Tasks can have custom timeout limits
6. **Statistics & Monitoring**: Real-time queue metrics

### Usage Example

```python
# Submit a task to the queue
response = requests.post(
    "http://localhost:8000/api/tasks/api",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "job_id": "unique-job-id",
        "payload": {"task": "data"},
        "priority": 3,  # High priority
        "timeout_seconds": 300
    }
)

# Check task status
status = requests.get(
    f"http://localhost:8000/api/tasks/api/{job_id}",
    headers={"Authorization": f"Bearer {token}"}
)

# Get queue statistics
stats = requests.get(
    "http://localhost:8000/api/tasks/stats",
    headers={"Authorization": f"Bearer {token}"}
)
```

### Integration with Main API

The task queue router is integrated into `main_api.py`:

```python
from backend.task_queue_api import router as task_queue_router
app.include_router(task_queue_router, prefix="/api")
```

The AsyncTaskQueue lifecycle is managed in the FastAPI lifespan:

```python
from src.async_task_queue import get_async_task_queue

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize the queue
    queue = get_async_task_queue()
    yield
    # Shutdown: Cleanup
```

## Troubleshooting

### "GITHUB_API_TOKEN not configured" warning

This is expected during initial setup. Create a `.env` file with your GitHub token:

```bash
cd backend
cp .env.example .env
# Edit .env and add your token
```

### CORS errors in browser

Make sure the Creative Studio UI origin is included in `CORS_ORIGINS`:

```bash
# In .env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://your-ui-origin
```

### Port already in use

Change the port in the run command:

```bash
uvicorn backend.feedback_proxy:app --port 8001
```

## Architecture

This service is part of the Feedback & Diagnostics module architecture:

```
Creative Studio UI (React)
    ↓ HTTP POST
Backend Proxy (FastAPI) ← This service
    ↓ GitHub REST API
GitHub Issues
```

The proxy provides:
1. **Security**: Protects GitHub API token
2. **Validation**: Ensures data quality
3. **Rate Limiting**: Prevents abuse
4. **Error Handling**: Graceful degradation

## License

Part of StoryCore-Engine project. See main LICENSE file.
