"""
ComfyUI Connection Implementation

This module provides a connection implementation for ComfyUI backend services
with connection pooling support.
"""

import logging
import requests
from typing import Any, Dict, Optional
from dataclasses import dataclass

from .connection_pool import (
    Connection,
    ConnectionConfig,
    ConnectionPool,
    BackendType,
    get_pool_manager
)

logger = logging.getLogger(__name__)


@dataclass
class ComfyUIConfig:
    """ComfyUI-specific configuration"""
    host: str = "localhost"
    port: int = 8188
    api_path: str = "/api"
    timeout: float = 30.0
    verify_ssl: bool = True


class ComfyUIConnection(Connection):
    """Connection to ComfyUI backend"""
    
    def __init__(self, config: ComfyUIConfig):
        self.config = config
        self.base_url = f"http://{config.host}:{config.port}{config.api_path}"
        self.session: Optional[requests.Session] = None
        self._connected = False
    
    def connect(self) -> None:
        """Establish connection to ComfyUI"""
        try:
            self.session = requests.Session()
            self.session.headers.update({
                "Content-Type": "application/json",
                "Accept": "application/json"
            })
            
            # Test connection
            response = self.session.get(
                f"{self.base_url}/system_stats",
                timeout=self.config.timeout
            )
            response.raise_for_status()
            
            self._connected = True
            logger.info(f"Connected to ComfyUI at {self.base_url}")
            
        except Exception as e:
            logger.error(f"Failed to connect to ComfyUI: {e}")
            self._connected = False
            raise
    
    def disconnect(self) -> None:
        """Close connection to ComfyUI"""
        if self.session:
            self.session.close()
            self.session = None
        
        self._connected = False
        logger.info("Disconnected from ComfyUI")
    
    def is_healthy(self) -> bool:
        """Check if connection is healthy"""
        if not self._connected or not self.session:
            return False
        
        try:
            response = self.session.get(
                f"{self.base_url}/system_stats",
                timeout=5.0
            )
            return response.status_code == 200
        except Exception:
            return False
    
    def execute(self, operation: str, **kwargs) -> Any:
        """Execute operation on ComfyUI"""
        if not self._connected or not self.session:
            raise RuntimeError("Not connected to ComfyUI")
        
        if operation == "queue_prompt":
            return self._queue_prompt(kwargs.get("workflow"), kwargs.get("client_id"))
        elif operation == "get_history":
            return self._get_history(kwargs.get("prompt_id"))
        elif operation == "get_queue":
            return self._get_queue()
        elif operation == "interrupt":
            return self._interrupt()
        elif operation == "get_system_stats":
            return self._get_system_stats()
        else:
            raise ValueError(f"Unknown operation: {operation}")
    
    def _queue_prompt(self, workflow: Dict[str, Any], client_id: Optional[str] = None) -> Dict[str, Any]:
        """Queue a prompt for execution"""
        payload = {"prompt": workflow}
        if client_id:
            payload["client_id"] = client_id
        
        response = self.session.post(
            f"{self.base_url}/prompt",
            json=payload,
            timeout=self.config.timeout
        )
        response.raise_for_status()
        return response.json()
    
    def _get_history(self, prompt_id: str) -> Dict[str, Any]:
        """Get execution history for a prompt"""
        response = self.session.get(
            f"{self.base_url}/history/{prompt_id}",
            timeout=self.config.timeout
        )
        response.raise_for_status()
        return response.json()
    
    def _get_queue(self) -> Dict[str, Any]:
        """Get current queue status"""
        response = self.session.get(
            f"{self.base_url}/queue",
            timeout=self.config.timeout
        )
        response.raise_for_status()
        return response.json()
    
    def _interrupt(self) -> Dict[str, Any]:
        """Interrupt current execution"""
        response = self.session.post(
            f"{self.base_url}/interrupt",
            timeout=self.config.timeout
        )
        response.raise_for_status()
        return response.json()
    
    def _get_system_stats(self) -> Dict[str, Any]:
        """Get system statistics"""
        response = self.session.get(
            f"{self.base_url}/system_stats",
            timeout=self.config.timeout
        )
        response.raise_for_status()
        return response.json()


def create_comfyui_pool(
    name: str = "comfyui",
    comfyui_config: Optional[ComfyUIConfig] = None,
    min_connections: int = 1,
    max_connections: int = 5
) -> ConnectionPool[ComfyUIConnection]:
    """
    Create a connection pool for ComfyUI
    
    Args:
        name: Pool name
        comfyui_config: ComfyUI configuration
        min_connections: Minimum connections to maintain
        max_connections: Maximum connections allowed
    
    Returns:
        ConnectionPool for ComfyUI
    """
    comfyui_config = comfyui_config or ComfyUIConfig()
    
    pool_config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host=comfyui_config.host,
        port=comfyui_config.port,
        min_connections=min_connections,
        max_connections=max_connections,
        connection_timeout=comfyui_config.timeout,
        idle_timeout=300.0,  # 5 minutes
        health_check_interval=60.0,  # 1 minute
        enable_health_check=True
    )
    
    def connection_factory() -> ComfyUIConnection:
        return ComfyUIConnection(comfyui_config)
    
    manager = get_pool_manager()
    return manager.create_pool(name, pool_config, connection_factory)


def get_comfyui_pool(name: str = "comfyui") -> ConnectionPool[ComfyUIConnection]:
    """Get ComfyUI connection pool"""
    manager = get_pool_manager()
    return manager.get_pool(name)
