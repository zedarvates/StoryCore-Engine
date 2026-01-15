"""
Performance Optimizer for AI Enhancement System

This module provides comprehensive performance optimization for AI processing,
including GPU utilization optimization, intelligent batching, dynamic quality
adjustment, and automatic performance monitoring.

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import time
import logging
from typing import Dict, List, Optional, Tuple, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import statistics
from collections import deque
import threading


logger = logging.getLogger(__name__)


class OptimizationStrategy(Enum):
    """Performance optimization strategies"""
    SPEED = "speed"  # Prioritize processing speed
    QUALITY = "quality"  # Prioritize output quality
    BALANCED = "balanced"  # Balance speed and quality
    ADAPTIVE = "adaptive"  # Automatically adjust based on system load


class PerformanceLevel(Enum):
    """System performance levels"""
    EXCELLENT = "excellent"  # > 90% of target performance
    GOOD = "good"  # 70-90% of target performance
    ACCEPTABLE = "acceptable"  # 50-70% of target performance
    POOR = "poor"  # < 50% of target performance


@dataclass
class PerformanceMetrics:
    """Performance metrics for monitoring"""
    processing_time: float = 0.0
    throughput: float = 0.0  # frames per second
    gpu_utilization: float = 0.0  # percentage
    memory_usage: float = 0.0  # MB
    batch_size: int = 1
    quality_score: float = 0.0
    timestamp: float = field(default_factory=time.time)


@dataclass
class OptimizationConfig:
    """Configuration for performance optimization"""
    strategy: OptimizationStrategy = OptimizationStrategy.BALANCED
    target_fps: float = 30.0
    max_batch_size: int = 16
    min_batch_size: int = 1
    quality_threshold: float = 0.7
    gpu_utilization_target: float = 0.85
    memory_limit_mb: float = 4096.0
    adaptive_adjustment_interval: float = 5.0  # seconds
    history_size: int = 100


class PerformanceOptimizer:
    """
    Optimizes AI processing performance through intelligent batching,
    dynamic quality adjustment, and resource monitoring.
    """
    
    def __init__(self, config: Optional[OptimizationConfig] = None):
        """
        Initialize performance optimizer.
        
        Args:
            config: Optimization configuration
        """
        self.config = config or OptimizationConfig()
        self.metrics_history: deque = deque(maxlen=self.config.history_size)
        self.current_batch_size = self.config.min_batch_size
        self.current_quality_level = 1.0
        self.lock = threading.Lock()
        
        logger.info(f"Performance optimizer initialized with strategy: {self.config.strategy.value}")
    
    def optimize_batch_size(
        self,
        num_items: int,
        item_complexity: float = 1.0
    ) -> int:
        """
        Calculate optimal batch size based on system performance and item complexity.
        
        Args:
            num_items: Number of items to process
            item_complexity: Complexity factor (0.0-1.0, higher = more complex)
        
        Returns:
            Optimal batch size
        """
        with self.lock:
            # Get recent performance metrics
            if len(self.metrics_history) > 0:
                recent_metrics = list(self.metrics_history)[-10:]
                avg_gpu_util = statistics.mean([m.gpu_utilization for m in recent_metrics])
                avg_memory = statistics.mean([m.memory_usage for m in recent_metrics])
            else:
                avg_gpu_util = 0.5
                avg_memory = 1024.0
            
            # Adjust batch size based on strategy
            if self.config.strategy == OptimizationStrategy.SPEED:
                # Maximize batch size for speed
                base_batch_size = self.config.max_batch_size
            elif self.config.strategy == OptimizationStrategy.QUALITY:
                # Use smaller batches for quality
                base_batch_size = self.config.min_batch_size
            elif self.config.strategy == OptimizationStrategy.BALANCED:
                # Balance between speed and quality
                base_batch_size = (self.config.max_batch_size + self.config.min_batch_size) // 2
            else:  # ADAPTIVE
                # Adjust based on current performance
                if avg_gpu_util < 0.6:
                    # GPU underutilized, increase batch size
                    base_batch_size = min(
                        self.current_batch_size + 2,
                        self.config.max_batch_size
                    )
                elif avg_gpu_util > 0.9:
                    # GPU overutilized, decrease batch size
                    base_batch_size = max(
                        self.current_batch_size - 1,
                        self.config.min_batch_size
                    )
                else:
                    # GPU utilization good, keep current batch size
                    base_batch_size = self.current_batch_size
            
            # Adjust for item complexity
            complexity_factor = 1.0 - (item_complexity * 0.5)
            adjusted_batch_size = int(base_batch_size * complexity_factor)
            
            # Adjust for memory constraints
            memory_factor = 1.0 - (avg_memory / self.config.memory_limit_mb)
            memory_adjusted_size = int(adjusted_batch_size * max(0.5, memory_factor))
            
            # Ensure within bounds
            optimal_batch_size = max(
                self.config.min_batch_size,
                min(memory_adjusted_size, self.config.max_batch_size, num_items)
            )
            
            self.current_batch_size = optimal_batch_size
            
            logger.debug(
                f"Optimized batch size: {optimal_batch_size} "
                f"(GPU util: {avg_gpu_util:.2f}, Memory: {avg_memory:.0f}MB, "
                f"Complexity: {item_complexity:.2f})"
            )
            
            return optimal_batch_size
    
    def adjust_quality_level(
        self,
        current_performance: float,
        target_performance: float
    ) -> float:
        """
        Dynamically adjust quality level based on performance.
        
        Args:
            current_performance: Current processing speed (fps)
            target_performance: Target processing speed (fps)
        
        Returns:
            Adjusted quality level (0.0-1.0)
        """
        with self.lock:
            # Validate performance values
            if current_performance <= 0:
                logger.error(f"Invalid current_performance value: {current_performance}")
                return self.current_quality_level
            
            if target_performance <= 0:
                logger.error(f"Invalid target_performance value: {target_performance}")
                return self.current_quality_level
            
            performance_ratio = current_performance / target_performance
            
            if self.config.strategy == OptimizationStrategy.QUALITY:
                # Always use maximum quality
                quality_level = 1.0
            elif self.config.strategy == OptimizationStrategy.SPEED:
                # Adjust quality to meet speed target
                if performance_ratio < 0.8:
                    quality_level = max(self.config.quality_threshold, self.current_quality_level - 0.1)
                elif performance_ratio > 1.2:
                    quality_level = min(1.0, self.current_quality_level + 0.05)
                else:
                    quality_level = self.current_quality_level
            elif self.config.strategy == OptimizationStrategy.BALANCED:
                # Balance quality and speed
                if performance_ratio < 0.9:
                    quality_level = max(0.8, self.current_quality_level - 0.05)
                elif performance_ratio > 1.1:
                    quality_level = min(1.0, self.current_quality_level + 0.05)
                else:
                    quality_level = self.current_quality_level
            else:  # ADAPTIVE
                # Dynamically adjust based on performance with improved logic
                if performance_ratio < 0.7:
                    quality_level = max(self.config.quality_threshold, self.current_quality_level - 0.15)
                elif performance_ratio < 0.8:
                    quality_level = max(self.config.quality_threshold, self.current_quality_level - 0.1)
                elif performance_ratio < 0.9:
                    quality_level = max(self.config.quality_threshold, self.current_quality_level - 0.05)
                elif performance_ratio > 1.3:
                    quality_level = min(1.0, self.current_quality_level + 0.15)
                elif performance_ratio > 1.2:
                    quality_level = min(1.0, self.current_quality_level + 0.1)
                elif performance_ratio > 1.1:
                    quality_level = min(1.0, self.current_quality_level + 0.05)
                else:
                    quality_level = self.current_quality_level
            
            self.current_quality_level = quality_level
            
            logger.debug(
                f"Adjusted quality level: {quality_level:.2f} "
                f"(Performance ratio: {performance_ratio:.2f})"
            )
            
            return quality_level
    
    def record_metrics(self, metrics: PerformanceMetrics) -> None:
        """
        Record performance metrics for analysis.
        
        Args:
            metrics: Performance metrics to record
        """
        with self.lock:
            self.metrics_history.append(metrics)
            logger.debug(
                f"Recorded metrics: {metrics.processing_time:.3f}s, "
                f"{metrics.throughput:.1f} fps, "
                f"GPU: {metrics.gpu_utilization:.1%}, "
                f"Memory: {metrics.memory_usage:.0f}MB"
            )
    
    def get_performance_level(self) -> PerformanceLevel:
        """
        Assess current performance level.
        
        Returns:
            Current performance level
        """
        with self.lock:
            if len(self.metrics_history) < 5:
                return PerformanceLevel.ACCEPTABLE
            
            recent_metrics = list(self.metrics_history)[-10:]
            avg_throughput = statistics.mean([m.throughput for m in recent_metrics])
            
            performance_ratio = avg_throughput / self.config.target_fps
            
            if performance_ratio >= 0.9:
                return PerformanceLevel.EXCELLENT
            elif performance_ratio >= 0.7:
                return PerformanceLevel.GOOD
            elif performance_ratio >= 0.5:
                return PerformanceLevel.ACCEPTABLE
            else:
                return PerformanceLevel.POOR
    
    def get_optimization_recommendations(self) -> List[str]:
        """
        Generate optimization recommendations based on performance history.
        
        Returns:
            List of optimization recommendations
        """
        recommendations = []
        
        with self.lock:
            if len(self.metrics_history) < 10:
                return ["Insufficient data for recommendations"]
            
            recent_metrics = list(self.metrics_history)[-20:]
            
            # Analyze GPU utilization
            avg_gpu_util = statistics.mean([m.gpu_utilization for m in recent_metrics])
            if avg_gpu_util < 0.5:
                recommendations.append(
                    "GPU underutilized: Consider increasing batch size or using more complex models"
                )
            elif avg_gpu_util > 0.95:
                recommendations.append(
                    "GPU overutilized: Consider reducing batch size or model complexity"
                )
            
            # Analyze memory usage
            avg_memory = statistics.mean([m.memory_usage for m in recent_metrics])
            if avg_memory > self.config.memory_limit_mb * 0.9:
                recommendations.append(
                    "Memory usage high: Consider reducing batch size or enabling model quantization"
                )
            
            # Analyze throughput
            avg_throughput = statistics.mean([m.throughput for m in recent_metrics])
            if avg_throughput < self.config.target_fps * 0.7:
                recommendations.append(
                    f"Throughput below target ({avg_throughput:.1f} vs {self.config.target_fps:.1f} fps): "
                    "Consider reducing quality level or using faster models"
                )
            
            # Analyze quality
            avg_quality = statistics.mean([m.quality_score for m in recent_metrics])
            if avg_quality < self.config.quality_threshold:
                recommendations.append(
                    f"Quality below threshold ({avg_quality:.2f} vs {self.config.quality_threshold:.2f}): "
                    "Consider increasing quality level or using better models"
                )
            
            # Analyze variability
            throughput_stdev = statistics.stdev([m.throughput for m in recent_metrics])
            if throughput_stdev > avg_throughput * 0.3:
                recommendations.append(
                    "High performance variability detected: Consider stabilizing system load"
                )
            
            # Analyze batch size effectiveness
            if len(recent_metrics) > 5:
                batch_sizes = [m.batch_size for m in recent_metrics]
                if len(set(batch_sizes)) == 1:
                    recommendations.append(
                        "Batch size is constant: Consider dynamic batch sizing based on system load"
                    )
            
            if not recommendations:
                recommendations.append("Performance is optimal, no recommendations")
        
        return recommendations
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive performance statistics.
        
        Returns:
            Dictionary of performance statistics
        """
        with self.lock:
            if len(self.metrics_history) == 0:
                return {
                    "status": "no_data",
                    "message": "No performance data available"
                }
            
            recent_metrics = list(self.metrics_history)
            
            return {
                "status": "ok",
                "performance_level": self.get_performance_level().value,
                "current_batch_size": self.current_batch_size,
                "current_quality_level": self.current_quality_level,
                "metrics": {
                    "processing_time": {
                        "mean": statistics.mean([m.processing_time for m in recent_metrics]),
                        "median": statistics.median([m.processing_time for m in recent_metrics]),
                        "stdev": statistics.stdev([m.processing_time for m in recent_metrics]) if len(recent_metrics) > 1 else 0.0
                    },
                    "throughput": {
                        "mean": statistics.mean([m.throughput for m in recent_metrics]),
                        "median": statistics.median([m.throughput for m in recent_metrics]),
                        "min": min([m.throughput for m in recent_metrics]),
                        "max": max([m.throughput for m in recent_metrics])
                    },
                    "gpu_utilization": {
                        "mean": statistics.mean([m.gpu_utilization for m in recent_metrics]),
                        "min": min([m.gpu_utilization for m in recent_metrics]),
                        "max": max([m.gpu_utilization for m in recent_metrics])
                    },
                    "memory_usage": {
                        "mean": statistics.mean([m.memory_usage for m in recent_metrics]),
                        "min": min([m.memory_usage for m in recent_metrics]),
                        "max": max([m.memory_usage for m in recent_metrics])
                    },
                    "quality_score": {
                        "mean": statistics.mean([m.quality_score for m in recent_metrics]),
                        "min": min([m.quality_score for m in recent_metrics]),
                        "max": max([m.quality_score for m in recent_metrics])
                    }
                },
                "recommendations": self.get_optimization_recommendations(),
                "total_samples": len(recent_metrics)
            }
    
    def create_batches(
        self,
        items: List[Any],
        complexity_fn: Optional[Callable[[Any], float]] = None
    ) -> List[List[Any]]:
        """
        Create optimized batches from items.
        
        Args:
            items: Items to batch
            complexity_fn: Optional function to calculate item complexity
        
        Returns:
            List of batches
        """
        if not items:
            logger.warning("No items provided for batching")
            return []
        
        # Calculate average complexity
        if complexity_fn:
            complexities = [complexity_fn(item) for item in items]
            avg_complexity = statistics.mean(complexities)
        else:
            avg_complexity = 0.5
        
        # Get optimal batch size
        batch_size = self.optimize_batch_size(len(items), avg_complexity)
        
        # Check GPU memory constraints
        if hasattr(self, 'gpu_memory_limit') and batch_size * avg_complexity > self.gpu_memory_limit:
            logger.warning(f"Batch size {batch_size} exceeds GPU memory limit. Reducing batch size.")
            batch_size = int(self.gpu_memory_limit / avg_complexity)
        
        # Create batches
        batches = []
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            batches.append(batch)
        
        logger.info(
            f"Created {len(batches)} batches from {len(items)} items "
            f"(batch size: {batch_size}, complexity: {avg_complexity:.2f})"
        )
        
        return batches
    
    def reset(self) -> None:
        """Reset optimizer state"""
        with self.lock:
            self.metrics_history.clear()
            self.current_batch_size = self.config.min_batch_size
            self.current_quality_level = 1.0
            logger.info("Performance optimizer reset")


