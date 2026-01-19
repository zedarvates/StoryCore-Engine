"""
Property-based tests for Workflow Executor.
Validates universal correctness properties across all scenarios.
"""

import pytest
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from hypothesis.strategies import composite
from unittest.mock import patch

from src.workflow_executor import WorkflowExecutor, StoryCorePanelConfig
from src.comfyui_config import ComfyUIConfig, ControlNetConfig, IPAdapterConfig
from src.comfyui_models import ComfyUIWorkflow, WorkflowMetadata, WorkflowNode


# Strategy generators for test data
@composite
def valid_panel_config(draw):
    """Generate valid StoryCore panel configurations."""
    # Use printable ASCII text to avoid filtering issues
    prompt = draw(st.text(alphabet=st.characters(min_codepoint=32, max_codepoint=126), min_size=1, max_size=50))
    negative_prompt = draw(st.text(alphabet=st.characters(min_codepoint=32, max_codepoint=126), max_size=30))
    
    # Use sampled values instead of filtering to avoid health check issues
    width = draw(st.sampled_from([256, 320, 384, 448, 512, 576, 640, 704, 768, 832, 896, 960, 1024]))
    height = draw(st.sampled_from([256, 320, 384, 448, 512, 576, 640, 704, 768, 832, 896, 960, 1024]))
    steps = draw(st.integers(min_value=1, max_value=50))
    cfg_scale = draw(st.floats(min_value=1.0, max_value=15.0))
    seed = draw(st.integers(min_value=-1, max_value=1000000))
    
    return StoryCorePanelConfig(
        prompt=prompt,
        negative_prompt=negative_prompt,
        width=width,
        height=height,
        steps=steps,
        cfg_scale=cfg_scale,
        seed=seed
    )


@composite
def controlnet_config(draw):
    """Generate valid ControlNet configurations."""
    model_names = [
        "control_openpose-fp16.safetensors",
        "control_depth-fp16.safetensors", 
        "control_lineart-fp16.safetensors",
        "control_canny-fp16.safetensors"
    ]
    
    model_name = draw(st.sampled_from(model_names))
    strength = draw(st.floats(min_value=0.0, max_value=2.0))
    preprocessing = draw(st.booleans())
    
    return ControlNetConfig(
        model_name=model_name,
        strength=strength,
        preprocessing=preprocessing,
        control_image_path=Path("test_control.jpg")
    )


@composite
def ipadapter_config(draw):
    """Generate valid IP-Adapter configurations."""
    model_names = [
        "ip-adapter_sd15.safetensors",
        "ip-adapter-plus_sd15.safetensors",
        "ip-adapter_sdxl.safetensors"
    ]
    
    model_name = draw(st.sampled_from(model_names))
    weight = draw(st.floats(min_value=0.0, max_value=2.0))
    noise = draw(st.floats(min_value=0.0, max_value=1.0))
    
    return IPAdapterConfig(
        model_name=model_name,
        reference_image_path=Path("reference.jpg"),
        weight=weight,
        noise=noise
    )


@composite
def panel_config_with_extensions(draw):
    """Generate panel configs with optional ControlNet/IP-Adapter."""
    base_config = draw(valid_panel_config())
    
    # Optionally add ControlNet
    if draw(st.booleans()):
        base_config.controlnet_config = draw(controlnet_config())
    
    # Optionally add IP-Adapter
    if draw(st.booleans()):
        base_config.ipadapter_config = draw(ipadapter_config())
    
    return base_config


