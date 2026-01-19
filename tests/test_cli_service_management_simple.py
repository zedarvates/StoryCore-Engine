"""
Simple unit tests for CLI service management commands.
Tests Task 13.2 - Unit tests for CLI service management.
"""

import pytest
import sys
import subprocess
from pathlib import Path
from unittest.mock import patch, MagicMock
from io import StringIO

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


class TestCLIServiceManagementSimple:
    """Simple unit tests for CLI service management commands."""
    
    def test_comfyui_command_help(self):
        """Test that ComfyUI command shows help correctly."""
        result = subprocess.run([
            sys.executable, "storycore.py", "comfyui", "--help"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should succeed
        assert result.returncode == 0
        
        # Should show subcommands
        help_text = result.stdout
        assert "start" in help_text
        assert "stop" in help_text
        assert "status" in help_text
        assert "restart" in help_text
    
    def test_comfyui_status_command_runs(self):
        """Test that ComfyUI status command runs without crashing."""
        result = subprocess.run([
            sys.executable, "storycore.py", "comfyui", "status"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should succeed (exit code 0)
        assert result.returncode == 0
        
        # Should contain expected status information
        assert "ComfyUI Service Status:" in result.stdout
        assert "Running:" in result.stdout
        assert "State:" in result.stdout
        assert "Server URL:" in result.stdout
        assert "Port:" in result.stdout
    
    def test_comfyui_status_with_custom_url(self):
        """Test ComfyUI status with custom URL parameter."""
        result = subprocess.run([
            sys.executable, "storycore.py", "comfyui", "status",
            "--comfyui-url", "http://localhost:8189"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should succeed
        assert result.returncode == 0
        
        # Should show custom URL in output
        assert "http://localhost:8189" in result.stdout
    
    def test_comfyui_invalid_command(self):
        """Test handling of invalid ComfyUI command."""
        result = subprocess.run([
            sys.executable, "storycore.py", "comfyui", "invalid"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should fail with non-zero exit code
        assert result.returncode != 0
    
    def test_main_help_includes_comfyui(self):
        """Test that main CLI help includes ComfyUI commands."""
        result = subprocess.run([
            sys.executable, "storycore.py", "--help"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should succeed
        assert result.returncode == 0
        
        # Should include ComfyUI in available commands
        assert "comfyui" in result.stdout
        assert "ComfyUI service management" in result.stdout
    
    def test_comfyui_start_command_structure(self):
        """Test that ComfyUI start command has correct structure."""
        result = subprocess.run([
            sys.executable, "storycore.py", "comfyui", "start", "--help"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should succeed
        assert result.returncode == 0
        
        # Should show start command help with URL parameter
        assert "--comfyui-url" in result.stdout
        assert "ComfyUI server URL" in result.stdout
    
    def test_comfyui_stop_command_structure(self):
        """Test that ComfyUI stop command has correct structure."""
        result = subprocess.run([
            sys.executable, "storycore.py", "comfyui", "stop", "--help"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should succeed
        assert result.returncode == 0
        
        # Should show stop command help with URL parameter
        assert "--comfyui-url" in result.stdout
        assert "ComfyUI server URL" in result.stdout
    
    def test_comfyui_restart_command_structure(self):
        """Test that ComfyUI restart command has correct structure."""
        result = subprocess.run([
            sys.executable, "storycore.py", "comfyui", "restart", "--help"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should succeed
        assert result.returncode == 0
        
        # Should show restart command help with URL parameter
        assert "--comfyui-url" in result.stdout
        assert "ComfyUI server URL" in result.stdout
    
    @patch('sys.stdout', new_callable=StringIO)
    def test_handle_comfyui_missing_command(self, mock_stdout):
        """Test handling when no ComfyUI command is provided."""
        from storycore_cli import handle_comfyui_service
        
        # Create args with None command
        args = MagicMock()
        args.comfyui_command = None
        
        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            handle_comfyui_service(args)
        
        assert exc_info.value.code == 1
        
        # Verify helpful error message
        output = mock_stdout.getvalue()
        assert "Error: ComfyUI service command required" in output
        assert "Available commands: start, stop, status, restart" in output


class TestCLIServiceManagementIntegration:
    """Integration tests for CLI service management."""
    
    def test_cli_commands_exist_in_help(self):
        """Test that all expected CLI commands exist in help."""
        result = subprocess.run([
            sys.executable, "storycore.py", "--help"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        assert result.returncode == 0
        help_text = result.stdout
        
        # Check that ComfyUI service management examples are present
        assert "storycore comfyui start" in help_text
        assert "storycore comfyui stop" in help_text
        assert "storycore comfyui status" in help_text
        assert "storycore comfyui restart" in help_text
    
    def test_comfyui_service_commands_functional(self):
        """Test that ComfyUI service commands are functional (don't crash)."""
        # Test status command (should always work)
        result = subprocess.run([
            sys.executable, "storycore.py", "comfyui", "status"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should not crash
        assert result.returncode == 0
        assert "ComfyUI Service Status:" in result.stdout
        
        # Test that it shows expected status fields
        status_fields = [
            "Running:",
            "State:",
            "Server URL:",
            "Port:",
            "Mock Mode:",
            "Service Available:"
        ]
        
        for field in status_fields:
            assert field in result.stdout, f"Missing status field: {field}"
    
    def test_error_handling_for_service_operations(self):
        """Test error handling for service operations."""
        # Since ComfyUI is likely not installed, start/stop/restart should handle errors gracefully
        
        # Test start command - should handle missing ComfyUI gracefully
        start_result = subprocess.run([
            sys.executable, "storycore.py", "comfyui", "start"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        # Should either succeed or fail gracefully (not crash)
        # Exit code can be 0 (success) or 1 (expected failure)
        assert start_result.returncode in [0, 1]
        
        # Should contain meaningful output
        assert len(start_result.stdout) > 0 or len(start_result.stderr) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])