# Intégrations - StoryCore

Ce document décrit les différentes façons d'intégrer StoryCore avec d'autres systèmes, plateformes et services.

## Vue d'Ensemble

StoryCore offre plusieurs méthodes d'intégration :

- 🔌 **API REST** : Intégration programme complète
- 🎯 **Webhooks** : Notifications événementielles
- 📦 **SDKs** : Kits de développement pour différents langages
- 🔧 **Plugins** : Extensions pour des plateformes spécifiques
- 🔄 **Intégrations Tierces** : Connecteurs pour services populaires

## API REST

### 1. Authentification

#### JWT Tokens

StoryCore utilise JSON Web Tokens (JWT) pour l'authentification.

```python
import requests
import jwt

# Configuration
BASE_URL = "https://api.storycore.io"
API_KEY = "your_api_key"

# Générer un token
def generate_token():
    payload = {
        "sub": "user123",
        "iat": 1704067200,  # 2024-01-01 00:00:00 UTC
        "exp": 1704153600,  # 2024-01-02 00:00:00 UTC
        "permissions": ["read", "write"]
    }
    token = jwt.encode(payload, API_KEY, algorithm="HS256")
    return token

# Utiliser le token
token = generate_token()
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
```

#### OAuth 2.0

```python
# OAuth 2.0 Flow
def oauth_flow():
    # 1. Redirection vers le fournisseur d'identité
    auth_url = f"{BASE_URL}/auth/oauth/authorize?response_type=code&client_id=your_client_id&redirect_uri=your_redirect_uri&scope=openid profile email"
    print(f"Redirigez vers: {auth_url}")
    
    # 2. Échange du code contre un token
    token_data = {
        "grant_type": "authorization_code",
        "code": "authorization_code_from_callback",
        "redirect_uri": "your_redirect_uri",
        "client_id": "your_client_id",
        "client_secret": "your_client_secret"
    }
    
    response = requests.post(f"{BASE_URL}/auth/oauth/token", data=token_data)
    return response.json()
```

### 2. Gestion des Projets

```python
class StoryCoreAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def create_project(self, name, description=None, settings=None):
        """Crée un nouveau projet"""
        data = {
            "name": name,
            "description": description,
            "settings": settings or {}
        }
        
        response = requests.post(
            f"{self.base_url}/api/projects",
            json=data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_project(self, project_id):
        """Récupère un projet par son ID"""
        response = requests.get(
            f"{self.base_url}/api/projects/{project_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def update_project(self, project_id, **kwargs):
        """Met à jour un projet"""
        response = requests.put(
            f"{self.base_url}/api/projects/{project_id}",
            json=kwargs,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def delete_project(self, project_id):
        """Supprime un projet"""
        response = requests.delete(
            f"{self.base_url}/api/projects/{project_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
```

### 3. Traitement des Médias

```python
class MediaProcessor:
    def __init__(self, api_client):
        self.api = api_client
    
    def upload_video(self, file_path, name=None, description=None):
        """Upload une vidéo"""
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {
                'type': 'video',
                'name': name or file_path,
                'description': description
            }
            
            response = requests.post(
                f"{self.api.base_url}/api/assets/upload",
                files=files,
                data=data,
                headers=self.api.headers
            )
            response.raise_for_status()
            return response.json()
    
    def process_video(self, asset_id, output_settings=None):
        """Traite une vidéo"""
        data = {
            "type": "video_processing",
            "parameters": {
                "input": asset_id,
                "output_settings": output_settings or {
                    "quality": "high",
                    "format": "mp4",
                    "resolution": "1920x1080"
                }
            }
        }
        
        response = requests.post(
            f"{self.api.base_url}/api/jobs",
            json=data,
            headers=self.api.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_job_status(self, job_id):
        """Vérifie le statut d'un job"""
        response = requests.get(
            f"{self.api.base_url}/api/jobs/{job_id}",
            headers=self.api.headers
        )
        response.raise_for_status()
        return response.json()
```

## Webhooks

### 1. Configuration des Webhooks

