"""
Unit tests for ComfyUITestRunner

Tests the test orchestration functionality including image generation,
video generation, and pipeline tests.
"""

import asyncio
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from src.comfyui_test_framework import (
    ComfyUITestRunner,
    TestConfig,
    TestResult,
    ValidationResult,
)


@pytest.fixture
def test_config():
    """Create test configuration."""
    return TestConfig(
        comfyui_url="http://localhost:8188",
        workflows_dir=Path("assets/workflows"),
        output_dir=Path("temp_comfyui_export_test"),
        timeout=300,
        poll_interval=5,
        test_prompts=["Test prompt 1", "Test prompt 2"]
    )


@pytest.fixture
def mock_connection():
    """Create mock connection manager."""
    mock = AsyncMock()
    mock.connect = AsyncMock(return_value=True)
    mock.close = AsyncMock()
    return mock


@pytest.fixture
def mock_executor():
    """Create mock workflow executor."""
    mock = MagicMock()
    mock.load_workflow = MagicMock(return_value={"nodes": {}})
    mock.inject_parameters = MagicMock(return_value={"nodes": {}})
    mock.execute_workflow = AsyncMock(return_value="test_prompt_id_123")
    mock.wait_for_completion = AsyncMock(return_value={
        "outputs": {
            "node_1": {
                "images": [{"filename": "test.png", "type": "output"}]
            }
        }
    })
    mock.download_output = AsyncMock(return_value=Path("/tmp/test_output.png"))
    return mock


@pytest.fixture
def mock_validator():
    """Create mock quality validator."""
    mock = MagicMock()
    mock.validate_image = MagicMock(return_value=ValidationResult(
        passed=True,
        checks={"format_check": True, "size_check": True, "dimensions_check": True},
        errors=[],
        metadata={"file_size": 1024000, "dimensions": [1024, 768]}
    ))
    mock.validate_video = MagicMock(return_value=ValidationResult(
        passed=True,
        checks={"format_check": True, "size_check": True, "duration_check": True},
        errors=[],
        metadata={"file_size": 5120000, "duration": 5.0}
    ))
    return mock


@pytest.fixture
def mock_output_manager():
    """Create mock output manager."""
    mock = MagicMock()
    mock.create_timestamped_directory = MagicMock(return_value=Path("/tmp/20260128_120000"))
    mock.save_output = MagicMock(return_value=Path("/tmp/20260128_120000/image/test.png"))
    mock.log_output_path = MagicMock()
    mock.generate_report = MagicMock(return_value=Path("/tmp/20260128_120000/report.json"))
    return mock


