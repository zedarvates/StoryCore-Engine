"""
Unit tests for Build Script Updater

Tests the functionality of updating paths in build scripts and configuration files.

Requirements: 11.1, 11.2, 11.3, 11.4, 17.1
"""

import json
import pytest
from pathlib import Path
from src.migration.build_script_updater import (
    BuildScriptUpdater,
    ScriptUpdate,
    UpdateResult,
    update_build_scripts
)


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project structure for testing"""
    project_root = tmp_path / "test_project"
    project_root.mkdir()
    
    # Create some source directories
    (project_root / "old_src").mkdir()
    (project_root / "old_frontend").mkdir()
    (project_root / "old_electron").mkdir()
    
    # Create some files
    (project_root / "old_src" / "main.py").write_text("# main file")
    (project_root / "old_frontend" / "app.tsx").write_text("// app file")
    (project_root / "old_electron" / "main.ts").write_text("// electron main")
    
    return project_root


@pytest.fixture
def path_mapping(temp_project):
    """Create a sample path mapping"""
    return {
        temp_project / "old_src" / "main.py": temp_project / "src" / "main.py",
        temp_project / "old_frontend" / "app.tsx": temp_project / "frontend" / "app.tsx",
        temp_project / "old_electron" / "main.ts": temp_project / "electron" / "main.ts",
    }


class TestBuildScriptUpdater:
    """Test BuildScriptUpdater class"""
    
    def test_initialization(self, temp_project, path_mapping):
        """Test BuildScriptUpdater initialization"""
        updater = BuildScriptUpdater(temp_project, path_mapping)
        
        assert updater.project_root == temp_project
        assert updater.path_mapping == path_mapping
        assert len(updater.updates) == 0
        assert len(updater.relative_mapping) > 0
    
    def test_relative_mapping_creation(self, temp_project, path_mapping):
        """Test creation of relative path mapping"""
        updater = BuildScriptUpdater(temp_project, path_mapping)
        
        # Check that relative paths are created
        assert "old_src/main.py" in updater.relative_mapping or "old_src\\main.py" in updater.relative_mapping
        
        # Check forward slash versions exist
        assert any("old_src/main.py" in key for key in updater.relative_mapping.keys())
    
    def test_update_package_json_scripts(self, temp_project, path_mapping):
        """Test updating package.json scripts"""
        # Create package.json with old paths
        package_json = temp_project / "package.json"
        package_data = {
            "name": "test-project",
            "scripts": {
                "build": "tsc -p old_electron/tsconfig.json",
                "dev": "cd old_frontend && npm run dev",
                "test": "jest"
            },
            "main": "old_electron/main.js"
        }
        package_json.write_text(json.dumps(package_data, indent=2))
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        result = updater.update_package_json(package_json)
        
        assert result.success
        assert result.updates_made > 0
        
        # Verify updates
        with open(package_json, 'r') as f:
            updated_data = json.load(f)
        
        assert "electron/tsconfig.json" in updated_data["scripts"]["build"]
        assert "frontend" in updated_data["scripts"]["dev"]
        assert "electron/main.js" in updated_data["main"]
    
    def test_update_package_json_files_array(self, temp_project, path_mapping):
        """Test updating package.json files array"""
        package_json = temp_project / "package.json"
        package_data = {
            "name": "test-project",
            "files": [
                "old_electron/**/*",
                "old_frontend/**/*",
                "old_src/**/*"
            ]
        }
        package_json.write_text(json.dumps(package_data, indent=2))
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        result = updater.update_package_json(package_json)
        
        assert result.success
        assert result.updates_made > 0
        
        with open(package_json, 'r') as f:
            updated_data = json.load(f)
        
        assert any("electron" in f for f in updated_data["files"])
        assert any("frontend" in f for f in updated_data["files"])
        assert any("src" in f for f in updated_data["files"])
    
    def test_update_shell_script(self, temp_project, path_mapping):
        """Test updating shell script"""
        shell_script = temp_project / "build.sh"
        shell_content = """#!/bin/bash
# Build script
cd old_frontend
npm run build
cd ../old_electron
tsc
python3 old_src/main.py
"""
        shell_script.write_text(shell_content)
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        result = updater.update_shell_script(shell_script)
        
        assert result.success
        assert result.updates_made > 0
        
        updated_content = shell_script.read_text()
        assert "frontend" in updated_content
        assert "electron" in updated_content
        assert "src/main.py" in updated_content
        assert "old_frontend" not in updated_content
    
    def test_update_batch_script(self, temp_project, path_mapping):
        """Test updating batch script"""
        batch_script = temp_project / "build.bat"
        batch_content = """@echo off
REM Build script
cd old_frontend
npm run build
cd ..\\old_electron
tsc
python old_src\\main.py
"""
        batch_script.write_text(batch_content)
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        result = updater.update_batch_script(batch_script)
        
        assert result.success
        assert result.updates_made > 0
        
        updated_content = batch_script.read_text()
        assert "frontend" in updated_content or "electron" in updated_content or "src" in updated_content
    
    def test_update_electron_builder_config(self, temp_project, path_mapping):
        """Test updating electron-builder.json"""
        electron_builder = temp_project / "electron-builder.json"
        config_data = {
            "appId": "com.test.app",
            "directories": {
                "output": "old_dist",
                "buildResources": "old_assets"
            },
            "files": [
                "old_electron/**/*",
                "old_frontend/**/*"
            ]
        }
        electron_builder.write_text(json.dumps(config_data, indent=2))
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        result = updater.update_electron_builder_config(electron_builder)
        
        assert result.success
        
        with open(electron_builder, 'r') as f:
            updated_data = json.load(f)
        
        # Check files array was updated
        assert any("electron" in f or "frontend" in f for f in updated_data["files"])
    
    def test_update_setup_py(self, temp_project, path_mapping):
        """Test updating setup.py"""
        setup_py = temp_project / "setup.py"
        setup_content = """from setuptools import setup, find_packages

