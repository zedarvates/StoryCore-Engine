"""
Example: StoryCore Pipeline Integration

This example demonstrates how to integrate the fact-checking system
with the StoryCore-Engine pipeline using hooks.

The integration provides:
- Automatic fact-checking at key pipeline stages
- Non-blocking asynchronous execution
- Warning events for high-risk content
- Data Contract v1 compliant storage
- Configurable behavior per hook
"""

import asyncio
from pathlib import Path
from src.fact_checker.pipeline_integration import (
    PipelineIntegration,
    HookConfig
)
from src.fact_checker.models import Configuration


async def example_basic_hook_execution():
    """
    Example 1: Basic hook execution
    
    Shows how to execute a simple fact-checking hook.
    """
    print("=" * 60)
    print("Example 1: Basic Hook Execution")
    print("=" * 60)
    
    # Create pipeline integration
    integration = PipelineIntegration()
    
    # Content to verify
    content = """
    Water boils at 100 degrees Celsius at sea level.
    The Earth orbits around the Sun.
    Photosynthesis converts light energy into chemical energy.
    """
    
    # Execute before_generate hook (non-blocking)
    result = await integration.execute_hook("before_generate", content)
    
    print(f"\nHook Status: {result.status}")
    print(f"Processing Time: {result.processing_time_ms}ms")
    print(f"Verification Started: {result.verification_started}")
    print(f"Should Block: {result.should_block}")
    
    # Wait a bit for async processing to complete
    await asyncio.sleep(2)
    
    integration.shutdown()


async def example_with_project_storage():
    """
    Example 2: Hook execution with project storage
    
    Shows how to store verification results in a StoryCore project.
    """
    print("\n" + "=" * 60)
    print("Example 2: Hook Execution with Project Storage")
    print("=" * 60)
    
    # Create a temporary project directory
    project_path = Path("./temp_project")
    project_path.mkdir(exist_ok=True)
    
    # Create pipeline integration with project path
    integration = PipelineIntegration(project_path=project_path)
    
    # Configure hook to store results
    integration.configure_hook(
        "after_generate",
        HookConfig(
            enabled=True,
            blocking=True,  # Wait for completion
            store_results=True
        )
    )
    
    content = "The speed of light is approximately 299,792,458 meters per second."
    
    # Execute hook
    result = await integration.execute_hook("after_generate", content)
    
    print(f"\nHook Status: {result.status}")
    print(f"Results stored in: {project_path / 'fact_checking'}")
    
    # Check stored files
    fact_check_dir = project_path / "fact_checking"
    if fact_check_dir.exists():
        files = list(fact_check_dir.glob("*.json"))
        print(f"Stored {len(files)} result file(s)")
        for file in files:
            print(f"  - {file.name}")
    
    integration.shutdown()


async def example_with_warning_events():
    """
    Example 3: Warning event handling
    
    Shows how to register callbacks for warning events.
    """
    print("\n" + "=" * 60)
    print("Example 3: Warning Event Handling")
    print("=" * 60)
    
    # Create pipeline integration
    integration = PipelineIntegration()
    
    # Register warning event callback
    def handle_warning(event):
        print(f"\n⚠️  WARNING EVENT RECEIVED:")
        print(f"   Risk Level: {event['risk_level']}")
        print(f"   Summary: {event['summary']}")
        print(f"   Hook Stage: {event['hook_stage']}")
        print(f"   Timestamp: {event['timestamp']}")
    
    integration.register_event_callback("warning", handle_warning)
    
    # Configure hook to warn on high risk
    integration.configure_hook(
        "on_publish",
        HookConfig(
            enabled=True,
            blocking=True,
            on_high_risk="warn"
        )
    )
    
    # Content that might trigger warnings
    content = """
    Some controversial claims without proper evidence.
    Unverified statistics and questionable assertions.
    """
    
    result = await integration.execute_hook("on_publish", content)
    
    print(f"\nHook Status: {result.status}")
    print(f"Should Block: {result.should_block}")
    
    integration.shutdown()


async def example_blocking_on_high_risk():
    """
    Example 4: Blocking pipeline on high-risk content
    
    Shows how to configure hooks to block the pipeline when
    high-risk content is detected.
    """
    print("\n" + "=" * 60)
    print("Example 4: Blocking on High-Risk Content")
    print("=" * 60)
    
    # Create pipeline integration
    integration = PipelineIntegration()
    
    # Configure hook to block on high risk
    integration.configure_hook(
        "on_publish",
        HookConfig(
            enabled=True,
            blocking=True,
            on_high_risk="block"  # Block pipeline if high risk detected
        )
    )
    
    # Test with potentially problematic content
    content = "Unverified medical claims and conspiracy theories."
    
    result = await integration.execute_hook("on_publish", content)
    
    print(f"\nHook Status: {result.status}")
    print(f"Should Block Pipeline: {result.should_block}")
    
    if result.should_block:
        print("\n🛑 Pipeline would be BLOCKED due to high-risk content!")
        print("   Review and fix issues before proceeding.")
    else:
        print("\n✅ Content passed verification, pipeline can proceed.")
    
    integration.shutdown()


