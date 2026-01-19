"""
Project utilities for loading, validation, and management.
Shared functionality for project operations across handlers.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

from ..errors import UserError, SystemError, ConfigurationError


logger = logging.getLogger(__name__)


def load_project_config(project_path: str) -> Dict[str, Any]:
    """Load and validate project configuration from project.json."""
    project_dir = Path(project_path)
    project_file = project_dir / "project.json"
    
    if not project_dir.exists():
        raise UserError(
            f"Project directory not found: {project_dir}",
            "Check the project path or create a new project with 'storycore init'"
        )
    
    if not project_file.exists():
        raise UserError(
            f"Project file not found: {project_file}",
            "Initialize the project with 'storycore init' or check the project structure"
        )
    
    try:
        with open(project_file, 'r', encoding='utf-8') as f:
            project_data = json.load(f)
        
        # Basic validation
        if not isinstance(project_data, dict):
            raise ConfigurationError("Project file must contain a JSON object")
        
        required_fields = ["project_name", "schema_version"]
        for field in required_fields:
            if field not in project_data:
                raise ConfigurationError(f"Project file missing required '{field}' field")
        
        logger.info(f"Loaded project: {project_data.get('project_name')}")
        return project_data
        
    except json.JSONDecodeError as e:
        raise ConfigurationError(
            f"Invalid JSON in project file: {e}",
            "Check the project.json file for syntax errors"
        )
    except (UserError, ConfigurationError):
        # Re-raise CLI errors without wrapping
        raise
    except Exception as e:
        raise SystemError(f"Failed to load project: {e}")


def validate_project_structure(project_path: str) -> Tuple[bool, List[str]]:
    """Validate project directory structure and return (is_valid, errors)."""
    project_dir = Path(project_path)
    errors = []
    
    # Check if project directory exists
    if not project_dir.exists():
        errors.append(f"Project directory not found: {project_dir}")
        return False, errors
    
    # Check for required files
    required_files = ["project.json"]
    for file_name in required_files:
        file_path = project_dir / file_name
        if not file_path.exists():
            errors.append(f"Required file missing: {file_name}")
    
    # Check for expected directories
    expected_dirs = ["assets", "assets/images", "assets/audio"]
    for dir_name in expected_dirs:
        dir_path = project_dir / dir_name
        if not dir_path.exists():
            errors.append(f"Expected directory missing: {dir_name}")
    
    # Try to load and validate project config
    try:
        load_project_config(project_path)
    except Exception as e:
        errors.append(f"Project configuration error: {e}")
    
    is_valid = len(errors) == 0
    return is_valid, errors


def get_project_metadata(project_path: str) -> Dict[str, Any]:
    """Get project metadata including size, file counts, etc."""
    project_dir = Path(project_path)
    
    if not project_dir.exists():
        raise UserError(f"Project directory not found: {project_dir}")
    
    metadata = {
        "path": str(project_dir.absolute()),
        "exists": True,
        "directories": {},
        "files": {},
        "total_size": 0
    }
    
    # Count files and sizes in key directories
    key_dirs = ["assets", "panels", "promoted", "refined", "exports"]
    
    for dir_name in key_dirs:
        dir_path = project_dir / dir_name
        if dir_path.exists():
            file_count = 0
            total_size = 0
            
            for file_path in dir_path.rglob("*"):
                if file_path.is_file():
                    file_count += 1
                    total_size += file_path.stat().st_size
            
            metadata["directories"][dir_name] = {
                "file_count": file_count,
                "size": total_size
            }
            metadata["total_size"] += total_size
        else:
            metadata["directories"][dir_name] = {
                "file_count": 0,
                "size": 0
            }
    
    # Load project config if available
    try:
        project_config = load_project_config(project_path)
        metadata["project_name"] = project_config.get("project_name")
        metadata["schema_version"] = project_config.get("schema_version")
    except Exception:
        metadata["project_name"] = None
        metadata["schema_version"] = None
    
    return metadata


def ensure_project_directories(project_path: str) -> None:
    """Ensure all required project directories exist."""
    project_dir = Path(project_path)
    
    # Standard StoryCore-Engine directories
    directories = [
        "assets",
        "assets/images",
        "assets/audio",
        "exports",
        "panels", 
        "promoted",
        "refined",
        "qa_output",
        "video_output",
        "audio_output"
    ]
    
    for dir_path in directories:
        full_path = project_dir / dir_path
        full_path.mkdir(parents=True, exist_ok=True)
        logger.debug(f"Ensured directory exists: {full_path}")
    
    logger.info(f"Ensured project directories exist in {project_dir}")


def save_project_config(project_path: str, config: Dict[str, Any]) -> None:
    """Save project configuration to project.json."""
    project_dir = Path(project_path)
    project_file = project_dir / "project.json"
    
    # Ensure project directory exists
    project_dir.mkdir(parents=True, exist_ok=True)
    
    # Validate required fields
    required_fields = ["project_name", "schema_version"]
    for field in required_fields:
        if field not in config:
            raise ConfigurationError(f"Project configuration missing required '{field}' field")
    
    try:
        with open(project_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved project configuration: {config.get('project_name')}")
        
    except Exception as e:
        raise SystemError(f"Failed to save project configuration: {e}")


def update_project_config(project_path: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update project configuration with new values."""
    # Load existing config
    config = load_project_config(project_path)
    
    # Apply updates
    config.update(updates)
    
    # Save updated config
    save_project_config(project_path, config)
    
    return config