```python
class WebhookManager:
    def __init__(self, api_client):
        self.api = api_client
    
    def create_webhook(self, url, events, secret=None):
        """Crée un webhook"""
        data = {
            "url": url,
            "events": events,
            "secret": secret
        }
        
        response = requests.post(
            f"{self.api.base_url}/api/webhooks",
            json=data,
            headers=self.api.headers
        )
        response.raise_for_status()
        return response.json()
    
    def update_webhook(self, webhook_id, **kwargs):
        """Met à jour un webhook"""
        response = requests.put(
            f"{self.api.base_url}/api/webhooks/{webhook_id}",
            json=kwargs,
            headers=self.api.headers
        )
        response.raise_for_status()
        return response.json()
    
    def delete_webhook(self, webhook_id):
        """Supprime un webhook"""
        response = requests.delete(
            f"{self.api.base_url}/api/webhooks/{webhook_id}",
            headers=self.api.headers
        )
        response.raise_for_status()
        return response.json()
```

### 2. Gestion des Webhooks

```python
from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)

# Configuration
WEBHOOK_SECRET = "your_webhook_secret"

@app.route('/webhook/storycore', methods=['POST'])
def handle_webhook():
    # Vérifier la signature
    signature = request.headers.get('X-StoryCore-Signature')
    if not verify_signature(request.data, signature):
        return jsonify({'error': 'Invalid signature'}), 401
    
    # Traiter l'événement
    event_data = request.json
    event_type = event_data.get('event')
    
    if event_type == 'project.created':
        handle_project_created(event_data)
    elif event_type == 'job.completed':
        handle_job_completed(event_data)
    elif event_type == 'job.failed':
        handle_job_failed(event_data)
    
    return jsonify({'status': 'ok'}), 200

def verify_signature(data, signature):
    """Vérifie la signature du webhook"""
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        data,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

def handle_project_created(data):
    """Gère l'événement project.created"""
    project_id = data.get('project_id')
    project_name = data.get('project_name')
    
    # Logique métier
    print(f"Nouveau projet créé: {project_name} (ID: {project_id})")

def handle_job_completed(data):
    """Gère l'événement job.completed"""
    job_id = data.get('job_id')
    project_id = data.get('project_id')
    result_url = data.get('result_url')
    
    # Logique métier
    print(f"Job complété: {job_id} pour le projet {project_id}")
    print(f"Résultat disponible à: {result_url}")

def handle_job_failed(data):
    """Gère l'événement job.failed"""
    job_id = data.get('job_id')
    project_id = data.get('project_id')
    error_message = data.get('error_message')
    
    # Logique métier
    print(f"Job échoué: {job_id} pour le projet {project_id}")
    print(f"Erreur: {error_message}")
```

## SDKs

### 1. Python SDK

```python
# storycore-python-sdk/storycore/client.py
from .client import StoryCoreClient
from .projects import ProjectManager
from .media import MediaProcessor
from .webhooks import WebhookManager

__all__ = ['StoryCoreClient', 'ProjectManager', 'MediaProcessor', 'WebhookManager']

# storycore-python-sdk/setup.py
from setuptools import setup, find_packages

setup(
    name="storycore-sdk",
    version="3.0.0",
    description="StoryCore Python SDK",
    author="StoryCore Team",
    author_email="sdk@storycore.io",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
        "python-dotenv>=0.19.0"
    ],
    python_requires=">=3.8",
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
)
```

### 2. JavaScript SDK

```javascript
// storycore-js-sdk/src/client.js
class StoryCoreClient {
  constructor(options) {
    this.baseUrl = options.baseUrl || 'https://api.storycore.io';
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 30000;
    
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }
  
  async request(method, endpoint, data = null, params = null) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      method,
      headers: this.headers,
      timeout: this.timeout
    };
    
    if (data) {
      config.data = data;
    }
    
    if (params) {
      config.params = params;
    }
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
  
  async createProject(name, description, settings) {
    return this.request('POST', '/api/projects', {
      name,
      description,
      settings
    });
  }
  
  async getProject(id) {
    return this.request('GET', `/api/projects/${id}`);
  }
  
  async updateProject(id, updates) {
    return this.request('PUT', `/api/projects/${id}`, updates);
  }
  
  async deleteProject(id) {
    return this.request('DELETE', `/api/projects/${id}`);
  }
}

export default StoryCoreClient;
```

