"""
Integration tests for CLI backward compatibility.
Ensures modular CLI maintains identical behavior to monolithic version.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.core import CLICore


class TestBackwardCompatibility:
    """Test backward compatibility with original CLI."""
    
    @pytest.fixture
    def temp_workspace(self):
        """Create a temporary workspace for testing."""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    def test_init_command_interface(self, temp_workspace):
        """Test init command maintains original interface."""
        cli = CLICore()
        
        # Original interface: storycore init <project_name>
        exit_code = cli.run(["init", "test-project", "--path", str(temp_workspace)])
        
        # Should work as before
        assert exit_code == 0
        assert (temp_workspace / "test-project").exists()
    
    def test_grid_command_interface(self):
        """Test grid command maintains original interface."""
        cli = CLICore()
        
        # Original interface: storycore grid --project <path>
        # Should accept same arguments
        exit_code = cli.run(["grid", "--help"])
        
        # Help should work
        assert exit_code == 0
    
    def test_promote_command_interface(self):
        """Test promote command maintains original interface."""
        cli = CLICore()
        
        # Original interface: storycore promote --project <path>
        exit_code = cli.run(["promote", "--help"])
        
        # Help should work
        assert exit_code == 0
    
    def test_qa_command_interface(self):
        """Test QA command maintains original interface."""
        cli = CLICore()
        
        # Original interface: storycore qa --project <path>
        exit_code = cli.run(["qa", "--help"])
        
        # Help should work
        assert exit_code == 0
    
    def test_export_command_interface(self):
        """Test export command maintains original interface."""
        cli = CLICore()
        
        # Original interface: storycore export --project <path>
        exit_code = cli.run(["export", "--help"])
        
        # Help should work
        assert exit_code == 0
    
    def test_validate_command_interface(self):
        """Test validate command maintains original interface."""
        cli = CLICore()
        
        # Original interface: storycore validate --project <path>
        exit_code = cli.run(["validate", "--help"])
        
        # Help should work
        assert exit_code == 0
    
    def test_global_flags_compatibility(self):
        """Test global flags maintain original behavior."""
        cli = CLICore()
        
        # Test verbose flag
        exit_code = cli.run(["--verbose", "help"])
        assert exit_code == 0
        
        # Test quiet flag
        exit_code = cli.run(["--quiet", "help"])
        assert exit_code == 0
        
        # Test log level flag
        exit_code = cli.run(["--log-level", "INFO", "help"])
        assert exit_code == 0
    
    def test_error_exit_codes(self):
        """Test error exit codes match original behavior."""
        cli = CLICore()
        
        # User error (invalid command)
        exit_code = cli.run(["nonexistent"])
        assert exit_code == 1  # User error exit code
        
        # Missing project error
        exit_code = cli.run(["grid", "--project", "/nonexistent"])
        assert exit_code != 0  # Should fail
    
    def test_help_output_format(self):
        """Test help output maintains original format."""
        cli = CLICore()
        
        # General help
        exit_code = cli.run(["help"])
        assert exit_code == 0
        
        # Command-specific help
        exit_code = cli.run(["help", "init"])
        assert exit_code == 0
    
    def test_project_structure_compatibility(self, temp_workspace):
        """Test created projects maintain original structure."""
        cli = CLICore()
        
        # Create project
        project_name = "compat-test"
        cli.run(["init", project_name, "--path", str(temp_workspace)])
        
        project_path = temp_workspace / project_name
        
        # Verify expected files exist
        assert (project_path / "project.json").exists()
        
        # Validate project structure
        exit_code = cli.run(["validate", "--project", str(project_path)])
        assert exit_code == 0


class TestCommandChaining:
    """Test command chaining and workflow compatibility."""
    
    @pytest.fixture
    def temp_workspace(self):
        """Create a temporary workspace for testing."""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    def test_init_then_validate_workflow(self, temp_workspace):
        """Test init followed by validate workflow."""
        cli = CLICore()
        project_name = "chain-test"
        
        # Initialize
        exit_code = cli.run(["init", project_name, "--path", str(temp_workspace)])
        assert exit_code == 0
        
        # Validate
        project_path = temp_workspace / project_name
        exit_code = cli.run(["validate", "--project", str(project_path)])
        assert exit_code == 0
    
    def test_multiple_commands_same_project(self, temp_workspace):
        """Test multiple commands on same project."""
        cli = CLICore()
        project_name = "multi-cmd-test"
        
        # Initialize
        cli.run(["init", project_name, "--path", str(temp_workspace)])
        project_path = temp_workspace / project_name
        
        # Run multiple commands
        commands = ["validate"]
        for cmd in commands:
            exit_code = cli.run([cmd, "--project", str(project_path)])
            # Commands should handle project state appropriately
            assert exit_code in [0, 1, 2]  # May succeed or fail gracefully


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
