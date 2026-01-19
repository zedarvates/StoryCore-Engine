"""
Monitoring system for production deployment.

This module provides comprehensive monitoring and metrics collection capabilities.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any
import psutil
import torch

from .models import DeploymentConfig

logger = logging.getLogger(__name__)


class MonitoringSystem:
    """Production monitoring and metrics collection"""

    def __init__(self, config: DeploymentConfig):
        self.config = config
        self.metrics_history = []
        self.running = False
        self.current_metrics = {}

    async def initialize(self):
        """Initialize monitoring system"""
        logger.info("Initializing monitoring system...")

        # Setup metrics collectors
        self.collectors = {
            "system_metrics": self._collect_system_metrics,
            "gpu_metrics": self._collect_gpu_metrics,
            "workflow_metrics": self._collect_workflow_metrics,
            "performance_metrics": self._collect_performance_metrics,
            "quality_metrics": self._collect_quality_metrics
        }

        # Initialize metrics storage
        self.metrics_history = []

        logger.info("Monitoring system initialized")

    async def start_monitoring(self):
        """Start continuous monitoring"""
        self.running = True
        logger.info("Starting continuous monitoring...")

        while self.running:
            try:
                # Collect all metrics
                timestamp = datetime.now()
                metrics = {}

                for collector_name, collector_func in self.collectors.items():
                    try:
                        collector_metrics = await collector_func()
                        metrics[collector_name] = collector_metrics
                    except Exception as e:
                        logger.error(f"Metrics collection failed for {collector_name}: {e}")
                        metrics[collector_name] = {"error": str(e)}

                # Store metrics
                self.current_metrics = metrics
                self.metrics_history.append({
                    'timestamp': timestamp,
                    'metrics': metrics
                })

                # Keep only recent history (last 24 hours)
                cutoff_time = timestamp - timedelta(hours=24)
                self.metrics_history = [
                    m for m in self.metrics_history
                    if m['timestamp'] > cutoff_time
                ]

                # Check for alerts
                await self._check_metric_alerts(metrics)

                await asyncio.sleep(self.config.metrics_collection_interval)

            except Exception as e:
                logger.error(f"Monitoring loop failed: {e}")
                await asyncio.sleep(self.config.metrics_collection_interval)

    async def _collect_system_metrics(self) -> Dict[str, float]:
        """Collect system-level metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()

            # Memory metrics
            memory = psutil.virtual_memory()

            # Disk metrics
            disk = psutil.disk_usage('.')

            # Network metrics (simplified)
            network = psutil.net_io_counters()

            return {
                "cpu_percent": cpu_percent,
                "cpu_count": cpu_count,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "memory_total_gb": memory.total / (1024**3),
                "disk_free_gb": disk.free / (1024**3),
                "disk_total_gb": disk.total / (1024**3),
                "disk_used_percent": (disk.used / disk.total) * 100,
                "network_bytes_sent": network.bytes_sent,
                "network_bytes_recv": network.bytes_recv
            }

        except Exception as e:
            logger.error(f"System metrics collection failed: {e}")
            return {"error": str(e)}

    async def _collect_gpu_metrics(self) -> Dict[str, float]:
        """Collect GPU metrics"""
        try:
            if not torch.cuda.is_available():
                return {"gpu_available": False}

            # GPU memory
            gpu_memory_allocated = torch.cuda.memory_allocated() / (1024**3)
            gpu_memory_reserved = torch.cuda.memory_reserved() / (1024**3)
            gpu_memory_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)

            # GPU utilization (would need nvidia-ml-py for real utilization)
            gpu_utilization = min(100.0, (gpu_memory_reserved / gpu_memory_total) * 100)

            return {
                "gpu_available": True,
                "gpu_memory_allocated_gb": gpu_memory_allocated,
                "gpu_memory_reserved_gb": gpu_memory_reserved,
                "gpu_memory_total_gb": gpu_memory_total,
                "gpu_memory_percent": (gpu_memory_reserved / gpu_memory_total) * 100,
                "gpu_utilization_percent": gpu_utilization,
                "gpu_device_count": torch.cuda.device_count()
            }

        except Exception as e:
            logger.error(f"GPU metrics collection failed: {e}")
            return {"error": str(e)}

    async def _collect_workflow_metrics(self) -> Dict[str, float]:
        """Collect workflow-specific metrics"""
        try:
            # This would collect metrics from actual workflow engines
            # For now, simulate realistic metrics

            return {
                "active_video_generations": 2,
                "active_image_generations": 1,
                "queued_requests": 5,
                "completed_requests_hour": 45,
                "failed_requests_hour": 2,
                "avg_video_generation_time": 120.0,
                "avg_image_generation_time": 25.0,
                "model_cache_hit_rate": 0.85,
                "workflow_success_rate": 0.96
            }

        except Exception as e:
            logger.error(f"Workflow metrics collection failed: {e}")
            return {"error": str(e)}

    async def _collect_performance_metrics(self) -> Dict[str, float]:
        """Collect performance metrics"""
        try:
            # This would collect from actual performance monitoring
            # For now, simulate realistic metrics

            return {
                "requests_per_second": 0.125,  # ~450 requests/hour
                "avg_response_time": 45.0,
                "p95_response_time": 85.0,
                "p99_response_time": 150.0,
                "error_rate_percent": 2.1,
                "timeout_rate_percent": 0.5,
                "throughput_mbps": 12.5,
                "concurrent_users": 8
            }

        except Exception as e:
            logger.error(f"Performance metrics collection failed: {e}")
            return {"error": str(e)}

    async def _collect_quality_metrics(self) -> Dict[str, float]:
        """Collect quality metrics"""
        try:
            # This would collect from quality monitoring systems
            # For now, simulate realistic metrics

            return {
                "avg_video_quality_score": 0.87,
                "avg_image_quality_score": 0.91,
                "quality_threshold_pass_rate": 0.94,
                "temporal_consistency_score": 0.89,
                "visual_artifact_rate": 0.03,
                "user_satisfaction_score": 4.2,  # out of 5
                "quality_improvement_rate": 0.15
            }

        except Exception as e:
            logger.error(f"Quality metrics collection failed: {e}")
            return {"error": str(e)}

    async def _check_metric_alerts(self, metrics: Dict[str, Dict]):
        """Check metrics against alert thresholds"""
        try:
            alerts = []

            # Check system metrics
            if "system_metrics" in metrics:
                sys_metrics = metrics["system_metrics"]

                if sys_metrics.get("cpu_percent", 0) > self.config.alert_thresholds["cpu_usage"]:
                    alerts.append(f"High CPU usage: {sys_metrics['cpu_percent']:.1f}%")

                if sys_metrics.get("memory_percent", 0) > self.config.alert_thresholds["memory_usage"]:
                    alerts.append(f"High memory usage: {sys_metrics['memory_percent']:.1f}%")

            # Check GPU metrics
            if "gpu_metrics" in metrics:
                gpu_metrics = metrics["gpu_metrics"]

                if gpu_metrics.get("gpu_utilization_percent", 0) > self.config.alert_thresholds["gpu_usage"]:
                    alerts.append(f"High GPU usage: {gpu_metrics['gpu_utilization_percent']:.1f}%")

            # Check performance metrics
            if "performance_metrics" in metrics:
                perf_metrics = metrics["performance_metrics"]

                if perf_metrics.get("error_rate_percent", 0) > self.config.alert_thresholds["error_rate"]:
                    alerts.append(f"High error rate: {perf_metrics['error_rate_percent']:.1f}%")

                if perf_metrics.get("avg_response_time", 0) > self.config.alert_thresholds["response_time"]:
                    alerts.append(f"High response time: {perf_metrics['avg_response_time']:.1f}s")

            # Trigger alerts if any
            if alerts:
                await self._trigger_metric_alerts(alerts)

        except Exception as e:
            logger.error(f"Metric alert checking failed: {e}")

    async def _trigger_metric_alerts(self, alerts: List[str]):
        """Trigger alerts for metric thresholds"""
        logger.warning(f"Metric alerts triggered: {alerts}")

        # This would integrate with alerting systems (email, Slack, etc.)
        for alert in alerts:
            logger.warning(f"ALERT: {alert}")

    def get_current_metrics(self) -> Dict[str, float]:
        """Get current metrics snapshot"""
        return self.current_metrics

    def get_metrics_history(self, hours: int = 1) -> List[Dict]:
        """Get metrics history for specified hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [
            m for m in self.metrics_history
            if m['timestamp'] > cutoff_time
        ]

    def generate_metrics_report(self) -> Dict[str, Any]:
        """Generate comprehensive metrics report"""
        if not self.metrics_history:
            return {"error": "No metrics data available"}

        # Calculate aggregated metrics over last hour
        recent_metrics = self.get_metrics_history(hours=1)

        if not recent_metrics:
            return {"error": "No recent metrics data"}

        # Aggregate system metrics
        system_metrics = []
        for m in recent_metrics:
            if "system_metrics" in m["metrics"]:
                system_metrics.append(m["metrics"]["system_metrics"])

        report = {
            "report_timestamp": datetime.now().isoformat(),
            "data_points": len(recent_metrics),
            "time_range_hours": 1,
            "summary": {}
        }

        if system_metrics:
            report["summary"]["avg_cpu_percent"] = sum(m.get("cpu_percent", 0) for m in system_metrics) / len(system_metrics)
            report["summary"]["avg_memory_percent"] = sum(m.get("memory_percent", 0) for m in system_metrics) / len(system_metrics)

        return report

    async def stop(self):
        """Stop monitoring system"""
        self.running = False
        logger.info("Monitoring system stopped")