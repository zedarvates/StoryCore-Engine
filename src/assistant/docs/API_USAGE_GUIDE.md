# API Usage Guide

## Overview

This guide provides practical examples and workflows for using the StoryCore AI Assistant API. 
Whether you're building a web application, desktop tool, or automation script, this guide will 
help you integrate with the API effectively.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Common Workflows](#common-workflows)
3. [Language-Specific Examples](#language-specific-examples)
4. [Advanced Usage](#advanced-usage)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)

---

## Quick Start

### Prerequisites

- API endpoint URL (e.g., `http://localhost:8000/api/v1`)
- Valid user credentials
- HTTP client library (requests, fetch, axios, etc.)

### Basic Workflow

```
1. Authenticate → Get access token
2. Generate project → Get preview
3. Finalize project → Save to disk
4. Manage project → Open, modify, close
```

### 5-Minute Example (Python)

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# 1. Login
response = requests.post(f"{BASE_URL}/auth/login", json={
    "username": "user@example.com",
    "password": "password"
})
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Generate project
response = requests.post(f"{BASE_URL}/generate/project", headers=headers, json={
    "prompt": "Create a mystery thriller in a haunted mansion"
})
preview = response.json()
print(f"Generated: {preview['project_name']}")

# 3. Finalize
response = requests.post(f"{BASE_URL}/generate/finalize", headers=headers, json={
    "preview_id": preview["preview_id"]
})
print(f"Saved to: {response.json()['project_path']}")
```

---

## Common Workflows

### Workflow 1: Create and Customize Project


**Goal**: Generate a project, review it, make modifications, and save.

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"
headers = {"Authorization": f"Bearer {access_token}"}

# Step 1: Generate project
gen_response = requests.post(f"{BASE_URL}/generate/project", headers=headers, json={
    "prompt": "A sci-fi adventure about space explorers discovering an ancient alien civilization",
    "language": "en",
    "preferences": {
        "sceneCount": 8,
        "style": "cinematic and epic"
    }
})
preview = gen_response.json()

# Step 2: Review generated content
print(f"Project: {preview['project_name']}")
print(f"Scenes: {len(preview['scenes'])}")
print(f"Characters: {len(preview['characters'])}")

for scene in preview['scenes']:
    print(f"  Scene {scene['number']}: {scene['title']}")

# Step 3: Finalize project
finalize_response = requests.post(f"{BASE_URL}/generate/finalize", headers=headers, json={
    "preview_id": preview["preview_id"]
})
project_info = finalize_response.json()

# Step 4: Open project for modifications
open_response = requests.post(f"{BASE_URL}/projects/open", headers=headers, json={
    "project_name": project_info["project_name"]
})

# Step 5: Modify a scene
modify_response = requests.patch(
    f"{BASE_URL}/projects/{project_info['project_name']}/scenes/scene_1",
    headers=headers,
    json={
        "description": "Enhanced opening scene with more dramatic tension",
        "duration": 20.0
    }
)

# Step 6: Close and save
close_response = requests.post(f"{BASE_URL}/projects/close", headers=headers, json={
    "save": True
})

print("Project created and customized successfully!")
```

### Workflow 2: Batch Project Generation

**Goal**: Generate multiple projects from a list of prompts.

```python
import requests
import time

BASE_URL = "http://localhost:8000/api/v1"
headers = {"Authorization": f"Bearer {access_token}"}

prompts = [
    "A romantic comedy set in Paris",
    "A horror film in an abandoned hospital",
    "An action thriller with car chases",
    "A fantasy adventure with dragons"
]

generated_projects = []

for i, prompt in enumerate(prompts):
    print(f"Generating project {i+1}/{len(prompts)}: {prompt}")
    
    # Generate
    response = requests.post(f"{BASE_URL}/generate/project", headers=headers, json={
        "prompt": prompt,
        "language": "en"
    })
    
    if response.ok:
        preview = response.json()
        
        # Finalize
        finalize_response = requests.post(f"{BASE_URL}/generate/finalize", headers=headers, json={
            "preview_id": preview["preview_id"]
        })
        
        if finalize_response.ok:
            project = finalize_response.json()
            generated_projects.append(project)
            print(f"  ✓ Created: {project['project_name']}")
        else:
            print(f"  ✗ Failed to finalize")
    else:
        print(f"  ✗ Failed to generate")
    
    # Respect rate limits
    time.sleep(1)

print(f"\nGenerated {len(generated_projects)} projects successfully!")
```

### Workflow 3: Project Modification Pipeline

**Goal**: Open a project, make multiple modifications, and save.

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"
headers = {"Authorization": f"Bearer {access_token}"}

project_name = "my-project"

# Open project
requests.post(f"{BASE_URL}/projects/open", headers=headers, json={
    "project_name": project_name
})

# Modification 1: Update scene
requests.patch(
    f"{BASE_URL}/projects/{project_name}/scenes/scene_1",
    headers=headers,
    json={"duration": 25.0, "description": "Updated scene"}
)

# Modification 2: Update character
requests.patch(
    f"{BASE_URL}/projects/{project_name}/characters/char_1",
    headers=headers,
    json={"appearance": "Updated appearance description"}
)

# Modification 3: Add new scene
requests.post(
    f"{BASE_URL}/projects/{project_name}/scenes",
    headers=headers,
    json={
        "id": "scene_new",
        "number": 99,
        "title": "New Scene",
        "description": "A new scene added to the project",
        "location": "New location",
        "time_of_day": "day",
        "duration": 15.0,
        "characters": ["char_1"],
        "key_actions": ["action1"]
    }
)

# Close and save
requests.post(f"{BASE_URL}/projects/close", headers=headers, json={
    "save": True
})

print("Modifications complete!")
```

---

## Language-Specific Examples

### Python with Requests

```python
import requests
from typing import Dict, Any, Optional

class StoryCoreClient:
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.login(username, password)
    
    def login(self, username: str, password: str) -> bool:
        response = requests.post(f"{self.base_url}/auth/login", json={
            "username": username,
            "password": password
        })
        if response.ok:
            self.token = response.json()["access_token"]
            return True
        return False
    
    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}
    
    def generate_project(self, prompt: str, **preferences) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/generate/project",
            headers=self._headers(),
            json={"prompt": prompt, "preferences": preferences}
        )
        response.raise_for_status()
        return response.json()
    
    def finalize_project(self, preview_id: str) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/generate/finalize",
            headers=self._headers(),
            json={"preview_id": preview_id}
        )
        response.raise_for_status()
        return response.json()
    
    def list_projects(self) -> list:
        response = requests.get(
            f"{self.base_url}/projects/list",
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()["projects"]

# Usage
client = StoryCoreClient("http://localhost:8000/api/v1", "user@example.com", "password")
preview = client.generate_project("A mystery thriller")
project = client.finalize_project(preview["preview_id"])
projects = client.list_projects()
```

### JavaScript/TypeScript with Fetch

```typescript
class StoryCoreClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async login(username: string, password: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const data = await response.json();
      this.token = data.access_token;
      return true;
    }
    return false;
  }

  private getHeaders(): Record<string, string> {
    if (!this.token) throw new Error("Not authenticated");
    return {
      "Authorization": `Bearer ${this.token}`,
      "Content-Type": "application/json"
    };
  }

  async generateProject(prompt: string, preferences?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/generate/project`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ prompt, preferences })
    });

    if (!response.ok) throw new Error("Generation failed");
    return await response.json();
  }

  async finalizeProject(previewId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/generate/finalize`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ preview_id: previewId })
    });

    if (!response.ok) throw new Error("Finalization failed");
    return await response.json();
  }

  async listProjects(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/projects/list`, {
      method: "GET",
      headers: this.getHeaders()
    });

    if (!response.ok) throw new Error("List failed");
    const data = await response.json();
    return data.projects;
  }
}

// Usage
const client = new StoryCoreClient("http://localhost:8000/api/v1");
await client.login("user@example.com", "password");
const preview = await client.generateProject("A sci-fi adventure");
const project = await client.finalizeProject(preview.preview_id);
const projects = await client.listProjects();
```

### cURL Examples

```bash
# Set variables
BASE_URL="http://localhost:8000/api/v1"
USERNAME="user@example.com"
PASSWORD="password"

# Login
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.access_token')

# Generate project
PREVIEW=$(curl -s -X POST "$BASE_URL/generate/project" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A mystery thriller","language":"en"}')

PREVIEW_ID=$(echo $PREVIEW | jq -r '.preview_id')
echo "Preview ID: $PREVIEW_ID"

# Finalize project
PROJECT=$(curl -s -X POST "$BASE_URL/generate/finalize" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"preview_id\":\"$PREVIEW_ID\"}")

PROJECT_NAME=$(echo $PROJECT | jq -r '.project_name')
echo "Project created: $PROJECT_NAME"

# List projects
curl -X GET "$BASE_URL/projects/list" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Advanced Usage

### Concurrent Requests with Rate Limiting

```python
import requests
import concurrent.futures
import time
from typing import List, Dict, Any

class RateLimitedExecutor:
    def __init__(self, max_workers: int = 5, requests_per_minute: int = 90):
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=max_workers)
        self.requests_per_minute = requests_per_minute
        self.request_times: List[float] = []
    
    def _wait_if_needed(self):
        current_time = time.time()
        # Remove requests older than 60 seconds
        self.request_times = [t for t in self.request_times if current_time - t < 60]
        
        # If at limit, wait
        if len(self.request_times) >= self.requests_per_minute:
            oldest = min(self.request_times)
            wait_time = 60 - (current_time - oldest) + 0.1
            if wait_time > 0:
                time.sleep(wait_time)
    
    def submit(self, fn, *args, **kwargs):
        self._wait_if_needed()
        self.request_times.append(time.time())
        return self.executor.submit(fn, *args, **kwargs)
    
    def map(self, fn, *iterables):
        futures = []
        for args in zip(*iterables):
            future = self.submit(fn, *args)
            futures.append(future)
        
        return [f.result() for f in concurrent.futures.as_completed(futures)]

