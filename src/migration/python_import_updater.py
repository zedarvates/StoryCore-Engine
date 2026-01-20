"""
Python Import Updater Module

This module provides functionality to update Python import statements after file movements.
It parses Python files using AST, calculates new import paths, and updates both absolute
and relative imports to maintain functionality after reorganization.

Requirements: 9.1, 9.2, 9.3, 9.5
"""

import ast
import re
from pathlib import Path
from typing import List, Dict, Set, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ImportStatement:
    """Represents a Python import statement"""
    module: str
    names: List[str]
    is_from_import: bool
    level: int = 0  # For relative imports (number of dots)
    line_number: int = 0
    original_text: str = ""
    
    def is_relative(self) -> bool:
        """Check if this is a relative import"""
        return self.level > 0


@dataclass
class ImportUpdate:
    """Represents an import statement update"""
    file_path: Path
    old_import: str
    new_import: str
    line_number: int
    import_type: str  # 'absolute' or 'relative'


@dataclass
class PathMapping:
    """Maps old file paths to new file paths"""
    mappings: Dict[Path, Path] = field(default_factory=dict)
    
    def add_mapping(self, old_path: Path, new_path: Path):
        """Add a path mapping"""
        self.mappings[old_path] = new_path
    
    def get_new_path(self, old_path: Path) -> Optional[Path]:
        """Get new path for an old path"""
        return self.mappings.get(old_path)
    
    def get_relative_import(self, from_file: Path, to_file: Path) -> str:
        """
        Calculate relative import path between two files.
        
        Args:
            from_file: File doing the importing
            to_file: File being imported
            
        Returns:
            Relative import string (e.g., '..module' or '.submodule')
        """
        try:
            # Get relative path from source to target
            from_dir = from_file.parent
            rel_path = to_file.relative_to(from_dir)
            
            # Convert to module path (remove .py extension)
            # Use forward slashes for Python imports regardless of OS
            module_path = str(rel_path.with_suffix('')).replace('\\', '/').replace('/', '.')
            
            # Add leading dot for relative import
            return f".{module_path}"
        except ValueError:
            # Files are not in relative paths, need to go up
            # Find common ancestor
            common = Path(*[p for p in from_file.parts if p in to_file.parts])
            
            # Calculate levels up
            from_parts = from_file.relative_to(common).parts
            levels_up = len(from_parts) - 1
            
            # Calculate path down to target
            to_parts = to_file.relative_to(common).parts
            module_parts = [p for p in to_parts[:-1]]  # Exclude filename
            module_parts.append(to_file.stem)  # Add filename without extension
            
            # Build relative import
            dots = '.' * (levels_up + 1)
            module_path = '.'.join(module_parts)
            
            if module_path:
                return f"{dots}{module_path}"
            else:
                return dots


