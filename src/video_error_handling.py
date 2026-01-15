#!/usr/bin/env python3
"""
Video Engine Error Handling and Fallback System

This module provides comprehensive error handling, recovery mechanisms,
and fallback systems for video generation operations.
"""

import logging
import time
import traceback
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import circuit breaker for anti-blocking protection
try:
    from circuit_breaker import circuit_manager, CircuitBreakerConfig, CircuitBreakerError
    CIRCUIT_BREAKER_AVAILABLE = True
except ImportError:
    logger.warning("Circuit breaker not available - error recovery may be vulnerable to infinite loops")
    CIRCUIT_BREAKER_AVAILABLE = False


class ErrorSeverity(Enum):
    """Error severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """Error categories for classification."""
    INPUT_ERROR = "input_error"
    PROCESSING_ERROR = "processing_error"
    MEMORY_ERROR = "memory_error"
    HARDWARE_ERROR = "hardware_error"
    NETWORK_ERROR = "network_error"
    CONFIGURATION_ERROR = "configuration_error"
    QUALITY_ERROR = "quality_error"
    TIMEOUT_ERROR = "timeout_error"


class RecoveryStrategy(Enum):
    """Recovery strategies for different error types."""
    RETRY = "retry"
    FALLBACK = "fallback"
    SKIP = "skip"
    ABORT = "abort"
    DEGRADE_QUALITY = "degrade_quality"
    REDUCE_COMPLEXITY = "reduce_complexity"


@dataclass
class ErrorInfo:
    """Information about an error occurrence."""
    error_id: str
    timestamp: float
    category: ErrorCategory
    severity: ErrorSeverity
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    stack_trace: Optional[str] = None
    recovery_attempted: bool = False
    recovery_successful: bool = False
    recovery_strategy: Optional[RecoveryStrategy] = None


@dataclass
class FallbackConfig:
    """Configuration for fallback mechanisms."""
    enable_quality_degradation: bool = True
    enable_complexity_reduction: bool = True
    enable_alternative_algorithms: bool = True
    max_retry_attempts: int = 3
    retry_delay_seconds: float = 1.0
    timeout_seconds: float = 300.0
    quality_degradation_steps: List[str] = field(default_factory=lambda: [
        "reduce_resolution", "lower_frame_rate", "simplify_interpolation"
    ])


class VideoErrorHandler:
    """Comprehensive error handling system for video operations."""
    
    def __init__(self, fallback_config: Optional[FallbackConfig] = None):
        self.fallback_config = fallback_config or FallbackConfig()
        self.error_history = []
        self.recovery_statistics = {
            'total_errors': 0,
            'successful_recoveries': 0,
            'failed_recoveries': 0,
            'fallback_activations': 0
        }
        
        # Error handlers by category
        self.error_handlers = {
            ErrorCategory.INPUT_ERROR: self._handle_input_error,
            ErrorCategory.PROCESSING_ERROR: self._handle_processing_error,
            ErrorCategory.MEMORY_ERROR: self._handle_memory_error,
            ErrorCategory.HARDWARE_ERROR: self._handle_hardware_error,
            ErrorCategory.NETWORK_ERROR: self._handle_network_error,
            ErrorCategory.CONFIGURATION_ERROR: self._handle_configuration_error,
            ErrorCategory.QUALITY_ERROR: self._handle_quality_error,
            ErrorCategory.TIMEOUT_ERROR: self._handle_timeout_error
        }
        
        # Initialize circuit breakers for error recovery operations
        if CIRCUIT_BREAKER_AVAILABLE:
            self.retry_breaker = circuit_manager.get_breaker(
                "error_retry_operations",
                CircuitBreakerConfig(
                    failure_threshold=5,
                    recovery_timeout=120.0,
                    success_threshold=2,
                    timeout=30.0,  # 30 second timeout for retry operations
                    max_concurrent=3
                )
            )
            
            self.fallback_breaker = circuit_manager.get_breaker(
                "error_fallback_operations",
                CircuitBreakerConfig(
                    failure_threshold=3,
                    recovery_timeout=60.0,
                    success_threshold=1,
                    timeout=60.0,  # 1 minute timeout for fallback operations
                    max_concurrent=2
                )
            )
            
            logger.info("Circuit breakers initialized for error handling operations")
        else:
            self.retry_breaker = None
            self.fallback_breaker = None
        
        logger.info("Video Error Handler initialized")
    
    def handle_error(self, 
                    exception: Exception, 
                    context: Dict[str, Any],
                    operation_name: str = "unknown") -> ErrorInfo:
        """Handle an error with appropriate recovery strategy."""
        
        # Classify the error
        category = self._classify_error(exception, context)
        severity = self._assess_severity(exception, category, context)
        
        # Create error info
        error_info = ErrorInfo(
            error_id=f"{operation_name}_{int(time.time())}_{len(self.error_history)}",
            timestamp=time.time(),
            category=category,
            severity=severity,
            message=str(exception),
            details=context.copy(),
            stack_trace=traceback.format_exc()
        )
        
        # Log the error
        logger.error(f"Error in {operation_name}: {exception}")
        logger.debug(f"Error details: {error_info.details}")
        
        # Attempt recovery
        if severity != ErrorSeverity.CRITICAL:
            recovery_result = self._attempt_recovery(error_info, context)
            error_info.recovery_attempted = True
            error_info.recovery_successful = recovery_result['success']
            error_info.recovery_strategy = recovery_result.get('strategy')
        
        # Update statistics
        self.recovery_statistics['total_errors'] += 1
        if error_info.recovery_successful:
            self.recovery_statistics['successful_recoveries'] += 1
        elif error_info.recovery_attempted:
            self.recovery_statistics['failed_recoveries'] += 1
        
        # Store error history
        self.error_history.append(error_info)
        
        return error_info
    
    def _classify_error(self, exception: Exception, context: Dict[str, Any]) -> ErrorCategory:
        """Classify error based on exception type and context."""
        
        exception_type = type(exception).__name__
        error_message = str(exception).lower()
        
        # Input-related errors
        if any(keyword in error_message for keyword in ['file not found', 'invalid input', 'missing file']):
            return ErrorCategory.INPUT_ERROR
        
        # Memory-related errors
        if any(keyword in error_message for keyword in ['memory', 'out of memory', 'allocation']):
            return ErrorCategory.MEMORY_ERROR
        
        # Hardware-related errors
        if any(keyword in error_message for keyword in ['cuda', 'gpu', 'device', 'driver']):
            return ErrorCategory.HARDWARE_ERROR
        
        # Network-related errors
        if any(keyword in error_message for keyword in ['connection', 'network', 'timeout', 'http']):
            return ErrorCategory.NETWORK_ERROR
        
        # Configuration-related errors
        if any(keyword in error_message for keyword in ['config', 'setting', 'parameter']):
            return ErrorCategory.CONFIGURATION_ERROR
        
        # Quality-related errors
        if any(keyword in error_message for keyword in ['quality', 'validation', 'threshold']):
            return ErrorCategory.QUALITY_ERROR
        
        # Timeout errors
        if any(keyword in error_message for keyword in ['timeout', 'deadline', 'expired']):
            return ErrorCategory.TIMEOUT_ERROR
        
        # Default to processing error
        return ErrorCategory.PROCESSING_ERROR
    
    def _assess_severity(self, 
                        exception: Exception, 
                        category: ErrorCategory, 
                        context: Dict[str, Any]) -> ErrorSeverity:
        """Assess the severity of an error."""
        
        # Critical errors that should abort operation
        if category == ErrorCategory.HARDWARE_ERROR and 'cuda' in str(exception).lower():
            return ErrorSeverity.CRITICAL
        
        if category == ErrorCategory.MEMORY_ERROR and 'out of memory' in str(exception).lower():
            return ErrorSeverity.HIGH
        
        # High severity errors
        if category in [ErrorCategory.CONFIGURATION_ERROR, ErrorCategory.INPUT_ERROR]:
            return ErrorSeverity.HIGH
        
        # Medium severity errors
        if category in [ErrorCategory.PROCESSING_ERROR, ErrorCategory.QUALITY_ERROR]:
            return ErrorSeverity.MEDIUM
        
        # Low severity errors
        return ErrorSeverity.LOW
    
    def _attempt_recovery(self, error_info: ErrorInfo, context: Dict[str, Any]) -> Dict[str, Any]:
        """Attempt to recover from an error with circuit breaker protection."""
        
        # Get appropriate handler
        handler = self.error_handlers.get(error_info.category)
        if not handler:
            return {'success': False, 'message': 'No handler available'}
        
        # Use circuit breaker protection for recovery operations
        if CIRCUIT_BREAKER_AVAILABLE:
            # Determine which circuit breaker to use based on recovery strategy
            recovery_strategy = self._determine_recovery_strategy(error_info, context)
            
            if recovery_strategy == RecoveryStrategy.RETRY and self.retry_breaker:
                try:
                    return self.retry_breaker.call(handler, error_info, context)
                except CircuitBreakerError as e:
                    logger.warning(f"Retry operations blocked by circuit breaker: {e}")
                    # Try fallback instead
                    if self.fallback_breaker:
                        try:
                            return self.fallback_breaker.call(self._handle_fallback_recovery, error_info, context)
                        except CircuitBreakerError:
                            return {'success': False, 'message': 'All recovery circuits are open'}
                    return {'success': False, 'message': 'Retry circuit breaker is open'}
            
            elif self.fallback_breaker:
                try:
                    return self.fallback_breaker.call(handler, error_info, context)
                except CircuitBreakerError as e:
                    logger.warning(f"Fallback operations blocked by circuit breaker: {e}")
                    return {'success': False, 'message': 'Fallback circuit breaker is open'}
        
        # Fallback without circuit breaker protection
        try:
            return handler(error_info, context)
        except Exception as e:
            logger.error(f"Recovery attempt failed: {e}")
            return {'success': False, 'message': f'Recovery failed: {e}'}
    
    def _determine_recovery_strategy(self, error_info: ErrorInfo, context: Dict[str, Any]) -> RecoveryStrategy:
        """Determine the appropriate recovery strategy for an error."""
        # Network errors typically use retry
        if error_info.category == ErrorCategory.NETWORK_ERROR:
            return RecoveryStrategy.RETRY
        
        # Timeout errors may use retry with increased timeout
        if error_info.category == ErrorCategory.TIMEOUT_ERROR:
            return RecoveryStrategy.RETRY
        
        # Most other errors use fallback strategies
        return RecoveryStrategy.FALLBACK
    
    def _handle_fallback_recovery(self, error_info: ErrorInfo, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle fallback recovery when retry operations are blocked."""
        # Implement basic fallback strategies that don't involve retries
        
        if error_info.category == ErrorCategory.MEMORY_ERROR:
            # Reduce memory usage
            if 'batch_size' in context and context['batch_size'] > 1:
                context['batch_size'] = 1
                return {
                    'success': True,
                    'strategy': RecoveryStrategy.REDUCE_COMPLEXITY,
                    'message': 'Reduced batch size to 1 (fallback recovery)'
                }
        
        elif error_info.category == ErrorCategory.PROCESSING_ERROR:
            # Use simplest algorithm
            if 'algorithm' in context:
                context['algorithm'] = 'linear'
                return {
                    'success': True,
                    'strategy': RecoveryStrategy.FALLBACK,
                    'message': 'Using linear algorithm (fallback recovery)'
                }
        
        elif error_info.category == ErrorCategory.QUALITY_ERROR:
            # Disable quality validation
            if 'enable_quality_validation' in context:
                context['enable_quality_validation'] = False
                return {
                    'success': True,
                    'strategy': RecoveryStrategy.SKIP,
                    'message': 'Disabled quality validation (fallback recovery)'
                }
        
        return {'success': False, 'message': 'No fallback recovery options available'}
    
    def _handle_input_error(self, error_info: ErrorInfo, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle input-related errors."""
        
        # Try to find alternative input files
        if 'input_path' in context:
            input_path = Path(context['input_path'])
            
            # Look for backup files
            backup_patterns = [
                input_path.with_suffix('.backup' + input_path.suffix),
                input_path.parent / f"backup_{input_path.name}",
                input_path.parent / f"{input_path.stem}_alt{input_path.suffix}"
            ]
            
            for backup_path in backup_patterns:
                if backup_path.exists():
                    context['input_path'] = str(backup_path)
                    logger.info(f"Using backup file: {backup_path}")
                    return {
                        'success': True, 
                        'strategy': RecoveryStrategy.FALLBACK,
                        'message': f'Using backup file: {backup_path}'
                    }
        
        # Try to generate placeholder/default input
        if 'frame_data' in context:
            # Create a simple placeholder frame
            import numpy as np
            height, width = context.get('resolution', (1080, 1920))
            placeholder_frame = np.zeros((height, width, 3), dtype=np.uint8)
            context['frame_data'] = placeholder_frame
            
            return {
                'success': True,
                'strategy': RecoveryStrategy.FALLBACK,
                'message': 'Using placeholder frame data'
            }
        
        return {'success': False, 'message': 'No recovery options available'}
    
    def _handle_processing_error(self, error_info: ErrorInfo, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle processing-related errors."""
        
        # Try simpler processing algorithms
        if 'algorithm' in context:
            current_algorithm = context['algorithm']
            
            # Fallback algorithm hierarchy
            algorithm_fallbacks = {
                'optical_flow': 'linear',
                'depth_aware': 'optical_flow',
                'advanced': 'basic'
            }
            
            fallback_algorithm = algorithm_fallbacks.get(current_algorithm)
            if fallback_algorithm:
                context['algorithm'] = fallback_algorithm
                logger.info(f"Falling back to {fallback_algorithm} algorithm")
                return {
                    'success': True,
                    'strategy': RecoveryStrategy.FALLBACK,
                    'message': f'Using fallback algorithm: {fallback_algorithm}'
                }
        
        # Try reducing processing complexity
        if 'quality_level' in context:
            current_quality = context['quality_level']
            quality_levels = ['ultra', 'high', 'medium', 'low', 'basic']
            
            try:
                current_index = quality_levels.index(current_quality)
                if current_index < len(quality_levels) - 1:
                    new_quality = quality_levels[current_index + 1]
                    context['quality_level'] = new_quality
                    logger.info(f"Reducing quality to {new_quality}")
                    return {
                        'success': True,
                        'strategy': RecoveryStrategy.DEGRADE_QUALITY,
                        'message': f'Reduced quality to: {new_quality}'
                    }
            except ValueError:
                pass
        
        return {'success': False, 'message': 'No processing recovery options available'}
    
    def _handle_memory_error(self, error_info: ErrorInfo, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle memory-related errors."""
        
        # Reduce batch size
        if 'batch_size' in context and context['batch_size'] > 1:
            new_batch_size = max(1, context['batch_size'] // 2)
            context['batch_size'] = new_batch_size
            logger.info(f"Reducing batch size to {new_batch_size}")
            return {
                'success': True,
                'strategy': RecoveryStrategy.REDUCE_COMPLEXITY,
                'message': f'Reduced batch size to: {new_batch_size}'
            }
        
        # Reduce resolution
        if 'resolution' in context:
            height, width = context['resolution']
            new_height = int(height * 0.75)
            new_width = int(width * 0.75)
            context['resolution'] = (new_height, new_width)
            logger.info(f"Reducing resolution to {new_width}x{new_height}")
            return {
                'success': True,
                'strategy': RecoveryStrategy.DEGRADE_QUALITY,
                'message': f'Reduced resolution to: {new_width}x{new_height}'
            }
        
        # Enable memory cleanup
        if 'enable_cleanup' in context:
            context['enable_cleanup'] = True
            context['cleanup_frequency'] = 'aggressive'
            return {
                'success': True,
                'strategy': RecoveryStrategy.FALLBACK,
                'message': 'Enabled aggressive memory cleanup'
            }
        
        return {'success': False, 'message': 'No memory recovery options available'}
    
    def _handle_hardware_error(self, error_info: ErrorInfo, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle hardware-related errors."""
        
        # Fall back to CPU processing
        if 'use_gpu' in context and context['use_gpu']:
            context['use_gpu'] = False
            context['processing_mode'] = 'cpu_only'
            logger.info("Falling back to CPU processing")
            return {
                'success': True,
                'strategy': RecoveryStrategy.FALLBACK,
                'message': 'Switched to CPU processing'
            }
        
        # Reduce parallel workers
        if 'max_workers' in context and context['max_workers'] > 1:
            new_workers = max(1, context['max_workers'] // 2)
            context['max_workers'] = new_workers
            logger.info(f"Reducing workers to {new_workers}")
            return {
                'success': True,
                'strategy': RecoveryStrategy.REDUCE_COMPLEXITY,
                'message': f'Reduced workers to: {new_workers}'
            }
        
        return {'success': False, 'message': 'No hardware recovery options available'}
    
    def _handle_network_error(self, error_info: ErrorInfo, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle network-related errors."""
        
        # Retry with exponential backoff
        retry_count = context.get('retry_count', 0)
        if retry_count < self.fallback_config.max_retry_attempts:
            delay = self.fallback_config.retry_delay_seconds * (2 ** retry_count)
            context['retry_count'] = retry_count + 1
            context['retry_delay'] = delay
            
            logger.info(f"Retrying network operation (attempt {retry_count + 1}) after {delay}s")
            return {
                'success': True,
                'strategy': RecoveryStrategy.RETRY,
                'message': f'Retrying after {delay}s (attempt {retry_count + 1})'
            }
        
        # Switch to offline mode
        if 'enable_offline_mode' in context:
            context['enable_offline_mode'] = True
            context['use_cached_data'] = True
            return {
                'success': True,
                'strategy': RecoveryStrategy.FALLBACK,
                'message': 'Switched to offline mode'
            }
        
        return {'success': False, 'message': 'No network recovery options available'}
    
    def _handle_configuration_error(self, error_info: ErrorInfo, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle configuration-related errors."""
        
        # Reset to default configuration
        if 'use_default_config' in context:
            context['use_default_config'] = True
            logger.info("Falling back to default configuration")
            return {
                'success': True,
                'strategy': RecoveryStrategy.FALLBACK,
                'message': 'Using default configuration'
            }
        
        # Validate and fix configuration
        if 'config' in context:
            config = context['config']
            
            # Fix common configuration issues
            fixes_applied = []
            
            # Ensure positive values
            for key in ['batch_size', 'max_workers', 'timeout']:
                if key in config and config[key] <= 0:
                    config[key] = 1
                    fixes_applied.append(f"Set {key} to 1")
            
            # Ensure valid ranges
            if 'quality_level' in config and config['quality_level'] not in ['low', 'medium', 'high', 'ultra']:
                config['quality_level'] = 'medium'
                fixes_applied.append("Set quality_level to medium")
            
            if fixes_applied:
                return {
                    'success': True,
                    'strategy': RecoveryStrategy.FALLBACK,
                    'message': f'Applied fixes: {", ".join(fixes_applied)}'
                }
        
        return {'success': False, 'message': 'No configuration recovery options available'}
    
    def _handle_quality_error(self, error_info: ErrorInfo, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle quality-related errors."""
        
        # Relax quality thresholds
        if 'quality_thresholds' in context:
            thresholds = context['quality_thresholds']
            
            # Reduce thresholds by 10%
            for key, value in thresholds.items():
                if isinstance(value, (int, float)):
                    thresholds[key] = value * 0.9
            
            logger.info("Relaxed quality thresholds by 10%")
            return {
                'success': True,
                'strategy': RecoveryStrategy.DEGRADE_QUALITY,
                'message': 'Relaxed quality thresholds by 10%'
            }
        
        # Skip quality validation
        if 'enable_quality_validation' in context:
            context['enable_quality_validation'] = False
            logger.info("Disabled quality validation")
            return {
                'success': True,
                'strategy': RecoveryStrategy.SKIP,
                'message': 'Disabled quality validation'
            }
        
        return {'success': False, 'message': 'No quality recovery options available'}
    
    def _handle_timeout_error(self, error_info: ErrorInfo, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle timeout-related errors."""
        
        # Increase timeout
        if 'timeout' in context:
            current_timeout = context['timeout']
            new_timeout = current_timeout * 1.5
            context['timeout'] = new_timeout
            logger.info(f"Increased timeout to {new_timeout}s")
            return {
                'success': True,
                'strategy': RecoveryStrategy.FALLBACK,
                'message': f'Increased timeout to {new_timeout}s'
            }
        
        # Reduce processing complexity to meet timeout
        if 'processing_complexity' in context:
            complexity_levels = ['ultra', 'high', 'medium', 'low', 'minimal']
            current_complexity = context['processing_complexity']
            
            try:
                current_index = complexity_levels.index(current_complexity)
                if current_index < len(complexity_levels) - 1:
                    new_complexity = complexity_levels[current_index + 1]
                    context['processing_complexity'] = new_complexity
                    logger.info(f"Reduced complexity to {new_complexity}")
                    return {
                        'success': True,
                        'strategy': RecoveryStrategy.REDUCE_COMPLEXITY,
                        'message': f'Reduced complexity to: {new_complexity}'
                    }
            except ValueError:
                pass
        
        return {'success': False, 'message': 'No timeout recovery options available'}
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """Get comprehensive error statistics."""
        
        # Calculate error rates by category
        category_counts = {}
        severity_counts = {}
        
        for error in self.error_history:
            category_counts[error.category.value] = category_counts.get(error.category.value, 0) + 1
            severity_counts[error.severity.value] = severity_counts.get(error.severity.value, 0) + 1
        
        # Calculate recovery success rate
        total_recovery_attempts = sum(1 for e in self.error_history if e.recovery_attempted)
        successful_recoveries = sum(1 for e in self.error_history if e.recovery_successful)
        
        recovery_rate = (successful_recoveries / total_recovery_attempts * 100) if total_recovery_attempts > 0 else 0
        
        return {
            'total_errors': len(self.error_history),
            'recovery_statistics': self.recovery_statistics,
            'recovery_success_rate': recovery_rate,
            'errors_by_category': category_counts,
            'errors_by_severity': severity_counts,
            'recent_errors': [
                {
                    'timestamp': error.timestamp,
                    'category': error.category.value,
                    'severity': error.severity.value,
                    'message': error.message,
                    'recovered': error.recovery_successful
                }
                for error in self.error_history[-10:]  # Last 10 errors
            ]
        }
    
    def export_error_report(self, output_path: str):
        """Export comprehensive error report."""
        
        report = {
            'timestamp': time.time(),
            'statistics': self.get_error_statistics(),
            'configuration': {
                'max_retry_attempts': self.fallback_config.max_retry_attempts,
                'retry_delay_seconds': self.fallback_config.retry_delay_seconds,
                'timeout_seconds': self.fallback_config.timeout_seconds,
                'quality_degradation_enabled': self.fallback_config.enable_quality_degradation,
                'complexity_reduction_enabled': self.fallback_config.enable_complexity_reduction
            },
            'error_history': [
                {
                    'error_id': error.error_id,
                    'timestamp': error.timestamp,
                    'category': error.category.value,
                    'severity': error.severity.value,
                    'message': error.message,
                    'details': error.details,
                    'recovery_attempted': error.recovery_attempted,
                    'recovery_successful': error.recovery_successful,
                    'recovery_strategy': error.recovery_strategy.value if error.recovery_strategy else None
                }
                for error in self.error_history
            ]
        }
        
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Error report exported to: {output_file}")


# Context manager for error handling
class ErrorHandlingContext:
    """Context manager for automatic error handling."""
    
    def __init__(self, 
                 error_handler: VideoErrorHandler,
                 operation_name: str,
                 context: Dict[str, Any],
                 raise_on_failure: bool = True):
        self.error_handler = error_handler
        self.operation_name = operation_name
        self.context = context
        self.raise_on_failure = raise_on_failure
        self.error_info = None
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # Handle the error
            self.error_info = self.error_handler.handle_error(
                exc_val, self.context, self.operation_name
            )
            
            # Suppress exception if recovery was successful
            if self.error_info.recovery_successful:
                logger.info(f"Successfully recovered from error in {self.operation_name}")
                return True
            elif not self.raise_on_failure:
                logger.warning(f"Error recovery failed for {self.operation_name}, continuing anyway")
                return True
        
        return False


# Example usage and testing functions
def test_error_handling():
    """Test the error handling system."""
    print("Testing Video Error Handling System...")
    
    error_handler = VideoErrorHandler()
    
    # Test different error types
    test_cases = [
        {
            'exception': FileNotFoundError("Input file not found"),
            'context': {'input_path': '/nonexistent/file.jpg', 'operation': 'load_frame'},
            'operation': 'frame_loading'
        },
        {
            'exception': MemoryError("Out of memory"),
            'context': {'batch_size': 32, 'resolution': (1920, 1080)},
            'operation': 'frame_processing'
        },
        {
            'exception': RuntimeError("CUDA out of memory"),
            'context': {'use_gpu': True, 'max_workers': 8},
            'operation': 'gpu_processing'
        },
        {
            'exception': ValueError("Invalid quality threshold: 1.5"),
            'context': {'quality_thresholds': {'sharpness': 1.5}, 'enable_quality_validation': True},
            'operation': 'quality_validation'
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. Testing {test_case['operation']}:")
        
        error_info = error_handler.handle_error(
            test_case['exception'],
            test_case['context'],
            test_case['operation']
        )
        
        print(f"   Category: {error_info.category.value}")
        print(f"   Severity: {error_info.severity.value}")
        print(f"   Recovery attempted: {error_info.recovery_attempted}")
        print(f"   Recovery successful: {error_info.recovery_successful}")
        if error_info.recovery_strategy:
            print(f"   Recovery strategy: {error_info.recovery_strategy.value}")
    
    # Test error statistics
    print("\n5. Error Statistics:")
    stats = error_handler.get_error_statistics()
    print(f"   Total errors: {stats['total_errors']}")
    print(f"   Recovery success rate: {stats['recovery_success_rate']:.1f}%")
    print(f"   Errors by category: {stats['errors_by_category']}")
    
    # Test context manager
    print("\n6. Testing error handling context manager:")
    
    try:
        with ErrorHandlingContext(
            error_handler, 
            "test_operation", 
            {'test_param': 'value'},
            raise_on_failure=False
        ) as ctx:
            raise ValueError("Test error for context manager")
    except ValueError:
        print("   Error was not handled by context manager")
    else:
        print("   Error was successfully handled by context manager")
    
    print("\n✅ Error handling tests completed!")


if __name__ == "__main__":
    test_error_handling()