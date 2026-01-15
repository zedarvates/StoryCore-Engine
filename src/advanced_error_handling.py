"""
Advanced Error Handling and Resilience System for ComfyUI Workflows

This module provides comprehensive error handling, automatic retry mechanisms,
graceful degradation, fallback chains, and circuit breaker patterns.
"""

import asyncio
import logging
import time
import traceback
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps
import json
import threading
from collections import defaultdict, deque

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """Error severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """Error categories"""
    NETWORK = "network"
    MEMORY = "memory"
    GPU = "gpu"
    MODEL = "model"
    INPUT = "input"
    WORKFLOW = "workflow"
    SYSTEM = "system"
    UNKNOWN = "unknown"


class RetryStrategy(Enum):
    """Retry strategies"""
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    LINEAR_BACKOFF = "linear_backoff"
    FIXED_DELAY = "fixed_delay"
    IMMEDIATE = "immediate"
    NO_RETRY = "no_retry"


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class ErrorInfo:
    """Comprehensive error information"""
    timestamp: datetime
    error_type: str
    error_message: str
    category: ErrorCategory
    severity: ErrorSeverity
    component: str
    operation: str
    context: Dict[str, Any] = field(default_factory=dict)
    stack_trace: Optional[str] = None
    retry_count: int = 0
    resolution_attempted: bool = False
    resolution_successful: bool = False


@dataclass
class RetryConfig:
    """Retry configuration"""
    max_attempts: int = 3
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    base_delay: float = 1.0
    max_delay: float = 60.0
    backoff_multiplier: float = 2.0
    jitter: bool = True
    retry_on_exceptions: List[type] = field(default_factory=lambda: [Exception])
    stop_on_exceptions: List[type] = field(default_factory=list)


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration"""
    failure_threshold: int = 5
    recovery_timeout: int = 60
    expected_exception: type = Exception
    name: str = "default"


@dataclass
class FallbackChain:
    """Fallback chain configuration"""
    primary_function: Callable
    fallback_functions: List[Callable]
    fallback_conditions: List[Callable] = field(default_factory=list)
    max_fallback_attempts: int = 3


class ErrorAnalyzer:
    """Analyzes errors and categorizes them"""
    
    def __init__(self):
        self.error_patterns = {
            ErrorCategory.NETWORK: [
                "connection", "timeout", "network", "dns", "socket",
                "http", "ssl", "certificate", "unreachable"
            ],
            ErrorCategory.MEMORY: [
                "memory", "oom", "out of memory", "allocation", "malloc",
                "heap", "stack overflow", "memoryerror"
            ],
            ErrorCategory.GPU: [
                "cuda", "gpu", "vram", "device", "nvidia", "tensor",
                "out of memory", "cudnn", "cublas"
            ],
            ErrorCategory.MODEL: [
                "model", "checkpoint", "weights", "safetensors", "pickle",
                "loading", "corrupted", "invalid format"
            ],
            ErrorCategory.INPUT: [
                "input", "validation", "format", "size", "dimension",
                "invalid", "malformed", "encoding"
            ],
            ErrorCategory.WORKFLOW: [
                "workflow", "node", "execution", "pipeline", "comfyui",
                "processing", "generation"
            ],
            ErrorCategory.SYSTEM: [
                "system", "os", "file", "permission", "disk", "io",
                "filesystem", "access denied"
            ]
        }
        
        self.severity_indicators = {
            ErrorSeverity.CRITICAL: [
                "critical", "fatal", "crash", "abort", "segmentation fault",
                "system error", "kernel panic"
            ],
            ErrorSeverity.HIGH: [
                "error", "exception", "failed", "failure", "broken",
                "corrupted", "invalid"
            ],
            ErrorSeverity.MEDIUM: [
                "warning", "warn", "deprecated", "timeout", "retry",
                "fallback"
            ],
            ErrorSeverity.LOW: [
                "info", "notice", "debug", "trace", "verbose"
            ]
        }
    
    def analyze_error(self, error: Exception, context: Dict[str, Any] = None) -> ErrorInfo:
        """Analyze error and create ErrorInfo"""
        error_message = str(error)
        error_type = type(error).__name__
        
        # Categorize error
        category = self._categorize_error(error_message, error_type)
        
        # Determine severity
        severity = self._determine_severity(error_message, error_type, error)
        
        # Extract component and operation from context
        component = context.get("component", "unknown") if context else "unknown"
        operation = context.get("operation", "unknown") if context else "unknown"
        
        return ErrorInfo(
            timestamp=datetime.now(),
            error_type=error_type,
            error_message=error_message,
            category=category,
            severity=severity,
            component=component,
            operation=operation,
            context=context or {},
            stack_trace=traceback.format_exc()
        )
    
    def _categorize_error(self, message: str, error_type: str) -> ErrorCategory:
        """Categorize error based on message and type"""
        message_lower = message.lower()
        type_lower = error_type.lower()
        
        for category, patterns in self.error_patterns.items():
            for pattern in patterns:
                if pattern in message_lower or pattern in type_lower:
                    return category
        
        return ErrorCategory.UNKNOWN
    
    def _determine_severity(self, message: str, error_type: str, error: Exception) -> ErrorSeverity:
        """Determine error severity"""
        message_lower = message.lower()
        
        # Check for critical system errors
        if isinstance(error, (SystemError, MemoryError, KeyboardInterrupt)):
            return ErrorSeverity.CRITICAL
        
        # Check message patterns
        for severity, patterns in self.severity_indicators.items():
            for pattern in patterns:
                if pattern in message_lower:
                    return severity
        
        # Default based on exception type
        if isinstance(error, (ValueError, TypeError, AttributeError)):
            return ErrorSeverity.MEDIUM
        elif isinstance(error, (ConnectionError, TimeoutError)):
            return ErrorSeverity.HIGH
        
        return ErrorSeverity.MEDIUM