### 3. TypeScript SDK

```typescript
// storycore-ts-sdk/src/index.ts
import { ProjectManager } from './project-manager';
import { MediaProcessor } from './media-processor';
import { WebhookManager } from './webhook-manager';

export interface StoryCoreConfig {
  baseUrl?: string;
  apiKey: string;
  timeout?: number;
}

export class StoryCoreSDK {
  private config: StoryCoreConfig;
  private projectManager: ProjectManager;
  private mediaProcessor: MediaProcessor;
  private webhookManager: WebhookManager;
  
  constructor(config: StoryCoreConfig) {
    this.config = {
      baseUrl: config.baseUrl || 'https://api.storycore.io',
      timeout: config.timeout || 30000,
      ...config
    };
    
    this.projectManager = new ProjectManager(this.config);
    this.mediaProcessor = new MediaProcessor(this.config);
    this.webhookManager = new WebhookManager(this.config);
  }
  
  get projects(): ProjectManager {
    return this.projectManager;
  }
  
  get media(): MediaProcessor {
    return this.mediaProcessor;
  }
  
  get webhooks(): WebhookManager {
    return this.webhookManager;
  }
}

export default StoryCoreSDK;
```

## Plugins

### 1. WordPress Plugin

```php
// storycore-wordpress/storycore.php
<?php
/*
Plugin Name: StoryCore Integration
Plugin URI: https://storycore.io
Description: Intégration StoryCore pour WordPress
Version: 1.0.0
Author: StoryCore Team
*/

class StoryCoreWordPress {
    private $api_key;
    private $base_url;
    
    public function __construct() {
        $this->api_key = get_option('storycore_api_key');
        $this->base_url = 'https://api.storycore.io';
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('wp_ajax_storycore_create_project', array($this, 'ajax_create_project'));
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'StoryCore',
            'StoryCore',
            'manage_options',
            'storycore',
            array($this, 'admin_page'),
            'dashicons-video-alt2'
        );
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>StoryCore Integration</h1>
            <p>Intégrez StoryCore avec votre site WordPress.</p>
            
            <form method="post">
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="storycore_api_key">API Key</label>
                        </th>
                        <td>
                            <input type="text" id="storycore_api_key" name="storycore_api_key" 
                                   value="<?php echo esc_attr($this->api_key); ?>" class="regular-text">
                            <p class="description">Votre clé API StoryCore</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('Save Settings'); ?>
            </form>
            
            <div id="storycore-projects">
                <h2>Vos Projets</h2>
                <div class="spinner"></div>
            </div>
        </div>
        <?php
    }
    
    public function ajax_create_project() {
        check_ajax_referer('storycore_nonce');
        
        $title = sanitize_text_field($_POST['title']);
        $content = wpautop(sanitize_textarea_field($_POST['content']));
        
        $response = $this->create_project($title, $content);
        
        wp_send_json($response);
    }
    
    private function create_project($title, $content) {
        $args = array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode(array(
                'name' => $title,
                'description' => $content,
                'settings' => array(
                    'source' => 'wordpress'
                )
            ))
        );
        
        $response = wp_remote_post($this->base_url . '/api/projects', $args);
        
        if (is_wp_error($response)) {
            return array('success' => false, 'message' => $response->get_error_message());
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        return array(
            'success' => true,
            'project' => $body
        );
    }
}

new StoryCoreWordPress();
```

### 2. Adobe Premiere Pro Plugin

