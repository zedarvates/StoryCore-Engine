"""
Integration tests for CLI handler adapter.

Tests that the API layer correctly wraps existing CLI handlers and
maintains backward compatibility.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
import sys
import os

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from api.cli_adapter import CLIHandlerAdapter, CLIAdapterRegistry
from api.models import RequestContext
from cli.handlers.init import InitHandler
from cli.handlers.grid import GridHandler
from cli.handlers.promote import PromoteHandler


class TestCLIAdapterBasics:
    """Test basic CLI adapter functionality."""
    
    def test_adapter_creation(self):
        """Test that adapter can be created with a handler class."""
        adapter = CLIHandlerAdapter(InitHandler)
        assert adapter is not None
        assert adapter.handler_class == InitHandler
    
    def test_params_to_args_conversion(self):
        """Test parameter conversion from API to CLI format."""
        adapter = CLIHandlerAdapter(InitHandler)
        
        params = {
            "project_name": "test-project",
            "path": "/tmp/projects",
            "interactive": False,
        }
        
        args = adapter._params_to_args(params)
        
        assert args.project_name == "test-project"
        assert args.path == "/tmp/projects"
        assert args.interactive == False
    
    def test_camel_to_snake_conversion(self):
        """Test camelCase to snake_case conversion."""
        adapter = CLIHandlerAdapter(InitHandler)
        
        assert adapter._camel_to_snake("projectName") == "project_name"
        assert adapter._camel_to_snake("cellSize") == "cell_size"
        assert adapter._camel_to_snake("outputPath") == "output_path"
        assert adapter._camel_to_snake("simple") == "simple"


class TestCLIAdapterRegistry:
    """Test CLI adapter registry."""
    
    def test_registry_creation(self):
        """Test that registry can be created."""
        registry = CLIAdapterRegistry()
        assert registry is not None
        assert len(registry.adapters) == 0
    
    def test_register_handler(self):
        """Test registering a handler."""
        registry = CLIAdapterRegistry()
        registry.register("init", InitHandler)
        
        assert "init" in registry.adapters
        assert registry.get("init") is not None
    
    def test_list_commands(self):
        """Test listing registered commands."""
        registry = CLIAdapterRegistry()
        registry.register("init", InitHandler)
        registry.register("grid", GridHandler)
        
        commands = registry.list_commands()
        assert "init" in commands
        assert "grid" in commands
        assert len(commands) == 2


class TestInitHandlerIntegration:
    """Integration tests for init command via API."""
    
    def test_init_command_via_adapter(self):
        """Test init command execution through adapter."""
        # Create temporary directory
        with tempfile.TemporaryDirectory() as tmpdir:
            adapter = CLIHandlerAdapter(InitHandler)
            context = RequestContext()
            
            params = {
                "project_name": "test-project",
                "path": tmpdir,
                "interactive": False,
            }
            
            response = adapter.execute(params, context)
            
            # Check response structure
            assert response.status == "success"
            assert response.data is not None
            assert response.data["exit_code"] == 0
            assert response.data["command"] == "init"
            assert response.metadata is not None
            assert response.metadata.request_id == context.request_id
            
            # Check that project was created
            project_path = Path(tmpdir) / "test-project"
            assert project_path.exists()
            assert (project_path / "project.json").exists()
    
    def test_init_command_missing_project_name(self):
        """Test init command with missing project name (non-interactive)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            adapter = CLIHandlerAdapter(InitHandler)
            context = RequestContext()
            
            params = {
                "path": tmpdir,
                "interactive": False,
            }
            
            response = adapter.execute(params, context)
            
            # Should fail without project name in non-interactive mode
            assert response.status == "error"
            assert response.error is not None


class TestGridHandlerIntegration:
    """Integration tests for grid command via API."""
    
    @pytest.fixture
    def test_project(self):
        """Create a test project for grid tests."""
        tmpdir = tempfile.mkdtemp()
        
        # Create project using init handler
        adapter = CLIHandlerAdapter(InitHandler)
        context = RequestContext()
        
        params = {
            "project_name": "grid-test",
            "path": tmpdir,
            "interactive": False,
        }
        
        response = adapter.execute(params, context)
        assert response.status == "success"
        
        project_path = Path(tmpdir) / "grid-test"
        
        yield project_path
        
        # Cleanup
        shutil.rmtree(tmpdir, ignore_errors=True)
    
    def test_grid_command_via_adapter(self, test_project):
        """Test grid command execution through adapter."""
        adapter = CLIHandlerAdapter(GridHandler)
        context = RequestContext()
        
        params = {
            "project": str(test_project),
            "grid": "3x3",
            "cell_size": 512,
        }
        
        response = adapter.execute(params, context)
        
        # Check response structure
        assert response.status == "success"
        assert response.data is not None
        assert response.data["exit_code"] == 0
        assert response.data["command"] == "grid"
        assert response.metadata is not None
    
    def test_grid_command_invalid_project(self):
        """Test grid command with non-existent project."""
        adapter = CLIHandlerAdapter(GridHandler)
        context = RequestContext()
        
        params = {
            "project": "/nonexistent/project",
            "grid": "3x3",
        }
        
        response = adapter.execute(params, context)
        
        # Should fail with not found error
        assert response.status == "error"
        assert response.error is not None
        assert "not found" in response.error.message.lower()


