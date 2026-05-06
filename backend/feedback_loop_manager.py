"""
Feedback Loop Manager for StoryCore-Engine

Provides continuous improvement loop through:
- Automatic metrics collection
- Failure pattern detection
- Model retraining triggers
- Performance dashboard metrics

This module integrates with:
- StoryFeedbackIntegrationService for feedback data
- LLM API for model retraining
- Prometheus for metrics exposition
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict
from enum import Enum

from fastapi import HTTPException, APIRouter

# Import existing feedback service
from backend.feedback_story_integration import (
    StoryFeedback,
    create_story_feedback_service,
)

# Import LLM API for retraining
try:
    from backend.llm_api import LLMAPI

    LLM_API_AVAILABLE = True
except ImportError:
    LLM_API_AVAILABLE = False
    logging.warning("LLM API not available for model retraining")

# Import Prometheus metrics
try:
    from prometheus_client import (
        Counter,
        Histogram,
        Gauge,
        Summary,
        generate_latest,
        CONTENT_TYPE_LATEST,
    )

    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False

    # Create dummy metrics if Prometheus not available
    class Counter:
        def __init__(self, *args, **kwargs):
            pass

        def inc(self, *args, **kwargs):
            pass

    class Histogram:
        def __init__(self, *args, **kwargs):
            pass

        def observe(self, *args, **kwargs):
            pass

    class Gauge:
        def __init__(self, *args, **kwargs):
            pass

        def inc(self, *args, **kwargs):
            pass

        def dec(self, *args, **kwargs):
            pass

        def set(self, *args, **kwargs):
            pass

    class Summary:
        def __init__(self, *args, **kwargs):
            pass

        def observe(self, *args, **kwargs):
            pass


logger = logging.getLogger(__name__)

# =============================================================================
# Enums and Data Models
# =============================================================================


class FailureType(str, Enum):
    """Types of failures detected in story generation"""

    QUALITY = "quality"
    STRUCTURE = "structure"
    CHARACTER = "character"
    PLOT = "plot"
    DIALOGUE = "dialogue"
    CONSISTENCY = "consistency"
    TECHNICAL = "technical"
    UNKNOWN = "unknown"


class RetrainingTrigger(str, Enum):
    """Triggers for model retraining"""

    MANUAL = "manual"
    SCHEDULED = "scheduled"
    THRESHOLD = "threshold"
    PATTERN_DETECTED = "pattern_detected"


class MetricType(str, Enum):
    """Types of metrics collected"""

    SUCCESS = "success"
    FAILURE = "failure"
    LATENCY = "latency"
    QUALITY_SCORE = "quality_score"
    USER_SATISFACTION = "user_satisfaction"
    FAILURE_RATE = "failure_rate"


@dataclass
class FailurePattern:
    """Detected failure pattern"""

    pattern_id: str
    failure_type: FailureType
    frequency: int
    first_occurrence: datetime
    last_occurrence: datetime
    affected_stories: List[str]
    severity: float  # 0.0 to 1.0
    description: str
    suggested_fix: str


@dataclass
class RetrainingEvent:
    """Model retraining event"""

    event_id: str
    trigger: RetrainingTrigger
    start_time: datetime
    end_time: Optional[datetime]
    status: str  # pending, running, completed, failed
    metrics_before: Dict[str, float]
    metrics_after: Optional[Dict[str, float]]
    details: str


# =============================================================================
# Prometheus Metrics
# =============================================================================

# Feedback collection metrics
FEEDBACK_COLLECTED = Counter(
    "storycore_feedback_collected_total",
    "Total number of feedback entries collected",
    ["feedback_type", "rating"],
)

FEEDBACK_PROCESSING_TIME = Histogram(
    "storycore_feedback_processing_seconds",
    "Time spent processing feedback",
    ["operation"],
)

# Pattern analysis metrics
PATTERNS_DETECTED = Counter(
    "storycore_patterns_detected_total",
    "Total number of failure patterns detected",
    ["pattern_type", "severity"],
)

PATTERN_ACTIVE = Gauge(
    "storycore_patterns_active",
    "Number of currently active failure patterns",
    ["pattern_type"],
)

# Model retraining metrics
RETRAINING_TRIGGERS = Counter(
    "storycore_retraining_triggers_total",
    "Total number of retraining triggers",
    ["trigger_type", "status"],
)

RETRAINING_IN_PROGRESS = Gauge(
    "storycore_retraining_in_progress", "Whether a retraining is currently in progress"
)

RETRAINING_DURATION = Histogram(
    "storycore_retraining_duration_seconds", "Duration of model retraining operations"
)

# Story generation metrics
STORY_GENERATION_TOTAL = Counter(
    "storycore_story_generation_total",
    "Total number of story generations",
    ["status", "genre"],
)

STORY_GENERATION_LATENCY = Histogram(
    "storycore_story_generation_seconds",
    "Time taken for story generation",
    ["genre", "mode"],
)

# Quality metrics
QUALITY_SCORE = Gauge(
    "storycore_quality_score", "Current quality score based on feedback", ["dimension"]
)

USER_SATISFACTION = Gauge(
    "storycore_user_satisfaction", "User satisfaction score (1-5)", ["period"]
)

# System health metrics
FEEDBACK_LOOP_HEALTH = Gauge(
    "storycore_feedback_loop_health",
    "Health status of feedback loop (0=unhealthy, 1=healthy)",
)

# =============================================================================
# FeedbackCollector
# =============================================================================


class FeedbackCollector:
    """
    Collects and structures feedback data from multiple sources.
    Integrates with StoryFeedbackIntegrationService.
    """

    def __init__(self):
        self.feedback_service = create_story_feedback_service()
        self.pending_feedback: List[StoryFeedback] = []
        self.collected_feedback: List[StoryFeedback] = []
        self._collection_buffer_size = 100
        self._last_flush = datetime.now()

    async def collect_feedback(self, feedback: StoryFeedback) -> bool:
        """
        Collect a single feedback entry.

        Args:
            feedback: Structured feedback data

        Returns:
            True if collected successfully
        """
        try:
            # Validate feedback
            if not await self._validate_feedback(feedback):
                logger.warning(f"Invalid feedback: {feedback}")
                return False

            # Add to pending buffer
            self.pending_feedback.append(feedback)

            # Record Prometheus metric
            FEEDBACK_COLLECTED.labels(
                feedback_type=feedback.feedback_type, rating=str(feedback.rating)
            ).inc()

            # Flush if buffer is full
            if len(self.pending_feedback) >= self._collection_buffer_size:
                await self._flush_buffer()

            return True

        except Exception as e:
            logger.error(f"Failed to collect feedback: {e}")
            return False

    async def collect_batch(self, feedbacks: List[StoryFeedback]) -> Tuple[int, int]:
        """
        Collect multiple feedback entries at once.

        Args:
            feedbacks: List of feedback entries

        Returns:
            Tuple of (successful, failed) counts
        """
        success_count = 0
        failed_count = 0

        for feedback in feedbacks:
            if await self.collect_feedback(feedback):
                success_count += 1
            else:
                failed_count += 1

        return success_count, failed_count

    async def get_recent_feedback(self, hours: int = 24) -> List[StoryFeedback]:
        """
        Get recent feedback from the last N hours.

        Args:
            hours: Number of hours to look back

        Returns:
            List of recent feedback entries
        """
        cutoff = datetime.now() - timedelta(hours=hours)

        # Combine pending and collected
        all_feedback = self.pending_feedback + self.collected_feedback

        return [f for f in all_feedback if f.timestamp >= cutoff]

    async def get_feedback_by_type(self, feedback_type: str) -> List[StoryFeedback]:
        """Get all feedback of a specific type."""
        all_feedback = self.pending_feedback + self.collected_feedback
        return [f for f in all_feedback if f.feedback_type == feedback_type]

    async def get_feedback_by_rating(self, rating: int) -> List[StoryFeedback]:
        """Get all feedback with a specific rating."""
        all_feedback = self.pending_feedback + self.collected_feedback
        return [f for f in all_feedback if f.rating == rating]

    async def _validate_feedback(self, feedback: StoryFeedback) -> bool:
        """Validate feedback before collection."""
        # Check required fields
        if not feedback.story_id or not feedback.feedback_type:
            return False

        # Check rating range
        if feedback.rating < 1 or feedback.rating > 5:
            return False

        return True

    async def _flush_buffer(self) -> None:
        """Flush pending feedback to collected storage."""
        if not self.pending_feedback:
            return

        with FEEDBACK_PROCESSING_TIME.labels(operation="flush").time():
            # Move pending to collected
            self.collected_feedback.extend(self.pending_feedback)
            self.pending_feedback.clear()
            self._last_flush = datetime.now()

            logger.info(f"Flushed {len(self.collected_feedback)} feedback entries")


# =============================================================================
# PatternAnalyzer
# =============================================================================


class PatternAnalyzer:
    """
    Analyzes feedback to detect failure patterns.
    Uses statistical analysis and rule-based detection.
    """

    def __init__(self):
        self.detected_patterns: Dict[str, FailurePattern] = {}
        self._min_frequency = 3
        self._severity_threshold = 0.5
        self._pattern_window_hours = 24

    async def analyze_feedback(
        self, feedbacks: List[StoryFeedback]
    ) -> List[FailurePattern]:
        """
        Analyze feedback to detect failure patterns.

        Args:
            feedbacks: List of feedback entries to analyze

        Returns:
            List of detected failure patterns
        """
        patterns = []

        # Group feedback by type
        by_type = defaultdict(list)
        for fb in feedbacks:
            by_type[fb.feedback_type].append(fb)

        # Analyze each type
        for fb_type, type_feedbacks in by_type.items():
            pattern = await self._analyze_type(fb_type, type_feedbacks)
            if pattern:
                patterns.append(pattern)
                self.detected_patterns[pattern.pattern_id] = pattern

                # Record Prometheus metrics
                PATTERNS_DETECTED.labels(
                    pattern_type=pattern.failure_type.value,
                    severity="high"
                    if pattern.severity > 0.7
                    else "medium"
                    if pattern.severity > 0.4
                    else "low",
                ).inc()

        # Update active pattern gauge
        for pattern_type in FailureType:
            count = sum(
                1
                for p in self.detected_patterns.values()
                if p.failure_type == pattern_type
            )
            PATTERN_ACTIVE.labels(pattern_type=pattern_type.value).set(count)

        return patterns

    async def _analyze_type(
        self, fb_type: str, feedbacks: List[StoryFeedback]
    ) -> Optional[FailurePattern]:
        """Analyze feedback of a specific type."""
        if len(feedbacks) < self._min_frequency:
            return None

        # Calculate failure rate
        low_ratings = sum(1 for f in feedbacks if f.rating <= 2)
        failure_rate = low_ratings / len(feedbacks)

        if failure_rate < 0.3:  # Less than 30% failure rate
            return None

        # Calculate severity
        severity = failure_rate

        # Get affected stories
        affected_stories = list(set(f.story_id for f in feedbacks))

        # Generate description and fix
        description = f"Pattern detected in {len(feedbacks)} feedback entries for type '{fb_type}'"
        suggested_fix = self._generate_fix_suggestion(fb_type, feedbacks)

        # Create pattern
        pattern = FailurePattern(
            pattern_id=f"pattern_{fb_type}_{int(time.time())}",
            failure_type=FailureType(fb_type)
            if fb_type in [t.value for t in FailureType]
            else FailureType.UNKNOWN,
            frequency=len(feedbacks),
            first_occurrence=min(f.timestamp for f in feedbacks),
            last_occurrence=max(f.timestamp for f in feedbacks),
            affected_stories=affected_stories,
            severity=severity,
            description=description,
            suggested_fix=suggested_fix,
        )

        return pattern

    def _generate_fix_suggestion(
        self, fb_type: str, feedbacks: List[StoryFeedback]
    ) -> str:
        """Generate fix suggestion based on feedback analysis."""
        # Aggregate suggestions from feedback
        all_suggestions = []
        for f in feedbacks:
            all_suggestions.extend(f.suggestions)

        if all_suggestions:
            # Return most common suggestion
            from collections import Counter

            common = Counter(all_suggestions).most_common(1)
            return common[0][0] if common else f"Review {fb_type} generation logic"

        # Default suggestions by type
        suggestions = {
            "quality": "Improve overall story quality through better prompt engineering",
            "structure": "Review and enhance story structure guidelines",
            "characters": "Add more character development in generation prompts",
            "plot": "Improve plot coherence and pacing",
            "dialogue": "Enhance natural language generation for dialogue",
            "consistency": "Add consistency checks in post-processing",
        }

        return suggestions.get(fb_type, f"Investigate {fb_type} generation process")

    async def get_active_patterns(self) -> List[FailurePattern]:
        """Get all currently active patterns."""
        return list(self.detected_patterns.values())

    async def get_patterns_by_severity(
        self, min_severity: float = 0.0
    ) -> List[FailurePattern]:
        """Get patterns filtered by minimum severity."""
        return [
            p for p in self.detected_patterns.values() if p.severity >= min_severity
        ]

    async def clear_resolved_patterns(self, resolved_ids: List[str]) -> None:
        """Clear patterns that have been resolved."""
        for pid in resolved_ids:
            if pid in self.detected_patterns:
                del self.detected_patterns[pid]


# =============================================================================
# ModelRetrainer
# =============================================================================


class ModelRetrainer:
    """
    Triggers and manages model retraining based on feedback patterns.
    Integrates with LLM API for retraining operations.
    """

    def __init__(self):
        self.llm_api = LLMAPI() if LLM_API_AVAILABLE else None
        self.retraining_events: Dict[str, RetrainingEvent] = {}
        self._auto_retrain_enabled = True
        self._retrain_threshold = 0.7  # Auto-retrain if severity > 0.7
        self._retrain_cooldown_hours = 24

    async def check_and_trigger_retraining(
        self, patterns: List[FailurePattern]
    ) -> Optional[RetrainingEvent]:
        """
        Check if retraining should be triggered based on patterns.

        Args:
            patterns: List of detected failure patterns

        Returns:
            RetrainingEvent if triggered, None otherwise
        """
        if not self._auto_retrain_enabled:
            return None

        # Check if we're in cooldown period
        recent_events = [
            e
            for e in self.retraining_events.values()
            if e.status == "completed"
            and (datetime.now() - e.end_time).total_seconds()
            < self._retrain_cooldown_hours * 3600
        ]

        if recent_events:
            logger.info("Retraining in cooldown period, skipping")
            return None

        # Find high-severity patterns
        high_severity = [p for p in patterns if p.severity >= self._retrain_threshold]

        if not high_severity:
            return None

        # Trigger retraining
        return await self.trigger_retraining(
            trigger=RetrainingTrigger.PATTERN_DETECTED,
            reason=f"High severity patterns detected: {', '.join(p.failure_type.value for p in high_severity)}",
            affected_patterns=[p.pattern_id for p in high_severity],
        )

    async def trigger_retraining(
        self,
        trigger: RetrainingTrigger,
        reason: str = "",
        affected_patterns: Optional[List[str]] = None,
    ) -> RetrainingEvent:
        """
        Trigger a model retraining.

        Args:
            trigger: Type of trigger
            reason: Reason for retraining
            affected_patterns: List of pattern IDs that triggered this

        Returns:
            RetrainingEvent with details
        """
        event_id = f"retrain_{int(time.time())}"

        # Get current metrics before retraining
        metrics_before = await self._collect_current_metrics()

        event = RetrainingEvent(
            event_id=event_id,
            trigger=trigger,
            start_time=datetime.now(),
            end_time=None,
            status="running",
            metrics_before=metrics_before,
            metrics_after=None,
            details=reason,
        )

        self.retraining_events[event_id] = event

        # Update Prometheus
        RETRAINING_IN_PROGRESS.set(1)
        RETRAINING_TRIGGERS.labels(trigger_type=trigger.value, status="started").inc()

        # Start retraining in background
        asyncio.create_task(self._execute_retraining(event, affected_patterns or []))

        return event

    async def _execute_retraining(
        self, event: RetrainingEvent, affected_patterns: List[str]
    ) -> None:
        """Execute the retraining process."""
        try:
            logger.info(f"Starting retraining: {event.event_id}")

            # Simulate retraining (in production, this would call LLM API)
            if self.llm_api:
                # Would call actual retraining endpoint
                logger.info("Calling LLM API for retraining...")
                # await self.llm_api.retrain_model(...)
                pass

            # Simulate retraining time
            await asyncio.sleep(2)

            # Get metrics after retraining
            metrics_after = await self._collect_current_metrics()

            # Update event
            event.end_time = datetime.now()
            event.status = "completed"
            event.metrics_after = metrics_after

            # Calculate duration
            duration = (event.end_time - event.start_time).total_seconds()

            # Update Prometheus
            RETRAINING_IN_PROGRESS.set(0)
            RETRAINING_TRIGGERS.labels(
                trigger_type=event.trigger.value, status="completed"
            ).inc()
            RETRAINING_DURATION.observe(duration)

            logger.info(
                f"Retraining completed: {event.event_id}, duration: {duration}s"
            )

        except Exception as e:
            logger.error(f"Retraining failed: {e}")
            event.status = "failed"
            event.end_time = datetime.now()
            event.details = f"Failed: {str(e)}"

            RETRAINING_IN_PROGRESS.set(0)
            RETRAINING_TRIGGERS.labels(
                trigger_type=event.trigger.value, status="failed"
            ).inc()

    async def _collect_current_metrics(self) -> Dict[str, float]:
        """Collect current system metrics."""
        return {
            "quality_score": 0.0,  # Would fetch from MetricsCollector
            "user_satisfaction": 0.0,
            "failure_rate": 0.0,
            "pattern_count": 0.0,
        }

    async def get_retraining_history(self, days: int = 30) -> List[RetrainingEvent]:
        """Get retraining history."""
        cutoff = datetime.now() - timedelta(days=days)
        return [e for e in self.retraining_events.values() if e.start_time >= cutoff]

    async def get_pending_retrainings(self) -> List[RetrainingEvent]:
        """Get all pending retraining events."""
        return [
            e
            for e in self.retraining_events.values()
            if e.status in ["pending", "running"]
        ]


# =============================================================================
# MetricsCollector
# =============================================================================


class MetricsCollector:
    """
    Collects and exposes performance metrics for the feedback loop.
    Provides Prometheus-compatible metrics and API endpoints.
    """

    def __init__(self):
        self._metrics: Dict[str, float] = {}
        self._metric_history: Dict[str, List[Tuple[datetime, float]]] = defaultdict(
            list
        )
        self._history_size = 1000

    async def record_metric(
        self,
        metric_type: MetricType,
        value: float,
        labels: Optional[Dict[str, str]] = None,
    ) -> None:
        """
        Record a metric value.

        Args:
            metric_type: Type of metric
            value: Metric value
            labels: Optional labels for the metric
        """
        key = f"{metric_type.value}"
        if labels:
            key = f"{key}_{'_'.join(f'{k}={v}' for k, v in labels.items())}"

        self._metrics[key] = value

        # Add to history
        self._metric_history[metric_type.value].append((datetime.now(), value))

        # Trim history if needed
        if len(self._metric_history[metric_type.value]) > self._history_size:
            self._metric_history[metric_type.value] = self._metric_history[
                metric_type.value
            ][-self._history_size :]

        # Update Prometheus gauges
        if metric_type == MetricType.QUALITY_SCORE:
            dimension = labels.get("dimension", "overall") if labels else "overall"
            QUALITY_SCORE.labels(dimension=dimension).set(value)
        elif metric_type == MetricType.USER_SATISFACTION:
            period = labels.get("period", "daily") if labels else "daily"
            USER_SATISFACTION.labels(period=period).set(value)

    async def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all metrics."""
        return {
            "timestamp": datetime.now().isoformat(),
            "metrics": dict(self._metrics),
            "feedback_loop_health": await self._calculate_health(),
        }

    async def get_metric_history(
        self, metric_type: MetricType, hours: int = 24
    ) -> List[Dict[str, Any]]:
        """Get historical data for a metric."""
        cutoff = datetime.now() - timedelta(hours=hours)

        history = self._metric_history.get(metric_type.value, [])

        return [
            {"timestamp": ts.isoformat(), "value": val}
            for ts, val in history
            if ts >= cutoff
        ]

    async def _calculate_health(self) -> float:
        """Calculate overall feedback loop health (0.0 to 1.0)."""
        # Simple health calculation based on recent metrics
        if not self._metrics:
            return 1.0

        # Health based on quality score and user satisfaction
        quality = self._metrics.get(MetricType.QUALITY_SCORE.value, 1.0)
        satisfaction = self._metrics.get(MetricType.USER_SATISFACTION.value, 1.0)

        return (quality + satisfaction) / 2.0

    async def update_health_metric(self) -> None:
        """Update the health gauge."""
        health = await self._calculate_health()
        FEEDBACK_LOOP_HEALTH.set(health)

    def get_prometheus_metrics(self) -> bytes:
        """Generate Prometheus-format metrics."""
        if not PROMETHEUS_AVAILABLE:
            return b"# Prometheus not available"

        return generate_latest()


