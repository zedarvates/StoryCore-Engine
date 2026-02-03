"""
Configuration Manager for StoryCore LLM Memory System.

This module handles reading, writing, and validating project configuration files.
It ensures all configuration operations maintain schema compliance and provides
safe update mechanisms with validation gates.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

from .data_models import ProjectConfig, MemorySystemConfig
from .schemas import PROJECT_CONFIG_SCHEMA, validate_schema


class ConfigManager:
    """
    Manages project configuration file operations.
    
    Responsibilities:
    - Load configuration with schema validation
    - Update configuration with validation gates
    - Support memory_system_config section
    - Provide structured configuration access
    
    Validates: Requirements 2.1, 2.2, 2.3, 16.5
    """
    
    CONFIG_FILENAME = "project_config.json"
    
    def __init__(self, project_path: Path):
        """
        Initialize the ConfigManager.
        
        Args:
            project_path: Root path for the project
        """
        self.project_path = project_path
        self.config_path = project_path / self.CONFIG_FILENAME
    
    def load_config(self) -> Optional[ProjectConfig]:
        """
        Load and parse project_config.json with schema validation.
        
        Returns:
            ProjectConfig object if successful, None if file doesn't exist or is invalid
            
        Validates: Requirements 2.1, 2.3
        """
        if not self.config_path.exists():
            return None
        
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # Validate against schema
            is_valid, errors = validate_schema(config_data, PROJECT_CONFIG_SCHEMA)
            if not is_valid:
                print(f"Configuration validation failed: {errors}")
                return None
            
            # Convert to ProjectConfig object
            config = ProjectConfig.from_dict(config_data)
            return config
            
        except json.JSONDecodeError as e:
            print(f"Invalid JSON in configuration file: {e}")
            return None
        except Exception as e:
            print(f"Error loading configuration: {e}")
            return None
    
    def save_config(self, config: ProjectConfig) -> bool:
        """
        Save configuration to project_config.json with validation.
        
        This method validates the configuration against the schema before writing
        to ensure data integrity.
        
        Args:
            config: ProjectConfig object to save
            
        Returns:
            True if saved successfully, False otherwise
            
        Validates: Requirements 2.2
        """
        try:
            # Convert to dictionary
            config_dict = config.to_dict()
            
            # Validate against schema before writing
            is_valid, errors = validate_schema(config_dict, PROJECT_CONFIG_SCHEMA)
            if not is_valid:
                print(f"Configuration validation failed: {errors}")
                return False
            
            # Ensure parent directory exists
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write to file
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(config_dict, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception as e:
            print(f"Error saving configuration: {e}")
            return False
    
    def update_config(self, updates: Dict[str, Any]) -> bool:
        """
        Update configuration with validation gates.
        
        This method loads the current configuration, applies updates, validates
        the result, and saves it back. Updates are rejected if they would result
        in invalid configuration.
        
        Args:
            updates: Dictionary of fields to update
            
        Returns:
            True if updated successfully, False otherwise
            
        Validates: Requirements 2.2, 2.3
        """
        # Load current configuration
        config = self.load_config()
        if config is None:
            print("Cannot update: configuration file not found or invalid")
            return False
        
        try:
            # Apply updates to config object
            for key, value in updates.items():
                if key == "project_name":
                    config.project_name = value
                elif key == "project_type":
                    if value not in ["video", "script", "creative", "technical"]:
                        print(f"Invalid project_type: {value}")
                        return False
                    config.project_type = value
                elif key == "objectives":
                    if not isinstance(value, list):
                        print("objectives must be a list")
                        return False
                    config.objectives = value
                elif key == "memory_system_enabled":
                    if not isinstance(value, bool):
                        print("memory_system_enabled must be a boolean")
                        return False
                    config.memory_system_enabled = value
                elif key == "memory_system_config":
                    if not isinstance(value, dict):
                        print("memory_system_config must be a dictionary")
                        return False
                    # Update memory system config fields
                    self._update_memory_system_config(config.memory_system_config, value)
                else:
                    print(f"Unknown configuration field: {key}")
                    return False
            
            # Save updated configuration (includes validation)
            return self.save_config(config)
            
        except Exception as e:
            print(f"Error updating configuration: {e}")
            return False
    
    def _update_memory_system_config(
        self, 
        config: MemorySystemConfig, 
        updates: Dict[str, Any]
    ) -> None:
        """
        Update memory system configuration fields.
        
        Args:
            config: MemorySystemConfig object to update
            updates: Dictionary of fields to update
        """
        for key, value in updates.items():
            if key == "auto_summarize":
                if not isinstance(value, bool):
                    raise ValueError("auto_summarize must be a boolean")
                config.auto_summarize = value
            elif key == "summarization_threshold_kb":
                if not isinstance(value, int) or value < 1:
                    raise ValueError("summarization_threshold_kb must be a positive integer")
                config.summarization_threshold_kb = value
            elif key == "auto_translate":
                if not isinstance(value, bool):
                    raise ValueError("auto_translate must be a boolean")
                config.auto_translate = value
            elif key == "target_languages":
                if not isinstance(value, list):
                    raise ValueError("target_languages must be a list")
                config.target_languages = value
            elif key == "error_detection_enabled":
                if not isinstance(value, bool):
                    raise ValueError("error_detection_enabled must be a boolean")
                config.error_detection_enabled = value
            elif key == "auto_recovery_enabled":
                if not isinstance(value, bool):
                    raise ValueError("auto_recovery_enabled must be a boolean")
                config.auto_recovery_enabled = value
            elif key == "max_recovery_attempts":
                if not isinstance(value, int) or value < 1 or value > 10:
                    raise ValueError("max_recovery_attempts must be between 1 and 10")
                config.max_recovery_attempts = value
            else:
                raise ValueError(f"Unknown memory_system_config field: {key}")
    
    def get_config_dict(self) -> Optional[Dict[str, Any]]:
        """
        Get configuration as a dictionary for structured access.
        
        Returns:
            Configuration dictionary if successful, None otherwise
            
        Validates: Requirement 2.3
        """
        config = self.load_config()
        if config is None:
            return None
        
        return config.to_dict()
    
    def create_default_config(
        self, 
        project_name: str, 
        project_type: str = "video",
        objectives: Optional[list] = None
    ) -> ProjectConfig:
        """
        Create a default configuration for a new project.
        
        Args:
            project_name: Name of the project
            project_type: Type of project (video|script|creative|technical)
            objectives: List of project objectives
            
        Returns:
            ProjectConfig object with default values
            
        Validates: Requirements 2.1, 16.5
        """
        if objectives is None:
            objectives = []
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=objectives,
            memory_system_enabled=True,
            memory_system_config=MemorySystemConfig()
        )
        
        return config
    
    def is_memory_system_enabled(self) -> bool:
        """
        Check if memory system is enabled for this project.
        
        Returns:
            True if memory system is enabled, False otherwise
            
        Validates: Requirement 16.5
        """
        config = self.load_config()
        if config is None:
            return False
        
        return config.memory_system_enabled
    
    def get_memory_system_config(self) -> Optional[MemorySystemConfig]:
        """
        Get memory system configuration section.
        
        Returns:
            MemorySystemConfig object if successful, None otherwise
            
        Validates: Requirement 16.5
        """
        config = self.load_config()
        if config is None:
            return None
        
        return config.memory_system_config
