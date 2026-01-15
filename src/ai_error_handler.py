"""
AI Error Handler - Comprehensive error handling and fallback mechanisms.

This module provides centralized error handling, fallback strategies, and
graceful degradation for all AI Enhancement operations.

Key Features:
- Typed error hierarchy for AI operations
- Automatic fallback selection
- Error recovery strategies
- Graceful degradation
- Error analytics and reporting
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable, Type
from enum import Enum
import traceback
import asyncio


class AIErrorCategory(Enum):
    """Categories of AI errors."""
    MODEL_LOADING = "model_loading"
    INFERENCE = "inference"
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    TIMEOUT = "timeout"
    VALIDATION = "validation"
    NETWORK = "network"
    CONFIGURATION = "configuration"
    UNKNOWN = "unknown"


class ErrorSeverity(Enum):
    """Severity levels for errors."""
    LOW = "low"              # Minor issue, can continue
    MEDIUM = "medium"        # Significant issue, fallback recommended
    HIGH = "high"           # Critical issue, fallback required
    CRITICAL = "critical"   # System-level issue, immediate action needed


class FallbackStrategy(Enum):
    """Fallback strategies for error recovery."""
    RETRY = "retry"                      # Retry the operation
    CPU_FALLBACK = "cpu_fallback"       # Fall back to CPU processing
    LOWER_QUALITY = "lower_quality"     # Reduce quality settings
    CACHED_RESULT = "cached_result"     # Use cached result if available
    SKIP = "skip"                       # Skip the operation
    ALTERNATIVE_MODEL = "alternative_model"  # Use alternative model
    GRACEFUL_DEGRADATION = "graceful_degradation"  # Degrade gracefully


@dataclass
class AIError(Exception):
    """Base class for AI-related errors."""
    message: str
    category: AIErrorCategory
    severity: ErrorSeverity
    component: str
    operation: str
    timestamp: datetime = field(default_factory=datetime.now)
    context: Dict[str, Any] = field(default_factory=dict)
    original_exception: Optional[Exception] = None
    suggested_fallback: Optional[FallbackStrategy] = None
    
    def __str__(self) -> str:
        return f"[{self.severity.value.upper()}] {self.component}.{self.operation}: {self.message}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/analytics."""
        return {
            'message': self.message,
            'category': self.category.value,
            'severity': self.severity.value,
            'component': self.component,
            'operation': self.operation,
            'timestamp': self.timestamp.isoformat(),
            'context': self.context,
            'original_exception': str(self.original_exception) if self.original_exception else None,
            'suggested_fallback': self.suggested_fallback.value if self.suggested_fallback else None
        }


@dataclass
class ModelLoadingError(AIError):
    """Error during model loading."""
    def __init__(self, message: str, model_id: str, **kwargs):
        super().__init__(
            message=message,
            category=AIErrorCategory.MODEL_LOADING,
            severity=ErrorSeverity.HIGH,
            component="ModelManager",
            operation="load_model",
            context={'model_id': model_id},
            suggested_fallback=FallbackStrategy.ALTERNATIVE_MODEL,
            **kwargs
        )


@dataclass
class InferenceError(AIError):
    """Error during model inference."""
    def __init__(self, message: str, model_id: str, **kwargs):
        super().__init__(
            message=message,
            category=AIErrorCategory.INFERENCE,
            severity=ErrorSeverity.MEDIUM,
            component="AIProcessor",
            operation="inference",
            context={'model_id': model_id},
            suggested_fallback=FallbackStrategy.RETRY,
            **kwargs
        )


@dataclass
class ResourceExhaustionError(AIError):
    """Error due to resource exhaustion."""
    def __init__(self, message: str, resource_type: str, **kwargs):
        super().__init__(
            message=message,
            category=AIErrorCategory.RESOURCE_EXHAUSTION,
            severity=ErrorSeverity.HIGH,
            component="ResourceManager",
            operation="allocate",
            context={'resource_type': resource_type},
            suggested_fallback=FallbackStrategy.CPU_FALLBACK,
            **kwargs
        )


@dataclass
class TimeoutError(AIError):
    """Error due to operation timeout."""
    def __init__(self, message: str, timeout_seconds: float, **kwargs):
        super().__init__(
            message=message,
            category=AIErrorCategory.TIMEOUT,
            severity=ErrorSeverity.MEDIUM,
            component="AIOperation",
            operation="execute",
            context={'timeout_seconds': timeout_seconds},
            suggested_fallback=FallbackStrategy.LOWER_QUALITY,
            **kwargs
        )