# =============================================================================
# FeedbackLoopManager (Main Class)
# =============================================================================


class FeedbackLoopManager:
    """
    Main manager for the feedback loop system.
    Coordinates FeedbackCollector, PatternAnalyzer, ModelRetrainer, and MetricsCollector.
    """

    def __init__(self):
        self.feedback_collector = FeedbackCollector()
        self.pattern_analyzer = PatternAnalyzer()
        self.model_retrainer = ModelRetrainer()
        self.metrics_collector = MetricsCollector()

        self._analysis_interval_seconds = 300  # 5 minutes
        self._running = False
        self._analysis_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Start the feedback loop manager."""
        if self._running:
            logger.warning("FeedbackLoopManager already running")
            return

        self._running = True
        self._analysis_task = asyncio.create_task(self._analysis_loop())

        # Update health metric
        await self.metrics_collector.update_health_metric()

        logger.info("FeedbackLoopManager started")

    async def stop(self) -> None:
        """Stop the feedback loop manager."""
        self._running = False

        if self._analysis_task:
            self._analysis_task.cancel()
            try:
                await self._analysis_task
            except asyncio.CancelledError:
                pass

        logger.info("FeedbackLoopManager stopped")

    async def submit_feedback(self, feedback: StoryFeedback) -> bool:
        """
        Submit feedback to the feedback loop.

        Args:
            feedback: Structured feedback data

        Returns:
            True if submitted successfully
        """
        return await self.feedback_collector.collect_feedback(feedback)

    async def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics summary."""
        return await self.metrics_collector.get_metrics_summary()

    async def get_prometheus_metrics(self) -> bytes:
        """Get Prometheus-format metrics."""
        return self.metrics_collector.get_prometheus_metrics()

    async def trigger_manual_retraining(
        self, reason: str = "Manual trigger"
    ) -> RetrainingEvent:
        """
        Manually trigger a model retraining.

        Args:
            reason: Reason for manual retraining

        Returns:
            RetrainingEvent
        """
        return await self.model_retrainer.trigger_retraining(
            trigger=RetrainingTrigger.MANUAL, reason=reason
        )

    async def get_active_patterns(self) -> List[FailurePattern]:
        """Get currently active failure patterns."""
        return await self.pattern_analyzer.get_active_patterns()

    async def get_retraining_history(self, days: int = 30) -> List[RetrainingEvent]:
        """Get retraining history."""
        return await self.model_retrainer.get_retraining_history(days)

    async def _analysis_loop(self) -> None:
        """Background loop for periodic analysis."""
        while self._running:
            try:
                await self._run_analysis()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Analysis loop error: {e}")

            await asyncio.sleep(self._analysis_interval_seconds)

    async def _run_analysis(self) -> None:
        """Run the feedback analysis cycle."""
        # Get recent feedback
        recent_feedback = await self.feedback_collector.get_recent_feedback(hours=1)

        if not recent_feedback:
            return

        # Analyze patterns
        patterns = await self.pattern_analyzer.analyze_feedback(recent_feedback)

        # Check for retraining trigger
        if patterns:
            await self.model_retrainer.check_and_trigger_retraining(patterns)

        # Update metrics
        await self._update_metrics(recent_feedback, patterns)

        # Update health
        await self.metrics_collector.update_health_metric()

    async def _update_metrics(
        self, feedbacks: List[StoryFeedback], patterns: List[FailurePattern]
    ) -> None:
        """Update metrics based on feedback and patterns."""
        if not feedbacks:
            return

        # Calculate quality score
        avg_rating = sum(f.rating for f in feedbacks) / len(feedbacks)
        quality_score = avg_rating / 5.0  # Normalize to 0-1

        await self.metrics_collector.record_metric(
            MetricType.QUALITY_SCORE, quality_score, {"dimension": "overall"}
        )

        # Calculate user satisfaction
        user_satisfaction = avg_rating / 5.0
        await self.metrics_collector.record_metric(
            MetricType.USER_SATISFACTION, user_satisfaction, {"period": "daily"}
        )

        # Record failure rate
        low_ratings = sum(1 for f in feedbacks if f.rating <= 2)
        failure_rate = low_ratings / len(feedbacks)

        await self.metrics_collector.record_metric(MetricType.FAILURE, failure_rate)


