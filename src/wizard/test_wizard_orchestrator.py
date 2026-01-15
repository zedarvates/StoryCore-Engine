"""
Tests for Wizard Orchestrator (MVP)

Basic tests for the wizard orchestrator functionality.
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
from io import StringIO
import tempfile
import shutil
from pathlib import Path

from .wizard_orchestrator import WizardOrchestrator, run_interactive_wizard
from .models import WizardState


class TestWizardOrchestrator(unittest.TestCase):
    """Test cases for WizardOrchestrator"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.orchestrator = WizardOrchestrator(self.temp_dir)
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_init(self):
        """Test orchestrator initialization"""
        self.assertEqual(self.orchestrator.projects_dir, self.temp_dir)
        self.assertIsInstance(self.orchestrator.state, WizardState)
        self.assertEqual(self.orchestrator.state.current_step, 0)
    
    @patch('src.wizard.wizard_orchestrator.InputHandler')
    def test_collect_project_name_success(self, mock_input_handler):
        """Test successful project name collection"""
        # Mock input handler
        mock_handler = Mock()
        mock_handler.prompt_text.return_value = "test-project"
        mock_input_handler.return_value = mock_handler
        
        orchestrator = WizardOrchestrator(self.temp_dir)
        result = orchestrator._collect_project_name()
        
        self.assertTrue(result)
        self.assertEqual(orchestrator.state.project_name, "test-project")
        self.assertEqual(orchestrator.state.current_step, 1)
    
    @patch('src.wizard.wizard_orchestrator.InputHandler')
    def test_collect_project_name_keyboard_interrupt(self, mock_input_handler):
        """Test project name collection with keyboard interrupt"""
        # Mock input handler to raise KeyboardInterrupt
        mock_handler = Mock()
        mock_handler.prompt_text.side_effect = KeyboardInterrupt()
        mock_input_handler.return_value = mock_handler
        
        orchestrator = WizardOrchestrator(self.temp_dir)
        result = orchestrator._collect_project_name()
        
        self.assertFalse(result)
    
    @patch('src.wizard.wizard_orchestrator.InputHandler')
    def test_collect_format_success(self, mock_input_handler):
        """Test successful format collection"""
        # Mock input handler
        mock_handler = Mock()
        mock_handler.prompt_choice.return_value = "court_metrage"
        mock_input_handler.return_value = mock_handler
        
        orchestrator = WizardOrchestrator(self.temp_dir)
        result = orchestrator._collect_format()
        
        self.assertTrue(result)
        self.assertEqual(orchestrator.state.format_key, "court_metrage")
        self.assertEqual(orchestrator.state.current_step, 2)
    
    @patch('src.wizard.wizard_orchestrator.InputHandler')
    def test_collect_duration_success(self, mock_input_handler):
        """Test successful duration collection"""
        # Mock input handler
        mock_handler = Mock()
        mock_handler.prompt_text.return_value = "10"
        mock_input_handler.return_value = mock_handler
        
        orchestrator = WizardOrchestrator(self.temp_dir)
        orchestrator.state.format_key = "court_metrage"  # Set format first
        
        result = orchestrator._collect_duration()
        
        self.assertTrue(result)
        self.assertEqual(orchestrator.state.duration_minutes, 10)
        self.assertEqual(orchestrator.state.current_step, 3)
    
    @patch('src.wizard.wizard_orchestrator.InputHandler')
    def test_collect_genre_success(self, mock_input_handler):
        """Test successful genre collection"""
        # Mock input handler
        mock_handler = Mock()
        mock_handler.prompt_choice.return_value = "action"
        mock_input_handler.return_value = mock_handler
        
        orchestrator = WizardOrchestrator(self.temp_dir)
        result = orchestrator._collect_genre()
        
        self.assertTrue(result)
        self.assertEqual(orchestrator.state.genre_key, "action")
        self.assertEqual(orchestrator.state.current_step, 4)
    
    @patch('src.wizard.wizard_orchestrator.InputHandler')
    def test_collect_story_single_line(self, mock_input_handler):
        """Test successful story collection (single line)"""
        # Mock input handler
        mock_handler = Mock()
        mock_handler.prompt_text.return_value = "This is a test story with enough characters to pass validation."
        mock_input_handler.return_value = mock_handler
        
        orchestrator = WizardOrchestrator(self.temp_dir)
        result = orchestrator._collect_story()
        
        self.assertTrue(result)
        self.assertEqual(orchestrator.state.story_content, "This is a test story with enough characters to pass validation.")
        self.assertEqual(orchestrator.state.current_step, 5)
    
    @patch('src.wizard.wizard_orchestrator.InputHandler')
    def test_collect_story_multiline(self, mock_input_handler):
        """Test successful story collection (multi-line)"""
        # Mock input handler
        mock_handler = Mock()
        mock_handler.prompt_text.return_value = "MULTI"
        mock_handler.prompt_multiline.return_value = "This is a multi-line story.\nWith multiple lines.\nAnd enough content to pass validation."
        mock_input_handler.return_value = mock_handler
        
        orchestrator = WizardOrchestrator(self.temp_dir)
        result = orchestrator._collect_story()
        
        self.assertTrue(result)
        self.assertIn("multi-line story", orchestrator.state.story_content)
        self.assertEqual(orchestrator.state.current_step, 5)
    
    @patch('src.wizard.wizard_orchestrator.InputHandler')
    def test_show_summary_and_confirm_yes(self, mock_input_handler):
        """Test summary display with confirmation"""
        # Mock input handler
        mock_handler = Mock()
        mock_handler.prompt_confirm.return_value = True
        mock_input_handler.return_value = mock_handler
        
        # Set up state
        orchestrator = WizardOrchestrator(self.temp_dir)
        orchestrator.state.project_name = "test-project"
        orchestrator.state.format_key = "court_metrage"
        orchestrator.state.duration_minutes = 10
        orchestrator.state.genre_key = "action"
        orchestrator.state.story_content = "Test story content"
        
        result = orchestrator._show_summary_and_confirm()
        
        self.assertTrue(result)
    
    @patch('src.wizard.wizard_orchestrator.InputHandler')
    def test_show_summary_and_confirm_no(self, mock_input_handler):
        """Test summary display with rejection"""
        # Mock input handler
        mock_handler = Mock()
        mock_handler.prompt_confirm.return_value = False
        mock_input_handler.return_value = mock_handler
        
        # Set up state
        orchestrator = WizardOrchestrator(self.temp_dir)
        orchestrator.state.project_name = "test-project"
        orchestrator.state.format_key = "court_metrage"
        orchestrator.state.duration_minutes = 10
        orchestrator.state.genre_key = "action"
        orchestrator.state.story_content = "Test story content"
        
        result = orchestrator._show_summary_and_confirm()
        
        self.assertFalse(result)


