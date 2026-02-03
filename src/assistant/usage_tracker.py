"""
Usage tracking for StoryCore AI Assistant API.

Tracks request count, data transferred, and operation types per user.
Provides usage statistics API endpoint.
"""

import time
import json
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from pathlib import Path
from collections import defaultdict


@dataclass
class UsageRecord:
    """Single usage record"""
    timestamp: float
    user_id: str
    endpoint: str
    method: str
    status_code: int
    request_size_bytes: int
    response_size_bytes: int
    duration_ms: float
    operation_type: str


@dataclass
class UsageStats:
    """Aggregated usage statistics for a user"""
    user_id: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    total_data_transferred_bytes: int
    total_data_transferred_mb: float
    average_response_time_ms: float
    operation_counts: Dict[str, int]
    endpoint_counts: Dict[str, int]
    first_request_time: Optional[float]
    last_request_time: Optional[float]


class UsageTracker:
    """
    Track API usage per user.
    
    Records request count, data transferred, operation types, and provides
    usage statistics. Can persist data to file or database.
    """
    
    def __init__(self, storage_path: Optional[Path] = None):
        """
        Initialize usage tracker.
        
        Args:
            storage_path: Optional path to persist usage data
        """
        self.storage_path = storage_path
        
        # In-memory storage of usage records per user
        # Key: user_id, Value: list of UsageRecord
        self.usage_records: Dict[str, List[UsageRecord]] = defaultdict(list)
        
        # Load existing data if storage path provided
        if self.storage_path and self.storage_path.exists():
            self._load_from_storage()
    
    def record_request(
        self,
        user_id: str,
        endpoint: str,
        method: str,
        status_code: int,
        request_size_bytes: int,
        response_size_bytes: int,
        duration_ms: float,
        operation_type: str
    ) -> None:
        """
        Record a single API request.
        
        Args:
            user_id: User making the request
            endpoint: API endpoint path
            method: HTTP method (GET, POST, etc.)
            status_code: HTTP status code
            request_size_bytes: Size of request body in bytes
            response_size_bytes: Size of response body in bytes
            duration_ms: Request duration in milliseconds
            operation_type: Type of operation (e.g., "project_generation", "file_read")
        """
        record = UsageRecord(
            timestamp=time.time(),
            user_id=user_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            request_size_bytes=request_size_bytes,
            response_size_bytes=response_size_bytes,
            duration_ms=duration_ms,
            operation_type=operation_type
        )
        
        self.usage_records[user_id].append(record)
        
        # Persist if storage path configured
        if self.storage_path:
            self._save_to_storage()
    
    def get_user_stats(
        self,
        user_id: str,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> UsageStats:
        """
        Get usage statistics for a user.
        
        Args:
            user_id: User ID
            start_time: Optional start timestamp for filtering
            end_time: Optional end timestamp for filtering
            
        Returns:
            UsageStats with aggregated statistics
        """
        records = self.usage_records.get(user_id, [])
        
        # Filter by time range if specified
        if start_time or end_time:
            records = [
                r for r in records
                if (not start_time or r.timestamp >= start_time) and
                   (not end_time or r.timestamp <= end_time)
            ]
        
        if not records:
            return UsageStats(
                user_id=user_id,
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                total_data_transferred_bytes=0,
                total_data_transferred_mb=0.0,
                average_response_time_ms=0.0,
                operation_counts={},
                endpoint_counts={},
                first_request_time=None,
                last_request_time=None
            )
        
        # Calculate statistics
        total_requests = len(records)
        successful_requests = sum(1 for r in records if 200 <= r.status_code < 300)
        failed_requests = total_requests - successful_requests
        
        total_data_transferred_bytes = sum(
            r.request_size_bytes + r.response_size_bytes
            for r in records
        )
        total_data_transferred_mb = total_data_transferred_bytes / (1024 * 1024)
        
        average_response_time_ms = sum(r.duration_ms for r in records) / total_requests
        
        # Count operations and endpoints
        operation_counts: Dict[str, int] = defaultdict(int)
        endpoint_counts: Dict[str, int] = defaultdict(int)
        
        for record in records:
            operation_counts[record.operation_type] += 1
            endpoint_counts[record.endpoint] += 1
        
        first_request_time = min(r.timestamp for r in records)
        last_request_time = max(r.timestamp for r in records)
        
        return UsageStats(
            user_id=user_id,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            total_data_transferred_bytes=total_data_transferred_bytes,
            total_data_transferred_mb=round(total_data_transferred_mb, 2),
            average_response_time_ms=round(average_response_time_ms, 2),
            operation_counts=dict(operation_counts),
            endpoint_counts=dict(endpoint_counts),
            first_request_time=first_request_time,
            last_request_time=last_request_time
        )
    
    def get_all_users_stats(self) -> List[UsageStats]:
        """
        Get usage statistics for all users.
        
        Returns:
            List of UsageStats for all users
        """
        return [
            self.get_user_stats(user_id)
            for user_id in self.usage_records.keys()
        ]
    
    def get_recent_requests(
        self,
        user_id: str,
        limit: int = 100
    ) -> List[UsageRecord]:
        """
        Get recent requests for a user.
        
        Args:
            user_id: User ID
            limit: Maximum number of records to return
            
        Returns:
            List of recent UsageRecord objects
        """
        records = self.usage_records.get(user_id, [])
        
        # Sort by timestamp descending and limit
        sorted_records = sorted(records, key=lambda r: r.timestamp, reverse=True)
        return sorted_records[:limit]
    
    def clear_user_data(self, user_id: str) -> None:
        """
        Clear usage data for a specific user.
        
        Args:
            user_id: User ID to clear
        """
        if user_id in self.usage_records:
            del self.usage_records[user_id]
            
            if self.storage_path:
                self._save_to_storage()
    
    def clear_all_data(self) -> None:
        """Clear all usage data"""
        self.usage_records.clear()
        
        if self.storage_path:
            self._save_to_storage()
    
    def _save_to_storage(self) -> None:
        """Save usage data to storage file"""
        if not self.storage_path:
            return
        
        # Convert to serializable format
        data = {
            user_id: [asdict(record) for record in records]
            for user_id, records in self.usage_records.items()
        }
        
        # Ensure parent directory exists
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write to file
        with open(self.storage_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _load_from_storage(self) -> None:
        """Load usage data from storage file"""
        if not self.storage_path or not self.storage_path.exists():
            return
        
        try:
            with open(self.storage_path, 'r') as f:
                data = json.load(f)
            
            # Convert back to UsageRecord objects
            for user_id, records_data in data.items():
                self.usage_records[user_id] = [
                    UsageRecord(**record_data)
                    for record_data in records_data
                ]
        except Exception as e:
            # Log error but don't fail initialization
            print(f"Warning: Failed to load usage data: {e}")
    
    def export_stats_json(self, user_id: Optional[str] = None) -> str:
        """
        Export usage statistics as JSON.
        
        Args:
            user_id: Optional user ID to export (if None, exports all users)
            
        Returns:
            JSON string with usage statistics
        """
        if user_id:
            stats = self.get_user_stats(user_id)
            return json.dumps(asdict(stats), indent=2)
        else:
            all_stats = self.get_all_users_stats()
            return json.dumps(
                [asdict(stats) for stats in all_stats],
                indent=2
            )
