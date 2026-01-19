"""
Unit tests for ComfyUIHandler.
"""

import unittest
import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import argparse

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.comfyui import ComfyUIHandler
from cli.errors import UserError, SystemError


class TestComfyUIHandler(unittest.TestCase):
    """Test cases for ComfyUIHandler."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.handler = ComfyUIHandler()
    
    def test_command_name(self):
        """Test that command name is set correctly."""
        self.assertEqual(self.handler.command_name, "comfyui")
    
    def test_description(self):
        """Test that description is set."""
        self.assertIsInstance(self.handler.description, str)
        self.assertGreater(len(self.handler.description), 0)
    
    def test_setup_parser(self):
        """Test parser setup."""
        parser = argparse.ArgumentParser()
        self.handler.setup_parser(parser)
        
        # Parse test arguments
        args = parser.parse_args(["start"])
        self.assertEqual(args.comfyui_command, "start")
    
    def test_setup_parser_with_url(self):
        """Test parser setup with custom URL."""
        parser = argparse.ArgumentParser()
        self.handler.setup_parser(parser)
        
        args = parser.parse_args(["start", "--comfyui-url", "http://localhost:9000"])
        self.assertEqual(args.comfyui_url, "http://localhost:9000")
    
    def test_setup_parser_with_open(self):
        """Test parser setup with open flag."""
        parser = argparse.ArgumentParser()
        self.handler.setup_parser(parser)
        
        args = parser.parse_args(["start", "--open"])
        self.assertTrue(args.open)
    
    @pytest.mark.skip(reason='ComfyUI module has import issues - needs separate fix')
    @patch('comfyui_image_engine.ComfyUIImageEngine', create=True)
    def test_start_service_success(self, mock_engine_class):
        """Test successful service start."""
        # Setup mocks
        mock_engine = MagicMock()
        mock_engine.start_comfyui_service.return_value = True
        mock_engine.get_service_status.return_value = {
            'service_state': 'running',
            'server_url': 'http://127.0.0.1:8188',
            'port': 8188
        }
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = argparse.Namespace(
            comfyui_command="start",
            comfyui_url="http://127.0.0.1:8188",
            open=False
        )
        
        # Execute
        result = self.handler.execute(args)
        
        # Verify
        self.assertEqual(result, 0)
        mock_engine.start_comfyui_service.assert_called_once()
    
    @pytest.mark.skip(reason='ComfyUI module has import issues - needs separate fix')
    @patch('comfyui_image_engine.ComfyUIImageEngine', create=True)
    def test_stop_service_success(self, mock_engine_class):
        """Test successful service stop."""
        # Setup mocks
        mock_engine = MagicMock()
        mock_engine.stop_comfyui_service.return_value = True
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = argparse.Namespace(
            comfyui_command="stop",
            comfyui_url="http://127.0.0.1:8188",
            open=False
        )
        
        # Execute
        result = self.handler.execute(args)
        
        # Verify
        self.assertEqual(result, 0)
        mock_engine.stop_comfyui_service.assert_called_once()
    
    @pytest.mark.skip(reason='ComfyUI module has import issues - needs separate fix')
    @patch('comfyui_image_engine.ComfyUIImageEngine', create=True)
    def test_status_command(self, mock_engine_class):
        """Test status command."""
        # Setup mocks
        mock_engine = MagicMock()
        mock_engine.get_service_status.return_value = {
            'service_running': True,
            'service_state': 'running',
            'server_url': 'http://127.0.0.1:8188',
            'port': 8188,
            'mock_mode': False,
            'service_available': True
        }
        mock_engine_class.return_value = mock_engine
        
        # Create args
        args = argparse.Namespace(
            comfyui_command="status",
            comfyui_url="http://127.0.0.1:8188",
            open=False
        )
        
        # Execute
        result = self.handler.execute(args)
        
        # Verify
        self.assertEqual(result, 0)
        mock_engine.get_service_status.assert_called_once()
    
    @patch('cli.handlers.comfyui.time')
    @pytest.mark.skip(reason='ComfyUI module has import issues - needs separate fix')
    @patch('comfyui_image_engine.ComfyUIImageEngine', create=True)
    def test_restart_service_success(self, mock_engine_class, mock_time):
        """Test successful service restart."""
        # Setup mocks
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
        args = argparse.Namespace(
            comfyui_command="restart",
            comfyui_url="http://127.0.0.1:8188",
            open=False
        )
        
        # Execute
        result = self.handler.execute(args)
        
        # Verify
        self.assertEqual(result, 0)
        mock_engine.stop_comfyui_service.assert_called_once()
        mock_engine.start_comfyui_service.assert_called_once()
        mock_time.sleep.assert_called_once_with(2)
    
    def test_execute_no_command(self):
        """Test execution without command."""
        # Create args
        args = argparse.Namespace(
            comfyui_command=None,
            comfyui_url="http://127.0.0.1:8188",
            open=False
        )
        
        # Execute
        result = self.handler.execute(args)
        
        # Verify error handling
        self.assertNotEqual(result, 0)
    
    @patch('cli.handlers.comfyui.webbrowser')
    def test_open_in_browser(self, mock_webbrowser):
        """Test opening ComfyUI in browser."""
        url = "http://127.0.0.1:8188"
        
        # Execute
        self.handler._open_in_browser(url)
        
        # Verify
        mock_webbrowser.open.assert_called_once_with(url)


if __name__ == '__main__':
    unittest.main()
