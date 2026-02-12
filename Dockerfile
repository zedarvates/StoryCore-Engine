# ============================================
# StoryCore Engine - Production Dockerfile
# ============================================

# Stage 1: Builder
FROM python:3.11-slim-bookworm AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libc-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt backend/requirements_api.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt -r backend/requirements_api.txt

# Stage 2: Production
FROM python:3.11-slim-bookworm AS production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages
COPY --from=builder /install /usr/local

# Copy application
COPY backend/ ./backend/
COPY data/ ./data/
COPY .env.example ./

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Expose port
EXPOSE 8080

# Entrypoint
CMD ["python", "-m", "uvicorn", "backend.main_api:app", "--host", "0.0.0.0", "--port", "8080"]
