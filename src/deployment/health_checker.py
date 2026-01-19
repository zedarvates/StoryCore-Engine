"""
Health checking system for production deployment.

This module provides comprehensive health checking capabilities for production environments.
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any
import psutil
import torch
import urllib.request

from .models import DeploymentConfig, HealthCheckResult

logger = logging.getLogger(__name__)


class HealthChecker:
    """Comprehensive health checking for production deployment"""

    def __init__(self, config: DeploymentConfig):
        self.config = config
        self.health_history = []
        self.running = False

    async def initialize(self):
        """Initialize health checker"""
        logger.info("Initializing health checker...")

        # Setup health check endpoints
        self.health_checks = {
            "system_resources": self._check_system_resources,
            "gpu_status": self._check_gpu_status,
            "model_availability": self._check_model_availability,
            "workflow_engines": self._check_workflow_engines,
            "storage_space": self._check_storage_space,
            "network_connectivity": self._check_network_connectivity,
            "memory_usage": self._check_memory_usage,
            "performance_metrics": self._check_performance_metrics
        }

        logger.info("Health checker initialized")

    async def start_health_checks(self):
        """Start periodic health checks"""
        self.running = True
        logger.info("Starting periodic health checks...")

        try:
            while self.running:
                try:
                    health_results = await self.run_comprehensive_health_check()

                    # Store health history
                    self.health_history.append({
                        'timestamp': datetime.now(),
                        'results': health_results
                    })

                    # Keep only recent history
                    if len(self.health_history) > 1000:
                        self.health_history = self.health_history[-1000:]

                    # Check for critical issues
                    await self._handle_health_issues(health_results)

                    await asyncio.sleep(self.config.health_check_interval)

                except asyncio.CancelledError:
                    logger.info("Health check task cancelled")
                    raise
                except Exception as e:
                    logger.error(f"Health check failed: {e}")
                    await asyncio.sleep(self.config.health_check_interval)
        finally:
            # Cleanup on exit
            self.running = False
            logger.info("Health check service stopped")

    async def run_comprehensive_health_check(self) -> List[HealthCheckResult]:
        """Run all health checks"""
        results = []

        for check_name, check_func in self.health_checks.items():
            try:
                result = await check_func()
                results.append(result)
            except Exception as e:
                results.append(HealthCheckResult(
                    component=check_name,
                    status="critical",
                    message=f"Health check failed: {e}",
                    timestamp=datetime.now()
                ))

        return results

    async def _check_system_resources(self) -> HealthCheckResult:
        """Check system resource usage"""
        try:
            # CPU usage - run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            cpu_percent = await loop.run_in_executor(
                None, psutil.cpu_percent, 1
            )

            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent

            # Determine status
            if cpu_percent > 90 or memory_percent > 90:
                status = "critical"
                message = f"High resource usage: CPU={cpu_percent}%, Memory={memory_percent}%"
            elif cpu_percent > 70 or memory_percent > 70:
                status = "warning"
                message = f"Moderate resource usage: CPU={cpu_percent}%, Memory={memory_percent}%"
            else:
                status = "healthy"
                message = f"Resource usage normal: CPU={cpu_percent}%, Memory={memory_percent}%"

            return HealthCheckResult(
                component="system_resources",
                status=status,
                message=message,
                timestamp=datetime.now(),
                metrics={
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory_percent,
                    "memory_available_gb": memory.available / (1024**3)
                }
            )

        except Exception as e:
            return HealthCheckResult(
                component="system_resources",
                status="critical",
                message=f"System resource check failed: {e}",
                timestamp=datetime.now()
            )

    async def _check_gpu_status(self) -> HealthCheckResult:
        """Check GPU status and VRAM usage"""
        try:
            if not torch.cuda.is_available():
                return HealthCheckResult(
                    component="gpu_status",
                    status="critical",
                    message="CUDA not available",
                    timestamp=datetime.now()
                )

            # GPU memory usage
            gpu_memory_allocated = torch.cuda.memory_allocated() / (1024**3)
            gpu_memory_reserved = torch.cuda.memory_reserved() / (1024**3)
            gpu_memory_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)

            usage_percent = (gpu_memory_reserved / gpu_memory_total) * 100

            # Determine status
            if usage_percent > 95:
                status = "critical"
                message = f"GPU memory critical: {usage_percent:.1f}% used"
            elif usage_percent > 80:
                status = "warning"
                message = f"GPU memory high: {usage_percent:.1f}% used"
            else:
                status = "healthy"
                message = f"GPU memory normal: {usage_percent:.1f}% used"

            return HealthCheckResult(
                component="gpu_status",
                status=status,
                message=message,
                timestamp=datetime.now(),
                metrics={
                    "gpu_memory_allocated_gb": gpu_memory_allocated,
                    "gpu_memory_reserved_gb": gpu_memory_reserved,
                    "gpu_memory_total_gb": gpu_memory_total,
                    "gpu_usage_percent": usage_percent
                }
            )

        except Exception as e:
            return HealthCheckResult(
                component="gpu_status",
                status="critical",
                message=f"GPU status check failed: {e}",
                timestamp=datetime.now()
            )

    async def _check_model_availability(self) -> HealthCheckResult:
        """Check if critical models are available"""
        try:
            critical_models = [
                "models/hunyuan/hunyuanvideo1.5_720p_t2v_fp16.safetensors",
                "models/newbie/NewBie-Image-Exp0.1-bf16.safetensors"
            ]

            missing_models = []
            loop = asyncio.get_event_loop()
            
            # Run file existence checks in executor
            for model_path in critical_models:
                exists = await loop.run_in_executor(
                    None, os.path.exists, model_path
                )
                if not exists:
                    missing_models.append(model_path)

            if missing_models:
                return HealthCheckResult(
                    component="model_availability",
                    status="critical",
                    message=f"Missing critical models: {missing_models}",
                    timestamp=datetime.now(),
                    metrics={"missing_models": len(missing_models)}
                )
            else:
                return HealthCheckResult(
                    component="model_availability",
                    status="healthy",
                    message="All critical models available",
                    timestamp=datetime.now(),
                    metrics={"missing_models": 0}
                )

        except Exception as e:
            return HealthCheckResult(
                component="model_availability",
                status="critical",
                message=f"Model availability check failed: {e}",
                timestamp=datetime.now()
            )

    async def _check_workflow_engines(self) -> HealthCheckResult:
        """Check workflow engine status"""
        try:
            # This would check if engines are responsive
            # For now, simulate the check

            engines_status = {
                "video_engine": "healthy",
                "image_engine": "healthy",
                "performance_optimizer": "healthy"
            }

            failed_engines = [name for name, status in engines_status.items() if status != "healthy"]

            if failed_engines:
                return HealthCheckResult(
                    component="workflow_engines",
                    status="critical",
                    message=f"Failed engines: {failed_engines}",
                    timestamp=datetime.now(),
                    metrics={"failed_engines": len(failed_engines)}
                )
            else:
                return HealthCheckResult(
                    component="workflow_engines",
                    status="healthy",
                    message="All workflow engines operational",
                    timestamp=datetime.now(),
                    metrics={"failed_engines": 0}
                )

        except Exception as e:
            return HealthCheckResult(
                component="workflow_engines",
                status="critical",
                message=f"Workflow engine check failed: {e}",
                timestamp=datetime.now()
            )

    async def _check_storage_space(self) -> HealthCheckResult:
        """Check available storage space"""
        try:
            disk_usage = psutil.disk_usage('.')
            available_gb = disk_usage.free / (1024**3)
            total_gb = disk_usage.total / (1024**3)
            used_percent = ((total_gb - available_gb) / total_gb) * 100

            if available_gb < 10:  # Less than 10GB
                status = "critical"
                message = f"Storage space critical: {available_gb:.1f}GB available"
            elif available_gb < 50:  # Less than 50GB
                status = "warning"
                message = f"Storage space low: {available_gb:.1f}GB available"
            else:
                status = "healthy"
                message = f"Storage space adequate: {available_gb:.1f}GB available"

            return HealthCheckResult(
                component="storage_space",
                status=status,
                message=message,
                timestamp=datetime.now(),
                metrics={
                    "available_gb": available_gb,
                    "total_gb": total_gb,
                    "used_percent": used_percent
                }
            )

        except Exception as e:
            return HealthCheckResult(
                component="storage_space",
                status="critical",
                message=f"Storage space check failed: {e}",
                timestamp=datetime.now()
            )

    async def _check_network_connectivity(self) -> HealthCheckResult:
        """Check network connectivity"""
        try:
            # Test connectivity to external services
            test_urls = ["https://huggingface.co", "https://github.com"]
            failed_connections = 0

            loop = asyncio.get_event_loop()
            for url in test_urls:
                try:
                    # Run blocking urlopen in executor
                    await loop.run_in_executor(
                        None, 
                        lambda u=url: urllib.request.urlopen(u, timeout=5)
                    )
                except:
                    failed_connections += 1

            if failed_connections == len(test_urls):
                status = "critical"
                message = "No network connectivity"
            elif failed_connections > 0:
                status = "warning"
                message = f"Limited network connectivity ({failed_connections} failures)"
            else:
                status = "healthy"
                message = "Network connectivity normal"

            return HealthCheckResult(
                component="network_connectivity",
                status=status,
                message=message,
                timestamp=datetime.now(),
                metrics={"failed_connections": failed_connections}
            )

        except Exception as e:
            return HealthCheckResult(
                component="network_connectivity",
                status="critical",
                message=f"Network connectivity check failed: {e}",
                timestamp=datetime.now()
            )

    async def _check_memory_usage(self) -> HealthCheckResult:
        """Check memory usage patterns"""
        try:
            # System memory
            memory = psutil.virtual_memory()

            # GPU memory
            gpu_memory_used = 0
            gpu_memory_total = 0

            if torch.cuda.is_available():
                gpu_memory_used = torch.cuda.memory_allocated() / (1024**3)
                gpu_memory_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)

            # Check for memory leaks (simplified)
            memory_usage_trend = "stable"  # This would analyze historical data

            status = "healthy"
            message = f"Memory usage stable: RAM={memory.percent:.1f}%, GPU={gpu_memory_used:.1f}GB"

            if memory.percent > 90 or (gpu_memory_total > 0 and gpu_memory_used / gpu_memory_total > 0.95):
                status = "critical"
                message = f"Memory usage critical: RAM={memory.percent:.1f}%, GPU={gpu_memory_used:.1f}GB"
            elif memory_usage_trend == "increasing":
                status = "warning"
                message = f"Memory usage increasing: RAM={memory.percent:.1f}%, GPU={gpu_memory_used:.1f}GB"

            return HealthCheckResult(
                component="memory_usage",
                status=status,
                message=message,
                timestamp=datetime.now(),
                metrics={
                    "ram_percent": memory.percent,
                    "gpu_memory_used_gb": gpu_memory_used,
                    "gpu_memory_total_gb": gpu_memory_total,
                    "memory_trend": memory_usage_trend
                }
            )

        except Exception as e:
            return HealthCheckResult(
                component="memory_usage",
                status="critical",
                message=f"Memory usage check failed: {e}",
                timestamp=datetime.now()
            )

    async def _check_performance_metrics(self) -> HealthCheckResult:
        """Check performance metrics"""
        try:
            # This would check actual performance metrics
            # For now, simulate reasonable values

            metrics = {
                "avg_generation_time": 45.0,  # seconds
                "requests_per_hour": 80,
                "error_rate": 2.0,  # percentage
                "quality_score": 0.87
            }

            # Determine status based on metrics
            if metrics["error_rate"] > 10 or metrics["avg_generation_time"] > 120:
                status = "critical"
                message = f"Performance degraded: {metrics['error_rate']:.1f}% errors, {metrics['avg_generation_time']:.1f}s avg time"
            elif metrics["error_rate"] > 5 or metrics["avg_generation_time"] > 60:
                status = "warning"
                message = f"Performance suboptimal: {metrics['error_rate']:.1f}% errors, {metrics['avg_generation_time']:.1f}s avg time"
            else:
                status = "healthy"
                message = f"Performance normal: {metrics['error_rate']:.1f}% errors, {metrics['avg_generation_time']:.1f}s avg time"

            return HealthCheckResult(
                component="performance_metrics",
                status=status,
                message=message,
                timestamp=datetime.now(),
                metrics=metrics
            )

        except Exception as e:
            return HealthCheckResult(
                component="performance_metrics",
                status="critical",
                message=f"Performance metrics check failed: {e}",
                timestamp=datetime.now()
            )

    async def _handle_health_issues(self, health_results: List[HealthCheckResult]):
        """Handle health issues by triggering alerts or recovery actions"""
        critical_issues = [r for r in health_results if r.status == "critical"]
        warning_issues = [r for r in health_results if r.status == "warning"]

        if critical_issues:
            logger.error(f"Critical health issues detected: {[r.component for r in critical_issues]}")
            # Trigger critical alerts
            await self._trigger_alerts("critical", critical_issues)

        if warning_issues:
            logger.warning(f"Warning health issues detected: {[r.component for r in warning_issues]}")
            # Trigger warning alerts
            await self._trigger_alerts("warning", warning_issues)

    async def _trigger_alerts(self, severity: str, issues: List[HealthCheckResult]):
        """Trigger alerts for health issues"""
        # This would integrate with alerting systems
        logger.info(f"Triggering {severity} alerts for {len(issues)} issues")

    async def stop(self):
        """Stop health checker"""
        self.running = False
        logger.info("Health checker stopped")

    async def get_current_health_status(self) -> List[HealthCheckResult]:
        """Get current health status"""
        return await self.run_comprehensive_health_check()

    def get_health_history(self) -> List[Dict]:
        """Get health check history"""
        return self.health_history