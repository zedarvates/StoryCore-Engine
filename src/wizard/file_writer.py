"""
File Writer for Interactive Project Setup Wizard

This module handles writing project files including the professional
story documentation system with multiple interconnected files:
- 00_master_outline.md
- 01_plot_core.md
- 02_lore_worldbuilding.md
- 03_conspiracy_hidden_truth.md
- 04_character_bibles/*.md
- 05_timelines.md
- 06_style_guide.md
"""

import json
import os
from pathlib import Path
from typing import Optional
from .models import ProjectConfiguration
from .input_handler import display_message, display_success, display_error
from .story_documentation import generate_story_documentation, StoryDocumentationGenerator, CharacterProfile, TimelineEvent


class FileWriter:
    """
    Handles project file creation (MVP version)
    
    Simplified for MVP - basic project.json only.
    """
    
    def __init__(self, base_dir: str = "."):
        """
        Initialize the file writer
        
        Args:
            base_dir: Base directory where projects will be created
        """
        self.base_dir = Path(base_dir)
    
    def create_project_files(self, config: ProjectConfiguration, wizard_state=None) -> bool:
        """
        Create project directory and files
        
        Args:
            config: The project configuration
            wizard_state: Optional wizard state for story documentation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Create project directory
            project_path = self.base_dir / config.project_name
            
            if not self._create_project_directory(project_path):
                return False
            
            # Write project.json
            if not self._write_project_json(project_path, config):
                return False
            
            # Create basic directory structure
            if not self._create_directory_structure(project_path):
                return False
            
            # Generate professional story documentation if wizard_state provided
            if wizard_state:
                if not self._create_story_documentation(project_path, wizard_state):
                    display_message("Warning: Failed to generate some story documentation")
            
            display_success(f"Project '{config.project_name}' created successfully!")
            display_message(f"Project location: {project_path.absolute()}")
            
            return True
            
        except Exception as e:
            display_error(f"Failed to create project files: {e}")
            return False
    
    def _create_story_documentation(self, project_path: Path, wizard_state) -> bool:
        """
        Create professional story documentation files
        
        Args:
            project_path: Path to the project directory
            wizard_state: Wizard state with story information
            
        Returns:
            True if successful, False otherwise
        """
        try:
            display_message("Generating professional story documentation...")
            
            # Generate story documentation
            files = generate_story_documentation(wizard_state, str(project_path))
            
            display_success(f"Created {len(files)} story documentation files")
            
            # List created files
            for filename in files.keys():
                display_message(f"  - story/{filename}")
            
            return True
            
        except Exception as e:
            display_error(f"Failed to create story documentation: {e}")
            return False
    
    def _create_project_directory(self, project_path: Path) -> bool:
        """
        Create the main project directory
        
        Args:
            project_path: Path to the project directory
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if project_path.exists():
                display_error(f"Project directory already exists: {project_path}")
                return False
            
            project_path.mkdir(parents=True, exist_ok=False)
            display_message(f"Created project directory: {project_path.name}")
            return True
            
        except Exception as e:
            display_error(f"Failed to create project directory: {e}")
            return False
    
    def _write_project_json(self, project_path: Path, config: ProjectConfiguration) -> bool:
        """
        Write the project.json file
        
        Args:
            project_path: Path to the project directory
            config: The project configuration
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Validate configuration before writing
            if not self._validate_configuration(config):
                return False
            
            # Write project.json
            project_json_path = project_path / "project.json"
            
            with open(project_json_path, 'w', encoding='utf-8') as f:
                json.dump(config.to_dict(), f, indent=2, ensure_ascii=False)
            
            display_message("Created project.json")
            return True
            
        except Exception as e:
            display_error(f"Failed to write project.json: {e}")
            return False
    
    def _create_directory_structure(self, project_path: Path) -> bool:
        """
        Create basic directory structure for the project
        
        Args:
            project_path: Path to the project directory
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Basic directories for MVP
            directories = [
                "assets",           # For user assets
                "exports",          # For generated exports
                "storyboard",       # For storyboard files (future)
                "audio",            # For audio files (future)
                "video",            # For video files (future)
                "story"             # For story documentation files
            ]
            
            for dir_name in directories:
                dir_path = project_path / dir_name
                dir_path.mkdir(exist_ok=True)
            
            # Create a basic README
            readme_path = project_path / "README.md"
            readme_content = self._generate_readme_content(project_path.name)
            
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)
            
            display_message("Created project directory structure")
            return True
            
        except Exception as e:
            display_error(f"Failed to create directory structure: {e}")
            return False
    
    def _validate_configuration(self, config: ProjectConfiguration) -> bool:
        """
        Validate configuration before writing
        
        Args:
            config: The project configuration to validate
            
        Returns:
            True if valid, False otherwise
        """
        # Basic validation
        if not config.project_name:
            display_error("Project name is required")
            return False
        
        if not config.story:
            display_error("Story content is required")
            return False
        
        if config.duration_minutes <= 0:
            display_error("Duration must be greater than 0")
            return False
        
        return True
    
    def _generate_readme_content(self, project_name: str) -> str:
        """
        Generate README content for the project
        
        Args:
            project_name: Name of the project
            
        Returns:
            README content as string
        """
        return f"""# {project_name}

StoryCore-Engine Project

## Project Structure

- `project.json` - Main project configuration
- `story/` - Story documentation and narrative files
- `assets/` - User-provided assets (images, audio, etc.)
- `exports/` - Generated exports and final outputs
- `storyboard/` - Storyboard files (generated)
- `audio/` - Audio files and compositions
- `video/` - Video files and sequences

## Story Documentation

The `story/` folder contains:
- `00_master_outline.md` - Project overview, themes, structure
- `01_plot_core.md` - Main plot, conflicts, climax
- `02_lore_worldbuilding.md` - World settings, history, rules
- `03_conspiracy_hidden_truth.md` - Secrets, twists, revelations
- `04_character_bibles/` - Character profiles and arcs
- `05_timelines.md` - Chronology and events
- `06_style_guide.md` - Writing style and constraints

## Getting Started

This project was created using the StoryCore-Engine interactive wizard.

To continue working with this project:

1. Review the configuration in `project.json`
2. Add any assets to the `assets/` folder
3. Use StoryCore-Engine commands to generate content:
   - `storycore.py grid --project {project_name}`
   - `storycore.py promote --project {project_name}`
   - `storycore.py qa --project {project_name}`
   - `storycore.py export --project {project_name}`

## Configuration

See `project.json` for complete project configuration including:
- Format and duration settings
- Genre and style configuration
- Story content
- Technical specifications

Generated by StoryCore-Engine Interactive Project Setup Wizard (MVP)
"""


# Convenience function for direct use
def create_project_files(config: ProjectConfiguration, base_dir: str = ".", wizard_state=None) -> bool:
    """
    Convenience function to create project files
    
    Args:
        config: The project configuration
        base_dir: Base directory where project will be created
        wizard_state: Optional wizard state for story documentation
        
    Returns:
        True if successful, False otherwise
    """
    writer = FileWriter(base_dir)
    return writer.create_project_files(config, wizard_state)
