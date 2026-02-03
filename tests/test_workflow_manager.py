"""
Tests for WorkflowManager.

Tests workflow deployment, validation, and version tracking functionality.
"""

import json
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, mock_open
import tempfile
import shutil

from src.end_to_end.workflow_manager import (
    WorkflowManager,
    WorkflowInfo,
    WorkflowValidationResult
)


@pytest.fixture
def temp_dirs():
    """Create temporary directories for testing"""
    workflows_dir = Path(tempfile.mkdtemp())
    comfyui_workflows_dir = Path(tempfile.mkdtemp())
    
    yield workflows_dir, comfyui_workflows_dir
    
    # Cleanup
    shutil.rmtree(workflows_dir, ignore_errors=True)
    shutil.rmtree(comfyui_workflows_dir, ignore_errors=True)


@pytest.fixture
def sample_workflow_data():
    """Sample workflow JSON data"""
    return {
        "1": {
            "class_type": "KSampler",
            "inputs": {}
        },
        "2": {
            "class_type": "CLIPTextEncode",
            "inputs": {}
        },
        "3": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {}
        },
        "metadata": {
            "version": "1.0.0"
        }
    }


@pytest.fixture
def workflow_manager(temp_dirs):
    """Create WorkflowManager instance with temp directories"""
    workflows_dir, comfyui_workflows_dir = temp_dirs
    return WorkflowManager(workflows_dir, comfyui_workflows_dir)


