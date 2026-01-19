"""
Tests for ComfyUI Workflow Executor

Tests the ComfyUI API integration including workflow submission,
execution monitoring, and output retrieval.
"""

import pytest
import asyncio
import json
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock, MagicMock

# Try to import the module
try:
    from src.comfyui_workflow_executor import (
        ComfyUIWorkflowExecutor,
        ComfyUIConfig,
        COMFYUI_AVAILABLE
    )
    TESTS_AVAILABLE = True
except ImportError:
    TESTS_AVAILABLE = False
    pytestmark = pytest.mark.skip(
        reason="aiohttp/websockets not available"
    )


@pytest.mark.skipif(not TESTS_AVAILABLE, reason="Dependencies not available")
class TestComfyUIConfig:
    """Test ComfyUI configuration"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = ComfyUIConfig()
        
        assert config.host == "localhost"
        assert config.port == 8188
        assert config.timeout == 300
        assert config.check_interval == 1.0
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = ComfyUIConfig(
            host="192.168.1.100",
            port=8080,
            timeout=600,
            check_interval=0.5
        )
        
        assert config.host == "192.168.1.100"
        assert config.port == 8080
        assert config.timeout == 600
        assert config.check_interval == 0.5


@pytest.mark.skipif(not TESTS_AVAILABLE, reason="Dependencies not available")
class TestComfyUIWorkflowExecutor:
    """Test ComfyUI workflow executor"""
    
    def test_initialization(self):
        """Test executor initialization"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        assert executor.config == config
        assert executor.base_url == "http://localhost:8188"
        assert executor.ws_url == "ws://localhost:8188/ws"
        assert executor.client_id is not None
    
    def test_initialization_custom_config(self):
        """Test executor with custom config"""
        config = ComfyUIConfig(host="192.168.1.100", port=8080)
        executor = ComfyUIWorkflowExecutor(config)
        
        assert executor.base_url == "http://192.168.1.100:8080"
        assert executor.ws_url == "ws://192.168.1.100:8080/ws"
    
    @pytest.mark.asyncio
    async def test_check_connection_success(self):
        """Test successful connection check"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        # Mock aiohttp session
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.__aenter__.return_value = mock_response
            mock_response.__aexit__.return_value = None
            
            mock_session.return_value.__aenter__.return_value.get.return_value = mock_response
            
            is_connected = await executor.check_connection()
            
            assert is_connected is True
    
    @pytest.mark.asyncio
    async def test_check_connection_failure(self):
        """Test failed connection check"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        # Mock aiohttp session to raise exception
        with patch('aiohttp.ClientSession') as mock_session:
            mock_session.return_value.__aenter__.side_effect = Exception("Connection failed")
            
            is_connected = await executor.check_connection()
            
            assert is_connected is False
    
    @pytest.mark.asyncio
    async def test_submit_workflow_success(self):
        """Test successful workflow submission"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        workflow = {"nodes": [], "links": []}
        expected_prompt_id = "test-prompt-123"
        
        # Mock aiohttp session
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value={"prompt_id": expected_prompt_id})
            mock_response.__aenter__.return_value = mock_response
            mock_response.__aexit__.return_value = None
            
            mock_session.return_value.__aenter__.return_value.post.return_value = mock_response
            
            prompt_id = await executor._submit_workflow(workflow)
            
            assert prompt_id == expected_prompt_id
    
    @pytest.mark.asyncio
    async def test_submit_workflow_failure(self):
        """Test failed workflow submission"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        workflow = {"nodes": [], "links": []}
        
        # Mock aiohttp session with error response
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 400
            mock_response.text = AsyncMock(return_value="Bad request")
            mock_response.__aenter__.return_value = mock_response
            mock_response.__aexit__.return_value = None
            
            mock_session.return_value.__aenter__.return_value.post.return_value = mock_response
            
            with pytest.raises(RuntimeError, match="Failed to submit workflow"):
                await executor._submit_workflow(workflow)
    
    @pytest.mark.asyncio
    async def test_get_history_success(self):
        """Test successful history retrieval"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        prompt_id = "test-prompt-123"
        expected_history = {
            "outputs": {},
            "status": {"completed": True}
        }
        
        # Mock aiohttp session
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value={prompt_id: expected_history})
            mock_response.__aenter__.return_value = mock_response
            mock_response.__aexit__.return_value = None
            
            mock_session.return_value.__aenter__.return_value.get.return_value = mock_response
            
            history = await executor._get_history(prompt_id)
            
            assert history == expected_history
    
    @pytest.mark.asyncio
    async def test_download_file_success(self):
        """Test successful file download"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        filename = "test.png"
        subfolder = ""
        file_type = "output"
        expected_data = b"fake image data"
        
        # Mock aiohttp session
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.read = AsyncMock(return_value=expected_data)
            mock_response.__aenter__.return_value = mock_response
            mock_response.__aexit__.return_value = None
            
            mock_session.return_value.__aenter__.return_value.get.return_value = mock_response
            
            data = await executor._download_file(filename, subfolder, file_type)
            
            assert data == expected_data
    
    @pytest.mark.asyncio
    async def test_retrieve_outputs_with_images(self):
        """Test output retrieval with images"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        prompt_id = "test-prompt-123"
        history = {
            "outputs": {
                "node_1": {
                    "images": [
                        {
                            "filename": "image1.png",
                            "subfolder": "",
                            "type": "output"
                        }
                    ]
                }
            }
        }
        
        expected_data = b"fake image data"
        
        # Mock download_file
        with patch.object(executor, '_download_file', return_value=expected_data):
            outputs = await executor._retrieve_outputs(prompt_id, history)
            
            assert "node_1" in outputs
            assert len(outputs["node_1"]) == 1
            assert outputs["node_1"][0] == expected_data
    
    @pytest.mark.asyncio
    async def test_retrieve_outputs_with_videos(self):
        """Test output retrieval with videos"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        prompt_id = "test-prompt-123"
        history = {
            "outputs": {
                "node_1": {
                    "videos": [
                        {
                            "filename": "video1.mp4",
                            "subfolder": "",
                            "type": "output"
                        }
                    ]
                }
            }
        }
        
        expected_data = b"fake video data"
        
        # Mock download_file
        with patch.object(executor, '_download_file', return_value=expected_data):
            outputs = await executor._retrieve_outputs(prompt_id, history)
            
            assert "node_1" in outputs
            assert len(outputs["node_1"]) == 1
            assert outputs["node_1"][0] == expected_data
    
    @pytest.mark.asyncio
    async def test_retrieve_outputs_empty(self):
        """Test output retrieval with no outputs"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        prompt_id = "test-prompt-123"
        history = {"outputs": {}}
        
        outputs = await executor._retrieve_outputs(prompt_id, history)
        
        assert outputs == {}
    
    @pytest.mark.asyncio
    async def test_upload_image_success(self):
        """Test successful image upload"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        # Create temporary test image
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(b"fake image data")
            temp_path = Path(f.name)
        
        try:
            expected_result = {"name": "test.png", "subfolder": ""}
            
            # Mock aiohttp session
            with patch('aiohttp.ClientSession') as mock_session:
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json = AsyncMock(return_value=expected_result)
                mock_response.__aenter__.return_value = mock_response
                mock_response.__aexit__.return_value = None
                
                mock_session.return_value.__aenter__.return_value.post.return_value = mock_response
                
                result = await executor.upload_image(temp_path)
                
                assert result == expected_result
        
        finally:
            # Clean up
            temp_path.unlink()
    
    @pytest.mark.asyncio
    async def test_upload_image_not_found(self):
        """Test image upload with non-existent file"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        non_existent_path = Path("non_existent_image.png")
        
        with pytest.raises(FileNotFoundError):
            await executor.upload_image(non_existent_path)


@pytest.mark.skipif(not TESTS_AVAILABLE, reason="Dependencies not available")
class TestComfyUIIntegration:
    """Integration tests (require running ComfyUI instance)"""
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_real_connection(self):
        """Test real connection to ComfyUI (requires running instance)"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        is_connected = await executor.check_connection()
        
        # This test will pass if ComfyUI is running, skip otherwise
        if not is_connected:
            pytest.skip("ComfyUI not running")
        
        assert is_connected is True


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
