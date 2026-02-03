"""
Project Generator for StoryCore AI Assistant.

This module generates complete StoryCore projects from parsed prompts,
including scenes, characters, sequences, and shots.
"""

import logging
import re
from typing import Optional, Dict, List
from datetime import datetime

from .models import (
    GeneratedProject,
    ProjectMetadata,
    Scene,
    Character,
    Sequence,
    Shot,
    ParsedPrompt
)
from .prompt_parser import PromptParser, LLMClient
from .exceptions import ValidationError

logger = logging.getLogger(__name__)


class ProjectGenerator:
    """Generate complete StoryCore projects from prompts."""
    
    def __init__(self, llm_client: Optional[LLMClient] = None):
        """
        Initialize project generator.
        
        Args:
            llm_client: LLM client for generation (if None, uses MockLLMClient)
        """
        self.parser = PromptParser(llm_client)
        self.llm = self.parser.llm
        logger.info(f"Initialized ProjectGenerator with {type(self.llm).__name__}")
    
    def generate_project(
        self,
        prompt: str,
        language: str = "en",
        preferences: Optional[Dict] = None
    ) -> GeneratedProject:
        """
        Generate a complete project from a natural language prompt.
        
        Args:
            prompt: The creative prompt
            language: Language code (en, fr, es, etc.)
            preferences: Optional preferences (sceneCount, duration, style)
            
        Returns:
            GeneratedProject with all elements
            
        Raises:
            ValidationError: If generation fails
        """
        logger.info(f"Generating project from prompt (language: {language})")
        logger.debug(f"Prompt: {prompt[:100]}...")
        
        try:
            # Parse the prompt
            parsed = self.parser.parse_prompt(prompt, language)
            logger.info(f"Parsed prompt: {parsed.genre}, {len(parsed.scenes)} scenes")
            
            # Generate project name
            project_name = self._generate_project_name(parsed)
            logger.info(f"Generated project name: {project_name}")
            
            # Generate scenes
            scenes = self._generate_scenes(parsed, preferences)
            logger.info(f"Generated {len(scenes)} scenes")
            
            # Generate characters
            characters = self._generate_characters(parsed)
            logger.info(f"Generated {len(characters)} characters")
            
            # Generate sequences
            sequences = self._generate_sequences(scenes, parsed)
            logger.info(f"Generated {len(sequences)} sequences")
            
            # Create project metadata
            metadata = self._create_metadata(project_name, parsed)
            
            # Create generated project
            generated = GeneratedProject(
                name=project_name,
                metadata=metadata,
                scenes=scenes,
                characters=characters,
                sequences=sequences,
                parsed_prompt=parsed
            )
            
            logger.info(f"Successfully generated project: {project_name}")
            return generated
            
        except Exception as e:
            logger.error(f"Failed to generate project: {e}")
            raise ValidationError(f"Project generation failed: {str(e)}")
    
    def _generate_project_name(self, parsed: ParsedPrompt) -> str:
        """
        Generate a project name from parsed prompt.
        
        Args:
            parsed: Parsed prompt data
            
        Returns:
            Project name (filesystem-safe)
        """
        # Use genre and a timestamp for uniqueness (including microseconds)
        genre = parsed.genre.replace(" ", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        
        # Create a safe name
        name = f"{genre}_{timestamp}"
        
        # Remove any unsafe characters
        name = re.sub(r'[^\w\-_]', '', name)
        
        return name
    
    def _create_metadata(self, project_name: str, parsed: ParsedPrompt) -> ProjectMetadata:
        """
        Create project metadata.
        
        Args:
            project_name: Name of the project
            parsed: Parsed prompt data
            
        Returns:
            ProjectMetadata with all capabilities enabled
        """
        return ProjectMetadata(
            schema_version="1.0",
            project_name=project_name,
            capabilities={
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True
            },
            generation_status={
                "grid": "pending",
                "promotion": "pending"
            }
        )
    
    def _generate_scenes(
        self,
        parsed: ParsedPrompt,
        preferences: Optional[Dict]
    ) -> List[Scene]:
        """
        Generate scene breakdown from parsed prompt.
        
        Args:
            parsed: Parsed prompt data
            preferences: Optional preferences (sceneCount, etc.)
            
        Returns:
            List of Scene objects (3-12 scenes)
        """
        # Determine scene count
        scene_count = self._determine_scene_count(parsed, preferences)
        logger.debug(f"Generating {scene_count} scenes")
        
        scenes = []
        parsed_scenes = parsed.scenes[:scene_count]
        
        # If we need more scenes than provided, duplicate/expand
        while len(parsed_scenes) < scene_count:
            parsed_scenes.append(parsed_scenes[-1])
        
        for i, scene_data in enumerate(parsed_scenes):
            scene = Scene(
                id=f"scene_{i+1:02d}",
                number=i + 1,
                title=scene_data.get("title", f"Scene {i+1}"),
                description=scene_data.get("description", ""),
                location=scene_data.get("location", parsed.setting),
                time_of_day=scene_data.get("time_of_day", "day"),
                duration=float(scene_data.get("duration", 3.0)),
                characters=scene_data.get("characters", []),
                key_actions=scene_data.get("actions", []),
                visual_notes=scene_data.get("visual_notes")
            )
            scenes.append(scene)
        
        return scenes
    
    def _determine_scene_count(
        self,
        parsed: ParsedPrompt,
        preferences: Optional[Dict]
    ) -> int:
        """
        Determine the number of scenes to generate.
        
        Args:
            parsed: Parsed prompt data
            preferences: Optional preferences
            
        Returns:
            Scene count (3-12)
        """
        # Check preferences first
        if preferences and "sceneCount" in preferences:
            count = preferences["sceneCount"]
            return max(3, min(12, count))
        
        # Use parsed scene count as a guide
        parsed_count = len(parsed.scenes)
        
        # Ensure within bounds (3-12)
        return max(3, min(12, parsed_count))
    
    def _generate_characters(self, parsed: ParsedPrompt) -> List[Character]:
        """
        Generate character profiles from parsed prompt.
        
        Args:
            parsed: Parsed prompt data
            
        Returns:
            List of Character objects
        """
        characters = []
        
        for i, char_data in enumerate(parsed.characters):
            # Generate detailed appearance description
            appearance = self._generate_appearance_description(char_data, parsed)
            
            # Ensure personality is not empty
            personality = char_data.get("personality", "")
            if not personality:
                # Generate a default personality based on role and description
                role = char_data.get("role", "supporting")
                description = char_data.get("description", "")
                personality = f"A {role} character with {description if description else 'a mysterious presence'}"
            
            character = Character(
                id=f"char_{i+1:02d}",
                name=char_data.get("name", f"Character {i+1}"),
                role=char_data.get("role", "supporting"),
                description=char_data.get("description", ""),
                appearance=appearance,
                personality=personality,
                visual_reference=None
            )
            characters.append(character)
        
        return characters
    
    def _generate_appearance_description(
        self,
        char_data: Dict,
        parsed: ParsedPrompt
    ) -> str:
        """
        Generate detailed appearance description for visual generation.
        
        Args:
            char_data: Character data from parsed prompt
            parsed: Parsed prompt data
            
        Returns:
            Detailed appearance description
        """
        # Build a prompt for appearance generation
        prompt = f"""Generate a detailed visual appearance description for this character suitable for AI image generation:

Character: {char_data.get('name', 'Character')}
Role: {char_data.get('role', 'character')}
Basic Description: {char_data.get('description', 'A character')}

Project Style: {parsed.visual_style}
Genre: {parsed.genre}
Tone: {parsed.tone}

Include: physical features, clothing, distinctive characteristics, color palette, and style notes.
Keep it concise (2-3 sentences) but visually descriptive.

Return only the description, no additional text."""
        
        try:
            description = self.llm.complete(prompt, temperature=0.7, max_tokens=200)
            # Clean up the description
            description = description.strip()
            return description
        except Exception as e:
            logger.warning(f"Failed to generate appearance description: {e}")
            # Fallback to basic description
            return f"{char_data.get('description', 'A character')} in {parsed.visual_style} style."
    
    def _generate_sequences(
        self,
        scenes: List[Scene],
        parsed: ParsedPrompt
    ) -> List[Sequence]:
        """
        Generate sequences and shots for each scene.
        
        Args:
            scenes: List of scenes
            parsed: Parsed prompt data
            
        Returns:
            List of Sequence objects
        """
        sequences = []
        
        for scene in scenes:
            # Determine shot count for this scene
            shot_count = self._estimate_shot_count(scene)
            
            # Generate shots
            shots = []
            for i in range(shot_count):
                shot = Shot(
                    id=f"{scene.id}_shot_{i+1:02d}",
                    number=i + 1,
                    type=self._determine_shot_type(i, shot_count),
                    camera_movement=self._determine_camera_movement(scene, i),
                    duration=scene.duration / shot_count,
                    description=self._generate_shot_description(scene, i, shot_count),
                    visual_style=parsed.visual_style
                )
                shots.append(shot)
            
            # Create sequence
            sequence = Sequence(
                id=f"seq_{scene.number:02d}",
                scene_id=scene.id,
                shots=shots,
                total_duration=scene.duration
            )
            sequences.append(sequence)
        
        return sequences
    
    def _estimate_shot_count(self, scene: Scene) -> int:
        """
        Estimate the number of shots for a scene.
        
        Args:
            scene: Scene object
            
        Returns:
            Shot count (1-5)
        """
        # Base on scene duration and complexity
        duration = scene.duration
        action_count = len(scene.key_actions)
        character_count = len(scene.characters)
        
        # Simple heuristic
        if duration <= 2.0:
            return 1
        elif duration <= 3.0:
            return max(2, min(action_count, 3))
        elif duration <= 4.0:
            return max(2, min(action_count + 1, 4))
        else:
            return max(3, min(action_count + character_count, 5))
    
    def _determine_shot_type(self, shot_index: int, total_shots: int) -> str:
        """
        Determine the shot type based on position in sequence.
        
        Args:
            shot_index: Index of the shot (0-based)
            total_shots: Total number of shots
            
        Returns:
            Shot type string
        """
        shot_types = ["wide", "medium", "close-up", "extreme-close-up"]
        
        if total_shots == 1:
            return "medium"
        
        # First shot is usually wide to establish
        if shot_index == 0:
            return "wide"
        
        # Last shot can be close-up for impact
        if shot_index == total_shots - 1:
            return "close-up"
        
        # Middle shots vary
        return shot_types[min(shot_index, len(shot_types) - 1)]
    
    def _determine_camera_movement(self, scene: Scene, shot_index: int) -> str:
        """
        Determine camera movement for a shot.
        
        Args:
            scene: Scene object
            shot_index: Index of the shot
            
        Returns:
            Camera movement string
        """
        movements = ["static", "pan", "tilt", "dolly", "crane"]
        
        # First shot is often static to establish
        if shot_index == 0:
            return "static"
        
        # Action scenes get more movement
        if len(scene.key_actions) > 2:
            return movements[min(shot_index + 1, len(movements) - 1)]
        
        # Default to static or pan
        return "static" if shot_index % 2 == 0 else "pan"
    
    def _generate_shot_description(
        self,
        scene: Scene,
        shot_index: int,
        total_shots: int
    ) -> str:
        """
        Generate a description for a shot.
        
        Args:
            scene: Scene object
            shot_index: Index of the shot
            total_shots: Total number of shots
            
        Returns:
            Shot description
        """
        # Use scene description and actions
        if shot_index < len(scene.key_actions):
            action = scene.key_actions[shot_index]
            return f"{scene.description} - {action}"
        else:
            return f"{scene.description} - shot {shot_index + 1}"