```jsx
// storycore-premiere/StoryCorePanel.jsx
function StoryCorePanel(PanelFactory) {
    var panel = PanelFactory.create({
        id: 'com.storycore.panel',
        type: 'dockable',
        defaultSize: { width: 300, height: 400 },
        defaultState: 'undocked',
        visible: true
    });
    
    panel.html = `
        <div class="storycore-panel">
            <h2>StoryCore Integration</h2>
            
            <div class="section">
                <h3>Créer un Projet</h3>
                <input type="text" id="project-name" placeholder="Nom du projet" class="input">
                <button id="create-project" class="button primary">Créer</button>
            </div>
            
            <div class="section">
                <h3>Projets Existants</h3>
                <div id="projects-list"></div>
            </div>
            
            <div class="section">
                <h3>Exporter vers StoryCore</h3>
                <button id="export-project" class="button">Exporter</button>
            </div>
        </div>
    `;
    
    panel.on('create', function() {
        // Initialisation
        this.loadProjects();
        
        // Événements
        document.getElementById('create-project').addEventListener('click', () => {
            this.createProject();
        });
        
        document.getElementById('export-project').addEventListener('click', () => {
            this.exportProject();
        });
    });
    
    panel.loadProjects = function() {
        // Charger les projets depuis l'API
        fetch('https://api.storycore.io/api/projects', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('storycore_api_key')
            }
        })
        .then(response => response.json())
        .then(data => {
            const projectsList = document.getElementById('projects-list');
            projectsList.innerHTML = '';
            
            data.data.forEach(project => {
                const projectElement = document.createElement('div');
                projectElement.className = 'project-item';
                projectElement.innerHTML = `
                    <h4>${project.name}</h4>
                    <p>${project.description}</p>
                    <button class="button small" data-id="${project.id}">Importer</button>
                `;
                projectsList.appendChild(projectElement);
            });
        });
    };
    
    panel.createProject = function() {
        const projectName = document.getElementById('project-name').value;
        
        fetch('https://api.storycore.io/api/projects', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('storycore_api_key'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: projectName,
                description: 'Projet créé depuis Adobe Premiere Pro'
            })
        })
        .then(response => response.json())
        .then(data => {
            alert('Projet créé avec succès!');
            this.loadProjects();
        });
    };
    
    panel.exportProject = function() {
        // Exporter le projet actuel vers StoryCore
        const project = app.project;
        const sequence = project.activeSequence;
        
        // Créer un fichier temporaire
        const tempFile = new File('/tmp/storycore_export.mp4');
        
        // Exporter la séquence
        sequence.exportToMP4(tempFile);
        
        // Uploader vers StoryCore
        const formData = new FormData();
        formData.append('file', tempFile);
        formData.append('name', sequence.name);
        formData.append('type', 'video');
        
        fetch('https://api.storycore.io/api/assets/upload', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('storycore_api_key')
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            alert('Projet exporté avec succès!');
        });
    };
    
    return panel;
}

PanelFactory.register(StoryCorePanel);
```

## Intégrations Tierces

### 1. YouTube Integration

```python
class YouTubeIntegration:
    def __init__(self, api_client):
        self.api = api_client
        self.youtube_api_key = "your_youtube_api_key"
    
    def upload_to_youtube(self, video_path, title, description, tags=None):
        """Upload une vidéo vers YouTube"""
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError
        
        youtube = build('youtube', 'v3', developerKey=self.youtube_api_key)
        
        # Uploader la vidéo
        request = youtube.videos().insert(
            part="snippet,status",
            media_body=MediaFileUpload(video_path, chunksize=1024*1024, resumable=True),
            body={
                "snippet": {
                    "title": title,
                    "description": description,
                    "tags": tags or [],
                    "categoryId": "22"  # Catégorie "People & Blogs"
                },
                "status": {
                    "privacyStatus": "public"
                }
            }
        )
        
        response = request.execute()
        return response
    
    def create_youtube_playlist(self, title, description):
        """Crée une playlist YouTube"""
        from googleapiclient.discovery import build
        
        youtube = build('youtube', 'v3', developerKey=self.youtube_api_key)
        
        request = youtube.playlists().insert(
            part="snippet,status",
            body={
                "snippet": {
                    "title": title,
                    "description": description,
                    "tags": ["storycore", "generated"]
                },
                "status": {
                    "privacyStatus": "public"
                }
            }
        )
        
        response = request.execute()
        return response
```

### 2. Slack Integration

