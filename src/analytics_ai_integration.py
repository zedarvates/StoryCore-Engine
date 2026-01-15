"""
Analytics AI Integration - Non-blocking AI metrics tracking and monitoring.

This module provides event-driven, non-blocking integration between AI Enhancement
operations and the Analytics Dashboard. Uses async queues, timeouts, and circuit
breakers to prevent blocking and infinite loops.

Key Design Principles:
- Event-driven architecture (no polling loops)
- Async queues with size limits (prevents memory overflow)
- Explicit timeouts on all operations (prevents hanging)
- Circuit breakers for fault isolation
- Batch processing for efficiency
"""

import asyncio
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from enum import Enum
from collections import defaultdict, deque
import time
import json

try:
    from .circuit_breaker import CircuitBreaker, CircuitBreakerConfig
except ImportError:
    from circuit_breaker import CircuitBreaker, CircuitBreakerConfig


class AIMetricType(Enum):
    """Types of AI-specific metrics."""
    PROCESSING_TIME = "processing_time"
    QUALITY_SCORE = "quality_score"
    MODEL_PERFORMANCE = "model_performance"
    RESOURCE_USAGE = "resource_usage"
    CACHE_PERFORMANCE = "cache_performance"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"


class AIOperationType(Enum):
    """Types of AI operations tracked."""
    STYLE_TRANSFER = "style_transfer"
    SUPER_RESOLUTION = "super_resolution"
    INTERPOLATION = "interpolation"
    QUALITY_OPTIMIZATION = "quality_optimization"
    MODEL_LOADING = "model_loading"
    CACHE_OPERATION = "cache_operation"


@dataclass
class AIMetricEvent:
    """Event representing an AI metric measurement."""
    timestamp: datetime
    operation_type: AIOperationType
    metric_type: AIMetricType
    value: float
    unit: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'timestamp': self.timestamp.isoformat(),
            'operation_type': self.operation_type.value,
            'metric_type': self.metric_type.value,
            'value': self.value,
            'unit': self.unit,
            'metadata': self.metadata
        }


@dataclass
class AIPerformanceSnapshot:
    """Snapshot of AI system performance at a point in time."""
    timestamp: datetime
    total_operations: int
    successful_operations: int
    failed_operations: int
    average_processing_time_ms: float
    average_quality_score: float
    cache_hit_rate: float
    gpu_utilization_percent: float
    active_models: int
    queue_depth: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'timestamp': self.timestamp.isoformat(),
            'total_operations': self.total_operations,
            'successful_operations': self.successful_operations,
            'failed_operations': self.failed_operations,
            'success_rate': self.successful_operations / max(self.total_operations, 1),
            'average_processing_time_ms': self.average_processing_time_ms,
            'average_quality_score': self.average_quality_score,
            'cache_hit_rate': self.cache_hit_rate,
            'gpu_utilization_percent': self.gpu_utilization_percent,
            'active_models': self.active_models,
            'queue_depth': self.queue_depth
        }


@dataclass
class ModelPerformanceMetrics:
    """Performance metrics for a specific AI model."""
    model_id: str
    model_type: str
    total_inferences: int
    average_inference_time_ms: float
    average_quality_score: float
    error_count: int
    last_used: datetime
    memory_usage_mb: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'model_id': self.model_id,
            'model_type': self.model_type,
            'total_inferences': self.total_inferences,
            'average_inference_time_ms': self.average_inference_time_ms,
            'average_quality_score': self.average_quality_score,
            'error_count': self.error_count,
            'error_rate': self.error_count / max(self.total_inferences, 1),
            'last_used': self.last_used.isoformat(),
            'memory_usage_mb': self.memory_usage_mb
        }


@dataclass
class AnalyticsConfig:
    """Configuration for analytics integration."""
    # Queue settings (prevents unbounded growth)
    max_queue_size: int = 1000
    batch_size: int = 50
    batch_timeout_seconds: float = 5.0
    
    # Processing settings (prevents hanging)
    max_processing_time_seconds: float = 10.0
    metric_retention_hours: int = 24
    snapshot_interval_seconds: float = 60.0
    
    # Circuit breaker settings
    enable_circuit_breaker: bool = True
    failure_threshold: int = 5
    recovery_timeout_seconds: float = 30.0
    
    # Feature flags
    enable_real_time_metrics: bool = True
    enable_model_tracking: bool = True
    enable_resource_monitoring: bool = True
    enable_bottleneck_detection: bool = True


