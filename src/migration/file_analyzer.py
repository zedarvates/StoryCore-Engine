"""
File Analyzer for Project Structure Reorganization

This module provides file scanning, categorization, and dependency analysis
capabilities for the migration process.
"""

import ast
import re
import json
from pathlib import Path
from typing import List, Dict, Set, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum


class FileCategory(Enum):
    """Categories for file classification"""
    PYTHON_SOURCE = "python_source"
    TYPESCRIPT_SOURCE = "typescript_source"
    REACT_COMPONENT = "react_component"
    ELECTRON_SOURCE = "electron_source"
    PYTHON_TEST = "python_test"
    TYPESCRIPT_TEST = "typescript_test"
    CONFIGURATION = "configuration"
    DOCUMENTATION = "documentation"
    ASSET_IMAGE = "asset_image"
    ASSET_AUDIO = "asset_audio"
    ASSET_VIDEO = "asset_video"
    ASSET_ICON = "asset_icon"
    ASSET_FONT = "asset_font"
    BUILD_ARTIFACT = "build_artifact"
    TEMPORARY = "temporary"
    MODEL_FILE = "model_file"
    WORKFLOW = "workflow"
    DEMO_PROJECT = "demo_project"
    TOOL_SCRIPT = "tool_script"
    UNKNOWN = "unknown"


@dataclass
class FileInfo:
    """Information about a single file"""
    path: Path
    category: FileCategory
    size_bytes: int
    dependencies: List[Path] = field(default_factory=list)
    is_test: bool = False
    language: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'path': str(self.path),
            'category': self.category.value,
            'size_bytes': self.size_bytes,
            'dependencies': [str(d) for d in self.dependencies],
            'is_test': self.is_test,
            'language': self.language
        }


@dataclass
class ProjectStructure:
    """Complete project structure analysis"""
    root: Path
    python_files: List[FileInfo] = field(default_factory=list)
    typescript_files: List[FileInfo] = field(default_factory=list)
    config_files: List[FileInfo] = field(default_factory=list)
    doc_files: List[FileInfo] = field(default_factory=list)
    test_files: List[FileInfo] = field(default_factory=list)
    asset_files: List[FileInfo] = field(default_factory=list)
    build_artifacts: List[FileInfo] = field(default_factory=list)
    temp_files: List[FileInfo] = field(default_factory=list)
    model_files: List[FileInfo] = field(default_factory=list)
    workflow_files: List[FileInfo] = field(default_factory=list)
    demo_files: List[FileInfo] = field(default_factory=list)
    tool_files: List[FileInfo] = field(default_factory=list)
    unknown_files: List[FileInfo] = field(default_factory=list)
    total_files: int = 0
    total_size: int = 0
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'root': str(self.root),
            'python_files': [f.to_dict() for f in self.python_files],
            'typescript_files': [f.to_dict() for f in self.typescript_files],
            'config_files': [f.to_dict() for f in self.config_files],
            'doc_files': [f.to_dict() for f in self.doc_files],
            'test_files': [f.to_dict() for f in self.test_files],
            'asset_files': [f.to_dict() for f in self.asset_files],
            'build_artifacts': [f.to_dict() for f in self.build_artifacts],
            'temp_files': [f.to_dict() for f in self.temp_files],
            'model_files': [f.to_dict() for f in self.model_files],
            'workflow_files': [f.to_dict() for f in self.workflow_files],
            'demo_files': [f.to_dict() for f in self.demo_files],
            'tool_files': [f.to_dict() for f in self.tool_files],
            'unknown_files': [f.to_dict() for f in self.unknown_files],
            'total_files': self.total_files,
            'total_size': self.total_size
        }


@dataclass
class DependencyGraph:
    """Dependency relationships between files"""
    nodes: Dict[Path, Set[Path]] = field(default_factory=dict)
    
    def add_dependency(self, source: Path, target: Path):
        """Add a dependency from source to target"""
        if source not in self.nodes:
            self.nodes[source] = set()
        self.nodes[source].add(target)
    
    def get_dependencies(self, file_path: Path) -> Set[Path]:
        """Get all dependencies for a file"""
        return self.nodes.get(file_path, set())
    
    def get_dependents(self, file_path: Path) -> Set[Path]:
        """Get all files that depend on this file"""
        dependents = set()
        for source, targets in self.nodes.items():
            if file_path in targets:
                dependents.add(source)
        return dependents
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            str(source): [str(target) for target in targets]
            for source, targets in self.nodes.items()
        }


