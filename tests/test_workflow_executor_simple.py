"""
Simple tests for Workflow Executor functionality.
"""

import pytest
from pathlib import Path
from unittest.mock import Mock, patch

from src.workflow_executor import WorkflowExecutor, StoryCorePanelConfig
from src.comfyui_config import ComfyUIConfig, ControlNetConfig, IPAdapterConfig
from src.comfyui_models import ComfyUIWorkflow, WorkflowMetadata


class TestWorkflowExecutorSimple:
    """Simple tests for Workflow Executor core functionality."""
    
    def test_executor_initialization(self):
        """Test Workflow Executor initialization."""
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        assert executor.config == config
        assert executor.logger is not None
        assert executor._node_counter == 1
        assert executor._available_models is None
    
    def test_basic_panel_conversion(self):
        """Test basic StoryCore panel to ComfyUI workflow conversion."""
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Create simple panel config
        panel_config = StoryCorePanelConfig(
            prompt="A beautiful landscape",
            negative_prompt="blurry, low quality",
            width=512,
            height=512,
            steps=20,
            cfg_scale=7.0,
            seed=42
        )
        
        # Convert to workflow
        workflow = executor.convert_storycore_panel(panel_config)
        
        # Verify workflow structure
        assert isinstance(workflow, ComfyUIWorkflow)
        assert workflow.metadata is not None
        assert workflow.metadata.source_type == "storycore_panel"
        assert "storycore" in workflow.metadata.tags
        assert len(workflow.nodes) > 0
        
        # Check for required node types
        node_types = [node.class_type for node in workflow.nodes.values()]
        assert "CheckpointLoaderSimple" in node_types
        assert "CLIPTextEncode" in node_types
        assert "KSampler" in node_types
        assert "VAEDecode" in node_types
        assert "SaveImage" in node_types
    
    def test_controlnet_workflow_conversion(self):
        """Test workflow conversion with ControlNet."""
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Create panel config with ControlNet
        controlnet_config = ControlNetConfig(
            model_name="control_openpose-fp16.safetensors",
            strength=1.0,
            preprocessing=True,
            control_image_path=Path("test_control.jpg")
        )
        
        panel_config = StoryCorePanelConfig(
            prompt="A person dancing",
            controlnet_config=controlnet_config
        )
        
        # Convert to workflow
        workflow = executor.convert_storycore_panel(panel_config)
        
        # Check for ControlNet nodes
        node_types = [node.class_type for node in workflow.nodes.values()]
        assert "ControlNetLoader" in node_types
        assert "LoadImage" in node_types
        assert "ControlNetApply" in node_types
        assert "OpenposePreprocessor" in node_types  # Should add preprocessing
    
    def test_ipadapter_workflow_conversion(self):
        """Test workflow conversion with IP-Adapter."""
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Create panel config with IP-Adapter
        ipadapter_config = IPAdapterConfig(
            model_name="ip-adapter_sd15.safetensors",
            reference_image_path=Path("reference.jpg"),
            weight=0.8,
            noise=0.1
        )
        
        panel_config = StoryCorePanelConfig(
            prompt="A portrait in the style of the reference",
            ipadapter_config=ipadapter_config
        )
        
        # Convert to workflow
        workflow = executor.convert_storycore_panel(panel_config)
        
        # Check for IP-Adapter nodes
        node_types = [node.class_type for node in workflow.nodes.values()]
        assert "IPAdapterModelLoader" in node_types
        assert "LoadImage" in node_types
        assert "IPAdapterApply" in node_types
    
    def test_workflow_validation_success(self):
        """Test successful workflow validation."""
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Create valid workflow
        panel_config = StoryCorePanelConfig(prompt="Test prompt")
        workflow = executor.convert_storycore_panel(panel_config)
        
        # Validate workflow
        result = executor.validate_workflow(workflow)
        
        assert result.is_valid == True
        assert len(result.errors) == 0
        assert result.complexity_score >= 0
        assert result.estimated_time_seconds > 0
    
    def test_workflow_validation_missing_nodes(self):
        """Test workflow validation with missing required nodes."""
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Create incomplete workflow
        workflow = ComfyUIWorkflow()
        workflow.metadata = WorkflowMetadata()
        
        # Validate workflow
        result = executor.validate_workflow(workflow)
        
        assert result.is_valid == False
        assert len(result.errors) > 0
        
        # Should have errors for missing required nodes
        error_text = " ".join(result.errors)
        assert "CheckpointLoaderSimple" in error_text
        assert "KSampler" in error_text
        assert "VAEDecode" in error_text
        assert "SaveImage" in error_text
    
    def test_node_id_generation(self):
        """Test unique node ID generation."""
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Generate multiple node IDs
        id1 = executor._get_next_node_id()
        id2 = executor._get_next_node_id()
        id3 = executor._get_next_node_id()
        
        # Should be unique and sequential
        assert id1 != id2 != id3
        assert id1 == "1"
        assert id2 == "2"
        assert id3 == "3"
    
    def test_execution_time_estimation(self):
        """Test workflow execution time estimation."""
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Create workflow with different complexities
        simple_config = StoryCorePanelConfig(
            prompt="Simple test",
            steps=10
        )
        simple_workflow = executor.convert_storycore_panel(simple_config)
        
        complex_config = StoryCorePanelConfig(
            prompt="Complex test",
            steps=50,
            controlnet_config=ControlNetConfig(
                model_name="control_depth.safetensors",
                strength=1.0
            )
        )
        complex_workflow = executor.convert_storycore_panel(complex_config)
        
        # Estimate times
        simple_time = executor._estimate_execution_time(simple_workflow)
        complex_time = executor._estimate_execution_time(complex_workflow)
        
        # Complex workflow should take longer
        assert simple_time > 0
        assert complex_time > simple_time
    
    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.glob')
    def test_model_availability_scanning(self, mock_glob, mock_exists):
        """Test model availability scanning."""
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Mock file system
        mock_exists.return_value = True
        mock_glob.return_value = [
            Path("model1.safetensors"),
            Path("model2.ckpt"),
            Path("model3.pt")
        ]
        
        # Get available models
        models = executor.get_available_models()
        
        # Should return model dictionary
        assert isinstance(models, dict)
        assert "checkpoints" in models
        assert "controlnets" in models
        assert "ipadapters" in models
        assert "vaes" in models
        
        # Should cache results
        models2 = executor.get_available_models()
        assert models == models2
    
    def test_model_cache_refresh(self):
        """Test model cache refresh functionality."""
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Set initial cache
        executor._available_models = {"test": ["cached"]}
        
        # Refresh cache
        executor.refresh_model_cache()
        
        # Cache should be cleared and refreshed
        assert executor._available_models is not None
        assert "test" not in executor._available_models
    
    def test_controlnet_preprocessing_types(self):
        """Test different ControlNet preprocessing types."""
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Test different ControlNet types
        test_cases = [
            ("control_openpose.safetensors", "OpenposePreprocessor"),
            ("control_depth.safetensors", "MiDaS-DepthMapPreprocessor"),
            ("control_lineart.safetensors", "LineArtPreprocessor"),
            ("control_canny.safetensors", None)  # No specific preprocessor
        ]
        
        for model_name, expected_preprocessor in test_cases:
            controlnet_config = ControlNetConfig(
                model_name=model_name,
                strength=1.0,
                preprocessing=True,
                control_image_path=Path("test.jpg")
            )
            
            panel_config = StoryCorePanelConfig(
                prompt="Test",
                controlnet_config=controlnet_config
            )
            
            workflow = executor.convert_storycore_panel(panel_config)
            node_types = [node.class_type for node in workflow.nodes.values()]
            
            if expected_preprocessor:
                assert expected_preprocessor in node_types
            else:
                # Should not have specific preprocessors for unknown types
                preprocessors = ["OpenposePreprocessor", "MiDaS-DepthMapPreprocessor", "LineArtPreprocessor"]
                assert not any(prep in node_types for prep in preprocessors)