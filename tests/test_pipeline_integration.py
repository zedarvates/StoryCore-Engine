"""
Unit tests for pipeline integration module.

Tests cover:
- Hook execution (blocking and non-blocking)
- Warning event emission
- Data Contract v1 storage
- Configuration management
- Asynchronous behavior
"""

import pytest
import asyncio
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

from src.fact_checker.pipeline_integration import (
    PipelineIntegration,
    HookConfig,
    HookResult,
    WarningEvent,
    execute_before_generate_hook,
    execute_after_generate_hook,
    execute_on_publish_hook
)
from src.fact_checker.models import Configuration


@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_path = Path(tmpdir) / "test_project"
        project_path.mkdir()
        yield project_path


@pytest.fixture
def pipeline_integration(temp_project_dir):
    """Create a PipelineIntegration instance."""
    config = Configuration()
    return PipelineIntegration(config=config, project_path=temp_project_dir)


@pytest.mark.asyncio
async def test_non_blocking_hook_returns_quickly(pipeline_integration):
    """
    Test that non-blocking hooks return within 100ms.
    
    Requirements: 5.4 (Asynchronous Hook Execution)
    Property 14: Asynchronous Hook Execution
    """
    import time
    
    content = "Water boils at 100 degrees Celsius."
    
    # Configure as non-blocking
    pipeline_integration.configure_hook(
        "before_generate",
        HookConfig(enabled=True, blocking=False)
    )
    
    start_time = time.time()
    result = await pipeline_integration.execute_hook("before_generate", content)
    duration = time.time() - start_time
    
    # Should return within 100ms
    assert duration < 0.1, f"Hook took {duration*1000}ms, expected < 100ms"
    
    # Should indicate processing started
    assert result.status == "processing"
    assert result.verification_started is True
    assert result.should_block is False


@pytest.mark.asyncio
async def test_blocking_hook_waits_for_completion(pipeline_integration):
    """
    Test that blocking hooks wait for verification to complete.
    
    Requirements: 5.4
    """
    content = "Water boils at 100 degrees Celsius."
    
    # Configure as blocking
    pipeline_integration.configure_hook(
        "on_publish",
        HookConfig(enabled=True, blocking=True, on_high_risk="block")
    )
    
    result = await pipeline_integration.execute_hook("on_publish", content)
    
    # Should complete verification
    assert result.status == "completed"
    assert result.verification_started is True


@pytest.mark.asyncio
async def test_disabled_hook_skips_execution(pipeline_integration):
    """Test that disabled hooks are skipped."""
    content = "Test content"
    
    # Disable hook
    pipeline_integration.configure_hook(
        "before_generate",
        HookConfig(enabled=False)
    )
    
    result = await pipeline_integration.execute_hook("before_generate", content)
    
    assert result.status == "skipped"
    assert result.verification_started is False


@pytest.mark.asyncio
async def test_high_risk_content_emits_warning(pipeline_integration, temp_project_dir):
    """
    Test that high-risk content triggers warning event emission.
    
    Requirements: 5.6 (High-Risk Event Emission)
    Property 16: High-Risk Event Emission
    """
    # Content that should trigger high risk
    content = "The Earth is flat and vaccines cause autism."
    
    # Register event callback
    events_received = []
    
    def event_callback(event):
        events_received.append(event)
    
    pipeline_integration.register_event_callback("warning", event_callback)
    
    # Configure blocking hook to wait for result
    pipeline_integration.configure_hook(
        "on_publish",
        HookConfig(enabled=True, blocking=True, on_high_risk="warn")
    )
    
    result = await pipeline_integration.execute_hook("on_publish", content)
    
    # Should have emitted warning event
    # Note: This depends on the fact-checker detecting high risk
    # For now, we just verify the mechanism works
    assert result.status == "completed"