# Usage
def generate_project(prompt: str, headers: Dict[str, str]) -> Dict[str, Any]:
    response = requests.post(
        f"{BASE_URL}/generate/project",
        headers=headers,
        json={"prompt": prompt}
    )
    return response.json()

executor = RateLimitedExecutor(max_workers=5, requests_per_minute=90)

prompts = ["Prompt 1", "Prompt 2", "Prompt 3", ...]
results = executor.map(lambda p: generate_project(p, headers), prompts)
```

### Streaming Progress Updates

```python
import requests
import json

def generate_with_progress(prompt: str, headers: Dict[str, str]):
    # Note: This requires server-side support for streaming
    response = requests.post(
        f"{BASE_URL}/generate/project/stream",
        headers=headers,
        json={"prompt": prompt},
        stream=True
    )
    
    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            if data.get("type") == "progress":
                print(f"Progress: {data['percent']}% - {data['message']}")
            elif data.get("type") == "complete":
                return data["result"]
```

### Retry Logic with Exponential Backoff

```python
import time
import requests
from typing import Callable, Any

def retry_with_backoff(
    func: Callable,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0
) -> Any:
    for attempt in range(max_retries):
        try:
            return func()
        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:
                raise
            
            # Calculate backoff
            delay = min(base_delay * (2 ** attempt), max_delay)
            print(f"Request failed, retrying in {delay}s... (attempt {attempt + 1}/{max_retries})")
            time.sleep(delay)

