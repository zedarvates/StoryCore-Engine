"""
Unit tests for WorkflowExecutor class.

Tests workflow loading, parameter injection, execution, polling, and output download.
"""

import asyncio
import json
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch, mock_open

from src.comfyui_test_framework import (
    WorkflowExecutor,
    ExecutionError,
    ComfyUIConnectionManager,
    ConnectionError,
)


@pytest.fixture
def mock_connection_manager():
    """Create a mock connection manager."""
    manager = MagicMock(spec=ComfyUIConnectionManager)
    manager.base_url = "http://localhost:8188"
    manager.session = MagicMock()
    return manager


@pytest.fixture
def temp_workflows_dir(tmp_path):
    """Create a temporary workflows directory."""
    workflows_dir = tmp_path / "workflows"
    workflows_dir.mkdir()
    return workflows_dir


@pytest.fixture
def sample_workflow():
    """Create a sample workflow dictionary."""
    return {
        "58": {
            "inputs": {
                "value": "default prompt"
            },
            "class_type": "PrimitiveStringMultiline"
        },
        "57": {
            "inputs": {
                "seed": 12345,
                "steps": 20,
                "width": 512,
                "height": 512
            },
            "class_type": "KSampler"
        }
    }


@pytest.fixture
def sample_ltx2_workflow():
    """Create a sample LTX2 workflow dictionary."""
    return {
        "98": {
            "inputs": {
                "image": "default.png"
            },
            "class_type": "LoadImage"
        },
        "92": {
            "inputs": {
                "text": "default video prompt",
                "value": 30,
                "noise_seed": 54321
            },
            "class_type": "CLIPTextEncode"
        }
    }


class TestWorkflowExecutorInit:
    """Test WorkflowExecutor initialization."""
    
    def test_init_with_valid_directory(self, mock_connection_manager, temp_workflows_dir):
        """Test initialization with valid workflows directory."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        assert executor.connection == mock_connection_manager
        assert executor.workflows_dir == temp_workflows_dir
    
    def test_init_with_nonexistent_directory(self, mock_connection_manager, tmp_path):
        """Test initialization with non-existent directory logs warning."""
        nonexistent_dir = tmp_path / "nonexistent"
        
        executor = WorkflowExecutor(mock_connection_manager, nonexistent_dir)
        
        assert executor.workflows_dir == nonexistent_dir


class TestLoadWorkflow:
    """Test workflow loading functionality."""
    
    def test_load_workflow_success(self, mock_connection_manager, temp_workflows_dir, sample_workflow):
        """Test successful workflow loading."""
        # Create a workflow file
        workflow_file = temp_workflows_dir / "test_workflow.json"
        with open(workflow_file, 'w') as f:
            json.dump(sample_workflow, f)
        
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        loaded_workflow = executor.load_workflow("test_workflow.json")
        
        assert loaded_workflow == sample_workflow
    
    def test_load_workflow_not_found(self, mock_connection_manager, temp_workflows_dir):
        """Test loading non-existent workflow raises FileNotFoundError."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        with pytest.raises(FileNotFoundError) as exc_info:
            executor.load_workflow("nonexistent.json")
        
        assert "Workflow file not found" in str(exc_info.value)
    
    def test_load_workflow_invalid_json(self, mock_connection_manager, temp_workflows_dir):
        """Test loading invalid JSON raises JSONDecodeError."""
        # Create an invalid JSON file
        workflow_file = temp_workflows_dir / "invalid.json"
        with open(workflow_file, 'w') as f:
            f.write("{ invalid json }")
        
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        with pytest.raises(json.JSONDecodeError):
            executor.load_workflow("invalid.json")