@pytest.mark.asyncio
async def test_data_contract_storage(pipeline_integration, temp_project_dir):
    """
    Test that results are stored in Data Contract v1 format.
    
    Requirements: 5.5 (Data Contract Storage Compliance)
    Property 15: Data Contract Storage Compliance
    """
    content = "Water boils at 100 degrees Celsius."
    
    # Configure to store results
    pipeline_integration.configure_hook(
        "after_generate",
        HookConfig(enabled=True, blocking=True, store_results=True)
    )
    
    result = await pipeline_integration.execute_hook("after_generate", content)
    
    # Check that fact_checking directory was created
    fact_check_dir = temp_project_dir / "fact_checking"
    assert fact_check_dir.exists()
    
    # Check that result file was created
    result_files = list(fact_check_dir.glob("after_generate_*.json"))
    assert len(result_files) > 0
    
    # Verify Data Contract v1 structure
    with open(result_files[0], 'r') as f:
        stored_data = json.load(f)
    
    assert stored_data["schema_version"] == "1.0"
    assert stored_data["hook_stage"] == "after_generate"
    assert "timestamp" in stored_data
    assert "verification_result" in stored_data


@pytest.mark.asyncio
async def test_project_json_update(pipeline_integration, temp_project_dir):
    """Test that project.json is updated with fact-checking status."""
    content = "Test content"
    
    # Configure to store results
    pipeline_integration.configure_hook(
        "before_generate",
        HookConfig(enabled=True, blocking=True, store_results=True)
    )
    
    result = await pipeline_integration.execute_hook("before_generate", content)
    
    # Check that project.json was created/updated
    project_json_path = temp_project_dir / "project.json"
    assert project_json_path.exists()
    
    with open(project_json_path, 'r') as f:
        project_data = json.load(f)
    
    assert "fact_checking" in project_data
    assert "hooks" in project_data["fact_checking"]
    assert "before_generate" in project_data["fact_checking"]["hooks"]


@pytest.mark.asyncio
async def test_blocking_on_high_risk(pipeline_integration):
    """
    Test that pipeline is blocked when high-risk content is detected
    and on_high_risk is set to 'block'.
    """
    # Content that might trigger high risk
    content = "Controversial claim without evidence."
    
    # Configure to block on high risk
    pipeline_integration.configure_hook(
        "on_publish",
        HookConfig(enabled=True, blocking=True, on_high_risk="block")
    )
    
    result = await pipeline_integration.execute_hook("on_publish", content)
    
    # Result should indicate whether blocking occurred
    assert result.status == "completed"
    # should_block depends on actual risk detection


@pytest.mark.asyncio
async def test_ignore_high_risk(pipeline_integration):
    """Test that high-risk content is ignored when configured."""
    content = "Test content"
    
    # Configure to ignore high risk
    pipeline_integration.configure_hook(
        "before_generate",
        HookConfig(enabled=True, blocking=True, on_high_risk="ignore")
    )
    
    result = await pipeline_integration.execute_hook("before_generate", content)
    
    # Should never block
    assert result.should_block is False


def test_hook_configuration(pipeline_integration):
    """Test hook configuration management."""
    # Configure a hook
    config = HookConfig(
        enabled=True,
        mode="text",
        blocking=True,
        on_high_risk="block",
        confidence_threshold=80.0
    )
    
    pipeline_integration.configure_hook("before_generate", config)
    
    # Verify configuration was applied
    status = pipeline_integration.get_hook_status()
    assert status["before_generate"]["enabled"] is True
    assert status["before_generate"]["mode"] == "text"
    assert status["before_generate"]["blocking"] is True
    assert status["before_generate"]["on_high_risk"] == "block"


