"""
Production Deployment Configuration for AI Enhancement System

This module provides production-ready configuration management, model deployment
and update mechanisms, and monitoring/alerting for AI operations.

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
import time


logger = logging.getLogger(__name__)


class DeploymentEnvironment(Enum):
    """Deployment environment types"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ModelDeploymentConfig:
    """Configuration for model deployment"""
    model_name: str
    model_version: str
    model_path: str
    checksum: str
    deployment_date: str
    environment: DeploymentEnvironment
    enabled: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MonitoringConfig:
    """Configuration for monitoring and alerting"""
    enable_metrics: bool = True
    enable_alerts: bool = True
    metrics_interval: float = 60.0  # seconds
    alert_thresholds: Dict[str, float] = field(default_factory=lambda: {
        "error_rate": 0.05,  # 5% error rate
        "latency_p95": 5.0,  # 5 seconds
        "memory_usage": 0.9,  # 90% memory usage
        "gpu_utilization": 0.95  # 95% GPU utilization
    })
    alert_cooldown: float = 300.0  # 5 minutes between same alerts


@dataclass
class ProductionConfig:
    """Production deployment configuration"""
    environment: DeploymentEnvironment
    config_version: str = "1.0"
    
    # Model configuration
    model_cache_dir: str = "./models/cache"
    model_registry_path: str = "./models/registry.json"
    max_model_cache_size_gb: float = 10.0
    
    # Performance configuration
    max_concurrent_jobs: int = 4
    job_timeout_seconds: float = 300.0
    enable_gpu: bool = True
    gpu_memory_fraction: float = 0.8
    
    # Monitoring configuration
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
    
    # Logging configuration
    log_level: str = "INFO"
    log_file: Optional[str] = "./logs/production.log"
    enable_structured_logging: bool = True
    
    # Security configuration
    enable_authentication: bool = True
    api_key_required: bool = True
    rate_limit_per_minute: int = 60
    
    # Backup configuration
    enable_auto_backup: bool = True
    backup_interval_hours: float = 24.0
    backup_retention_days: int = 7
    
    # Feature flags
    feature_flags: Dict[str, bool] = field(default_factory=lambda: {
        "style_transfer": True,
        "super_resolution": True,
        "content_aware_interpolation": True,
        "quality_optimization": True,
        "batch_processing": True,
        "real_time_preview": True
    })


class ProductionConfigManager:
    """
    Manages production configuration with environment-specific settings.
    """
    
    def __init__(self, config_dir: str = "./.config"):
        """
        Initialize production config manager.
        
        Args:
            config_dir: Directory for configuration files
        """
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
        self.current_config: Optional[ProductionConfig] = None
        self.config_file = self.config_dir / "production.json"
        
        logger.info(f"Production config manager initialized (dir: {config_dir})")
    
    def load_config(
        self,
        environment: Optional[DeploymentEnvironment] = None
    ) -> ProductionConfig:
        """
        Load configuration for specified environment.
        
        Args:
            environment: Deployment environment (defaults to DEVELOPMENT)
        
        Returns:
            Production configuration
        """
        env = environment or DeploymentEnvironment.DEVELOPMENT
        
        # Try to load from file
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    config_data = json.load(f)
                
                # Convert environment string to enum
                if 'environment' in config_data:
                    config_data['environment'] = DeploymentEnvironment(config_data['environment'])
                
                # Convert monitoring config
                if 'monitoring' in config_data:
                    config_data['monitoring'] = MonitoringConfig(**config_data['monitoring'])
                
                config = ProductionConfig(**config_data)
                logger.info(f"Loaded config from {self.config_file}")
            except Exception as e:
                logger.warning(f"Failed to load config: {e}, using defaults")
                config = ProductionConfig(environment=env)
        else:
            # Create default config
            config = ProductionConfig(environment=env)
            logger.info(f"Created default config for {env.value}")
        
        self.current_config = config
        return config
    
    def save_config(self, config: Optional[ProductionConfig] = None) -> None:
        """
        Save configuration to file.
        
        Args:
            config: Configuration to save (defaults to current config)
        """
        cfg = config or self.current_config
        if not cfg:
            raise ValueError("No configuration to save")
        
        # Convert to dict
        config_dict = asdict(cfg)
        config_dict['environment'] = cfg.environment.value
        
        # Save to file
        with open(self.config_file, 'w') as f:
            json.dump(config_dict, f, indent=2)
        
        logger.info(f"Saved config to {self.config_file}")
    
    def update_config(self, updates: Dict[str, Any]) -> ProductionConfig:
        """
        Update current configuration.
        
        Args:
            updates: Configuration updates
        
        Returns:
            Updated configuration
        """
        if not self.current_config:
            self.load_config()
        
        # Apply updates
        for key, value in updates.items():
            if hasattr(self.current_config, key):
                setattr(self.current_config, key, value)
                logger.info(f"Updated config: {key} = {value}")
        
        # Save updated config
        self.save_config()
        
        return self.current_config
    
    def get_config(self) -> ProductionConfig:
        """
        Get current configuration.
        
        Returns:
            Current production configuration
        """
        if not self.current_config:
            self.load_config()
        return self.current_config


