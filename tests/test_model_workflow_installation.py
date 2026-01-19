"""
Tests for Model and Workflow Installation
Tests task 9.1: Add model and workflow installation to backend script

Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
"""

import pytest
from pathlib import Path
import tempfile
import shutil
import json
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from comfyui_installer import ComfyUIInstaller


@pytest.fixture
def temp_comfyui_dir():
    """Create temporary ComfyUI directory structure."""
    temp_dir = Path(tempfile.mkdtemp())
    
    # Create basic ComfyUI structure
    (temp_dir / "main.py").write_text("# ComfyUI main script")
    (temp_dir / "models").mkdir(exist_ok=True)
    (temp_dir / "user" / "default" / "workflows").mkdir(parents=True, exist_ok=True)
    
    yield temp_dir
    
    # Cleanup
    if temp_dir.exists():
        shutil.rmtree(temp_dir)


@pytest.fixture
def temp_model_file():
    """Create temporary model file for testing."""
    temp_file = Path(tempfile.mktemp(suffix=".safetensors"))
    temp_file.write_bytes(b"fake model data" * 1000)  # Create some content
    
    yield temp_file
    
    # Cleanup
    if temp_file.exists():
        temp_file.unlink()


@pytest.fixture
def temp_workflow_file():
    """Create temporary workflow file for testing."""
    temp_file = Path(tempfile.mktemp(suffix=".json"))
    workflow_data = {
        "nodes": [],
        "links": [],
        "version": "1.0"
    }
    temp_file.write_text(json.dumps(workflow_data))
    
    yield temp_file
    
    # Cleanup
    if temp_file.exists():
        temp_file.unlink()


class TestModelInstallation:
    """Test model installation functionality."""
    
    def test_install_models_creates_directories(self, temp_comfyui_dir):
        """Test that model installation creates required directories."""
        installer = ComfyUIInstaller()
        
        # Install models (empty list)
        installed, errors = installer._install_models(temp_comfyui_dir, [], None)
        
        # Verify directories were created
        assert (temp_comfyui_dir / "models" / "checkpoints").exists()
        assert (temp_comfyui_dir / "models" / "vae").exists()
        assert (temp_comfyui_dir / "models" / "loras").exists()
    
    def test_install_local_model_file(self, temp_comfyui_dir, temp_model_file):
        """Test installing a model from local file path."""
        installer = ComfyUIInstaller()
        
        # Install model from local file
        models = [str(temp_model_file)]
        installed, errors = installer._install_models(temp_comfyui_dir, models, None)
        
        # Verify model was installed
        assert len(installed) == 1
        assert temp_model_file.name in installed
        assert len(errors) == 0
        
        # Verify file exists in checkpoints directory
        target_path = temp_comfyui_dir / "models" / "checkpoints" / temp_model_file.name
        assert target_path.exists()
        assert target_path.stat().st_size > 0
    
    def test_install_vae_model_to_correct_directory(self, temp_comfyui_dir):
        """Test that VAE models are installed to vae directory."""
        installer = ComfyUIInstaller()
        
        # Create a VAE model file
        vae_file = Path(tempfile.mktemp(suffix="_vae.safetensors"))
        vae_file.write_bytes(b"fake vae data" * 100)
        
        try:
            # Install VAE model
            models = [str(vae_file)]
            installed, errors = installer._install_models(temp_comfyui_dir, models, None)
            
            # Verify model was installed to vae directory
            assert len(installed) == 1
            target_path = temp_comfyui_dir / "models" / "vae" / vae_file.name
            assert target_path.exists()
        finally:
            if vae_file.exists():
                vae_file.unlink()
    
    def test_install_nonexistent_model_continues(self, temp_comfyui_dir):
        """Test that installation continues when a model doesn't exist (Requirement 7.4)."""
        installer = ComfyUIInstaller()
        
        # Try to install non-existent model
        models = ["/nonexistent/model.safetensors"]
        installed, errors = installer._install_models(temp_comfyui_dir, models, None)
        
        # Verify error was recorded but installation didn't crash
        assert len(installed) == 0
        assert len(errors) == 1
        assert "not found" in errors[0].lower()
    
    def test_install_multiple_models_with_failures(self, temp_comfyui_dir, temp_model_file):
        """Test installing multiple models with some failures (Requirement 7.4)."""
        installer = ComfyUIInstaller()
        
        # Mix of valid and invalid models
        models = [
            str(temp_model_file),
            "/nonexistent/model1.safetensors",
            "invalid_model_name"
        ]
        installed, errors = installer._install_models(temp_comfyui_dir, models, None)
        
        # Verify partial success
        assert len(installed) == 1  # Only the valid model
        assert len(errors) == 2  # Two failures
        
        # Verify the valid model was installed
        assert temp_model_file.name in installed
    
    def test_install_models_with_progress_callback(self, temp_comfyui_dir, temp_model_file):
        """Test that progress callback is called during installation (Requirement 7.2)."""
        installer = ComfyUIInstaller()
        
        progress_updates = []
        
        def progress_callback(step, progress, message):
            progress_updates.append({
                "step": step,
                "progress": progress,
                "message": message
            })
        
        # Install model with progress tracking
        models = [str(temp_model_file)]
        installed, errors = installer._install_models(temp_comfyui_dir, models, progress_callback)
        
        # Verify progress updates were received
        assert len(progress_updates) > 0
        assert any("Installing model" in update["message"] for update in progress_updates)
        assert any(update["step"] == "models" for update in progress_updates)
    
    def test_verify_installed_files_exist(self, temp_comfyui_dir, temp_model_file):
        """Test that installed files are verified to exist (Requirement 7.5)."""
        installer = ComfyUIInstaller()
        
        # Install model
        models = [str(temp_model_file)]
        installed, errors = installer._install_models(temp_comfyui_dir, models, None)
        
        # Verify file exists and has content
        target_path = temp_comfyui_dir / "models" / "checkpoints" / temp_model_file.name
        assert target_path.exists()
        assert target_path.stat().st_size > 0


