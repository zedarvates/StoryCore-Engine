# StoryCore Complete API System - Usage Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Making API Calls](#making-api-calls)
4. [API Categories](#api-categories)
5. [Error Handling](#error-handling)
6. [Async Operations](#async-operations)
7. [Best Practices](#best-practices)
8. [Code Examples](#code-examples)

---

## Getting Started

The StoryCore Complete API System provides 113 endpoints across 14 categories for comprehensive multimodal content creation.

### Quick Start

```python
from src.api.router import APIRouter
from src.api.config import APIConfig

# Initialize API
config = APIConfig()
router = APIRouter(config)

# Make a simple API call
response = router.route_request(
    path="storycore.narration.generate",
    method="POST",
    params={"prompt": "Generate a story about..."},
    context=request_context
)

print(response.data)
```

---

## Authentication

### API Key Authentication

```python
# Set authentication in request context
context = RequestContext(
    user=User(id="user123", api_key="your-api-key"),
    request_id="req_abc123"
)

# Make authenticated request
response = router.route_request(
    path="storycore.narration.generate",
    method="POST",
    params={"prompt": "..."},
    context=context
)
```

### Token-Based Authentication

```python
# Validate token
auth_response = router.route_request(
    path="storycore.security.auth.validate",
    method="POST",
    params={"token": "your-token"},
    context=context
)

if auth_response.status == "success":
    # Token is valid
    user = auth_response.data["user"]
```

---

## Making API Calls

### Basic Request Structure

All API calls follow this structure:

```python
response = router.route_request(
    path="storycore.category.action",  # Endpoint path
    method="POST",                      # HTTP method
    params={...},                       # Request parameters
    context=request_context             # Request context
)
```

### Response Structure

All responses follow this format:

```json
{
  "status": "success",
  "data": {
    "result": "..."
  },
  "metadata": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z",
    "duration_ms": 45.2,
    "api_version": "v1"
  }
}
```

---

## API Categories

### 1. Narration and LLM (18 endpoints)

Generate and analyze narrative content using LLM services.

**Key Endpoints:**
- `storycore.narration.generate` - Generate narrative content
- `storycore.narration.analyze` - Analyze story structure
- `storycore.narration.dialogue.generate` - Generate dialogue
- `storycore.narration.character.profile` - Create character profiles

**Example:**
```python
response = router.route_request(
    path="storycore.narration.generate",
    method="POST",
    params={
        "prompt": "Write a story about a space explorer",
        "max_length": 1000,
        "style": "sci-fi"
    },
    context=context
)

story = response.data["content"]
```

### 2. Structure and Pipeline (12 endpoints)

Manage project lifecycle and pipeline execution.

**Key Endpoints:**
- `storycore.pipeline.init` - Initialize new project
- `storycore.pipeline.execute` - Execute pipeline stages
- `storycore.pipeline.status` - Get pipeline status

**Example:**
```python
# Initialize project
init_response = router.route_request(
    path="storycore.pipeline.init",
    method="POST",
    params={
        "project_name": "my-project",
        "path": "/path/to/project"
    },
    context=context
)

# Execute pipeline
exec_response = router.route_request(
    path="storycore.pipeline.execute",
    method="POST",
    params={
        "project_name": "my-project",
        "stages": ["grid", "promote", "qa"]
    },
    context=context
)

task_id = exec_response.data["task_id"]
```

### 3. Memory and Context (8 endpoints)

Store and retrieve persistent data and context.

**Key Endpoints:**
- `storycore.memory.store` - Store key-value data
- `storycore.memory.retrieve` - Retrieve stored data
- `storycore.context.push` - Push context to stack

**Example:**
```python
# Store data
router.route_request(
    path="storycore.memory.store",
    method="POST",
    params={
        "key": "character_name",
        "value": "Alice",
        "project": "my-project"
    },
    context=context
)

# Retrieve data
response = router.route_request(
    path="storycore.memory.retrieve",
    method="POST",
    params={
        "key": "character_name",
        "project": "my-project"
    },
    context=context
)

name = response.data["value"]
```

### 4. Image and Concept Art (8 endpoints)

Generate and manipulate images.

**Key Endpoints:**
- `storycore.image.generate` - Generate images
- `storycore.image.grid.create` - Create master coherence sheet
- `storycore.image.analyze` - Analyze image quality

**Example:**
```python
# Generate image (async)
response = router.route_request(
    path="storycore.image.generate",
    method="POST",
    params={
        "prompt": "A mystical forest at twilight",
        "width": 1024,
        "height": 1024,
        "seed": 42
    },
    context=context
)

task_id = response.data["task_id"]

# Poll for completion
status = poll_task_status(task_id)
image_path = status["result"]["image_path"]
```

### 5. Audio (6 endpoints)

Generate and process audio content.

**Key Endpoints:**
- `storycore.audio.voice.generate` - Generate voice audio
- `storycore.audio.music.generate` - Generate background music
- `storycore.audio.mix` - Mix audio tracks

**Example:**
```python
# Generate voice
response = router.route_request(
    path="storycore.audio.voice.generate",
    method="POST",
    params={
        "text": "Hello, welcome to StoryCore",
        "voice": "en-US-Neural2-A",
        "speed": 1.0
    },
    context=context
)

task_id = response.data["task_id"]
```

### 6. Export and Integration (7 endpoints)

Export projects and integrate with external services.

**Key Endpoints:**
- `storycore.export.package` - Create export package
- `storycore.integration.comfyui.workflow` - Execute ComfyUI workflow
- `storycore.integration.webhook.register` - Register webhook

**Example:**
```python
# Export project
response = router.route_request(
    path="storycore.export.package",
    method="POST",
    params={
        "project_name": "my-project",
        "format": "zip",
        "include_assets": True
    },
    context=context
)

package_path = response.data["package_path"]
```

---

## Error Handling

### Error Response Format

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid parameter: prompt cannot be empty",
    "details": {
      "field": "prompt",
      "constraint": "non_empty"
    },
    "remediation": "Provide a non-empty prompt string"
  },
  "metadata": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z",
    "duration_ms": 5.2,
    "api_version": "v1"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid request parameters
- `AUTHENTICATION_REQUIRED` - Missing or invalid authentication
- `AUTHORIZATION_DENIED` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `TIMEOUT` - Operation exceeded time limit
- `INTERNAL_ERROR` - Server error

### Error Handling Example

```python
try:
    response = router.route_request(
        path="storycore.narration.generate",
        method="POST",
        params={"prompt": ""},  # Invalid empty prompt
        context=context
    )
except ValidationError as e:
    print(f"Validation error: {e.message}")
    print(f"Remediation: {e.remediation}")
except RateLimitError as e:
    print(f"Rate limit exceeded. Retry after: {e.retry_after}")
except APIError as e:
    print(f"API error: {e.code} - {e.message}")
```

---

## Async Operations

### Creating Async Tasks

Long-running operations return a task ID immediately:

```python
# Start async operation
response = router.route_request(
    path="storycore.image.generate",
    method="POST",
    params={"prompt": "..."},
    context=context
)

if response.status == "pending":
    task_id = response.data["task_id"]
    print(f"Task created: {task_id}")
```

### Polling Task Status

```python
import time

def poll_task_status(task_id, timeout=300):
    """Poll task status until completion."""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        response = router.route_request(
            path="storycore.task.status",
            method="POST",
            params={"task_id": task_id},
            context=context
        )
        
        status = response.data["status"]
        
        if status == "completed":
            return response.data["result"]
        elif status == "failed":
            raise Exception(response.data["error"])
        elif status == "cancelled":
            raise Exception("Task was cancelled")
        
        # Wait before polling again
        time.sleep(1)
    
    raise TimeoutError("Task polling timed out")

# Use it
result = poll_task_status(task_id)
```

### Cancelling Tasks

```python
# Cancel running task
response = router.route_request(
    path="storycore.task.cancel",
    method="POST",
    params={"task_id": task_id},
    context=context
)

if response.data["cancelled"]:
    print("Task cancelled successfully")
```

---

## Best Practices

### 1. Use Appropriate Priorities

```python
from src.api.services.task_manager import TaskPriority

# Critical user-facing operations
task_id = task_manager.create_task(
    operation=generate_image,
    params={...},
    priority=TaskPriority.CRITICAL
)

# Background processing
task_id = task_manager.create_task(
    operation=cleanup_old_files,
    params={...},
    priority=TaskPriority.LOW
)
```

### 2. Handle Rate Limits

```python
import time

def make_request_with_retry(path, params, max_retries=3):
    """Make request with automatic retry on rate limit."""
    for attempt in range(max_retries):
        try:
            return router.route_request(path, "POST", params, context)
        except RateLimitError as e:
            if attempt < max_retries - 1:
                time.sleep(e.retry_after)
            else:
                raise
```

### 3. Use Connection Pooling

```python
from src.api.services.comfyui_connection import get_comfyui_pool

# Get connection from pool
pool = get_comfyui_pool()

with pool.get_connection() as conn:
    result = conn.execute("queue_prompt", workflow=my_workflow)
```

### 4. Cache Frequently Accessed Data

```python
from src.api.services.cache import get_cache_service

cache = get_cache_service()

# Check cache first
cached_result = cache.get(f"narration:{prompt_hash}")
if cached_result:
    return cached_result

# Generate and cache
result = generate_narration(prompt)
cache.set(f"narration:{prompt_hash}", result, ttl=300)
```

### 5. Monitor Task Progress

```python
def execute_with_progress(task_id, callback=None):
    """Execute task with progress monitoring."""
    while True:
        status = get_task_status(task_id)
        
        if callback:
            callback(status["progress"])
        
        if status["status"] in ["completed", "failed", "cancelled"]:
            break
        
        time.sleep(1)
    
    return status

# Use it
def progress_callback(progress):
    print(f"Progress: {progress * 100:.1f}%")

result = execute_with_progress(task_id, progress_callback)
```

---

## Code Examples

### Complete Workflow Example

```python
from src.api.router import APIRouter
from src.api.config import APIConfig
from src.api.models import RequestContext, User

# Initialize
config = APIConfig()
router = APIRouter(config)
context = RequestContext(user=User(id="user123"))

# 1. Initialize project
init_response = router.route_request(
    path="storycore.pipeline.init",
    method="POST",
    params={
        "project_name": "my-story",
        "path": "/projects/my-story"
    },
    context=context
)

# 2. Generate narrative
narration_response = router.route_request(
    path="storycore.narration.generate",
    method="POST",
    params={
        "prompt": "A hero's journey in a fantasy world",
        "length": 2000
    },
    context=context
)

story = narration_response.data["content"]

# 3. Create character profiles
character_response = router.route_request(
    path="storycore.narration.character.profile",
    method="POST",
    params={
        "text": story,
        "num_characters": 3
    },
    context=context
)

characters = character_response.data["characters"]

# 4. Generate images for characters
image_tasks = []
for character in characters:
    response = router.route_request(
        path="storycore.image.generate",
        method="POST",
        params={
            "prompt": f"Portrait of {character['description']}",
            "width": 512,
            "height": 512
        },
        context=context
    )
    image_tasks.append(response.data["task_id"])

# 5. Wait for image generation
images = []
for task_id in image_tasks:
    result = poll_task_status(task_id)
    images.append(result["image_path"])

# 6. Create storyboard
storyboard_response = router.route_request(
    path="storycore.storyboard.create",
    method="POST",
    params={
        "project_name": "my-story",
        "scenes": extract_scenes(story)
    },
    context=context
)

# 7. Export project
export_response = router.route_request(
    path="storycore.export.package",
    method="POST",
    params={
        "project_name": "my-story",
        "format": "zip"
    },
    context=context
)

package_path = export_response.data["package_path"]
print(f"Project exported to: {package_path}")
```

---

## Additional Resources

- **API Reference:** See `src/api/openapi_generator.py` for complete API specification
- **Code Examples:** See `src/api/code_examples_generator.py` for more examples
- **Changelog:** See `src/api/CHANGELOG.md` for API changes
- **Connection Pooling:** See `src/api/CONNECTION_POOLING_GUIDE.md`
- **Caching:** See `src/api/CACHING_GUIDE.md`

---

## Support

For issues or questions:
1. Check the error message and remediation hint
2. Review the API documentation
3. Check the changelog for recent changes
4. Contact support with request ID for debugging

---

**Version:** v1.0  
**Last Updated:** January 26, 2026
