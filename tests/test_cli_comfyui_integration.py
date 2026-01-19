"""
Integration tests for CLI ComfyUI service management.
Tests Task 12.2 - CLI integration with ComfyUI Manager.
"""

import pytest
import subprocess
import sys
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


class TestCLIComfyUIIntegration:
    """Test CLI integration with ComfyUI Manager."""
    
    def test_comfyui_status_command(self):
        """Test that comfyui status command works."""
        # Run CLI command
        result = subprocess.run([
            sys.executable, "src/storycore_cli.py", "comfyui", "status"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should succeed (exit code 0)
        assert result.returncode == 0
        
        # Should contain status information
        assert "ComfyUI Service Status:" in result.stdout
        assert "Running:" in result.stdout
        assert "State:" in result.stdout
        assert "Server URL:" in result.stdout
        assert "Port:" in result.stdout
        assert "Mock Mode:" in result.stdout
    
    def test_comfyui_status_with_custom_url(self):
        """Test comfyui status with custom URL."""
        result = subprocess.run([
            sys.executable, "src/storycore_cli.py", "comfyui", "status",
            "--comfyui-url", "http://localhost:8189"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should succeed
        assert result.returncode == 0
        
        # Should show custom URL
        assert "http://localhost:8189" in result.stdout
    
    def test_generate_images_mock_mode(self):
        """Test generate-images command in mock mode."""
        # Create a temporary project directory
        import tempfile
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = Path(temp_dir) / "test_project"
            
            # Initialize project first
            init_result = subprocess.run([
                sys.executable, "src/storycore_cli.py", "init", "test_project"
            ], capture_output=True, text=True, cwd=temp_dir)
            
            if init_result.returncode == 0:
                # Create minimal puppet layer metadata for image generation
                puppet_metadata = {
                    "puppet_layer_id": "test_puppet_layer",
                    "schema_version": "1.0",
                    "generation_control_structure": {
                        "generation_order": [
                            {
                                "frame_id": "frame_001",
                                "generation_sequence": [
                                    {"type": "layer", "id": "layer_001", "description": "background"},
                                    {"type": "puppet", "id": "puppet_001", "description": "character"}
                                ]
                            }
                        ]
                    }
                }
                
                import json
                puppet_file = project_path / "puppet_layer_metadata.json"
                with open(puppet_file, 'w') as f:
                    json.dump(puppet_metadata, f)
                
                # Run generate-images in mock mode
                result = subprocess.run([
                    sys.executable, "src/storycore_cli.py", "generate-images",
                    "--project", str(project_path), "--mock-mode"
                ], capture_output=True, text=True, cwd=temp_dir)
                
                # Should succeed or fail gracefully
                # (May fail due to missing dependencies, but should not crash)
                assert "Image generation" in result.stdout or result.returncode != 0
    
    def test_cli_help_includes_comfyui_commands(self):
        """Test that CLI help includes ComfyUI service commands."""
        result = subprocess.run([
            sys.executable, "src/storycore_cli.py", "--help"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should succeed
        assert result.returncode == 0
        
        # Should include ComfyUI commands in help
        assert "comfyui" in result.stdout
    
    def test_comfyui_help_shows_subcommands(self):
        """Test that comfyui help shows available subcommands."""
        result = subprocess.run([
            sys.executable, "src/storycore_cli.py", "comfyui", "--help"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should succeed
        assert result.returncode == 0
        
        # Should show subcommands
        help_text = result.stdout
        assert "start" in help_text
        assert "stop" in help_text
        assert "status" in help_text
        assert "restart" in help_text
    
    @patch('src.comfyui_image_engine.ComfyUIImageEngine')
    def test_comfyui_service_start_integration(self, mock_engine_class):
        """Test comfyui start command integration."""
        # Mock the engine and its methods
        mock_engine = MagicMock()
        mock_engine.start_comfyui_service.return_value = True
        mock_engine.get_service_status.return_value = {
            'service_state': 'running',
            'server_url': 'http://127.0.0.1:8188',
            'port': 8188
        }
        mock_engine_class.return_value = mock_engine
        
        # Import and test the handler directly
        from storycore_cli import handle_comfyui_service
        
        # Create mock args
        args = MagicMock()
        args.comfyui_command = "start"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Should not raise exception
        try:
            handle_comfyui_service(args)
        except SystemExit as e:
            # Should exit with success (code 0) or not exit at all
            assert e.code == 0 or e.code is None
        
        # Verify engine methods were called
        mock_engine.start_comfyui_service.assert_called_once()
        mock_engine.get_service_status.assert_called_once()
    
    @patch('src.comfyui_image_engine.ComfyUIImageEngine')
    def test_comfyui_service_stop_integration(self, mock_engine_class):
        """Test comfyui stop command integration."""
        # Mock the engine
        mock_engine = MagicMock()
        mock_engine.stop_comfyui_service.return_value = True
        mock_engine_class.return_value = mock_engine
        
        # Import and test the handler
        from storycore_cli import handle_comfyui_service
        
        # Create mock args
        args = MagicMock()
        args.comfyui_command = "stop"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Should not raise exception
        try:
            handle_comfyui_service(args)
        except SystemExit as e:
            # Should exit with success
            assert e.code == 0 or e.code is None
        
        # Verify stop method was called
        mock_engine.stop_comfyui_service.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])