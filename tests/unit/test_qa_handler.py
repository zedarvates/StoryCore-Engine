"""
Unit tests for QAHandler.
"""

import argparse
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.handlers.qa import QAHandler


class TestQAHandler:
    """Test suite for QAHandler."""
    
    def test_handler_attributes(self):
        """Test that handler has required attributes."""
        handler = QAHandler()
        assert handler.command_name == "qa"
        assert handler.description == "Run quality assurance scoring on project"
    
    def test_setup_parser(self):
        """Test parser setup with correct arguments."""
        handler = QAHandler()
        parser = argparse.ArgumentParser()
        handler.setup_parser(parser)
        
        # Parse with defaults
        args = parser.parse_args([])
        assert args.project == "."
        assert args.threshold == 3.0
        assert args.detailed is False
        
        # Parse with custom arguments
        args = parser.parse_args(["--project", "test-proj", "--threshold", "4.0", "--detailed"])
        assert args.project == "test-proj"
        assert args.threshold == 4.0
        assert args.detailed is True
    
    def test_execute_success_passed(self, tmp_path):
        """Test successful QA scoring that passes."""
        handler = QAHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            threshold=3.0,
            detailed=False
        )
        
        mock_report = {
            'overall_score': 4.5,
            'categories': {
                'sharpness': 4.5,
                'color_balance': 4.3,
                'composition': 4.7
            },
            'issues': []
        }
        
        with patch('qa_engine.QAEngine') as mock_engine_class:
            mock_engine = Mock()
            mock_engine.run_qa_scoring.return_value = mock_report
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            assert exit_code == 0
    
    def test_execute_success_failed(self, tmp_path):
        """Test successful QA scoring that fails threshold."""
        handler = QAHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            threshold=4.0,
            detailed=False
        )
        
        mock_report = {
            'overall_score': 2.5,
            'categories': {
                'sharpness': 2.0,
                'color_balance': 3.0,
                'composition': 2.5
            },
            'issues': [
                {
                    'description': 'Low sharpness detected',
                    'suggested_fix': 'Apply sharpening filter'
                }
            ]
        }
        
        with patch('qa_engine.QAEngine') as mock_engine_class:
            mock_engine = Mock()
            mock_engine.run_qa_scoring.return_value = mock_report
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            assert exit_code == 1  # Should fail
    
    def test_execute_project_not_found(self):
        """Test execution fails when project directory doesn't exist."""
        handler = QAHandler()
        args = argparse.Namespace(
            project="/nonexistent/path",
            threshold=3.0,
            detailed=False
        )
        
        with patch('qa_engine.QAEngine'):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_invalid_threshold_low(self, tmp_path):
        """Test execution fails with threshold below 0."""
        handler = QAHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            threshold=-1.0,  # Invalid
            detailed=False
        )
        
        with patch('qa_engine.QAEngine'):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_invalid_threshold_high(self, tmp_path):
        """Test execution fails with threshold above 5."""
        handler = QAHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            threshold=6.0,  # Invalid
            detailed=False
        )
        
        with patch('qa_engine.QAEngine'):
            exit_code = handler.execute(args)
            assert exit_code != 0
    
    def test_execute_detailed_mode(self, tmp_path):
        """Test QA scoring with detailed per-panel analysis."""
        handler = QAHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            threshold=3.0,
            detailed=True
        )
        
        mock_report = {
            'overall_score': 4.0,
            'categories': {
                'sharpness': 4.0
            },
            'issues': [],
            'panel_scores': {
                'panel_01': 4.5,
                'panel_02': 3.8,
                'panel_03': 3.9
            }
        }
        
        with patch('qa_engine.QAEngine') as mock_engine_class:
            mock_engine = Mock()
            mock_engine.run_qa_scoring.return_value = mock_report
            mock_engine_class.return_value = mock_engine
            
            exit_code = handler.execute(args)
            assert exit_code == 0
    
    def test_execute_import_error(self, tmp_path):
        """Test execution fails when QAEngine is not available."""
        handler = QAHandler()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        args = argparse.Namespace(
            project=str(project_path),
            threshold=3.0,
            detailed=False
        )
        
        with patch('qa_engine.QAEngine', side_effect=ImportError("Module not found")):
            exit_code = handler.execute(args)
            assert exit_code != 0