# =============================================================================
# API Router
# =============================================================================

feedback_loop_router = APIRouter(prefix="/feedback-loop", tags=["feedback-loop"])

# Global manager instance
_feedback_loop_manager: Optional[FeedbackLoopManager] = None


def get_feedback_loop_manager() -> FeedbackLoopManager:
    """Get or create the global FeedbackLoopManager instance."""
    global _feedback_loop_manager
    if _feedback_loop_manager is None:
        _feedback_loop_manager = FeedbackLoopManager()
    return _feedback_loop_manager


@feedback_loop_router.post("/start")
async def start_feedback_loop():
    """Start the feedback loop manager."""
    manager = get_feedback_loop_manager()
    await manager.start()
    return {"status": "started", "message": "Feedback loop manager started"}


@feedback_loop_router.post("/stop")
async def stop_feedback_loop():
    """Stop the feedback loop manager."""
    manager = get_feedback_loop_manager()
    await manager.stop()
    return {"status": "stopped", "message": "Feedback loop manager stopped"}


@feedback_loop_router.post("/feedback")
async def submit_feedback(feedback: StoryFeedback):
    """
    Submit feedback to the feedback loop.

    Args:
        feedback: Structured feedback data

    Returns:
        Success status
    """
    manager = get_feedback_loop_manager()
    success = await manager.submit_feedback(feedback)

    if success:
        return {"status": "success", "message": "Feedback submitted"}
    else:
        raise HTTPException(status_code=400, detail="Failed to submit feedback")


