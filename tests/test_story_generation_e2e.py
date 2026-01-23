"""
End-to-end test for story generation integration

Tests the complete workflow from wizard to story generation to project creation.
"""

import unittest
import tempfile
import os
import shutil
from unittest.mock import Mock, patch
from src.wizard.wizard_orchestrator import WizardOrchestrator
from src.wizard.config_builder import ConfigBuilder
from src.wizard.file_writer import FileWriter


class TestStoryGenerationE2E(unittest.TestCase):
    """End-to-end test for story generation workflow"""
    
    def setUp(self):
        """Set up test environment"""
        # Create temporary directory for test projects
        self.temp_dir = tempfile.mkdtemp()
        self.projects_dir = self.temp_dir
        
        # Create orchestrator
        self.orchestrator = WizardOrchestrator(self.projects_dir)
        
        # Mock input handler to simulate user inputs
        self.orchestrator.input_handler = Mock()
        
    def tearDown(self):
        """Clean up test environment"""
        # Remove temporary directory
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_complete_workflow_with_story_generation(self):
        """Test complete workflow from wizard to project creation with story generation"""
        
        # Mock user inputs for wizard
        self.orchestrator.input_handler.prompt_text.side_effect = [
            "test-story-project",  # Project name
            "10"  # Duration
        ]
        
        self.orchestrator.input_handler.prompt_choice.side_effect = [
            "court_metrage",  # Format
            "action",  # Genre
            "generate"  # Story method - choose generation
        ]
        
        self.orchestrator.input_handler.prompt_confirm.side_effect = [
            True,  # Accept generated story
            True   # Confirm project creation
        ]
        
        # Run the wizard
        wizard_state = self.orchestrator.run_wizard()
        
        # Verify wizard completed successfully
        self.assertIsNotNone(wizard_state)
        self.assertEqual(wizard_state.project_name, "test-story-project")
        self.assertEqual(wizard_state.format_key, "court_metrage")
        self.assertEqual(wizard_state.duration_minutes, 10)
        self.assertEqual(wizard_state.genre_key, "action")
        
        # Verify story was generated
        self.assertIsNotNone(wizard_state.story_content)
        self.assertIsNotNone(wizard_state.generated_story)
        
        # Verify generated story structure
        story = wizard_state.generated_story
        self.assertIsNotNone(story.title)
        self.assertIsNotNone(story.logline)
        self.assertIsNotNone(story.theme)
        self.assertEqual(len(story.acts), 3)
        
        # Verify act structure
        expected_durations = [25.0, 50.0, 25.0]
        for i, (act, expected) in enumerate(zip(story.acts, expected_durations)):
            self.assertEqual(act.duration_percent, expected)
        
        # Test configuration building
        config_builder = ConfigBuilder()
        config = config_builder.build_configuration(wizard_state)
        
        # Verify configuration includes story data
        self.assertEqual(config.project_name, "test-story-project")
        self.assertEqual(config.duration_minutes, 10)
        self.assertIn("action", config.genre["key"])
        self.assertEqual(config.story, wizard_state.story_content)
        
        # Test file writing
        file_writer = FileWriter(self.projects_dir)
        success = file_writer.create_project_files(config)
        
        # Verify project creation was successful
        self.assertTrue(success)
        
        # Verify project directory was created
        project_path = os.path.join(self.projects_dir, "test-story-project")
        self.assertTrue(os.path.exists(project_path))
        
        # Verify project.json was created
        project_json_path = os.path.join(project_path, "project.json")
        self.assertTrue(os.path.exists(project_json_path))
        
        # Verify project.json contains story data
        import json
        with open(project_json_path, 'r') as f:
            project_data = json.load(f)
        
        self.assertEqual(project_data["project_name"], "test-story-project")
        self.assertEqual(project_data["duration_minutes"], 10)
        self.assertIn("story", project_data)
        self.assertEqual(project_data["story"], wizard_state.story_content)
    
    def test_workflow_with_manual_story_fallback(self):
        """Test workflow when story generation fails and falls back to manual"""
        
        # Mock user inputs
        self.orchestrator.input_handler.prompt_text.side_effect = [
            "test-manual-project",  # Project name
            "15",  # Duration
            "This is a manually entered story about action and adventure."  # Manual story
        ]
        
        self.orchestrator.input_handler.prompt_choice.side_effect = [
            "court_metrage",  # Format
            "action",  # Genre
            "generate",  # Story method - try generation first
            "manual"  # Fallback to manual after generation fails
        ]
        
        self.orchestrator.input_handler.prompt_confirm.side_effect = [
            False,  # Reject generated story
            True   # Confirm project creation
        ]
        
        # Mock story generation to create a story that user will reject
        with patch('src.wizard.story_generator.generate_story') as mock_generate:
            from src.wizard.story_generator import Story, Act, ActType
            
            # Create a story that will be rejected
            rejected_story = Story(
                title="Rejected Story",
                logline="A story the user doesn't like",
                theme="Rejection",
                tone="Unwanted",
                conflict="user dissatisfaction",
                stakes="Low stakes",
                resolution="User chooses manual entry",
                acts=[
                    Act(ActType.SETUP, "Setup", "Setup description", 25.0),
                    Act(ActType.CONFRONTATION, "Confrontation", "Confrontation description", 50.0),
                    Act(ActType.RESOLUTION, "Resolution", "Resolution description", 25.0)
                ],
                summary="A story that will be rejected by the user."
            )
            
            mock_generate.return_value = rejected_story
            
            # Run the wizard
            wizard_state = self.orchestrator.run_wizard()
        
        # Verify wizard completed successfully with manual story
        self.assertIsNotNone(wizard_state)
        self.assertEqual(wizard_state.project_name, "test-manual-project")
        self.assertEqual(wizard_state.story_content, "This is a manually entered story about action and adventure.")
        
        # Verify no generated story is stored (user rejected it)
        # The generated_story might still be there from the generation attempt, but story_content should be manual
        self.assertNotEqual(wizard_state.story_content, rejected_story.summary)
    
    def test_story_generation_with_different_genres(self):
        """Test story generation works with different genres"""
        
        genres_to_test = ["action", "drame", "science_fiction", "horreur", "comedie"]
        
        for genre in genres_to_test:
            with self.subTest(genre=genre):
                # Create fresh orchestrator for each test
                orchestrator = WizardOrchestrator(self.projects_dir)
                orchestrator.input_handler = Mock()
                
                # Mock inputs for this genre
                orchestrator.input_handler.prompt_text.side_effect = [
                    f"test-{genre}-project",  # Project name
                    "20"  # Duration
                ]
                
                orchestrator.input_handler.prompt_choice.side_effect = [
                    "moyen_metrage",  # Format
                    genre,  # Genre
                    "generate"  # Story method
                ]
                
                orchestrator.input_handler.prompt_confirm.side_effect = [
                    True,  # Accept generated story
                    True   # Confirm project creation
                ]
                
                # Run wizard
                wizard_state = orchestrator.run_wizard()
                
                # Verify story was generated for this genre
                self.assertIsNotNone(wizard_state)
                self.assertIsNotNone(wizard_state.generated_story)
                self.assertEqual(wizard_state.genre_key, genre)
                
                # Verify story has genre-appropriate elements
                story = wizard_state.generated_story
                self.assertIsNotNone(story.title)
                self.assertIsNotNone(story.theme)
                self.assertIsNotNone(story.conflict)
                
                # Verify 3-act structure
                self.assertEqual(len(story.acts), 3)
    
    def test_story_generation_performance(self):
        """Test that story generation completes in reasonable time"""
        import time
        
        # Set up wizard
        self.orchestrator.input_handler.prompt_text.side_effect = [
            "performance-test-project",
            "30"
        ]
        
        self.orchestrator.input_handler.prompt_choice.side_effect = [
            "long_metrage",
            "science_fiction",
            "generate"
        ]
        
        self.orchestrator.input_handler.prompt_confirm.side_effect = [
            True,
            True
        ]
        
        # Measure story generation time
        start_time = time.time()
        wizard_state = self.orchestrator.run_wizard()
        end_time = time.time()
        
        generation_time = end_time - start_time
        
        # Verify story was generated
        self.assertIsNotNone(wizard_state.generated_story)
        
        # Verify reasonable performance (should be under 5 seconds for test)
        self.assertLess(generation_time, 5.0, f"Story generation took {generation_time:.2f} seconds, expected < 5.0")
        
        print(f"Story generation completed in {generation_time:.2f} seconds")


if __name__ == '__main__':
    unittest.main()