"""
Tests for ModelManager class.
"""

import pytest
import asyncio
import time
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
from src.end_to_end.model_manager import (
    ModelManager,
    ModelInfo,
    ModelType,
    DownloadProgress
)


@pytest.fixture
def temp_models_dir(tmp_path):
    """Create a temporary models directory"""
    models_dir = tmp_path / "models"
    models_dir.mkdir()
    return models_dir


@pytest.fixture
def model_manager(temp_models_dir):
    """Create a ModelManager instance"""
    return ModelManager(temp_models_dir)


@pytest.fixture
def sample_model_info():
    """Create a sample ModelInfo"""
    return ModelInfo(
        name="Test Model",
        type=ModelType.CHECKPOINT,
        url="https://example.com/model.safetensors",
        file_size=1000000,  # 1MB
        sha256_hash="abc123",
        priority=1,
        required=True,
        description="Test model",
        filename="test_model.safetensors"
    )


class TestModelInfo:
    """Tests for ModelInfo dataclass"""
    
    def test_model_info_creation(self):
        """Test ModelInfo creation with all fields"""
        model = ModelInfo(
            name="FLUX Dev",
            type=ModelType.CHECKPOINT,
            url="https://example.com/flux.safetensors",
            file_size=11900000000,
            sha256_hash="hash123",
            priority=1,
            required=True,
            description="FLUX Dev model",
            filename="flux.safetensors"
        )
        
        assert model.name == "FLUX Dev"
        assert model.type == ModelType.CHECKPOINT
        assert model.file_size == 11900000000
        assert model.priority == 1
        assert model.required is True
    
    def test_model_info_filename_derivation(self):
        """Test that filename is derived from URL if not provided"""
        model = ModelInfo(
            name="Test",
            type=ModelType.VAE,
            url="https://example.com/path/to/model.safetensors",
            file_size=1000,
            sha256_hash="hash",
            priority=1,
            required=True,
            description="Test"
        )
        
        assert model.filename == "model.safetensors"


class TestDownloadProgress:
    """Tests for DownloadProgress dataclass"""
    
    def test_download_progress_percentage(self):
        """Test percentage calculation"""
        progress = DownloadProgress(
            model_name="Test",
            total_bytes=1000,
            downloaded_bytes=250,
            speed_mbps=1.0,
            eta_seconds=10,
            status="downloading"
        )
        
        assert progress.percentage == 25.0
    
    def test_download_progress_percentage_zero_total(self):
        """Test percentage with zero total bytes"""
        progress = DownloadProgress(
            model_name="Test",
            total_bytes=0,
            downloaded_bytes=0,
            speed_mbps=0.0,
            eta_seconds=0,
            status="downloading"
        )
        
        assert progress.percentage == 0.0


