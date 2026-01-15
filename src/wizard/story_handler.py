"""
Story Handler for Interactive Project Setup Wizard (MVP)

This module handles story input - manual entry only for MVP.
AI story generation and file import are deferred to post-concours.
"""

from typing import Optional
from .input_handler import InputHandler, display_section, display_message
from .validator_service import create_story_validator


class StoryHandler:
    """
    Handles story input collection (MVP version)
    
    Simplified for MVP - manual entry only.
    """
    
    def __init__(self):
        """Initialize the story handler"""
        self.input_handler = InputHandler()
    
    def handle_manual_entry(self) -> Optional[str]:
        """
        Handle manual story entry with preview
        
        Returns:
            The story content, or None if cancelled
        """
        display_section("Story Input")
        display_message("Enter your story content manually.")
        display_message("This can be:")
        display_message("  • A complete script")
        display_message("  • A detailed outline")
        display_message("  • A story summary")
        display_message("  • Scene descriptions")
        display_message("")
        display_message("Requirements:")
        display_message("  • Minimum 10 characters")
        display_message("  • Maximum 10,000 characters")
        display_message("")
        
        validator = create_story_validator()
        
        try:
            # Offer choice between single-line and multi-line
            choice = self.input_handler.prompt_choice(
                "How would you like to enter your story?",
                [
                    ("single", "Single line (for short stories/summaries)"),
                    ("multi", "Multi-line (for longer content/scripts)")
                ],
                default=2  # Default to multi-line
            )
            
            if choice == "single":
                story_content = self.input_handler.prompt_text(
                    "Enter your story",
                    validator=validator
                )
            else:
                display_message("")
                story_content = self.input_handler.prompt_multiline(
                    "Enter your story content (type 'END' on a new line when finished):"
                )
                
                # Validate multi-line content
                is_valid, error = validator(story_content)
                if not is_valid:
                    self.input_handler.display_error(error)
                    return self.handle_manual_entry()  # Retry
            
            # Show preview
            if not self._show_preview(story_content):
                return self.handle_manual_entry()  # User wants to re-enter
            
            return story_content
            
        except KeyboardInterrupt:
            display_message("\nStory input cancelled.")
            return None
    
    def _show_preview(self, story_content: str) -> bool:
        """
        Show story preview and get confirmation
        
        Args:
            story_content: The story content to preview
            
        Returns:
            True if user confirms, False if they want to re-enter
        """
        display_section("Story Preview")
        
        # Show stats
        char_count = len(story_content)
        word_count = len(story_content.split())
        line_count = len(story_content.splitlines())
        
        display_message(f"Story Statistics:")
        display_message(f"  • Characters: {char_count:,}")
        display_message(f"  • Words: {word_count:,}")
        display_message(f"  • Lines: {line_count:,}")
        display_message("")
        
        # Show preview (first 300 characters)
        preview_length = min(300, len(story_content))
        preview = story_content[:preview_length]
        
        if len(story_content) > preview_length:
            preview += "\n\n[... content continues ...]"
        
        display_message("Story Preview:")
        display_message("-" * 40)
        display_message(preview)
        display_message("-" * 40)
        display_message("")
        
        # Get confirmation
        try:
            confirmed = self.input_handler.prompt_confirm(
                "Use this story content?",
                default=True
            )
            
            return confirmed
            
        except KeyboardInterrupt:
            return False


# Convenience function for direct use
def collect_story_manual() -> Optional[str]:
    """
    Convenience function to collect story manually
    
    Returns:
        The story content, or None if cancelled
    """
    handler = StoryHandler()
    return handler.handle_manual_entry()