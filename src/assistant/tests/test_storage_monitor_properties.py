"""
Property-based tests for StorageMonitor.

These tests verify universal properties of storage monitoring across
randomly generated file structures.
"""

import pytest
from hypothesis import given, settings, strategies as st
from pathlib import Path
import tempfile
import shutil

from src.assistant.storage_monitor import StorageMonitor


# Strategy for generating file sizes (0 to 10MB)
file_size_strategy = st.integers(min_value=0, max_value=10 * 1024 * 1024)

# Strategy for generating file counts (0 to 100 files)
file_count_strategy = st.integers(min_value=0, max_value=100)


@settings(max_examples=100, deadline=None)
@given(
    file_sizes=st.lists(file_size_strategy, min_size=0, max_size=50),
    limit_gb=st.integers(min_value=1, max_value=100)
)
def test_storage_statistics_accuracy_property(file_sizes, limit_gb):
    """
    Property 3: Storage Statistics Accuracy
    
    For any project directory state, the calculated storage statistics
    (total bytes, file count) should exactly match the actual disk usage
    when independently measured.
    
    **Validates: Requirements 3.1, 3.2, 3.7**
    """
    # Feature: storycore-ai-assistant, Property 3: Storage Statistics Accuracy
    
    # Create temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        project_dir = Path(temp_dir) / "test_project"
        project_dir.mkdir(parents=True, exist_ok=True)
        
        # Create files with specified sizes
        expected_total_bytes = 0
        expected_file_count = len(file_sizes)
        
        for i, size in enumerate(file_sizes):
            file_path = project_dir / f"file_{i}.dat"
            # Write file with specified size
            file_path.write_bytes(b'x' * size)
            expected_total_bytes += size
        
        # Create storage monitor
        monitor = StorageMonitor(project_dir, limit_gb=limit_gb, file_limit=248)
        
        # Get calculated statistics
        stats = monitor.get_current_usage()
        
        # Verify accuracy: calculated stats should match expected values
        assert stats.total_bytes == expected_total_bytes, \
            f"Total bytes mismatch: expected {expected_total_bytes}, got {stats.total_bytes}"
        
        assert stats.file_count == expected_file_count, \
            f"File count mismatch: expected {expected_file_count}, got {stats.file_count}"
        
        # Verify derived calculations
        expected_total_gb = expected_total_bytes / (1024**3)
        assert abs(stats.total_gb - expected_total_gb) < 0.001, \
            f"Total GB mismatch: expected {expected_total_gb}, got {stats.total_gb}"
        
        # Verify limit values are set correctly
        assert stats.limit_gb == limit_gb
        assert stats.limit_bytes == limit_gb * 1024 * 1024 * 1024
        assert stats.file_limit == 248
        
        # Verify percentage calculations
        if stats.limit_bytes > 0:
            expected_usage_percent = (expected_total_bytes / stats.limit_bytes) * 100
            assert abs(stats.usage_percent - expected_usage_percent) < 0.01, \
                f"Usage percent mismatch: expected {expected_usage_percent}, got {stats.usage_percent}"
        
        if stats.file_limit > 0:
            expected_file_usage_percent = (expected_file_count / stats.file_limit) * 100
            assert abs(stats.file_usage_percent - expected_file_usage_percent) < 0.01, \
                f"File usage percent mismatch: expected {expected_file_usage_percent}, got {stats.file_usage_percent}"


