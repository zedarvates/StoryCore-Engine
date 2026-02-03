"""
Data Contract v1 validator for StoryCore AI Assistant.

This module provides validation for projects against the Data Contract v1 schema.
"""

from dataclasses import dataclass
from typing import List
import logging

from src.assistant.models import Project, Scene, Character, Sequence, Shot

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of validation."""
    valid: bool
    errors: List[str]
    warnings: List[str]


class DataContractValidator:
    """Validate projects against Data Contract v1."""
    
    def __init__(self):
        """Initialize validator."""
        self.valid_statuses = ["pending", "done", "failed", "passed"]
        self.required_capabilities = [
            "grid_generation",
            "promotion_engine",
            "qa_engine",
            "autofix_engine"
        ]
        logger.info("DataContractValidator initialized")
    
    def validate_project_data(self, project_data: dict) -> ValidationResult:
        """
        Validate project data dictionary against Data Contract v1.
        
        Args:
            project_data: Project data as dictionary
            
        Returns:
            ValidationResult with errors and warnings
        """
        errors = []
        warnings = []
        
        # Validate schema version
        schema_version = project_data.get("schema_version", "")
        if schema_version != "1.0":
            errors.append(
                f"Invalid schema version: {schema_version}, expected '1.0'"
            )
        
        # Validate required fields
        if not project_data.get("project_name"):
            errors.append("Missing project_name in metadata")
        
        # Validate capabilities
        capabilities = project_data.get("capabilities", {})
        for cap in self.required_capabilities:
            if cap not in capabilities:
                warnings.append(f"Missing capability: {cap}")
            elif not isinstance(capabilities[cap], bool):
                errors.append(f"Capability {cap} must be boolean")
        
        # Validate generation status
        generation_status = project_data.get("generation_status", {})
        for status_key, status_value in generation_status.items():
            if status_value not in self.valid_statuses:
                errors.append(
                    f"Invalid status for {status_key}: {status_value}, "
                    f"must be one of {self.valid_statuses}"
                )
        
        # Validate scenes
        scenes = project_data.get("scenes", [])
        if not scenes:
            warnings.append("Project has no scenes")
        else:
            for scene in scenes:
                scene_errors = self._validate_scene_data(scene)
                errors.extend(scene_errors)
        
        # Validate characters
        characters = project_data.get("characters", [])
        if not characters:
            warnings.append("Project has no characters")
        else:
            for character in characters:
                char_errors = self._validate_character_data(character)
                errors.extend(char_errors)
        
        # Validate sequences
        sequences = project_data.get("sequences", [])
        if not sequences:
            warnings.append("Project has no sequences")
        else:
            for sequence in sequences:
                seq_errors = self._validate_sequence_data(sequence)
                errors.extend(seq_errors)
        
        # Validate scene-sequence correspondence
        scene_ids = {scene.get("id") for scene in scenes if scene.get("id")}
        for sequence in sequences:
            scene_id = sequence.get("scene_id")
            if scene_id and scene_id not in scene_ids:
                errors.append(
                    f"Sequence {sequence.get('id')} references non-existent scene {scene_id}"
                )
        
        result = ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
        
        project_name = project_data.get("project_name", "unknown")
        if result.valid:
            logger.info(f"Project {project_name} validation passed with {len(warnings)} warnings")
        else:
            logger.error(f"Project {project_name} validation failed with {len(errors)} errors")
        
        return result
    
    def validate_project(self, project: Project) -> ValidationResult:
        """
        Validate complete project structure.
        
        Args:
            project: Project to validate
            
        Returns:
            ValidationResult with errors and warnings
        """
        errors = []
        warnings = []
        
        # Validate schema version
        if project.metadata.schema_version != "1.0":
            errors.append(
                f"Invalid schema version: {project.metadata.schema_version}, expected '1.0'"
            )
        
        # Validate required fields
        if not project.metadata.project_name:
            errors.append("Missing project_name in metadata")
        
        if not project.name:
            errors.append("Missing project name")
        
        # Validate capabilities
        for cap in self.required_capabilities:
            if cap not in project.metadata.capabilities:
                warnings.append(f"Missing capability: {cap}")
            elif not isinstance(project.metadata.capabilities[cap], bool):
                errors.append(f"Capability {cap} must be boolean")
        
        # Validate generation status
        for status_key, status_value in project.metadata.generation_status.items():
            if status_value not in self.valid_statuses:
                errors.append(
                    f"Invalid status for {status_key}: {status_value}, "
                    f"must be one of {self.valid_statuses}"
                )
        
        # Validate scenes
        if not project.scenes:
            warnings.append("Project has no scenes")
        else:
            for scene in project.scenes:
                scene_errors = self._validate_scene(scene)
                errors.extend(scene_errors)
        
        # Validate characters
        if not project.characters:
            warnings.append("Project has no characters")
        else:
            for character in project.characters:
                char_errors = self._validate_character(character)
                errors.extend(char_errors)
        
        # Validate sequences
        if not project.sequences:
            warnings.append("Project has no sequences")
        else:
            for sequence in project.sequences:
                seq_errors = self._validate_sequence(sequence)
                errors.extend(seq_errors)
        
        # Validate scene-sequence correspondence
        scene_ids = {scene.id for scene in project.scenes}
        for sequence in project.sequences:
            if sequence.scene_id not in scene_ids:
                errors.append(
                    f"Sequence {sequence.id} references non-existent scene {sequence.scene_id}"
                )
        
        result = ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
        
        if result.valid:
            logger.info(f"Project {project.name} validation passed with {len(warnings)} warnings")
        else:
            logger.error(f"Project {project.name} validation failed with {len(errors)} errors")
        
        return result
    
    def _validate_scene_data(self, scene: dict) -> List[str]:
        """Validate scene data dictionary."""
        errors = []
        
        scene_id = scene.get("id", "")
        if not scene_id:
            errors.append("Scene missing id")
        
        if not scene.get("title"):
            errors.append(f"Scene {scene_id} missing title")
        
        if not scene.get("description"):
            errors.append(f"Scene {scene_id} missing description")
        
        duration = scene.get("duration", 0)
        if duration <= 0:
            errors.append(f"Scene {scene_id} has invalid duration: {duration}")
        
        if not scene.get("location"):
            errors.append(f"Scene {scene_id} missing location")
        
        if not scene.get("time_of_day"):
            errors.append(f"Scene {scene_id} missing time_of_day")
        
        if not isinstance(scene.get("characters", []), list):
            errors.append(f"Scene {scene_id} characters must be a list")
        
        if not isinstance(scene.get("key_actions", []), list):
            errors.append(f"Scene {scene_id} key_actions must be a list")
        
        return errors
    
    def _validate_character_data(self, character: dict) -> List[str]:
        """Validate character data dictionary."""
        errors = []
        
        char_id = character.get("id", "")
        if not char_id:
            errors.append("Character missing id")
        
        if not character.get("name"):
            errors.append(f"Character {char_id} missing name")
        
        if not character.get("role"):
            errors.append(f"Character {char_id} missing role")
        
        if not character.get("description"):
            errors.append(f"Character {char_id} missing description")
        
        if not character.get("appearance"):
            errors.append(f"Character {char_id} missing appearance description")
        
        if not character.get("personality"):
            errors.append(f"Character {char_id} missing personality")
        
        return errors
    
    def _validate_sequence_data(self, sequence: dict) -> List[str]:
        """Validate sequence data dictionary."""
        errors = []
        
        seq_id = sequence.get("id", "")
        if not seq_id:
            errors.append("Sequence missing id")
        
        if not sequence.get("scene_id"):
            errors.append(f"Sequence {seq_id} missing scene_id")
        
        shots = sequence.get("shots", [])
        if not shots:
            errors.append(f"Sequence {seq_id} has no shots")
        else:
            for shot in shots:
                shot_errors = self._validate_shot_data(shot, seq_id)
                errors.extend(shot_errors)
        
        total_duration = sequence.get("total_duration", 0)
        if total_duration <= 0:
            errors.append(f"Sequence {seq_id} has invalid total_duration: {total_duration}")
        
        # Validate that shot durations sum to total duration (with tolerance)
        if shots:
            shot_duration_sum = sum(shot.get("duration", 0) for shot in shots)
            tolerance = 0.1  # Allow 0.1 second tolerance
            if abs(shot_duration_sum - total_duration) > tolerance:
                errors.append(
                    f"Sequence {seq_id} shot durations ({shot_duration_sum}s) "
                    f"don't match total_duration ({total_duration}s)"
                )
        
        return errors
    
    def _validate_shot_data(self, shot: dict, sequence_id: str) -> List[str]:
        """Validate shot data dictionary."""
        errors = []
        
        valid_shot_types = ["wide", "medium", "close-up", "extreme-close-up"]
        valid_camera_movements = ["static", "pan", "tilt", "dolly", "crane"]
        
        shot_id = shot.get("id", "")
        if not shot_id:
            errors.append(f"Shot in sequence {sequence_id} missing id")
        
        number = shot.get("number", 0)
        if number <= 0:
            errors.append(f"Shot {shot_id} has invalid number: {number}")
        
        shot_type = shot.get("type", "")
        if shot_type not in valid_shot_types:
            errors.append(
                f"Shot {shot_id} has invalid type: {shot_type}, "
                f"must be one of {valid_shot_types}"
            )
        
        camera_movement = shot.get("camera_movement", "")
        if camera_movement not in valid_camera_movements:
            errors.append(
                f"Shot {shot_id} has invalid camera_movement: {camera_movement}, "
                f"must be one of {valid_camera_movements}"
            )
        
        duration = shot.get("duration", 0)
        if duration <= 0:
            errors.append(f"Shot {shot_id} has invalid duration: {duration}")
        
        if not shot.get("description"):
            errors.append(f"Shot {shot_id} missing description")
        
        if not shot.get("visual_style"):
            errors.append(f"Shot {shot_id} missing visual_style")
        
        return errors
    
    def _validate_scene(self, scene: Scene) -> List[str]:
        """
        Validate scene structure.
        
        Args:
            scene: Scene to validate
            
        Returns:
            List of error messages
        """
        errors = []
        
        if not scene.id:
            errors.append("Scene missing id")
        
        if not scene.title:
            errors.append(f"Scene {scene.id} missing title")
        
        if not scene.description:
            errors.append(f"Scene {scene.id} missing description")
        
        if scene.duration <= 0:
            errors.append(f"Scene {scene.id} has invalid duration: {scene.duration}")
        
        if not scene.location:
            errors.append(f"Scene {scene.id} missing location")
        
        if not scene.time_of_day:
            errors.append(f"Scene {scene.id} missing time_of_day")
        
        if not isinstance(scene.characters, list):
            errors.append(f"Scene {scene.id} characters must be a list")
        
        if not isinstance(scene.key_actions, list):
            errors.append(f"Scene {scene.id} key_actions must be a list")
        
        return errors
    
    def _validate_character(self, character: Character) -> List[str]:
        """
        Validate character structure.
        
        Args:
            character: Character to validate
            
        Returns:
            List of error messages
        """
        errors = []
        
        if not character.id:
            errors.append("Character missing id")
        
        if not character.name:
            errors.append(f"Character {character.id} missing name")
        
        if not character.role:
            errors.append(f"Character {character.id} missing role")
        
        if not character.description:
            errors.append(f"Character {character.id} missing description")
        
        if not character.appearance:
            errors.append(f"Character {character.id} missing appearance description")
        
        if not character.personality:
            errors.append(f"Character {character.id} missing personality")
        
        return errors
    
    def _validate_sequence(self, sequence: Sequence) -> List[str]:
        """
        Validate sequence structure.
        
        Args:
            sequence: Sequence to validate
            
        Returns:
            List of error messages
        """
        errors = []
        
        if not sequence.id:
            errors.append("Sequence missing id")
        
        if not sequence.scene_id:
            errors.append(f"Sequence {sequence.id} missing scene_id")
        
        if not sequence.shots:
            errors.append(f"Sequence {sequence.id} has no shots")
        else:
            for shot in sequence.shots:
                shot_errors = self._validate_shot(shot, sequence.id)
                errors.extend(shot_errors)
        
        if sequence.total_duration <= 0:
            errors.append(f"Sequence {sequence.id} has invalid total_duration: {sequence.total_duration}")
        
        # Validate that shot durations sum to total duration (with tolerance)
        if sequence.shots:
            shot_duration_sum = sum(shot.duration for shot in sequence.shots)
            tolerance = 0.1  # Allow 0.1 second tolerance
            if abs(shot_duration_sum - sequence.total_duration) > tolerance:
                errors.append(
                    f"Sequence {sequence.id} shot durations ({shot_duration_sum}s) "
                    f"don't match total_duration ({sequence.total_duration}s)"
                )
        
        return errors
    
    def _validate_shot(self, shot: Shot, sequence_id: str) -> List[str]:
        """
        Validate shot structure.
        
        Args:
            shot: Shot to validate
            sequence_id: ID of parent sequence for error messages
            
        Returns:
            List of error messages
        """
        errors = []
        
        valid_shot_types = ["wide", "medium", "close-up", "extreme-close-up"]
        valid_camera_movements = ["static", "pan", "tilt", "dolly", "crane"]
        
        if not shot.id:
            errors.append(f"Shot in sequence {sequence_id} missing id")
        
        if shot.number <= 0:
            errors.append(f"Shot {shot.id} has invalid number: {shot.number}")
        
        if shot.type not in valid_shot_types:
            errors.append(
                f"Shot {shot.id} has invalid type: {shot.type}, "
                f"must be one of {valid_shot_types}"
            )
        
        if shot.camera_movement not in valid_camera_movements:
            errors.append(
                f"Shot {shot.id} has invalid camera_movement: {shot.camera_movement}, "
                f"must be one of {valid_camera_movements}"
            )
        
        if shot.duration <= 0:
            errors.append(f"Shot {shot.id} has invalid duration: {shot.duration}")
        
        if not shot.description:
            errors.append(f"Shot {shot.id} missing description")
        
        if not shot.visual_style:
            errors.append(f"Shot {shot.id} missing visual_style")
        
        return errors