```python
class SlackIntegration:
    def __init__(self, webhook_url):
        self.webhook_url = webhook_url
    
    def send_notification(self, message, attachments=None):
        """Envoie une notification Slack"""
        payload = {
            "text": message,
            "attachments": attachments or []
        }
        
        response = requests.post(self.webhook_url, json=payload)
        response.raise_for_status()
        return response
    
    def notify_project_created(self, project):
        """Notifie de la création d'un projet"""
        message = f"Nouveau projet créé: {project['name']}"
        attachments = [{
            "color": "good",
            "fields": [
                {
                    "title": "ID",
                    "value": project['id'],
                    "short": True
                },
                {
                    "title": "Statut",
                    "value": project['status'],
                    "short": True
                }
            ]
        }]
        
        self.send_notification(message, attachments)
    
    def notify_job_completed(self, job):
        """Notifie de l'achèvement d'un job"""
        message = f"Job complété: {job['id']}"
        attachments = [{
            "color": "good",
            "fields": [
                {
                    "title": "Projet",
                    "value": job['project_id'],
                    "short": True
                },
                {
                    "title": "Type",
                    "value": job['type'],
                    "short": True
                }
            ]
        }]
        
        self.send_notification(message, attachments)
```

### 3. Zapier Integration

```python
# storycore-zapier/app.py
from flask import Flask, request, jsonify
from storycore import StoryCoreClient

app = Flask(__name__)

# Configuration
storycore_client = StoryCoreClient(api_key="your_api_key")

@app.route('/hooks/zapier', methods=['POST'])
def zapier_webhook():
    data = request.json
    
    # Traiter le trigger/action Zapier
    action = data.get('action')
    
    if action == 'create_project':
        result = create_project(data.get('project_data'))
    elif action == 'process_video':
        result = process_video(data.get('video_data'))
    else:
        return jsonify({'error': 'Action non supportée'}), 400
    
    return jsonify(result), 200

def create_project(project_data):
    """Crée un projet StoryCore depuis Zapier"""
    project = storycore_client.projects.create(
        name=project_data.get('name'),
        description=project_data.get('description'),
        settings=project_data.get('settings', {})
    )
    
    return {
        'success': True,
        'project': project
    }

def process_video(video_data):
    """Traite une vidéo depuis Zapier"""
    # Uploader la vidéo
    asset = storycore_client.media.upload(
        file_path=video_data.get('file_path'),
        name=video_data.get('name'),
        description=video_data.get('description')
    )
    
    # Traiter la vidéo
    job = storycore_client.media.process(
        asset_id=asset['id'],
        output_settings=video_data.get('output_settings', {})
    )
    
    return {
        'success': True,
        'asset': asset,
        'job': job
    }

if __name__ == '__main__':
    app.run(debug=True)
```

## Configuration des Intégrations

### 1. Fichier de Configuration

```yaml
# config/integrations.yaml
integrations:
  youtube:
    enabled: true
    api_key: "${YOUTUBE_API_KEY}"
    channel_id: "UC_y9s_8bKJn3tD9p5hPzJ_A"
    
  slack:
    enabled: true
    webhook_url: "${SLACK_WEBHOOK_URL}"
    channel: "#storycore"
    
  zapier:
    enabled: true
    webhook_url: "${ZAPIER_WEBHOOK_URL}"
    secret: "${ZAPIER_SECRET}"
    
  wordpress:
    enabled: false
    site_url: "${WORDPRESS_SITE_URL}"
    username: "${WORDPRESS_USERNAME}"
    application_password: "${WORDPRESS_APP_PASSWORD}"
    
  adobe:
    enabled: false
    api_key: "${ADOBE_API_KEY}"
    client_id: "${ADOBE_CLIENT_ID}"
    client_secret: "${ADOBE_CLIENT_SECRET}"
```

### 2. Variables d'Environnement

```bash
# .env
YOUTUBE_API_KEY=your_youtube_api_key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/123456/
ZAPIER_SECRET=your_zapier_secret
WORDPRESS_SITE_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your_username
WORDPRESS_APP_PASSWORD=your_app_password
ADOBE_API_KEY=your_adobe_api_key
ADOBE_CLIENT_ID=your_adobe_client_id
ADOBE_CLIENT_SECRET=your_adobe_client_secret
```

## Sécurité des Intégrations

### 1. Authentification