class TestWorkflowInstallation:
    """Test workflow installation functionality."""
    
    def test_install_workflows_creates_directory(self, temp_comfyui_dir):
        """Test that workflow installation creates required directory."""
        installer = ComfyUIInstaller()
        
        # Install workflows (empty list)
        installed, errors = installer._install_workflows(temp_comfyui_dir, [])
        
        # Verify directory was created
        workflows_dir = temp_comfyui_dir / "user" / "default" / "workflows"
        assert workflows_dir.exists()
    
    def test_install_local_workflow_file(self, temp_comfyui_dir, temp_workflow_file):
        """Test installing a workflow from local file path."""
        installer = ComfyUIInstaller()
        
        # Install workflow from local file
        workflows = [str(temp_workflow_file)]
        installed, errors = installer._install_workflows(temp_comfyui_dir, workflows)
        
        # Verify workflow was installed
        assert len(installed) == 1
        assert temp_workflow_file.name in installed
        assert len(errors) == 0
        
        # Verify file exists in workflows directory
        target_path = temp_comfyui_dir / "user" / "default" / "workflows" / temp_workflow_file.name
        assert target_path.exists()
        assert target_path.stat().st_size > 0
    
    def test_install_invalid_json_workflow_fails(self, temp_comfyui_dir):
        """Test that invalid JSON workflow files are rejected."""
        installer = ComfyUIInstaller()
        
        # Create invalid JSON file
        invalid_file = Path(tempfile.mktemp(suffix=".json"))
        invalid_file.write_text("not valid json {")
        
        try:
            # Try to install invalid workflow
            workflows = [str(invalid_file)]
            installed, errors = installer._install_workflows(temp_comfyui_dir, workflows)
            
            # Verify installation failed
            assert len(installed) == 0
            assert len(errors) == 1
            assert "not valid JSON" in errors[0]
        finally:
            if invalid_file.exists():
                invalid_file.unlink()
    
    def test_install_non_json_workflow_fails(self, temp_comfyui_dir):
        """Test that non-JSON files are rejected."""
        installer = ComfyUIInstaller()
        
        # Create non-JSON file
        non_json_file = Path(tempfile.mktemp(suffix=".txt"))
        non_json_file.write_text("not a workflow")
        
        try:
            # Try to install non-JSON workflow
            workflows = [str(non_json_file)]
            installed, errors = installer._install_workflows(temp_comfyui_dir, workflows)
            
            # Verify installation failed
            assert len(installed) == 0
            assert len(errors) == 1
            assert "must be JSON" in errors[0]
        finally:
            if non_json_file.exists():
                non_json_file.unlink()
    
    def test_install_nonexistent_workflow_continues(self, temp_comfyui_dir):
        """Test that installation continues when a workflow doesn't exist (Requirement 7.4)."""
        installer = ComfyUIInstaller()
        
        # Try to install non-existent workflow
        workflows = ["/nonexistent/workflow.json"]
        installed, errors = installer._install_workflows(temp_comfyui_dir, workflows)
        
        # Verify error was recorded but installation didn't crash
        assert len(installed) == 0
        assert len(errors) == 1
        assert "not found" in errors[0].lower()
    
    def test_install_multiple_workflows_with_failures(self, temp_comfyui_dir, temp_workflow_file):
        """Test installing multiple workflows with some failures (Requirement 7.4)."""
        installer = ComfyUIInstaller()
        
        # Mix of valid and invalid workflows
        workflows = [
            str(temp_workflow_file),
            "/nonexistent/workflow1.json",
            "invalid_workflow_name"
        ]
        installed, errors = installer._install_workflows(temp_comfyui_dir, workflows)
        
        # Verify partial success
        assert len(installed) == 1  # Only the valid workflow
        assert len(errors) == 2  # Two failures
        
        # Verify the valid workflow was installed
        assert temp_workflow_file.name in installed
    
    def test_verify_installed_workflows_exist(self, temp_comfyui_dir, temp_workflow_file):
        """Test that installed workflows are verified to exist (Requirement 7.5)."""
        installer = ComfyUIInstaller()
        
        # Install workflow
        workflows = [str(temp_workflow_file)]
        installed, errors = installer._install_workflows(temp_comfyui_dir, workflows)
        
        # Verify file exists and has content
        target_path = temp_comfyui_dir / "user" / "default" / "workflows" / temp_workflow_file.name
        assert target_path.exists()
        assert target_path.stat().st_size > 0
        
        # Verify it's valid JSON
        with open(target_path, 'r') as f:
            data = json.load(f)
            assert isinstance(data, dict)


