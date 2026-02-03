"""
Project management operations for StoryCore AI Assistant.

Handles opening, closing, loading, and saving StoryCore projects with
Data Contract v1 validation and state management.
"""

from pathlib import Path
from datetime import datetime
from typing import Optional, List
import json

from .models import (
    Project, ProjectMetadata, Scene, Character, Sequence, Shot
)
from .file_operations import FileOperationsManager
from .validator import DataContractValidator
from .exceptions import (
    ResourceError, ValidationError, ProjectError, ConfirmationRequiredError
)
from .logging_config import get_logger

logger = get_logger(__name__)


class ProjectManager:
    """
    Manages StoryCore project operations.
    
    Handles project lifecycle including opening, closing, loading, and saving
    projects with full Data Contract v1 validation.
    """
    
    def __init__(self, file_ops: FileOperationsManager, validator: DataContractValidator):
        """
        Initialize project manager.
        
        Args:
            file_ops: File operations manager for secure file access
            validator: Data Contract validator for project validation
        """
        self.file_ops = file_ops
        self.validator = validator
        self.active_project: Optional[Project] = None
        
        logger.info("ProjectManager initialized")
    
    def list_projects(self) -> List[str]:
        """
        List all available projects in the project directory.
        
        Returns:
            List of project names
        """
        try:
            # Find all project.json files
            project_files = self.file_ops.list_files("*/project.json", recursive=True)
            
            # Extract project names from directory names
            project_names = []
            for project_file in project_files:
                # Get parent directory name as project name
                project_name = project_file.parent.name
                project_names.append(project_name)
            
            logger.info(f"Found {len(project_names)} projects")
            return sorted(project_names)
        
        except Exception as e:
            logger.error(f"Error listing projects: {e}")
            raise ResourceError(
                message=f"Failed to list projects: {str(e)}",
                code="PROJECT_LIST_ERROR",
                details={"error": str(e)},
                suggested_action="Check project directory permissions"
            )
    
    def open_project(self, project_name: str) -> Project:
        """
        Open an existing project by name.
        
        Locates the project, loads all files, validates Data Contract compliance,
        and sets it as the active project.
        
        Args:
            project_name: Name of the project to open
            
        Returns:
            Loaded Project object
            
        Raises:
            ResourceError: If project not found
            ValidationError: If project fails Data Contract validation
            ProjectError: If project is corrupted or invalid
        """
        logger.info(f"Opening project: {project_name}")
        
        # Locate project directory
        project_path = self.file_ops.project_directory / project_name
        
        if not project_path.exists():
            available_projects = self.list_projects()
            logger.error(f"Project not found: {project_name}")
            raise ResourceError(
                message=f"Project not found: {project_name}",
                code="PROJECT_NOT_FOUND",
                details={
                    "project_name": project_name,
                    "available_projects": available_projects
                },
                suggested_action=f"Available projects: {', '.join(available_projects) if available_projects else 'none'}"
            )
        
        # Load project.json
        project_json_path = project_path / "project.json"
        
        if not project_json_path.exists():
            logger.error(f"Project metadata not found: {project_json_path}")
            raise ProjectError(
                message=f"Project metadata file not found: project.json",
                code="PROJECT_METADATA_MISSING",
                details={"project_name": project_name, "path": str(project_path)},
                suggested_action="Project may be corrupted. Check project directory structure."
            )
        
        try:
            # Load and parse project metadata
            project_data = self.file_ops.read_json(project_json_path)
            
            # Validate Data Contract compliance
            validation_result = self.validator.validate_project_data(project_data)
            
            if not validation_result.valid:
                logger.error(f"Project validation failed: {validation_result.errors}")
                raise ValidationError(
                    message="Project fails Data Contract v1 validation",
                    code="PROJECT_VALIDATION_FAILED",
                    details={
                        "project_name": project_name,
                        "errors": validation_result.errors,
                        "warnings": validation_result.warnings
                    },
                    suggested_action="Fix validation errors and try again"
                )
            
            # Load project metadata
            metadata = ProjectMetadata(
                schema_version=project_data.get("schema_version", "1.0"),
                project_name=project_data.get("project_name", project_name),
                capabilities=project_data.get("capabilities", {}),
                generation_status=project_data.get("generation_status", {})
            )
            
            # Load scenes
            scenes = self._load_scenes(project_path, project_data)
            
            # Load characters
            characters = self._load_characters(project_path, project_data)
            
            # Load sequences
            sequences = self._load_sequences(project_path, project_data)
            
            # Create Project object
            project = Project(
                name=project_name,
                path=project_path,
                metadata=metadata,
                scenes=scenes,
                characters=characters,
                sequences=sequences,
                created_at=datetime.fromisoformat(project_data.get("created_at", datetime.now().isoformat())),
                modified_at=datetime.fromisoformat(project_data.get("modified_at", datetime.now().isoformat()))
            )
            
            # Set as active project
            self.active_project = project
            
            logger.info(f"Successfully opened project: {project_name}")
            logger.info(f"  Scenes: {len(scenes)}, Characters: {len(characters)}, Sequences: {len(sequences)}")
            
            return project
        
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error loading project {project_name}: {e}")
            raise ProjectError(
                message=f"Failed to load project: {str(e)}",
                code="PROJECT_LOAD_ERROR",
                details={"project_name": project_name, "error": str(e)},
                suggested_action="Project may be corrupted. Check project files."
            )
    
    def _load_scenes(self, project_path: Path, project_data: dict) -> List[Scene]:
        """
        Load scenes from project data.
        
        Args:
            project_path: Path to project directory
            project_data: Project metadata dictionary
            
        Returns:
            List of Scene objects
        """
        scenes = []
        scenes_data = project_data.get("scenes", [])
        
        for scene_data in scenes_data:
            scene = Scene(
                id=scene_data.get("id", ""),
                number=scene_data.get("number", 0),
                title=scene_data.get("title", ""),
                description=scene_data.get("description", ""),
                location=scene_data.get("location", ""),
                time_of_day=scene_data.get("time_of_day", ""),
                duration=scene_data.get("duration", 0.0),
                characters=scene_data.get("characters", []),
                key_actions=scene_data.get("key_actions", []),
                visual_notes=scene_data.get("visual_notes")
            )
            scenes.append(scene)
        
        logger.debug(f"Loaded {len(scenes)} scenes")
        return scenes
    
    def _load_characters(self, project_path: Path, project_data: dict) -> List[Character]:
        """
        Load characters from project data.
        
        Args:
            project_path: Path to project directory
            project_data: Project metadata dictionary
            
        Returns:
            List of Character objects
        """
        characters = []
        characters_data = project_data.get("characters", [])
        
        for char_data in characters_data:
            character = Character(
                id=char_data.get("id", ""),
                name=char_data.get("name", ""),
                role=char_data.get("role", ""),
                description=char_data.get("description", ""),
                appearance=char_data.get("appearance", ""),
                personality=char_data.get("personality", ""),
                visual_reference=char_data.get("visual_reference")
            )
            characters.append(character)
        
        logger.debug(f"Loaded {len(characters)} characters")
        return characters
    
    def _load_sequences(self, project_path: Path, project_data: dict) -> List[Sequence]:
        """
        Load sequences from project data.
        
        Args:
            project_path: Path to project directory
            project_data: Project metadata dictionary
            
        Returns:
            List of Sequence objects
        """
        sequences = []
        sequences_data = project_data.get("sequences", [])
        
        for seq_data in sequences_data:
            # Load shots
            shots = []
            for shot_data in seq_data.get("shots", []):
                shot = Shot(
                    id=shot_data.get("id", ""),
                    number=shot_data.get("number", 0),
                    type=shot_data.get("type", ""),
                    camera_movement=shot_data.get("camera_movement", ""),
                    duration=shot_data.get("duration", 0.0),
                    description=shot_data.get("description", ""),
                    visual_style=shot_data.get("visual_style", "")
                )
                shots.append(shot)
            
            sequence = Sequence(
                id=seq_data.get("id", ""),
                scene_id=seq_data.get("scene_id", ""),
                shots=shots,
                total_duration=seq_data.get("total_duration", 0.0)
            )
            sequences.append(sequence)
        
        logger.debug(f"Loaded {len(sequences)} sequences")
        return sequences
    
    def close_project(self, save: bool = True) -> None:
        """
        Close the active project.
        
        Saves all pending changes, updates metadata timestamp, creates backup,
        and clears the active project context.
        
        Args:
            save: Whether to save changes before closing (default: True)
            
        Raises:
            ProjectError: If save fails
        """
        if not self.active_project:
            logger.warning("Attempted to close project but no project is active")
            return  # Idempotent - no error if no active project
        
        project_name = self.active_project.name
        logger.info(f"Closing project: {project_name}")
        
        try:
            if save:
                # Update modified timestamp
                self.active_project.modified_at = datetime.now()
                
                # Save project
                self.save_project(self.active_project)
                
                # Create backup
                self._create_backup(self.active_project)
            
            # Clear active project
            self.active_project = None
            
            logger.info(f"Successfully closed project: {project_name}")
        
        except Exception as e:
            logger.error(f"Error closing project {project_name}: {e}")
            raise ProjectError(
                message=f"Failed to close project: {str(e)}",
                code="PROJECT_CLOSE_ERROR",
                details={"project_name": project_name, "error": str(e)},
                suggested_action="Check disk space and permissions"
            )
    
    def save_project(self, project: Project) -> None:
        """
        Save project to disk.
        
        Validates Data Contract compliance before saving.
        
        Args:
            project: Project to save
            
        Raises:
            ValidationError: If project fails validation
            ResourceError: If save fails
        """
        logger.info(f"Saving project: {project.name}")
        
        try:
            # Convert project to dictionary
            project_data = self._project_to_dict(project)
            
            # Validate before saving
            validation_result = self.validator.validate_project_data(project_data)
            
            if not validation_result.valid:
                logger.error(f"Project validation failed before save: {validation_result.errors}")
                raise ValidationError(
                    message="Project fails Data Contract v1 validation",
                    code="PROJECT_VALIDATION_FAILED",
                    details={
                        "project_name": project.name,
                        "errors": validation_result.errors,
                        "warnings": validation_result.warnings
                    },
                    suggested_action="Fix validation errors before saving"
                )
            
            # Save project.json
            project_json_path = project.path / "project.json"
            self.file_ops.write_json(project_json_path, project_data)
            
            logger.info(f"Successfully saved project: {project.name}")
        
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error saving project {project.name}: {e}")
            raise ResourceError(
                message=f"Failed to save project: {str(e)}",
                code="PROJECT_SAVE_ERROR",
                details={"project_name": project.name, "error": str(e)},
                suggested_action="Check disk space and permissions"
            )
    
    def _project_to_dict(self, project: Project) -> dict:
        """
        Convert Project object to dictionary for serialization.
        
        Args:
            project: Project to convert
            
        Returns:
            Project data as dictionary
        """
        return {
            "schema_version": project.metadata.schema_version,
            "project_name": project.metadata.project_name,
            "capabilities": project.metadata.capabilities,
            "generation_status": project.metadata.generation_status,
            "created_at": project.created_at.isoformat(),
            "modified_at": project.modified_at.isoformat(),
            "scenes": [
                {
                    "id": scene.id,
                    "number": scene.number,
                    "title": scene.title,
                    "description": scene.description,
                    "location": scene.location,
                    "time_of_day": scene.time_of_day,
                    "duration": scene.duration,
                    "characters": scene.characters,
                    "key_actions": scene.key_actions,
                    "visual_notes": scene.visual_notes
                }
                for scene in project.scenes
            ],
            "characters": [
                {
                    "id": char.id,
                    "name": char.name,
                    "role": char.role,
                    "description": char.description,
                    "appearance": char.appearance,
                    "personality": char.personality,
                    "visual_reference": char.visual_reference
                }
                for char in project.characters
            ],
            "sequences": [
                {
                    "id": seq.id,
                    "scene_id": seq.scene_id,
                    "total_duration": seq.total_duration,
                    "shots": [
                        {
                            "id": shot.id,
                            "number": shot.number,
                            "type": shot.type,
                            "camera_movement": shot.camera_movement,
                            "duration": shot.duration,
                            "description": shot.description,
                            "visual_style": shot.visual_style
                        }
                        for shot in seq.shots
                    ]
                }
                for seq in project.sequences
            ]
        }
    
    def _create_backup(self, project: Project) -> None:
        """
        Create a backup of the project.
        
        Args:
            project: Project to backup
        """
        try:
            # Create backups directory
            backup_dir = project.path / ".backups"
            backup_dir.mkdir(exist_ok=True)
            
            # Create timestamped backup filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"backup_{timestamp}.json"
            backup_path = backup_dir / backup_filename
            
            # Convert project to dict and save
            project_data = self._project_to_dict(project)
            self.file_ops.write_json(backup_path, project_data)
            
            logger.info(f"Created backup: {backup_path}")
        
        except Exception as e:
            # Log error but don't fail the close operation
            logger.error(f"Failed to create backup for {project.name}: {e}")
    
    def get_active_project(self) -> Optional[Project]:
        """
        Get the currently active project.
        
        Returns:
            Active Project or None if no project is active
        """
        return self.active_project
    
    def has_active_project(self) -> bool:
        """
        Check if there is an active project.
        
        Returns:
            True if a project is active
        """
        return self.active_project is not None
    
    def modify_scene(self, scene_id: str, updates: dict) -> Scene:
        """
        Modify a scene in the active project.
        
        Args:
            scene_id: ID of the scene to modify
            updates: Dictionary of fields to update
            
        Returns:
            Modified Scene object
            
        Raises:
            ProjectError: If no project is active or scene not found
            ValidationError: If modifications violate Data Contract
        """
        if not self.active_project:
            raise ProjectError(
                message="No active project to modify",
                code="NO_ACTIVE_PROJECT",
                details={},
                suggested_action="Open a project first"
            )
        
        # Find scene
        scene = None
        for s in self.active_project.scenes:
            if s.id == scene_id:
                scene = s
                break
        
        if not scene:
            raise ProjectError(
                message=f"Scene not found: {scene_id}",
                code="SCENE_NOT_FOUND",
                details={"scene_id": scene_id},
                suggested_action="Check scene ID and try again"
            )
        
        # Apply updates
        for key, value in updates.items():
            if hasattr(scene, key):
                setattr(scene, key, value)
            else:
                logger.warning(f"Ignoring unknown scene field: {key}")
        
        # Validate project after modification
        validation_result = self.validator.validate_project(self.active_project)
        if not validation_result.valid:
            raise ValidationError(
                message="Scene modification violates Data Contract",
                code="MODIFICATION_VALIDATION_FAILED",
                details={
                    "scene_id": scene_id,
                    "errors": validation_result.errors
                },
                suggested_action="Fix validation errors and try again"
            )
        
        # Update modified timestamp
        self.active_project.modified_at = datetime.now()
        
        logger.info(f"Modified scene {scene_id} in project {self.active_project.name}")
        return scene
    
    def modify_character(self, character_id: str, updates: dict) -> Character:
        """
        Modify a character in the active project.
        
        Args:
            character_id: ID of the character to modify
            updates: Dictionary of fields to update
            
        Returns:
            Modified Character object
            
        Raises:
            ProjectError: If no project is active or character not found
            ValidationError: If modifications violate Data Contract
        """
        if not self.active_project:
            raise ProjectError(
                message="No active project to modify",
                code="NO_ACTIVE_PROJECT",
                details={},
                suggested_action="Open a project first"
            )
        
        # Find character
        character = None
        for c in self.active_project.characters:
            if c.id == character_id:
                character = c
                break
        
        if not character:
            raise ProjectError(
                message=f"Character not found: {character_id}",
                code="CHARACTER_NOT_FOUND",
                details={"character_id": character_id},
                suggested_action="Check character ID and try again"
            )
        
        # Apply updates
        for key, value in updates.items():
            if hasattr(character, key):
                setattr(character, key, value)
            else:
                logger.warning(f"Ignoring unknown character field: {key}")
        
        # Validate project after modification
        validation_result = self.validator.validate_project(self.active_project)
        if not validation_result.valid:
            raise ValidationError(
                message="Character modification violates Data Contract",
                code="MODIFICATION_VALIDATION_FAILED",
                details={
                    "character_id": character_id,
                    "errors": validation_result.errors
                },
                suggested_action="Fix validation errors and try again"
            )
        
        # Update modified timestamp
        self.active_project.modified_at = datetime.now()
        
        logger.info(f"Modified character {character_id} in project {self.active_project.name}")
        return character
    
    def modify_sequence(self, sequence_id: str, updates: dict) -> Sequence:
        """
        Modify a sequence in the active project.
        
        Args:
            sequence_id: ID of the sequence to modify
            updates: Dictionary of fields to update
            
        Returns:
            Modified Sequence object
            
        Raises:
            ProjectError: If no project is active or sequence not found
            ValidationError: If modifications violate Data Contract
        """
        if not self.active_project:
            raise ProjectError(
                message="No active project to modify",
                code="NO_ACTIVE_PROJECT",
                details={},
                suggested_action="Open a project first"
            )
        
        # Find sequence
        sequence = None
        for seq in self.active_project.sequences:
            if seq.id == sequence_id:
                sequence = seq
                break
        
        if not sequence:
            raise ProjectError(
                message=f"Sequence not found: {sequence_id}",
                code="SEQUENCE_NOT_FOUND",
                details={"sequence_id": sequence_id},
                suggested_action="Check sequence ID and try again"
            )
        
        # Apply updates
        for key, value in updates.items():
            if hasattr(sequence, key):
                setattr(sequence, key, value)
            else:
                logger.warning(f"Ignoring unknown sequence field: {key}")
        
        # Validate project after modification
        validation_result = self.validator.validate_project(self.active_project)
        if not validation_result.valid:
            raise ValidationError(
                message="Sequence modification violates Data Contract",
                code="MODIFICATION_VALIDATION_FAILED",
                details={
                    "sequence_id": sequence_id,
                    "errors": validation_result.errors
                },
                suggested_action="Fix validation errors and try again"
            )
        
        # Update modified timestamp
        self.active_project.modified_at = datetime.now()
        
        logger.info(f"Modified sequence {sequence_id} in project {self.active_project.name}")
        return sequence
    
    def add_scene(self, scene: Scene) -> Scene:
        """
        Add a new scene to the active project.
        
        Args:
            scene: Scene object to add
            
        Returns:
            Added Scene object
            
        Raises:
            ProjectError: If no project is active
            ValidationError: If scene violates Data Contract
        """
        if not self.active_project:
            raise ProjectError(
                message="No active project to modify",
                code="NO_ACTIVE_PROJECT",
                details={},
                suggested_action="Open a project first"
            )
        
        # Add scene
        self.active_project.scenes.append(scene)
        
        # Validate project after addition
        validation_result = self.validator.validate_project(self.active_project)
        if not validation_result.valid:
            # Rollback
            self.active_project.scenes.remove(scene)
            raise ValidationError(
                message="Scene addition violates Data Contract",
                code="ADDITION_VALIDATION_FAILED",
                details={
                    "scene_id": scene.id,
                    "errors": validation_result.errors
                },
                suggested_action="Fix validation errors and try again"
            )
        
        # Update modified timestamp
        self.active_project.modified_at = datetime.now()
        
        logger.info(f"Added scene {scene.id} to project {self.active_project.name}")
        return scene
    
    def remove_scene(self, scene_id: str, confirmed: bool = False) -> bool:
        """
        Remove a scene from the active project.
        
        Args:
            scene_id: ID of the scene to remove
            confirmed: Whether deletion has been confirmed
            
        Returns:
            True if scene was removed
            
        Raises:
            ProjectError: If no project is active or scene not found
            ConfirmationRequiredError: If deletion not confirmed
        """
        if not self.active_project:
            raise ProjectError(
                message="No active project to modify",
                code="NO_ACTIVE_PROJECT",
                details={},
                suggested_action="Open a project first"
            )
        
        # Find scene
        scene = None
        for s in self.active_project.scenes:
            if s.id == scene_id:
                scene = s
                break
        
        if not scene:
            raise ProjectError(
                message=f"Scene not found: {scene_id}",
                code="SCENE_NOT_FOUND",
                details={"scene_id": scene_id},
                suggested_action="Check scene ID and try again"
            )
        
        # Require confirmation
        if not confirmed:
            raise ConfirmationRequiredError(
                message=f"Scene deletion requires confirmation: {scene_id}",
                file_path=scene_id,
                file_size=None
            )
        
        # Remove scene
        self.active_project.scenes.remove(scene)
        
        # Update modified timestamp
        self.active_project.modified_at = datetime.now()
        
        logger.info(f"Removed scene {scene_id} from project {self.active_project.name}")
        return True