class AnalyticsAIIntegration:
    """
    Non-blocking AI Analytics Integration.
    
    Provides event-driven integration between AI Enhancement operations and
    Analytics Dashboard without blocking or infinite loops.
    
    Architecture:
    - Async event queue with size limit (no unbounded growth)
    - Batch processing with timeout (no infinite waiting)
    - Circuit breaker protection (fault isolation)
    - Explicit timeouts on all operations (no hanging)
    - Periodic snapshots instead of continuous polling
    """
    
    def __init__(self, config: AnalyticsConfig, analytics_dashboard=None):
        """Initialize analytics integration."""
        self.config = config
        self.analytics_dashboard = analytics_dashboard
        self.logger = logging.getLogger(__name__)
        
        # Event queue with size limit (prevents memory overflow)
        self.event_queue: asyncio.Queue = asyncio.Queue(maxsize=config.max_queue_size)
        
        # In-memory metric storage (with size limits)
        self.recent_metrics: Dict[AIMetricType, deque] = defaultdict(
            lambda: deque(maxlen=100)  # Fixed size, auto-evicts old data
        )
        
        # Model performance tracking
        self.model_metrics: Dict[str, ModelPerformanceMetrics] = {}
        
        # Performance counters
        self.counters = {
            'total_events': 0,
            'processed_events': 0,
            'dropped_events': 0,
            'batch_count': 0,
            'errors': 0
        }
        
        # Circuit breaker for fault tolerance
        if config.enable_circuit_breaker:
            cb_config = CircuitBreakerConfig(
                failure_threshold=config.failure_threshold,
                recovery_timeout=config.recovery_timeout_seconds,
                timeout=config.max_processing_time_seconds
            )
            self.circuit_breaker = CircuitBreaker(cb_config)
        else:
            self.circuit_breaker = None
        
        # Background tasks (will be started/stopped explicitly)
        self.background_tasks: List[asyncio.Task] = []
        self.is_running = False
        
        # Last snapshot time
        self.last_snapshot_time = datetime.now()
        
        self.logger.info("Analytics AI Integration initialized (non-blocking mode)")
    
    async def start(self):
        """Start background processing tasks."""
        if self.is_running:
            self.logger.warning("Analytics integration already running")
            return
        
        self.is_running = True
        
        # Start batch processor
        batch_task = asyncio.create_task(self._batch_processor())
        self.background_tasks.append(batch_task)
        
        # Start snapshot generator (periodic, not continuous)
        if self.config.enable_real_time_metrics:
            snapshot_task = asyncio.create_task(self._snapshot_generator())
            self.background_tasks.append(snapshot_task)
        
        self.logger.info("Analytics integration started")
    
    async def stop(self, timeout: float = 5.0):
        """Stop background processing with timeout."""
        if not self.is_running:
            return
        
        self.is_running = False
        
        # Cancel all background tasks with timeout
        try:
            for task in self.background_tasks:
                task.cancel()
            
            # Wait for cancellation with timeout
            await asyncio.wait_for(
                asyncio.gather(*self.background_tasks, return_exceptions=True),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            self.logger.warning(f"Background tasks did not stop within {timeout}s")
        except Exception as e:
            self.logger.error(f"Error stopping background tasks: {e}")
        finally:
            self.background_tasks.clear()
        
        self.logger.info("Analytics integration stopped")
    
    async def record_ai_metric(self, event: AIMetricEvent, timeout: float = 1.0):
        """
        Record an AI metric event (non-blocking).
        
        Args:
            event: Metric event to record
            timeout: Maximum time to wait for queue space
        """
        try:
            # Try to add to queue with timeout (prevents blocking)
            await asyncio.wait_for(
                self.event_queue.put(event),
                timeout=timeout
            )
            self.counters['total_events'] += 1
            
        except asyncio.TimeoutError:
            # Queue is full, drop event (prevents blocking)
            self.counters['dropped_events'] += 1
            self.logger.warning(f"Dropped metric event (queue full): {event.metric_type.value}")
        except Exception as e:
            self.counters['errors'] += 1
            self.logger.error(f"Error recording metric: {e}")
    
    async def record_operation_metrics(self,
                                      operation_type: AIOperationType,
                                      processing_time_ms: float,
                                      quality_score: float,
                                      success: bool,
                                      metadata: Optional[Dict[str, Any]] = None):
        """Record metrics for a completed AI operation."""
        timestamp = datetime.now()
        metadata = metadata or {}
        
        # Create metric events
        events = [
            AIMetricEvent(
                timestamp=timestamp,
                operation_type=operation_type,
                metric_type=AIMetricType.PROCESSING_TIME,
                value=processing_time_ms,
                unit="ms",
                metadata=metadata
            ),
            AIMetricEvent(
                timestamp=timestamp,
                operation_type=operation_type,
                metric_type=AIMetricType.QUALITY_SCORE,
                value=quality_score,
                unit="score",
                metadata=metadata
            )
        ]
        
        # Record all events (non-blocking)
        for event in events:
            await self.record_ai_metric(event, timeout=0.5)
    
    async def record_model_performance(self,
                                      model_id: str,
                                      model_type: str,
                                      inference_time_ms: float,
                                      quality_score: float,
                                      memory_usage_mb: float,
                                      success: bool):
        """Record performance metrics for a specific model."""
        if not self.config.enable_model_tracking:
            return
        
        # Update or create model metrics
        if model_id not in self.model_metrics:
            self.model_metrics[model_id] = ModelPerformanceMetrics(
                model_id=model_id,
                model_type=model_type,
                total_inferences=0,
                average_inference_time_ms=0.0,
                average_quality_score=0.0,
                error_count=0,
                last_used=datetime.now(),
                memory_usage_mb=memory_usage_mb
            )
        
        metrics = self.model_metrics[model_id]
        
        # Update metrics (running average)
        n = metrics.total_inferences
        metrics.total_inferences += 1
        metrics.average_inference_time_ms = (
            (metrics.average_inference_time_ms * n + inference_time_ms) / (n + 1)
        )
        metrics.average_quality_score = (
            (metrics.average_quality_score * n + quality_score) / (n + 1)
        )
        if not success:
            metrics.error_count += 1
        metrics.last_used = datetime.now()
        metrics.memory_usage_mb = memory_usage_mb
        
        # Record event
        event = AIMetricEvent(
            timestamp=datetime.now(),
            operation_type=AIOperationType.MODEL_LOADING,
            metric_type=AIMetricType.MODEL_PERFORMANCE,
            value=inference_time_ms,
            unit="ms",
            metadata={
                'model_id': model_id,
                'model_type': model_type,
                'quality_score': quality_score,
                'memory_usage_mb': memory_usage_mb,
                'success': success
            }
        )
        await self.record_ai_metric(event, timeout=0.5)
    
    async def record_resource_usage(self,
                                   gpu_utilization: float,
                                   gpu_memory_used_mb: float,
                                   cpu_utilization: float):
        """Record resource utilization metrics."""
        if not self.config.enable_resource_monitoring:
            return
        
        event = AIMetricEvent(
            timestamp=datetime.now(),
            operation_type=AIOperationType.CACHE_OPERATION,
            metric_type=AIMetricType.RESOURCE_USAGE,
            value=gpu_utilization,
            unit="percent",
            metadata={
                'gpu_memory_used_mb': gpu_memory_used_mb,
                'cpu_utilization': cpu_utilization
            }
        )
        await self.record_ai_metric(event, timeout=0.5)
    
    async def _batch_processor(self):
        """
        Process events in batches (non-blocking).
        
        Uses timeout to prevent infinite waiting.
        """
        while self.is_running:
            try:
                batch = []
                batch_start = time.time()
                
                # Collect batch with timeout (prevents infinite waiting)
                while len(batch) < self.config.batch_size:
                    elapsed = time.time() - batch_start
                    remaining_timeout = self.config.batch_timeout_seconds - elapsed
                    
                    if remaining_timeout <= 0:
                        break  # Timeout reached, process what we have
                    
                    try:
                        event = await asyncio.wait_for(
                            self.event_queue.get(),
                            timeout=remaining_timeout
                        )
                        batch.append(event)
                    except asyncio.TimeoutError:
                        break  # Timeout, process current batch
                
                # Process batch if not empty
                if batch:
                    await self._process_batch(batch)
                    self.counters['batch_count'] += 1
                    self.counters['processed_events'] += len(batch)
                
                # Small delay to prevent tight loop
                await asyncio.sleep(0.1)
                
            except asyncio.CancelledError:
                self.logger.info("Batch processor cancelled")
                break
            except Exception as e:
                self.logger.error(f"Error in batch processor: {e}")
                self.counters['errors'] += 1
                await asyncio.sleep(1.0)  # Back off on error
    
    async def _process_batch(self, batch: List[AIMetricEvent]):
        """Process a batch of metric events."""
        try:
            # Use circuit breaker if enabled
            if self.circuit_breaker:
                await self.circuit_breaker.call(
                    lambda: self._process_batch_internal(batch)
                )
            else:
                await self._process_batch_internal(batch)
                
        except Exception as e:
            self.logger.error(f"Batch processing failed: {e}")
            self.counters['errors'] += 1
    
    async def _process_batch_internal(self, batch: List[AIMetricEvent]):
        """Internal batch processing logic."""
        # Store in recent metrics (with size limit)
        for event in batch:
            self.recent_metrics[event.metric_type].append(event)
        
        # Forward to analytics dashboard if available
        if self.analytics_dashboard:
            try:
                # Convert to dashboard format and send
                for event in batch:
                    await self._forward_to_dashboard(event)
            except Exception as e:
                self.logger.error(f"Error forwarding to dashboard: {e}")
    
    async def _forward_to_dashboard(self, event: AIMetricEvent):
        """Forward metric event to analytics dashboard."""
        # This would integrate with the actual analytics dashboard
        # For now, just log
        pass
    
    async def _snapshot_generator(self):
        """
        Generate periodic performance snapshots (non-blocking).
        
        Uses fixed intervals instead of continuous polling.
        """
        while self.is_running:
            try:
                # Wait for next snapshot interval
                await asyncio.sleep(self.config.snapshot_interval_seconds)
                
                # Generate snapshot
                snapshot = await self.get_performance_snapshot()
                
                # Store snapshot
                self.last_snapshot_time = datetime.now()
                
                self.logger.debug(f"Generated performance snapshot: {snapshot.total_operations} ops")
                
            except asyncio.CancelledError:
                self.logger.info("Snapshot generator cancelled")
                break
            except Exception as e:
                self.logger.error(f"Error generating snapshot: {e}")
                await asyncio.sleep(5.0)  # Back off on error
    
    async def get_performance_snapshot(self) -> AIPerformanceSnapshot:
        """Get current performance snapshot."""
        # Calculate metrics from recent data
        processing_times = []
        quality_scores = []
        
        for event in self.recent_metrics[AIMetricType.PROCESSING_TIME]:
            processing_times.append(event.value)
        
        for event in self.recent_metrics[AIMetricType.QUALITY_SCORE]:
            quality_scores.append(event.value)
        
        avg_processing_time = (
            sum(processing_times) / len(processing_times)
            if processing_times else 0.0
        )
        
        avg_quality_score = (
            sum(quality_scores) / len(quality_scores)
            if quality_scores else 0.0
        )
        
        # Calculate cache hit rate
        cache_events = list(self.recent_metrics[AIMetricType.CACHE_PERFORMANCE])
        cache_hits = sum(1 for e in cache_events if e.metadata.get('cache_hit', False))
        cache_hit_rate = cache_hits / len(cache_events) if cache_events else 0.0
        
        return AIPerformanceSnapshot(
            timestamp=datetime.now(),
            total_operations=self.counters['processed_events'],
            successful_operations=self.counters['processed_events'] - self.counters['errors'],
            failed_operations=self.counters['errors'],
            average_processing_time_ms=avg_processing_time,
            average_quality_score=avg_quality_score,
            cache_hit_rate=cache_hit_rate,
            gpu_utilization_percent=0.0,  # Would be populated from resource events
            active_models=len(self.model_metrics),
            queue_depth=self.event_queue.qsize()
        )
    
    def get_model_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for all tracked models."""
        if not self.config.enable_model_tracking:
            return {}
        
        return {
            model_id: metrics.to_dict()
            for model_id, metrics in self.model_metrics.items()
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get integration statistics."""
        return {
            'counters': self.counters.copy(),
            'queue_size': self.event_queue.qsize(),
            'queue_capacity': self.config.max_queue_size,
            'queue_utilization': self.event_queue.qsize() / self.config.max_queue_size,
            'is_running': self.is_running,
            'tracked_models': len(self.model_metrics),
            'last_snapshot': self.last_snapshot_time.isoformat(),
            'circuit_breaker_state': (
                self.circuit_breaker.state.value
                if self.circuit_breaker else 'disabled'
            )
        }
    
    async def detect_bottlenecks(self) -> List[Dict[str, Any]]:
        """
        Detect performance bottlenecks in AI operations.
        
        Returns list of detected bottlenecks with recommendations.
        """
        if not self.config.enable_bottleneck_detection:
            return []
        
        bottlenecks = []
        
        # Check queue utilization
        queue_util = self.event_queue.qsize() / self.config.max_queue_size
        if queue_util > 0.8:
            bottlenecks.append({
                'type': 'queue_congestion',
                'severity': 'high' if queue_util > 0.95 else 'medium',
                'description': f'Event queue is {queue_util*100:.1f}% full',
                'recommendation': 'Increase batch size or processing frequency'
            })
        
        # Check dropped events
        if self.counters['dropped_events'] > 0:
            drop_rate = self.counters['dropped_events'] / max(self.counters['total_events'], 1)
            if drop_rate > 0.05:
                bottlenecks.append({
                    'type': 'event_loss',
                    'severity': 'high' if drop_rate > 0.1 else 'medium',
                    'description': f'{drop_rate*100:.1f}% of events are being dropped',
                    'recommendation': 'Increase queue size or reduce metric frequency'
                })
        
        # Check model performance
        for model_id, metrics in self.model_metrics.items():
            error_rate = metrics.error_count / max(metrics.total_inferences, 1)
            if error_rate > 0.1:
                bottlenecks.append({
                    'type': 'model_errors',
                    'severity': 'high' if error_rate > 0.2 else 'medium',
                    'description': f'Model {model_id} has {error_rate*100:.1f}% error rate',
                    'recommendation': 'Check model configuration or input validation',
                    'model_id': model_id
                })
            
            if metrics.average_inference_time_ms > 5000:
                bottlenecks.append({
                    'type': 'slow_model',
                    'severity': 'medium',
                    'description': f'Model {model_id} averaging {metrics.average_inference_time_ms:.0f}ms per inference',
                    'recommendation': 'Consider model optimization or GPU acceleration',
                    'model_id': model_id
                })
        
        return bottlenecks
    
    async def generate_optimization_recommendations(self) -> List[Dict[str, Any]]:
        """Generate optimization recommendations based on collected metrics."""
        recommendations = []
        
        # Get current snapshot
        snapshot = await self.get_performance_snapshot()
        
        # Check processing time
        if snapshot.average_processing_time_ms > 3000:
            recommendations.append({
                'category': 'performance',
                'priority': 'high',
                'recommendation': 'Average processing time is high',
                'suggestion': 'Enable GPU acceleration or reduce quality settings',
                'current_value': snapshot.average_processing_time_ms,
                'target_value': 1000.0
            })
        
        # Check cache hit rate
        if snapshot.cache_hit_rate < 0.3:
            recommendations.append({
                'category': 'caching',
                'priority': 'medium',
                'recommendation': 'Low cache hit rate detected',
                'suggestion': 'Increase cache size or adjust cache TTL',
                'current_value': snapshot.cache_hit_rate,
                'target_value': 0.5
            })
        
        # Check error rate
        error_rate = snapshot.failed_operations / max(snapshot.total_operations, 1)
        if error_rate > 0.05:
            recommendations.append({
                'category': 'reliability',
                'priority': 'high',
                'recommendation': 'High error rate detected',
                'suggestion': 'Review error logs and check model configurations',
                'current_value': error_rate,
                'target_value': 0.01
            })
        
        return recommendations


# Factory function
def create_analytics_integration(
    config: Optional[AnalyticsConfig] = None,
    analytics_dashboard=None
) -> AnalyticsAIIntegration:
    """Create analytics integration with default or custom configuration."""
    if config is None:
        config = AnalyticsConfig()
    
    return AnalyticsAIIntegration(config, analytics_dashboard)
