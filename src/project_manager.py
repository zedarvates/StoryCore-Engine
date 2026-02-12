"""
Project initialization and management logic for StoryCore-Engine.
"""

from pathlib import Path
import json
from datetime import datetime
import hashlib
import logging
import shutil
import platform
import sys

# Configure logging
logger = logging.getLogger(__name__)

# Windows path length limit (including drive letter and separators)
WINDOWS_MAX_PATH_LENGTH = 260

# OS-specific invalid characters for file/directory names
# Windows has the most restrictive set, so we use that as the baseline
INVALID_FILENAME_CHARS = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0']

# Additional Windows reserved names that cannot be used as filenames
WINDOWS_RESERVED_NAMES = {
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
}


def validate_project_name(project_name: str, base_path: str = ".") -> tuple[bool, str]:
    """
    Validate project name for cross-platform compatibility.
    
    This function checks for:
    - Empty or whitespace-only names
    - Path traversal attempts (..)
    - OS-specific invalid characters
    - Windows reserved names
    - Path length limits (Windows 260 character limit)
    - Leading/trailing spaces or periods (problematic on Windows)
    
    Args:
        project_name: The proposed project name
        base_path: Base directory where project will be created
        
    Returns:
        Tuple of (is_valid, error_message)
        - is_valid: True if name is valid, False otherwise
        - error_message: Empty string if valid, descriptive error if invalid
    """
    # Check for empty or whitespace-only names
    if not project_name or not project_name.strip():
        return (False, "Project name cannot be empty or contain only whitespace")
    
    # Check for path traversal attempts
    if '..' in project_name:
        return (False, "Project name cannot contain '..' (parent directory reference)")
    
    # Check for absolute path indicators
    if project_name.startswith('/') or project_name.startswith('\\'):
        return (False, "Project name cannot start with path separators")
    
    # Check for drive letters (Windows absolute paths like C:)
    if len(project_name) >= 2 and project_name[1] == ':':
        return (False, "Project name cannot contain drive letters (e.g., 'C:')")
    
    # Check for invalid characters
    invalid_found = [char for char in INVALID_FILENAME_CHARS if char in project_name]
    if invalid_found:
        # Format null character for display
        display_chars = ['\\0' if c == '\0' else c for c in invalid_found]
        return (False, f"Project name contains invalid characters: {', '.join(display_chars)}")
    
    # Check for Windows reserved names (case-insensitive)
    name_upper = project_name.upper()
    # Check both the full name and name without extension
    name_without_ext = name_upper.split('.')[0] if '.' in name_upper else name_upper
    if name_upper in WINDOWS_RESERVED_NAMES or name_without_ext in WINDOWS_RESERVED_NAMES:
        return (False, f"Project name '{project_name}' is a reserved system name on Windows")
    
    # Check for leading/trailing spaces or periods (problematic on Windows)
    if project_name != project_name.strip():
        return (False, "Project name cannot have leading or trailing whitespace")
    
    if project_name.endswith('.'):
        return (False, "Project name cannot end with a period")
    
    # Check path length limits (Windows has the most restrictive limit)
    # Calculate the full path length that would be created
    try:
        base_path_obj = Path(base_path).resolve()
        full_project_path = base_path_obj / project_name
        
        # Add some buffer for subdirectories and files that will be created
        # (e.g., "assets/images/some_file.png")
        max_subpath_length = 50  # Reasonable estimate for deepest file path
        estimated_max_path = str(full_project_path / ("x" * max_subpath_length))
        
        # On Windows, check against the 260 character limit
        if platform.system() == 'Windows' and len(estimated_max_path) > WINDOWS_MAX_PATH_LENGTH:
            return (False, 
                    f"Project path would exceed Windows maximum path length of {WINDOWS_MAX_PATH_LENGTH} characters. "
                    f"Current path would be approximately {len(estimated_max_path)} characters. "
                    f"Please use a shorter project name or create the project in a directory with a shorter path.")
        
        # Even on non-Windows systems, extremely long paths can cause issues
        if len(estimated_max_path) > 4096:  # Most Unix systems support up to 4096
            return (False, f"Project path would be too long ({len(estimated_max_path)} characters). Please use a shorter name.")
            
    except Exception as e:
        # If we can't resolve the path, log it but don't fail validation
        logger.warning(f"Could not validate path length for project '{project_name}': {e}")
    
    # All checks passed
    return (True, "")



