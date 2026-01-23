# Guide Multi-Instance - StoryCore

Ce guide explique comment configurer et gérer plusieurs instances ComfyUI avec StoryCore pour une utilisation professionnelle à grande échelle.

## Vue d'Ensemble

Le mode multi-instance vous permet de :

- 🔄 **Équilibrer la charge** entre plusieurs serveurs
- 📈 **Augmenter la capacité** de traitement
- 🛡️ **Améliorer la redondance** et la disponibilité
- 🏢 **Supporter les environnements d'entreprise**

## Architecture

### Architecture Recommandée

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                       │
│                    (Nginx/HAProxy)                     │
├─────────────────────────────────────────────────────────┤
│  StoryCore API    │   StoryCore API    │   StoryCore API  │
│  Instance 1       │   Instance 2       │   Instance 3      │
├─────────────────────────────────────────────────────────┤
│  ComfyUI Instance │  ComfyUI Instance  │  ComfyUI Instance │
│  Server A         │  Server B         │  Server C         │
└─────────────────────────────────────────────────────────┘
```

### Composants

1. **Load Balancer** : Répartit le trafic entre les instances
2. **StoryCore Instances** : Instances de l'application principale
3. **ComfyUI Servers** : Serveurs de traitement IA
4. **Shared Storage** : Stockage partagé pour les projets

## Configuration

### 1. Configuration du Load Balancer

#### Nginx Configuration

```nginx
# /etc/nginx/nginx.conf
upstream storycore_backend {
    least_conn;
    server 192.168.1.10:3000;
    server 192.168.1.11:3000;
    server 192.168.1.12:3000;
}