# Usage
result = retry_with_backoff(
    lambda: requests.post(url, headers=headers, json=data).json()
)
```

---

## Error Handling

### Comprehensive Error Handler

```python
import requests
from typing import Dict, Any

class APIError(Exception):
    def __init__(self, status_code: int, error_data: Dict[str, Any]):
        self.status_code = status_code
        self.code = error_data.get("code", "UNKNOWN")
        self.message = error_data.get("message", "Unknown error")
        self.details = error_data.get("details", {})
        self.suggested_action = error_data.get("suggested_action")
        super().__init__(self.message)

def make_request(method: str, url: str, **kwargs) -> Dict[str, Any]:
    try:
        response = requests.request(method, url, **kwargs)
        
        if not response.ok:
            error_data = response.json().get("error", {})
            raise APIError(response.status_code, error_data)
        
        return response.json()
    
    except requests.exceptions.ConnectionError:
        raise APIError(0, {
            "code": "CONNECTION_ERROR",
            "message": "Could not connect to API server",
            "suggested_action": "Check that the server is running and accessible"
        })
    
    except requests.exceptions.Timeout:
        raise APIError(0, {
            "code": "TIMEOUT",
            "message": "Request timed out",
            "suggested_action": "Try again or increase timeout"
        })

# Usage
try:
    result = make_request("POST", f"{BASE_URL}/generate/project", 
                         headers=headers, json={"prompt": "..."})