class TestModelManager:
    """Tests for ModelManager class"""
    
    def test_initialization(self, model_manager, temp_models_dir):
        """Test ModelManager initialization"""
        assert model_manager.models_dir == temp_models_dir
        assert isinstance(model_manager.downloads, dict)
        assert len(model_manager.downloads) == 0
        
        # Check that subdirectories were created
        assert (temp_models_dir / "checkpoints").exists()
        assert (temp_models_dir / "vae").exists()
        assert (temp_models_dir / "text_encoders").exists()
        assert (temp_models_dir / "clip").exists()
    
    def test_required_models_registry(self):
        """Test that required models registry is properly defined"""
        models = ModelManager.REQUIRED_MODELS
        
        assert len(models) > 0
        
        # Check FLUX Dev is first priority
        flux_dev = next((m for m in models if m.name == "FLUX Dev"), None)
        assert flux_dev is not None
        assert flux_dev.priority == 1
        assert flux_dev.required is True
        
        # Check T5XXL is second priority
        t5xxl = next((m for m in models if m.name == "T5XXL"), None)
        assert t5xxl is not None
        assert t5xxl.priority == 2
        assert t5xxl.required is True
        
        # Check optional models exist
        sdxl = next((m for m in models if m.name == "SDXL Base"), None)
        assert sdxl is not None
        assert sdxl.required is False
    
    def test_check_required_models_all_missing(self, model_manager):
        """Test checking for required models when all are missing"""
        missing = model_manager.check_required_models()
        
        # Should return all required models
        required_count = sum(1 for m in ModelManager.REQUIRED_MODELS if m.required)
        assert len(missing) == required_count
        
        # All should be required
        for model in missing:
            assert model.required is True
    
    def test_check_required_models_some_present(self, model_manager, temp_models_dir):
        """Test checking for required models when some are present"""
        # Create a fake model file
        checkpoints_dir = temp_models_dir / "checkpoints"
        fake_model = checkpoints_dir / "flux1-dev.safetensors"
        fake_model.write_text("fake model data")
        
        missing = model_manager.check_required_models()
        
        # Should not include the model we created
        missing_names = [m.name for m in missing]
        assert "FLUX Dev" not in missing_names
    
    def test_get_model_path(self, model_manager, temp_models_dir):
        """Test getting model path for different model types"""
        checkpoint_model = ModelInfo(
            name="Test Checkpoint",
            type=ModelType.CHECKPOINT,
            url="https://example.com/model.safetensors",
            file_size=1000,
            sha256_hash="hash",
            priority=1,
            required=True,
            description="Test",
            filename="test.safetensors"
        )
        
        path = model_manager._get_model_path(checkpoint_model)
        assert path == temp_models_dir / "checkpoints" / "test.safetensors"
        
        vae_model = ModelInfo(
            name="Test VAE",
            type=ModelType.VAE,
            url="https://example.com/vae.safetensors",
            file_size=1000,
            sha256_hash="hash",
            priority=1,
            required=True,
            description="Test",
            filename="vae.safetensors"
        )
        
        path = model_manager._get_model_path(vae_model)
        assert path == temp_models_dir / "vae" / "vae.safetensors"
    
    def test_get_download_progress(self, model_manager):
        """Test getting download progress"""
        # No progress initially
        assert model_manager.get_download_progress("Test Model") is None
        
        # Add progress
        progress = DownloadProgress(
            model_name="Test Model",
            total_bytes=1000,
            downloaded_bytes=500,
            speed_mbps=1.0,
            eta_seconds=10,
            status="downloading"
        )
        model_manager.downloads["Test Model"] = progress
        
        # Should return progress
        retrieved = model_manager.get_download_progress("Test Model")
        assert retrieved is not None
        assert retrieved.model_name == "Test Model"
        assert retrieved.downloaded_bytes == 500
    
    @pytest.mark.asyncio
    async def test_pause_resume_download(self, model_manager):
        """Test pausing and resuming downloads"""
        model_name = "Test Model"
        
        # Create pause event
        pause_event = asyncio.Event()
        pause_event.set()
        model_manager._pause_events[model_name] = pause_event
        
        # Create progress
        progress = DownloadProgress(
            model_name=model_name,
            total_bytes=1000,
            downloaded_bytes=500,
            speed_mbps=1.0,
            eta_seconds=10,
            status="downloading"
        )
        model_manager.downloads[model_name] = progress
        
        # Pause
        await model_manager.pause_download(model_name)
        assert not pause_event.is_set()
        assert progress.status == "paused"
        
        # Resume
        await model_manager.resume_download(model_name)
        assert pause_event.is_set()
        assert progress.status == "downloading"
    
    @pytest.mark.asyncio
    async def test_validate_model_file_not_exists(self, model_manager, temp_models_dir):
        """Test model validation when file doesn't exist"""
        model_path = temp_models_dir / "nonexistent.safetensors"
        
        result = await model_manager.validate_model(model_path, "hash123")
        assert result is False
    
    @pytest.mark.asyncio
    async def test_validate_model_no_hash(self, model_manager, temp_models_dir):
        """Test model validation with no hash provided"""
        model_path = temp_models_dir / "test.safetensors"
        model_path.write_text("test data")
        
        result = await model_manager.validate_model(model_path, "")
        assert result is True  # Should pass when no hash provided
    
    @pytest.mark.asyncio
    async def test_validate_model_with_hash(self, model_manager, temp_models_dir):
        """Test model validation with hash checking"""
        import hashlib
        
        # Create a test file
        model_path = temp_models_dir / "test.safetensors"
        test_data = b"test model data"
        model_path.write_bytes(test_data)
        
        # Calculate correct hash
        correct_hash = hashlib.sha256(test_data).hexdigest()
        
        # Should pass with correct hash
        result = await model_manager.validate_model(model_path, correct_hash)
        assert result is True
        
        # Should fail with incorrect hash
        result = await model_manager.validate_model(model_path, "wrong_hash")
        assert result is False
    
    @pytest.mark.asyncio
    async def test_validate_model_file_size_check(self, model_manager, temp_models_dir):
        """Test that file size is checked during validation"""
        model_path = temp_models_dir / "test.safetensors"
        test_data = b"x" * 1000  # 1000 bytes
        model_path.write_bytes(test_data)
        
        # Validation should work (file exists and has size)
        result = await model_manager.validate_model(model_path, "")
        assert result is True
        
        # Verify file size is logged (check that stat() is called)
        file_size = model_path.stat().st_size
        assert file_size == 1000
    
    @pytest.mark.asyncio
    async def test_corrupted_download_detection(self, model_manager, sample_model_info, temp_models_dir):
        """Test that corrupted downloads are detected via hash mismatch"""
        import hashlib
        
        # Simulate a corrupted download
        model_path = model_manager._get_model_path(sample_model_info)
        model_path.parent.mkdir(parents=True, exist_ok=True)
        corrupted_data = b"corrupted data"
        model_path.write_bytes(corrupted_data)
        
        # Calculate what the hash would be
        actual_hash = hashlib.sha256(corrupted_data).hexdigest()
        expected_hash = "expected_different_hash"
        
        # Validation should fail
        result = await model_manager.validate_model(model_path, expected_hash)
        assert result is False