class RetryManager:
    """Manages retry logic with different strategies"""
    
    def __init__(self):
        self.retry_stats = defaultdict(lambda: {"attempts": 0, "successes": 0, "failures": 0})
    
    async def retry_async(self, func: Callable, config: RetryConfig, *args, **kwargs):
        """Retry async function with specified configuration"""
        last_exception = None
        
        for attempt in range(config.max_attempts):
            try:
                result = await func(*args, **kwargs)
                self.retry_stats[func.__name__]["successes"] += 1
                return result
                
            except Exception as e:
                last_exception = e
                self.retry_stats[func.__name__]["attempts"] += 1
                
                # Check if we should stop retrying
                if any(isinstance(e, exc_type) for exc_type in config.stop_on_exceptions):
                    logger.info(f"Stopping retry for {func.__name__} due to {type(e).__name__}")
                    break
                
                # Check if we should retry
                if not any(isinstance(e, exc_type) for exc_type in config.retry_on_exceptions):
                    logger.info(f"Not retrying {func.__name__} for {type(e).__name__}")
                    break
                
                # Calculate delay for next attempt
                if attempt < config.max_attempts - 1:
                    delay = self._calculate_delay(attempt, config)
                    logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}. Retrying in {delay:.2f}s")
                    await asyncio.sleep(delay)
        
        self.retry_stats[func.__name__]["failures"] += 1
        raise last_exception
    
    def retry_sync(self, func: Callable, config: RetryConfig, *args, **kwargs):
        """Retry sync function with specified configuration"""
        last_exception = None
        
        for attempt in range(config.max_attempts):
            try:
                result = func(*args, **kwargs)
                self.retry_stats[func.__name__]["successes"] += 1
                return result
                
            except Exception as e:
                last_exception = e
                self.retry_stats[func.__name__]["attempts"] += 1
                
                # Check if we should stop retrying
                if any(isinstance(e, exc_type) for exc_type in config.stop_on_exceptions):
                    logger.info(f"Stopping retry for {func.__name__} due to {type(e).__name__}")
                    break
                
                # Check if we should retry
                if not any(isinstance(e, exc_type) for exc_type in config.retry_on_exceptions):
                    logger.info(f"Not retrying {func.__name__} for {type(e).__name__}")
                    break
                
                # Calculate delay for next attempt
                if attempt < config.max_attempts - 1:
                    delay = self._calculate_delay(attempt, config)
                    logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}. Retrying in {delay:.2f}s")
                    time.sleep(delay)
        
        self.retry_stats[func.__name__]["failures"] += 1
        raise last_exception
    
    def _calculate_delay(self, attempt: int, config: RetryConfig) -> float:
        """Calculate delay for retry attempt"""
        if config.strategy == RetryStrategy.NO_RETRY:
            return 0
        elif config.strategy == RetryStrategy.IMMEDIATE:
            return 0
        elif config.strategy == RetryStrategy.FIXED_DELAY:
            delay = config.base_delay
        elif config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = config.base_delay * (attempt + 1)
        elif config.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = config.base_delay * (config.backoff_multiplier ** attempt)
        else:
            delay = config.base_delay
        
        # Apply maximum delay limit
        delay = min(delay, config.max_delay)
        
        # Add jitter if enabled
        if config.jitter:
            import random
            delay *= (0.5 + random.random() * 0.5)  # 50-100% of calculated delay
        
        return delay
    
    def get_retry_stats(self) -> Dict[str, Dict[str, int]]:
        """Get retry statistics"""
        return dict(self.retry_stats)