class TestWorkflowExecutorProperties:
    """Property-based tests for Workflow Executor correctness."""
    
    @given(valid_panel_config())
    @settings(max_examples=10, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_8_workflow_submission_format(self, panel_config):
        """
        Property 8: Workflow Submission Format
        Validates: Requirements 3.2, 4.1
        
        Any valid StoryCore panel configuration should produce a workflow
        that conforms to ComfyUI's expected format.
        """
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Convert panel to workflow
        workflow = executor.convert_storycore_panel(panel_config)
        
        # Verify workflow format compliance
        assert isinstance(workflow, ComfyUIWorkflow)
        assert workflow.metadata is not None
        assert len(workflow.nodes) > 0
        
        # Convert to ComfyUI format and verify structure
        comfyui_format = workflow.to_comfyui_format()
        assert isinstance(comfyui_format, dict)
        
        # Every node should have proper structure
        for node_id, node_data in comfyui_format.items():
            assert isinstance(node_id, str)
            assert isinstance(node_data, dict)
            assert "class_type" in node_data
            assert "inputs" in node_data
            assert isinstance(node_data["inputs"], dict)
        
        # Workflow should be JSON serializable
        import json
        json_str = json.dumps(comfyui_format)
        assert len(json_str) > 0
    
    @given(panel_config_with_extensions())
    @settings(max_examples=7, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_11_controlnet_configuration_consistency(self, panel_config):
        """
        Property 11: ControlNet Configuration Consistency
        Validates: Requirements 4.2
        
        When ControlNet is configured, the workflow should consistently
        include all required ControlNet nodes with proper connections.
        """
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Convert panel to workflow
        workflow = executor.convert_storycore_panel(panel_config)
        
        if panel_config.controlnet_config:
            # Should have ControlNet nodes
            node_types = [node.class_type for node in workflow.nodes.values()]
            assert "ControlNetLoader" in node_types
            assert "LoadImage" in node_types
            assert "ControlNetApply" in node_types
            
            # Check for preprocessing nodes based on model type
            model_name = panel_config.controlnet_config.model_name.lower()
            if panel_config.controlnet_config.preprocessing:
                if "openpose" in model_name:
                    assert "OpenposePreprocessor" in node_types
                elif "depth" in model_name:
                    assert "MiDaS-DepthMapPreprocessor" in node_types
                elif "lineart" in model_name:
                    assert "LineArtPreprocessor" in node_types
            
            # Verify ControlNet parameters are preserved
            for node in workflow.nodes.values():
                if node.class_type == "ControlNetLoader":
                    assert node.inputs["control_net_name"] == panel_config.controlnet_config.model_name
                elif node.class_type == "ControlNetApply":
                    assert node.inputs["strength"] == panel_config.controlnet_config.strength
        else:
            # Should not have ControlNet nodes
            node_types = [node.class_type for node in workflow.nodes.values()]
            controlnet_types = ["ControlNetLoader", "ControlNetApply"]
            assert not any(ct in node_types for ct in controlnet_types)
    
    @given(panel_config_with_extensions())
    @settings(max_examples=7, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_12_ipadapter_setup_correctness(self, panel_config):
        """
        Property 12: IP-Adapter Setup Correctness
        Validates: Requirements 4.3
        
        When IP-Adapter is configured, the workflow should correctly
        set up all IP-Adapter nodes with proper parameters.
        """
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Convert panel to workflow
        workflow = executor.convert_storycore_panel(panel_config)
        
        if panel_config.ipadapter_config:
            # Should have IP-Adapter nodes
            node_types = [node.class_type for node in workflow.nodes.values()]
            assert "IPAdapterModelLoader" in node_types
            assert "LoadImage" in node_types
            assert "IPAdapterApply" in node_types
            
            # Verify IP-Adapter parameters are preserved
            for node in workflow.nodes.values():
                if node.class_type == "IPAdapterModelLoader":
                    assert node.inputs["ipadapter_file"] == panel_config.ipadapter_config.model_name
                elif node.class_type == "IPAdapterApply":
                    assert node.inputs["weight"] == panel_config.ipadapter_config.weight
                    assert node.inputs["noise"] == panel_config.ipadapter_config.noise
        else:
            # Should not have IP-Adapter nodes
            node_types = [node.class_type for node in workflow.nodes.values()]
            ipadapter_types = ["IPAdapterModelLoader", "IPAdapterApply"]
            assert not any(ia in node_types for ia in ipadapter_types)
    
    @given(valid_panel_config())
    @settings(max_examples=10, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_13_model_validation(self, panel_config):
        """
        Property 13: Model Validation
        Validates: Requirements 4.4
        
        Workflow validation should correctly identify model-related issues
        and provide appropriate feedback.
        """
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Convert panel to workflow
        workflow = executor.convert_storycore_panel(panel_config)
        
        # Validate workflow
        result = executor.validate_workflow(workflow)
        
        # Should always return a ValidationResult
        assert hasattr(result, 'is_valid')
        assert hasattr(result, 'errors')
        assert hasattr(result, 'warnings')
        assert isinstance(result.errors, list)
        assert isinstance(result.warnings, list)
        
        # If checkpoint name is invalid, should have warnings
        if not panel_config.checkpoint_name.endswith(('.safetensors', '.ckpt', '.pt')):
            warning_text = " ".join(result.warnings)
            assert "valid model file" in warning_text.lower()
        
        # Should have complexity and time estimates
        assert result.complexity_score >= 0
        assert result.estimated_time_seconds > 0
    
    @given(valid_panel_config())
    @settings(max_examples=10, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_14_workflow_error_detection(self, panel_config):
        """
        Property 14: Workflow Error Detection
        Validates: Requirements 4.5
        
        The executor should detect and report workflow errors consistently,
        including missing nodes, invalid connections, and circular dependencies.
        """
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Create valid workflow
        valid_workflow = executor.convert_storycore_panel(panel_config)
        valid_result = executor.validate_workflow(valid_workflow)
        
        # Valid workflow should pass validation
        assert valid_result.is_valid == True
        assert len(valid_result.errors) == 0
        
        # Create invalid workflow (empty)
        invalid_workflow = ComfyUIWorkflow()
        invalid_workflow.metadata = WorkflowMetadata()
        invalid_result = executor.validate_workflow(invalid_workflow)
        
        # Invalid workflow should fail validation
        assert invalid_result.is_valid == False
        assert len(invalid_result.errors) > 0
        
        # Should detect missing required nodes
        error_text = " ".join(invalid_result.errors)
        required_nodes = ["CheckpointLoaderSimple", "KSampler", "VAEDecode", "SaveImage"]
        for required_node in required_nodes:
            assert required_node in error_text
    
    @given(valid_panel_config())
    @settings(max_examples=7, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_workflow_node_connectivity(self, panel_config):
        """
        Property: Workflow Node Connectivity
        
        All generated workflows should have proper node connections
        with no dangling references or circular dependencies.
        """
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Convert panel to workflow
        workflow = executor.convert_storycore_panel(panel_config)
        
        # Verify all node references are valid
        for node_id, node in workflow.nodes.items():
            for input_name, input_value in node.inputs.items():
                if isinstance(input_value, list) and len(input_value) == 2:
                    ref_node_id, ref_output = input_value
                    # Referenced node should exist
                    assert str(ref_node_id) in workflow.nodes
                    # Output index should be reasonable
                    assert isinstance(ref_output, int)
                    assert ref_output >= 0
        
        # Validate workflow should pass connectivity checks
        result = executor.validate_workflow(workflow)
        
        # Should not have circular dependency errors
        error_text = " ".join(result.errors)
        assert "circular dependency" not in error_text.lower()
    
    @given(valid_panel_config())
    @settings(max_examples=7, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_parameter_preservation(self, panel_config):
        """
        Property: Parameter Preservation
        
        All input parameters should be correctly preserved in the
        generated workflow nodes.
        """
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Convert panel to workflow
        workflow = executor.convert_storycore_panel(panel_config)
        
        # Find and verify key nodes preserve parameters
        for node in workflow.nodes.values():
            if node.class_type == "CheckpointLoaderSimple":
                assert node.inputs["ckpt_name"] == panel_config.checkpoint_name
            
            elif node.class_type == "CLIPTextEncode":
                # Should have either positive or negative prompt
                text = node.inputs.get("text", "")
                assert text in [panel_config.prompt, panel_config.negative_prompt]
            
            elif node.class_type == "KSampler":
                assert node.inputs["steps"] == panel_config.steps
                assert node.inputs["cfg"] == panel_config.cfg_scale
                assert node.inputs["sampler_name"] == panel_config.sampler_name
                assert node.inputs["scheduler"] == panel_config.scheduler
                assert node.inputs["denoise"] == panel_config.denoise
                
                # Seed handling
                expected_seed = panel_config.seed if panel_config.seed >= 0 else 42
                assert node.inputs["seed"] == expected_seed
            
            elif node.class_type == "EmptyLatentImage":
                assert node.inputs["width"] == panel_config.width
                assert node.inputs["height"] == panel_config.height
                assert node.inputs["batch_size"] == 1
    
    @given(st.integers(min_value=1, max_value=100))
    @settings(max_examples=10)
    def test_property_node_id_uniqueness(self, num_conversions):
        """
        Property: Node ID Uniqueness
        
        Node IDs should be unique within each workflow and
        reset properly between conversions.
        """
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        workflows = []
        
        # Generate multiple workflows
        for i in range(min(num_conversions, 10)):  # Limit for performance
            panel_config = StoryCorePanelConfig(
                prompt=f"Test prompt {i}",
                seed=i
            )
            workflow = executor.convert_storycore_panel(panel_config)
            workflows.append(workflow)
        
        # Check uniqueness within each workflow
        for workflow in workflows:
            node_ids = list(workflow.nodes.keys())
            assert len(node_ids) == len(set(node_ids))  # All unique
        
        # Check that node IDs reset between workflows
        if len(workflows) >= 2:
            first_ids = set(workflows[0].nodes.keys())
            second_ids = set(workflows[1].nodes.keys())
            # Should have overlapping IDs (both start from 1)
            assert len(first_ids.intersection(second_ids)) > 0
    
    @given(valid_panel_config())
    @settings(max_examples=7, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_execution_time_consistency(self, panel_config):
        """
        Property: Execution Time Consistency
        
        Execution time estimates should be consistent and reasonable
        based on workflow complexity.
        """
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Convert panel to workflow
        workflow = executor.convert_storycore_panel(panel_config)
        
        # Estimate execution time multiple times
        time1 = executor._estimate_execution_time(workflow)
        time2 = executor._estimate_execution_time(workflow)
        
        # Should be deterministic
        assert time1 == time2
        
        # Should be reasonable (between 1 second and 10 minutes)
        assert 1.0 <= time1 <= 600.0
        
        # Time should correlate with steps
        assert time1 >= panel_config.steps * 0.1  # At least 0.1s per step
        
        # More complex workflows should take longer
        complexity = workflow.metadata.complexity_score
        if complexity > 5.0:
            assert time1 >= 15.0  # Complex workflows take at least 15s
    
    @patch('pathlib.Path.exists')
    def test_property_model_scanning_robustness(self, mock_exists):
        """
        Property: Model Scanning Robustness
        
        Model availability scanning should handle various file system
        states gracefully without errors.
        """
        config = ComfyUIConfig.default()
        executor = WorkflowExecutor(config)
        
        # Test with non-existent installation
        mock_exists.return_value = False
        models = executor.get_available_models()
        
        # Should return empty but valid structure
        assert isinstance(models, dict)
        assert "checkpoints" in models
        assert "controlnets" in models
        assert "ipadapters" in models
        assert "vaes" in models
        assert all(isinstance(model_list, list) for model_list in models.values())
        
        # Should cache results
        models2 = executor.get_available_models()
        assert models == models2
        
        # Refresh should work without errors
        executor.refresh_model_cache()
        models3 = executor.get_available_models()
        assert isinstance(models3, dict)