class ModelDeploymentManager:
    """
    Manages model deployment and updates in production.
    """
    
    def __init__(self, config: ProductionConfig):
        """
        Initialize model deployment manager.
        
        Args:
            config: Production configuration
        """
        self.config = config
        self.registry_path = Path(config.model_registry_path)
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        
        self.deployed_models: Dict[str, ModelDeploymentConfig] = {}
        self._load_registry()
        
        logger.info("Model deployment manager initialized")
    
    def _load_registry(self) -> None:
        """Load model registry from file"""
        if self.registry_path.exists():
            try:
                with open(self.registry_path, 'r') as f:
                    registry_data = json.load(f)
                
                for model_id, model_data in registry_data.items():
                    model_data['environment'] = DeploymentEnvironment(model_data['environment'])
                    self.deployed_models[model_id] = ModelDeploymentConfig(**model_data)
                
                logger.info(f"Loaded {len(self.deployed_models)} models from registry")
            except Exception as e:
                logger.error(f"Failed to load model registry: {e}")
    
    def _save_registry(self) -> None:
        """Save model registry to file"""
        registry_data = {}
        for model_id, model_config in self.deployed_models.items():
            config_dict = asdict(model_config)
            config_dict['environment'] = model_config.environment.value
            registry_data[model_id] = config_dict
        
        with open(self.registry_path, 'w') as f:
            json.dump(registry_data, f, indent=2)
        
        logger.info(f"Saved {len(self.deployed_models)} models to registry")
    
    def deploy_model(
        self,
        model_name: str,
        model_version: str,
        model_path: str,
        checksum: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ModelDeploymentConfig:
        """
        Deploy a new model or update existing model.
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
            model_path: Path to model files
            checksum: Model checksum for verification
            metadata: Optional metadata
        
        Returns:
            Model deployment configuration
        """
        model_id = f"{model_name}:{model_version}"
        
        deployment_config = ModelDeploymentConfig(
            model_name=model_name,
            model_version=model_version,
            model_path=model_path,
            checksum=checksum,
            deployment_date=time.strftime("%Y-%m-%d %H:%M:%S"),
            environment=self.config.environment,
            enabled=True,
            metadata=metadata or {}
        )
        
        self.deployed_models[model_id] = deployment_config
        self._save_registry()
        
        logger.info(f"Deployed model: {model_id}")
        
        return deployment_config
    
    def update_model(
        self,
        model_name: str,
        model_version: str,
        updates: Dict[str, Any]
    ) -> Optional[ModelDeploymentConfig]:
        """
        Update deployed model configuration.
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
            updates: Configuration updates
        
        Returns:
            Updated model configuration or None if not found
        """
        model_id = f"{model_name}:{model_version}"
        
        if model_id not in self.deployed_models:
            logger.warning(f"Model not found: {model_id}")
            return None
        
        model_config = self.deployed_models[model_id]
        
        for key, value in updates.items():
            if hasattr(model_config, key):
                setattr(model_config, key, value)
        
        self._save_registry()
        
        logger.info(f"Updated model: {model_id}")
        
        return model_config
    
    def enable_model(self, model_name: str, model_version: str) -> bool:
        """
        Enable a deployed model.
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
        
        Returns:
            True if successful, False otherwise
        """
        return self.update_model(model_name, model_version, {"enabled": True}) is not None
    
    def disable_model(self, model_name: str, model_version: str) -> bool:
        """
        Disable a deployed model.
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
        
        Returns:
            True if successful, False otherwise
        """
        return self.update_model(model_name, model_version, {"enabled": False}) is not None
    
    def get_deployed_models(
        self,
        enabled_only: bool = False
    ) -> List[ModelDeploymentConfig]:
        """
        Get list of deployed models.
        
        Args:
            enabled_only: Only return enabled models
        
        Returns:
            List of model deployment configurations
        """
        models = list(self.deployed_models.values())
        
        if enabled_only:
            models = [m for m in models if m.enabled]
        
        return models
    
    def get_model(
        self,
        model_name: str,
        model_version: str
    ) -> Optional[ModelDeploymentConfig]:
        """
        Get specific model configuration.
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
        
        Returns:
            Model configuration or None if not found
        """
        model_id = f"{model_name}:{model_version}"
        return self.deployed_models.get(model_id)


class ProductionMonitor:
    """
    Monitors production system and generates alerts.
    """
    
    def __init__(self, config: MonitoringConfig):
        """
        Initialize production monitor.
        
        Args:
            config: Monitoring configuration
        """
        self.config = config
        self.metrics: Dict[str, List[float]] = {}
        self.last_alert_time: Dict[str, float] = {}
        
        logger.info("Production monitor initialized")
    
    def record_metric(self, metric_name: str, value: float) -> None:
        """
        Record a metric value.
        
        Args:
            metric_name: Name of the metric
            value: Metric value
        """
        if not self.config.enable_metrics:
            return
        
        if metric_name not in self.metrics:
            self.metrics[metric_name] = []
        
        self.metrics[metric_name].append(value)
        
        # Keep only recent metrics (last 1000 values)
        if len(self.metrics[metric_name]) > 1000:
            self.metrics[metric_name] = self.metrics[metric_name][-1000:]
        
        # Check thresholds
        self._check_threshold(metric_name, value)
    
    def _check_threshold(self, metric_name: str, value: float) -> None:
        """Check if metric exceeds threshold and generate alert"""
        if not self.config.enable_alerts:
            return
        
        threshold = self.config.alert_thresholds.get(metric_name)
        if threshold is None:
            return
        
        # Check cooldown
        last_alert = self.last_alert_time.get(metric_name, 0)
        if time.time() - last_alert < self.config.alert_cooldown:
            return
        
        # Check threshold
        if value > threshold:
            severity = AlertSeverity.WARNING
            if value > threshold * 1.2:
                severity = AlertSeverity.ERROR
            if value > threshold * 1.5:
                severity = AlertSeverity.CRITICAL
            
            self._generate_alert(
                metric_name,
                severity,
                f"{metric_name} exceeded threshold: {value:.2f} > {threshold:.2f}"
            )
            
            self.last_alert_time[metric_name] = time.time()
    
    def _generate_alert(
        self,
        metric_name: str,
        severity: AlertSeverity,
        message: str
    ) -> None:
        """Generate an alert"""
        alert = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "metric": metric_name,
            "severity": severity.value,
            "message": message
        }
        
        # Log alert
        if severity == AlertSeverity.CRITICAL:
            logger.critical(f"ALERT: {message}")
        elif severity == AlertSeverity.ERROR:
            logger.error(f"ALERT: {message}")
        elif severity == AlertSeverity.WARNING:
            logger.warning(f"ALERT: {message}")
        else:
            logger.info(f"ALERT: {message}")
        
        # In production, this would send to alerting system (PagerDuty, Slack, etc.)
    
    def get_metrics_summary(self) -> Dict[str, Dict[str, float]]:
        """
        Get summary of all metrics.
        
        Returns:
            Dictionary of metric summaries
        """
        import statistics
        
        summary = {}
        
        for metric_name, values in self.metrics.items():
            if not values:
                continue
            
            summary[metric_name] = {
                "count": len(values),
                "mean": statistics.mean(values),
                "median": statistics.median(values),
                "min": min(values),
                "max": max(values),
                "stdev": statistics.stdev(values) if len(values) > 1 else 0.0
            }
        
        return summary