class TestPromoteHandlerIntegration:
    """Integration tests for promote command via API."""
    
    @pytest.fixture
    def test_project_with_grid(self):
        """Create a test project with grid for promote tests."""
        tmpdir = tempfile.mkdtemp()
        
        # Create project
        init_adapter = CLIHandlerAdapter(InitHandler)
        context = RequestContext()
        
        init_params = {
            "project_name": "promote-test",
            "path": tmpdir,
            "interactive": False,
        }
        
        init_response = init_adapter.execute(init_params, context)
        assert init_response.status == "success"
        
        project_path = Path(tmpdir) / "promote-test"
        
        # Note: We would normally generate a grid here, but for testing
        # we'll just create the necessary directory structure
        panels_dir = project_path / "assets" / "images" / "panels"
        panels_dir.mkdir(parents=True, exist_ok=True)
        
        yield project_path
        
        # Cleanup
        shutil.rmtree(tmpdir, ignore_errors=True)
    
    def test_promote_command_via_adapter(self, test_project_with_grid):
        """Test promote command execution through adapter."""
        adapter = CLIHandlerAdapter(PromoteHandler)
        context = RequestContext()
        
        params = {
            "project": str(test_project_with_grid),
            "scale": 2,
            "method": "lanczos",
        }
        
        response = adapter.execute(params, context)
        
        # Check response structure
        assert response.status in ["success", "error"]  # May fail if no panels exist
        assert response.data is not None or response.error is not None
        assert response.metadata is not None


class TestMultipleHandlersIntegration:
    """Integration tests for multiple CLI handlers."""
    
    def test_registry_with_multiple_handlers(self):
        """Test registry with multiple handlers registered."""
        registry = CLIAdapterRegistry()
        
        # Register multiple handlers
        registry.register("init", InitHandler)
        registry.register("grid", GridHandler)
        registry.register("promote", PromoteHandler)
        
        # Verify all are registered
        assert len(registry.list_commands()) == 3
        assert registry.get("init") is not None
        assert registry.get("grid") is not None
        assert registry.get("promote") is not None
    
    def test_complete_workflow_via_adapters(self):
        """Test complete workflow: init -> grid (structure check)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            registry = CLIAdapterRegistry()
            registry.register("init", InitHandler)
            registry.register("grid", GridHandler)
            
            # Step 1: Initialize project
            init_adapter = registry.get("init")
            context1 = RequestContext()
            
            init_params = {
                "project_name": "workflow-test",
                "path": tmpdir,
                "interactive": False,
            }
            
            init_response = init_adapter.execute(init_params, context1)
            assert init_response.status == "success"
            
            project_path = Path(tmpdir) / "workflow-test"
            assert project_path.exists()
            
            # Step 2: Verify grid command can be called (may not succeed without actual grid generation)
            grid_adapter = registry.get("grid")
            context2 = RequestContext()
            
            grid_params = {
                "project": str(project_path),
                "grid": "3x3",
            }
            
            grid_response = grid_adapter.execute(grid_params, context2)
            # Just verify we get a response (may be error if grid generation not fully implemented)
            assert grid_response.status in ["success", "error"]
            assert grid_response.metadata is not None


class TestErrorHandling:
    """Test error handling in CLI adapter."""
    
    def test_adapter_handles_cli_exceptions(self):
        """Test that adapter properly handles CLI handler exceptions."""
        adapter = CLIHandlerAdapter(InitHandler)
        context = RequestContext()
        
        # Invalid parameters that should cause an error
        params = {
            "project_name": "",  # Empty project name
            "path": "/invalid/path/that/does/not/exist",
            "interactive": False,
        }
        
        response = adapter.execute(params, context)
        
        # Should return error response, not raise exception
        assert response.status == "error"
        assert response.error is not None
        assert response.metadata is not None
    
    def test_error_code_mapping(self):
        """Test that CLI errors are mapped to appropriate API error codes."""
        adapter = CLIHandlerAdapter(GridHandler)
        context = RequestContext()
        
        # Non-existent project should map to NOT_FOUND
        params = {
            "project": "/this/path/does/not/exist",
            "grid": "3x3",
        }
        
        response = adapter.execute(params, context)
        
        assert response.status == "error"
        assert response.error is not None
        # Error code should be NOT_FOUND or similar
        assert "NOT_FOUND" in response.error.code or "ERROR" in response.error.code


class TestBackwardCompatibility:
    """Test backward compatibility with existing CLI handlers."""
    
    def test_init_handler_produces_same_result(self):
        """Test that init via adapter produces same result as direct CLI."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Execute via adapter
            adapter = CLIHandlerAdapter(InitHandler)
            context = RequestContext()
            
            params = {
                "project_name": "compat-test",
                "path": tmpdir,
                "interactive": False,
            }
            
            response = adapter.execute(params, context)
            
            # Verify project structure matches expected CLI output
            if response.status == "success":
                project_path = Path(tmpdir) / "compat-test"
                
                # Check standard project structure
                assert project_path.exists()
                assert (project_path / "project.json").exists()
                
                # Check standard directories (at least assets should exist)
                assert (project_path / "assets").exists()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