def get_project_status(project_path: str) -> Dict[str, Any]:
    """Get comprehensive project status including generation progress."""
    project_dir = Path(project_path)
    
    if not project_dir.exists():
        raise UserError(f"Project directory not found: {project_dir}")
    
    # Load project config
    try:
        config = load_project_config(project_path)
    except Exception as e:
        raise UserError(f"Failed to load project configuration: {e}")
    
    # Get generation status
    generation_status = config.get("generation_status", {})
    
    # Count generated assets
    asset_counts = {
        "grid": 0,
        "panels": 0,
        "promoted": 0,
        "refined": 0,
        "video": 0,
        "audio": 0
    }
    
    # Count files in each directory
    for asset_type, dir_name in [
        ("panels", "panels"),
        ("promoted", "promoted"),
        ("refined", "refined"),
        ("video", "video_output"),
        ("audio", "audio_output")
    ]:
        asset_dir = project_dir / dir_name
        if asset_dir.exists():
            asset_counts[asset_type] = len(list(asset_dir.glob("*.*")))
    
    # Check for grid file
    grid_file = project_dir / "grid.png"
    if grid_file.exists():
        asset_counts["grid"] = 1
    
    status = {
        "project_name": config.get("project_name"),
        "schema_version": config.get("schema_version"),
        "generation_status": generation_status,
        "asset_counts": asset_counts,
        "capabilities": config.get("capabilities", {}),
        "metadata": get_project_metadata(project_path)
    }
    
    return status


def validate_project_config_schema(config: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate project configuration against expected schema."""
    errors = []
    
    # Check required fields
    required_fields = {
        "project_name": str,
        "schema_version": str
    }
    
    for field, expected_type in required_fields.items():
        if field not in config:
            errors.append(f"Missing required field: {field}")
        elif not isinstance(config[field], expected_type):
            errors.append(f"Field '{field}' must be of type {expected_type.__name__}")
    
    # Check optional but expected fields
    if "capabilities" in config:
        if not isinstance(config["capabilities"], dict):
            errors.append("Field 'capabilities' must be a dictionary")
    
    if "generation_status" in config:
        if not isinstance(config["generation_status"], dict):
            errors.append("Field 'generation_status' must be a dictionary")
        else:
            # Validate status values
            valid_statuses = ["pending", "done", "failed", "passed"]
            for key, value in config["generation_status"].items():
                if value not in valid_statuses:
                    errors.append(f"Invalid status value for '{key}': {value}")
    
    is_valid = len(errors) == 0
    return is_valid, errors


def check_project_exists(project_path: str) -> bool:
    """Check if a project exists at the given path."""
    project_dir = Path(project_path)
    project_file = project_dir / "project.json"
    
    return project_dir.exists() and project_file.exists()


def list_project_files(project_path: str, pattern: str = "*") -> List[Path]:
    """List files in project directory matching pattern."""
    project_dir = Path(project_path)
    
    if not project_dir.exists():
        raise UserError(f"Project directory not found: {project_dir}")
    
    return list(project_dir.rglob(pattern))