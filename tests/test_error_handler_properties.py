"""
Property-based tests for ComfyUI Error Handler.
Tests universal correctness properties for error handling and fallback systems.
"""

import pytest
import asyncio
from hypothesis import given, strategies as st, assume, settings
from datetime import datetime, timedelta
from typing import Dict, Any, List

from src.error_handler import (
    ErrorHandler, ErrorInfo, FallbackStrategy, FallbackMode, 
    ErrorCategory, ErrorSeverity
)
from src.comfyui_config import ComfyUIConfig


# Test data generators
@st.composite
def error_exceptions(draw):
    """Generate various types of exceptions for testing."""
    error_types = [
        ConnectionError,
        TimeoutError,
        ValueError,
        RuntimeError,
        FileNotFoundError,
        PermissionError,
        OSError
    ]
    
    error_type = draw(st.sampled_from(error_types))
    error_message = draw(st.text(min_size=1, max_size=200))
    
    return error_type(error_message)


@st.composite
def error_contexts(draw):
    """Generate error context dictionaries."""
    components = ["manager", "health_monitor", "api_orchestrator", "workflow_executor", "asset_retriever"]
    operations = ["start", "stop", "connect", "submit", "download", "health_check"]
    
    context = {
        "component": draw(st.sampled_from(components)),
        "operation": draw(st.sampled_from(operations))
    }
    
    # Add optional fields
    if draw(st.booleans()):
        context["error_type"] = draw(st.text(min_size=1, max_size=50))
    
    if draw(st.booleans()):
        context["status_code"] = draw(st.integers(min_value=400, max_value=599))
    
    return context


@st.composite
def fallback_strategies(draw):
    """Generate fallback strategy configurations."""
    mode = draw(st.sampled_from(list(FallbackMode)))
    max_retries = draw(st.integers(min_value=0, max_value=10))
    retry_delay = draw(st.floats(min_value=0.1, max_value=10.0))
    
    return FallbackStrategy(
        mode=mode,
        max_retries=max_retries,
        retry_delay=retry_delay,
        retry_multiplier=draw(st.floats(min_value=1.1, max_value=3.0)),
        max_retry_delay=draw(st.floats(min_value=retry_delay, max_value=120.0))
    )


