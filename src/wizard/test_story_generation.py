"""
Unit tests for story generation integration in wizard orchestrator

Tests the integration between the wizard orchestrator and the V2 story generator.
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
from .models import WizardState
from .wizard_orchestrator import WizardOrchestrator
from .story_generator import Story, Act, ActType, StoryBeat


class TestStoryGenerationIntegration(unittest.TestCase):
    """Test story generation integration with wizard"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.orchestrator = WizardOrchestrator()
        self.orchestrator.state = WizardState(
            project_name="test-project",
            format_key="court_metrage",
            duration_minutes=10,
            genre_key="action"
        )
        
        # Mock input handler
        self.orchestrator.input_handler = Mock()
        
        # Create a sample generated story
        self.sample_story = Story(
            title="Test Action Story",
            logline="A hero must save the day when evil strikes.",
            theme="Good vs Evil",
            tone="High-energy and intense",
            conflict="terrorist threat emerges",
            stakes="Personal consequences of terrorist threat emerges",
            resolution="The terrorist threat emerges is resolved through Good vs Evil, leading to character growth and new understanding.",
            acts=[
                Act(
                    act_type=ActType.SETUP,
                    title="Setup",
                    description="Introduce the world, characters, and establish the Good vs Evil theme",
                    duration_percent=25.0,
                    beats=[
                        StoryBeat("Opening Image", "Establish tone and world", 3.0, 3, 1),
                        StoryBeat("Inciting Incident", "Event that starts the story", 8.0, 6, 4)
                    ]
                ),
                Act(
                    act_type=ActType.CONFRONTATION,
                    title="Confrontation",
                    description="Escalate the terrorist threat emerges and develop character arcs",
                    duration_percent=50.0,
                    beats=[
                        StoryBeat("First Obstacle", "Initial challenge", 8.0, 6, 6),
                        StoryBeat("Midpoint", "Major revelation or setback", 15.0, 8, 8)
                    ]
                ),
                Act(
                    act_type=ActType.RESOLUTION,
                    title="Resolution",
                    description="Resolve the conflict and reinforce the Good vs Evil theme",
                    duration_percent=25.0,
                    beats=[
                        StoryBeat("Climax", "Final confrontation", 12.0, 10, 10),
                        StoryBeat("Resolution", "New equilibrium", 5.0, 4, 1)
                    ]
                )
            ],
            summary="A complete action story with 3-act structure."
        )
    
    def test_collect_story_offers_generation_option(self):
        """Test that _collect_story offers automatic generation option"""
        # Mock the choice to select generation
        self.orchestrator.input_handler.prompt_choice.return_value = "generate"
        
        # Mock the story generation method
        with patch.object(self.orchestrator, '_generate_story_automatically', return_value=True) as mock_generate:
            result = self.orchestrator._collect_story()
            
            # Verify choice was offered
            self.orchestrator.input_handler.prompt_choice.assert_called_once()
            call_args = self.orchestrator.input_handler.prompt_choice.call_args
            choices = call_args[0][1]  # Second argument is choices
            
            # Check that both manual and generate options are offered
            choice_keys = [choice[0] for choice in choices]
            self.assertIn("manual", choice_keys)
            self.assertIn("generate", choice_keys)
            
            # Verify generation method was called
            mock_generate.assert_called_once()
            self.assertTrue(result)
    
    def test_collect_story_manual_fallback(self):
        """Test that manual entry still works"""
        # Mock the choice to select manual
        self.orchestrator.input_handler.prompt_choice.return_value = "manual"
        
        # Mock the manual story method
        with patch.object(self.orchestrator, '_collect_story_manually', return_value=True) as mock_manual:
            result = self.orchestrator._collect_story()
            
            # Verify manual method was called
            mock_manual.assert_called_once()
            self.assertTrue(result)
    
    @patch('src.wizard.story_generator.generate_story')
    def test_generate_story_automatically_success(self, mock_generate_story):
        """Test successful automatic story generation"""
        # Mock story generation
        mock_generate_story.return_value = self.sample_story
        
        # Mock user confirmation
        self.orchestrator.input_handler.prompt_confirm.return_value = True
        
        # Test story generation
        result = self.orchestrator._generate_story_automatically()
        
        # Verify story was generated
        mock_generate_story.assert_called_once_with(self.orchestrator.state)
        
        # Verify story was stored in state
        self.assertEqual(self.orchestrator.state.story_content, self.sample_story.summary)
        self.assertEqual(self.orchestrator.state.generated_story, self.sample_story)
        self.assertEqual(self.orchestrator.state.current_step, 5)
        
        # Verify confirmation was requested
        self.orchestrator.input_handler.prompt_confirm.assert_called_once()
        
        self.assertTrue(result)
    
    @patch('src.wizard.story_generator.generate_story')
    def test_generate_story_automatically_rejection(self, mock_generate_story):
        """Test story generation with user rejection"""
        # Mock story generation
        mock_generate_story.return_value = self.sample_story
        
        # Mock user rejection and choice to try manual
        self.orchestrator.input_handler.prompt_confirm.return_value = False
        self.orchestrator.input_handler.prompt_choice.return_value = "manual"
        
        # Mock manual fallback
        with patch.object(self.orchestrator, '_collect_story_manually', return_value=True) as mock_manual:
            result = self.orchestrator._generate_story_automatically()
            
            # Verify story was generated but rejected
            mock_generate_story.assert_called_once()
            self.orchestrator.input_handler.prompt_confirm.assert_called_once()
            
            # Verify user was offered options
            self.orchestrator.input_handler.prompt_choice.assert_called_once()
            
            # Verify manual fallback was called
            mock_manual.assert_called_once()
            
            self.assertTrue(result)
    
    @patch('src.wizard.story_generator.generate_story')
    def test_generate_story_automatically_regenerate(self, mock_generate_story):
        """Test story regeneration when user requests it"""
        # Mock story generation (will be called twice)
        mock_generate_story.return_value = self.sample_story
        
        # Mock user rejection, choice to regenerate, then acceptance
        self.orchestrator.input_handler.prompt_confirm.side_effect = [False, True]
        self.orchestrator.input_handler.prompt_choice.return_value = "regenerate"
        
        # Test story generation with regeneration
        result = self.orchestrator._generate_story_automatically()
        
        # Verify story was generated twice
        self.assertEqual(mock_generate_story.call_count, 2)
        
        # Verify final acceptance
        self.assertEqual(self.orchestrator.state.generated_story, self.sample_story)
        
        self.assertTrue(result)
    
    def test_generate_story_import_error_fallback(self):
        """Test fallback to manual when story generator not available"""
        # Mock import error by patching the import itself
        with patch('builtins.__import__', side_effect=ImportError("Module not found")):
            with patch.object(self.orchestrator, '_collect_story_manually', return_value=True) as mock_manual:
                result = self.orchestrator._generate_story_automatically()
                
                # Verify fallback to manual
                mock_manual.assert_called_once()
                self.assertTrue(result)
    
    @patch('src.wizard.story_generator.generate_story')
    def test_generate_story_exception_fallback(self, mock_generate_story):
        """Test fallback to manual when story generation fails"""
        # Mock generation error
        mock_generate_story.side_effect = Exception("Generation failed")
        
        with patch.object(self.orchestrator, '_collect_story_manually', return_value=True) as mock_manual:
            result = self.orchestrator._generate_story_automatically()
            
            # Verify fallback to manual
            mock_manual.assert_called_once()
            self.assertTrue(result)
    
    def test_summary_shows_generated_story_details(self):
        """Test that summary shows generated story details"""
        # Set up state with generated story
        self.orchestrator.state.story_content = self.sample_story.summary
        self.orchestrator.state.generated_story = self.sample_story
        
        # Mock confirmation
        self.orchestrator.input_handler.prompt_confirm.return_value = True
        
        # Mock display functions
        with patch('src.wizard.wizard_orchestrator.display_message') as mock_display:
            result = self.orchestrator._show_summary_and_confirm()
            
            # Verify generated story details were displayed
            display_calls = [call[0][0] for call in mock_display.call_args_list]
            
            # Check for generated story indicators
            generated_story_messages = [msg for msg in display_calls if "Generated automatically" in msg]
            self.assertTrue(len(generated_story_messages) > 0)
            
            # Check for story details
            title_messages = [msg for msg in display_calls if self.sample_story.title in msg]
            self.assertTrue(len(title_messages) > 0)
            
            self.assertTrue(result)
    
    def test_summary_shows_manual_story_preview(self):
        """Test that summary shows manual story preview when no generated story"""
        # Set up state with manual story only
        self.orchestrator.state.story_content = "This is a manually entered story content."
        self.orchestrator.state.generated_story = None
        
        # Mock confirmation
        self.orchestrator.input_handler.prompt_confirm.return_value = True
        
        # Mock display functions
        with patch('src.wizard.wizard_orchestrator.display_message') as mock_display:
            result = self.orchestrator._show_summary_and_confirm()
            
            # Verify manual story preview was displayed
            display_calls = [call[0][0] for call in mock_display.call_args_list]
            
            # Check for manual story content
            story_messages = [msg for msg in display_calls if "This is a manually" in msg]
            self.assertTrue(len(story_messages) > 0)
            
            self.assertTrue(result)


