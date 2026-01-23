# Déploiement - StoryCore

Ce guide fournit des instructions détaillées pour déployer StoryCore dans différents environnements, du développement à la production.

## Vue d'Ensemble

StoryCore peut être déployé dans plusieurs configurations :

- 🖥️ **Développement Local** : Pour le développement et les tests
- 🐳 **Docker** : Pour l'isolation et la portabilité
- ☸️ **Kubernetes** : Pour le scaling et la production
- ☁️ **Cloud** : Pour la haute disponibilité et la gestion

## Environnements

### 1. Développement Local

#### Prérequis

- **Système** : Windows 10/11, macOS 10.14+, Ubuntu 18.04+
- **Python** : 3.8+
- **Node.js** : 16+
- **Docker** : Optionnel mais recommandé

#### Installation Directe

```bash
# 1. Cloner le dépôt
git clone https://github.com/storycore/storycore.git
cd storycore

# 2. Installer les dépendances Python
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Installer les dépendances Node.js
npm install

# 4. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos configurations

# 5. Initialiser la base de données
python manage.py migrate

# 6. Lancer le serveur de développement
python manage.py runserver
npm run dev
```

#### Configuration Docker

```bash
# 1. Construire les images
docker-compose build

# 2. Lancer les services
docker-compose up -d

# 3. Vérifier l'état
docker-compose ps
docker-compose logs
```

#### docker-compose.yml

```yaml
version: '3.8'
services:
  storycore-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://storycore:storycore@db:5432/storycore
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=your-secret-key
    depends_on:
      - db
      - redis
    volumes:
      - .:/app
      - /app/node_modules
    command: >
      sh -c "python manage.py migrate &&
             python manage.py runserver 0.0.0.0:3000"

  storycore-frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "8080:3000"
    depends_on:
      - storycore-api
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=storycore
      - POSTGRES_USER=storycore
      - POSTGRES_PASSWORD=storycore
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  comfyui:
    image: storycore/comfyui:latest
    ports:
      - "8000:8000"
    environment:
      - STORYCORE_API=http://storycore-api:3000
      - MODEL_PATH=/models
    volumes:
      - comfyui_models:/models
      - comfyui_data:/data

volumes:
  postgres_data:
  redis_data:
  comfyui_models:
  comfyui_data:
```

### 2. Staging

#### Configuration

```yaml
# docker-compose.staging.yml
version: '3.8'
services:
  storycore-api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://storycore:staging-password@staging-db:5432/storycore
      - REDIS_URL=redis://staging-redis:6379/0
      - SECRET_KEY=${STAGING_SECRET_KEY}
      - DEBUG=False
      - LOG_LEVEL=INFO
    depends_on:
      - staging-db
      - staging-redis
    restart: unless-stopped

  storycore-frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - storycore-api
    restart: unless-stopped

  staging-db:
    image: postgres:15
    environment:
      - POSTGRES_DB=storycore
      - POSTGRES_USER=storycore
      - POSTGRES_PASSWORD=staging-password
    volumes:
      - staging_postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  staging-redis:
    image: redis:7-alpine
    volumes:
      - staging_redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - storycore-api
      - storycore-frontend
    restart: unless-stopped

volumes:
  staging_postgres_data:
  staging_redis_data:
```

#### Script de Déploiement Staging

```bash
#!/bin/bash
# deploy-staging.sh

set -e

echo "=== Déploiement Staging StoryCore ==="

# Arrêter les services existants
docker-compose -f docker-compose.staging.yml down

# Mettre à jour les images
docker-compose -f docker-compose.staging.yml pull

# Construire les images
docker-compose -f docker-compose.staging.yml build

# Lancer les services
docker-compose -f docker-compose.staging.yml up -d

# Attendre que les services soient prêts
echo "Attente du démarrage des services..."
sleep 30

# Vérifier l'état des services
docker-compose -f docker-compose.staging.yml ps

# Exécuter les migrations
docker-compose -f docker-compose.staging.yml exec storycore-api python manage.py migrate

# Vérifier la santé des services
echo "Vérification de la santé des services..."
curl -f http://localhost:3000/health
curl -f http://localhost:80/

echo "=== Déploiement Staging Terminé ==="
```

