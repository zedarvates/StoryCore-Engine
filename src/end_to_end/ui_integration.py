"""
UI Integration for ComfyUI Desktop.

This module provides integration between the UI and ComfyUI components,
handling status updates, progress tracking, and event callbacks.
"""

import logging
from typing import Optional, Callable, Dict, Any
from pathlib import Path

from src.end_to_end.connection_manager import ConnectionManager
from src.end_to_end.model_manager import ModelManager, DownloadProgress
from src.end_to_end.workflow_manager import WorkflowManager
from src.end_to_end.generation_engine import GenerationEngine, GenerationProgress
from src.end_to_end.data_models import ComfyUIStatus

logger = logging.getLogger(__name__)


class UIIntegration:
    """
    Integrates UI with ComfyUI components.
    
    Provides:
    - Connection status callbacks for UI updates
    - Download progress tracking for UI display
    - Generation progress monitoring for UI feedback
    - Status display initialization
    
    Validates: Requirements 6.1, 7.1, 8.1
    """
    
    def __init__(
        self,
        connection_manager: ConnectionManager,
        model_manager: ModelManager,
        workflow_manager: WorkflowManager,
        generation_engine: GenerationEngine
    ):
        """
        Initialize UI integration.
        
        Args:
            connection_manager: ConnectionManager instance
            model_manager: ModelManager instance
            workflow_manager: WorkflowManager instance
            generation_engine: GenerationEngine instance
        """
        self.connection_manager = connection_manager
        self.model_manager = model_manager
        self.workflow_manager = workflow_manager
        self.generation_engine = generation_engine
        
        # UI callback registrations
        self._connection_callbacks: list = []
        self._download_callbacks: list = []
        self._generation_callbacks: list = []
        
        # Initialize status displays
        self._initialize_status_displays()
        
        logger.info("UI integration initialized")
    
    def _initialize_status_displays(self):
        """
        Initialize all status displays.
        
        Validates: Requirements 6.1, 7.1, 8.1
        """
        # Register connection status callback
        self.connection_manager.register_status_callback(
            self._on_connection_status_change
        )
        
        logger.debug("Status displays initialized")
    
    def register_connection_callback(
        self,
        callback: Callable[[ComfyUIStatus], None]
    ):
        """
        Register callback for connection status changes.
        
        Args:
            callback: Function to call when connection status changes
            
        Validates: Requirement 6.1
        """
        if callback not in self._connection_callbacks:
            self._connection_callbacks.append(callback)
            logger.debug(f"Registered connection callback: {callback.__name__}")
    
    def register_download_callback(
        self,
        callback: Callable[[str, DownloadProgress], None]
    ):
        """
        Register callback for download progress updates.
        
        Args:
            callback: Function to call with (model_name, progress)
            
        Validates: Requirement 7.1
        """
        if callback not in self._download_callbacks:
            self._download_callbacks.append(callback)
            logger.debug(f"Registered download callback: {callback.__name__}")
    
    def register_generation_callback(
        self,
        callback: Callable[[GenerationProgress], None]
    ):
        """
        Register callback for generation progress updates.
        
        Args:
            callback: Function to call with generation progress
            
        Validates: Requirement 8.1
        """
        if callback not in self._generation_callbacks:
            self._generation_callbacks.append(callback)
            logger.debug(f"Registered generation callback: {callback.__name__}")
    
    def _on_connection_status_change(self, status: ComfyUIStatus):
        """
        Handle connection status changes.
        
        Args:
            status: New connection status
        """
        logger.info(f"Connection status changed: available={status.available}")
        
        # Notify all registered callbacks
        for callback in self._connection_callbacks:
            try:
                callback(status)
            except Exception as e:
                logger.error(f"Error in connection callback: {e}")
    
    def get_connection_status_display(self) -> Dict[str, Any]:
        """
        Get current connection status for UI display.
        
        Returns:
            Dictionary with connection status information
            
        Validates: Requirement 6.1
        """
        status = self.connection_manager.get_status()
        
        # Determine status string and color
        if status.available:
            status_str = "Connected"
            status_color = "green"
            message = f"Connected to ComfyUI {status.version or 'Desktop'}"
            action_button = None
        elif status.error_message:
            status_str = "Error"
            status_color = "red"
            message = f"Connection error: {status.error_message}"
            action_button = "Retry"
        else:
            status_str = "Disconnected"
            status_color = "gray"
            message = "Not connected to ComfyUI Desktop"
            action_button = "Connect"
        
        return {
            "status": status_str,
            "status_color": status_color,
            "message": message,
            "details": {
                "url": status.url,
                "version": status.version,
                "queue_size": status.queue_size,
                "cors_enabled": status.cors_enabled,
                "models_ready": status.models_ready,
                "workflows_ready": status.workflows_ready
            },
            "action_button": action_button
        }
    
    def get_download_status_display(self) -> Dict[str, Any]:
        """
        Get current download status for UI display.
        
        Returns:
            Dictionary with download status information
            
        Validates: Requirement 7.1
        """
        active_downloads = []
        completed_count = 0
        failed_count = 0
        total_downloaded_mb = 0
        
        # Get all download progress
        for model_name, progress in self.model_manager.downloads.items():
            if progress.status == "downloading":
                active_downloads.append({
                    "model_name": model_name,
                    "percentage": progress.percentage,
                    "downloaded_mb": progress.downloaded_bytes / (1024**2),
                    "total_mb": progress.total_bytes / (1024**2),
                    "speed_mbps": progress.speed_mbps,
                    "eta_seconds": progress.eta_seconds,
                    "status": progress.status
                })
                total_downloaded_mb += progress.downloaded_bytes / (1024**2)
            elif progress.status == "completed":
                completed_count += 1
                total_downloaded_mb += progress.total_bytes / (1024**2)
            elif progress.status == "failed":
                failed_count += 1
        
        # Calculate overall progress
        total_downloads = len(self.model_manager.downloads)
        overall_progress = 0
        if total_downloads > 0:
            overall_progress = (completed_count / total_downloads) * 100
        
        return {
            "active_downloads": active_downloads,
            "completed_count": completed_count,
            "failed_count": failed_count,
            "total_downloaded_mb": total_downloaded_mb,
            "overall_progress": overall_progress
        }
    
    def get_generation_status_display(self) -> Dict[str, Any]:
        """
        Get current generation status for UI display.
        
        Returns:
            Dictionary with generation status information
            
        Validates: Requirement 8.1
        """
        session = self.generation_engine.current_session
        
        if not session:
            return {
                "active": False,
                "current_step": None,
                "progress": 0,
                "current_item": 0,
                "total_items": 0,
                "elapsed_time": "0:00",
                "estimated_remaining": "0:00",
                "can_cancel": False
            }
        
        # Get metrics
        metrics = self.generation_engine.get_generation_metrics()
        
        # Format times
        elapsed_minutes = int(metrics.total_time // 60)
        elapsed_seconds = int(metrics.total_time % 60)
        elapsed_time = f"{elapsed_minutes}:{elapsed_seconds:02d}"
        
        # Calculate remaining time
        if session.completed_items > 0:
            avg_time = metrics.total_time / session.completed_items
            remaining_items = session.total_items - session.completed_items
            remaining_seconds = avg_time * remaining_items
            remaining_minutes = int(remaining_seconds // 60)
            remaining_seconds = int(remaining_seconds % 60)
            estimated_remaining = f"{remaining_minutes}:{remaining_seconds:02d}"
        else:
            estimated_remaining = "calculating..."
        
        # Calculate progress
        progress = (session.completed_items / session.total_items * 100) if session.total_items > 0 else 0
        
        return {
            "active": True,
            "current_step": session.session_type,
            "progress": progress,
            "current_item": session.completed_items,
            "total_items": session.total_items,
            "elapsed_time": elapsed_time,
            "estimated_remaining": estimated_remaining,
            "can_cancel": not session.cancelled
        }
    
    def trigger_download_progress_update(
        self,
        model_name: str,
        progress: DownloadProgress
    ):
        """
        Trigger download progress update to UI.
        
        Args:
            model_name: Name of the model being downloaded
            progress: Download progress information
        """
        for callback in self._download_callbacks:
            try:
                callback(model_name, progress)
            except Exception as e:
                logger.error(f"Error in download callback: {e}")
    
    def trigger_generation_progress_update(
        self,
        progress: GenerationProgress
    ):
        """
        Trigger generation progress update to UI.
        
        Args:
            progress: Generation progress information
        """
        for callback in self._generation_callbacks:
            try:
                callback(progress)
            except Exception as e:
                logger.error(f"Error in generation callback: {e}")
    
    def cleanup(self):
        """
        Cleanup UI integration.
        
        Unregisters all callbacks and cleans up resources.
        """
        # Unregister connection callback
        self.connection_manager.unregister_status_callback(
            self._on_connection_status_change
        )
        
        # Clear callback lists
        self._connection_callbacks.clear()
        self._download_callbacks.clear()
        self._generation_callbacks.clear()
        
        logger.info("UI integration cleaned up")


def create_ui_integration(
    connection_manager: ConnectionManager,
    model_manager: ModelManager,
    workflow_manager: WorkflowManager,
    generation_engine: GenerationEngine
) -> UIIntegration:
    """
    Factory function to create UI integration.
    
    Args:
        connection_manager: ConnectionManager instance
        model_manager: ModelManager instance
        workflow_manager: WorkflowManager instance
        generation_engine: GenerationEngine instance
        
    Returns:
        Initialized UIIntegration instance
    """
    return UIIntegration(
        connection_manager=connection_manager,
        model_manager=model_manager,
        workflow_manager=workflow_manager,
        generation_engine=generation_engine
    )