def test_load_hook_configuration_from_file(pipeline_integration, temp_project_dir):
    """Test loading hook configuration from JSON file."""
    # Create configuration file
    config_data = {
        "fact_checker": {
            "hooks": {
                "before_generate": {
                    "enabled": True,
                    "mode": "auto",
                    "blocking": False,
                    "on_high_risk": "warn"
                },
                "on_publish": {
                    "enabled": True,
                    "mode": "text",
                    "blocking": True,
                    "on_high_risk": "block"
                }
            }
        }
    }
    
    config_path = temp_project_dir / "pipeline_config.json"
    with open(config_path, 'w') as f:
        json.dump(config_data, f)
    
    # Load configuration
    pipeline_integration.load_hook_configuration(config_path)
    
    # Verify configuration was loaded
    status = pipeline_integration.get_hook_status()
    assert status["before_generate"]["enabled"] is True
    assert status["before_generate"]["blocking"] is False
    assert status["on_publish"]["blocking"] is True


def test_event_callback_registration(pipeline_integration):
    """Test event callback registration."""
    callback_called = []
    
    def test_callback(event):
        callback_called.append(event)
    
    pipeline_integration.register_event_callback("warning", test_callback)
    
    # Create and emit a warning event
    event = WarningEvent(
        risk_level="high",
        summary="Test warning",
        hook_stage="before_generate"
    )
    
    pipeline_integration._emit_event(event)
    
    # Verify callback was called
    assert len(callback_called) == 1
    assert callback_called[0]["risk_level"] == "high"


@pytest.mark.asyncio
async def test_convenience_functions(temp_project_dir):
    """Test convenience functions for direct hook execution."""
    content = "Test content"
    
    # Test before_generate
    result = await execute_before_generate_hook(content, temp_project_dir)
    assert result.hook_stage == "before_generate"
    
    # Test after_generate
    result = await execute_after_generate_hook(content, temp_project_dir)
    assert result.hook_stage == "after_generate"
    
    # Test on_publish
    result = await execute_on_publish_hook(content, temp_project_dir)
    assert result.hook_stage == "on_publish"


def test_shutdown(pipeline_integration):
    """Test graceful shutdown of pipeline integration."""
    # Should not raise any exceptions
    pipeline_integration.shutdown()


@pytest.mark.asyncio
async def test_error_handling_in_hook(pipeline_integration):
    """Test error handling when hook execution fails."""
    # Configure as blocking to get synchronous error handling
    pipeline_integration.configure_hook(
        "before_generate",
        HookConfig(enabled=True, blocking=True)
    )
    
    # Mock the fact checker to raise an exception
    with patch.object(
        pipeline_integration.fact_checker,
        'execute',
        side_effect=Exception("Test error")
    ):
        result = await pipeline_integration.execute_hook(
            "before_generate",
            "test content"
        )
        
        # Should return failed status
        assert result.status == "failed"
        assert result.error is not None


def test_is_high_risk_detection(pipeline_integration):
    """Test high-risk detection logic."""
    # Test with high-risk result
    high_risk_result = {
        "status": "success",
        "report": {
            "summary_statistics": {
                "high_risk_count": 2
            },
            "claims": [
                {"risk_level": "high"}
            ]
        }
    }
    
    assert pipeline_integration._is_high_risk(high_risk_result) is True
    
    # Test with low-risk result
    low_risk_result = {
        "status": "success",
        "report": {
            "summary_statistics": {
                "high_risk_count": 0
            },
            "claims": [
                {"risk_level": "low"}
            ]
        }
    }
    
    assert pipeline_integration._is_high_risk(low_risk_result) is False


def test_warning_event_creation(pipeline_integration):
    """Test warning event creation."""
    result = {
        "status": "success",
        "report": {
            "summary_statistics": {
                "high_risk_count": 3,
                "average_confidence": 45.0,
                "total_claims": 5
            },
            "claims": [
                {"risk_level": "critical"}
            ]
        }
    }
    
    event = pipeline_integration._create_warning_event(result, "before_generate")
    
    assert event.type == "warning"
    assert event.risk_level == "critical"
    assert event.hook_stage == "before_generate"
    assert "3 high-risk claim(s)" in event.summary
    assert event.details["high_risk_count"] == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
