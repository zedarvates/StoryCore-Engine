"""
Directory Structure Creator for Project Structure Reorganization

This module creates the new directory structure for the reorganized project,
validates directory names, and manages .gitkeep files.
"""

import re
from pathlib import Path
from typing import List, Set, Dict, Optional
from dataclasses import dataclass, field


@dataclass
class DirectoryTree:
    """Represents the complete directory structure"""
    root: Path
    directories: List[Path] = field(default_factory=list)
    
    def add_directory(self, directory: Path):
        """Add a directory to the tree"""
        if directory not in self.directories:
            self.directories.append(directory)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'root': str(self.root),
            'directories': [str(d) for d in self.directories],
            'total_directories': len(self.directories)
        }


class DirectoryStructureCreator:
    """
    Creates the new directory structure for project reorganization.
    
    Generates all required directories, validates naming conventions,
    and adds .gitkeep files to preserve empty directories in Git.
    """
    
    # Required directory structure based on design document
    REQUIRED_STRUCTURE = {
        'src': [
            'engines',
            'cli',
            'services',
            'models',
            'utils'
        ],
        'frontend': [
            'components',
            'stores',
            'services',
            'utils'
        ],
        'electron': [],
        'tests': [
            'unit',
            'integration',
            'property',
            'e2e'
        ],
        'docs': [
            'api',
            'guides',
            'architecture',
            'deployment',
            'troubleshooting'
        ],
        'config': [
            'development',
            'production',
            'test'
        ],
        'assets': [
            'images',
            'audio',
            'video',
            'icons',
            'fonts',
            'cache'
        ],
        'examples': [
            'demos'
        ],
        'tools': [
            'scripts'
        ],
        'build': [],
        'dist': [],
        'models': [
            'image',
            'video',
            'audio'
        ],
        'workflows': []
    }
    
    # Directories that should be preserved but not created if they don't exist
    OPTIONAL_DIRECTORIES = {
        '.github',
        '.kiro',
        'comfyui_portable'
    }
    
    # Kebab-case validation pattern
    KEBAB_CASE_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
    
    def __init__(self, project_root: Path, dry_run: bool = False):
        """
        Initialize DirectoryStructureCreator.
        
        Args:
            project_root: Root directory of the project
            dry_run: If True, only simulate directory creation
        """
        self.project_root = Path(project_root).resolve()
        self.dry_run = dry_run
        self.created_directories: List[Path] = []
        self.validation_errors: List[str] = []
    
    def create_structure(self) -> DirectoryTree:
        """
        Create the complete new directory structure.
        
        Returns:
            DirectoryTree object containing all created directories
            
        Raises:
            ValueError: If directory name validation fails
        """
        print(f"Creating directory structure at: {self.project_root}")
        if self.dry_run:
            print("  [DRY RUN MODE - No actual changes will be made]")
        
        tree = DirectoryTree(root=self.project_root)
        
        # Create all required directories
        for base_dir, subdirs in self.REQUIRED_STRUCTURE.items():
            # Create base directory
            base_path = self.project_root / base_dir
            self._create_directory(base_path, tree)
            
            # Create subdirectories
            for subdir in subdirs:
                subdir_path = base_path / subdir
                self._create_directory(subdir_path, tree)
        
        # Add .gitkeep files to empty directories
        self._add_gitkeep_files(tree)
        
        # Report results
        if self.validation_errors:
            print(f"\n⚠️  Validation errors found:")
            for error in self.validation_errors:
                print(f"  - {error}")
            raise ValueError(f"Directory structure validation failed with {len(self.validation_errors)} errors")
        
        print(f"\n✓ Directory structure created successfully")
        print(f"  Total directories: {len(tree.directories)}")
        print(f"  Created directories: {len(self.created_directories)}")
        
        return tree
    
    def validate_directory_name(self, directory_name: str) -> bool:
        """
        Validate that a directory name follows kebab-case convention.
        
        Args:
            directory_name: Name of the directory to validate
            
        Returns:
            True if valid, False otherwise
        """
        # Allow certain special directories
        if directory_name in self.OPTIONAL_DIRECTORIES:
            return True
        
        # Allow directories starting with dot (hidden directories)
        if directory_name.startswith('.'):
            # Validate the part after the dot
            name_part = directory_name[1:]
            if not name_part:
                return True  # Just a dot is technically valid
            return bool(self.KEBAB_CASE_PATTERN.match(name_part))
        
        # Validate kebab-case
        return bool(self.KEBAB_CASE_PATTERN.match(directory_name))
    
    def get_all_required_directories(self) -> List[Path]:
        """
        Get a list of all required directories.
        
        Returns:
            List of Path objects for all required directories
        """
        directories = []
        
        for base_dir, subdirs in self.REQUIRED_STRUCTURE.items():
            # Add base directory
            directories.append(self.project_root / base_dir)
            
            # Add subdirectories
            for subdir in subdirs:
                directories.append(self.project_root / base_dir / subdir)
        
        return directories
    
    def verify_structure_completeness(self) -> bool:
        """
        Verify that all required directories exist.
        
        Returns:
            True if all required directories exist, False otherwise
        """
        missing_directories = []
        
        for required_dir in self.get_all_required_directories():
            if not required_dir.exists():
                missing_directories.append(required_dir)
        
        if missing_directories:
            print(f"\n⚠️  Missing directories:")
            for missing_dir in missing_directories:
                print(f"  - {missing_dir.relative_to(self.project_root)}")
            return False
        
        print(f"\n✓ All required directories exist")
        return True
    
    def _create_directory(self, directory: Path, tree: DirectoryTree):
        """
        Create a single directory with validation.
        
        Args:
            directory: Path to the directory to create
            tree: DirectoryTree to add the directory to
        """
        # Validate directory name
        dir_name = directory.name
        if not self.validate_directory_name(dir_name):
            error_msg = f"Invalid directory name '{dir_name}' - must follow kebab-case convention"
            self.validation_errors.append(error_msg)
            return
        
        # Add to tree
        tree.add_directory(directory)
        
        # Create directory if it doesn't exist
        if not directory.exists():
            if not self.dry_run:
                directory.mkdir(parents=True, exist_ok=True)
                print(f"  Created: {directory.relative_to(self.project_root)}")
            else:
                print(f"  [DRY RUN] Would create: {directory.relative_to(self.project_root)}")
            
            self.created_directories.append(directory)
        else:
            print(f"  Exists: {directory.relative_to(self.project_root)}")
    
    def _add_gitkeep_files(self, tree: DirectoryTree):
        """
        Add .gitkeep files to empty directories.
        
        Args:
            tree: DirectoryTree containing all directories
        """
        print("\nAdding .gitkeep files to empty directories...")
        
        gitkeep_count = 0
        
        for directory in tree.directories:
            # Skip if directory doesn't exist (dry run mode)
            if not directory.exists():
                continue
            
            # Check if directory is empty (no files, only subdirectories allowed)
            has_files = any(item.is_file() for item in directory.iterdir()) if directory.exists() and list(directory.iterdir()) else False
            
            if not has_files or not list(directory.iterdir()):
                gitkeep_path = directory / '.gitkeep'
                
                if not gitkeep_path.exists():
                    if not self.dry_run:
                        gitkeep_path.touch()
                        print(f"  Added .gitkeep: {directory.relative_to(self.project_root)}")
                    else:
                        print(f"  [DRY RUN] Would add .gitkeep: {directory.relative_to(self.project_root)}")
                    
                    gitkeep_count += 1
        
        print(f"\n✓ Added {gitkeep_count} .gitkeep files")
    
    def get_directory_structure_summary(self) -> str:
        """
        Generate a text summary of the directory structure.
        
        Returns:
            Formatted string showing the directory tree
        """
        lines = [f"Directory Structure for: {self.project_root.name}", ""]
        
        def add_directory_lines(base_dir: str, subdirs: List[str], prefix: str = ""):
            lines.append(f"{prefix}├── {base_dir}/")
            
            for i, subdir in enumerate(subdirs):
                is_last = i == len(subdirs) - 1
                connector = "└──" if is_last else "├──"
                lines.append(f"{prefix}│   {connector} {subdir}/")
        
        # Add all directories from REQUIRED_STRUCTURE
        sorted_dirs = sorted(self.REQUIRED_STRUCTURE.items())
        
        for i, (base_dir, subdirs) in enumerate(sorted_dirs):
            is_last = i == len(sorted_dirs) - 1
            connector = "└──" if is_last else "├──"
            
            if subdirs:
                lines.append(f"{connector} {base_dir}/")
                for j, subdir in enumerate(subdirs):
                    is_last_sub = j == len(subdirs) - 1
                    sub_connector = "└──" if is_last_sub else "├──"
                    continuation = "    " if is_last else "│   "
                    lines.append(f"{continuation}{sub_connector} {subdir}/")
            else:
                lines.append(f"{connector} {base_dir}/")
        
        return "\n".join(lines)


def create_directory_structure(project_root: Path, dry_run: bool = False) -> DirectoryTree:
    """
    Convenience function to create directory structure.
    
    Args:
        project_root: Root directory of the project
        dry_run: If True, only simulate directory creation
        
    Returns:
        DirectoryTree object containing all created directories
    """
    creator = DirectoryStructureCreator(project_root, dry_run=dry_run)
    return creator.create_structure()


def validate_kebab_case(directory_name: str) -> bool:
    """
    Convenience function to validate kebab-case naming.
    
    Args:
        directory_name: Name to validate
        
    Returns:
        True if valid kebab-case, False otherwise
    """
    creator = DirectoryStructureCreator(Path.cwd())
    return creator.validate_directory_name(directory_name)