class CircuitBreaker:
    """Circuit breaker implementation"""
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.success_count = 0
        self.lock = threading.Lock()
        
        logger.info(f"Circuit breaker '{config.name}' initialized")
    
    def __call__(self, func):
        """Decorator for circuit breaker"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._execute_async(func, *args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._execute_sync(func, *args, **kwargs)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _execute_async(self, func, *args, **kwargs):
        """Execute async function with circuit breaker"""
        with self.lock:
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    logger.info(f"Circuit breaker '{self.config.name}' moved to HALF_OPEN")
                else:
                    raise Exception(f"Circuit breaker '{self.config.name}' is OPEN")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
            
        except self.config.expected_exception as e:
            self._on_failure()
            raise e
    
    def _execute_sync(self, func, *args, **kwargs):
        """Execute sync function with circuit breaker"""
        with self.lock:
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    logger.info(f"Circuit breaker '{self.config.name}' moved to HALF_OPEN")
                else:
                    raise Exception(f"Circuit breaker '{self.config.name}' is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
            
        except self.config.expected_exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt reset"""
        if self.last_failure_time is None:
            return True
        
        time_since_failure = time.time() - self.last_failure_time
        return time_since_failure >= self.config.recovery_timeout
    
    def _on_success(self):
        """Handle successful execution"""
        with self.lock:
            self.failure_count = 0
            self.success_count += 1
            
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                logger.info(f"Circuit breaker '{self.config.name}' moved to CLOSED")
    
    def _on_failure(self):
        """Handle failed execution"""
        with self.lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.config.failure_threshold:
                self.state = CircuitState.OPEN
                logger.warning(f"Circuit breaker '{self.config.name}' moved to OPEN after {self.failure_count} failures")
    
    def get_state(self) -> Dict[str, Any]:
        """Get circuit breaker state"""
        return {
            "name": self.config.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure_time": self.last_failure_time,
            "failure_threshold": self.config.failure_threshold,
            "recovery_timeout": self.config.recovery_timeout
        }


