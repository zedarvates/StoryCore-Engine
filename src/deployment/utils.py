"""
Utility functions for deployment management.

This module contains helper functions for deployment scripts and procedures.
"""

import logging
import os

logger = logging.getLogger(__name__)


# Utility functions for deployment scripts
def create_deployment_scripts():
    """Create deployment scripts and procedures"""

    # Docker deployment script
    docker_script = """#!/bin/bash
# Advanced ComfyUI Workflows - Docker Deployment Script

set -e

echo "Starting Advanced ComfyUI Workflows deployment..."

# Build Docker image
docker build -t advanced-comfyui-workflows:latest .

# Create network
docker network create comfyui-network || true

# Run deployment
docker run -d \\
    --name advanced-workflows \\
    --network comfyui-network \\
    --gpus all \\
    -p 8080:8080 \\
    -v $(pwd)/models:/app/models \\
    -v $(pwd)/outputs:/app/outputs \\
    -v $(pwd)/config:/app/config \\
    -e ENVIRONMENT=production \\
    advanced-comfyui-workflows:latest

echo "Deployment completed successfully!"
"""

    # Kubernetes deployment
    k8s_deployment = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: advanced-comfyui-workflows
  labels:
    app: advanced-workflows
spec:
  replicas: 2
  selector:
    matchLabels:
      app: advanced-workflows
  template:
    metadata:
      labels:
        app: advanced-workflows
    spec:
      containers:
      - name: advanced-workflows
        image: advanced-comfyui-workflows:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "32Gi"
            nvidia.com/gpu: 1
          limits:
            memory: "64Gi"
            nvidia.com/gpu: 1
        env:
        - name: ENVIRONMENT
          value: "production"
        volumeMounts:
        - name: models-storage
          mountPath: /app/models
        - name: config-storage
          mountPath: /app/config
      volumes:
      - name: models-storage
        persistentVolumeClaim:
          claimName: models-pvc
      - name: config-storage
        configMap:
          name: workflow-config
---
apiVersion: v1
kind: Service
metadata:
  name: advanced-workflows-service
spec:
  selector:
    app: advanced-workflows
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
"""

    # Save deployment scripts
    os.makedirs("deployment", exist_ok=True)

    with open("deployment/docker-deploy.sh", "w") as f:
        f.write(docker_script)

    with open("deployment/k8s-deployment.yaml", "w") as f:
        f.write(k8s_deployment)

    # Make scripts executable
    os.chmod("deployment/docker-deploy.sh", 0o755)

    logger.info("Deployment scripts created successfully")