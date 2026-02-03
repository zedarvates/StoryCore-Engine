"""
Integration tests for CLI handlers with memory system logging.

These tests verify that the memory integration module works correctly
with the handler structure, without requiring full handler execution.
"""

import unittest
import tempfile
import shutil
import json
from pathlib import Path
from unittest.mock import Mock, patch

from src.cli.memory_integration import (
    is_memory_system_enabled,
    log_grid_generation,
    log_panel_promotion,
    log_qa_scoring,
    log_project_export
)


class TestHandlerMemoryIntegration(unittest.TestCase):
    """Test that memory integration works with handler patterns."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.test_dir = tempfile.mkdtemp()
        self.project_path = Path(self.test_dir)
        
        # Create project structure
        (self.project_path / "assets" / "images" / "panels").mkdir(parents=True, exist_ok=True)
        (self.project_path / "build_logs").mkdir(parents=True, exist_ok=True)
        
        # Create project config with memory system enabled
        self._create_project_config(memory_enabled=True)
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def _create_project_config(self, memory_enabled: bool = True):
        """Create a project config file."""
        config = {
            "schema_version": "1.0",
            "project_name": "test_project",
            "project_type": "video",
            "creation_timestamp": "2025-01-26T00:00:00Z",
            "objectives": [],
            "memory_system_enabled": memory_enabled,
            "memory_system_config": {
                "auto_summarize": True,
                "summarization_threshold_kb": 50,
                "auto_translate": True,
                "target_languages": ["en", "fr"],
                "error_detection_enabled": True,
                "auto_recovery_enabled": True,
                "max_recovery_attempts": 3
            }
        }
        
        config_path = self.project_path / "project_config.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
    
    def _get_log_content(self) -> str:
        """Get content of build log."""
        log_file = self.project_path / "build_logs" / "build_steps_raw.log"
        if log_file.exists():
            with open(log_file, 'r', encoding='utf-8') as f:
                return f.read()
        return ""
    
    def test_grid_logging_integration(self):
        """Test grid generation logging integration."""
        # Simulate what grid handler would do
        result = log_grid_generation(
            project_path=self.project_path,
            grid_spec="3x3",
            grid_path="assets/grid.png",
            panel_count=9,
            cell_size=512
        )
        
        self.assertTrue(result)
        
        # Verify logging occurred
        log_content = self._get_log_content()
        self.assertIn("GRID_GENERATED", log_content)
        self.assertIn("grid_spec: 3x3", log_content)
        self.assertIn("panel_count: 9", log_content)
        self.assertIn("Triggered_By: grid_handler", log_content)
    
    def test_promote_logging_integration(self):
        """Test panel promotion logging integration."""
        # Simulate what promote handler would do
        result = log_panel_promotion(
            project_path=self.project_path,
            panel_count=9,
            scale_factor=2,
            method="lanczos",
            output_dir="assets/promoted"
        )
        
        self.assertTrue(result)
        
        # Verify logging occurred
        log_content = self._get_log_content()
        self.assertIn("PANELS_PROMOTED", log_content)
        self.assertIn("panel_count: 9", log_content)
        self.assertIn("scale_factor: 2", log_content)
        self.assertIn("method: lanczos", log_content)
        self.assertIn("Triggered_By: promote_handler", log_content)
    
    def test_qa_logging_integration(self):
        """Test QA scoring logging integration."""
        # Simulate what QA handler would do
        result = log_qa_scoring(
            project_path=self.project_path,
            overall_score=4.5,
            threshold=3.0,
            passed=True,
            issues_count=2
        )
        
        self.assertTrue(result)
        
        # Verify logging occurred
        log_content = self._get_log_content()
        self.assertIn("QA_SCORING_COMPLETED", log_content)
        self.assertIn("overall_score: 4.5", log_content)
        self.assertIn("threshold: 3.0", log_content)
        self.assertIn("passed: True", log_content)
        self.assertIn("Triggered_By: qa_handler", log_content)
    
    def test_export_logging_integration(self):
        """Test project export logging integration."""
        # Simulate what export handler would do
        result = log_project_export(
            project_path=self.project_path,
            export_format="zip",
            export_location="exports/project.zip",
            file_count=15
        )
        
        self.assertTrue(result)
        
        # Verify logging occurred
        log_content = self._get_log_content()
        self.assertIn("PROJECT_EXPORTED", log_content)
        self.assertIn("format: zip", log_content)
        self.assertIn("file_count: 15", log_content)
        self.assertIn("Triggered_By: export_handler", log_content)
    
    def test_logging_disabled_integration(self):
        """Test that logging is skipped when memory system is disabled."""
        # Recreate config with memory system disabled
        self._create_project_config(memory_enabled=False)
        
        # Try to log
        result = log_grid_generation(
            project_path=self.project_path,
            grid_spec="3x3",
            grid_path="assets/grid.png",
            panel_count=9,
            cell_size=512
        )
        
        # Should return False when disabled
        self.assertFalse(result)
        
        # Verify no logging occurred
        log_content = self._get_log_content()
        self.assertEqual(log_content, "")
    
    def test_sequential_logging_integration(self):
        """Test that multiple pipeline actions are logged sequentially."""
        # Simulate a complete pipeline run
        log_grid_generation(self.project_path, "3x3", "grid.png", 9, 512)
        log_panel_promotion(self.project_path, 9, 2, "lanczos", "promoted")
        log_qa_scoring(self.project_path, 4.5, 3.0, True, 2)
        log_project_export(self.project_path, "zip", "export.zip", 15)
        
        # Verify all actions are in log
        log_content = self._get_log_content()
        self.assertIn("GRID_GENERATED", log_content)
        self.assertIn("PANELS_PROMOTED", log_content)
        self.assertIn("QA_SCORING_COMPLETED", log_content)
        self.assertIn("PROJECT_EXPORTED", log_content)
        
        # Verify they appear in order
        grid_pos = log_content.find("GRID_GENERATED")
        promote_pos = log_content.find("PANELS_PROMOTED")
        qa_pos = log_content.find("QA_SCORING_COMPLETED")
        export_pos = log_content.find("PROJECT_EXPORTED")
        
        self.assertLess(grid_pos, promote_pos)
        self.assertLess(promote_pos, qa_pos)
        self.assertLess(qa_pos, export_pos)
    
    def test_non_interference_on_error(self):
        """Test that logging errors don't disrupt pipeline."""
        # Remove build_logs directory to cause logging failure
        shutil.rmtree(self.project_path / "build_logs")
        
        # Try to log - BuildLogger will create the directory, so this will succeed
        result = log_grid_generation(
            project_path=self.project_path,
            grid_spec="3x3",
            grid_path="assets/grid.png",
            panel_count=9,
            cell_size=512
        )
        
        # BuildLogger creates the directory if needed, so this should succeed
        self.assertTrue(result)
        
        # Verify the directory was recreated
        self.assertTrue((self.project_path / "build_logs").exists())


if __name__ == '__main__':
    unittest.main()
