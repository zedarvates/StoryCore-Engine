# Architecture Système - StoryCore

Ce document décrit l'architecture détaillée de StoryCore, un système de création de contenu IA avancé basé sur une architecture modulaire et scalable.

## Vue d'Ensemble

StoryCore est conçu comme une plateforme de création de contenu complète qui combine édition vidéo traditionnelle avec intelligence artificielle générative. L'architecture est optimisée pour la performance, la scalabilité et la maintenabilité.

## Architecture Globale

### Diagramme d'Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Couche Présentation                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Electron (Desktop)    │  React Web (Client Léger)    │  Mobile (React Native)   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              Couche Application                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│  StoryCore API (Node.js)    │  Services Métier (Python)    │  ComfyUI (IA)            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              Couche Services                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  File Storage    │  Message Queue    │  Cache    │  Monitoring    │  Security  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              Couche Infrastructure                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL    │  Redis    │  Object Storage    │  Load Balancer    │  CDN    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Principes d'Architecture

1. **Modularité** : Chaque composant est indépendant et remplaçable
2. **Scalabilité** : Architecture conçue pour le scaling horizontal
3. **Résilience** : Tolérance aux pannes et auto-guérison
4. **Sécurité** : Sécurité intégrée à tous les niveaux
5. **Performance** : Optimisation pour les temps de réponse

## Composants Principaux

### 1. Frontend

#### Electron Application

**Responsabilités** :
- Interface utilisateur de bureau riche
- Gestion des fichiers locaux
- Intégration système
- Notifications natives

**Technologies** :
- Electron 27+
- React 18
- TypeScript
- Material-UI

**Structure** :
```
frontend/
├── main/           # Processus principal
├── renderer/       # Processus renderer
├── preload/        # Scripts de préchargement
└── resources/      # Ressources natives
```

#### Web Client

**Responsabilités** :
- Interface web légère
- Collaboration en temps réel
- Accès mobile
- Intégration avec d'autres services

**Technologies** :
- React 18
- Next.js 14
- Tailwind CSS
- WebSocket

### 2. Backend API

#### StoryCore API

**Responsabilités** :
- Gestion des utilisateurs
- Gestion des projets
- Orchestration des workflows
- Gestion des assets

**Technologies** :
- Node.js 18+
- Express.js
- TypeScript
- Socket.io

**Endpoints Principaux** :
```typescript
// Authentication
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout

// Projects
GET /api/projects
POST /api/projects
GET /api/projects/:id
PUT /api/projects/:id
DELETE /api/projects/:id

// Assets
POST /api/assets/upload
GET /api/assets/:id
DELETE /api/assets/:id

// Jobs
POST /api/jobs
GET /api/jobs/:id
POST /api/jobs/:id/cancel
```

#### Services Métier

**Responsabilités** :
- Traitement vidéo
- Gestion des modèles IA
- Notifications
- Reporting

**Technologies** :
- Python 3.8+
- FastAPI
- Celery
- Redis

**Services** :
```python
# Video Processing Service
class VideoProcessingService:
    def process_video(self, input_path, output_path, settings):
        # Logique de traitement vidéo
    
    def generate_thumbnail(self, video_path, timestamp):
        # Génération de thumbnail
    
    def extract_metadata(self, video_path):
        # Extraction de métadonnées

# AI Model Service
class AIModelService:
    def load_model(self, model_name):
        # Chargement de modèle IA
    
    def generate_content(self, prompt, model_type):
        # Génération de contenu IA
    
    def optimize_model(self, model_name, optimization_level):
        # Optimisation de modèle
```

### 3. ComfyUI Integration

#### ComfyUI Server

**Responsabilités** :
- Traitement IA avancé
- Exécution de workflows
- Gestion des modèles
- Monitoring des jobs

**Technologies** :
- Python
- PyTorch
- CUDA
- WebSocket