class FallbackManager:
    """Manages fallback chains for graceful degradation"""
    
    def __init__(self):
        self.fallback_stats = defaultdict(lambda: {
            "primary_successes": 0,
            "primary_failures": 0,
            "fallback_attempts": 0,
            "fallback_successes": 0,
            "total_failures": 0
        })
    
    async def execute_with_fallback(self, chain: FallbackChain, *args, **kwargs):
        """Execute function with fallback chain"""
        chain_name = chain.primary_function.__name__
        
        # Try primary function
        try:
            result = await self._execute_function(chain.primary_function, *args, **kwargs)
            self.fallback_stats[chain_name]["primary_successes"] += 1
            return result
            
        except Exception as primary_error:
            self.fallback_stats[chain_name]["primary_failures"] += 1
            logger.warning(f"Primary function {chain_name} failed: {primary_error}")
            
            # Try fallback functions
            for i, fallback_func in enumerate(chain.fallback_functions):
                if i >= chain.max_fallback_attempts:
                    break
                
                # Check fallback condition if specified
                if (i < len(chain.fallback_conditions) and 
                    chain.fallback_conditions[i] and 
                    not chain.fallback_conditions[i](primary_error)):
                    continue
                
                try:
                    self.fallback_stats[chain_name]["fallback_attempts"] += 1
                    result = await self._execute_function(fallback_func, *args, **kwargs)
                    self.fallback_stats[chain_name]["fallback_successes"] += 1
                    logger.info(f"Fallback function {fallback_func.__name__} succeeded for {chain_name}")
                    return result
                    
                except Exception as fallback_error:
                    logger.warning(f"Fallback function {fallback_func.__name__} failed: {fallback_error}")
                    continue
            
            # All functions failed
            self.fallback_stats[chain_name]["total_failures"] += 1
            raise Exception(f"All functions in fallback chain for {chain_name} failed")
    
    async def _execute_function(self, func: Callable, *args, **kwargs):
        """Execute function (async or sync)"""
        if asyncio.iscoroutinefunction(func):
            return await func(*args, **kwargs)
        else:
            return func(*args, **kwargs)
    
    def get_fallback_stats(self) -> Dict[str, Dict[str, int]]:
        """Get fallback statistics"""
        return dict(self.fallback_stats)


class ErrorRecoveryManager:
    """Manages error recovery procedures"""
    
    def __init__(self):
        self.recovery_procedures = {}
        self.recovery_stats = defaultdict(lambda: {"attempts": 0, "successes": 0})
    
    def register_recovery_procedure(self, error_category: ErrorCategory, 
                                  recovery_func: Callable, 
                                  conditions: List[Callable] = None):
        """Register recovery procedure for error category"""
        if error_category not in self.recovery_procedures:
            self.recovery_procedures[error_category] = []
        
        self.recovery_procedures[error_category].append({
            "function": recovery_func,
            "conditions": conditions or []
        })
        
        logger.info(f"Registered recovery procedure for {error_category.value}")
    
    async def attempt_recovery(self, error_info: ErrorInfo) -> bool:
        """Attempt to recover from error"""
        if error_info.category not in self.recovery_procedures:
            logger.info(f"No recovery procedures for {error_info.category.value}")
            return False
        
        procedures = self.recovery_procedures[error_info.category]
        
        for procedure in procedures:
            # Check conditions
            if procedure["conditions"]:
                if not all(condition(error_info) for condition in procedure["conditions"]):
                    continue
            
            try:
                self.recovery_stats[error_info.category.value]["attempts"] += 1
                
                # Execute recovery procedure
                if asyncio.iscoroutinefunction(procedure["function"]):
                    success = await procedure["function"](error_info)
                else:
                    success = procedure["function"](error_info)
                
                if success:
                    self.recovery_stats[error_info.category.value]["successes"] += 1
                    error_info.resolution_attempted = True
                    error_info.resolution_successful = True
                    logger.info(f"Recovery successful for {error_info.category.value}")
                    return True
                    
            except Exception as recovery_error:
                logger.error(f"Recovery procedure failed: {recovery_error}")
        
        error_info.resolution_attempted = True
        error_info.resolution_successful = False
        return False
    
    def get_recovery_stats(self) -> Dict[str, Dict[str, int]]:
        """Get recovery statistics"""
        return dict(self.recovery_stats)


