"""
ComfyUI Error Handler and Fallback System
Provides comprehensive error handling, analysis, and fallback mechanisms.
"""

import asyncio
import logging
import traceback
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable, Union
from enum import Enum
from pathlib import Path

from .comfyui_config import ComfyUIConfig
from .comfyui_models import (
    ServiceState, HealthState, ExecutionStatus, PerformanceMetrics
)


class ErrorSeverity(Enum):
    """Error severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """Error categories for classification."""
    NETWORK = "network"
    SERVICE = "service"
    CONFIGURATION = "configuration"
    WORKFLOW = "workflow"
    RESOURCE = "resource"
    SYSTEM = "system"
    UNKNOWN = "unknown"


class FallbackMode(Enum):
    """Available fallback modes."""
    MOCK = "mock"
    RETRY = "retry"
    DEGRADED = "degraded"
    OFFLINE = "offline"


class ErrorInfo:
    """Detailed error information with analysis."""
    
    def __init__(
        self,
        error: Exception,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context: Optional[Dict[str, Any]] = None,
        suggestions: Optional[List[str]] = None
    ):
        self.error = error
        self.category = category
        self.severity = severity
        self.context = context or {}
        self.suggestions = suggestions or []
        self.timestamp = datetime.utcnow()
        self.error_id = f"{int(time.time())}-{hash(str(error)) % 10000:04d}"
        
        # Extract error details
        self.error_type = type(error).__name__
        self.error_message = str(error)
        self.traceback = traceback.format_exc()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error info to dictionary."""
        return {
            "error_id": self.error_id,
            "timestamp": self.timestamp.isoformat(),
            "error_type": self.error_type,
            "error_message": self.error_message,
            "category": self.category.value,
            "severity": self.severity.value,
            "context": self.context,
            "suggestions": self.suggestions,
            "traceback": self.traceback
        }


class FallbackStrategy:
    """Fallback strategy configuration."""
    
    def __init__(
        self,
        mode: FallbackMode,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        retry_multiplier: float = 2.0,
        max_retry_delay: float = 60.0,
        timeout: float = 30.0,
        conditions: Optional[List[Callable[[ErrorInfo], bool]]] = None
    ):
        self.mode = mode
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.retry_multiplier = retry_multiplier
        self.max_retry_delay = max_retry_delay
        self.timeout = timeout
        self.conditions = conditions or []
        
        # State tracking
        self.retry_count = 0
        self.last_attempt = None
        self.active = False
    
    def should_apply(self, error_info: ErrorInfo) -> bool:
        """Check if this strategy should be applied to the error."""
        if not self.conditions:
            return True
        
        return any(condition(error_info) for condition in self.conditions)
    
    def calculate_delay(self) -> float:
        """Calculate delay for next retry attempt."""
        if self.retry_count == 0:
            return 0.0
        
        delay = self.retry_delay * (self.retry_multiplier ** (self.retry_count - 1))
        return min(delay, self.max_retry_delay)
    
    def can_retry(self) -> bool:
        """Check if more retries are allowed."""
        return self.retry_count < self.max_retries
    
    def reset(self) -> None:
        """Reset strategy state."""
        self.retry_count = 0
        self.last_attempt = None
        self.active = False


