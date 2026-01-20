"""
TypeScript Import Updater Module

This module provides functionality to update TypeScript/JavaScript import statements
after file movements. It parses TypeScript files, calculates new import paths, and
updates configuration files (tsconfig.json, vite.config.ts) to maintain functionality
after reorganization.

Requirements: 10.1, 10.2, 10.3, 10.4
"""

import re
import json
from pathlib import Path
from typing import List, Dict, Set, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class TypeScriptImport:
    """Represents a TypeScript/JavaScript import statement"""
    module_path: str
    imported_names: List[str]
    import_type: str  # 'named', 'default', 'namespace', 'side-effect'
    line_number: int
    original_text: str
    is_relative: bool
    
    def __post_init__(self):
        """Determine if import is relative"""
        self.is_relative = self.module_path.startswith('.') or self.module_path.startswith('/')


@dataclass
class ImportUpdate:
    """Represents an import statement update"""
    file_path: Path
    old_import: str
    new_import: str
    line_number: int


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
            Relative import string (e.g., '../module' or './submodule')
        """
        try:
            # Get relative path from source directory to target
            from_dir = from_file.parent
            rel_path = to_file.relative_to(from_dir)
            
            # Convert to import path (remove extension, use forward slashes)
            import_path = str(rel_path.with_suffix('')).replace('\\', '/')
            
            # Add leading ./ for same directory imports
            if '/' not in import_path:
                return f"./{import_path}"
            
            return import_path
        except ValueError:
            # Files are not in relative paths, need to go up
            # Find common ancestor
            try:
                # Calculate relative path going up and down
                rel_path = Path(to_file).relative_to(from_dir.parent)
                path_str = str(rel_path.with_suffix('')).replace('\\', '/')
                import_path = f"../{path_str}"
                return import_path
            except ValueError:
                # More complex case - calculate full relative path
                from_parts = list(from_dir.parts)
                to_parts = list(to_file.parent.parts)
                
                # Find common prefix
                common_length = 0
                for i, (f, t) in enumerate(zip(from_parts, to_parts)):
                    if f == t:
                        common_length = i + 1
                    else:
                        break
                
                # Calculate ups and downs
                ups = len(from_parts) - common_length
                downs = to_parts[common_length:]
                
                # Build path
                path_parts = ['..'] * ups + list(downs) + [to_file.stem]
                return '/'.join(path_parts)


class TypeScriptImportUpdater:
    """
    Updates TypeScript/JavaScript import statements after file movements.
    
    This class provides functionality to:
    - Parse TypeScript files and extract import statements
    - Update import paths to reflect new file locations
    - Update tsconfig.json path mappings
    - Update Vite configuration for new source paths
    - Preserve React component module resolution
    
    Requirements: 10.1, 10.2, 10.3, 10.4
    """
    
    # Import statement patterns
    IMPORT_PATTERNS = [
        # import { name } from 'module'
        r'import\s*\{([^}]+)\}\s*from\s*[\'"]([^\'"]+)[\'"]',
        # import name from 'module'
        r'import\s+(\w+)\s+from\s*[\'"]([^\'"]+)[\'"]',
        # import * as name from 'module'
        r'import\s*\*\s*as\s+(\w+)\s+from\s*[\'"]([^\'"]+)[\'"]',
        # import 'module' (side-effect)
        r'import\s*[\'"]([^\'"]+)[\'"]',
    ]
    
    # TypeScript file extensions
    TS_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'}
    
    def __init__(self, project_root: Path, path_mapping: PathMapping):
        """
        Initialize TypeScriptImportUpdater.
        
        Args:
            project_root: Root directory of the project
            path_mapping: Mapping of old paths to new paths
        """
        self.project_root = Path(project_root).resolve()
        self.path_mapping = path_mapping
        self.updates: List[ImportUpdate] = []
    
    def extract_imports(self, file_path: Path) -> List[TypeScriptImport]:
        """
        Parse TypeScript file and extract all import statements.
        
        Args:
            file_path: Path to TypeScript file
            
        Returns:
            List of TypeScriptImport objects
            
        Requirements: 10.1
        """
        imports = []
        
        try:
            content = file_path.read_text(encoding='utf-8')
            lines = content.splitlines()
            
            for line_num, line in enumerate(lines, start=1):
                # Skip comments
                if line.strip().startswith('//') or line.strip().startswith('/*'):
                    continue
                
                # Try each import pattern
                for pattern in self.IMPORT_PATTERNS:
                    match = re.search(pattern, line)
                    if match:
                        import_obj = self._parse_import_match(match, line, line_num)
                        if import_obj:
                            imports.append(import_obj)
                        break
        
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}")
        
        return imports
    
    def calculate_new_import_path(self, file_path: Path, import_stmt: TypeScriptImport) -> Optional[str]:
        """
        Calculate new import path based on file movements.
        
        Args:
            file_path: Path to file containing the import
            import_stmt: Import statement to update
            
        Returns:
            New import path string, or None if no update needed
            
        Requirements: 10.1, 10.2
        """
        # Skip external packages (not relative imports)
        if not import_stmt.is_relative:
            return None
        
        # Get new location of the importing file
        new_file_path = self.path_mapping.get_new_path(file_path)
        if new_file_path is None:
            new_file_path = file_path
        
        # Resolve the imported file
        imported_file = self._resolve_import_path(file_path, import_stmt.module_path)
        if imported_file is None:
            return None
        
        # Check if imported file moved
        new_imported_file = self.path_mapping.get_new_path(imported_file)
        if new_imported_file is None:
            new_imported_file = imported_file
        
        # Calculate new relative path
        new_import_path = self.path_mapping.get_relative_import(new_file_path, new_imported_file)
        
        # Return None if path unchanged
        if new_import_path == import_stmt.module_path:
            return None
        
        return new_import_path
    
    def update_imports(self, file_path: Path) -> int:
        """
        Update all import statements in a TypeScript file.
        
        Args:
            file_path: Path to TypeScript file
            
        Returns:
            Number of imports updated
            
        Requirements: 10.1, 10.2
        """
        imports = self.extract_imports(file_path)
        updates_count = 0
        
        for import_stmt in imports:
            new_path = self.calculate_new_import_path(file_path, import_stmt)
            
            if new_path:
                # Build new import statement
                new_import = self._build_import_statement(import_stmt, new_path)
                
                self.updates.append(ImportUpdate(
                    file_path=file_path,
                    old_import=import_stmt.original_text,
                    new_import=new_import,
                    line_number=import_stmt.line_number
                ))
                updates_count += 1
        
        return updates_count
    
    def apply_updates(self, file_path: Path) -> bool:
        """
        Apply all pending import updates to a file.
        
        Args:
            file_path: Path to TypeScript file
            
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
            
            # Sort updates by line number (descending) to avoid offset issues
            file_updates.sort(key=lambda u: u.line_number, reverse=True)
            
            # Apply each update using string replacement
            for update in file_updates:
                content = content.replace(update.old_import, update.new_import, 1)
            
            # Write updated content
            file_path.write_text(content, encoding='utf-8')
            
            return True
        
        except Exception as e:
            print(f"Error applying updates to {file_path}: {e}")
            return False
    
    def update_tsconfig(self, tsconfig_path: Path) -> bool:
        """
        Update tsconfig.json path mappings to reflect new structure.
        
        Args:
            tsconfig_path: Path to tsconfig.json file
            
        Returns:
            True if update was successful
            
        Requirements: 10.2, 10.3
        """
        try:
            # Read tsconfig.json
            with open(tsconfig_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Update compilerOptions.paths if present
            if 'compilerOptions' in config and 'paths' in config['compilerOptions']:
                paths = config['compilerOptions']['paths']
                updated_paths = {}
                
                for alias, path_list in paths.items():
                    updated_list = []
                    for path_str in path_list:
                        # Update path based on mappings
                        updated_path = self._update_config_path(Path(path_str))
                        updated_list.append(str(updated_path))
                    updated_paths[alias] = updated_list
                
                config['compilerOptions']['paths'] = updated_paths
            
            # Update baseUrl if present
            if 'compilerOptions' in config and 'baseUrl' in config['compilerOptions']:
                base_url = config['compilerOptions']['baseUrl']
                updated_base = self._update_config_path(Path(base_url))
                config['compilerOptions']['baseUrl'] = str(updated_base)
            
            # Update include/exclude patterns
            for key in ['include', 'exclude']:
                if key in config:
                    updated_patterns = []
                    for pattern in config[key]:
                        updated_pattern = self._update_glob_pattern(pattern)
                        updated_patterns.append(updated_pattern)
                    config[key] = updated_patterns
            
            # Write updated config
            with open(tsconfig_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2)
            
            return True
        
        except Exception as e:
            print(f"Error updating tsconfig.json: {e}")
            return False
    
    def update_vite_config(self, vite_config_path: Path) -> bool:
        """
        Update Vite configuration for new source paths.
        
        Args:
            vite_config_path: Path to vite.config.ts file
            
        Returns:
            True if update was successful
            
        Requirements: 10.3, 10.4
        """
        try:
            # Read vite config
            content = vite_config_path.read_text(encoding='utf-8')
            
            # Update resolve.alias paths
            alias_pattern = r'resolve:\s*\{[^}]*alias:\s*\{([^}]+)\}'
            alias_match = re.search(alias_pattern, content, re.DOTALL)
            
            if alias_match:
                alias_block = alias_match.group(1)
                
                # Find path definitions
                path_pattern = r'[\'"]([^\'"]+)[\'"]\s*:\s*[\'"]([^\'"]+)[\'"]'
                
                def replace_path(match):
                    key = match.group(1)
                    path = match.group(2)
                    updated_path = self._update_config_path(Path(path))
                    return f"'{key}': '{updated_path}'"
                
                updated_alias = re.sub(path_pattern, replace_path, alias_block)
                content = content.replace(alias_block, updated_alias)
            
            # Update root path if present
            root_pattern = r'root:\s*[\'"]([^\'"]+)[\'"]'
            root_match = re.search(root_pattern, content)
            
            if root_match:
                old_root = root_match.group(1)
                new_root = self._update_config_path(Path(old_root))
                content = content.replace(f"root: '{old_root}'", f"root: '{new_root}'")
            
            # Update build.outDir if present
            outdir_pattern = r'outDir:\s*[\'"]([^\'"]+)[\'"]'
            outdir_match = re.search(outdir_pattern, content)
            
            if outdir_match:
                old_outdir = outdir_match.group(1)
                new_outdir = self._update_config_path(Path(old_outdir))
                content = content.replace(f"outDir: '{old_outdir}'", f"outDir: '{new_outdir}'")
            
            # Write updated config
            vite_config_path.write_text(content, encoding='utf-8')
            
            return True
        
        except Exception as e:
            print(f"Error updating vite.config.ts: {e}")
            return False
    
    def get_updates(self) -> List[ImportUpdate]:
        """Get all pending import updates"""
        return self.updates.copy()
    
    def _parse_import_match(self, match: re.Match, line: str, line_num: int) -> Optional[TypeScriptImport]:
        """
        Parse regex match into TypeScriptImport object.
        
        Args:
            match: Regex match object
            line: Original line text
            line_num: Line number
            
        Returns:
            TypeScriptImport object or None
        """
        groups = match.groups()
        
        # Side-effect import: import 'module'
        if len(groups) == 1:
            return TypeScriptImport(
                module_path=groups[0],
                imported_names=[],
                import_type='side-effect',
                line_number=line_num,
                original_text=line.strip(),
                is_relative=groups[0].startswith('.')
            )
        
        # Named or default import
        elif len(groups) == 2:
            names_str, module_path = groups
            
            # Determine import type
            if '{' in line:
                import_type = 'named'
                names = [n.strip() for n in names_str.split(',')]
            elif '*' in line:
                import_type = 'namespace'
                names = [names_str.strip()]
            else:
                import_type = 'default'
                names = [names_str.strip()]
            
            return TypeScriptImport(
                module_path=module_path,
                imported_names=names,
                import_type=import_type,
                line_number=line_num,
                original_text=line.strip(),
                is_relative=module_path.startswith('.')
            )
        
        return None
    
    def _resolve_import_path(self, from_file: Path, import_path: str) -> Optional[Path]:
        """
        Resolve import path to actual file path.
        
        Args:
            from_file: File containing the import
            import_path: Import path string
            
        Returns:
            Resolved file path or None
        """
        # Handle relative imports
        if import_path.startswith('.'):
            base_dir = from_file.parent
            target_path = (base_dir / import_path).resolve()
            
            # Try with various extensions
            for ext in self.TS_EXTENSIONS:
                test_file = target_path.with_suffix(ext)
                if test_file.exists():
                    return test_file
            
            # Try as directory with index file
            for ext in self.TS_EXTENSIONS:
                test_file = target_path / f"index{ext}"
                if test_file.exists():
                    return test_file
        
        return None
    
    def _build_import_statement(self, import_stmt: TypeScriptImport, new_path: str) -> str:
        """
        Build import statement text with new module path.
        
        Args:
            import_stmt: Original import statement
            new_path: New module path
            
        Returns:
            New import statement text
        """
        if import_stmt.import_type == 'side-effect':
            return f"import '{new_path}'"
        
        elif import_stmt.import_type == 'named':
            names_str = ', '.join(import_stmt.imported_names)
            return f"import {{ {names_str} }} from '{new_path}'"
        
        elif import_stmt.import_type == 'namespace':
            return f"import * as {import_stmt.imported_names[0]} from '{new_path}'"
        
        elif import_stmt.import_type == 'default':
            return f"import {import_stmt.imported_names[0]} from '{new_path}'"
        
        return import_stmt.original_text
    
    def _update_config_path(self, path: Path) -> Path:
        """
        Update a configuration path based on mappings.
        
        Args:
            path: Original path
            
        Returns:
            Updated path
        """
        # Check if this path or any parent was moved
        full_path = (self.project_root / path).resolve()
        
        new_path = self.path_mapping.get_new_path(full_path)
        if new_path:
            try:
                return new_path.relative_to(self.project_root)
            except ValueError:
                return new_path
        
        return path
    
    def _update_glob_pattern(self, pattern: str) -> str:
        """
        Update a glob pattern based on directory movements.
        
        Args:
            pattern: Original glob pattern
            
        Returns:
            Updated glob pattern
        """
        # Simple heuristic: update known directory names
        directory_mappings = {
            'creative-studio-ui/src': 'frontend',
            'src': 'src',
            'tests': 'tests',
            'electron': 'electron'
        }
        
        for old_dir, new_dir in directory_mappings.items():
            if old_dir in pattern:
                pattern = pattern.replace(old_dir, new_dir)
        
        return pattern


def update_typescript_imports(project_root: Path, path_mapping: PathMapping,
                              typescript_files: List[Path]) -> Dict[str, int]:
    """
    Update TypeScript imports for all moved files.
    
    Args:
        project_root: Root directory of the project
        path_mapping: Mapping of old paths to new paths
        typescript_files: List of TypeScript files to process
        
    Returns:
        Dictionary with statistics about updates
        
    Requirements: 10.1, 10.2, 10.3, 10.4
    """
    updater = TypeScriptImportUpdater(project_root, path_mapping)
    
    stats = {
        'files_processed': 0,
        'imports_updated': 0,
        'tsconfig_updated': 0,
        'vite_config_updated': 0,
        'errors': 0
    }
    
    # Process each TypeScript file
    for file_path in typescript_files:
        try:
            # Update imports
            count = updater.update_imports(file_path)
            stats['imports_updated'] += count
            
            # Apply updates
            if count > 0:
                updater.apply_updates(file_path)
            
            stats['files_processed'] += 1
        
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            stats['errors'] += 1
    
    # Update tsconfig.json files
    for tsconfig in project_root.rglob('tsconfig*.json'):
        try:
            if updater.update_tsconfig(tsconfig):
                stats['tsconfig_updated'] += 1
        except Exception as e:
            print(f"Error updating {tsconfig}: {e}")
    
    # Update vite.config.ts files
    for vite_config in project_root.rglob('vite.config.*'):
        try:
            if updater.update_vite_config(vite_config):
                stats['vite_config_updated'] += 1
        except Exception as e:
            print(f"Error updating {vite_config}: {e}")
    
    return stats
