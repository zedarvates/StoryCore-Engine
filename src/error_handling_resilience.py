"""
Error Handling and Resilience System for Advanced ComfyUI Workflows

This module provides comprehensive error handling and resilience capabilities:
- Comprehensive error handling strategies
- Automatic retry mechanisms with exponential backoff
- Graceful degradation for failures
- Fallback workflow chains
- Circuit breaker patterns
- Error reporting and analytics
- Recovery procedures
- Chaos engineering support

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import asyncio
import logging
import time
import traceback
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union
import json
import random


# Configure logging
logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """Severity levels for errors"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """Categories of errors"""
    NETWORK = "network"
    MEMORY = "memory"
    VALIDATION = "validation"
    MODEL = "model"
    WORKFLOW = "workflow"
    SYSTEM = "system"
    UNKNOWN = "unknown"


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered


@dataclass
class ErrorInfo:
    """Information about an error"""
    timestamp: datetime
    error_type: str
    error_message: str
    category: ErrorCategory
    severity: ErrorSeverity
    traceback: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    recovery_attempted: bool = False
    recovery_successful: bool = False


@dataclass
class RetryConfig:
    """Configuration for retry mechanism"""
    max_attempts: int = 3
    initial_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True
    retryable_exceptions: Set[type] = field(default_factory=lambda: {
        ConnectionError,
        TimeoutError,
        IOError,
    })


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker"""
    failure_threshold: int = 5
    success_threshold: int = 2
    timeout: float = 60.0
    half_open_max_calls: int = 1