class PythonImportUpdater:
    """
    Updates Python import statements after file movements.
    
    This class provides functionality to:
    - Parse Python files and extract import statements using AST
    - Calculate new import paths based on file movements
    - Update absolute imports to reflect new module structure
    - Update relative imports to maintain relationships
    - Add __init__.py files to all Python package directories
    
    Requirements: 9.1, 9.2, 9.3, 9.5
    """
    
    def __init__(self, project_root: Path, path_mapping: PathMapping):
        """
        Initialize PythonImportUpdater.
        
        Args:
            project_root: Root directory of the project
            path_mapping: Mapping of old paths to new paths
        """
        self.project_root = Path(project_root).resolve()
        self.path_mapping = path_mapping
        self.updates: List[ImportUpdate] = []
        self.created_init_files: Set[Path] = set()
    
    def extract_imports(self, file_path: Path) -> List[ImportStatement]:
        """
        Parse Python file and extract all import statements using AST.
        
        Args:
            file_path: Path to Python file
            
        Returns:
            List of ImportStatement objects
            
        Requirements: 9.1
        """
        imports = []
        
        try:
            content = file_path.read_text(encoding='utf-8')
            tree = ast.parse(content, filename=str(file_path))
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    # Handle: import module
                    for alias in node.names:
                        imports.append(ImportStatement(
                            module=alias.name,
                            names=[alias.asname or alias.name],
                            is_from_import=False,
                            level=0,
                            line_number=node.lineno,
                            original_text=self._get_line_text(content, node.lineno)
                        ))
                
                elif isinstance(node, ast.ImportFrom):
                    # Handle: from module import name
                    module = node.module or ''
                    names = [alias.name for alias in node.names]
                    
                    imports.append(ImportStatement(
                        module=module,
                        names=names,
                        is_from_import=True,
                        level=node.level,
                        line_number=node.lineno,
                        original_text=self._get_line_text(content, node.lineno)
                    ))
        
        except SyntaxError as e:
            print(f"Warning: Could not parse {file_path}: {e}")
        except Exception as e:
            print(f"Warning: Error extracting imports from {file_path}: {e}")
        
        return imports
    
    def calculate_new_import_path(self, file_path: Path, import_stmt: ImportStatement) -> Optional[str]:
        """
        Calculate new import path based on file movements.
        
        Args:
            file_path: Path to file containing the import
            import_stmt: Import statement to update
            
        Returns:
            New import path string, or None if no update needed
            
        Requirements: 9.1, 9.2
        """
        # Get new location of the importing file
        new_file_path = self.path_mapping.get_new_path(file_path)
        if new_file_path is None:
            new_file_path = file_path
        
        if import_stmt.is_relative():
            # Handle relative imports
            return self._calculate_relative_import(new_file_path, import_stmt)
        else:
            # Handle absolute imports
            return self._calculate_absolute_import(new_file_path, import_stmt)
    
    def update_absolute_imports(self, file_path: Path, imports: List[ImportStatement]) -> int:
        """
        Update absolute imports in a file to reflect new module structure.
        
        Args:
            file_path: Path to Python file
            imports: List of import statements from the file
            
        Returns:
            Number of imports updated
            
        Requirements: 9.1, 9.3
        """
        updates_count = 0
        
        for import_stmt in imports:
            if import_stmt.is_relative():
                continue
            
            new_import = self.calculate_new_import_path(file_path, import_stmt)
            
            if new_import and new_import != import_stmt.module:
                self.updates.append(ImportUpdate(
                    file_path=file_path,
                    old_import=import_stmt.original_text,
                    new_import=self._build_import_text(import_stmt, new_import),
                    line_number=import_stmt.line_number,
                    import_type='absolute'
                ))
                updates_count += 1
        
        return updates_count
    
    def update_relative_imports(self, file_path: Path, imports: List[ImportStatement]) -> int:
        """
        Update relative imports to maintain relationships after file movements.
        
        Args:
            file_path: Path to Python file
            imports: List of import statements from the file
            
        Returns:
            Number of imports updated
            
        Requirements: 9.2
        """
        updates_count = 0
        
        for import_stmt in imports:
            if not import_stmt.is_relative():
                continue
            
            new_import = self.calculate_new_import_path(file_path, import_stmt)
            
            if new_import and new_import != import_stmt.module:
                self.updates.append(ImportUpdate(
                    file_path=file_path,
                    old_import=import_stmt.original_text,
                    new_import=self._build_import_text(import_stmt, new_import),
                    line_number=import_stmt.line_number,
                    import_type='relative'
                ))
                updates_count += 1
        
        return updates_count
    
    def apply_updates(self, file_path: Path) -> bool:
        """
        Apply all pending import updates to a file.
        
        Args:
            file_path: Path to Python file
            
        Returns:
            True if updates were applied successfully
        """
        # Get updates for this file
        file_updates = [u for u in self.updates if u.file_path == file_path]
        
        if not file_updates:
            return True
        
        try:
            # Read file content
            content = file_path.read_text(encoding='utf-8')
            lines = content.splitlines(keepends=True)
            
            # Sort updates by line number (descending) to avoid offset issues
            file_updates.sort(key=lambda u: u.line_number, reverse=True)
            
            # Apply each update
            for update in file_updates:
                if 0 < update.line_number <= len(lines):
                    lines[update.line_number - 1] = update.new_import + '\n'
            
            # Write updated content
            file_path.write_text(''.join(lines), encoding='utf-8')
            
            return True
        
        except Exception as e:
            print(f"Error applying updates to {file_path}: {e}")
            return False
    
    def create_init_files(self, directories: List[Path]) -> int:
        """
        Add __init__.py files to all Python package directories.
        
        Args:
            directories: List of directories that should be Python packages
            
        Returns:
            Number of __init__.py files created
            
        Requirements: 9.5
        """
        created_count = 0
        
        for directory in directories:
            init_file = directory / '__init__.py'
            
            # Skip if already exists
            if init_file.exists():
                continue
            
            # Check if directory contains Python files
            has_python_files = any(
                f.suffix == '.py' for f in directory.iterdir() if f.is_file()
            )
            
            if has_python_files:
                try:
                    init_file.write_text('"""Package initialization."""\n', encoding='utf-8')
                    self.created_init_files.add(init_file)
                    created_count += 1
                except Exception as e:
                    print(f"Error creating {init_file}: {e}")
        
        return created_count
    
    def scan_and_create_init_files(self, root_dir: Path) -> int:
        """
        Scan directory tree and create __init__.py files where needed.
        
        Args:
            root_dir: Root directory to scan
            
        Returns:
            Number of __init__.py files created
            
        Requirements: 9.5
        """
        directories = []
        
        # Find all directories with Python files
        for path in root_dir.rglob('*.py'):
            parent = path.parent
            if parent not in directories and parent != root_dir:
                directories.append(parent)
        
        return self.create_init_files(directories)
    
    def get_updates(self) -> List[ImportUpdate]:
        """Get all pending import updates"""
        return self.updates.copy()
    
    def get_created_init_files(self) -> Set[Path]:
        """Get set of created __init__.py files"""
        return self.created_init_files.copy()
    
    def _calculate_relative_import(self, file_path: Path, import_stmt: ImportStatement) -> Optional[str]:
        """
        Calculate new path for a relative import.
        
        Args:
            file_path: New location of file containing import
            import_stmt: Relative import statement
            
        Returns:
            New import path or None if unchanged
        """
        # Resolve the target of the relative import
        current_dir = file_path.parent
        
        # Go up 'level' directories
        target_dir = current_dir
        for _ in range(import_stmt.level):
            target_dir = target_dir.parent
        
        # Add module path
        if import_stmt.module:
            module_parts = import_stmt.module.split('.')
            for part in module_parts:
                target_dir = target_dir / part
        
        # Check if target moved
        target_file = target_dir.with_suffix('.py')
        new_target = self.path_mapping.get_new_path(target_file)
        
        if new_target is None:
            # Target didn't move, recalculate relative path from new location
            new_import = self.path_mapping.get_relative_import(file_path, target_file)
            return new_import
        else:
            # Target moved, calculate new relative path
            new_import = self.path_mapping.get_relative_import(file_path, new_target)
            return new_import
    
    def _calculate_absolute_import(self, file_path: Path, import_stmt: ImportStatement) -> Optional[str]:
        """
        Calculate new path for an absolute import.
        
        Args:
            file_path: New location of file containing import
            import_stmt: Absolute import statement
            
        Returns:
            New import path or None if unchanged
        """
        # Convert module name to file path
        module_parts = import_stmt.module.split('.')
        potential_file = self.project_root / '/'.join(module_parts)
        potential_file = potential_file.with_suffix('.py')
        
        # Check if this file exists and was moved
        if potential_file.exists():
            new_location = self.path_mapping.get_new_path(potential_file)
            
            if new_location:
                # Calculate new module path
                try:
                    rel_path = new_location.relative_to(self.project_root)
                    new_module = str(rel_path.with_suffix('')).replace('/', '.')
                    return new_module
                except ValueError:
                    pass
        
        return None
    
    def _build_import_text(self, import_stmt: ImportStatement, new_module: str) -> str:
        """
        Build import statement text with new module path.
        
        Args:
            import_stmt: Original import statement
            new_module: New module path
            
        Returns:
            New import statement text
        """
        if import_stmt.is_from_import:
            names_str = ', '.join(import_stmt.names)
            return f"from {new_module} import {names_str}"
        else:
            return f"import {new_module}"
    
    def _get_line_text(self, content: str, line_number: int) -> str:
        """
        Get text of a specific line from file content.
        
        Args:
            content: File content
            line_number: Line number (1-indexed)
            
        Returns:
            Line text
        """
        lines = content.splitlines()
        if 0 < line_number <= len(lines):
            return lines[line_number - 1].strip()
        return ""