```python
class IntegrationAuth:
    @staticmethod
    def verify_signature(data, signature, secret):
        """Vérifie la signature d'une intégration"""
        import hmac
        import hashlib
        
        expected_signature = hmac.new(
            secret.encode(),
            data,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    
    @staticmethod
    def generate_token(user_id, permissions, secret, expires_in=3600):
        """Génère un token d'intégration"""
        import jwt
        import time
        
        payload = {
            'sub': user_id,
            'permissions': permissions,
            'iat': int(time.time()),
            'exp': int(time.time()) + expires_in
        }
        
        return jwt.encode(payload, secret, algorithm='HS256')
    
    @staticmethod
    def verify_token(token, secret):
        """Vérifie un token d'intégration"""
        import jwt
        
        try:
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            raise Exception('Token expiré')
        except jwt.InvalidTokenError:
            raise Exception('Token invalide')
```

### 2. Gestion des Clés API

```python
class APIKeyManager:
    def __init__(self, db_connection):
        self.db = db_connection
    
    def create_api_key(self, user_id, name, permissions, expires_in=None):
        """Crée une nouvelle clé API"""
        import secrets
        
        key = secrets.token_urlsafe(32)
        hashed_key = self._hash_key(key)
        
        # Enregistrer dans la base de données
        self.db.execute(
            "INSERT INTO api_keys (user_id, name, key_hash, permissions, expires_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, name, hashed_key, permissions, expires_in)
        )
        
        return key
    
    def validate_api_key(self, key):
        """Valide une clé API"""
        hashed_key = self._hash_key(key)
        
        # Rechercher dans la base de données
        result = self.db.execute(
            "SELECT * FROM api_keys WHERE key_hash = ? AND expires_at > NOW()",
            (hashed_key,)
        )
        
        if not result:
            return None
        
        return result[0]
    
    def revoke_api_key(self, key_id):
        """Révoque une clé API"""
        self.db.execute(
            "UPDATE api_keys SET revoked_at = NOW() WHERE id = ?",
            (key_id,)
        )
    
    def _hash_key(self, key):
        """Hache une clé API"""
        import hashlib
        
        return hashlib.sha256(key.encode()).hexdigest()
```

## Monitoring des Intégrations

### 1. Logging

```python
import logging
from datetime import datetime

class IntegrationLogger:
    def __init__(self):
        self.logger = logging.getLogger('storycore_integrations')
        self.logger.setLevel(logging.INFO)
        
        # Handler de fichier
        file_handler = logging.FileHandler('integrations.log')
        file_handler.setLevel(logging.INFO)
        
        # Handler de console
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
    
    def log_integration_event(self, integration_name, event_type, data, status='success'):
        """Log un événement d'intégration"""
        log_data = {
            'integration': integration_name,
            'event': event_type,
            'timestamp': datetime.utcnow().isoformat(),
            'data': data,
            'status': status
        }
        
        if status == 'success':
            self.logger.info(f"Integration event: {log_data}")
        else:
            self.logger.error(f"Integration error: {log_data}")
```

### 2. Métriques

```python
from prometheus_client import Counter, Gauge, Histogram

# Métriques pour les intégrations
INTEGRATION_REQUESTS = Counter(
    'integration_requests_total',
    'Total requests to integrations',
    ['integration', 'endpoint']
)

INTEGRATION_ERRORS = Counter(
    'integration_errors_total',
    'Total errors from integrations',
    ['integration', 'error_type']
)

INTEGRATION_DURATION = Histogram(
    'integration_request_duration_seconds',
    'Duration of integration requests',
    ['integration', 'endpoint']
)

def monitor_integration_request(integration, endpoint, duration, success=True):
    """Surveille une requête d'intégration"""
    INTEGRATION_REQUESTS.labels(integration=integration, endpoint=endpoint).inc()
    
    if not success:
        INTEGRATION_ERRORS.labels(integration=integration, error_type='request_failed').inc()
    
    INTEGRATION_DURATION.labels(integration=integration, endpoint=endpoint).observe(duration)
```

---

*Pour plus d'informations sur l'architecture, consultez [ARCHITECTURE.md](ARCHITECTURE.md).*