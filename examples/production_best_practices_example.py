#!/usr/bin/env python3
"""
Example: Production-ready configuration management with monitoring and validation
"""

import sys
import logging
import time
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum

# Add src directory to path for imports
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from advanced_workflow_config import (
    ConfigurationManager,
    AdvancedWorkflowConfig,
    QualityLevel,
    Environment
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConfigHealthStatus(Enum):
    """Configuration health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@dataclass
class ConfigHealthCheck:
    """Result of configuration health check"""
    status: ConfigHealthStatus
    issues: List[str]
    warnings: List[str]
    recommendations: List[str]
    last_check: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value,
            "issues": self.issues,
            "warnings": self.warnings,
            "recommendations": self.recommendations,
            "last_check": self.last_check
        }

class ProductionConfigManager:
    """Production-ready configuration manager with monitoring and validation"""

    def __init__(self, config_dir: Optional[Path] = None, environment: str = "production"):
        self.config_manager = ConfigurationManager(config_dir)
        self.environment = Environment(environment.lower())
        self.config_history: List[Dict[str, Any]] = []
        self.health_checks: List[ConfigHealthCheck] = []
        self.max_history_size = 50

        # Production settings
        self.enable_audit_logging = True
        self.enable_config_backup = True
        self.health_check_interval = 300  # 5 minutes

    def load_production_config(self, config_path: Optional[Path] = None) -> AdvancedWorkflowConfig:
        """
        Load configuration with production safety checks

        Args:
            config_path: Path to configuration file

        Returns:
            Validated production configuration
        """
        logger.info(f"Loading production configuration for {self.environment.value} environment")

        # Load base configuration
        config = self.config_manager.load_config(config_path)

        # Apply environment-specific overrides
        config = self._apply_environment_overrides(config)

        # Validate for production use
        validation_result = self._validate_production_readiness(config)
        if not validation_result["ready"]:
            raise ValueError(f"Configuration not production-ready: {validation_result['issues']}")

        # Apply production hardening
        config = self._apply_production_hardening(config)

        # Record in history
        self._record_config_change(config, "loaded")

        logger.info("Production configuration loaded successfully")
        return config

    def _apply_environment_overrides(self, config: AdvancedWorkflowConfig) -> AdvancedWorkflowConfig:
        """Apply environment-specific configuration overrides"""

        # Production-specific settings
        if self.environment == Environment.PRODUCTION:
            config.debug_mode = False
            config.log_level = "WARNING"
            config.auto_retry_on_failure = True
            config.max_retries = 3
            config.enable_quality_monitoring = True

            # Conservative memory settings for production
            if config.max_memory_usage_gb > 24.0:
                logger.warning(f"Reducing memory usage from {config.max_memory_usage_gb}GB to 24GB for production stability")
                config.max_memory_usage_gb = 24.0

        # Staging settings
        elif self.environment == Environment.STAGING:
            config.debug_mode = True
            config.log_level = "INFO"
            config.enable_quality_monitoring = True

        # Development settings
        elif self.environment == Environment.DEVELOPMENT:
            config.debug_mode = True
            config.log_level = "DEBUG"
            config.enable_caching = False  # Disable caching for development

        return config

    def _validate_production_readiness(self, config: AdvancedWorkflowConfig) -> Dict[str, Any]:
        """Validate configuration for production use"""
        result = {"ready": True, "issues": [], "warnings": []}

        # Critical validations
        if config.max_memory_usage_gb <= 0:
            result["issues"].append("Memory usage must be positive")
            result["ready"] = False

        if config.batch_size < 1:
            result["issues"].append("Batch size must be at least 1")
            result["ready"] = False

        # Production-specific checks
        if self.environment == Environment.PRODUCTION:
            if not config.enable_quality_monitoring:
                result["warnings"].append("Quality monitoring should be enabled in production")

            if config.max_retries < 2:
                result["warnings"].append("Consider increasing max_retries for production reliability")

            if config.max_memory_usage_gb > 32.0:
                result["warnings"].append("High memory usage detected - monitor system resources")

        # Workflow-specific validations
        enabled_workflows = []
        if config.enable_hunyuan: enabled_workflows.append("HunyuanVideo")
        if config.enable_wan: enabled_workflows.append("Wan")
        if config.enable_newbie: enabled_workflows.append("NewBie")
        if config.enable_qwen: enabled_workflows.append("Qwen")

        if not enabled_workflows:
            result["issues"].append("No workflows enabled")
            result["ready"] = False
        elif len(enabled_workflows) == 1:
            result["warnings"].append(f"Only one workflow enabled: {enabled_workflows[0]}")

        return result

    def _apply_production_hardening(self, config: AdvancedWorkflowConfig) -> AdvancedWorkflowConfig:
        """Apply production hardening settings"""

        # Enable safety features
        config.auto_retry_on_failure = True
        config.enable_auto_routing = True
        config.fallback_to_basic = True

        # Set reasonable timeouts and limits
        if not hasattr(config, 'execution_timeout_seconds'):
            config.execution_timeout_seconds = 300  # 5 minutes

        if not hasattr(config, 'max_concurrent_executions'):
            config.max_concurrent_executions = 3  # Limit concurrent executions

        return config

    def _record_config_change(self, config: AdvancedWorkflowConfig, action: str):
        """Record configuration change in history"""
        record = {
            "timestamp": time.time(),
            "action": action,
            "environment": self.environment.value,
            "quality_level": config.quality_level.value,
            "max_memory_gb": config.max_memory_usage_gb,
            "batch_size": config.batch_size,
            "enabled_workflows": {
                "hunyuan": config.enable_hunyuan,
                "wan": config.enable_wan,
                "newbie": config.enable_newbie,
                "qwen": config.enable_qwen
            }
        }

        self.config_history.append(record)

        # Limit history size
        if len(self.config_history) > self.max_history_size:
            self.config_history = self.config_history[-self.max_history_size:]

        # Audit logging
        if self.enable_audit_logging:
            logger.info(f"Config change recorded: {action} - Quality: {config.quality_level.value}")

    def perform_health_check(self) -> ConfigHealthCheck:
        """Perform comprehensive configuration health check"""
        issues = []
        warnings = []
        recommendations = []

        # Load current config for validation
        try:
            config = self.load_production_config()

            # Check configuration age (should be reloaded periodically)
            # Check for deprecated settings
            # Check resource utilization vs. configuration

            if config.max_memory_usage_gb > 24.0 and self.environment == Environment.PRODUCTION:
                warnings.append("High memory configuration in production")

            if config.batch_size > 2 and config.max_memory_usage_gb < 16.0:
                issues.append("Batch size may exceed memory capacity")

            if not config.enable_caching:
                recommendations.append("Consider enabling caching for better performance")

        except Exception as e:
            issues.append(f"Configuration health check failed: {str(e)}")

        # Determine status
        if issues:
            status = ConfigHealthStatus.UNHEALTHY
        elif warnings:
            status = ConfigHealthStatus.DEGRADED
        else:
            status = ConfigHealthStatus.HEALTHY

        health_check = ConfigHealthCheck(
            status=status,
            issues=issues,
            warnings=warnings,
            recommendations=recommendations,
            last_check=time.time()
        )

        self.health_checks.append(health_check)
        return health_check

    def get_production_metrics(self) -> Dict[str, Any]:
        """Get production configuration metrics"""
        if not self.config_history:
            return {"message": "No configuration history available"}

        latest_config = self.config_history[-1]

        # Calculate metrics
        total_changes = len(self.config_history)
        time_span = time.time() - self.config_history[0]["timestamp"] if len(self.config_history) > 1 else 0
        change_frequency = total_changes / (time_span / 86400) if time_span > 0 else 0  # changes per day

        return {
            "environment": self.environment.value,
            "total_config_changes": total_changes,
            "change_frequency_per_day": round(change_frequency, 2),
            "current_quality_level": latest_config["quality_level"],
            "current_memory_usage_gb": latest_config["max_memory_gb"],
            "current_batch_size": latest_config["batch_size"],
            "enabled_workflows_count": sum(latest_config["enabled_workflows"].values()),
            "last_change_timestamp": latest_config["timestamp"],
            "health_check_count": len(self.health_checks)
        }

    def create_backup_config(self, config: AdvancedWorkflowConfig, reason: str = "manual") -> bool:
        """Create backup of current configuration"""
        if not self.enable_config_backup:
            return True

        try:
            backup_name = f"backup_{int(time.time())}_{reason}"
            backup_path = self.config_manager.backup_dir / f"{backup_name}.yaml"

            success = self.config_manager.save_config(config, backup_path)
            if success:
                logger.info(f"Configuration backup created: {backup_path}")
            return success

        except Exception as e:
            logger.error(f"Failed to create configuration backup: {e}")
            return False

def main():
    """Demonstrate production configuration management"""
    print("=== Production Configuration Management Demo ===\n")

    # Initialize production config manager
    prod_manager = ProductionConfigManager(environment="production")

    # Load production configuration
    print("1. Loading production configuration...")
    try:
        config = prod_manager.load_production_config()
        print("✅ Production configuration loaded successfully")
        print(f"   Environment: {config.environment.value}")
        print(f"   Quality Level: {config.quality_level.value}")
        print(f"   Max Memory: {config.max_memory_usage_gb} GB")
        print(f"   Debug Mode: {config.debug_mode}")
        print(f"   Auto Retry: {config.auto_retry_on_failure}")
    except Exception as e:
        print(f"❌ Failed to load production config: {e}")
        return

    # Perform health check
    print("\n2. Performing configuration health check...")
    health = prod_manager.perform_health_check()
    print(f"   Status: {health.status.value}")
    if health.issues:
        print(f"   Issues: {health.issues}")
    if health.warnings:
        print(f"   Warnings: {health.warnings}")
    if health.recommendations:
        print(f"   Recommendations: {health.recommendations}")

    # Show production metrics
    print("\n3. Production metrics...")
    metrics = prod_manager.get_production_metrics()
    print(f"   Total config changes: {metrics['total_config_changes']}")
    print(".2f")
    print(f"   Current quality level: {metrics['current_quality_level']}")
    print(f"   Enabled workflows: {metrics['enabled_workflows_count']}")

    # Create backup
    print("\n4. Creating configuration backup...")
    backup_success = prod_manager.create_backup_config(config, "demo")
    if backup_success:
        print("✅ Configuration backup created")
    else:
        print("❌ Failed to create backup")

if __name__ == "__main__":
    main()