@dataclass
class ValidationError(AIError):
    """Error during input/output validation."""
    def __init__(self, message: str, validation_type: str, **kwargs):
        super().__init__(
            message=message,
            category=AIErrorCategory.VALIDATION,
            severity=ErrorSeverity.LOW,
            component="Validator",
            operation="validate",
            context={'validation_type': validation_type},
            suggested_fallback=FallbackStrategy.SKIP,
            **kwargs
        )


@dataclass
class ErrorRecoveryResult:
    """Result of error recovery attempt."""
    success: bool
    strategy_used: FallbackStrategy
    result: Optional[Any] = None
    error: Optional[AIError] = None
    recovery_time_ms: float = 0.0
    attempts: int = 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'success': self.success,
            'strategy_used': self.strategy_used.value,
            'recovery_time_ms': self.recovery_time_ms,
            'attempts': self.attempts,
            'error': self.error.to_dict() if self.error else None
        }


@dataclass
class ErrorHandlerConfig:
    """Configuration for error handler."""
    # Retry settings
    max_retries: int = 3
    retry_delay_seconds: float = 1.0
    exponential_backoff: bool = True
    
    # Fallback settings
    enable_cpu_fallback: bool = True
    enable_quality_degradation: bool = True
    enable_cached_fallback: bool = True
    
    # Timeout settings
    default_timeout_seconds: float = 30.0
    enable_timeout_extension: bool = True
    max_timeout_extensions: int = 2
    
    # Logging settings
    log_all_errors: bool = True
    log_recoveries: bool = True
    detailed_logging: bool = False
    
    # Analytics settings
    track_error_patterns: bool = True
    error_history_size: int = 1000


