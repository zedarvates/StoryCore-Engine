"""
Data models for production deployment management.

This module contains the core data structures used throughout the deployment system.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime


@dataclass
class DeploymentConfig:
    """Configuration for production deployment"""

    # Environment settings
    environment: str = "production"  # development, staging, production
    deployment_name: str = "advanced-workflows"
    version: str = "1.0.0"

    # Infrastructure settings
    min_vram_gb: float = 16.0
    min_ram_gb: float = 32.0
    min_storage_gb: float = 100.0
    required_cuda_version: str = "11.8"

    # Service settings
    enable_monitoring: bool = True
    enable_health_checks: bool = True
    enable_auto_scaling: bool = False
    enable_backup: bool = True

    # Performance settings
    max_concurrent_requests: int = 4
    request_timeout_seconds: int = 300
    model_cache_size_gb: float = 20.0

    # Monitoring settings
    metrics_collection_interval: int = 30
    health_check_interval: int = 60
    log_retention_days: int = 30

    # Alerting settings
    alert_email: Optional[str] = None
    alert_webhook: Optional[str] = None
    alert_thresholds: Dict[str, float] = field(default_factory=lambda: {
        "cpu_usage": 80.0,
        "memory_usage": 85.0,
        "gpu_usage": 90.0,
        "error_rate": 5.0,
        "response_time": 30.0
    })


@dataclass
class HealthCheckResult:
    """Result of a health check"""
    component: str
    status: str  # healthy, warning, critical
    message: str
    timestamp: datetime
    metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DeploymentStatus:
    """Current deployment status"""
    deployment_id: str
    status: str  # deploying, healthy, degraded, failed
    version: str
    start_time: datetime
    last_health_check: datetime
    active_workflows: List[str]
    performance_metrics: Dict[str, float]
    error_count: int = 0
    warning_count: int = 0