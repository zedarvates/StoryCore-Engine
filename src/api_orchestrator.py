"""
ComfyUI API Orchestrator
Handles WebSocket and HTTP communication with ComfyUI service.
"""

import asyncio
import aiohttp
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, Callable, List
from pathlib import Path

from .comfyui_config import ComfyUIConfig
from .comfyui_models import (
    ExecutionUpdate, ExecutionStatus, ComfyUIWorkflow, ExecutionResult,
    PerformanceMetrics, GeneratedAsset
)
from .error_handler import ErrorHandler, ErrorCategory, FallbackMode
from .performance_monitor import PerformanceMonitor


class APIOrchestrator:
    """
    Orchestrates communication with ComfyUI via WebSocket and HTTP APIs.
    
    Provides real-time workflow execution monitoring, automatic reconnection,
    and fallback mechanisms for reliable communication.
    """
    
    def __init__(self, config: ComfyUIConfig):
        """
        Initialize API Orchestrator.
        
        Args:
            config: ComfyUI configuration for connection details.
        """
        self.config = config
        self.logger = self._setup_logging()
        
        # Connection management
        self._websocket: Optional[aiohttp.ClientWebSocketResponse] = None
        self._session: Optional[aiohttp.ClientSession] = None
        self._connected = False
        self._reconnect_attempts = 0
        self._max_reconnect_attempts = 5
        
        # Execution tracking
        self._active_executions: Dict[str, ExecutionResult] = {}
        self._execution_callbacks: Dict[str, Callable] = {}
        
        # Performance tracking
        self.metrics: List[PerformanceMetrics] = []
        
        # Fallback configuration
        self._use_websocket = True
        self._polling_interval = 2.0  # seconds
        
        # Error handler for comprehensive error management
        self.error_handler = ErrorHandler(config)
        self.error_handler.add_recovery_callback(self._on_error_recovery)
        
        # Performance monitor for metrics collection
        self.performance_monitor = PerformanceMonitor(config)
        
        # Fallback state
        self._mock_mode_active = False
        self._http_fallback_active = False
        
        self.logger.info(f"API Orchestrator initialized for {self.config.server_url}")
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for the orchestrator."""
        logger = logging.getLogger("comfyui_api_orchestrator")
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
    
    async def connect(self) -> bool:
        """
        Establish connection to ComfyUI service with comprehensive error handling.
        
        Returns:
            True if connection successful, False otherwise.
        """
        try:
            # Return mock connection if in mock mode
            if self._mock_mode_active:
                self._connected = True
                self.logger.info("API Orchestrator connected in mock mode")
                return True
            
            # Create session if not exists
            if self._session is None:
                timeout = aiohttp.ClientTimeout(total=30.0)
                self._session = aiohttp.ClientSession(timeout=timeout)
            
            # Try WebSocket connection first
            if self._use_websocket and not self._http_fallback_active:
                success = await self._connect_websocket()
                if success:
                    self._connected = True
                    self._reconnect_attempts = 0
                    self.logger.info("WebSocket connection established")
                    return True
                else:
                    # Handle WebSocket connection failure
                    ws_error = Exception("WebSocket connection failed")
                    fallback_mode = await self.error_handler.handle_error(
                        ws_error,
                        {"component": "api_orchestrator", "operation": "websocket_connect"}
                    )
                    
                    if fallback_mode == FallbackMode.MOCK:
                        return await self.connect()  # Retry with mock mode
                    
                    self.logger.warning("WebSocket connection failed, falling back to HTTP polling")
                    self._use_websocket = False
                    self._http_fallback_active = True
            
            # HTTP polling fallback
            self._connected = True
            self.logger.info("Using HTTP polling mode")
            return True
            
        except Exception as e:
            # Handle connection error with fallback
            fallback_mode = await self.error_handler.handle_error(
                e,
                {"component": "api_orchestrator", "operation": "connect"}
            )
            
            if fallback_mode == FallbackMode.MOCK:
                self._mock_mode_active = True
                self._connected = True
                self.logger.info("API Orchestrator connected in mock mode due to connection error")
                return True
            
            self.logger.error(f"Failed to connect to ComfyUI: {e}")
            return False
    
    async def _connect_websocket(self) -> bool:
        """
        Establish WebSocket connection.
        
        Returns:
            True if WebSocket connection successful, False otherwise.
        """
        try:
            self._websocket = await self._session.ws_connect(
                self.config.websocket_url,
                timeout=10.0
            )
            
            # Start listening for messages
            asyncio.create_task(self._websocket_listener())
            
            return True
            
        except Exception as e:
            self.logger.error(f"WebSocket connection failed: {e}")
            return False
    
    async def _websocket_listener(self) -> None:
        """Listen for WebSocket messages from ComfyUI."""
        try:
            async for msg in self._websocket:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        await self._handle_websocket_message(data)
                    except json.JSONDecodeError as e:
                        self.logger.error(f"Failed to parse WebSocket message: {e}")
                        
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    self.logger.error(f"WebSocket error: {self._websocket.exception()}")
                    break
                    
        except Exception as e:
            self.logger.error(f"WebSocket listener error: {e}")
        finally:
            self._connected = False
            self._websocket = None
            
            # Attempt reconnection if not at max attempts
            if self._reconnect_attempts < self._max_reconnect_attempts:
                self._reconnect_attempts += 1
                self.logger.info(f"Attempting WebSocket reconnection ({self._reconnect_attempts}/{self._max_reconnect_attempts})")
                await asyncio.sleep(2 ** self._reconnect_attempts)  # Exponential backoff
                await self._connect_websocket()
    
    async def _handle_websocket_message(self, data: Dict[str, Any]) -> None:
        """
        Handle incoming WebSocket message from ComfyUI.
        
        Args:
            data: Parsed message data from ComfyUI.
        """
        message_type = data.get("type")
        
        if message_type == "status":
            # Queue status update
            exec_info = data.get("data", {}).get("status", {}).get("exec_info", {})
            queue_remaining = exec_info.get("queue_remaining", 0)
            self.logger.debug(f"Queue status: {queue_remaining} remaining")
            
        elif message_type == "progress":
            # Execution progress update
            prompt_id = data.get("data", {}).get("prompt_id")
            if prompt_id and prompt_id in self._active_executions:
                progress_data = data.get("data", {})
                
                update = ExecutionUpdate(
                    prompt_id=prompt_id,
                    node_id=progress_data.get("node"),
                    progress=progress_data.get("value", 0) / progress_data.get("max", 1),
                    status=ExecutionStatus.EXECUTING
                )
                
                # Call callback if registered
                if prompt_id in self._execution_callbacks:
                    try:
                        await self._execution_callbacks[prompt_id](update)
                    except Exception as e:
                        self.logger.error(f"Execution callback error: {e}")
        
        elif message_type == "executing":
            # Node execution status
            prompt_id = data.get("data", {}).get("prompt_id")
            node_id = data.get("data", {}).get("node")
            
            if prompt_id and prompt_id in self._active_executions:
                if node_id is None:
                    # Execution completed
                    execution = self._active_executions[prompt_id]
                    execution.status = ExecutionStatus.COMPLETED
                    execution.completed_at = datetime.utcnow()
                    
                    self.logger.info(f"Execution {prompt_id} completed")
                    
                    # Get output files
                    try:
                        output_files = await self._get_execution_outputs(prompt_id)
                        execution.output_files = output_files
                    except Exception as e:
                        self.logger.error(f"Failed to get execution outputs: {e}")
                    
                    # Call completion callback
                    if prompt_id in self._execution_callbacks:
                        try:
                            final_update = ExecutionUpdate(
                                prompt_id=prompt_id,
                                status=ExecutionStatus.COMPLETED
                            )
                            await self._execution_callbacks[prompt_id](final_update)
                        except Exception as e:
                            self.logger.error(f"Completion callback error: {e}")
                else:
                    # Node started executing
                    update = ExecutionUpdate(
                        prompt_id=prompt_id,
                        node_id=node_id,
                        status=ExecutionStatus.EXECUTING
                    )
                    
                    if prompt_id in self._execution_callbacks:
                        try:
                            await self._execution_callbacks[prompt_id](update)
                        except Exception as e:
                            self.logger.error(f"Node execution callback error: {e}")
        
        elif message_type == "execution_error":
            # Execution failed
            prompt_id = data.get("data", {}).get("prompt_id")
            if prompt_id and prompt_id in self._active_executions:
                execution = self._active_executions[prompt_id]
                execution.status = ExecutionStatus.FAILED
                execution.completed_at = datetime.utcnow()
                execution.error_message = str(data.get("data", {}))
                
                self.logger.error(f"Execution {prompt_id} failed: {execution.error_message}")
                
                # Call error callback
                if prompt_id in self._execution_callbacks:
                    try:
                        error_update = ExecutionUpdate(
                            prompt_id=prompt_id,
                            status=ExecutionStatus.FAILED,
                            message=execution.error_message
                        )
                        await self._execution_callbacks[prompt_id](error_update)
                    except Exception as e:
                        self.logger.error(f"Error callback error: {e}")
    
    async def submit_workflow(
        self, 
        workflow: ComfyUIWorkflow, 
        callback: Optional[Callable[[ExecutionUpdate], None]] = None
    ) -> str:
        """
        Submit workflow for execution with comprehensive error handling.
        
        Args:
            workflow: ComfyUI workflow to execute.
            callback: Optional callback for execution updates.
            
        Returns:
            Prompt ID for tracking execution.
        """
        operation_id = f"workflow_submission_{int(time.time())}"
        self.performance_monitor.record_operation_start("workflow_submission", operation_id)
        
        try:
            # Handle mock mode
            if self._mock_mode_active:
                prompt_id = self._submit_mock_workflow(workflow)
                
                # Call callback with mock completion
                if callback:
                    try:
                        completion_update = ExecutionUpdate(
                            prompt_id=prompt_id,
                            status=ExecutionStatus.COMPLETED,
                            message="Mock workflow completed"
                        )
                        await callback(completion_update)
                    except Exception as callback_error:
                        self.logger.error(f"Mock callback error: {callback_error}")
                
                self.performance_monitor.record_operation_end(
                    "workflow_submission", operation_id, True, 
                    {"mode": "mock", "workflow_id": workflow.metadata.workflow_id}
                )
                return prompt_id
            
            # Generate unique prompt ID
            prompt_id = str(uuid.uuid4())
            
            # Prepare workflow data
            workflow_data = {
                "prompt": workflow.to_comfyui_format(),
                "client_id": prompt_id
            }
            
            # Submit via HTTP POST with error handling
            try:
                async with self._session.post(
                    f"{self.config.server_url}/prompt",
                    json=workflow_data
                ) as response:
                    
                    if response.status == 200:
                        result_data = await response.json()
                        actual_prompt_id = result_data.get("prompt_id", prompt_id)
                        
                        # Track execution
                        execution = ExecutionResult(
                            prompt_id=actual_prompt_id,
                            workflow_id=workflow.metadata.workflow_id,
                            status=ExecutionStatus.QUEUED,
                            started_at=datetime.utcnow()
                        )
                        
                        self._active_executions[actual_prompt_id] = execution
                        
                        if callback:
                            self._execution_callbacks[actual_prompt_id] = callback
                        
                        self.logger.info(f"Workflow submitted successfully: {actual_prompt_id}")
                        self.performance_monitor.record_operation_end(
                            "workflow_submission", operation_id, True,
                            {"prompt_id": actual_prompt_id, "workflow_id": workflow.metadata.workflow_id}
                        )
                        
                        return actual_prompt_id
                        
                    else:
                        # Handle HTTP error with fallback
                        http_error = Exception(f"Failed to submit workflow: HTTP {response.status}")
                        fallback_mode = await self.error_handler.handle_error(
                            http_error,
                            {"component": "api_orchestrator", "operation": "submit_workflow", "status_code": response.status}
                        )
                        
                        if fallback_mode == FallbackMode.MOCK:
                            return await self.submit_workflow(workflow, callback)  # Retry with mock mode
                        
                        error_msg = f"Failed to submit workflow: HTTP {response.status}"
                        self.logger.error(error_msg)
                        self.performance_monitor.record_operation_end(
                            "workflow_submission", operation_id, False,
                            {"error": error_msg, "status_code": response.status}
                        )
                        raise Exception(error_msg)
            
            except aiohttp.ClientError as client_error:
                # Handle network error with fallback
                fallback_mode = await self.error_handler.handle_error(
                    client_error,
                    {"component": "api_orchestrator", "operation": "submit_workflow", "error_type": "network"}
                )
                
                if fallback_mode == FallbackMode.MOCK:
                    return await self.submit_workflow(workflow, callback)  # Retry with mock mode
                elif fallback_mode == FallbackMode.RETRY:
                    # Retry will be handled by the error handler's retry mechanism
                    raise client_error
                
                error_msg = f"Network error during workflow submission: {str(client_error)}"
                self.logger.error(error_msg)
                self.performance_monitor.record_operation_end(
                    "workflow_submission", operation_id, False,
                    {"error": error_msg, "error_type": "network"}
                )
                raise Exception(error_msg)
        
        except Exception as e:
            # Handle unexpected error with fallback
            if not isinstance(e, Exception) or "Failed to submit workflow" not in str(e):
                fallback_mode = await self.error_handler.handle_error(
                    e,
                    {"component": "api_orchestrator", "operation": "submit_workflow"}
                )
                
                if fallback_mode == FallbackMode.MOCK:
                    return await self.submit_workflow(workflow, callback)  # Retry with mock mode
            
            error_msg = f"Workflow submission error: {str(e)}"
            self.logger.error(error_msg)
            self.performance_monitor.record_operation_end(
                "workflow_submission", operation_id, False,
                {"error": error_msg}
            )
            raise
        
        # Note: No finally block needed as performance monitor handles cleanup
    
    async def get_execution_status(self, prompt_id: str) -> Optional[ExecutionResult]:
        """
        Get execution status for a prompt.
        
        Args:
            prompt_id: Prompt ID to check status for.
            
        Returns:
            ExecutionResult if found, None otherwise.
        """
        return self._active_executions.get(prompt_id)
    
    async def _get_execution_outputs(self, prompt_id: str) -> List[GeneratedAsset]:
        """
        Get output files from completed execution.
        
        Args:
            prompt_id: Prompt ID to get outputs for.
            
        Returns:
            List of generated assets.
        """
        try:
            async with self._session.get(f"{self.config.server_url}/history/{prompt_id}") as response:
                if response.status == 200:
                    history_data = await response.json()
                    
                    outputs = []
                    prompt_history = history_data.get(prompt_id, {})
                    
                    for node_id, node_output in prompt_history.get("outputs", {}).items():
                        if "images" in node_output:
                            for image_info in node_output["images"]:
                                asset = GeneratedAsset(
                                    filename=image_info["filename"],
                                    subfolder=image_info.get("subfolder", ""),
                                    folder_type=image_info.get("type", "output")
                                )
                                outputs.append(asset)
                    
                    return outputs
                else:
                    self.logger.error(f"Failed to get execution outputs: HTTP {response.status}")
                    return []
                    
        except Exception as e:
            self.logger.error(f"Error getting execution outputs: {e}")
            return []
    
    async def cancel_execution(self, prompt_id: str) -> bool:
        """
        Cancel a running execution.
        
        Args:
            prompt_id: Prompt ID to cancel.
            
        Returns:
            True if cancellation successful, False otherwise.
        """
        try:
            async with self._session.post(f"{self.config.server_url}/interrupt") as response:
                if response.status == 200:
                    # Update execution status
                    if prompt_id in self._active_executions:
                        execution = self._active_executions[prompt_id]
                        execution.status = ExecutionStatus.CANCELLED
                        execution.completed_at = datetime.utcnow()
                    
                    self.logger.info(f"Execution {prompt_id} cancelled")
                    return True
                else:
                    self.logger.error(f"Failed to cancel execution: HTTP {response.status}")
                    return False
                    
        except Exception as e:
            self.logger.error(f"Error cancelling execution: {e}")
            return False
    
    async def get_queue_status(self) -> Dict[str, Any]:
        """
        Get current queue status from ComfyUI.
        
        Returns:
            Dictionary with queue information.
        """
        try:
            async with self._session.get(f"{self.config.server_url}/queue") as response:
                if response.status == 200:
                    queue_data = await response.json()
                    return {
                        "queue_running": queue_data.get("queue_running", []),
                        "queue_pending": queue_data.get("queue_pending", [])
                    }
                else:
                    self.logger.error(f"Failed to get queue status: HTTP {response.status}")
                    return {"queue_running": [], "queue_pending": []}
                    
        except Exception as e:
            self.logger.error(f"Error getting queue status: {e}")
            return {"queue_running": [], "queue_pending": []}
    
    async def disconnect(self) -> None:
        """Disconnect from ComfyUI service."""
        self._connected = False
        
        if self._websocket:
            await self._websocket.close()
            self._websocket = None
        
        if self._session:
            await self._session.close()
            self._session = None
        
        self.logger.info("Disconnected from ComfyUI service")
    
    def get_performance_metrics(self) -> List[PerformanceMetrics]:
        """Get performance metrics for API operations."""
        return self.metrics.copy()
    
    def clear_metrics(self) -> None:
        """Clear stored performance metrics."""
        self.metrics.clear()
        self.logger.debug("API orchestrator metrics cleared")
    
    @property
    def is_connected(self) -> bool:
        """Check if orchestrator is connected to ComfyUI."""
        return self._connected
    
    @property
    def is_websocket_connected(self) -> bool:
        """Check if WebSocket connection is active."""
        return self._websocket is not None and not self._websocket.closed
    
    def __del__(self):
        """Cleanup on object destruction."""
        if self._connected:
            self.logger.warning("API Orchestrator being destroyed with active connection")
            # Note: Can't call async disconnect in __del__, should be called explicitly
    
    def _submit_mock_workflow(self, workflow: ComfyUIWorkflow) -> str:
        """
        Submit workflow in mock mode.
        
        Args:
            workflow: ComfyUI workflow to mock.
            
        Returns:
            Mock prompt ID for tracking.
        """
        prompt_id = f"mock-{uuid.uuid4()}"
        
        # Create mock execution result
        execution = ExecutionResult(
            prompt_id=prompt_id,
            workflow_id=workflow.metadata.workflow_id,
            status=ExecutionStatus.COMPLETED,
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            output_files=[
                GeneratedAsset(
                    filename=f"mock_output_{i}.png",
                    subfolder="",
                    folder_type="output"
                )
                for i in range(workflow.metadata.expected_outputs)
            ],
            mock_mode=True
        )
        
        self._active_executions[prompt_id] = execution
        
        self.logger.info(f"Mock workflow submitted: {prompt_id}")
        return prompt_id
    
    def _on_error_recovery(self, error_info, fallback_mode: FallbackMode) -> None:
        """
        Handle error recovery notifications from error handler.
        
        Args:
            error_info: Information about the error that triggered recovery.
            fallback_mode: The fallback mode that was applied.
        """
        self.logger.info(f"API Orchestrator error recovery: {fallback_mode.value} for error {error_info.error_id}")
        
        if fallback_mode == FallbackMode.MOCK:
            self._mock_mode_active = True
            self.logger.warning("API Orchestrator switched to mock mode")
        elif fallback_mode == FallbackMode.DEGRADED:
            self._http_fallback_active = True
            self._use_websocket = False
            self.logger.warning("API Orchestrator switched to HTTP-only mode")
        elif fallback_mode == FallbackMode.OFFLINE:
            self._connected = False
            self.logger.error("API Orchestrator switched to offline mode")
    
    def get_diagnostic_info(self) -> Dict[str, Any]:
        """
        Get comprehensive diagnostic information for troubleshooting.
        
        Returns:
            Dictionary with diagnostic information including error handler status.
        """
        return {
            "api_orchestrator_status": {
                "connected": self._connected,
                "websocket_connected": self.is_websocket_connected,
                "mock_mode_active": self._mock_mode_active,
                "http_fallback_active": self._http_fallback_active,
                "use_websocket": self._use_websocket,
                "reconnect_attempts": self._reconnect_attempts,
                "active_executions": len(self._active_executions)
            },
            "configuration": {
                "server_url": self.config.server_url,
                "websocket_url": self.config.websocket_url,
                "polling_interval": self._polling_interval,
                "max_reconnect_attempts": self._max_reconnect_attempts
            },
            "error_handler": self.error_handler.get_diagnostic_info(),
            "performance_metrics": len(self.metrics)
        }
    
    @property
    def is_mock_mode_active(self) -> bool:
        """Check if API orchestrator is in mock mode."""
        return self._mock_mode_active
    
    @property
    def is_http_fallback_active(self) -> bool:
        """Check if HTTP fallback mode is active."""
        return self._http_fallback_active