### 3. Production

#### Kubernetes Deployment

```yaml
# k8s-prod.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: storycore-prod
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: storycore-config
  namespace: storycore-prod
data:
  config.json: |
    {
      "database": {
        "url": "postgresql://storycore:prod-password@postgres:5432/storycore"
      },
      "redis": {
        "url": "redis://redis:6379/0"
      },
      "secret_key": "${SECRET_KEY}",
      "debug": false,
      "log_level": "INFO"
    }
---
apiVersion: v1
kind: Secret
metadata:
  name: storycore-secrets
  namespace: storycore-prod
type: Opaque
data:
  database-password: cHvkLXByb2R1Y3QtcGFzc3dvcmQ=
  secret-key: eW91ci1zZWNyZXQta2V5
  redis-password: cmVkaXMtcGFzc3dvcmQ=
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storycore-api
  namespace: storycore-prod
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
              name: storycore-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: storycore-secrets
              key: redis-url
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: storycore-secrets
              key: secret-key
        - name: CONFIG_PATH
          value: "/app/config/config.json"
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
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
      volumes:
      - name: config-volume
        configMap:
          name: storycore-config
---
apiVersion: v1
kind: Service
metadata:
  name: storycore-api-service
  namespace: storycore-prod
spec:
  selector:
    app: storycore-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: storycore-ingress
  namespace: storycore-prod
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.storycore.example.com
    secretName: storycore-tls
  rules:
  - host: api.storycore.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: storycore-api-service
            port:
              number: 80
```

#### Helm Chart

```yaml
# charts/storycore/Chart.yaml
apiVersion: v2
name: storycore
description: A StoryCore Helm chart for Kubernetes
type: application
version: 0.1.0
appVersion: "3.0.0"
---
# charts/storycore/values.yaml
replicaCount: 3

image:
  repository: storycore/api
  pullPolicy: IfNotPresent
  tag: "3.0.0"

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: "nginx"
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.storycore.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: storycore-tls
      hosts:
        - api.storycore.example.com

config:
  database:
    url: "postgresql://storycore:prod-password@postgres:5432/storycore"
  redis:
    url: "redis://redis:6379/0"
  secretKey: "your-production-secret-key"
  debug: false
  logLevel: "INFO"

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

nodeSelector:
  node-role.kubernetes.io/worker: "true"

tolerations:
  - key: "storycore"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - storycore-api
        topologyKey: "kubernetes.io/hostname"
```

#### Script de Déploiement Production

```bash
#!/bin/bash
# deploy-prod.sh

set -e

echo "=== Déploiement Production StoryCore ==="

# Configuration
NAMESPACE="storycore-prod"
CHART_NAME="storycore"
RELEASE_NAME="storycore-prod"

# Vérifier les prérequis
echo "Vérification des prérequis..."
kubectl get namespace $NAMESPACE >/dev/null 2>&1 || kubectl create namespace $NAMESPACE

# Mettre à jour les images
echo "Mise à jour des images..."
helm pull oci://registry.example.com/charts/storycore --version 0.1.0
helm dependency update charts/storycore

# Déployer le chart
echo "Déploiement du chart Helm..."
helm upgrade --install $RELEASE_NAME ./charts/storycore \
  --namespace $NAMESPACE \
  --set image.tag=3.0.0 \
  --set replicaCount=3 \
  --set autoscaling.enabled=true \
  --set autoscaling.minReplicas=3 \
  --set autoscaling.maxReplicas=10 \
  --wait

# Vérifier le déploiement
echo "Vérification du déploiement..."
helm status $RELEASE_NAME --namespace $NAMESPACE

# Vérifier la santé des pods
echo "Vérification de la santé des pods..."
kubectl get pods -n $NAMESPACE -l app=storycore-api

# Vérifier les services
echo "Vérification des services..."
kubectl get services -n $NAMESPACE

# Vérifier les ingress
echo "Vérification des ingress..."
kubectl get ingress -n $NAMESPACE

# Exécuter les migrations
echo "Exécution des migrations..."
kubectl exec -it -n $NAMESPACE deployment/$RELEASE_NAME-storycore-api-0 -- python manage.py migrate

# Vérifier l'accès externe
echo "Vérification de l'accès externe..."
curl -f https://api.storycore.example.com/health

echo "=== Déploiement Production Terminé ==="
```

