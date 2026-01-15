"""
ComfyUI Health Monitor
Monitors the health and availability of the ComfyUI service.
"""

import asyncio
import aiohttp
import logging
import time
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path

from .comfyui_config import ComfyUIConfig
from .comfyui_models import (
    HealthStatus, HealthState, SystemStats, PerformanceMetrics
)
from .error_handler import ErrorHandler, ErrorCategory, FallbackMode
from .performance_monitor import PerformanceMonitor


class HealthMonitorError(Exception):
    """Base exception for Health Monitor errors."""
    pass


class HealthMonitor:
    """
    Monitors ComfyUI service health and system statistics.
    
    Provides real-time health checking, failure detection, and system monitoring
    with configurable timeouts and retry logic.
    """
    
    def __init__(self, config: ComfyUIConfig):
        """
        Initialize Health Monitor.
        
        Args:
            config: ComfyUI configuration for connection details.
        """
        self.config = config
        self.logger = self._setup_logging()
        
        # Health tracking
        self._last_health_status: Optional[HealthStatus] = None
        self._consecutive_failures = 0
        self._last_successful_check: Optional[datetime] = None
        
        # Performance tracking
        self.metrics: List[PerformanceMetrics] = []
        
        # Backoff configuration
        self._base_backoff_seconds = 1.0
        self._max_backoff_seconds = 60.0
        self._backoff_multiplier = 2.0
        
        # Error handler for comprehensive error management
        self.error_handler = ErrorHandler(config)
        self.error_handler.add_recovery_callback(self._on_error_recovery)
        
        # Performance monitor for metrics collection
        self.performance_monitor = PerformanceMonitor(config)
        
        # Fallback state
        self._degraded_mode_active = False
        self._mock_mode_active = False
        
        self.logger.info(f"Health Monitor initialized for {self.config.server_url}")
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for the health monitor."""
        logger = logging.getLogger("comfyui_health_monitor")
        logger.setLevel(getattr(logging, self.config.log_level))
        
        # Create console handler if not already exists
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    async def check_health(self) -> HealthStatus:
        """
        Perform a health check on the ComfyUI service with comprehensive error handling.
        
        Returns:
            HealthStatus with current health information.
        """
        operation_id = f"health_check_{int(time.time())}"
        self.performance_monitor.record_operation_start("health_check", operation_id)
        
        start_time = time.time()
        metrics = PerformanceMetrics.start_operation("health_check")
        
        try:
            # Return mock health status if in mock mode
            if self._mock_mode_active:
                return self._get_mock_health_status()
            
            # Check basic HTTP connectivity
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=5.0)
            ) as session:
                
                # Try to get system stats (more comprehensive than basic ping)
                try:
                    async with session.get(f"{self.config.server_url}/system_stats") as response:
                        response_time = (time.time() - start_time) * 1000  # Convert to ms
                        
                        if response.status == 200:
                            stats_data = await response.json()
                            system_stats = self._parse_system_stats(stats_data)
                            
                            # Reset failure count on success
                            self._consecutive_failures = 0
                            self._last_successful_check = datetime.utcnow()
                            
                            health_status = HealthStatus(
                                is_healthy=True,
                                state=HealthState.HEALTHY,
                                response_time_ms=response_time,
                                system_stats=system_stats,
                                consecutive_failures=0
                            )
                            
                            self.logger.debug(f"Health check successful: {response_time:.1f}ms")
                            metrics.complete(success=True)
                            
                            # Record successful operation
                            self.performance_monitor.record_operation_end(
                                "health_check", operation_id, True,
                                {"response_time_ms": response_time, "system_stats": system_stats.to_dict() if hasattr(system_stats, 'to_dict') else None}
                            )
                            
                            # Reset error handler on successful health check
                            if self._consecutive_failures == 0 and not self._degraded_mode_active:
                                self.error_handler.reset_fallback()
                            
                        else:
                            # Service responding but with error
                            self._consecutive_failures += 1
                            
                            # Handle HTTP error with fallback
                            http_error = Exception(f"HTTP {response.status}: {response.reason}")
                            fallback_mode = await self.error_handler.handle_error(
                                http_error,
                                {"component": "health_monitor", "operation": "health_check", "status_code": response.status}
                            )
                            
                            health_status = HealthStatus(
                                is_healthy=False,
                                state=HealthState.DEGRADED if fallback_mode == FallbackMode.DEGRADED else HealthState.UNHEALTHY,
                                response_time_ms=response_time,
                                error_message=f"HTTP {response.status}: {response.reason}",
                                consecutive_failures=self._consecutive_failures
                            )
                            
                            self.logger.warning(f"Health check degraded: HTTP {response.status}")
                            metrics.complete(success=False, error_message=f"HTTP {response.status}")
                
                except aiohttp.ClientError as e:
                    # Network/connection error
                    response_time = (time.time() - start_time) * 1000
                    self._consecutive_failures += 1
                    
                    # Handle network error with fallback
                    fallback_mode = await self.error_handler.handle_error(
                        e,
                        {"component": "health_monitor", "operation": "health_check", "error_type": "network"}
                    )
                    
                    if fallback_mode == FallbackMode.MOCK:
                        return self._get_mock_health_status()
                    
                    health_status = HealthStatus(
                        is_healthy=False,
                        state=HealthState.DEGRADED if fallback_mode == FallbackMode.DEGRADED else HealthState.UNHEALTHY,
                        response_time_ms=response_time,
                        error_message=f"Connection error: {str(e)}",
                        consecutive_failures=self._consecutive_failures
                    )
                    
                    self.logger.error(f"Health check failed: {str(e)}")
                    metrics.complete(success=False, error_message=str(e))
        
        except Exception as e:
            # Unexpected error
            response_time = (time.time() - start_time) * 1000
            self._consecutive_failures += 1
            
            # Handle unexpected error with fallback
            fallback_mode = await self.error_handler.handle_error(
                e,
                {"component": "health_monitor", "operation": "health_check", "error_type": "unexpected"}
            )
            
            if fallback_mode == FallbackMode.MOCK:
                return self._get_mock_health_status()
            
            health_status = HealthStatus(
                is_healthy=False,
                state=HealthState.UNKNOWN,
                response_time_ms=response_time,
                error_message=f"Unexpected error: {str(e)}",
                consecutive_failures=self._consecutive_failures
            )
            
            self.logger.error(f"Health check error: {str(e)}", exc_info=True)
            metrics.complete(success=False, error_message=str(e))
        
        finally:
            self.metrics.append(metrics)
            self._last_health_status = health_status
        
        return health_status
    
    async def wait_for_service_ready(self, timeout_seconds: float) -> bool:
        """
        Wait for the ComfyUI service to become ready.
        
        Args:
            timeout_seconds: Maximum time to wait for service readiness.
            
        Returns:
            True if service becomes ready within timeout, False otherwise.
        """
        start_time = time.time()
        check_interval = min(self.config.health_check_interval, 2.0)  # Cap at 2 seconds
        
        self.logger.info(f"Waiting for ComfyUI service to become ready (timeout: {timeout_seconds}s)")
        
        while (time.time() - start_time) < timeout_seconds:
            health_status = await self.check_health()
            
            if health_status.is_healthy:
                elapsed = time.time() - start_time
                self.logger.info(f"ComfyUI service ready after {elapsed:.2f} seconds")
                return True
            
            # Wait before next check
            await asyncio.sleep(check_interval)
        
        elapsed = time.time() - start_time
        self.logger.error(f"ComfyUI service not ready after {elapsed:.2f} seconds")
        return False
    
    def calculate_backoff_delay(self) -> float:
        """
        Calculate exponential backoff delay based on consecutive failures.
        
        Returns:
            Delay in seconds before next retry attempt.
        """
        if self._consecutive_failures == 0:
            return 0.0
        
        # Exponential backoff: base * (multiplier ^ failures)
        delay = self._base_backoff_seconds * (self._backoff_multiplier ** (self._consecutive_failures - 1))
        
        # Cap at maximum backoff
        delay = min(delay, self._max_backoff_seconds)
        
        self.logger.debug(f"Calculated backoff delay: {delay:.2f}s (failures: {self._consecutive_failures})")
        return delay
    
    async def start_monitoring(self, callback=None) -> None:
        """
        Start continuous health monitoring.
        
        Args:
            callback: Optional callback function to call on health status changes.
        """
        self.logger.info("Starting continuous health monitoring")
        
        while True:
            try:
                # Calculate delay (includes backoff for failures)
                base_delay = self.config.health_check_interval
                backoff_delay = self.calculate_backoff_delay()
                total_delay = base_delay + backoff_delay
                
                # Perform health check
                health_status = await self.check_health()
                
                # Call callback if provided
                if callback:
                    try:
                        await callback(health_status)
                    except Exception as e:
                        self.logger.error(f"Health monitoring callback error: {e}")
                
                # Wait before next check
                await asyncio.sleep(total_delay)
                
            except asyncio.CancelledError:
                self.logger.info("Health monitoring cancelled")
                break
            except Exception as e:
                self.logger.error(f"Health monitoring error: {e}", exc_info=True)
                await asyncio.sleep(self.config.health_check_interval)
    
    def _parse_system_stats(self, stats_data: Dict[str, Any]) -> SystemStats:
        """
        Parse system statistics from ComfyUI response.
        
        Args:
            stats_data: Raw statistics data from ComfyUI.
            
        Returns:
            Parsed SystemStats object.
        """
        try:
            # ComfyUI system stats format
            device_info = stats_data.get("system", {})
            
            return SystemStats(
                device_name=device_info.get("device_name", "Unknown"),
                vram_total=device_info.get("vram_total", 0),
                vram_free=device_info.get("vram_free", 0),
                system_stats=stats_data,
                queue_remaining=stats_data.get("exec_info", {}).get("queue_remaining", 0),
                queue_running=stats_data.get("exec_info", {}).get("queue_running", [])
            )
        
        except Exception as e:
            self.logger.warning(f"Failed to parse system stats: {e}")
            return SystemStats(
                device_name="Unknown",
                vram_total=0,
                vram_free=0,
                system_stats=stats_data
            )
    
    def get_health_summary(self) -> Dict[str, Any]:
        """
        Get a summary of current health status.
        
        Returns:
            Dictionary with health summary information.
        """
        if self._last_health_status is None:
            return {
                "status": "unknown",
                "message": "No health checks performed yet"
            }
        
        status = self._last_health_status
        
        summary = {
            "status": status.state.value,
            "is_healthy": status.is_healthy,
            "response_time_ms": status.response_time_ms,
            "consecutive_failures": status.consecutive_failures,
            "last_check": status.last_check_time.isoformat(),
            "error_message": status.error_message
        }
        
        if status.system_stats:
            summary["system_stats"] = {
                "device_name": status.system_stats.device_name,
                "vram_usage_percent": status.system_stats.vram_usage_percent,
                "queue_remaining": status.system_stats.queue_remaining,
                "queue_running_count": len(status.system_stats.queue_running)
            }
        
        return summary
    
    def get_performance_metrics(self) -> List[PerformanceMetrics]:
        """Get performance metrics for health checks."""
        return self.metrics.copy()
    
    def clear_metrics(self) -> None:
        """Clear stored performance metrics."""
        self.metrics.clear()
        self.logger.debug("Health monitor metrics cleared")
    
    def reset_failure_count(self) -> None:
        """Reset consecutive failure count (useful for manual recovery)."""
        self._consecutive_failures = 0
        self.logger.info("Consecutive failure count reset")
    
    def _get_mock_health_status(self) -> HealthStatus:
        """
        Get mock health status for fallback mode.
        
        Returns:
            Mock HealthStatus indicating healthy state.
        """
        return HealthStatus(
            is_healthy=True,
            state=HealthState.HEALTHY,
            response_time_ms=1.0,  # Mock fast response
            system_stats=SystemStats(
                device_name="Mock Device",
                vram_total=8192,
                vram_free=4096,
                system_stats={"mock": True},
                queue_remaining=0,
                queue_running=[]
            ),
            consecutive_failures=0,
            mock_mode=True
        )
    
    def _on_error_recovery(self, error_info, fallback_mode: FallbackMode) -> None:
        """
        Handle error recovery notifications from error handler.
        
        Args:
            error_info: Information about the error that triggered recovery.
            fallback_mode: The fallback mode that was applied.
        """
        self.logger.info(f"Health monitor error recovery: {fallback_mode.value} for error {error_info.error_id}")
        
        if fallback_mode == FallbackMode.MOCK:
            self._mock_mode_active = True
            self.logger.warning("Health monitoring switched to mock mode")
        elif fallback_mode == FallbackMode.DEGRADED:
            self._degraded_mode_active = True
            self.logger.warning("Health monitoring operating in degraded mode")
        elif fallback_mode == FallbackMode.OFFLINE:
            self.logger.error("Health monitoring switched to offline mode")
    
    def get_diagnostic_info(self) -> Dict[str, Any]:
        """
        Get comprehensive diagnostic information for troubleshooting.
        
        Returns:
            Dictionary with diagnostic information including error handler status.
        """
        return {
            "health_monitor_status": {
                "consecutive_failures": self._consecutive_failures,
                "last_successful_check": self._last_successful_check.isoformat() if self._last_successful_check else None,
                "mock_mode_active": self._mock_mode_active,
                "degraded_mode_active": self._degraded_mode_active,
                "last_health_status": self._last_health_status.to_dict() if self._last_health_status else None
            },
            "configuration": {
                "server_url": self.config.server_url,
                "health_check_interval": self.config.health_check_interval,
                "base_backoff_seconds": self._base_backoff_seconds,
                "max_backoff_seconds": self._max_backoff_seconds
            },
            "error_handler": self.error_handler.get_diagnostic_info(),
            "performance_metrics": len(self.metrics)
        }
    
    @property
    def is_mock_mode_active(self) -> bool:
        """Check if health monitoring is in mock mode."""
        return self._mock_mode_active
    
    @property
    def is_degraded_mode_active(self) -> bool:
        """Check if health monitoring is in degraded mode."""
        return self._degraded_mode_active