**Workflow Types** :
```python
# Text Generation Workflow
{
    "type": "text_generation",
    "model": "gemma3",
    "parameters": {
        "temperature": 0.7,
        "max_tokens": 1000
    }
}

# Image Generation Workflow
{
    "type": "image_generation",
    "model": "stable_diffusion",
    "parameters": {
        "resolution": "512x512",
        "steps": 20
    }
}

# Video Processing Workflow
{
    "type": "video_processing",
    "model": "llava",
    "parameters": {
        "frame_extraction": true,
        "batch_size": 16
    }
}
```

### 4. Couche Services

#### File Storage

**Responsabilités** :
- Stockage des fichiers projets
- Gestion des assets
- Backup et recovery
- CDN integration

**Technologies** :
- MinIO (self-hosted)
- AWS S3 (cloud)
- CDN Cloudflare

**Configuration** :
```yaml
# storage.yaml
storage:
  type: "minio"  # ou "s3"
  config:
    minio:
      endpoint: "localhost:9000"
      access_key: "minioadmin"
      secret_key: "minioadmin"
      bucket: "storycore-projects"
    s3:
      region: "eu-west-1"
      bucket: "storycore-prod"
      credentials:
        access_key_id: "${AWS_ACCESS_KEY_ID}"
        secret_access_key: "${AWS_SECRET_ACCESS_KEY}"
```

#### Message Queue

**Responsabilités** :
- Orchestration des jobs
- Communication asynchrone
- Event streaming
- Retry mechanism

**Technologies** :
- RabbitMQ
- Redis Streams

**Configuration** :
```python
# queue_config.py
RABBITMQ_CONFIG = {
    'host': 'localhost',
    'port': 5672,
    'username': 'storycore',
    'password': 'storycore',
    'virtual_host': 'storycore'
}

REDIS_CONFIG = {
    'host': 'localhost',
    'port': 6379,
    'db': 0
}
```

#### Cache

**Responsabilités** :
- Cache des résultats
- Cache des sessions
- Cache des modèles
- Cache des réponses API

**Technologies** :
- Redis
- Memcached

**Configuration** :
```python
# cache_config.py
CACHE_CONFIG = {
    'type': 'redis',
    'redis': {
        'host': 'localhost',
        'port': 6379,
        'db': 1,
        'password': None
    },
    'memcached': {
        'servers': ['localhost:11211']
    }
}
```

### 5. Couche Infrastructure

#### Database

**Responsabilités** :
- Persistance des données
- Transactions ACID
- Indexation
- Backup

**Technologies** :
- PostgreSQL (principal)
- Redis (cache)
- MongoDB (documents)

**Schéma Principal** :
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    plan VARCHAR(50) DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    size BIGINT,
    duration INTEGER,
    metadata JSONB DEFAULT '{}',
    file_path VARCHAR(512) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    parameters JSONB DEFAULT '{}',
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

#### Load Balancer

**Responsabilités** :
- Répartition de charge
- Health checks
- SSL termination
- Rate limiting

**Technologies** :
- Nginx
- HAProxy

**Configuration Nginx** :
```nginx
# nginx.conf
upstream storycore_backend {
    least_conn;
    server 192.168.1.10:3000 weight=3;
    server 192.168.1.11:3000 weight=2;
    server 192.168.1.12:3000 weight=1;
}

upstream comfyui_backend {
    least_conn;
    server 192.168.1.20:8000;
    server 192.168.1.21:8000;
    server 192.168.1.22:8000;
}

server {
    listen 443 ssl http2;
    server_name storycore.example.com;

    ssl_certificate /etc/ssl/certs/storycore.crt;
    ssl_certificate_key /etc/ssl/private/storycore.key;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req zone=api burst=20 nodelay;

    location /api/ {
        proxy_pass http://storycore_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /comfyui/ {
        proxy_pass http://comfyui_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Flux de Données

### 1. Création de Projet

```
Utilisateur → Electron API → StoryCore API → Database
                                      ↓
                                    Redis Cache
                                      ↓
                                  Message Queue
                                      ↓
                                ComfyUI Service
                                      ↓
                                  File Storage
                                      ↓
                                  Notification