class AutomaticPerformanceMonitor:
    """
    Automatically monitors and optimizes performance in the background.
    """
    
    def __init__(
        self,
        optimizer: PerformanceOptimizer,
        check_interval: float = 5.0
    ):
        """
        Initialize automatic performance monitor.
        
        Args:
            optimizer: Performance optimizer to use
            check_interval: Interval between checks (seconds)
        """
        self.optimizer = optimizer
        self.check_interval = check_interval
        self.running = False
        self.thread: Optional[threading.Thread] = None
        
        logger.info(f"Automatic performance monitor initialized (interval: {check_interval}s)")
    
    def start(self) -> None:
        """Start automatic monitoring"""
        if self.running:
            logger.warning("Performance monitor already running")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()
        logger.info("Performance monitor started")
    
    def stop(self) -> None:
        """Stop automatic monitoring"""
        if not self.running:
            return
        
        self.running = False
        if self.thread:
            self.thread.join(timeout=self.check_interval + 1.0)
        logger.info("Performance monitor stopped")
    
    def _monitor_loop(self) -> None:
        """Main monitoring loop"""
        while self.running:
            try:
                # Get current performance level
                perf_level = self.optimizer.get_performance_level()
                
                # Log performance status
                if perf_level == PerformanceLevel.POOR:
                    logger.warning(f"Performance level: {perf_level.value}")
                    recommendations = self.optimizer.get_optimization_recommendations()
                    for rec in recommendations:
                        logger.warning(f"Recommendation: {rec}")
                else:
                    logger.debug(f"Performance level: {perf_level.value}")
                
                # Sleep until next check
                time.sleep(self.check_interval)
            
            except Exception as e:
                logger.error(f"Error in performance monitor: {e}")
                time.sleep(self.check_interval)
