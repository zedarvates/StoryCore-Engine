"""
Unit tests for CLI service management commands.
Tests Task 13.2 - Unit tests for CLI service management.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, call
from io import StringIO

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


class TestCLIServiceManagement:
    """Unit tests for CLI service management commands."""
    
    @patch('storycore_cli.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    def test_handle_comfyui_start_success(self, mock_stdout, mock_engine_class):
        """Test successful ComfyUI service start."""
        from storycore_cli import handle_comfyui_service
        
        # Mock successful start
        mock_engine = MagicMock()
        mock_engine.start_comfyui_service.return_value = True
        mock_engine.get_service_status.return_value = {
            'service_state': 'running',
            'server_url': 'http://127.0.0.1:8188',
            'port': 8188
        }
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = MagicMock()
        args.comfyui_command = "start"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Call handler
        handle_comfyui_service(args)
        
        # Verify engine methods called
        mock_engine.start_comfyui_service.assert_called_once()
        mock_engine.get_service_status.assert_called_once()
        
        # Verify output
        output = mock_stdout.getvalue()
        assert "Starting ComfyUI service" in output
        assert "[SUCCESS]" in output
        assert "Service State: running" in output
    
    @patch('storycore_cli.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    def test_handle_comfyui_start_failure(self, mock_stdout, mock_engine_class):
        """Test failed ComfyUI service start."""
        from storycore_cli import handle_comfyui_service
        
        # Mock failed start
        mock_engine = MagicMock()
        mock_engine.start_comfyui_service.return_value = False
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = MagicMock()
        args.comfyui_command = "start"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            handle_comfyui_service(args)
        
        assert exc_info.value.code == 1
        
        # Verify output
        output = mock_stdout.getvalue()
        assert "Starting ComfyUI service" in output
        assert "[ERROR] Failed to start" in output
    
    @patch('storycore_cli.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    def test_handle_comfyui_stop_success(self, mock_stdout, mock_engine_class):
        """Test successful ComfyUI service stop."""
        from storycore_cli import handle_comfyui_service
        
        # Mock successful stop
        mock_engine = MagicMock()
        mock_engine.stop_comfyui_service.return_value = True
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = MagicMock()
        args.comfyui_command = "stop"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Call handler
        handle_comfyui_service(args)
        
        # Verify engine method called
        mock_engine.stop_comfyui_service.assert_called_once()
        
        # Verify output
        output = mock_stdout.getvalue()
        assert "Stopping ComfyUI service" in output
        assert "[SUCCESS]" in output
    
    @patch('storycore_cli.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    def test_handle_comfyui_stop_failure(self, mock_stdout, mock_engine_class):
        """Test failed ComfyUI service stop."""
        from storycore_cli import handle_comfyui_service
        
        # Mock failed stop
        mock_engine = MagicMock()
        mock_engine.stop_comfyui_service.return_value = False
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = MagicMock()
        args.comfyui_command = "stop"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            handle_comfyui_service(args)
        
        assert exc_info.value.code == 1
        
        # Verify output
        output = mock_stdout.getvalue()
        assert "Stopping ComfyUI service" in output
        assert "[ERROR] Failed to stop" in output
    
    @patch('storycore_cli.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    def test_handle_comfyui_status(self, mock_stdout, mock_engine_class):
        """Test ComfyUI service status check."""
        from storycore_cli import handle_comfyui_service
        
        # Mock status response
        mock_engine = MagicMock()
        mock_engine.get_service_status.return_value = {
            'service_running': True,
            'service_state': 'running',
            'server_url': 'http://127.0.0.1:8188',
            'port': 8188,
            'mock_mode': False,
            'service_available': True,
            'last_health_check': '2026-01-10T12:00:00',
            'uptime_seconds': 120.5,
            'error_message': None
        }
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = MagicMock()
        args.comfyui_command = "status"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Call handler
        handle_comfyui_service(args)
        
        # Verify engine method called
        mock_engine.get_service_status.assert_called_once()
        
        # Verify output
        output = mock_stdout.getvalue()
        assert "Checking ComfyUI service status" in output
        assert "ComfyUI Service Status:" in output
        assert "Running: [YES]" in output
        assert "State: running" in output
        assert "Server URL: http://127.0.0.1:8188" in output
        assert "Port: 8188" in output
        assert "Mock Mode: [NO]" in output
        assert "Service Available: [YES]" in output
        assert "Last Health Check: 2026-01-10T12:00:00" in output
        assert "Uptime: 120.5 seconds" in output
    
    @patch('storycore_cli.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    def test_handle_comfyui_status_with_error(self, mock_stdout, mock_engine_class):
        """Test ComfyUI service status with error message."""
        from storycore_cli import handle_comfyui_service
        
        # Mock status response with error
        mock_engine = MagicMock()
        mock_engine.get_service_status.return_value = {
            'service_running': False,
            'service_state': 'error',
            'server_url': 'http://127.0.0.1:8188',
            'port': 8188,
            'mock_mode': True,
            'service_available': False,
            'error_message': 'Connection refused'
        }
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = MagicMock()
        args.comfyui_command = "status"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Call handler
        handle_comfyui_service(args)
        
        # Verify output includes error
        output = mock_stdout.getvalue()
        assert "Running: [NO]" in output
        assert "State: error" in output
        assert "Mock Mode: [YES]" in output
        assert "Service Available: [NO]" in output
        assert "Error: Connection refused" in output
    
    @patch('storycore_cli.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    @patch('time.sleep')  # Mock sleep to speed up test
    def test_handle_comfyui_restart_success(self, mock_sleep, mock_stdout, mock_engine_class):
        """Test successful ComfyUI service restart."""
        from storycore_cli import handle_comfyui_service
        
        # Mock successful restart
        mock_engine = MagicMock()
        mock_engine.stop_comfyui_service.return_value = True
        mock_engine.start_comfyui_service.return_value = True
        mock_engine.get_service_status.return_value = {
            'service_state': 'running',
            'server_url': 'http://127.0.0.1:8188',
            'port': 8188
        }
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = MagicMock()
        args.comfyui_command = "restart"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Call handler
        handle_comfyui_service(args)
        
        # Verify both stop and start called
        mock_engine.stop_comfyui_service.assert_called_once()
        mock_engine.start_comfyui_service.assert_called_once()
        mock_engine.get_service_status.assert_called_once()
        
        # Verify sleep was called (2 second delay)
        mock_sleep.assert_called_once_with(2)
        
        # Verify output
        output = mock_stdout.getvalue()
        assert "Restarting ComfyUI service" in output
        assert "Stopping service..." in output
        assert "Starting service..." in output
        assert "[SUCCESS]" in output
        assert "Service State: running" in output
    
    @patch('storycore_cli.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    def test_handle_comfyui_restart_stop_failure(self, mock_stdout, mock_engine_class):
        """Test ComfyUI service restart with stop failure."""
        from storycore_cli import handle_comfyui_service
        
        # Mock failed stop
        mock_engine = MagicMock()
        mock_engine.stop_comfyui_service.return_value = False
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = MagicMock()
        args.comfyui_command = "restart"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            handle_comfyui_service(args)
        
        assert exc_info.value.code == 1
        
        # Verify only stop was called
        mock_engine.stop_comfyui_service.assert_called_once()
        mock_engine.start_comfyui_service.assert_not_called()
        
        # Verify output
        output = mock_stdout.getvalue()
        assert "Restarting ComfyUI service" in output
        assert "Stopping service..." in output
        assert "[ERROR] Failed to restart ComfyUI service (stop failed)" in output
    
    @patch('storycore_cli.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    @patch('time.sleep')
    def test_handle_comfyui_restart_start_failure(self, mock_sleep, mock_stdout, mock_engine_class):
        """Test ComfyUI service restart with start failure."""
        from storycore_cli import handle_comfyui_service
        
        # Mock successful stop but failed start
        mock_engine = MagicMock()
        mock_engine.stop_comfyui_service.return_value = True
        mock_engine.start_comfyui_service.return_value = False
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = MagicMock()
        args.comfyui_command = "restart"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            handle_comfyui_service(args)
        
        assert exc_info.value.code == 1
        
        # Verify both methods called
        mock_engine.stop_comfyui_service.assert_called_once()
        mock_engine.start_comfyui_service.assert_called_once()
        
        # Verify output
        output = mock_stdout.getvalue()
        assert "Restarting ComfyUI service" in output
        assert "Stopping service..." in output
        assert "Starting service..." in output
        assert "[ERROR] Failed to restart ComfyUI service (start failed)" in output
    
    @patch('src.comfyui_image_engine.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    def test_handle_comfyui_invalid_command(self, mock_stdout, mock_engine_class):
        """Test handling of invalid ComfyUI command."""
        from storycore_cli import handle_comfyui_service
        
        # Create args with no command
        args = MagicMock()
        args.comfyui_command = None
        
        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            handle_comfyui_service(args)
        
        assert exc_info.value.code == 1
        
        # Verify output
        output = mock_stdout.getvalue()
        assert "Error: ComfyUI service command required" in output
        assert "Available commands: start, stop, status, restart" in output
    
    @patch('src.comfyui_image_engine.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    def test_handle_comfyui_exception_handling(self, mock_stdout, mock_engine_class):
        """Test exception handling in ComfyUI service management."""
        from storycore_cli import handle_comfyui_service
        
        # Mock engine that raises exception
        mock_engine_class.side_effect = Exception("Test exception")
        
        # Create args
        args = MagicMock()
        args.comfyui_command = "status"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            handle_comfyui_service(args)
        
        assert exc_info.value.code == 1
        
        # Verify error output
        output = mock_stdout.getvalue()
        assert "[ERROR] ComfyUI service management error: Test exception" in output
    
    @patch('src.comfyui_image_engine.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    def test_handle_comfyui_custom_url(self, mock_stdout, mock_engine_class):
        """Test ComfyUI service management with custom URL."""
        from storycore_cli import handle_comfyui_service
        
        # Mock engine
        mock_engine = MagicMock()
        mock_engine.get_service_status.return_value = {
            'service_running': False,
            'service_state': 'stopped',
            'server_url': 'http://localhost:8189',
            'port': 8189,
            'mock_mode': True,
            'service_available': False
        }
        mock_engine_class.return_value = mock_engine
        
        # Create args with custom URL
        args = MagicMock()
        args.comfyui_command = "status"
        args.comfyui_url = "http://localhost:8189"
        
        # Call handler
        handle_comfyui_service(args)
        
        # Verify engine was created with custom URL
        mock_engine_class.assert_called_once_with(comfyui_url="http://localhost:8189")
        
        # Verify output shows custom URL
        output = mock_stdout.getvalue()
        assert "http://localhost:8189" in output
        assert "Port: 8189" in output


class TestCLIServiceManagementErrorHandling:
    """Test error handling in CLI service management."""
    
    @patch('sys.stdout', new_callable=StringIO)
    def test_missing_comfyui_command(self, mock_stdout):
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
    
    @patch('src.comfyui_image_engine.ComfyUIImageEngine')
    @patch('sys.stdout', new_callable=StringIO)
    def test_engine_initialization_failure(self, mock_stdout, mock_engine_class):
        """Test handling when ComfyUI engine fails to initialize."""
        from storycore_cli import handle_comfyui_service
        
        # Mock engine initialization failure
        mock_engine_class.side_effect = ImportError("ComfyUI engine not available")
        
        # Create args
        args = MagicMock()
        args.comfyui_command = "status"
        args.comfyui_url = "http://127.0.0.1:8188"
        
        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            handle_comfyui_service(args)
        
        assert exc_info.value.code == 1
        
        # Verify error message
        output = mock_stdout.getvalue()
        assert "[ERROR] ComfyUI service management error: ComfyUI engine not available" in output


if __name__ == "__main__":
    pytest.main([__file__, "-v"])