```

### 2. Traitement Vidéo

```
Fichier Vidéo → File Storage → Video Processing Service
                                    ↓
                              Message Queue (Celery)
                                    ↓
                            ComfyUI (GPU Processing)
                                    ↓
                              File Storage (Output)
                                    ↓
                            Database (Update Metadata)
                                    ↓
                              Notification (User)
```

### 3. Génération IA

```
Prompt Utilisateur → StoryCore API → AI Model Service
                                        ↓
                                  ComfyUI Server
                                        ↓
                                  GPU Processing
                                        ↓
                                  File Storage
                                        ↓
                            Database (Update Results)
                                        ↓
                                  Notification
```

## Design Patterns

### 1. Architecture en Couches

**Pattern** : Layered Architecture

**Avantages** :
- Séparation des préoccupations
- Maintenance facilitée
- Testabilité améliorée
- Évolutivité

**Implémentation** :
```typescript
// Express middleware example
class LayeredMiddleware {
  private database: Database;
  private cache: Cache;
  private messageQueue: MessageQueue;
  
  constructor() {
    this.database = new Database();
    this.cache = new Cache();
    this.messageQueue = new MessageQueue();
  }
  
  async handleRequest(req: Request, res: Response) {
    // Layer 1: Authentication
    const user = await this.authenticate(req);
    
    // Layer 2: Authorization
    await this.authorize(user, req);
    
    // Layer 3: Business Logic
    const result = await this.processBusinessLogic(req);
    
    // Layer 4: Response Formatting
    res.json(this.formatResponse(result));
  }
}
```

### 2. Microservices

**Pattern** : Microservices Architecture

**Avantages** :
- Indépendance des services
- Scaling individuel
- Technologie mixte
- Résilience

**Services** :
```yaml
# docker-compose.yml
version: '3.8'
services:
  api-gateway:
    image: storycore/api-gateway:latest
    ports:
      - "80:80"
    depends_on:
      - auth-service
      - project-service
      - ai-service
  
  auth-service:
    image: storycore/auth-service:latest
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/auth
    depends_on:
      - db
  
  project-service:
    image: storycore/project-service:latest
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/projects
      - STORAGE_URL=s3://bucket/projects
    depends_on:
      - db
      - storage
  
  ai-service:
    image: storycore/ai-service:latest
    environment:
      - COMFYUI_URL=http://comfyui:8000
      - MODEL_PATH=/models
    depends_on:
      - comfyui
      - storage
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=storycore
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
  
  storage:
    image: minio/minio:latest
    command: server /data
    environment:
      - MINIO_ROOT_USER=minio
      - MINIO_ROOT_PASSWORD=minio123
```

### 3. CQRS (Command Query Responsibility Segregation)

**Pattern** : CQRS

**Avantages** :
- Optimisation des performances
- Scalabilité
- Séparation des lectures/écritures
- Historisation

**Implémentation** :
```python
# Command side
class CreateProjectCommand:
    def __init__(self, user_id, name, description):
        self.user_id = user_id
        self.name = name
        self.description = description

class ProjectCommandHandler:
    def handle(self, command: CreateProjectCommand):
        # Validate command
        self._validate(command)
        
        # Create project
        project = Project(
            user_id=command.user_id,
            name=command.name,
            description=command.description
        )
        
        # Save to database
        self.project_repository.save(project)
        
        # Publish event
        self.event_bus.publish(ProjectCreatedEvent(project.id))
        
        return project

# Query side
class GetProjectQuery:
    def __init__(self, project_id):
        self.project_id = project_id

class ProjectQueryHandler:
    def handle(self, query: GetProjectQuery):
        # Read from read database
        project = self.project_read_repository.get(query.project_id)
        
        # Project DTO
        return ProjectDTO(
            id=project.id,
            name=project.name,
            description=project.description,
            created_at=project.created_at
        )
