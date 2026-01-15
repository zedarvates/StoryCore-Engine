"""
Integration Tests for Wizard MVP

Tests the complete wizard flow from start to finish.
"""

import unittest
import tempfile
import shutil
from pathlib import Path
import json

from .models import WizardState
from .config_builder import build_project_configuration
from .file_writer import create_project_files


class TestWizardIntegration(unittest.TestCase):
    """Integration tests for the complete wizard flow"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_complete_wizard_flow(self):
        """Test complete flow from wizard state to project creation"""
        # Create a complete wizard state
        wizard_state = WizardState(
            project_name="test-integration-project",
            format_key="court_metrage",
            duration_minutes=10,
            genre_key="action",
            story_content="This is a test story for integration testing. It has enough content to pass validation and demonstrates the complete wizard flow from user input to project creation.",
            current_step=5
        )
        
        # Build configuration
        config = build_project_configuration(wizard_state)
        
        # Verify configuration
        self.assertEqual(config.project_name, "test-integration-project")
        self.assertEqual(config.duration_minutes, 10)
        self.assertEqual(config.format["key"], "court_metrage")
        self.assertEqual(config.genre["key"], "action")
        self.assertIn("test story", config.story)
        
        # Create project files
        success = create_project_files(config, self.temp_dir)
        self.assertTrue(success)
        
        # Verify project directory was created
        project_path = Path(self.temp_dir) / "test-integration-project"
        self.assertTrue(project_path.exists())
        self.assertTrue(project_path.is_dir())
        
        # Verify project.json was created and is valid
        project_json_path = project_path / "project.json"
        self.assertTrue(project_json_path.exists())
        
        with open(project_json_path, 'r', encoding='utf-8') as f:
            project_data = json.load(f)
        
        self.assertEqual(project_data["project_name"], "test-integration-project")
        self.assertEqual(project_data["duration_minutes"], 10)
        self.assertEqual(project_data["schema_version"], "1.0")
        
        # Verify directory structure was created
        expected_dirs = ["assets", "exports", "storyboard", "audio", "video"]
        for dir_name in expected_dirs:
            dir_path = project_path / dir_name
            self.assertTrue(dir_path.exists(), f"Directory {dir_name} should exist")
            self.assertTrue(dir_path.is_dir(), f"{dir_name} should be a directory")
        
        # Verify README was created
        readme_path = project_path / "README.md"
        self.assertTrue(readme_path.exists())
        
        with open(readme_path, 'r', encoding='utf-8') as f:
            readme_content = f.read()
        
        self.assertIn("test-integration-project", readme_content)
        self.assertIn("StoryCore-Engine", readme_content)
    
    def test_configuration_genre_defaults(self):
        """Test that genre defaults are properly applied"""
        # Test Action genre
        wizard_state = WizardState(
            project_name="action-test",
            format_key="court_metrage",
            duration_minutes=5,
            genre_key="action",
            story_content="Action story content for testing genre defaults application.",
            current_step=5
        )
        
        config = build_project_configuration(wizard_state)
        
        # Check action genre defaults
        self.assertEqual(config.genre["key"], "action")
        self.assertEqual(config.style_config["visual"]["lighting"], "high_contrast_dynamic")
        self.assertEqual(config.style_config["visual"]["color_palette"], "saturated_vibrant")
        self.assertEqual(config.style_config["cinematography"]["pacing"], "fast")
        
        # Test Drama genre
        wizard_state.genre_key = "drame"
        config = build_project_configuration(wizard_state)
        
        # Check drama genre defaults
        self.assertEqual(config.genre["key"], "drame")
        self.assertEqual(config.style_config["visual"]["lighting"], "natural_soft")
        self.assertEqual(config.style_config["visual"]["color_palette"], "muted_realistic")
        self.assertEqual(config.style_config["cinematography"]["pacing"], "moderate")
    
    def test_shot_count_calculation(self):
        """Test shot count calculation for different formats and durations"""
        # Test court-métrage (short film)
        wizard_state = WizardState(
            project_name="shot-count-test",
            format_key="court_metrage",
            duration_minutes=10,
            genre_key="action",
            story_content="Test story for shot count calculation verification.",
            current_step=5
        )
        
        config = build_project_configuration(wizard_state)
        
        # Court-métrage has 4.0 second average shot duration
        # 10 minutes = 600 seconds
        # 600 / 4.0 = 150 shots
        expected_shots = 150
        self.assertEqual(config.format["estimated_shot_count"], expected_shots)
        
        # Test long-métrage (feature film)
        wizard_state.format_key = "long_metrage"
        wizard_state.duration_minutes = 90
        
        config = build_project_configuration(wizard_state)
        
        # Long-métrage has 5.5 second average shot duration
        # 90 minutes = 5400 seconds
        # 5400 / 5.5 = 981.8... ≈ 981 shots
        expected_shots = 981
        self.assertEqual(config.format["estimated_shot_count"], expected_shots)
    
    def test_technical_specs_generation(self):
        """Test technical specifications generation"""
        wizard_state = WizardState(
            project_name="tech-specs-test",
            format_key="moyen_metrage",
            duration_minutes=30,
            genre_key="science_fiction",
            story_content="Science fiction story for technical specifications testing.",
            current_step=5
        )
        
        config = build_project_configuration(wizard_state)
        
        # Check technical specs
        tech_specs = config.technical_specs
        self.assertEqual(tech_specs["resolution"], "4K")
        self.assertEqual(tech_specs["frame_rate"], 24)
        self.assertEqual(tech_specs["aspect_ratio"], "16:9")
        self.assertEqual(tech_specs["color_space"], "Rec.709")
        self.assertEqual(tech_specs["audio_sample_rate"], 48000)
        self.assertEqual(tech_specs["audio_channels"], 2)


if __name__ == '__main__':
    unittest.main()