@dataclass
class FileMovement:
    """Represents a planned file movement"""
    source: Path
    destination: Path
    category: FileCategory
    preserve_history: bool = True
    dependencies: List[Path] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'source': str(self.source),
            'destination': str(self.destination),
            'category': self.category.value,
            'preserve_history': self.preserve_history,
            'dependencies': [str(d) for d in self.dependencies]
        }


@dataclass
class MovementPlan:
    """Complete file movement plan"""
    movements: List[FileMovement] = field(default_factory=list)
    
    def add_movement(self, movement: FileMovement):
        """Add a file movement to the plan"""
        self.movements.append(movement)
    
    def get_movements_by_category(self, category: FileCategory) -> List[FileMovement]:
        """Get all movements for a specific category"""
        return [m for m in self.movements if m.category == category]
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'movements': [m.to_dict() for m in self.movements],
            'total_movements': len(self.movements)
        }


class FileAnalyzer:
    """
    Analyzes project files and generates migration plans.
    
    Scans project directories, categorizes files by type, analyzes dependencies,
    and generates file movement plans for reorganization.
    """
    
    # File extensions for different categories
    PYTHON_EXTENSIONS = {'.py'}
    TYPESCRIPT_EXTENSIONS = {'.ts', '.tsx'}
    CONFIG_EXTENSIONS = {'.json', '.yaml', '.yml', '.toml', '.ini', '.env', '.config'}
    DOC_EXTENSIONS = {'.md', '.rst', '.txt'}
    IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.ico', '.webp'}
    AUDIO_EXTENSIONS = {'.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'}
    VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'}
    FONT_EXTENSIONS = {'.ttf', '.otf', '.woff', '.woff2', '.eot'}
    
    # Directories to skip during scanning
    SKIP_DIRECTORIES = {
        'node_modules', '__pycache__', '.git', '.venv', 'venv',
        '.pytest_cache', '.hypothesis', 'dist', 'build', '.next',
        'coverage', '.coverage', 'htmlcov', '.mypy_cache', '.tox'
    }
    
    # Patterns for identifying file types
    TEST_PATTERNS = [
        r'^test_.*\.py$',
        r'.*_test\.py$',
        r'.*\.test\.(ts|tsx|js|jsx)$',
        r'.*\.spec\.(ts|tsx|js|jsx)$'
    ]
    
    DEMO_PATTERNS = [
        r'.*-demo$',
        r'demo-.*',
        r'test-.*-project$',
        r'.*_demo$'
    ]
    
    BUILD_ARTIFACT_PATTERNS = [
        r'.*\.pyc$',
        r'.*\.pyo$',
        r'.*\.so$',
        r'.*\.dll$',
        r'.*\.dylib$',
        r'.*\.egg-info$',
        r'.*\.whl$'
    ]
    
    TEMP_PATTERNS = [
        r'.*\.tmp$',
        r'.*\.temp$',
        r'.*\.cache$',
        r'.*\.log$',
        r'.*~$'
    ]
    
    def __init__(self, project_root: Path):
        """
        Initialize FileAnalyzer.
        
        Args:
            project_root: Root directory of the project to analyze
        """
        self.project_root = Path(project_root).resolve()
        if not self.project_root.exists():
            raise FileNotFoundError(f"Project root does not exist: {self.project_root}")
    
    def scan_project(self) -> ProjectStructure:
        """
        Scan and categorize all project files.
        
        Returns:
            ProjectStructure object containing categorized files
        """
        print(f"Scanning project: {self.project_root}")
        
        structure = ProjectStructure(root=self.project_root)
        
        # Recursively scan all files
        for file_path in self.project_root.rglob('*'):
            # Skip directories and files in skip directories
            if file_path.is_dir():
                continue
            
            if self._should_skip_file(file_path):
                continue
            
            # Categorize and add to structure
            file_info = self._create_file_info(file_path)
            self._add_to_structure(structure, file_info)
            
            structure.total_files += 1
            structure.total_size += file_info.size_bytes
            
            if structure.total_files % 100 == 0:
                print(f"  Scanned {structure.total_files} files...")
        
        print(f"Scan complete: {structure.total_files} files ({structure.total_size / (1024*1024):.2f} MB)")
        self._print_summary(structure)
        
        return structure
    
    def analyze_dependencies(self, files: List[FileInfo]) -> DependencyGraph:
        """
        Analyze import and reference dependencies between files.
        
        Args:
            files: List of FileInfo objects to analyze
            
        Returns:
            DependencyGraph object containing dependency relationships
        """
        print("Analyzing dependencies...")
        
        graph = DependencyGraph()
        
        for file_info in files:
            if file_info.category == FileCategory.PYTHON_SOURCE or file_info.category == FileCategory.PYTHON_TEST:
                deps = self._extract_python_imports(file_info.path)
                file_info.dependencies = deps
                for dep in deps:
                    graph.add_dependency(file_info.path, dep)
            
            elif file_info.category in [FileCategory.TYPESCRIPT_SOURCE, FileCategory.REACT_COMPONENT, 
                                       FileCategory.ELECTRON_SOURCE, FileCategory.TYPESCRIPT_TEST]:
                deps = self._extract_typescript_imports(file_info.path)
                file_info.dependencies = deps
                for dep in deps:
                    graph.add_dependency(file_info.path, dep)
        
        print(f"Dependency analysis complete: {len(graph.nodes)} files with dependencies")
        
        return graph
    
    def categorize_file(self, file_path: Path) -> FileCategory:
        """
        Determine the appropriate category for a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            FileCategory enum value
        """
        file_path = Path(file_path)
        filename = file_path.name
        extension = file_path.suffix.lower()
        relative_path = file_path.relative_to(self.project_root) if file_path.is_relative_to(self.project_root) else file_path
        
        # Check if it's a test file
        is_test = self._is_test_file(filename)
        
        # Check for demo projects
        if self._is_demo_project(relative_path):
            return FileCategory.DEMO_PROJECT
        
        # Check for workflows
        if 'workflow' in str(relative_path).lower() and extension == '.json':
            return FileCategory.WORKFLOW
        
        # Check for model files
        if 'model' in str(relative_path).lower() and extension in {'.safetensors', '.ckpt', '.pth', '.bin'}:
            return FileCategory.MODEL_FILE
        
        # Categorize by extension and content
        if extension in self.PYTHON_EXTENSIONS:
            return FileCategory.PYTHON_TEST if is_test else FileCategory.PYTHON_SOURCE
        
        elif extension in self.TYPESCRIPT_EXTENSIONS:
            if is_test:
                return FileCategory.TYPESCRIPT_TEST
            elif 'electron' in str(relative_path).lower():
                return FileCategory.ELECTRON_SOURCE
            elif self._is_react_component(file_path):
                return FileCategory.REACT_COMPONENT
            else:
                return FileCategory.TYPESCRIPT_SOURCE
        
        elif extension in self.CONFIG_EXTENSIONS:
            return FileCategory.CONFIGURATION
        
        elif extension in self.DOC_EXTENSIONS:
            return FileCategory.DOCUMENTATION
        
        elif extension in self.IMAGE_EXTENSIONS:
            if 'icon' in filename.lower():
                return FileCategory.ASSET_ICON
            return FileCategory.ASSET_IMAGE
        
        elif extension in self.AUDIO_EXTENSIONS:
            return FileCategory.ASSET_AUDIO
        
        elif extension in self.VIDEO_EXTENSIONS:
            return FileCategory.ASSET_VIDEO
        
        elif extension in self.FONT_EXTENSIONS:
            return FileCategory.ASSET_FONT
        
        elif self._is_build_artifact(filename):
            return FileCategory.BUILD_ARTIFACT
        
        elif self._is_temporary_file(filename):
            return FileCategory.TEMPORARY
        
        elif extension in {'.sh', '.bat', '.ps1'}:
            return FileCategory.TOOL_SCRIPT
        
        return FileCategory.UNKNOWN
    
    def generate_movement_plan(self, structure: ProjectStructure) -> MovementPlan:
        """
        Generate a file movement plan based on categorization.
        
        Args:
            structure: ProjectStructure object from scan_project
            
        Returns:
            MovementPlan object containing all planned file movements
        """
        print("Generating movement plan...")
        
        plan = MovementPlan()
        
        # Define target directories for each category
        category_targets = {
            FileCategory.PYTHON_SOURCE: Path('src'),
            FileCategory.PYTHON_TEST: Path('tests/unit'),
            FileCategory.TYPESCRIPT_SOURCE: Path('frontend'),
            FileCategory.REACT_COMPONENT: Path('frontend/components'),
            FileCategory.ELECTRON_SOURCE: Path('electron'),
            FileCategory.TYPESCRIPT_TEST: Path('tests/unit'),
            FileCategory.CONFIGURATION: Path('config'),
            FileCategory.DOCUMENTATION: Path('docs'),
            FileCategory.ASSET_IMAGE: Path('assets/images'),
            FileCategory.ASSET_AUDIO: Path('assets/audio'),
            FileCategory.ASSET_VIDEO: Path('assets/video'),
            FileCategory.ASSET_ICON: Path('assets/icons'),
            FileCategory.ASSET_FONT: Path('assets/fonts'),
            FileCategory.BUILD_ARTIFACT: Path('build'),
            FileCategory.MODEL_FILE: Path('models'),
            FileCategory.WORKFLOW: Path('workflows'),
            FileCategory.DEMO_PROJECT: Path('examples/demos'),
            FileCategory.TOOL_SCRIPT: Path('tools/scripts')
        }
        
        # Process all file categories
        all_files = (
            structure.python_files + structure.typescript_files + 
            structure.config_files + structure.doc_files + 
            structure.test_files + structure.asset_files + 
            structure.build_artifacts + structure.model_files +
            structure.workflow_files + structure.demo_files + 
            structure.tool_files
        )
        
        for file_info in all_files:
            target_base = category_targets.get(file_info.category)
            
            if target_base is None:
                # Skip files without a target (temporary, unknown, etc.)
                continue
            
            # Calculate destination path
            relative_path = file_info.path.relative_to(self.project_root)
            
            # For source files, preserve some directory structure
            if file_info.category in [FileCategory.PYTHON_SOURCE, FileCategory.TYPESCRIPT_SOURCE]:
                destination = self.project_root / target_base / relative_path.name
            else:
                destination = self.project_root / target_base / relative_path.name
            
            # Create movement
            movement = FileMovement(
                source=file_info.path,
                destination=destination,
                category=file_info.category,
                preserve_history=True,
                dependencies=file_info.dependencies
            )
            
            plan.add_movement(movement)
        
        print(f"Movement plan generated: {len(plan.movements)} files to move")
        
        return plan
    
    def _create_file_info(self, file_path: Path) -> FileInfo:
        """Create FileInfo object for a file"""
        category = self.categorize_file(file_path)
        size_bytes = file_path.stat().st_size
        is_test = self._is_test_file(file_path.name)
        
        language = None
        if category in [FileCategory.PYTHON_SOURCE, FileCategory.PYTHON_TEST]:
            language = 'python'
        elif category in [FileCategory.TYPESCRIPT_SOURCE, FileCategory.REACT_COMPONENT, 
                         FileCategory.ELECTRON_SOURCE, FileCategory.TYPESCRIPT_TEST]:
            language = 'typescript'
        
        return FileInfo(
            path=file_path,
            category=category,
            size_bytes=size_bytes,
            is_test=is_test,
            language=language
        )
    
    def _add_to_structure(self, structure: ProjectStructure, file_info: FileInfo):
        """Add file info to appropriate category in structure"""
        category_map = {
            FileCategory.PYTHON_SOURCE: structure.python_files,
            FileCategory.PYTHON_TEST: structure.test_files,
            FileCategory.TYPESCRIPT_SOURCE: structure.typescript_files,
            FileCategory.REACT_COMPONENT: structure.typescript_files,
            FileCategory.ELECTRON_SOURCE: structure.typescript_files,
            FileCategory.TYPESCRIPT_TEST: structure.test_files,
            FileCategory.CONFIGURATION: structure.config_files,
            FileCategory.DOCUMENTATION: structure.doc_files,
            FileCategory.ASSET_IMAGE: structure.asset_files,
            FileCategory.ASSET_AUDIO: structure.asset_files,
            FileCategory.ASSET_VIDEO: structure.asset_files,
            FileCategory.ASSET_ICON: structure.asset_files,
            FileCategory.ASSET_FONT: structure.asset_files,
            FileCategory.BUILD_ARTIFACT: structure.build_artifacts,
            FileCategory.TEMPORARY: structure.temp_files,
            FileCategory.MODEL_FILE: structure.model_files,
            FileCategory.WORKFLOW: structure.workflow_files,
            FileCategory.DEMO_PROJECT: structure.demo_files,
            FileCategory.TOOL_SCRIPT: structure.tool_files,
            FileCategory.UNKNOWN: structure.unknown_files
        }
        
        target_list = category_map.get(file_info.category)
        if target_list is not None:
            target_list.append(file_info)
    
    def _should_skip_file(self, file_path: Path) -> bool:
        """Check if file should be skipped during scanning"""
        # Check if any parent directory is in skip list
        for parent in file_path.parents:
            if parent.name in self.SKIP_DIRECTORIES:
                return True
        
        return False
    
    def _is_test_file(self, filename: str) -> bool:
        """Check if filename matches test patterns"""
        for pattern in self.TEST_PATTERNS:
            if re.match(pattern, filename):
                return True
        return False
    
    def _is_demo_project(self, path: Path) -> bool:
        """Check if path is part of a demo project"""
        path_str = str(path)
        for pattern in self.DEMO_PATTERNS:
            if re.search(pattern, path_str):
                return True
        return False
    
    def _is_build_artifact(self, filename: str) -> bool:
        """Check if filename is a build artifact"""
        for pattern in self.BUILD_ARTIFACT_PATTERNS:
            if re.match(pattern, filename):
                return True
        return False
    
    def _is_temporary_file(self, filename: str) -> bool:
        """Check if filename is a temporary file"""
        for pattern in self.TEMP_PATTERNS:
            if re.match(pattern, filename):
                return True
        return False
    
    def _is_react_component(self, file_path: Path) -> bool:
        """Check if TypeScript file is a React component"""
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            # Simple heuristic: check for React imports and JSX
            return 'import React' in content or 'from \'react\'' in content or 'from "react"' in content
        except Exception:
            return False
    
    def _extract_python_imports(self, file_path: Path) -> List[Path]:
        """Extract import statements from Python file"""
        dependencies = []
        
        try:
            content = file_path.read_text(encoding='utf-8')
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        # Convert module name to potential file path
                        module_path = alias.name.replace('.', '/')
                        potential_file = self.project_root / f"{module_path}.py"
                        if potential_file.exists():
                            dependencies.append(potential_file)
                
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        module_path = node.module.replace('.', '/')
                        potential_file = self.project_root / f"{module_path}.py"
                        if potential_file.exists():
                            dependencies.append(potential_file)
        
        except Exception as e:
            # Silently skip files that can't be parsed
            pass
        
        return dependencies
    
    def _extract_typescript_imports(self, file_path: Path) -> List[Path]:
        """Extract import statements from TypeScript file"""
        dependencies = []
        
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            
            # Match import statements
            import_patterns = [
                r'import\s+.*\s+from\s+[\'"](.+?)[\'"]',
                r'import\s+[\'"](.+?)[\'"]',
                r'require\([\'"](.+?)[\'"]\)'
            ]
            
            for pattern in import_patterns:
                matches = re.finditer(pattern, content)
                for match in matches:
                    import_path = match.group(1)
                    
                    # Skip external packages
                    if not import_path.startswith('.'):
                        continue
                    
                    # Resolve relative import
                    base_dir = file_path.parent
                    potential_file = (base_dir / import_path).resolve()
                    
                    # Try with various extensions
                    for ext in ['.ts', '.tsx', '.js', '.jsx']:
                        test_file = potential_file.with_suffix(ext)
                        if test_file.exists():
                            dependencies.append(test_file)
                            break
        
        except Exception:
            # Silently skip files that can't be parsed
            pass
        
        return dependencies
    
    def _print_summary(self, structure: ProjectStructure):
        """Print summary of scanned files"""
        print("\nFile Summary:")
        print(f"  Python files: {len(structure.python_files)}")
        print(f"  TypeScript files: {len(structure.typescript_files)}")
        print(f"  Test files: {len(structure.test_files)}")
        print(f"  Config files: {len(structure.config_files)}")
        print(f"  Documentation: {len(structure.doc_files)}")
        print(f"  Assets: {len(structure.asset_files)}")
        print(f"  Build artifacts: {len(structure.build_artifacts)}")
        print(f"  Model files: {len(structure.model_files)}")
        print(f"  Workflows: {len(structure.workflow_files)}")
        print(f"  Demo projects: {len(structure.demo_files)}")
        print(f"  Tool scripts: {len(structure.tool_files)}")
        print(f"  Temporary files: {len(structure.temp_files)}")
        print(f"  Unknown files: {len(structure.unknown_files)}")