class TestRunInteractiveWizard(unittest.TestCase):
    """Test cases for run_interactive_wizard function"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    @patch('src.wizard.wizard_orchestrator.WizardOrchestrator')
    def test_run_interactive_wizard_success(self, mock_orchestrator_class):
        """Test successful wizard run"""
        # Mock orchestrator
        mock_orchestrator = Mock()
        mock_state = WizardState()
        mock_state.project_name = "test-project"
        mock_orchestrator.run_wizard.return_value = mock_state
        mock_orchestrator_class.return_value = mock_orchestrator
        
        result = run_interactive_wizard(self.temp_dir)
        
        self.assertIsNotNone(result)
        self.assertEqual(result.project_name, "test-project")
        mock_orchestrator_class.assert_called_once_with(self.temp_dir)
        mock_orchestrator.run_wizard.assert_called_once()
    
    @patch('src.wizard.wizard_orchestrator.WizardOrchestrator')
    def test_run_interactive_wizard_cancelled(self, mock_orchestrator_class):
        """Test cancelled wizard run"""
        # Mock orchestrator
        mock_orchestrator = Mock()
        mock_orchestrator.run_wizard.return_value = None
        mock_orchestrator_class.return_value = mock_orchestrator
        
        result = run_interactive_wizard(self.temp_dir)
        
        self.assertIsNone(result)


if __name__ == '__main__':
    unittest.main()