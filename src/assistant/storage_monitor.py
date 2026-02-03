"""
Storage monitoring and limit enforcement for StoryCore AI Assistant.

This module provides the StorageMonitor class which tracks storage usage
and enforces limits on the project directory.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import List
import logging

logger = logging.getLogger(__name__)


@dataclass
class StorageStats:
    """Storage usage statistics."""
    total_bytes: int
    total_gb: float
    file_count: int
    limit_bytes: int
    limit_gb: float
    file_limit: int
    usage_percent: float
    file_usage_percent: float


@dataclass
class LimitCheckResult:
    """Result of storage limit check."""
    within_limits: bool
    warnings: List[str]
    stats: StorageStats


class StorageMonitor:
    """Monitor storage usage and enforce limits."""
    
    def __init__(self, project_directory: Path, limit_gb: int, file_limit: int):
        """
        Initialize storage monitor.
        
        Args:
            project_directory: Path to the project directory to monitor
            limit_gb: Maximum storage limit in gigabytes
            file_limit: Maximum number of files allowed
        """
        self.project_directory = project_directory.resolve()
        self.limit_bytes = limit_gb * 1024 * 1024 * 1024
        self.limit_gb = limit_gb
        self.file_limit = file_limit
        self.warning_threshold = 0.9
        
        logger.info(
            f"StorageMonitor initialized: directory={self.project_directory}, "
            f"limit={self.limit_gb}GB, file_limit={self.file_limit}"
        )
    
    def get_current_usage(self) -> StorageStats:
        """
        Get current storage statistics.
        
        Returns:
            StorageStats with current usage information
        """
        total_size = 0
        file_count = 0
        
        # Ensure directory exists
        if not self.project_directory.exists():
            self.project_directory.mkdir(parents=True, exist_ok=True)
        
        # Calculate total size and file count
        for path in self.project_directory.rglob("*"):
            if path.is_file():
                try:
                    total_size += path.stat().st_size
                    file_count += 1
                except (OSError, PermissionError) as e:
                    logger.warning(f"Could not stat file {path}: {e}")
                    continue
        
        # Calculate percentages
        usage_percent = (total_size / self.limit_bytes * 100) if self.limit_bytes > 0 else 0
        file_usage_percent = (file_count / self.file_limit * 100) if self.file_limit > 0 else 0
        
        stats = StorageStats(
            total_bytes=total_size,
            total_gb=total_size / (1024**3),
            file_count=file_count,
            limit_bytes=self.limit_bytes,
            limit_gb=self.limit_gb,
            file_limit=self.file_limit,
            usage_percent=usage_percent,
            file_usage_percent=file_usage_percent
        )
        
        logger.debug(
            f"Storage usage: {stats.total_gb:.2f}GB ({stats.usage_percent:.1f}%), "
            f"{stats.file_count} files ({stats.file_usage_percent:.1f}%)"
        )
        
        return stats
    
    def check_limits(self) -> LimitCheckResult:
        """
        Check if within limits and return warnings.
        
        Returns:
            LimitCheckResult with status and warnings
        """
        stats = self.get_current_usage()
        warnings = []
        
        # Check storage size warning threshold (90%)
        if stats.usage_percent >= self.warning_threshold * 100:
            warnings.append(
                f"Storage at {stats.usage_percent:.1f}% of limit "
                f"({stats.total_gb:.2f}GB / {stats.limit_gb}GB)"
            )
            logger.warning(warnings[-1])
        
        # Check file count warning threshold (90%)
        if stats.file_usage_percent >= self.warning_threshold * 100:
            warnings.append(
                f"File count at {stats.file_usage_percent:.1f}% of limit "
                f"({stats.file_count} / {stats.file_limit} files)"
            )
            logger.warning(warnings[-1])
        
        # Check if at or over limits
        can_create = (stats.total_bytes < self.limit_bytes and 
                     stats.file_count < self.file_limit)
        
        if not can_create:
            if stats.total_bytes >= self.limit_bytes:
                warnings.append(
                    f"Storage limit reached: {stats.total_gb:.2f}GB / {stats.limit_gb}GB"
                )
                logger.error(warnings[-1])
            
            if stats.file_count >= self.file_limit:
                warnings.append(
                    f"File count limit reached: {stats.file_count} / {stats.file_limit} files"
                )
                logger.error(warnings[-1])
        
        return LimitCheckResult(
            within_limits=can_create,
            warnings=warnings,
            stats=stats
        )
    
    def estimate_operation(self, estimated_bytes: int, estimated_files: int) -> bool:
        """
        Check if an operation would exceed limits.
        
        Args:
            estimated_bytes: Estimated bytes to be added
            estimated_files: Estimated number of files to be added
            
        Returns:
            True if operation would stay within limits, False otherwise
        """
        stats = self.get_current_usage()
        new_size = stats.total_bytes + estimated_bytes
        new_count = stats.file_count + estimated_files
        
        would_exceed_size = new_size > self.limit_bytes
        would_exceed_count = new_count > self.file_limit
        
        if would_exceed_size:
            logger.warning(
                f"Operation would exceed storage limit: "
                f"{new_size / (1024**3):.2f}GB > {self.limit_gb}GB"
            )
        
        if would_exceed_count:
            logger.warning(
                f"Operation would exceed file count limit: "
                f"{new_count} > {self.file_limit}"
            )
        
        return not (would_exceed_size or would_exceed_count)
