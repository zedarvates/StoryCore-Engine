"""
Integration tests for ComfyUI API integration.

Tests workflow submission, progress polling, result download,
cancellation, and error handling with mock ComfyUI backend.

Validates: Requirements 5.1-5.7
"""

import pytest
import asyncio
import aiohttp
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime

from src.end_to_end.generation_engine import GenerationEngine, GenerationProgress
from src.end_to_end.connection_manager import ConnectionManager
from src.end_to_end.model_manager import ModelManager
from src.end_to_end.workflow_manager import WorkflowManager
from src.end_to_end.data_models import (
    ShotConfig,
    StyleConfig,
    WorldConfig,
    ComfyUIStatus,
    MasterCoherenceSheet
)
from src.end_to_end.workflow_configs import ZImageTurboConfig, LTX2ImageToVideoConfig


@pytest.fixture
def mock_connection_manager():
    """Create mock connection manager."""
    manager = Mock(spec=ConnectionManager)
    manager.get_status.return_value = ComfyUIStatus(
        available=True,
        url="http://localhost:8000",
        version="1.0.0",
        queue_size=0,
        cors_enabled=True,
        models_ready=True,
        workflows_ready=True
    )
    manager.get_fallback_mode.return_value = "placeholder"
    manager.config = Mock()
    manager.config.max_retries = 3
    return manager


@pytest.fixture
def mock_model_manager():
    """Create mock model manager."""
    manager = Mock(spec=ModelManager)
    manager.check_required_models.return_value = []  # No missing models
    return manager


@pytest.fixture
def mock_workflow_manager():
    """Create mock workflow manager."""
    manager = Mock(spec=WorkflowManager)
    manager.get_default_workflow.return_value = "z_image_turbo"
    manager.create_z_image_turbo_workflow.return_value = {
        "workflow_name": "z_image_turbo",
        "prompt": {"text": "test prompt"},
        "nodes": {}
    }
    manager.create_ltx2_image_to_video_workflow.return_value = {
        "workflow_name": "ltx2_image_to_video",
        "prompt": {"text": "test video prompt"},
        "nodes": {}
    }
    return manager


@pytest.fixture
def generation_engine(mock_connection_manager, mock_model_manager, mock_workflow_manager):
    """Create generation engine with mocked dependencies."""
    return GenerationEngine(
        connection_manager=mock_connection_manager,
        model_manager=mock_model_manager,
        workflow_manager=mock_workflow_manager
    )


@pytest.fixture
def sample_shot_config():
    """Create sample shot configuration."""
    return ShotConfig(
        shot_id="test_shot_001",
        prompt="A beautiful landscape with mountains",
        negative_prompt="low quality, blurry",
        width=512,
        height=512,
        steps=20,
        cfg_scale=7.0,
        seed=42,
        style_config=StyleConfig(
            style_type="cinematic",
            style_strength=0.8
        )
    )


class TestWorkflowSubmission:
    """Test workflow submission to ComfyUI."""
    
    @pytest.mark.asyncio
    async def test_submit_valid_workflow(self, generation_engine):
        """Test submitting a valid workflow returns prompt_id."""
        workflow = {"prompt": {"text": "test"}, "nodes": {}}
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            # Create mock response
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value={"prompt_id": "test_prompt_123"})
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock()
            
            # Create mock session
            mock_session = AsyncMock()
            mock_session.post = AsyncMock(return_value=mock_response)
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            prompt_id = await generation_engine._submit_workflow_to_comfyui(workflow)
            
            assert prompt_id == "test_prompt_123"
            assert mock_session.post.called
    
    @pytest.mark.asyncio
    async def test_submit_workflow_with_retry(self, generation_engine):
        """Test workflow submission retries on timeout."""
        workflow = {"prompt": {"text": "test"}, "nodes": {}}
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            
            # First attempt times out, second succeeds
            mock_response_fail = AsyncMock()
            mock_response_fail.status = 500
            mock_response_fail.text = AsyncMock(return_value="Server error")
            
            mock_response_success = AsyncMock()
            mock_response_success.status = 200
            mock_response_success.json = AsyncMock(return_value={"prompt_id": "retry_prompt_456"})
            
            mock_session.post = AsyncMock(side_effect=[
                mock_response_fail,
                mock_response_success
            ])
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            prompt_id = await generation_engine._submit_workflow_to_comfyui(workflow)
            
            assert prompt_id == "retry_prompt_456"
            assert mock_session.post.call_count == 2
    
    @pytest.mark.asyncio
    async def test_submit_workflow_invalid_response(self, generation_engine):
        """Test workflow submission handles invalid response."""
        workflow = {"prompt": {"text": "test"}, "nodes": {}}
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_response = AsyncMock()
            mock_response.status = 400
            mock_response.text = AsyncMock(return_value="Invalid workflow")
            
            mock_session.post = AsyncMock(return_value=mock_response)
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            with pytest.raises(RuntimeError, match="ComfyUI API error"):
                await generation_engine._submit_workflow_to_comfyui(workflow)


