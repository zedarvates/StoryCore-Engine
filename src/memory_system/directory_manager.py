"""
Directory Manager for StoryCore LLM Memory System.

This module handles the creation, validation, and management of the directory
structure for the memory system.
"""

import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

from .data_models import ProjectConfig, ProjectMemory, Variables, CurrentState
from .schemas import (
    PROJECT_CONFIG_SCHEMA,
    MEMORY_SCHEMA,
    VARIABLES_SCHEMA,
    ERRORS_SCHEMA,
    validate_schema,
)


class DirectoryManager:
    """
    Manages directory structure creation and validation for memory system projects.
    
    Responsibilities:
    - Create complete directory hierarchy
    - Initialize JSON and text files with valid schemas
    - Validate directory structure integrity
    - Provide directory tree inspection
    """
    
    # Define the complete directory structure
    DIRECTORY_STRUCTURE = {
        "assistant": {
            "discussions_raw": {},
            "discussions_summary": {},
        },
        "build_logs": {},
        "assets": {
            "images": {},
            "audio": {},
            "video": {},
            "documents": {},
        },
        "summaries": {},
        "qa_reports": {},
    }
    
    # Define required files with their initial content generators
    REQUIRED_FILES = {
        "project_config.json": "config",
        "assistant/memory.json": "memory",
        "assistant/variables.json": "variables",
        "build_logs/errors_detected.json": "errors",
        "assets/attachments_index.txt": "text",
        "summaries/assets_summary.txt": "text",
        "summaries/project_overview.txt": "text",
        "summaries/timeline.txt": "text",
        "build_logs/build_steps_raw.log": "text",
        "build_logs/build_steps_clean.txt": "text",
        "build_logs/build_steps_translated.txt": "text",
        "build_logs/recovery_attempts.log": "text",
    }
    
    def __init__(self):
        """Initialize the DirectoryManager."""
        pass
    
    def _sanitize_project_name(self, project_name: str) -> str:
        """
        Sanitize project name to ensure it's valid for file system operations.
        
        Args:
            project_name: Raw project name
            
        Returns:
            Sanitized project name safe for use in paths
        """
        # Strip leading and trailing whitespace
        sanitized = project_name.strip()
        
        # Remove or replace invalid characters for Windows/Unix paths
        invalid_chars = '<>:"|?*'
        for char in invalid_chars:
            sanitized = sanitized.replace(char, '_')
        
        # Ensure name is not empty after sanitization
        if not sanitized:
            sanitized = "unnamed_project"
        
        return sanitized
    
    def create_structure(self, project_path: Path) -> bool:
        """
        Create the complete directory hierarchy for a memory system project.
        
        This method creates all required directories in a single atomic operation.
        
        Args:
            project_path: Root path for the project
            
        Returns:
            True if structure was created successfully, False otherwise
            
        Validates: Requirements 1.1, 1.2, 1.3
        """
        try:
            # Ensure project root exists
            project_path.mkdir(parents=True, exist_ok=True)
            
            # Create directory structure recursively
            self._create_directories_recursive(project_path, self.DIRECTORY_STRUCTURE)
            
            return True
        except Exception as e:
            print(f"Error creating directory structure: {e}")
            return False
    
    def _create_directories_recursive(
        self, 
        base_path: Path, 
        structure: Dict[str, Any]
    ) -> None:
        """
        Recursively create directories from structure definition.
        
        Args:
            base_path: Base path to create directories in
            structure: Dictionary defining directory structure
        """
        for dir_name, subdirs in structure.items():
            dir_path = base_path / dir_name
            dir_path.mkdir(parents=True, exist_ok=True)
            
            # Recursively create subdirectories
            if subdirs:
                self._create_directories_recursive(dir_path, subdirs)
    
    def initialize_files(self, project_path: Path, config: ProjectConfig) -> bool:
        """
        Create initial JSON and text files with valid schemas.
        
        This method initializes all required files with proper structure and
        valid content according to their schemas.
        
        Args:
            project_path: Root path for the project
            config: Project configuration to use for initialization
            
        Returns:
            True if files were initialized successfully, False otherwise
            
        Validates: Requirements 1.4, 1.5
        """
        try:
            # Initialize each required file
            for file_path, file_type in self.REQUIRED_FILES.items():
                full_path = project_path / file_path
                
                # Ensure parent directory exists
                full_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Generate and write initial content
                if file_type == "config":
                    self._write_config_file(full_path, config)
                elif file_type == "memory":
                    self._write_memory_file(full_path)
                elif file_type == "variables":
                    self._write_variables_file(full_path)
                elif file_type == "errors":
                    self._write_errors_file(full_path)
                elif file_type == "text":
                    self._write_text_file(full_path)
            
            return True
        except Exception as e:
            print(f"Error initializing files: {e}")
            return False
    
    def _write_config_file(self, file_path: Path, config: ProjectConfig) -> None:
        """Write project_config.json with valid schema."""
        config_dict = config.to_dict()
        
        # Validate against schema
        is_valid, errors = validate_schema(config_dict, PROJECT_CONFIG_SCHEMA)
        if not is_valid:
            raise ValueError(f"Invalid config schema: {errors}")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(config_dict, f, indent=2, ensure_ascii=False)
    
    def _write_memory_file(self, file_path: Path) -> None:
        """Write memory.json with valid schema."""
        memory = ProjectMemory(
            schema_version="1.0",
            last_updated=datetime.now().isoformat(),
            current_state=CurrentState(
                phase="initialization",
                progress_percentage=0,
                last_activity=datetime.now().isoformat()
            )
        )
        memory_dict = memory.to_dict()
        
        # Validate against schema
        is_valid, errors = validate_schema(memory_dict, MEMORY_SCHEMA)
        if not is_valid:
            raise ValueError(f"Invalid memory schema: {errors}")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(memory_dict, f, indent=2, ensure_ascii=False)
    
    def _write_variables_file(self, file_path: Path) -> None:
        """Write variables.json with valid schema."""
        variables = Variables(
            schema_version="1.0",
            last_updated=datetime.now().isoformat(),
            variables={}
        )
        variables_dict = variables.to_dict()
        
        # Validate against schema
        is_valid, errors = validate_schema(variables_dict, VARIABLES_SCHEMA)
        if not is_valid:
            raise ValueError(f"Invalid variables schema: {errors}")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(variables_dict, f, indent=2, ensure_ascii=False)
    
    def _write_errors_file(self, file_path: Path) -> None:
        """Write errors_detected.json with valid schema."""
        errors_dict = {
            "schema_version": "1.0",
            "errors": []
        }
        
        # Validate against schema
        is_valid, errors = validate_schema(errors_dict, ERRORS_SCHEMA)
        if not is_valid:
            raise ValueError(f"Invalid errors schema: {errors}")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(errors_dict, f, indent=2, ensure_ascii=False)
    
    def _write_text_file(self, file_path: Path) -> None:
        """Write empty text file."""
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("")
    
    def validate_structure(self, project_path: Path) -> List[str]:
        """
        Check for missing directories or files in the project structure.
        
        Args:
            project_path: Root path for the project
            
        Returns:
            List of missing items (empty list if structure is complete)
            
        Validates: Requirement 10.4
        """
        missing_items = []
        
        # Check directories
        missing_dirs = self._check_directories_recursive(
            project_path, 
            self.DIRECTORY_STRUCTURE
        )
        missing_items.extend(missing_dirs)
        
        # Check required files
        for file_path in self.REQUIRED_FILES.keys():
            full_path = project_path / file_path
            if not full_path.exists():
                missing_items.append(str(file_path))
        
        return missing_items
    
    def _check_directories_recursive(
        self, 
        base_path: Path, 
        structure: Dict[str, Any],
        prefix: str = ""
    ) -> List[str]:
        """
        Recursively check for missing directories.
        
        Args:
            base_path: Base path to check
            structure: Expected directory structure
            prefix: Path prefix for error messages
            
        Returns:
            List of missing directory paths
        """
        missing = []
        
        for dir_name, subdirs in structure.items():
            dir_path = base_path / dir_name
            relative_path = f"{prefix}/{dir_name}" if prefix else dir_name
            
            if not dir_path.exists():
                missing.append(relative_path)
            elif subdirs:
                # Recursively check subdirectories
                missing.extend(
                    self._check_directories_recursive(
                        dir_path, 
                        subdirs, 
                        relative_path
                    )
                )
        
        return missing
    
    def get_directory_tree(self, project_path: Path) -> Dict[str, Any]:
        """
        Return directory structure as nested dictionary for inspection.
        
        Args:
            project_path: Root path for the project
            
        Returns:
            Nested dictionary representing the directory tree
            
        Validates: Requirement 10.4
        """
        if not project_path.exists():
            return {}
        
        return self._build_tree_recursive(project_path)
    
    def _build_tree_recursive(self, path: Path) -> Dict[str, Any]:
        """
        Recursively build directory tree structure.
        
        Args:
            path: Path to build tree from
            
        Returns:
            Dictionary representing directory tree
        """
        tree = {
            "type": "directory" if path.is_dir() else "file",
            "name": path.name,
            "path": str(path),
        }
        
        if path.is_dir():
            children = []
            try:
                for child in sorted(path.iterdir()):
                    children.append(self._build_tree_recursive(child))
                tree["children"] = children
            except PermissionError:
                tree["error"] = "Permission denied"
        else:
            tree["size"] = path.stat().st_size
        
        return tree