class TestErrorHandlerProperties:
    """Property-based tests for Error Handler correctness."""
    
    def setup_method(self):
        """Set up test fixtures."""
        from pathlib import Path
        self.config = ComfyUIConfig(installation_path=Path("C:/storycore-engine/comfyui_portable"))
        self.error_handler = ErrorHandler(self.config)
    
    @given(error_exceptions(), error_contexts())
    @settings(max_examples=25, deadline=5000)
    def test_property_19_automatic_fallback(self, error, context):
        """
        Property 19: Automatic Fallback
        When errors occur, the system should automatically apply appropriate fallback strategies
        without manual intervention, ensuring continued operation.
        """
        # Analyze the error
        error_info = self.error_handler.analyze_error(error, context)
        
        # Verify error analysis produces valid results
        assert error_info.error == error
        assert error_info.category in ErrorCategory
        assert error_info.severity in ErrorSeverity
        assert isinstance(error_info.suggestions, list)
        assert len(error_info.suggestions) > 0
        assert error_info.error_id is not None
        
        # Test automatic fallback application
        async def test_fallback():
            fallback_mode = await self.error_handler.handle_error(error, context)
            
            # Verify fallback was applied or None if no strategy matched
            if fallback_mode is not None:
                assert fallback_mode in FallbackMode
                
                # Verify fallback state is tracked
                if fallback_mode in [FallbackMode.MOCK, FallbackMode.DEGRADED, FallbackMode.OFFLINE]:
                    assert self.error_handler.is_fallback_active
                    assert self.error_handler.current_fallback_mode == fallback_mode
            
            return fallback_mode
        
        # Run async test
        fallback_result = asyncio.run(test_fallback())
        
        # Verify error is recorded in history
        assert len(self.error_handler._error_history) > 0
        assert self.error_handler._error_history[-1].error_id == error_info.error_id
    
    @given(error_exceptions(), error_contexts())
    @settings(max_examples=15, deadline=5000)
    def test_property_20_error_analysis_quality(self, error, context):
        """
        Property 20: Error Analysis Quality
        Error analysis should provide accurate categorization, appropriate severity assessment,
        and actionable recovery suggestions for all error types.
        """
        error_info = self.error_handler.analyze_error(error, context)
        
        # Verify error categorization is logical
        error_msg = str(error).lower()
        error_type = type(error).__name__.lower()
        
        # Check category assignment logic
        if any(keyword in error_msg for keyword in ["connection", "timeout", "network"]):
            assert error_info.category in [ErrorCategory.NETWORK, ErrorCategory.UNKNOWN]
        
        if any(keyword in error_msg for keyword in ["config", "validation", "setting"]):
            assert error_info.category in [ErrorCategory.CONFIGURATION, ErrorCategory.UNKNOWN]
        
        # Verify severity assessment is reasonable
        if any(keyword in error_msg for keyword in ["critical", "fatal", "crash"]):
            assert error_info.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
        
        # Verify suggestions are provided and relevant
        assert len(error_info.suggestions) >= 3  # Should have multiple suggestions
        
        # Check that suggestions contain actionable advice
        suggestion_text = " ".join(error_info.suggestions).lower()
        assert any(keyword in suggestion_text for keyword in [
            "check", "verify", "try", "restart", "update", "enable", "contact"
        ])
        
        # Verify error info completeness
        assert error_info.error_type == type(error).__name__
        assert error_info.error_message == str(error)
        assert error_info.timestamp is not None
        assert isinstance(error_info.context, dict)
    
    @given(st.lists(error_exceptions(), min_size=1, max_size=10))
    @settings(max_examples=10, deadline=10000)
    def test_property_21_communication_fallback(self, errors):
        """
        Property 21: Communication Fallback
        When primary communication channels fail, the system should automatically
        fall back to alternative methods (WebSocket -> HTTP -> Mock).
        """
        # Test progressive fallback through multiple errors
        fallback_modes = []
        
        async def test_progressive_fallback():
            for i, error in enumerate(errors):
                # Create context indicating communication failure
                context = {
                    "component": "api_orchestrator",
                    "operation": "connect" if i == 0 else "submit_workflow",
                    "error_type": "network" if "connection" in str(error).lower() else "unknown"
                }
                
                fallback_mode = await self.error_handler.handle_error(error, context)
                fallback_modes.append(fallback_mode)
                
                # Verify fallback progression makes sense
                if fallback_mode == FallbackMode.MOCK:
                    # Once in mock mode, should stay in mock mode for subsequent errors
                    assert self.error_handler.is_fallback_active
                    assert self.error_handler.current_fallback_mode == FallbackMode.MOCK
        
        asyncio.run(test_progressive_fallback())
        
        # Verify that some form of fallback was applied for communication errors
        network_errors = [e for e in errors if any(keyword in str(e).lower() 
                                                  for keyword in ["connection", "timeout", "network"])]
        
        if network_errors:
            # Should have applied some fallback for network-related errors
            applied_fallbacks = [mode for mode in fallback_modes if mode is not None]
            assert len(applied_fallbacks) > 0
    
    @given(fallback_strategies(), st.integers(min_value=1, max_value=5))
    @settings(max_examples=10, deadline=5000)
    def test_property_22_diagnostic_logging(self, strategy, num_errors):
        """
        Property 22: Diagnostic Logging
        The system should maintain comprehensive diagnostic logs and metrics
        for troubleshooting and performance analysis.
        """
        # Generate multiple errors to test logging
        errors = [RuntimeError(f"Test error {i}") for i in range(num_errors)]
        
        async def test_logging():
            for error in errors:
                context = {"component": "test", "operation": "logging_test"}
                await self.error_handler.handle_error(error, context)
        
        asyncio.run(test_logging())
        
        # Verify diagnostic information is comprehensive
        diagnostic_info = self.error_handler.get_diagnostic_info()
        
        # Check diagnostic structure
        assert "error_handler_status" in diagnostic_info
        assert "error_summary" in diagnostic_info
        assert "fallback_strategies" in diagnostic_info
        assert "recent_errors" in diagnostic_info
        
        # Verify error tracking
        error_summary = self.error_handler.get_error_summary()
        assert error_summary["total_errors"] == num_errors
        assert "error_patterns" in error_summary
        assert "category_distribution" in error_summary
        assert "severity_distribution" in error_summary
        
        # Verify performance metrics are collected
        metrics = self.error_handler.get_performance_metrics()
        assert len(metrics) >= num_errors  # At least one metric per error analysis
        
        # Verify error history is maintained
        assert len(self.error_handler._error_history) == num_errors
        
        # Check that recent errors are properly tracked
        recent_errors = [e for e in self.error_handler._error_history 
                        if (datetime.utcnow() - e.timestamp) < timedelta(hours=1)]
        assert len(recent_errors) == num_errors
    
    @given(st.integers(min_value=1, max_value=5))
    @settings(max_examples=5, deadline=5000)
    def test_property_fallback_strategy_consistency(self, retry_count):
        """
        Test that fallback strategies behave consistently across multiple applications.
        """
        strategy = FallbackStrategy(
            mode=FallbackMode.RETRY,
            max_retries=retry_count,
            retry_delay=1.0,
            retry_multiplier=2.0
        )
        
        # Test retry logic consistency
        delays = []
        for i in range(retry_count + 1):  # +1 to test exceeding max retries
            if strategy.can_retry():
                delay = strategy.calculate_delay()
                delays.append(delay)
                strategy.retry_count += 1
            else:
                break
        
        # Verify exponential backoff pattern
        if len(delays) > 1:
            for i in range(1, len(delays)):
                if delays[i-1] > 0:  # Skip first delay which is 0
                    assert delays[i] >= delays[i-1]  # Should be non-decreasing
        
        # Verify retry limit is respected
        assert strategy.retry_count <= retry_count
        assert not strategy.can_retry() or strategy.retry_count < retry_count
    
    @given(st.lists(error_exceptions(), min_size=5, max_size=20))
    @settings(max_examples=5, deadline=10000)
    def test_property_error_pattern_detection(self, errors):
        """
        Test that error patterns are properly detected and tracked.
        """
        async def analyze_errors():
            for error in errors:
                context = {"component": "test", "operation": "pattern_test"}
                await self.error_handler.handle_error(error, context)
        
        asyncio.run(analyze_errors())
        
        # Verify pattern tracking
        error_summary = self.error_handler.get_error_summary()
        patterns = error_summary["error_patterns"]
        
        # Should have detected some patterns
        assert len(patterns) > 0
        
        # Verify pattern counts are accurate
        total_pattern_count = sum(patterns.values())
        assert total_pattern_count == len(errors)
        
        # Verify category distribution makes sense
        category_dist = error_summary["category_distribution"]
        total_categories = sum(category_dist.values())
        assert total_categories == len(errors)
    
    def test_property_recovery_callback_reliability(self):
        """
        Test that recovery callbacks are reliably called when fallbacks are applied.
        """
        callback_calls = []
        
        def test_callback(error_info, fallback_mode):
            callback_calls.append((error_info.error_id, fallback_mode))
        
        self.error_handler.add_recovery_callback(test_callback)
        
        async def test_callbacks():
            # Generate errors that should trigger fallbacks
            errors = [
                ConnectionError("Network failure"),
                RuntimeError("Service failure"),
                ValueError("Configuration error")
            ]
            
            for error in errors:
                context = {"component": "test", "operation": "callback_test"}
                await self.error_handler.handle_error(error, context)
        
        asyncio.run(test_callbacks())
        
        # Verify callbacks were called for fallback activations
        # Note: Not all errors may trigger fallbacks, but some should
        if self.error_handler.is_fallback_active:
            assert len(callback_calls) > 0
        
        # Test callback removal
        self.error_handler.remove_recovery_callback(test_callback)
        
        # Generate another error
        async def test_removal():
            await self.error_handler.handle_error(RuntimeError("Test removal"), {})
        
        initial_callback_count = len(callback_calls)
        asyncio.run(test_removal())
        
        # Should not have new callbacks after removal
        assert len(callback_calls) == initial_callback_count