server {
    listen 80;
    server_name storycore.example.com;

    location / {
        proxy_pass http://storycore_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://storycore_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

#### HAProxy Configuration

```haproxy
# /etc/haproxy/haproxy.cfg
frontend storycore_frontend
    bind *:80
    mode http
    option httplog
    option forwardfor
    acl is_websocket hdr(Upgrade) -i WebSocket
    acl is_websocket hdr(Connection) -i Upgrade
    use_backend storycore_backend if is_websocket
    default_backend storycore_backend

backend storycore_backend
    balance roundrobin
    option httpchk GET /api/system/status
    http-check expect status 200
    server server1 192.168.1.10:3000 check
    server server2 192.168.1.11:3000 check
    server server3 192.168.1.12:3000 check
```

### 2. Configuration des StoryCore Instances

#### Configuration Principale

```json
// config.json
{
  "cluster": {
    "enabled": true,
    "node_id": "storycore-1",
    "cluster_nodes": [
      "192.168.1.10:3000",
      "192.168.1.11:3000",
      "192.168.1.12:3000"
    ],
    "discovery_method": "static",
    "heartbeat_interval": 30
  },
  "database": {
    "type": "postgres",
    "host": "192.168.1.100",
    "port": 5432,
    "name": "storycore",
    "user": "storycore",
    "password": "secure_password"
  },
  "redis": {
    "host": "192.168.1.101",
    "port": 6379,
    "db": 0
  },
  "storage": {
    "type": "s3",
    "bucket": "storycore-projects",
    "region": "eu-west-1",
    "access_key": "your_access_key",
    "secret_key": "your_secret_key"
  }
}
```

#### Configuration Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  storycore:
    image: storycore:latest
    container_name: storycore-1
    environment:
      - NODE_ID=storycore-1
      - CLUSTER_ENABLED=true
      - DATABASE_HOST=192.168.1.100
      - REDIS_HOST=192.168.1.101
      - STORAGE_TYPE=s3
      - STORAGE_BUCKET=storycore-projects
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis
    networks:
      - storycore-network

  postgres:
    image: postgres:15
    container_name: postgres
    environment:
      - POSTGRES_DB=storycore
      - POSTGRES_USER=storycore
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - storycore-network

  redis:
    image: redis:7-alpine
    container_name: redis
    volumes:
      - redis_data:/data
    networks:
      - storycore-network

volumes:
  postgres_data:
  redis_data:

networks:
  storycore-network:
    driver: bridge
```

### 3. Configuration des ComfyUI Instances

#### Configuration du Serveur ComfyUI

```json
// comfyui-config.json
{
  "server": {
    "host": "0.0.0.0",
    "port": 8000,
    "ssl": false,
    "cors": true
  },
  "cluster": {
    "enabled": true,
    "node_id": "comfyui-1",
    "storycore_api": "http://192.168.1.10:3000",
    "heartbeat_interval": 30,
    "health_check": true
  },
  "models": {
    "path": "/models",
    "auto_download": true,
    "cache_size": "50GiB"
  },
  "performance": {
    "gpu_memory_limit": 0.8,
    "batch_size": 1,
    "max_concurrent_jobs": 10
  }
}
```

#### Script de Démarrage

```bash
#!/bin/bash
# start-comfyui.sh

# Configuration
NODE_ID="comfyui-1"
STORYCORE_API="http://192.168.1.10:3000"
COMFYUI_PORT=8000

# Démarrage du serveur ComfyUI
cd /opt/comfyui
python main.py \
  --node-id $NODE_ID \
  --storycore-api $STORYCORE_API \
  --port $COMFYUI_PORT \
  --host 0.0.0.0 \
  --auto-launch

# Journalisation
tail -f comfyui.log
```

### 4. Configuration du Stockage Partagé

#### S3 Configuration

```bash
# Configuration AWS CLI
aws configure
AWS Access Key ID [None]: your_access_key
AWS Secret Access Key [None]: your_secret_key
Default region name [None]: eu-west-1
Default output format [None]: json

# Création du bucket
aws s3api create-bucket \
  --bucket storycore-projects \
  --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1
```

#### NFS Configuration

```bash
# Serveur NFS
sudo apt install nfs-kernel-server
sudo mkdir -p /shared/projects
sudo chown -R nobody:nogroup /shared/projects
sudo chmod -R 777 /shared/projects

# /etc/exports
/shared/projects 192.168.1.0/24(rw,sync,no_subtree_check)

sudo exportfs -a
sudo systemctl restart nfs-server

# Client NFS
sudo apt install nfs-common
sudo mkdir -p /mnt/projects
sudo mount 192.168.1.100:/shared/projects /mnt/projects
```

## Gestion des Clusters

### 1. Surveillance du Cluster

#### Script de Surveillance

```python
# cluster_monitor.py
import requests
import time
import json

class ClusterMonitor:
    def __init__(self, storycore_api):
        self.storycore_api = storycore_api
        self.nodes = {}
    
    def check_node_health(self):
        """Vérifie la santé de tous les nœuds"""
        try:
            response = requests.get(f"{self.storycore_api}/api/system/status")
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Erreur lors de la vérification: {e}")
        return None
    
    def check_comfyui_instances(self):
        """Vérifie les instances ComfyUI"""
        try:
            response = requests.get(f"{self.storycore_api}/api/comfyui/instances")
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Erreur lors de la vérification ComfyUI: {e}")
        return None
    
    def monitor(self):
        """Surveillance continue"""
        while True:
            health = self.check_node_health()
            comfyui = self.check_comfyui_instances()
            
            if health:
                print(f"Statut système: {health['status']}")
            
            if comfyui:
                print(f"Instances ComfyUI: {len(comfyui['instances'])}")
                for instance in comfyui['instances']:
                    print(f"  - {instance['node_id']}: {instance['status']}")
            
            time.sleep(30)

# Exemple d'utilisation
monitor = ClusterMonitor("http://192.168.1.10:3000")
monitor.monitor()
```

### 2. Gestion des Jobs

#### Configuration de la Répartition de Charge

```json
// load-balancer-config.json
{
  "load_balancer": {
    "algorithm": "round_robin",
    "sticky_sessions": false,
    "health_check": {
      "enabled": true,
      "interval": 30,
      "timeout": 10,
      "unhealthy_threshold": 3,
      "healthy_threshold": 2
    },
    "weights": {
      "storycore-1": 1,
      "storycore-2": 1,
      "storycore-3": 1
    }
  },
  "comfyui": {
    "load_balancer": {
      "algorithm": "least_connections",
      "max_connections": 100,
      "timeout": 300
    }
  }
}
```

#### Script de Gestion des Jobs

```python
# job_manager.py
import requests
import random

class JobManager:
    def __init__(self, storycore_nodes):
        self.storycore_nodes = storycore_nodes
    
    def get_best_node(self):
        """Trouve le meilleur nœud pour un nouveau job"""
        best_node = None
        min_load = float('inf')
        
        for node in self.storycore_nodes:
            try:
                response = requests.get(f"{node}/api/system/load")
                if response.status_code == 200:
                    load = response.json()['load']
                    if load < min_load:
                        min_load = load
                        best_node = node
            except Exception as e:
                print(f"Erreur lors de la vérification du nœud {node}: {e}")
        
        return best_node
    
    def submit_job(self, job_data):
        """Soumet un job au meilleur nœud"""
        best_node = self.get_best_node()
        
        if best_node:
            try:
                response = requests.post(
                    f"{best_node}/api/jobs",
                    json=job_data,
                    timeout=30
                )
                if response.status_code == 201:
                    return response.json()
            except Exception as e:
                print(f"Erreur lors de la soumission du job: {e}")
        
        return None

# Exemple d'utilisation
nodes = [
    "http://192.168.1.10:3000",
    "http://192.168.1.11:3000",
    "http://192.168.1.12:3000"
]

job_manager = JobManager(nodes)

job_data = {
    "type": "video_processing",
    "parameters": {
        "input": "asset_123",
        "output_settings": {
            "quality": "high",
            "format": "mp4"
        }
    }
}

result = job_manager.submit_job(job_data)
print(f"Job soumis: {result}")
```

## Déploiement

### 1. Déploiement Automatisé

#### Ansible Playbook

```yaml
# deploy-cluster.yml
---
- name: Déployer le cluster StoryCore
  hosts: all
  become: yes
  
  vars:
    storycore_version: "3.0.0"
    postgres_host: "192.168.1.100"
    redis_host: "192.168.1.101"
    storage_bucket: "storycore-projects"
  
  tasks:
    - name: Mettre à jour les paquets
      apt:
        update_cache: yes
        upgrade: yes
    
    - name: Installer Docker
      apt:
        name: docker.io
        state: present
    
    - name: Installer Docker Compose
      apt:
        name: docker-compose
        state: present
    
    - name: Créer le répertoire StoryCore
      file:
        path: /opt/storycore
        state: directory
        mode: '0755'
    
    - name: Télécharger StoryCore
      get_url:
        url: "https://github.com/storycore/storycore/releases/download/{{ storycore_version }}/storycore-{{ storycore_version }}.tar.gz"
        dest: /tmp/storycore.tar.gz
    
    - name: Extraire StoryCore
      unarchive:
        src: /tmp/storycore.tar.gz
        dest: /opt/storycore
        remote_src: yes
    
    - name: Copier la configuration
      template:
        src: config.json.j2
        dest: /opt/storycore/config/config.json
    
    - name: Démarrer les conteneurs
      docker_compose:
        project_src: /opt/storycore
        state: present
```

#### Template de Configuration

```json
// config.json.j2
{
  "cluster": {
    "enabled": true,
    "node_id": "{{ inventory_hostname }}",
    "cluster_nodes": [
      "192.168.1.10:3000",
      "192.168.1.11:3000",
      "192.168.1.12:3000"
    ]
  },
  "database": {
    "host": "{{ postgres_host }}",
    "port": 5432,
    "name": "storycore",
    "user": "storycore",
    "password": "{{ db_password }}"
  },
  "redis": {
    "host": "{{ redis_host }}",
    "port": 6379
  },
  "storage": {
    "type": "s3",
    "bucket": "{{ storage_bucket }}",
    "region": "eu-west-1"
  }
}
```

### 2. Mise à Jour du Cluster

#### Script de Mise à Jour

```bash
#!/bin/bash
# update-cluster.sh

NODES=("192.168.1.10" "192.168.1.11" "192.168.1.12")

for NODE in "${NODES[@]}"; do
    echo "Mise à jour du nœud $NODE"
    
    # Arrêter le service
    ssh $NODE "sudo systemctl stop storycore"
    
    # Sauvegarde
    ssh $NODE "sudo cp -r /opt/storycore /opt/storycore-backup-$(date +%Y%m%d-%H%M%S)"
    
    # Mise à jour
    ssh $NODE "cd /opt/storycore && git pull"
    
    # Redémarrage
    ssh $NODE "sudo systemctl start storycore"
    
    # Vérification
    ssh $NODE "curl -f http://localhost:3000/api/system/status"
    
    echo "Nœud $NODE mis à jour avec succès"
done

echo "Mise à jour du cluster terminée"
```

## Sécurité

### 1. Configuration SSL/TLS

#### Certificats SSL

```bash
# Génération des certificats
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configuration Nginx
server {
    listen 443 ssl;
    server_name storycore.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://storycore_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Sécurité des Communications

#### Configuration du Firewall

```bash
# Configuration UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Autoriser les ports nécessaires
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # StoryCore API
sudo ufw allow 8000/tcp  # ComfyUI
sudo ufw allow 5432/tcp  # PostgreSQL
sudo ufw allow 6379/tcp  # Redis

# Activer le firewall
sudo ufw enable
```

#### Configuration des Réseaux

```yaml
# docker-compose-security.yml
version: '3.8'
services:
  storycore:
    image: storycore:latest
    networks:
      - storycore-internal
      - storycore-external
    environment:
      - DATABASE_HOST=postgres
      - REDIS_HOST=redis
    volumes:
      - ./config:/app/config:ro
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    networks:
      - storycore-internal
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    networks:
      - storycore-internal
    volumes:
      - redis_data:/data

networks:
  storycore-internal:
    internal: true
  storycore-external:
    driver: bridge
```

## Surveillance et Logging

### 1. Configuration de Surveillance

#### Prometheus + Grafana

```yaml
# monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge
```

#### Configuration Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'storycore'
    static_configs:
      - targets: ['192.168.1.10:3000', '192.168.1.11:3000', '192.168.1.12:3000']
    
  - job_name: 'comfyui'
    static_configs:
      - targets: ['192.168.1.20:8000', '192.168.1.21:8000', '192.168.1.22:8000']
```

### 2. Centralisation des Logs

#### ELK Stack

```yaml
# logging.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - logging

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"
    networks:
      - logging

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - logging

networks:
  logging:
    driver: bridge
```

## Dépannage

### 1. Problèmes Courants

#### Problème de Connexion entre Nœuds

**Symptôme** : Les nœuds ne se voient pas dans le cluster

**Solutions** :
```bash
# Vérifier la connectivité réseau
ping 192.168.1.10

# Vérifier les ports
netstat -tlnp | grep 3000

# Vérifier les logs
journalctl -u storycore -f
```

#### Problème de Performance

**Symptôme** : Latence élevée, traitement lent

**Solutions** :
```bash
# Vérifier la charge système
htop

# Vérifier l'utilisation du GPU
nvidia-smi

# Vérifier l'utilisation du réseau
iftop
```

#### Problème de Synchronisation

**Symptôme** : Les données ne sont pas synchronisées entre les nœuds

**Solutions** :
```bash
# Vérifier la base de données
psql -h 192.168.1.100 -U storycore -d storycore -c "SELECT * FROM nodes;"

# Vérifier Redis
redis-cli -h 192.168.1.101 INFO

# Vérifier le stockage S3
aws s3 ls s3://storycore-projects
```

### 2. Scripts de Diagnostic

#### Script de Diagnostic Complet

```bash
#!/bin/bash
# diagnose-cluster.sh

echo "=== Diagnostic du Cluster StoryCore ==="
echo "Date: $(date)"
echo ""

# Vérifier la connectivité réseau
echo "1. Vérification de la connectivité réseau:"
for NODE in 192.168.1.10 192.168.1.11 192.168.1.12; do
    echo "   - Ping vers $NODE: $(ping -c 1 $NODE | grep 'time=')"
done

echo ""

# Vérifier les services
echo "2. Vérification des services StoryCore:"
for NODE in 192.168.1.10 192.168.1.11 192.168.1.12; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$NODE:3000/api/system/status)
    if [ "$STATUS" = "200" ]; then
        echo "   - $NODE: OK"
    else
        echo "   - $NODE: ERREUR ($STATUS)"
    fi
done

echo ""

# Vérifier les instances ComfyUI
echo "3. Vérification des instances ComfyUI:"
for NODE in 192.168.1.20 192.168.1.21 192.168.1.22; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$NODE:8000)
    if [ "$STATUS" = "200" ]; then
        echo "   - $NODE: OK"
    else
        echo "   - $NODE: ERREUR ($STATUS)"
    fi
done

echo ""

# Vérifier la base de données
echo "4. Vérification de la base de données:"
DB_STATUS=$(psql -h 192.168.1.100 -U storycore -d storycore -c "SELECT 1;" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   - Base de données: OK"
else
    echo "   - Base de données: ERREUR"
fi

echo ""

# Vérifier Redis
echo "5. Vérification Redis:"
REDIS_STATUS=$(redis-cli -h 192.168.1.101 ping 2>/dev/null)
if [ "$REDIS_STATUS" = "PONG" ]; then
    echo "   - Redis: OK"
else
    echo "   - Redis: ERREUR"
fi

echo ""
echo "=== Fin du Diagnostic ==="
```

---

*Pour plus d'informations, consultez la [Documentation Technique](../TECHNICAL_GUIDE.md).*