```

### 4. Event Sourcing

**Pattern** : Event Sourcing

**Avantages** :
- Historique complet
- Auditabilité
- Reconstruction d'état
- Temporal queries

**Implémentation** :
```python
# Event store
class EventStore:
    def __init__(self, db_connection):
        self.db = db_connection
    
    def save_events(self, stream_name, events, expected_version):
        # Implement optimistic concurrency
        current_version = self.get_current_version(stream_name)
        
        if current_version != expected_version:
            raise ConcurrencyError(f"Expected {expected_version}, got {current_version}")
        
        # Save events
        for event in events:
            self.db.execute(
                "INSERT INTO events (stream_name, event_type, event_data, version) VALUES (?, ?, ?, ?)",
                (stream_name, event.__class__.__name__, json.dumps(event.__dict__), current_version + 1)
            )
            current_version += 1
    
    def get_events(self, stream_name):
        events = []
        rows = self.db.execute("SELECT event_type, event_data FROM events WHERE stream_name = ? ORDER BY version", (stream_name,))
        
        for row in rows:
            event_type = row['event_type']
            event_data = json.loads(row['event_data'])
            
            # Reconstruct event object
            event_class = globals()[event_type]
            event = event_class(**event_data)
            events.append(event)
        
        return events

# Aggregate root
class ProjectAggregate:
    def __init__(self, event_store):
        self.event_store = event_store
        self.uncommitted_events = []
    
    def create_project(self, user_id, name, description):
        # Create project created event
        event = ProjectCreatedEvent(user_id, name, description)
        self.apply(event)
        self.uncommitted_events.append(event)
    
    def apply(self, event):
        # Update aggregate state based on event
        if isinstance(event, ProjectCreatedEvent):
            self.id = event.project_id
            self.user_id = event.user_id
            self.name = event.name
            self.description = event.description
            self.status = 'created'
    
    def save(self):
        # Save uncommitted events
        if self.uncommitted_events:
            self.event_store.save_events(
                f"project-{self.id}",
                self.uncommitted_events,
                len(self.uncommitted_events)
            )
            self.uncommitted_events = []
```

## Performance Optimization

### 1. Caching Strategy

**Multi-level Caching** :
```python
class CacheManager:
    def __init__(self):
        self.l1_cache = {}  # In-memory cache
        self.l2_cache = RedisCache()
        self.l3_cache = DatabaseCache()
    
    def get(self, key):
        # L1: In-memory cache
        if key in self.l1_cache:
            return self.l1_cache[key]
        
        # L2: Redis cache
        value = self.l2_cache.get(key)
        if value:
            self.l1_cache[key] = value  # Warm L1 cache
            return value
        
        # L3: Database cache
        value = self.l3_cache.get(key)
        if value:
            self.l2_cache.set(key, value, ttl=3600)  # Warm L2 cache
            self.l1_cache[key] = value  # Warm L1 cache
            return value
        
        return None
    
    def set(self, key, value, ttl=None):
        # Set in all cache levels
        self.l1_cache[key] = value
        self.l2_cache.set(key, value, ttl)
        self.l3_cache.set(key, value)
```

### 2. Database Optimization

**Indexing Strategy** :
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_projects_user_status ON projects(user_id, status);
CREATE INDEX idx_assets_project_type ON assets(project_id, type);
CREATE INDEX idx_jobs_project_status ON jobs(project_id, status);

-- Partial indexes for filtering
CREATE INDEX idx_projects_active ON projects(status) WHERE status = 'active';
CREATE INDEX idx_jobs_pending ON jobs(status) WHERE status = 'pending';

-- Full-text search index
CREATE INDEX idx_projects_search ON projects USING gin(to_tsvector('french', name || ' ' || description));
```

**Connection Pooling** :
```python
# Database configuration with connection pooling
DATABASE_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'storycore',
    'user': 'storycore',
    'password': 'storycore',
    'pool_size': 20,
    'max_overflow': 10,
    'pool_timeout': 30,
    'pool_recycle': 3600
}
```

### 3. Asynchronous Processing

**Celery Configuration** :
```python
# celery_config.py
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Task optimization
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 270  # 4.5 minutes
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
```

## Security Architecture

### 1. Authentication & Authorization