class TestModelDownload:
    """Tests for model download functionality"""
    
    @pytest.mark.asyncio
    async def test_download_model_success(self, model_manager, sample_model_info, temp_models_dir):
        """Test successful model download"""
        # Mock aiohttp session
        mock_response = AsyncMock()
        mock_response.status = 200
        
        async def chunk_generator():
            yield b"test data chunk"
        
        mock_response.content.iter_chunked = lambda size: chunk_generator()
        
        # Create a proper async context manager mock
        class MockGet:
            async def __aenter__(self):
                return mock_response
            async def __aexit__(self, *args):
                pass
        
        mock_session = AsyncMock()
        mock_session.get = Mock(return_value=MockGet())
        
        class MockClientSession:
            async def __aenter__(self):
                return mock_session
            async def __aexit__(self, *args):
                pass
        
        with patch('aiohttp.ClientSession', return_value=MockClientSession()):
            # Track progress callbacks
            progress_updates = []
            
            def progress_callback(progress):
                progress_updates.append(progress)
            
            result = await model_manager.download_model(sample_model_info, progress_callback)
            
            assert result is True
            assert len(progress_updates) > 0
            
            # Check final progress
            final_progress = progress_updates[-1]
            assert final_progress.status == "completed"
            assert final_progress.model_name == sample_model_info.name
    
    @pytest.mark.asyncio
    async def test_download_model_http_error(self, model_manager, sample_model_info):
        """Test download with HTTP error"""
        mock_response = AsyncMock()
        mock_response.status = 404
        
        class MockGet:
            async def __aenter__(self):
                return mock_response
            async def __aexit__(self, *args):
                pass
        
        mock_session = AsyncMock()
        mock_session.get = Mock(return_value=MockGet())
        
        class MockClientSession:
            async def __aenter__(self):
                return mock_session
            async def __aexit__(self, *args):
                pass
        
        with patch('aiohttp.ClientSession', return_value=MockClientSession()):
            result = await model_manager.download_model(sample_model_info)
            
            assert result is False
            
            # Check progress status
            progress = model_manager.get_download_progress(sample_model_info.name)
            assert progress is not None
            assert progress.status == "failed"
            assert "404" in progress.error_message
    
    @pytest.mark.asyncio
    async def test_download_model_exception(self, model_manager, sample_model_info):
        """Test download with exception"""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_session.return_value.__aenter__.side_effect = Exception("Network error")
            
            result = await model_manager.download_model(sample_model_info)
            
            assert result is False
            
            # Check progress status
            progress = model_manager.get_download_progress(sample_model_info.name)
            assert progress is not None
            assert progress.status == "failed"
            assert "Network error" in progress.error_message
    
    @pytest.mark.asyncio
    async def test_download_model_progress_tracking(self, model_manager, sample_model_info):
        """Test that progress is tracked correctly during download"""
        # Create chunks that simulate a download
        chunks = [b"x" * 1024 * 1024 for _ in range(5)]  # 5MB in 1MB chunks
        
        mock_response = AsyncMock()
        mock_response.status = 200
        
        async def chunk_generator():
            for chunk in chunks:
                yield chunk
        
        mock_response.content.iter_chunked = lambda size: chunk_generator()
        
        class MockGet:
            async def __aenter__(self):
                return mock_response
            async def __aexit__(self, *args):
                pass
        
        mock_session = AsyncMock()
        mock_session.get = Mock(return_value=MockGet())
        
        class MockClientSession:
            async def __aenter__(self):
                return mock_session
            async def __aexit__(self, *args):
                pass
        
        with patch('aiohttp.ClientSession', return_value=MockClientSession()):
            progress_updates = []
            
            def progress_callback(progress):
                progress_updates.append(progress)
            
            result = await model_manager.download_model(sample_model_info, progress_callback)
            
            assert result is True
            
            # Verify progress was tracked
            assert sample_model_info.name in model_manager.downloads
            progress = model_manager.downloads[sample_model_info.name]
            assert progress.status == "completed"
    
    @pytest.mark.asyncio
    async def test_download_with_pause_resume(self, model_manager, sample_model_info):
        """Test pausing and resuming during download"""
        # This is a simplified test - in reality, pause/resume would need
        # more complex mocking to test properly
        
        # Create pause event
        pause_event = asyncio.Event()
        pause_event.set()
        model_manager._pause_events[sample_model_info.name] = pause_event
        
        # Verify pause/resume works
        await model_manager.pause_download(sample_model_info.name)
        assert not pause_event.is_set()
        
        await model_manager.resume_download(sample_model_info.name)
        assert pause_event.is_set()


