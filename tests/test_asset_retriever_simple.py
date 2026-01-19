"""
Simple tests for Asset Retriever functionality.
"""

import pytest
import asyncio
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from src.asset_retriever import AssetRetriever, CleanupPolicy, RetrievalMetrics, AssetDownload
from src.comfyui_config import ComfyUIConfig
from src.comfyui_models import ExecutionResult, AssetInfo, ExecutionStatus


class TestAssetRetrieverSimple:
    """Simple tests for Asset Retriever core functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.config = ComfyUIConfig.default()
        
    def teardown_method(self):
        """Clean up test environment."""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
    
    def test_retriever_initialization(self):
        """Test Asset Retriever initialization."""
        cleanup_policy = CleanupPolicy(max_age_hours=12, max_total_size_mb=500)
        retriever = AssetRetriever(self.config, cleanup_policy)
        
        assert retriever.config == self.config
        assert retriever.cleanup_policy == cleanup_policy
        assert retriever.logger is not None
        assert isinstance(retriever.metrics, RetrievalMetrics)
        
        # Check directories are created
        assert retriever.assets_dir.exists()
        assert retriever.temp_dir.exists()
        assert retriever.cache_dir.exists()
    
    def test_cleanup_policy_defaults(self):
        """Test default cleanup policy values."""
        policy = CleanupPolicy()
        
        assert policy.max_age_hours == 24
        assert policy.max_total_size_mb == 1000
        assert policy.keep_successful_downloads == True
        assert policy.keep_failed_downloads == False
        assert policy.cleanup_on_startup == False
    
    def test_retrieval_metrics(self):
        """Test retrieval metrics calculations."""
        metrics = RetrievalMetrics()
        
        # Test initial state
        assert metrics.success_rate == 0.0
        assert metrics.average_speed_mbps == 0.0
        
        # Test with data
        metrics.total_assets = 10
        metrics.successful_downloads = 8
        metrics.total_bytes = 1024 * 1024 * 5  # 5 MB
        metrics.total_time_seconds = 2.0  # 2 seconds
        
        assert metrics.success_rate == 80.0
        assert metrics.average_speed_mbps == 2.5  # 5MB / 2s = 2.5 MB/s
    
    def test_asset_download_tracking(self):
        """Test asset download tracking structure."""
        download = AssetDownload(
            filename="test.jpg",
            url="http://localhost:8188/view",
            local_path=Path("test.jpg")
        )
        
        assert download.filename == "test.jpg"
        assert download.url == "http://localhost:8188/view"
        assert download.retry_count == 0
        assert download.is_complete == False
        assert download.error_message is None
    
    @pytest.mark.asyncio
    async def test_context_manager(self):
        """Test async context manager functionality."""
        retriever = AssetRetriever(self.config)
        
        async with retriever as r:
            assert r._session is not None
            assert r == retriever
        
        # Session should be closed after context
        assert retriever._session is None
    
    @pytest.mark.asyncio
    async def test_retrieve_execution_assets_empty(self):
        """Test retrieving assets from execution with no images."""
        retriever = AssetRetriever(self.config)
        
        # Create execution result with no images
        execution_result = ExecutionResult(
            prompt_id="test-prompt",
            workflow_id="test-workflow",
            status=ExecutionStatus.COMPLETED,
            started_at=datetime.utcnow()
        )
        execution_result.output_images = []
        
        async with retriever:
            assets = await retriever.retrieve_execution_assets(execution_result)
        
        assert len(assets) == 0
    
    @pytest.mark.asyncio
    async def test_get_download_status(self):
        """Test getting download status."""
        retriever = AssetRetriever(self.config)
        
        # Initially no downloads
        status = await retriever.get_download_status()
        assert len(status) == 0
        
        # Add a mock download
        download = AssetDownload(
            filename="test.jpg",
            url="http://localhost:8188/view",
            local_path=Path("test.jpg")
        )
        
        async with retriever._download_lock:
            retriever._active_downloads["test.jpg"] = download
        
        status = await retriever.get_download_status()
        assert len(status) == 1
        assert "test.jpg" in status
        assert status["test.jpg"] == download
    
    def test_organize_assets_by_date(self):
        """Test organizing assets by date."""
        retriever = AssetRetriever(self.config)
        
        # Create test files in temporary directory
        test_dir = self.temp_dir / "test_assets"
        test_dir.mkdir()
        
        test_file1 = test_dir / "image1.jpg"
        test_file2 = test_dir / "image2.png"
        
        test_file1.write_text("test content 1")
        test_file2.write_text("test content 2")
        
        # Organize by date
        organized = retriever.organize_assets(test_dir, "by_date")
        
        # Should have moved files
        assert len(organized) == 2
        
        # Files should be organized by date
        for original_path, new_path in organized.items():
            assert new_path.exists()
            assert new_path.parent.name.startswith("20")  # Year prefix
    
    def test_organize_assets_by_type(self):
        """Test organizing assets by file type."""
        retriever = AssetRetriever(self.config)
        
        # Create test files in temporary directory
        test_dir = self.temp_dir / "test_assets"
        test_dir.mkdir()
        
        test_file1 = test_dir / "image1.jpg"
        test_file2 = test_dir / "image2.png"
        test_file3 = test_dir / "document.txt"
        
        test_file1.write_text("test content 1")
        test_file2.write_text("test content 2")
        test_file3.write_text("test content 3")
        
        # Organize by type
        organized = retriever.organize_assets(test_dir, "by_type")
        
        # Should have moved files to type directories
        assert len(organized) == 3
        
        # Check type directories were created
        jpg_dir = retriever.assets_dir / "jpg_files"
        png_dir = retriever.assets_dir / "png_files"
        txt_dir = retriever.assets_dir / "txt_files"
        
        assert jpg_dir.exists()
        assert png_dir.exists()
        assert txt_dir.exists()
    
    def test_organize_assets_by_size(self):
        """Test organizing assets by file size."""
        retriever = AssetRetriever(self.config)
        
        # Create test files with different sizes
        test_dir = self.temp_dir / "test_assets"
        test_dir.mkdir()
        
        # Small file (< 1MB)
        small_file = test_dir / "small.txt"
        small_file.write_text("small")
        
        # Medium file (1-10MB) - simulate with larger content
        medium_file = test_dir / "medium.txt"
        medium_file.write_text("x" * (2 * 1024 * 1024))  # 2MB
        
        # Organize by size
        organized = retriever.organize_assets(test_dir, "by_size")
        
        # Should have moved files to size directories
        assert len(organized) >= 1  # At least the small file
        
        # Check size directories
        small_dir = retriever.assets_dir / "small_files"
        medium_dir = retriever.assets_dir / "medium_files"
        
        assert small_dir.exists() or medium_dir.exists()
    
    def test_organize_assets_nonexistent_directory(self):
        """Test organizing assets with non-existent source directory."""
        retriever = AssetRetriever(self.config)
        
        nonexistent_dir = self.temp_dir / "nonexistent"
        organized = retriever.organize_assets(nonexistent_dir, "by_date")
        
        assert len(organized) == 0
    
    @pytest.mark.asyncio
    async def test_verify_asset_integrity_no_file(self):
        """Test asset integrity verification with missing file."""
        retriever = AssetRetriever(self.config)
        
        asset_info = AssetInfo(
            filename="missing.jpg",
            local_path=Path("nonexistent.jpg"),
            checksum="abc123"
        )
        
        is_valid = await retriever.verify_asset_integrity(asset_info)
        assert is_valid == False
    
    @pytest.mark.asyncio
    async def test_verify_asset_integrity_no_checksum(self):
        """Test asset integrity verification without checksum."""
        retriever = AssetRetriever(self.config)
        
        # Create test file
        test_file = self.temp_dir / "test.jpg"
        test_file.write_text("test content")
        
        asset_info = AssetInfo(
            filename="test.jpg",
            local_path=test_file,
            checksum=None
        )
        
        is_valid = await retriever.verify_asset_integrity(asset_info)
        assert is_valid == True  # Should assume valid without checksum
    
    @pytest.mark.asyncio
    async def test_verify_asset_integrity_valid(self):
        """Test asset integrity verification with valid checksum."""
        retriever = AssetRetriever(self.config)
        
        # Create test file
        test_content = "test content"
        test_file = self.temp_dir / "test.jpg"
        test_file.write_text(test_content)
        
        # Calculate expected checksum
        import hashlib
        expected_checksum = hashlib.sha256(test_content.encode()).hexdigest()
        
        asset_info = AssetInfo(
            filename="test.jpg",
            local_path=test_file,
            checksum=expected_checksum
        )
        
        is_valid = await retriever.verify_asset_integrity(asset_info)
        assert is_valid == True
    
    @pytest.mark.asyncio
    async def test_verify_asset_integrity_invalid(self):
        """Test asset integrity verification with invalid checksum."""
        retriever = AssetRetriever(self.config)
        
        # Create test file
        test_file = self.temp_dir / "test.jpg"
        test_file.write_text("test content")
        
        asset_info = AssetInfo(
            filename="test.jpg",
            local_path=test_file,
            checksum="invalid_checksum"
        )
        
        is_valid = await retriever.verify_asset_integrity(asset_info)
        assert is_valid == False
    
    def test_get_storage_stats(self):
        """Test getting storage statistics."""
        retriever = AssetRetriever(self.config)
        
        # Create some test files
        test_file1 = retriever.assets_dir / "test1.jpg"
        test_file2 = retriever.temp_dir / "test2.jpg"
        
        test_file1.write_text("test content 1")
        test_file2.write_text("test content 2")
        
        stats = retriever.get_storage_stats()
        
        assert "assets_directory" in stats
        assert "temp_directory" in stats
        assert "cache_directory" in stats
        assert "total_assets" in stats
        assert "total_size_bytes" in stats
        assert "directories" in stats
        
        # Should have found our test files
        assert stats["total_assets"] >= 2
        assert stats["total_size_bytes"] > 0
    
    def test_metrics_operations(self):
        """Test metrics operations."""
        retriever = AssetRetriever(self.config)
        
        # Initial metrics
        initial_metrics = retriever.get_metrics()
        assert initial_metrics.total_assets == 0
        
        # Modify metrics
        retriever.metrics.total_assets = 5
        retriever.metrics.successful_downloads = 4
        
        updated_metrics = retriever.get_metrics()
        assert updated_metrics.total_assets == 5
        assert updated_metrics.successful_downloads == 4
        
        # Reset metrics
        retriever.reset_metrics()
        reset_metrics = retriever.get_metrics()
        assert reset_metrics.total_assets == 0
        assert reset_metrics.successful_downloads == 0
    
    def test_directory_creation(self):
        """Test that required directories are created."""
        # Use a custom config with different paths
        config = ComfyUIConfig.default()
        retriever = AssetRetriever(config)
        
        # Directories should exist after initialization
        assert retriever.assets_dir.exists()
        assert retriever.temp_dir.exists()
        assert retriever.cache_dir.exists()
        
        # Should be able to create files in directories
        test_file = retriever.assets_dir / "test.txt"
        test_file.write_text("test")
        assert test_file.exists()
    
    @pytest.mark.asyncio
    async def test_cleanup_old_files(self):
        """Test cleanup of old files."""
        retriever = AssetRetriever(self.config)
        
        # Create some test files in temp directory
        old_file = retriever.temp_dir / "old_file.txt"
        old_file.write_text("old content")
        
        # Manually trigger cleanup
        await retriever._cleanup_old_files()
        
        # Should complete without errors (files may or may not be deleted based on age)
        assert True  # Test passes if no exceptions are raised