def update_python_imports(project_root: Path, path_mapping: PathMapping, 
                         python_files: List[Path]) -> Dict[str, int]:
    """
    Update Python imports for all moved files.
    
    Args:
        project_root: Root directory of the project
        path_mapping: Mapping of old paths to new paths
        python_files: List of Python files to process
        
    Returns:
        Dictionary with statistics about updates
        
    Requirements: 9.1, 9.2, 9.3, 9.5
    """
    updater = PythonImportUpdater(project_root, path_mapping)
    
    stats = {
        'files_processed': 0,
        'absolute_imports_updated': 0,
        'relative_imports_updated': 0,
        'init_files_created': 0,
        'errors': 0
    }
    
    # Process each Python file
    for file_path in python_files:
        try:
            # Extract imports
            imports = updater.extract_imports(file_path)
            
            # Update absolute imports
            abs_count = updater.update_absolute_imports(file_path, imports)
            stats['absolute_imports_updated'] += abs_count
            
            # Update relative imports
            rel_count = updater.update_relative_imports(file_path, imports)
            stats['relative_imports_updated'] += rel_count
            
            # Apply updates
            if abs_count > 0 or rel_count > 0:
                updater.apply_updates(file_path)
            
            stats['files_processed'] += 1
        
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            stats['errors'] += 1
    
    # Create __init__.py files
    src_dir = project_root / 'src'
    if src_dir.exists():
        init_count = updater.scan_and_create_init_files(src_dir)
        stats['init_files_created'] = init_count
    
    return stats
