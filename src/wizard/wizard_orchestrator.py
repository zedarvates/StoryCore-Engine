"""
Wizard Orchestrator for Interactive Project Setup (MVP)

This module orchestrates the complete wizard flow, managing the sequence
of questions and collecting all necessary information for project creation.
"""

from typing import Optional
from .models import WizardState, ProjectConfiguration
from .definitions import get_all_genres, get_all_formats, get_genre_definition, get_format_definition
from .input_handler import InputHandler, display_section, display_message, display_success, display_error
from .validator_service import (
    create_project_name_validator,
    create_duration_validator,
    create_story_validator
)


class WizardOrchestrator:
    """
    Orchestrates the complete wizard flow (MVP version)
    
    Simplified for MVP - basic question sequence without state persistence.
    """
    
    def __init__(self, projects_dir: str = "."):
        """
        Initialize the wizard orchestrator
        
        Args:
            projects_dir: Directory where projects will be created
        """
        self.input_handler = InputHandler()
        self.projects_dir = projects_dir
        self.state = WizardState()
    
    def run_wizard(self) -> Optional[WizardState]:
        """
        Run the complete wizard flow
        
        Returns:
            WizardState with all collected information, or None if cancelled
        """
        try:
            # Welcome screen
            self._show_welcome()
            
            # Question sequence
            if not self._collect_project_name():
                return None
            
            if not self._collect_format():
                return None
            
            if not self._collect_duration():
                return None
            
            if not self._collect_genre():
                return None
            
            if not self._collect_story():
                return None
            
            # Summary and confirmation
            if not self._show_summary_and_confirm():
                return None
            
            display_success("Wizard completed successfully!")
            return self.state
            
        except KeyboardInterrupt:
            display_message("\n\nWizard cancelled by user.")
            return None
        except Exception as e:
            display_error(f"Unexpected error: {e}")
            return None
    
    def _show_welcome(self):
        """Display welcome screen"""
        display_section("StoryCore-Engine Interactive Project Setup")
        display_message("Welcome to the StoryCore-Engine project setup wizard!")
        display_message("This wizard will guide you through creating a new video project.")
        display_message("You can press Ctrl+C at any time to cancel.")
        display_message("")
    
    def _collect_project_name(self) -> bool:
        """
        Collect project name
        
        Returns:
            True if successful, False if cancelled
        """
        display_section("Step 1: Project Name")
        display_message("Choose a unique name for your project.")
        display_message("Use only letters, numbers, hyphens, and underscores.")
        
        # Generate default project name
        from datetime import datetime
        default_name = f"projet-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        display_message(f"Press Enter to use default name: {default_name}")
        
        validator = create_project_name_validator(self.projects_dir)
        
        try:
            self.state.project_name = self.input_handler.prompt_text(
                "Project name",
                default=default_name,
                validator=validator
            )
            self.state.current_step = 1
            return True
        except KeyboardInterrupt:
            return False
    
    def _collect_format(self) -> bool:
        """
        Collect format selection
        
        Returns:
            True if successful, False if cancelled
        """
        display_section("Step 2: Format Selection")
        display_message("Choose the format for your project:")
        
        # Prepare choices
        formats = get_all_formats()
        choices = []
        for key, format_def in formats.items():
            min_dur, max_dur = format_def.duration_range
            description = f"{format_def.name} ({min_dur}-{max_dur} minutes)"
            choices.append((key, description))
        
        try:
            self.state.format_key = self.input_handler.prompt_choice(
                "Select format",
                choices,
                default=1  # Default to first option (court_metrage)
            )
            self.state.current_step = 2
            return True
        except KeyboardInterrupt:
            return False
    
    def _collect_duration(self) -> bool:
        """
        Collect duration
        
        Returns:
            True if successful, False if cancelled
        """
        display_section("Step 3: Duration")
        
        # Show format range
        format_def = get_format_definition(self.state.format_key)
        min_dur, max_dur = format_def.duration_range
        display_message(f"For {format_def.name}, duration must be between {min_dur} and {max_dur} minutes.")
        
        validator = create_duration_validator(self.state.format_key)
        
        try:
            duration_str = self.input_handler.prompt_text(
                "Duration (in minutes)",
                validator=validator
            )
            self.state.duration_minutes = int(duration_str)
            self.state.current_step = 3
            return True
        except KeyboardInterrupt:
            return False
    
    def _collect_genre(self) -> bool:
        """
        Collect genre selection
        
        Returns:
            True if successful, False if cancelled
        """
        display_section("Step 4: Genre Selection")
        display_message("Choose the genre for your project:")
        
        # Prepare choices
        genres = get_all_genres()
        choices = []
        for key, genre_def in genres.items():
            choices.append((key, genre_def.name))
        
        try:
            self.state.genre_key = self.input_handler.prompt_choice(
                "Select genre",
                choices,
                default=1  # Default to first option (action)
            )
            self.state.current_step = 4
            return True
        except KeyboardInterrupt:
            return False
    
    def _collect_story(self) -> bool:
        """
        Collect story content - manual or automatic generation
        
        Returns:
            True if successful, False if cancelled
        """
        display_section("Step 5: Story Content")
        display_message("Choose how to provide your story content:")
        
        try:
            # Offer choice between manual and automatic
            story_method = self.input_handler.prompt_choice(
                "Story input method",
                [
                    ("manual", "Enter story manually"),
                    ("generate", "Generate story automatically (V2 Feature)")
                ],
                default=1  # Default to manual for MVP compatibility
            )
            
            if story_method == "generate":
                return self._generate_story_automatically()
            else:
                return self._collect_story_manually()
                
        except KeyboardInterrupt:
            return False
    
    def _collect_story_manually(self) -> bool:
        """
        Collect story content manually (original MVP method)
        
        Returns:
            True if successful, False if cancelled
        """
        display_message("Enter your story content.")
        display_message("This can be a script, outline, or detailed description.")
        display_message("Minimum 10 characters, maximum 10,000 characters.")
        
        validator = create_story_validator()
        
        try:
            # First try single-line input
            display_message("\nYou can enter a short story on one line, or type 'MULTI' for multi-line input:")
            
            story_input = self.input_handler.prompt_text(
                "Story (or 'MULTI' for multi-line)",
                validator=lambda x: (True, "") if x.upper() == "MULTI" else validator(x)
            )
            
            if story_input.upper() == "MULTI":
                # Multi-line input
                display_message("")
                self.state.story_content = self.input_handler.prompt_multiline(
                    "Enter your story content (type 'END' on a new line when finished):"
                )
                
                # Validate multi-line content
                is_valid, error = validator(self.state.story_content)
                if not is_valid:
                    display_error(error)
                    return self._collect_story_manually()  # Retry
            else:
                self.state.story_content = story_input
            
            self.state.current_step = 5
            return True
        except KeyboardInterrupt:
            return False
    
    def _generate_story_automatically(self) -> bool:
        """
        Generate story automatically using V2 story generator
        
        Returns:
            True if successful, False if cancelled
        """
        display_message("Generating story automatically based on your project parameters...")
        display_message("This will create a complete 3-act story with theme, conflict, and character arcs.")
        
        try:
            # Import story generator (V2 feature)
            from .story_generator import generate_story
            
            # Generate story using current wizard state
            display_message("Generating story... Please wait.")
            story = generate_story(self.state)
            
            # Show story preview
            display_section("Generated Story Preview")
            display_message(f"Title: {story.title}")
            display_message(f"Logline: {story.logline}")
            display_message(f"Theme: {story.theme}")
            display_message(f"Tone: {story.tone}")
            display_message("")
            
            # Show summary preview (first 300 characters)
            summary_preview = story.summary[:300]
            if len(story.summary) > 300:
                summary_preview += "..."
            
            display_message("Story Summary:")
            display_message("-" * 40)
            display_message(summary_preview)
            display_message("-" * 40)
            display_message("")
            
            # Show act structure
            display_message("Story Structure:")
            for i, act in enumerate(story.acts, 1):
                duration_min = act.get_duration_minutes(self.state.duration_minutes)
                display_message(f"  Act {i}: {act.title} ({act.duration_percent}% - {duration_min:.1f} min)")
                display_message(f"    {act.description}")
            display_message("")
            
            # Get user confirmation
            confirmed = self.input_handler.prompt_confirm(
                "Use this generated story?",
                default=True
            )
            
            if confirmed:
                # Store the complete story object in state
                self.state.story_content = story.summary
                self.state.generated_story = story  # Store full story object for V2 pipeline
                self.state.current_step = 5
                display_success("Story generated and accepted!")
                return True
            else:
                # Offer options
                choice = self.input_handler.prompt_choice(
                    "What would you like to do?",
                    [
                        ("regenerate", "Generate a new story"),
                        ("manual", "Enter story manually instead"),
                        ("cancel", "Cancel and go back")
                    ],
                    default=1
                )
                
                if choice == "regenerate":
                    return self._generate_story_automatically()  # Try again
                elif choice == "manual":
                    return self._collect_story_manually()  # Switch to manual
                else:
                    return False  # Cancel
            
        except ImportError:
            display_error("Story generation feature not available. Please enter story manually.")
            return self._collect_story_manually()
        except Exception as e:
            display_error(f"Error generating story: {e}")
            display_message("Falling back to manual story entry.")
            return self._collect_story_manually()
        except KeyboardInterrupt:
            return False
    
    def _show_summary_and_confirm(self) -> bool:
        """
        Show summary and get confirmation
        
        Returns:
            True if confirmed, False if cancelled
        """
        display_section("Summary")
        display_message("Please review your project configuration:")
        display_message("")
        
        # Project details
        display_message(f"Project Name: {self.state.project_name}")
        
        # Format details
        format_def = get_format_definition(self.state.format_key)
        display_message(f"Format: {format_def.name}")
        display_message(f"Duration: {self.state.duration_minutes} minutes")
        
        # Genre details
        genre_def = get_genre_definition(self.state.genre_key)
        display_message(f"Genre: {genre_def.name}")
        
        # Story details - enhanced for generated stories
        if hasattr(self.state, 'generated_story') and self.state.generated_story is not None:
            # Show generated story details
            story = self.state.generated_story
            display_message(f"Story: Generated automatically")
            display_message(f"  Title: {story.title}")
            display_message(f"  Theme: {story.theme}")
            display_message(f"  Tone: {story.tone}")
            display_message(f"  Structure: {len(story.acts)} acts")
        else:
            # Show manual story preview (first 100 characters)
            story_preview = self.state.story_content[:100]
            if len(self.state.story_content) > 100:
                story_preview += "..."
            display_message(f"Story: {story_preview}")
        
        display_message("")
        
        try:
            confirmed = self.input_handler.prompt_confirm(
                "Create project with these settings?",
                default=True
            )
            
            if not confirmed:
                display_message("Project creation cancelled.")
                return False
            
            return True
        except KeyboardInterrupt:
            return False


# Convenience function for direct use
def run_interactive_wizard(projects_dir: str = ".") -> Optional[WizardState]:
    """
    Run the interactive wizard
    
    Args:
        projects_dir: Directory where projects will be created
        
    Returns:
        WizardState with collected information, or None if cancelled
    """
    orchestrator = WizardOrchestrator(projects_dir)
    return orchestrator.run_wizard()