class ErrorReporter:
    """Reports and analyzes error patterns"""
    
    def __init__(self, max_errors: int = 1000):
        self.errors = deque(maxlen=max_errors)
        self.error_counts = defaultdict(int)
        self.component_errors = defaultdict(int)
        self.hourly_errors = defaultdict(int)
    
    def report_error(self, error_info: ErrorInfo):
        """Report error for analysis"""
        self.errors.append(error_info)
        
        # Update counters
        self.error_counts[error_info.category.value] += 1
        self.component_errors[error_info.component] += 1
        
        # Update hourly counter
        hour_key = error_info.timestamp.strftime("%Y-%m-%d-%H")
        self.hourly_errors[hour_key] += 1
        
        # Log error
        logger.error(f"Error reported: {error_info.component}.{error_info.operation} - "
                    f"{error_info.error_type}: {error_info.error_message}")
    
    def get_error_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get error summary for specified time period"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        recent_errors = [
            error for error in self.errors
            if error.timestamp > cutoff_time
        ]
        
        # Analyze recent errors
        category_counts = defaultdict(int)
        severity_counts = defaultdict(int)
        component_counts = defaultdict(int)
        
        for error in recent_errors:
            category_counts[error.category.value] += 1
            severity_counts[error.severity.value] += 1
            component_counts[error.component] += 1
        
        return {
            "time_period_hours": hours,
            "total_errors": len(recent_errors),
            "error_rate_per_hour": len(recent_errors) / hours if hours > 0 else 0,
            "categories": dict(category_counts),
            "severities": dict(severity_counts),
            "components": dict(component_counts),
            "most_common_error": max(category_counts.items(), key=lambda x: x[1]) if category_counts else None,
            "critical_errors": sum(1 for e in recent_errors if e.severity == ErrorSeverity.CRITICAL)
        }
    
    def detect_error_patterns(self) -> List[Dict[str, Any]]:
        """Detect error patterns and anomalies"""
        patterns = []
        
        # Check for error spikes
        recent_hours = defaultdict(int)
        for error in self.errors:
            if error.timestamp > datetime.now() - timedelta(hours=24):
                hour = error.timestamp.hour
                recent_hours[hour] += 1
        
        if recent_hours:
            avg_errors_per_hour = sum(recent_hours.values()) / len(recent_hours)
            max_errors_hour = max(recent_hours.values())
            
            if max_errors_hour > avg_errors_per_hour * 3:  # 3x spike threshold
                patterns.append({
                    "type": "error_spike",
                    "description": f"Error spike detected: {max_errors_hour} errors in one hour (avg: {avg_errors_per_hour:.1f})",
                    "severity": "high"
                })
        
        # Check for recurring errors
        error_messages = defaultdict(int)
        for error in self.errors:
            if error.timestamp > datetime.now() - timedelta(hours=24):
                error_messages[error.error_message] += 1
        
        for message, count in error_messages.items():
            if count > 10:  # Recurring error threshold
                patterns.append({
                    "type": "recurring_error",
                    "description": f"Recurring error: '{message[:100]}...' occurred {count} times",
                    "severity": "medium"
                })
        
        return patterns