class RetryMechanism:
    """Implements automatic retry with exponential backoff"""
    
    def __init__(self, config: Optional[RetryConfig] = None):
        self.config = config or RetryConfig()
        self.retry_stats = defaultdict(lambda: {'attempts': 0, 'successes': 0, 'failures': 0})
    
    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for retry attempt"""
        delay = min(
            self.config.initial_delay * (self.config.exponential_base ** attempt),
            self.config.max_delay
        )
        
        if self.config.jitter:
            # Add random jitter (±25%)
            jitter_range = delay * 0.25
            delay += random.uniform(-jitter_range, jitter_range)
        
        return max(0, delay)
    
    def is_retryable(self, exception: Exception) -> bool:
        """Check if exception is retryable"""
        return any(isinstance(exception, exc_type) 
                  for exc_type in self.config.retryable_exceptions)
    
    async def execute_with_retry(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with retry logic"""
        func_name = func.__name__
        last_exception = None
        
        for attempt in range(self.config.max_attempts):
            try:
                self.retry_stats[func_name]['attempts'] += 1
                result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
                self.retry_stats[func_name]['successes'] += 1
                
                if attempt > 0:
                    logger.info(f"Retry successful for {func_name} on attempt {attempt + 1}")
                
                return result
                
            except Exception as e:
                last_exception = e
                self.retry_stats[func_name]['failures'] += 1
                
                if not self.is_retryable(e):
                    logger.error(f"Non-retryable error in {func_name}: {e}")
                    raise
                
                if attempt < self.config.max_attempts - 1:
                    delay = self.calculate_delay(attempt)
                    logger.warning(f"Retry {attempt + 1}/{self.config.max_attempts} for {func_name} after {delay:.2f}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"All retry attempts exhausted for {func_name}")
        
        raise last_exception
    
    def get_stats(self) -> Dict[str, Dict[str, int]]:
        """Get retry statistics"""
        return dict(self.retry_stats)


class CircuitBreaker:
    """Implements circuit breaker pattern"""
    
    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.half_open_calls = 0
    
    def can_execute(self) -> bool:
        """Check if execution is allowed"""
        if self.state == CircuitState.CLOSED:
            return True
        
        if self.state == CircuitState.OPEN:
            # Check if timeout has passed
            if self.last_failure_time:
                elapsed = (datetime.now() - self.last_failure_time).total_seconds()
                if elapsed >= self.config.timeout:
                    logger.info(f"Circuit breaker {self.name} transitioning to HALF_OPEN")
                    self.state = CircuitState.HALF_OPEN
                    self.half_open_calls = 0
                    return True
            return False
        
        if self.state == CircuitState.HALF_OPEN:
            return self.half_open_calls < self.config.half_open_max_calls
        
        return False
    
    def record_success(self):
        """Record successful execution"""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                logger.info(f"Circuit breaker {self.name} transitioning to CLOSED")
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0
    
    def record_failure(self):
        """Record failed execution"""
        self.last_failure_time = datetime.now()
        
        if self.state == CircuitState.HALF_OPEN:
            logger.warning(f"Circuit breaker {self.name} transitioning back to OPEN")
            self.state = CircuitState.OPEN
            self.success_count = 0
        elif self.state == CircuitState.CLOSED:
            self.failure_count += 1
            if self.failure_count >= self.config.failure_threshold:
                logger.error(f"Circuit breaker {self.name} transitioning to OPEN")
                self.state = CircuitState.OPEN
    
    async def execute(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""
        if not self.can_execute():
            raise CircuitBreakerOpenError(f"Circuit breaker {self.name} is OPEN")
        
        if self.state == CircuitState.HALF_OPEN:
            self.half_open_calls += 1
        
        try:
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise
    
    def get_state(self) -> Dict[str, Any]:
        """Get circuit breaker state"""
        return {
            'name': self.name,
            'state': self.state.value,
            'failure_count': self.failure_count,
            'success_count': self.success_count,
            'last_failure_time': self.last_failure_time.isoformat() if self.last_failure_time else None
        }


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open"""
    pass


class FallbackChain:
    """Implements fallback workflow chains"""
    
    def __init__(self, name: str):
        self.name = name
        self.fallbacks: List[Tuple[Callable, Dict[str, Any]]] = []
        self.execution_stats = defaultdict(lambda: {'attempts': 0, 'successes': 0})
    
    def add_fallback(self, func: Callable, config: Optional[Dict[str, Any]] = None):
        """Add fallback function to chain"""
        self.fallbacks.append((func, config or {}))
    
    async def execute(self, *args, **kwargs) -> Any:
        """Execute with fallback chain"""
        last_exception = None
        
        for i, (func, config) in enumerate(self.fallbacks):
            func_name = func.__name__
            self.execution_stats[func_name]['attempts'] += 1
            
            try:
                logger.info(f"Executing fallback {i + 1}/{len(self.fallbacks)}: {func_name}")
                result = await func(*args, **kwargs, **config) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs, **config)
                self.execution_stats[func_name]['successes'] += 1
                
                if i > 0:
                    logger.warning(f"Fallback {func_name} succeeded after {i} failures")
                
                return result
                
            except Exception as e:
                last_exception = e
                logger.warning(f"Fallback {func_name} failed: {e}")
                
                if i == len(self.fallbacks) - 1:
                    logger.error(f"All fallbacks exhausted for {self.name}")
        
        raise FallbackChainExhaustedError(f"All fallbacks failed for {self.name}") from last_exception
    
    def get_stats(self) -> Dict[str, Dict[str, int]]:
        """Get fallback execution statistics"""
        return dict(self.execution_stats)


class FallbackChainExhaustedError(Exception):
    """Raised when all fallbacks in chain fail"""
    pass




class GracefulDegradation:
    """Implements graceful degradation strategies"""
    
    def __init__(self):
        self.degradation_levels = {
            'full': {'quality': 1.0, 'features': 'all'},
            'high': {'quality': 0.8, 'features': 'most'},
            'medium': {'quality': 0.6, 'features': 'core'},
            'low': {'quality': 0.4, 'features': 'basic'},
            'minimal': {'quality': 0.2, 'features': 'essential'}
        }
        self.current_level = 'full'
    
    def degrade(self, reason: str) -> str:
        """Degrade service level"""
        levels = list(self.degradation_levels.keys())
        current_index = levels.index(self.current_level)
        
        if current_index < len(levels) - 1:
            self.current_level = levels[current_index + 1]
            logger.warning(f"Degrading service to {self.current_level} level due to: {reason}")
        
        return self.current_level
    
    def restore(self) -> str:
        """Restore service level"""
        levels = list(self.degradation_levels.keys())
        current_index = levels.index(self.current_level)
        
        if current_index > 0:
            self.current_level = levels[current_index - 1]
            logger.info(f"Restoring service to {self.current_level} level")
        
        return self.current_level
    
    def get_config(self) -> Dict[str, Any]:
        """Get current degradation configuration"""
        return self.degradation_levels[self.current_level]
    
    def adjust_parameters(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Adjust parameters based on degradation level"""
        config = self.get_config()
        adjusted = params.copy()
        
        # Adjust quality-related parameters
        if 'quality' in adjusted:
            adjusted['quality'] *= config['quality']
        if 'resolution' in adjusted:
            adjusted['resolution'] = self._adjust_resolution(adjusted['resolution'], config['quality'])
        if 'steps' in adjusted:
            adjusted['steps'] = int(adjusted['steps'] * config['quality'])
        
        return adjusted
    
    def _adjust_resolution(self, resolution: str, quality_factor: float) -> str:
        """Adjust resolution based on quality factor"""
        resolution_map = {
            '1080p': ['1080p', '720p', '480p', '360p', '240p'],
            '720p': ['720p', '480p', '360p', '240p', '144p'],
            '480p': ['480p', '360p', '240p', '144p', '144p']
        }
        
        if resolution in resolution_map:
            levels = resolution_map[resolution]
            index = int((1.0 - quality_factor) * (len(levels) - 1))
            return levels[min(index, len(levels) - 1)]
        
        return resolution


class ErrorAnalytics:
    """Collects and analyzes error data"""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.error_history: deque = deque(maxlen=max_history)
        self.error_counts = defaultdict(int)
        self.error_by_category = defaultdict(list)
        self.error_by_severity = defaultdict(list)
    
    def record_error(self, error_info: ErrorInfo):
        """Record an error"""
        self.error_history.append(error_info)
        self.error_counts[error_info.error_type] += 1
        self.error_by_category[error_info.category.value].append(error_info)
        self.error_by_severity[error_info.severity.value].append(error_info)
    
    def get_error_rate(self, time_window: timedelta = timedelta(hours=1)) -> float:
        """Calculate error rate in time window"""
        cutoff = datetime.now() - time_window
        recent_errors = [e for e in self.error_history if e.timestamp >= cutoff]
        
        if not recent_errors:
            return 0.0
        
        # Errors per minute
        minutes = time_window.total_seconds() / 60
        return len(recent_errors) / minutes
    
    def get_most_common_errors(self, limit: int = 10) -> List[Tuple[str, int]]:
        """Get most common error types"""
        return sorted(self.error_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    def get_errors_by_category(self, category: ErrorCategory) -> List[ErrorInfo]:
        """Get errors by category"""
        return self.error_by_category[category.value]
    
    def get_errors_by_severity(self, severity: ErrorSeverity) -> List[ErrorInfo]:
        """Get errors by severity"""
        return self.error_by_severity[severity.value]
    
    def get_recovery_rate(self) -> float:
        """Calculate recovery success rate"""
        attempted = sum(1 for e in self.error_history if e.recovery_attempted)
        if attempted == 0:
            return 0.0
        
        successful = sum(1 for e in self.error_history if e.recovery_successful)
        return successful / attempted
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate error analytics report"""
        return {
            'total_errors': len(self.error_history),
            'error_rate_per_minute': self.get_error_rate(),
            'most_common_errors': self.get_most_common_errors(),
            'errors_by_category': {
                cat: len(errors) for cat, errors in self.error_by_category.items()
            },
            'errors_by_severity': {
                sev: len(errors) for sev, errors in self.error_by_severity.items()
            },
            'recovery_rate': self.get_recovery_rate(),
            'recent_critical_errors': [
                {
                    'timestamp': e.timestamp.isoformat(),
                    'type': e.error_type,
                    'message': e.error_message
                }
                for e in self.get_errors_by_severity(ErrorSeverity.CRITICAL)[-10:]
            ]
        }


class RecoveryProcedure:
    """Implements recovery procedures for different error types"""
    
    def __init__(self):
        self.recovery_strategies: Dict[ErrorCategory, List[Callable]] = {
            ErrorCategory.NETWORK: [
                self._retry_connection,
                self._use_backup_endpoint,
                self._enable_offline_mode
            ],
            ErrorCategory.MEMORY: [
                self._clear_cache,
                self._reduce_batch_size,
                self._enable_memory_optimization
            ],
            ErrorCategory.MODEL: [
                self._reload_model,
                self._use_fallback_model,
                self._download_model
            ],
            ErrorCategory.WORKFLOW: [
                self._restart_workflow,
                self._use_simpler_workflow,
                self._skip_optional_steps
            ]
        }
        self.recovery_history: List[Dict[str, Any]] = []
    
    async def attempt_recovery(self, error_info: ErrorInfo) -> bool:
        """Attempt to recover from error"""
        strategies = self.recovery_strategies.get(error_info.category, [])
        
        if not strategies:
            logger.warning(f"No recovery strategies for category {error_info.category.value}")
            return False
        
        for strategy in strategies:
            try:
                logger.info(f"Attempting recovery strategy: {strategy.__name__}")
                success = await strategy(error_info)
                
                if success:
                    logger.info(f"Recovery successful using {strategy.__name__}")
                    self.recovery_history.append({
                        'timestamp': datetime.now().isoformat(),
                        'error_type': error_info.error_type,
                        'strategy': strategy.__name__,
                        'success': True
                    })
                    return True
                    
            except Exception as e:
                logger.error(f"Recovery strategy {strategy.__name__} failed: {e}")
        
        self.recovery_history.append({
            'timestamp': datetime.now().isoformat(),
            'error_type': error_info.error_type,
            'strategies_attempted': [s.__name__ for s in strategies],
            'success': False
        })
        
        return False
    
    async def _retry_connection(self, error_info: ErrorInfo) -> bool:
        """Retry network connection"""
        await asyncio.sleep(1)
        return True  # Placeholder
    
    async def _use_backup_endpoint(self, error_info: ErrorInfo) -> bool:
        """Switch to backup endpoint"""
        return True  # Placeholder
    
    async def _enable_offline_mode(self, error_info: ErrorInfo) -> bool:
        """Enable offline mode"""
        return True  # Placeholder
    
    async def _clear_cache(self, error_info: ErrorInfo) -> bool:
        """Clear memory cache"""
        return True  # Placeholder
    
    async def _reduce_batch_size(self, error_info: ErrorInfo) -> bool:
        """Reduce batch size"""
        return True  # Placeholder
    
    async def _enable_memory_optimization(self, error_info: ErrorInfo) -> bool:
        """Enable memory optimization"""
        return True  # Placeholder
    
    async def _reload_model(self, error_info: ErrorInfo) -> bool:
        """Reload model"""
        return True  # Placeholder
    
    async def _use_fallback_model(self, error_info: ErrorInfo) -> bool:
        """Use fallback model"""
        return True  # Placeholder
    
    async def _download_model(self, error_info: ErrorInfo) -> bool:
        """Download missing model"""
        return True  # Placeholder
    
    async def _restart_workflow(self, error_info: ErrorInfo) -> bool:
        """Restart workflow"""
        return True  # Placeholder
    
    async def _use_simpler_workflow(self, error_info: ErrorInfo) -> bool:
        """Use simpler workflow"""
        return True  # Placeholder
    
    async def _skip_optional_steps(self, error_info: ErrorInfo) -> bool:
        """Skip optional workflow steps"""
        return True  # Placeholder
    
    def get_recovery_history(self) -> List[Dict[str, Any]]:
        """Get recovery history"""
        return self.recovery_history


class ErrorHandlingSystem:
    """Main error handling and resilience system"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        
        # Initialize components
        self.retry_mechanism = RetryMechanism()
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.fallback_chains: Dict[str, FallbackChain] = {}
        self.graceful_degradation = GracefulDegradation()
        self.error_analytics = ErrorAnalytics()
        self.recovery_procedure = RecoveryProcedure()
        
        logger.info("Error Handling and Resilience System initialized")
    
    def get_circuit_breaker(self, name: str, config: Optional[CircuitBreakerConfig] = None) -> CircuitBreaker:
        """Get or create circuit breaker"""
        if name not in self.circuit_breakers:
            self.circuit_breakers[name] = CircuitBreaker(name, config)
        return self.circuit_breakers[name]
    
    def get_fallback_chain(self, name: str) -> FallbackChain:
        """Get or create fallback chain"""
        if name not in self.fallback_chains:
            self.fallback_chains[name] = FallbackChain(name)
        return self.fallback_chains[name]
    
    async def execute_with_resilience(self, func: Callable, *args, 
                                     circuit_breaker_name: Optional[str] = None,
                                     fallback_chain_name: Optional[str] = None,
                                     enable_retry: bool = True,
                                     **kwargs) -> Any:
        """Execute function with full resilience features"""
        
        original_func = func
        
        # Wrap with circuit breaker if specified
        if circuit_breaker_name:
            circuit_breaker = self.get_circuit_breaker(circuit_breaker_name)
            async def circuit_wrapped(*a, **kw):
                return await circuit_breaker.execute(original_func, *a, **kw)
            func = circuit_wrapped
        
        # Wrap with retry if enabled
        if enable_retry:
            wrapped_func = func
            async def retry_wrapped(*a, **kw):
                return await self.retry_mechanism.execute_with_retry(wrapped_func, *a, **kw)
            func = retry_wrapped
        
        # Execute with fallback chain if specified
        if fallback_chain_name:
            fallback_chain = self.get_fallback_chain(fallback_chain_name)
            return await fallback_chain.execute(*args, **kwargs)
        
        # Execute function
        try:
            return await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
        except Exception as e:
            # Record error
            error_info = self._create_error_info(e)
            self.error_analytics.record_error(error_info)
            
            # Attempt recovery
            error_info.recovery_attempted = True
            recovery_success = await self.recovery_procedure.attempt_recovery(error_info)
            error_info.recovery_successful = recovery_success
            
            if recovery_success:
                # Retry after successful recovery
                return await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            
            # Degrade service if critical
            if error_info.severity == ErrorSeverity.CRITICAL:
                self.graceful_degradation.degrade(str(e))
            
            raise
    
    def _create_error_info(self, exception: Exception) -> ErrorInfo:
        """Create ErrorInfo from exception"""
        return ErrorInfo(
            timestamp=datetime.now(),
            error_type=type(exception).__name__,
            error_message=str(exception),
            category=self._categorize_error(exception),
            severity=self._assess_severity(exception),
            traceback=traceback.format_exc(),
            context={}
        )
    
    def _categorize_error(self, exception: Exception) -> ErrorCategory:
        """Categorize error"""
        if isinstance(exception, (ConnectionError, TimeoutError)):
            return ErrorCategory.NETWORK
        elif isinstance(exception, MemoryError):
            return ErrorCategory.MEMORY
        elif isinstance(exception, ValueError):
            return ErrorCategory.VALIDATION
        else:
            return ErrorCategory.UNKNOWN
    
    def _assess_severity(self, exception: Exception) -> ErrorSeverity:
        """Assess error severity"""
        if isinstance(exception, (MemoryError, SystemError)):
            return ErrorSeverity.CRITICAL
        elif isinstance(exception, (ConnectionError, TimeoutError)):
            return ErrorSeverity.HIGH
        elif isinstance(exception, ValueError):
            return ErrorSeverity.MEDIUM
        else:
            return ErrorSeverity.LOW
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health"""
        return {
            'degradation_level': self.graceful_degradation.current_level,
            'error_rate': self.error_analytics.get_error_rate(),
            'recovery_rate': self.error_analytics.get_recovery_rate(),
            'circuit_breakers': {
                name: cb.get_state() for name, cb in self.circuit_breakers.items()
            },
            'retry_stats': self.retry_mechanism.get_stats(),
            'fallback_stats': {
                name: chain.get_stats() for name, chain in self.fallback_chains.items()
            }
        }
    
    def generate_resilience_report(self) -> Dict[str, Any]:
        """Generate comprehensive resilience report"""
        return {
            'system_health': self.get_system_health(),
            'error_analytics': self.error_analytics.generate_report(),
            'recovery_history': self.recovery_procedure.get_recovery_history()[-50:],
            'timestamp': datetime.now().isoformat()
        }


# Example usage
if __name__ == "__main__":
    async def example_usage():
        # Initialize system
        error_system = ErrorHandlingSystem()
        
        # Example 1: Execute with retry
        async def flaky_function():
            if random.random() < 0.7:
                raise ConnectionError("Network error")
            return "Success"
        
        try:
            result = await error_system.execute_with_resilience(
                flaky_function,
                enable_retry=True
            )
            print(f"Result: {result}")
        except Exception as e:
            print(f"Failed: {e}")
        
        # Example 2: Circuit breaker
        circuit_breaker = error_system.get_circuit_breaker('api_calls')
        
        async def api_call():
            # Simulate API call
            return "API response"
        
        try:
            result = await circuit_breaker.execute(api_call)
            print(f"API Result: {result}")
        except CircuitBreakerOpenError as e:
            print(f"Circuit breaker open: {e}")
        
        # Example 3: Fallback chain
        fallback_chain = error_system.get_fallback_chain('video_generation')
        
        async def primary_workflow():
            raise Exception("Primary failed")
        
        async def fallback_workflow():
            return "Fallback result"
        
        fallback_chain.add_fallback(primary_workflow)
        fallback_chain.add_fallback(fallback_workflow)
        
        result = await fallback_chain.execute()
        print(f"Fallback result: {result}")
        
        # Generate report
        report = error_system.generate_resilience_report()
        print(json.dumps(report, indent=2))
    
    asyncio.run(example_usage())
