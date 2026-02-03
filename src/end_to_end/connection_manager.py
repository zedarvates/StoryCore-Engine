"""
Connection Manager for ComfyUI Desktop Integration.

This module handles connection lifecycle management, health checking,
and automatic reconnection for ComfyUI Desktop backend.
"""

import asyncio
import aiohttp
import logging
from typing import Optional, Callable, List
from datetime import datetime
from dataclasses import dataclass, field
from pathlib import Path

from .data_models import ComfyUIStatus

logger = logging.getLogger(__name__)


@dataclass
class ComfyUIConfig:
    """
    ComfyUI connection configuration.
    
    Validates: Requirements 1.4, 9.1, 9.2, 9.3, 13.12
    """
    host: str = "localhost"
    port: int = 8000
    timeout: int = 30
    max_retries: int = 3
    retry_backoff: float = 2.0
    enable_cors_check: bool = True
    auto_download_models: bool = True
    auto_deploy_workflows: bool = True
    fallback_mode: str = "placeholder"
    default_workflow: str = "z_image_turbo"  # Default workflow for generation
    
    @classmethod
    def from_file(cls, path: Path) -> 'ComfyUIConfig':
        """
        Load configuration from JSON file.
        
        Args:
            path: Path to configuration file
            
        Returns:
            ComfyUIConfig instance
            
        Validates: Requirements 9.3, 9.4
        """
        import json
        
        if not path.exists():
            logger.warning(f"Config file not found: {path}, using defaults")
            return cls()
        
        try:
            with open(path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            return cls(**config_data)
        except Exception as e:
            logger.error(f"Error loading config from {path}: {e}")
            return cls()
    
    @classmethod
    def from_env(cls) -> 'ComfyUIConfig':
        """
        Load configuration from environment variables.
        
        Environment variables:
        - COMFYUI_HOST: Override host
        - COMFYUI_PORT: Override port
        - COMFYUI_TIMEOUT: Override timeout
        - COMFYUI_AUTO_DOWNLOAD: Enable/disable auto model download
        - COMFYUI_FALLBACK_MODE: Set fallback mode
        - COMFYUI_DEFAULT_WORKFLOW: Set default workflow
        
        Returns:
            ComfyUIConfig instance
            
        Validates: Requirements 9.5, 13.12
        """
        import os
        
        config = cls()
        
        # Override from environment variables
        if 'COMFYUI_HOST' in os.environ:
            config.host = os.environ['COMFYUI_HOST']
        
        if 'COMFYUI_PORT' in os.environ:
            try:
                config.port = int(os.environ['COMFYUI_PORT'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_PORT: {os.environ['COMFYUI_PORT']}")
        
        if 'COMFYUI_TIMEOUT' in os.environ:
            try:
                config.timeout = int(os.environ['COMFYUI_TIMEOUT'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_TIMEOUT: {os.environ['COMFYUI_TIMEOUT']}")
        
        if 'COMFYUI_AUTO_DOWNLOAD' in os.environ:
            config.auto_download_models = os.environ['COMFYUI_AUTO_DOWNLOAD'].lower() in ('true', '1', 'yes')
        
        if 'COMFYUI_FALLBACK_MODE' in os.environ:
            config.fallback_mode = os.environ['COMFYUI_FALLBACK_MODE']
        
        if 'COMFYUI_DEFAULT_WORKFLOW' in os.environ:
            config.default_workflow = os.environ['COMFYUI_DEFAULT_WORKFLOW']
        
        return config
    
    @property
    def url(self) -> str:
        """Get full ComfyUI URL"""
        return f"http://{self.host}:{self.port}"
    
    def validate(self) -> List[str]:
        """
        Validate configuration values.
        
        Returns:
            List of validation errors (empty if valid)
            
        Validates: Requirements 9.3, 9.4, 13.12
        """
        errors = []
        
        # Validate port
        if not isinstance(self.port, int) or not (1 <= self.port <= 65535):
            errors.append(f"Invalid port: {self.port}. Must be between 1 and 65535")
        
        # Validate timeout
        if not isinstance(self.timeout, int) or self.timeout < 1:
            errors.append(f"Invalid timeout: {self.timeout}. Must be positive integer")
        
        # Validate max_retries
        if not isinstance(self.max_retries, int) or self.max_retries < 0:
            errors.append(f"Invalid max_retries: {self.max_retries}. Must be non-negative integer")
        
        # Validate retry_backoff
        if not isinstance(self.retry_backoff, (int, float)) or self.retry_backoff < 0:
            errors.append(f"Invalid retry_backoff: {self.retry_backoff}. Must be non-negative number")
        
        # Validate fallback_mode
        valid_modes = ["placeholder", "skip", "abort"]
        if self.fallback_mode not in valid_modes:
            errors.append(f"Invalid fallback_mode: {self.fallback_mode}. Must be one of {valid_modes}")
        
        # Validate default_workflow
        valid_workflows = [
            "z_image_turbo",
            "z_image_turbo_generation",
            "z_image_turbo_coherence_grid",
            "z_image_turbo_shot_generation",
            "flux_basic_generation",
            "flux_coherence_grid",
            "flux_shot_generation",
            "sdxl_fallback"
        ]
        if self.default_workflow not in valid_workflows:
            errors.append(
                f"Invalid default_workflow: {self.default_workflow}. "
                f"Must be one of {valid_workflows}"
            )
        
        return errors


class ConnectionManager:
    """
    Manages connection lifecycle to ComfyUI Desktop.
    
    Provides:
    - Async connection with timeout handling
    - Health checking using /system_stats endpoint
    - Periodic health monitoring with callbacks
    - Connection failure handling and fallback
    - Background reconnection attempts
    
    Validates: Requirements 1.1, 1.2, 1.3, 6.1, 6.5, 11.1, 11.4
    """
    
    def __init__(self, config: ComfyUIConfig):
        """
        Initialize ConnectionManager.
        
        Args:
            config: ComfyUI configuration
        """
        self.config = config
        self.status: ComfyUIStatus = ComfyUIStatus(
            available=False,
            url=config.url
        )
        self._session: Optional[aiohttp.ClientSession] = None
        self._health_check_task: Optional[asyncio.Task] = None
        self._status_callbacks: List[Callable[[ComfyUIStatus], None]] = []
        self._is_monitoring = False
        self._reconnection_task: Optional[asyncio.Task] = None
        
    async def connect(self) -> ComfyUIStatus:
        """
        Attempt connection to ComfyUI Desktop.
        
        Returns:
            ComfyUIStatus with connection result
            
        Validates: Requirements 1.1, 1.2
        """
        logger.info(f"Attempting to connect to ComfyUI at {self.config.url}")
        
        try:
            # Create session if needed
            if not self._session or self._session.closed:
                self._session = aiohttp.ClientSession()
            
            # Attempt connection with timeout
            async with self._session.get(
                f"{self.config.url}/system_stats",
                timeout=aiohttp.ClientTimeout(total=self.config.timeout)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Update status
                    self.status = ComfyUIStatus(
                        available=True,
                        url=self.config.url,
                        version=data.get('system', {}).get('version'),
                        queue_size=data.get('system', {}).get('queue_remaining', 0)
                    )
                    
                    logger.info(f"Successfully connected to ComfyUI {self.status.version}")
                    
                    # Notify callbacks
                    self._notify_status_change(self.status)
                    
                    return self.status
                else:
                    error_msg = f"HTTP {response.status}"
                    logger.warning(f"ComfyUI connection failed: {error_msg}")
                    
                    self.status = ComfyUIStatus(
                        available=False,
                        url=self.config.url,
                        error_message=error_msg
                    )
                    
                    # Notify callbacks
                    self._notify_status_change(self.status)
                    
                    return self.status
                    
        except asyncio.TimeoutError:
            error_msg = "Connection timeout"
            logger.warning(f"ComfyUI connection timeout at {self.config.url}")
            
            self.status = ComfyUIStatus(
                available=False,
                url=self.config.url,
                error_message=error_msg
            )
            
            # Notify callbacks
            self._notify_status_change(self.status)
            
            return self.status
            
        except aiohttp.ClientError as e:
            error_msg = f"Connection error: {str(e)}"
            logger.warning(f"ComfyUI connection error: {e}")
            
            self.status = ComfyUIStatus(
                available=False,
                url=self.config.url,
                error_message=error_msg
            )
            
            # Notify callbacks
            self._notify_status_change(self.status)
            
            return self.status
            
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(f"Unexpected error connecting to ComfyUI: {e}")
            
            self.status = ComfyUIStatus(
                available=False,
                url=self.config.url,
                error_message=error_msg
            )
            
            # Notify callbacks
            self._notify_status_change(self.status)
            
            return self.status
    
    async def disconnect(self):
        """
        Close connection and cleanup resources.
        
        Validates: Requirement 6.5
        """
        logger.info("Disconnecting from ComfyUI")
        
        # Stop health monitoring
        await self.stop_health_monitoring()
        
        # Stop reconnection attempts
        if self._reconnection_task and not self._reconnection_task.done():
            self._reconnection_task.cancel()
            try:
                await self._reconnection_task
            except asyncio.CancelledError:
                pass
        
        # Close session
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None
        
        # Update status
        self.status = ComfyUIStatus(
            available=False,
            url=self.config.url,
            error_message="Disconnected"
        )
    
    async def check_health(self) -> ComfyUIStatus:
        """
        Check backend health using /system_stats endpoint.
        
        Returns:
            ComfyUIStatus with current health status
            
        Validates: Requirements 1.2, 6.1
        """
        try:
            # Create session if needed
            if not self._session or self._session.closed:
                self._session = aiohttp.ClientSession()
            
            # Check health endpoint
            async with self._session.get(
                f"{self.config.url}/system_stats",
                timeout=aiohttp.ClientTimeout(total=5)  # Shorter timeout for health checks
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Update status
                    previous_available = self.status.available
                    
                    self.status = ComfyUIStatus(
                        available=True,
                        url=self.config.url,
                        version=data.get('system', {}).get('version'),
                        queue_size=data.get('system', {}).get('queue_remaining', 0)
                    )
                    
                    # Notify if status changed
                    if not previous_available:
                        logger.info("ComfyUI backend became available")
                        self._notify_status_change(self.status)
                    
                    return self.status
                else:
                    # Backend returned error
                    previous_available = self.status.available
                    
                    self.status = ComfyUIStatus(
                        available=False,
                        url=self.config.url,
                        error_message=f"HTTP {response.status}"
                    )
                    
                    # Notify if status changed
                    if previous_available:
                        logger.warning("ComfyUI backend became unavailable")
                        self._notify_status_change(self.status)
                    
                    return self.status
                    
        except (asyncio.TimeoutError, aiohttp.ClientError) as e:
            # Connection failed
            previous_available = self.status.available
            
            self.status = ComfyUIStatus(
                available=False,
                url=self.config.url,
                error_message=str(e)
            )
            
            # Notify if status changed
            if previous_available:
                logger.warning(f"ComfyUI health check failed: {e}")
                self._notify_status_change(self.status)
            
            return self.status
            
        except Exception as e:
            # Unexpected error
            logger.error(f"Unexpected error during health check: {e}")
            
            previous_available = self.status.available
            
            self.status = ComfyUIStatus(
                available=False,
                url=self.config.url,
                error_message=f"Unexpected error: {str(e)}"
            )
            
            # Notify if status changed
            if previous_available:
                self._notify_status_change(self.status)
            
            return self.status
    
    async def start_health_monitoring(self, interval: int = 5):
        """
        Start periodic health checking.
        
        Args:
            interval: Check interval in seconds (default 5)
            
        Validates: Requirement 6.5
        """
        if self._is_monitoring:
            logger.warning("Health monitoring already running")
            return
        
        logger.info(f"Starting health monitoring (interval: {interval}s)")
        self._is_monitoring = True
        
        # Create monitoring task
        self._health_check_task = asyncio.create_task(
            self._health_monitoring_loop(interval)
        )
    
    async def stop_health_monitoring(self):
        """
        Stop periodic health checking.
        
        Validates: Requirement 6.5
        """
        if not self._is_monitoring:
            return
        
        logger.info("Stopping health monitoring")
        self._is_monitoring = False
        
        # Cancel monitoring task
        if self._health_check_task and not self._health_check_task.done():
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
        
        self._health_check_task = None
    
    async def _health_monitoring_loop(self, interval: int):
        """
        Internal health monitoring loop.
        
        Args:
            interval: Check interval in seconds
        """
        while self._is_monitoring:
            try:
                await self.check_health()
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health monitoring loop: {e}")
                await asyncio.sleep(interval)
    
    def register_status_callback(self, callback: Callable[[ComfyUIStatus], None]):
        """
        Register callback for status changes.
        
        Args:
            callback: Function to call when status changes
            
        Validates: Requirement 6.5
        """
        if callback not in self._status_callbacks:
            self._status_callbacks.append(callback)
            callback_name = getattr(callback, '__name__', repr(callback))
            logger.debug(f"Registered status callback: {callback_name}")
    
    def unregister_status_callback(self, callback: Callable[[ComfyUIStatus], None]):
        """
        Unregister status callback.
        
        Args:
            callback: Function to remove from callbacks
        """
        if callback in self._status_callbacks:
            self._status_callbacks.remove(callback)
            callback_name = getattr(callback, '__name__', repr(callback))
            logger.debug(f"Unregistered status callback: {callback_name}")
    
    def _notify_status_change(self, status: ComfyUIStatus):
        """
        Notify all registered callbacks of status change.
        
        Args:
            status: New status
        """
        for callback in self._status_callbacks:
            try:
                callback(status)
            except Exception as e:
                callback_name = getattr(callback, '__name__', repr(callback))
                logger.error(f"Error in status callback {callback_name}: {e}")
    
    def get_status(self) -> ComfyUIStatus:
        """
        Get current connection status.
        
        Returns:
            Current ComfyUIStatus
            
        Validates: Requirement 6.1
        """
        return self.status
    
    async def start_background_reconnection(self, interval: int = 10):
        """
        Start background reconnection attempts.
        
        Args:
            interval: Reconnection attempt interval in seconds
            
        Validates: Requirements 11.4
        """
        if self._reconnection_task and not self._reconnection_task.done():
            logger.warning("Background reconnection already running")
            return
        
        logger.info(f"Starting background reconnection (interval: {interval}s)")
        
        # Create reconnection task
        self._reconnection_task = asyncio.create_task(
            self._reconnection_loop(interval)
        )
    
    async def stop_background_reconnection(self):
        """
        Stop background reconnection attempts.
        
        Validates: Requirement 11.4
        """
        if self._reconnection_task and not self._reconnection_task.done():
            logger.info("Stopping background reconnection")
            self._reconnection_task.cancel()
            try:
                await self._reconnection_task
            except asyncio.CancelledError:
                pass
        
        self._reconnection_task = None
    
    async def _reconnection_loop(self, interval: int):
        """
        Internal reconnection loop.
        
        Args:
            interval: Reconnection attempt interval in seconds
        """
        while True:
            try:
                # Only attempt reconnection if currently unavailable
                if not self.status.available:
                    logger.debug("Attempting background reconnection...")
                    status = await self.connect()
                    
                    if status.available:
                        logger.info("Background reconnection successful")
                        # Stop reconnection loop on success
                        break
                
                await asyncio.sleep(interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in reconnection loop: {e}")
                await asyncio.sleep(interval)
    
    def should_use_fallback(self) -> bool:
        """
        Check if fallback mode should be used.
        
        Returns:
            True if backend unavailable and fallback should be used
            
        Validates: Requirements 1.3, 11.1
        """
        return not self.status.available
    
    def get_fallback_mode(self) -> str:
        """
        Get configured fallback mode.
        
        Returns:
            Fallback mode string ("placeholder", "skip", or "abort")
            
        Validates: Requirement 11.1
        """
        return self.config.fallback_mode
    
    def trigger_fallback_warning(self) -> str:
        """
        Generate fallback warning message.
        
        Returns:
            Warning message for user
            
        Validates: Requirements 1.3, 11.1
        """
        error_msg = self.status.error_message or "Unknown error"
        
        warning = (
            f"ComfyUI backend unavailable: {error_msg}\n"
            f"Falling back to {self.config.fallback_mode} mode.\n"
            f"Background reconnection attempts will continue."
        )
        
        logger.warning(warning)
        return warning