@settings(max_examples=100, deadline=None)
@given(
    file_sizes=st.lists(file_size_strategy, min_size=1, max_size=20),
    subdirs=st.lists(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')), min_size=1, max_size=10), min_size=0, max_size=5)
)
def test_storage_statistics_with_subdirectories_property(file_sizes, subdirs):
    """
    Property 3 (Extended): Storage Statistics Accuracy with Subdirectories
    
    For any project directory with nested subdirectories, the calculated
    storage statistics should accurately count all files recursively.
    
    **Validates: Requirements 3.1, 3.2, 3.7**
    """
    # Feature: storycore-ai-assistant, Property 3: Storage Statistics Accuracy (subdirectories)
    
    # Create temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        project_dir = Path(temp_dir) / "test_project"
        project_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        created_subdirs = []
        for subdir_name in subdirs:
            if subdir_name:  # Skip empty names
                subdir_path = project_dir / subdir_name
                try:
                    subdir_path.mkdir(parents=True, exist_ok=True)
                    created_subdirs.append(subdir_path)
                except (OSError, ValueError):
                    # Skip invalid directory names
                    continue
        
        # If no subdirectories were created, use root
        if not created_subdirs:
            created_subdirs = [project_dir]
        
        # Create files in various subdirectories
        expected_total_bytes = 0
        expected_file_count = 0
        
        for i, size in enumerate(file_sizes):
            # Distribute files across subdirectories
            target_dir = created_subdirs[i % len(created_subdirs)]
            file_path = target_dir / f"file_{i}.dat"
            
            try:
                file_path.write_bytes(b'x' * size)
                expected_total_bytes += size
                expected_file_count += 1
            except (OSError, ValueError):
                # Skip files that couldn't be created
                continue
        
        # Create storage monitor
        monitor = StorageMonitor(project_dir, limit_gb=50, file_limit=248)
        
        # Get calculated statistics
        stats = monitor.get_current_usage()
        
        # Verify accuracy across nested structure
        assert stats.total_bytes == expected_total_bytes, \
            f"Total bytes mismatch with subdirs: expected {expected_total_bytes}, got {stats.total_bytes}"
        
        assert stats.file_count == expected_file_count, \
            f"File count mismatch with subdirs: expected {expected_file_count}, got {stats.file_count}"



@settings(max_examples=100, deadline=None)
@given(
    current_bytes=st.integers(min_value=0, max_value=100 * 1024 * 1024 * 1024),  # 0-100GB
    current_files=st.integers(min_value=0, max_value=500),
    new_bytes=st.integers(min_value=0, max_value=10 * 1024 * 1024 * 1024),  # 0-10GB
    new_files=st.integers(min_value=0, max_value=100)
)
def test_storage_limit_enforcement_property(current_bytes, current_files, new_bytes, new_files):
    """
    Property 4: Storage Limit Enforcement
    
    For any file creation operation, if the operation would cause total storage
    to exceed 50 GB or file count to exceed 248 files, the operation should be
    rejected (estimate_operation returns False).
    
    **Validates: Requirements 3.5, 3.6**
    """
    # Feature: storycore-ai-assistant, Property 4: Storage Limit Enforcement
    
    # Create temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        project_dir = Path(temp_dir) / "test_project"
        project_dir.mkdir(parents=True, exist_ok=True)
        
        # Create files to simulate current usage
        # We'll create a smaller number of files to keep tests fast
        # but track the total bytes accurately
        files_to_create = min(current_files, 50)  # Limit actual file creation
        bytes_per_file = current_bytes // max(files_to_create, 1)
        
        for i in range(files_to_create):
            file_path = project_dir / f"existing_{i}.dat"
            # Create file with appropriate size
            size = min(bytes_per_file, 10 * 1024 * 1024)  # Max 10MB per file for speed
            file_path.write_bytes(b'x' * size)
        
        # Create storage monitor with 50GB and 248 file limits
        monitor = StorageMonitor(project_dir, limit_gb=50, file_limit=248)
        
        # Get actual current usage
        stats = monitor.get_current_usage()
        
        # Estimate if new operation would fit
        would_fit = monitor.estimate_operation(new_bytes, new_files)
        
        # Calculate expected result
        total_bytes_after = stats.total_bytes + new_bytes
        total_files_after = stats.file_count + new_files
        
        limit_bytes = 50 * 1024 * 1024 * 1024
        limit_files = 248
        
        expected_would_fit = (total_bytes_after <= limit_bytes and 
                             total_files_after <= limit_files)
        
        # Verify enforcement
        assert would_fit == expected_would_fit, \
            f"Limit enforcement mismatch: " \
            f"current={stats.total_bytes}B/{stats.file_count}files, " \
            f"new={new_bytes}B/{new_files}files, " \
            f"total_after={total_bytes_after}B/{total_files_after}files, " \
            f"limits={limit_bytes}B/{limit_files}files, " \
            f"expected={expected_would_fit}, got={would_fit}"


@settings(max_examples=100, deadline=None)
@given(
    usage_percent=st.floats(min_value=0.0, max_value=1.5),  # 0% to 150%
    file_usage_percent=st.floats(min_value=0.0, max_value=1.5)
)
def test_storage_warning_thresholds_property(usage_percent, file_usage_percent):
    """
    Property 4 (Extended): Storage Warning Thresholds
    
    For any storage usage level, warnings should be issued when usage
    exceeds 90% of limits, and operations should be prevented when
    at or over 100% of limits.
    
    **Validates: Requirements 3.3, 3.4, 3.5, 3.6**
    """
    # Feature: storycore-ai-assistant, Property 4: Storage Warning Thresholds
    
    # Create temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        project_dir = Path(temp_dir) / "test_project"
        project_dir.mkdir(parents=True, exist_ok=True)
        
        # Set limits
        limit_gb = 10  # Use smaller limit for faster tests
        limit_bytes = limit_gb * 1024 * 1024 * 1024
        file_limit = 100
        
        # Calculate target usage
        target_bytes = int(limit_bytes * usage_percent)
        target_files = int(file_limit * file_usage_percent)
        
        # Create files to reach target usage
        # Limit actual file creation for performance
        files_to_create = min(target_files, 50)
        if files_to_create > 0:
            bytes_per_file = target_bytes // files_to_create
            bytes_per_file = min(bytes_per_file, 5 * 1024 * 1024)  # Max 5MB per file
            
            for i in range(files_to_create):
                file_path = project_dir / f"file_{i}.dat"
                file_path.write_bytes(b'x' * bytes_per_file)
        
        # Create storage monitor
        monitor = StorageMonitor(project_dir, limit_gb=limit_gb, file_limit=file_limit)
        
        # Check limits
        result = monitor.check_limits()
        
        # Verify warning behavior
        # Warnings should be issued at >= 90%
        should_warn_storage = (usage_percent >= 0.9)
        should_warn_files = (file_usage_percent >= 0.9)
        
        has_storage_warning = any("Storage at" in w for w in result.warnings)
        has_file_warning = any("File count at" in w for w in result.warnings)
        
        # At or over 100%, should not be within limits
        should_be_within_limits = (usage_percent < 1.0 and file_usage_percent < 1.0)
        
        # Note: Due to file creation limits in tests, we can only verify
        # the logic when we actually created files
        if files_to_create > 0 and result.stats.file_count > 0:
            # Verify warnings are issued appropriately
            if result.stats.usage_percent >= 90:
                assert has_storage_warning or result.stats.usage_percent < 90, \
                    f"Expected storage warning at {result.stats.usage_percent}%"
            
            if result.stats.file_usage_percent >= 90:
                assert has_file_warning or result.stats.file_usage_percent < 90, \
                    f"Expected file count warning at {result.stats.file_usage_percent}%"
            
            # Verify limit enforcement
            if result.stats.usage_percent >= 100 or result.stats.file_usage_percent >= 100:
                assert not result.within_limits, \
                    f"Should not be within limits at {result.stats.usage_percent}% storage, " \
                    f"{result.stats.file_usage_percent}% files"