class TestWorkflowManagerInitialization:
    """Test WorkflowManager initialization"""
    
    def test_initialization_creates_comfyui_directory(self, temp_dirs):
        """Test that initialization creates ComfyUI workflows directory"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        # Remove the directory
        if comfyui_workflows_dir.exists():
            shutil.rmtree(comfyui_workflows_dir)
        
        # Create manager
        manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
        
        # Verify directory was created
        assert comfyui_workflows_dir.exists()
        assert comfyui_workflows_dir.is_dir()
    
    def test_initialization_creates_workflow_registry(self, workflow_manager):
        """Test that initialization creates workflow registry"""
        assert len(workflow_manager.workflow_registry) > 0
        assert "flux_basic_generation" in workflow_manager.workflow_registry
        assert "flux_coherence_grid" in workflow_manager.workflow_registry
        assert "flux_shot_generation" in workflow_manager.workflow_registry
        assert "sdxl_fallback" in workflow_manager.workflow_registry
    
    def test_workflow_info_structure(self, workflow_manager):
        """Test that workflow info has correct structure"""
        workflow_info = workflow_manager.workflow_registry["flux_basic_generation"]
        
        assert isinstance(workflow_info, WorkflowInfo)
        assert workflow_info.name == "flux_basic_generation"
        assert workflow_info.version == "1.0.0"
        assert isinstance(workflow_info.required_nodes, list)
        assert isinstance(workflow_info.required_models, list)
        assert len(workflow_info.required_nodes) > 0
        assert len(workflow_info.required_models) > 0


class TestCheckInstalledWorkflows:
    """Test check_installed_workflows functionality"""
    
    def test_check_installed_workflows_empty(self, workflow_manager):
        """Test checking workflows when none are installed"""
        workflows = workflow_manager.check_installed_workflows()
        
        assert len(workflows) > 0
        for workflow in workflows:
            assert workflow.installed is False
            assert workflow.up_to_date is False
    
    def test_check_installed_workflows_with_installed(self, workflow_manager, sample_workflow_data, temp_dirs):
        """Test checking workflows when some are installed"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        # Create a workflow file in ComfyUI directory
        workflow_path = comfyui_workflows_dir / "flux_basic_generation.json"
        with open(workflow_path, 'w') as f:
            json.dump(sample_workflow_data, f)
        
        workflows = workflow_manager.check_installed_workflows()
        
        # Find the installed workflow
        installed = [w for w in workflows if w.name == "flux_basic_generation"]
        assert len(installed) == 1
        assert installed[0].installed is True
    
    def test_check_installed_workflows_version_match(self, workflow_manager, sample_workflow_data, temp_dirs):
        """Test version matching for installed workflows"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        # Create workflow with matching version
        workflow_path = comfyui_workflows_dir / "flux_basic_generation.json"
        with open(workflow_path, 'w') as f:
            json.dump(sample_workflow_data, f)
        
        workflows = workflow_manager.check_installed_workflows()
        
        installed = [w for w in workflows if w.name == "flux_basic_generation"]
        assert installed[0].up_to_date is True


class TestGetWorkflowVersion:
    """Test get_workflow_version functionality"""
    
    def test_get_version_not_installed(self, workflow_manager):
        """Test getting version of non-installed workflow"""
        version = workflow_manager.get_workflow_version("flux_basic_generation")
        assert version is None
    
    def test_get_version_with_metadata(self, workflow_manager, sample_workflow_data, temp_dirs):
        """Test getting version from workflow metadata"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        workflow_path = comfyui_workflows_dir / "flux_basic_generation.json"
        with open(workflow_path, 'w') as f:
            json.dump(sample_workflow_data, f)
        
        version = workflow_manager.get_workflow_version("flux_basic_generation")
        assert version == "1.0.0"
    
    def test_get_version_no_metadata(self, workflow_manager, temp_dirs):
        """Test getting version when no metadata present"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        workflow_data = {"1": {"class_type": "KSampler"}}
        workflow_path = comfyui_workflows_dir / "flux_basic_generation.json"
        with open(workflow_path, 'w') as f:
            json.dump(workflow_data, f)
        
        version = workflow_manager.get_workflow_version("flux_basic_generation")
        assert version is None
    
    def test_get_version_invalid_workflow_name(self, workflow_manager):
        """Test getting version with invalid workflow name"""
        version = workflow_manager.get_workflow_version("nonexistent_workflow")
        assert version is None


class TestCheckForUpdates:
    """Test check_for_updates functionality"""
    
    def test_check_updates_no_workflows_installed(self, workflow_manager):
        """Test checking updates when no workflows installed"""
        updates = workflow_manager.check_for_updates()
        assert len(updates) == 0
    
    def test_check_updates_all_up_to_date(self, workflow_manager, sample_workflow_data, temp_dirs):
        """Test checking updates when all workflows are up to date"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        # Install all workflows with correct version
        for workflow_name in workflow_manager.workflow_registry.keys():
            workflow_path = comfyui_workflows_dir / f"{workflow_name}.json"
            with open(workflow_path, 'w') as f:
                json.dump(sample_workflow_data, f)
        
        updates = workflow_manager.check_for_updates()
        assert len(updates) == 0
    
    def test_check_updates_outdated_workflow(self, workflow_manager, temp_dirs):
        """Test checking updates with outdated workflow"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        # Install workflow with old version
        old_workflow_data = {
            "1": {"class_type": "KSampler"},
            "metadata": {"version": "0.9.0"}
        }
        workflow_path = comfyui_workflows_dir / "flux_basic_generation.json"
        with open(workflow_path, 'w') as f:
            json.dump(old_workflow_data, f)
        
        updates = workflow_manager.check_for_updates()
        assert len(updates) > 0
        assert any(w.name == "flux_basic_generation" for w in updates)


class TestDeployWorkflow:
    """Test deploy_workflow functionality"""
    
    def test_deploy_workflow_success(self, workflow_manager, sample_workflow_data, temp_dirs):
        """Test successful workflow deployment"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        # Create source workflow file
        source_path = workflows_dir / "flux_basic_generation.json"
        with open(source_path, 'w') as f:
            json.dump(sample_workflow_data, f)
        
        # Update registry to point to source file
        workflow_manager.workflow_registry["flux_basic_generation"].file_path = source_path
        
        # Deploy
        success = workflow_manager.deploy_workflow("flux_basic_generation")
        
        assert success is True
        
        # Verify file was copied
        dest_path = comfyui_workflows_dir / "flux_basic_generation.json"
        assert dest_path.exists()
        
        # Verify content
        with open(dest_path, 'r') as f:
            deployed_data = json.load(f)
        
        assert "metadata" in deployed_data
        assert deployed_data["metadata"]["version"] == "1.0.0"
        assert deployed_data["metadata"]["deployed_by"] == "StoryCore-Engine"
    
    def test_deploy_workflow_nonexistent(self, workflow_manager):
        """Test deploying non-existent workflow"""
        success = workflow_manager.deploy_workflow("nonexistent_workflow")
        assert success is False
    
    def test_deploy_workflow_missing_source(self, workflow_manager):
        """Test deploying workflow with missing source file"""
        success = workflow_manager.deploy_workflow("flux_basic_generation")
        assert success is False
    
    def test_deploy_workflow_invalid_json(self, workflow_manager, temp_dirs):
        """Test deploying workflow with invalid JSON"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        # Create invalid JSON file
        source_path = workflows_dir / "flux_basic_generation.json"
        with open(source_path, 'w') as f:
            f.write("{ invalid json }")
        
        workflow_manager.workflow_registry["flux_basic_generation"].file_path = source_path
        
        success = workflow_manager.deploy_workflow("flux_basic_generation")
        assert success is False


class TestDeployAllWorkflows:
    """Test deploy_all_workflows functionality"""
    
    def test_deploy_all_workflows_success(self, workflow_manager, sample_workflow_data, temp_dirs):
        """Test deploying all workflows successfully"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        # Create source files for all workflows
        for workflow_name in workflow_manager.workflow_registry.keys():
            source_path = workflows_dir / f"{workflow_name}.json"
            with open(source_path, 'w') as f:
                json.dump(sample_workflow_data, f)
            workflow_manager.workflow_registry[workflow_name].file_path = source_path
        
        results = workflow_manager.deploy_all_workflows()
        
        assert len(results) == len(workflow_manager.workflow_registry)
        assert all(success for success in results.values())
    
    def test_deploy_all_workflows_partial_failure(self, workflow_manager, sample_workflow_data, temp_dirs):
        """Test deploying workflows with some failures"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        # Create source files for some workflows
        for i, workflow_name in enumerate(workflow_manager.workflow_registry.keys()):
            if i % 2 == 0:  # Only create every other workflow
                source_path = workflows_dir / f"{workflow_name}.json"
                with open(source_path, 'w') as f:
                    json.dump(sample_workflow_data, f)
                workflow_manager.workflow_registry[workflow_name].file_path = source_path
        
        results = workflow_manager.deploy_all_workflows()
        
        assert len(results) == len(workflow_manager.workflow_registry)
        assert any(success for success in results.values())
        assert any(not success for success in results.values())


class TestValidateWorkflow:
    """Test validate_workflow functionality"""
    
    def test_validate_workflow_missing_file(self, workflow_manager, temp_dirs):
        """Test validating non-existent workflow file"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        workflow_path = workflows_dir / "nonexistent.json"
        result = workflow_manager.validate_workflow(workflow_path)
        
        assert result.valid is False
        assert len(result.errors) > 0
        assert "not found" in result.errors[0].lower()
    
    def test_validate_workflow_valid(self, workflow_manager, sample_workflow_data, temp_dirs):
        """Test validating valid workflow"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        workflow_path = workflows_dir / "test_workflow.json"
        with open(workflow_path, 'w') as f:
            json.dump(sample_workflow_data, f)
        
        result = workflow_manager.validate_workflow(workflow_path)
        
        assert result.valid is True
        assert result.workflow_name == "test_workflow"
    
    def test_validate_workflow_with_installed_nodes(self, workflow_manager, sample_workflow_data, temp_dirs):
        """Test validating workflow with node compatibility check"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        workflow_path = workflows_dir / "test_workflow.json"
        with open(workflow_path, 'w') as f:
            json.dump(sample_workflow_data, f)
        
        installed_nodes = ["KSampler", "CLIPTextEncode", "CheckpointLoaderSimple"]
        result = workflow_manager.validate_workflow(workflow_path, installed_nodes)
        
        assert result.valid is True
        assert len(result.missing_nodes) == 0
    
    def test_validate_workflow_missing_nodes(self, workflow_manager, sample_workflow_data, temp_dirs):
        """Test validating workflow with missing nodes"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        workflow_path = workflows_dir / "test_workflow.json"
        with open(workflow_path, 'w') as f:
            json.dump(sample_workflow_data, f)
        
        installed_nodes = ["KSampler"]  # Missing CLIPTextEncode and CheckpointLoaderSimple
        result = workflow_manager.validate_workflow(workflow_path, installed_nodes)
        
        assert result.valid is False
        assert len(result.missing_nodes) > 0
        assert "CLIPTextEncode" in result.missing_nodes
        assert "CheckpointLoaderSimple" in result.missing_nodes
    
    def test_validate_workflow_invalid_json(self, workflow_manager, temp_dirs):
        """Test validating workflow with invalid JSON"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        workflow_path = workflows_dir / "invalid.json"
        with open(workflow_path, 'w') as f:
            f.write("{ invalid json }")
        
        result = workflow_manager.validate_workflow(workflow_path)
        
        assert result.valid is False
        assert any("json" in error.lower() for error in result.errors)
    
    def test_validate_workflow_not_dict(self, workflow_manager, temp_dirs):
        """Test validating workflow that's not a JSON object"""
        workflows_dir, comfyui_workflows_dir = temp_dirs
        
        workflow_path = workflows_dir / "array.json"
        with open(workflow_path, 'w') as f:
            json.dump(["not", "an", "object"], f)
        
        result = workflow_manager.validate_workflow(workflow_path)
        
        assert result.valid is False
        assert any("object" in error.lower() for error in result.errors)


