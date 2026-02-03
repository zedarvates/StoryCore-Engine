"""
Unit tests for StorageMonitor.

Tests specific edge cases and boundary conditions for storage monitoring.
"""

import pytest
from pathlib import Path
import tempfile

from src.assistant.storage_monitor import StorageMonitor, StorageStats, LimitCheckResult


class TestStorageMonitor:
    """Test suite for StorageMonitor"""
    
    def test_storage_limit_exactly_at_50gb(self):
        """Test behavior when exactly at 50 GB limit"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "test_project"
            project_dir.mkdir(parents=True, exist_ok=True)
            
            # Create monitor with 1GB limit for faster testing
            limit_gb = 1
            monitor = StorageMonitor(project_dir, limit_gb=limit_gb, file_limit=248)
            
            # Create file exactly at limit
            limit_bytes = limit_gb * 1024 * 1024 * 1024
            test_file = project_dir / "at_limit.dat"
            test_file.write_bytes(b'x' * limit_bytes)
            
            # Check limits
            result = monitor.check_limits()
            
            # At exactly the limit, should not allow new files
            assert not result.within_limits
            assert result.stats.total_bytes == limit_bytes
            assert result.stats.usage_percent == 100.0
    
    def test_storage_limit_one_byte_over(self):
        """Test behavior when one byte over 50 GB limit"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "test_project"
            project_dir.mkdir(parents=True, exist_ok=True)
            
            # Create monitor with 1MB limit for faster testing
            limit_bytes = 1024 * 1024  # 1MB
            limit_gb = limit_bytes / (1024**3)
            monitor = StorageMonitor(project_dir, limit_gb=limit_gb, file_limit=248)
            
            # Create file one byte over limit
            test_file = project_dir / "over_limit.dat"
            test_file.write_bytes(b'x' * (limit_bytes + 1))
            
            # Check limits
            result = monitor.check_limits()
            
            # Over the limit, should not allow new files
            assert not result.within_limits
            assert result.stats.total_bytes == limit_bytes + 1
            assert result.stats.usage_percent > 100.0
            
            # Should have error warning
            assert any("limit reached" in w.lower() for w in result.warnings)
    
    def test_file_count_limit_exactly_at_248(self):
        """Test behavior when exactly at 248 file limit"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "test_project"
            project_dir.mkdir(parents=True, exist_ok=True)
            
            # Create monitor with small file limit for faster testing
            file_limit = 10
            monitor = StorageMonitor(project_dir, limit_gb=50, file_limit=file_limit)
            
            # Create exactly file_limit files
            for i in range(file_limit):
                test_file = project_dir / f"file_{i}.dat"
                test_file.write_bytes(b'x' * 100)
            
            # Check limits
            result = monitor.check_limits()
            
            # At exactly the file limit, should not allow new files
            assert not result.within_limits
            assert result.stats.file_count == file_limit
            assert result.stats.file_usage_percent == 100.0
    
    def test_file_count_limit_one_over(self):
        """Test behavior when one file over 248 file limit"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "test_project"
            project_dir.mkdir(parents=True, exist_ok=True)
            
            # Create monitor with small file limit for faster testing
            file_limit = 10
            monitor = StorageMonitor(project_dir, limit_gb=50, file_limit=file_limit)
            
            # Create file_limit + 1 files
            for i in range(file_limit + 1):
                test_file = project_dir / f"file_{i}.dat"
                test_file.write_bytes(b'x' * 100)
            
            # Check limits
            result = monitor.check_limits()
            
            # Over the file limit, should not allow new files
            assert not result.within_limits
            assert result.stats.file_count == file_limit + 1
            assert result.stats.file_usage_percent > 100.0
            
            # Should have error warning
            assert any("limit reached" in w.lower() for w in result.warnings)
    
    def test_warning_threshold_at_90_percent_storage(self):
        """Test warning threshold at 90% of storage limit"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "test_project"
            project_dir.mkdir(parents=True, exist_ok=True)
            
            # Create monitor with 1MB limit for faster testing
            limit_bytes = 1024 * 1024  # 1MB
            limit_gb = limit_bytes / (1024**3)
            monitor = StorageMonitor(project_dir, limit_gb=limit_gb, file_limit=248)
            
            # Create file at 91% of limit to ensure we're over the 90% threshold
            bytes_at_91_percent = int(limit_bytes * 0.91)
            test_file = project_dir / "at_91_percent.dat"
            test_file.write_bytes(b'x' * bytes_at_91_percent)
            
            # Check limits
            result = monitor.check_limits()
            
            # Should still be within limits
            assert result.within_limits
            
            # Should have warning
            assert len(result.warnings) > 0
            assert any("Storage at" in w for w in result.warnings)
            assert result.stats.usage_percent >= 90.0
    
    def test_warning_threshold_at_90_percent_files(self):
        """Test warning threshold at 90% of file count limit"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "test_project"
            project_dir.mkdir(parents=True, exist_ok=True)
            
            # Create monitor with small file limit for faster testing
            file_limit = 10
            monitor = StorageMonitor(project_dir, limit_gb=50, file_limit=file_limit)
            
            # Create 90% of file limit
            files_at_90_percent = int(file_limit * 0.9)
            for i in range(files_at_90_percent):
                test_file = project_dir / f"file_{i}.dat"
                test_file.write_bytes(b'x' * 100)
            
            # Check limits
            result = monitor.check_limits()
            
            # Should still be within limits
            assert result.within_limits
            
            # Should have warning
            assert len(result.warnings) > 0
            assert any("File count at" in w for w in result.warnings)
            assert result.stats.file_usage_percent >= 90.0
    
    def test_estimate_operation_within_limits(self):
        """Test estimate_operation when operation would stay within limits"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "test_project"
            project_dir.mkdir(parents=True, exist_ok=True)
            
            monitor = StorageMonitor(project_dir, limit_gb=50, file_limit=248)
            
            # Create small file
            test_file = project_dir / "small.dat"
            test_file.write_bytes(b'x' * 1000)
            
            # Estimate adding 1MB and 10 files (well within limits)
            would_fit = monitor.estimate_operation(1024 * 1024, 10)
            
            assert would_fit is True
    
    def test_estimate_operation_exceeds_storage_limit(self):
        """Test estimate_operation when operation would exceed storage limit"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "test_project"
            project_dir.mkdir(parents=True, exist_ok=True)
            
            # Create monitor with 1MB limit for faster testing
            limit_bytes = 1024 * 1024  # 1MB
            limit_gb = limit_bytes / (1024**3)
            monitor = StorageMonitor(project_dir, limit_gb=limit_gb, file_limit=248)
            
            # Create file near limit
            test_file = project_dir / "near_limit.dat"
            test_file.write_bytes(b'x' * (limit_bytes - 1000))
            
            # Estimate adding 2000 bytes (would exceed limit)
            would_fit = monitor.estimate_operation(2000, 1)
            
            assert would_fit is False
    
    def test_estimate_operation_exceeds_file_limit(self):
        """Test estimate_operation when operation would exceed file limit"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "test_project"
            project_dir.mkdir(parents=True, exist_ok=True)
            
            # Create monitor with small file limit for faster testing
            file_limit = 10
            monitor = StorageMonitor(project_dir, limit_gb=50, file_limit=file_limit)
            
            # Create files near limit
            for i in range(file_limit - 1):
                test_file = project_dir / f"file_{i}.dat"
                test_file.write_bytes(b'x' * 100)
            
            # Estimate adding 2 files (would exceed limit)
            would_fit = monitor.estimate_operation(1000, 2)
            
            assert would_fit is False
    
    def test_empty_directory(self):
        """Test monitoring an empty directory"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "empty_project"
            project_dir.mkdir(parents=True, exist_ok=True)
            
            monitor = StorageMonitor(project_dir, limit_gb=50, file_limit=248)
            
            stats = monitor.get_current_usage()
            
            assert stats.total_bytes == 0
            assert stats.file_count == 0
            assert stats.usage_percent == 0.0
            assert stats.file_usage_percent == 0.0
            
            result = monitor.check_limits()
            assert result.within_limits is True
            assert len(result.warnings) == 0
    
    def test_nonexistent_directory_creates_it(self):
        """Test that monitoring a nonexistent directory creates it"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "nonexistent" / "nested" / "project"
            
            # Directory doesn't exist yet
            assert not project_dir.exists()
            
            monitor = StorageMonitor(project_dir, limit_gb=50, file_limit=248)
            
            # Getting usage should create the directory
            stats = monitor.get_current_usage()
            
            assert project_dir.exists()
            assert stats.total_bytes == 0
            assert stats.file_count == 0