class TestProgressPolling:
    """Test generation progress polling."""
    
    @pytest.mark.asyncio
    async def test_poll_for_completed_generation(self, generation_engine):
        """Test polling returns result when generation completes."""
        prompt_id = "test_prompt_789"
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            
            # Mock history response
            mock_history_response = AsyncMock()
            mock_history_response.status = 200
            mock_history_response.json = AsyncMock(return_value={
                prompt_id: {
                    "status": {"completed": True},
                    "outputs": {
                        "9": {
                            "images": [{
                                "filename": "test_image.png",
                                "subfolder": ""
                            }]
                        }
                    }
                }
            })
            
            # Mock image download response
            mock_image_response = AsyncMock()
            mock_image_response.status = 200
            mock_image_response.read = AsyncMock(return_value=b"fake_image_data")
            
            mock_session.get = AsyncMock(side_effect=[
                mock_history_response,
                mock_image_response
            ])
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            image_data = await generation_engine._poll_for_generation_result(prompt_id)
            
            assert image_data == b"fake_image_data"
    
    @pytest.mark.asyncio
    async def test_poll_handles_queue_position(self, generation_engine):
        """Test polling tracks queue position."""
        prompt_id = "test_prompt_queue"
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            
            # First poll: in queue
            mock_history_response_1 = AsyncMock()
            mock_history_response_1.status = 404  # Not in history yet
            
            # Second poll: completed
            mock_history_response_2 = AsyncMock()
            mock_history_response_2.status = 200
            mock_history_response_2.json = AsyncMock(return_value={
                prompt_id: {
                    "status": {"completed": True},
                    "outputs": {
                        "9": {
                            "images": [{
                                "filename": "test_image.png",
                                "subfolder": ""
                            }]
                        }
                    }
                }
            })
            
            # Mock queue response
            mock_queue_response = AsyncMock()
            mock_queue_response.status = 200
            mock_queue_response.json = AsyncMock(return_value={
                "queue_running": [],
                "queue_pending": [[0, prompt_id]]
            })
            
            # Mock image download
            mock_image_response = AsyncMock()
            mock_image_response.status = 200
            mock_image_response.read = AsyncMock(return_value=b"fake_image_data")
            
            mock_session.get = AsyncMock(side_effect=[
                mock_history_response_1,
                mock_queue_response,
                mock_history_response_2,
                mock_image_response
            ])
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            image_data = await generation_engine._poll_for_generation_result(
                prompt_id,
                poll_interval=0.01,
                max_wait=5
            )
            
            assert image_data == b"fake_image_data"
    
    @pytest.mark.asyncio
    async def test_poll_timeout(self, generation_engine):
        """Test polling times out if generation takes too long."""
        prompt_id = "test_prompt_timeout"
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            
            # Always return not ready
            mock_response = AsyncMock()
            mock_response.status = 404
            
            mock_session.get = AsyncMock(return_value=mock_response)
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            with pytest.raises(RuntimeError, match="Generation timeout"):
                await generation_engine._poll_for_generation_result(
                    prompt_id,
                    poll_interval=0.01,
                    max_wait=0.1
                )


class TestResultDownload:
    """Test result download from ComfyUI."""
    
    @pytest.mark.asyncio
    async def test_download_image(self, generation_engine):
        """Test downloading generated image."""
        filename = "test_output.png"
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.read = AsyncMock(return_value=b"image_bytes_data")
            
            mock_session.get = AsyncMock(return_value=mock_response)
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            image_data = await generation_engine._download_image_from_comfyui(filename)
            
            assert image_data == b"image_bytes_data"
            assert mock_session.get.called
    
    @pytest.mark.asyncio
    async def test_download_video_streaming(self, generation_engine, tmp_path):
        """Test downloading large video with streaming."""
        filename = "test_video.mp4"
        output_path = tmp_path / "output.mp4"
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_response = AsyncMock()
            mock_response.status = 200
            
            # Mock chunked streaming
            async def mock_iter_chunked(size):
                yield b"chunk1"
                yield b"chunk2"
                yield b"chunk3"
            
            mock_response.content.iter_chunked = mock_iter_chunked
            
            mock_session.get = AsyncMock(return_value=mock_response)
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            result = await generation_engine._download_video_from_comfyui(
                filename,
                output_path=output_path
            )
            
            assert result is None  # Streamed to file
            assert output_path.exists()
            assert output_path.read_bytes() == b"chunk1chunk2chunk3"
    
    @pytest.mark.asyncio
    async def test_download_failure(self, generation_engine):
        """Test download handles HTTP errors."""
        filename = "missing_file.png"
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_response = AsyncMock()
            mock_response.status = 404
            mock_response.text = AsyncMock(return_value="File not found")
            
            mock_session.get = AsyncMock(return_value=mock_response)
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            with pytest.raises(RuntimeError, match="Failed to download"):
                await generation_engine._download_image_from_comfyui(filename)