## Configuration

### 1. Variables d'Environnement

#### Variables Requises

| Variable | Description | Valeur par défaut |
|----------|-------------|------------------|
| `DATABASE_URL` | URL de connexion à la base de données | - |
| `REDIS_URL` | URL de connexion à Redis | - |
| `SECRET_KEY` | Clé secrète pour JWT | - |
| `DEBUG` | Mode debug | `False` |
| `LOG_LEVEL` | Niveau de logging | `INFO` |

#### Variables Optionnelles

| Variable | Description | Valeur par défaut |
|----------|-------------|------------------|
| `COMFYUI_URL` | URL de ComfyUI | `http://localhost:8000` |
| `STORAGE_TYPE` | Type de stockage | `local` |
| `STORAGE_PATH` | Chemin de stockage local | `/data` |
| `SENTRY_DSN` | DSN Sentry pour le monitoring | - |
| `ENABLE_METRICS` | Activer les métriques | `True` |

#### Configuration Docker

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Copier les dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier l'application
COPY . .

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "--workers", "4", "app:app"]
```

### 2. Configuration des Services

#### Configuration Nginx

```nginx
# nginx.conf
upstream storycore_backend {
    least_conn;
    server storycore-api-1:3000;
    server storycore-api-2:3000;
    server storycore-api-3:3000;
}

