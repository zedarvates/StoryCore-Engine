"""
LLM Usage Tracker for StoryCore-Engine

This module provides comprehensive token usage tracking for LLM API calls.
It includes collection, aggregation, cost calculation, and persistent storage.

Features:
- UsageCollector: Intercepts LLM responses and extracts token data
- UsageAggregator: Aggregates usage by request/session/project/user/time
- CostCalculator: Calculates costs based on provider pricing tables
- UsageStore: SQLite storage for usage data

Requirements: Priority 1 - Token Tracking System
"""

import json
import logging
import os
import sqlite3
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from threading import Lock
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class LLMFeature(str, Enum):
    """Feature types for LLM usage categorization"""
    STORY_GENERATION = "story_generation"
    CHARACTER_DIALOGUE = "character_dialogue"
    SHOT_DESCRIPTION = "shot_description"
    WORLD_BUILDING = "world_building"
    CHAT = "chat"
    NAME_GENERRATION = "name_generation"
    LOCATION_LOGIC = "location_logic"
    GENERAL = "general"


@dataclass
class UsageEntry:
    """
    Single usage record for an LLM API call.
    
    Attributes:
        request_id: Unique identifier for the request
        timestamp: When the request was made
        provider: LLM provider (openai, anthropic, ollama)
        model: Model name used
        prompt_tokens: Number of tokens in the prompt
        completion_tokens: Number of tokens in the completion
        total_tokens: Total tokens used
        estimated_cost: Estimated cost in USD
        user_id: ID of the user making the request
        session_id: Optional session ID for conversation tracking
        project_id: Optional project ID for story/video tracking
        feature: Feature category for the request
        latency_ms: Response latency in milliseconds
        cached: Whether the response was served from cache
        success: Whether the request succeeded
        error_message: Error message if request failed
    """
    request_id: str
    timestamp: datetime
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost: float
    user_id: str
    session_id: Optional[str] = None
    project_id: Optional[str] = None
    feature: str = LLMFeature.GENERAL.value
    latency_ms: int = 0
    cached: bool = False
    success: bool = True
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UsageEntry':
        """Create UsageEntry from dictionary"""
        if isinstance(data.get('timestamp'), str):
            data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)


@dataclass
class UsageSummary:
    """
    Aggregated usage summary for a time period.
    
    Attributes:
        total_requests: Total number of requests
        total_tokens: Total tokens used
        total_cost: Total estimated cost in USD
        by_provider: Token counts by provider
        by_model: Token counts by model
        by_feature: Token counts by feature
        period_start: Start of the summary period
        period_end: End of the summary period
        cache_hit_rate: Percentage of requests served from cache
        average_latency_ms: Average response latency
        error_rate: Percentage of failed requests
    """
    total_requests: int = 0
    total_tokens: int = 0
    total_cost: float = 0.0
    by_provider: Dict[str, int] = field(default_factory=dict)
    by_model: Dict[str, int] = field(default_factory=dict)
    by_feature: Dict[str, int] = field(default_factory=dict)
    period_start: datetime = field(default_factory=datetime.utcnow)
    period_end: datetime = field(default_factory=datetime.utcnow)
    cache_hit_rate: float = 0.0
    average_latency_ms: float = 0.0
    error_rate: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data['period_start'] = self.period_start.isoformat()
        data['period_end'] = self.period_end.isoformat()
        return data


@dataclass
class UsageContext:
    """
    Context information for a usage collection.
    
    This provides metadata about the request for proper attribution.
    """
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "anonymous"
    session_id: Optional[str] = None
    project_id: Optional[str] = None
    feature: str = LLMFeature.GENERAL.value


