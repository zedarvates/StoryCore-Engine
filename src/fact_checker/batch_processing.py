"""
Batch processing module for the fact-checking system.

This module provides batch processing capabilities with parallel execution,
configurable concurrency limits, and progress tracking.

Requirements: 9.3, 9.4
"""

import time
import logging
from typing import List, Dict, Any, Optional, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from enum import Enum

logger = logging.getLogger(__name__)


class BatchItemStatus(str, Enum):
    """Status of a batch item."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class BatchItem:
    """
    Represents a single item in a batch processing job.
    
    Attributes:
        id: Unique identifier for the item
        content: Content to process
        status: Current processing status
        result: Processing result (None until completed)
        error: Error message if processing failed
        start_time: When processing started
        end_time: When processing completed
    """
    id: str
    content: str
    status: BatchItemStatus = BatchItemStatus.PENDING
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    
    def get_processing_time(self) -> Optional[float]:
        """Get processing time in seconds."""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None


@dataclass
class BatchProgress:
    """
    Tracks progress of a batch processing job.
    
    Attributes:
        total: Total number of items
        pending: Number of pending items
        processing: Number of items currently processing
        completed: Number of completed items
        failed: Number of failed items
        start_time: When batch processing started
        end_time: When batch processing completed
    """
    total: int
    pending: int = 0
    processing: int = 0
    completed: int = 0
    failed: int = 0
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    
    def __post_init__(self):
        """Initialize pending count to total."""
        self.pending = self.total
    
    def get_completion_percentage(self) -> float:
        """Get completion percentage (0-100)."""
        if self.total == 0:
            return 100.0
        return ((self.completed + self.failed) / self.total) * 100
    
    def get_elapsed_time(self) -> Optional[float]:
        """Get elapsed time in seconds."""
        if self.start_time:
            end = self.end_time or time.time()
            return end - self.start_time
        return None
    
    def get_estimated_time_remaining(self) -> Optional[float]:
        """Estimate remaining time in seconds based on current progress."""
        if self.completed == 0 or not self.start_time:
            return None
        
        elapsed = self.get_elapsed_time()
        if not elapsed:
            return None
        
        avg_time_per_item = elapsed / self.completed
        remaining_items = self.pending + self.processing
        return avg_time_per_item * remaining_items
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "total": self.total,
            "pending": self.pending,
            "processing": self.processing,
            "completed": self.completed,
            "failed": self.failed,
            "completion_percentage": self.get_completion_percentage(),
            "elapsed_time": self.get_elapsed_time(),
            "estimated_time_remaining": self.get_estimated_time_remaining()
        }


@dataclass
class BatchResult:
    """
    Result of a batch processing job.
    
    Attributes:
        items: List of all batch items with their results
        progress: Final progress statistics
        successful_items: List of successfully processed items
        failed_items: List of failed items
    """
    items: List[BatchItem]
    progress: BatchProgress
    successful_items: List[BatchItem] = field(default_factory=list)
    failed_items: List[BatchItem] = field(default_factory=list)
    
    def __post_init__(self):
        """Separate successful and failed items."""
        self.successful_items = [
            item for item in self.items
            if item.status == BatchItemStatus.COMPLETED
        ]
        self.failed_items = [
            item for item in self.items
            if item.status == BatchItemStatus.FAILED
        ]
    
    def get_success_rate(self) -> float:
        """Get success rate as percentage (0-100)."""
        if not self.items:
            return 0.0
        return (len(self.successful_items) / len(self.items)) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "total_items": len(self.items),
            "successful": len(self.successful_items),
            "failed": len(self.failed_items),
            "success_rate": self.get_success_rate(),
            "progress": self.progress.to_dict(),
            "items": [
                {
                    "id": item.id,
                    "status": item.status,
                    "processing_time": item.get_processing_time(),
                    "error": item.error
                }
                for item in self.items
            ]
        }


class BatchProcessor:
    """
    Batch processor for fact-checking operations.
    
    This class handles parallel processing of multiple documents with
    configurable concurrency limits and progress tracking.
    """
    
    def __init__(
        self,
        max_workers: int = 5,
        progress_callback: Optional[Callable[[BatchProgress], None]] = None
    ):
        """
        Initialize the batch processor.
        
        Args:
            max_workers: Maximum number of concurrent workers (default: 5)
            progress_callback: Optional callback function for progress updates
        """
        self.max_workers = max_workers
        self.progress_callback = progress_callback
        logger.info(f"Batch processor initialized with {max_workers} workers")
    
    def process_batch(
        self,
        items: List[Dict[str, str]],
        process_func: Callable[[str], Dict[str, Any]]
    ) -> BatchResult:
        """
        Process a batch of items in parallel.
        
        Args:
            items: List of items to process. Each item should be a dict with
                  'id' and 'content' keys.
            process_func: Function to process each item. Should accept content
                         string and return result dictionary.
        
        Returns:
            BatchResult with all items and their results
            
        Example:
            >>> processor = BatchProcessor(max_workers=3)
            >>> items = [
            ...     {"id": "1", "content": "First document"},
            ...     {"id": "2", "content": "Second document"}
            ... ]
            >>> result = processor.process_batch(items, my_process_func)
            >>> print(f"Success rate: {result.get_success_rate()}%")
        """
        # Create batch items
        batch_items = [
            BatchItem(id=item["id"], content=item["content"])
            for item in items
        ]
        
        # Initialize progress tracking
        progress = BatchProgress(total=len(batch_items))
        progress.start_time = time.time()
        
        logger.info(f"Starting batch processing of {len(batch_items)} items")
        
        # Process items in parallel
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_item = {
                executor.submit(self._process_item, item, process_func): item
                for item in batch_items
            }
            
            # Process completed tasks
            for future in as_completed(future_to_item):
                item = future_to_item[future]
                
                try:
                    # Get result from future
                    result = future.result()
                    
                    # Update item with result
                    item.result = result
                    item.status = BatchItemStatus.COMPLETED
                    
                    # Update progress
                    progress.pending -= 1
                    progress.completed += 1
                    
                    logger.debug(f"Item {item.id} completed successfully")
                    
                except Exception as e:
                    # Handle processing error
                    item.error = str(e)
                    item.status = BatchItemStatus.FAILED
                    
                    # Update progress
                    progress.pending -= 1
                    progress.failed += 1
                    
                    logger.error(f"Item {item.id} failed: {e}")
                
                # Call progress callback if provided
                if self.progress_callback:
                    try:
                        self.progress_callback(progress)
                    except Exception as e:
                        logger.warning(f"Progress callback failed: {e}")
        
        # Finalize progress
        progress.end_time = time.time()
        
        logger.info(
            f"Batch processing completed: {progress.completed} successful, "
            f"{progress.failed} failed, {progress.get_elapsed_time():.2f}s elapsed"
        )
        
        # Create and return result
        return BatchResult(items=batch_items, progress=progress)
    
    def _process_item(
        self,
        item: BatchItem,
        process_func: Callable[[str], Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Process a single batch item.
        
        Args:
            item: Batch item to process
            process_func: Processing function
            
        Returns:
            Processing result
        """
        item.status = BatchItemStatus.PROCESSING
        item.start_time = time.time()
        
        try:
            # Execute processing function
            result = process_func(item.content)
            item.end_time = time.time()
            return result
            
        except Exception as e:
            item.end_time = time.time()
            raise
    
    def process_files(
        self,
        file_paths: List[Path],
        process_func: Callable[[str], Dict[str, Any]]
    ) -> BatchResult:
        """
        Process a batch of files in parallel.
        
        Args:
            file_paths: List of file paths to process
            process_func: Function to process each file's content
            
        Returns:
            BatchResult with all files and their results
        """
        # Load file contents
        items = []
        for path in file_paths:
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                items.append({
                    "id": str(path),
                    "content": content
                })
            except Exception as e:
                logger.error(f"Failed to load file {path}: {e}")
                # Add as failed item
                items.append({
                    "id": str(path),
                    "content": ""  # Empty content will cause processing to fail
                })
        
        return self.process_batch(items, process_func)


def create_batch_processor(
    max_workers: int = 5,
    progress_callback: Optional[Callable[[BatchProgress], None]] = None
) -> BatchProcessor:
    """
    Factory function to create a batch processor.
    
    Args:
        max_workers: Maximum number of concurrent workers
        progress_callback: Optional callback for progress updates
        
    Returns:
        Configured BatchProcessor instance
    """
    return BatchProcessor(max_workers, progress_callback)