server {
    listen 443 ssl http2;
    server_name api.storycore.example.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/storycore.crt;
    ssl_certificate_key /etc/ssl/private/storycore.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req zone=api burst=20 nodelay;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Proxy to Backend
    location / {
        proxy_pass http://storycore_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health Check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

#### Configuration Systemd

```ini
# /etc/systemd/system/storycore.service
[Unit]
Description=StoryCore Application
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=storycore
Group=storycore
WorkingDirectory=/opt/storycore
Environment=PATH=/opt/storycore/venv/bin
ExecStart=/opt/storycore/venv/bin/gunicorn --bind 0.0.0.0:3000 --workers 4 app:app
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Scaling

### 1. Horizontal Scaling

#### Kubernetes HPA

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: storycore-api-hpa
  namespace: storycore-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: storycore-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
```

#### Load Balancer Configuration

```yaml
# loadbalancer.yaml
apiVersion: v1
kind: Service
metadata:
  name: storycore-loadbalancer
  namespace: storycore-prod
spec:
  type: LoadBalancer
  selector:
    app: storycore-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  externalTrafficPolicy: Local
```

### 2. Vertical Scaling

#### Resource Limits

```yaml
# resource-limits.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storycore-api
  namespace: storycore-prod
spec:
  template:
    spec:
      containers:
      - name: storycore-api
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

#### Node Selection

```yaml
# node-selector.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: storycore-high-priority
value: 1000000
description: "Priority class for StoryCore production workloads"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storycore-api
  namespace: storycore-prod
spec:
  template:
    spec:
      priorityClassName: storycore-high-priority
      nodeSelector:
        node-role.kubernetes.io/worker: "true"
        node-type: high-memory
      tolerations:
      - key: "storycore"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
```

## Monitoring

### 1. Prometheus Configuration

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: storycore-prod
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    scrape_configs:
    - job_name: 'storycore-api'
      static_configs:
        - targets: ['storycore-api-service:3000']
      metrics_path: '/metrics'
      scrape_interval: 5s
    
    - job_name: 'storycore-comfyui'
      static_configs:
        - targets: ['comfyui-service:8000']
      metrics_path: '/metrics'
      scrape_interval: 5s
    
    - job_name: 'storycore-postgres'
      static_configs:
        - targets: ['postgres-exporter:9187']
      scrape_interval: 15s
    
    - job_name: 'storycore-redis'
      static_configs:
        - targets: ['redis-exporter:9121']
      scrape_interval: 15s
```

### 2. Grafana Dashboards

#### Dashboard API StoryCore

```json
{
  "dashboard": {
    "title": "StoryCore API",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

### 3. Logging

#### Fluentd Configuration

```yaml
# fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: storycore-prod
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/storycore/*.log
      pos_file /var/log/storycore/fluentd.pos
      tag storycore.*
      format json
      time_format %Y-%m-%dT%H:%M:%S.%L%z
    </source>

    <match storycore.**>
      @type elasticsearch
      host elasticsearch-service
      port 9200
      index_name storycore
      type_name _doc
      include_tag true
    </match>

    <match **>
      @type stdout
    </match>
```

## Backup and Recovery

### 1. Database Backup

#### PostgreSQL Backup Script

```bash
#!/bin/bash
# backup-db.sh

set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/storycore"
DB_NAME="storycore"
DB_USER="storycore"
DB_HOST="postgres"

# Créer le répertoire de backup
mkdir -p $BACKUP_DIR

# Effectuer le backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_DIR/storycore_$DATE.sql

# Compresser le backup
gzip $BACKUP_DIR/storycore_$DATE.sql

# Garder seulement les 7 derniers jours
find $BACKUP_DIR -name "storycore_*.sql.gz" -mtime +7 -delete

echo "Backup completed: storycore_$DATE.sql.gz"
```

#### Kubernetes CronJob

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: storycore-db-backup
  namespace: storycore-prod
spec:
  schedule: "0 2 * * *"  # À 2h00 tous les jours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              apt-get update && apt-get install -y curl
              curl -s https://raw.githubusercontent.com/storycore/storycore/main/scripts/backup-db.sh > /backup.sh
              chmod +x /backup.sh
              /backup.sh
            env:
            - name: DB_HOST
              value: "postgres-service"
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: storycore-secrets
                  key: database-user
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: storycore-secrets
                  key: database-password
            volumeMounts:
            - name: backup-volume
              mountPath: /backups
          volumes:
          - name: backup-volume
            persistentVolumeClaim:
              claimName: storycore-backup-pvc
          restartPolicy: OnFailure
```

### 2. File Storage Backup

#### S3 Backup Script

```bash
#!/bin/bash
# backup-storage.sh

set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/storycore-backup"
S3_BUCKET="storycore-backups"
S3_PREFIX="production"

# Créer le répertoire temporaire
mkdir -p $BACKUP_DIR

# Sauvegarder les fichiers
tar -czf $BACKUP_DIR/storycore_files_$DATE.tar.gz /data/storycore

# Uploader vers S3
aws s3 cp $BACKUP_DIR/storycore_files_$DATE.tar.gz s3://$S3_BUCKET/$S3_PREFIX/

# Nettoyer
rm -rf $BACKUP_DIR

echo "Storage backup completed: s3://$S3_BUCKET/$S3_PREFIX/storycore_files_$DATE.tar.gz"
```

## Security

### 1. Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: storycore-network-policy
  namespace: storycore-prod
spec:
  podSelector:
    matchLabels:
      app: storycore-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: storycore-prod
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: storycore-prod
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector:
        matchLabels:
          name: storycore-prod
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

### 2. Pod Security Policy

```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: storycore-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

---

*Pour plus d'informations sur l'architecture, consultez [ARCHITECTURE.md](ARCHITECTURE.md).*