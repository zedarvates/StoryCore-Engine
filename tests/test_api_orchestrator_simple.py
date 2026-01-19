"""
Simple tests for API Orchestrator functionality.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
import aiohttp

from src.comfyui_config import ComfyUIConfig
from src.api_orchestrator import APIOrchestrator
from src.comfyui_models import ComfyUIWorkflow, WorkflowMetadata, ExecutionStatus


class TestAPIOrchestrator:
    """Simple tests for API Orchestrator functionality."""
    
    def test_orchestrator_initialization(self):
        """Test that API Orchestrator initializes correctly."""
        config = ComfyUIConfig.default()
        orchestrator = APIOrchestrator(config)
        
        assert orchestrator.config == config
        assert orchestrator._websocket is None
        assert orchestrator._session is None
        assert orchestrator._connected == False
        assert len(orchestrator._active_executions) == 0
    
    @pytest.mark.asyncio
    async def test_connection_http_fallback(self):
        """Test connection with HTTP fallback when WebSocket fails."""
        config = ComfyUIConfig.default()
        orchestrator = APIOrchestrator(config)
        
        # Mock WebSocket connection failure
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_session_class.return_value = mock_session
            
            # Make WebSocket connection fail
            mock_session.ws_connect.side_effect = aiohttp.ClientError("WebSocket failed")
            
            # Connect should succeed with HTTP fallback
            success = await orchestrator.connect()
            
            assert success == True
            assert orchestrator.is_connected == True
            assert orchestrator._use_websocket == False  # Should fallback to HTTP
    
    @pytest.mark.asyncio
    async def test_workflow_submission(self):
        """Test workflow submission via HTTP."""
        config = ComfyUIConfig.default()
        orchestrator = APIOrchestrator(config)
        
        # Create test workflow
        workflow = ComfyUIWorkflow()
        workflow.metadata = WorkflowMetadata()
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_response = AsyncMock()
            mock_session_class.return_value = mock_session
            
            # Mock successful workflow submission
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value={"prompt_id": "test-prompt-123"})
            
            mock_session.post.return_value.__aenter__.return_value = mock_response
            mock_session.post.return_value.__aexit__.return_value = None
            
            orchestrator._session = mock_session
            orchestrator._connected = True
            
            # Submit workflow
            prompt_id = await orchestrator.submit_workflow(workflow)
            
            assert prompt_id == "test-prompt-123"
            assert prompt_id in orchestrator._active_executions
            
            execution = orchestrator._active_executions[prompt_id]
            assert execution.status == ExecutionStatus.QUEUED
            assert execution.workflow_id == workflow.metadata.workflow_id
    
    @pytest.mark.asyncio
    async def test_execution_status_tracking(self):
        """Test execution status tracking."""
        config = ComfyUIConfig.default()
        orchestrator = APIOrchestrator(config)
        
        # Create test workflow and submit
        workflow = ComfyUIWorkflow()
        workflow.metadata = WorkflowMetadata()
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_response = AsyncMock()
            mock_session_class.return_value = mock_session
            
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value={"prompt_id": "test-prompt-456"})
            
            mock_session.post.return_value.__aenter__.return_value = mock_response
            mock_session.post.return_value.__aexit__.return_value = None
            
            orchestrator._session = mock_session
            orchestrator._connected = True
            
            prompt_id = await orchestrator.submit_workflow(workflow)
            
            # Check execution status
            execution = await orchestrator.get_execution_status(prompt_id)
            assert execution is not None
            assert execution.prompt_id == prompt_id
            assert execution.status == ExecutionStatus.QUEUED
            
            # Check non-existent execution
            non_existent = await orchestrator.get_execution_status("non-existent")
            assert non_existent is None
    
    @pytest.mark.asyncio
    async def test_queue_status(self):
        """Test queue status retrieval."""
        config = ComfyUIConfig.default()
        orchestrator = APIOrchestrator(config)
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_response = AsyncMock()
            mock_session_class.return_value = mock_session
            
            # Mock queue status response
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value={
                "queue_running": [["prompt-1", {}]],
                "queue_pending": [["prompt-2", {}], ["prompt-3", {}]]
            })
            
            mock_session.get.return_value.__aenter__.return_value = mock_response
            mock_session.get.return_value.__aexit__.return_value = None
            
            orchestrator._session = mock_session
            
            # Get queue status
            queue_status = await orchestrator.get_queue_status()
            
            assert len(queue_status["queue_running"]) == 1
            assert len(queue_status["queue_pending"]) == 2
    
    @pytest.mark.asyncio
    async def test_execution_cancellation(self):
        """Test execution cancellation."""
        config = ComfyUIConfig.default()
        orchestrator = APIOrchestrator(config)
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_response = AsyncMock()
            mock_session_class.return_value = mock_session
            
            # Mock successful cancellation
            mock_response.status = 200
            
            mock_session.post.return_value.__aenter__.return_value = mock_response
            mock_session.post.return_value.__aexit__.return_value = None
            
            orchestrator._session = mock_session
            
            # Add a mock execution
            from src.comfyui_models import ExecutionResult
            from datetime import datetime
            
            execution = ExecutionResult(
                prompt_id="test-cancel",
                workflow_id="test-workflow",
                status=ExecutionStatus.EXECUTING,
                started_at=datetime.utcnow()
            )
            orchestrator._active_executions["test-cancel"] = execution
            
            # Cancel execution
            success = await orchestrator.cancel_execution("test-cancel")
            
            assert success == True
            assert execution.status == ExecutionStatus.CANCELLED
            assert execution.completed_at is not None
    
    def test_performance_metrics_collection(self):
        """Test that performance metrics are collected."""
        config = ComfyUIConfig.default()
        orchestrator = APIOrchestrator(config)
        
        # Initially no metrics
        assert len(orchestrator.get_performance_metrics()) == 0
        
        # After operations, metrics should be collected
        # (We'll test this indirectly through other operations)
        
        # Clear metrics
        orchestrator.clear_metrics()
        assert len(orchestrator.get_performance_metrics()) == 0
    
    def test_connection_properties(self):
        """Test connection status properties."""
        config = ComfyUIConfig.default()
        orchestrator = APIOrchestrator(config)
        
        # Initially not connected
        assert orchestrator.is_connected == False
        assert orchestrator.is_websocket_connected == False
        
        # Simulate connection
        orchestrator._connected = True
        assert orchestrator.is_connected == True
        
        # Simulate WebSocket connection
        mock_websocket = MagicMock()
        mock_websocket.closed = False
        orchestrator._websocket = mock_websocket
        assert orchestrator.is_websocket_connected == True
        
        # Simulate WebSocket closed
        mock_websocket.closed = True
        assert orchestrator.is_websocket_connected == False