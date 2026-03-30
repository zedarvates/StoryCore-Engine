# Large-scale Deployment Guide (v3.0)

This guide describes how to deploy StoryCore Engine in a high-availability production environment using Docker, Nginx, and GPU acceleration.

## Prerequisites

- **Docker & Docker Compose (v2.0+)**
- **NVIDIA Container Toolkit** (for GPU access inside Docker)
- **At least 32GB RAM** (64GB recommended for Hunyuan)
- **NVIDIA GPU with 16GB VRAM minimum** (24GB+ for Ultra quality)
- **100GB+ Storage space**

## Infrastructure Overview

The production stack consists of:

| Service | Scaling | Persistence |
| :--- | :--- | :--- |
| **Nginx Proxy** | 1 instance | Static assets & Certs |
| **Backend API** | Horizontal Scale (3+ replicas) | storycore_data |
| **Ollama (LLM)** | GPU Accelerated | Models cache |
| **ComfyUI (Video)** | GPU Accelerated | Models & Outputs |
| **PostgreSQL** | Standalone | Database volume |
| **Redis** | Standalone | Cache volume |

## Quick Start (Production)

### 1. Prepare Environment

```bash
# Move to the deployment folder
cd deployment

# Create certificates folder
mkdir certs

# Copy and edit production environment file
cp ../.env.production .env
```

### 2. Configure GPU Support

Ensure your `docker-compose.yml` points to the correct NVIDIA drivers. Replicas for `backend` can be adjusted based on your server capacity.

### 3. Build & Launch

```bash
# Launch the entire production stack
docker-compose -f production.docker-compose.yml up --build -d
```

### 4. Horizontal Scaling

To increase backend capacity on the fly:

```bash
docker-compose -f production.docker-compose.yml up --scale backend=5 -d
```

## Security Best Practices

- **SSL/TLS**: Place your SSL certificates in `deployment/certs/` and update `nginx.conf` accordingly.
- **Port Masking**: Nginx is the only service that should have ports exposed (80/443). All other services communicate via the internal bridge network.
- **Secrets Management**: For critical production, use Docker Secrets or a Vault to store `JWT_SECRET` and database passwords.
- **Resource Limits**: The `backend` instances are limited to 8GB RAM each to prevent memory leaks from starving the system.

## Monitoring & Health Checks

The system is configured with self-healing health checks:
- **Nginx proxy** periodically checks backend health.
- **Docker** will automatically restart any crashed replica.
- **Grafana/Prometheus** can be added by uncommenting monitoring services in the main `docker-compose.yml`.

---
**Maintained by:** StoryCore Ops Team  
**Last Update:** March 26, 2026
