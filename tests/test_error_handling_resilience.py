"""
Tests for Error Handling and Resilience System

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import asyncio
import unittest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from src.error_handling_resilience import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerOpenError,
    CircuitState,
    ErrorAnalytics,
    ErrorCategory,
    ErrorHandlingSystem,
    ErrorInfo,
    ErrorSeverity,
    FallbackChain,
    FallbackChainExhaustedError,
    GracefulDegradation,
    RecoveryProcedure,
    RetryConfig,
    RetryMechanism,
)


class TestRetryMechanism(unittest.TestCase):
    """Test retry mechanism"""
    
    def setUp(self):
        self.retry = RetryMechanism(RetryConfig(max_attempts=3, initial_delay=0.1))
    
    def test_calculate_delay(self):
        """Test delay calculation"""
        delay0 = self.retry.calculate_delay(0)
        delay1 = self.retry.calculate_delay(1)
        delay2 = self.retry.calculate_delay(2)
        
        self.assertGreater(delay1, delay0)
        self.assertGreater(delay2, delay1)
    
    def test_is_retryable(self):
        """Test retryable exception detection"""
        self.assertTrue(self.retry.is_retryable(ConnectionError()))
        self.assertTrue(self.retry.is_retryable(TimeoutError()))
        self.assertFalse(self.retry.is_retryable(ValueError()))
    
    async def test_execute_with_retry_success(self):
        """Test successful execution with retry"""
        call_count = 0
        
        async def flaky_func():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ConnectionError("Temporary error")
            return "success"
        
        result = await self.retry.execute_with_retry(flaky_func)
        self.assertEqual(result, "success")
        self.assertEqual(call_count, 2)
    
    async def test_execute_with_retry_exhausted(self):
        """Test retry exhaustion"""
        async def always_fails():
            raise ConnectionError("Always fails")
        
        with self.assertRaises(ConnectionError):
            await self.retry.execute_with_retry(always_fails)
    
    async def test_execute_with_retry_non_retryable(self):
        """Test non-retryable exception"""
        async def non_retryable_error():
            raise ValueError("Not retryable")
        
        with self.assertRaises(ValueError):
            await self.retry.execute_with_retry(non_retryable_error)
    
    def test_get_stats(self):
        """Test statistics collection"""
        stats = self.retry.get_stats()
        self.assertIsInstance(stats, dict)


class TestCircuitBreaker(unittest.TestCase):
    """Test circuit breaker"""
    
    def setUp(self):
        self.circuit_breaker = CircuitBreaker(
            "test_circuit",
            CircuitBreakerConfig(failure_threshold=2, timeout=1.0)
        )
    
    def test_initial_state(self):
        """Test initial state is CLOSED"""
        self.assertEqual(self.circuit_breaker.state, CircuitState.CLOSED)
        self.assertTrue(self.circuit_breaker.can_execute())
    
    def test_transition_to_open(self):
        """Test transition to OPEN state"""
        # Record failures
        self.circuit_breaker.record_failure()
        self.assertEqual(self.circuit_breaker.state, CircuitState.CLOSED)
        
        self.circuit_breaker.record_failure()
        self.assertEqual(self.circuit_breaker.state, CircuitState.OPEN)
        self.assertFalse(self.circuit_breaker.can_execute())
    
    async def test_transition_to_half_open(self):
        """Test transition to HALF_OPEN state"""
        # Open the circuit
        self.circuit_breaker.record_failure()
        self.circuit_breaker.record_failure()
        self.assertEqual(self.circuit_breaker.state, CircuitState.OPEN)
        
        # Wait for timeout
        await asyncio.sleep(1.1)
        
        # Should transition to HALF_OPEN
        self.assertTrue(self.circuit_breaker.can_execute())
        self.assertEqual(self.circuit_breaker.state, CircuitState.HALF_OPEN)
    
    def test_transition_to_closed(self):
        """Test transition back to CLOSED state"""
        # Set to HALF_OPEN
        self.circuit_breaker.state = CircuitState.HALF_OPEN
        
        # Record successes
        self.circuit_breaker.record_success()
        self.circuit_breaker.record_success()
        
        self.assertEqual(self.circuit_breaker.state, CircuitState.CLOSED)
    
    async def test_execute_success(self):
        """Test successful execution"""
        async def success_func():
            return "success"
        
        result = await self.circuit_breaker.execute(success_func)
        self.assertEqual(result, "success")
    
    async def test_execute_failure(self):
        """Test failed execution"""
        async def fail_func():
            raise Exception("Test error")
        
        with self.assertRaises(Exception):
            await self.circuit_breaker.execute(fail_func)
    
    async def test_execute_when_open(self):
        """Test execution when circuit is open"""
        # Open the circuit
        self.circuit_breaker.record_failure()
        self.circuit_breaker.record_failure()
        
        async def test_func():
            return "should not execute"
        
        with self.assertRaises(CircuitBreakerOpenError):
            await self.circuit_breaker.execute(test_func)
    
    def test_get_state(self):
        """Test state retrieval"""
        state = self.circuit_breaker.get_state()
        self.assertIn('name', state)
        self.assertIn('state', state)
        self.assertIn('failure_count', state)


class TestFallbackChain(unittest.TestCase):
    """Test fallback chain"""
    
    def setUp(self):
        self.chain = FallbackChain("test_chain")
    
    async def test_first_succeeds(self):
        """Test when first function succeeds"""
        async def primary():
            return "primary"
        
        async def fallback():
            return "fallback"
        
        self.chain.add_fallback(primary)
        self.chain.add_fallback(fallback)
        
        result = await self.chain.execute()
        self.assertEqual(result, "primary")
    
    async def test_fallback_succeeds(self):
        """Test when fallback succeeds"""
        async def primary():
            raise Exception("Primary failed")
        
        async def fallback():
            return "fallback"
        
        self.chain.add_fallback(primary)
        self.chain.add_fallback(fallback)
        
        result = await self.chain.execute()
        self.assertEqual(result, "fallback")
    
    async def test_all_fail(self):
        """Test when all fallbacks fail"""
        async def primary():
            raise Exception("Primary failed")
        
        async def fallback():
            raise Exception("Fallback failed")
        
        self.chain.add_fallback(primary)
        self.chain.add_fallback(fallback)
        
        with self.assertRaises(FallbackChainExhaustedError):
            await self.chain.execute()
    
    def test_get_stats(self):
        """Test statistics collection"""
        stats = self.chain.get_stats()
        self.assertIsInstance(stats, dict)


class TestGracefulDegradation(unittest.TestCase):
    """Test graceful degradation"""
    
    def setUp(self):
        self.degradation = GracefulDegradation()
    
    def test_initial_level(self):
        """Test initial degradation level"""
        self.assertEqual(self.degradation.current_level, 'full')
    
    def test_degrade(self):
        """Test service degradation"""
        level = self.degradation.degrade("Test reason")
        self.assertEqual(level, 'high')
        
        level = self.degradation.degrade("Another reason")
        self.assertEqual(level, 'medium')
    
    def test_restore(self):
        """Test service restoration"""
        self.degradation.degrade("Test")
        self.degradation.degrade("Test")
        
        level = self.degradation.restore()
        self.assertEqual(level, 'high')
    
    def test_get_config(self):
        """Test configuration retrieval"""
        config = self.degradation.get_config()
        self.assertIn('quality', config)
        self.assertIn('features', config)
    
    def test_adjust_parameters(self):
        """Test parameter adjustment"""
        params = {
            'quality': 1.0,
            'resolution': '1080p',
            'steps': 50
        }
        
        self.degradation.degrade("Test")
        adjusted = self.degradation.adjust_parameters(params)
        
        self.assertLess(adjusted['quality'], params['quality'])
        self.assertLess(adjusted['steps'], params['steps'])
    
    def test_adjust_resolution(self):
        """Test resolution adjustment"""
        self.degradation.current_level = 'low'
        adjusted = self.degradation._adjust_resolution('1080p', 0.4)
        self.assertIn(adjusted, ['720p', '480p', '360p', '240p'])


class TestErrorAnalytics(unittest.TestCase):
    """Test error analytics"""
    
    def setUp(self):
        self.analytics = ErrorAnalytics()
    
    def test_record_error(self):
        """Test error recording"""
        error_info = ErrorInfo(
            timestamp=datetime.now(),
            error_type="TestError",
            error_message="Test message",
            category=ErrorCategory.NETWORK,
            severity=ErrorSeverity.HIGH
        )
        
        self.analytics.record_error(error_info)
        self.assertEqual(len(self.analytics.error_history), 1)
    
    def test_get_error_rate(self):
        """Test error rate calculation"""
        # Add some errors
        for _ in range(5):
            error_info = ErrorInfo(
                timestamp=datetime.now(),
                error_type="TestError",
                error_message="Test",
                category=ErrorCategory.NETWORK,
                severity=ErrorSeverity.MEDIUM
            )
            self.analytics.record_error(error_info)
        
        rate = self.analytics.get_error_rate(timedelta(hours=1))
        self.assertGreater(rate, 0)
    
    def test_get_most_common_errors(self):
        """Test most common errors"""
        for i in range(3):
            error_info = ErrorInfo(
                timestamp=datetime.now(),
                error_type=f"Error{i % 2}",
                error_message="Test",
                category=ErrorCategory.NETWORK,
                severity=ErrorSeverity.LOW
            )
            self.analytics.record_error(error_info)
        
        common = self.analytics.get_most_common_errors()
        self.assertGreater(len(common), 0)
    
    def test_get_errors_by_category(self):
        """Test filtering by category"""
        error_info = ErrorInfo(
            timestamp=datetime.now(),
            error_type="NetworkError",
            error_message="Test",
            category=ErrorCategory.NETWORK,
            severity=ErrorSeverity.HIGH
        )
        self.analytics.record_error(error_info)
        
        errors = self.analytics.get_errors_by_category(ErrorCategory.NETWORK)
        self.assertEqual(len(errors), 1)
    
    def test_get_recovery_rate(self):
        """Test recovery rate calculation"""
        error1 = ErrorInfo(
            timestamp=datetime.now(),
            error_type="Test",
            error_message="Test",
            category=ErrorCategory.NETWORK,
            severity=ErrorSeverity.MEDIUM,
            recovery_attempted=True,
            recovery_successful=True
        )
        error2 = ErrorInfo(
            timestamp=datetime.now(),
            error_type="Test",
            error_message="Test",
            category=ErrorCategory.NETWORK,
            severity=ErrorSeverity.MEDIUM,
            recovery_attempted=True,
            recovery_successful=False
        )
        
        self.analytics.record_error(error1)
        self.analytics.record_error(error2)
        
        rate = self.analytics.get_recovery_rate()
        self.assertEqual(rate, 0.5)
    
    def test_generate_report(self):
        """Test report generation"""
        error_info = ErrorInfo(
            timestamp=datetime.now(),
            error_type="TestError",
            error_message="Test",
            category=ErrorCategory.NETWORK,
            severity=ErrorSeverity.HIGH
        )
        self.analytics.record_error(error_info)
        
        report = self.analytics.generate_report()
        self.assertIn('total_errors', report)
        self.assertIn('error_rate_per_minute', report)
        self.assertIn('most_common_errors', report)


class TestRecoveryProcedure(unittest.TestCase):
    """Test recovery procedures"""
    
    def setUp(self):
        self.recovery = RecoveryProcedure()
    
    async def test_attempt_recovery_success(self):
        """Test successful recovery"""
        error_info = ErrorInfo(
            timestamp=datetime.now(),
            error_type="NetworkError",
            error_message="Connection failed",
            category=ErrorCategory.NETWORK,
            severity=ErrorSeverity.HIGH
        )
        
        success = await self.recovery.attempt_recovery(error_info)
        self.assertTrue(success)
    
    async def test_attempt_recovery_no_strategies(self):
        """Test recovery with no strategies"""
        error_info = ErrorInfo(
            timestamp=datetime.now(),
            error_type="UnknownError",
            error_message="Unknown",
            category=ErrorCategory.UNKNOWN,
            severity=ErrorSeverity.LOW
        )
        
        success = await self.recovery.attempt_recovery(error_info)
        self.assertFalse(success)
    
    def test_get_recovery_history(self):
        """Test recovery history retrieval"""
        history = self.recovery.get_recovery_history()
        self.assertIsInstance(history, list)


class TestErrorHandlingSystem(unittest.TestCase):
    """Test complete error handling system"""
    
    def setUp(self):
        self.system = ErrorHandlingSystem()
    
    def test_get_circuit_breaker(self):
        """Test circuit breaker retrieval"""
        cb = self.system.get_circuit_breaker("test")
        self.assertIsInstance(cb, CircuitBreaker)
        
        # Should return same instance
        cb2 = self.system.get_circuit_breaker("test")
        self.assertIs(cb, cb2)
    
    def test_get_fallback_chain(self):
        """Test fallback chain retrieval"""
        chain = self.system.get_fallback_chain("test")
        self.assertIsInstance(chain, FallbackChain)
        
        # Should return same instance
        chain2 = self.system.get_fallback_chain("test")
        self.assertIs(chain, chain2)
    
    async def test_execute_with_resilience_success(self):
        """Test successful execution with resilience"""
        async def test_func():
            return "success"
        
        result = await self.system.execute_with_resilience(test_func)
        self.assertEqual(result, "success")
    
    async def test_execute_with_resilience_with_retry(self):
        """Test execution with retry"""
        call_count = 0
        
        async def flaky_func():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ConnectionError("Temporary")
            return "success"
        
        result = await self.system.execute_with_resilience(flaky_func, enable_retry=True)
        self.assertEqual(result, "success")
        self.assertGreater(call_count, 1)
    
    def test_categorize_error(self):
        """Test error categorization"""
        network_error = ConnectionError()
        category = self.system._categorize_error(network_error)
        self.assertEqual(category, ErrorCategory.NETWORK)
        
        memory_error = MemoryError()
        category = self.system._categorize_error(memory_error)
        self.assertEqual(category, ErrorCategory.MEMORY)
    
    def test_assess_severity(self):
        """Test severity assessment"""
        critical_error = MemoryError()
        severity = self.system._assess_severity(critical_error)
        self.assertEqual(severity, ErrorSeverity.CRITICAL)
        
        high_error = ConnectionError()
        severity = self.system._assess_severity(high_error)
        self.assertEqual(severity, ErrorSeverity.HIGH)
    
    def test_get_system_health(self):
        """Test system health retrieval"""
        health = self.system.get_system_health()
        self.assertIn('degradation_level', health)
        self.assertIn('error_rate', health)
        self.assertIn('recovery_rate', health)
    
    def test_generate_resilience_report(self):
        """Test resilience report generation"""
        report = self.system.generate_resilience_report()
        self.assertIn('system_health', report)
        self.assertIn('error_analytics', report)
        self.assertIn('recovery_history', report)
        self.assertIn('timestamp', report)


if __name__ == '__main__':
    unittest.main()
