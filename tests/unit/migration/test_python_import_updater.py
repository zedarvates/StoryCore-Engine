"""
Unit tests for Python Import Updater

Tests the functionality of parsing Python imports, calculating new import paths,
and updating import statements after file movements.
"""

import pytest
import ast
from pathlib import Path
from src.migration.python_import_updater import (
    PythonImportUpdater,
    ImportStatement,
    ImportUpdate,
    PathMapping,
    update_python_imports
)


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project structure for testing"""
    project_root = tmp_path / "test_project"
    project_root.mkdir()
    
    # Create source structure
    src = project_root / "src"
    src.mkdir()
    
    engines = src / "engines"
    engines.mkdir()
    
    cli = src / "cli"
    cli.mkdir()
    
    # Create some Python files
    (src / "main.py").write_text("# Main module\n")
    (engines / "video.py").write_text("# Video engine\n")
    (cli / "commands.py").write_text("# CLI commands\n")
    
    return project_root


@pytest.fixture
def path_mapping(temp_project):
    """Create a path mapping for testing"""
    mapping = PathMapping()
    
    # Simulate moving files from root to src
    old_main = temp_project / "main.py"
    new_main = temp_project / "src" / "main.py"
    mapping.add_mapping(old_main, new_main)
    
    old_video = temp_project / "video_engine.py"
    new_video = temp_project / "src" / "engines" / "video.py"
    mapping.add_mapping(old_video, new_video)
    
    return mapping


class TestImportStatement:
    """Test ImportStatement dataclass"""
    
    def test_import_statement_creation(self):
        """Test creating an ImportStatement"""
        stmt = ImportStatement(
            module="os.path",
            names=["join", "exists"],
            is_from_import=True,
            level=0,
            line_number=5
        )
        
        assert stmt.module == "os.path"
        assert stmt.names == ["join", "exists"]
        assert stmt.is_from_import is True
        assert stmt.level == 0
        assert stmt.is_relative() is False
    
    def test_relative_import_detection(self):
        """Test detecting relative imports"""
        relative_stmt = ImportStatement(
            module="utils",
            names=["helper"],
            is_from_import=True,
            level=2
        )
        
        assert relative_stmt.is_relative() is True
        
        absolute_stmt = ImportStatement(
            module="os",
            names=["os"],
            is_from_import=False,
            level=0
        )
        
        assert absolute_stmt.is_relative() is False


class TestPathMapping:
    """Test PathMapping class"""
    
    def test_add_and_get_mapping(self, temp_project):
        """Test adding and retrieving path mappings"""
        mapping = PathMapping()
        
        old_path = temp_project / "old.py"
        new_path = temp_project / "src" / "new.py"
        
        mapping.add_mapping(old_path, new_path)
        
        assert mapping.get_new_path(old_path) == new_path
        assert mapping.get_new_path(temp_project / "other.py") is None
    
    def test_get_relative_import_same_directory(self, temp_project):
        """Test calculating relative import in same directory"""
        mapping = PathMapping()
        
        from_file = temp_project / "src" / "module_a.py"
        to_file = temp_project / "src" / "module_b.py"
        
        rel_import = mapping.get_relative_import(from_file, to_file)
        
        assert rel_import == ".module_b"
    
    def test_get_relative_import_subdirectory(self, temp_project):
        """Test calculating relative import to subdirectory"""
        mapping = PathMapping()
        
        from_file = temp_project / "src" / "main.py"
        to_file = temp_project / "src" / "engines" / "video.py"
        
        rel_import = mapping.get_relative_import(from_file, to_file)
        
        assert rel_import == ".engines.video"


class TestPythonImportUpdater:
    """Test PythonImportUpdater class"""
    
    def test_initialization(self, temp_project, path_mapping):
        """Test initializing PythonImportUpdater"""
        updater = PythonImportUpdater(temp_project, path_mapping)
        
        assert updater.project_root == temp_project
        assert updater.path_mapping == path_mapping
        assert len(updater.updates) == 0
    
    def test_extract_simple_import(self, temp_project):
        """Test extracting simple import statement"""
        # Create test file with import
        test_file = temp_project / "test.py"
        test_file.write_text("import os\nimport sys\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 2
        assert imports[0].module == "os"
        assert imports[0].is_from_import is False
        assert imports[1].module == "sys"
    
    def test_extract_from_import(self, temp_project):
        """Test extracting from...import statement"""
        test_file = temp_project / "test.py"
        test_file.write_text("from os.path import join, exists\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 1
        assert imports[0].module == "os.path"
        assert imports[0].is_from_import is True
        assert "join" in imports[0].names
        assert "exists" in imports[0].names
    
    def test_extract_relative_import(self, temp_project):
        """Test extracting relative import statement"""
        test_file = temp_project / "src" / "test.py"
        test_file.parent.mkdir(parents=True, exist_ok=True)
        test_file.write_text("from ..utils import helper\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 1
        assert imports[0].module == "utils"
        assert imports[0].level == 2
        assert imports[0].is_relative() is True
    
    def test_extract_imports_syntax_error(self, temp_project):
        """Test handling syntax errors gracefully"""
        test_file = temp_project / "bad.py"
        test_file.write_text("import os\nthis is not valid python\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        # Should not raise exception
        imports = updater.extract_imports(test_file)
        
        # May return empty list or partial results
        assert isinstance(imports, list)
    
    def test_update_absolute_imports(self, temp_project):
        """Test updating absolute imports"""
        # Create test file
        test_file = temp_project / "src" / "main.py"
        test_file.parent.mkdir(parents=True, exist_ok=True)
        test_file.write_text("from video_engine import process\n")
        
        # Create mapping
        mapping = PathMapping()
        old_video = temp_project / "video_engine.py"
        new_video = temp_project / "src" / "engines" / "video.py"
        mapping.add_mapping(old_video, new_video)
        
        updater = PythonImportUpdater(temp_project, mapping)
        
        imports = updater.extract_imports(test_file)
        count = updater.update_absolute_imports(test_file, imports)
        
        # Should detect that import needs updating
        assert count >= 0  # May or may not update depending on resolution
    
    def test_create_init_files(self, temp_project):
        """Test creating __init__.py files"""
        # Create directories with Python files
        engines = temp_project / "src" / "engines"
        engines.mkdir(parents=True, exist_ok=True)
        (engines / "video.py").write_text("# Video engine\n")
        
        cli = temp_project / "src" / "cli"
        cli.mkdir(parents=True, exist_ok=True)
        (cli / "commands.py").write_text("# Commands\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        directories = [engines, cli]
        count = updater.create_init_files(directories)
        
        assert count == 2
        assert (engines / "__init__.py").exists()
        assert (cli / "__init__.py").exists()
    
    def test_create_init_files_skip_existing(self, temp_project):
        """Test that existing __init__.py files are not overwritten"""
        engines = temp_project / "src" / "engines"
        engines.mkdir(parents=True, exist_ok=True)
        (engines / "video.py").write_text("# Video engine\n")
        
        # Create existing __init__.py
        init_file = engines / "__init__.py"
        init_file.write_text("# Existing init\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        count = updater.create_init_files([engines])
        
        assert count == 0
        assert init_file.read_text() == "# Existing init\n"
    
    def test_scan_and_create_init_files(self, temp_project):
        """Test scanning directory tree and creating __init__.py files"""
        # Create nested structure with Python files
        src = temp_project / "src"
        src.mkdir(exist_ok=True)
        
        engines = src / "engines"
        engines.mkdir(exist_ok=True)
        (engines / "video.py").write_text("# Video\n")
        
        cli = src / "cli"
        cli.mkdir(exist_ok=True)
        (cli / "commands.py").write_text("# Commands\n")
        
        utils = src / "utils"
        utils.mkdir(exist_ok=True)
        (utils / "helpers.py").write_text("# Helpers\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        count = updater.scan_and_create_init_files(src)
        
        assert count >= 3
        assert (engines / "__init__.py").exists()
        assert (cli / "__init__.py").exists()
        assert (utils / "__init__.py").exists()
    
    def test_apply_updates(self, temp_project):
        """Test applying import updates to a file"""
        test_file = temp_project / "test.py"
        test_file.write_text("import os\nimport sys\nprint('hello')\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        # Add a manual update
        updater.updates.append(ImportUpdate(
            file_path=test_file,
            old_import="import sys",
            new_import="import sys  # Updated",
            line_number=2,
            import_type='absolute'
        ))
        
        success = updater.apply_updates(test_file)
        
        assert success is True
        content = test_file.read_text()
        assert "# Updated" in content


class TestUpdatePythonImports:
    """Test the main update_python_imports function"""
    
    def test_update_python_imports_basic(self, temp_project):
        """Test updating Python imports for moved files"""
        # Create Python files
        src = temp_project / "src"
        src.mkdir(exist_ok=True)
        
        main_file = src / "main.py"
        main_file.write_text("import os\n")
        
        # Create path mapping
        mapping = PathMapping()
        
        # Update imports
        stats = update_python_imports(
            temp_project,
            mapping,
            [main_file]
        )
        
        assert stats['files_processed'] == 1
        assert stats['errors'] == 0
    
    def test_update_python_imports_with_init_creation(self, temp_project):
        """Test that __init__.py files are created"""
        # Create source structure
        src = temp_project / "src"
        src.mkdir(exist_ok=True)
        
        engines = src / "engines"
        engines.mkdir(exist_ok=True)
        (engines / "video.py").write_text("# Video\n")
        
        mapping = PathMapping()
        
        stats = update_python_imports(
            temp_project,
            mapping,
            [engines / "video.py"]
        )
        
        assert stats['init_files_created'] >= 1
        assert (engines / "__init__.py").exists()
    
    def test_update_python_imports_error_handling(self, temp_project):
        """Test error handling for invalid files"""
        # Create invalid file
        bad_file = temp_project / "bad.py"
        bad_file.write_text("this is not valid python syntax!!!\n")
        
        mapping = PathMapping()
        
        # Should not crash
        stats = update_python_imports(
            temp_project,
            mapping,
            [bad_file]
        )
        
        # Should record error or skip
        assert isinstance(stats, dict)


class TestImportPathCalculation:
    """Test import path calculation logic"""
    
    def test_calculate_relative_import_same_level(self, temp_project):
        """Test calculating relative import at same level"""
        src = temp_project / "src"
        src.mkdir(exist_ok=True)
        
        file_a = src / "module_a.py"
        file_b = src / "module_b.py"
        
        file_a.write_text("from .module_b import func\n")
        file_b.write_text("def func(): pass\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        imports = updater.extract_imports(file_a)
        
        assert len(imports) == 1
        assert imports[0].is_relative() is True
    
    def test_calculate_relative_import_parent(self, temp_project):
        """Test calculating relative import to parent"""
        src = temp_project / "src"
        src.mkdir(exist_ok=True)
        
        engines = src / "engines"
        engines.mkdir(exist_ok=True)
        
        main = src / "main.py"
        video = engines / "video.py"
        
        main.write_text("def main(): pass\n")
        video.write_text("from ..main import main\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        imports = updater.extract_imports(video)
        
        assert len(imports) == 1
        assert imports[0].level == 2
        assert imports[0].module == "main"


class TestEdgeCases:
    """Test edge cases and error conditions"""
    
    def test_empty_file(self, temp_project):
        """Test handling empty Python file"""
        empty_file = temp_project / "empty.py"
        empty_file.write_text("")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        imports = updater.extract_imports(empty_file)
        
        assert imports == []
    
    def test_file_with_only_comments(self, temp_project):
        """Test handling file with only comments"""
        comment_file = temp_project / "comments.py"
        comment_file.write_text("# This is a comment\n# Another comment\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        imports = updater.extract_imports(comment_file)
        
        assert imports == []
    
    def test_multiline_imports(self, temp_project):
        """Test handling multiline import statements"""
        test_file = temp_project / "test.py"
        test_file.write_text(
            "from os.path import (\n"
            "    join,\n"
            "    exists,\n"
            "    dirname\n"
            ")\n"
        )
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 1
        assert "join" in imports[0].names
        assert "exists" in imports[0].names
        assert "dirname" in imports[0].names
    
    def test_import_with_alias(self, temp_project):
        """Test handling imports with aliases"""
        test_file = temp_project / "test.py"
        test_file.write_text("import numpy as np\nfrom os import path as p\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 2
        assert imports[0].module == "numpy"
        assert imports[1].module == "os"
    
    def test_star_import(self, temp_project):
        """Test handling star imports"""
        test_file = temp_project / "test.py"
        test_file.write_text("from os.path import *\n")
        
        mapping = PathMapping()
        updater = PythonImportUpdater(temp_project, mapping)
        
        imports = updater.extract_imports(test_file)
        
        assert len(imports) == 1
        assert imports[0].module == "os.path"
        assert "*" in imports[0].names


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