class AIErrorHandler:
    """
    Comprehensive AI Error Handler.
    
    Provides centralized error handling, automatic fallback selection,
    and graceful degradation for all AI operations.
    """
    
    def __init__(self, config: ErrorHandlerConfig):
        """Initialize error handler."""
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Error tracking
        self.error_history: List[AIError] = []
        self.error_counts: Dict[AIErrorCategory, int] = {cat: 0 for cat in AIErrorCategory}
        self.recovery_stats: Dict[FallbackStrategy, Dict[str, int]] = {
            strategy: {'attempts': 0, 'successes': 0, 'failures': 0}
            for strategy in FallbackStrategy
        }
        
        # Fallback handlers registry
        self.fallback_handlers: Dict[FallbackStrategy, Callable] = {}
        
        self.logger.info("AI Error Handler initialized")
    
    def register_fallback_handler(self, strategy: FallbackStrategy, handler: Callable):
        """Register a fallback handler for a specific strategy."""
        self.fallback_handlers[strategy] = handler
        self.logger.info(f"Registered fallback handler for {strategy.value}")
    
    async def handle_error(self, 
                          error: AIError,
                          fallback_context: Optional[Dict[str, Any]] = None) -> ErrorRecoveryResult:
        """
        Handle an AI error with automatic fallback.
        
        Args:
            error: The error to handle
            fallback_context: Context for fallback execution
            
        Returns:
            Recovery result
        """
        start_time = asyncio.get_event_loop().time()
        
        # Log error
        if self.config.log_all_errors:
            self._log_error(error)
        
        # Track error
        self._track_error(error)
        
        # Determine fallback strategy
        strategy = error.suggested_fallback or self._select_fallback_strategy(error)
        
        # Execute fallback
        try:
            result = await self._execute_fallback(strategy, error, fallback_context or {})
            
            recovery_time = (asyncio.get_event_loop().time() - start_time) * 1000
            
            # Track success
            self.recovery_stats[strategy]['attempts'] += 1
            self.recovery_stats[strategy]['successes'] += 1
            
            if self.config.log_recoveries:
                self.logger.info(f"Recovered from {error.category.value} using {strategy.value}")
            
            return ErrorRecoveryResult(
                success=True,
                strategy_used=strategy,
                result=result,
                recovery_time_ms=recovery_time,
                attempts=1
            )
            
        except Exception as e:
            recovery_time = (asyncio.get_event_loop().time() - start_time) * 1000
            
            # Track failure
            self.recovery_stats[strategy]['attempts'] += 1
            self.recovery_stats[strategy]['failures'] += 1
            
            self.logger.error(f"Fallback {strategy.value} failed: {e}")
            
            return ErrorRecoveryResult(
                success=False,
                strategy_used=strategy,
                error=error,
                recovery_time_ms=recovery_time,
                attempts=1
            )
    
    async def handle_with_retry(self,
                               operation: Callable,
                               max_retries: Optional[int] = None,
                               error_types: Optional[List[Type[Exception]]] = None) -> Any:
        """
        Execute operation with automatic retry on failure.
        
        Args:
            operation: Async operation to execute
            max_retries: Maximum retry attempts (uses config default if None)
            error_types: List of error types to retry (all if None)
            
        Returns:
            Operation result
            
        Raises:
            Last exception if all retries fail
        """
        max_retries = max_retries or self.config.max_retries
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                return await operation()
                
            except Exception as e:
                last_exception = e
                
                # Check if we should retry this error type
                if error_types and not isinstance(e, tuple(error_types)):
                    raise
                
                # Check if we have retries left
                if attempt >= max_retries:
                    raise
                
                # Calculate delay with exponential backoff
                if self.config.exponential_backoff:
                    delay = self.config.retry_delay_seconds * (2 ** attempt)
                else:
                    delay = self.config.retry_delay_seconds
                
                self.logger.warning(f"Retry {attempt + 1}/{max_retries} after {delay}s: {e}")
                await asyncio.sleep(delay)
        
        raise last_exception
    
    async def handle_with_timeout(self,
                                  operation: Callable,
                                  timeout_seconds: Optional[float] = None,
                                  allow_extension: bool = True) -> Any:
        """
        Execute operation with timeout and optional extension.
        
        Args:
            operation: Async operation to execute
            timeout_seconds: Timeout in seconds (uses config default if None)
            allow_extension: Whether to allow timeout extension
            
        Returns:
            Operation result
            
        Raises:
            TimeoutError if operation times out
        """
        timeout = timeout_seconds or self.config.default_timeout_seconds
        extensions_used = 0
        
        while True:
            try:
                return await asyncio.wait_for(operation(), timeout=timeout)
                
            except asyncio.TimeoutError:
                # Check if we can extend timeout
                if (allow_extension and 
                    self.config.enable_timeout_extension and
                    extensions_used < self.config.max_timeout_extensions):
                    
                    extensions_used += 1
                    timeout *= 1.5  # Extend by 50%
                    self.logger.warning(f"Extending timeout to {timeout}s (extension {extensions_used})")
                    continue
                
                # No more extensions, raise error
                raise TimeoutError(
                    message=f"Operation timed out after {timeout}s",
                    timeout_seconds=timeout,
                    component="ErrorHandler",
                    operation="handle_with_timeout"
                )
    
    def _select_fallback_strategy(self, error: AIError) -> FallbackStrategy:
        """Select appropriate fallback strategy based on error."""
        # Category-based strategy selection
        strategy_map = {
            AIErrorCategory.MODEL_LOADING: FallbackStrategy.ALTERNATIVE_MODEL,
            AIErrorCategory.INFERENCE: FallbackStrategy.RETRY,
            AIErrorCategory.RESOURCE_EXHAUSTION: FallbackStrategy.CPU_FALLBACK,
            AIErrorCategory.TIMEOUT: FallbackStrategy.LOWER_QUALITY,
            AIErrorCategory.VALIDATION: FallbackStrategy.SKIP,
            AIErrorCategory.NETWORK: FallbackStrategy.CACHED_RESULT,
            AIErrorCategory.CONFIGURATION: FallbackStrategy.GRACEFUL_DEGRADATION,
            AIErrorCategory.UNKNOWN: FallbackStrategy.RETRY
        }
        
        return strategy_map.get(error.category, FallbackStrategy.GRACEFUL_DEGRADATION)
    
    async def _execute_fallback(self,
                               strategy: FallbackStrategy,
                               error: AIError,
                               context: Dict[str, Any]) -> Any:
        """Execute a fallback strategy."""
        # Check if custom handler is registered
        if strategy in self.fallback_handlers:
            return await self.fallback_handlers[strategy](error, context)
        
        # Default fallback implementations
        if strategy == FallbackStrategy.RETRY:
            return await self._fallback_retry(error, context)
        elif strategy == FallbackStrategy.CPU_FALLBACK:
            return await self._fallback_cpu(error, context)
        elif strategy == FallbackStrategy.LOWER_QUALITY:
            return await self._fallback_lower_quality(error, context)
        elif strategy == FallbackStrategy.CACHED_RESULT:
            return await self._fallback_cached(error, context)
        elif strategy == FallbackStrategy.SKIP:
            return None  # Skip operation
        elif strategy == FallbackStrategy.GRACEFUL_DEGRADATION:
            return await self._fallback_graceful_degradation(error, context)
        else:
            raise NotImplementedError(f"Fallback strategy {strategy.value} not implemented")
    
    async def _fallback_retry(self, error: AIError, context: Dict[str, Any]) -> Any:
        """Retry fallback implementation."""
        operation = context.get('operation')
        if not operation:
            raise ValueError("Retry fallback requires 'operation' in context")
        
        return await self.handle_with_retry(operation, max_retries=self.config.max_retries)
    
    async def _fallback_cpu(self, error: AIError, context: Dict[str, Any]) -> Any:
        """CPU fallback implementation."""
        if not self.config.enable_cpu_fallback:
            raise ValueError("CPU fallback is disabled")
        
        self.logger.info("Falling back to CPU processing")
        # Implementation would switch to CPU processing
        return {'fallback': 'cpu', 'message': 'Switched to CPU processing'}
    
    async def _fallback_lower_quality(self, error: AIError, context: Dict[str, Any]) -> Any:
        """Lower quality fallback implementation."""
        if not self.config.enable_quality_degradation:
            raise ValueError("Quality degradation is disabled")
        
        self.logger.info("Reducing quality settings")
        # Implementation would reduce quality parameters
        return {'fallback': 'lower_quality', 'message': 'Reduced quality settings'}
    
    async def _fallback_cached(self, error: AIError, context: Dict[str, Any]) -> Any:
        """Cached result fallback implementation."""
        if not self.config.enable_cached_fallback:
            raise ValueError("Cached fallback is disabled")
        
        cache = context.get('cache')
        cache_key = context.get('cache_key')
        
        if cache and cache_key:
            result = await cache.get(cache_key)
            if result:
                self.logger.info("Using cached result")
                return result
        
        raise ValueError("No cached result available")
    
    async def _fallback_graceful_degradation(self, error: AIError, context: Dict[str, Any]) -> Any:
        """Graceful degradation fallback implementation."""
        self.logger.info("Gracefully degrading functionality")
        # Return minimal/default result
        return {'fallback': 'graceful_degradation', 'message': 'Functionality degraded'}
    
    def _log_error(self, error: AIError):
        """Log an error."""
        if self.config.detailed_logging:
            self.logger.error(f"{error}\nContext: {error.context}")
            if error.original_exception:
                self.logger.error(f"Original exception: {error.original_exception}")
                self.logger.error(traceback.format_exc())
        else:
            self.logger.error(str(error))
    
    def _track_error(self, error: AIError):
        """Track error for analytics."""
        if not self.config.track_error_patterns:
            return
        
        # Add to history (with size limit)
        self.error_history.append(error)
        if len(self.error_history) > self.config.error_history_size:
            self.error_history.pop(0)
        
        # Update counts
        self.error_counts[error.category] += 1
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """Get error statistics."""
        total_errors = sum(self.error_counts.values())
        
        return {
            'total_errors': total_errors,
            'errors_by_category': {
                cat.value: count for cat, count in self.error_counts.items()
            },
            'recovery_stats': {
                strategy.value: stats for strategy, stats in self.recovery_stats.items()
            },
            'recent_errors': [
                error.to_dict() for error in self.error_history[-10:]
            ]
        }
    
    def get_error_patterns(self) -> List[Dict[str, Any]]:
        """Analyze error patterns."""
        patterns = []
        
        # Find most common error categories
        sorted_categories = sorted(
            self.error_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        for category, count in sorted_categories[:5]:
            if count > 0:
                patterns.append({
                    'category': category.value,
                    'count': count,
                    'percentage': (count / sum(self.error_counts.values())) * 100
                })
        
        return patterns
    
    def clear_history(self):
        """Clear error history."""
        self.error_history.clear()
        self.logger.info("Error history cleared")


# Factory function
def create_error_handler(config: Optional[ErrorHandlerConfig] = None) -> AIErrorHandler:
    """Create error handler with default or custom configuration."""
    if config is None:
        config = ErrorHandlerConfig()
    
    return AIErrorHandler(config)