class ErrorHandler:
    """
    Comprehensive error handler with analysis and fallback capabilities.
    
    Provides automatic error classification, detailed analysis, recovery suggestions,
    and configurable fallback strategies for different error scenarios.
    """
    
    def __init__(self, config: ComfyUIConfig):
        """
        Initialize Error Handler.
        
        Args:
            config: ComfyUI configuration for error handling settings.
        """
        self.config = config
        self.logger = self._setup_logging()
        
        # Error tracking
        self._error_history: List[ErrorInfo] = []
        self._error_patterns: Dict[str, int] = {}
        self._fallback_active = False
        self._current_fallback_mode: Optional[FallbackMode] = None
        
        # Fallback strategies
        self._fallback_strategies = self._setup_fallback_strategies()
        
        # Recovery callbacks
        self._recovery_callbacks: List[Callable[[ErrorInfo, FallbackMode], None]] = []
        
        # Performance tracking
        self.metrics: List[PerformanceMetrics] = []
        
        self.logger.info("Error Handler initialized with comprehensive fallback system")
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for the error handler."""
        logger = logging.getLogger("comfyui_error_handler")
        logger.setLevel(getattr(logging, self.config.log_level))
        
        # Create console handler if not already exists
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _setup_fallback_strategies(self) -> Dict[ErrorCategory, List[FallbackStrategy]]:
        """Set up default fallback strategies for different error categories."""
        strategies = {
            ErrorCategory.NETWORK: [
                FallbackStrategy(
                    mode=FallbackMode.RETRY,
                    max_retries=3,
                    retry_delay=2.0,
                    conditions=[lambda e: "connection" in e.error_message.lower()]
                ),
                FallbackStrategy(
                    mode=FallbackMode.MOCK,
                    conditions=[lambda e: e.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]]
                )
            ],
            
            ErrorCategory.SERVICE: [
                FallbackStrategy(
                    mode=FallbackMode.RETRY,
                    max_retries=2,
                    retry_delay=5.0,
                    conditions=[lambda e: "startup" in e.error_message.lower()]
                ),
                FallbackStrategy(
                    mode=FallbackMode.MOCK,
                    conditions=[lambda e: e.severity == ErrorSeverity.CRITICAL]
                )
            ],
            
            ErrorCategory.CONFIGURATION: [
                FallbackStrategy(
                    mode=FallbackMode.DEGRADED,
                    conditions=[lambda e: "validation" in e.error_message.lower()]
                ),
                FallbackStrategy(
                    mode=FallbackMode.MOCK,
                    conditions=[lambda e: e.severity == ErrorSeverity.CRITICAL]
                )
            ],
            
            ErrorCategory.WORKFLOW: [
                FallbackStrategy(
                    mode=FallbackMode.RETRY,
                    max_retries=1,
                    retry_delay=1.0,
                    conditions=[lambda e: "timeout" in e.error_message.lower()]
                ),
                FallbackStrategy(
                    mode=FallbackMode.MOCK,
                    conditions=[lambda e: True]  # Always fallback to mock for workflow errors
                )
            ],
            
            ErrorCategory.RESOURCE: [
                FallbackStrategy(
                    mode=FallbackMode.DEGRADED,
                    conditions=[lambda e: "memory" in e.error_message.lower() or "vram" in e.error_message.lower()]
                ),
                FallbackStrategy(
                    mode=FallbackMode.MOCK,
                    conditions=[lambda e: e.severity == ErrorSeverity.CRITICAL]
                )
            ],
            
            ErrorCategory.SYSTEM: [
                FallbackStrategy(
                    mode=FallbackMode.OFFLINE,
                    conditions=[lambda e: e.severity == ErrorSeverity.CRITICAL]
                )
            ]
        }
        
        # Default fallback for unknown categories
        strategies[ErrorCategory.UNKNOWN] = [
            FallbackStrategy(
                mode=FallbackMode.RETRY,
                max_retries=1,
                retry_delay=2.0
            ),
            FallbackStrategy(
                mode=FallbackMode.MOCK,
                conditions=[lambda e: True]
            )
        ]
        
        return strategies
    
    def analyze_error(
        self, 
        error: Exception, 
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorInfo:
        """
        Analyze an error and provide detailed information.
        
        Args:
            error: Exception to analyze.
            context: Additional context information.
            
        Returns:
            ErrorInfo with detailed analysis and suggestions.
        """
        start_time = time.time()
        metrics = PerformanceMetrics.start_operation("error_analysis")
        
        try:
            # Classify error
            category = self._classify_error(error, context)
            severity = self._assess_severity(error, category, context)
            
            # Generate suggestions
            suggestions = self._generate_suggestions(error, category, context)
            
            # Create error info
            error_info = ErrorInfo(
                error=error,
                category=category,
                severity=severity,
                context=context,
                suggestions=suggestions
            )
            
            # Track error patterns
            error_pattern = f"{category.value}:{type(error).__name__}"
            self._error_patterns[error_pattern] = self._error_patterns.get(error_pattern, 0) + 1
            
            # Store in history
            self._error_history.append(error_info)
            
            # Limit history size
            if len(self._error_history) > 100:
                self._error_history = self._error_history[-100:]
            
            self.logger.error(
                f"Error analyzed: {error_info.error_id} - {category.value}/{severity.value} - {str(error)}"
            )
            
            metrics.complete(success=True)
            return error_info
        
        except Exception as analysis_error:
            self.logger.error(f"Error during error analysis: {analysis_error}")
            metrics.complete(success=False, error_message=str(analysis_error))
            
            # Return basic error info if analysis fails
            return ErrorInfo(
                error=error,
                category=ErrorCategory.UNKNOWN,
                severity=ErrorSeverity.MEDIUM,
                context=context,
                suggestions=["Error analysis failed, check logs for details"]
            )
        
        finally:
            self.metrics.append(metrics)
    
    def _classify_error(
        self, 
        error: Exception, 
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorCategory:
        """Classify error into appropriate category."""
        error_msg = str(error).lower()
        error_type = type(error).__name__.lower()
        
        # Network-related errors
        if any(keyword in error_msg for keyword in [
            "connection", "timeout", "network", "socket", "dns", "http", "websocket"
        ]) or any(keyword in error_type for keyword in [
            "connection", "timeout", "http", "socket"
        ]):
            return ErrorCategory.NETWORK
        
        # Service-related errors
        if any(keyword in error_msg for keyword in [
            "service", "startup", "shutdown", "process", "pid", "port"
        ]) or (context and context.get("component") in ["manager", "service"]):
            return ErrorCategory.SERVICE
        
        # Configuration errors
        if any(keyword in error_msg for keyword in [
            "config", "validation", "setting", "parameter", "path", "file not found"
        ]) or any(keyword in error_type for keyword in [
            "validation", "config"
        ]):
            return ErrorCategory.CONFIGURATION
        
        # Workflow errors
        if any(keyword in error_msg for keyword in [
            "workflow", "node", "execution", "prompt", "model", "checkpoint"
        ]) or (context and context.get("component") in ["workflow", "executor"]):
            return ErrorCategory.WORKFLOW
        
        # Resource errors
        if any(keyword in error_msg for keyword in [
            "memory", "vram", "disk", "space", "resource", "quota", "limit"
        ]):
            return ErrorCategory.RESOURCE
        
        # System errors
        if any(keyword in error_msg for keyword in [
            "system", "os", "platform", "permission", "access"
        ]) or any(keyword in error_type for keyword in [
            "os", "system", "permission"
        ]):
            return ErrorCategory.SYSTEM
        
        return ErrorCategory.UNKNOWN
    
    def _assess_severity(
        self, 
        error: Exception, 
        category: ErrorCategory, 
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorSeverity:
        """Assess error severity based on type and context."""
        error_msg = str(error).lower()
        error_type = type(error).__name__
        
        # Critical severity conditions
        if any(keyword in error_msg for keyword in [
            "critical", "fatal", "crash", "abort", "corrupt"
        ]) or error_type in ["SystemExit", "KeyboardInterrupt"]:
            return ErrorSeverity.CRITICAL
        
        # High severity conditions
        if category in [ErrorCategory.SERVICE, ErrorCategory.SYSTEM] or any(keyword in error_msg for keyword in [
            "failed to start", "cannot connect", "permission denied", "access denied"
        ]):
            return ErrorSeverity.HIGH
        
        # Low severity conditions
        if category == ErrorCategory.CONFIGURATION or any(keyword in error_msg for keyword in [
            "warning", "deprecated", "minor", "temporary"
        ]):
            return ErrorSeverity.LOW
        
        # Default to medium severity
        return ErrorSeverity.MEDIUM
    
    def _generate_suggestions(
        self, 
        error: Exception, 
        category: ErrorCategory, 
        context: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """Generate recovery suggestions based on error analysis."""
        suggestions = []
        error_msg = str(error).lower()
        
        if category == ErrorCategory.NETWORK:
            suggestions.extend([
                "Check network connectivity and firewall settings",
                "Verify ComfyUI service is running on the correct port",
                "Try restarting the ComfyUI service",
                "Check if antivirus software is blocking connections"
            ])
            
            if "timeout" in error_msg:
                suggestions.append("Increase timeout settings in configuration")
        
        elif category == ErrorCategory.SERVICE:
            suggestions.extend([
                "Check ComfyUI installation path and executable permissions",
                "Verify all required dependencies are installed",
                "Check system resources (CPU, memory, disk space)",
                "Review ComfyUI logs for detailed error information"
            ])
            
            if "port" in error_msg:
                suggestions.append("Try using a different port or stop conflicting services")
        
        elif category == ErrorCategory.CONFIGURATION:
            suggestions.extend([
                "Validate configuration file syntax and values",
                "Check file paths and permissions",
                "Restore default configuration if needed",
                "Update configuration to match current ComfyUI version"
            ])
        
        elif category == ErrorCategory.WORKFLOW:
            suggestions.extend([
                "Verify workflow format and node compatibility",
                "Check if required models and checkpoints are available",
                "Simplify workflow to isolate problematic nodes",
                "Update workflow to match current ComfyUI API"
            ])
        
        elif category == ErrorCategory.RESOURCE:
            suggestions.extend([
                "Free up system memory and disk space",
                "Reduce workflow complexity or image resolution",
                "Enable CPU mode if GPU memory is insufficient",
                "Close other applications to free resources"
            ])
        
        elif category == ErrorCategory.SYSTEM:
            suggestions.extend([
                "Check system compatibility and requirements",
                "Update system drivers and dependencies",
                "Run with administrator/root privileges if needed",
                "Check system logs for additional error details"
            ])
        
        # Add general suggestions
        suggestions.extend([
            "Enable mock mode as a temporary workaround",
            "Check the error logs for more detailed information",
            "Contact support if the issue persists"
        ])
        
        return suggestions
    
    async def handle_error(
        self, 
        error: Exception, 
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[FallbackMode]:
        """
        Handle an error with automatic fallback strategy.
        
        Args:
            error: Exception to handle.
            context: Additional context information.
            
        Returns:
            Applied fallback mode, or None if no fallback was applied.
        """
        # Analyze error
        error_info = self.analyze_error(error, context)
        
        # Find applicable fallback strategy
        strategies = self._fallback_strategies.get(error_info.category, [])
        
        for strategy in strategies:
            if strategy.should_apply(error_info):
                # Apply fallback strategy
                fallback_mode = await self._apply_fallback_strategy(strategy, error_info)
                
                if fallback_mode:
                    self.logger.info(
                        f"Applied fallback strategy: {fallback_mode.value} for error {error_info.error_id}"
                    )
                    
                    # Notify recovery callbacks
                    for callback in self._recovery_callbacks:
                        try:
                            callback(error_info, fallback_mode)
                        except Exception as callback_error:
                            self.logger.error(f"Recovery callback error: {callback_error}")
                    
                    return fallback_mode
        
        self.logger.warning(f"No applicable fallback strategy found for error {error_info.error_id}")
        return None
    
    async def _apply_fallback_strategy(
        self, 
        strategy: FallbackStrategy, 
        error_info: ErrorInfo
    ) -> Optional[FallbackMode]:
        """
        Apply a specific fallback strategy.
        
        Args:
            strategy: Fallback strategy to apply.
            error_info: Error information.
            
        Returns:
            Applied fallback mode, or None if strategy failed.
        """
        try:
            if strategy.mode == FallbackMode.RETRY:
                if strategy.can_retry():
                    delay = strategy.calculate_delay()
                    
                    if delay > 0:
                        self.logger.info(f"Retrying in {delay:.1f} seconds (attempt {strategy.retry_count + 1}/{strategy.max_retries})")
                        await asyncio.sleep(delay)
                    
                    strategy.retry_count += 1
                    strategy.last_attempt = datetime.utcnow()
                    
                    return FallbackMode.RETRY
                else:
                    self.logger.warning("Maximum retry attempts reached, trying next strategy")
                    return None
            
            elif strategy.mode == FallbackMode.MOCK:
                self._fallback_active = True
                self._current_fallback_mode = FallbackMode.MOCK
                
                self.logger.info("Activating mock mode fallback")
                return FallbackMode.MOCK
            
            elif strategy.mode == FallbackMode.DEGRADED:
                self._fallback_active = True
                self._current_fallback_mode = FallbackMode.DEGRADED
                
                self.logger.info("Activating degraded mode fallback")
                return FallbackMode.DEGRADED
            
            elif strategy.mode == FallbackMode.OFFLINE:
                self._fallback_active = True
                self._current_fallback_mode = FallbackMode.OFFLINE
                
                self.logger.warning("Activating offline mode fallback")
                return FallbackMode.OFFLINE
            
            return None
        
        except Exception as e:
            self.logger.error(f"Failed to apply fallback strategy {strategy.mode.value}: {e}")
            return None
    
    def add_recovery_callback(self, callback: Callable[[ErrorInfo, FallbackMode], None]) -> None:
        """
        Add a callback to be notified when recovery strategies are applied.
        
        Args:
            callback: Function to call with error info and fallback mode.
        """
        self._recovery_callbacks.append(callback)
        self.logger.debug("Recovery callback added")
    
    def remove_recovery_callback(self, callback: Callable[[ErrorInfo, FallbackMode], None]) -> None:
        """
        Remove a recovery callback.
        
        Args:
            callback: Callback function to remove.
        """
        if callback in self._recovery_callbacks:
            self._recovery_callbacks.remove(callback)
            self.logger.debug("Recovery callback removed")
    
    def reset_fallback(self) -> None:
        """Reset fallback state to normal operation."""
        self._fallback_active = False
        self._current_fallback_mode = None
        
        # Reset all strategy states
        for strategies in self._fallback_strategies.values():
            for strategy in strategies:
                strategy.reset()
        
        self.logger.info("Fallback state reset to normal operation")
    
    def get_error_summary(self) -> Dict[str, Any]:
        """
        Get summary of recent errors and patterns.
        
        Returns:
            Dictionary with error summary information.
        """
        recent_errors = [e for e in self._error_history if 
                        (datetime.utcnow() - e.timestamp) < timedelta(hours=1)]
        
        category_counts = {}
        severity_counts = {}
        
        for error in recent_errors:
            category_counts[error.category.value] = category_counts.get(error.category.value, 0) + 1
            severity_counts[error.severity.value] = severity_counts.get(error.severity.value, 0) + 1
        
        return {
            "total_errors": len(self._error_history),
            "recent_errors": len(recent_errors),
            "error_patterns": dict(self._error_patterns),
            "category_distribution": category_counts,
            "severity_distribution": severity_counts,
            "fallback_active": self._fallback_active,
            "current_fallback_mode": self._current_fallback_mode.value if self._current_fallback_mode else None,
            "last_error": self._error_history[-1].to_dict() if self._error_history else None
        }
    
    def get_diagnostic_info(self) -> Dict[str, Any]:
        """
        Get comprehensive diagnostic information for troubleshooting.
        
        Returns:
            Dictionary with diagnostic information.
        """
        return {
            "error_handler_status": {
                "fallback_active": self._fallback_active,
                "current_mode": self._current_fallback_mode.value if self._current_fallback_mode else None,
                "total_errors": len(self._error_history),
                "recovery_callbacks": len(self._recovery_callbacks)
            },
            "error_summary": self.get_error_summary(),
            "fallback_strategies": {
                category.value: [
                    {
                        "mode": strategy.mode.value,
                        "max_retries": strategy.max_retries,
                        "retry_count": strategy.retry_count,
                        "active": strategy.active
                    }
                    for strategy in strategies
                ]
                for category, strategies in self._fallback_strategies.items()
            },
            "recent_errors": [
                error.to_dict() for error in self._error_history[-5:]
            ] if self._error_history else []
        }
    
    def get_performance_metrics(self) -> List[PerformanceMetrics]:
        """Get performance metrics for error handling operations."""
        return self.metrics.copy()
    
    def clear_metrics(self) -> None:
        """Clear stored performance metrics."""
        self.metrics.clear()
        self.logger.debug("Error handler metrics cleared")
    
    def clear_error_history(self) -> None:
        """Clear error history (useful for testing or reset)."""
        self._error_history.clear()
        self._error_patterns.clear()
        self.logger.info("Error history cleared")
    
    @property
    def is_fallback_active(self) -> bool:
        """Check if any fallback mode is currently active."""
        return self._fallback_active
    
    @property
    def current_fallback_mode(self) -> Optional[FallbackMode]:
        """Get current active fallback mode."""
        return self._current_fallback_mode