@feedback_loop_router.get("/metrics")
async def get_metrics():
    """Get current metrics summary."""
    manager = get_feedback_loop_manager()
    return await manager.get_metrics()


@feedback_loop_router.get("/metrics/prometheus")
async def get_prometheus_metrics():
    """Get Prometheus-format metrics."""
    manager = get_feedback_loop_manager()
    metrics = await manager.get_prometheus_metrics()

    from fastapi.responses import Response

    return Response(
        content=metrics,
        media_type=CONTENT_TYPE_LATEST if PROMETHEUS_AVAILABLE else "text/plain",
    )


@feedback_loop_router.get("/patterns")
async def get_active_patterns():
    """Get currently active failure patterns."""
    manager = get_feedback_loop_manager()
    patterns = await manager.get_active_patterns()

    return {
        "patterns": [
            {
                "pattern_id": p.pattern_id,
                "failure_type": p.failure_type.value,
                "frequency": p.frequency,
                "severity": p.severity,
                "description": p.description,
                "suggested_fix": p.suggested_fix,
                "first_occurrence": p.first_occurrence.isoformat(),
                "last_occurrence": p.last_occurrence.isoformat(),
                "affected_stories": p.affected_stories,
            }
            for p in patterns
        ]
    }


@feedback_loop_router.post("/retrain")
async def trigger_retraining(reason: str = "Manual trigger"):
    """Manually trigger model retraining."""
    manager = get_feedback_loop_manager()
    event = await manager.trigger_manual_retraining(reason)

    return {
        "event_id": event.event_id,
        "trigger": event.trigger.value,
        "status": event.status,
        "start_time": event.start_time.isoformat(),
    }


