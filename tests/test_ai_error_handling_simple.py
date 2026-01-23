"""
Simple test for AI Error Handling - Validation.

Tests error handling and user-friendly error messages.
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from ai_error_handler import (
    AIErrorHandler,
    ErrorHandlerConfig,
    AIError,
    AIErrorCategory,
    ErrorSeverity,
    FallbackStrategy,
    ModelLoadingError,
    InferenceError,
    ResourceExhaustionError
)

from ai_user_error_handler import (
    AIUserErrorHandler,
    UserErrorType
)


async def test_error_creation():
    """Test error creation and formatting."""
    print("🧪 Test 1: Error creation")
    
    error = ModelLoadingError(
        message="Failed to load model",
        model_id="test_model_v1"
    )
    
    assert error.category == AIErrorCategory.MODEL_LOADING
    assert error.severity == ErrorSeverity.HIGH
    assert error.suggested_fallback == FallbackStrategy.ALTERNATIVE_MODEL
    
    error_dict = error.to_dict()
    assert 'message' in error_dict
    assert 'category' in error_dict
    
    print(f"   ✅ Error created: {error}")
    print(f"   ✅ Category: {error.category.value}")
    print(f"   ✅ Severity: {error.severity.value}")
    print("   ✅ Test passed\n")


async def test_error_handler_retry():
    """Test error handler with retry."""
    print("🧪 Test 2: Error handler retry")
    
    config = ErrorHandlerConfig(
        max_retries=3,
        retry_delay_seconds=0.1
    )
    
    handler = AIErrorHandler(config)
    
    # Test successful retry
    attempt_count = [0]
    
    async def flaky_operation():
        attempt_count[0] += 1
        if attempt_count[0] < 3:
            raise Exception("Temporary failure")
        return "success"
    
    result = await handler.handle_with_retry(flaky_operation)
    
    assert result == "success"
    assert attempt_count[0] == 3
    
    print(f"   ✅ Operation succeeded after {attempt_count[0]} attempts")
    print("   ✅ Test passed\n")


async def test_error_handler_timeout():
    """Test error handler with timeout."""
    print("🧪 Test 3: Error handler timeout")
    
    config = ErrorHandlerConfig(
        default_timeout_seconds=0.5,
        enable_timeout_extension=False
    )
    
    handler = AIErrorHandler(config)
    
    # Test timeout
    async def slow_operation():
        await asyncio.sleep(2.0)
        return "done"
    
    try:
        await handler.handle_with_timeout(slow_operation, timeout_seconds=0.2)
        assert False, "Should have timed out"
    except Exception as e:
        print(f"   ✅ Operation timed out as expected: {type(e).__name__}")
    
    print("   ✅ Test passed\n")


async def test_error_recovery():
    """Test error recovery with fallback."""
    print("🧪 Test 4: Error recovery")
    
    config = ErrorHandlerConfig()
    handler = AIErrorHandler(config)
    
    # Create error
    error = InferenceError(
        message="Inference failed",
        model_id="test_model"
    )
    
    # Handle error (will use default fallback)
    result = await handler.handle_error(error, fallback_context={})
    
    assert result.strategy_used == FallbackStrategy.RETRY
    
    print(f"   ✅ Error handled with strategy: {result.strategy_used.value}")
    print(f"   ✅ Recovery time: {result.recovery_time_ms:.1f}ms")
    print("   ✅ Test passed\n")


async def test_error_statistics():
    """Test error statistics tracking."""
    print("🧪 Test 5: Error statistics")
    
    config = ErrorHandlerConfig(track_error_patterns=True)
    handler = AIErrorHandler(config)
    
    # Create and handle multiple errors
    errors = [
        ModelLoadingError("Error 1", "model1"),
        InferenceError("Error 2", "model2"),
        ResourceExhaustionError("Error 3", "gpu")
    ]
    
    for error in errors:
        await handler.handle_error(error)
    
    stats = handler.get_error_statistics()
    
    assert stats['total_errors'] == 3
    
    print(f"   ✅ Total errors tracked: {stats['total_errors']}")
    print(f"   ✅ Error categories: {len(stats['errors_by_category'])}")
    print("   ✅ Test passed\n")


def test_parameter_validation():
    """Test parameter validation."""
    print("🧪 Test 6: Parameter validation")
    
    handler = AIUserErrorHandler()
    
    # Define schema
    schema = {
        'quality': {
            'type': 'float',
            'required': True,
            'min': 0.0,
            'max': 1.0
        },
        'upscale_factor': {
            'type': 'int',
            'required': True,
            'options': [2, 4, 8]
        }
    }
    
    # Test valid parameters
    params = {
        'quality': 0.8,
        'upscale_factor': 4
    }
    
    result = handler.validate_parameters(params, schema)
    
    assert result.valid
    assert len(result.errors) == 0
    
    print(f"   ✅ Valid parameters accepted")
    
    # Test invalid parameters
    invalid_params = {
        'quality': 1.5,  # Out of range
        'upscale_factor': 3  # Not in options
    }
    
    result = handler.validate_parameters(invalid_params, schema)
    
    assert not result.valid
    assert len(result.errors) > 0
    
    print(f"   ✅ Invalid parameters rejected: {len(result.errors)} errors")
    print("   ✅ Test passed\n")


def test_user_friendly_errors():
    """Test user-friendly error creation."""
    print("🧪 Test 7: User-friendly errors")
    
    handler = AIUserErrorHandler()
    
    # Test invalid parameter error
    error = handler.create_invalid_parameter_error(
        parameter_name="quality",
        provided_value=1.5,
        expected_type="float",
        valid_range=(0.0, 1.0)
    )
    
    assert error.error_type == UserErrorType.INVALID_PARAMETER
    assert len(error.suggestions) > 0
    assert len(error.recovery_actions) > 0
    
    print(f"   ✅ Error created: {error.title}")
    print(f"   ✅ Suggestions: {len(error.suggestions)}")
    print(f"   ✅ Recovery actions: {len(error.recovery_actions)}")
    
    # Test formatted output
    formatted = handler.format_error_for_display(error)
    assert "❌" in formatted
    assert "💡" in formatted
    assert "🔧" in formatted
    
    print("   ✅ Error formatted for display")
    print("   ✅ Test passed\n")


def test_offline_mode():
    """Test offline mode support."""
    print("🧪 Test 8: Offline mode")
    
    handler = AIUserErrorHandler()
    
    # Enable offline mode
    cached_models = ["model1", "model2", "model3"]
    handler.enable_offline_mode(cached_models)
    
    assert handler.is_offline_mode()
    assert len(handler.get_cached_models()) == 3
    
    print(f"   ✅ Offline mode enabled")
    print(f"   ✅ Cached models: {len(handler.get_cached_models())}")
    
    # Create offline error
    error = handler.create_offline_mode_error(
        operation_name="model_download",
        cached_available=True
    )
    
    assert error.error_type == UserErrorType.OFFLINE_MODE
    
    print(f"   ✅ Offline error created")
    
    # Disable offline mode
    handler.disable_offline_mode()
    assert not handler.is_offline_mode()
    
    print(f"   ✅ Offline mode disabled")
    print("   ✅ Test passed\n")


async def main():
    """Run all tests."""
    print("=" * 60)
    print("AI Error Handling - Tests")
    print("=" * 60)
    print()
    
    async_tests = [
        test_error_creation,
        test_error_handler_retry,
        test_error_handler_timeout,
        test_error_recovery,
        test_error_statistics
    ]
    
    sync_tests = [
        test_parameter_validation,
        test_user_friendly_errors,
        test_offline_mode
    ]
    
    passed = 0
    failed = 0
    
    # Run async tests
    for test in async_tests:
        try:
            await test()
            passed += 1
        except Exception as e:
            print(f"   ❌ Test failed: {e}\n")
            import traceback
            traceback.print_exc()
            failed += 1
    
    # Run sync tests
    for test in sync_tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"   ❌ Test failed: {e}\n")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("✅ All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
