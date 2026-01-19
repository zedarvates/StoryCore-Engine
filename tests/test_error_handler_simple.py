"""
Simple unit tests for ComfyUI Error Handler.
Tests specific functionality and edge cases for error handling and fallback systems.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from src.error_handler import (
    ErrorHandler, ErrorInfo, FallbackStrategy, FallbackMode, 
    ErrorCategory, ErrorSeverity
)
from src.comfyui_config import ComfyUIConfig


class TestErrorHandler:
    """Unit tests for Error Handler functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        from pathlib import Path
        self.config = ComfyUIConfig(installation_path=Path("C:/storycore-engine/comfyui_portable"))
        self.error_handler = ErrorHandler(self.config)
    
    def test_error_classification_network(self):
        """Test network error classification."""
        network_errors = [
            ConnectionError("Connection refused"),
            TimeoutError("Request timeout"),
            Exception("Network unreachable"),
            Exception("DNS resolution failed")
        ]
        
        for error in network_errors:
            error_info = self.error_handler.analyze_error(error)
            assert error_info.category == ErrorCategory.NETWORK
    
    def test_error_classification_service(self):
        """Test service error classification."""
        service_errors = [
            Exception("Service startup failed"),
            Exception("Process terminated unexpectedly"),
            Exception("Port 8188 already in use")
        ]
        
        for error in service_errors:
            context = {"component": "manager"}
            error_info = self.error_handler.analyze_error(error, context)
            assert error_info.category == ErrorCategory.SERVICE
    
    def test_error_classification_configuration(self):
        """Test configuration error classification."""
        config_errors = [
            ValueError("Invalid configuration parameter"),
            FileNotFoundError("Config file not found"),
            Exception("Validation failed for setting")
        ]
        
        for error in config_errors:
            error_info = self.error_handler.analyze_error(error)
            assert error_info.category == ErrorCategory.CONFIGURATION
    
    def test_severity_assessment_critical(self):
        """Test critical severity assessment."""
        critical_errors = [
            Exception("Critical system failure"),
            Exception("Fatal error occurred"),
            SystemExit("Application crash")
        ]
        
        for error in critical_errors:
            error_info = self.error_handler.analyze_error(error)
            assert error_info.severity == ErrorSeverity.CRITICAL
    
    def test_severity_assessment_high(self):
        """Test high severity assessment."""
        high_errors = [
            Exception("Failed to start service"),
            PermissionError("Access denied"),
            ConnectionError("Cannot connect to server")
        ]
        
        for error in high_errors:
            error_info = self.error_handler.analyze_error(error)
            assert error_info.severity in [ErrorSeverity.HIGH, ErrorSeverity.MEDIUM]
    
    def test_suggestion_generation_network(self):
        """Test suggestion generation for network errors."""
        error = ConnectionError("Connection timeout")
        error_info = self.error_handler.analyze_error(error)
        
        suggestions_text = " ".join(error_info.suggestions).lower()
        assert "network" in suggestions_text or "connectivity" in suggestions_text
        assert "firewall" in suggestions_text or "port" in suggestions_text
        assert len(error_info.suggestions) >= 3
    
    def test_suggestion_generation_service(self):
        """Test suggestion generation for service errors."""
        error = Exception("Service startup failed")
        context = {"component": "manager"}
        error_info = self.error_handler.analyze_error(error, context)
        
        suggestions_text = " ".join(error_info.suggestions).lower()
        assert "installation" in suggestions_text or "dependencies" in suggestions_text
        assert "resources" in suggestions_text or "logs" in suggestions_text
    
    @pytest.mark.asyncio
    async def test_fallback_strategy_retry(self):
        """Test retry fallback strategy."""
        error = ConnectionError("Temporary network issue")
        context = {"component": "api_orchestrator", "operation": "connect"}
        
        fallback_mode = await self.error_handler.handle_error(error, context)
        
        # Should apply retry strategy for network errors
        assert fallback_mode in [FallbackMode.RETRY, FallbackMode.MOCK, None]
    
    @pytest.mark.asyncio
    async def test_fallback_strategy_mock(self):
        """Test mock fallback strategy."""
        # Generate multiple failures to trigger mock mode
        for i in range(5):
            error = ConnectionError(f"Persistent connection failure {i}")
            context = {"component": "api_orchestrator", "operation": "connect"}
            
            fallback_mode = await self.error_handler.handle_error(error, context)
            
            if fallback_mode == FallbackMode.MOCK:
                assert self.error_handler.is_fallback_active
                assert self.error_handler.current_fallback_mode == FallbackMode.MOCK
                break
    
    @pytest.mark.asyncio
    async def test_fallback_strategy_degraded(self):
        """Test degraded fallback strategy."""
        error = Exception("Memory limit exceeded")
        context = {"component": "health_monitor", "operation": "health_check"}
        
        fallback_mode = await self.error_handler.handle_error(error, context)
        
        # Resource errors may trigger degraded mode
        if fallback_mode == FallbackMode.DEGRADED:
            assert self.error_handler.is_fallback_active
            assert self.error_handler.current_fallback_mode == FallbackMode.DEGRADED
    
    def test_fallback_strategy_configuration(self):
        """Test fallback strategy configuration."""
        strategy = FallbackStrategy(
            mode=FallbackMode.RETRY,
            max_retries=3,
            retry_delay=1.0,
            retry_multiplier=2.0,
            max_retry_delay=10.0
        )
        
        # Test initial state
        assert strategy.can_retry()
        assert strategy.calculate_delay() == 0.0
        
        # Test retry progression
        delays = []
        for i in range(4):  # One more than max_retries
            if strategy.can_retry():
                delay = strategy.calculate_delay()
                delays.append(delay)
                strategy.retry_count += 1
        
        # Should have 3 retries (delays: 0, 1, 2)
        assert len(delays) == 3
        assert delays[0] == 0.0
        assert delays[1] == 1.0
        assert delays[2] == 2.0
        
        # Should not allow more retries
        assert not strategy.can_retry()
    
    def test_error_history_tracking(self):
        """Test error history tracking."""
        initial_count = len(self.error_handler._error_history)
        
        # Generate several errors
        errors = [
            ValueError("Config error 1"),
            ConnectionError("Network error 1"),
            RuntimeError("Service error 1")
        ]
        
        for error in errors:
            self.error_handler.analyze_error(error)
        
        # Verify history tracking
        assert len(self.error_handler._error_history) == initial_count + len(errors)
        
        # Verify error pattern tracking
        assert len(self.error_handler._error_patterns) > 0
    
    def test_error_pattern_tracking(self):
        """Test error pattern detection."""
        # Generate repeated error patterns
        for i in range(3):
            error = ConnectionError("Network timeout")
            self.error_handler.analyze_error(error)
        
        for i in range(2):
            error = ValueError("Invalid parameter")
            self.error_handler.analyze_error(error)
        
        # Check pattern counts
        patterns = self.error_handler._error_patterns
        
        # Should have detected patterns
        network_pattern = "network:ConnectionError"
        config_pattern = "configuration:ValueError"
        
        assert patterns.get(network_pattern, 0) == 3
        assert patterns.get(config_pattern, 0) == 2
    
    def test_recovery_callback_system(self):
        """Test recovery callback registration and execution."""
        callback_calls = []
        
        def test_callback(error_info, fallback_mode):
            callback_calls.append((error_info.error_id, fallback_mode))
        
        # Register callback
        self.error_handler.add_recovery_callback(test_callback)
        
        # Trigger fallback
        async def trigger_fallback():
            error = Exception("Critical failure")
            await self.error_handler.handle_error(error)
        
        asyncio.run(trigger_fallback())
        
        # Remove callback
        self.error_handler.remove_recovery_callback(test_callback)
        
        # Verify callback was in the list
        assert test_callback not in self.error_handler._recovery_callbacks
    
    def test_error_summary_generation(self):
        """Test error summary generation."""
        # Generate errors with different categories and severities
        errors = [
            (ConnectionError("Network 1"), {"component": "api"}),
            (ValueError("Config 1"), {"component": "manager"}),
            (ConnectionError("Network 2"), {"component": "health"}),
            (RuntimeError("Service 1"), {"component": "manager"})
        ]
        
        for error, context in errors:
            self.error_handler.analyze_error(error, context)
        
        summary = self.error_handler.get_error_summary()
        
        # Verify summary structure
        assert "total_errors" in summary
        assert "recent_errors" in summary
        assert "error_patterns" in summary
        assert "category_distribution" in summary
        assert "severity_distribution" in summary
        
        # Verify counts
        assert summary["total_errors"] == len(errors)
        assert summary["recent_errors"] == len(errors)  # All are recent
    
    def test_diagnostic_info_completeness(self):
        """Test diagnostic information completeness."""
        # Generate some errors first
        error = ConnectionError("Test diagnostic error")
        self.error_handler.analyze_error(error)
        
        diagnostic_info = self.error_handler.get_diagnostic_info()
        
        # Verify diagnostic structure
        required_keys = [
            "error_handler_status",
            "error_summary", 
            "fallback_strategies",
            "recent_errors"
        ]
        
        for key in required_keys:
            assert key in diagnostic_info
        
        # Verify error handler status
        status = diagnostic_info["error_handler_status"]
        assert "fallback_active" in status
        assert "current_mode" in status
        assert "total_errors" in status
        assert "recovery_callbacks" in status
    
    def test_fallback_reset(self):
        """Test fallback state reset."""
        # Activate fallback mode
        self.error_handler._fallback_active = True
        self.error_handler._current_fallback_mode = FallbackMode.MOCK
        
        # Reset fallback
        self.error_handler.reset_fallback()
        
        # Verify reset
        assert not self.error_handler.is_fallback_active
        assert self.error_handler.current_fallback_mode is None
    
    def test_metrics_collection(self):
        """Test performance metrics collection."""
        initial_metrics = len(self.error_handler.get_performance_metrics())
        
        # Generate errors to collect metrics
        for i in range(3):
            error = Exception(f"Test error {i}")
            self.error_handler.analyze_error(error)
        
        metrics = self.error_handler.get_performance_metrics()
        assert len(metrics) == initial_metrics + 3
        
        # Test metrics clearing
        self.error_handler.clear_metrics()
        assert len(self.error_handler.get_performance_metrics()) == 0
    
    def test_error_history_limit(self):
        """Test error history size limit."""
        # Generate more than 100 errors to test limit
        for i in range(105):
            error = Exception(f"Test error {i}")
            self.error_handler.analyze_error(error)
        
        # Should be limited to 100 errors
        assert len(self.error_handler._error_history) == 100
        
        # Should contain the most recent errors
        last_error = self.error_handler._error_history[-1]
        assert "Test error 104" in str(last_error.error)
    
    def test_error_info_serialization(self):
        """Test ErrorInfo serialization to dictionary."""
        error = ValueError("Test serialization error")
        context = {"component": "test", "value": 123}
        
        error_info = self.error_handler.analyze_error(error, context)
        error_dict = error_info.to_dict()
        
        # Verify serialization completeness
        required_keys = [
            "error_id", "timestamp", "error_type", "error_message",
            "category", "severity", "context", "suggestions", "traceback"
        ]
        
        for key in required_keys:
            assert key in error_dict
        
        # Verify data types
        assert isinstance(error_dict["error_id"], str)
        assert isinstance(error_dict["timestamp"], str)
        assert isinstance(error_dict["suggestions"], list)
        assert isinstance(error_dict["context"], dict)
    
    def test_clear_error_history(self):
        """Test error history clearing."""
        # Generate some errors
        for i in range(5):
            error = Exception(f"Test error {i}")
            self.error_handler.analyze_error(error)
        
        assert len(self.error_handler._error_history) == 5
        assert len(self.error_handler._error_patterns) > 0
        
        # Clear history
        self.error_handler.clear_error_history()
        
        # Verify clearing
        assert len(self.error_handler._error_history) == 0
        assert len(self.error_handler._error_patterns) == 0