@feedback_loop_router.get("/retrain/history")
async def get_retraining_history(days: int = 30):
    """Get retraining history."""
    manager = get_feedback_loop_manager()
    history = await manager.get_retraining_history(days)

    return {
        "events": [
            {
                "event_id": e.event_id,
                "trigger": e.trigger.value,
                "status": e.status,
                "start_time": e.start_time.isoformat(),
                "end_time": e.end_time.isoformat() if e.end_time else None,
                "details": e.details,
            }
            for e in history
        ]
    }


@feedback_loop_router.get("/health")
async def get_health():
    """Get feedback loop health status."""
    manager = get_feedback_loop_manager()
    metrics = await manager.get_metrics()

    health = metrics.get("feedback_loop_health", 0.0)

    return {
        "healthy": health >= 0.7,
        "health_score": health,
        "timestamp": datetime.now().isoformat(),
    }


# =============================================================================
# Service Factory
# =============================================================================


def create_feedback_loop_manager() -> FeedbackLoopManager:
    """Create an instance of the FeedbackLoopManager."""
    return FeedbackLoopManager()


# =============================================================================
# Integration with existing services
# =============================================================================


async def integrate_with_story_feedback():
    """
    Integrate FeedbackLoopManager with existing StoryFeedbackIntegrationService.
    This allows feedback from both sources to be analyzed together.
    """
    story_feedback_service = create_story_feedback_service()
    manager = get_feedback_loop_manager()

    # Get all feedback from existing service
    await story_feedback_service.get_feedback_analytics()

    # Convert to StoryFeedback format and add to collector
    # This would require a database query to get actual feedback entries

    logger.info("Integrated FeedbackLoopManager with StoryFeedbackIntegrationService")

    return manager