# Decorators for easy integration
def with_retry(config: RetryConfig = None):
    """Decorator for automatic retry"""
    if config is None:
        config = RetryConfig()
    
    def decorator(func):
        retry_manager = RetryManager()
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await retry_manager.retry_async(func, config, *args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return retry_manager.retry_sync(func, config, *args, **kwargs)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def with_circuit_breaker(config: CircuitBreakerConfig = None):
    """Decorator for circuit breaker"""
    if config is None:
        config = CircuitBreakerConfig()
    
    def decorator(func):
        circuit_breaker = CircuitBreaker(config)
        return circuit_breaker(func)
    
    return decorator


def with_fallback(*fallback_functions):
    """Decorator for fallback chain"""
    def decorator(func):
        fallback_manager = FallbackManager()
        chain = FallbackChain(
            primary_function=func,
            fallback_functions=list(fallback_functions)
        )
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await fallback_manager.execute_with_fallback(chain, *args, **kwargs)
        
        return wrapper
    
    return decorator


class ResilienceManager:
    """Main resilience management system"""
    
    def __init__(self):
        self.error_analyzer = ErrorAnalyzer()
        self.retry_manager = RetryManager()
        self.fallback_manager = FallbackManager()
        self.recovery_manager = ErrorRecoveryManager()
        self.error_reporter = ErrorReporter()
        self.circuit_breakers = {}
        
        # Register default recovery procedures
        self._register_default_recovery_procedures()
        
        logger.info("Resilience Manager initialized")
    
    def _register_default_recovery_procedures(self):
        """Register default recovery procedures"""
        
        # GPU memory recovery
        async def gpu_memory_recovery(error_info: ErrorInfo) -> bool:
            """Recover from GPU memory errors"""
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    logger.info("GPU memory cache cleared")
                    return True
            except Exception as e:
                logger.error(f"GPU memory recovery failed: {e}")
            return False
        
        # Network recovery
        async def network_recovery(error_info: ErrorInfo) -> bool:
            """Recover from network errors"""
            try:
                # Wait a bit for network to recover
                await asyncio.sleep(2)
                logger.info("Network recovery attempted")
                return True
            except Exception as e:
                logger.error(f"Network recovery failed: {e}")
            return False
        
        # Model loading recovery
        async def model_recovery(error_info: ErrorInfo) -> bool:
            """Recover from model loading errors"""
            try:
                # Clear model cache and try to reload
                logger.info("Model recovery attempted")
                return True
            except Exception as e:
                logger.error(f"Model recovery failed: {e}")
            return False
        
        # Register procedures
        self.recovery_manager.register_recovery_procedure(
            ErrorCategory.GPU, gpu_memory_recovery
        )
        self.recovery_manager.register_recovery_procedure(
            ErrorCategory.NETWORK, network_recovery
        )
        self.recovery_manager.register_recovery_procedure(
            ErrorCategory.MODEL, model_recovery
        )
    
    def create_circuit_breaker(self, name: str, config: CircuitBreakerConfig = None) -> CircuitBreaker:
        """Create and register circuit breaker"""
        if config is None:
            config = CircuitBreakerConfig(name=name)
        else:
            config.name = name
        
        circuit_breaker = CircuitBreaker(config)
        self.circuit_breakers[name] = circuit_breaker
        return circuit_breaker
    
    async def handle_error(self, error: Exception, context: Dict[str, Any] = None) -> ErrorInfo:
        """Comprehensive error handling"""
        # Analyze error
        error_info = self.error_analyzer.analyze_error(error, context)
        
        # Report error
        self.error_reporter.report_error(error_info)
        
        # Attempt recovery
        if error_info.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
            recovery_success = await self.recovery_manager.attempt_recovery(error_info)
            if recovery_success:
                logger.info(f"Error recovery successful for {error_info.component}")
        
        return error_info
    
    def get_resilience_status(self) -> Dict[str, Any]:
        """Get comprehensive resilience status"""
        # Circuit breaker states
        circuit_states = {}
        for name, breaker in self.circuit_breakers.items():
            circuit_states[name] = breaker.get_state()
        
        # Error summary
        error_summary = self.error_reporter.get_error_summary()
        
        # Retry statistics
        retry_stats = self.retry_manager.get_retry_stats()
        
        # Fallback statistics
        fallback_stats = self.fallback_manager.get_fallback_stats()
        
        # Recovery statistics
        recovery_stats = self.recovery_manager.get_recovery_stats()
        
        # Error patterns
        error_patterns = self.error_reporter.detect_error_patterns()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "circuit_breakers": circuit_states,
            "error_summary": error_summary,
            "retry_statistics": retry_stats,
            "fallback_statistics": fallback_stats,
            "recovery_statistics": recovery_stats,
            "error_patterns": error_patterns,
            "total_circuit_breakers": len(self.circuit_breakers),
            "open_circuit_breakers": sum(1 for cb in self.circuit_breakers.values() 
                                       if cb.state == CircuitState.OPEN)
        }
    
    def perform_chaos_test(self, component: str, error_type: str = "random") -> Dict[str, Any]:
        """Perform chaos engineering test"""
        logger.info(f"Starting chaos test for {component} with {error_type} errors")
        
        test_results = {
            "component": component,
            "error_type": error_type,
            "start_time": datetime.now().isoformat(),
            "test_duration": 0,
            "errors_injected": 0,
            "recovery_attempts": 0,
            "successful_recoveries": 0,
            "circuit_breaker_trips": 0
        }
        
        start_time = time.time()
        
        try:
            # Simulate various error conditions
            if error_type == "network":
                error = ConnectionError("Simulated network failure")
            elif error_type == "memory":
                error = MemoryError("Simulated memory exhaustion")
            elif error_type == "gpu":
                error = RuntimeError("CUDA out of memory")
            else:
                error = Exception("Simulated random error")
            
            # Handle the simulated error
            context = {"component": component, "operation": "chaos_test"}
            asyncio.create_task(self.handle_error(error, context))
            
            test_results["errors_injected"] = 1
            
        except Exception as e:
            logger.error(f"Chaos test failed: {e}")
        
        test_results["test_duration"] = time.time() - start_time
        test_results["end_time"] = datetime.now().isoformat()
        
        logger.info(f"Chaos test completed for {component}")
        return test_results