class TestInjectParameters:
    """Test parameter injection functionality."""
    
    def test_inject_prompt_flux_turbo(self, mock_connection_manager, temp_workflows_dir, sample_workflow):
        """Test injecting prompt into Flux Turbo workflow."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        parameters = {"prompt": "A beautiful landscape"}
        modified = executor.inject_parameters(sample_workflow, parameters)
        
        assert modified["58"]["inputs"]["value"] == "A beautiful landscape"
        # Original should not be modified
        assert sample_workflow["58"]["inputs"]["value"] == "default prompt"
    
    def test_inject_seed(self, mock_connection_manager, temp_workflows_dir, sample_workflow):
        """Test injecting seed parameter."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        parameters = {"seed": 99999}
        modified = executor.inject_parameters(sample_workflow, parameters)
        
        assert modified["57"]["inputs"]["seed"] == 99999
    
    def test_inject_dimensions(self, mock_connection_manager, temp_workflows_dir, sample_workflow):
        """Test injecting width and height parameters."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        parameters = {"width": 1024, "height": 768}
        modified = executor.inject_parameters(sample_workflow, parameters)
        
        assert modified["57"]["inputs"]["width"] == 1024
        assert modified["57"]["inputs"]["height"] == 768
    
    def test_inject_steps(self, mock_connection_manager, temp_workflows_dir, sample_workflow):
        """Test injecting steps parameter."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        parameters = {"steps": 30}
        modified = executor.inject_parameters(sample_workflow, parameters)
        
        assert modified["57"]["inputs"]["steps"] == 30
    
    def test_inject_image_path_ltx2(self, mock_connection_manager, temp_workflows_dir, sample_ltx2_workflow):
        """Test injecting image path into LTX2 workflow."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        parameters = {"image_path": "/path/to/image.png"}
        modified = executor.inject_parameters(sample_ltx2_workflow, parameters)
        
        assert modified["98"]["inputs"]["image"] == "/path/to/image.png"
    
    def test_inject_video_prompt_ltx2(self, mock_connection_manager, temp_workflows_dir, sample_ltx2_workflow):
        """Test injecting video prompt into LTX2 workflow."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        parameters = {"video_prompt": "A cinematic scene"}
        modified = executor.inject_parameters(sample_ltx2_workflow, parameters)
        
        assert modified["92"]["inputs"]["text"] == "A cinematic scene"
    
    def test_inject_multiple_parameters(self, mock_connection_manager, temp_workflows_dir, sample_workflow):
        """Test injecting multiple parameters at once."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        parameters = {
            "prompt": "Test prompt",
            "seed": 11111,
            "width": 1920,
            "height": 1080,
            "steps": 25
        }
        modified = executor.inject_parameters(sample_workflow, parameters)
        
        assert modified["58"]["inputs"]["value"] == "Test prompt"
        assert modified["57"]["inputs"]["seed"] == 11111
        assert modified["57"]["inputs"]["width"] == 1920
        assert modified["57"]["inputs"]["height"] == 1080
        assert modified["57"]["inputs"]["steps"] == 25


class TestExecuteWorkflow:
    """Test workflow execution functionality."""
    
    @pytest.mark.asyncio
    async def test_execute_workflow_success(self, mock_connection_manager, temp_workflows_dir, sample_workflow):
        """Test successful workflow execution."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        # Mock the post method to return a prompt_id
        mock_connection_manager.post = AsyncMock(return_value={"prompt_id": "test-prompt-123"})
        
        prompt_id = await executor.execute_workflow(sample_workflow, "test_client")
        
        assert prompt_id == "test-prompt-123"
        mock_connection_manager.post.assert_called_once()
        
        # Verify the payload structure
        call_args = mock_connection_manager.post.call_args
        assert call_args[0][0] == "/prompt"
        assert call_args[0][1]["prompt"] == sample_workflow
        assert call_args[0][1]["client_id"] == "test_client"
    
    @pytest.mark.asyncio
    async def test_execute_workflow_no_prompt_id(self, mock_connection_manager, temp_workflows_dir, sample_workflow):
        """Test execution failure when no prompt_id in response."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        # Mock the post method to return response without prompt_id
        mock_connection_manager.post = AsyncMock(return_value={"error": "something went wrong"})
        
        with pytest.raises(ExecutionError) as exc_info:
            await executor.execute_workflow(sample_workflow)
        
        assert "No prompt_id in response" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_execute_workflow_connection_error(self, mock_connection_manager, temp_workflows_dir, sample_workflow):
        """Test execution failure due to connection error."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        # Mock the post method to raise ConnectionError
        mock_connection_manager.post = AsyncMock(side_effect=ConnectionError("Connection failed"))
        
        with pytest.raises(ExecutionError) as exc_info:
            await executor.execute_workflow(sample_workflow)
        
        assert "Failed to submit workflow" in str(exc_info.value)


class TestWaitForCompletion:
    """Test workflow completion polling functionality."""
    
    @pytest.mark.asyncio
    async def test_wait_for_completion_success(self, mock_connection_manager, temp_workflows_dir):
        """Test successful completion polling."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        # Mock the get method to return completed status
        mock_connection_manager.get = AsyncMock(return_value={
            "test-prompt-123": {
                "status": {"completed": True},
                "outputs": {"node_1": {"images": [{"filename": "output.png"}]}}
            }
        })
        
        result = await executor.wait_for_completion("test-prompt-123", timeout=10, poll_interval=1)
        
        assert result["status"]["completed"] is True
        assert "outputs" in result
    
    @pytest.mark.asyncio
    async def test_wait_for_completion_with_outputs(self, mock_connection_manager, temp_workflows_dir):
        """Test completion detection via outputs field."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        # Mock the get method to return outputs without explicit status
        mock_connection_manager.get = AsyncMock(return_value={
            "test-prompt-123": {
                "outputs": {"node_1": {"images": [{"filename": "output.png"}]}}
            }
        })
        
        result = await executor.wait_for_completion("test-prompt-123", timeout=10, poll_interval=1)
        
        assert "outputs" in result
        assert result["outputs"]["node_1"]["images"][0]["filename"] == "output.png"
    
    @pytest.mark.asyncio
    async def test_wait_for_completion_timeout(self, mock_connection_manager, temp_workflows_dir):
        """Test timeout during polling."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        # Mock the get method to always return in-progress status
        mock_connection_manager.get = AsyncMock(return_value={})
        
        with pytest.raises(TimeoutError) as exc_info:
            await executor.wait_for_completion("test-prompt-123", timeout=2, poll_interval=1)
        
        assert "timed out" in str(exc_info.value).lower()
        assert "test-prompt-123" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_wait_for_completion_error(self, mock_connection_manager, temp_workflows_dir):
        """Test execution error detection."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        # Mock the get method to return error status
        mock_connection_manager.get = AsyncMock(return_value={
            "test-prompt-123": {
                "status": {
                    "completed": False,
                    "error": "Model not found"
                }
            }
        })
        
        with pytest.raises(ExecutionError) as exc_info:
            await executor.wait_for_completion("test-prompt-123", timeout=10, poll_interval=1)
        
        assert "Model not found" in str(exc_info.value)