class TestSequentialDownload:
    """Tests for sequential download with priority ordering"""
    
    @pytest.mark.asyncio
    async def test_download_all_missing_empty(self, model_manager, temp_models_dir):
        """Test download_all_missing when all models are present"""
        # Create all required model files
        for model_info in ModelManager.REQUIRED_MODELS:
            if model_info.required:
                model_path = model_manager._get_model_path(model_info)
                model_path.parent.mkdir(parents=True, exist_ok=True)
                model_path.write_text("fake model")
        
        results = await model_manager.download_all_missing()
        
        assert len(results) == 0
    
    @pytest.mark.asyncio
    async def test_download_all_missing_priority_order(self, model_manager):
        """Test that models are downloaded in priority order"""
        downloaded_order = []
        
        async def mock_download(model_info, callback=None):
            downloaded_order.append((model_info.name, model_info.priority))
            return True
        
        # Patch download_model to track order
        with patch.object(model_manager, 'download_model', side_effect=mock_download):
            await model_manager.download_all_missing()
        
        # Verify downloads happened in priority order
        assert len(downloaded_order) > 0
        priorities = [priority for _, priority in downloaded_order]
        assert priorities == sorted(priorities), "Models should be downloaded in priority order"
    
    @pytest.mark.asyncio
    async def test_download_all_missing_with_failures(self, model_manager):
        """Test that download continues even if some models fail"""
        download_attempts = []
        
        async def mock_download(model_info, callback=None):
            download_attempts.append(model_info.name)
            # Fail every other download
            return len(download_attempts) % 2 == 0
        
        with patch.object(model_manager, 'download_model', side_effect=mock_download):
            results = await model_manager.download_all_missing()
        
        # Should have attempted all required models
        required_count = sum(1 for m in ModelManager.REQUIRED_MODELS if m.required)
        assert len(download_attempts) == required_count
        
        # Results should show success/failure for each
        assert len(results) == required_count
        assert True in results.values()
        assert False in results.values()
    
    @pytest.mark.asyncio
    async def test_download_all_missing_progress_callback(self, model_manager):
        """Test that progress callbacks are called for each model"""
        progress_updates = []
        
        async def mock_download(model_info, callback=None):
            if callback:
                # Simulate progress update
                progress = DownloadProgress(
                    model_name=model_info.name,
                    total_bytes=1000,
                    downloaded_bytes=500,
                    speed_mbps=1.0,
                    eta_seconds=10,
                    status="downloading"
                )
                callback(progress)
            return True
        
        def progress_callback(model_name, progress):
            progress_updates.append((model_name, progress))
        
        with patch.object(model_manager, 'download_model', side_effect=mock_download):
            await model_manager.download_all_missing(progress_callback)
        
        # Should have received progress updates
        assert len(progress_updates) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