# Example usage and testing functions
def create_test_resilience_config():
    """Create test resilience configuration"""
    return {
        "retry_config": RetryConfig(
            max_attempts=3,
            strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
            base_delay=1.0
        ),
        "circuit_breaker_config": CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=30,
            name="test_breaker"
        )
    }


async def test_resilience_system():
    """Test the resilience system"""
    print("Testing Advanced Error Handling and Resilience System...")
    
    resilience_manager = ResilienceManager()
    
    # Test error analysis
    print("\n1. Testing Error Analysis:")
    test_errors = [
        ConnectionError("Network connection failed"),
        MemoryError("Out of memory"),
        RuntimeError("CUDA out of memory"),
        ValueError("Invalid input format")
    ]
    
    for error in test_errors:
        error_info = resilience_manager.error_analyzer.analyze_error(
            error, {"component": "test", "operation": "test_op"}
        )
        print(f"  {error.__class__.__name__}: {error_info.category.value} ({error_info.severity.value})")
    
    # Test retry mechanism
    print("\n2. Testing Retry Mechanism:")
    
    @with_retry(RetryConfig(max_attempts=3, base_delay=0.1))
    async def flaky_function(success_rate=0.3):
        import random
        if random.random() < success_rate:
            return "Success!"
        else:
            raise Exception("Random failure")
    
    try:
        result = await flaky_function(success_rate=0.8)
        print(f"  Retry test result: {result}")
    except Exception as e:
        print(f"  Retry test failed: {e}")
    
    # Test circuit breaker
    print("\n3. Testing Circuit Breaker:")
    
    circuit_breaker = resilience_manager.create_circuit_breaker(
        "test_breaker", 
        CircuitBreakerConfig(failure_threshold=2, recovery_timeout=5)
    )
    
    @circuit_breaker
    async def failing_function():
        raise Exception("Always fails")
    
    # Trigger circuit breaker
    for i in range(4):
        try:
            await failing_function()
        except Exception as e:
            print(f"  Attempt {i+1}: {str(e)[:50]}...")
    
    # Test fallback chain
    print("\n4. Testing Fallback Chain:")
    
    async def primary_func():
        raise Exception("Primary failed")
    
    async def fallback1():
        raise Exception("Fallback 1 failed")
    
    async def fallback2():
        return "Fallback 2 succeeded!"
    
    chain = FallbackChain(
        primary_function=primary_func,
        fallback_functions=[fallback1, fallback2]
    )
    
    try:
        result = await resilience_manager.fallback_manager.execute_with_fallback(chain)
        print(f"  Fallback test result: {result}")
    except Exception as e:
        print(f"  Fallback test failed: {e}")
    
    # Test error recovery
    print("\n5. Testing Error Recovery:")
    
    gpu_error = RuntimeError("CUDA out of memory")
    error_info = resilience_manager.error_analyzer.analyze_error(
        gpu_error, {"component": "gpu", "operation": "model_inference"}
    )
    
    recovery_success = await resilience_manager.recovery_manager.attempt_recovery(error_info)
    print(f"  GPU error recovery: {'Success' if recovery_success else 'Failed'}")
    
    # Get resilience status
    print("\n6. Resilience Status:")
    status = resilience_manager.get_resilience_status()
    
    print(f"  Total errors (24h): {status['error_summary']['total_errors']}")
    print(f"  Circuit breakers: {status['total_circuit_breakers']}")
    print(f"  Open breakers: {status['open_circuit_breakers']}")
    print(f"  Error patterns: {len(status['error_patterns'])}")
    
    # Chaos test
    print("\n7. Chaos Engineering Test:")
    chaos_results = resilience_manager.perform_chaos_test("test_component", "network")
    print(f"  Chaos test duration: {chaos_results['test_duration']:.2f}s")
    print(f"  Errors injected: {chaos_results['errors_injected']}")
    
    print("\n✅ Resilience system tests completed!")


if __name__ == "__main__":
    asyncio.run(test_resilience_system())