"""
Build Script Updater Module

This module provides functionality to update file paths in build scripts and
configuration files after project structure reorganization. It handles:
- package.json scripts
- Shell scripts (.sh files)
- Batch files (.bat files)
- Electron builder configuration
- Python build configuration (setup.py, pyproject.toml)

Requirements: 11.1, 11.2, 11.3, 11.4, 17.1
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ScriptUpdate:
    """Represents a path update in a build script"""
    file_path: Path
    old_path: str
    new_path: str
    line_number: Optional[int] = None
    script_name: Optional[str] = None


@dataclass
class UpdateResult:
    """Result of updating a build script file"""
    file_path: Path
    success: bool
    updates_made: int
    error_message: Optional[str] = None


class BuildScriptUpdater:
    """
    Updates file paths in build scripts and build configuration files.
    
    This class provides functionality to:
    - Update paths in package.json scripts
    - Update paths in shell scripts (.sh files)
    - Update paths in batch files (.bat files)
    - Update Electron builder configuration
    - Update Python build configuration (setup.py, pyproject.toml)
    
    Requirements: 11.1, 11.2, 11.3, 11.4, 17.1
    """
    
    def __init__(self, project_root: Path, path_mapping: Dict[Path, Path]):
        """
        Initialize BuildScriptUpdater.
        
        Args:
            project_root: Root directory of the project
            path_mapping: Mapping of old paths to new paths from FileMover
        """
        self.project_root = Path(project_root).resolve()
        self.path_mapping = path_mapping
        self.updates: List[ScriptUpdate] = []
        
        # Create relative path mapping for easier matching
        self.relative_mapping = self._create_relative_mapping()
    
    def _create_relative_mapping(self) -> Dict[str, str]:
        """
        Create a mapping of relative paths (as strings) for easier matching.
        
        Returns:
            Dictionary mapping old relative paths to new relative paths
        """
        mapping = {}
        for old_path, new_path in self.path_mapping.items():
            try:
                old_rel = str(old_path.relative_to(self.project_root))
                new_rel = str(new_path.relative_to(self.project_root))
                mapping[old_rel] = new_rel
                
                # Also add forward slash versions for cross-platform compatibility
                old_rel_fwd = old_rel.replace('\\', '/')
                new_rel_fwd = new_rel.replace('\\', '/')
                mapping[old_rel_fwd] = new_rel_fwd
            except ValueError:
                # Path not relative to project root, skip
                pass
        
        return mapping
    
    def update_package_json(self, file_path: Path) -> UpdateResult:
        """
        Update paths in package.json scripts.
        
        Args:
            file_path: Path to package.json file
        
        Returns:
            UpdateResult with status and statistics
        
        Requirements: 11.1, 11.4
        """
        try:
            # Read package.json
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            updates_made = 0
            
            # Update scripts section
            if 'scripts' in data:
                for script_name, script_value in data['scripts'].items():
                    updated_value = self._update_path_in_string(script_value)
                    if updated_value != script_value:
                        data['scripts'][script_name] = updated_value
                        updates_made += 1
                        self.updates.append(ScriptUpdate(
                            file_path=file_path,
                            old_path=script_value,
                            new_path=updated_value,
                            script_name=script_name
                        ))
            
            # Update main entry point
            if 'main' in data:
                updated_main = self._update_path_in_string(data['main'])
                if updated_main != data['main']:
                    data['main'] = updated_main
                    updates_made += 1
            
            # Update files array if present
            if 'files' in data and isinstance(data['files'], list):
                updated_files = []
                for file_pattern in data['files']:
                    updated_pattern = self._update_path_in_string(file_pattern)
                    updated_files.append(updated_pattern)
                    if updated_pattern != file_pattern:
                        updates_made += 1
                data['files'] = updated_files
            
            # Write back if changes were made
            if updates_made > 0:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write('\n')  # Add trailing newline
            
            return UpdateResult(
                file_path=file_path,
                success=True,
                updates_made=updates_made
            )
        
        except Exception as e:
            return UpdateResult(
                file_path=file_path,
                success=False,
                updates_made=0,
                error_message=str(e)
            )
    
    def update_shell_script(self, file_path: Path) -> UpdateResult:
        """
        Update paths in shell script (.sh file).
        
        Args:
            file_path: Path to shell script file
        
        Returns:
            UpdateResult with status and statistics
        
        Requirements: 11.2, 11.4
        """
        try:
            # Read shell script
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            updated_lines = []
            updates_made = 0
            
            for line_num, line in enumerate(lines, 1):
                updated_line = self._update_path_in_string(line)
                updated_lines.append(updated_line)
                
                if updated_line != line:
                    updates_made += 1
                    self.updates.append(ScriptUpdate(
                        file_path=file_path,
                        old_path=line.strip(),
                        new_path=updated_line.strip(),
                        line_number=line_num
                    ))
            
            # Write back if changes were made
            if updates_made > 0:
                with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                    f.writelines(updated_lines)
            
            return UpdateResult(
                file_path=file_path,
                success=True,
                updates_made=updates_made
            )
        
        except Exception as e:
            return UpdateResult(
                file_path=file_path,
                success=False,
                updates_made=0,
                error_message=str(e)
            )
    
    def update_batch_script(self, file_path: Path) -> UpdateResult:
        """
        Update paths in batch file (.bat file).
        
        Args:
            file_path: Path to batch file
        
        Returns:
            UpdateResult with status and statistics
        
        Requirements: 11.3, 11.4
        """
        try:
            # Read batch file
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            updated_lines = []
            updates_made = 0
            
            for line_num, line in enumerate(lines, 1):
                # Batch files use backslashes, so we need to handle both
                updated_line = self._update_path_in_string(line)
                updated_lines.append(updated_line)
                
                if updated_line != line:
                    updates_made += 1
                    self.updates.append(ScriptUpdate(
                        file_path=file_path,
                        old_path=line.strip(),
                        new_path=updated_line.strip(),
                        line_number=line_num
                    ))
            
            # Write back if changes were made
            if updates_made > 0:
                with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
                    f.writelines(updated_lines)
            
            return UpdateResult(
                file_path=file_path,
                success=True,
                updates_made=updates_made
            )
        
        except Exception as e:
            return UpdateResult(
                file_path=file_path,
                success=False,
                updates_made=0,
                error_message=str(e)
            )
    
    def update_electron_builder_config(self, file_path: Path) -> UpdateResult:
        """
        Update paths in Electron builder configuration.
        
        Args:
            file_path: Path to electron-builder.json file
        
        Returns:
            UpdateResult with status and statistics
        
        Requirements: 11.2, 11.4
        """
        try:
            # Read electron-builder config
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            updates_made = 0
            
            # Update directories section
            if 'directories' in data:
                for key, value in data['directories'].items():
                    updated_value = self._update_path_in_string(value)
                    if updated_value != value:
                        data['directories'][key] = updated_value
                        updates_made += 1
            
            # Update files array
            if 'files' in data and isinstance(data['files'], list):
                updated_files = []
                for file_pattern in data['files']:
                    updated_pattern = self._update_path_in_string(file_pattern)
                    updated_files.append(updated_pattern)
                    if updated_pattern != file_pattern:
                        updates_made += 1
                data['files'] = updated_files
            
            # Update extraResources if present
            if 'extraResources' in data and isinstance(data['extraResources'], list):
                updated_resources = []
                for resource in data['extraResources']:
                    if isinstance(resource, str):
                        updated_resource = self._update_path_in_string(resource)
                        updated_resources.append(updated_resource)
                        if updated_resource != resource:
                            updates_made += 1
                    else:
                        updated_resources.append(resource)
                data['extraResources'] = updated_resources
            
            # Write back if changes were made
            if updates_made > 0:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write('\n')
            
            return UpdateResult(
                file_path=file_path,
                success=True,
                updates_made=updates_made
            )
        
        except Exception as e:
            return UpdateResult(
                file_path=file_path,
                success=False,
                updates_made=0,
                error_message=str(e)
            )
    
    def update_setup_py(self, file_path: Path) -> UpdateResult:
        """
        Update paths in setup.py file.
        
        Args:
            file_path: Path to setup.py file
        
        Returns:
            UpdateResult with status and statistics
        
        Requirements: 11.3, 11.4
        """
        try:
            # Read setup.py
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Update paths in the content
            content = self._update_path_in_string(content)
            
            updates_made = 1 if content != original_content else 0
            
            # Write back if changes were made
            if updates_made > 0:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            
            return UpdateResult(
                file_path=file_path,
                success=True,
                updates_made=updates_made
            )
        
        except Exception as e:
            return UpdateResult(
                file_path=file_path,
                success=False,
                updates_made=0,
                error_message=str(e)
            )
    
    def update_pyproject_toml(self, file_path: Path) -> UpdateResult:
        """
        Update paths in pyproject.toml file.
        
        Args:
            file_path: Path to pyproject.toml file
        
        Returns:
            UpdateResult with status and statistics
        
        Requirements: 11.3, 11.4
        """
        try:
            # Read pyproject.toml
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            updated_lines = []
            updates_made = 0
            
            for line_num, line in enumerate(lines, 1):
                updated_line = self._update_path_in_string(line)
                updated_lines.append(updated_line)
                
                if updated_line != line:
                    updates_made += 1
                    self.updates.append(ScriptUpdate(
                        file_path=file_path,
                        old_path=line.strip(),
                        new_path=updated_line.strip(),
                        line_number=line_num
                    ))
            
            # Write back if changes were made
            if updates_made > 0:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(updated_lines)
            
            return UpdateResult(
                file_path=file_path,
                success=True,
                updates_made=updates_made
            )
        
        except Exception as e:
            return UpdateResult(
                file_path=file_path,
                success=False,
                updates_made=0,
                error_message=str(e)
            )
    
    def update_all_build_scripts(self) -> Dict[str, any]:
        """
        Update all build scripts and configuration files in the project.
        
        Returns:
            Dictionary with statistics about updates
        
        Requirements: 11.1, 11.2, 11.3, 11.4, 17.1
        """
        stats = {
            'package_json_updated': False,
            'electron_builder_updated': False,
            'setup_py_updated': False,
            'pyproject_toml_updated': False,
            'shell_scripts_updated': 0,
            'batch_scripts_updated': 0,
            'total_updates': 0,
            'errors': []
        }
        
        # Update package.json
        package_json = self.project_root / 'package.json'
        if package_json.exists():
            result = self.update_package_json(package_json)
            if result.success:
                stats['package_json_updated'] = result.updates_made > 0
                stats['total_updates'] += result.updates_made
            else:
                stats['errors'].append(f"package.json: {result.error_message}")
        
        # Update electron-builder.json
        electron_builder = self.project_root / 'electron-builder.json'
        if electron_builder.exists():
            result = self.update_electron_builder_config(electron_builder)
            if result.success:
                stats['electron_builder_updated'] = result.updates_made > 0
                stats['total_updates'] += result.updates_made
            else:
                stats['errors'].append(f"electron-builder.json: {result.error_message}")
        
        # Update setup.py
        setup_py = self.project_root / 'setup.py'
        if setup_py.exists():
            result = self.update_setup_py(setup_py)
            if result.success:
                stats['setup_py_updated'] = result.updates_made > 0
                stats['total_updates'] += result.updates_made
            else:
                stats['errors'].append(f"setup.py: {result.error_message}")
        
        # Update pyproject.toml
        pyproject_toml = self.project_root / 'pyproject.toml'
        if pyproject_toml.exists():
            result = self.update_pyproject_toml(pyproject_toml)
            if result.success:
                stats['pyproject_toml_updated'] = result.updates_made > 0
                stats['total_updates'] += result.updates_made
            else:
                stats['errors'].append(f"pyproject.toml: {result.error_message}")
        
        # Update shell scripts
        for sh_file in self.project_root.rglob('*.sh'):
            # Skip files in excluded directories
            if self._should_skip_file(sh_file):
                continue
            
            result = self.update_shell_script(sh_file)
            if result.success:
                if result.updates_made > 0:
                    stats['shell_scripts_updated'] += 1
                    stats['total_updates'] += result.updates_made
            else:
                stats['errors'].append(f"{sh_file}: {result.error_message}")
        
        # Update batch scripts
        for bat_file in self.project_root.rglob('*.bat'):
            # Skip files in excluded directories
            if self._should_skip_file(bat_file):
                continue
            
            result = self.update_batch_script(bat_file)
            if result.success:
                if result.updates_made > 0:
                    stats['batch_scripts_updated'] += 1
                    stats['total_updates'] += result.updates_made
            else:
                stats['errors'].append(f"{bat_file}: {result.error_message}")
        
        return stats
    
    def get_updates(self) -> List[ScriptUpdate]:
        """Get all script updates made"""
        return self.updates.copy()
    
    def _update_path_in_string(self, text: str) -> str:
        """
        Update file paths in a string.
        
        Args:
            text: String that may contain file paths
        
        Returns:
            Updated string with new paths
        """
        if not text:
            return text
        
        updated_text = text
        
        # Create directory-level mappings from file mappings
        dir_mappings = {}
        for old_path, new_path in self.relative_mapping.items():
            # Extract directory parts
            old_parts = Path(old_path).parts
            new_parts = Path(new_path).parts
            
            # Add directory mappings for each level
            for i in range(1, len(old_parts)):
                old_dir = str(Path(*old_parts[:i]))
                new_dir = str(Path(*new_parts[:i]))
                if old_dir != new_dir:
                    dir_mappings[old_dir] = new_dir
                    # Also add forward slash version
                    dir_mappings[old_dir.replace('\\', '/')] = new_dir.replace('\\', '/')
        
        # Combine file and directory mappings
        all_mappings = {**dir_mappings, **self.relative_mapping}
        
        # Sort mappings by length (longest first) to match most specific paths first
        sorted_mappings = sorted(
            all_mappings.items(),
            key=lambda x: len(x[0]),
            reverse=True
        )
        
        for old_path, new_path in sorted_mappings:
            # Try exact match
            if old_path in updated_text:
                updated_text = updated_text.replace(old_path, new_path)
            
            # Try with different path separators
            old_path_backslash = old_path.replace('/', '\\')
            new_path_backslash = new_path.replace('/', '\\')
            
            if old_path_backslash in updated_text and old_path_backslash != old_path:
                updated_text = updated_text.replace(old_path_backslash, new_path_backslash)
        
        return updated_text
    
    def _should_skip_file(self, file_path: Path) -> bool:
        """
        Check if file should be skipped during processing.
        
        Args:
            file_path: Path to check
        
        Returns:
            True if file should be skipped
        """
        skip_dirs = {
            'node_modules', '__pycache__', '.git', '.venv', 'venv',
            '.pytest_cache', '.hypothesis', 'dist', 'build', '.next',
            'coverage', '.coverage', 'htmlcov', '.mypy_cache', '.tox'
        }
        
        # Check if any parent directory is in skip list
        for parent in file_path.parents:
            if parent.name in skip_dirs:
                return True
        
        return False


def update_build_scripts(project_root: Path, path_mapping: Dict[Path, Path]) -> Dict[str, any]:
    """
    Update all build scripts and configuration files for moved files.
    
    Args:
        project_root: Root directory of the project
        path_mapping: Mapping of old paths to new paths from FileMover
    
    Returns:
        Dictionary with statistics about updates
    
    Requirements: 11.1, 11.2, 11.3, 11.4, 17.1
    """
    updater = BuildScriptUpdater(project_root, path_mapping)
    return updater.update_all_build_scripts()