**JWT Implementation** :
```python
# jwt_manager.py
class JWTManager:
    def __init__(self, secret_key):
        self.secret_key = secret_key
        self.algorithm = "HS256"
        self.access_token_expire = timedelta(hours=1)
        self.refresh_token_expire = timedelta(days=30)
    
    def create_access_token(self, user_id):
        payload = {
            'user_id': user_id,
            'type': 'access',
            'exp': datetime.utcnow() + self.access_token_expire,
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user_id):
        payload = {
            'user_id': user_id,
            'type': 'refresh',
            'exp': datetime.utcnow() + self.refresh_token_expire,
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token):
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError()
        except jwt.InvalidTokenError:
            raise InvalidTokenError()
```

### 2. Data Encryption

**Encryption Strategy** :
```python
# encryption_manager.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os

class EncryptionManager:
    def __init__(self, password):
        # Generate key from password
        salt = os.urandom(16)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = kdf.derive(password.encode())
        self.cipher = Fernet(key)
    
    def encrypt(self, data):
        return self.cipher.encrypt(data.encode())
    
    def decrypt(self, encrypted_data):
        return self.cipher.decrypt(encrypted_data).decode()
```

## Monitoring & Observability

### 1. Metrics Collection

**Prometheus Configuration** :
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'storycore-api'
    static_configs:
      - targets: ['storycore-api:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
    
  - job_name: 'storycore-comfyui'
    static_configs:
      - targets: ['comfyui:8000']
    metrics_path: '/metrics'
    scrape_interval: 5s
    
  - job_name: 'storycore-redis'
    static_configs:
      - targets: ['redis:6379']
    metrics_path: '/metrics'
    
  - job_name: 'storycore-postgres'
    static_configs:
      - targets: ['postgres:5432']
    metrics_path: '/metrics'
```

### 2. Logging Strategy

**Structured Logging** :
```python
# logging_config.py
import logging
import json
from datetime import datetime

class StructuredLogger:
    def __init__(self, name):
        self.logger = logging.getLogger(name)
        handler = logging.StreamHandler()
        
        # JSON formatter
        formatter = logging.Formatter(
            fmt=json.dumps({
                'timestamp': '%(asctime)s',
                'level': '%(levelname)s',
                'logger': '%(name)s',
                'message': '%(message)s',
                'trace_id': '%(trace_id)s',
                'span_id': '%(span_id)s'
            }),
            datefmt='%Y-%m-%dT%H:%M:%S.%fZ'
        )
        
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def info(self, message, **kwargs):
        extra = kwargs
        self.logger.info(message, extra=extra)
    
    def error(self, message, **kwargs):
        extra = kwargs
        self.logger.error(message, extra=extra)
```

## Deployment Architecture

### 1. Container Orchestration

**Kubernetes Configuration** :
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storycore-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: storycore-api
  template:
    metadata:
      labels:
        app: storycore-api
    spec:
      containers:
      - name: storycore-api
        image: storycore/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: storycore-api-service
spec:
  selector:
    app: storycore-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

### 2. Infrastructure as Code

**Terraform Configuration** :
```hcl
# main.tf
provider "aws" {
  region = "eu-west-1"
}

resource "aws_vpc" "storycore" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "storycore-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.storycore.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  
  tags = {
    Name = "storycore-public-subnet"
  }
}

resource "aws_security_group" "storycore" {
  vpc_id = aws_vpc.storycore.id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "storycore-sg"
  }
}

resource "aws_ecs_cluster" "storycore" {
  name = "storycore-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_service" "storycore-api" {
  name            = "storycore-api"
  cluster         = aws_ecs_cluster.storycore.id
  task_definition = aws_ecs_task_definition.storycore-api.arn
  desired_count  = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.storycore-api.arn
    container_name   = "storycore-api"
    container_port   = 3000
  }
  
  depends_on = [
    aws_lb_listener.storycore-api
  ]
}
```

---

*Pour plus d'informations sur le déploiement, consultez [DEPLOYMENT.md](DEPLOYMENT.md).*