class TestExtractRequiredNodes:
    """Test _extract_required_nodes functionality"""
    
    def test_extract_nodes_standard_format(self, workflow_manager):
        """Test extracting nodes from standard ComfyUI format"""
        workflow_data = {
            "1": {"class_type": "KSampler"},
            "2": {"class_type": "CLIPTextEncode"},
            "3": {"class_type": "VAEDecode"}
        }
        
        nodes = workflow_manager._extract_required_nodes(workflow_data)
        
        assert len(nodes) == 3
        assert "KSampler" in nodes
        assert "CLIPTextEncode" in nodes
        assert "VAEDecode" in nodes
    
    def test_extract_nodes_alternative_format(self, workflow_manager):
        """Test extracting nodes from alternative format with 'type' field"""
        workflow_data = {
            "1": {"type": "KSampler"},
            "2": {"type": "CLIPTextEncode"}
        }
        
        nodes = workflow_manager._extract_required_nodes(workflow_data)
        
        assert len(nodes) == 2
        assert "KSampler" in nodes
        assert "CLIPTextEncode" in nodes
    
    def test_extract_nodes_mixed_format(self, workflow_manager):
        """Test extracting nodes from mixed format"""
        workflow_data = {
            "1": {"class_type": "KSampler"},
            "2": {"type": "CLIPTextEncode"},
            "3": {"other_field": "value"}
        }
        
        nodes = workflow_manager._extract_required_nodes(workflow_data)
        
        assert len(nodes) == 2
        assert "KSampler" in nodes
        assert "CLIPTextEncode" in nodes
    
    def test_extract_nodes_empty_workflow(self, workflow_manager):
        """Test extracting nodes from empty workflow"""
        workflow_data = {}
        
        nodes = workflow_manager._extract_required_nodes(workflow_data)
        
        assert len(nodes) == 0
    
    def test_extract_nodes_duplicates(self, workflow_manager):
        """Test that duplicate nodes are deduplicated"""
        workflow_data = {
            "1": {"class_type": "KSampler"},
            "2": {"class_type": "KSampler"},
            "3": {"class_type": "CLIPTextEncode"}
        }
        
        nodes = workflow_manager._extract_required_nodes(workflow_data)
        
        assert len(nodes) == 2
        assert "KSampler" in nodes
        assert "CLIPTextEncode" in nodes


class TestWorkflowValidationResult:
    """Test WorkflowValidationResult dataclass"""
    
    def test_validation_result_creation(self):
        """Test creating validation result"""
        result = WorkflowValidationResult(
            valid=True,
            workflow_name="test_workflow"
        )
        
        assert result.valid is True
        assert result.workflow_name == "test_workflow"
        assert result.missing_nodes == []
        assert result.missing_models == []
        assert result.errors == []
        assert result.warnings == []
    
    def test_validation_result_with_errors(self):
        """Test validation result with errors"""
        result = WorkflowValidationResult(
            valid=False,
            workflow_name="test_workflow",
            missing_nodes=["NodeA", "NodeB"],
            errors=["Error 1", "Error 2"]
        )
        
        assert result.valid is False
        assert len(result.missing_nodes) == 2
        assert len(result.errors) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
