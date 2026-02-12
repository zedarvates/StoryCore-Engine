"""
Project name generation and validation.

Generates unique, filesystem-safe project names from parsed prompts.
Handles duplicate detection and variant generation.
"""

import re
from pathlib import Path
from typing import Optional, List
from src.end_to_end.data_models import ParsedPrompt


class ProjectNameGenerator:
    """
    Generates unique project names from parsed prompts.
    
    Validates: Requirements 2.1, 2.2, 2.3, 2.5
    """
    
    # Characters that are not allowed in file system paths
    INVALID_CHARS = r'[<>:"/\\|?*\x00-\x1f]'
    
    # Maximum length for project names (to avoid path length issues)
    MAX_NAME_LENGTH = 100
    
    def __init__(self, projects_directory: str):
        """
        Initialize project name generator.
        
        Args:
            projects_directory: Base directory where projects are stored
        """
        self.projects_directory = Path(projects_directory)
        # Ensure projects directory exists
        self.projects_directory.mkdir(parents=True, exist_ok=True)
    
    def generate_name(self, parsed_prompt: ParsedPrompt) -> str:
        """
        Generate a unique project name from parsed prompt.
        
        This method:
        1. Generates a base name from the prompt
        2. Checks for duplicates
        3. Creates variants if needed
        4. Returns a unique, filesystem-safe name
        
        Args:
            parsed_prompt: Parsed prompt data
            
        Returns:
            Unique project name
            
        Validates: Requirements 2.1, 2.2, 2.3, 2.5
        """
        # Generate base name from prompt
        base_name = self._generate_base_name(parsed_prompt)
        
        # Sanitize for file system
        sanitized_name = self._sanitize_name(base_name)
        
        # Find unique variant
        unique_name = self._find_unique_name(sanitized_name)
        
        return unique_name
    
    def _generate_base_name(self, parsed_prompt: ParsedPrompt) -> str:
        """
        Generate base project name from parsed prompt.
        
        Uses title, genre, and video type to create a descriptive name.
        
        Args:
            parsed_prompt: Parsed prompt data
            
        Returns:
            Base project name
            
        Validates: Requirement 2.1
        """
        # Start with project title
        parts = [parsed_prompt.project_title]
        
        # Add genre if it adds meaningful information
        if parsed_prompt.genre and parsed_prompt.genre.lower() not in parsed_prompt.project_title.lower():
            parts.append(parsed_prompt.genre)
        
        # Add video type if it's not generic
        if parsed_prompt.video_type and parsed_prompt.video_type.lower() not in ['video', 'film']:
            parts.append(parsed_prompt.video_type)
        
        # Join parts with hyphens
        base_name = "-".join(parts)
        
        return base_name
    
    def _sanitize_name(self, name: str) -> str:
        """
        Sanitize name for file system compatibility.
        
        Removes invalid characters, normalizes spaces, and ensures
        the name is valid across different operating systems.
        
        Args:
            name: Raw project name
            
        Returns:
            Sanitized project name
            
        Validates: Requirement 2.5
        """
        # Convert to lowercase for consistency
        sanitized = name.lower()
        
        # Replace spaces with hyphens
        sanitized = sanitized.replace(" ", "-")
        
        # Remove invalid file system characters
        sanitized = re.sub(self.INVALID_CHARS, "", sanitized)
        
        # Remove other special characters that might cause issues
        # Keep only alphanumeric, hyphens, and underscores
        sanitized = re.sub(r'[^a-z0-9\-_]', '', sanitized)
        
        # Replace multiple consecutive hyphens with single hyphen
        sanitized = re.sub(r'-+', '-', sanitized)
        
        # Remove leading/trailing hyphens
        sanitized = sanitized.strip('-')
        
        # Ensure name is not empty
        if not sanitized:
            sanitized = "project"
        
        # Truncate to maximum length
        if len(sanitized) > self.MAX_NAME_LENGTH:
            sanitized = sanitized[:self.MAX_NAME_LENGTH].rstrip('-')
        
        return sanitized
    
    def _find_unique_name(self, base_name: str) -> str:
        """
        Find a unique variant of the base name.
        
        Checks if the name already exists and generates variants
        with version numbers until a unique name is found.
        
        Args:
            base_name: Sanitized base name
            
        Returns:
            Unique project name
            
        Validates: Requirements 2.2, 2.3
        """
        # Check if base name is available
        if not self._name_exists(base_name):
            return base_name
        
        # Generate variants with version numbers
        # Reserve space for version suffix (e.g., "-v999" = 5 chars)
        max_suffix_length = 5  # "-v" + up to 3 digits
        max_base_length = self.MAX_NAME_LENGTH - max_suffix_length
        
        # Truncate base name if needed to leave room for suffix
        if len(base_name) > max_base_length:
            base_name = base_name[:max_base_length].rstrip('-')
        
        version = 2
        while True:
            variant_name = f"{base_name}-v{version}"
            
            # Ensure variant doesn't exceed max length
            if len(variant_name) > self.MAX_NAME_LENGTH:
                # Further truncate base name if suffix grew
                suffix = f"-v{version}"
                base_name = base_name[:self.MAX_NAME_LENGTH - len(suffix)].rstrip('-')
                variant_name = f"{base_name}{suffix}"
            
            if not self._name_exists(variant_name):
                return variant_name
            
            version += 1
            
            # Safety check to prevent infinite loop
            if version > 1000:
                # Use timestamp as fallback
                import time
                timestamp = int(time.time())
                suffix = f"-{timestamp}"
                truncated_base = base_name[:self.MAX_NAME_LENGTH - len(suffix)].rstrip('-')
                return f"{truncated_base}{suffix}"
    
    def _name_exists(self, name: str) -> bool:
        """
        Check if a project with the given name already exists.
        
        Args:
            name: Project name to check
            
        Returns:
            True if project exists, False otherwise
            
        Validates: Requirement 2.2
        """
        project_path = self.projects_directory / name
        return project_path.exists()
    
    def get_project_path(self, project_name: str) -> Path:
        """
        Get the full path for a project.
        
        Args:
            project_name: Project name
            
        Returns:
            Full path to project directory
            
        Validates: Requirement 2.5
        """
        return self.projects_directory / project_name
    
    def validate_name(self, name: str) -> tuple:
        """
        Validate a project name.
        
        Checks if the name is valid for file system use and
        doesn't conflict with existing projects.
        
        Args:
            name: Project name to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if name is empty
        if not name or not name.strip():
            return (False, "Project name cannot be empty")
        
        # Check for invalid characters
        if re.search(self.INVALID_CHARS, name):
            return (False, "Project name contains invalid characters")
        
        # Check length
        if len(name) > self.MAX_NAME_LENGTH:
            return (False, f"Project name too long (max {self.MAX_NAME_LENGTH} characters)")
        
        # Check if name already exists
        if self._name_exists(name):
            return (False, f"Project '{name}' already exists")
        
        return (True, "")
    
    def list_existing_projects(self) -> List[str]:
        """
        List all existing project names.
        
        Returns:
            List of project names
        """
        if not self.projects_directory.exists():
            return []
        
        projects = []
        for item in self.projects_directory.iterdir():
            if item.is_dir():
                projects.append(item.name)
        
        return sorted(projects)
    
    def suggest_variants(self, base_name: str, count: int = 5) -> List[str]:
        """
        Suggest alternative project names.
        
        Useful for providing options to users if their preferred
        name is taken.
        
        Args:
            base_name: Base name to generate variants from
            count: Number of variants to suggest
            
        Returns:
            List of suggested names
        """
        sanitized = self._sanitize_name(base_name)
        suggestions = []
        
        # Try base name first
        if not self._name_exists(sanitized):
            suggestions.append(sanitized)
        
        # Generate numbered variants
        version = 2
        while len(suggestions) < count:
            variant = f"{sanitized}-v{version}"
            if not self._name_exists(variant):
                suggestions.append(variant)
            version += 1
        
        return suggestions[:count]