class TestIntegration:
    """Integration tests for complete installation flow."""
    
    def test_complete_installation_with_models_and_workflows(self, temp_model_file, temp_workflow_file):
        """Test complete installation with both models and workflows."""
        installer = ComfyUIInstaller()
        
        # Create temporary installation directory
        temp_install_dir = Path(tempfile.mkdtemp())
        
        # Create a minimal ZIP file for testing
        temp_zip = Path(tempfile.mktemp(suffix=".zip"))
        
        try:
            import zipfile
            
            # Create ZIP with basic ComfyUI structure
            with zipfile.ZipFile(temp_zip, 'w') as zf:
                zf.writestr("ComfyUI/main.py", "# ComfyUI main script")
            
            # Install with models and workflows
            result = installer.install_comfyui_portable(
                zip_path=str(temp_zip),
                install_dir=str(temp_install_dir),
                enable_cors=True,
                models=[str(temp_model_file)],
                workflows=[str(temp_workflow_file)]
            )
            
            # Verify installation succeeded
            assert result.success
            assert len(result.installed_models) == 1
            assert len(result.installed_workflows) == 1
            assert temp_model_file.name in result.installed_models
            assert temp_workflow_file.name in result.installed_workflows
            
        finally:
            # Cleanup
            if temp_zip.exists():
                temp_zip.unlink()
            if temp_install_dir.exists():
                shutil.rmtree(temp_install_dir)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