class TestStoryGeneratorIntegration(unittest.TestCase):
    """Test the story generator itself"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.wizard_state = WizardState(
            project_name="test-project",
            format_key="court_metrage",
            duration_minutes=10,
            genre_key="action"
        )
    
    def test_story_generator_import(self):
        """Test that story generator can be imported"""
        try:
            from .story_generator import generate_story, StoryGenerator
            self.assertTrue(True)  # Import successful
        except ImportError:
            self.fail("Story generator import failed")
    
    def test_story_generation_basic(self):
        """Test basic story generation"""
        from .story_generator import generate_story
        
        story = generate_story(self.wizard_state)
        
        # Verify story structure
        self.assertIsNotNone(story.title)
        self.assertIsNotNone(story.logline)
        self.assertIsNotNone(story.theme)
        self.assertIsNotNone(story.tone)
        self.assertIsNotNone(story.conflict)
        self.assertIsNotNone(story.stakes)
        self.assertIsNotNone(story.resolution)
        self.assertIsNotNone(story.summary)
        
        # Verify 3-act structure
        self.assertEqual(len(story.acts), 3)
        
        # Verify act duration percentages
        expected_durations = [25.0, 50.0, 25.0]
        for i, (act, expected) in enumerate(zip(story.acts, expected_durations)):
            self.assertEqual(act.duration_percent, expected, f"Act {i+1} duration incorrect")
    
    def test_story_validation(self):
        """Test story structure validation"""
        from .story_generator import generate_story
        
        story = generate_story(self.wizard_state)
        
        # Validate structure
        is_valid, errors = story.validate_structure()
        
        self.assertTrue(is_valid, f"Story validation failed: {errors}")
        self.assertEqual(len(errors), 0)


if __name__ == '__main__':
    unittest.main()