class CostCalculator:
    """
    Calculates estimated costs for LLM usage based on provider pricing.
    
    Pricing is based on per-1K-token rates for input (prompt) and output (completion).
    """
    
    # Pricing tables (USD per 1K tokens)
    # Updated: February 2026
    PRICING = {
        "openai": {
            "gpt-4": {"input": 0.03, "output": 0.06},
            "gpt-4-turbo": {"input": 0.01, "output": 0.03},
            "gpt-4o": {"input": 0.005, "output": 0.015},
            "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
            "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
            "gpt-3.5-turbo-16k": {"input": 0.003, "output": 0.004},
        },
        "anthropic": {
            "claude-3-opus": {"input": 0.015, "output": 0.075},
            "claude-3-sonnet": {"input": 0.003, "output": 0.015},
            "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
            "claude-3-haiku-20240307": {"input": 0.00025, "output": 0.00125},
            "claude-3-5-sonnet": {"input": 0.003, "output": 0.015},
            "claude-v2": {"input": 0.008, "output": 0.024},
        },
        "ollama": {
            # Ollama is free (local), but we track tokens
            "default": {"input": 0.0, "output": 0.0}
        },
        "local": {
            "default": {"input": 0.0, "output": 0.0}
        }
    }
    
    @classmethod
    def calculate_cost(
        cls,
        provider: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int
    ) -> float:
        """
        Calculate the estimated cost for a usage event.
        
        Args:
            provider: LLM provider name
            model: Model name
            prompt_tokens: Number of input tokens
            completion_tokens: Number of output tokens
        
        Returns:
            Estimated cost in USD
        """
        provider_pricing = cls.PRICING.get(provider.lower(), {})
        
        # Find model pricing (exact match or fallback to default)
        model_pricing = provider_pricing.get(model)
        if model_pricing is None:
            # Try to find a partial match
            for model_key in provider_pricing:
                if model_key.lower() in model.lower() or model.lower() in model_key.lower():
                    model_pricing = provider_pricing[model_key]
                    break
        
        # Fallback to default pricing
        if model_pricing is None:
            model_pricing = provider_pricing.get("default", {"input": 0.0, "output": 0.0})
        
        # Calculate cost
        input_cost = (prompt_tokens / 1000) * model_pricing["input"]
        output_cost = (completion_tokens / 1000) * model_pricing["output"]
        
        return round(input_cost + output_cost, 6)
    
    @classmethod
    def estimate_request_cost(
        cls,
        provider: str,
        model: str,
        estimated_prompt_tokens: int,
        max_completion_tokens: int
    ) -> Dict[str, float]:
        """
        Estimate the cost for a request before making it.
        
        Args:
            provider: LLM provider name
            model: Model name
            estimated_prompt_tokens: Estimated number of prompt tokens
            max_completion_tokens: Maximum completion tokens requested
        
        Returns:
            Dictionary with min_cost, max_cost, and estimated_cost
        """
        # Minimum cost (0 completion tokens)
        min_cost = cls.calculate_cost(provider, model, estimated_prompt_tokens, 0)
        
        # Maximum cost (full completion)
        max_cost = cls.calculate_cost(provider, model, estimated_prompt_tokens, max_completion_tokens)
        
        # Estimated cost (assume 50% of max completion)
        estimated_cost = cls.calculate_cost(
            provider, model, estimated_prompt_tokens, max_completion_tokens // 2
        )
        
        return {
            "min_cost": min_cost,
            "max_cost": max_cost,
            "estimated_cost": estimated_cost,
            "currency": "USD"
        }
    
    @classmethod
    def get_pricing_table(cls) -> Dict[str, Dict[str, Dict[str, float]]]:
        """Get the full pricing table"""
        return cls.PRICING.copy()


