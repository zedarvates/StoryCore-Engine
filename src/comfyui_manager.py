"""
ComfyUI Manager - Core Service Lifecycle Management
Handles starting, stopping, and monitoring the ComfyUI service.
"""

import asyncio
import logging
import subprocess
import signal
import time
import psutil
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

from .comfyui_config import ComfyUIConfig, ConfigManager
from .comfyui_models import (
    ServiceStatus, ServiceState, ServiceStartResult, ServiceStopResult, 
    ServiceRestartResult, PerformanceMetrics
)
from .error_handler import ErrorHandler, ErrorCategory, FallbackMode
from .performance_monitor import PerformanceMonitor


class ComfyUIManagerError(Exception):
    """Base exception for ComfyUI Manager errors."""
    pass


class ServiceStartupError(ComfyUIManagerError):
    """Raised when ComfyUI service fails to start."""
    pass


class ServiceShutdownError(ComfyUIManagerError):
    """Raised when ComfyUI service fails to stop gracefully."""
    pass


class ComfyUIManager:
    """
    Manages the lifecycle of the ComfyUI service.
    
    Provides functionality to start, stop, restart, and monitor the ComfyUI service
    while maintaining proper process management and error handling.
    """
    
    def __init__(self, config: Optional[ComfyUIConfig] = None):
        """
        Initialize ComfyUI Manager.
        
        Args:
            config: ComfyUI configuration. If None, loads from default location.
        """
        self.config = config or ConfigManager().load_config()
        self.process: Optional[subprocess.Popen] = None
        self._service_status = ServiceStatus(
            is_running=False,
            state=ServiceState.STOPPED,
            port=self.config.server_port
        )
        
        # Set up logging
        self.logger = self._setup_logging()
        
        # Performance tracking
        self.metrics: List[PerformanceMetrics] = []
        
        # Health monitor will be injected
        self.health_monitor: Optional['HealthMonitor'] = None
        
        # Error handler for comprehensive error management
        self.error_handler = ErrorHandler(self.config)
        self.error_handler.add_recovery_callback(self._on_error_recovery)
        
        # Performance monitor for metrics collection
        self.performance_monitor = PerformanceMonitor(self.config)
        self.performance_monitor.start_monitoring()
        
        # Fallback state
        self._mock_mode_active = False
        
        self.logger.info(f"ComfyUI Manager initialized with installation path: {self.config.installation_path}")
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for the manager."""
        logger = logging.getLogger(f"comfyui_manager")
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
    
    def set_health_monitor(self, health_monitor: 'HealthMonitor') -> None:
        """Set the health monitor for service monitoring."""
        from .health_monitor import HealthMonitor
        self.health_monitor = health_monitor
        self.logger.debug("Health monitor attached to ComfyUI Manager")
    
    def start_service(self) -> ServiceStartResult:
        """
        Start the ComfyUI service with comprehensive error handling and fallback.
        
        Returns:
            ServiceStartResult with startup information and any errors.
        """
        operation_id = f"service_start_{int(time.time())}"
        self.performance_monitor.record_operation_start("service_start", operation_id)
        
        start_time = time.time()
        metrics = PerformanceMetrics.start_operation("service_start")
        
        try:
            self.logger.info("Starting ComfyUI service...")
            
            # Check if fallback mode is active
            if self.error_handler.is_fallback_active:
                if self.error_handler.current_fallback_mode == FallbackMode.MOCK:
                    return self._start_mock_service()
                elif self.error_handler.current_fallback_mode == FallbackMode.OFFLINE:
                    error_msg = "Service is in offline mode due to critical errors"
                    self.logger.error(error_msg)
                    return ServiceStartResult(success=False, error_message=error_msg)
            
            # Validate configuration
            config_errors = self.config.validate()
            if config_errors:
                error_msg = f"Configuration validation failed: {config_errors}"
                self.logger.error(error_msg)
                
                # Handle configuration error with fallback
                config_error = Exception(error_msg)
                fallback_mode = asyncio.run(self.error_handler.handle_error(
                    config_error, 
                    {"component": "manager", "operation": "start_service"}
                ))
                
                if fallback_mode == FallbackMode.MOCK:
                    return self._start_mock_service()
                
                metrics.complete(success=False, error_message=error_msg)
                return ServiceStartResult(success=False, error_message=error_msg)
            
            # Check if already running
            if self._service_status.is_running:
                self.logger.warning("ComfyUI service is already running")
                return ServiceStartResult(
                    success=True,
                    process_id=self._service_status.process_id,
                    service_url=self.config.server_url
                )
            
            # Check if port is available
            if self._is_port_in_use(self.config.server_port):
                error_msg = f"Port {self.config.server_port} is already in use"
                self.logger.error(error_msg)
                
                # Handle port conflict with fallback
                port_error = Exception(error_msg)
                fallback_mode = asyncio.run(self.error_handler.handle_error(
                    port_error,
                    {"component": "manager", "operation": "start_service", "port": self.config.server_port}
                ))
                
                if fallback_mode == FallbackMode.MOCK:
                    return self._start_mock_service()
                
                metrics.complete(success=False, error_message=error_msg)
                return ServiceStartResult(success=False, error_message=error_msg)
            
            # Prepare command
            cmd = self._build_startup_command()
            self.logger.debug(f"Starting ComfyUI with command: {' '.join(map(str, cmd))}")
            
            # Start process with error handling
            try:
                self.process = subprocess.Popen(
                    cmd,
                    cwd=self.config.installation_path,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                    universal_newlines=True
                )
            except Exception as process_error:
                # Handle process startup error with fallback
                fallback_mode = asyncio.run(self.error_handler.handle_error(
                    process_error,
                    {"component": "manager", "operation": "process_start", "command": cmd}
                ))
                
                if fallback_mode == FallbackMode.MOCK:
                    return self._start_mock_service()
                elif fallback_mode == FallbackMode.RETRY:
                    # Retry will be handled by the error handler's retry mechanism
                    raise process_error
                
                metrics.complete(success=False, error_message=str(process_error))
                return ServiceStartResult(success=False, error_message=str(process_error))
            
            # Update service status
            self._service_status.is_running = True
            self._service_status.state = ServiceState.STARTING
            self._service_status.process_id = self.process.pid
            self._service_status.startup_time = datetime.utcnow()
            
            self.logger.info(f"ComfyUI process started with PID: {self.process.pid}")
            
            # Wait for service to become available
            if self.health_monitor:
                try:
                    service_ready = asyncio.run(
                        self.health_monitor.wait_for_service_ready(self.config.startup_timeout)
                    )
                    
                    if service_ready:
                        self._service_status.state = ServiceState.RUNNING
                        startup_time = time.time() - start_time
                        
                        self.logger.info(f"ComfyUI service started successfully in {startup_time:.2f} seconds")
                        metrics.complete(success=True)
                        
                        # Reset error handler on successful start
                        self.error_handler.reset_fallback()
                        
                        # Record successful operation
                        self.performance_monitor.record_operation_end(
                            "service_start", operation_id, True, 
                            {"startup_time": startup_time, "process_id": self.process.pid}
                        )
                        
                        return ServiceStartResult(
                            success=True,
                            process_id=self.process.pid,
                            startup_time_seconds=startup_time,
                            service_url=self.config.server_url
                        )
                    else:
                        # Service failed to become ready
                        error_msg = f"ComfyUI service failed to become ready within {self.config.startup_timeout} seconds"
                        
                        # Try to get error output from process
                        if self.process.poll() is not None:
                            try:
                                _, stderr = self.process.communicate(timeout=5)
                                if stderr:
                                    error_msg += f"\nProcess stderr: {stderr}"
                            except subprocess.TimeoutExpired:
                                pass
                        
                        # Handle startup timeout with fallback
                        timeout_error = Exception(error_msg)
                        fallback_mode = asyncio.run(self.error_handler.handle_error(
                            timeout_error,
                            {"component": "manager", "operation": "startup_timeout", "timeout": self.config.startup_timeout}
                        ))
                        
                        self._cleanup_failed_start()
                        
                        if fallback_mode == FallbackMode.MOCK:
                            return self._start_mock_service()
                        
                        metrics.complete(success=False, error_message=error_msg)
                        return ServiceStartResult(success=False, error_message=error_msg)
                        
                except Exception as health_error:
                    # Handle health check error with fallback
                    fallback_mode = asyncio.run(self.error_handler.handle_error(
                        health_error,
                        {"component": "manager", "operation": "health_check"}
                    ))
                    
                    if fallback_mode == FallbackMode.MOCK:
                        self._cleanup_failed_start()
                        return self._start_mock_service()
                    
                    # Continue without health monitoring if degraded mode
                    if fallback_mode == FallbackMode.DEGRADED:
                        self.logger.warning("Health monitoring failed, continuing without health checks")
                        time.sleep(2)
                        self._service_status.state = ServiceState.RUNNING
                        startup_time = time.time() - start_time
                        
                        metrics.complete(success=True)
                        return ServiceStartResult(
                            success=True,
                            process_id=self.process.pid,
                            startup_time_seconds=startup_time,
                            service_url=self.config.server_url
                        )
                    
                    self._cleanup_failed_start()
                    metrics.complete(success=False, error_message=str(health_error))
                    return ServiceStartResult(success=False, error_message=str(health_error))
            else:
                # No health monitor, assume success after brief delay
                time.sleep(2)
                self._service_status.state = ServiceState.RUNNING
                startup_time = time.time() - start_time
                
                self.logger.warning("No health monitor available, assuming service started successfully")
                metrics.complete(success=True)
                
                return ServiceStartResult(
                    success=True,
                    process_id=self.process.pid,
                    startup_time_seconds=startup_time,
                    service_url=self.config.server_url
                )
        
        except Exception as e:
            error_msg = f"Failed to start ComfyUI service: {str(e)}"
            self.logger.error(error_msg, exc_info=True)
            
            # Handle unexpected error with fallback
            fallback_mode = asyncio.run(self.error_handler.handle_error(
                e,
                {"component": "manager", "operation": "start_service"}
            ))
            
            self._cleanup_failed_start()
            
            if fallback_mode == FallbackMode.MOCK:
                return self._start_mock_service()
            
            # Record failed operation
            self.performance_monitor.record_operation_end(
                "service_start", operation_id, False, 
                {"error": error_msg}
            )
            
            metrics.complete(success=False, error_message=error_msg)
            return ServiceStartResult(success=False, error_message=error_msg)
        
        finally:
            self.metrics.append(metrics)
    
    def stop_service(self) -> ServiceStopResult:
        """
        Stop the ComfyUI service gracefully.
        
        Returns:
            ServiceStopResult with shutdown information and any errors.
        """
        start_time = time.time()
        metrics = PerformanceMetrics.start_operation("service_stop")
        
        try:
            self.logger.info("Stopping ComfyUI service...")
            
            if not self._service_status.is_running or self.process is None:
                self.logger.info("ComfyUI service is not running")
                metrics.complete(success=True)
                return ServiceStopResult(success=True)
            
            self._service_status.state = ServiceState.STOPPING
            
            # Try graceful shutdown first
            self.logger.debug(f"Sending SIGTERM to process {self.process.pid}")
            self.process.terminate()
            
            # Wait for graceful shutdown
            try:
                self.process.wait(timeout=self.config.graceful_shutdown_timeout)
                shutdown_time = time.time() - start_time
                
                self.logger.info(f"ComfyUI service stopped gracefully in {shutdown_time:.2f} seconds")
                self._cleanup_after_stop()
                metrics.complete(success=True)
                
                return ServiceStopResult(
                    success=True,
                    shutdown_time_seconds=shutdown_time
                )
            
            except subprocess.TimeoutExpired:
                # Force kill if graceful shutdown failed
                self.logger.warning(f"Graceful shutdown timed out, force killing process {self.process.pid}")
                
                self.process.kill()
                self.process.wait(timeout=self.config.force_kill_timeout)
                
                shutdown_time = time.time() - start_time
                self.logger.info(f"ComfyUI service force stopped in {shutdown_time:.2f} seconds")
                
                self._cleanup_after_stop()
                metrics.complete(success=True)
                
                return ServiceStopResult(
                    success=True,
                    shutdown_time_seconds=shutdown_time,
                    forced_termination=True
                )
        
        except Exception as e:
            error_msg = f"Failed to stop ComfyUI service: {str(e)}"
            self.logger.error(error_msg, exc_info=True)
            
            # Ensure cleanup even on error
            self._cleanup_after_stop()
            metrics.complete(success=False, error_message=error_msg)
            
            return ServiceStopResult(success=False, error_message=error_msg)
        
        finally:
            self.metrics.append(metrics)
    
    def restart_service(self) -> ServiceRestartResult:
        """
        Restart the ComfyUI service.
        
        Returns:
            ServiceRestartResult with restart information and any errors.
        """
        start_time = time.time()
        self.logger.info("Restarting ComfyUI service...")
        
        # Stop service
        stop_result = self.stop_service()
        
        # Start service
        start_result = self.start_service()
        
        total_time = time.time() - start_time
        success = stop_result.success and start_result.success
        
        if success:
            self.logger.info(f"ComfyUI service restarted successfully in {total_time:.2f} seconds")
        else:
            self.logger.error("ComfyUI service restart failed")
        
        return ServiceRestartResult(
            success=success,
            stop_result=stop_result,
            start_result=start_result,
            total_time_seconds=total_time
        )
    
    def get_service_status(self) -> ServiceStatus:
        """
        Get current service status.
        
        Returns:
            Current ServiceStatus with health information if available.
        """
        # Update health status if monitor is available
        if self.health_monitor:
            # For synchronous calls, we'll use the last known health status
            # Real-time health checks should be done via async methods
            self._service_status.last_health_check = datetime.utcnow()
        
        # Verify process is still running
        if self.process and self.process.poll() is not None:
            # Process has terminated
            self.logger.warning("ComfyUI process has terminated unexpectedly")
            self._cleanup_after_stop()
        
        return self._service_status
    
    async def get_service_status_async(self) -> ServiceStatus:
        """
        Get current service status with real-time health check.
        
        Returns:
            Current ServiceStatus with fresh health information.
        """
        # Update health status if monitor is available
        if self.health_monitor:
            self._service_status.health_status = await self.health_monitor.check_health()
            self._service_status.last_health_check = datetime.utcnow()
        
        # Verify process is still running
        if self.process and self.process.poll() is not None:
            # Process has terminated
            self.logger.warning("ComfyUI process has terminated unexpectedly")
            self._cleanup_after_stop()
        
        return self._service_status
    
    def _build_startup_command(self) -> List[str]:
        """Build the command to start ComfyUI."""
        cmd = [
            str(self.config.executable_path),
            str(self.config.main_script_path),
            "--port", str(self.config.server_port),
            "--listen", self.config.server_host
        ]
        
        # Add GPU configuration
        if not self.config.enable_gpu:
            cmd.append("--cpu")
        
        # Add memory limit if specified
        if self.config.memory_limit_gb:
            cmd.extend(["--lowvram"])  # ComfyUI's low VRAM mode
        
        return cmd
    
    def _is_port_in_use(self, port: int) -> bool:
        """Check if a port is currently in use."""
        try:
            import socket
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                result = s.connect_ex(('127.0.0.1', port))
                return result == 0
        except Exception:
            return False
    
    def _cleanup_failed_start(self) -> None:
        """Clean up after a failed service start."""
        if self.process:
            try:
                if self.process.poll() is None:
                    self.process.terminate()
                    self.process.wait(timeout=5)
            except Exception as e:
                self.logger.error(f"Error cleaning up failed start: {e}")
        
        self._service_status.is_running = False
        self._service_status.state = ServiceState.ERROR
        self._service_status.process_id = None
        self.process = None
    
    def _cleanup_after_stop(self) -> None:
        """Clean up after service stop."""
        self._service_status.is_running = False
        self._service_status.state = ServiceState.STOPPED
        self._service_status.process_id = None
        self._service_status.startup_time = None
        self.process = None
    
    def get_performance_metrics(self) -> List[PerformanceMetrics]:
        """Get performance metrics for service operations."""
        return self.metrics.copy()
    
    def clear_metrics(self) -> None:
        """Clear stored performance metrics."""
        self.metrics.clear()
        self.logger.debug("Performance metrics cleared")
    
    def _start_mock_service(self) -> ServiceStartResult:
        """
        Start service in mock mode as fallback.
        
        Returns:
            ServiceStartResult indicating mock mode activation.
        """
        self.logger.info("Starting ComfyUI service in mock mode")
        
        # Update service status for mock mode
        self._service_status.is_running = True
        self._service_status.state = ServiceState.RUNNING
        self._service_status.process_id = -1  # Mock PID
        self._service_status.startup_time = datetime.utcnow()
        self._mock_mode_active = True
        
        return ServiceStartResult(
            success=True,
            process_id=-1,
            startup_time_seconds=0.1,
            service_url="mock://localhost:8188",
            mock_mode=True
        )
    
    def _on_error_recovery(self, error_info, fallback_mode: FallbackMode) -> None:
        """
        Handle error recovery notifications from error handler.
        
        Args:
            error_info: Information about the error that triggered recovery.
            fallback_mode: The fallback mode that was applied.
        """
        self.logger.info(f"Error recovery activated: {fallback_mode.value} for error {error_info.error_id}")
        
        if fallback_mode == FallbackMode.MOCK:
            self._mock_mode_active = True
            self.logger.warning("Service switched to mock mode due to errors")
        elif fallback_mode == FallbackMode.OFFLINE:
            self._service_status.state = ServiceState.ERROR
            self.logger.error("Service switched to offline mode due to critical errors")
        elif fallback_mode == FallbackMode.DEGRADED:
            self.logger.warning("Service operating in degraded mode")
    
    def get_diagnostic_info(self) -> Dict[str, Any]:
        """
        Get comprehensive diagnostic information for troubleshooting.
        
        Returns:
            Dictionary with diagnostic information including error handler status.
        """
        return {
            "service_status": {
                "is_running": self._service_status.is_running,
                "state": self._service_status.state.value,
                "process_id": self._service_status.process_id,
                "mock_mode_active": self._mock_mode_active,
                "startup_time": self._service_status.startup_time.isoformat() if self._service_status.startup_time else None
            },
            "configuration": {
                "installation_path": str(self.config.installation_path),
                "server_url": self.config.server_url,
                "server_port": self.config.server_port,
                "enable_gpu": self.config.enable_gpu
            },
            "error_handler": self.error_handler.get_diagnostic_info(),
            "performance_metrics": len(self.metrics)
        }
    
    @property
    def is_mock_mode_active(self) -> bool:
        """Check if service is running in mock mode."""
        return self._mock_mode_active
    
    def __del__(self):
        """Cleanup on object destruction."""
        if self._service_status.is_running and self.process:
            self.logger.warning("ComfyUI Manager being destroyed with running service, attempting cleanup")
            try:
                self.stop_service()
            except Exception as e:
                self.logger.error(f"Error during cleanup: {e}")