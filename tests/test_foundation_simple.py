"""
Simple test to validate advanced workflow foundation classes.
"""

import asyncio
from typing import List, Dict, Any, Tuple

# Import the classes we're testing
from src.advanced_workflow_base import (
    BaseAdvancedWorkflow,
    WorkflowType,
    WorkflowCapability,
    WorkflowRequest,
    WorkflowResult
)
from src.advanced_workflow_registry import AdvancedWorkflowRegistry
from src.advanced_workflow_router import AdvancedWorkflowRouter, RoutingStrategy


# Test workflow implementation
class SimpleTestWorkflow(BaseAdvancedWorkflow):
    """Simple test workflow implementation."""
    
    @property
    def capabilities(self) -> List[WorkflowCapability]:
        return [WorkflowCapability.TEXT_TO_VIDEO]
    
    @property
    def required_models(self) -> List[str]:
        return ["test_model.safetensors"]
    
    @property
    def memory_requirements(self) -> Dict[str, float]:
        return {"vram_peak": 16.0, "vram_sustained": 14.0, "system_ram": 8.0}
    
    @property
    def supported_resolutions(self) -> List[Tuple[int, int]]:
        return [(1280, 720)]
    
    async def validate_request(self, request: WorkflowRequest) -> Tuple[bool, str]:
        if not request.prompt:
            return False, "Prompt is required"
        return True, ""
    
    async def execute(self, request: WorkflowRequest) -> WorkflowResult:
        return WorkflowResult(
            success=True,
            output_path="/fake/output.mp4",
            execution_time=1.0,
            memory_used=14.0
        )
    
    async def load_models(self) -> bool:
        self.is_loaded = True
        return True
    
    async def unload_models(self) -> bool:
        self.is_loaded = False
        return True


def test_workflow_creation():
    """Test basic workflow creation."""
    print("Testing workflow creation...")
    
    workflow = SimpleTestWorkflow("test", WorkflowType.VIDEO, {})
    assert workflow.name == "test"
    assert workflow.workflow_type == WorkflowType.VIDEO
    assert not workflow.is_loaded
    
    print("✓ Workflow creation test passed")


def test_registry_functionality():
    """Test registry functionality."""
    print("Testing registry functionality...")
    
    registry = AdvancedWorkflowRegistry()
    
    # Test registration
    success = registry.register_workflow("video", "test_workflow", SimpleTestWorkflow)
    assert success
    
    # Test instance creation
    instance = registry.get_workflow_instance("video", "test_workflow")
    assert instance is not None
    assert isinstance(instance, SimpleTestWorkflow)
    
    # Test listing
    available = registry.list_available_workflows()
    assert "video" in available
    assert "test_workflow" in available["video"]
    
    print("✓ Registry functionality test passed")


async def test_router_functionality():
    """Test router functionality."""
    print("Testing router functionality...")
    
    registry = AdvancedWorkflowRegistry()
    registry.register_workflow("video", "test_workflow", SimpleTestWorkflow)
    
    router = AdvancedWorkflowRouter(registry)
    
    request = WorkflowRequest(
        prompt="test prompt",
        workflow_type=WorkflowType.VIDEO,
        capabilities_required=[WorkflowCapability.TEXT_TO_VIDEO]
    )
    
    decision = await router.route_request(request)
    assert decision.selected_workflow == "video/test_workflow"
    assert decision.confidence > 0.0
    
    print("✓ Router functionality test passed")


async def test_end_to_end():
    """Test end-to-end workflow execution."""
    print("Testing end-to-end execution...")
    
    # Setup
    registry = AdvancedWorkflowRegistry()
    registry.register_workflow("video", "test_workflow", SimpleTestWorkflow)
    
    router = AdvancedWorkflowRouter(registry)
    
    # Create request
    request = WorkflowRequest(
        prompt="Generate a test video",
        workflow_type=WorkflowType.VIDEO,
        capabilities_required=[WorkflowCapability.TEXT_TO_VIDEO]
    )
    
    # Route request
    decision = await router.route_request(request)
    assert decision.selected_workflow
    
    # Get workflow instance
    category, workflow_name = decision.selected_workflow.split('/')
    workflow = registry.get_workflow_instance(category, workflow_name)
    assert workflow is not None
    
    # Validate request
    is_valid, error = await workflow.validate_request(request)
    assert is_valid
    
    # Load models
    load_success = await workflow.load_models()
    assert load_success
    assert workflow.is_loaded
    
    # Execute workflow
    result = await workflow.execute(request)
    assert result.success
    assert result.output_path is not None
    
    print("✓ End-to-end execution test passed")


async def main():
    """Run all tests."""
    print("Running Advanced Workflow Foundation Tests")
    print("=" * 50)
    
    try:
        # Basic tests
        test_workflow_creation()
        test_registry_functionality()
        
        # Async tests
        await test_router_functionality()
        await test_end_to_end()
        
        print("=" * 50)
        print("✅ All tests passed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())