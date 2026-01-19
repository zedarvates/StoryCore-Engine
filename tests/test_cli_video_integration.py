#!/usr/bin/env python3
"""
Integration Tests for CLI Video Generation Commands
Tests the complete CLI integration with video generation functionality.
"""

import pytest
import json
import tempfile
import shutil
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from video_engine import VideoEngine, VideoConfig
from video_config import VideoConfigManager
from video_performance_monitor import VideoPerformanceMonitor
from video_error_handling import VideoErrorHandler


class TestCLIVideoIntegration:
    """Test suite for CLI video generation integration."""
    
    @pytest.fixture
    def temp_project(self):
        """Create a temporary project directory with required files."""
        temp_dir = tempfile.mkdtemp()
        project_path = Path(temp_dir) / "test_project"
        project_path.mkdir(parents=True)
        
        # Create project.json
        project_data = {
            "schema_version": "1.0",
            "project_name": "test_project",
            "capabilities": {
                "video_generation": True,
                "image_generation": True
            },
            "generation_status": {
                "images": "done",
                "video": "pending"
            }
        }
        
        with open(project_path / "project.json", 'w') as f:
            json.dump(project_data, f, indent=2)
        
        # Create assets directory structure
        (project_path / "assets" / "images" / "generated").mkdir(parents=True)
        (project_path / "assets" / "video" / "sequences").mkdir(parents=True)
        
        yield project_path
        
        # Cleanup
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def video_config_file(self, temp_project):
        """Create a test video configuration file."""
        config_data = {
            "output": {
                "frame_rate": 24,
                "resolution": [1920, 1080],
                "format": "png"
            },
            "interpolation": {
                "algorithm": "optical_flow",
                "quality": "high",
                "depth_awareness": True,
                "character_preservation": True
            },
            "camera": {
                "enable_motion_blur": True,
                "motion_blur_strength": 0.5
            },
            "performance": {
                "parallel_processing": True,
                "processing_mode": "auto",
                "memory_limit_gb": 8
            }
        }
        
        config_path = temp_project / "video_config.json"
        with open(config_path, 'w') as f:
            json.dump(config_data, f, indent=2)
        
        return config_path
    
    def test_cli_generate_video_basic(self, temp_project):
        """Test basic video generation command."""
        # Import CLI handler
        from storycore_cli import handle_generate_video
        
        # Mock arguments
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = None
        args.config = None
        args.preset = None
        args.frame_rate = None
        args.resolution = None
        args.mock_mode = True
        
        # Mock sys.exit to prevent actual exit
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        # Verify no error exit was called
        mock_exit.assert_not_called()
        
        # Verify expected output messages
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        assert any("StoryCore-Engine Video Generation" in msg for msg in print_calls)
        assert any("Project loaded" in msg for msg in print_calls)
        assert any("Video generation completed" in msg for msg in print_calls)
    
    def test_cli_generate_video_with_config(self, temp_project, video_config_file):
        """Test video generation with custom configuration file."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = None
        args.config = str(video_config_file)
        args.preset = None
        args.frame_rate = None
        args.resolution = None
        args.mock_mode = True
        
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        mock_exit.assert_not_called()
        
        # Verify configuration was loaded
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        assert any("Configuration loaded from" in msg for msg in print_calls)
    
    def test_cli_generate_video_with_preset(self, temp_project):
        """Test video generation with configuration preset."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = None
        args.config = None
        args.preset = "fast"
        args.frame_rate = None
        args.resolution = None
        args.mock_mode = True
        
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        mock_exit.assert_not_called()
        
        # Verify preset was applied
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        assert any("Applied configuration preset: fast" in msg for msg in print_calls)
    
    def test_cli_generate_video_with_overrides(self, temp_project):
        """Test video generation with command-line parameter overrides."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = None
        args.config = None
        args.preset = None
        args.frame_rate = 30
        args.resolution = "1280x720"
        args.mock_mode = True
        
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        mock_exit.assert_not_called()
        
        # Verify overrides were applied
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        assert any("Frame rate override: 30 fps" in msg for msg in print_calls)
        assert any("Resolution override: 1280x720" in msg for msg in print_calls)
    
    def test_cli_generate_video_specific_shot(self, temp_project):
        """Test video generation for a specific shot."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = "shot_001"
        args.config = None
        args.preset = None
        args.frame_rate = None
        args.resolution = None
        args.mock_mode = True
        
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        mock_exit.assert_not_called()
        
        # Verify specific shot was targeted
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        assert any("Target shot: shot_001" in msg for msg in print_calls)
        assert any("Generating video for shot: shot_001" in msg for msg in print_calls)
    
    def test_cli_generate_video_invalid_project(self):
        """Test video generation with invalid project path."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = "/nonexistent/path"
        args.shot = None
        args.config = None
        args.preset = None
        args.frame_rate = None
        args.resolution = None
        args.mock_mode = True
        
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        # Verify error exit was called (may be called multiple times due to error handling)
        assert mock_exit.called
        assert mock_exit.call_args[0][0] == 1
        
        # Verify error message
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        assert any("Project directory not found" in msg for msg in print_calls)
    
    def test_cli_generate_video_invalid_config(self, temp_project):
        """Test video generation with invalid configuration file."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = None
        args.config = "/nonexistent/config.json"
        args.preset = None
        args.frame_rate = None
        args.resolution = None
        args.mock_mode = True
        
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        # Verify error exit was called
        mock_exit.assert_called_once_with(1)
        
        # Verify error message
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        assert any("Configuration file not found" in msg for msg in print_calls)
    
    def test_cli_generate_video_invalid_resolution(self, temp_project):
        """Test video generation with invalid resolution format."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = None
        args.config = None
        args.preset = None
        args.frame_rate = None
        args.resolution = "invalid_format"
        args.mock_mode = True
        
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        # Verify error exit was called
        mock_exit.assert_called_once_with(1)
        
        # Verify error message
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        assert any("Invalid resolution format" in msg for msg in print_calls)
    
    def test_cli_progress_reporting(self, temp_project):
        """Test that progress reporting works correctly."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = None
        args.config = None
        args.preset = None
        args.frame_rate = None
        args.resolution = None
        args.mock_mode = True
        
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        mock_exit.assert_not_called()
        
        # Verify progress and status messages
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        assert any("Starting video generation" in msg for msg in print_calls)
        assert any("Video generation completed" in msg for msg in print_calls)
        assert any("Timeline metadata" in msg for msg in print_calls)
    
    def test_cli_performance_reporting(self, temp_project):
        """Test that performance reporting is included in output."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = None
        args.config = None
        args.preset = None
        args.frame_rate = None
        args.resolution = None
        args.mock_mode = True
        
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        mock_exit.assert_not_called()
        
        # Verify performance metrics are reported
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        assert any("Total frames generated" in msg for msg in print_calls)
        assert any("Processing speed" in msg for msg in print_calls)
        assert any("Average quality score" in msg for msg in print_calls)
    
    def test_cli_error_handling_context(self, temp_project):
        """Test that error handling context works correctly."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = None
        args.config = None
        args.preset = None
        args.frame_rate = None
        args.resolution = None
        args.mock_mode = True
        
        # Mock VideoEngine to raise an exception
        with patch('video_engine.VideoEngine') as mock_engine_class:
            mock_engine = MagicMock()
            mock_engine.load_project.side_effect = Exception("Test error")
            mock_engine_class.return_value = mock_engine
            
            with patch('sys.exit') as mock_exit:
                with patch('builtins.print') as mock_print:
                    handle_generate_video(args)
            
            # Verify error was handled
            mock_exit.assert_called_with(1)
            
            # Verify error message
            print_calls = [call[0][0] for call in mock_print.call_args_list]
            assert any("Video generation error" in msg for msg in print_calls)
    
    def test_cli_timeline_metadata_generation(self, temp_project):
        """Test that timeline metadata is generated and saved."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = None
        args.config = None
        args.preset = None
        args.frame_rate = None
        args.resolution = None
        args.mock_mode = True
        
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        mock_exit.assert_not_called()
        
        # Verify timeline metadata file was created
        timeline_file = temp_project / "video_timeline_metadata.json"
        assert timeline_file.exists()
        
        # Verify timeline data structure
        with open(timeline_file, 'r') as f:
            timeline_data = json.load(f)
        
        assert 'total_duration' in timeline_data
        assert 'frame_rate' in timeline_data
        assert 'total_frames' in timeline_data
        assert 'shots' in timeline_data
        assert isinstance(timeline_data['shots'], list)
    
    def test_cli_mock_mode_functionality(self, temp_project):
        """Test that mock mode works correctly."""
        from storycore_cli import handle_generate_video
        
        args = MagicMock()
        args.project = str(temp_project)
        args.shot = None
        args.config = None
        args.preset = None
        args.frame_rate = None
        args.resolution = None
        args.mock_mode = True
        
        with patch('sys.exit') as mock_exit:
            with patch('builtins.print') as mock_print:
                handle_generate_video(args)
        
        mock_exit.assert_not_called()
        
        # Verify mock mode indicators
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        assert any("Mode: Mock (demonstration)" in msg for msg in print_calls)
        assert any("Video generation completed" in msg for msg in print_calls)


class TestCLIVideoIntegrationEnd2End:
    """End-to-end integration tests using subprocess calls."""
    
    @pytest.fixture
    def temp_project_e2e(self):
        """Create a temporary project for end-to-end testing."""
        temp_dir = tempfile.mkdtemp()
        project_path = Path(temp_dir) / "e2e_project"
        project_path.mkdir(parents=True)
        
        # Create minimal project structure
        project_data = {
            "schema_version": "1.0",
            "project_name": "e2e_project",
            "capabilities": {"video_generation": True}
        }
        
        with open(project_path / "project.json", 'w') as f:
            json.dump(project_data, f, indent=2)
        
        (project_path / "assets" / "images" / "generated").mkdir(parents=True)
        
        yield project_path
        
        shutil.rmtree(temp_dir)
    
    def test_cli_command_execution(self, temp_project_e2e):
        """Test actual CLI command execution via subprocess."""
        # Get the path to storycore.py
        storycore_path = Path(__file__).parent.parent / "storycore.py"
        
        if not storycore_path.exists():
            pytest.skip("storycore.py not found - skipping subprocess test")
        
        # Run the command
        cmd = [
            sys.executable, str(storycore_path),
            "generate-video",
            "--project", str(temp_project_e2e),
            "--mock-mode"
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # Verify command succeeded
            assert result.returncode == 0, f"Command failed: {result.stderr}"
            
            # Verify expected output
            assert "StoryCore-Engine Video Generation" in result.stdout
            assert "Video generation completed" in result.stdout
            
        except subprocess.TimeoutExpired:
            pytest.fail("CLI command timed out")
        except FileNotFoundError:
            pytest.skip("Python executable not found")
    
    def test_cli_help_output(self):
        """Test that CLI help includes video generation commands."""
        storycore_path = Path(__file__).parent.parent / "storycore.py"
        
        if not storycore_path.exists():
            pytest.skip("storycore.py not found - skipping help test")
        
        cmd = [sys.executable, str(storycore_path), "--help"]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            # Verify help includes video generation
            assert "generate-video" in result.stdout
            assert "Generate video sequences from keyframes" in result.stdout
            
        except subprocess.TimeoutExpired:
            pytest.fail("CLI help command timed out")
        except FileNotFoundError:
            pytest.skip("Python executable not found")


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])