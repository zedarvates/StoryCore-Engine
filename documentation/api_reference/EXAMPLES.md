# Exemples d'Utilisation de l'API - StoryCore

Ce document fournit des exemples concrets d'utilisation de l'API StoryCore dans différents langages et scénarios.

## Table des Matières

- [Python](#python)
- [JavaScript/Node.js](#javascriptnodejs)
- [cURL](#curl)
- [Scénarios Courants](#scénarios-courants)
- [Intégrations Tierces](#intégrations-tierces)

---

## Python

### Installation des Dépendances

```bash
pip install requests python-dotenv
```

### Configuration

```python
# config.py
import os
from dotenv import load_dotenv

load_dotenv()

class StoryCoreConfig:
    BASE_URL = os.getenv('STORYCORE_BASE_URL', 'https://api.storycore.io')
    API_KEY = os.getenv('STORYCORE_API_KEY')
    TIMEOUT = int(os.getenv('STORYCORE_TIMEOUT', 30))
```

### Client de Base

```python
# client.py
import requests
from config import StoryCoreConfig

class StoryCoreClient:
    def __init__(self, api_key=None, base_url=None):
        self.api_key = api_key or StoryCoreConfig.API_KEY
        self.base_url = base_url or StoryCoreConfig.BASE_URL
        self.timeout = StoryCoreConfig.TIMEOUT
        
        if not self.api_key:
            raise ValueError("API key is required")
    
    def _make_request(self, method, endpoint, data=None, params=None):
        url = f"{self.base_url}{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {e}")

# Initialisation
client = StoryCoreClient()
```

### Authentification

```python
# auth.py
from client import StoryCoreClient

def login(email, password):
    client = StoryCoreClient()
    data = {
        'email': email,
        'password': password
    }
    result = client._make_request('POST', '/api/auth/login', data)
    return result

def refresh_token(refresh_token):
    client = StoryCoreClient()
    data = {
        'refresh_token': refresh_token
    }
    result = client._make_request('POST', '/api/auth/refresh', data)
    return result

# Exemple d'utilisation
try:
    auth_result = login('user@example.com', 'password123')
    print(f"Access token: {auth_result['access_token']}")
except Exception as e:
    print(f"Login failed: {e}")
```

### Gestion des Projets

```python
# projects.py
from client import StoryCoreClient

class ProjectManager:
    def __init__(self, client):
        self.client = client
    
    def list_projects(self, page=1, limit=10, status=None):
        params = {
            'page': page,
            'limit': limit
        }
        if status:
            params['status'] = status
        
        return self.client._make_request('GET', '/api/projects', params=params)
    
    def create_project(self, name, description=None, settings=None):
        data = {
            'name': name,
            'description': description,
            'settings': settings or {}
        }
        return self.client._make_request('POST', '/api/projects', data)
    
    def get_project(self, project_id):
        return self.client._make_request('GET', f'/api/projects/{project_id}')
    
    def update_project(self, project_id, **kwargs):
        return self.client._make_request('PUT', f'/api/projects/{project_id}', data=kwargs)
    
    def delete_project(self, project_id):
        return self.client._make_request('DELETE', f'/api/projects/{project_id}')

# Exemple d'utilisation
client = StoryCoreClient()
project_manager = ProjectManager(client)

# Créer un projet
project = project_manager.create_project(
    name="Mon Projet Video",
    description="Un projet de test",
    settings={
        'resolution': '1920x1080',
        'framerate': 30,
        'duration': 120
    }
)
print(f"Projet créé: {project['id']}")

# Lister les projets
projects = project_manager.list_projects()
print(f"Total projets: {projects['pagination']['total']}")

# Mettre à jour un projet
project_manager.update_project(
    project['id'],
    name="Mon Projet Video Mis à Jour"
)
```

### Traitement Vidéo

```python
# video_processing.py
from client import StoryCoreClient

class VideoProcessor:
    def __init__(self, client):
        self.client = client
    
    def upload_video(self, file_path, name=None, description=None):
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {
                'type': 'video',
                'name': name or file_path,
                'description': description
            }
            
            headers = {
                'Authorization': f'Bearer {self.client.api_key}'
            }
            
            response = requests.post(
                f"{self.client.base_url}/api/assets/upload",
                files=files,
                data=data,
                headers=headers
            )
            response.raise_for_status()
            return response.json()
    
    def process_video(self, input_asset_id, output_settings=None):
        data = {
            'type': 'video_processing',
            'parameters': {
                'input': input_asset_id,
                'output_settings': output_settings or {
                    'quality': 'high',
                    'format': 'mp4',
                    'codec': 'h264'
                }
            }
        }
        return self.client._make_request('POST', '/api/jobs', data)
    
    def get_job_status(self, job_id):
        return self.client._make_request('GET', f'/api/jobs/{job_id}')

# Exemple d'utilisation
processor = VideoProcessor(client)

# Uploader une vidéo
video_asset = processor.upload_video(
    '/path/to/video.mp4',
    name='Ma Video',
    description='Une vidéo de test'
)
print(f"Video uploadée: {video_asset['id']}")

# Traiter la vidéo
job = processor.process_video(
    video_asset['id'],
    output_settings={
        'quality': 'high',
        'format': 'mp4',
        'resolution': '1920x1080'
    }
)
print(f"Job créé: {job['id']}")

# Vérifier le statut du job
import time
while True:
    status = processor.get_job_status(job['id'])
    if status['status'] in ['completed', 'failed']:
        print(f"Job terminé avec statut: {status['status']}")
        break
    time.sleep(5)
```

---

## JavaScript/Node.js

### Installation des Dépendances

```bash
npm install axios dotenv
```

### Configuration

```javascript
// config.js
require('dotenv').config();

module.exports = {
  BASE_URL: process.env.STORYCORE_BASE_URL || 'https://api.storycore.io',
  API_KEY: process.env.STORYCORE_API_KEY,
  TIMEOUT: parseInt(process.env.STORYCORE_TIMEOUT || 30)
};
```

### Client de Base

```javascript
// client.js
const axios = require('axios');
const config = require('./config');

class StoryCoreClient {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey || config.API_KEY;
    this.baseUrl = baseUrl || config.BASE_URL;
    this.timeout = config.TIMEOUT;
    
    if (!this.apiKey) {
      throw new Error('API key is required');
    }
    
    this.axios = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  async makeRequest(method, endpoint, data = null, params = null) {
    try {
      const response = await this.axios.request({
        method,
        url: endpoint,
        data,
        params
      });
      return response.data;
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }
}

module.exports = StoryCoreClient;
```

### Authentification

```javascript
// auth.js
const StoryCoreClient = require('./client');

async function login(email, password) {
  const client = new StoryCoreClient();
  const data = {
    email,
    password
  };
  
  return await client.makeRequest('POST', '/api/auth/login', data);
}

async function refreshToken(refreshToken) {
  const client = new StoryCoreClient();
  const data = {
    refresh_token: refreshToken
  };
  
  return await client.makeRequest('POST', '/api/auth/refresh', data);
}

// Exemple d'utilisation
async function example() {
  try {
    const authResult = await login('user@example.com', 'password123');
    console.log('Access token:', authResult.access_token);
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}

example();
```

### Gestion des Projets

```javascript
// projects.js
const StoryCoreClient = require('./client');

class ProjectManager {
  constructor(client) {
    this.client = client;
  }
  
  async listProjects(page = 1, limit = 10, status = null) {
    const params = { page, limit };
    if (status) params.status = status;
    
    return await this.client.makeRequest('GET', '/api/projects', null, params);
  }
  
  async createProject(name, description = null, settings = {}) {
    const data = {
      name,
      description,
      settings
    };
    
    return await this.client.makeRequest('POST', '/api/projects', data);
  }
  
  async getProject(projectId) {
    return await this.client.makeRequest('GET', `/api/projects/${projectId}`);
  }
  
  async updateProject(projectId, updates) {
    return await this.client.makeRequest('PUT', `/api/projects/${projectId}`, updates);
  }
  
  async deleteProject(projectId) {
    return await this.client.makeRequest('DELETE', `/api/projects/${projectId}`);
  }
}

// Exemple d'utilisation
async function example() {
  const client = new StoryCoreClient();
  const projectManager = new ProjectManager(client);
  
  try {
    // Créer un projet
    const project = await projectManager.createProject(
      'Mon Projet Video',
      'Un projet de test',
      {
        resolution: '1920x1080',
        framerate: 30,
        duration: 120
      }
    );
    console.log('Projet créé:', project.id);
    
    // Lister les projets
    const projects = await projectManager.listProjects();
    console.log('Total projets:', projects.pagination.total);
    
    // Mettre à jour un projet
    await projectManager.updateProject(project.id, {
      name: 'Mon Projet Video Mis à Jour'
    });
    
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

example();
```

---

## cURL

### Authentification

```bash
# Login
curl -X POST https://api.storycore.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Response:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "expires_in": 3600,
#   "token_type": "Bearer"
# }
```

### Gestion des Projets

```bash
# Créer un projet
curl -X POST https://api.storycore.io/api/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Projet Video",
    "description": "Un projet de test",
    "settings": {
      "resolution": "1920x1080",
      "framerate": 30,
      "duration": 120
    }
  }'

# Lister les projets
curl -X GET "https://api.storycore.io/api/projects?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Mettre à jour un projet
curl -X PUT https://api.storycore.io/api/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Projet Video Mis à Jour"
  }'

# Supprimer un projet
curl -X DELETE https://api.storycore.io/api/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Traitement Vidéo

```bash
# Uploader une vidéo
curl -X POST https://api.storycore.io/api/assets/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/video.mp4" \
  -F "type=video" \
  -F "name=Ma Video" \
  -F "description=Une vidéo de test"

# Response:
# {
#   "id": "asset_123",
#   "name": "Ma Video",
#   "type": "video",
#   "size": 10485760,
#   "url": "https://storage.storycore.io/assets/asset_123.mp4"
# }

# Traiter la vidéo
curl -X POST https://api.storycore.io/api/jobs \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "video_processing",
    "parameters": {
      "input": "asset_123",
      "output_settings": {
        "quality": "high",
        "format": "mp4",
        "resolution": "1920x1080"
      }
    }
  }'

# Vérifier le statut du job
curl -X GET https://api.storycore.io/api/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Scénarios Courants

### Workflow de Création de Projet Complet

```python
# complete_workflow.py
from client import StoryCoreClient
from projects import ProjectManager
from video_processing import VideoProcessor

async def complete_workflow():
    # Initialisation
    client = StoryCoreClient()
    project_manager = ProjectManager(client)
    video_processor = VideoProcessor(client)
    
    try:
        # 1. Créer un projet
        project = project_manager.create_project(
            name="Projet Marketing",
            description="Voir de marketing pour produit X",
            settings={
                'resolution': '1920x1080',
                'framerate': 30,
                'duration': 60
            }
        )
        
        # 2. Uploader des vidéos
        video1 = video_processor.upload_video(
            '/path/to/product_demo.mp4',
            name='Démonstration produit',
            description='Video de démonstration du produit'
        )
        
        video2 = video_processor.upload_video(
            '/path/to/testimonial.mp4',
            name='Témoignage client',
            description='Témoignage de satisfaction client'
        )
        
        # 3. Traiter les vidéos
        job1 = video_processor.process_video(
            video1['id'],
            output_settings={
                'quality': 'high',
                'format': 'mp4',
                'resolution': '1920x1080'
            }
        )
        
        job2 = video_processor.process_video(
            video2['id'],
            output_settings={
                'quality': 'high',
                'format': 'mp4',
                'resolution': '1920x1080'
            }
        )
        
        # 4. Attendre la fin du traitement
        import time
        for job_id in [job1['id'], job2['id']]:
            while True:
                status = video_processor.get_job_status(job_id)
                if status['status'] in ['completed', 'failed']:
                    break
                time.sleep(5)
        
        # 5. Mettre à jour le projet
        project_manager.update_project(
            project['id'],
            status='completed',
            metadata={
                'processed_videos': 2,
                'total_duration': 120
            }
        )
        
        print("Workflow complété avec succès!")
        
    except Exception as e:
        print(f"Erreur dans le workflow: {e}")

# Exécution
complete_workflow()
```

### Batch Processing

```python
# batch_processing.py
from client import StoryCoreClient
from video_processing import VideoProcessor

def batch_process_videos(video_paths, output_settings=None):
    client = StoryCoreClient()
    processor = VideoProcessor(client)
    
    results = []
    
    for video_path in video_paths:
        try:
            # Uploader la vidéo
            asset = processor.upload_video(video_path)
            
            # Traiter la vidéo
            job = processor.process_video(
                asset['id'],
                output_settings=output_settings
            )
            
            results.append({
                'video_path': video_path,
                'asset_id': asset['id'],
                'job_id': job['id'],
                'status': 'processing'
            })
            
        except Exception as e:
            results.append({
                'video_path': video_path,
                'error': str(e),
                'status': 'failed'
            })
    
    return results

# Exemple d'utilisation
video_files = [
    '/path/to/video1.mp4',
    '/path/to/video2.mp4',
    '/path/to/video3.mp4'
]

output_settings = {
    'quality': 'high',
    'format': 'mp4',
    'resolution': '1920x1080'
}

results = batch_process_videos(video_files, output_settings)
for result in results:
    print(f"Video: {result['video_path']}")
    print(f"Status: {result['status']}")
    if 'asset_id' in result:
        print(f"Asset ID: {result['asset_id']}")
    if 'error' in result:
        print(f"Error: {result['error']}")
    print()
```

---

## Intégrations Tierces

### Slack Integration

```python
# slack_integration.py
import requests
from client import StoryCoreClient

class SlackNotifier:
    def __init__(self, webhook_url):
        self.webhook_url = webhook_url
    
    def send_notification(self, message, attachments=None):
        payload = {
            'text': message,
            'attachments': attachments or []
        }
        
        response = requests.post(self.webhook_url, json=payload)
        response.raise_for_status()
    
    def notify_project_created(self, project):
        message = f"Nouveau projet créé: {project['name']}"
        attachments = [{
            'color': 'good',
            'fields': [
                {
                    'title': 'ID',
                    'value': project['id'],
                    'short': True
                },
                {
                    'title': 'Statut',
                    'value': project['status'],
                    'short': True
                }
            ]
        }]
        
        self.send_notification(message, attachments)

# Exemple d'utilisation
slack_notifier = SlackNotifier('https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK')

client = StoryCoreClient()
project_manager = ProjectManager(client)

# Créer un projet et notifier
project = project_manager.create_project(
    name="Projet Urgent",
    description="Projet avec deadline serrée"
)
slack_notifier.notify_project_created(project)
```

### Webhook Handler

```python
# webhook_handler.py
from flask import Flask, request, jsonify
from client import StoryCoreClient
from projects import ProjectManager

app = Flask(__name__)

# Configuration
client = StoryCoreClient()
project_manager = ProjectManager(client)

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    data = request.json
    
    # Vérifier la signature du webhook
    signature = request.headers.get('X-StoryCore-Signature')
    if not verify_signature(data, signature):
        return jsonify({'error': 'Invalid signature'}), 401
    
    # Traiter l'événement
    event_type = data.get('event')
    
    if event_type == 'job.completed':
        handle_job_completed(data)
    elif event_type == 'project.created':
        handle_project_created(data)
    elif event_type == 'project.updated':
        handle_project_updated(data)
    
    return jsonify({'status': 'ok'}), 200

def handle_job_completed(data):
    job_id = data.get('job_id')
    project_id = data.get('project_id')
    
    # Mettre à jour le statut du projet
    project_manager.update_project(project_id, status='completed')
    
    print(f"Job {job_id} complété pour le projet {project_id}")

def handle_project_created(data):
    project_id = data.get('project_id')
    project = project_manager.get_project(project_id)
    
    print(f"Nouveau projet créé: {project['name']}")

if __name__ == '__main__':
    app.run(port=5000)
```

---

*Pour plus d'informations sur l'API, consultez [OVERVIEW.md](OVERVIEW.md) et [ENDPOINTS.md](ENDPOINTS.md).*