except APIError as e:
    print(f"Error {e.status_code}: {e.code}")
    print(f"Message: {e.message}")
    if e.suggested_action:
        print(f"Suggestion: {e.suggested_action}")
    if e.details:
        print(f"Details: {e.details}")
```

---

## Performance Optimization

### Connection Pooling

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Create session with connection pooling
session = requests.Session()

# Configure retries
retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504]
)

adapter = HTTPAdapter(
    max_retries=retry_strategy,
    pool_connections=10,
    pool_maxsize=20
)

session.mount("http://", adapter)
session.mount("https://", adapter)

# Use session for all requests
response = session.post(url, headers=headers, json=data)
```

### Response Caching

```python
import time
from typing import Dict, Any, Optional, Tuple

class ResponseCache:
    def __init__(self, ttl: int = 300):
        self.cache: Dict[str, Tuple[Any, float]] = {}
        self.ttl = ttl
    
    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            data, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return data
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any):
        self.cache[key] = (value, time.time())
    
    def clear(self):
        self.cache.clear()

# Usage
cache = ResponseCache(ttl=300)  # 5 minutes

def get_projects_cached(headers: Dict[str, str]) -> list:
    cache_key = "projects_list"
    cached = cache.get(cache_key)
    
    if cached:
        print("Using cached response")
        return cached
    
    response = requests.get(f"{BASE_URL}/projects/list", headers=headers)
    projects = response.json()["projects"]
    
    cache.set(cache_key, projects)
    return projects
```

### Batch Operations

```python
def batch_modify_scenes(
    project_name: str,
    scene_updates: List[Dict[str, Any]],
    headers: Dict[str, str],
    batch_size: int = 10
):
    """Modify multiple scenes in batches"""
    for i in range(0, len(scene_updates), batch_size):
        batch = scene_updates[i:i + batch_size]
        
        for update in batch:
            scene_id = update.pop("id")
            requests.patch(
                f"{BASE_URL}/projects/{project_name}/scenes/{scene_id}",
                headers=headers,
                json=update
            )
        
        # Small delay between batches
        if i + batch_size < len(scene_updates):
            time.sleep(0.5)
```

---

## Additional Resources

- [Complete API Documentation](./API_DOCUMENTATION.md)
- [Authentication Guide](./AUTHENTICATION_GUIDE.md)
- [Rate Limiting Guide](./RATE_LIMITING_GUIDE.md)
- [OpenAPI Specification](http://localhost:8000/api/docs)