# Story file template for new projects
STORY_TEMPLATE = """# {project_name}

## Story Information

**Genre**: [Action, Adventure, Drama, etc.]
**Tone**: [Serious, Lighthearted, Dark, etc.]
**Length**: [Short, Medium, Long]

## Summary

[Write a brief summary of your story here - 2-3 sentences describing the main plot and characters]

## Main Content

### Chapter 1: Beginning

[Your story content begins here. The storyteller wizard will help you generate and refine this content.]

### Chapter 2: Development

[Continue your story here...]

### Chapter 3: Conclusion

[Conclude your story here...]

---

*This file is automatically read and updated by the StoryCore-Engine Storyteller Wizard.*
*You can also edit it manually using any text editor.*
"""


class ProjectManager:
    """Handles project initialization and management operations."""
    
    def __init__(self):
        self.schema_version = "1.0"
        self.default_capabilities = {
            "grid": True,
            "promote": True,
            "refine": True,
            "compare": True,
            "qa": True,
            "export": True,
            "dashboard": True,
            "narrative": True,
            "video_plan": True,
            "auto_fix": False,
            "continuity_validation": True,
            "audio_mixing": True,
            "quality_validation": True
        }
        self.default_generation_status = {
            "grid": "pending",
            "promote": "pending",
            "refine": "pending",
            "compare": "pending",
            "qa": "pending",
            "export": "pending",
            "dashboard": "pending",
            "narrative": "pending",
            "video_plan": "pending",
            "continuity_validation": "pending",
            "audio_mixing": "pending",
            "quality_validation": "pending"
        }
    
    def init_project(self, project_name: str, base_path: str = ".") -> dict:
        """
        Initialize a new StoryCore-Engine project with complete structure.
        
        Args:
            project_name: Name for the new project
            base_path: Base directory for project creation
            
        Returns:
            Dictionary with status and any error messages:
            {
                "success": bool,
                "project_path": str,
                "errors": list[str],
                "warnings": list[str],
                "created_files": list[str],
                "created_directories": list[str]
            }
            
        Raises:
            ValueError: If project_name is invalid
        """
        errors = []
        warnings = []
        created_files = []
        created_directories = []
        project_path = Path(base_path) / project_name
        
        logger.info(f"Starting project initialization: {project_name}")
        
        try:
            # Validate project name using the comprehensive validation function
            is_valid, error_message = validate_project_name(project_name, base_path)
            if not is_valid:
                raise ValueError(error_message)
            
            logger.info(f"Project name validated: {project_name}")
            
            # Create project directory
            logger.info(f"Creating project directory: {project_path}")
            project_path.mkdir(exist_ok=True)
            created_directories.append(str(project_path))
            
            # Create folder structure
            assets_path = project_path / "assets"
            images_path = assets_path / "images"
            audio_path = assets_path / "audio"
            story_path = project_path / "story"  # LLM-optimized story directory
            
            logger.info(f"Creating assets directory structure")
            images_path.mkdir(parents=True, exist_ok=True)
            created_directories.extend([str(assets_path), str(images_path)])
            
            audio_path.mkdir(parents=True, exist_ok=True)
            created_directories.append(str(audio_path))
            
            # Create story directory for LLM-optimized story files
            logger.info(f"Creating story directory structure")
            story_path.mkdir(parents=True, exist_ok=True)
            created_directories.append(str(story_path))
            
            # Generate deterministic seed from project name
            seed = self._generate_seed(project_name)
            logger.info(f"Generated project seed: {seed}")
            
            # Create project.json
            logger.info("Creating project.json")
            self._create_project_json(project_path, project_name, seed)
            created_files.append(str(project_path / "project.json"))
            
            # Create storyboard.json with 1 scene, 3 shots
            logger.info("Creating storyboard.json")
            self._create_storyboard_json(project_path, project_name)
            created_files.append(str(project_path / "storyboard.json"))
            
            # Create story.md file
            logger.info("Creating story.md")
            self.create_story_file(project_path, project_name)
            created_files.append(str(project_path / "story.md"))
            
            # Validate project structure
            logger.info("Validating project structure")
            is_valid, missing_items = self.validate_project_structure(project_path)
            
            if not is_valid:
                error_msg = f"Project structure validation failed. Missing items: {', '.join(missing_items)}"
                logger.error(error_msg)
                errors.append(error_msg)
                # Cleanup on validation failure
                self.cleanup_on_failure(project_path)
                return {
                    "success": False,
                    "project_path": str(project_path),
                    "errors": errors,
                    "warnings": warnings,
                    "created_files": [],
                    "created_directories": []
                }
            
            logger.info(f"Project initialization completed successfully: {project_name}")
            return {
                "success": True,
                "project_path": str(project_path),
                "errors": errors,
                "warnings": warnings,
                "created_files": created_files,
                "created_directories": created_directories
            }
            
        except ValueError as e:
            error_msg = f"Validation error: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
            return {
                "success": False,
                "project_path": str(project_path),
                "errors": errors,
                "warnings": warnings,
                "created_files": [],
                "created_directories": []
            }
            
        except PermissionError as e:
            error_msg = f"Permission denied: Unable to create project at '{project_path}'. {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
            # Attempt cleanup
            self.cleanup_on_failure(project_path)
            return {
                "success": False,
                "project_path": str(project_path),
                "errors": errors,
                "warnings": warnings,
                "created_files": [],
                "created_directories": []
            }
            
        except OSError as e:
            error_msg = f"File system error: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
            # Attempt cleanup
            self.cleanup_on_failure(project_path)
            return {
                "success": False,
                "project_path": str(project_path),
                "errors": errors,
                "warnings": warnings,
                "created_files": [],
                "created_directories": []
            }
            
        except Exception as e:
            error_msg = f"Unexpected error during project initialization: {str(e)}"
            logger.error(error_msg, exc_info=True)
            errors.append(error_msg)
            # Attempt cleanup
            self.cleanup_on_failure(project_path)
            return {
                "success": False,
                "project_path": str(project_path),
                "errors": errors,
                "warnings": warnings,
                "created_files": [],
                "created_directories": []
            }
    
    def create_story_file(self, project_path: Path, project_name: str) -> None:
        """
        Create story.md file with default template.
        
        Args:
            project_path: Path to project directory
            project_name: Name of the project
            
        Raises:
            IOError: If file creation fails
        """
        logger.debug(f"Generating story file content for project: {project_name}")
        story_content = STORY_TEMPLATE.format(project_name=project_name)
        story_file_path = project_path / "story.md"
        
        logger.debug(f"Writing story file to: {story_file_path}")
        with open(story_file_path, "w", encoding="utf-8") as f:
            f.write(story_content)
        logger.debug(f"Story file created successfully: {story_file_path}")
    
    def _generate_seed(self, project_name: str) -> int:
        """Generate deterministic seed from project name."""
        hash_obj = hashlib.md5(project_name.encode())
        return int(hash_obj.hexdigest()[:8], 16) % (2**31)
    
    def ensure_schema_compliance(self, project_data: dict) -> dict:
        """Ensure project data complies with schema v1, adding missing fields."""
        # Ensure schema_version
        if "schema_version" not in project_data:
            project_data["schema_version"] = self.schema_version
        
        # Ensure capabilities
        if "capabilities" not in project_data:
            project_data["capabilities"] = self.default_capabilities.copy()
        else:
            # Fill missing capabilities
            for cap, default_val in self.default_capabilities.items():
                if cap not in project_data["capabilities"]:
                    project_data["capabilities"][cap] = default_val
        
        # Ensure generation_status
        if "generation_status" not in project_data:
            project_data["generation_status"] = self.default_generation_status.copy()
        else:
            # Fill missing status entries
            for status, default_val in self.default_generation_status.items():
                if status not in project_data["generation_status"]:
                    project_data["generation_status"][status] = default_val

        # Ensure quality_validation structure
        if "quality_validation" not in project_data:
            project_data["quality_validation"] = {
                "enabled": True,
                "last_validation_timestamp": None,
                "overall_quality_score": None,
                "validation_pass": None,
                "audio_mixing_status": "pending",
                "quality_scores": [],
                "detected_issues": [],
                "improvement_suggestions": [],
                "autofix_enabled": True,
                "autofix_logs": [],
                "quality_reports": [],
                "validation_mode": "batch",
                "quality_standard": "web_hd",
                "continuity_results": [],
                "audio_quality_metrics": {
                    "voice_clarity_score": None,
                    "metallic_artifacts_detected": None,
                    "audio_gaps_filled": None
                },
                "video_quality_metrics": {
                    "sharpness_score": None,
                    "motion_smoothness_score": None,
                    "noise_level_score": None,
                    "visual_anomalies_count": None
                },
                "report_timestamps": []
            }
        else:
            # Validate and fill quality_validation fields
            qv = project_data["quality_validation"]
            if "enabled" not in qv:
                qv["enabled"] = True
            if "autofix_enabled" not in qv:
                qv["autofix_enabled"] = True
            if "validation_mode" not in qv:
                qv["validation_mode"] = "batch"
            if "quality_standard" not in qv:
                qv["quality_standard"] = "web_hd"
            if "audio_quality_metrics" not in qv:
                qv["audio_quality_metrics"] = {
                    "voice_clarity_score": None,
                    "metallic_artifacts_detected": None,
                    "audio_gaps_filled": None
                }
            if "video_quality_metrics" not in qv:
                qv["video_quality_metrics"] = {
                    "sharpness_score": None,
                    "motion_smoothness_score": None,
                    "noise_level_score": None,
                    "visual_anomalies_count": None
                }
            # Ensure lists exist
            for list_field in ["quality_scores", "detected_issues", "improvement_suggestions", "autofix_logs", "quality_reports", "continuity_results", "report_timestamps"]:
                if list_field not in qv:
                    qv[list_field] = []

        return project_data
    
    def _create_project_json(self, project_path: Path, project_name: str, seed: int) -> None:
        """Create project.json with all required fields."""
        logger.debug(f"Generating project.json for project: {project_name} with seed: {seed}")
        now = datetime.utcnow().isoformat() + "Z"
        
        project_data = {
            "schema_version": self.schema_version,
            "project_id": f"storycore_{project_name}",
            "created_at": now,
            "updated_at": now,
            "capabilities": self.default_capabilities.copy(),
            "generation_status": self.default_generation_status.copy(),
            "config": {
                "hackathon_mode": True,
                "global_seed": seed,
                "target_aspect_ratio": "16:9",
                "target_resolution": "1920x1080",
                "target_duration_seconds": 18,
                "time_budget_seconds": 300
            },
            "coherence_anchors": {
                "style_anchor_id": "STYLE_CINE_REALISM_V1",
                "palette_id": "PALETTE_SUNSET_01",
                "character_sheet_ids": ["CHAR_DEFAULT_V1"],
                "lighting_direction": "right",
                "lighting_temperature": "warm",
                "perspective_type": "2-point",
                "horizon_line": "mid"
            },
            "shots_index": {
                "shot_01": {"active_version": "v1", "status": "placeholder"},
                "shot_02": {"active_version": "v1", "status": "placeholder"},
                "shot_03": {"active_version": "v1", "status": "placeholder"}
            },
            "asset_manifest": {},
            "status": {
                "current_phase": "initialization",
                "qa_passed": False
            },
            "quality_validation": {
                "enabled": True,
                "last_validation_timestamp": None,
                "overall_quality_score": None,
                "validation_pass": None,
                "audio_mixing_status": "pending",
                "quality_scores": [],
                "detected_issues": [],
                "improvement_suggestions": [],
                "autofix_enabled": True,
                "autofix_logs": [],
                "quality_reports": [],
                "validation_mode": "batch",
                "quality_standard": "web_hd",
                "continuity_results": [],
                "audio_quality_metrics": {
                    "voice_clarity_score": None,
                    "metallic_artifacts_detected": None,
                    "audio_gaps_filled": None
                },
                "video_quality_metrics": {
                    "sharpness_score": None,
                    "motion_smoothness_score": None,
                    "noise_level_score": None,
                    "visual_anomalies_count": None
                },
                "report_timestamps": []
            }
        }
        
        project_json_path = project_path / "project.json"
        logger.debug(f"Writing project.json to: {project_json_path}")
        with open(project_json_path, "w", encoding="utf-8") as f:
            json.dump(project_data, f, indent=2)
        logger.debug(f"project.json created successfully")
    
    def _create_storyboard_json(self, project_path: Path, project_name: str) -> None:
        """Create storyboard.json with 1 scene and 3 shot placeholders."""
        logger.debug(f"Generating storyboard.json for project: {project_name}")
        storyboard_data = {
            "storyboard_id": f"sb_{project_name}",
            "project_id": f"storycore_{project_name}",
            "shots": [
                self._create_shot_placeholder("shot_01", "scene_01", 1, "Opening shot", "Establishing shot to set the scene", 6),
                self._create_shot_placeholder("shot_02", "scene_01", 2, "Medium shot", "Focus on main subject or action", 6),
                self._create_shot_placeholder("shot_03", "scene_01", 3, "Closing shot", "Concluding shot to wrap the scene", 6)
            ]
        }
        
        storyboard_json_path = project_path / "storyboard.json"
        logger.debug(f"Writing storyboard.json to: {storyboard_json_path}")
        with open(storyboard_json_path, "w", encoding="utf-8") as f:
            json.dump(storyboard_data, f, indent=2)
        logger.debug(f"storyboard.json created successfully")
    
    def _create_shot_placeholder(self, shot_id: str, scene_id: str, shot_number: int, 
                                title: str, description: str, duration: int) -> dict:
        """Create a placeholder shot with all required fields."""
        return {
            "shot_id": shot_id,
            "scene_id": scene_id,
            "shot_number": shot_number,
            "version": "v1",
            "title": title,
            "description": description,
            "duration_seconds": duration,
            "prompt_modules": {
                "subject": f"Placeholder subject for {shot_id}",
                "camera": "Medium shot, eye level, static",
                "lighting": "Natural lighting, soft shadows",
                "color": "Neutral palette, balanced colors",
                "style": "Cinematic realism, professional quality",
                "technical": {
                    "seed": 42,
                    "aspect_ratio": "16:9",
                    "resolution": "1920x1080",
                    "cfg_scale": 7.5,
                    "steps": 30,
                    "negative_prompt": "low quality, blurry, distorted"
                }
            }
        }

    def generate_panel_seed(self, global_seed: int, panel_id: str) -> int:
        """Generate deterministic panel seed from global seed and panel ID."""
        panel_hash = hash(panel_id.encode('utf-8')) % 1000000
        return (global_seed + panel_hash) % 2147483647
    
    def validate_project_structure(self, project_path: Path) -> tuple[bool, list[str]]:
        """
        Validate that all required project structure exists.
        
        Args:
            project_path: Path to project directory
            
        Returns:
            Tuple of (is_valid, list_of_missing_items)
            - is_valid: True if all required structure exists, False otherwise
            - list_of_missing_items: List of missing directories and files
        """
        logger.debug(f"Validating project structure at: {project_path}")
        missing_items = []
        
        # Check required directories
        required_dirs = [
            project_path,
            project_path / "assets",
            project_path / "assets" / "images",
            project_path / "assets" / "audio"
        ]
        
        logger.debug(f"Checking {len(required_dirs)} required directories")
        for dir_path in required_dirs:
            if not dir_path.exists():
                logger.warning(f"Missing directory: {dir_path}")
                missing_items.append(f"Directory: {dir_path}")
            elif not dir_path.is_dir():
                logger.warning(f"Path exists but is not a directory: {dir_path}")
                missing_items.append(f"Not a directory: {dir_path}")
            else:
                logger.debug(f"Directory exists: {dir_path}")
        
        # Check required files
        required_files = [
            project_path / "project.json",
            project_path / "storyboard.json",
            project_path / "story.md"
        ]
        
        logger.debug(f"Checking {len(required_files)} required files")
        for file_path in required_files:
            if not file_path.exists():
                logger.warning(f"Missing file: {file_path}")
                missing_items.append(f"File: {file_path}")
            elif not file_path.is_file():
                logger.warning(f"Path exists but is not a file: {file_path}")
                missing_items.append(f"Not a file: {file_path}")
            else:
                logger.debug(f"File exists: {file_path}")
        
        is_valid = len(missing_items) == 0
        if is_valid:
            logger.info(f"Project structure validation passed: {project_path}")
        else:
            logger.warning(f"Project structure validation failed: {len(missing_items)} items missing")
        
        return (is_valid, missing_items)
    
    def cleanup_on_failure(self, project_path: Path) -> None:
        """
        Clean up partially created project on initialization failure.
        
        This method removes the project directory and all its contents if the
        project initialization fails. It handles errors gracefully and logs
        cleanup actions for debugging.
        
        Args:
            project_path: Path to project directory to clean up
        """
        if not project_path.exists():
            logger.info(f"Cleanup: Project path does not exist, nothing to clean: {project_path}")
            return
        
        try:
            logger.info(f"Starting cleanup of failed project: {project_path}")
            
            # Check if this is a project directory (has project.json or is empty)
            # This prevents accidentally deleting non-project directories
            project_json = project_path / "project.json"
            
            # Only cleanup if:
            # 1. Directory is empty, OR
            # 2. Directory contains project.json (indicating it's a StoryCore project)
            dir_contents = list(project_path.iterdir())
            is_empty = len(dir_contents) == 0
            has_project_json = project_json.exists()
            
            if not is_empty and not has_project_json:
                logger.warning(
                    f"Cleanup aborted: Directory exists but doesn't appear to be a StoryCore project: {project_path}"
                )
                return
            
            # Remove the entire project directory tree
            shutil.rmtree(project_path)
            logger.info(f"Cleanup completed: Removed project directory: {project_path}")
            
        except PermissionError as e:
            logger.error(f"Cleanup failed: Permission denied when removing {project_path}: {str(e)}")
        except OSError as e:
            logger.error(f"Cleanup failed: OS error when removing {project_path}: {str(e)}")
        except Exception as e:
            logger.error(f"Cleanup failed: Unexpected error when removing {project_path}: {str(e)}", exc_info=True)
