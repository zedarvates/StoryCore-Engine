"""
Unit tests for memory system CLI handlers.
"""

import unittest
import argparse
import json
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Mock the memory system modules before importing handlers
import sys
sys.modules['memory_system'] = MagicMock()
sys.modules['memory_system.data_models'] = MagicMock()

from src.cli.handlers.memory_validate import MemoryValidateHandler
from src.cli.handlers.memory_recover import MemoryRecoverHandler
from src.cli.handlers.memory_summary import MemorySummaryHandler
from src.cli.handlers.memory_export import MemoryExportHandler


class TestMemoryValidateHandler(unittest.TestCase):
    """Test MemoryValidateHandler."""

    def setUp(self):
        self.handler = MemoryValidateHandler()
        self.parser = argparse.ArgumentParser()
        self.handler.setup_parser(self.parser)

    def test_setup_parser(self):
        """Test that parser is configured correctly."""
        # Test default values
        args = self.parser.parse_args([])
        self.assertEqual(args.project, ".")
        self.assertEqual(args.scope, ["structure", "config", "memory"])
        self.assertEqual(args.format, "human")
        self.assertFalse(args.strict)
        self.assertFalse(args.fix)

    def test_execute_with_valid_project(self):
        """Test execute with valid project."""
        # Mock args
        args = argparse.Namespace(
            project=".",
            scope=["structure", "config", "memory"],
            format="human",
            strict=False,
            fix=False
        )

        # Mock memory system
        with patch('memory_system.MemorySystemCore') as MockCore:
            mock_system = Mock()
            mock_system.project_path = Path(".")
            mock_system.config_manager.load_config.return_value = Mock()
            mock_system.memory_manager.load_memory.return_value = Mock()
            MockCore.return_value = mock_system

            # Mock validation methods
            with patch.object(self.handler, '_validate_structure') as mock_structure:
                mock_structure.return_value = {"passed": True, "errors": []}

                with patch.object(self.handler, '_validate_config') as mock_config:
                    mock_config.return_value = {"passed": True, "errors": []}

                    with patch.object(self.handler, '_validate_memory') as mock_memory:
                        mock_memory.return_value = {"passed": True, "errors": []}

                        result = self.handler.execute(args)
                        self.assertEqual(result, 0)

    def test_execute_with_invalid_project(self):
        """Test execute with invalid project path."""
        args = argparse.Namespace(
            project="/nonexistent/path",
            scope=["structure"],
            format="human",
            strict=False,
            fix=False
        )

        result = self.handler.execute(args)
        self.assertEqual(result, 1)


class TestMemoryRecoverHandler(unittest.TestCase):
    """Test MemoryRecoverHandler."""

    def setUp(self):
        self.handler = MemoryRecoverHandler()
        self.parser = argparse.ArgumentParser()
        self.handler.setup_parser(self.parser)

    def test_setup_parser(self):
        """Test that parser is configured correctly."""
        args = self.parser.parse_args([])
        self.assertEqual(args.project, ".")
        self.assertEqual(args.mode, "automatic")
        self.assertEqual(args.format, "human")
        self.assertFalse(args.force)

    def test_execute_with_no_errors(self):
        """Test execute when no errors are detected."""
        args = argparse.Namespace(
            project=".",
            mode="automatic",
            format="human",
            force=False
        )

        # Mock memory system
        with patch('memory_system.MemorySystemCore') as MockCore:
            mock_system = Mock()
            mock_system.project_path = Path(".")
            mock_system.validate_project_state.return_value = Mock(valid=True)
            MockCore.return_value = mock_system

            result = self.handler.execute(args)
            self.assertEqual(result, 0)

    def test_execute_with_errors(self):
        """Test execute when errors are detected."""
        args = argparse.Namespace(
            project=".",
            mode="automatic",
            format="human",
            force=False
        )

        # Mock memory system
        with patch('memory_system.MemorySystemCore') as MockCore:
            mock_system = Mock()
            mock_system.project_path = Path(".")
            mock_system.validate_project_state.return_value = Mock(valid=False)
            
            # Mock recovery report
            mock_report = Mock()
            mock_report.success = True
            mock_report.restored_files = []
            mock_report.lost_files = []
            mock_report.confidence_scores = {}
            mock_report.warnings = []
            mock_report.recommendations = []
            mock_report.timestamp = "2023-01-01T00:00:00"
            
            mock_system.trigger_recovery.return_value = mock_report
            MockCore.return_value = mock_system

            result = self.handler.execute(args)
            self.assertEqual(result, 0)


class TestMemorySummaryHandler(unittest.TestCase):
    """Test MemorySummaryHandler."""

    def setUp(self):
        self.handler = MemorySummaryHandler()
        self.parser = argparse.ArgumentParser()
        self.handler.setup_parser(self.parser)

    def test_setup_parser(self):
        """Test that parser is configured correctly."""
        args = self.parser.parse_args([])
        self.assertEqual(args.project, ".")
        self.assertEqual(args.type, "overview")
        self.assertEqual(args.format, "human")
        self.assertEqual(args.limit, 10)

    def test_execute_overview_summary(self):
        """Test execute with overview summary."""
        args = argparse.Namespace(
            project=".",
            type="overview",
            format="human",
            limit=10
        )

        # Mock memory system
        with patch('memory_system.MemorySystemCore') as MockCore:
            mock_system = Mock()
            mock_system.project_path = Path(".")
            mock_system.get_project_context.return_value = Mock()
            mock_system.get_status.return_value = {}
            MockCore.return_value = mock_system

            result = self.handler.execute(args)
            self.assertEqual(result, 0)


class TestMemoryExportHandler(unittest.TestCase):
    """Test MemoryExportHandler."""

    def setUp(self):
        self.handler = MemoryExportHandler()
        self.parser = argparse.ArgumentParser()
        self.handler.setup_parser(self.parser)

    def test_setup_parser(self):
        """Test that parser is configured correctly."""
        args = self.parser.parse_args([])
        self.assertEqual(args.project, ".")
        self.assertIsNone(args.output)
        self.assertEqual(args.format, "directory")
        self.assertEqual(args.scope, ["all"])
        self.assertFalse(args.include_summaries)

    def test_execute_directory_export(self):
        """Test execute with directory export."""
        args = argparse.Namespace(
            project=".",
            output=None,
            format="directory",
            scope=["all"],
            include_summaries=False
        )

        # Mock memory system
        with patch('memory_system.MemorySystemCore') as MockCore:
            mock_system = Mock()
            mock_system.project_path = Path(".")
            MockCore.return_value = mock_system

            # Mock export methods
            with patch.object(self.handler, '_export_memory') as mock_memory:
                mock_memory.return_value = []

                with patch.object(self.handler, '_export_discussions') as mock_discussions:
                    mock_discussions.return_value = []

                    with patch.object(self.handler, '_export_assets') as mock_assets:
                        mock_assets.return_value = []

                        with patch.object(self.handler, '_export_config') as mock_config:
                            mock_config.return_value = []

                            result = self.handler.execute(args)
                            self.assertEqual(result, 0)


if __name__ == '__main__':
    unittest.main()