async def example_custom_configuration():
    """
    Example 5: Custom hook configuration
    
    Shows how to customize hook behavior with different settings.
    """
    print("\n" + "=" * 60)
    print("Example 5: Custom Hook Configuration")
    print("=" * 60)
    
    # Create custom configuration
    config = Configuration(
        confidence_threshold=80.0,  # Higher threshold
        cache_enabled=True
    )
    
    # Create pipeline integration with custom config
    integration = PipelineIntegration(config=config)
    
    # Configure different hooks with different behaviors
    integration.configure_hook(
        "before_generate",
        HookConfig(
            enabled=True,
            mode="text",
            blocking=False,  # Non-blocking
            on_high_risk="warn",
            confidence_threshold=80.0
        )
    )
    
    integration.configure_hook(
        "after_generate",
        HookConfig(
            enabled=True,
            mode="auto",
            blocking=False,
            on_high_risk="warn",
            store_results=True
        )
    )
    
    integration.configure_hook(
        "on_publish",
        HookConfig(
            enabled=True,
            mode="auto",
            blocking=True,  # Blocking
            on_high_risk="block",  # Block on high risk
            store_results=True
        )
    )
    
    # Display configuration
    status = integration.get_hook_status()
    print("\nConfigured Hooks:")
    for hook_name, hook_status in status.items():
        print(f"\n  {hook_name}:")
        print(f"    Enabled: {hook_status['enabled']}")
        print(f"    Mode: {hook_status['mode']}")
        print(f"    Blocking: {hook_status['blocking']}")
        print(f"    On High Risk: {hook_status['on_high_risk']}")
    
    integration.shutdown()


async def example_load_configuration_from_file():
    """
    Example 6: Load configuration from file
    
    Shows how to load hook configuration from a JSON file.
    """
    print("\n" + "=" * 60)
    print("Example 6: Load Configuration from File")
    print("=" * 60)
    
    # Create example configuration file
    import json
    
    config_data = {
        "fact_checker": {
            "hooks": {
                "before_generate": {
                    "enabled": True,
                    "mode": "auto",
                    "blocking": False,
                    "on_high_risk": "warn",
                    "confidence_threshold": 70.0,
                    "store_results": False
                },
                "after_generate": {
                    "enabled": True,
                    "mode": "auto",
                    "blocking": False,
                    "on_high_risk": "warn",
                    "confidence_threshold": 70.0,
                    "store_results": True
                },
                "on_publish": {
                    "enabled": True,
                    "mode": "auto",
                    "blocking": True,
                    "on_high_risk": "block",
                    "confidence_threshold": 80.0,
                    "store_results": True
                }
            }
        }
    }
    
    config_path = Path("./pipeline_config.json")
    with open(config_path, 'w') as f:
        json.dump(config_data, f, indent=2)
    
    print(f"\nCreated configuration file: {config_path}")
    
    # Create pipeline integration and load config
    integration = PipelineIntegration()
    integration.load_hook_configuration(config_path)
    
    # Display loaded configuration
    status = integration.get_hook_status()
    print("\nLoaded Hook Configuration:")
    for hook_name, hook_status in status.items():
        print(f"\n  {hook_name}:")
        for key, value in hook_status.items():
            print(f"    {key}: {value}")
    
    integration.shutdown()
    
    # Cleanup
    config_path.unlink()


async def example_complete_pipeline_workflow():
    """
    Example 7: Complete pipeline workflow
    
    Shows a complete workflow with all three hooks.
    """
    print("\n" + "=" * 60)
    print("Example 7: Complete Pipeline Workflow")
    print("=" * 60)
    
    # Create project directory
    project_path = Path("./demo_project")
    project_path.mkdir(exist_ok=True)
    
    # Create pipeline integration
    integration = PipelineIntegration(project_path=project_path)
    
    # Configure all hooks
    integration.configure_hook(
        "before_generate",
        HookConfig(enabled=True, blocking=False, store_results=False)
    )
    
    integration.configure_hook(
        "after_generate",
        HookConfig(enabled=True, blocking=False, store_results=True)
    )
    
    integration.configure_hook(
        "on_publish",
        HookConfig(enabled=True, blocking=True, on_high_risk="block", store_results=True)
    )
    
    # Simulate pipeline workflow
    script_content = """
    Scene 1: A scientist explains that water boils at 100°C at sea level.
    The molecular structure of water changes from liquid to gas.
    This process is called phase transition.
    """
    
    print("\n📝 Step 1: Before Generate (Script Validation)")
    result1 = await integration.execute_hook("before_generate", script_content)
    print(f"   Status: {result1.status} ({result1.processing_time_ms}ms)")
    
    # Simulate generation
    await asyncio.sleep(1)
    
    generated_content = script_content + "\n[Generated visual description...]"
    
    print("\n🎨 Step 2: After Generate (Content Verification)")
    result2 = await integration.execute_hook("after_generate", generated_content)
    print(f"   Status: {result2.status} ({result2.processing_time_ms}ms)")
    
    # Wait for async processing
    await asyncio.sleep(2)
    
    print("\n📦 Step 3: On Publish (Final Validation)")
    result3 = await integration.execute_hook("on_publish", generated_content)
    print(f"   Status: {result3.status} ({result3.processing_time_ms}ms)")
    print(f"   Should Block: {result3.should_block}")
    
    if not result3.should_block:
        print("\n✅ All verification passed! Content ready for publication.")
    else:
        print("\n🛑 Publication blocked due to verification issues.")
    
    integration.shutdown()


async def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("StoryCore Pipeline Integration Examples")
    print("=" * 60)
    
    await example_basic_hook_execution()
    await example_with_project_storage()
    await example_with_warning_events()
    await example_blocking_on_high_risk()
    await example_custom_configuration()
    await example_load_configuration_from_file()
    await example_complete_pipeline_workflow()
    
    print("\n" + "=" * 60)
    print("All examples completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
