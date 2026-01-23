# Guide de Déploiement de Production pour StoryCore Engine

## Introduction

Ce guide fournit des instructions détaillées pour déployer StoryCore Engine en production. Il couvre la configuration, le déploiement des modèles, la surveillance et la gestion des alertes.

## Prérequis

Avant de commencer le déploiement, assurez-vous que les éléments suivants sont en place :

1. **Environnement Serveur** :
   - Serveur avec Ubuntu 22.04 LTS ou version ultérieure
   - Accès root ou sudo
   - Connexion Internet stable

2. **Dépendances Logicielles** :
   - Python 3.10 ou version ultérieure
   - Node.js 18.0 ou version ultérieure
   - Docker et Docker Compose
   - NVIDIA CUDA 11.8 (pour l'accélération GPU)
   - NVIDIA cuDNN 8.6

3. **Matériel Requis** :
   - CPU : 8 cœurs minimum
   - RAM : 32 Go minimum
   - GPU : NVIDIA avec au moins 16 Go de mémoire (recommandé pour les modèles d'IA)
   - Stockage : 500 Go SSD minimum

## Configuration

### 1. Configuration de l'Environnement

#### Variables d'Environnement

Créez un fichier `.env.production` à la racine du projet avec les variables suivantes :

```bash
# Configuration du serveur
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
ENVIRONMENT=production

# Configuration de la base de données
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=storycore_prod
DB_USER=storycore_admin
DB_PASSWORD=secure_password_here

# Configuration des modèles
MODEL_PATH=/models

# Configuration de la surveillance
MONITORING_ENABLED=true
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
```

#### Fichier de Configuration

Le fichier de configuration principal se trouve dans `config/production_config.yaml`. Assurez-vous qu'il est correctement configuré pour votre environnement.

### 2. Installation des Dépendances

Exécutez les commandes suivantes pour installer les dépendances :

```bash
# Mettre à jour les paquets système
sudo apt update && sudo apt upgrade -y

# Installer les dépendances système
sudo apt install -y python3 python3-pip python3-venv nodejs npm docker.io docker-compose

# Installer les dépendances Python
pip install -r requirements.txt

# Installer les dépendances Node.js
npm install
```

## Déploiement

### 1. Déploiement des Modèles

Utilisez le script `scripts/deploy_models.py` pour déployer les modèles d'IA :

```bash
python scripts/deploy_models.py
```

Ce script effectue les actions suivantes :
- Sauvegarde les modèles existants
- Déploie les nouveaux modèles
- Vérifie l'intégrité des modèles
- Met à jour les configurations nécessaires

### 2. Déploiement de l'Application

Utilisez le script `scripts/deployment_pipeline.py` pour déployer l'application complète :

```bash
python scripts/deployment_pipeline.py
```

Ce script effectue les actions suivantes :
- Vérifications pré-déploiement
- Déploiement de l'infrastructure
- Déploiement des modèles
- Déploiement de l'application
- Tests post-déploiement
- Surveillance du déploiement

### 3. Configuration des Services

Configurez les services pour qu'ils démarrent automatiquement au démarrage du système :

```bash
# Créer un service systemd pour StoryCore
sudo nano /etc/systemd/system/storycore.service
```

Ajoutez la configuration suivante :

```ini
[Unit]
Description=StoryCore Engine
After=network.target

[Service]
User=storycore
WorkingDirectory=/path/to/storycore-engine
ExecStart=/usr/bin/python3 /path/to/storycore-engine/storycore.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Activez et démarrez le service :

```bash
sudo systemctl daemon-reload
sudo systemctl enable storycore
sudo systemctl start storycore
```

## Surveillance et Alertes

### 1. Surveillance des Opérations d'IA

Utilisez le script `scripts/monitor_ai_operations.py` pour surveiller les opérations d'IA :

```bash
python scripts/monitor_ai_operations.py
```

Ce script effectue les actions suivantes :
- Surveille l'utilisation des ressources système (CPU, mémoire, GPU)
- Vérifie les performances des modèles
- Envoie des alertes en cas de problèmes

### 2. Configuration des Alertes

Les alertes sont configurées dans le fichier `config/production_config.yaml`. Vous pouvez configurer les éléments suivants :

- **Alertes par Email** : Configurez le serveur SMTP, l'expéditeur et les destinataires.
- **Alertes Slack** : Configurez le webhook Slack pour recevoir des alertes dans vos canaux Slack.

### 3. Tableau de Bord de Surveillance

Pour visualiser les métriques de surveillance, vous pouvez configurer Prometheus et Grafana :

```bash
# Installer Prometheus et Grafana
sudo apt install -y prometheus grafana

# Configurer Prometheus
sudo nano /etc/prometheus/prometheus.yml
```

Ajoutez la configuration suivante pour surveiller StoryCore :

```yaml
scrape_configs:
  - job_name: 'storycore'
    static_configs:
      - targets: ['localhost:8080']
```

Redémarrez les services :

```bash
sudo systemctl restart prometheus
sudo systemctl restart grafana
```

Accédez au tableau de bord Grafana à l'adresse `http://votre-serveur:3000`.

## Mise à Jour des Modèles

### 1. Mise à Jour des Modèles

Pour mettre à jour les modèles, utilisez le script `scripts/deploy_models.py` avec les nouveaux chemins des modèles :

```bash
python scripts/deploy_models.py --update
```

### 2. Rollback des Modèles

En cas de problème avec les nouveaux modèles, vous pouvez effectuer un rollback vers la version précédente :

```bash
python scripts/deploy_models.py --rollback
```

## Gestion des Problèmes

### 1. Journalisation

Les journaux sont stockés dans `/var/log/storycore/`. Vous pouvez consulter les journaux pour diagnostiquer les problèmes :

```bash
# Afficher les journaux de l'application
tail -f /var/log/storycore/production.log

# Afficher les journaux de déploiement
tail -f /var/log/storycore/deployment_pipeline.log

# Afficher les journaux de surveillance
tail -f /var/log/storycore/monitor_ai_operations.log
```

### 2. Problèmes Courants

#### Problème : Échec du Déploiement des Modèles

**Solution** :
1. Vérifiez que les chemins des modèles sont corrects.
2. Assurez-vous que les modèles sont accessibles.
3. Consultez les journaux pour plus de détails.

#### Problème : Alertes Fréquentes

**Solution** :
1. Vérifiez les seuils d'alerte dans le fichier de configuration.
2. Ajustez les seuils si nécessaire.
3. Vérifiez l'utilisation des ressources système.

#### Problème : Problèmes de Performance

**Solution** :
1. Vérifiez les performances des modèles.
2. Ajustez les paramètres de performance dans le fichier de configuration.
3. Consultez les journaux pour plus de détails.

## Conclusion

Ce guide fournit une vue d'ensemble complète du déploiement de StoryCore Engine en production. Suivez les étapes décrites pour assurer un déploiement réussi et une surveillance efficace des opérations d'IA.

Pour plus d'informations, consultez la documentation complète dans le dossier `docs/`.

## Annexes

### Commandes Utiles

- **Redémarrer les services** :
  ```bash
  sudo systemctl restart storycore
  sudo systemctl restart prometheus
  sudo systemctl restart grafana
  ```

- **Vérifier l'état des services** :
  ```bash
  sudo systemctl status storycore
  sudo systemctl status prometheus
  sudo systemctl status grafana
  ```

- **Vérifier l'utilisation des ressources** :
  ```bash
  top
  htop
  nvidia-smi
  ```

### Fichiers de Configuration Importants

- `config/production_config.yaml` : Configuration principale de production
- `.env.production` : Variables d'environnement de production
- `scripts/deploy_models.py` : Script de déploiement des modèles
- `scripts/monitor_ai_operations.py` : Script de surveillance des opérations d'IA
- `scripts/deployment_pipeline.py` : Script de pipeline de déploiement

### Références

- [Documentation Officielle de StoryCore Engine](https://storycore-engine.com/docs)
- [Guide de Configuration de Prometheus](https://prometheus.io/docs/introduction/overview/)
- [Guide de Configuration de Grafana](https://grafana.com/docs/)
- [Documentation de Docker](https://docs.docker.com/)
- [Documentation de NVIDIA CUDA](https://docs.nvidia.com/cuda/)