class UsageStore:
    """
    SQLite-based persistent storage for usage data.
    
    Provides efficient storage and retrieval of usage records with
    automatic data lifecycle management (hot/warm/cold data).
    """
    
    DEFAULT_DB_PATH = "data/llm_usage.db"
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize the usage store.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path or self.DEFAULT_DB_PATH
        self.lock = Lock()
        
        # Ensure data directory exists
        os.makedirs(os.path.dirname(self.db_path) if os.path.dirname(self.db_path) else ".", exist_ok=True)
        
        # Initialize database schema
        self._init_db()
        
        logger.info(f"UsageStore initialized with database: {self.db_path}")
    
    def _init_db(self) -> None:
        """Initialize the database schema"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Main usage records table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS usage_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    request_id TEXT UNIQUE NOT NULL,
                    timestamp TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    prompt_tokens INTEGER NOT NULL,
                    completion_tokens INTEGER NOT NULL,
                    total_tokens INTEGER NOT NULL,
                    estimated_cost REAL NOT NULL,
                    user_id TEXT NOT NULL,
                    session_id TEXT,
                    project_id TEXT,
                    feature TEXT NOT NULL,
                    latency_ms INTEGER DEFAULT 0,
                    cached INTEGER DEFAULT 0,
                    success INTEGER DEFAULT 1,
                    error_message TEXT
                )
            """)
            
            # Create indexes for common queries
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON usage_records(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_id ON usage_records(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_project_id ON usage_records(project_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_provider ON usage_records(provider)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_feature ON usage_records(feature)")
            
            conn.commit()
    
    def store(self, entry: UsageEntry) -> None:
        """
        Store a usage entry in the database.
        
        Args:
            entry: UsageEntry to store
        """
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                try:
                    cursor.execute("""
                        INSERT INTO usage_records (
                            request_id, timestamp, provider, model,
                            prompt_tokens, completion_tokens, total_tokens,
                            estimated_cost, user_id, session_id, project_id,
                            feature, latency_ms, cached, success, error_message
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        entry.request_id,
                        entry.timestamp.isoformat(),
                        entry.provider,
                        entry.model,
                        entry.prompt_tokens,
                        entry.completion_tokens,
                        entry.total_tokens,
                        entry.estimated_cost,
                        entry.user_id,
                        entry.session_id,
                        entry.project_id,
                        entry.feature,
                        entry.latency_ms,
                        1 if entry.cached else 0,
                        1 if entry.success else 0,
                        entry.error_message
                    ))
                    conn.commit()
                    
                    logger.debug(f"Stored usage entry: {entry.request_id}")
                    
                except sqlite3.IntegrityError:
                    logger.warning(f"Usage entry already exists: {entry.request_id}")
    
    def get_entries(
        self,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        session_id: Optional[str] = None,
        provider: Optional[str] = None,
        feature: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[UsageEntry]:
        """
        Retrieve usage entries with optional filtering.
        
        Args:
            user_id: Filter by user ID
            project_id: Filter by project ID
            session_id: Filter by session ID
            provider: Filter by provider
            feature: Filter by feature
            start_time: Filter by start time
            end_time: Filter by end time
            limit: Maximum number of entries to return
            offset: Offset for pagination
        
        Returns:
            List of matching UsageEntry objects
        """
        query = "SELECT * FROM usage_records WHERE 1=1"
        params = []
        
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        if project_id:
            query += " AND project_id = ?"
            params.append(project_id)
        if session_id:
            query += " AND session_id = ?"
            params.append(session_id)
        if provider:
            query += " AND provider = ?"
            params.append(provider)
        if feature:
            query += " AND feature = ?"
            params.append(feature)
        if start_time:
            query += " AND timestamp >= ?"
            params.append(start_time.isoformat())
        if end_time:
            query += " AND timestamp <= ?"
            params.append(end_time.isoformat())
        
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(query, params)
            
            entries = []
            for row in cursor.fetchall():
                entries.append(UsageEntry(
                    request_id=row['request_id'],
                    timestamp=datetime.fromisoformat(row['timestamp']),
                    provider=row['provider'],
                    model=row['model'],
                    prompt_tokens=row['prompt_tokens'],
                    completion_tokens=row['completion_tokens'],
                    total_tokens=row['total_tokens'],
                    estimated_cost=row['estimated_cost'],
                    user_id=row['user_id'],
                    session_id=row['session_id'],
                    project_id=row['project_id'],
                    feature=row['feature'],
                    latency_ms=row['latency_ms'],
                    cached=bool(row['cached']),
                    success=bool(row['success']),
                    error_message=row['error_message']
                ))
            
            return entries
    
    def get_summary(
        self,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        session_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> UsageSummary:
        """
        Get aggregated usage summary.
        
        Args:
            user_id: Filter by user ID
            project_id: Filter by project ID
            session_id: Filter by session ID
            start_time: Filter by start time
            end_time: Filter by end time
        
        Returns:
            UsageSummary with aggregated statistics
        """
        where_clauses = []
        params = []
        
        if user_id:
            where_clauses.append("user_id = ?")
            params.append(user_id)
        if project_id:
            where_clauses.append("project_id = ?")
            params.append(project_id)
        if session_id:
            where_clauses.append("session_id = ?")
            params.append(session_id)
        if start_time:
            where_clauses.append("timestamp >= ?")
            params.append(start_time.isoformat())
        if end_time:
            where_clauses.append("timestamp <= ?")
            params.append(end_time.isoformat())
        
        where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get overall stats
            cursor.execute(f"""
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(total_tokens) as total_tokens,
                    SUM(estimated_cost) as total_cost,
                    SUM(cached) as cached_count,
                    AVG(latency_ms) as avg_latency,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as error_count,
                    MIN(timestamp) as period_start,
                    MAX(timestamp) as period_end
                FROM usage_records
                WHERE {where_clause}
            """, params)
            
            row = cursor.fetchone()
            
            total_requests = row['total_requests'] or 0
            cached_count = row['cached_count'] or 0
            error_count = row['error_count'] or 0
            
            summary = UsageSummary(
                total_requests=total_requests,
                total_tokens=row['total_tokens'] or 0,
                total_cost=row['total_cost'] or 0.0,
                period_start=datetime.fromisoformat(row['period_start']) if row['period_start'] else datetime.utcnow(),
                period_end=datetime.fromisoformat(row['period_end']) if row['period_end'] else datetime.utcnow(),
                cache_hit_rate=(cached_count / total_requests * 100) if total_requests > 0 else 0.0,
                average_latency_ms=row['avg_latency'] or 0.0,
                error_rate=(error_count / total_requests * 100) if total_requests > 0 else 0.0
            )
            
            # Get by_provider breakdown
            cursor.execute(f"""
                SELECT provider, SUM(total_tokens) as tokens
                FROM usage_records
                WHERE {where_clause}
                GROUP BY provider
            """, params)
            
            for row in cursor.fetchall():
                summary.by_provider[row['provider']] = row['tokens']
            
            # Get by_model breakdown
            cursor.execute(f"""
                SELECT model, SUM(total_tokens) as tokens
                FROM usage_records
                WHERE {where_clause}
                GROUP BY model
            """, params)
            
            for row in cursor.fetchall():
                summary.by_model[row['model']] = row['tokens']
            
            # Get by_feature breakdown
            cursor.execute(f"""
                SELECT feature, SUM(total_tokens) as tokens
                FROM usage_records
                WHERE {where_clause}
                GROUP BY feature
            """, params)
            
            for row in cursor.fetchall():
                summary.by_feature[row['feature']] = row['tokens']
            
            return summary
    
    def get_user_usage(self, user_id: str, period_days: int = 30) -> UsageSummary:
        """
        Get usage summary for a specific user.
        
        Args:
            user_id: User ID to get usage for
            period_days: Number of days to look back
        
        Returns:
            UsageSummary for the user
        """
        start_time = datetime.utcnow() - timedelta(days=period_days)
        return self.get_summary(user_id=user_id, start_time=start_time)
    
    def get_project_usage(self, project_id: str) -> UsageSummary:
        """
        Get usage summary for a specific project.
        
        Args:
            project_id: Project ID to get usage for
        
        Returns:
            UsageSummary for the project
        """
        return self.get_summary(project_id=project_id)
    
    def cleanup_old_records(self, days_to_keep: int = 90) -> int:
        """
        Remove records older than the specified number of days.
        
        Args:
            days_to_keep: Number of days to keep records for
        
        Returns:
            Number of records removed
        """
        cutoff = datetime.utcnow() - timedelta(days=days_to_keep)
        
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "DELETE FROM usage_records WHERE timestamp < ?",
                    (cutoff.isoformat(),)
                )
                removed = cursor.rowcount
                conn.commit()
                
                if removed > 0:
                    logger.info(f"Cleaned up {removed} old usage records (older than {days_to_keep} days)")
                
                return removed


class UsageAggregator:
    """
    Aggregates usage data across different dimensions.
    
    Provides real-time aggregation for monitoring and analytics.
    """
    
    def __init__(self, store: UsageStore):
        """
        Initialize the aggregator.
        
        Args:
            store: UsageStore instance for data access
        """
        self.store = store
        self._cache: Dict[str, Tuple[datetime, Any]] = {}
        self._cache_ttl = 60  # seconds
    
    def aggregate_by_user(self, user_id: str, period: str = "day") -> UsageSummary:
        """
        Aggregate usage for a user over a time period.
        
        Args:
            user_id: User ID to aggregate for
            period: Time period ('hour', 'day', 'week', 'month')
        
        Returns:
            UsageSummary for the period
        """
        period_map = {
            "hour": timedelta(hours=1),
            "day": timedelta(days=1),
            "week": timedelta(weeks=1),
            "month": timedelta(days=30)
        }
        
        delta = period_map.get(period, timedelta(days=1))
        start_time = datetime.utcnow() - delta
        
        return self.store.get_summary(user_id=user_id, start_time=start_time)
    
    def aggregate_by_project(self, project_id: str) -> UsageSummary:
        """
        Aggregate usage for a project.
        
        Args:
            project_id: Project ID to aggregate for
        
        Returns:
            UsageSummary for the project
        """
        return self.store.get_summary(project_id=project_id)
    
    def aggregate_by_session(self, session_id: str) -> UsageSummary:
        """
        Aggregate usage for a session.
        
        Args:
            session_id: Session ID to aggregate for
        
        Returns:
            UsageSummary for the session
        """
        return self.store.get_summary(session_id=session_id)
    
    def aggregate_by_feature(
        self,
        feature: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> UsageSummary:
        """
        Aggregate usage for a feature.
        
        Args:
            feature: Feature to aggregate for
            start_time: Optional start time
            end_time: Optional end time
        
        Returns:
            UsageSummary for the feature
        """
        return self.store.get_summary(feature=feature, start_time=start_time, end_time=end_time)
    
    def get_top_users(self, limit: int = 10, period_days: int = 30) -> List[Dict[str, Any]]:
        """
        Get top users by token usage.
        
        Args:
            limit: Maximum number of users to return
            period_days: Number of days to look back
        
        Returns:
            List of user usage statistics
        """
        start_time = datetime.utcnow() - timedelta(days=period_days)
        
        with sqlite3.connect(self.store.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    user_id,
                    COUNT(*) as request_count,
                    SUM(total_tokens) as total_tokens,
                    SUM(estimated_cost) as total_cost
                FROM usage_records
                WHERE timestamp >= ?
                GROUP BY user_id
                ORDER BY total_tokens DESC
                LIMIT ?
            """, (start_time.isoformat(), limit))
            
            return [
                {
                    "user_id": row['user_id'],
                    "request_count": row['request_count'],
                    "total_tokens": row['total_tokens'],
                    "total_cost": row['total_cost']
                }
                for row in cursor.fetchall()
            ]
    
    def get_usage_trend(
        self,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Get daily usage trend.
        
        Args:
            user_id: Optional user ID filter
            project_id: Optional project ID filter
            days: Number of days to include
        
        Returns:
            List of daily usage statistics
        """
        start_time = datetime.utcnow() - timedelta(days=days)
        
        where_clauses = ["timestamp >= ?"]
        params = [start_time.isoformat()]
        
        if user_id:
            where_clauses.append("user_id = ?")
            params.append(user_id)
        if project_id:
            where_clauses.append("project_id = ?")
            params.append(project_id)
        
        where_clause = " AND ".join(where_clauses)
        
        with sqlite3.connect(self.store.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute(f"""
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as request_count,
                    SUM(total_tokens) as total_tokens,
                    SUM(estimated_cost) as total_cost
                FROM usage_records
                WHERE {where_clause}
                GROUP BY DATE(timestamp)
                ORDER BY date
            """, params)
            
            return [
                {
                    "date": row['date'],
                    "request_count": row['request_count'],
                    "total_tokens": row['total_tokens'],
                    "total_cost": row['total_cost']
                }
                for row in cursor.fetchall()
            ]


class UsageCollector:
    """
    Collects and records LLM usage data.
    
    This is the main entry point for tracking usage. It intercepts
    LLM responses and records them to the usage store.
    """
    
    def __init__(self, store: Optional[UsageStore] = None):
        """
        Initialize the collector.
        
        Args:
            store: Optional UsageStore instance (creates new one if not provided)
        """
        self.store = store or UsageStore()
        self.aggregator = UsageAggregator(self.store)
        self.cost_calculator = CostCalculator()
    
    def collect(
        self,
        response: Dict[str, Any],
        context: UsageContext,
        latency_ms: int = 0
    ) -> UsageEntry:
        """
        Collect usage data from an LLM response.
        
        Args:
            response: LLM response dictionary containing:
                - model: Model name
                - provider: Provider name
                - usage: Dict with prompt_tokens, completion_tokens, total_tokens
                - cached: Whether response was cached
            context: UsageContext with request metadata
            latency_ms: Response latency in milliseconds
        
        Returns:
            UsageEntry that was recorded
        """
        usage = response.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)
        
        provider = response.get("provider", "unknown")
        model = response.get("model", "unknown")
        
        # Calculate cost
        estimated_cost = self.cost_calculator.calculate_cost(
            provider, model, prompt_tokens, completion_tokens
        )
        
        # Create entry
        entry = UsageEntry(
            request_id=context.request_id,
            timestamp=datetime.utcnow(),
            provider=provider,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            estimated_cost=estimated_cost,
            user_id=context.user_id,
            session_id=context.session_id,
            project_id=context.project_id,
            feature=context.feature,
            latency_ms=latency_ms,
            cached=response.get("cached", False),
            success=True
        )
        
        # Store the entry
        self.store.store(entry)
        
        logger.info(
            f"Collected usage: {context.request_id} - "
            f"{provider}/{model} - {total_tokens} tokens - ${estimated_cost:.6f}"
        )
        
        return entry
    
    def collect_error(
        self,
        error_message: str,
        context: UsageContext,
        provider: str = "unknown",
        model: str = "unknown",
        prompt_tokens: int = 0,
        latency_ms: int = 0
    ) -> UsageEntry:
        """
        Record a failed LLM request.
        
        Args:
            error_message: Error message from the failure
            context: UsageContext with request metadata
            provider: Provider that was attempted
            model: Model that was attempted
            prompt_tokens: Tokens that were sent (if known)
            latency_ms: Time until failure
        
        Returns:
            UsageEntry recording the failure
        """
        entry = UsageEntry(
            request_id=context.request_id,
            timestamp=datetime.utcnow(),
            provider=provider,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=0,
            total_tokens=prompt_tokens,
            estimated_cost=0.0,
            user_id=context.user_id,
            session_id=context.session_id,
            project_id=context.project_id,
            feature=context.feature,
            latency_ms=latency_ms,
            cached=False,
            success=False,
            error_message=error_message
        )
        
        self.store.store(entry)
        
        logger.warning(
            f"Recorded failed request: {context.request_id} - {error_message}"
        )
        
        return entry
    
    def estimate_cost(
        self,
        provider: str,
        model: str,
        prompt: str,
        max_tokens: int
    ) -> Dict[str, float]:
        """
        Estimate the cost for a request before making it.
        
        Args:
            provider: LLM provider name
            model: Model name
            prompt: The prompt text (for token estimation)
            max_tokens: Maximum completion tokens requested
        
        Returns:
            Cost estimate dictionary
        """
        # Estimate prompt tokens (rough approximation: 4 chars per token)
        estimated_prompt_tokens = len(prompt) // 4
        
        return self.cost_calculator.estimate_request_cost(
            provider, model, estimated_prompt_tokens, max_tokens
        )
    
    def get_usage_summary(self, user_id: str, period_days: int = 30) -> UsageSummary:
        """
        Get usage summary for a user.
        
        Args:
            user_id: User ID to get usage for
            period_days: Number of days to look back
        
        Returns:
            UsageSummary for the user
        """
        return self.store.get_user_usage(user_id, period_days)
    
    def get_project_usage(self, project_id: str) -> UsageSummary:
        """
        Get usage summary for a project.
        
        Args:
            project_id: Project ID to get usage for
        
        Returns:
            UsageSummary for the project
        """
        return self.store.get_project_usage(project_id)


# Global collector instance
_collector: Optional[UsageCollector] = None


def get_usage_collector() -> UsageCollector:
    """
    Get the global usage collector instance.
    
    Returns:
        The global UsageCollector instance
    """
    global _collector
    if _collector is None:
        _collector = UsageCollector()
    return _collector


def initialize_usage_collector(db_path: Optional[str] = None) -> UsageCollector:
    """
    Initialize the global usage collector.
    
    Args:
        db_path: Optional path to SQLite database
    
    Returns:
        The initialized UsageCollector instance
    """
    global _collector
    store = UsageStore(db_path)
    _collector = UsageCollector(store)
    return _collector