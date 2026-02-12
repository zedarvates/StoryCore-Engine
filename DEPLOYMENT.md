# StoryCore Engine - Deployment Guide

## Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- 16GB RAM minimum
- 100GB SSD storage

## Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/storycore-engine.git
cd storycore-engine

# Setup environment
cp .env.example .env.production
# Edit .env.production with your values

# Deploy
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f backend
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    StoryCore Engine                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  Frontend │──│  Backend │──│  LLM AI  │                   │
│  │  (React)  │  │ (FastAPI)│  │ (Ollama) │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│       │              │              │                         │
│       └──────────────┼──────────────┘                         │
│                      ▼                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  ComfyUI │  │PostgreSQL│  │  Redis   │                   │
│  │(Image Gen)│  │ (Database)│  │  (Cache) │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │Prometheus│  │  Grafana │  │Elastic   │                   │
│  │(Metrics) │  │  (Dash)  │  │  Stack   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| JWT_SECRET | Yes | Secret for JWT tokens |
| DATABASE_URL | Yes | PostgreSQL connection string |
| REDIS_URL | Yes | Redis connection string |
| GRAFANA_PASSWORD | Yes | Grafana admin password |
| LLM_API_URL | No | Custom LLM service URL |

## Monitoring

- **Metrics**: http://localhost:9090
- **Dashboard**: http://localhost:3000
- **Logs**: http://localhost:5601

## Troubleshooting

```bash
# Check backend logs
docker-compose logs -f backend

# Check database connection
docker-compose exec backend python -c "import asyncio; from backend.database import engine; asyncio.run(engine.connect())"

# Restart services
docker-compose restart backend

# Clear cache
docker-compose exec redis redis-cli FLUSHALL
```

## Updating

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Cleanup old images
docker system prune -a
```