class TestDownloadOutput:
    """Test output download functionality."""
    
    @pytest.mark.asyncio
    async def test_download_output_image_success(self, mock_connection_manager, temp_workflows_dir, tmp_path):
        """Test successful image download."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        # Mock output info
        output_info = {
            "outputs": {
                "node_1": {
                    "images": [
                        {
                            "filename": "output.png",
                            "subfolder": "",
                            "type": "output"
                        }
                    ]
                }
            }
        }
        
        # Mock session response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.content.read = AsyncMock(side_effect=[b"image_data", b""])
        
        mock_connection_manager.session.get = MagicMock(return_value=mock_response)
        mock_connection_manager.session.get.return_value.__aenter__ = AsyncMock(return_value=mock_response)
        mock_connection_manager.session.get.return_value.__aexit__ = AsyncMock()
        
        save_path = tmp_path / "output.png"
        result_path = await executor.download_output(output_info, save_path)
        
        assert result_path == save_path
        assert save_path.exists()
        assert save_path.read_bytes() == b"image_data"
    
    @pytest.mark.asyncio
    async def test_download_output_video_success(self, mock_connection_manager, temp_workflows_dir, tmp_path):
        """Test successful video download."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        # Mock output info with video
        output_info = {
            "outputs": {
                "node_1": {
                    "videos": [
                        {
                            "filename": "output.mp4",
                            "subfolder": "videos",
                            "type": "output"
                        }
                    ]
                }
            }
        }
        
        # Mock session response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.content.read = AsyncMock(side_effect=[b"video_data", b""])
        
        mock_connection_manager.session.get = MagicMock(return_value=mock_response)
        mock_connection_manager.session.get.return_value.__aenter__ = AsyncMock(return_value=mock_response)
        mock_connection_manager.session.get.return_value.__aexit__ = AsyncMock()
        
        save_path = tmp_path / "output.mp4"
        result_path = await executor.download_output(output_info, save_path)
        
        assert result_path == save_path
        assert save_path.exists()
    
    @pytest.mark.asyncio
    async def test_download_output_no_outputs(self, mock_connection_manager, temp_workflows_dir, tmp_path):
        """Test download failure when no outputs in result."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        output_info = {}
        save_path = tmp_path / "output.png"
        
        with pytest.raises(ExecutionError) as exc_info:
            await executor.download_output(output_info, save_path)
        
        assert "No outputs found" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_download_output_no_files(self, mock_connection_manager, temp_workflows_dir, tmp_path):
        """Test download failure when no files in outputs."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        output_info = {
            "outputs": {
                "node_1": {}
            }
        }
        save_path = tmp_path / "output.png"
        
        with pytest.raises(ExecutionError) as exc_info:
            await executor.download_output(output_info, save_path)
        
        assert "No output files found" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_download_output_http_error(self, mock_connection_manager, temp_workflows_dir, tmp_path):
        """Test download failure due to HTTP error."""
        executor = WorkflowExecutor(mock_connection_manager, temp_workflows_dir)
        
        output_info = {
            "outputs": {
                "node_1": {
                    "images": [{"filename": "output.png", "type": "output"}]
                }
            }
        }
        
        # Mock session response with error
        mock_response = AsyncMock()
        mock_response.status = 404
        
        # Create a proper async context manager mock
        async def mock_get(*args, **kwargs):
            return mock_response
        
        mock_connection_manager.session.get = MagicMock(return_value=mock_response)
        mock_connection_manager.session.get.return_value.__aenter__ = AsyncMock(return_value=mock_response)
        mock_connection_manager.session.get.return_value.__aexit__ = AsyncMock(return_value=None)
        
        save_path = tmp_path / "output.png"
        
        with pytest.raises(ExecutionError) as exc_info:
            await executor.download_output(output_info, save_path)
        
        assert "Failed to download output" in str(exc_info.value)
