"""
Integration tests for CLI command workflows.
Tests complete command execution flows with real components.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.core import CLICore


class TestCLICommandWorkflows:
    """Integration tests for complete CLI command workflows."""
    
    @pytest.fixture
    def temp_workspace(self):
        """Create a temporary workspace for testing."""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    def test_init_command_workflow(self, temp_workspace):
        """Test complete init command workflow."""
        cli = CLICore()
        project_name = "test-project"
        
        # Execute init command
        exit_code = cli.run(["init", project_name, "--path", str(temp_workspace)])
        
        # Verify project was created
        project_path = temp_workspace / project_name
        assert project_path.exists()
        assert (project_path / "project.json").exists()
    
    def test_help_command_workflow(self):
        """Test help command workflow."""
        cli = CLICore()
        
        # Execute help command
        exit_code = cli.run(["help"])
        
        # Help should succeed
        assert exit_code == 0
    
    def test_help_specific_command_workflow(self):
        """Test help for specific command."""
        cli = CLICore()
        
        # Execute help for grid command
        exit_code = cli.run(["help", "grid"])
        
        # Help should succeed
        assert exit_code == 0
    
    def test_validate_command_workflow(self, temp_workspace):
        """Test validate command workflow."""
        cli = CLICore()
        
        # Create a test project first
        project_name = "test-project"
        cli.run(["init", project_name, "--path", str(temp_workspace)])
        
        project_path = temp_workspace / project_name
        
        # Execute validate command
        exit_code = cli.run(["validate", "--project", str(project_path)])
        
        # Validate should succeed for valid project
        assert exit_code == 0
    
    def test_invalid_command_workflow(self):
        """Test workflow with invalid command."""
        cli = CLICore()
        
        # Execute invalid command
        exit_code = cli.run(["nonexistent-command"])
        
        # Should return error exit code
        assert exit_code != 0
    
    def test_command_with_missing_required_args(self):
        """Test command workflow with missing required arguments."""
        cli = CLICore()
        
        # Execute grid command without project (should use default)
        exit_code = cli.run(["grid"])
        
        # Should handle gracefully (may fail if no project in current dir)
        assert exit_code in [0, 1, 2]
    
    def test_global_verbose_flag(self):
        """Test global verbose flag across commands."""
        cli = CLICore()
        
        # Execute command with verbose flag
        exit_code = cli.run(["--verbose", "help"])
        
        # Should succeed
        assert exit_code == 0
    
    def test_global_quiet_flag(self):
        """Test global quiet flag across commands."""
        cli = CLICore()
        
        # Execute command with quiet flag
        exit_code = cli.run(["--quiet", "help"])
        
        # Should succeed
        assert exit_code == 0
    
    def test_global_log_level_flag(self):
        """Test global log level flag."""
        cli = CLICore()
        
        # Execute command with log level
        exit_code = cli.run(["--log-level", "DEBUG", "help"])
        
        # Should succeed
        assert exit_code == 0


class TestCLIEndToEndWorkflows:
    """End-to-end tests for complete CLI workflows."""
    
    @pytest.fixture
    def temp_workspace(self):
        """Create a temporary workspace for testing."""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    def test_complete_project_initialization_workflow(self, temp_workspace):
        """Test complete project initialization and validation workflow."""
        cli = CLICore()
        project_name = "e2e-test-project"
        
        # Step 1: Initialize project
        exit_code = cli.run(["init", project_name, "--path", str(temp_workspace)])
        assert exit_code == 0
        
        project_path = temp_workspace / project_name
        assert project_path.exists()
        
        # Step 2: Validate project
        exit_code = cli.run(["validate", "--project", str(project_path)])
        assert exit_code == 0
    
    def test_error_handling_workflow(self):
        """Test error handling across command workflow."""
        cli = CLICore()
        
        # Execute command that should fail gracefully
        exit_code = cli.run(["grid", "--project", "/nonexistent/path"])
        
        # Should return error exit code but not crash
        assert exit_code != 0
    
    def test_help_system_completeness(self):
        """Test that help system covers all commands."""
        cli = CLICore()
        
        # Get general help
        exit_code = cli.run(["help"])
        assert exit_code == 0
        
        # Test help for common commands
        commands = ["init", "grid", "promote", "qa", "export", "validate"]
        for cmd in commands:
            exit_code = cli.run(["help", cmd])
            assert exit_code == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
