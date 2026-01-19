"""
Unit tests for advanced workflow foundation classes.

This module tests the core foundation classes for the advanced ComfyUI
workflow integration system.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import List, Dict, Any, Tuple

# Import the classes we're testing
from src.advanced_workflow_base import (
    BaseAdvancedWorkflow,
    WorkflowType,
    WorkflowCapability,
    WorkflowRequest,
    WorkflowResult,
    WorkflowExecutionError,
    WorkflowValidationError
)
from src.advanced_workflow_registry import AdvancedWorkflowRegistry
from src.advanced_workflow_router import AdvancedWorkflowRouter, RoutingStrategy
from src.advanced_workflow_config import AdvancedWorkflowConfigManager
from src.advanced_workflow_manager import AdvancedWorkflowManager


# Test workflow implementation for testing
class TestVideoWorkflow(BaseAdvancedWorkflow):
    """Test implementation of video workflow."""
    
    @property
    def capabilities(self) -> List[WorkflowCapability]:
        return [WorkflowCapability.TEXT_TO_VIDEO, WorkflowCapability.IMAGE_TO_VIDEO]
    
    @property
    def required_models(self) -> List[str]:
        return ["test_model.safetensors"]
    
    @property
    def memory_requirements(self) -> Dict[str, float]:
        return {"vram_peak": 16.0, "vram_sustained": 14.0, "system_ram": 8.0}
    
    @property
    def supported_resolutions(self) -> List[Tuple[int, int]]:
        return [(1280, 720), (1920, 1080)]
    
    async def validate_request(self, request: WorkflowRequest) -> Tuple[bool, str]:
        if not request.prompt:
            return False, "Prompt is required"
        return True, ""
    
    async def execute(self, request: WorkflowRequest) -> WorkflowResult:
        # Simulate execution
        await asyncio.sleep(0.1)
        return WorkflowResult(
            success=True,
            output_path="/fake/output.mp4",
            execution_time=0.1,
            memory_used=14.0
        )
    
    async def load_models(self) -> bool:
        self.is_loaded = True
        return True
    
    async def unload_models(self) -> bool:
        self.is_loaded = False
        return True


class TestImageWorkflow(BaseAdvancedWorkflow):
    """Test implementation of image workflow."""
    
    @property
    def capabilities(self) -> List[WorkflowCapability]:
        return [WorkflowCapability.TEXT_TO_IMAGE, WorkflowCapability.IMAGE_EDITING]
    
    @property
    def required_models(self) -> List[str]:
        return ["test_image_model.safetensors"]
    
    @property
    def memory_requirements(self) -> Dict[str, float]:
        return {"vram_peak": 8.0, "vram_sustained": 6.0, "system_ram": 4.0}
    
    @property
    def supported_resolutions(self) -> List[Tuple[int, int]]:
        return [(1024, 1024), (1024, 1536)]
    
    async def validate_request(self, request: WorkflowRequest) -> Tuple[bool, str]:
        if not request.prompt:
            return False, "Prompt is required"
        return True, ""
    
    async def execute(self, request: WorkflowRequest) -> WorkflowResult:
        # Simulate execution
        await asyncio.sleep(0.05)
        return WorkflowResult(
            success=True,
            output_path="/fake/output.png",
            execution_time=0.05,
            memory_used=6.0
        )
    
    async def load_models(self) -> bool:
        self.is_loaded = True
        return True
    
    async def unload_models(self) -> bool:
        self.is_loaded = False
        return True


class TestAdvancedWorkflowBase:
    """Test cases for BaseAdvancedWorkflow."""
    
    def test_workflow_initialization(self):
        """Test workflow initialization."""
        workflow = TestVideoWorkflow("test_video", WorkflowType.VIDEO, {})
        
        assert workflow.name == "test_video"
        assert workflow.workflow_type == WorkflowType.VIDEO
        assert not workflow.is_loaded
        assert not workflow.is_busy
        assert workflow.execution_count == 0
    
    def test_workflow_capabilities(self):
        """Test workflow capabilities."""
        workflow = TestVideoWorkflow("test_video", WorkflowType.VIDEO, {})
        
        capabilities = workflow.capabilities
        assert WorkflowCapability.TEXT_TO_VIDEO in capabilities
        assert WorkflowCapability.IMAGE_TO_VIDEO in capabilities
        assert len(capabilities) == 2
    
    def test_capability_scoring(self):
        """Test capability scoring."""
        workflow = TestVideoWorkflow("test_video", WorkflowType.VIDEO, {})
        request = WorkflowRequest(
            prompt="test prompt",
            workflow_type=WorkflowType.VIDEO,
            capabilities_required=[WorkflowCapability.TEXT_TO_VIDEO]
        )
        
        score = workflow.get_capability_score(WorkflowCapability.TEXT_TO_VIDEO, request)
        assert score.workflow_name == "test_video"
        assert score.capability == WorkflowCapability.TEXT_TO_VIDEO
        assert score.score > 0.0
        
        # Test unsupported capability
        score = workflow.get_capability_score(WorkflowCapability.ANIME_GENERATION, request)
        assert score.score == 0.0
    
    def test_performance_stats_update(self):
        """Test performance statistics update."""
        workflow = TestVideoWorkflow("test_video", WorkflowType.VIDEO, {})
        
        workflow.update_performance_stats(2.5)
        assert workflow.execution_count == 1
        assert workflow.average_execution_time == 2.5
        
        workflow.update_performance_stats(1.5)
        assert workflow.execution_count == 2
        assert workflow.average_execution_time == 2.0
    
    def test_workflow_status(self):
        """Test workflow status reporting."""
        workflow = TestVideoWorkflow("test_video", WorkflowType.VIDEO, {})
        
        status = workflow.get_status()
        assert status["name"] == "test_video"
        assert status["type"] == "video"
        assert not status["is_loaded"]
        assert status["execution_count"] == 0
        assert len(status["capabilities"]) == 2


class TestAdvancedWorkflowRegistry:
    """Test cases for AdvancedWorkflowRegistry."""
    
    def test_registry_initialization(self):
        """Test registry initialization."""
        registry = AdvancedWorkflowRegistry()
        
        assert "video" in registry.workflows
        assert "image" in registry.workflows
        assert len(registry.workflow_instances) == 0
    
    def test_workflow_registration(self):
        """Test workflow registration."""
        registry = AdvancedWorkflowRegistry()
        
        # Test successful registration
        success = registry.register_workflow("video", "test_video", TestVideoWorkflow)
        assert success
        assert "test_video" in registry.workflows["video"]
        
        # Test invalid category
        success = registry.register_workflow("invalid", "test", TestVideoWorkflow)
        assert not success
    
    def test_workflow_instance_creation(self):
        """Test workflow instance creation."""
        registry = AdvancedWorkflowRegistry()
        registry.register_workflow("video", "test_video", TestVideoWorkflow)
        
        instance = registry.get_workflow_instance("video", "test_video")
        assert instance is not None
        assert isinstance(instance, TestVideoWorkflow)
        assert instance.name == "test_video"
        
        # Test caching
        instance2 = registry.get_workflow_instance("video", "test_video")
        assert instance is instance2
    
    def test_available_workflows_listing(self):
        """Test listing available workflows."""
        registry = AdvancedWorkflowRegistry()
        registry.register_workflow("video", "test_video", TestVideoWorkflow)
        registry.register_workflow("image", "test_image", TestImageWorkflow)
        
        available = registry.list_available_workflows()
        assert "video" in available
        assert "image" in available
        assert "test_video" in available["video"]
        assert "test_image" in available["image"]
    
    def test_workflows_by_capability(self):
        """Test getting workflows by capability."""
        registry = AdvancedWorkflowRegistry()
        registry.register_workflow("video", "test_video", TestVideoWorkflow)
        registry.register_workflow("image", "test_image", TestImageWorkflow)
        
        # Create instances to populate capability matrix
        registry.get_workflow_instance("video", "test_video")
        registry.get_workflow_instance("image", "test_image")
        
        video_workflows = registry.get_workflows_by_capability(WorkflowCapability.TEXT_TO_VIDEO)
        assert "video/test_video" in video_workflows
        
        image_workflows = registry.get_workflows_by_capability(WorkflowCapability.TEXT_TO_IMAGE)
        assert "image/test_image" in image_workflows
    
    def test_registry_validation(self):
        """Test registry validation."""
        registry = AdvancedWorkflowRegistry()
        registry.register_workflow("video", "test_video", TestVideoWorkflow)
        
        validation = registry.validate_registry()
        assert "is_valid" in validation
        assert "issues" in validation
        assert "warnings" in validation


@pytest.mark.asyncio
class TestAdvancedWorkflowRouter:
    """Test cases for AdvancedWorkflowRouter."""
    
    async def test_router_initialization(self):
        """Test router initialization."""
        registry = AdvancedWorkflowRegistry()
        router = AdvancedWorkflowRouter(registry)
        
        assert router.registry is registry
        assert len(router.performance_profiles) == 0
        assert router.routing_stats["total_requests"] == 0
    
    async def test_request_routing(self):
        """Test request routing."""
        registry = AdvancedWorkflowRegistry()
        registry.register_workflow("video", "test_video", TestVideoWorkflow)
        
        router = AdvancedWorkflowRouter(registry)
        
        request = WorkflowRequest(
            prompt="test prompt",
            workflow_type=WorkflowType.VIDEO,
            capabilities_required=[WorkflowCapability.TEXT_TO_VIDEO]
        )
        
        decision = await router.route_request(request)
        assert decision.selected_workflow == "video/test_video"
        assert decision.confidence > 0.0
    
    async def test_routing_strategies(self):
        """Test different routing strategies."""
        registry = AdvancedWorkflowRegistry()
        registry.register_workflow("video", "test_video", TestVideoWorkflow)
        
        router = AdvancedWorkflowRouter(registry)
        
        request = WorkflowRequest(
            prompt="test prompt",
            workflow_type=WorkflowType.VIDEO,
            capabilities_required=[WorkflowCapability.TEXT_TO_VIDEO]
        )
        
        # Test different strategies
        strategies = [
            RoutingStrategy.BALANCED,
            RoutingStrategy.FASTEST,
            RoutingStrategy.BEST_QUALITY,
            RoutingStrategy.LEAST_MEMORY
        ]
        
        for strategy in strategies:
            decision = await router.route_request(request, strategy)
            assert decision.selected_workflow == "video/test_video"
    
    async def test_no_suitable_workflow(self):
        """Test routing when no suitable workflow is available."""
        registry = AdvancedWorkflowRegistry()
        router = AdvancedWorkflowRouter(registry)
        
        request = WorkflowRequest(
            prompt="test prompt",
            workflow_type=WorkflowType.VIDEO,
            capabilities_required=[WorkflowCapability.TEXT_TO_VIDEO]
        )
        
        decision = await router.route_request(request)
        assert decision.selected_workflow == ""
        assert decision.confidence == 0.0
    
    def test_performance_profile_update(self):
        """Test performance profile updates."""
        registry = AdvancedWorkflowRegistry()
        router = AdvancedWorkflowRouter(registry)
        
        workflow_key = "video/test_video"
        router.update_performance_profile(workflow_key, 2.5, 14.0, True, 0.9)
        
        assert workflow_key in router.performance_profiles
        profile = router.performance_profiles[workflow_key]
        assert profile.average_execution_time == 2.5
        assert profile.memory_usage == 14.0
        assert profile.success_rate == 1.0
        assert profile.quality_score == 0.9


class TestAdvancedWorkflowConfigManager:
    """Test cases for AdvancedWorkflowConfigManager."""
    
    def test_config_manager_initialization(self):
        """Test configuration manager initialization."""
        config_manager = AdvancedWorkflowConfigManager()
        
        assert config_manager.config is not None
        assert hasattr(config_manager.config, 'hunyuan_config')
        assert hasattr(config_manager.config, 'wan_config')
        assert hasattr(config_manager.config, 'newbie_config')
        assert hasattr(config_manager.config, 'qwen_config')
    
    def test_workflow_config_retrieval(self):
        """Test workflow configuration retrieval."""
        config_manager = AdvancedWorkflowConfigManager()
        
        hunyuan_config = config_manager.get_workflow_config("hunyuan")
        assert hunyuan_config is not None
        
        wan_config = config_manager.get_workflow_config("wan")
        assert wan_config is not None
        
        unknown_config = config_manager.get_workflow_config("unknown")
        assert unknown_config is None
    
    def test_config_validation(self):
        """Test configuration validation."""
        config_manager = AdvancedWorkflowConfigManager()
        
        validation = config_manager.validate_config()
        assert "is_valid" in validation
        assert "issues" in validation
        assert "warnings" in validation
    
    def test_model_paths_retrieval(self):
        """Test model paths retrieval."""
        config_manager = AdvancedWorkflowConfigManager()
        
        model_paths = config_manager.get_model_paths()
        assert isinstance(model_paths, dict)
        assert len(model_paths) > 0


@pytest.mark.asyncio
class TestAdvancedWorkflowManager:
    """Test cases for AdvancedWorkflowManager."""
    
    async def test_manager_initialization(self):
        """Test manager initialization."""
        manager = AdvancedWorkflowManager()
        
        assert not manager.is_initialized
        assert len(manager.active_executions) == 0
        assert manager.stats["total_requests"] == 0
    
    async def test_manager_workflow_execution(self):
        """Test workflow execution through manager."""
        manager = AdvancedWorkflowManager()
        
        # Register test workflow
        manager.registry.register_workflow("video", "test_video", TestVideoWorkflow)
        
        await manager.initialize()
        assert manager.is_initialized
        
        request = WorkflowRequest(
            prompt="test prompt",
            workflow_type=WorkflowType.VIDEO,
            capabilities_required=[WorkflowCapability.TEXT_TO_VIDEO]
        )
        
        result = await manager.execute_workflow(request)
        assert result.success
        assert result.execution_time > 0
        assert manager.stats["successful_executions"] == 1
    
    async def test_manager_status_reporting(self):
        """Test manager status reporting."""
        manager = AdvancedWorkflowManager()
        await manager.initialize()
        
        status = manager.get_manager_status()
        assert "is_initialized" in status
        assert "active_executions" in status
        assert "execution_stats" in status
        assert "registry_status" in status
        assert "routing_stats" in status
    
    async def test_manager_health_check(self):
        """Test manager health check."""
        manager = AdvancedWorkflowManager()
        await manager.initialize()
        
        health = await manager.health_check()
        assert "status" in health
        assert "issues" in health
        assert "warnings" in health
        assert health["status"] in ["healthy", "degraded", "unhealthy"]
    
    async def test_manager_cleanup(self):
        """Test manager cleanup."""
        manager = AdvancedWorkflowManager()
        await manager.initialize()
        
        # Add some test data
        manager.registry.register_workflow("video", "test_video", TestVideoWorkflow)
        
        await manager.cleanup()
        # Verify cleanup completed without errors


# Integration tests
@pytest.mark.asyncio
class TestAdvancedWorkflowIntegration:
    """Integration tests for the complete workflow system."""
    
    async def test_end_to_end_workflow_execution(self):
        """Test complete end-to-end workflow execution."""
        # Create manager and register workflows
        manager = AdvancedWorkflowManager()
        manager.registry.register_workflow("video", "test_video", TestVideoWorkflow)
        manager.registry.register_workflow("image", "test_image", TestImageWorkflow)
        
        await manager.initialize()
        
        # Test video workflow
        video_request = WorkflowRequest(
            prompt="Generate a video of a sunset",
            workflow_type=WorkflowType.VIDEO,
            capabilities_required=[WorkflowCapability.TEXT_TO_VIDEO]
        )
        
        video_result = await manager.execute_workflow(video_request)
        assert video_result.success
        assert video_result.output_path is not None
        
        # Test image workflow
        image_request = WorkflowRequest(
            prompt="Generate an image of a cat",
            workflow_type=WorkflowType.IMAGE,
            capabilities_required=[WorkflowCapability.TEXT_TO_IMAGE]
        )
        
        image_result = await manager.execute_workflow(image_request)
        assert image_result.success
        assert image_result.output_path is not None
        
        # Verify statistics
        assert manager.stats["total_requests"] == 2
        assert manager.stats["successful_executions"] == 2
        assert manager.stats["failed_executions"] == 0
        
        await manager.cleanup()
    
    async def test_workflow_fallback_routing(self):
        """Test workflow fallback when preferred workflow is unavailable."""
        manager = AdvancedWorkflowManager()
        
        # Register only image workflow
        manager.registry.register_workflow("image", "test_image", TestImageWorkflow)
        
        await manager.initialize()
        
        # Request video workflow (should fail)
        video_request = WorkflowRequest(
            prompt="Generate a video",
            workflow_type=WorkflowType.VIDEO,
            capabilities_required=[WorkflowCapability.TEXT_TO_VIDEO]
        )
        
        result = await manager.execute_workflow(video_request)
        assert not result.success
        assert "No suitable workflow found" in result.error_message
        
        await manager.cleanup()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])