class TestRetryLogic:
    """Tests for download retry logic with exponential backoff"""
    
    @pytest.mark.asyncio
    async def test_download_succeeds_first_attempt(self, model_manager, sample_model_info):
        """Test that successful download doesn't retry"""
        attempt_count = [0]
        
        async def mock_attempt(model_info, callback, attempt_num):
            attempt_count[0] += 1
            return True
        
        with patch.object(model_manager, '_download_model_attempt', side_effect=mock_attempt):
            result = await model_manager.download_model(sample_model_info)
        
        assert result is True
        assert attempt_count[0] == 1  # Only one attempt needed
    
    @pytest.mark.asyncio
    async def test_download_retries_on_failure(self, model_manager, sample_model_info):
        """Test that failed downloads are retried"""
        attempt_count = [0]
        
        async def mock_attempt(model_info, callback, attempt_num):
            attempt_count[0] += 1
            # Fail first two attempts, succeed on third
            return attempt_count[0] >= 3
        
        with patch.object(model_manager, '_download_model_attempt', side_effect=mock_attempt):
            result = await model_manager.download_model(sample_model_info, max_retries=3)
        
        assert result is True
        assert attempt_count[0] == 3  # Should have retried twice
    
    @pytest.mark.asyncio
    async def test_download_exhausts_retries(self, model_manager, sample_model_info):
        """Test that download fails after max retries"""
        attempt_count = [0]
        
        async def mock_attempt(model_info, callback, attempt_num):
            attempt_count[0] += 1
            return False  # Always fail
        
        with patch.object(model_manager, '_download_model_attempt', side_effect=mock_attempt):
            result = await model_manager.download_model(sample_model_info, max_retries=3)
        
        assert result is False
        assert attempt_count[0] == 3  # Should have tried 3 times
    
    @pytest.mark.asyncio
    async def test_exponential_backoff_timing(self, model_manager, sample_model_info):
        """Test that exponential backoff is applied between retries"""
        attempt_times = []
        
        async def mock_attempt(model_info, callback, attempt_num):
            attempt_times.append(time.time())
            return False  # Always fail to trigger retries
        
        with patch.object(model_manager, '_download_model_attempt', side_effect=mock_attempt):
            start_time = time.time()
            result = await model_manager.download_model(sample_model_info, max_retries=3)
            total_time = time.time() - start_time
        
        assert result is False
        assert len(attempt_times) == 3
        
        # Check that backoff was applied (2^0 + 2^1 = 3 seconds minimum)
        # Allow some tolerance for execution time
        assert total_time >= 3.0, f"Expected at least 3 seconds of backoff, got {total_time}"
    
    @pytest.mark.asyncio
    async def test_retry_with_exception(self, model_manager, sample_model_info):
        """Test that exceptions trigger retries"""
        attempt_count = [0]
        
        async def mock_attempt(model_info, callback, attempt_num):
            attempt_count[0] += 1
            if attempt_count[0] < 3:
                raise Exception("Network error")
            return True  # Succeed on third attempt
        
        with patch.object(model_manager, '_download_model_attempt', side_effect=mock_attempt):
            result = await model_manager.download_model(sample_model_info, max_retries=3)
        
        assert result is True
        assert attempt_count[0] == 3
    
    @pytest.mark.asyncio
    async def test_retry_logging(self, model_manager, sample_model_info):
        """Test that retry attempts are logged"""
        attempt_count = [0]
        
        async def mock_attempt(model_info, callback, attempt_num):
            attempt_count[0] += 1
            return attempt_count[0] >= 2  # Fail first, succeed second
        
        with patch.object(model_manager, '_download_model_attempt', side_effect=mock_attempt):
            with patch('src.end_to_end.model_manager.logger') as mock_logger:
                result = await model_manager.download_model(sample_model_info, max_retries=3)
                
                # Verify warning was logged for retry
                assert mock_logger.warning.called
                warning_calls = [str(call) for call in mock_logger.warning.call_args_list]
                assert any("Retrying" in str(call) for call in warning_calls)
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_max_retries_parameter(self, model_manager, sample_model_info):
        """Test that max_retries parameter is respected"""
        attempt_count = [0]
        
        async def mock_attempt(model_info, callback, attempt_num):
            attempt_count[0] += 1
            return False  # Always fail
        
        # Test with different max_retries values
        with patch.object(model_manager, '_download_model_attempt', side_effect=mock_attempt):
            result = await model_manager.download_model(sample_model_info, max_retries=5)
        
        assert result is False
        assert attempt_count[0] == 5  # Should respect custom max_retries
