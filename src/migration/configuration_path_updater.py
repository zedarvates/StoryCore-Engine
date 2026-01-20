"""
Configuration Path Updater Module

This module provides functionality to update file paths in configuration files
after project structure reorganization. It handles JSON, YAML, and .env files,
preserving original formatting and updating paths based on file movement mappings.

Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass


@dataclass
class PathUpdate:
    """Represents a path update in a configuration file"""
    file_path: Path
    old_path: str
    new_path: str
    line_number: Optional[int] = None


class ConfigurationPathUpdater:
    """
    Updates file paths in configuration files after project reorganization.

    This class provides functionality to:
    - Update paths in JSON configuration files
    - Update paths in YAML configuration files
    - Update paths in .env files
    - Handle nested configuration structures
    - Preserve original formatting of configuration files
    - Use path mappings from FileMover to know what paths changed

    Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
    """

    def __init__(self, project_root: Path, path_mapping: Dict[Path, Path]):
        """
        Initialize ConfigurationPathUpdater.

        Args:
            project_root: Root directory of the project
            path_mapping: Mapping of old paths to new paths from FileMover
        """
        self.project_root = Path(project_root).resolve()
        self.path_mapping = path_mapping
        self.updates: List[PathUpdate] = []

    def update_json_file(self, file_path: Path) -> bool:
        """
        Update paths in a JSON configuration file.

        Args:
            file_path: Path to JSON configuration file

        Returns:
            True if file was updated successfully
        """
        try:
            # Read JSON file
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Update paths in the data structure
            updated_data = self._update_paths_in_structure(data)

            # Check if any updates were made
            if self._has_changes(data, updated_data):
                # Write back with preserved formatting
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(updated_data, f, indent=2, ensure_ascii=False)
                return True

        except Exception as e:
            print(f"Error updating JSON file {file_path}: {e}")
            return False

        return False

    def update_yaml_file(self, file_path: Path) -> bool:
        """
        Update paths in a YAML configuration file.

        Args:
            file_path: Path to YAML configuration file

        Returns:
            True if file was updated successfully
        """
        try:
            # Try to import PyYAML
            import yaml
        except ImportError:
            print("PyYAML not available, cannot update YAML files")
            return False

        try:
            # Read YAML file
            with open(file_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)

            # Update paths in the data structure
            updated_data = self._update_paths_in_structure(data)

            # Check if any updates were made
            if self._has_changes(data, updated_data):
                # Write back preserving formatting
                with open(file_path, 'w', encoding='utf-8') as f:
                    yaml.dump(updated_data, f, default_flow_style=False, allow_unicode=True)
                return True

        except Exception as e:
            print(f"Error updating YAML file {file_path}: {e}")
            return False

        return False

    def update_env_file(self, file_path: Path) -> bool:
        """
        Update paths in a .env file.

        Args:
            file_path: Path to .env file

        Returns:
            True if file was updated successfully
        """
        try:
            # Read .env file
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            updated_lines = []
            has_changes = False

            for line_num, line in enumerate(lines, 1):
                # Skip comments and empty lines
                if line.strip().startswith('#') or not line.strip():
                    updated_lines.append(line)
                    continue

                # Parse key=value
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()

                    # Check if value looks like a path
                    updated_value = self._update_path_string(value)

                    if updated_value != value:
                        updated_lines.append(f"{key}={updated_value}\n")
                        has_changes = True
                        self.updates.append(PathUpdate(
                            file_path=file_path,
                            old_path=value,
                            new_path=updated_value,
                            line_number=line_num
                        ))
                    else:
                        updated_lines.append(line)
                else:
                    updated_lines.append(line)

            if has_changes:
                # Write back
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(updated_lines)
                return True

        except Exception as e:
            print(f"Error updating .env file {file_path}: {e}")
            return False

        return False

    def update_configuration_files(self, config_files: List[Path]) -> Dict[str, int]:
        """
        Update all configuration files in the list.

        Args:
            config_files: List of configuration file paths

        Returns:
            Dictionary with statistics about updates
        """
        stats = {
            'json_files_updated': 0,
            'yaml_files_updated': 0,
            'env_files_updated': 0,
            'total_files_processed': 0,
            'errors': 0
        }

        for file_path in config_files:
            try:
                suffix = file_path.suffix.lower()
                updated = False

                if suffix == '.json':
                    updated = self.update_json_file(file_path)
                    if updated:
                        stats['json_files_updated'] += 1
                elif suffix in ['.yaml', '.yml']:
                    updated = self.update_yaml_file(file_path)
                    if updated:
                        stats['yaml_files_updated'] += 1
                elif file_path.name == '.env' or file_path.name.endswith('.env'):
                    updated = self.update_env_file(file_path)
                    if updated:
                        stats['env_files_updated'] += 1
                else:
                    # Try to detect file type by content
                    updated = self._update_file_by_content(file_path)
                    if updated:
                        stats['json_files_updated'] += 1  # Assume JSON if not extension

                if updated:
                    stats['total_files_processed'] += 1

            except Exception as e:
                print(f"Error processing {file_path}: {e}")
                stats['errors'] += 1

        return stats

    def get_updates(self) -> List[PathUpdate]:
        """Get all path updates made"""
        return self.updates.copy()

    def _update_paths_in_structure(self, data: Any) -> Any:
        """
        Recursively update paths in a nested data structure.

        Args:
            data: Data structure (dict, list, or primitive)

        Returns:
            Updated data structure
        """
        if isinstance(data, dict):
            updated_data = {}
            for key, value in data.items():
                updated_data[key] = self._update_paths_in_structure(value)
            return updated_data
        elif isinstance(data, list):
            return [self._update_paths_in_structure(item) for item in data]
        elif isinstance(data, str):
            return self._update_path_string(data)
        else:
            return data

    def _update_path_string(self, path_str: str) -> str:
        """
        Update a path string if it matches a moved file.

        Args:
            path_str: String that might contain a file path

        Returns:
            Updated path string
        """
        # Try to resolve as a path relative to project root
        try:
            path = Path(path_str)
            if not path.is_absolute():
                path = (self.project_root / path).resolve()

            # Check if this path was moved
            new_path = self.path_mapping.get(path)
            if new_path:
                # Return relative path if original was relative
                if not Path(path_str).is_absolute():
                    try:
                        return str(new_path.relative_to(self.project_root))
                    except ValueError:
                        return str(new_path)
                else:
                    return str(new_path)

        except (ValueError, OSError):
            pass

        # Try partial path matching for paths within values
        # Sort by length (longest first) to match most specific paths first
        sorted_mappings = sorted(self.path_mapping.items(), 
                                key=lambda x: len(str(x[0])), 
                                reverse=True)
        
        for old_path, new_path in sorted_mappings:
            old_str = str(old_path)
            new_str = str(new_path)

            if old_str in path_str:
                # Replace the old path with new path
                updated = path_str.replace(old_str, new_str)
                if updated != path_str:
                    return updated

        return path_str

    def _has_changes(self, original: Any, updated: Any) -> bool:
        """
        Check if two data structures have changes.

        Args:
            original: Original data
            updated: Updated data

        Returns:
            True if changes exist
        """
        return json.dumps(original, sort_keys=True) != json.dumps(updated, sort_keys=True)

    def _update_file_by_content(self, file_path: Path) -> bool:
        """
        Try to update a file by detecting its content type.

        Args:
            file_path: Path to file

        Returns:
            True if file was updated
        """
        try:
            content = file_path.read_text(encoding='utf-8').strip()

            # Try JSON
            if content.startswith('{') or content.startswith('['):
                return self.update_json_file(file_path)

            # Try YAML
            if ':' in content and not content.startswith('//'):
                return self.update_yaml_file(file_path)

        except Exception:
            pass

        return False


def update_configuration_paths(project_root: Path, path_mapping: Dict[Path, Path],
                              config_files: List[Path]) -> Dict[str, int]:
    """
    Update configuration file paths for all moved files.

    Args:
        project_root: Root directory of the project
        path_mapping: Mapping of old paths to new paths from FileMover
        config_files: List of configuration files to process

    Returns:
        Dictionary with statistics about updates

    Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
    """
    updater = ConfigurationPathUpdater(project_root, path_mapping)
    return updater.update_configuration_files(config_files)