class TestComfyUITestRunner:
    """Test suite for ComfyUITestRunner."""
    
    def test_init(self, test_config):
        """Test test runner initialization."""
        with patch('src.comfyui_test_framework.test_runner.ComfyUIConnectionManager'), \
             patch('src.comfyui_test_framework.test_runner.WorkflowExecutor'), \
             patch('src.comfyui_test_framework.test_runner.QualityValidator'), \
             patch('src.comfyui_test_framework.test_runner.OutputManager'):
            
            runner = ComfyUITestRunner(test_config)
            
            assert runner.config == test_config
            assert runner.connection is not None
            assert runner.executor is not None
            assert runner.validator is not None
            assert runner.output_manager is not None
    
    @pytest.mark.asyncio
    async def test_run_image_generation_test_success(
        self, test_config, mock_connection, mock_executor, 
        mock_validator, mock_output_manager
    ):
        """Test successful image generation test."""
        with patch('src.comfyui_test_framework.test_runner.ComfyUIConnectionManager', return_value=mock_connection), \
             patch('src.comfyui_test_framework.test_runner.WorkflowExecutor', return_value=mock_executor), \
             patch('src.comfyui_test_framework.test_runner.QualityValidator', return_value=mock_validator), \
             patch('src.comfyui_test_framework.test_runner.OutputManager', return_value=mock_output_manager):
            
            runner = ComfyUITestRunner(test_config)
            
            # Mock Path.exists() and Path.unlink()
            with patch('pathlib.Path.exists', return_value=True), \
                 patch('pathlib.Path.unlink'):
                
                result = await runner.run_image_generation_test(
                    prompt="A beautiful landscape",
                    test_name="test_image",
                    seed=12345
                )
            
            # Verify result
            assert isinstance(result, TestResult)
            assert result.test_name == "test_image"
            assert result.test_type == "image"
            assert result.success is True
            assert result.duration >= 0  # Duration can be 0 with mocked operations
            assert "image" in result.outputs
            assert "image" in result.validation_results
            assert result.metadata["prompt"] == "A beautiful landscape"
            assert result.metadata["seed"] == 12345
            
            # Verify methods were called
            mock_connection.connect.assert_called_once()
            mock_executor.load_workflow.assert_called_once_with("z_image_turbo_generation.json")
            mock_executor.inject_parameters.assert_called_once()
            mock_executor.execute_workflow.assert_called_once()
            mock_executor.wait_for_completion.assert_called_once()
            mock_executor.download_output.assert_called_once()
            mock_validator.validate_image.assert_called_once()
            mock_output_manager.save_output.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_run_image_generation_test_failure(
        self, test_config, mock_connection, mock_executor,
        mock_validator, mock_output_manager
    ):
        """Test image generation test with failure."""
        # Make executor raise an error
        mock_executor.execute_workflow = AsyncMock(
            side_effect=Exception("Workflow submission failed")
        )
        
        with patch('src.comfyui_test_framework.test_runner.ComfyUIConnectionManager', return_value=mock_connection), \
             patch('src.comfyui_test_framework.test_runner.WorkflowExecutor', return_value=mock_executor), \
             patch('src.comfyui_test_framework.test_runner.QualityValidator', return_value=mock_validator), \
             patch('src.comfyui_test_framework.test_runner.OutputManager', return_value=mock_output_manager):
            
            runner = ComfyUITestRunner(test_config)
            
            result = await runner.run_image_generation_test(
                prompt="Test prompt",
                test_name="test_image_fail"
            )
            
            # Verify result indicates failure
            assert result.success is False
            assert len(result.errors) > 0
            assert "Workflow submission failed" in result.errors[0]
    
    @pytest.mark.asyncio
    async def test_run_video_generation_test_success(
        self, test_config, mock_connection, mock_executor,
        mock_validator, mock_output_manager
    ):
        """Test successful video generation test."""
        # Update mock for video output
        mock_executor.download_output = AsyncMock(return_value=Path("/tmp/test_output.mp4"))
        mock_executor.wait_for_completion = AsyncMock(return_value={
            "outputs": {
                "node_1": {
                    "videos": [{"filename": "test.mp4", "type": "output"}]
                }
            }
        })
        
        with patch('src.comfyui_test_framework.test_runner.ComfyUIConnectionManager', return_value=mock_connection), \
             patch('src.comfyui_test_framework.test_runner.WorkflowExecutor', return_value=mock_executor), \
             patch('src.comfyui_test_framework.test_runner.QualityValidator', return_value=mock_validator), \
             patch('src.comfyui_test_framework.test_runner.OutputManager', return_value=mock_output_manager):
            
            runner = ComfyUITestRunner(test_config)
            
            # Mock Path.exists() and Path.unlink()
            with patch('pathlib.Path.exists', return_value=True), \
                 patch('pathlib.Path.unlink'):
                
                result = await runner.run_video_generation_test(
                    image_path=Path("/tmp/input.png"),
                    prompt="A video prompt",
                    test_name="test_video",
                    seed_stage1=111,
                    seed_stage2=222
                )
            
            # Verify result
            assert isinstance(result, TestResult)
            assert result.test_name == "test_video"
            assert result.test_type == "video"
            assert result.success is True
            assert result.duration >= 0  # Duration can be 0 with mocked operations
            assert "video" in result.outputs
            assert "video" in result.validation_results
            assert result.metadata["prompt"] == "A video prompt"
            assert result.metadata["seed_stage1"] == 111
            assert result.metadata["seed_stage2"] == 222
            
            # Verify methods were called
            mock_connection.connect.assert_called_once()
            mock_executor.load_workflow.assert_called_once_with("ltx2_image_to_video.json")
            mock_executor.inject_parameters.assert_called_once()
            mock_executor.execute_workflow.assert_called_once()
            mock_executor.wait_for_completion.assert_called_once()
            mock_executor.download_output.assert_called_once()
            mock_validator.validate_video.assert_called_once()
            mock_output_manager.save_output.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_run_pipeline_test_success(
        self, test_config, mock_connection, mock_executor,
        mock_validator, mock_output_manager
    ):
        """Test successful pipeline test."""
        with patch('src.comfyui_test_framework.test_runner.ComfyUIConnectionManager', return_value=mock_connection), \
             patch('src.comfyui_test_framework.test_runner.WorkflowExecutor', return_value=mock_executor), \
             patch('src.comfyui_test_framework.test_runner.QualityValidator', return_value=mock_validator), \
             patch('src.comfyui_test_framework.test_runner.OutputManager', return_value=mock_output_manager):
            
            runner = ComfyUITestRunner(test_config)
            
            # Mock Path.exists() and Path.unlink()
            with patch('pathlib.Path.exists', return_value=True), \
                 patch('pathlib.Path.unlink'):
                
                result = await runner.run_pipeline_test(
                    prompt="Pipeline test prompt",
                    test_name="test_pipeline",
                    image_seed=123,
                    video_seed_stage1=456,
                    video_seed_stage2=789
                )
            
            # Verify result
            assert isinstance(result, TestResult)
            assert result.test_name == "test_pipeline"
            assert result.test_type == "pipeline"
            assert result.success is True
            assert result.duration >= 0  # Duration can be 0 with mocked operations
            assert "image" in result.outputs
            assert "video" in result.outputs
            assert "image" in result.validation_results
            assert "video" in result.validation_results
            assert result.metadata["prompt"] == "Pipeline test prompt"
            assert result.metadata["image_seed"] == 123
            assert result.metadata["video_seed_stage1"] == 456
            assert result.metadata["video_seed_stage2"] == 789
    
    @pytest.mark.asyncio
    async def test_run_all_tests(
        self, test_config, mock_connection, mock_executor,
        mock_validator, mock_output_manager
    ):
        """Test running all tests."""
        with patch('src.comfyui_test_framework.test_runner.ComfyUIConnectionManager', return_value=mock_connection), \
             patch('src.comfyui_test_framework.test_runner.WorkflowExecutor', return_value=mock_executor), \
             patch('src.comfyui_test_framework.test_runner.QualityValidator', return_value=mock_validator), \
             patch('src.comfyui_test_framework.test_runner.OutputManager', return_value=mock_output_manager):
            
            runner = ComfyUITestRunner(test_config)
            
            # Mock Path.exists() and Path.unlink()
            with patch('pathlib.Path.exists', return_value=True), \
                 patch('pathlib.Path.unlink'):
                
                results = await runner.run_all_tests(test_prompts=["Prompt 1"])
            
            # Verify results
            assert isinstance(results, list)
            assert len(results) == 2  # One image test + one pipeline test
            
            # Verify output manager created timestamped directory
            mock_output_manager.create_timestamped_directory.assert_called_once()
    
    def test_generate_report(
        self, test_config, mock_connection, mock_executor,
        mock_validator, mock_output_manager
    ):
        """Test report generation."""
        with patch('src.comfyui_test_framework.test_runner.ComfyUIConnectionManager', return_value=mock_connection), \
             patch('src.comfyui_test_framework.test_runner.WorkflowExecutor', return_value=mock_executor), \
             patch('src.comfyui_test_framework.test_runner.QualityValidator', return_value=mock_validator), \
             patch('src.comfyui_test_framework.test_runner.OutputManager', return_value=mock_output_manager):
            
            runner = ComfyUITestRunner(test_config)
            
            # Create test results
            results = [
                TestResult(
                    test_name="test1",
                    test_type="image",
                    success=True,
                    duration=10.5,
                    outputs={"image": Path("/tmp/test1.png")},
                    validation_results={},
                    errors=[],
                    metadata={"prompt": "Test 1"}
                ),
                TestResult(
                    test_name="test2",
                    test_type="video",
                    success=False,
                    duration=5.2,
                    outputs={},
                    validation_results={},
                    errors=["Test error"],
                    metadata={"prompt": "Test 2"}
                )
            ]
            
            report_path = runner.generate_report(results)
            
            # Verify report was generated
            assert report_path == Path("/tmp/20260128_120000/report.json")
            mock_output_manager.generate_report.assert_called_once()
            mock_output_manager.log_output_path.assert_called()
    
    @pytest.mark.asyncio
    async def test_context_manager(
        self, test_config, mock_connection, mock_executor,
        mock_validator, mock_output_manager
    ):
        """Test async context manager."""
        with patch('src.comfyui_test_framework.test_runner.ComfyUIConnectionManager', return_value=mock_connection), \
             patch('src.comfyui_test_framework.test_runner.WorkflowExecutor', return_value=mock_executor), \
             patch('src.comfyui_test_framework.test_runner.QualityValidator', return_value=mock_validator), \
             patch('src.comfyui_test_framework.test_runner.OutputManager', return_value=mock_output_manager):
            
            async with ComfyUITestRunner(test_config) as runner:
                assert runner is not None
            
            # Verify close was called
            mock_connection.close.assert_called_once()