class TestGenerationCancellation:
    """Test generation cancellation."""
    
    @pytest.mark.asyncio
    async def test_cancel_active_generation(self, generation_engine):
        """Test cancelling an active generation."""
        # Create a session
        session = generation_engine._create_session("test", 1)
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_response = AsyncMock()
            mock_response.status = 200
            
            mock_session.post = AsyncMock(return_value=mock_response)
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            # Track a prompt
            generation_engine._track_active_prompt("test_prompt", session.session_id, "test_workflow")
            
            # Cancel generation
            generation_engine.cancel_generation()
            
            assert generation_engine._cancel_requested
            assert session.cancelled
    
    @pytest.mark.asyncio
    async def test_cancel_comfyui_request(self, generation_engine):
        """Test cancelling ComfyUI request via API."""
        prompt_id = "test_prompt_cancel"
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_response = AsyncMock()
            mock_response.status = 200
            
            mock_session.post = AsyncMock(return_value=mock_response)
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            await generation_engine._cancel_comfyui_generation(prompt_id)
            
            # Should call both queue delete and interrupt
            assert mock_session.post.call_count == 2


class TestErrorHandling:
    """Test error handling and recovery."""
    
    @pytest.mark.asyncio
    async def test_connection_error_fallback(self, generation_engine, sample_shot_config, tmp_path):
        """Test fallback to mock mode on connection error."""
        output_path = tmp_path / "test_output.png"
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_session.post = AsyncMock(side_effect=aiohttp.ClientError("Connection failed"))
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            # Should fallback to placeholder
            result = await generation_engine._generate_with_comfyui(
                sample_shot_config,
                output_path
            )
            
            assert result.metadata.get("placeholder") is True
            assert output_path.exists()
    
    @pytest.mark.asyncio
    async def test_timeout_error_handling(self, generation_engine, sample_shot_config, tmp_path):
        """Test handling of timeout errors."""
        output_path = tmp_path / "test_output.png"
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_session.post = AsyncMock(side_effect=asyncio.TimeoutError())
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock()
            
            mock_session_class.return_value = mock_session
            
            # Should fallback to placeholder
            result = await generation_engine._generate_with_comfyui(
                sample_shot_config,
                output_path
            )
            
            assert result.metadata.get("placeholder") is True
    
    def test_should_fallback_to_mock(self, generation_engine, mock_connection_manager):
        """Test fallback decision logic."""
        # Backend available, fallback mode = placeholder
        assert generation_engine._should_fallback_to_mock() is True
        
        # Backend unavailable
        mock_connection_manager.get_status.return_value = ComfyUIStatus(
            available=False,
            url="http://localhost:8000"
        )
        assert generation_engine._should_fallback_to_mock() is True
        
        # Backend available, fallback mode = abort
        mock_connection_manager.get_status.return_value = ComfyUIStatus(
            available=True,
            url="http://localhost:8000"
        )
        mock_connection_manager.get_fallback_mode.return_value = "abort"
        assert generation_engine._should_fallback_to_mock() is False


class TestQueueManagement:
    """Test queue management functionality."""
    
    def test_track_active_prompts(self, generation_engine):
        """Test tracking active generation requests."""
        session = generation_engine._create_session("test", 1)
        
        generation_engine._track_active_prompt(
            "prompt_1",
            session.session_id,
            "z_image_turbo"
        )
        
        active = generation_engine.get_active_prompts()
        
        assert len(active) == 1
        assert active[0]["prompt_id"] == "prompt_1"
        assert active[0]["workflow_name"] == "z_image_turbo"
    
    def test_concurrent_generation_limit(self, generation_engine):
        """Test concurrent generation limits."""
        session = generation_engine._create_session("test", 5)
        
        # Add prompts up to limit
        limit = generation_engine.get_concurrent_generation_limit()
        for i in range(limit):
            generation_engine._track_active_prompt(
                f"prompt_{i}",
                session.session_id,
                "test_workflow"
            )
        
        # Should not be able to submit more
        assert not generation_engine.can_submit_generation()
        
        # Remove one
        generation_engine._untrack_active_prompt("prompt_0")
        
        # Should be able to submit again
        assert generation_engine.can_submit_generation()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