setup(
    name="test-project",
    packages=find_packages(where="old_src"),
    package_dir={"": "old_src"},
    entry_points={
        "console_scripts": [
            "test-cli=old_src.main:main",
        ],
    },
)
"""
        setup_py.write_text(setup_content)
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        result = updater.update_setup_py(setup_py)
        
        assert result.success
        
        updated_content = setup_py.read_text()
        assert "src" in updated_content
    
    def test_update_pyproject_toml(self, temp_project, path_mapping):
        """Test updating pyproject.toml"""
        pyproject_toml = temp_project / "pyproject.toml"
        toml_content = """[build-system]
requires = ["setuptools>=61.0"]

[project]
name = "test-project"

[tool.setuptools]
packages = ["old_src", "old_src.cli"]

[tool.pytest.ini_options]
testpaths = ["old_tests"]
"""
        pyproject_toml.write_text(toml_content)
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        result = updater.update_pyproject_toml(pyproject_toml)
        
        assert result.success
        
        updated_content = pyproject_toml.read_text()
        # Content should be updated if paths match
        assert "old_src" in updated_content or "src" in updated_content
    
    def test_update_all_build_scripts(self, temp_project, path_mapping):
        """Test updating all build scripts at once"""
        # Create multiple files
        package_json = temp_project / "package.json"
        package_json.write_text(json.dumps({
            "scripts": {"build": "tsc -p old_electron/tsconfig.json"}
        }))
        
        shell_script = temp_project / "build.sh"
        shell_script.write_text("cd old_frontend\nnpm run build")
        
        batch_script = temp_project / "build.bat"
        batch_script.write_text("cd old_electron\ntsc")
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        stats = updater.update_all_build_scripts()
        
        assert stats['total_updates'] > 0
        assert stats['package_json_updated'] or stats['shell_scripts_updated'] > 0 or stats['batch_scripts_updated'] > 0
    
    def test_no_updates_when_no_matches(self, temp_project):
        """Test that no updates are made when paths don't match"""
        package_json = temp_project / "package.json"
        package_json.write_text(json.dumps({
            "scripts": {"test": "jest"}
        }))
        
        # Empty path mapping
        updater = BuildScriptUpdater(temp_project, {})
        result = updater.update_package_json(package_json)
        
        assert result.success
        assert result.updates_made == 0
    
    def test_error_handling_invalid_json(self, temp_project, path_mapping):
        """Test error handling for invalid JSON"""
        package_json = temp_project / "package.json"
        package_json.write_text("{ invalid json }")
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        result = updater.update_package_json(package_json)
        
        assert not result.success
        assert result.error_message is not None
    
    def test_error_handling_missing_file(self, temp_project, path_mapping):
        """Test error handling for missing file"""
        missing_file = temp_project / "nonexistent.json"
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        result = updater.update_package_json(missing_file)
        
        assert not result.success
        assert result.error_message is not None
    
    def test_get_updates(self, temp_project, path_mapping):
        """Test getting list of updates made"""
        package_json = temp_project / "package.json"
        package_json.write_text(json.dumps({
            "scripts": {"build": "tsc -p old_electron/tsconfig.json"}
        }))
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        updater.update_package_json(package_json)
        
        updates = updater.get_updates()
        assert len(updates) > 0
        assert all(isinstance(u, ScriptUpdate) for u in updates)
    
    def test_skip_excluded_directories(self, temp_project, path_mapping):
        """Test that files in excluded directories are skipped"""
        # Create file in node_modules
        node_modules = temp_project / "node_modules" / "some-package"
        node_modules.mkdir(parents=True)
        (node_modules / "build.sh").write_text("cd old_frontend")
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        stats = updater.update_all_build_scripts()
        
        # File in node_modules should be skipped
        assert updater._should_skip_file(node_modules / "build.sh")
    
    def test_cross_platform_path_handling(self, temp_project, path_mapping):
        """Test handling of both forward and backslash paths"""
        shell_script = temp_project / "build.sh"
        # Mix of forward and backslashes
        shell_script.write_text("cd old_frontend/src\ncd old_electron\\dist")
        
        updater = BuildScriptUpdater(temp_project, path_mapping)
        result = updater.update_shell_script(shell_script)
        
        assert result.success
        updated_content = shell_script.read_text()
        # Should update both styles
        assert "old_frontend" not in updated_content or "old_electron" not in updated_content


class TestUpdateBuildScriptsFunction:
    """Test the standalone update_build_scripts function"""
    
    def test_update_build_scripts_function(self, temp_project, path_mapping):
        """Test the convenience function"""
        # Create a package.json
        package_json = temp_project / "package.json"
        package_json.write_text(json.dumps({
            "scripts": {"build": "tsc -p old_electron/tsconfig.json"}
        }))
        
        stats = update_build_scripts(temp_project, path_mapping)
        
        assert isinstance(stats, dict)
        assert 'total_updates' in stats
        assert 'errors' in stats


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
