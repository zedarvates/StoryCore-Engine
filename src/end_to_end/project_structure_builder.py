"""
Project Structure Builder Module

This module provides functionality to create complete project directory structures
and save all project components to their appropriate files.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

from src.end_to_end.data_models import (
    ProjectComponents,
    WorldConfig,
    Character,
    StoryStructure,
    DialogueScript,
    SequencePlan,
    MusicDescription,
    ProjectMetadata
)


logger = logging.getLogger(__name__)


@dataclass
class ProjectStructure:
    """Represents the complete project structure with all file paths"""
    project_path: Path
    project_json_path: Path
    project_template_path: Path
    world_config_path: Path
    characters_path: Path
    story_structure_path: Path
    dialogue_script_path: Optional[Path]
    sequence_plan_path: Path
    music_description_path: Path
    assets_images_path: Path
    assets_audio_path: Path
    exports_path: Path
    locations_path: Path
    total_files: int = 0


@dataclass
class StructureValidation:
    """Result of structure validation"""
    valid: bool
    missing_directories: List[str]
    missing_files: List[str]
    errors: List[str]


class ProjectStructureBuilder:
    """
    Builds complete project directory structures and saves all components.
    
    This class is responsible for:
    - Creating all required directories
    - Saving all component JSON files
    - Validating the structure integrity
    - Handling file system errors gracefully
    """
    
    def __init__(self, base_path: str):
        """
        Initialize the project structure builder.
        
        Args:
            base_path: Base directory where projects will be created
        """
        self.base_path = Path(base_path).resolve()
        logger.info(f"ProjectStructureBuilder initialized with base_path: {self.base_path}")
    
    def create_project_structure(
        self,
        project_name: str,
        components: ProjectComponents
    ) -> ProjectStructure:
        """
        Create complete project structure with all directories and files.
        
        Args:
            project_name: Name of the project (will be used as directory name)
            components: All generated project components
            
        Returns:
            ProjectStructure with all file paths
            
        Raises:
            OSError: If directory or file creation fails
            ValueError: If project_name is invalid
            
        Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
        """
        logger.info(f"Creating project structure for: {project_name}")
        
        # Validate project name
        if not project_name or not self._is_valid_project_name(project_name):
            raise ValueError(f"Invalid project name: {project_name}")
        
        # Create project root directory (Requirement 4.1)
        project_path = self.base_path / project_name
        self._create_directory(project_path)
        logger.info(f"Created project root: {project_path}")
        
        # Create all subdirectories (Requirement 4.2)
        assets_path = project_path / "assets"
        assets_images_path = assets_path / "images"
        assets_audio_path = assets_path / "audio"
        exports_path = project_path / "exports"
        locations_path = project_path / "locations"
        story_path = project_path / "story"
        
        # Legacy/Expected directories for compatibility
        characters_dir = project_path / "characters"
        worlds_dir = project_path / "worlds"
        sequences_dir = project_path / "sequences"
        
        directories = [
            assets_path, assets_images_path, assets_audio_path, 
            exports_path, locations_path, story_path,
            characters_dir, worlds_dir, sequences_dir
        ]
        
        for directory in directories:
            self._create_directory(directory)
            logger.debug(f"Created directory: {directory}")
        
        # Define all file paths
        project_json_path = project_path / "project.json"
        project_template_path = project_path / "project_template.json"
        world_config_path = project_path / "world_config.json"
        characters_path = project_path / "characters.json"
        story_structure_path = project_path / "story_structure.json"
        sequence_plan_path = project_path / "sequence_plan.json"
        music_description_path = project_path / "music_description.json"
        
        # Dialogue script is optional
        dialogue_script_path = None
        if components.dialogue_script and (not hasattr(components.dialogue_script, 'scenes') or components.dialogue_script.scenes):
            dialogue_script_path = project_path / "dialogue_script.json"
        
        # Save all components
        success = self.save_all_components(project_path, components)
        if not success:
            raise OSError(f"Failed to save all components for project: {project_name}")
            
        # Generate professional documentation (Requirements Enhancement)
        try:
            self._generate_professional_story_documentation(project_path, components)
            logger.info("Generated professional story documentation")
        except Exception as e:
            logger.warning(f"Failed to generate story documentation: {e}")
            # Non-critical, continue
        
        # Create final structure object
        structure = ProjectStructure(
            project_path=project_path,
            project_json_path=project_json_path,
            project_template_path=project_template_path,
            world_config_path=world_config_path,
            characters_path=characters_path,
            story_structure_path=story_structure_path,
            dialogue_script_path=dialogue_script_path,
            sequence_plan_path=sequence_plan_path,
            music_description_path=music_description_path,
            assets_images_path=assets_images_path,
            assets_audio_path=assets_audio_path,
            exports_path=exports_path,
            locations_path=locations_path,
            total_files=15  # 10 core files + ~5 story doc files
        )
        
        logger.info(f"Project structure created successfully: {project_name}")
        return structure
    
    def save_all_components(
        self,
        project_path: Path,
        components: ProjectComponents
    ) -> bool:
        """
        Save all project components to their respective JSON files.
        
        Args:
            project_path: Path to the project directory
            components: All project components to save
            
        Returns:
            True if all files saved successfully, False otherwise
            
        Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
        """
        logger.info(f"Saving all components to: {project_path}")
        
        try:
            # Save project.json (Requirement 4.3)
            project_data = self._create_project_json(components)
            self._save_json_file(project_path / "project.json", project_data)
            logger.debug("Saved project.json")
            
            # Save project_template.json (Requirement 4.4)
            template_data = self._create_project_template(components)
            self._save_json_file(project_path / "project_template.json", template_data)
            logger.debug("Saved project_template.json")
            
            # Save world_config.json (Requirement 4.5)
            world_data = self._serialize_component(components.world_config)
            # Save locations as separate files and update world_config to have references
            world_data = self._save_locations_and_update_world_config(
                project_path, 
                components.world_config.key_locations, 
                world_data
            )
            self._save_json_file(project_path / "world_config.json", world_data)
            logger.debug("Saved world_config.json")
            
            # Save characters.json (Requirement 4.6)
            characters_data = {
                "characters": [self._serialize_component(char) for char in components.characters]
            }
            self._save_json_file(project_path / "characters.json", characters_data)
            logger.debug("Saved characters.json")
            
            # Save story_structure.json (Requirement 4.7)
            story_data = self._serialize_component(components.story_structure)
            self._save_json_file(project_path / "story_structure.json", story_data)
            logger.debug("Saved story_structure.json")
            
            # Save dialogue_script.json if dialogues exist (Requirement 4.8)
            if components.dialogue_script and components.dialogue_script.scenes:
                dialogue_data = self._serialize_component(components.dialogue_script)
                self._save_json_file(project_path / "dialogue_script.json", dialogue_data)
                logger.debug("Saved dialogue_script.json")
            
            # Save sequence_plan.json (Requirement 4.9)
            sequence_data = self._serialize_component(components.sequence_plan)
            self._save_json_file(project_path / "sequence_plan.json", sequence_data)
            logger.debug("Saved sequence_plan.json")
            
            # Save music_description.json (Requirement 4.10)
            music_data = self._serialize_component(components.music_description)
            self._save_json_file(project_path / "music_description.json", music_data)
            logger.debug("Saved music_description.json")
            
            logger.info("All components saved successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error saving components: {e}", exc_info=True)
            return False
    
    def validate_structure(self, project_path: Path) -> StructureValidation:
        """
        Validate that all required files and directories exist.
        
        Args:
            project_path: Path to the project directory
            
        Returns:
            StructureValidation with validation results
            
        Requirement: 4.11 (implied - structure validation)
        """
        logger.info(f"Validating project structure: {project_path}")
        
        missing_directories = []
        missing_files = []
        errors = []
        
        # Check if project directory exists
        if not project_path.exists():
            errors.append(f"Project directory does not exist: {project_path}")
            return StructureValidation(
                valid=False,
                missing_directories=[],
                missing_files=[],
                errors=errors
            )
        
        # Check required directories
        required_dirs = [
            "assets",
            "assets/images",
            "assets/audio",
            "exports",
            "locations",
            "story",
            "characters",
            "worlds",
            "sequences"
        ]
        
        for dir_name in required_dirs:
            dir_path = project_path / dir_name
            if not dir_path.exists():
                missing_directories.append(dir_name)
        
        # Check required files
        required_files = [
            "project.json",
            "project_template.json",
            "world_config.json",
            "characters.json",
            "story_structure.json",
            "sequence_plan.json",
            "music_description.json",
            "README.md"
        ]
        
        for file_name in required_files:
            file_path = project_path / file_name
            if not file_path.exists():
                missing_files.append(file_name)
        
        # Dialogue script is optional, so we don't check for it
        
        # Determine if structure is valid
        valid = len(missing_directories) == 0 and len(missing_files) == 0 and len(errors) == 0
        
        if valid:
            logger.info("Project structure validation passed")
        else:
            logger.warning(f"Project structure validation failed: {len(missing_directories)} missing dirs, {len(missing_files)} missing files")
        
        return StructureValidation(
            valid=valid,
            missing_directories=missing_directories,
            missing_files=missing_files,
            errors=errors
        )
    
    def _create_directory(self, path: Path) -> None:
        """
        Create a directory, including parent directories if needed.
        
        Args:
            path: Path to the directory to create
            
        Raises:
            OSError: If directory creation fails
        """
        try:
            path.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            logger.error(f"Failed to create directory {path}: {e}")
            raise
    
    def _save_json_file(self, path: Path, data: Dict[str, Any]) -> None:
        """
        Save data to a JSON file with proper formatting.
        
        Args:
            path: Path to the JSON file
            data: Data to save
            
        Raises:
            OSError: If file writing fails
        """
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except OSError as e:
            logger.error(f"Failed to save JSON file {path}: {e}")
            raise
    
    def _is_valid_project_name(self, name: str) -> bool:
        """
        Validate that a project name is valid for file system use.
        
        Args:
            name: Project name to validate
            
        Returns:
            True if valid, False otherwise
        """
        if not name:
            return False
        
        # Check for invalid characters
        invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
        if any(char in name for char in invalid_chars):
            return False
        
        # Check for reserved names (Windows)
        reserved_names = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4',
                         'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2',
                         'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
        if name.upper() in reserved_names:
            return False
        
        return True
    
    def _serialize_component(self, component: Any) -> Dict[str, Any]:
        """
        Serialize a component to a dictionary.
        
        Args:
            component: Component to serialize
            
        Returns:
            Dictionary representation of the component
        """
        if hasattr(component, '__dict__'):
            return asdict(component)
        return component
    
    def _create_project_json(self, components: ProjectComponents) -> Dict[str, Any]:
        """
        Create the main project.json file with all metadata.
        
        Args:
            components: All project components
            
        Returns:
            Dictionary for project.json
        """
        metadata = components.metadata
        
        return {
            "schema_version": "1.0",
            "project_name": metadata.project_name,
            "project_id": metadata.project_id,
            "created_at": metadata.created_at.isoformat(),
            "updated_at": metadata.updated_at.isoformat(),
            "version": metadata.version,
            "genre": components.world_config.genre,
            "video_type": metadata.video_type,
            "duration_seconds": metadata.duration_seconds,
            "aspect_ratio": metadata.aspect_ratio,
            "resolution": metadata.resolution,
            "status": "initialized",
            "capabilities": {
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True
            },
            "generation_status": {
                "grid": "pending",
                "promotion": "pending",
                "qa": "pending",
                "export": "pending"
            },
            "components": {
                "world_config": "world_config.json",
                "characters": "characters.json",
                "story_structure": "story_structure.json",
                "dialogue_script": "dialogue_script.json" if components.dialogue_script and components.dialogue_script.scenes else None,
                "sequence_plan": "sequence_plan.json",
                "music_description": "music_description.json"
            }
        }
    
    def _create_project_template(self, components: ProjectComponents) -> Dict[str, Any]:
        """
        Create the project_template.json file.
        
        Args:
            components: All project components
            
        Returns:
            Dictionary for project_template.json
        """
        metadata = components.metadata
        
        return {
            "template_version": "1.0",
            "project_name": metadata.project_name,
            "genre": components.world_config.genre,
            "video_type": metadata.video_type,
            "aspect_ratio": metadata.aspect_ratio,
            "duration_seconds": metadata.duration_seconds,
            "visual_style": components.world_config.visual_style,
            "color_palette": {
                "primary": components.world_config.color_palette.primary,
                "secondary": components.world_config.color_palette.secondary,
                "accent": components.world_config.color_palette.accent
            },
            "mood": components.world_config.atmosphere,
            "character_count": len(components.characters),
            "sequence_count": len(components.sequence_plan.sequences),
            "shot_count": components.sequence_plan.total_shots,
            "has_dialogue": components.dialogue_script is not None and len(components.dialogue_script.scenes) > 0,
            "music_genre": components.music_description.genre
        }
    
    def _save_locations_and_update_world_config(
        self,
        project_path: Path,
        locations: List[Any],
        world_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Save each location as a separate JSON file and update world_config to have references.
        
        Args:
            project_path: Path to the project directory
            locations: List of Location objects
            world_data: The serialized world config data
            
        Returns:
            Updated world_data with location references instead of full data
        """
        from src.end_to_end.data_models import Location
        
        locations_dir = project_path / "locations"
        location_references = []
        
        for location in locations:
            # Serialize the location
            location_dict = self._serialize_component(location)
            
            # Use location_id as filename, or generate one if not present
            location_id = location.location_id if hasattr(location, 'location_id') else str(hash(location.name))
            
            # Save location as separate JSON file
            location_file = locations_dir / f"{location_id}.json"
            self._save_json_file(location_file, location_dict)
            logger.debug(f"Saved location file: {location_file}")
            
            # Add reference to the list
            location_references.append({
                "id": location_id,
                "name": location.name,
                "file": f"locations/{location_id}.json"
            })
        
        # Update world_data to have location references instead of full data
        world_data["key_locations"] = location_references
        
        return world_data
    
    def load_locations(self, project_path: Path) -> List[Dict[str, Any]]:
        """
        Load all locations from the locations directory.
        
        Args:
            project_path: Path to the project directory
            
        Returns:
            List of location dictionaries
        """
        locations_dir = project_path / "locations"
        locations = []
        
        if not locations_dir.exists():
            return locations
        
        for location_file in locations_dir.glob("*.json"):
            try:
                with open(location_file, 'r', encoding='utf-8') as f:
                    location_data = json.load(f)
                    locations.append(location_data)
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Error loading location {location_file}: {e}")
                continue
        
        return locations

    def _generate_professional_story_documentation(
        self,
        project_path: Path,
        components: ProjectComponents
    ) -> None:
        """
        Generate professional story documentation in the story/ directory.
        
        Creates:
        - story/00_master_outline.md
        - story/01_plot_core.md
        - story/02_lore_worldbuilding.md
        - story/04_character_bibles/
        - story/scenario.md (Screenplay)
        - README.md
        """
        story_dir = project_path / "story"
        story_dir.mkdir(exist_ok=True)
        
        # 00 Master Outline
        self._write_file(story_dir / "00_master_outline.md", self._tpl_master_outline(components))
        
        # 01 Plot Core
        self._write_file(story_dir / "01_plot_core.md", self._tpl_plot_core(components))
        
        # 02 Lore
        self._write_file(story_dir / "02_lore_worldbuilding.md", self._tpl_lore(components))
        
        # 04 Character Bibles
        char_dir = story_dir / "04_character_bibles"
        char_dir.mkdir(exist_ok=True)
        for char in components.characters:
            char_file = char_dir / f"{char.name.lower().replace(' ', '_')}.md"
            self._write_file(char_file, self._tpl_character_bible(char))
            
        # Screenplay (Scenario)
        self._write_file(story_dir / "scenario.md", self._tpl_screenplay(components))
        
        # Project README
        self._write_file(project_path / "README.md", self._tpl_project_readme(project_path.name, components))

    def _write_file(self, path: Path, content: str) -> None:
        """Helper to write text files."""
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

    def _tpl_master_outline(self, comp: ProjectComponents) -> str:
        s = comp.story_structure
        return f"""# 00_master_outline.md - Project: {s.title}

## Summary
{s.logline}

## Themes
{', '.join(comp.story_structure.themes)}

## Genre & World
- **Genre**: {comp.world_config.genre}
- **Setting**: {comp.world_config.setting}
- **Atmosphere**: {comp.world_config.atmosphere}

## Narrative Structure
{chr(10).join([f"- Act {a.act_number} ({a.name}): {a.description}" for a in comp.story_structure.acts])}
"""

    def _tpl_plot_core(self, comp: ProjectComponents) -> str:
        return f"""# 01_plot_core.md - Narrative Engine

## Logline
{comp.story_structure.logline}

## Central Conflict
The story revolves around {comp.story_structure.themes[0] if comp.story_structure.themes else 'the main conflict'} in {comp.world_config.setting}.

## Key Turning Points
{chr(10).join([f"- {a.name}: {a.description}" for a in comp.story_structure.acts])}
"""

    def _tpl_lore(self, comp: ProjectComponents) -> str:
        w = comp.world_config
        return f"""# 02_lore_worldbuilding.md - {w.name}

## Atmosphere
{w.atmosphere}

## Visual Style
- **Lighting**: {w.lighting_style}
- **Colors**: {w.color_palette.primary}, {w.color_palette.secondary}, {w.color_palette.accent}
- **Styles**: {', '.join(w.visual_style)}

## Key Locations
{chr(10).join([f"- {loc.name}: {loc.description}" for loc in w.key_locations])}
"""

    def _tpl_character_bible(self, char) -> str:
        return f"""# Character Profile: {char.name}

## Role
{char.role}

## Description
{char.description}

## Visual Reference
{char.visual_description}

## Behavioral Traits (Requirements Enhancement)
- **Onomatopoeia**: {', '.join(char.onomatopoeia) if hasattr(char, 'onomatopoeia') else 'None'}
- **Signature Gestures**: {', '.join(char.gestures) if hasattr(char, 'gestures') else 'None'}
- **Diction Quirks**: {char.diction_quirks if hasattr(char, 'diction_quirks') else 'Normal'}
- **Voice / Inflection**: {char.voice_inflection if hasattr(char, 'voice_inflection') else 'Standard'}
"""

    def _tpl_screenplay(self, comp: ProjectComponents) -> str:
        from datetime import datetime
        scenes = []
        for i, act in enumerate(comp.story_structure.acts):
            scenes.append(f"## Act {act.act_number}: {act.name}\n\n{act.description}\n")
            
        # Character performance notes (Requirements Enhancement)
        perf_notes = []
        for char in comp.characters:
            notes = f"- **{char.name}**: {char.voice_inflection or 'Standard voice'}. {char.diction_quirks or 'No diction quirks'}."
            perf_notes.append(notes)
            
        return f"""# Scenario: {comp.story_structure.title}
Generated by StoryCore End-to-End Orchestrator
Date: {datetime.now().strftime('%Y-%m-%d')}

## Voice and Performance Directions
{chr(10).join(perf_notes)}

{chr(10).join(scenes)}

---
*Professional Production Document*
"""

    def _tpl_project_readme(self, name: str, comp: ProjectComponents) -> str:
        return f"""# {name}

Generated by StoryCore End-to-End Orchestrator.

## Project Structure
- `project.json`: Main technical configuration
- `world_config.json`: Environment and style settings
- `characters.json`: Character profiles and assets
- `story_structure.json`: Narrative structure and themes
- `story/`: Professional documentation and screenplay
- `assets/`: Generated images and audio
- `exports/`: Final video renders

## Character-Driven Narrative (Requirement Enhancement)
This project utilizes the **Behavioral Personality Engine** to ensure narrative depth:
- **Unique Performance**: Every character has specific voice inflections and diction quirks.
- **Physical Mimesis**: Screenplays and shot plans include signature gestures.
- **Vocal Texture**: Dialogue is enriched with character-specific onomatopoeia.

## Story Highlights
- **Title**: {comp.story_structure.title}
- **Theme**: {', '.join(comp.story_structure.themes)}
- **Logline**: {comp.story_structure.logline}
"""

